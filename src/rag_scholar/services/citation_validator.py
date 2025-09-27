"""Post-citation correction and validation system."""

import re
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
import numpy as np


class CitationValidator:
    """Validates and corrects citations using semantic similarity."""

    def __init__(self, enable_semantic_validation: bool = False):
        # Only load the model if semantic validation is explicitly enabled
        self.model = None
        if enable_semantic_validation:
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception:
                self.model = None

    def validate_and_correct_citations(
        self,
        response_text: str,
        context_docs: List[Dict[str, Any]],
        threshold: float = 0.3
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Validate citations and remove or correct unsupported claims.

        Args:
            response_text: The generated response with [#n] citations
            context_docs: List of source documents
            threshold: Minimum similarity score to keep a citation

        Returns:
            Tuple of (corrected_text, valid_citations)
        """
        if not self.model or not context_docs:
            return response_text, []

        # Extract citations and their surrounding context
        citation_pattern = re.compile(r'([^.]*?)\s*\[#(\d+)\]')
        matches = citation_pattern.findall(response_text)

        valid_citations = []
        corrections = []

        for claim_text, citation_num in matches:
            citation_idx = int(citation_num) - 1

            if citation_idx < len(context_docs):
                doc = context_docs[citation_idx]
                doc_content = doc.get('content', '')

                # Calculate semantic similarity
                similarity = self._calculate_similarity(claim_text.strip(), doc_content)

                if similarity >= threshold:
                    # Keep the citation
                    valid_citations.append({
                        'citation_num': citation_num,
                        'claim': claim_text.strip(),
                        'similarity': similarity,
                        'valid': True
                    })
                else:
                    # Mark for removal
                    corrections.append({
                        'citation_num': citation_num,
                        'claim': claim_text.strip(),
                        'similarity': similarity,
                        'valid': False
                    })

        # Apply corrections to the text
        corrected_text = self._apply_corrections(response_text, corrections)

        return corrected_text, valid_citations

    def _calculate_similarity(self, claim: str, document: str) -> float:
        """Calculate semantic similarity between claim and document."""
        if not claim or not document:
            return 0.0

        try:
            # Encode both texts
            claim_embedding = self.model.encode([claim])
            doc_embedding = self.model.encode([document])

            # Calculate cosine similarity
            similarity = np.dot(claim_embedding[0], doc_embedding[0]) / (
                np.linalg.norm(claim_embedding[0]) * np.linalg.norm(doc_embedding[0])
            )

            return float(similarity)
        except Exception:
            return 0.0

    def _apply_corrections(self, text: str, corrections: List[Dict[str, Any]]) -> str:
        """Remove invalid citations from the text."""
        corrected_text = text

        # Sort by citation number in descending order to avoid index issues
        corrections.sort(key=lambda x: int(x['citation_num']), reverse=True)

        for correction in corrections:
            if not correction['valid']:
                citation_num = correction['citation_num']
                # Remove the citation marker but keep the claim text
                pattern = f'\\[#{citation_num}\\]'
                corrected_text = re.sub(pattern, '', corrected_text)

        return corrected_text

    def enhance_citations_with_validation(
        self,
        response_text: str,
        context_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Enhanced citation processing with validation.

        Returns a dict with corrected text and citation metadata.
        """
        # First validate and correct
        corrected_text, validations = self.validate_and_correct_citations(
            response_text, context_docs
        )

        # Extract remaining valid citations
        citation_pattern = re.compile(r'\\[#(\\d+)\\]')
        citation_matches = citation_pattern.findall(corrected_text)
        citation_ids = [int(match) for match in citation_matches]

        # Build citation list
        citations = []
        for cite_id in set(citation_ids):
            if cite_id <= len(context_docs):
                doc = context_docs[cite_id - 1]

                # Find validation info for this citation
                validation_info = next(
                    (v for v in validations if int(v['citation_num']) == cite_id),
                    {'similarity': 1.0, 'valid': True}
                )

                citation = {
                    "id": cite_id,
                    "source": doc.get('title', doc.get('source', f'Document {cite_id}')),
                    "page": doc.get('page'),
                    "line": doc.get('line_start'),
                    "preview": self._create_preview(doc.get('content', '')),
                    "summary": doc.get('summary', ''),
                    "confidence": validation_info['similarity'],
                    "document_type": self._extract_document_type(doc.get('source', '')),
                    "full_text": doc.get('content', ''),
                    "validated": validation_info['valid']
                }
                citations.append(citation)

        return {
            "response": corrected_text,
            "citations": citations,
            "validation_stats": {
                "total_citations": len(validations),
                "valid_citations": len([v for v in validations if v['valid']]),
                "avg_confidence": np.mean([v['similarity'] for v in validations]) if validations else 0.0
            }
        }

    def _create_preview(self, content: str, max_length: int = 150) -> str:
        """Create a clean preview of content."""
        if not content:
            return ""

        # Clean up content
        cleaned = re.sub(r'\\s+', ' ', content.strip())

        if len(cleaned) <= max_length:
            return cleaned

        # Find last complete sentence within limit
        truncated = cleaned[:max_length]
        last_sentence = truncated.rfind('.')

        if last_sentence > max_length * 0.5:
            return truncated[:last_sentence + 1]

        return truncated + "..."

    def _extract_document_type(self, source: str) -> str:
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