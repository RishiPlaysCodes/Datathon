"""PRAHARI - Crime Intelligence Operating System - Main Application."""
import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import init_db

# Catalyst's AppSail gateway automatically injects an
# `Access-Control-Allow-Origin` header that reflects the caller's origin.
# If the app ALSO emits one (e.g. Starlette's CORSMiddleware with "*"),
# the browser receives two values ("<origin>, *") and rejects every request.
# So on Catalyst we must NOT emit our own origin header; locally (no gateway)
# we must emit it ourselves. This env var is only present on Catalyst.
_ON_CATALYST = bool(
    os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT") or os.environ.get("CATALYST_PROJECT_ID")
)

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
                    seed_police_stations,
                )
                await seed_police_stations(db)
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

_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
_ALLOW_HEADERS = "Authorization, Content-Type, Accept, Origin, X-Requested-With"


# Single CORS authority for the app. Answers preflight (OPTIONS) with a 200 and
# always advertises the allowed methods/headers. It deliberately sets
# Access-Control-Allow-Origin ONLY when not running behind Catalyst's gateway,
# because the gateway already provides that exact header on Catalyst. Duplicate
# Allow-Methods/Allow-Headers are combined harmlessly by browsers; only a
# duplicate Allow-Origin is fatal, which this avoids.
@app.middleware("http")
async def cors_and_logging(request: Request, call_next):
    origin = request.headers.get("origin")

    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        logger.info(f">> {request.method} {request.url.path}")
        response = await call_next(request)
        status = response.status_code
        level = "INFO" if status < 400 else "WARNING" if status < 500 else "ERROR"
        getattr(logger, level.lower())(f"<< {request.method} {request.url.path} -> {status}")

    response.headers["Access-Control-Allow-Methods"] = _ALLOW_METHODS
    response.headers["Access-Control-Allow-Headers"] = _ALLOW_HEADERS
    response.headers["Access-Control-Max-Age"] = "3600"
    if not _ON_CATALYST and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

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


@app.get("/api/v1/status")
async def diagnostic_status():
    """Public diagnostic endpoint - verify DB is seeded and reachable (no auth)."""
    from sqlalchemy import select, func
    from app.db.session import async_session
    from app.models.user import User
    from app.models.crime import FIR, Accused

    info = {"backend": "operational", "db_path": settings.DATABASE_URL}
    try:
        async with async_session() as db:
            users = (await db.execute(select(func.count(User.id)))).scalar() or 0
            firs = (await db.execute(select(func.count(FIR.id)))).scalar() or 0
            accused = (await db.execute(select(func.count(Accused.id)))).scalar() or 0

            # Self-heal: if empty, seed now
            if users == 0:
                from app.db.init_db import (
                    seed_users, seed_accused, seed_firs,
                    seed_network, seed_transactions, seed_initial_audit,
                    seed_police_stations,
                )
                await seed_police_stations(db)
                await seed_users(db)
                accused_list = await seed_accused(db)
                await seed_firs(db, accused_list)
                await seed_network(db)
                await seed_transactions(db)
                await seed_initial_audit(db)
                await db.commit()
                users = (await db.execute(select(func.count(User.id)))).scalar() or 0
                firs = (await db.execute(select(func.count(FIR.id)))).scalar() or 0
                accused = (await db.execute(select(func.count(Accused.id)))).scalar() or 0
                info["seeded_now"] = True

            info["users"] = users
            info["firs"] = firs
            info["accused"] = accused
            info["db_ready"] = users > 0
    except Exception as e:
        info["error"] = str(e)
        info["db_ready"] = False
    return info
