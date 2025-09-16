"""Document management service."""

import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

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
from rag_scholar.services.cloud_storage import CloudStorageService
from rag_scholar.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document management and indexing."""

    def __init__(self, settings: Settings, retrieval_service: RetrievalService):
        self.settings = settings
        self.retrieval_service = retrieval_service
        self.cloud_storage = CloudStorageService(settings)
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
            ext: self._get_loader_class(ext) for ext in settings.allowed_file_types
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
    ) -> dict[str, Any]:
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
            logger.error(f"Failed to process document {file_path.name}: {type(e).__name__}: {e}")
            raise RuntimeError(f"Document processing failed: {e}") from e

    async def _update_index(self, collection: str, documents: list[Document]):
        """Update vector store index."""

        index_dir = self.settings.index_dir / collection

        try:
            # Download existing index from cloud storage if available
            if self.cloud_storage.is_available():
                logger.info(f"Checking cloud storage for collection: {collection}")
                self.cloud_storage.download_index(collection, index_dir)

            # Try to load existing index
            if index_dir.exists():
                try:
                    vector_store = FAISS.load_local(
                        str(index_dir),
                        self.embeddings,
                        allow_dangerous_deserialization=True,
                    )
                    # Add new documents
                    logger.info(f"Adding {len(documents)} documents to existing index")
                    vector_store.add_documents(documents)
                except Exception as e:
                    # Create new index if loading fails
                    logger.warning(f"Failed to load existing index: {e}, creating new one")
                    vector_store = FAISS.from_documents(documents, self.embeddings)
            else:
                # Create new index
                logger.info(f"Creating new index with {len(documents)} documents")
                vector_store = FAISS.from_documents(documents, self.embeddings)

            # Save index locally
            index_dir.mkdir(parents=True, exist_ok=True)
            vector_store.save_local(str(index_dir))
            logger.info(f"Saved vector store to {index_dir}")

            # Upload to cloud storage if available
            if self.cloud_storage.is_available():
                logger.info(f"Uploading index to cloud storage for collection: {collection}")
                upload_success = self.cloud_storage.upload_index(collection, index_dir)
                if upload_success:
                    logger.info(f"Successfully uploaded index for collection: {collection}")
                else:
                    logger.warning(f"Failed to upload index for collection: {collection}")

            # Update retrieval service
            self.retrieval_service.update_indexes(collection, documents, vector_store)

        except Exception as e:
            logger.error(f"Failed to update vector index: {type(e).__name__}: {e}")
            raise RuntimeError(f"Vector indexing failed: {e}") from e

    async def _rebuild_index(self, collection: str, documents: list[Document]):
        """Rebuild vector store index from scratch, removing all existing data."""

        index_dir = self.settings.index_dir / collection

        try:
            # Remove existing index directory completely
            if index_dir.exists():
                import shutil
                shutil.rmtree(index_dir)
                logger.info(f"Removed existing index directory: {index_dir}")

            # Create new index from documents
            if documents:
                logger.info(f"Creating new index with {len(documents)} documents")
                vector_store = FAISS.from_documents(documents, self.embeddings)

                # Save index locally
                index_dir.mkdir(parents=True, exist_ok=True)
                vector_store.save_local(str(index_dir))
                logger.info(f"Saved new vector store to {index_dir}")

                # Upload to cloud storage if available
                if self.cloud_storage.is_available():
                    logger.info(f"Uploading rebuilt index to cloud storage for collection: {collection}")
                    upload_success = self.cloud_storage.upload_index(collection, index_dir)
                    if upload_success:
                        logger.info(f"Successfully uploaded rebuilt index for collection: {collection}")
                    else:
                        logger.warning(f"Failed to upload rebuilt index for collection: {collection}")

                # Update retrieval service
                self.retrieval_service.update_indexes(collection, documents, vector_store)
            else:
                logger.info(f"No documents to index for collection: {collection}")
                # Clear the retrieval service cache for this collection
                if collection in self.retrieval_service.vector_stores:
                    del self.retrieval_service.vector_stores[collection]
                if collection in self.retrieval_service.bm25_indexes:
                    del self.retrieval_service.bm25_indexes[collection]
                if collection in self.retrieval_service.document_cache:
                    del self.retrieval_service.document_cache[collection]

        except Exception as e:
            logger.error(f"Failed to rebuild vector index: {type(e).__name__}: {e}")
            raise RuntimeError(f"Vector index rebuild failed: {e}") from e

    async def list_collections(self) -> list[str]:
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

    async def list_documents(self, collection: str) -> list[dict[str, Any]]:
        """List documents in a collection."""

        documents = []
        collection_dir = self.settings.upload_dir / collection

        # Get total chunks from vector store
        total_chunks = await self._get_collection_chunk_count(collection)

        if collection_dir.exists():
            file_count = sum(1 for path in collection_dir.iterdir() if path.is_file())

            for file_path in collection_dir.iterdir():
                if file_path.is_file():
                    # Generate document ID
                    doc_id = hashlib.sha256(
                        f"{collection}:{file_path.name}".encode()
                    ).hexdigest()[:16]

                    # Estimate chunks per file (total chunks / number of files)
                    # This is an approximation since we don't track per-file chunks
                    chunks_per_file = total_chunks // file_count if file_count > 0 else 0
                    if total_chunks % file_count != 0 and file_count > 0:
                        chunks_per_file += 1  # Add remainder to first file

                    documents.append(
                        {
                            "id": doc_id,
                            "filename": file_path.name,
                            "size": file_path.stat().st_size,
                            "chunks": chunks_per_file,
                            "status": "indexed",
                        }
                    )

        return documents

    async def _get_collection_chunk_count(self, collection: str) -> int:
        """Get total number of chunks in a collection from the vector store."""
        try:
            from langchain_community.vectorstores import FAISS
            from langchain_openai import OpenAIEmbeddings

            index_path = self.settings.index_dir / collection

            if index_path.exists():
                embeddings = OpenAIEmbeddings(
                    api_key=self.settings.openai_api_key,
                    model=self.settings.embedding_model,
                )

                vector_store = FAISS.load_local(
                    str(index_path),
                    embeddings,
                    allow_dangerous_deserialization=True,
                )

                return vector_store.index.ntotal

        except Exception as e:
            logger.warning(f"Could not get chunk count for collection {collection}: {e}")

        return 0

    async def delete_document(self, collection: str, doc_id: str):
        """Delete a document from collection."""

        collection_dir = self.settings.upload_dir / collection

        # Find and delete the physical file
        if collection_dir.exists():
            for file_path in collection_dir.iterdir():
                if file_path.is_file():
                    # Generate document ID to match
                    file_doc_id = hashlib.sha256(
                        f"{collection}:{file_path.name}".encode()
                    ).hexdigest()[:16]

                    if file_doc_id == doc_id:
                        try:
                            file_path.unlink()  # Delete the physical file
                            logger.info(f"Deleted file: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to delete file {file_path}: {e}")
                            raise
                        break
            else:
                raise ValueError(
                    f"Document {doc_id} not found in collection {collection}"
                )
        else:
            raise ValueError(f"Collection {collection} not found")

        # Rebuild the index to remove document chunks
        await self.reindex_collection(collection)

    async def reindex_collection(self, collection: str) -> dict[str, Any]:
        """Rebuild index for a collection from scratch."""

        collection_dir = self.settings.upload_dir / collection
        all_documents = []

        if collection_dir.exists():
            for file_path in collection_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in self.loader_map:
                    try:
                        # Load document
                        loader_class = self.loader_map.get(file_path.suffix.lower())
                        loader = loader_class(str(file_path))
                        documents = loader.load()

                        if documents:
                            # Process document
                            for doc in documents:
                                processed = self.processor.process_document(
                                    content=doc.page_content,
                                    source=file_path.name,
                                    metadata=doc.metadata,
                                )
                                all_documents.extend(processed.chunks)

                    except Exception as e:
                        logger.error(f"Failed to reindex {file_path}: {e}")

        # Rebuild index from scratch
        await self._rebuild_index(collection, all_documents)

        # Get index size
        index_dir = self.settings.index_dir / collection
        index_size = 0
        if index_dir.exists():
            for file in index_dir.iterdir():
                if file.is_file():
                    index_size += file.stat().st_size

        return {
            "total_documents": len([f for f in collection_dir.iterdir() if f.is_file()])
            if collection_dir.exists()
            else 0,
            "total_chunks": len(all_documents),
            "index_size_mb": index_size / (1024 * 1024),
            "last_updated": datetime.now().isoformat(),
        }

    async def search(
        self,
        query: str,
        collection: str = "default",
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search documents in collection."""

        results = await self.retrieval_service.retrieve(
            query=query,
            collection=collection,
            k=limit,
        )

        return results
