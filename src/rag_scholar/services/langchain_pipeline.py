"""LangChain built-in retrieval pipeline for RAG Scholar."""

import structlog
from typing import Dict, Any, List

from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_firestore import FirestoreChatMessageHistory
from langchain_openai import ChatOpenAI

from .langchain_tools import LANGCHAIN_TOOLS
from .langchain_prompts import get_domain_prompt_template, DomainType

logger = structlog.get_logger()


class LangChainRAGPipeline:
    """Production LangChain pipeline using only built-in components."""

    def __init__(self, settings):
        self.settings = settings

        # Initialize LLM
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.chat_model,
            temperature=settings.chat_temperature,
        )

        # Create agent with tools (standard LangChain approach)
        self.agent_executor = self._create_agent()

    def _create_agent(self):
        """Create tool-calling agent with built-in chains."""

        # Create a strict document-only prompt for the agent
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strict document-based research assistant. You MUST follow these rules:

STRICT DOCUMENT-ONLY POLICY:
- NEVER answer questions without provided documents
- NEVER use general knowledge or background information
- ONLY respond based on the uploaded documents in the context

TOOL USAGE (RESTRICTED):
- If user's question starts with "/background", use the background_knowledge tool
- If user asks to remember something permanently, use the remember_fact tool
- If user asks to memo something for this session, use the memo_for_session tool
- If user asks to adopt a role/persona, use the set_persona tool
- DO NOT use background_knowledge tool unless user explicitly requests it with "/background"

DOCUMENT ANALYSIS (REQUIRED):
- Base ALL responses STRICTLY on provided documents only
- Always cite sources using [#n] format for EVERY claim
- If no documents provided, say "No relevant documents found. Please upload documents first or use '/background [your question]' for general knowledge."
- If documents don't contain information about the topic, say "The uploaded documents do not contain information about [topic]. Please upload relevant documents or use '/background [your question]'."
"""),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

        # Create agent with tools
        agent = create_tool_calling_agent(self.llm, LANGCHAIN_TOOLS, prompt)

        return AgentExecutor(
            agent=agent,
            tools=LANGCHAIN_TOOLS,
            verbose=True,
            handle_parsing_errors=True,
        )

    def _build_rag_chain(self, user_id: str = None, class_id: str = None):
        """Build proper retrieval chain using LangChain's create_retrieval_chain."""

        from .langchain_ingestion import LangChainIngestionPipeline

        # Create document chain for processing retrieved docs
        system_prompt = """Use the following context to answer the question. Always cite sources using [#n] format.

Context: {context}"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}")  # LangChain retrieval chains expect "input" not "question"
        ])

        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)

        # Get proper retriever if user_id provided
        if user_id:
            ingestion_pipeline = LangChainIngestionPipeline(self.settings)
            retriever = ingestion_pipeline.get_retriever(user_id, class_id)

            # Create full retrieval chain
            return create_retrieval_chain(retriever, question_answer_chain)
        else:
            # For cases where we pass documents directly, use the document chain
            return question_answer_chain

    async def chat_with_history(
        self,
        question: str,
        context_docs: list[dict],
        session_id: str,
        user_id: str,
        class_id: str = None,
    ) -> dict:
        """Chat using built-in LangChain agent with tools."""

        try:
            # Get chat history using user-scoped collection
            history = FirestoreChatMessageHistory(
                session_id=session_id,
                collection=f"users/{user_id}/chat_sessions"
            )

            # Check if we have any documents - if not, return strict message
            if not context_docs:
                no_docs_message = "No relevant documents found. Please upload documents first or use '/background [your question]' for general knowledge."

                # Add to history
                history.add_user_message(question)
                history.add_ai_message(no_docs_message)

                # Store session metadata even when no docs found
                await self._store_session_metadata(user_id, session_id, class_id, question)

                return {
                    "response": no_docs_message,
                    "session_id": session_id,
                    "sources": [],
                    "context_count": 0
                }

            # Format context documents for the agent
            formatted_docs = []
            for i, doc in enumerate(context_docs, 1):
                source = doc.get('source', 'Unknown')
                content = doc.get('content', '')
                formatted_docs.append(f"[{i}] Source: {source}\n{content}")
            context_text = f"\n\nRelevant documents:\n{chr(10).join(formatted_docs)}"

            # Prepare input for the agent
            agent_input = {
                "input": f"{question}{context_text}",
                "chat_history": history.messages,
            }

            # Run the agent
            response = await self.agent_executor.ainvoke(agent_input)

            # Extract response content
            response_content = response.get("output", "")

            # Add to history
            history.add_user_message(question)
            history.add_ai_message(response_content)

            # Store session metadata with class_id for filtering
            await self._store_session_metadata(user_id, session_id, class_id, question)

            # Extract sources
            sources = [doc.get("source", "Unknown") for doc in context_docs]

            logger.info("RAG chat completed",
                       session_id=session_id,
                       user_id=user_id,
                       context_count=len(context_docs))

            return {
                "response": response_content,
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

    async def simple_chat(self, question: str, user_id: str = None, class_id: str = None, context_docs: list[dict] = None) -> str:
        """Simple chat using proper LangChain retrieval chain."""

        try:
            if user_id:
                # Use retrieval chain that automatically searches documents
                rag_chain = self._build_rag_chain(user_id, class_id)
                response = await rag_chain.ainvoke({"input": question})
                return response.get("answer", "")
            else:
                # Use document chain with provided context
                from langchain_core.documents import Document
                docs = [Document(page_content=doc["content"], metadata=doc.get("metadata", {}))
                       for doc in (context_docs or [])]

                document_chain = self._build_rag_chain()
                response = await document_chain.ainvoke({
                    "context": docs,
                    "input": question
                })
                return response

        except Exception as e:
            logger.error("Simple chat failed", error=str(e))
            return "I'm sorry, I encountered an error processing your message."

    async def _generate_chat_name(self, question: str) -> str:
        """Generate a concise, descriptive name for the chat based on the user's question."""
        try:
            from langchain_openai import ChatOpenAI
            from langchain.schema import HumanMessage, SystemMessage

            # Use a fast, cheap model for naming
            llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0.3,
                max_tokens=20,
                openai_api_key=self.settings.openai_api_key
            )

            system_prompt = """Create a concise, descriptive title (3-6 words) for a chat session based on the user's first message.
The title should capture the main topic or question. Do not use quotation marks.

Examples:
"What is photosynthesis?" → "Photosynthesis Basics"
"How do I calculate derivatives in calculus?" → "Calculus Derivatives Help"
"Explain the causes of World War I" → "World War I Causes"
"What are the symptoms of depression?" → "Depression Symptoms Guide"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"User's message: {question}")
            ]

            response = await llm.ainvoke(messages)
            generated_name = response.content.strip()

            # Fallback if generation fails or is too long
            if not generated_name or len(generated_name) > 50:
                return question[:40] + "..." if len(question) > 40 else question

            return generated_name

        except Exception as e:
            logger.warning("Failed to generate chat name with LLM", error=str(e))
            # Fallback to simple truncation
            return question[:40] + "..." if len(question) > 40 else question

    async def _store_session_metadata(self, user_id: str, session_id: str, class_id: str, question: str):
        """Store session metadata for filtering and organization."""
        try:
            from google.cloud import firestore
            from datetime import datetime, timezone

            db = firestore.Client(project=self.settings.google_cloud_project)
            session_ref = db.collection(f"users/{user_id}/chat_sessions").document(session_id)

            # Check if session document exists, if not create it
            session_doc = session_ref.get()
            if not session_doc.exists:
                # Generate a better name using LLM
                chat_name = await self._generate_chat_name(question)

                # Create new session with metadata
                session_data = {
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "class_id": class_id,
                    "name": chat_name,
                }
                session_ref.set(session_data)
            else:
                # Update existing session - always update timestamp when new message added
                session_ref.update({
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "class_id": class_id,  # Update class_id in case it changed
                })

        except Exception as e:
            logger.error("Failed to store session metadata", error=str(e), session_id=session_id)