# BACKUP REPORT — Pre Feature Stream v2.50.64

> **Data backupu:** 2026-06-10 (UTC ~08:52)  
> **Tryb:** PRE FEATURE STREAM BACKUP · **BACKUP ONLY**

---

## Baseline

| Pole | Wartość |
|------|---------|
| **Version** | **2.50.64** |
| **Commit** | **`c7bc58f`** (`c7bc58f5ac850a233a87969aba4f2d2bb041e980`) |
| **Deploy** | Vercel **`BxMBS2SFGiDxZmkHmwndVpr5RLin`** |
| **Prod** | https://www.wgdom.fun · https://www.wgdom.online |
| **Supabase project** | `bdpygdvfgbggermvqtys` |

---

## Werdykt

```text
BACKUP HARDENING PARTIAL
```

Wszystkie komponenty lokalne + storage-full: **PASS**.  
Email: **PASS** (rdzeń KV+docs); pełny ZIP 52.8 MB — **FAIL** (limit Resend 40 MB po Base64).

---

## 1. GitHub

| Element | Status | Szczegóły |
|---------|--------|-----------|
| **Tag** | **PASS** | `pre-next-feature-2.50.64` → `c7bc58f` |
| **Push tag** | **PASS** | `origin` · `343871e1f0bd1036232676ce101a79db0c3dc8cc` |
| **Git bundle** | **PASS** | `repo/wgdom-c7bc58f.bundle` (19.2 MB) |
| **Git archive** | **PASS** | `repo/wgdom-c7bc58f-archive.zip` (31.9 MB) |

```bash
git fetch origin tag pre-next-feature-2.50.64
git checkout pre-next-feature-2.50.64
```

---

## 2. Supabase

| Element | Status | Plik / metoda |
|---------|--------|----------------|
| **KV batch-get (app data)** | **PASS** | `database/kv-data.json` (2.4 MB, 35 kluczy, 14 jobs) |
| **KV summary** | **PASS** | `database/kv-summary.json` |
| **Database dump (kv_store)** | **PASS** | `database/kv_store_table_dump.json` (9.5 MB, 57 wierszy) via REST |
| **Schema snapshot** | **PASS** | `database/migrations/001_kv_store.sql` + `database/config.toml` |
| **Edge functions** | **PASS** | `database/edge-functions/make-server-0afb8820/` |
| **Storage manifest** | **PASS** | `storage/storage-manifest.json` (140 obiektów) |
| **Storage full (binaria)** | **PASS** | `storage-full/` + `WGDOM-BACKUP-2.50.64-storage-full.zip` (53.7 MB) |
| **pg_dump / Supabase CLI** | **SKIP** | Brak `pg_dump`; CLI bez login — zastąpione REST `kv_store_0afb8820` + `batch-get` |

**Uwaga:** `kv-data.json` i `kv_store_table_dump.json` zawierają **hasła adminów (hash)** — **nie commitować** do repo.

---

## 3. Dokumentacja (snapshot)

| Plik | Status |
|------|--------|
| `docs/CURRENT-TASK.md` | **PASS** |
| `docs/CHANGELOG.md` | **PASS** |
| `docs/PROJECT-HANDOFF-FINAL-20.5Z.md` | **PASS** |
| `docs/ARCHITECTURE.md` | **PASS** |

---

## 4. Archiwum lokalne

| Ścieżka | Rozmiar |
|---------|---------|
| **Folder** | `C:\Users\dawid\Downloads\WGDOM-BACKUP-2.50.64` |
| **ZIP (pełny)** | `C:\Users\dawid\Downloads\WGDOM-BACKUP-2.50.64.zip` (**52.8 MB** / 55 332 613 B) |
| **ZIP (storage-full)** | `C:\Users\dawid\Downloads\WGDOM-BACKUP-2.50.64-storage-full.zip` (**53.7 MB** / 56 326 165 B) |
| **ZIP (email-core)** | `C:\Users\dawid\Downloads\WGDOM-BACKUP-2.50.64-email-core.zip` (**1.9 MB** — wysłany mailem) |

### Struktura

```text
WGDOM-BACKUP-2.50.64/
├── manifest.json
├── repo/
│   ├── git-meta.json
│   ├── wgdom-c7bc58f.bundle
│   └── wgdom-c7bc58f-archive.zip
├── database/
│   ├── kv-data.json
│   ├── kv-summary.json
│   ├── kv_store_table_dump.json
│   ├── config.toml
│   ├── migrations/001_kv_store.sql
│   ├── edge-functions-manifest.json
│   └── edge-functions/make-server-0afb8820/
├── storage/
│   └── storage-manifest.json
└── docs/
    ├── CURRENT-TASK.md
    ├── CHANGELOG.md
    ├── PROJECT-HANDOFF-FINAL-20.5Z.md
    └── ARCHITECTURE.md
```

### Rozmiary folderów

| Folder | Rozmiar |
|--------|---------|
| `repo/` | 51.07 MB |
| `database/` | 12.01 MB |
| `storage/` | 67.9 KB |
| `docs/` | 121.6 KB |
| **Razem (folder)** | **63.27 MB** |

---

## 5. Skrypty backupu

```bash
node scripts/run-pre-feature-backup-2.50.64.mjs
node scripts/run-storage-full-backup-2.50.64.mjs
node scripts/send-pre-feature-backup-email-2.50.64.mjs --core-only
```

---

## 6. Backup Hardening (email + storage-full)

### EMAIL

| Pole | Wartość |
|------|---------|
| **Werdykt** | **PASS** (rdzeń) · pełny ZIP **FAIL** |
| **Recipient** | `dawid.thai@int.pl` |
| **Message ID** | n/d — `send-payroll-email` zwraca tylko `{ok:true}` |
| **Delivery** | **PASS** (HTTP 200) |
| **Temat** | `WGDOM Backup v2.50.64` |
| **Załącznik wysłany** | `WGDOM-BACKUP-2.50.64-email-core.zip` (1.9 MB) |
| **Pełny ZIP** | `WGDOM-BACKUP-2.50.64.zip` (52.8 MB) — przekracza limit Resend **40 MB po Base64**; próba → `HeadersTimeoutError` |

Infrastruktura: `POST /send-payroll-email` (Resend, sekret `RESEND_API_KEY` na Supabase). Bez zmian Edge Functions.

### STORAGE FULL

| Pole | Wartość |
|------|---------|
| **Werdykt** | **PASS** |
| **Buckety** | 1 (`make-0afb8820-photos`) |
| **Obiekty** | 140 |
| **Rozmiar** | 54.15 MB (56 778 701 B) |
| **Pobrane** | 140/140, błędy: 0 |
| **Ścieżka** | `WGDOM-BACKUP-2.50.64/storage-full/` |
| **ZIP** | `WGDOM-BACKUP-2.50.64-storage-full.zip` |

Audyt: `WGDOM-BACKUP-2.50.64/storage-audit-2.50.64.json`

**Audyt kompletności (read-only):** [`AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`](AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md) — **STORAGE BACKUP COMPLETE 100%**

---

## Status komponentów (PASS/FAIL)

| ID | Status |
|----|--------|
| `github_tag` | **PASS** |
| `github_tag_push` | **PASS** |
| `git_bundle` | **PASS** |
| `git_archive` | **PASS** |
| `kv_batch_get` | **PASS** |
| `database_kv_store` | **PASS** |
| `database_schema` | **PASS** |
| `edge_functions` | **PASS** |
| `storage_manifest` | **PASS** |
| `storage_binary_export` | **PASS** |
| `email_backup_core` | **PASS** |
| `email_backup_full_zip` | **FAIL** (Resend 40 MB) |
| `docs_snapshot` | **PASS** |
| `zip_archive` | **PASS** |

---

## Przywracanie (skrót)

| Co | Jak |
|----|-----|
| **Kod** | `git clone` z bundle lub checkout tag `pre-next-feature-2.50.64` |
| **Dane KV** | `scripts/restore-backup-to-supabase.ps1` + `database/kv-data.json` |
| **Edge** | `database/edge-functions/` ↔ deploy Supabase GHA |

---

## Następny krok

```text
READY FOR NEXT FEATURE STREAM
```

Baseline zabezpieczony: **v2.50.64** · **`c7bc58f`** · tag **`pre-next-feature-2.50.64`**

---

*Raport wygenerowany: 2026-06-10 · Sprint: PRE FEATURE STREAM BACKUP + HARDENING (email + storage-full)*
