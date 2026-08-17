# IK P1 — Invoice Host Collision · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **COMPLETE / PRODUCTION VERIFIED** |
| **Date** | 2026-08-17 |
| **Baseline tip (pre)** | Production **2.66.87** · commit **`7a32bb34`** |
| **Production tip** | **2.66.88** · **`482c618f`** (live `482c618`) |
| **CatalogWork** | **471** UNCHANGED |
| **D** | `expertAiDecydentEnabled` **false → false** · diff **0** |
| **DF** | [`IK-P1-INVOICE-HOST-COLLISION-DESIGN-FREEZE.md`](./IK-P1-INVOICE-HOST-COLLISION-DESIGN-FREEZE.md) |
| **PV** | [`IK-P1-INVOICE-HOST-COLLISION-PRODUCTION-VERIFY.md`](./IK-P1-INVOICE-HOST-COLLISION-PRODUCTION-VERIFY.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS |
| **Owner Verify** | **PASS** |
| **Deploy** | **PASS** |
| **Production Verify** | **PASS** |

```text
P1 IMPLEMENT = PASS
OWNER VERIFY = PASS
COMMIT = 482c618f
PUSH = PASS
DEPLOY = PASS
PV = PASS
PRODUCTION = 2.66.88 / 482c618f
CatalogWork 471 = UNCHANGED
D diff = 0
```

---

## 1. Files changed (feature commit `482c618f`)

| File | Change |
|------|--------|
| `src/lib/tender-offer-boq-mapping.ts` | **G1** — exclude `isInvoicePurchaseCatalogWorkId` from Core scoring pool |
| `src/lib/intelligent-estimator/classification-gate.ts` | **G2** — `isInvoicePurchaseMaterialKey` before `mat.*` allow |
| `src/lib/intelligent-estimator/ik-material-expert.ts` | **G2** — `researchEligible` blocks `mat.inv.*` |
| `src/lib/price-intelligence/market-material-research-wire.ts` | **PM safety** — CURRENT reuse before DIY gate |
| `src/lib/price-intelligence/market-material-research-orchestrate.ts` | **PM safety** — CURRENT REUSE before DIY gate |
| `scripts/test-ik-p1-invoice-host-collision.mjs` | T1–T10 + PACZKA V |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.66.88** |
| `docs/architecture/IK-P1-INVOICE-HOST-COLLISION-DESIGN-FREEZE.md` | Design Freeze |
| `docs/architecture/IK-P1-INVOICE-HOST-COLLISION-IMPLEMENTATION-CLOSEOUT.md` | this file |

**Not changed:** CatalogWork seed · Zygmunt · `resolveDemandProductIdentityExact` · Accept UI · D · F5 · Chief · Labor engine · Classification map · new flags/engines.

---

## 2. G1 result — **PASS**

```text
mapOfferBoqLineCore:
  active works
  → exclude isInvoicePurchaseCatalogWorkId(work.id)
  → scoreWorkAgainstLine
  → primary

SSOT: Core only (not listActiveWorksForRegion).
cw.inv.* cannot be BOQ primary.
Canonical CatalogWork still binds.
```

---

## 3. G2 result — **PASS**

```text
researchEligible(mat.inv.*) → false
assertMaterialResearchAllowed(mat.inv.*) → ok:false
  (invoice check BEFORE materialKey.startsWith("mat."))

mat.<canonical> Research eligibility UNCHANGED.

Phase2 / Phase1 / orchestrate:
  CURRENT Price Memory reuse FIRST
  then DIY gate (mat.inv.* → no market HTTP)
```

---

## 4. Tests (pre-commit)

| Suite | Result |
|-------|--------|
| `test-ik-p1-invoice-host-collision.mjs` | **41 PASS / 0 FAIL** |
| `test-estimator-classification-gate-01.mjs` | **37 PASS** |
| `test-invoice-price-memory-seed.mjs` | **38 PASS** |
| `test-market-material-research-02.mjs` | **73 PASS** (leaf) |
| IK P0–P10 | **PASS** |
| Build | **PASS** |

---

## 5. PACZKA V verification — **PASS** (local + PV)

**Tender:** `08decd21-9cc2-012f-5fad-9500015f70fa`

| Check | Result |
|-------|--------|
| BOQ lines | **178** |
| CatalogWork active | **471** |
| LP6 | **NOT** `cw.inv.50` · **NOT** DIY invoice Research |
| LP130 | **NOT** `cw.inv.h_tr_40` |
| LP136 | **NOT** `cw.inv.50` |
| LP4 | **`cc-w2-oczyszczenie-podloza`** |
| Invoice → DIY Research keys | **0** |

---

## 6. PM / invoice — **PASS**

| Check | Result |
|-------|--------|
| `resolveDemandProductIdentityExact(mat.inv.*)` | UNCHANGED HIT |
| `resolveDemandProductIdentityExact(cw.inv.*)` | UNCHANGED HIT |
| Phase2 CURRENT → `current_reuse_no_research` | PASS |
| Phase2 mat.inv MISSING → `classification_gate` | PASS (no DIY HTTP) |

---

## 7. CatalogWork = 471 — **PASS**

**UNCHANGED** · invoice hosts remain active (371 hosts in store).

---

## 8. D diff — **PASS**

`expertAiDecydentEnabled`: **false → false** · **diff = 0**

---

## 9. Production Verify — **PASS**

| Field | Value |
|-------|-------|
| Live `version.json` | **2.66.88** / **`482c618`** |
| Deploy | **PASS** |
| PV | **PASS** |
| Write audit | **PASS** (read-only) |
| Safety | **PASS** |

Full matrix: [`IK-P1-INVOICE-HOST-COLLISION-PRODUCTION-VERIFY.md`](./IK-P1-INVOICE-HOST-COLLISION-PRODUCTION-VERIFY.md)

---

## 10. Write audit — **PASS**

| Action | During IMPLEMENT / OV / PV |
|--------|----------------------------|
| Accept | **0** |
| CatalogWork write | **0** |
| Price Memory write | **0** |
| settings / pushCloud | **0** |
| Edge | read-only `batch-get` only |

---

## 11. Safety — **PASS**

GAP ≠ 0 PLN · NO EVIDENCE ≠ 0 PLN · Research ≠ Accept · Evidence ≠ OUR RATE · no auto Accept · no unit remapping · D unchanged · CatalogWork unchanged.

---

## 12. Scope confirmation

**IN:** G1 + G2 + PM CURRENT-before-gate + tests + changelog 2.66.88 + DF/closeout/PV docs.  
**OUT:** Classification V2 · Identity V2 · Research V2 · seed cleanup · PM redesign · Accept · D · F5 · Chief · Labor rewrite · new engines/flags.
