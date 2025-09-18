"""Document management endpoints."""

import shutil
from pathlib import Path

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from rag_scholar.config.settings import get_settings
from rag_scholar.services.dependencies import get_document_service
from rag_scholar.services.document_service import DocumentService

from ...models.user import UserResponse
from ...services.user_service import get_user_service
from .auth import get_current_user

logger = structlog.get_logger()
router = APIRouter()


class DocumentResponse(BaseModel):
    """Document response model."""

    id: str
    filename: str
    size: int
    chunks: int
    status: str


class IndexStatus(BaseModel):
    """Index status model."""

    total_documents: int
    total_chunks: int
    index_size_mb: float
    last_updated: str


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    class_id: str | None = None,
    document_service: DocumentService = Depends(get_document_service),
    current_user: UserResponse = Depends(get_current_user),
) -> DocumentResponse:
    """Upload and process a document. Always goes to master 'database' collection."""

    # Validate file type
    allowed_extensions = {".pdf", ".docx", ".txt", ".md", ".csv"}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not supported",
        )

    try:
        # Always use "database" collection for master storage
        collection = "database"

        # Save uploaded file locally for processing
        settings = get_settings()
        upload_path = settings.upload_dir / collection / file.filename
        upload_path.parent.mkdir(parents=True, exist_ok=True)

        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Process document with class assignment metadata
        result = await document_service.process_document(
            file_path=upload_path,
            collection=collection,
            class_id=class_id,  # Pass class_id for assignment
            user_id=current_user.id,  # Pass user_id for user-specific storage
        )

        # Upload document to GCS documents bucket
        try:
            from rag_scholar.services.cloud_storage import CloudStorageService
            cloud_storage = CloudStorageService(settings)
            if cloud_storage.is_available():
                # Upload document to documents bucket with user-specific path
                path_prefix = cloud_storage.get_user_path_prefix(current_user.id)
                blob_path = f"{path_prefix}{collection}/{file.filename}"

                documents_bucket = cloud_storage.get_bucket('documents')
                if documents_bucket:
                    blob = documents_bucket.blob(blob_path)
                    blob.upload_from_filename(str(upload_path))
                    logger.info(f"Uploaded document to GCS: {blob_path}")

                    # Clean up local file after successful upload
                    upload_path.unlink()
                    logger.info(f"Cleaned up local file: {upload_path}")
                else:
                    logger.warning("Documents bucket not available, keeping local file")
            else:
                logger.warning("Cloud storage not available, keeping local file")
        except Exception as e:
            logger.error(f"Failed to upload document to GCS: {e}")
            # Continue processing even if GCS upload fails

        # Update user statistics for document upload
        if current_user and hasattr(current_user, 'id') and current_user.id:
            try:
                user_service = get_user_service(settings)
                await user_service.update_user_stats(current_user.id, "document_upload", 1)
            except Exception as e:
                logger.warning(f"Failed to update user stats: {e}")

        return DocumentResponse(
            id=result["doc_id"],
            filename=file.filename,
            size=file.size or 0,
            chunks=result["chunk_count"],
            status="processed",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections", response_model=list[str])
async def list_collections(
    document_service: DocumentService = Depends(get_document_service),
) -> list[str]:
    """List available document collections."""

    collections = await document_service.list_collections()
    return collections


@router.get(
    "/collections/{collection}/documents", response_model=list[DocumentResponse]
)
async def list_documents(
    collection: str,
    class_id: str | None = None,
    document_service: DocumentService = Depends(get_document_service),
    current_user: UserResponse = Depends(get_current_user),
) -> list[DocumentResponse]:
    """List documents in master collection, optionally filtered by class."""

    # Always use master "database" collection regardless of URL parameter
    documents = await document_service.list_documents("database", class_id=class_id, user_id=current_user.id)

    return [
        DocumentResponse(
            id=doc["id"],
            filename=doc["filename"],
            size=doc["size"],
            chunks=doc["chunks"],
            status=doc["status"],
        )
        for doc in documents
    ]


@router.delete("/collections/{collection}/documents/{doc_id}")
async def delete_document(
    collection: str,
    doc_id: str,
    document_service: DocumentService = Depends(get_document_service),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Delete a document from collection."""

    try:
        await document_service.delete_document(collection, doc_id, current_user.id)
        return {"message": f"Document {doc_id} deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id} from collection {collection}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.post("/collections/{collection}/reindex")
async def reindex_collection(
    collection: str,
    document_service: DocumentService = Depends(get_document_service),
) -> IndexStatus:
    """Rebuild index for a collection."""

    status = await document_service.reindex_collection(collection)

    return IndexStatus(
        total_documents=status["total_documents"],
        total_chunks=status["total_chunks"],
        index_size_mb=status["index_size_mb"],
        last_updated=status["last_updated"],
    )


@router.post("/collections/{collection}/documents/{doc_id}/assign-class")
async def assign_document_to_class(
    collection: str,
    doc_id: str,
    class_id: str,
    document_service: DocumentService = Depends(get_document_service),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """Assign a document to a class by updating its metadata."""

    try:
        await document_service.assign_document_to_class(collection, doc_id, class_id, current_user.id)
        return {"message": f"Document {doc_id} assigned to class {class_id}"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to assign document {doc_id} to class {class_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign document to class")


@router.get("/search")
async def search_documents(
    query: str,
    collection: str = "database",
    limit: int = 5,
    document_service: DocumentService = Depends(get_document_service),
) -> list[dict]:
    """Search documents in a collection."""

    results = await document_service.search(
        query=query,
        collection=collection,
        limit=limit,
    )

    return results
