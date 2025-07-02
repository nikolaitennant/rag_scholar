"""Stable citation ID registry and helper functions."""
from __future__ import annotations
from typing import Dict, Tuple, Optional, Set
from .config import CONFIG

class CitationManager:
    """Assigns & tracks consistent [#id] per (file, page)."""

    def __init__(self):
        self._ids: Dict[Tuple[str, Optional[int]], int] = {}
        self._next: int = 1

    # ------------------------------------------------------------------ #
    def assign(self, file: str, page: Optional[int]) -> int:
        key = (file, page)
        if key not in self._ids:
            self._ids[key] = self._next; self._next += 1
        return self._ids[key]

    # ------------------------------------------------------------------ #
    @staticmethod
    def extract(text: str) -> Set[int]:
        """Return the set of citation numbers used in *text*."""
        return {int(n) for n in CONFIG.inline_re.findall(text)}