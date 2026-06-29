# W&G DOM — incydenty i stabilizacja (czerwiec 2026)

> **Dla programistów:** przeczytaj ten plik po `CURRENT-TASK.md`, jeśli pracujesz nad sync, payroll, adminami lub mediami.  
> **Produkcja:** https://www.wgdom.fun · **Supabase KV:** `bdpygdvfgbggermvqtys`  
> **Ostatnia aktualizacja:** 2026-06-29

---

## 0. P0 — Supabase `exceed_egress_quota` (2026-06-29) · **RESOLVED**

| Pole | Wartość |
|------|---------|
| **Status** | **RESOLVED** · **CLOSED** (2026-06-29) |
| **Objaw** | Toast „Nie udało się wysłać do chmury” + **`Failed to fetch`** (Lista Płac „Zapisz tydzień”, każdy auto-sync) |
| **RCA runtime** | Projekt `bdpygdvfgbggermvqtys` **restricted** — HTTP **402** `exceed_egress_quota` na bramce Supabase (Edge `batch-set` **nie** wykonany) |
| **Przeglądarka** | `net::ERR_FAILED` → brak `res.status` (nie mylić z Payroll Guard ani CORS) |
| **Egress (model)** | Dominacja pełnego **`batch-get`** w `runCloudSync` + `pullFromCloudAndMerge` (focus); wzrost `kw-archive` |
| **Fix ops** | **Supabase Pro** włączony — upgrade billing / usunięcie spend cap |
| **Weryfikacja prod** | **PASS** 2026-06-29 — `GET .../health` → 200 · `batch-get`/`batch-set` → 200 · brak 402 · „Zapisz tydzień” → sync OK |
| **Fix kod** | **Nie wymagany do odblokowania** · backlog P1: delta-sync / throttle focus (tylko na polecenie) |
| **SSOT audytu** | [`SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) · [`audit/P0-CLOUD-SYNC-EGRESS-AUDIT-REPORT.md`](../audit/P0-CLOUD-SYNC-EGRESS-AUDIT-REPORT.md) |

**Timeline:** incydent wykryty 2026-06-29 (audyt P0-A/B/C) → Supabase Pro → prod smoke PASS tego samego dnia.

**Nie implementuj refactoru sync bez wyraźnego briefu właściciela** (backlog architektury, nie incydent prod).

---

## 1. Skrót — co się stało (czerwiec 2026, wcześniejsze)

| Faza | Problem | Fix | Gdzie |
|------|---------|-----|-------|
| P6–P10 | Tydzień 01.06–06.06: 12 osób, **0 h** w UI (stale LS) | Root cause: `mergeWeekEmployees` + `pickDaysByTimestamps` | Analiza |
| P11 | CloudLoader bootstrap — lokal wygrywał nad chmurą przy 0 h | `applyBootstrapPayrollMerge()` | `main` @ `c9db032` |
| — | Push mógł wyczyścić payroll w chmurze | `wouldBlockPayrollShrink` (Payroll Guard) | `main` @ `db1d05a` |
| P13A/P17 | Uszkodzony hash Szymona w KV (`15622045…`) | Usunięcie klucza `szymon` z `kw-admin-passwords` | KV (ręcznie) |
| P15 | Po P13A hash wracał z localStorage | `mergeAdminPasswordOverrides` — chmura decyduje o kluczach | `main` @ `92d574e` |
| P18A/B | Pawel — błędny override w KV (`514a115c…`) | Usunięcie klucza `pawel` → hasło startowe `watroba1991!` | KV (ręcznie) |
| P14 | 74 martwe URL (`kchwyjlnkdlymwvsnfiu`) w `kw-jobs` | Cleanup KV (photos + sketch) | KV (ręcznie) |
| UI media | Martwe URL w UI mimo danych w KV | Gałąź `audit-before-cleanup` — filtry render | **NIE na `main`** |

---

## 2. Commity stabilności na `main` (bez bump wersji UI)

| Commit | Opis |
|--------|------|
| `bc871cb` | `sanitizeWeekEmployeesForTargetRange` — mismatch zakresu tygodnia |
| `db1d05a` | Payroll Guard — `wouldBlockPayrollShrink` |
| `c9db032` | P11 — `applyBootstrapPayrollMerge` w CloudLoader |
| `92d574e` | P15 — fix merge `kw-admin-passwords` + test `test-p15-admin-password-merge.mjs` |

**Deploy P15:** Vercel `dpl_FwTDN6MWGnVSZWvzhqD6qESYu4Rx` → https://www.wgdom.fun

---

## 3. Payroll — mechanizmy ochronne (kod)

### 3.1 Payroll Guard (`cloud-sync.ts`)

```text
wouldBlockPayrollShrink(cloud, outgoing)
  → blokuje push gdy activeDays lub totalHours spadnie >50% vs chmura
  → applyPayrollGuardBeforePush przed batch-set
```

Symulacja read-only: cloud 194 h, local 0 h → **BLOCKED**.

### 3.2 P11 bootstrap merge (`CloudLoader.tsx`)

```text
fetch chmura → mergeAllDataKeys → applyBootstrapPayrollMerge
  → jeśli chmura bogatsza (activeDays / richness) niż lokal → preferuj chmurę
```

Test: `npx vite-node scripts/test-p11-bootstrap-payroll.mjs`

### 3.3 Pułapka (nadal aktualna)

- `runCloudSync` / `pullFromCloudAndMerge` używa **React state** jako wejścia merge — ten sam wzorzec co bootstrap.
- **Logout/login nie uruchamia ponownie CloudLoader** (`useEffect []` tylko przy starcie).
- Po incydencie: **hard refresh** (Ctrl+F5) lub wyczyść LS na urządzeniu ze starym stanem.

---

## 4. Admin passwords (`kw-admin-passwords`)

### 4.1 Model

- Klucz KV: `kw-admin-passwords` — mapa `userId → hash SHA-256`
- Hash: `SHA256("wgdom-admin-account-v1:" + login + ":" + password)`
- **Brak klucza** = hasło startowe z `BUILTIN_ADMIN_ACCOUNTS` w `admin-auth.ts`
- **Obecność klucza** = override (custom hash)

### 4.2 P15 — poprawny merge (prod od `92d574e`)

```text
mergeAdminPasswordOverrides(local, cloud):
  1. Baza = klucze z chmury (normalizeAdminPasswordOverrides)
  2. Lokal nadpisuje TYLKO hash dla kluczy już w chmurze
  3. Klucz tylko w localStorage (np. usunięty szymon w KV) NIE wraca

shouldPushAdminPasswordOverridesOnBootstrap:
  → NIE pushuj gdy cloudKeys < localKeys
```

Test: `npx vite-node scripts/test-p15-admin-password-merge.mjs`

### 4.3 Hasła startowe (dokumentacja testów)

| userId | Login | Hasło startowe |
|--------|-------|----------------|
| dawid | Dawid | `Dawidneon1990!` |
| pawel | Pawel | `watroba1991!` |
| szymon | Szymon | `Inspektor2026!` |
| stanislaw | Stanislaw | `walek55is` |

Smoke login: `node scripts/verify-login-dawid-pawel-szymon.mjs`

### 4.4 Operacje KV (tylko na żądanie użytkownika)

- Usunięcie override: usuń klucz z `kw-admin-passwords` (nie zmieniaj `dawid`/`pawel` bez potrzeby)
- Snapshot przed operacją: `before-fix-szymon-final.json`, `before-reset-pawel.json` itd.
- **Nigdy** nie commituj snapshotów KV z hashami do `main` bez decyzji użytkownika

---

## 5. Media — martwe URL

### 5.1 Identyfikacja

Stary projekt Supabase: `kchwyjlnkdlymwvsnfiu`  
Aktualny: `bdpygdvfgbggermvqtys`  
Logika: `src/lib/storage-url.ts` → `isDeadStorageUrl()`

### 5.2 P14 — cleanup KV (dane)

- Tylko `kw-jobs`: usuń wpisy w `photos[]`, `inspectorPhotos[]`, `workerReports[].sketch`, `job.sketch` ze starym URL
- **Nie** dotykać payroll, adminów, archiwum, directory
- Audit read-only: `node scripts/audit-dead-media-kv.mjs`

### 5.3 UI Media Cleanup (gałąź `audit-before-cleanup`)

- **21 plików** `src/app/*`, `src/lib/*` — filtry `filterAvailablePhotos`, `JobPhotoImg`, `useMediaFailureRevision`
- **Tylko render/odczyt** — nie zapisuje do KV/localStorage
- `stripDeadMediaFromJob/Jobs` w `media-filter.ts` — **dead code** (niepodłączone do sync)
- **NIE wdrożone na prod** — commit lokalny `7eaf7ee` na gałęzi `audit-before-cleanup`

---

## 6. Backupy

| Kanał | Harmonogram | Pliki |
|-------|-------------|-------|
| GitHub Actions | Pt 18:00 email, Nd 03:00 artifact | `.github/workflows/scheduled-backup.yml` |
| Windows Task | Pt 18:00, Nd 03:00 | `scripts/setup-local-backup-tasks.ps1` |
| Lokalny | `backups/auto/wgdom-full-*` | `scripts/backup-lib.mjs` |

Ostatni znany dobry backup czerwca: `backups/auto/wgdom-full-2026-06-02T07-51-08` (12 emp, 194 h).

---

## 7. Audyty read-only (procedury)

| Audyt | Co sprawdza | Jak |
|-------|-------------|-----|
| STABILITY-AUDIT 1.0 | payroll, guard, admini, jobs, archiwum, backup | batch-get KV |
| HEALTH-CHECK 1.0 | skrót stanu prod | j.w. |
| P13B-VERIFY | czy `szymon` wrócił do KV | tylko `kw-admin-passwords` |
| P18A | hash Pawła vs hasła startowe | batch-get + SHA256 |

**Zasady audytu:** bez `batch-set`, restore, deploy, commit — tylko odczyt i raport.

---

## 8. Gałęzie git (stan 2026-06-02)

| Gałąź | HEAD | Zawartość |
|-------|------|-----------|
| `main` / `origin/main` | `92d574e` | P11 + P15 + guard — **prod** |
| `audit-before-cleanup` | `7eaf7ee` | snapshoty, skrypty diag, UI media — **nie prod** |

---

## 9. Pliki kluczowe (mapa)

| Plik | Rola |
|------|------|
| `src/lib/cloud-sync.ts` | Merge, Payroll Guard, P11 helpers |
| `src/app/CloudLoader.tsx` | Bootstrap fetch/merge/push |
| `src/lib/admin-auth.ts` | Hasła, `mergeAdminPasswordOverrides`, P15 |
| `src/lib/media-filter.ts` | Filtry UI (+ `stripDeadMedia*` niewired) |
| `src/lib/storage-url.ts` | `isDeadStorageUrl` |
| `scripts/test-p11-bootstrap-payroll.mjs` | Test P11 |
| `scripts/test-p15-admin-password-merge.mjs` | Test P15 |
| `scripts/verify-login-dawid-pawel-szymon.mjs` | Smoke login prod |

---

## 10. Następne kroki (propozycje)

1. Merge UI media z `audit-before-cleanup` → `main` (bez `stripDeadMedia*` lub z osobnym PR + guard sync)
2. Ponowić P14 na KV jeśli martwe URL wróciły (sprawdź `audit-dead-media-kv.mjs`)
3. Po każdej operacji KV adminów — weryfikacja P13B + smoke login
4. Rozważyć guard sync dla `kw-jobs` (analogiczny do payroll) przed client-side strip

---

## 11. Roboty — czarny ekran (`normalizePhone9`) — 2026-06-04

| | |
|---|---|
| **Objaw** | Crash przy wejściu w zakładkę Roboty: `Cannot read properties of undefined (reading 'replace')` |
| **Przyczyna** | `normalizePhone9(emp.phone)` w `inferTestAccountHeuristic` przy aktywnym rekordzie kartoteki **bez** pola `phone` w JSON z KV |
| **Mount** | `filterProductionActiveDirectory` w `JobsView` + `JobListPanelHeader` (2×) |
| **Fix** | Commit **`99e08c2`** — `String(phone ?? "")`, `(emp.name ?? "")`, `(d.phone ?? "")` w wyszukiwarce |
| **Dane** | **Nie** zmieniano KV ani localStorage |
| **Powiązany fix** | `0c4da46` — `jobAddressKey` (inny łańcuch `.replace`, adres job) |

Pełny handoff: [`SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md).
