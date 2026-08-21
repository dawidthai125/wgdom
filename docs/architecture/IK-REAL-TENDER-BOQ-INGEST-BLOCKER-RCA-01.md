# IK — REAL TENDER BOQ INGEST BLOCKER · RCA #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01` |
| **Date** | 2026-08-21 |
| **Mode** | **RCA ONLY** · zero code change |
| **Parent AUDIT** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-AUDIT-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-AUDIT-01.md) **COMPLETE** |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) — IK = orchestrator · SEARCH BEFORE CREATE · no second BOQ |
| **Evidence smoke** | [`IK-HISTORICAL-EXECUTED-ATH-REAL-TENDER-UI-SMOKE-TEST-05B.md`](./IK-HISTORICAL-EXECUTED-ATH-REAL-TENDER-UI-SMOKE-TEST-05B.md) |
| **IMPLEMENTATION** | **NOT AUTHORIZED** |

```text
AUDIT         = COMPLETE / PASS WITH GAPS   (parent #01)
RCA           = COMPLETE / PASS WITH GAPS
PLAN          = NOT STARTED                 ← osobny gate (nie auto)
DESIGN FREEZE = NOT STARTED
ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

ZERO CODE CHANGE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 0. Scope & method

**IN:** lifecycle `bridgeBusy` → `ingest` → dossier rows → `readyForExperts` → KNR.
**OUT:** Historical Executed · KL-6 · Catalog · VERIFY/APPROVE · invent BOQ · fake ready.

Method: code-path RCA on current WC + smoke #05b observations. No runtime re-instrumentation in this gate.

---

## 1. Domain chain (contract — correct, do not bypass)

```text
attachments (discovery)
  → needsIkNg02Ingest(item)?
  → runIkNg02IngestBridge  (REUSE buildTenderDossierHeavy)
  → itemPatch.tenderDossier (+ rows)
  → runIkDocumentExpert(mergedItem)
  → masterBoq.readyForExperts === true
  → runIkKnrExpert COMPLETED
  → (optional) historicalIndex evidence in KNR/EC
```

Hard KNR gate (`ik-knr-expert.ts` **199–200**):

```ts
if (expert.masterBoq.readyForExperts !== true) {
  return blockedReport(..., "MASTER_BOQ_NOT_READY");
}
```

Bypassing this gate is **forbidden** (Owner ban + Master SSOT).

---

## 2. Is `ingest=started` a domain state?

**NO — it is a derived / synthetic Host UI latch.**

| Source | Role |
|--------|------|
| `IkNg02IngestBridgeResult.phase` | Real domain phases: `idle` · `needs_docs` · `started`* · `completed` · `blocked` · `skipped_already_done` (*bridge type allows `started`, but Host rarely stores it) |
| Host attr `data-ik-ingest-phase` | `ingest?.phase ?? (bridgeBusy ? "started" : "idle")` — **`IkEntryHost.tsx` ~546–548** |
| VM fake ingest | When `bridgeBusy && !ingest`, Host injects synthetic object `phase:"started"`, `reasons:["INGEST_STARTED"]` — **~492–509** |

Smoke #05b observed **`started` for minutes with `ingest==null` semantics** (no terminal bridge result: no `completed`/`blocked`/`BRIDGE_THROW` object). That matches **stuck `bridgeBusy=true`**, not a durable NG-02 domain “started” record.

---

## 3. Lifecycle map — `IkEntryHost` P2 effect

**File:** `src/app/intelligent-estimator/IkEntryHost.tsx`
**Effect:** ~**146–219**
**State:** `ingest` (~128), `bridgeBusy` (~129), `attemptedRef` (~132)

### 3.1 Who sets `bridgeBusy=true`

| Line | Condition |
|------|-----------|
| **160** | After early-gate checks pass: `setBridgeBusy(true)` then async IIFE |

### 3.2 Who should set `bridgeBusy=false` (intended)

| Line | Path |
|------|------|
| **149** | P2 flag OFF |
| **166–167** | After sleep: still dossierBuilding/enriching |
| **169–171** | After sleep: `!needsIkNg02Ingest` |
| **174–176** | Async: `attemptedRef.current === key` (duplicate) |
| **212–214** | `finally { if (!cancelled) setBridgeBusy(false) }` after try/catch of bridge |

### 3.3 Success path

```text
160 busy=true
178 attemptedRef=key
180–185 await runIkNg02IngestBridge(...)
186 if !cancelled → setIngest(result)
188–192 optional onUpdate(itemPatch)
213–214 finally → busy=false
```

Bridge SSOT: `src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts`
→ `buildTenderDossierHeavy` → `runIkDocumentExpert` → `phase: completed|blocked`.

### 3.4 Cancel / cleanup path (ROOT DEFECT SURFACE)

Cleanup (**217–219**):

```ts
return () => { cancelled = true; };
```

**Does not:** `setBridgeBusy(false)` · reset `attemptedRef`.

| Cancel moment | `setIngest` | `bridgeBusy` | Re-run possible? |
|---------------|-------------|--------------|------------------|
| During 1.5s sleep (**164** `if (cancelled) return`) | no | **STUCK true** (no clear) | If `attemptedRef` not yet set — maybe; if set later by racing twin — blocked |
| After bridge returns, `cancelled` (**186**) | **skipped** | **STUCK true** (`finally` skips clear when cancelled) | **`attemptedRef` already set → line 156 blocks forever** |
| After throw, `cancelled` (**195**) | skipped | **STUCK true** | same latch |
| Effect re-entry while previous in flight | previous cancelled | may stay true | **156** `attemptedRef===key` → **return without clearing busy** |

### 3.5 Early returns (before `busy=true`)

| Lines | Gate | Clears busy? |
|-------|------|--------------|
| 147–150 | P2 off | yes (null ingest + false) |
| 153 | no key | **no** |
| 154 | dossierBuilding/enriching | **no** |
| 155 | `!needsIkNg02Ingest` | **no** |
| 156 | `attemptedRef === key` | **no — critical latch** |
| 157 | no `onUpdate` | **no** |

If a prior run left `bridgeBusy=true`, early return at **156** preserves the synthetic `started` forever.

### 3.6 Does `attemptedRef` block retry?

**YES.** Once set to `tenderId` (**178**), any later effect execution hits **156** and returns. There is **no** reset on cancel, error, or success. Success path does not need retry; **cancel-after-attempt** permanently prevents a second bridge for that tender until remount/navigation away that remounts Host with fresh ref (same component instance keeps ref).

### 3.7 Does effect restart on `item` change?

**YES.** Deps include full **`item`** (**222**), plus `pkg`, `onUpdate`, `pipelineIngest`, dossier flags, etc.

Any `pipeline.updateItem` (e.g. `tenderFit` write from `TenderDetailPanel`) changes `item` reference → cleanup cancel → re-entry → latch risk above.

### 3.8 Can `setIngest` remain unset?

**YES — by design of cancel guards:**

- **186:** `if (cancelled) return` before `setIngest`
- **195:** same on error path
Combined with **`finally` only clearing busy when `!cancelled`**, cancel leaves both **no ingest** and **busy stuck**.

---

## 4. Downstream: dossier → readyForExperts → KNR

| Step | When bridge stuck | Smoke #05b |
|------|-------------------|------------|
| `tenderDossier` rows via `itemPatch` | never applied | cost/przedmiar counts **0** |
| `runIkDocumentExpert` | runs on item without heavy rows | `boq-status=pending`, `extracted-lines=0`, `master-ready=0` |
| `readyForExperts` | false | — |
| `runIkKnrExpert` | **BLOCKED** `MASTER_BOQ_NOT_READY` | `data-ik-knr-status=BLOCKED` |
| Historical EC copy | not reached | not observed |

Document Expert “9 documents found” = **attachment discovery** (`ik-entry-conversation` DOCUMENTS_DISCOVERED), **not** Master BOQ ready.

---

## 5. Separation (Owner matrix)

| Class | Finding |
|-------|---------|
| **A. ROOT CAUSE** | Host P2 effect **lifecycle latch**: cancel / `attemptedRef` / `bridgeBusy` without reliable clear → synthetic `started`, no `setIngest`, no dossier rows |
| **B. AMPLIFIER** | `TenderDetailPanel` **Maximum update depth** + `onUpdate({ tenderFit })` (~247–258) → `item` churn → effect restart/cancel |
| **C. UNRELATED** | `QuotaExceeded` on `kw-wgdom-work-catalog` — not on NG-02 dossier write path |
| **D. UNRELATED** | Flaky `TendersModule` dynamic import — blocked some sessions before Host; **not** cause of stuck-after-mount |
| **E. DOWNSTREAM** | Historical Executed / KNR historical narrative blocked **only because** BOQ/KNR readiness failed |

**Historical is not root cause.** Do not touch `historical-executed/*` for this defect.

---

## 6. RCA statement (one paragraph)

On real tender MOPS `2026/BZP 00391783`, the visible BOQ ingest state `started` was a **Host-derived latch** (`bridgeBusy && !ingest`), not a completed NG-02 domain phase. The P2 `useEffect` in `IkEntryHost` can cancel in-flight `runIkNg02IngestBridge` when `item` (or related deps) change; cancel paths skip `setIngest` and, critically, often **skip clearing `bridgeBusy`**, while `attemptedRef` still blocks a clean retry. Without a completed bridge `itemPatch`, Document Expert never obtains dossier rows → `readyForExperts=false` → KNR `MASTER_BOQ_NOT_READY`. TenderDetailPanel update-depth/`tenderFit` writes are a **likely amplifier** of effect churn, not a substitute BOQ parser bug. QuotaExceeded and TendersModule flake are **independent**.

**Confidence:** ROOT latch defects are **code-proven** (lines cited). Amplifier correlation with smoke is **high**; proving Panel as sole trigger needs a future instrumented repro (GAP).

---

## 7. Gaps (RCA)

| Gap | Class |
|-----|-------|
| No browser repro with React Profiler proving Panel→cancel ordering | soft |
| Whether `buildTenderDossierHeavy` also hung >4m in parallel | soft (cancel latch alone sufficient) |
| Whether `pipelineIngest` object identity (inline `{dossierBuilding…}` in TenderDetailPage ~758) adds extra effect churn | soft — worth checking in PLAN |

---

## 8. PLAN — NOT STARTED (draft for next Owner gate only)

> Per repo workflow: **PLAN is a separate gate**. Below is a **draft outline**, not PLAN COMPLETE / not DESIGN FREEZE.

### 8.1 Minimal fix thesis (when Owner authorizes PLAN→…→IMPL)

Lifecycle-only repair of Host P2 effect **without** changing IK readiness contract:

1. On effect cleanup: always `setBridgeBusy(false)` (and/or generation token).
2. On cancel after `attemptedRef` set: allow **one** retry (clear or generation-bump `attemptedRef`) **or** clear busy + mark incomplete without permanent latch.
3. Ensure every exit path that set `busy=true` clears it (including cancel-during-sleep and cancel-after-await).
4. Optionally narrow effect deps (`item.id` + dossier fingerprint) — **only if** proven safe; do not weaken `needsIkNg02Ingest`.
5. **Separate** optional follow-up: TenderDetailPanel update-depth / tenderFit stability (amplifier) — may be second ticket.

**Forbidden “fixes”:** force `readyForExperts=true` · fake BOQ · skip NG-02 · run KNR without dossier · touch Historical/KL-6/Catalog.

### 8.2 Candidate file scope (PLAN later)

| IN (minimal) | OUT (ban) |
|--------------|-----------|
| `IkEntryHost.tsx` (P2 effect / busy / attemptedRef only) | `historical-executed/**` |
| tests for Host ingest latch if existing harness can extend | `ik-knr-expert.ts` semantics (gate stays) |
| optional later: `TenderDetailPanel.tsx` fit-loop only | `executeKnrOwnerVerify*` · write-router · Catalog · evidence-store · PDF Candidate · ATH hydrate |

### 8.3 Banlist (absolute)

```text
historical-executed/*
KNR Historical Expert seam (match/kinds)
KL-6 · executeKnrOwnerVerifyApprove/Reject
VERIFY / APPROVE / REJECT UI paths
write-router · Catalog persist · evidence-store
PDF Candidate · invent parsers · fake readyForExperts
```

### 8.4 Test matrix (for future IMPL)

| ID | Case |
|----|------|
| T-LATCH-01 | Cancel during sleep → busy false · retry allowed |
| T-LATCH-02 | Cancel after bridge resolve → no silent stuck started · ingest or clean idle |
| T-LATCH-03 | Success → ingest set · busy false · readyForExperts respects real rows |
| T-LATCH-04 | `attemptedRef` does not permanently block after cancel |
| T-CONTRACT-01 | KNR still BLOCKED when no dossier rows (no bypass) |
| T-REG-01 | Existing NG-02 / Document Expert / KNR harnesses unchanged semantics |
| T-SMOKE-05c | Real MOPS UI: ingest leaves started · KNR can COMPLETE when rows exist |

### 8.5 Gate conditions (future)

| Gate | Enter when |
|------|------------|
| **PLAN** | Owner GO after accepting this RCA |
| **DESIGN FREEZE** | PLAN lists exact busy/attemptedRef semantics · no contract bypass · banlist frozen |
| **ARCH REVIEW** | Latch fix cannot race double-ingest; deps strategy reviewed |
| **IMPLEMENT GO** | Owner GO after DF + ARCH REVIEW PASS |

---

## 9. Verdict

```text
AUDIT = COMPLETE / PASS WITH GAPS
RCA   = COMPLETE / PASS WITH GAPS

ROOT CAUSE     = IkEntryHost P2 bridgeBusy/attemptedRef/cancel latch
                 → synthetic ingest "started" without setIngest
AMPLIFIER      = TenderDetailPanel update-depth / tenderFit item churn
UNRELATED      = QuotaExceeded work-catalog · TendersModule flake
DOWNSTREAM     = KNR BLOCKED · Historical UI not reachable

PLAN          = NOT STARTED
DESIGN FREEZE = NOT STARTED
ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

ZERO CODE CHANGE
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
```

**STOP — czekaj na Owner GO → PLAN (osobny gate).**
