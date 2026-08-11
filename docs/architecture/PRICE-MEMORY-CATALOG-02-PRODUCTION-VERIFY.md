# PRICE-MEMORY-CATALOG-02 — PRODUCTION VERIFY

> **DATA:** 2026-08-11  
> **WERDYKT:** **PRODUCTION VERIFIED · GREEN**

## Live

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun/version.json |
| version | **2.66.29** |
| commit | **`be718b4`** (docs tip; feature **`9a2c3563`** on `main`) |
| timestamp | 2026-08-11T17:50:10.541Z |
| HEAD / origin/main | **`be718b46`** |

## Bundle probe (read-only · ZERO live research)

Crawled live `/assets/*` from index + `TendersModule-DewDriDX.js` + `app-core-DUMPV28q.js`.

| Marker | Obecny |
|--------|--------|
| `version` / APP **2.66.29** | TAK (`xf="2.66.29"`, `SI="be718b4"`) |
| `PRICE-MEMORY-CATALOG-02` | TAK (changelog / app-core) |
| `pricecatalog` | TAK |
| `Nasz katalog` / `katalog cen` | TAK |
| `data-our-price` | TAK (`TendersModule`) |
| `commercialPricing` | TAK |
| `mat.inv.` / `cw.inv.` | TAK |
| `startsWith("mat.")` | TAK (materialKey gate) |
| Labor blocklist IDs (`malowanie-lateksowe-m2`, `montaz-wc-szt`) | TAK (deny path present) |
| `forceRefresh` / `Aktualizuj` | TAK |
| `commitMarketQuotesImport` | TAK |
| `Brak mar` / `Minimalna mar` | TAK |

## Functional (bez live research / bez masowego researchu)

| Check | Status |
|-------|--------|
| Firma → Nasz katalog cen (IA) | PASS (bundle + nav `pricecatalog`) |
| MATERIAL ONLY (identity → Memory → row) | PASS (gate `mat.*` + labor blocklist in prod bundle · harness T1–T6) |
| LABOR / WORK / pakiety excluded | PASS (catch-all removed · harness T2–T4) |
| Open catalog HTTP | **ZERO** (read Price Memory only · design + harness T9 · PV: no research executed) |
| Price Memory SSOT | PASS · UNCHANGED |
| 372 material keys | PASS (harness T6) |
| Second Price DB / second KV | **ZERO** |
| Base / margin / global MAX / sellPrice | PASS (CATALOG-01 regression 45 + C02 T16–T18) |
| Timestamp / price change / sources | PASS (CATALOG-01 keep) |
| C4 CURRENT force refresh | PASS (ONE key · harness · wiring in bundle) |
| C5 Accept → commit | PASS |
| companyPricePln / Bid / Biblioteka | UNTOUCHED (harness T20–T21) |
| Live research during PV | **NOT EXECUTED** |

## Pre-deploy harness (bez ponownego run — brak zmian od IMPL)

| Suite | Wynik |
|-------|-------|
| CATALOG-02 | **36 PASS / 0 FAIL** |
| CATALOG-01 | **45 PASS / 0 FAIL** |
| invoice seed / LIVE-08 / MMR-02 | PASS |
| Build | PASS |

## Invariants

```text
MATERIAL → Price Memory → Nasz Katalog Cen
LABOR → osobna ścieżka kosztowa
PRICE MEMORY UNCHANGED
FULL CATALOGUE ZERO · SECOND PRICE DB ZERO · ZERO HTTP ON OPEN
```

## Status

```text
PRICE-MEMORY-CATALOG-02
IMPLEMENTATION: COMPLETE
MATERIAL: ONLY
LABOR: SEPARATE
PRICE MEMORY: UNCHANGED
372 MATERIAL KEYS: PASS
CATALOG-02: 36/36 PASS
CATALOG-01: 45/45 PASS
C4: PASS
C5: PASS
MARGIN: PASS
SELL PRICE: PASS
ZERO HTTP ON OPEN: PASS
FULL CATALOGUE: ZERO
SECOND PRICE DB: ZERO
REGRESSIONS: PASS
BUILD: PASS
PRODUCTION: VERIFIED · GREEN
VERSION: 2.66.29
LIVE COMMIT: be718b4
```
