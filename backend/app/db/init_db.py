"""Database initialization and seeding script."""
import asyncio
import sys
import os

# Support both Docker (/app) and local (.) paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine, async_session, Base
from app.models.user import User, AuditLog, ConversationHistory
from app.models.crime import (
    FIR, Accused, Victim, FIRAccusedLink, CriminalNetwork, Transaction,
    PublicComplaint, CommunityReport, SOSAlert,
)
from app.core.security import get_password_hash, compute_audit_hash
from app.db.seed import generate_accused, generate_firs, generate_network_links, generate_transactions
from datetime import datetime, timedelta
import random


async def init_database():
    """Create all tables and seed with data."""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

    print("Seeding data...")
    async with async_session() as db:
        await seed_users(db)
        accused_list = await seed_accused(db)
        await seed_firs(db, accused_list)
        await seed_network(db)
        await seed_transactions(db)
        await seed_initial_audit(db)
        await seed_citizen_data(db)
        await db.commit()

    print("Database seeded successfully!")


async def seed_citizen_data(db: AsyncSession):
    """Seed public complaints, community reports, and SOS alerts."""
    import string
    localities = ["Koramangala", "Jayanagar", "Indiranagar", "Whitefield", "BTM Layout",
                  "HSR Layout", "Marathahalli", "Electronic City", "Yelahanka", "Malleswaram"]
    crime_types = ["theft", "chain snatching", "fraud", "assault", "cyber crime", "vehicle theft"]
    names = ["Ramesh K", "Sunita R", "Anil Kumar", "Priya S", "Mohan Das", "Kavya M", "Anonymous"]

    statuses = ["submitted", "acknowledged", "fir_registered", "investigating", "resolved", "escalated"]
    for i in range(25):
        tid = "KSP-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        status = random.choice(statuses)
        days_ago = random.randint(1, 20)
        loc = random.choice(localities)
        is_esc = status == "escalated"
        complaint = PublicComplaint(
            tracking_id=tid,
            complainant_name=random.choice(names),
            phone=f"9{random.randint(100000000, 999999999)}",
            crime_type=random.choice(crime_types),
            description=f"Citizen reported a {random.choice(crime_types)} incident in {loc}.",
            location_name=loc,
            district="Bengaluru Urban",
            station_assigned=f"{loc} PS",
            status=status,
            fir_number=f"KSP/BEN/2026/{random.randint(1000,9999)}" if status in ("fir_registered", "investigating", "resolved") else None,
            is_escalated=is_esc,
            escalation_reason="No action within 7 days - auto-escalated to DCP office." if is_esc else None,
            last_action_note="Under review by station house officer." if status == "acknowledged" else "Complaint logged.",
        )
        db.add(complaint)

    report_types = [
        ("suspicious_activity", "Suspicious person loitering near ATM", "high"),
        ("safety_hazard", "Broken streetlight - dark stretch at night", "medium"),
        ("suspicious_activity", "Unknown vehicle parked for days", "medium"),
        ("missing_person", "Elderly man missing since morning", "high"),
        ("help_request", "Need patrol - frequent eve-teasing near college", "high"),
        ("safety_hazard", "Open manhole on main road", "medium"),
        ("suspicious_activity", "Group creating disturbance late night", "medium"),
    ]
    for i, (rtype, title, sev) in enumerate(report_types):
        report = CommunityReport(
            report_type=rtype, title=title,
            description=f"{title}. Reported by local resident for community awareness.",
            location_name=random.choice(localities),
            reporter_name="Anonymous",
            is_anonymous=True,
            status=random.choice(["pending", "verified", "verified"]),
            upvotes=random.randint(0, 12),
            severity=sev,
        )
        db.add(report)

    await db.flush()
    print("  Created citizen complaints, community reports")


async def seed_users(db: AsyncSession):
    """Create default users for each role."""
    users = [
        {
            "username": "admin",
            "email": "admin@prahari.ksp.gov.in",
            "full_name": "SP Raghavendra",
            "role": "supervisor",
            "station_id": "STN_001",
            "badge_number": "KSP-SP-001",
            "password": "admin123",
        },
        {
            "username": "inspector",
            "email": "inspector@prahari.ksp.gov.in",
            "full_name": "Inspector Sharma",
            "role": "investigator",
            "station_id": "STN_001",
            "badge_number": "KSP-INS-042",
            "password": "inspector123",
        },
        {
            "username": "analyst",
            "email": "analyst@prahari.ksp.gov.in",
            "full_name": "Data Analyst Priya",
            "role": "analyst",
            "station_id": "STN_001",
            "badge_number": "KSP-AN-015",
            "password": "analyst123",
        },
        {
            "username": "constable",
            "email": "constable@prahari.ksp.gov.in",
            "full_name": "Constable Venkatesh",
            "role": "constable",
            "station_id": "STN_002",
            "badge_number": "KSP-CON-201",
            "password": "constable123",
        },
        {
            "username": "demo",
            "email": "demo@prahari.ksp.gov.in",
            "full_name": "Demo User",
            "role": "investigator",
            "station_id": "STN_001",
            "badge_number": "KSP-DEMO-001",
            "password": "demo123",
        },
    ]

    for user_data in users:
        password = user_data.pop("password")
        user = User(
            **user_data,
            hashed_password=get_password_hash(password),
        )
        db.add(user)

    await db.flush()
    print(f"  Created {len(users)} users")


async def seed_accused(db: AsyncSession) -> list:
    """Seed accused persons."""
    accused_data = generate_accused(40)
    accused_objects = []

    for data in accused_data:
        accused = Accused(**data)
        db.add(accused)
        accused_objects.append(accused)

    await db.flush()
    print(f"  Created {len(accused_objects)} accused persons")
    return accused_objects


async def seed_firs(db: AsyncSession, accused_list: list):
    """Seed FIRs and link to accused."""
    fir_data = generate_firs(220)

    for i, data in enumerate(fir_data):
        # Convert date strings to datetime objects
        data["date_of_occurrence"] = datetime.fromisoformat(data["date_of_occurrence"])
        data.pop("date_of_registration", None)

        fir = FIR(**data)
        db.add(fir)
        await db.flush()

        # Link to accused (1-3 accused per FIR)
        num_accused = random.randint(1, 3)
        linked_accused = random.sample(
            range(len(accused_list)),
            min(num_accused, len(accused_list)),
        )

        for acc_idx in linked_accused:
            link = FIRAccusedLink(
                fir_id=fir.id,
                accused_id=accused_list[acc_idx].id,
                role=random.choice(["primary", "accomplice", "abettor"]),
            )
            db.add(link)

        # Add victim
        victim_gender = random.choice(["male", "female"])
        from app.db.seed import MALE_NAMES, FEMALE_NAMES
        victim = Victim(
            name=random.choice(FEMALE_NAMES if victim_gender == "female" else MALE_NAMES),
            age=random.randint(18, 70),
            gender=victim_gender,
            phone=f"9{random.randint(100000000, 999999999)}",
            fir_id=fir.id,
        )
        db.add(victim)

    await db.flush()
    print(f"  Created {len(fir_data)} FIRs with accused links and victims")


async def seed_network(db: AsyncSession):
    """Seed criminal network connections."""
    from app.db.seed import generate_network_links, generate_accused
    links = generate_network_links(generate_accused(40))

    for link_data in links:
        network = CriminalNetwork(
            source_accused_id=link_data["source_id"],
            target_accused_id=link_data["target_id"],
            relationship_type=link_data["relationship_type"],
            strength=link_data["strength"],
            shared_firs="[]",
        )
        db.add(network)

    await db.flush()
    print(f"  Created {len(links)} network connections")


async def seed_transactions(db: AsyncSession):
    """Seed financial transactions."""
    from app.db.seed import generate_transactions, generate_accused
    trans_data = generate_transactions(generate_accused(40))

    for data in trans_data:
        data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        trans = Transaction(**data)
        db.add(trans)

    await db.flush()
    print(f"  Created {len(trans_data)} transactions")


async def seed_initial_audit(db: AsyncSession):
    """Create initial audit log entry."""
    initial_hash = compute_audit_hash("GENESIS", "SYSTEM_INIT", "system", datetime.now().isoformat())
    audit = AuditLog(
        user_id=1,
        username="system",
        action="DATABASE_INITIALIZED",
        details="PRAHARI system initialized with seed data",
        risk_level="low",
        previous_hash="GENESIS",
        entry_hash=initial_hash,
    )
    db.add(audit)
    await db.flush()
    print("  Created initial audit log entry")


if __name__ == "__main__":
    asyncio.run(init_database())
