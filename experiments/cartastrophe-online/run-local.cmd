@echo off
rem Runs Cartastrophe Online locally: installs wrangler (first time only), rebuilds the page, starts wrangler dev on port 8787.
rem No Cloudflare account needed. Open http://127.0.0.1:8787/ in two browser windows. Ctrl+C stops it.
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is needed: https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\wrangler call npm install
call npm run dev
pause
