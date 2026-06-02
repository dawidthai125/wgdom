# Rejestruje zadania Windows Task Scheduler - backup WG DOM.
#
#   .\scripts\setup-local-backup-tasks.ps1
#   .\scripts\setup-local-backup-tasks.ps1 -Remove

param(
  [switch]$Remove
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodeExe) { throw "Nie znaleziono node.exe w PATH" }

$tasks = @(
  @{
    Name = "WGDOM Backup Email Piatek 1800"
    Mode = "email"
    Days = "Friday"
    Time = "18:00"
  },
  @{
    Name = "WGDOM Backup Lokalny Niedziela 0300"
    Mode = "local"
    Days = "Sunday"
    Time = "03:00"
  }
)

function Unregister-WgdomTask([string]$Name) {
  $existing = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false
    Write-Host "Usunieto: $Name"
  }
}

if ($Remove) {
  foreach ($t in $tasks) { Unregister-WgdomTask $t.Name }
  Write-Host "Gotowe - zadania backupu usuniete."
  exit 0
}

$LogDir = Join-Path $RepoRoot "backups\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

foreach ($t in $tasks) {
  Unregister-WgdomTask $t.Name

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$RepoRoot\scripts\run-scheduled-backup-task.ps1`" -Mode $($t.Mode)" `
    -WorkingDirectory $RepoRoot

  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $t.Days -At $t.Time
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

  Register-ScheduledTask `
    -TaskName $t.Name `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User $env:USERNAME `
    -RunLevel Limited | Out-Null

  # Register-ScheduledTask czasem ignoruje ustawienia baterii — wymuszamy ponownie.
  Set-ScheduledTask -TaskName $t.Name -Settings $settings | Out-Null

  Write-Host "Utworzono: $($t.Name) - $($t.Days) $($t.Time)"
}

Write-Host ""
Write-Host "Harmonogram lokalny:"
Write-Host "  Piatek   18:00 - email"
Write-Host "  Niedziela 03:00 - backups\auto\ (ostatnie 12 kopii)"
Write-Host "  Logi: backups\logs\"
Write-Host ""
Write-Host "Test reczny:"
Write-Host '  node scripts/run-scheduled-backup.mjs --mode email'
Write-Host '  node scripts/run-scheduled-backup.mjs --mode local'
