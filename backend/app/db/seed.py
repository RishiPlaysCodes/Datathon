"""
PRAHARI Seed Script - Realistic Karnataka Crime Data
Generates 200+ FIRs with linked entities, repeat offenders, gang clusters,
real Bangalore/Karnataka localities, and entity resolution test data.
"""
import random
import json
import hashlib
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, SQLModel, create_engine, select
from app.models.user import User, UserRole
from app.models.crime import (
    PoliceStation, Officer, CrimeCategory, Criminal, Victim,
    Witness, FIR, Evidence, InvestigationReport, AuditLog,
    FIRCriminalLink, FIRVictimLink, FIRWitnessLink,
    BankAccount, FinancialTransaction, TransactionType,
    CrimeAlert, CrimePrediction, AlertSeverity,
    Watchlist, DistrictSocioData, FIRStatus, EvidenceType
)
from app.core.security import get_password_hash
from app.core.config import settings

random.seed(42)  # Reproducible data

engine = create_engine(settings.DATABASE_URL)


# =============================================================================
# REALISTIC KARNATAKA DATA
# =============================================================================

BANGALORE_LOCALITIES = [
    ("Koramangala", 12.9352, 77.6245),
    ("Indiranagar", 12.9784, 77.6408),
    ("Jayanagar", 12.9308, 77.5838),
    ("Whitefield", 12.9698, 77.7500),
    ("HSR Layout", 12.9116, 77.6389),
    ("BTM Layout", 12.9166, 77.6101),
    ("Electronic City", 12.8456, 77.6603),
    ("Marathahalli", 12.9591, 77.6974),
    ("Hebbal", 13.0358, 77.5970),
    ("Yelahanka", 13.1007, 77.5963),
    ("Banashankari", 12.9255, 77.5468),
    ("Rajajinagar", 12.9866, 77.5525),
    ("Malleshwaram", 13.0035, 77.5647),
    ("JP Nagar", 12.9063, 77.5857),
    ("Basavanagudi", 12.9416, 77.5752),
    ("MG Road", 12.9756, 77.6068),
    ("Brigade Road", 12.9716, 77.6079),
    ("Shivajinagar", 12.9857, 77.6047),
    ("Majestic", 12.9767, 77.5713),
    ("KR Market", 12.9634, 77.5778),
    ("Vijayanagar", 12.9707, 77.5331),
    ("Peenya", 13.0295, 77.5180),
    ("Yeshwanthpur", 13.0225, 77.5510),
    ("RT Nagar", 13.0210, 77.5970),
    ("Banaswadi", 13.0105, 77.6500),
    ("CV Raman Nagar", 12.9850, 77.6640),
    ("Bommanahalli", 12.9010, 77.6230),
    ("Silk Board", 12.9177, 77.6230),
    ("Sarjapur Road", 12.9100, 77.6800),
    ("Bellandur", 12.9260, 77.6780),
]


KARNATAKA_DISTRICTS = [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru",
    "Hubli-Dharwad", "Belagavi", "Kalaburagi", "Davangere",
    "Ballari", "Tumkur", "Shimoga", "Raichur",
    "Hassan", "Udupi", "Mandya", "Chitradurga"
]

KANNADA_MALE_NAMES = [
    "Ravi Kumar", "Suresh Gowda", "Manjunath", "Venkatesh Murthy",
    "Ramesh Babu", "Mahesh Kumar", "Ganesh Shetty", "Prakash Raj",
    "Naveen Kumar", "Deepak Sharma", "Anil Kumar", "Srinivas Rao",
    "Basavaraj", "Shivaraj", "Chandrashekar", "Jagadish",
    "Santosh Kumar", "Rajesh Hegde", "Vinod Kumar", "Harish Gowda",
    "Manoj Kumar", "Kiran Kumar", "Sanjay Patil", "Praveen Kumar",
    "Ashok Naik", "Vikram Singh", "Mohan Das", "Girish Karnik"
]

KANNADA_FEMALE_NAMES = [
    "Lakshmi Devi", "Savitri Bai", "Rekha Kumari", "Asha Rani",
    "Meena Kumari", "Padma Devi", "Geeta Bai", "Kavitha",
    "Suma", "Anitha", "Priya Darshini", "Shwetha",
    "Deepa", "Roopa", "Mamatha", "Vijayalakshmi"
]


CRIME_CATEGORIES_DATA = [
    ("Chain Snatching", "Snatching of gold chains from pedestrians", "IPC 356/379", "high"),
    ("Theft", "Stealing property without force", "IPC 378/379", "medium"),
    ("Burglary", "Breaking and entering with intent to steal", "IPC 454/457", "high"),
    ("Assault", "Physical violence causing hurt", "IPC 323/324/325", "high"),
    ("Robbery", "Theft with force or threat", "IPC 392/394", "critical"),
    ("Cyber Crime", "Online fraud, hacking, identity theft", "IT Act 66/66C/66D", "medium"),
    ("Vehicle Theft", "Theft of motor vehicles", "IPC 379/411", "medium"),
    ("Drug Trafficking", "Illegal drug possession and sale", "NDPS Act 20/22", "critical"),
    ("Domestic Violence", "Violence within household", "IPC 498A/DV Act", "high"),
    ("Murder", "Culpable homicide amounting to murder", "IPC 302/304", "critical"),
    ("Kidnapping", "Abduction of persons", "IPC 363/365", "critical"),
    ("Fraud", "Cheating and financial deception", "IPC 420/406", "medium"),
    ("Eve Teasing", "Sexual harassment in public", "IPC 354/509", "medium"),
    ("Property Dispute", "Disputes over land and property", "IPC 447/448", "low"),
    ("Extortion", "Obtaining money through threats", "IPC 383/384/385", "high"),
]

MODUS_OPERANDI_TEMPLATES = {
    "Chain Snatching": [
        "Two persons on motorcycle approach victim from behind, pillion rider snatches chain and flees",
        "Single person on bicycle approaches elderly woman, snatches chain and escapes through narrow lanes",
        "Accused poses as delivery person, distracts victim, accomplice snatches chain from behind",
    ],
    "Theft": [
        "Enters unlocked premises during daytime when occupants away at work",
        "Breaks lock of parked vehicle using master key technique",
        "Picks pocket in crowded bus/market area during rush hour",
    ],
    "Burglary": [
        "Climbs compound wall at night, breaks window lock, steals valuables",
        "Uses duplicate key obtained from servant/watchman, enters during family vacation",
        "Tunnels through adjacent vacant building wall to access target premises",
    ],
    "Cyber Crime": [
        "Sends phishing SMS posing as bank, obtains OTP, drains account",
        "Creates fake e-commerce website, collects payment, never delivers",
        "Hacks social media account, impersonates victim, asks contacts for money",
    ],
    "Vehicle Theft": [
        "Uses signal jammer near parking lot, breaks into car without alarm trigger",
        "Duplicates bike key from local mechanic, steals vehicle at night",
        "Tows parked vehicle using fake breakdown van in early morning hours",
    ],
    "Drug Trafficking": [
        "Uses food delivery app cover to transport drugs, packages hidden in food containers",
        "Operates through encrypted messaging groups, dead-drop locations in parks",
        "Uses interstate bus network, drugs concealed in modified luggage compartments",
    ],
}


# Gang clusters for network analysis
GANG_DATA = [
    {
        "name": "Koramangala Chain Snatchers",
        "members": ["Ravi Kumar", "R Kumar", "Ravi K", "Suresh Gowda", "Deepak Chain"],
        "area": "Koramangala",
        "crime_type": "Chain Snatching"
    },
    {
        "name": "Whitefield Cyber Gang",
        "members": ["Naveen Hacker", "Naveen Kumar", "Kiran Cyber", "Sanjay Tech"],
        "area": "Whitefield",
        "crime_type": "Cyber Crime"
    },
    {
        "name": "Peenya Drug Network",
        "members": ["Basavaraj D", "Shivaraj Dealer", "Ashok Naik", "Mohan Supplier"],
        "area": "Peenya",
        "crime_type": "Drug Trafficking"
    },
    {
        "name": "Majestic Pickpocket Ring",
        "members": ["Jagadish Pocket", "Chandrashekar", "Santosh Majestic", "Vinod Quick"],
        "area": "Majestic",
        "crime_type": "Theft"
    },
]

POLICE_STATIONS_DATA = [
    ("Koramangala PS", "Koramangala, 80 Feet Road", "Bengaluru Urban", 12.9352, 77.6245, "KOR-001"),
    ("Indiranagar PS", "Indiranagar, 100 Feet Road", "Bengaluru Urban", 12.9784, 77.6408, "IND-001"),
    ("Jayanagar PS", "Jayanagar 4th Block", "Bengaluru Urban", 12.9308, 77.5838, "JAY-001"),
    ("Whitefield PS", "Whitefield Main Road", "Bengaluru Urban", 12.9698, 77.7500, "WHT-001"),
    ("HSR Layout PS", "HSR Layout Sector 1", "Bengaluru Urban", 12.9116, 77.6389, "HSR-001"),
    ("Electronic City PS", "Electronic City Phase 1", "Bengaluru Urban", 12.8456, 77.6603, "ELC-001"),
    ("Marathahalli PS", "Marathahalli Bridge Road", "Bengaluru Urban", 12.9591, 77.6974, "MRT-001"),
    ("Hebbal PS", "Hebbal Flyover Junction", "Bengaluru Urban", 13.0358, 77.5970, "HBL-001"),
    ("Yelahanka PS", "Yelahanka New Town", "Bengaluru Urban", 13.1007, 77.5963, "YLK-001"),
    ("Banashankari PS", "Banashankari 2nd Stage", "Bengaluru Urban", 12.9255, 77.5468, "BNS-001"),
    ("Mysuru Lashkar PS", "Lashkar Mohalla, Mysuru", "Mysuru", 12.3051, 76.6551, "MYS-001"),
    ("Mangaluru City PS", "Hampankatta, Mangaluru", "Mangaluru", 12.8714, 74.8431, "MNG-001"),
    ("Hubli PS", "Hubli Old Town", "Hubli-Dharwad", 15.3647, 75.1240, "HUB-001"),
    ("Belagavi PS", "Belagavi Camp Area", "Belagavi", 15.8497, 74.4977, "BLG-001"),
    ("Kalaburagi PS", "Kalaburagi Main", "Kalaburagi", 17.3297, 76.8343, "KLB-001"),
]


DISTRICT_SOCIO_DATA = [
    ("Bengaluru Urban", 12765000, 88.7, 4.2, 8.1, 91.5, 4381, 3.8, 5.2, 45000, 312.5),
    ("Bengaluru Rural", 990923, 77.9, 6.1, 12.3, 35.2, 432, 5.1, 3.1, 28000, 145.2),
    ("Mysuru", 3001127, 72.8, 5.8, 14.2, 41.6, 476, 6.2, 4.5, 32000, 198.7),
    ("Mangaluru", 2089649, 88.6, 4.5, 9.8, 47.8, 587, 4.1, 6.8, 38000, 167.3),
    ("Hubli-Dharwad", 1846993, 80.9, 7.2, 15.6, 52.3, 389, 7.3, 4.2, 26000, 234.1),
    ("Belagavi", 4778439, 73.5, 8.1, 18.2, 31.4, 355, 8.5, 3.5, 22000, 178.9),
    ("Kalaburagi", 2566326, 64.8, 12.3, 28.5, 28.7, 321, 12.1, 7.2, 18000, 289.4),
    ("Davangere", 1946905, 75.7, 7.8, 16.1, 35.8, 367, 7.8, 3.8, 24000, 156.8),
    ("Ballari", 2532383, 67.4, 10.5, 22.7, 33.2, 298, 10.2, 5.6, 20000, 245.6),
    ("Tumkur", 2678980, 75.1, 6.9, 14.8, 29.5, 378, 6.5, 2.8, 25000, 134.2),
    ("Shimoga", 1752753, 80.5, 5.5, 11.2, 34.1, 312, 5.8, 3.2, 27000, 112.5),
    ("Raichur", 1924773, 59.7, 14.2, 31.5, 24.8, 287, 14.5, 8.1, 16000, 312.8),
    ("Hassan", 1776421, 76.1, 6.2, 13.5, 25.6, 334, 6.8, 2.5, 26000, 98.7),
    ("Udupi", 1177361, 86.3, 3.8, 7.5, 42.1, 412, 3.2, 4.8, 35000, 89.3),
    ("Mandya", 1808680, 69.6, 7.5, 16.8, 22.4, 356, 7.1, 2.1, 23000, 145.6),
    ("Chitradurga", 1659456, 71.2, 8.8, 19.2, 27.3, 312, 9.1, 3.5, 21000, 167.8),
]


def generate_fir_description(category_name: str, location: str) -> str:
    """Generate realistic FIR descriptions."""
    templates = {
        "Chain Snatching": [
            f"Complainant was walking near {location} at approximately {{time}} when two unknown persons on a black motorcycle approached from behind. The pillion rider snatched the gold chain (approx {{weight}}g) from the complainant's neck and fled towards {{direction}}. Complainant sustained minor neck injuries.",
            f"While returning from temple near {location}, the victim was targeted by chain snatcher. Single accused on Honda Activa grabbed 22-carat gold chain weighing approximately {{weight}}g. CCTV footage from nearby shop being collected.",
        ],
        "Theft": [
            f"Complainant reports theft of {{items}} from residence at {location}. The incident occurred between {{time_range}} while family was away. Entry gained through {{entry_point}}. Estimated loss: Rs. {{amount}}.",
            f"Mobile phone ({{brand}}) stolen from complainant's pocket while traveling in BMTC bus near {location}. Suspect described as {{description}}.",
        ],
        "Burglary": [
            f"Unknown persons broke into the locked residence at {location} during night hours. Gold jewelry, cash Rs.{{amount}}, and electronic items stolen. Entry through {{entry_point}}. Fingerprints lifted from scene.",
            f"Commercial establishment at {location} burgled. CCTV shows 3 accused breaking shutter lock at {{time}}. Cash register and inventory worth Rs.{{amount}} stolen.",
        ],
        "Cyber Crime": [
            f"Complainant received SMS claiming to be from {{bank}} regarding KYC update. After clicking link and entering details, Rs.{{amount}} debited from account. Transaction traced to UPI ID {{upi_id}}.",
            f"Complainant's social media account hacked. Accused impersonating victim asked friends for money via UPI. Total loss reported: Rs.{{amount}}.",
        ],
        "Vehicle Theft": [
            f"{{vehicle_type}} (Reg: KA-{{reg}}) stolen from parking area near {location}. Vehicle was locked. Last seen at {{time}}. Insurance valid till {{date}}.",
        ],
        "Drug Trafficking": [
            f"Based on credible information, raid conducted at {location}. Recovered {{quantity}} of {{substance}}. Accused {{names}} arrested. Investigation reveals interstate network.",
        ],
        "Assault": [
            f"Complainant assaulted by {{count}} known/unknown persons near {location} over {{reason}}. Sustained injuries to {{body_parts}}. Medical examination confirms {{injury_type}} injuries.",
        ],
        "Robbery": [
            f"Complainant robbed at knife-point near {location} at {{time}}. Accused took mobile phone, wallet containing Rs.{{amount}}, and gold ring. Fled on {{vehicle}}.",
        ],
        "Fraud": [
            f"Complainant cheated of Rs.{{amount}} by accused who promised {{promise}}. Multiple victims identified with similar MO. Total fraud amount estimated at Rs.{{total}}.",
        ],
        "Murder": [
            f"Body of {{gender}} person found at {location}. Preliminary examination shows {{cause}}. Identity established as {{name}}. Investigation under progress. Previous enmity suspected.",
        ],
    }
    category_templates = templates.get(category_name, [f"Crime reported at {location}. Investigation underway."])
    template = random.choice(category_templates)
    # Fill placeholders with random data
    replacements = {
        "time": random.choice(["8:30 PM", "9:15 PM", "10:00 PM", "7:45 PM", "11:30 PM", "6:00 AM"]),
        "weight": str(random.randint(15, 45)),
        "direction": random.choice(["Hosur Road", "Outer Ring Road", "Old Airport Road", "Bannerghatta Road"]),
        "items": random.choice(["laptop, gold jewelry", "cash and documents", "two mobile phones and wallet"]),
        "time_range": random.choice(["10AM-5PM", "2PM-8PM", "8AM-6PM"]),
        "entry_point": random.choice(["back door", "broken window", "terrace", "ventilator"]),
        "amount": str(random.choice([15000, 25000, 50000, 100000, 250000, 500000, 1000000])),
        "brand": random.choice(["iPhone 15", "Samsung S24", "OnePlus 12", "Pixel 8"]),
        "description": random.choice(["male, 25-30 years, medium build", "thin male wearing black hoodie"]),
        "bank": random.choice(["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank"]),
        "upi_id": f"{random.choice(['fraud', 'fake', 'temp'])}{random.randint(100,999)}@ybl",
        "vehicle_type": random.choice(["Hero Splendor", "Honda Activa", "Bajaj Pulsar", "Royal Enfield", "Maruti Swift"]),
        "reg": f"{random.randint(1,99):02d}-{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[random.randint(0,25)]}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}-{random.randint(1000,9999)}",
        "date": "2026-12-31",
        "quantity": random.choice(["500g", "2kg", "100g", "5kg"]),
        "substance": random.choice(["ganja", "MDMA pills", "cocaine", "heroin"]),
        "names": "accused persons",
        "count": str(random.randint(2, 5)),
        "reason": random.choice(["previous enmity", "road rage", "property dispute", "personal grudge"]),
        "body_parts": random.choice(["head and face", "arms and chest", "back and legs"]),
        "injury_type": random.choice(["grievous", "simple", "moderate"]),
        "vehicle": random.choice(["motorcycle", "auto-rickshaw", "on foot"]),
        "promise": random.choice(["job placement", "loan approval", "property deal", "investment returns"]),
        "total": str(random.randint(5, 50)) + " lakhs",
        "gender": random.choice(["male", "female"]),
        "cause": random.choice(["stab wounds", "blunt force trauma", "strangulation"]),
        "name": random.choice(KANNADA_MALE_NAMES + KANNADA_FEMALE_NAMES),
    }
    for key, val in replacements.items():
        template = template.replace("{{" + key + "}}", val)
    return template


def seed_db():
    """Main seed function - creates all data."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        print("=" * 60)
        print("PRAHARI - Seeding Database with Karnataka Crime Data")
        print("=" * 60)

        # -----------------------------------------------------------------
        # 1. USERS (Multi-role)
        # -----------------------------------------------------------------
        print("\n[1/12] Creating users...")
        users = []
        user_data = [
            ("admin", "admin@ksp.gov.in", "SP Rajendra Kumar", "admin123", UserRole.ADMIN),
            ("supervisor", "supervisor@ksp.gov.in", "DySP Anand Patil", "supervisor123", UserRole.SUPERVISOR),
            ("investigator", "investigator@ksp.gov.in", "Inspector Deepak Kumar", "investigator123", UserRole.INVESTIGATOR),
            ("investigator2", "inv2@ksp.gov.in", "Inspector Priya Sharma", "investigator123", UserRole.INVESTIGATOR),
            ("analyst", "analyst@ksp.gov.in", "Data Analyst Meera", "analyst123", UserRole.ANALYST),
            ("constable", "constable@ksp.gov.in", "HC Ramesh Gowda", "constable123", UserRole.CONSTABLE),
            ("constable2", "const2@ksp.gov.in", "PC Sunil Kumar", "constable123", UserRole.CONSTABLE),
            ("policymaker", "policy@ksp.gov.in", "Addl. DGP Sharma", "policy123", UserRole.POLICYMAKER),
        ]
        for uname, email, fname, pwd, role in user_data:
            u = User(
                username=uname, email=email, full_name=fname,
                hashed_password=get_password_hash(pwd), role=role
            )
            session.add(u)
            users.append(u)
        session.commit()
        for u in users:
            session.refresh(u)
        print(f"   Created {len(users)} users")


        # -----------------------------------------------------------------
        # 2. POLICE STATIONS
        # -----------------------------------------------------------------
        print("\n[2/12] Creating police stations...")
        stations = []
        for name, loc, dist, lat, lng, code in POLICE_STATIONS_DATA:
            ps = PoliceStation(
                name=name, location=loc, district=dist,
                latitude=lat, longitude=lng,
                contact_number=f"080-{random.randint(22000000, 29999999)}",
                station_code=code
            )
            session.add(ps)
            stations.append(ps)
        session.commit()
        for s in stations:
            session.refresh(s)
        print(f"   Created {len(stations)} police stations")

        # -----------------------------------------------------------------
        # 3. CRIME CATEGORIES
        # -----------------------------------------------------------------
        print("\n[3/12] Creating crime categories...")
        categories = []
        for name, desc, ipc, sev in CRIME_CATEGORIES_DATA:
            cat = CrimeCategory(name=name, description=desc, ipc_section=ipc, severity=sev)
            session.add(cat)
            categories.append(cat)
        session.commit()
        for c in categories:
            session.refresh(c)
        print(f"   Created {len(categories)} crime categories")


        # -----------------------------------------------------------------
        # 4. OFFICERS
        # -----------------------------------------------------------------
        print("\n[4/12] Creating officers...")
        officers = []
        ranks = ["Constable", "Head Constable", "ASI", "Sub-Inspector", "Inspector", "DSP", "SP"]
        for i in range(30):
            name = random.choice(KANNADA_MALE_NAMES) if random.random() > 0.2 else random.choice(KANNADA_FEMALE_NAMES)
            off = Officer(
                name=name,
                badge_number=f"KSP-{2000+i:04d}",
                rank=random.choice(ranks),
                contact_number=f"98{random.randint(10000000, 99999999)}",
                police_station_id=random.choice(stations).id,
                user_id=users[min(i, len(users)-1)].id if i < len(users) else None
            )
            session.add(off)
            officers.append(off)
        session.commit()
        for o in officers:
            session.refresh(o)
        print(f"   Created {len(officers)} officers")

        # -----------------------------------------------------------------
        # 5. CRIMINALS (with entity resolution test data)
        # -----------------------------------------------------------------
        print("\n[5/12] Creating criminals with entity resolution variants...")
        criminals = []

        # Gang members with deliberate name variants for entity resolution
        gang_criminals = []
        for gang in GANG_DATA:
            for member_name in gang["members"]:
                phone = f"98{random.randint(10000000, 99999999)}"
                locality = next((l for l in BANGALORE_LOCALITIES if l[0] == gang["area"]), BANGALORE_LOCALITIES[0])
                c = Criminal(
                    name=member_name,
                    alias=f"{member_name.split()[0]}_{random.randint(1,99)}" if random.random() > 0.5 else None,
                    address=f"{random.randint(1,500)}, {locality[0]}, Bengaluru",
                    phone_number=phone,
                    age=random.randint(22, 45),
                    gender="Male",
                    modus_operandi=random.choice(MODUS_OPERANDI_TEMPLATES.get(gang["crime_type"], ["General criminal activity"])),
                    gang_affiliation=gang["name"],
                    is_repeat_offender=True,
                    total_cases=random.randint(3, 8),
                    active_area=gang["area"],
                    criminal_record=f"Multiple cases of {gang['crime_type']} in {gang['area']} area. Known gang member.",
                    last_known_latitude=locality[1] + random.uniform(-0.01, 0.01),
                    last_known_longitude=locality[2] + random.uniform(-0.01, 0.01),
                )
                session.add(c)
                criminals.append(c)
                gang_criminals.append(c)


        # Regular criminals
        for i in range(60):
            name = random.choice(KANNADA_MALE_NAMES) if random.random() > 0.15 else random.choice(KANNADA_FEMALE_NAMES)
            locality = random.choice(BANGALORE_LOCALITIES)
            is_repeat = random.random() > 0.7
            c = Criminal(
                name=name,
                alias=f"{name.split()[0]} alias {random.choice(['Chota', 'Lambu', 'Kala', 'Gunda', 'Don'])}" if random.random() > 0.6 else None,
                address=f"{random.randint(1,999)}, {locality[0]}, Bengaluru - {random.randint(560001, 560099)}",
                phone_number=f"{'97' if random.random() > 0.5 else '98'}{random.randint(10000000, 99999999)}",
                age=random.randint(18, 55),
                gender="Male" if random.random() > 0.15 else "Female",
                modus_operandi=None,
                is_repeat_offender=is_repeat,
                total_cases=random.randint(2, 6) if is_repeat else random.randint(0, 1),
                active_area=locality[0],
                last_known_latitude=locality[1] + random.uniform(-0.02, 0.02),
                last_known_longitude=locality[2] + random.uniform(-0.02, 0.02),
            )
            session.add(c)
            criminals.append(c)

        session.commit()
        for c in criminals:
            session.refresh(c)
        print(f"   Created {len(criminals)} criminals ({len(gang_criminals)} gang members)")


        # -----------------------------------------------------------------
        # 6. VICTIMS
        # -----------------------------------------------------------------
        print("\n[6/12] Creating victims...")
        victims = []
        occupations = ["Software Engineer", "Housewife", "Student", "Teacher", "Shopkeeper",
                       "Auto Driver", "Doctor", "Businessman", "Daily Wage Worker", "Retired"]
        for i in range(120):
            gender = "Female" if random.random() > 0.45 else "Male"
            name = random.choice(KANNADA_FEMALE_NAMES) if gender == "Female" else random.choice(KANNADA_MALE_NAMES)
            locality = random.choice(BANGALORE_LOCALITIES)
            v = Victim(
                name=name,
                address=f"{random.randint(1,999)}, {locality[0]}, Bengaluru",
                phone_number=f"98{random.randint(10000000, 99999999)}",
                age=random.randint(18, 70),
                gender=gender,
                occupation=random.choice(occupations)
            )
            session.add(v)
            victims.append(v)
        session.commit()
        for v in victims:
            session.refresh(v)
        print(f"   Created {len(victims)} victims")

        # -----------------------------------------------------------------
        # 7. WITNESSES
        # -----------------------------------------------------------------
        print("\n[7/12] Creating witnesses...")
        witnesses = []
        for i in range(50):
            name = random.choice(KANNADA_MALE_NAMES + KANNADA_FEMALE_NAMES)
            w = Witness(
                name=name,
                address=f"{random.randint(1,999)}, {random.choice(BANGALORE_LOCALITIES)[0]}, Bengaluru",
                phone_number=f"99{random.randint(10000000, 99999999)}",
                statement_summary=random.choice([
                    "Saw two persons on motorcycle fleeing the scene",
                    "Heard shouting and saw accused running away",
                    "Was present at the time and saw the incident clearly",
                    "CCTV from shop captured the incident",
                    "Noticed suspicious activity in the area that evening",
                ]),
                reliability_score=round(random.uniform(0.4, 0.95), 2)
            )
            session.add(w)
            witnesses.append(w)
        session.commit()
        for w in witnesses:
            session.refresh(w)
        print(f"   Created {len(witnesses)} witnesses")


        # -----------------------------------------------------------------
        # 8. FIRs (250+ with realistic data)
        # -----------------------------------------------------------------
        print("\n[8/12] Creating 250 FIRs with linked entities...")
        firs = []
        time_periods = ["morning", "afternoon", "evening", "night"]
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for i in range(250):
            locality = random.choice(BANGALORE_LOCALITIES)
            category = random.choice(categories)
            station = random.choice(stations[:10])  # Mostly Bangalore stations
            officer = random.choice(officers)

            # Time distribution - more crimes at night
            hour = random.choices(
                range(24),
                weights=[1,1,1,1,1,2,3,4,5,5,4,4,4,4,5,5,6,7,8,9,9,8,5,3]
            )[0]
            incident_date = datetime.now(timezone.utc) - timedelta(
                days=random.randint(1, 720),
                hours=random.randint(0, 23)
            )
            incident_date = incident_date.replace(hour=hour)

            if hour < 6:
                tod = "night"
            elif hour < 12:
                tod = "morning"
            elif hour < 17:
                tod = "afternoon"
            else:
                tod = "evening"

            description = generate_fir_description(category.name, locality[0])
            severity = category.severity if category.severity != "critical" or random.random() > 0.3 else "high"

            fir = FIR(
                fir_number=f"FIR/{incident_date.year}/{station.station_code}/{10000+i}",
                incident_date=incident_date,
                registration_date=incident_date + timedelta(hours=random.randint(1, 24)),
                location=f"{locality[0]}, Bengaluru",
                latitude=locality[1] + random.uniform(-0.005, 0.005),
                longitude=locality[2] + random.uniform(-0.005, 0.005),
                district=station.district,
                description=description,
                status=random.choices(
                    list(FIRStatus),
                    weights=[30, 35, 20, 10, 5]
                )[0],
                severity=severity,
                time_of_day=tod,
                day_of_week=days[incident_date.weekday()],
                category_id=category.id,
                officer_id=officer.id,
                station_id=station.id,
            )
            session.add(fir)
            firs.append(fir)

        session.commit()
        for f in firs:
            session.refresh(f)
        print(f"   Created {len(firs)} FIRs")


        # Link criminals to FIRs (with repeat offenders appearing multiple times)
        print("   Linking criminals to FIRs...")
        for fir in firs:
            num_criminals = random.choices([0, 1, 2, 3], weights=[10, 50, 30, 10])[0]
            if num_criminals > 0:
                # 30% chance to use a gang member (repeat offender)
                selected = []
                for _ in range(num_criminals):
                    if random.random() > 0.7 and gang_criminals:
                        selected.append(random.choice(gang_criminals))
                    else:
                        selected.append(random.choice(criminals))
                for crim in selected:
                    link = FIRCriminalLink(fir_id=fir.id, criminal_id=crim.id)
                    session.add(link)

        # Link victims to FIRs
        print("   Linking victims to FIRs...")
        for fir in firs:
            num_victims = random.randint(1, 2)
            selected_victims = random.sample(victims, min(num_victims, len(victims)))
            for vic in selected_victims:
                link = FIRVictimLink(fir_id=fir.id, victim_id=vic.id)
                session.add(link)

        # Link witnesses to FIRs
        print("   Linking witnesses to FIRs...")
        for fir in firs:
            if random.random() > 0.4:  # 60% of FIRs have witnesses
                num_witnesses = random.randint(1, 2)
                selected_witnesses = random.sample(witnesses, min(num_witnesses, len(witnesses)))
                for wit in selected_witnesses:
                    link = FIRWitnessLink(fir_id=fir.id, witness_id=wit.id)
                    session.add(link)

        session.commit()


        # -----------------------------------------------------------------
        # 9. EVIDENCE & INVESTIGATION REPORTS
        # -----------------------------------------------------------------
        print("\n[9/12] Creating evidence and reports...")
        evidence_count = 0
        report_count = 0
        for fir in firs:
            # Evidence
            for _ in range(random.randint(1, 4)):
                ev = Evidence(
                    fir_id=fir.id,
                    type=random.choice(list(EvidenceType)),
                    description=random.choice([
                        "CCTV footage from nearby establishment",
                        "Victim's torn clothing with blood stains",
                        "Fingerprints lifted from crime scene",
                        "Mobile phone call records analysis",
                        "Witness photograph of suspect",
                        "Weapon recovered from scene",
                        "Financial transaction records",
                        "GPS location data from victim's phone",
                    ]),
                    file_path=f"/evidence/{fir.fir_number}/item_{random.randint(1,99)}.pdf"
                )
                session.add(ev)
                evidence_count += 1

            # Reports
            for j in range(random.randint(1, 2)):
                rpt = InvestigationReport(
                    fir_id=fir.id,
                    report_content=random.choice([
                        "Initial investigation reveals the accused was seen in CCTV footage near the location. Further probe underway.",
                        "Witness statements corroborate the complainant's version. Accused identified and being traced.",
                        "Forensic report received. DNA samples match with accused. Chargesheet preparation in progress.",
                        "Investigation progressing. Two suspects detained for questioning. Their antecedents being verified.",
                        "Case transferred to cyber cell for technical analysis. Preliminary findings shared with IO.",
                    ]),
                    report_type=random.choice(["progress", "final", "forensic", "witness"]),
                    created_at=fir.registration_date + timedelta(days=random.randint(1, 30)),
                    created_by=random.choice(users[:4]).id
                )
                session.add(rpt)
                report_count += 1

        session.commit()
        print(f"   Created {evidence_count} evidence items, {report_count} reports")


        # -----------------------------------------------------------------
        # 10. FINANCIAL DATA
        # -----------------------------------------------------------------
        print("\n[10/12] Creating financial crime data...")
        accounts = []
        banks = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Canara Bank", "Karnataka Bank"]
        for i in range(30):
            crim = random.choice(criminals[:20]) if i < 15 else None
            acc = BankAccount(
                account_number=f"{random.randint(1000, 9999)}{random.randint(10000000, 99999999)}",
                bank_name=random.choice(banks),
                ifsc_code=f"{random.choice(['SBIN', 'HDFC', 'ICIC', 'UTIB', 'CNRB'])}0{random.randint(100000, 999999)}",
                account_holder_name=random.choice(KANNADA_MALE_NAMES),
                criminal_id=crim.id if crim else None,
                is_suspicious=random.random() > 0.6,
                is_shell_account=random.random() > 0.85,
                total_suspicious_transactions=random.randint(0, 12)
            )
            session.add(acc)
            accounts.append(acc)
        session.commit()
        for a in accounts:
            session.refresh(a)

        # Transactions
        txn_count = 0
        for i in range(80):
            from_acc = random.choice(accounts)
            to_acc = random.choice([a for a in accounts if a.id != from_acc.id])
            amount = random.choice([4900, 9900, 49000, 99000, 150000, 250000, 500000])
            is_structured = 9000 < amount < 10000 or 48000 < amount < 50000
            txn = FinancialTransaction(
                transaction_id=f"TXN{datetime.now().year}{random.randint(100000, 999999)}",
                from_account=from_acc.account_number,
                to_account=to_acc.account_number,
                amount=amount,
                transaction_type=random.choice(list(TransactionType)),
                timestamp=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 365)),
                description=random.choice(["Transfer", "Payment", "Refund", "Investment", None]),
                is_suspicious=random.random() > 0.6,
                suspicion_reason=random.choice([None, "High frequency", "Circular pattern", "Just below threshold"]),
                fir_id=random.choice(firs[:50]).id if random.random() > 0.5 else None,
                is_circular=random.random() > 0.85,
                is_structured=is_structured,
                is_rapid_hop=random.random() > 0.9,
            )
            session.add(txn)
            txn_count += 1
        session.commit()
        print(f"   Created {len(accounts)} bank accounts, {txn_count} transactions")


        # -----------------------------------------------------------------
        # 11. ALERTS & PREDICTIONS
        # -----------------------------------------------------------------
        print("\n[11/12] Creating alerts and predictions...")
        alert_templates = [
            ("Chain Snatching Spike - Koramangala", "3 chain snatching incidents in Koramangala within 7 days. Potential serial offender active.", AlertSeverity.HIGH, "pattern", "Koramangala", 0.82),
            ("Predicted Burglary Hotspot - HSR Layout", "Based on 6-month pattern analysis, HSR Layout Sector 2 shows 65% probability of burglary this weekend.", AlertSeverity.MEDIUM, "prediction", "HSR Layout", 0.65),
            ("Gang Activity Warning - Peenya", "Sudden increase in drug-related activity near Peenya industrial area. 4 related arrests in 2 weeks.", AlertSeverity.CRITICAL, "network", "Peenya", 0.91),
            ("Cyber Fraud Cluster - Whitefield", "5 similar phishing complaints from Whitefield IT parks. Same UPI pattern detected.", AlertSeverity.HIGH, "pattern", "Whitefield", 0.78),
            ("Vehicle Theft Pattern - Marathahalli", "Motorcycle thefts increased 200% near Marathahalli Bridge. Night patrol recommended.", AlertSeverity.MEDIUM, "prediction", "Marathahalli", 0.72),
            ("Repeat Offender Active - Jayanagar", "Known chain snatcher Ravi Kumar spotted in Jayanagar. Previously convicted for 4 similar cases.", AlertSeverity.HIGH, "network", "Jayanagar", 0.88),
            ("Festival Season Alert", "Ganesh Chaturthi approaching - historically 40% increase in property crimes. Deploy additional patrols.", AlertSeverity.MEDIUM, "prediction", "Bengaluru Urban", 0.75),
            ("Financial Fraud Network", "Circular transactions detected between 5 accounts linked to cyber crime FIRs. Money laundering suspected.", AlertSeverity.CRITICAL, "financial", "Bengaluru Urban", 0.85),
        ]
        for title, desc, sev, atype, loc, conf in alert_templates:
            locality_data = next((l for l in BANGALORE_LOCALITIES if l[0] == loc), None)
            alert = CrimeAlert(
                title=title, description=desc, severity=sev,
                alert_type=atype, location=loc,
                latitude=locality_data[1] if locality_data else 12.97,
                longitude=locality_data[2] if locality_data else 77.59,
                district="Bengaluru Urban",
                confidence_score=conf, is_active=True,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
                recommended_action=random.choice([
                    "Deploy 2 additional patrol units between 8PM-12AM",
                    "Alert all beat officers in the area",
                    "Issue BOLO for known suspects",
                    "Increase CCTV monitoring in hotspot zone",
                    "Coordinate with cyber cell for digital trail"
                ])
            )
            session.add(alert)

        # Predictions
        for i in range(15):
            locality = random.choice(BANGALORE_LOCALITIES)
            pred = CrimePrediction(
                prediction_type=random.choice(["hotspot", "trend", "offender", "pattern"]),
                location=locality[0],
                district="Bengaluru Urban",
                latitude=locality[1],
                longitude=locality[2],
                crime_type=random.choice(categories).name,
                predicted_date_start=datetime.now(timezone.utc) + timedelta(days=random.randint(1, 7)),
                predicted_date_end=datetime.now(timezone.utc) + timedelta(days=random.randint(8, 14)),
                probability=round(random.uniform(0.45, 0.92), 2),
                confidence=random.choice(["low", "medium", "high"]),
                basis=json.dumps({"historical_cases": random.randint(5, 25), "pattern_match": True, "event_correlation": random.random() > 0.5}),
                recommended_action=f"Deploy patrol in {locality[0]} during {'evening' if random.random() > 0.5 else 'night'} hours",
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)),
            )
            session.add(pred)
        session.commit()
        print(f"   Created {len(alert_templates)} alerts, 15 predictions")


        # -----------------------------------------------------------------
        # 12. SOCIOLOGICAL DATA & AUDIT LOGS
        # -----------------------------------------------------------------
        print("\n[12/12] Creating sociological data and audit logs...")
        for dist, pop, lit, unemp, pov, urb, dens, drop, mig, inc, crime in DISTRICT_SOCIO_DATA:
            # Calculate social risk score
            risk = min(100, (unemp * 2.5) + (pov * 1.5) + (drop * 2.0) + (100 - lit) * 0.8)
            socio = DistrictSocioData(
                district=dist,
                population=pop,
                literacy_rate=lit,
                unemployment_rate=unemp,
                poverty_rate=pov,
                urbanization_rate=urb,
                population_density=dens,
                school_dropout_rate=drop,
                migration_influx_rate=mig,
                average_income=inc,
                crime_rate_per_lakh=crime,
                social_risk_score=round(risk, 1),
                risk_factors=json.dumps({
                    "unemployment": round(unemp * 2.5, 1),
                    "poverty": round(pov * 1.5, 1),
                    "school_dropout": round(drop * 2.0, 1),
                    "low_literacy": round((100 - lit) * 0.8, 1)
                })
            )
            session.add(socio)

        # Sample audit logs with hash chain
        prev_hash = "GENESIS"
        for i in range(20):
            log_data = {
                "user_id": random.choice(users[:4]).id,
                "action": random.choice(["login", "query", "view", "export"]),
                "entity_name": random.choice(["FIR", "Criminal", "Network", "Report"]),
                "timestamp": (datetime.now(timezone.utc) - timedelta(hours=i)).isoformat(),
                "previous_hash": prev_hash
            }
            current_hash = hashlib.sha256(json.dumps(log_data, sort_keys=True).encode()).hexdigest()
            audit = AuditLog(
                user_id=log_data["user_id"],
                action=log_data["action"],
                entity_name=log_data["entity_name"],
                entity_id=random.randint(1, 100),
                timestamp=datetime.now(timezone.utc) - timedelta(hours=i),
                details=f"User performed {log_data['action']} on {log_data['entity_name']}",
                sensitivity_level=random.choice(["low", "medium", "high"]),
                previous_hash=prev_hash,
                current_hash=current_hash,
            )
            session.add(audit)
            prev_hash = current_hash

        session.commit()
        print(f"   Created {len(DISTRICT_SOCIO_DATA)} district socio records, 20 audit logs")

        # -----------------------------------------------------------------
        # COMPUTE RISK SCORES FOR CRIMINALS
        # -----------------------------------------------------------------
        print("\n   Computing risk scores for criminals...")
        for crim in criminals:
            history_score = min(40, crim.total_cases * 10)
            network_score = 25 if crim.gang_affiliation else 0
            repeat_score = 20 if crim.is_repeat_offender else 0
            random_factor = random.uniform(0, 15)
            total = min(100, history_score + network_score + repeat_score + random_factor)
            crim.risk_score = round(total, 1)
            crim.risk_breakdown = json.dumps({
                "criminal_history": round(history_score, 1),
                "network_centrality": round(network_score, 1),
                "repeat_offender": round(repeat_score, 1),
                "mo_escalation": round(random_factor, 1)
            })
            if crim.is_repeat_offender:
                crim.behavioral_profile = (
                    f"Known repeat offender operating primarily in {crim.active_area or 'various'} area. "
                    f"{'Member of ' + crim.gang_affiliation + '. ' if crim.gang_affiliation else ''}"
                    f"Total {crim.total_cases} known cases. "
                    f"Primary MO: {crim.modus_operandi or 'varied'}. "
                    f"Risk assessment: {'HIGH' if total > 60 else 'MEDIUM'}."
                )
            session.add(crim)
        session.commit()

        print("\n" + "=" * 60)
        print("DATABASE SEEDING COMPLETE!")
        print(f"  Users: {len(users)}")
        print(f"  Stations: {len(stations)}")
        print(f"  Categories: {len(categories)}")
        print(f"  Officers: {len(officers)}")
        print(f"  Criminals: {len(criminals)}")
        print(f"  Victims: {len(victims)}")
        print(f"  Witnesses: {len(witnesses)}")
        print(f"  FIRs: {len(firs)}")
        print(f"  Evidence: {evidence_count}")
        print(f"  Reports: {report_count}")
        print(f"  Bank Accounts: {len(accounts)}")
        print(f"  Transactions: {txn_count}")
        print("=" * 60)


if __name__ == "__main__":
    seed_db()
