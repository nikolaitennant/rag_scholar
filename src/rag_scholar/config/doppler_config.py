"""Doppler configuration for secure secret management."""

import os
from typing import Optional
import structlog

logger = structlog.get_logger()

class DopplerConfig:
    """Secure configuration management using Doppler or fallback to environment."""

    def __init__(self):
        self.doppler_enabled = self._check_doppler_available()

    def _check_doppler_available(self) -> bool:
        """Check if Doppler is configured and available."""
        return bool(os.getenv('DOPPLER_TOKEN') or os.getenv('DOPPLER_PROJECT'))

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get secret securely from Doppler or environment fallback."""
        try:
            if self.doppler_enabled:
                # Try Doppler first (when configured)
                return os.getenv(key, default)
            else:
                # Fallback to environment variables
                value = os.getenv(key, default)
                if value and key.lower() in ['openai_api_key', 'api_key']:
                    # Log that we're using user-provided API key (secure)
                    logger.info(f"Using user-provided API key for {key}")
                return value
        except Exception as e:
            logger.warning(f"Failed to retrieve secret {key}: {e}")
            return default

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return os.getenv('ENVIRONMENT', 'dev').lower() in ['production', 'prod']

# Global instance
doppler_config = DopplerConfig()