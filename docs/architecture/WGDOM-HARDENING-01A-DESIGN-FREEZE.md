# WGDOM-HARDENING-01A — DESIGN FREEZE (EPIC A · Persist SSOT)

> **ID:** WGDOM-HARDENING-01A  
> **STATUS:** DESIGN FREEZE COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (DF only)  
> **EPIC:** A — Persist SSOT (H1 + H2)  
> **Wejście:** [`WGDOM-HARDENING-01-PLAN.md`](./WGDOM-HARDENING-01-PLAN.md) · [`WGDOM-HARDENING-01-RCA.md`](./WGDOM-HARDENING-01-RCA.md) · [`WGDOM-HARDENING-01-AUDIT.md`](./WGDOM-HARDENING-01-AUDIT.md)  
> **Poza zakresem:** implementacja · ARCH REVIEW (następny) · commit · push  
> **Baseline tip:** `e666443` · UI **2.65.39**

```text
══════════════════════════════════════
WGDOM-HARDENING-01A DESIGN FREEZE
Scope: H1 Bootstrap local · H2 Persist contract
P0:   HEAVY E-RUN / breaker / builtAt — UNTOUCHED
══════════════════════════════════════
```

---

## 0. Zamrożone decyzje (executive)

| # | Decyzja | Wartość FROZEN |
|---|---------|----------------|
| **D1** | Wariant H1 | **H1-A** — mid-flight `{ persist: "local" }` + **≤1** terminal `{ persist: "cloud" }` (coalesce force) |
| **D2** | Wariant H2 | **H2-A + H2-C** — forward opts + jeden adapter SSOT |
| **D3** | Panel emit `persist` | **NIE w 01A** — typ zostaje z `opts?`; call sites panelu bez zmian emitów |
| **D4** | `updateItem` semantyka modes | **BEZ ZMIAN** — reuse existing `local` / `cloud` / default |
| **D5** | `pipelinePerfDebouncePersist` default | **BEZ ZMIAN** (`false`) — nie jest fixem 01A |
| **D6** | Heavy E-RUN / breaker / `HEAVY_E_RUN_DEP_KEYS` | **ZAKAZ DOTYKU** |
| **D7** | `builtAt` w E-RUN deps | **ZAKAZ** |
| **D8** | `cloud-sync.ts` / Edge / Payroll | **OUT** |
| **D9** | Rollback kill-switch | Flaga `pipelineBootstrapPersistLocal` default **`true`** (app-settings) |
| **D10** | Bundle class | HIGH Tenders persist · **FEATURE-adjacent** · zero CORE Sync files |

---

## 1. Cel (zamrożony)

1. **H1:** Bootstrap discovery/shell nie wykonuje natychmiastowego fat `saveTendersPipeline` przy każdym patchu.  
2. **H2:** Żaden UI wrapper nie gubi `TenderItemUpdateOpts` (arity).  
3. Heavy P0 (`partial local` / `final cloud`) działa **identycznie** jak na tipie 2.65.39.  
4. Mobile: mniej egress `batch-set` przy pierwszym open Dokumentów.

---

## 2. Docelowa architektura

### 2.1 Warstwy (SSOT)

```text
UI wrappers / Bootstrap / Heavy
        │
        │  onUpdate(patch, opts?: TenderItemUpdateOpts)
        ▼
bindTenderPipelineOnUpdate(updateItem, itemId)   ← NOWY adapter SSOT (H2-C)
        │
        ▼
useTendersPipeline.updateItem(id, patch, opts?)  ← BEZ zmiany semantyki modes
        │
        ├─ persist:"local"  → syncTenderPipelineLocalOnly
        ├─ persist:"cloud"  → scheduleTenderPipelinePersist(..., { force:true })
        └─ undefined        → debounce flag | saveTendersPipeline (legacy default)
```

**Zasada ZERO DUPLICATE:** zakaz nowego writer’a cloud/LS poza istniejącymi `syncTenderPipelineLocalOnly` / `scheduleTenderPipelinePersist` / `saveTendersPipeline`.

### 2.2 Typy (SSOT kontrakt)

```ts
// ISTNIEJĄCY SSOT — bez zmiany kształtu w 01A
export type TenderItemPersistMode = "local" | "cloud";
export type TenderItemUpdateOpts = { persist?: TenderItemPersistMode };

export type TenderItemOnUpdate = (
  patch: Partial<TenderPipelineItem>,
  opts?: TenderItemUpdateOpts,
) => void;
```

| Konsument | Typ `onUpdate` po 01A |
|-----------|------------------------|
| `useTenderDossierHeavyLazy` | bez zmian (już pełny) |
| `useTenderPipelineRuntime` | bez zmian (już pełny) |
| `useTenderDocumentsBootstrap` / `attemptTenderDocumentsBootstrap` | **rozszerzyć** do `TenderItemOnUpdate` |
| `TenderDetailPanel` | **zostaje** `opts?` w typie (bez wymuszania emitów) |
| Wrappers Detail/List | **tylko** przez `bindTenderPipelineOnUpdate` |

### 2.3 Adapter SSOT (H2-C) — FROZEN API

**Plik (NOWY):** `src/lib/tender-pipeline/bind-tender-pipeline-on-update.ts`

```ts
export function bindTenderPipelineOnUpdate(
  updateItem: (
    id: string,
    patch: Partial<TenderPipelineItem>,
    opts?: TenderItemUpdateOpts,
  ) => void,
  itemId: string,
): TenderItemOnUpdate {
  return (patch, opts) => updateItem(itemId, patch, opts);
}
```

- Jedyna dozwolona forma podpinania `pipeline.updateItem` pod `onUpdate` w UI 01A.  
- Zakaz inline `(patch) => updateItem(id, patch)` w plikach IN.

---

## 3. Diagram przepływu persist

### 3.1 Bootstrap po 01A (H1)

```text
attemptTenderDocumentsBootstrap
 │
 ├─ discovery.patch nonempty?
 │     YES → onUpdate(discovery.patch, { persist: "local" })
 │             → syncTenderPipelineLocalOnly  (LS + session)
 │             → React setItems
 │             ✗ natychmiastowy saveTendersPipeline / persistKey
 │
 ├─ shellPatch nonempty?
 │     YES → onUpdate(shellPatch, { persist: "local" })
 │             → j.w. local only
 │
 └─ appliedAnyPatch && !cancelled && flag ON?
       YES → onUpdate({}, { persist: "cloud" })   // terminal flush ≤1
               → scheduleTenderPipelinePersist(next, { force: true })
               → coalesce → persistKey(kw-tenders-pipeline)  // 1× cloud
       NO  → brak cloud z bootstrapu tej sesji run
```

**Uwagi FROZEN:**

| Reguła | Wartość |
|--------|---------|
| Mid-flight | wyłącznie `"local"` |
| Terminal cloud | **co najwyżej jeden** na udany run z ≥1 patch |
| Empty patch + cloud | dozwolone jako flush (może bumpnąć `updatedAt` itemu) — akceptowane |
| Flag OFF | zachowanie **pre-01A**: `onUpdate(patch)` bez opts (default cloud path) |
| `onDiscoveryMerged` | bez zmian (UI-only, nie persist) |

### 3.2 Heavy (UNCHANGED — Sync Storm P0)

```text
partial → onUpdate(partial, { persist: "local" })
final   → onUpdate(final,   { persist: "cloud" })
```

### 3.3 Manual UI / default (UNCHANGED semantyka)

```text
onUpdate(patch)  // bez opts
  → updateItem default branch
  → debounce OFF → saveTendersPipeline (cloud)   // user durability
```

### 3.4 Legacy wrapper po 01A (H2)

```text
PRZED:  onUpdate={(patch) => pipeline.updateItem(id, patch)}     // DROP opts
PO:     onUpdate={bindTenderPipelineOnUpdate(pipeline.updateItem, id)}
```

---

## 4. Kontrakty szczegółowe

### 4.1 `TenderItemUpdateOpts` / `updateItem`

| Mode | Zachowanie (FROZEN — bez zmiany implementacji updateItem) |
|------|-------------------------------------------------------------|
| `"local"` | `syncTenderPipelineLocalOnly(next)` |
| `"cloud"` | `scheduleTenderPipelinePersist(next, { force: true })` |
| `undefined` | debounce flag → schedule; else `saveTendersPipeline` |

**01A nie dodaje** trzeciego mode (`"none"`) — OUT (unika rozrostu kontraktu).

### 4.2 Bootstrap — sygnatury FROZEN

```ts
// attemptTenderDocumentsBootstrap / useTenderDocumentsBootstrap
onUpdate: TenderItemOnUpdate;  // was (patch) => void

// wewnątrz hook effect — FORWARD opts (zakaz strip)
onUpdate: (patch, opts) => onUpdateRef.current(patch, opts)
```

### 4.3 Kill-switch FROZEN

| Pole | Wartość |
|------|---------|
| Key | `pipelineBootstrapPersistLocal` w `AppSettings` |
| Default | **`true`** (po wdrożeniu 01A) |
| `false` | Bootstrap woła `onUpdate(patch)` **bez** opts (legacy immediate cloud) — **oraz** pomija terminal cloud flush dedykowany |
| UI | Super Admin (opcjonalnie w DF implement: checkbox obok innych `pipelinePerf*`) — **min.:** load/save settings bez UI też OK jeśli DF implement wybierze code-only flag read |

### 4.4 Zakazy kontraktowe (P0)

| Zakaz | Status |
|-------|--------|
| Zmiana `HEAVY_E_RUN_DEP_KEYS` | FORBIDDEN |
| `builtAt` / `parserVersion` w E-RUN deps | FORBIDDEN |
| Zmiana `HEAVY_MAX_RUNS_PER_KEY` / `heavyRunKey` | FORBIDDEN |
| Partial heavy → cloud | FORBIDDEN |
| Nowy duplicate persist writer | FORBIDDEN |
| Dotyk `cloud-sync.ts` | FORBIDDEN w bundle 01A |

---

## 5. Komponenty zmieniane (IN)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-pipeline/bind-tender-pipeline-on-update.ts` | **NOWY** — adapter SSOT |
| `src/app/hooks/useTenderDocumentsBootstrap.ts` | Typ `onUpdate`; local mid-flight; terminal cloud; forward opts w effect; honor flag |
| `src/lib/app-settings.ts` | Pole `pipelineBootstrapPersistLocal` default `true` + load/merge |
| `src/app/TenderDetailPage.tsx` | L496: replace drop-wrapper → `bindTenderPipelineOnUpdate` |
| `src/app/TendersView.tsx` | L478: j.w. |
| `scripts/test-wgdom-hardening-01a-persist.mjs` | **NOWY** — A-T1…A-T3 |
| `src/app/changelog-data.ts` | Bump wersji UI przy release 01A |
| `docs/architecture/WGDOM-HARDENING-01A-*` | IMPLEMENT / OV / PV / CLOSEOUT (późniejsze fazy) |

**Opcjonalnie IN (jeśli przy implementacji wykryte kolejne drop-wrappers):**

- Inne `(patch) => pipeline.updateItem(id, patch)` w `src/app/**` — **musi** przejść na adapter (grep gate w testach).

**AdminSettings UI** dla flagi: **OPCJONALNY IN** — nie blokuje DoD jeśli flaga działa przez settings JSON/local.

---

## 6. Komponenty niezmieniane (OUT)

| Plik / obszar | Powód |
|---------------|--------|
| `useTenderDossierHeavyLazy.ts` | Heavy E-RUN / breaker / persist modes P0 |
| `HEAVY_E_RUN_DEP_KEYS` / circuit breaker | EPIC B / P0 |
| `tender-autonomous-run-fingerprint.ts` | EPIC E |
| `cloud-sync.ts` / `cloud-batch-set-retry.ts` | EPIC C / CORE |
| `supabase/functions/**` | Edge OUT |
| `Payroll*` / fence / PWRB | Protected Core |
| `TenderDetailPanel.tsx` call sites emitów | Brak redesign emit `persist` w 01A |
| `tender-pipeline-persist-coalesce.ts` semantyka | Reuse as-is (`force: true` już OK) |
| `useTendersPipeline.ts` `updateItem` body | Semantyka modes FROZEN bez zmian |
| ARCH-02F / kv-mset-chunk / TEUX WIP | Mixed WT — OUT |

**Uwaga:** `TenderDetailPage.onUpdateItem` (L158–160) już forwarduje — **zostaje**; wolno refaktorować na adapter dla spójności (OPCJONALNE, nie required).

---

## 7. Wpływ na Production

| Obszar | Oczekiwany efekt |
|--------|------------------|
| Open Dokumentów (bootstrap) | Mid-flight: 0 fat cloud; terminal: ≤1 coalesce cloud |
| Empiria vs Final Audit | Δset/open ↓ względem residual H1 (cel: bliżej DoD P0) |
| Manual edit w panelu | Bez zmian (default cloud) |
| Heavy MOPS | Bez zmian P0 |
| Lista Płac | **Zero** |
| Mobile egress | Spadek przy pierwszym open |
| Kill-switch OFF | Natychmiastowy powrót do pre-01A bootstrap cloud behavior |

**Ryzyka prod (zaakceptowane w DF):**

| Ryzyko | Mitygacja |
|--------|-----------|
| Kill app między local a terminal cloud | LS ma dane; po restarcie merge/LWW; OV: refresh 2. urządzenie |
| Empty-patch cloud bump `updatedAt` | Akceptowane; nie zmienia dossier content |
| Multi-tab podczas local-only | LWW jak dziś; nie włączamy global debounce |

---

## 8. Wpływ na Sync Storm P0

| Kontrakt P0 | 01A |
|-------------|-----|
| E-RUN deps bez `builtAt` | **NIE RUSZANE** |
| Partial `{ persist:"local" }` | **NIE RUSZANE** |
| Final `{ persist:"cloud" }` + force coalesce | **NIE RUSZANE** |
| Circuit breaker per FP max 2 | **NIE RUSZANE** |
| Bootstrap residual cloud | **REDUKCJA** (cel hardening) — poza kill-loop |
| Suite `test-tenders-sync-storm-p0.mjs` | **Must PASS bez zmian asercji P0** (wolno dodać osobne testy 01A) |

**Werdykt DF:** 01A jest **kompatybilne** z P0; nie jest amendmentem kontraktu heavy.

---

## 9. Plan migracji

```text
M0  ARCH REVIEW 01A + Boundary #CORE-014  → PASS
M1  Owner GO IMPLEMENT 01A
M2  Adapter + settings flag (default true)
M3  Bootstrap H1 (local + terminal cloud + flag)
M4  Wrappers H2 → bindTenderPipelineOnUpdate
M5  Test harness 01A + Sync Storm P0 regresja
M6  Changelog bump · build
M7  Owner Verification (A-T6 mobile / MOPS open Network)
M8  COMMIT (scope-only) · PUSH · VERIFY FAST version.json
M9  Production: porównać pipe Δset vs Final Audit baseline
M10 POST / CLOSE 01A → odblokuj EPIC D comparison
```

**Migracja danych:** brak migracji KV/LS schematu — tylko polityka writerów.

**Feature rollout:** flaga default ON; Super Admin może OFF bez revert (rollback soft).

---

## 10. Plan testów (FROZEN)

| ID | Opis | Must |
|----|------|------|
| **A-T1** | Bootstrap mid-flight: przy flag ON, po discovery/shell — **0** wywołań cloud path (`saveTendersPipeline` / `persistKey` pipeline) przed terminal flush; local sync wywołany | Must |
| **A-T2** | Bootstrap z ≥1 patch + !cancel → **dokładnie 1** terminal `persist:"cloud"` (coalesce force) | Must |
| **A-T3** | `bindTenderPipelineOnUpdate`: opts `{persist:"local"}` dociera do `updateItem` (arity) | Must |
| **A-T4** | Flag OFF → bootstrap bez opts (legacy cloud) — behavior pre-01A | Must |
| **A-T5** | Grep gate: brak `onUpdate={(patch) => pipeline.updateItem(` drop-pattern w `src/app/**` (whitelist jeśli potrzeba) | Must |
| **A-T6** | `scripts/test-tenders-sync-storm-p0.mjs` PASS | Must |
| **A-T7** | `vite build` OK | Must |
| **A-T8** | OV: open ciężki tender — Network: brak lawiny pipe set; thrash builtAt false | OV |
| **A-T9** | Mobile smoke (telefon): open Dokumenty — brak multi fat set mid-discovery | OV |

**Harness:** `scripts/test-wgdom-hardening-01a-persist.mjs` (vite-node), reuse mocki coalesce/local z istniejących testów NG11/Sync Storm gdzie możliwe (REUSE).

---

## 11. Rollback plan

| Poziom | Akcja | Czas |
|--------|-------|------|
| **L1 Soft** | `pipelineBootstrapPersistLocal = false` (settings) | Natychmiast, bez deploy |
| **L2 Revert** | `git revert` commit 01A | Standard FE push |
| **L3** | Nie rollbackować tip Sync Storm P0 / 2.65.38–39 | — |

Po rollback: VERIFY `version.json` + A-T6 smoke.

---

## 12. Acceptance Criteria

| # | Kryterium |
|---|-----------|
| AC1 | Przy flag ON: bootstrap discovery/shell używa wyłącznie `persist:"local"` mid-flight |
| AC2 | Przy flag ON i ≥1 patch: ≤1 terminal `persist:"cloud"` na run |
| AC3 | Przy flag OFF: zachowanie równoważne pre-01A (immediate default cloud na patch) |
| AC4 | Wszystkie IN wrappers używają `bindTenderPipelineOnUpdate` (A-T5 PASS) |
| AC5 | Heavy partial/final persist modes **niezmienione** (code review + A-T6) |
| AC6 | Brak zmian w E-RUN deps / breaker / `builtAt` |
| AC7 | Brak plików `cloud-sync.ts`, Edge, Payroll w diff 01A |
| AC8 | A-T1…A-T7 PASS · A-T8/A-T9 OV PASS |
| AC9 | Prod: brak wzrostu `anyThrash` / 522 vs Final Audit; residual pipe set nie rośnie |

---

## 13. Definition of Done

- [ ] Ten DF **FROZEN** (bez cichej zmiany D1–D10)  
- [ ] ARCHITECTURE REVIEW 01A **PASS**  
- [ ] Boundary #CORE-014 **FEATURE PASS** (projekcja)  
- [ ] Owner GO **IMPLEMENT 01A** (jawne)  
- [ ] Implementacja zgodna z §§2–6  
- [ ] Testy A-T* + OV  
- [ ] Changelog bump  
- [ ] COMMIT scope-only (Owner GO) · PUSH (Owner GO)  
- [ ] Production Verify FAST  
- [ ] POST-RELEASE note (Δset vs baseline)  
- [ ] CLOSE 01A  
- [ ] Aktualizacja `docs/AI/07` H-BOOT-CLOUD / H-LEGACY-OPTS status po CLOSE  

---

## 14. Boundary Check (projekcja #CORE-014)

```text
BUNDLE: WGDOM-HARDENING-01A
DOMINANT CLASS: FEATURE / HIGH Tenders persist
TOUCHES PROTECTED CORE: NIE
#CORE-013: NIE mieszać z cloud-sync / Edge / Payroll / ARCH-02F
```

| Plik | Klasa |
|------|-------|
| `bind-tender-pipeline-on-update.ts` | FEATURE / lib tenders |
| `useTenderDocumentsBootstrap.ts` | HIGH Tenders |
| `app-settings.ts` | PLATFORM settings (flaga) |
| `TenderDetailPage.tsx` / `TendersView.tsx` | UI |
| `changelog-data.ts` | UI |
| test script | TOOLING |

**Werdykt projekcji:** FEATURE PASS — pod warunkiem zero diff w Protected Core.

---

## 15. Następny krok procesu

```text
DF 01A ✓  →  ARCHITECTURE REVIEW 01A
          →  Boundary confirm
          →  Owner GO: IMPLEMENT 01A
```

**STOP** — brak implementacji / commit / push w tej fazie.

---

```text
WGDOM-HARDENING-01A DESIGN FREEZE COMPLETE
```
