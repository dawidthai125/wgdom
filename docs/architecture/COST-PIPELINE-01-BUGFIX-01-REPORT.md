# COST-PIPELINE-01-BUGFIX-01 — Bugfix Report

> **Data:** 2026-07-28 · UI **2.65.67**  
> **RCA:** [`COST-PIPELINE-01-RCA-REGRESSION-01.md`](COST-PIPELINE-01-RCA-REGRESSION-01.md)

## Problem

Przy fladze COST-PIPELINE-01 ON: OfferBoq null → `proposal: null` → Outcome „Brak rekomendowanej ceny” na wszystkich przetargach. Catalog Bid odcięty.

## Fix

`resolveTenderPricingAutoProposal` w `useTenderPricingAuto.ts`:

1. OfferBoq sukces → Bid `offer_boq_ai`  
2. OfferBoq null → **catalog Bid** (legacy)  
3. Catalog bez ceny → Outcome „Brak rekomendowanej ceny”

## OUT (nietknięte)

OfferBoq silniki · AI-COST · parser · CTA · L0/L1/L2 layout · Edge · sync

## Pliki

- `src/app/hooks/useTenderPricingAuto.ts`
- `scripts/test-cost-pipeline-01-bugfix-01.mjs`
- changelog · tip docs · raporty
