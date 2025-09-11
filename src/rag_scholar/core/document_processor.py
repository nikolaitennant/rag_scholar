"""Advanced document processing with semantic chunking."""

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from langchain.schema import Document
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    SpacyTextSplitter,
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ProcessedDocument(BaseModel):
    """Processed document with metadata."""
    
    doc_id: str
    source: str
    chunks: List[Document]
    metadata: Dict[str, Any]
    chunk_method: str = "recursive"


class DocumentProcessor:
    """Advanced document processing with multiple strategies."""
    
    def __init__(
        self,
        chunk_size: int = 1500,
        chunk_overlap: int = 200,
        use_semantic_chunking: bool = False,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.use_semantic_chunking = use_semantic_chunking
        
        # Initialize splitters
        self.recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )
        
        # Semantic splitter (requires spacy)
        self.semantic_splitter = None
        if use_semantic_chunking:
            try:
                self.semantic_splitter = SpacyTextSplitter(
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                )
            except ImportError:
                logger.warning("Spacy not available, falling back to recursive splitting")
    
    def process_document(
        self,
        content: str,
        source: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProcessedDocument:
        """Process a document into chunks with metadata."""
        
        # Generate document ID
        doc_id = self._generate_doc_id(source, content)
        
        # Choose chunking method
        chunks = self._chunk_document(content, source, metadata or {})
        
        # Enhance chunks with metadata
        enhanced_chunks = self._enhance_chunks(chunks, doc_id, source)
        
        return ProcessedDocument(
            doc_id=doc_id,
            source=source,
            chunks=enhanced_chunks,
            metadata=metadata or {},
            chunk_method="semantic" if self.semantic_splitter else "recursive",
        )
    
    def _generate_doc_id(self, source: str, content: str) -> str:
        """Generate unique document ID."""
        hash_input = f"{source}:{content[:1000]}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    def _chunk_document(
        self,
        content: str,
        source: str,
        metadata: Dict[str, Any],
    ) -> List[Document]:
        """Apply appropriate chunking strategy."""
        
        # Try semantic chunking first if available
        if self.semantic_splitter and self.use_semantic_chunking:
            try:
                return self.semantic_splitter.create_documents(
                    [content],
                    metadatas=[{"source": source, **metadata}],
                )
            except Exception as e:
                logger.warning(f"Semantic chunking failed: {e}")
        
        # Fallback to recursive chunking
        return self.recursive_splitter.create_documents(
            [content],
            metadatas=[{"source": source, **metadata}],
        )
    
    def _enhance_chunks(
        self,
        chunks: List[Document],
        doc_id: str,
        source: str,
    ) -> List[Document]:
        """Add enhanced metadata to chunks."""
        
        enhanced = []
        for i, chunk in enumerate(chunks):
            # Add chunk-specific metadata
            chunk.metadata.update({
                "doc_id": doc_id,
                "chunk_id": f"{doc_id}_{i}",
                "chunk_index": i,
                "total_chunks": len(chunks),
                "source": source,
                "char_count": len(chunk.page_content),
                "word_count": len(chunk.page_content.split()),
            })
            
            # Add position context
            if i > 0:
                chunk.metadata["has_previous"] = True
            if i < len(chunks) - 1:
                chunk.metadata["has_next"] = True
            
            enhanced.append(chunk)
        
        return enhanced
    
    def process_batch(
        self,
        documents: List[Tuple[str, str, Optional[Dict[str, Any]]]],
    ) -> List[ProcessedDocument]:
        """Process multiple documents efficiently."""
        
        processed = []
        for content, source, metadata in documents:
            try:
                doc = self.process_document(content, source, metadata)
                processed.append(doc)
            except Exception as e:
                logger.error(f"Failed to process {source}: {e}")
                continue
        
        return processed


class SmartChunker:
    """Advanced chunking with overlap and context preservation."""
    
    @staticmethod
    def chunk_by_headers(content: str, max_chunk_size: int = 1500) -> List[str]:
        """Chunk document by headers/sections."""
        import re
        
        # Find markdown headers
        header_pattern = r'^#{1,6}\s+.*$'
        lines = content.split('\n')
        
        chunks = []
        current_chunk = []
        current_size = 0
        
        for line in lines:
            line_size = len(line)
            
            # Check if this is a header
            is_header = re.match(header_pattern, line)
            
            # Start new chunk if:
            # 1. We hit a header and have content
            # 2. We exceed max size
            if (is_header and current_chunk) or (current_size + line_size > max_chunk_size and current_chunk):
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_size = 0
            
            current_chunk.append(line)
            current_size += line_size
        
        # Add last chunk
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    @staticmethod
    def chunk_by_paragraphs(content: str, max_chunk_size: int = 1500) -> List[str]:
        """Chunk by paragraphs with smart boundaries."""
        
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = []
        current_size = 0
        
        for para in paragraphs:
            para_size = len(para)
            
            if current_size + para_size > max_chunk_size and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = []
                current_size = 0
            
            current_chunk.append(para)
            current_size += para_size
        
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
        
        return chunks