"""RAG Scholar chat endpoints using LangChain."""

import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rag_scholar.services.langchain_pipeline import LangChainRAGPipeline
from rag_scholar.services.langchain_ingestion import LangChainIngestionPipeline
from rag_scholar.services.langchain_citations import extract_citations_from_response, is_meaningful_query, is_conversational_query
from rag_scholar.services.langchain_tools import generate_conversational_response
from rag_scholar.services.user_profile import UserProfileService
from rag_scholar.config.settings import get_settings

from .auth import get_current_user

logger = structlog.get_logger()
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
    chat_name: str | None = None


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> ChatResponse:
    """Full RAG Scholar chat with document retrieval, citations, and background mode support."""

    logger.info("Processing chat request",
               user_id=current_user["id"],
               session_id=request.session_id,
               class_id=request.class_id,
               query_length=len(request.query))

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

    # Handle conversational queries (greetings, simple interactions) without citations
    if is_conversational_query(request.query):
        conversational_response = generate_conversational_response(request.query)
        session_id = request.session_id or str(uuid.uuid4())

        # Store session metadata for conversational interactions
        try:
            generated_name = await rag_pipeline._store_session_metadata(
                user_id=current_user["id"],
                session_id=session_id,
                class_id=request.class_id,
                question=request.query,
                response=conversational_response,
                class_name=request.class_name,
                domain_type=request.domain_type
            )
        except Exception:
            generated_name = request.query[:40] + "..." if len(request.query) > 40 else request.query

        return {
            "response": conversational_response,
            "sources": [],
            "citations": [],
            "grouped_sources": [],
            "session_id": session_id,
            "chat_name": generated_name
        }

    # Validate query meaningfulness for research queries
    if not is_meaningful_query(request.query):
        return {
            "response": "I didn't understand your question. Could you rephrase?",
            "sources": [],
            "citations": [],
            "grouped_sources": [],
            "session_id": request.session_id or str(uuid.uuid4()),
        }

    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())

    # Retrieve relevant documents using LangChain ingestion pipeline
    context_docs = []
    if request.query:
        logger.info("Searching for relevant documents",
                   user_id=current_user["id"],
                   class_id=request.class_id,
                   k=request.k)

        search_results = await ingestion_pipeline.search_documents(
            query=request.query,
            user_id=current_user["id"],
            class_id=request.class_id,
            k=request.k,
        )
        # Preserve all search result data including score and metadata fields
        context_docs = search_results

        logger.info("Document search completed",
                   user_id=current_user["id"],
                   documents_found=len(context_docs))

    # Chat with RAG pipeline
    logger.info("Generating chat response",
               user_id=current_user["id"],
               session_id=session_id)

    result = await rag_pipeline.chat_with_history(
        question=request.query,
        context_docs=context_docs,
        session_id=session_id,
        user_id=current_user["id"],
        class_id=request.class_id,
        class_name=request.class_name,
        domain_type=request.domain_type,
    )

    # Enhanced citation processing - use context_docs from pipeline result if available
    pipeline_context_docs = result.get("context_docs", context_docs)
    if result.get("response") and pipeline_context_docs:
        enhanced_result = extract_citations_from_response(
            text=result["response"],
            context_docs=pipeline_context_docs
        )
        # Merge enhanced citations with original result
        result.update({
            "citations": enhanced_result["citations"],
            "grouped_sources": enhanced_result["grouped_sources"],
            "sources": enhanced_result["sources"]
        })

    # Track citations if sources were returned
    sources_count = len(result.get("sources", []))

    logger.info("Chat response generated",
               user_id=current_user["id"],
               session_id=session_id,
               sources_count=sources_count,
               response_length=len(result.get("response", "")))

    # Update user achievements for chat
    try:
        user_service = UserProfileService(settings)
        await user_service.update_user_stats(current_user["id"], "total_chats", 1)

        # Track daily activity for streak
        await user_service.track_daily_activity(current_user["id"])

        # Track time-based achievements (early bird, night owl)
        await user_service.track_time_based_achievements(current_user["id"])

        # Track domain exploration if domain_type is provided
        if request.domain_type:
            await user_service.track_domain_exploration(current_user["id"], request.domain_type)

        # Track citations if sources were returned
        if sources_count > 0:
            await user_service.update_user_stats(current_user["id"], "citations_received", sources_count)

        logger.info("User stats updated successfully", user_id=current_user["id"])
    except Exception as e:
        # Don't fail the chat if achievement tracking fails
        logger.warning("Achievement tracking failed", user_id=current_user["id"], error=str(e))

    return ChatResponse(**result)


