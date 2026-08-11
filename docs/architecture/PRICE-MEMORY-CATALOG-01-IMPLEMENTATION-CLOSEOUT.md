# PRICE-MEMORY-CATALOG-01 — IMPLEMENTATION CLOSEOUT

> **STATUS:** IMPLEMENTATION COMPLETE · tests PASS · build PASS  
> **DATA:** 2026-08-11  
> **UI:** **2.66.28**  
> **PRIOR:** DESIGN FREEZE · ARCH REVIEW PASS WITH CONDITIONS (C1–C5)  
> **Deploy:** patrz § Deploy / Production Verify (po push)

---

## 1. Zakres

**Firma → Nasz katalog cen** (`pricecatalog`) — cienka warstwa handlowa nad istniejącym **Price Memory**.

| W zakresie | Poza zakresem |
|------------|---------------|
| Lista Price Memory | Druga baza cen / nowe KV |
| `commercialPricing.marginPct` | Ręczna edycja base market |
| Global min margin `MAX` | Wire cena→przedmiar/Bid (P3) |
| Derived sell price | Zmiana `companyPricePln` |
| Force refresh ONE `materialKey` | Full catalogue / bulk research |
| Accept → `commitMarketQuotesImport` | Zmiana Bid `minMarginPct` |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `src/lib/work-catalog/types.ts` | `CommercialPricing` additive |
| `src/lib/work-catalog/work-catalog-store.ts` | **C1** `normalizeCommercialPricing` |
| `src/lib/price-intelligence/our-price-catalog.ts` | VM / margin / sell / change / coverage |
| `src/lib/price-intelligence/our-price-catalog-refresh.ts` | Force research + Accept wrappers |
| `src/lib/price-intelligence/market-material-research-wire.ts` | `forceRefresh?: boolean` (**C4**) |
| `src/lib/price-intelligence/market-material-research-orchestrate.ts` | `forceRefresh` bypass CURRENT |
| `src/app/price-catalog/OurPriceCatalogPanel.tsx` | UI katalogu |
| `src/app/tenders/tabs/TendersCompanyTab.tsx` | Sekcja `pricecatalog` |
| `src/lib/tenders-module-labels.ts` / `tenders-module-nav.ts` | Label + nav |
| `src/app/hooks/useWorkCatalog.ts` | Persist marży |
| `scripts/test-price-memory-catalog-01.mjs` | Harness TEST 1–28 |
| `src/app/changelog-data.ts` | UI **2.66.28** |

---

## 3. Model danych

```ts
commercialPricing?: {
  marginPct: number;
  updatedAt: string;
  source: "default" | "owner";
};
```

- SSOT base: `CatalogWork.marketQuotes` (+ `marketQuoteHistory`)
- Store: `kw-wgdom-work-catalog` (bez drugiego KV)
- Brak pola = **UNSET** (C3 — nie kopiuj Bid `minMarginPct`)

---

## 4. UI

- Hub Firma · sekcja **Nasz katalog cen**
- ACL: `canViewWorkCatalog` (jak Biblioteka Robót)
- Kolumny: # · materiał · j. · baza · marża · z marżą · freshness · obserwacja · zmiana · źródła · Aktualizuj
- Search + filtr CURRENT/STALE/MISSING · pagination 100
- **ZERO live HTTP** przy otwarciu

---

## 5. Marża / global / sell

| Temat | Semantyka |
|-------|-----------|
| Manual | Owner ustawia `marginPct` · `source=owner` |
| Global | `new = MAX(existing, global)` · UNSET→global przy „Zastosuj” |
| Sell | `base * (1 + margin/100)` derived · UNSET → „Brak marży” |
| Research | **nie** zmienia `marginPct` |

---

## 6. Timestamp / price change / freshness / sources

- **priceObservedAt** = observation z Price Memory (nie `commercialPricing.updatedAt`)
- Zmiana vs previous history · brak previous → **UNKNOWN** (C6)
- Freshness: `evaluateMaterialCache` CURRENT/STALE/MISSING
- Coverage: honest DIY trio (OBI→`wgdom`)

---

## 7. Manual refresh (C4 / C5)

```
CLICK → ONE materialKey → forceRefresh (także CURRENT)
  → ≤3 shops · qualify · candidate
  → Owner Accept → commitMarketQuotesImport
  → Price Memory + history · margin KEEP · sell recalculate
```

---

## 8. Warunki ARCH REVIEW

| ID | Wynik |
|----|-------|
| **C1** normalize preserves `commercialPricing` | **PASS** (T5) |
| **C3** UNSET ≠ Bid minMargin | **PASS** (T6) |
| **C4** force CURRENT | **PASS** (T16) |
| **C5** Accept → commit | **PASS** (T19–T20) |
| **C6** UNKNOWN change | **PASS** (T15) |

---

## 9. Testy / build / regression

| Suite | Wynik |
|-------|-------|
| `test-price-memory-catalog-01.mjs` | **45 PASS / 0 FAIL** |
| `npm run build` | **PASS** |
| `test-invoice-price-memory-seed.mjs` | **ALL PASS (38)** · 372 |
| `test-real-source-live-adapters-08.mjs` | **42 PASS** |
| `test-market-material-research-02.mjs` | **73 PASS** |

---

## 10. Deploy status

| Pole | Wartość |
|------|---------|
| COMMIT (feature) | **`0984de94`** · `feat(price-memory): add commercial price catalog` |
| DOCS tip (propagating closeout) | **`ad02808a`** |
| PUSH | **PASS** · `main` |
| version.json | **2.66.28** / **`0984de9`** |
| PRODUCTION | **VERIFIED · GREEN** |
| Live bundle | **PASS** — `pricecatalog` · Nasz katalog cen · `commercialPricing` · `forceRefresh` · Accept/commit |

---

## 11. Invariants (zachowane)

- Price Memory = jedyne SSOT bazy  
- Brak drugiej bazy / providera / full catalogue  
- `companyPricePln` UNTOUCHED  
- Bid `minMarginPct` UNTOUCHED  
- Tender wire = P3  
