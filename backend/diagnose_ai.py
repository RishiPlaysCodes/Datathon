"""
PRAHARI AI Diagnostic - run this to find out why the Gemini AI isn't working.
Usage (from the backend folder):   python diagnose_ai.py
"""
import sys, os
sys.path.insert(0, ".")

print("=" * 60)
print("  PRAHARI AI DIAGNOSTIC")
print("=" * 60)

# 1. Is the .env being found and key loaded?
try:
    from app.core.config import settings
    key = settings.GEMINI_API_KEY or ""
    if key:
        print(f"[1] GEMINI_API_KEY loaded: YES  (length={len(key)}, starts with '{key[:6]}...')")
    else:
        print("[1] GEMINI_API_KEY loaded: NO  <-- .env not found or key blank")
        print("    FIX: Ensure backend/.env has a line:  GEMINI_API_KEY=AIza....")
except Exception as e:
    print(f"[1] Could not load config: {e}")
    sys.exit(1)

# 2. Is the google-generativeai package installed?
try:
    import google.generativeai as genai
    print("[2] google-generativeai package installed: YES")
except ImportError:
    print("[2] google-generativeai package installed: NO  <-- THIS IS THE PROBLEM")
    print("    FIX: pip install google-generativeai   then restart backend")
    sys.exit(1)

# 3. Which models are available for this key, and does a call work?
if key:
    try:
        genai.configure(api_key=key)
        # List available models
        avail = []
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                avail.append(m.name.replace("models/", ""))
        print(f"[3] Available models for your key: {', '.join(avail[:8]) if avail else 'NONE'}")

        # Use the app's own model picker
        from app.services.llm import _pick_available_model, _MODEL_NAME
        chosen = _MODEL_NAME or _pick_available_model(genai)
        model = genai.GenerativeModel(chosen)
        resp = model.generate_content("Reply with exactly: OK")
        print(f"[4] Test call with '{chosen}': SUCCESS  (replied: '{(resp.text or '').strip()[:20]}')")
        print("\n>>> RESULT: Gemini AI is WORKING. Restart the backend - it will now answer anything.")
    except Exception as e:
        print(f"[4] Test call: FAILED  <-- {e}")
        print("    FIX: If it says model not found, the model list above shows valid options.")
        print("    If it says API key invalid, generate a fresh key at https://aistudio.google.com/app/apikey")
else:
    print("[3] Skipped (no key).")

# 4. Is the LLM service reporting ready?
try:
    from app.services.llm import is_llm_available
    print(f"[4] PRAHARI llm.is_llm_available(): {is_llm_available()}")
except Exception as e:
    print(f"[4] llm service error: {e}")

print("=" * 60)
