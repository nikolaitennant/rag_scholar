"""Manage FAISS vector stores for each class folder."""
from __future__ import annotations
import shutil, os
from pathlib import Path
from typing import Optional

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

from .config import CONFIG
from .loader import DocumentLoader

class VectorStoreManager:
    """Create, load and cache FAISS indexes."""

    _embeddings = OpenAIEmbeddings(api_key=CONFIG.api_key)

    def __init__(self, ctx_dir: str, index_dir: str, uploads):
        self.ctx_dir   = ctx_dir
        self.index_dir = index_dir
        self.uploads   = uploads

    # ------------------------------------------------------------------ #
    def load(self) -> FAISS:
        """Return a ready vector store, building it if missing/corrupt."""
        if self._exists():
            try:
                return FAISS.load_local(self.index_dir, self._embeddings, allow_dangerous_deserialization=True)
            except Exception:
                shutil.rmtree(self.index_dir, ignore_errors=True)
        return self._build()

    # ------------------------------------------------------------------ #
    def _exists(self) -> bool:
        base = Path(self.index_dir).name
        return (Path(self.index_dir) / f"{base}.faiss").is_file() and (Path(self.index_dir) / f"{base}.pkl").is_file()

    # ------------------------------------------------------------------ #
    def _build(self) -> FAISS:
        """Build a new FAISS index from ctx folder + any uploads."""
        docs_default = DocumentLoader.load_folder(self.ctx_dir)
        docs_uploads = DocumentLoader.load_uploads(self.uploads)
        docs = docs_default + docs_uploads
        if not docs:
            raise ValueError("No documents to index.")
        store = FAISS.from_documents(docs, self._embeddings)
        store.save_local(self.index_dir)
        return store