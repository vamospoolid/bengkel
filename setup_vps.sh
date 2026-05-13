#!/bin/bash
# =============================================================
# SETUP VPS - Bengkel POS
# Jalankan sekali di VPS: bash setup_vps.sh
# VPS: 173.212.243.240
# =============================================================

set -e

echo "============================================================"
echo "  SETUP VPS BENGKEL POS"
echo "============================================================"
echo ""

# ============================================================
# Install dependencies
# ============================================================
echo "[1/6] Update & Install Nginx, Node.js, PM2..."
apt update -y
apt install -y nginx curl git

# Install Node.js 20 jika belum ada
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install PM2 global
npm install -g pm2
echo "[OK] Dependencies terpasang."
echo ""

# ============================================================
# Buat direktori
# ============================================================
echo "[2/6] Membuat direktori website..."
mkdir -p /var/www/bengkel/frontend
mkdir -p /var/www/bengkel/mobile
mkdir -p /var/www/bengkel/backend
echo "[OK] Direktori siap."
echo ""

# ============================================================
# Setup Backend (clone dari GitHub jika belum ada)
# ============================================================
echo "[3/6] Setup Backend..."
if [ ! -d "/var/www/bengkel/backend/.git" ]; then
    echo "  Cloning repo... (isi URL repo GitHub Anda)"
    # git clone https://github.com/USERNAME/bengkel.git /tmp/bengkel_clone
    # cp -r /tmp/bengkel_clone/backend/* /var/www/bengkel/backend/
    echo "  [SKIP] Clone manual - pastikan /var/www/bengkel/backend berisi kode backend"
fi

# Setup .env backend
cat > /var/www/bengkel/backend/.env << 'EOF'
DATABASE_URL="file:./dev.db"
JWT_SECRET="admin"
PORT=3002
EOF

echo "[OK] Backend .env selesai."
echo ""

# ============================================================
# Install & Build Backend
# ============================================================
echo "[4/6] Install backend dependencies & build..."
cd /var/www/bengkel/backend
npm install
npx prisma generate
npm run build || true  # TypeScript build
echo "[OK] Backend siap."
echo ""

# ============================================================
# Setup PM2 untuk Backend
# ============================================================
echo "[5/6] Setup PM2..."
cd /var/www/bengkel/backend

# Stop jika sudah ada
pm2 delete bengkel-backend 2>/dev/null || true

# Jalankan backend
pm2 start dist/index.js --name bengkel-backend --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "[OK] PM2 backend berjalan di port 3002."
echo ""

# ============================================================
# Setup Nginx
# ============================================================
echo "[6/6] Setup Nginx..."

cat > /etc/nginx/sites-available/bengkel << 'NGINX_CONF'
# ============================================================
# Frontend Dashboard - port 80
# ============================================================
server {
    listen 80;
    server_name _;

    root /var/www/bengkel/frontend;
    index index.html;

    # React Router - semua route ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API ke backend
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload files
    location /uploads/ {
        proxy_pass http://localhost:3002/uploads/;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# ============================================================
# Mobile App - port 8080
# ============================================================
server {
    listen 8080;
    server_name _;

    root /var/www/bengkel/mobile;
    index index.html;

    # React Router - semua route ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINX_CONF

# Enable site
ln -sf /etc/nginx/sites-available/bengkel /etc/nginx/sites-enabled/bengkel

# Hapus default site jika ada
rm -f /etc/nginx/sites-enabled/default

# Test config Nginx
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo "============================================================"
echo "  SETUP SELESAI!"
echo ""
echo "  Dashboard  : http://173.212.243.240"
echo "  Mobile     : http://173.212.243.240:8080"
echo "  API Backend: http://173.212.243.240:3002/api"
echo ""
echo "  Selanjutnya: jalankan deploy_vps.bat dari Windows"
echo "  untuk upload file frontend dan mobile."
echo "============================================================"
