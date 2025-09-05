"""Document management endpoints."""

import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from rag_scholar.config.settings import get_settings
from rag_scholar.services.document_service import DocumentService
from rag_scholar.services.dependencies import get_document_service

router = APIRouter()
settings = get_settings()


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
    collection: str = "default",
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    """Upload and process a document."""
    
    # Validate file type
    allowed_extensions = {".pdf", ".docx", ".txt", ".md", ".csv"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not supported",
        )
    
    try:
        # Save uploaded file
        upload_path = settings.upload_dir / collection / file.filename
        upload_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Process document
        result = await document_service.process_document(
            file_path=upload_path,
            collection=collection,
        )
        
        return DocumentResponse(
            id=result["doc_id"],
            filename=file.filename,
            size=file.size or 0,
            chunks=result["chunk_count"],
            status="processed",
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections", response_model=List[str])
async def list_collections(
    document_service: DocumentService = Depends(get_document_service),
) -> List[str]:
    """List available document collections."""
    
    collections = await document_service.list_collections()
    return collections


@router.get("/collections/{collection}/documents", response_model=List[DocumentResponse])
async def list_documents(
    collection: str,
    document_service: DocumentService = Depends(get_document_service),
) -> List[DocumentResponse]:
    """List documents in a collection."""
    
    documents = await document_service.list_documents(collection)
    
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
) -> dict:
    """Delete a document from collection."""
    
    await document_service.delete_document(collection, doc_id)
    return {"message": f"Document {doc_id} deleted"}


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


@router.get("/search")
async def search_documents(
    query: str,
    collection: str = "default",
    limit: int = 5,
    document_service: DocumentService = Depends(get_document_service),
) -> List[dict]:
    """Search documents in a collection."""
    
    results = await document_service.search(
        query=query,
        collection=collection,
        limit=limit,
    )
    
    return results