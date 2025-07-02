"""Configuration and constants for Giulia’s Law AI Assistant."""

from dataclasses import dataclass, field
import re

@dataclass
class AppConfig:
    """Centralised configuration so magic numbers live in one place."""
    # Directories
    BASE_CTX_DIR: str = "classes_context"
    INDEX_PREFIX: str = "faiss_"

    # Retrieval
    FIRST_K: int = 30
    FINAL_K: int = 4

    # Models
    LLM_MODEL: str = "gpt-4.1-mini"
    SUMMARY_MODEL: str = "gpt-3.5-turbo-0125"

    # Memory
    SESSION_WINDOW: int = 8
    MAX_TOKEN_LIMIT: int = 800

    # UI & Vibe
    GREETING_COOLDOWN: int = 3600  # seconds
    TONES: tuple[str, ...] = ("funny", "snarky", "nice")

    # Regex
    INLINE_RE: re.Pattern = field(default_factory=lambda: re.compile(r"\[\s*#(\d+)\s*\]"))