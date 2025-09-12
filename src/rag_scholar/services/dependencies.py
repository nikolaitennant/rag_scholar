"""Dependency injection for services."""

from functools import lru_cache

from rag_scholar.config.settings import get_settings
from rag_scholar.services.document_service import DocumentService
from rag_scholar.services.enhanced_chat_service import ChatService
from rag_scholar.services.memory_service import MemoryService
from rag_scholar.services.retrieval_service import RetrievalService
from rag_scholar.services.session_manager import SessionManager

# Cache service instances
_services = {}


@lru_cache
def get_retrieval_service() -> RetrievalService:
    """Get retrieval service instance."""
    if "retrieval" not in _services:
        settings = get_settings()
        _services["retrieval"] = RetrievalService(settings)
    return _services["retrieval"]


@lru_cache
def get_session_manager() -> SessionManager:
    """Get session manager instance."""
    if "session" not in _services:
        settings = get_settings()
        _services["session"] = SessionManager(settings)
    return _services["session"]


@lru_cache
def get_memory_service() -> MemoryService:
    """Get memory service instance."""
    if "memory" not in _services:
        settings = get_settings()
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.llm_model,
                temperature=0.3,
            )
            _services["memory"] = MemoryService(llm)
        except Exception:
            # Fallback if OpenAI is not available
            _services["memory"] = MemoryService()
    return _services["memory"]


@lru_cache
def get_chat_service() -> ChatService:
    """Get chat service instance."""
    if "chat" not in _services:
        settings = get_settings()
        retrieval = get_retrieval_service()
        session = get_session_manager()
        memory = get_memory_service()
        _services["chat"] = ChatService(settings, retrieval, session, memory)
    return _services["chat"]


@lru_cache
def get_document_service() -> DocumentService:
    """Get document service instance."""
    if "document" not in _services:
        settings = get_settings()
        retrieval = get_retrieval_service()
        _services["document"] = DocumentService(settings, retrieval)
    return _services["document"]
