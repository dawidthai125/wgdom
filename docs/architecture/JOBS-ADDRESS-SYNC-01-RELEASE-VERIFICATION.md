# JOBS-ADDRESS-SYNC-01 — Release Verification Report

> **Program:** JOBS-ADDRESS-SYNC-01  
> **Design Freeze:** [`JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md`](JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md) v1.0  
> **Target version:** **2.65.6**  
> **Date:** 2026-07-12

---

## RELEASE MODE: FAST RELEASE

Jeden spójny bundle (< 15 plików), build PASS, testy PASS, brak untracked implementacji w allowliście.

---

## BUILD STATUS

`npm run build` — **PASS**

---

## TEST STATUS

| Suite | Command | Result |
|-------|---------|--------|
| JA-T01…T06 | `npx vite-node scripts/test-jobs-address-sync-race.mjs` | **18/18 PASS** |
| ROBOTS-INSPECTOR regresja | `npx vite-node scripts/test-robots-inspector-01-sync-race.mjs` | **7/7 PASS** |
| PAYROLL-RACE regresja | `npx vite-node scripts/test-payroll-race-apply-reconcile.mjs` | **12/12 PASS** |
| PAYROLL-ARCHIVE regresja | `npx vite-node scripts/test-payroll-archive-sync-race-p0.mjs` | **10/10 PASS** |

---

## Zakres implementacji (allowlista DF)

| Plik | Zmiana |
|------|--------|
| `src/lib/job-address-fields.ts` | **NEW** — `normalizeJobAddressField`, `mergeJobAddressField` |
| `src/lib/cloud-sync.ts` | `mergePair` — field merge `address`/`flatNumber` |
| `src/app/JobsView.tsx` | functional onChange (fresh `jobs.find`) |
| `scripts/test-jobs-address-sync-race.mjs` | **NEW** — JA-T01…T06 |
| `test-infra/test-manifest.json` | `LIB-JOBS-ADDRESS-SYNC-01` |
| `src/app/changelog-data.ts` | **2.65.6** |
| `CHANGELOG.md` | skrót |

**Nie dotknięto:** Edge · PWRB · Payroll runtime · `finalReconciledBundle` API · `reconcileJobsWithFreshLocal` implementacja · `App.tsx` CORE sync.

---

## VERSION

| Pole | Wartość |
|------|---------|
| Changelog | **2.65.6** |
| HEAD (post-commit) | _(patrz git log)_ |
| origin/main (pre-push) | **9307386** (2.65.5) |

---

## PRODUCTION STATUS

_(uzupełnione po push — jedno `curl version.json`)_

---

## WERDYKT

**RELEASE GO** — build + testy PASS · scope zgodny z DF v1.0.

---

## HOTFIX CLASSIFICATION

- **BUGFIX** — utrata adresu/nr mieszkania po auto-sync
- **UX** — JobsView functional onChange (secondary amplifier fix)
