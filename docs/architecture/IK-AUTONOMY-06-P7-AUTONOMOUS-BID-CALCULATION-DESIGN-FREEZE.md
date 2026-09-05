# IK AUTONOMY-06 — P7 Autonomous Bid Calculation  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = READY FOR ARCH REVIEW** |
| **Date** | 2026-08-17 |
| **Mode** | DESIGN FREEZE ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.90** / **`44e81d20`** |
| **PLAN** | [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md) |
| **OD-P7b** | [`IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md`](./IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md) |
| **Audit** | [`IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md) |
| **P5/P6 helpers** | `IkE2eMode` · `parseIkE2eMode` · `normalizeIkE2eMode` · `mergeIkE2eMode` · `isIkE2eModeActive` |

> **★★ CURRENT RUNTIME AMENDMENT (2026-09-05):** Host/Expert eligibility for Expert Chain uses **`expertChainMayProceed`** (Master §2A.9) · `readyForExperts` = Document READY lock only · line-tolerant **CLOSED/PV** @ **`a5d19047`**. Historical DF lines `readyForExperts ∨ OfferBoq lines` = drafting-era host guard wording — interpret with §2A.9. **Unchanged:** P7 read-only · Final Bid OWNER · Research CONDITIONAL.

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Implementation             = NOT AUTHORIZED
Code / Settings / Tests    = ZERO / NOT RUN
Commit / Push / Deploy     = NOT DONE
Production Verify          = NOT DONE
EPIC                       = NOT CLOSED
```

---

## 1. Context

Po **IK AUTONOMY-05** (P5/P6 `AUTO|OFF|ON`, B-POLICY) produkcyjny `IkEntryHost` uruchamia Document / A1 / Labor MODE A / Material MODE A / Composite (gdy P5∧P6).

**Pierwszy brakujący autonomiczny etap READ-ONLY:** **P7 Bid Calculation** — engine i binding istnieją; gate = boolean `ikF5E2eEnabled` default `false`.

Cel EPIC: P7 jako **AUTONOMOUS READ-ONLY CORE** (calc only). Final Bid / Accept / Price Commit pozostają **OWNER**.

---

## 2. Problem

```text
Current: ikF5E2eEnabled: boolean · default false · load === true
         → P7 HOLD unless Owner checkbox ON

Break:   configuration / lever (class A / E)
Not:     missing engine · missing binding · Accept · Final Bid · D
```

---

## 3. Audit Evidence

| Claim | Evidence class |
|-------|----------------|
| Engine `runIkP7PositionCostBid` exists | SOURCE |
| Binding `IkEntryHost` useMemo | SOURCE |
| Locks: research=0 · HTTP=0 · CW/PM write=false · `ensureOwnerQuestions:false` | SOURCE |
| P7 ↛ React P5/P6 reports | SOURCE |
| `feedsP7Bid=false` XOR | SOURCE |
| Prod tip 2.66.90 / `44e81d20` | PRODUCTION |
| Paczka VII BOQ 159 READY | REAL-TENDER (prior) |
| P7 live on Paczka VII | **NOT OBSERVABLE** (lever OFF; no flip in DF) |
| T04-style fixture | FIXTURE only — not live evidence |

---

## 4. Owner Decisions (LOCKED)

| ID | Decision | Status |
|----|----------|--------|
| **O2** | Enum `"AUTO"\|"OFF"\|"ON"` on same key `ikF5E2eEnabled` | **APPROVED** |
| **OD-P7b** | **B-POLICY** legacy migration | **APPROVED** |

Safety Owner locks (unchanged):

| Surface | Lock |
|---------|------|
| Research | CONDITIONAL |
| Accept | OWNER |
| Price Commit | OWNER |
| Final Bid | OWNER |
| D | FALSE / HARD STOP |
| P1 | CLOSED |
| P2 | KEEP GAP |
| Composite | CLOSED |
| CatalogWork | 471 (P7 READ only) |

---

## 5. O2

```text
Type:   IkF5E2eMode = IkE2eMode = "AUTO" | "OFF" | "ON"
Key:    ikF5E2eEnabled   (NO new flag)
Default:"AUTO"

AUTO → autonomous READ-ONLY P7 calculation
ON   → same runtime as AUTO (explicit Owner enable)
OFF  → HOLD / explicit kill-switch

AUTO runtime ≡ ON runtime
Semantic difference: default autonomy vs explicit enable
```

---

## 6. OD-P7b (B-POLICY — LOCKED)

| Stored | → Normalized |
|--------|--------------|
| `true` | **ON** |
| `false` | **AUTO** |
| missing / `null` / `undefined` | **AUTO** |
| `"AUTO"` / `"ON"` / `"OFF"` | idempotent |

```text
Historyczne false ≠ udowodniony explicit kill-switch
Po migracji jedyny trwały kill-switch = "OFF"
```

---

## 7. Current State

| Item | Value |
|------|-------|
| Type | `boolean` |
| Default | `false` |
| Load | `=== true` |
| Merge | `mergeIkF5E2eEnabled` boolean |
| Active | `ikEntryEnabled ∧ ikF5E2eEnabled === true` |
| UI | checkbox |
| Engine / binding | EXISTING · gated OFF |

---

## 8. Target State

```text
defaultAppSettings().ikF5E2eEnabled = "AUTO"

isIkP7F5E2eActive():
  ikEntryEnabled === true
  ∧ isIkE2eModeActive(normalizeIkE2eMode(ikF5E2eEnabled))

IkEntryHost (UNCHANGED structure):
  when active ∧ (masterBoq.readyForExperts ∨ offerBoq lines)
    → runIkP7PositionCostBid({ item, expert, package })
    → in-memory IkP7PositionCostBidReport / TenderBidProposal

when OFF → positionCostBid = null (HOLD)
```

Autonomous walk (target):

```text
TENDER → DOCUMENT / BOQ READY → A1 → P5 MODE A → P6 MODE A
  → P7 READ-ONLY BID CALC → TenderBidProposal (memory)
  → OWNER → Price Commit / Final Bid

Research = conditional · separate
D = hard stop false
```

---

## 9. P7 Contract

| Aspect | Freeze |
|--------|--------|
| Engine | **`runIkP7PositionCostBid` ONLY** — no new engine |
| Binding | **`IkEntryHost` ONLY** — no new orchestrator |
| Flow | OfferBoq/package → Position Cost → F5 cutover → `TenderBidProposal` |
| Output | **IN-MEMORY** proposal/report |
| Writes | **ZERO** (CW / PM / PRICE_DEMAND / tender / lease) |
| Research HTTP | **ZERO** |
| Accept / Price Commit / Final Bid | **ZERO** from P7 |
| `ensureOwnerQuestions` | **`false`** KEEP |

```text
P7 calculation ≠ Price Commit ≠ Final Bid
```

---

## 10. Settings Contract

| Aspect | Freeze |
|--------|--------|
| Key | `ikF5E2eEnabled` |
| Type | `IkF5E2eMode` (= `IkE2eMode`) |
| Default | `"AUTO"` |
| Active helper | `isIkE2eModeActive(mode)` → `mode === "AUTO" \|\| mode === "ON"` |
| Forbidden | `mode \|\| true` · `Boolean(mode)` · treating arbitrary strings as ON |
| Research keys | **unchanged** · P7 never sets them |

**Reuse** (mandatory unless Arch Review proves fork needed):

- `parseIkE2eMode`
- `normalizeIkE2eMode`
- `mergeIkE2eMode`
- `isIkE2eModeActive`

Wrapper `mergeIkF5E2eEnabled` → delegate to `mergeIkE2eMode` (mirror Labor/Material).

---

## 11. Legacy Migration

**Deterministic · idempotent · documented · B-POLICY:**

| Input | Output |
|-------|--------|
| `true` | `ON` |
| `false` | `AUTO` |
| missing | `AUTO` |
| `"AUTO"`/`"ON"`/`"OFF"` | same |
| malformed (other string/number/object) | see §11.1 |

### 11.1 Malformed / unknown (explicit)

Aligned with shared helpers (AUTONOMY-05):

```text
parseIkE2eMode(malformed) → null
normalizeIkE2eMode(malformed) → "AUTO"   // NOT "ON"
```

**A22 freeze interpretation:**

- **Forbidden:** silent enable via truthy coercion (`|| true`, `!!value`, non-enum string treated as ON).
- **Allowed:** B-POLICY normalize path → **`AUTO`** (enables RO calc identically to AUTO; **not** labelled ON).
- Malformed **must not** become **`ON`**.

This matches P5/P6. Changing malformed→OFF would fork helpers — **out of scope** unless Arch Review opens a blocker.

---

## 12. Merge Semantics

```text
mergeIkE2eMode(remote, local):
  OFF wins: if remote==="OFF" OR local==="OFF" → "OFF"
  else if remote parsed present → remote
  else → normalize(local)

INVARIANTS:
  never OFF → AUTO via merge
  never OFF → ON via merge
  never || true
  never infer AUTO from arbitrary truthy values outside parseIkE2eMode
```

---

## 13. Mixed Client Safety

| Stored / client | New client | Old client (`=== true`) |
|-----------------|------------|-------------------------|
| old `true` | ON · active | active |
| old `false` | AUTO · active (B-POLICY) | inactive |
| missing | AUTO · active | inactive (default false) |
| `"AUTO"` | active | **inactive** (fail-safe) |
| `"ON"` | active | **inactive** (fail-safe) |
| `"OFF"` | HOLD | inactive |
| malformed | AUTO via normalize | inactive |

**Rollback fail-safe:** old bundle cannot enable P7 from enum strings.

**Residual (same as AUTONOMY-05 T19):** old PWA may write boolean `false` over remote `"OFF"` → new B-POLICY maps to AUTO. Mitigation: single Vercel deploy + Version Awareness. Document in closeout; do not invent extra merge magic in this EPIC.

---

## 14. IkEntryHost Binding

| Rule | Freeze |
|------|--------|
| Keep | existing `useMemo` → `runIkP7PositionCostBid` |
| Change | only eligibility via `isIkP7F5E2eActive()` adapting to enum |
| Do NOT | new orchestrator · new engine · pass Composite/P5/P6 reports into P7 |
| Eligibility | IK Entry ON ∧ P7 AUTO\|ON ∧ (`readyForExperts` ∨ OfferBoq lines) — KEEP host guards |

---

## 15. P7 Runtime

```text
WHEN ikEntry ON ∧ BOQ/OfferBoq ready ∧ P7 ∈ {AUTO, ON}:
  automatic READ-ONLY calc · no user click required for calc

WHEN P7 === OFF:
  HOLD · no automatic P7 execution
```

No artificial `P5 → P7` / `P6 → P7` prerequisite in host.

---

## 16. Research Boundary

```text
P7 AUTO/ON MUST NOT:
  set executeResearch=true
  invoke Research HTTP
  create research lease
  bypass Research gate
  flip ikLaborResearchEnabled / ikMaterialResearchEnabled

AUTO ≠ Research · ON ≠ Research
Research = CONDITIONAL · separate keys · unchanged
```

Engine locks remain: `researchExecuted: false` · `httpCalls: 0`.

---

## 17. Owner Decision Boundary

| Action | Actor |
|--------|-------|
| P7 calc / in-memory proposal | Autonomous when AUTO\|ON |
| Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid | **OWNER** |
| Submit / finalize tender | **OWNER** |
| Mutate tender state from P7 | **FORBIDDEN** |

---

## 18. F5 XOR

```text
LOCK: Composite.feedsP7Bid = false
P7 does not consume Composite as input
Do NOT change: feedsP7Bid · Composite orchestration · F5 architecture · computePositionCost
```

---

## 19. Safety Invariants (FROZEN)

1. P7 AUTO = READ-ONLY  
2. P7 ON = READ-ONLY  
3. P7 OFF = HOLD  
4. AUTO ≠ Research  
5. ON ≠ Research  
6. P7 ≠ Accept  
7. P7 ≠ Price Commit  
8. P7 ≠ Final Bid  
9. Final Bid = OWNER  
10. Price Commit = OWNER  
11. Accept = OWNER  
12. D = false  
13. P1 unchanged  
14. P2 KEEP GAP  
15. Composite unchanged  
16. F5 XOR unchanged  
17. CatalogWork = 471 (no P7 write)  
18. no PM write  
19. no PRICE_DEMAND write  
20. no CatalogWork write  
21. no tender mutation  
22. no Research HTTP  
23. no automatic Accept  
24. no automatic Final Bid  
25. no new engine  
26. no new flag  

---

## 20. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| A1 | P7 mode parses AUTO/OFF/ON |
| A2 | default = AUTO |
| A3 | legacy true → ON |
| A4 | legacy missing → AUTO |
| A5 | legacy false → AUTO |
| A6 | AUTO executes read-only P7 |
| A7 | ON executes read-only P7 |
| A8 | OFF blocks P7 |
| A9 | OFF is durable kill-switch (merge OFF wins) |
| A10 | Research remains false unless separately enabled |
| A11 | Accept remains Owner |
| A12 | Price Commit remains Owner |
| A13 | Final Bid remains Owner |
| A14 | D remains false |
| A15 | P1 regression passes |
| A16 | P2 regression passes |
| A17 | Composite regression passes |
| A18 | F5 XOR remains intact |
| A19 | CatalogWork remains 471 |
| A20 | zero business writes from autonomous P7 |
| A21 | TenderBidProposal remains in-memory |
| A22 | no unsafe truthy enable; malformed → normalize AUTO (not ON) — §11.1 |
| A23 | mixed old/new client behavior deterministic (§13) |
| A24 | rollback fail-safe (old `=== true` on strings → HOLD) |

---

## 21. Test Matrix (DO NOT EXECUTE in this stage)

| ID | Case |
|----|------|
| T01 | default AUTO |
| T02 | explicit ON |
| T03 | explicit OFF |
| T04 | AUTO runtime |
| T05 | ON runtime |
| T06 | OFF HOLD |
| T07 | legacy true |
| T08 | legacy missing |
| T09 | legacy false |
| T10 | malformed value |
| T11 | OFF merge precedence |
| T12 | mixed old/new client |
| T13 | Research remains OFF (P7 path) |
| T14 | Accept boundary |
| T15 | Price Commit boundary |
| T16 | Final Bid boundary |
| T17 | D hard stop |
| T18 | P1 regression |
| T19 | P2 regression |
| T20 | Composite regression |
| T21 | F5 XOR |
| T22 | CatalogWork 471 |
| T23 | no PM write |
| T24 | no PRICE_DEMAND write |
| T25 | no CatalogWork write |
| T26 | no Tender mutation |
| T27 | no Research HTTP |
| T28 | in-memory proposal |
| T29 | rollback |
| T30 | Admin UI (AUTO/ON/OFF · no Research implication) |
| T31 | BOQ READY autonomous execution |
| T32 | OFF blocks execution |

---

## 22. Rollback

```text
IF unexpected P7 AUTO/ON behavior:
  set ikF5E2eEnabled = "OFF"
  → immediate P7 HOLD

MUST NOT require:
  data / price / tender mutation
  Research · Accept

Code rollback:
  revert impl → old === true on enum strings → HOLD (fail-safe)
```

---

## 23. Implementation Sequence (FROZEN — no skip)

1. Settings type / normalization  
2. Legacy migration (B-POLICY)  
3. Load / merge / save  
4. Admin UI (AUTO/ON/OFF · OFF confirm · no Research/Accept/Final Bid implication)  
5. P7 gate helper (`isIkP7F5E2eActive` / `isIkF5E2eEnabled`)  
6. Existing `IkEntryHost` binding (eligibility only)  
7. Test harness (T01–T32)  
8. Regression suites (P1/P2/Composite/F5/AUTONOMY-05)  
9. Build  
10. Owner Verify  
11. Commit  
12. Push  
13. Deploy  
14. Production Verify  
15. Documentation closeout  
16. EPIC CLOSE  

**Implementation = NOT AUTHORIZED until Arch Review PASS + Owner GO.**

---

## 24. Non-goals

OUT OF SCOPE:

- Research automation / engine  
- Accept / Price Commit / Final Bid automation  
- D · P1 redesign · P2 expansion  
- Composite / F5 / `computePositionCost` redesign  
- CatalogWork cleanup  
- new engine · new flag  
- Classification V2 · Chief redesign · PDF redesign  
- P4 / P8 autonomy (separate GO)

---

## 25. Owner Approval Gate

```text
BEFORE IMPLEMENT:
  [x] O2 APPROVED
  [x] OD-P7b B-POLICY APPROVED
  [x] Design Freeze document created
  [ ] Arch Review PASS
  [ ] Owner GO for IMPLEMENT

THIS TURN:
  Design Freeze ONLY
  Implementation NOT AUTHORIZED
```

Admin UI freeze (for later impl):

| Mode | Communicate |
|------|-------------|
| AUTO | Autonomous read-only P7 calculation |
| ON | Explicitly enabled read-only P7 calculation |
| OFF | Kill-switch / P7 HOLD · **explicit confirmation** (AUTONOMY-05 pattern) |

UI must **not** imply Research / Accept / Price Commit / Final Bid enabled.

---

## FINAL GATE

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Implementation             = NOT AUTHORIZED
Code                       = ZERO
Settings write             = ZERO
Research HTTP              = ZERO
Business writes            = ZERO
Test runtime               = ZERO
Commit                     = NOT DONE
Push                       = NOT DONE
Deploy                     = NOT DONE
Production Verify          = NOT DONE
EPIC                       = NOT CLOSED
STOP.
```
