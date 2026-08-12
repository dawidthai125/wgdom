# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 6 CLOSEOUT

> **DATA:** 2026-08-12  
> **TRYB:** **AUDIT ONLY** · **ZERO feature code**  
> **UI tip:** bez bumpa (docs-only) · baseline F5 **2.66.42**

```text
TENDER-BOQ-PRICING-REBUILD-01 FAZA 6

AUDIT: PASS
ATH: KEEP AS SEPARATE INPUT (struktura)
     + KEEP AS LEGACY (Bid ath_priced) · DEPRECATE dopiero po Owner C-MODE-1
ATH WORK IDENTITY: PASS (via OfferBoq mapping) · GAP (pd/KNR drop)
ATH PRICE SEMANTICS: GAP (investor mixed ≠ OUR RATE)
ATH LABOR SEMANTICS: GAP (heurystyka share / FL)
ATH MATERIAL SEMANTICS: GAP (brak materialKey/BOM/PM)
LEGACY CATALOG: AUDITED
LEGACY DEPENDENCIES: Bid catalog · Offer providers · Biblioteka · UI · testy
OUR RATE: UNCHANGED
PRICE MEMORY: UNCHANGED
POSITION COST: UNCHANGED
F5 BID: UNCHANGED
OFFER: UNCHANGED
COMPANYPRICEPLN: ZERO NEW PATH · KEEP pole techniczne
HTTP: 0
RESEARCH: 0
IMPLEMENTATION: NONE
TESTS: 21 (F6) + F0–F5 + PM/WR/LIVE/MMR/Bid/Offer — 0 FAIL
BUILD: NOT REQUIRED
COMMIT: (docs + audit harness)
PUSH: po PASS
PRODUCTION: UNCHANGED (2.66.42 F5 VERIFIED)
NEXT: OWNER REVIEW · C-MODE-1 · NIE F7 auto
```

## Dokumentacja

- [`TENDER-BOQ-PRICING-REBUILD-01-F6-ATH-CATALOG-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-F6-ATH-CATALOG-AUDIT.md)
- Harness: `scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs`

## Matryca regresji (0 FAIL)

| Suite | Wynik |
|-------|-------|
| F6 ATH/catalog audit | 21 PASS |
| F0 Position Cost | 46 PASS |
| F1 OUR RATE | 36 PASS |
| F2 Material | 62 PASS |
| F3 BOM | 41 PASS |
| F4 BOQ shadow | 36 PASS |
| F5 Bid cutover | 36 PASS |
| PM C01 / C02 / C03 | 45 / 36 / 31 PASS |
| WorkRate legal / P2 / RW-03 | 17 / 54 / 16 PASS |
| Technology DECOMP | 69 PASS |
| Invoice seed | 38 PASS |
| LIVE-08 | 42 PASS |
| COST-S1 OfferBoq | PASS |
| COST-S6 Bid | PASS |
| Catalog Bid-01 | PASS |
| MMR-02 | PASS (provider harness) |

## STOP

Czekaj na **OWNER REVIEW / C-MODE-1**. Nie implementuj F7.
