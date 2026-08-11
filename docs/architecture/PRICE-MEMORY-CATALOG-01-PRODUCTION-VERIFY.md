# PRICE-MEMORY-CATALOG-01 — PRODUCTION VERIFY

> **DATA:** 2026-08-11  
> **WERDYKT:** **PRODUCTION VERIFIED · GREEN**

## Live

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun/version.json |
| version | **2.66.28** |
| commit | **`0984de9`** |
| timestamp | 2026-08-11T16:25:08.758Z |

## Bundle probe (read-only)

Crawled live `/assets/*` from index + dynamic refs.

| Marker | Obecny |
|--------|--------|
| `pricecatalog` | TAK |
| `Nasz katalog cen` | TAK |
| `commercialPricing` | TAK |
| `data-our-price-catalog` | TAK (`TendersModule-CNk9Lcfd.js`) |
| `forceRefresh` | TAK |
| `Aktualizuj` | TAK |
| `commitMarketQuotesImport` | TAK |
| Minimalna marża / Brak marży | TAK (prefix match) |

## Functional (bez live research)

| Check | Status |
|-------|--------|
| Firma → Nasz katalog cen (IA) | PASS (bundle + nav) |
| Lista Price Memory | PASS (model + UI present) |
| Open catalog HTTP | ZERO (design + open = read LS/Memory) |
| Base = Price Memory | PASS |
| Margin UNSET / owner | PASS |
| Sell derived | PASS |
| Global MAX | PASS (pre-deploy harness) |
| Timestamp observation | PASS |
| Price change / UNKNOWN | PASS (C6 harness) |
| Manual refresh wiring | PASS (forceRefresh + Accept path in bundle) |
| Live research during PV | **NOT EXECUTED** |

## Invariants

PRICE MEMORY PASS · SECOND PRICE DB ZERO · FULL CATALOGUE ZERO · SECOND PROVIDER ZERO · companyPricePln UNCHANGED · Bid minMargin UNCHANGED · Tender wire P3
