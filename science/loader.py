"""Load local files or uploaded files into LangChain Documents."""
from pathlib import Path
from typing import List
import tempfile

from langchain.docstore.document import Document
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader, CSVLoader, TextLoader,
)

_EXT_MAP = {
    ".pdf":  PyPDFLoader,
    ".docx": Docx2txtLoader,
    ".doc":  UnstructuredWordDocumentLoader,
    ".pptx": UnstructuredPowerPointLoader,
    ".csv":  CSVLoader,
    ".txt":  TextLoader,
}

class DocumentLoader:
    """High‑level helper for turning files into Documents."""

    @staticmethod
    def load_folder(folder: str) -> List[Document]:
        """Load every supported file inside *folder*."""
        docs: List[Document] = []
        for path in Path(folder).glob("*"):
            loader_cls = _EXT_MAP.get(path.suffix.lower())
            if loader_cls:
                docs.extend(loader_cls(str(path)).load())
        return docs

    @staticmethod
    def load_uploads(uploaded_files) -> List[Document]:
        """Convert Streamlit uploads → Documents."""
        if not uploaded_files:
            return []
        temp_dir = Path(tempfile.mkdtemp())
        docs: List[Document] = []
        for uf in uploaded_files:
            target = temp_dir / uf.name
            target.write_bytes(uf.getbuffer())
            loader_cls = _EXT_MAP.get(target.suffix.lower())
            if loader_cls:
                docs.extend(loader_cls(str(target)).load())
        return docs