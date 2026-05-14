@echo off
title Build Installer Jakarta Motor
echo ============================================================
echo   BUILDING ELECTRON INSTALLER (PROD)
echo ============================================================
echo.

:: STEP 1: Build Frontend Terbaru
echo [1/3] Building Frontend...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

:: STEP 2: Copy dist ke folder desktop (opsional untuk fallback)
echo [2/3] Preparing resources...
if exist "%~dp0desktop\frontend_dist" rd /s /q "%~dp0desktop\frontend_dist"
xcopy /s /e /i "%~dp0frontend\dist" "%~dp0desktop\frontend_dist"

:: STEP 3: Build EXE
echo [3/3] Generating Installer (.exe)...
cd /d "%~dp0desktop"
:: Pastikan dependencies terinstal
call npm install
:: Jalankan builder
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Electron build failed!
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   BERHASIL! Installer ada di folder:
echo   desktop\dist\Jakarta Motor POS Setup.exe
echo ============================================================
pause
