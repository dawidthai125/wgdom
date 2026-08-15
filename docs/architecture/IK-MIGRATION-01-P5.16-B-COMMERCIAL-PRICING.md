# IK-MIGRATION-01 P5.16-B — Commercial pricing contract fix

**Status:** COMPLETE (Owner GO IMPLEMENT)  
**Date:** 2026-08-15  
**Tip UI:** 2.66.76  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Owner GO

| ID | Scope |
|----|--------|
| GO-1 | Labor C1 — OUR RATE = BASE; SELL at resolve |
| GO-2 | Zaprawianie → `OWNER_APPROVED_LABOR_ONLY_WORK_IDS` |
| GO-3 | Zawór MATERIAL_SUPPLY Work-Quotes → SELL thin bridge |

## Contract

```text
BASE (Quotes / OUR RATE storage)
  → commercialPricing.marginPct
  → computeSellPricePln
  → SELL
  → Position Cost → F5 → Bid
```

**No** new margin/pricing engine · **No** invent mat.*/BOM · **No** F5/Bid/PDF rewrite · NG-10 retained · `ikEntryEnabled` OFF.

## Key files

| File | Change |
|------|--------|
| `work-rate-accept.ts` | Accept stores `marketBaseRatePln` |
| `our-rate-labor-adapter.ts` | SELL via `computeSellPricePln` into engine labor |
| `labor-only-classification.ts` | + zaprawianie |
| `material-supply-classification.ts` | + zawór allowlist |
| `catalog-work-quotes-sell-adapter.ts` | thin Quotes→SELL |
| `boq-shadow-adapter.ts` | MATERIAL_SUPPLY branch (`labor=null`) |

## Backward compatibility

No mass migration of historical Accepts that may have baked margin into OUR RATE. Live ZZK: zaprawianie OUR RATE null · margin 0 — clean start. Regression note: if old Accept stored SELL with marginPct>0, applying C1 resolve would double — Owner review before raising margins on those works.

## Tests

`npx vite-node scripts/test-ik-migration-01-p516b-commercial-pricing.mjs`
