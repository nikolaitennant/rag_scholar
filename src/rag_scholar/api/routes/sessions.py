"""Session management endpoints for chat history."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from ...config.settings import get_settings
from ...models.user import UserResponse
from ...services.session_manager import SessionManager
from .auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionSummary(BaseModel):
    """Session summary model."""

    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: str | None = None  # First message or summary


class SessionDetail(BaseModel):
    """Detailed session model."""

    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    messages: list[dict]
    domain: str | None = None


class SessionCreate(BaseModel):
    """Create session request."""

    name: str | None = None
    domain: str | None = "general"


class SessionUpdate(BaseModel):
    """Update session request."""

    name: str


# Initialize services
settings = get_settings()
session_manager = SessionManager(settings)


def generate_session_name(messages: list[dict]) -> str:
    """Generate a name for a session based on its messages using AI."""
    if not messages:
        return f"New Chat - {datetime.now().strftime('%m/%d %H:%M')}"

    # Get first user message for context
    first_message = None
    for msg in messages:
        if msg.get("type") == "human" or msg.get("role") == "user":
            first_message = msg.get("content", "")
            break

    if not first_message:
        return f"Chat - {datetime.now().strftime('%m/%d %H:%M')}"

    try:
        # Use OpenAI to generate a short, descriptive title
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3, max_tokens=30)

        prompt = f"""Generate a short, descriptive title (2-5 words) for a chat session that starts with this message:

"{first_message[:200]}"

The title should be concise and capture the main topic. Examples:
- "Python Data Analysis"
- "Recipe for Pasta"
- "Travel to Japan"
- "Resume Writing Help"

Title:"""

        response = llm.invoke(prompt)
        title = response.content.strip().strip('"').strip("'")

        # Fallback if AI response is too long or empty
        if not title or len(title) > 50:
            # Extract first few words from the message
            words = first_message.split()[:3]
            title = " ".join(words).title()

        return title

    except Exception:
        # Fallback to first few words of the message
        words = first_message.split()[:3]
        return (
            " ".join(words).title()
            if words
            else f"Chat - {datetime.now().strftime('%m/%d %H:%M')}"
        )


@router.get("/", response_model=list[SessionSummary])
async def list_user_sessions(
    current_user: UserResponse = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
) -> list[SessionSummary]:
    """Get all sessions for the current user."""
    try:
        # Get all sessions (we'll need to filter by user_id)
        # For now, we'll use a simple approach - prefix session IDs with user ID
        user_prefix = f"user_{current_user.id}_"

        all_sessions = await session_manager.list_sessions()
        user_sessions = []

        for session_id in all_sessions:
            if session_id.startswith(user_prefix):
                session = await session_manager.get_session(session_id)
                if session:
                    messages = session.get("history", [])

                    # Get preview from first message
                    preview = None
                    for msg in messages:
                        if hasattr(msg, "content") and msg.content:
                            preview = (
                                msg.content[:100] + "..."
                                if len(msg.content) > 100
                                else msg.content
                            )
                            break
                        elif isinstance(msg, dict) and msg.get("content"):
                            content = msg["content"]
                            preview = (
                                content[:100] + "..." if len(content) > 100 else content
                            )
                            break

                    # Generate name if not set
                    name = session.get("name")
                    if not name:
                        name = generate_session_name(messages)
                        session["name"] = name
                        await session_manager.save_session(session_id, session)

                    user_sessions.append(
                        SessionSummary(
                            id=session_id,
                            name=name,
                            created_at=session.get("created_at", datetime.now()),
                            updated_at=session.get("updated_at", datetime.now()),
                            message_count=len(messages),
                            preview=preview,
                        )
                    )

        # Sort by updated_at descending
        user_sessions.sort(key=lambda x: x.updated_at, reverse=True)

        return user_sessions[offset : offset + limit]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list sessions: {str(e)}"
        )


@router.post("/", response_model=SessionSummary)
async def create_session(
    session_data: SessionCreate, current_user: UserResponse = Depends(get_current_user)
) -> SessionSummary:
    """Create a new chat session."""
    try:
        # Generate user-specific session ID
        import uuid

        session_id = f"user_{current_user.id}_{uuid.uuid4().hex[:12]}"

        now = datetime.now()
        session = {
            "id": session_id,
            "user_id": current_user.id,
            "name": session_data.name or f"New Chat - {now.strftime('%m/%d %H:%M')}",
            "domain": session_data.domain,
            "created_at": now,
            "updated_at": now,
            "history": [],
            "memory_facts": [],
            "session_facts": [],
        }

        await session_manager.save_session(session_id, session)

        return SessionSummary(
            id=session_id,
            name=session["name"],
            created_at=now,
            updated_at=now,
            message_count=0,
            preview=None,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create session: {str(e)}"
        )


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: str, current_user: UserResponse = Depends(get_current_user)
) -> SessionDetail:
    """Get a specific session by ID."""
    try:
        # Verify user owns this session
        if not session_id.startswith(f"user_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied to this session")

        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = session.get("history", [])

        # Convert messages to dict format
        message_dicts = []
        for msg in messages:
            if hasattr(msg, "content") and hasattr(msg, "type"):
                message_dicts.append(
                    {
                        "role": "user" if msg.type == "human" else "assistant",
                        "content": msg.content,
                        "timestamp": datetime.now().isoformat(),  # We don't have timestamps yet
                    }
                )
            elif isinstance(msg, dict):
                message_dicts.append(msg)

        return SessionDetail(
            id=session_id,
            name=session.get("name", "Unnamed Chat"),
            created_at=session.get("created_at", datetime.now()),
            updated_at=session.get("updated_at", datetime.now()),
            messages=message_dicts,
            domain=session.get("domain"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


@router.put("/{session_id}", response_model=SessionSummary)
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> SessionSummary:
    """Update a session (rename)."""
    try:
        # Verify user owns this session
        if not session_id.startswith(f"user_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied to this session")

        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session["name"] = session_update.name
        session["updated_at"] = datetime.now()

        await session_manager.save_session(session_id, session)

        messages = session.get("history", [])
        preview = None
        for msg in messages:
            if hasattr(msg, "content") and msg.content:
                preview = (
                    msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                )
                break

        return SessionSummary(
            id=session_id,
            name=session["name"],
            created_at=session.get("created_at", datetime.now()),
            updated_at=session["updated_at"],
            message_count=len(messages),
            preview=preview,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update session: {str(e)}"
        )


@router.delete("/{session_id}")
async def delete_session(
    session_id: str, current_user: UserResponse = Depends(get_current_user)
) -> dict[str, str]:
    """Delete a session."""
    try:
        # Verify user owns this session
        if not session_id.startswith(f"user_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied to this session")

        await session_manager.clear_session(session_id)

        return {"message": "Session deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete session: {str(e)}"
        )
