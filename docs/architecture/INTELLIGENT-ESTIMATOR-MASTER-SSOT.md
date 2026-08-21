# INTELLIGENT ESTIMATOR — MASTER SSOT

> **ID:** `INTELLIGENT-ESTIMATOR-MASTER-SSOT`
> **STATUS:** **ACTIVE** · **★★ SSOT Inteligentnego Kosztorysanta**
> **Data:** 2026-08-21
> **Mode:** DOCUMENTATION ONLY · **NO REBUILD**
> **AI Owner Authority (pointer only):** [`IK-AI-OWNER-AUTHORITY-POLICY.md`](./IK-AI-OWNER-AUTHORITY-POLICY.md) · gate [`OD-IK-AI-OWNER-AUTHORITY-1-GATE.md`](./OD-IK-AI-OWNER-AUTHORITY-1-GATE.md) **COMPLETE** · Level A **IMPLEMENTATION = NOT AUTHORIZED**
> **Tip produkcji:** wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`
> **Live tip (mierzone 2026-08-21):** UI **2.66.103** · commit **`b31169be`** (`b31169b` w `version.json`) · Historical EC reveal **PRODUCTION VERIFIED**
> **Snapshot baseline (historyczny wiersz labor):** UI **2.66.59** / **`9bcc558`** — Tablica OUR RATE Accept **VERIFIED** (data GO, nie osobny tip UI)
> **Sesja Autonomy 2026-08-18:** [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) — A08-P0/P1/P2 CLOSED · **nie** zastępuje tego kontraktu

```text
════════════════════════════════════════════════════════
NIE BUDUJ OD NOWA.
SEARCH BEFORE CREATE.
Przetargi + kosztorysowanie JUŻ ISTNIEJĄ.
IK = ORCHESTRACJA ISTNIEJĄCYCH MODUŁÓW WGDOM,
     nie drugi TenderModule / Catalog / Pricing / Host.
════════════════════════════════════════════════════════
```

**Legenda statusów (nie mieszać):**

| Status | Znaczenie |
|--------|-----------|
| **PRODUCTION VERIFIED** | Live na prod + dowód PV / E2E |
| **PRODUCTION EXISTING** | Na `main` / tip; działa w kodzie; nie zawsze osobny PV tego slice |
| **IMPLEMENTED** | W kodzie na `main`; weryfikacja lokalna / shadow |
| **FROZEN** | Design Freeze — nie zmieniać semantyki bez Owner GO |
| **PARTIAL** | Część ścieżki istnieje; reszta gated / incomplete |
| **WIP** | Lokalny / niecommitowany / nie tip |
| **PROPOSED** | Docelowy model UX/arch — **nie** udawać implementacji |
| **GAP** | Brak w source albo świadomie HOLD |

---

## 0. Co to jest WGDOM

**W&G DOM** — aplikacja operacyjna (React/Vite): Roboty, Lista Płac, WM Druk, **Przetargi**, Inteligentny Kosztorysant (IK).
Prod: https://www.wgdom.fun · repo `main` · FE deploy = `git push origin main` → Vercel (**zakaz** `vercel deploy`).

---

## 1. Co to jest Inteligentny Kosztorysant

```text
IK = JEDEN ZESPÓŁ EKSPERTÓW nad ISTNIEJĄCYM stackiem Przetargów.
Nie drugi chatbot. Nie drugi silnik Bid. Nie drugi Catalog.
```

| Rola (logiczna) | Rzeczywisty byt w source | NIE jest |
|-----------------|--------------------------|----------|
| **Chief** | `chief-session` + `chief-orchestrator` + dossier UI · sesja Case/Task · prezentacja stanu | Drugim TenderModule · Decydentem (D) · drugim Hostem |
| **Host / runtime orchestrator** | `IkEntryHost` — sekwencja ekspertów P2→KNR→Classification→P5→P6→Composite→P7→P8→EC | Drugim Chiefem · drugim Work Catalog |
| **Document / BOQ Expert** | `ik-document-expert` + P2 ingest bridge + Multi-BOQ / OfferBoq | Nowym storage KV |
| **Owner Map / Multi-Dwelling** | `multi-dwelling` + `MultiDwellingPackagePanel` + `ik-dwelling-mapping` | Silent invent lokali |
| **KNR Expert** | `ik-knr-expert` + Slice A `catalogBasis` + Owner mapping D + KL lookup | Work Catalog · Price Memory · auto OUR RATE |
| **Historical Executed** | `historical-executed/*` | Normatywnym KNR Catalog · authority pricing |
| **Classification** | `classification-gate` + `ik-classification` | Research / Accept |
| **Labor Expert** | `ik-labor-expert` → Work Catalog / OUR RATE / research / Evidence | Material Price Memory |
| **Material Expert** | `ik-material-expert` → Price Memory / DIY / SELL | Labor OUR RATE |
| **Composite / Position** | `ik-composite-both-hold` → `computePositionCost` (F5) | Drugim kalkulatorem pozycji |
| **Validation / Control** | `validation-expert` (P8) + HOLD Classification | Auto-Accept |
| **P7 / P8** | `ik-p7-position-cost-bid` · `ik-p8-risk-decision` | Final Bid persist / auto Owner Accept |
| **Expert Conversation** | `ExpertConversationSurface` + `ik-entry-conversation` | Osobnym LLM per ekspert · fikcyjnym chat store |

**IK nie tworzy drugiej domeny Przetargów.** REUSE: `TendersModule`, OfferBoq, F5 Position Cost, Work Catalog, Price Memory, Evidence, Accept, Multi-Dwelling, Bid PDF.

---

## 2. Hard locks (NO REBUILD)

**FORBIDDEN bez Owner GO + AUDIT:**

- nowy `TendersModule` / Tender Workspace / TenderDetail / drugi `IkEntryHost`
- nowy Work Catalog / Material Catalog / Price Memory / Evidence / OUR RATE / Accept
- nowy parser BOQ/ATH / identity engine / classification engine
- nowy labor/material research engine / drugi Historical index
- nowy PDF engine (najpierw REUSE istniejącego stacku)
- drugi orchestrator IK / drugi Chief / drugi KNR „system”
- `Evidence → OUR RATE` bez Candidate + Owner Accept
- `companyPricePln → OUR RATE`
- `pkt ≡ mb` bez dowodu
- research dla **COMPOUND** / **UNKNOWN**
- Historical `authority=true` bez osobnego Owner GO
- KNR auto-write `catalogWorkId` poza Slice D / authority boundaries
- `git add -A` · `vercel deploy`

---

## 3. Mapa dokumentów SSOT (ten zestaw)

| Dokument | Rola |
|----------|------|
| **TEN PLIK** | ★★ Master kontrakt IK — **najwyższy kontrakt** |
| [`IK-AI-OWNER-AUTHORITY-POLICY.md`](./IK-AI-OWNER-AUTHORITY-POLICY.md) | ★★ **AI Owner Authority** (ChatGPT Level A/B/C) · **pointer only** · nie zastępuje Master SSOT · Level A execute **NOT AUTHORIZED** · gate [`OD-IK-AI-OWNER-AUTHORITY-1-GATE.md`](./OD-IK-AI-OWNER-AUTHORITY-1-GATE.md) |
| [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) | ★★ Sesja Autonomy 05–08 · A08-P2 **CLOSED** · **nie** drugi kontrakt |
| [`INTELLIGENT-ESTIMATOR-ARCHITECTURE.md`](./INTELLIGENT-ESTIMATOR-ARCHITECTURE.md) | Warstwy + ścieżki plików |
| [`INTELLIGENT-ESTIMATOR-DATA-FLOW.md`](./INTELLIGENT-ESTIMATOR-DATA-FLOW.md) | LABOR / MATERIAL / Classification flows |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | Component → file → status → DO NOT DUPLICATE |
| [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md) | Tip · Tablica · HOLD/GAP (labor data) |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Cold-start ChatGPT + protokół Cursor |
| Tip UI/commit | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| Cold-start projekt | [`../AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md) |
| Entry procesu | [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) · Gate payroll |
| **IK-MIGRATION-01** | [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) · [`DESIGN-FREEZE`](./IK-MIGRATION-01-DESIGN-FREEZE.md) — P0–P9 **LOCKED / COMPLETE** |
| KNR Expert DF | [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) · Slice A/B/C/D docs w tym katalogu |
| Historical Executed | `IK-HISTORICAL-EXECUTED-ATH-*` · Host Wiring · EC reveal VERIFY |
| Owner Map / Multi-Dwelling | `MULTI-DWELLING-*` · `MULTI-BOQ-*` · OPS Owner Map smoke |

**Pozostałe dokumenty** (architecture / DF / plan / audit / handoff / verify) **nie zastępują** tego Master SSOT.

**Historyczne (nie tip):** [`INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md`](./INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md) — Technology Foundation slices · **tip = 09**, nie ten plik.

---

## 4. Classification Gate (przed research)

**SSOT:** `classifyEstimatorPricingPlane` — `src/lib/intelligent-estimator/classification-gate.ts`
**Orkiestracja:** `runIkMasterBoqClassification` — `src/lib/intelligent-estimator/ik-classification.ts`
**Owner map:** `src/lib/intelligent-estimator/owner-classification-map.ts`

Owner map (freeze — liczby historyczne mapy):

| Plane | Count |
|-------|------:|
| LABOR | 29 |
| MATERIAL | 24 |
| COMPOUND | 6 |
| UNKNOWN | 30 |

| Plane | Routing |
|-------|---------|
| LABOR | Work Catalog → research przy MISS |
| MATERIAL | Price Memory → material research przy MISS |
| COMPOUND | **HOLD** · zero research · zero invent |
| UNKNOWN | **HOLD** · zero research · zero invent |

Miss → **UNKNOWN**. Classification **BEFORE** source selection.
**Status:** **PRODUCTION EXISTING** · **FROZEN** (semantyka).

---

## 5. Evidence ≠ OUR RATE

```text
Evidence (KV kw-wgdom-labor-source-evidence)
  → Candidate (ephemeral research)
  → Owner Decision
  → acceptWorkRateResearchCandidate
  → ourWorkRate (CatalogWork)
```

| Warstwa | Znaczenie |
|---------|-----------|
| SOURCE RANGE | np. 312–780 |
| marketBase (DERIVED) | midpoint / mediana |
| proposed | marketBase × (1+margin/100) |
| OUR RATE | dopiero po Accept |

**NIGDY:** Evidence write ≠ Accept · pricePoint Evidence ≠ auto 546.

Szczegóły: [`IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md`](./IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md)

---

## 6. Pricing value layers (nie mieszać)

| Symbol | Znaczenie | Authority |
|--------|-----------|-----------|
| purchase / DIY low | cena zakupu materiału | Material research / PM |
| marketBase | DERIVED rynek labor | Evidence / Candidate — **≠** OUR RATE |
| companyPricePln | LEGACY TECHNICAL | **≠** OUR RATE · **≠** Bid SSOT |
| ourWorkRate | firmowa stawka robocizny | Work Catalog SSOT labor |
| SELL | materiał po marży `commercialPricing` | Material commercial |
| marginPct | WGDOM commercial | Material |
| catalogBasis / KNR | evidence normatywne / oznaczenia | KNR — **≠** stawka |
| Historical EXACT/FAMILY/… | porównanie ATH historyczne | `authority=false` |
| Position Cost / Bid / Offer | warstwy oferty | F5 / Bid / Offer — REUSE |

---

## 7. Legacy Przetargi

Stary tor Bid / TRE / DecisionView **NIE jest kasowany** teraz.

Proces rozłączania: AUDIT → consumers → seam → DF → Owner GO → migrate → PV → cleanup.
**NIE:** delete module · rewrite · clone V2/V3.

TM-01 EPIC CLOSED (S0–S9). Inteligentny Kosztorysant UX CLOSED (presentation).
Workflow Przetargu: [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md).

NG-10 Autonomous Run = **KEEP TEMPORARY** — **nie** rozwijać jako IK ([`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)).

---

## 8. Aktualny stan (skrót)

Patrz [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md) + tip **09** + live `version.json`.

| Item | Status |
|------|--------|
| Tablica | Evidence VALID · OUR RATE **546** ACCEPT · **CLOSED** |
| Podejście | HOLD · UNIT_EQUIVALENCE **UNPROVEN** (pkt vs mb) |
| Wykwity | SOURCE GAP REAL |
| ACTIVE EPIC IMPLEMENT | **NONE** bez Owner GO |
| **IK-MIGRATION-01** | P0–P9 **LOCKED / COMPLETE** |
| **AUTONOMY-05…07** | COMPLETE / CLOSED · P5–P8 `"AUTO"\|"OFF"\|"ON"` · Research **CONDITIONAL** |
| **AUTONOMY-08 P0–P2** | **COMPLETE / CLOSED** |
| **AUTONOMY-08 epic** | **NOT CLOSED** |
| **KNR Slice A** | catalogBasis evidence · **PRODUCTION VERIFIED** (tip historia `93eb41be`) |
| **Historical Host Wiring** | `64f38479` · **PRODUCTION EXISTING** |
| **Historical EC reveal** | `b31169be` · **PRODUCTION VERIFIED** (2026-08-21) |
| Tip produkcji | **czytaj 09** + live `version.json` (**nie** hardcoduj tu na stałe bez aktualizacji) |

### 8.1 LIVE evidence — Historical EC (konkretny tender, nie globalny benchmark)

| Pole | Wartość |
|------|---------|
| Tender | **2026/BZP 00391783** (MOPS) |
| Prod | **2.66.103** / **`b31169be`** |
| READY_FOR_EXPERTS | true |
| KNR | COMPLETED · withBasis=88 |
| Host Index | occurrences=**253** · sourceCount=**9** · **authority=false** |
| EC Historical | OBSERVED · EXACT=**3** · FAMILY=**48** · CONFLICT=**6** · MISS=**31** · skipped=**1** |
| PV | **PASS WITH GAPS** · Historical runtime errors=**0** |

**Nie** generalizuj tych liczb na cały IK / wszystkie przetargi.

---

## 9. NEXT

Tylko **Owner GO** → **AUDIT** → DF → IMPLEMENT.

**IK AUTONOMY-08 P2:** **COMPLETE / CLOSED**. **Nie** reopen. **Nie** start A08-P3 bez GO.

**IK-MIGRATION-01:** P0–P9 LOCKED — **nie** wracaj do „GO P1 entry shell” / „GO P2 Document Expert” jako next.

**Historical EC reveal slice:** **CLOSED / PRODUCTION VERIFIED** (`b31169be`) — **nie** otwieraj kolejnego gate bez nowego Owner GO.

Kandydaci poza tym slice: residual C1–C6 · PACKAGE layer (COMPOUND HOLD freeze) · labor unit proof (Podejście) · KL corpus / Owner Map ops.
**NIE** invent S10 / drugiego TenderModule / auto-Accept / global D=ON jako IK / REMOVE NG-10.

Sesja Autonomy: [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md).

---

## 10. Pełne drzewo IK (CURRENT · source-verified)

```text
INTELLIGENT ESTIMATOR
│
├── CHIEF                          → chief-session + chief-orchestrator + dossier UI
├── HOST / RUNTIME ORCHESTRATOR    → IkEntryHost (sekwencja ekspertów)
│
├── DOCUMENT / BOQ EXPERT          → ik-document-expert + P2 ingest + OfferBoq/Multi-BOQ
├── OWNER MAP / MULTI-DWELLING     → multi-dwelling + MultiDwellingPackagePanel
├── KNR EXPERT                     → ik-knr-expert + catalogBasis + Owner mapping + KL lookup
├── HISTORICAL EXECUTED            → historical-executed/* (authority=false)
├── CLASSIFICATION                 → classification-gate + ik-classification
├── LABOR EXPERT                   → ik-labor-expert → Work Catalog / research / Evidence / Accept
├── MATERIAL EXPERT                → ik-material-expert → Price Memory / DIY / SELL
├── COMPOSITE / POSITION           → ik-composite-both-hold → tender-position-cost (F5)
├── VALIDATION / CONTROL           → validation-expert (+ Classification HOLD)
├── P7 POSITION COST / BID         → ik-p7-position-cost-bid
├── P8 RISK / DECISION             → ik-p8-risk-decision
├── EXPERT CONVERSATION / TEAM UI  → ExpertConversationSurface + ik-entry-conversation
└── BID / OFFER / PDF              → tenders-bid-calculator · OfferBoq · tender-bid-package-pdf
```

### 10.1 Przepływ runtime (CURRENT)

```text
PRZETARG
  → TendersModule
  → TenderDetailPage
       → useHistoricalExecutedHostIndex(jobs)     [gdy IK ON]
       → useChiefOrchestratorSession              [Chief / D / P4]
       → IkEntryHost
            → P2: runIkNg02IngestBridge → runIkDocumentExpert
            → Owner Map gate (documentToDwelling / allMapped) gdy multi
            → runIkKnrExpert(+ historicalIndex) → applyOwnerKnrMapping
            → KL-3 HOST lookup-only (side-channel; nie conversation authority)
            → runIkMasterBoqClassification
            → P5: runIkMasterBoqLaborExpert → lookupWorkRate / research MISS
            → P6: runIkMasterBoqMaterialExpert → Price Memory / research MISS
            → P5∧P6: runIkCompositeBothHold → computePositionCost
            → P7: runIkP7PositionCostBid
            → P8: runIkP8RiskDecision(chiefSession)
            → buildIkEntryConversationViewModel → ExpertConversationSurface
  → Bid / Offer / PDF (istniejący stack Hub/Detail — nie drugi silnik)
```

**Flagi:** `src/lib/intelligent-estimator/ik-entry-flag.ts` — dostęp IK + P5–P8 AUTO/OFF/ON · Research **CONDITIONAL**.
Shell defaults w `IkEntryHost`: `IK_ENTRY_SHELL_* = false` (AUTO_INGEST / EXECUTE_RESEARCH / RUN_RATE_EXPERTS / IDENTITY_COVERAGE).

---

## 11. Karty elementów (SOURCE-VERIFIED)

### 11.1 Chief

| | |
|--|--|
| **Pliki** | `src/lib/chief-session/*` · `src/lib/chief-orchestrator/*` · `src/lib/chief-dossier-ui/*` · `src/lib/chief-wire-adapters/*` · `src/app/hooks/useChiefOrchestratorSession.ts` |
| **Rola** | Case / Task / dossier / lifecycle / prezentacja stanu zespołu |
| **Wywołuje** | TenderDetailPage (właściciel sesji) → prop do `IkEntryHost` / P8 |
| **NIE** | Drugi Host · flip `expertAiDecydentEnabled` jako IK · auto Final Bid |
| **Status** | **PRODUCTION EXISTING** · wiring P4 **PARTIAL** (gated flagami) |

### 11.2 Host / Runtime Orchestrator (`IkEntryHost`)

| | |
|--|--|
| **Pliki** | `src/app/intelligent-estimator/IkEntryHost.tsx` · `ik-entry-flag.ts` · `ik-entry-p2-ingest-latch.ts` · `ik-entry-conversation.ts` |
| **Rola** | Sekwencja ekspertów + data attrs observability + EC surface |
| **NIE** | Nowy Catalog · auto research (shell OFF) · drugi Chief |
| **Status** | **PRODUCTION EXISTING** · Host Historical + EC reveal **PRODUCTION VERIFIED** (slice 2026-08-21) |

### 11.3 Document / BOQ Expert

| | |
|--|--|
| **Pliki** | `src/lib/intelligent-estimator/ik-document-expert.ts` · `ik-ng02-ingest-bridge.ts` · `src/lib/tender-ingest/*` · `src/lib/multi-boq/*` · `src/lib/tender-offer-boq.ts` · ATH/PDF: `ath-parser` / dossier / `pdf-przedmiar-heuristic` |
| **Wejście** | Tender item · dokumenty · ingest |
| **Wyjście** | Master BOQ / OfferBoq lines · identity · qty · unit · `catalogBasis` (Slice A) |
| **NIE** | Nowy parser KV · research · Accept · F5 persist |
| **Status** | **PRODUCTION EXISTING** |

### 11.4 Owner Map / Multi-Dwelling

| | |
|--|--|
| **Pliki** | `src/lib/multi-dwelling/*` · `src/app/MultiDwellingPackagePanel.tsx` · `src/lib/intelligent-estimator/ik-dwelling-mapping.ts` · Hub: `TenderWorkflowHubPanel.tsx` |
| **SSOT mapy** | `documentToDwelling` · LS `kw-multi-dwelling-package-v1` |
| **Rola** | document→lokal · expected dwellings · allMapped · PackageGate · odblokowanie READY / KNR gdy multi |
| **NIE** | Filename/street jako silent SSOT · invent dwelling · nowy model cloud |
| **Status** | **PRODUCTION EXISTING** · ops Owner Map = warunek LIVE READY na multi-przedmiarach |

### 11.5 KNR Expert (nowy system wiedzy — NIE drugi IK)

| | |
|--|--|
| **Pliki** | **B:** `ik-knr-expert.ts` · **A:** `buildCatalogBasisFromRawCode` (`tenders-bzp-brief.ts`) · typ `CatalogBasis` · **C:** `ik-knr-conversation.ts` · **D:** `ik-knr-owner-mapping.ts` · **KL:** `src/lib/intelligent-estimator/knr-knowledge/*` |
| **Rola** | Oznaczenia katalogowe · evidence KNR · soft hints · Owner mapping `catalogWorkId` (D) · KL lookup-only |
| **Współpraca** | Czyta `historicalIndex` (EXACT/FAMILY/CONFLICT/MISS) · **nie** przejmuje Labor/Material authority |
| **NIE** | Work Catalog · Price Memory · auto OUR RATE · auto material price · drugi orchestrator · KL-6 mutate z Historical |
| **Status** | Slice A **PRODUCTION VERIFIED** · B/C/D **IMPLEMENTED / PRODUCTION EXISTING** · KL corpus **PARTIAL** · pełny „KNR Catalog product” **PROPOSED/GAP** (nie udawać istniejącego catalog SSOT) |

### 11.6 Historical Executed

| | |
|--|--|
| **Pliki** | `src/lib/intelligent-estimator/historical-executed/*` · hook `use-historical-executed-host-index.ts` · hydrate `historical-executed-host-hydrate.ts` |
| **Przepływ** | jobs → discovery → `fetchKosztorysBytes` → parse ATH → build index → `IkEntryHost.historicalIndex` → `lookupHistoricalExecuted` w KNR → EC copy |
| **Flagi** | `HISTORICAL_EXECUTED_IMPLEMENTED=true` · **`HISTORICAL_EXECUTED_AUTHORITY=false`** · `HOST_HYDRATE=true` |
| **NIE** | Normatywny KNR Catalog · Catalog authority · Owner VERIFY · write-router · KL-6 |
| **Status** | ATH + Host Wiring + EC reveal **PRODUCTION VERIFIED** (MOPS evidence §8.1) |

**Historical Executed ≠ KNR Catalog.** Oba mogą wspierać KNR Expert, ale mają różne znaczenie i authority.

### 11.7 Classification Expert

Patrz §4. Orkiestracja w Host: `runIkMasterBoqClassification`.

### 11.8 Labor Expert

| | |
|--|--|
| **IK** | `src/lib/intelligent-estimator/ik-labor-expert.ts` · `ik-p5-labor-budget.ts` |
| **SSOT labor** | `src/lib/work-catalog/*` · KV `kw-wgdom-work-catalog` |
| **Lookup** | `work-rate-lookup.ts` → `lookupWorkRate` |
| **Research** | `work-rate-research.ts` → `runSelectiveWorkRateResearch` (KB / CR / SCCOT / Extradom — Legal PASS) |
| **Bridge** | `src/lib/ik-pricing-orchestrator/labor-research-bridge.ts` |
| **Evidence** | `src/lib/labor-source-evidence/*` · KV `kw-wgdom-labor-source-evidence` |
| **Accept** | `work-rate-accept.ts` → `acceptWorkRateResearchCandidate` |
| **UI** | `src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx` · `useWorkCatalog.ts` |

**Logika (kontrakt):**

```text
POZYCJA → CLASSIFICATION=LABOR
  → Work Catalog lookup (workId + unit)
  → OUR RATE CURRENT?  YES → REUSE · HTTP 0
                      NO  → research TYLKO gdy executeResearch + A1 LABOR
                           → Evidence → Candidate → Owner Accept → OUR RATE → persist → reuse
```

**NIGDY:** research gdy stawka istnieje · Evidence ≠ OUR RATE · research ≠ auto Accept · nowy labor-catalog / drugi cache.

**Status:** stack **PRODUCTION EXISTING** · Tablica Accept **PRODUCTION VERIFIED** (data) · P5 E2E **PARTIAL** (flagi).

### 11.9 Material Expert

| | |
|--|--|
| **IK** | `src/lib/intelligent-estimator/ik-material-expert.ts` · `ik-p6-material-budget.ts` |
| **SSOT material** | `src/lib/price-intelligence/price-memory.ts` · `our-price-catalog.ts` (`computeSellPricePln`, `commercialPricing`) |
| **Research** | DIY selective: LM / Castorama / OBI (+ hurtownie po allowlist) · Edge `mmr-diy-selective-lookup` |
| **F5 adapter** | `tender-position-cost/material-sell-adapter.ts` |

**Logika (kontrakt):**

```text
POZYCJA → CLASSIFICATION=MATERIAL
  → material identity → Price Memory
  → CURRENT HIT? YES → REUSE · HTTP 0
                 NO  → selective research → market quote / purchase
                      → commercial margin → SELL → persist → reuse
```

**Rozdzielaj:** purchase · market · Price Memory · SELL · margin · Position Cost.

**NIGDY:** MaterialCatalogV2 · PriceMemoryV2 · auto Accept · Labor rewrite · `mat.inv.*` DIY invent.

**Status:** **PRODUCTION EXISTING** · P6 E2E **PARTIAL** (flagi).

### 11.10 Composite / Position Cost Expert

| | |
|--|--|
| **IK** | `src/lib/intelligent-estimator/ik-composite-both-hold.ts` (`feedsP7Bid=false`) |
| **Engine** | `src/lib/tender-position-cost/engine.ts` → `computePositionCost` |
| **Adapters** | OUR RATE labor · material SELL · BOM technology · BOQ shadow |
| **F5 cutover** | `bid-position-cost-cutover.ts` |

```text
POSITION COST ≈ LABOR (OUR RATE) + MATERIAL (SELL) + dopuszczone składniki (BOM/equipment/…)
  → P7 read-only bid path
  → Bid / Offer (istniejący stack; nie drugi silnik)
```

**NIE** buduj drugiego kalkulatora pozycji.
**Status:** F5 **PRODUCTION EXISTING / VERIFIED** (rebuild epic) · Composite BOTH_HOLD **IMPLEMENTED** · `feedsP7Bid=false` **FROZEN**.

### 11.11 Validation / Control

| | |
|--|--|
| **Pliki** | `src/lib/validation-expert/*` (używane z P8) · Classification HOLD |
| **Rola** | consistency · findings · HOLD |
| **Status** | **PRODUCTION EXISTING** (lib) · pełny „Validation Expert chat” **PROPOSED** jako osobna persona UI |

### 11.12 P7 / P8

| | P7 | P8 |
|--|----|----|
| **Plik** | `ik-p7-position-cost-bid.ts` | `ik-p8-risk-decision.ts` |
| **Rola** | Position Cost → bid proposal (read-only E2E) | Risk / decision prepare |
| **NIE** | research/HTTP/Catalog write · Final Bid persist | start D/Chief · auto Accept · Historical=Catalog |
| **Status** | **IMPLEMENTED** · gated AUTO/OFF/ON · live często **NOT OBSERVABLE** gdy IK/flagi OFF |

### 11.13 Expert Conversation / Team UI

| | |
|--|--|
| **Pliki** | `src/app/expert-conversation/ExpertConversationSurface.tsx` · `ik-entry-conversation.ts` · `ik-knr-conversation.ts` · `IkExpertRoomChrome.tsx` · `expert-conversation-ui.ts` |
| **Rola** | Prezentacja **rzeczywistego** VM pipeline (Document / KNR / Labor / Material / …) |
| **Fix 2026-08-21** | structural vs content signature — late Historical **nie** resetuje progressive reveal |
| **NIE** | Fikcyjne wiadomości bez faktów · osobny chat store · LLM per ekspert |
| **Status** | Presentation **PRODUCTION EXISTING** · Historical EC copy **PRODUCTION VERIFIED** · pełny „team script” dialog **PROPOSED** (TARGET §13) |

### 11.14 Bid / Offer / PDF

| | |
|--|--|
| **Pliki** | `tenders-bid-calculator.ts` · `tender-offer-boq*.ts` · `tender-bid-package-pdf.ts` → `exportTenderBidPackagePdf` |
| **Status** | **PRODUCTION EXISTING** · REUSE · **nie** nowy PDF engine |

---

## 12. REUSE MAP (capability → file → DO NOT REBUILD)

| Capability | Existing file(s) | Existing SSOT / store | Current user | Status | DO NOT REBUILD |
|------------|------------------|----------------------|--------------|--------|----------------|
| Przetargi | `TendersModule.tsx` | pipeline KV | App | PRODUCTION EXISTING | ❌ nowy module |
| Tender Detail | `TenderDetailPage.tsx` | — | TendersModule | PRODUCTION EXISTING | ❌ |
| IK Host | `IkEntryHost.tsx` | flags `ik-entry-flag` | DetailPage | PRODUCTION EXISTING | ❌ drugi Host |
| Document Expert | `ik-document-expert.ts` | OfferBoq / ingest | Host | PRODUCTION EXISTING | ❌ |
| ATH/PDF ingest | `ath-parser` · dossier · ingest | tender docs | pipeline | PRODUCTION EXISTING | ❌ nowy parser stack |
| Master BOQ | multi-boq · OfferBoq | LS multi / Offer | Document Expert | PRODUCTION EXISTING | ❌ |
| Owner Map | `multi-dwelling/*` · `MultiDwellingPackagePanel` | `kw-multi-dwelling-package-v1` | Hub / Host | PRODUCTION EXISTING | ❌ |
| KNR Expert | `ik-knr-expert.ts` + A/C/D/KL | catalogBasis · Owner map D | Host | PARTIAL→EXISTING | ❌ drugi KNR system |
| Historical | `historical-executed/*` | in-memory index | Detail→Host→KNR | PRODUCTION VERIFIED (slice) | ❌ drugi index |
| Classification | `classification-gate.ts` | Owner map freeze | Host / research guards | FROZEN | ❌ |
| Labor / Work Catalog | `work-catalog/*` | `kw-wgdom-work-catalog` | P5 / F5 / UI | PRODUCTION EXISTING | ❌ |
| OUR RATE | `ourWorkRate` + Accept | CatalogWork | Accept API | PRODUCTION EXISTING | ❌ |
| Labor Research | `work-rate-research.ts` | cooldown | P5 / UI | PRODUCTION EXISTING | ❌ drugi engine |
| Labor Evidence | `labor-source-evidence/*` | `kw-wgdom-labor-source-evidence` | IR / Accept path | PRODUCTION EXISTING | ≠ OUR RATE |
| Material / PM | `price-intelligence/*` | Price Memory | P6 / F5 | PRODUCTION EXISTING | ❌ V2 store |
| Material Research | DIY selective + Edge | allowlist | P6 | PRODUCTION EXISTING | ❌ |
| Composite | `ik-composite-both-hold.ts` | — | Host | IMPLEMENTED | ❌ |
| Position Cost | `tender-position-cost/*` | ephemeral | P7 / Bid | PRODUCTION EXISTING | ❌ drugi engine |
| P7 | `ik-p7-position-cost-bid.ts` | — | Host | IMPLEMENTED | ❌ |
| P8 / Risk | `ik-p8-risk-decision.ts` | validation-expert | Host | IMPLEMENTED | ❌ |
| Validation | `validation-expert/*` | — | P8 | PRODUCTION EXISTING | ❌ |
| Chief | `chief-session` · `chief-orchestrator` | dossier in-memory | DetailPage | PRODUCTION EXISTING | ❌ drugi Chief |
| Conversation | `expert-conversation/*` | VM only | Host / Hub | PRODUCTION EXISTING | ❌ chat store |
| Bid / Offer | bid-calculator · OfferBoq | — | Hub / P7 | KEEP | ❌ trzeci PLN |
| PDF | `tender-bid-package-pdf.ts` | — | DetailPanel | PRODUCTION EXISTING | ❌ nowy PDF engine |
| Cloud sync | `cloud-sync.ts` | Supabase KV | app | CORE LOCK | ❌ casual change |

Pełniejsza tabela historyczna: [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) — **uzupełnia**, nie zastępuje Master.

---

## 13. Team Conversation UX — CURRENT vs TARGET

### CURRENT (source)

- Jedna powierzchnia: `ExpertConversationSurface` + VM z `buildIkEntryConversationViewModel`.
- Kroki ekspertów odzwierciedlają **rzeczywiste** raporty (Document / KNR / Historical copy / Classification / …).
- Progressive reveal: **structural** restart · **content** (np. late Historical) = in-place, bez resetu.

### TARGET (PROPOSED presentation — nie invent LLM agentów)

Docelowo IK wygląda jak zgrana ekipa, ale **dane = pipeline**:

```text
CHIEF:     „Otrzymałem przetarg. Najpierw Dokument Expert przygotuje BOQ.”
DOCUMENT:  „Mam N przedmiarów / M pozycji.”          ← z Document Expert
OWNER MAP: „Wymagane mapowanie dokumentów → lokale.” ← z Multi-Dwelling
KNR:       „EXACT/FAMILY/CONFLICT/MISS …”            ← z KNR + Historical
LABOR:     „Work Catalog HIT / MISS / research…”     ← z Labor Expert
MATERIAL:  „Price Memory HIT / research…”            ← z Material Expert
COMPOSITE: „Łączę robociznę + materiał…”             ← z Composite / F5
VALIDATION:„HOLD jednostek / konflikt…”              ← z Validation / Classification
CHIEF:     „Nie zatwierdzam HOLD. Reszta dalej.”
→ Position Cost → Bid → Risk → PDF
```

**ZAKAZ:** fikcyjne postępy bez faktów orchestracji · osobny agent/LLM „na eksperta” bez Owner GO.

---

## 14. Orkiestracja zespołu (TARGET flow = CURRENT modules)

```text
CHIEF
  → HOST (IkEntryHost)
  → DOCUMENT EXPERT
  → OWNER MAP / BOQ GATE
  → KNR EXPERT (+ Historical evidence, authority=false)
  → CLASSIFICATION
  → LABOR EXPERT          MATERIAL EXPERT
       Work Catalog            Price Memory
       Research on MISS        Research on MISS
       Evidence→Accept→OUR RATE   purchase→SELL
  → COMPOSITE → POSITION COST (F5)
  → P7 → P8
  → FINAL BID / OFFER / COST BREAKDOWN / PDF
```

KNR dostarcza: kontekst normatywny · R/M/S evidence · historyczne porównania.
KNR **nie** przejmuje authority Labor / Material / Accept / Bid.

---

## 15. Kontrakt authority — NIE MIESZAĆ

| Warstwa | Znaczenie | Może pisać |
|---------|-----------|------------|
| KNR | knowledge / evidence oznaczeń | Slice D: `catalogWorkId` copies only (bounded) |
| Historical | historyczne ATH porównania | **nic** (read-only) · authority=false |
| Work Catalog | SSOT robocizny firmy | catalog write router |
| OUR RATE | accepted company labor rate | **tylko** Accept / Owner patch |
| Evidence | observations | Evidence KV — **≠** OUR RATE |
| Price Memory | material price memory | PM / Accept material |
| Material research | market evidence | Candidate → Accept |
| SELL | commercial material | `commercialPricing` |
| Position Cost | calculation | ephemeral / cutover |
| Bid / Offer | oferta | istniejący Bid stack |

Żadna warstwa **nie** zastępuje innej po cichu.

---

## 16. JEŻELI NOWY AGENT NIE WIE, GDZIE JEST FUNKCJA

```text
grep / search
  → open existing file
  → trace callers
  → trace stores
  → trace UI
  → trace SSOT (TEN PLIK + REUSE MAP)
  → REUSE

Dopiero jeżeli NAPRAWDĘ nie istnieje:

AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW
  → OWNER GO → IMPLEMENT → TEST → VERIFY
  → COMMIT → PUSH → PRODUCTION VERIFY
```

**Nigdy:** invent · silent fallback · implement przed Owner GO · `git add -A`.

---

## 17. COLD START — FIRST INSTRUCTION FOR ANY AI

```text
Przeczytaj TEN Master SSOT przed jakąkolwiek zmianą.

Nie projektuj od zera Inteligentnego Kosztorysanta.
IK już istnieje jako zestaw istniejących modułów WGDOM.

Najpierw odtwórz istniejące drzewo (§10–§12).
Tip produkcji = docs/AI/09_PRODUCTION_BASELINE.md + live version.json.

Nie twórz:
  - drugiego TenderModule / TenderDetail / IkEntryHost
  - drugiego Chief / orchestratora / KNR systemu / Historical systemu
  - drugiego Work Catalog / Price Memory / Evidence / OUR RATE / Accept
  - drugiego research engine / Position Cost / Bid / PDF engine
  - MaterialCatalogV2 / PriceMemoryV2 / LaborCatalogV2

Jeżeli czegoś nie znajdujesz: SEARCH. Nie CREATE.

Jeżeli uważasz, że trzeba zmienić istniejący system:
  AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO.

Nigdy nie implementuj przed Owner GO.
Historical authority = false, dopóki Owner GO nie udowodni inaczej.
Evidence ≠ OUR RATE. Research ≠ Accept. FAMILY ≠ EXACT. CONFLICT = FAIL CLOSED.
```

**STOP.** Kolejny gate tylko po nowym Owner GO.
