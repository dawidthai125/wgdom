# Awaryjne wgranie backupu bezpośrednio do tabeli kv_store (service_role).
# Wymaga: tabela kv_store_0afb8820 utworzona w SQL Editor.
# Użycie:
#   .\scripts\seed-kv-direct.ps1 -BackupPath "C:\Users\dawid\Desktop\backup-2026-05-31.json"

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ProjectId = "bdpygdvfgbggermvqtys",
  [string]$ServiceRole = $env:SUPABASE_SERVICE_ROLE_KEY
)

if (-not $ServiceRole) {
  throw "Ustaw SUPABASE_SERVICE_ROLE_KEY lub podaj -ServiceRole"
}

$ErrorActionPreference = "Stop"
$data = Get-Content $BackupPath -Raw | ConvertFrom-Json
$keys = @(
  "kw-directory", "kw-week-employees", "kw-archive", "kw-weekFrom", "kw-weekTo",
  "kw-jobs", "kw-contacts", "kw-tenders-pipeline", "kw-tenders-company-profile",
  "kw-tenders-custom-keywords", "kw-admin-passwords", "kw-admin-users-config"
)

$uri = "https://$ProjectId.supabase.co/rest/v1/kv_store_0afb8820"
$headers = @{
  Authorization = "Bearer $ServiceRole"
  apikey = $ServiceRole
  "Content-Type" = "application/json"
  Prefer = "resolution=merge-duplicates"
}

foreach ($k in $keys) {
  if ($data.PSObject.Properties.Name -notcontains $k) { continue }
  $row = @{ key = $k; value = $data.$k } | ConvertTo-Json -Depth 100 -Compress
  Write-Host "Upsert $k ..."
  try {
    Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $row
    Write-Host "  OK"
  } catch {
    Write-Host "  BLAD:" $_.Exception.Message
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    exit 1
  }
}

Write-Host "Gotowe. Sprawdz batch-get po wdrozeniu Edge Function."
