# COST-MULTI-02 — CLOSEOUT

> **EPIC:** COST-MULTI-02 Aggregate Bid  
> **STATUS:** **CLOSED (code)** · tip UI **2.65.75** · commit **`8f4673ce`** · **DEPLOY PROPAGATING**  
> **Data:** 2026-07-28  
> **DF:** [`COST-MULTI-02-DESIGN-FREEZE.md`](COST-MULTI-02-DESIGN-FREEZE.md)

## Done (B0–B3)

| Etap | Wynik |
|------|--------|
| B0 | `resolveCostBidInput` · merge Aggregate |
| B1 | `branchWinnerArtifacts` w heavy |
| B2 | Bid + OfferBoq na `kosztorysForBid` |
| B3 | UX Aggregate/HOLD · changelog |

## Flagi

- `COST_MULTI_02_AGGREGATE_BID = true`
- `COST_MULTI_02_HOLD_BLOCKS_BID = false`
- Rollback: flaga 02 → `false`

## Fixture

`08dee335` — synthetic AGGREGATE PASS; prod wymaga Ponów po deploy.

## Następne (poza 02)

- Owner field smoke po PRODUCTION VERIFIED
- Opcjonalnie: twardy HOLD gate / cache Aggregate — tylko na polecenie
