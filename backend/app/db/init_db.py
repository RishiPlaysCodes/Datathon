"""Database initialization and seeding script."""
import asyncio
import sys
import os

# Support both Docker (/app) and local (.) paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import engine, async_session, Base
from app.models.user import User, AuditLog, ConversationHistory, PoliceStation
from app.models.crime import FIR, Accused, Victim, FIRAccusedLink, CriminalNetwork, Transaction
from app.core.security import get_password_hash, compute_audit_hash
from app.db.seed import generate_accused, generate_firs, generate_network_links, generate_transactions
from app.db.stations import KARNATAKA_STATIONS, get_zone_for_location, get_station_for_location
from datetime import datetime
import random
import json


async def init_database():
    """Create all tables and seed with data."""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

    print("Seeding data...")
    async with async_session() as db:
        await seed_police_stations(db)
        await seed_users(db)
        accused_list = await seed_accused(db)
        await seed_firs(db, accused_list)
        await seed_network(db)
        await seed_transactions(db)
        await seed_initial_audit(db)
        await db.commit()

    print("Database seeded successfully!")


async def seed_police_stations(db: AsyncSession):
    """Seed 50 Karnataka police stations from master data."""
    for station_data in KARNATAKA_STATIONS:
        station = PoliceStation(**station_data)
        db.add(station)
    await db.flush()
    print(f"  Created {len(KARNATAKA_STATIONS)} police stations")


async def seed_users(db: AsyncSession):
    """Create default users for each role."""
    users = [
        {
            "username": "admin",
            "email": "admin@prahari.ksp.gov.in",
            "full_name": "SP Raghavendra",
            "role": "supervisor",
            "station_id": "KOR_PS",
            "badge_number": "KSP-SP-001",
            "rank": "SP",
            "assigned_zone": "South",
            "password": "admin123",
        },
        {
            "username": "inspector",
            "email": "inspector@prahari.ksp.gov.in",
            "full_name": "Inspector Sharma",
            "role": "investigator",
            "station_id": "KOR_PS",
            "badge_number": "KSP-INS-042",
            "rank": "Inspector",
            "assigned_zone": "South",
            "password": "inspector123",
        },
        {
            "username": "analyst",
            "email": "analyst@prahari.ksp.gov.in",
            "full_name": "Data Analyst Priya",
            "role": "analyst",
            "station_id": "KOR_PS",
            "badge_number": "KSP-AN-015",
            "rank": "Analyst",
            "assigned_zone": "South",
            "password": "analyst123",
        },
        {
            "username": "constable",
            "email": "constable@prahari.ksp.gov.in",
            "full_name": "Constable Venkatesh",
            "role": "constable",
            "station_id": "IND_PS",
            "badge_number": "KSP-CON-201",
            "rank": "Constable",
            "assigned_zone": "East",
            "password": "constable123",
        },
        {
            "username": "demo",
            "email": "demo@prahari.ksp.gov.in",
            "full_name": "Demo User (Koramangala PS)",
            "role": "investigator",
            "station_id": "KOR_PS",
            "badge_number": "KSP-DEMO-001",
            "rank": "SI",
            "assigned_zone": "South",
            "password": "demo123",
        },
        {
            "username": "citizen1",
            "email": "citizen@gmail.com",
            "full_name": "Ramesh Citizen",
            "role": "citizen",
            "station_id": None,
            "badge_number": None,
            "rank": None,
            "assigned_zone": None,
            "password": "citizen123",
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
    print(f"  Created {len(users)} users (including citizen)")


async def seed_accused(db: AsyncSession) -> list:
    """Seed accused persons with OSINT verification for some."""
    accused_data = generate_accused(40)
    accused_objects = []

    # OSINT sources for verified accused
    osint_sources_pool = [
        ["Social Media Profiling (Facebook/Instagram)", "Phone Number OSINT (Truecaller)", "Vehicle Registration (Vahan)"],
        ["Dark Web Monitoring", "Financial Intelligence (FININT)", "Telegram Channel Surveillance"],
        ["Public Records (Court Orders)", "Address Verification (Google Maps OSINT)", "Associate Network Mapping"],
        ["Digital Footprint Analysis", "Email OSINT (breach databases)", "Criminal Record Cross-reference"],
        ["Open Court Records", "Property Registration OSINT", "Mobile Tower Location History"],
    ]

    for i, data in enumerate(accused_data):
        # Mark first 10 repeat offenders as OSINT-verified (high-priority targets)
        if i < 10 and data["is_repeat_offender"]:
            data["osint_verified"] = True
            data["osint_sources"] = json.dumps(random.choice(osint_sources_pool))
        else:
            data["osint_verified"] = False
            data["osint_sources"] = None

        accused = Accused(**data)
        db.add(accused)
        accused_objects.append(accused)

    await db.flush()
    print(f"  Created {len(accused_objects)} accused persons (10 OSINT-verified)")
    return accused_objects


async def seed_firs(db: AsyncSession, accused_list: list):
    """Seed FIRs and link to accused. Some FIRs assigned to citizen user."""
    fir_data = generate_firs(220)

    citizen = (
        await db.execute(select(User).where(User.username == "citizen1"))
    ).scalar_one()
    citizen_user_id = citizen.id
    citizen_name = citizen.full_name

    for i, data in enumerate(fir_data):
        # Convert date strings to datetime objects
        data["date_of_occurrence"] = datetime.fromisoformat(data["date_of_occurrence"])
        data.pop("date_of_registration", None)

        # Assign first 5 FIRs to citizen user (their filed complaints)
        if i < 5:
            data["complainant_name"] = citizen_name
            data["complainant_user_id"] = citizen_user_id
        else:
            # Some random FIRs have complainant names but not linked to a user account
            data["complainant_name"] = f"Complainant {random.choice(['Suresh', 'Kavitha', 'Anil', 'Meena', 'Ramesh'])}"
            data["complainant_user_id"] = None

        fir = FIR(**data)
        # Auto-assign zone and police station from location
        fir.zone = get_zone_for_location(data.get("location_name", ""))
        fir.police_station_code = get_station_for_location(data.get("location_name", ""))
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
    print(f"  Created {len(fir_data)} FIRs (5 linked to citizen user) with accused links and victims")


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
    timestamp = datetime.utcnow()
    details = "PRAHARI system initialized with seed data"
    initial_hash = compute_audit_hash(
        "GENESIS",
        "DATABASE_INITIALIZED",
        "1",
        timestamp.isoformat(timespec="microseconds"),
        username="system",
        details=details,
        risk_level="low",
    )
    audit = AuditLog(
        user_id=1,
        username="system",
        action="DATABASE_INITIALIZED",
        details=details,
        risk_level="low",
        timestamp=timestamp,
        previous_hash="GENESIS",
        entry_hash=initial_hash,
    )
    db.add(audit)
    await db.flush()
    print("  Created initial audit log entry")


if __name__ == "__main__":
    asyncio.run(init_database())
