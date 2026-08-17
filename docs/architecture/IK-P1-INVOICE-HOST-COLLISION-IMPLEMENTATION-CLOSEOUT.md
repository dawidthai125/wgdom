# IK P1 — Invoice Host Collision · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **IMPLEMENT PASS** · READY FOR OWNER VERIFY · **STOP BEFORE COMMIT** |
| **Date** | 2026-08-17 |
| **Baseline tip (pre)** | Production **2.66.87** · commit **`7a32bb34`** |
| **Target tip (prepared)** | **2.66.88** (changelog only — **not** Production Verify) |
| **CatalogWork** | **471** UNCHANGED |
| **D** | `expertAiDecydentEnabled` **false → false** · diff **0** |
| **DF** | [`IK-P1-INVOICE-HOST-COLLISION-DESIGN-FREEZE.md`](./IK-P1-INVOICE-HOST-COLLISION-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS |
| **Owner GO** | AUTHORIZED (IMPLEMENT) |

```text
P1 IMPLEMENT = PASS
READY FOR OWNER VERIFY
STOP BEFORE COMMIT
ZERO PUSH · ZERO DEPLOY · NO PRODUCTION VERIFY CLAIM
```

---

## 1. Files changed

| File | Change |
|------|--------|
| `src/lib/tender-offer-boq-mapping.ts` | **G1** — exclude `isInvoicePurchaseCatalogWorkId` from Core scoring pool |
| `src/lib/intelligent-estimator/classification-gate.ts` | **G2** — `isInvoicePurchaseMaterialKey` before `mat.*` allow |
| `src/lib/intelligent-estimator/ik-material-expert.ts` | **G2** — `researchEligible` blocks `mat.inv.*` · export for tests |
| `src/lib/price-intelligence/market-material-research-wire.ts` | **PM safety** — CURRENT reuse before DIY gate (Phase1 + Phase2) |
| `src/lib/price-intelligence/market-material-research-orchestrate.ts` | **PM safety** — CURRENT REUSE before DIY gate |
| `scripts/test-ik-p1-invoice-host-collision.mjs` | **NEW** — T1–T10 + PACZKA V |
| `src/app/changelog-data.ts` | **2.66.88** entry (prepared) |
| `CHANGELOG.md` | **2.66.88** skrót |
| `docs/architecture/IK-P1-INVOICE-HOST-COLLISION-IMPLEMENTATION-CLOSEOUT.md` | this file |

**Not changed:** CatalogWork seed · Zygmunt · `resolveDemandProductIdentityExact` · Accept UI · D · F5 · Chief · Labor engine · Classification map · new flags/engines.

---

## 2. G1 result

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

## 3. G2 result

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

## 4. Tests

| Suite | Result |
|-------|--------|
| `test-ik-p1-invoice-host-collision.mjs` | **41 PASS / 0 FAIL** |
| `test-estimator-classification-gate-01.mjs` | **37 PASS** |
| `test-invoice-price-memory-seed.mjs` | **38 PASS** (PM CURRENT reuse restored) |
| `test-market-material-research-02.mjs` | **73 PASS** (run alone) |
| `test-market-material-research-01-b1.mjs` | **46 PASS** (run alone) |
| IK P0–P5 implementation | **PASS** (earlier in session) |
| IK P7–P10 implementation | **PASS** |
| IK P6 nested MMR-02 | may **timeout** when deeply nested under load — **leaf MMR-02 PASS** (known infra nesting; not P1 logic fail) |

---

## 5. PACZKA V (`08decd21-9cc2-012f-5fad-9500015f70fa`)

| Check | Result |
|-------|--------|
| BOQ lines | **178** |
| CatalogWork active | **471** |
| LP6 | **NOT** `cw.inv.50` |
| LP130 | **NOT** `cw.inv.h_tr_40` |
| LP136 | **NOT** `cw.inv.50` |
| LP4 | **`cc-w2-oczyszczenie-podloza`** |
| Invoice → DIY Research keys | **0** |
| Edge writes | **1× read-only batch-get** only |

---

## 6. PM / invoice regression

| Check | Result |
|-------|--------|
| `resolveDemandProductIdentityExact(mat.inv.*)` | UNCHANGED HIT |
| `resolveDemandProductIdentityExact(cw.inv.*)` | UNCHANGED HIT |
| Phase2 CURRENT → `current_reuse_no_research` | PASS (invoice seed harness) |
| Phase2 mat.inv MISSING → `classification_gate` | PASS (no DIY HTTP) |

---

## 7. CatalogWork = 471

**UNCHANGED** (live PACZKA V store count + no seed/mutation in G1/G2 files).

---

## 8. D diff

`expertAiDecydentEnabled`: **false → false** · **diff = 0**

---

## 9. Build

`npm run build` → **PASS**

---

## 10. Write audit

| Action | During tests |
|--------|----------------|
| `saveAppSettings` / cloud push | **NO** |
| Accept | **NO** |
| CatalogWork write | **NO** (harness localStorage only) |
| Price Memory write | **NO** (PM regression read/reuse only) |
| Edge research lease | **NO** |
| Edge batch-get | **READ-ONLY** (PACZKA V) |

---

## 11. Known pre-existing / infra

| Item | Note |
|------|------|
| Nested MMR-02 under P6 | Can timeout (`status null`) when grandchild suites stack; **leaf** MMR-02 / B1 **PASS** |
| LP130 lexical overlap | **OUT OF SCOPE P1** (Q4) — only BOQ primary + DIY forbid |
| Accept UI invoice origin | BACKSTOP — out of P1 |

---

## 12. Scope confirmation

**IN:** G1 + G2 + PM CURRENT-before-gate order + focused tests + changelog 2.66.88 prepared.  
**OUT:** Classification V2 · Identity V2 · Research V2 · seed cleanup · PM redesign · Accept · D · F5 · Chief · Labor rewrite · new engines/flags.

---

## 13. Commit readiness

```text
READY FOR OWNER VERIFY
COMMIT = NOT DONE (Owner must authorize)
PUSH = NOT DONE
DEPLOY = NOT DONE
PRODUCTION VERIFY = NOT CLAIMED
09_PRODUCTION_BASELINE = NOT UPDATED
```

### Suggested commit message (after Owner Verify)

```text
fix(ik-p1): exclude invoice hosts from BOQ mapper + forbid mat.inv DIY Research

G1 mapOfferBoqLineCore scoring pool · G2 researchEligible/assertMaterialResearchAllowed
· PM CURRENT reuse before DIY gate · CatalogWork 471 · D unchanged.
```
