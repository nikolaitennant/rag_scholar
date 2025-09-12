"""
Memory Service for maintaining conversation context and summaries.
"""

import logging
from datetime import datetime
from typing import Any

from langchain.schema import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing conversation memory and context."""

    def __init__(self, llm: ChatOpenAI | None = None):
        self.llm = llm or ChatOpenAI(model="gpt-4", temperature=0.3)
        self.sessions: dict[str, dict[str, Any]] = {}
        self.max_recent_messages = 8

    def get_or_create_session(self, session_id: str, domain_id: str) -> dict[str, Any]:
        """Get or create a session with memory."""
        key = f"{session_id}_{domain_id}"
        if key not in self.sessions:
            self.sessions[key] = {
                "session_id": session_id,
                "domain_id": domain_id,
                "messages": [],
                "summary": "",
                "context": {},
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
        return self.sessions[key]

    def add_message(
        self,
        session_id: str,
        domain_id: str,
        role: str,
        content: str,
        citations: list[dict[str, Any]] | None = None,
    ) -> None:
        """Add a message to the session memory."""
        session = self.get_or_create_session(session_id, domain_id)
        session["messages"].append(
            {
                "role": role,
                "content": content,
                "citations": citations or [],
                "timestamp": datetime.now().isoformat(),
            }
        )
        session["updated_at"] = datetime.now().isoformat()

        # Update summary if we have enough messages
        if len(session["messages"]) > 10 and len(session["messages"]) % 5 == 0:
            self._update_summary(session)

    def get_context_for_query(
        self, session_id: str, domain_id: str, include_summary: bool = True
    ) -> str:
        """Get the context for a new query."""
        session = self.get_or_create_session(session_id, domain_id)

        context_parts = []

        # Add summary if available and requested
        if include_summary and session["summary"]:
            context_parts.append(f"Previous conversation summary: {session['summary']}")

        # Add recent messages
        recent_messages = session["messages"][-self.max_recent_messages :]
        if recent_messages:
            context_parts.append("Recent conversation:")
            for msg in recent_messages:
                role = "User" if msg["role"] == "user" else "Assistant"
                context_parts.append(f"{role}: {msg['content'][:200]}...")

        # Add any stored context facts
        if session.get("context"):
            context_parts.append("Remembered facts:")
            for key, value in session["context"].items():
                context_parts.append(f"- {key}: {value}")

        return "\n\n".join(context_parts) if context_parts else ""

    def _update_summary(self, session: dict[str, Any]) -> None:
        """Update the conversation summary using LLM."""
        try:
            # Get all messages except the most recent ones
            messages_to_summarize = session["messages"][: -self.max_recent_messages]

            if not messages_to_summarize:
                return

            # Create conversation text
            conversation = "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in messages_to_summarize]
            )

            # Generate summary
            summary_prompt = f"""
            Summarize the following conversation, capturing key topics,
            important facts, and any decisions made. Be concise but comprehensive.

            Previous summary (if any): {session.get("summary", "None")}

            New conversation to incorporate:
            {conversation}

            Provide an updated summary:
            """

            messages = [
                SystemMessage(
                    content="You are a helpful assistant that creates concise conversation summaries."
                ),
                HumanMessage(content=summary_prompt),
            ]

            response = self.llm.invoke(messages)
            session["summary"] = response.content

            # Clear old messages to save memory
            session["messages"] = session["messages"][-self.max_recent_messages :]

        except Exception as e:
            logger.error(f"Error updating summary: {e}")

    def remember_fact(
        self, session_id: str, domain_id: str, key: str, value: str
    ) -> None:
        """Remember a specific fact in the session context."""
        session = self.get_or_create_session(session_id, domain_id)
        if "context" not in session:
            session["context"] = {}
        session["context"][key] = value
        session["updated_at"] = datetime.now().isoformat()

    def get_session_info(self, session_id: str, domain_id: str) -> dict[str, Any]:
        """Get information about a session."""
        session = self.get_or_create_session(session_id, domain_id)
        return {
            "message_count": len(session["messages"]),
            "user_message_count": len(
                [m for m in session["messages"] if m["role"] == "user"]
            ),
            "has_summary": bool(session.get("summary")),
            "context_facts": len(session.get("context", {})),
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
        }

    def clear_session(self, session_id: str, domain_id: str) -> None:
        """Clear a session's memory."""
        key = f"{session_id}_{domain_id}"
        if key in self.sessions:
            del self.sessions[key]

    def export_session(self, session_id: str, domain_id: str) -> dict[str, Any]:
        """Export full session data."""
        return self.get_or_create_session(session_id, domain_id)
