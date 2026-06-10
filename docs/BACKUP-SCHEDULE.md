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

## Pre-feature backup (punkt kontrolny przed nowym streamem)

Przed rozpoczęciem nowego streamu feature wykonano pełny backup **v2.50.64** (2026-06-10):

| Element | Skrypt / artefakt |
|---------|-------------------|
| Pełny backup KV + repo + docs | `node scripts/run-pre-feature-backup-2.50.64.mjs` |
| Binaria storage (100% bucketa) | `node scripts/run-storage-full-backup-2.50.64.mjs` |
| Email rdzeń (pod limit Resend) | `node scripts/send-pre-feature-backup-email-2.50.64.mjs --core-only` |
| Git tag | `pre-next-feature-2.50.64` → commit `c7bc58f` |

**Raporty:** [`BACKUP-REPORT-2.50.64.md`](BACKUP-REPORT-2.50.64.md) · [`SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md)

**Uwaga:** artefakty lokalne (`WGDOM-BACKUP-2.50.64*`) zawierają hashe adminów — **nie commitować** do repo.

## Przywracanie

```powershell
.\scripts\restore-backup-to-supabase.ps1 `
  -BackupPath "C:\Users\dawid\Downloads\WGDOM1\backups\auto\wgdom-full-...\kv-data.json" `
  -AnonKey "<anon z Supabase>"
```

**Nie commituj** plików backupu — zawierają hasła administratorów.
