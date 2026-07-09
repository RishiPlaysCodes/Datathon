from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="PRAHARI - Predictive Relational AI for Holistic Analytics & Response Intelligence",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "PRAHARI",
        "description": "Crime Intelligence Operating System - Karnataka State Police",
        "version": "2.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PRAHARI Backend"}


app.include_router(api_router, prefix=settings.API_V1_STR)
