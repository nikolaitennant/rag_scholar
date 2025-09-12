"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import Any

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from rag_scholar.config.settings import Settings, get_settings
from rag_scholar.utils.logging import setup_logging

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Global variables for lazy initialization
settings: Settings | None = None
services: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with lazy initialization."""
    global settings, services

    try:
        # Initialize settings first
        logger.info("Initializing application settings...")
        settings = get_settings()

        # Initialize services that might be heavy
        logger.info("Initializing application services...")
        # Add other service initialization here as needed:
        # services['openai'] = OpenAI(api_key=settings.openai_api_key)
        # services['embeddings'] = load_embeddings()

        logger.info(
            "RAG Scholar API started successfully", version=settings.app_version
        )
        yield

    except Exception as e:
        logger.error("Failed to initialize application", error=str(e))
        raise
    finally:
        # Cleanup resources
        logger.info("Shutting down RAG Scholar API")
        services.clear()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    # Import routes here to avoid heavy imports at module level
    from rag_scholar.api.routes import auth, chat, documents, health, sessions

    app = FastAPI(
        title="RAG Scholar",  # Use defaults, will be updated in lifespan
        version="2.0.0",
        description="Professional RAG-based research assistant API",
        lifespan=lifespan,
        docs_url="/api/v1/docs",  # Use default, will work with most configs
        redoc_url="/api/v1/redoc",
    )

    # Configure CORS with safe defaults
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Will be updated after settings load if needed
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers with default prefix
    app.include_router(
        health.router,
        prefix="/api/v1/health",
        tags=["health"],
    )
    app.include_router(
        documents.router,
        prefix="/api/v1/documents",
        tags=["documents"],
    )
    app.include_router(
        chat.router,
        prefix="/api/v1/chat",
        tags=["chat"],
    )
    app.include_router(
        auth.router,
        prefix="/api/v1",
        tags=["auth"],
    )
    app.include_router(
        sessions.router,
        prefix="/api/v1",
        tags=["sessions"],
    )

    # Exception handlers
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Any, exc: Exception) -> JSONResponse:  # noqa: ARG001
        logger.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()


def run() -> None:
    """Run the application."""
    import os

    # For local development, we can initialize settings here
    global settings
    if settings is None:
        settings = get_settings()

    uvicorn.run(
        "rag_scholar.main:app",
        host=os.getenv("HOST", "0.0.0.0"),  # nosec B104
        port=int(os.getenv("PORT", 8080)),
        reload=settings.debug if settings else False,
        log_level=settings.log_level.lower() if settings else "info",
    )


if __name__ == "__main__":
    run()
