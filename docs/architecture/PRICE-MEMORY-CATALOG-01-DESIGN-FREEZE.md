# PRICE-MEMORY-CATALOG-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE COMPLETE** · Architecture LOCKED  
> **DATA:** 2026-08-11  
> **EPIC:** NASZ KATALOG CEN — handlowa warstwa na Price Memory  
> **TRYB:** NO IMPLEMENTATION · NO COMMIT · NO PUSH · NO PRODUCTION CHANGES  
> **PRIOR:** AUDIT + PLAN (Owner LOCK §1–33) · tip prod [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) (**2.66.27** / LIVE-ADAPTERS-08 CLOSED)  
> **NEXT:** ARCH REVIEW → OWNER GO IMPLEMENT

---

## 1. Objective

Dodać w WGDOM widok handlowy:

**Firma → Nasz katalog cen**

który:

- pokazuje istniejący **Price Memory** (cena bazowa, freshness, timestamp, źródła, historia, zmiana ceny),
- pozwala zarządzać **marżą handlową WGDOM** (per materiał + globalna minimalna),
- wylicza **cenę z marżą** (derived),
- umożliwia ręczne **[↻ Aktualizuj cenę rynkową]** dla **jednego** `materialKey` przez istniejący selective research.

**Nie** jest to druga baza cen.

---

## 2. Scope

| W zakresie (P0–P2) | Opis |
|--------------------|------|
| UI sekcja Firma | `pricecatalog` sibling hubu |
| Read Price Memory | LAST + freshness + observation timestamp + źródła |
| Historia | `marketQuoteHistory` RO |
| Price change | vs poprzednia obserwacja bazowa |
| Commercial margin | `commercialPricing.marginPct` per host |
| Global min margin | `MAX(existing, global)` |
| Derived sell price | `base × (1 + marginPct/100)` |
| Manual refresh CTA | ONE `materialKey` → istniejący research lifecycle |
| Persist | tylko rozszerzenie `CatalogWork` w `kw-wgdom-work-catalog` |
| Test harness | kontrakt TEST 1–19 |

---

## 3. Non-goals

| Zakaz | Uzasadnienie |
|-------|--------------|
| Nowa baza / nowe KV cen | Second price DB FORBIDDEN |
| Top-level tab / admin-nav | IA Przetargi max 4; Firma = hub |
| Ręczna edycja ceny bazowej marketowej | Base = Price Memory READ ONLY |
| `sellPricePln` override | Trzecie źródło ceny — osobny Owner GO |
| Auto-research przy otwarciu katalogu | PRICE MEMORY FIRST |
| Full catalogue / category / bulk refresh | LIVE-ADAPTERS-08 |
| Nadpisanie `companyPricePln` | Semantyka Biblioteki Robót |
| Zmiana `TenderCompanyCostModel.minMarginPct` | Bid / oferta — osobna warstwa |
| Wire cena z marżą → przedmiar / Bid | **P3 / SEPARATE** |
| Nowy `materialKey` registry | REUSE mapowań |
| Nowa historia tylko dla UI | REUSE `marketQuoteHistory` |
| Nowe progi freshness | REUSE `evaluateMaterialCache` |
| Nowy research / Accept / commit engine | REUSE MMR + LIVE-ADAPTERS-08 |
| IMPLEMENT w tej sesji DF | STOP po dokumencie |

---

## 4. SSOT

| Concern | SSOT |
|---------|------|
| Cena bazowa (LAST) | `CatalogWork.marketQuotes` |
| Historia cen | `CatalogWork.marketQuoteHistory` (cap **24**) |
| Store | `WorkCatalogStore` · KV/LS **`kw-wgdom-work-catalog`** |
| Lookup | `lookupPriceMemory` |
| Cache usability | `evaluateMaterialCache` → CURRENT / STALE / MISSING |
| Research | `MaterialResearchProvider` + REAL-SOURCE-LIVE-ADAPTERS-08 |
| Persist Quotes | **tylko** `commitMarketQuotesImport` / Accept flow |
| Marża handlowa | `CatalogWork.commercialPricing` (additive; nowy kontrakt tego DF) |
| Cena z marżą | **DERIVED** — nie SSOT |

**Write Quotes:** wyłącznie istniejący Accept → `commitMarketQuotesImport`.  
**Write marży:** istniejący tor Work Catalog (`saveWorkCatalogRouted`) — **bez** nowego key sync.

---

## 5. Data model

### 5.1 Additive extension (preferowane)

```ts
commercialPricing?: {
  marginPct: number;
  updatedAt: string; // ISO — kiedy Owner/default ustawił marżę
  source: "default" | "owner";
};
```

Minimalny model LOCK: **`marginPct` + `updatedAt` + `source`**.

### 5.2 Zakazane

- `new_price_memory` / `new_material_prices` / `new_market_prices` / `new_catalog_store`
- osobne KV na ceny lub marże materiałów
- `sellPricePln` jako pole persistowane (P0–P2)

### 5.3 Relacja do istniejących pól

| Pole | Rola w tym epicu |
|------|------------------|
| `marketQuotes` | basePrice SSOT — READ ONLY w katalogu |
| `marketQuoteHistory` | historia + previous observation |
| `companyPricePln` | **UNCHANGED** — Biblioteka Robót; **nie** nadpisywać |
| `suggestedPricePln` | **nie** używać jako marża / sell |
| `commercialPricing` | **NEW** warstwa handlowa |

---

## 6. Material identity

**Nie** twórz nowego materialKey registry.

REUSE:

- `DEFAULT_MATERIAL_MARKET_MAP`
- invoice hosts (`mat.inv.*` ↔ `cw.inv.*`)
- `workId` / `CatalogWork.id`
- `lookupPriceMemory` / `resolveDemandProductIdentityExact` / `mapMaterialToMarketWork`

Wiersze katalogu budowane przez istniejące mapowanie identity → work host z Quote.  
**Nie** przebudowuj kanonicznego `CatalogWork` tylko dlatego, że `materialKey` nie jest primary field.

---

## 7. Commercial pricing

| Zasada | LOCK |
|--------|------|
| Własność | Handlowa WGDOM — niezależna od market observation / Legal / providerów |
| Persist | `commercialPricing` na host `CatalogWork` |
| Brak pola | Rekord bez `commercialPricing` = valid (backward compatible); UI traktuje jako brak ustawionej marży Owner (default policy — patrz §8) |
| Źródło | `source: "default" \| "owner"` |

Research / Accept / seed **nie** zapisują i **nie** kasują `commercialPricing`.

---

## 8. Margin semantics

- Per materiał: Owner może ustawić własną `marginPct`.
- Po ustawieniu Owner: `source = "owner"`.
- Research marketu **NIE** zmienia `marginPct`.
- Przykład: base 100 → 130 po research; marża 20% zostaje; sell 120 → 156.

**Default gdy brak `commercialPricing`:** do ustalenia w IMPLEMENT (np. brak marży / 0 / start z profilu) — **nie** wolno inventować cen; brak marży ≠ invent base. Preferencja DF: brak pola → UI pokazuje pustą/0 marżę do momentu Owner/global apply; global apply ustawia `source` zgodnie z implementacją (min. `owner` gdy jawne „Zastosuj”).

---

## 9. Global margin semantics

UI top bar:

```text
Minimalna marża dla wszystkich: [ XX % ] [Zastosuj]
```

Semantyka **LOCK**:

```text
newMarginPct = MAX(existingMarginPct, globalMarginPct)
```

| existing | global | wynik |
|---------:|-------:|------:|
| 10 | 20 | **20** |
| 18 | 20 | **20** |
| 25 | 20 | **25** |
| 30 | 20 | **30** |
| 10 | 30 | **30** |
| 35 | 30 | **35** |

Globalna:

- **podnosi** niższą,
- **NIGDY nie obniża** wyższej.

Dotyczy rekordów w zakresie apply (katalog / filtr aktualnej listy — bez side-effect poza Work Catalog hosts objętych operacją). Szczegół zakresu listy = IMPLEMENT, semantyka MAX = LOCK.

---

## 10. Base price semantics

| Zasada | LOCK |
|--------|------|
| Źródło | Price Memory LAST (`lookupPriceMemory` / cell) |
| UI | **READ ONLY** |
| Zmiana | tylko przez selective research + istniejący Accept/commit |
| Ogólny materiał (bez marki) | najtańszy **kwalifikowany** produkt (direct + regular + identity) — zasada LIVE-ADAPTERS / qualify **bez zmian** |

Ręczna edycja base w katalogu: **FORBIDDEN**.

---

## 11. Selling price formula

```text
sellPrice = basePrice * (1 + marginPct / 100)
```

- Zaokrąglenie: REUSE istniejącego `roundMarketPricePln` (lub równoważny SSOT zaokrągleń katalogu) — bez nowego „price invent”.
- `sellPrice` **nie** jest niezależnym SSOT.
- Brak `sellPricePln` override w P0–P2.

---

## 12. Timestamp semantics

| Timestamp | Znaczenie | UI |
|-----------|-----------|-----|
| **price observed at** | czas rzeczywistej obserwacji / LAST quote (`MarketSourceSnapshot.updatedAt` lub równoważny observation timestamp z Memory) | kolumna „Ostatnia aktualizacja” |
| `commercialPricing.updatedAt` | kiedy zmieniono marżę | detail / nie mylić z datą ceny |

**NIE** używaj `updatedAt` rekordu UI / bumpu store jako daty pobrania ceny.

Format wyświetlania (PL): np. `11.08.2026 13:42`.

---

## 13. Price change semantics

Porównanie: **poprzednia obserwacja bazowa** → **bieżąca** (z `marketQuoteHistory` / poprzedni LAST archived).

| Przypadek | UI |
|-----------|-----|
| wzrost | `+X,XX zł` · `+Y,YY%` · `↑` |
| spadek | `-X,XX zł` · `-Y,YY%` · `↓` |
| brak zmiany | `0 zł` · `0%` · `→` |
| brak previous | **nie inventuj** change — puste / „—” |

---

## 14. History

| Zasada | LOCK |
|--------|------|
| Źródło | `marketQuoteHistory` |
| Cap | **24** (`MARKET_QUOTE_HISTORY_CAP`) — REUSE |
| UI | READ ONLY detail |
| Nowa historia katalogu | FORBIDDEN |

---

## 15. Source coverage

Jeżeli dane pozwalają, UI pokazuje np.:

- `3/3 źródła`, lub
- `LM + Castorama + OBI` / skróty z rzeczywistych origins/observations.

**NIE** zakładaj 3/3 tylko dlatego, że trio providerów istnieje. Coverage = z qualified observations / zapisanych Quotes / metadata research notes — bez invent.

Uwaga kontraktu Quotes: origin `obi` mapuje się do `wgdom` przy Accept (D3) — UI coverage musi respektować rzeczywiste dane, nie fałszywe 3 distinct origin enum jeśli OBI zapisane jako `wgdom`.

---

## 16. Manual refresh

CTA per wiersz: **[↻ Aktualizuj cenę rynkową]**

Flow LOCK:

```text
ONE materialKey
 → existing research lifecycle
 → MaterialResearchProvider (mmr02_diy_selective)
 → LM / Castorama / OBI (bounded)
 → qualify (direct + regular + identity)
 → existing Accept / commitMarketQuotesImport
 → Price Memory LAST + history
 → nowa basePrice
 → marginPct UNCHANGED
 → sellPrice przeliczony
```

NIE twórz drugiego research engine.

---

## 17. Selective research

| Reguła | LOCK |
|--------|------|
| Per click | **ONE** `materialKey` |
| Budget | max **3 shops / materialKey** (LIVE-ADAPTERS-08) |
| Full catalogue | **FORBIDDEN** |
| Category crawl / bulk / background | **FORBIDDEN** |
| Otwarcie katalogu | **0** research |
| CURRENT | tylko odczyt |
| STALE / MISSING | informacja + CTA (nie auto) |
| Demand lifecycle | może istnieć równolegle; katalog nie omija SSOT cache |

---

## 18. UI architecture

### 18.1 Location LOCK

```text
Przetargi → Firma (tab company)
  ├── profile          Profil firmy
  ├── workcatalog      Biblioteka Robót
  ├── pricecatalog     Nasz katalog cen   ← NEW section id
  ├── pricebase        Ustawienia wyceny
  └── settings         Ustawienia
```

REUSE:

- `TendersCompanyTab`
- `TendersCompanySectionId` (+ `pricecatalog`)
- `tenders-module-nav` / `TENDERS_COMPANY_SECTION_KEY`
- `tenders-module-labels` / `TENDERS_COMPANY_SECTION_LABELS`

**NIE:** nowy top-level tab · osobny `admin-nav` View.

### 18.2 Layout

```text
NASZ KATALOG CEN
[ Minimalna marża dla wszystkich: XX% ] [Zastosuj]

Tabela:
# | Materiał | Jednostka | Cena bazowa | Marża | Cena z marżą
  | Ostatnia aktualizacja | Zmiana | Źródła | Akcja
```

Przykład wiersza:

```text
1 | Klej do płytek | … | 24,99 zł | 20% | 29,99 zł
  | 11.08.2026 13:42 | +3,00 zł / +13,64% ↑ | 3/3 | [↻ Aktualizuj]
```

### 18.3 Jakie materiały

- Pokazuj hosty z **rzeczywistą** ceną / Quote (Price Memory HIT).
- **NIE** inventuj materiałów / pustych cen.
- MISSING bez ceny: nie udawaj rekordu cenowego; opcjonalny filtr/info tylko przy jednoznacznym mappingu.

---

## 19. ACL

REUSE ACL Biblioteki Robót:

- `canViewWorkCatalog` / `adminCanViewWorkCatalog`
- Super Admin zawsze (jak Biblioteka)

**Nie** twórz nowego permission system.

---

## 20. Pagination

- **100** pozycji na stronę (101–200, 201–300, …).
- Paginacja dotyczy **naszego** Price Memory datasetu w UI — **nie** market crawl.

---

## 21. Filters / search / sort

Docelowo (P0/P1 UI):

- search
- filtry CURRENT / STALE / MISSING
- sort: nazwa · cena · data · zmiana ceny

**Bez** nowego backendowego indeksu — selectors na istniejącym store / in-memory view model.

---

## 22. P0 / P1 / P2 slices

| Slice | Zakres |
|-------|--------|
| **P0** | Sekcja `pricecatalog` · lista Price Memory · base RO · freshness · observation timestamp · źródła · historia detail · paginacja/search/filter podstawowe |
| **P1** | `commercialPricing.marginPct` · global MAX apply · persist · derived sell · harness TEST 6–10 |
| **P2** | Manual **[↻ Aktualizuj]** ONE key · reuse research+Accept · TEST 11–15 · **bez** nowej architektury research |

P2 może wejść w ten sam epic implementacyjny **jeśli** CTA wpinane bez nowego engine (Owner GO IMPLEMENT zakres).

---

## 23. P3 / tender wire separation

**OUT OF THIS EPIC (P0–P2):**

```text
sellPrice → linia przedmiaru → koszt przetargu / Bid
```

| Nie zmieniać | Powód |
|--------------|-------|
| `TenderCompanyCostModel.minMarginPct` | marża ofertowa Bid |
| Bid Proposal margin semantics | osobna warstwa |
| `companyPricePln` | Biblioteka Robót |

Wire = **P3 / osobny Owner GO**.

---

## 24. Test contract

| ID | Oczekiwane |
|----|------------|
| T1 | Lista = istniejące Price Memory (nie invent) |
| T2 | CURRENT → **0** live fetch |
| T3 | basePrice z Price Memory |
| T4 | data = observation timestamp |
| T5 | historia z `marketQuoteHistory` |
| T6 | marża persist po reload |
| T7 | sellPrice = base × (1 + m/100) |
| T8 | global 20%: 10 → 20 |
| T9 | global 20%: 25 → **25** |
| T10 | global 30%: 10→30, 20→30, 25→30, 35→**35** |
| T11 | research **nie** zmienia `marginPct` |
| T12 | research zmienia base / history |
| T13 | po zmianie base sell się przelicza |
| T14 | manual refresh = ONE `materialKey` |
| T15 | brak full catalogue fetch |
| T16 | brak drugiego KV/store |
| T17 | invoice seed **372** regression |
| T18 | LIVE-ADAPTERS-08 regression |
| T19 | MMR-02 regression |

---

## 25. Migration

Dodanie opcjonalnego `commercialPricing`:

- **backward compatible**
- istniejące rekordy bez pola = OK
- normalize: fail-soft (odrzut niepoprawnego shape, nie wipe Quotes)
- **nie** niszczyć: `marketQuotes`, `marketQuoteHistory`, invoice seed, mappings

---

## 26. Backward compatibility

| Obszar | Wymaganie |
|--------|-----------|
| Work Catalog v4 | schema additive |
| Cloud merge LWW | marża merge-safe (LWW na work / pole — IMPLEMENT detail bez second store) |
| Biblioteka Robót UI | bez regresji `companyPricePln` |
| PE / Cost / Bid | bez zmian semantyki w P0–P2 |
| Legal Gate / D1 | bez zmian |

---

## 27. Risks

| Ryzyko | Mitygacja |
|--------|-----------|
| Mylenie z Biblioteką Robót | osobna sekcja + invariant `companyPricePln` UNCHANGED |
| Invent MISSING jako cena | tylko HIT Quote w tabeli cenowej |
| Auto-refresh storm | NO AUTO · ONE key · 3 shops max |
| OBI → `wgdom` origin | coverage UI z faktów, nie z założenia 3 origin enum |
| Global apply zbyt szeroki | jasny zakres + harness T8–T10 |
| Przedwczesny tender wire | P3 SEPARATE LOCK |
| Second storage creep | HARD INVARIANTS §28 |

---

## 28. Architecture invariants (HARD)

1. **PRICE MEMORY** jest jedynym SSOT ceny bazowej.  
2. Nasz Katalog Cen **nie** tworzy drugiej bazy cen.  
3. Cena bazowa jest **READ ONLY** w katalogu.  
4. Marża jest własnością handlową WGDOM.  
5. Globalna marża **nigdy nie obniża** wyższej marży (`MAX`).  
6. Cena z marżą jest **derived**.  
7. Research marketu **nie** zmienia marży.  
8. Manual refresh = **ONE** `materialKey`.  
9. Research **nigdy** nie oznacza full catalogue.  
10. Historia pozostaje w Price Memory (`marketQuoteHistory`).  
11. Biblioteka Robót i katalog materiałów mają **różne** semantyki.  
12. **`companyPricePln` nie jest nadpisywane** przez material commercial pricing.  
13. Tender wire jest **osobnym** slice (P3).

---

## 29. Related SSOT (REUSE pointers)

| Temat | Doc / kod |
|-------|-----------|
| Price Memory | `src/lib/price-intelligence/price-memory.ts` |
| Cache | `market-material-research-cache.ts` |
| Live adapters | `docs/architecture/REAL-SOURCE-LIVE-ADAPTERS-08.md` |
| Seed 372 | `MARKET-MATERIAL-PRICE-MEMORY-SEED-CLOSEOUT.md` |
| Firma hub | `TendersCompanyTab.tsx` · `tenders-module-labels.ts` |
| Work Catalog | `docs/ARCHITECTURE.md` § 12.1.22 · `kw-wgdom-work-catalog` |

---

## 30. STOP / NEXT

```text
DESIGN FREEZE: COMPLETE
IMPLEMENT: NONE
COMMIT: NONE
PUSH: NONE

NEXT:
  ARCH REVIEW
  → OWNER GO IMPLEMENT (P0 → P1 → P2)
  → NIE invent S10 / NIE tender wire P3 bez osobnego GO
```

---

**Koniec DESIGN FREEZE — PRICE-MEMORY-CATALOG-01.**
