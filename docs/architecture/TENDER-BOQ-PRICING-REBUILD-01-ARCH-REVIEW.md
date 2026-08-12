# TENDER-BOQ-PRICING-REBUILD-01 — ARCH REVIEW

> **STATUS:** **ARCH REVIEW COMPLETE**  
> **WERDYKT:** **PASS WITH CONDITIONS**  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · [`…-PLAN.md`](./TENDER-BOQ-PRICING-REBUILD-01-PLAN.md) · [`…-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-AUDIT.md)  
> **BASELINE:** UI **2.66.36** · **PRODUCTION VERIFIED · GREEN**  
> **TRYB:** wyłącznie przegląd architektury · **ZERO** kodu · commit · push · produkcji

---

## 1. Executive Summary

Design Freeze jest **architektonicznie spójny** z celem Ownera (OUR RATE + Price Memory sell → Position Cost → Bid stack UNCHANGED) i z gotowymi warstwami produkcyjnymi (katalogi + Legal Gates PASS).

**Nie ma BLOCKER-a** uniemożliwiającego start **Fazy 0** (pure engine).

Werdykt: **PASS WITH CONDITIONS** — twarde warunki wdrożeniowe (identity, BOM, brak wycieku `companyPricePln`, polityka STALE/margin, granica equipment/transport, persist OfferBoq, coverage przed cutover). Semantyki DF **nie zmieniano**.

---

## 2. SSOT

| Warstwa | SSOT | Werdykt |
|---------|------|---------|
| Definicja roboty | Biblioteka / `CatalogWork` | **PASS** |
| Stawka robocizny (nowy tor) | OUR RATE (`workId+unit`) | **PASS** |
| Cena materiału | Price Memory → sell (`materialKey`) | **PASS** |
| Ilości M | BOM / Technology only | **PASS** |
| Oferta | istniejący Bid stack | **PASS** |
| `companyPricePln` | technical legacy · nie SSOT | **PASS** |

Konflikt z wcześniejszym Work Catalog DF: **brak** — ten epic **konsumuje** OUR RATE / PM, nie redefiniuje ich.

---

## 3. Position Cost Engine

| Wymaganie DF | Werdykt |
|--------------|---------|
| Pure / deterministic | **PASS** |
| Bez HTTP / research / storage / Accept | **PASS** |
| Bez bezpośredniego `companyPricePln` | **PASS** |
| INPUT: qty, unit, labor, materials[], sell, qty mat | **PASS** |
| OUTPUT: laborCost, materialCost, total, issues | **PASS** |
| Semantyka OUR RATE = zł/unit pozycji | **PASS** |

### Luki (nie BLOCKER Fazy 0)

| Luka | Ocena |
|------|-------|
| Polityka STALE → czy `ourRatePln`/`sell` wliczane | **CONDITION C-STALE-1** (Owner) |
| Brak marginPct → sell | **CONDITION C-MARGIN-1** (Owner) |
| Equipment / transport / auxiliary poza engine | **CONDITION C-AUX-1** (dziś Bid dolicza je do „labor” w adapterze) |
| Walidacja `quantity ≤ 0` / NaN | do doprecyzowania w impl Fazy 0 (fail-loud) — **nie** zmienia DF |

**CONDITION C-PCE-1:** implementacja Fazy 0 **musi** pozostać pure (brak importów store/Edge/`companyPricePln`). Testy zero HTTP + negatyw: engine nie przyjmuje / nie czyta legacy.

---

## 4. Work Identity

| Zasada | Werdykt |
|--------|---------|
| `workId + unit` · REUSE Product Mapper / Alias / KNR / keywords | **PASS** |
| Brak drugiego systemu identity | **PASS** |
| BRAK_IDENTITY zamiast cichego fallbacku | **PASS** (DF) |

### CONDITION C-WID-1 — pewność mapowania ATH→workId

Obecny mapper jest **heurystyczny**. DF poprawnie wymaga `WORK_UNBOUND` / `BRAK_IDENTITY_ROBOTY` zamiast zgadywania ceny.

**Warunek:** Fazy 1/4 nie wolno „ratować” unbound przez `companyPricePln`, category rate ani heurystykę cenową. Rozszerzenia = Alias/golden (osobne GO), nie silent fallback.

**Nie BLOCKER** Fazy 0 (engine dostaje już złożony labor status).

---

## 5. Material Identity

| Zasada | Werdykt |
|--------|---------|
| `materialKey` wymagany do ceny M | **PASS** |
| REUSE PE resolver / mapa | **PASS** |
| Zakaz catalogWorkId-only / companyPrice jako cena M | **PASS** |
| Zakaz drugiego identity | **PASS** |

### Ryzyko: jedna pozycja → wiele `materialKey`

DF **obsługuje** (`materials[]` + BOM). Bez BOM → **BRAK_BOM** / GAP — **PASS**.

### CONDITION C-MID-1

Faza 2: binding `materialKey` additive; AMBIGUOUS exact match → **nie** wybierać „najlepszego” cicho — issue + brak kosztu M.

---

## 6. OUR RATE

| Zasada | Werdykt |
|--------|---------|
| SSOT nowego toru | **PASS** |
| CURRENT → REUSE | **PASS** |
| STALE/MISSING jawne | **PASS** |
| Zakaz fallback/seed/migracji `companyPricePln` | **PASS** |
| Lookup poza engine: `lookupWorkRate` | **PASS** |
| Research poza Bid | **PASS** |

Storage: `normalizeCatalogWork` już preserve `ourWorkRate` via `normalizeOurWorkRate` — **PASS** dla Work Rate Memory (patrz §13).

---

## 7. Material Price Memory

| Zasada | Werdykt |
|--------|---------|
| `materialKey` → PM → base → margin → sell | **PASS** |
| REUSE `lookupPriceMemory` / `evaluateMaterialCache` / `computeSellPricePln` | **PASS** |
| Drugi PM | **FORBIDDEN** · **PASS** |
| Bid bez `commitMarketQuotesImport` | **PASS** |

---

## 8. BOM

| Zasada | Werdykt |
|--------|---------|
| Multi-material tylko z rzeczywistym BOM/Technology | **PASS** — DF skutecznie blokuje |
| Invent / typowe normy klej/fuga/… | **FORBIDDEN** · **PASS** |
| Brak BOM → GAP | **PASS** |
| REUSE `GeneratedBom` gdzie pack istnieje | **PASS** |

### CONDITION C-BOM-1

Faza 3: most **tylko** z istniejących packów; brak pack = issue, nie „domyślna receptura”. Uniwersalny katalog norm = **poza epikiem**.

---

## 9. Material / Labor Separation

| Warstwa | Werdykt |
|---------|---------|
| `laborCost` vs `materialCost` jawne w OUTPUT | **PASS** |
| `total = labor + material` | **PASS** |
| Rozdział od Kp / profit / minMargin | **PASS** |
| Marża materiału kończy się na sell | **PASS** |

Obecny Bid miesza equipment/transport/auxiliary w bucket „labor” przy agregacji — **C-AUX-1** (nie psuje separation M↔R w engine; wymaga granicy przy cutover).

---

## 10. `companyPricePln` Boundary

| Zasada | Werdykt |
|--------|---------|
| TECHNICAL LEGACY | **PASS** |
| ≠ OUR RATE / fallback / seed / auto migration | **PASS** |
| Engine nie czyta | **PASS** |
| Stary Bid/Offer do Fazy 5 bez zmiany | **PASS** |
| Wycofanie = Faza 6 + audyt | **PASS** |

### CONDITION C-CPLN-1 — anty-wyciek

Miejsca ryzyka (AUDIT): `createWorkCatalogPriceProvider`, `splitCompanyPrice`, `work-catalog-engine-adapter`, licznik „wycenione”.

**Warunek:** new path (Fazy 1–5 flaga) **nie** woła tych źródeł jako input Position Cost. Test negatywny obowiązkowy (#12–13 DF).

---

## 11. Bid Boundary

| Zasada | Werdykt |
|--------|---------|
| Stack Kp / profitPct / minMarginPct UNCHANGED | **PASS** |
| Cutover = Faza 5 · osobny GO | **PASS** |
| Punkt integracji: sumy → `offerBoqDirect` → `computeTenderBidProposal` | **PASS** |
| Zakaz zmiany semantyki stacku w F0–F5 | **PASS** |

Historyczne Work Catalog **P7** ≡ **Faza 5** — spójne.

---

## 12. Cache-first

| Zasada | Werdykt |
|--------|---------|
| CURRENT → REUSE | **PASS** |
| STALE/MISSING → status + Owner action | **PASS** |
| Bid / Engine bez auto live research / mass / full catalogue | **PASS** |

Adaptery Fazy 1–2 = synchroniczny odczyt cache — zgodne z purity engine (HTTP w engine **FORBIDDEN**).

---

## 13. Storage

| Obszar | Stan | Werdykt |
|--------|------|---------|
| `kw-wgdom-work-catalog` | jeden KV · sync | **PASS** |
| `ourWorkRate` + history w `normalizeCatalogWork` | już w allowliście | **PASS** |
| `marketQuotes` / `commercialPricing` / `companyPricePln` | preserve | **PASS** (nie ruszać) |
| Merge LWW **store-level** | znane ryzyko (jak PM) | **CONDITION C-LWW-1** |
| OfferBoq additive `materialBindings` / position costs | schema + ewentualny persist/normalize | **CONDITION C-STORE-1** |

**C-LWW-1:** nie inventować per-work LWW w tym epiku bez osobnego DF sync; dokumentować + regresja (jak Work Catalog ARCH C4).

**C-STORE-1:** jeśli Faza 4 zapisuje nowe pola na dokumencie OfferBoq / tender state — **jawna allowlista normalize**; inaczej pola znikną. Preferencja: wyliczanie runtime (mniej persist) do momentu gdy UI wymaga snapshotu.

---

## 14. ATH

| Granica | Werdykt |
|---------|---------|
| ATH = źródło wierszy (opis, jm, qty) | **PASS** |
| ATH nie omija Work Identity / OUR RATE / Engine | **PASS** (DF) |
| `ath_priced` = stary tor do cutover | **PASS** |
| ATH nie nadpisuje OUR RATE / PM | **PASS** |

### CONDITION C-MODE-1

Po Fazie 5: polityka `ath_priced` / `catalog` vs wyłącznie new path — **Owner Decision** (już w DF §20.2).

---

## 15. Conditions (twarde nazwy)

| ID | Treść | Blokuje |
|----|-------|---------|
| **C-PCE-1** | Engine pure · 0 HTTP · 0 `companyPricePln` · 0 research | Faza 0 exit |
| **C-WID-1** | Unbound work → brak ceny · zero silent fallback | Fazy 1/4 |
| **C-MID-1** | Materiał bez `materialKey` / ambiguous → brak kosztu M | Faza 2 |
| **C-BOM-1** | Multi-material tylko BOM · inaczej GAP | Faza 3 |
| **C-CPLN-1** | New path nie czyta `companyPricePln` / split jako SSOT | Fazy 1–5 |
| **C-STALE-1** | Polityka STALE w koszcie (Owner) przed zamknięciem F1/F5 | F1 close / F5 |
| **C-MARGIN-1** | Polityka braku `marginPct` (Owner) | F2 close / F5 |
| **C-AUX-1** | Granica equipment/transport/auxiliary przy cutover | Faza 5 |
| **C-STORE-1** | Persist/normalize additive OfferBoq fields | Faza 4 |
| **C-LWW-1** | Świadomość LWW store-level WC · bez redesign sync | dokumentacja + testy |
| **C-COV-1** | Coverage gate przed Bid cutover (Owner próg) | Faza 5 |
| **C-MODE-1** | Polityka ath/catalog po cutover | Faza 5/6 |

**Żaden CONDITION nie jest BLOCKER-em startu Fazy 0** po Owner GO IMPLEMENT.

---

## 16. Regression Risk

| Obszar | Ryzyko | Uzasadnienie |
|--------|--------|--------------|
| Price Memory / Nasz katalog cen | **LOW** (F0–F2 OFF) → **MEDIUM** (F2 ON) | REUSE odczytu; zakaz write z Bid |
| Nasz Katalog Robót / OUR RATE | **LOW** → **MEDIUM** | lookup only; normalize już OK |
| Biblioteka definicji | **LOW** | no taxonomy change |
| Bid (flag OFF) | **LOW** | cutover dopiero F5 |
| Bid (F5 ON) | **HIGH** | zmiana źródła direct · coverage · C-AUX |
| Offer / OfferBoq | **MEDIUM** | additive schema · stary tor równolegle |
| `companyPricePln` | **MEDIUM** | wyciek do new path (C-CPLN-1) |
| invoice / MMR-02 / LIVE-08 | **LOW–MEDIUM** | regresje obowiązkowe F2+ |
| Tender flows ATH | **MEDIUM** | identity unbound ↑ widoczność braków |

**REGRESSION RISK epiku (z flagami + F0 first):** **MEDIUM**  
**REGRESSION RISK cutover F5 bez gate:** **HIGH**

---

## 17. Owner Decisions

*(Tylko otwarte — zgodne z DF §20.2; nie powtarzamy zamkniętych zakazów.)*

1. **C-STALE-1:** STALE — wliczać z flagą czy cost = null?  
2. **C-MARGIN-1:** brak `commercialPricing.marginPct` — blokada vs sell=base?  
3. **C-COV-1:** minimalny coverage / pilot przed Fazą 5?  
4. **C-MODE-1:** po cutover — wyłączyć `ath_priced`/`catalog` od razu czy do Fazy 6?  
5. **C-AUX-1:** equipment/transport/auxiliary — 0 w new path, osobne komponenty później, czy tymczasowo legacy providers poza Position Cost?

---

## 18. Final Verdict

```text
ARCH REVIEW: PASS WITH CONDITIONS

POSITION COST ENGINE: PASS (kontrakt) · C-PCE-1 na impl
OUR RATE: PASS
MATERIAL PRICE MEMORY: PASS
MATERIAL + LABOR: PASS (separation) · C-AUX-1 przy Bid
BOM: PASS (blokada invent skuteczna) · C-BOM-1
WORK IDENTITY: PASS · C-WID-1
MATERIAL IDENTITY: PASS · C-MID-1
COMPANYPRICEPLN: PASS (boundary) · C-CPLN-1
BID: UNCHANGED (do Fazy 5)
CACHE-FIRST: PASS
ZERO AUTO RESEARCH: PASS
STORAGE: PASS OUR RATE · C-STORE-1 / C-LWW-1
ATH: PASS · C-MODE-1
PHASE ORDER 0→6: PASS (bez korekty)

IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED

NEXT: OWNER GO IMPLEMENT (start FAZA 0)
       lub rozstrzygnięcie C-STALE-1 / C-MARGIN-1 / C-AUX-1 przed F1/F5
```

### Kolejność faz

**PASS — bez korekty.** Pure engine → OUR RATE → materialKey/sell → BOM → BOQ → Bid cutover → legacy audit jest właściwa względem architektury (Bid konsumuje sumy; najpierw mierzalny koszt pozycji).

---

## Powiązania

- DF: [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md)  
- PLAN / AUDIT: ten sam katalog `docs/architecture/`  
- Work Catalog ARCH (wzorzec C1/C4): [`WORK-CATALOG-REBUILD-01-ARCH-REVIEW.md`](./WORK-CATALOG-REBUILD-01-ARCH-REVIEW.md)

---

**STOP** — czekaj na decyzję Ownera. Nie implementuj · nie commituj · nie pushuj.
