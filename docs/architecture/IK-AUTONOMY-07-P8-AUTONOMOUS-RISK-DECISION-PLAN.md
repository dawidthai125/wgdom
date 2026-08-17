# IK AUTONOMY-07 — P8 Autonomous Risk / Validation / DW Prepare PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN` |
| **Status** | **PLAN READY FOR OWNER REVIEW** |
| **Date** | 2026-08-17 |
| **Mode** | **PLAN ONLY** · ZERO CODE · ZERO SETTINGS WRITE · ZERO RESEARCH HTTP · ZERO BUSINESS WRITE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY · ZERO DESIGN FREEZE · ZERO IMPLEMENT |
| **Production** | **2.66.91** / **`ab5eaaa1`** · docs **`ce552ace`** |
| **Owner GO** | **PASS** (PLAN authorized) |
| **Audit** | [`IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT.md) |
| **Policy** | [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) |
| **P5/P6/P7 reuse** | `IkE2eMode` · `isIkE2eModeActive` · `normalizeIkE2eMode` · `mergeIkE2eMode` · B-POLICY |

```text
PLAN                       = READY FOR OWNER REVIEW
OWNER DECISION             = REQUIRED (O1 vs O2)
Design Freeze              = NOT CREATED
Architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Implementation             = NOT AUTHORIZED
Code / Settings            = ZERO
Commit / Push / Deploy     = NOT DONE
```

---

## ★ OWNER DECISION REQUIRED (do not pre-select)

P8 SETTINGS — **same key** `ikRiskDecisionE2eEnabled` — **NO new flag**.

| Option | Shape | Default (if autonomy) | Kill-switch |
|--------|-------|------------------------|-------------|
| **O1** | `boolean` | `true` = AUTO · `false` = OFF | `false` |
| **O2** | `"AUTO" \| "OFF" \| "ON"` | `"AUTO"` (proposed) | `"OFF"` |

O2 is **preferred REUSE** of P5/P6/P7 helpers — **not chosen here**.

See **§17** and **§ OWNER DECISION GATE** at the end.

---

## Frozen facts (audit + source)

| # | Fact |
|---|------|
| Engine | `runIkP8RiskDecision` — EXISTING · PRODUCTION |
| Binding | `IkEntryHost` `useMemo` when `isIkP8RiskDecisionE2eActive()` — EXISTING |
| Consumer | `buildIkEntryConversationViewModel` (`riskDecision`) — EXISTING |
| First missing piece | **not a new wire** — **gate semantics** (boolean default `false`) |
| Classification | **E** — lever / configuration · **A** READ-ONLY prepare |
| P4 / D | P4 session start coupled to D · **OUT** · P8 must not unlock Chief |
| Paczka VII | `08decd1d-542e-312b-5fad-9500015f7011` · BOQ READY / 159 · CW **471** · P8 live **NOT OBSERVABLE** (IK Entry OFF · no settings write) |

---

## 1. Current P8 architecture

```text
IkEntryHost
  p8RiskOn = isIkP8RiskDecisionE2eActive()
           = ikEntryEnabled === true
           ∧ ikRiskDecisionE2eEnabled === true     ← DEFAULT false → HOLD

  positionCostBid = P7 useMemo (AUTO when Entry ON ∧ BOQ/OfferBoq)
  chiefSession    = prop from TenderDetailPage (null when D=false / P4 OFF)

  riskDecision = useMemo:
    if (!p8RiskOn) return null
    return runIkP8RiskDecision({
      item: effectiveItem,
      p7: positionCostBid,                         // may be null
      bidProposal: positionCostBid?.proposal ?? null,
      chiefSession,                                // may be null
    })

  → EC: RISK_OVERLAY · VALIDATION_EXPERT · Chief context · DECISION_WORKSPACE
```

**No extra BOQ READY gate on P8 host** (unlike P7). P8 runs whenever the lever is active.

Admin: checkbox `data-ik-risk-decision-e2e-toggle` · copy: default OFF · no research · no auto-Accept · no flip D / P4–P7.

---

## 2. Existing engine

`src/lib/intelligent-estimator/ik-p8-risk-decision.ts` · `runIkP8RiskDecision`.

REUSE only:

- `scoreTenderForOwnerView` / `buildOwnerDecisionView`
- `applyTenderIntelligenceOverlay` (`ownerFinanceProposal` = P7 proposal or null)
- `analyzeValidationFromDossier` **only if** `chiefSession.dossier` present
- `buildDecisionWorkspaceViewModel` (`localDecision: null`, `flagEnabled: true` IK-scoped)
- `idleChiefSessionOutput` when session null — **no invent dossier**

**PLAN: engine UNCHANGED.** No rewrite. No second Risk engine.

---

## 3. Existing binding

| Layer | Exists? | Change in this EPIC (after Owner + DF) |
|-------|---------|----------------------------------------|
| Host `useMemo` | **YES** | comment only (eligibility helper) |
| EC VM | **YES** | none expected |
| P7 → P8 args | **YES** | **KEEP** — do not invent adapter |
| Chief → P8 args | **YES** (optional) | **KEEP** null path |
| Admin ⚙ | **YES** checkbox | O1: copy/default · O2: select AUTO/OFF/ON |

**First missing binding:** **NONE** (product wire complete).  
**First missing handoff:** **NONE** (P7 already passed as `p7` / `bidProposal`).  
**First missing activation:** **YES** — `ikRiskDecisionE2eEnabled === true` default **false**.

---

## 4. First missing handoff

```text
MISSING = configuration gate, not a data adapter.

P7 → P8:  EXISTING  (IkEntryHost already passes positionCostBid)
P5/P6 → P8: NOT USED (engine has no labor/material fields)
Composite → P8: NOT USED
P4/D → P8: OPTIONAL  (null → Validation HOLD · honest)
```

Do **not** create a new P7→P8 adapter.

---

## 5. Input contract (KEEP)

| Input | Required? | Source today |
|-------|-----------|--------------|
| `item: TenderPipelineItem` | **YES** | `effectiveItem` |
| `bidProposal` | optional | `positionCostBid?.proposal` |
| `p7` | optional | `positionCostBid` (status provenance) |
| `chiefSession` | optional | TenderDetailPage prop · **null on D=false** |
| `scoringContext` | optional | default: local profile + stub health (in-engine) |

When P7 null: overlay uses `ownerFinanceProposal: null` (O4 HOLD path when raw GO — existing).  
When Chief null: `validationSource = "chief_unavailable"` · status often **hold** · **no invent**.

---

## 6. Output contract (KEEP)

`IkP8RiskDecisionReport` — in-memory only:

- `overlay` / `displayDecision` / `downgradeRule`
- `validation` / `validationVerdict` (null if no dossier)
- `decisionWorkspace` VM · `canApprove` / `canReject` **capability**
- `ownerDecisionRecorded` (false when `localDecision: null`)
- hard locks: research/HTTP/writes/Accept/D/P4 mutation **false / 0**

```text
displayDecision  ≠  Owner GO persist
canApprove       ≠  recordDecision
recommendedBid (P7) ≠ Final Bid
```

---

## 7. Read / write behavior

| Surface | P8 MODE A / AUTO |
|---------|------------------|
| Accept | **0** · `autoAcceptExecuted: false` |
| Price Commit | **0** |
| Final Bid / Persist | **0** · `localDecision: null` |
| PM / PRICE_DEMAND | **0** |
| CatalogWork | **0** |
| Tender mutation | **0** |
| Research HTTP / lease | **0** · no research lever |
| Settings write at runtime | **0** |
| D / P4 lever | **not flipped** |

READ: pipeline item · optional P7 proposal · optional Chief dossier · company profile (local scoring stub).

---

## 8–13. Dependencies

```text
                    TenderPipelineItem
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
   ★ P8 runIkP8RiskDecision              P7 proposal (optional READ)
         │                                    │
         │     P5/P6 React reports ───────────┼── NO
         │     Composite ─────────────────────┼── NO
         │     P4/D Chief dossier ────────────┼── OPTIONAL
         │                                    │
         ▼                                    ▼
   overlay + DW VM (memory)            Validation if dossier else HOLD
         │
         ▼
   Owner Persist / Final Bid = OWNER (outside P8)
```

| # | Dependency | Verdict |
|---|------------|---------|
| 8 | P8 self | lever + Entry |
| 9 | P7 | **READ optional** · existing host bind · **do not change P7** |
| 10 | P5/P6 | **NO** (engine has no fields; host does not pass reports) |
| 11 | Composite | **NO** · CLOSED · do not consume |
| 12 | D | **NO to run P8** · **MUST NOT activate D** |
| 13 | P4 Chief | **OPTIONAL** · **MUST NOT start Chief** when D=false · MUST NOT mutate `ikChiefWiringEnabled` |

P8 AUTO **must not** call `useChiefOrchestratorSession` / flip D / invent dossier.

---

## 14. Research boundary

P8 has **no** research lever. `httpCalls: 0` always.

P5/P6 Research stays separate `=== true`. P8 AUTO/ON **must not** set `executeResearch`.

Research Accept = **OWNER**.

---

## 15. Owner boundaries

| Boundary | Status |
|----------|--------|
| P8 prepare / EC facts | **autonomy candidate** (this PLAN) |
| Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid / `recordDecision` | **OWNER** |
| D | **HARD STOP false** |
| P4 Chief unlock | **OUT** |
| P1 / P2 / Composite / P7 redesign | **OUT** |

---

## 16. Settings semantics (current)

| Item | Today |
|------|-------|
| Key | `ikRiskDecisionE2eEnabled` |
| Type | **`boolean`** |
| Default | **`false`** |
| Load | `parsed.ikRiskDecisionE2eEnabled === true` |
| Merge | remote true/false explicit; else `local === true` |
| Runtime | `isIkRiskDecisionE2eEnabled()` → `=== true` |
| Tests | `forceIkRiskDecisionE2eForTests(boolean \| null)` |

Same class as **pre-AUTONOMY-06 P7**.

---

## 17. O1 vs O2

### O1 — boolean (`true` = AUTO · `false` = OFF)

| | |
|--|--|
| Reuse | existing type / load / merge / checkbox |
| AUTO | default **`true`** (factory flip) |
| ON | **no distinct mode** (true is the only enable) |
| OFF | `false` |
| Kill-switch | store `false` |
| Mixed-client | already boolean · old `=== true` matches |
| Risk | no explicit ON vs AUTO; rollback to false is HOLD |
| UI | checkbox (copy: AUTO when checked) |

**Consequence:** autonomy = change **default false→true**. Durable kill = uncheck. No third state.

### O2 — `"AUTO" \| "OFF" \| "ON"` (REUSE `IkE2eMode`)

| | |
|--|--|
| Reuse | `parseIkE2eMode` / `normalizeIkE2eMode` / `mergeIkE2eMode` / `isIkE2eModeActive` |
| AUTO | default `"AUTO"` · run P8 RO |
| ON | **same runtime as AUTO** (explicit force) |
| OFF | HOLD / kill-switch · **OFF wins merge** (existing C1) |
| Gate | `isIkE2eModeActive(mode)` — **never** `=== true` on enum · **never** `\|\| true` |
| UI | select (mirror P5/P6/P7) + confirm on OFF |
| Tests | extend `forceIkRiskDecisionE2eForTests(boolean \| IkE2eMode \| null)` like P7 C2 |

**If O2:** Owner must also lock **legacy boolean mapping (OD-P8b)** — do not invent in IMPLEMENT:

| Stored | Candidate A (B-POLICY, same as P5/P6/P7) | Candidate B (preserve HOLD) |
|--------|------------------------------------------|-----------------------------|
| `true` | **ON** | **ON** |
| missing / malformed | **AUTO** | **AUTO** or HOLD — Owner |
| `false` | **AUTO** (A06 B-POLICY) | **OFF** (preserves today’s factory HOLD) |

Today `false` = factory HOLD + Admin „po teście wyłącz”. A06 chose **false→AUTO** for P7 (OD-P7b). P8 is the **same historical shape**. PLAN does **not** pick A vs B; if O2, **OD-P8b** is required before DF.

### Comparison (for Owner)

| | O1 | O2 |
|--|----|----|
| Matches P5/P6/P7 UX | no | **yes** |
| Kill-switch distinct from “never opted in” | weak (`false` both) | **strong (`"OFF"`)** |
| Mixed-client / rollback | simple | old `=== true` on strings → HOLD (fail-safe, known A05/A06) |
| New flag | no | no |
| New engine | no | no |

**PLAN preference (non-binding):** O2 + B-POLICY reuse — **Owner decides**.

---

## 18. Migration (after Owner lock)

**O1:** `defaultAppSettings().ikRiskDecisionE2eEnabled = true`. Load/merge KEEP `=== true`. Host KEEP. Engine KEEP.

**O2:** type `IkE2eMode` on **same key**; load `normalizeIkE2eMode`; merge `mergeIkE2eMode`; `isIkP8RiskDecisionE2eActive` uses `isIkE2eModeActive` after boolean capability helper (mirror P7 `isIkF5E2eEnabled`). Default `"AUTO"`. OD-P8b table frozen in DF.

No KV rewrite job. No CatalogWork migration.

---

## 19. Kill-switch

| Option | Durable HOLD |
|--------|----------------|
| O1 | stored `false` |
| O2 | stored `"OFF"` (OFF wins merge) |

P8 OFF → host `riskDecision = null` → EC without P8 steps. Overlay/DW not computed. **Does not** write, **does not** flip D, **does not** change P7.

---

## 20. Rollback

| Path | Effect |
|------|--------|
| Revert code | old `=== true` · default false → P8 HOLD |
| O2 + old client | strings not `=== true` → HOLD (fail-safe) |
| O2 + old `false` over `"OFF"` | if B-POLICY: **AUTO** (same residual as A05/A06 C3) — document, do not “fix” by mapping false→OFF unless OD-P8b B |

---

## 21. Mixed-client behavior

| Client | O1 | O2 |
|--------|----|----|
| New | default AUTO-equivalent | enum AUTO/OFF/ON |
| Old PWA | boolean only | `"AUTO"`/`"OFF"`/`"ON"` → HOLD (`=== true` false) |
| Coordinated release | one Vercel Git deploy | **required** (same as A05 C2) |

---

## 22. Test strategy (post-DF · not run now)

- Gate matrix: Entry OFF → P8 inactive; AUTO/ON (or true) → engine called; OFF/false → null  
- AUTO ≡ ON runtime (if O2)  
- Locks: research/HTTP/writes/Accept/D/P4 = 0  
- P7 null: still runs · overlay without bid  
- Chief null: Validation HOLD · no invent  
- Does not call Labor/Material experts  
- Does not import Composite  
- P1 `mat.inv.*` / P2 KEEP GAP regression (untouched)  
- No Research HTTP  
- Host: no per-line P8 start; no new adapter  

Harness: extend or add `scripts/test-ik-autonomy-07-p8-…` **after** Owner + DF — not this turn.

---

## 23. Acceptance criteria (future IMPLEMENT)

1. Same key · no new flag · no new engine  
2. P8 AUTO/ON (or O1 true) + IK Entry ON → existing `useMemo` → `runIkP8RiskDecision`  
3. P8 OFF → HOLD  
4. Write audit MODE A = **0** on all forbidden surfaces  
5. D remains false · P4 not started by P8  
6. P7 / Composite / P1 / P2 unchanged  
7. Paczka VII: do **not** require live P8 if Entry OFF; do **not** flip settings to manufacture evidence  
8. Build + P8 / A05 / A06 regression PASS  

---

## 24. Non-goals

P4 Chief · D · P1 · P2 · Composite redesign · P7 redesign · Research engine · Accept · Price Commit · Final Bid · new engine · new flag · CatalogWork cleanup · invent dossier · `feedsP7Bid=true` · silent prod settings write in PLAN · DF/IMPLEMENT this turn.

---

## 25. Implementation boundary (after Owner + Arch Review + GO)

**In scope:**

- `app-settings.ts` — P8 type/default/load/merge (O1 or O2 as locked)  
- `ik-entry-flag.ts` — active helper (`isIkE2eModeActive` if O2) · test force  
- `AdminSettingsModal.tsx` — UI + copy (no Research/Accept/Final Bid/D)  
- `IkEntryHost.tsx` — **comment only** (binding KEEP)  
- changelog + harness  
- DF / Arch Review docs (later gates)

**Out of scope:** `ik-p8-risk-decision.ts` · Composite · P7 engine · Chief hook · D · Validation/DW engines.

---

## Target runtime (after Owner lock — not implemented)

```text
IK Entry ON ∧ P8 mode active
  → automatic READ-ONLY runIkP8RiskDecision
  → in-memory report → EC
  → Chief dossier used IF already present (D/P4) ELSE Validation HOLD
  → canApprove displayed, Persist = OWNER

P8 OFF → HOLD (no call)
Research = 0
D = false
P4 not started by P8
```

Proposed AUTO ≡ ON (if O2), same as P5/P6/P7.

---

## Write safety (MODE A / AUTO P8)

```text
0 Accept
0 Price Commit
0 Final Bid
0 PM writes
0 PRICE_DEMAND writes
0 CatalogWork writes
0 tender mutations
0 Research HTTP
0 D activation
```

---

## OWNER DECISION GATE

```text
OWNER DECISION REQUIRED

P8 SETTINGS:

  O1 = boolean
       true  = AUTO (run existing runIkP8RiskDecision, READ-ONLY)
       false = OFF  (HOLD / kill-switch)
       no distinct ON

  OR

  O2 = "AUTO" | "OFF" | "ON"
       AUTO = autonomous READ-ONLY P8 prepare (default proposed)
       ON   = same runtime as AUTO (explicit enable)
       OFF  = HOLD / kill-switch (OFF wins merge)
       helpers = REUSE IkE2eMode / isIkE2eModeActive / mergeIkE2eMode
       if O2: also lock OD-P8b (true→ON · missing→AUTO · false→AUTO or false→OFF)

P8 AUTO semantics:
  existing IkEntryHost useMemo → runIkP8RiskDecision
  no new binding · no new engine · no Chief start · no D

P8 OFF semantics:
  riskDecision = null · no engine call · durable kill-switch

P8 ON semantics:
  O1: N/A (true = AUTO)
  O2: identical to AUTO

migration:
  same key ikRiskDecisionE2eEnabled · no new KV · no CatalogWork write

kill-switch:
  O1 false · O2 "OFF"

Research boundary:
  P8 never enables Research · HTTP=0 · P5/P6 Research unchanged

Owner boundary:
  Accept / Price Commit / Final Bid / Persist = OWNER
  canApprove ≠ execute
```

**Do not implement until Owner picks O1 or O2** (and OD-P8b if O2).

---

```text
PLAN                       = READY FOR OWNER REVIEW
first missing binding      = NONE (wire exists)
first missing activation   = ikRiskDecisionE2eEnabled default false
engine                     = runIkP8RiskDecision
current gate               = ikEntryEnabled ∧ ikRiskDecisionE2eEnabled === true
O1 / O2                    = OWNER DECISION REQUIRED
architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Design Freeze              = NOT DONE
Implementation             = NOT AUTHORIZED
STOP.
```
