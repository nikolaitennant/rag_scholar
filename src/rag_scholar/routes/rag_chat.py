"""RAG Scholar chat endpoints using LangChain."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rag_scholar.services.langchain_pipeline import LangChainRAGPipeline
from rag_scholar.services.langchain_ingestion import LangChainIngestionPipeline
from rag_scholar.services.user_profile import UserProfileService
from rag_scholar.config.settings import get_settings

from .auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    """RAG Scholar chat request."""
    query: str
    session_id: str | None = None
    class_id: str | None = None
    class_name: str | None = None  # Human-readable class name for session metadata
    domain_type: str | None = None  # The actual domain type (law, science, etc.)
    k: int = 5
    api_key: str | None = None  # User's API key from frontend
    model: str | None = None  # User's preferred model
    temperature: float | None = None  # User's temperature setting (0.0-2.0)
    max_tokens: int | None = None  # User's max tokens setting


class ChatResponse(BaseModel):
    """RAG Scholar chat response."""
    response: str
    session_id: str
    sources: list[str]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> ChatResponse:
    """Full RAG Scholar chat with document retrieval, citations, and background mode support."""

    # Initialize services with user's API key if provided
    settings = get_settings()

    # Use user's API key if provided, otherwise fall back to environment
    user_api_key = request.api_key or settings.openai_api_key
    if not user_api_key:
        raise HTTPException(
            status_code=400,
            detail="API key required. Please configure your API key in settings."
        )

    # Create custom settings with user's preferences (override Doppler defaults)
    user_settings = settings.model_copy()
    user_settings.openai_api_key = user_api_key

    # User settings OVERRIDE system defaults
    if request.model:
        user_settings.chat_model = request.model
        user_settings.llm_model = request.model

    # Temperature and max_tokens come from user's frontend settings
    if hasattr(request, 'temperature') and request.temperature is not None:
        user_settings.chat_temperature = request.temperature
    if hasattr(request, 'max_tokens') and request.max_tokens is not None:
        user_settings.max_tokens = request.max_tokens

    rag_pipeline = LangChainRAGPipeline(user_settings)
    ingestion_pipeline = LangChainIngestionPipeline(user_settings)

    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())

    # Retrieve relevant documents using LangChain ingestion pipeline
    context_docs = []
    if request.query:
        search_results = await ingestion_pipeline.search_documents(
            query=request.query,
            user_id=current_user["id"],
            class_id=request.class_id,
            k=request.k,
        )
        # Convert to format expected by RAG pipeline
        context_docs = [
            {
                "content": result["content"],
                "source": result["source"],
                "metadata": result.get("metadata", {})
            }
            for result in search_results
        ]

    # Chat with RAG pipeline
    result = await rag_pipeline.chat_with_history(
        question=request.query,
        context_docs=context_docs,
        session_id=session_id,
        user_id=current_user["id"],
        class_id=request.class_id,
        class_name=request.class_name,
        domain_type=request.domain_type,
    )

    # Track citations if sources were returned
    sources_count = len(result.get("sources", []))

    # Update user achievements for chat
    try:
        user_service = UserProfileService(settings)
        await user_service.update_user_stats(current_user["id"], "total_chats", 1)

        # Track daily activity for streak
        await user_service.track_daily_activity(current_user["id"])

        # Track domain exploration if domain_type is provided
        if request.domain_type:
            await user_service.track_domain_exploration(current_user["id"], request.domain_type)

        # Track citations if sources were returned
        if sources_count > 0:
            await user_service.update_user_stats(current_user["id"], "citations_received", sources_count)
    except Exception as e:
        # Don't fail the chat if achievement tracking fails
        pass

    return ChatResponse(**result)


