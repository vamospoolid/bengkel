@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo TOLONG MASUKKAN PASSWORD VPS (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "nginx -t" > nginx_test.txt 2>&1

echo.
echo SELESAI, saya akan periksa errornya.
pause
