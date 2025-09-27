"""LangChain built-in retrieval pipeline for RAG Scholar."""

import structlog
from typing import Dict, Any, List

from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.memory import ConversationSummaryBufferMemory
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

        # Initialize LLM with GPT-5 compatibility
        llm_kwargs = {
            "api_key": settings.openai_api_key,
            "model": settings.chat_model,
            "temperature": settings.chat_temperature,
        }

        # GPT-5 and newer models use max_completion_tokens instead of max_tokens
        use_completion_cap = settings.chat_model.startswith(("gpt-5", "o1", "o3", "o4"))
        param = "max_completion_tokens" if use_completion_cap else "max_tokens"
        llm_kwargs[param] = settings.max_tokens

        self.llm = ChatOpenAI(**llm_kwargs)

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
- If user's question starts with "/background", use the background_knowledge tool and then answer using general knowledge
- If user asks to remember something permanently, use the remember_fact tool
- If user asks to memo something for this session, use the memo_for_session tool
- If user asks to adopt a role/persona, use the set_persona tool
- DO NOT use background_knowledge tool unless user explicitly requests it with "/background"
- When background_knowledge tool is used, ignore document restrictions and answer from general knowledge

DOCUMENT ANALYSIS (REQUIRED):
- Base ALL responses STRICTLY on provided documents only
- CRITICAL: Always cite sources using [#n] format for EVERY claim (e.g., "The data shows X [#1]. Additionally, Y was found [#2].")
- Each document will be numbered starting from 1. Reference them exactly as [#1], [#2], etc.
- DO NOT just list sources at the end - embed citations directly in the text after each claim
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
        system_prompt = """Use the following context to answer the question.

CRITICAL CITATION REQUIREMENTS:
- Always cite sources using [#n] format for EVERY claim
- Each document is numbered starting from 1. Reference them as [#1], [#2], etc.
- Embed citations directly in the text after each claim (e.g., "The data shows X [#1]. Additionally, Y was found [#2].")
- DO NOT just list sources at the end

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
        class_name: str = None,
        domain_type: str = None,
    ) -> dict:
        """Chat using built-in LangChain agent with tools."""

        try:
            # Create smart memory with summarization (ChatGPT-style)
            # Use cheaper model for summarization to reduce costs
            summary_llm = ChatOpenAI(
                api_key=self.settings.openai_api_key,
                model=self.settings.memory_summary_model,
                temperature=0.0,  # Deterministic summaries
            )

            memory = ConversationSummaryBufferMemory(
                llm=summary_llm,  # Use cost-optimized model for summaries
                chat_memory=FirestoreChatMessageHistory(
                    session_id=session_id,
                    collection=f"users/{user_id}/chat_sessions"
                ),
                max_token_limit=self.settings.memory_max_token_limit,  # Configurable
                return_messages=True,   # Compatible with agent
                ai_prefix="Assistant",
                human_prefix="User"
            )

            # Check if we have any documents - if not, return strict message
            if not context_docs:
                no_docs_message = "No relevant documents found. Please upload documents first or use '/background [your question]' for general knowledge."

                # Add to memory (will auto-summarize if needed)
                memory.save_context({"input": question}, {"output": no_docs_message})

                # Store session metadata even when no docs found and get generated name
                generated_name = await self._store_session_metadata(user_id, session_id, class_id, question, no_docs_message, class_name, domain_type)

                return {
                    "response": no_docs_message,
                    "session_id": session_id,
                    "sources": [],
                    "context_count": 0,
                    "chat_name": generated_name  # Include generated ChatGPT-style name
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
                "chat_history": memory.chat_memory.messages,
            }

            # Run the agent
            response = await self.agent_executor.ainvoke(agent_input)

            # Extract response content
            response_content = response.get("output", "")

            # Add to memory (will auto-summarize if needed)
            memory.save_context({"input": question}, {"output": response_content})

            # TODO: Store citation metadata separately if we have context docs
            # Temporarily disabled due to frontend compilation issues
            # if context_docs:
            #     try:
            #         import json
            #         from langchain_google_firestore import FirestoreChatMessageHistory
            #         from langchain_core.messages import SystemMessage
            #
            #         citation_history = FirestoreChatMessageHistory(
            #             session_id=session_id,
            #             collection=f"users/{user_id}/chat_sessions"
            #         )
            #
            #         # Store citation metadata as a system message that can be retrieved later
            #         citation_metadata = {
            #             "type": "citation_metadata",
            #             "context_docs": context_docs,
            #             "timestamp": None
            #         }
            #
            #         citation_history.add_message(SystemMessage(
            #             content=f"CITATION_METADATA: {json.dumps(citation_metadata)}"
            #         ))
            #     except Exception as e:
            #         # Don't fail the chat if citation storage fails
            #         logger.warning(f"Failed to store citation metadata: {e}")
            #         pass

            # Store session metadata with class_id for filtering and get generated name
            generated_name = await self._store_session_metadata(user_id, session_id, class_id, question, response_content, class_name, domain_type)

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
                "context_docs": context_docs,  # Pass full context docs for citation processing
                "context_count": len(context_docs),
                "chat_name": generated_name  # Include generated ChatGPT-style name
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

    async def _generate_chat_name(self, question: str, response: str = None) -> str:
        """Generate a concise, descriptive name for the chat based on the user's question and AI response."""
        try:
            from langchain_openai import ChatOpenAI
            from langchain.schema import HumanMessage, SystemMessage

            # Use configurable fast, cheap model for naming (ChatGPT-style)
            llm = ChatOpenAI(
                model=self.settings.naming_model,
                temperature=self.settings.naming_temperature,
                max_tokens=self.settings.naming_max_tokens,
                openai_api_key=self.settings.openai_api_key,
            )

            system_prompt = """Create a concise, descriptive title (3-6 words) for a chat session based on the user's message and AI response.
The title should capture the main topic or question. Do not use quotation marks.

Examples:
User: "What is photosynthesis?" AI: "Photosynthesis is the process by which plants..." → "Photosynthesis Process"
User: "How do I calculate derivatives?" AI: "To calculate derivatives in calculus..." → "Calculus Derivatives Guide"
User: "Explain World War I causes" AI: "The main causes of World War I were..." → "World War I Causes"
User: "Python error help" AI: "This error occurs when..." → "Python Error Fix"""

            # Build context from both user question and AI response (if available)
            context = f"User's message: {question}"
            if response:
                # Truncate response to first 200 chars for naming context
                truncated_response = response[:200] + "..." if len(response) > 200 else response
                context += f"\nAI response: {truncated_response}"

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=context)
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

    async def _store_session_metadata(self, user_id: str, session_id: str, class_id: str, question: str, response: str = None, class_name: str = None, domain_type: str = None) -> str:
        """Store session metadata for filtering and organization. Returns the chat name."""
        try:
            from google.cloud import firestore
            from datetime import datetime, timezone

            db = firestore.Client(project=self.settings.google_cloud_project)
            session_ref = db.collection(f"users/{user_id}/chat_sessions").document(session_id)

            # Check if session document exists, if not create it
            session_doc = session_ref.get()
            if not session_doc.exists:
                # Generate a better name using LLM (ChatGPT-style)
                chat_name = await self._generate_chat_name(question, response)

                # Create new session with metadata
                session_data = {
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "class_id": class_id,
                    "class_name": class_name,
                    "domain": domain_type,
                    "name": chat_name,
                }
                session_ref.set(session_data)
                return chat_name
            else:
                # Update existing session - always update timestamp when new message added
                existing_data = session_doc.to_dict()
                current_name = existing_data.get("name", "Chat")

                # Optionally regenerate name if current name seems generic/incomplete
                # This helps improve session names as conversations develop
                should_regenerate = (
                    current_name == "Chat" or
                    current_name.endswith("...") or
                    len(current_name) < 10 or
                    current_name.startswith("Chat ")
                )

                update_data = {
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "class_id": class_id,  # Update class_id in case it changed
                    "class_name": class_name,  # Update class_name in case it changed
                    "domain": domain_type,  # Update domain in case it changed
                }

                if should_regenerate and response:
                    # Generate a better name using the latest conversation context
                    new_name = await self._generate_chat_name(question, response)
                    if new_name and new_name != current_name:
                        update_data["name"] = new_name
                        current_name = new_name
                        logger.info("Updated session name", session_id=session_id, old_name=existing_data.get("name"), new_name=new_name)

                session_ref.update(update_data)
                return current_name

        except Exception as e:
            logger.error("Failed to store session metadata", error=str(e), session_id=session_id)
            # Fallback: return a simple name based on the question
            return question[:40] + "..." if len(question) > 40 else question