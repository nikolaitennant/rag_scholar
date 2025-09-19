"""Standard citation extraction using built-in LangChain utilities."""

import re
from typing import List, Dict, Any


def extract_citations_from_response(text: str, context_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract citations using standard regex and format for API response."""

    # Standard citation pattern
    citation_pattern = re.compile(r'\[#(\d+)\]')
    citation_matches = citation_pattern.findall(text)
    citation_ids = [int(match) for match in citation_matches]

    # Build response using standard approach
    citations = []
    sources_used = set()

    for cite_id in set(citation_ids):
        if cite_id <= len(context_docs):
            doc = context_docs[cite_id - 1]  # 1-indexed
            source = doc.get('source', f'Document {cite_id}')

            citations.append({
                "id": cite_id,
                "source": source,
                "preview": doc.get('content', '')[:200] + "..." if len(doc.get('content', '')) > 200 else doc.get('content', ''),
                "relevance_score": doc.get('score', 1.0)
            })
            sources_used.add(source)

    # Sort citations by ID
    citations.sort(key=lambda x: x["id"])

    return {
        "response": text,
        "citations": citations,
        "sources": list(sources_used)
    }