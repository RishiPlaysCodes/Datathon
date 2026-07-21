param(
    [switch]$SkipDependencyBundle
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$DevelopmentBackend = 'https://prahari-final-50044229424.development.catalystappsail.in'
$DevelopmentFrontend = 'https://prahari-60079422859.development.catalystserverless.in/app/index.html'

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

function Wait-ForUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Attempts = 30,
        [int]$DelaySeconds = 5
    )
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
            if ($response.StatusCode -eq 200) {
                Write-Host "Ready: $Url" -ForegroundColor Green
                return
            }
        } catch {
            Write-Host "Waiting for deployment ($attempt/$Attempts): $Url" -ForegroundColor DarkYellow
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    throw "Deployment did not become ready: $Url"
}

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if (-not (Test-Path '.catalystrc') -or -not (Test-Path 'catalyst.json')) {
    throw 'Catalyst local project metadata is missing. Run this only from your already initialized PRAHARI Catalyst project.'
}
if (-not (Get-Command catalyst -ErrorAction SilentlyContinue)) {
    throw 'Catalyst CLI is not installed or is not available in PATH.'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is not installed or is not available in PATH.'
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python is not installed or is not available in PATH.'
}

Write-Host '[1/5] Building the PRAHARI frontend...' -ForegroundColor Cyan
Push-Location 'frontend'
try {
    Invoke-CheckedCommand npm install
    Invoke-CheckedCommand npm run build
} finally {
    Pop-Location
}

Write-Host '[2/5] Preparing the Catalyst Basic Web Client...' -ForegroundColor Cyan
if (Test-Path 'client') {
    Get-ChildItem 'client' -Force | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path 'client' | Out-Null
}
Copy-Item -Path 'frontend\dist\*' -Destination 'client' -Recurse -Force
$ClientPackage = @{
    name = 'prahari-frontend'
    version = '1.0.0'
    homepage = '.'
    stack = 'developer'
} | ConvertTo-Json -Compress
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path $RepoRoot 'client\client-package.json'),
    $ClientPackage,
    $Utf8NoBom
)

if (-not $SkipDependencyBundle) {
    Write-Host '[3/5] Creating a clean Linux/Python 3.11 dependency bundle...' -ForegroundColor Cyan
    if (Test-Path 'backend\vendor') {
        Remove-Item 'backend\vendor' -Recurse -Force
    }
    New-Item -ItemType Directory -Path 'backend\vendor' | Out-Null
    Invoke-CheckedCommand python -m pip install -r 'backend\requirements.txt' `
        --platform manylinux2014_x86_64 `
        --python-version 3.11 `
        --implementation cp `
        --only-binary=:all: `
        --target 'backend\vendor' `
        --upgrade
} else {
    Write-Host '[3/5] Reusing backend/vendor dependency bundle...' -ForegroundColor Cyan
    if (-not (Test-Path 'backend\vendor\fastapi')) {
        throw 'SkipDependencyBundle was requested, but backend/vendor is incomplete.'
    }
}

Write-Host '[4/5] Deploying frontend and AppSail to Catalyst development...' -ForegroundColor Cyan
Invoke-CheckedCommand catalyst deploy

Write-Host '[5/5] Waiting for Catalyst and running every smoke test...' -ForegroundColor Cyan
Wait-ForUrl "$DevelopmentBackend/api/v1/status"
Wait-ForUrl $DevelopmentFrontend
Invoke-CheckedCommand python 'backend\smoke_test.py' `
    --base-url $DevelopmentBackend `
    --frontend-url $DevelopmentFrontend

Write-Host ''
Write-Host 'DEVELOPMENT DEPLOYMENT PASSED ALL TESTS.' -ForegroundColor Green
Write-Host 'Only now promote this exact deployment from Catalyst Console to Production.' -ForegroundColor Green
