# TENDER-BOQ-PRICING-REBUILD-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE COMPLETE** · **LOCKED** · **NO IMPLEMENTATION** · **NO COMMIT** · **NO PUSH** · **PRODUCTION UNCHANGED**  
> **DATA:** 2026-08-12  
> **SSOT DECYZJI:** ten dokument  
> **INPUT:** [`TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md) · [`TENDER-BOQ-PRICING-REBUILD-01-PLAN.md`](./TENDER-BOQ-PRICING-REBUILD-01-PLAN.md) · [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · Owner Correction P0  
> **BASELINE PROD:** UI **2.66.36** · **PRODUCTION VERIFIED · GREEN**  
> **NEXT:** **ARCH REVIEW** → OWNER GO IMPLEMENT (dopiero po GO · start **FAZA 0**)

---

## 1. Cel

Przebudowa wyceny **pozycji przedmiaru** tak, aby koszt bezpośredni pochodził wyłącznie z:

| Warstwa | SSOT |
|---------|------|
| Robocizna | **Nasz Katalog Robót** → **OUR RATE** (`workId + unit`) |
| Materiał | **Nasz Katalog Cen** → Price Memory → `commercialPricing` → **SELL PRICE** (`materialKey`) |
| Ilości materiałów | **BOM / Technology** (tylko gdy istnieje) |
| Oferta / Bid | **Istniejący** stack `Kp` + `profit` + `minMargin` (**bez zmiany semantyki**) |

```text
PRZEDMIAR
  → IDENTITY ROBOTY (workId + unit)
  → OUR RATE
  + MATERIAŁY (materialKey → SELL PRICE × qty z BOM)
  → POSITION COST ENGINE
  → MATERIAL COST + LABOR COST
  → Bid stack (Kp · profit · minMargin)
  → FINAL BID
```

**Ten Design Freeze nie implementuje nic.** Blokuje kontrakt przed kodem.

---

## 2. Problem

AUDIT ustalił:

1. Bid **nie** czyta OUR RATE.  
2. Bid **nie** czyta sell Price Memory.  
3. OfferBoq **nie** ma `materialKey` na linii.  
4. Ceny idą przez `companyPricePln` split / RBH×FL / heurystykę.  
5. Nowe katalogi (materiały + roboty) są **PRODUCTION READY**, ale **poza** kalkulatorem.  
6. Braki są maskowane heurystyką.

---

## 3. Current Architecture

```text
ATH / przedmiar
  → OfferBoq (+ catalogWorkId)
  → providers: knowledge → marketQuotes avg → companyPricePln split → category → HEURYSTYKA
  → materialsPln / laborPln
  → computeTenderBidProposal → recommendedBidPln
```

Alternatywy: `ath_priced` · `catalog` (RBH × `fullyLoadedHourly`).

Poza Bidem (REUSE, nie ruszać w DF): `lookupWorkRate` · `lookupPriceMemory` / `evaluateMaterialCache` · `computeSellPricePln`.

---

## 4. Target Architecture

```text
Tender BOQ line (ATH = dane wejściowe: opis, jm, qty)
  → Work identity     REUSE Product Mapper / Alias
  → Labor             lookupWorkRate → OUR RATE
  → Material(s)       materialKey + qty(BOM) → PM → sell
  → PositionCostEngine (PURE)
  → Σ positionCost → offerBoqDirect shape
  → computeTenderBidProposal (UNCHANGED stack)
```

**ATH** = źródło wierszy przedmiaru · **nie** SSOT ceny WGDOM.

---

## 5. Position Cost Engine Contract (LOCKED) — ★ FAZA 0

### 5.1 Charakter

| Właściwość | LOCK |
|------------|------|
| Pure | **TAK** |
| Deterministic | **TAK** |
| HTTP | **FORBIDDEN** |
| Storage side effects | **FORBIDDEN** |
| Research | **FORBIDDEN** |
| Owner Accept | **FORBIDDEN** |
| Odczyt `companyPricePln` | **FORBIDDEN** |
| Live / Edge | **FORBIDDEN** |

Engine **otrzymuje** gotowe inputy i **zwraca** wynik. Nie szuka w store, nie fetchuje, nie zapisuje.

### 5.2 INPUT (kontrakt)

```text
PositionCostInput = {
  quantity: number              // ilość pozycji przedmiaru (jm linii)
  unit: WgdomCostUnit           // jm linii

  labor: {
    status: "CURRENT" | "STALE" | "MISSING" | "NO_IDENTITY"
    ourRatePln: number | null   // zł / unit · tylko gdy status pozwala podać wartość
    // Semantyka: OUR RATE = stawka labor-only za 1 unit pozycji
    // laborCost = quantity × ourRatePln   (gdy policzalne)
  }

  materials: Array<{
    materialKey: string | null
    status: "CURRENT" | "STALE" | "MISSING" | "NO_KEY" | "NO_BOM" | "NO_NORM"
    quantity: number | null     // ilość materiału (absolutna na pozycję)
    quantityUnit: string | null
    sellPricePln: number | null // już po marży materiału
    // material line cost = quantity × sellPricePln (gdy policzalne)
  }>
}
```

**Semantyka labor:** `ourRatePln` = **zł / unit pozycji** (nie stawka godzinowa).  
**Nie** mnożyć tu `laborRbhPerUnit × fullyLoadedHourly` jako SSOT (normy FL pozostają poza engine — DF Work Catalog LOCKED, ale nie źródło nowej ceny).

### 5.3 OUTPUT (kontrakt)

```text
PositionCostResult = {
  laborCostPln: number | null
  materialCostPln: number | null
  totalPositionCostPln: number | null

  laborComputable: boolean
  materialsComputable: boolean
  positionComplete: boolean      // wszystkie wymagane składowe policzalne wg reguł fazy

  issues: Array<{
    code:
      | "BRAK_IDENTITY_ROBOTY"
      | "BRAK_OUR_RATE"
      | "STALE_OUR_RATE"
      | "BRAK_MATERIAL_KEY"
      | "BRAK_CENY_MATERIALU"
      | "STALE_MATERIAL_PRICE"
      | "BRAK_BOM"
      | "BRAK_NORMY_MATERIALU"
    messagePl: string
  }>
}
```

### 5.4 Reguły obliczeń (LOCKED)

```text
laborCost = quantity × ourRatePln
  gdy labor.status ∈ { CURRENT } OR (STALE ∧ polityka „użyj z flagą” — patrz §20)
  w przeciwnym razie laborCost = null + issue

materialLineCost = mat.quantity × mat.sellPricePln
  gdy mat.status ∈ { CURRENT } OR (STALE ∧ polityka §20)
    ∧ quantity ≠ null ∧ sellPricePln ≠ null
  w przeciwnym razie nie wliczaj + issue

materialCost = Σ materialLineCost (tylko policzalne linie)
totalPositionCost = laborCost + materialCost
  gdy obie strony wymagane przez typ pozycji są policzalne;
  labor-only: materialCost = 0 dozwolone gdy materials[] puste i brak wymogu BOM
```

Engine **nie** inventuje qty · **nie** inventuje cen · **nie** czyta legacy.

---

## 6. Work Identity Contract (LOCKED)

```text
WorkIdentity = workId + unit
workId = CatalogWork.id
```

| Zasada | LOCK |
|--------|------|
| Drugi system identity | **FORBIDDEN** |
| REUSE | `mapOfferBoqLine` · Alias Pack · Core score · negation · Biblioteka |
| Rozszerzenia | tylko Alias / golden ATH→workId — nie nowy NLP |
| Brak bind | **BRAK_IDENTITY_ROBOTY** — nie zgadywać ceny |
| ATH | źródło opisu/qty/jm — nie cena |

`catalogWorkId` na OfferBoq = ten sam `workId` (REUSE nazwy pola dozwolone).

---

## 7. Material Identity Contract (LOCKED)

```text
MaterialIdentity = materialKey
```

| Niewystarczające jako identity ceny | |
|-------------------------------------|--|
| samo `catalogWorkId` | **NIE** SSOT materiału |
| samo `unit` | **NIE** |
| `companyPricePln` | **NIE** |

| REUSE | |
|-------|--|
| `resolveDemandProductIdentityExact` | TAK |
| `DEFAULT_MATERIAL_MARKET_MAP` | TAK |
| `mat.*` / `mat.inv.*` / `cw.inv.*` / `cw.product.*` / `wc.market.*` | TAK (hosty / mapa) |
| `extractExactAliasLinesFromOfferBoq` | TAK |
| Drugi material identity / druga mapa | **FORBIDDEN** |

Brak klucza → **BRAK_MATERIAL_KEY**.

---

## 8. OUR RATE Contract (LOCKED)

| Zasada | LOCK |
|--------|------|
| SSOT robocizny (nowy tor) | **wyłącznie OUR RATE** |
| Identity | `workId + unit` |
| CURRENT | **REUSE** · 0 HTTP |
| STALE | **nie** auto-research w Bid · jawny **STALE_OUR_RATE** |
| MISSING | jawny **BRAK_OUR_RATE** |
| `companyPricePln` fallback | **FORBIDDEN** |
| `companyPricePln` seed / auto-migracja | **FORBIDDEN** |
| Lookup (adapter, poza pure engine) | REUSE `lookupWorkRate` |
| Research / Accept | poza Bid · Owner / katalog |

---

## 9. Material Price Contract (LOCKED)

```text
materialKey
  → lookupPriceMemory / evaluateMaterialCache   (adapter)
  → basePrice
  → commercialPricing.marginPct
  → computeSellPricePln → sellPricePln
  → PositionCostEngine (sell już w INPUT)
```

| Zasada | LOCK |
|--------|------|
| SSOT | Nasz Katalog Cen / Price Memory |
| Drugi Price Memory | **FORBIDDEN** |
| CURRENT | REUSE · 0 HTTP |
| STALE / MISSING | jawny status · Owner action · **nie** auto research w Bid |
| `commitMarketQuotesImport` z Bid | **FORBIDDEN** |

---

## 10. BOM Contract (LOCKED)

```text
Jedna robota → N materiałów  = DOZWOLONE
Automatyczne qty materiałów = TYLKO z rzeczywistego BOM / Technology Pack
```

| Zakaz | |
|-------|--|
| Heurystyka „typowo X kg kleju” | **FORBIDDEN** |
| Invent norm (klej, fuga, grunt, farba, profile, wkręty, …) | **FORBIDDEN** |
| Qty z `companyPricePln` / split pieniężny | **FORBIDDEN** |

| Status gdy brak | |
|-----------------|--|
| Brak BOM dla multi-material | **BRAK_BOM** / **GAP** |
| BOM bez normy pozycji | **BRAK_NORMY_MATERIALU** |

**REUSE:** Execution Expert / Technology `GeneratedBom` — wyłącznie tam, gdzie pack/norma istnieje.  
**Poza zakresem epiku:** budowa uniwersalnego katalogu norm materiałowych (osobny epic po Owner GO).

Labor-only (puste `materials[]`, brak wymogu BOM) = dozwolone COMPLETE labor.

---

## 11. Missing Data Contract (LOCKED)

| Kod | Znaczenie | Maskowanie |
|-----|-----------|------------|
| `BRAK_IDENTITY_ROBOTY` | brak workId | **FORBIDDEN** |
| `BRAK_OUR_RATE` | OUR RATE MISSING | **FORBIDDEN** |
| `STALE_OUR_RATE` | OUR RATE STALE | **FORBIDDEN** ukrywać |
| `BRAK_MATERIAL_KEY` | brak materialKey | **FORBIDDEN** |
| `BRAK_CENY_MATERIALU` | PM MISSING | **FORBIDDEN** |
| `STALE_MATERIAL_PRICE` | PM STALE | **FORBIDDEN** ukrywać |
| `BRAK_BOM` | brak Technology BOM | **FORBIDDEN** invent |
| `BRAK_NORMY_MATERIALU` | brak qty w BOM | **FORBIDDEN** invent |

Heurystyka cenowa OfferBoq **nie** może być użyta w **nowym torze** do wypełnienia braków.

---

## 12. Margin Separation (LOCKED)

| Warstwa | Pola | Gdzie działa |
|---------|------|--------------|
| **Marża materiału** | `commercialPricing.marginPct` → SELL | przed Position Cost |
| **Warstwa Bid** | `kpPct` · `profitPct` · `minMarginPct` (+ risk / poboczne jak dziś) | **po** Position Cost · **UNCHANGED** |

```text
SELL ≠ floorBid
marginPct materiału ≠ profitPct ≠ minMarginPct
```

Mieszanie semantyk = **FORBIDDEN**.

---

## 13. `companyPricePln` Boundary (LOCKED)

```text
companyPricePln = TECHNICAL LEGACY FIELD
  ≠ OUR RATE
  ≠ fallback
  ≠ seed
  ≠ źródło Position Cost Engine
```

| Akcja w tym epiku (do Fazy 5 włącznie) | |
|----------------------------------------|--|
| Usunąć pole | **NIE** |
| Migrować → OUR RATE | **FORBIDDEN** |
| Czytać w Position Cost Engine | **FORBIDDEN** |
| Zmieniać istniejące ścieżki Bid/Offer (stary tor) | **NIE** w Fazach 0–4 · cutover = Faza 5 (flaga) |
| Wycofanie ze starych providerów | **Faza 6** · osobny audyt + GO |

Zgodność z [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

---

## 14. Bid Boundary (LOCKED)

| Element | LOCK |
|---------|------|
| `computeTenderBidProposal` stack | **UNCHANGED** semantyka `Kp` / `profit` / `minMargin` |
| Punkt integracji | Position Cost → sumy `materialsPln`/`laborPln` → `offerBoqDirect` → Bid |
| Cutover | **Faza 5** · osobny Owner GO |
| Zmiana `profitPct` / `minMarginPct` / `kpPct` | **FORBIDDEN** w tym epiku |
| Offer Expert margin | poza zakresem (nie sync w DF) |
| Tryby `ath_priced` / `catalog` | do Fazy 5: stary tor żyje; polityka po cutover — §20 |

Historyczne **P7** (Work Catalog DF) = **Faza 5** tego dokumentu.

---

## 15. Cache-first Contract (LOCKED)

```text
Bid open / kalkulacja / Position Cost:
  CURRENT → REUSE
  STALE   → jawny status + Owner action (poza Bid)
  MISSING → jawny status + Owner action (poza Bid)

ZERO:
  mass research
  full catalogue research
  automatic live HTTP
  Edge fetch z ścieżki Bid
```

Adaptery lookup (Fazy 1–2) = **synchroniczny odczyt cache/store** · bez research.

---

## 16. Implementation Phases (LOCKED order)

### FAZA 0 — Pure Position Cost Engine

| | |
|--|--|
| **SCOPE** | Pure lib · kontrakt INPUT/OUTPUT · reguły §5 · harness |
| **OUT** | OfferBoq schema · Bid wire · HTTP · store writes · UI |
| **INPUT** | fixture PositionCostInput |
| **OUTPUT** | PositionCostResult |
| **TESTS** | §17 #1–15 (engine-level) |
| **REGRESSIONS** | import-only work-rate / PM (bez zmian) |
| **OWNER GO** | **TAK** (start implementacji epiku) |

### FAZA 1 — OUR RATE integration (adapter)

| | |
|--|--|
| **SCOPE** | Adapter: `lookupWorkRate` → labor input engine · statusy CURRENT/STALE/MISSING · flaga OFF default |
| **OUT** | Bid cutover · materialKey · wyłączenie heurystyki globalnie · zmiana stacku Bid |
| **INPUT** | workId + unit |
| **OUTPUT** | labor slice PositionCostInput |
| **TESTS** | #1, #5, #7, #12–15, #17 |
| **REGRESSIONS** | work-rate P0/P1/P2/RW-03 · Bid flaga OFF |
| **OWNER GO** | **TAK** |

### FAZA 2 — materialKey + Price Memory / sell

| | |
|--|--|
| **SCOPE** | Additive bindings materialKey · REUSE PE resolver · `evaluateMaterialCache` + `computeSellPricePln` → engine · flaga OFF |
| **OUT** | multi-BOM qty · Bid cutover · second PM · auto research |
| **INPUT** | linia + materialKey |
| **OUTPUT** | materials[] z sell |
| **TESTS** | #2, #3 (1 mat), #6, #8, #11, #14–16 |
| **REGRESSIONS** | PM C01–03 · LIVE-08 · MMR-02 · invoice · mapping |
| **OWNER GO** | **TAK** |

### FAZA 3 — BOM Technology / multi-material

| | |
|--|--|
| **SCOPE** | Most `GeneratedBom` → qty · N materiałów · GAP gdy brak BOM |
| **OUT** | invent norm · uniwersalny katalog klej/fuga |
| **INPUT** | workId + packs Technology |
| **OUTPUT** | materials[] z qty lub BRAK_BOM / BRAK_NORMY |
| **TESTS** | #3, #4, #9, #10 |
| **REGRESSIONS** | Execution Expert / Technology packs |
| **OWNER GO** | **TAK** |

### FAZA 4 — BOQ integration

| | |
|--|--|
| **SCOPE** | OfferBoq line → budowa PositionCostInput · zapis wyników na komponentach/agregatach (additive) · new path flaga OFF · **bez** zmiany `recommendedBidPln` |
| **OUT** | cutover Bid · usuwanie `companyPricePln` · zmiana Kp/profit |
| **INPUT** | OfferBoq document |
| **OUTPUT** | position costs na liniach + sumy shadow |
| **TESTS** | #1–15 na BOQ fixtures · shadow Δ vs legacy (raport) |
| **REGRESSIONS** | OfferBoq mapping/pricing stary tor · Bid |
| **OWNER GO** | **TAK** |

### FAZA 5 — Bid cutover

| | |
|--|--|
| **SCOPE** | New path ON → `offerBoqDirect` z Position Cost → `computeTenderBidProposal` · stack UNCHANGED |
| **OUT** | zmiana minMargin/profit/Kp · hard delete legacy providers · Offer Expert rewrite |
| **INPUT** | sumy z Fazy 4 |
| **OUTPUT** | `recommendedBidPln` z new direct |
| **TESTS** | #18 + pełny Bid harness · PV |
| **REGRESSIONS** | Bid · Offer · CATALOG-BID · work-rate · PM |
| **OWNER GO** | **TAK** (osobny · = historyczne P7) |

### FAZA 6 — Wycofanie starych źródeł cenowych

| | |
|--|--|
| **SCOPE** | Po **osobnym audycie**: wyłączenie heurystyki / `companyPricePln` provider / controlled avg jako SSOT w wycenie · liczniki „wycenione” |
| **OUT** | usuwanie pola `companyPricePln` z modelu (nadal NIE bez GO) · Legal Gates |
| **INPUT** | audyt post-cutover |
| **OUTPUT** | legacy path OFF |
| **TESTS** | negatywy: brak fallbacku · brak heurystyki |
| **REGRESSIONS** | pełny zestaw §18 |
| **OWNER GO** | **TAK** + audyt |

---

## 17. Test Contract (LOCKED — wymagane)

| # | Case |
|---|------|
| 1 | labor only |
| 2 | material only |
| 3 | labor + material |
| 4 | multiple materials |
| 5 | missing OUR RATE |
| 6 | missing material price |
| 7 | stale OUR RATE |
| 8 | stale material |
| 9 | missing BOM |
| 10 | missing material norm |
| 11 | material margin → sell |
| 12 | `companyPricePln` ≠ OUR RATE |
| 13 | no companyPrice fallback |
| 14 | CURRENT reuse |
| 15 | zero HTTP (engine + Bid path) |
| 16 | Price Memory regression |
| 17 | Work Rate Memory regression |
| 18 | Bid regression |
| 19 | Offer regression |

Każda faza: subset + regresje z tabeli faz · **0 FAIL** przed zamknięciem.

---

## 18. Regression Contract (LOCKED)

| Obszar | Wymaganie |
|--------|-----------|
| Price Memory / Nasz katalog cen | UNCHANGED semantyka · C01–03 PASS |
| Nasz Katalog Robót / OUR RATE | UNCHANGED · P0/P1/P2/RW-03 PASS |
| Work Rate Legal Gate | **NO TOUCH** |
| Material Legal Gate | **NO TOUCH** |
| Biblioteka definicji | NO TOUCH taksonomii |
| Bid (do Fazy 5 OFF) | recommended / stack bez regresji |
| Offer / OfferBoq stary tor | bez regresji do cutover |
| invoice · LIVE-08 · MMR-02 | PASS |
| `companyPricePln` bitowo | preserve · no seed OUR RATE |

---

## 19. Forbidden Behaviors (LOCKED)

```text
FORBIDDEN:
  companyPricePln → OUR RATE / fallback / seed / Position Cost input
  drugi Price Memory / drugi Work Rate DB
  auto live research / mass / full catalogue z Bid lub Engine
  heurystyka cenowa w nowym torze
  invent norm materiałów (klej/fuga/grunt/farba/…)
  qty materiałów bez BOM
  maskowanie braków
  zmiana semantyki kpPct / profitPct / minMarginPct w tym epiku (F0–F5)
  implementacja bez Owner GO fazy
  hard cutover bez Fazy 0–4
  usuwanie companyPricePln w F0–F5
```

---

## 20. Owner Decisions

### 20.1 Zamknięte tym Design Freeze (+ wcześniejsze WGDOM)

| Decyzja | Status |
|---------|--------|
| Position Cost Engine first · pure | **LOCKED** |
| OUR RATE jedyny SSOT robocizny (nowy tor) | **LOCKED** |
| materialKey + PM + sell | **LOCKED** |
| Multi-material tylko z BOM · inaczej GAP | **LOCKED** |
| Braki jawne · bez heurystyki | **LOCKED** |
| Bid stack Kp/profit/minMargin bez zmian | **LOCKED** |
| Cutover = Faza 5 · osobny GO | **LOCKED** |
| `companyPricePln` technical legacy · no seed | **LOCKED** |
| Marża materiału ≠ Bid margin | **LOCKED** |
| Cache-first · zero research w Bid | **LOCKED** |
| REUSE identity (work + material) | **LOCKED** |
| Kolejność faz 0→6 | **LOCKED** |

### 20.2 Nadal wymagają Ownera (przed/przy implementacji)

1. **STALE w koszcie:** czy wartość STALE wolno wliczać do `laborCost`/`materialCost` z flagą, czy STALE = zawsze `null` cost (tylko status)?  
2. **Brak `commercialPricing.marginPct`:** blokada sell (`null`) vs `sell = base` (margin 0)?  
3. **Pilot coverage przed Fazą 5:** jaki minimalny zestaw przetargów / % linii COMPLETE?  
4. **Po Fazie 5:** tryby `ath_priced` / `catalog` — wyłączyć od razu, czy legacy do Fazy 6?

*(Normy uniwersalne poza BOM = poza epikiem — nie pytamy o invent.)*

---

## 21. Exit Criteria

### Design Freeze

```text
DESIGN FREEZE: COMPLETE
Dokument: docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md
IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED
NEXT: ARCH REVIEW
```

### Epik (po Fazach 0–5 + opcjonalnie 6)

```text
Position Cost = SSOT direct cost nowego toru
OUR RATE + SELL = jedyne źródła M/R w new path
Bid stack UNCHANGED semantyka
Braki jawne · 0 heurystyka w new path
companyPricePln nie zasila new path
Legal Gates / PM / Work Rate Memory bez regresji
PV GREEN na cutover
```

---

## Powiązania

| Dokument | Rola |
|----------|------|
| [`TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md) | stan faktyczny |
| [`TENDER-BOQ-PRICING-REBUILD-01-PLAN.md`](./TENDER-BOQ-PRICING-REBUILD-01-PLAN.md) | plan faz (uszczegółowiony i **LOCKED** tu jako 0–6) |
| [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) | OUR RATE / companyPricePln |
| [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md) | zakaz seed |

---

**STOP** — czekaj na **ARCH REVIEW** / **OWNER GO**. Nie implementuj · nie commituj · nie pushuj.
