"""API v1 router - combines all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.crime import router as crime_router
from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.analysis import router as analysis_router
from app.api.v1.endpoints.public import router as public_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(crime_router)
api_router.include_router(ai_router)
api_router.include_router(analysis_router)
api_router.include_router(public_router)
