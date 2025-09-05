"""Dependency injection for services."""

from functools import lru_cache

from rag_scholar.config.settings import get_settings
from rag_scholar.services.document_service import DocumentService
from rag_scholar.services.enhanced_chat_service import ChatService
from rag_scholar.services.retrieval_service import RetrievalService
from rag_scholar.services.session_manager import SessionManager

# Cache service instances
_services = {}


@lru_cache()
def get_retrieval_service() -> RetrievalService:
    """Get retrieval service instance."""
    if "retrieval" not in _services:
        settings = get_settings()
        _services["retrieval"] = RetrievalService(settings)
    return _services["retrieval"]


@lru_cache()
def get_session_manager() -> SessionManager:
    """Get session manager instance."""
    if "session" not in _services:
        settings = get_settings()
        _services["session"] = SessionManager(settings)
    return _services["session"]


@lru_cache()
def get_chat_service() -> ChatService:
    """Get chat service instance."""
    if "chat" not in _services:
        settings = get_settings()
        retrieval = get_retrieval_service()
        session = get_session_manager()
        _services["chat"] = ChatService(settings, retrieval, session)
    return _services["chat"]


@lru_cache()
def get_document_service() -> DocumentService:
    """Get document service instance."""
    if "document" not in _services:
        settings = get_settings()
        retrieval = get_retrieval_service()
        _services["document"] = DocumentService(settings, retrieval)
    return _services["document"]