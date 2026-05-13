# ======================================================
# BENGKEL POS - ELECTRON INSTALLER BUILDER
# ======================================================

$ErrorActionPreference = "Stop"

Write-Host "`n[1/4] Building Backend..." -ForegroundColor Cyan
Set-Location "d:\APPS\bengkel\bengkel\backend"
# Clean dist folder if exists
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force }
npm install --silent
npx prisma generate
npm run build
Write-Host "   -> Backend build COMPLETE." -ForegroundColor Green

Write-Host "`n[2/4] Preparing Frontend & Electron..." -ForegroundColor Cyan
Set-Location "d:\APPS\bengkel\bengkel\frontend"
# Clean dist and dist-electron folders
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force }
if (Test-Path "dist-electron") { Remove-Item -Path "dist-electron" -Recurse -Force }
npm install --silent
Write-Host "   -> Frontend dependencies COMPLETE." -ForegroundColor Green

Write-Host "`n[3/4] Building Electron Installer (.exe)..." -ForegroundColor Cyan
npm run electron:build
Write-Host "   -> Electron build COMPLETE." -ForegroundColor Green

Write-Host "`n[4/4] Process Finished!" -ForegroundColor Cyan
$distDir = "d:\APPS\bengkel\bengkel\frontend\dist-electron"
$desktopDir = [Environment]::GetFolderPath("Desktop")

# Copy the installer to Desktop
$installer = Get-ChildItem -Path $distDir -Filter "*.exe" | Select-Object -First 1
if ($installer) {
    Copy-Item -Path $installer.FullName -Destination $desktopDir -Force
    Write-Host "Installer has been generated and copied to your Desktop!" -ForegroundColor Green
    Write-Host "File: $($installer.Name)" -ForegroundColor Yellow
} else {
    Write-Host "Installer generation failed!" -ForegroundColor Red
}

Write-Host "======================================================"
