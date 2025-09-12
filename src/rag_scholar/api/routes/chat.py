"""Chat endpoints for RAG-based Q&A."""

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag_scholar.config.settings import DomainType
from rag_scholar.services.dependencies import get_chat_service
from rag_scholar.services.enhanced_chat_service import ChatService

from ...models.user import UserResponse
from .auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request model."""

    query: str
    domain: DomainType | None = None
    session_id: str | None = None
    selected_documents: list[str] | None = None
    stream: bool = False
    user_context: dict | None = None  # Contains bio, research_interests, etc.


class ChatResponse(BaseModel):
    """Chat response model."""

    answer: str
    citations: list[dict]
    domain: str
    session_id: str


class Citation(BaseModel):
    """Citation model."""

    id: int
    source: str
    page: int | None = None
    preview: str
    relevance_score: float


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserResponse = Depends(get_current_user),
) -> ChatResponse:
    """Process a chat query with RAG."""

    try:
        result = await chat_service.process_query(
            query=request.query,
            domain=request.domain,
            session_id=request.session_id,
            selected_documents=request.selected_documents,
            user_context=request.user_context,
            user_id=current_user.id,
        )

        return ChatResponse(
            answer=result["answer"],
            citations=result["citations"],
            domain=result["domain"],
            session_id=result["session_id"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserResponse = Depends(get_current_user),
) -> StreamingResponse:
    """Stream chat responses."""

    async def generate() -> AsyncGenerator[str, None]:
        async for chunk in chat_service.stream_query(
            query=request.query,
            domain=request.domain,
            session_id=request.session_id,
            selected_documents=request.selected_documents,
            user_context=request.user_context,
            user_id=current_user.id,
        ):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
    )


@router.websocket("/ws/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service),
):
    """WebSocket endpoint for real-time chat."""

    await websocket.accept()

    try:
        while True:
            # Receive message
            data = await websocket.receive_json()

            # Process query
            result = await chat_service.process_query(
                query=data["query"],
                domain=DomainType(data.get("domain", "general")),
                session_id=session_id,
                selected_documents=data.get("selected_documents"),
                user_context=data.get("user_context"),
            )

            # Send response
            await websocket.send_json(result)

    except Exception as e:
        await websocket.close(code=1000, reason=str(e))


@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service),
) -> list[dict]:
    """Get chat history for a session."""

    history = await chat_service.get_history(session_id)
    return history


@router.delete("/sessions/{session_id}")
async def clear_session(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service),
) -> dict:
    """Clear a chat session."""

    await chat_service.clear_session(session_id)
    return {"message": "Session cleared"}
