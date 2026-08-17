# IK AUTONOMY-07 — OD-P8b Owner Decision  
## Legacy `ikRiskDecisionE2eEnabled = false` → enum migration (B-POLICY)

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION` |
| **Status** | **OD-P8b = APPROVED — B-POLICY** |
| **Date** | 2026-08-17 |
| **Mode** | OWNER DECISION LOCKED · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO IMPLEMENT** · **ZERO DESIGN FREEZE THIS TURN** |
| **Production** | **2.66.91** / **`ab5eaaa1`** · docs **`ce552ace`** |
| **Parent PLAN** | [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md) |
| **O2 decision** | [`IK-AUTONOMY-07-P8-OWNER-DECISION.md`](./IK-AUTONOMY-07-P8-OWNER-DECISION.md) |
| **P5/P6 precedent** | [`IK-AUTONOMY-05-OD2-OWNER-DECISION.md`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) · OD-2b **B-POLICY** |
| **P7 precedent** | [`IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md`](./IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md) · OD-P7b **B-POLICY** |

```text
O2                         = APPROVED
OD-P8b                     = APPROVED
Selected                   = B-POLICY
Mapping                    = true→ON · missing→AUTO · false→AUTO · malformed→AUTO
Kill-switch                = "OFF" only
Reuse                      = YES
New engine                 = NO
New flag                   = NO
Research                   = CONDITIONAL
Accept / Price Commit / Final Bid = OWNER
D                          = FALSE
P1                         = CLOSED
P2                         = KEEP GAP
Composite                  = CLOSED
P7                         = UNCHANGED
PLAN                       = READY
DESIGN FREEZE              = ALLOWED · NOT CREATED THIS TURN
IMPLEMENTATION             = NOT AUTHORIZED
```

---

## 1. Context

**IK AUTONOMY-07** first autonomy break = **P8 Risk / Validation / Decision Workspace prepare**.

| Asset | State |
|-------|-------|
| Engine | `runIkP8RiskDecision` — EXISTING · **KEEP** |
| Binding | `IkEntryHost` `useMemo` — EXISTING · **KEEP** |
| Classification | E — lever / configuration · A — READ-ONLY prepare |
| Pre-migration gate | `ikEntryEnabled` ∧ `ikRiskDecisionE2eEnabled === true` |
| Pre-migration type | **boolean** · default **`false`** |

O2 already **APPROVED**: same key, type **`IkE2eMode`**.  
OD-P8b locks how legacy booleans become that enum.

---

## 2. P8 settings contract (locked)

| Item | Value |
|------|-------|
| Key | `ikRiskDecisionE2eEnabled` (**same** · no new flag) |
| Semantic type | existing **`IkE2eMode`** (**no new type**) |
| Values | `"AUTO" \| "OFF" \| "ON"` |
| AUTO | autonomous **READ-ONLY** P8 |
| ON | autonomous **READ-ONLY** P8 · **same runtime as AUTO** |
| OFF | HOLD / explicit kill-switch |
| Engine | existing `runIkP8RiskDecision` only |
| Second engine / orchestrator | **NO** |

```text
AUTO ≡ ON  →  existing IkEntryHost useMemo → runIkP8RiskDecision
AUTO ≠ Research
```

---

## 3. OD-P8b = APPROVED

| Field | Value |
|-------|-------|
| **OD-P8b** | **APPROVED** |
| **Selected** | **B-POLICY** |
| **B-CONSERVATIVE** | **REJECTED** |

```text
OWNER RESPONSE = B-POLICY
```

---

## 4. Migration contract (frozen)

| Stored / input | → Normalized |
|----------------|--------------|
| `true` | **ON** |
| missing | **AUTO** |
| `false` | **AUTO** |
| malformed / unknown | **AUTO** |
| `"AUTO"` / `"ON"` / `"OFF"` | idempotent |
| explicit `"OFF"` | **OFF** |

```text
true      → ON
missing   → AUTO
false     → AUTO
malformed → AUTO
"OFF"     → OFF
```

**OFF is the ONLY persistent kill-switch.**

This matches AUTONOMY-05 (OD-2b) and AUTONOMY-06 (OD-P7b).

Rationale (locked): historyczne `false` **nie** jest dowiedzionym Owner kill-switch, jeżeli system materializował boolean `false` jako factory default / sync default / odznaczenie po teście.

---

## 5. B-CONSERVATIVE (REJECTED)

P8 candidate that was **not** taken:

| Stored | Would have been |
|--------|-----------------|
| `true` | ON |
| missing | AUTO |
| `false` | OFF |

Rejected: would keep typical persisted `false` as HOLD, would **not** close the first autonomy break without per-device ⚙, and **cannot** drop-in reuse `parseIkE2eMode` (`false→AUTO`).

---

## 6. Reuse (locked)

**YES.** Do **not** duplicate helpers. Do **not** fork parse for P8.

| Helper | Role |
|--------|------|
| `IkE2eMode` | `"AUTO" \| "OFF" \| "ON"` |
| `parseIkE2eMode` | `true→ON` · `false→AUTO` · missing→`null` · enum idempotent |
| `normalizeIkE2eMode` | missing/unknown/malformed → **AUTO** |
| `mergeIkE2eMode` | **OFF wins** (C1) — **unchanged** |
| `isIkE2eModeActive` | AUTO or ON · never `=== true` on strings · never `\|\| true` |

Target load/merge after IMPLEMENT (not this turn):

```text
load  : normalizeIkE2eMode(parsed.ikRiskDecisionE2eEnabled)
merge : mergeIkE2eMode(remote?.ikRiskDecisionE2eEnabled, local.ikRiskDecisionE2eEnabled)
active: ikEntryEnabled && isIkE2eModeActive(mode)
```

B-POLICY is **exactly** what those helpers already do. Shared `false→AUTO` must **remain** (P5/P6/P7).

---

## 7. Safety (MODE A / AUTO / ON)

P8 AUTO / ON = **READ-ONLY ONLY**.

| Forbidden | Status |
|-----------|--------|
| Accept | **0** · OWNER |
| Price Commit | **0** · OWNER |
| Final Bid / Persist | **0** · OWNER |
| Research HTTP | **0** |
| Tender mutation | **0** |
| PM write | **0** |
| CatalogWork write | **0** |
| PRICE_DEMAND write | **0** |
| Settings write during runtime | **0** |
| D activation | **0** |
| Chief activation | **0** |

```text
Research = CONDITIONAL
P8 AUTO MUST NOT imply Research
```

---

## 8. P4 / D

| Item | Contract |
|------|----------|
| P4 Chief | **OUT OF SCOPE** |
| D | **FALSE** · HARD STOP |
| `expertAiDecydentEnabled` | **do not alter** |
| `isChiefOrchestratorSessionEnabled` | **do not bypass** |

Null Chief → existing Validation HOLD. No invent dossier.

---

## 9. P1 / P2 / Composite / P7

| Surface | Status |
|---------|--------|
| P1 | **CLOSED** · `mat.inv.*` blocked · no bypass |
| P2 | **KEEP GAP** · no identity expansion |
| Composite | **CLOSED** · no redesign · no new consume |
| P7 | **UNCHANGED** · `"AUTO"\|"OFF"\|"ON"` · optional READ of existing output |

P8 may consume existing legal P7 `positionCostBid` already passed by `IkEntryHost`.  
No new P7→P8 adapter. No P7 engine/contract change.

---

## 10. Consequences

| Item | Consequence |
|------|-------------|
| Fresh / missing / malformed / legacy `false` | → **AUTO** → P8 RO prepare when IK Entry ON |
| Legacy `true` | → **ON** → same RO prepare |
| Kill | only explicit **`"OFF"`** |
| First break | closable without per-device ⚙ |
| Residual | old checkbox-off → AUTO after deploy — document in DF / changelog |
| Mixed-client | old bundle `=== true` on strings → HOLD (fail-safe) |
| Helper reuse | drop-in — no P8 parse fork |

Write/Accept/Research/D/P4 safety does **not** change with B-POLICY. Difference vs B-CONSERVATIVE was activation coverage only.

---

## 11. Gate transition

```text
PLAN                       = READY
O2                         = APPROVED
OD-P8b                     = APPROVED — B-POLICY
DESIGN FREEZE              = ALLOWED
DESIGN FREEZE DOC          = NOT CREATED THIS TURN
ARCH REVIEW                = NOT STARTED
IMPLEMENTATION             = NOT AUTHORIZED
```

**Do not** create Design Freeze in this turn.  
**Do not** implement. **Do not** modify application code or settings.

---

## 12. Design Freeze prerequisite (next turn, not now)

DF (when Owner GO) must freeze:

- same key · `IkE2eMode` · B-POLICY table above
- `isIkE2eModeActive` gate · OFF wins merge
- engine `runIkP8RiskDecision` UNCHANGED
- host binding KEEP
- AUTO ≡ ON · AUTO ≠ Research
- Owner / D / P4 / P1 / P2 / Composite / P7 boundaries

Implementation remains **NOT AUTHORIZED** until DF + Arch Review PASS + Owner GO IMPLEMENT.

---

## FINAL STATUS

```text
OD-P8b                     = APPROVED
B-POLICY                   = APPROVED
Selected                   = B-POLICY
Migration                  = true→ON · missing→AUTO · false→AUTO · malformed→AUTO
Kill-switch                = OFF
Reuse                      = YES
New engine                 = NO
New flag                   = NO
Research                   = CONDITIONAL
Accept                     = OWNER
Price Commit               = OWNER
Final Bid                  = OWNER
D                          = FALSE
P1                         = CLOSED
P2                         = KEEP GAP
Composite                  = CLOSED
P7                         = UNCHANGED
PLAN                       = READY
DESIGN FREEZE              = ALLOWED
DESIGN FREEZE DOC          = NOT CREATED
IMPLEMENTATION             = NOT AUTHORIZED
CODE / SETTINGS / COMMIT   = ZERO
STOP.
```
