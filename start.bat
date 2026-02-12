@echo off
title ZEB AI Agent (Pro)
color 0A
cd /d "%~dp0"

echo.
echo  ============================================
echo   ZEB AI Customer Support Agent — Pro
echo  ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not installed.
    echo  Download from https://nodejs.org  (LTS version)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  Node.js %%v found

:: Setup server .env
if not exist "server\.env" (
    copy "server\.env.example" "server\.env" >nul
    echo.
    echo  ACTION REQUIRED — Opening server\.env in Notepad.
    echo  Fill in ALL four keys and save.
    echo.
    notepad "server\.env"
    echo  Press any key when saved...
    pause >nul
)

:: Setup scripts .env
if not exist "scripts\.env" (
    copy "scripts\.env.example" "scripts\.env" >nul
)

:: Install
if not exist "node_modules" (
    echo  Installing root dependencies...
    call npm install
)
if not exist "server\node_modules" (
    echo  Installing server dependencies...
    cd server & call npm install & cd ..
)
if not exist "client\node_modules" (
    echo  Installing client dependencies...
    cd client & call npm install & cd ..
)
if not exist "admin\node_modules" (
    echo  Installing admin dependencies...
    cd admin & call npm install & cd ..
)
if not exist "scripts\node_modules" (
    echo  Installing script dependencies...
    cd scripts & call npm install & cd ..
)

echo.
echo  ============================================
echo.
echo  STEP 1 — Seed Pinecone (first time only):
echo    cd scripts
echo    copy .env.example .env   (if not done)
echo    node seed-pinecone.js
echo.
echo  STEP 2 — Start the app:
echo    npm run dev  (from root folder)
echo.
echo  URLs:
echo    Chat  →  http://localhost:5173
echo    Admin →  http://localhost:5174
echo    API   →  http://localhost:5000
echo.
echo  ============================================
echo.
pause
