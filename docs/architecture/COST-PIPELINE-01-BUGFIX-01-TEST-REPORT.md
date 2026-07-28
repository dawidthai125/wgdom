# COST-PIPELINE-01-BUGFIX-01 — Test Report

| Suite | Wynik |
|-------|--------|
| `test-cost-pipeline-01-bugfix-01.mjs` | **PASS** BF1–BF4 |
| `test-cost-pipeline-01-wire.mjs` | **PASS** |
| `test-tre-02-hotfix-01-offer-run-terminal.mjs` | **PASS** 17/17 |
| `npm run build` | **PASS** |

### BF mapowanie

| ID | Kryterium | Wynik |
|----|-----------|--------|
| BF1 | OfferBoq → `offer_boq_ai` | PASS |
| BF2 | OfferBoq null → catalog path (nie early null) | PASS |
| BF3 | oba bez ceny → brak `recommendedBidPln>0` | PASS |
| BF4 | flaga OFF → catalog only | PASS |
