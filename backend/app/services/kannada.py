"""Lightweight Kannada translation layer for AI responses."""

# Term-level translation dictionary (English -> Kannada)
KANNADA_TERMS = {
    "Found": "ಕಂಡುಬಂದಿದೆ",
    "FIRs": "ಎಫ್‌ಐಆರ್‌ಗಳು",
    "cases": "ಪ್ರಕರಣಗಳು",
    "matching your query": "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಹೊಂದಿಕೆ",
    "Crime Type Breakdown": "ಅಪರಾಧ ಪ್ರಕಾರ ವಿಭಜನೆ",
    "Locations": "ಸ್ಥಳಗಳು",
    "Date Range": "ದಿನಾಂಕ ವ್ಯಾಪ್ತಿ",
    "accused persons": "ಆರೋಪಿಗಳು",
    "Risk": "ಅಪಾಯ",
    "REPEAT OFFENDER": "ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿ",
    "Overall Risk Score": "ಒಟ್ಟಾರೆ ಅಪಾಯ ಅಂಕ",
    "Criminal Network": "ಅಪರಾಧ ಜಾಲ",
    "Crime Hotspots": "ಅಪರಾಧ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
    "Total incidents": "ಒಟ್ಟು ಘಟನೆಗಳು",
    "Crime Statistics": "ಅಪರಾಧ ಅಂಕಿಅಂಶಗಳು",
    "Total": "ಒಟ್ಟು",
    "chain snatching": "ಸರ ಕಳ್ಳತನ",
    "theft": "ಕಳ್ಳತನ",
    "robbery": "ದರೋಡೆ",
    "murder": "ಕೊಲೆ",
    "assault": "ಹಲ್ಲೆ",
    "fraud": "ವಂಚನೆ",
    "burglary": "ಮನೆ ಕಳ್ಳತನ",
    "high": "ಹೆಚ್ಚು",
    "medium": "ಮಧ್ಯಮ",
    "low": "ಕಡಿಮೆ",
}

# Common phrase translations
KANNADA_PHRASES = {
    "No FIRs found matching your query. Try broadening your search criteria.":
        "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ಎಫ್‌ಐಆರ್ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಹುಡುಕಾಟವನ್ನು ವಿಸ್ತರಿಸಿ.",
    "Please specify an accused person's name to view their network.":
        "ಜಾಲವನ್ನು ನೋಡಲು ಆರೋಪಿಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
}


def translate_to_kannada(text: str) -> str:
    """Translate key terms in an English response to Kannada (hybrid bilingual)."""
    if text in KANNADA_PHRASES:
        return KANNADA_PHRASES[text]
    result = text
    for en, kn in KANNADA_TERMS.items():
        result = result.replace(en, kn)
    return result
