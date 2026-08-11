# PRICE-MEMORY-CATALOG-03 — AUDIT: 4 pozycje vs 372 materiały

> **STATUS:** **AUDIT COMPLETE** · **ZERO IMPLEMENTATION** · **ZERO COMMIT** · **ZERO PUSH** · **PRODUCTION UNCHANGED**  
> **DATA:** 2026-08-11  
> **BASELINE:** UI **2.66.29** · live **`be718b4`** · PRICE-MEMORY-CATALOG-02 **PRODUCTION VERIFIED · GREEN**  
> **ANALIZA:** kod + seed in-repo + lokalny harness read-only `scripts/audit-price-memory-catalog-03-4-vs-372.mjs` (nie commitowany)

---

## 1. Problem

Owner: **Firma → Nasz katalog cen** pokazuje ok. **4 pozycje**, podczas gdy system ma **372 unique materialKeys** z seeda faktur (PRICE MEMORY SEED / Zygmunt).

Pytanie: czy to bug CATALOG-02, brak danych w store, filtr UI, czy zamierzone „tylko HIT”?

---

## 2. Current UI result

| Element | Stan |
|---------|------|
| Widok | Firma → sekcja `pricecatalog` → `OurPriceCatalogPanel` |
| Default filter freshness | **`ALL`** (nie CURRENT) |
| Default search | pusty |
| Page size | **100** (`OUR_PRICE_CATALOG_PAGE_SIZE`) |
| Live HTTP on open | **ZERO** (builder tylko czyta store) |
| Obserwacja Ownera | ~**4** wiersze |

**Pagination / default CURRENT filter — WYKLUCZONE** jako przyczyna „4”.

---

## 3. The 4 records (dokładna identyfikacja)

Reprodukcja lokalna: `applyPi31ApprovedQuotesToWorkCatalog(empty)` → `buildOurPriceCatalogRows` → **dokładnie 4 rows**.

To jest seed **PI31 ETICS approved** (`apply-etics-approved-seed.ts`: „Upsert **4** robót ETICS”).

| # | Nazwa (UI) | materialKey | CatalogWork | marketQuote | Origin | Freshness* | observedAt |
|---|------------|-------------|-------------|-------------|--------|------------|------------|
| 1 | Klej do ETICS (WGDOM approved) | `mat.glue_etics` | `cw.etics.substrate` | 3,20 zł | wgdom | CURRENT | 2026-08-09T12:00:00.000Z |
| 2 | Płyta EPS grafit (WGDOM approved) | `mat.eps_graph` | `cw.etics.boards` | 45,00 zł | wgdom | CURRENT | 2026-08-09T12:00:00.000Z |
| 3 | Siatka zbrojąca (WGDOM approved) | `mat.mesh` | `cw.etics.mesh` | 4,50 zł | wgdom | CURRENT | 2026-08-09T12:00:00.000Z |
| 4 | Tynk mineralny (WGDOM approved) | `mat.render` | `cw.etics.render` | 2,80 zł | wgdom | CURRENT | 2026-08-09T12:00:00.000Z |

\*przy `nowMs` ≈ 2026-08-11 (jak w harnessie audytu).

**Wniosek:** UI Ownera zachowuje się jak katalog zawierający **wyłącznie hosty PI31 z Quotes**, a **nie** pełny zbiór 372 zakupów.

---

## 4. 372 materialKeys — skąd

| Pole | Wartość |
|------|---------|
| Moduł | `zygmunt-invoice-purchase-seed-data.ts` |
| Meta | `uniqueMaterialCount: **372**` |
| Seed rows | **372** |
| Prefix | **371×** `mat.inv.*` + **1×** `mat.glue_etics` (mapowany zakup → ETICS host) |
| Hosty | prawie wszystkie `cw.inv.*`; wyjątek `cw.etics.substrate` dla `mat.glue_etics` |
| Semantyka | HISTORICAL PURCHASE → `marketQuotes.wgdom` + history |
| Apply | `applyZygmuntInvoicePurchaseSeedToWorkCatalog` |
| Ensure | `ensureZygmuntInvoicePurchaseSeedLocal` |

### Gdzie ensure jest wołany

| Ścieżka | Woła Zygmunt seed? |
|--------|---------------------|
| `buildChiefPricingOptionsRo` (Chief / Expert wire) | **TAK** (`ensureZygmuntInvoicePurchaseSeedLocal`) |
| `OurPriceCatalogPanel` / `useWorkCatalog` | **NIE** |
| Otwarcie Firma → Nasz katalog cen | **NIE** (sam load LS/KV) |

**Krytyczne:** 372 istnieje w **kodzie/seędzie**, ale **nie jest automatycznie materializowane** przy wejściu w katalog handlowy. Trafia do `kw-wgdom-work-catalog` dopiero po ścieżce Chief (lub ręcznym ensure / sync z chmury, jeśli wcześniej zaseedowano i wypchnięto).

CATALOG-02 **nie kasuje** 372 z KV — problem to **selekcja + brak seed path na tym ekranie**, nie destrukcja storage przez C02.

---

## 5. Group breakdown (372 — przy założeniu że seed **jest** w store)

Harness: `applyZygmunt…(empty)` → klasyfikacja wszystkich 372.

| Grupa | Liczba | Przykłady | Dlaczego |
|-------|-------:|-----------|----------|
| **A** Material identity + Price Memory **CURRENT** | **286** | `mat.glue_etics`, `mat.inv.0_6mm39003`, `mat.inv.007984_8` | Quote wgdom + fresh wg PE |
| **B** Material identity + Price Memory **STALE** | **86** | `mat.inv.0439_cor`, `mat.inv.0439_e`, `mat.inv.06370` | Quote jest, observation starsza (PE stale) |
| **C** Material identity + Price Memory **MISSING** | **0** | — | Seed zawsze zapisuje `marketQuotes.wgdom` |
| **D** Historyczny zakup, brak marketQuote | **0** | — | Seed = quote + history łącznie |
| **E** Nieprawidłowa / niepełna identity | **0** | — | `mat.inv.*` → `cw.inv.*` exact; 1× MAP ETICS |
| **F** WORK / LABOR | **0** | — | Seed nie zawiera blocklist labor IDs |
| **G** Inne | **0** | — | — |
| **Builder INCLUDE** (HIT + host OK) | **372** | wszystkie | Gdy seed w store → katalog pokazałby 372 |
| **Builder REJECT (no HIT)** | **0** | — | przy zaseedowanym store |

### Ten sam builder **bez** seeda w store (stan typowy dla samego ekranu Firma)

| Grupa | Liczba | Uwagi |
|-------|-------:|-------|
| Kandydaci MAP `mat.*` | **46** | `DEFAULT_MATERIAL_MARKET_MAP` |
| MAP → MISSING (empty works) | **46** | brak hostów z Quote |
| Katalog rows | **0** | empty store |
| Katalog rows po samym PI31 | **4** | = obserwacja Ownera |
| 372 invoice keys w kandidatach | **0** | `collectCandidateMaterialKeys` bierze `mat.inv.*` **tylko z works `cw.inv.*` w store** — bez seeda nie ma tych kluczy |

---

## 6. Root cause

### RC-1 (natychmiastowa przyczyna „4”) — **dane w store widocznym przez panel**

Store, z którego czyta `useWorkCatalog` → `buildOurPriceCatalogRows`, zawiera (efektywnie) **4 hosty PI31 z Quotes**, a **nie** 372× `cw.inv.*`.

Dlaczego 372 nie widać:

1. Ensure Zygmunt **nie** jest wywoływany przy otwarciu katalogu.  
2. Kandydaci `mat.inv.*` powstają z **istniejących** `cw.inv.*` w store — brak hostów ⇒ brak kluczy.  
3. Builder i tak wymaga HIT — bez Quote nie ma row.

### RC-2 (architektura listy) — **Price Memory HIT = warunek istnienia wiersza**

W `buildOurPriceCatalogRows`:

```text
identity OK
→ evaluateMaterialCache
→ if usability === MISSING || !hit → continue   ← HARD GATE
→ host allowlist
→ row
```

Czyli:

| Pojęcie biznesowe | Obecna implementacja |
|-------------------|----------------------|
| „Materiał jest w naszym katalogu” | **≡** „ma Price Memory HIT” |
| MISSING | **nigdy nie trafia do UI** (filtr MISSING w UI jest martwy) |
| STALE | OK (gdy Quote istnieje) |
| CURRENT | OK |

To jest **zgodne z CATALOG-01/02 Design** („lista nad Price Memory”), ale **niezgodne** z nową intencją Ownera: katalog = baza materiałów + status ceny.

### RC-3 — **nie** pagination / **nie** default filter CURRENT

- `freshnessFilter` default = `ALL`  
- `pageSize` = 100  
- Brak ukrywania po nazwie LABOR w UI  

### RC-4 — CATALOG-02 nie jest „winny” kasowania 372

C02 usunął catch-all labor i wymusił identity — **słusznie**.  
Efekt uboczny: bez Quotes nie ma wiersza.  
372 nie zostały usunięte z seeda/kodu; **nie są podłączone do ścieżki UI katalogu**.

---

## 7. Current builder

Plik: `src/lib/price-intelligence/our-price-catalog.ts`

| Krok | Zachowanie |
|------|------------|
| `collectCandidateMaterialKeys` | MAP (46) ∪ `mat.inv` z `cw.inv` ∪ keywords ∪ identity z product/`wc.market` |
| Identity | `resolveDemandProductIdentityExact` — wymagane |
| Labor | `isLaborCatalogWorkBlockedForProductQuotes` — reject |
| Cache | `evaluateMaterialCache` → `lookupPriceMemory` |
| **HIT required** | **TAK** — MISSING skip |
| Host | `isOurPriceCatalogMaterialHost` |
| Dedup | po `workId` |

**Odpowiedź na pytanie §17:** tak — builder **wymaga Price Memory HIT**, żeby stworzyć row. To jest główna bariera architektoniczna względem modelu „MISSING nadal w katalogu”.

---

## 8. Current filters (UI)

| Kontrolka | Default | Wpływ na „4” |
|-----------|---------|--------------|
| Search | `""` | brak |
| Freshness | **`ALL`** | brak |
| CURRENT / STALE / MISSING | opcjonalne | MISSING **zawsze puste** (builder) |
| Pagination | 100 / page | nie ogranicza do 4 |
| Region | `store.activeRegion` | standard |

---

## 9. Storage verification

| Element | Status |
|---------|--------|
| KV SSOT | nadal `kw-wgdom-work-catalog` |
| Normalize / migrate | C02 **nie** zmienia schema Quotes |
| Seed 372 w repo | **obecny** |
| Utrata 372 przez C02 | **NIE** (brak dowodu destrukcji) |
| Ensure przy katalogu handlowym | **BRAK** |
| Ensure przy Chief | **TAK** (+ opcjonalny `pushCloud`) |

Audyt **nie** odczytywał żywego KV Ownera (brak uprawnień / zakaz zmian prod). Wniosek oparty o kod + dokładne dopasowanie „4 = PI31”.

---

## 10. Material source (canonical — rekomendacja REUSE)

Kolejność (bez nowej bazy):

1. **372** seed `mat.inv.*` / hosty `cw.inv.*` (zakupy)  
2. `DEFAULT_MATERIAL_MARKET_MAP` (`mat.*`)  
3. Hosty `cw.product.*` / `wc.market.*` / identity-backed (`cw.etics.*` materials)  
4. Istniejący resolver `resolveDemandProductIdentityExact`  
5. **NIE** labor blocklist / Biblioteka `companyPricePln` jako materiał  

**SSOT listy materiałów:** unia identity keys (seed + MAP + product hosts) — **nie** sam HIT.

**SSOT ceny:** nadal Price Memory (`marketQuotes` / history).

---

## 11. Price Memory boundary

| Rola | Dziś | Docelowo (Owner) |
|------|------|------------------|
| Cena | SSOT | SSOT (**bez zmian**) |
| Lista materiałów | de facto SSOT przez HIT | **NIE** — tylko status CURRENT/STALE/MISSING |
| Second DB / KV | ZERO | ZERO |

Architektura **pozwala** na „MATERIAL CATALOG + PRICE MEMORY STATUS” bez drugiej bazy — wymaga zmiany **builder selection**, nie nowego store.

---

## 12. Labor boundary

| Warstwa | Status |
|---------|--------|
| CATALOG-02 MATERIAL ONLY | **KEEP** |
| `companyPricePln` / Biblioteka Robót | osobna ścieżka kosztowa — **NO TOUCH** |
| TenderCompanyCostModel / labor-benchmark / Bid | **NO TOUCH** |
| Blocklist labor | nadal reject |

Rozszerzenie o MISSING **nie** może przywrócić catch-all CatalogWork.

---

## 13. Target architecture

```text
MATERIAL SOURCE (seed 372 ∪ MAP ∪ product/inv/wc.market identity)
        ↓
NASZ KATALOG MATERIAŁÓW  (wiersz zawsze gdy identity material OK)
        ↓
Price Memory lookup
        ↓
CURRENT | STALE | MISSING   (+ opcjonalnie history-only base)
        ↓
marża / sellPrice (sell = null gdy brak base)
        ↓
[ Aktualizuj cenę rynkową ]  — tylko przy MISSING/STALE/force; ZERO HTTP on open
```

**Nie:**

```text
Price Memory HIT → dopiero wtedy „materiał istnieje”
```

Przykład UI (z briefu Ownera): Farba MISSING → nadal na liście, baza „—”, sell „—”, akcja refresh ONE key.

---

## 14. Regression risk

| Obszar | Ryzyko |
|--------|--------|
| Ponowne wpuszczenie LABOR | ŚREDNIE — jeśli zbierać „wszystkie works” zamiast identity |
| Full catalogue / live HTTP on open | WYSOKIE przy złym refresh |
| Seed 372 × cloud push | ŚREDNIE — volume / merge |
| C4/C5 / marża | NISKIE przy reuse |
| Bid / companyPricePln | NISKIE jeśli NO TOUCH |
| UI MISSING filter | staje się realny dopiero po zmianie buildera |

---

## 15. Test plan (przyszły fix)

1. 372 materials available (seed w store **lub** kandydaci z seed meta + hosts).  
2. LABOR excluded.  
3. CURRENT visible.  
4. STALE visible.  
5. **MISSING visible.**  
6. History-only / purchase material visible (nawet bez DIY CURRENT).  
7. MISSING: **ZERO HTTP on open.**  
8. MISSING: manual refresh **ONE** materialKey.  
9. Accept → `commitMarketQuotesImport`.  
10. Po Accept: MISSING → CURRENT/STALE.  
11. Marża zachowana.  
12. SellPrice przeliczony / null gdy brak bazy.  
13. No second DB.  
14. No full catalogue.  
15. Tender regression (wire nadal P3 — no auto).  
16. PI31 4 ETICS nadal widoczne.  
17. CATALOG-02 labor catch-all nie wraca.  
18. Pagination >100 OK.  
19. Filter MISSING niepusty gdy są materiały bez Quote.  
20. Otwarcie Firma katalog **nie wymaga** wejścia w Chief, żeby zobaczyć seed materials (jeśli tak zdecyduje PLAN).

---

## 16. Implementation recommendation

**Recommendation: PLAN → DESIGN FREEZE → ARCH REVIEW → GO IMPLEMENT** (nie implementować w tym AUDIT).

Sugerowany kierunek (REUSE FIRST):

1. **Źródło listy:** unia `DEFAULT_MATERIAL_MARKET_MAP` + klucze seed 372 (+ hosts product/inv już w store).  
2. **Ensure path:** rozważyć wywołanie `ensureZygmuntInvoicePurchaseSeedLocal` (i/lub idempotent ensure) przy wejściu w katalog / bootstrap work-catalog — **bez** live HTTP.  
3. **Builder:** emit row także przy MISSING (identity OK, ¬labor); `basePrice` / sell nullable; freshness = MISSING.  
4. **Cena historyczna:** jeśli Quote STALE/history istnieje — pokaż jako bazę + STALE (już prawie działa gdy seed w store).  
5. **LABOR:** wyłącznie istniejący blocklist + material identity — zero catch-all.  
6. **Nie** tworzyć `materialCatalogStore` / nowego KV.

---

## 17. Non-goals

- Tender Wire full  
- Zmiana semantyki `lookupPriceMemory` globalnie (opcjonalnie tylko consumer katalogu)  
- Full catalogue LM/Casto/OBI  
- Druga baza cen  
- Przywrócenie robocizny do katalogu  
- Commit / push / deploy w etapie AUDIT  

---

## 18. Owner decision

| Pytanie | Propozycja audytu |
|---------|-------------------|
| Czy „4” jest OK? | **Nie** względem intencji „baza materiałów” |
| Verdict | **E** (patrz §19) |
| NEXT | OWNER REVIEW → **PLAN** → DF → AR → GO IMPLEMENT |

---

## 19. Verdict (pytanie §25)

**E — kombinacja:**

| Litera | Udział |
|--------|--------|
| **B** | Builder po C02 wymaga **HIT** → lista ≠ baza materiałów (brak MISSING). |
| **C** | 372 seed **nie jest podłączony** do ścieżki Firma→katalog (ensure tylko Chief) → w store widać głównie **4× PI31**. |
| **A** | „4” jest *lokalnie poprawne* dla HIT-only + aktualnej zawartości store — ale **nie** jako produkt końcowy. |
| **D** | Pagination / default CURRENT — **wykluczone**. |

Najkrócej:

> **Widzisz 4, bo to 4 ETICS z Price Memory HIT w store; 372 zakupów nie jest ładowane przy tym ekranie; a nawet gdyby — obecny builder i tak definiuje katalog jako listę HIT, nie listę materiałów.**

---

## 20. Tender impact (informacyjnie)

Docelowy łańcuch (poza zakresem implementacji):

```text
Tender material → Nasz katalog → CURRENT/STALE reuse → MISSING research → Accept → Memory → katalog
```

Dziś: katalog nie eksponuje MISSING ⇒ Tender Wire nie ma naturalnego „slotu” na research z listy firmy.

---

## Final status

```text
==================================================
PRICE-MEMORY-CATALOG-03
==================================================

AUDIT: COMPLETE

CURRENT DISPLAY: 4
(= PI31 ETICS approved Quotes)

MATERIAL KEYS: 372
(seed Zygmunt — code/meta)

CURRENT (gdy seed w store): 286
STALE (gdy seed w store): 86
MISSING (gdy seed w store): 0
HISTORICAL ONLY (gdy seed w store): 0
LABOR / WORK (w 372): 0

BEZ SEEDU W STORE (ścieżka Firma):
  MAP candidates: 46 → wszystkie MISSING
  rows: 0
  + PI31 only → rows: 4  ← zgodne z Owner UX

ROOT CAUSE:
  1) Lista katalogu = Price Memory HIT only (builder gate)
  2) ensureZygmunt nie na ścieżce Firma→Nasz katalog
  3) 4 = PI31 ETICS hosts z Quotes

VERDICT: E (B + C; A lokalnie; D wykluczone)

TARGET: MATERIAL CATALOG ≠ PRICE MEMORY HIT LIST
PRICE MEMORY: PRICE SSOT
LABOR: SEPARATE

IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED

NEXT: OWNER REVIEW → PLAN → DESIGN FREEZE → ARCH REVIEW → GO IMPLEMENT
==================================================
```
