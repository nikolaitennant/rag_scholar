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
        collection: str = "database",
        class_id: str | None = None,
        user_id: str | None = None,
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
                # Enhance metadata with class assignment
                enhanced_metadata = doc.metadata.copy()
                if class_id:
                    enhanced_metadata["assigned_classes"] = [class_id]
                    logger.info(f"Assigning document {file_path.name} to class: {class_id}")
                else:
                    enhanced_metadata["assigned_classes"] = []
                    logger.info(f"Document {file_path.name} uploaded without class assignment")

                processed = self.processor.process_document(
                    content=doc.page_content,
                    source=file_path.name,
                    metadata=enhanced_metadata,
                )
                processed_docs.extend(processed.chunks)

            # Update vector store
            await self._update_index(collection, processed_docs, user_id)

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

    async def _update_index(self, collection: str, documents: list[Document], user_id: str | None = None):
        """Update vector store index."""

        index_dir = self.settings.index_dir / collection

        try:
            # Download existing index from cloud storage if available
            if self.cloud_storage.is_available():
                logger.info(f"Checking cloud storage for collection: {collection}")
                self.cloud_storage.download_index(collection, index_dir, user_id)

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
                upload_success = self.cloud_storage.upload_index(collection, index_dir, user_id)
                if upload_success:
                    logger.info(f"Successfully uploaded index for collection: {collection}")
                else:
                    logger.warning(f"Failed to upload index for collection: {collection}")

            # Update retrieval service
            self.retrieval_service.update_indexes(collection, documents, vector_store)

        except Exception as e:
            logger.error(f"Failed to update vector index: {type(e).__name__}: {e}")
            raise RuntimeError(f"Vector indexing failed: {e}") from e

    async def _rebuild_index(self, collection: str, documents: list[Document], user_id: str | None = None):
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
                    upload_success = self.cloud_storage.upload_index(collection, index_dir, user_id)
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

        # Always include database
        if "database" not in collections:
            collections.append("database")

        return sorted(collections)

    async def get_documents_from_vector_store(self, collection: str) -> list[dict[str, Any]]:
        """Get document IDs directly from the vector store metadata."""
        try:
            index_path = self.settings.index_dir / collection
            if not index_path.exists():
                return []

            # Load vector store to get document metadata
            vector_store = FAISS.load_local(
                str(index_path),
                self.embeddings,
                allow_dangerous_deserialization=True,
            )

            # Get all document metadata from the vector store
            # This is a workaround since FAISS doesn't expose metadata directly
            # We'll extract it by doing a very broad search
            docs = vector_store.similarity_search("", k=1000)  # Get many documents

            doc_map = {}
            for doc in docs:
                source = doc.metadata.get("source", "Unknown")
                doc_id = doc.metadata.get("doc_id", "")

                if source and doc_id and source not in doc_map:
                    doc_map[source] = doc_id

            return [{"filename": filename, "doc_id": doc_id} for filename, doc_id in doc_map.items()]

        except Exception as e:
            logger.error(f"Failed to get documents from vector store: {e}")
            return []

    async def list_documents(self, collection: str, class_id: str | None = None, user_id: str | None = None) -> list[dict[str, Any]]:
        """List documents in master collection, optionally filtered by class."""

        documents = []

        # Always use master "database" collection
        master_collection = "database"

        # Get real document IDs from vector store
        vector_docs = await self.get_documents_from_vector_store(master_collection)
        vector_doc_map = {doc["filename"]: doc["doc_id"] for doc in vector_docs}

        # Try to get documents from GCS first
        if self.cloud_storage and self.cloud_storage.is_available():
            try:
                path_prefix = self.cloud_storage.get_user_path_prefix(user_id)
                documents_bucket = self.cloud_storage.get_bucket('documents')

                if documents_bucket:
                    # List all documents in the master database collection
                    prefix = f"{path_prefix}{master_collection}/"
                    blobs = documents_bucket.list_blobs(prefix=prefix)

                    for blob in blobs:
                        if not blob.name.endswith('/'):  # Skip directories
                            filename = blob.name.split('/')[-1]  # Get just the filename

                            # Use real doc_id from vector store, fallback to generated one
                            doc_id = vector_doc_map.get(filename, hashlib.sha256(
                                f"{master_collection}:{filename}".encode()
                            ).hexdigest()[:16])

                            documents.append({
                                "id": doc_id,
                                "filename": filename,
                                "size": blob.size or 0,
                                "chunks": 0,  # Will be updated below
                                "status": "indexed",
                            })

                    logger.info(f"Found {len(documents)} documents in GCS database collection")

            except Exception as e:
                logger.error(f"Failed to list documents from GCS: {e}")

        # If no documents from GCS, try local fallback
        if not documents:
            collection_dir = self.settings.upload_dir / master_collection
            if collection_dir.exists():
                for file_path in collection_dir.iterdir():
                    if file_path.is_file():
                        filename = file_path.name

                        # Use real doc_id from vector store, fallback to generated one
                        doc_id = vector_doc_map.get(filename, hashlib.sha256(
                            f"{master_collection}:{filename}".encode()
                        ).hexdigest()[:16])

                        documents.append({
                            "id": doc_id,
                            "filename": filename,
                            "size": file_path.stat().st_size,
                            "chunks": 0,
                            "status": "indexed",
                        })

        # Get total chunks and distribute among files
        total_chunks = await self._get_collection_chunk_count(master_collection)
        if documents and total_chunks > 0:
            chunks_per_file = total_chunks // len(documents)
            remainder = total_chunks % len(documents)

            for i, doc in enumerate(documents):
                doc["chunks"] = chunks_per_file + (1 if i < remainder else 0)

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

    async def delete_document(self, collection: str, doc_id: str, user_id: str | None = None):
        """Delete a document from collection."""

        filename_found = None

        # First, try to find the document by checking GCS or local files
        # Check GCS first since that's where documents are primarily stored
        if self.cloud_storage and self.cloud_storage.is_available():
            try:
                path_prefix = self.cloud_storage.get_user_path_prefix(user_id)
                documents_bucket = self.cloud_storage.get_bucket('documents')

                if documents_bucket:
                    prefix = f"{path_prefix}{collection}/"
                    blobs = documents_bucket.list_blobs(prefix=prefix)

                    for blob in blobs:
                        if not blob.name.endswith('/'):  # Skip directories
                            filename = blob.name.split('/')[-1]  # Get just the filename

                            # Generate document ID to match
                            file_doc_id = hashlib.sha256(
                                f"{collection}:{filename}".encode()
                            ).hexdigest()[:16]

                            if file_doc_id == doc_id:
                                filename_found = filename
                                # Delete from GCS
                                blob.delete()
                                logger.info(f"Deleted document from GCS: {blob.name}")
                                break
            except Exception as e:
                logger.error(f"Failed to delete document from GCS: {e}")

        # Also try to delete from local storage if it exists
        collection_dir = self.settings.upload_dir / collection
        if collection_dir.exists():
            for file_path in collection_dir.iterdir():
                if file_path.is_file():
                    # Generate document ID to match
                    file_doc_id = hashlib.sha256(
                        f"{collection}:{file_path.name}".encode()
                    ).hexdigest()[:16]

                    if file_doc_id == doc_id:
                        filename_found = file_path.name
                        try:
                            file_path.unlink()  # Delete the physical file
                            logger.info(f"Deleted local file: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to delete local file {file_path}: {e}")
                        break

        # If no file was found anywhere, raise error
        if not filename_found:
            raise ValueError(f"Document {doc_id} not found in collection {collection}")

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

    async def assign_document_to_class(
        self,
        collection: str,
        doc_id: str,
        class_id: str,
        user_id: str | None = None,
    ) -> None:
        """Assign a document to a class by updating its metadata in the vector store."""

        # Find the document filename from doc_id
        filename_found = None

        # Check GCS first since that's where documents are primarily stored
        if self.cloud_storage and self.cloud_storage.is_available():
            try:
                path_prefix = self.cloud_storage.get_user_path_prefix(user_id)
                documents_bucket = self.cloud_storage.get_bucket('documents')

                if documents_bucket:
                    prefix = f"{path_prefix}{collection}/"
                    blobs = documents_bucket.list_blobs(prefix=prefix)

                    for blob in blobs:
                        if not blob.name.endswith('/'):  # Skip directories
                            filename = blob.name.split('/')[-1]  # Get just the filename

                            # Generate document ID to match
                            file_doc_id = hashlib.sha256(
                                f"{collection}:{filename}".encode()
                            ).hexdigest()[:16]

                            if file_doc_id == doc_id:
                                filename_found = filename
                                break
            except Exception as e:
                logger.error(f"Failed to find document in GCS: {e}")

        # Also check local storage if it exists
        if not filename_found:
            collection_dir = self.settings.upload_dir / collection
            if collection_dir.exists():
                for file_path in collection_dir.iterdir():
                    if file_path.is_file():
                        # Generate document ID to match
                        file_doc_id = hashlib.sha256(
                            f"{collection}:{file_path.name}".encode()
                        ).hexdigest()[:16]

                        if file_doc_id == doc_id:
                            filename_found = file_path.name
                            break

        # If no file was found anywhere, raise error
        if not filename_found:
            raise ValueError(f"Document {doc_id} not found in collection {collection}")

        logger.info(f"Assigning document {filename_found} (ID: {doc_id}) to class: {class_id}")

        # Reindex the collection to update metadata
        await self.reindex_collection_with_class_assignment(collection, filename_found, class_id)

    async def reindex_collection_with_class_assignment(
        self,
        collection: str,
        target_filename: str,
        new_class_id: str,
    ) -> None:
        """Reindex collection and assign a specific document to a class."""

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
                            # Process document with class assignment
                            for doc in documents:
                                enhanced_metadata = doc.metadata.copy()

                                # Assign class if this is the target document
                                if file_path.name == target_filename:
                                    enhanced_metadata["assigned_classes"] = [new_class_id]
                                    logger.info(f"Assigning document {file_path.name} to class: {new_class_id}")
                                else:
                                    # Keep existing class assignments for other documents
                                    enhanced_metadata["assigned_classes"] = enhanced_metadata.get("assigned_classes", [])

                                processed = self.processor.process_document(
                                    content=doc.page_content,
                                    source=file_path.name,
                                    metadata=enhanced_metadata,
                                )
                                all_documents.extend(processed.chunks)

                    except Exception as e:
                        logger.error(f"Failed to reindex {file_path}: {e}")

        # Rebuild index from scratch with updated metadata
        await self._rebuild_index(collection, all_documents)

    async def search(
        self,
        query: str,
        collection: str = "database",
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search documents in collection."""

        results = await self.retrieval_service.retrieve(
            query=query,
            collection=collection,
            k=limit,
        )

        return results
