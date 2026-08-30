# INTELLIGENT ESTIMATOR — MASTER SSOT

> **ID:** `INTELLIGENT-ESTIMATOR-MASTER-SSOT`
> **STATUS:** **ACTIVE** · **★★ SSOT Inteligentnego Kosztorysanta** · **★★ JEDYNY cold-start IK dla nowego GPT/Cursor**
> **Data:** 2026-08-30 (**docs-only promote** · Owner GO) · prior 2026-08-28 (**CHROBREGO CURRENT** · G2 Labor m² Accept **CLOSED/PASS**) · prior 2026-08-28 (Owner **OD-W0-GO** · OD-P3 governance) · prior 2026-08-26 (A08-P3 IMPLEMENTED · G2 WAIT = **HISTORY**)
> **Doc hash (pre-edit baseline):** `82D337F25431` @ git `b857a162` · **post-edit:** see git after this session
> **★★ DOCS-ONLY PROMOTE (2026-08-30 · Owner GO):** formalizes existing CHROBREGO G2 Labor m² **CLOSED/PASS** (§10.0 · §22) from session evidence `.tmp-chrobrego-g1-audit/g2-batch-accept-report.json` (LP7 ACCEPTED · LP8/12/13/14 IDEMPOTENT_NOOP · OUR RATE **22.90**) · **≠** invent Accept · **≠** reopen LP7–14 · **≠** G2 Material PASS · **≠** A08-P3 CLOSED · **≠** code/data/Payroll
> **Mode:** DOCUMENTATION ONLY · **NO REBUILD** · Experience Phases **1–4 PRODUCTION VERIFIED** · Phase **5 NOT AUTHORIZED** · **≠** cały IK globalnie E2E GREEN · **AUTONOMY-08 epic NOT CLOSED**
> **★★ DECISION TREE = PRIMARY CONTINUITY CONTRACT** — §10.0 · §17 · §22 · **Decision Tree > report > artifact > chat memory**
> **★★ MASTER CONNECTIVITY CONTRACT:** **§2A** — Orchestra = single sequencer · Host = adapter · **OD-W0-GO GRANTED** (governance) · W3–W6 **NOT** auto-authorized · **≠** Production Verified
> **Experience DF:** [`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md) · Phase 4 amend §21
> **A08-P3:** impl **`3822acb`** · UI tip via [`09`](../AI/09_PRODUCTION_BASELINE.md) · DF [`IK-AUTONOMY-08-P3-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P3-DESIGN-FREEZE.md) · harness **27/0** · **P3 OPEN** (epic) · G1 contract **Owner APPROVED** · G2 contract **Owner APPROVED** · G1 PV **PASS** · **G2 Labor m² (CHROBREGO) CLOSED/PASS** · G2 material **WAIT** · G3 / Experience **NOT STARTED** · APF **FROZEN** (OD-P3-7)
> **★★ CHROBREGO CURRENT CHECKPOINT:** §10.0 · §22 — tender `08df0363-7b22-e462-ab56-940001283cba` · OCDS `ocds-148610-6f859612-6631-426b-83fc-830bfec1c888`
> **Live tip:** wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) + live `version.json` (nie hardcoduj SHA/UI tu przy driftcie)
> **AI Owner Authority (pointer only):** [`IK-AI-OWNER-AUTHORITY-POLICY.md`](./IK-AI-OWNER-AUTHORITY-POLICY.md) · gate [`OD-IK-AI-OWNER-AUTHORITY-1-GATE.md`](./OD-IK-AI-OWNER-AUTHORITY-1-GATE.md) **COMPLETE** · Level A **IMPLEMENTATION = NOT AUTHORIZED**
> **Owner Map slices (latest):** A01-S1 **`3e4adfff`** · A01-LP5 **`f012d39a`** · A01-S3 OUR RATE **`e7774ca5`** · **A01 F5 MARGIN **`82f3520e`**** · A09-PACKAGE-S1 **`8ccb3e9b`**
> **Sesja continuity:** [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) · prior [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md)
> **★★ IK EXPERIENCE:** §13 — Observation SSOT (Phases **1–2 CLOSED**) · Live Viz consumer (**Phase 3 CLOSED**) · Team Conversation overlay (**Phase 4 CLOSED**) · ETA / Final Wrap-up = **Phase 5 NOT AUTHORIZED**

```text
════════════════════════════════════════════════════════
NIE BUDUJ OD NOWA.
SEARCH BEFORE CREATE.
Przetargi + kosztorysowanie JUŻ ISTNIEJĄ.
IK = ORCHESTRACJA ISTNIEJĄCYCH MODUŁÓW WGDOM,
     nie drugi TenderModule / Catalog / Pricing / Host.
════════════════════════════════════════════════════════
```

```text
════════════════════════════════════════════════════════
★★ DECISION TREE IS THE PRIMARY CONTINUITY CONTRACT OF IK ★★

Decision Tree > pojedynczy raport > artefakt > pamięć rozmowy.

Każdy nowy AI MUSI:
  1. przeczytać TEN Master SSOT
  2. odnaleźć CURRENT DECISION TREE (§10.0)
  3. ustalić CURRENT NODE
  4. przeczytać CLOSED / OPEN branches
  5. respektować Owner GO / STOP gates
  6. kontynuować WYŁĄCZNIE z aktualnego węzła

NIE rozpoczynaj ponownie zamkniętej gałęzi
tylko dlatego, że raport jest w historii czatu.

Jeżeli raport historyczny ≠ Decision Tree:
  → READ-ONLY AUDIT (repo + ten SSOT) · NIE zgaduj.
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
| **CLOSED / PASS** | Gałąź Decision Tree zamknięta — **nie** reopen bez Owner GO |
| **HISTORY / PRIOR STATE** | Starszy checkpoint — nie mylić z CURRENT |

## 0. Co to jest WGDOM

**W&G DOM** — aplikacja operacyjna (React/Vite): Roboty, Lista Płac, WM Druk, **Przetargi**, Inteligentny Kosztorysant (IK).
Prod: https://www.wgdom.fun · repo `main` · FE deploy = `git push origin main` → Vercel (**zakaz** `vercel deploy`).

---

## 1. Co to jest Inteligentny Kosztorysant

```text
IK = JEDEN ZESPÓŁ EKSPERTÓW nad ISTNIEJĄCYM stackiem Przetargów.
    + JEDEN CASE + JEDEN ORCHESTRATED PIPELINE + ISTNIEJĄCE SSOT
    + RZECZYWISTA WSPÓŁPRACA EKSPERTÓW (projekcja pipeline)
    + LIVE TEAM EXPERIENCE (TARGET — §13)
    + PEŁNY KOSZTORYS + WYJAŚNIENIE WYNIKU + BID / PDF

Nie drugi chatbot. Nie drugi silnik Bid. Nie drugi Catalog.
Nie izolowane demo-slice'y bez drogi do kompletnego systemu.
```

| Rola (logiczna) | Rzeczywisty byt w source | NIE jest |
|-----------------|--------------------------|----------|
| **Chief** | `chief-session` + `chief-orchestrator` + dossier UI · sesja Case/Task · prezentacja stanu | Drugim TenderModule · Decydentem (D) · drugim Hostem · drugim IK sequencerem |
| **Orchestra (IK sequencer)** | `IkOrchestraPageBridge` → `useIkOrchestra` → `ik-orchestra-engine` + `ik-orchestra-runtime` — **jedyny** IK execution/sequencing path | Drugim Chiefem · Experience engine · Hub Accept path |
| **Host / UI adapter** | `IkEntryHost` — adapter/consumer snapshotu Orchestra (EC · Live Viz · Owner panels · data attrs) · **NIE** sequencer IK | Drugim Orchestra · drugim Chiefem · drugim Work Catalog |
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
| **Expert Conversation (CURRENT)** | `ExpertConversationSurface` + `ik-entry-conversation` (+ truth filter) | Osobnym LLM per ekspert · fikcyjnym chat store |
| **IK Experience layer (TARGET)** | Projekcja observability nad runtime (§13) — Team Conversation + Live Visualization + ETA + Final Summary | Drugim systemem IK · storytelling engine |

**OWNER = DECISION MAKER.** IK analizuje / proponuje / porównuje / wyjaśnia / wskazuje ryzyko / rekomenduje.
**NIE** przejmuje samowolnie: OUR RATE · Accept · KNR mapping boundaries · Final Bid · Historical authority.

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
- osobny chat store / LLM per expert / storytelling Experience engine (bez projekcji pipeline — §13)
- `Evidence → OUR RATE` bez Candidate + Owner Accept
- `companyPricePln → OUR RATE`
- `pkt ≡ mb` bez dowodu
- research dla **COMPOUND** / **UNKNOWN**
- Historical `authority=true` bez osobnego Owner GO
- KNR auto-write `catalogWorkId` poza Slice D / authority boundaries
- `git add -A` · `vercel deploy`
- drugi IK sequencer / drugi Owner Accept path / drugi refresh system (patrz **§2A**)

---

## 2A. MASTER CONNECTIVITY CONTRACT (OD-W0-GO)

> **Owner Decision:** **OD-W0-GO = GRANTED** (2026-08-28) — governance / documentation wave only.
> **NIE oznacza:** Production Verified · W3/W5/G2/G3 complete · auto-authorization implementacji fal W3–W6.
> **NIE zmienia:** historii commitów Orchestra · semantyki runtime API · APF · KV · production.

### 2A.1 Jedna oś wykonawcza (LOCKED)

```text
TenderDetailPage
  → IkOrchestraPageBridge
  → useIkOrchestra
  → ik-orchestra-engine  +  ik-orchestra-runtime
  → snapshot / ownerGate
  → IkEntryHost  +  Observation / Experience / Owner Gate UI
```

| Byt (dokładne symbole w repo) | Rola | NIE jest |
|-------------------------------|------|----------|
| `IkOrchestraPageBridge` | Page-level mount Orchestra; publikuje snapshot | Drugim Hostem |
| `useIkOrchestra` | React hook / runtime adapter sequencera | Osobnym silnikiem biznesowym |
| `ik-orchestra-engine` · `ik-orchestra-runtime` | Sync + async IK pipeline (Document→…→P8) | Chief orchestrator · APF |
| `ownerGate` (API na snapshotcie) | Centralny Owner execution surface (G1/G2) | Auto-Accept |
| `IkEntryHost` | **UI adapter / consumer** snapshotu | **IK sequencer** |
| Experience / EC / Observation | **Projekcja** stanu Orchestra | Drugim silnikiem IK |
| APF | Osobna, zamrożona policy plane | Owner Accept / G1/G2 |

**Zasada nadrzędna:** REUSE → CONNECT → VERIFY → CLOSE.
Nowa funkcja tylko po wykazaniu braku w audycie + węzeł Decision Tree + Orchestra seam + Owner + persist/recompute + Observation + SSOT + testy + Owner GO.

### 2A.2 Słownik statusów connectivity (osobny od legendy §0)

| Status | Znaczenie |
|--------|-----------|
| **CONNECTED** | Capability podpięta do Orchestra / Decision Tree / właściwego seam |
| **PARTIAL** | Część ścieżki podpięta; brakuje seam / Owner / refresh / PV |
| **GAP** | Brakuje wymaganej connectivity (nie mylić z „brak kodu domeny”) |
| **LEGACY-PARALLEL** | Istniejąca ścieżka równoległa; konwergencja = REUSE→CONNECT; **bez Owner GO nie usuwać** |
| **NOT PROVEN** | Brak dowodu test/PV / nieudowodniona produkcja |
| **BLOCKED** | Zablokowane governance / dependency / Owner WAIT |

**HARD:** **CONNECTED / IMPLEMENTED ≠ Production Verified.**
**HARD:** test harness GREEN ≠ prod PV. **HARD:** docs GO ≠ runtime complete.

### 2A.3 Parallel Paths Register + reguła konwergencji

| Path | Klasyfikacja | Convergence (TARGET) |
|------|--------------|----------------------|
| `runChiefOrchestrator` T1–T4 | **LEGACY-PARALLEL** | W3: Chief.start → Orchestra snapshot; T1–T4 remain LEGACY until OD-06 |
| Hub labor/material Accept (`IkLaborGapResearchPanel` / `ik-pricing-orchestrator`) | **LEGACY-PARALLEL** | Hub → `ownerGate` / approved Orchestra refresh seam |
| Legacy bid panel (`TenderBidProposalPanel` / bid calculator) | **LEGACY-PARALLEL** | W4+/G3: adapter z P7 — **nie** trzeci kalkulator |
| KNR-WC Hub Accept panels | **PARTIAL** | Orchestra PHASE 3 conditional + documented refresh |
| APF plane | **CONNECTED** (oddzielna płaszczyzna) | Overlay-only · **zakaz** Accept/persist w APF |

**Convergence rule:** **REUSE → CONNECT.**
**Nigdy** nie twórz równoległego Owner Accept / execution path.
**Nigdy** nie usuwaj LEGACY-PARALLEL bez explicit Owner GO.

### 2A.4 Hub integration rule

- Hub Accept **musi** konwergować na `ownerGate` **albo** zatwierdzony Orchestra refresh seam.
- `notifyIkPricingAccepted` / dual-bump pricing+Chief **sam w sobie NIE** jest równoważny pełnemu Orchestra refresh.
- Pełny refresh po Accept (Orchestra path): `bumpOrchestraAfterPricingAccept` + epochy (`laborRecalcEpoch` / `materialRecalcEpoch` / catalog·pkg reload) — patrz **§2A.6**.

### 2A.5 W0 governance clarification

| Fakt | Status |
|------|--------|
| Orchestra extract **już wylądował** w repo (W1 code history) | **IMPLEMENTED** (code fact) |
| **OD-W0-GO** | **GRANTED** — formalizuje kontrakt connectivity + autoryzuje **planowanie** kolejnych fal |
| Fale **W3–W6** (Chief→Orchestra, Hub converge, KNR-WC, OD-01..07, …) | **NOT auto-authorized** — każda fala wymaga własnego Owner GO |
| Retroactive IMPLEMENT GO dla historycznych commitów Orchestra / `3822acb` | **FORBIDDEN** — nie przepisywać historii |

Decision Tree DF: [`IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md`](./IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md) — W0 governance GO recorded; implementation waves remain gated.

### 2A.6 `refreshPhase` TARGET → istniejący refresh (zakaz drugiego systemu)

| TARGET (Decision Tree / docs) | CURRENT (repo — REUSE) |
|-------------------------------|-------------------------|
| `Orchestra.refreshPhase(...)` | **Nie** jako osobne public API o tej nazwie |
| | `bumpOrchestraAfterPricingAccept()` w `use-ik-orchestra.ts` |
| | + `laborRecalcEpoch` / `materialRecalcEpoch` / identity research epochs |
| | + catalog/pkg reload epochs na snapshot deps |

**ZAKAZ:** tworzenie drugiego refresh systemu / drugiego epoch bus / parallel `refreshPhase` engine.
**CONNECT only:** ewentualny cienki alias/export istniejącego bump+epoch — po osobnym Owner GO (nie w tej fali docs).

### 2A.7 G3 Final Bid boundary

- **Final Bid persistence = OUT OF P3 scope.**
- P7 = position-cost / bid **preparation** (read-only vs Final Bid persist).
- P8 = risk / decision preparation — **bez** auto Owner Accept Final Bid.
- G3 wymaga **osobnego Owner GO** (AUDIT → DF → GO) — **nie** startować w P3 / W0 docs wave.

### 2A.8 Agent Cold-Start Checklist (connectivity)

```text
1. Master SSOT (TEN PLIK) — §1 · §2 · §2A · §10 · §11.15 · §17
2. Decision Framework W0 — IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md
3. docs/AI/09_PRODUCTION_BASELINE.md + live version.json
4. Trace Orchestra: IkOrchestraPageBridge → useIkOrchestra → engine/runtime
5. Inspect existing ownerGate (G1/G2) + IkOwnerGateActionsPanel
6. Inspect refresh/epoch: bumpOrchestraAfterPricingAccept + recalc epochs
7. grep/search BEFORE create (REUSE MAP · orchestra/* · owner gate)
8. Classify: REUSE / CONNECT / VERIFY vs NEW (15-question gate z audytu W0)
9. Obtain explicit Owner GO for the wave
10. Only then implement — then TEST → VERIFY (≠ claim Production Verified)
```

**Jeżeli punkt 8 = NEW:** udokumentuj GAP + insertion seam + Decision Tree node + Orchestra + Owner + persist/recompute + Observation + SSOT + tests — **STOP** i czekaj na Owner GO.

---

## 3. Mapa dokumentów SSOT (ten zestaw)

| Dokument | Rola |
|----------|------|
| **TEN PLIK** | ★★ Master kontrakt IK — **najwyższy kontrakt** |
| [`IK-AI-OWNER-AUTHORITY-POLICY.md`](./IK-AI-OWNER-AUTHORITY-POLICY.md) | ★★ **AI Owner Authority** (ChatGPT Level A/B/C) · **pointer only** · nie zastępuje Master SSOT · Level A execute **NOT AUTHORIZED** · gate [`OD-IK-AI-OWNER-AUTHORITY-1-GATE.md`](./OD-IK-AI-OWNER-AUTHORITY-1-GATE.md) |
| [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) | ★★ **Latest session closeout** · A01 + A09 · cold-start · **nie** drugi kontrakt |
| [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) | Sesja Autonomy 05–08 · A08-P2 **CLOSED** · historyczny |
| [`INTELLIGENT-ESTIMATOR-ARCHITECTURE.md`](./INTELLIGENT-ESTIMATOR-ARCHITECTURE.md) | Warstwy + ścieżki plików |
| [`INTELLIGENT-ESTIMATOR-DATA-FLOW.md`](./INTELLIGENT-ESTIMATOR-DATA-FLOW.md) | LABOR / MATERIAL / Classification flows |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | Component → file → status → DO NOT DUPLICATE |
| [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md) | Tip · Tablica · HOLD/GAP (labor data) |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Cold-start ChatGPT + protokół Cursor |
| Tip UI/commit | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| Cold-start projekt | [`../AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md) |
| Entry procesu | [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) · Gate payroll |
| **IK AUTONOMY-08 P3** | [`IK-AUTONOMY-08-P3-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P3-DESIGN-FREEZE.md) · [`ARCH-REVIEW`](./IK-AUTONOMY-08-P3-ARCH-REVIEW.md) · impl **`3822acb`** · **P3 OPEN** |
| **IK-MIGRATION-01** | [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) · [`DESIGN-FREEZE`](./IK-MIGRATION-01-DESIGN-FREEZE.md) — P0–P9 **LOCKED / COMPLETE** |
| **IK Master Decision Tree (W0)** | [`IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md`](./IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md) — Orchestra · Identity · Chief LEGACY · **FROZEN** · **OD-W0-GO GRANTED** (governance) · W3–W6 **NOT** auto-authorized · **≠** Production Verified |
| KNR Expert DF | [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) · Slice A/B/C/D docs w tym katalogu |
| Historical Executed | `IK-HISTORICAL-EXECUTED-ATH-*` · Host Wiring · EC reveal VERIFY |
| Owner Map / Multi-Dwelling | `MULTI-DWELLING-*` · `MULTI-BOQ-*` · OPS Owner Map smoke |
| **IK Analysis Observability Projection** | [`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md) — Phases **1–4 CLOSED GREEN** · Phase **5 NOT AUTHORIZED** · Master **§13** · **§13.11** |

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
| **AUTONOMY-08 P3 Owner Gates** | **IMPLEMENTED** @ **`3822acb`** · harness **27 PASS / 0 FAIL** · **P3 OPEN** (epic) · **≠** cały G2 globalnie CLOSED |
| **AUTONOMY-08 epic** | **NOT CLOSED** |
| **G1 durable persist PV** | **PASS** (Paczka VII · LS OfferBoq · reload) |
| **★★ CHROBREGO (2026-08-28)** | **CURRENT CHECKPOINT** — §10.0 · §22 · tender `08df0363-…` |
| **CHROBREGO G1 AUTO-SAFE** | **CLOSED / PASS** · **22/22** · BEFORE **1/55** → AFTER **23/33** OK/AMBIGUOUS |
| **CHROBREGO G2 Labor m²** | **CLOSED / PASS** · LP **7/8/12/13/14** · OUR RATE BASE **22.90** · margin **20%** owner |
| **CHROBREGO LP48 mb** | **OPEN** — Owner classification · **NIE** stawka m² |
| **G2 material Accept PV** | **WAITING FOR NATURAL PROD CANDIDATE** · **STOP** (Chief OFF) |
| **G3 / Experience Phase 5** | **NOT STARTED** · **0** · **nie** sugeruj tylko dlatego, że G2 m² PASS |
| **KNR Slice A** | catalogBasis evidence · **PRODUCTION VERIFIED** (tip historia `93eb41be`) |
| **Historical Host Wiring** | `64f38479` · **PRODUCTION EXISTING** |
| **Historical EC reveal** | `b31169be` · **PRODUCTION VERIFIED** (2026-08-21) |
| **A01-S1 identity (LP4)** | **`3e4adfff`** · **FROZEN GREEN** |
| **A01-LP5 identity (LP5/LP10)** | **`f012d39a`** · **FROZEN GREEN** |
| **A01-LP5 catalog OPS** | **`cf802cbd`** · **PRODUCTION VERIFIED** |
| **A09-PACKAGE-S1 (G177)** | **`8ccb3e9b`** · **PRODUCTION VERIFIED GREEN** · **NOT identity** |
| Tip produkcji | **czytaj 09** + live `version.json` (**nie** hardcoduj tu na stałe bez aktualizacji) |

### 8.1 Owner Map — identity + PACKAGE (latest production)

**Identity registry (`WORK_RATE_IDENTITY_MAPPINGS`):** **4 Owner rows** — Wave-1 ×2 + A01-S1 + A01-LP5.

| Slice | workId / plane | Commit | Status |
|-------|----------------|--------|--------|
| **A01-S1** | LP4 → `cc-w2-oczyszczenie-podloza` (LABOR identity) | `3e4adfff` | **FROZEN GREEN** |
| **A01-LP5 identity** | LP5/LP10 → `cc-w2-impregnacja-biobojcza-m2` | `f012d39a` | **FROZEN GREEN** |
| **A01-LP5 catalog** | catalog seed OPS | `cf802cbd` | **PRODUCTION VERIFIED** |
| **A09 PACKAGE** | `cc-w2-scianki-dzialowe-gr-pakiet-m2` · costSplit 0.5/0.5 · **NO identity row** | `8ccb3e9b` | **PRODUCTION VERIFIED** · rate **PENDING_OWNER_INPUT** |

**Owner policy (FROZEN):**

- LP4 → oczyszczenie = **HIT** · LP5 → oczyszczenie = **MISS** · zmywanie = **MISS**
- LP5/LP10 → impregnacja biobójcza = **HIT** · gruntowanie = **MISS**
- A09 G177 = **PACKAGE catalog** · **NOT** LABOR host `p2b-scianka-gk-na-stelazu-m2` · **NOT** rate **118** · **NOT** G177 alias in identity registry

Handoff: [`IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md`](./IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md)

### 8.2 LIVE evidence — Historical EC (konkretny tender, nie globalny benchmark)

| Pole | Wartość |
|------|---------|
| Tender | **2026/BZP 00391783** (MOPS) |
| Prod UI | **2.66.113** (live tip) · evidence captured @ **2.66.103** |
| EC impl/PV milestone | **`b31169be`** (ancestor · ≠ live tip) |
| Ancestor deploy (EC capture) | **`6e501ab`** |
| Live tip deploy | **`63cb134`** |
| READY_FOR_EXPERTS | true |
| KNR | COMPLETED · withBasis=88 |
| Host Index | occurrences=**253** · sourceCount=**9** · **authority=false** |
| EC Historical | OBSERVED · EXACT=**3** · FAMILY=**48** · CONFLICT=**6** · MISS=**31** · skipped=**1** |
| PV | **PASS WITH GAPS** · Historical runtime errors=**0** |

**Nie** generalizuj tych liczb na cały IK / wszystkie przetargi.

---

## 9. NEXT

**Pierwsze pytanie cold-startu:** jaki jest **CURRENT NODE** w §10.0 — nie „co robić od początku?”.

Tylko **Owner GO** → **AUDIT** → DF → IMPLEMENT (gdy Decision Tree wymaga GO).

**★★ CHROBREGO CURRENT NODE (2026-08-28):**  
**`AFTER G2 LABOR m² ACCEPT — CLOSED/PASS — WAIT FOR OWNER GO`**  
(SSOT: **§10.0** — LP listy OPEN tylko tam; nie duplikuj tu).

Legalne następne gałęzie (wymagają Owner GO — AI **nie** wybiera sam):

| # | Gałąź | Status | Wymaga |
|---|--------|--------|--------|
| A | **LP48** Malowanie rur **mb** | **OPEN** | Owner **classification** · **NIE** wall-rate m² · **NIE** F1 catalog override na mb |
| B | **G1 OWNER_REVIEW** (18) | **OPEN** | Owner workId / identity per linia → §10.0 |
| C | **G1 NO_SAFE_EXISTING_WORK_ID** (15) | **OPEN** | Owner create/bind / HOLD → §10.0 |
| D | **G2 material** Accept PV | **WAIT** | natural candidate + Chief GO · **NIE** auto-start |
| E | **G3 Final Bid** | **NOT STARTED** | osobny Owner GO · **OUT OF P3** |
| F | **Experience Phase 5** | **NOT STARTED** | osobny Owner GO · **≠** auto po G2 m² |

**CLOSED — NIE POWTARZAĆ bez nowego Owner Decision Gate:**

- CHROBREGO F1 catalog-name (`unit===m2`) · F2 margin **20%** · Research m² · Candidate/Evidence m² · G2 Accept LP **7/8/12/13/14** · OUR RATE write dla `legacy-malowanie-m2|m2`
- Idempotent/no-op **≠** reopen gałęzi

**IK AUTONOMY-08 P2:** **COMPLETE / CLOSED**. **Nie** reopen.

**IK AUTONOMY-08 P3:** **IMPLEMENTED** @ **`3822acb`**. **P3 OPEN** (epic) — G1 PV **PASS** · **G2 Labor m² (CHROBREGO) CLOSED/PASS** · G2 material **WAIT**. **Nie** zamykaj całego P3/epic tylko dlatego, że m² PASS. **Nie** fabricuj candidate.

**IK-MIGRATION-01:** P0–P9 LOCKED — **nie** wracaj do „GO P1 entry shell” / „GO P2 Document Expert” jako next.

**Historical EC reveal slice:** **CLOSED / PRODUCTION VERIFIED** (`b31169be`) — **nie** otwieraj kolejnego gate bez nowego Owner GO.

Kandydaci poza CHROBREGO / A08 (post-A09):

| # | Gap | Status |
|---|-----|--------|
| 1 | **A09 Owner-priced rate** | **PENDING_OWNER_INPUT** — osobne GO |
| 2 | KNR full catalog / KL expansion | **PARTIAL / GAP** |
| 3 | KNR FACT → proposed Work → Owner Accept → Catalog → Slice D | **TARGET / GAP** — **no GO** |
| 4 | A03 unit resolution | **HOLD** |
| 5 | A07 evidence / CREATE | **HOLD** |
| 6 | A01-S2 zmywanie | **HOLD** |
| 7 | A02/A04/A05/A06/A08/A10 | **HOLD** — insufficient evidence |
| 8 | **TM-01 residual C1–C6** / **NEXT-EPIC C4–C5** · labor unit proof · Owner Map bulk (**≠** A08 blockers · qualify separately) | per audit · Owner GO |

**NIE** invent S10 / drugiego TenderModule / auto-Accept / global D=ON jako IK / REMOVE NG-10 / auto-start G3 po G2 m².

Latest continuity handoff (A01/A09 era): [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md).  
**CHROBREGO live checkpoint:** **§10.0 · §22** (ten plik).

---

## 10. Pełne drzewo IK (CURRENT · source-verified)

### 10.0 ★★ CURRENT DECISION TREE — CHROBREGO (2026-08-28)

> **SSOT continuity node for case CHROBREGO.**  
> Architecture/module tree poniżej (§10 body) = **mapa systemu** — **nie** mylić z tym drzewem decyzji case'a.  
> **Jeden** Decision Tree case'a = ten podrozdział. **Nie** twórz drugiego.

| Pole | Wartość (source-verified 2026-08-28) |
|------|--------------------------------------|
| **Tender (pipeline)** | `08df0363-7b22-e462-ab56-940001283cba` |
| **OCDS** | `ocds-148610-6f859612-6631-426b-83fc-830bfec1c888` |
| **BZP** | `2026/BZP 00408278/01` · Chrobrego 34a |
| **workId (paint m²)** | `legacy-malowanie-m2` · catalog `namePl` = `Malowanie (m2)` |
| **CURRENT NODE** | **`AFTER G2 LABOR m² ACCEPT — CLOSED/PASS — WAIT FOR OWNER GO`** |
| **PRIMARY CONTRACT** | **Decision Tree (§10.0) = PRIMARY CONTINUITY CONTRACT** · HISTORY/LEGACY ≠ CURRENT · chat memory ≠ SSOT |
| **Session artefacts** | `.tmp-chrobrego-g1-audit/*` — evidence only · **nie** drugi SSOT / nie drugi Decision Tree |

```text
CHROBREGO
│
├── G1 Identity
│   └── AUTO_SAFE 22
│       └── CLOSED / PASS
│           · 22 overrides · 1× durable G1 persist (LS OfferBoq)
│           · BEFORE: 1 OK / 55 AMBIGUOUS
│           · AFTER:  23 OK / 33 AMBIGUOUS
│           · lp21 ALREADY_OK (pre-batch)
│
├── G2 Labor
│   │
│   ├── Malowanie m²  (researchKey legacy-malowanie-m2|m2)
│   │   ├── F1 catalog name (unit===m2 only)     → CLOSED
│   │   │     query namePl = "Malowanie (m2)" · mb = BOQ description (bez F1)
│   │   │     tests: namepl-f1 12/0 · p4-labor-expert 32/0
│   │   ├── Owner margin 20% (wroclaw+dolnyslask) → CLOSED · source=owner
│   │   ├── Research (QUALIFIED=10 · PARSE_EMPTY=0 · margin SET) → CLOSED
│   │   ├── Candidate (5 LP · CANDIDATE_OWNER_ACCEPT_REQUIRED) → CLOSED
│   │   ├── Evidence (2 obs / candidate)           → CLOSED
│   │   └── G2 Owner Accept LP 7,8,12,13,14      → CLOSED / PASS
│   │       · LP7 = ACCEPTED · LP8/12/13/14 = IDEMPOTENT_NOOP
│   │       · OUR RATE BASE = 22.90 PLN · sourceType=ACCEPT · lookup=CURRENT
│   │       · SELL/display = 27.48 PLN (≠ OUR RATE) · margin 20%
│   │       · post: candidates=0 · CURRENT_HIT ×5
│   │       · refreshPhase=1 · laborRecalcEpoch=1 · G3=0 · Experience=0
│   │
│   └── Malowanie rur mb / LP48
│       └── OPEN
│           · unit=mb · "Malowanie rur stalowych"
│           · RESEARCH_GAP / PARSE_EMPTY / scope · candidate=0 · Accept=0
│           · NIE F1 catalog override na mb · NIE stawka ścian/sufitów m²
│           · wymaga osobnej Owner CLASSIFICATION decision
│
├── G1 OWNER_REVIEW
│   └── 18 → OPEN
│       · LP: 3,6,15,22,26,27,28,29,31,35,36,38,40,41,42,44,46,47
│
├── G1 NO_SAFE_EXISTING_WORK_ID
│   └── 15 → OPEN
│       · LP: 1,4,5,10,16,17,18,20,23,24,25,32,33,39,43
│
├── G2 Material Accept PV (A08-P3 global)
│   └── WAIT · NIE auto-start · wymaga osobnego Owner GO (+ Chief)
│
├── G3 Final Bid
│   └── NOT STARTED · 0
│
└── Experience / Phase 5
    └── NOT STARTED · 0 · NIE auto-start po G2 m²
```

**CLOSED BRANCH PROTECTION (CHROBREGO m²):**

Nie wolno bez **nowego** Owner Decision Gate: ponownie F1 · ponownie margin 20% · ponownie research m² · ponownie te same candidate · ponownie G2 Accept LP 7/8/12/13/14 · ponownie OUR RATE write.  
**Idempotent/no-op ≠ reopen.**

**Owner Decision Contract (reminder):** Owner = jedyne źródło workId (review) · classification · marginPct · Accept · przejść wymagających GO. AI = analyze / diagnose / propose / WHAT-IF — **nie** invent decision / margin / auto-Accept / bypass gate.

### Architecture / module map (system — **nie** Decision Tree case'a)

> Poniższe drzewo = mapa modułów IK. **CURRENT DECISION TREE case'a** = wyłącznie **§10.0** powyżej.

```text
INTELLIGENT ESTIMATOR
│
├── ENTRY / PAGE                   → TenderDetailPage · flags · IkOrchestraPageBridge (mount)
├── ORCHESTRA (W1/W4/W5) ★ SSOT sequencer
│   → useIkOrchestra · ik-orchestra-engine · ik-orchestra-runtime · ownerGate
│   ├── sync pipeline              → Document→KNR→Identity→Class→Composite→P7→P8
│   ├── async P5/P6                → labor/material experts + research-on-MISS
│   ├── owner action queue         → ik-owner-action-queue (read model)
│   ├── owner gates G1/G2          → IkOwnerGateActionsPanel · g1/g2 Accept/Reject/Recalculate
│   └── identity persist glue      → runGatedIdentityPersist → attachOfferBoqToDwelling (LS)
├── HOST / UI ADAPTER              → IkEntryHost · IkAnalysisSurface (consumer snapshotu · NIE sequencer)
├── CHIEF (wspólny system IK)      → chief-session + chief-orchestrator · P4 wiring · material G2 gate · LEGACY-PARALLEL vs Orchestra (W3 TARGET)
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
├── OBSERVATION (Experience SSOT)  → buildAnalysisObservation · analysis-observation.ts  [Phases 1–2 CLOSED]
├── LIVE VISUALIZATION             → LiveVisualizationView · READ-ONLY consumer Observation  [Phase 3 CLOSED]
├── EXPERT CONVERSATION / TEAM UI  → ExpertConversationSurface + ik-entry-conversation + overlay  [Phase 4 CLOSED]
├── OWNER ACTION QUEUE             → ik-owner-action-queue · IkOwnerActionQueueNavigate  [CURRENT]
├── IK EXPERIENCE (remaining §13)  → ETA · Final Summary · hints Variant B  [Phase 5 NOT AUTHORIZED]
└── BID / OFFER / PDF              → tenders-bid-calculator · OfferBoq · tender-bid-package-pdf
```

### 10.1 Przepływ runtime (CURRENT)

```text
PRZETARG
  → TendersModule
  → TenderDetailPage
       → useHistoricalExecutedHostIndex(jobs)     [gdy IK ON]
       → useChiefOrchestratorSession              [Chief / D / P4 · LEGACY-PARALLEL]
       → IkOrchestraPageBridge
            → useIkOrchestra
                 → P2: runIkNg02IngestBridge → runIkDocumentExpert
                 → Owner Map gate (documentToDwelling / allMapped) gdy multi
                 → runIkKnrExpert(+ historicalIndex) → applyOwnerKnrMapping (Slice D)
                 → KL-3 HOST lookup-only (side-channel; nie conversation authority)
                 → runIkIdentityPhase (OfferBoq work identity · persist gated W2)
                 → runIkMasterBoqClassification (BEFORE research — gate)
                 → runIkMasterBoqIdentityCoverage (optional flag)
                 → P5/P6: runIkLabor/Material (async · orchestra runtime)
                 → P5∧P6: runIkCompositeBothHold → computePositionCost (F5)
                 → P7: runIkP7PositionCostBid
                 → P8: runIkP8RiskDecision(chiefSession)
                 → ownerGate (G1/G2) + bumpOrchestraAfterPricingAccept / epochs
       → IkEntryHost (UI adapter — NIE sequencer)
            → buildAnalysisObservation(orchestra) → LiveVisualizationView
            → buildIkEntryConversationViewModel → overlayObservationStatusesOnConversationVm
            → ExpertConversationSurface vm={vm}
            → IkOwnerGateActionsPanel / IkOwnerActionQueueNavigate
  → Bid / Offer / PDF (istniejący stack Hub/Detail — nie drugi silnik · G3 OUT OF P3)
```

**Flagi:** `src/lib/intelligent-estimator/ik-entry-flag.ts` — dostęp IK + P5–P8 AUTO/OFF/ON · Research **CONDITIONAL**.
Shell defaults w `IkEntryHost`: `IK_ENTRY_SHELL_* = false` (AUTO_INGEST / EXECUTE_RESEARCH / RUN_RATE_EXPERTS / IDENTITY_COVERAGE).
**Connectivity SSOT:** §2A — Orchestra = single sequencer · Host = adapter · CONNECTED ≠ Production Verified.

---

## 11. Karty elementów (SOURCE-VERIFIED)

### 11.1 Chief

| | |
|--|--|
| **Pliki** | `src/lib/chief-session/*` · `src/lib/chief-orchestrator/*` · `src/lib/chief-dossier-ui/*` · `src/lib/chief-wire-adapters/*` · `src/app/hooks/useChiefOrchestratorSession.ts` |
| **Rola** | Case / Task / dossier / lifecycle / prezentacja stanu zespołu |
| **Wywołuje** | TenderDetailPage (właściciel sesji) → prop do `IkEntryHost` / P8 · **material G2:** `chiefMaterialAvailable` w `use-ik-orchestra` |
| **NIE** | Drugi Host · flip `expertAiDecydentEnabled` jako IK · auto Final Bid · **nie** blokuje P6 research gdy OFF |
| **Status** | **PRODUCTION EXISTING** · wiring P4 **PARTIAL** (`ikChiefWiringEnabled=false` on prod) · material G2 Accept **requires** Chief session |

### 11.2 Host / UI Adapter (`IkEntryHost`)

| | |
|--|--|
| **Pliki** | `src/app/intelligent-estimator/IkEntryHost.tsx` · `ik-entry-flag.ts` · `ik-entry-p2-ingest-latch.ts` · `ik-entry-conversation.ts` |
| **Rola** | **UI adapter / consumer** snapshotu Orchestra — EC surface · Live Viz · Owner panels · data attrs observability · **NIE** IK sequencer |
| **NIE** | Drugi Orchestra · sekwencjonowanie ekspertów (to robi `useIkOrchestra`) · nowy Catalog · auto research (shell OFF) · drugi Chief |
| **Status** | **PRODUCTION EXISTING** · Host Historical + EC reveal **PRODUCTION VERIFIED** (slice 2026-08-21) · connectivity: **CONNECTED** as adapter (**≠** Production Verified całego IK) |

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

### 11.13 Expert Conversation / Team UI (CURRENT foundation)

| | |
|--|--|
| **Pliki** | `src/app/expert-conversation/ExpertConversationSurface.tsx` · `ExpertConversationStepCard.tsx` · `ik-entry-conversation.ts` · `ik-conversation-event.ts` · `ik-knr-conversation.ts` · `IkExpertRoomChrome.tsx` · `expert-conversation-ui.ts` |
| **Rola** | Prezentacja **rzeczywistego** VM pipeline (Document / KNR / Labor / Material / Classification / Composite / P7 / P8 / Chief) |
| **Fix 2026-08-21** | structural vs content signature — late Historical **nie** resetuje progressive reveal |
| **NIE** | Fikcyjne wiadomości bez faktów · osobny chat store · LLM per ekspert · drugi orchestrator |
| **Status** | Presentation **PRODUCTION EXISTING** · Historical EC copy **PRODUCTION VERIFIED** · pełny Team Conversation + Live Visualization + ETA + Final Summary = **TARGET** (§13) — **nie** oznaczać jako CURRENT |

**Docelowa warstwa Experience:** **§13** (CURRENT / PARTIAL / GAP / TARGET). Experience **nie** jest osobnym systemem IK.

### 11.14 Bid / Offer / PDF

| | |
|--|--|
| **Pliki** | `tenders-bid-calculator.ts` · `tender-offer-boq*.ts` · `tender-bid-package-pdf.ts` → `exportTenderBidPackagePdf` |
| **Status** | **PRODUCTION EXISTING** · REUSE · **nie** nowy PDF engine |

### 11.15 Orchestra (`useIkOrchestra` · W1/W4/W5) — ★ single IK sequencer

| | |
|--|--|
| **Pliki** | `src/lib/intelligent-estimator/orchestra/*` · hook `use-ik-orchestra.ts` · engine `ik-orchestra-engine.ts` · runtime `ik-orchestra-runtime.ts` · bridge `IkOrchestraPageBridge.tsx` |
| **Rola** | **SSOT runtime sequencer** (jedyny IK execution path) — sync core + async P5/P6 settle · snapshot dla Observation/Host · **`ownerGate` API** · refresh via `bumpOrchestraAfterPricingAccept` + epochs (**nie** drugi refresh system) |
| **Wywołuje** | `runIkDocumentExpert` → KNR → `runIkIdentityPhase` → classification → P5/P6 async → composite → P7 → P8 |
| **Wywoływany przez** | `IkOrchestraPageBridge` (page mount) · `IkOwnerGateActionsPanel` (via `ownerGate`) · `IkEntryHost` = **consumer** snapshotu (adapter) |
| **Stan** | `manualOverrides[]` (G1) · reject keys G1/G2 · labor/material recalc epochs · `chiefMaterialAvailable` |
| **Persistence** | G1 → `runGatedIdentityPersist` (LS OfferBoq) · G2 labor → Work Catalog via Accept · G2 material → Price Memory via Accept |
| **Flagi** | P5/P6 executeResearch · identity coverage · P7/P8 E2E — z `ik-entry-flag.ts` |
| **Status** | **IMPLEMENTED** @ orchestra extract commits · **PRODUCTION EXISTING** @ **`3822acb`** (P3 gates) |

**Chief ≠ Orchestra.** Chief = dossier/session/advisory. Orchestra = IK expert pipeline + Owner Gate execution surface.

### 11.16 Owner Gates — G1 Identity · G2 Price (A08-P3)

| | |
|--|--|
| **UI** | `src/app/intelligent-estimator/IkOwnerGateActionsPanel.tsx` · queue nav `IkOwnerActionQueueNavigate.tsx` |
| **Lib** | `ik-owner-gate-actions.ts` · `ik-owner-gate-labor-idem.ts` · queue `ik-owner-action-queue.ts` · deeplink `ik-owner-action-deeplink.ts` |
| **Harness** | `scripts/test-ik-autonomy-08-p3-owner-gates.mjs` — **27 PASS / 0 FAIL** (local, 2026-08-26) |

#### G1 — Identity Gate

| Akcja | Mechanizm | Persist | Prod PV |
|-------|-----------|---------|---------|
| **Accept** | `OwnerManualIdentityOverride` + `runGatedIdentityPersist` | LS `attachOfferBoqToDwelling` · `matchMethod=manual` | **PASS** (durable reload) |
| **Edit** | upsert manual override | session until Accept persist | **IMPLEMENTED** |
| **Reject** | `g1RejectedKeys` session Set | none | **NOT VERIFIED** (no blocker fixture) |
| **Research Again** | labor gap panel / identity recalc epoch | none direct | **NOT VERIFIED** |

#### G2 — Labor Accept

| Warunek queue | `rateStatus === CANDIDATE_OWNER_ACCEPT_REQUIRED` **AND** `row.candidate` |
| Accept | `acceptIkLaborResearchAndNotifyIdempotent` → Work Catalog OUR RATE |
| Reject / Recalculate | session keys + recalc epoch → re-run P5 |
| Chief | **NOT required** |
| Prod PV | **CHROBREGO m² CLOSED/PASS** (2026-08-28 · LP 7/8/12/13/14 · OUR RATE 22.90) · **≠** reopen · material G2 nadal WAIT · inne tendery: case-by-case |

#### G2 — Material Accept

| Warunek queue | `priceStatus === CANDIDATE_OWNER_ACCEPT_REQUIRED` **AND** `row.candidate` |
| Accept | `acceptIkMaterialResearchCandidate` — **requires** `chiefMaterialAvailable` |
| Reject | **allowed** with Chief OFF |
| Recalculate | disabled UI when Chief OFF |
| Chief OFF (`ikChiefWiringEnabled=false`) | blocks **Accept/Recalculate only** · **NOT** P6 research/candidate generation |
| Prod PV | **WAITING FOR NATURAL PROD CANDIDATE** + Chief GO for Accept step |

**Research ≠ Accept.** Owner Gate never auto-Accepts research candidates.

### 11.17 KNR ↔ Work Catalog Identity Bridge (P3/P4)

| | |
|--|--|
| **Pliki** | `knr-wc-identity-bridge*.ts` · UI `IkKnrWcIdentity*` panels · orchestra seam `ik-knr-wc-p4-trust-seam.ts` |
| **Rola** | Owner-gated WC CREATE from KNR proposals · P4 trusted identity seam when flag ON |
| **KV** | proposals cache · **NOT** runtime Owner Gate persist |
| **Status** | P3 WC CREATE **CLOSED/PV** · P4 flag **ON** on prod (separate from A08-P3 G2) |

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
| Conversation | `expert-conversation/*` | VM only | Host / Hub | PRODUCTION EXISTING (foundation) | ❌ chat store / LLM-per-expert |
| IK Experience (TARGET) | §13 Master SSOT | projekcja pipeline | — | **TARGET / PARTIAL** | ❌ storytelling engine · drugi IK |
| Bid / Offer | bid-calculator · OfferBoq | — | Hub / P7 | KEEP | ❌ trzeci PLN |
| PDF | `tender-bid-package-pdf.ts` | — | DetailPanel | PRODUCTION EXISTING | ❌ nowy PDF engine |
| Cloud sync | `cloud-sync.ts` | Supabase KV | app | CORE LOCK | ❌ casual change |

Pełniejsza tabela historyczna: [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) — **uzupełnia**, nie zastępuje Master.

---

## 13. IK ANALYSIS EXPERIENCE — Team Conversation + Live Visualization

```text
════════════════════════════════════════════════════════
FINALNY IK ≠ tylko silnik kosztorysu.
FINALNY IK = JEDEN ZESPÓŁ + RZECZYWISTA PRACA WIDOCZNA DLA OWNERA
             W CZASIE ANALIZY + WYJAŚNIENIE WYNIKU PO ZAKOŃCZENIU.

Team Conversation + Live Visualization
  = EXPERIENCE / OBSERVABILITY nad istniejącym IK runtime.
  ≠ osobny system IK.
  ≠ storytelling engine.
  ≠ LLM per expert „na pokaz”.

DESIGN FREEZE (projekcja):
  IK-ANALYSIS-OBSERVABILITY-PROJECTION-01
  Phases 1–4 = CLOSED / PRODUCTION VERIFIED GREEN @ c1b3ad7d
  Phase 5 (ETA · Final Wrap-up · hints Variant B) = NOT AUTHORIZED
════════════════════════════════════════════════════════
```

**DF SSOT (kontrakty Observation / Progress / ETA / Wrap-up):**
[`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md)

### 13.0 Architecture rule (HARD)

```text
REAL IK PIPELINE (Chief → IkEntryHost → Experts → SSOT/engines)
        ↓
ANALYSIS STATE / EVENTS / OBSERVABILITY  (projekcja faktów)
        ↓
 ┌──────┴────────────────────────┐
 ▼                               ▼
TEAM CONVERSATION          LIVE VISUALIZATION
(+ Progress / ETA)         (+ stage / expert / ops)
        ↓
FINAL ANALYSIS SUMMARY
  · difficulty · confidence · findings
  · „dlaczego taka cena?” · Chief wrap-up
```

**ZAKAZ:** niezależny generator rozmowy · fikcyjne postępy · drugi event bus „na UX” bez projekcji runtime · budowa drugiego kalkulatora ceny „dla wyjaśnienia”.

**REUSE wyjaśnienia ceny:** Position Cost (F5) → Composite → P7 → Bid / Offer / istniejący explainability — **NIE DRUGI ENGINE**.

### 13.1 Docelowy UX startu analizy (TARGET)

```text
Owner otwiera konkretny przetarg
  → klika „Analizuj przetarg” (lub równoważny CTA startu IK)
  → Chief przejmuje case
  → Orchestrator (IkEntryHost) uruchamia pipeline
  → eksperci wykonują RZECZYWISTĄ pracę
  → UI NATYCHMIAST pokazuje Team Conversation + Live Visualization
```

Użytkownik **nie** powinien czekać na pustym ekranie.
**CURRENT note:** start analysis jest dziś wpleciony w `IkEntryHost` / flagi / pipeline (niekoniecznie jeden przycisk o tej etykiecie) — pełny „Analizuj przetarg → live dual surface” = **TARGET / PARTIAL**.

### 13.2 CURRENT (source-verified — 2026-08-24 · post Phase 4)

| Element | Dowód w source | Status |
|---------|----------------|--------|
| `AnalysisObservation` / `buildAnalysisObservation` | `analysis-observation.ts` | **PRODUCTION VERIFIED** (Phases 1–2) |
| Observation = SSOT status/progress | stage weights · `overallStatus` · `progress` | **PRODUCTION VERIFIED** |
| `LiveVisualizationView` | `LiveVisualizationView.tsx` · READ-ONLY `observation` prop | **PRODUCTION VERIFIED** (Phase 3) |
| Observation → EC status bridge | `mapObservationStatusToEcStepStatus` · `resolveObservationStageIdForEcStep` | **PRODUCTION VERIFIED** (Phase 4) |
| Pure overlay VM | `overlayObservationStatusesOnConversationVm` | **PRODUCTION VERIFIED** (Phase 4) |
| `ExpertConversationSurface` | progressive reveal · Skip/Continue · reduced-motion | **CURRENT** |
| `buildIkEntryConversationViewModel` | `ik-entry-conversation.ts` — copy / sourceRef / messages | **CURRENT** (legacy builder; **not** final status authority) |
| Truth filter / `IkConversationEvent` | `ik-conversation-event.ts` · `sourceRef` · `done`→`hold` | **CURRENT** |
| Actorzy PL (Chief / Document / Labor / Material / …) | `expert-conversation-ui` labels | **CURRENT** |
| `IkEntryHost` montuje Experience stack | `LiveVisualizationView` → `IkOwnerActionQueueNavigate` → `ExpertConversationSurface vm={vm}` | **PRODUCTION VERIFIED** (Phase 3–4) |
| Chief session + orchestrator | `useChiefOrchestratorSession` · `chief-*` | **CURRENT** |
| Pipeline stages w Orchestra | Document → KNR → Identity → Class → P5/P6 → Composite → P7 → P8 | **CURRENT** (`ik-orchestra-engine.ts`) |
| KNR conversation copy | `ik-knr-conversation.ts` | **CURRENT** |
| Owner Action Queue | `ik-owner-action-queue.ts` · deep links | **CURRENT** |
| Historical EC late-update (no reveal reset) | structural vs content signature | **PRODUCTION VERIFIED** (slice) |
| Variant A hints | `conversationHints: []` — **no populate** | **FROZEN** (Phase 4) |

### 13.3 PARTIAL (post Phase 4)

| Element | Co jest | Czego brakuje |
|---------|---------|---------------|
| Team-like conversation | Step cards · Observation-driven status overlay · pipeline-fact copy | Pełny „dialog zespołu” Chief↔eksperci · hints Variant B |
| Observability | `AnalysisObservation` SSOT · Live Viz · EC status bridge | Unified **event bus** (zabroniony) · timestamps/duration engine |
| Progress | Observation `progress` · Live Viz primary surface | Dynamic ETA · Final wrap-up progress copy w Conversation |
| Final wrap-up | Fazy `ready` / `blocked` w EC + Observation terminal states | Pełny FINAL STATE UX (Phase 5) |
| Explainability ceny | F5 / Composite / P7 / Bid stack (istniejący) | Zunifikowany Experience „Dlaczego taka cena?” panel |

### 13.4 GAP (nie udawać CURRENT)

| Gap | Opis |
|-----|------|
| Dynamic ETA | Brak dynamicznego ETA do końca pełnej analizy IK (Phase 5) |
| Full Team Conversation script | Brak pełnego wrap-up narracyjnego · hints populate (Variant B) |
| Final Analysis Summary | Brak kompletnego final UX: czas · difficulty · confidence · findings · Chief close (Phase 5) |
| „Dlaczego taka cena?” (IK Experience) | Brak zintegrowanego final explanation **w warstwie Experience** (silniki istnieją) |
| „Czy było łatwo?” | Brak human/light difficulty commentary opartego wyłącznie o metryki pipeline |
| **Phase 5 overall** | ETA · Final engine · findings migration · timestamps — **NOT AUTHORIZED** |

### 13.5 TARGET — Live Visualization

Docelowa wizualizacja (projekcja **istniejących** warstw IK — **nie** invent nowych ekspertów):

- overall progress %
- completed / active / waiting stages
- active experts · current operation · completed operations
- warnings · findings · bottlenecks
- **dynamic ETA** (szacunek; reaguje na postęp, pozostałe zadania, blokady)

**Domeny / stages (mapowanie do CURRENT modules — nie nowe role):**

| Viz domain | Mapuje na CURRENT |
|------------|-------------------|
| DOCUMENTS | Document Expert / P2 / NG-02 |
| BOQ | OfferBoq / Multi-BOQ |
| OWNER MAP | Multi-Dwelling / PackageGate |
| KNR | KNR Expert + Historical evidence |
| CLASSIFICATION | Classification Gate |
| LABOR | Labor Expert / Work Catalog |
| MATERIAL | Material Expert / Price Memory |
| COMPOSITE | Composite BOTH_HOLD |
| POSITION COST | F5 `computePositionCost` |
| VALIDATION | Validation Expert / P8 |
| RISK | P8 risk decision |
| BID | P7 / Bid / Offer / PDF stack |

### 13.6 TARGET — Team Conversation

Wygląda jak współpraca prawdziwego zespołu. **Przykłady UX (nie seed fikcyjnych wiadomości w kodzie):**

```text
Chief:     „Mamy już zakres robót. Sprawdźmy teraz pozycje KNR.”
KNR:       „Mam kilka możliwych dopasowań. Jedno wymaga weryfikacji.”
Labor:     „Dla tej pozycji nie mamy jeszcze zaakceptowanej stawki.”
Material:  „Cena materiału jest wyższa od historycznej. Sprawdzam źródła.”
Chief:     „Nie zgadujemy. Oznaczamy jako wymagające decyzji Ownera.”
```

**HARD:** treść = projekcja rzeczywistych eventów / raportów / stanów.
**ZAKAZ:** LLM per expert tylko „żeby było gadanie” · fake progress.

### 13.7 TARGET — ETA

```text
„Szacowany czas do zakończenia analizy”
```

- dynamiczny szacunek (nie gwarancja)
- reaguje na postęp, pozostałe zadania, blokady, aktywność pipeline
- **Status:** **TARGET / GAP** · kontrakt **FROZEN** w DF Observability Projection · **`eta = null` ⇒ „Szacowanie czasu…”** · Chief T1–T6 **NIE** primary
- **IMPLEMENT:** **NOT AUTHORIZED** bez osobnego Owner GO po ARCH REVIEW

### 13.7a AnalysisObservation (FROZEN pointer)

Kanoniczny model projekcji (`AnalysisObservation` · stage weights · timing stamps · Final Wrap-up · PriceDrivers · Difficulty) = **FROZEN** w DF:

[`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md) §5–§14

**PRIMARY SSOT statusu/progress:** `buildAnalysisObservation(orchestra)` → `AnalysisObservation`.
**Consumers (READ-ONLY):** Live Visualization · Team Conversation status overlay.
**Conversation copy/messages:** `buildIkEntryConversationViewModel` — **presentation only**; final step status = Observation bridge (`overlayObservationStatusesOnConversationVm`).

**Phase 4 bridge (FROZEN · prod):**

| Observation | EC presentation |
|-------------|-----------------|
| `pending` | `pending` |
| `running` | `active` |
| `done` | `done` |
| `partial` | `partial` |
| `blocked` | `blocked` |
| `hold` | `hold` |
| `failed` | `gap` |

**MUST:** Observation **nie** dostaje `active`/`gap` · `skipped` **nie** pochodzi z Observation · Flag-OFF → `overallStatus` bridge · `DWELLING_MAP_*` → `boq` · Variant A `conversationHints=[]`.

### 13.8 TARGET — Final Analysis Experience

Po zakończeniu kosztorysowania UI **nie** kończy się na „Analiza zakończona.”

Team Conversation + Live Visualization → **FINAL STATE**. Chief zamyka pracę zespołu.

Owner docelowo widzi m.in.:

```text
🎉 ANALIZA ZAKOŃCZONA
- czas analizy
- liczba przeanalizowanych pozycji
- poziom trudności („czy było łatwo?” — oparte o metryki, nie losowy AI)
- confidence / jakość wyniku
- liczba problemów · decyzji · findings
- najtrudniejsze elementy · główne czynniki ceny
- DLACZEGO końcowa cena jest właśnie taka
- etapy łatwe vs trudne · gdzie eksperci pracowali najwięcej
- końcowe podsumowanie Chief
```

#### „Dlaczego taka cena?” (KLUCZOWE)

Owner rozumie wartość kosztorysu przez czynniki oparte o **istniejący** łańcuch:

```text
Position Cost (F5) → Composite → P7 → Bid / Offer
(+ materiały · robocizna · sprzęt · zakres · dokumentacja
 · technologia · nietypowe pozycje · ryzyka · rynek
 · brak danych / HOLD · decyzje Ownera)
```

**NIE BUDUJEMY DRUGIEGO ENGINE.**

#### „Czy było łatwo?”

Profesjonalne + żywe + lekkie — **zawsze** z metryk pipeline (czas stage'y, konflikty KNR, MISS research, HOLD count…).
**ZAKAZ:** losowy komentarz AI.

### 13.9 OWNER AUTHORITY (Experience nie zmienia authority)

IK Experience może: analizować · proponować · porównywać · wyjaśniać · wskazywać ryzyko · rekomendować.
**NIE** przejmuje: OUR RATE · Accept · KNR mapping boundaries · Final Bid · Historical authority.

### 13.10 Matrix — Experience layer

| Capability | CURRENT | PARTIAL | GAP | TARGET |
|------------|:-------:|:-------:|:---:|:------:|
| AnalysisObservation SSOT | ✅ | | | |
| Live Visualization (READ-ONLY) | ✅ | | | |
| Observation → EC status overlay | ✅ | | | |
| ExpertConversationSurface (truth VM) | ✅ | | | |
| Pipeline-fact steps / actors | ✅ | | | |
| Progressive reveal (structural/content) | ✅ | | | |
| Chief + Host orchestration | ✅ | | | |
| Owner Action Queue navigate | ✅ | | | |
| Full Team Conversation (live dialog + hints B) | | ◐ | | ★ |
| Dynamic ETA | | | ❌ | ★ |
| Final Analysis Summary | | ◐ phases | ❌ full | ★ |
| Price explanation UX (Experience) | | stack exists | ❌ unified | ★ |
| Difficulty commentary (metric-based) | | | ❌ | ★ |
| **Observability Projection Phase 5** | | | | **NOT AUTHORIZED** |

**Gate:** Phases **1–4 CLOSED GREEN** @ **`c1b3ad7d`** · Phase **5 NOT AUTHORIZED** · Variant B / ETA / Final engine = osobny Owner GO.

### 13.11 Observability Projection — Phase history (CLOSED)

| Phase | Scope | Commit (tip) | Status |
|-------|-------|--------------|--------|
| **1–2** | `AnalysisObservation` · status/progress SSOT · `buildAnalysisObservation` | `b56f3d43` | **CLOSED / PRODUCTION VERIFIED** |
| **3** | `LiveVisualizationView` · READ-ONLY consumer | `b56f3d43` | **CLOSED / PRODUCTION VERIFIED** |
| **4** | Team Conversation status overlay · bridge · Host wiring · P4 tests | **`c1b3ad7d`** | **CLOSED / PRODUCTION VERIFIED** |
| **5** | ETA · Final Wrap-up · hints populate · timestamps | — | **NOT AUTHORIZED** |

**Phase 4 pliki (exact scope):** `analysis-observation.ts` (unchanged) · `ik-entry-conversation.ts` (bridge) · `IkEntryHost.tsx` (wiring) · `scripts/test-ik-analysis-observability-projection-01-p4-team-conversation.mjs`.

**Tests @ Phase 4 close:** P4 **78/78** · P12 **91/91** · P3 **81/81** · build **PASS**.

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

## 17. COLD START — NEW GPT / NEW CURSOR AGENT (obowiązkowe)

```text
CHECKPOINT (2026-08-28 · CHROBREGO CURRENT + OD-W0-GO):
  ★★ FIRST: CURRENT DECISION TREE = §10.0 (CHROBREGO)
  ★★ CURRENT NODE = AFTER G2 LABOR m² ACCEPT — CLOSED/PASS — WAIT FOR OWNER GO
  Decision Tree = PRIMARY CONTINUITY CONTRACT (header · §10.0 · §22)
  §22-LEGACY / HISTORY WAIT ≠ CURRENT · chat history ≠ SSOT (przy sprzeczności: zgłoś, nie zgaduj)
  Master Connectivity Contract = §2A ACTIVE · OD-W0-GO GRANTED (governance only)
  Orchestra = single IK sequencer (IkOrchestraPageBridge → useIkOrchestra → engine/runtime)
  IkEntryHost = UI adapter/consumer — NOT sequencer
  A08-P3 IMPLEMENTED · P3 OPEN (epic) · G1 PV PASS
  CHROBREGO: G1 AUTO-SAFE 22 CLOSED · G2 Labor m² CLOSED/PASS · LP48 OPEN
  G2 material WAIT · G3 / Experience Phase 5 NOT STARTED
  Tip UI/commit = docs/AI/09_PRODUCTION_BASELINE.md + live version.json (nie hardcoduj tu)
  F5 MARGIN = CLOSED / PRODUCTION VERIFIED GREEN (ancestor) · Obs Phases 1–4 CLOSED
  Phase 5 Experience NOT AUTHORIZED · G3 Final Bid OUT OF P3 · AUTONOMY-08 epic NOT CLOSED
  W3–W6 connectivity waves NOT auto-authorized · CONNECTED ≠ Production Verified
```

### COLD START PROCEDURE (obowiązkowa kolejność)

Nowy agent (Cursor / ChatGPT) **MUSI**:

```text
1. Przeczytaj TEN Master SSOT (całość) — zwłaszcza DECISION TREE primacy (header) + §10.0 + §22
2. Ustal CURRENT DECISION TREE (§10.0 CHROBREGO) + CURRENT NODE
3. Przeczytaj CLOSED BRANCHES + OPEN BRANCHES (§10.0 · §9 · §22)
4. Przeczytaj ostatni verified checkpoint (§22 CURRENT) — nie mylić z HISTORY/PRIOR STATE
5. Przeczytaj Decision Framework W0 — IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md (OD-W0-GO)
6. Przeczytaj docs/AI/09_PRODUCTION_BASELINE.md + live version.json
7. Dopiero potem: grep/repo audit (REUSE MAP · orchestra · ownerGate)
8. Trace Orchestra: IkOrchestraPageBridge → useIkOrchestra → engine/runtime → ownerGate
9. git status — rozpoznaj pre-existing WIP · NIE stage WIP · NIE git add -A
10. Classify: REUSE / CONNECT / VERIFY vs NEW (§2A · 15-question gate)
11. NIE powtarzaj CLOSED operations (F1/F2/G2 m² Accept / margin 20% / OUR RATE)
12. NIE wybieraj sam Owner Decision · NIE przechodź do kolejnej gałęzi bez wymaganego GO
13. Jeżeli chat/historia ≠ §10.0 Decision Tree → **zgłoś sprzeczność** · drzewo ma pierwszeństwo · NIE zgaduj
14. Obtain explicit Owner GO for the next OPEN branch — dopiero potem IMPLEMENT → TEST → VERIFY
```

**Pierwsze pytanie po cold starcie NIE jest:** „co robić od początku?”  
**Jest:** „jaki jest CURRENT NODE w Decision Tree i jakie są legalne następne przejścia?”  
(**CURRENT NODE** = `AFTER G2 LABOR m² ACCEPT — CLOSED/PASS — WAIT FOR OWNER GO`)

**Po przeczytaniu SSOT agent MUSI rozumieć:**

1. IK **już istnieje** — nie budujemy od nowa.
2. **Decision Tree** jest nadrzędnym kontraktem ciągłości IK.
3. **Orchestra = jedyny IK sequencer**; **IkEntryHost = adapter**, nie sequencer.
4. Experience/EC/Observation = **projekcja**, nie drugi silnik IK.
5. Nie budujemy drugiego TenderModule / Catalog / Host / Chief / Orchestra / Accept path.
6. **Chief** istnieje — **LEGACY-PARALLEL**; W3 = CONNECT (delegacja), nie nowy orchestrator.
7. Hub Accept = **LEGACY-PARALLEL** → konwergencja na `ownerGate` / Orchestra refresh seam.
8. **Eksperci IK** już istnieją (Document → KNR → Class → Labor → Material → Composite → P7 → P8).
9. Work Catalog / Price Memory / Evidence / F5 / Bid / PDF **już istnieją**.
10. **Expert Conversation + Live Viz** Phases **1–4 CLOSED GREEN** · Phase **5 NOT AUTHORIZED**.
11. G3 Final Bid persist = **OUT OF P3** — osobny Owner GO · **nie** auto po G2 m².
12. Statusy connectivity (§2A.2): CONNECTED ≠ Production Verified.
13. **Owner jest decydentem** (OUR RATE / Accept / classification / margin / Final Bid).
14. Workflow: **AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO → IMPLEMENT → TEST → VERIFY → COMMIT → PUSH → PRODUCTION VERIFY**.
15. **SEARCH BEFORE CREATE · REUSE → CONNECT → VERIFY · ZERO DUPLICATE LOGIC / PARALLEL ACCEPT.**
16. Never reopen CLOSED GREEN / CLOSED CHROBREGO m² branches without explicit Owner request.

**KONTYNUUJ WGDOM IK — NIE BUDUJ OD NOWA. NIE POWTARZAJ CLOSED.**

Tip produkcji = `docs/AI/09_PRODUCTION_BASELINE.md` + live `version.json`.

**Nie twórz:** drugiego TenderModule · drugiego Orchestra · drugiego Decision Tree · drugiego Master SSOT · drugiego IkEntryHost-as-sequencer · Chief-as-IK-sequencer · KNR system · Work Catalog · Price Memory · F5 · Bid engine · chat store · LLM per expert · storytelling Experience · drugiego refresh/epoch bus · Final Bid persist w P3.

**Jeżeli brakuje funkcji:** grep → trace caller → trace SSOT → **REUSE/CONNECT** → dopiero NEW po wykazanym GAP + Owner GO.

Historical `authority=false` · Evidence ≠ OUR RATE · Research ≠ Accept · FAMILY ≠ EXACT · CONFLICT = FAIL CLOSED.

---

## 18. KNR → Work Catalog bridge (TARGET / GAP)

```text
CURRENT:
  KNR evidence → KL lookup → Slice D requires EXISTING catalogWorkId

GAP (nie implementować bez Owner GO):
  KNR FACT → PROPOSED CatalogWork DTO → Owner Accept → Work Catalog
           → Owner KNR Mapping (Slice D) → Labor Expert → OUR RATE → F5
```

KL **nie** może stać się drugim pricing engine. Slice D **nie** auto-mapuje bez Owner.

---

## 19. Canonical team contract (nie usuwać)

> **INTELIGENTNY KOSZTORYSANT NIE JEST ZBIOREM NIEZALEŻNYCH MODUŁÓW. TO JEDEN ZESPÓŁ EKSPERTÓW DZIAŁAJĄCY NAD WSPÓLNYM CASE PRZETARGOWYM, WYKORZYSTUJĄCY ISTNIEJĄCE SSOT WGDOM. CHIEF KOORDYNUJE. IKENTRYHOST ORKIESTRUJE. EKSPERCI DOMENOWI WYKONUJĄ SWOJE ZADANIA. KNR DOSTARCZA KNOWLEDGE/EVIDENCE. LABOR DOSTARCZA OUR RATE. MATERIAL DOSTARCZA PRICE MEMORY/SELL. COMPOSITE ŁĄCZY R+M. F5 LICZY POSITION COST. P7 BUDUJE WARSTWĘ BID. P8 OCENIA RYZYKO. OWNER ZACHOWUJE AUTHORITY. EXPERT CONVERSATION / IK EXPERIENCE POKAZUJE PRAWDZIWY STAN PIPELINE (NIE FIKCYJNĄ ROZMOWĘ). LIVE VISUALIZATION + ETA + FINAL SUMMARY SĄ TARGET EXPERIENCE NAD RUNTIME. BID/PDF POZOSTAJE W ISTNIEJĄCYM STACKU. NIE BUDUJEMY TEGO OD NOWA. INTEGRUJEMY TO W JEDEN SPÓJNY, PRODUKCYJNY SYSTEM END-TO-END.**

---

## 20. Status matrix (Owner Map + plane)

| Element | Location | Status | Notes |
|---------|----------|--------|-------|
| Identity mapping | `work-rate-identity-mapping.ts` | **CURRENT** | **4** Owner rows · LABOR only |
| A01-S1 | LP4 → oczyszczenie | **FROZEN GREEN** | `3e4adfff` |
| A01-LP5 | LP5/LP10 → impregnacja | **FROZEN GREEN** | `f012d39a` + OPS `cf802cbd` |
| A01-S3 | LP10 OUR RATE + classification | **CLOSED** | `e7774ca5` · LP9=18 · LP10=22 |
| A01 F5 MARGIN | commercialPricing 25% owner | **PRODUCTION VERIFIED GREEN** | `82f3520e` · SELL 22.5 / 27.5 · dual-region |
| A09 PACKAGE | `cc-w2-scianki-dzialowe-gr-pakiet-m2` | **PRODUCTION VERIFIED** | `8ccb3e9b` · **NOT identity** · rate **PENDING** |
| Package plane | `costSplit` on CatalogWork | **CURRENT** | classify ≥0.25/0.25 → PACKAGE |
| G177 alias | — | **NONE** | EXPECTED |
| LABOR host ban | `p2b-scianka-gk-na-stelazu-m2` | **UNTOUCHED** | accept=false · no 118 |

Pełna tabela drzewa: §10–§12 + [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) §4.
Experience CURRENT/PARTIAL/GAP/TARGET: **§13**.
Observability Projection: Phases **1–4 CLOSED GREEN** @ **`c1b3ad7d`** · Phase **5 NOT AUTHORIZED** · DF [`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md).

---

## 22. NEW CHAT / NEW CURSOR AGENT HANDOFF (2026-08-28 · CHROBREGO CURRENT)

### CURRENT HEAD

| Pole | Wartość |
|------|---------|
| **CURRENT CHECKPOINT** | **CHROBREGO** · §10.0 Decision Tree |
| **Pipeline tenderId** | `08df0363-7b22-e462-ab56-940001283cba` |
| **OCDS** | `ocds-148610-6f859612-6631-426b-83fc-830bfec1c888` |
| **P3 deploy commit (gates)** | **`3822acb3724493b349c08a33bc584c7afe5dde31`** |
| **UI version** | czytaj [`09`](../AI/09_PRODUCTION_BASELINE.md) + live `version.json` |
| **Production** | https://www.wgdom.fun |
| **Master SSOT** | **TEN PLIK** |

### CURRENT PHASE / CURRENT NODE

**`AFTER G2 LABOR m² ACCEPT — CLOSED/PASS — WAIT FOR OWNER GO`**  
(pełne drzewo + LP listy = **§10.0** — nie odtwarzaj z historii czatu).  
A08-P3 epic: **IMPLEMENTED · nadal OPEN** (material WAIT · G3/Experience NOT STARTED).  
**Nie** zamykaj całego AUTONOMY-08 tylko dlatego, że m² PASS.

### CLOSED (do not reopen without Owner GO)

- IK-MIGRATION-01 P0–P9 · AUTONOMY-05…08-P2 · F5 MARGIN · Observability Phases 1–4 · KNR Slice A · A01/A09 Owner Map slices · G1 durable persist PV
- **CHROBREGO G1 AUTO-SAFE 22/22**
- **CHROBREGO F1** (catalog namePl for `unit===m2`)
- **CHROBREGO F2** margin **20%** `legacy-malowanie-m2` (wroclaw + dolnyslask · source=owner)
- **CHROBREGO G2 Research/Candidate/Evidence m²**
- **CHROBREGO G2 Accept LP 7, 8, 12, 13, 14** · OUR RATE BASE **22.90** · `sourceType=ACCEPT` · `lookup=CURRENT`

### OPEN

- **CHROBREGO LP48** mb / Malowanie rur — Owner classification (**NIE** wall-rate m²)
- **CHROBREGO G1 OWNER_REVIEW** (18)
- **CHROBREGO G1 NO_SAFE_EXISTING_WORK_ID** (15)
- **G2 material Accept PV** — natural candidate + Chief
- **A08-P3 epic slice** (pozostałe) · **AUTONOMY-08 epic** — not closed
- Phase 2E full · Phase 5 Experience · TM-01 residuals
- **G3 Final Bid** — NOT STARTED

### BLOCKED / WAITING FOR

- **G2 material** — 0 natural candidate + Chief OFF (`ikChiefWiringEnabled=false`)
- **G3 / Experience Phase 5** — not authorized / not started
- **HISTORY note:** global „G2 labor WAIT — 0 candidates on prod” (2026-08-26) = **PRIOR STATE** — superseded for **CHROBREGO m²** only

### DO NOT TOUCH / DO NOT REPEAT

- Mock/seed candidate · fabricated identity · margin re-write 20% · F1 re-run · G2 Accept re-run for LP 7/8/12/13/14 · OUR RATE rewrite without new Owner Gate
- Apply m² OUR RATE / catalog-name override to **lp48 mb**
- G3 / Experience / commit / push / deploy bez Owner GO
- S6/P4 closed code · payroll/cloud-sync without PAYROLL_SAFETY_GATE · `git add -A`

### NEXT LEGAL ACTION

Owner GO na **jedną** OPEN gałąź z §9 / §10.0 (np. LP48 classification **lub** G1 OWNER_REVIEW **lub** material G2) — AI **nie** inventuje wyboru.

### OWNER DECISIONS REQUIRED

| Decision | Status (2026-08-28) |
|----------|---------------------|
| **OD-P3-1** G1 contract | **APPROVE** |
| **OD-P3-2** G2 contract | **APPROVE** |
| **CHROBREGO G1 AUTO-SAFE** | **EXECUTED CLOSED** |
| **CHROBREGO F2 margin 20%** | **EXECUTED CLOSED** |
| **CHROBREGO G2 Accept m²** | **EXECUTED CLOSED** |
| **CHROBREGO LP48 classification** | **OPEN** — Owner GO required |
| **OD-P3-3** G2 material PV | **WAIT** |
| **OD-P3-4** Material Chief | **hard dependency** |
| **OD-P3-5** Prod use | **REQUIRE EVIDENCE BEFORE PROD** (global) · CHROBREGO m² evidence+Accept done |
| **OD-P3-7** APF boundary | **KEEP SEPARATE** |
| G3 / Experience Phase 5 | **NOT STARTED** — osobny GO |
| Close A08-P3 / epic | Only after remaining OPEN gates + Owner |

### SAFETY COUNTERS (CHROBREGO session closeout)

| Counter | Value |
|---------|-------|
| G3 | **0** |
| Experience | **0** |
| Commit (process) | **0** (docs-only update may follow Owner GO separately) |
| Push | **0** |
| Deploy | **0** |

### READ FIRST (ordered)

1. **TEN Master SSOT** — header Decision Tree primacy + **§10.0** + **§22**
2. [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) + live `version.json`
3. [`IK-AUTONOMY-08-P3-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P3-DESIGN-FREEZE.md)
4. [`docs/AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md)
5. [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)

### HISTORY / PRIOR STATE — §22 (2026-08-26 · G2 WAIT)

> **Superseded for CHROBREGO Labor m².** Zachowane, żeby nie mylić cold-startu.

- Phase label: *A08-P3 Owner Gates — IMPLEMENTED · P3 OPEN · G2 execution STOPPED*
- BLOCKED: *G2 labor Accept PV — 0 CANDIDATE on prod (8 LABOR all CURRENT_HIT)*
- NEXT: *WAIT for natural prod candidate*
- To było poprawne **przed** naturalnym candidate + Owner GO na CHROBREGO (2026-08-28).
- **Nie** używaj tego bloku jako CURRENT NODE.

---

## 23. FEATURE FLAG MAP (IK)

| Flag | Default (code) | Prod (A08-P3 PV session) | Responsibility | Module | Safety |
|------|------------------|--------------------------|----------------|--------|--------|
| `ikEntryEnabled` | `true` | **true** | Master IK ON · P2 Documents→BOQ | `ik-entry-flag.ts` | OFF ⇒ IK host idle |
| `ikIdentityCoverageEnabled` | `false` | **true** | P5.9 identity coverage report | identity phase / orchestra | optional report only |
| `ikLaborE2eEnabled` | `AUTO` | **AUTO** | P5 MODE A · with Entry enables labor path | `ik-labor-expert` | OFF ⇒ HOLD |
| `ikMaterialE2eEnabled` | `AUTO` | **AUTO** | P6 MODE A | `ik-material-expert` | OFF ⇒ HOLD |
| `ikChiefWiringEnabled` | `false` | **false** | P4 Chief-under-IK · **material G2 Accept** | `TenderDetailPage` · `use-ik-orchestra` | OFF ⇒ `CHIEF_OFF` on material Accept |
| `expertAiDecydentEnabled` | `false` | **false** | Legacy Decydent (D) — **≠ IK** | chief stack | D hard stop separate |
| `ikLaborResearchEnabled` | `false` | false | **NOT** executeResearch conjunct (A08-P2) | leftover | unread by P5 gate |
| `ikMaterialResearchEnabled` | `false` | false | **NOT** executeResearch conjunct | leftover | unread by P6 gate |
| `ikF5E2eEnabled` | `AUTO` | AUTO | P7 read-only bid prepare | `ik-p7-position-cost-bid` | no persist |
| `ikRiskDecisionE2eEnabled` | `AUTO` | AUTO | P8 read-only | `ik-p8-risk-decision` | no Accept |
| `ikAutoIngestEnabled` | legacy | — | **NOT** P2 runtime gate | — | P2 = Entry only |

**P5 executeResearch** = `ikEntryEnabled === true` **AND** `ikLaborE2eEnabled === true` (AUTO|ON).
**P6 executeResearch** = `ikEntryEnabled === true` **AND** `ikMaterialE2eEnabled === true` (AUTO|ON).

KV: `kw-app-settings` (merged local+remote in `app-settings.ts`).

---

## 24. PERSISTENCE MAP

| Store | Key / artifact | Durable? | Sync | Used by IK for |
|-------|----------------|----------|------|----------------|
| **LS** | `kw-multi-dwelling-package-v1` | session/browser | **LS-only · NOT KV** | Owner Map · G1 persist target dwelling |
| **LS** | OfferBoq per dwelling | **yes** (attach) | LS-only | identity · pricing lines · G1 persist |
| **LS** | `OwnerManualIdentityOverride` | session (until persist) | none | G1 Accept path |
| **LS** | `kw-owner-rate-input-v1` | yes | LS-only | equipment/transport Owner Input |
| **LS** | `kw-tender-ingest-v1` | yes | LS-only | P2 ingest registry |
| **KV** | `kw-app-settings` | yes | cloud | all IK flags |
| **KV** | `kw-wgdom-work-catalog` | yes | cloud | OUR RATE · work identity |
| **KV** | `kw-wgdom-labor-source-evidence` | yes | cloud | labor observations (**≠ OUR RATE**) |
| **KV** | `kw-price-intelligence-demand` | yes | cloud | material demand research |
| **KV** | KNR catalog stores | yes | cloud (gated writes) | KNR KL · verify orchestrator |
| **Session** | `g1RejectedKeys` / `g2*RejectedKeys` | no | none | Owner Gate reject state |
| **Session** | `chiefSession` / dossier | no | none | Chief advisory · material Accept gate |
| **Network** | P5 labor HTTP | ephemeral | research only | selective work-rate research |
| **Network** | P6 shop HTTP | ephemeral | Edge lease | material candidate research |

**Rule:** G1 durable identity = **LS OfferBoq attach** via `runGatedIdentityPersist`. G2 labor Accept = **KV Work Catalog**. G2 material Accept = **Price Memory** commit path.

---

## 25. IK SAFETY CONTRACT (HARD STOPS)

| Rule | Enforcement |
|------|-------------|
| **D / Decydent hard stop** | `expertAiDecydentEnabled` separate from IK · no silent D=ON |
| **Research ≠ Accept** | Experts may research on MISS; Accept only via Owner Gate / catalog panels |
| **No auto-Accept** | Queue read-only; `IkOwnerGateActionsPanel` explicit clicks |
| **Chief fail-closed (material G2)** | `g2MaterialAccept` → `CHIEF_OFF` when no session |
| **No fabricated candidate** | `CANDIDATE` only from research engines with real observations/quotes |
| **No fabricated market evidence** | Evidence KV append via qualified research paths only |
| **No silent persistence** | G1 gated persist · Accept engines notify + reload |
| **P7 read-only** | no Final Bid persist from P7 E2E |
| **P8 no Accept** | risk prepare only |
| **COMPOUND/UNKNOWN HOLD** | classification gate blocks research |
| **Evidence ≠ OUR RATE** | separate KV vs catalog Accept |
| **mat.inv.* / cw.inv.* boundaries** | P1 invoice collision guards |
| **Payroll/cloud-sync** | separate PAYROLL_SAFETY_GATE — not IK scope |

---

## 26. IMPLEMENTED vs PRODUCTION VERIFIED

| Capability | In code (`3822acb`) | Prod verified |
|------------|---------------------|---------------|
| Orchestra + Owner Gate UI | **YES** | partial (G1 only) |
| G1 Accept + durable LS persist | **YES** | **PASS** |
| G1 Reject/Edit/Research Again | **YES** | NOT VERIFIED |
| G2 labor Accept path | **YES** | **CHROBREGO m² PASS** (2026-08-28) · inne tendery case-by-case |
| G2 material Accept path | **YES** | **BLOCKED** (no candidate + Chief OFF) |
| P5/P6 executeResearch | **YES** | active flags · 0 candidates prod |
| Chief material gate | **YES** | Chief OFF by flag |
| KNR KL-6 verify UI | **YES** | PV ancestor |
| Observability 1–4 | **YES** | PV ancestor |

**Never equate** “code exists” with “production verified”.

---

## 27. A08-P3 — DETAIL (CHROBREGO CURRENT + HISTORY blockers)

| Milestone | Status |
|-----------|--------|
| Design Freeze | **PROPOSED** @ `b857a162` era (pre-impl) |
| Arch Review | **PASS WITH REQUIRED FIXES** (pre-impl) |
| Implementation | **`3822acb`** — Owner Gates G1/G2 |
| Build | **PASS** |
| Harness | **27 PASS / 0 FAIL** (`test-ik-autonomy-08-p3-owner-gates.mjs`) |
| Deploy | **PASS** @ prod |
| G1 durable persist PV | **PASS** |
| G2 labor (CHROBREGO m²) | **CLOSED / PASS** (2026-08-28) — LP 7/8/12/13/14 · OUR RATE 22.90 · margin 20% |
| G2 labor (global / other) | **case-by-case** — HISTORY 2026-08-26 audit: many CURRENT_HIT · 0 candidate then |
| G2 material | **WAIT** — 1209/1212 `priceStatus NONE` · 0 trusted identity+MISS · 0 candidate |
| P3 closeout | **NOT AUTHORIZED** (epic OPEN) |

**CHROBREGO G2 labor summary (2026-08-28 · CURRENT):**

- F1 catalog name · F2 margin 20% · QUALIFIED=10 · Accept batch · OUR RATE BASE 22.90 · SELL display 27.48
- LP48 mb **OPEN** (classification) — **not** accepted

**G2 blocker summary (prod audit 2026-08-26 · HISTORY / PRIOR STATE):**

- Labor MISS path (e.g. G1→`legacy-gk-m2`) → **`RESEARCH_GAP`**, not CANDIDATE (pre-CHROBREGO)
- Material requires `resolveDemandProductIdentityExact` — no invent from namePl alone
- `ikChiefWiringEnabled=false` blocks material **Accept only**, not candidate generation

---

## 28. IMPLEMENTATION HISTORY (IK — chronological, selected)

| When | ID | Commit (tip) | Status |
|------|-----|--------------|--------|
| 2026 | IK-MIGRATION-01 | P0–P9 series | **CLOSED** |
| 2026 | AUTONOMY-05 | `44e81d20` | P5/P6 AUTO/OFF/ON **CLOSED/PV** |
| 2026 | AUTONOMY-06 | `ab5eaaa1` | P7 **CLOSED/PV** |
| 2026 | AUTONOMY-07 | `0f994437` | P8 **CLOSED/PV** |
| 2026 | AUTONOMY-08 P0 | `b98e68e5` | Documents→BOQ **CLOSED/PV** |
| 2026 | AUTONOMY-08 P1 | `e0373fac` | Settings unification **CLOSED/PV** |
| 2026 | AUTONOMY-08 P2 | `1f5d871c` | Research-on-Miss **CLOSED/PV** |
| 2026 | Orchestra extract | `facac24f`…`d62485cb` | W1/W4/W5 **IMPLEMENTED** |
| 2026 | Observability 1–4 | `b56f3d43`…`c1b3ad7d` | **CLOSED/PV** |
| 2026 | A01 F5 MARGIN | `82f3520e` | **CLOSED/PV GREEN** |
| 2026 | KNR Phase 2D | `77385b0c` | **CLOSED/PV** |
| 2026 | KNR KL-6 | `ce192b1e` | **CLOSED/PV** |
| 2026 | KNR Phase 2E source | `1a9c5484` | targeted source LANDED · full 2E OPEN |
| 2026 | KNR-WC P3/P4 | `9376a48e`…`2fce3caf` | P3 **CLOSED** · P4 seam **CLOSED** |
| 2026 | S6-A/B · Outcome bridge | `a9d59fd0`…`2fce3caf` | **CLOSED** |
| 2026-08-26 | **AUTONOMY-08 P3** | **`3822acb`** | **IMPLEMENTED · P3 OPEN · G2 WAIT** (HISTORY) |
| 2026-08-28 | **CHROBREGO G1+G2 m²** | session · KV OUR RATE | **G1 22 CLOSED · G2 m² CLOSED/PASS · LP48 OPEN** |

Full tip table: [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md).

---

## 29. MASTER SSOT COMPLETENESS AUDIT (2026-08-26)

| Obszar | Repo | SSOT (this doc) | Status |
|--------|------|-----------------|--------|
| IK root / philosophy | ✅ | ✅ §1–2 | **zgodne** |
| Entry / Host | ✅ | ✅ §10–11.2 | **zgodne** |
| Orchestra W1/W4/W5 | ✅ | ✅ §10 · §11.15 | **uzupełnione** |
| Chief (part of IK) | ✅ | ✅ §11.1 · §23 | **zgodne** |
| Domain experts (4) | ✅ | ✅ §11.3–11.12 | **zgodne** |
| KNR knowledge layer | ✅ | ✅ §11.5 · §18 | **zgodne** |
| KNR-WC bridge P3/P4 | ✅ | ✅ §11.17 | **uzupełnione** |
| Work Catalog / OUR RATE | ✅ | ✅ §5–6 · §11.8 | **zgodne** |
| Material / Price Memory | ✅ | ✅ §11.9 | **zgodne** |
| Identity coverage | ✅ | ✅ §11.16 G1 | **zgodne** |
| Owner Gates G1/G2 | ✅ | ✅ §11.16 · §27 | **uzupełnione** |
| Persistence LS/KV | ✅ | ✅ §24 | **uzupełnione** |
| Feature flags | ✅ | ✅ §23 | **uzupełnione** |
| Safety contract | ✅ | ✅ §25 | **uzupełnione** |
| A08-P3 state | ✅ | ✅ §27 | **uzupełnione** |
| Production vs verified | ✅ | ✅ §26 | **uzupełnione** |
| Phase history | partial in 09 | ✅ §28 | **uzupełnione** |
| Experience §13 | ✅ | ✅ §13 | **zgodne** (Phase 5 GAP) |
| New agent handoff | ✅ | ✅ §22 | **uzupełnione** |

### MISSING ITEMS FOUND (pre-edit)

- Orchestra layer not explicit in tree (only Host)
- Owner Gates G1/G2 module entries absent
- A08-P3 post-impl state absent
- Central flag / persistence / safety tables absent
- G2 WAIT / prod blocker state absent
- Cold-start checkpoint stale (`82f3520` only)

### ITEMS ADDED TO SSOT (this session)

- §10 tree: Orchestra + Owner Gates branches
- §11.15 Orchestra module card
- §11.16 Owner Gates G1/G2 + PV matrix
- §11.17 KNR-WC bridge pointer
- §22 full NEW CHAT HANDOFF
- §23–29 flag/persistence/safety/P3/history/audit

### UNRESOLVED CONFLICTS

| ID | Source A | Source B | Resolution |
|----|----------|----------|------------|
| **C-09-P3** | [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) snapshot line 8: «P3 **NOT STARTED**» | Repo **`3822acb`** + harness 27/0 + G1 PV | **RESOLVED** (2026-08-28): `09` synced · P3 **IMPLEMENTED · OPEN** |
| **C-P3-DF** | P3 DF header «IMPLEMENT NOT AUTHORIZED» (pre-impl doc) | Code on `main` | **RESOLVED** (2026-08-28): governance records **IMPLEMENTED** @ `3822acb` · **not** retroactive IMPLEMENT GO · **OD-P3-5 REQUIRE EVIDENCE BEFORE PROD** |

---

## 30. COMMIT HISTORY AUDIT (IK — key SHAs)

| SHA | Scope |
|-----|-------|
| `3822acb` | **A08-P3 Owner Gates** — orchestra ownerGate API · IkOwnerGateActionsPanel · labor idempotency |
| `b857a162` | Master SSOT conflict resolution (pre-P3 doc) |
| `2fce3caf` | KNR-WC P4 trusted identity seam |
| `facac24f` | Orchestra extract from IkEntryHost |
| `d62485cb` | W5 owner action execution seam |
| `b59be7cc` | W4 operator action orchestration |
| `c1b3ad7d` | Observability Phase 4 Team Conversation bridge |
| `82f3520e` | A01 F5 MARGIN commercialPricing |
| `1f5d871c` | AUTONOMY-08 P2 Research-on-Miss |
| `e0373fac` | AUTONOMY-08 P1 settings |
| `b98e68e5` | AUTONOMY-08 P0 Documents→BOQ |

---

## 22-LEGACY. NEW SESSION / NEW AGENT CONTINUITY BLOCK (**HISTORY — superseded by §22**)

> **NIE INTERPRETUJ JAKO CURRENT.** Wejdź w **§10.0** + **§22**. Ten blok = archiwum pre-CHROBREGO handoff.

```text
PROJECT:     WGDOM
SYSTEM:      Intelligent Estimator (IK)

HISTORY STATE (do not use as CURRENT NODE):
  A08-P3 @ 3822acb IMPLEMENTED · P3 OPEN · G2 WAIT = PRIOR (pre-CHROBREGO m²)
  Pointer only → live CHROBREGO = §10.0 / §22 (2026-08-28)

BASELINE (frozen at time of legacy block — may drift):
  A08-P3 deploy = 3822acb3724493b349c08a33bc584c7afe5dde31

READ FIRST:
  docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md → §10.0 Decision Tree → §22
  docs/AI/09_PRODUCTION_BASELINE.md + live version.json
```

---

## 21. OWNER MISSION (IK — nie usuwać)

```text
OWNER DECISION:

„Chcę doprowadzić Inteligentnego Kosztorysanta
do pełnej, działającej produkcyjnie wersji
możliwie szybko, ale profesjonalnie i bez
budowania drugiego systemu obok istniejącego WGDOM.

Każdy kolejny agent ma najpierw ustalić:
CO JUŻ MAMY,
CZEGO BRAKUJE,
CO JEST WIP,
CO JEST TARGETEM.

Następnie ma wskazać NAJKRÓTSZĄ BEZPIECZNĄ DROGĘ
do pełnego działającego IK.

Nie chcę kolejnych izolowanych demo-slice'ów,
które nie prowadzą do kompletnego systemu.

Chcę spójnego, produkcyjnego IK end-to-end.”
```

**Cel projektu (skrót):**
Jeden zespół · jeden case · jeden orchestrated pipeline · istniejące SSOT · rzeczywista współpraca ekspertów · **live team experience** · pełny kosztorys · wyjaśnienie wyniku · Bid/PDF.
**Nie:** kolejny „AI chat” · drugi silnik · rebuild.

**STOP.** Kolejny gate tylko po nowym Owner GO + AUDIT.
