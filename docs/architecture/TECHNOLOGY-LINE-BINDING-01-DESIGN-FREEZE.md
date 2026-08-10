# DESIGN FREEZE — TECHNOLOGY-LINE-BINDING-01

> **EPIC / Slice:** INTELLIGENT ESTIMATOR — Technology Recipe / Material Derivation Foundation  
> **ID:** `TECHNOLOGY-LINE-BINDING-01`  
> **Status:** **DESIGN FREEZE APPROVED** · **IMPLEMENT = DONE (local)** · **COMMIT / PUSH / PROD = NOT AUTHORIZED**  
> **Baseline tip:** UI **2.66.23** / commit **`0933aab`**  
> **Date:** 2026-08-10  
> **Mode:** Binding model D implemented in Execution Expert · Owner verification required before commit  
> **Evidence:** Real tender operate + product/labor triage (5 tenders · 804 lines · ~6.5% product-ish · exact product HIT = 0)

```text
OWNER DECISION LOCKED
─────────────────────
NOT:  BOQ → materialKey → price
YES:  BOQ → CostItem → Technology → Recipe → Components
        → Quantity Derivation → Material Identity → PI → Real Cost → Offer

REUSE FIRST: TechnologyPack + PackMaterialRecipeLine + projectBom
NO second BOM/recipe SSOT
NO invented consumption norms (l/m², kg/m², 3×1.5…) in this slice
NO Bid calculator / MARKET→Offer / multi-apartment schema
```

---

## A. CURRENT ARCHITECTURE

```text
TenderPipelineItem
  └─ tenderDossier.kosztorys / AGGREGATE|ONE|HOLD
       └─ OfferBoqDocument (lines: description, qty, unit, catalogWorkId?)
            │
            ├─[Bid path]──────────────────────────────────────────────┐
            │  classify / OfferBoq CI / applyOfferBoqPricing           │
            │  → category × qty × catalog rates → recommendedBidPln   │
            │                                                         │
            └─[Expert / Chief path]───────────────────────────────────┤
                 ExecutionExpert                                        │
                   selectTechnologyPackForOfferBoq  ← 1 pack / TENDER │
                   keyword heuristics (ETICS | kostka only ACTIVE)      │
                   offerBoqToBoqContextForPack(matchedLineIds)          │
                   runTechnologyFoundationPipeline(pack, ctx)           │
                     deriveExecutionPlan                                │
                     projectBom  ← Σ(matched qty) × qtyFactor           │
                   → GeneratedBom (materials / labour / equipment)      │
                 MaterialExpert (conformity vs Pack)                    │
                 PricingExpert (marketQuotes by materialKey)            │
                 CostExpert assembleRealCost (Purchase only)            │
                 OfferExpert (margin on Real Cost)                      │
                 PI Demand (after materialKey known)                    │
```

### Locked facts

| Element | Location | Limitation |
|---------|----------|------------|
| Technology recipe SSOT | `src/lib/technology-foundation/` | Pack = recipe · **no PLN** (TF-1) |
| Material factor | `PackMaterialRecipeLine.qtyFactor` | Scalar vs BOQ qty only |
| Labour factor | `hoursPerUnit` | Exists |
| Equipment factor | `qtyFactor` | Exists |
| BOM projection | `projectBom(pack, plan, ctx)` | `primaryBoqQty = Σ line.quantity` |
| Pack selection | `execution-expert/pack-selection.ts` | **One pack / tender** · score ≥ 25 |
| ACTIVE packs | ETICS + kostka fixtures | No painting / plaster / electrical |
| OfferBoq Cost Intelligence | `tender-offer-boq-cost-intelligence.ts` | CostItem-like classes · **not wired to TF** |
| PI S0–S5 | `price-intelligence/**` | Downstream of identity · **must not invent materials** |

---

## B. PROPOSED TARGET ARCHITECTURE

```text
Tender
  └─ BOQ lines (OfferBoq)
       └─ CostItem classification (deterministic family)
            └─ Technology binding (per line / family)
                 └─ TechnologyPack (REUSE — recipe SSOT)
                      └─ projectBom / projectBomForBinding (REUSE math)
                           Components:
                             MATERIAL  → materialKey + derived qty + unit
                             LABOR     → labourKey + hours
                             EQUIPMENT → equipmentKey + qty
                             SERVICE   → (future; optional stub only)
                           │
                           ├─ Material Identity (existing map / exact)
                           ├─ PI Demand / Market / Purchase   ← price only
                           └─ Real Cost (Purchase materials + labor + eq)
```

### Binding model — **ONE choice: D (hybrid)**

| Option | Decision |
|--------|----------|
| A per BOQ line only | Too chatty; duplicates identical KNR families |
| B per CostItem object only | OfferBoq CI objects are not yet TF-facing SSOT |
| C per CatalogWork family only | Real ATH often has weak/missing `catalogWorkId` |
| **D hybrid** | **SELECTED** |

**D — hybrid (LOCKED for this freeze):**

```text
BOQ line
  → deterministic CostItemFamily classification
  → TechnologyFamily / packId candidate
  → TechnologyPack@version (registry)
  → binding record (lineId → packId@version + params placeholder)
  → component projection via existing recipe lines × line.quantity
```

**Justification from existing architecture:**

1. TF already keys recipes by **Pack**, not by free-form CostItem DTOs.  
2. Execution already maps **lines → pack** via `matchedLineIds` — extend from 1-pack-wins to **N bindings**.  
3. OfferBoq CI already thinks in **work classes** (demolition, measurement, M+R) — reuse as **family classifier input**, not as a second recipe store.  
4. Real 804-line evidence: many lines share KNR families → classify-to-family then bind pack avoids 1:1 pack explosion.

---

## C. TechnologyPack reuse plan

| Keep as SSOT | Do not create |
|--------------|---------------|
| `TechnologyPack` | Parallel `RecipeEngine` / second BOM store |
| `PackMaterialRecipeLine` | New `materialKey` factory in this slice |
| `PackLabourRecipeLine` / equipment lines | Duplicate qty math outside `projectBom` |
| `registerPack` / lifecycle / versioning | Mutable in-place pack edits |
| `projectBom` quantity math | Invented l/m² tables |

### Minimal schema extension (DESIGN ONLY — not implemented now)

**Allowed later (IMPLEMENT GO):** optional, additive, default-empty:

```text
PackBindingParams (on binding record, NOT on invented norms):
  coats?: number          // reserved — value only if Owner-approved recipe provides it
  thicknessMm?: number    // reserved
  circuitType?: string    // reserved — enum Owner-approved
  // NO default numeric factors in code without Owner data GO
```

**Pack content for painting (FUTURE data GO, not this freeze implement):**

- May add `pack.painting.interior_2coat` as **DRAFT** only when Owner supplies factors.  
- This freeze’s thin slice may ship **binding machinery + classifier stubs** with **zero new ACTIVE packs** OR only wire existing ETICS/kostka **per-line**.

**Slice preference (LOCKED):**  
First implement **line-scoped binding + multi-pack BOM merge** using **existing ACTIVE packs** (ETICS, kostka) as regression carriers; painting recipe = **stub family → unbound / explicit gap**, not fake factors.

---

## D. CostItem → Technology binding

### CostItemFamily (deterministic, thin slice)

Minimal closed set for binding (extend later without fuzzy):

| CostItemFamily | Examples (evidence) | TechnologyFamily (target) |
|----------------|---------------------|---------------------------|
| `painting` | Dwukrotne malowanie… | `tech.painting.interior` |
| `priming` | Gruntowanie podłoży… | `tech.painting.prime` |
| `plaster_internal` | Tynki wewnętrzne… | `tech.plaster.internal` |
| `screed_leveling` | Warstwy wyrównawcze… | `tech.screed.leveling` |
| `electrical_cable_lay` | Ułożenie przewodu… | `tech.electrical.cable` |
| `product_supply` | Skrzydła drzwiowe… | *(no tech recipe — product path)* |
| `demolition` | Wykucie… | *(labor-only / no material recipe)* |
| `service_disposal` | Kontener / utylizacja | *(service)* |
| `measurement` | Pomiar / sprawdzenie | *(labor/service)* |
| `etics_envelope` | styropian / siatka / tynk elew. | `pack.etics.external_wall` |
| `paving_cubes` | kostka / bruk | `pack.paving.concrete_cubes` |
| `unknown` | residual | unbound |

**Classifier rules (DESIGN):** fold+keyword / unit gates · Owner-approved term lists · **ZERO** LLM/fuzzy/embeddings.

### Binding record (logical)

```text
TechnologyLineBinding {
  tenderId
  lineId
  costItemFamily
  packId?: string          // null = unbound / gap
  packVersion?: string
  bindStatus: "bound" | "unbound" | "rejected" | "product_path" | "labor_only" | "service"
  matchReasonsPl: string[]
  // params placeholders only — no invented values
}
```

### Aggregation rule (replaces 1-pack/tender)

```text
For each bound line:
  ctx_line = { quantity: line.qty, unit: line.unit }
  bom_line = projectBom(pack, plan, ctx_line)   // REUSE

Merge BOM across lines:
  same materialKey → sum quantities
  same labourKey → sum hours
  same equipmentKey → sum quantities
```

ETICS/kostka **regression:** if all bindings for a tender collapse to one pack (as today), merged BOM ≈ current behavior (within floating tolerance).

---

## E. Component model

**REUSE — no new SSOT.**

| Component | Existing type | Qty rule today | Thin-slice stance |
|-----------|---------------|----------------|-------------------|
| MATERIAL | `PackMaterialRecipeLine` | `qty × qtyFactor` | Keep |
| LABOR | `PackLabourRecipeLine` | `qty × hoursPerUnit` | Keep |
| EQUIPMENT | `PackEquipmentRecipeLine` | `qty × qtyFactor` | Keep |
| SERVICE | — | — | **Out of slice** — classify `service_disposal` as non-BOM bindStatus |

**Missing field (minimal, future):**  
Only if Owner later needs provenance on factors:

```text
qtyFactorSource?: "owner_approved" | "fixture_legacy" | "norm_ref"
qtyFactorApprovedAt?: ISO
```

**Not required for TECHNOLOGY-LINE-BINDING-01** if no new factors are introduced.

---

## F. Quantity derivation

### Current

```text
primaryBoqQty = Σ(ctx.lines.quantity) || 1
material.qty = primaryBoqQty × qtyFactor
```

### Target (thin slice)

```text
For each binding with pack:
  lineQty = BOQ line.quantity
  component.qty = lineQty × qtyFactor   // same formula, line-scoped ctx
```

### Deferred (NOT in thin slice)

- coats / thicknessMm / circuitType driven formulas  
- waste / packaging / overlap beyond existing factor  
- unit conversion engine (m²→L) without Owner factor  

**Placeholder only:** binding may carry `params: {}` for forward compatibility.

---

## G. Source-of-truth model

| Priority | Question answered | Owner |
|----------|-------------------|-------|
| 1 | Explicit tender material list | Tender dossier |
| 2 | Explicit product BOQ line | Product path / PI |
| 3 | **TechnologyPack recipe** | TF registry |
| 4 | Work / CatalogWork | Catalog |
| 5 | Owner-approved classifier / factor | Design freeze + data GO |
| 6 | Market quote | PI — **price only** |
| 7 | Purchase | Company knowledge — **price only** |

**Frozen:** Market does **not** decide “what material is needed”.

---

## H. PI boundary (LOCKED)

| Layer | Responsibility |
|-------|----------------|
| Technology | **What** components / materials / labour / equipment |
| Material identity | Exact map `materialKey` ↔ CatalogWork (existing) |
| Demand | Missing price for known identity |
| Market | Reference price |
| Purchase | Company cost |
| Real Cost | Purchase (+ labor/eq rates) — **MARKET ≠ PURCHASE** unchanged |

PI **must not** infer paint from “malowanie”.

---

## I. Bid boundary (LOCKED)

| Now | Later (Product Owner GO) |
|-----|--------------------------|
| Do **not** touch `tenders-bid-calculator` / bid adapter / bid-time-load-guard | Optional shared kernel: CostItem + Technology + Components |
| Bid remains independent benchmark | Expert Real Cost consumes derived BOM |

**Recommendation (non-binding):** future **C** — shared lower-level kernel, separate strategies. **Out of this slice.**

---

## J. First thin slice — TECHNOLOGY-LINE-BINDING-01

### Goal

Replace **one TechnologyPack per tender** with **per-line (family) Technology bindings**, REUSE Pack + `projectBom`, merge components for Execution/Material/Cost path.

### IN

1. Deterministic `CostItemFamily` classifier (closed set above).  
2. `TechnologyLineBinding[]` builder from OfferBoq lines.  
3. Line-scoped `projectBom` invocation + BOM merge by key.  
4. Wire ExecutionExpert to prefer bindings merge over single `selectTechnologyPackForOfferBoq` winner (with fallback).  
5. Explicit bindStatus for painting/priming/etc. → **`unbound`** until Owner data GO (no fake pack).  
6. Tests (see M).  
7. Design freeze doc (this file).

### OUT

- Invented consumption norms  
- New ACTIVE painting/plaster/electrical packs with guessed factors  
- New `materialKey` / CatalogWork / aliases  
- Bathroom TF pack  
- MARKET → Offer / Purchase automation  
- Multi-apartment schema  
- Bid calculator changes  
- PI S0–S5 semantics change  
- LLM / fuzzy / scrape / SQL / providers  

### Reference use case (behavior in this slice)

```text
BOQ: "Dwukrotne malowanie …" 500 m²
  → CostItemFamily = painting
  → bindStatus = unbound (gap recorded, explainable)
  → NO materialKey invented
  → NO Demand for paint invented

BOQ: ETICS-matched line (existing)
  → CostItemFamily = etics_envelope
  → bound to pack.etics.external_wall@version
  → components via projectBom(line qty)
  → regression vs prior single-pack path
```

Painting → derived litres = **next data/recipe GO**, not this slice.

### Secondary cases (architecture fit check only)

| Case | Fit under D+Pack? |
|------|-------------------|
| Gruntowanie | Yes — family `priming` + future pack |
| Tynk + thickness | Yes — params.thicknessMm reserved |
| Wylewka + thickness | Yes — same |
| Przewód + circuit | Yes — params.circuitType reserved · no guess |
| Drzwi product + montaż | Yes — `product_path` + optional labor family |

---

## K. Exact files expected to change (FUTURE IMPLEMENT)

| File / area | Role |
|-------------|------|
| `src/lib/execution-expert/pack-selection.ts` | Split / extend → line binding helpers |
| `src/lib/execution-expert/analyze.ts` | Consume bindings · merge BOM |
| `src/lib/execution-expert/types.ts` | Binding types on result |
| `src/lib/execution-expert/offer-boq-adapter.ts` | Possibly line-scoped ctx helper |
| `src/lib/technology-foundation/project-bom.ts` | Optional: export helper for single-line ctx (no formula change) |
| **NEW** `src/lib/execution-expert/cost-item-family.ts` (or `technology-line-binding.ts`) | Classifier + binding builder |
| `scripts/test-technology-line-binding-01.mjs` (name TBD) | Slice tests |
| `docs/architecture/TECHNOLOGY-LINE-BINDING-01-DESIGN-FREEZE.md` | This freeze |
| Optional changelog **only on IMPLEMENT release** | Not now |

---

## L. Exact files forbidden to change

```text
bid-time-load-guard/**
tender-offer-boq-bid-adapter*
tenders-bid-calculator.ts
useTenderOfferRun*
Payroll*
Login / admin-auth session core
Persist / Q12
P0/P1 invoice writers
P3.1 / P3.2 core demand semantics (no invent materials into Demand)
Market Sync provider/publish
SQL Price DB / scrape / LLM / fuzzy identity
material-market-map aliases / new materialKey / SEED products
cloud-sync merge SSOT (unless Owner GO for new KV — not required)
```

---

## M. Test plan

| # | Test | Expected |
|---|------|----------|
| 1 | Painting BOQ line | `costItemFamily=painting`, `bindStatus=unbound` (or stub), **no** paint materialKey |
| 2 | Wrong technology (e.g. kostka keywords forced on painting) | Rejected / not bound to paving |
| 3 | ETICS fixture tender/lines | Bound to ETICS · BOM materials present · regression vs baseline qty math |
| 4 | Kostka fixture | Bound to paving · regression PASS |
| 5 | Bound line output | Components include materials and/or labour from Pack |
| 6 | Downstream identity | When materialKey from Pack exists → PE/PI can resolve map entry (no writes) |
| 7 | No Market/Purchase writes | Assert no `pushKeysToCloud` / accept paths in slice |
| 8 | No fuzzy/LLM | Classifier = deterministic tables only |
| 9 | No new materialKey | Diff allowlist |
| 10 | Bid calculator untouched | File hash / import guard / no import from bid calculator |

---

## N. Migration / storage impact

| Store | Impact |
|-------|--------|
| KV / cloud | **NONE** in thin slice (bindings computed ephemeral / in-memory) |
| localStorage | **NONE** required |
| TechnologyPack registry | In-memory as today · optional DRAFT packs later |
| Demand / Quotes / Purchase | **NO WRITES** from binding layer |

If later persist bindings → **separate Owner GO** + new key design (not this slice).

---

## O. Risk register

| Risk | Mitigation |
|------|------------|
| Classifier false positives bind wrong pack | High threshold · `unbound` default · Owner term lists |
| Multi-pack merge double-counts | Merge by key · tests on ETICS+kostka mix |
| Temptation to invent paint l/m² | Explicit OUT · unbound painting |
| Dual path Bid vs Expert confusion | Bid untouched · docs boundary |
| Scope creep to bathroom / aliases | OUT list · freeze checklist |
| Performance N× projectBom | Acceptable for P0 · memo by packId later |

---

## P. Rollback strategy

1. Feature flag `TECHNOLOGY_LINE_BINDING_01` (default OFF until PV) — **if** Owner requires flag on IMPLEMENT.  
2. Fallback: existing `selectTechnologyPackForOfferBoq` single-pack path.  
3. Revert commit(s) of slice only — no KV migration.  
4. ETICS/kostka tests must stay green on rollback.

---

## Q. OWNER APPROVAL CHECKLIST

Confirm before **OWNER GO IMPLEMENT**:

- [ ] Binding model **D (hybrid)** accepted  
- [ ] REUSE `TechnologyPack` / `projectBom` — no second recipe SSOT  
- [ ] **No invented consumption norms** in this slice  
- [ ] Painting first use-case = **classify + unbound gap**, not fake litres  
- [ ] PI boundary: Technology asks “what”; PI asks “price”  
- [ ] MARKET ≠ PURCHASE unchanged  
- [ ] Bid calculator / bid-time-load-guard untouched  
- [ ] No aliases / new products / bathroom pack / multi-apartment schema  
- [ ] Allowlist / denylist files accepted  
- [ ] Test plan 1–10 accepted  
- [ ] Rollback / flag strategy accepted  

---

## FINAL GATE

| Gate | Status |
|------|--------|
| DESIGN FREEZE | **READY** |
| IMPLEMENT | **NOT AUTHORIZED** |
| COMMIT | **NOT AUTHORIZED** |
| PUSH | **NOT AUTHORIZED** |
| PRODUCTION | **NOT AUTHORIZED** |

**NEXT:** OWNER VERIFICATION DESIGN FREEZE → only then `OWNER GO IMPLEMENT`.

---

*End of DESIGN FREEZE — TECHNOLOGY-LINE-BINDING-01*
