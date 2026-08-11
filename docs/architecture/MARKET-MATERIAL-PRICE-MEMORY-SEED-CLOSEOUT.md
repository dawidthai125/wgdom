# MARKET MATERIAL PRICE MEMORY SEED + RESEARCH FLOW

**Status:** **SLICE CLOSED** (Legal-bounded) · 2026-08-11  
**Mode:** IMPLEMENTATION / OWNER GO  
**Live research:** **BLOCKED** (Legal Gate OPEN · D1 UNKNOWN)

---

## 1. Audit — SSOT (REUSE FIRST)

| Concern | Location |
|---------|----------|
| Price Memory LAST | `CatalogWork.marketQuotes` · `lookupPriceMemory` (`src/lib/price-intelligence/price-memory.ts`) |
| Price Memory HISTORY | `CatalogWork.marketQuoteHistory` (cap 24 / cell) |
| materialKey SSOT | `DEFAULT_MATERIAL_MARKET_MAP` + invoice hosts `mat.inv.*` ↔ `cw.inv.*` |
| Invoice parse / identity | `invoice-parse.ts` · `invoice-normalize.ts` · `productIdentityKey` |
| Invoice → Purchase (company knowledge) | `invoice-accept-purchase.ts` (**NOT** marketQuotes; unchanged) |
| Research orchestration | `market-material-research-wire.ts` · orchestrate · hard SF lease |
| Provider factory | `market-material-research-02-provider.ts` — disconnected while Legal/D1 block |
| Legal Gate | `MARKET_SYNC_P3_LEGAL_GATE = OPEN` (`p3-flag.ts`) |
| D1 | `MMR_02_PRIMARY_SOURCE_STATUS = "UNKNOWN"` |

**Faktury ≠ runtime lookup.** Seed zapisuje **HISTORICAL PURCHASE** jako `origin: wgdom` w Price Memory. Runtime = `lookupPriceMemory` / cache-first.

---

## 2. Co zrobiono

1. Ekstrakcja 3 faktur Zygmunt (PDF → integrity-checked lines).
2. Fixture JSON + kompaktowy seed TS (LAST per materialKey).
3. `seedInvoiceLinesToPriceMemory` + `applyZygmuntInvoicePurchaseSeedToWorkCatalog` + `ensureZygmuntInvoicePurchaseSeedLocal`.
4. Identity: exact `productIdentityKey` → `mat.inv.*` / `cw.inv.*` (bez fuzzy).
5. Qualify helpers: promo / marketplace wykluczone; średnia z regular+direct.
6. Wire ensure w `buildChiefPricingOptionsRo` (idempotent · push cloud soft).
7. Harness TEST 1–10 · **ZERO live HTTP**.

**NIE zrobiono (Legal boundary):** live scrape Leroy / Castorama / OBI.

---

## 3. Metryki seed

| Metric | Value |
|--------|------:|
| Fixture lines (integrity OK) | **1072** |
| Unique materialKeys (Price Memory) | **372** |
| Parse reject (PDF noise) | **394** |
| Integrity fail (ambiguous numbers) | **77** |
| Unmatched / ambiguous (parse+integrity) | **471** |
| Seed gaps (identity/unit) | **0** (among integrity-OK lines) |

Wrong product > missing: odrzucone linie PDF **nie** dostały inventowanej ceny.

---

## 4. Legal / D1 / Research

```text
LEGAL GATE: OPEN
D1: UNKNOWN
LIVE HTTP ELIGIBLE: false
PROVIDER: disconnected stub
MOCK PATH: harness-only (useMockForTests)
```

Research flow (cache-first · dedupe · SF · cooldown) **REUSE** istniejący. Live adapters **NIE** aktywowane.

---

## 5. Test

```bash
npx vite-node scripts/test-invoice-price-memory-seed.mjs
```

TEST 1–10 PASS · `fetchCalls = 0`.

---

## 6. NEXT OWNER ACTION

1. **Legal PASS + D1 ≠ UNKNOWN** (or B2B path z GATE-04) zanim live selective research.
2. Opcjonalnie: poprawa parsera PDF dla 471 reject/integrity (bez invent).
3. Opcjonalnie: Owner review kodów typu `48MM` / `290ML` jako SKU (exact z faktury; nie aliasowane).
4. **NIE** invent S10 · **NIE** flip Legal Gate bez osobnego GO.

---

*Koniec closeout.*
