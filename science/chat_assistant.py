"""Core retrieval-augmented generation workflow."""
from __future__ import annotations

import os
import re
from typing import Dict, List, Tuple

import streamlit as st
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from config import AppConfig
from science.memory_manager import MemoryManager


class ChatAssistant:
    """Turns user input → retrieved context → structured LLM answer."""

    def __init__(
        self,
        api_key: str,
        cfg: AppConfig,
        memory: MemoryManager,
        vector_store: FAISS,
    ):
        self.cfg = cfg
        self.memory = memory
        self.vector_store = vector_store
        self.llm = ChatOpenAI(api_key=api_key, model=cfg.LLM_MODEL, temperature=0.0)

    # ------------------------------------------------------------------ #
    # Public API                                                         #
    # ------------------------------------------------------------------ #
      
    # ------------------------------------------------------------------ #
    # NEW helper for “background:” turns
    # ------------------------------------------------------------------ 
    
    def _handle_background(self, text: str) -> Dict:
        """
        Respond with general knowledge.  No citations expected.
        """
        system = (
            "Background mode: you may answer from your general knowledge. "
            "Begin your response with **“Background (uncited):”**."
        )
        messages = [SystemMessage(content=system), HumanMessage(content=text)]
        response = self.llm.invoke(messages).content

        # ── ensure the prefix is actually bold ──────────────────────────
        plain_prefix = "Background (uncited):"
        if response.startswith(plain_prefix):
            response = f"**{plain_prefix}**" + response[len(plain_prefix):]
        elif response.lower().startswith(plain_prefix.lower()):
            # handle lowercase/language-model variations
            idx = len(plain_prefix)
            response = f"**{response[:idx]}**" + response[idx:]

        return {"speaker": "Assistant", "text": response, "snippets": {}}


    # ------------------------------------------------------------------ #
    # Replacement for handle_turn (add background support)
    # ------------------------------------------------------------------ #
    def handle_turn(
        self,
        user_text: str,
        sel_docs: List[str] | None = None,
        mode: str = "Prioritise (default)",
    ) -> Dict:
        low = user_text.lower()

        # 1️⃣ prefix commands ------------------------------------------------
        if low.startswith("remember:"):
            self._remember_fact(user_text, permanent=True)
            return {"speaker": "Assistant", "text": "✅ Fact remembered permanently."}

        if low.startswith("memo:"):
            self._remember_fact(user_text, permanent=False)
            return {"speaker": "Assistant", "text": "ℹ️ Session-only fact added."}

        if low.startswith("role:"):
            persona = user_text.split(":", 1)[1].strip()
            st.session_state.persona = persona
            return {"speaker": "Assistant", "text": f"👤 Persona set: {persona}"}

        if low.startswith("background:"):
            stripped = user_text.split(":", 1)[1].strip()
            return self._handle_background(stripped)

        # 2️⃣ strict-RAG retrieval ------------------------------------------
        docs, snippet_map = self._retrieve(user_text, sel_docs or [], mode)

        # guard when nothing to cite
        if not (docs or st.session_state.memory_facts or st.session_state.session_facts):
            return {
                "speaker": "Assistant",
                "text": (
                    "I don’t have enough information in the provided material to answer that.\n\n"
                    "(If you’d like general background on this topic, "
                    "type “background:” before your question.)"
                ),
            }

        print("🔹WINDOW right now:")
        for m in self.memory.window.load_memory_variables({}).get("history", []):
            who = "H" if isinstance(m, HumanMessage) else "A"
            print(f" {who:1}:", m.content[:60])
        print("🔹END WINDOW\n")


        # 3️⃣ build prompt & call LLM ---------------------------------------
        messages = self._build_messages(
            user_text=user_text,
            docs=docs,
            snippet_map=snippet_map,
            persona=st.session_state.persona,
        )

        # ─── DEBUG 2: what prompt are we about to send? ─────────────
        print("🔸PROMPT ORDER (top→bottom)")
        for i, m in enumerate(messages):
            tag = type(m).__name__[:2]
            print(f"{i:02d} {tag}: ", m.content.replace("\n", " ")[:70])
        print("🔸END PROMPT\n")


        response = self.llm.invoke(messages).content

        # 💾  store the pair so the next run can see it
        self.memory.save_turn(user_text, response)

        # now apply your citation-sanity block
        bad_cites = [
            n for n in self._extract_citation_numbers(response)
            if n not in st.session_state.get("all_snippets", {})
        ]

        current = st.session_state.active_class          # whichever class we’re in
        st.session_state.memory_buckets[current] = (
            self.memory.window,
            self.memory.summary,
        )

        if bad_cites or "[#]" in response:
            response = ("I don’t have enough information in the provided "
                        "material to answer that.")

        return {
            "speaker": "Assistant",
            "text": response,
            "snippets": snippet_map,
        }

    # ------------------------------------------------------------------ #
    # Retrieval + snippet handling                                       #
    # ------------------------------------------------------------------ #
    def _retrieve(
        self, query: str, sel_docs: List[str], mode: str
    ) -> Tuple[List[Document], Dict]:
        """Returns (docs, snippet_map)."""
        FIRST_K, FINAL_K, RELEVANCE_THRESHOLD = self.cfg.FIRST_K, self.cfg.FINAL_K, self.cfg.RELEVANCE_THRESHOLD

        full_ret = self.vector_store.as_retriever(
            search_kwargs={
                "k": FIRST_K,
                "score_threshold": RELEVANCE_THRESHOLD,   
            }
        )

        # optional filter retriever
        if sel_docs:
            sel_set = set(sel_docs)

            def _filt(meta):
                src = meta.get("source") or meta.get("file_path") or ""
                return os.path.basename(src) in sel_set

            focus_ret = self.vector_store.as_retriever(
                search_kwargs={
                    "k": FIRST_K,
                    "filter": _filt,
                    "score_threshold": RELEVANCE_THRESHOLD   
                }
            )
        else:
            focus_ret = None

        if mode.startswith("Only") and focus_ret:
            docs = focus_ret.invoke(query)
        elif mode.startswith("Prioritise") and focus_ret:
            primary = focus_ret.invoke(query)
            secondary = [
                d for d in full_ret.invoke(query) if d not in primary
            ][: max(0, FINAL_K - len(primary))]
            docs = primary + secondary
        else:
            docs = full_ret.invoke(query)

        snippet_map: Dict[int, Dict] = {}
        context_parts: List[str] = []

        for d in docs:
            file_name = os.path.basename(
                d.metadata.get("source") or d.metadata.get("file_path", "-unknown-")
            )
            page_num = d.metadata.get("page")
            cid = self._assign_citation_id(file_name, page_num)

            context_parts.append(f"[#{cid}]\n{d.page_content}")
            snippet_map[cid] = {
                "preview": re.sub(r"\s+", " ", d.page_content.strip())[:160] + "…",
                "full": d.page_content.strip(),
                "source": file_name,
                "page": page_num,
            }

        st.session_state.setdefault("all_snippets", {}).update(snippet_map)

        return docs, snippet_map
    

    # ------------------------------------------------------------------ #
    # Message construction                                               #
    # ------------------------------------------------------------------ #
    def _build_messages(
        self,
        user_text: str,
        docs: List[Document],
        snippet_map: Dict[int, Dict],
        persona: str | None,
    ):
        """Combine system prompt, memories, context, and user query."""
        sys_prompt = (
            """
            You are Giulia’s friendly but meticulous law-exam assistant.

            GROUND RULES
            • Your knowledge hierarchy:
              1. **Provided Snippets** [#n]
              2. **Stored facts** (remember:/memo:)
              3. Harmless public facts only if obvious.
            • Every sentence that states a legal rule, holding, statute section,
              date, or authority MUST end with its citation [#n].
            • If the answer isn’t in 1 or 2, reply exactly:
              “I don’t have enough information in the provided material to answer that.”
            • Cite ONLY snippets [#];  never cite the user’s chat or remembered facts.

            STYLE
            1. Open with one friendly line restating the question.
            2. Give a concise, logically structured answer.
            3. Explain jargon plainly.
            4. Peer-to-peer tone.

            (NO CITATION ⇒ NO CLAIM.)
            """

        ).strip()
        if persona:
            sys_prompt += f" Adopt persona: {persona}."

        messages = [SystemMessage(content=sys_prompt)]

        summary_text = self.memory.summary.load_memory_variables({}).get("history", "")
        # skip early-stage output that still contains raw prefixes
        if summary_text.startswith("Human:") or summary_text.startswith("AI:"):
            summary_text = ""

        if summary_text:
            messages.append(SystemMessage(content=summary_text))

        # context from docs
        if snippet_map:
            joined = "\n\n".join(
                f"[#{cid}]\n{info['full']}" for cid, info in snippet_map.items()
            )
            messages.append(SystemMessage(content=f"Context:\n{joined}"))

        # ---- recent 8-turn window  (freshest, so highest priority) ----
        window_msgs = self.memory.window.load_memory_variables({}).get("history", [])
        messages.extend(window_msgs)

        # stored facts
        for fact in st.session_state.memory_facts:
            messages.append(SystemMessage(content=f"Remembered fact: {fact}"))
        for fact in st.session_state.session_facts:
            messages.append(SystemMessage(content=f"Session fact: {fact}"))

        messages.append(HumanMessage(content=user_text))
        return messages

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #
    def _assign_citation_id(self, file_name: str, page: int | None) -> int:
        """Stable [#id] per (file,page) across the whole Streamlit session."""
        key = (file_name, page)
        if key not in st.session_state.global_ids:
            st.session_state.global_ids[key] = st.session_state.next_id
            st.session_state.next_id += 1
        return st.session_state.global_ids[key]

    def _remember_fact(self, user_text: str, *, permanent: bool) -> None:
        fact = user_text.split(":", 1)[1].strip()
        bucket = "memory_facts" if permanent else "session_facts"
        st.session_state[bucket].append(fact)

    def _extract_citation_numbers(self, text: str) -> List[int]:
        return sorted({int(n) for n in self.cfg.INLINE_RE.findall(text)})
