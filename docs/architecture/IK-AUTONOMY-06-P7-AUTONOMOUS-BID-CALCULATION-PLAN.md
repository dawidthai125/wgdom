# IK AUTONOMY-06 — P7 Autonomous Bid Calculation PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN` |
| **Status** | **PLAN READY (O2 + OD-P7b LOCKED)** · Design Freeze = [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md) · **READY FOR ARCH REVIEW** |
| **Date** | 2026-08-17 · **revision: O2** |
| **Mode** | PLAN REVISION ONLY · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** · **ZERO DESIGN FREEZE** |
| **Production** | **2.66.90** / **`44e81d20`** |
| **Prior** | AUTONOMY-05 COMPLETE · [`IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md) |
| **Policy** | [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) §10 |
| **P5/P6 precedent** | [`IK-AUTONOMY-05-OD2-OWNER-DECISION.md`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) · B-POLICY · `mergeIkE2eMode` |

```text
AUTONOMY-06 OWNER DECISION = O2 = APPROVED
OD-P7b                     = ACCEPTED — B-POLICY (true→ON · missing→AUTO · false→AUTO)
P7 contract                = "AUTO" | "OFF" | "ON"
P7 AUTO / ON               = READ-ONLY MODE A (calc)
P7 OFF                     = KILL-SWITCH / HOLD
Design Freeze              = READY FOR ARCH REVIEW
Implementation             = NOT AUTHORIZED
Code / Settings            = ZERO
Commit / Push / Deploy     = NOT DONE
```

---

## ★ OWNER DECISION = O2 (APPROVED)

| Decision | Value |
|----------|-------|
| **Form** | **O2 — ENUM** (not O1 boolean) |
| **Key** | **same** `ikF5E2eEnabled` — **NO new flag** |
| **Type (target)** | `IkF5E2eMode` = `"AUTO" \| "OFF" \| "ON"` (alias / reuse `IkE2eMode`) |
| **Default** | **`"AUTO"`** |
| **Runtime AUTO** | autonomous READ-ONLY P7 calculation |
| **Runtime ON** | **identical** to AUTO (explicit Owner enable) |
| **Runtime OFF** | HOLD · explicit kill-switch · P7 does not run |
| **Research** | **CONDITIONAL / unchanged** — P7 never enables Research |
| **Accept** | **OWNER** |
| **Price Commit** | **OWNER** |
| **Final Bid** | **OWNER** |
| **D** | **FALSE / HARD STOP** |
| **P1** | **CLOSED** |
| **P2** | **KEEP GAP** |
| **Composite** | **CLOSED** · XOR KEEP |
| **CatalogWork** | **471** (read-only for P7) |
| **New engine** | **NO** |
| **New flag** | **NO** |
| **Reuse** | **YES** |

### Semantic difference AUTO vs ON

| Mode | Runtime | Intent |
|------|---------|--------|
| **AUTO** | run `runIkP7PositionCostBid` (RO) | normal autonomous default |
| **ON** | **same** run (RO) | explicit Owner force-enable |
| **OFF** | host returns `null` / no call | durable kill-switch |

```text
P7 CALCULATION  ≠  PRICE COMMIT  ≠  FINAL BID
P7 AUTO/ON      ≠  Research ON
P7 AUTO/ON      ≠  Accept / Final Bid
```

---

## 0. Frozen from OWNER REVIEW (unchanged facts)

| # | Fact |
|---|------|
| Engine | `runIkP7PositionCostBid` — OfferBoq/package → Position Cost → F5 cutover → `TenderBidProposal` **in-memory** |
| Read-only | **YES** · locks: researchExecuted=false · httpCalls=0 · catalogWorkWrite=false · priceMemoryWrite=false · `ensureOwnerQuestions: false` |
| Binding | `IkEntryHost` `useMemo` when `isIkP7F5E2eActive()` |
| Classification | **A** — READ-ONLY CALC · configuration gap |
| Paczka VII | `08decd1d-542e-312b-5fad-9500015f7011` · BOQ 159 READY · P7 live **NOT OBSERVABLE** (lever OFF; no flip) |

---

## 1. Current state (production today)

| Item | State |
|------|-------|
| Type | **`boolean`** |
| Default | **`false`** |
| Load | `parsed.ikF5E2eEnabled === true` (strict opt-in) |
| Merge | `mergeIkF5E2eEnabled` — remote true/false explicit; else local === true |
| Active gate | `ikEntryEnabled === true` ∧ `ikF5E2eEnabled === true` |
| Admin UI | checkbox „IK · F5 / BID E2E (P7)” |
| Prod effect | P7 **HOLD** (boolean false) |
| First break | configuration / lever |

---

## 2. Desired state (after DF + impl — future)

```text
defaultAppSettings().ikF5E2eEnabled = "AUTO"
isIkP7F5E2eActive() ⇔ ikEntry ON ∧ isIkE2eModeActive(P7 mode)
  → AUTO|ON: runIkP7PositionCostBid → in-memory report → EC display
  → OFF: null / HOLD
Final Bid / Accept / Price Commit = OWNER
Research levers = unchanged (CONDITIONAL · separate keys)
D = false · feedsP7Bid = false · Composite CLOSED · P1/P2 unchanged
```

Eligibility (host — KEEP): IK Entry ON ∧ (`masterBoq.readyForExperts` ∨ OfferBoq lines) ∧ P7 mode AUTO|ON.

---

## 3. Dependency graph (evidence — not assumed)

```text
                    Document Expert (OfferBoq / Master BOQ)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   P5 Labor MODE A      P6 Material MODE A     ★ P7 Bid calc
   (React report)       (React report)         runIkP7PositionCostBid
         │                    │                    │
         └────────┬───────────┘                    │
                  ▼                                │
            Composite BOTH_HOLD                    │
            feedsP7Bid = false ──── XOR ───────────┘
                  │                                │
                  │                         CatalogWork READ
                  │                         Price Memory READ
                  │                         company profile READ
                  ▼                                ▼
            EC display only              TenderBidProposal (memory)
                                               │
                                               ▼
                                    Final Bid / Accept = OWNER
                                    (outside P7)
```

| Edge | Dependency? | Evidence |
|------|-------------|----------|
| P7 ← P5 React report | **NO** | `IkEntryHost` does not pass `labor` into `runIkP7PositionCostBid` |
| P7 ← P6 React report | **NO** | same |
| P7 ← Composite | **NO** | `feedsP7Bid: false` hardcoded; P7 args = item + expert + package |
| P7 ← CatalogWork / PM | **YES READ** | shadow/cutover / package helpers via `loadWorkCatalogStoreLocal` |
| P7 ← Document OfferBoq | **YES** | `expert.offerBoq` / package dwellings |
| P7 ↔ P5/P6 safety gates | **NO bypass path** | P7 does not call Labor/Material experts · does not flip Research · does not Accept |

**Conclusion:** P7 is **data-independent** of P5/P6 React results. Richer rates after Owner Accept are a **business data** effect on CatalogWork/PM, not a host prerequisite. P7 AUTO **must not** bypass P1/P2/Composite safety — and **does not** (separate engines + XOR).

---

## 4. Settings migration (O2)

### 4.1 Target type

```text
ikF5E2eEnabled: IkF5E2eMode   // = IkE2eMode = "AUTO" | "OFF" | "ON"
```

**Reuse** existing `parseIkE2eMode` / `normalizeIkE2eMode` / `mergeIkE2eMode` / `isIkE2eModeActive` (same helpers as P5/P6) — **no parallel parser** unless DF proves need.

### 4.2 Locked mappings (O2)

| Stored value | Normalized | Runtime |
|--------------|------------|---------|
| `"AUTO"` | AUTO | P7 calc ON (RO) |
| `"ON"` | ON | P7 calc ON (RO) — identical |
| `"OFF"` | OFF | HOLD |
| `true` (legacy) | **ON** | P7 calc ON (RO) — preserves explicit opt-in |
| missing / unknown | **AUTO** (via normalize) | P7 calc ON (RO) — matches default |
| `false` (legacy) | **→ OD-P7b** | see §4.3 |

### 4.3 Historical semantics of `ikF5E2eEnabled === false` (analysis — no guess)

Evidence from current contract:

| Signal | Meaning of `false` |
|--------|-------------------|
| `defaultAppSettings()` | **factory HOLD** — E2E opt-in default OFF |
| load `=== true` | anything non-true → inactive |
| Admin copy | „Domyślnie OFF… Po teście: wyłącz” |
| merge remote false | persists as boolean false |
| Prod KV (AUTONOMY-05 PV) | key often **absent** → hydrate to default false |

**Ambiguity (same as pre-AUTONOMY-05 P5/P6):** stored `false` **cannot** distinguish:

1. never-touched default HOLD  
2. Owner unchecked after E2E test (intentional kill)  
3. sync materialization of default  

Therefore **legacy `false → ?` is not derivable from data alone** — requires **OD-P7b**.

### 4.4 OD-P7b — Owner Decision (PENDING before Design Freeze)

**SSOT:** [`IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md`](./IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md) · **ACCEPTED = B-POLICY**

| Variant | `false` → | Status |
|---------|-----------|--------|
| **B-POLICY** | **AUTO** | **LOCKED** |
| **B-CONSERVATIVE** | OFF | REJECTED |

```text
LOCKED: true→ON · missing→AUTO · false→AUTO · durable kill = "OFF"
```

**This PLAN does NOT implement the mapping** (implementation after Arch Review + Owner GO).

### 4.5 Active flag API (target)

```text
isIkF5E2eEnabled() / isIkP7F5E2eActive():
  ikEntryEnabled === true
  ∧ isIkE2eModeActive(normalize(ikF5E2eEnabled))
  // AUTO|ON → true · OFF → false
  // NEVER: mode || true · NEVER: Boolean(string)
```

Research: **no P7 research key** · do not set `executeResearch` · do not touch `ikLaborResearchEnabled` / `ikMaterialResearchEnabled`.

---

## 5. Merge semantics (target — OFF wins)

Reuse **C1** from AUTONOMY-05:

```text
mergeIkE2eMode(remote, local):
  if remote === "OFF" OR local === "OFF" → "OFF"
  if remote parsed present → remote
  else → local (normalized)

FORBIDDEN:
  OFF → AUTO via hydration
  OFF → ON via hydration
  || true
  treating "AUTO"|"ON"|"OFF" as boolean truthy
```

Dedicated wrapper name (optional): `mergeIkF5E2eEnabled` → call `mergeIkE2eMode` (same as Labor/Material wrappers).

---

## 6. Mixed-client safety

| Scenario | Behavior | Safety |
|----------|----------|--------|
| New code + `"AUTO"`/`"ON"`/`"OFF"` | enum path | OK |
| New code + legacy `true` | → ON | OK |
| New code + legacy `false` | per **OD-P7b** | pending |
| **Old code** reads string enum | `=== true` → **false** → P7 **HOLD** | **fail-safe rollback** |
| Old PWA writes `false` over remote `"OFF"` | new code + B-POLICY → AUTO | **residual** (same as AUTONOMY-05 T19) · mitigate: single Vercel deploy + Version Awareness |
| Save | persist string enum only after new build | no boolean re-save of ACTIVE as `true` without DF rule |

**Rollback fail-safe:** old bundle cannot accidentally enable P7 from string values (`=== true` fails).

---

## 7. Admin UI (plan only — no change now)

Replace checkbox with **3-state** control (same pattern as P5/P6 AUTONOMY-05):

| Control | Label (PL candidate) | Meaning |
|---------|----------------------|---------|
| AUTO | IK · F5 / BID (P7) — AUTO | autonomiczny READ-ONLY calc |
| ON | — ON | jawne Owner enable · ten sam RO calc |
| OFF | — OFF | kill-switch · HOLD |

Requirements:

- short help: calc ≠ Final Bid ≠ Accept ≠ Research  
- **confirmation for OFF** (optional but recommended — mirror P5/P6 if present)  
- **no** Research toggle coupling  
- **no** Accept / Final Bid / D controls in this row  
- `data-ik-f5-e2e-*` hooks updated for harness  

---

## 8. Existing binding & engine (REUSE)

| Asset | Action |
|-------|--------|
| `runIkP7PositionCostBid` | **UNCHANGED** |
| `IkEntryHost` useMemo | only eligibility helper (`isIkP7F5E2eActive`) adapts to enum |
| F5 cutover / shadow / package / bid calculator | **UNCHANGED** |
| `feedsP7Bid=false` | **UNCHANGED** |
| Composite / P1 / P2 | **UNCHANGED** |
| New engine / orchestrator / flag | **NO** |

---

## 9. Safety invariants (post-impl must hold)

1. P7 AUTO ≠ Research  
2. P7 ON ≠ Research  
3. P7 OFF = HOLD  
4. P7 calc ≠ Price Commit  
5. P7 calc ≠ Final Bid  
6. Accept = OWNER  
7. Price Commit = OWNER  
8. Final Bid = OWNER  
9. D = false  
10. P1 unchanged  
11. P2 KEEP GAP  
12. Composite unchanged  
13. F5 XOR unchanged (`feedsP7Bid=false`)  
14. CatalogWork count baseline 471 (no P7 write)  
15. no business writes from P7  
16. no Research HTTP from P7  
17. no auto Accept  
18. no auto Final Bid  

---

## 10. Test matrix (design only — do not run now)

| ID | Case | Expect |
|----|------|--------|
| T01 | default | `"AUTO"` |
| T02 | explicit ON | mode ON · active |
| T03 | explicit OFF | mode OFF · inactive |
| T04 | AUTO runtime | `isIkP7F5E2eActive` true (IK Entry ON) · host calls engine |
| T05 | ON runtime | identical active |
| T06 | OFF HOLD | active false · `positionCostBid === null` |
| T07 | Research remains false | P7 path `researchExecuted===false` · Research keys untouched by P7 |
| T08 | Accept remains Owner | no Accept in P7 source/locks |
| T09 | Price Commit Owner | `priceMemoryWrite===false` · `catalogWorkWrite===false` |
| T10 | Final Bid Owner | proposal in-memory ≠ commit path |
| T11 | D remains false | `expertAiDecydentEnabled` untouched |
| T12 | P1 regression | invoice host / mat.inv block unchanged |
| T13 | P2 regression | PRODUCT_IDENTITY_GAP KEEP |
| T14 | Composite regression | BOTH_HOLD consumer unchanged when P5∧P6 |
| T15 | F5 XOR | `feedsP7Bid===false` · P7 args exclude composite |
| T16 | CatalogWork 471 | no write; count stable in RO checks |
| T17 | legacy true | → ON |
| T18 | legacy false | per **OD-P7b** (assert chosen mapping) |
| T19 | mixed old/new client | old `=== true` on strings → HOLD; document residual false-over-OFF |
| T20 | merge OFF precedence | remote or local OFF → OFF (never OFF→AUTO) |
| T21 | rollback | string modes under old code → HOLD |
| T22 | Admin UI | 3-state present · no Research coupling |
| T23 | no business writes | locks + static asserts |
| T24 | no Research HTTP | `httpCalls===0` |
| T25 | proposal in-memory | report/proposal not persisted as Final Bid |

Harness: extend `test-ik-migration-01-p7-implementation.mjs` and/or new `test-ik-autonomy-06-p7-*.mjs`; update AUTONOMY-05 T25 (P7 no longer forced boolean false default).

---

## 11. Rollback

| Layer | Action |
|-------|--------|
| Settings | set `"OFF"` (explicit kill) |
| Code | revert impl commit → old `=== true` treats enums as inactive (**fail-safe**) |
| Tip | restore `09_PRODUCTION_BASELINE` |

---

## 12. Real tender

| Field | Value |
|-------|-------|
| Paczka VII | `08decd1d-542e-312b-5fad-9500015f7011` |
| BOQ | 159 / READY |
| P7 live | **NOT OBSERVABLE** (current lever OFF; **no** prod flip / Research / Accept / Commit / Final Bid in this turn) |

---

## 13. Owner gates before Design Freeze

| Gate | Status |
|------|--------|
| O2 ENUM | **APPROVED** |
| OD-P7b legacy `false` → AUTO (B-POLICY) | **ACCEPTED** |
| Scope P7 only (not P4/P8) | required confirm at Arch Review / Owner GO |
| Safety invariants | required keep |
| Design Freeze | **READY FOR ARCH REVIEW** |
| Owner GO → IMPLEMENT | **not this turn** |

```text
Next: Arch Review → Owner GO → IMPLEMENT
Not now: code · settings write · commit · push · deploy
```

---

## FINAL SNAPSHOT

```text
AUTONOMY-06 OWNER DECISION = O2 = APPROVED
P7 contract                = AUTO | OFF | ON
P7 AUTO                    = READY FOR FUTURE IMPLEMENTATION (RO MODE A)
P7 ON                      = READY FOR FUTURE IMPLEMENTATION (same RO)
P7 OFF                     = KILL-SWITCH
OD-P7b legacy false        = ACCEPTED — B-POLICY (false→AUTO)
Design Freeze              = READY FOR ARCH REVIEW
Implementation             = NOT AUTHORIZED
PLAN                       = READY
CODE                       = ZERO
SETTINGS WRITE             = ZERO
COMMIT                     = NOT DONE
PUSH                       = NOT DONE
DEPLOY                     = NOT DONE
STOP.
```
