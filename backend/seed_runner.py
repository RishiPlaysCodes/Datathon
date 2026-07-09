"""Script to seed the database - run after tables are created."""
import asyncio
import sys
sys.path.insert(0, "/app")

from app.db.init_db import init_database

if __name__ == "__main__":
    asyncio.run(init_database())
