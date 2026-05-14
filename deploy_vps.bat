@echo off
setlocal enabledelayedexpansion
title Deploy Bengkel ke VPS

set VPS_IP=173.212.243.240
set VPS_USER=root
set VPS_PASS=Ahmad_dcc07

echo ============================================================
echo   DEPLOY BENGKEL POS KE VPS - %date% %time%
echo ============================================================
echo.

:: ============================================================
:: STEP 1: Build Frontend (Dashboard)
:: ============================================================
echo [1/5] Build Frontend (Dashboard)...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build Frontend GAGAL!
    pause
    exit /b 1
)
echo [OK] Frontend berhasil di-build.
echo.

:: ============================================================
:: STEP 2: Build Mobile
:: ============================================================
echo [2/5] Build Mobile...
cd /d "%~dp0mobile"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build Mobile GAGAL!
    pause
    exit /b 1
)
echo [OK] Mobile berhasil di-build.
echo.

:: ============================================================
:: STEP 3: Push ke GitHub
:: ============================================================
echo [3/5] Push kode ke GitHub...
cd /d "%~dp0"
git add .
git commit -m "Deploy: %date% %time%"
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Git push gagal atau tidak ada perubahan baru.
)
echo [OK] GitHub selesai.
echo.

:: ============================================================
:: STEP 4: Upload dist & DATABASE ke VPS via SCP
:: ============================================================
echo [4/5] Uploading dist files and local database to VPS...
echo MASUKKAN PASSWORD VPS SAAT DIMINTA: %VPS_PASS%
echo.

:: Bersihkan folder tujuan di VPS dulu agar tidak ada file sampah
ssh %VPS_USER%@%VPS_IP% "rm -rf /var/www/bengkel/frontend/* /var/www/bengkel/mobile/*"

echo   [4a] Upload frontend/dist...
scp -r "%~dp0frontend\dist\*" %VPS_USER%@%VPS_IP%:/var/www/bengkel/frontend/

echo   [4b] Upload mobile/dist...
scp -r "%~dp0mobile\dist\*" %VPS_USER%@%VPS_IP%:/var/www/bengkel/mobile/

echo   [4c] Upload Database (dev.db)...
:: Pastikan backend di VPS dimatikan sebentar agar file db tidak lock (opsional tapi aman)
ssh %VPS_USER%@%VPS_IP% "pm2 stop bengkel-backend"
scp "%~dp0backend\prisma\dev.db" %VPS_USER%@%VPS_IP%:/var/www/bengkel/backend/prisma/
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Upload Database gagal! File mungkin sedang digunakan.
)

echo [OK] Upload selesai.
echo.

:: ============================================================
:: STEP 5: Update Backend di VPS + Restart PM2
:: ============================================================
echo [5/5] Update Backend dan restart PM2 di VPS...
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && git pull origin main && npm install && npx prisma generate && pm2 start bengkel-backend || pm2 restart bengkel-backend && echo 'PM2 started/restarted OK'"
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Backend update mungkin gagal, cek VPS manual.
)
echo.

echo ============================================================
echo   DEPLOY SELESAI!
echo.
echo   Dashboard  : http://%VPS_IP%
echo   Mobile     : http://%VPS_IP%:8080
echo   API Backend: http://%VPS_IP%:3002/api
echo ============================================================
pause
