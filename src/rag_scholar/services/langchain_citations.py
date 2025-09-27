"""Enhanced citation extraction with document grouping and metadata."""

import re
from typing import List, Dict, Any
from collections import defaultdict
from .citation_validator import CitationValidator


def extract_citations_from_response(text: str, context_docs: List[Dict[str, Any]], validate_citations: bool = False) -> Dict[str, Any]:
    """Extract citations with enhanced grouping and metadata for better UX."""

    # Apply citation validation if enabled
    if validate_citations and context_docs:
        try:
            validator = CitationValidator()
            validated_result = validator.enhance_citations_with_validation(text, context_docs)

            # Convert [#n] markers to [CITE:n] for frontend inline citation system
            processed_text = validated_result["response"]
            for i in range(1, len(context_docs) + 1):
                processed_text = processed_text.replace(f'[#{i}]', f'[CITE:{i}]')

            return {
                "response": processed_text,
                "citations": validated_result["citations"],
                "grouped_sources": _create_grouped_sources(validated_result["citations"]),
                "sources": [c["source"] for c in validated_result["citations"]],
                "validation_stats": validated_result.get("validation_stats", {})
            }
        except Exception as e:
            # Fall back to original processing if validation fails
            print(f"Citation validation failed: {e}")

    # Original citation processing (fallback)
    citation_pattern = re.compile(r'\[#(\d+)\]')
    citation_matches = citation_pattern.findall(text)
    citation_ids = [int(match) for match in citation_matches]

    # If no citations found in text but context docs exist, add citations automatically
    if not citation_matches and context_docs:
        # Add citation markers at the end of the first few sentences/paragraphs
        processed_text = _add_automatic_citations(text, len(context_docs))
        # Re-extract citation patterns
        citation_matches = re.findall(r'\[#(\d+)\]', processed_text)
        citation_ids = [int(match) for match in citation_matches]
    else:
        processed_text = text

    # Convert [#n] markers to [CITE:n] for frontend inline citation system
    for match in sorted(set(citation_matches), key=int, reverse=True):
        processed_text = processed_text.replace(f'[#{match}]', f'[CITE:{match}]')

    # First pass: build a map of source files to their preferred display names
    source_file_to_name = {}
    for i, doc in enumerate(context_docs, 1):
        # Extract metadata with fallbacks - prioritize actual document names
        # For PDFs, prefer a combination of title and source filename
        metadata = doc.get('metadata', {})
        pdf_title = metadata.get('title')
        source_file = doc.get('source') or metadata.get('source')

        if source_file not in source_file_to_name:
            # Create a more descriptive source name for PDFs
            if source_file and source_file.endswith('.pdf') and pdf_title and pdf_title != 'Title':
                # Use a descriptive format like "Data1050, Fall '22 — Lecture 8: SQL & Relational Algebra"
                # Extract the actual title from the document content if available
                content = doc.get('content', '')
                if 'Data1050' in content and 'Lecture' in content:
                    # Extract the lecture title from content
                    lines = content.split('\n')
                    for j, line in enumerate(lines):
                        if 'Data1050' in line and j + 1 < len(lines):
                            source_file_to_name[source_file] = f"{lines[j].strip()}, {lines[j+1].strip()}"
                            break
                    else:
                        source_file_to_name[source_file] = source_file
                else:
                    source_file_to_name[source_file] = source_file
            else:
                source_file_to_name[source_file] = (
                    doc.get('title') or
                    source_file or
                    f'Document {i}'
                )

    # Group citations by source document
    sources_map = defaultdict(list)
    citations = []

    for cite_id in set(citation_ids):
        if cite_id <= len(context_docs):
            doc = context_docs[cite_id - 1]  # 1-indexed

            # Use the mapped source name for consistency
            source_file = doc.get('source') or doc.get('metadata', {}).get('source')
            source_title = source_file_to_name.get(source_file, f'Document {cite_id}')
            page_num = doc.get('page', doc.get('page_number'))
            line_start = doc.get('line_start')
            line_end = doc.get('line_end')

            # Create enhanced citation compatible with new frontend format
            citation = {
                "id": cite_id,
                "source": source_title,  # Frontend expects 'source' field
                "page": page_num,
                "line": line_start,  # Frontend expects 'line' field
                "preview": _create_preview(doc.get('content', '')),
                "summary": doc.get('summary', ''),
                "confidence": doc.get('score', 1.0),  # Frontend expects 'confidence'
                "document_type": _extract_document_type(doc.get('source', '')),
                "full_text": doc.get('content', ''),  # Keep for backward compatibility
                "relevance_score": doc.get('score', 1.0)  # Keep for backward compatibility
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
        source_file = next((c.get('source', '') for c in source_citations if c.get('source')), '')

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
        "response": processed_text,  # Text with [CITE:n] markers for frontend
        "citations": citations,
        "grouped_sources": grouped_sources,
        "sources": list(sources_map.keys())
    }


def _extract_document_type(source: str) -> str:
    """Extract document type from source filename."""
    if not source:
        return "document"

    source_lower = source.lower()
    if source_lower.endswith('.pdf'):
        return "pdf"
    elif source_lower.endswith(('.doc', '.docx')):
        return "doc"
    elif source_lower.endswith(('.txt', '.md')):
        return "text"
    elif source_lower.endswith(('.html', '.htm')):
        return "html"
    else:
        return "document"


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


def _create_grouped_sources(citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Create grouped sources from citations."""
    sources_map = defaultdict(list)

    for citation in citations:
        source_title = citation.get('source', 'Unknown')
        sources_map[source_title].append(citation)

    grouped_sources = []
    for source_title, source_citations in sources_map.items():
        # Get all pages for this source
        pages = sorted(set(c.get('page') for c in source_citations if c.get('page') is not None))

        # Create page range display
        page_display = _format_page_range(pages) if pages else None

        grouped_sources.append({
            "title": source_title,
            "file": source_citations[0].get('source', ''),
            "pages": pages,
            "page_display": page_display,
            "citations": source_citations,
            "chunk_count": len(source_citations)
        })

    # Sort grouped sources alphabetically
    grouped_sources.sort(key=lambda x: x["title"])
    return grouped_sources


def _add_automatic_citations(text: str, num_docs: int) -> str:
    """Add citation markers to text when LLM failed to include them."""
    if not text or num_docs == 0:
        return text

    # Split text into sentences, handling multiple sentence endings
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    if not sentences:
        return text

    # Add citations to key sentences (first few sentences that contain substantial information)
    result_sentences = []
    citation_count = 0

    for i, sentence in enumerate(sentences):
        # Skip very short sentences (less than 20 chars) as they're likely not substantial claims
        if len(sentence.strip()) < 20:
            result_sentences.append(sentence)
            continue

        # Add citation to substantial sentences, cycling through available documents
        if citation_count < num_docs and i < min(len(sentences), num_docs + 2):
            citation_num = (citation_count % num_docs) + 1
            # Insert citation before the final punctuation
            if sentence.rstrip().endswith(('.', '!', '?')):
                sentence = sentence.rstrip()[:-1] + f' [#{citation_num}]' + sentence.rstrip()[-1]
            else:
                sentence = sentence.rstrip() + f' [#{citation_num}]'
            citation_count += 1

        result_sentences.append(sentence)

    return ' '.join(result_sentences)


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


def is_conversational_query(query: str) -> bool:
    """Check if query is a simple conversational greeting or social interaction."""
    if not query:
        return False

    query_lower = query.strip().lower()

    # Simple greetings and conversational patterns
    conversational_patterns = [
        # Direct greetings
        r'^(hi|hello|hey|hiya|howdy)$',
        r'^(hi|hello|hey|hiya|howdy)[.!]*$',

        # How are you variants
        r'^(how are you|how\'re you|how are ya)[\?\!\.]*$',
        r'^(what\'s up|whats up|wassup)[\?\!\.]*$',
        r'^(how\'s it going|hows it going)[\?\!\.]*$',

        # Good morning/evening etc
        r'^(good morning|good afternoon|good evening|good night)[\!\.\,]*$',

        # Thanks and responses
        r'^(thanks|thank you|thx|ty)[\!\.\,]*$',
        r'^(you\'re welcome|youre welcome|no problem|np)[\!\.\,]*$',

        # Simple affirmatives/negatives
        r'^(yes|yeah|yep|yup|ok|okay|sure|fine)[\!\.\,]*$',
        r'^(no|nope|nah)[\!\.\,]*$',

        # Goodbye
        r'^(bye|goodbye|see ya|see you|cya|later)[\!\.\,]*$',
    ]

    for pattern in conversational_patterns:
        if re.match(pattern, query_lower):
            return True

    return False