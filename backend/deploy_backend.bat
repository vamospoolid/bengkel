@echo off
set VPS_IP=173.212.243.240
set VPS_USER=root

echo =========================================
echo UPLOAD BACKEND KE VPS
echo =========================================

echo [1/3] Upload file sumber...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "mkdir -p /var/www/bengkel/backend/src /var/www/bengkel/backend/prisma"
scp package.json tsconfig.json %VPS_USER%@%VPS_IP%:/var/www/bengkel/backend/
scp prisma/schema.prisma %VPS_USER%@%VPS_IP%:/var/www/bengkel/backend/prisma/
scp -r src/* %VPS_USER%@%VPS_IP%:/var/www/bengkel/backend/src/

echo.
echo [2/3] Menginstall dependency dan build di VPS...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "apt-get update && apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 || true"
echo Tolong masukkan password (Ahmad_dcc07) lagi:
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && npm install && npx prisma generate && npx tsc && echo DATABASE_URL=\"file:./dev.db\" > .env && echo JWT_SECRET=\"admin\" >> .env"

echo.
echo [3/3] Restart PM2...
echo Tolong masukkan password (Ahmad_dcc07):
ssh %VPS_USER%@%VPS_IP% "cd /var/www/bengkel/backend && pm2 delete bengkel-backend 2>/dev/null || true && NODE_ENV=production pm2 start dist/index.js --name bengkel-backend"

echo.
echo SELESAI!
pause
