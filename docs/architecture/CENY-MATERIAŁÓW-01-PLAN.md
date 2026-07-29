# CENY-MATERIAŁÓW-01 — PLAN

> **ID:** CENY-MATERIAŁÓW-01-PLAN  
> **MODE:** **PLAN ONLY** · **DOCS ONLY** · **bez IMPLEMENT / commit / push / DESIGN FREEZE**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **AUDIT:** [`CENY-MATERIAŁÓW-01-AUDIT.md`](CENY-MATERIAŁÓW-01-AUDIT.md) · **PASS** · **READY FOR PLAN**  
> **Baseline tip:** UI **2.65.79** · P3.3 **CLOSED** · AI-COST-02-B **CLOSED** · [`TENDER-CASE-AUDIT-01`](TENDER-CASE-AUDIT-01.md)  
> **SSOT tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-01 Phase 1):

  Zwiększyć udział cen materiałów z Work Catalog
  (controlled_market → work_catalog / companyPrice)
  PRZED spadkiem do category_rate i heuristic_estimate.

  Sukces ≠ Bid == 1,6M · ≠ nowe tabele SKU · ≠ +Supabase QPS.
  Sukces = mierzalny wzrost controlled_market + work_catalog
           na materiałach OfferBoq (fixture + metryki).
════════════════════════════════════════════════════════
```

---

## 0. Wejście i workflow

| Pole | Stan |
|------|------|
| AUDIT | **PASS** · READY FOR PLAN |
| Empiria | Fixture `08dee335`: mat. **category_rate ~71% PLN** · **heuristic ~29%** · **controlled_market 0%** |
| Fundament danych | Work Catalog `marketQuotes` + `companyPricePln` + P3.3 import/coverage **już istnieją** |
| STABILIZATION | **ACTIVE** — IMPLEMENT tylko po DF + Arch Review + Owner GO |

```text
[DONE]  AUDIT
[NOW]   PLAN            → TEN DOKUMENT
[NEXT]  DESIGN FREEZE   → D-* · flag · allowlista · AC
[NEXT]  Architecture Review (#CORE-014 FEATURE)
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
```

---

## 1. Problem → cel Phase 1

### 1.1 Problem (AUDIT)

Łańcuch OfferBoq **już preferuje** market/WC przed category/heuristic, ale na produkcji case:

1. **Słabe / puste** `catalogWorkId` → brak wejścia do `controlled_market` / `work_catalog`.  
2. Nawet przy matchu — **brak / rzadkie** `marketQuotes` → provider market miss.  
3. Spadek: **`category_rate` (seed)** → **`heuristic_estimate` (stałe j.m.)**.

### 1.2 Cel mierzalny

| Cel | Opis |
|-----|------|
| **C1** | Więcej komponentów materiałów z origin **`controlled_market`** |
| **C2** | Więcej z origin **`work_catalog`** (companyPrice → costSplit materiał) |
| **C3** | Spadek udziału **`category_rate`** i **`heuristic_estimate`** w PLN materiałów |
| **C4** | Zero nowych zapytań Supabase / zero nowych tabel KV |

**Anti-cele (zakaz):** target Bid 1,6M · bump Kp/marży/floor · GAP-B · scrapowanie · drugi katalog SKU.

---

## 2. Nowy flow podejmowania decyzji (Phase 1)

Kolejność providerów **pozostaje** (REUSE — nie invertować bezpieczeństwa knowledge):

```text
Dla komponentu category === material:

  [1] company_knowledge     — bez zmian (opt-in lokalny)
  [2] controlled_market     ← WZMOCNIĆ wejście (Quotes + match)
  [3] work_catalog          ← WZMOCNIĆ wejście (companyPrice + match)
  [4] category_rate         — fallback (jawny)
  [5] company_model         — N/A dla materiału
  [6] heuristic_estimate    — last resort (jawny + review)
  [7] external_future       — martwy (OUT rewrite)

Decyzja Phase 1 = nie „nowy łańcuch”, tylko:
  A) więcej linii z poprawnym catalogWorkId
  B) więcej prac z marketQuotes / sensownym companyPrice
  C) telemetria originów + UX wspierający A/B (REUSE P3.3)
```

### 2.1 Drzewo decyzji (materiał)

```text
                    mapOfferBoqLine
                          │
              ┌───────────┴───────────┐
              │ catalogWorkId?        │
              └───────────┬───────────┘
                    NIE │        │ TAK
                        │        ▼
                        │   marketQuotes avg?
                        │    TAK │    NIE
                        │        ▼         ▼
                        │  controlled_   companyPrice>0?
                        │  market HIT     TAK │ NIE
                        │        │         ▼    │
                        │        │   work_catalog│
                        │        │   HIT         │
                        ▼        ▼               ▼
                 category_rate? ──────────► heuristic
                   (seed)                    (last)
```

**Phase 1 dźwignie:** lewa gałąź (brak match) i „NIE Quotes” — nie zmiana formuły Bid.

### 2.2 Warstwy odpowiedzialności

| Warstwa | Phase 1 |
|---------|---------|
| **Dane** | WC store as-is · zasilanie Quotes przez **P3.3** (ops + opcjonalnie UX „ceny”) |
| **Mapowanie** | Ulepszenie / rozszerzenie `mapOfferBoq*` (aliasy, reguły specialty → work) — **thin** |
| **Pricing** | REUSE providerów · bez nowej średniej · bez nowego silnika |
| **Obserwowalność** | Metryki % origin materiałów (unit test + PV probe + opcjonalnie Explain RO) |
| **UI** | Thin: widok/pasek „Ceny materiałów / pokrycie WC” — REUSE coverage P3.3; **nie** osobny ERP |

---

## 3. Punkty integracji z AI-COST

| Punkt | Plik / API | Zmiana Phase 1 (kierunek) |
|-------|------------|---------------------------|
| **I1 Mapowanie** | `tender-offer-boq-mapping.ts` | Więcej trafnych `catalogWorkId` / confidence |
| **I2 Wire providers** | `tender-offer-boq-explainability.ts` | REUSE `leadingProviders` · évent. przekazanie lepszej listy `works` (ten sam store) |
| **I3 Controlled market** | `tender-offer-boq-controlled-price-source.ts` | **ZERO semantyki silnika** · tylko więcej hitów z danych |
| **I4 Work catalog provider** | `createWorkCatalogPriceProvider` | As-is · zależny od match + `companyPricePln` |
| **I5 Pricing engine** | `tender-offer-boq-pricing-engine.ts` | Ostrożnie: **nie** usuwać heuristic; ewentualnie metryki / review flags |
| **I6 Explain / 02-B** | Explain RO | Opcjonalnie: udział originów materiałów (REUSE, nie nowy silnik) |
| **I7 Bid calculator** | `tenders-bid-calculator.ts` | **OUT** Phase 1 (zakaz edycji) |
| **I8 Freeze S1–S7** | AI-COST-01 | **OUT** rewrite |

**Boundary:** FEATURE allowlista wokół mapping + ewentualny thin UI + testy/metryki. **Nie** edytować `cloud-sync.ts` · Payroll · parsers.

---

## 4. Moduły do REUSE (obowiązkowe)

| Moduł | REUSE jak |
|-------|-----------|
| `CatalogWork.marketQuotes` + `computeMarketAverageForWork` | SSOT rynku |
| `createControlledMarketPriceProvider` | Tor ceny materiału z Quotes |
| `createWorkCatalogPriceProvider` / `costSplit` | Tor companyPrice → materiał |
| `mapOfferBoqDocument` | Punkt rozszerzenia match |
| P3.3 flag + CSV commit + coverage | Zasilanie Quotes + KPI pokrycia |
| `createCategoryRatePriceProvider` | Fallback L4 (bez kasowania) |
| `createHeuristicPriceProvider` | Last resort L6 |
| OfferBoq Explain / origin labels | Obserwowalność |
| Flagi LS (wzorzec P3.3 / 02-B / GAP-A) | Gate Phase 1 default **OFF** |

**ZERO DUPLICATE:** zakaz drugiej średniej rynkowej · zakaz drugiego store cen · zakaz scrapera.

---

## 5. Cache (wyłącznie istniejące dane)

| Poziom | Mechanizm | Nowe I/O? |
|--------|-----------|-----------|
| **L0** | Work Catalog już w pamięci procesu / LS po bootstrap | **NIE** |
| **L1** | Podczas `buildOfferBoqDocumentForPipelineItem`: **jedno** wczytanie `works` + `activeRegion` → przekazanie do mapping + providers | **NIE** (już wzorzec) |
| **L2** | Wyniki `computeMarketAverageForWork` — cache per `(workId, region, computedAt)` **w obrębie jednego buildu** dokumentu (jeśli brak — dodać thin memo w DF) | **NIE** sieci |
| **L3** | Cloud: istniejący sync `kw-wgdom-work-catalog` | **NIE** nowych kluczy |

**Zakaz:** polling Edge per linia · nowe `batch-get` keys · Storage bucket.

### 5.1 Potwierdzenie: brak nowych zapytań Supabase

| Check | Phase 1 |
|-------|---------|
| Nowe endpointy Edge | **NIE** |
| Nowe klucze KV | **NIE** |
| Dodatkowe `batch-get` poza istniejącym pipeline | **NIE** |
| Sync WC | As-is (P3.3 commit już używa routera) |
| Company knowledge → cloud | **NIE** (pozostaje local) |

---

## 6. Mierniki sukcesu (AC-orientacyjne → DF)

Baseline empiryczny (AUDIT, fixture `08dee335`, materiały):

| Origin | Udział PLN mat. (baseline) |
|--------|----------------------------|
| `category_rate` | **~71%** |
| `heuristic_estimate` | **~29%** |
| `controlled_market` | **0%** |
| `work_catalog` | **0%** |

### 6.1 KPI Phase 1 (propozycja do zamrożenia w DF)

| ID | KPI | Cel kierunkowy |
|----|-----|----------------|
| **K1** | `% PLN materiałów z controlled_market` | **> 0** na fixture po zasileniu Quotes + match; target DF: **≥ 15%** *lub* udokumentowany floor po Owner GO |
| **K2** | `% PLN materiałów z work_catalog` | **> 0**; target DF: **≥ 10%** (łącznie z K1 preferowane) |
| **K3** | `% PLN z category_rate` | Spadek vs 71% (kierunek **≤ 55%** przy spełnionym K1+K2 — do kalibracji w DF) |
| **K4** | `% PLN z heuristic_estimate` | Spadek vs 29% (kierunek **≤ 20%**) |
| **K5** | `% linii z `catalogWorkId` ≠ null` | Wzrost vs baseline (pomiar w teście) |
| **K6** | Nowe zapytania Supabase / nowe tabele | **= 0** |

**Uwaga PLAN:** dokładne progi % **zamraża DESIGN FREEZE** po ewentualnym Owner GO na agresywność. PLAN wymaga **kierunku** i **instrumentacji**, nie hardcode sukcesu Bid.

### 6.2 Instrumentacja

| Artefakt | Rola |
|----------|------|
| `scripts/…-ceny-materialow-origin-stats.mjs` (lub rozszerzenie probe) | Histogram originów mat. OFF/ON flagi |
| Unit test mapping | Więcej hitów na złotych opisach (stolarka / oddymianie) |
| PV | Fixture `08dee335` · porównanie share originów · regresja Bid bez targetu 1,6M |

---

## 7. Zakres IN / OUT Phase 1

### 7.1 IN

| ID | Element |
|----|---------|
| **IN1** | Feature flag (np. `kw-ceny-materialow-01`) default **OFF** |
| **IN2** | Ulepszenie mapowania OfferBoq → WC (thin, testowalne) |
| **IN3** | Memo/cache average w obrębie jednego buildu OfferBoq (jeśli potrzebne) |
| **IN4** | Metryki / probe share originów materiałów |
| **IN5** | Thin UX: powiązanie z P3.3 coverage / „braki Quotes dla dopasowanych prac” (REUSE) |
| **IN6** | Ops guidance: zasilenie `marketQuotes` przez P3.3 CSV dla prac używanych w matchu |
| **IN7** | Regresja: category/heuristic nadal działają jako fallback |
| **IN8** | Dokumentacja AC + Anti-AC (bez 1,6M / bez Kp) |

### 7.2 OUT

| ID | Element |
|----|---------|
| **O1** | Nowe tabele SKU / nowy KV materials master |
| **O2** | Nowe zapytania / endpointy Supabase |
| **O3** | Scraping / zewnętrzne API cen |
| **O4** | Edycja `tenders-bid-calculator.ts` / formuły stacku |
| **O5** | GAP-B costModel · Kp · marża · floor · hardcode 1,6M |
| **O6** | Rewrite AI-COST S1–S7 / parsers / Discovery |
| **O7** | Payroll · `cloud-sync.ts` CORE · Storage managers |
| **O8** | D-C „ustaw market jako companyPrice” (P3.3 OUT) |
| **O9** | Usunięcie heuristic/category z łańcucha |
| **O10** | Synchronizacja company_knowledge do chmury |

### 7.3 Sugerowane thin slices (kolejność DF)

| Slice | Treść | Zależność |
|-------|-------|-----------|
| **CM-0** | Instrumentacja origin stats + baseline lock | — |
| **CM-1** | Mapping uplift (hit rate `catalogWorkId`) | CM-0 |
| **CM-2** | Quotes coverage path (P3.3 ops + thin UI braków) | P3.3 CLOSED |
| **CM-3** | Build-local memo average (jeśli pomiar pokaże koszt) | CM-1 |
| **CM-4** | PV + flag OFF/ON | CM-1…2 |

**Rekomendacja PLAN:** DF zamraża **CM-0 + CM-1 + CM-2** jako Phase 1 MVP; CM-3 opcjonalnie jeśli needed.

---

## 8. Ryzyka i rollback

### 8.1 Ryzyka

| ID | Ryzyko | P | I | Mitigacja |
|----|--------|---|---|-----------|
| R1 | Fałszywy match → zła cena market | Śr | Wys | Confidence gate · PV · review flag |
| R2 | Quotes puste → KPI nie ruszają mimo mapowania | Wys | Śr | CM-2 + P3.3 import obowiązkowy w PV prep |
| R3 | Scope creep → SKU tables / Supabase | Śr | Krytyczny | OUT O1–O2 · Arch Review |
| R4 | Regresja Bid / OfferBoq totals | Śr | Wys | Flag OFF default · PV OFF parity |
| R5 | Duplikacja średniej rynkowej | Niski | Wys | REUSE only `computeMarketAverageForWork` |
| R6 | Myślenie „sukces = 1,6M” | Wys | Krytyczny | Anti-AC · komunikacja KPI origin |
| R7 | Edycja cloud-sync „przy cache” | Niski | Krytyczny | Bloklista |

### 8.2 Rollback

| Poziom | Akcja |
|--------|-------|
| **L1** | Flag OFF → parity tip (category/heuristic jak dziś) |
| **L2** | Revert FEATURE commit |
| **L3** | Dane Quotes: rollback importu P3.2/P3.3 (istniejący) |
| **L4** | Zakaz cloud un-commit globalnego | OUT |

---

## 9. Payroll Safety Gate (preview)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK wąsko (flaga FEATURE) — jak P3.3 / 02-B
G3 Cloud Sync:   NIE (edycja CORE)
G4 Bootstrap:    NIE
G5–G9:           NIE
Wynik oczekiwany: ALL-NIE poza G2 flag → FEATURE Gate
Owner GO: wymagany (Stabilization + wycena)
```

---

## 10. Zgodność z zasadami

| Zasada | PLAN |
|--------|------|
| SSOT FIRST | `marketQuotes` / `companyPricePln` w WC |
| REUSE FIRST | Providers + mapping + P3.3 |
| ZERO DUPLICATE | Jedna średnia · jeden store |
| MOBILE FIRST | Thin UI coverage — bez nowego dashboardu |
| Payroll Safety | Preview ALL-NIE (+ flaga) |

---

## 11. Kryteria „READY FOR DESIGN FREEZE”

| Check | Stan |
|-------|------|
| Cel Phase 1 = uplift WC/Quotes przed category/heuristic | **TAK** |
| IN/OUT zamknięte | **TAK** |
| REUSE lista | **TAK** |
| Cache bez nowych Supabase Q | **TAK** |
| KPI kierunkowe | **TAK** (progi % → DF) |
| Rollback L1–L3 | **TAK** |
| Anti-AC (1,6M / Kp / SKU tables) | **TAK** |
| Blokery do DF | **BRAK** |

---

## 12. Werdykt PLAN

```text
PLAN STATUS: COMPLETE
IMPLEMENT: NIE
COMMIT / PUSH: NIE
DESIGN FREEZE: NIE (następny krok)

DECYZJA: READY FOR DESIGN FREEZE
```

**Czekam na:** Owner GO DESIGN FREEZE (D-A… · flaga · progi K1–K4 · allowlista CM-0…CM-2).

---

**PLAN STATUS:** **COMPLETE** · **READY FOR DESIGN FREEZE**
