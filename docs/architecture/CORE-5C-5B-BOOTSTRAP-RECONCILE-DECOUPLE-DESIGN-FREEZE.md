# #5C-5B — Bootstrap / Reconcile Decouple · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0 — APPROVED (docs-only)**  
> **Tryb:** AUDIT → PLAN → DESIGN FREEZE · **IMPLEMENT = BLOCKED** (do owner GO)  
> **Data freeze:** 2026-07-06  
> **Bundle ID:** #5C-5B  
> **Klasa:** **CORE CATALOG** (#CORE-013 — bez Payroll / PWRB / Edge)  
> **Baseline prod:** UI **2.63.50** · feature `36b3ddd` · commit `5474707` · HEAD docs `1b29591`  
> **STABILIZATION WINDOW:** ACTIVE · W02 werdykt **`STABLE`**  
> **Poprzednik:** #5C-5A Legacy KV Sync Quiesce **CLOSED FINAL**  
> **Powiązane:** [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md) · [AGENT-CONTINUITY-GUIDE.md](../AGENT-CONTINUITY-GUIDE.md) · [STABILIZATION-WEEKLY-W02-2026-07-06.md](../stabilization-weekly/STABILIZATION-WEEKLY-W02-2026-07-06.md)

```text
CEL:           Usunąć cykliczny odczyt legacy + reconcile z deferred bootstrap.
ZASADA:        Work Catalog SSOT z chmury (#6E); legacy LS nie jest źródłem prawdy po #5C-5A.
WYJĄTEK:       ONE-SHOT PB-3 migrate tylko scenariusz B (patrz §2 Runtime Telemetry).
ZAKAZ:         Payroll · PWRB · CloudLoader · Edge · #6E state machine · reconcile co sesję.
GATE IMPLEMENT: Owner GO + Exit Criteria §9 + soak #5C-5A bez regresji.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | Decouple bootstrap/reconcile od `kw-wgdom-cost-catalog` na ścieżce deferred bootstrap |
| **Poza zakresem #5C-5B** | Usunięcie `wgdom-cost-catalog-store.ts` (#5C-5C) · UI Przetargów · Payroll · Edge |
| **Nowe pole KV** | **Brak** |
| **Zmiana merge Payroll / PWRB** | **Brak** (twardy zakaz) |
| **Zmiana BOOTSTRAP_DEFERRED_KEYS** | **Brak** (legacy już wyłączony w #5C-5A) |
| **Principles #5C-5B** | **#5C5B-001–#5C5B-010** (§1.3) |

### Final Decision

**APPROVED (docs-only)** — Design Freeze kompletny. **IMPLEMENT pozostaje BLOCKED** do spełnienia Exit Criteria §9 + jawnego **Owner GO**.

---

## 1. Scope Bundle

### 1.1 Principles (#5C-5B)

| ID | Zasada |
|----|--------|
| **#5C5B-001** | Po #5C-5A legacy **nie** synchronizuje się z chmurą — runtime **nie** może traktować legacy LS jako źródła ciągłej aktualizacji. |
| **#5C5B-002** | `maybeExecuteWorkCatalogReconcile()` **nie** jest wywoływany z deferred bootstrap (żadna ścieżka). |
| **#5C5B-003** | Scenariusz A (zmigrowany): **zero** odczytu `kw-wgdom-cost-catalog`. |
| **#5C5B-004** | Scenariusz B: dopuszczalny **wyłącznie ONE-SHOT** PB-3 migrate (bez reconcile po migrate). |
| **#5C5B-005** | `WGDOM_DEFERRED_BOOTSTRAP_EVENT` **musi** zostać dispatch po zakończeniu fazy (zgodność #6E). |
| **#5C5B-006** | `fetchAndMergeDeferredBootstrap` kolejność: merge deferred keys → **nowy** hook Work Catalog → event. |
| **#5C5B-007** | Zero diff w Payroll, PWRB, CloudLoader CORE, Edge. |
| **#5C5B-008** | Jeden bundle = jeden cel — bez #5C-5C cleanup w tym samym commicie. |
| **#5C5B-009** | Rollback = revert commit + brak migracji danych KV (tylko zachowanie runtime). |
| **#5C5B-010** | Test manifest: nowy `LIB-5C-5B-BOOTSTRAP-DECOUPLE` + regresja PB-3 / 5C-5A / 6E. |

### 1.2 Pliki W ZAKRESIE (IMPLEMENT — po GO)

| Plik | Rodzaj zmiany |
|------|----------------|
| `src/lib/work-catalog-bootstrap.ts` | **REFACTOR** — nowa semantyka `finalizeWorkCatalogAfterDeferredMerge` (nazwa robocza); usunięcie wywołania reconcile |
| `src/lib/work-catalog-reconcile-bootstrap.ts` | **MODIFY** — `maybeExecuteWorkCatalogReconcile` nie wołany z bootstrap; orchestrator pozostaje dla testów / przyszłego #5C-5C |
| `src/lib/cloud-sync.ts` | **MINIMAL** — zamiana wywołania `maybeExecuteWorkCatalogBootstrap` → nowy entry point (1 blok, dynamic import) |
| `scripts/test-work-catalog-bootstrap-pb3.mjs` | **MODIFY** — scenariusze B1–B8 pod decouple |
| `scripts/test-5c-5b-bootstrap-decouple.mjs` | **NEW** — gate #5C-5B |
| `test-infra/test-manifest.json` | **MODIFY** — `LIB-5C-5B-BOOTSTRAP-DECOUPLE` w suite `smoke-work-catalog-p2-mvp` |
| `src/app/changelog-data.ts` | **MODIFY** — wpis wersji (przy IMPLEMENT) |
| `CHANGELOG.md` | **MODIFY** — skrót (przy IMPLEMENT) |
| `docs/ARCHITECTURE.md` | **MODIFY** — § 12.1.18b PB-3 / deferred bootstrap (przy CLOSEOUT) |

### 1.3 Pliki POZA ZAKRESEM (NIE DOTYKAĆ)

| Obszar | Pliki / moduły |
|--------|----------------|
| **Payroll / PWRB** | `payroll-week-roster-bundle.ts`, `payroll-*`, `CloudSyncMutationGuard`, `finalizePayrollBundleMerge`, `mergeWeekEmployees` |
| **CloudLoader CORE** | `CloudLoader.tsx` — faza CORE keys, payroll bootstrap merge, `setReady` |
| **#6E state machine** | `deferred-bootstrap-state.ts`, `deferred-bootstrap-hydrate.ts`, `DeferredBootstrapContext.tsx` |
| **Edge** | `supabase/functions/make-server-0afb8820/index.tsx` |
| **App.tsx** | Cały plik |
| **Read SSOT Przetargów** | `tender-active-catalog.ts`, `resolveActiveCatalogForTender` |
| **Write router** | `catalog-write-router.ts` (poza testami regresji) |
| **Legacy store cleanup** | `wgdom-cost-catalog-store.ts` usuwanie / deprecate (#5C-5C) |
| **Historia KV** | `kw-wgdom-cost-catalog-history` sync |
| **#5C-5C** | Pełne usunięcie legacy path, `coerceValueForCloudKey` cleanup |

---

## 2. Runtime Telemetry Matrix

Legenda:
- **Bootstrap legacy read** — `loadWgdomCostCatalogStoreLocal()` na ścieżce deferred
- **Reconcile** — `maybeExecuteWorkCatalogReconcile()` / `reconcileLegacyToWorkCatalog()`
- **Migrate** — ONE-SHOT `migrateLegacyCostCatalogStoreToWorkCatalog` + `saveWorkCatalogRouted`
- **Remove legacy path** — czy po #5C-5B można pominąć legacy w runtime

| Scenariusz | Opis | Bootstrap czyta legacy? (TERAZ) | Reconcile potrzebny? (TERAZ) | Migrate wymagana? | Usunąć legacy path? (#5C-5B TARGET) |
|------------|------|--------------------------------|-----------------------------|-------------------|-------------------------------------|
| **A** | User zmigrowany (`migratedFromLegacyAt` set) | TAK (każda sesja) | TAK (każda sesja) | NIE | **TAK** — zero legacy read, zero reconcile |
| **B** | Legacy LS niepusty, Work Catalog pusty, brak `migratedFromLegacyAt` | TAK | TAK (po migrate) | **TAK** (ONE-SHOT) | **CZĘŚCIOWO** — legacy read **tylko** przy ONE-SHOT; bez reconcile |
| **C** | Legacy LS pusty / default seed (`legacy_empty`) | TAK (odczyt) | TAK (skip w reconcile) | NIE | **TAK** — zero legacy read |
| **D** | Nowa instalacja (brak LS, deferred merge z chmury) | TAK (default legacy przy pierwszym read) | TAK | NIE — work z KV | **TAK** — work z deferred merge only |
| **E** | Stary user sprzed #5C-2 (`catalogWriteMode=split` w chmurze) | TAK | TAK (może apply delta) | Zależy od stanu work | **TAK** dla reconcile; split write już zablokowany dla nowych zapisów legacy w UI; ONE-SHOT jak B jeśli work pusty |

### 2.1 Szczegóły scenariuszy (docelowe zachowanie po IMPLEMENT)

#### A — Zmigrowany (dominujący prod po #5C)

| Pole | Wartość |
|------|---------|
| Bootstrap legacy read | **NIE** |
| Reconcile | **NIE** |
| Migrate | **NIE** |
| Telemetry | `WORK_CATALOG_DEFERRED_FINALIZE skipped reason=already_migrated` |

#### B — Legacy LS + pusty work (edge / stare urządzenie)

| Pole | Wartość |
|------|---------|
| Bootstrap legacy read | **TAK** (jednorazowo) |
| Reconcile | **NIE** |
| Migrate | **TAK** — PB-3 ONE-SHOT, `migratedFromLegacyAt` set |
| Telemetry | `ONE_SHOT_MIGRATE executed` · `reconcile=disabled` |
| Ryzyko | Legacy LS może być **stale** vs chmura (post-#5C-5A) — akceptowane jako last-resort local |

#### C — Legacy pusty

| Pole | Wartość |
|------|---------|
| Bootstrap legacy read | **NIE** |
| Reconcile | **NIE** |
| Migrate | **NIE** |

#### D — Nowa instalacja

| Pole | Wartość |
|------|---------|
| Bootstrap legacy read | **NIE** |
| Reconcile | **NIE** |
| Migrate | **NIE** — work catalog z `kw-wgdom-work-catalog` deferred merge |
| Telemetry | `WORK_CATALOG_SOURCE=deferred_merge` |

#### E — `catalogWriteMode=split` (historyczny)

| Pole | Wartość |
|------|---------|
| Bootstrap legacy read | **NIE** (po migrate) / ONE-SHOT jak B jeśli work pusty |
| Reconcile | **NIE** — reconcile był mechanizmem dual-write; po #5C-2 SSOT write = work |
| Migrate | Jak B jeśli niezmigrowany |
| Uwaga | Ongoing reconcile **nie** przywraca spójności z chmurą legacy (sync wyłączony #5C-5A) |

### 2.2 Werdykt Runtime Telemetry Matrix (design-time)

| Check | Status |
|-------|--------|
| Scenariusze A–E opisane | **PASS** |
| Dominujący prod (A) — zero legacy/reconcile | **PASS** |
| Edge B — ONE-SHOT bez reconcile | **PASS** (świadomy kompromis) |
| Brak wymogu reconcile co sesję | **PASS** |

---

## 3. Docelowy Flow

### 3.1 Aktualny (prod 2.63.50)

```text
CloudLoader
  ↓
fetchAndMergeDeferredBootstrap()
  ↓ merge BOOTSTRAP_DEFERRED_KEYS (bez kw-wgdom-cost-catalog po #5C-5A)
maybeExecuteWorkCatalogBootstrap()
  ↓ loadWgdomCostCatalogStoreLocal()     ← LEGACY READ
  ↓ decideWorkCatalogBootstrap
  ↓ [optional] migrateLegacy → saveWorkCatalogRouted
maybeExecuteWorkCatalogReconcile()       ← RECONCILE (zawsze)
  ↓ loadWgdomCostCatalogStoreLocal()     ← LEGACY READ
  ↓ reconcileLegacyRatesIntoWorkStore → [optional] saveWorkCatalogRouted
dispatch WGDOM_DEFERRED_BOOTSTRAP_EVENT
```

### 3.2 Docelowy (#5C-5B)

```text
CloudLoader
  ↓
fetchAndMergeDeferredBootstrap()
  ↓ merge BOOTSTRAP_DEFERRED_KEYS (bez zmian listy)
finalizeWorkCatalogAfterDeferredMerge()   ← nazwa robocza SSOT
  ↓ loadWorkCatalogStoreLocal()
  ↓ IF migratedFromLegacyAt OR workCount>0 → SKIP (no legacy)
  ↓ ELSE IF legacy_has_rates AND work_empty → ONE_SHOT_MIGRATE (PB-3)
  ↓ ELSE → SKIP
  ↓ NEVER call reconcile
dispatch WGDOM_DEFERRED_BOOTSTRAP_EVENT   ← bez zmian (#6E)
```

### 3.3 Invariants (niezmienne)

| # | Invariant |
|---|-----------|
| I-1 | `CloudLoader.tsx` nie zmienia się |
| I-2 | `BOOTSTRAP_CORE_KEYS` / payroll merge w fazie 1 bez zmian |
| I-3 | `BOOTSTRAP_DEFERRED_KEYS` bez `kw-wgdom-cost-catalog` (#5C-5A) |
| I-4 | Event `wgdom-deferred-bootstrap` zawsze po zakończeniu deferred fazy |
| I-5 | `resolveActiveCatalogForTender()` — work-only (#5C-1) bez zmian |

---

## 4. Boundary Check #CORE-013

| Obszar | Diff w #5C-5B? | Werdykt |
|--------|----------------|---------|
| **Payroll** | **NIE** | **PASS** |
| **PWRB** | **NIE** | **PASS** |
| **Edge** | **NIE** | **PASS** |
| **App.tsx** | **NIE** | **PASS** |
| **Deferred Bootstrap state machine (#6E)** | **NIE** — tylko zachowanie hooka po merge | **PASS** |
| **CloudLoader.tsx** | **NIE** | **PASS** |
| **cloud-sync.ts** | **TAK** — wyłącznie zamiana 1 wywołania orchestratora katalogu | **PASS** z warunkiem: brak innych diffów w pliku |
| **finalizePayrollBundleMerge / mergeWeekEmployees** | **NIE** | **PASS** |

**#CORE-013 bundle classification:** **CORE CATALOG** — dopuszczalny osobny commit; **zakaz** plików Payroll w tym samym commicie.

---

## 5. File Matrix

| Plik | Modyfikacja | Usunięcie | Bez zmian |
|------|:-----------:|:---------:|:---------:|
| `src/lib/work-catalog-bootstrap.ts` | **●** | | |
| `src/lib/work-catalog-reconcile-bootstrap.ts` | **●** | | |
| `src/lib/work-catalog-reconcile.ts` | | | **●** (pure lib; testy PB-WRITE-C) |
| `src/lib/cloud-sync.ts` | **●** (1 hook) | | |
| `src/lib/work-catalog/work-catalog-migrate.ts` | | | **●** |
| `src/lib/wgdom-cost-catalog-store.ts` | | | **●** (#5C-5C) |
| `src/lib/catalog-write-router.ts` | | | **●** |
| `src/lib/tender-active-catalog.ts` | | | **●** |
| `src/app/CloudLoader.tsx` | | | **●** |
| `src/lib/deferred-bootstrap-state.ts` | | | **●** |
| `src/app/context/DeferredBootstrapContext.tsx` | | | **●** |
| `src/app/App.tsx` | | | **●** |
| `supabase/functions/.../index.tsx` | | | **●** |
| `payroll-week-roster-bundle.ts` | | | **●** |
| `scripts/test-work-catalog-bootstrap-pb3.mjs` | **●** | | |
| `scripts/test-pb-write-reconcile.mjs` | | | **●** (reconcile lib; nie deferred path) |
| `scripts/test-legacy-kv-sync-quiesce-5c5a.mjs` | **●** (T8 assert na nowy hook) | | |
| `scripts/test-deferred-bootstrap-state-6e.mjs` | | | **●** |
| `scripts/test-5c-5b-bootstrap-decouple.mjs` | **●** NEW | | |
| `test-infra/test-manifest.json` | **●** | | |

---

## 6. Rollback Plan

### 6.1 Przed deploy (pre-merge)

| Krok | Akcja |
|------|--------|
| 1 | Tag git: `pre-5c-5b-{sha}` na `main` przed merge IMPLEMENT |
| 2 | Zapis baseline: `version.json` = 2.63.50 · feature `36b3ddd` |
| 3 | Gate lokalny: PB-3 + 5C-5A + 6E + nowy 5C-5B — wszystkie PASS |

### 6.2 Po deploy (revert runtime)

| Krok | Akcja |
|------|--------|
| 1 | `git revert` commitu #5C-5B (jeden revert commit) |
| 2 | Push `main` → Vercel redeploy |
| 3 | Verify `version.json` — oczekiwana wersja po revert (2.63.50 lub patch revert) |
| 4 | **Brak** rollbacku KV — dane Work Catalog w chmurze nietknięte |
| 5 | Zachowanie wraca do: bootstrap + reconcile co sesję (stan sprzed #5C-5B) |

**Uwaga:** Jeśli ONE-SHOT migrate wykona się na urządzeniu **po** deploy #5C-5B, revert **nie** cofa `migratedFromLegacyAt` — to akceptowalne (forward-only).

### 6.3 Recovery user legacy (scenariusz B / E)

| Sytuacja | Recovery |
|----------|----------|
| User z stale legacy LS, pusty work, **przed** ONE-SHOT | Po revert stare zachowanie PB-3+reconcile wraca |
| User po ONE-SHOT bez reconcile | Work Catalog w LS+chmurze — SSOT work; legacy LS ignorowany |
| User potrzebuje re-importu legacy | **Poza #5C-5B** — skrypt ops / manual `migrateLegacyCostCatalogStoreToWorkCatalog` + `saveWorkCatalogRouted` (runbook #5C-5C) |
| Utrata work catalog w chmurze | Restore z backupu KV `kw-wgdom-work-catalog` (klasa B Application Backup) |

---

## 7. Test Matrix

### 7.1 Wymagane przed IMPLEMENT CLOSE

| ID | Skrypt / suite | Cel | Tier |
|----|----------------|-----|------|
| **PB-3** | `scripts/test-work-catalog-bootstrap-pb3.mjs` | Guardy B1–B8 pod decouple; ONE-SHOT B | B |
| **PB-WRITE-C** | `scripts/test-pb-write-reconcile.mjs` | Pure reconcile lib — **bez** wywołania z deferred | B |
| **5C-5A regresja** | `scripts/test-legacy-kv-sync-quiesce-5c5a.mjs` | Legacy poza DATA_KEYS; hook T8 zaktualizowany | B |
| **#6E** | `scripts/test-deferred-bootstrap-state-6e.mjs` | Event + state bez regresji | B |
| **5C-5B NEW** | `scripts/test-5c-5b-bootstrap-decouple.mjs` | Scenariusze A–E telemetry; brak reconcile w mock deferred | B |
| **Write router** | `scripts/test-pb-write-router.mjs` | `work_only` bez regresji | B |
| **Manifest** | `test-infra/test-manifest.json` | `LIB-5C-5B-BOOTSTRAP-DECOUPLE` w `smoke-work-catalog-p2-mvp` | B |
| **Orchestrator** | `npm run test:infra -- --gate B --scope work-catalog` | Agregat PASS | B |

### 7.2 Nowy test `LIB-5C-5B-BOOTSTRAP-DECOUPLE` (spec)

| Case | Assert |
|------|--------|
| T1 | Scenariusz A: `migratedFromLegacyAt` → zero `getItem(kw-wgdom-cost-catalog)` w finalize |
| T2 | Scenariusz A: `maybeExecuteWorkCatalogReconcile` **nie** wywołany (mock/spy) |
| T3 | Scenariusz B: ONE-SHOT migrate gdy legacy rates > 0 i work empty |
| T4 | Scenariusz B: po ONE-SHOT **brak** reconcile |
| T5 | Scenariusz C/D: skip bez legacy read |
| T6 | `fetchAndMergeDeferredBootstrap` kończy się dispatch event (mock) |
| T7 | Regresja: `kw-wgdom-cost-catalog` nie w batch-get deferred |
| T8 | `#CORE-013` — plik diff nie zawiera `payroll-week-roster-bundle` / `finalizePayrollBundleMerge` |

### 7.3 Poza gate #5C-5B (nie blokuje, monitor)

| Test | Uwaga |
|------|-------|
| `test-material-history.mjs` | Pre-existing 9/12 fixture drift |
| `npm run test:infra -- --scope payroll` | Regresja Payroll — uruchomić, nie modyfikować |

---

## 8. Exit Criteria (bramka IMPLEMENT)

Bundle IMPLEMENT można rozpocząć **tylko** gdy:

| # | Kryterium | Status (2026-07-06) |
|---|-----------|------------------------|
| ☐ | **Runtime Telemetry Matrix PASS** | **PASS** (§2.2 — design-time) |
| ☐ | **Boundary #CORE-013 PASS** | **PASS** (§4) |
| ☐ | **Rollback gotowy** | **PASS** (§6 udokumentowany) |
| ☐ | **Test Matrix kompletny** | **PASS** (§7 spec; skrypt NEW — przy IMPLEMENT) |
| ☐ | **Owner GO** | **PENDING** |
| ☐ | **Soak #5C-5A** (W02 STABLE + brak regresji prod) | **PASS** (W02); kontynuacja obserwacji zalecana |
| ☐ | **DESIGN FREEZE APPROVED** | **PASS** (ten dokument) |

**IMPLEMENT:** **BLOCKED** do zaznaczenia **Owner GO**.

---

## 9. Kolejność IMPLEMENT (po GO — nie wykonywać teraz)

```text
1. REFACTOR work-catalog-bootstrap.ts (finalize + ONE-SHOT)
2. REMOVE reconcile call z bootstrap chain
3. PATCH cloud-sync.ts hook (1 blok)
4. NEW test-5c-5b-bootstrap-decouple.mjs
5. UPDATE test-work-catalog-bootstrap-pb3.mjs + test-legacy-kv-sync-quiesce-5c5a.mjs
6. UPDATE test-manifest.json (suite 29 testIds)
7. npm run build
8. Gate B work-catalog
9. CHANGELOG + ARCHITECTURE §12.1.18b
10. COMMIT → PUSH → VERIFY → CLOSEOUT
```

**Wersja docelowa UI:** patch **2.63.51** (propozycja — przy IMPLEMENT).

---

## 10. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| AUDIT #5C-5B (sesja 2026-07-06) | Call graph · risk matrix |
| [STABILIZATION-WEEKLY-W02-2026-07-06.md](../stabilization-weekly/STABILIZATION-WEEKLY-W02-2026-07-06.md) | STABLE · #5C-5B BLOCKED → odblokowany do PLAN |
| [PROJECT-HANDOFF-CURRENT.md](../PROJECT-HANDOFF-CURRENT.md) | Baseline 2.63.50 |
| #5C-5C (BACKLOG) | Legacy cleanup po CLOSE #5C-5B |

---

## 11. Podsumowanie decyzji produktowej

| Pytanie | Decyzja freeze |
|---------|----------------|
| Czy usuwamy PB-3 całkowicie? | **NIE** — ONE-SHOT dla scenariusza B |
| Czy usuwamy reconcile z deferred? | **TAK** — #5C5B-002 |
| Czy czytamy legacy co sesję dla zmigrowanych? | **NIE** — #5C5B-003 |
| Czy jeden bundle? | **TAK** — CORE CATALOG #5C-5B |
| Czy #5C-5C w tym samym bundle? | **NIE** |

**DESIGN FREEZE v1.0 — APPROVED** · **IMPLEMENT — BLOCKED (Owner GO)**
