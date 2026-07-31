# PRAHARI — Complete Technical Documentation

**Author:** Rishi Gurdatta  
**Version:** 1.0.0 | **Last Updated:** July 2026  
**Local Path:** `C:\Users\gurud\Desktop\PRAHARI`  
**GitHub:** https://github.com/RishiPlaysCodes/Datathon

> Predictive Relational AI for Holistic Analytics & Response Intelligence
> A Crime Intelligence OS for Karnataka State Police

---

## Live URLs

| Component | URL |
|-----------|-----|
| Production Backend | https://prahari-final-50044229424.catalystappsail.in |
| Production Frontend | https://prahari-60079422859.catalystserverless.in/app/index.html |
| Dev Backend | https://prahari-final-50044229424.development.catalystappsail.in |
| Dev Frontend | https://prahari-60079422859.development.catalystserverless.in/app/index.html |
| GitHub Repository | https://github.com/RishiPlaysCodes/Datathon |

**Demo Logins:** admin/admin123, inspector/inspector123, demo/demo123, citizen1/citizen123

---

## How to Run Locally (VS Code)

**Your project is at:** `C:\Users\gurud\Desktop\PRAHARI`

### Prerequisites
- Python 3.11+ | Node.js 18+ | VS Code

### Backend (Terminal 1):
```bash
cd C:\Users\gurud\Desktop\PRAHARI\backend
pip install -r requirements.txt
python server.py
```
→ Runs at http://localhost:8001 | API docs: http://localhost:8001/docs

### Frontend (Terminal 2):
```bash
cd C:\Users\gurud\Desktop\PRAHARI\frontend
npm install
npm run dev
```
→ Runs at http://localhost:5173 | Login: demo / demo123

### Optional: Set Gemini key (backend/.env):
```
GEMINI_API_KEY=your_key_here
```

---

## Tech Stack


### Backend (Python 3.11)
| Library | Purpose |
|---------|---------|
| FastAPI 0.115 | Async REST framework |
| SQLAlchemy 2.0 | Async ORM (SQLite + WAL) |
| Pydantic 2.9 | Data validation |
| python-jose 3.3 | JWT tokens |
| passlib+bcrypt | Password hashing |
| httpx 0.27 | Async HTTP (Gemini calls) |
| NetworkX 3.3 | Criminal network graphs |
| RapidFuzz 3.9 | Fuzzy name matching |

### Frontend (TypeScript + React 18)
| Library | Purpose |
|---------|---------|
| Vite 5.4 | Build tool |
| TailwindCSS 3.4 | Styling |
| Zustand 4.5 | State management |
| Recharts 2.12 | Charts |
| Leaflet 1.9 | Hotspot maps |
| Cytoscape.js 3.30 | Network graphs |

### Infrastructure
- **Hosting:** Zoho Catalyst (AppSail + Web Client)
- **Database:** SQLite with WAL mode
- **AI:** Deterministic NLU + Legal KB + Gemini fallback
- **Auth:** JWT (access 30min + refresh 7d), role-based

---

## 50+ Features

**AI & NLU:** Deterministic NLU (zero hallucination), multi-language I/O (EN/HI/KN), multi-turn context, Legal Knowledge Base (BNS/IPC/POCSO/IT Act), Gemini fallback (rate-limited), confidence scoring

**Crime Intelligence:** Natural-language FIR search, accused profiling, repeat offender detection, criminal network graph, key player detection (centrality), gang/community detection, crime statistics, hotspot heatmap, crime forecast (seasonal + 2h slots + patrol recommendations), case similarity engine, 9-section AI investigation report

**Media Forensics:** Deepfake detection (metadata + 5 pixel-level checks), AI signature detection (SD/Midjourney/DALL-E), editor detection (Photoshop/GIMP), EXIF verification, entropy analysis, two-tier evidence scoring

**CCTV:** 4-signal biometric similarity (structural/texture/color/edge), calibrated confidence (92% cap), explainable per-signal breakdown, action priority levels

**Investigation:** Evidence upload + preview + chain-of-custody, 10-step checklist, officer notes, timeline

**Citizen Portal:** Complaint registration, auto law detection (POCSO/dowry/fraud), scam URL detector

**Security:** 5-role RBAC, tamper-evident audit trail (hash chain), PII masking, Gemini rate limiting, API key server-side only

---

## Project Structure


```
PRAHARI/
├── backend/
│   ├── app/
│   │   ├── main.py              # App lifecycle, CORS, router mount
│   │   ├── api/v1/endpoints/
│   │   │   ├── ai.py            # AI Chat (NLU → KB → Gemini → Help)
│   │   │   ├── auth.py          # Login, register, token refresh, language
│   │   │   ├── crime.py         # FIR CRUD, analytics, hotspots, audit
│   │   │   ├── deepfake.py      # Media forensics (byte + pixel analysis)
│   │   │   ├── investigation.py # Evidence, checklist, notes, preview
│   │   │   └── public.py        # Citizen portal, CCTV, forecast, scam
│   │   ├── core/config.py       # Settings, env loader, DB path
│   │   ├── core/security.py     # JWT, bcrypt, audit hash
│   │   ├── db/session.py        # SQLAlchemy engine + WAL pragmas
│   │   ├── db/init_db.py        # Table creation + seed functions
│   │   ├── models/user.py       # User, AuditLog, ConversationHistory
│   │   ├── models/crime.py      # FIR, Accused, Victim, Evidence, etc.
│   │   └── services/
│   │       ├── intent.py         # Deterministic NLU classifier
│   │       ├── knowledge.py      # Legal KB (BNS/IPC/POCSO)
│   │       ├── i18n.py           # Translations (EN/HI/KN)
│   │       ├── gemini.py         # Gemini API + rate limiter
│   │       ├── network.py        # Graph analysis (NetworkX)
│   │       ├── risk.py           # Multi-factor risk scoring
│   │       ├── audit.py          # Tamper-evident logging
│   │       └── pii_mask.py       # PII masking
│   ├── server.py                 # Uvicorn entry (reads Catalyst port)
│   ├── app-config.json           # Catalyst AppSail config
│   ├── requirements.txt          # Python deps
│   └── smoke_test.py             # 71-test suite
├── frontend/src/
│   ├── App.tsx                   # Router + 20 page routes
│   ├── pages/ (20 pages)        # Each feature has its own page
│   ├── components/LanguageSwitcher.tsx
│   ├── stores/authStore.ts       # Auth state (Zustand)
│   └── lib/api.ts                # Axios client (auto backend detection)
├── deploy-catalyst.ps1           # CLI deploy
├── build-for-console.ps1         # Console upload build
└── README.md
```

---

## Backend Code Explained

### server.py — Entry Point
- Reads `X_ZOHO_CATALYST_LISTEN_PORT` (Catalyst assigns port dynamically)
- Falls back to PORT env or 9000 for local dev
- Runs uvicorn with `app.main:app`

### app/main.py — Application Core
- **Lifespan**: creates DB tables → auto-seeds if empty → logs startup
- **CORS middleware**: Catalyst gateway sets Allow-Origin, so app only sets it locally (avoids duplicate header = browser reject)
- **Routes**: mounts all `/api/v1/*` endpoints

### services/intent.py — Zero-Hallucination NLU
- Pattern dict maps regex keywords → intents (7 intents)
- Trilingual: English + Hinglish + Kannada native script
- `classify_intent(msg)` → `{intent, confidence, filters, matched_keywords}`
- `extract_filters(msg)` → crime_type, location, status, date, gender
- `is_refinement(msg)` → detects follow-up queries ("only female", "sirf open")

### services/knowledge.py — Legal Knowledge Base
- 16 entries (theft→BNS 303, murder→103, cheating→318, FIR process, helplines...)
- `is_informational(query)` gate: INFO tokens present + no DB_ACTION tokens
- Specificity scoring: multi-word phrases > single keywords
- Returns answer + source + matched_keywords (explainable)

### services/gemini.py — AI Fallback (Secured)
- Rate limiter: `defaultdict(list)` timestamps per user_id
- Multi-model cascade: tries 5 model names sequentially
- Header auth (`x-goog-api-key`) works with AQ.* keys
- Key NEVER in any response (only 6-char prefix in diagnostics)

### endpoints/ai.py — AI Chat Orchestration
- Flow: classify → multi-turn context → KB override → route to handler
- KB override: "punishment for theft" (grabbed by search_firs) → rerouted to KB
- Each handler returns (text, data, sources) in user's language
- Conversation history saved for multi-turn

---

## Deployment

### Console Upload (recommended — never hangs):
```powershell
cd C:\Users\gurud\Desktop\PRAHARI
git pull origin main
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-for-console.ps1
```
→ Upload dist-appsail.zip to AppSail, dist-client.zip to Web Client via browser

### Rollback: Console → Deployments → click old version → Rollback

---

## Future Enterprise Improvements


| Area | Current | Enterprise Upgrade |
|------|---------|-------------------|
| Database | SQLite /tmp | PostgreSQL (persistent, multi-user) |
| Face Recognition | Byte-level signals | InsightFace/ArcFace + GPU |
| Deepfake | Heuristics | Trained CNN (EfficientNet on FF++) |
| Forecast | Pattern rules | Prophet/ARIMA time-series ML |
| NLU | Regex keywords | Fine-tuned IndicBERT |
| Auth | JWT | OAuth 2.0 + Active Directory SSO |
| Scale | Single container 512MB | Kubernetes + load balancer |
| Cache | None | Redis (10x speed) |
| Search | SQL LIKE | Elasticsearch (millions of FIRs) |
| Storage | SQLite BLOB | S3 object storage |
| Monitoring | Logs | Prometheus + Grafana + Sentry |
| CI/CD | Manual deploy | GitHub Actions auto-deploy |
| Mobile | Responsive web | Flutter app (offline-first) |
| Real-time | Poll | WebSocket live alerts |
| Data | Demo seed | Kafka/Airflow + CCTNS integration |
| Encryption | HTTPS only | AES-256 at-rest + field-level |
| Multi-tenancy | Single unit | Per-district isolation |

---

## Commit Verification
- **All 58 commits by:** Rishi Gurdatta <rishigurdatta.002@gmail.com>
- **No AI-agent references** in history
- **Backend compiles clean:** 0 errors
- **71-test smoke suite:** passes

---

*PRAHARI — Empowering Karnataka State Police with Intelligence-Driven Policing*
