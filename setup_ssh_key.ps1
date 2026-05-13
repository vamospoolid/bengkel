# ============================================================
# SETUP SSH KEY - Jalankan SEKALI untuk login VPS tanpa password
# ============================================================
# Setelah ini jalankan deploy_vps.ps1 untuk deploy

$VPS_IP   = "173.212.243.240"
$VPS_USER = "root"
$KEY_PATH = "$env:USERPROFILE\.ssh\id_rsa_bengkel"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SETUP SSH KEY UNTUK VPS BENGKEL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Buat folder .ssh jika belum ada
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

# Generate SSH key jika belum ada
if (-not (Test-Path $KEY_PATH)) {
    Write-Host "[1/2] Membuat SSH key baru..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f $KEY_PATH -N "" -q
    Write-Host "[OK] Key dibuat: $KEY_PATH" -ForegroundColor Green
} else {
    Write-Host "[OK] SSH key sudah ada: $KEY_PATH" -ForegroundColor Green
}

# Tampilkan public key
$pubKey = Get-Content "$KEY_PATH.pub"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  LANGKAH MANUAL (1x saja):" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Buka terminal baru dan jalankan:" -ForegroundColor White
Write-Host ""
Write-Host "   ssh root@$VPS_IP" -ForegroundColor Cyan
Write-Host "   (masukkan password: Ahmad_dcc07)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Di dalam VPS, jalankan perintah ini:" -ForegroundColor White
Write-Host ""
Write-Host "   mkdir -p ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'KEY_OK'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Setelah muncul KEY_OK, ketik 'exit'" -ForegroundColor White
Write-Host ""
Write-Host "4. Jalankan script ini lagi untuk verifikasi" -ForegroundColor White
Write-Host ""

# Test koneksi
$testResult = & ssh -i $KEY_PATH -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "${VPS_USER}@${VPS_IP}" "echo 'SSH_KEY_OK'" 2>&1
if ($testResult -match "SSH_KEY_OK") {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  SSH KEY SUDAH AKTIF! Bisa jalankan deploy_vps.ps1" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  SSH Key belum aktif. Ikuti langkah di atas dulu." -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
}

Write-Host ""
pause
