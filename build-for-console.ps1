# ═══════════════════════════════════════════════════════════════════════════════
# PRAHARI — Build packages for MANUAL Catalyst Console upload
# ═══════════════════════════════════════════════════════════════════════════════
#
# Use this when `catalyst deploy` hangs at "Preparing AppSail".
# It builds everything locally and produces two ready-to-upload ZIPs:
#   1. dist-appsail.zip  -> upload to Console > Serverless > AppSail (prahari-final)
#   2. dist-client.zip   -> upload to Console > Web Client Hosting
#
# It does NOT run `catalyst deploy`, so it never hangs. You upload via browser.
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SkipDependencyBundle
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js not found in PATH.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python not found in PATH.' }

# ─── 1. Build the frontend ───
Write-Host '[1/4] Building the PRAHARI frontend...' -ForegroundColor Cyan
Push-Location 'frontend'
try {
    Invoke-CheckedCommand npm install
    Invoke-CheckedCommand npm run build
} finally {
    Pop-Location
}

# ─── 2. Bundle the backend Linux/Python 3.11 dependencies ───
if (-not $SkipDependencyBundle) {
    Write-Host '[2/4] Bundling Linux/Python 3.11 dependencies into backend\vendor...' -ForegroundColor Cyan
    if (Test-Path 'backend\vendor') { Remove-Item 'backend\vendor' -Recurse -Force }
    New-Item -ItemType Directory -Path 'backend\vendor' | Out-Null
    Invoke-CheckedCommand python -m pip install -r 'backend\requirements.txt' `
        --platform manylinux2014_x86_64 `
        --python-version 3.11 `
        --implementation cp `
        --only-binary=:all: `
        --target 'backend\vendor' `
        --upgrade
} else {
    Write-Host '[2/4] Reusing existing backend\vendor bundle...' -ForegroundColor Cyan
    if (-not (Test-Path 'backend\vendor\fastapi')) { throw 'backend\vendor is incomplete.' }
}

# ─── 3. Create the AppSail (backend) ZIP ───
Write-Host '[3/4] Creating dist-appsail.zip (backend for AppSail)...' -ForegroundColor Cyan
$AppSailZip = Join-Path $RepoRoot 'dist-appsail.zip'
if (Test-Path $AppSailZip) { Remove-Item $AppSailZip -Force }
# Zip the CONTENTS of backend\ (so app-config.json sits at the archive root).
# Exclude local-only artefacts.
$exclude = @('__pycache__', '*.pyc', '.env', 'smoke_test.py', '*.db', '*.db-wal', '*.db-shm')
$backendItems = Get-ChildItem 'backend' -Force | Where-Object {
    $_.Name -notin @('__pycache__') -and $_.Name -ne '.env'
}
Compress-Archive -Path (Join-Path $RepoRoot 'backend\*') -DestinationPath $AppSailZip -Force
Write-Host ("     -> {0}  ({1:N1} MB)" -f $AppSailZip, ((Get-Item $AppSailZip).Length / 1MB)) -ForegroundColor Green

# ─── 4. Create the frontend (web client) ZIP ───
Write-Host '[4/4] Creating dist-client.zip (frontend for Web Client Hosting)...' -ForegroundColor Cyan
$ClientZip = Join-Path $RepoRoot 'dist-client.zip'
if (Test-Path $ClientZip) { Remove-Item $ClientZip -Force }
# client-package.json marks this as a Catalyst client bundle.
$ClientPackage = @{ name = 'prahari-frontend'; version = '1.0.0'; homepage = '.'; stack = 'developer' } | ConvertTo-Json -Compress
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $RepoRoot 'frontend\dist\client-package.json'), $ClientPackage, $Utf8NoBom)
Compress-Archive -Path (Join-Path $RepoRoot 'frontend\dist\*') -DestinationPath $ClientZip -Force
Write-Host ("     -> {0}  ({1:N1} MB)" -f $ClientZip, ((Get-Item $ClientZip).Length / 1MB)) -ForegroundColor Green

Write-Host ''
Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ' BUILD COMPLETE — no CLI deploy, nothing can hang.' -ForegroundColor Green
Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ' Now upload via browser (Catalyst Console):' -ForegroundColor Yellow
Write-Host '  1. dist-appsail.zip -> Serverless > AppSail > prahari-final > Deploy (upload)' -ForegroundColor White
Write-Host '  2. dist-client.zip  -> Web Client Hosting > Deploy (upload)' -ForegroundColor White
Write-Host ''
Write-Host ' AppSail command:  python3 server.py' -ForegroundColor White
Write-Host ' AppSail stack:    python_3_11   |  build path: .   |  memory: 512' -ForegroundColor White
