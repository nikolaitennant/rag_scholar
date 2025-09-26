"""Clean configuration for LangChain-based RAG Scholar with Doppler integration."""

import os
from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from .doppler_config import doppler_config


class DomainType(str, Enum):
    """Supported research domains."""

    GENERAL = "general"
    LAW = "law"
    SCIENCE = "science"
    MEDICINE = "medicine"
    BUSINESS = "business"
    HUMANITIES = "humanities"


class Settings(BaseSettings):
    """Clean application settings for LangChain setup."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Users must provide their own API keys - no backend fallback
    openai_api_key: str | None = Field(
        default=None,
        description="Users must provide their own OpenAI API key"
    )

    # Application
    app_name: str = Field(default="RAG Scholar", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="dev", description="Environment (dev/prod)")

    # Domain Configuration (for LangChain prompts)
    default_domain: DomainType = Field(
        default=DomainType.GENERAL, description="Default research domain"
    )
    available_domains: list[DomainType] = Field(
        default=list(DomainType), description="Available research domains"
    )

    # LangChain Model Configuration
    llm_model: str = Field(
        default="gpt-4-turbo-preview", description="LLM model to use"
    )
    chat_model: str = Field(
        default="gpt-4-turbo-preview", description="Chat model to use"
    )
    embedding_model: str = Field(
        default="text-embedding-3-small", description="Embedding model to use"
    )
    chat_temperature: float = Field(
        default=0.0, description="LLM temperature", ge=0.0, le=2.0
    )
    max_tokens: int = Field(
        default=2000, description="Maximum tokens for model responses", ge=100, le=4000
    )

    # Chat Naming Configuration (ChatGPT-style)
    naming_model: str = Field(
        default="gpt-3.5-turbo", description="Fast model for generating chat names (cost optimization)"
    )
    naming_max_tokens: int = Field(
        default=20, description="Max tokens for chat name generation", ge=5, le=50
    )
    naming_temperature: float = Field(
        default=0.3, description="Temperature for chat naming (slight creativity)", ge=0.0, le=1.0
    )

    # Memory Management Configuration
    memory_max_token_limit: int = Field(
        default=2000, description="Token limit before summarizing conversation history", ge=500, le=8000
    )
    memory_summary_model: str = Field(
        default="gpt-3.5-turbo", description="Model for conversation summarization (cost optimization)"
    )

    # LangChain Document Processing
    chunk_size: int = Field(
        default=1500, description="Document chunk size", ge=100, le=4000
    )
    chunk_overlap: int = Field(
        default=200, description="Chunk overlap size", ge=0, le=500
    )

    # Google Cloud (for Firebase Auth and Firestore Vector Store)
    google_cloud_project: str = Field(
        default_factory=lambda: doppler_config.get_secret('GOOGLE_CLOUD_PROJECT', 'ragscholarai'),
        description="Google Cloud Project ID"
    )

    # FastAPI Configuration
    api_host: str = Field(default="0.0.0.0", description="API host")  # nosec B104
    api_port: int = Field(
        default_factory=lambda: int(os.environ.get("PORT", 8080)),
        description="API port (defaults to PORT env var for Cloud Run)",
    )
    api_prefix: str = Field(default="/api/v1", description="API prefix")
    cors_origins: list[str] = Field(default=["*"], description="CORS allowed origins")

    # Authentication (Secure via Doppler)
    jwt_secret_key: str = Field(
        default_factory=lambda: doppler_config.get_secret('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production'),
        description="JWT secret key for token signing (secure via Doppler)"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_token_expire_minutes: int = Field(
        default=1440, description="JWT access token expiration in minutes (24 hours)"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=30, description="JWT refresh token expiration in days"
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format (json or text)")


def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()