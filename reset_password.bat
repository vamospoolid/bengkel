@echo off
echo ============================================================
echo   MERESET PASSWORD ADMIN VPS
echo ============================================================
echo.

set VPS_IP=173.212.243.240
set VPS_USER=root

echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && node -e \"const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcrypt'); const prisma = new PrismaClient(); async function reset() { const hash = await bcrypt.hash('admin123', 10); await prisma.user.updateMany({ where: { username: 'admin' }, data: { password: hash } }); console.log('PASSWORD RESET SUKSES!'); } reset().finally(()=>prisma.\\$disconnect());\""

echo.
echo ============================================================
echo   SELESAI! Password admin sekarang PASTI "admin123".
echo   Silakan coba login lagi.
echo ============================================================
pause
