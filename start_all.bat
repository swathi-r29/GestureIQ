@echo off
echo ================================================
echo         Starting GestureIQ - All Services
echo ================================================

echo [1/4] Starting Flask AI Server (port 5001)...
start cmd /k "cd D:\GestureIQ\notebooks && python -u flask_app.py"
timeout /t 3 /nobreak

echo [2/4] Starting Node Backend (port 5000)...
start cmd /k "cd D:\GestureIQ\backend && npm start"
timeout /t 3 /nobreak

echo [3/4] Starting Vite Frontend (port 5173)...
start cmd /k "cd D:\GestureIQ\gestureiq-web && npm run dev"
timeout /t 3 /nobreak

echo [4/4] Starting ngrok tunnel...
start cmd /k "ngrok http 5173 --request-header-remove=X-Frame-Options"
timeout /t 5 /nobreak

echo.
echo ================================================
echo  ALL SERVICES STARTED!
echo.
echo  NEXT STEPS:
echo  1. Copy the https:// URL from the ngrok window
echo  2. Run:  update_url.bat https://xxxx.ngrok-free.app
echo  3. Restart Vite (close Vite window, rerun step 3)
echo  4. Create new class and share the join link
echo ================================================
pause