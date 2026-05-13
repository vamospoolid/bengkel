@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo   SINKRONISASI ULANG DATABASE VPS
echo ============================================================
echo.

set VPS_IP=173.212.243.240
set VPS_USER=root
set VPS_PASS=Ahmad_dcc07

echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && npm run seed && pm2 restart bengkel-backend"

echo.
echo ============================================================
echo   SELESAI! Silakan coba login lagi.
echo ============================================================
pause
