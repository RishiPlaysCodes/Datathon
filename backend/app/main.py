"""PRAHARI - Crime Intelligence Operating System - Main Application."""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import init_db

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

    # Auto-seed the database if it's empty (needed on cloud deploys where
    # the seed script isn't run separately, e.g. Catalyst AppSail).
    try:
        from sqlalchemy import select, func
        from app.db.session import async_session
        from app.models.user import User

        async with async_session() as db:
            result = await db.execute(select(func.count(User.id)))
            user_count = result.scalar() or 0

            if user_count == 0:
                logger.info("Database is empty - seeding initial data...")
                from app.db.init_db import (
                    seed_users, seed_accused, seed_firs,
                    seed_network, seed_transactions, seed_initial_audit,
                )
                await seed_users(db)
                accused_list = await seed_accused(db)
                await seed_firs(db, accused_list)
                await seed_network(db)
                await seed_transactions(db)
                await seed_initial_audit(db)
                await db.commit()
                logger.info("Database seeded successfully!")
            else:
                logger.info(f"Database already has {user_count} users - skipping seed.")
    except Exception as e:
        logger.error(f"Seeding error (continuing anyway): {e}")

    logger.info(f"Server running on port {settings.PORT}")
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

# CORS - Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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
async def health():
    return {"status": "healthy", "service": "prahari-backend"}
