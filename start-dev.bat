@echo off
echo =================================================================
echo   StrawCRM - Launching Frontend and Backend simultaneously
echo =================================================================
echo.
start "StrawCRM Backend" cmd /k "cd /d "%~dp0Implementation\Backend" && python -m uvicorn app.main:app --reload --port 8000"
cd /d "%~dp0Implementation\Frontend"
npm run dev

