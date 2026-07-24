"""Knowledge Recommendation Agent.

For a given customer message, embed the query with SentenceTransformer
(`all-MiniLM-L6-v2`) and retrieve the top-K most similar chunks from
ChromaDB. Thin wrapper over `services.rag.search` returning both the
structured payload described in the system prompt and the RetrievedChunk
objects consumed by the frontend contract.
"""
from __future__ import annotations

from typing import Any

from ..prompts.system_prompts import KNOWLEDGE_RECOMMENDATION_SYSTEM_PROMPT  # noqa: F401 (documented contract)
from ..schemas.chat import RetrievedChunk
from ..services import rag


def recommend(message: str, k: int = 3) -> tuple[list[RetrievedChunk], dict[str, Any]]:
    """Return (chunks_for_frontend, structured_payload)."""
    chunks = rag.search(message, k=k)
    payload = {
        "documents": [
            {
                "title": c.title,
                "chunk": c.preview,
                "similarity_score": c.similarity,
            }
            for c in chunks
        ]
    }
    return chunks, payload
