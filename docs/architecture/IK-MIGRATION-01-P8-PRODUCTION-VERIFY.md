# IK-MIGRATION-01 — P8 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P8-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p8-production-verify.json`  
> **Closeout:** [`IK-MIGRATION-01-P8-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P8-IMPLEMENTATION-CLOSEOUT.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · CODE = 0

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.85** |
| Impl commit | **`1f980aa0`** |
| Live `version.json` (one-shot) | **2.66.85** / **`6f58c8e`** |
| Ancestry | **`1f980aa0` ⊂ `6f58c8e0`** (docs tip descendant) |
| Verdict | **PRODUCTION VERIFIED / LOCKED** |

---

## Bundle containment (PASS)

Live assets probed: `index-CMKYeI7E.js` · `app-core-BWA_uCXX.js` · `TendersModule-SofO6hFS.js`

| Marker | Result |
|--------|--------|
| `ikRiskDecisionE2eEnabled` | PASS (index + app-core + Tenders) |
| Default OFF encode `ikRiskDecisionE2eEnabled:!1` | PASS (adjacent to `ikF5E2eEnabled:!1` in defaults) |
| Active gate `ikEntryEnabled===!0 && ikRiskDecisionE2eEnabled===!0` | PASS |
| `data-ik-p8-risk-decision-e2e` / research / http / auto-accept attrs | PASS (Tenders) |
| EC `RISK_OVERLAY` · `VALIDATION_EXPERT` · `CHIEF_DECISION_CONTEXT` · `DECISION_WORKSPACE` | PASS |
| Provenance `tender_intelligence_overlay` · `validation_expert` · `decision_workspace_vm` | PASS |
| Locks `autoAcceptExecuted` · `expertAiDecydentFlipped` · `ikChiefWiringMutated` | PASS |
| P7 `POSITION_COST_F5` · `PACKAGE_SUM` · `BID_PROPOSAL` | PASS (unchanged) |
| Risk/Validation/Chief/DW **V2** strings | ABSENT |
| `runIkP8RiskDecision` plain name | minified (expected) — seam evidenced by EC + host attrs + provenance |

---

## Production locks

| Check | Status |
|-------|--------|
| `ikRiskDecisionE2eEnabled` DEFAULT **OFF** | **PASS** |
| Controlled ON | **NOT_EXERCISED** |
| RESEARCH = 0 | **PASS** (P8 hard locks in report + host attrs) |
| HTTP = 0 | **PASS** |
| AUTO-ACCEPT = 0 | **PASS** |
| CatalogWork **471** | **UNCHANGED** |
| Price Memory | **UNCHANGED** |
| IK ≠ D (no D flip marker) | **PASS** |
| P4 REUSE / no Chief V2 | **PASS** |
| Mobile physical | **NOT VERIFIED** |
| Bundle / emulation | **PASS** |

---

## Tests / build (from closeout — not re-run in PV)

```text
P8 tests: 67 PASS / 0 FAIL
BUILD: PASS
IMPL: 1f980aa0
```

---

## FINAL

```text
P8 = PRODUCTION VERIFIED / LOCKED
LIVE = 2.66.85 / 6f58c8e
IMPL ⊂ LIVE = 1f980aa0 ⊂ 6f58c8e0
ikRiskDecisionE2eEnabled = OFF
Controlled ON = NOT_EXERCISED
RESEARCH = 0 · HTTP = 0 · AUTO-ACCEPT = 0
CatalogWork = 471
P9 = NOT STARTED
P5.33 = DO NOT CREATE
STOP.
```
