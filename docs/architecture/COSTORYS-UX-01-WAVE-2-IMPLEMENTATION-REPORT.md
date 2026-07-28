# COSTORYS-UX-01 WAVE 2 — Implementation Report

> **STATUS:** IMPLEMENT COMPLETE  
> **UI:** **2.65.70**  
> **Data:** 2026-07-28  
> **MODE:** FAST RELEASE · UI-only

## Slices

| Slice | Status |
|-------|--------|
| 2.1 Compact + Comfort Toggle | DONE |
| 2.2 Collapsed Components + Inline Expand | DONE |
| 2.3 Search L1 ∩ review filter | DONE |
| 2.4 Sort LP / Direct / Confidence | DONE |

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/app/kosztorys/offer-boq-ux-wave2.ts` | NEW — density · `buildOfferBoqVisibleLines` |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Toolbar · Compact · Collapsed rows · pipeline |
| `scripts/test-costorys-ux-01-wave2.mjs` | NEW — AC |
| `changelog-data.ts` / `CHANGELOG.md` | **2.65.70** |

## Pipeline

`review → search → sort → render` (pure helper, bez mutacji źródeł).

## Nie zmieniono

Bid Proposal · AI Cost engines · COST-PIPELINE · parser · CATALOG-BID · Payroll · Cloud Sync · Drawer · virtualization.
