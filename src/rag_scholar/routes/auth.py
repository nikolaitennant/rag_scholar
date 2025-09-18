"""Authentication routes for RAG Scholar API."""

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException

from ..services.firebase_auth import verify_firebase_token
from ..services.user_profile import UserProfileService
from ..config.settings import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["authentication"])


async def get_current_user(authorization: str | None = Header(None)) -> dict:
    """Get current user from token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(
            status_code=401, detail="Invalid authorization header format"
        )

    # Verify Firebase ID token
    user = await verify_firebase_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information with full profile."""
    settings = get_settings()
    user_service = UserProfileService(settings)

    # Get full user profile from Firestore
    profile_data = await user_service.get_user_profile(current_user["id"])

    # Merge Firebase user data with profile data
    full_user = {
        "id": current_user["id"],
        "name": current_user.get("name", "Unknown"),
        "email": current_user.get("email", ""),
        "created_at": profile_data.get("created_at", ""),
        "is_active": True,
        "stats": profile_data.get("stats", {}),
        "profile": profile_data.get("profile", {}),
        "achievements": profile_data.get("achievements", [])
    }

    return full_user


