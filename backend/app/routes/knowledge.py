from fastapi import APIRouter, File, HTTPException, UploadFile
from ..schemas.chat import (
    KnowledgeDocument,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
)
from ..services import rag

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeDocument])
def list_docs() -> list[KnowledgeDocument]:
    return rag.list_documents()


@router.post("/upload", response_model=KnowledgeDocument)
async def upload(file: UploadFile = File(...)) -> KnowledgeDocument:
    content = await file.read()
    return rag.upload_document(file.filename or "document.txt", content)


@router.post("/search", response_model=KnowledgeSearchResponse)
def search(req: KnowledgeSearchRequest) -> KnowledgeSearchResponse:
    return KnowledgeSearchResponse(chunks=rag.search(req.query, k=req.k))


@router.delete("/{doc_id}")
def delete(doc_id: str) -> dict:
    ok = rag.delete_document(doc_id)
    if not ok:
        raise HTTPException(404, "document not found")
    return {"ok": True}
