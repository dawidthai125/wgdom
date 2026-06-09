# Release Report — v2.50.54 Roboty UX Pack (20.5B.5)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.54**  
**Commit:** **`ae35c56`**  
**Deploy:** **`4995226877`** — **SUCCESS**  
**CI Mobile:** run **`27232257123`** — **SUCCESS**  
**Status:** **RELEASED**

---

## Summary

| Sub-sprint | Zakres |
|------------|--------|
| **20.5B.5A** | Domyślny filtr „W trakcie”; kolejność tabów: W trakcie → Do odbioru → Zdane → Wszystkie |
| **20.5B.5B** | Etykieta **Socjalny** (key `komunalny` bez migracji) |
| **20.5B.5C** | Pole `gasFurnaceStatus` (Zostaje / Wymiana / Brak) — admin, inspektor, PDF/ZIP |
| **20.5B.5D** | Docs — plan techniczny PDF = dokument odbiorowy „Rysunek/Plan” |

---

## Zmienione pliki (release)

| Plik | 5A | 5B | 5C | 5D |
|------|----|----|----|-----|
| `src/app/JobsView.tsx` | ✓ | | ✓ PDF | |
| `src/app/JobListStatus.tsx` | ✓ | | | |
| `src/lib/job-meta.ts` | | ✓ | ✓ | |
| `src/app/JobMetaPickers.tsx` | | | ✓ | |
| `src/app/app-domain.ts` | | | ✓ | |
| `src/app/InspectorPanel.tsx` | | | ✓ | |
| `src/lib/job-documents-pack.ts` | | | ✓ | |
| `src/app/changelog-data.ts` | | | | ✓ |
| `src/app/GuideView.tsx` | ✓ | ✓ | ✓ | ✓ |
| `docs/ARCHITECTURE.md` | | | | ✓ |
| `CHANGELOG.md` | | | | ✓ |
| `scripts/smoke-test-jobs-default-filter-20.5b5a.mjs` | NEW | | | |
| `scripts/smoke-test-job-meta-20.5b5b.mjs` | | NEW | | |
| `scripts/smoke-test-gas-furnace-20.5b5c.mjs` | | | NEW | |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-jobs-default-filter-20.5b5a.mjs` | **5/5 PASS** |
| `smoke-test-job-meta-20.5b5b.mjs` | **4/4 PASS** |
| `smoke-test-gas-furnace-20.5b5c.mjs` | **10/10 PASS** |
| `smoke-test-jobs-2.0-midb.mjs` | **21/21 PASS** |
| `smoke-test-jobs-ux-pack-2.50.40.mjs` | **15/15 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| GitHub Actions `#27232257123` | **SUCCESS** |
| Vercel deploy `#4995226877` | **SUCCESS** |
| Prod bundle `smoke-prod-bundle-2.50.54.mjs` | **15/15 PASS** × wgdom.fun + wgdom.online |

**Supabase / KV / Edge:** brak zmian

---

## Post-Deploy Smoke (bundle)

| Checklist | Wynik |
|-----------|-------|
| Roboty — domyślny filtr `in_progress` | **PASS** |
| Tab order — W trakcie / Do odbioru / Zdane | **PASS** |
| Typ lokalu „Socjalny” | **PASS** |
| Pole „Piec gazowy” + opcje Zostaje/Wymiana/Brak | **PASS** |
| `gasFurnaceStatus` w bundle | **PASS** |
| PDF/ZIP readme „Piec gazowy:” | **PASS** |
| InspectorPanel w bundle | **PASS** |
| Wersja prod 2.50.54 | **PASS** |
| Plan techniczny 20.5A.9 regresja | **PASS** (21/21 lokalnie) |

---

## Baseline po wdrożeniu

```text
Version: 2.50.54
Commit: ae35c56
Deploy: 4995226877
Status: RELEASED · STABLE

Sprint 20.5B.5 — Roboty UX Pack

✓ Roboty domyślnie otwierają się na „W trakcie”
✓ Kolejność tabów: W trakcie → Do odbioru → Zdane → Wszystkie
✓ Typ lokalu „Socjalny” (bez migracji danych)
✓ Nowe pole „Piec gazowy”
✓ Plan techniczny PDF = dokument odbiorowy „Rysunek/Plan”
✓ Brak zmian sync, KV, Edge i REQUIRED_DOCS
```
