$key = "$env:USERPROFILE\.ssh\id_rsa_bengkel"

# Remove inherited permissions and set only current user as owner
icacls $key /inheritance:r | Out-Null

$acl = Get-Acl $key
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $env:USERNAME,
    'FullControl',
    'Allow'
)
$acl.SetAccessRule($rule)
Set-Acl $key $acl

Write-Host "SSH key permissions fixed for: $key" -ForegroundColor Green

# Verify
$testResult = & ssh -i $key -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 "root@173.212.243.240" "echo 'SSH_KEY_OK'" 2>&1
if ($testResult -match "SSH_KEY_OK") {
    Write-Host "SUCCESS: Passwordless SSH is working!" -ForegroundColor Green
} else {
    Write-Host "Result: $testResult" -ForegroundColor Yellow
}
