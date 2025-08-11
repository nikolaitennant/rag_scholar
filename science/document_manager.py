"""Handles document loading, indexing, and FAISS persistence."""
from __future__ import annotations
import os
import shutil
import tempfile
from typing import List, Tuple

from openai import api_key
import streamlit as st
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    TextLoader,
    PyPDFLoader,
)

from config import AppConfig

@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder: str, api_key: str, version: str = "v2_chunked") -> Tuple[List, FAISS | None]:
    """Load every file in `folder`, build a FAISS index, and cache the result."""
    from .document_manager import DocumentManager  # local import to avoid cycle

    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            loader_cls = DocumentManager.LOADER_MAP.get(fname.rsplit(".", 1)[-1].lower())
            if loader_cls:
                docs.extend(loader_cls(os.path.join(folder, fname)).load())

    if not docs:
        return [], None

    # Add chunking to break large documents into smaller pieces
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,  # reasonable chunk size
        chunk_overlap=200,  # some overlap for context
        separators=["\n\n", "\n", " ", ""]
    )
    chunked_docs = text_splitter.split_documents(docs)

    embeddings = OpenAIEmbeddings(api_key=api_key)

    return chunked_docs, FAISS.from_documents(chunked_docs, embeddings)

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
        default_docs, default_idx = load_and_index_defaults(ctx_dir, self.api_key, "v2_chunked")
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


