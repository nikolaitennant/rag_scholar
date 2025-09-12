"""Session management service."""

import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from rag_scholar.config.settings import Settings


class SessionManager:
    """Manages chat sessions and memory."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.sessions_dir = settings.data_dir / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self._cache: dict[str, dict] = {}

    async def get_session(self, session_id: str) -> dict[str, Any]:
        """Get or create a session."""

        # Check cache first
        if session_id in self._cache:
            return self._cache[session_id]

        # Try to load from disk
        session_file = self.sessions_dir / f"{session_id}.json"
        if session_file.exists():
            try:
                with open(session_file) as f:
                    session = json.load(f)
                    # Reconstruct messages
                    if "history" in session:
                        messages = []
                        for msg in session["history"]:
                            if msg["role"] == "human":
                                messages.append(HumanMessage(content=msg["content"]))
                            else:
                                messages.append(SystemMessage(content=msg["content"]))
                        session["history"] = messages

                    self._cache[session_id] = session
                    return session
            except Exception:
                pass

        # Create new session
        session = {
            "session_id": session_id,
            "history": [],
            "memory_facts": [],
            "session_facts": [],
            "persona": None,
            "active_class": "default",
            "class_states": {},
        }

        self._cache[session_id] = session
        return session

    async def save_session(self, session_id: str, session: dict[str, Any]):
        """Save session to disk."""

        # Update cache
        self._cache[session_id] = session

        # Prepare for JSON serialization
        session_copy = session.copy()
        if "history" in session_copy:
            messages = []
            for msg in session_copy["history"]:
                if isinstance(msg, HumanMessage):
                    messages.append({"role": "human", "content": msg.content})
                elif isinstance(msg, SystemMessage):
                    messages.append({"role": "system", "content": msg.content})
            session_copy["history"] = messages

        # Save to disk
        session_file = self.sessions_dir / f"{session_id}.json"
        with open(session_file, "w") as f:
            json.dump(session_copy, f, indent=2)

    async def update_session(
        self,
        session_id: str,
        query: str | None = None,
        response: str | None = None,
        **kwargs,
    ):
        """Update session with new interaction."""

        session = await self.get_session(session_id)

        # Add to history
        if query:
            session["history"].append(HumanMessage(content=query))
        if response:
            session["history"].append(SystemMessage(content=response))

        # Keep history manageable
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]

        # Update other fields
        for key, value in kwargs.items():
            session[key] = value

        await self.save_session(session_id, session)

    async def clear_session(self, session_id: str):
        """Clear a session."""

        # Remove from cache
        if session_id in self._cache:
            del self._cache[session_id]

        # Remove from disk
        session_file = self.sessions_dir / f"{session_id}.json"
        if session_file.exists():
            session_file.unlink()

    async def list_sessions(self) -> list[str]:
        """List all available sessions."""

        sessions = []
        for session_file in self.sessions_dir.glob("*.json"):
            sessions.append(session_file.stem)
        return sessions
