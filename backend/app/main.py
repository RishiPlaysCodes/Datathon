"""PRAHARI - Crime Intelligence Operating System - Main Application."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown events."""
    # Startup
    print("Starting PRAHARI Crime Intelligence OS...")
    await init_db()
    print("Database initialized.")
    yield
    # Shutdown
    print("Shutting down PRAHARI...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Predictive Relational AI for Holistic Analytics & Response Intelligence",
    lifespan=lifespan,
)

# CORS - Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": "PRAHARI",
        "version": settings.APP_VERSION,
        "description": "Crime Intelligence Operating System",
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "prahari-backend"}
