# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-10  
**Current Version:** **2.50.65**  
**Current Baseline:** **STABLE · E2E HARDENED · PWA HARDENED · PRE-FEATURE BACKUP SECURED**  
**Prod `origin/main` (app):** **lokalnie 2.50.65** · poprzedni prod **`c7bc58f`** · v2.50.64  
**★ Release 5C:** [`docs/RELEASE-REPORT-20.5Z.5C.md`](docs/RELEASE-REPORT-20.5Z.5C.md) — **DEPLOY READY** (push `main`)  
**Git tag backup:** **`pre-next-feature-2.50.64`** → `c7bc58f`  
**Deploy prod:** **`BxMBS2SFGiDxZmkHmwndVpr5RLin`**  
**E2E `origin/main`:** **`8906485`** — E2E Version Awareness (20.5Z.2B) + Happy Path (`caf344e`)  
**PWA `origin/main`:** **`46556a7`** — PWA + Version Awareness (20.5Z.2A)  
**CI E2E:** **`#27260457990`** SUCCESS (happy + version)

**★ Handoff pre-next-feature:** [`docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md) ← **START po backupie**  
**★ Backup raport:** [`docs/BACKUP-REPORT-2.50.64.md`](docs/BACKUP-REPORT-2.50.64.md)  
**★ Storage audit:** [`docs/AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`](docs/AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md)  
**★ Handoff końcowy 20.5Z:** [`docs/PROJECT-HANDOFF-FINAL-20.5Z.md`](docs/PROJECT-HANDOFF-FINAL-20.5Z.md)  
**Handoff serii 20.5Z:** [`docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md`](docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md)

---

## Werdykt sesji

```text
RELEASE READY — 20.5Z.5C (push main → Vercel)
```

Mobile Jobs List Width Fix **2.50.65** · build + smoke **PASS** · pre-feature backup baseline **zachowany** (`pre-next-feature-2.50.64`).

---

## Ostatni release — 20.5Z.5C (**RELEASED** / **DEPLOY READY**)

| Sprint | Wersja | Zakres |
|--------|--------|--------|
| **20.5Z.5C** Mobile Jobs List Width | **2.50.65** | Roboty mobile `<640px` — lista pełna szerokość; pusty panel szczegółów `hidden sm:flex` |

**Kluczowy plik:** `JobsView.tsx` (`flex-1 sm:flex-[7]`, wrapper empty detail `hidden sm:flex flex-[13]`)

**Smoke:**

```bash
npx vite-node scripts/smoke-test-jobs-ux-pack-2.50.40.mjs   # 16/16
npm run build
```

**Raport:** [`docs/RELEASE-REPORT-20.5Z.5C.md`](docs/RELEASE-REPORT-20.5Z.5C.md)

---

## Poprzedni release — 20.5Z.5A + 20.5Z.5B (**RELEASED**)

| Sprint | Wersja | Commit | Zakres |
|--------|--------|--------|--------|
| **20.5Z.5A** Admin Nav Jobs Badge | 2.50.63 | `c7bc58f` | Badge Roboty = W toku + Do odbioru (`countActiveJobsForNavBadge`) |
| **20.5Z.5B** Dashboard Handover Alert | 2.50.64 | `c7bc58f` | Pulpit „Uwaga dziś” — Roboty do odbioru |

**Smoke 5A/5B:** `smoke-test-admin-nav-jobs-badge-20.5z5a.mjs` (8/8) · `smoke-test-dashboard-handover-alert-20.5z5b.mjs` (11/11)

---

## Pre-feature backup v2.50.64 (**COMPLETE**)

| Element | Status |
|---------|--------|
| Git tag `pre-next-feature-2.50.64` | **PASS** |
| KV + schema + edge snapshot | **PASS** |
| Repo bundle + archive | **PASS** |
| Storage manifest | **PASS** (140 obiektów) |
| Storage-full binaria | **PASS** (140/140, 54.15 MB) |
| Email rdzeń KV+docs | **PASS** (`dawid.thai@int.pl`) |
| Email pełny ZIP 52.8 MB | **FAIL** (limit Resend 40 MB) |

**Lokalnie (poza repo):** `C:\Users\dawid\Downloads\WGDOM-BACKUP-2.50.64*` — **nie commitować** `kv-data.json` (hashe adminów).

**Skrypty:** `run-pre-feature-backup-2.50.64.mjs`, `run-storage-full-backup-2.50.64.mjs`, `send-pre-feature-backup-email-2.50.64.mjs`

---

## Seria 20.5Z — Platform Stabilization (**COMPLETE**)

| Sprint | Commit | Status |
|--------|--------|--------|
| 20.5Z.1 E2E Happy Path | `caf344e` | **COMPLETE** |
| 20.5Z.2A PWA hardening | `46556a7` | **COMPLETE** |
| 20.5Z.2B E2E Version Awareness | `8906485` | **COMPLETE** |
| 20.5Z.4A Jobs Cleanup | `640e3a9` | **COMPLETE** |
| **20.5Z.5A** Nav badge | `c7bc58f` | **RELEASED** |
| **20.5Z.5B** Handover alert | `c7bc58f` | **RELEASED** |
| **20.5Z.5C** Mobile list width | lokalnie | **RELEASED** · **DEPLOY READY** |

Audyt zamknięcia 20.5Z.3: **GO** · szczegóły: [`PROJECT-HANDOFF-FINAL-20.5Z.md`](docs/PROJECT-HANDOFF-FINAL-20.5Z.md)

---

## Następny etap

**Nowy stream feature** — baseline zabezpieczony tagiem `pre-next-feature-2.50.64`.

Propozycje z backlogu (tylko na polecenie): 20.3C legacy CC, Roboty 2.0 FULL, KV orphan cleanup.

---

## Szybki start dla agenta

```text
1. AGENTS.md
2. TEN PLIK (CURRENT-TASK.md)
3. docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md   ← ★ co zrobiliśmy + backup
4. docs/PROJECT-HANDOFF.md
5. docs/PROJECT-HANDOFF-FINAL-20.5Z.md
6. docs/BACKUP-REPORT-2.50.64.md
7. docs/ARCHITECTURE.md § 11 (sync) + § 12.1.2 (pliki)
```
