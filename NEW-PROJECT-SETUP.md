# Nowy projekt Supabase — szybka konfiguracja

**Project ref:** `bdpygdvfgbggermvqtys`  
**URL:** https://bdpygdvfgbggermvqtys.supabase.co

## 1. Tabela w bazie (jednorazowo)

1. [Dashboard](https://supabase.com/dashboard/project/bdpygdvfgbggermvqtys) → **SQL Editor**
2. Wklej zawartość pliku `supabase/migrations/001_kv_store.sql` → **Run**

## 2. Edge Function (backend)

### Opcja A — GitHub Actions (zalecane)

1. GitHub → repo **wgdom** → **Settings** → **Secrets** → `SUPABASE_ACCESS_TOKEN` (token z [account/tokens](https://supabase.com/dashboard/account/tokens))
2. Push zmian na `main` (workflow ma już `--project-ref bdpygdvfgbggermvqtys`)
3. **Actions** → **Deploy Supabase Edge Functions** → **Run workflow**

### Opcja B — ręcznie w Dashboard

1. **Edge Functions** → **Deploy a new function** → nazwa: `make-server-0afb8820`
2. Wklej `supabase/functions/make-server-0afb8820/index.tsx` + dodaj plik `kv_store.tsx`
3. **Deploy**

### Sekrety (opcjonalnie, dla emaili/SMS)

Edge Functions → **Secrets**:

| Nazwa | Po co |
|-------|--------|
| `RESEND_API_KEY` | Email z robót, backupy |
| `SMSAPI_TOKEN` | SMS pilne |

## 3. Klucz anon (frontend)

1. Supabase → **Project Settings** → **API**
2. Skopiuj **`anon` `public`** (JWT `eyJ...`)

### Lokalnie (`.env`)

```
VITE_SUPABASE_PROJECT_ID=bdpygdvfgbggermvqtys
VITE_SUPABASE_ANON_KEY=eyJ...twój_klucz...
VITE_SUPABASE_FUNCTION_SLUG=make-server-0afb8820
```

### Vercel (wgdom.fun)

**Settings** → **Environment Variables** (Production + Preview):

- `VITE_SUPABASE_PROJECT_ID` = `bdpygdvfgbggermvqtys`
- `VITE_SUPABASE_ANON_KEY` = klucz anon
- `VITE_SUPABASE_FUNCTION_SLUG` = `make-server-0afb8820`

→ **Redeploy** po zapisaniu.

## 4. Test backendu

```powershell
$anon = "TWOJ_ANON_KEY"
Invoke-RestMethod -Uri "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/health" -Headers @{ Authorization = "Bearer $anon"; apikey = $anon }
```

Oczekiwane: `status: ok`

## 5. Przywrócenie danych z backupu

Najlepszy plik: `backup-2026-05-31.json` (mobile) — 15 pracowników, 9 robót, archiwum 2 tygodni, przetargi.

### Opcja A — skrypt PowerShell

```powershell
cd WGDOM1
.\scripts\restore-backup-to-supabase.ps1 `
  -BackupPath "C:\Users\dawid\Desktop\backup-2026-05-31.json" `
  -AnonKey "TWOJ_ANON_KEY"
```

### Opcja B — przez aplikację

1. Ustaw zmienne w Vercel + redeploy (krok 3)
2. Wejdź na wgdom.fun → zaloguj → **Importuj backup** (górny pasek)
3. Wybierz `backup-2026-05-31.json` — import zapisze też do chmury

## 6. Co jest w backupie mobile (31.05)

| Sekcja | Ilość |
|--------|-------|
| Kartoteka | 15 osób |
| Roboty | 9 |
| Archiwum | 2 tygodnie (25–30.05: 13 osób, wszyscy rozliczeni) |
| Przetargi | 21 |
| Bieżący tydzień | pusty (normalne po rollover w niedzielę 20:00) |

Stary projekt `kchwyjlnkdlymwvsnfiu` jest niedostępny (DNS) — ten backup to najlepsze źródło odzyskania danych.
