# COST-PIPELINE-01 — Implementation Report

> **STATUS:** IMPLEMENT COMPLETE (pre-push)  
> **Data:** 2026-07-28  
> **DF:** [`COST-PIPELINE-01-DESIGN-FREEZE.md`](COST-PIPELINE-01-DESIGN-FREEZE.md)  
> **UI:** **2.65.66**

## Zakres (IN)

| # | Done |
|---|------|
| M1 Shared `buildOfferBoqDocumentForPipelineItem` + `computeRuntimeBidFromOfferBoq` | ✓ |
| M2 `useTenderPricingAuto` → OfferBoq → Bid (S6) gdy flaga ON | ✓ |
| M3 CTA → `#offer-boq-primary` · layout OfferBoq primary · ATH Evidence | ✓ |
| M4 Testy + build + changelog | ✓ |
| R0 `kw-cost-pipeline-01=0` | ✓ |

## Pliki

- `src/lib/tenders-v4-config.ts` — flaga COST-PIPELINE-01
- `src/lib/tender-offer-boq-explainability.ts` — extract + runtime Bid + parity profile days
- `src/app/hooks/useTenderPricingAuto.ts` — wire L1→L2
- `src/app/TenderDetailPage.tsx` — focusOfferBoq
- `src/app/TenderKosztorysWorkspace.tsx` — primary/secondary layout
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` — copy „Kosztorys ofertowy”
- `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` — CTA label
- `scripts/test-cost-pipeline-01-wire.mjs`
- `src/app/changelog-data.ts` · `CHANGELOG.md`

## OUT (nietknięte)

PDF · XLS · eksport · AI-COST rewrite · parser · Foundation · Edge · Decision · TRE-03 · Payroll/sync
