@echo off
title FatGoats Studios - Full Stack Development
echo =========================================================================
echo   Starting FatGoats Studios in Development Mode
echo   Backend: Rust (Axum, SQLite, WebSocket) on port 3001
echo   Frontend: Vite (React 19 + TypeScript) on port 5173
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Rust Backend Server...
start "FatGoats Rust Server" cmd /k "cd backend-rust && cargo run"

echo [2/2] Launching Vite Frontend...
start "FatGoats Frontend" cmd /k "cd frontend && npm run dev"

echo Both services launched! Open http://localhost:5173 in your browser.
