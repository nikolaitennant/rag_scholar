"""RAG Scholar chat endpoints using LangChain."""

import uuid
from fastapi import APIRouter, Depends
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
    k: int = 5


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

    # Initialize services
    settings = get_settings()
    rag_pipeline = LangChainRAGPipeline(settings)
    ingestion_pipeline = LangChainIngestionPipeline(settings)

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
    )

    # Update user achievements for chat
    try:
        user_service = UserProfileService(settings)
        await user_service.update_user_stats(current_user["id"], "total_chats", 1)

        # Track domain exploration if class_id is provided
        if request.class_id:
            await user_service.track_domain_exploration(current_user["id"], request.class_id)
    except Exception as e:
        # Don't fail the chat if achievement tracking fails
        pass

    return ChatResponse(**result)


