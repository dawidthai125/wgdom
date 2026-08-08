# TENDER-MODERNIZATION-01 / S3 — AUDIT (Align Pricing)

> **STATUS:** **S3 AUDIT COMPLETE** · **READY FOR PLAN**  
> **ID:** TENDER-MODERNIZATION-01-S3-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S3 — Align Pricing**  
> **Data:** 2026-08-08  
> **Tryb:** AUDIT ONLY · **ZERO CODE** · **ZERO COMMIT** · **ZERO PUSH**  
> **Prior:** S0 CLOSED · S1 CLOSED · S2 CLOSED · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **SSOT:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §5 · [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md) §5 · [`TENDER-MODERNIZATION-01-S2-CLOSEOUT.md`](TENDER-MODERNIZATION-01-S2-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
S3 AUDIT COMPLETE · READY FOR PLAN

Zamrożona polityka: OBSERVE → PARITY → DEPRECATE → REMOVE
ONE AUTHORITATIVE OFFER PLN (target DF):
  Offer Expert offerPricePln  (Expert ON + S3-B parity PASS)
  Bid recommendedBidPln       (Expert OFF / compatibility)

Dzisiaj (prod tip runtime):
  PRIMARY UI PLN = Bid recommendedBidPln
  Expert/Chief/DW/Validation PLN = Offer offerPricePln
  → dwa silniki · różna semantyka · mogą się różnić

Parity harness: BRAK w kodzie (S3-A still missing)
Expert nie wymaga Bid (Chief.run bez Bid)
8 LOCK: PASS (audit only · BC untouched)

STOP conditions: NIE spełnione → READY FOR PLAN
════════════════════════════════════════════════════════
```

---

## Odpowiedzi obowiązkowe (S3 MUST)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Co jest authoritative Offer PLN? | **Dziś (tip UI):** `TenderBidProposal.recommendedBidPln`. **Target DF (Expert ON + S3-B):** `OfferExpert` → `offerPricePln`. **OfferBoq** = SSOT **kosztu bezpośredniego** (`directPln`), **nie** offer PLN. |
| 2 | Gdzie powstaje? | Bid: `computeTenderBidProposal` via `useTenderPricingAuto` → `resolveTenderPricingAutoProposal` → `computeRuntimeBidFromOfferBoq` \| catalog fallback. Offer: `computeOfferPriceFromRealCost` w `analyzeOfferFromCost` (Chief T5). |
| 3 | Gdzie zapisywane? | Bid: **live recompute** (memory). Persist użytkownika: `item.ourEstimatePln`. Dossier `tenderDossier.bidProposal` = opcjonalny slot (brak aktywnego writer-a z live pricing). Offer Expert: **Chief session snapshot** (in-memory; nie tip Bid KV). |
| 4 | Kto czyta? | Bid → TRE-01, DecisionView/Intelligence finance, Bid panel, OfferBoq merge totals, Strategy KPI/`ourEstimate`, Trust pricing, Offer Run. Offer → Chief Dossier, Validation, Decision Workspace, Expert Workspace UI. |
| 5 | Gdzie nadal Bid PLN? | Wszystkie legacy Outcome / finance / Strategy / Trust / apply→`ourEstimatePln` (lista §7). |
| 6 | Bid = kalkulacja czy snapshot? | **Kalkulacja runtime** (memo). Snapshot tylko jeśli zapisany `ourEstimatePln` lub legacy `dossier.bidProposal`. |
| 7 | Offer vs Bid mogą się różnić? | **TAK** — różne bazy (Real Cost vs Bid cost stack) + różne marże (12%/5% vs company `profitPct`/`minMarginPct`/Kp/ancillary) + Bid competitive trim vs SWZ. |
| 8 | Adapter SSOT? | **Cost→Bid:** `integrateOfferBoqWithBidProposal` / `computeRuntimeBidFromOfferBoq` (istnieje). **Bid↔Offer Expert parity:** **BRAK** (`buildChiefOfferStrategyParamsRo` = defaults; bridge Bid→strategy **OUT**). |
| 9 | Co deprecate? | Bid jako **równorzędny primary PLN** w UI (po S3-B/C); duplicate finance cards; komentarz „jedyny silnik oferty” jako tip SSOT. |
| 10 | Co MUST zostać do parity? | `computeTenderBidProposal` + Offer Expert stack + OfferBoq L1 + live Bid path + `ourEstimatePln` + TRE/Strategy readers (bez DELETE). |
| 11 | Co później REMOVE? | Bid authoritative (S3-D / S8 / ALIGN-BID-RETIRE) · hard delete Bid calculator **tylko** po gates DF · nie w S3 default. |
| 12 | S3 bez zmian BC? | **TAK** — S3-A/B harness + designation docs; S3-C thin presentation. Expert/Chief/Validation/OfferBoq/Bid **domain calc NO TOUCH**. |

---

## 1. Current Pricing Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ LEGACY / PROD PRIMARY (COST-PIPELINE-01 ON by default)          │
│                                                                 │
│  dossier kosztorys → OfferBoq (directPln)                       │
│       ↓                                                         │
│  tender-offer-boq-bid-adapter → computeTenderBidProposal        │
│       ↓                                                         │
│  recommendedBidPln  ──► TRE-01 / Decision finance / Bid UI      │
│                         Strategy KPI / Trust / ourEstimate apply│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ EXPERT / CHIEF PATH (Session + DW flags; S2 Expert-effective)   │
│                                                                 │
│  OfferBoq RO → EE → ME → PE → Cost(realCostPln)                 │
│       ↓                                                         │
│  Offer Expert: offerPricePln = Real + 12% margin + 5% risk      │
│       ↓                                                         │
│  Chief Dossier → Validation → Decision Workspace                │
│  (NIE woła computeTenderBidProposal)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Werdykt architektury:** dwa niezależne silniki oferty końcowej. Wspólne wejście kosztowe (OfferBoq L1 / przedmiar), **różny ogon** (Bid stack vs Real+marża+ryzyko).

**DF §5 target po S3-B (Expert ON):** jeden primary = Offer `offerPricePln`; Bid = compatibility / detail — **nie** równorzędny primary.

---

## 2. Price Source Map

| Źródło | Typ PLN | SSOT? | Computed | Persisted | Write | Read | UI |
|--------|---------|-------|----------|-----------|-------|------|-----|
| **OfferBoq** `totals.directPln` | koszt bezpośredni | **SSOT kosztu L1** | tak | ephemeral / panel | OfferBoq engine | Bid adapter · Chief OfferBoq RO · EE | Kosztorys panel |
| **OfferBoq** `totals.recommendedBidPln` | mirror Bid | computed mirror | tak (merge) | ephemeral | Bid adapter merge | Explainability | Cost Intelligence |
| **Bid** `recommendedBidPln` | oferta tip | **SSOT oferty tip UI dziś** | tak (live) | nie (live); opc. dossier | — | TRE · Decision · Strategy · Trust | Outcome · Bid · finance |
| **Bid** `costPricePln` / floor/safe/aggressive | warianty | computed | tak | nie | — | Bid detail UI | Wycena detail |
| **Offer Expert** `offerPricePln` | oferta Expert | **SSOT oferty Chief/DW** | tak | session RAM | Chief run | Validation · DW · EW | DW · Dossier |
| **Cost Expert** `realCostPln` | Real Cost | **SSOT Real Cost** | tak | session | Cost assemble | Offer Expert · Val C2 | Dossier |
| **`ourEstimatePln`** | wycena użytkownika | persisted override | ręcznie / apply Bid | **pipeline item** | patch | Decision finance · Strategy KPI | Decision · Strategy |
| **SWZ** `estimatedValuePln` | wartość przetargu | market/SWZ | parse | dossier/SWZ | SWZ parse | Bid competitive · Strategy market | mapy / KPI |
| **`submittedBidPln`** | złożona oferta | persist | ręcznie | pipeline | patch | reporting | status |
| **Pricing Expert** `marketPricePln` | materiał | comparative | tak | — | — | Cost comparative | Expert slots |
| **ATH / catalog totals** | baza Bid mode | input | tak | dossier | parsers | Bid modes | Wycena |

**Brak symboli** jako offer-price fields: `observationValue`, `realValue` (poza Real Cost Expert), `offerValue`/`bidValue` (poza helperem Strategy `bidValuePln`).

---

## 3. Offer PLN Map

### 3.1 OfferBoq (foundation — koszt, nie oferta)

| Pole | Plik | Rola |
|------|------|------|
| `OfferBoqTotals.directPln` | `src/lib/tender-offer-boq.ts` | SSOT sumy komponentów |
| `applyOfferBoqPricing` | `src/lib/tender-offer-boq-pricing-engine.ts` | unit×qty → totals; **bez** Kp/marży oferty |
| `buildOfferBoqDocumentForPipelineItem` | `src/lib/tender-offer-boq-explainability.ts` | L1 build z dossier |
| Chief RO | `src/lib/chief-wire-adapters/offer-boq.ts` | to samo L1 → Expert chain |

**Czy może ≠ Offer PLN?** Tak — to **koszt**, nie cena oferty.

### 3.2 Offer Expert (target authoritative Offer PLN — DF)

| Element | Plik | Treść |
|---------|------|-------|
| Formuła | `src/lib/offer-expert/compute-offer.ts` | `offerPricePln = realCost + margin(real) + risk(real+margin)` |
| Defaults | `src/lib/offer-expert/strategy.ts` | rekomendowany **12% / 5%**; agresywny 6%/2%; bezpieczny 18%/10% |
| Wire strategy | `src/lib/chief-wire-adapters/offer-strategy.ts` | **tylko defaults** · gap `OFFER_STRATEGY_DEFAULTS` · Bid→strategy **OUT** |
| Orchestration | `src/lib/chief-orchestrator/run.ts` | T5 `analyzeOfferFromCost` — **zero** `recommendedBidPln` |

**Powstaje:** przy Chief session run.  
**Persystencja tip:** brak zapisu do `kw-tender-decisions` / Bid store.  
**Czyta:** Validation (C8 primary∈scenarios), Decision Workspace VM passthrough, Expert Workspace, Chief Dossier UI.

### 3.3 Semantyka „Offer PLN” (ryzyko dual-label)

| Etykieta UI / kod | Faktyczne źródło | Semantyka |
|-------------------|------------------|-----------|
| TRE `recommendedOfferPln` | `snapshot.recommendedBidPln` | **Bid** przeetykietowany na „oferta” |
| DW / Dossier `offerPricePln` | Offer Expert | **Offer Expert** |
| Bid panel „rekomendacja” | `recommendedBidPln` | **Bid** |

**STOP check „dwa różne znaczeniowo Offer PLN”:** stan **istnieje dziś** jako problem do ALIGN — DF **jednoznacznie** desygnuje target = Offer Expert. Nie blokuje PLAN (desygnacja znana); blokowałoby IMPLEMENT bez S3-A/B.

---

## 4. Bid PLN Map

| Element | Plik | Treść |
|---------|------|-------|
| Silnik | `src/lib/tenders-bid-calculator.ts` | `computeTenderBidProposal` |
| Adapter | `src/lib/tender-offer-boq-bid-adapter.ts` | OfferBoq `directPln` → Bid input; komentarz LEGACY „jedyny silnik oferty” |
| Runtime | `src/app/hooks/useTenderPricingAuto.ts` | COST-PIPELINE ON → OfferBoq Bid else catalog Bid |
| Runtime L1→L2 | `computeRuntimeBidFromOfferBoq` | require `pricingMode === "offer_boq_ai"` + `recommendedBidPln > 0` |

### Formuła Bid (skrót dowodowy)

1. Direct = labor+material (OfferBoq direct **lub** ATH **lub** catalog)  
2. + Kp% · weekly ancillary · KZP overhead  
3. + profit% · riskReserve% → `costPrice`  
4. `floorBid = costPrice × (1 + minMarginPct)`  
5. Jeśli `priceWeight ≥ 80`: competitive trim vs `swz.estimatedValuePln` / ATH / reference  
6. Round → **`recommendedBidPln`** (+ warianty floor / aggressive / safe)

**Charakter:** **kalkulacja runtime**, nie snapshot SSOT.  
**Snapshoty pokrewne:** `ourEstimatePln` (user/apply); opcjonalny `tenderDossier.bidProposal` (legacy/merge-preserve).

---

## 5. Consumer Inventory

```text
PRICE SOURCE
    │
    ├─ OfferBoq.directPln ──► Bid adapter ──► recommendedBidPln
    │                              │
    │                              ├─► TRE-01 Outcome (recommendedOfferPln)
    │                              ├─► TenderDecisionView / Intelligence finance
    │                              ├─► TenderBidProposalPanel / Offer section
    │                              ├─► OfferBoq totals merge / Cost Intelligence
    │                              ├─► Trust pricing dimension
    │                              ├─► apply → ourEstimatePln → Decision override
    │                              └─► Strategy KPI (via dossier.bidProposal | ourEstimate)
    │
    └─ OfferBoq RO ──► EE/ME/PE/Cost ──► Offer.offerPricePln
                           │
                           ├─► Chief Dossier UI
                           ├─► Validation Expert (C2/C8)
                           ├─► Decision Workspace (PRIMARY human @ S2)
                           └─► Expert Workspace UI
```

### Macierz Bid vs Offer Expert

| Surface | Bid `recommendedBidPln` | Offer `offerPricePln` | Wpływ na decyzję/rekomendację |
|---------|-------------------------|----------------------|-------------------------------|
| TRE-01 Outcome | **TAK (jedyny)** | nie | rekomendacja ceny |
| TenderDecisionView / Intelligence | **TAK** (+ `ourEstimatePln`) | nie | finance / owner view |
| Bid / Wycena panel | **TAK** | nie | wycena operacyjna |
| Strategy KPI / opportunity | dossier Bid / ourEstimate | nie | portfolio value / „mamy wycenę” |
| Trust pricing | dossier Bid / ourEstimate | nie | trust score |
| Chief Dossier | nie | **TAK** | rekomendacja Expert |
| Validation | nie | **TAK** | QA consistency |
| Decision Workspace | nie | **TAK** | human decision context (S2 PRIMARY) |
| Expert Workspace | nie | **TAK** | RO experts |

**Consumer map:** **PASS** (skompletowana; brak ukrytego trzeciego silnika oferty).

---

## 6. Parity Analysis

### Werdykt

| | |
|--|--|
| **Parity** | **PARTIAL** |
| Identyczne zawsze? | **NIE** (opcja A odrzucona) |
| Mogą się różnić? | **TAK** (B) |
| Różna semantyka? | **TAK** (C) |
| Różne źródła? | **TAK** (D) |

### Kiedy i dlaczego różnica

| Przyczyna | Mechanizm | Skutek |
|-----------|-----------|--------|
| **Baza kosztu** | Bid: OfferBoq direct + Kp + ancillary + KZP; Offer: Cost Expert Real (BOM + auxiliary% + internalOverhead%) | inny `cost` przed marżą |
| **Marża / ryzyko** | Bid: `profitPct` + `riskReservePct` + `minMarginPct` z company profile; Offer: stałe 12%/5% (rekomendowany) | systematyczny offset |
| **Competitive trim** | Bid przy `priceWeight ≥ 80` przycina do SWZ/`estimatedValuePln`; Offer **nie** | Bid może ≪ Offer |
| **Warianty Bid** | floor / safe / aggressive ≠ primary Offer | **Acceptable** per DF §5.4 |
| **Overrides** | Bid czyta `tender-price-overrides`; Offer path inne | documented gap |
| **Fallback Bid** | catalog Bid gdy OfferBoq null — inna baza | delta dużego rzędu |
| **`ourEstimatePln`** | Decision finance preferuje zapis użytkownika nad live Bid | UI ≠ live Bid ≠ Offer |

### Hard parity (DF §5.4) — stan kodu

```text
hardParityPass ⇔ |Bid.recommended − Offer.offer| ≤ max(500 PLN, 0.02 × Offer.offer)
```

**W `src/`:** brak `hardParityPass` / harness Bid−Offer → **S3-A NOT STARTED**.

### Istniejący adapter vs brakujący

| Adapter | Status | Rola S3 |
|---------|--------|---------|
| `integrateOfferBoqWithBidProposal` | **ISTNIEJE** | cost→Bid SSOT glue |
| Bid ↔ Offer Expert parity harness | **BRAK** | **S3-A must-create** |
| Bid → Offer strategy map | **OUT** (świadomie) | nie otwierać w S3 bez Owner GO ALIGN |

---

## 7. Decision Impact

Miejsca, gdzie **legacy Bid PLN nadal wpływa** na decyzję / rekomendację (hot list):

1. **TRE-01** — `recommendedOfferPln = snapshot.recommendedBidPln` (`tender-recommendation-result.ts`)  
2. **Decision / Intelligence finance** — Bid lub override `ourEstimatePln` (`tender-owner-view-ux.ts`)  
3. **Bid prep / readiness CTA** — zależne od Bid proposal  
4. **Strategy opportunity + KPI** — `bidValuePln(ourEstimate | dossier.bidProposal)`  
5. **Trust layer pricing** — Bid-shaped signals  
6. **Apply rekomendacji** → persist `ourEstimatePln` → Decision preferuje snapshot  
7. **Autonomous / Offer Run** — `ownerFinanceProposal` = Bid  

**S2 Dual Outcome:** Decision Workspace = PRIMARY human decision gdy Expert-effective — czyta **Offer**, nie Bid.  
**Ryzyko S3:** użytkownik widzi Bid w TRE/legacy finance i Offer w DW → **dwa primary PLN** dopóki S3-C nie ukryje/demotuje Bid headline.

---

## 8. Deprecation Candidates

| Kandydat | Etap | Uwaga |
|----------|------|-------|
| Bid jako **równorzędny primary PLN** w Hub/Outcome/DW headline | **S3-C** (presentation) | Bid zostaje w detail |
| Duplicate Bid finance cards przy Expert ON | **S3-C** / S4 | DF HIDE |
| Tip copy „jedyny silnik oferty końcowej” w bid-adapter | docs/comment po S3-B | nie domain |
| TRE `recommendedOfferPln` naming conflation | S7 / presentation | TRE nadal Bid do S7 |
| Strategy read z `dossier.bidProposal` bez live Bid | po S3-B mostku | nie DELETE Bid |

**NIE deprecate w S3:** Bid calculator · OfferBoq · Expert formuły · `ourEstimatePln` field.

---

## 9. Remove Candidates

| Kandydat | Kiedy | Gate |
|----------|-------|------|
| Bid jako authoritative gdy Expert ON | **S3-D** (poza S3 default) | parity PASS + Owner GO |
| Hard REMOVE `computeTenderBidProposal` | **S8 / ALIGN-BID-RETIRE** | DF gates: parity · Strategy mostek · TRE retire |
| Legacy `tenderDossier.bidProposal` slot | po migracji Strategy / apply path | osobny AUDIT |
| Catalog-only Bid fallback | tylko gdy OfferBoq always-ready | nie S3 |

**S3 default:** Bid **NIE** usuwany (AC-S3-4).

---

## 10. 8 LOCK

| # | Obszar | Audit touch? | S3 PLAN allow? |
|---|--------|--------------|----------------|
| 1 | Expert BC | **NO** | NO TOUCH |
| 2 | Chief BC | **NO** | NO TOUCH |
| 3 | Session | **NO** | NO TOUCH (reuse flag) |
| 4 | Validation BC | **NO** | NO TOUCH |
| 5 | Decision Workspace BC | **NO** | thin PLN headline only (S3-C) |
| 6 | Decision Persist | **NO** | NO TOUCH |
| 7 | TF | **NO** | NO TOUCH |
| 8 | OfferBoq / Bid **domain calc** | **NO** | harness observe only · no formula edit |

**8 LOCK:** **PASS**

**Expert compatibility:** **PASS** — `chief-orchestrator` **nie** importuje Bid; Validation porównuje Offer, nie Bid. Usunięcie Bid **nie** jest wymagane do działania Expert; Bid **nie** jest wymagany przez Expert runtime.

---

## 11. Recommended S3 Plan

Zgodnie z DF §5.3 / PLAN §5 — **bez** wychodzenia poza etapy:

### S3-A — Observation (NO domain)

1. Harness `scripts/test-tender-modernization-01-pricing-parity.mjs` (lub równoważny)  
2. Porównaj `recommendedBidPln` vs `offerPricePln` na Owner allowlist fixtures  
3. Metryki delta · kategorie: PASS / Acceptable (floor/safe) / Mismatch / Documented gap (overrides)  
4. **ZERO** zmian formuł

### S3-B — Authoritative designation (docs + thin gate)

1. Expert ON + hardParityPass ⇒ authoritative = **Offer `offerPricePln`**  
2. Expert OFF ⇒ authoritative = **Bid `recommendedBidPln`**  
3. Bid pozostaje compatibility / Wycena detail / Strategy  
4. Domain calc **NO TOUCH**

### S3-C — Presentation (thin UI)

1. Jeden primary PLN na Hub / Outcome headline / DW finance  
2. Mismatch badge gdy Expert ON i poza threshold  
3. Bid detail dostępny, nie jako 2. „oferta”  
4. Allowlist: thin Hub/Outcome/DW headline wire + harness

### S3-D — OUT of default S3

Deprecate Bid authoritative → osobny Owner GO (S8 / ALIGN-BID-RETIRE).

### Kolejność zależności

```text
S3-A harness  →  S3-B designation  →  S3-C UI single PLN
S4 Hub UX zależny od single PLN (zalecane po S3)
S7 TRE deprecate wymaga S3 pricing parity
```

---

## 12. Risks

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| PLN mismatch niezauważony w UI | HIGH | S3-A harness + S3-C badge |
| Blind delete Bid | CRITICAL | AC-S3-4 · S3-D gates · 8 LOCK |
| Trzeci pricing engine „żeby zrównać” | CRITICAL | DF zakaz · ALIGN epic tylko Owner GO |
| Domain formula „align” drift | HIGH | presentation/harness only |
| `ourEstimatePln` vs live Bid vs Offer — trzy liczby | HIGH | udokumentować w harness; nie kasować pola |
| Strategy KPI czyta stale `dossier.bidProposal` | MED | obserwacja S3-A; mostek później |
| Competitive Bid ≪ Offer przy wysokim priceWeight | MED | Acceptable/Mismatch per threshold; nie zmieniać formuły w S3 |
| TRE nadal etykietuje Bid jako „Offer” | MED | S3-C demote / S7 |

---

## 13. Rollback

| Etap | Rollback (DF) |
|------|----------------|
| S3-A | usuń/wyłącz harness warn-only |
| S3-B | designation OFF → primary = Bid |
| S3-C | primary PLN = Bid; badge OFF |
| S3-D | nie wdrażać bez GO; jeśli wdrożono — przywróć Bid authoritative flag |

**Bez** migracji store · **bez** undo Expert/Chief.

---

## 14. Verdict

### STOP conditions checklist

| STOP | Wynik | Komentarz |
|------|-------|-----------|
| OfferBoq nie może być authoritative **Offer PLN** | **N/A → OK** | OfferBoq = koszt SSOT; Offer PLN target = Offer Expert (DF). OfferBoq pozostaje producer L1. |
| Dwa różne znaczeniowo „Offer PLN” bez desygnacji | **ISTNIEJE, ale DF desygnuje** | Nie BLOCKED — to przedmiot S3 ALIGN |
| Bid wymagany przez Expert runtime | **FAIL STOP (czyli PASS)** | Chief/Validation **bez** Bid |
| Usunięcie Bid = utrata danych | **N/A w S3** | Bid nie usuwany; live calc + `ourEstimatePln` zostają do parity |
| S3 wymaga zmiany Expert/Chief/Validation BC | **NIE** | S3-A/B/C bez BC |
| Konflikt z DESIGN FREEZE | **NIE** | Audit zgodny z DF §5 |

### Scorecard

| Gate | Wynik |
|------|-------|
| **S3 AUDIT** | **COMPLETE** |
| Authoritative Offer PLN (dziś) | Bid `recommendedBidPln` |
| Authoritative Offer PLN (target DF) | Offer Expert `offerPricePln` |
| Bid PLN | Runtime kalkulacja (+ opc. `ourEstimatePln` snapshot) |
| **Parity** | **PARTIAL** |
| **Consumer map** | **PASS** |
| **Expert compatibility** | **PASS** |
| **8 LOCK** | **PASS** |
| Remove candidates | Bid authoritative (S3-D+) · Bid calculator hard REMOVE (S8) · legacy dossier.bidProposal (później) |
| Deprecation candidates | Dual primary PLN · duplicate finance · tip „jedyny silnik” · TRE label conflation |
| **Recommended plan** | S3-A Observation harness → S3-B Designate Offer when Expert ON → S3-C Single primary PLN + badge · S3-D OUT |
| **READY FOR PLAN** | **YES** |
| **BLOCKED** | **NO** |

```text
S3 AUDIT COMPLETE

Authoritative Offer PLN:
  TODAY  = Bid recommendedBidPln (tip UI / TRE / finance)
  TARGET = Offer Expert offerPricePln (Expert ON + S3-B parity PASS)
  OfferBoq = SSOT direct cost (NOT offer PLN)

Bid PLN:
  Runtime calculation via computeTenderBidProposal
  (OfferBoq→Bid or catalog); optional ourEstimatePln persist

Parity: PARTIAL
Consumer map: PASS
Expert compatibility: PASS
8 LOCK: PASS

Remove candidates:
  - Bid authoritative role (S3-D / Owner GO)
  - computeTenderBidProposal hard REMOVE (S8 / ALIGN-BID-RETIRE)
  - stale tenderDossier.bidProposal slot (later AUDIT)

Deprecation candidates:
  - Dual primary PLN in Hub/Outcome/DW
  - Duplicate Bid finance cards when Expert ON
  - Adapter tip “jedyny silnik oferty”
  - TRE recommendedOfferPln naming (= Bid)

Recommended plan:
  S3-A harness Bid vs Offer (NO domain)
  → S3-B designate Offer authoritative when Expert ON + parity
  → S3-C thin single primary PLN + mismatch badge
  → S3-D deprecate Bid authoritative OUT of default

READY FOR PLAN
```

---

## Key file index

| Plik | Rola w audycie |
|------|----------------|
| `src/lib/tenders-bid-calculator.ts` | Bid engine |
| `src/lib/tender-offer-boq-bid-adapter.ts` | OfferBoq→Bid |
| `src/lib/tender-offer-boq-explainability.ts` | `computeRuntimeBidFromOfferBoq` |
| `src/app/hooks/useTenderPricingAuto.ts` | live Bid selection |
| `src/lib/tender-recommendation-result.ts` | TRE Bid→„Offer” label |
| `src/lib/tender-owner-view-ux.ts` | Decision finance Bid/`ourEstimate` |
| `src/lib/tenders-strategy-kpi.ts` | Strategy `bidValuePln` |
| `src/lib/offer-expert/compute-offer.ts` | Offer PLN formula |
| `src/lib/offer-expert/strategy.ts` | 12%/5% defaults |
| `src/lib/chief-wire-adapters/offer-strategy.ts` | Bid bridge OUT |
| `src/lib/chief-orchestrator/run.ts` | Offer bez Bid |
| `src/lib/validation-expert/consistency.ts` | Offer consistency only |
| `src/lib/decision-workspace-ui/view-model.ts` | Offer passthrough |
| `docs/architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md` §5 | policy LOCKED |

---

**Runtime changes:** NONE  
**Commit:** NONE  
**Push:** NONE
