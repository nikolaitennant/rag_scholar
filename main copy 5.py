# ==================== file: config.py ====================
"""Configuration and constants for Giulia’s Law AI Assistant."""

from dataclasses import dataclass, field
import os
import re
import random
import time

@dataclass
class AppConfig:
    """Centralised configuration so magic numbers live in one place."""
    # Directories
    BASE_CTX_DIR: str = "classes_context"
    INDEX_PREFIX: str = "faiss_"

    # Retrieval
    FIRST_K: int = 30
    FINAL_K: int = 4

    # Models
    LLM_MODEL: str = "gpt-4.1-mini"
    SUMMARY_MODEL: str = "gpt-3.5-turbo-0125"

    # Memory
    SESSION_WINDOW: int = 8
    MAX_TOKEN_LIMIT: int = 800

    # UI & Vibe
    GREETING_COOLDOWN: int = 3600  # seconds
    TONES: tuple[str, ...] = ("funny", "snarky", "nice")

    # Regex
    INLINE_RE: re.Pattern = field(default_factory=lambda: re.compile(r"\[\s*#(\d+)\s*\]"))


# ==================== file: memory_manager.py ====================
"""Conversation memory wrapper around LangChain memories with Streamlit state."""
from __future__ import annotations
from typing import List

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


# ==================== file: document_manager.py ====================
"""Handles document loading, indexing, and FAISS persistence."""
from __future__ import annotations
import os
import shutil
import tempfile
from typing import List, Tuple

import streamlit as st
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    TextLoader,
    PyPDFLoader,
)

from config import AppConfig


class DocumentManager:
    """Responsible for all document I/O and vector store lifecycle."""

    LOADER_MAP = {
        "pdf": PyPDFLoader,
        "docx": Docx2txtLoader,
        "doc": UnstructuredWordDocumentLoader,
        "pptx": UnstructuredPowerPointLoader,
        "csv": CSVLoader,
        "txt": TextLoader,
    }

    def __init__(self, api_key: str, cfg: AppConfig):
        self.api_key = api_key
        self.cfg = cfg

    # ------------------------------------------------------------------ #
    # Public API                                                         #
    # ------------------------------------------------------------------ #
    def get_active_class_dirs(self, active_class: str) -> Tuple[str, str]:
        ctx_dir = os.path.join(self.cfg.BASE_CTX_DIR, active_class)
        idx_dir = f"{self.cfg.INDEX_PREFIX}{active_class}"
        return ctx_dir, idx_dir

    def list_class_folders(self) -> List[str]:
        return sorted(
            d
            for d in os.listdir(self.cfg.BASE_CTX_DIR)
            if os.path.isdir(os.path.join(self.cfg.BASE_CTX_DIR, d))
        )

    # ............................ retrieval helpers ............................
    @st.cache_resource(show_spinner=False)
    def _load_and_index_defaults(self, folder: str):
        docs = []
        if os.path.exists(folder):
            for fname in os.listdir(folder):
                loader = self._pick_loader(os.path.join(folder, fname))
                if loader:
                    docs.extend(loader.load())

        if not docs:
            return [], None

        index = FAISS.from_documents(docs, OpenAIEmbeddings(api_key=self.api_key))
        return docs, index

    def ensure_vector_store(self, ctx_dir: str, idx_dir: str, uploaded_docs) -> FAISS:
        """Return a FAISS index (loading or rebuilding as needed)."""
        embeddings = OpenAIEmbeddings(api_key=self.api_key)
        bin_path = os.path.join(idx_dir, f"{os.path.basename(idx_dir)}.faiss")
        pkl_path = os.path.join(idx_dir, f"{os.path.basename(idx_dir)}.pkl")

        def _exists() -> bool:
            return os.path.isfile(bin_path) and os.path.isfile(pkl_path)

        # Try fast path
        if _exists():
            try:
                return FAISS.load_local(idx_dir, embeddings, allow_dangerous_deserialization=True)
            except Exception:
                shutil.rmtree(idx_dir, ignore_errors=True)  # force rebuild if corrupted

        # Build from scratch
        default_docs, default_idx = self._load_and_index_defaults(ctx_dir)
        session_docs = self._load_uploaded_files(uploaded_docs)

        if default_idx and session_docs:
            vector_store = FAISS.from_documents(
                default_docs + session_docs, embeddings
            )
        elif default_idx:
            vector_store = default_idx
        elif session_docs:
            vector_store = FAISS.from_documents(session_docs, embeddings)
        else:
            st.error("⚠️ This class has no documents yet. Upload something first.")
            st.stop()

        vector_store.save_local(idx_dir)
        return vector_store

    # ------------------------------------------------------------------ #
    # Internal helpers                                                   #
    # ------------------------------------------------------------------ #
    def _pick_loader(self, path: str):
        ext = os.path.splitext(path)[1].lower().lstrip(".")
        loader_cls = self.LOADER_MAP.get(ext)
        return loader_cls(path) if loader_cls else None

    def _load_uploaded_files(self, uploaded_files) -> List:
        if not uploaded_files:
            return []
        tmp = tempfile.mkdtemp()
        docs = []
        for f in uploaded_files:
            ext = f.name.rsplit(".", 1)[-1].lower()
            if ext not in self.LOADER_MAP:
                continue
            fp = os.path.join(tmp, f.name)
            with open(fp, "wb") as out:
                out.write(f.getbuffer())
            loader = self.LOADER_MAP[ext](fp)
            docs.extend(loader.load())
        return docs


# ==================== file: chat_assistant.py ====================
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
from memory_manager import MemoryManager


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
    def handle_turn(
        self,
        user_text: str,
        sel_docs: List[str] | None = None,
        mode: str = "Prioritise (default)",
    ) -> Dict:
        """
        Main entry: process a user message.

        Returns a dict ready to append to `st.session_state.chat_history`::

            {
              "speaker": "Assistant",
              "text": "... response ...",
              "snippets": {id: {...}}
            }
        """
        low = user_text.lower()

        # .........................................
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

        # .........................................
        # Retrieval + LLM branch
        docs, snippet_map = self._retrieve(user_text, sel_docs or [], mode)
        if not (docs or st.session_state.memory_facts or st.session_state.session_facts):
            return {"speaker": "Assistant", "text": "I don’t have enough information in the provided material to answer that."}

        messages = self._build_messages(
            user_text=user_text,
            docs=docs,
            snippet_map=snippet_map,
            persona=st.session_state.persona,
        )

        response = self.llm.invoke(messages).content
        bad_cites = [n for n in self._extract_citation_numbers(response) if n not in snippet_map]
        if bad_cites:
            response = "I can’t find the sources for some citations, so I can’t answer that."

        # push to memories
        self.memory.save_turn(user_text, response)

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
        FIRST_K, FINAL_K = self.cfg.FIRST_K, self.cfg.FINAL_K
        full_ret = self.vector_store.as_retriever(search_kwargs={"k": FIRST_K})

        # optional filter retriever
        if sel_docs:
            sel_set = set(sel_docs)

            def _filt(meta: dict) -> bool:
                src = meta.get("source") or meta.get("file_path") or ""
                return os.path.basename(src) in sel_set

            focus_ret = self.vector_store.as_retriever(
                search_kwargs={"k": FIRST_K, "filter": _filt}
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
            • Cite ONLY snippets [#] (never user chat or remembered facts).

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

        # recent chat window
        messages.extend(
            self.memory.window.load_memory_variables({}).get("history", [])
        )
        # long-term summary
        messages.extend(
            self.memory.summary.load_memory_variables({}).get("history", [])
        )

        # context from docs
        if snippet_map:
            joined = "\n\n".join(
                f"[#{cid}]\n{info['full']}" for cid, info in snippet_map.items()
            )
            messages.append(SystemMessage(content=f"Context:\n{joined}"))

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


# ==================== file: app.py ====================
"""
Minimal Streamlit bootstrap that ties all the classes together.

Put `streamlit run app.py` in your terminal and you're off!
"""
from dotenv import load_dotenv
import streamlit as st
from openai import OpenAI

from config import AppConfig
from document_manager import DocumentManager
from memory_manager import MemoryManager
from document_manager import ChatAssistant

# 1️⃣  Init
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY") or ""
if not api_key:
    st.error("OPENAI_API_KEY not set in environment.")
    st.stop()

cfg = AppConfig()
doc_mgr = DocumentManager(api_key, cfg)
mem_mgr = MemoryManager(api_key, cfg)

# 2️⃣  Sidebar – class picker & uploads (ultra-light version)
st.sidebar.title("📂 Class")
class_folders = doc_mgr.list_class_folders()
if not class_folders:
    st.sidebar.warning(f"Add folders inside {cfg.BASE_CTX_DIR} to get started.")
    st.stop()

active_class = st.sidebar.selectbox("Choose class / module", class_folders)
ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)

uploaded_docs = st.sidebar.file_uploader(
    "Upload docs", type=list(DocumentManager.LOADER_MAP.keys()), accept_multiple_files=True
)

# 3️⃣  Ensure vector store
vector_store = doc_mgr.ensure_vector_store(ctx_dir, idx_dir, uploaded_docs)

# 4️⃣  Main chat UI
st.title("⚖️  Giulia's Law AI Assistant (OOP)")

assistant = ChatAssistant(api_key, cfg, mem_mgr, vector_store)

user_q = st.chat_input("Ask a question…")
if user_q:
    # (for brevity the demo leaves doc-filtering UI out)
    reply = assistant.handle_turn(user_q)
    st.session_state.chat_history.append({"speaker": "User", "text": user_q})
    st.session_state.chat_history.append(reply)

# 5️⃣  Render chat history
for entry in st.session_state.chat_history:
    if entry["speaker"] == "User":
        st.chat_message("user").write(entry["text"])
    else:
        st.chat_message("assistant").markdown(entry["text"])
        cites = assistant._extract_citation_numbers(entry["text"])
        if cites:
            with st.expander("Sources", expanded=False):
                for n in cites:
                    s = entry.get("snippets", {}).get(n)
                    if not s:
                        continue
                    page = f"p.{s['page']+1}" if s['page'] is not None else ""
                    st.markdown(
                        f"**[#{n}]** – {s['source']} {page}\n\n> {s['preview']}",
                        unsafe_allow_html=True,
                    )
            
