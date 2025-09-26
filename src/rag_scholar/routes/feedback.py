"""Feedback routes for collecting user feedback."""

from datetime import datetime, timezone
from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from google.cloud import firestore

from rag_scholar.services.firebase_auth import get_current_user


logger = structlog.get_logger()

router = APIRouter()


class FeedbackRequest(BaseModel):
    """Request model for feedback submission."""

    type: Literal["bug", "feature", "general"] = Field(
        description="Type of feedback"
    )
    message: str = Field(
        min_length=1,
        max_length=5000,
        description="Feedback message"
    )
    email: EmailStr | None = Field(
        default=None,
        description="Optional email for follow-up"
    )


class FeedbackResponse(BaseModel):
    """Response model for feedback submission."""

    success: bool
    message: str
    feedback_id: str | None = None


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: dict = Depends(get_current_user)
) -> FeedbackResponse:
    """
    Submit user feedback.

    Stores feedback in Firestore for review by administrators.
    """
    try:
        # Initialize Firestore client
        db = firestore.Client()

        # Prepare feedback document
        feedback_doc = {
            "type": feedback.type,
            "message": feedback.message,
            "email": feedback.email,
            "user_id": current_user.get("uid"),
            "user_email": current_user.get("email"),
            "user_name": current_user.get("name"),
            "created_at": datetime.now(timezone.utc),
            "status": "new",  # new, in_progress, resolved
            "admin_notes": None,
            "resolved_at": None,
        }

        # Store in Firestore
        feedback_ref = db.collection("feedback").add(feedback_doc)
        feedback_id = feedback_ref[1].id

        logger.info(
            "Feedback submitted successfully",
            feedback_id=feedback_id,
            feedback_type=feedback.type,
            user_id=current_user.get("uid"),
            user_email=current_user.get("email")
        )

        return FeedbackResponse(
            success=True,
            message="Thank you for your feedback! We'll review it and get back to you if needed.",
            feedback_id=feedback_id
        )

    except Exception as e:
        logger.error(
            "Failed to submit feedback",
            error=str(e),
            user_id=current_user.get("uid"),
            feedback_type=feedback.type
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to submit feedback. Please try again."
        ) from e


@router.get("/feedback", dependencies=[Depends(get_current_user)])
async def list_user_feedback(
    current_user: dict = Depends(get_current_user)
) -> list[dict]:
    """
    Get feedback submitted by the current user.

    Returns list of feedback submissions with their status.
    """
    try:
        db = firestore.Client()

        # Query user's feedback
        feedback_query = (
            db.collection("feedback")
            .where("user_id", "==", current_user.get("uid"))
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(50)
        )

        feedback_list = []
        for doc in feedback_query.stream():
            feedback_data = doc.to_dict()
            feedback_data["id"] = doc.id

            # Convert datetime to ISO string for JSON serialization
            if "created_at" in feedback_data:
                feedback_data["created_at"] = feedback_data["created_at"].isoformat()
            if "resolved_at" in feedback_data and feedback_data["resolved_at"]:
                feedback_data["resolved_at"] = feedback_data["resolved_at"].isoformat()

            feedback_list.append(feedback_data)

        return feedback_list

    except Exception as e:
        logger.error(
            "Failed to retrieve user feedback",
            error=str(e),
            user_id=current_user.get("uid")
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve feedback."
        ) from e