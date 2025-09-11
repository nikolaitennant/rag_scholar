"""Configuration management using Pydantic Settings."""

import os
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DomainType(str, Enum):
    """Supported research domains."""

    GENERAL = "general"
    LAW = "law"
    SCIENCE = "science"
    MEDICINE = "medicine"
    BUSINESS = "business"
    HUMANITIES = "humanities"
    COMPUTER_SCIENCE = "cs"


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # API Keys
    openai_api_key: str = Field(..., description="OpenAI API key")

    # Application
    app_name: str = Field(default="RAG Scholar", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    max_file_size_mb: int = Field(default=50, description="Maximum file upload size in MB")
    allowed_file_types: list[str] = Field(
        default=[".pdf", ".docx", ".txt", ".md", ".csv"],
        description="Allowed file extensions for upload"
    )

    # Domain Configuration
    default_domain: DomainType = Field(
        default=DomainType.GENERAL,
        description="Default research domain"
    )
    available_domains: list[DomainType] = Field(
        default=list(DomainType),
        description="Available research domains"
    )

    # Model Configuration
    llm_model: str = Field(
        default="gpt-4-turbo-preview",
        description="LLM model to use"
    )
    embedding_model: str = Field(
        default="text-embedding-3-small",
        description="Embedding model to use"
    )
    temperature: float = Field(
        default=0.0,
        description="LLM temperature",
        ge=0.0,
        le=2.0
    )

    # Retrieval Configuration
    chunk_size: int = Field(
        default=1500,
        description="Document chunk size",
        ge=100,
        le=4000
    )
    chunk_overlap: int = Field(
        default=200,
        description="Chunk overlap size",
        ge=0,
        le=500
    )
    retrieval_k: int = Field(
        default=5,
        description="Number of documents to retrieve",
        ge=1,
        le=20
    )

    # Search Configuration
    use_hybrid_search: bool = Field(
        default=True,
        description="Enable hybrid (vector + keyword) search"
    )
    bm25_weight: float = Field(
        default=0.3,
        description="BM25 weight in hybrid search",
        ge=0.0,
        le=1.0
    )

    # Storage
    data_dir: Path = Field(
        default=Path("data"),
        description="Data directory path"
    )
    index_dir: Path = Field(
        default=Path("indexes"),
        description="Index directory path"
    )
    upload_dir: Path = Field(
        default=Path("uploads"),
        description="Upload directory path"
    )

    # API Configuration
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(
        default_factory=lambda: int(os.environ.get("PORT", 8080)),
        description="API port (defaults to PORT env var for Cloud Run compatibility)"
    )
    api_prefix: str = Field(default="/api/v1", description="API prefix")
    cors_origins: list[str] = Field(
        default=["*"],
        description="CORS allowed origins"
    )



    # Logging
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    log_format: str = Field(
        default="json",
        description="Log format (json or text)"
    )

    # UI Configuration
    ui_title: str = Field(
        default="RAG Scholar - Research Assistant",
        description="UI page title"
    )
    ui_page_icon: str = Field(
        default="📚",
        description="UI page icon (can be emoji or text)"
    )
    show_debug_info: bool = Field(
        default=False,
        description="Show debug information in UI"
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=100,
        description="API requests per minute per session"
    )
    upload_limit_per_hour: int = Field(
        default=10,
        description="File uploads per hour per session"
    )
    max_concurrent_websockets: int = Field(
        default=5,
        description="Maximum concurrent WebSocket connections per IP"
    )

    # Session Configuration
    session_timeout_minutes: int = Field(
        default=60,
        description="Session timeout in minutes"
    )
    max_session_history: int = Field(
        default=20,
        description="Maximum messages to keep in session history"
    )

    # Search Configuration
    max_search_results: int = Field(
        default=20,
        description="Maximum search results to return"
    )
    min_similarity_score: float = Field(
        default=0.1,
        description="Minimum similarity score for search results",
        ge=0.0,
        le=1.0
    )

    @field_validator("data_dir", "index_dir", "upload_dir")
    def create_directories(cls, v: Path) -> Path:
        """Ensure directories exist."""
        v.mkdir(parents=True, exist_ok=True)
        return v

    def get_domain_config(self, domain: DomainType) -> dict[str, Any]:
        """Get configuration for a specific domain."""
        configs = {
            DomainType.LAW: {
                "system_prompt": "You are a meticulous legal research assistant...",
                "chunk_size": 1500,
                "retrieval_k": 7,
                "temperature": 0.0,
            },
            DomainType.SCIENCE: {
                "system_prompt": "You are a scientific research assistant...",
                "chunk_size": 2000,
                "retrieval_k": 5,
                "temperature": 0.1,
            },
            DomainType.MEDICINE: {
                "system_prompt": "You are a medical research assistant...",
                "chunk_size": 1500,
                "retrieval_k": 6,
                "temperature": 0.0,
            },
            DomainType.COMPUTER_SCIENCE: {
                "system_prompt": "You are a computer science research assistant...",
                "chunk_size": 2000,
                "retrieval_k": 5,
                "temperature": 0.2,
            },
            DomainType.BUSINESS: {
                "system_prompt": "You are a business research analyst...",
                "chunk_size": 1800,
                "retrieval_k": 5,
                "temperature": 0.1,
            },
            DomainType.HUMANITIES: {
                "system_prompt": "You are a humanities research assistant...",
                "chunk_size": 2000,
                "retrieval_k": 4,
                "temperature": 0.3,
            },
            DomainType.GENERAL: {
                "system_prompt": "You are a knowledgeable research assistant...",
                "chunk_size": 1500,
                "retrieval_k": 5,
                "temperature": 0.1,
            },
        }
        return configs.get(domain, configs[DomainType.GENERAL])


def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings(openai_api_key=os.getenv("OPENAI_API_KEY", ""))
