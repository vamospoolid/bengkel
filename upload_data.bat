@echo off
echo [1/3] Menyiapkan database lokal...
set DB_PATH=backend\prisma\dev.db

echo.
echo [2/3] Mengirim data ke VPS (Memindahkan Barang/Pelanggan)...
echo SILAKAN MASUKKAN PASSWORD VPS BAPAK SAAT DIMINTA (Ahmad_dcc07)
scp %DB_PATH% root@173.212.243.240:/var/www/bengkel/backend/prisma/dev.db

echo.
echo [3/3] Me-restart server di VPS agar data baru terbaca...
ssh root@173.212.243.240 "pm2 restart bengkel-backend"

echo.
echo SELESAI! Data barang dan pelanggan sudah pindah ke VPS.
pause
