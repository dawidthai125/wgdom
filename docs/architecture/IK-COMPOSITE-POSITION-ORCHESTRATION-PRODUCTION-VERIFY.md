# IK Composite Position Orchestration · PRODUCTION VERIFY

> **ID:** `IK-COMPOSITE-POSITION-ORCHESTRATION-PRODUCTION-VERIFY`  
> **Date:** 2026-08-17  
> **Closeout:** [`IK-COMPOSITE-POSITION-ORCHESTRATION-IMPLEMENTATION-CLOSEOUT.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-IMPLEMENTATION-CLOSEOUT.md)  
> **DF:** [`IK-COMPOSITE-POSITION-ORCHESTRATION-DESIGN-FREEZE.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-DESIGN-FREEZE.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · READ-ONLY

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.89** |
| Impl commit | **`d62eb2a466793abbd0572f13fdba08c21e406da9`** (`d62eb2a4`) |
| Live `version.json` (one-shot) | **2.66.89** / **`d62eb2a`** |
| Ancestry | **live short ⊂ impl** (`d62eb2a` ⊂ `d62eb2a4`) |
| Deploy | **PASS** (Vercel Git Integration · `origin/main` · ID **`5941251917`**) |
| Live chunk | `TendersModule-Dej7Q0C8.js` |
| Verdict | **PRODUCTION VERIFIED** |

```text
DEPLOY = PASS
PV = PASS
2.66.89 / d62eb2a
```

---

## PV checks (PASS)

| # | Check | Result |
|---|-------|--------|
| 1 | Production version **2.66.89** | **PASS** |
| 2 | Production commit **`d62eb2a`** ⊂ **`d62eb2a4`** | **PASS** |
| 3 | Runtime composite in live bundle | **PASS** — `COMPOSITE_BOTH_HOLD` · `data-ik-composite-status` · `data-ik-composite-feeds-p7` · `parentRemainsCompound` · `computePositionCost` |
| 4 | `computePositionCost()` unchanged | **PASS** — not in commit `d62eb2a4` · last engine change FAZA 0 `bf4e1beb` · adapter `computePositionCostChanged=false` |
| 5 | Autonomy P5∧P6 | **PASS** — `IkEntryHost` auto-`useMemo` when `p5LaborOn && p6MaterialOn` · T12 RUN · T10/T11 HOLD · no per-COMPOUND manual expert start |
| 6 | HIT+HIT complete (fixture) | **PASS** — **T04 fixture** `mat.wc_compact` + leaf `cw.paint.walls` → COMPLETE · total > 0 · **not a live COMPOUND LP** |
| 7 | HIT+GAP / GAP+HIT / both GAP | **PASS** — T05/T06/T07 · `totalPositionCostPln == null` · ≠ 0 PLN |
| 8 | Material identity | **PASS** — legal `mat.*` → Material Expert · missing key → `NO_MATERIAL_IDENTITY` · `mat.inv.*` → `P1_INVOICE_HOST` |
| 9 | Labor identity | **PASS** — leaf `steps[].catalogWorkId` (parent excluded) · hours-only → `HOURS_ONLY_LABOR` · no guessed PLN |
| 10 | P1 regression | **PASS** — **41/0** · Paczka V BOQ **178** · LP6/130/136 ≠ `cw.inv.*` primary · `mat.inv.*` not DIY Research |
| 11 | P2 KEEP GAP | **PASS** — `cc-w2-zawor-odcinajacy` · `cc-p0c-w1-zawor-odpowietrzajacy` → `PRODUCT_IDENTITY_GAP` · P5.9 **76/0** · brief ID `cc-p0c-w1-zawor-odcinajacy` **does not exist** |
| 12 | F5 XOR | **PASS** — live minify `feedsP7Bid:!1` · T04 `feedsP7Bid=false` |
| 13 | D | **PASS** — live KV `expertAiDecydentEnabled=false` · default false · diff **0** |
| 14 | CatalogWork | **PASS** — **471 → 471** |
| 15 | Write audit | **PASS** — read-only `batch-get` only |
| 16 | Paczka VII | **PASS** — `08decd1d-542e-312b-5fad-9500015f7011` · BOQ ready · **COMPOUND/BOTH_HOLD = 0** · consumer **idle** |
| 17 | Regression suites | **PASS** — see below |

**Do not claim:** real-tender Material+Labor composition executed. Live WM currently has **no** `BOTH_HOLD` line.

---

## Runtime path (production)

```text
COMPOUND
  → BOTH_HOLD
  → IkEntryHost (P5 ∧ P6)
  → decomposeOfferBoqLine
  → TechnologyPack (exact bind)
  → leaf Material Expert + leaf Labor Expert
  → PositionCostInput
  → computePositionCost()   ← UNCHANGED
```

- Parent COMPOUND remains COMPOUND (`parentRemainsCompound=true`).
- BOTH_HOLD consumed **only** when P5 ∧ P6; XOR → HOLD.
- Leaf-only expert execution. No parent `runIkMasterBoqLaborExpert` / `runIkMasterBoqMaterialExpert`.
- `labor=null` is not success. `materials=[]` is not success. GAP ≠ 0 PLN.

---

## Paczka VII (behavior test — not composition proof)

| Probe | Result |
|-------|--------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` |
| Master BOQ ready | **YES** |
| Live `COMPOUND` / `BOTH_HOLD` | **0** |
| Consumer | ran · `bothHoldLineCount=0` · **idle** |
| Natural montaż/wymiana/PVC | **UNKNOWN / UNRESOLVED** (no `catalogWorkId`) — Classification Gate not remapped |

HIT+HIT → `PositionCostInput` evidence is **T04 fixture**, not this tender.

---

## Write audit (PV)

| Action | Count |
|--------|-------|
| Accept | **0** |
| CatalogWork write | **0** |
| Price Memory write | **0** |
| PRICE_DEMAND write | **0** |
| Tender mutation | **0** |
| settings write | **0** |
| pushCloud | **0** |
| research lease write | **0** |
| Edge `batch-get` (read) | **read-only** (tenders + catalog + settings) |

---

## Regression (local, zero code change)

| Suite | Result |
|-------|--------|
| T01–T20 composite (+ Paczka VII probe) | **63/0** |
| P1 invoice host | **41/0** |
| P2 / P5.9 material identity | **76/0** |
| P0 `computePositionCost` | **46/0** |
| P10 IK first-screen | **26/0** |
| `npm run build` | **PASS** |

P3 Gate A **34/1** remains **pre-existing** (P10 default `ikEntryEnabled` ON vs old assert OFF). Not composite. Not fixed.

---

## Invariants (locked)

- parent COMPOUND remains COMPOUND
- BOTH_HOLD consumed only at P5 ∧ P6
- leaf-only expert execution · no parent expert execution
- GAP ≠ 0 PLN
- `labor=null` ≠ success · `materials=[]` ≠ success
- `mat.inv.*` blocked · missing material identity = GAP
- hours-only labor = GAP
- labor identity = `steps[].catalogWorkId`
- `feedsP7Bid=false`
- P1 unchanged · P2 KEEP GAP
- D=false · CatalogWork=471
- no auto-Accept · no business writes

**OUT:** P2 expansion · invoice redesign · Classification V2 · new Research/Composite engine · new flags · D · Chief · F5 redesign · CatalogWork cleanup · PM/Accept redesign · `computePositionCost` redesign.

---

## Status

```text
PRODUCTION VERIFY = PASS
PRODUCTION = 2.66.89 / d62eb2a
COMPOSITE = PRODUCTION VERIFIED
P1 = COMPLETE / CLOSED
P2 = KEEP GAP
EPIC = CLOSED

T04 HIT+HIT = fixture only
Paczka VII = IDLE (COMPOUND/BOTH_HOLD = 0)
NO live Material+Labor composition claim
```
