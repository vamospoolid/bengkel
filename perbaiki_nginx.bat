@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo MENGUPLOAD KONFIGURASI NGINX YANG BENAR...
echo Tolong masukkan password (Ahmad_dcc07):
scp bengkel.conf %VPS_USER%@%VPS_IP%:/etc/nginx/sites-available/bengkel

echo.
echo MERESTART NGINX...
echo Tolong masukkan password (Ahmad_dcc07) lagi:
ssh %VPS_USER%@%VPS_IP% "ln -sf /etc/nginx/sites-available/bengkel /etc/nginx/sites-enabled/bengkel && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx"

echo.
echo SELESAI! Nginx sudah hidup kembali.
pause
