# DESIGN FREEZE — MARKET-MATERIAL-RESEARCH-01 · B1 RUNTIME-WIRE

> **Slice:** Wire Stage B cache-first orchestration into production runtime (enqueue + Owner execute)  
> **ID:** `MARKET-MATERIAL-RESEARCH-01-B1-RUNTIME-WIRE`  
> **Status:** **DESIGN FREEZE COMPLETE** · **IMPLEMENT = NOT AUTHORIZED** · **COMMIT / PUSH / PRODUCTION = NOT AUTHORIZED**  
> **Date:** 2026-08-11  
> **Owner GO DESIGN FREEZE:** **YES** — 2026-08-11  
> **Next gate:** **ARCHITECTURE REVIEW** · potem osobne **OWNER GO IMPLEMENT**

```text
PARENT EPIC
───────────
MARKET-MATERIAL-RESEARCH-01
  Stage A Hard Single-Flight     = PRODUCTION GREEN  (a3c7da0f)
  Stage B orchestration library  = LIBRARY GREEN     (8329997b)
  Stage B runtime wire           = NOT IMPLEMENTED   ← this DF

BASELINE PROD
─────────────
UI tip     = 2.66.24
HEAD/origin = 8329997b
SSOT tip   = docs/AI/09_PRODUCTION_BASELINE.md + version.json
```

```text
SOURCE OF TRUTH FOR THIS DF
───────────────────────────
STAGE B1 RUNTIME-WIRE AUDIT / RCA / PLAN
(immediately preceding session audit — PASS)
Parent DF: MARKET-MATERIAL-RESEARCH-01-DESIGN-FREEZE.md
Source audit: MARKET-MATERIAL-RESEARCH-01-SOURCE-AUDIT.md
```

```text
LAYER LOCK (UNCHANGED)
──────────────────────
Purchase / CK     = ONLY Real Cost source
Market Quotes     = compare / PE / Price Memory ONLY
PRICE-PATH-01     = consumer path — OUT of mutate
BOM / SCREED / PAINTING / DECOMP / Bid / VAT / package = OUT
NO INVENT         → PRICE_GAP
Legal Gate live   = OPEN (blocks live HTTP until PASS)
Stage A lease     = REUSE ONLY — do not rewrite
```

---

## A. Purpose

Zamrozić **architekturę podłączenia** Stage B do istniejącego runtime produkcji tak, aby:

1. Realny przetarg (Chief) **znał needed `materialKey`s** i robił **CACHE-FIRST** enqueue.  
2. Research **nie blokował** wyceny i **nie startował** z React render.  
3. Wykonanie researchu + Owner Accept szło przez **istniejący Expert Workspace**.  
4. Hard Single-Flight = **wyłącznie Stage A**.  
5. STALE ≠ CURRENT na warstwie **demand/research eligibility** — bez zmiany globalnego PE / Real Cost.

**Sukces tego DF ≠ IMPLEMENT.**  
**Sukces DF =** semantyka PHASE 1 / PHASE 2 / STALE / allowlist / testy zamrożone → Architecture Review może dać GO.

---

## B. Current baseline

| Element | Stan |
|---------|------|
| Production UI | **2.66.24** |
| Git tip | **`8329997b`** |
| Stage A Hard SF | **PRODUCTION GREEN** · `a3c7da0f` · Edge claim/release |
| Stage B library | **GREEN** · orchestration + mock + Accept helper · harness 58 PASS |
| Stage B in client bundle | **ABSENT** (tree-shake — brak consumera) |
| Live orchestration path | **NOT EXECUTABLE** |
| SCREED / PAINTING / DECOMP / PRICE-PATH | FROZEN / GREEN |

---

## C. RCA (frozen)

### C.1 Why Stage B is not in the production client bundle

| Hypothesis | Verdict |
|------------|---------|
| A — intentional server-only Stage B | **REJECTED** — Stage B is Vite client lib; demand LS + Accept Quotes are client SSOT; no Stage B Edge worker exists |
| B — missing runtime consumer import | **ACCEPTED** — barrel exports only; no `chief-orchestrator` / `src/app` call to `orchestrateMaterialResearch` → Vite tree-shake |

### C.2 Why the wire exists (product reason — NOT “because bundle empty”)

**Chief T4** is the existing SSOT point where BOM material needs are known after Execution + Pricing + Cost context.

UI is **only** the Phase 2 Owner execution surface.

Do **not** justify B1 as “UI wire because markers missing from bundle.”

### C.3 STALE gap (critical)

Today `collectPriceDemandCandidates` uses roughly:

```text
marketOk = pe.marketPricePln > 0
```

PE (`pricing-expert/analyze-line`) may still expose a **numeric** `marketPricePln` when freshness = **stale** (risk note only — prices are **not** globally nulled).

Therefore **`marketPricePln > 0` MUST NOT mean CURRENT** for research eligibility.

Correction belongs **ONLY** at MARKET-MATERIAL-RESEARCH demand/research eligibility layer (Stage B cache usability / B1 bridge).

**FORBIDDEN in B1:**

- modify global PE semantics  
- globally null stale prices  
- change Real Cost / Purchase semantics  

---

## D. Product principle

```text
WGDOM MUST NOT research all material prices.

Research ONLY materialKeys required by the actual tender BOM
AND ONLY when Price Memory has NO usable CURRENT accepted market price.

CURRENT  → REUSE → ZERO demand execution → ZERO research
STALE    → DEMAND (eligible) → research later (Phase 2)
MISSING  → DEMAND (eligible) → research later (Phase 2)

After Owner Accept:
  materialKey → approved Market Quote → Price Memory CURRENT
  → future tender REUSE

PRIMARY GOAL:
  tenders ↑  →  cache hit rate ↑  →  external research per tender ↓
```

---

## E. PHASE 1 architecture — ENQUEUE

### E.1 Location (FROZEN)

`src/lib/chief-orchestrator/run.ts` — **T4**, after materials + cost context is available  
(same neighborhood as today’s fail-soft `recordPriceDemandsFromExperts`).

### E.2 Purpose flow (FROZEN)

```text
REAL TENDER
  → BOM materialKeys (+ PE lines as secondary key set — existing collect pattern)
  → unique materialKey|region
  → Price Memory / Stage B evaluateMaterialCache
  → CURRENT = REUSE
  → STALE   = DEMAND
  → MISSING = DEMAND
  → STOP
```

### E.3 PHASE 1 MUST (FROZEN)

| Rule | Strength |
|------|----------|
| non-blocking | MUST |
| fail-soft (never break Cost / Offer) | MUST |
| never call provider | MUST |
| never claim research lease | MUST |
| never external HTTP | MUST |
| never wait for research | MUST |
| never create per-line jobs | MUST |
| never run from React render | MUST |
| session / Chief case-run gated | MUST |
| reuse existing demand infrastructure (`kw-price-intelligence-demand`) | MUST |
| `executeResearch = false` (or equivalent enqueue-only path) | MUST |

### E.4 Implementation shape (guidance — not code)

- Prefer thin bridge: enhance demand recording with Stage B cache usability **or** call `orchestrateMaterialResearch({ executeResearch: false })` from T4.  
- Dedicated `market-material-research-wire.ts` **only if** a thin bridge file is actually required to avoid bloating `run.ts` / `demand-record.ts`.  
- Do **not** rewrite Stage B orchestration.

---

## F. PHASE 2 architecture — EXECUTE

### F.1 Location (FROZEN)

Expert Workspace — existing path:

- `CostDetailsPanel.tsx` (demand list / CTA / Memory reuse)  
- `DemandPriceResearchPanel.tsx` (candidate → Owner Accept)

### F.2 Flow (FROZEN)

```text
active MARKET demand
  → cooldown check
  → Stage A lease claim (Hard SF)
  → mock provider (current Stage B — Legal Gate OPEN)
  → CANDIDATE
  → Owner Accept
  → commitMarketQuotesImport
  → history / Price Memory CURRENT
  → next Chief run = REUSE
```

### F.3 PHASE 2 MUST NOT (FROZEN)

| Ban | Strength |
|-----|----------|
| run on tender render | ABSOLUTE |
| run on every page refresh | ABSOLUTE |
| run once per BOQ line | ABSOLUTE |
| auto-accept | ABSOLUTE |
| create second lock | ABSOLUTE |
| `navigator.locks` | ABSOLUTE |
| in-memory single-flight as Hard SF | ABSOLUTE |
| LWW as locking mechanism | ABSOLUTE |
| continuous polling | ABSOLUTE |
| live Leroy / Castorama / OBI HTTP | ABSOLUTE (until Legal PASS + Owner GO) |

### F.4 Trigger (FROZEN)

- **Allowed:** explicit Owner CTA (“Znajdź cenę” / open research) · optional future background worker (separate GO).  
- **Forbidden:** `useEffect` on mount · list virtualization · per-line effects.

---

## G. Runtime consumer

| Role | Consumer | Rationale |
|------|----------|-----------|
| **PRIMARY PHASE 1** | Chief orchestrator T4 | Existing SSOT where BOM needs are known |
| **PRIMARY PHASE 2** | Expert Workspace Cost / Demand research panels | Existing Owner Accept surface |
| Lease | Client adapter → Stage A Edge API | No new lock |
| **NOT** | Tenders hub list render | Violates no-render-research |
| **NOT** | New Edge research engine | Out of scope |
| **NOT** | Purchase / Bid / PRICE-PATH mutate | Market ≠ Real Cost |

---

## H. Cache semantics (FROZEN)

| Usability | Demand | Research | Lease | Provider |
|-----------|--------|----------|-------|----------|
| **CURRENT** | no | no | no | no — **REUSE** |
| **STALE** | eligible | later (Phase 2) | Phase 2 only | Phase 2 only |
| **MISSING** | eligible | later (Phase 2) | Phase 2 only | Phase 2 only |

Source of usability: Stage B `evaluateMaterialCache` / `lookupPriceMemory` freshness UX (`fresh`/`usable` → CURRENT · `stale` → STALE · miss → MISSING).  
Do not invent a parallel freshness engine.

---

## I. STALE semantics (FROZEN — critical)

```text
PE may still expose numeric marketPricePln when freshness = stale.

THEREFORE:
  marketPricePln > 0  MUST NOT mean CURRENT
  for MARKET-MATERIAL-RESEARCH eligibility.

Research eligibility MUST use:

  freshness usable as CURRENT (ok / fresh|usable Memory)
      → CURRENT / REUSE

  freshness === stale
      → STALE / DEMAND

  no usable Memory / no accepted quote
      → MISSING / DEMAND
```

| Action | Allowed in B1? |
|--------|----------------|
| Eligibility correction at demand/research layer | **YES** |
| Change global PE averaging / risk notes | **NO** |
| Globally null stale `marketPricePln` | **NO** |
| Change Real Cost / Purchase | **NO** |

**Regression lock:** B1-T4 — STALE paint **with** numeric PE price → demand **MUST** be created.

---

## J. Dedup (FROZEN)

**Canonical key:** `materialKey|region`

| Case | Result |
|------|--------|
| 20 BOQ lines · same `mat.farba_lateksowa_wewnetrzna` | **1** need |
| N users · same key+region | same `researchJobId` → Stage A → **1** ACTIVE job |
| Two different keys | two independent needs/jobs |

Order: **DEDUP before demand / claim / provider.**

---

## K. Hard Single-Flight (FROZEN)

Reuse **ONLY** Stage A:

```text
MaterialResearchLeasePort
  → claimResearchJobLease / releaseResearchJobLease
  → POST /make-server-0afb8820/research-job-claim
  → POST /make-server-0afb8820/research-job-release
```

| Item | Decision |
|------|----------|
| New Edge endpoint | **NO** |
| New distributed lock | **NO** |
| Rewrite Stage A | **NO** |
| Client HTTP adapter to existing API | **YES** if Phase 2 needs it |

---

## L. Owner Accept (FROZEN)

```text
Provider output     = CANDIDATE
Candidate           ≠ approved price database row
AUTO ACCEPT         = FORBIDDEN
Owner Accept        = existing accept path
                    → commitMarketQuotesImport
                    → history ring
                    → Price Memory CURRENT
Purchase            = separate Real Cost source
Market              ≠ Real Cost
```

Reuse: `acceptManualMarketPriceResearch` / Stage B `acceptMaterialResearchCandidate`.  
Mock provenance (`mock_test` / TEST marker) must never silently become trusted without Owner Accept.

---

## M. Load protection (FROZEN)

| Control | Value |
|---------|-------|
| `MMR_MAX_ACTIVE_CLAIMS_PER_PASS` | **8** |
| Order | DEDUP → CACHE → DEMAND → COOLDOWN → CLAIM → provider |
| Per-line → provider | **FORBIDDEN** |
| Per-line → HTTP | **FORBIDDEN** |
| Unbounded `Promise.all` | **FORBIDDEN** |
| Polling loops | **FORBIDDEN** |
| Full market crawl | **FORBIDDEN** |
| Research materials not required by tender | **FORBIDDEN** |

Cooldown cooldown: prefer ephemeral / session / demand-adjacent field — **no new DATA_KEY** without STOP + Owner amend.

---

## N. Data flow (FROZEN)

```text
materialKey (BOM)
  → Price Memory lookup (L1)
  → Stage B usability CURRENT|STALE|MISSING
  → demand registry (existing kw-price-intelligence-demand)   [Phase 1]
  → cooldown
  → Stage A lease                                              [Phase 2]
  → provider (mock in B1)
  → CANDIDATE
  → Owner Accept
  → commitMarketQuotesImport
  → marketQuoteHistory archive
  → Price Memory CURRENT
  → next Chief T4 → REUSE
```

No second pricing DB · no SQL migration · no dual demand store.

---

## O. Real ZZK example (frozen regression target)

| Field | Value |
|-------|-------|
| Tender | ZZK-NZ/241/3408/72/26 |
| ID | `08dee178-1010-dbe7-ebd1-650001a84a9f` |
| BOQ | 80 lines · 12 lokali (context) |

**Required material keys (identity for research):**

| materialKey | Known BOM qty (Real Cost path) |
|-------------|-------------------------------|
| `mat.grunt` | 17.589 L |
| `mat.farba_lateksowa_wewnetrzna` | 26.591719 L |
| `mat.jastrych_cementowy` | 417.6 kg |

```text
IMPORTANT (FROZEN)
──────────────────
Quantities are NOT research quantities.
Research resolves unit-price identity / provenance / Accept.
Qty remains existing BOM / Cost / Purchase path.
PHASE 1 unique needs for this tender ≤ 3 (not 80).
```

---

## P. Allowlist — B1 IMPLEMENT input (FROZEN · minimal)

| # | Path | Role |
|---|------|------|
| 1 | `src/lib/chief-orchestrator/run.ts` | PHASE 1 T4 enqueue hook |
| 2 | existing demand bridge **or** `src/lib/price-intelligence/market-material-research-wire.ts` | Thin bridge **only if required** |
| 3 | existing Stage B `market-material-research-*.ts` | **REUSE** — do not rewrite |
| 4 | small client Edge lease adapter | PHASE 2 → Stage A API **only if required** |
| 5 | `CostDetailsPanel.tsx` · `DemandPriceResearchPanel.tsx` | PHASE 2 Owner surface |
| 6 | new B1 test harness (`scripts/test-…-b1…mjs`) | Contract B1-T1…T12 |

**Do not expand allowlist speculatively.**  
Required file outside boundary → **STOP** → Owner / Architecture review.

---

## Q. OUT of scope (FROZEN)

- SCREED · PAINTING · DECOMP  
- PRICE-PATH semantics  
- Purchase engine · Bid bridge · `bid-time-load-guard`  
- `kv_store.tsx` · `kv-mset-chunk.ts`  
- Stage A lease **implementation** (reuse only)  
- new Edge research engine · new DATA_KEY · SQL migration  
- new pricing engine · new recipe  
- package conversion · VAT · waste correction  
- live Leroy / Castorama / OBI HTTP · scraping  
- automatic price invention / AUTO ACCEPT  

---

## R. Test contract (FROZEN)

| ID | Assertion |
|----|-----------|
| **B1-T1** | ZZK-like BOM · 3 keys → ≤3 unique demand candidates |
| **B1-T2** | 20 repeated paint lines → exactly 1 need |
| **B1-T3** | CURRENT paint → 0 demand · 0 research |
| **B1-T4** | STALE paint **with numeric PE price** → demand **MUST** be created (**critical**) |
| **B1-T5** | MISSING paint → demand |
| **B1-T6** | PHASE 1 → provider calls = 0 · lease claims = 0 |
| **B1-T7** | 10 Phase 2 claimants → exactly 1 ACTIVE lease |
| **B1-T8** | candidate without Owner Accept → no approved Quotes mutation |
| **B1-T9** | Owner Accept → Quotes persisted · Memory CURRENT |
| **B1-T10** | next Chief run → REUSE · no second research |
| **B1-T11** | `MMR_MAX_ACTIVE_CLAIMS_PER_PASS = 8` |
| **B1-T12** | SCREED 18 · PAINTING 50 · DECOMP 69 · PRICE-PATH 78 · Stage B 58 · Hard SF 33 |

Do not weaken B1-T4 to “PE already has a number ⇒ skip demand.”

---

## S. Blast radius

| Area | Risk | Mitigation |
|------|------|------------|
| Chief T4 | Low | fail-soft try/catch (existing demand pattern) |
| More STALE demands vs today | Medium (UX volume) | eligibility-only; Real Cost unchanged |
| Expert UI Phase 2 | Low | extend existing panels |
| Edge | None | Stage A unchanged |
| Bundle size | Low | Stage B enters only after real import |

---

## T. Rollback / safety

| Layer | Rollback |
|-------|----------|
| PHASE 1 flag / early return | Demand path reverts to pre-B1 collect (document in IMPLEMENT) |
| PHASE 2 | Owner simply does not open research / Accept |
| Quotes | existing commit/history; no auto writes |
| Lease | Stage A release / expiry |
| Hard fail | Cost/Offer must continue (PRICE_GAP OK) |

Safety invariants after any partial deploy:

```text
EXTERNAL HTTP (shops) = ZERO
AUTO ACCEPT           = NO
PRICE INVENT          = ZERO
MARKET ≠ REAL COST
SCREED / PAINTING / DECOMP / PRICE-PATH = UNCHANGED
```

---

## U. Next gate

```text
1. ARCHITECTURE REVIEW (this DF)
2. OWNER GO IMPLEMENT B1   — only after AR PASS
3. COMMIT / PUSH / PV      — separate Owner GO each
4. Live shop providers     — Legal PASS + separate epic/GO
```

**IMPLEMENT without this DF GO = FORBIDDEN.**

---

## DF readiness checklist

| Criterion | Status |
|-----------|--------|
| PHASE 1 = Chief T4 enqueue-only | **PASS** |
| PHASE 2 = Expert Workspace Owner execute | **PASS** |
| Wire reason = SSOT T4 (not empty bundle) | **PASS** |
| STALE ≠ marketPricePln>0 CURRENT | **PASS** |
| Cache-first CURRENT/STALE/MISSING | **PASS** |
| Dedup `materialKey|region` | **PASS** |
| Hard SF = Stage A only | **PASS** |
| No new Edge / DATA_KEY / SQL | **PASS** |
| Owner Accept only · AUTO ACCEPT forbidden | **PASS** |
| Load order + max claims = 8 | **PASS** |
| ZZK 08dee178 regression target | **PASS** |
| Allowlist minimal | **PASS** |
| OUT of scope locked | **PASS** |
| Test contract B1-T1…T12 | **PASS** |
| No implementation in this gate | **PASS** |

**DESIGN FREEZE STATUS: PASS**

---

## Final state (this gate)

```text
MARKET-MATERIAL-RESEARCH-01
B1 RUNTIME-WIRE DESIGN FREEZE COMPLETE

CODE = ZERO
TESTS = ZERO
COMMIT = NONE
PUSH = NONE
PRODUCTION = UNCHANGED
EXTERNAL HTTP = ZERO
SCRAPING = ZERO
INVENT = ZERO
PRICE MUTATION = ZERO

SCREED = FROZEN
PAINTING = GREEN
DECOMP = GREEN
PRICE-PATH = GREEN
STAGE A = PRODUCTION GREEN
STAGE B = LIBRARY GREEN
STAGE B RUNTIME WIRE = DF FROZEN · IMPLEMENT NOT AUTHORIZED

WAITING FOR ARCHITECTURE REVIEW
```
