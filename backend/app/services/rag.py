"""RAG pipeline: SentenceTransformer embeddings + ChromaDB storage."""
from __future__ import annotations
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from ..config import settings
from ..schemas.chat import KnowledgeDocument, RetrievedChunk

log = logging.getLogger(__name__)

_client = None
_collection = None
_embedder = None
_docs: dict[str, KnowledgeDocument] = {}


def _get_embedder():
    global _embedder
    if _embedder is not None:
        return _embedder
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        return _embedder
    except Exception as e:
        log.warning("SentenceTransformer unavailable: %s", e)
        return None


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    try:
        import chromadb  # type: ignore
        os.makedirs(settings.CHROMA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
        _collection = _client.get_or_create_collection("clario_knowledge")
        return _collection
    except Exception as e:
        log.warning("ChromaDB unavailable: %s", e)
        return None


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    i = 0
    while i < len(text):
        chunks.append(text[i : i + size])
        i += size - overlap
    return chunks


def embed(texts: list[str]) -> list[list[float]] | None:
    m = _get_embedder()
    if m is None:
        return None
    return m.encode(texts, normalize_embeddings=True).tolist()


def upload_document(filename: str, content_bytes: bytes) -> KnowledgeDocument:
    try:
        text = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        text = ""
    pieces = chunk_text(text) or [filename]
    embeddings = embed(pieces)
    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    coll = _get_collection()
    if coll is not None and embeddings is not None:
        ids = [f"{doc_id}::{i}" for i in range(len(pieces))]
        metas = [{"doc_id": doc_id, "filename": filename, "chunk_index": i} for i in range(len(pieces))]
        try:
            coll.add(ids=ids, documents=pieces, embeddings=embeddings, metadatas=metas)
        except Exception as e:
            log.warning("Chroma add failed: %s", e)

    ext = filename.rsplit(".", 1)[-1].upper() if "." in filename else "TXT"
    doc = KnowledgeDocument(
        id=doc_id,
        filename=filename,
        size_bytes=len(content_bytes),
        chunks=len(pieces),
        uploaded_at=datetime.now(timezone.utc).isoformat(),
        type=ext,
    )
    _docs[doc_id] = doc
    return doc


def list_documents() -> list[KnowledgeDocument]:
    return list(_docs.values())


def delete_document(doc_id: str) -> bool:
    coll = _get_collection()
    if coll is not None:
        try:
            coll.delete(where={"doc_id": doc_id})
        except Exception as e:
            log.warning("Chroma delete failed: %s", e)
    return _docs.pop(doc_id, None) is not None


def search(query: str, k: int = 5) -> list[RetrievedChunk]:
    coll = _get_collection()
    q_emb = embed([query]) if coll is not None else None
    if coll is None or q_emb is None:
        return []
    try:
        res: dict[str, Any] = coll.query(query_embeddings=q_emb, n_results=k)
    except Exception as e:
        log.warning("Chroma query failed: %s", e)
        return []
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    chunks: list[RetrievedChunk] = []
    for i, cid in enumerate(ids):
        text = docs[i] if i < len(docs) else ""
        meta = metas[i] if i < len(metas) else {}
        dist = dists[i] if i < len(dists) else 0.0
        similarity = max(0.0, 1.0 - float(dist))
        chunks.append(RetrievedChunk(
            id=str(cid),
            source=str(meta.get("filename", "knowledge")),
            title=str(meta.get("filename", "Knowledge chunk")),
            preview=text[:240],
            similarity=round(similarity, 3),
            type="Article",
        ))
    return chunks
