"""Pytest configuration and fixtures."""

import asyncio
import os
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Set test environment
os.environ["OPENAI_API_KEY"] = "test-key-12345"
os.environ["DEBUG"] = "true"

from rag_scholar.config.settings import get_settings
from rag_scholar.main import create_app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def settings():
    """Get test settings."""
    return get_settings()


@pytest.fixture
def app():
    """Create FastAPI app for testing."""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
async def async_client(app):
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_openai():
    """Mock OpenAI API calls."""
    mock = Mock()
    mock.invoke.return_value.content = "Test response from AI"
    mock.ainvoke.return_value.content = "Test async response from AI"
    return mock


@pytest.fixture
def test_data_dir(tmp_path):
    """Create temporary test data directory."""
    data_dir = tmp_path / "test_data"
    data_dir.mkdir()
    return data_dir


@pytest.fixture
def sample_document():
    """Sample document content for testing."""
    return {
        "content": "This is a test document about artificial intelligence and machine learning.",
        "source": "test_document.txt",
        "metadata": {"author": "Test Author", "date": "2024-01-01"}
    }
