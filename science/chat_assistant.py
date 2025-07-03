# ── chat_assistant.py ───────────────────────────────────────────────
from __future__ import annotations
import os, re
from typing import Dict, List, Tuple

import streamlit as st
from langchain_core.messages import (
    SystemMessage, HumanMessage, AIMessage
)
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from config import AppConfig
from science.memory_manager import MemoryManager


class ChatAssistant:
    """User text  →  retrieval  →  LLM  →  formatted answer."""

    def __init__(
        self,
        api_key: str,
        cfg: AppConfig,
        memory: MemoryManager,
        vector_store: FAISS,
    ):
        self.cfg          = cfg
        self.memory       = memory
        self.vector_store = vector_store
        self.llm          = ChatOpenAI(
            api_key=api_key,
            model   = cfg.LLM_MODEL,
            temperature = 0.0
        )

    # ────────────────────────────────────────────────────────────────
    # PUBLIC ENTRY-POINT
    # ────────────────────────────────────────────────────────────────
    def handle_turn(
        self,
        user_text: str,
        sel_docs : List[str] | None = None,
        mode     : str = "Prioritise (default)",
    ) -> Dict:

        low = user_text.lower()

        # ------- special prefixes ----------------------------------
        if low.startswith("remember:"):
            self._remember_fact(user_text, permanent=True)
            return {"speaker":"Assistant", "text":"✅ Fact remembered permanently."}

        if low.startswith("memo:"):
            self._remember_fact(user_text, permanent=False)
            return {"speaker":"Assistant", "text":"ℹ️ Session-only fact added."}

        if low.startswith("role:"):
            st.session_state.persona = user_text.split(":",1)[1].strip()
            return {"speaker":"Assistant", "text":"👤 Persona set."}

        if low.startswith("background:"):
            stripped = user_text.split(":",1)[1].strip()
            return self._background_answer(stripped)

        # ------- retrieval -----------------------------------------
        docs, snippet_map = self._retrieve(user_text, sel_docs or [], mode)

        if not (docs or st.session_state.memory_facts or st.session_state.session_facts):
            return {
                "speaker":"Assistant",
                "text":"I don’t have enough information in the provided material to answer that."
            }

        # ------- build prompt & LLM call ---------------------------
        messages = self._build_messages(
            user_text   = user_text,
            docs        = docs,
            snippet_map = snippet_map,
            persona     = st.session_state.get("persona"),
        )

        response = self.llm.invoke(messages).content

        # 💾 always save this turn (before any sanitising)
        self.memory.save_turn(user_text, response)

        # ------- citation sanity check -----------------------------
        bad = [
            n for n in self._extract_citation_numbers(response)
            if n not in st.session_state.get("all_snippets", {})
        ]
        if bad or "[#]" in response:
            response = "I don’t have enough information in the provided material to answer that."

        return {"speaker":"Assistant", "text":response, "snippets":snippet_map}

    # ────────────────────────────────────────────────────────────────
    # INTERNALS
    # ────────────────────────────────────────────────────────────────
    def _background_answer(self, text: str) -> Dict:
        system = ("Background mode: you may answer from general knowledge. "
                  "Begin with **“Background (uncited):”**.")
        out = self.llm.invoke([SystemMessage(content=system),
                               HumanMessage(content=text)]).content
        if out.startswith("Background (uncited):"):
            out = "**Background (uncited):**" + out[len("Background (uncited):"):]
        return {"speaker":"Assistant", "text":out, "snippets":{}}

    # -------- retrieval (unchanged) --------------------------------
    def _retrieve(
        self, query: str, sel_docs: List[str], mode: str
    ) -> Tuple[List[Document], Dict]:
        FIRST_K, FINAL_K, THR = self.cfg.FIRST_K, self.cfg.FINAL_K, self.cfg.RELEVANCE_THRESHOLD
        full_ret = self.vector_store.as_retriever(
            search_kwargs={"k": FIRST_K, "score_threshold": THR}
        )

        focus_ret = None
        if sel_docs:
            sel = set(sel_docs)
            focus_ret = self.vector_store.as_retriever(
                search_kwargs={
                    "k": FIRST_K,
                    "filter": lambda m: os.path.basename(m.get("source","")) in sel,
                    "score_threshold": THR
                }
            )

        if mode.startswith("Only") and focus_ret:
            docs = focus_ret.invoke(query)
        elif mode.startswith("Prioritise") and focus_ret:
            prim   = focus_ret.invoke(query)
            sec    = [d for d in full_ret.invoke(query) if d not in prim][:max(0, FINAL_K-len(prim))]
            docs   = prim + sec
        else:
            docs = full_ret.invoke(query)

        snippet_map, context_parts = {}, []
        for d in docs:
            src  = os.path.basename(d.metadata.get("source","-"))
            page = d.metadata.get("page")
            cid  = self._assign_citation_id(src, page)
            context_parts.append(f"[#{cid}]\n{d.page_content}")
            snippet_map[cid] = {
                "full": d.page_content.strip(),
                "source": src,
                "page": page,
            }
        st.session_state.setdefault("all_snippets", {}).update(snippet_map)
        return docs, snippet_map

    # -------- build messages  --------------------------------------
    def _build_messages(
        self,
        user_text  : str,
        docs       : List[Document],
        snippet_map: Dict[int, Dict],
        persona    : str | None,
    ) -> List:

        sys_prompt = (
        """
        You are Giulia’s friendly but meticulous law-exam assistant.

        GROUND RULES
        • For **legal facts** use, in order:
            1. Provided snippets [#n]
            2. Stored remember:/memo: facts
        • If the user asks about something they themselves said in
          the last few chat turns, answer from chat memory **without
          needing a citation**, even if no snippet matches.
        • Every sentence that states a legal rule, holding, statute
          section, date, or authority MUST end with its citation [#n].
        • If you can’t satisfy the above, reply exactly:
          “I don’t have enough information in the provided material to answer that.”
        """).strip()
        if persona: sys_prompt += f" Adopt persona: {persona}."

        messages: List = [SystemMessage(content=sys_prompt)]

        # (1) long-term summary
        messages.extend(self.memory.summary.load_memory_variables({}).get("history", []))

        # (2) document context snippets
        if snippet_map:
            joined = "\n\n".join(f"[#{cid}]\n{info['full']}" for cid,info in snippet_map.items())
            messages.append(SystemMessage(content=f"Context:\n{joined}"))

        # (3) last 8 chat turns  – put AFTER snippets so they outrank
        window_msgs = self.memory.window.load_memory_variables({}).get("history", [])
        messages.extend(window_msgs)

        # (4) remembered facts
        for fact in st.session_state.memory_facts:
            messages.append(SystemMessage(content=f"Remembered fact: {fact}"))
        for fact in st.session_state.session_facts:
            messages.append(SystemMessage(content=f"Session fact: {fact}"))

        # (5) current user question
        messages.append(HumanMessage(content=user_text))
        return messages

    # -------- helpers ----------------------------------------------
    def _assign_citation_id(self, src: str, page:int|None) -> int:
        key = (src, page)
        if key not in st.session_state.global_ids:
            st.session_state.global_ids[key] = st.session_state.next_id
            st.session_state.next_id += 1
        return st.session_state.global_ids[key]

    def _remember_fact(self, text:str, *, permanent:bool)->None:
        fact = text.split(":",1)[1].strip()
        bucket = "memory_facts" if permanent else "session_facts"
        st.session_state[bucket].append(fact)

    def _extract_citation_numbers(self, text:str)->List[int]:
        return sorted({int(n) for n in self.cfg.INLINE_RE.findall(text)})