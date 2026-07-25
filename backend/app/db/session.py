"""Database session management."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event

from app.core.config import settings

# SQLite needs special config (no pool_pre_ping, check_same_thread)
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args if "sqlite" in settings.DATABASE_URL else {},
)

# Enable WAL (Write-Ahead Logging) mode for SQLite — this allows concurrent
# readers while a writer is active, dramatically improving performance under
# load and reducing "database is locked" errors. WAL also gives crash resilience:
# uncommitted transactions are stored in a separate WAL file, so the main DB
# stays consistent even if the process is killed mid-write.
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")  # safe with WAL, faster than FULL
        cursor.execute("PRAGMA busy_timeout=5000")   # wait up to 5s instead of immediate SQLITE_BUSY
        cursor.execute("PRAGMA cache_size=-8000")    # 8MB page cache (negative = KB)
        cursor.close()

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
