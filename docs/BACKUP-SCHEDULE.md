# Harmonogram backupu W&G DOM

## Kiedy co leci

| Kiedy | Gdzie | Co |
|-------|--------|-----|
| **Piątek 18:00** (Warszawa) | Email | JSON z danymi firmy (+ kopie `-prev`) |
| **Niedziela 03:00** (Warszawa) | Dysk lokalny + GitHub Artifact | Pełny backup KV (wszystkie klucze) |

## Lokalnie (Windows)

Jednorazowa instalacja zadań:

```powershell
cd C:\Users\dawid\Downloads\WGDOM1
.\scripts\setup-local-backup-tasks.ps1
```

Kopie niedzielne: `backups/auto/wgdom-full-*` (zostaje **12** ostatnich).  
Logi: `backups/logs/`.

Test ręczny:

```powershell
node scripts/run-scheduled-backup.mjs --mode email
node scripts/run-scheduled-backup.mjs --mode local
```

## GitHub Actions (chmura CI)

Workflow: `.github/workflows/scheduled-backup.yml`

**Sekret wymagany:** `VITE_SUPABASE_ANON_KEY`  
**Opcjonalny:** `BACKUP_EMAIL`

Niedzielne backupy: GitHub → repo → **Actions** → run → **Artifacts** (90 dni).

## Email (piątek)

Wysyłka przez Edge Function `send-backup-email` (Resend).  
Adres odbiorcy: sekret `BACKUP_EMAIL` na Supabase lub domyślnie `dawid.thai@int.pl`.

## Przywracanie

```powershell
.\scripts\restore-backup-to-supabase.ps1 `
  -BackupPath "C:\Users\dawid\Downloads\WGDOM1\backups\auto\wgdom-full-...\kv-data.json" `
  -AnonKey "<anon z Supabase>"
```

**Nie commituj** plików backupu — zawierają hasła administratorów.
