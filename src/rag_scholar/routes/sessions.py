from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from .auth import get_current_user
from ..config.settings import get_settings

router = APIRouter()

class SessionResponse(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
    message_count: int = 0
    preview: Optional[str] = None
    class_id: Optional[str] = None
    class_name: Optional[str] = None  # Human-readable class name
    domain: Optional[str] = None      # Domain type like "law", "science", "history", etc.

@router.get("/sessions", response_model=List[SessionResponse])
async def get_user_sessions(current_user: dict = Depends(get_current_user)):
    """Get all chat sessions for the current user using LangChain's structure"""
    try:
        from google.cloud import firestore
        settings = get_settings()
        db = firestore.Client(project=settings.google_cloud_project)
        user_id = current_user["id"]

        # LangChain stores sessions as subcollections: users/{user_id}/chat_sessions/{session_id}/messages
        sessions_ref = db.collection(f"users/{user_id}/chat_sessions")
        session_docs = sessions_ref.stream()

        session_list = []
        session_docs_list = list(session_docs)

        print(f"DEBUG SESSIONS: Found {len(session_docs_list)} session documents")

        for session_doc in session_docs_list:
            session_id = session_doc.id
            session_data = session_doc.to_dict()

            # Use LangChain's FirestoreChatMessageHistory to get messages correctly
            try:
                from langchain_google_firestore import FirestoreChatMessageHistory
                history = FirestoreChatMessageHistory(
                    session_id=session_id,
                    collection=f"users/{user_id}/chat_sessions"
                )
                messages = history.messages
            except Exception as e:
                print(f"DEBUG: Error using LangChain history for {session_id}: {e}")
                # Fallback to manual query
                messages_ref = sessions_ref.document(session_id).collection("messages")
                try:
                    # Try ordering by timestamp first
                    messages = list(messages_ref.order_by("timestamp").limit(5).stream())
                except:
                    try:
                        # Try without ordering if timestamp field doesn't exist
                        messages = list(messages_ref.limit(5).stream())
                    except:
                        messages = []

            print(f"DEBUG: Session {session_id} has {len(messages)} messages")

            # Get first message for preview
            preview = None
            if messages:
                if hasattr(messages[0], 'content'):
                    # LangChain message object
                    first_msg = messages[0]
                    if hasattr(first_msg, 'type') and first_msg.type == "human":
                        content = first_msg.content
                        preview = content[:50] + "..." if len(content) > 50 else content
                else:
                    # Firestore document (fallback)
                    first_msg = messages[0].to_dict() if hasattr(messages[0], 'to_dict') else messages[0]
                    if first_msg.get("type") == "human":
                        content = first_msg.get("data", {}).get("content", "")
                        preview = content[:50] + "..." if len(content) > 50 else content

            # Use session metadata if available, otherwise create from session ID
            name = session_data.get("name", f"Chat {session_id[:8]}")
            created_at = session_data.get("created_at", datetime.now(timezone.utc).isoformat())
            updated_at = session_data.get("updated_at", datetime.now(timezone.utc).isoformat())

            session_list.append(SessionResponse(
                id=session_id,
                name=name,
                created_at=created_at,
                updated_at=updated_at,
                message_count=len(messages),
                preview=preview,
                class_id=session_data.get("class_id"),
                class_name=session_data.get("class_name"),
                domain=session_data.get("domain")
            ))

        # Sort by updated_at descending (most recent first)
        # Convert ISO strings to datetime for proper sorting
        session_list.sort(key=lambda x: datetime.fromisoformat(x.updated_at.replace('Z', '+00:00')), reverse=True)

        return session_list

    except Exception as e:
        print(f"DEBUG: Error getting sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a specific session using LangChain structure"""
    try:
        from langchain_google_firestore import FirestoreChatMessageHistory
        user_id = current_user["id"]

        # Use LangChain's FirestoreChatMessageHistory to get messages correctly
        history = FirestoreChatMessageHistory(
            session_id=session_id,
            collection=f"users/{user_id}/chat_sessions"
        )

        message_list = []
        for msg in history.messages:
            if hasattr(msg, 'type') and hasattr(msg, 'content'):
                if msg.type == "human":
                    role = "user"
                elif msg.type == "ai":
                    role = "assistant"
                else:
                    continue  # Skip other message types

                message_list.append({
                    "role": role,
                    "content": msg.content,
                    "timestamp": None  # LangChain messages might not have timestamp
                })

        return {"messages": message_list}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session messages: {str(e)}")

@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update session metadata (like name)"""
    try:
        from google.cloud import firestore
        settings = get_settings()
        db = firestore.Client(project=settings.google_cloud_project)
        user_id = current_user["id"]

        # Update session document with new data
        session_ref = db.collection(f"users/{user_id}/chat_sessions").document(session_id)
        session_ref.update({
            "name": data.get("name"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

        return {"id": session_id, "name": data.get("name")}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a session and all its messages"""
    try:
        from google.cloud import firestore
        settings = get_settings()
        db = firestore.Client(project=settings.google_cloud_project)
        user_id = current_user["id"]

        # Delete all messages in the session first
        session_ref = db.collection(f"users/{user_id}/chat_sessions").document(session_id)

        # Use LangChain's FirestoreChatMessageHistory to clean up properly
        from langchain_google_firestore import FirestoreChatMessageHistory
        history = FirestoreChatMessageHistory(
            session_id=session_id,
            collection=f"users/{user_id}/chat_sessions"
        )
        history.clear()  # This should clear all messages

        # Delete the session document itself
        session_ref.delete()

        return {"message": "Session deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")