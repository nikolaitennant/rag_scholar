"""Main chat engine and rendering."""
from __future__ import annotations
from typing import Dict
import os, re, streamlit as st
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

from science import config, memory
from science.citations import CitationManager

class ChatUI:
    """Handles user input, RAG call, and chat display."""

    def __init__(self, vector_store):
        self.vs = vector_store
        self.cites = CitationManager()
        self.llm = ChatOpenAI(api_key=config.CONFIG.api_key, model=config.CONFIG.llm_model, temperature=0.0)

    # ------------------------------------------------------------------ #
    def run(self):
        user_input = st.chat_input("Ask anything")
        if not user_input:
            return
        answer, snippet_map = self._generate_answer(user_input)
        self._push_history(user_input, answer, snippet_map)
        self._render_history()

    # ------------------------------------------------------------------ #
    def _generate_answer(self, question: str):
        docs = self.vs.as_retriever(search_kwargs={"k": config.CONFIG.first_k}).invoke(question)

        snippet_map: Dict[int, Dict] = {}
        context_parts = []
        for d in docs:
            file = os.path.basename(d.metadata.get("source") or d.metadata.get("file_path", "-"))
            page = d.metadata.get("page")
            cid  = self.cites.assign(file, page)
            context_parts.append(f"[#{cid}]\n{d.page_content}")
            snippet_map[cid] = {
                "preview": re.sub(r"\s+", " ", d.page_content.strip())[:160] + "…",
                "full": d.page_content.strip(),
                "source": file,
                "page": page,
            }
        context = "\n\n".join(context_parts)

        messages = [SystemMessage(content="RAG rules … (same prompt text)")]
        messages.extend(memory.MemoryManager.window.load_memory_variables({}).get("history", []))
        messages.extend(memory.MemoryManager.summary.load_memory_variables({}).get("history", []))
        if context:
            messages.append(SystemMessage(content=f"Context:\n{context}"))
        messages.append(HumanMessage(content=question))

        resp = self.llm.invoke(messages)
        memory.MemoryManager.window.save_context({"input":question},{"output":resp.content})
        memory.MemoryManager.summary.save_context({"input":question},{"output":resp.content})
        return resp.content, snippet_map

    # ------------------------------------------------------------------ #
    def _push_history(self, q, a, smap):
        st.session_state.chat_history.append({"speaker":"User","text":q})
        st.session_state.chat_history.append({"speaker":"Assistant","
