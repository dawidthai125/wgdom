# CHANGELOG-SUMMARY — W&G DOM

> Podsumowanie ostatnich dużych zmian po obszarach. Skrót dla AI; źródło prawdy szczegółów: `git log`, `src/app/changelog-data.ts`, [`CHANGELOG.md`](CHANGELOG.md).

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `d2a3d90` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** · PR-PAY-S6 **CLOSED** |

---

## Payroll

Seria naprawcza **P0 Incident** (integralność danych listy płac przy sync/merge). Root cause: dodatywny UNION rostera (`1a65341`, v2.63.15) powodował „zmartwychwstawanie" i cofanie intencji użytkownika.

| Bundle | Cel | Commit |
|--------|-----|--------|
| **PR‑PAY‑S1** | Week Scope Hard Guard — koniec cross‑week contamination | `1d5b0b7` |
| **PR‑PAY‑S2** | Deletion Tombstones (week‑scoped) — usunięty pracownik nie wraca | `d6c6117` |
| **PR‑PAY‑S3** | Zero Hours Persistence — lokalne wyzerowanie wygrywa nad bogatszą chmurą przy remisie | `d496b88` |
| **PR‑PAY‑S5** | Settled Status Persistence — „Rozliczony→Oczekujący" nie wraca (LWW `settledUpdatedAt`) | `fd56cf7` |
| **PR‑PAY‑S6** | Archive Restore Eligibility Guard — baner (G1) i restore (G2) używają eligible archive roster (archiwum minus tombstony S2); koniec false positive + wskrzeszania usuniętych/smoke | `d2a3d90` |

Wcześniej (CLOSED): **Etap 2 B1–B6 + Restore Banner** (v2.63.17–24), **Guard Phase B3/B3.1/B3.2** (v2.63.18–20). **Payroll P0 Incident — CLOSED.** **PR‑PAY‑S6 — CLOSED** (IMPLEMENT COMPLETE · BUILD PASS · TEST PASS).

---

## Work Catalog

Rozbudowa katalogu robót o **market pricing** (średnie rynkowe, import cenników).

| Etap | Cel | Commit |
|------|-----|--------|
| **WC‑P3.0** | Foundation thaw — schema v4 + `marketQuotes` | `c8e1b9e` |
| **WC‑P3.1** | Market Average Engine (pure) + API `marketQuotes` + adapters/mapping + CSV import (preview) + seed | `87e2bdc`→`04cb034` |
| **WC‑P3.2** | Import Persistence — Apply (merge‑not‑replace) · Rollback (single undo) · Commit Orchestration | `ba2699d`→`f37b619` |
| dedup | Deduplikacja `WGDOM_COST_CATALOG_KEY` SSOT | `b1afa58` |

**W toku:** WC‑P3.3 Market Pricing UX (AUDIT done, design freeze pending). UI nadal używa `marketAvgPln`; docelowo `marketQuotes`.

---

## TI — Test Infrastructure

Infrastruktura testowa: manifest SSOT + orchestrator + gaty A/B/C.

| Element | Cel | Commit / wersja |
|---------|-----|-----------------|
| **TEST‑INFRA‑001** | Manifest (`test-infra/test-manifest.json`) + orchestrator (`npm run test:infra`) + Payroll Harness | v2.63.26 (`3d6dd90`) |
| **TI‑B2** | Externalize `HARNESS_SANDBOX_JOB_IDS` (config‑only) | `803c0bc` |
| **TI‑B2.1** | Payroll Harness Production Safety — Synthetic + Merge, Preview First | `2efe8b5` |
| **TI‑B3** | CI Gate Integration (orchestrator gates B/C) | `0706dbc` |
| **TI‑B4** | Smoke agregat Przetargi NG‑01–04 (Z‑04 PASS) | v2.63.27 (`6c94223`) |

**Backlog:** TI‑B1 (ekstrakcja `removeWeekEmployee()` do lib) — OPEN.

---

## MB — Test‑Gate Integrity + Docs SSOT

Twardnienie bramki testów i synchronizacja dokumentacji (runtime bez zmian).

| Element | Cel | Commit |
|---------|-----|--------|
| **MB‑1** | Test‑Gate Integrity — `isBlockingFailure()` (wybrany conditional blokuje release) | `460031f` |
| **MB‑1.1** | Docs SSOT Sync — DESIGN FREEZE v2.0 + semantyka gate #009 | `8b5c63c` |
| **MB‑2** | Docs SSOT Sync — synchronizacja docs po MB‑1/MB‑1.1/TI‑B2.1 | `1b9e0b6` |

(TEST‑FIX‑001 — DONE, SUPERSEDED BY MB‑1.)

---

## Repo Hygiene

| Element | Cel | Commit |
|---------|-----|--------|
| **REPO‑HYGIENE‑1** | Working tree reconciliation (uporządkowanie stanu repo) | `332f50c` |
| Config | Externalize `HARNESS_SANDBOX_JOB_IDS` (poza kodem) | `803c0bc` |

> **Uwaga bieżąca:** w working tree pozostają luźne zmiany z innych prac (tenders, mobile, `index.html`) oraz liczne untracked `scripts/audit-p0-*.mjs` (forensyka) — patrz [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md).

---

## Version Banner

| Element | Cel | Commit |
|---------|-----|--------|
| **Version Banner Refresh** | Build Identity oparty na commicie — spójna identyfikacja buildu (banner + `version.json`) | `e255aef` |

---

## Jak czytać wersje

- **Wersja UI** = `CHANGELOG[0].version` w `src/app/changelog-data.ts` → obecnie **v2.63.27**.
- Zmiany biblioteczne / test‑infra / hotfixy P0 mogą trafiać na `main` **bez bumpu** numeru UI (są w HEAD `fd56cf7`).
- Pełny, chronologiczny changelog użytkownika: [`CHANGELOG.md`](CHANGELOG.md).
