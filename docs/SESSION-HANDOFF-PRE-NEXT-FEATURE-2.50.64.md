# SESSION HANDOFF — Pre Next Feature Stream v2.50.64

> **★ START DLA AGENTÓW AI** — przeczytaj ten plik **zaraz po** [`CURRENT-TASK.md`](../CURRENT-TASK.md), jeśli wznawiasz pracę po backupie / przed nowym streamem feature.  
> **Data:** 2026-06-10 · **Hasło:** „kontynuuj WGDOM”

---

## 1. TL;DR — gdzie jesteśmy

```text
Prod UI:           2.50.64
Prod commit:       c7bc58f
Git tag backup:    pre-next-feature-2.50.64
Deploy Vercel:     BxMBS2SFGiDxZmkHmwndVpr5RLin
Status:            RELEASED · STABLE · READY FOR NEXT FEATURE STREAM
Seria 20.5Z:       COMPLETE (+ 5A/5B wdrożone)
Pre-feature backup: COMPLETE (lokalnie + tag GitHub)
Storage backup:    COMPLETE (100% bucketa)
Email backup:      PARTIAL (rdzeń PASS, pełny ZIP > limit Resend)
```

**Następny krok dla produktu:** dowolny **nowy stream feature** — baseline jest zabezpieczony.

---

## 2. Co zrobiliśmy w tej sesji (kolejność)

| # | Etap | Typ | Wynik |
|---|------|-----|--------|
| 1 | **20.5Z.5A** — badge menu Roboty | UI | `countActiveJobsForNavBadge()` = W toku + Do odbioru (nie pending photos) |
| 2 | **20.5Z.5B** — alert Pulpit handover | UI | „Roboty do odbioru” w „Uwaga dziś” (`jobMatchesListFilter` handover) |
| 3 | **Release** push `main` → Vercel | deploy | v2.50.64 na prod |
| 4 | **Pre-feature backup** | archiwum | `WGDOM-BACKUP-2.50.64` + tag `pre-next-feature-2.50.64` |
| 5 | **Backup hardening** — storage-full | archiwum | 140/140 obiektów, 54.15 MB |
| 6 | **Backup hardening** — email | archiwum | rdzeń KV+docs na `dawid.thai@int.pl` |
| 7 | **Audyt kompletności storage** | read-only | **STORAGE BACKUP COMPLETE 100%** |

**Bez zmian:** sync/KV merge, Edge Functions (poza istniejącymi endpointami mail), model danych.

---

## 3. Sprinty 20.5Z.5A / 20.5Z.5B (wdrożone)

### 20.5Z.5A — Admin Navigation Jobs Badge (v2.50.63 → w bundle 2.50.64)

| Pole | Wartość |
|------|---------|
| **Problem** | Badge „Roboty” liczył pending photos / legacy `in_progress` |
| **Fix** | `countActiveJobsForNavBadge()` w `job-list-ops.ts` |
| **Pliki** | `src/lib/job-list-ops.ts`, `src/app/admin/admin-nav.ts` |
| **Smoke** | `npx vite-node scripts/smoke-test-admin-nav-jobs-badge-20.5z5a.mjs` (8/8) |

### 20.5Z.5B — Dashboard Handover Alert (v2.50.64)

| Pole | Wartość |
|------|---------|
| **Problem** | Brak jawnego alertu „Do odbioru” na Pulpicie |
| **Fix** | Blok w `DashboardView.tsx`; **nie** w `attentionCount` (nakładanie z `jobsMissingDocs`) |
| **SSOT** | `jobMatchesListFilter(j, "handover")` |
| **Pliki** | `src/app/DashboardView.tsx` |
| **Smoke** | `npx vite-node scripts/smoke-test-dashboard-handover-alert-20.5z5b.mjs` (11/11) |

**Commit release:** `c7bc58f` — `release(ui): Jobs 2.0 navigation and dashboard alignment (20.5Z.5A/5B)`

---

## 4. Pre-feature backup — artefakty

> **Lokalizacja (poza repo):** `C:\Users\dawid\Downloads\` — **nie commitować** plików z hashami adminów.

| Artefakt | Ścieżka | Rozmiar |
|----------|---------|---------|
| Folder backupu | `WGDOM-BACKUP-2.50.64/` | ~63 MB (+ storage-full) |
| ZIP pełny | `WGDOM-BACKUP-2.50.64.zip` | 52.8 MB |
| ZIP storage binaria | `WGDOM-BACKUP-2.50.64-storage-full.zip` | 53.7 MB |
| ZIP email (rdzeń) | `WGDOM-BACKUP-2.50.64-email-core.zip` | 1.9 MB |

**Git tag:** `pre-next-feature-2.50.64` → `c7bc58f`

```bash
git fetch origin tag pre-next-feature-2.50.64
git checkout pre-next-feature-2.50.64
```

### Skrypty (w repo)

| Skrypt | Cel |
|--------|-----|
| `scripts/run-pre-feature-backup-2.50.64.mjs` | Pełny backup: KV, schema, edge snapshot, repo bundle, docs |
| `scripts/run-storage-full-backup-2.50.64.mjs` | Pobranie wszystkich binariów z bucketa |
| `scripts/send-pre-feature-backup-email-2.50.64.mjs --core-only` | Mail z rdzeniem (pod limit Resend) |

**Raporty w repo:**

- [`BACKUP-REPORT-2.50.64.md`](BACKUP-REPORT-2.50.64.md)
- [`AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`](AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md)

### Uwagi operacyjne

- **KV zawiera hashe adminów** — `kv-data.json` / `kv_store_table_dump.json` **nie commitować**.
- **Email pełny ZIP (52.8 MB)** — FAIL (Resend max 40 MB po Base64). Wysłano `email-core.zip` + ścieżki w treści maila.
- **Storage:** jedyny bucket `make-0afb8820-photos` — 140 obiektów, 100% w backupie.

---

## 5. Storage — mapa dla agentów

| Bucket | Obiekty | Rozmiar | Używany przez |
|--------|---------|---------|---------------|
| `make-0afb8820-photos` (public) | 140 | 54.15 MB | Cały projekt (jedyny bucket) |

**Ścieżki:**

```text
jobs/{jobId}/{filename}     — zdjęcia, PDF, załączniki, paragony, dowody billing
tenders/{tenderId}/...      — dokumenty przetargów
tenders/{tenderId}/external/... — discover zewnętrzny
```

**Frontend nie woła `supabase.storage` bezpośrednio** — wszystko przez Edge: `/storage-upload`, `/storage-delete`, `/kosztorys-preview`.

Szczegóły: [`AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`](AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md)

---

## 6. Co NIE zmieniać bez polecenia

| Obszar | Powód |
|--------|--------|
| Sync / merge (`cloud-sync.ts`) | Stabilność KV — incydenty 2026-06 |
| Edge Functions | Backup baseline; Resend tylko na Supabase secrets |
| `jobFiles[]` / `jobAttachments[]` / media-separation | Trzy warstwy plików — zamknięte sprinty |
| Payroll carry 20.1A–20.1B | MODEL A, saved ≠ closed |
| Model scrollu 2.50.20 | Desktop layout CLOSED |
| Seria 20.5Z E2E/PWA | Gates CI — tylko rozszerzać testami |

---

## 7. Szybki start — kolejność czytania

```text
1. CURRENT-TASK.md
2. TEN PLIK (SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md)
3. docs/PROJECT-HANDOFF.md
4. docs/PROJECT-HANDOFF-FINAL-20.5Z.md        ← seria 20.5Z zamknięta
5. docs/BACKUP-REPORT-2.50.64.md              ← backup baseline
6. docs/ARCHITECTURE.md                       ← pełna architektura
7. AGENTS.md                                  ← zasady pracy
```

---

## 8. Komendy przydatne

```bash
# Smoke 5A/5B
npx vite-node scripts/smoke-test-admin-nav-jobs-badge-20.5z5a.mjs
npx vite-node scripts/smoke-test-dashboard-handover-alert-20.5z5b.mjs

# E2E (po build)
npm run build && npm run preview
npm run test:e2e:happy
npm run test:e2e:version

# Powtórzenie backupu (wymaga .env: ANON_KEY + SERVICE_ROLE)
node scripts/run-pre-feature-backup-2.50.64.mjs
node scripts/run-storage-full-backup-2.50.64.mjs
node scripts/send-pre-feature-backup-email-2.50.64.mjs --core-only
```

---

## 9. Werdykt

```text
PRE-NEXT-FEATURE BASELINE: SECURED
STORAGE BACKUP:            COMPLETE (100%)
READY FOR NEXT FEATURE STREAM: YES
```

---

*Handoff: 2026-06-10 · Baseline v2.50.64 · commit c7bc58f*
