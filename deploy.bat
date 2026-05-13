@echo off
echo [1/3] Menambahkan perubahan ke GitHub...
git add .
git commit -m "Auto-deploy: %date% %time%"
git push origin main

echo.
echo [2/3] Login ke VPS untuk Update...
echo SILAKAN MASUKKAN PASSWORD VPS BAPAK SAAT DIMINTA (Ahmad_dcc07)
ssh root@173.212.243.240 "cd /var/www/bengkel/backend && git pull origin main && npm install && pm2 restart bengkel-backend"

echo.
echo [3/3] SELESAI! VPS sudah menggunakan kode terbaru.
pause
