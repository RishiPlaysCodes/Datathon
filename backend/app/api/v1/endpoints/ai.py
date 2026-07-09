"""
AI Investigation Assistant API Endpoints
Module 1: Conversational Crime Intelligence Interface
"""
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.api import deps
from app.models.user import User, UserRole
from app.services.ai import ai_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "en"  # en or kn


class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
    explainability: dict
    suggestions: List[str]
    language: str
    intent: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Chat with the AI Investigation Assistant.
    Supports English and Kannada, with multi-turn context.
    """
    session_id = request.session_id or str(uuid.uuid4())

    # Get AI response with full pipeline
    result = await ai_service.get_chat_response(
        query=request.message,
        context_docs=[],
        db=db,
        user_id=current_user.id,
        session_id=session_id,
    )

    # Log the query for audit
    deps.create_audit_log(
        db=db,
        user_id=current_user.id,
        action="ai_query",
        entity_name="AIAssistant",
        details=f"Query: {request.message[:100]}",
        query_text=request.message,
        sensitivity_level="medium"
    )

    return ChatResponse(
        response=result["response"],
        sources=result["sources"],
        explainability=result["explainability"],
        suggestions=result["suggestions"],
        language=result["language"],
        intent=result["intent"],
        session_id=session_id,
    )



@router.get("/search")
def semantic_search(
    query: str = Query(..., min_length=2),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Semantic search across crime records.
    Uses keyword matching with ChromaDB fallback.
    """
    results = ai_service.search_similar_crimes(db, query)
    return results


@router.get("/history")
def get_conversation_history(
    session_id: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get conversation history for current user."""
    return ai_service.get_conversation_history(db, current_user.id, session_id)


@router.get("/intents")
def get_available_intents(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get list of supported query intents/templates."""
    from app.services.ai import INTENT_TEMPLATES
    return {
        name: {
            "description": template["description"],
            "example_keywords": template["patterns"][:3],
        }
        for name, template in INTENT_TEMPLATES.items()
    }
