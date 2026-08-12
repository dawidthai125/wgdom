# TENDER-BOQ-PRICING-REBUILD-01 — PLAN

> **DATA:** 2026-08-12  
> **TRYB:** **PLAN ONLY** · ZERO kodu · ZERO commit · ZERO push · ZERO produkcji  
> **AUDIT:** [`TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md) · **COMPLETE**  
> **BASELINE:** UI **2.66.36** · **PRODUCTION VERIFIED · GREEN**  
> **SSOT decyzyjne wcześniejsze:** [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md)

---

## 1. Executive Summary

Cel przebudowy: **pozycja przedmiaru** wyceniana jako:

```text
labor = qty × OUR RATE(workId, unit)
materiał(e) = Σ (qtyMat × sellPrice(materialKey))
positionCost = labor + materiały
→ Bid stack (Kp / profit / minMargin) BEZ zmiany semantyki stacku
```

**Gotowe i REUSE:** Nasz Katalog Robót · Nasz Katalog Cen · Legal Gates PASS.  
**Brakuje mostu:** identity na linii OfferBoq · normy ilości materiałów (częściowo BOM Technology) · wyłączenie heurystyki/`companyPricePln` z nowego toru · cutover Bid.

**Zasada nadrzędna (LOCKED):**

```text
companyPricePln ≠ OUR RATE ≠ fallback ≠ seed
Price Memory = SSOT materiału
OUR RATE = SSOT robocizny
Bid kalkulacja ≠ masowy / auto live research
Braki danych = JAWNE (bez heurystycznego ukrywania)
```

**Kolejność faz (zalecana, nie przykładowa z briefu):** najpierw **kontrakt + pure Position Cost Engine**, potem **labor OUR RATE**, potem **materialKey + sell**, potem **multi-material qty (BOM/GAP)**, na końcu **cutover Bid** — bo stack Bid już działa na gotowych sumach PLN (`offer_boq_ai`).

---

## 2. Current Architecture

```text
ATH / przedmiar
  → OfferBoq (+ catalogWorkId heurystycznie)
  → providers: knowledge → Quotes avg → companyPricePln split → category → HEURYSTYKA
  → materialsPln / laborPln
  → computeTenderBidProposal → recommendedBidPln
```

Alternatywy: `ath_priced` · `catalog` (RBH × `fullyLoadedHourly` / split).

**Poza Bidem (gotowe):** `lookupWorkRate` · `lookupPriceMemory` / `evaluateMaterialCache` · `computeSellPricePln`.

---

## 3. Target Architecture

```text
PRZEDMIAR (ATH = źródło wierszy: opis, jm, ilość)
  → OfferBoqLine
      workId + unit          (REUSE Product Mapper / alias — wzmocniony kontrakt)
      labor component        → lookupWorkRate → OUR RATE
      material component(s)  → materialKey → Price Memory → sellPrice
      quantity norms         → BOM Technology (gdzie jest) / jawny GAP
  → PositionCostEngine (pure)
      laborCost + materialCost = positionCost
  → agregacja → offerBoqDirect (materialsPln / laborPln)
  → computeTenderBidProposal  (Kp · profit · minMargin · recommended)  ← REUSE stack
```

Warstwy marż:

| Warstwa | SSOT | Gdzie |
|---------|------|-------|
| Marża materiału | `commercialPricing.marginPct` → `sellPrice` | przed `positionCost` |
| Marża / zysk oferty | `profitPct` · `minMarginPct` · Kp · risk | **tylko** w Bid stack |

---

## 4. Identity Contract (P1 — robota)

### 4.1 Kontrakt

```text
WorkIdentity = { workId: CatalogWork.id, unit: WgdomCostUnit }
Źródło workId: REUSE mapOfferBoqLine / Alias Pack / Core score
Źródło unit:   linia przedmiaru (normalize) — musi zgadzać się z OUR RATE unit
```

### 4.2 REUSE (bez drugiego systemu)

| Mechanizm | Plik | Rola |
|-----------|------|------|
| Noise / normalize | `catalog-coverage/*` | wejście |
| Alias Pack Wave1/2 | `alias-resolver.ts` | exact-ish productId |
| Negation guard | `negation-guard.ts` | odrzucenia |
| Core score | `tender-offer-boq-mapping.ts` `scoreWorkAgainstLine` | KNR / keywords / unit / trade |
| Active works | Biblioteka `CatalogWork` | tylko aktywne |

### 4.3 Rozszerzenie (PLAN — nie implementacja)

Gdy mapping niewystarczający — **rozszerzać Alias Pack / golden ATH→workId**, nie nowy mapper.

Wyniki identity na linii (jawne):

| Status | Znaczenie |
|--------|-----------|
| `WORK_BOUND` | `workId` + zgodne `unit` |
| `WORK_UNIT_MISMATCH` | work znaleziony, unit ≠ OUR RATE unit |
| `WORK_UNBOUND` | **BRAK ROBOTY** — nie zgadywać |

**Poza zakresem identity:** zmiana taksonomii Biblioteki · nowy silnik NLP · ATH jako źródło ceny.

---

## 5. Material Contract (P2 — materialKey)

### 5.1 Problem

`OfferBoqLine` **nie ma** `materialKey`. Bid nie może wołać Price Memory 1:1.

### 5.2 Kontrakt

```text
MaterialIdentity = materialKey  (mat.* | mat.inv.* | …)
Resolver REUSE:
  resolveDemandProductIdentityExact
  lookupMaterialKeyByExactAlias
  DEFAULT_MATERIAL_MARKET_MAP
  extractExactAliasLinesFromOfferBoq
```

### 5.3 Model na linii (additive)

```text
OfferBoqLine
  + materialBindings?: Array<{
      materialKey: string
      role: "primary" | "ancillary" | …
      qtyPerWorkUnit?: number | null   // norma; null = NIEZNANA NORMA MATERIAŁOWA
      qtyUnit?: string
      bindStatus: BOUND | UNBOUND | AMBIGUOUS
    }>
```

**NIE:** drugi `DEFAULT_MATERIAL_MARKET_MAP` · nowa baza materiałów · `wc.market.*` jako SSOT ceny (host Quotes ≠ sell).

### 5.4 Jedna robota → wiele materiałów (P3)

```text
WORK (workId, unit)
  ├── labor: OUR RATE
  ├── material[0]: materialKey + qtyPerWorkUnit
  ├── material[1]: …
  └── …
```

**Skąd ilości dziś?**

| Źródło | Status | Uwagi |
|--------|--------|-------|
| Execution Expert / Technology Packs → `GeneratedBom.materials` | **CZĘŚCIOWE REUSE** | malowanie / wylewki / kabel economy — nie uniwersalne |
| OfferBoq komponent „material” 1:1 × qty linii | **PROSTY FALLBACK** | 1 materiał, qty = qty pozycji — tylko gdy identity 1:1 i norma = 1 |
| `companyPricePln` split jako „ilość materiału” | **FORBIDDEN** w nowym modelu | to pieniądze, nie norma |
| Uniwersalny katalog norm klej/fuga/płytka | **GAP** | **nie inventować** w PLAN; wymaga Owner Decision |

Gdy brak normy: status **`NIEZNANA NORMA MATERIAŁOWA`** — pozycja niepełna, bez heurystyki kg/m².

---

## 6. Labor Contract (P5)

```text
lookupWorkRate(workId, unit)
  CURRENT  → REUSE ourRatePln · 0 HTTP
  STALE    → status PRZETERMINOWANA STAWKA · wartość opcjonalnie widoczna wg DF UI · Bid: polityka Owner (patrz §18)
  MISSING  → BRAK STAWKI ROBOTY · NIE companyPricePln
```

```text
laborCost = line.qty × ourRatePln
```

**Semantyka OUR RATE:** zł / unit (labor-only) — **nie** stawka godzinowa.

| Pojęcie | Rola w nowym modelu |
|---------|---------------------|
| `laborRbhPerUnit` | norma technologiczna (DF LOCKED) — **nie** SSOT ceny; opcjonalnie informacyjnie |
| `fullyLoadedHourly` | koszt rbh firmy (DF LOCKED) — **nie** SSOT ceny pozycji w nowym torze |
| Selective research | Owner action poza Bid · CACHE-FIRST katalogu |

---

## 7. Position Cost Contract (P6)

Pure engine (nowy thin lib — **jedyny** nowy tor obliczeniowy pozycji; bez duplikatu Bid):

```text
inputs:
  qty
  labor: { status, ourRatePln? }
  materials: [{ materialKey, qty, status, basePrice?, marginPct?, sellPrice? }]

laborCost    = qty × ourRatePln          // tylko gdy CURRENT/(polityka STALE)
materialCost = Σ (mat.qty × sellPrice)   // sell = base×(1+margin/100); brak margin → polityka §18
positionCost = laborCost + materialCost

outputs:
  laborCost, materialCost, positionCost
  flags: BRAK_* / PRZETERMINOWANA_* / NIEZNANA_NORMA_*
  complete: boolean   // czy wolno iść do Bid bez warningów krytycznych
```

**Rozdział marż:** `commercialPricing` kończy się na `sellPrice` **przed** `positionCost`.  
`profitPct` / `minMarginPct` / Kp **nie** wchodzą do Position Cost.

---

## 8. Bid Integration Contract (P7)

### 8.1 Punkt integracji (bez zmiany formuły stacku)

```text
PositionCostEngine (wszystkie linie)
  → sum materialsPln / laborPln / directPln
  → buildOfferBoqBidAdapterPayload (REUSE shape)
  → computeTenderBidProposal({ offerBoqDirect })  // Kp · profit · minMargin
  → recommendedBidPln
```

**Nie zmieniać** w P7 formuły: `kpPct`, `profitPct`, `minMarginPct`, poboczne, KZP, competitive floor — tylko **źródło direct**.

### 8.2 Providery OfferBoq

Nowy leading path:

1. Labor provider → `lookupWorkRate`  
2. Material provider → `evaluateMaterialCache` → `computeSellPricePln`  
3. **OFF** w nowym torze: heurystyka · `createWorkCatalogPriceProvider` (`companyPricePln`) · controlled_market avg jako SSOT (opcjonalnie shadow-only)

### 8.3 Tryby `ath_priced` / `catalog`

Do Design Freeze: **policy** — legacy równolegle vs wymuszenie `offer_boq_ai` dla nowej wyceny (Owner Decision §18).

### 8.4 CACHE-FIRST Bid

```text
Kalkulacja / otwarcie Bid = ZERO live research
CURRENT → REUSE
STALE/MISSING → jawny status + Owner action (katalog / refresh ONE)
```

---

## 9. `companyPricePln` Boundary

| Miejsce | Obecna rola | Zostaje w modelu? | Odłączyć od nowej wyceny? | Faza |
|---------|-------------|-------------------|---------------------------|------|
| `CatalogWork.companyPricePln` | mixed legacy UI Biblioteki | **TAK** (technical legacy) | **TAK** od Position Cost / Bid new path | od Fazy C–G |
| `splitCompanyPrice` | M/R z mixed | TAK (legacy helpers) | **TAK** w new path | C–G |
| `createWorkCatalogPriceProvider` | OfferBoq cena z Biblioteki | TAK do cutover | **TAK** (wyłączyć w new path) | G |
| `work-catalog-engine-adapter` | Catalog Bid rates | TAK do decyzji trybu catalog | **TAK** jeśli catalog → nowy model | G/H |
| `tender-active-catalog` „wycenione” | liczy `companyPricePln` | TAK tymczasowo | **TAK** → liczyć OUR RATE / completeness | po G |
| Nasz Katalog Robót UI | nie pokazuje jako OUR RATE | — | już odłączone | DONE |
| Sync / normalize | preserve bitowo | **TAK** | nie mutate przy OUR RATE | LOCKED |
| Seed → OUR RATE | — | — | **FORBIDDEN** | LOCKED |

---

## 10. ATH Boundary

| Aspekt | Plan |
|--------|------|
| Rola ATH | **Źródło danych linii** (opis, jm, ilość, ewentualnie kwoty inwestora) — **nie** SSOT ceny WGDOM |
| `ath_priced` dziś | używa sum ATH + share M/R + FL hourly — **stary tor** |
| Zasilanie nowego modelu | TAK jako input OfferBoq rows → identity → OUR RATE / PM |
| Ryzyka | zły opis → `WORK_UNBOUND` / zły workId; ATH total ≠ koszt WGDOM |
| Bezpieczeństwo | ATH nigdy nie nadpisuje OUR RATE ani Price Memory |

---

## 11. Reuse Map

### Materiały

| Funkcja | Użycie |
|---------|--------|
| `lookupPriceMemory` | base |
| `evaluateMaterialCache` | CURRENT/STALE/MISSING |
| `computeSellPricePln` | sell |
| `resolveDemandProductIdentityExact` + mapa | materialKey |
| `extractExactAliasLinesFromOfferBoq` | most opis→alias |
| `commitMarketQuotesImport` | **tylko** Owner Accept / katalog — **nie** Bid |

### Roboty

| Funkcja | Użycie |
|---------|--------|
| `lookupWorkRate` | OUR RATE |
| freshness / history / Accept / research | katalog Owner — poza Bid |

### Bid / BOQ

| Artefakt | Użycie |
|----------|--------|
| OfferBoq model + qty | REUSE |
| `buildOfferBoqBidAdapterPayload` | REUSE shape |
| `computeTenderBidProposal` | REUSE stack |
| Technology `GeneratedBom` | REUSE qty gdzie pack istnieje |
| `cost-split` / FL hourly | legacy only — nie SSOT new path |

---

## 12. Data Flow (docelowy)

```text
                    ┌─ workId+unit ─ lookupWorkRate ─ OUR RATE ─┐
ATH row ─ OfferBoq ─┤                                            ├─ PositionCost ─ Σ ─ Bid stack
                    └─ materialKey(s)+qty ─ cache ─ sellPrice ───┘
                              │
                    Owner: refresh ONE / Accept (poza Bid)
```

Statusy (jawne):

| Kod | Znaczenie |
|-----|-----------|
| `BRAK_ROBOTY` | brak workId |
| `BRAK_STAWKI_ROBOTY` | OUR RATE MISSING |
| `PRZETERMINOWANA_STAWKA` | OUR RATE STALE |
| `BRAK_MATERIAŁU` | brak materialKey |
| `BRAK_CENY_MATERIAŁU` | PM MISSING |
| `PRZETERMINOWANA_CENA` | PM STALE |
| `NIEZNANA_NORMA_MATERIAŁOWA` | brak qtyPerWorkUnit / BOM |
| `NIEZNANA_NORMA_ROBOTY` | (opcjonalnie) brak rbh informacyjnie — **nie blokuje** ceny jeśli OUR RATE jest |

---

## 13. Phases (zalecana kolejność)

> Numeracja **F0–F7** poniżej = fazy tego epiku.  
> Historyczne **P7** z DF (= Bid wire) = tutaj **Faza F6–F7**.

### Faza F0 — Design Freeze tego epiku

| | |
|--|--|
| **Zakres** | DF kontraktów §4–10 · Owner Decisions §18 · shadow vs cutover |
| **Poza** | kod produkcyjny |
| **Wejście** | AUDIT+PLAN accepted |
| **Zamknięcie** | DF merged · Owner GO na F1 |
| **Testy** | n/a |

### Faza F1 — Position Cost Engine (pure lib)

| | |
|--|--|
| **Zakres** | pure funkcje: labor+materials→positionCost · statusy · **zero** Bid wire · zero HTTP |
| **Poza** | OfferBoq schema · Bid · research |
| **Wejście** | F0 |
| **Zamknięcie** | harness: labor-only · 1 mat · N mat · MISSING/STALE · no companyPricePln |
| **Regresje** | work-rate P0/P1 · PM C01–03 (import only) |

### Faza F2 — Labor: OUR RATE → komponent robocizny (shadow → optional flag)

| | |
|--|--|
| **Zakres** | provider labor: `lookupWorkRate` · statusy BRAK/STALE · flaga OFF default |
| **Poza** | wyłączenie heurystyki globalnie · Bid cutover · materiały |
| **Wejście** | F1 PASS |
| **Zamknięcie** | shadow porównanie vs legacy labor · 0 HTTP przy CURRENT |
| **Regresje** | OfferBoq pricing · Bid bez zmiany recommended (flaga OFF) |

### Faza F3 — `materialKey` additive na OfferBoq + PE resolver

| | |
|--|--|
| **Zakres** | pole/bindings · REUSE identity · 1 materiał primary gdzie exact |
| **Poza** | multi-BOM qty · Bid cutover · nowa mapa |
| **Wejście** | F1 |
| **Zamknięcie** | linie z exact alias → materialKey · UNBOUND jawny |
| **Regresje** | mapping coverage · PE identity tests |

### Faza F4 — Material sell: Price Memory → komponent materiału

| | |
|--|--|
| **Zakres** | `evaluateMaterialCache` + `computeSellPricePln` · CURRENT REUSE · flaga OFF default |
| **Poza** | auto research · commit z Bid · second PM |
| **Wejście** | F3 |
| **Zamknięcie** | sell parity z Nasz katalog cen · MISSING/STALE status |
| **Regresje** | PM C01–03 · LIVE-08 · MMR-02 · invoice |

### Faza F5 — Multi-material qty

| | |
|--|--|
| **Zakres** | most BOM Technology → bindings qty · GAP status gdy brak pack |
| **Poza** | inventowanie uniwersalnych norm klej/fuga |
| **Wejście** | F3+F4 · Owner Decision nt. BOM scope |
| **Zamknięcie** | malowanie/wylewka/kabel (gdzie pack) PASS · inne = NIEZNANA_NORMA |
| **Regresje** | Execution Expert / Technology packs |

### Faza F6 — New path ON: wyłączenie heurystyki + `companyPricePln` w path

| | |
|--|--|
| **Zakres** | flaga new pricing path · providers legacy OFF na liniach w path · jawne braki |
| **Poza** | usuwanie pola `companyPricePln` · zmiana Kp/minMargin |
| **Wejście** | F2+F4 (+F5 wg decyzji) · pokrycie minimalne Owner |
| **Zamknięcie** | zero heurystyki w new path · zero companyPricePln w Position Cost |
| **Regresje** | Bid flaga OFF nadal stary tor |

### Faza F7 — Bid cutover (`offer_boq_ai` direct z Position Cost)

| | |
|--|--|
| **Zakres** | adapter sum → `computeTenderBidProposal` · to jest DF **P7** |
| **Poza** | przebudowa stacku Bid · Offer Expert margin sync · global ON bez GO |
| **Wejście** | F6 · Owner GO cutover · smoke coverage |
| **Zamknięcie** | recommended z new direct · stary path tombstone/flag · PV |
| **Regresje** | CATALOG-BID · Offer Expert · full Bid harness · work-rate · PM |

**Dlaczego nie „najpierw materialKey, potem wszystko”?**  
Bid już konsumuje **sumy PLN**. Największy zysk bezpieczeństwa: **F1 pure engine** testowalny bez UI, potem labor (OUR RATE już SSOT), potem materiały (trudniejszy identity+qty).

---

## 14. Test Strategy

| # | Case | Oczekiwanie |
|---|------|-------------|
| 1 | Jedna pozycja robocza | flow kompletny / statusy |
| 2 | 1 robota + 1 materiał | labor+sell |
| 3 | 1 robota + N materiałów | Σ sell · BOM lub GAP |
| 4 | CURRENT labor | REUSE · 0 HTTP |
| 5 | CURRENT material | REUSE · 0 HTTP |
| 6 | STALE labor | status · brak auto research |
| 7 | STALE material | status · brak auto research |
| 8 | MISSING labor | BRAK STAWKI · ≠ companyPricePln |
| 9 | MISSING material | BRAK CENY |
| 10 | material margin | sell = base×(1+m/100) |
| 11 | labor-only | materialCost=0 dozwolone |
| 12 | material-only | labor MISSING jawny / polityka |
| 13 | material+labor | positionCost suma |
| 14 | companyPricePln | nie zasila OUR RATE / Position Cost |
| 15 | brak heurystyki | new path bez invent PLN |
| 16 | PM regresja | C01–03 PASS |
| 17 | Nasz Katalog Robót | P0/P1/P2/RW-03 PASS |
| 18 | Bid regresja | stack UNCHANGED przy fladze OFF |
| 19 | Offer regresja | Offer Expert / BOQ mapping |
| 20 | ATH | rows→identity; ATH≠cena |
| 21 | invoice seed | PASS |
| 22 | LIVE-08 | PASS |
| 23 | MMR-02 | PASS · LIVE HTTP ZERO |

---

## 15. Migration Strategy

```text
1) Additive fields + pure engine (shadow)
2) Feature flag NEW_BOQ_PRICING default OFF
3) Shadow metrics: Δ PLN vs legacy (raport, nie assert równości)
4) Coverage gate: % linii WORK_BOUND + OUR RATE CURRENT + materials complete
5) Cutover F7 per Owner GO
6) Legacy providers: retain until catalog/ath policy closed
7) companyPricePln: remain in model; strip from new path only
8) NIGDY batch migracja companyPricePln → OUR RATE
```

---

## 16. Risks

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Niskie pokrycie OUR RATE | HIGH | coverage gate przed F7 |
| Brak norm materiałów (GAP) | HIGH | status NIEZNANA_NORMA · BOM tylko gdzie pack · Owner Decision |
| Zły workId z ATH | HIGH | Alias golden · UNBOUND > wrong bind |
| Dual Quotes picker | MEDIUM | Bid używa tylko `lookupPriceMemory` |
| Włączenie path bez wyłączenia heurystyki | HIGH | F6 twardy zakaz |
| Regresja PM / work-rate | MEDIUM | harness obowiązkowy każdej fazy |
| Mylenie marży materiału z Bid margin | MEDIUM | kontrakt warstw w DF |
| Catalog/ATH dual results | MEDIUM | policy trybów w DF |

**REGRESSION RISK epiku (po cutover):** HIGH bez gate’ów · **MEDIUM** przy flagach+shadow+coverage.

---

## 17. Conditions

| Warunek | Status |
|---------|--------|
| AUDIT COMPLETE | TAK |
| Material Legal PASS | TAK |
| Work Rate Legal PASS | TAK |
| PM + Nasz katalog cen READY | TAK |
| OUR RATE READY | TAK |
| DF tego epiku | **WYMAGANY** (F0) |
| Owner GO na implementację | **OCZEKIWANY** |
| Uniwersalne normy M | **GAP** / Decision |
| Auto research w Bid | **FORBIDDEN** |
| companyPricePln → OUR RATE | **FORBIDDEN** |

---

## 18. Owner Decisions Required

*(Tylko to, czego nie zamykają wcześniejsze decyzje WGDOM.)*

1. **Normy wielomateriałowe:** czy F5 ogranicza się wyłącznie do istniejących Technology Packs / BOM, a reszta = jawny GAP — **czy** osobny epic „normy materiałowe” (bez invent w tym epiku)?  
2. **STALE w Bid:** czy STALE OUR RATE / PM wolno liczyć do `positionCost` z ostrzeżeniem, czy **blokuje** kompletność pozycji?  
3. **Brak `commercialPricing.marginPct`:** sell = null (blokuje) vs sell = base (margin 0) — która polityka?  
4. **Tryby `ath_priced` / `catalog` po cutover:** wyłączyć na rzecz wyłącznie `offer_boq_ai`+Position Cost, czy legacy równolegle do osobnego GO?  
5. **Minimalny coverage gate przed F7:** jaki próg % linii COMPLETE (np. Owner podaje liczbę / kategorię przetargów pilotowych)?  
6. **Labor-only pozycje** (demontaż / pomiar): czy `positionCost = tylko OUR RATE` jest akceptowalnym COMPLETE bez materiałów?

**NIE pytamy ponownie o:** seed/fallback `companyPricePln`→OUR RATE · second Price Memory · auto research w Bid · usuwanie pola `companyPricePln` w tym epiku · zmianę Legal Gates.

---

## Status

```text
TENDER-BOQ-PRICING-REBUILD-01
AUDIT: COMPLETE
PLAN: COMPLETE
IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED
NEXT: OWNER REVIEW → DESIGN FREEZE → ARCH REVIEW → OWNER GO IMPLEMENT
```

**Dokument:** `docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-PLAN.md` (lokalnie · niecommitowany).
