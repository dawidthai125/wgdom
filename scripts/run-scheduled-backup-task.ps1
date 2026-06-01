# Wrapper dla Task Scheduler — log + backup.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("local", "email")]
  [string]$Mode
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

$LogDir = Join-Path $RepoRoot "backups\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir "scheduled-$Mode.log"

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value "`n=== $ts mode=$Mode ==="

& node scripts/run-scheduled-backup.mjs --mode $Mode 2>&1 | Tee-Object -FilePath $LogFile -Append
exit $LASTEXITCODE
