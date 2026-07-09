from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api import deps
from app.services.ai import ai_service
from app.services.vector_db import vector_db_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: List[dict]

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Chat with the AI Investigation Assistant using RAG.
    """
    # Retrieve relevant context from ChromaDB
    search_results = vector_db_service.query_firs(request.message, n_results=3)
    context_docs = search_results['documents'][0] if search_results['documents'] else []
    
    # Get AI response
    response_text = await ai_service.get_chat_response(request.message, context_docs)
    
    # Format sources
    sources = []
    if search_results['metadatas']:
        for meta in search_results['metadatas'][0]:
            sources.append(meta)
            
    return ChatResponse(response=response_text, sources=sources)

@router.get("/search")
def semantic_search(
    query: str,
    current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Semantic search across crime records.
    """
    return ai_service.search_similar_crimes(query)
