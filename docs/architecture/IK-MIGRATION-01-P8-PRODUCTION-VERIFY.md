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
| Prior baseline | 2.66.84 / `e291340` |
| Live `version.json` | *(filled after push)* |
| Verdict | *(PASS / DEPLOY_PROPAGATING)* |

---

## Production locks

| Check | Expected |
|-------|----------|
| `ikRiskDecisionE2eEnabled` | DEFAULT **OFF** |
| Controlled ON | **NOT_EXERCISED** |
| RESEARCH | 0 |
| HTTP | 0 |
| AUTO-ACCEPT | 0 |
| CatalogWork | **471** UNCHANGED |
| Price Memory | UNCHANGED |
| Mobile physical | **NOT VERIFIED** |

---

## Bundle markers (post-deploy)

Expect in Tenders / app-core chunks:

- `ikRiskDecisionE2eEnabled`
- `runIkP8RiskDecision` / `RISK_OVERLAY` / `VALIDATION_EXPERT` / `DECISION_WORKSPACE`
- `ikRiskDecisionE2eEnabled:!1` or equivalent default-false encode

---

## FINAL

```text
P8 = PRODUCTION VERIFIED / LOCKED  (when live matches tip)
P9 = NOT STARTED
P5.33 = DO NOT CREATE
STOP.
```
