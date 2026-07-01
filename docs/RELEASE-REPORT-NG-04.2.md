# RELEASE REPORT — NG-04.2 Benchmark per Line

> **Version:** **2.63.10**  
> **Date:** 2026-07-01  
> **Epic:** NG-04 — Kosztorys Workspace PRO · **Faza 04.2**

---

## Summary

NG-04.2 dodaje kolumnę **Benchmark rbh** do BOQ Explorer — badge per linia (below / ok / above), derived cache, adapter `BoqLaborBenchmarkBadge`. Bez zmian ViewModel merge, parserów i NG-02 runtime.

---

## Principles shipped (#001–#007)

| # | Nazwa | Status |
|---|-------|--------|
| #001 | One BOQ Row · One ViewModel · Many Views | ✅ |
| #002 | Lazy Rendering First | ✅ |
| #003 | Search ≠ Merge | ✅ |
| #004 | Benchmark is Presentation | ✅ |
| #005 | Derived UI Cache | ✅ |
| #006 | UI Consumes Cache Only | ✅ |
| #007 | Presentation Metadata Only | ✅ (freeze dla NG-04.3+) |

---

## Test matrix

| Skrypt | Wynik |
|--------|-------|
| `test-ng04-2-benchmark-per-line.mjs` | 27/27 |
| `test-ng04-kosztorys-boq-explorer.mjs` | 19/19 |
| `test-ng04-m8-large-boq-performance.mjs` | 102/102 (M8.10) |
| `test-v41-kosztorys-workspace.mjs` | 76/76 |
| `test-tender-kosztorys-process-phase.mjs` | 18/18 |
| `test-tender-kosztorys-process-health.mjs` | 16/16 |
| `test-tp200b-snapshot-fidelity.mjs` | 22/22 |
| `test-tender-price-bridge.mjs` | 17/17 |
| `test-labor-benchmark.mjs` | 24/24 |
| `npm run build` | PASS |

### M8.10 (benchmark cache)

| Metryka | Wynik |
|---------|-------|
| `buildBoqLaborBenchmarkCache(500)` | ~0.8 ms |
| Cache ref po 50× filter | stable |

---

## Architecture

```text
view.rows
  → useMemo → buildBoqLaborBenchmarkCache()     [#005 · #006]
  → BoqLaborBenchmarkBadge(cache.get)           [#006]
  → LaborBenchmarkStatusBadge compact
```

---

## Production impact

| Warstwa | Impact |
|---------|--------|
| KV / sync | **NONE** |
| Parsery | **NONE** |
| Tab Kosztorys | **LOW** — +1 kolumna Benchmark |

---

## Files (release bundle)

- `src/lib/tender-kosztorys-boq-benchmark.ts`
- `src/app/kosztorys/BoqLaborBenchmarkBadge.tsx`
- `src/app/kosztorys/KosztorysBoqRowFields.tsx`
- `src/app/kosztorys/KosztorysBoqExplorerSection.tsx`
- `scripts/test-ng04-2-benchmark-per-line.mjs`
- `docs/NG-04.2-DESIGN-FREEZE.md`

---

## Next

| Faza | Status |
|------|--------|
| **NG-04.2** | **CLOSED** |
| **NG-04.3** | **ACTIVE** — ATH tooltip FOUND_NO_VALUE · Principle #007 |
