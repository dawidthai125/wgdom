# Przywraca backup JSON do nowego projektu Supabase (batch-set).
# Użycie:
#   .\scripts\restore-backup-to-supabase.ps1 -BackupPath "C:\Users\dawid\Desktop\backup-2026-05-31.json" -AnonKey "eyJ..."
#
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [Parameter(Mandatory = $true)]
  [string]$AnonKey,
  [string]$ProjectId = "bdpygdvfgbggermvqtys",
  [string]$FunctionSlug = "make-server-0afb8820"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "Brak pliku: $BackupPath"
}

$data = Get-Content $BackupPath -Raw | ConvertFrom-Json
$dataKeys = @(
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-contacts",
  "kw-tenders-pipeline",
  "kw-tenders-company-profile",
  "kw-tenders-custom-keywords"
)
$adminKeys = @("kw-admin-passwords", "kw-admin-users-config")

$keys = @()
$values = @()
foreach ($k in ($dataKeys + $adminKeys)) {
  if ($data.PSObject.Properties.Name -contains $k) {
    $keys += $k
    $values += $data.$k
  }
}

Write-Host "Klucze do wyslania: $($keys -join ', ')"
Write-Host "Jobs: $(@($data.'kw-jobs').Count), Directory: $(@($data.'kw-directory').Count), Archive weeks: $(@($data.'kw-archive').Count)"

$uri = "https://$ProjectId.supabase.co/functions/v1/$FunctionSlug/batch-set"
$body = @{
  keys = $keys
  values = $values
  replaceJobsKeys = @("kw-jobs")
  replaceDirectoryKeys = @("kw-directory")
} | ConvertTo-Json -Depth 100 -Compress

$headers = @{
  Authorization = "Bearer $AnonKey"
  apikey = $AnonKey
  "Content-Type" = "application/json"
}

Write-Host "Wysylam do $uri ..."
try {
  $resp = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
  Write-Host "OK:" ($resp | ConvertTo-Json -Compress)
} catch {
  Write-Host "BLAD:" $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
