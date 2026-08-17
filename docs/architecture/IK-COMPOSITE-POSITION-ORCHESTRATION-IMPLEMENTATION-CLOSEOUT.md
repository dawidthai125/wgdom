# IK Composite Position Orchestration — IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **IMPLEMENT = PASS** · **READY FOR OWNER VERIFY** |
| **Date** | 2026-08-17 |
| **UI version (local)** | **2.66.89** (undeployed) |
| **Production tip** | **2.66.88** / **`482c618f`** (unchanged — no commit/push) |
| **DF** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-DESIGN-FREEZE.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS (absorbed) |
| **Owner GO** | AUTHORIZED (consumer `BOTH_HOLD`) |
| **D** | **false** (diff 0) |
| **CatalogWork** | **471** (live Edge read) |
| **Commit / push / deploy** | **NOT DONE** |

```text
IMPLEMENT              = PASS
READY FOR OWNER VERIFY = YES
COMMIT                 = NO
PUSH                   = NO
DEPLOY                 = NO
PRODUCTION CLAIM       = NO
```

---

## 1. Files changed

| File | Role |
|------|------|
| `src/lib/intelligent-estimator/ik-composite-both-hold.ts` | **NEW** thin adapter `runIkCompositeBothHold` |
| `src/lib/intelligent-estimator/index.ts` | export adapter |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | consumer call when P5∧P6 |
| `src/lib/intelligent-estimator/ik-entry-conversation.ts` | EC fact `COMPOSITE_BOTH_HOLD` |
| `src/app/changelog-data.ts` | **2.66.89** |
| `CHANGELOG.md` | skrót 2.66.89 |
| `scripts/test-ik-composite-position-orchestration.mjs` | T01–T20 + Paczka VII read-only |

**Not changed (frozen):** `classification-gate.ts` · `computePositionCost` / `engine.ts` · P1 G1/G2 · P2 KEEP GAP · `app-settings` flags · CatalogWork · Accept · PM write · Research engines · F5 engine.

---

## 2. Exact implementation points

```text
IkEntryHost
  when isIkP5LaborE2eActive ∧ isIkP6MaterialE2eActive
    ∧ masterBoq.readyForExperts
  → runIkCompositeBothHold({ p5: true, p6: true, executeResearch flags recorded only })

runIkCompositeBothHold
  skip lines whose handoff ≠ BOTH_HOLD
  parent plane COMPOUND UNCHANGED (parentRemainsCompound=true)
  decomposeOfferBoqLine
  findActiveTechnologyPacksForWorkId (exact steps.catalogWorkId)
  materials[] → resolveMaterialInputFromPriceMemory (leaf)
  leaf steps[].catalogWorkId ≠ parent → resolveLaborInputFromOurWorkRate
  hoursPerUnit without leaf workId → GAP
  PositionCostInput (never labor=null / materials=[] as success)
  computePositionCost() UNCHANGED
  feedsP7Bid = false  (XOR F5)
  researchHttpExecuted = false  (write boundary — no HTTP from adapter)
```

**Leaf only:** parent COMPOUND workId is bind trigger, **not** a labor/material expert job. No `runIkMasterBoqLaborExpert` / `runIkMasterBoqMaterialExpert` on the parent.

**No new flag.** HOLD when P5 XOR P6.

---

## 3. T01–T20 results

Suite: `npx vite-node scripts/test-ik-composite-position-orchestration.mjs`  
**63 PASS / 0 FAIL** (includes source contracts + live tender probes).

| ID | Case | Result |
|----|------|--------|
| T01 | pure LABOR | **PASS** — skip (`LABOR_READY_FOR_EXPERT`) |
| T02 | pure MATERIAL | **PASS** — skip |
| T03 | COMPOUND material + labor jobs | **PASS** — BOTH_HOLD → pack jobs; parent ≠ labor leaf |
| T04 | material HIT + labor HIT | **PASS** — COMPLETE · total > 0 |
| T05 | material HIT + labor GAP | **PASS** — GAP · total null · ≠ 0 |
| T06 | material GAP + labor HIT | **PASS** — GAP · total null |
| T07 | both GAP | **PASS** |
| T08 | missing material identity | **PASS** — `NO_MATERIAL_IDENTITY` |
| T09 | missing labor workId / hours-only | **PASS** — `HOURS_ONLY_LABOR` · no guessed PLN |
| T10 | P5 OFF | **PASS** — HOLD |
| T11 | P6 OFF | **PASS** — HOLD |
| T12 | P5 + P6 ON | **PASS** — RUN |
| T13 | P1 invoice | **PASS** — `mat.inv.*` → `P1_INVOICE_HOST` |
| T14 | P2 KEEP GAP | **PASS** — both zawory `PRODUCT_IDENTITY_GAP` |
| T15 | unit safety | **PASS** — mb vs OUR RATE m2 → GAP, no remap |
| T16 | quantity multiplication | **PASS** — 20 × 0.5 = 10 |
| T17 | no auto-Accept | **PASS** — even with research flags ON, HTTP=0 |
| T18 | CatalogWork 471 | **PASS** — write=false · live count **471** |
| T19 | D false | **PASS** |
| T20 | autonomous multi-line | **PASS** — 2 BOTH_HOLD + 1 LABOR skip in one call |

---

## 4. Real tender evidence (Paczka VII)

**Target:** `08decd1d-542e-312b-5fad-9500015f7011`  
**Access:** read-only Edge `batch-get` (`kw-tenders-pipeline`, `kw-wgdom-work-catalog`)  
**Writes:** none (Accept / CatalogWork / PM / PRICE_DEMAND / lease = 0)

| Probe | Result |
|-------|--------|
| Tender found | **YES** |
| Master BOQ ready | **YES** |
| CatalogWork active | **471** |
| Live `COMPOUND` / `BOTH_HOLD` | **0** (prior audit snapshot had 1 — **not invented**) |
| Consumer | ran · `bothHoldLineCount=0` · idle |
| Natural montaż/wymiana/PVC | existing LPs are **UNKNOWN / UNRESOLVED** (no workId) — Classification Gate **not** remapped |

**HIT+HIT → PositionCostInput evidence** is therefore from **T04 fixture** (legal `mat.wc_compact` + leaf `cw.paint.walls` OUR RATE), not from a live COMPOUND LP. Live WM currently has **no** `BOTH_HOLD` line to compose. That is honest GAP of **classification coverage**, not adapter failure.

---

## 5. Material → Expert evidence (T04)

```text
pack.materials[0].materialKey = mat.wc_compact
  → resolveDemandProductIdentityExact  (existing resolver)
  → resolveMaterialInputFromPriceMemory / evaluateMaterialCache
  → PositionMaterialInput { status: CURRENT, quantity: 10, unit: szt }
  → engineInput.materials[]
```

No synthetic `mat.*`. Research HTTP = false.

---

## 6. Labor → Expert evidence (T04)

```text
pack.steps leaf catalogWorkId = cw.paint.walls
  (parent cc-p0c-w1-zabezpieczenie-folia excluded — not a leaf)
  → lookupWorkRate / resolveLaborInputFromOurWorkRate
  → PositionLaborInput { status: CURRENT, ourRatePln = SELL }
  → engineInput.labor  (NOT null)
```

Hours-only without leaf workId = GAP (T09). No guessed PLN.

---

## 7. PositionCostInput evidence (T04)

```text
computePositionCost({
  quantity: 20,
  unit: "szt",
  labor: { status: "CURRENT", ourRatePln: <SELL> },
  materials: [{ materialKey: "mat.wc_compact", status: "CURRENT", quantity: 10, ... }],
})
→ positionComplete === true
→ totalPositionCostPln > 0
computePositionCostChanged === false
feedsP7Bid === false
```

Engine regression: `test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs` **46/0 PASS**.

---

## 8. Partial GAP safety

| Case | labor=null success? | materials=[] success? | total |
|------|---------------------|----------------------|-------|
| T05 labor GAP | **no** (MISSING/NO_IDENTITY) | n/a | **null** |
| T06 material GAP | n/a | **no** (array with MISSING/NO_KEY) | **null** |
| T07 both | **no** | **no** | **null** |

Missing component ≠ 0 PLN.

---

## 9. P1 / P2 regression

| Suite | Result |
|-------|--------|
| `test-ik-p1-invoice-host-collision.mjs` | **41/0 PASS** · CatalogWork 471 · D=false |
| `test-ik-migration-01-p59-material-identity.mjs` | **76/0 PASS** · zawory PRODUCT_IDENTITY_GAP |
| Composite T13 / T14 | **PASS** |

---

## 10. CatalogWork count / D state

| Check | Value |
|-------|-------|
| Live active works (Edge) | **471** |
| Adapter `catalogWorkWrite` | **false** |
| `defaultAppSettings().expertAiDecydentEnabled` | **false** |
| P1 T9 D diff | **0** |
| P10 A8/A9 D | **false** / diff 0 |

---

## 11. Write audit

| Action | Composite adapter | Tender test |
|--------|-------------------|-------------|
| Accept | **0** | **0** |
| CatalogWork mutation | **0** | **0** |
| PM mutation | **0** | **0** |
| settings persistence | **0** | **0** |
| PRICE_DEMAND push | **0** | **0** |
| Edge research lease | **0** | **0** |
| Edge batch-get | n/a | **read-only** |

Research flags on IkEntryHost are **recorded** (`executeLaborResearch` / `executeMaterialResearch`) but the adapter **does not HTTP**. Legal Research remains existing expert MODE B; write boundary kept.

---

## 12. Build result

`npm run build` → **PASS** (vite 6.3.5, ~42 s). Pre-existing chunk-size / duplicate-key warnings in `material-sell-adapter.ts` — **not introduced** by this epic.

---

## 13. Other regression

| Suite | Result | Note |
|-------|--------|------|
| P0 `computePositionCost` | **46/0 PASS** | engine UNCHANGED |
| P10 IK first-screen | **26/0 PASS** | |
| P3 classification | **34/1 FAIL** | **pre-existing:** script asserts `isIkEntryEnabled()===false` after `forceIkEntryEnabledForTests(null)` despite P10 default ON. Planes / BOTH_HOLD / no research / no Accept **PASS**. **Not composite.** Not fixed (out of frozen scope). |

Classification **functional** contract (COMPOUND → BOTH_HOLD, LABOR/MATERIAL 1:1, no invent) is intact.

---

## 14. Known findings

1. **Live Paczka VII `COMPOUND=0`.** Prior audit had 1. Consumer correctly idle. Natural „wymiana / PVC / instalacja” LPs are **UNKNOWN** (no `catalogWorkId`) — would require Classification V2 / identity mapping (**OUT** of this epic).
2. **HIT+HIT on a real WM COMPOUND LP was not observed** in this run (no such LP). Proven on fixture T04 with existing `mat.*` + OUR RATE.
3. **Kostka fixture pack** has `equipment[]` → DF v1 **EQUIPMENT_UNPRICED GAP** if bound; tests use equipment-empty pack.
4. **P3 Gate A assert** stale vs P10 default ON — pre-existing.
5. Adapter does **not** fire MODE B HTTP (write-boundary). MISS stays GAP until existing expert Accept / PM CURRENT.

---

## STOP

```text
IMPLEMENT = PASS
READY FOR OWNER VERIFY

ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
ZERO PRODUCTION CLAIM

Czekaj na Owner Verify.
```
