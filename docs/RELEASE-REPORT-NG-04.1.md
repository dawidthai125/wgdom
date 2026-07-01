# RELEASE REPORT — NG-04.1 BOQ Explorer

> **Version:** **2.63.9**  
> **Date:** 2026-07-01  
> **Epic:** NG-04 — Kosztorys Workspace PRO · **Faza 04.1**

---

## Summary

NG-04.1 wprowadza **BOQ Explorer** na zakładce Kosztorys: jeden ViewModel wiersza (`buildKosztorysBoqExplorerView`), search/filter bez przebudowy merge, unified kolumny ATH + WGDOM, TOP 20 przez `selectTopCostRows()`.

---

## M8 — Large BOQ Performance Gate

| Check | Wynik |
|-------|-------|
| Fixture | **500 poz.** (prod max `CATALOG_QUANTITIES_CAP`) + stress filter **1200** |
| Build ViewModel (500) | **56ms** (< 2500ms) |
| 50× search | **3.5ms** — zero rebuild |
| 20× filtry branżowe | **320ms** — reference unchanged |
| Scroll pagination | PASS |
| TOP20 `selectTopCostRows` | PASS (lp 500 → 481) |
| ATH/WGDOM columns | PASS |
| NG-02 process phase | **ready** |
| Static Principle #003 | PASS |

**M8 VERDICT: PASS** (97/97)

---

## Test matrix

| Skrypt | Wynik |
|--------|-------|
| `test-ng04-kosztorys-boq-explorer.mjs` | 19/19 |
| `test-ng04-m8-large-boq-performance.mjs` | 97/97 |
| `test-v41-kosztorys-workspace.mjs` | 70/70 |
| `test-tender-kosztorys-process-phase.mjs` | 18/18 |
| `test-tender-kosztorys-process-health.mjs` | 16/16 |
| `test-tp200b-snapshot-fidelity.mjs` | 22/22 |
| `test-tender-price-bridge.mjs` | 17/17 |
| `npm run build` | PASS |

---

## Architecture compliance

| Rule | Status |
|------|--------|
| SSOT FIRST | ✅ |
| Reuse First | ✅ |
| Zero Duplicate Logic | ✅ |
| Principle #001 One ViewModel | ✅ |
| Principle #002 Lazy Rendering | ✅ |
| Principle #003 Search ≠ Merge | ✅ |
| NG-02 runtime unchanged | ✅ |
| Parsers unchanged | ✅ |

---

## Production impact

| Warstwa | Impact |
|---------|--------|
| KV / sync | **NONE** |
| Parsery | **NONE** |
| Tab Kosztorys UI | **LOW** — bogatszy BOQ Explorer |

---

## Out of scope (next)

- **NG-04.2** — benchmark badge per linia
- **NG-04.3** — ATH tooltip FOUND_NO_VALUE
- **NG-04.4** — polish + EPIC close

---

## Files (release bundle)

- `src/lib/tender-kosztorys-boq-explorer.ts`
- `src/lib/tender-kosztorys-pro-filters.ts`
- `src/app/kosztorys/KosztorysBoqExplorerSection.tsx`
- `src/app/kosztorys/KosztorysBoqRowFields.tsx`
- `src/app/TenderKosztorysWorkspace.tsx`
- `src/lib/tender-kosztorys-pro-dashboard.ts`
- `scripts/test-ng04-*.mjs`
- `docs/NG-04-DESIGN-FREEZE.md`
