"""Synthetic data generator for PRAHARI - 200+ realistic Karnataka FIRs."""
import random
import json
from datetime import datetime, timedelta
from faker import Faker

fake = Faker("en_IN")
random.seed(42)

# Karnataka-specific data
DISTRICTS = [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru",
    "Hubli-Dharwad", "Belagavi", "Kalaburagi", "Davanagere",
    "Ballari", "Tumakuru", "Shivamogga", "Raichur",
]

BANGALORE_LOCALITIES = [
    ("Koramangala", 12.9352, 77.6245),
    ("Jayanagar", 12.9250, 77.5938),
    ("Indiranagar", 12.9784, 77.6408),
    ("Whitefield", 12.9698, 77.7500),
    ("Electronic City", 12.8399, 77.6770),
    ("Marathahalli", 12.9591, 77.6974),
    ("BTM Layout", 12.9166, 77.6101),
    ("HSR Layout", 12.9116, 77.6389),
    ("JP Nagar", 12.9063, 77.5857),
    ("Banashankari", 12.9255, 77.5468),
    ("Rajajinagar", 12.9886, 77.5520),
    ("Malleswaram", 12.9969, 77.5688),
    ("Basavanagudi", 12.9434, 77.5748),
    ("Yelahanka", 13.1005, 77.5963),
    ("Hebbal", 13.0358, 77.5970),
    ("Vijayanagar", 12.9719, 77.5333),
    ("RT Nagar", 13.0215, 77.5964),
    ("Sadashivanagar", 13.0070, 77.5780),
    ("MG Road", 12.9758, 77.6066),
    ("100 Feet Road", 12.9352, 77.6090),
]

STATIONS = [
    "Koramangala PS", "Jayanagar PS", "Indiranagar PS", "Whitefield PS",
    "Electronic City PS", "Marathahalli PS", "BTM Layout PS", "HSR Layout PS",
    "Yelahanka PS", "Hebbal PS", "Vijayanagar PS", "Sadashivanagar PS",
    "Mysuru North PS", "Mysuru South PS", "Mangaluru PS", "Hubli PS",
]

CRIME_TYPES = {
    "chain snatching": {
        "ipc": "379/356 IPC",
        "bns": "303/115(2) BNS",
        "descriptions": [
            "Two persons on a motorcycle snatched a gold chain from the victim while she was walking",
            "Accused grabbed the gold chain of the victim and fled on a two-wheeler",
            "Chain snatching incident where accused targeted elderly woman walking alone",
            "Gold chain worth Rs. 2 lakhs snatched by two bike-borne assailants",
        ],
        "mo": [
            "Two-wheeler approach from behind, snatch and flee",
            "Target elderly women walking alone in evening hours",
            "Bike-borne duo, pillion rider grabs chain, speedy getaway",
        ],
    },
    "theft": {
        "ipc": "379 IPC",
        "bns": "303 BNS",
        "descriptions": [
            "Mobile phone stolen from victim's pocket in crowded market area",
            "Laptop stolen from coffee shop while victim was away",
            "Wallet pickpocketed at bus stop during rush hours",
            "Gold ornaments stolen from house during daytime",
        ],
        "mo": [
            "Crowded area pickpocket, distract and steal",
            "Break-in during daytime when residents are away",
            "Steal unattended belongings in public places",
        ],
    },
    "robbery": {
        "ipc": "392 IPC",
        "bns": "309 BNS",
        "descriptions": [
            "Armed robbery at jewelry store, accused threatened staff with knife",
            "ATM robbery - accused attacked victim after cash withdrawal",
            "Highway robbery - truck driver robbed at gunpoint",
            "Group of 3 persons robbed delivery person of cash and phone",
        ],
        "mo": [
            "Armed intimidation at commercial establishments",
            "Target ATM users during night hours",
            "Highway ambush of commercial vehicles",
        ],
    },
    "burglary": {
        "ipc": "457/380 IPC",
        "bns": "331/305 BNS",
        "descriptions": [
            "House break-in during night, cash and jewelry stolen",
            "Office burglary - electronic items worth 5 lakhs stolen",
            "Break-in through balcony window, gold ornaments missing",
            "Locked house broken into while family was on vacation",
        ],
        "mo": [
            "Night break-in through windows or back door",
            "Target houses during vacation or festive travel",
            "Use duplicate keys for apartment break-ins",
        ],
    },
    "fraud": {
        "ipc": "420 IPC",
        "bns": "316 BNS",
        "descriptions": [
            "Online fraud - victim lost Rs. 3.5 lakhs to fake investment scheme",
            "UPI fraud - accused tricked victim into sharing OTP",
            "Real estate fraud - fake property documents used to sell plot",
            "Job fraud - accused collected money promising government job",
        ],
        "mo": [
            "Social engineering through phone calls pretending to be bank",
            "Fake investment schemes with initial returns",
            "Impersonation of government officials",
        ],
    },
    "cyber crime": {
        "ipc": "66C/66D IT Act",
        "bns": "316/317 BNS + IT Act",
        "descriptions": [
            "Phishing attack - victim's bank account emptied of Rs. 8 lakhs",
            "Social media account hacked, used for extortion",
            "Ransomware attack on small business, demanded Rs. 5 lakhs in crypto",
            "Identity theft - fake loan taken using victim's Aadhaar",
        ],
        "mo": [
            "Phishing emails mimicking bank communications",
            "SIM swap fraud to intercept OTPs",
            "Malware distribution through fake apps",
        ],
    },
    "assault": {
        "ipc": "323/324 IPC",
        "bns": "115/117 BNS",
        "descriptions": [
            "Physical assault over parking dispute, victim suffered head injuries",
            "Assault with deadly weapon during road rage incident",
            "Group assault - 4 persons attacked victim over land dispute",
            "Domestic assault - accused beat wife causing multiple injuries",
        ],
        "mo": [
            "Dispute escalation to physical violence",
            "Road rage attacks with blunt weapons",
            "Group attacks over property/personal disputes",
        ],
    },
    "vehicle theft": {
        "ipc": "379 IPC",
        "bns": "303 BNS",
        "descriptions": [
            "Two-wheeler stolen from apartment parking lot",
            "Car stolen from outside restaurant while owner was dining",
            "Bike stolen using duplicate key from commercial area",
            "Auto-rickshaw stolen from driver during night shift",
        ],
        "mo": [
            "Duplicate key method for bikes in parking lots",
            "Break vehicle lock at night in poorly lit areas",
            "Steal vehicles from unattended parking during events",
        ],
    },
    "drug offense": {
        "ipc": "20/22 NDPS Act",
        "bns": "NDPS Act Sections",
        "descriptions": [
            "Seized 500 grams of ganja from accused's residence",
            "Commercial quantity of MDMA pills recovered during raid",
            "Drug peddling network busted, 2kg cocaine seized",
            "Accused found selling synthetic drugs near college campus",
        ],
        "mo": [
            "Distribution through delivery apps and dark web",
            "Campus-area peddling through student networks",
            "Interstate supply chain via highway transport",
        ],
    },
    "domestic violence": {
        "ipc": "498A IPC",
        "bns": "84/85 BNS",
        "descriptions": [
            "Complaint of dowry harassment and physical cruelty by husband",
            "Victim subjected to domestic violence for 3 years, now filed complaint",
            "Husband and in-laws demanding additional dowry, threatening victim",
            "Domestic violence complaint - victim suffered burn injuries",
        ],
        "mo": [
            "Ongoing domestic abuse with escalating severity",
            "Dowry demands with threats of abandonment",
            "Physical and emotional cruelty by spouse and in-laws",
        ],
    },
    "murder": {
        "ipc": "302 IPC",
        "bns": "101 BNS",
        "descriptions": [
            "Victim found dead with stab wounds, suspected personal enmity",
            "Murder during robbery attempt at victim's shop",
            "Honor killing - family members killed inter-caste couple",
            "Contract killing - victim was a local businessman",
        ],
        "mo": [
            "Premeditated killing using sharp weapons",
            "Murder during robbery when victim resisted",
            "Planned execution with multiple accused",
        ],
    },
    "kidnapping": {
        "ipc": "363/364 IPC",
        "bns": "137/138 BNS",
        "descriptions": [
            "Child kidnapped from school premises, ransom demanded",
            "Businessman kidnapped, Rs. 50 lakhs ransom demanded",
            "Young woman abducted from bus stop, rescued within 6 hours",
            "Minor girl kidnapped by neighbor, found in nearby district",
        ],
        "mo": [
            "Target children from school areas for ransom",
            "Kidnap businessmen for ransom using insider info",
            "Abduction for forced marriage",
        ],
    },
}

# Kannada names for realism
MALE_NAMES = [
    "Ravi Kumar", "Suresh Gowda", "Manjunath S", "Deepak Raj", "Ganesh Hegde",
    "Mahesh Patil", "Ramesh Nayak", "Venkatesh B", "Prasad Shetty", "Anil Kumar",
    "Rajesh Rao", "Karthik M", "Siddharth Jain", "Naveen Reddy", "Pradeep Kumar",
    "Shivakumar", "Basavaraj", "Harish Gowda", "Mohan Das", "Vishwanath K",
    "Santosh Kumar", "Manoj B", "Girish Nair", "Praveen M", "Vikram Singh",
    "Ashok Murthy", "Dinesh K", "Fakir Mohammed", "Ibrahim Khan", "Joseph Thomas",
    "Krishna Murthy", "Lokesh N", "Nagaraj B", "Patel Ravi", "Rafiq Ahmed",
]

FEMALE_NAMES = [
    "Lakshmi Devi", "Kavitha M", "Suma Gowda", "Priya Sharma", "Rekha Patil",
    "Anitha Raj", "Divya Shetty", "Geetha Nayak", "Hema K", "Jyothi Kumari",
    "Meena S", "Nandini Rao", "Padma Hegde", "Asha Reddy", "Bhavya M",
]

# Name variants for entity resolution testing
NAME_VARIANTS = {
    "Ravi Kumar": ["R. Kumar", "Ravi K", "Kumar Ravi"],
    "Suresh Gowda": ["S. Gowda", "Suresh G", "Gowda Suresh"],
    "Manjunath S": ["Manju", "M. Nath", "Manjunatha"],
    "Deepak Raj": ["D. Raj", "Deep", "Deepak R"],
}

# Gangs
GANGS = [
    {"id": "GANG_001", "name": "Koramangala Chain Gang", "members": [0, 3, 7, 12]},
    {"id": "GANG_002", "name": "Whitefield Auto Theft Ring", "members": [1, 5, 9, 14]},
    {"id": "GANG_003", "name": "Electronic City Fraud Network", "members": [2, 8, 11, 16]},
    {"id": "GANG_004", "name": "Jayanagar Robbery Crew", "members": [4, 6, 10, 15]},
]


def generate_accused(num: int = 40) -> list:
    """Generate accused persons with some as repeat offenders."""
    accused_list = []
    for i in range(num):
        name = MALE_NAMES[i % len(MALE_NAMES)] if i < 30 else FEMALE_NAMES[i % len(FEMALE_NAMES)]
        is_repeat = i < 15  # First 15 are repeat offenders
        total_cases = random.randint(3, 8) if is_repeat else random.randint(1, 2)

        # Assign gang
        gang_id = None
        for gang in GANGS:
            if i in gang["members"]:
                gang_id = gang["id"]
                break

        # Add alias for some
        alias = None
        if name in NAME_VARIANTS:
            alias = random.choice(NAME_VARIANTS[name])

        accused_list.append({
            "name": name,
            "alias": alias,
            "age": random.randint(19, 55),
            "gender": "male" if i < 30 else "female",
            "phone": f"9{random.randint(100000000, 999999999)}",
            "address": f"{fake.street_address()}, {random.choice(['Bengaluru', 'Mysuru', 'Mangaluru'])}",
            "id_type": random.choice(["aadhaar", "pan", "driving_license"]),
            "id_number": f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            "risk_score": random.uniform(60, 95) if is_repeat else random.uniform(15, 50),
            "is_repeat_offender": is_repeat,
            "total_cases": total_cases,
            "gang_id": gang_id,
        })

    return accused_list


def generate_firs(num: int = 220, accused_list: list = None) -> list:
    """Generate realistic FIRs."""
    firs = []
    now = datetime.now()

    for i in range(num):
        crime_type = random.choice(list(CRIME_TYPES.keys()))
        crime_data = CRIME_TYPES[crime_type]
        location = random.choice(BANGALORE_LOCALITIES)

        # Random date in last 12 months
        days_ago = random.randint(1, 365)
        occurrence_date = now - timedelta(days=days_ago)

        # Add some time variation
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        occurrence_date = occurrence_date.replace(hour=hour, minute=minute)

        district = "Bengaluru Urban" if location[0] in [l[0] for l in BANGALORE_LOCALITIES] else random.choice(DISTRICTS)
        station = random.choice(STATIONS)

        fir = {
            "fir_number": f"KSP/{district[:3].upper()}/{now.year}/{i + 1:04d}",
            "station_id": f"STN_{STATIONS.index(station) + 1:03d}",
            "station_name": station,
            "district": district,
            "crime_type": crime_type,
            "crime_subtype": crime_type,
            "ipc_section": crime_data["ipc"],
            "bns_section": crime_data["bns"],
            "description": random.choice(crime_data["descriptions"]),
            "modus_operandi": random.choice(crime_data["mo"]),
            "date_of_occurrence": occurrence_date.isoformat(),
            "date_of_registration": (occurrence_date + timedelta(hours=random.randint(1, 48))).isoformat(),
            "location_name": location[0],
            "latitude": location[1] + random.uniform(-0.005, 0.005),
            "longitude": location[2] + random.uniform(-0.005, 0.005),
            "status": random.choice(["open", "open", "investigating", "investigating", "closed", "chargesheeted"]),
            "severity": random.choice(["low", "medium", "medium", "high", "critical"]),
            "investigating_officer": f"Inspector {fake.last_name()}",
        }
        firs.append(fir)

    return firs


def generate_network_links(accused_list: list) -> list:
    """Generate criminal network connections."""
    links = []

    # Gang links
    for gang in GANGS:
        members = gang["members"]
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                if members[i] < len(accused_list) and members[j] < len(accused_list):
                    links.append({
                        "source_id": members[i] + 1,  # 1-indexed for DB
                        "target_id": members[j] + 1,
                        "relationship_type": "gang_member",
                        "strength": random.uniform(0.7, 1.0),
                    })

    # Co-accused links (random connections)
    for _ in range(30):
        src = random.randint(1, len(accused_list))
        tgt = random.randint(1, len(accused_list))
        if src != tgt:
            links.append({
                "source_id": src,
                "target_id": tgt,
                "relationship_type": random.choice(["co-accused", "associate", "informant"]),
                "strength": random.uniform(0.3, 0.8),
            })

    return links


def generate_transactions(accused_list: list) -> list:
    """Generate suspicious financial transactions."""
    transactions = []
    now = datetime.now()

    for i in range(50):
        accused_idx = random.randint(0, min(20, len(accused_list) - 1))
        amount = random.choice([
            random.uniform(5000, 49999),  # Below threshold
            random.uniform(50000, 500000),  # Large
            random.uniform(1000, 9999),  # Small
        ])

        transactions.append({
            "accused_id": accused_idx + 1,
            "from_account": f"XXXX{random.randint(1000, 9999)}",
            "to_account": f"XXXX{random.randint(1000, 9999)}",
            "amount": round(amount, 2),
            "transaction_type": random.choice(["upi", "bank", "upi", "cash"]),
            "timestamp": (now - timedelta(days=random.randint(1, 180))).isoformat(),
            "is_suspicious": random.random() > 0.6,
            "notes": random.choice([
                "Large cash deposit after robbery FIR",
                "Multiple rapid transfers to different accounts",
                "Transaction just below reporting threshold",
                "Transfer to known associate's account",
                None,
            ]),
        })

    return transactions


if __name__ == "__main__":
    # Generate all data
    accused = generate_accused(40)
    firs = generate_firs(220, accused)
    links = generate_network_links(accused)
    transactions = generate_transactions(accused)

    print(f"Generated: {len(accused)} accused, {len(firs)} FIRs, {len(links)} network links, {len(transactions)} transactions")
