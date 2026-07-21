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

# 3. Does the key actually work with Gemini?
if key:
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content("Reply with exactly: OK")
        print(f"[3] Gemini API test call: SUCCESS  (model replied: '{(resp.text or '').strip()[:20]}')")
        print("\n>>> RESULT: Gemini AI is WORKING. Restart the backend and it will answer anything.")
    except Exception as e:
        print(f"[3] Gemini API test call: FAILED  <-- {e}")
        print("    Likely causes: invalid/expired key, no internet, or region/billing issue.")
        print("    FIX: Generate a fresh key at https://aistudio.google.com/app/apikey")
else:
    print("[3] Skipped (no key).")

# 4. Is the LLM service reporting ready?
try:
    from app.services.llm import is_llm_available
    print(f"[4] PRAHARI llm.is_llm_available(): {is_llm_available()}")
except Exception as e:
    print(f"[4] llm service error: {e}")

print("=" * 60)
