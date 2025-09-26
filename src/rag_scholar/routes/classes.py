"""Classes management endpoints for user-defined class organization."""

import structlog
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from .auth import get_current_user
from ..config.settings import get_settings

logger = structlog.get_logger()

router = APIRouter()


class ClassCreate(BaseModel):
    """Class creation request."""
    name: str
    domain_type: str
    description: Optional[str] = ""


class ClassUpdate(BaseModel):
    """Class update request."""
    name: str
    domain_type: str
    description: Optional[str] = ""


class ClassResponse(BaseModel):
    """Class response model."""
    id: str
    name: str
    domain_type: str
    description: str
    created_at: str
    updated_at: str


@router.get("/", response_model=List[ClassResponse])
async def get_user_classes(current_user: dict = Depends(get_current_user)):
    """Get all classes for the current user."""
    try:
        settings = get_settings()
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)

        # Get all classes for this user
        classes_ref = db.collection(f"users/{current_user['id']}/classes")
        classes_docs = classes_ref.order_by("created_at").get()

        classes = []
        for doc in classes_docs:
            data = doc.to_dict()
            classes.append(ClassResponse(
                id=doc.id,
                name=data.get("name", ""),
                domain_type=data.get("domain_type", "general"),
                description=data.get("description", ""),
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", "")
            ))

        return classes

    except Exception as e:
        logger.error("Failed to get user classes", error=str(e), user_id=current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to get classes")


@router.post("/", response_model=ClassResponse)
async def create_class(
    class_data: ClassCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new class for the current user."""
    try:
        settings = get_settings()
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)

        # Create the class document
        now = datetime.utcnow().isoformat()
        class_doc = {
            "name": class_data.name,
            "domain_type": class_data.domain_type,
            "description": class_data.description or "",
            "created_at": now,
            "updated_at": now
        }

        # Add to Firestore
        classes_ref = db.collection(f"users/{current_user['id']}/classes")
        doc_ref = classes_ref.add(class_doc)
        class_id = doc_ref[1].id

        return ClassResponse(
            id=class_id,
            name=class_doc["name"],
            domain_type=class_doc["domain_type"],
            description=class_doc["description"],
            created_at=class_doc["created_at"],
            updated_at=class_doc["updated_at"]
        )

    except Exception as e:
        logger.error("Failed to create class", error=str(e), user_id=current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to create class")


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: str,
    class_data: ClassUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing class."""
    try:
        settings = get_settings()
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)

        # Get the class document
        class_ref = db.collection(f"users/{current_user['id']}/classes").document(class_id)
        class_doc = class_ref.get()

        if not class_doc.exists:
            raise HTTPException(status_code=404, detail="Class not found")

        # Update the class
        now = datetime.utcnow().isoformat()
        update_data = {
            "name": class_data.name,
            "domain_type": class_data.domain_type,
            "description": class_data.description or "",
            "updated_at": now
        }

        class_ref.update(update_data)

        # Get updated document
        updated_doc = class_ref.get()
        data = updated_doc.to_dict()

        return ClassResponse(
            id=class_id,
            name=data["name"],
            domain_type=data["domain_type"],
            description=data["description"],
            created_at=data["created_at"],
            updated_at=data["updated_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update class", error=str(e), user_id=current_user["id"], class_id=class_id)
        raise HTTPException(status_code=500, detail="Failed to update class")


@router.delete("/{class_id}")
async def delete_class(
    class_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a class."""
    try:
        settings = get_settings()
        from google.cloud import firestore

        db = firestore.Client(project=settings.google_cloud_project)

        # Check if class exists
        class_ref = db.collection(f"users/{current_user['id']}/classes").document(class_id)
        class_doc = class_ref.get()

        if not class_doc.exists:
            raise HTTPException(status_code=404, detail="Class not found")

        # Delete the class
        class_ref.delete()

        return {"message": "Class deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete class", error=str(e), user_id=current_user["id"], class_id=class_id)
        raise HTTPException(status_code=500, detail="Failed to delete class")