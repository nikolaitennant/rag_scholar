"""Conversation memory wrapper around LangChain memories with Streamlit state."""
from __future__ import annotations

import streamlit as st
from langchain.memory import ConversationBufferWindowMemory, ConversationSummaryBufferMemory
from langchain_openai import ChatOpenAI

from config import AppConfig


class MemoryManager:
    """Sets up and maintains the two‑tier memory architecture."""

    def __init__(self, api_key: str, cfg: AppConfig):
        self.cfg = cfg
        self._ensure_session_state()
        self._setup_memories(api_key)

    # ------------------------------------------------------------------ #
    # Public helpers                                                     #
    # ------------------------------------------------------------------ #
    @property
    def window(self) -> ConversationBufferWindowMemory:
        return st.session_state.window_memory

    @property
    def summary(self) -> ConversationSummaryBufferMemory:
        return st.session_state.summary_memory

    def save_turn(self, user_msg: str, assistant_msg: str) -> None:
        """Persist a single user/assistant exchange to both memories."""
        self.window.save_context({"input": user_msg}, {"output": assistant_msg})
        self.summary.save_context({"input": user_msg}, {"output": assistant_msg})

    # ------------------------------------------------------------------ #
    # Internal helpers                                                   #
    # ------------------------------------------------------------------ #
    def _ensure_session_state(self) -> None:
        """Initialise Streamlit session keys that various modules rely on."""
        # misc lists
        for key in ("memory_facts", "session_facts", "chat_history"):
            st.session_state.setdefault(key, [])
        st.session_state.setdefault("persona", None)

        # global citation map
        st.session_state.setdefault("global_ids", {})
        st.session_state.setdefault("next_id", 1)

    def _setup_memories(self, api_key: str) -> None:
        """Create or retrieve LangChain memory objects inside st.session_state."""
        if "window_memory" not in st.session_state:
            st.session_state.window_memory = ConversationBufferWindowMemory(
                k=self.cfg.SESSION_WINDOW, return_messages=True
            )

        if "summary_memory" not in st.session_state:
            st.session_state.summary_memory = ConversationSummaryBufferMemory(
                llm=ChatOpenAI(api_key=api_key, model=self.cfg.SUMMARY_MODEL, temperature=0.0),
                max_token_limit=self.cfg.MAX_TOKEN_LIMIT,
                return_messages=True,
                human_prefix="Human",
                ai_prefix="AI",
                summary_prompt=(
                    "Provide a concise running summary of the conversation so far, "
                    "excluding the most recent 8 messages."
                ),
            )
