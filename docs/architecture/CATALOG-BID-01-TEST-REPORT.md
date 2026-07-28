# CATALOG-BID-01 — Test Report

| Pole | Wartość |
|------|---------|
| **Komenda** | `npx vite-node scripts/test-catalog-bid-01.mjs` |
| **Wynik** | **PASS** (T1–T6) |
| **Data** | 2026-07-28 |

| ID | Scenariusz | Wynik |
|----|------------|-------|
| **T1** | rows qty > 0 + martwe catalogQuantities → ensure → `pricingMode=catalog` → Bid OK | PASS |
| **T2** | brak quantity → F1 (`ok:false`, warning ilości) | PASS |
| **T3** | ATH total > 0 → `ath_priced` bez zmian | PASS |
| **T4** | noise rows (formularz / KRS) poza catalogQuantities | PASS |
| **T5** | `athPreviewToSnapshot` materializuje tylko qty > 0 → catalog Bid | PASS |
| **T6** | ensure idempotent gdy już usable | PASS |
