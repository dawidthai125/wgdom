# COST-REGRESSION-02 — DISCOVERY-ZIP IMPLEMENTATION REPORT

> **UI:** 2.65.72  
> **Data:** 2026-07-28  
> **DF:** [`COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md`](COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md)  
> **Wariant:** **D** (Discovery + UX)

## Zakres (allowlist)

| Deliverable | Status |
|-------------|--------|
| `archive_candidate` (top-level `.zip`/`.7z`) | DONE — `isArchiveCandidateFilename` · `hasArchiveCandidate` |
| Rozszerzenie `hasPrzedmiarCandidate` | DONE — OR archive |
| Priorytet discovery §3.2 (heavyDone → `parse_failed`) | DONE |
| Macierz copy ZIP-aware + CTA | DONE |
| `data-cost-regression-archive` | DONE — Outcome / sticky / empty Kosztorysy |
| Offer Run presentation | DONE — `resolveCostRegressionF2Presentation` |
| Testy AC-02 | DONE — `scripts/test-cost-regression-02-discovery-zip.mjs` |
| Changelog | DONE — **2.65.72** |

## Poza zakresem (nietknięte)

- `computeTenderBidProposal` / `tenders-bid-calculator`
- `useTenderPricingAuto` resolve / COST-PIPELINE
- AI Cost / OfferBoq engines
- `tender-document-resolver` / Edge ZIP
- Payroll / Cloud Sync merge
- Epic B / Variant C (unpack w Discovery)

## AC

| ID | Werdykt |
|----|---------|
| AC-02-1 | PASS |
| AC-02-2 | PASS |
| AC-02-3 | PASS |
| AC-02-4 | PASS |
| AC-02-5 | PASS |
| AC-02-6 | PASS |
| AC-02-7 | PASS |
| AC-02-8 | PASS |
| AC-02-9 | PASS |
| AC-02-10 | PASS (build + test) |

## Pliki

- `src/lib/cost-regression-f2.ts`
- `src/lib/tender-offer-run.ts`
- `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx`
- `src/app/TenderKosztorysWorkspace.tsx`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `src/app/kosztorys/OfferBoqStickySummaryBar.tsx`
- `scripts/test-cost-regression-02-discovery-zip.mjs` (new)
- `src/app/changelog-data.ts` · `CHANGELOG.md`
