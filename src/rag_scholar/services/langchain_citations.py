"""LangChain output parsers for citation handling."""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from langchain_core.output_parsers import BaseOutputParser
from pydantic import BaseModel, Field


@dataclass
class Citation:
    """Citation data structure."""
    id: int
    source: str
    page: Optional[int] = None
    preview: str = ""
    relevance_score: float = 1.0


class CitationResponse(BaseModel):
    """Response with extracted citations."""
    content: str = Field(description="Main response content")
    citations: List[Citation] = Field(description="Extracted citations")
    sources_used: List[str] = Field(description="List of source documents referenced")


class CitationParser(BaseOutputParser[CitationResponse]):
    """Parse citations from LLM responses."""

    def __init__(self, context_docs: List[Dict[str, Any]] = None):
        super().__init__()
        self.context_docs = context_docs or []
        self.citation_pattern = re.compile(r'\\[#(\\d+)\\]')

    def parse(self, text: str) -> CitationResponse:
        """Parse citations from response text."""

        # Find all citation markers
        citation_matches = self.citation_pattern.findall(text)
        citation_ids = [int(match) for match in citation_matches]

        # Build citation objects
        citations = []
        sources_used = set()

        for cite_id in set(citation_ids):  # Remove duplicates
            if cite_id <= len(self.context_docs):
                doc = self.context_docs[cite_id - 1]  # 1-indexed
                source = doc.get('source', f'Document {cite_id}')

                citation = Citation(
                    id=cite_id,
                    source=source,
                    preview=doc.get('content', '')[:200] + "..." if len(doc.get('content', '')) > 200 else doc.get('content', ''),
                    relevance_score=doc.get('score', 1.0)
                )
                citations.append(citation)
                sources_used.add(source)

        # Sort citations by ID
        citations.sort(key=lambda x: x.id)

        return CitationResponse(
            content=text,
            citations=citations,
            sources_used=list(sources_used)
        )

    @property
    def _type(self) -> str:
        return "citation_parser"


def format_citation_response(response: CitationResponse) -> Dict[str, Any]:
    """Format citation response for API."""

    return {
        "response": response.content,
        "citations": [
            {
                "id": cite.id,
                "source": cite.source,
                "page": cite.page,
                "preview": cite.preview,
                "relevance_score": cite.relevance_score
            }
            for cite in response.citations
        ],
        "sources": response.sources_used
    }