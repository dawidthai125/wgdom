# Release Report — v2.50.54 Roboty UX Pack (20.5B.5)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.54**  
**Baseline:** v2.50.53 (`74890bd`)  
**Status:** IMPLEMENT DONE · oczekuje commit/deploy

---

## Summary

| Sub-sprint | Zakres |
|------------|--------|
| **20.5B.5A** | Domyślny filtr „W trakcie”; kolejność tabów faz |
| **20.5B.5B** | Etykieta Socjalny (key `komunalny`) |
| **20.5B.5C** | Pole `gasFurnaceStatus` (Zostaje / Wymiana / Brak) |
| **20.5B.5D** | Docs — plan techniczny PDF = „Rysunek/Plan” |

---

## Zmienione pliki

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

**Supabase / KV / Edge:** brak zmian

---

## Proponowany commit

```
feat(jobs): Roboty UX pack — default filter, Socjalny, piec gazowy (20.5B.5)

Default list filter W trakcie, housing label Socjalny (key komunalny),
optional gasFurnaceStatus meta field, docs for plan PDF = Rysunek/Plan.
```
