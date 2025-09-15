"""Retrieval service with hybrid search capabilities."""

import logging
from typing import Any

import numpy as np
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from rank_bm25 import BM25Okapi

from rag_scholar.config.settings import Settings

logger = logging.getLogger(__name__)


class RetrievalService:
    """Service for document retrieval with hybrid search."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.embeddings = OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
        )
        self.vector_stores: dict[str, FAISS] = {}
        self.bm25_indexes: dict[str, BM25Okapi] = {}
        self.document_cache: dict[str, list[Document]] = {}

    async def retrieve(
        self,
        query: str,
        collection: str = "default",
        selected_files: list[str] | None = None,
        k: int = 5,
        use_hybrid: bool | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant documents using hybrid search."""

        use_hybrid = (
            use_hybrid if use_hybrid is not None else self.settings.use_hybrid_search
        )

        # Get vector store for collection
        vector_store = await self._get_vector_store(collection)

        if not vector_store:
            logger.warning(f"No vector store found for collection: {collection}")
            return []

        # Perform retrieval
        if use_hybrid:
            results = await self._hybrid_retrieve(
                query=query,
                collection=collection,
                vector_store=vector_store,
                selected_files=selected_files,
                k=k,
            )
        else:
            results = await self._vector_retrieve(
                query=query,
                vector_store=vector_store,
                selected_files=selected_files,
                k=k,
            )

        return results

    async def _vector_retrieve(
        self,
        query: str,
        vector_store: FAISS,
        selected_files: list[str] | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Pure vector similarity search."""

        # Create retriever with optional filter
        search_kwargs = {"k": k}

        if selected_files:

            def file_filter(metadata):
                source = metadata.get("source", "")
                return any(selected in source for selected in selected_files)

            search_kwargs["filter"] = file_filter

        retriever = vector_store.as_retriever(search_kwargs=search_kwargs)

        # Retrieve documents
        docs = await retriever.ainvoke(query)

        # Format results
        results = []
        for i, doc in enumerate(docs):
            results.append(
                {
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "Unknown"),
                    "page": doc.metadata.get("page"),
                    "score": 1.0 - (i * 0.1),  # Simple scoring
                    "metadata": doc.metadata,
                }
            )

        return results

    async def _hybrid_retrieve(
        self,
        query: str,
        collection: str,
        vector_store: FAISS,
        selected_files: list[str] | None = None,
        k: int = 5,
    ) -> list[dict[str, Any]]:
        """Hybrid search combining vector and BM25."""

        # Get BM25 index
        bm25_index = await self._get_bm25_index(collection)

        if not bm25_index:
            # Fallback to vector-only search
            return await self._vector_retrieve(query, vector_store, selected_files, k)

        # Get documents for BM25
        documents = self.document_cache.get(collection, [])

        # Filter documents if needed
        if selected_files:
            documents = [
                doc
                for doc in documents
                if any(
                    selected in doc.metadata.get("source", "")
                    for selected in selected_files
                )
            ]

        # Vector search
        vector_results = await self._vector_retrieve(
            query, vector_store, selected_files, k * 2
        )

        # BM25 search
        query_tokens = query.lower().split()
        bm25_scores = bm25_index.get_scores(query_tokens)

        # Get top BM25 results
        top_bm25_indices = np.argsort(bm25_scores)[-k * 2 :][::-1]

        bm25_results = []
        for idx in top_bm25_indices:
            if idx < len(documents):
                doc = documents[idx]
                bm25_results.append(
                    {
                        "content": doc.page_content,
                        "source": doc.metadata.get("source", "Unknown"),
                        "page": doc.metadata.get("page"),
                        "score": float(bm25_scores[idx]),
                        "metadata": doc.metadata,
                    }
                )

        # Combine results with weighted scoring
        combined = self._combine_results(
            vector_results,
            bm25_results,
            vector_weight=1.0 - self.settings.bm25_weight,
            bm25_weight=self.settings.bm25_weight,
        )

        return combined[:k]

    def _combine_results(
        self,
        vector_results: list[dict],
        bm25_results: list[dict],
        vector_weight: float,
        bm25_weight: float,
    ) -> list[dict]:
        """Combine and re-rank results from multiple sources."""

        # Create a map to track combined scores
        result_map = {}

        # Add vector results
        for i, result in enumerate(vector_results):
            key = f"{result['source']}_{result.get('page', 0)}"
            if key not in result_map:
                result_map[key] = {
                    **result,
                    "combined_score": 0.0,
                }
            # Normalize vector score
            normalized_score = 1.0 - (i / len(vector_results))
            result_map[key]["combined_score"] += normalized_score * vector_weight

        # Add BM25 results
        max_bm25_score = max((r["score"] for r in bm25_results), default=1.0)
        for result in bm25_results:
            key = f"{result['source']}_{result.get('page', 0)}"
            if key not in result_map:
                result_map[key] = {
                    **result,
                    "combined_score": 0.0,
                }
            # Normalize BM25 score
            normalized_score = result["score"] / max_bm25_score
            result_map[key]["combined_score"] += normalized_score * bm25_weight

        # Sort by combined score
        combined = sorted(
            result_map.values(),
            key=lambda x: x["combined_score"],
            reverse=True,
        )

        return combined

    async def _get_vector_store(self, collection: str) -> FAISS | None:
        """Get or load vector store for collection."""

        if collection not in self.vector_stores:
            # Try to load from disk
            index_path = self.settings.index_dir / collection
            if index_path.exists():
                try:
                    self.vector_stores[collection] = FAISS.load_local(
                        str(index_path),
                        self.embeddings,
                        allow_dangerous_deserialization=True,
                    )
                    logger.info(f"Loaded vector store for collection: {collection}")
                except Exception as e:
                    logger.error(f"Failed to load vector store: {e}")
                    return None
            else:
                logger.info(f"No vector store found at {index_path} for collection: {collection}")

        return self.vector_stores.get(collection)

    async def _get_bm25_index(self, collection: str) -> BM25Okapi | None:
        """Get or create BM25 index for collection."""

        if collection not in self.bm25_indexes:
            # Get documents for collection
            documents = self.document_cache.get(collection, [])
            if documents:
                # Tokenize documents for BM25
                tokenized_docs = [doc.page_content.lower().split() for doc in documents]
                self.bm25_indexes[collection] = BM25Okapi(tokenized_docs)

        return self.bm25_indexes.get(collection)

    def update_indexes(
        self,
        collection: str,
        documents: list[Document],
        vector_store: FAISS,
    ):
        """Update indexes with new documents."""

        # Update caches
        self.document_cache[collection] = documents
        self.vector_stores[collection] = vector_store

        # Rebuild BM25 index
        if documents:
            tokenized_docs = [doc.page_content.lower().split() for doc in documents]
            self.bm25_indexes[collection] = BM25Okapi(tokenized_docs)
