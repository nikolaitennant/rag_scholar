"""Enhanced chat service preserving all existing features."""

import re
import uuid
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from rag_scholar.config.settings import DomainType, Settings
from rag_scholar.core.domains import DomainFactory
from rag_scholar.services.memory_service import MemoryService
from rag_scholar.services.retrieval_service import RetrievalService
from rag_scholar.services.session_manager import SessionManager
from rag_scholar.services.user_service import user_service


class SpecialCommand(BaseModel):
    """Special command configuration."""

    prefix: str
    permanent: bool = False
    response_template: str = ""


class ChatService:
    """Enhanced chat service with all original features."""

    # Special commands from original implementation
    COMMANDS = {
        "remember": SpecialCommand(
            prefix="remember:",
            permanent=True,
            response_template="Fact remembered permanently.",
        ),
        "memo": SpecialCommand(
            prefix="memo:",
            permanent=False,
            response_template="Session-only fact added.",
        ),
        "role": SpecialCommand(
            prefix="role:", permanent=False, response_template="Persona set: {value}"
        ),
        "background": SpecialCommand(
            prefix="background:", permanent=False, response_template=""
        ),
    }

    def __init__(
        self,
        settings: Settings,
        retrieval_service: RetrievalService,
        session_manager: SessionManager,
        memory_service: MemoryService,
    ):
        self.settings = settings
        self.retrieval_service = retrieval_service
        self.session_manager = session_manager
        self.memory_service = memory_service

        # Initialize LLM
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            temperature=settings.temperature,
        )

        # Citation pattern from original
        self.citation_pattern = re.compile(r"\[#(\d+)\]")

    async def process_query(
        self,
        query: str,
        domain: DomainType | None = None,
        session_id: str | None = None,
        selected_documents: list[str] | None = None,
        active_class: str | None = None,
        user_context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Process query with special commands and features."""

        # Use default domain if not specified
        domain = domain or self.settings.default_domain

        # Get or create session
        session_id = session_id or str(uuid.uuid4())
        session = await self.session_manager.get_session(session_id)

        # Initialize session state if needed
        if "memory_facts" not in session:
            session["memory_facts"] = []
        if "session_facts" not in session:
            session["session_facts"] = []
        if "persona" not in session:
            session["persona"] = None
        if "active_class" not in session:
            session["active_class"] = active_class or "default"

        # Check for special commands
        query_lower = query.lower()

        # Handle remember command
        if query_lower.startswith("remember:"):
            fact = query.split(":", 1)[1].strip()
            session["memory_facts"].append(fact)
            await self.session_manager.save_session(session_id, session)
            return {
                "answer": self.COMMANDS["remember"].response_template,
                "citations": [],
                "domain": domain.value,
                "session_id": session_id,
                "command": "remember",
            }

        # Handle memo command
        if query_lower.startswith("memo:"):
            fact = query.split(":", 1)[1].strip()
            session["session_facts"].append(fact)
            await self.session_manager.save_session(session_id, session)
            return {
                "answer": self.COMMANDS["memo"].response_template,
                "citations": [],
                "domain": domain.value,
                "session_id": session_id,
                "command": "memo",
            }

        # Handle role/persona command
        if query_lower.startswith("role:"):
            persona = query.split(":", 1)[1].strip()
            session["persona"] = persona
            await self.session_manager.save_session(session_id, session)
            return {
                "answer": self.COMMANDS["role"].response_template.format(value=persona),
                "citations": [],
                "domain": domain.value,
                "session_id": session_id,
                "command": "role",
            }

        # Handle background mode (general knowledge without citations)
        if query_lower.startswith("background:"):
            stripped_query = query.split(":", 1)[1].strip()
            return await self._handle_background(stripped_query, domain, session_id)

        # Standard RAG processing
        return await self._handle_rag_query(
            query=query,
            domain=domain,
            session=session,
            session_id=session_id,
            selected_documents=selected_documents,
            active_class=active_class,
        )

    async def _handle_background(
        self,
        query: str,
        domain: DomainType,
        session_id: str,
    ) -> dict[str, Any]:
        """Handle background mode queries (no citations required)."""

        system_prompt = (
            "Background mode: Answer from your general knowledge. "
            "Begin your response with '**Background (uncited):**'. "
            "Provide comprehensive, educational answers without needing citations."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ]

        response = await self.llm.ainvoke(messages)
        answer = response.content

        # Ensure proper formatting
        if not answer.startswith("**Background (uncited):**"):
            answer = f"**Background (uncited):** {answer}"

        return {
            "answer": answer,
            "citations": [],
            "domain": domain.value,
            "session_id": session_id,
            "mode": "background",
        }

    async def _handle_rag_query(
        self,
        query: str,
        domain: DomainType,
        session: dict,
        session_id: str,
        selected_documents: list[str] | None,
        active_class: str | None,
    ) -> dict[str, Any]:
        """Handle standard RAG queries with citations."""

        # Get domain handler
        domain_handler = DomainFactory.create(domain)

        # Enhance query with domain knowledge
        enhanced_query = domain_handler.enhance_query(query)

        # Determine collection based on domain
        if domain != DomainType.GENERAL:
            collection = domain.value  # Use domain directly as collection name
        else:
            collection = active_class or session.get("active_class", "default")

        # Retrieve relevant documents
        retrieved_docs = await self.retrieval_service.retrieve(
            query=enhanced_query,
            collection=collection,
            selected_files=selected_documents,
            k=self.settings.retrieval_k,
        )

        # Check if we have enough information
        if (
            not retrieved_docs
            and not session["memory_facts"]
            and not session["session_facts"]
        ):
            # For casual conversation (greetings, simple questions), allow basic responses
            casual_patterns = [
                "hello",
                "hi",
                "hey",
                "how are you",
                "what's up",
                "good morning",
                "good afternoon",
                "good evening",
                "thanks",
                "thank you",
                "bye",
                "goodbye",
                "who are you",
                "what do you do",
                "help",
            ]

            if any(pattern in query.lower() for pattern in casual_patterns):
                # Allow basic conversational response
                domain_prompts = domain_handler.get_prompts()
                messages = [
                    SystemMessage(
                        content=f"{domain_prompts.system_prompt}\n\nFor casual conversation, you can respond naturally without requiring document context."
                    ),
                    HumanMessage(content=query),
                ]

                response = await self.llm.ainvoke(messages)
                return {
                    "answer": response.content,
                    "citations": [],
                    "domain": domain.value,
                    "session_id": session_id,
                    "conversational": True,
                }

            return {
                "answer": (
                    "I don't have enough information in the provided material to answer that.\n\n"
                    "(If you'd like general background on this topic, "
                    "type 'background:' before your question.)"
                ),
                "citations": [],
                "domain": domain.value,
                "session_id": session_id,
                "no_context": True,
            }

        # Build context with citations
        context, citation_map = self._build_context_with_citations(
            retrieved_docs, domain_handler
        )

        # Get domain prompts
        prompts = domain_handler.get_prompts()

        # Build messages
        messages = []

        # System prompt with persona if set
        system_content = prompts.system_prompt
        if session.get("persona"):
            system_content += f"\n\nAdopt this persona: {session['persona']}"
        messages.append(SystemMessage(content=system_content))

        # Add remembered facts
        for fact in session["memory_facts"]:
            messages.append(SystemMessage(content=f"Remembered fact: {fact}"))

        for fact in session["session_facts"]:
            messages.append(SystemMessage(content=f"Session fact: {fact}"))

        # Add context
        if context:
            messages.append(SystemMessage(content=f"Context:\n{context}"))

        # Add memory context using MemoryService
        memory_context = self.memory_service.get_context_for_query(
            session_id, domain.value, include_summary=True
        )
        if memory_context:
            messages.append(
                SystemMessage(content=f"Conversation Memory:\n{memory_context}")
            )

        # Add conversation history (last 8 messages) - keep existing functionality
        if session.get("history"):
            messages.extend(session["history"][-8:])

        # Add current query
        messages.append(HumanMessage(content=query))

        # Get response
        response = await self.llm.ainvoke(messages)
        answer = response.content

        # Validate citations
        answer = self._validate_citations(answer, citation_map)

        # Extract used citations
        citations = self._extract_citations(answer, citation_map, retrieved_docs)

        # Add messages to memory service for enhanced memory functionality
        self.memory_service.add_message(session_id, domain.value, "user", query)
        self.memory_service.add_message(
            session_id, domain.value, "assistant", answer, citations
        )

        # Update session history (keep existing functionality for compatibility)
        if "history" not in session:
            session["history"] = []
        session["history"].append(HumanMessage(content=query))
        session["history"].append(SystemMessage(content=answer))

        # Keep history manageable
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]

        await self.session_manager.save_session(session_id, session)

        # Update user statistics if user_id is provided
        if user_id:  # noqa: F821
            await user_service.update_user_stats(user_id, "chat", 1)  # noqa: F821

            # Add domain to user's explored domains if it's a new domain
            if domain:
                await user_service.add_domain_explored(user_id, domain.value)  # noqa: F821

        return {
            "answer": answer,
            "citations": citations,
            "domain": domain.value,
            "session_id": session_id,
            "active_class": collection,
        }

    async def stream_query(
        self,
        query: str,
        domain: DomainType | None = None,
        session_id: str | None = None,
        selected_documents: list[str] | None = None,
        user_context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ):
        """Stream query responses."""
        # For now, just call process_query and yield the complete response
        # In the future, this could be enhanced to stream token by token
        result = await self.process_query(
            query=query,
            domain=domain,
            session_id=session_id,
            selected_documents=selected_documents,
            user_context=user_context,
            user_id=user_id,
        )

        # Yield the complete response as a JSON string
        import json

        yield f"data: {json.dumps(result)}\n\n"

    def _build_context_with_citations(
        self,
        documents: list[dict],
        domain_handler,
    ) -> tuple[str, dict[int, dict]]:
        """Build context string with citation mapping."""

        if not documents:
            return "", {}

        context_parts = []
        citation_map = {}

        for i, doc in enumerate(documents, 1):
            # Create citation entry
            citation_map[i] = {
                "source": doc.get("source", "Unknown"),
                "page": doc.get("page"),
                "preview": doc["content"][:200] + "...",
                "full": doc["content"],
            }

            # Add to context
            context_parts.append(f"[#{i}]\n{doc['content']}")

        return "\n\n".join(context_parts), citation_map

    def _validate_citations(self, answer: str, citation_map: dict) -> str:
        """Validate and clean up citations in answer."""

        # Find all citations in answer
        cited_nums = self.citation_pattern.findall(answer)

        # Check for invalid citations
        invalid_cites = [num for num in cited_nums if int(num) not in citation_map]

        # If invalid citations or generic placeholder, return safe message
        if invalid_cites or "[#]" in answer:
            return (
                "I don't have enough information in the provided "
                "material to answer that question with proper citations."
            )

        return answer

    def _extract_citations(
        self,
        answer: str,
        citation_map: dict,
        documents: list[dict],
    ) -> list[dict]:
        """Extract and format citations from answer."""

        # Find citation numbers in answer
        cited_nums = set(self.citation_pattern.findall(answer))

        citations = []
        for num_str in cited_nums:
            num = int(num_str)
            if num in citation_map:
                cite_info = citation_map[num]
                # Find corresponding document for score
                doc_idx = num - 1
                score = (
                    documents[doc_idx].get("score", 0.0)
                    if doc_idx < len(documents)
                    else 0.0
                )

                citations.append(
                    {
                        "id": num,
                        "source": cite_info["source"],
                        "page": cite_info.get("page"),
                        "preview": cite_info["preview"],
                        "relevance_score": score,
                    }
                )

        return sorted(citations, key=lambda x: x["id"])

    async def switch_class(
        self,
        session_id: str,
        new_class: str,
    ) -> dict[str, Any]:
        """Switch active class/collection."""

        session = await self.session_manager.get_session(session_id)
        old_class = session.get("active_class", "default")

        # Save current class state
        if "class_states" not in session:
            session["class_states"] = {}

        session["class_states"][old_class] = {
            "history": session.get("history", []),
            "session_facts": session.get("session_facts", []),
        }

        # Load new class state
        if new_class in session["class_states"]:
            state = session["class_states"][new_class]
            session["history"] = state.get("history", [])
            session["session_facts"] = state.get("session_facts", [])
        else:
            session["history"] = []
            session["session_facts"] = []

        session["active_class"] = new_class
        await self.session_manager.save_session(session_id, session)

        return {
            "message": f"Switched to class: {new_class}",
            "previous_class": old_class,
            "active_class": new_class,
        }

    async def get_memory_info(self, session_id: str, domain_id: str) -> dict[str, Any]:
        """Get memory information for a session and domain."""
        return self.memory_service.get_session_info(session_id, domain_id)

    async def clear_memory(self, session_id: str, domain_id: str) -> None:
        """Clear memory for a session and domain."""
        self.memory_service.clear_session(session_id, domain_id)

    async def remember_fact(
        self, session_id: str, domain_id: str, key: str, value: str
    ) -> None:
        """Remember a fact in the session context."""
        self.memory_service.remember_fact(session_id, domain_id, key, value)
