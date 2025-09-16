"""Session management endpoints for chat history."""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from ...config.settings import get_settings
from ...models.user import UserResponse
from ...services.session_manager import SessionManager
from .auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])
logger = logging.getLogger(__name__)


def parse_datetime(dt_str: str | datetime | None) -> datetime:
    """Parse datetime string to datetime object, handling both strings and datetime objects."""
    if isinstance(dt_str, str):
        try:
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            # Ensure timezone-aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            return datetime.now(timezone.utc)
    elif isinstance(dt_str, datetime):
        # Ensure timezone-aware
        if dt_str.tzinfo is None:
            return dt_str.replace(tzinfo=timezone.utc)
        return dt_str
    else:
        return datetime.now(timezone.utc)


class SessionSummary(BaseModel):
    """Session summary model."""

    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: str | None = None  # First message or summary
    class_name: str | None = None  # User class name like "History of Law"


class SessionDetail(BaseModel):
    """Detailed session model."""

    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    messages: list[dict[str, Any]]
    class_name: str | None = None


class SessionCreate(BaseModel):
    """Create session request."""

    name: str | None = None
    domain: str | None = "general"
    class_id: str | None = None
    class_name: str | None = None


class ClassCreate(BaseModel):
    """Create class with vector store request."""

    name: str
    domain: str | None = "general"
    selected_documents: list[str] | None = None


class SessionUpdate(BaseModel):
    """Update session request."""

    name: str


# Initialize services
settings = get_settings()
session_manager = SessionManager(settings)


def generate_session_name(messages: list[dict[str, Any]]) -> str:
    """Generate a name for a session based on its messages using AI."""
    if not messages:
        return f"New Chat - {datetime.now(timezone.utc).strftime('%m/%d %H:%M')}"

    # Get first user message for context
    first_message = None
    for msg in messages:
        if msg.get("type") == "human" or msg.get("role") == "user":
            first_message = msg.get("content", "")
            break

    if not first_message:
        return f"Chat - {datetime.now(timezone.utc).strftime('%m/%d %H:%M')}"

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
        title = str(response.content).strip().strip('"').strip("'")

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
            else f"Chat - {datetime.now(timezone.utc).strftime('%m/%d %H:%M')}"
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
                            created_at=parse_datetime(
                                session.get("created_at", datetime.now(timezone.utc))
                            ),
                            updated_at=parse_datetime(
                                session.get("updated_at", datetime.now(timezone.utc))
                            ),
                            message_count=len(messages),
                            preview=preview,
                            class_name=session.get("class_name", "General"),
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

        now = datetime.now(timezone.utc)
        session: dict[str, Any] = {
            "id": session_id,
            "user_id": current_user.id,
            "name": session_data.name or f"New Chat - {now.strftime('%m/%d %H:%M')}",
            "domain": session_data.domain,
            "class_id": session_data.class_id,
            "class_name": session_data.class_name or "General",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "history": [],
            "recent_messages": [],  # Last 8 messages for context
            "chat_summary": "",     # Summary of entire chat
            "memory_facts": [],
            "session_facts": [],
        }

        await session_manager.save_session(session_id, session)

        return SessionSummary(
            id=session_id,
            name=str(session["name"]),
            created_at=now,
            updated_at=now,
            message_count=0,
            preview=None,
            class_name=session_data.class_name,
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
                        "timestamp": datetime.now(timezone.utc).isoformat(),  # We don't have timestamps yet
                    }
                )
            elif isinstance(msg, dict):
                message_dicts.append(msg)

        return SessionDetail(
            id=session_id,
            name=session.get("name", "Unnamed Chat"),
            created_at=parse_datetime(session.get("created_at", datetime.now(timezone.utc))),
            updated_at=parse_datetime(session.get("updated_at", datetime.now(timezone.utc))),
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
        session["updated_at"] = datetime.now(timezone.utc).isoformat()

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
            name=str(session["name"]),
            created_at=parse_datetime(session.get("created_at", datetime.now(timezone.utc))),
            updated_at=parse_datetime(session["updated_at"]),
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


@router.post("/create-class", response_model=SessionSummary)
async def create_class_with_documents(
    class_data: ClassCreate,
    current_user: UserResponse = Depends(get_current_user),
) -> SessionSummary:
    """Create a new class with immediate vector store and document transfer."""
    try:
        from rag_scholar.services.dependencies import get_document_service
        import uuid

        # Generate unique class ID
        class_id = hashlib.sha256(f"{current_user.id}:{class_data.name}:{uuid.uuid4().hex}".encode()).hexdigest()[:16]

        # Create session for the class
        session_id = f"user_{current_user.id}_{uuid.uuid4().hex[:12]}"

        now = datetime.now(timezone.utc)
        session: dict[str, Any] = {
            "id": session_id,
            "user_id": current_user.id,
            "name": class_data.name,
            "domain": class_data.domain,
            "class_id": class_id,
            "class_name": class_data.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "history": [],
            "recent_messages": [],
            "chat_summary": "",
            "memory_facts": [],
            "session_facts": [],
        }

        await session_manager.save_session(session_id, session)

        # If documents are selected, transfer them to the new class collection
        if class_data.selected_documents:
            from rag_scholar.services.dependencies import get_document_service

            document_service = get_document_service()

            # Transfer documents to the new class collection
            await transfer_documents_to_class(
                document_service=document_service,
                document_ids=class_data.selected_documents,
                target_collection=class_id,
                source_collection="database"  # Documents come from the shared database collection
            )

        return SessionSummary(
            id=session_id,
            name=class_data.name,
            created_at=now,
            updated_at=now,
            message_count=0,
            preview=None,
            class_name=class_data.name,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create class: {str(e)}"
        )


async def transfer_documents_to_class(
    document_service,
    document_ids: list[str],
    target_collection: str,
    source_collection: str = "database"
) -> None:
    """Transfer documents from one collection to another."""
    try:
        from pathlib import Path
        import shutil

        settings = get_settings()
        source_dir = settings.upload_dir / source_collection
        target_dir = settings.upload_dir / target_collection
        target_dir.mkdir(parents=True, exist_ok=True)

        documents_to_process = []

        # Find and copy files for the specified document IDs
        if source_dir.exists():
            for file_path in source_dir.iterdir():
                if file_path.is_file():
                    # Generate document ID to match
                    doc_id = hashlib.sha256(
                        f"{source_collection}:{file_path.name}".encode()
                    ).hexdigest()[:16]

                    if doc_id in document_ids:
                        # Copy file to target collection
                        target_file = target_dir / file_path.name
                        shutil.copy2(file_path, target_file)

                        # Load and process the document
                        loader_class = document_service.loader_map.get(file_path.suffix.lower())
                        if loader_class:
                            loader = loader_class(str(target_file))
                            docs = loader.load()

                            for doc in docs:
                                processed = document_service.processor.process_document(
                                    content=doc.page_content,
                                    source=file_path.name,
                                    metadata=doc.metadata,
                                )
                                documents_to_process.extend(processed.chunks)

        # Create/update vector store for the target collection
        if documents_to_process:
            await document_service._update_index(target_collection, documents_to_process)

    except Exception as e:
        logger.error(f"Failed to transfer documents to class: {e}")
        raise


class DocumentTransferRequest(BaseModel):
    """Document transfer request."""

    class_id: str
    document_ids: list[str]


@router.post("/transfer-documents")
async def transfer_documents_to_class_endpoint(
    request: DocumentTransferRequest,
    current_user: UserResponse = Depends(get_current_user)
) -> dict[str, str]:
    """Transfer documents from database collection to a class collection."""
    try:
        from rag_scholar.services.dependencies import get_document_service

        document_service = get_document_service()

        # Transfer documents to the class collection
        await transfer_documents_to_class(
            document_service=document_service,
            document_ids=request.document_ids,
            target_collection=request.class_id,
            source_collection="database"
        )

        return {
            "message": f"Successfully transferred {len(request.document_ids)} documents to class {request.class_id}"
        }

    except Exception as e:
        logger.error(f"Failed to transfer documents to class: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to transfer documents: {str(e)}"
        )


@router.delete("/class/{class_id}")
async def delete_sessions_by_class(
    class_id: str, current_user: UserResponse = Depends(get_current_user)
) -> dict[str, str]:
    """Delete all sessions for a specific class."""
    try:
        from rag_scholar.services.dependencies import get_document_service
        import shutil
        from pathlib import Path

        # Get all sessions for the current user
        user_prefix = f"user_{current_user.id}_"
        all_sessions = await session_manager.list_sessions()
        deleted_count = 0

        for session_id in all_sessions:
            if session_id.startswith(user_prefix):
                session = await session_manager.get_session(session_id)
                if session and session.get("class_id") == class_id:
                    await session_manager.clear_session(session_id)
                    deleted_count += 1

        # Delete class documents and vector store
        settings = get_settings()

        # Delete upload directory for this class
        upload_dir = settings.upload_dir / class_id
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
            logger.info(f"Deleted upload directory: {upload_dir}")

        # Delete vector store index for this class
        index_dir = settings.index_dir / class_id
        if index_dir.exists():
            shutil.rmtree(index_dir)
            logger.info(f"Deleted vector store index: {index_dir}")

        return {
            "message": f"Successfully deleted {deleted_count} sessions, documents, and vector store for class {class_id}"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete sessions for class: {str(e)}"
        )
