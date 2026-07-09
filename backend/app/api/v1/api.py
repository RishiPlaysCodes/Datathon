from fastapi import APIRouter
from app.api.v1.endpoints import auth, crime, ai, network, analytics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(crime.router, prefix="/crime", tags=["crime"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(network.router, prefix="/network", tags=["network"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
