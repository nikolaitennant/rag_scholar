"""Encryption utilities for sensitive data like API keys."""

from cryptography.fernet import Fernet
import base64
import os
from typing import Optional

class APIKeyEncryption:
    """Encrypt and decrypt API keys using Fernet (symmetric encryption)."""

    def __init__(self, encryption_key: Optional[str] = None):
        """Initialize with encryption key from environment or provided key."""
        if encryption_key:
            self.key = encryption_key.encode()
        else:
            # Get from environment or generate
            env_key = os.getenv("ENCRYPTION_KEY")
            if env_key:
                self.key = env_key.encode()
            else:
                # Generate a new key (only for first run)
                self.key = Fernet.generate_key()
                print(f"⚠️  Generated new encryption key. Add to Doppler: ENCRYPTION_KEY={self.key.decode()}")

        self.cipher = Fernet(self.key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext string and return base64 encoded result."""
        if not plaintext:
            return ""

        encrypted = self.cipher.encrypt(plaintext.encode())
        return base64.b64encode(encrypted).decode()

    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt a base64 encoded encrypted string."""
        if not encrypted_text:
            return ""

        try:
            decoded = base64.b64decode(encrypted_text.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception:
            # If decryption fails, might be unencrypted legacy data
            # Return as-is for backward compatibility
            return encrypted_text
