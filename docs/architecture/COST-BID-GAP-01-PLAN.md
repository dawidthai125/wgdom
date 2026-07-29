# COST-BID-GAP-01 — PLAN

> **ID:** COST-BID-GAP-01  
> **MODE:** PLAN ONLY · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Status procesu:** AUDIT **DONE** → **PLAN (ten dokument)** → DF draft → Arch Review → Owner GO  
> **Tip prod:** **2.65.76** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **AUDIT:** [`COST-BID-GAP-01-AUDIT.md`](COST-BID-GAP-01-AUDIT.md)  
> **DF draft:** [`COST-BID-GAP-01-DESIGN-FREEZE.md`](COST-BID-GAP-01-DESIGN-FREEZE.md) (**DRAFT v1.0** · nie zamrożony)  
> **Zależności:** COST-MULTI **CLOSED · PV** · AI-COST-01 **FROZEN** · COST-02-A **CLOSED**

```text
════════════════════════════════════════════════════════
CEL PLANU: wyjaśnić różnicę
  Aggregate Bid ~1 061 000 PLN  vs  Owner ~1 600 000 PLN
  (fixture 08dee335) — bez target-hackingu, bez re-open MULTI
════════════════════════════════════════════════════════
```

---

## 1. PLAN zgodny z workflow WGDOM

```text
[DONE]  Onboarding (Entry · Master · Continuity · 09 · CURRENT-TASK)
[DONE]  AUDIT          → COST-BID-GAP-01-AUDIT.md
[NOW]   PLAN           → TEN DOKUMENT
[NEXT]  DESIGN FREEZE  → draft v1.0 (osobny plik) → Owner answers → FREEZE
[NEXT]  Architecture Review
[NEXT]  Boundary #CORE-014 (powtórka na allowlist)
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT (thin slice) → TEST → COMMIT (na prośbę) → PUSH → PV → CLOSEOUT
```

**Zasady sesji PLAN:**

| Zasada | Wymaganie |
|--------|-----------|
| Thin Slice | Jeden concern na release po GO (M0 → A/B/C…) |
| REUSE FIRST | `computeTenderBidProposal` · COST-02-A provider · `resolveCostBidInput` (READ) |
| ZERO DUPLICATE | Zakaz drugiego kalkulatora Kp/marży / Bid |
| Stabilization | Brak IMPLEMENT bez DF + Arch Review + Owner GO |
| Closed EPICs | COST-MULTI / Discovery / Aggregate / parsers = **OFF LIMITS** |

**Cel biznesowy EPIC (nie „dopchnąć do 1,6M”):**

1. **Wyjaśnić** skład luki (~539 k PLN / −34%).  
2. **Zmierzyć** udział: direct · stack · catalog · offer_boq_ai · market · costModel.  
3. Dopiero potem — **jeden** thin slice kalibracji (ceny **lub** model **lub** explain), zgodnie z DF.

---

## 2. Zakres IN / OUT

### 2.1 IN (PLAN / RCA / późniejszy IMPLEMENT po GO)

| # | Obszar | Co wolno analizować / później zmieniać (po DF) |
|---|--------|-----------------------------------------------|
| I1 | **Measurement** | Read-only probe fixture `08dee335`: Bid, `costStack`, direct, pricingMode |
| I2 | **Direct cost** | Skąd pochodzi `directCost` (catalog lines vs OfferBoq totals) |
| I3 | **Cost stack** | Kp · ancillary · overhead · profit · risk · minMargin · floor/recommended |
| I4 | **Catalog path** | `catalogQuantities` Aggregate → `tender-catalog-line-pricing` / catalog engine |
| I5 | **offer_boq_ai path** | Adapter Bid · `pricingMode=offer_boq_ai` vs catalog na tym samym Aggregate |
| I6 | **Market calibration** | REUSE `createControlledMarketPriceProvider` / `marketQuotes` (odczyt) |
| I7 | **Company cost model** | `company-labor-cost` defaults + profil firmy (odczyt; zmiana tylko po GO) |
| I8 | **Bid Proposal** | `computeTenderBidProposal` — **jedyny** SSOT oferty (analiza; edycja tylko thin + flaga) |
| I9 | **Explainability** | RO UI „skąd 1,06M / czego brakuje do modelu Ownera” (thin C) |
| I10 | **Feature flags** | Nowe flagi slice (jak COST-MULTI) — rollback bez revertu |

### 2.2 OUT (twarde — PLAN i IMPLEMENT)

| # | Zakaz |
|---|--------|
| O1 | Re-open COST-MULTI-01/02 / Force Rescan |
| O2 | Discovery turniej ONE / rewrite `dossier.kosztorys` |
| O3 | Parsery ATH/PDF/ZIP / Heavy rewrite |
| O4 | `sum(all)` / MULTI-03 / zmiana polityki Branch Winners |
| O5 | Drugi kalkulator oferty / lokalna Kp·marża poza Bid |
| O6 | Przebudowa AI-COST-01 S1–S7 (Freeze) — tylko **obok** (provider/explain) |
| O7 | Scraping marketplace / nielegalne feedy cen |
| O8 | Target-hack: hardcode Bid ≈ 1 600 000 |
| O9 | Payroll / `cloud-sync.ts` / CloudLoader / Edge merge / PWRB |
| O10 | FND-06 · e-składanie · Hub delete |

### 2.3 MONITOR (osobny EPIC — nie mieszać)

| Temat | ID kandydat |
|-------|-------------|
| Cloud settle / unload race | HEAVY-PERSIST-01 (C5) |
| Fidelity `rows` cap | TP200B (C4) — tylko jeśli RCA H3 PASS |
| Work Catalog UX P3.3 | C3 — zasila market long-term |

---

## 3. Breakdown miejsc wymagających analizy

Fixture SSOT: `08dee335-f338-1f30-ebd1-65000155122a`  
Liczby bazowe: AGG Bid **1 061 000** · Owner **~1 600 000** · Δ **~539 000**.

### 3.1 Direct cost

| Pytanie | Co sprawdzić |
|---------|----------------|
| Ile wynosi `directCost` / linia `costStack` „koszt bezpośredni”? | Czy 1,06M to już Bid z narzutami, czy blisko direct? |
| Catalog: suma `unitPrice × qty` na 196 liniach Aggregate | Porównaj z Owner direct (jeśli znany) |
| OfferBoq: `totals.directPln` przy Aggregate wejściu | Δ catalog direct vs AI Cost direct |
| Czy brakuje pozycji (qty=0 / unknown catalog)? | `catalogUnknownPct`, linie bez ceny |

**Wynik oczekiwany RCA:** `direct_catalog`, `direct_offer_boq`, `Δ_direct`, udział w luce.

### 3.2 Cost stack (tail Bid)

Ścieżka w `computeTenderBidProposal` (orientacja default modelu):

```text
directCost
  + Kp (kpPct, default ~14%)
  + ancillary project
  + weekly overhead × weeks
= subtotal
  + profit (profitPct ~8%)
  + risk (riskReservePct ~4%)
= costPrice
  × (1 + minMarginPct ~5%)
= floorBid → recommendedBid (ew. competitive vs SWZ)
```

| Pytanie | Co sprawdzić |
|---------|----------------|
| Pełny `costStack[]` na fixture AGG | PLN per linia |
| Jaki uplift direct→recommended? | Czy ×~1,5 wystarczy do 1,6M przy obecnym direct? |
| Czy competitive/SWZ ściąga Bid w dół? | `priceWeight`, `estimatedValuePln` |
| Czy Owner liczył inny stack? | Wywiad § pytania Owner |

**Wynik:** tabela „stack contribution % of gap”.

### 3.3 Catalog

| Pytanie | Co sprawdzić |
|---------|----------------|
| `pricingMode` FINAL PV = **catalog** | Potwierdzone w PV MULTI-02 |
| Źródło cen jednostkowych | `wgdom-cost-catalog` / line pricing / unknown fallback |
| Aggregate `catalogQuantities` (196) | kompletność vs PDF Owner |
| CATALOG-BID-01 materializacja qty>0 | czy linie zerowe wypadają z Bid |

**Wynik:** „catalog underpricing?” TAK/NIE + sample top-N pozycji vs intuicja Ownera.

### 3.4 offer_boq_ai

| Pytanie | Co sprawdzić |
|---------|----------------|
| Czy na AGG uruchomiono OfferBoq + AI Cost? | PV: panel AI Cost YES; Bid ścieżka catalog |
| `computeTenderBidProposal` z `offerBoqDirect` / adapter S6 | recommendedBid vs 1 061 000 |
| Controlled market w S4 | czy ceny marketQuotes weszły do direct |
| Preservacja user edits | nie ruszać w GAP bez DF |

**Wynik:** Bid(catalog) vs Bid(offer_boq_ai) na tym samym `kosztorysForBid`.

### 3.5 Market calibration

| Pytanie | Co sprawdzić |
|---------|----------------|
| Obecność `marketQuotes` w Work Catalog dla regionów pozycji | coverage % |
| `createControlledMarketPriceProvider` — confidence / freshness | ile linii dostało market |
| Δ catalog unit vs market unit (sample) | szacunek uplift direct |
| COST-02-A CLOSED — rozszerzenie tylko thin DF | zakaz scrapingu |

**Wynik:** potwierdzenie/odrzucenie H1 (stawki).

### 3.6 Company cost model

| Pytanie | Co sprawdzić |
|---------|----------------|
| Defaults w `company-labor-cost.ts` | kp/profit/risk/minMargin |
| Override profilu firmy (KV/LS) na prod | czy Owner ma inny model w UI |
| Scenariusz: jaki `profitPct`/`minMarginPct` domyka 1,6M przy stałym direct | sensitivity |
| Global vs per-tender override | decyzja Ownera przed GAP-B |

**Wynik:** potwierdzenie/odrzucenie H2; **zakaz** cichej zmiany defaultów bez GO.

### 3.7 Bid Proposal (SSOT)

| Pytanie | Co sprawdzić |
|---------|----------------|
| Jedno wejście: `kosztorysForBid` z `resolveCostBidInput` | READ-only w RCA |
| UI: `TenderBidProposalPanel` / sticky oferta | który `pricingMode` widać |
| Wire COST-PIPELINE / `useTenderPricingAuto` | czy OfferBoq→Bid aktywne na fixture |
| Zakaz drugiej ścieżki recommendedBid | Boundary |

**Wynik:** mapa „który call path produkuje 1 061 000”.

---

## 4. Proponowana kolejność RCA

```text
RCA-0  Baseline freeze liczb
       → potwierdź tip 2.65.76 · AGG mode · Bid 1 061 000 · ONE Pensjonat
       → artefakt: tabela AS-IS (jak FINAL PV)

RCA-1  Cost stack dump (catalog path)
       → full costStack + direct + floor + recommended
       → odpowiedź: jaki % luki = stack vs „za mały direct”

RCA-2  Catalog direct reconstruction
       → suma wyceny linii Aggregate catalogQuantities
       → unknownPct · top drogie linie · porównanie per branża (4 winners)

RCA-3  offer_boq_ai parallel
       → Bid na tym samym Aggregate przez adapter AI Cost
       → Δ vs catalog Bid; czy bliżej 1,6M?

RCA-4  Market overlay sample
       → controlled market na N pozycjach krytycznych
       → estymowany uplift direct gdyby market był źródłem

RCA-5  Cost model sensitivity
       → przy fixed direct: jakie parametry dają ~1,6M
       → vs deklarowany model Ownera (gdy odpowie)

RCA-6  Synteza RC
       → ranking H1–H5 z % wkładu w lukę
       → rekomendacja pierwszego thin slice (A/B/C/D)
       → wejście do DESIGN FREEZE (zamrożenie IN/OUT + allowlist)
```

**Równolegle (nie blokuje RCA-1…2):** odpowiedzi Ownera z AUDIT §9 (jak liczył 1,6M).

**Definition of Done RCA:** dokument `COST-BID-GAP-01-RCA.md` z tabelą wkładu % + werdykt hipotez + rekomendacja slice.

---

## 5. Lista plików do analizy (READ w RCA; edycja tylko po DF + GO)

### 5.1 Bid Proposal / kalkulator (SSOT oferty)

| Plik | Rola |
|------|------|
| `src/lib/tenders-bid-calculator.ts` | `computeTenderBidProposal` · costStack · Kp/marża |
| `src/lib/tenders-bid-prep.ts` | prep / konsumenci Bid |
| `src/app/TenderBidProposalPanel.tsx` | UI propozycji oferty |
| `src/lib/tender-offer-boq-bid-adapter.ts` | S6 adapter → Bid (bez lokalnej marży) |

### 5.2 Aggregate wejście Bid (READ-ONLY — nie edytować w GAP)

| Plik | Rola |
|------|------|
| `src/lib/cost-multi-02.ts` | `resolveCostBidInput` SSOT |
| `src/lib/cost-multi-02-aggregate.ts` | merge Branch winners · catalogQuantities |
| `src/lib/cost-multi-02-types.ts` | typy decyzji Bid input |
| `src/lib/cost-multi-02-force-rescan.ts` | OOS (tylko świadomość) |

### 5.3 Catalog

| Plik | Rola |
|------|------|
| `src/lib/tender-catalog-line-pricing.ts` | wycena linii katalogowych |
| `src/lib/wgdom-cost-catalog.ts` | katalog stawek |
| `src/lib/wgdom-cost-catalog-store.ts` | store katalogu |
| `src/lib/wgdom-cost-catalog-history.ts` | historia (P3.4) |
| `src/lib/wgdom-catalog-cost-engine.ts` | silnik catalog → Bid |

### 5.4 OfferBoq / AI Cost (Freeze — analiza; edycja wąska)

| Plik | Rola |
|------|------|
| `src/lib/tender-offer-boq.ts` | model OfferBoq · build z snapshot |
| `src/lib/tender-offer-boq-pricing-engine.ts` | S4 pricing |
| `src/lib/tender-offer-boq-cost-intelligence.ts` | S3 intelligence |
| `src/lib/tender-offer-boq-mapping.ts` | S2 mapping |
| `src/lib/tender-offer-boq-explainability.ts` | S4.1 / explain |
| `src/lib/tender-offer-boq-controlled-price-source.ts` | COST-02-A market provider |
| `src/lib/tender-offer-boq-company-knowledge.ts` | CK price provider |
| `src/lib/tender-offer-boq-validation.ts` | S7 |
| `src/lib/tender-offer-boq-component-edit.ts` | S5 edits (OOS chyba że explain) |

### 5.5 Company cost model

| Plik | Rola |
|------|------|
| `src/lib/company-labor-cost.ts` | defaults kp/profit/risk/minMargin · labor |

### 5.6 Wire wyceny / pipeline UI (analiza ścieżki)

| Plik | Rola |
|------|------|
| hook / lib COST-PIPELINE / `useTenderPricingAuto*` (lokalizacja w RCA-0) | OfferBoq→Bid wire |
| `src/app/tenders/**` / `TenderKosztorysWorkspace.tsx` | banner AGG · panel wyceny |
| komponenty OfferBoq panel (Cost Intelligence) | czy market badge / path |

### 5.7 Docs / dowody (READ)

| Plik | Rola |
|------|------|
| `docs/verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md` | PV liczby |
| `docs/verification/COST-MULTI-02-PRODUCTION-VERIFY-08dee335.md` | Bid comparison |
| `docs/architecture/COST-MULTI-CLOSEOUT.md` | OUT luki 1,6M |
| `docs/architecture/WGDOM-AI-COST-01-SSOT.md` | SSOT Bid |
| `docs/architecture/WGDOM-AI-COST-02-STARTING-POINT.md` | market extension points |
| `docs/architecture/COST-BID-GAP-01-AUDIT.md` | hipotezy H1–H6 |

### 5.8 Explicit NEVER (analiza tylko „czy nie ruszać”)

`cloud-sync.ts` · `CloudLoader.tsx` · payroll\* · Edge `index.tsx` · Discovery/`tender-cost-discovery.ts` · dossier merge turniej · ZIP parsers.

---

## 6. Boundary Check (#CORE-013 / #CORE-014)

### 6.1 Metadane bundle (projekcja PLAN)

```text
BUNDLE: COST-BID-GAP-01 (PLAN / RCA → późniejszy thin IMPLEMENT)
EPIC: COST-BID-GAP-01
DOMINANT CLASS: FEATURE (wycena Przetargi) — nie CORE Payroll
DATE: 2026-07-29
```

### 6.2 #CORE-013 — jeden cel, zero mixed FEATURE+CORE

| Reguła | Projekcja |
|--------|-----------|
| Jeden concern na commit IMPLEMENT | **TAK** — osobne slice M0/A/B/C |
| Zakaz FEATURE UI + `cloud-sync` / payroll / Edge w jednym commit | **TAK** — O9 |
| Zakaz „przy okazji” Discovery/parsers w bundle cenowym | **TAK** — O1–O4 |
| Docs AUDIT/PLAN/DF mogą iść osobnym docs commit | OK (nie mieszać z kodem FEATURE) |

**Werdykt #CORE-013 (plan):** **PASS (projekcja)** — o ile IMPLEMENT trzyma thin allowlist.

### 6.3 #CORE-014 — FEATURE Boundary Check (Protected Core)

| Ścieżka Protected Core | W planie GAP? |
|------------------------|---------------|
| `payroll-week-roster-bundle.ts` | **NIE** |
| `payroll-week-employee-merge.ts` | **NIE** |
| `cloud-sync.ts` | **NIE** |
| `cloud-sync-mutation-guard.ts` | **NIE** |
| `CloudLoader.tsx` payroll | **NIE** |
| Edge payroll batch | **NIE** |
| `App.tsx` handlery LP / PWRB | **NIE** |

| Klasa plików analizy | Typ |
|----------------------|-----|
| `tenders-bid-*` · OfferBoq\* · catalog\* · `company-labor-cost` | **FEATURE** (domena wyceny) |
| `cost-multi-02*` | **FEATURE / PLATFORM wyceny** — w GAP tylko **READ**; edycja = **STOP** (re-open MULTI) |
| Payroll / sync | **CORE** — **OUT** |

```text
□ FEATURE PASS   — Protected Core NIE w scope IMPLEMENT
□ STOP           — jeśli DF zaproponuje cloud-sync / payroll
□ MIXED BUNDLE   — BLOCKED (#CORE-013)
```

**Werdykt #CORE-014 (plan):** **FEATURE PASS (projekcja)**.

**Uwaga Shared:** zmiana **globalnych defaults** w `company-labor-cost.ts` = wysoki blast — traktować jako **wymaga Owner GO + flaga**; nie „Shared CORE”, ale **Shared FEATURE cross-tender**.

### 6.4 Payroll Safety Gate (preview)

```text
G1–G9: NIE (przy allowlist wyceny)
Wynik: ALL-NIE
Owner GO: YES (Stabilization + wpływ na recommendedBid)
```

Re-check Gate + Boundary **przed każdym** IMPLEMENT slice.

---

## 7. Risk Assessment

| ID | Ryzyko | P | I | Mitigacja |
|----|--------|---|---|-----------|
| R1 | Target-hack do 1,6M bez modelu | Śr | Krytyczny | Zakaz O8; RCA % najpierw |
| R2 | Edycja `computeTenderBidProposal` psuje inne przetargi | Wys | Wys | Flaga · PV multi-fixture · thin DF |
| R3 | Zmiana default `costModel` globalnie | Wys | Wys | Tylko profil / override; GO Owner |
| R4 | Naruszenie AI-COST Freeze (S1–S7 rewrite) | Śr | Wys | Tylko adapter/provider/explain obok freeze |
| R5 | Re-open MULTI „żeby dociągnąć PLN” | Niski intencyjnie / wys. skutek | Krytyczny | O1–O4; Branch Winners frozen |
| R6 | Pomylenie luki z fidelity (TP200B) | Śr | Śr | RCA-2 qty; osobny C4 jeśli H3 |
| R7 | Market bez coverage → fałszywy „fix” | Śr | Śr | RCA-4 coverage %; nie obiecywać 1,6M |
| R8 | Drugi kalkulator w UI | Niski | Wys | SSOT Bid; code review Boundary |
| R9 | Persist race mylony z luką cenową | Niski | Śr | C5 MONITOR; PV czeka settle |
| R10 | Stabilization: IMPLEMENT bez GO | Śr | Wys | Workflow stop na DF/AR |

**Ryzyko rezydualne po samym PLAN:** wyjaśnienie luki **nie jest jeszcze dowiedzione liczbami** — stąd RCA-0…6 obowiązkowe przed FREEZE IMPLEMENT.

---

## 8. Mapowanie thin slices (po RCA)

| Slice | Cel | Wejście |
|-------|-----|---------|
| **GAP-M0** | Measurement + RCA docs (+ opcjonalny read-only probe) | PLAN DONE |
| **GAP-A** | Market/catalog calibration → wpływ na Bid (REUSE COST-02-A) | H1 PASS |
| **GAP-B** | Company cost model calibration (profil) | H2 PASS + Owner model |
| **GAP-C** | Explainability luki RO | zawsze; może równolegle |
| **GAP-D** | Fidelity handoff → TP200B | H3 PASS |

**Rekomendacja PLAN (do potwierdzenia RCA):** M0 → **A + C** → B → D.

---

## 9. Kryteria przejścia PLAN → DF FREEZE

| # | Kryterium |
|---|-----------|
| P1 | IN/OUT zaakceptowane przez Ownera (lub brak sprzeciwu) |
| P2 | RCA-0…6 COMPLETE z % wkładu w lukę |
| P3 | Wybrany **jeden** pierwszy slice IMPLEMENT (A/B/C) |
| P4 | Allowlist plików w DF ≤ thin · #CORE-013/014 PASS |
| P5 | Owner GO IMPLEMENTATION na ten slice |

---

## 10. Werdykt PLAN

```text
PLAN STATUS: COMPLETE (docs)
IMPLEMENT: NIE
COMMIT / PUSH: NIE
DESIGN FREEZE: DRAFT v1.0 (osobny plik) — NIE zamrożony do decyzji Ownera + RCA
NEXT: RCA-0…6  lub  Owner answers (AUDIT §9)  →  FREEZE DF
```

**Czekam na:** (1) akceptację IN/OUT, (2) GO na RCA measurement, (3) odpowiedzi jak liczona była ~1,6M.
