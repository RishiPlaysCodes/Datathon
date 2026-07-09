from sqlmodel import Session, SQLModel, create_engine, select
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def seed_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Check if users already exist
        existing_user = session.exec(select(User)).first()
        if existing_user:
            print("Database already seeded.")
            return

        users = [
            User(
                username="admin",
                email="admin@ksp.gov.in",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN
            ),
            User(
                username="investigator",
                email="investigator@ksp.gov.in",
                full_name="Deepak Kumar",
                hashed_password=get_password_hash("investigator123"),
                role=UserRole.INVESTIGATOR
            ),
            User(
                username="officer",
                email="officer@ksp.gov.in",
                full_name="Priya Sharma",
                hashed_password=get_password_hash("officer123"),
                role=UserRole.OFFICER
            ),
        ]
        
        for user in users:
            session.add(user)
        session.commit()
        print("Database seeded successfully.")

if __name__ == "__main__":
    seed_db()
