"""Health check endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

from rag_scholar.config.settings import get_settings

router = APIRouter()
settings = get_settings()


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    domain: str


@router.get("/", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check service health."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        domain=settings.default_domain.value,
    )


@router.get("/ready")
async def readiness_check() -> dict:
    """Check if service is ready to handle requests."""
    # TODO: Check database, vector store, etc.
    return {"ready": True}
