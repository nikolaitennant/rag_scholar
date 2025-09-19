"""Document management endpoints using LangChain."""

import structlog
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from pydantic import BaseModel

from rag_scholar.services.langchain_ingestion import LangChainIngestionPipeline
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
    collection: str = "database",
    current_user: dict = Depends(get_current_user),
):
    """Upload and process document using LangChain ingestion."""

    # Validate file type
    allowed_types = {".pdf", ".txt", ".md", ".docx"}
    file_extension = f".{file.filename.split('.')[-1].lower()}" if file.filename else ""

    if file_extension not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_extension} not supported. Allowed: {', '.join(allowed_types)}"
        )

    try:
        # Initialize ingestion pipeline
        settings = get_settings()
        ingestion_pipeline = LangChainIngestionPipeline(settings)

        # Read file content
        file_content = await file.read()

        # Process with LangChain ingestion
        result = await ingestion_pipeline.ingest_document(
            file_content=file_content,
            filename=file.filename,
            collection=collection,
            metadata={
                "uploaded_by": current_user["id"],
                "user_email": current_user.get("email", ""),
            }
        )

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
    current_user: dict = Depends(get_current_user),
):
    """Delete document using LangChain built-in delete."""

    try:
        # Initialize ingestion pipeline
        settings = get_settings()
        ingestion_pipeline = LangChainIngestionPipeline(settings)

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
    current_user: dict = Depends(get_current_user),
):
    """Assign or remove document from a class."""
    try:
        # Initialize ingestion pipeline
        settings = get_settings()
        ingestion_pipeline = LangChainIngestionPipeline(settings)

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
    try:
        # Initialize ingestion pipeline
        settings = get_settings()
        ingestion_pipeline = LangChainIngestionPipeline(settings)

        # Get documents from user's documents subcollection
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)
        user_id = current_user["id"]

        try:
            docs_ref = db.collection(f"users/{user_id}/documents")
            docs = docs_ref.get()

            documents = []
            for doc in docs:
                data = doc.to_dict()
                filename = data.get("filename", "unknown")

                # Get actual assigned_classes from vector store chunks
                chunks_ref = db.collection(f"users/{user_id}/chunks")
                chunks_query = chunks_ref.where("metadata.source", "==", filename).limit(1)
                chunks = chunks_query.get()

                assigned_classes = []
                if chunks:
                    chunk_data = chunks[0].to_dict()
                    assigned_classes = chunk_data.get("metadata", {}).get("assigned_classes", [])

                documents.append({
                    "id": data.get("document_id", doc.id),
                    "filename": filename,
                    "collection": collection,
                    "chunks": data.get("chunks_count", 0),
                    "upload_date": data.get("upload_date"),
                    "file_type": data.get("file_type", ""),
                    "assigned_classes": assigned_classes
                })

            return documents
        except Exception as e:
            logger.error("Failed to get documents", user_id=user_id, error=str(e))
            return []

    except Exception as e:
        # Return empty list if there's an error (e.g., no documents yet)
        return []