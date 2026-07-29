# COST-BID-GAP-01 — RCA (RCA-0 → RCA-6)

> **ID:** COST-BID-GAP-01-RCA  
> **MODE:** RCA ONLY · analiza docs + kod + read-only probe KV  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Status:** **COMPLETE** → wejście do DESIGN FREEZE  
> **Tip:** **2.65.76** · fixture `08dee335-f338-1f30-ebd1-65000155122a`  
> **Zakaz sesji:** IMPLEMENT · commit · push · edycja COST-MULTI / Discovery / parsers / Payroll / cloud-sync  
> **Artefakt pomiaru:** `.tmp/cost-bid-gap-01-rca-probe.json` (READ-ONLY `batch-get`)  
> **Wejście:** [`COST-BID-GAP-01-AUDIT.md`](COST-BID-GAP-01-AUDIT.md) · [`COST-BID-GAP-01-PLAN.md`](COST-BID-GAP-01-PLAN.md)

```text
════════════════════════════════════════════════════════
PYTANIE: skąd 1 061 000 i dlaczego ≪ Owner ~1 600 000?
ODPOWIEDŹ (skrót): pricingMode=catalog na Aggregate;
  direct catalog ~614 k → stack Bid → 1 061 k.
  offer_boq_ai daje JESZCZE MNIEJ (~949 k).
  Sam costModel NIE domyka 1,6M (sensitivity max ~1,33M).
  Główna przyczyna: zaniżone stawki / UNKNOWN w katalogu
  (direct za niski) — nie brak Aggregate, nie Discovery.
════════════════════════════════════════════════════════
```

---

## RCA-0 — Call path Bid Proposal + źródło 1 061 000

### 0.1 Call path (SSOT)

```text
TenderPipelineItem (KV kw-tenders-pipeline)
        │
        ├─ resolveCostBidInput(item)          [cost-multi-02.ts]  READ
        │     mode = AGGREGATE
        │     kosztorysForBid = AGGREGATE:4-branches (196 catalog qty)
        │     dossier.kosztorys = ONE Pensjonat (bez zmian)
        │
        ├─ [UI live, COST-PIPELINE-01 default ON]
        │     resolveTenderPricingAutoProposal
        │       → computeRuntimeBidFromOfferBoq  (prefer)
        │       → fallback computeCatalogBidProposalForPricingAuto
        │
        └─ [PV / liczba 1 061 000 — ścieżka zmierzona]
              computeTenderBidProposal({
                kosztorys: kosztorysForBid,
                costModel: profile.costModel,
                catalog: resolveActiveCatalogForTender(...),
                // BEZ offerBoqDirect
              })
              → pricingMode = "catalog"
              → aggregateCatalogDirectCost → Bid tail (Kp/marża)
              → recommendedBidPln = 1 061 000
```

**Jedyny silnik oferty:** `computeTenderBidProposal` (`tenders-bid-calculator.ts`).

### 0.2 Źródło wartości **1 061 000**

| Pole | Wartość |
|------|---------|
| `resolveCostBidInput.mode` | **AGGREGATE** |
| `kosztorysForBid.sourceFilename` | `AGGREGATE:4-branches` |
| `pricingMode` | **`catalog`** |
| `recommendedBidPln` | **1 061 000** |
| `floorBidPln` | **1 061 000** (= recommended; brak dominacji kryterium ceny) |
| `costPricePln` | **1 010 400** |
| Wejście qty | **196** linii `catalogQuantities` |
| `catalogUnknownPct` | **~31,6%** (62/196) |

**Potwierdzenie:** FINAL PV i świeży probe (2026-07-29) — identyczny Bid **1 061 000**, mode **catalog**.

**Uwaga UI:** przy włączonym COST-PIPELINE-01 Outcome może iść przez **`offer_boq_ai`** (RCA-3) → **~949 k** (niżej). Liczba „1,06M” z PV = **świadomy dump catalog**, niekoniecznie to, co widać po wire OfferBoq.

### 0.3 Co NIE jest źródłem 1,06M

| Hipoteza | Werdykt |
|----------|---------|
| Brak Aggregate / nadal ONE | **ODRZUCONA** — mode AGGREGATE, Δ vs ONE +768 k |
| Discovery Pensjonat = Bid | **ODRZUCONA** — Bid czyta `kosztorysForBid`, nie ONE |
| `ath_priced` | **ODRZUCONA** — `totalValue` null na Aggregate |
| Hardcoded 1,06M | **ODRZUCONA** — wynik `roundPln(floorBid)` ze stacku |

---

## RCA-1 — Full dump Company Cost Stack (catalog → 1 061 000)

### 1.1 Cost model (prod profile KV)

| Parametr | Wartość |
|----------|---------|
| `kpPct` | **14** |
| `profitPct` | **8** |
| `riskReservePct` | **4** |
| `minMarginPct` | **5** |
| `avgGrossHourlyPln` | **28,62** → FL **35,20** zł/h (+ZUS 23%) |
| `materialPriceIndexPct` | **108** |
| `laborNormIndexPct` | **100** |
| `fixedOverheadMonthlyPln` | **45 000** |
| `maxConcurrentProjects` | **2** |
| `minProjectDays` | **20** |
| Czas projektu (impl.) | **140 dni** → **~27,6 tyg.** w stacku |

### 1.2 `costStack` (zaokrąglenia Bid ±100 zł)

| # | Linia | PLN | % Bid |
|---|-------|-----|-------|
| 1 | Robocizna (Biblioteka Robót + ZUS) | **123 700** | 11,7% |
| 2 | Materiały (Biblioteka Robót) | **490 400** | 46,2% |
| | **= Direct (labor+mat)** | **~614 100** | **57,9%** |
| 3 | Kp 14% | **86 000** | 8,1% |
| 4 | Koszty poboczne tyg. | **56 300** | 5,3% |
| 5 | Stałe KZP (overhead) | **143 200** | 13,5% |
| 6 | Zysk 8% | **72 000** | 6,8% |
| 7 | Rezerwa ryzyka 4% | **38 900** | 3,7% |
| 8 | + marża min. 5% → **floor/recommended** | **1 061 000** | 100% |

**Mnożnik direct → Bid:** \(1 061 000 / 614 095 ≈ **1,73×**\).

**Wniosek RCA-1:** Stack jest **kompletny i spójny** z kodem. Luka vs 1,6M **nie wynika z „braku marży w stacku”** — narzuty już są (~42% Bid ponad direct). Brakuje **bazy direct** albo **znacznie agresywniejszego modelu** (RCA-5).

---

## RCA-2 — Direct Cost z Catalog

### 2.1 Agregat Aggregate (196 linii)

| Metryka | Wartość |
|---------|---------|
| `rowCount` | **196** |
| `classifiedCount` | **134** |
| `unknownCount` | **62 (31,6%)** |
| Material | **490 424** PLN |
| Labor | **123 671** PLN (**3 513** rbh) |
| **Direct** | **614 095** PLN |

Źródło stawek: `wgdom-cost-catalog` (seed + aktywny katalog) × `materialPriceIndexPct` / `laborNormIndexPct` — **nie** ATH total (brak), **nie** `marketQuotes` Work Catalog na tej ścieżce.

### 2.2 Direct per Branch winner

| Branża (plik) | qty | UNKNOWN | Direct PLN | Bid solo* |
|---------------|-----|---------|------------|-----------|
| finishes (Pensjonat) | 80 | 33 | **42 762** | 292 800 |
| construction (budowlana) | 43 | 11 | **280 894** | 613 000 |
| electrical | 63 | 15 | **285 368** | 622 900 |
| fire (hydrantowa) | 10 | 3 | **5 071** | 246 000 |
| **Suma direct** | 196 | 62 | **≈614 k** | — |

\*Bid solo per plik **nie sumuje się** do oferty (każdy zawiera pełny overhead ~27,6 tyg.) — tylko ilustracja skali.

### 2.3 Wniosek RCA-2

- Aggregate **poprawnie sumuje** directy branż (~614 k).  
- **31,6% UNKNOWN** → fallback stawek → ryzyko **systematycznego niedoszacowania**.  
- Materiały ≈ **80%** direct — kalibracja material rates ma największy dźwignię.  
- H3 (fidelity / brak pozycji): 196 linii = suma rows winners; bez dowodu „gubi połowę PDF” — **H3 nie jest główną przyczyną** przy obecnym dowodzie (może współistnieć, nie domyka sam Δ 0,54M).

---

## RCA-3 — Porównanie z `offer_boq_ai`

| | Catalog (PV 1,06M) | offer_boq_ai (probe) |
|--|--------------------|----------------------|
| Direct | **614 095** | **528 114** |
| Materials | 490 424 | 266 456 |
| Labor (+eq/tr/aux w AI) | 123 671 | 261 658* |
| `pricingMode` | `catalog` | `offer_boq_ai` |
| **recommendedBid** | **1 061 000** | **949 300** |
| Confidence | — | **low** |
| CK hits | — | **0** |
| Komponenty | — | 578/578 priced |

\*W AI: labor 87 k + transport 125 k + auxiliary 49 k + equipment 0,3 k.

**Wniosek RCA-3:** ścieżka AI Cost **nie zbliża** do 1,6M — **oddala** (−112 k vs catalog).  
H5 („Owner widzi catalog, a powinien AI”) — **ODWRÓCONA:** włączenie OfferBoq **pogarsza** lukę.  
Live Outcome (PIPELINE-01) może pokazywać **~0,95M**, nie 1,06M — explain musi to rozróżniać.

---

## RCA-4 — Market Quotes / Market Uplift

### 4.1 Architektura

| Ścieżka | Czy czyta `marketQuotes` / COST-02-A? |
|---------|--------------------------------------|
| **catalog Bid** (źródło 1,06M) | **NIE** — tylko `wgdom-cost-catalog` + indeksy costModel |
| **offer_boq_ai** | **TAK** — `createControlledMarketPriceProvider` w S4 |

### 4.2 Pomiar probe (Node / `loadWorkCatalogStoreLocal`)

| Metryka | Wartość |
|---------|---------|
| `worksInRegion` (wroclaw) | **0** |
| `linesControlledMarket` | **0** |
| `linesCompanyKnowledge` | **0** |
| Uplift market na Bid | **0 PLN** w tym środowisku pomiaru |

**Ograniczenie:** Work Catalog w LS procesu Node = pusty. W przeglądarce Ownera katalog może być zapełniony — wtedy offer_boq mógłby dostać market hits. **Nawet wtedy** catalog Bid (1,06M) **nie** korzysta z marketQuotes bez osobnego wiru.

### 4.3 Wniosek RCA-4

- **H1 (stawki)** — **POTWIERDZONA** dla ścieżki catalog: seed katalogu WGDOM + UNKNOWN → direct ~614 k vs potrzeba ~0,92–1,0M+ direct do Bid≈1,6M.  
- Market Quotes **nie wpływają** na zmierzone 1,06M.  
- Samo „włączyć market w OfferBoq” bez bogatego Work Catalog / lepszego mapowania **nie** naprawi (RCA-3: AI już niżej).

---

## RCA-5 — Sensitivity Company Cost Model

Baseline Bid catalog = **1 061 000**. Cel Owner ≈ **1 600 000** (Δ **+539 000**).

| Scenariusz | Bid PLN | Δ vs baseline | Do 1,6M? |
|------------|---------|---------------|----------|
| profitPct 12 | 1 100 200 | +39 k | NIE |
| profitPct 15 | 1 129 700 | +69 k | NIE |
| profitPct 20 | 1 178 800 | +118 k | NIE |
| minMargin 10% | 1 111 500 | +51 k | NIE |
| minMargin 15% | 1 162 000 | +101 k | NIE |
| kpPct 18 | 1 089 900 | +29 k | NIE |
| kpPct 20 | 1 104 400 | +43 k | NIE |
| materialIndex 120 | 1 134 200 | +73 k | NIE |
| materialIndex 130 | 1 195 300 | +134 k | NIE |
| materialIndex 150 | 1 317 400 | +256 k | NIE |
| laborNorm 120 | 1 094 200 | +33 k | NIE |
| laborNorm 130 | 1 110 800 | +50 k | NIE |
| **combo** (p12, m10, kp18, mat125, lab115) | **1 328 900** | +268 k | **NIE** (−271 k) |

**Wniosek RCA-5:**  
**H2 (sam stack/marża)** — **ODRZUCONA jako główna przyczyna**. Nawet agresywny combo ≈ **1,33M** ≪ 1,6M.  
Bez **podniesienia direct** (stawki catalog / mniej UNKNOWN / realne ceny rynkowe na wejściu Bid) **nie da się** uczciwie domknąć 1,6M samym `costModel`.

Orientacja: przy mnożniku ~1,73× potrzeba **direct ≈ 925 k+** (vs dzisiejsze **614 k**, czyli **+~50%** na stawkach/ilościach wycenionych).

---

## RCA-6 — Synteza H1–H5 + przyczyna + rekomendacja Thin Slice

### 6.1 Werdykt hipotez

| ID | Hipoteza | Werdykt | Wkład w lukę ~539 k |
|----|----------|---------|---------------------|
| **H1** | Stawki catalog ≪ Owner / rynek (+ UNKNOWN) | **POTWIERDZONA — PRIMARY** | **Dominujący** (~ cały gap po odrzuceniu H2) |
| **H2** | costModel (Kp/zysk/marża) za niski | **WTÓRNA / NIEWYSTARCZAJĄCA** | max ~+0,27M w combo; nie domyka |
| **H3** | Fidelity / brak pozycji (TP200B) | **NIE PRIMARY** (brak dowodu ubytku qty vs winners) | nieznany; MONITOR |
| **H4** | Overlap branż | **NIE PRIMARY** | niski |
| **H5** | Zły path (trzeba offer_boq_ai) | **ODRZUCONA** (AI **niżej**) | ujemny (−112 k) |
| ~~H0~~ | Brak Aggregate | **CLOSED w COST-MULTI** | — |

### 6.2 Rzeczywista przyczyna luki

```text
ROOT CAUSE (COST-BID-GAP-01):

  Aggregate + Branch Winners działają (MULTI CLOSED).
  Bid 1 061 000 = catalog direct (~614 k) × company cost stack (~1,73×).

  Luka vs Owner ~1 600 000 ≈ brakujące ~310 k+ w DIRECT
  (albo równoważne niedoszacowanie stawek jednostkowych /
   UNKNOWN fallback / brak market feed na ścieżce catalog),
  NIE brak narzutów w Bid Proposal i NIE brak sumy branż.

  offer_boq_ai + pusty/słaby Work Catalog nie ratuje (Bid ~949 k).
```

**Kontekst biznesowy (nie RC kodu):** historyczna wygrana MOPS Kamieńskiego w profilu firmy ≈ **983 k** PLN — cel 1,6M może być inną wyceną zakresu; RCA nie weryfikuje metody Ownera (AUDIT §9 nadal wartościowe).

### 6.3 Rekomendacja **jednego** Thin Slice do DESIGN FREEZE

| Pole | Wartość |
|------|---------|
| **Slice** | **GAP-A — Catalog / rate calibration (wejście direct)** |
| **Cel** | Podnieść jakość **direct** na Aggregate (stawki Biblioteki Robót / redukcja wpływu UNKNOWN / opcjonalnie kontrolowany market overlay **na ścieżce zasilającej Bid**), bez re-open MULTI i bez drugiego kalkulatora |
| **Dlaczego nie GAP-B** | Sensitivity: costModel sam **nie** osiąga 1,6M |
| **Dlaczego nie tylko GAP-C** | Explain jest potrzebny, ale **nie usuwa** luki cenowej |
| **Dlaczego nie offer_boq-first** | RCA-3: AI path **niższy**; najpierw naprawić źródło cen / catalog |
| **OUT slice** | Discovery · parsers · `cost-multi-02` write · Payroll · cloud-sync · `sum(all)` · hardcode 1,6M · global default costModel bez osobnego GO |

**Równolegle (nie zamiast A):** **GAP-C** (thin explain RO: stack + unknown% + catalog vs AI) — osobny mikro-slice lub część DF A jako UX-only.

**GAP-B** — backlog po A, tylko jeśli Owner chce wyższy stack przy już poprawionym direct.

### 6.4 Wejście do DESIGN FREEZE (checklist)

- [x] RCA-0…6 COMPLETE  
- [x] PRIMARY RC = H1 (catalog direct / rates / UNKNOWN)  
- [x] Thin slice = **GAP-A**  
- [ ] Owner potwierdza metodę liczenia ~1,6M (opcjonalne, nie blokuje FREEZE A)  
- [ ] DF FREEZE allowlist plików GAP-A + flagi + AC  
- [ ] Arch Review  
- [ ] Owner GO IMPLEMENTATION  

### 6.5 Proponowany scope DF GAP-A (draft pod FREEZE — nie IMPLEMENT)

**IN (do zamrożenia w DF):**

- Analiza/kalibracja stawek wpływających na `aggregateCatalogDirectCost` / aktywny katalog.  
- Redukcja szkody UNKNOWN (lepsza klasyfikacja **lub** jawny uplift/flag — bez parser rewrite).  
- Opcja: kontrolowany reuse marketQuotes **tylko** jeśli DF wskaże wire do catalog/Bid wejścia (nie scraping).  
- Testy + PV fixture `08dee335` (direct↑, Bid↑ bez utraty AGGREGATE/ONE).  
- Flaga rollback.

**OUT:** jak PLAN O1–O10 + zakaz zmiany default `profitPct`/`minMarginPct` jako „fix” luki.

---

## Boundary (projekcja po RCA)

| Reguła | Status |
|--------|--------|
| #CORE-013 | PASS — jeden slice GAP-A |
| #CORE-014 | FEATURE PASS — brak payroll/cloud-sync |
| COST-MULTI / Discovery / parsers | **READ-ONLY** |
| AI-COST Freeze | bez drugiego Bid engine; S1–S7 bez rewrite |

---

## Werdykt sesji RCA

```text
RCA STATUS: COMPLETE
PRIMARY ROOT CAUSE: H1 — catalog direct underpricing (+ UNKNOWN)
SECONDARY: H2 niewystarczająca; H5 odwrotnie (AI niżej)
THIN SLICE → DF: GAP-A (catalog / rate calibration)
IMPLEMENT: NIE
COMMIT / PUSH: NIE
NEXT: DESIGN FREEZE (FREEZE v1.0 na GAP-A) → Arch Review → Owner GO
```

**Probe JSON:** `.tmp/cost-bid-gap-01-rca-probe.json` (nie commitować bez prośby Ownera).
