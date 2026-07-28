# COSTORYS-UX-01 WAVE 1 — Implementation Report

> **UI:** **2.65.69** · **DF:** [`COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md`](COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md)  
> **Data:** 2026-07-28 · **Klasa:** UI-only

## Zakres zrealizowany

| Item | Implementacja |
|------|----------------|
| Sticky Offer Summary Bar | `OfferBoqStickySummaryBar.tsx` — rekomendacja · direct · review · filtr |
| Full width Kosztorysy | `tenderDetailContentMaxWidthClass` + `TenderDetailPage` |
| Accordion Szczegóły wyceny | Wiedza · BidImpact · OfferSummary · Readiness · AI Quality — **default closed** |
| Evidence collapsed | `defaultEvidenceExpanded` + toggle w `TenderKosztorysWorkspace` |
| Filtr „Tylko do weryfikacji” | `filterOfferBoqLinesReviewOnly` — bez mutacji dokumentu |

## Pliki

- `src/app/kosztorys/offer-boq-ux-wave1.ts`
- `src/app/kosztorys/OfferBoqStickySummaryBar.tsx`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `src/app/TenderKosztorysWorkspace.tsx`
- `src/app/TenderDetailPage.tsx`
- `scripts/test-costorys-ux-01-wave1.mjs`
- changelog **2.65.69**

## Bez zmian logiki

Bid Proposal · AI Cost engines · OfferBoq model · COST-PIPELINE · parser · CATALOG-BID · Payroll · sync · LS
