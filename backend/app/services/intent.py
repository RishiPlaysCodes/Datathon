"""Intent classification and filter extraction for natural language queries."""
import re
from typing import Dict, Any


# Intent patterns - maps keywords to intents.
# Includes English + Hinglish/romanized-Hindi keywords so investigators can
# type the way they naturally speak (e.g. "chori ke case dikhao").
INTENT_PATTERNS = {
    "search_firs": [
        r"show.*fir", r"find.*case", r"search.*crime", r"list.*fir",
        r"chain.?snatching", r"theft", r"robbery", r"murder", r"assault",
        r"burglary", r"fraud", r"cyber", r"domestic",
        r"cases?\s+(in|near|around|at)", r"fir.*(in|near|from)",
        r"crime.*(in|near|at)", r"show.*cases?", r"\bfirs?\b", r"\bcases?\b",
        # Hinglish
        r"dikhao", r"dikha\s?do", r"batao.*case", r"case.*batao",
        r"chori", r"loot", r"hatya", r"katal", r"jurm", r"apradh", r"mamla",
    ],
    "accused_info": [
        r"accused", r"offender", r"criminal", r"suspect",
        r"who\s+is", r"tell\s+me\s+about", r"profile\s+of",
        r"information\s+(on|about)", r"details\s+(of|about)",
        # Hinglish
        r"aaropi", r"mulzim", r"apradhi", r"kaun\s+hai",
        r"ke\s+baare\s+me", r"ki\s+jaankari", r"badmaash", r"gunehgar",
    ],
    "network_analysis": [
        r"network", r"connect", r"associate", r"gang",
        r"linked\s+to", r"related\s+to", r"connection",
        r"co.?accused", r"accomplice", r"graph",
        # Hinglish
        r"giroh", r"saathi", r"juda", r"jude\s+hue", r"rishta",
        r"sambandh", r"connection.*dikha",
    ],
    "hotspot_analysis": [
        r"hotspot", r"heatmap", r"heat\s+map", r"map",
        r"where.*crime", r"crime.*area", r"dangerous",
        r"unsafe", r"location.*crime",
        # Hinglish
        r"kahan.*crime", r"kahan.*jurm", r"khatarnak\s+ilaka",
        r"unsafe\s+area", r"kaunsi\s+jagah", r"ilaka", r"map.*dikha",
    ],
    "risk_assessment": [
        r"risk", r"danger", r"threat", r"score",
        r"how\s+dangerous", r"likelihood", r"probability",
        r"recidiv", r"repeat.*offend",
        # Hinglish
        r"khatra", r"kitna\s+khatarnak", r"jokhim", r"khatarnaak",
        r"risk\s+score", r"kitna\s+risk",
    ],
    "statistics": [
        r"statistic", r"trend", r"count", r"total",
        r"how\s+many", r"number\s+of", r"summary",
        r"overview", r"dashboard", r"compare",
        # Hinglish
        r"kitne", r"kitna", r"aankde", r"ginti", r"total\s+kitne",
        r"summary\s+do", r"trend.*dikha", r"tulna",
    ],
    "help": [
        r"help", r"what\s+can\s+you\s+do", r"capabilit", r"features?",
        r"how\s+(do|to)\s+use", r"what\s+do\s+you\s+do", r"guide",
        r"options?", r"commands?",
        # Hinglish
        r"kya\s+kar\s+sakte", r"kaise\s+use", r"kaun\s?kaun\s?se",
        r"kaunse\s+features?", r"kya\s+features?", r"madad", r"kaise\s+kaam",
    ],
    "greeting": [
        r"^\s*(hi|hello|hey|hii+|yo)\b", r"namaste", r"namaskar",
        r"good\s+(morning|afternoon|evening)", r"kaise\s+ho", r"kya\s+haal",
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
    "chain snatching": ["chain.?snatch", "gold.?snatch", "necklace.?theft", "chain.?cheen"],
    "theft": ["theft", "steal", "stole", "stolen", "larceny", "chori"],
    "robbery": ["robbery", "robbed", "dacoity", "loot", "lut"],
    "murder": ["murder", "homicide", "kill", "dead body", "hatya", "katal", "khoon"],
    "assault": ["assault", "attack", "beat", "hurt", "grievous", "maar.?peet", "hamla"],
    "burglary": ["burglary", "break.?in", "house.?break", "sendh"],
    "fraud": ["fraud", "cheat", "scam", "swindle", "forgery", "dhokha", "thagi"],
    "cyber crime": ["cyber", "online.?fraud", "hacking", "phishing"],
    "domestic violence": ["domestic", "dowry", "wife.?beat", "cruelty", "dahej", "ghareloo"],
    "vehicle theft": ["vehicle.?theft", "bike.?theft", "car.?theft", "auto.?theft", "gaadi.?chori"],
    "drug offense": ["drug", "narcotic", "ndps", "ganja", "cocaine", "nasha"],
    "sexual offense": ["rape", "molest", "sexual", "eve.?teas", "chhed"],
    "kidnapping": ["kidnap", "abduct", "missing.?person", "apahran"],
}


# Prefer specific analytical intents when multiple patterns tie. For example,
# "Show criminal network for Ravi Kumar" contains both "criminal" and
# "network", but the network request is the user's actual intent.
INTENT_PRIORITY = [
    "greeting",
    "help",
    "network_analysis",
    "risk_assessment",
    "hotspot_analysis",
    "statistics",
    "search_firs",
    "accused_info",
]


def classify_intent(query: str) -> Dict[str, Any]:
    """Classify the intent of a natural language query."""
    original_query = query.strip()
    query_lower = original_query.lower()

    scores = {}
    for intent, patterns in INTENT_PATTERNS.items():
        scores[intent] = sum(1 for pattern in patterns if re.search(pattern, query_lower))

    highest_score = max(scores.values())
    best_intent = (
        next(intent for intent in INTENT_PRIORITY if scores[intent] == highest_score)
        if highest_score > 0
        else "general"
    )

    # More realistic confidence: a single strong keyword match already gives a
    # meaningful signal, and additional matches raise it toward certainty.
    if best_intent == "general":
        confidence = 0.3
    elif best_intent in ("greeting", "help"):
        confidence = 0.95
    else:
        confidence = min(0.55 + 0.15 * scores.get(best_intent, 0), 0.97)

    # Preserve original casing so proper names can be extracted reliably.
    filters = extract_filters(original_query)

    return {
        "intent": best_intent,
        "confidence": confidence,
        "filters": filters,
        "all_scores": scores,
    }


def extract_filters(query: str) -> Dict[str, Any]:
    """Extract structured filters while preserving original case for names."""
    filters = {}
    query_lower = query.lower()

    for loc in LOCATIONS:
        if loc in query_lower:
            filters["location"] = loc.title()
            break

    for crime_type, patterns in CRIME_TYPES.items():
        if any(re.search(pattern, query_lower) for pattern in patterns):
            filters["crime_type"] = crime_type
            break

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
        match = re.search(pattern, query_lower)
        if match:
            filters["days"] = days_func(match)
            break
    if "days" not in filters:
        filters["days"] = 180

    if any(word in query_lower for word in ["repeat", "habitual", "serial", "recidivist"]):
        filters["repeat_offenders"] = True

    name_patterns = [
        r"(?:about|for|of|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    ]
    for index, pattern in enumerate(name_patterns):
        flags = re.IGNORECASE if index == 0 else 0
        match = re.search(pattern, query, flags=flags)
        if match:
            name = match.group(1)
            if name.lower() not in ["show", "find", "tell", "give", "last", "the", "all", "me"]:
                filters["name"] = name
                break

    if any(word in query_lower for word in ["female", "women", "woman"]):
        filters["gender"] = "female"
    elif any(word in query_lower for word in ["male", "men", "man"]):
        filters["gender"] = "male"

    if any(word in query_lower for word in ["open", "active", "pending"]):
        filters["status"] = "open"
    elif any(word in query_lower for word in ["closed", "solved"]):
        filters["status"] = "closed"

    return filters
