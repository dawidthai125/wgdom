# IK — REAL TENDER BOQ INGEST BLOCKER · DESIGN FREEZE #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01` |
| **Gate** | `OD-IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01` |
| **Date** | 2026-08-21 |
| **Mode** | **DESIGN FREEZE ONLY** · zero `src/**` · zero commit |
| **PLAN** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01.md) |
| **RCA** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md) |
| **Pattern REUSE** | `useTenderDossierHeavyLazy.ts` (~296–449) · `use-historical-executed-host-index.ts` `genRef` |

```text
AUDIT         = COMPLETE / PASS WITH GAPS
RCA           = COMPLETE / PASS WITH GAPS
PLAN          = COMPLETE / PASS WITH GAPS
DESIGN FREEZE = COMPLETE / PASS WITH GAPS
ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

SCOPE = A ONLY (IkEntryHost P2 lifecycle)
OUT   = B TenderDetailPanel · C QuotaExceeded · D TendersModule flake

ZERO CODE CHANGE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 0. SEARCH BEFORE CREATE (frozen reuse)

| Asset | Decision |
|-------|----------|
| `runIkNg02IngestBridge` / `needsIkNg02Ingest` | **BYTE-STABLE** · no contract change |
| `buildTenderDossierHeavy` | **UNCHANGED** (via bridge) |
| `runIkDocumentExpert` / `readyForExperts` | **UNCHANGED** |
| `runIkKnrExpert` / `MASTER_BOQ_NOT_READY` | **UNCHANGED** |
| `useTenderDossierHeavyLazy` generation + `isStale` + live-only finally clear | **CANONICAL PATTERN** — copy semantics into Host P2 |
| `use-historical-executed-host-index` `genRef` | Supporting evidence of same pattern |
| New BOQ / fake ready / second bridge | **FORBIDDEN** |

**IMPL surface (frozen):** `src/app/intelligent-estimator/IkEntryHost.tsx` — P2 effect only (~146–219 today).
**Optional test-only companion:** `scripts/test-ik-entry-p2-ingest-latch.mjs` (or extend `test-ik-migration-01-p25-ingest.mjs`).
**No new domain module** unless ARCH REVIEW mandates a pure helper extracted from Host for tests — default = logic stays in Host.

---

## 1. Scope freeze

### IN (A)

1. Generation guard for P2 bridge attempt
2. Guaranteed `bridgeBusy` cleanup
3. Correct terminal paths: success · cancel · error · early return
4. Retry after cancel (same tender, no full page reload)
5. Stale-generation isolation (no apply / no busy clobber)

### OUT (explicit)

| ID | Topic |
|----|--------|
| B | `TenderDetailPanel` / Maximum update depth / `tenderFit` |
| C | `QuotaExceeded` / `kw-wgdom-work-catalog` |
| D | Flaky `TendersModule` import |
| — | Historical Executed · PDF Candidate · EC · P8 · KL-6 · VERIFY · APPROVE · REJECT · write-router · Catalog · evidence-store · runtime LLM · NG-02 bridge internals |

---

## 2. Hard invariants (FROZEN)

| # | Invariant |
|---|-----------|
| I1 | `readyForExperts=true` **only** via existing Document Expert / bridge expert path — **never** Host-forced |
| I2 | No fake BOQ / synthetic dossier rows |
| I3 | No bypass of `runIkNg02IngestBridge` / NG-02 |
| I4 | KNR stays BLOCKED when dossier not ready (`MASTER_BOQ_NOT_READY` legitimate) |
| I5 | UI `ingest=started` = **derived only**: `bridgeBusy && !ingest` (attr/VM) — **not** a new persisted domain state |
| I6 | Every started lifecycle ends with busy released for its generation |
| I7 | Cancel/error must **not** permanently block retry |
| I8 | Stale generation must not mutate live Host state / dossier / readiness |

**Forbidden “fixes”:** forcing `readyForExperts=true`; inventing BOQ; skipping KNR gate; treating `started` as durable domain phase.

---

## 3. Lifecycle P2 (FROZEN)

```text
[idle]
  bridgeBusy=false
  ingest = null | previous terminal result
       │
       │  gates pass (E1–E6) → BEGIN ATTEMPT
       ▼
[start]
  generation = ++p2RunGenerationRef
  p2BusyOwnerGenRef = generation
  setBridgeBusy(true)          ← ONLY place busy→true
  (optional short pipeline wait)
       │
       ▼
[busy]  UI may show synthetic phase "started"
       │
       ├─ success (live)  → setIngest(result); apply itemPatch if live; RELEASE busy
       ├─ error (live)    → setIngest(blocked+BRIDGE_THROW); RELEASE busy
       ├─ cancel/stale    → NO setIngest; NO onUpdate; RELEASE busy (owner-safe)
       └─ early after busy→true → RELEASE busy; no bridge apply
       │
       ▼
[idle / terminal]
  bridgeBusy=false
  ingest holds last LIVE terminal result (if any)
```

Domain phases inside `ingest` remain owned by bridge: `completed` · `blocked` · `skipped_already_done` · `needs_docs` — **unchanged**.

---

## 4. Generation contract (FROZEN) — REUSE heavy-lazy

### 4.1 Refs (Host-local)

| Ref | Type | Role |
|-----|------|------|
| `p2RunGenerationRef` | `number` | Monotonic; **current** generation = `.current` |
| `p2BusyOwnerGenRef` | `number \| null` | Which generation last set `bridgeBusy=true` |
| ~~`attemptedRef`~~ | — | **DECOMMISSIONED** for P2 (see §6) |

### 4.2 Start

```text
const generation = ++p2RunGenerationRef.current;
const isStale = () => cancelled || generation !== p2RunGenerationRef.current;
p2BusyOwnerGenRef.current = generation;
setBridgeBusy(true);
```

### 4.3 Invalidate (cleanup of effect instance that started `generation`)

REUSE `useTenderDossierHeavyLazy` cleanup:

```text
cancelled = true;
if (p2RunGenerationRef.current === generation) {
  p2RunGenerationRef.current += 1;   // invalidate this generation
}
// busy release — see §5.3 (owner-safe)
```

### 4.4 Stale async result (FROZEN)

Before **any** of: `setIngest` · `onUpdate(itemPatch)` · success/error Host writes:

```text
if (isStale()) return;   // do nothing to Host/pipeline state
```

Stale generation **must not**:

- clear `bridgeBusy` owned by a **newer** generation
- call `setIngest`
- call `onUpdate` / mutate dossier
- influence Document Expert / `readyForExperts` / KNR

### 4.5 Live finally (FROZEN)

```text
finally {
  if (generation === p2RunGenerationRef.current
      && p2BusyOwnerGenRef.current === generation) {
    setBridgeBusy(false);
    p2BusyOwnerGenRef.current = null;
  }
}
```

If cleanup already bumped generation, live-finally of old gen **no-ops** busy clear (avoids no-op race with bump); cleanup path releases busy instead (§5.3).

---

## 5. `bridgeBusy` contract (FROZEN)

| Rule | Spec |
|------|------|
| Who sets `true` | Only Host P2 BEGIN ATTEMPT (§3) |
| Who sets `false` | (1) live `finally` when owner gen matches · (2) cleanup when releasing owner gen · (3) P2-off path · (4) early-exit **after** busy was set, via same owner-safe helper |
| Guaranteed cleanup | No path may leave owner gen with busy=true after terminal/cancel |
| Stale=true forbidden | After cancel/error/unmount/success of that attempt, busy must be false **unless** a **newer** live attempt has already set true |
| UI | Synthetic `started` only while `bridgeBusy && !ingest` |

### 5.1 Owner-safe release helper (conceptual — IMPL in Host)

```text
function releaseBridgeBusyIfOwner(gen: number) {
  if (p2BusyOwnerGenRef.current === gen) {
    setBridgeBusy(false);
    p2BusyOwnerGenRef.current = null;
  }
}
```

### 5.2 Cleanup busy (FROZEN)

On effect cleanup after BEGIN:

```text
cancelled = true;
if (p2RunGenerationRef.current === generation) {
  p2RunGenerationRef.current += 1;
}
releaseBridgeBusyIfOwner(generation);
```

**Why both bump + release:** bump invalidates async apply; release clears busy without waiting for stale `finally` (which must not clear a newer owner).

### 5.3 Newer generation race

| Event | Result |
|-------|--------|
| Old cleanup `releaseBridgeBusyIfOwner(old)` | No-op if `p2BusyOwnerGenRef` already = new gen |
| Old `finally` | No-op if generation ≠ current **or** owner ≠ old |
| New start | Sets busy true; owner = new gen |

---

## 6. `attemptedRef` contract (FROZEN)

| Topic | Freeze |
|-------|--------|
| Current P2 `attemptedRef` | **REMOVE** permanent latch `attemptedRef.current === key → return` |
| Why | Cancel after set leaves key latched forever → retry blocked (**ROOT CAUSE**) |
| Replacement | Generation + owner-safe busy only |
| Double-start guard | If `p2BusyOwnerGenRef.current != null` **and** same `p2Fingerprint` still in flight → **do not** start a second parallel bridge (effect re-entry while busy for same fingerprint = no-op early **before** busy=true) |
| When “in flight” clears | On owner-safe busy release (success/error/cancel/cleanup) |
| Cancel vs retry | Cancel clears in-flight → **next** eligible effect run **may** start again for same tender **without** page reload |
| Error vs retry | Live error writes ingest + releases busy; **no** permanent key latch. Further auto-run only when effect deps re-fire while `needsIkNg02Ingest` still true (see §8) |

**Labor/material/knowledge `*AttemptedRef`:** **OUT OF SCOPE** — do not change.

---

## 7. Early return contract (FROZEN)

### 7.1 Before BEGIN (before `setBridgeBusy(true)` / before `++generation`)

| Gate | Action |
|------|--------|
| `!p2DocumentsBoqOn` | `setIngest(null)`; `setBridgeBusy(false)`; `p2BusyOwnerGenRef=null`; return |
| no `key` | return (no busy) |
| pipeline building/enriching | return (no busy) |
| `!needsIkNg02Ingest(item)` | return (no busy) |
| `!onUpdate` | return (no busy) |
| same fingerprint already in flight | return (no busy) |

**Rule:** early return **before** BEGIN needs **no** attempt cleanup.

### 7.2 After BEGIN (busy already true)

Any exit (pipeline still building after wait · needs became false · throw · success · cancel) **must** call `releaseBridgeBusyIfOwner(generation)` (via `finally` and/or explicit path). **No** bare `return` that skips release.

Pre-bridge wait (`setTimeout` 1500) stays allowed; on cancel during wait → cleanup releases busy.

---

## 8. Retry contract (FROZEN)

| Scenario | Retry without full reload? |
|----------|----------------------------|
| Cancel / unmount of attempt / stale | **YES** — next effect run when gates pass |
| Error (`BRIDGE_THROW`) live | **YES** when effect re-fires (dep/fingerprint change or remount of effect) — **not** blocked by old `attemptedRef` |
| Infinite auto-loop on persistent throw | **FORBIDDEN** — no permanent latch, but **do not** add a timer that auto-restarts bridge; only effect-driven re-entry |
| Success with rows / `needsIkNg02Ingest=false` | **NO** re-bridge (natural) |
| Bridge domain `blocked` (0 lines after heavy stamp) | **NO** Host auto-force rescan (NG-02 / force CTA = OUT) |

**Error auto-retry cap:** **0 dedicated Host timers**. Cap is inherent: deps must change (or Host remount) to re-enter. Fingerprint narrowing (§9) reduces cancel churn without inventing retry storms.

---

## 9. Effect dependencies & fingerprint (FROZEN)

### 9.1 Fingerprint (eligibility / double-start)

```text
p2Fingerprint =
  `${item.id}|${item.tenderId}`
  + `|docs:${bzpDocuments.length}`
  + `|fetched:${item.documentsFetchedAt ?? ""}`
  + `|rows:${primaryOrArtifactRowSignal}`   // 0 vs >0 only, or needsIkNg02 boolean
```

**Do not** bind fingerprint to unstable UI-only fields (`tenderFit`, random object identity).

### 9.2 Effect deps (FROZEN for IMPL)

Replace broad `item` / whole `pipelineIngest` object churn where possible with:

```text
[
  p2DocumentsBoqOn,
  p2Fingerprint,
  pkg,                    // or pkg identity if stable
  onUpdate,
  athPreviewEnabled,
  pipelineIngest?.dossierBuilding,
  pipelineIngest?.dossierEnriching,
]
```

**Gap accepted (PASS WITH GAPS):** Amplifier B may still remount Host; A must still correctly cancel+retry. Narrowing deps is part of A **only** insofar as it stabilizes P2 eligibility — **not** a Panel fix.

Snapshot `item` / `pkg` into closure at BEGIN for bridge call (REUSE heavy-lazy snapshot style) so mid-flight prop churn does not change the in-flight bridge inputs after start; stale guard still applies before apply.

---

## 10. Race matrix (FROZEN)

| Race | Required behavior |
|------|-------------------|
| Success old gen after new started | No `setIngest` / no `onUpdate`; no busy clear of new |
| Cancel old after new started | No apply; `releaseBridgeBusyIfOwner(old)` no-op if new owns busy |
| Double start same fingerprint | Second BEGIN blocked while in flight |
| Fast tender/item change | Cleanup invalidates old; new fingerprint may BEGIN |
| Unmount mid-request | Cleanup invalidate + owner release; no apply after |
| Pipeline building during wait | Live path may early-exit after BEGIN → must release busy |

---

## 11. Impact freeze (non-goals)

| Surface | Change? |
|---------|---------|
| `setIngest` | Only live gen; cancel/stale skip |
| `readyForExperts` | **Semantics unchanged** — earned only via expert/bridge |
| KNR `MASTER_BOQ_NOT_READY` | Unchanged gate; clears only when dossier truly ready |
| Historical / EC / P8 / KL-6 | **NO TOUCH** |
| `ik-ng02-ingest-bridge.ts` | **BYTE-STABLE** |

---

## 12. File scope (FROZEN)

### IN

| Path | Allowed |
|------|---------|
| `src/app/intelligent-estimator/IkEntryHost.tsx` | P2 lifecycle only |
| `scripts/test-ik-entry-p2-ingest-latch.mjs` (new) **and/or** extend `scripts/test-ik-migration-01-p25-ingest.mjs` | Latch tests |

### NO-TOUCH

```text
ik-ng02-ingest-bridge.ts
ik-document-expert.ts
ik-knr-expert.ts
ik-knr-conversation.ts
ik-p8-risk-decision.ts
historical-executed/**
TenderDetailPanel.tsx
work-catalog / storage catalog keys
TendersModule dynamic import
KL-6 / executeKnrOwnerVerify* / write-router / Catalog / evidence-store
PDF Candidate / ATH hydrate (except do not break Host props)
```

---

## 13. Test contract (FROZEN)

Harness: vite-node companion preferred; extract pure generation/busy policy if needed for unitization **without** duplicating bridge.

| ID | Case | Expect |
|----|------|--------|
| T01 | success (live) | setIngest · busy=false · owner=null |
| T02 | cancel mid-flight | no setIngest · busy=false · retry eligible |
| T03 | error (live) | ingest blocked+BRIDGE_THROW · busy=false |
| T04 | early return before BEGIN | busy never true |
| T05 | retry after cancel | second BEGIN allowed same fingerprint |
| T06 | retry after error | second BEGIN allowed when effect re-enters; not blocked by old latch |
| T07 | stale generation | isStale skips apply |
| T08 | double start | second parallel BEGIN suppressed |
| T09 | unmount during request | cleanup release · no late apply |
| T10 | rapid tender/item change | old invalidated · new may complete |
| T11 | success of old after new started | no ingest/onUpdate/busy clobber |
| T12 | cancel of old after new started | old release no-ops busy if new owns |

Regression: existing `test-ik-migration-01-p25-ingest.mjs` still PASS; no readiness-bypass greps.

---

## 14. Real Tender Smoke #05c acceptance (FROZEN)

Target: MOPS **`2026/BZP 00391783`**.

| # | Criterion |
|---|-----------|
| 1 | Host mounts; P2 lifecycle **terminates** (not eternal synthetic `started`) |
| 2 | `bridgeBusy` not stale `true` after settle |
| 3 | `data-ik-ingest-phase` not stuck on derived `started` for minutes while idle |
| 4 | If sources valid: dossier/extracted rows **> 0** via real NG-02 path |
| 5 | `readyForExperts=true` **only** when Document Expert contract met |
| 6 | KNR not `MASTER_BOQ_NOT_READY` **solely** due to stale lifecycle latch |
| 7 | Historical evidence may appear in EC/KNR **only after** BOQ/KNR path ready — not forced |
| 8 | No VERIFY / APPROVE / REJECT |
| 9 | No Catalog writes from this fix |
| 10 | KL-6 unchanged |
| 11 | B/C/D residual OK to record — **do not** fail A if latch fixed |

---

## 15. Rollback (FROZEN)

Revert sole Host P2 + latch-test commit. No KV migration. No feature flag required.

---

## 16. Open for ARCH REVIEW only (not IMPL)

1. Confirm owner-safe release + generation bump order has no React batching hole.
2. Confirm fingerprint does not skip re-ingest when docs arrive (`documentsFetchedAt` / length).
3. Confirm snapshot-at-BEGIN does not starve `ensureDocuments` when docs empty (bridge already handles).
4. Optional extract of pure latch helper vs inline Host — prefer inline unless tests require extract.

---

## 17. Verdict

```text
DESIGN FREEZE = COMPLETE / PASS WITH GAPS

FROZEN:
  generation guard (heavy-lazy REUSE)
  bridgeBusy owner-safe cleanup
  attemptedRef DECOMMISSIONED (P2)
  retry after cancel without reload
  no fake ready / no BOQ invent
  bridge + readiness + KNR BYTE-STABLE contracts
  A only · B/C/D out

ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

ZERO CODE CHANGE
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
```

**STOP — czekaj na Owner GO → ARCH REVIEW.**
