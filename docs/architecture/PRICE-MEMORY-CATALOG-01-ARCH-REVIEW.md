# PRICE-MEMORY-CATALOG-01 — ARCHITECTURE REVIEW

> **STATUS:** **ARCH REVIEW = PASS WITH CONDITIONS**  
> **DATA:** 2026-08-11  
> **TRYB:** NO IMPLEMENTATION · NO COMMIT · NO PUSH · NO PRODUCTION CHANGES  
> **Design Freeze:** [`PRICE-MEMORY-CATALOG-01-DESIGN-FREEZE.md`](PRICE-MEMORY-CATALOG-01-DESIGN-FREEZE.md)  
> **Tip prod:** [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.27** · LIVE-ADAPTERS-08 CLOSED  
> **NEXT:** OWNER GO IMPLEMENT (po spełnieniu CONDITIONS poniżej)

---

## 1. Scope

Review architektury epiku **NASZ KATALOG CEN** (handlowa warstwa na Price Memory):

- UI: Firma → `pricecatalog`
- SSOT bazy: `marketQuotes` + `marketQuoteHistory`
- Marża: additive `commercialPricing`
- Sell: derived
- Refresh: ONE `materialKey` via istniejący research

**Poza scope review:** implementacja, migracje destrukcyjne, tender wire P3, zmiany Bid / Biblioteki.

---

## 2. Design Freeze reference

| Element DF | Status w kodzie |
|------------|-----------------|
| Price Memory FIRST | **CONFIRMED** |
| Second price DB forbidden | **CONFIRMED** (architektura nie wymaga) |
| Firma hub section | **CONFIRMED** (slot istnieje) |
| Base READ ONLY | **CONFIRMED** (write Quotes = Accept/commit only) |
| Global `MAX` margin | **OK** (pure compute; bez new store) |
| sellPrice derived | **OK** |
| No `sellPricePln` override | **OK** |
| P3 tender wire separate | **OK** |
| Manual refresh ONE key | **OK z CONDITIONS** (§9, §12) |

---

## 3. SSOT verification

| Claim | Kod | Werdykt |
|-------|-----|---------|
| LAST = `CatalogWork.marketQuotes` | `src/lib/work-catalog/types.ts` · `lookupPriceMemory` → `pickBestQuoteCell` | **PASS** |
| History = `marketQuoteHistory` | types + `MARKET_QUOTE_HISTORY_CAP = 24` · `listMarketQuoteHistoryForCell` / `appendMarketQuoteHistoryEntry` | **PASS** |
| Store = `kw-wgdom-work-catalog` | `WORK_CATALOG_STORAGE_KEY` · `cloud-sync` DATA_KEYS | **PASS** |
| Lookup = `lookupPriceMemory` | `price-memory.ts` | **PASS** |
| Cache = `evaluateMaterialCache` → CURRENT/STALE/MISSING | `market-material-research-cache.ts` | **PASS** |
| Write Quotes = `commitMarketQuotesImport` | `commit-market-quotes.ts` · Accept path | **PASS** |

**Rozbieżności vs „idealny” model (nie FAIL SSOT):**

- `materialKey` **nie** jest polem `CatalogWork` — identity przez mapę / invoice hosts / `workId` (zgodne z DF §11).
- Origin **`obi` nie istnieje** w `MarketQuoteOriginId`; Accept mapuje OBI → **`wgdom`** (`mapManualProviderToQuoteOrigin`). Coverage UI musi to respektować (CONDITION).

---

## 4. Data model review

### 4.1 Propozycja `commercialPricing`

```ts
commercialPricing?: {
  marginPct: number;
  updatedAt: string;
  source: "default" | "owner";
}
```

| Pytanie | Odpowiedź review |
|---------|------------------|
| Gdzie przechowywać? | **`CatalogWork`** w `kw-wgdom-work-catalog` — właściwe (jeden store, bez second DB) |
| Kolizja z istniejącymi polami? | **`companyPricePln`** = Biblioteka (inna semantyka). **`suggestedPricePln`** istnieje, prawie nieużywane — **nie** reuse jako marża |
| Normalize dziś? | **`normalizeCatalogWork` DROPUJE nieznane pola** — `commercialPricing` **zniknie** przy load/save/cloud, dopóki normalize nie zostanie rozszerzone w IMPLEMENT |

### 4.2 CONDITION-1 (HARD przed P1 persist)

IMPLEMENT **musi** dodać fail-soft normalize `commercialPricing` w `normalizeCatalogWork` (+ ewentualnie fingerprint/merge LWW). Bez tego persist marży jest architektonicznie nieskuteczny.

Nie wykonano zmian w tej review.

---

## 5. Material identity review

| Mechanizm | Status |
|-----------|--------|
| `DEFAULT_MATERIAL_MARKET_MAP` | REUSE |
| Invoice hosts `mat.inv.*` / `cw.inv.*` | REUSE (`resolveDemandProductIdentityExact`, seed data) |
| `mapMaterialToMarketWork` / `preferProductCatalogWorkId` | REUSE w `lookupPriceMemory` → `resolveWorkId` |
| Nowy material registry | **NIE wymagany** |

**PASS** — wiersze katalogu = hosts z Quote HIT + reverse mapowanie identity (keywords / map / invoice). Bez nowego resolvera framework.

**CONDITION-2:** View-model listy powinien być pure helper (REUSE lookup + map), nie drugi indeks.

---

## 6. Commercial pricing review

| Werdykt | **PASS WITH CONDITIONS** |
|---------|--------------------------|
| Model additive | OK |
| Miejsce CatalogWork | OK |
| Second KV | FORBIDDEN — nie wymagany |
| Normalize | CONDITION-1 |
| Default margin | CONDITION-3 (§15 / §22) |

---

## 7. Margin semantics

- Per-material `marginPct` niezależne od Quotes / research: **PASS** (pole osobne; research path nie dotyka go dziś).
- Research nie zmienia marży: **PASS** (Accept pisze Quotes/history; `commercialPricing` poza tym path — po CONDITION-1 preserve).

---

## 8. Global margin

```text
newMarginPct = MAX(existingMarginPct, globalMarginPct)
```

| Check | Wynik |
|-------|--------|
| Pure in-memory apply na liście hosts | **PASS** — bez HTTP, bez new store |
| Global XX% w UI top bar | stan lokalny / sesja do „Zastosuj”; wynik → `commercialPricing` na works |
| ≠ `TenderCompanyCostModel.minMarginPct` | **PASS** — nie mieszać |

Przypadki 10/18/20/25/30 vs global 20 — zgodne z DF.

---

## 9. Sell price

```text
sellPrice = basePrice * (1 + marginPct / 100)
```

**PASS** — derived only; REUSE `roundMarketPricePln` przy IMPLEMENT. Brak potrzeby SSOT sell.

---

## 10. Price update / selective research

| Element | Kod | Status |
|---------|-----|--------|
| Factory | `resolveMmr02Phase2Provider` → **`OK_DIY_SELECTIVE`** | PASS |
| Provider | `mmr02_diy_selective` / `createSelectiveDiyTrioResearchProvider` | PASS |
| Shops | Leroy / Castorama / OBI · max 3 | PASS |
| Qualify + Accept | istniejące | PASS |
| Second provider | nie potrzebny | PASS |

### CONDITION-4 — Manual refresh vs CURRENT gate

`executeMaterialResearchPhase2` / wire:

- **CURRENT** → `error: "current_reuse_no_research"` · **0** provider calls.

CTA **[↻ Aktualizuj]** na wierszu CURRENT **wymaga** minimalnego punktu integracji, np.:

- jawny `forceRefresh: true` omijający tylko gate CURRENT→REUSE dla **tego** joba, **albo**
- tymczasowe traktowanie jako STALE demand dla ONE key,

bez zmiany domyślnej semantyki otwarcia katalogu / tender pipeline (nadal CURRENT = REUSE).

### CONDITION-5 — Accept boundary

Provider: `autoAccepted: false`. Refresh **nie** może cicho zapisać Quotes. CTA musi domknąć istniejący **Owner Accept** → `acceptMaterialResearchCandidate` / commit (Owner kliknięcie w katalogu może być aktem Accept — bez auto-invent).

---

## 11. History

| Claim | Werdykt |
|-------|---------|
| Jedyna historia rynkowa = `marketQuoteHistory` | **PASS** |
| Nie tworzyć `commercialPriceHistory` | **PASS** (DF) |
| Cap 24 | **PASS** |
| `commercialPricing.updatedAt` ≠ observation | **PASS** (rozdzielone) |

**CONDITION-6:** Price change wymaga previous entry w ring dla tej samej cell (origin+region). Seed / pierwsze Quote mogą nie mieć previous → UI **UNKNOWN / „—”** (zgodne z DF). Nie invent.

---

## 12. Freshness

REUSE `evaluateMaterialCache` / PE UX fresh|usable|stale → CURRENT|STALE|MISSING.

**PASS** — katalog tylko prezentuje; bez nowego engine.

---

## 13. UI architecture

| Element | Status |
|---------|--------|
| `TendersCompanyTab` + section chips | PASS — naturalny slot |
| `TendersCompanySectionId` + labels + nav | PASS — dodać `pricecatalog` w IMPLEMENT |
| Top-level tab / admin-nav | **FORBIDDEN** — zgodne |
| Sibling: profile / workcatalog / **pricecatalog** / pricebase / settings | PASS |
| `WorkCatalogView` / `TenderPriceBasePanel` | osobne — nie mieszać semantyki |

**PASS**

---

## 14. ACL

REUSE `adminCanViewWorkCatalog` / `workCatalogForAdminEnabled` (+ Super Admin always).

`pricebase` dziś szerszy (dostęp przy Przetargi) niż Biblioteka — DF mówi REUSE Biblioteki: **PASS** (świadomy wybór węższy ACL).

Nowy permission system: **NIE**.

---

## 15. Performance

| Requirement | Werdykt |
|-------------|---------|
| Otwarcie katalogu = **ZERO** live market HTTP | **PASS** (HARD) — tylko read store + lookup |
| Paginacja 100 in-memory | **PASS** — bez backend index / market fetch |
| Manual refresh = ONE key ≤ 3 shops | **PASS** (po CONDITION-4/5) |

---

## 16. Migration

| Opcja | Review |
|-------|--------|
| Destructive rewrite 372 | **REJECT** |
| `commercialPricing` undefined = OK | **PASS** (backward compatible) |
| Lazy default w UI bez zapisu 372 | **PASS — preferowane** |

**CONDITION-3 — Default margin (Owner LOCK przy IMPLEMENT):**

| Opcja | Konsekwencja |
|-------|----------------|
| **A** AppSettings global | ryzyko pomieszania z „minimalną marżą do Zastosuj”; drugi knobs |
| **B** `costModel.minMarginPct` | **kolizja semantyczna** z Bid — **nie rekomendowane** jako default materiału |
| **C** explicit unset (`undefined`) | **REKOMENDOWANE** — sell/margin puste do Owner/global apply; zero migracji |

Review **nie** zmienia decyzji Ownera — rekomendacja: **C**.

---

## 17. Regression analysis

| Obszar | Ryzyko | Mitygacja |
|--------|--------|-----------|
| Seed 372 / invoice | Średnie przy złym normalize | CONDITION-1 · harness T17 |
| LIVE-ADAPTERS-08 | Niskie jeśli REUSE provider | T18 · no second engine |
| MMR-02 | Niskie | T19 · forceRefresh scoped |
| Biblioteka / `companyPricePln` | Średnie przy pomyłce UI | invariant · nie pisać companyPrice |
| Tender Price Base / Bid | Niskie jeśli P3 out | nie tykać `minMarginPct` |
| Firma hub | Niskie | additive section |

---

## 18. Risks (summary)

1. **Strip `commercialPricing` w normalize** — CONDITION-1.  
2. **Force refresh CURRENT** — CONDITION-4.  
3. **Accept required** — CONDITION-5.  
4. **Coverage 3/3 vs OBI→wgdom** — UI honesty.  
5. **Price change UNKNOWN** gdy brak history — OK.  
6. **Default margin B** mylone z Bid — unikać.  
7. **Przedwczesny tender wire** — P3 SEPARATE.

---

## 19. Architecture invariants (reaffirm)

1–13 z Design Freeze **potwierdzone** jako HARD — bez zmian w tej review.

Dodatkowe operacyjne (IMPLEMENT):

14. `normalizeCatalogWork` **musi** preserve `commercialPricing` (fail-soft).  
15. Force refresh **nie** zmienia default CURRENT→REUSE poza jawnym CTA.  
16. Coverage UI **nie** inventuje 3/3.

---

## 20. Verdict

```text
ARCH REVIEW = PASS WITH CONDITIONS
```

Architektura DF jest **zgodna z kodem** i **nie wymaga** drugiej bazy / drugiego providera / drugiego cache.  
IMPLEMENT jest **dozwolony dopiero po Owner GO** i z warunkami poniżej.

### CONDITIONS (must przed / w trakcie IMPLEMENT)

| ID | Warunek | Slice |
|----|---------|-------|
| **C1** | Extend `normalizeCatalogWork` (+ merge) dla `commercialPricing` fail-soft | P1 |
| **C2** | Lista = pure VM nad lookup/map; bez new registry/index KV | P0 |
| **C3** | Default margin: prefer **explicit unset**; nie reuse Bid `minMarginPct` jako silent material default | P1 |
| **C4** | Manual refresh: jawny bypass CURRENT→REUSE **tylko** dla CTA ONE key | P2 |
| **C5** | CTA kończy się istniejącym Accept → commit (nie autoAccepted invent) | P2 |
| **C6** | Price change / coverage: UNKNOWN gdy brak danych; OBI coverage bez fałszywego origin enum | P0 |

---

## 21. Implementation boundary (po Owner GO)

| Slice | Zakres |
|-------|--------|
| **P0** | `pricecatalog` section · lista HIT Quote · base RO · freshness · observation ts · źródła (honest) · history detail · paginacja/search/filter · **0 HTTP** |
| **P1** | C1 normalize · `commercialPricing` · global MAX · persist · derived sell · harness T6–10 |
| **P2** | C4+C5 manual refresh ONE key · T11–15 |
| **P3** | Tender wire — **OUT** · osobny GO |

**Nie zmieniać:** `companyPricePln` semantyka · Bid `minMarginPct` · Legal/D1 · LIVE-ADAPTERS kontrakt (poza thin force flag).

---

## 22. Test contract feasibility

| Test | Możliwy? |
|------|----------|
| 1–5 lista / CURRENT 0 fetch / base / ts / history | **TAK** (P0 harness) |
| 6–10 margin / sell / MAX | **TAK** (P1; po C1) |
| 11–13 research vs margin / base / sell | **TAK** (P2 + Accept fixture) |
| 14–16 one key / no catalogue / no second KV | **TAK** |
| 17–19 seed / LIVE-ADAPTERS / MMR-02 | **TAK** (regresje istniejące) |

---

## 23. STOP

```text
ARCH REVIEW: COMPLETE
IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE

NEXT: OWNER GO IMPLEMENT
```

---

**Koniec ARCHITECTURE REVIEW — PRICE-MEMORY-CATALOG-01.**
