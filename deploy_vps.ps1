# ============================================================
# DEPLOY BENGKEL POS KE VPS
# SYARAT: Jalankan setup_ssh_key.ps1 dulu (1x saja)
# VPS: 173.212.243.240
# ============================================================

$VPS_IP   = "173.212.243.240"
$VPS_USER = "root"
$KEY_PATH = "$env:USERPROFILE\.ssh\id_rsa_bengkel"
$ROOT     = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DEPLOY BENGKEL POS KE VPS - $(Get-Date -Format 'dd/MM/yyyy HH:mm')" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Cek SSH key tersedia ──────────────────────────────────────────────────────
if (-not (Test-Path $KEY_PATH)) {
    Write-Host "[ERROR] SSH key tidak ditemukan. Jalankan setup_ssh_key.ps1 dulu!" -ForegroundColor Red
    pause; exit 1
}

# ── Helper functions ──────────────────────────────────────────────────────────
function Invoke-VPS {
    param([string]$Command)
    $result = & ssh -i $KEY_PATH -o StrictHostKeyChecking=no -o BatchMode=yes `
        "${VPS_USER}@${VPS_IP}" $Command 2>&1
    return $result
}

function Copy-ToVPS {
    param([string]$LocalPath, [string]$RemotePath)
    & scp -i $KEY_PATH -o StrictHostKeyChecking=no -r `
        $LocalPath "${VPS_USER}@${VPS_IP}:${RemotePath}" 2>&1
}

# ── Test koneksi ──────────────────────────────────────────────────────────────
Write-Host "[0/5] Test koneksi VPS..." -ForegroundColor Yellow
$ping = Invoke-VPS "echo 'PONG'"
if ($ping -match "PONG") {
    Write-Host "[OK] VPS terhubung." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Tidak bisa konek VPS. Cek jaringan atau jalankan setup_ssh_key.ps1" -ForegroundColor Red
    Write-Host "Output: $ping" -ForegroundColor Gray
    pause; exit 1
}
Write-Host ""

# ────────────────────────────────────────────────────────────
# STEP 1: Setup Direktori + Nginx di VPS
# ────────────────────────────────────────────────────────────
Write-Host "[1/5] Setup Nginx di VPS..." -ForegroundColor Yellow

$nginxConf = @'
server {
    listen 80;
    server_name _;
    root /var/www/bengkel/frontend;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /uploads/ { proxy_pass http://localhost:3002/uploads/; }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
server {
    listen 8080;
    server_name _;
    root /var/www/bengkel/mobile;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
'@

# Simpan ke file lokal sementara lalu upload
$tmpConf = "$env:TEMP\bengkel_nginx.conf"
$nginxConf | Out-File -FilePath $tmpConf -Encoding utf8 -NoNewline

& scp -i $KEY_PATH -o StrictHostKeyChecking=no $tmpConf "${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/bengkel" 2>&1

$setupResult = Invoke-VPS @"
mkdir -p /var/www/bengkel/frontend /var/www/bengkel/mobile
apt-get install -y nginx -qq 2>&1 | tail -1
systemctl enable nginx && systemctl start nginx
ln -sf /etc/nginx/sites-available/bengkel /etc/nginx/sites-enabled/bengkel
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 && systemctl reload nginx && echo 'NGINX_SETUP_OK'
"@

Write-Host $setupResult
if ($setupResult -match "NGINX_SETUP_OK") {
    Write-Host "[OK] Nginx terkonfigurasi." -ForegroundColor Green
} else {
    Write-Host "[WARN] Nginx mungkin perlu dicek manual." -ForegroundColor Yellow
}
Write-Host ""

# ────────────────────────────────────────────────────────────
# STEP 2: Build Frontend
# ────────────────────────────────────────────────────────────
Write-Host "[2/5] Build Frontend (Dashboard)..." -ForegroundColor Yellow
Push-Location "$ROOT\frontend"
$buildOut = npm run build 2>&1
Write-Host $buildOut
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build Frontend GAGAL!" -ForegroundColor Red; Pop-Location; pause; exit 1
}
Pop-Location
Write-Host "[OK] Frontend built." -ForegroundColor Green
Write-Host ""

# ────────────────────────────────────────────────────────────
# STEP 3: Build Mobile
# ────────────────────────────────────────────────────────────
Write-Host "[3/5] Build Mobile..." -ForegroundColor Yellow
Push-Location "$ROOT\mobile"
$buildMobile = npm run build 2>&1
Write-Host $buildMobile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build Mobile GAGAL!" -ForegroundColor Red; Pop-Location; pause; exit 1
}
Pop-Location
Write-Host "[OK] Mobile built." -ForegroundColor Green
Write-Host ""

# ────────────────────────────────────────────────────────────
# STEP 4: Upload ke VPS
# ────────────────────────────────────────────────────────────
Write-Host "[4/5] Upload dist ke VPS..." -ForegroundColor Yellow

Write-Host "  Bersihkan file lama..." -ForegroundColor Gray
Invoke-VPS "rm -rf /var/www/bengkel/frontend/* /var/www/bengkel/mobile/*" | Out-Null

Write-Host "  Upload Frontend dist..." -ForegroundColor Gray
& scp -i $KEY_PATH -o StrictHostKeyChecking=no -r "$ROOT\frontend\dist\." "${VPS_USER}@${VPS_IP}:/var/www/bengkel/frontend/" 2>&1

Write-Host "  Upload Mobile dist..." -ForegroundColor Gray
& scp -i $KEY_PATH -o StrictHostKeyChecking=no -r "$ROOT\mobile\dist\." "${VPS_USER}@${VPS_IP}:/var/www/bengkel/mobile/" 2>&1

Write-Host "[OK] Upload selesai." -ForegroundColor Green
Write-Host ""

# ────────────────────────────────────────────────────────────
# STEP 5: Finalisasi
# ────────────────────────────────────────────────────────────
Write-Host "[5/5] Reload Nginx + restart PM2..." -ForegroundColor Yellow
$finalOut = Invoke-VPS "systemctl reload nginx && pm2 restart bengkel-backend 2>/dev/null || echo 'PM2 skip' && echo 'DEPLOY_DONE'"
Write-Host $finalOut

# Verifikasi
Write-Host ""
Write-Host "Verifikasi file di VPS..." -ForegroundColor Gray
$verify = Invoke-VPS "ls /var/www/bengkel/frontend/ | head -5; echo '---'; ls /var/www/bengkel/mobile/ | head -5"
Write-Host $verify

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!" -ForegroundColor Green
Write-Host ""
Write-Host ("  Dashboard  : http://" + $VPS_IP) -ForegroundColor White
Write-Host ("  Mobile     : http://" + $VPS_IP + ":8080") -ForegroundColor White
Write-Host ("  API Backend: http://" + $VPS_IP + ":3002/api") -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
pause
