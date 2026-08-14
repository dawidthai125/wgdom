# DESIGN FREEZE — WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01

> **Epic:** `WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01`  
> **Parent research:** `WORK-RATE-RESEARCH-KNR-EVIDENCE-01` (audit) · Discovery INFRA `WORK-RATE-RESEARCH-DISCOVERY-01`  
> **Stage:** **DESIGN FREEZE**  
> **Status:** **IMPLEMENTATION COMPLETE (local)** · ARCH REVIEW PASS · Owner GO IMPLEMENT **2026-08-14**  
> **Production tip (baseline before this local):** **2.66.46** / **`9af17249`**  
> **Local changelog tip:** **2.66.47** (undeployed until COMMIT+PUSH)  
> **Next stage:** wait **OWNER GO: COMMIT**  
> **SOURCE GAP:** **OPEN** until live Candidate + Owner Accept + PV

```text
DESIGN FREEZE          = THIS FILE
ARCH REVIEW            = PASS (2026-08-14)
SCOPE                  = Labor Range → Market Base → WGDOM Margin → OUR RATE
                       + KB bruzdy alias / national / provenance
NICHE COVERAGE         = NOT CLAIMED
SOURCE GAP             = OPEN
CANDIDATE              = BLOCKED until implement + evidence policy proven
NEXT                   = OWNER GO: IMPLEMENT (separate)
IMPLEMENTATION         = ZERO until Owner GO IMPLEMENT
```
---

## LOCK ACKNOWLEDGEMENT

```text
OWNER GO: LABOR MARGIN MODEL DESIGN UPDATE — ACCEPTED
SSOT: this file
Date: 2026-08-14
ZERO CODE · ZERO KV · ZERO ACCEPT · ZERO CANDIDATE · ZERO OUR RATE WRITE
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 1. Owner policy (supersedes prior range REJECT)

### 1.1 Previous (superseded)

Range alone → reject Candidate.

### 1.2 New Owner policy

For a **labor-only** research source that publishes a range:

```text
sourceMinPln … sourceMaxPln
```

the range is **valid source evidence** (not automatic GAP).

**Default market base (deterministic):**

```text
marketBaseRatePln = (sourceMinPln + sourceMaxPln) / 2
```

Example KB 15–25 → `marketBaseRatePln = 20`.

This is an **explicit, documented, testable transformation** of a source-provided range — **not** inventing a price from nothing.

### 1.3 WGDOM margin → proposed OUR RATE

```text
ourRatePln = marketBaseRatePln * (1 + wgdomMarginPct / 100)
```

Example: base 20 · margin 20% → **24 PLN/mb**.  
Owner changes margin to 30% → **26 PLN/mb** — **source observation unchanged**.

### 1.4 Three values — never conflate

| Layer | Field | Meaning |
|-------|--------|---------|
| 1. SOURCE RANGE | `sourceMinPln`, `sourceMaxPln` | Raw evidence from host |
| 2. MARKET BASE | `marketBaseRatePln` | Deterministic transform (midpoint or point) |
| 3. WGDOM OUR RATE | `ourRatePln` / `ourWorkRate.ourRatePln` | After Owner margin + **Owner Accept** |

```text
marketBaseRatePln  ≠  ourWorkRate.ourRatePln
companyPricePln    ≠  marketBaseRatePln
companyPricePln    ≠  OUR RATE
```

---

## 2. Labor Range → Market Base → WGDOM Margin → OUR RATE

```text
labor-only source (point OR range)
  → parse provenance (min/max or point)
  → marketBaseRatePln
       point:        = sourceRatePln
       range:        = (sourceMinPln + sourceMaxPln) / 2
  → [multi-obs: existing region preference + median of marketBaseRatePln]
  → proposedOurRatePln = marketBaseRatePln * (1 + wgdomMarginPct / 100)
  → Expert RO (no write / no accept)
  → OWNER REVIEW
  → acceptWorkRateResearchCandidate (existing boundary)
  → ourWorkRate.ourRatePln
```

**Multi-observation (ARCH REVIEW LOCKED):**  
Apply midpoint **per** ranged observation → existing **median** over qualified `marketBaseRatePln` (region chain WROCLAW → DOLNY_SLASK → POLSKA) → **then** margin **once** on the representative market base.  
Margin **before** median = **FORBIDDEN** (would fold commercial policy into research evidence).

**lowSample:** existing `sampleSize < 3` → `lowSample: true` (unchanged semantics).  
**n=1** remains eligible for Candidate under current median; must surface `lowSample: true` honestly.

### ARCH REVIEW — layer separation (LOCKED)

```text
marketBaseRatePln  = A) research-derived evidence value
proposed/ourRatePln = B) commercial / Owner-derived value
```

Do **not** collapse both into a single undifferentiated “research rate”.  
Today’s `suggestedRatePln = median` (pre-margin) must become:  
`marketBaseRatePln` (median) + `proposedOurRatePln` (after margin) — Accept writes **B**, not raw A alone.

---

## 3. Exact formulas

```text
# Range → market base
marketBaseRatePln = round2( (sourceMinPln + sourceMaxPln) / 2 )

# Point → market base
marketBaseRatePln = round2( sourceRatePln )

# Margin → proposed OUR RATE (parity with materials)
proposedOurRatePln = roundMarketPricePln(
  marketBaseRatePln * (1 + wgdomMarginPct / 100)
)

# After Owner Accept only:
ourWorkRate.ourRatePln = proposedOurRatePln   # (or Owner-edited accepted value — Accept gate)
```

Rounding: **REUSE** existing `roundMarketPricePln` / work-rate `roundRatePln` (ARCH REVIEW: pick one SSOT — prefer material catalog rounding for parity).

---

## 4. Provenance (required evidence fields)

Evidence / Candidate payload **must** retain:

```text
sourceMinPln
sourceMaxPln
marketBaseRatePln
wgdomMarginPct
ourRatePln                 # proposed until Accept; then persisted OUR RATE
sourceId
sourceUrl
observedAt
unit
regionScope                # NATIONAL → POLSKA (see §6)
discoveryMethod
identityMatch
sampleSize
lowSample
```

Optional / recommended:

```text
identityMatchedAs          # e.g. synonym "szpachlowanie bruzd po kablach"
canonicalConcept           # "zaprawianie bruzd"
priceKind                  # "range" | "point"
vatNote                    # e.g. VAT 8% included (KB)
```

---

## 5. Material catalog parity + REUSE FIRST

### 5.1 Existing material margin (AUDIT)

| Item | Location |
|------|----------|
| **Storage** | `CatalogWork.commercialPricing?: CommercialPricing` · `src/lib/work-catalog/types.ts` |
| **Shape** | `{ marginPct, updatedAt, source: "default" \| "owner" }` |
| **Resolve** | `resolveMarginPct(work)` → `commercialPricing.marginPct` or `null` (UNSET) |
| **Sell calc** | `computeSellPricePln(basePrice, marginPct)` = `base * (1 + margin/100)` · `src/lib/price-intelligence/our-price-catalog.ts` |
| **Global floor** | `applyGlobalMarginFloor` / `applyGlobalCommercialMarginFloorToStore` — **MAX(existing, global)** |
| **Patch** | `patchWorkCommercialPricing(store, workId, marginPct, …)` |
| **UI** | `OurPriceCatalogPanel.tsx` — **Cena bazowa · Marża WGDOM · Cena z marżą · Minimalna marża** |
| **Epic** | PRICE-MEMORY-CATALOG-01 **CLOSED** |
| **≠ Bid** | `TenderCompanyCostModel.minMarginPct` / `profitPct` — **NOT** commercial margin |

Material semantics today:

```text
Price Memory base
  + commercialPricing.marginPct
  = sellPrice (Cena z marżą)
```

Labor target semantics (Owner):

```text
marketBaseRatePln
  + wgdomMarginPct
  = proposed / accepted ourRatePln
```

### 5.2 Recommendation — REUSE vs new config (**ARCH REVIEW LOCKED**)

| Option | Verdict |
|--------|---------|
| **REUSE formula** `computeSellPricePln` / identical `(1 + m/100)` | **REQUIRED · PASS** |
| **REUSE UI pattern** base / margin / with-margin / global min MAX | **REQUIRED · PASS** |
| **REUSE `commercialPricing.marginPct` storage** | **APPROVED** — one Owner WGDOM commercial % per `CatalogWork` for market-base→WGDOM price (labor proposed OUR RATE **and** material sell when that work has PM) |
| **Separate `laborCommercialPricing` / duplicate margin engine** | **NOT REQUIRED** now · **FORBIDDEN** as second formula |
| **Reuse Bid `minMarginPct` / Offer Expert margin** | **FORBIDDEN** |
| **Separate labor % slot later** | Only if product proves labor vs material need **different** % on the **same** `workId` — same formula, additive config; **not** this IMPLEMENT |

**Note:** `patchOurWorkRateInStore` already refuses to mutate `commercialPricing`. Accept writes `ourWorkRate.ourRatePln` (layer B). Margin % remains independently editable; changing % does **not** rewrite historical SOURCE observations.

---

## 6. National / region policy (KB)

| Rule | Policy |
|------|--------|
| KB row (no city table) | `regionScope = POLSKA` (NATIONAL) |
| NATIONAL valid for Wrocław costing | **YES** (Owner decision) |
| Relabel NATIONAL → WROCLAW | **FORBIDDEN** |
| Current code smell | `regionFromSourceUrl` hardcodes `kb_pl` → `WROCLAW` — **semantic mismatch** for national URLs; fix only after IMPLEMENT GO |

Region preference chain for multi-obs median **unchanged** in this DF (document only): WROCLAW → DOLNY_SLASK → POLSKA.  
A lone POLSKA observation is valid evidence; do not invent Wrocław rate.

---

## 7. KB bruzdy control (state)

| Item | Value |
|------|--------|
| Source | KB.pl |
| URL | `https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/` |
| Row | Szpachlowanie bruzd po kablach |
| Section | Naprawa ubytków w ścianie **(tylko robocizna)** |
| Range | **15–25 PLN/mb** |
| Update | 07.01.2026 |
| VAT | 8% (individual) |
| Alias (Owner-approved, **not implemented**) | `szpachlowanie bruzd po kablach` → concept `zaprawianie bruzd` |
| Optional alias | `szpachlowanie bruzd` — **NOT approved** yet |
| Forbidden aliases | kucie · bruzdowanie · wycinanie · folia |
| Target workId | `cc-p0c-w1-zaprawianie-bruzd` |
| KNR exact 1012-03 | **NO width claim** from KB |
| marketBase (derivable) | **20 PLN/mb** |
| proposed OUR RATE @ 20% | **24 PLN/mb** (only after margin config + Accept path) |

### Updated KB state matrix

| Field | Status |
|-------|--------|
| IDENTITY_SOURCE | **PARTIAL** |
| LABOR_PRICE_SOURCE | **YES** (range 15–25 labor-only) |
| REGION | **NATIONAL / VALID** (`POLSKA`) |
| WIDTH | **PARTIAL** (no exact 1012-03) |
| MATCHER | **BLOCKED** until alias implement |
| MARKET_BASE_RATE | **DERIVABLE** = 20 |
| WGDOM_MARGIN | **CONFIGURABLE** (design) · **not wired** |
| PROPOSED_OUR_RATE | **DERIVABLE** only after Owner margin |
| CANDIDATE | **BLOCKED** until implement + evidence policy |
| SOURCE_GAP | **OPEN** |

---

## 8. Owner Accept boundary

```text
Research → Evidence → marketBaseRate → margin → proposed OUR RATE
  → Expert RO (expertMayWrite=false · expertMayAccept=false · aiAutoAccept=false)
  → OWNER REVIEW
  → existing acceptWorkRateResearchCandidate
  → ourWorkRate
```

Only **Owner Accept** writes `ourWorkRate.ourRatePln`.

---

## 9. Anti-invent

| Allowed | Forbidden |
|---------|-----------|
| 15–25 source → 20 market base → margin → 24 proposed → Owner Accept | No source → invented 20 |
| Deterministic midpoint of **source-provided** range | Manual invented range → marketBase |
| Owner-configured margin change without mutating source | `companyPrice` → marketBase / OUR RATE |
| | AI-generated rate → OUR RATE |
| | Auto-Accept / Expert write |

---

## 10. Explicit NON-GOALS / LOCKS (this stage)

**Do NOT modify yet:**

- F5 · mapper · AMBIGUOUS  
- qualify · median · Accept **implementation**  
- companyPrice · Price Memory · MMR · Chief Experts  
- existing material pricing engine (only REUSE)

**Do NOT implement yet:** labor margin engine · alias wire · PASS2 URL · region hardcode fix · Candidate creation · KV · OUR RATE write

---

## 11. Remaining blockers (before / during IMPLEMENT)

1. ~~ARCH REVIEW~~ → **PASS** (2026-08-14).  
2. Owner GO **IMPLEMENT** (separate — required).  
3. Alias wire: only `szpachlowanie bruzd po kablach`.  
4. Fetch path to KB national page (PASS1 miss / PASS2 allowlist — no new host).  
5. Range provenance + midpoint transform + tests (not invent).  
6. Candidate payload: `marketBaseRatePln` + `wgdomMarginPct` + `proposedOurRatePln`; Accept consumes **proposed**.  
7. REUSE `computeSellPricePln` / `resolveMarginPct` / `commercialPricing.marginPct` (+ global MAX floor).  
8. Region: national KB URLs → `POLSKA` (fix `kb_pl`→WROCLAW mislabel).  
9. lowSample honesty for n=1.  
10. PV before any claim that niche SOURCE GAP is closed.

## 11b. ARCH REVIEW summary (2026-08-14)

| ID | Verdict |
|----|---------|
| AR-01…AR-12 | **PASS** (see Owner ARCH REVIEW output) |
| REUSE-FIRST | Formula + `commercialPricing.marginPct` **REUSE** · no second engine · no Bid margin |
| Separate labor margin slot | **NOT REQUIRED** unless future dual-use work needs different % (document only) |
| NEXT | **OWNER GO: IMPLEMENT** · **DO NOT auto-implement** |
---

## 12. Implementation boundary (FUTURE — not now)

**In scope after GO IMPLEMENT (expected):**

- Synonym match-only  
- Range → `marketBaseRatePln` + provenance  
- REUSE `computeSellPricePln` + Owner margin config  
- Candidate shows base / margin / proposed OUR RATE  
- Accept still Owner-only  

**Out of scope unless new GO:**

- F5 / mapper / qualify formula fork / median replace  
- Bid margin sync · companyPrice bridge · invent fixtures  

---

## 13. Confirmation

```text
ZERO CODE
ZERO KV
ZERO ACCEPT
ZERO CANDIDATE
ZERO OUR RATE WRITE
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
SOURCE GAP = OPEN
ARCH REVIEW = PASS
NEXT STAGE = OWNER GO: IMPLEMENT (wait)
```
