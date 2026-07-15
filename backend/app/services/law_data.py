"""Indian law reference database for FIR validation (BNS 2023, IPC, IT Act)."""

LAW_DATABASE = {
    "theft": {"bns": "303", "ipc": "379", "description": "Theft - dishonestly taking movable property", "punishment": "Up to 3 years", "cognizable": True, "bailable": False},
    "robbery": {"bns": "309", "ipc": "392", "description": "Robbery - theft with force or fear", "punishment": "Up to 10 years", "cognizable": True, "bailable": False},
    "murder": {"bns": "101", "ipc": "302", "description": "Murder - causing death with intention", "punishment": "Life imprisonment or death", "cognizable": True, "bailable": False},
    "assault": {"bns": "115", "ipc": "323", "description": "Voluntarily causing hurt", "punishment": "Up to 1 year", "cognizable": True, "bailable": True},
    "fraud": {"bns": "318", "ipc": "420", "description": "Cheating and dishonestly inducing delivery of property", "punishment": "Up to 7 years", "cognizable": True, "bailable": False},
    "cyber crime": {"bns": "319", "ipc": "66C/66D IT Act", "description": "Identity theft / Cheating by personation using computer resource", "punishment": "Up to 3 years + fine", "cognizable": True, "bailable": True},
    "domestic violence": {"bns": "85", "ipc": "498A", "description": "Cruelty by husband or relatives of husband", "punishment": "Up to 3 years", "cognizable": True, "bailable": False},
    "chain snatching": {"bns": "304", "ipc": "379/356", "description": "Snatching (theft with sudden force)", "punishment": "Up to 3 years", "cognizable": True, "bailable": False},
    "burglary": {"bns": "305", "ipc": "457/380", "description": "Theft after house-trespass by night", "punishment": "Up to 5 years", "cognizable": True, "bailable": False},
    "kidnapping": {"bns": "137", "ipc": "363/364", "description": "Kidnapping from lawful guardianship", "punishment": "Up to 7 years", "cognizable": True, "bailable": False},
    "drug offense": {"bns": "NDPS Act", "ipc": "20/22 NDPS Act", "description": "Possession or sale of narcotic substance", "punishment": "Up to 10 years", "cognizable": True, "bailable": False},
    "vehicle theft": {"bns": "303", "ipc": "379", "description": "Theft of motor vehicle", "punishment": "Up to 3 years", "cognizable": True, "bailable": False},
    "sexual offense": {"bns": "64", "ipc": "376", "description": "Sexual assault / Rape", "punishment": "Min 10 years to life", "cognizable": True, "bailable": False},
    "defamation": {"bns": "356", "ipc": "499/500", "description": "Defamation - harm to reputation", "punishment": "Up to 2 years", "cognizable": False, "bailable": True},
    "trespass": {"bns": "329", "ipc": "441/447", "description": "Criminal trespass", "punishment": "Up to 3 months", "cognizable": False, "bailable": True},
}

# Keyword to crime-type detection for auto-classification
CRIME_KEYWORDS = {
    "chain snatching": ["snatch", "chain", "necklace", "gold chain"],
    "cyber crime": ["hack", "phishing", "online", "otp", "upi fraud", "cyber", "malware", "ransomware"],
    "robbery": ["rob", "robbed", "gunpoint", "knife point", "loot"],
    "theft": ["theft", "stole", "stolen", "steal", "pickpocket"],
    "assault": ["beat", "hit", "attack", "assault", "hurt", "injured"],
    "fraud": ["fraud", "cheat", "scam", "fake", "duped"],
    "murder": ["murder", "killed", "dead body", "homicide"],
    "domestic violence": ["domestic", "husband", "dowry", "in-laws", "cruelty"],
    "drug offense": ["drug", "ganja", "narcotic", "mdma", "cocaine"],
    "vehicle theft": ["bike stolen", "car stolen", "vehicle theft", "two-wheeler"],
    "kidnapping": ["kidnap", "abduct", "missing"],
    "burglary": ["break-in", "burglary", "house broken"],
    "sexual offense": ["rape", "molest", "sexual assault"],
}


def detect_crime_type(text: str) -> str:
    """Auto-detect crime type from complaint text."""
    text_lower = text.lower()
    scores = {}
    for crime, keywords in CRIME_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[crime] = score
    if scores:
        return max(scores, key=scores.get)
    return "theft"


# Cyber attack method knowledge base
CYBER_ATTACKS = {
    "phishing": {
        "name": "Phishing Attack",
        "keywords": ["phishing", "fake link", "fake website", "email", "clicked link"],
        "description": "Victim received fraudulent communication impersonating a trusted service",
        "steps": [
            "Attacker sends phishing email/SMS with fake link mimicking a trusted service",
            "Victim clicks link and lands on a fake website identical to the real one",
            "Victim enters credentials (username, password, OTP)",
            "Attacker captures credentials in real-time",
            "Attacker accesses the real account and transfers money to mule accounts",
        ],
        "forensics": [
            "Trace phishing URL domain registration via WHOIS lookup",
            "Check email headers for originating IP address",
            "Request bank transaction logs with IP and device fingerprint",
            "Cross-reference phishing domain with other complaints",
        ],
        "evidence": ["Email/SMS screenshot", "Phishing URL", "Transaction receipts", "Bank statement"],
        "laws": ["IT Act Sec 66C (Identity theft)", "IT Act Sec 66D (Cheating by personation)", "BNS 319"],
    },
    "sim_swap": {
        "name": "SIM Swap Fraud",
        "keywords": ["sim", "sim swap", "network gone", "no signal", "duplicate sim"],
        "description": "Attacker obtained a duplicate SIM of the victim's number to intercept OTPs",
        "steps": [
            "Attacker collects victim's personal info via social engineering or data breach",
            "Attacker requests a duplicate SIM at a telecom outlet with forged ID",
            "New SIM activated, victim's original SIM goes dead",
            "Attacker receives all OTPs on the new SIM",
            "Bank accounts drained using intercepted OTPs",
        ],
        "forensics": [
            "Obtain SIM swap request records from telecom operator",
            "Identify the outlet that issued the duplicate SIM and pull CCTV",
            "Examine the forged ID documents submitted",
            "Trace the money flow from the victim's account",
        ],
        "evidence": ["Telecom SIM swap records", "Outlet CCTV", "Forged ID", "Bank logs", "Cell tower data"],
        "laws": ["IT Act Sec 66C", "IT Act Sec 43", "BNS 319", "Indian Telegraph Act"],
    },
    "upi_fraud": {
        "name": "UPI / Payment Fraud",
        "keywords": ["upi", "google pay", "phonepe", "paytm", "collect request", "qr code"],
        "description": "Victim tricked into authorising a payment via social engineering",
        "steps": [
            "Attacker contacts victim posing as customer care or a buyer",
            "Creates urgency and sends a COLLECT request disguised as a payment",
            "Victim enters UPI PIN thinking they are receiving money",
            "Money is instantly debited from the victim's account",
            "Attacker transfers funds onward or withdraws cash",
        ],
        "forensics": [
            "Trace UPI transaction ID through NPCI",
            "Identify beneficiary UPI ID and linked bank account KYC",
            "Request CDR of the attacker's phone number",
            "Flag repeated beneficiary IDs across complaints",
        ],
        "evidence": ["UPI transaction screenshot", "Caller number", "Chat logs", "Bank statement"],
        "laws": ["IT Act Sec 66D", "BNS 318 (Cheating)", "BNS 319", "RBI guidelines"],
    },
    "ransomware": {
        "name": "Ransomware Attack",
        "keywords": ["ransom", "encrypted", "bitcoin", "locked files", "decryption"],
        "description": "System or data encrypted by malware; ransom demanded for the key",
        "steps": [
            "Malware delivered via email attachment, malicious site, or RDP exploit",
            "Payload executes and encrypts files with strong encryption",
            "Ransom note demands cryptocurrency payment",
            "Attacker threatens to leak data if ransom is not paid",
        ],
        "forensics": [
            "Preserve the infected system image (do not format)",
            "Identify ransomware variant from note and file extension",
            "Check NoMoreRansom.org for decryption tools",
            "Trace the cryptocurrency wallet address",
        ],
        "evidence": ["Ransom note", "Encrypted file samples", "Delivery email", "Network logs", "Crypto wallet"],
        "laws": ["IT Act Sec 66", "IT Act Sec 43", "BNS 308 (Extortion)"],
    },
    "social_media_hack": {
        "name": "Social Media Account Hack",
        "keywords": ["instagram", "facebook", "account hacked", "whatsapp", "profile"],
        "description": "Account taken over for extortion, impersonation, or harassment",
        "steps": [
            "Attacker obtains credentials via phishing, password reuse, or brute force",
            "Changes password and recovery details, locking out the victim",
            "Accesses private messages, photos, and contacts",
            "Uses the account to extort, harass, or scam the victim's contacts",
        ],
        "forensics": [
            "Request login activity logs (IP, device) from the platform",
            "Identify the location of unauthorised logins",
            "Check if credentials appear in known data breaches",
            "Preserve account data via legal request to the platform",
        ],
        "evidence": ["Login activity", "Messages by attacker", "Platform support tickets"],
        "laws": ["IT Act Sec 66C", "IT Act Sec 66E (Privacy)", "BNS 351 (Intimidation)"],
    },
}


def detect_cyber_attack(text: str) -> str:
    """Detect cyber attack method from complaint text."""
    text_lower = text.lower()
    scores = {}
    for attack, info in CYBER_ATTACKS.items():
        score = sum(1 for kw in info["keywords"] if kw in text_lower)
        scores[attack] = score
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "phishing"
