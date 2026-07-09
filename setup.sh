#!/bin/bash
# ============================================================
# PRAHARI - Quick Local Setup (Without Docker)
# ============================================================
# Run this from the PRAHARI/Datathon root directory
# ============================================================

echo "======================================"
echo "  PRAHARI - Crime Intelligence OS"
echo "  Local Development Setup"
echo "======================================"
echo ""

# --- Backend Setup ---
echo "[1/4] Setting up Python backend..."
cd backend
python -m venv venv 2>/dev/null || python3 -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
pip install -r requirements.txt
echo ""

# --- Seed Database ---
echo "[2/4] Seeding database with 220+ FIRs..."
python -c "import asyncio; import sys; sys.path.insert(0,'.'); from app.db.init_db import init_database; asyncio.run(init_database())"
echo ""

# --- Frontend Setup ---
echo "[3/4] Setting up React frontend..."
cd ../frontend
npm install
echo ""

echo "[4/4] Setup complete!"
echo ""
echo "======================================"
echo "  TO START THE APP:"
echo "======================================"
echo ""
echo "  Terminal 1 (Backend - Port 8001):"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "  Terminal 2 (Frontend - Port 5174):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:5174"
echo "  API docs:  http://localhost:8001/docs"
echo ""
echo "  Login: demo / demo123"
echo "======================================"
