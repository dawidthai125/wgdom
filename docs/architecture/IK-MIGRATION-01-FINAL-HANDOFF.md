# IK-MIGRATION-01 — FINAL HANDOFF

> **ID:** `IK-MIGRATION-01-FINAL-HANDOFF`  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · freeze / handoff after P9  
> **Status:** **IK-MIGRATION-01 = COMPLETE THROUGH P9**

```text
CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · WRITE = 0
CREATE = 0 · BIND = 0 · P10 = NOT STARTED · P5.33 = DO NOT CREATE
NEXT = STOP / OWNER DECISION REQUIRED — do not invent next epic
```

---

## 1. Production baseline

| Field | Value |
|-------|--------|
| **UI / tip** | **2.66.86** |
| **Impl commit** | **`80c7c26b`** |
| **Live short** | **`80c7c26`** |
| **Docs tip (PV)** | **`e38d2dad`** |
| **URL** | https://www.wgdom.fun |
| **Tip SSOT** | [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **P9 PV** | [`IK-MIGRATION-01-P9-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P9-PRODUCTION-VERIFY.md) |

---

## 2. Phase status (P0–P9)

| Phase | Meaning | Status |
|-------|---------|--------|
| **P0** | Design / Entry foundation | **LOCKED** |
| **P1** | Entry host | **LOCKED** |
| **P2** | Documents / BOQ | **LOCKED** |
| **P2.5** | Ingest | **LOCKED** (within P2 chain) |
| **P3** | Classification / Identity | **LOCKED** |
| **P4** | Chief Wiring | **LOCKED** |
| **P5** | Labor E2E | **LOCKED** |
| **P6** | Material E2E · Price Memory | **LOCKED** |
| **P7** | Position Cost → F5 → Bid → SUM → EC | **LOCKED** |
| **P8** | Risk → Validation → Chief → DW → EC | **LOCKED** |
| **P9** | Owner Verify live tender · Gate A → Gate B → Owner | **PRODUCTION VERIFIED / LOCKED** |

---

## 3. P5.26 / CatalogWork

| Field | Value |
|-------|--------|
| **P5.26** | **LOCKED** |
| **CatalogWork** | **471** |
| **P9 impact** | **UNCHANGED** (no CatalogWork write in P9) |

---

## 4. P5.33

```text
P5.33 = DO NOT CREATE
```

---

## 5. P10

```text
P10 = NOT STARTED
```

Do **not** auto-start NG-10 REMOVE. Requires separate **Owner GO** after explicit decision.  
This handoff does **not** define P10 scope.

---

## 6. Hard locks (binding)

| Lock | Value |
|------|--------|
| **RESEARCH** | **0** |
| **HTTP** | **0** |
| **ACCEPT** | **0** |
| **WRITE** | **0** |
| **CREATE** | **0** |
| **BIND** | **0** |
| **D diff** | **0** (P9 session: `expertAiDecydentEnabled` must not flip) |
| **CatalogWork** | **471** · no P9 mutation |
| **Price Memory** | **UNCHANGED** by P9 |
| **ikP9\* lever** | **ABSENT** (by Design Freeze) |
| **IK ≠ D** | Dual Outcome / `expertAiDecydentEnabled` not flipped by IK phases |

---

## 7. P9 F5-A baseline exception

| Field | Value |
|-------|--------|
| **Test** | `scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs` |
| **Failure** | `T2 labor next` |
| **Observed** | 36 PASS / 1 FAIL |
| **Status** | **PRE-EXISTING** (reproduces on clean `main`) |
| **P9 gate** | **OUT OF P9 GATE (F5-A)** |
| **Rule** | Do **not** claim F5 cutover suite as PASS · Do **not** hotfix F5 inside IK-MIGRATION-01 |

---

## 8. Controlled ON

```text
Controlled Owner Verify = NOT_EXERCISED
Controlled P8 ON = NOT_EXERCISED (historical)
Controlled P7 ON = NOT_EXERCISED (historical)
```

Manual Owner action only when Owner explicitly exercises — **not** auto-run in PV.

---

## 9. Mobile physical

```text
Mobile physical = NOT VERIFIED
```

Bundle / responsive contract markers may be present; physical device QA was **not** claimed.

---

## 10. Next step

```text
NEXT = STOP / OWNER DECISION REQUIRED
```

- Do **not** invent P10 / P5.33 / next EPIC from this handoff.  
- Do **not** deploy / commit implementation without new Owner GO.  
- Cold-start: tip [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · P9 PV · this FINAL HANDOFF · IK Master SSOT.

---

## P9 gates (summary)

| Gate | Result |
|------|--------|
| P9 tests | **53/53 PASS** |
| P2/P3 Option B | **PASS** |
| P0–P8 relevant regression | **PASS** |
| Build | **PASS** |
| Live | **2.66.86 / 80c7c26** |
| Gate A / Gate B / Owner Verify wiring | **PRESENT** (bundle) |
| Target tender | `08def45d-ead6-5db8-962b-120001d33d37` |
| D snapshot / D diff = 0 | **PASS** |

---

## Key artifacts

| Doc | Role |
|-----|------|
| [`IK-MIGRATION-01-P9-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P9-PRODUCTION-VERIFY.md) | P9 PV |
| [`IK-MIGRATION-01-P9-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P9-IMPLEMENTATION-CLOSEOUT.md) | P9 closeout + F5-A |
| [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md) | Gate A/B SSOT |
| [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) | IK Master · NO REBUILD |

---

## STOP

```text
IK-MIGRATION-01 = COMPLETE THROUGH P9
P0–P9 = LOCKED / VERIFIED
CatalogWork = 471
P9 = PRODUCTION VERIFIED / LOCKED
F5 T2 = PRE-EXISTING / OUT OF P9 GATE
P10 = NOT STARTED
P5.33 = DO NOT CREATE
STOP.
```
