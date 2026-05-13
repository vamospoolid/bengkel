@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && cp prisma/dev.db dev.db 2>/dev/null || true && pm2 restart bengkel-backend"
echo Selesai.
pause
