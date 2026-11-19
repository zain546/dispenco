<#
.SYNOPSIS
  Dispenco — Pull Database Backup from Oracle VM to Local Windows PC (Copy #3 in 3-2-1 Rule)

.DESCRIPTION
  Connects to the Oracle Cloud Ubuntu VM over SSH, triggers a fresh PostgreSQL
  backup via `backup-db.sh` (or falls back to direct `docker exec pg_dump` if the
  server script isn't deployed yet), downloads the latest backup + checksum into
  `f:\dispenco\backups\`, and prunes local copies older than 30 days.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\backup\pull-backup-to-pc.ps1
#>

param(
  [string]$ServerUser = "ubuntu",
  [string]$ServerHost = "84.12.181.80",
  [string]$SshKeyPath = (Join-Path (Resolve-Path "$PSScriptRoot\..\..").Path "oracle.key"),
  [string]$LocalBackupDir = (Join-Path (Resolve-Path "$PSScriptRoot\..\..").Path "backups"),
  [int]$KeepDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKeyPath)) {
  throw "SSH key not found at $SshKeyPath"
}

if (-not (Test-Path $LocalBackupDir)) {
  New-Item -ItemType Directory -Path $LocalBackupDir | Out-Null
}

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
$LocalDumpPath = Join-Path $LocalBackupDir "dispenco_prod_$Timestamp.dump"

Write-Host "[$Timestamp] Connecting to $ServerUser@$ServerHost to create and download PostgreSQL backup..." -ForegroundColor Cyan

# Stream custom-format pg_dump directly over SSH into local file (works immediately even before server cron setup)
$RemoteCmd = @'
set -e
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' /home/ubuntu/dispenco/.env 2>/dev/null | sed 's/\r$//') || true
DB_USER="${POSTGRES_USER:-dispenco_user}"
DB_NAME="${POSTGRES_DB:-dispenco_db}"
sudo docker exec -i dispenco_postgres_prod pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-acl | base64 -w 0
'@

$Base64Dump = ssh -i $SshKeyPath -o StrictHostKeyChecking=accept-new "$ServerUser@$ServerHost" $RemoteCmd
if ([string]::IsNullOrWhiteSpace($Base64Dump)) {
  throw "Empty response from remote pg_dump! Check SSH / Docker status."
}
[System.IO.File]::WriteAllBytes($LocalDumpPath, [System.Convert]::FromBase64String($Base64Dump.Trim()))

if (-not (Test-Path $LocalDumpPath) -or ((Get-Item $LocalDumpPath).Length -lt 1024)) {
  Remove-Item $LocalDumpPath -ErrorAction SilentlyContinue
  throw "Downloaded backup file is empty or too small! Check SSH / Docker status."
}

# Compute SHA-256 hash on Windows
$Hash = (Get-FileHash -Path $LocalDumpPath -Algorithm SHA256).Hash.ToLower()
"$Hash  $(Split-Path $LocalDumpPath -Leaf)" | Set-Content -Path "$LocalDumpPath.sha256" -Encoding ASCII

$SizeKB = [math]::Round((Get-Item $LocalDumpPath).Length / 1KB, 1)
Write-Host "Backup saved: $LocalDumpPath ($SizeKB KB, SHA256: $Hash)" -ForegroundColor Green

# Prune local backups older than $KeepDays
Get-ChildItem -Path $LocalBackupDir -File | Where-Object {
  $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays)
} | ForEach-Object {
  Write-Host "Pruning old local backup: $($_.Name)" -ForegroundColor DarkGray
  Remove-Item $_.FullName -Force
}
