"""Test configuration settings."""

import pytest
from pydantic import ValidationError

from rag_scholar.config.settings import DomainType, Settings


class TestSettings:
    """Test settings configuration."""

    def test_default_settings(self):
        """Test default settings are valid."""
        settings = Settings(openai_api_key="test-key")

        assert settings.app_name == "RAG Scholar"
        assert settings.default_domain == DomainType.GENERAL
        assert settings.llm_model == "gpt-4-turbo-preview"
        assert settings.chunk_size == 1500
        assert settings.retrieval_k == 5

    def test_domain_config(self):
        """Test domain-specific configuration."""
        settings = Settings(openai_api_key="test-key")

        # Test law domain config
        law_config = settings.get_domain_config(DomainType.LAW)
        assert "legal research assistant" in law_config["system_prompt"].lower()
        assert law_config["temperature"] == 0.0

        # Test science domain config
        science_config = settings.get_domain_config(DomainType.SCIENCE)
        assert (
            "scientific research assistant" in science_config["system_prompt"].lower()
        )

    def test_required_openai_key(self):
        """Test that OpenAI API key is required."""
        with pytest.raises(ValidationError):
            Settings()

    def test_validation_constraints(self):
        """Test settings validation."""
        # Valid settings
        settings = Settings(
            openai_api_key="test-key", temperature=0.5, chunk_size=1000, retrieval_k=10
        )
        assert settings.temperature == 0.5

        # Invalid temperature
        with pytest.raises(ValidationError):
            Settings(openai_api_key="test-key", temperature=3.0)

        # Invalid chunk size
        with pytest.raises(ValidationError):
            Settings(openai_api_key="test-key", chunk_size=50)

        # Invalid retrieval_k
        with pytest.raises(ValidationError):
            Settings(openai_api_key="test-key", retrieval_k=0)
