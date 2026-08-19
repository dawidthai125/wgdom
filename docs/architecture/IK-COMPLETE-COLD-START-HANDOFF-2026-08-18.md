# IK COMPLETE COLD-START HANDOFF — 2026-08-18

> **ID:** `IK-COMPLETE-COLD-START-HANDOFF-2026-08-18`
> **STATUS:** **ACTIVE** · **FINAL KNOWLEDGE PRESERVATION / COLD-START HANDOFF** · DOCUMENTATION ONLY
> **Date:** 2026-08-18
> **Mode:** ZERO RUNTIME · ZERO SETTINGS · ZERO KV · ZERO FLAGS · ZERO TESTS CHANGE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
> **Rola:** pełna mapa wiedzy IK dla nowych sesji ChatGPT/Cursor — **nie** Contract SSOT
> **Contract SSOT (nie zastępować):** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)

```text
════════════════════════════════════════════════════════
TEN PLIK ≠ DRUGI MASTER SSOT.
INTELLIGENT-ESTIMATOR-MASTER-SSOT.md = Contract SSOT.
TEN PLIK = CONTINUITY / COLD-START / KNOWLEDGE HANDOFF.
NIE BUDUJ IK OD NOWA.
IK = ORCHESTRATOR ISTNIEJĄCYCH SYSTEMÓW WGDOM.
SEARCH BEFORE CREATE. NO INVENT. NO SILENT FALLBACK.
AUDIT BEFORE IMPLEMENTATION. OWNER GO BEFORE IMPLEMENTATION.
════════════════════════════════════════════════════════
```

**Najważniejsze zdanie dla nowego agenta:**

> Inteligentny Kosztorysant już istnieje jako zestaw istniejących modułów. Najpierw odtwórz jego mapę i rozwijaj istniejące SSOT.

---

## 0. Jak czytać ten zestaw (kolejność)

| # | Dokument | Rola | Stan względem CURRENT |
|---|----------|------|------------------------|
| 1 | **TEN PLIK** | Mapa wiedzy · aktualny prod · KNR A/B/C/D · NEXT | **CURRENT** 2026-08-18 |
| 2 | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) | **★★ Contract SSOT** · hard locks · Evidence≠OUR RATE | **ACTIVE** · §8 tip **2.66.95 = HISTORICAL** vs CURRENT **2.66.103** |
| 3 | [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) | Sesja Autonomy 05–08 · A08-P2 CLOSED | **ACTIVE** dla Autonomy · tip **2.66.95 = HISTORICAL** |
| 4 | [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) | NG-10 → IK Entry · AD locked | **HISTORICAL freeze** · P0–P9; **P10 CLOSED osobno** |
| 5 | [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) | P0–P9 COMPLETE | **HISTORICAL** tip **2.66.86** · wiersz „P10 NOT STARTED” = **STALE** vs P10 closeout **2.66.87** |
| 6 | [`INTELLIGENT-ESTIMATOR-ARCHITECTURE.md`](./INTELLIGENT-ESTIMATOR-ARCHITECTURE.md) | Warstwy + ścieżki plików | **ACTIVE** (ścieżki) |
| 7 | [`INTELLIGENT-ESTIMATOR-DATA-FLOW.md`](./INTELLIGENT-ESTIMATOR-DATA-FLOW.md) | LABOR / MATERIAL / Classification | **ACTIVE** |
| 8 | [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | Component → file → DO NOT DUPLICATE | **ACTIVE** |
| 9 | [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md) | Tablica 546 · Podejście HOLD · Wykwity GAP | **ACTIVE data** · UI **2.66.59 = HISTORICAL** |
| 10 | [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Protokół cold-start | **ACTIVE** · uzupełnij TEN PLIK + version.json |
| 11 | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) | Tip SSOT UI/commit | **SYNCED** — snapshot **2.66.103** / `93eb41be` · live deploy **2.66.103** |
| 12 | Live `https://www.wgdom.fun/version.json` | Fakt produkcyjny | **CURRENT** (mierzone 2026-08-18) |

Starszych snapshotów **nie kasować** i **nie przepisywać historii**. Gdy dokument ma starszy tip — oznacz **HISTORICAL**, a CURRENT bierz z §1 poniżej + `version.json`.

---

## 1. CURRENT production state

**Źródło:** `git rev-parse` · `git log` · live `version.json` (2026-08-19) · changelog narrative Slice A **2.66.97** · live deploy **2.66.103**.

| Pole | Wartość | Znacznik |
|------|---------|----------|
| URL | https://www.wgdom.fun | CURRENT |
| UI / `version.json` | **2.66.103** | CURRENT |
| Live commit short | **`93eb41b`** | CURRENT |
| Feature SHA A | **`93eb41bee2c054230914d3ff9a54561d17c5eed9`** | CURRENT |
| Message A | `feat(ik): complete knr slice a catalog basis` | CURRENT |
| Slice A | **CLOSED · PRODUCTION VERIFIED · GREEN** | CURRENT |
| Feature SHA D | **`16c3c9382dbe587a0877c70c2dab5b0b7d76d7ea`** | CURRENT (w łańcuchu) |
| Message D | `feat(ik): release KNR owner mapping D` | CURRENT (w łańcuchu) |
| Slice D | **CLOSED · PRODUCTION VERIFIED · GREEN** | CURRENT |
| Parent C3 | **2.66.100** · **`4a8013658c0ebafd5804803194c3cb684fe8b8fc`** | CURRENT |
| Message C3 | `feat(ik): release KNR expert room C3` | CURRENT |
| Deploy | `git push origin main` → Vercel Git Integration | FROZEN process |
| `vercel deploy` | **FORBIDDEN** | FROZEN |

**C3 SHA:** git potwierdza `4a8013658c0ebafd5804803194c3cb684fe8b8fc` (**nie** wariant `…fe8bfc8`).

### 1.1 Łańcuch tipów (CURRENT na górze, reszta HISTORICAL)

| Wersja | SHA | Co | Stan |
|--------|-----|----|------|
| **2.66.103** | `93eb41be` | KNR Slice A catalogBasis evidence | **CURRENT prod** |
| **2.66.101** | `16c3c938` | KNR Slice D Owner mapping | CURRENT (w łańcuchu) |
| **2.66.100** | `4a801365` | KNR Slice C3 host + chrome | CURRENT (superseded by D na tipie) |
| **2.66.99** | `039a68e1` | KNR Slice C2 conversation | CURRENT (w łańcuchu) |
| B (changelog 2.66.98 **nie** w HEAD changelog) | `18f6c1a2` | `runIkKnrExpert` adapter | CURRENT (w łańcuchu) |
| **2.66.96** | `f069b29a` | IK Role Activation | CURRENT (w łańcuchu) |
| **2.66.95** | `1f5d871c` | A08-P2 Research-on-Miss | HISTORICAL tip (09 / MASTER §8) |
| **2.66.94** | `e0373fac` | A08-P1 Settings Unification | HISTORICAL |
| **2.66.93** | `b98e68e5` | A08-P0 Documents→BOQ | HISTORICAL |
| **2.66.92** | `0f994437` | AUTONOMY-07 P8 | HISTORICAL |
| **2.66.91** | `ab5eaaa1` | AUTONOMY-06 P7 | HISTORICAL |
| **2.66.90** | `44e81d20` | AUTONOMY-05 P5/P6 AUTO\|OFF\|ON | HISTORICAL |
| **2.66.89** | `d62eb2a4` | Composite BOTH_HOLD | HISTORICAL |
| **2.66.87** | `7a32bb34` | **P10 NG-10 DECOMMISSION** | CLOSED (FINAL HANDOFF „P10 NOT STARTED” = STALE) |
| **2.66.86** | `80c7c26b` | IK-MIGRATION-01 P9 | HISTORICAL |
| **2.66.59** | `9bcc558` | IE Production Baseline / PASS2 | HISTORICAL |

**Nie cofać** CURRENT do starszych snapshotów 09 / MASTER §8 / Migration FINAL.

---

## 1.2 Czym jest IK (język produktowy)

**Problem:** Przetarg wymaga wielu istniejących silników WGDOM (dokumenty, przedmiar, katalog robót, Price Memory, F5, Bid, ryzyko). Stary first-screen NG-10 **projekował** pipeline jako teatr autonomiczny, bez jednej orkiestracji faktów.

**IK rozwiązuje:** jeden **orchestrator prezentacyjny** nad **istniejącymi** silnikami — rozmowa ekspertów pokazuje prawdziwy stan (AD-IK-M05 `sourceRef`), a nie fikcyjne postępy.

**IK nie zastępuje:** Work Catalog, Price Memory, F5, parserów, Evidence, Accept, Bid calculator, Hub tabs V4.

**IK zastąpił (P10 CLOSED):** first-screen NG-10 Gate/Run/Outcome theater. TRE Outcome pozostaje **na żądanie** (CTA), nie jako default first paint.

**Docelowy model pracy:** Tender → dokumenty/BOQ → evidencja (w tym KNR) → Owner identity (gdy HIT) → classification → Labor/Material CURRENT lub Research-on-Miss → Owner Accept → Position Cost → Bid (Owner Final) → fakty w Sali.

---

## 1.3 CURRENT RUNTIME PATH (SOURCE `IkEntryHost` + `TenderDetailPage`)

**Kto uruchamia IK**

```text
TenderDetailPage  (tab przetarg)
  ikEntryOn = isIkEntryEnabled()     ★ Role Activation adapter
  → IkEntryHost                      ★ jedyny mount IK EC na tabie
       IkExpertRoomChrome            ★ C3 presentation
         ExpertConversationSurface   ★ ONE existing Surface (Hub ma własny, C3 go NIE rusza)
```

`resolveIkDetailFirstScreen()` **zawsze** zwraca `"ik_entry"` (P10). Flaga **nie** przywraca NG-10 Gate. Brak `ikEntryOn` = **brak hosta**, nie powrót Gate.

**Sekwencja w hoście (SOURCE, kolejność kodu):**

| Krok | Funkcja | Warunek | Write |
|------|---------|---------|-------|
| P2 ingest | `runIkNg02IngestBridge` | `isIkP2DocumentsBoqActive()` := IK ACCESS | `onUpdate(itemPatch)` local; cloud gdy `extractedLineCount > 0` |
| Document | `runIkDocumentExpert` | zawsze (ingest.expert lub sync) | **nie** (raport in-memory) |
| B KNR | `runIkKnrExpert` | sync · BLOCKED gdy !readyForExperts | **0** |
| D overlay | `applyOwnerKnrMapping` | sync · pusta tabela = 0 HIT | **tylko kopia** `catalogWorkId` |
| P3 | `runIkMasterBoqClassification({ expert: knrMapped.expert })` | sync | **0** persist |
| Identity coverage | `runIkMasterBoqIdentityCoverage` | lever default **OFF** · używa **original** `report` | **0** |
| P5 Labor | `runIkMasterBoqLaborExpert({ expert: report })` | AUTO\|ON · Master READY | **0** (Accept poza hostem) |
| P6 Material | po `laborSettledRef` | AUTO\|ON | **0** |
| Composite | `runIkCompositeBothHold` | P5∧P6 | **0** · `feedsP7Bid=false` |
| P7 | `runIkP7PositionCostBid({ expert: report })` | AUTO\|ON · RESEARCH=0 HTTP=0 | **0** |
| P8 | `runIkP8RiskDecision` | AUTO\|ON · Chief optional | **0** · nie startuje D |
| VM | `buildIkEntryConversationViewModel` · `opts.knr` + `opts.classification` | — | presentation |
| UI | chrome + Surface | — | **0** |

**P5/P6/P7/identity coverage czytają `report` (oryginał), nie overlay D.**
**P3 czyta overlay.** To jest **host classification seam** (NON-BLOCKER / OQ-D-2 OPEN dla P5).

**Chief** nie startuje z hosta. P4 Chief = `TenderDetailPage` (`ikEntry ∧ ikChiefWiring ∧ pricingReady`) **albo** D session. Przekazywany do hosta jako `chiefSession` dla P8.

**Czego IK NIE zapisuje w hoście:** `knrHint` · shared `ref.line.catalogWorkId` · OUR RATE · Price Memory · Decision persist · `expertAiDecydentEnabled` · nowe KV/flagi · Accept.

**Konsumenci wyników IK:** Expert Conversation VM (fakty) · P3 (overlay workId) · P7 czyta katalog/PM **nie** raporty P5/P6 · Hub **nie** jest konsumentem KNR overlay.

---

## 2. Definicja IK


```text
IK = ORCHESTRATOR ISTNIEJĄCYCH SYSTEMÓW WGDOM.
IK ≠ drugi TenderModule
IK ≠ drugi parser
IK ≠ drugi BOQ engine
IK ≠ drugi Work Catalog
IK ≠ drugi Material Catalog
IK ≠ drugi Price Memory
IK ≠ drugi Evidence Store
IK ≠ drugi OUR RATE engine
IK ≠ drugi Accept engine
IK ≠ drugi pricing engine
IK ≠ drugi research engine
IK ≠ drugi PDF engine
```

**Host wejściowy:** `src/app/intelligent-estimator/IkEntryHost.tsx`
**Nie** budować drugiego orchestratora.

REUSE FIRST: `TendersModule` · OfferBoq v5 · Multi-BOQ · F5 Position Cost · Work Catalog / OUR RATE · Price Memory · Evidence · `accept*` · Classification Gate · selective Labor/Material research · P7 Bid calc · P8 Risk/DW prepare · `ExpertConversationSurface` · Bid PDF.

**IK ≠ D.**
**D** = `expertAiDecydentEnabled` = Dual Outcome / Decydent = **HARD STOP**. IK ON **nie** flipuje D.

---

## 3. Docelowy loop (biznes)

```text
Tender
  → Documents          (NG-02 / INGEST-01 REUSE)
  → BOQ                (OfferBoq v5 + lineage / Multi-BOQ)
  → Identity           (catalogWorkId / materialKey — nie zgadywać)
  → Classification     (A1 classifyEstimatorPricingPlane)   ★ BEFORE Research
  → LABOR | MATERIAL | COMPOUND/BOTH_HOLD | UNKNOWN/UNRESOLVED
  → CURRENT / REUSE    (Work Catalog OUR RATE · Price Memory SELL)
  → Research on miss   (tylko true MISS · A08-P2)
  → Evidence
  → Candidate
  → Owner Decision
  → Accept
  → OUR RATE / Price Memory
  → Recompute
  → Position Cost (F5)
  → Bid
  → Final Estimate
  → Breakdown
  → PDF                (REUSE existing stack · nie nowy engine)
```

| Etap | Stan |
|------|------|
| Documents / BOQ / P2 ingest | CURRENT IMPLEMENTED (ACCESS ON) |
| Slice A catalogBasis na prod | **CLOSED · PRODUCTION VERIFIED · GREEN** · `93eb41be` |
| KNR A/B/C2/C3/D | CURRENT GREEN (pusta tabela D = 0 HIT legalne) |
| Classification P3 + A1 | CURRENT |
| Labor/Material CURRENT + Research-on-Miss | CURRENT (A08-P2) |
| Accept w IkEntryHost | **NOT IMPLEMENTED** (silniki Accept istnieją poza hostem) |
| P7 Bid in-memory | CURRENT · Final Bid OWNER |
| P8 Risk prepare | CURRENT · persist DW/D OWNER |
| PACKAGE COMPOUND research | **NOT AUTHORIZED** |
| Slice E | **NOT STARTED / NOT DEFINED** |
| Nowy PDF engine IK | **NOT AUTHORIZED** |

**Zamrożone zasady:**

| Zasada | Werdykt |
|--------|---------|
| Classification BEFORE Research | FROZEN |
| Research **nie** zgaduje identity | FROZEN |
| Evidence ≠ OUR RATE | FROZEN |
| Candidate ≠ Accepted identity | FROZEN |
| Research ≠ Accept | FROZEN |
| Technical failure ≠ MISS | FROZEN (cooldown / busy / budget / legal KEEP) |
| COMPOUND / UNKNOWN ≠ zwykły research miss | FROZEN · HOLD · zero invent |
| CURRENT HIT → ZERO Research | FROZEN |

---

## 4. Eksperci i warstwy (SOURCE — nie inventować nowych)

Nie tworzyć nowych ekspertów. Jeśli SOURCE nie ma osobnego modułu — to **warstwa/tor**, nie nowy silnik.

**Legenda typu:** runtime expert = funkcja wołana z hosta · domain service = silnik poza IK · classifier = A1 · orchestration stage = P3/P7/P8 · UI role = actor w Surface.

| Nazwa | Typ | Actor UI | Input | Output | Authority | R/W | Research | Catalog | Owner | Identity write | Pricing write | Master BOQ write | Status |
|-------|-----|----------|-------|--------|-----------|-----|----------|---------|-------|----------------|---------------|------------------|--------|
| Chief | orchestration + UI | `Chief` / „Inteligentny Kosztorysant” | item · P4 eligibility | session / facts | Owner Final Bid / D persist | read (+ D persist poza hostem) | nie | nie bezpośrednio | tak (decyzja) | nie | nie auto | nie | IMPLEMENTED · P4 scoped |
| Document | runtime expert | `Document` | item · package | `IkDocumentExpertReport` | dokumenty / OfferBoq | read; P2 ingest może patch item | nie | nie | nie | nie | nie | nie (czyta compose) | CLOSED P2 |
| KNR | runtime expert | `Knr` / „Ekspert od oznaczeń katalogowych” | Master BOQ `catalogBasis` | `IkKnrExpertReport` | **brak** identity | **read-only** | nie | nie CatalogWork | nie | **nie** | nie | **nie** | GREEN B+C2+C3 |
| D Owner KNR map | domain service | — | report + knr + tabela | overlay copies | Owner tabela exact | write **kopia** `catalogWorkId` | nie | waliduje CatalogWork | **tak** | **tak tylko HIT** | nie | **nie shared** | GREEN 2.66.101 |
| Identity coverage | diagnostic | Identity label | original report | coverage counts | — | read | nie | tak lookup | nie | nie | nie | nie | IMPLEMENTED default OFF |
| A1 | classifier | — | workId / materialKey / namePl | plane + flags | Owner seed map | pure | nie | nie | seed only | nie | nie | nie | CLOSED freeze |
| P3 | orchestration stage | classification steps | overlay expert | classified lines | A1 | read overlay | nie | nie | nie | nie (czyta) | nie | nie | CLOSED · D seam |
| Labor / P5 | runtime expert | `Labor` | **original** report | labor report | Accept Owner | read; Accept poza hostem | TAK jeśli MISS+permission | Work Catalog | Accept | mapper copy **nie D** | nie OUR RATE auto | nie | CLOSED Autonomy-05 |
| Material / P6 | runtime expert | `Material` | original report · po P5 | material report | Accept Owner | j.w. | TAK jeśli MISS+permission | Price Memory | Accept | materialKey path | nie auto SELL persist bez Accept | nie | CLOSED Autonomy-05 |
| Composite | BOTH_HOLD consumer | Material/Labor labels | original report | composite report | HOLD freeze | read | leaf only if P5/P6 research | BOM/tech | nie auto | nie parent | `computePositionCost` UNCHANGED | nie | CLOSED 2.66.89 |
| Research | tor | — | true MISS | Evidence+Candidate | **nie** | Evidence KV labor; nie OUR RATE | — | lookup CURRENT first | Accept required | **nie** | **nie** | **nie** | A08-P2 CLOSED |
| Pricing / P7 | orchestration stage | `Pricing` / Cost | original report | P7 report · bid in-memory | Owner Final Bid | read | **0** | katalog/PM | nie auto | nie | in-memory only | nie | CLOSED Autonomy-06 |
| Risk / P8 | orchestration stage | `Risk` / `Chief` display | item · P7 optional · Chief | P8 report | Owner / DW | read | **0** | nie | nie persist | nie | nie | nie | CLOSED Autonomy-07 |
| Control / Validation | domain service | `Control` | dossier | findings | display | read | 0 | nie | nie | nie | nie | nie | REUSE P8 |
| Inspektor | UI role poza IK | — | — | — | **nie** KNR v1 | — | — | — | nie | nie | nie | nie | NIE authority D |
| Hub EC | UI (inny mount) | Hub actors | Hub VM | presentation | — | nie KNR overlay | — | — | — | nie | nie | nie | KEEP · C3 isolation |

Szczegóły 4.1–4.12 poniżej. **Nie** interpretować każdego wiersza jako osobnego agenta LLM.

### 4.1 Chief / Inteligentny Kosztorysant

| | |
|--|--|
| Odpowiedzialność | Orchestracja Case→Task→dossier · prezentacja Expert Conversation · scoped start |
| Input | Tender item · package · eligibility P4 |
| Output | Chief session / facts w Surface |
| SSOT | `src/lib/chief-orchestrator/` · `IkEntryHost` · copy „Inteligentny Kosztorysant” = Chief (**nie** Pricing) |
| NIE | Drugi TenderModule · auto Final Bid · flip D |
| Authority | Owner / Dual Outcome persist poza auto-IK write |

### 4.2 Document / BOQ Expert

| | |
|--|--|
| Odpowiedzialność | Discovery · kosztorys/przedmiar · extract · validate · normalize · Master BOQ · sourceRef |
| Input | `TenderPipelineItem` · `TenderPackage` |
| Output | `IkDocumentExpertReport` (`runIkDocumentExpert`) |
| SSOT | `src/lib/intelligent-estimator/ik-document-expert.ts` |
| NIE | Nowy KV · nowy parser · ATH writer · F5 persist |
| Authority | Istniejące dokumenty / OfferBoq / Multi-BOQ |

### 4.3 Identity (warstwa, nie osobny Expert class)

| | |
|--|--|
| Odpowiedzialność | `catalogWorkId` / `materialKey` na linii Master BOQ przed A1 |
| Input | Overlay D (KNR HIT) albo istniejące pola linii; P5 nadal czyta **original** `report` |
| Output | P3 `runIkMasterBoqClassification` czyta `line.catalogWorkId` |
| SSOT | `ik-classification.ts` · D `applyOwnerKnrMapping` (jedyny writer KNR→workId) |
| NIE | Heurystyka opisu · `knrHint` jako identity · mapper jako authority D |
| Authority | Owner HIT (D) albo pre-existing identity — **nie** B/C3 |

`ik-identity-coverage.ts` = diagnostyka P3 (lever default OFF) · 0 HTTP.

### 4.4 KNR Expert

| | |
|--|--|
| Odpowiedzialność | Adapter evidencji `catalogBasis` → raport CANDIDATE/HOLD/NONE |
| Input | Document Expert Master BOQ (`catalogBasis` na linii / provenance) |
| Output | `IkKnrExpertReport` · `proposedWorkId: null` · `resolved: 0` · `catalogWorkIdWritten: 0` |
| SSOT | `ik-knr-expert.ts` · C2 `ik-knr-conversation.ts` · C3 chrome + `opts.knr` |
| NIE | Identity · mapper · A1 · Research · Owner table write · knrHint |
| Authority | **Brak** authority CatalogWork. B = CANDIDATE ≠ identity |

Sala: aktor **`Knr`**. Kroki KNR: **po** `boq_status`, **przed** classification.

### 4.5 Labor Expert

| | |
|--|--|
| Odpowiedzialność | Work Catalog CURRENT → MISS → research → Evidence → Candidate → Accept → OUR RATE |
| Input | Master BOQ lines · A1 plane LABOR · `executeResearch` |
| Output | `runIkLaborExpert` raport |
| SSOT | `ik-labor-expert.ts` · `work-catalog/*` · `labor-source-evidence/` |
| NIE | DIY sklepy jako robocizna · auto-Accept · COMPOUND research |
| Authority | Owner Accept (`acceptWorkRateResearchCandidate`) |

P5 **nadal** woła `mapOfferBoqLine` na **kopii** + A1. To **osobny** tor od D. **OQ-D-2 OPEN.**

### 4.6 Material Expert

| | |
|--|--|
| Odpowiedzialność | Price Memory CURRENT → MISS → controlled DIY/hurt research → Candidate → Accept → PM → SELL |
| Input | A1 plane MATERIAL · P5 settled przed P6 (A08-P2 IC-SEQ) |
| Output | `runIkMaterialExpert` |
| SSOT | `ik-material-expert.ts` · `executeMaterialResearchPhase2` · `our-price-catalog.ts` |
| NIE | Labor OUR RATE · invent ceny · `mat.inv.*` jako DIY identity |
| Authority | Owner Accept material (`acceptMaterialResearchCandidate`) |

### 4.7 Composite (warstwa / BOTH_HOLD consumer)

| | |
|--|--|
| Odpowiedzialność | COMPOUND → BOTH_HOLD → leaf Material/Labor → `computePositionCost()` UNCHANGED |
| Input | BOTH_HOLD z P3 |
| Output | Composite adapter · `feedsP7Bid=false` |
| SSOT | `ik-composite-both-hold.ts` · Composite CLOSED **2.66.89** |
| NIE | Composite Engine · research COMPOUND · auto-split na tylko LABOR/MATERIAL |
| Authority | Classification HOLD freeze MASTER SSOT |

PACKAGE layer (Owner 2026-08-18 w continuity) **nie** jest A08-P2. Zmiana COMPOUND→PACKAGE research = **OWNER GO REQUIRED**.

### 4.8 Pricing / Position Cost

| | |
|--|--|
| Odpowiedzialność | Position Cost → Bid (P7 read-only prepare) |
| Input | Katalog / PM · **nie** raporty P5/P6 (`feedsP7Bid=false`) |
| Output | `runIkP7PositionCostBid` in-memory |
| SSOT | `ik-p7-position-cost-bid.ts` · `src/lib/tender-position-cost/` · F5 cutover |
| NIE | Auto Final Bid · nowy Bid engine · Research z P7 |
| Authority | Final Bid = OWNER |

### 4.9 Validation / Control

| | |
|--|--|
| Odpowiedzialność | Findings Hard/Soft · consistency z dossier |
| Input | Dossier / overlay |
| Output | `analyzeValidationFromDossier` |
| SSOT | `src/lib/validation-expert` (REUSE z P8) |
| NIE | Auto-Accept stawek |
| Authority | Display / prepare · nie persist oferty |

### 4.10 Risk

| | |
|--|--|
| Odpowiedzialność | Intelligence overlay · Decision Workspace prepare (P8 AUTO/ON) |
| Input | Bid proposal · company profile · Chief optional |
| Output | `runIkP8RiskDecision` READ-ONLY |
| SSOT | `ik-p8-risk-decision.ts` · `tender-intelligence-overlay` · DW UI |
| NIE | Persist Decision · flip D · Research |
| Authority | Owner / DW / D |

P8 OFF = HOLD. B-POLICY. **OFF wins.**

### 4.11 Research (tor, nie osobny Expert class)

| | |
|--|--|
| Odpowiedzialność | Controlled research **tylko true MISS** po CURRENT |
| Input | Permission A08-P2: IK ACCESS ∧ P5/P6 AUTO\|ON |
| Output | Evidence + ephemeral Candidate |
| SSOT | `runIkLaborGapResearch` · `runSelectiveWorkRateResearch` · `executeMaterialResearchPhase2` |
| NIE | Identity · Accept · technical-failure-as-MISS · extra Research flag |
| Authority | Owner Accept poza hostem |

Hub `IkLaborGapResearchPanel` **nie** jest autonomia hosta.

### 4.12 Owner / Decision layer

| | |
|--|--|
| Odpowiedzialność | ACCEPT / REJECT / RECALCULATE · Final Bid · Dual Outcome |
| Input | Candidate · DW · Expert Conversation facts |
| Output | Persist do istniejącego SSOT (OUR RATE / PM / Decision persist) |
| SSOT | `acceptWorkRateResearchCandidate` · `acceptMaterialResearchCandidate` · DW / D |
| NIE | Przyciski AKCEPTUJ w `IkEntryHost` (SOURCE: facts only) |
| Authority | **Owner** |

---

## 5. Labor — kontrakt

```text
Work Catalog
  → identity (workId + unit)
  → CURRENT / REUSE (ourWorkRate)
  → MISS
  → labor research (KB.pl · CennikRemontow · SCCOT · Extradom · allowlist)
  → Evidence (kw-wgdom-labor-source-evidence)
  → Candidate (ephemeral)
  → Owner Decision
  → Accept
  → OUR RATE
  → recompute → F5
```

**Evidence write ≠ Accept.**
**OUR RATE nie powstaje automatycznie z Evidence.**

Nie mieszać:

| Symbol | Znaczenie |
|--------|-----------|
| marketBase | DERIVED rynek labor |
| purchase | zakup materiału |
| companyPricePln | LEGACY TECHNICAL ≠ OUR RATE |
| ourWorkRate | SSOT labor po Accept |
| SELL | materiał po marży |
| marginPct | commercial WGDOM |
| Position Cost / Bid / Offer | warstwy oferty |

### 5.1 WORK_RATE_IDENTITY_MAPPINGS (wzorzec, nie KNR)

**SSOT:** `src/lib/work-catalog/work-rate-identity-mapping.ts`

```text
exact + ownerApproval=true + active
  → HIT | MISS | AMBIGUOUS | BLOCKED
  → zero auto-write bez Owner
```

Slice D **naśladuje** ten wzorzec w `OWNER_KNR_MAPPINGS` — **pusta tabela v1 legalna**. Nie scalać obu tabel.

**Tablica (DATA VERIFIED, nie invent):** Evidence range 312–780 · Owner ACCEPT OUR RATE **546**.
**Podejście:** HOLD · `pkt` vs `mb` UNIT_EQUIVALENCE **UNPROVEN**.
**Wykwity:** SOURCE GAP REAL.

---

## 6. Material — kontrakt

```text
Price Memory
  → CURRENT / REUSE
  → MISS
  → controlled material research (LM / Casto / OBI + hurtownie allowlist)
  → Evidence / Candidate
  → Owner Accept
  → Price Memory
  → SELL / commercialPricing
```

Research **REUSE** istniejących providerów (`diy-selective-lookup-client` · Edge `mmr-diy-selective-lookup`).
**Nie** nowy research engine. **Nie** zgadywać ceny. **Cena materiału ≠ OUR RATE.**

`mat.inv.*` **HARD-FORBID** jako DIY identity (P1 Invoice CLOSED). CatalogWork baseline **471** (P1 closeout) — starszy snapshot 460 = HISTORICAL IE baseline 2026-08-14.

---

## 7. Research — kompletny kontrakt

**A08-P2 Research-on-Miss = COMPLETE / CLOSED** (prod **2.66.95** / `1f5d871c`).
Starsze pliki P0/P1 closeout mówią „A08-P2 = NOT STARTED” — to **HISTORICAL**. CURRENT = CLOSED.

```text
GATE     = IK ACCESS ∧ P5/P6 AUTO|ON  → executeResearch PERMITTED
HTTP     = ONLY ON TRUE MISS
HIT      = ZERO Research
LEFTOVER = ik*ResearchEnabled  NOT a conjunct
SWITCH   = no extra Research checkbox
F1       = COMPOUND / UNKNOWN / BOTH / UNRESOLVED HOLD
SEQ      = P5 settled before P6
Research ≠ Accept
technical failure ≠ MISS
```

Cooldown / dedupe **REUSE:** `isWorkRateResearchInCooldown(workId, unit)` · klucz typu `${tenderId}|${lineId}|labor|${workId}|${unit}`.

Live PV A08-P2: `ikEntryEnabled=false` → Research HTTP **NOT EXECUTED** (nie failure).

### 7.1 RESEARCH ≠ AUTHORITY

| Pytanie | SOURCE |
|---------|--------|
| Kto uruchamia | Host P5/P6 gdy `executeResearch === true` (A08-P2 permission) |
| Dla kogo | Labor Expert · Material Expert · Composite **leaf** only (nie parent COMPOUND) |
| Wejście | true MISS po CURRENT lookup |
| Wynik | Evidence (labor KV) + ephemeral Candidate |
| Może nadać CatalogWork identity? | **NIE** |
| Może pisać Master BOQ? | **NIE** |
| Research → Candidate | Candidate = propozycja, nie identity |
| Research → Owner | Owner ACCEPT/REJECT/RECALCULATE |
| Research → OUR RATE | tylko po Accept |
| Research → KNR | **0** · B/C3/D nie wołają Research |
| KNR CANDIDATE | **nie** jest Research candidate |

**RESEARCH ≠ AUTHORITY.** Research nie jest Accept, nie jest Owner mapping, nie jest A1.

**Nie** reopen A08-P2. **A08-P3 = NOT STARTED** · OWNER GO REQUIRED.

---

## 7.2 Katalogi (osobno)

| Katalog / mapa | Czym jest | Identity? | Authority KNR? |
|----------------|-----------|-----------|----------------|
| Work Catalog `kw-wgdom-work-catalog` | Biblioteka robót + `ourWorkRate` | `workId` = id `CatalogWork` | **nie** sama z siebie |
| `CatalogWork` | Rekord roboty (id, unit, active, OUR RATE) | tak (praca) | D **waliduje** istnienie/active/unit |
| `catalogWorkId` | Pole linii BOQ wskazujące CatalogWork | **identity linii** | D overlay jedyny writer z toru KNR |
| `workId` | To samo pojęcie w A1/P5/lookup | tak | — |
| Price Memory / our-price-catalog | Materiały + SELL | `materialKey` | **nie** KNR |
| `WORK_RATE_IDENTITY_MAPPINGS` + `resolveLaborIdentityMapping` | Owner exact nazwa→workId labor research | HIT/MISS/AMBIGUOUS/BLOCKED | **legalny reuse wzorca** · **NIE** authority KNR |
| `OWNER_KNR_MAPPINGS` | Owner exact `normalizedKey`→workId | HIT tylko przy CANDIDATE+unit | **JEDYNA** authority KNR v1 |
| `owner-classification-map` | workId→plane A1 | **classification**, nie identity | **nie** KNR |
| `mapOfferBoqLine` / `exact_knr` / `knrHint` | Product Mapper na **kopii** P5 | alias/hint | **ZAKAZ** jako authority D |

Identity = „która praca/materiał”. Classification = „który plane pricing (LABOR/MATERIAL/COMPOUND/UNKNOWN)”.
Mapper ≠ Owner authority.

---

## 8. Classification / A1 / P3 / P5

**Classification BEFORE Research.**

| Symbol | Funkcja | Plik |
|--------|---------|------|
| **A1** | `classifyEstimatorPricingPlane(workId)` | `classification-gate.ts` |
| Owner map | LABOR 29 · MATERIAL 24 · COMPOUND 6 · UNKNOWN 30 | `owner-classification-map.ts` |
| **P3** | `runIkMasterBoqClassification` | `ik-classification.ts` |
| **P5** | Labor expert + `mapOfferBoqLine` na kopii | `ik-labor-expert.ts` |

Owner map freeze (MASTER SSOT):

| Plane | Routing |
|-------|---------|
| LABOR | Work Catalog → research przy MISS |
| MATERIAL | Price Memory → research przy MISS |
| COMPOUND | **HOLD** · zero research |
| UNKNOWN | **HOLD** · zero research |

Miss workId → UNKNOWN.

### 8.1 D vs A1/P3/P5 (FROZEN)

D **NIE** może:

- wołać A1
- patchować `classification-gate.ts`
- patchować `owner-classification-map.ts`
- podłączać się do P5 bez osobnego Owner GO (**OQ-D-2**)

Seam CURRENT (SOURCE `IkEntryHost`):

```text
applyOwnerKnrMapping          (overlay copies)
  → existing P3               (host woła runIkMasterBoqClassification)
  → opts.classification       (VM)
  → A1 konsumuje workId
P5 expert = original report   (nie overlay)
```

**D NIE woła P3.** Host woła istniejący P3.

### 8.2 Rozjazd P3 / P5 identity

**OPEN / PRE-EXISTING.** Nie rozwiązywać w dokumentacji. OQ-D-2: P5 UNCHANGED · osobny Owner GO.

HIT poza A1 seed → `NO_SAFE_CLASS` / `WORK_ID_NO_OWNER_SEED` / plane UNKNOWN — **legalne** (parent R4) · **nie** patch A1.

---

## 8.3 Authority model

**CANDIDATE ≠ IDENTITY.** Owner-confirmed exact mapping = authority v1 dla KNR.

| Aktor / system | MOŻE powiedzieć | NIE MOŻE powiedzieć |
|----------------|-----------------|---------------------|
| **Owner** (tabela + GO) | ta `normalizedKey` = ten `workId` (gdy wszystkie warunki HIT) | auto z CANDIDATE bez wiersza |
| **IK host** | sekwencja ekspertów / fakty | identity KNR bez D HIT |
| **KNR expert (B)** | CANDIDATE / HOLD / NONE (evidencja) | CatalogWork identity |
| **C2 / C3** | prezentacja laik | write identity / knrHint |
| **Research** | Candidate stawki/ceny po MISS | identity · Accept · KNR map |
| **mapper / exact_knr / knrHint** | P5 kopia mapped (osobny tor) | authority D |
| **A1** | plane z workId | nadanie workId |
| **P3** | klasyfikacja linii overlay | write shared BOQ · wołanie z D |
| **P5** | labor path + mapper copy | D overlay · A1 patch |
| **Inspektor** | poza KNR v1 | Owner mapping KNR |
| **runtime user** | collapse chrome · ogląda fakty | confirm KNR v1 (OQ-D-3 NIE) |
| **Hub** | własna EC | KNR overlay / trzeci Surface |

---

## 9. KNR — pełna historia A / B / C / D

Parent freeze: [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) · OD-KNR-1…7.
Niektóre PLAN/CONTRACT slice’ów nadal mają nagłówki „IMPLEMENTATION NOT AUTHORIZED” — to **STALE docs**; CURRENT runtime poniżej.

### 9.1 Slice A — evidencja `catalogBasis`

**Definicja (FROZEN OD-KNR-7):** evidencja only. `catalogBasis` ≠ identity. `knrHint` **nie** z `catalogBasis`. `catalogWorkId` **nie** z A.

```text
AthPreviewRow.code
  → catalogQuantities PRIMARY + rows fallback
  → merge RawSourceLine.catalogBasis
  → compose Master BOQ catalogBasis
  ✗ knrHint
  ✗ catalogWorkId
  ✗ mapper / A1 / P5 / Sala / Owner map
```

| Pole | CURRENT |
|------|---------|
| Changelog narrative | **2.66.97** (wpis UI; live deploy **2.66.103** / **`93eb41be`**) |
| Pliki runtime | `src/lib/multi-boq/compose.ts` · `merge.ts` · `types.ts` · `src/lib/tenders-bzp-swz.ts` · `tenders-bzp-brief.ts` · `tender-offer-boq.ts` — **committed** |
| Test | `scripts/test-ik-knr-expert-slice-a.mjs` — **tracked · committed** |
| Na produkcji | **TAK** · **CLOSED · PRODUCTION VERIFIED · GREEN** |
| Status w D PLAN | **CLOSED · GREEN · `93eb41be`** (historyczny wiersz „NIE na produkcji” = pre-release) |
| OWNER GO | **WYKONANE** (2026-08-19 docs sync) |
| Harness A | **40/0** · regresja B **95/0** · C2 **533/0** · C3 **108/0** · D **58/0** |

Slice A na prod: `catalogBasis` evidence-only pipeline aktywny. Live `withBasis=0` nadal możliwe gdy ATH/code path nie emituje basis (OQ-D-4) — **nie** oznacza braku Slice A na prod.

### 9.2 Slice B — KNR evidence adapter

**B = evidencja. CANDIDATE ≠ identity.**

```text
Document Expert → runIkKnrExpert → IkKnrExpertReport
```

| Invariant | Wartość |
|-----------|---------|
| Status linii | CANDIDATE / HOLD / NONE (CONFLICT v1 = 0) |
| `proposedWorkId` | **null** |
| `resolved` | **0** |
| `catalogWorkIdWritten` | **0** |
| `knrHintMutated` | **false** |
| `mapperCalled` | **false** |
| `classifyCalled` | **false** |
| `researchExecuted` | **false** |

`catalogBasis` = evidence ≠ CatalogWork. `knrHint` **nie** jest authority.

| | |
|--|--|
| Prod | `18f6c1a2333419f216e7f74bd388fd1ce823f3f4` |
| Plik | `src/lib/intelligent-estimator/ik-knr-expert.ts` |
| Test (Owner / prior PV) | **B 95/0** |

### 9.3 Slice C / C2 / C3 — presentation only

**C3 = presentation only. Zero write identity.**

```text
Document Expert
  → runIkKnrExpert
  → opts.knr
  → buildIkEntryConversationViewModel
  → IkExpertRoomChrome
  → ONE existing ExpertConversationSurface
```

C3 zero: `catalogWorkId` · `knrHint` · mapper · A1 · Research · Owner mapping · P5–P8 · Hub · settings · KV · flags.

| | C2 | C3 |
|--|----|----|
| Wersja | **2.66.99** | **2.66.100** |
| SHA | `039a68e15c4edd63d76b0da4626679e9f2eafd3d` | `4a8013658c0ebafd5804803194c3cb684fe8b8fc` |
| Co | `buildIkKnrConversation` | Host wire + chrome |
| Test (Owner / prior PV) | **533/0** | **108/0** |
| Chrome | — | `src/lib/intelligent-estimator/IkExpertRoomChrome.tsx` |

„Inteligentny Kosztorysant” = **Chief**, nie Pricing.
Aktor KNR = **`Knr`**. Kroki po `boq_status`, przed classification.

PLAN C3 w docs może nadal mówić IMPLEMENT NOT AUTHORIZED — **STALE**. CURRENT = prod C3.

### 9.4 Slice D — Owner-confirmed KNR → CatalogWork

**D = jedyny writer KNR identity.**

```text
Owner exact mapping
  → immutable overlay catalogWorkId na KOPII
  → existing P3 (host)
  → A1 konsumuje workId
```

**Legal HIT — wszystkie:**

1. B status = **CANDIDATE**
2. exact `normalizedKey`
3. dokładnie jeden legalny wiersz
4. `ownerApproval === true`
5. `active === true`
6. istniejący active CatalogWork
7. unit OK

Inaczej: **ZERO MUTATION.**

| | |
|--|--|
| Tabela | `OWNER_KNR_MAPPINGS = []` |
| Pusta tabela | **LEGAL V1** |
| Seed `1202-07` | **ABSENT** · ZAKAZ |
| Write | tylko `catalogWorkId` na overlay copies |
| Shared `ref.line` | **NIE MUTOWAĆ** |
| knrHint / KV / settings / flags | **NIE** |
| A1 / P5 / Research / mapper | **NIE woła** |

Zakazane: description heuristic · alias · fuzzy · `mapOfferBoqLine` / `exact_knr` jako authority D · auto-assign.

| | |
|--|--|
| Prod | **2.66.101** · `16c3c9382dbe587a0877c70c2dab5b0b7d76d7ea` |
| Plik | `src/lib/intelligent-estimator/ik-knr-owner-mapping.ts` |
| Host | `IkEntryHost.tsx` overlay + `opts.classification` |
| Test D | **58/0** |
| Regresja (Owner / prior PV) | C2 533/0 · C3 108/0 · B 95/0 · A 40/0 · A1 37/0 · CATALOG ALL PASS · P0 52/0 |
| STATUS | **PRODUCTION VERIFIED · GREEN** |
| PV | **PASS WITH UNVERIFIED ITEMS** |

Harness D **nie** był ponownie uruchamiany w sesji docs-close / cold-start. Liczby = Owner GO + prior Production Verify.

### 9.5 D UNVERIFIED — NEVER PASS

1. Live UI: **CANDIDATE + empty Owner table** — testowany przetarg `withBasis=0` / `masterReady=0` / KNR **BLOCKED**.
2. shared `ref.line` immutability **via DOM** — nieobserwowalne w DOM; harness + source review.
3. **P3 UNKNOWN live UI** — Master BOQ HOLD, P3 nie wystartował.

---

## 10. Slice A — staging discipline (HISTORICAL — pre-release)

**Nie mylić** z IK Role Activation (2.66.96, prod) ani z TM-01 „Slice A”.

KNR Slice A = `catalogBasis` evidence w compose/merge/SWZ.

| | |
|--|--|
| **CURRENT (post-release)** | **CLOSED · PRODUCTION VERIFIED · GREEN** · **`93eb41be`** · harness **40/0** |
| Na `origin/main` / prod | **PRESENT** (compose/merge/SWZ committed) |
| Discipline poniżej | **HISTORICAL** — obowiązywała przed OWNER GO / release |

| (historyczne) | |
|--|--|
| Pre-release na prod | **ABSENT** |
| Pre-release lokalnie | **WIP UNCOMMITTED** |
| Pliki (git status pre-release) | `M compose.ts` · `M merge.ts` · `M tenders-bzp-swz.ts` · `M tenders-bzp-brief.ts` · `?? test-ik-knr-expert-slice-a.mjs` |
| Zakaz (nadal obowiązuje przy innych slice) | stage przy C3/D/E · `git add -A` · „porządkowanie” obcego WIP przy innym slice |

---

## 11. Orchestration

```text
Chief
  → Case
  → Tasks
  → Experts
  → evidence
  → decisions
  → recompute
  → final estimate
```

IK = **prezentacyjna warstwa orkiestracji** istniejącego pipeline.

- Expert Conversation **nie** jest osobnym systemem danych (VM + `sourceRef`).
- **Nie** drugi event bus.
- **Nie** drugi Surface (Hub Surface KEEP; C3 chrome tylko w hoście).
- **Nie** drugi store.

Host CURRENT (skrót SOURCE):

```text
IkEntryHost
  Document Expert
  → runIkKnrExpert                         (B)
  → applyOwnerKnrMapping                   (D overlay copies)
  → runIkMasterBoqClassification           (P3 existing)
  → Labor Expert (P5 original report)
  → Material Expert (P6 after P5 settled)
  → Composite BOTH_HOLD
  → P7 Bid / P8 Risk
  → buildIkEntryConversationViewModel (opts.knr + opts.classification)
  → IkExpertRoomChrome → ExpertConversationSurface
```

### 11.1 CURRENT RUNTIME vs TARGET / PLANNED

| | CURRENT (SOURCE) | TARGET / PLANNED |
|--|------------------|------------------|
| First screen | IK host gdy ACCESS ON (P10 Gate absent) | to samo · **nie** revive NG-10 |
| KNR evidence na prod | B czyta `catalogBasis` · **Slice A compose ON prod** · `catalogBasis` evidence-only | **CLOSED · GREEN · `93eb41be`** |
| KNR identity | pusta `OWNER_KNR_MAPPINGS` · 0 HIT legalne | wiersze tabeli tylko Owner GO PR |
| P3 vs P5 | overlay tylko P3; P5 original + mapper | OQ-D-2 **OPEN** · **NOT AUTHORIZED** |
| Accept w hoście | **brak przycisków** | PLANNED poza v1 KNR · OWNER GO |
| PACKAGE research COMPOUND | HOLD freeze | OWNER GO REQUIRED |
| Slice E | **NOT DEFINED** | PLAN-DESIGN only |
| PDF final table IK | REUSE Bid PDF exists · IK nie nowy engine | AUDIT + Owner GO przed nowym silnikiem |

Nie zgadywać przyszłej orkiestracji poza zamrożonym loopiem §3.

---

## 12. Entry / Autonomy / flagi

| Klucz | Rola | Stan |
|-------|------|------|
| **`isIkEntryEnabled()`** | Adapter ACCESS (Role Activation) | CURRENT · `ik-entry-flag.ts` |
| leftover `ikEntryEnabled` | **nie** runtime conjunct | CURRENT |
| `ikEntryForAdminEnabled` / `ikEntryForModeratorEnabled` | Role Activation 2.66.96 | CURRENT · default OFF |
| Super Admin | ALWAYS ON (OD-RA-1) | CURRENT |
| **`expertAiDecydentEnabled` (D)** | Dual Outcome **HARD STOP** · IK ≠ D | FROZEN |
| P3–P8 `"AUTO"\|"OFF"\|"ON"` | TECHNICAL / ADVANCED | CURRENT |
| leftover `ik*ResearchEnabled` | no-op vs A08-P2 | CURRENT |
| leftover `ikAutoIngestEnabled` | nie gate P2 | CURRENT |

**Nie tworzyć nowych flag IK.**

Role Activation DF w docs może mówić IMPLEMENT NOT AUTHORIZED — **STALE**. CURRENT = prod **2.66.96** / `f069b29a`.

### 12.1 Autonomy chain

| Slice | Status | Tip |
|-------|--------|-----|
| AUTONOMY-05 | COMPLETE / CLOSED | 2.66.90 |
| AUTONOMY-06 | COMPLETE / CLOSED | 2.66.91 |
| AUTONOMY-07 | COMPLETE / CLOSED | 2.66.92 |
| A08-P0 | COMPLETE / CLOSED | 2.66.93 |
| A08-P1 | COMPLETE / CLOSED | 2.66.94 |
| **A08-P2** | **COMPLETE / CLOSED** | **2.66.95** |
| AUTONOMY-08 epic | **NOT CLOSED** | — |
| **A08-P3** | **NOT STARTED** | OWNER GO REQUIRED |
| Composite | CLOSED | 2.66.89 |
| P1 invoice | CLOSED | 2.66.88 · CatalogWork 471 |
| P2 identity | KEEP GAP | nie invent |
| IK-MIGRATION-01 P0–P9 | LOCKED / COMPLETE | 2.66.86 |
| **P10 NG-10 first-screen** | **COMPLETE / CLOSED** | **2.66.87** / `7a32bb34` |
| P5.33 | DO NOT CREATE | FROZEN |

### 12.2 Autonomy 05–08 (skrót SOURCE)

| Faza | Cel | Authority | Runtime | Zamknięte | Otwarte / zakaz |
|------|-----|-----------|---------|-----------|-----------------|
| A05 | P5/P6 `"AUTO"\|"OFF"\|"ON"` | Owner levers · OFF wins · B-POLICY | MODE A AUTO/ON · HOLD OFF | CLOSED 2.66.90 | nie nowy flag Research |
| A06 | P7 Bid calc AUTO | Final Bid OWNER | in-memory · RESEARCH=0 | CLOSED 2.66.91 | nie auto persist oferty |
| A07 | P8 Risk/DW prepare | persist = DW/D | READ-ONLY · `canApprove` display | CLOSED 2.66.92 | nie auto-decyzja |
| A08-P0 | IK ON ⇒ Documents→BOQ | OD-08-1 | `isIkP2DocumentsBoqActive` | CLOSED 2.66.93 | leftover ingest key nie gate |
| A08-P1 | jeden ACCESS switch | potem supersede Role Activation | settings unification | CLOSED 2.66.94 | nie wracać AUTO_INGEST UI |
| A08-P2 | Research-on-Miss | Research ≠ Accept | permission Entry∧P5/P6 AUTO\|ON | CLOSED 2.66.95 | **nie reopen** |
| A08-P3 | — | — | — | **NOT STARTED** | IMPLEMENT **NOT AUTHORIZED** |
| Policy A03 | Autonomy ≠ Owner decision | Accept/Price/Final Bid OWNER | docs | POLICY | nie implement z A03 |

AUTONOMY-08 **epic NOT CLOSED**. Nie startować A08-P3 / SMART / MS bez Owner GO.

---

## 13. Legacy Przetargi / NG-10

**Czym był NG-10:** first-screen theater (`TenderAutonomousGate` / Run / Outcome) — projekcja pipeline, nie silnik IK.

**Dlaczego zastąpiony:** kontrolowana migracja (AD-IK-M01) — IK Entry + fakty `sourceRef`, bez big-bang rewrite TenderModule.

**CURRENT SOURCE (P10 CLOSED, 2.66.87 / `7a32bb34`):**

- `resolveIkDetailFirstScreen` **zawsze** `"ik_entry"` — Gate **nie** wraca z flagi.
- `IkEntryHost` montowany gdy `isIkEntryEnabled()` (Role Activation).
- TRE Outcome **tylko CTA** (`data-s7-tre-recovery-cta`) — nie auto Outcome-first.
- Hub / tabs V4 **KEEP**.
- `ikP10*` **ABSENT**.

**HISTORICAL:** `IK-MIGRATION-01-FINAL-HANDOFF.md` pisze „P10 = NOT STARTED” — to stan **po P9, przed P10**. Nie używać jako CURRENT.

**Legacy KEEP:** TRE view/engine S7 · Dual Outcome D · DecisionView recovery · Offer/Bid stores.

**Nie przywracać:** NG-10 jako first-screen · auto Outcome-first jako default · drugi TenderModule.

Proces (już wykonany dla P10; nadal obowiązuje dla dalszego cleanup kodu NG-10 **jeśli** Owner GO):

```text
AUDIT → consumers → SSOT → seam → Design Freeze
  → Owner GO → migration → Production Verify → cleanup
```

Workflow UI: [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md).

---

## 14. PDF / Final Estimate

```text
Position Cost → Bid → Final Estimate → Breakdown → PDF Preview → PDF
```

**Najpierw REUSE:**

| Stack | Plik / obszar |
|-------|----------------|
| Bid package PDF | `src/lib/tender-bid-package-pdf.ts` · `exportTenderBidPackagePdf` |
| ATH parse / preview | `ath-parser.ts` · `ath-kosztorys-pdf.ts` · **brak ATH writer** |
| WM / ZI / EM | istniejące generatory — **nie** IK PDF engine |
| Print/export utilities | Grep przed CREATE |

Nowy PDF engine = **OWNER GO REQUIRED** + AUDIT consumers.
ATH write = **FORBIDDEN** w P0–P10 (AD-IK-M10).

---

## 15. CLOSED / OPEN

### CLOSED (nie reopen bez Owner GO)

| Item | Uwaga |
|------|--------|
| IK-MIGRATION-01 P0–P9 | LOCKED |
| **P10 NG-10 DECOMMISSION** | CLOSED 2.66.87 |
| AUTONOMY-05 / 06 / 07 | P5–P8 AUTO\|OFF\|ON |
| A08-P0 / P1 / P2 | P2 = Research-on-Miss CLOSED |
| Composite BOTH_HOLD consumer | 2.66.89 |
| P1 invoice host | 471 CatalogWork |
| Role Activation | 2.66.96 |
| KNR B | `18f6c1a2` |
| KNR C2 | 2.66.99 |
| KNR C3 | 2.66.100 |
| **KNR A** | **2.66.103 GREEN · `93eb41be`** |
| **KNR D** | **2.66.101 GREEN** |
| TM-01 S0–S9 | EPIC CLOSED |
| Inteligentny Kosztorysant UX | presentation CLOSED |
| Tablica OUR RATE 546 | DATA VERIFIED |

### OPEN / NOT STARTED

| Item | Status |
|------|--------|
| **Slice E** | **NOT STARTED** · IMPLEMENTATION **NOT AUTHORIZED** · scope **NOT YET DEFINED IN SOURCE** |
| **OQ-D-2** | P5 identity integration OPEN |
| **OQ-D-3** | per-tender confirm UI **NIE w v1** |
| A08-P3 | NOT STARTED |
| AUTONOMY-08 epic close | NOT CLOSED |
| PACKAGE / COMPOUND research | OWNER GO REQUIRED (MASTER HOLD zostaje) |
| Podejście pkt/mb | HOLD UNPROVEN |
| Wykwity | SOURCE GAP |
| P3 vs P5 identity rozjazd | PRE-EXISTING OPEN |
| D UNVERIFIED 1–3 | NOT PASS · NOT FAIL |
| F5-A T2 labor next | PRE-EXISTING (P9 exception) |
| Mobile physical IK | NOT VERIFIED (P9) |
| 09 tip vs live 2.66.103 | 09 **SYNCED** (docs sync 2026-08-19) |

**Nie inventować** nowych EPIC/Slice z tej listy.

---

## 16. Slice E

```text
NEXT = OWNER REVIEW / PLAN-DESIGN FOR SLICE E
SLICE E = NOT STARTED
IMPLEMENTATION OF E = NOT AUTHORIZED
```

**Slice E scope = NOT YET DEFINED IN SOURCE.**
No implementation authorized.

Najpierw: AUDIT → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO → IMPLEMENT.

Nie uruchamiać E z cold-startu.

---

## 17. Workflow governance (obowiązkowy)

```text
AUDIT
  → RCA / PLAN
  → DESIGN FREEZE
  → ARCH REVIEW
  → OWNER GO
  → IMPLEMENT
  → BUILD
  → TEST
  → OWNER VERIFY
  → COMMIT
  → PUSH
  → DEPLOY
  → PRODUCTION VERIFY
  → DOCUMENTATION CLOSEOUT
  → DOC COMMIT
  → DOC PUSH
  → CLOSE
```

- Nigdy IMPLEMENT przed Owner GO.
- Nigdy `git add -A`.
- Nigdy `vercel deploy`.
- Production: `git push origin main` → Vercel Git Integration.
- Unrelated WIP (obcy runtime poza scope) zostaje LOCAL — Slice A **CLOSED** na prod.

---

## 18. CURSOR COLD START

**START = AUDIT ONLY.**

```text
1.  git status
2.  git log -5
3.  production / version.json          (CURRENT **2.66.103** / **`93eb41be`** · Slice A GREEN)
4.  locate TenderDetailPage
5.  locate IkEntryHost
6.  locate ExpertConversationSurface
7.  locate Document Expert             (ik-document-expert.ts)
8.  locate classification              (classification-gate.ts · ik-classification.ts)
9.  locate identity                    (catalogWorkId overlay D · identity-coverage)
10. Work Catalog                       (src/lib/work-catalog/)
11. Price Memory                       (our-price-catalog · DIY)
12. Labor Expert                       (ik-labor-expert.ts)
13. Material Expert                    (ik-material-expert.ts)
14. Research                           (A08-P2 · runIkLaborGapResearch · executeMaterialResearchPhase2)
15. Evidence                           (labor-source-evidence)
16. Candidate                          (ephemeral research)
17. Accept                             (work-rate-accept · material accept)
18. OUR RATE                           (CatalogWork.ourWorkRate)
19. Position Cost                      (tender-position-cost)
20. Bid                                (P7 · tenders-bid-calculator · F5 cutover)
21. Chief                              (chief-orchestrator)
22. Validation / Risk                  (validation-expert · ik-p8-risk-decision)
23. PDF                                (tender-bid-package-pdf · ATH preview)
24. cooldown / dedupe                  (isWorkRateResearchInCooldown)
```

```text
ZERO CODE.
ZERO SETTINGS.
ZERO NEW FILES.
ZERO COMMIT.
ZERO PUSH.
ZERO DEPLOY.
```

Czytaj: TEN PLIK → MASTER SSOT → IK-MASTER-CONTINUITY → Migration FINAL/DF → 09 (pamiętaj STALE) → live version.json.

---

## 19. JAK NOWY CHATGPT MA ROZPOCZĄĆ PRACĘ

1. Najpierw przeczytaj [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) (Contract SSOT — nie zastępuj).
2. Następnie **TEN PLIK**.
3. Następnie aktualny SOURCE (`IkEntryHost`, `version.json`, `git log`/`status`).
4. Nie zakładaj, że Slice E jest zdefiniowany — **NOT DEFINED IN SOURCE**.
5. Nie implementuj bez AUDIT → PLAN → FREEZE → ARCH REVIEW → OWNER GO.
6. **CANDIDATE ≠ identity.**
7. Owner (exact tabela + `ownerApproval`) jest authority KNR v1.
8. Nie używaj mappera / `exact_knr` jako authority KNR.
9. Nie używaj `knrHint` jako authority.
10. Nie ruszaj A1/P3/P5 bez jawnego zakresu (OQ-D-2 OPEN).
11. Nie stage'uj obcego WIP razem z innym slice (`git add -A` **zakaz**) — Slice A **CLOSED**; reguła nadal obowiązuje dla innych slice.
12. Zawsze rozdziel **CURRENT RUNTIME** od **TARGET ARCHITECTURE**.
13. Gdy SOURCE czegoś nie potwierdza — napisz **NOT VERIFIED** zamiast zgadywać.

**Zdanie startowe:**

> Inteligentny Kosztorysant już istnieje jako zestaw istniejących modułów. Najpierw odtworzę jego mapę i będę rozwijał istniejące SSOT.

Czytaj też: continuity Autonomy [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) · Migration DF/FINAL (P10 closeout **nadpisuje** wiersz P10 NOT STARTED w FINAL) · 09 (**może być STALE vs live**).

**NEXT (CURRENT):** OWNER REVIEW OF NEXT SLICE / PLAN-DESIGN · Slice E NOT STARTED.

---

## 20. Hard locks (skrót)

```text
❌ nowy TenderModule / parser / BOQ / Catalog / PM / Evidence / OUR RATE / Accept / PDF engine
❌ Evidence → OUR RATE bez Candidate + Owner Accept
❌ companyPricePln → OUR RATE
❌ pkt ≡ mb bez dowodu
❌ Research COMPOUND / UNKNOWN
❌ Research before classification
❌ technical failure as MISS
❌ D auto-assign z samego CANDIDATE
❌ seed 1202-07
❌ knrHint jako identity
❌ git add -A · vercel deploy
❌ Slice E IMPLEMENT
❌ A08-P2 reopen · A08-P3 bez Owner GO
```

---

## 21. Źródła przeczytane przy sporządzeniu (2026-08-18)

**SSOT / continuity:** MASTER-SSOT · IK-MASTER-CONTINUITY-HANDOFF-2026-08-18 · IK-MIGRATION-01-DESIGN-FREEZE · IK-MIGRATION-01-FINAL-HANDOFF · ARCHITECTURE · DATA-FLOW · REUSE-MAP · PRODUCTION-BASELINE · AI-CONTINUITY · 09_PRODUCTION_BASELINE · live version.json.

**KNR:** DESIGN-FREEZE · DESIGN-FREEZE-AMEND · DESIGN · AUDIT · ARCH-REVIEW · ARCH-RE-REVIEW · SLICE-B PLAN/CONTRACT/DF/ARCH-REVIEW · SLICE-C PLAN/DF · SLICE-C3 PLAN/DF · SLICE-D PLAN/DF.

**Autonomy:** A08-P2 CLOSEOUT/PV/PLAN/DF · A08-P0/P1 closeout fragments · AUTONOMY-05/06/07 closeout pointers · ROLE-ACTIVATION DF.

**SOURCE runtime:** `TenderDetailPage.tsx` (mount) · `IkEntryHost.tsx` (pełny tor P2→B→D→P3→P5→P6→Composite→P7→P8→VM→chrome) · `ik-knr-expert.ts` · `ik-knr-owner-mapping.ts` · `IkExpertRoomChrome.tsx` · `ik-knr-conversation.ts` · `ik-classification.ts` · `ik-document-expert.ts` · `classification-gate.ts` · `ik-entry-flag.ts` (`resolveIkDetailFirstScreen`) · `ik-labor-expert.ts` · `ik-material-expert.ts` · `ik-composite-both-hold.ts` · `ik-p7-position-cost-bid.ts` · `ik-p8-risk-decision.ts` · `ik-entry-conversation.ts` · `ik-conversation-event.ts` · `ik-ng02-ingest-bridge.ts` · `work-rate-identity-mapping.ts` · `tender-offer-boq-mapping.ts` (`exact_knr`) · `changelog-data.ts` · git SHAs C3/D/B/C2/Role Activation/P10.

**P10:** `IK-MIGRATION-01-P10-IMPLEMENTATION-CLOSEOUT.md` · P10 PV/DF (FINAL HANDOFF P10 NOT STARTED = STALE).

**Nie przeczytane linia-po-linii (pointer only / HISTORICAL):** pełny korpus 200+ plików Autonomy 01–08 PLAN/DF; NEXT-EPIC-CANDIDATES (2026-08-03 HISTORICAL); wszystkie coverage-wave / labor-evidence closeouty poza kontraktami cytowanymi w MASTER.

---

## 22. NOT VERIFIED (jawne)

| # | Fakt | Powód |
|---|------|--------|
| 1 | Live UI CANDIDATE + empty Owner table | D UNVERIFIED · przetarg BLOCKED |
| 2 | shared `ref.line` immutability via DOM | D UNVERIFIED |
| 3 | live P3 UNKNOWN UI | D UNVERIFIED · Master BOQ HOLD |
| 4 | Ponowny przebieg harness D/C3/C2/B/A/A1 w tej sesji docs | **NOT RUN** · liczby z Owner GO / prior PV |
| 5 | Slice A szczegóły runtime | **CLOSED · GREEN · `93eb41be`** · szczegóły kontraktu = parent DF §2A |
| 6 | Mobile physical IK | P9 NOT VERIFIED |
| 7 | 09 docs tip = live tip | 09 **SYNCED** · **2.66.103** / `93eb41be` |
| 8 | Slice E zakres | **NOT DEFINED IN SOURCE** |

---

## 23. Known non-blockers (SOURCE — nie eskalować do P0)

| Item | Źródło |
|------|--------|
| C3 dual header (Brand + Surface header) | C3 DF §13 · OQ-C3-3 NIE usuwać Surface header |
| Nested max-h | C3 chrome descendant override · Surface API UNCHANGED |
| Slice A on prod · live `withBasis=0` możliwe bez basis w ATH | OQ-D-4 · C3/D DF · **Slice A CLOSED on prod** |
| P3 vs P5 identity split | OQ-D-2 OPEN · PRE-EXISTING |
| Tree-shaken aktor `Knr` w bundle (label C2 zostaje) | D DF non-blockers |
| Host classification seam (`opts.classification`, nie fake ingest) | D module comment + host |
| Changelog narrative Slice A **2.66.97** vs live deploy **2.66.103** | by design · tip SSOT [`09`](../AI/09_PRODUCTION_BASELINE.md) |
| Brak live CANDIDATE + empty table | D UNVERIFIED 1 |
| Brak live P3 UNKNOWN | D UNVERIFIED 3 |
| Brak DOM verification shared ref | D UNVERIFIED 2 |
| F5-T2 labor next | P9/P10 OUT OF GREEN CLAIM |
| A08-P1 OV findings (muted copy, leftover data attrs) | P1 PV NON-BLOCKING |

---

## 24. Macierz weryfikacji

| Twierdzenie | SOURCE | Harness | Local UI | Production |
|-------------|--------|---------|----------|------------|
| D overlay + pusta tabela 0 mutation | VERIFIED | VERIFIED (58/0 prior) | NOT VERIFIED (CANDIDATE path) | VERIFIED deploy 2.66.101 |
| C3 presentation only | VERIFIED | VERIFIED (108/0 prior) | PARTIAL (chrome PASS prior) | VERIFIED 2.66.100 |
| Shared `ref.line` immutable via DOM | VERIFIED (clone in code) | VERIFIED | **NOT VERIFIED** | **NOT VERIFIED** |
| Live CANDIDATE + empty Owner table | n/a | fixture | **NOT VERIFIED** | **NOT VERIFIED** |
| Live P3 UNKNOWN | n/a | n/a | **NOT VERIFIED** | **NOT VERIFIED** |
| A08-P2 Research-on-Miss | VERIFIED | VERIFIED prior | NOT EXECUTED (Entry OFF PV) | CLOSED 2.66.95 |
| P10 NG-10 decommission | VERIFIED | VERIFIED closeout | — | CLOSED 2.66.87 |
| Slice A na prod | **VERIFIED** | VERIFIED **40/0** | CLOSED | **VERIFIED deploy 2.66.103 / `93eb41be`** |
| Slice E | **NOT FOUND** | — | — | — |

Harness counts w tej sesji docs: **NOT RUN** (prior Owner PV).

---

## 25. FILES / SOURCE MAP

| Obszar | Najważniejszy plik | Rola | Status |
|--------|-------------------|------|--------|
| Contract SSOT | `docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md` | kontrakt | ACTIVE · tip 2.66.95 HISTORICAL |
| TEN HANDOFF | `docs/architecture/IK-COMPLETE-COLD-START-HANDOFF-2026-08-18.md` | continuity | CURRENT |
| Entry host | `src/app/intelligent-estimator/IkEntryHost.tsx` | orchestration UI | PROD |
| KNR expert | `src/lib/intelligent-estimator/ik-knr-expert.ts` | B evidence | PROD |
| KNR Owner map | `src/lib/intelligent-estimator/ik-knr-owner-mapping.ts` | D overlay | PROD empty table |
| Conversation VM | `src/lib/intelligent-estimator/ik-entry-conversation.ts` | facts + `opts.knr` | PROD |
| Event/actor | `src/lib/intelligent-estimator/ik-conversation-event.ts` | `Knr` actor | PROD |
| C2 copy | `src/lib/intelligent-estimator/ik-knr-conversation.ts` | laik steps | PROD |
| Chrome | `src/lib/intelligent-estimator/IkExpertRoomChrome.tsx` | C3 | PROD |
| Surface | `src/app/expert-conversation/ExpertConversationSurface.tsx` | ONE IK surface | PROD · Hub osobno |
| A1 | `src/lib/intelligent-estimator/classification-gate.ts` | plane | PROD |
| Owner class map | `src/lib/intelligent-estimator/owner-classification-map.ts` | A1 seed | PROD UNCHANGED by D |
| Labor identity map | `src/lib/work-catalog/work-rate-identity-mapping.ts` | **nie** KNR | PROD |
| Mapper | `src/lib/tender-offer-boq-mapping.ts` | P5 copy · `exact_knr` | PROD · nie authority D |
| P3 | `src/lib/intelligent-estimator/ik-classification.ts` | Master BOQ classify | PROD |
| P5 | `src/lib/intelligent-estimator/ik-labor-expert.ts` | Labor + mapper | PROD |
| P6 | `src/lib/intelligent-estimator/ik-material-expert.ts` | Material | PROD |
| P7 | `src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts` | Bid in-memory | PROD |
| P8 | `src/lib/intelligent-estimator/ik-p8-risk-decision.ts` | Risk prepare | PROD |
| Research labor | `src/lib/ik-pricing-orchestrator/labor-research-bridge.ts` · `work-rate-research.ts` | MISS only | PROD A08-P2 |
| Catalog | `src/lib/work-catalog/*` | OUR RATE | PROD |
| KNR DF | `docs/architecture/IK-KNR-EXPERT-*.md` | freeze/plan | D PLAN CLOSED; C3 PLAN nagłówki STALE |
| Changelog HEAD | `src/app/changelog-data.ts` | narrative **2.66.97** (Slice A) · live **2.66.103** | PROD |
| P10 | `IK-MIGRATION-01-P10-IMPLEMENTATION-CLOSEOUT.md` | NG-10 gone | CLOSED |
| Slice A test | `scripts/test-ik-knr-expert-slice-a.mjs` | T-SRC | **tracked · PROD harness 40/0** |

---

# STOP

| | |
|--|--|
| **Contract SSOT** | `INTELLIGENT-ESTIMATOR-MASTER-SSOT.md` **UNCHANGED** |
| **CURRENT prod** | **2.66.103** / `93eb41be` |
| **C3** | **2.66.100** / `4a8013658c0ebafd5804803194c3cb684fe8b8fc` |
| **D** | **CLOSED · PRODUCTION VERIFIED · GREEN** |
| **Slice A** | **CLOSED · PRODUCTION VERIFIED · GREEN** · **`93eb41be`** · harness **40/0** |
| **Slice E** | **NOT STARTED** · NOT AUTHORIZED |
| **A08-P2** | **CLOSED** (nie NOT STARTED) |
| **NEXT** | **OWNER REVIEW OF NEXT SLICE / PLAN-DESIGN** |
| **RUNTIME** | **UNCHANGED** (ten plik = docs only) |
