"""Complete LangChain Runnable pipeline for RAG Scholar."""

import structlog
from typing import Dict, Any, List

from langchain_core.runnables import RunnablePassthrough, RunnableSequence
from langchain_google_firestore import FirestoreChatMessageHistory
from langchain_openai import ChatOpenAI

from .langchain_tools import LANGCHAIN_TOOLS
from .langchain_prompts import get_domain_prompt_template, DomainType
from .langchain_citations import CitationParser, format_citation_response

logger = structlog.get_logger()


class LangChainRAGPipeline:
    """Production LangChain pipeline with proper Runnables."""

    def __init__(self, settings):
        self.settings = settings

        # Initialize LLM with tools
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.chat_model,
            temperature=settings.chat_temperature,
        ).bind_tools(LANGCHAIN_TOOLS)

        # Domain-specific prompts (will be selected dynamically)
        self.domain_prompts = {
            domain: get_domain_prompt_template(domain)
            for domain in DomainType
        }

    def _format_context(self, docs: List[Dict[str, Any]]) -> str:
        """Format retrieved documents into context string."""
        if not docs:
            return "No relevant documents found."

        formatted = []
        for i, doc in enumerate(docs, 1):
            source = doc.get('source', 'Unknown')
            content = doc.get('content', '')
            formatted.append(f"[{i}] Source: {source}\\n{content}")

        return "\\n\\n".join(formatted)

    def _build_rag_chain(self, domain: DomainType = DomainType.GENERAL):
        """Build domain-specific RAG chain."""

        prompt_template = self.domain_prompts[domain]

        # Create the pipeline: context formatting → prompt → LLM
        return RunnableSequence(
            RunnablePassthrough.assign(
                context=lambda x: self._format_context(x.get("context_docs", []))
            ),
            prompt_template,
            self.llm,
        )

    async def chat_with_history(
        self,
        question: str,
        context_docs: list[dict],
        session_id: str,
        user_id: str,
    ) -> dict:
        """Chat with conversation history and RAG context."""

        try:
            # Get chat history
            history = FirestoreChatMessageHistory(
                session_id=session_id,
                user_id=user_id,
                collection_name="chat_sessions"
            )

            # Prepare input for the chain
            chain_input = {
                "question": question,
                "context_docs": context_docs,
                "chat_history": history.messages,
            }

            # Build and run the chain
            rag_chain = self._build_rag_chain()
            response = await rag_chain.ainvoke(chain_input)

            # Add to history
            history.add_user_message(question)
            history.add_ai_message(response)

            # Extract sources
            sources = [doc.get("source", "Unknown") for doc in context_docs]

            logger.info("RAG chat completed",
                       session_id=session_id,
                       user_id=user_id,
                       context_count=len(context_docs))

            return {
                "response": response,
                "session_id": session_id,
                "sources": sources,
                "context_count": len(context_docs)
            }

        except Exception as e:
            logger.error("RAG pipeline failed",
                        session_id=session_id,
                        user_id=user_id,
                        error=str(e))

            return {
                "response": "I'm sorry, I encountered an error processing your message.",
                "session_id": session_id,
                "sources": [],
                "context_count": 0
            }

    async def simple_chat(self, question: str, context_docs: list[dict] = None) -> str:
        """Simple chat without history for one-off questions."""

        try:
            chain_input = {
                "question": question,
                "context_docs": context_docs or [],
                "chat_history": [],
            }

            rag_chain = self._build_rag_chain()
            response = await rag_chain.ainvoke(chain_input)
            return response

        except Exception as e:
            logger.error("Simple chat failed", error=str(e))
            return "I'm sorry, I encountered an error processing your message."