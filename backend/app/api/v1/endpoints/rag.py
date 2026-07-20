"""RAG (Retrieval-Augmented Generation) endpoints."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.models.user import User
from app.api.deps import get_current_user
from app.services.rag_pipeline import rag_query, semantic_search, get_rag_status

router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 5


@router.get("/status")
async def rag_status(user: User = Depends(get_current_user)):
    """Get RAG pipeline status (embedding model, index size, backend)."""
    return get_rag_status()


@router.post("/query")
async def rag_search(req: RAGQueryRequest, user: User = Depends(get_current_user)):
    """
    RAG query: semantic search over all FIRs using embeddings.
    Returns grounded answer with sources and similarity scores.
    """
    return rag_query(req.query, top_k=req.top_k)


@router.get("/search")
async def semantic_fir_search(
    q: str = Query(..., description="Natural language search query"),
    top_k: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
):
    """Raw semantic search - returns similar FIRs with scores."""
    results = semantic_search(q, top_k=top_k)
    return {"query": q, "results": results, "count": len(results)}
