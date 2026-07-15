"""Intent classification and filter extraction for natural language queries."""
import re
from typing import Dict, Any, List
from datetime import datetime


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

# Crime type patterns - ONLY these are valid crime types
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

# Valid crime type names for validation
VALID_CRIME_TYPES = list(CRIME_TYPES.keys())

# Month name to number mapping
MONTH_MAP = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6,
    "july": 7, "jul": 7, "august": 8, "aug": 8, "september": 9, "sep": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}


def classify_intent(query: str) -> Dict[str, Any]:
    """Classify the intent of a natural language query."""
    query_lower = query.lower().strip()

    # Score each intent
    scores = {}
    matched_patterns = 0
    total_patterns_checked = 0

    for intent, patterns in INTENT_PATTERNS.items():
        score = 0
        for pattern in patterns:
            total_patterns_checked += 1
            if re.search(pattern, query_lower):
                score += 1
                matched_patterns += 1
        scores[intent] = score

    # Get best intent
    max_score = max(scores.values()) if scores else 0
    best_intent = max(scores, key=scores.get) if max_score > 0 else "general"

    # BUG #2 FIX: Consistent confidence calculation
    # Confidence = (matched patterns for winning intent) / (total patterns for that intent)
    if best_intent != "general":
        intent_pattern_count = len(INTENT_PATTERNS[best_intent])
        confidence = min(scores[best_intent] / intent_pattern_count, 1.0)
        # Normalize to reasonable range: minimum 0.4 if any match, max 0.95
        confidence = 0.4 + (confidence * 0.55)
    else:
        confidence = 0.2

    # Extract filters
    filters = extract_filters(query_lower, query)

    return {
        "intent": best_intent,
        "confidence": round(confidence, 2),
        "filters": filters,
        "all_scores": scores,
    }


def extract_filters(query_lower: str, query_original: str = "") -> Dict[str, Any]:
    """Extract structured filters from natural language query."""
    filters = {}

    # Extract location
    for loc in LOCATIONS:
        if loc in query_lower:
            filters["location"] = loc.title()
            break

    # BUG #3 FIX: Support multiple crime types ("theft and robbery")
    # BUG #4 FIX: Only match VALID crime types, flag unknown ones
    matched_crime_types = []
    for crime_type, patterns in CRIME_TYPES.items():
        for pattern in patterns:
            if re.search(pattern, query_lower):
                matched_crime_types.append(crime_type)
                break

    if len(matched_crime_types) == 1:
        filters["crime_type"] = matched_crime_types[0]
    elif len(matched_crime_types) > 1:
        # Multiple crime types detected
        filters["crime_types"] = matched_crime_types
        filters["crime_type"] = matched_crime_types[0]  # Primary for backward compat
    else:
        # BUG #4 FIX: Check if user mentioned a crime-like word that we don't recognize
        # Look for patterns like "show X cases" where X is not in our database
        unknown_crime_match = re.search(
            r"(?:show|find|search|list)\s+(.+?)\s+(?:cases?|firs?|crimes?|incidents?)",
            query_lower
        )
        if not unknown_crime_match:
            unknown_crime_match = re.search(
                r"(.+?)\s+(?:cases?|firs?|crimes?|incidents?)",
                query_lower
            )

        if unknown_crime_match:
            potential_crime = unknown_crime_match.group(1).strip()
            # Remove common words that aren't crime types
            noise_words = [
                "all", "the", "recent", "latest", "new", "old", "open", "closed",
                "active", "pending", "last", "past", "this", "my", "me", "some",
                "any", "few", "many", "more", "those", "these",
            ]
            # Clean up
            potential_crime_clean = " ".join(
                w for w in potential_crime.split()
                if w not in noise_words and not w.isdigit()
            )

            if potential_crime_clean and len(potential_crime_clean) > 2:
                # Check if it's NOT a valid crime type
                is_valid = False
                for ct, patterns in CRIME_TYPES.items():
                    if potential_crime_clean in ct:
                        is_valid = True
                        break
                    for p in patterns:
                        if re.search(p, potential_crime_clean):
                            is_valid = True
                            break
                    if is_valid:
                        break

                if not is_valid:
                    filters["unknown_crime_type"] = potential_crime_clean

    # BUG #1 FIX: Support absolute dates ("after July 2026", "before March 2025", "in 2025")
    # Check for absolute date patterns FIRST
    absolute_date = _extract_absolute_date(query_lower)
    if absolute_date:
        filters.update(absolute_date)
    else:
        # Relative time patterns (fallback)
        time_patterns = [
            (r"last\s+(\d+)\s+months?", lambda m: int(m.group(1)) * 30),
            (r"last\s+(\d+)\s+weeks?", lambda m: int(m.group(1)) * 7),
            (r"last\s+(\d+)\s+days?", lambda m: int(m.group(1))),
            (r"last\s+(\d+)\s+years?", lambda m: int(m.group(1)) * 365),
            (r"past\s+(\d+)\s+months?", lambda m: int(m.group(1)) * 30),
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
            filters["days"] = 180  # Default 6 months

    # Extract repeat offender filter
    if any(word in query_lower for word in ["repeat", "habitual", "serial", "recidivist"]):
        filters["repeat_offenders"] = True

    # Extract name (look for proper nouns after certain keywords)
    name_patterns = [
        r"(?:about|for|of|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",  # Multiple capitalized words
    ]
    # Use original case for name extraction
    for pattern in name_patterns:
        match = re.search(pattern, query_original or query_lower)
        if match:
            name = match.group(1)
            # Filter out common words
            if name.lower() not in ["show", "find", "tell", "give", "last", "the", "all", "me",
                                     "january", "february", "march", "april", "may", "june",
                                     "july", "august", "september", "october", "november", "december"]:
                filters["name"] = name
                break

    # Extract gender filter
    if "female" in query_lower or "women" in query_lower or "woman" in query_lower:
        filters["gender"] = "female"
    elif "male" in query_lower or "men" in query_lower or "man" in query_lower:
        filters["gender"] = "male"

    # Extract status
    if "open" in query_lower or "active" in query_lower or "pending" in query_lower:
        filters["status"] = "open"
    elif "closed" in query_lower or "solved" in query_lower:
        filters["status"] = "closed"

    return filters


def _extract_absolute_date(query: str) -> Dict[str, Any]:
    """
    BUG #1 FIX: Extract absolute date references.
    Supports: "after July 2026", "before March 2025", "in 2025",
              "since January 2026", "from April 2026"
    """
    result = {}

    # Pattern: "after/since/from [month] [year]"
    after_match = re.search(
        r"(?:after|since|from)\s+(\w+)\s+(\d{4})",
        query
    )
    if after_match:
        month_str = after_match.group(1).lower()
        year = int(after_match.group(2))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                result["date_from"] = datetime(year, month, 1).isoformat()
                result["has_absolute_date"] = True
            except ValueError:
                pass
        return result if result else None

    # Pattern: "before/until/upto [month] [year]"
    before_match = re.search(
        r"(?:before|until|upto|up\s+to)\s+(\w+)\s+(\d{4})",
        query
    )
    if before_match:
        month_str = before_match.group(1).lower()
        year = int(before_match.group(2))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                result["date_to"] = datetime(year, month, 1).isoformat()
                result["has_absolute_date"] = True
            except ValueError:
                pass
        return result if result else None

    # Pattern: "in [month] [year]"
    in_match = re.search(
        r"(?:in|during)\s+(\w+)\s+(\d{4})",
        query
    )
    if in_match:
        month_str = in_match.group(1).lower()
        year = int(in_match.group(2))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                result["date_from"] = datetime(year, month, 1).isoformat()
                # End of month
                if month == 12:
                    result["date_to"] = datetime(year + 1, 1, 1).isoformat()
                else:
                    result["date_to"] = datetime(year, month + 1, 1).isoformat()
                result["has_absolute_date"] = True
            except ValueError:
                pass
        return result if result else None

    # Pattern: "in [year]" (whole year)
    year_match = re.search(r"(?:in|during|of)\s+(\d{4})", query)
    if year_match:
        year = int(year_match.group(1))
        if 2020 <= year <= 2030:
            result["date_from"] = datetime(year, 1, 1).isoformat()
            result["date_to"] = datetime(year, 12, 31).isoformat()
            result["has_absolute_date"] = True
            return result

    return None
