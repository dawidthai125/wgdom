# IK-MIGRATION-01 — P6 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P6-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **Mode:** **VERIFY ONLY** · RESEARCH = 0 (defaults OFF) · Accept = 0 · CatalogWork = 0  
> **JSON:** `.tmp/p6-production-verify.json`  
> **Impl commit:** **`ee8f2cd9`** — `IK-MIGRATION-01: implement P6 material E2E`  
> **Closeout:** [`IK-MIGRATION-01-P6-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P6-IMPLEMENTATION-CLOSEOUT.md)

---

## VERDICT

```text
P6 IMPLEMENTATION = PASS · ee8f2cd9 on origin/main
TEST = PASS · 46/46 · BUILD = PASS · PUSH = PASS
PROPAGATION = DEPLOY_PROPAGATING

LIVE tip (one-shot after push) = 2.66.82 / 5fc3ae9
EXPECTED UI = 2.66.83
EXPECTED IMPL = ee8f2cd9
LIVE CONTAINS P6 = NO (yet)

FORMAL P6 = Material E2E
ikMaterialE2eEnabled = DEFAULT OFF
ikMaterialResearchEnabled = DEFAULT OFF
executeResearch === true only MODE B
Accept → Price Memory
P5.26 CatalogWork 471 = PASS (UNTOUCHED)
Controlled P6 ON = NOT_EXERCISED
MOBILE PHYSICAL = NOT VERIFIED

FINAL PRODUCTION VERIFIED = PENDING live tip 2.66.83 / tip containing ee8f2cd9

P7 = NOT STARTED
STOP — no auto P7 · no F5/Bid · no P5.33
```

---

## 1. Live / propagation

| Field | Value |
|-------|--------|
| LIVE `version` | **2.66.82** |
| LIVE `commit` | **`5fc3ae9`** (prior P5 tip) |
| EXPECTED UI | **2.66.83** |
| EXPECTED IMPL | **`ee8f2cd9`** |
| `ee8f2cd9` on `origin/main` | **YES** |

**Interpretation:** One-shot after push → **DEPLOY_PROPAGATING**. No polling.

---

## 2. Contract checks (local / suites)

| # | Check | Result |
|---|-------|--------|
| 1 | P6 OFF → P5/P4 unchanged | **PASS** |
| 2 | MODE A path (research OFF) | **PASS** |
| 3 | MODE B gate | **PASS** |
| 4–5 | executeResearch === true only MODE B | **PASS** |
| 6–8 | MMR budget 8 claims / ≤24 shop HTTP | **PASS** |
| 9–12 | GAP semantics · no auto Accept · PM write | **PASS** |
| 13–16 | CatalogWork 471 / P5 / P4 / P3 / P2 | **PASS** |

Controlled ON: **NOT_EXERCISED** — leave **OFF**.
