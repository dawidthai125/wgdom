# IK — REAL TENDER BOQ INGEST BLOCKER · PLAN #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01` |
| **Gate** | `OD-IK-REAL-TENDER-BOQ-INGEST-BLOCKER-PLAN-01` |
| **Date** | 2026-08-21 |
| **Mode** | **PLAN ONLY** · zero `src/**` · zero commit |
| **RCA** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-RCA-01.md) **COMPLETE / PASS WITH GAPS** |
| **AUDIT** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-AUDIT-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-AUDIT-01.md) |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |

```text
AUDIT         = COMPLETE / PASS WITH GAPS
RCA           = COMPLETE / PASS WITH GAPS
PLAN          = COMPLETE / PASS WITH GAPS
DESIGN FREEZE = NOT STARTED
ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

SCOPE THIS PLAN = ROOT CAUSE (A) ONLY
AMPLIFIER (B) / UNRELATED (C)(D) = OUT OF THIS FIX
```

---

## 0. SEARCH BEFORE CREATE (REUSE FIRST)

| Existing asset | Reuse role |
|----------------|------------|
| `runIkNg02IngestBridge` / `needsIkNg02Ingest` (`ik-ng02-ingest-bridge.ts`) | **UNCHANGED** domain bridge · no duplicate parse |
| `buildTenderDossierHeavy` (NG-02) | **UNCHANGED** · bridge already REUSE |
| `runIkDocumentExpert` · `readyForExperts` | **UNCHANGED** readiness contract |
| `runIkKnrExpert` `MASTER_BOQ_NOT_READY` | **UNCHANGED** hard gate |
| `useTenderDossierHeavyLazy.ts` (~296–442) | **PATTERN REUSE**: `runGenerationRef` + `isStale()` + **only live generation clears building/inflight** |
| `use-historical-executed-host-index.ts` `genRef` | **PATTERN REUSE**: ignore stale async completions |
| `scripts/test-ik-migration-01-p25-ingest.mjs` | **EXTEND / companion** harness for Host latch (bridge tests stay) |

**Do not create:** new BOQ engine · new ingest orchestrator · new domain phase enum for UI · fake ready helper.

---

## 1. Goal

Minimal **Host P2 lifecycle** repair so a real tender can complete:

```text
bridge → ingest result → dossier rows (real) → readyForExperts (earned) → KNR Expert
```

Without bypassing readiness or changing authority / Historical / KL-6.

---

## 2. Invariants (FROZEN for DF later)

| # | Invariant |
|---|-----------|
| 1 | `readyForExperts=true` **only** when Document Expert status is truly `ready` (real dossier/lines) |
| 2 | No fake BOQ / synthetic rows |
| 3 | No bypass of NG-02 / `runIkNg02IngestBridge` |
| 4 | KNR must stay BLOCKED when dossier not ready |
| 5 | Visible `ingest=started` remains **UI-derived** (`bridgeBusy && !ingest`) — not a new persisted domain state |
| 6 | Every P2 path closes: success · cancel · error · early return · retry |
| 7 | `attemptedRef` (or successor) must **not** permanently block retry after cancel/error |
| 8 | `bridgeBusy` must not stay stale `true` after end/cancel/error |
| 9–13 | No Historical / KNR Expert / EC / KL-6 / VERIFY / Catalog / evidence / PDF Candidate changes |

---

## 3. Separation (do not merge fixes)

| Class | This PLAN |
|-------|-----------|
| **A ROOT** — Host P2 latch (`bridgeBusy` / cancel / `attemptedRef`) | **IN** |
| **B AMPLIFIER** — TenderDetailPanel update-depth / tenderFit | **OUT** (follow-up ticket after A) |
| **C** QuotaExceeded `kw-wgdom-work-catalog` | **OUT** |
| **D** Flaky TendersModule import | **OUT** |

Fixing A alone must be sufficient for correct retry after cancel; B only reduces cancel frequency.

---

## 4. Lifecycle state diagram

### 4.1 UI-derived Host view (attr / VM)

```text
                    ┌─────────────┐
                    │ idle        │  bridgeBusy=false · ingest=null
                    └──────┬──────┘
                           │ setBridgeBusy(true)
                           ▼
                    ┌─────────────┐
                    │ started*    │  *SYNTHETIC: busy && !ingest
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ ingest set │  │ cancel/    │  │ error →    │
    │ (domain    │  │ abort path │  │ setIngest  │
    │  phase)    │  │            │  │ blocked+   │
    └─────┬──────┘  └─────┬──────┘  │ BRIDGE_…   │
          │               │         └─────┬──────┘
          └───────────────┴───────────────┘
                           │ busy=false (ALWAYS on exit)
                           ▼
                    ┌─────────────┐
                    │ idle / done │  ingest may be completed|blocked|skipped_…
                    └─────────────┘
```

\* Do **not** invent a stored Host phase machine beyond existing `IkNg02IngestBridgeResult.phase`.

### 4.2 Domain bridge phases (unchanged)

`needs_docs` · `blocked` · `skipped_already_done` · `completed` · `blocked`(0 lines) — owned by `runIkNg02IngestBridge`.

### 4.3 Readiness (unchanged)

```text
ingest.expert / runIkDocumentExpert(item)
  → masterBoq.readyForExperts === true  ONLY if status === "ready"
  → else KNR MASTER_BOQ_NOT_READY
```

---

## 5. P2 entries & exits (current → planned)

**File:** `IkEntryHost.tsx` effect ~146–219 (sole IMPL surface for A).

### 5.1 Entries (when effect may start work)

| Entry | Condition |
|-------|-----------|
| E1 | `isIkP2DocumentsBoqActive() === true` |
| E2 | tender `key` present |
| E3 | not (pipeline dossierBuilding \|\| dossierEnriching) *at decision point* |
| E4 | `needsIkNg02Ingest(item) === true` |
| E5 | `onUpdate` present |
| E6 | **NEW contract:** no *live* in-flight generation for same fingerprint **OR** previous attempt finished (success/error/cancel cleaned) |

### 5.2 Exits (must all clear busy)

| Exit | Today | PLAN required |
|------|-------|---------------|
| X-P2OFF | busy=false · ingest=null | keep |
| X-NOKEY / X-PIPELINE / X-NEEDS / X-NOUPDATE | often no busy clear | if busy was true from prior → **must clear**; prefer not leaving busy without owner |
| X-SLEEP-CANCEL | **busy stuck** | **clear busy**; allow retry |
| X-DUP-ATTEMPTED | early return may leave busy | replace latch (see §7) |
| X-SUCCESS | setIngest · busy=false if !cancelled | **busy=false always for this generation**; apply setIngest only if generation live |
| X-SUCCESS-STALE | cancel skips setIngest **and** skips busy clear | **clear busy for that generation**; no permanent attempted block |
| X-ERROR | setIngest blocked+THROW if !cancelled | same generation rules; **always clear busy** |
| X-ERROR-STALE | busy stuck | clear busy; retry allowed |

---

## 6. Success / cancel / error / early-return matrix

| Path | setIngest | bridgeBusy end | retry allowed |
|------|-----------|----------------|---------------|
| Success (live gen) | yes (bridge result) | **false** | N/A (needsIkNg02 false if rows) |
| Success (stale gen) | **no** | **false** (that gen ends) | **yes** if still needs ingest |
| Cancel during pre-bridge wait | no | **false** | **yes** |
| Cancel after await | no | **false** | **yes** if still needs ingest |
| Throw (live) | blocked + `BRIDGE_THROW` | **false** | **yes** (bounded — see §8) |
| Throw (stale) | no | **false** | **yes** |
| Early: !needsIkNg02 | no (or leave prior ingest) | **false** | N/A |
| Early: pipeline building | no | **false** if this effect had set true; else unchanged | wait / later re-entry |
| P2 off | null ingest | **false** | N/A |

---

## 7. Ownership contracts

### 7.1 `bridgeBusy`

| Rule | Spec |
|------|------|
| Owner | `IkEntryHost` only |
| Set true | Exactly when this Host **starts** a live P2 bridge attempt |
| Set false | **Every** termination of that attempt (success/stale/cancel/error), preferably in `finally` **unconditional for that generation** |
| UI meaning | Sole driver of synthetic `started` when `ingest==null` |
| Forbidden | Leaving true after cancel; using busy as domain “ingest started” persistence |

### 7.2 `attemptedRef` → replace / redefine (minimal)

**Today:** permanent “already tried this tenderId” → blocks retry after cancel (**ROOT**).

**PLAN — REUSE generation pattern (from `useTenderDossierHeavyLazy` / hydrate hook):**

| Mechanism | Spec |
|-----------|------|
| `runGenerationRef` (number) | Increment on each effect start that intends work |
| In-flight | `generation` captured in closure; `isStale = () => cancelled \|\| gen !== runGenerationRef.current` |
| Dedup | Optional short-circuit: if **same** fingerprint already **in-flight** (live gen), do not start second parallel bridge |
| **Remove** permanent “never retry this key” semantics after cancel/error | Success with rows: `needsIkNg02Ingest` naturally stops re-entry |
| Error retry | Allowed on next effect when still `needsIkNg02Ingest`; optional cap (e.g. max 2 auto retries per fingerprint) — DF decides exact cap |

**Fingerprint (recommended):** `tenderId` + attachment identity (`documentsFetchedAt` / doc count) + “no rows yet” — **not** full `item` object identity. Narrowing deps is **allowed in DF** if it does not skip needed re-ingest when docs arrive.

### 7.3 Minimal cleanup contract

On effect cleanup:

1. Mark current attempt stale (`cancelled` and/or bump generation — prefer **generation bump on new start**, cancel flag on cleanup).
2. **`setBridgeBusy(false)`** when cleaning the generation that owned busy **OR** always clear busy on cleanup if this effect instance set it (mirror heavy-lazy “only live gen clears” carefully so a newer gen’s busy is not clobbered).

**Preferred REUSE (heavy-lazy):**

```text
cleanup: cancelled=true
finally (async): if (generation === runGenerationRef.current) setBuilding(false)
newer start: ++generation (old finally no-ops clear of newer busy)
```

Adapt 1:1 to `bridgeBusy`.

### 7.4 Retry contract

| Event | Retry |
|-------|-------|
| Cancel / stale | **YES** if `needsIkNg02Ingest` still true |
| Bridge throw | **YES** (bounded) |
| Bridge `blocked` (0 lines after heavy) | **NO** auto infinite loop — domain terminal; user/pipeline force rescan is existing NG-02 concern **OUT** of this PLAN |
| Bridge `completed` with rows | **NO** (`needsIkNg02Ingest` false) |
| Parallel double bridge same fingerprint | **NO** |

---

## 8. Impact analysis

| Surface | Impact of PLAN A |
|---------|------------------|
| `setIngest` | Only live generation writes; cancel no longer leaves eternal busy without result |
| `readyForExperts` | **Unchanged rule**; becomes reachable when bridge actually completes with real rows |
| KNR `MASTER_BOQ_NOT_READY` | Still correct when not ready; can clear once dossier ready |
| Historical | Untouched; benefits only as downstream consumer |
| Synthetic `started` | Still UI-only; duration should end when busy clears |
| `ik-ng02-ingest-bridge.ts` | **No logic change** unless DF finds pure helper extract for testability (optional, not required) |

---

## 9. Exact file scope

### 9.1 IN (ROOT A)

| Path | Change type |
|------|-------------|
| `src/app/intelligent-estimator/IkEntryHost.tsx` | P2 effect lifecycle only (~busy / generation / attempted semantics / cleanup / deps hygiene) |
| `scripts/test-ik-migration-01-p25-ingest.mjs` **and/or** new thin `scripts/test-ik-entry-p2-ingest-latch.mjs` | Latch/retry assertions · REUSE imports from bridge · **no** duplicate bridge |

Optional (DF decide): tiny pure helper next to Host **only if** needed for unitizing generation policy — prefer keep logic in Host first (SEARCH: no existing Host latch helper).

### 9.2 OUT / NO-TOUCH

```text
historical-executed/**
use-historical-executed-host-index.ts (except do not break imports)
ik-knr-expert.ts (semantics)
ik-knr-conversation.ts
ik-p8-risk-decision.ts
ik-document-expert.ts (readiness rules)
ik-ng02-ingest-bridge.ts (prefer zero change)
tender-dossier-pipeline / buildTenderDossierHeavy
TenderDetailPanel.tsx          ← AMPLIFIER B — separate gate
work-catalog / kw-wgdom-work-catalog
TendersModule dynamic import
KL-6 / executeKnrOwnerVerify* / write-router / Catalog / evidence-store
PDF Candidate / ATH hydration
```

---

## 10. Test matrix

| ID | Case | Expect |
|----|------|--------|
| T-LATCH-01 | Cancel during pre-bridge wait | busy=false · retry allowed |
| T-LATCH-02 | Cancel after bridge resolves | no setIngest from stale · busy=false · retry if needs |
| T-LATCH-03 | Success live | setIngest · busy=false · phase completed\|blocked from bridge |
| T-LATCH-04 | Throw live | ingest blocked+BRIDGE_THROW · busy=false · retry allowed |
| T-LATCH-05 | No permanent attempted block after cancel | second start runs bridge when needs |
| T-LATCH-06 | Parallel / rapid item churn | at most one live apply; busy not stuck |
| T-CONTRACT-01 | Empty dossier after blocked bridge | readyForExperts false · KNR BLOCKED |
| T-CONTRACT-02 | Source grep: no readyForExperts forced true in Host | PASS |
| T-REUSE-01 | Bridge still calls `buildTenderDossierHeavy` | PASS (existing P2.5 asserts) |

Implementation note: Host effect is React — prefer **extractable generation policy** tested via vite-node **or** behavior asserts via effect simulation; DF picks minimal approach. Do not require Playwright for unit latch.

---

## 11. Regression matrix

| Suite | Role |
|-------|------|
| `scripts/test-ik-migration-01-p25-ingest.mjs` | Bridge + Host wiring regression |
| Document Expert / KNR Slice B harnesses (existing) | No readiness bypass |
| Historical H-HIST / H-HYDRATE | Untouched · still PASS |
| No new KL-6 / Catalog tests required | banlist |

---

## 12. Real Tender Smoke #05c — acceptance

After IMPL (separate Owner GO) + restore/storage already OK:

| # | Criterion |
|---|-----------|
| 1 | Login → open `2026/BZP 00391783` → IkEntryHost mounts |
| 2 | `data-ik-ingest-phase` does **not** remain synthetic `started` indefinitely (>N min) while Host alive |
| 3 | Bridge reaches terminal: ingest object set **or** idle with busy=false |
| 4 | If NG-02 extracts rows: `data-ik-extracted-lines > 0` and/or przedmiar/cost counts reflect dossier |
| 5 | When Document Expert status `ready`: `data-ik-master-ready=1` · KNR not stuck BLOCKED solely due to latch |
| 6 | KNR still BLOCKED if extract truly empty (contract) |
| 7 | EC may show Historical strings **only if** KNR COMPLETED + historicalIndex present — not forced |
| 8 | No VERIFY/APPROVE/REJECT/Catalog writes |
| 9 | Amplifier B / Quota / TendersModule flake: record if still present — **not** fail A if latch fixed |

---

## 13. Rollback strategy

| Step | Action |
|------|--------|
| 1 | Revert sole commit touching `IkEntryHost.tsx` P2 effect (+ latch tests) |
| 2 | No data migration · no KV · no feature flag required for rollback |
| 3 | Behavior returns to pre-fix latch risk (known) |
| 4 | Do **not** roll back Historical / storage-budget / unrelated WIP |

Optional kill-switch (DF): none required if change is localized; avoid new settings flags unless ARCH REVIEW demands.

---

## 14. DESIGN FREEZE prerequisites (next gate)

DF must freeze:

1. Exact generation/busy cleanup algorithm (copy heavy-lazy semantics).
2. Effect dependency list (full `item` vs fingerprint).
3. Error retry cap (0 vs 1 vs 2).
4. Whether `ik-ng02-ingest-bridge.ts` stays byte-stable.
5. Banlist confirmation (B/C/D out).

---

## 15. ARCH REVIEW prerequisites

1. No double-apply of `itemPatch` from stale+live race.
2. No clobber: old finally must not clear newer `bridgeBusy`.
3. `onUpdate` from bridge must not itself create infinite P2 loop (rows → needs false).
4. Confirm synthetic `started` remains non-domain.

---

## 16. IMPLEMENT GO prerequisites

```text
PLAN = COMPLETE (this doc)
DESIGN FREEZE = PASS
ARCH REVIEW = PASS
Owner GO IMPLEMENT = explicit
Scope = A only
```

---

## 17. Verdict

```text
PLAN = COMPLETE / PASS WITH GAPS

Minimal fix = Host P2 generation + busy cleanup + non-blocking retry
REUSE = useTenderDossierHeavyLazy / hydrate genRef patterns
Bridge / Document Expert / KNR readiness = UNCHANGED contracts
Amplifier B / Quota / TendersModule = OUT

DESIGN FREEZE = NOT STARTED
ARCH REVIEW   = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

ZERO CODE CHANGE
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
```

**STOP — czekaj na Owner GO → DESIGN FREEZE.**
