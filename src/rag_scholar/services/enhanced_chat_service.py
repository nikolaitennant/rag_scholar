"""Enhanced chat service preserving all existing features."""

import logging
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

logger = logging.getLogger(__name__)


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
            # Use class_id if available, otherwise use active_class parameter or default
            session["active_class"] = session.get("class_id") or active_class or "default"

        # If active_class parameter is provided and different from session, update session
        # But prioritize class_id over class names
        if active_class and active_class != session.get("active_class"):
            # Check if active_class looks like a class ID (hex string)
            if len(active_class) <= 16 and all(c in '0123456789abcdef' for c in active_class.lower()):
                # It's a class ID, store it properly
                session["class_id"] = active_class
                session["active_class"] = active_class
            elif session.get("class_id"):
                # We have a class_id in session, don't override with class name
                pass  # Keep existing class_id
            else:
                # No class_id in session, use the provided active_class (could be name)
                session["active_class"] = active_class
        if "domain" not in session:
            session["domain"] = domain.value

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
            user_id=user_id,
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
        session: dict[str, Any],
        session_id: str,
        selected_documents: list[str] | None,
        active_class: str | None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        """Handle standard RAG queries with citations."""

        # Get domain handler
        domain_handler = DomainFactory.create(domain)

        # Enhance query with domain knowledge
        enhanced_query = domain_handler.enhance_query(query)

        # Determine collection: prioritize class IDs over names
        collection = None

        # First, try to use class_id from session (most reliable)
        if session.get("class_id"):
            collection = session.get("class_id")
        # Then check if active_class parameter looks like a class ID
        elif active_class and len(active_class) <= 16 and all(c in '0123456789abcdef' for c in active_class.lower()):
            collection = active_class
        # Then fall back to active_class from session (could be name or ID)
        elif session.get("active_class") and session.get("active_class") != "default":
            session_active = session.get("active_class")
            if len(session_active) <= 16 and all(c in '0123456789abcdef' for c in session_active.lower()):
                collection = session_active  # It's an ID
            else:
                # It's a class name - this should not be used as collection
                # Log a warning and fall back to domain
                print(f"⚠️  WARNING: Using class name '{session_active}' as collection - should use class ID")
                collection = domain.value
        # Finally, fall back to domain
        else:
            collection = domain.value

        print(f"🔍 COLLECTION: '{collection}' (active_class: {active_class}, session_class_id: {session.get('class_id')}, session_class: {session.get('active_class')}, domain: {domain.value})")
        if selected_documents:
            print(f"🔍 SELECTED DOCS: {selected_documents}")


        # Retrieve relevant documents (temporarily disable selected_files filtering)
        retrieved_docs = await self.retrieval_service.retrieve(
            query=enhanced_query,
            collection=collection,
            selected_files=None,  # Temporarily disable filtering
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
        citations = await self._extract_citations(answer, citation_map, retrieved_docs)

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

        # Auto-generate session name at key intervals
        message_count = len(session.get("history", []))
        if message_count in [1, 10, 20] and not session.get("name_locked", False):
            await self._update_session_name(session_id, session)

        # Update user statistics if user_id is provided
        if user_id:
            await user_service.update_user_stats(user_id, "chat", 1)

            # Add domain to user's explored domains if it's a new domain
            if domain:
                await user_service.add_domain_explored(user_id, domain.value)

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
        active_class: str | None = None,
        user_context: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> Any:
        """Stream query responses."""
        # For now, just call process_query and yield the complete response
        # In the future, this could be enhanced to stream token by token
        result = await self.process_query(
            query=query,
            domain=domain,
            session_id=session_id,
            selected_documents=selected_documents,
            active_class=active_class,
            user_context=user_context,
            user_id=user_id,
        )

        # Yield the complete response as a JSON string
        import json

        yield f"data: {json.dumps(result)}\n\n"

    def _build_context_with_citations(
        self,
        documents: list[dict[str, Any]],
        domain_handler: Any,
    ) -> tuple[str, dict[int, dict[str, Any]]]:
        """Build context string with citation mapping."""

        if not documents:
            return "", {}

        context_parts = []
        citation_map = {}

        for i, doc in enumerate(documents, 1):
            # Create citation entry with longer, more useful preview
            content = doc["content"]
            # Take first 500 chars or up to end of sentence, whichever comes first
            preview_length = min(500, len(content))
            preview = content[:preview_length]

            # Try to end at a sentence boundary for better readability
            if preview_length < len(content):
                last_period = preview.rfind('. ')
                last_newline = preview.rfind('\n')
                if last_period > 200:  # Only if we have a reasonable amount of text
                    preview = preview[:last_period + 1]
                elif last_newline > 200:
                    preview = preview[:last_newline]
                else:
                    preview = preview + "..."

            citation_map[i] = {
                "source": doc.get("source", "Unknown"),
                "page": doc.get("page"),
                "preview": preview,
                "full": content,
            }

            # Add to context
            context_parts.append(f"[#{i}]\n{doc['content']}")

        return "\n\n".join(context_parts), citation_map

    def _validate_citations(
        self, answer: str, citation_map: dict[int, dict[str, Any]]
    ) -> str:
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

    async def _extract_citations(
        self,
        answer: str,
        citation_map: dict[int, dict[str, Any]],
        documents: list[dict[str, Any]],
        ) -> list[dict[str, Any]]:
        """Extract and format citations from answer with enhanced summaries."""

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

                # Get full text from the document
                full_text = documents[doc_idx].get("page_content", cite_info["preview"])

                # Generate smart summary using fast LLM or simple fallback
                if self.settings.use_llm_citation_summaries:
                    summary = await self._generate_smart_summary(full_text, answer)
                else:
                    summary = self._generate_simple_summary(full_text)

                citations.append(
                    {
                        "id": num,
                        "source": cite_info["source"],
                        "page": cite_info.get("page"),
                        "preview": cite_info["preview"],
                        "summary": summary,
                        "full_text": full_text,
                        "relevance_score": score,
                    }
                )

        return sorted(citations, key=lambda x: x["id"])

    async def _generate_smart_summary(self, full_text: str, answer_context: str) -> str:
        """Generate a smart summary using fast LLM."""
        try:
            # Use the fast citation LLM model
            citation_llm = ChatOpenAI(
                model=self.settings.citation_llm_model,
                temperature=0.1,
                max_tokens=60,  # Keep it short and fast
                api_key=self.settings.openai_api_key
            )

            prompt = f"""Summarize this source text in 1 clear sentence (max 50 words) explaining what information it provides:

Source: {full_text[:400]}

Context: This supports an answer about: {answer_context[:100]}

Summary:"""

            messages = [
                SystemMessage(content="You are an expert at creating concise, informative citation summaries."),
                HumanMessage(content=prompt)
            ]

            response = await citation_llm.ainvoke(messages)
            summary = str(response.content).strip()

            # Fallback to simple if too long or empty
            if not summary or len(summary) > 200:
                return self._generate_simple_summary(full_text)

            return summary

        except Exception as e:
            logger.warning(f"Failed to generate smart summary, falling back to simple: {e}")
            return self._generate_simple_summary(full_text)

    def _generate_simple_summary(self, full_text: str) -> str:
        """Generate a simple, fast summary of the citation content."""
        try:
            # Take first sentence or first 150 characters, whichever is shorter
            text = full_text.strip()

            # Find first sentence
            sentence_endings = ['. ', '.\n', '? ', '?\n', '! ', '!\n']
            first_sentence_end = len(text)

            for ending in sentence_endings:
                pos = text.find(ending)
                if pos != -1 and pos < first_sentence_end:
                    first_sentence_end = pos + 1

            # Get first sentence or 150 chars max
            if first_sentence_end < 150:
                summary = text[:first_sentence_end].strip()
            else:
                summary = text[:150].strip()
                if not summary.endswith('.'):
                    summary += "..."

            return summary if summary else "Source provides supporting evidence for the cited claim."

        except Exception as e:
            logger.warning(f"Failed to generate simple summary: {e}")
            return "Source provides supporting evidence for the cited claim."

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

    async def _update_session_name(self, session_id: str, session: dict[str, Any]) -> None:
        """Generate and update session name using AI."""
        try:
            import logging
            from datetime import datetime

            logger = logging.getLogger(__name__)

            messages = session.get("history", [])
            if not messages:
                return

            # Get first user message for context
            first_user_message = None
            recent_messages = []

            for msg in messages:
                if hasattr(msg, "content"):
                    content = msg.content
                    msg_type = getattr(msg, "type", "unknown")
                elif isinstance(msg, dict):
                    content = msg.get("content", "")
                    msg_type = msg.get("type", msg.get("role", "unknown"))
                else:
                    continue

                if msg_type in ["human", "user"] and not first_user_message:
                    first_user_message = content

                # Collect recent messages for context (last 6)
                recent_messages.append(f"{msg_type}: {content[:100]}")

            if not first_user_message:
                return

            # Build context from recent messages
            recent_context = "\n".join(recent_messages[-6:])

            # Generate title using GPT-3.5
            prompt = f"""Generate a short, descriptive title (2-5 words) for a chat session. The title should be concise and capture the main topic.

First message: "{first_user_message[:200]}"

Recent conversation context:
{recent_context}

Examples of good titles:
- "Python Data Analysis"
- "Recipe for Pasta"
- "Travel to Japan"
- "Resume Writing Help"
- "Machine Learning Basics"

Generate only the title, no quotes or extra text:"""

            llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3, max_tokens=30)
            from langchain_core.messages import SystemMessage, HumanMessage

            messages_for_llm = [
                SystemMessage(content="You generate concise, descriptive chat titles."),
                HumanMessage(content=prompt)
            ]

            response = await llm.ainvoke(messages_for_llm)
            title = str(response.content).strip().strip('"').strip("'")

            # Fallback if AI response is too long or empty
            if not title or len(title) > 50:
                words = first_user_message.split()[:3]
                title = " ".join(words).title() if words else f"Chat - {datetime.now().strftime('%m/%d %H:%M')}"

            # Update session with new name
            session["name"] = title
            session["updated_at"] = datetime.now().isoformat()
            await self.session_manager.save_session(session_id, session)

            logger.info(f"Updated session {session_id} name to: {title}")

        except Exception as e:
            logger.error(f"Failed to update session name: {e}")
            # Don't fail the entire chat operation if naming fails
