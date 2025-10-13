"""Document management endpoints using LangChain."""

import structlog
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional

from rag_scholar.services.langchain_ingestion import LangChainIngestionPipeline
from rag_scholar.services.user_profile import UserProfileService
from rag_scholar.services.storage import DocumentStorageService
from rag_scholar.config.settings import get_settings

from .auth import get_current_user

logger = structlog.get_logger()

router = APIRouter()


class UploadResponse(BaseModel):
    """Document upload response."""
    id: str
    filename: str
    collection: str
    status: str
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form("database"),
    current_user: dict = Depends(get_current_user),
):
    """Upload and process document using LangChain ingestion - API key fetched securely from user profile."""

    # Validate file type
    allowed_types = {".pdf", ".txt", ".md", ".docx"}
    file_extension = f".{file.filename.split('.')[-1].lower()}" if file.filename else ""

    if file_extension not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Allowed: {', '.join(allowed_types)}"
        )

    try:
        # Initialize services
        settings = get_settings()
        user_service = UserProfileService(settings)

        # Fetch user's API key securely from Firestore
        api_settings = await user_service.get_user_api_settings(current_user["id"])
        user_api_key = api_settings.get("api_key")

        if not user_api_key:
            raise HTTPException(
                status_code=400,
                detail="API key required. Please configure your API key in Advanced Settings."
            )

        logger.info("Upload request received - using secure API key from Firestore",
                    user_id=current_user["id"],
                    api_key_suffix=user_api_key[-4:] if len(user_api_key) > 4 else "none")

        # Create custom settings with user's API key
        user_settings = settings.model_copy()
        user_settings.openai_api_key = user_api_key

        ingestion_pipeline = LangChainIngestionPipeline(user_settings)

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)  # Get file size in bytes

        logger.info("Processing document upload",
                    user_id=current_user["id"],
                    filename=file.filename,
                    file_size_bytes=file_size,
                    file_size_mb=round(file_size / (1024 * 1024), 2))

        # Process with LangChain ingestion
        result = await ingestion_pipeline.ingest_document(
            file_content=file_content,
            filename=file.filename,
            collection=collection,
            metadata={
                "uploaded_by": current_user["id"],
                "user_email": current_user.get("email", ""),
                "file_size_bytes": file_size,
            }
        )

        # Upload to Firebase Storage for iOS preview
        document_id = result.get("document_id", "")
        storage_service = DocumentStorageService(settings)

        try:
            # Determine content type
            content_type = "application/pdf" if file_extension == ".pdf" else "application/octet-stream"

            # Upload original document
            storage_url, download_url = await storage_service.upload_document(
                file_content=file_content,
                filename=file.filename,
                user_id=current_user["id"],
                document_id=document_id,
                content_type=content_type
            )

            # Generate and upload preview for PDFs
            preview_url = ""
            preview_download_url = ""
            if file_extension == ".pdf":
                preview_content = await storage_service.generate_pdf_preview(file_content)
                if preview_content:
                    preview_url, preview_download_url = await storage_service.upload_preview(
                        preview_content=preview_content,
                        user_id=current_user["id"],
                        document_id=document_id,
                        content_type="application/pdf"
                    )

            # Update document metadata in Firestore with storage URLs
            from google.cloud import firestore
            db = firestore.Client(project=settings.google_cloud_project)
            doc_ref = db.collection(f"users/{current_user['id']}/documents").document(document_id)
            doc_ref.update({
                "storage_url": storage_url,
                "download_url": download_url,
                "preview_url": preview_url,
                "preview_download_url": preview_download_url,
            })

            logger.info("Uploaded document to storage",
                       user_id=current_user["id"],
                       document_id=document_id,
                       has_preview=bool(preview_url))

        except Exception as e:
            # Don't fail the entire upload if storage fails
            logger.warning("Failed to upload to Firebase Storage",
                          user_id=current_user["id"],
                          document_id=document_id,
                          error=str(e))

        # Update user achievements for document upload
        try:
            user_service = UserProfileService(settings)
            await user_service.update_user_stats(current_user["id"], "documents_uploaded", 1)
            logger.info("Updated document upload achievement", user_id=current_user["id"])
        except Exception as e:
            logger.warning("Failed to update achievement", user_id=current_user["id"], error=str(e))

        return UploadResponse(
            id=result.get("document_id", ""),
            filename=file.filename or "",
            collection=collection,
            status="processed",
            message="Document uploaded and processed successfully"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    api_key: str = None,  # User's API key
    current_user: dict = Depends(get_current_user),
):
    """Delete document using LangChain built-in delete."""

    try:
        # Initialize ingestion pipeline with user's API key
        settings = get_settings()

        # Use user's API key if provided, otherwise fall back to environment
        user_api_key = api_key or settings.openai_api_key
        if not user_api_key:
            raise HTTPException(
                status_code=400,
                detail="API key required. Please configure your API key in Advanced Settings."
            )

        # Create custom settings with user's API key
        user_settings = settings.model_copy()
        user_settings.openai_api_key = user_api_key

        ingestion_pipeline = LangChainIngestionPipeline(user_settings)

        # Use LangChain's built-in delete method
        success = await ingestion_pipeline.delete_document(
            user_id=current_user["id"],
            document_ids=[document_id]
        )

        if success:
            return {"message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete document")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/collections")
async def get_collections(
    current_user: dict = Depends(get_current_user),
):
    """Get available document collections."""
    # For now, return empty list - can be implemented later if needed
    return []


class DocumentClassAssignmentRequest(BaseModel):
    """Request to assign/unassign document to/from class."""
    document_source: str
    class_id: str
    operation: str = "add"  # "add" or "remove"


@router.post("/{document_id}/assign-class")
async def assign_document_to_class(
    document_id: str,
    request: DocumentClassAssignmentRequest,
    api_key: str = None,  # User's API key
    current_user: dict = Depends(get_current_user),
):
    """Assign or remove document from a class."""
    try:
        # Initialize ingestion pipeline with user's API key
        settings = get_settings()

        # Use user's API key if provided, otherwise fall back to environment
        user_api_key = api_key or settings.openai_api_key
        if not user_api_key:
            raise HTTPException(
                status_code=400,
                detail="API key required. Please configure your API key in Advanced Settings."
            )

        # Create custom settings with user's API key
        user_settings = settings.model_copy()
        user_settings.openai_api_key = user_api_key

        ingestion_pipeline = LangChainIngestionPipeline(user_settings)

        # Use the existing update_document_class method
        success = await ingestion_pipeline.update_document_class(
            document_source=request.document_source,
            user_id=current_user["id"],
            class_id=request.class_id,
            operation=request.operation
        )

        if success:
            return {
                "message": f"Document {'assigned to' if request.operation == 'add' else 'removed from'} class successfully",
                "document_source": request.document_source,
                "class_id": request.class_id,
                "operation": request.operation
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update document class assignment")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Class assignment failed: {str(e)}")


@router.get("/")
async def get_documents(
    collection: str = "database",
    current_user: dict = Depends(get_current_user),
):
    """Get documents in a collection."""
    user_id = current_user["id"]
    logger.info("Fetching documents", user_id=user_id, collection=collection)

    try:
        # Get documents from user's documents subcollection (no API key needed for reading)
        settings = get_settings()
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)

        try:
            docs_ref = db.collection(f"users/{user_id}/documents")
            docs = docs_ref.get()
            logger.info("Documents retrieved from database",
                       user_id=user_id,
                       document_count=len(docs))

            documents = []
            for doc in docs:
                data = doc.to_dict()
                filename = data.get("filename", "unknown")

                # Get actual assigned_classes from vector store chunks
                chunks_ref = db.collection(f"users/{user_id}/chunks")
                chunks_query = chunks_ref.where("metadata.source", "==", filename).limit(1)
                chunks = chunks_query.get()

                logger.debug("Chunks retrieved for document",
                            user_id=user_id,
                            filename=filename,
                            chunks_found=len(chunks))

                assigned_classes = []
                if chunks:
                    chunk_data = chunks[0].to_dict()
                    assigned_classes = chunk_data.get("metadata", {}).get("assigned_classes", [])
                    logger.debug("Chunk metadata retrieved",
                                user_id=user_id,
                                filename=filename,
                                assigned_classes=assigned_classes)

                documents.append({
                    "id": data.get("document_id", doc.id),
                    "filename": filename,
                    "collection": collection,
                    "chunks": data.get("chunks_count", 0),
                    "upload_date": data.get("upload_date"),
                    "file_type": data.get("file_type", ""),
                    "file_size_bytes": data.get("file_size_bytes", 0),
                    "storage_url": data.get("storage_url", ""),
                    "download_url": data.get("download_url", ""),
                    "preview_url": data.get("preview_url", ""),
                    "preview_download_url": data.get("preview_download_url", ""),
                    "assigned_classes": assigned_classes
                })

            logger.info("Returning documents",
                       user_id=user_id,
                       document_count=len(documents))
            logger.debug("Document list details",
                        user_id=user_id,
                        documents=[{"id": d["id"], "filename": d["filename"], "chunks": d["chunks"]} for d in documents])
            return documents
        except Exception as e:
            logger.error("Failed to get documents", user_id=user_id, error=str(e))
            return []

    except Exception as e:
        logger.error("Get documents endpoint failed", user_id=user_id, error=str(e))
        return []