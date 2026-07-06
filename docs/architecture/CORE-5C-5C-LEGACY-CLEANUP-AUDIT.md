# CORE-5C-5C — Legacy Cleanup AUDIT

> **Status:** AUDIT COMPLETE · **IMPLEMENT BLOCKED** (wymaga Design Freeze + Owner GO)  
> **Data audytu:** 2026-07-06  
> **Tryb:** AUDIT ONLY — zero diff `src/`  
> **Baseline prod:** UI **2.63.51** · feature **`50dae97`** · repo HEAD **`82d5075`**  
> **Poprzedniki:** #5C-5A CLOSED FINAL · #5C-5B CLOSED FINAL · PRODUCTION VERIFIED  
> **Klasa bundle:** **CORE CATALOG** (#CORE-013)

---

## 1. Executive Summary

Po #5C-5B dominująca ścieżka prod **nie wywołuje reconcile** i **nie czyta legacy** dla użytkowników ze scenariuszem A (`migratedFromLegacyAt` set). Nadal istnieją jednak **żywe** zależności od modułów legacy w:

1. **ONE-SHOT PB-3 migrate** (`loadWgdomCostCatalogStoreLocal` w `finalizeWorkCatalogAfterDeferredMerge`)
2. **Write router** — martwe ścieżki `saveLegacyCostCatalogRouted` / `persistKey(kw-wgdom-cost-catalog)` przy domyślnym `work_only`
3. **cloud-sync** — defensywny branch `coerceValueForCloudKey` dla `kw-wgdom-cost-catalog` (klucz poza sync plane od #5C-5A)
4. **Historia KV** — `kw-wgdom-cost-catalog-history` pełny sync (Work Catalog rate history #5C-3D)

**Nie jest „legacy” w sensie usuwalnym:** `wgdom-cost-catalog.ts` — współdzielony model domeny (`WgdomCostCatalog`, regiony, kategorie) używany przez silnik wyceny, Przetargi, benchmarki i adapter Work→Engine.

### Werdykt

| Pytanie | Werdykt |
|---------|---------|
| **GO dla AUDIT closeout** | **GO** — ten dokument |
| **GO dla IMPLEMENT (#5C-5C) bez Design Freeze** | **NO GO** |
| **GO dla big-bang usunięcia `wgdom-cost-catalog-store.ts`** | **NO GO** |
| **GO dla fazowanego cleanup (Faza 1–2)** | **GO warunkowy** — po DF + gate testów |

---

## 2. Call Graph po #5C-5B

### 2.1 Deferred bootstrap (prod — dominujący)

```text
CloudLoader (bez zmian #5C-5B)
  └─ fetchAndMergeDeferredBootstrap()          [cloud-sync.ts]
       ├─ merge BOOTSTRAP_DEFERRED_KEYS       (bez kw-wgdom-cost-catalog — #5C-5A)
       ├─ finalizeWorkCatalogAfterDeferredMerge()   [work-catalog-bootstrap.ts]
       │    ├─ Scenariusz A: early skip (migratedFromLegacyAt) → ZERO legacy read
       │    ├─ Scenariusz B/C edge: loadWgdomCostCatalogStoreLocal() → ONE-SHOT migrate
       │    └─ NIE: maybeExecuteWorkCatalogReconcile()
       └─ dispatch WGDOM_DEFERRED_BOOTSTRAP_EVENT (#6E)
```

### 2.2 Read SSOT Przetargów (bez legacy KV)

```text
resolveActiveCatalogForTender()                [tender-active-catalog.ts]
  └─ loadWorkCatalogStoreLocal()
  └─ resolveCatalogForEngine(workStore)      [work-catalog-compat.ts]
       └─ buildLegacyCostCatalogFromWorkStore() [engine-adapter — nazwa historyczna, AKTYWNY]
  └─ defaultWgdomCostCatalog() fallback      [wgdom-cost-catalog.ts — typy, NIE store]
```

### 2.3 Reconcile — **RUNTIME ORPHAN**

```text
maybeExecuteWorkCatalogReconcile()             [work-catalog-reconcile-bootstrap.ts]
  └─ reconcileLegacyToWorkCatalog()
       └─ loadWgdomCostCatalogStoreLocal()

Callers w src/app: BRAK
Callers w src/lib (poza barrel): BRAK
Callers w cloud-sync po #5C-5B: BRAK
Jedyni konsumenci: work-catalog/index.ts re-export · scripts/test-pb-write-reconcile.mjs
```

### 2.4 Write path (prod default `work_only`)

```text
UI / app → saveWorkCatalogRouted()             [catalog-write-router.ts] — AKTYWNY
Legacy branch → saveLegacyCostCatalogRouted()
              → saveWgdomCostCatalogStore()
              → persistKey(kw-wgdom-cost-catalog)

Callers saveLegacyCostCatalogRouted w src/app: BRAK
Jedyni callers: test-pb-write-router.mjs · barrel export
```

---

## 3. Bootstrap & Reconcile vs Legacy (weryfikacja #3)

| Ścieżka | Legacy read? | Reconcile? | Status po #5C-5B |
|---------|--------------|------------|------------------|
| Deferred finalize — scenariusz A (zmigrowany) | **NIE** | **NIE** | **DECOUPLED** ✓ |
| Deferred finalize — scenariusz B (ONE-SHOT) | **TAK** (LS only) | **NIE** | **Zamierzone** — edge migrate |
| `maybeExecuteWorkCatalogReconcile()` | TAK (w lib) | TAK | **ORPHAN** — brak runtime caller |
| `loadWgdomCostCatalogStore()` async (cloud fetch) | TAK | — | **DEAD** — zero callerów poza definicją |
| UI Przetargów read | **NIE** (work SSOT #5C-1) | — | **DECOUPLED** ✓ |
| Sync plane `kw-wgdom-cost-catalog` | — | — | **QUIESCED** (#5C-5A) ✓ |
| Sync `kw-wgdom-cost-catalog-history` | — | — | **AKTYWNY** — nie legacy cleanup |

**Wniosek:** Bootstrap i reconcile **nie mają już cyklicznej** zależności od legacy na prod. Pozostaje **jednorazowy** edge ONE-SHOT oraz **martwy kod** reconcile/orchestrator.

---

## 4. Runtime Reachability

Legenda: **LIVE** = ścieżka prod możliwa · **DEAD** = brak callerów runtime · **EDGE** = rzadki ONE-SHOT · **SYNC** = tylko merge/coerce · **TEST** = tylko skrypty testowe

### 4.1 Pliki

| Plik | Reachability | Uwagi |
|------|--------------|-------|
| `src/lib/wgdom-cost-catalog.ts` | **LIVE** | Typy + `defaultWgdomCostCatalog` — 30+ importów w `src/` |
| `src/lib/wgdom-cost-catalog-store.ts` | **EDGE + DEAD paths** | LS read ONE-SHOT; async load/save legacy — DEAD w app |
| `src/lib/wgdom-cost-catalog-history.ts` | **LIVE + SYNC** | Historia stawek; klucz w `DATA_KEYS` |
| `src/lib/work-catalog-bootstrap.ts` | **LIVE** | Hook z `cloud-sync`; legacy import ONE-SHOT only |
| `src/lib/work-catalog-reconcile-bootstrap.ts` | **DEAD** | Cały moduł — zero runtime callers |
| `src/lib/work-catalog-reconcile.ts` | **TEST** | Pure reconcile; tylko bootstrap + testy |
| `src/lib/work-catalog/work-catalog-compat.ts` | **PARTIAL LIVE** | `resolveCatalogForEngine` LIVE; `resolveCatalogForUI` / `isLegacyCatalog` — TEST only |
| `src/lib/work-catalog/work-catalog-engine-adapter.ts` | **LIVE** | Adapter work → `WgdomCostCatalog` dla silnika |
| `src/lib/work-catalog/work-catalog-migrate.ts` | **EDGE** | ONE-SHOT migrate z bootstrap |
| `src/lib/catalog-write-router.ts` | **LIVE** | `saveWorkCatalogRouted` LIVE; legacy routes DEAD przy `work_only` |
| `src/lib/tenders-sync.ts` | **SYNC** | `mergeWgdomCostCatalogForCloud` — defensywny merge (klucz poza plane) |
| `src/lib/cloud-sync.ts` | **LIVE** | Hook finalize; coerce legacy key; historia merge |

### 4.2 Symbole (helpery)

| Symbol | Definicja | Runtime callers (`src/`) | Klasyfikacja |
|--------|-----------|---------------------------|--------------|
| `loadWgdomCostCatalogStoreLocal` | `wgdom-cost-catalog-store.ts` | `work-catalog-bootstrap.ts`, `work-catalog-reconcile-bootstrap.ts` | **EDGE** (+ DEAD via reconcile) |
| `loadWgdomCostCatalogStore` (async) | `wgdom-cost-catalog-store.ts` | — | **DEAD** |
| `saveWgdomCostCatalogStore` | `wgdom-cost-catalog-store.ts` | `catalog-write-router.ts` only | **DEAD** (blocked `work_only`) |
| `saveLegacyCostCatalogRouted` | `catalog-write-router.ts` | — (app) | **DEAD** |
| `appendCostCatalogHistoryRouted` | `catalog-write-router.ts` | — (app) | **DEAD** (legacy history path) |
| `maybeExecuteWorkCatalogReconcile` | `work-catalog-reconcile-bootstrap.ts` | — | **DEAD** |
| `reconcileLegacyToWorkCatalog` | `work-catalog-reconcile-bootstrap.ts` | — | **DEAD** |
| `maybeExecuteWorkCatalogBootstrap` | `work-catalog-bootstrap.ts` | — | **DEAD** (deprecated alias) |
| `finalizeWorkCatalogAfterDeferredMerge` | `work-catalog-bootstrap.ts` | `cloud-sync.ts` | **LIVE** |
| `mergeWgdomCostCatalogStore` | `wgdom-cost-catalog-store.ts` | `tenders-sync.ts`, internal async load | **SYNC/DEFENSIVE** |
| `mergeWgdomCostCatalogForCloud` | `tenders-sync.ts` | cloud merge path (klucz poza `DATA_KEYS`) | **DEFENSIVE** |
| `getActiveCatalog` | `wgdom-cost-catalog-store.ts` | — (app) | **TEST** |
| `normalizeWgdomCostCatalogStore` | `wgdom-cost-catalog-store.ts` | internal store + testy | **INTERNAL/TEST** |
| `resolveCatalogForEngine` | `work-catalog-compat.ts` | `tender-active-catalog.ts` | **LIVE** |
| `resolveCatalogForUI` | `work-catalog-compat.ts` | — (app) | **DEAD** |
| `buildLegacyCostCatalogFromWorkStore` | `engine-adapter.ts` | `tender-active-catalog`, `catalog-rate-history-snapshot` | **LIVE** (nazwa legacy — nie usuwać) |

---

## 5. Removal Matrix

| ID | Artefakt | Akcja proponowana | Faza | Ryzyko | Gate przed merge |
|----|----------|-------------------|------|--------|------------------|
| R-01 | `work-catalog-reconcile-bootstrap.ts` | **DELETE** moduł | 1 | Niskie | `test-pb-write-reconcile.mjs` → retire lub przenieść na pure `work-catalog-reconcile.ts` bez orchestratora |
| R-02 | Barrel exports reconcile | **REMOVE** z `work-catalog/index.ts` | 1 | Niskie | `test-work-catalog-public-api.mjs` update |
| R-03 | `maybeExecuteWorkCatalogBootstrap` alias | **DELETE** | 1 | Niskie | grep + `test-5c-5b-bootstrap-decouple.mjs` |
| R-04 | `loadWgdomCostCatalogStore()` async | **DELETE** | 1 | Niskie | grep zero refs |
| R-05 | `saveLegacyCostCatalogRouted` + `appendCostCatalogHistoryRouted` | **DELETE** z routera + barrel | 2 | Średnie | `test-pb-write-router.mjs` — usuń legacy cases lub oznacz archived |
| R-06 | `saveWgdomCostCatalogStore` | **DELETE** po R-05 | 2 | Średnie | brak `persistKey` na `kw-wgdom-cost-catalog` |
| R-07 | `getActiveCatalog` (store) | **DELETE** lub przenieść do test helper | 2 | Niskie | tylko skrypty testowe |
| R-08 | `resolveCatalogForUI` / `isLegacyCatalog` / `resolveCatalogVersion` | **DELETE** (compat trim) | 2 | Niskie | `test-work-catalog-compat.mjs` |
| R-09 | `coerceValueForCloudKey` branch `WGDOM_COST_CATALOG_KEY` | **DELETE** | 3 | Niskie-średnie | `test-legacy-kv-sync-quiesce-5c5a.mjs` + import cleanup `cloud-sync.ts` |
| R-10 | `mergeWgdomCostCatalogForCloud` | **KEEP** lub DELETE po R-09 | 3 | Średnie | manual import/backup edge |
| R-11 | ONE-SHOT `loadWgdomCostCatalogStoreLocal` w bootstrap | **DELETE** po evidencji migracji | 4 | **Wysokie** | telemetria prod: % bez `migratedFromLegacyAt` · runbook ops migrate |
| R-12 | `wgdom-cost-catalog-store.ts` (cały plik) | **NO** w #5C-5C | — | **Krytyczne** | wymaga Fazy 4 + rename typów |
| R-13 | `wgdom-cost-catalog.ts` | **KEEP** (rename = osobny epic) | — | **Krytyczne** | silnik wyceny + Przetargi |
| R-14 | `kw-wgdom-cost-catalog-history` sync | **KEEP** | — | **Krytyczne** | #5C-3D SSOT historii |
| R-15 | `work-catalog-migrate.ts` | **KEEP** do Fazy 4 | — | Wysokie | PB-3 ONE-SHOT |

### 5.1 Pliki całkowicie martwe (runtime) — kandydaci Fazy 1

1. **`src/lib/work-catalog-reconcile-bootstrap.ts`** — 197 LOC orchestracji bez prod callerów  
2. **Funkcja `loadWgdomCostCatalogStore()`** — async cloud fetch legacy KV  
3. **Alias `maybeExecuteWorkCatalogBootstrap`** — deprecated, zero refs

### 5.2 Pliki częściowo martwe — wymagają fazy 2+

- **`wgdom-cost-catalog-store.ts`** — persist/load legacy KV; tylko ONE-SHOT + martwe write path  
- **`work-catalog-compat.ts`** — połowa API tylko testy  
- **`work-catalog-reconcile.ts`** — logika reconcile bez prod orchestratora (zachować dla ops/test lub usunąć z Fazą 1)

---

## 6. Risk Matrix

| Ryzyko | P | I | Mitygacja |
|--------|---|---|-----------|
| Usunięcie ONE-SHOT przed pełną migracją użytkowników | Średnie | Wysokie | Telemetria `migratedFromLegacyAt`; runbook manual migrate; nie w Fazie 1–2 |
| Usunięcie `coerceValueForCloudKey` legacy — import backup ze starym JSON | Niskie | Średnie | Klucz poza `DATA_KEYS`; backup import może nadal zawierać pole — test import path |
| Mixed bundle CORE+Payroll w #5C-5C | Średnie | Wysokie | #CORE-013 checklist; osobny commit tylko catalog lib |
| Diff `cloud-sync.ts` + router w jednym commicie | Średnie | Średnie | Split: Faza 1 bez cloud-sync; Faza 3 osobny commit cloud-sync only |
| Regresja deferred bootstrap timing (#6E) | Niskie | Średnie | Gate: `test-5c-5b-bootstrap-decouple.mjs` + payroll 15/15 |
| Usunięcie `wgdom-cost-catalog.ts` przez pomyłkę | Niskie | **Krytyczne** | Explicit KEEP w DF; rename = osobny epic |
| Usunięcie historii KV | Niskie | Wysokie | Explicit OUT OF SCOPE |
| Test-only API break (`test-work-catalog-compat`) | Wysokie | Niskie | Aktualizacja manifestu test-infra przy IMPLEMENT |

---

## 7. Boundary #CORE-013

### 7.1 Klasyfikacja #5C-5C

| Pole | Wartość |
|------|---------|
| **Klasa** | **CORE CATALOG** |
| **Dozwolone pliki (IMPLEMENT)** | `work-catalog-reconcile*.ts`, `work-catalog-bootstrap.ts`, `wgdom-cost-catalog-store.ts`, `catalog-write-router.ts`, `work-catalog/index.ts`, `work-catalog-compat.ts`, `tenders-sync.ts`, `cloud-sync.ts` (minimalny — Faza 3) |
| **Zakazane w tym samym commicie** | Payroll, PWRB, `CloudLoader.tsx`, `App.tsx`, Edge `index.tsx` |

### 7.2 Boundary check (planowany diff)

| Obszar | Dotknięty w #5C-5C? | Werdykt planowy |
|--------|---------------------|-----------------|
| Payroll / PWRB | **NIE** | **PASS** |
| `CloudLoader.tsx` | **NIE** | **PASS** |
| `App.tsx` | **NIE** | **PASS** |
| Edge | **NIE** | **PASS** |
| `cloud-sync.ts` | **TAK** (Faza 3 only — coerce cleanup) | **PASS** z warunkiem: jeden cel, brak innych diffów |
| `finalizePayrollBundleMerge` | **NIE** | **PASS** |
| `resolveActiveCatalogForTender` | **NIE** | **PASS** |
| `kw-wgdom-cost-catalog-history` sync | **NIE** | **PASS** |

### 7.3 Zasada commmitów (z #5C-5B DF)

- **Faza 1** — reconcile orchestrator + dead helpers: **bez** `cloud-sync.ts`  
- **Faza 2** — router legacy path: **bez** Payroll  
- **Faza 3** — `cloud-sync.ts` coerce: **osobny commit**  
- **Faza 4** — bootstrap ONE-SHOT removal: **osobny bundle** + Owner GO + evidencja migracji

---

## 8. Test & Gate Inventory (referencja dla IMPLEMENT)

| Gate | Skrypt | Dotyczy fazy |
|------|--------|--------------|
| #5C-5B regresja | `scripts/test-5c-5b-bootstrap-decouple.mjs` | Wszystkie |
| #5C-5A regresja | `scripts/test-legacy-kv-sync-quiesce-5c5a.mjs` | 3+ |
| PB-WRITE router | `scripts/test-pb-write-router.mjs` | 2 |
| PB-WRITE reconcile | `scripts/test-pb-write-reconcile.mjs` | 1 (retire/update) |
| Work catalog compat | `scripts/test-work-catalog-compat.mjs` | 2 |
| PB-3 bootstrap | `scripts/test-work-catalog-bootstrap-pb3.mjs` | 4 |
| Read SSOT | `scripts/test-tender-read-ssot-work-only-5c1.mjs` | Wszystkie |
| Payroll guard | gate payroll 15/15 | Wszystkie (CORE-013) |

**Nowy gate proponowany (#5C-5C):** `scripts/test-5c-5c-legacy-cleanup.mjs` — static + reachability (wzorzec #5C-5B).

---

## 9. GO / NO GO — #5C-5C

### 9.1 AUDIT closeout

| | |
|---|---|
| **Werdykt** | **GO** |
| **Uzasadnienie** | Reachability, removal matrix i boundary zdefiniowane; brak blokera na Design Freeze |

### 9.2 IMPLEMENT (całość bundle #5C-5C)

| | |
|---|---|
| **Werdykt** | **NO GO** |
| **Blokery** | Brak `CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md` · brak Owner GO · Faza 4 wymaga evidencji migracji prod |

### 9.3 IMPLEMENT Faza 1 only (reconcile orphan + dead async load)

| | |
|---|---|
| **Werdykt** | **GO warunkowy** |
| **Warunki** | Design Freeze Fazy 1 · test gate · osobny commit CORE CATALOG · payroll 15/15 PASS |

### 9.4 IMPLEMENT big-bang (usunięcie całego `wgdom-cost-catalog-store.ts`)

| | |
|---|---|
| **Werdykt** | **NO GO** |
| **Uzasadnienie** | ONE-SHOT PB-3 · defensywny coerce · router legacy path · historia zależy od typów store |

---

## 10. Następne kroki (poza AUDIT)

1. **Owner review** tego AUDIT  
2. **`CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md`** — scope per faza (R-01…R-15)  
3. **IMPLEMENT Faza 1** — tylko na explicit polecenie  
4. **Telemetria / ops** przed Fazą 4 — lista urządzeń bez `migratedFromLegacyAt`

---

## 11. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md`](CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md) | Poprzednik — decouple DONE |
| [`CORE-01A-DESIGN-FREEZE.md`](CORE-01A-DESIGN-FREEZE.md) | #CORE-013 Runtime Freeze |
| [`../AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md) | Status epic #5C-5 |

---

*AUDIT ONLY · 2026-07-06 · baseline 2.63.51 / 50dae97 / 82d5075*
