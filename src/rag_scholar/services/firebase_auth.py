"""Firebase Auth integration for RAG Scholar."""

import firebase_admin
from firebase_admin import auth, credentials
import structlog
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = structlog.get_logger()

# Security scheme for dependency injection
security = HTTPBearer()

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    # Use default credentials (from environment)
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'projectId': 'ragscholarai'
    })

async def verify_firebase_token(id_token: str) -> Optional[dict]:
    """Verify Firebase ID token and return user info."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return {
            "id": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name", decoded_token.get("email", "Unknown")),
            "firebase_uid": decoded_token.get("uid")
        }
    except Exception as e:
        logger.error("Failed to verify Firebase token", error=str(e))
        return None

async def get_firebase_user(uid: str) -> Optional[dict]:
    """Get Firebase user by UID."""
    try:
        user = auth.get_user(uid)
        return {
            "id": user.uid,
            "email": user.email,
            "name": user.display_name or user.email or "Unknown",
            "firebase_uid": user.uid
        }
    except Exception as e:
        logger.error("Failed to get Firebase user", uid=uid, error=str(e))
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency to get current authenticated user from Firebase token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    token = credentials.credentials

    user_info = await verify_firebase_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_info