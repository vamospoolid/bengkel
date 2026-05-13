@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo TOLONG MASUKKAN PASSWORD VPS (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && node dist/index.js" > vps_crash_log.txt 2>&1

echo.
echo SELESAI, saya akan periksa.
pause
