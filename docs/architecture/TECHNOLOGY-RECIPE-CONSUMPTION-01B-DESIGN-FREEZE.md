# DESIGN FREEZE — TECHNOLOGY-RECIPE-CONSUMPTION-01B

> **Slice:** ECONOMY INTERIOR WHITE PAINT · first real Technology Recipe (painting)  
> **ID:** `TECHNOLOGY-RECIPE-CONSUMPTION-01B`  
> **Status:** **DESIGN FREEZE OWNER VERIFIED** · **01B IMPLEMENT = DONE (local)** · **COMMIT / PUSH / PROD = NOT AUTHORIZED** · **awaiting OWNER VERIFICATION of IMPLEMENT**  
> **Date:** 2026-08-10  
> **Baseline tip:** UI **2.66.23** / **`a7624b9`** (01A PRODUCTION VERIFIED)  
> **Owner SOURCE:** ECONOMY_INTERIOR_WHITE_PAINT_V1 · **Policy B — CONSERVATIVE** · **OWNER APPROVE = YES**  
> **Source pack:** `docs/architecture/TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md`

```text
OWNER LOCKED FACTORS (V1)
─────────────────────────
coverage (conservative): 12 m²/L
1 coat:  0.083333 L/m²
2 coats: 0.166667 L/m²
wastePolicy: included_in_factor
grunt: OUT OF V1
materialKey: mat.farba_lateksowa_wewnetrzna  (REUSE — no new key)
```

```text
LAYER LOCK
──────────
Technology Recipe = CZEGO I ILE
PI / Purchase / Market = ILE KOSZTUJE
TechnologyPack NEVER contains PLN
MARKET ≠ PURCHASE
```

---

## 1. Architecture

```text
OfferBoq line
  → classifyCostItemFamily → painting
  → resolveCoats(line) ∈ {1, 2} | unresolved→UNBOUND
  → bind TechnologyPack pack.painting.economy_interior_white_v1 @ version
       lifecycle ACTIVE + production provenance
  → select recipe line(s) for coats
  → projectProductionBom
       derivedQty = round6(boqQty × qtyFactor)
  → GeneratedBom.materials[].materialKey = mat.farba_lateksowa_wewnetrzna
  → (downstream, unchanged) PI prices that identity
```

**REUSE:** TechnologyPack · PackMaterialRecipeLine · 01A provenance/lifecycle · LINE-BINDING · `projectProductionBom` / merge.  
**NO** second Recipe/BOM SSOT.

---

## 2. Exact data flow

```text
Example:
  BOQ "Dwukrotne malowanie farbami emulsyjnymi" · 500 m²
  family = painting
  coats = 2
  qtyFactor = 0.166667
  derivedQty = round6(500 × 0.166667) = 83.3335 L
  materialKey = mat.farba_lateksowa_wewnetrzna
  unit = l
```

| Step | Component | Output |
|------|-----------|--------|
| 1 | `classifyCostItemFamily` | `painting` |
| 2 | `resolvePaintCoats` (NEW thin, deterministic) | `1` \| `2` \| null |
| 3 | `familyToPackId` | `pack.painting.economy_interior_white_v1` |
| 4 | `latestActivePack` + `canPackFeedProductionBom` | ACTIVE pack or UNBOUND |
| 5 | Filter materials by `coats` | one material line |
| 6 | `projectProductionBom` | BOM litres |
| 7 | Merge across lines | sum same `materialKey` |

If family ≠ painting or coats null or pack not ACTIVE/feedable → **UNBOUND** · no material invent.

---

## 3. Recipe schema usage

**Pack (conceptual — implement later):**

```text
packId:        pack.painting.economy_interior_white_v1
packVersion:   1.0
definitionId:  def.painting.economy_interior_white
lifecycle:     DRAFT → … → ACTIVE (only after implement + promote)
namePl:        Malowanie wnętrz — economy white V1 (conservative 12 m²/L)
```

**Materials (two lines, same materialKey, distinguished by coats):**

| coats | materialKey | unit | qtyFactor | wastePolicy | provenance |
|-------|-------------|------|-----------|-------------|------------|
| 1 | `mat.farba_lateksowa_wewnetrzna` | `l` | **0.083333** | `included_in_factor` | owner_approved + source ref |
| 2 | `mat.farba_lateksowa_wewnetrzna` | `l` | **0.166667** | `included_in_factor` | owner_approved + source ref |

**Minimal schema addition (required for coats):**

```text
PackMaterialRecipeLine.coats?: 1 | 2
```

- Optional; absent = legacy lines (ETICS/kostka) — treat as always applicable.  
- Painting V1 lines **must** set `coats`.  
- Projection selects lines where `coats === resolvedCoats` OR `coats` undefined (legacy).  
- Same `materialKey` twice is OK when `coats` differs.

**Equipment / labour:** empty in V1 (paint material only).  
**No prices** on pack (TF-1).

---

## 4. Coat representation

| Rule | Behavior |
|------|----------|
| Deterministic parse of BOQ text (fold PL) | `dwukrotne` / `2-krotne` / `2x` → **2** |
| | `jednokrotne` / `1-krotne` / `1x` → **1** |
| Ambiguous / missing | **coats = null → UNBOUND** (no default invent) |
| No thickness / substrate / brand optimizer | OUT |

**Not** a general parametric engine — closed enum `{1,2}` for painting only.

---

## 5. Provenance (01A)

Every painting material line:

```text
factorSourceKind: owner_approved
factorSourceRef:  OWNER://ECONOMY_INTERIOR_WHITE_PAINT_V1@2026-08-10
                 | docs/architecture/TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md
                 | + manufacturer TDS/pages cited therein
factorApprovedAt: <ISO at Owner APPROVE / pack APPROVED transition>
wastePolicy:      included_in_factor
```

Missing provenance → cannot APPROVED/ACTIVE → cannot production BOM.

---

## 6. Lifecycle

```text
DRAFT → REVIEW → APPROVED → ACTIVE
```

| State | Production BOM |
|-------|----------------|
| DRAFT / REVIEW / APPROVED | **NO** |
| ACTIVE + production-ready provenance | **YES** via `projectProductionBom` |

No silent DRAFT→ACTIVE for trusted factors (01A gate). Painting pack uses **trusted path** (APPROVED then ACTIVE).

---

## 7. Versioning

TF-8: immutable `packVersion` · `createNextVersion` for factor changes.  
BOM records `packId@version`.  
Historical analyses keep prior version factors.

---

## 8. Quantity calculation

**Existing SSOT formula (unchanged):**

```text
derivedQty = Number((boqQty × qtyFactor).toFixed(6))
```

(`project-bom.ts` — no new rounding policy.)

| Test | boqQty | coats | qtyFactor | expected derivedQty |
|------|--------|-------|-----------|---------------------|
| T1 | 500 | 1 | 0.083333 | **41.6665** |
| T2 | 500 | 2 | 0.166667 | **83.3335** |
| T3 | 100 | 2 | 0.166667 | **16.6667** |

Internal factors stored as approved decimals **0.083333** / **0.166667** (not recomputed from 12 at runtime in a way that drifts).

---

## 9. BOM merge behavior

Unchanged LINE-BINDING merge:

- Same `materialKey` → sum quantities  
- Unbound / non-painting lines → no paint litres  
- Mixed tender: ETICS + painting → merge ETICS materials + paint litres  

---

## 10. materialKey mapping

| Decision | Value |
|----------|-------|
| Identity | **`mat.farba_lateksowa_wewnetrzna`** |
| Semiotics | Existing S2-C/S4 map: „Farba lateksowa wewnętrzna” / „Farba lateksowa biała” — **fits** economy interior white set |
| New materialKey | **FORBIDDEN** |
| New CatalogWork / alias | **FORBIDDEN** |
| BLOCKER? | **NONE** — reuse approved |

PI remains downstream price resolver for that key.

---

## 11. Source references

| Ref | Role |
|-----|------|
| `TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md` | Owner SOURCE pack · Policy B |
| Manufacturer pages/TDS cited in that pack | Śnieżka Eko · Dekoral EKO BIAŁA · KLASYCZNA BIEL · ŚCIANY I SUFITY |
| Conservative coverage | **12 m²/L** (worst in approved set) |
| 01A | Provenance + lifecycle gates |
| LINE-BINDING-01 | Family `painting` |

---

## 12. Safety

| Guard | Rule |
|-------|------|
| No invented norms | Only Owner-approved 0.083333 / 0.166667 |
| No PLN in pack | TF-1 |
| No MARKET→Offer / Bid / Purchase writes | OUT |
| No grunt / other tech | OUT OF V1 |
| Protected WIP | `bid-time-load-guard/**` · bid adapter/calculator · `useTenderOfferRun` · Payroll/Login/Persist/Q12 · P0/P1 · P3.1/P3.2 · Market Sync · SQL · scrape · LLM/fuzzy |
| applyBidTimeLoadGuard failure | PRE-EXISTING · **DO NOT FIX** |

---

## 13. Regression strategy

| Suite | Expect |
|-------|--------|
| TECHNOLOGY-RECIPE-CONSUMPTION-01A | PASS |
| TECHNOLOGY-LINE-BINDING-01 | PASS (painting may become BOUND when ACTIVE pack seeded in tests) |
| Execution Expert P0 | PASS |
| TF B0 ETICS/kostka | PASS — fixture_legacy unchanged |
| PI S0–S5 / P0/P1/P3 | PASS — no PI code changes |

Painting-only tenders: before ACTIVE pack → UNBOUND; after → BOUND with litres.

---

## 14. Test plan (01B suite)

1. 500 m² + 1 coat → **41.6665** L  
2. 500 m² + 2 coats → **83.3335** L  
3. 100 m² + 2 coats → **16.6667** L  
4. painting without ACTIVE recipe → **UNBOUND**  
5. DRAFT pack → no production BOM  
6. APPROVED without valid provenance → no production BOM  
7. ACTIVE + valid provenance + coats resolved → **BOUND** + litres  
8. ETICS / kostka regression PASS  
9–12. Zero PI / Purchase / Market writes · zero HTTP/SQL/LLM/fuzzy  
13. Ambiguous coats → UNBOUND  
14. No new materialKey / CatalogWork in diff  
15. Bid files untouched  

---

## 15. Exact allowlist (when IMPLEMENT authorized)

| File | Intent |
|------|--------|
| `src/lib/technology-foundation/types.ts` | optional `coats?: 1 \| 2` on material line |
| `src/lib/technology-foundation/fixtures.ts` or new `painting-economy-white-v1.ts` | pack seed DRAFT→test ACTIVE |
| `src/lib/technology-foundation/recipe-provenance.ts` / pack-schema | pass-through `coats` |
| `src/lib/technology-foundation/project-bom.ts` | filter materials by coats **or** thin pre-filter helper |
| `src/lib/execution-expert/cost-item-family.ts` | unchanged family (maybe export coat helper elsewhere) |
| `src/lib/execution-expert/paint-coats.ts` (**NEW thin**) | `resolvePaintCoats` |
| `src/lib/execution-expert/technology-line-binding.ts` | bind painting → pack; pass coats into projection |
| `src/lib/execution-expert/analyze.ts` / `index.ts` | wire if needed |
| `scripts/test-technology-recipe-consumption-01b.mjs` | **NEW** |
| `docs/architecture/TECHNOLOGY-RECIPE-CONSUMPTION-01B-DESIGN-FREEZE.md` | this file |
| Source pack md | status OWNER APPROVED |

Prefer **smallest** diff; avoid unrelated TF churn.

---

## 16. Exact DO NOT TOUCH

```text
bid-time-load-guard/**
tender-offer-boq-bid-adapter*
tenders-bid-calculator*
useTenderOfferRun*
Payroll · Login · Persist · Q12
P0/P1 invoice · P3.1/P3.2 core
Market Sync · SQL Price DB · providers · scrape
mat.grunt / priming ACTIVE recipe
tynk · gładź · wylewka · płytki · GK · electrical
3×1.5 · 3×2.5 · circuitType · thickness
new materialKey · new CatalogWork · new aliases
PI / Purchase / Market / Bid semantics
```

---

## 17. Known limitations

- Conservative set factor — not per-SKU optimizer  
- No primer litres  
- No labour/equipment in V1 pack  
- Ambiguous coats → UNBOUND (may under-derive until BOQ wording clear)  
- Manufacturer “do X m²/L” variability absorbed into Owner Policy B  
- Dual engines: Bid path still independent  

---

## 18. Rollback strategy

1. Do not register pack ACTIVE in prod seed → painting stays UNBOUND (pre-01B behavior).  
2. Or lifecycle ACTIVE → DEPRECATED/ARCHIVED via TF-7.  
3. Revert allowlist commit.  
4. No data migration / no KV recipe store in V1 — code registry only → rollback = code revert.

---

## Owner checklist

- [x] OWNER APPROVE factors Policy B  
- [x] OWNER VERIFICATION of this Design Freeze  
- [x] OWNER GO IMPLEMENT  
- [x] Confirm ambiguous-coats = UNBOUND  
- [x] Confirm materialKey reuse (no BLOCKER)  
- [ ] OWNER VERIFICATION of IMPLEMENT (local)  
- [ ] OWNER GO COMMIT  

---

## FINAL GATE

```text
IMPLEMENT = DONE (local)
COMMIT = NOT AUTHORIZED
PUSH = NOT AUTHORIZED
PRODUCTION = NOT AUTHORIZED

Awaiting: OWNER VERIFICATION of IMPLEMENT
```

**STOP.**
