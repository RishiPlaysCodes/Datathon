"""Intent classification and filter extraction for natural language queries."""
import re
from typing import Dict, Any


# Intent patterns - maps keywords to intents
INTENT_PATTERNS = {
    "search_firs": [
        r"show.*fir", r"find.*case", r"search.*crime", r"list.*fir",
        r"chain.?snatching", r"theft", r"robbery", r"murder", r"assault",
        r"burglary", r"fraud", r"cyber", r"domestic",
        r"cases?\s+(in|near|around|at)", r"fir.*(in|near|from)",
        r"crime.*(in|near|at)", r"show.*cases?",
    ],
    "accused_info": [
        r"accused", r"offender", r"criminal", r"suspect",
        r"who\s+is", r"tell\s+me\s+about", r"profile\s+of",
        r"information\s+(on|about)", r"details\s+(of|about)",
    ],
    "network_analysis": [
        r"network", r"connect", r"associate", r"gang",
        r"linked\s+to", r"related\s+to", r"connection",
        r"co.?accused", r"accomplice", r"graph",
    ],
    "hotspot_analysis": [
        r"hotspot", r"heatmap", r"heat\s+map", r"map",
        r"where.*crime", r"crime.*area", r"dangerous",
        r"unsafe", r"location.*crime",
    ],
    "risk_assessment": [
        r"risk", r"danger", r"threat", r"score",
        r"how\s+dangerous", r"likelihood", r"probability",
        r"recidiv", r"repeat.*offend",
    ],
    "statistics": [
        r"statistic", r"trend", r"count", r"total",
        r"how\s+many", r"number\s+of", r"summary",
        r"overview", r"dashboard", r"compare",
    ],
}

# Location patterns for Karnataka
LOCATIONS = [
    "koramangala", "jayanagar", "indiranagar", "whitefield", "electronic city",
    "marathahalli", "btm layout", "hsr layout", "jp nagar", "banashankari",
    "rajajinagar", "malleswaram", "basavanagudi", "yelahanka", "hebbal",
    "mysore", "mysuru", "mangalore", "hubli", "dharwad", "belgaum", "belagavi",
    "shimoga", "davangere", "bellary", "gulbarga", "raichur", "bidar",
    "bangalore", "bengaluru", "tumkur", "hassan", "mandya", "kolar",
    "100 feet road", "mg road", "brigade road", "church street",
]

# Crime type patterns
CRIME_TYPES = {
    "chain snatching": ["chain.?snatch", "gold.?snatch", "necklace.?theft"],
    "theft": ["theft", "steal", "stole", "stolen", "larceny"],
    "robbery": ["robbery", "robbed", "dacoity", "loot"],
    "murder": ["murder", "homicide", "kill", "dead body"],
    "assault": ["assault", "attack", "beat", "hurt", "grievous"],
    "burglary": ["burglary", "break.?in", "house.?break"],
    "fraud": ["fraud", "cheat", "scam", "swindle", "forgery"],
    "cyber crime": ["cyber", "online.?fraud", "hacking", "phishing"],
    "domestic violence": ["domestic", "dowry", "wife.?beat", "cruelty"],
    "vehicle theft": ["vehicle.?theft", "bike.?theft", "car.?theft", "auto.?theft"],
    "drug offense": ["drug", "narcotic", "ndps", "ganja", "cocaine"],
    "sexual offense": ["rape", "molest", "sexual", "eve.?teas"],
    "kidnapping": ["kidnap", "abduct", "missing.?person"],
}


def classify_intent(query: str) -> Dict[str, Any]:
    """Classify the intent of a natural language query."""
    query_lower = query.lower().strip()

    # Score each intent
    scores = {}
    for intent, patterns in INTENT_PATTERNS.items():
        score = 0
        for pattern in patterns:
            if re.search(pattern, query_lower):
                score += 1
        scores[intent] = score

    # Get best intent
    best_intent = max(scores, key=scores.get) if max(scores.values()) > 0 else "general"
    confidence = min(scores.get(best_intent, 0) / 3.0, 1.0) if best_intent != "general" else 0.3

    # Extract filters
    filters = extract_filters(query_lower)

    return {
        "intent": best_intent,
        "confidence": confidence,
        "filters": filters,
        "all_scores": scores,
    }


def extract_filters(query: str) -> Dict[str, Any]:
    """Extract structured filters from natural language query."""
    filters = {}

    # Extract location
    for loc in LOCATIONS:
        if loc in query:
            filters["location"] = loc.title()
            break

    # Extract crime type
    for crime_type, patterns in CRIME_TYPES.items():
        for pattern in patterns:
            if re.search(pattern, query):
                filters["crime_type"] = crime_type
                break
        if "crime_type" in filters:
            break

    # Extract time period
    time_patterns = [
        (r"last\s+(\d+)\s+month", lambda m: int(m.group(1)) * 30),
        (r"last\s+(\d+)\s+week", lambda m: int(m.group(1)) * 7),
        (r"last\s+(\d+)\s+day", lambda m: int(m.group(1))),
        (r"last\s+(\d+)\s+year", lambda m: int(m.group(1)) * 365),
        (r"past\s+(\d+)\s+month", lambda m: int(m.group(1)) * 30),
        (r"this\s+month", lambda m: 30),
        (r"this\s+week", lambda m: 7),
        (r"today", lambda m: 1),
        (r"yesterday", lambda m: 2),
        (r"last\s+quarter", lambda m: 90),
        (r"6\s+months?", lambda m: 180),
        (r"3\s+months?", lambda m: 90),
    ]

    for pattern, days_func in time_patterns:
        match = re.search(pattern, query)
        if match:
            filters["days"] = days_func(match)
            break

    if "days" not in filters:
        filters["days"] = 180  # Default 6 months

    # Extract repeat offender filter
    if any(word in query for word in ["repeat", "habitual", "serial", "recidivist"]):
        filters["repeat_offenders"] = True

    # Extract name (look for proper nouns after certain keywords)
    name_patterns = [
        r"(?:about|for|of|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",  # Multiple capitalized words
    ]
    # Use original case for name extraction
    for pattern in name_patterns:
        match = re.search(pattern, query)
        if match:
            name = match.group(1)
            # Filter out common words
            if name.lower() not in ["show", "find", "tell", "give", "last", "the", "all", "me"]:
                filters["name"] = name
                break

    # Extract gender filter
    if "female" in query or "women" in query or "woman" in query:
        filters["gender"] = "female"
    elif "male" in query or "men" in query or "man" in query:
        filters["gender"] = "male"

    # Extract status
    if "open" in query or "active" in query or "pending" in query:
        filters["status"] = "open"
    elif "closed" in query or "solved" in query:
        filters["status"] = "closed"

    return filters
