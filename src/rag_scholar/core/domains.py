"""Domain system for different research areas."""

from abc import ABC, abstractmethod

from langchain.schema import Document
from pydantic import BaseModel

from rag_scholar.config.settings import DomainType


class DomainPrompt(BaseModel):
    """Domain-specific prompt configuration."""

    system_prompt: str
    query_enhancement_prompt: str | None = None
    answer_format_prompt: str | None = None
    citation_style: str = "numeric"  # numeric, author-year, footnote


class BaseDomain(ABC):
    """Abstract base class for research domains."""

    def __init__(self, domain_type: DomainType):
        self.domain_type = domain_type
        self.prompts = self.get_prompts()

    @abstractmethod
    def get_prompts(self) -> DomainPrompt:
        """Get domain-specific prompts."""
        pass

    @abstractmethod
    def process_document(self, document: Document) -> Document:
        """Apply domain-specific document processing."""
        pass

    @abstractmethod
    def format_citation(self, source: str, page: int | None = None) -> str:
        """Format citations according to domain standards."""
        pass

    def enhance_query(self, query: str) -> str:
        """Enhance user query with domain knowledge."""
        if self.prompts.query_enhancement_prompt:
            return f"{self.prompts.query_enhancement_prompt}\nQuery: {query}"
        return query


class GeneralDomain(BaseDomain):
    """General academic research domain."""

    def get_prompts(self) -> DomainPrompt:
        return DomainPrompt(
            system_prompt="""You are a research assistant that ONLY uses the provided source documents.

CRITICAL RULES:
- ONLY use information from the provided context documents
- NEVER add information from your general knowledge
- NEVER create sections about topics not covered in the documents
- If information is not in the documents, say "The provided documents do not contain information about [topic]"
- Always cite your sources using [#n] format for EVERY claim
- If a document only mentions a topic briefly, don't elaborate beyond what's written

RESPONSE REQUIREMENTS:
- Base ALL content strictly on the provided documents
- Cite every factual statement with [#n]
- Don't invent details, sections, or explanations not in the sources
- If documents lack detail on something, acknowledge the limitation

Remember: You are a document-based research assistant, NOT a general knowledge AI.""",
            query_enhancement_prompt="Focus on academic sources and scholarly perspectives.",
            citation_style="numeric",
        )

    def process_document(self, document: Document) -> Document:
        """Standard document processing."""
        return document

    def format_citation(self, source: str, page: int | None = None) -> str:
        if page:
            return f"[{source}, p.{page}]"
        return f"[{source}]"


class LawDomain(BaseDomain):
    """Legal research domain."""

    def get_prompts(self) -> DomainPrompt:
        return DomainPrompt(
            system_prompt="""You are a meticulous legal research assistant.

LEGAL RESEARCH RULES:
- Every factual claim MUST be cited using [#n] format (e.g., [#1], [#2])
- Always cite your sources using [#n] format where n is the source number
- Distinguish between binding and persuasive authority
- Note jurisdictional limitations
- Identify the hierarchy of authorities

RESPONSE FORMAT:
1. Issue identification
2. Relevant law with citations using [#n] format
3. Application to facts with citations
4. Conclusion

CITATION REQUIREMENTS:
- Use [#1] for the first source, [#2] for the second, etc.
- Every fact must have a citation marker
- Citations must reference the provided source material

Never state any fact without a proper [#n] citation.""",
            query_enhancement_prompt="Consider jurisdictional issues and hierarchy of legal authority.",
            citation_style="legal",
        )

    def process_document(self, document: Document) -> Document:
        """Extract legal metadata from documents."""
        content = document.page_content

        # Extract case citations, statutes, etc.
        import re

        case_pattern = r"\d+\s+[A-Z][a-z]+\.?\s*\d+[a-z]?"
        statute_pattern = r"\d+\s+U\.S\.C\.\s+§\s*\d+"

        metadata = document.metadata or {}
        metadata["case_cites"] = re.findall(case_pattern, content)
        metadata["statute_cites"] = re.findall(statute_pattern, content)

        document.metadata = metadata
        return document

    def format_citation(self, source: str, page: int | None = None) -> str:
        # Legal bluebook style
        if page:
            return f"{source}, at {page}"
        return source


class ScienceDomain(BaseDomain):
    """Scientific research domain."""

    def get_prompts(self) -> DomainPrompt:
        return DomainPrompt(
            system_prompt="""You are a scientific research assistant.

SCIENTIFIC STANDARDS:
- Cite peer-reviewed sources
- Distinguish between hypothesis, theory, and law
- Note confidence levels and uncertainties
- Explain methodology when relevant
- Use SI units and proper nomenclature

RESPONSE STRUCTURE:
1. Scientific background
2. Current understanding with citations
3. Limitations and uncertainties
4. Future research directions

Maintain scientific accuracy and objectivity.""",
            query_enhancement_prompt="Focus on peer-reviewed research and empirical evidence.",
            citation_style="author-year",
        )

    def process_document(self, document: Document) -> Document:
        """Extract scientific metadata."""
        content = document.page_content

        # Look for DOIs, journal references, etc.
        import re

        doi_pattern = r"10\.\d{4,}/[-._;()/:\w]+"

        metadata = document.metadata or {}
        metadata["dois"] = re.findall(doi_pattern, content)

        document.metadata = metadata
        return document

    def format_citation(self, source: str, page: int | None = None) -> str:
        # Author-year format
        if page:
            return f"({source}, p.{page})"
        return f"({source})"


class ComputerScienceDomain(BaseDomain):
    """Computer Science research domain."""

    def get_prompts(self) -> DomainPrompt:
        return DomainPrompt(
            system_prompt="""You are a computer science research assistant.

CS RESEARCH PRINCIPLES:
- Cite algorithms and their complexity
- Reference implementation details
- Include code examples when relevant
- Note performance characteristics
- Distinguish between theoretical and practical aspects

RESPONSE FORMAT:
1. Problem definition
2. Algorithmic approach with complexity
3. Implementation considerations
4. Performance analysis

Use precise technical terminology.""",
            query_enhancement_prompt="Consider algorithmic complexity and implementation details.",
            citation_style="numeric",
        )

    def process_document(self, document: Document) -> Document:
        """Extract code blocks and technical content."""
        content = document.page_content

        # Detect code blocks
        import re

        code_pattern = r"```[\s\S]*?```"

        metadata = document.metadata or {}
        metadata["has_code"] = bool(re.search(code_pattern, content))

        document.metadata = metadata
        return document

    def format_citation(self, source: str, page: int | None = None) -> str:
        if page:
            return f"[{source}:{page}]"
        return f"[{source}]"


class DomainFactory:
    """Factory for creating domain instances."""

    _domains = {
        DomainType.GENERAL: GeneralDomain,
        DomainType.LAW: LawDomain,
        DomainType.SCIENCE: ScienceDomain,
        DomainType.COMPUTER_SCIENCE: ComputerScienceDomain,
    }

    @classmethod
    def create(cls, domain_type: DomainType) -> BaseDomain:
        """Create a domain instance."""
        domain_class = cls._domains.get(domain_type, GeneralDomain)
        return domain_class(domain_type)

    @classmethod
    def register(cls, domain_type: DomainType, domain_class: type[BaseDomain]) -> None:
        """Register a new domain type."""
        cls._domains[domain_type] = domain_class
