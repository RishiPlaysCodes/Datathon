"""PRAHARI - Crime Intelligence Operating System - Main Application."""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import init_db
from app.db.init_db import seed_database_if_empty

# Setup logging - shows in terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("prahari")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown events."""
    # Startup
    logger.info("=" * 50)
    logger.info("  PRAHARI Crime Intelligence OS - Starting...")
    logger.info("=" * 50)
    await init_db()
    logger.info("Database tables ready.")
    if await seed_database_if_empty():
        logger.info("Demo users and crime data seeded.")
    else:
        logger.info("Existing database data preserved.")
    logger.info(f"Server listening on {settings.HOST}:{settings.listen_port}")
    logger.info("API docs available at /docs")
    logger.info("=" * 50)
    yield
    # Shutdown
    logger.info("Shutting down PRAHARI...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Predictive Relational AI for Holistic Analytics & Response Intelligence",
    lifespan=lifespan,
)

# CORS - Allow configured frontend origins, including the Catalyst client.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f">> {request.method} {request.url.path}")
    response = await call_next(request)
    status = response.status_code
    level = "INFO" if status < 400 else "WARNING" if status < 500 else "ERROR"
    getattr(logger, level.lower())(f"<< {request.method} {request.url.path} -> {status}")
    return response


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
@app.get("/api/v1/status")
async def health():
    return {"status": "healthy", "service": "prahari-backend"}
