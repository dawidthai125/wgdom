# IK AUTONOMY-08 P2 — Research-on-Miss  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = FROZEN + ARCH FIXES** · **ARCH REVIEW = PASS WITH REQUIRED FIXES** · **IMPLEMENTATION = NOT YET AUTHORIZED** |
| **Date** | 2026-08-18 |
| **Mode** | DOCUMENTATION UPDATE · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.94** · feature **`e0373fac`** · docs tip **`14ec7b3c`** · live `version.json` **`14ec7b3`** · deploy **`Cj1o11MdCxjzjpufFRmAevkDgYmS`** |
| **AUDIT** | [`IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md) · **CLOSED** |
| **PLAN** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md) · **READY / OWNER ACCEPTED** |
| **ARCH REVIEW** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-ARCH-REVIEW.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-ARCH-REVIEW.md) · **PASS WITH REQUIRED FIXES** · blockers **0** |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Tip** | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Slice** | **08-P2 only** — Research-on-Miss · **not** Accept UX · **not** P7/P8 · **not** epic close |

```text
DESIGN FREEZE              = FROZEN + PRE-IMPLEMENTATION ARCH FIXES
ARCH REVIEW                = PASS WITH REQUIRED FIXES
ARCHITECTURE BLOCKERS      = 0
SSOT CONFLICT              = NONE
REQUIRED FIXES             = IC-SEQ-1 · IC-SEQ-2 · IC-TEST-1
Implementation             = NOT YET AUTHORIZED
Code / Settings / HTTP     = ZERO
Commit / Push / Deploy     = NOT DONE
A08-P0 / A08-P1            = COMPLETE / CLOSED
A08-P2                     = NOT STARTED
EPIC                       = AUTONOMY-08 — NOT CLOSED
```

If PLAN narrative and SOURCE disagree, **SOURCE wins**. This freeze records SOURCE + Owner-locked OD-P2-1…10.

**MASTER SSOT:** no semantic conflict (orchestrator · REUSE engines · COMPOUND/UNKNOWN HOLD · Evidence ≠ OUR RATE · no new flag). Process line „PLAN/DF NOT AUTHORIZED” is **stale vs this Owner GO for DF** — do not treat as Research-contract conflict. MASTER NEXT stamp = documentation closeout after IMPLEMENT, not this DF.

**Path freeze (SOURCE):** host is `src/app/intelligent-estimator/IkEntryHost.tsx` — **not** `src/lib/...`.

```text
IK ON = AUTOMATYCZNA AUTONOMIA.
CONDITIONAL = MISS ∧ classification ∧ identity ∧ safety.
CONDITIONAL ≠ MANUAL OPT-IN.
executeResearch (host) = PERMISSION for MODE B on MISS.
executeResearch ≠ research every line.
Research ≠ Accept.
```

---

## 1. Status

| Item | Frozen |
|------|--------|
| AUDIT | CLOSED |
| PLAN | OWNER ACCEPTED |
| ARCH REVIEW | **PASS WITH REQUIRED FIXES** · blockers **0** |
| This DF | FROZEN + **IC-SEQ-1 / IC-SEQ-2 / IC-TEST-1** |
| IMPLEMENT | **NOT YET AUTHORIZED** |
| Unrelated WIP | **NIERUSZANY** |

Owner Decisions **OD-P2-1…10 UNCHANGED**.

---

## 2. Owner Decisions (HARD FREEZE)

| # | Decision | Frozen meaning |
|---|---------|----------------|
| **OD-P2-1** | **YES** | IK ON ∧ P5/P6 AUTO\|ON → `executeResearch` **permitted** · HTTP **ONLY ON MISS** |
| **OD-P2-2** | **NO EXTRA SWITCHES** | Zero new checkbox / setting / flag / Research toggle. `ik*ResearchEnabled` **not** a required conjunct |
| **OD-P2-3** | **LABOR FIRST** | P5 settled (incl. Labor Research-on-Miss) **before** P6 Material expert starts |
| **OD-P2-4** | **KEEP** | Research ≠ Accept |
| **OD-P2-5** | **KEEP** | `INTERNAL_REVIEW` / ambiguous identity → ZERO auto-research |
| **OD-P2-6** | **KEEP** | `mat.inv.*` HARD-FORBID |
| **OD-P2-7** | **KEEP** | COMPOUND / UNKNOWN HOLD · ZERO Research · ZERO invent · **no** PACKAGE plane |
| **OD-P2-8** | **KEEP** | Technical failure ≠ MISS |
| **OD-P2-9** | **KEEP** | Legal / budget / cooldown / session busy / dedupe / identity = **system gates** |
| **OD-P2-10** | **NO** | No new IK flag |

A05 lock **superseded at call-site only:** AUTO/ON may pass `executeResearch=true` (permission). Expert still MODE A first. MISS-only HTTP KEEP.

---

## 2a. PRE-IMPLEMENTATION ARCH FIXES (HARD FREEZE)

Źródło: Arch Review **PASS WITH REQUIRED FIXES**. **Nie** zmieniają OD-P2-*. **Nie** nowy orchestrator. **Nie** nowa state machine IK.

| ID | Problem | Frozen requirement |
|----|---------|-------------------|
| **IC-SEQ-1** | `finally` nie może oznaczyć Labor settled gdy effect jest `cancelled` | `cancelled === true` → **NIE settled**. Tylko rzeczywiście dokończony lifecycle P5 (`finally` **and** `!cancelled`) ustawia settled |
| **IC-SEQ-2** | sam `useState` nie gwarantuje P5→P6 przy zmianie tenderu / same flush | **synchroniczny** `laborSettledRef` + **tick** (state) do re-run P6. P6 czyta **ref**, nie stary state z poprzedniego tenderu |
| **IC-TEST-1** | DF wcześniej wymieniał tylko A05 T11 + P1 T07 | Companion harnessy **w scope**: A05 **T24** · 08-P0 **T20** · A06 **T13** · A07 **T15** · migration **P5/P6** |

**IC-SEQ-1 (existing P5 `useEffect` only):**

```text
let cancelled = false
cleanup P5: cancelled = true
finally:
  if (cancelled) → do NOT set settled
  if (!cancelled) → settled = true  (success or throw)
```

**IC-SEQ-2 (existing P5/P6 `useEffect` only):**

```text
laborSettledRef     // sync · SOURCE of truth for wait
laborSettleTick     // useState · only to re-invoke P6 after settle
P5 first sync line (work start / P5 ON ready): laborSettledRef.current = false
P5 OFF: laborSettledRef.current = true (sync, no deadlock)
P5 finally + !cancelled: laborSettledRef.current = true; setLaborSettleTick(n+1)
P6: if p5LaborOn && laborSettledRef.current !== true → return
    BEFORE materialAttemptedRef
P6 deps: include laborSettleTick
```

**Forbidden:** `labor !== null` as settled · write `materialAttemptedRef` on wait path · new orchestrator · new IK state machine.

**IC-TEST-1 files (do not run now):**

- `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs` — **T11 + T24**
- `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` — **T20**
- `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` — **T13**
- `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` — **T15**
- `scripts/test-ik-migration-01-p5-implementation.mjs`
- `scripts/test-ik-migration-01-p6-implementation.mjs`
- `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` — **T07** (already frozen)

---

## 3. Objective

Odblokować **istniejący** MODE B w `IkEntryHost` bez drugiego silnika i bez drugiego przełącznika:

```text
Użytkownik: IK ON
IK: Documents → BOQ → Classification
  → P5 Labor MODE A → MISS → existing Labor Research
  → P5 settled
  → P6 Material MODE A → MISS → existing Material Research
  → P7 UNCHANGED → P8 UNCHANGED
```

---

## 4. Scope

**IN:** gate conjunct drop · host P5→P6 wait · `researchEligible` HOLD · REMOVE Research checkboxes · A08-P2 harness · A05 T11 + P1 T07 companion asserts · changelog at IMPLEMENT

**OUT:** new engine / orchestrator / flag · Accept host UX · auto-Accept · P7/P8 · D/Chief · PACKAGE · KV migration · Hub panel removal · `flagsFor()` rewrite

---

## 5. Current State (SOURCE)

| Surface | Dziś |
|---------|------|
| `resolveIkP5LaborExecuteResearch` | Entry ∧ E2E boolean ∧ **`ikLaborResearchEnabled === true`** |
| `resolveIkP6MaterialExecuteResearch` | analog third conjunct |
| `IkEntryHost` | `executeResearch: p5/p6ResearchOn === true` · P5 ∥ P6 `useEffect` |
| Labor expert | HIT → REUSE path · MISS + `executeResearch` → `runIkLaborGapResearch` · else `RESEARCH_SKIPPED` · `INTERNAL_REVIEW` → `researchKey=null` |
| Material expert | CURRENT → HIT · MISS + `executeResearch` → Phase2 · `researchEligible` **too wide** (F1) |
| UI Technical | `data-ik-labor-research-toggle` · `data-ik-material-research-toggle` |
| AppSettings keys | default **false** · merge explicit · **unread after P2 gate** |
| Hub panel | manual · not host trigger |
| Accept | engines exist · **host does not call** |
| P7/P8 | independent in-memory · `feedsP7Bid=false` |

---

## 6. Target State

```text
resolveIkP5LaborExecuteResearch :=
  ikEntryEnabled === true
  ∧ ikLaborE2eEnabled === true     // AUTO|ON capability, never raw enum === true

resolveIkP6MaterialExecuteResearch :=
  ikEntryEnabled === true
  ∧ ikMaterialE2eEnabled === true

Host: KEEP executeResearch: p5ResearchOn === true / p6ResearchOn === true
P6 effect: wait until laborSettledRef (IC-SEQ-1/2) when P5 ON
researchEligible: plane === MATERIAL ∧ bucket === MATERIAL
(+ existing mat.inv.* / LABOR / NON_COST forbids)
UI: Research checkboxes ABSENT
Keys ik*ResearchEnabled: leftover (AUTO_INGEST pattern) · not a gate
```

After this drop, `isIkP5LaborExecuteResearchActive()` is **extensionally equal** to `isIkP5LaborE2eActive()`. **KEEP both names** (call-site stability). **Do not** add a third helper. **Do not** delete `resolveIk*ExecuteResearch`.

---

## 7. Exact Gate Semantics

### 7.1 Permission (host flag)

```text
executeResearch permission (Labor) =
  IK ON
  ∧ P5 mode ∈ {AUTO, ON}

executeResearch permission (Material) =
  IK ON
  ∧ P6 mode ∈ {AUTO, ON}
```

OFF on P5/P6 = HOLD for MODE A **and** MODE B (existing).

IK OFF = no autonomous Research.

### 7.2 HTTP (engine — UNCHANGED)

```text
HTTP Labor =
  permission
  ∧ lookupWorkRate ≠ CURRENT
  ∧ identity OK
  ∧ bucket === LABOR
  ∧ NOT INTERNAL_REVIEW
  ∧ legal / budget / cooldown / session allow

HTTP Material =
  permission
  ∧ cache ≠ CURRENT
  ∧ plane === MATERIAL
  ∧ bucket === MATERIAL
  ∧ NOT mat.inv.*
  ∧ engine safety allow
```

**Not:** IK ON → Research always.  
**Not:** HIT → Research.  
**Not:** IK ON + checkbox.

### 7.3 Type / leftover (frozen)

| Item | Action |
|------|--------|
| Third conjunct in `resolveIk*` | **DROP** |
| `IkP5LaborExecuteResearchInput.ikLaborResearchEnabled` | **REMOVE from type** (not a new flag — delete unused opt-in field) |
| P6 twin field | **REMOVE from type** |
| `isIkLaborResearchEnabled()` / `isIkMaterialResearchEnabled()` | leftover readers · **not** called from `isIkP*ExecuteResearchActive` |
| `forceIk*ResearchForTests` | leftover · unused by new gate |
| AppSettings keys + merge | **KEEP** · zero KV migration · **do not** flip stored values to true |
| Default stored `false` | **OK** — unread by gate |

**No new boolean. No new helper whose only job is to rename the old flag.**

---

## 8. Labor Flow (FROZEN)

SOURCE reuse:

```text
IkEntryHost
  → runIkMasterBoqLaborExpert({ executeResearch: p5ResearchOn === true })
    → lookupWorkRate / internal-first
    → pendingByKey (MISS only)
    → runIkLaborGapResearch
      → runSelectiveWorkRateResearch
```

| Step | Contract |
|------|----------|
| Start | existing P5 `useEffect` when `p5LaborOn` ∧ Master BOQ ready |
| HIT CURRENT | ZERO HTTP · `CURRENT_HIT` / engine `REUSE` |
| MISS | `researchKey` · if permission → existing Labor Research |
| `INTERNAL_REVIEW` | `researchKey = null` · ZERO Research |
| bucket ≠ LABOR | ZERO Labor Research |
| Legal block | `BLOCKED` KEEP |
| Cooldown | `COOLDOWN` KEEP |
| Session busy | `SKIPPED_SESSION_BUSY` KEEP |
| Budget | existing P5 wrap KEEP |
| `forceRefresh` | **not** passed on autonomous path |
| Accept | **not** called |

**No** second Labor research path. **No** second dedupe/cooldown.

---

## 9. Material Flow (FROZEN)

```text
IkEntryHost (after laborSettled when P5 ON)
  → runIkMasterBoqMaterialExpert({ executeResearch: p6ResearchOn === true })
    → evaluateMaterialCache
    → pending only if eligible MISS
    → executeMaterialResearchPhase2
```

Autonomous Research **requires**:

```text
plane === MATERIAL
AND bucket === MATERIAL
```

Product identity **alone is not sufficient** (F1).

Path (B) `demandResearchEligible` already matches this — KEEP. Path (A) `researchEligible` **must** match (§12).

CURRENT HIT → ZERO Phase2. `mat.inv.*` HARD-FORBID KEEP. Phase2 internals **NOT TOUCHED**.

---

## 10. P5 / P6 Sequencing (FROZEN · IC-SEQ-1 · IC-SEQ-2)

**Forbidden:** P5 Research pending **and** P6 Research in parallel.

**Required:** P5 Labor (MODE A + MODE B) **settled**, then P6 may start.

**Not** a new orchestrator. **Not** per-line Labor→Material engine. Tender-level wait in **existing** P6 `useEffect`.

useState-only `laborSettled` is **REJECTED** (Arch Review same-flush / tender change race). Frozen mechanism = §2a **IC-SEQ-2**.

### 10.1 Settled contract (IC-SEQ-1)

| Event | `laborSettledRef.current` |
|-------|---------------------------|
| P5 OFF (`!p5LaborOn`) | **true** immediately (sync · P6 must not deadlock) |
| P5 ON, effect start / BOQ not ready | **false** (sync, first line of that path) |
| P5 expert `finally` **and** `!cancelled` | **true** (success **or** throw) |
| P5 `cancelled === true` | **MUST NOT** set true (stale run must not settle the next one) |
| P5 effect cleanup | `cancelled = true` only — do not settle here |

**Forbidden settled signal:** `labor !== null` (SOURCE catch sets `null` → deadlock).

### 10.2 P6 wait (order frozen · IC-SEQ-2)

```text
P6 useEffect:
  if !p6MaterialOn → clear material; return
  if !masterBoq.ready → clear material; return
  if p5LaborOn && laborSettledRef.current !== true → return     // BEFORE materialAttemptedRef
  // then existing attemptedRef + runIkMasterBoqMaterialExpert
```

**Deps:** include `laborSettleTick` (and keep existing). Tick exists **only** to re-run P6 after `!cancelled` finally. Wait predicate reads **ref**, not tick value.

**Must not** write `materialAttemptedRef` on the wait path (otherwise P6 never starts after settle).

P5 OFF → skip wait. P6 OFF → no Material expert (KEEP).

Within P5: existing serial `await runIkLaborGapResearch` KEEP.  
Within P6: existing serial `await executeMaterialResearchPhase2` KEEP.

P7/P8 **do not** wait on this settle (boundary §16).

---

## 11. Classification HOLD (FROZEN)

| Plane | Lookup | Research |
|-------|--------|----------|
| LABOR | Work Catalog | MISS only |
| MATERIAL | Price Memory | MISS only |
| COMPOUND | HOLD | **ZERO** |
| UNKNOWN | HOLD | **ZERO** |

`classifyEstimatorPricingPlane` / `flagsFor` **UNCHANGED**.  
**No** PACKAGE plane. **No** COMPOUND→PACKAGE rewrite.

Labor already: `bucket === "LABOR"` only (COMPOUND=`BOTH`, UNKNOWN=`UNRESOLVED`). KEEP.

---

## 12. A08-P2-F1 (HARD FREEZE)

**Bug:** `researchEligible()` after LABOR/NON_COST/`mat.inv.*` checks `return true` → COMPOUND/BOTH and UNKNOWN/UNRESOLVED with product identity can enter Phase2 once permission is true.

**Resolution (consumer only):**

SOURCE: `src/lib/intelligent-estimator/ik-material-expert.ts` · `researchEligible`

```text
existing forbids KEEP (null identity, NON_COST, LABOR, mat.inv.*)
THEN:
  if plane === COMPOUND || plane === UNKNOWN → false
  if bucket === BOTH || bucket === UNRESOLVED → false
  return plane === MATERIAL && bucket === MATERIAL
```

| Case | After freeze |
|------|----------------|
| MATERIAL + MATERIAL + canonical MISS | eligible |
| COMPOUND / BOTH | **false** |
| UNKNOWN / UNRESOLVED | **false** |
| LABOR | false (already) |
| `mat.inv.*` | false (already) |

`classification-gate.ts` **NOT TOUCHED**.

---

## 13. Zero Extra Switches (HARD FREEZE)

**REMOVE** from `AdminSettingsModal.tsx` (not hide, not move, not replace):

| UI | `data-*` | Key |
|----|----------|-----|
| IK · LABOR RESEARCH (P5 · MODE B) | `data-ik-labor-research-toggle` | `ikLaborResearchEnabled` |
| IK · MATERIAL RESEARCH (P6 · MODE B) | `data-ik-material-research-toggle` | `ikMaterialResearchEnabled` |

**Forbidden replacements:** Auto Research · Advanced Research · Emergency Research · any new `ik*Research*` setting · re-add under another label.

User Research control = **none**. Kill Research **with** MODE A = P5/P6 `"OFF"` or IK OFF.

Technical P5–P8 **select AUTO/OFF/ON** KEEP (A08-P1 emergency). Those are **not** Research opt-ins.

---

## 14. Safety Gates (HARD FREEZE)

Autonomy **must not** bypass:

| Gate | Keep |
|------|------|
| `WORK_RATE_LEGAL_GATE` | `BLOCKED` |
| P5 HTTP budget | `GAP` / `RESEARCH_BUDGET_STOP` |
| P6 `IkP6MaterialBudget` / MMR-02 | `BUDGET_EXCEEDED` |
| `isWorkRateResearchInCooldown` | `COOLDOWN` |
| session busy set | `SKIPPED_SESSION_BUSY` |
| identity / `INTERNAL_REVIEW` | no pending |
| `mat.inv.*` | HARD-FORBID |
| Classification HOLD | F1 + Labor bucket |

Statuses **must not** be remapped to MISS.

---

## 15. Research ≠ Accept (HARD FREEZE)

Research **may:** candidate · evidence · GAP · error.

Research **must not:** Accept · OUR RATE persist · Final Bid · Owner decision.

| Keep | |
|------|--|
| `acceptedOurRate = 0` / `counts.accepted = 0` | experts |
| `autoAccepted: false` | Phase2 / composite |
| Host does **not** call | `acceptWorkRateResearchCandidate` · `acceptIkLaborResearchAndNotify` · `acceptMaterialResearchCandidate` |

Accept **bodies** NOT TOUCHED.

---

## 16. P7 / P8 Boundary (HARD FREEZE)

| Module | A08-P2 |
|--------|--------|
| `runIkP7PositionCostBid` | **NOT TOUCHED** |
| `runIkP8RiskDecision` | **NOT TOUCHED** |
| Final Bid / Offer / DW / D / Chief | **NOT TOUCHED** |
| OUR RATE write | **NOT TOUCHED** |
| Composite HTTP | already `void` execute · KEEP · `feedsP7Bid=false` KEEP |

P7/P8 remain independent in-memory. Completeness after Accept persist = **later** Owner Gate, not this slice.

---

## 17. UI Boundary (HARD FREEZE)

| Surface | Action |
|---------|--------|
| Research checkboxes | **REMOVE** |
| Primary IK ON | **UNCHANGED** (A08-P1) |
| P5/P6/P7/P8 selects | **KEEP** in Technical |
| `IkLaborGapResearchPanel` | **KEEP** (recovery / diagnostic · not host trigger) |
| Host `data-ik-p5-labor-research` / `data-ik-p6-material-research` | KEEP as **observability** (will read `"1"` when permission true) · not a switch |
| `IK_ENTRY_SHELL_EXECUTE_RESEARCH = false` | leftover compile sentinel · **do not AND** with helpers |

No other IK UI redesign.

---

## 18. File Scope (HARD FREEZE)

**Planned change (IMPLEMENT later — NOT YET AUTHORIZED):**

| # | File / fix | Why |
|---|------------|-----|
| 1 | `src/lib/intelligent-estimator/ik-entry-flag.ts` | drop third conjunct + third input fields; leftover readers unused by executeResearch |
| 2 | `src/app/intelligent-estimator/IkEntryHost.tsx` | **IC-SEQ-1** + **IC-SEQ-2** · P6 wait **before** `materialAttemptedRef` |
| 3 | `src/lib/intelligent-estimator/ik-material-expert.ts` | F1 `researchEligible` |
| 4 | `src/app/AdminSettingsModal.tsx` | REMOVE two Research checkboxes |
| 5 | `scripts/test-ik-autonomy-08-p2-research-on-miss.mjs` | **new** harness |
| 6 | `src/app/changelog-data.ts` + `CHANGELOG.md` | version at IMPLEMENT |
| 7 | `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs` | **T11** + **IC-TEST-1 T24** |
| 8 | `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | **T07** — research-toggle **absent** |
| 9 | **IC-TEST-1** `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **T20** |
| 10 | **IC-TEST-1** `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` | **T13** |
| 11 | **IC-TEST-1** `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` | **T15** |
| 12 | **IC-TEST-1** `scripts/test-ik-migration-01-p5-implementation.mjs` | MODE A vs permission P2 |
| 13 | **IC-TEST-1** `scripts/test-ik-migration-01-p6-implementation.mjs` | analog |

Item 8–13 are SOURCE-justified companion tests (would FAIL after gate/UI change). Not new product files.

**FROZEN FINAL SCOPE (IMPLEMENT later — this list is the contract):**

1. `src/lib/intelligent-estimator/ik-entry-flag.ts`
2. `src/app/intelligent-estimator/IkEntryHost.tsx`
3. `src/lib/intelligent-estimator/ik-material-expert.ts`
4. `src/app/AdminSettingsModal.tsx`
5. A08-P2 harness (`scripts/test-ik-autonomy-08-p2-research-on-miss.mjs`)
6. A05 **T11**
7. P1 **T07**
8. **IC-TEST-1:** A05 **T24** · A08-P0 **T20** · A06 **T13** · A07 **T15** · migration **P5/P6** companion scripts/tests
9. changelog (`changelog-data.ts` + `CHANGELOG.md`)
10. **IC-SEQ-1** (in `IkEntryHost` P5 `finally`: cancelled → NIE settled)
11. **IC-SEQ-2** (sync `laborSettledRef` + `laborSettleTick`; P6 wait on ref before `materialAttemptedRef`)

**Optional (not required):** leftover comment on `mergeIk*ResearchEnabled` in `app-settings.ts`. **No** default/merge behavior change. **No** KV write.

**Do not add** other runtime files without a new Arch Review + SOURCE proof.

---

## 19. Harness (HARD FREEZE)

New: `scripts/test-ik-autonomy-08-p2-research-on-miss.mjs`  
Mode: source + pure-lib · **zero** live Settings write · **zero** Research HTTP against production.

| # | Case | PASS |
|---|------|------|
| 1 | Labor CURRENT HIT | zero Research HTTP / REUSE |
| 2 | Labor MISS + LABOR + identity OK + permission | automatic existing Labor Research path |
| 3 | `INTERNAL_REVIEW` | zero Research |
| 4 | identity ambiguous / UNRESOLVED | zero Labor Research |
| 5 | bucket ≠ LABOR | zero Labor Research |
| 6 | cooldown | existing `COOLDOWN` |
| 7 | session busy | existing `SKIPPED_SESSION_BUSY` |
| 8 | HTTP/parser/legal fail | not remapped to MISS |
| 9 | Material CURRENT HIT | zero Phase2 |
| 10 | MATERIAL + MATERIAL MISS + permission | Phase2 path |
| 11 | COMPOUND / BOTH | HOLD · `researchEligible === false` |
| 12 | UNKNOWN / UNRESOLVED | HOLD · `researchEligible === false` |
| 13 | `mat.inv.*` | HARD-FORBID |
| 14 | technical error | `researchError` / engine status KEEP |
| 15 | IK OFF | `resolve*ExecuteResearch === false` |
| 16 | IK ON + P5 AUTO + stored research **false** | Labor permission **true** |
| 17 | IK ON + P6 AUTO + stored research **false** | Material permission **true** |
| 18 | no Research checkbox | AdminSettings source: toggle attrs **absent** |
| 19 | no Research opt-in conjunct | `resolveIk*` body has **no** `ik*ResearchEnabled` |
| 20 | no new IK flag | grep no `ikAutoResearch` / `ikResearchOnMiss` / equivalents |
| 21 | P5 not settled (`laborSettledRef !== true`) | P6 must not start (wait **before** attemptedRef) · **IC-SEQ-2** |
| 22 | P5 settled `!cancelled` (or P5 OFF) | P6 may start · **IC-SEQ-1** |
| 23 | candidate | host **no** `accept*` · expert accepted counts **0** |

A05 **T11 + T24**: rewrite to match §7 (permission true when Entry∧E2E even if leftover stored false). Keep T12 `executeResearch === true` explicit in experts. Keep T13 no host Accept.

**IC-TEST-1:** 08-P0 T20 · A06 T13 · A07 T15 · migration P5/P6 — same permission semantics (do **not** execute those harnesses in this docs turn).

---

## 20. Acceptance Criteria (17 — HARD FREEZE)

A08-P2 **PASS** only if **all** hold:

1. IK ON runs Research automatically on **valid MISS**.  
2. HIT never causes Research.  
3. No additional Research opt-in (UI or required conjunct).  
4. No new IK flag.  
5. Labor Research is first (P5 before P6).  
6. P6 does not race unsettled P5.  
7. COMPOUND = HOLD / zero Research.  
8. UNKNOWN = HOLD / zero Research.  
9. `mat.inv.*` = HARD-FORBID.  
10. `INTERNAL_REVIEW` = zero auto-research.  
11. Technical failure ≠ MISS.  
12. Legal / budget / cooldown / session gates remain.  
13. Research ≠ Accept.  
14. P7/P8 engines unchanged.  
15. A08-P2 harness PASS (and companion A05 T11/**T24** · P1 T07 · **IC-TEST-1** 08-P0 T20 · A06 T13 · A07 T15 · migration P5/P6).
16. **IC-SEQ-1:** cancelled run never settles.
17. **IC-SEQ-2:** P6 does not start on stale useState from prior tender / same flush (ref wait).

---

## 21. Rollback

```text
git revert A08-P2 implementation commit(s)
→ third conjunct returns
→ MODE B again requires leftover boolean
→ Research checkboxes return with the revert
```

| Item | Rollback |
|------|----------|
| KV / business data | **none** (no migration) |
| Stored `ik*ResearchEnabled` | leftover false still valid for reverted gate |
| Settings write to flip booleans | **not required** |
| OUR RATE / Evidence / jobs | **untouched** by P2 itself |

Rollback is **local git revert**. No data repair.

---

## 22. Production Safety

This DF / IMPLEMENT must **not**:

- write Settings / KV as part of coding  
- run Research HTTP on production in this phase  
- Accept / OUR RATE / Final Bid  
- flip live `ikEntryEnabled` to observe P2 (PV policy = later Owner Verify)

Order after Owner GO: code → harness (local) → Owner Verify → then release. **No** `vercel deploy`. Push `main` only when that later slice is authorized.

---

## 23. Explicit Non-Goals

- new TenderModule / second IK / new Research engine  
- auto-Accept / auto Final Bid / D bypass  
- PACKAGE plane  
- Owner Accept buttons in `IkEntryHost`  
- P7 wait-on-research / `feedsP7Bid=true`  
- removing `IkLaborGapResearchPanel`  
- invoice host catalog cleanup  
- `git add -A`

---

## 24. Implementation Boundary

**Now:** documentation only (this DF + PLAN pointer).

**IMPLEMENT = NOT YET AUTHORIZED.**

Later IMPLEMENT may change only §18 files (plus IC-SEQ in host, plus IC-TEST-1 companions).

**Must remain:** MISS filters in experts · legal/budget/cooldown · no `|| true` · no raw enum as Research · host still `executeResearch === true` explicit · IC-SEQ-1/2 wait (no new orchestrator).

**Must not start:** BUILD, TEST run, COMMIT, PUSH — until Owner GO.

---

## 25. Open Questions

**NONE.**

OD-P2-1…10 unchanged. IC-SEQ-1/2/IC-TEST-1 frozen. If IMPLEMENT hits a deadlock not covered by §10 after applying IC-SEQ: **OWNER REVIEW REQUIRED** — do not invent a second orchestrator.

---

## STOP

```text
DESIGN FREEZE = FROZEN + ARCH FIXES
ARCH REVIEW   = PASS WITH REQUIRED FIXES
BLOCKERS      = 0
IMPLEMENT     = NOT YET AUTHORIZED
CODE          = ZERO
SETTINGS      = ZERO
HTTP          = ZERO
COMMIT/PUSH   = NOT DONE
```
