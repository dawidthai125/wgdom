# IK-MIGRATION-01 — P8 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P8-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p8-production-verify.json`  
> **Closeout:** [`IK-MIGRATION-01-P8-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P8-IMPLEMENTATION-CLOSEOUT.md)

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.85** |
| Impl commit | **`1f980aa0`** |
| Prior baseline | 2.66.84 / `e291340` (feature) · tip docs `e2fe30d` |
| Live `version.json` (one-shot) | **2.66.84** / **`e2fe30d`** |
| Verdict | **DEPLOY_PROPAGATING** |

Push `origin/main` = PASS (`e2fe30dc..1f980aa0`). Live still prior tip — **do not** claim PRODUCTION VERIFIED until live shows **2.66.85** / descendant of **`1f980aa0`**.

---

## Production locks (code on main)

| Check | Expected / Status |
|-------|-------------------|
| `ikRiskDecisionE2eEnabled` | DEFAULT **OFF** |
| Controlled ON | **NOT_EXERCISED** |
| RESEARCH | 0 |
| HTTP | 0 |
| AUTO-ACCEPT | 0 |
| CatalogWork | **471** UNCHANGED |
| Price Memory | UNCHANGED |
| Mobile physical | **NOT VERIFIED** |

---

## Bundle markers (when live = 2.66.85)

Expect in Tenders / app-core chunks:

- `ikRiskDecisionE2eEnabled`
- `runIkP8RiskDecision` / `RISK_OVERLAY` / `VALIDATION_EXPERT` / `DECISION_WORKSPACE`
- default-false encode for lever

---

## FINAL

```text
PUSH = PASS
LIVE = DEPLOY_PROPAGATING (one-shot still 2.66.84 / e2fe30d)
P8 on main = IMPLEMENTED (1f980aa0) · DEFAULT OFF
P8 PRODUCTION VERIFIED / LOCKED = PENDING live tip
P9 = NOT STARTED
P5.33 = DO NOT CREATE
STOP — no polling.
```
