# Jakarta Motor - Mobile APK Build Automator
# This script prepares your project for Android APK generation using Capacitor.

$ErrorActionPreference = "Stop"

# Pindah ke direktori tempat script ini berada (folder mobile)
Set-Location -Path $PSScriptRoot

Write-Host "`n[1/5] Memeriksa dependensi Capacitor..." -ForegroundColor Cyan
if (!(Test-Path "node_modules/@capacitor/cli")) {
    Write-Host "Menginstall Capacitor CLI & Core..." -ForegroundColor Gray
    npm install @capacitor/cli @capacitor/core @capacitor/android --save-dev
}

Write-Host "`n[2/5] Membangun Web Bundle (Vite)..." -ForegroundColor Cyan
npm run build

Write-Host "`n[3/5] Inisialisasi Project Android (jika belum ada)..." -ForegroundColor Cyan
if (!(Test-Path "android")) {
    npx cap init "Jakarta Motor" "com.jakartamotor.pos" --web-dir dist
    npx cap add android
}

Write-Host "`n[4/5] Sinkronisasi kode ke Android..." -ForegroundColor Cyan
npx cap sync android

Write-Host "`n[5/5] Membuka Project di Android Studio..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host "Selesai! Android Studio akan terbuka." -ForegroundColor Green
Write-Host "Langkah terakhir di Android Studio:"
Write-Host "1. Tunggu 'Gradle Sync' selesai."
Write-Host "2. Klik menu 'Build' -> 'Build Bundle(s) / APK(s)' -> 'Build APK(s)'."
Write-Host "3. APK Anda siap digunakan di HP!" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------"

npx cap open android
