# COST-PIPELINE-01 — Test Report

> **Data:** 2026-07-28 · UI **2.65.66**

| Suite | Wynik |
|-------|--------|
| `scripts/test-cost-pipeline-01-wire.mjs` | **PASS** (CP1–CP7) |
| `scripts/test-tre-02-hotfix-01-offer-run-terminal.mjs` | **PASS** 17/17 |
| `scripts/test-tre-01-offer-run.mjs` | **PASS** 30/30 |
| `scripts/test-tre-02-outcome-default.mjs` | **PASS** 6/6 |
| `scripts/test-cost-s6-bid-proposal-integration.mjs` | **PASS** |

### AC mapowanie

| AC | Dowód |
|----|--------|
| Outcome ≡ OfferBoq Bid | CP4 — `recommendedBidPln` runtime === explainability |
| CTA → OfferBoq nie ATH | CP7 + `#offer-boq-primary` + layout L1 first |
| Bid nie liczy kosztorysu 2× | CP5 — `pricingMode=offer_boq_ai` ≠ catalog |
| ATH = Evidence | `data-cost-pipeline-evidence-l0` secondary |
| TRE regresja | TRE-01/02/HOTFIX PASS |
