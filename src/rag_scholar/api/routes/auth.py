"""Authentication routes for RAG Scholar API."""

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException

from ...models.user import (
    AuthToken,
    PasswordChange,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from ...config.settings import get_settings
from ...services.user_service import get_user_service

logger = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["authentication"])


def get_user_service_dep():
    """Dependency to get user service with settings."""
    settings = get_settings()
    return get_user_service(settings)


async def get_current_user(authorization: str | None = Header(None)) -> UserResponse:
    """Get current user from authorization header."""
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

    user_service = get_user_service_dep()
    user = await user_service.verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


@router.post("/register", response_model=AuthToken)
async def register(user_data: UserCreate, user_service = Depends(get_user_service_dep)):
    """Register a new user."""
    try:
        user = await user_service.register_user(user_data)
        token = await user_service.create_token(user.id)

        logger.info("User registered successfully", user_id=user.id)
        return AuthToken(access_token=token, user=user)

    except ValueError as e:
        logger.warning("Registration failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Registration error", error=str(e))
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=AuthToken)
async def login(login_data: UserLogin, user_service = Depends(get_user_service_dep)):
    """Authenticate user and return token."""
    try:
        user = await user_service.authenticate_user(login_data)
        token = await user_service.create_token(user.id)

        logger.info("User logged in successfully", user_id=user.id)
        return AuthToken(access_token=token, user=user)

    except ValueError as e:
        # Specific authentication errors from user service
        logger.warning("Login failed", error=str(e))
        raise HTTPException(status_code=401, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error", error=str(e))
        raise HTTPException(status_code=500, detail="Login failed")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    user_service = Depends(get_user_service_dep)
):
    """Update current user information."""
    try:
        updated_user = await user_service.update_user(current_user.id, update_data)
        logger.info("User updated successfully", user_id=current_user.id)
        return updated_user

    except ValueError as e:
        logger.warning("User update failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("User update error", error=str(e))
        raise HTTPException(status_code=500, detail="Update failed")


@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout user (client should delete token)."""
    logger.info("User logged out", user_id=current_user.id)
    return {"message": "Logged out successfully"}


@router.get("/leaderboard", response_model=list[UserResponse])
async def get_leaderboard(user_service = Depends(get_user_service_dep)):
    """Get user leaderboard by points."""
    try:
        leaderboard = await user_service.get_leaderboard()
        return leaderboard
    except Exception as e:
        logger.error("Leaderboard error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")


@router.put("/password")
async def change_password(
    password_data: PasswordChange,
    current_user: UserResponse = Depends(get_current_user),
    user_service = Depends(get_user_service_dep)
):
    """Change user password."""
    try:
        await user_service.change_password(
            current_user.id, password_data.current_password, password_data.new_password
        )
        logger.info("Password changed successfully", user_id=current_user.id)
        return {"message": "Password changed successfully"}

    except ValueError as e:
        logger.warning("Password change failed", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Password change error", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Password change failed")
