@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo TOLONG MASUKKAN PASSWORD VPS (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "pm2 logs bengkel-backend --lines 30 --nostream" > pm2_logs.txt 2>&1

echo.
echo SELESAI, saya akan periksa log-nya.
pause
