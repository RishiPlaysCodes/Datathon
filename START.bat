@echo off
echo ============================================================
echo    PRAHARI - Crime Intelligence Operating System
echo    Starting all services...
echo ============================================================
echo.

:: Start Docker services (DB + ChromaDB)
echo [1/3] Starting Docker (PostgreSQL + ChromaDB)...
docker-compose up db chromadb -d 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Docker services may already be running or Docker not available.
    echo Make sure PostgreSQL is accessible on port 5433.
)
echo.

:: Start Backend
echo [2/3] Starting Backend on port 8001...
cd backend
start "PRAHARI Backend" cmd /k "uvicorn app.main:app --reload --port 8001"
cd ..
echo.

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [3/3] Starting Frontend...
cd frontend
start "PRAHARI Frontend" cmd /k "npm run dev"
cd ..
echo.

echo ============================================================
echo    PRAHARI is starting!
echo    Frontend: http://localhost:5174
echo    Backend:  http://localhost:8001
echo    Login:    admin / admin123
echo ============================================================
echo.
pause
