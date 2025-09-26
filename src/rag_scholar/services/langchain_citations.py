"""Enhanced citation extraction with document grouping and metadata."""

import re
from typing import List, Dict, Any
from collections import defaultdict


def extract_citations_from_response(text: str, context_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract citations with enhanced grouping and metadata for better UX."""

    # Standard citation pattern
    citation_pattern = re.compile(r'\[#(\d+)\]')
    citation_matches = citation_pattern.findall(text)
    citation_ids = [int(match) for match in citation_matches]

    # Group citations by source document
    sources_map = defaultdict(list)
    citations = []

    for cite_id in set(citation_ids):
        if cite_id <= len(context_docs):
            doc = context_docs[cite_id - 1]  # 1-indexed

            # Extract metadata with fallbacks
            source_title = doc.get('title') or doc.get('source', f'Document {cite_id}')
            page_num = doc.get('page', doc.get('page_number'))
            line_start = doc.get('line_start')
            line_end = doc.get('line_end')

            # Create enhanced citation
            citation = {
                "id": cite_id,
                "source_title": source_title,
                "source_file": doc.get('source', ''),
                "page": page_num,
                "line_start": line_start,
                "line_end": line_end,
                "content": doc.get('content', ''),
                "preview": _create_preview(doc.get('content', '')),
                "summary": doc.get('summary', ''),  # For chunk summaries
                "relevance_score": doc.get('score', 1.0)
            }

            citations.append(citation)
            sources_map[source_title].append(citation)

    # Create grouped sources for display
    grouped_sources = []
    for source_title, source_citations in sources_map.items():
        # Get all pages for this source
        pages = sorted(set(c['page'] for c in source_citations if c['page'] is not None))

        # Create page range display
        page_display = _format_page_range(pages) if pages else None

        # Get the source file from any citation
        source_file = next((c['source_file'] for c in source_citations if c['source_file']), '')

        grouped_sources.append({
            "title": source_title,
            "file": source_file,
            "pages": pages,
            "page_display": page_display,
            "citations": source_citations,
            "chunk_count": len(source_citations)
        })

    # Sort citations by ID for inline display
    citations.sort(key=lambda x: x["id"])

    # Sort grouped sources alphabetically
    grouped_sources.sort(key=lambda x: x["title"])

    return {
        "response": text,
        "citations": citations,
        "grouped_sources": grouped_sources,
        "sources": list(sources_map.keys())
    }


def _create_preview(content: str, max_length: int = 150) -> str:
    """Create a clean preview of content."""
    if not content:
        return ""

    # Clean up content
    cleaned = re.sub(r'\s+', ' ', content.strip())

    if len(cleaned) <= max_length:
        return cleaned

    # Find last complete sentence within limit
    truncated = cleaned[:max_length]
    last_sentence = truncated.rfind('.')

    if last_sentence > max_length * 0.5:  # If we can keep most of the text
        return truncated[:last_sentence + 1]

    return truncated + "..."


def _format_page_range(pages: List[int]) -> str:
    """Format page numbers into readable ranges (e.g., '12-14, 16')."""
    if not pages:
        return ""

    if len(pages) == 1:
        return f"p. {pages[0]}"

    # Group consecutive pages
    ranges = []
    start = pages[0]
    end = pages[0]

    for page in pages[1:]:
        if page == end + 1:
            end = page
        else:
            if start == end:
                ranges.append(str(start))
            else:
                ranges.append(f"{start}-{end}")
            start = end = page

    # Add final range
    if start == end:
        ranges.append(str(start))
    else:
        ranges.append(f"{start}-{end}")

    return f"pp. {', '.join(ranges)}"


def is_meaningful_query(query: str) -> bool:
    """Check if query is meaningful enough for RAG processing."""
    if not query or len(query.strip()) < 3:
        return False

    # Check if query has at least one alphabetic word
    words = re.findall(r'\b[a-zA-Z]+\b', query.strip())
    if len(words) == 0:
        return False

    # Check token count (rough estimate)
    tokens = query.strip().split()
    if len(tokens) < 2:
        return False

    return True