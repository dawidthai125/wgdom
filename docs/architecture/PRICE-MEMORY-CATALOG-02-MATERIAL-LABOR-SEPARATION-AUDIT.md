# PRICE-MEMORY-CATALOG-02 — MATERIAL / LABOR SEPARATION AUDIT

> **STATUS:** **AUDIT COMPLETE** · NO IMPLEMENTATION · NO COMMIT · NO PUSH · PRODUCTION UNCHANGED  
> **DATA:** 2026-08-11  
> **PRIOR:** PRICE-MEMORY-CATALOG-01 · UI **2.66.28** · PRODUCTION VERIFIED · GREEN  
> **TRYB:** AUDIT ONLY  
> **NEXT:** OWNER REVIEW → PLAN / DESIGN FREEZE / IMPLEMENT

---

## 1. Problem

Owner po użyciu **Firma → Nasz katalog cen** zauważył, że lista może zawierać (lub semantycznie mieszać) pozycje **robocizny / robót**, podczas gdy katalog ma być **wyłącznie katalogiem materiałów** z warstwą handlową nad Price Memory.

Oczekiwanie produktowe:

| Warstwa | Zawartość |
|---------|-----------|
| **Nasz katalog cen** | MATERIAŁY (klej, płyta GK, farba, WC, …) |
| **Biblioteka Robót / labor** | ROBOCIZNA / ROBOTY / pakiety / stawki rbh |

**Market ≠ Real Cost** oraz **Material ≠ Labor** muszą pozostać rozdzielone.

---

## 2. Current behavior

Lista wierszy powstaje w:

`src/lib/price-intelligence/our-price-catalog.ts` → `buildOurPriceCatalogRows()`

UI tylko renderuje wynik (`OurPriceCatalogPanel.tsx`) — **nie** filtruje material vs labor.

### 2.1 Jak powstaje lista (stan obecny)

```text
WorkCatalogStore (active region)
        │
        ├─① collectCandidateMaterialKeys()
        │     • wszystkie materialKey z DEFAULT_MATERIAL_MARKET_MAP
        │     • cw.inv.* → mat.inv.*
        │     • keywords zaczynające się od "mat."
        │     • resolveDemandProductIdentityExact({ catalogWorkId }) gdy HIT
        │
        ├─② dla każdego materialKey:
        │     evaluateMaterialCache → lookupPriceMemory
        │     jeśli HIT → wiersz (dedupe po workId)
        │
        └─③ CATCH-ALL (krytyczne):
              dla KAŻDEGO CatalogWork w regionie
              IF marketQuotes niepuste
              THEN lookupPriceMemory({ materialKey: identity|inv|work.id,
                                       catalogWorkId: work.id })
              IF HIT → wiersz
```

### 2.2 Co Owner widzi

- Nazwa z `CatalogWork.namePl` (np. „Malowanie lateksowe…”, „Montaż WC…”) gdy host jest robotą seedową.
- `materialKey` może spaść do **`work.id`** (nie `mat.*`), gdy identity exact = null.
- Freshness / baza / marża działają technicznie — ale **semantyka wiersza bywa LABOR**, nie MATERIAL.

---

## 3. Current data flow

```text
PRICE MEMORY SSOT
  CatalogWork.marketQuotes (+ marketQuoteHistory)
  store: kw-wgdom-work-catalog
  lookup: lookupPriceMemory
  cache:  evaluateMaterialCache

IDENTITY (material)
  mat.* / mat.inv.*
  DEFAULT_MATERIAL_MARKET_MAP
  resolveDemandProductIdentityExact
  mapMaterialToMarketWork / preferProductCatalogWorkId
  invoice hosts cw.inv.* ↔ mat.inv.*

CATALOG-01 COMMERCIAL
  commercialPricing.marginPct → sellPrice derived

TENDERS (osobno)
  BOM / experts → materialKeys → Price Memory
  labor → TenderCompanyCostModel / labor-benchmark / companyPricePln
```

**Wniosek:** Price Memory i tender material path są zorientowane na `materialKey`.  
**Nasz katalog (01)** dodatkowo skanuje **szeroki** zbiór `CatalogWork` z dowolnymi `marketQuotes`.

---

## 4. Material identity (canonical — REUSE)

Istniejące kanoniczne sygnały **materiału / product host** (bez nowej klasyfikacji):

| Mechanizm | Plik / API | Znaczenie |
|-----------|------------|-----------|
| Prefiks `mat.` / `mat.inv.` | map + invoice | materialKey produktu |
| `cw.product.*` | `isProductCatalogWorkId` | product CatalogWork |
| `cw.inv.*` | `isInvoicePurchaseCatalogWorkId` | host zakupu fakturowego |
| `wc.market.*` | `DEFAULT_MATERIAL_MARKET_MAP.workId` | hosty market seed |
| `resolveDemandProductIdentityExact` | `material-market-map.ts` | exact identity material → host |
| `preferProductCatalogWorkId` | map | preferuj product nad labor candidate |
| `LABOR_CATALOG_WORK_BLOCKLIST` + `isLaborCatalogWorkBlockedForProductQuotes` | map | labor seed **nie** może być product Quotes host (S2-C) |

**CatalogWork nie ma pola `kind` / `type` / `material|labor`.**  
Klasyfikacja jest **identity-based**, nie unit-based i nie `companyPricePln`-based.

---

## 5. Labor identity (canonical — REUSE, poza katalogiem cen)

| Źródło | Rola |
|--------|------|
| Seed Biblioteki (`SEED-MANIFEST-v1.0.yaml`) | Roboty typu malowanie / montaż / układanie — **labor/work** |
| `LABOR_CATALOG_WORK_BLOCKLIST` | Explicit deny list pod product Quotes (częściowa) |
| `WGDOM_COVERAGE_CANDIDATES` | Dokumentuje: seed LABOR bez `mat.*` |
| `companyPricePln` | Cena firmy w Bibliotece Robót — **nie** klasyfikator material/labor |
| `TenderCompanyCostModel` + `labor-benchmark*.ts` + `TenderPriceBasePanel` | SSOT stawek / benchmarków **robocizny** |
| `WorkBundle` (osobny store) | Pakiety robót — **poza** listą katalogu cen (już nie skanowane) |

**SSOT robocizny:** koszt firmy / benchmark / historia kategorii — **nie** `marketQuotes` / Price Memory.

---

## 6. Price Memory boundary

Price Memory (design + kod research/MMR/LIVE-ADAPTERS):

- działa na **`materialKey`**,
- identity exact + labor blocklist przy product Quotes,
- Accept → `commitMarketQuotesImport` na host produktu / invoice / market.

Semantyka: **MATERIAL market reference** (oraz historical purchase `wgdom` na `cw.inv.*`).

**Nie** jest to SSOT robocizny.

---

## 7. CatalogWork boundary

`CatalogWork` = uniwersalny rekord Biblioteki (roboty + hosty produktowe + invoice hosts).

Pola:

- `id`, `tradeId`, `namePl`, `unit`, `companyPricePln`
- `marketQuotes` / `marketQuoteHistory` (opcjonalne)
- `commercialPricing` (CATALOG-01)
- `keywords`, `source`, …

**Brak** pola „to jest materiał”.  
Dlatego **nie wolno** budować „Nasz katalog cen” jako „wszystkie works z Quotes”.

Pakiety: `WorkBundleStore` — osobno; nie wchodzą dziś do `buildOurPriceCatalogRows`.

---

## 8. Current bug / root cause

### ROOT CAUSE (PRIMARY)

**Catch-all w `buildOurPriceCatalogRows` (krok ③):**

Dla każdego `CatalogWork` z niepustym `marketQuotes` woła:

```ts
lookupPriceMemory({ materialKey: identity ?? inv ?? work.id, catalogWorkId: work.id })
```

W `lookupPriceMemory` → `resolveWorkId`:

```ts
if (cw && worksById.has(cw)) return { workId: cw, materialKey: mk };
```

Czyli **sam fakt posiadania Quotes + podanie `catalogWorkId`** wystarczy do HIT — **bez** wymogu material identity.

Skutek:

- labor seed z `marketQuotes` (np. migracja `legacy_seed`, historyczny import, przypadkowe Quotes) → **wiersz w katalogu**,
- `materialKey` może być równe `work.id` (np. `malowanie-lateksowe-m2`),
- `isLaborCatalogWorkBlockedForProductQuotes` **nie jest wywoływane** w builderze katalogu.

### ROOT CAUSE (SECONDARY)

`lookupPriceMemory` / `mapMaterialToMarketWork` może wybrać **labor candidate** z `candidateWorkIds`, jeśli product host nie ma Quotes, a labor candidate ma (`preferProduct` fails → fallback na pierwszego z Quotes). To może pokazać nazwę robocizny jako host ceny materiału.

### NIE jest root cause

- `companyPricePln` (nie używane do klasyfikacji w katalogu — dobrze).
- Sam `unit` (rbh/m2/szt) — nie jest filtrem katalogu.
- Osobny store pakietów — już poza listą.
- Brak całkowicie nowej klasyfikacji w modelu — istnieją identity helpers.

---

## 9. Recommended resolver / filter

### Odpowiedź na pytanie §8 briefu

| Opcja | Ocena |
|-------|--------|
| FILTER(CatalogWork, material-only) | **Niewystarczające samo w sobie**, jeśli „material-only” = zgadywanie po nazwie/unit/companyPrice |
| **BUILD(material hosts from Price Memory)** | **PREFEROWANE** |
| Lepszy SSOT? | Już jest: **materialKeys + exact identity → host z Quotes** |

**Canonical build (zalecany):**

```text
materialKeys =
    DEFAULT_MATERIAL_MARKET_MAP.materialKey
  ∪ invoice mat.inv.* obecne w store
  ∪ (opcjonalnie) keywords "mat.*" tylko gdy resolveDemandProductIdentityExact ≠ null

dla każdego materialKey:
  identity = resolveDemandProductIdentityExact({ materialKey })  // null → SKIP
  IF isLaborCatalogWorkBlockedForProductQuotes(identity.catalogWorkId) → SKIP
  cache = evaluateMaterialCache / lookupPriceMemory(materialKey)
  IF HIT → row (dedupe workId)
  host MUST być: cw.product.* | cw.inv.* | wc.market.* | identity.catalogWorkId spoza labor blocklist

CATCH-ALL „any work with marketQuotes”:
  USUNĄĆ albo zawęzić do:
    identity exact HIT AND NOT labor-blocked
```

**Positive allowlist hostów (REUSE prefixów, bez nowego enumu):**

1. `isProductCatalogWorkId(workId)`  
2. `isInvoicePurchaseCatalogWorkId(workId)`  
3. `workId.startsWith("wc.market.")`  
4. host zwrócony przez `resolveDemandProductIdentityExact` dla `mat.*`

**Negative:**

- `isLaborCatalogWorkBlockedForProductQuotes(workId)` → zawsze wyklucz  
- brak identity `mat.*` / invoice / product / wc.market → wyklucz  
- **nie** używać `companyPricePln` ani samego `unit`

### 372 seed

`ZYGMUNT_INVOICE_PURCHASE_SEED` → **372** `mat.inv.*` / `cw.inv.*` — to jest **material-only** Price Memory.  
Katalog powinien je naturalnie zawierać przez ścieżkę invoice, nie przez skan całej Biblioteki.

---

## 10. Data model impact

| Zmiana | Potrzeba? |
|--------|-----------|
| Nowe pole `CatalogWork.kind` | **NIE** (preferencja AUDIT — REUSE identity) |
| Nowe KV | **NIE** |
| Zmiana `commercialPricing` | **NIE** |
| Zmiana Price Memory / Quotes | **NIE** (tylko filtr listy) |
| Rozszerzenie `LABOR_CATALOG_WORK_BLOCKLIST` | **Opcjonalne** jako defense-in-depth; **nie** jedyny filtr (lista niekompletna vs cały seed) |

Impact: **additive filter w builderze listy** (`our-price-catalog.ts`). Persist marży bez zmian.

---

## 11. UI impact

| Element | Zmiana |
|---------|--------|
| `OurPriceCatalogPanel` | Prawie zero — lista już z lib |
| Etykiety / sekcja Firma | Bez zmian |
| Puste stany | Możliwe: mniej wierszy (tylko materiały z Memory) — oczekiwane |
| Detail / refresh | Bez zmian semantyki; CTA nadal ONE `materialKey` |

---

## 12. Tender impact

| Przepływ | Status |
|----------|--------|
| Tender → BOM → `materialKey` → Price Memory | **Niezależny** · bez zmian |
| Tender → labor / cost model / rbh / benchmark | **Niezależny** · SSOT poza katalogiem cen |
| Bid / PE / Offer | **NO TOUCH** w tym slice |
| Cena z marżą → przedmiar | Nadal **P3 / poza scope** (CATALOG-01) |

Filtr material-only w katalogu handlowym **nie** powinien zmieniać research tenderowego — ten już idzie od `materialKey`.

---

## 13. Regression risk

| Obszar | Ryzyko | Komentarz |
|--------|--------|-----------|
| Price Memory store | Niski | Brak zapisu przy filtrze listy |
| LIVE-ADAPTERS-08 / MMR-02 | Niski | Research nadal po `materialKey` |
| Invoice seed 372 | Niski / pozytywny | Powinny zostać w katalogu |
| Biblioteka Robót UI | Zero | Osobny widok |
| Labor benchmark / Bid | Zero | Nie dotykane |
| CATALOG-01 harness | Średni | Trzeba dodać testy: labor seed z Quotes **nie** wchodzi; material HIT wchodzi |
| False negative (materiał znika) | Średni | Hosty poza allowlist (np. legacy `cw.etics.*` z Quotes) — wymaga reguły: identity `mat.*` + HIT OK nawet gdy id ≠ `cw.product.*`, **o ile** nie labor-blocked |

---

## 14. Test plan (dla przyszłego IMPLEMENT — nie teraz)

1. Labor seed na blocklist + `marketQuotes` → **0** wierszy katalogu.  
2. Labor seed poza blocklist (`malowanie-*`) + Quotes → **0** wierszy.  
3. `cw.product.*` / `mat.*` HIT → wiersz PASS.  
4. `cw.inv.*` / 372 path → wiersz PASS.  
5. `wc.market.*` HIT → wiersz PASS.  
6. Catch-all nie dodaje work bez material identity.  
7. Open catalog: fetchCalls = 0.  
8. C1 commercialPricing preserve.  
9. Regresja LIVE-08 / MMR-02 / seed 372 / Biblioteka.  
10. `companyPricePln` i Bid `minMarginPct` UNTOUCHED.

---

## 15. Implementation scope (propozycja — NO GO teraz)

| W scope | Poza scope |
|---------|------------|
| Zacisnąć `buildOurPriceCatalogRows` (material-only BUILD) | Nowa klasyfikacja w `CatalogWork` |
| REUSE identity + labor blocklist + prefix allowlist | Zmiana Price Memory / adapters / Legal / D1 |
| Testy harness CATALOG-02 | Wire marży → Bid / przedmiar |
| Docs closeout po Owner GO | Refaktor Biblioteki Robót |

---

## 16. Non-goals

- Nie tworzyć drugiej bazy cen.  
- Nie klasyfikować po `companyPricePln` ani samym `unit`.  
- Nie mieszać Purchase (real cost) z Market.  
- Nie przenosić labor do Price Memory.  
- Nie inventować `mat.*` dla robót typu „montaż”.  
- Nie implementować w tej sesji AUDIT.

---

## 17. Verdict

### CURRENT ISSUE

„Nasz katalog cen” może pokazywać pozycje wyglądające jak **robocizna/roboty**, bo lista nie jest budowana wyłącznie z **material Price Memory hosts**, lecz dodatkowo ze **wszystkich `CatalogWork` mających `marketQuotes`**.

### ROOT CAUSE

Builder `buildOurPriceCatalogRows` — **catch-all po Quotes** + `lookupPriceMemory(catalogWorkId=…)` omija material identity / labor safety; istniejące `isLaborCatalogWorkBlockedForProductQuotes` / `resolveDemandProductIdentityExact` **nie są egzekwowane** w tym builderze.

### MATERIAL SOURCE

`materialKey` (`mat.*` / `mat.inv.*`) → exact identity → product / invoice / `wc.market.*` hosts → `marketQuotes`.

### LABOR SOURCE

Seed Biblioteki + `companyPricePln` + `TenderCompanyCostModel` / labor-benchmark — **osobno**.

### PRICE MEMORY / CATALOG

**MATERIAL ONLY** (docelowo).  
Obecnie katalog = **zbyt szeroki widok CatalogWork+Quotes**.

### RECOMMENDATION

**B** — istniejący canonical material resolver **wystarcza jako źródło prawdy**, ale wymaga **małego rozszerzenia / właściwego podpięcia** w builderze katalogu (usuń/zawęż catch-all; egzekwuj identity + allowlist hostów + labor deny).

Nie **C** (nie nowa klasyfikacja modelu).  
Nie samo **A** (resolver istnieje, ale katalog go nie stosuje poprawnie).  
**D** częściowo prawdziwe (architektura Price Memory OK; bug w filtrze/builderze listy), lecz poprawka jest w **lib builder**, nie tylko w React UI — stąd werdykt **B**.

### STATUS BLOCK

```text
==================================================
PRICE-MEMORY-CATALOG-02
==================================================

AUDIT:              COMPLETE
CURRENT ISSUE:      Katalog cen może pokazywać LABOR/WORK hosts z marketQuotes
ROOT CAUSE:         catch-all w buildOurPriceCatalogRows + lookup by catalogWorkId
                    bez material identity / labor gate
MATERIAL SOURCE:    mat.* / mat.inv.* + exact identity → product/invoice/wc.market hosts
LABOR SOURCE:       Biblioteka seed + companyPricePln + TenderCompanyCostModel / benchmarks
PRICE MEMORY:       MATERIAL ONLY (design)
CATALOG:            MATERIAL ONLY (target) · obecnie ZA SZEROKI
LABOR:              SEPARATE
RECOMMENDATION:     B
IMPLEMENTATION:     NONE
COMMIT:             NONE
PUSH:               NONE
PRODUCTION:         UNCHANGED
NEXT:               OWNER REVIEW → PLAN / DESIGN FREEZE / IMPLEMENT
==================================================
```
