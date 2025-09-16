"""Chat endpoints for RAG-based Q&A."""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag_scholar.config.settings import DomainType
from rag_scholar.services.dependencies import get_chat_service, get_session_manager
from rag_scholar.services.enhanced_chat_service import ChatService
from rag_scholar.services.session_manager import SessionManager

from ...models.user import UserResponse
from .auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request model."""

    query: str
    domain: DomainType | None = None
    session_id: str | None = None
    selected_documents: list[str] | None = None
    active_class: str | None = None  # Active class/collection for document filtering
    stream: bool = False
    user_context: dict[str, Any] | None = None  # Contains bio, research_interests, etc.


class ChatResponse(BaseModel):
    """Chat response model."""

    answer: str
    citations: list[dict[str, Any]]
    domain: str
    session_id: str
    active_class: str | None = None


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
    session_manager: SessionManager = Depends(get_session_manager),
    current_user: UserResponse = Depends(get_current_user),
) -> ChatResponse:
    """Process a chat query with RAG."""

    try:
        result = await chat_service.process_query(
            query=request.query,
            domain=request.domain,
            session_id=request.session_id,
            selected_documents=request.selected_documents,
            active_class=request.active_class,
            user_context=request.user_context,
            user_id=current_user.id,
        )

        # Update session message count and timestamp after successful message processing
        session_id = result["session_id"]
        print(f"🔧 DEBUG: Attempting to update session {session_id}")
        if session_id:
            try:
                session = await session_manager.get_session(session_id)
                print(f"🔧 DEBUG: Retrieved session: {session is not None}")
                if session:
                    old_timestamp = session.get("updated_at", "None")
                    old_message_count = session.get("message_count", 0)
                    # Update the session's updated_at timestamp to move it to top of list
                    session["updated_at"] = datetime.now(timezone.utc).isoformat()
                    # Increment message count (user message + assistant response = +2)
                    session["message_count"] = old_message_count + 2

                    # Auto-generate session name after first message if it's still the default name
                    current_name = session.get("name", "")
                    print(f"🔧 DEBUG: Current session name: '{current_name}', message_count: {session['message_count']}")
                    if (session["message_count"] >= 2 and
                        (current_name.startswith("New Chat") or current_name.startswith("Chat") or current_name == "")):
                        from .sessions import generate_session_name
                        messages = session.get("history", [])
                        print(f"🔧 DEBUG: Attempting to generate name with {len(messages)} messages")
                        if messages:
                            new_name = generate_session_name(messages)
                            session["name"] = new_name
                            print(f"🔧 DEBUG: Updated session name from '{current_name}' to: '{new_name}'")

                    print(f"🔧 DEBUG: Updated timestamp from {old_timestamp} to {session['updated_at']}")
                    print(f"🔧 DEBUG: Updated message count from {old_message_count} to {session['message_count']}")
                    await session_manager.save_session(session_id, session)
                    print(f"🔧 DEBUG: Session saved successfully")
                else:
                    print(f"🔧 DEBUG: Session not found for ID {session_id}")
            except Exception as e:
                # Log error but don't fail the chat response
                print(f"🔧 ERROR: Failed to update session timestamp: {e}")
        else:
            print(f"🔧 DEBUG: No session_id provided in result")

        return ChatResponse(
            answer=result["answer"],
            citations=result["citations"],
            domain=result["domain"],
            session_id=result["session_id"],
            active_class=result.get("active_class"),
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
            active_class=request.active_class,
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
) -> None:
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
) -> list[dict[str, Any]]:
    """Get chat history for a session."""

    # TODO: Implement get_history method in ChatService
    return []


@router.delete("/sessions/{session_id}")
async def clear_session(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service),
) -> dict[str, str]:
    """Clear a chat session."""

    # TODO: Implement clear_session method in ChatService
    return {"message": "Session cleared"}
