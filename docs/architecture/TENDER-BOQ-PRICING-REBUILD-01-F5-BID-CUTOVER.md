# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 5 Bid Cutover

> **STATUS:** IMPLEMENTATION COMPLETE  
> **DATA:** 2026-08-12  
> **SSOT:** [`…-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · F4 [`…-F4-BOQ-INTEGRATION.md`](./TENDER-BOQ-PRICING-REBUILD-01-F4-BOQ-INTEGRATION.md)  
> **UI:** **2.66.42**

---

## 1. Scope

Przełączenie źródła `offerBoqDirect` na **Position Cost** (F0–F4), bez zmiany semantyki Bid stack:

```text
OfferBoq lines
  → F4 shadow Position Cost (OUR RATE + BOM + Price Memory SELL)
  → CUTOVER GATE (C-COV-1 / C-AUX-1)
  → TenderBidOfferBoqDirectInput
  → computeTenderBidProposal  (Kp · profit · minMargin UNCHANGED)
  → recommendedBidPln
```

Pliki:

- `src/lib/tender-position-cost/bid-position-cost-cutover.ts` — **nowy**
- `src/lib/tender-offer-boq-bid-adapter.ts` — opt-in `positionCostCutover`
- `src/lib/tender-offer-boq-explainability.ts` — cutover **ON** by default (runtime / explain)
- `src/app/hooks/useTenderPricingAuto.ts` — propagacja flagi
- `scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs`

---

## 2. Old vs New (shadow compare)

| | Legacy | New |
|--|--------|-----|
| Direct | `doc.totals` / `linePricing` aggregates | Position Cost aggregates |
| Labor | legacy providers / company split | OUR RATE only |
| Material | legacy / heurystyka | BOM → materialKey → sell |
| Bid stack | `computeTenderBidProposal` | **ten sam** |

API: `compareLegacyVsPositionCostBid({ bidInput, legacyDirect })` — Δ jawne, bez założenia równości.

---

## 3. Cutover gate

PASS tylko gdy:

- ≥1 linia billable
- każda billable = `positionComplete`
- brak AUXILIARY / equipment / transport
- `totalPositionCostPln > 0`

FAIL → `recommendedBidPln = null` · jawne GAP · **ZERO** legacy fallback w trybie cutover.

---

## 4. Policies (REUSE)

| ID | F5 |
|----|-----|
| C-STALE-1 | blokada STALE (nie wliczaj) |
| C-AUX-1 | equipment/transport → GAP · nie do labor/material |
| C-MODE-1 | `ath_priced` / `catalog` **UNTOUCHED** (F6) |
| C-COV-1 | gate = 100% COMPLETE billable |
| companyPricePln | **ZERO** w new path |
| HTTP / research | **0** |

---

## 5. Production wire

- `computeRuntimeBidFromOfferBoq` / `buildOfferBoqExplainabilityView`: cutover **default ON**
- Testy legacy OfferBoq→Bid: `positionCostCutover: false`
- Bez cutover: `buildOfferBoqBidAdapterPayload` działa jak przed F5 (do F6)

---

## 6. Testy

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs`
