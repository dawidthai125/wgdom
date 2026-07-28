# COST-REGRESSION-01 EPIC A — IMPLEMENTATION REPORT

> **UI:** 2.65.71  
> **Data:** 2026-07-28  
> **DF:** [`COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md`](COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md)

## Zakres

| Deliverable | Status |
|-------------|--------|
| Pure `isCostRegressionF2` / `isCostRegressionF1` | DONE — `src/lib/cost-regression-f2.ts` |
| Discovery enum + macierz copy | DONE |
| Outcome / Offer Run presentation F2 | DONE — `tender-offer-run.ts` + Outcome UI |
| Sticky / empty Kosztorysy F2 | DONE |
| CTA Dokumenty + Ponów (reuse heavy) | DONE — guard `triggerCostRegressionF2Reparse` |
| Testy AC | DONE — `scripts/test-cost-regression-01-epic-a.mjs` |

## Poza zakresem (nietknięte)

- `tenders-bid-calculator.ts` (F1–F4)
- `useTenderPricingAuto` resolve / COST-PIPELINE
- AI Cost / OfferBoq engines
- Payroll / Cloud Sync merge
- Epic B PDF recovery

## AC

| ID | Werdykt |
|----|---------|
| AC-A1 | PASS (test) |
| AC-A2 | PASS (copy + CTA attach) |
| AC-A3 | PASS (reparse CTA + trigger) |
| AC-A4 | PASS (parse_running copy + CTA none) |
| AC-A5 | PASS (parse_failed copy) |
| AC-A6 | PASS by design (reuse heavy → existing snapshot/hook; bez nowego Bid) |
| AC-A7 | PASS (guard !F2 → no retry) |
| AC-A8 | PASS (F1 fixture ≠ „Brak przedmiaru w dokumentach”) |
| AC-A9 | PASS (diff bez Bid / pricing auto / COST-PIPELINE) |
| AC-A10 | PASS (build + test) |
| AC-A11 | PASS (guard) |

## Pliki

- `src/lib/cost-regression-f2.ts` (new)
- `src/lib/tender-offer-run.ts`
- `src/lib/tender-recommendation-result.ts`
- `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx`
- `src/app/TenderDetailPage.tsx`
- `src/app/TenderKosztorysWorkspace.tsx`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `src/app/kosztorys/OfferBoqStickySummaryBar.tsx`
- `scripts/test-cost-regression-01-epic-a.mjs` (new)
- `scripts/test-tre-01-offer-run.mjs` (R5 fixture F1)
- `src/app/changelog-data.ts` · `CHANGELOG.md`
