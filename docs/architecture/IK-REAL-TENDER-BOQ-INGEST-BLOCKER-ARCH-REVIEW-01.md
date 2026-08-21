# IK — REAL TENDER BOQ INGEST BLOCKER · ARCH REVIEW #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-ARCH-REVIEW-01` |
| **Gate** | `OD-IK-REAL-TENDER-BOQ-INGEST-BLOCKER-ARCH-REVIEW-01` |
| **Date** | 2026-08-21 |
| **Mode** | **ARCH REVIEW ONLY** · zero `src/**` · zero commit |
| **DF** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01.md) |
| **PLAN** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01.md) |
| **RCA** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md) |

```text
AUDIT         = COMPLETE / PASS WITH GAPS
RCA           = COMPLETE / PASS WITH GAPS
PLAN          = COMPLETE / PASS WITH GAPS
DESIGN FREEZE = COMPLETE / PASS WITH GAPS
ARCH REVIEW   = PASS WITH GAPS
IMPLEMENTATION = NOT AUTHORIZED

SCOPE = A ONLY
BANLIST / B·C·D = OUT

ZERO CODE CHANGE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 0. Method

Code-backed review of implementability against:

| Surface | Evidence |
|---------|----------|
| Host P2 today | `IkEntryHost.tsx` ~146–219 |
| Canonical pattern | `useTenderDossierHeavyLazy.ts` ~127–128, ~296–449 (`onUpdateRef`, generation, live-only finally, cleanup bump) |
| Parent wiring | `TenderDetailPage.tsx` ~203–207, ~752–763 |
| Bridge contract | `ik-ng02-ingest-bridge.ts` (`needsIkNg02Ingest`, phases) |
| KNR gate | `ik-knr-expert.ts` `MASTER_BOQ_NOT_READY` (unchanged by DF) |

No implementation. Banlist surfaces not redesigned.

---

## 1. Verdict summary

| Check | Result |
|-------|--------|
| A Generation eliminates old→new race | **PASS** (with HB1/HB2 binding amendments) |
| B Old gen cannot ingest/busy/clobber/fake complete | **PASS** |
| C Owner-safe release (success/cancel/error/unmount/fast switch) | **PASS** |
| D Remove `attemptedRef` without duplicate/loop/uncontrolled retry | **PASS WITH GAPS** |
| E Fingerprint deps sufficient | **PASS WITH GAPS** |
| F Early return before vs after BEGIN | **PASS** |
| G No semantic change dossier/ingest/ready/KNR | **PASS** |
| H No new domain state for UI latch | **PASS** |
| Test matrix T01–T12 coverage in DF | **PASS WITH GAPS** (harness form) |
| Smoke #05c criteria | **PASS** (refined below) |

```text
ARCH REVIEW = PASS WITH GAPS
HARD BLOCKERS = 2 (binding ARCH amendments — must be in IMPL/DF addendum before Owner IMPLEMENT GO)
SOFT GAPS = 5
IMPLEMENTATION = NOT AUTHORIZED
```

---

## 2. HARD BLOCKERS (binding amendments)

These do **not** reject the approach. They **block Owner IMPLEMENT GO** until accepted as frozen addendum (this document §2 = SSOT amendment to DF §5–§9).

### HB1 — `onUpdate` must not be an effect dependency

**Evidence:** `TenderDetailPage` `onUpdateItem` = `useCallback(..., [pipeline, item?.id, tenderId])`. `pipeline` from tenders hook/context is not guaranteed referentially stable across renders. DF §9.2 lists `onUpdate` in effect deps → **same cancel/re-entry class as today’s `item` churn** if `pipeline` identity moves.

**Canonical REUSE:** `useTenderDossierHeavyLazy` keeps `onUpdateRef.current = onUpdate` and calls `onUpdateRef.current(...)` — **onUpdate not in E-RUN deps**.

**Frozen amendment:**

```text
const onUpdateRef = useRef(onUpdate);
onUpdateRef.current = onUpdate;
// P2 effect deps: MUST NOT include onUpdate
// apply: onUpdateRef.current(patch, opts) only if !isStale()
```

### HB2 — Pipeline building flags via refs (post-wait + gates)

**Evidence:** Parent passes **new object every render**:

```tsx
pipelineIngest={{
  dossierBuilding: pipelineRuntime.dossierBuilding,
  dossierEnriching: pipelineRuntime.dossierEnriching,
  heavyDone: ...
}}
```

DF correctly drops whole `pipelineIngest` from deps (good). Remaining risk: after BEGIN, the 1500ms wait then reads **closure** `pipelineIngest` from effect start — stale relative to live heavy lazy.

**Frozen amendment:**

```text
pipelineBuildingRef / pipelineEnrichingRef updated each render
Gates + post-wait checks read refs.current
Deps may still list the boolean primitives (dossierBuilding, dossierEnriching) for re-entry when heavy finishes
```

Without HB2, Host can start bridge while heavy is already building (duplicate NG-02 work) or skip release paths inconsistently — undermines A under real MOPS load.

---

## 3. Review detail (A–H)

### A. Generation guard vs old→new race — PASS

DF copies heavy-lazy:

- `generation = ++p2RunGenerationRef`
- `isStale = cancelled || generation !== ref.current`
- cleanup: `cancelled=true` + bump if still current
- apply only if `!isStale()`

**Aligned** with proven NG-02 Host pattern. Eliminates false completion from stale async **when HB1/HB2 keep effect from thrashing**.

### B. Old generation must not mutate live state — PASS

| Action | Guard |
|--------|-------|
| `setIngest` | `if (isStale()) return` before write |
| `onUpdate` / dossier | same + only via `onUpdateRef` (HB1) |
| `bridgeBusy` clear | `releaseBridgeBusyIfOwner(gen)` — no-op if newer owns |
| Fake completion | No Host-forced `readyForExperts`; stale cannot set ingest |

**PASS.** Owner-safe release + isStale is sufficient; do not add a second latch.

### C. Owner-safe release paths — PASS

| Path | Mechanism |
|------|-----------|
| Success live | `finally` + owner match → release |
| Error live | same |
| Cancel / unmount | cleanup bump + `releaseBridgeBusyIfOwner(generation)` |
| Fast tender/item | fingerprint change → cleanup old → new BEGIN |
| Success/cancel old after new | owner check no-ops busy clear; isStale blocks ingest |

**Gap noted (soft):** React 18 Strict Mode double-mount is covered by bump+release (same as heavy-lazy). No extra domain state.

### D. Removing `attemptedRef` — PASS WITH GAPS

| Risk | Mitigation in DF | Assessment |
|------|------------------|------------|
| Duplicate parallel bridge | In-flight / same fingerprint while owner≠null → no second BEGIN | **PASS** |
| Effect loop | No `setIngest` in deps; fingerprint + building flags only; HB1 removes `onUpdate` churn | **PASS** if HB1 |
| Uncontrolled retry | No timer; re-entry only on effect re-fire; `needsIkNg02Ingest` stops after rows / heavy-done-empty | **PASS** |
| Retry after cancel | In-flight cleared → next eligible run | **PASS** |
| Retry after error without dep change | Effect does **not** auto-rearm | **Intentional** — T06 = re-enter when deps/fingerprint/remount; not infinite throw loop |

**SOFT:** Persistent `BRIDGE_THROW` with stable fingerprint leaves Host with terminal blocked ingest until fingerprint/pipeline/remount — acceptable; not a latch bug.

### E. Fingerprint dependencies — PASS WITH GAPS

DF fingerprint:

`id|tenderId|docs:length|fetched:documentsFetchedAt|rows:0|>0`

| Concern | Verdict |
|---------|---------|
| Missed rerun if docs replaced same length + same fetchedAt | **SOFT GAP** — rare; OUT of inventing full doc-hash (heavy already has `buildHeavyParseDocumentFingerprint` — **do not duplicate** into Host unless ARCH later expands; A stays minimal) |
| Unnecessary rerun from full `item` / `tenderFit` | **Addressed** by dropping full `item` |
| `pkg` in DF deps | **SOFT GAP** — prefer `getTenderPackage(id)` at BEGIN (snapshot), **exclude `pkg` from deps** (store read) to avoid identity churn |
| `needsIkNg02` vs rows signal | Sufficient with attachment/rows/heavy-done rules **unchanged in bridge** |
| Re-entry when heavy finishes | Boolean deps `dossierBuilding` / `dossierEnriching` **required** — DF has them; keep |

**Binding soft amendment (not HB):** drop `pkg` from effect deps; snapshot at BEGIN.

### F. Early returns — PASS

| Class | Rule | OK? |
|-------|------|-----|
| Before BEGIN | no generation, no busy | **PASS** |
| After BEGIN | always `releaseBridgeBusyIfOwner` | **PASS** |
| P2 off | clear ingest + busy + owner | **PASS** |

IMPL must not leave bare `return` after `setBridgeBusy(true)` without release (today’s bug class).

### G. Semantics dossier / ingest / ready / KNR — PASS

| Contract | Change? |
|----------|---------|
| `runIkNg02IngestBridge` | **BYTE-STABLE** |
| `needsIkNg02Ingest` | **UNCHANGED** |
| `readyForExperts` | Still from Document Expert / bridge `expert` only |
| KNR `MASTER_BOQ_NOT_READY` | **UNCHANGED** |
| Synthetic `started` | Still UI-derived from `bridgeBusy` |

No authority / Historical / KL-6 / Catalog impact in scope.

### H. No new domain state — PASS

Frozen: only Host refs (`p2RunGenerationRef`, `p2BusyOwnerGenRef`, optional pipeline/onUpdate refs) + existing `bridgeBusy` / `ingest` UI state. **No** new KV, **no** new phase enum, **no** persisted `ingest=started`.

---

## 4. Banlist compliance — PASS

A-only Host P2 (+ latch tests). Explicitly OUT: Historical, KNR Historical, PDF Candidate, EC, P8, KL-6, VERIFY/APPROVE/REJECT, write-router, Catalog, evidence-store, LLM, TenderDetailPanel (B), QuotaExceeded (C), TendersModule (D).

---

## 5. Test review (DF T01–T12)

| ID | Covered by DF? | Arch note |
|----|----------------|-----------|
| T01 success | YES | Assert no `readyForExperts` force in Host source |
| T02 cancel | YES | busy false + retry eligible |
| T03 error | YES | BRIDGE_THROW shape unchanged |
| T04 early before BEGIN | YES | |
| T05 retry after cancel | YES | |
| T06 retry after error | YES | = re-entry, not timer |
| T07 stale generation | YES | |
| T08 double start | YES | |
| T09 unmount | YES | |
| T10 rapid item change | YES | fingerprint switch |
| T11 old success after new | YES | |
| T12 old cancel after new | YES | |

**SOFT GAP (tests):** React effect is awkward in vite-node. ARCH allows either:

1. Extract **pure** latch policy helper (generation/owner/isStale/release predicates) next to Host — **only if** needed for T01–T12; **no** bridge logic duplication, or
2. Scripted simulation of the state machine without mounting React.

Default DF “inline Host” remains OK if tests cover the pure predicates; **do not** skip T11/T12.

Regression: keep `test-ik-migration-01-p25-ingest.mjs`.

---

## 6. Real Tender Smoke #05c — acceptance criteria (ARCH-refined)

**Tender:** MOPS **`2026/BZP 00391783`** (pipeline id as in smoke #05/#05b).

### Must PASS (lifecycle A)

| # | Criterion |
|---|-----------|
| S1 | Open `/przetarg` → `IkEntryHost` mounts |
| S2 | P2 reaches a **terminal** Host state within reasonable wall time (not multi-minute synthetic `started` with `bridgeBusy` stuck) |
| S3 | After settle: `bridgeBusy === false` (probe `data-ik-ingest-phase` ≠ eternal derived `started` while idle) |
| S4 | If attachments/cost sources valid: real NG-02 path yields **dossier rows / extractedLineCount > 0** (or honest bridge `blocked` with reasons — not Host fake rows) |
| S5 | `readyForExperts=true` **only** when Document Expert / bridge expert status is truly ready — **never** Host-forced |
| S6 | KNR is **not** left on `MASTER_BOQ_NOT_READY` **solely** because cancel/`attemptedRef`/stale busy blocked ingest (A root) |
| S7 | If extract truly empty / heavy-done empty: KNR BLOCKED remains **legitimate** (contract) |
| S8 | No VERIFY / APPROVE / REJECT / Catalog writes attributable to this change |
| S9 | KL-6 / Historical / EC / P8 codepaths untouched |

### May RECORD (do not fail A)

| # | Residual |
|---|----------|
| R1 | B — TenderDetailPanel update-depth / tenderFit |
| R2 | C — QuotaExceeded work-catalog |
| R3 | D — TendersModule import flake |
| R4 | Historical UI strings only after KNR COMPLETED + index present |

### Forbidden “pass” cheats

- Setting `readyForExperts=true` in Host
- Synthetic BOQ lines
- Skipping `runIkNg02IngestBridge`
- Weakening KNR gate

---

## 7. Residual risk (accepted under A-only)

1. **Amplifier B** can still remount/stress Host; A must remain correct under cancel (retry), not eliminate B.
2. **Parallel Host bridge vs pipeline heavy** — HB2 reduces; full orchestration merge is OUT.
3. **Same-length doc replacement** without `documentsFetchedAt` bump — rare missed rerun.
4. **#05c** still depends on real attachments/NG-02 extract quality — A fixes latch, not parser yield.

---

## 8. IMPLEMENT GO prerequisites

```text
1. Owner accepts HARD BLOCKERS HB1 + HB2 as frozen amendments (this ARCH REVIEW §2)
2. Optional: accept soft drop of `pkg` from deps
3. Explicit Owner GO → IMPLEMENTATION
4. Scope remains A only + latch tests
5. No banlist files
```

**Do not** auto-start IMPLEMENTATION.

---

## 9. Final block

```text
ARCH REVIEW = PASS WITH GAPS

HARD BLOCKERS =
  HB1: onUpdateRef — exclude onUpdate from P2 effect deps (REUSE heavy-lazy)
  HB2: pipeline building/enriching refs for gates + post-wait (parent inline object)

SOFT GAPS =
  SG1: fingerprint may miss same-length doc swap without fetchedAt change
  SG2: prefer snapshot getTenderPackage at BEGIN; drop pkg from deps
  SG3: error retry is effect-reentry only (no auto timer) — intentional
  SG4: test harness may need pure latch predicates (no bridge duplicate)
  SG5: B/C/D residuals remain OUT — may still appear on #05c

IMPLEMENTATION = NOT AUTHORIZED

ZERO CODE CHANGE
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
```

**STOP — czekaj na Owner GO (accept HB1/HB2) → dopiero potem IMPLEMENTATION.**
