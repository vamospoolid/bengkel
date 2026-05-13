# --- AUTO ELEVATE TO ADMIN ---
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$printerName = "POS80"

Write-Host "--- Fixing Printer Sharing for $printerName (ADMIN MODE) ---" -ForegroundColor Cyan

$printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue

if ($null -eq $printer) {
    Write-Host "ERROR: Printer $printerName not found!" -ForegroundColor Red
    exit
}

Write-Host "Enabling Sharing..."
Set-Printer -Name $printerName -Shared $true -ShareName $printerName

Write-Host "Setting Permissions for Everyone..."
# Granting access to Everyone (WD)
$sddl = "D:(A;;LCSWSDRCWDWO;;;BA)(A;;LCSWSDRCWDWO;;;PU)(A;;LCSWSDRCWDWO;;;WD)"
Set-Printer -Name $printerName -PermissionSDDL $sddl

Write-Host "Restarting Print Spooler..."
Restart-Service -Name Spooler -Force

Write-Host "DONE! Printer $printerName should now stay shared and accessible." -ForegroundColor Green
pause
