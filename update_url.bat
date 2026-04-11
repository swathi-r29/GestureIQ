@echo off
setlocal enabledelayedexpansion

:: Usage: .\update_url.bat https://your-ngrok-url.ngrok-free.app

if "%~1"=="" (
    echo [ERROR] No URL provided.
    echo Usage: .\update_url.bat https://your-url.ngrok-free.app
    pause
    exit /b 1
)

set NEW_URL=%~1
set ENV_FILE=gestureiq-web\.env

echo ================================================
echo         Updating GestureIQ Public URL
echo ================================================
echo New URL: %NEW_URL%
echo Target:   %ENV_FILE%

:: Use PowerShell to perform the replacement in-place
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'VITE_PUBLIC_URL=.*', 'VITE_PUBLIC_URL=%NEW_URL%' | Set-Content '%ENV_FILE%'"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SUCCESS! Public URL updated.
    echo ⚠️  IMPORTANT: You MUST restart the Vite terminal for this to take effect.
    echo.
) else (
    echo.
    echo ❌ FAILED to update .env file.
)

pause