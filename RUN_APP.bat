@echo off
TITLE Notify_Me - Single Unified Console
color 0b
cd /d "%~dp0"

echo ==========================================================
echo          NOTIFY_ME AI STUDIO (UNIFIED PROCESS)
echo ==========================================================
echo  Starting all services (Backend, Frontend, AI Service)
echo  inside this single window to minimize system resources.
echo ==========================================================

REM Terminate any stale node or python servers holding locks
echo [*] Terminating any conflicting background server instances...
taskkill /F /IM node.exe /FI "WINDOWTITLE ne Notify_Me*" >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

REM Clean potential Next.js cache locks from previous builds
if exist "frontend\.next" (
    echo [*] Clearing Next.js development cache...
    rd /s /q "frontend\.next" 2>nul
)

REM Check MongoDB service
sc query MongoDB 2>nul | find "RUNNING" >nul
if %ERRORLEVEL% neq 0 (
    echo [*] Starting MongoDB service...
    net start MongoDB >nul 2>&1
)

REM Open the browser after 10 seconds to allow Next.js to initialize
start /min powershell -Command "Start-Sleep -Seconds 10; Start-Process 'http://localhost:3000/dashboard'"

REM Run all 3 services concurrently inside this ONE terminal window
npm run dev
