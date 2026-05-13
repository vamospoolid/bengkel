@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: DEPLOY BENGKEL POS KE VPS
:: Klik 2x file ini untuk deploy
:: ============================================================

set VPS_IP=173.212.243.240
set VPS_USER=root
set VPS_PASS=Ahmad_dcc07
set ROOT_DIR=%~dp0

title Deploy Bengkel ke VPS [%VPS_IP%]

echo ============================================================
echo   DEPLOY BENGKEL POS KE VPS
echo   Tanggal: %date% %time%
echo ============================================================
echo.

:: 1. SETUP VPS
echo [1/4] SETUP NGINX DI VPS...
echo Tolong masukkan password (Ahmad_dcc07) jika diminta:
scp bengkel.conf %VPS_USER%@%VPS_IP%:/etc/nginx/sites-available/bengkel
echo Tolong masukkan password (Ahmad_dcc07) lagi:
ssh %VPS_USER%@%VPS_IP% "ln -sf /etc/nginx/sites-available/bengkel /etc/nginx/sites-enabled/bengkel && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx"
echo [OK] Nginx Setup Selesai.
echo.

:: 2. BUILD
echo [2/4] BUILD APLIKASI...
echo.
echo   Membangun Dashboard Frontend...
cd /d "%ROOT_DIR%frontend"
call npm run build
if %errorlevel% neq 0 ( echo [ERROR] Build Frontend Gagal! && pause && exit /b )

echo.
echo   Membangun Aplikasi Mobile...
cd /d "%ROOT_DIR%mobile"
call npm run build
if %errorlevel% neq 0 ( echo [ERROR] Build Mobile Gagal! && pause && exit /b )

echo [OK] Build Selesai.
echo.

:: 3. UPLOAD FILES
echo [3/4] UPLOAD KE VPS...
echo.
echo   Membersihkan folder lama di VPS...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "rm -rf /var/www/bengkel/frontend/* /var/www/bengkel/mobile/*"

echo.
echo   Mengupload Frontend (Dashboard)...
echo Tolong masukkan password (Ahmad_dcc07):
scp -r "%ROOT_DIR%frontend\dist\*" %VPS_USER%@%VPS_IP%:/var/www/bengkel/frontend/

echo.
echo   Mengupload Aplikasi Mobile...
echo Tolong masukkan password (Ahmad_dcc07):
scp -r "%ROOT_DIR%mobile\dist\*" %VPS_USER%@%VPS_IP%:/var/www/bengkel/mobile/

echo [OK] Upload Selesai.
echo.

:: 4. RESTART BACKEND
echo [4/4] RESTART BACKEND...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "pm2 restart bengkel-backend 2>/dev/null || echo 'PM2 backend tidak berjalan/belum di-setup'"
echo [OK] Selesai.
echo.

echo ============================================================
echo   DEPLOY BERHASIL KESELURUHAN!
echo ============================================================
echo   Akses Frontend (PC) di: http://%VPS_IP%
echo   Akses Mobile di       : http://%VPS_IP%:8080
echo ============================================================
pause
