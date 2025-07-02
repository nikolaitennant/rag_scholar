"""Global configuration and constants."""
from dataclasses import dataclass, field
import os, re
from dotenv import load_dotenv

load_dotenv()

INLINE_RE = re.compile(r"\[\s*#(\d+)\s*\]")

@dataclass(slots=True, frozen=True)
class Config:
    """Immutable application settings."""
    api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    base_ctx_dir: str = "classes_context"
    first_k: int = 30
    final_k: int = 4
    llm_model: str = "gpt-4.1-mini"
    session_window: int = 8
    max_token_limit: int = 800
    inline_re: re.Pattern = INLINE_RE

CONFIG = Config()