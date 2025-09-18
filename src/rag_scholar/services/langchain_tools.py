"""LangChain tools to replace custom commands."""

import structlog
from typing import Optional, Type

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from langchain_google_firestore import FirestoreChatMessageHistory

logger = structlog.get_logger()


# Tool Input Schemas
class RememberInput(BaseModel):
    """Input for remember tool."""
    fact: str = Field(description="Fact to remember permanently")
    user_id: str = Field(description="User ID")


class MemoInput(BaseModel):
    """Input for memo tool."""
    fact: str = Field(description="Fact to remember for this session only")
    session_id: str = Field(description="Session ID")
    user_id: str = Field(description="User ID")


class PersonaInput(BaseModel):
    """Input for persona/role tool."""
    persona: str = Field(description="Role or persona to adopt")
    session_id: str = Field(description="Session ID")
    user_id: str = Field(description="User ID")


# LangChain Tools
class RememberTool(BaseTool):
    """Tool to remember facts permanently in user profile."""

    name: str = "remember"
    description: str = "Remember a fact permanently across all sessions for this user"
    args_schema: Type[BaseModel] = RememberInput

    def _run(self, fact: str, user_id: str) -> str:
        """Store fact in user's permanent memory."""
        try:
            # Store in Firestore user memory collection
            from google.cloud import firestore
            db = firestore.Client()

            # Add to user's permanent facts
            user_memory_ref = db.collection("user_memory").document(user_id)
            user_memory_ref.collection("permanent_facts").add({
                "fact": fact,
                "timestamp": firestore.SERVER_TIMESTAMP
            })

            logger.info("Fact remembered permanently", user_id=user_id, fact=fact[:50])
            return "✅ Fact remembered permanently across all sessions."

        except Exception as e:
            logger.error("Failed to remember fact", error=str(e))
            return "❌ Failed to remember fact."

    async def _arun(self, fact: str, user_id: str) -> str:
        """Async version."""
        return self._run(fact, user_id)


class MemoTool(BaseTool):
    """Tool to remember facts for current session only."""

    name: str = "memo"
    description: str = "Remember a fact for this session only"
    args_schema: Type[BaseModel] = MemoInput

    def _run(self, fact: str, session_id: str, user_id: str) -> str:
        """Store fact in session memory."""
        try:
            # Add to session memory
            history = FirestoreChatMessageHistory(
                session_id=session_id,
                user_id=user_id,
                collection_name="chat_sessions"
            )

            # Store as system message in session
            from langchain_core.messages import SystemMessage
            history.add_message(SystemMessage(content=f"SESSION_MEMO: {fact}"))

            logger.info("Session memo added", session_id=session_id, fact=fact[:50])
            return "📝 Fact remembered for this session only."

        except Exception as e:
            logger.error("Failed to add memo", error=str(e))
            return "❌ Failed to add memo."

    async def _arun(self, fact: str, session_id: str, user_id: str) -> str:
        """Async version."""
        return self._run(fact, session_id, user_id)


class PersonaTool(BaseTool):
    """Tool to set persona/role for the session."""

    name: str = "set_persona"
    description: str = "Adopt a specific role or persona for this conversation"
    args_schema: Type[BaseModel] = PersonaInput

    def _run(self, persona: str, session_id: str, user_id: str) -> str:
        """Set persona for session."""
        try:
            # Store persona in session metadata
            history = FirestoreChatMessageHistory(
                session_id=session_id,
                user_id=user_id,
                collection_name="chat_sessions"
            )

            # Add persona as system message
            from langchain_core.messages import SystemMessage
            history.add_message(SystemMessage(
                content=f"PERSONA_SET: I am now acting as {persona}. I will respond from this perspective."
            ))

            logger.info("Persona set", session_id=session_id, persona=persona)
            return f"🎭 Now acting as: {persona}"

        except Exception as e:
            logger.error("Failed to set persona", error=str(e))
            return "❌ Failed to set persona."

    async def _arun(self, persona: str, session_id: str, user_id: str) -> str:
        """Async version."""
        return self._run(persona, session_id, user_id)


# Tool Registry
LANGCHAIN_TOOLS = [
    RememberTool(),
    MemoTool(),
    PersonaTool(),
]