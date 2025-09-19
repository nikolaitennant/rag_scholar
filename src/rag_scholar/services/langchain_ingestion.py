"""LangChain-based document ingestion pipeline."""

import structlog
from pathlib import Path
from typing import List

from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    CSVLoader,
    GCSFileLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_firestore import FirestoreVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

logger = structlog.get_logger()


class LangChainIngestionPipeline:
    """Pure LangChain document ingestion pipeline."""

    def __init__(self, settings):
        self.settings = settings

        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
        )

        # Initialize Firestore client for persistence
        from google.cloud import firestore
        self.firestore_client = firestore.AsyncClient(project=settings.google_cloud_project)

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\\n\\n", "\\n", " ", ""],
        )

        # Loader mapping
        self.loader_map = {
            ".pdf": PyPDFLoader,
            ".docx": Docx2txtLoader,
            ".txt": TextLoader,
            ".md": UnstructuredMarkdownLoader,
            ".csv": CSVLoader,
        }

    async def ingest_file(
        self,
        file_path: Path,
        user_id: str,
        class_id: str | None = None,
        collection: str = "master"
    ) -> dict:
        """Ingest a single file using LangChain loaders."""

        try:
            # Get appropriate loader
            file_extension = file_path.suffix.lower()
            loader_class = self.loader_map.get(file_extension)

            if not loader_class:
                raise ValueError(f"Unsupported file type: {file_extension}")

            # Load document
            loader = loader_class(str(file_path))
            documents = loader.load()

            if not documents:
                raise ValueError("No content extracted from document")

            # Add metadata
            for doc in documents:
                doc.metadata.update({
                    "source": file_path.name,
                    "user_id": user_id,
                    "assigned_classes": [class_id] if class_id else [],
                    "file_type": file_extension,
                })

            # Split documents
            split_docs = self.text_splitter.split_documents(documents)

            # Get vector store
            vector_store = self._get_vector_store(user_id)

            # Add to vector store
            await vector_store.aadd_documents(split_docs)

            logger.info("Document ingested successfully",
                       file=file_path.name,
                       user_id=user_id,
                       chunks=len(split_docs),
                       class_id=class_id)

            return {
                "filename": file_path.name,
                "chunks": len(split_docs),
                "status": "success",
                "class_id": class_id
            }

        except Exception as e:
            logger.error("Document ingestion failed",
                        file=file_path.name,
                        user_id=user_id,
                        error=str(e))
            raise

    async def ingest_from_gcs(
        self,
        gcs_path: str,
        user_id: str,
        class_id: str | None = None,
    ) -> dict:
        """Ingest document directly from Google Cloud Storage."""

        try:
            # Use GCS loader
            loader = GCSFileLoader(
                project_name=self.settings.google_cloud_project,
                bucket=self.settings.documents_bucket,
                blob=gcs_path
            )

            documents = loader.load()

            if not documents:
                raise ValueError("No content extracted from GCS document")

            # Add metadata
            for doc in documents:
                doc.metadata.update({
                    "source": Path(gcs_path).name,
                    "user_id": user_id,
                    "assigned_classes": [class_id] if class_id else [],
                    "gcs_path": gcs_path,
                })

            # Split and index
            split_docs = self.text_splitter.split_documents(documents)
            vector_store = self._get_vector_store(user_id)
            await vector_store.aadd_documents(split_docs)

            logger.info("GCS document ingested successfully",
                       gcs_path=gcs_path,
                       user_id=user_id,
                       chunks=len(split_docs))

            return {
                "filename": Path(gcs_path).name,
                "chunks": len(split_docs),
                "status": "success",
                "class_id": class_id
            }

        except Exception as e:
            logger.error("GCS ingestion failed",
                        gcs_path=gcs_path,
                        user_id=user_id,
                        error=str(e))
            raise

    async def update_document_class(
        self,
        document_source: str,
        user_id: str,
        class_id: str,
        operation: str = "add"  # "add" or "remove"
    ) -> bool:
        """Update class assignment for document chunks."""

        try:
            from google.cloud import firestore

            # Direct Firestore metadata update
            db = firestore.Client(project=self.settings.google_cloud_project)

            # Query documents by source using proper subcollection structure
            docs_ref = db.collection("users").document(user_id).collection("chunks").where("metadata.source", "==", document_source)
            docs = docs_ref.get()

            logger.info("Debug: update_document_class",
                       document_source=document_source,
                       user_id=user_id,
                       class_id=class_id,
                       operation=operation,
                       docs_found=len(docs))

            for doc in docs:
                data = doc.to_dict()
                metadata = data.get("metadata", {})
                assigned_classes = metadata.get("assigned_classes", [])

                logger.info("Debug: Before update",
                           doc_id=doc.id,
                           current_assigned_classes=assigned_classes,
                           metadata_keys=list(metadata.keys()) if metadata else [])

                # For ADD: add to all chunks regardless of current state (ensures consistency)
                # For REMOVE: remove from all chunks that have it (ensures consistency)
                if operation == "add":
                    if class_id not in assigned_classes:
                        assigned_classes.append(class_id)
                elif operation == "remove":
                    # Remove ALL instances of the class_id (in case of duplicates)
                    assigned_classes = [cls for cls in assigned_classes if cls != class_id]

                logger.info("Debug: After update logic",
                           doc_id=doc.id,
                           new_assigned_classes=assigned_classes)

                # Update the document
                doc.reference.update({
                    "metadata.assigned_classes": assigned_classes
                })

                logger.info("Debug: Updated document",
                           doc_id=doc.id,
                           final_assigned_classes=assigned_classes)

            logger.info("Document class updated successfully",
                       document=document_source,
                       user_id=user_id,
                       class_id=class_id,
                       operation=operation,
                       updated_docs=len(docs))

            return True

        except Exception as e:
            logger.error("Class update failed",
                        document=document_source,
                        user_id=user_id,
                        error=str(e))
            return False

    async def search_documents(
        self,
        query: str,
        user_id: str,
        class_id: str | None = None,
        k: int = 5
    ) -> list[dict]:
        """Search documents using FirestoreVectorStore similarity_search."""

        try:
            # FirestoreVectorStore filter doesn't work properly, so we implement manual filtering
            if class_id:
                logger.info("Applying manual class filtering (FirestoreVectorStore filter broken)",
                           class_id=class_id,
                           user_id=user_id)

                # Get embeddings for the query
                query_embedding = self.embeddings.embed_query(query)

                # Direct Firestore query with proper filtering
                from google.cloud import firestore
                import numpy as np

                db = firestore.Client(project=self.settings.google_cloud_project)


                # First check what class IDs actually exist in documents
                all_docs_sample = db.collection("users").document(user_id).collection("chunks").limit(3).get()
                existing_classes = set()
                for doc in all_docs_sample:
                    doc_data = doc.to_dict()
                    classes = doc_data.get('metadata', {}).get('assigned_classes', [])
                    existing_classes.update(classes)

                logger.info("Debug: Existing class IDs in documents",
                           looking_for=class_id,
                           existing_classes=list(existing_classes),
                           user_id=user_id)

                # Query documents that contain the class using proper subcollection structure
                docs_ref = db.collection("users").document(user_id).collection("chunks").where(
                    "metadata.assigned_classes", "array_contains", class_id
                )

                # Limit to reasonable number for similarity calculation
                docs = docs_ref.limit(100).get()

                logger.info("Manual filter results",
                           class_id=class_id,
                           docs_found=len(docs),
                           user_id=user_id)

                if not docs:
                    logger.info("No documents found in specified class",
                               query=query[:50],
                               user_id=user_id,
                               class_id=class_id)
                    return []

                # Calculate similarities manually
                scored_results = []
                docs_with_embeddings = 0
                docs_without_embeddings = 0
                for i, doc in enumerate(docs):
                    data = doc.to_dict()

                    # Try multiple locations for embeddings
                    doc_embedding = (
                        data.get("embedding") or  # Direct embedding field (Firestore)
                        data.get("metadata", {}).get("embedding")  # Nested in metadata
                    )

                    # Debug first few documents
                    if i < 3:
                        embedding_length = None
                        if doc_embedding:
                            try:
                                embedding_length = len(doc_embedding)
                            except:
                                try:
                                    embedding_array = np.array(doc_embedding)
                                    embedding_length = embedding_array.shape[0] if embedding_array.ndim > 0 else None
                                except:
                                    embedding_length = "unknown"

                        logger.info("Debug document structure",
                                   doc_index=i,
                                   has_embedding=bool(doc_embedding),
                                   embedding_type=type(doc_embedding).__name__ if doc_embedding else None,
                                   embedding_length=embedding_length,
                                   all_keys=list(data.keys()),
                                   metadata_keys=list(data.get("metadata", {}).keys()),
                                   content_preview=data.get("content", data.get("page_content", ""))[:100])

                    # Handle both list embeddings and Firestore Vector type
                    if doc_embedding:
                        try:
                            # Try to convert to numpy array - this handles both lists and Firestore Vectors
                            doc_emb_array = np.array(doc_embedding)
                            if doc_emb_array.ndim > 0 and doc_emb_array.shape[0] > 0:
                                docs_with_embeddings += 1
                                # Calculate cosine similarity
                                query_emb_array = np.array(query_embedding)

                                # Cosine similarity
                                dot_product = np.dot(query_emb_array, doc_emb_array)
                                norm_query = np.linalg.norm(query_emb_array)
                                norm_doc = np.linalg.norm(doc_emb_array)

                                if norm_query > 0 and norm_doc > 0:
                                    similarity = dot_product / (norm_query * norm_doc)

                                    scored_results.append({
                                        "content": data.get("content", data.get("page_content", "")),
                                        "source": data.get("metadata", {}).get("source", "Unknown"),
                                        "score": float(similarity),
                                        "metadata": data.get("metadata", {})
                                    })
                        except Exception as e:
                            logger.warning("Failed to process embedding",
                                         doc_index=i,
                                         error=str(e),
                                         embedding_type=type(doc_embedding).__name__)
                    else:
                        docs_without_embeddings += 1

                # Sort by similarity score and take top k
                scored_results.sort(key=lambda x: x["score"], reverse=True)
                scored_results = scored_results[:k]

                logger.info("Manual similarity calculation completed",
                           query=query[:50],
                           user_id=user_id,
                           class_id=class_id,
                           total_docs=len(docs),
                           docs_with_embeddings=docs_with_embeddings,
                           docs_without_embeddings=docs_without_embeddings,
                           results_count=len(scored_results))

                return scored_results

            else:
                # Only search all documents if no class is specified
                vector_store = self._get_vector_store(user_id)
                results = vector_store.similarity_search(query, k=k)

            # Convert LangChain results to standard format for non-class searches
            scored_results = []
            for i, doc in enumerate(results):
                scored_results.append({
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "Unknown"),
                    "score": 1.0 - (i * 0.1),  # Simple relevance approximation
                    "metadata": doc.metadata
                })

            logger.info("Document search completed",
                       query=query[:50],
                       user_id=user_id,
                       class_id=class_id,
                       results_count=len(scored_results))

            return scored_results

        except Exception as e:
            logger.error("Document search failed",
                        query=query,
                        user_id=user_id,
                        class_id=class_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return []

    async def ingest_document(
        self,
        file_content: bytes,
        filename: str,
        collection: str = "database",
        metadata: dict | None = None
    ) -> dict:
        """Ingest document from uploaded file content."""
        import tempfile

        try:
            # Get file extension
            file_extension = f".{filename.split('.')[-1].lower()}" if filename else ""
            loader_class = self.loader_map.get(file_extension)

            if not loader_class:
                raise ValueError(f"Unsupported file type: {file_extension}")

            # Save to temp file for loader
            with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = Path(temp_file.name)

            try:
                # Load document
                loader = loader_class(str(temp_path))
                documents = loader.load()

                if not documents:
                    raise ValueError("No content extracted from document")

                # Add metadata
                document_id = f"{metadata.get('uploaded_by') if metadata else 'unknown'}_{filename}_{len(documents)}"

                for doc in documents:
                    doc.metadata.update({
                        "source": filename,
                        "document_id": document_id,
                        "file_type": file_extension,
                        "assigned_classes": [],  # Empty by default, can be updated later
                        "upload_date": "now",  # Could use proper timestamp
                    })
                    if metadata:
                        doc.metadata.update(metadata)

                # Split documents
                split_docs = self.text_splitter.split_documents(documents)

                # Get vector store for user
                user_id = metadata.get("uploaded_by") if metadata else None
                if not user_id:
                    raise ValueError("User ID required in metadata")

                vector_store = self._get_vector_store(user_id)

                # Add to vector store
                await vector_store.aadd_documents(split_docs)

                # Generate document ID from first chunk
                document_id = f"{user_id}_{filename}_{len(split_docs)}"

                # Store document metadata in user's documents subcollection
                try:
                    from google.cloud import firestore
                    import datetime

                    db = firestore.Client(project=self.settings.google_cloud_project)
                    doc_ref = db.collection(f"users/{user_id}/documents").document(document_id)

                    doc_ref.set({
                        "filename": filename,
                        "document_id": document_id,
                        "upload_date": datetime.datetime.now(),
                        "file_type": file_extension,
                        "chunks_count": len(split_docs),
                        "assigned_classes": [],  # Empty by default
                        "metadata": metadata or {}
                    })

                    logger.info("Document metadata stored successfully",
                               document_id=document_id,
                               user_id=user_id)
                except Exception as e:
                    logger.warning("Failed to store document metadata",
                                 document_id=document_id,
                                 error=str(e))

                logger.info("Document uploaded and ingested successfully",
                           filename=filename,
                           user_id=user_id,
                           chunks=len(split_docs))

                return {
                    "document_id": document_id,
                    "filename": filename,
                    "chunks": len(split_docs),
                    "status": "success"
                }

            finally:
                # Clean up temp file
                temp_path.unlink(missing_ok=True)

        except Exception as e:
            logger.error("Document ingestion failed",
                        filename=filename,
                        error=str(e))
            raise

    async def delete_document(self, user_id: str, document_ids: list[str]) -> bool:
        """Delete documents from both vector store and metadata collection."""
        try:
            from google.cloud import firestore

            # 1. Delete from vector store chunks
            vector_store = self._get_vector_store(user_id)

            # For each document, find and delete all its chunks
            db = firestore.Client(project=self.settings.google_cloud_project)

            for document_id in document_ids:
                # Get the document metadata to find the filename
                doc_ref = db.collection(f"users/{user_id}/documents").document(document_id)
                doc_snapshot = doc_ref.get()

                if doc_snapshot.exists:
                    doc_data = doc_snapshot.to_dict()
                    filename = doc_data.get("filename")

                    if filename:
                        # Delete all chunks for this document from vector store
                        chunks_ref = db.collection(f"users/{user_id}/chunks")
                        chunks_query = chunks_ref.where("metadata.source", "==", filename)
                        chunks = chunks_query.get()

                        # Delete each chunk
                        for chunk in chunks:
                            chunk.reference.delete()

                        logger.info("Deleted chunks from vector store",
                                   document_id=document_id,
                                   chunks_deleted=len(chunks))

                    # 2. Delete document metadata
                    doc_ref.delete()

                    logger.info("Deleted document metadata",
                               document_id=document_id,
                               filename=filename)

            logger.info("Documents deleted successfully",
                       user_id=user_id,
                       document_count=len(document_ids))
            return True

        except Exception as e:
            logger.error("Failed to delete documents",
                        user_id=user_id,
                        error=str(e))
            return False

    def _get_vector_store(self, user_id: str) -> FirestoreVectorStore:
        """Get FirestoreVectorStore for user using proper subcollection structure."""

        # Use Firestore subcollection: users/{user_id}/chunks
        collection_name = f"users/{user_id}/chunks"

        return FirestoreVectorStore(
            collection=collection_name,
            embedding_service=self.embeddings,
        )

    def get_retriever(self, user_id: str, class_id: str | None = None, k: int = 5):
        """Get LangChain retriever for document search."""

        vector_store = self._get_vector_store(user_id)

        if class_id:
            # Create filtered retriever
            search_kwargs = {
                "k": k,
                "filter": {"metadata.assigned_classes": {"array_contains": class_id}}
            }
        else:
            search_kwargs = {"k": k}

        return vector_store.as_retriever(search_kwargs=search_kwargs)