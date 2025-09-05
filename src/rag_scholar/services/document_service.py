"""Document management service."""

import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain.schema import Document
from langchain_community.document_loaders import (
    CSVLoader,
    Docx2txtLoader,
    PDFPlumberLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

from rag_scholar.config.settings import Settings
from rag_scholar.core.document_processor import DocumentProcessor
from rag_scholar.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document management and indexing."""
    
    def __init__(self, settings: Settings, retrieval_service: RetrievalService):
        self.settings = settings
        self.retrieval_service = retrieval_service
        self.processor = DocumentProcessor(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        self.embeddings = OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
        )
        
        # Configure loader map from settings
        self.loader_map = {
            ext: self._get_loader_class(ext) 
            for ext in settings.allowed_file_types
        }
    
    def _get_loader_class(self, extension: str):
        """Get loader class for file extension."""
        loader_map = {
            ".pdf": PDFPlumberLoader,
            ".docx": Docx2txtLoader,
            ".txt": TextLoader,
            ".md": UnstructuredMarkdownLoader,
            ".csv": CSVLoader,
        }
        return loader_map.get(extension)
    
    async def process_document(
        self,
        file_path: Path,
        collection: str = "default",
    ) -> Dict[str, Any]:
        """Process and index a document."""
        
        try:
            # Load document
            loader_class = self.loader_map.get(file_path.suffix.lower())
            if not loader_class:
                raise ValueError(f"Unsupported file type: {file_path.suffix}")
            
            loader = loader_class(str(file_path))
            documents = loader.load()
            
            if not documents:
                raise ValueError("No content extracted from document")
            
            # Process document
            processed_docs = []
            for doc in documents:
                processed = self.processor.process_document(
                    content=doc.page_content,
                    source=file_path.name,
                    metadata=doc.metadata,
                )
                processed_docs.extend(processed.chunks)
            
            # Update vector store
            await self._update_index(collection, processed_docs)
            
            # Generate document ID
            doc_id = hashlib.sha256(
                f"{collection}:{file_path.name}".encode()
            ).hexdigest()[:16]
            
            return {
                "doc_id": doc_id,
                "filename": file_path.name,
                "chunk_count": len(processed_docs),
                "status": "processed",
            }
        
        except Exception as e:
            logger.error(f"Failed to process document: {e}")
            raise
    
    async def _update_index(self, collection: str, documents: List[Document]):
        """Update vector store index."""
        
        index_dir = self.settings.index_dir / collection
        
        # Try to load existing index
        if index_dir.exists():
            try:
                vector_store = FAISS.load_local(
                    str(index_dir),
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                # Add new documents
                vector_store.add_documents(documents)
            except Exception:
                # Create new index if loading fails
                vector_store = FAISS.from_documents(documents, self.embeddings)
        else:
            # Create new index
            vector_store = FAISS.from_documents(documents, self.embeddings)
        
        # Save index
        index_dir.mkdir(parents=True, exist_ok=True)
        vector_store.save_local(str(index_dir))
        
        # Update retrieval service
        self.retrieval_service.update_indexes(collection, documents, vector_store)
    
    async def list_collections(self) -> List[str]:
        """List available collections."""
        
        collections = []
        
        # Check indexes directory
        if self.settings.index_dir.exists():
            for path in self.settings.index_dir.iterdir():
                if path.is_dir():
                    collections.append(path.name)
        
        # Always include default
        if "default" not in collections:
            collections.append("default")
        
        return sorted(collections)
    
    async def list_documents(self, collection: str) -> List[Dict[str, Any]]:
        """List documents in a collection."""
        
        documents = []
        collection_dir = self.settings.upload_dir / collection
        
        if collection_dir.exists():
            for file_path in collection_dir.iterdir():
                if file_path.is_file():
                    # Generate document ID
                    doc_id = hashlib.sha256(
                        f"{collection}:{file_path.name}".encode()
                    ).hexdigest()[:16]
                    
                    documents.append({
                        "id": doc_id,
                        "filename": file_path.name,
                        "size": file_path.stat().st_size,
                        "chunks": 0,  # TODO: Track this properly
                        "status": "indexed",
                    })
        
        return documents
    
    async def delete_document(self, collection: str, doc_id: str):
        """Delete a document from collection."""
        
        # TODO: Implement proper document deletion from index
        # This would require tracking document chunks in the index
        
        # For now, trigger a reindex
        await self.reindex_collection(collection)
    
    async def reindex_collection(self, collection: str) -> Dict[str, Any]:
        """Rebuild index for a collection."""
        
        collection_dir = self.settings.upload_dir / collection
        all_documents = []
        
        if collection_dir.exists():
            for file_path in collection_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in self.loader_map:
                    try:
                        result = await self.process_document(file_path, collection)
                        all_documents.extend(result.get("chunks", []))
                    except Exception as e:
                        logger.error(f"Failed to reindex {file_path}: {e}")
        
        # Get index size
        index_dir = self.settings.index_dir / collection
        index_size = 0
        if index_dir.exists():
            for file in index_dir.iterdir():
                if file.is_file():
                    index_size += file.stat().st_size
        
        return {
            "total_documents": len(list(collection_dir.iterdir())) if collection_dir.exists() else 0,
            "total_chunks": len(all_documents),
            "index_size_mb": index_size / (1024 * 1024),
            "last_updated": datetime.now().isoformat(),
        }
    
    async def search(
        self,
        query: str,
        collection: str = "default",
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Search documents in collection."""
        
        results = await self.retrieval_service.retrieve(
            query=query,
            collection=collection,
            k=limit,
        )
        
        return results