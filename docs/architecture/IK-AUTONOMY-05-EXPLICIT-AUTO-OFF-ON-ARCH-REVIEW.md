# IK AUTONOMY-05 — Explicit AUTO / OFF / ON · ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW COMPLETE** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · ZERO CODE · ZERO SETTINGS WRITE |
| **Source** | [`IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md) |
| **Owner decisions** | OD-2 APPROVED · OD-2b ACCEPTED · Option B APPROVED |
| **Production** | **2.66.89** / **`d62eb2a`** (unchanged) |

```text
ARCH REVIEW = PASS WITH CONDITIONS
Architecture blockers = 0
Implementation = NOT AUTHORIZED (pending conditions + Owner GO)
```

---

## 1. Executive Verdict

Design Freeze dla Option B jest **architektonicznie poprawny i wykonalny** przy istniejącym kontrakcie `app-settings` + `ik-entry-flag` + `IkEntryHost`. Nie wymaga nowego engine, nowej flagi P5/P6 ani nowego orchestratora.

**Werdykt:** **PASS WITH CONDITIONS** — brak twardych blockerów architektury; implementacja wymaga zamrożenia kilku kontraktów merge/normalize oraz jednego skoordynowanego release (load + merge + save + UI + helpers + testy).

---

## 2. Design Freeze Consistency

| Obszar | DF claim | Kod / audyt | Werdykt |
|--------|----------|-------------|---------|
| Problem boolean | `=== true` collapse | `loadAppSettingsLocal` L422–425: `parsed.ikLaborE2eEnabled === true` | **CONFIRMED** |
| IkEntryHost binding EXISTS | reuse, nie nowy orchestrator | `IkEntryHost.tsx` L222–287: `useEffect` → Labor/Material Expert | **CONFIRMED** |
| MODE A = `executeResearch=false` | AUTO/ON nie włącza Research | `p5ResearchOn = isIkP5LaborExecuteResearchActive()`; expert L327: `executeResearch === true` only | **CONFIRMED** |
| Research osobny lever | CONDITIONAL | `resolveIkP5LaborExecuteResearch`: 3× `=== true` (entry + e2e + research) | **CONFIRMED** |
| B-POLICY migration | true→ON, missing→AUTO, false→AUTO | Deterministyczna po `normalizeIk*Mode()` | **FEASIBLE** |
| Kill-switch OFF | explicit `"OFF"` | Wymaga nowego merge (nie boolean) | **FEASIBLE** (warunek C1) |
| Admin UI 3-state | checkbox → select/radio | `AdminSettingsModal.tsx` L507–551: checkbox `=== true` | **REQUIRED CHANGE** (planowane) |
| Cloud/KV enum | przetrwa cykl JSON | `persistKey` stringify OK; merge bool **BREAKS** enum dziś | **FEASIBLE** po merge |
| Rollback fail-safe | enum → HOLD na starym kodzie | `"AUTO"|"OFF"|"ON"` przy `=== true` → false → HOLD | **CONFIRMED** |

**Niespójność DF vs PLAN (minor):** DF §9 mówi „explicit OFF trwałe przy hydration”, ale nie zamraża reguły **OFF wygrywa w merge** (PLAN §9: „3-way: OFF wygrywa”). To nie blokuje DF — wymaga doprecyzowania w implementacji (warunek C1).

---

## 3. Settings Contract Audit

### 3.1 Current boolean contract (evidence)

```422:425:src/lib/app-settings.ts
      ikLaborE2eEnabled: parsed.ikLaborE2eEnabled === true,
      ikLaborResearchEnabled: parsed.ikLaborResearchEnabled === true,
      ikMaterialE2eEnabled: parsed.ikMaterialE2eEnabled === true,
      ikMaterialResearchEnabled: parsed.ikMaterialResearchEnabled === true,
```

```348:350:src/lib/app-settings.ts
  if (remote?.ikLaborE2eEnabled === true) return true;
  if (remote?.ikLaborE2eEnabled === false) return false;
  return local.ikLaborE2eEnabled === true;
```

```468:471:src/lib/app-settings.ts
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  saveAppSettingsLocal(settings);
  await persistKey(APP_SETTINGS_KEY, settings);
}
```

`saveAppSettings` serializuje **pełny** obiekt — enum `"AUTO"|"OFF"|"ON"` przetrwa JSON/KV **jeśli** load/merge nie robi boolean collapse.

### 3.2 Precedent: string union w AppSettings

`catalogWriteMode: "split" | "work_only" | "legacy_only"` ma już:

- `normalizeCatalogWriteMode(value: unknown)`
- `mergeCatalogWriteMode(remote, local)` — remote pierwszeństwo

Option B może **reuse** ten wzorzec dla P5/P6 (`normalizeIkLaborE2eMode`, `mergeIkLaborE2eMode`) zamiast nowego mechanizmu.

### 3.3 CloudLoader

```294:298:src/app/CloudLoader.tsx
        if (cloudAppSettings && typeof cloudAppSettings === "object") {
          const localSettings = loadAppSettingsLocal();
          const cloudS = cloudAppSettings as AppSettings;
          const mergedSettings: AppSettings = mergeAppSettings(cloudS, localSettings);
          safeSetLocalStorageJson(APP_SETTINGS_KEY, mergedSettings);
```

CloudLoader deleguje do `mergeAppSettings` — wystarczy zmiana merge P5/P6; **nie** wymaga osobnej ścieżki CloudLoader.

### 3.4 Settings writers (blast radius)

| Writer | Dotyka P5/P6? | Ryzyko |
|--------|---------------|--------|
| `AdminSettingsModal` | **TAK** (direct) | Checkbox → enum select; spread musi zachować enum |
| `WmPrintView` | NIE (tylko `wmRysunkiEnabled`) | Spread `{...appSettings}` — **safe** jeśli state ma enum |
| `maybePromoteWmRysunki01FromLs` | NIE | Spread — safe |
| `syncAppSettingsFromCloud` | via merge | Wymaga nowego merge |
| ATH / inne moduły | NIE (grep) | Brak direct write P5/P6 |

---

## 4. Legacy Migration (B-POLICY)

| Stored legacy | Normalize | Semantics | Info loss? |
|---------------|-----------|-----------|------------|
| `missing` | `AUTO` | MODE A when IK+BOQ | None (intended) |
| `true` | `ON` | MODE A (legacy opt-in) | None |
| `false` | `AUTO` | MODE A (B-POLICY) | **Accepted** — cannot distinguish default OFF vs Owner OFF (OD-2b) |
| `"AUTO"` | `AUTO` | idempotent | None |
| `"OFF"` | `OFF` | kill-switch | None |
| `"ON"` | `ON` | MODE A | None |

**Idempotency:** Po pierwszym `normalize`, ponowny load nie zmienia wartości — **PASS** (warunek: normalizer rozpoznaje już-zmapowane enum).

**Rollback:** Stary bundle `=== true` na stringach → false → experts HOLD, Research OFF — **fail-safe** zgodnie z DF §18.

**Mixed-client risk (residual):** Stary PWA zapisuje `false` nad remote `"OFF"`; nowy kod B-POLICY mapuje `false`→`AUTO` → kill-switch zniszczony. PLAN §10 T19 dokumentuje to. Mitygacja: jeden deploy + Version Awareness — **warunek C4**, nie arch blocker.

---

## 5. P5 / P6 AUTO Semantics

### 5.1 Runtime gate (current)

```214:217:src/lib/intelligent-estimator/ik-entry-flag.ts
/** P5 MODE A active: IK ON ∧ Labor E2E ON. */
export function isIkP5LaborE2eActive(): boolean {
  return isIkEntryEnabled() === true && isIkLaborE2eEnabled() === true;
}
```

```149:152:src/lib/intelligent-estimator/ik-entry-flag.ts
export function isIkLaborE2eEnabled(): boolean {
  if (ikLaborE2eForTests != null) return ikLaborE2eForTests;
  return loadAppSettingsLocal().ikLaborE2eEnabled === true;
}
```

Po migracji wymagana semantyka (zgodna z DF §5–7):

```text
isIkP5LaborE2eActive =
  ikEntryEnabled === true
  AND mode !== "OFF"
  AND mode ∈ {"AUTO", "ON"}
  AND masterBoq.readyForExperts  // at IkEntryHost call site
```

### 5.2 IkEntryHost — właściwe miejsce AUTO

```222:254:src/app/intelligent-estimator/IkEntryHost.tsx
  // P5 Labor E2E — Labor-specific levers (≠ Material / ≠ shared RUN_RATE_EXPERTS).
  useEffect(() => {
    if (!p5LaborOn) {
      setLabor(null);
      return;
    }
    ...
        const result = await runIkMasterBoqLaborExpert({
          ...
          executeResearch: p5ResearchOn === true,
```

`IkEntryHost` **nie wymaga** nowego bindingu — wystarczy aktualizacja helperów `isIkP5LaborE2eActive` / `isIkP6MaterialE2eActive`. Istniejące guardy `laborAttemptedRef` / `materialAttemptedRef` zapewniają idempotencję per BOQ snapshot.

### 5.3 legacy false → AUTO — safety proof

Gdy `false`→`AUTO` uruchamia P5/P6 MODE A:

| Boundary | Mechanizm | AUTO włącza? |
|----------|-----------|--------------|
| Research HTTP | `resolveIkP5LaborExecuteResearch` wymaga `ikLaborResearchEnabled === true` (boolean, default OFF) | **NIE** |
| Accept | Labor expert: `autoAcceptExecuted = false` (const); `ownerAcceptRequired` bez auto | **NIE** |
| Price commit / OUR RATE | Brak write path w MODE A engine | **NIE** |
| PRICE_DEMAND / PM write | Material MODE A: read PM only; `executeResearch === true` gate na Phase2 | **NIE** |
| CatalogWork | Brak mutation w expert runners | **NIE** |
| Edge lease | Research Phase2 tylko przy `executeResearch === true` | **NIE** |
| D | `expertAiDecydentEnabled` osobny klucz, default OFF, nie dotykany | **NIE** |
| Final Bid | `ikF5E2eEnabled` osobny lever, default OFF | **NIE** |

**Wniosek:** `legacy false → AUTO` włącza **wyłącznie** read-only MODE A — zgodnie z OD-2b i krytycznym punktem review.

### 5.4 AUTO vs ON

Semantycznie identyczne dla runtime (oba → MODE A). Różnica: ON = legacy explicit opt-in zachowany po migracji `true`; AUTO = default / B-POLICY path. **Brak dodatkowego ryzyka.**

---

## 6. Research Boundary

```223:230:src/lib/intelligent-estimator/ik-entry-flag.ts
export function resolveIkP5LaborExecuteResearch(
  input: IkP5LaborExecuteResearchInput,
): boolean {
  return (
    input.ikEntryEnabled === true
    && input.ikLaborE2eEnabled === true
    && input.ikLaborResearchEnabled === true
  );
}
```

**Dziś:** `IkP5LaborExecuteResearchInput.ikLaborE2eEnabled: boolean` — po enum **musi** zmienić się na mode-check (`mode ∈ {AUTO,ON}`), **nie** raw enum cast do boolean.

**Research pozostaje CONDITIONAL:** `ikLaborResearchEnabled` / `ikMaterialResearchEnabled` pozostają boolean `=== true`. AUTO **nie** implikuje Research — **PASS**.

Material expert P0 guard:

```327:327:src/lib/intelligent-estimator/ik-material-expert.ts
  const executeResearch = opts.executeResearch === true;
```

Labor expert analogicznie L238. **CONFIRMED.**

---

## 7. Owner Decision Boundaries

| Stage | AUTO/ON impact | Verdict |
|-------|----------------|---------|
| Accept | Expert engines: zero auto-Accept | **UNCHANGED** |
| Price Commit | Brak write w MODE A | **OWNER** |
| Final Bid | `ikF5E2eEnabled` osobny gate (OFF) | **OWNER** |
| D | `expertAiDecydentEnabled` HARD STOP false | **UNCHANGED** |

---

## 8. P1 / P2 / Composite / CatalogWork / F5

| EPIC | Dotknięty przez P5/P6 enum? | Evidence |
|------|----------------------------|----------|
| P1 CLOSED | NIE | `mat.inv.*` → P1_INVOICE_HOST w material expert — niezależne od mode enum |
| P2 KEEP GAP | NIE | Product identity gaps w material expert — niezależne |
| Composite CLOSED | Pośrednio (P5∧P6) | `IkEntryHost` composite `useMemo` gated by `p5LaborOn && p6MaterialOn` — AUTO włącza existing consumer, **no engine change** |
| CatalogWork 471 | NIE | Brak CatalogWork write w expert path |
| F5 / P7 | NIE | `ikF5E2eEnabled` osobny lever |
| Chief / P8 | NIE | `ikChiefWiringEnabled` / `ikRiskDecisionE2eEnabled` osobne |

**Composite note:** AUTO na obu P5+P6 uruchomi `runIkCompositeBothHold` — to **zamierzone** przez AUTONOMY policy (read-only BOTH_HOLD). Nie otwiera zamkniętego EPIC.

---

## 9. Reuse First

| Komponent | Reuse? | Zmiana |
|-----------|--------|--------|
| `app-settings.ts` | **YES** | type + normalize + merge (wzorzec `catalogWriteMode`) |
| `ik-entry-flag.ts` | **YES** | mode semantics w existing helpers |
| `IkEntryHost.tsx` | **YES** | brak structural change |
| `runIkMasterBoqLaborExpert` | **YES** | UNCHANGED |
| `runIkMasterBoqMaterialExpert` | **YES** | UNCHANGED |
| `AdminSettingsModal` | **YES** | UI control shape only |
| `CloudLoader` | **YES** | indirect via merge |
| New orchestrator | **NO** | not needed |
| New flag | **NO** | not needed |

**Reuse First = PASS**

---

## 10. Blast Radius Summary

| Moduł | Impact |
|-------|--------|
| ATH preview | **NONE** (nie zapisuje P5/P6) |
| WM Rysunki | **LOW** (spread save — preserve enum) |
| Admin Settings | **HIGH** (direct P5/P6 UI + save) |
| CloudLoader | **MEDIUM** (merge output) |
| app-settings consumers | **MEDIUM** (2 keys + helpers + tests) |
| P5 Labor | **HIGH** (intended) |
| P6 Material | **HIGH** (intended) |
| Research | **LOW** (boolean levers unchanged; input type fix) |
| P7 / Chief / P8 | **NONE** |
| P1 / P2 | **NONE** |
| Composite | **LOW** (auto when P5∧P6 — intended) |
| F5 | **NONE** |
| D | **NONE** |

---

## 11. Rollback

| Scenario | Behavior | Safe? |
|----------|----------|-------|
| Rollback code, KV has `"AUTO"` | `=== true` → false → HOLD | **YES** |
| Rollback code, KV has `"OFF"` | `=== true` → false → HOLD | **YES** (experts off; kill intent preserved) |
| Rollback code, KV has `"ON"` | `=== true` → false → HOLD | **YES** (more conservative than ON) |
| Rollback code, KV has legacy `true` | active | **YES** (legacy behavior) |
| Mixed old+new clients | OFF may become AUTO (T19) | **RISK** — warunek C4 |

**Rollback = PASS** (z zastrzeżeniem mixed-client window).

---

## 12. Conditions (Implementation Requirements)

### C1 — Merge semantics frozen

**WHY:** DF §9 wymaga trwałego OFF; PLAN §9 precyzuje „OFF wygrywa”.

**REQUIREMENT:** `mergeIkLaborE2eMode` / `mergeIkMaterialE2eMode` muszą implementować:

```text
if remote === "OFF" OR local === "OFF" → "OFF"
else if remote is valid enum → remote
else if local is valid enum → local
else normalize legacy (bool/missing)
```

Bez `|| true`, bez mapowania legacy `false`→`OFF`.

### C2 — Coordinated single release

**WHY:** Częściowa migracja (np. tylko UI) zostawi enum w KV, ale load `=== true` → collapse → AUTO/OFF lost.

**REQUIREMENT:** Jedna wersja deploy obejmuje: `normalize` + `load` + `merge` + `defaultAppSettings` + helpers + Admin UI + test harness updates.

### C3 — Research input type contract

**WHY:** `resolveIkP5LaborExecuteResearch` przyjmuje `ikLaborE2eEnabled: boolean`. Po enum raw value nie może być przekazywane jako boolean.

**REQUIREMENT:** Wprowadzić `isIkP5ModeActive(mode)` / zmienić input type; Research permission = mode active **AND** `ikLaborResearchEnabled === true`.

### C4 — Mixed-client mitigation

**WHY:** Stary bundle może nadpisać `"OFF"` boolean `false` → nowy kod czyta AUTO.

**REQUIREMENT:** Deploy jako single Vercel release; po deploy sprawdzić `version.json`; dokumentować okno Version Awareness; opcjonalnie T23 concurrent writer test.

### C5 — Test harness update

**WHY:** `forceIkLaborE2eForTests(on: boolean | null)` i testy P5/P6 assert `=== false` / `=== true`.

**REQUIREMENT:** Rozszerzyć test overrides na mode union lub dodać `forceIkLaborE2eModeForTests`; przepisać `test-ik-migration-01-p5/p6-implementation.mjs` i dodać T01–T25 z DF.

### C6 — defaultAppSettings

**WHY:** Spójność z B-POLICY.

**REQUIREMENT:** `defaultAppSettings()` → `ikLaborE2eEnabled: "AUTO"`, `ikMaterialE2eEnabled: "AUTO"` (nie `false`). To jest **semantic default flip** dla fresh install — akceptowalne post OD-2b (nie włącza Research/Accept/D).

---

## 13. Explicit Non-Goals (confirmed unchanged)

- Research engine redesign
- P2 expansion
- Composite engine change
- F5/P7/Chief/P8 redesign
- D activation
- CatalogWork mutation
- Auto Accept / Auto Price Commit / Auto Final Bid
- New P5/P6 flags

---

## 14. Design Freeze Readiness

| Gate | Status |
|------|--------|
| OD-2 APPROVED | **YES** |
| OD-2b ACCEPTED | **YES** |
| DF ↔ code traceability | **YES** |
| Safety invariants provable | **YES** |
| Implementation sequence clear | **YES** |
| ARCH REVIEW | **PASS WITH CONDITIONS** |

**Po spełnieniu C1–C6:** Design Freeze → **READY FOR IMPLEMENTATION** (wymaga osobnego Owner GO implement).

---

## 15. Final Scorecard

| Metric | Result |
|--------|--------|
| Architecture blockers | **0** |
| Design Freeze consistency | **PASS** |
| Reuse First | **PASS** |
| Migration safety | **PASS** (with C1, C4) |
| Settings contract | **PASS** (with C1, C2) |
| P5 AUTO | **PASS** |
| P6 AUTO | **PASS** |
| Research boundary | **PASS** |
| Accept boundary | **PASS** |
| Price Commit boundary | **PASS** |
| Final Bid boundary | **PASS** |
| D hard stop | **PASS** |
| P1 | **PASS** |
| P2 | **PASS** |
| Composite | **PASS** |
| CatalogWork | **PASS** |
| Rollback | **PASS** (with C4) |
| New engine required | **NO** |
| New flag required | **NO** |
| Default flip (implementation) | **YES** (`false`→`"AUTO"` in defaults + B-POLICY) |
| Implementation | **NOT AUTHORIZED** |

---

## STOP

```text
ARCH REVIEW = PASS WITH CONDITIONS
Architecture blockers = 0
Conditions = C1–C6 (see §12)
Code = ZERO
Settings write = ZERO
Commit = NOT DONE
Push = NOT DONE
Deploy = NOT DONE
```
