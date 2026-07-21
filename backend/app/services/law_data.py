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


# Cyber attack method knowledge base — EXPANDED (10+ types + mixed detection)
CYBER_ATTACKS = {
    "phishing": {
        "name": "Phishing Attack",
        "keywords": ["phishing", "fake link", "fake website", "fake banking", "verify your details",
                     "account would be blocked", "kyc update", "clicked the link and entered",
                     "fake sms", "fake email from bank"],
        "description": "Victim received fraudulent communication impersonating a trusted service and entered credentials on a fake site",
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
        "keywords": ["sim swap", "duplicate sim", "sim card", "network stopped working",
                     "mobile network suddenly", "no signal", "sim deactivated",
                     "activated a duplicate sim", "sim went dead"],
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
        "keywords": ["upi", "google pay", "phonepe", "paytm", "collect request", "qr code",
                     "scan", "upi pin", "scan it to receive", "payment request",
                     "entered my upi pin", "money was debited"],
        "description": "Victim tricked into authorising a UPI payment via social engineering",
        "steps": [
            "Attacker contacts victim posing as a buyer, customer care, or delivery agent",
            "Sends a QR code or COLLECT request disguised as incoming payment",
            "Victim scans QR / enters UPI PIN thinking they are receiving money",
            "Money is instantly debited from the victim's account",
            "Attacker transfers funds onward or withdraws cash immediately",
        ],
        "forensics": [
            "Trace UPI transaction ID through NPCI",
            "Identify beneficiary UPI ID and linked bank account KYC",
            "Request CDR of the attacker's phone number",
            "Flag repeated beneficiary IDs across complaints",
        ],
        "evidence": ["UPI transaction screenshot", "Caller number", "QR code image", "Chat logs", "Bank statement"],
        "laws": ["IT Act Sec 66D", "BNS 318 (Cheating)", "BNS 319", "RBI guidelines"],
    },
    "ransomware": {
        "name": "Ransomware Attack",
        "keywords": ["ransom", "encrypted", "bitcoin", "locked files", "decryption",
                     "strange extension", "could not be opened", "demanding payment",
                     "files had changed", "recover my files", "ransom note"],
        "description": "System or data encrypted by malware; ransom demanded for the key",
        "steps": [
            "Malware delivered via email attachment, malicious site, or RDP exploit",
            "Payload executes and encrypts all files with strong encryption",
            "Files get a strange new extension and become unopenable",
            "Ransom note demands cryptocurrency payment within a deadline",
            "Attacker threatens to leak/delete data if ransom is not paid",
        ],
        "forensics": [
            "Preserve the infected system image (do NOT format)",
            "Identify ransomware variant from note and file extension",
            "Check NoMoreRansom.org for known decryption tools",
            "Trace the cryptocurrency wallet address on blockchain",
            "Analyze email/download that delivered the payload",
        ],
        "evidence": ["Ransom note screenshot", "Encrypted file samples", "Delivery email", "Network logs", "Crypto wallet address"],
        "laws": ["IT Act Sec 66 (Computer offense)", "IT Act Sec 43 (Damage to computer)", "BNS 308 (Extortion)"],
    },
    "remote_access_scam": {
        "name": "Remote Access Scam",
        "keywords": ["anydesk", "teamviewer", "remote access", "access code", "install app",
                     "controlled my computer", "remotely controlled", "screen sharing",
                     "shared the access code", "remote control"],
        "description": "Fraudster tricks victim into installing remote access software, then controls their device to steal money",
        "steps": [
            "Attacker poses as bank executive, tech support, or customer care",
            "Asks victim to install remote access app (AnyDesk, TeamViewer, QuickSupport)",
            "Victim shares the access code, giving attacker full control",
            "Attacker remotely accesses banking apps/net banking on victim's device",
            "Money transferred while victim watches helplessly",
        ],
        "forensics": [
            "Get AnyDesk/TeamViewer session logs from victim's device",
            "Trace the remote IP address that connected",
            "Request call records (how attacker initially contacted victim)",
            "Check bank transaction logs with device fingerprint",
        ],
        "evidence": ["Remote app session ID/logs", "Caller number", "Bank transaction receipt", "Screen recording (if any)"],
        "laws": ["IT Act Sec 66 (Unauthorized access)", "IT Act Sec 66D (Cheating by personation)", "BNS 318"],
    },
    "job_scam": {
        "name": "Fake Job / Advance Fee Scam",
        "keywords": ["job offer", "work from home", "registration fee", "training fee",
                     "high salary", "blocked my number", "pay first", "advance fee",
                     "data entry job", "telegram job"],
        "description": "Fraudster offers fake jobs requiring upfront payment, then disappears",
        "steps": [
            "Victim receives job offer via WhatsApp/Telegram/SMS (high salary, easy work)",
            "Asked to pay 'registration fee', 'training fee', or 'security deposit'",
            "After payment, either asked for more money or blocked entirely",
            "No actual job exists — the 'company' is fake",
        ],
        "forensics": [
            "Trace the phone number/WhatsApp account used",
            "Check UPI/bank account that received the fee payment",
            "Search for same account across multiple complaints",
            "Verify if the company mentioned actually exists (MCA/ROC)",
        ],
        "evidence": ["Chat screenshots", "Payment receipt", "Job offer message", "Phone number"],
        "laws": ["BNS 318 (Cheating)", "BNS 319 (Cheating by personation)", "IT Act Sec 66D"],
    },
    "malware": {
        "name": "Malware Infection",
        "keywords": ["malware", "virus", "trojan", "cracked software", "downloaded from unknown",
                     "computer became slow", "sending spam", "unauthorized access",
                     "installed a cracked", "strange behavior"],
        "description": "Victim's device infected with malicious software (virus/trojan/spyware)",
        "steps": [
            "Victim downloads software/file from untrusted source (cracked apps, torrent, fake site)",
            "Malware installs silently alongside or instead of expected software",
            "Device becomes slow, behaves strangely, or accounts get compromised",
            "Malware may steal credentials, send spam, or enable remote access",
        ],
        "forensics": [
            "Scan device with updated antivirus (Malwarebytes/KVRT)",
            "Check recently installed programs and startup items",
            "Analyze network traffic for C2 (command & control) connections",
            "Check browser extensions and saved passwords",
        ],
        "evidence": ["Malware file/installer", "Download source URL", "System logs", "Antivirus report"],
        "laws": ["IT Act Sec 43 (Damage to computer)", "IT Act Sec 66 (Computer offense)", "IT Act Sec 66B (Stolen resource)"],
    },
    "identity_theft": {
        "name": "Identity Theft / Impersonation",
        "keywords": ["fake profile", "using my name", "using my photos", "impersonating",
                     "created a fake", "pretending to be me", "my identity", "fake account"],
        "description": "Someone uses victim's identity (photos/name/documents) for fraud or harassment",
        "steps": [
            "Attacker creates fake profile using victim's name, photos, documents",
            "Uses the fake identity to scam friends/contacts, apply for loans, or harass",
            "Victim discovers when contacted by confused friends or receives legal notices",
        ],
        "forensics": [
            "Document the fake profile (screenshots, URL, followers)",
            "Report to platform for takedown + request IP logs",
            "Check if identity was used for loans/accounts (CIBIL check)",
            "Trace any financial transactions made using the fake identity",
        ],
        "evidence": ["Fake profile screenshots", "Original profile for comparison", "Victim's ID proof", "Messages sent by impersonator"],
        "laws": ["IT Act Sec 66C (Identity theft)", "IT Act Sec 66D (Personation)", "BNS 356 (Defamation)"],
    },
    "tech_support_scam": {
        "name": "Tech Support Scam",
        "keywords": ["tech support", "microsoft support", "virus warning", "pop-up",
                     "computer infected", "pay to remove", "called the number on screen",
                     "support number"],
        "description": "Fake virus warning pop-up leads victim to call scam 'tech support' and pay for fake services",
        "steps": [
            "Victim sees pop-up: 'Your computer is infected! Call this number immediately'",
            "Victim calls the number, reaches a fake tech support agent",
            "Agent asks for payment to 'remove virus' or fix the issue",
            "May also install remote access software to steal more data",
        ],
        "forensics": [
            "Identify the pop-up source (malicious ad network or infected site)",
            "Trace the phone number displayed in the pop-up",
            "Check if payment was made via card/UPI (trace beneficiary)",
            "Scan device for actual malware or remote access tools",
        ],
        "evidence": ["Screenshot of pop-up", "Phone number called", "Payment receipt", "Remote app logs"],
        "laws": ["IT Act Sec 66D (Cheating by personation)", "BNS 318 (Cheating)", "IT Act Sec 66"],
    },
    "credit_card_fraud": {
        "name": "Credit/Debit Card Fraud",
        "keywords": ["credit card", "debit card", "card fraud", "unauthorized purchase",
                     "otp for purchase", "did not initiate", "international website",
                     "card charged", "card details stolen"],
        "description": "Unauthorized transactions on victim's credit/debit card",
        "steps": [
            "Card details stolen via skimming, data breach, or phishing",
            "Fraudster uses card for online purchases (often international sites)",
            "Victim receives OTPs or alerts for transactions they didn't make",
            "Money debited before victim can block the card",
        ],
        "forensics": [
            "Request transaction details from bank (merchant name, IP, device)",
            "Check if card was used at any skimming-prone location recently",
            "Cross-reference with known breached databases",
            "Trace the delivery address of purchased goods",
        ],
        "evidence": ["Bank/card statement", "OTP messages received", "Recent locations where card was swiped"],
        "laws": ["IT Act Sec 66C (Identity theft)", "IT Act Sec 43", "BNS 318 (Cheating)", "RBI card fraud rules"],
    },
    "social_media_hack": {
        "name": "Social Media Account Hack",
        "keywords": ["instagram hacked", "facebook hacked", "account hacked", "whatsapp hacked",
                     "profile taken over", "password changed", "locked out of my account",
                     "someone logged into"],
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
        "evidence": ["Login activity screenshots", "Messages sent by attacker", "Platform support tickets"],
        "laws": ["IT Act Sec 66C", "IT Act Sec 66E (Privacy)", "BNS 351 (Intimidation)"],
    },
}


def detect_cyber_attack(text: str) -> str:
    """Detect PRIMARY cyber attack method from complaint text."""
    text_lower = text.lower()
    scores = {}
    for attack, info in CYBER_ATTACKS.items():
        score = 0
        for kw in info["keywords"]:
            if kw in text_lower:
                # Multi-word keywords get higher weight (more specific)
                weight = len(kw.split())
                score += weight
        scores[attack] = score

    # Get the best match
    best = max(scores, key=scores.get)
    # If no keywords matched at all, return "unknown" instead of defaulting to phishing
    if scores[best] == 0:
        return "unknown"
    return best


def detect_cyber_attacks_multi(text: str) -> dict:
    """
    Detect ALL matching attack methods (supports mixed attacks).
    Returns primary + secondary attacks with confidence.
    """
    text_lower = text.lower()
    scores = {}
    for attack, info in CYBER_ATTACKS.items():
        score = 0
        matched_keywords = []
        for kw in info["keywords"]:
            if kw in text_lower:
                weight = len(kw.split())
                score += weight
                matched_keywords.append(kw)
        if score > 0:
            scores[attack] = {"score": score, "matched": matched_keywords}

    if not scores:
        return {"primary": "unknown", "secondary": None, "all_matches": [], "confidence": "low"}

    # Sort by score descending
    sorted_attacks = sorted(scores.items(), key=lambda x: -x[1]["score"])

    primary = sorted_attacks[0]
    secondary = sorted_attacks[1] if len(sorted_attacks) > 1 else None

    # Confidence based on gap between primary and next
    primary_score = primary[1]["score"]
    secondary_score = secondary[1]["score"] if secondary else 0
    confidence = "high" if primary_score >= 3 and primary_score > secondary_score * 2 else \
                 "medium" if primary_score >= 2 else "low"

    return {
        "primary": primary[0],
        "primary_score": primary_score,
        "primary_keywords": primary[1]["matched"],
        "secondary": secondary[0] if secondary else None,
        "secondary_score": secondary_score if secondary else 0,
        "secondary_keywords": secondary[1]["matched"] if secondary else [],
        "all_matches": [{"attack": a, "score": d["score"], "keywords": d["matched"]} for a, d in sorted_attacks],
        "confidence": confidence,
        "is_mixed_attack": len(sorted_attacks) >= 2 and secondary_score >= 2,
    }
