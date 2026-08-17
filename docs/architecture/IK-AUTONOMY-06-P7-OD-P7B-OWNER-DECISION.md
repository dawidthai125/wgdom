# IK AUTONOMY-06 — OD-P7b Owner Decision  
## Legacy `ikF5E2eEnabled = false` → enum migration

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION` |
| **Status** | **OD-P7b = ACCEPTED — B-POLICY** |
| **Date** | 2026-08-17 |
| **Mode** | OWNER DECISION LOCKED · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO IMPLEMENT** (decision doc only) |
| **Production** | **2.66.90** / **`44e81d20`** |
| **Parent PLAN** | [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md) |
| **Design Freeze** | [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md) |
| **P5/P6 precedent** | [`IK-AUTONOMY-05-OD2-OWNER-DECISION.md`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) · OD-2b **B-POLICY** |

```text
O2                         = APPROVED
OD-P7b                     = ACCEPTED — B-POLICY
Mapping                    = true→ON · missing→AUTO · false→AUTO
Durable kill-switch        = "OFF" only
Design Freeze              = READY FOR ARCH REVIEW (separate doc)
Implementation             = NOT AUTHORIZED until Arch Review + Owner GO
```

---

## 1. Context

**IK AUTONOMY-06** first autonomy break = **P7 Position Cost / Bid Calculation**.

| Asset | State |
|-------|-------|
| Engine | `runIkP7PositionCostBid` — EXISTING |
| Binding | `IkEntryHost` — EXISTING |
| Classification | A — READ-ONLY CALC |
| Pre-migration gate | `ikF5E2eEnabled` **boolean** · default **`false`** |

P7 AUTO/ON may only produce an **in-memory** `TenderBidProposal`.  
Accept / Price Commit / Final Bid remain **OWNER**. Research remains **CONDITIONAL**. D = **false**.

---

## 2. O2 decision (APPROVED)

| Decision | Value |
|----------|-------|
| **O2** | **APPROVED** |
| Target type | `"AUTO" \| "OFF" \| "ON"` on **same key** `ikF5E2eEnabled` |
| Default (target) | **`"AUTO"`** |
| AUTO / ON runtime | identical — autonomous **READ-ONLY** P7 calc |
| OFF | HOLD / explicit kill-switch |
| New engine / new flag | **NO** |

---

## 3. Legacy boolean semantics

| Stored | Historical meaning (pre-O2) |
|--------|------------------------------|
| `true` | Explicit Owner opt-in — P7 E2E **ON** |
| `false` | Inactive — default HOLD / checkbox unchecked / sync of default |
| missing | Treat as default → **false** (HOLD) under pre-migration load |

---

## 4. Problem — `false` ambiguity

Stored **`false` cannot prove** Owner intent of permanent kill-switch.

Indistinguishable cases:

1. Never-touched factory default  
2. Owner unchecked after E2E test  
3. Cloud/local materialization of default  

```text
legacy false  ≠  proven "Owner wants permanent P7 OFF"
```

After migration, the **only** unambiguous durable kill-switch is **`"OFF"`**.

---

## 5. Option B-POLICY

| Legacy / stored | → Normalized |
|-----------------|--------------|
| `true` | **ON** |
| missing / unknown | **AUTO** |
| `false` | **AUTO** |
| `"AUTO"` / `"ON"` / `"OFF"` | idempotent |

---

## 6. Option B-CONSERVATIVE (REJECTED)

| Legacy / stored | → Normalized |
|-----------------|--------------|
| `true` | **ON** |
| missing | **OFF** |
| `false` | **OFF** |

Rejected: preserves opt-in HOLD · does not achieve AUTONOMOUS READ-ONLY P7 without manual ⚙.

---

## 7. Safety comparison

Both options preserve write/Accept/Research boundaries.  
Difference = autonomy default vs preserved opt-in HOLD — not write safety.

---

## 8. Recommendation

**B-POLICY** (architectural) — **ACCEPTED by Owner**.

---

## 9. Owner Decision

| Field | Value |
|-------|-------|
| **OD-P7b** | **ACCEPTED** |
| **Choice** | **B-POLICY** |
| **Mapping** | `true→ON` · `missing→AUTO` · `false→AUTO` |
| **Kill-switch** | string **`"OFF"`** only |

```text
OWNER RESPONSE = B-POLICY
```

---

## 10. Consequences

| Item | Consequence |
|------|-------------|
| Fresh / missing / legacy false | → **AUTO** → P7 RO calc when IK Entry ON |
| Legacy true | → **ON** → same RO calc |
| Kill | only explicit **`"OFF"`** |
| First break | closable without per-device ⚙ |
| Residual | old checkbox-off → AUTO after deploy — documented · tested |
| Changelog / ⚙ | must state false→AUTO migration |

---

## 11. Migration invariants

```text
DO (P7 AUTO/ON):
  read · Position Cost · Bid Proposal · in-memory TenderBidProposal

DO NOT:
  Accept · Price Commit · Final Bid · Research HTTP
  PM / PRICE_DEMAND / CatalogWork write · tender mutation · lease write
  change D · bypass P1 / P2 / Composite · bypass F5 XOR (feedsP7Bid=false)

MERGE: OFF wins — never OFF→AUTO / OFF→ON via hydration
ACTIVE: isIkE2eModeActive(mode) only — never || true
ROLLBACK: old bundle === true on strings → HOLD (fail-safe)
```

---

## 12. Design Freeze prerequisite

```text
O2       = APPROVED          ✓
OD-P7b   = B-POLICY          ✓
Design Freeze doc            ✓  READY FOR ARCH REVIEW
Arch Review                  PENDING
Owner GO for IMPLEMENT       PENDING
```

**Implementation still NOT AUTHORIZED** until Arch Review PASS + Owner GO.

---

## FINAL STATUS

```text
O2: APPROVED
OD-P7b: ACCEPTED — B-POLICY
Recommended: B-POLICY (locked)
P7: AUTO | OFF | ON
Research: CONDITIONAL
Accept / Price Commit / Final Bid: OWNER
D: FALSE
P1: CLOSED · P2: KEEP GAP · Composite: CLOSED
New engine: NO · New flag: NO
Code: ZERO · Settings write: ZERO
Design Freeze: CREATED · READY FOR ARCH REVIEW
Commit / Push / Deploy: NOT DONE
STOP.
```
