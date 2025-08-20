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

# Custom robust PDF loader
class RobustPDFLoader:
    """A PDF loader that tries multiple methods and handles errors gracefully."""
    
    def __init__(self, file_path):
        self.file_path = file_path
    
    def load(self):
        """Try multiple PDF loading methods in order of preference."""
        from langchain.schema import Document
        
        # Method 1: Try PDFPlumber (most robust)
        try:
            from langchain_community.document_loaders import PDFPlumberLoader
            return PDFPlumberLoader(self.file_path).load()
        except Exception as e:
            print(f"  PDFPlumber failed: {str(e)[:50]}...")
        
        # Method 2: Try PyPDF with error handling
        try:
            import pypdf
            docs = []
            with open(self.file_path, 'rb') as file:
                reader = pypdf.PdfReader(file)
                for i, page in enumerate(reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():  # Only add non-empty pages
                            docs.append(Document(
                                page_content=text,
                                metadata={"source": self.file_path, "page": i}
                            ))
                    except Exception as page_error:
                        print(f"    Skipping page {i}: {str(page_error)[:30]}...")
                        continue
            if docs:
                return docs
        except Exception as e:
            print(f"  PyPDF failed: {str(e)[:50]}...")
        
        # Method 3: Last resort - try with PyMuPDF/fitz if available
        try:
            import fitz
            docs = []
            pdf_document = fitz.open(self.file_path)
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                text = page.get_text()
                if text.strip():
                    docs.append(Document(
                        page_content=text,
                        metadata={"source": self.file_path, "page": page_num}
                    ))
            pdf_document.close()
            if docs:
                return docs
        except Exception as e:
            print(f"  PyMuPDF failed: {str(e)[:50]}...")
        
        # If all methods fail, return empty list with warning
        print(f"  ⚠️ Could not load PDF: {self.file_path}")
        return []

PDF_LOADER = RobustPDFLoader

from config import AppConfig

@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder: str, api_key: str, version: str = "v3_robust") -> Tuple[List, FAISS | None]:
    """Load every file in `folder`, build a FAISS index, and cache the result."""
    print(f"📁 Loading documents from: {folder}")
    from .document_manager import DocumentManager  # local import to avoid cycle

    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            loader_cls = DocumentManager.LOADER_MAP.get(fname.rsplit(".", 1)[-1].lower())
            if loader_cls:
                print(f"  📄 Loading: {fname}")
                try:
                    docs.extend(loader_cls(os.path.join(folder, fname)).load())
                except Exception as e:
                    print(f"  ⚠️ Error loading {fname}: {str(e)[:100]}...")
                    # Skip problematic files rather than crashing
                    continue
    else:
        print(f"❌ Directory does not exist: {folder}")

    if not docs:
        print("❌ No documents loaded!")
        return [], None

    # Add chunking to break large documents into smaller pieces
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,  # reasonable chunk size
        chunk_overlap=200,  # some overlap for context
        separators=["\n\n", "\n", " ", ""]
    )
    chunked_docs = text_splitter.split_documents(docs)
    
    print(f"🔹 Original docs: {len(docs)}, After chunking: {len(chunked_docs)}")

    embeddings = OpenAIEmbeddings(api_key=api_key)

    return chunked_docs, FAISS.from_documents(chunked_docs, embeddings)

class DocumentManager:
    """Responsible for all document I/O and vector store lifecycle."""

    LOADER_MAP = {
        "pdf": PDF_LOADER,  # Uses PDFPlumberLoader if available, else PyPDFLoader
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
        print(f"🔍 Loading vector store for: {os.path.basename(ctx_dir)}")
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
        default_docs, default_idx = load_and_index_defaults(ctx_dir, self.api_key, "v3_robust")
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
        
        # Add chunking to uploaded files too
        if docs:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1200,
                chunk_overlap=200,
                separators=["\n\n", "\n", " ", ""]
            )
            docs = text_splitter.split_documents(docs)
        
        return docs


