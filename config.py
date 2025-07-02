"""Configuration and constants for Giulia’s Law AI Assistant."""

from dataclasses import dataclass, field
import re

@dataclass
class AppConfig:
    """Centralised configuration so magic numbers live in one place."""
    # Directories
    BASE_CTX_DIR: str = "classes_context"
    INDEX_PREFIX: str = "faiss_"
    CTX_DIR = None  # will be set after the user picks a class
    INDEX_DIR = None

    # Retrieval
    FIRST_K: int = 30
    FINAL_K: int = 4
    RELEVANCE_THRESHOLD: float = 0.3

    # Models
    LLM_MODEL: str = "gpt-4.1-mini"
    SUMMARY_MODEL: str = "gpt-4.1-mini"

    # Memory
    SESSION_WINDOW: int = 8
    MAX_TOKEN_LIMIT: int = 800

    # UI
    GREETING_COOLDOWN: int = 3600  # seconds
    TONES: tuple[str, ...] = ("funny", "nice")

    # Regex
    INLINE_RE: re.Pattern = field(default_factory=lambda: re.compile(r"\[\s*#(\d+)\s*\]"))



