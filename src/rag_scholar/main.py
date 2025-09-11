"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from rag_scholar.api.routes import auth, chat, documents, health, sessions
from rag_scholar.config.settings import get_settings
from rag_scholar.utils.logging import setup_logging

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting RAG Scholar API", version=settings.app_version)
    yield
    logger.info("Shutting down RAG Scholar API")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Professional RAG-based research assistant API",
        lifespan=lifespan,
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(
        health.router,
        prefix=f"{settings.api_prefix}/health",
        tags=["health"],
    )
    app.include_router(
        documents.router,
        prefix=f"{settings.api_prefix}/documents",
        tags=["documents"],
    )
    app.include_router(
        chat.router,
        prefix=f"{settings.api_prefix}/chat",
        tags=["chat"],
    )
    app.include_router(
        auth.router,
        prefix=f"{settings.api_prefix}",
        tags=["auth"],
    )
    app.include_router(
        sessions.router,
        prefix=f"{settings.api_prefix}",
        tags=["sessions"],
    )
    
    # Exception handlers
    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    
    return app


app = create_app()


def run():
    """Run the application."""
    uvicorn.run(
        "rag_scholar.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    run()