# #5C-5C F2 — Legacy Compat Cleanup · CLOSEOUT

> **Status:** **CLOSED FINAL**  
> **Data closeout:** 2026-07-06  
> **Prod:** UI **2.63.53** · commit **`e3daa6d`** · **PRODUCTION VERIFIED**  
> **Klasa:** **CORE CATALOG** (#CORE-013)  
> **Design Freeze:** [`CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md`](./CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md) § Faza 2  
> **Poprzednik:** F1 **`efc45d9`** (2.63.52) · **Następny:** F3 **BLOCKED** (telemetria)

---

## 1. Cel F2

Usunąć martwe ścieżki zapisu legacy catalog i nieużywane API compat UI — prod już `work_only`; UI nie wołało legacy router.

## 2. Co usunięto

| Symbol | Plik |
|--------|------|
| `saveLegacyCostCatalogRouted` | `catalog-write-router.ts` |
| `appendCostCatalogHistoryRouted` | `catalog-write-router.ts` |
| `canWriteLegacyCatalog` | `catalog-write-router.ts` |
| `saveWgdomCostCatalogStore` | `wgdom-cost-catalog-store.ts` |
| `getActiveCatalog` | `wgdom-cost-catalog-store.ts` |
| `resolveCatalogForUI`, `isLegacyCatalog`, `isWorkCatalog`, `resolveCatalogVersion` | `work-catalog-compat.ts` |

## 3. Co pozostaje LIVE

| Symbol / ścieżka | Rola |
|------------------|------|
| `saveWorkCatalogRouted` | jedyny zapis katalogu z UI |
| `resolveCatalogForEngine` | engine compat → `tender-active-catalog.ts` |
| `loadWgdomCostCatalogStoreLocal` | ONE-SHOT bootstrap (scenariusz B) — **do F3** |
| `finalizeWorkCatalogAfterDeferredMerge` | deferred bootstrap po sync |
| `wgdom-cost-catalog.ts` | typy domeny + defaults (nie usuwać w #5C-5C) |
| `kw-wgdom-cost-catalog-history` | pełny sync (#5C-3D) — bez zmian |

## 4. Boundary #CORE-013

| Obszar | Diff? | Werdykt |
|--------|-------|---------|
| Payroll / PWRB | NIE | PASS |
| `cloud-sync.ts` | NIE | PASS |
| ONE-SHOT bootstrap | NIE | PASS |
| `App.tsx` / Edge | NIE | PASS |

## 5. Testy (gate release)

| ID | Skrypt | Wynik |
|----|--------|-------|
| T1-F2 | `test-5c-5c-legacy-cleanup-f2.mjs` | PASS |
| T2-F2 | `test-pb-write-router.mjs` | PASS (work path only) |
| T3-F2 | `test-work-catalog-compat.mjs` | PASS (engine only) |
| T4-F2 | `test-tender-history-ssot-5c3d.mjs` | PASS |
| T6-F2 | `test-tender-read-ssot-work-only-5c1.mjs` | PASS |
| T7-F2 | Payroll gate B scope payroll | **15/15** PASS |
| T8-F2 | `npm run build` | PASS |

**Manifest:** `LIB-5C-5C-LEGACY-CLEANUP-F2` · suite `smoke-work-catalog-p2-mvp` → **31** testIds.

**Pre-existing (nie blokuje F2):** `test-5c-5b-bootstrap-decouple` T5 `legacy_empty` — 2 FAIL w fixture.

## 6. Rollback

`git revert e3daa6d` — brak migracji KV; przywraca martwe legacy write API (niezalecane po cutover).

## 7. Następny krok

**POST F2 OBSERVATION** — patrz [`CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md`](./CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md).  
**F3 IMPLEMENT:** **BLOCKED** do telemetrii T1–T7 + Owner GO.
