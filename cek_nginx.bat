@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo MEMERIKSA STATUS NGINX...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "nginx -t"

echo.
pause
