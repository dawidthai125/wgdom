# INTELLIGENT ESTIMATOR — CONTINUITY HANDOFF

> **ID:** `INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF`  
> **STATUS:** **HISTORICAL / TECHNOLOGY SLICES** · tip **nie tutaj**  
> **Data oryginału:** 2026-08-10 · **Pointer update:** 2026-08-14  
> **★★ Aktualny Master SSOT IK:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **★★ AI Continuity:** [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)  
> **★★ Production baseline IK:** [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md)  
> **Tip UI/commit:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `version.json`  
> **Cold starts (legacy aliases):** [`CURSOR-NEXT-SESSION-HANDOFF.md`](CURSOR-NEXT-SESSION-HANDOFF.md) · [`CHATGPT-NEXT-SESSION-HANDOFF.md`](CHATGPT-NEXT-SESSION-HANDOFF.md)

```text
Ten plik = archiwum Technology Foundation (paint/primer/cable…).
START IE (2026-08-14+) = MASTER-SSOT → AI-CONTINUITY → REUSE-MAP → 09.
NIE używaj tipu 2.66.23 z tego pliku jako production tip.
NIE buduj Przetargów od nowa.
```

---

## 1. Executive state

| Pole | Wartość |
|------|---------|
| **App** | W&G DOM — Intelligent Estimator (Execution Expert + Technology Foundation) |
| **Prod URL** | https://www.wgdom.fun |
| **UI version** | **2.66.23** |
| **Commit** | **`7b7d27a0b79d2d2e948400980bdb912c9ab08201`** (short `7b7d27a`) |
| **HEAD == origin/main** | **YES** |
| **Last PV** | ECONOMY-ELECTRICAL-CABLE-V1 = **PASS** |
| **Tryb** | Technology coverage expansion · **WAITING FOR NEXT OWNER GO** |
| **NEXT ACTION** | **BATCH TECHNOLOGY COVERAGE AUDIT** |
| **SCREED** | Candidate only · **SOURCE RESEARCH** required · **NOT** authorized to IMPLEMENT |

**Niski material-output (~6.3%) ≠ błąd architektury.**  
Oznacza brak zatwierdzonych SOURCE recipes dla większości family — pipeline Technology → Pack → BOM jest zweryfikowany na painting / priming / electrical V1.

---

## 2. Closed slices (PRODUCTION VERIFIED)

### 2.1 TECHNOLOGY-LINE-BINDING-01

| | |
|--|--|
| **Commit** | `30c4281f1ba885ccbf59640a3ba84abebc7fd174` |
| **Cel** | BOQ line → CostItemFamily → ACTIVE TechnologyPack bind (BOUND/UNBOUND) |
| **Architektura** | Execution Expert binding · REUSE TechnologyPack + `projectProductionBom` · **bez** drugiego BOM SSOT |
| **Decyzje** | NOT BOQ→materialKey→price · YES Technology→Recipe→qty→identity→(później) PI |
| **materialKey / recipe** | Brak nowych consumption norms w tym slice |
| **Test** | `scripts/test-technology-line-binding-01.mjs` |
| **DF** | [`TECHNOLOGY-LINE-BINDING-01-DESIGN-FREEZE.md`](TECHNOLOGY-LINE-BINDING-01-DESIGN-FREEZE.md) |
| **NIE zrobione** | Consumption norms · PI writes · Bid |

### 2.2 TECHNOLOGY-RECIPE-CONSUMPTION-01A

| | |
|--|--|
| **Commit** | `a7624b9fd8f3b79dd2029fdc6da724e013d54c57` |
| **Cel** | Provenance + lifecycle (DRAFT≠BOM) · qtyFactor source kinds · immutable ACTIVE |
| **Architektura** | Recipe provenance trail · ACTIVE pack feeds BOM only when source-backed |
| **Decyzje** | SOURCE → NORMALIZE → OWNER APPROVE → VERSION → ACTIVE |
| **DF** | [`TECHNOLOGY-RECIPE-CONSUMPTION-01-DESIGN-FREEZE.md`](TECHNOLOGY-RECIPE-CONSUMPTION-01-DESIGN-FREEZE.md) |
| **Test** | `scripts/test-technology-recipe-consumption-01a.mjs` |
| **NIE zrobione** | Painting ACTIVE (→ 01B) |

### 2.3 TECHNOLOGY-RECIPE-CONSUMPTION-01B — Painting

| | |
|--|--|
| **Commit** | `c8edb19bd767a5d72b0438b3188323b639edb008` |
| **Profile** | `ECONOMY_INTERIOR_WHITE_PAINT_V1` |
| **Cel** | Pierwszy real ACTIVE paint recipe → material qty |
| **materialKey** | `mat.farba_lateksowa_wewnetrzna` |
| **Factors** | Policy B · 12 m²/L · 1 coat `0.083333` L/m² · 2 coats `0.166667` L/m² · waste `included_in_factor` |
| **Pack** | `pack.painting.economy_interior_white_v1` |
| **DF / SOURCE** | [`TECHNOLOGY-RECIPE-CONSUMPTION-01B-DESIGN-FREEZE.md`](TECHNOLOGY-RECIPE-CONSUMPTION-01B-DESIGN-FREEZE.md) · [`TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md`](TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md) |
| **Test** | `scripts/test-technology-recipe-consumption-01b.mjs` |
| **NIE zrobione** | Premium paints · color systems · Purchase/Market prices |

### 2.4 TECHNOLOGY-DECOMPOSITION-01

| | |
|--|--|
| **Commit** | `0884fb06ff7bc461caed8e43957e668e3dbdc1c9` |
| **Cel** | BOQ → 1..N TechUnit · compound tylko przy jawnych tech |
| **Architektura** | `decomposeOfferBoqLine` → TechUnit → bind per unit → merge BOM · provenance `sourceLineId` + `techUnitId` |
| **Decyzje** | „pod malowanie” ≠ PAINTING · N=1 atomic · N>1 tylko explicit |
| **DF** | [`TECHNOLOGY-DECOMPOSITION-01-DESIGN-FREEZE.md`](TECHNOLOGY-DECOMPOSITION-01-DESIGN-FREEZE.md) |
| **Test** | `scripts/test-technology-decomposition-01.mjs` |
| **NIE zrobione** | Recognition gap plaster/unknown · inventing implicit families |

### 2.5 TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01

| | |
|--|--|
| **Commit** | `9ad22fc131b826e7bdae8b429b554e9b6860fd22` |
| **Profile** | `ECONOMY_INTERIOR_PRIMER_V1` |
| **materialKey** | `mat.grunt` (REUSE — no new key) |
| **Factor** | `0.10` L/m² · coats **1** · waste `included_in_factor` |
| **Pack** | `pack.priming.economy_interior_v1` |
| **DF / SOURCE** | [`TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01-DESIGN-FREEZE.md`](TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01-DESIGN-FREEZE.md) · [`TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md`](TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md) |
| **Test** | `scripts/test-technology-recipe-consumption-priming-01.mjs` (**61 PASS**) |
| **NIE zrobione** | Multi-coat priming engine · new `mat.grunt_*` invent |

### 2.6 ECONOMY-ELECTRICAL-CABLE-V1

| | |
|--|--|
| **Commit** | `7b7d27a0b79d2d2e948400980bdb912c9ab08201` |
| **Cel** | Commodity cable identity · qty = BOQ · labor+material coexistence |
| **materialKeys (exact 4)** | `mat.przewod_ydy_3x1_5` · `mat.przewod_ydyzo_3x1_5` · `mat.przewod_ydyzo_3x2_5` · `mat.przewod_ydyzo_5x6` |
| **Qty / waste** | `materialQty = BOQ qty` · factor **1.0** · W1 = 1.00 · **no** waste % |
| **Rules** | YDY ≠ YDYżo · no `mat.przewod_ydy_3x2_5` · no-guess gniazdo/oświetlenie · incomplete → PARAMETER_REQUIRED |
| **DEFER** | HDGs · LgY · LgYżo |
| **OUT** | NHXH · UTP · coax · YTKSY · HtKSH · XzTKMXpw |
| **Pack** | `pack.electrical.cable_economy_v1` |
| **CatalogWork** | Map pairing `cw.product.przewod_*` only · **gap:** full catalog seed objects |
| **DF** | [`ECONOMY-ELECTRICAL-CABLE-V1-DESIGN-FREEZE.md`](ECONOMY-ELECTRICAL-CABLE-V1-DESIGN-FREEZE.md) |
| **Test** | `scripts/test-economy-electrical-cable-v1.mjs` (**11 PASS**) |
| **PV** | **PASS** · version.json `2.66.23` / `7b7d27a` |
| **NIE zrobione** | HDGs keys · PI prices · Purchase · full CatalogWork seeds |

---

## 3. Architectural decisions (LOCKED)

| ID | Rule |
|----|------|
| **A** | **Technology ≠ PI** — Technology = *czego i ile* · PI = *ile kosztuje* |
| **B** | **MARKET ≠ PURCHASE** — nie omijać Purchase → Real Cost |
| **C** | **Jeden BOM SSOT** — REUSE TechnologyPack + recipe + `projectBom` · zakaz drugiego BOM/Recipe SSOT |
| **D** | **Decomposition** — BOQ → TechUnit(s) → Family → Pack → Recipe → partial BOM → merge · compound tylko jawne tech |
| **E** | **Provenance** — `sourceLineId` + `techUnitId` w trailu BOM |
| **F** | **No Guess** — nigdy invent materiału / normy / kabla / grubości / coats / systemu |
| **G** | **Source lifecycle** — SOURCE → NORMALIZE → OWNER APPROVE → VERSION → ACTIVE · DRAFT ≠ production BOM |
| **H** | **Reusable families** — wiele linii BOQ → jedna family/profile/recipe · **NIE** 804 researchów / 804 recipes |

### Canonical flow

```text
BOQ line
  → Technology Decomposition
  → 1..N TechUnit
  → CostItemFamily
  → TechnologyPack (ACTIVE)
  → Recipe
  → partial projectProductionBom
  → merge
  → BOM
  → (later) PI / Purchase / Real Cost / Offer
```

### Rejected approach

```text
REJECTED: research każdej pozycji BOQ osobno → 804 recipes
CORRECT:  BATCH TECHNOLOGY COVERAGE AUDIT → ~10–20 families → SOURCE per family
```

---

## 4. Dataset

| Tender | Client | Prefix |
|--------|--------|--------|
| `08dee178-…` | ZZK | 08dee178 |
| `08deec8a-…` | ZZK | 08deec8a |
| `08dee335-…` | MOPS | 08dee335 |
| `08dee8b8-…` | WM | 08dee8b8 |
| `08dec13d-…` | WM | 08dec13d |

**804** non-noise BOQ lines (triage SSOT: `.tmp-operate-learn-audit/product-labor-triage-report.json` — local, untracked).

### Audit tip map (do not mix)

| Artefakt | Tip | Note |
|----------|-----|------|
| Completeness post-priming | `9ad22fc` | skim_coat=92 was **binding-path inflation** — discard for ranking |
| Next technology source V1 | `9ad22fc` | Winner then = ELECTRICAL → implemented as V1 |
| Owner cable map | `9ad22fc` | Evidence for electrical keys |
| **Next technology source V2** | **`7b7d27a0`** | **Current** · post electrical V1 · SCREED greenfield winner |

Local V2: `.tmp-operate-learn-audit/next-technology-source-audit-v2.{md,json}`

---

## 5. Coverage snapshot (V2 replay @ `7b7d27a0`)

| Metric | Value |
|--------|------:|
| Lines | 804 |
| Tech recognized (≥1 non-unknown) | ~37.9% |
| Recipe BOUND / material output | ~6.3% |
| Electrical V1 mapped BOUND | 5 TechUnits |
| Electrical DEFER (HDGs/LgY) | 5 |
| Electrical OUT | 10 |

### ACTIVE / source-backed packs

- Painting — `ECONOMY_INTERIOR_WHITE_PAINT_V1`
- Priming — `ECONOMY_INTERIOR_PRIMER_V1`
- Electrical cable — `ECONOMY-ELECTRICAL-CABLE-V1`

### Legacy fixture ACTIVE (not economy SOURCE research)

- ETICS — `pack.etics.external_wall`
- Paving — kostka pack

### Major unbound families (examples)

`unknown` · `demolition` · `drywall` · `screed_leveling` · `skim_coat` · `plaster_internal` · `masonry` · residual electrical · `product_supply` · `measurement` · `service_disposal`

---

## 6. Candidates after V2 (not authorized to implement)

| Rank | Candidate | Rec | Note |
|-----:|-----------|-----|------|
| 1 | ELECTRICAL residual | **HOLD** | Extension of V1 (HDGs/LgY) — not greenfield |
| 2 | **SCREED / WYLEWKA** | **SOURCE RESEARCH** | **Greenfield winner** · thickness × TDS |
| 3 | SKIM / GŁADŹ | SOURCE RESEARCH | `mat.gladz_gipsowa` identity exists · no ACTIVE pack |
| 4 | DRYWALL | HOLD | Multi-component SOURCE |
| 5 | PLASTER | HOLD | Recognition gap first |

**SCREED ≠ approved for IMPLEMENT.** Gate = SOURCE RESEARCH first.

Ranking factors (separate from Purchase/Offer/Bid layers):  
`frequency × source quality × deterministic identity × quantity derivation × implementation safety × expected material-output`

Layers **D Purchase / E Real Cost / F Expert Offer / G Bid** must **not** drive the next technology slice.

---

## 7. Owner-approved profiles (summary)

### Painting — `ECONOMY_INTERIOR_WHITE_PAINT_V1`

- Policy B: 12 m²/L  
- 1 coat: 0.083333 L/m² · 2 coats: 0.166667 L/m²  
- `mat.farba_lateksowa_wewnetrzna` · waste included_in_factor  

### Priming — `ECONOMY_INTERIOR_PRIMER_V1`

- 0.10 L/m² · coats 1 · `mat.grunt` · waste included_in_factor  

### Electrical — `ECONOMY-ELECTRICAL-CABLE-V1`

- 4 keys above · qty = BOQ · factor 1.0 · W1  
- YDY ≠ YDYżo · DEFER/OUT as listed  

---

## 8. Protected WIP (never touch in IE slices)

| Path / symbol | Note |
|---------------|------|
| `src/lib/bid-time-load-guard/` | Pre-existing · build may fail on `applyBidTimeLoadGuard` |
| `src/lib/tenders-bid-calculator.ts` | Dirty local WIP — do not stage |
| `src/lib/tender-offer-boq-bid-adapter.ts` | Dirty local WIP — do not stage |
| `useTenderOfferRun` | Protected |
| Payroll / P0 / Market Sync / Purchase writes | Out of IE technology slices |

**If build fails on `applyBidTimeLoadGuard` → report PRE-EXISTING PROTECTED WIP · do not fix in technology slice.**

---

## 9. Workflow (binding)

```text
AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO
  → IMPLEMENT → BUILD → TEST → OWNER VERIFICATION
  → COMMIT → PUSH → PRODUCTION VERIFY → CLOSE
```

- **Never** IMPLEMENT before OWNER GO  
- **Never** COMMIT/PUSH without separate Owner GO  
- **Never** invent S10 / global ON / Bid retirement without Owner GO  

---

## 10. Key code map (read-only orientation)

| Area | Path |
|------|------|
| Decomposition | `src/lib/execution-expert/technology-decomposition.ts` |
| Line binding | `src/lib/execution-expert/technology-line-binding.ts` |
| Electrical V1 identity | `src/lib/execution-expert/electrical-circuit-spec.ts` |
| Packs / recipes | `src/lib/technology-foundation/*` |
| Material map | `src/lib/pricing-expert/material-market-map.ts` |
| Tests | `scripts/test-technology-*.mjs` · `scripts/test-economy-electrical-cable-v1.mjs` |

---

## 11. NEXT

### **BATCH TECHNOLOGY COVERAGE AUDIT**

Cel: przeanalizować **wszystkie 804** linie · pogrupować w Technology Families · wybrać ~**10–20** rodzin o największym bezpiecznym pokryciu · SOURCE research **per family**, nie per line.

**Zakaz teraz:** IMPLEMENT SCREED · invent materialKeys · PI/Purchase writes · commit/push bez GO.

---

## FINAL GATE (this documentation closeout)

| | |
|--|--|
| CODE (this task) | docs only |
| COMMIT | **NOT AUTHORIZED** |
| PUSH | **NOT AUTHORIZED** |
| PRODUCTION | **UNCHANGED** (`7b7d27a0`) |
| DATA MUTATIONS | **NONE** |
