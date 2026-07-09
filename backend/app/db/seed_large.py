"""Redirect to main seed script."""
from app.db.seed import seed_db

if __name__ == "__main__":
    seed_db()
