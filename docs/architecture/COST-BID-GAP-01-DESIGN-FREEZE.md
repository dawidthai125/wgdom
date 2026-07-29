# COST-BID-GAP-01 / GAP-A — DESIGN FREEZE (FINAL)

> **ID:** COST-BID-GAP-01-GAP-A-DESIGN-FREEZE  
> **EPIC:** COST-BID-GAP-01 · Thin Slice **GAP-A**  
> **STATUS:** **DESIGN FREEZE · FINAL** · Arch Review **PASS** · **IMPLEMENT ZABLOKOWANY** do Owner GO  
> **Data FREEZE:** 2026-07-29 · **AR:** [`COST-BID-GAP-01-ARCHITECTURE-REVIEW.md`](COST-BID-GAP-01-ARCHITECTURE-REVIEW.md)  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · wycena catalog direct · **#CORE-013** · **#CORE-014**  
> **Tip bazowy:** **2.65.76** — [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Wejście:** [`COST-BID-GAP-01-AUDIT.md`](COST-BID-GAP-01-AUDIT.md) · [`COST-BID-GAP-01-PLAN.md`](COST-BID-GAP-01-PLAN.md) · [`COST-BID-GAP-01-RCA.md`](COST-BID-GAP-01-RCA.md)  
> **Poprzedni draft:** ten plik zastępuje DRAFT v1.0 (epicki) — **zamrożony jest wyłącznie GAP-A**

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (GAP-A):

  Podnieść jakość DIRECT KATALOGOWEGO na wejściu Bid
  (stawki · UNKNOWN · REUSE marketQuotes),
  bez zmiany Aggregate / COST-MULTI / Discovery / parserów,
  bez zmiany Company Cost Model, bez drugiego kalkulatora,
  bez target-hacku 1,6M i bez AI-first pricing.

PRIMARY RC (RCA zatwierdzone):
  zaniżony direct catalog (~614 k) + 62 UNKNOWN (31,6%)
  + brak marketQuotes na ścieżce catalog Bid
  → Bid catalog 1 061 000 ≪ Owner ~1 600 000

IMPLEMENT: ZABLOKOWANY do Arch Review PASS + Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. Payroll Safety Gate (zamrożone przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — COST-BID-GAP-01 / GAP-A
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*dopuszczalna flaga feature w config/LS jak inne cost flags —
                      bez migracji LS / bez kasowania kluczy LP)
G3 Cloud Sync:   NIE  (zakaz edycji cloud-sync.ts / DATA_KEYS)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE* (*REUSE OfferBoqPriceSourceProvider / catalog — bez App provider rewrite)
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE → FEATURE path
Owner GO IMPLEMENTATION: WYMAGANE (Stabilization + wpływ na recommendedBid)
```

---

## 1. Problem AS-IS (po RCA — zamrożony opis)

| Metryka (fixture `08dee335`) | Wartość |
|------------------------------|---------|
| `resolveCostBidInput` | **AGGREGATE** (OK — nie ruszać) |
| `pricingMode` (źródło 1,06M) | **catalog** |
| Catalog direct | **~614 095** PLN |
| UNKNOWN | **62 / 196 (31,6%)** |
| Bid catalog | **1 061 000** PLN |
| Bid `offer_boq_ai` (probe) | **~949 300** (niżej — nie cel) |
| Owner (cel biznesowy) | **~1 600 000** (nie AC numeryczne) |
| costModel sensitivity max combo | **~1 329 000** — **nie domyka** |

**Root Cause (zamrożony):** H1 — zaniżony direct katalogowy (stawki + UNKNOWN + brak market na ścieżce catalog).  
**Nie RC:** Aggregate · Discovery · costModel · AI-first.

---

## 2. Cel GAP-A (zamrożony)

1. **Kalibracja stawek katalogowych** zasilających `aggregateCatalogDirectCost` / aktywny katalog.  
2. **Poprawa danych direct** na Aggregate (wyższy / wiarygodniejszy direct bez zmiany qty Discovery).  
3. **REUSE** istniejącego mechanizmu market (`createControlledMarketPriceProvider` / `marketQuotes` / COST-02-A) — **podłączenie do ścieżki catalog→Bid** (lub równoważny controlled overlay na unit rates), **bez scrapingu**.  
4. **Eliminacja / drastyczna redukcja UNKNOWN** na fixture (klasyfikacja katalogowa / keywords / fallback — **bez** rewrite parserów PDF/ATH).  
5. **Zachowanie jednego SSOT Bid Proposal:** wyłącznie `computeTenderBidProposal` (tail Kp/marża bez zmian logiki oferty).

**Sukces biznesowy:** Bid catalog na `08dee335` **istotnie bliższy** uzasadnionemu modelowi wyceny (wyższy direct) **albo** mierzalny spadek UNKNOWN + explain stawek — **bez** gwarancji hardcode = 1 600 000.

---

## 3. Scope — IN / OUT (FINAL)

### 3.1 IN (allowlist concernów)

| # | IN | Uwagi |
|---|-----|--------|
| I1 | Kalibracja stawek `wgdom-cost-catalog` / aktywny katalog / resolver stawek | Seed + ewentualny store katalogu cen |
| I2 | Poprawa wyliczenia **direct** w `aggregateCatalogDirectCost` / `computeFromCatalogRow` (wejście cen) | Bez zmiany formuły Bid tail |
| I3 | REUSE market: `createControlledMarketPriceProvider`, Work Catalog `marketQuotes`, adaptery COST-02-A | Wire do **catalog path** lub rate overlay przed Bid |
| I4 | Eliminacja UNKNOWN: `classifyAthLineCategory` / keywords katalogu / lepszy match jednostek | **Nie** parser PDF |
| I5 | Flaga feature GAP-A + rollback | Jak COST-MULTI flags |
| I6 | Testy jednostkowe + PV fixture `08dee335` | AGGREGATE + ONE Pensjonat zachowane |
| I7 | Changelog / minimalny UX sygnał (opcjonalnie: unknown% / źródło stawki) | Thin; bez Outcome rewrite |
| I8 | Wejście do Bid = nadal `kosztorysForBid` + `computeTenderBidProposal` | SSOT |

### 3.2 OUT (twarde — naruszenie = STOP IMPLEMENT)

| # | OUT |
|---|-----|
| O1 | **Aggregate** / `cost-multi-02.ts` write / Branch Winners rewrite |
| O2 | **COST-MULTI** re-open / Force Rescan |
| O3 | **Discovery** / turniej ONE / `dossier.kosztorys` mutacja |
| O4 | **Parsery** ATH/PDF/ZIP / Heavy rewrite |
| O5 | **Company Cost Model** — zmiana `kpPct` / `profitPct` / `riskReservePct` / `minMarginPct` / defaults `company-labor-cost` jako „fix” luki |
| O6 | **Payroll** / LP / week roster |
| O7 | **`cloud-sync.ts`** / CloudLoader / Edge merge / DATA_KEYS |
| O8 | **Drugi kalkulator** oferty / lokalna Kp·marża poza Bid |
| O9 | **Target 1,6 mln** jako AC twarde / **hardcode** recommendedBid |
| O10 | **AI-first pricing** — wymuszenie `offer_boq_ai` jako domyślnej naprawy luki; rewrite S1–S7 |
| O11 | `sum(all)` / MULTI-03 |
| O12 | GAP-B / GAP-C pełne (osobne DF) — poza mikro-sygnałem unknown% w I7 |

---

## 4. Allowlist plików (projekcja FREEZE)

### 4.1 Dozwolone do edycji (po Owner GO — thin)

| Plik / obszar | Rola |
|---------------|------|
| `src/lib/wgdom-cost-catalog.ts` | Stawki seed / kategorie / UNKNOWN fallback |
| `src/lib/wgdom-ath-classifier.ts` (lub równoważny classifier) | Redukcja UNKNOWN |
| `src/lib/wgdom-catalog-cost-engine.ts` | Direct z katalogu; **opcjonalny** hook rate overlay |
| `src/lib/tender-catalog-line-pricing.ts` | Jeśli współdzieli stawki z Bid |
| `src/lib/tender-active-catalog.ts` | Resolver aktywnego katalogu |
| `src/lib/tender-offer-boq-controlled-price-source.ts` | **REUSE** — bez przebudowy scrapingu |
| NOWY thin: `src/lib/cost-bid-gap-01*.ts` (lub flaga w `tenders-v4-config.ts`) | Flaga + ewentualny rate bridge catalog↔market |
| `scripts/test-cost-bid-gap-01*.mjs` | Testy |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wersja UI przy release |
| Docs `docs/architecture/COST-BID-GAP-01-*` | Sync status |

### 4.2 READ-ONLY (analiza OK, edycja = naruszenie DF)

```text
src/lib/cost-multi-02.ts
src/lib/cost-multi-02-aggregate.ts
src/lib/cost-multi-02-force-rescan.ts
src/lib/tender-cost-discovery.ts
src/lib/tender-dossier-merge.ts
src/lib/company-labor-cost.ts          # OUT — cost model
src/lib/tenders-bid-calculator.ts      # READ; zakaz zmiany formuł Kp/marży
                                       # (wyjątek: wyłącznie jeśli wejście direct
                                       #  już skorygowane upstream — bez drugiego silnika)
src/lib/tender-offer-boq-pricing-engine.ts   # AI path — nie AI-first fix
src/lib/cloud-sync.ts
src/app/CloudLoader.tsx
src/lib/payroll-*
supabase/functions/**
```

**Uwaga Bid calculator:** preferowane jest podniesienie **direct upstream** (catalog engine / rates), tak aby `computeTenderBidProposal` dostał wyższy `aggregateCatalogDirectCost` **bez** edycji taila. Edycja `tenders-bid-calculator.ts` = **STOP** chyba że Arch Review jawnie dopuści 1-liniowy pass-through bez nowej logiki marży.

---

## 5. Feature flag + Rollback

| Element | Wartość |
|---------|---------|
| Flaga | `COST_BID_GAP_01_CATALOG_CAL` (nazwa finalna w IMPLEMENT) |
| Default do PV | `false` → `true` po Owner smoke / PV |
| Persist | config const + opcjonalnie LS key (wzór COST-PIPELINE / MULTI) |
| **Rollback** | flaga **OFF** → zachowanie tip **2.65.76**: catalog Bid ~1 061 000, UNKNOWN jak dziś, bez market overlay na catalog |
| Zakaz rollbacku | revert MULTI / Discovery / sync |

**Kryterium rollbacku operacyjnego:** regresja AGGREGATE mode, spadek Bid poniżej baseline bez uzasadnienia, UNKNOWN↑, crash wyceny, dotknięcie Payroll/sync.

---

## 6. Acceptance Criteria (FINAL)

### 6.1 Funkcjonalne

| ID | Kryterium | Mierzalne |
|----|-----------|-----------|
| **AC1** | Fixture `08dee335`: `resolveCostBidInput=AGGREGATE` · ONE Pensjonat **bez zmian** | PV jak FINAL MULTI |
| **AC2** | Bid nadal wyłącznie z `computeTenderBidProposal` · jeden `recommendedBidPln` | Code + test |
| **AC3** | Direct catalog na Aggregate **> baseline 614 095** (mierzalny uplift) **lub** UNKNOWN **≤ 15%** przy niepogorszonym direct | Probe / test |
| **AC4** | UNKNOWN count **< 62** na fixture (cel: eliminacja lub znaczna redukcja) | Probe |
| **AC5** | Gdy Work Catalog ma `marketQuotes` dla regionu — catalog path **może** użyć controlled market (REUSE); gdy brak quotes — bezpieczny fallback catalog seed (bez crash) | Test A/B |
| **AC6** | **Brak** hardcode Bid = 1 600 000 · **brak** wymuszenia `offer_boq_ai` jako fix | Review |
| **AC7** | costModel defaults (**kp/profit/risk/minMargin**) **niezmienione** | Diff deny |
| **AC8** | Flaga OFF = parity z baseline tip 2.65.76 (Bid catalog ≈ 1 061 000 ± tolerancja round) | Test flag |
| **AC9** | Testy `scripts/test-cost-bid-gap-01*.mjs` PASS · `npm run build` PASS | CI lokalne |
| **AC10** | Protected Core / `cloud-sync` / payroll **poza diff** | Boundary |

### 6.2 Jawnie NIE-AC

| NIE-AC | Powód |
|--------|-------|
| `recommendedBidPln === 1_600_000` | Target-hack zakazany |
| `pricingMode` musi być `offer_boq_ai` | AI-first OUT |
| Zmiana Branch Winners / sum(all) | MULTI OUT |
| Domknięcie luki samym costModel | RCA-5 |

---

## 7. Boundary Check (#CORE-013 / #CORE-014)

### 7.1 Metadane bundle

```text
BUNDLE: COST-BID-GAP-01 / GAP-A
EPIC: COST-BID-GAP-01
DOMINANT CLASS: FEATURE
DATE: 2026-07-29
```

### 7.2 #CORE-013 — jeden cel, zero mixed

| Reguła | FREEZE |
|--------|--------|
| Jeden concern = kalibracja catalog direct (+ market REUSE + UNKNOWN) | **TAK** |
| Osobny commit kodu GAP-A · docs osobno OK | **TAK** |
| Zakaz FEATURE + `cloud-sync` / payroll / Edge w jednym commit | **TAK** |
| Zakaz „przy okazji” costModel / MULTI / Discovery | **TAK** |

**Werdykt #CORE-013:** **PASS (projekcja FREEZE)**.

### 7.3 #CORE-014 — Protected Core

| Ścieżka CORE | W GAP-A? |
|--------------|----------|
| `cloud-sync.ts` / mutation guard | **NIE** |
| `CloudLoader` payroll | **NIE** |
| `payroll-*` / PWRB | **NIE** |
| Edge payroll | **NIE** |
| `App.tsx` LP handlers | **NIE** |

```text
□ FEATURE PASS   — oczekiwany po diff allowlist §4.1
□ STOP           — jeśli pojawi się plik z §4.2 deny / CORE
□ MIXED BUNDLE   — BLOCKED (#CORE-013)
```

**Werdykt #CORE-014:** **FEATURE PASS (projekcja FREEZE)**.

### 7.4 Shared FEATURE (nie CORE, ale ostrożnie)

- Globalny bump stawek seed katalogu wpływa na **wszystkie** przetargi catalog — wymaga PV + flaga + świadomy Owner GO.  
- Nie mylić z zmianą `company-labor-cost` (OUT).

---

## 8. Risk Assessment (FREEZE)

| ID | Ryzyko | P | I | Mitigacja |
|----|--------|---|---|-----------|
| R1 | Target-hack do 1,6M w IMPLEMENT | Śr | Krytyczny | AC6 · code review · zakaz O9 |
| R2 | Globalne stawki psują inne przetargi | Wys | Wys | Flaga · PV multi-sample · rollback |
| R3 | Market wire bez coverage → fałszywy „fix” | Śr | Śr | AC5 fallback · nie obiecywać 1,6M |
| R4 | Edycja Bid tail „przy okazji” | Śr | Wys | Deny `tenders-bid-calculator` formuł |
| R5 | Classifier UNKNOWN psuje dobre kategorie | Śr | Śr | Testy regresji klasyfikacji · fixture |
| R6 | Przypadkowa edycja cost-multi-02 | Niski | Krytyczny | Deny-list · Boundary przed commit |
| R7 | AI-first „bo PIPELINE-01 ON” | Śr | Wys | O10 · catalog path jest celem GAP-A |
| R8 | Pusty Work Catalog na prod LS | Śr | Śr | Seed/market opcjonalny; catalog rates nadal IN |
| R9 | Stabilization IMPLEMENT bez GO | Śr | Wys | Stop na checklist §10 |

---

## 9. Checklist — Architecture Review

Przed werdyktem Arch Review reviewer potwierdza:

- [ ] RCA PRIMARY = H1 zaakceptowane; GAP-A = właściwy thin slice  
- [ ] IN/OUT §3 spójne z RCA (Aggregate/MULTI/Discovery/parsers/costModel/AI-first = OUT)  
- [ ] Allowlist §4.1 wystarczająca; deny §4.2 kompletna  
- [ ] SSOT Bid = wyłącznie `computeTenderBidProposal`; brak drugiego silnika  
- [ ] Market = **REUSE** COST-02-A / controlled provider; brak scrapingu  
- [ ] UNKNOWN fix = classifier/katalog, **nie** parser  
- [ ] costModel / `company-labor-cost` poza scope  
- [ ] `#CORE-013` / `#CORE-014` projekcja PASS  
- [ ] AC1–AC10 mierzalne; NIE-AC jasne (brak AC = 1,6M)  
- [ ] Rollback flagą zdefiniowany  
- [ ] Brak zależności od HEAVY-PERSIST / TP200B w tym slice  
- [ ] AI-COST-01 Freeze nie naruszony (S1–S7 bez rewrite)

```text
Architecture Review: ☑ PASS  (2026-07-29 — COST-BID-GAP-01-ARCHITECTURE-REVIEW.md)
Uwagi nieblokujące: U1–U6 (obowiązują przy IMPLEMENT)
```

**FAIL →** popraw DF; **nie** start IMPLEMENT.

---

## 10. Checklist — Owner GO IMPLEMENTATION

Owner potwierdza przed kodem:

- [ ] Przeczytany ten DF (GAP-A FINAL) + RCA  
- [ ] Akceptacja: **nie** gwarantujemy Bid = 1 600 000 w GAP-A  
- [ ] Akceptacja OUT: costModel / MULTI / Discovery / AI-first / hardcode  
- [ ] Akceptacja ryzyka globalnych stawek katalogu (flaga + rollback)  
- [ ] Arch Review = **PASS**  
- [ ] Boundary FEATURE PASS (projekcja)  
- [ ] **Owner GO IMPLEMENTATION: TAK** (jawne w czacie / ticket)

```text
Owner GO IMPLEMENTATION: □ TAK  □ NIE
Po TAK: IMPLEMENT tylko allowlist §4.1 · testy · (później) commit na prośbę · push na prośbę · PV
```

---

## 11. Plan wdrożenia (po GO — informacyjnie, nie start)

```text
1. IMPLEMENT thin (flag OFF) + testy
2. Build PASS
3. Commit / push — TYLKO na prośbę Ownera
4. VERIFY FAST version.json
5. PV fixture 08dee335 (AC1–AC5, AC8)
6. Flaga ON (canary / Owner) → CLOSEOUT slice
```

**Następne slice (poza tym DF):** GAP-C explain · GAP-B costModel — wymagają **nowego** DF + GO.

---

## 12. Status dokumentu

| Pole | Wartość |
|------|---------|
| Wersja | **FINAL v1.0** |
| Status | **DESIGN FREEZE** |
| Slice | **GAP-A only** |
| IMPLEMENT | **ZABLOKOWANY** (do Owner GO) |
| COMMIT / PUSH | **NIE** bez prośby Ownera |
| NEXT | **Owner GO IMPLEMENTATION** → IMPLEMENT |

```text
DESIGN FREEZE GAP-A = FINAL
Architecture Review = PASS
Czekam na Owner GO IMPLEMENTATION.
Bez GO — zakaz kodu.
```
