# CATALOG-BID-01 — Implementation Report

> **ID:** CATALOG-BID-01  
> **PHASE:** IMPLEMENTATION · **Owner GO**  
> **Data:** 2026-07-28  
> **UI:** **2.65.68**  
> **RCA:** [`CATALOG-BID-01-RCA.md`](CATALOG-BID-01-RCA.md) · **DF:** [`CATALOG-BID-01-DESIGN-FREEZE.md`](CATALOG-BID-01-DESIGN-FREEZE.md)

## Cel

Zmniejszyć F1 (`ok:false` · brak Bid) poprzez poprawną materializację `TenderKosztorysSnapshot.catalogQuantities` **przed** kalkulatorem.

## Zmiany (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tenders-bzp-brief.ts` | `buildCatalogQuantitiesFromRows` / Preview — **qty > 0** + noise filter; `ensureKosztorysCatalogQuantities`; `athPreviewToSnapshot` → ensure |
| `scripts/test-catalog-bid-01.mjs` | T1–T6 |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.65.68** |

## Bez zmian (kontrakt DF)

`computeTenderBidProposal` · `resolveTenderBidPricingMode` · `resolveCatalogQuantities` · F1–F4 · COST-PIPELINE · OfferBoq · Outcome · merge · parser

## Mechanizm

1. Martwe `catalogQuantities` (length > 0, qty puste) blokowały fallback `rows` w Bid.  
2. Builder pomija puste qty.  
3. `ensure…` gdy brak użytecznych qty → rebuild z `rows` (lub `[]` → Bid może spaść na rows).

## Gate

G1 NIE · G2/G3 boundary dossier · Owner GO IMPLEMENTATION · Stabilization OK
