@echo off
echo ================================================
echo         Starting GestureIQ - All Services
echo ================================================

echo [1/4] Starting Flask AI Server (port 5001)...
start cmd /k "cd /d "%~dp0notebooks" && python -u flask_app.py"
timeout /t 3 /nobreak

echo [2/4] Starting Node Backend (port 5000)...
start cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak

echo [3/4] Starting Vite Frontend (port 5173)...
start cmd /k "cd /d "%~dp0gestureiq-web" && npm run dev"
timeout /t 3 /nobreak

echo [4/4] Starting ngrok tunnel...
start cmd /k "ngrok http 5173"
timeout /t 5 /nobreak

echo.
echo ================================================
echo  ALL SERVICES STARTED!
echo.
echo  NEXT STEPS:
echo  1. Copy the https://xxxx.trycloudflare.com URL from the Cloudflare window
echo  2. Run:  update_url.bat https://xxxx.trycloudflare.com
echo  3. Open your site - NO warning pages or MIME errors!
echo ================================================
pause