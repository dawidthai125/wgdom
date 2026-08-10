# DESIGN FREEZE — TECHNOLOGY-RECIPE-CONSUMPTION-01

> **EPIC / Slice:** INTELLIGENT ESTIMATOR — Technology Recipe → Material Consumption  
> **ID:** `TECHNOLOGY-RECIPE-CONSUMPTION-01`  
> **Status:** **DESIGN FREEZE OWNER VERIFIED** · **01A IMPLEMENT = DONE (local)** · **COMMIT / PUSH / PROD = NOT AUTHORIZED**  
> **Baseline tip:** UI **2.66.23** / commit **`30c4281`** (TECHNOLOGY-LINE-BINDING-01 PRODUCTION VERIFIED)  
> **Date:** 2026-08-10  
> **Mode:** 01A Recipe Provenance Infrastructure implemented locally · Owner verification required before commit  
> **Depends on:** TECHNOLOGY-LINE-BINDING-01 (BOUND / UNBOUND) · Technology Foundation B0 · PI Demand S0–S5

```text
OWNER DECISION LOCKED
─────────────────────
NOT:  BOQ → fuzzy product match → price
YES:  BOQ → CostItemFamily → TechnologyPack
        → Recipe (components + consumption rule)
        → Derived quantity → Material identity → PI

REUSE FIRST: TechnologyPack + PackMaterialRecipeLine + projectBom
NO second BOM / Recipe / Quantity SSOT
NO invented consumption norms (l/m², kg/m², 3×1.5…) without approved SOURCE
NO Bid / MARKET→Offer / multi-apartment / Payroll / Persist
```

---

## A. CURRENT ARCHITECTURE

```text
OfferBoq line
  └─ TECHNOLOGY-LINE-BINDING-01
       CostItemFamily (deterministic)
         ├─ etics_envelope / paving_cubes → BOUND → TechnologyPack ACTIVE
         └─ painting / priming / electrical… → UNBOUND (correct today)

TechnologyPack (SSOT recipe today)
  materials[]  PackMaterialRecipeLine { materialKey, namePl, unit, qtyFactor }
  equipment[]  PackEquipmentRecipeLine { …, qtyFactor }
  labour[]     PackLabourRecipeLine { …, hoursPerUnit }
  lifecycle    DRAFT | ACTIVE | DEPRECATED | ARCHIVED
  packVersion  immutable (createNextVersion)

projectBom(pack, plan, ctx)
  qty = Σ(ctx.lines.quantity)
  material.quantity = qty × qtyFactor     // NEVER PLN
  labour.hours      = qty × hoursPerUnit

Downstream (unchanged semantics):
  materialKey → existing PI identity map → Demand / Market(REFERENCE) / Purchase(COMPANY)
```

**Active packs with factors today:** ETICS + kostka only (`fixtures.ts`).  
**Factors have no provenance fields** — treated as **fixture_legacy** (not Owner-norm-certified).  
**Painting:** family known, pack absent → UNBOUND → no material derivation.  
**PI identity already exists** for paint/primer products (`mat.farba_lateksowa_wewnetrzna`, `mat.grunt`) via S2-C — **price identity ≠ consumption recipe**.

---

## B. RECIPE ARCHITECTURE (TARGET)

```text
BOQ qty + (optional tech params)
        │
        ▼
CostItemFamily ──bind──► TechnologyPack@version (ACTIVE + APPROVED recipe lines)
        │
        ▼
Pack*RecipeLine (extended minimally with provenance)
        │
        ▼
projectBom  →  GeneratedBom (materials / labour / equipment)
        │
        ▼
Material identity (existing map)  →  PI (price only)
```

**Decision: DO NOT invent a parallel `TechnologyRecipe` aggregate.**

| Option | Verdict |
|--------|---------|
| New top-level `TechnologyRecipe` store | **REJECT** — second SSOT |
| New `recipeId` cloud KV | **REJECT** for v1 |
| **Extend** `PackMaterialRecipeLine` / labour / equipment + pack lifecycle gates | **ACCEPT** |
| Keep `projectBom` formula | **ACCEPT** |

Recipe **is** the Pack’s materials/equipment/labour arrays.  
Consumption **is** `qtyFactor` / `hoursPerUnit` under provenance + approval rules.

---

## C. SOURCE-OF-TRUTH DECISION (LOCKED)

### C.1 Repo audit — where can WGDOM get l/m², kg/m², 3×1.5?

| Candidate | Found? | Usable as production consumption SSOT? |
|-----------|--------|----------------------------------------|
| Technology Foundation fixtures (`qtyFactor`) | YES (ETICS/kostka) | **Legacy fixture only** — no documented KNR/Owner source |
| Work catalog / seed-manifest | rates / works | **NO** consumption factors |
| Cost knowledge / CatalogWork | labor seeds | **NO** l/m² tables |
| PI material map (S2-C/S4) | product identity | **Identity only** — not consumption |
| KNR / KNNR tables in repo | **NO** | — |
| Owner-approved norm catalog in docs | **NO** | — |
| Electrical schematics / EM presets (`YDYp 3x1,5`) | labels for measurements UI | **FORBIDDEN** as estimator norm without separate Owner GO |
| LLM / internet / “typical values” | — | **FORBIDDEN** |

### C.2 Verdict

```text
SKĄD WGDOM BĘDZIE BRAŁ NORMY?
─────────────────────────────
JEDYNE dozwolone źródło production:
  Owner-approved SOURCE document
  → NORMALIZE (factor + unit + materialKey)
  → OWNER APPROVE
  → VERSIONED TechnologyPack line
  → ACTIVE lifecycle

Repo dziś NIE posiada wiarygodnego źródła dla:
  - painting l/m²
  - priming l/m²
  - plaster/screed kg/m²
  - cable 3×1.5 / 3×2.5 as BOQ→material recipe

Dlatego: NIE USTALAMY współczynników w tym Design Freeze.
```

### C.3 Process (mandatory for every factor)

```text
SOURCE (PDF/katalog/norma/Owner sheet — external or repo artifact)
  → NORMALIZE (inputUnit, outputUnit, factor, materialKey, waste policy)
  → OWNER REVIEW
  → APPROVED + effectiveFrom + packVersion
  → PRODUCTION BOM may use
```

Missing SOURCE → line **must not** enter ACTIVE production BOM.

---

## D. RECIPE SCHEMA (MINIMAL)

### D.1 Keep existing core

```text
PackMaterialRecipeLine {
  materialKey: string
  namePl: string
  unit: string          // output unit of derived qty (l, kg, m2, …)
  qtyFactor: number     // derivedQty = boqQty × qtyFactor
}
```

Same pattern for equipment; labour uses `hoursPerUnit`.

### D.2 Minimal additive fields (provenance — required for NEW factors)

```text
PackMaterialRecipeLine (extend, optional on legacy):
  factorSourceKind: "fixture_legacy" | "owner_approved" | "norm_ref"
  factorSourceRef?: string     // doc id / path / catalog ref (required if owner_approved|norm_ref)
  factorApprovedAt?: string    // ISO — required if owner_approved
  factorApprovedBy?: string    // owner id — required if owner_approved
  effectiveFrom?: string       // ISO date — optional, default = pack ACTIVE date
  wastePolicy?: "included_in_factor" | "none"
  // NO coats/thickness/circuitType fields until parametric slice
```

**Same optional provenance** on `PackEquipmentRecipeLine` / `PackLabourRecipeLine` when introducing new norms.

### D.3 Explicit non-goals (schema)

- No separate `recipeId` entity  
- No `coats` / `thickness` / `circuitType` columns in this freeze’s first implement slice  
- No packaging / can-size conversion engine  
- No second quantity formula store  

### D.4 Derived quantity (unchanged math)

```text
derivedQty = BOQ_line.quantity × qtyFactor
```

Unit of `derivedQty` = recipe line `unit`.  
Caller must not invent unit conversion without approved factor that already encodes conversion (e.g. m²→l via factor).

---

## E. VERSIONING

**REUSE** existing TF-8 pack immutability:

| Event | Action |
|-------|--------|
| Change factor 0.20 → 0.22 | `createNextVersion(pack, { materials: […] })` → new `packVersion`, starts **DRAFT** |
| Historical tender BOM | Snapshot uses **packVersion** resolved at analysis time (binding records packId+packVersion) |
| In-place edit ACTIVE | **FORBIDDEN** (`attemptEditPackInPlace` throws) |

Optional later (not required for 01A): persist `effectiveFrom` on lines for time-based selection.  
**v1 selection rule:** use packVersion attached to binding / analysis run — deterministic, no silent drift.

---

## F. APPROVAL LIFECYCLE

### F.1 Pack lifecycle (existing)

`DRAFT → ACTIVE → DEPRECATED → ARCHIVED`

### F.2 Factor approval gate (NEW rule — Design Freeze)

| State | May drive production `projectBom`? |
|-------|-------------------------------------|
| Pack `DRAFT` | **NO** |
| Pack `ACTIVE` + line `factorSourceKind=fixture_legacy` | **YES** only for grandfathered ETICS/kostka (document as legacy) |
| Pack `ACTIVE` + line `owner_approved` with `factorSourceRef` + `factorApprovedAt` | **YES** |
| Pack `ACTIVE` + line missing SOURCE for **new** family (painting…) | **ILLEGAL** — must not ship |
| Draft / review recipe for painting | Pack stays DRAFT → binding remains effectively unbound for production BOM |

```text
DRAFT (pack or lines under review)
  → REVIEW (Owner checklist)
  → APPROVED (provenance filled)
  → ACTIVE (lifecycle transition)
```

Unapproved painting pack = **not registered ACTIVE** → LINE-BINDING keeps **UNBOUND** → no guess.

---

## G. QUANTITY DERIVATION

### G.1 Minimal mechanism (this epic)

```text
inputs:
  boqQuantity   (from OfferBoq line)
  qtyFactor     (from approved recipe line)
output:
  componentQuantity = round6(boqQuantity × qtyFactor)
```

### G.2 Future parameters (placeholder only — NOT in 01A)

| Param | Use | When |
|-------|-----|------|
| coats | multiply or select recipe variant | Owner GO + SOURCE |
| thickness | select plaster/screed variant | later |
| circuitType | select cable materialKey | later electrical |
| waste | prefer included_in_factor | see § H |
| area/length/count | usually = BOQ qty | already |

**No parametric engine in first slice.**

### G.3 Coats (painting — design note only)

Target understanding:

```text
“Dwukrotne malowanie” → family painting + param coats=2 (deterministic parse later)
Recipe variant OR factor already includes 2 coats
```

**Do not** hardcode coats×0.25 in Design Freeze. Owner SOURCE must state whether factor is per coat or for full “dwukrotne”.

---

## H. WASTE — DECISION

| Option | Verdict |
|--------|---------|
| Separate waste % applied after factor | Deferred |
| **Waste included inside approved `qtyFactor`** | **ACCEPT for v1** |
| Packaging round-up (buckets/cans) | Deferred |

`wastePolicy: "included_in_factor" | "none"` documents intent; no second multiplier in 01A.

---

## I. FIRST USE CASE — PAINTING

```text
BOQ:  „Dwukrotne malowanie ścian” · 500 m²
Family: painting
Today:  UNBOUND · bom=null · CORRECT

Target (after Owner SOURCE + ACTIVE pack):
  TechnologyPack pack.painting.interior_walls @ vX
  materials:
    - mat.farba_lateksowa_wewnetrzna  unit=l  qtyFactor=<OWNER APPROVED>
    - optional mat.grunt             unit=l  qtyFactor=<OWNER APPROVED> if SOURCE says so
  labour: hoursPerUnit=<OWNER APPROVED>
  → projectBom → 500 × factor → identity → PI
```

**This Design Freeze does NOT set any numeric factor.**  
**Reuse identity:** `mat.farba_lateksowa_wewnetrzna` / `mat.grunt` already in PI map — **no new materialKey required** once recipe exists.

---

## J. SECOND USE CASE — ELECTRICAL CABLE (FUTURE)

```text
BOQ: „Ułożenie przewodu YDY…” · 300 m
Family: electrical_cable_lay (already classified)
Problem: same verb ≠ same product (lighting vs socket)

Target model (later slice):
  technology + context (circuitType) → materialKey (cable SKU)
  qty rule often ≈ 1.0 × length (+ waste in factor) — NOT invent 3×1.5/3×2.5 here

FORBIDDEN now:
  hardcoding 3×1.5 / 3×2.5 from EM schematics labels into estimator BOM
```

EM/schematics cable labels ≠ Technology Recipe SOURCE unless Owner explicitly approves a transfer.

---

## K. FUTURE USE CASES — MODEL GENERALITY

| Family | Fits Pack + qtyFactor? | Needs params later? |
|--------|------------------------|---------------------|
| priming | YES | coats optional |
| painting | YES | coats |
| plaster_internal | YES | thickness |
| screed_leveling | YES | thickness |
| hydroizolacja | YES | — |
| tiles + klej + fuga | YES (multi material lines) | — |
| GK | YES | — |
| drzwi + montaż | labour + product_path split | product vs tech |
| electrical | YES + circuitType variant | **yes** |
| sanitary | YES | — |
| ETICS / paving | already | — |

One model covers all: **Pack recipe lines × BOQ qty**; variants via **new packVersion** or later param→variant map — not a second SSOT.

---

## L. PI / PURCHASE / MARKET / BID BOUNDARIES

### L.1 PI (LOCKED)

| Technology | PI |
|------------|-----|
| Decides components + derived qty | Prices known `materialKey` |
| Must not ask PI “what does painting need?” | Must not invent materials |

### L.2 Purchase / Market (LOCKED)

| Layer | Role |
|-------|------|
| MARKET | REFERENCE only |
| PURCHASE | COMPANY COST |
| Demand | NO PRICE |

No MARKET → Real Cost / Offer in this epic.

### L.3 Real Cost (future note)

Derived BOM materials + Purchase + labour/eq rates → Real Cost.  
**Out of this Design Freeze implement scope.**

### L.4 Bid (LOCKED)

Bid calculator / adapter / bid-time-load-guard **untouched**.  
Future shared kernel (CostItem → Technology → Components) **possible** but **not** unified in this epic.

---

## M. EXACT FILES

### M.1 Existing SSOT / reuse

| File | Role |
|------|------|
| `src/lib/technology-foundation/types.ts` | Pack + recipe line types |
| `src/lib/technology-foundation/project-bom.ts` | Qty derivation |
| `src/lib/technology-foundation/pack-versioning.ts` | Immutable versions |
| `src/lib/technology-foundation/pack-lifecycle.ts` | DRAFT/ACTIVE… |
| `src/lib/technology-foundation/fixtures.ts` | ETICS/kostka legacy factors |
| `src/lib/execution-expert/technology-line-binding.ts` | BOUND/UNBOUND |
| `src/lib/execution-expert/cost-item-family.ts` | Families |
| `src/lib/execution-expert/analyze.ts` | Wire point |
| `src/lib/pricing-expert/material-market-map.ts` | Identity reuse (paint/grunt) |

### M.2 Potentially modified (when IMPLEMENT authorized)

| File | Change |
|------|--------|
| `types.ts` | Optional provenance fields on recipe lines |
| `pack-schema.ts` / `validate-*.ts` | Gate: ACTIVE+new factors require SOURCE |
| `fixtures.ts` | Mark ETICS/kostka as `fixture_legacy` only — **no factor value changes** unless Owner GO |
| `project-bom.ts` | Prefer **no math change**; optional refuse unapproved lines |
| `technology-line-binding.ts` / `analyze.ts` | Only if production gate needs DRAFT pack → unbound |

### M.3 New files (only if necessary)

| File | When |
|------|------|
| `docs/architecture/TECHNOLOGY-RECIPE-CONSUMPTION-01-DESIGN-FREEZE.md` | **This document** |
| `scripts/test-technology-recipe-consumption-01a.mjs` | At implement |
| Optional `src/lib/technology-foundation/recipe-provenance.ts` | Thin helpers for gate — **prefer keep in validate-*** |

**No** new `technology-recipe-store.ts` / second BOM module.

### M.4 Forbidden files

```text
bid-time-load-guard/**
tender-offer-boq-bid-adapter*
tenders-bid-calculator*
useTenderOfferRun*
Payroll / Login / Persist / Q12
P0/P1 invoice writers · P3.1/P3.2 core
Market Sync · SQL Price DB · providers · scrape
```

---

## N. MIGRATION / STORAGE

| Topic | Decision |
|-------|----------|
| Cloud KV for recipes | **NO** in 01A — packs remain code/registry (as B0) |
| SQL | **NO** |
| Seed writes / Price KV | **NO** |
| Historical BOMs | Bound to `packId@version` at analysis |
| Grandfather ETICS/kostka | `factorSourceKind=fixture_legacy` annotation — values unchanged |

---

## O. TEST PLAN (design)

1. Recipe lookup by packId@version  
2. Approved (`owner_approved` + SOURCE) line accepted into BOM  
3. DRAFT pack → no production BOM / binding treats as unbound  
4. Version selection deterministic (explicit packVersion)  
5. Quantity derivation = qty × factor (fixed fixtures)  
6. Missing recipe / missing ACTIVE pack → UNBOUND · no guess  
7. Missing SOURCE on new line → rejected by validator  
8. PI receives existing materialKey only (identity map HIT)  
9–14. No PI / Purchase / Market writes · no SQL · no HTTP · no LLM/fuzzy  
15–16. ETICS + paving regression PASS  
17. TECHNOLOGY-LINE-BINDING-01 regression PASS  
18. Painting still UNBOUND until Owner ACTIVE pack GO  

---

## P. RISKS

| Risk | Mitigation |
|------|------------|
| Pressure to invent paint l/m² | Explicit OUT until SOURCE |
| EM cable labels leak into estimator | Forbidden cross-import without Owner GO |
| Second recipe SSOT creep | Locked: Pack lines only |
| Silent factor edit | TF-8 immutability + new version |
| Bid/Chief divergence | Bid untouched; shared kernel later |
| fixture_legacy treated as certified norm | Document clearly; separate from owner_approved |
| Product identity without recipe | Keep UNBOUND — identity alone ≠ BOM |

---

## Q. FIRST IMPLEMENTATION SLICE

### Recommended: **TECHNOLOGY-RECIPE-CONSUMPTION-01A — Recipe Provenance Infrastructure**

**Goal:** mechanism + gates + tests — **without** activating painting consumption numbers.

| IN | OUT |
|----|-----|
| Provenance fields on recipe lines | Any new numeric norms |
| Validator: new ACTIVE factors need SOURCE | Painting ACTIVE pack with invented factor |
| Mark ETICS/kostka `fixture_legacy` | Changing ETICS/kostka qtyFactor values |
| Tests for draft reject / approved accept (using **synthetic** Owner-approved fixture under test-only pack OR mocked gate) | Production painting pack |
| Binding regression | Bid / PI writes / new materialKey |

### Follow-up (separate Owner GO): **01B — Painting ACTIVE**

Only after Owner supplies:

1. SOURCE document reference  
2. Exact factor(s) + units + whether coats included  
3. Which materialKeys (prefer existing paint/grunt)  
4. APPROVE → register Pack DRAFT→ACTIVE  

Until then painting remains **UNBOUND**.

---

## R. OWNER APPROVAL CHECKLIST

- [ ] Accept: **no second Recipe/BOM SSOT** — extend Pack lines  
- [ ] Accept: **no consumption numbers** in this freeze / 01A  
- [ ] Accept: SOURCE → NORMALIZE → APPROVE → VERSION → ACTIVE process  
- [ ] Accept: waste **included_in_factor** for v1  
- [ ] Accept: ETICS/kostka = `fixture_legacy` (not newly certified)  
- [ ] Accept: painting identity may reuse `mat.farba_*` / `mat.grunt` later — **no new keys in 01A**  
- [ ] Accept: electrical 3×1.5/3×2.5 **out** until separate SOURCE  
- [ ] Accept: Bid / MARKET→Offer / Purchase semantics **untouched**  
- [ ] Accept: first implement slice = **01A infrastructure**, not full painting library  
- [ ] Confirm: IMPLEMENT still requires separate **OWNER GO IMPLEMENT**

---

## S. FINAL GATE

```text
DESIGN FREEZE READY

IMPLEMENT = NOT AUTHORIZED
COMMIT = NOT AUTHORIZED
PUSH = NOT AUTHORIZED
PRODUCTION = NOT AUTHORIZED

EPIC context:
  TECHNOLOGY-LINE-BINDING-01 = PRODUCTION VERIFIED
  PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 = OPEN
  TECHNOLOGY-RECIPE-CONSUMPTION-01 = DESIGN FREEZE READY
```

**STOP — czekamy na OWNER VERIFICATION.**
