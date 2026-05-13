@echo off
echo Memeriksa file database di VPS...
ssh root@173.212.243.240 "ls -la /var/www/bengkel/backend/dev.db /var/www/bengkel/backend/prisma/dev.db"
pause
