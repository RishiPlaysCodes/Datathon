"""Internationalization (i18n) service for PRAHARI.

Supports three languages: English (en), Hindi (hi), Kannada (kn).
All translations are deterministic (no LLM) — curated by native speakers.
"""
from __future__ import annotations
from typing import Dict, Optional

SUPPORTED_LANGUAGES = ("en", "hi", "kn")
DEFAULT_LANGUAGE = "en"


def get_lang(lang: Optional[str]) -> str:
    """Normalize and validate language code."""
    if not lang:
        return DEFAULT_LANGUAGE
    lang = lang.strip().lower()[:2]
    return lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE



# ═══════════════════════════════════════════════════════════════════════════════
# CORE UI STRINGS
# ═══════════════════════════════════════════════════════════════════════════════

UI: Dict[str, Dict[str, str]] = {
    "app_name": {
        "en": "PRAHARI - Crime Intelligence OS",
        "hi": "प्रहरी - अपराध आसूचना प्रणाली",
        "kn": "ಪ್ರಹರಿ - ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ವ್ಯವಸ್ಥೆ",
    },
    "greeting": {
        "en": (
            "Hello! I'm **PRAHARI** — your Crime Intelligence Assistant. "
            "You can talk to me in **English, Hindi or Kannada**. "
            "Type 'help' to see everything I can do."
        ),
        "hi": (
            "नमस्ते! मैं **प्रहरी** हूँ — आपका अपराध आसूचना सहायक। "
            "आप मुझसे **हिंदी, अंग्रेजी या कन्नड़** में बात कर सकते हैं। "
            "'help' टाइप करें सभी सुविधाएँ देखने के लिए।"
        ),
        "kn": (
            "ನಮಸ್ಕಾರ! ನಾನು **ಪ್ರಹರಿ** — ನಿಮ್ಮ ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ. "
            "ನೀವು ನನ್ನೊಂದಿಗೆ **ಕನ್ನಡ, ಹಿಂದಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್** ನಲ್ಲಿ ಮಾತನಾಡಬಹುದು. "
            "'help' ಟೈಪ್ ಮಾಡಿ ಎಲ್ಲಾ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ನೋಡಲು."
        ),
    },
    "no_firs_found": {
        "en": "No FIRs found matching your query. Try broadening your search criteria.",
        "hi": "आपकी खोज से मेल खाने वाली कोई FIR नहीं मिली। खोज मापदंड बढ़ाकर देखें।",
        "kn": "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ FIR ಕಂಡುಬಂದಿಲ್ಲ. ಹುಡುಕಾಟ ಮಾನದಂಡ ವಿಸ್ತರಿಸಿ.",
    },
    "no_accused_found": {
        "en": "No accused persons found matching your query.",
        "hi": "आपकी खोज से मेल खाने वाला कोई आरोपी नहीं मिला।",
        "kn": "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಆರೋಪಿ ಕಂಡುಬಂದಿಲ್ಲ.",
    },

    "firs_found": {
        "en": "Found **{count} FIRs** matching your query.",
        "hi": "आपकी खोज से **{count} FIR** मिलीं।",
        "kn": "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ **{count} FIR** ಕಂಡುಬಂದಿವೆ.",
    },
    "accused_found": {
        "en": "Found **{count} accused persons**:",
        "hi": "**{count} आरोपी** मिले:",
        "kn": "**{count} ಆರೋಪಿಗಳು** ಕಂಡುಬಂದಿದ್ದಾರೆ:",
    },
    "crime_type_breakdown": {
        "en": "**Crime Type Breakdown:**",
        "hi": "**अपराध प्रकार वर्गीकरण:**",
        "kn": "**ಅಪರಾಧ ಪ್ರಕಾರ ವಿಂಗಡಣೆ:**",
    },
    "date_range": {
        "en": "**Date Range:** {start} to {end}",
        "hi": "**तारीख सीमा:** {start} से {end}",
        "kn": "**ದಿನಾಂಕ ಶ್ರೇಣಿ:** {start} ರಿಂದ {end}",
    },
    "locations": {
        "en": "**Locations:** {locs}",
        "hi": "**स्थान:** {locs}",
        "kn": "**ಸ್ಥಳಗಳು:** {locs}",
    },
    "risk_high": {"en": "HIGH", "hi": "उच्च", "kn": "ಹೆಚ್ಚು"},
    "risk_medium": {"en": "MEDIUM", "hi": "मध्यम", "kn": "ಮಧ್ಯಮ"},
    "risk_low": {"en": "LOW", "hi": "कम", "kn": "ಕಡಿಮೆ"},
    "repeat_offender": {
        "en": "REPEAT OFFENDER",
        "hi": "दोहराने वाला अपराधी",
        "kn": "ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿ",
    },
    "cases": {"en": "cases", "hi": "मामले", "kn": "ಪ್ರಕರಣಗಳು"},

    "crime_statistics": {
        "en": "**Crime Statistics (last {days} days):**",
        "hi": "**अपराध आँकड़े (पिछले {days} दिन):**",
        "kn": "**ಅಪರಾಧ ಅಂಕಿಅಂಶ (ಕಳೆದ {days} ದಿನಗಳು):**",
    },
    "total_firs": {
        "en": "**Total FIRs:** {count}",
        "hi": "**कुल FIR:** {count}",
        "kn": "**ಒಟ್ಟು FIR:** {count}",
    },
    "by_crime_type": {
        "en": "**By Crime Type:**",
        "hi": "**अपराध प्रकार अनुसार:**",
        "kn": "**ಅಪರಾಧ ಪ್ರಕಾರದ ಪ್ರಕಾರ:**",
    },
    "by_district": {
        "en": "**By District:**",
        "hi": "**जिला अनुसार:**",
        "kn": "**ಜಿಲ್ಲೆ ಪ್ರಕಾರ:**",
    },
    "hotspot_title": {
        "en": "**Crime Hotspots (last {days} days):**",
        "hi": "**अपराध हॉटस्पॉट (पिछले {days} दिन):**",
        "kn": "**ಅಪರಾಧ ಹಾಟ್‌ಸ್ಪಾಟ್ (ಕಳೆದ {days} ದಿನಗಳು):**",
    },
    "total_incidents_hotspot": {
        "en": "**Total incidents in hotspots:** {count}",
        "hi": "**हॉटस्पॉट में कुल घटनाएँ:** {count}",
        "kn": "**ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳಲ್ಲಿ ಒಟ್ಟು ಘಟನೆಗಳು:** {count}",
    },

    "network_title": {
        "en": "**Criminal Network for {name}:**",
        "hi": "**{name} का आपराधिक नेटवर्क:**",
        "kn": "**{name} ಅಪರಾಧ ಜಾಲ:**",
    },
    "network_nodes": {"en": "Nodes", "hi": "सदस्य", "kn": "ನೋಡ್‌ಗಳು"},
    "network_connections": {"en": "Connections", "hi": "कनेक्शन", "kn": "ಸಂಪರ್ಕಗಳು"},
    "key_players": {"en": "**Key Players:**", "hi": "**प्रमुख सदस्य:**", "kn": "**ಪ್ರಮುಖ ಸದಸ್ಯರು:**"},
    "risk_title": {
        "en": "**Risk Assessment for {name}:**",
        "hi": "**{name} का जोखिम मूल्यांकन:**",
        "kn": "**{name} ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ:**",
    },
    "risk_overall": {
        "en": "**Overall Risk Score: {score}/100**",
        "hi": "**कुल जोखिम स्कोर: {score}/100**",
        "kn": "**ಒಟ್ಟಾರೆ ಅಪಾಯ ಸ್ಕೋರ್: {score}/100**",
    },
    "risk_breakdown": {
        "en": "**Breakdown:**",
        "hi": "**विवरण:**",
        "kn": "**ವಿಂಗಡಣೆ:**",
    },
    "top_risky": {
        "en": "**Top High-Risk Offenders:**",
        "hi": "**शीर्ष उच्च-जोखिम अपराधी:**",
        "kn": "**ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ಅಪರಾಧಿಗಳು:**",
    },
    "specify_name_network": {
        "en": "Please specify an accused person's name to view their network.",
        "hi": "कृपया नेटवर्क देखने के लिए आरोपी का नाम बताएं।",
        "kn": "ದಯವಿಟ್ಟು ಜಾಲ ನೋಡಲು ಆರೋಪಿಯ ಹೆಸರು ನಮೂದಿಸಿ.",
    },
    "specify_name_risk": {
        "en": "No high-risk offenders found. Specify a name for individual assessment.",
        "hi": "कोई उच्च-जोखिम अपराधी नहीं मिला। व्यक्तिगत मूल्यांकन के लिए नाम दें।",
        "kn": "ಹೆಚ್ಚಿನ ಅಪಾಯದ ಅಪರಾಧಿ ಕಂಡುಬಂದಿಲ್ಲ. ವೈಯಕ್ತಿಕ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಹೆಸರು ನೀಡಿ.",
    },

    # Deepfake detection
    "deepfake_high_risk": {
        "en": "HIGH RISK: Byte-level forensics found strong manipulation/AI-generation markers.",
        "hi": "उच्च जोखिम: बाइट-स्तरीय फोरेंसिक में मजबूत हेरफेर/AI-निर्माण संकेत मिले।",
        "kn": "ಹೆಚ್ಚಿನ ಅಪಾಯ: ಬೈಟ್-ಮಟ್ಟದ ಫೋರೆನ್ಸಿಕ್ಸ್ ಬಲವಾದ ಕುಶಲ/AI-ಉತ್ಪಾದನೆ ಸಂಕೇತಗಳನ್ನು ಕಂಡುಹಿಡಿದಿದೆ.",
    },
    "deepfake_medium_risk": {
        "en": "INCONCLUSIVE: Some manipulation signals present but not decisive.",
        "hi": "अनिर्णीत: कुछ हेरफेर संकेत मिले लेकिन निर्णायक नहीं।",
        "kn": "ಅನಿಶ್ಚಿತ: ಕೆಲವು ಕುಶಲ ಸಂಕೇತಗಳಿವೆ ಆದರೆ ನಿರ್ಣಾಯಕವಲ್ಲ.",
    },
    "deepfake_low_risk": {
        "en": "LOW RISK: No significant manipulation or AI-generation markers found.",
        "hi": "कम जोखिम: कोई महत्वपूर्ण हेरफेर या AI-निर्माण संकेत नहीं मिले।",
        "kn": "ಕಡಿಮೆ ಅಪಾಯ: ಯಾವುದೇ ಗಮನಾರ್ಹ ಕುಶಲ ಅಥವಾ AI-ಉತ್ಪಾದನೆ ಸಂಕೇತ ಕಂಡುಬಂದಿಲ್ಲ.",
    },
    # CCTV
    "cctv_high_match": {
        "en": "HIGH CONFIDENCE: {count} suspect(s) matched with >72% confidence. Cross-reference with investigating officer.",
        "hi": "उच्च विश्वास: {count} संदिग्ध 72%+ विश्वास से मेले। जाँच अधिकारी से सत्यापित करें।",
        "kn": "ಹೆಚ್ಚಿನ ವಿಶ್ವಾಸ: {count} ಶಂಕಿತರು >72% ವಿಶ್ವಾಸದಿಂದ ಹೊಂದಿಕೆಯಾಗಿದ್ದಾರೆ. ತನಿಖಾ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.",
    },
    "cctv_medium_match": {
        "en": "POTENTIAL MATCHES: {count} suspect(s) in medium confidence range. Manual verification recommended.",
        "hi": "संभावित मिलान: {count} संदिग्ध मध्यम विश्वास श्रेणी में। मैन्युअल सत्यापन आवश्यक।",
        "kn": "ಸಂಭಾವ್ಯ ಹೊಂದಾಣಿಕೆ: {count} ಶಂಕಿತರು ಮಧ್ಯಮ ವಿಶ್ವಾಸ ಶ್ರೇಣಿಯಲ್ಲಿ. ಕೈಯಿಂದ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.",
    },
    "cctv_no_match": {
        "en": "No matches above threshold. Suspect may not be in the database.",
        "hi": "थ्रेशोल्ड से ऊपर कोई मिलान नहीं। संदिग्ध डेटाबेस में नहीं हो सकता।",
        "kn": "ಮಿತಿ ಮೀರಿದ ಹೊಂದಾಣಿಕೆ ಇಲ್ಲ. ಶಂಕಿತ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇಲ್ಲದಿರಬಹುದು.",
    },

    # Forecast
    "forecast_title": {
        "en": "Crime Forecast — Historical Pattern Analysis",
        "hi": "अपराध पूर्वानुमान — ऐतिहासिक पैटर्न विश्लेषण",
        "kn": "ಅಪರಾಧ ಮುನ್ಸೂಚನೆ — ಐತಿಹಾಸಿಕ ಮಾದರಿ ವಿಶ್ಲೇಷಣೆ",
    },
    "trend_increasing": {"en": "increasing", "hi": "बढ़ रहा", "kn": "ಹೆಚ್ಚುತ್ತಿದೆ"},
    "trend_decreasing": {"en": "decreasing", "hi": "घट रहा", "kn": "ಕಡಿಮೆಯಾಗುತ್ತಿದೆ"},
    "trend_stable": {"en": "stable", "hi": "स्थिर", "kn": "ಸ್ಥಿರ"},
    "preventive_measures_title": {
        "en": "**Preventive Measures:**",
        "hi": "**निवारक उपाय:**",
        "kn": "**ತಡೆಗಟ್ಟುವ ಕ್ರಮಗಳು:**",
    },
    "patrol_recommendation": {
        "en": "**Patrol Recommendation:**",
        "hi": "**गश्त सिफारिश:**",
        "kn": "**ಗಸ್ತು ಶಿಫಾರಸು:**",
    },
    # Language switcher
    "language_changed": {
        "en": "Language changed to English.",
        "hi": "भाषा हिंदी में बदली गई।",
        "kn": "ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಗಿದೆ.",
    },
    "language_label": {
        "en": "Language",
        "hi": "भाषा",
        "kn": "ಭಾಷೆ",
    },
}



# ═══════════════════════════════════════════════════════════════════════════════
# HELP MENU (full multilingual capability guide)
# ═══════════════════════════════════════════════════════════════════════════════

HELP_TEMPLATE: Dict[str, str] = {
    "en": (
        "I'm **PRAHARI**, your Crime Intelligence Assistant. I understand "
        "**English, Hindi and Kannada**. Here's what I can do right now over "
        "**{firs} FIRs**, **{accused} accused** ({repeat} repeat offenders):\n\n"
        "**1. Search FIRs** — _\"Show chain snatching in Koramangala\"_\n"
        "**2. Accused Info** — _\"Tell me about Ravi Kumar\"_\n"
        "**3. Criminal Network** — _\"Show network for Ravi Kumar\"_\n"
        "**4. Crime Hotspots** — _\"Crime hotspots in Bangalore\"_\n"
        "**5. Risk Assessment** — _\"Risk score for the top offender\"_\n"
        "**6. Statistics & Trends** — _\"Crime statistics this month\"_\n\n"
        "Follow-ups work too — say _\"only female victims\"_ or _\"sirf open cases\"_.\n"
        "Just type your question naturally."
    ),
    "hi": (
        "मैं **प्रहरी** हूँ, आपका अपराध आसूचना सहायक। मैं "
        "**हिंदी, अंग्रेजी और कन्नड़** समझता हूँ। अभी मेरे पास "
        "**{firs} FIR**, **{accused} आरोपी** ({repeat} दोहराने वाले) का डेटा है:\n\n"
        "**1. FIR खोजें** — _\"कोरमंगला में चेन स्नैचिंग दिखाओ\"_\n"
        "**2. आरोपी जानकारी** — _\"रवि कुमार के बारे में बताओ\"_\n"
        "**3. आपराधिक नेटवर्क** — _\"रवि कुमार का नेटवर्क दिखाओ\"_\n"
        "**4. अपराध हॉटस्पॉट** — _\"बैंगलोर में हॉटस्पॉट\"_\n"
        "**5. जोखिम मूल्यांकन** — _\"टॉप अपराधी का रिस्क स्कोर\"_\n"
        "**6. आँकड़े और रुझान** — _\"इस महीने के अपराध आँकड़े\"_\n\n"
        "फॉलो-अप भी काम करता है — _\"सिर्फ महिला पीड़ित\"_ या _\"only open cases\"_\n"
        "बस अपना सवाल टाइप करें।"
    ),
    "kn": (
        "ನಾನು **ಪ್ರಹರಿ**, ನಿಮ್ಮ ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ. ನಾನು "
        "**ಕನ್ನಡ, ಹಿಂದಿ ಮತ್ತು ಇಂಗ್ಲಿಷ್** ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತೇನೆ. ಈಗ ನನ್ನ ಬಳಿ "
        "**{firs} FIR**, **{accused} ಆರೋಪಿ** ({repeat} ಪುನರಾವರ್ತಿತ) ಡೇಟಾ ಇದೆ:\n\n"
        "**1. FIR ಹುಡುಕಿ** — _\"ಕೋರಮಂಗಲದಲ್ಲಿ ಚೈನ್ ಸ್ನಾಚಿಂಗ್ ತೋರಿಸು\"_\n"
        "**2. ಆರೋಪಿ ಮಾಹಿತಿ** — _\"ರವಿ ಕುಮಾರ್ ಬಗ್ಗೆ ಹೇಳು\"_\n"
        "**3. ಅಪರಾಧ ಜಾಲ** — _\"ರವಿ ಕುಮಾರ್ ನೆಟ್‌ವರ್ಕ್ ತೋರಿಸು\"_\n"
        "**4. ಅಪರಾಧ ಹಾಟ್‌ಸ್ಪಾಟ್** — _\"ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹಾಟ್‌ಸ್ಪಾಟ್\"_\n"
        "**5. ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ** — _\"ಟಾಪ್ ಅಪರಾಧಿಯ ರಿಸ್ಕ್ ಸ್ಕೋರ್\"_\n"
        "**6. ಅಂಕಿಅಂಶ ಮತ್ತು ಪ್ರವೃತ್ತಿ** — _\"ಈ ತಿಂಗಳ ಅಪರಾಧ ಅಂಕಿಅಂಶ\"_\n\n"
        "ಮುಂದಿನ ಪ್ರಶ್ನೆಗಳು ಕೂಡ ಕೆಲಸ ಮಾಡುತ್ತವೆ — _\"ಮಹಿಳಾ ಬಲಿಪಶುಗಳು ಮಾತ್ರ\"_\n"
        "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಸಹಜವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# SUGGESTIONS (chat follow-up suggestions)
# ═══════════════════════════════════════════════════════════════════════════════

SUGGESTIONS: Dict[str, Dict[str, list]] = {
    "search_firs": {
        "en": ["Show me the accused in these cases", "Display on hotspot map", "Filter by repeat offenders only"],
        "hi": ["इन मामलों में आरोपी दिखाओ", "हॉटस्पॉट मैप पर दिखाओ", "सिर्फ दोहराने वाले अपराधी"],
        "kn": ["ಈ ಪ್ರಕರಣಗಳ ಆರೋಪಿ ತೋರಿಸು", "ಹಾಟ್‌ಸ್ಪಾಟ್ ಮ್ಯಾಪ್‌ನಲ್ಲಿ ತೋರಿಸು", "ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಗಳು ಮಾತ್ರ"],
    },
    "accused_info": {
        "en": ["Show criminal network", "Calculate risk score", "Find similar offenders"],
        "hi": ["आपराधिक नेटवर्क दिखाओ", "जोखिम स्कोर बताओ", "समान अपराधी खोजो"],
        "kn": ["ಅಪರಾಧ ಜಾಲ ತೋರಿಸು", "ಅಪಾಯ ಸ್ಕೋರ್ ಲೆಕ್ಕ ಮಾಡು", "ಹೋಲುವ ಅಪರಾಧಿಗಳನ್ನು ಹುಡುಕು"],
    },
    "general": {
        "en": ["Show recent theft cases", "List repeat offenders", "Crime statistics this month", "Crime hotspots in Bangalore"],
        "hi": ["हाल की चोरी दिखाओ", "दोहराने वाले अपराधी बताओ", "इस महीने के आँकड़े", "बैंगलोर में हॉटस्पॉट"],
        "kn": ["ಇತ್ತೀಚಿನ ಕಳ್ಳತನ ತೋರಿಸು", "ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿ ಪಟ್ಟಿ", "ಈ ತಿಂಗಳ ಅಂಕಿಅಂಶ", "ಬೆಂಗಳೂರಿನ ಹಾಟ್‌ಸ್ಪಾಟ್"],
    },
    "greeting": {
        "en": ["What can you do?", "Show recent FIRs", "Crime statistics this month"],
        "hi": ["तुम क्या कर सकते हो?", "हाल की FIR दिखाओ", "इस महीने के आँकड़े"],
        "kn": ["ನೀವು ಏನು ಮಾಡಬಹುದು?", "ಇತ್ತೀಚಿನ FIR ತೋರಿಸು", "ಈ ತಿಂಗಳ ಅಂಕಿಅಂಶ"],
    },
}



# ═══════════════════════════════════════════════════════════════════════════════
# TRANSLATION HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def t(key: str, lang: str = "en", **kwargs) -> str:
    """Get translated string by key, with format substitutions.

    Usage: t("firs_found", "hi", count=42) → "आपकी खोज से **42 FIR** मिलीं।"
    Falls back to English if key or language not found.
    """
    lang = get_lang(lang)
    entry = UI.get(key)
    if not entry:
        return key
    text = entry.get(lang, entry.get("en", key))
    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, IndexError):
            pass
    return text


def get_suggestions(intent: str, lang: str = "en") -> list:
    """Get follow-up suggestions for an intent in the user's language."""
    lang = get_lang(lang)
    intent_suggestions = SUGGESTIONS.get(intent, SUGGESTIONS.get("general", {}))
    return intent_suggestions.get(lang, intent_suggestions.get("en", []))


def get_help(lang: str, firs: int, accused: int, repeat: int) -> str:
    """Get the help/capability guide in the user's language."""
    lang = get_lang(lang)
    template = HELP_TEMPLATE.get(lang, HELP_TEMPLATE["en"])
    return template.format(firs=firs, accused=accused, repeat=repeat)


def get_risk_label(score: float, lang: str = "en") -> str:
    """Human-readable risk label."""
    if score >= 70:
        return t("risk_high", lang)
    elif score >= 40:
        return t("risk_medium", lang)
    return t("risk_low", lang)
