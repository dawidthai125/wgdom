# IK AUTONOMY-07 — P8 Owner Decision  
## Settings contract O2 · OD-P8b → see dedicated lock

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-07-P8-OWNER-DECISION` |
| **Status** | **O2 = APPROVED** · **OD-P8b = APPROVED — B-POLICY** (lock: [`IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md`](./IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md)) |
| **Date** | 2026-08-17 |
| **Mode** | OWNER DECISION ONLY · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO IMPLEMENT** · **ZERO DESIGN FREEZE** |
| **Production** | **2.66.91** / **`ab5eaaa1`** · docs **`ce552ace`** |
| **Parent PLAN** | [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md) |
| **Audit** | [`IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT.md) |
| **P5/P6 precedent** | [`IK-AUTONOMY-05-OD2-OWNER-DECISION.md`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) · OD-2b **B-POLICY** |
| **P7 precedent** | [`IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md`](./IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md) · OD-P7b **B-POLICY** |

```text
O2                         = APPROVED
P8                         = "AUTO" | "OFF" | "ON"
OD-P8b                     = APPROVED — B-POLICY
Mapping                    = true→ON · missing→AUTO · false→AUTO · malformed→AUTO
Kill-switch                = "OFF" only
Design Freeze              = ALLOWED · NOT CREATED THIS TURN
Implementation             = NOT AUTHORIZED
Code / Settings            = ZERO
Commit / Push / Deploy     = NOT DONE
```

---

## 1. O2 = APPROVED

Owner wybiera **O2** dla P8 Risk / Validation / Decision Workspace prepare.

| Decision | Value |
|----------|-------|
| **O2** | **APPROVED** |
| **O1** | **REJECTED** (boolean `true`/`false`) |
| Key | **same** `ikRiskDecisionE2eEnabled` |
| Target type | `"AUTO" \| "OFF" \| "ON"` = existing **`IkE2eMode`** |
| New type | **NO** |
| New flag | **NO** |
| New engine | **NO** |
| New orchestrator | **NO** |

Engine pozostaje `runIkP8RiskDecision`. Binding `IkEntryHost` pozostaje.  
Pierwszy brakujący element to **aktywacja dźwigni**, nie nowy wire.

---

## 2. P8 = AUTO | OFF | ON

Same-key migration (po OD-P8b + DF + Owner GO IMPLEMENT — **nie teraz**):

| Stored (target) | Runtime |
|-----------------|--------|
| `"AUTO"` | autonomous READ-ONLY P8 prepare |
| `"ON"` | autonomous READ-ONLY P8 prepare |
| `"OFF"` | HOLD / explicit kill-switch |

Gate (target, after implement):

```text
ikEntryEnabled === true
∧
isIkE2eModeActive(ikRiskDecisionE2eEnabled)

isIkE2eModeActive = (mode === "AUTO" || mode === "ON")
never === true on enum strings
never || true
```

Current production gate (unchanged until IMPLEMENT):

```text
ikEntryEnabled
∧
ikRiskDecisionE2eEnabled === true     ← boolean · default false
```

---

## 3. AUTO semantics

**AUTO** = autonomous **READ-ONLY** P8.

When IK Entry ON and P8 AUTO:

- existing `IkEntryHost` `useMemo` calls existing `runIkP8RiskDecision`
- in-memory `IkP8RiskDecisionReport` → EC (overlay / Validation / DW)
- P7 proposal consumed **only if already present** (optional READ)
- Chief dossier consumed **only if already present** (optional READ)
- no invent dossier
- no Chief session start
- no D flip

```text
AUTO ≠ Research
AUTO ≠ Accept
AUTO ≠ Price Commit
AUTO ≠ Final Bid
AUTO ≠ P4 Chief
```

---

## 4. ON semantics

**ON** = **identical runtime to AUTO**.

Explicit force-enable of the same READ-ONLY prepare.  
No extra writes. No Research. No Owner Persist.

O2 does **not** invent a third runtime between AUTO and ON.

---

## 5. OFF semantics

**OFF** = durable HOLD / explicit Owner kill-switch.

- host `riskDecision = null`
- engine **not** called
- EC without P8 steps
- does **not** mutate tender / P7 / D / P4 / Research / CatalogWork

Merge (target, REUSE C1): **OFF wins**.  
Hydration must never turn `"OFF"` into AUTO or ON.

Until OD-P8b is locked, **do not** treat current boolean `false` as proven `"OFF"`.

---

## 6. Research boundary

```text
P8 AUTO / ON  ≠  Research
P8 has no research lever
httpCalls = 0 always (engine lock)
executeResearch must not be set by P8
```

P5/P6 Research remains **CONDITIONAL** (`=== true` only).  
Research Accept remains **OWNER**.  
P8 must not design or auto-start Research HTTP.

---

## 7. Owner boundaries

| Boundary | Status |
|----------|--------|
| P8 prepare / EC facts | **AUTO/ON candidate** (this EPIC · after OD-P8b + DF) |
| Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid / `recordDecision` / Persist | **OWNER** |
| `canApprove` | capability display **≠** execute |
| Research Accept | **OWNER** |

```text
displayDecision  ≠  Owner GO persist
canApprove       ≠  recordDecision
recommendedBid (P7) ≠ Final Bid
```

---

## 8. D hard stop

| Item | Contract |
|------|----------|
| D | **HARD STOP / FALSE** |
| P4 Chief | **OUT** — session start coupled to `expertAiDecydentEnabled` |
| P8 vs D | P8 **must not** activate D |
| P8 vs P4 | P8 **must not** start Chief / invent dossier / mutate `ikChiefWiringEnabled` |

Null `chiefSession` → Validation HOLD (existing honest path). **KEEP.**

---

## 9. Reuse P5/P6/P7

O2 **requires** reuse of the existing contract — no P8-specific enum:

| Helper | Role |
|--------|------|
| `IkE2eMode` | `"AUTO" \| "OFF" \| "ON"` |
| `isIkE2eModeActive` | AUTO/ON capability |
| `normalizeIkE2eMode` | load/default coerce |
| `mergeIkE2eMode` | C1 OFF wins |
| `parseIkE2eMode` | stored value → enum **or** `null` |

**Caveat for OD-P8b (not a choice):** today’s `parseIkE2eMode` already encodes **B-POLICY** (`true→ON` · `false→AUTO` · missing→`null`, load→AUTO).

- **B-POLICY** for P8 = drop-in reuse of those helpers on the same key.
- **B-CONSERVATIVE** for P8 = **cannot** call `parseIkE2eMode` as-is for `false` (it maps `false→AUTO`). Would require a P8-only parse fork **or** a change to the shared helper (which would break P5/P6/P7). See §12.

This is a **consequence**, not a recommendation lock.

---

## 10. O1 vs O2 rationale (why O2)

| | O1 (rejected) | O2 (approved) |
|--|---------------|---------------|
| Type | boolean | `IkE2eMode` |
| AUTO vs ON | collapsed into `true` | distinct stored states, same runtime |
| Kill-switch | `false` (ambiguous vs factory default) | `"OFF"` only (after OD-P8b) |
| UX | checkbox | select — same as P5/P6/P7 |
| Helpers | keep boolean merge | REUSE `isIkE2eModeActive` / `mergeIkE2eMode` |
| New flag | no | no |

O1 would keep `false` as both factory HOLD and kill-switch. That is the ambiguity AUTONOMY-05/06 already closed. Owner therefore locks **O2**.

---

## 11. OD-P8b

**OD-P8b** = mapping of **legacy boolean** `ikRiskDecisionE2eEnabled` after O2.

Current production:

| Item | Today |
|------|-------|
| Type | `boolean` |
| Default | **`false`** (`defaultAppSettings`) |
| Load | `parsed.ikRiskDecisionE2eEnabled === true` |
| Merge | remote true/false explicit; else `local === true` |
| Admin | checkbox · copy „Po teście: wyłącz” |

| Stored today | Historical meaning |
|--------------|-------------------|
| `true` | Explicit Owner opt-in — P8 E2E **ON** |
| `false` | Inactive — **factory default**, unchecked checkbox, or sync of default |
| missing | Treat as default → **false** (HOLD) under pre-migration load |

```text
legacy false  ≠  proven "Owner wants permanent P8 OFF"
```

Indistinguishable cases for stored `false`:

1. Never-touched factory default  
2. Owner unchecked after E2E test („Po teście: wyłącz”)  
3. Cloud/local materialization of default  

**OD-P8b locked** in [`IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md`](./IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md): **B-POLICY**.

---

## 12. B-POLICY vs B-CONSERVATIVE

Definitions **as specified by Owner for P8** (do not substitute A06’s rejected table):

### B-POLICY

| Legacy / stored | → Normalized |
|-----------------|--------------|
| `true` | **ON** |
| missing / unknown | **AUTO** |
| `false` | **AUTO** |
| `"AUTO"` / `"ON"` / `"OFF"` | idempotent |

Identical to P5/P6 OD-2b and P7 OD-P7b.  
Durable kill-switch **only** `"OFF"`.

### B-CONSERVATIVE

| Legacy / stored | → Normalized |
|-----------------|--------------|
| `true` | **ON** |
| missing / unknown | **AUTO** |
| `false` | **OFF** |
| `"AUTO"` / `"ON"` / `"OFF"` | idempotent |

Missing still becomes AUTO. Only **explicit stored `false`** becomes HOLD.

---

### Consequences — B-POLICY

| Surface | Effect |
|---------|--------|
| Fresh / default `false` | → **AUTO** → P8 RO prepare when IK Entry ON |
| Legacy `true` | → **ON** → same RO prepare |
| Never-saved missing key | → **AUTO** |
| Owner who unchecked after test | → **AUTO** (residual: old HOLD becomes AUTO) |
| Durable kill after migrate | **only** stored `"OFF"` |
| Helper reuse | **YES** — `parseIkE2eMode` / `normalizeIkE2eMode` / `mergeIkE2eMode` unchanged |
| First autonomy break | closable **without** per-device ⚙ (same as A05/A06) |
| Mixed-client residual | old bundle `=== true` on strings → HOLD (fail-safe) · old `false` over new `"OFF"` → AUTO if old client writes boolean (same C3 as A05/A06) |
| Changelog / ⚙ | must state `false→AUTO` |

Matches Owner note: *historyczne false nie musi oznaczać świadomego kill-switch, jeżeli system materializował boolean false jako legacy default.*

Write/Accept/Research/D/P4 safety: **unchanged** (still MODE A locks). Difference is **who runs P8**, not **what P8 may write**.

---

### Consequences — B-CONSERVATIVE

| Surface | Effect |
|---------|--------|
| Fresh / default `false` | → **OFF** → P8 remains HOLD until ⚙ `"AUTO"`/`"ON"` or a later default rewrite |
| Devices that ever persisted settings | almost all have `false` materialized → **OFF** |
| Missing key only | → **AUTO** (narrow path: never-saved local/cloud) |
| Legacy `true` | → **ON** |
| Owner who unchecked after test | → **OFF** (preserves HOLD) |
| Durable kill | `"OFF"` **and** leftover boolean `false` |
| Helper reuse | **NO drop-in** — shared `parseIkE2eMode` maps `false→AUTO`. P8-only fork **or** shared-helper change (would regress P5/P6/P7) |
| First autonomy break | **not** closed by factory default: live KV that stored `false` stays HOLD |
| Paczka VII / prod | IK Entry currently OFF anyway; after Entry ON, P8 still HOLD on typical `false` rows |
| Mixed-client | old `false` continues to mean HOLD if new code maps it to `"OFF"` |

B-CONSERVATIVE **preserves today’s opt-in HOLD** for every client that already saved AppSettings (default `false`). It does **not** by itself deliver „IK ON → P8 prepare” on those clients.

Write/Accept/Research/D/P4 safety: **also unchanged**. Difference is activation coverage, plus a **reuse fork risk**.

---

### What both preserve (not a differentiator)

```text
0 Accept
0 Price Commit
0 Final Bid
0 Research HTTP
0 PM / PRICE_DEMAND / CatalogWork writes
0 tender mutations
0 D activation
0 Chief start
0 P1 bypass / P2 expansion / Composite redesign / P7 modification
```

---

### Reuse / freeze implication (fact, not a vote)

```text
B-POLICY        → REUSE parseIkE2eMode as-is
B-CONSERVATIVE  → P8 cannot share parseIkE2eMode(false) without a fork
                  or without breaking P5/P6/P7 B-POLICY
```

Design Freeze is **ALLOWED** after this lock. **Not created in this turn.**

---

## 13. Owner decision status

| Item | Status |
|------|--------|
| **O2** | **APPROVED** |
| **P8 type** | `"AUTO" \| "OFF" \| "ON"` |
| **AUTO / ON** | autonomous READ-ONLY P8 · AUTO ≡ ON runtime |
| **OFF** | HOLD / kill-switch |
| **Research** | CONDITIONAL · not part of P8 AUTO |
| **Accept / Price Commit / Final Bid** | OWNER |
| **D** | HARD STOP false |
| **P4 Chief** | OUT |
| **Reuse helpers** | **YES** — `parseIkE2eMode` as-is |
| **OD-P8b** | **APPROVED — B-POLICY** |
| **B-POLICY** | **APPROVED** |
| **B-CONSERVATIVE** | **REJECTED** |
| **Design Freeze** | **ALLOWED** · **NOT CREATED THIS TURN** |
| **Arch Review / IMPLEMENT** | **NOT AUTHORIZED** |

---

## Safety (binding · B-POLICY locked)

P8 AUTO/ON may only:

- run existing `runIkP8RiskDecision`
- produce in-memory prepare for EC

P8 AUTO/ON must not:

- Accept · Price Commit · Final Bid
- Research HTTP
- business writes (PM / PRICE_DEMAND / CatalogWork / tender)
- settings write at runtime
- activate D · start Chief
- bypass P1 · expand P2 · redesign Composite · modify P7

---

## Next step (not this turn)

1. **Design Freeze** (separate doc) — Owner GO next turn.  
2. Arch Review.  
3. Owner GO IMPLEMENT.

**Do not** create DF, change settings, or implement in this turn.

---

## FINAL STATUS

```text
O2                         = APPROVED
P8                         = AUTO | OFF | ON
AUTO                       = autonomous READ-ONLY P8
ON                         = same runtime as AUTO
OFF                        = HOLD / kill-switch
AUTO ≠ Research
Research                   = CONDITIONAL
Accept / Price Commit / Final Bid = OWNER
D                          = HARD STOP false
P4 Chief                   = OUT
Reuse                      = IkE2eMode + parse/normalize/merge/isIkE2eModeActive
OD-P8b                     = APPROVED — B-POLICY
Kill-switch                = OFF
PLAN                       = READY
DESIGN FREEZE              = ALLOWED · NOT CREATED
CODE / SETTINGS / COMMIT   = ZERO
STOP.
```
