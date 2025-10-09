"""Authentication routes for RAG Scholar API."""

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.firebase_auth import verify_firebase_token
from ..services.user_profile import UserProfileService
from ..config.settings import get_settings

logger = structlog.get_logger()
router = APIRouter(tags=["authentication"])


class UserAPISettings(BaseModel):
    """User API settings model."""
    api_key: Optional[str] = None
    preferred_model: str = "gpt-5-mini"
    temperature: float = 0.0
    max_tokens: int = 2000
    timezone: str = "UTC"


class UserProfileUpdate(BaseModel):
    """User profile update model."""
    bio: Optional[str] = None
    research_interests: Optional[list[str]] = None
    preferred_domains: Optional[list[str]] = None
    profile_image: Optional[str] = None


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

    logger.info("Fetching user profile", user_id=current_user["id"])

    # Get full user profile from Firestore
    profile_data = await user_service.get_user_profile(current_user["id"])

    logger.info("Profile data retrieved from database",
                user_id=current_user["id"],
                has_stats=bool(profile_data.get("stats")),
                has_profile=bool(profile_data.get("profile")),
                achievements_count=len(profile_data.get("achievements", [])),
                total_points=profile_data.get("total_points", 0),
                has_profile_image=bool(profile_data.get("profile", {}).get("profile_image")))

    logger.debug("Full profile data", user_id=current_user["id"], profile_data=profile_data)

    # Log profile image details if present
    profile_image = profile_data.get("profile", {}).get("profile_image")
    if profile_image:
        logger.info("Profile image found",
                   user_id=current_user["id"],
                   image_url_length=len(profile_image),
                   is_base64=profile_image.startswith("data:image") if profile_image else False)

    # Merge Firebase user data with profile data
    full_user = {
        "id": current_user["id"],
        "name": current_user.get("name", "Unknown"),
        "email": current_user.get("email", ""),
        "created_at": profile_data.get("created_at", ""),
        "is_active": True,
        "stats": profile_data.get("stats", {}),
        "profile": profile_data.get("profile", {}),
        "achievements": profile_data.get("achievements", []),
        "total_points": profile_data.get("total_points", 0)
    }

    logger.info("Returning user profile", user_id=current_user["id"])
    return full_user


@router.post("/grant-early-adopter")
async def grant_early_adopter(current_user: dict = Depends(get_current_user)):
    """Grant early adopter status to current user (temporary endpoint)."""
    settings = get_settings()
    user_service = UserProfileService(settings)

    success = await user_service.update_user_stats(current_user["id"], "is_early_adopter", 1)

    if success:
        return {"message": "Early adopter status granted!", "user_id": current_user["id"]}
    else:
        return {"error": "Failed to grant early adopter status"}


@router.get("/api-settings", response_model=UserAPISettings)
async def get_api_settings(current_user: dict = Depends(get_current_user)):
    """Get user's API settings."""
    try:
        settings = get_settings()
        user_service = UserProfileService(settings)

        # Get API settings from user profile
        api_settings = await user_service.get_user_api_settings(current_user["id"])

        return UserAPISettings(
            api_key=api_settings.get("api_key"),
            preferred_model=api_settings.get("preferred_model", "gpt-5-mini"),
            temperature=api_settings.get("temperature", 0.0),
            max_tokens=api_settings.get("max_tokens", 2000),
            timezone=api_settings.get("timezone", "UTC")
        )
    except Exception as e:
        logger.error("Failed to get API settings", error=str(e), user_id=current_user["id"])
        # Return defaults on error
        return UserAPISettings()


@router.post("/api-settings")
async def update_api_settings(
    api_settings: UserAPISettings,
    current_user: dict = Depends(get_current_user)
):
    """Update user's API settings."""
    try:
        settings = get_settings()
        user_service = UserProfileService(settings)

        # Update API settings in user profile
        success = await user_service.update_user_api_settings(
            current_user["id"],
            {
                "api_key": api_settings.api_key,
                "preferred_model": api_settings.preferred_model,
                "temperature": api_settings.temperature,
                "max_tokens": api_settings.max_tokens,
                "timezone": api_settings.timezone
            }
        )

        if success:
            return {"message": "API settings updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update API settings")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update API settings", error=str(e), user_id=current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to update API settings")


@router.put("/profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information."""
    try:
        settings = get_settings()
        user_service = UserProfileService(settings)

        # Convert the profile data to dict and remove None values
        update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}

        logger.info("Updating user profile",
                   user_id=current_user["id"],
                   fields_updated=list(update_data.keys()),
                   has_profile_image="profile_image" in update_data)

        if "profile_image" in update_data:
            logger.info("Profile image being updated",
                       user_id=current_user["id"],
                       image_url_length=len(update_data["profile_image"]) if update_data["profile_image"] else 0,
                       is_base64=update_data["profile_image"].startswith("data:image") if update_data.get("profile_image") else False)

        # Update user profile in Firestore
        success = await user_service.update_user_profile_data(
            current_user["id"],
            update_data
        )

        if success:
            logger.info("Profile updated successfully", user_id=current_user["id"])
            return {"message": "Profile updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update user profile", error=str(e), user_id=current_user["id"])
        raise HTTPException(status_code=500, detail="Failed to update profile")