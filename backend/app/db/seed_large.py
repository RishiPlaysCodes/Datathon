import random
from datetime import datetime, timedelta
from faker import Faker
from sqlmodel import Session, SQLModel, create_engine, select
from app.models.crime import (
    PoliceStation, Officer, CrimeCategory, Criminal, Victim, 
    Witness, FIR, Evidence, InvestigationReport, FIRStatus, EvidenceType
)
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.core.config import settings

fake = Faker('en_IN') # Using Indian locale for realistic data
engine = create_engine(settings.DATABASE_URL)

def seed_large_db():
    SQLModel.metadata.drop_all(engine) # Clear existing data
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        print("Seeding Police Stations...")
        stations = []
        for _ in range(100):
            station = PoliceStation(
                name=f"{fake.city()} Police Station",
                location=fake.address(),
                district=fake.city(),
                contact_number=fake.phone_number()
            )
            session.add(station)
            stations.append(station)
        session.commit()

        print("Seeding Crime Categories...")
        categories = []
        cat_names = ["Theft", "Assault", "Fraud", "Cyber Crime", "Robbery", "Homicide", "Kidnapping", "Drug Trafficking"]
        for name in cat_names:
            category = CrimeCategory(name=name, description=fake.sentence())
            session.add(category)
            categories.append(category)
        session.commit()

        print("Seeding Officers...")
        officers = []
        ranks = ["Constable", "Sub-Inspector", "Inspector", "DSP", "SP"]
        for i in range(200):
            user = User(
                username=f"officer_{i}",
                email=fake.email(),
                full_name=fake.name(),
                hashed_password=get_password_hash("password123"),
                role=UserRole.OFFICER if i > 10 else UserRole.ADMIN
            )
            session.add(user)
            session.commit()
            
            officer = Officer(
                name=user.full_name,
                badge_number=f"KSP-{1000+i}",
                rank=random.choice(ranks),
                contact_number=fake.phone_number(),
                police_station_id=random.choice(stations).id,
                user_id=user.id
            )
            session.add(officer)
            officers.append(officer)
        session.commit()

        print("Seeding Criminals...")
        criminals = []
        for _ in range(300):
            criminal = Criminal(
                name=fake.name(),
                alias=fake.user_name() if random.random() > 0.5 else None,
                address=fake.address(),
                phone_number=fake.phone_number(),
                criminal_record=fake.paragraph() if random.random() > 0.7 else None
            )
            session.add(criminal)
            criminals.append(criminal)
        session.commit()

        print("Seeding Victims...")
        victims = []
        for _ in range(500):
            victim = Victim(
                name=fake.name(),
                address=fake.address(),
                phone_number=fake.phone_number()
            )
            session.add(victim)
            victims.append(victim)
        session.commit()

        print("Seeding Witnesses...")
        witnesses = []
        for _ in range(150):
            witness = Witness(
                name=fake.name(),
                address=fake.address(),
                phone_number=fake.phone_number()
            )
            session.add(witness)
            witnesses.append(witness)
        session.commit()

        print("Seeding FIRs and related data...")
        for i in range(1000):
            incident_date = fake.date_time_between(start_date='-2y', end_date='now')
            fir = FIR(
                fir_number=f"FIR/{incident_date.year}/{10000+i}",
                incident_date=incident_date,
                registration_date=incident_date + timedelta(hours=random.randint(1, 48)),
                location=fake.address(),
                description=fake.paragraph(nb_sentences=5),
                status=random.choice(list(FIRStatus)),
                category_id=random.choice(categories).id,
                officer_id=random.choice(officers).id
            )
            session.add(fir)
            session.commit() # Commit to get ID

            # Add Relationships
            num_criminals = random.randint(0, 3)
            fir.criminals = random.sample(criminals, num_criminals)
            
            num_victims = random.randint(1, 2)
            fir.victims = random.sample(victims, num_victims)
            
            num_witnesses = random.randint(0, 2)
            fir.witnesses = random.sample(witnesses, num_witnesses)

            # Add Evidence
            for _ in range(random.randint(0, 5)):
                evidence = Evidence(
                    fir_id=fir.id,
                    type=random.choice(list(EvidenceType)),
                    description=fake.sentence(),
                    file_path=f"/evidence/{fir.fir_number}/{fake.file_name()}"
                )
                session.add(evidence)

            # Add Investigation Reports
            for _ in range(random.randint(1, 3)):
                report = InvestigationReport(
                    fir_id=fir.id,
                    report_content=fake.paragraph(nb_sentences=10),
                    created_at=fir.registration_date + timedelta(days=random.randint(1, 30))
                )
                session.add(report)
            
            if i % 100 == 0:
                print(f"Processed {i} FIRs...")
        
        session.commit()
        print("Database seeded with 1000 FIRs and related data.")

if __name__ == "__main__":
    seed_large_db()
