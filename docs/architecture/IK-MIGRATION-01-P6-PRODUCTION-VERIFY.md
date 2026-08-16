# IK-MIGRATION-01 — P6 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P6-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **Mode:** **FINAL PRODUCTION VERIFY · ONE SHOT** · RESEARCH = 0 (defaults OFF) · Accept = 0 · CatalogWork = 0  
> **JSON:** `.tmp/p6-production-verify.json`  
> **Impl commit:** **`ee8f2cd9`** — `IK-MIGRATION-01: implement P6 material E2E`  
> **Live tip commit:** **`22570fa`** — docs tip containing impl  
> **Closeout:** [`IK-MIGRATION-01-P6-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P6-IMPLEMENTATION-CLOSEOUT.md)

---

## VERDICT

```text
P6 = PRODUCTION VERIFIED / LOCKED

LIVE VERSION = 2.66.83
LIVE SHA = 22570fa
EXPECTED IMPLEMENTATION = ee8f2cd9
ANCESTOR/CONTAINS = YES (ee8f2cd9 ⊂ 22570fa9 · docs tip + changelog)

P6 E2E DEFAULT = OFF (ikMaterialE2eEnabled:!1)
P6 RESEARCH DEFAULT = OFF (ikMaterialResearchEnabled:!1)
MODE A = NOT_EXERCISED
MODE B = NOT_EXERCISED

EXECUTE_RESEARCH GUARD = PASS (=== true only · !== false = 0 in live TM)
MMR-02 / BUDGET = PASS (BUDGET_EXCEEDED · CLAIM_CEILING live)
MATERIAL IDENTITY = PASS (no Labor lookupInternalFirst as Material matcher)
PRICE MEMORY / ACCEPT = PASS (acceptIkMaterial · AUTO_ACCEPT_FORBIDDEN)
CATALOGWORK = PASS · P5.26 = 471 UNTOUCHED
P5 / P4 / P3 / P2 = unchanged (levers OFF · flooring keys remain · P5.33=0)
P7 / F5 / BID = NOT STARTED / untouched
TESTS = 46/46 P6 (implementation reconfirm)
BUILD = PASS (prior)
MOBILE physical = NOT VERIFIED

Production finish: P6 E2E = OFF · P6 Research = OFF

P5.33 = DO NOT CREATE
P7 = NOT STARTED
STOP — no auto next stage
```

---

## 1. Propagation (ONE SHOT)

| Field | Value |
|-------|--------|
| LIVE `version` | **2.66.83** |
| LIVE `commit` | **`22570fa`** |
| EXPECTED UI | **2.66.83** |
| EXPECTED IMPL | **`ee8f2cd9`** |
| `git merge-base --is-ancestor ee8f2cd9 22570fa9` | **0 (YES)** |
| Between | changelog + tip docs only |

**Interpretation:** Not `DEPLOY_PROPAGATING`. Continue PV.

**Assets (live):** `index-B8SfBqeE.js` · `app-core-C-niukhM.js` · `TendersModule-BUzhTl_U.js`

---

## 2. Implementation containment

`ee8f2cd9` is an ancestor of live tip **`22570fa9`**. UI **2.66.83** alone is not sufficient — ancestry **PASS**.

---

## 3–4. P6 levers · P6 OFF

| Check | Evidence | Result |
|-------|----------|--------|
| Defaults OFF | `ikMaterialE2eEnabled:!1` · `ikMaterialResearchEnabled:!1` | **PASS** |
| Labor/Chief OFF | `ikLabor*:!1` · `ikChiefWiringEnabled:!1` | **PASS** |
| Markers | `data-ik-p6-material-e2e` · `data-ik-p6-material-research` · Admin toggles | **PASS** |
| Material inactive | `data-ik-material-status` → `shell_skipped` when E2E flag off | **PASS** |

Production remains **P6 OFF**.

---

## 5. Material research guard

| Path | Pattern | Result |
|------|---------|--------|
| Live TM | `executeResearch===!0` (×3) | **PASS** |
| Live TM | `executeResearch!==!1` = **0** | **PASS** |
| Host Material | `executeResearch:d===!0` (research flag) | **PASS** |
| Host Labor | `executeResearch:l===!0` + `enableInternalFirst:!0` | **PASS** (P5 unchanged) |
| Source | `=== true` only · no `!== false` | **PASS** |

undefined / P6 OFF / Research OFF → **false**. Only explicit MODE B flags → **true** (plus eligibility/budget at runtime).

---

## 6–7. MODE A / MODE B

| Mode | Result |
|------|--------|
| MODE A | **NOT_EXERCISED** |
| MODE B | **NOT_EXERCISED** |

Gate path verified in **suite + live bundle** — do **not** claim runtime MODE PASS.

---

## 8. MMR-02 / budget

Live: `BUDGET_EXCEEDED` · `CLAIM_CEILING` — **enforcement**, not telemetry-only.  
Labor 24/4 **not** used as Material SSOT.

---

## 9–15. Semantics · identity · PM · Accept · write · provenance · unit

| Area | Result |
|------|--------|
| Failure → GAP (DF + suite) | **PASS** |
| No Labor P5.26-E matcher as Material | **PASS** (`lookupInternalFirst` not Material path) |
| Accept → Price Memory · not CatalogWork OUR RATE | **PASS** |
| `AUTO_ACCEPT_FORBIDDEN` · `acceptIkMaterial` | **PASS** |
| CatalogWork **471** lock | **PASS** (UNTOUCHED) |
| Provenance / unit SSOT | **PASS** (suite + DF) |

---

## 16–19. Regressions / boundaries

| Area | Result |
|------|--------|
| P5 levers OFF · flooring keys present · P5.33=0 | **PASS** |
| P4 Chief DEFAULT OFF | **PASS** |
| P3 / P2 | **PASS** (prior nested + defaults) |
| P7 / F5 / Bid | **NOT STARTED / untouched** |

---

## 20. Tests

| Suite | Result |
|-------|--------|
| P6 implementation | **46/46** (implementation closeout reconfirm) |
| Nested Material / MMR / P5–P2 | **PASS** (prior) |
| Build | **PASS** (prior) |

Tests **not** rewritten for this PV.

---

## 21. Mobile

Bundle markers present · Physical: **NOT VERIFIED**

---

## 22. Production settings after PV

Controlled ON **not** used. Live defaults remain OFF.

---

## STOP

```text
P6 = PRODUCTION VERIFIED / LOCKED
P6 E2E = DEFAULT OFF
P6 Research = DEFAULT OFF
P5.26 = LOCKED / 471
P5 / P4 / P3 / P2 = unchanged
P7 = NOT STARTED
P5.33 = DO NOT CREATE
NO AUTO NEXT STAGE
```
