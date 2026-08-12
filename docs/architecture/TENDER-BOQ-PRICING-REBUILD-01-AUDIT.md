# TENDER-BOQ-PRICING-REBUILD-01 — AUDIT

> **DATA:** 2026-08-12  
> **TRYB:** **AUDIT ONLY** · ZERO kodu · ZERO commit · ZERO push · ZERO zmian produkcji  
> **BASELINE PROD:** UI **2.66.36** · live tip **`73b8323`** · **PRODUCTION VERIFIED · GREEN**  
> **CEL:** poznać rzeczywisty mechanizm wyceny pozycji przedmiaru oraz przygotować bezpieczną integrację **Nasz Katalog Cen** + **Nasz Katalog Robót** (bez przełączania Bid).

**Źródła faktów:** kod `src/lib/tenders-bid-calculator.ts`, `tender-offer-boq-*.ts`, `wgdom-catalog-cost-engine.ts`, `work-catalog/*`, `price-intelligence/*`, `pricing-expert/material-market-map.ts` · SSOT decyzyjny [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · korekta [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

---

## 1. Executive Summary

**Obecny Bid nie jest zbudowany jak docelowy łańcuch Ownera** (Przedmiar → OUR RATE + Price Memory sell → pozycja → przetarg).

| Warstwa | Stan faktyczny |
|---------|----------------|
| **Bid `recommendedBidPln`** | SSOT: `computeTenderBidProposal` — 3 tryby: `offer_boq_ai` · `ath_priced` · `catalog` |
| **Cena robocizny w wycenie** | **NIE** czyta `lookupWorkRate` / `ourWorkRate`. Labor = **FL hourly × RBH** lub **split `companyPricePln`** |
| **Cena materiału w wycenie** | **NIE** woła `lookupPriceMemory` / `evaluateMaterialCache` / `commercialPricing.sellPrice`. Materiał = łańcuch providerów OfferBoq (knowledge → marketQuotes avg → companyPricePln split → category → **heurystyka**) lub katalog legacy / ATH share |
| **M + R na linii OfferBoq** | **SEPARATE** jako komponenty (`materialsPln` / `laborPln`) |
| **M + R w źródle Biblioteki** | **MIXED** w `companyPricePln`, potem sztucznie rozbijane `splitCompanyPrice` |
| **OUR RATE / Nasz Katalog Robót** | **PRODUCTION READY**, ale **poza Bid** (UI + lookup + research) |
| **Nasz Katalog Cen / Price Memory** | **PRODUCTION READY**, ale **poza Bid** (UI + research; Quotes w Bid idą innym pickerem) |
| **P7** | Już zdefiniowany w DF: osobny epic · Bid → OUR RATE · ZERO TOUCH do GO |

**Główna luka:** dwa gotowe katalogi Ownera (materiały + roboty) **nie są podłączone** do kalkulatora Bid / silnika OfferBoq jako SSOT ceny.

---

## 2. Current Bid Flow

### 2.1 Trzy tryby

```text
resolveTenderBidPricingMode / computeTenderBidProposal
├── offer_boq_ai   ← opts.offerBoqDirect (z OfferBoq już wycenionego)
├── ath_priced     ← ATH ma sumy PLN (porcje M/R + heurystyka godzin)
└── catalog        ← ilości katalogowe × WgdomCostCatalog / Work Catalog adapter
```

Plik SSOT: `src/lib/tenders-bid-calculator.ts`  
Funkcje: `resolveTenderBidPricingMode`, `computeTenderBidProposal`.

### 2.2 Ścieżka OfferBoq → Bid (główna AI Cost)

```text
ATH / przedmiar rows
  → buildOfferBoqFromSnapshot          (tender-offer-boq.ts)
  → mapOfferBoqDocument / mapOfferBoqLine
       (tender-offer-boq-mapping.ts + catalog-coverage/*)
       → catalogWorkId (opcjonalnie)
  → applyOfferBoqCostIntelligence      (komponenty M/R/…)
  → applyOfferBoqPricing / priceOfferBoqLine
       (tender-offer-boq-pricing-engine.ts)
       → unitPricePln per komponent × qty
  → doc.totals.materialsPln / laborPln / directPln
  → buildOfferBoqBidAdapterPayload
       (tender-offer-boq-bid-adapter.ts)
  → computeTenderBidProposal({ offerBoqDirect })
       materialCostReal = materialsPln
       laborCostReal    = labor + equipment + transport + auxiliary
       (BEZ ponownego RBH)
  → direct + Kp + poboczne + KZP + profitPct + risk
  → floorBid = costPrice × (1 + minMarginPct/100)
  → recommendedBidPln
  → mergeOfferBoqBidProposalIntoDocument
```

W trybie `offer_boq_ai` Bid **nie** przelicza stawek jednostkowych — bierze gotowe PLN z adaptera.

### 2.3 Ścieżka Catalog Bid

```text
kosztorys.catalogQuantities | rows
  → resolveCatalogQuantities
  → aggregateCatalogDirectCost / computeFromCatalogRow
       (wgdom-catalog-cost-engine.ts)
       labor = qty × laborRbhPerUnit × fullyLoadedHourly × laborNormFactor
       material = qty × materialPlnPerUnit (× region)
  → (opcjonalnie GAP-A: marketQuotes uplift na material)
  → computeTenderBidProposal (ten sam stack Kp/marża)
```

Aktywny katalog: `resolveActiveCatalogForTender` → często `buildLegacyCostCatalogFromWorkStore` (`work-catalog-engine-adapter.ts`) — stawki z **`companyPricePln` + costSplit**.

### 2.4 Ścieżka ATH priced

```text
row.total × laborShareOfRow → ATH M/R
  + estimateLaborHours × fullyLoadedHourly × laborNormIndexPct
  → computeTenderBidProposal
```

---

## 3. Current Material Pricing

### 3.1 Tor Bid / OfferBoq (runtime wyceny)

**NIE** używa:

- `lookupPriceMemory`
- `evaluateMaterialCache`
- `computeSellPricePln` / `commercialPricing.marginPct`

**Używa (OfferBoq leading + default providers)** — kolejność z `buildOfferBoqDocumentForPipelineItem` / `buildDefaultPriceProviders`:

| # | Provider | Źródło materiału |
|---|----------|------------------|
| 1 | `createCompanyKnowledgePriceProvider` | historyczne ceny firmowe (nie Quotes) |
| 2 | `createControlledMarketPriceProvider` | **`marketQuotes`** via `computeMarketAverageForWork` → split M/R |
| 3 | `createWorkCatalogPriceProvider` | **`companyPricePln`** → `splitCompanyPrice` → `materialPlnPerUnit` |
| 4 | `createCategoryRatePriceProvider` | `WgdomCostCatalog.materialPlnPerUnit` |
| 5 | heurystyka | **zawsze** szacunek PLN (niska pewność) |

`resolvePrice` zbiera kandydatów i wybiera przez Knowledge Engine — heurystyka **maskuje MISSING** (rzadko `null` na materiale).

### 3.2 Tor Nasz Katalog Cen (osobna warstwa — PRODUCTION READY)

```text
materialKey
  → evaluateMaterialCache / lookupPriceMemory  (marketQuotes)
  → basePrice
  → commercialPricing.marginPct
  → sellPrice = base × (1 + margin/100)       (computeSellPricePln)
```

Pliki: `price-intelligence/price-memory.ts`, `our-price-catalog.ts`, UI Firma → Nasz katalog cen.

**Bid nie czyta tego toru.**

### 3.3 Brak ceny materiału dziś

| Warstwa | Zachowanie |
|---------|------------|
| Provider work_catalog / controlled / category | `null` gdy brak danych |
| Heurystyka | **wymyśla** PLN |
| Nasz katalog cen MISSING | `sellPrice = null` (bez invent) |
| Bid agregacja | warning „komponentów bez ceny” gdy null; w praktyce heurystyka wypełnia |

---

## 4. Current Labor Pricing

### 4.1 Semantyka OUR RATE (już w produkcie — poza Bid)

Z `work-rate-types.ts` / DF:

```text
OUR RATE = zaakceptowana stawka robocizny labor-only
         = ourRatePln  [zł / unit]
Identity = workId + unit
```

To jest **A) koszt/stawka robocizny za jednostkę przedmiaru**, **nie** stawka godzinowa.

### 4.2 Labor w Bid dziś

| Ścieżka | Formuła labor |
|--------|----------------|
| Catalog Bid | `qty × laborRbhPerUnit × fullyLoadedHourly × (laborNormIndexPct/100)` |
| OfferBoq `work_catalog` | `splitCompanyPrice(companyPricePln).laborCostPlnPerUnit` |
| OfferBoq `category_rate` | `laborRbhPerUnit × fullyLoadedHourly` |
| OfferBoq `company_model` | guess RBH (0.25–0.5 h) × FL hourly |
| ATH Bid | share ATH +/lub `estimateLaborHours` × FL |
| `offer_boq_ai` tail | gotowe `laborPln` (+ equipment/transport/auxiliary) |

`fullyLoadedHourly` (`company-labor-cost.ts`):

```text
avgGrossHourlyPln × (1 + employerBurdenPct/100)
```

`labor-benchmark.ts` — **read-only UI** (P3), **nie** input Bid.

### 4.3 Czy Bid może dziś wziąć OUR RATE bez `companyPricePln`?

**Technicznie funkcje istnieją** (`lookupWorkRate` w `work-rate-lookup.ts`) i **nie czytają** `companyPricePln`.  
**Biznesowo / architektonicznie: Bid ich nie importuje.** Podłączenie = **P7** (DF ZERO TOUCH do Owner GO).

Brak OUR RATE dziś w Bid → system **nie** pokazuje „BRAK STAWKI”; zamiast tego spada na `companyPricePln` / RBH×FL / heurystykę / ATH.

---

## 5. `companyPricePln` dependencies

### Klasyfikacja AUDIT (bez zmian kodu)

| Klasa | Znaczenie | Gdzie dziś |
|-------|-----------|------------|
| **A — technical legacy (może zostać w modelu)** | Pole na `CatalogWork`, sync, UI Biblioteki, normalize preserve | store / migracje / Work Catalog UI |
| **B — odłączyć od nowej wyceny** | NIE jako SSOT OUR RATE / sell / seed | DF LOCKED · Nasz Katalog Robót już odłączony |
| **C — wymaga P7** | Bid/Offer nadal czytają jako źródło M/R | `createWorkCatalogPriceProvider`, `work-catalog-engine-adapter.workToLegacyRate`, active catalog „wycenione” |
| **D — kolizja z nowym modelem** | Mixed M+R w jednym polu vs osobno OUR RATE + Price Memory sell | `splitCompanyPrice` ukrywa mixed jako „labor” i „material” |

### Konkretne call sites Bid/Offer (C)

| Plik | Rola |
|------|------|
| `tender-offer-boq-pricing-engine.ts` `createWorkCatalogPriceProvider` | Gate `companyPricePln > 0` → split → M lub R unit |
| `work-catalog/cost-split.ts` `splitCompanyPrice` | Mixed → `materialPlnPerUnit` + `laborCostPlnPerUnit` (+ rbh) |
| `work-catalog-engine-adapter.ts` | Catalog Bid legacy rates z `companyPricePln` |
| `tender-active-catalog.ts` | Licznik wycenionych = obecność `companyPricePln` |

`tenders-bid-calculator.ts` — **0** bezpośrednich odczytów `companyPricePln` (pośrednio przez catalog / OfferBoq PLN).

---

## 6. Material identity

```text
OfferBoqLine (opis + unit + qty)
  → catalogWorkId?   (Product Mapper — NIE materialKey)
```

**Osobny tor (research / PE — nie Bid pricing):**

```text
extractExactAliasLinesFromOfferBoq
  → resolveDemandProductIdentityExact / lookupMaterialKeyByExactAlias
  → materialKey (mat.* / mat.inv.*)
  → host catalogWorkId (cw.product.* / cw.inv.* / wc.market.*)
```

Mapa: `pricing-expert/material-market-map.ts` `DEFAULT_MATERIAL_MARKET_MAP`.

| Identity | Domena | W Bid? |
|----------|--------|--------|
| `materialKey` | Price Memory / Nasz katalog cen | **NIE** na linii OfferBoq |
| `catalogWorkId` | Biblioteka / OfferBoq mapping | **TAK** (opcjonalnie) |
| `cw.inv.*` / `mat.inv.*` | invoice seed hosts | research / PM |
| `wc.market.*` | market hosty Quotes | PM / controlled market |

**Ryzyko:** dwa SSOT (coverage Product Mapper vs PE exact identity) — mogą wskazać różne workId dla tej samej frazy.

---

## 7. Work identity

```text
prepareOfferBoqLineForMapping (noise)
  → normalizeOfferBoqDescription
  → resolveCatalogCoverageAlias (Wave1/2) → productId
  → negation-guard
  → mapOfferBoqLineCore / scoreWorkAgainstLine
       (KNR, kategoria ATH, trade, unit, keywords, name tokens)
  → catalogWorkId = CatalogWork.id
```

OUR RATE identity (DF): **`workId + unit`** — region tylko metadata.

### Ryzyka

1. Ta sama robota, różne nazwy ATH → różne `catalogWorkId` lub unmatched.  
2. Wiele ID „malowania” w seeds (`kf-a1-malowanie-scian-dwukrotne`, `cw.paint.walls`, legacy `malowanie-scian-m2`).  
3. Alias Pack **nie** pokrywa generycznego „Malowanie ścian” → Core scoring.  
4. Category-only catalog Bid miesza wiele robót w jedną stawkę kategorii.  
5. Execution Expert technology packs = BOM, **nie** stawka OUR RATE.

---

## 8. Quantity / unit flow

| Etap | Pole | Uwagi |
|------|------|-------|
| Przedmiar / ATH | `qty`, `unit` | wejście linii |
| OfferBoq | `quantity`, `unit` | × `unitPricePln` → koszt komponentu |
| Catalog Bid | `catalogQuantities` / rows | CATALOG-BID-01 materializuje qty |
| OUR RATE | `unit` w identity | musi zgadzać się z jm przedmiaru |
| Material | qty materiału ≠ zawsze qty pozycji | dziś OfferBoq często 1:1 na komponent „material” bez BOM qty (BOM = Execution Expert osobno) |

**Obecny system nie robi** typowego: `ILOŚĆ × OUR RATE + Σ(materialQty × sellPrice)` jako jednolitego wzoru Bid.

---

## 9. Margin layers

| Nazwa | Domena | Znaczenie | Gdzie |
|-------|--------|-----------|-------|
| `commercialPricing.marginPct` | **Materiał handlowy** | Narzut na bazę Price Memory → sell | Nasz katalog cen · **NIE Bid** |
| Global margin floor (katalog cen) | Materiał | Floor MAX na `marginPct` | `our-price-catalog` · jawnie ≠ Bid |
| `TenderCompanyCostModel.profitPct` | **Oferta / Bid stack** | % zysku od subtotal | `computeTenderBidProposal` |
| `TenderCompanyCostModel.minMarginPct` | **Oferta / Bid floor** | `floorBid = costPrice × (1+min/100)` | Bid |
| `TenderCompanyCostModel.materialPriceIndexPct` | Indeks M | ATH / częściowo catalog | nie w `offer_boq_ai` |
| `TenderCompanyCostModel.kpPct` | Koszty pośrednie | % od direct | Bid |
| `riskReservePct` | Rezerwa | % po zysku | Bid |
| Offer Expert `strategy.marginPct` | Experts | Real→Offer (osobny tor) | **≠** Bid Proposal |
| `computeBidMarginPct` | UX metryka | (recommended−cost)/cost | UI |

**Nie mieszać:** marża materiału (`commercialPricing`) ≠ marża całego przetargu (`profitPct` / `minMarginPct`).

---

## 10. Current problems

1. **Bid nie czyta OUR RATE** mimo gotowego Work Rate Memory.  
2. **Bid nie czyta Nasz katalog cen (sell)** mimo gotowego Price Memory + margin.  
3. **`companyPricePln` mixed** nadal w torze OfferBoq / Catalog Bid (debt C/D).  
4. **Brak `materialKey` na OfferBoqLine** — nie da się spiąć 1:1 z katalogiem cen bez mostu.  
5. **Dwa pickery Quotes** — Price Memory (`lookupPriceMemory`) vs `computeMarketAverageForWork`.  
6. **Heurystyka maskuje braki** — kalkulacja Bid ≠ jawne BRAK CENY.  
7. **RBH × FL** to inna semantyka niż OUR RATE zł/jm.  
8. **Tożsamość ATH→workId** jest heurystyczna (ryzyko zła stawka / brak).  
9. **Kalkulacja Bid ≠ masowy research** — dobrze (research poza Bid); brakuje jednak **statusu BRAK/STALE** w wyniku Bid.  
10. **Trzy tryby Bid** mogą dać różne direct dla tego samego przedmiaru (OfferBoq vs ATH vs category).

---

## 11. Target architecture

*(Docelowo wyłącznie z DF / Owner Correction — bez inventowania poza dokumentacją.)*

Z DF §0 / §15 / Owner Correction:

```text
Biblioteka Robót          = definicja (identity workId+unit)
Nasz Katalog Robót        = OUR RATE (labor-only zł/unit)
Nasz Katalog Cen          = Price Memory + commercialPricing → sell
companyPricePln           = TECHNICAL LEGACY (nie SSOT nowej wyceny)
Bid / Offer wire          = P7 (osobny epic, Owner GO)
Research                  = selective · Owner Accept · CACHE-FIRST
Bid open / kalkulacja     ≠ masowy live research
```

Docelowy border (DF):

```text
PRZEDMIAR → ROBOTA → OUR RATE (+ Price Memory materiałów)
  → KOSZT → MARŻA → OFERTA
```

### Tabela: obecne vs docelowe (z DF)

| Obszar | Obecnie | Docelowo (DF) |
|--------|---------|----------------|
| Definicja roboty | `CatalogWork` / Biblioteka | Biblioteka (bez zmian taksonomii) |
| Cena robocizny | `companyPricePln` split / RBH×FL / heurystyka | **OUR RATE** |
| Materiał | Quotes avg / split / category / heurystyka | **Price Memory** (`materialKey`) |
| Cena materiału (handlowa) | brak w Bid | **Nasz katalog cen** `sellPrice` |
| Marża materiału | nieużywana w Bid | `commercialPricing.marginPct` |
| Marża ofertowa | `profitPct` + `minMarginPct` | osobna warstwa Bid (zachować semantykę stacku — P7 DF) |
| `companyPricePln` | nadal w wycenie | technical legacy · wycofanie z Bid w P7 |
| Research | selective poza Bid (OK) | selective · nie auto przy Bid |
| Historia | OUR RATE hist · MQ hist (osobno) | osobne memory (LOCKED) |
| Bid | obecny silnik 3 tryby | **P7** przełączenie źródeł direct |

---

## 12. Reuse map

### Materiały — REUSE

| Funkcja / artefakt | Plik | Rola w przyszłym mostu |
|--------------------|------|------------------------|
| `lookupPriceMemory` | `price-memory.ts` | odczyt Quotes |
| `evaluateMaterialCache` | `market-material-research-cache.ts` | CACHE-FIRST + freshness |
| `computeSellPricePln` / `resolveMarginPct` | `our-price-catalog.ts` | sell z marżą |
| `resolveDemandProductIdentityExact` | `material-market-map.ts` | materialKey |
| `extractExactAliasLinesFromOfferBoq` | `offer-boq-exact-alias-lines.ts` | most opis→alias |
| `commitMarketQuotesImport` | Price Memory write | **nie** z Bid auto; Owner Accept path |

### Roboty — REUSE

| Funkcja | Plik | Rola |
|---------|------|------|
| `lookupWorkRate` | `work-rate-lookup.ts` | CURRENT→REUSE · MISSING/STALE status |
| freshness 90d | `work-rate-freshness.ts` | BRAK / PRZETERMINOWANA |
| history / Accept | `work-rate-accept.ts`, patch | Owner path |
| selective research | `work-rate-research.ts` + Edge | **poza** Bid kalkulacją |
| identity `workId+unit` | `work-rate-types.ts` | klucz |

### Bid — REUSE (bez duplikatu silnika)

| Artefakt | Rola |
|----------|------|
| `computeTenderBidProposal` | stack Kp / poboczne / profit / minMargin / recommended |
| `buildOfferBoqBidAdapterPayload` | suma pozycji → direct |
| `priceOfferBoqLine` / providers | **miejsce wymiany źródeł** (nie nowy kalkulator) |
| `aggregateCatalogDirectCost` | catalog mode |
| quantity / BOQ model | OfferBoq lines, CATALOG-BID-01 |
| `cost-split` / `laborRbhPerUnit` / `fullyLoadedHourly` | zachować jako normy/technologia (DF §13–14); **nie** mylić z OUR RATE |

**NIE tworzyć:** drugiego Price Memory · drugiego Work Rate DB · nowego full catalogue research · auto migracji `companyPricePln`→OUR RATE.

---

## 13. Migration risks

| Ryzyko | Poziom | Opis |
|--------|--------|------|
| P7 bez pokrycia OUR RATE | **HIGH** | Bid spadnie do BRAK STAWKI / zaniżone kwoty |
| P7 bez mostu materialKey | **HIGH** | materiały wrócą do heurystyki lub legacy |
| Seed `companyPricePln`→OUR RATE | **FORBIDDEN** | fałszywe „35 = nasza stawka” |
| Dual Quotes picker | **MEDIUM** | inna cena w katalogu vs Bid |
| Heurystyka OFF bez statusów | **MEDIUM** | dużo linii bez ceny — wymaga UX BRAK CENY |
| ATH→workId mismatch | **HIGH** | zła robota = zła stawka |
| Regresja Price Memory / invoice / MMR / LIVE-08 | **MEDIUM** przy nieostrożnym reuse Quotes |
| Zmiana `minMarginPct` / Offer Expert | **HIGH** jeśli P7 miesza warstwy marż |
| Catalog Bid vs OfferBoq dual path | **MEDIUM** | dwa wyniki dla tego samego przetargu |

**REGRESSION RISK (cały epic P7):** **HIGH** (jeśli przełączenie bez Design Freeze + pokrycia).  
**REGRESSION RISK (sam AUDIT / PLAN):** **LOW** (brak zmian).

---

## 14. Proposed implementation phases

*(Tylko propozycja faz — **NIE IMPLEMENTOWAĆ** w tej sesji.)*

| Faza | Zakres | Uwagi |
|------|--------|-------|
| **0 — AUDIT** | ten dokument | COMPLETE |
| **1 — PLAN + DF** | kontrakt mostu Bid↔OUR RATE↔sell · statusy BRAK/STALE · bez live research w Bid | Owner GO |
| **2 — Identity bridge** | OfferBoqLine ↔ `materialKey` (REUSE PE) · stabilizacja `catalogWorkId` | bez zmiany kalkulatora stack |
| **3 — Read-only shadow** | porównanie: obecny direct vs OUR RATE + sell (UI/audit, nie switch) | bezpieczne |
| **4 — P7 cutover** | providers OfferBoq / catalog: OUR RATE + sell; `companyPricePln` out of path; BRAK CENY zamiast heurystyki (policy) | osobny epic |
| **5 — Cleanup** | odłączenie liczników „wycenione” od `companyPricePln`; docs | po stabilizacji |

CACHE-FIRST w Bid:

```text
lookup OUR RATE → CURRENT = REUSE (0 HTTP)
lookup material → CURRENT = REUSE (0 HTTP)
MISSING/STALE → status BRAK / WYMAGA AKTUALIZACJI
  ≠ auto live research przy otwarciu Bid
```

---

## 15. P7 boundary

Z DF §15 / §24 / AUDIT-PLAN:

```text
DO P7:
  ZERO zmian Bid / Offer / minMarginPct / kalkulatora
  companyPricePln może być jeszcze czytany = DEBT
  Nasz Katalog: BRAK STAWKI gdy puste OUR RATE

P7 (FUTURE EPIC · Owner GO):
  Bid → OUR RATE
  Bid → MATERIAL PRICE MEMORY (+ sell / commercialPricing)
  wycofanie toru mixed companyPricePln z wyceny
  Offer BOQ → OUR RATE = osobny GO (może być w tym samym epicu lub slice)
```

**Ta sesja: P7 = opisany, nie rozpoczęty.**

---

## 16. Conditions / blockers

| Warunek | Status |
|---------|--------|
| Material Legal Gate | PASS |
| Work Rate Legal Gate | PASS |
| Price Memory / Nasz katalog cen | PRODUCTION READY |
| Work Rate / Nasz Katalog Robót | PRODUCTION READY |
| Design Freeze P7 | **BRAK** (wymagany przed implementacją) |
| Pokrycie OUR RATE vs prace w typowych przedmiarach | **NIE ZMIERZONE** w tym AUDIT (blocker coverage) |
| Most `materialKey` na linii BOQ | **BRAK** |
| Owner GO na P7 | **OCZEKIWANY** |
| Auto research w Bid | **FORBIDDEN** (utrzymać) |
| Auto migracja companyPricePln | **FORBIDDEN** |

---

## 17. Test strategy (na przyszłe fazy)

| Warstwa | Co testować |
|---------|-------------|
| Identity | ATH opis → oczekiwany `workId` / `materialKey` (golden) |
| OUR RATE lookup | CURRENT REUSE 0 HTTP · MISSING → status · STALE → status |
| Material sell | base×margin · UNSET margin → null sell |
| Shadow parity | różnica PLN vs legacy `companyPricePln` path (raport, nie assert równości) |
| Bid stack | Kp / profit / minMargin **UNCHANGED** przy zamianie tylko direct |
| Invariants | PM UNCHANGED · OUR RATE UNCHANGED write · Bid no research storm |
| Regresje | P0/P1 work-rate · RW-03 · PM C01–03 · LIVE-08 · MMR-02 · invoice · CATALOG-BID · Offer Expert |
| Negatives | companyPricePln nie seeduje OUR RATE · heurystyka OFF policy · full catalogue ZERO |

---

## Appendix A — Przykład pozycji (fakt, nie invent wartości)

**Przykład referencyjny z docs/fixtures:** „Malowanie ścian” / `m2`  
(ID w testach OUR RATE: `cw.paint.walls`; seed A1: `kf-a1-malowanie-scian-dwukrotne`).

### Jak **obecny** system wycenia (schemat — bez wymyślonych PLN)

```text
ILOŚĆ: qty z przedmiaru (np. 100 m²) — TAK, z linii

ROBOCIZNA (obecnie):
  NIE: OUR RATE × qty
  TAK warianty:
    a) split(companyPricePln).laborCostPlnPerUnit × qty
    b) laborRbhPerUnit × fullyLoadedHourly × qty
    c) heurystyka / ATH share
    d) w offer_boq_ai: już zsumowane laborPln

MATERIAŁ (obecnie):
  NIE: materialKey → Price Memory → sell × qty materiału
  TAK warianty:
    a) split(companyPricePln).materialPlnPerUnit × qty
    b) marketQuotes średnia (controlled_market) × split
    c) category materialPlnPerUnit
    d) heurystyka

MARŻA MATERIAŁU (commercialPricing): NIE w Bid

RAZEM POZYCJI: suma komponentów OfferBoq (lub catalog direct)
RAZEM PRZETARGU: computeTenderBidProposal (Kp + … + minMargin)
```

**Wprost:** obecny system **nie wykonuje** rozbicia Ownera:

`OUR RATE × ilość + Σ(materialQty × sellPrice)`.

To jest **docelowy** wzór do DF/P7, nie stan kodu.

---

## Appendix B — Pliki kluczowe (absolute paths)

```text
c:\Users\dawid\Downloads\WGDOM1\src\lib\tenders-bid-calculator.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\tender-offer-boq-bid-adapter.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\tender-offer-boq-pricing-engine.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\tender-offer-boq-mapping.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\tender-offer-boq.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\wgdom-catalog-cost-engine.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\work-catalog\cost-split.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\work-catalog\work-catalog-engine-adapter.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\work-catalog\work-rate-lookup.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\company-labor-cost.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\price-intelligence\price-memory.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\price-intelligence\our-price-catalog.ts
c:\Users\dawid\Downloads\WGDOM1\src\lib\pricing-expert\material-market-map.ts
```

---

## Status sesji

```text
TENDER-BOQ-PRICING-REBUILD-01
AUDIT: COMPLETE
IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED
NEXT: OWNER REVIEW → PLAN → DESIGN FREEZE
```
