# Release Report — 20.7C.2 Dashboard V2 Complete

**Data:** 2026-06-10  
**Wersja UI:** **2.50.66**  
**Release Name:** Dashboard V2 Complete  
**Sprint:** **20.7C.2** (2A lib + 2B UI + 2C consolidation + E2E)  
**Baseline:** 2.50.65 · `070e52f`

---

## Summary

Dashboard V2 funkcjonalnie ukończony. Hero DZIŚ = główne źródło priorytetów na Pulpicie (TOP 5, `buildHeroToday`). Uwaga dziś = rozszerzona lista bez duplikatu TOP 5. Przetargi — skrót bez listy akcji. Action Center prezentuje forecast jako sloty.

---

## Zakres

| Etap | Zakres |
|------|--------|
| 2A | `dashboard-hero-today.ts` — types, mappers, ranker, `buildHeroToday()` |
| 2B | `HeroDzisPanel.tsx`, integracja w `DashboardView` |
| 2C | konsolidacja, dedupe Uwaga, Action Center slot UI, E2E |

**Bez zmian:** `buildHeroToday()` logika/ranker, `buildActionCenter()`, struktura `HeroDzisPanel`.

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | PASS |
| `npm run test:e2e:happy` | 9/9 PASS |
| `vite-node scripts/test-dashboard-hero-today.mjs` | 13/13 |
| `vite-node scripts/test-dashboard-hero-consolidation.mjs` | 4/4 |
| `vite-node scripts/test-hero-dzis-panel.mjs` | 10/10 |

---

## Post-deploy

- `/version.json` → **2.50.66**
- `sw.js` → `wgdom-shell-2.50.66`
- Pulpit desktop/mobile — Hero DZIŚ nad KPI
