"""Enhanced chat service preserving all existing features."""

import re
import uuid
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from rag_scholar.config.settings import DomainType, Settings
from rag_scholar.core.domains import DomainFactory
from rag_scholar.services.retrieval_service import RetrievalService
from rag_scholar.services.session_manager import SessionManager


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
            response_template="Fact remembered permanently."
        ),
        "memo": SpecialCommand(
            prefix="memo:",
            permanent=False,
            response_template="Session-only fact added."
        ),
        "role": SpecialCommand(
            prefix="role:",
            permanent=False,
            response_template="Persona set: {value}"
        ),
        "background": SpecialCommand(
            prefix="background:",
            permanent=False,
            response_template=""
        ),
    }
    
    def __init__(
        self,
        settings: Settings,
        retrieval_service: RetrievalService,
        session_manager: SessionManager,
    ):
        self.settings = settings
        self.retrieval_service = retrieval_service
        self.session_manager = session_manager
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.llm_model,
            temperature=settings.temperature,
        )
        
        # Citation pattern from original
        self.citation_pattern = re.compile(r'\[#(\d+)\]')
    
    async def process_query(
        self,
        query: str,
        domain: Optional[DomainType] = None,
        session_id: Optional[str] = None,
        selected_documents: Optional[List[str]] = None,
        active_class: Optional[str] = None,
    ) -> Dict[str, Any]:
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
            return await self._handle_background(
                stripped_query, domain, session_id
            )
        
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
    ) -> Dict[str, Any]:
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
        session: Dict,
        session_id: str,
        selected_documents: Optional[List[str]],
        active_class: Optional[str],
    ) -> Dict[str, Any]:
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
        if not retrieved_docs and not session["memory_facts"] and not session["session_facts"]:
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
        
        # Add conversation history (last 8 messages)
        if session.get("history"):
            messages.extend(session["history"][-8:])
        
        # Add current query
        messages.append(HumanMessage(content=query))
        
        # Get response
        response = await self.llm.ainvoke(messages)
        answer = response.content
        
        # Validate citations
        answer = self._validate_citations(answer, citation_map)
        
        # Update session history
        if "history" not in session:
            session["history"] = []
        session["history"].append(HumanMessage(content=query))
        session["history"].append(SystemMessage(content=answer))
        
        # Keep history manageable
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]
        
        await self.session_manager.save_session(session_id, session)
        
        # Extract used citations
        citations = self._extract_citations(answer, citation_map, retrieved_docs)
        
        return {
            "answer": answer,
            "citations": citations,
            "domain": domain.value,
            "session_id": session_id,
            "active_class": collection,
        }
    
    def _build_context_with_citations(
        self,
        documents: List[Dict],
        domain_handler,
    ) -> tuple[str, Dict[int, Dict]]:
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
    
    def _validate_citations(self, answer: str, citation_map: Dict) -> str:
        """Validate and clean up citations in answer."""
        
        # Find all citations in answer
        cited_nums = self.citation_pattern.findall(answer)
        
        # Check for invalid citations
        invalid_cites = [
            num for num in cited_nums
            if int(num) not in citation_map
        ]
        
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
        citation_map: Dict,
        documents: List[Dict],
    ) -> List[Dict]:
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
                score = documents[doc_idx].get("score", 0.0) if doc_idx < len(documents) else 0.0
                
                citations.append({
                    "id": num,
                    "source": cite_info["source"],
                    "page": cite_info.get("page"),
                    "preview": cite_info["preview"],
                    "relevance_score": score,
                })
        
        return sorted(citations, key=lambda x: x["id"])
    
    async def switch_class(
        self,
        session_id: str,
        new_class: str,
    ) -> Dict[str, Any]:
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