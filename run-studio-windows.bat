@echo off
title FatGoats Studios - Digital Creative Operating System
echo =========================================================================
echo   FATGOATS STUDIOS - Film, TV, Animation and Production Suite
echo   Powered by high-performance Rust Engine and SQLite Relational Storage
echo =========================================================================
echo.

cd /d "%~dp0"

if exist "backend-rust\target\release\fatgoats-studios-backend.exe" (
    echo Starting FatGoats Studios Windows Application...
    start "" "backend-rust\target\release\fatgoats-studios-backend.exe" --port 3001 --open
) else if exist "backend-rust\target\debug\fatgoats-studios-backend.exe" (
    echo Starting FatGoats Studios Debug Application...
    start "" "backend-rust\target\debug\fatgoats-studios-backend.exe" --port 3001 --open
) else (
    echo Building Rust Native Windows Executable...
    cd backend-rust
    cargo build --release
    cd ..
    start "" "backend-rust\target\release\fatgoats-studios-backend.exe" --port 3001 --open
)

echo FatGoats Studios is active on http://localhost:3001
pause
