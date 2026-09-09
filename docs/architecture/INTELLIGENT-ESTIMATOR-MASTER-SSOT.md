# INTELLIGENT ESTIMATOR — MASTER SSOT

<!-- MASTER RECONCILED 2026-09-09 · GO65 B1+B2 main vs production SSOT · prior GO55 Knowledge Loop · tip main 2.66.193 · prod live via version.json -->

> **ID:** `INTELLIGENT-ESTIMATOR-MASTER-SSOT`
> **STATUS:** **ACTIVE** · **★★ JEDYNY MASTER SSOT Inteligentnego Kosztorysanta (IK)** · **★★ JEDYNY cold-start IK**
> **Data:** **2026-09-09** · **GO65** Master reconcile after B1+B2 on `main` (**docs only**) · prior **GO55** §16A Knowledge Loop
> **Rola:** jedyny Master SSOT / cold-start dla IK · **Decision Tree = PRIMARY CONTINUITY CONTRACT**
> **Zakaz:** drugi Orchestra / Chief / Research / Catalog / Decision Tree / Master SSOT
> **Zasada:** **REUSE → CONNECT → VERIFY** · **CATALOG FIRST → RESEARCH FALLBACK → LEARN → REUSE** · SEARCH BEFORE CREATE · **NO REBUILD**
> **HARD (GO65):** **`main` ≠ PRODUCTION** · B1/B2 = **IMPLEMENTED ON MAIN** · **≠ PRODUCTION VERIFIED**

---

## 1. MASTER HEADER

### 1.1 Status table (LOCKED · 2026-09-09 · GO65)

| Pole | Wartość |
|------|---------|
| **LIVE `/version.json`** | **runtime authority** · fetch `https://www.wgdom.fun/version.json` przy każdym audycie |
| **LIVE PRODUCTION (odczyt 2026-09-09)** | **version `2.66.170`** · **commit `9d22263`** — **B1/B2 NOT on prod** |
| **HEAD / origin/main** | **`923ea4b324cbabd5604925bb627b63c8de4107a5`** |
| **HEAD message** | `feat(ik): integrate autonomous g2 into orchestra` |
| **MAIN source tip (changelog)** | **`2.66.193`** (B2) · prior B1 tip **`2.66.192`** @ `42a82b08` — **≠ live prod** |
| **Documentary tip** | może lagować względem live · **lag EXPECTED / NOT FAIL** · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **CURRENT CASE BRANCH (global Decision Tree)** | **ŚRODA A0.2** — Work Catalog coverage · **UNCHANGED** |
| **CURRENT ACTIVE CAPABILITY TRACK** | **TPI/729 Document → C2 → OfferBoq → NG11** |
| **CURRENT FIRST OPEN BLOCKER / CURRENT OPEN NODE** | **`OWNER_FINANCE_NOT_OK`** |
| **CURRENT NEXT LEGAL** | **UTRZYMANIE / Owner GO** — Finance residual = osobne GO · TPI node **UNCHANGED** · B1/B2 **IMPLEMENTED ON MAIN** (**≠ PV**) · Knowledge Loop labor path **IMPLEMENTED** (Material / KB-06/07 **OPEN**) · control Work `cc-ic-accept-6c2b8e82` (A1/Pack/Rate = 0 until Owner GO) |
| **AUTO G1 on main** | **IMPLEMENTED** @ **`42a82b08`** (GO60 B1 · tip `2.66.192`) · **≠ PRODUCTION VERIFIED** |
| **AUTO G2 on main** | **IMPLEMENTED** @ **`923ea4b3`** (GO63/GO64 B2 · tip `2.66.193`) · **≠ PRODUCTION VERIFIED** |
| **CHROBREGO** | **CLOSED CASE** (56/0 · G3 Final Bid) — **NIE reopen** |
| **GLOBAL IK PRODUCTION VERIFIED** | **NO** |
| **GLOBAL IK PRODUCTION VERIFIED = NO** | **LOCKED** — capability PV ≠ global E2E PV · **B1/B2 ≠ global PV** |
| **TPI case auto → new global tree?** | **NIE** — TPI = capability track, nie nowy CURRENT CASE BRANCH |
| **GO43** | Learning-loop audit · artefact `.tmp/goa-tpi729-knowledge-learning-loop-go43.*` |
| **GO44** | Master §16A Knowledge Base / Learning Loop · **docs** |
| **GO53** | Labor Evidence sufficiency + HTTP suppress runtime · OD-52 STATE_ONLY · tip local `2.66.191` era |
| **GO55** | Master §16A reconcile with GO53/OD-52 · **docs only** · no runtime |
| **GO60–GO61** | B1 AUTO G1 IdentityPhase wire · surgical commit **`42a82b08`** |
| **GO62** | AUDIT — Master overclaimed GO24 vs `main` (runtime then WIP-only) |
| **GO63–GO64** | B2 AUTO G2 Orchestra wire · surgical commit/push **`923ea4b3`** |
| **GO65** | **THIS AMENDMENT** — Master reconcile B1+B2 main vs production · **docs only** · no runtime |

### 1.2 Vocabulary (nie mieszać)

| Status | Znaczenie |
|--------|-----------|
| **PRODUCTION VERIFIED (PV)** | Live na prod + jawny dowód PV / E2E Owner |
| **IMPLEMENTED** | W kodzie na `main`; lokalna / shadow weryfikacja OK; **≠** PV |
| **OPEN** | Otwarte / zablokowane / czeka na Owner |
| **HOLD** | Świadomie wstrzymane (gate / classification / provider) |
| **HISTORY** | Starszy checkpoint — **nie** mylić z CURRENT |
| **CLOSED / PASS** | Gałąź / capability zamknięta — **nie** reopen bez Owner GO |
| **FROZEN** | Design Freeze — semantyka bez Owner GO |
| **PARTIAL** | Część ścieżki istnieje; reszta gated |
| **GAP** | Brak w source albo świadomy gap |
| **CONNECTED** | Podpięte do Orchestra / Decision Tree / seam |
| **LEGACY-PARALLEL** | Ścieżka równoległa; konwergencja REUSE→CONNECT; bez GO nie usuwać |

**HARD:** `IMPLEMENTED ≠ PRODUCTION VERIFIED` · harness GREEN ≠ prod PV · docs tip ≠ live SHA (equality **nie wymagana**).
**HARD (GO65):** `main` tip `2.66.193` **≠** production `2.66.170` · do **not** read B1/B2 as PV.

### 1.3 Banner kontraktu

```text
════════════════════════════════════════════════════════
NIE BUDUJ OD NOWA.
SEARCH BEFORE CREATE.
Przetargi + kosztorysowanie JUŻ ISTNIEJĄ.
IK = ORCHESTRACJA ISTNIEJĄCYCH MODUŁÓW WGDOM,
     nie drugi TenderModule / Catalog / Pricing / Host.
════════════════════════════════════════════════════════

★★ DECISION TREE = PRIMARY CONTINUITY CONTRACT ★★
Decision Tree > raport > artefakt > pamięć czatu.

Każdy nowy AI:
  1. czyta TEN Master SSOT
  2. odnajduje CURRENT DECISION TREE (§9)
  3. ustala CURRENT CASE BRANCH + CURRENT OPEN NODE
  4. czyta CLOSED / OPEN / capability tracks
  5. respektuje Owner GO / STOP
  6. kontynuuje WYŁĄCZNIE z aktualnego węzła

NIE reopen zamkniętej gałęzi tylko dlatego, że raport jest w historii czatu.
════════════════════════════════════════════════════════
```

---

## 2. OWNER MISSION

**W&G DOM** — aplikacja operacyjna (React/Vite): Roboty, Lista Płac, WM Druk, **Przetargi**, **Inteligentny Kosztorysant (IK)**.
Prod: https://www.wgdom.fun · repo `main` · FE = `git push origin main` → Vercel (**zakaz** `vercel deploy` / `vercel --prod`).

**Misja Ownera względem IK:** dostać **jeden, wiarygodny kosztorys ofertowy** z wyjaśnieniem, przy pełnej kontroli decyzji biznesowych (stawki, Accept, Final Bid, mapowania).

**Misja AI względem IK:**

1. **REUSE** istniejącego stacku Przetargów / Catalog / F5 / OfferBoq.
2. **CONNECT** capability do **jednego** Orchestra + **jednego** Decision Tree.
3. **VERIFY** (test → opcjonalnie PV) — bez claimów „GOTOWE” bez dowodu.
4. **STOP** na Owner Gate — **nie** inventować OUR RATE / Accept / Final Bid / next legal step.

**OWNER = DECISION MAKER.** IK analizuje / proponuje / porównuje / wskazuje ryzyko.
**NIE** przejmuje samowolnie: OUR RATE · Accept · KNR mapping boundaries · Final Bid · Historical `authority=true` · margin.

---

## 3. DECISION TREE PRIMACY

### 3.1 Kontrakt

```text
JEDEN Decision Tree.
JEDEN CURRENT CASE BRANCH (global).
Capability tracks = RÓWNOLEGŁE (OCR/C2/NG11/TPI/…) — NIE drugi tree.
```

| Pojęcie | Semantyka |
|---------|-----------|
| **CURRENT CASE BRANCH** | Globalny case Decision Tree · **dziś: ŚRODA A0.2** |
| **CLOSED CASE** | **CHROBREGO** — benchmark · **NIE reopen** |
| **CURRENT ACTIVE CAPABILITY TRACK** | Tor techniczny równoległy · **dziś: TPI/729 Document→C2→OfferBoq→NG11** |
| **CURRENT OPEN NODE / FIRST BLOCKER** | Pierwszy otwarty blocker w aktywnym torze · **dziś: `OWNER_FINANCE_NOT_OK`** |
| **CURRENT NEXT LEGAL** | Tylko po **Owner GO** |

**HARD:** sukces capability (C2 PV, NG11 align PV) **nie** przesuwa automatycznie CURRENT CASE BRANCH na TPI.
**HARD:** TPI **nie** jest nowym globalnym drzewem — to tor dowodowy / capability.

### 3.2 DF Decision Tree

Formalny DF: [`IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md`](./IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md).
Ten Master **integruje** drzewo operacyjne w **§9**. Przy konflikcie raportu historycznego z §9 → **READ-ONLY AUDIT** (repo + ten SSOT) · **NIE zgaduj**.

---

## 4. SYSTEM ARCHITECTURE

```text
IK = JEDEN ZESPÓŁ EKSPERTÓW nad ISTNIEJĄCYM stackiem Przetargów.
    + JEDEN CASE + JEDEN ORCHESTRATED PIPELINE + ISTNIEJĄCE SSOT
    + LIVE EXPERIENCE (projekcja observability)
    + PEŁNY KOSZTORYS + WYJAŚNIENIE + BID / PDF

Nie drugi chatbot. Nie drugi silnik Bid. Nie drugi Catalog.
```

| Rola (logiczna) | Byt w source | NIE jest |
|-----------------|--------------|----------|
| **Chief** | `chief-session` · `chief-orchestrator` · dossier UI | Drugim TenderModule · Decydentem · drugim Hostem · **IK sequencerem** |
| **Orchestra** | `IkOrchestraPageBridge` → `useIkOrchestra` → `ik-orchestra-engine` + `ik-orchestra-runtime` | Drugim Chiefem · Experience engine |
| **Host** | `IkEntryHost` | Sequencerem · drugim Catalog |
| **Document / BOQ** | ingest · ATH/PDF · OfferBoq · Multi-BOQ · OCR · **C2 derived docs** | Nowym parserem / LogicalBoq |
| **Owner Map** | `multi-dwelling` · `ik-dwelling-mapping` | Silent invent lokali |
| **KNR** | `ik-knr-expert` + Slice A/D + KL catalog-first | Work Catalog · auto OUR RATE · auto VERIFIED |
| **Historical** | `historical-executed/*` | Normatywnym KNR · authority pricing |
| **Classification** | `classification-gate` · `ik-classification` | Research / Accept |
| **Labor** | `ik-labor-expert` → Work Catalog / OUR RATE | Material PM |
| **Material** | `ik-material-expert` → Price Memory / DIY / SELL | Labor OUR RATE |
| **Composite** | `ik-composite-both-hold` → `computePositionCost` | Drugim kalkulatorem |
| **Leaf Research** | `ik-leaf-research-orchestrator` | Parent COMPOUND research · Accept |
| **P7 / P8** | `ik-p7-position-cost-bid` · `ik-p8-risk-decision` | Final Bid persist |
| **Experience** | Observation · Live Viz · EC overlay | Drugim systemem IK |

**REUSE:** `TendersModule` · OfferBoq · F5 Position Cost · Work Catalog · Price Memory · Evidence · Accept · Multi-Dwelling · Bid PDF.

### 4.1 Expert cards (source-verified skrót)

#### Chief
- Pliki: `chief-session/*` · `chief-orchestrator/*` · `useChiefOrchestratorSession.ts`
- Rola: Case/Task/dossier/lifecycle · **nie** IK sequencer
- Material G2 Accept wymaga `chiefMaterialAvailable` gdy wiring ON
- Status: PRODUCTION EXISTING · wiring often PARTIAL (`ikChiefWiringEnabled=false`)

#### Host
- `IkEntryHost.tsx` — UI adapter / consumer Orchestra snapshot
- EC · Live Viz · Owner panels · data-attrs observability
- **NIE** sekwencjonuje ekspertów

#### Document / BOQ
- `ik-document-expert.ts` · ingest · multi-boq · OfferBoq · OCR · C2
- Output: lines + `expertAdmission` + `readyForExperts=(status==="ready")`
- HARD: never `partial→ready`

#### KNR
- `ik-knr-expert` + Slice A/D + `knr-knowledge/*` + public discovery
- max PENDING_VERIFY without KL-6 Owner
- KL-3 lifecycle fixed @ `ece4f8be`

#### Labor / Material
- Labor → Work Catalog / Evidence / Accept
- Material → PM / DIY trio / Accept
- Research-on-Miss CLOSED/PV (capability) · live may be NOT OBSERVABLE

#### Orchestra
- `use-ik-orchestra.ts` · `ik-orchestra-engine.ts` · `ik-orchestra-runtime.ts`
- `ownerGate` API · refresh via bump+epochs
- Expert Chain gate: `expertChainMayProceed` (≠ sole `readyForExperts`)

---

## 5. HARD LOCKS + §2A connectivity axis

### 5.1 Hard locks (NO REBUILD)

**FORBIDDEN bez Owner GO + AUDIT:**

- nowy `TendersModule` / drugi `IkEntryHost` / drugi Orchestra / drugi Chief
- nowy Work Catalog / Material Catalog / Price Memory / Evidence / OUR RATE / Accept
- nowy parser BOQ/ATH / identity engine / classification engine / LogicalBoq
- nowy labor/material research engine / drugi Historical index / nowy PDF engine
- osobny chat store / LLM per expert / storytelling Experience bez projekcji pipeline
- `Evidence → OUR RATE` bez Candidate + Owner Accept · `companyPricePln → OUR RATE`
- `pkt ≡ mb` bez dowodu
- **parent research** dla **COMPOUND** / **UNKNOWN** (wyjątek leaf — §16 / §17)
- Historical `authority=true` bez osobnego Owner GO
- KNR auto-write `catalogWorkId` poza Slice D / boundaries
- **zapis C2 → `dossier.kosztorys`** (zakaz — §11 / §19)
- `git add -A` · `vercel deploy` · reset/clean/stash WIP bez jawnego Owner order
- drugi Master SSOT / drugi Decision Tree

### 5.2 MASTER CONNECTIVITY CONTRACT (§2A / OD-W0-GO)

> **OD-W0-GO = GRANTED** (governance / docs). **≠** Production Verified · **≠** auto-auth W3–W6.

```text
TendersModule
  → Tender Detail
  → IkEntryHost                 (UI adapter — NIE sequencer)
  → IkOrchestraPageBridge
  → useIkOrchestra
  → ik-orchestra-engine / runtime
  → Decision Tree / Owner Gates
  → Expert chain
  → results / pricing / bid / experience projections
```

| Byt | Rola |
|-----|------|
| Orchestra | **ONLY** IK sequencer |
| `IkEntryHost` | UI adapter / consumer snapshotu |
| Chief | **LEGACY-PARALLEL** dossier/session — **nie** IK sequencer |
| Experience / EC / Observation | projekcja |
| APF | osobna policy plane · **nie** Accept |

**Zasada:** REUSE → CONNECT → VERIFY → CLOSE.
Nowa funkcja tylko po: audyt braku + węzeł Decision Tree + Orchestra seam + Owner + persist/recompute + Observation + SSOT + testy + **Owner GO**.

### 5.3 Connectivity status dictionary

| Status | Znaczenie |
|--------|-----------|
| **CONNECTED** | Podpięte do Orchestra / tree / seam |
| **PARTIAL** | Brakuje seam / Owner / refresh / PV |
| **GAP** | Brak wymaganej connectivity |
| **LEGACY-PARALLEL** | Równoległa ścieżka; bez GO nie usuwać |
| **NOT PROVEN** | Brak dowodu |
| **BLOCKED** | Governance / dependency / Owner WAIT |

### 5.4 Parallel paths (skrót)

| Path | Klasyfikacja |
|------|--------------|
| `runChiefOrchestrator` T1–T4 | LEGACY-PARALLEL |
| Hub Accept labor/material | LEGACY-PARALLEL → converge `ownerGate` |
| Legacy bid panel | LEGACY-PARALLEL |
| APF | CONNECTED (overlay-only) |

**Hub rule:** Accept → `ownerGate` **lub** zatwierdzony Orchestra refresh (`bumpOrchestraAfterPricingAccept` + epochs). **Zakaz** drugiego refresh systemu.

### 5.5 DOCUMENT TRUTH ≠ EXPERT ADMISSION (FROZEN · PV @ `a5d19047`)

```text
readyForExperts  ≠  expertChainMayProceed
status===ready   ≠  admittedCount > 0
partial → ready  =  IMPOSSIBLE
```

| Pojęcie | Semantyka |
|---------|-----------|
| `readyForExperts` | pełna strukturalna gotowość Document · `⇔ status === "ready"` |
| `expertChainMayProceed` | `admittedCount > 0 ∧ ¬globalIntegrityBlocker` |
| ADMITTED | lineId · opis · unit · qty > 0 · `isNoise !== true` |
| UNRESOLVED | structural failure → Owner Review path |
| Canonical ID | **`OfferBoqLine.lineId` only** |

Capability: `IK-LINE-TOLERANT-EXPERT-ADMISSION-01` · **CLOSED / PV** · **≠** Global IK PV · **≠** nowy CURRENT CASE.

Pliki: `ik-expert-admission.ts` · test `scripts/test-ik-line-tolerant-expert-admission-01.mjs`.

Paczka XI evidence (HISTORY · READ-ONLY): tender `08dee8b8-…` · 167 lines · Document `partial` · **166 ADMITTED / 1 UNRESOLVED** · `mayProceed=true` · LP43 qty 0 → F5 GAP · G3 NOT READY · **DATA MUTATION NONE**.

### 5.6 Agent Cold-Start Checklist (connectivity)

```text
1. Master SSOT (TEN PLIK) — §1–§5 · §9 · §24
2. Decision Framework — IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md
3. 09_PRODUCTION_BASELINE.md + LIVE version.json
4. Trace Orchestra: Bridge → useIkOrchestra → engine/runtime
5. Inspect ownerGate + IkOwnerGateActionsPanel
6. Inspect bumpOrchestraAfterPricingAccept + epochs
7. Grep BEFORE create (REUSE MAP)
8. Classify REUSE / CONNECT / VERIFY / NEW
9. Obtain explicit Owner GO
10. Only then IMPLEMENT → TEST → VERIFY (≠ claim PV)
```

### 5.7 G3 Final Bid boundary (connectivity)

- Final Bid persistence = **OUT OF P3 scope**.
- P7 = preparation · P8 = risk prepare · **bez** auto Final Bid.
- G3 wymaga **osobnego Owner GO** (AUDIT → DF → GO).
- CHROBREGO G3 = CLOSED benchmark · **≠** auto TPI G3.

---

## 6. AUTHORITY / VALUE LAYERS

| Warstwa | Co to jest | NIE jest |
|---------|------------|----------|
| **Document / OfferBoq** | linie · qty · unit · identity candidacy | cena |
| **Work Catalog OUR RATE** | Owner-accepted labor rate | Evidence · research quote |
| **Labor Evidence** | obserwacje źródeł | OUR RATE |
| **Price Memory** | material commercial CURRENT (`marketQuotes`) | auto Accept |
| **IdentityCandidate** | proponowana tożsamość Work (GO35–41) | CatalogWork · OUR RATE · Pack |
| **SELL** | purchase/market BASE + **effective margin** | Labor OUR RATE · independent authority |
| **commercialPricing / margin** | Owner item + global floor | Research quote · SELL authority |
| **F5 Position Cost** | LABOR + MATERIAL (+ BOM/…) | Final Bid persist |
| **P7** | bid **prepare** read-only | G3 persist |
| **P8** | risk / decision prepare | auto Owner Accept |
| **G3 Final Bid** | Owner-persisted `ikFinalBid` | submittedBidPln |
| **Historical** | evidence index | KNR Catalog authority |
| **KNR PENDING_VERIFY** | discovery max | VERIFIED bez KL-6 Owner |
| **`kosztorysForBid`** | canonical Bid/OfferBoq cost input | **`dossier.kosztorys`** |
| **`dossier.kosztorys`** | legacy/ONE dossier snapshot | wymagany dla C2 path |

**HARD:** `companyPricePln` = LEGACY ≠ OUR RATE.  
**HARD:** C2 handoff pisze / czyta **`kosztorysForBid`** — **NIGDY** nie zapisuje C2 do `dossier.kosztorys`.  
**HARD:** Knowledge planes remain **separate** — see **§16A** (GO44). Do not collapse into one generic price table.  
**★★ Learning / Catalog First product contract:** **§16A**.

---

## 7. COMPLETE IK FUNCTION TREE

```text
WGDOM / TENDERS
  └── Tender Detail
        ├── Pipeline / NG11 readiness
        │     ├── ingest (kw-tender-ingest-v1 FULL browser)
        │     ├── OCR B1 (fail-soft)
        │     ├── C2 derived docs (P lineage · D1/D2/D3)
        │     ├── Multi-BOQ / Multi-Dwelling / Owner Map
        │     ├── kosztorysForBid (C2 compose / Aggregate / ONE)
        │     └── pricingReady* + ownerFinanceProposal
        ├── Chief (LEGACY-PARALLEL session/dossier)
        └── IkEntryHost (adapter)
              └── Orchestra (ONLY sequencer)
                    ├── Document / BOQ Expert (+ admission)
                    ├── KNR Expert (+ KL knowledge · Historical evidence)
                    ├── Identity phase (ADMITTED)
                    ├── Classification Gate
                    ├── Labor Expert (P5) ── Work Catalog / Evidence / Accept
                    ├── Material Expert (P6) ── PM / DIY / Accept
                    ├── Leaf Research Orchestrator (COMPOUND leaves only)
                    ├── Composite BOTH_HOLD → computePositionCost
                    ├── P7 Position Cost Bid
                    ├── P8 Risk / Decision
                    └── Owner Gates G1 / G2 (G3 osobny)
```

**Internet search / research** żyje **tylko** w Legal allowlist providers (labor selective + DIY selective Edge) — szczegóły **§16**.

### 7.1 Runtime flow (CURRENT Orchestra · main @ `923ea4b3`)

```text
IkOrchestraPageBridge
  → useIkOrchestra
  → sync core:
       Document Expert (+ admission)
       → KL-3 knowledge settle (busy→ready @ ece4f8be)
       → KNR Expert / P4
       → Identity / G1 AUTO (AUTO_G1_ACCEPT · auto_contract)   ← B1 @ 42a82b08
       → G2 AUTO RATE ∥ BOM (attestations autoG2Rate/autoG2Bom) ← B2 @ 923ea4b3
       → Classification
       → Coverage
  → async P5 Labor / P6 Material (settle)   ← P5 still authoritative lookupWorkRate
       → optional Leaf Research (pack-bound COMPOUND leaves)
  → Composite BOTH_HOLD → computePositionCost (feedsP7Bid=false)
  → P7 Position Cost Bid (prepare)
  → P8 Risk / Decision (prepare)
  → Finance (derived) · G3 Final Bid = Owner only
  → snapshot → Host / Experience / ownerGate UI
```

**HARD (GO65):** `autoG2Rate` / `autoG2Bom` = **attestations / persistence state** · **≠** automatic P5/P6 computational source.
**HARD:** flow above = **CODE ON MAIN** · **≠ PRODUCTION VERIFIED** (prod still `2.66.170`).

**Gate notes:**

- Expert Chain proceeds when `expertChainMayProceed` (ADMITTED subset) — **§5.5**.
- Pipeline/Chief pricing proceeds when `pricingReadyPartial|Final` — wymaga finance ok — **§19**.
- C2 path może dać `canonicalCostInputReady` **bez** `dossier.kosztorys`.

### 7.2 Flagi (skrót — nie inventuj nowych)

| Flaga / switch | Rola |
|----------------|------|
| `ikEntryEnabled` | biznesowy switch IK Entry (A08-P1) |
| P5/P6 `"AUTO"\|"OFF"\|"ON"` | labor/material autonomy + research conjunct |
| P7/P8 `"AUTO"\|"OFF"\|"ON"` | bid/risk prepare |
| `ikChiefWiringEnabled` | Chief wire (często false on prod) |
| Historical AUTHORITY | **false** unless Owner GO |
| KNR-WC P4 trust flag | ON (HISTORY CLOSED) |

Live flag observability ≠ claim Global IK PV.

---

## 8. ORCHESTRA CONNECTIVITY MATRIX

| Module | Canonical function | Called by | Input | Output | Store | Owner Gate | Research | Mutates |
|--------|-------------------|-----------|-------|--------|-------|------------|----------|---------|
| Document Expert | `runIkDocumentExpert` | Orchestra engine | tender · docs · ingest | Master/OfferBoq · `expertAdmission` | OfferBoq LS / dwelling attach | G1 identity | no | OfferBoq (gated) |
| Expert Admission | `ik-expert-admission` | Document / engine | OfferBoq lines | ADMITTED/UNRESOLVED | derived | — | no | no |
| C2 handoff | `cost-c2-ingest-bid-handoff` · `resolveCostBidInput` | pipeline / pricing | FULL C2 artifacts | `kosztorysForBid` | pipeline item fields | Owner Map | no | **not** `dossier.kosztorys` |
| Multi-BOQ | `composeDwellingOfferBoq` | dwelling pricing | mapped docs | OfferBoq v5 + provenance | LS multi-dwelling | Owner Map | no | LS package |
| Owner Map | `documentToDwelling` | Hub / Host | docs · dwellings | allMapped / PackageGate | `kw-multi-dwelling-package-v1` | Owner | no | LS |
| KNR Expert | `ik-knr-expert` + KL | Orchestra | lines · catalogBasis | hints / PENDING_VERIFY | `kw-knr-catalog` (+ discovery) | KL-6 VERIFY | public discovery on MISS | catalog on Owner VERIFY |
| Historical | `lookupHistoricalExecuted` | KNR / Host | jobs ATH index | EXACT/FAMILY/MISS | in-memory | authority GO | no | no (authority=false) |
| Classification | `classifyEstimatorPricingPlane` | Labor/Material/IR | text/unit | LABOR/MATERIAL/COMPOUND/UNKNOWN | none | — | gates research | no |
| Identity / G1 AUTO | `runIkIdentityPhase` (+ `auto-g1-accept-contract`) | Orchestra | ADMITTED lines | work identity · `matchMethod: auto_contract` | OfferBoq | G1 routine AUTO · exception Owner | conditional | gated persist (B1 on main) |
| Auto G2 RATE∥BOM | `runIkAutoG2Phase` (+ `auto-g2-accept-contract`) | Orchestra (after trusted G1) | trusted identity | `autoG2Rate` / `autoG2Bom` attestations | OfferBoq | G2 conditional AUTO · exception Owner | no invent | attestation only · **≠** Catalog OUR RATE write (B2 on main) |
| Labor Expert | `ik-labor-expert` / P5 | Orchestra | classified LABOR | rateStatus · candidate | Work Catalog · Evidence | G2 Labor: AUTO_RATE REUSE · Owner Accept exception | selective on MISS | Catalog on Accept (exception) / REUSE on CURRENT |
| Material Expert | `ik-material-expert` / P6 | Orchestra | classified MATERIAL | priceStatus · candidate | Price Memory | G2 Material Accept exception (+ Chief) · AUTO_BOM pack/LABOR_ONLY | DIY selective on MISS | PM on Accept (exception) |
| Leaf Research | `ik-leaf-research-orchestrator` | Orchestra / composite path | pack-bound leaves | leaf labor/material research | session dedupe | **no Accept** | leaf only | **no** OUR RATE/PM ACTIVE |
| Composite | `ik-composite-both-hold` | Orchestra | BOTH_HOLD rows | leaf costs → F5 | none | — | via leaf orch. | no Accept |
| F5 | `computePositionCost` | Composite / P7 / Bid | OUR RATE + SELL + BOM | position PLN | ephemeral | — | no | no |
| P7 | `runIkP7PositionCostBid` | Orchestra | F5 results | bid proposal prepare | none | Final Bid ≠ P7 | no | no |
| P8 | `runIkP8RiskDecision` | Orchestra | P7 + validation | risk prepare | none | Owner | no | no |
| Owner Gates | `ownerGate` API | UI panel | queue rows | Accept/Reject (**exception** for G1/G2 routine) | Catalog / PM / OfferBoq | G1 routine = **AUTO_G1** · G2 routine = **AUTO_G2** conditional · G3 = Owner | G1/G2: auto under contract · G3: no | G1: `auto_contract` · G2: REUSE/pack · Owner: on Accept |
| Chief | `runChiefOrchestrator` | DetailPage | pricing readiness | Case/Task dossier | in-memory | — | no | session |
| NG11 readiness | `derive-pipeline-readiness` | `useTenderPipelineRuntime` | dossier · `kosztorysForBid` · finance | `canonicalCostInputReady` · `pricingReady*` | derived | finance ok | no | no |
| DIY Research | `createSelectiveDiyTrioResearchProvider` | Material / leaf | material key · region | quotes / PROVIDER BLOCK | Edge + PM | Accept later | **YES (DIY)** | PM only on Accept |
| Labor Research | `runSelectiveWorkRateResearch` | Labor / leaf | workId · unit | Evidence/candidate | Evidence KV | Accept | **YES (labor allowlist)** | Catalog on Accept |
| Experience | `buildAnalysisObservation` | Host | orchestra snapshot | Live Viz / EC overlay | none | — | no | no |

---

## 9. CURRENT DECISION TREE

> **§ numeracja Master:** ten rozdział = operacyjne Decision Tree (dawniej §10.0).
> **PRIMARY CONTINUITY CONTRACT.**

### 9.0 Snapshot (2026-09-09 · GO65)

| Pole | Wartość |
|------|---------|
| **CURRENT CASE BRANCH** | **ŚRODA A0.2** — Work Catalog coverage |
| **Środa tender** | `08deff6c-bc34-619e-b346-0300010ce2e5` |
| **Środa status** | 8 CatalogWork · KV rev 57 LIVE · frontend PV **VERIFIED (OD-OCR-37)** · L+T+U admission follow-up **CLOSED / IMPLEMENTED @ `bce0ba23`** |
| **CHROBREGO** | **CLOSED** · `08df0363-7b22-e462-ab56-940001283cba` · **56/0** · G3 **159000 net / 36570 VAT / 195570 gross** |
| **CURRENT ACTIVE CAPABILITY TRACK** | **TPI/729 Document→C2→OfferBoq→NG11** |
| **CURRENT OPEN NODE** | **`OWNER_FINANCE_NOT_OK`** |
| **CURRENT NEXT LEGAL** | **Owner GO only** |
| **MAIN AUTO G1/G2** | **IMPLEMENTED ON MAIN** (`42a82b08` / `923ea4b3`) · **≠ PV** |
| **PRODUCTION** | **`2.66.170` @ `9d22263`** — B1/B2 **NOT** production verified |
| **GLOBAL IK PV** | **NO** |

```text
ŚRODA A0.2 (CURRENT CASE BRANCH)
  ├── A0.2 CatalogWork coverage ………… CLOSED / PV (frontend OD-OCR-37)
  ├── L+T+U admission follow-up ……… CLOSED / IMPLEMENTED @ bce0ba23
  └── dalszy Środa / REAL SOURCE ……… tylko Owner GO (≠ reopen CHROBREGO)

CHROBREGO (CLOSED CASE)
  ├── G1 Identity …………………… CLOSED / PASS
  ├── G2 Labor m² + residual ……… CLOSED / PASS
  ├── G2 Material LP22 …………… CLOSED / PASS
  ├── Cutover 56/0 ………………… PASS
  └── G3 Final Bid ………………… CLOSED / PERSISTED (159000/195570)
      ★ NIE REOPEN

CAPABILITY TRACK — TPI/729 (NIE nowy global CASE)
  ├── Hydration DESIGN-C ………… CLOSED / PV @ 75d0f090
  ├── OCR → C2 ingest …………… CLOSED / PV (OD-OCR-47 era + later)
  ├── C2 parent admission ……… CLOSED / PV @ b5d8aa9f (+ docs e025527d)
  ├── C2 → kosztorysForBid / OfferBoq CLOSED / PV @ ad438386 / 2.66.168
  ├── NG11 C2 align (partial formula) CLOSED / PV @ 00b10b97
  ├── AUTO G1 IdentityPhase ……… IMPLEMENTED ON MAIN @ 42a82b08 · ≠ PV
  ├── AUTO G2 RATE∥BOM …………… IMPLEMENTED ON MAIN @ 923ea4b3 · ≠ PV
  ├── Gładzie mapping / leaf research … PARTIAL (see §17)
  └── ★ CURRENT OPEN: OWNER_FINANCE_NOT_OK
        → Chief not_ready / pricing_not_ready
        → Cost Expert null · Expert Workspace hidden
        → NEXT = Owner GO only
        → B1/B2 do NOT auto-close finance / missing OUR RATE / provisional BOM
```

### 9.1 CASE BRANCH — ŚRODA A0.2 (CURRENT)

**Cel:** pokrycie Work Catalog dla Środy (8 pozycji) — **nie** pełny Final Bid Środy w tym węźle.
**Boundary L+T+U:** `filterOfferBoqLtuAdmission` w mapping — after P1+P2, before sort/TOP-4.
**NIE** invent Expert · **NIE** przepinaj Środy przez CHROBREGO.

### 9.2 CASE BRANCH — CHROBREGO (CLOSED)

**CLOSED NODE:** `CHROBREGO G1+G2+G3 CLOSED — 56/0 — FINAL BID 159000 NET / 195570 GROSS`.
**Ochrona:** nie reopen identity/labor/material/bid branches „dla wygody”. Benchmark regresji line-tolerant: **56/56 admitted**.

### 9.3 Capability tracks (równoległe — nie Decision Tree case)

| Track | Status | Tip / checkpoint |
|-------|--------|------------------|
| Orchestra architecture | VERIFIED (code) | §5 / §7 |
| Core E2E harness | GREEN (CODE/TEST) | ≠ global PV |
| OCR B1 / JBig2 / PSM11 | CLOSED / VERIFIED | HISTORY tips 2.66.139–140 |
| C2 real ingest structure | PRODUCTION VERIFIED | OD-OCR-47 + TPI evidence |
| Track B lean cloud | CLOSED / VERIFIED | lean · no cloud FULL authority |
| Authoritative ingest persist | CLOSED | OD-OCR-45 HISTORY `2f3d1847` |
| Line-tolerant admission | CLOSED / PV | `a5d19047` |
| TPI FULL hydration DESIGN-C | CLOSED / PV | **`75d0f090`** |
| C2→OfferBoq handoff | CLOSED / PV | **`ad438386`** / **2.66.168** |
| NG11 C2 pricingReadyPartial align | CLOSED / PV | **`00b10b97`** |
| AUTO G1 main integration (B1) | **IMPLEMENTED ON MAIN** · **≠ PV** | **`42a82b08`** / tip `2.66.192` |
| AUTO G2 main integration (B2) | **IMPLEMENTED ON MAIN** · **≠ PV** | **`923ea4b3`** / tip `2.66.193` |
| TPI Full IK E2E Document→…→Final Bid | **OPEN / NOT VERIFIED** | — |
| GLOBAL IK PV | **NO** | — |

### 9.4 ŚRODA A0.2 — szczegóły CASE (CURRENT)

| Pole | Wartość |
|------|---------|
| Tender ID | `08deff6c-bc34-619e-b346-0300010ce2e5` |
| Cel węzła | Work Catalog coverage (**8** CatalogWork) |
| KV | **rev 57 LIVE** |
| Frontend PV | **VERIFIED (OD-OCR-37)** |
| L+T+U follow-up | **CLOSED / IMPLEMENTED @ `bce0ba23` · VERIFY PASS** |
| Kod L+T+U | `src/lib/tender-offer-boq-ltu-admission.ts` · `filterOfferBoqLtuAdmission` |
| Boundary | OfferBoq mapping admission — **after P1 + P2**, **before** sort / TOP-4 |
| P1/P2/scoring/TOP-4/F5 | **UNCHANGED** przez L+T+U |
| Co NIE jest celem A0.2 | Final Bid Środy · reopen CHROBREGO · nowy Expert · auto TPI CASE |

```text
ŚRODA A0.2
  ├── CatalogWork ×8 ……………… IMPLEMENTED + KV LIVE
  ├── Frontend PV ………………… VERIFIED (OD-OCR-37)
  ├── L+T+U admission …………… CLOSED / VERIFY PASS @ bce0ba23
  ├── Capability overlays ……… (hydration / line-tolerant / TPI)
  │     NIE przesuwają CURRENT CASE
  └── NEXT beyond A0.2 ………… tylko Owner GO
```

**HARD:** hydration PV, line-tolerant PV, C2/NG11 TPI PV — **nie** zmieniają CURRENT CASE na TPI.

### 9.5 CHROBREGO — CLOSED CASE (benchmark)

| Pole | Wartość |
|------|---------|
| Tender ID | `08df0363-7b22-e462-ab56-940001283cba` |
| Cutover | **56/0 PASS** (`completeLineCount=56`, `gapLineCount=0`) |
| G3 | net **159000** / VAT **36570** / gross **195570** |
| Line-tolerant regression | **56/56 admitted** · `readyForExperts=true` · `mayProceed=true` |
| Status | **CLOSED CASE — NIE reopen** |

```text
CHROBREGO (CLOSED)
  ├── G1 Identity ……………… CLOSED / PASS (AUTO-SAFE + OWNER_REVIEW → 56/0)
  ├── G2 Labor m² ……………… CLOSED / PASS (LP 7/8/12/13/14 · OUR RATE 22.90)
  ├── G2 Labor residual ……… CLOSED (LP48 mb · LP20 mb · LP30 kpl)
  ├── G2 Material LP22 ……… CLOSED / PASS (SELL 200 · margin 0%)
  ├── Cutover 56/0 …………… PASS
  └── G3 Final Bid …………… CLOSED / PERSISTED
```

Wybrane stawki (HISTORY / benchmark — nie inventuj nowych):

| LP / work | OUR RATE / material | Plane |
|-----------|---------------------|-------|
| Paint m² cluster | 22.90 · margin 20% owner | LABOR |
| `legacy-malowanie-rur-mb` | 31.25 | LABOR_ONLY |
| `p2b-listwa-wykonczajaca-prog-plytki-mb` | 80 | LABOR_ONLY |
| `p2b-demontaz-wanny-kpl` | 200 → SELL 250 | LABOR_ONLY |
| `p2b-skrzydla-drzwiowe-wewnetrzne-m2` | material 200 · margin 0% | MATERIAL |

**DF G3:** [`IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE.md) · **≠** `submittedBidPln` · **≠** Experience Phase 5.

### 9.6 Capability vs Case — reguła interpretacji

| Obserwacja | Czy zmienia CURRENT CASE? | Czy zmienia CURRENT OPEN NODE toru TPI? |
|------------|---------------------------|----------------------------------------|
| Środa CatalogWork PV | CASE = ŚRODA (już) | nie |
| CHROBREGO G3 | nie (CLOSED case) | nie |
| TPI hydration PV | **nie** | nie (już CLOSED w torze) |
| C2→OfferBoq PV | **nie** | przesuwa tor do NG11/finance |
| NG11 align PV | **nie** | **OPEN NODE = OWNER_FINANCE_NOT_OK** |
| Owner Accept gładzi | **nie** (chyba że Owner zmieni CASE) | może odblokować kolejny blocker |

### 9.7 Pełne drzewo systemowe (mapa modułów — NIE case tree)

```text
WGDOM / TENDERS
  └── Tender Detail
        ├── Pipeline runtime (NG11 readiness · dossier · kosztorysForBid)
        ├── Multi-Dwelling / Owner Map / PackageGate
        ├── Chief session (LEGACY-PARALLEL)
        └── IkEntryHost
              └── Orchestra sequencer
                    ├── Document + Admission
                    ├── KNR + Historical evidence + KL-3
                    ├── Identity (ADMITTED)
                    ├── Classification
                    ├── Labor P5 ↔ Work Catalog / Evidence / Accept
                    ├── Material P6 ↔ PM / DIY / Accept
                    ├── Leaf Research (pack-bound only)
                    ├── Composite BOTH_HOLD → F5
                    ├── P7 → P8
                    └── Owner Gates G1/G2 (+ G3 boundary)
```

### 9.8 Agent checklist przy Decision Tree

```text
1. Odczytaj CURRENT CASE BRANCH (ŚRODA A0.2)
2. Odczytaj CLOSED CASE (CHROBREGO) — nie reopen
3. Odczytaj CURRENT ACTIVE CAPABILITY TRACK (TPI/729 …)
4. Odczytaj CURRENT OPEN NODE (OWNER_FINANCE_NOT_OK)
5. Nie myl PV capability z Global IK PV
6. Nie inventuj NEXT — Owner GO only
7. Jeżeli raport czatu ≠ §9 → AUDIT repo + ten SSOT
```

---

## 10. CURRENT PRODUCTION + checkpoints

### 10.0 MAIN vs PRODUCTION (GO65 · LOCKED)

| Plane | Version / SHA | Meaning |
|-------|---------------|---------|
| **PRODUCTION (live)** | **`2.66.170` @ `9d22263…`** | What users run on wgdom.fun |
| **CODE MAIN (origin)** | tip **`2.66.193`** @ **`923ea4b3`** | Includes B1+B2 AUTO G1/G2 |
| **B1 checkpoint** | tip **`2.66.192`** @ **`42a82b08`** | AUTO G1 on main |
| **Equality?** | **NO** | **`main` ≠ PRODUCTION** until Owner deploy + PV |

**HARD:** Do **not** claim B1/B2 PRODUCTION VERIFIED. Do **not** invent deploy in docs GO.

### 10.1 LIVE production (odczyt 2026-09-09)

| | |
|--|--|
| **version.json** | `version`: **2.66.170** · `commit`: **9d22263** |
| **Full SHA (short)** | `9d222630…` (exact short from live) |
| **B1/B2 on prod?** | **NO** |
| **Authority** | **LIVE fetch** wygrywa z documentary tip w `09_PRODUCTION_BASELINE.md` gdy rozjeżdżają się |
| **HISTORY note** | Prior Master snapshot 2026-09-08 listed prod `2.66.168` @ `00b10b97` (NG11) — superseded by later live tip; NG11 capability remains CLOSED/PV |

### 10.2 Git-verified checkpoints (messages exact)

| SHA (short) | Message (verified) | Rola |
|-------------|-------------------|------|
| `75d0f090` | hydrate full ingest snapshots on pipeline load | Hydration DESIGN-C PV |
| `b5d8aa9f` | scope C2 parent admission for multi-boq | C2 P lineage-only admission |
| `ece4f8be` | fix KL-3 knowledge busy lifecycle | KL-3 busy→ready |
| `e025527d` | docs: reconcile C2 admission and KL-3 lifecycle | docs reconcile |
| `93d701eb` | surface compound research hold | RESEARCH_HELD_COMPOUND surface |
| `05efc528` | enable compound leaf research | Leaf Research Orchestrator |
| `9e5f8019` | legal package-to-kg conversion | Phase C package→kg (UI tip 2.66.167 era) |
| `60bd33ac` | gladz gypsum economy product host spec | Host `cw.product.gladz_gipsowa` |
| `ad438386` | C2 FULL ingest → kosztorysForBid / OfferBoq handoff | C2→OfferBoq **PV CLOSED @ 2.66.168** |
| `00b10b97` | NG11 pricingReadyPartial accepts C2 kosztorysForBid without dossier.kosztorys | NG11 align **PV** |
| `42a82b08` | integrate autonomous g1 into identity phase | **B1 AUTO G1 ON MAIN** · tip `2.66.192` · **≠ PV** |
| `923ea4b3` | integrate autonomous g2 into orchestra | **B2 AUTO G2 ON MAIN** · tip `2.66.193` · **≠ PV** |
| `d0d6e83d` | close labor knowledge evidence learning loop | Knowledge Loop labor path on main (prior) |

**HARD:** nie inventuj semantyki commitów poza tabelą / `git log`.
**HARD (GO65):** B1/B2 commits = **IMPLEMENTED ON MAIN** · **not** production deploy evidence.

### 10.3 TPI/729 case card (capability evidence)

| Pole | Wartość |
|------|---------|
| **Notice** | **TPI/729/2026** |
| **Title** | Remont lokalu nr 4 Kościuszki 46 Szczecinek |
| **OCDS** | `ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c` |
| **Przedmiar.pdf SHA** | `6D0A94022BBA30DBE455FC146129E0FE0D326D547333DF1B7E568788BD264F8A` |
| **FULL P90** | D1=**69** · D2=**3** · D3=**18** |
| **Owner Map** | all 4 → dwelling **`kosciuszki-46-4`** |
| **C2** | **P lineage-only** · D1/D2/D3 **admitted** · **89** lines · **`LINE_COUNT_MATCH`** · **`C2_ADMITTED:compose`** · OfferBoq **89** schema **v5** |
| **C2→OfferBoq** | **CLOSED / PV** @ **`ad438386`** / **2.66.168** |
| **Zakaz** | **NO write C2 into `dossier.kosztorys`** |
| **Baseline counters (UNCHANGED by B1/B2)** | Billable **89** · Trusted **59** · Ready **52** · Blocked **37** · Trusted incomplete **7** |
| **B1/B2 effect on TPI** | **NONE automatic** — missing OUR RATE / provisional BOM / MISSING_BOM / Finance **not** magically resolved |

Stub osobny (no alias/merge): `bzp:TPI/729/2026`.

### 10.4 NG11 PV observation @ `00b10b97` (TPI)

| Signal | Value |
|--------|-------|
| `canonicalCostInputReady` | **true** |
| `canComputeTenderPricingAuto` | **true** |
| `dossier.kosztorys` | **null** |
| `ownerFinanceProposal.ok` | **false** (real `resolveTenderPricingAutoProposal`, mode **`offer_boq_ai`**) |
| `pricingReadyPartial` | **false** |
| `pricingReadyFinal` | **false** |
| `pricingReady` | **false** |
| Chief | **`not_ready` / `pricing_not_ready`** |
| Cost Expert | **null** |
| Expert Workspace | **hidden** |
| **FIRST BLOCKER** | **`OWNER_FINANCE_NOT_OK:ok=false`** |
| Pricing safety | **PASS** (demand=1 gładź · PM=0 · quotes=0 · OUR RATE null · margin null) |

**Interpretacja LOCKED:** to **NIE** jest implementation failure NG11 align.
NG11 correctly odblokowuje COST INPUT przez `kosztorysForBid` bez `dossier.kosztorys`; **partial/final nadal wymagają** `ownerFinanceProposal.ok === true`. Formuła Chief / pricing readiness **UNCHANGED** poza akceptacją C2 canonical input.

### 10.5 Track B lean contract (CLOSED — nie reopen)

```text
kw-tenders-pipeline + kw-tenders-pipeline-guard
lean = stripTenderPipelineForCloud
omission ≠ deletion:
  noticeHtml · kosztorys.rows · artifact.snapshot · changeMonitor.events · qaMonitor.events
guard: schemaVersion · bundleRevision · bundleAt · itemCount · deletedIdsRevision
       items: id · updatedAt · ikFinalBid
```

`bundleRevision` **nie** jest CAS. Concurrent +1 ID → existing write-safety **BLOCK** · no auto-retry.

**HARD:** cloud lean **≠** cloud FULL authority. FULL artifacts żyją w `kw-tender-ingest-v1` (+ local hydrate).

### 10.6 OCR / C2 timeline (compact HISTORY — capability only)

| ID / tip | Status | Skrót |
|----------|--------|-------|
| OD-OCR Design Freeze | CLOSED | browser/local OCR · fail-soft · B1 |
| JBig2 `e46595e7` / 2.66.139 | CLOSED / VERIFIED | pdf.js WASM |
| PSM11 `ea7cfdc3` / 2.66.140 | CLOSED / VERIFIED | SPARSE_TEXT |
| C2 wiring 2.66.141–143 | PRODUCTION VERIFIED | derived P+D1+D2+D3 |
| Track B migrate 2.66.144 | CLOSED / VERIFIED | lean ~58% |
| Raw-bypass hotfix 2.66.145 | CLOSED / PASS | writers in cloud-sync |
| Stale-client gate 2.66.146 | CLOSED / VERIFIED | APP_VERSION gate |
| OD-OCR-45/47 `2f3d1847` / 2.66.147 | PASS / HISTORY | Owner Ingest→OCR→C2→cloud shells |
| Line-tolerant `a5d19047` | CLOSED / PV | DOCUMENT TRUTH ≠ EXPERT ADMISSION |
| Hydration `75d0f090` | CLOSED / PV | FULL ingest → pipeline load |
| C2 admit `b5d8aa9f` | CLOSED / PV | P lineage-only |
| C2 handoff `ad438386` | CLOSED / PV | kosztorysForBid / OfferBoq |
| NG11 align `00b10b97` | CLOSED / PV | partial + C2 cost input |

**HARD:** wiersze HISTORY **≠** LIVE tip · **≠** CURRENT CASE.

### 10.7 Explicit answers (Owner / cold-start FAQ)

| Pytanie | Odpowiedź |
|---------|----------|
| Gdzie jest Internet search? | Labor allowlist research + DIY Edge (LM/Casto/OBI) + KNR public discovery allowlist — **§16** |
| Kiedy Research allowed? | MISS + flags executeResearch + plane LABOR/MATERIAL (lub leaf) · nie UNKNOWN · nie COMPOUND parent |
| COMPOUND held? | Tak — `RESEARCH_HELD_COMPOUND` / BOTH_HOLD / często NO_PACK |
| Leaf exception? | Tak — `05efc528` pack-bound leaf only · **bez** Accept/PM/OUR RATE |
| Chief formula unchanged? | **Tak** — nadal wymaga finance ok dla pricingReady* / start Case |
| C2 pisze do `dossier.kosztorys`? | **NIE** — tylko `kosztorysForBid` → OfferBoq |
| Czy TPI jest nowym CURRENT CASE? | **NIE** — capability track; CASE = ŚRODA A0.2 |
| Co jest FIRST OPEN? | **`OWNER_FINANCE_NOT_OK`** |
| Czy NG11 fail? | **NIE** — align PV PASS; blocker = finance proposal |
| Global IK PV? | **NO** |
| CHROBREGO? | **CLOSED** — nie reopen |
| NEXT? | **Owner GO only** |

---

## 11. DOCUMENT / OCR / C2 / Multi-BOQ / OfferBoq

### 11.1 Ingest

- **Store:** `kw-tender-ingest-v1` = **FULL browser/session artifact registry** · **NOT** cloud SSOT · **nie** w `DATA_KEYS`.
- **Cloud pipeline:** `kw-tenders-pipeline` = **lean** (snapshots mogą być omitted) — Track B **CLOSED**.
- **Hydration:** FULL z ingest → `loadTendersPipeline` hydrate → `applyIngestArtifactsToPipelineItem` · checkpoint **`75d0f090`**.
- **Legal PV path:** restore FULL z dump dla obserwacji PV = **valid observation path** (nie = auto cloud FULL authority).

### 11.2 OCR

- Browser/local · fail-soft · qualitative confidence · B1 only (B2 deferred).
- JBig2 / PSM11 = CLOSED/VERIFIED (HISTORY).
- OCR **nie** jest drugim parserem Multi-BOQ.

### 11.3 C2 derived documents

```text
P  = original PDF          → lineage / registry only (gdy complete derived set)
D1 = construction Norma
D2 = sanitary Norma
D3 = electrical KOBRA/ORGBUD
```

Każdy derived: własny `documentId` · `parentDocumentId=P` · page range · branch · content hash.
**C2 ≠ nowy Multi-BOQ** — reuse Multi-BOQ przez derived cost documents.
**C2 parent admission (`b5d8aa9f`):** gdy complete C2 set (≥2 derived, explicit distinct branches) i required derived w mapie dwelling → **P NOT admitted** do cost-compose; `sourceLineCount` z admitted set; reason **`LINE_COUNT_MATCH`**.

### 11.4 C2 → OfferBoq handoff (`ad438386`)

```text
FULL C2 (P lineage-only + D1/D2/D3 FULL)
  → admitC2ComposeArtifacts + mergeDwellingArtifactLines
  → usable kosztorysForBid
  → OfferBoq (schema v5)
```

**HARD:**

- **bez** kopiowania P=90 do compose
- **bez** drugiego resolvera C2
- **bez mutacji `dossier.kosztorys`**
- test: `test-c2-ingest-bid-handoff.mjs`

### 11.4a TPI C2 structure (capability evidence)

```text
TPI/729/2026 · Przedmiar.pdf · FULL P90
P  = original PDF                 → lineage/registry only
D1 = construction Norma           → admitted (69)
D2 = sanitary Norma               → admitted (3)
D3 = electrical KOBRA/ORGBUD      → admitted (18)
Owner Map: P+D1+D2+D3 → kosciuszki-46-4
Compose admitted = D1+D2+D3 = 89
Integrity: LINE_COUNT_MATCH
Flag path: C2_ADMITTED:compose
OfferBoq: 89 lines · schema v5
```

Canonical pipeline ID: `ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c`
Stub (osobny, no alias/merge): `bzp:TPI/729/2026`

Przedmiar.pdf SHA:
`6D0A94022BBA30DBE455FC146129E0FE0D326D547333DF1B7E568788BD264F8A`

### 11.5 Multi-BOQ / Multi-Dwelling / OfferBoq

- Owner `documentToDwelling` HARD.
- OfferBoq **v5** + `lineProvenance`.
- `legacy_single` + `resolveKosztorysSnapshotForPricing` KEEP.
- COST-MULTI = branch ≠ dwelling.
- PackageGate / SUM → istniejący Bid stack.

---

## 12. IDENTITY / CLASSIFICATION

> Identity plane ≠ rate plane. **IdentityCandidate** (GO35–41) = first-class proposal entity — see **§16A.11**.

### 12.1 Classification Gate (przed research)

| Plane | Research |
|-------|----------|
| **LABOR** | allowed when MISS + executeResearch + flags |
| **MATERIAL** | allowed when MISS + executeResearch + flags |
| **COMPOUND** | **parent HOLD** · `RESEARCH_HELD_COMPOUND` · leaf exception §16/§17 |
| **UNKNOWN** | **HOLD** · zero invent |

Pliki: `classification-gate.ts` · `ik-classification.ts`.
Surface hold: commit **`93d701eb`**.

### 12.2 Identity

- Orchestra `runIkIdentityPhase` na **ADMITTED** only.
- Canonical key: **`lineId`**.
- KNR↔WC bridge P3/P4: Owner-gated CREATE / trusted seam — **nie** silent invent.

#### 12.2.1 G1 autonomy policy (GO20 · OWNER SUPERSEDE · 2026-09-08)

> **SUPERSEDES** prior Master §20 row «G1 Auto = **no**» and AUTONOMY-03 «Accept NEVER AUTO» **for routine G1 identity**.  
> Historical Auto=no remains **HISTORY** for pre-GO20 audits — **not** current product law.  
> DF: [`AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md`](./AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md) · GO19 audit `.tmp/goa-tpi729-autonomous-g1-v1.*` · GO20 `.tmp/goa-tpi729-autonomy-policy-v1.*`.

| Transaction | Meaning | Normal path? |
|-------------|---------|--------------|
| **A. `AUTO_G1_ACCEPT`** | resolve → validate `AUTO_G1` contract → durable package persist (`matchMethod: auto_contract`) → continue | **YES — routine** |
| **B. Owner G1 Accept/Edit/Reject** | `manualOverrides` + `matchMethod: manual` → persist | **NO — exception / correction only** |
| **C. EXCEPTION / HOLD** | contract FAIL after permitted retries → real runtime exception state | **YES — fail-closed** (≠ «click Accept») |

```text
ROUTINE PATH (website):
  resolve → validate AUTO_G1 contract → AUTO persist → continue

EXCEPTION PATH:
  AUTO attempt → FAIL → permitted resolution/research (if allowed) → re-validate
  → still FAIL → EXCEPTION/HOLD (escalation available; not required as normal UX)

FORBIDDEN AS ROUTINE:
  recommend → Owner Accept → persist
```

- **`manualOverrides`:** human correction / escalation **only** — **not** the sole durable identity mechanism after B1 `AUTO_G1_ACCEPT` on main.
- **Provenance (selected name):** `matchMethod = "auto_contract"` — **IMPLEMENTED ON MAIN** @ **`42a82b08`** (B1 / tip `2.66.192`) · GO21 = earlier WIP/policy track history · do not invent a second name.
- **Runtime on main:** **B1 GO60/GO61** — IdentityPhase wire · locked GK rule · soft-primary demote F5 AMBIGUOUS · **no** TPI Accept invent · **≠ PRODUCTION VERIFIED**.
- **HISTORY:** GO20 = policy/SSOT; GO21 = early runtime track (may have lived as WIP before B1 surgical commit).

#### 12.2.2 Orchestra route (CURRENT on main · ≠ PV)

```text
Document → C2 → OfferBoq
  → KNR / P4
  → G1 AUTO (AUTO_G1_ACCEPT)          ← B1 @ 42a82b08 · tip 2.66.192
  → G2 AUTO_RATE ∥ AUTO_BOM           ← B2 @ 923ea4b3 · tip 2.66.193
  → Classification → Coverage
  → P5 / P6 / P7 / P8                 ← P5 still lookupWorkRate (authoritative)
  → BidCutoverGate
  → Finance ok (derived)              ← still OWNER_FINANCE_NOT_OK on TPI
  → Chief
  → G3 Final Bid                      ← Owner KEEP
```

#### 12.2.3 G2 autonomy policy (GO23 · OWNER SUPERSEDE · 2026-09-08)

> **SUPERSEDES** prior Master §20 rows «G2 Labor/Material Auto = **no**» as **routine product law**.  
> Historical Auto=no remains **HISTORY** for pre-GO23 audits — **not** current target architecture.  
> DF: [`AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md`](./AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md) · GO22 audit `.tmp/goa-tpi729-auto-g2-v1.*` · GO23 `.tmp/goa-tpi729-autonomy-g2-policy-v1.*`.

| Transaction | Meaning | Normal path? |
|-------------|---------|--------------|
| **A1. `AUTO_RATE_ACCEPT`** | trusted identity → REUSE CURRENT `lookupWorkRate` (authorized) · Research→OUR RATE persist = **R1 CLOSED = NO** | **YES — conditional** |
| **A2. `AUTO_BOM_ACCEPT`** | TechnologyPack singleton resolve **or** explicit LABOR_ONLY allowlist · never invent | **YES — conditional** |
| **A. `AUTO_G2_ACCEPT`** | A1 ∧ A2 | **YES — conditional** |
| **B. Owner G2 Accept/Edit/Reject** | candidate → OUR RATE / PM via existing Accept engines | **NO — exception / correction only** |
| **C. EXCEPTION / HOLD** | MISSING rate/BOM / conflict / STALE per DF → fail-closed | **YES** (≠ force click) |

```text
ROUTINE PATH (website):
  trusted identity → AUTO_RATE (REUSE CURRENT) → AUTO_BOM (pack|LABOR_ONLY) → continue

EXCEPTION PATH:
  AUTO FAIL → research→candidate (if allowed) → Owner Accept OR still EXCEPTION/HOLD

FORBIDDEN AS ROUTINE:
  recommend → Owner G2 Accept → persist   (for lines already CURRENT + pack/LABOR_ONLY OK)
  invent rate/BOM · companyPrice→OUR RATE · Evidence→OUR RATE · MISSING_BOM→LABOR_ONLY invent
```

- **Policy CLOSED (GO23 · do not reopen):** R1 = NO Research→OUR RATE auto persist · R2 = NO STALE auto persist · R3 = NO new tender-rate plane · B1 = NO provisional `cc-w2-*` auto BOM · B2 = NO allowlist expansion · P1 = provenance required · O1 = no stronger/fresher overwrite.
- **Runtime chronology (preserve):**
  - **GO24:** AUTO G2 runtime passed in **WIP** (contract + `runIkAutoG2Phase`) — **not** yet on `main` at that time.
  - **GO62:** AUDIT detected Master overclaim «GO24 RUNTIME» vs `main`.
  - **GO63:** B2 implemented in working tree (Orchestra wire after G1).
  - **GO64:** surgical commit/push **`923ea4b3`** — **IMPLEMENTED ON MAIN**.
- **CURRENT main:** `evaluateAutoRateContract` / `evaluateAutoBomContract` · `runIkAutoG2Phase` · Owner CLOSED R1–O1 · **no** research persist · **no** provisional AUTO_BOM · **no** invent · **no** Finance unlock · **≠ PRODUCTION VERIFIED**.
- **Attestation ≠ pricing source:** `autoG2Rate` / `autoG2Bom` persist on OfferBoq · P5 continues authoritative **`lookupWorkRate`** · do **not** document autoG2Rate as OUR RATE/Catalog write plane.
- **OPEN residual:** Material PM Accept remains exception · TPI missing rates/BOM still EXCEPTION · production deploy/PV **OPEN**.

### 12.3 Unit / identity gaps (LOCKED policy)

- **LP2 `IDENTITY_GAP` / `NIEPRAWIDŁOWA_JEDNOSTKA` → LEAVE GAP** — **do not auto-fix**.
- `pkt ≠ mb` bez dowodu.
- AUTO_G1 **must not** invent unit conversion · INVALID_UNIT → EXCEPTION/HOLD.

---

## 13. KNR / HISTORICAL

### 13.1 KNR Expert

- Slice A `catalogBasis` evidence-only (PV).
- Owner mapping D → `catalogWorkId` (gated).
- KL catalog-first (`kw-knr-catalog`); on MISS → controlled public discovery → **PENDING_VERIFY** (≠ auto VERIFIED).
- KL-6 Owner VERIFY UI = CLOSED/PV (HISTORY under later tips).
- Full Phase 2E catalog product = **OPEN** (osobny GO).

### 13.2 KL-3 lifecycle (`ece4f8be`)

**Failure mode (HISTORY):** permanent `knowledgeBusy` (cancel cleanup + same-key latch / unstable deps).
**Fix:** **`ece4f8be`** — **busy → ready** · **no** permanent `knowledgeBusy` · **no** duplicate rerun deadlock.
Identity Coverage starts after KL-3 settle. MISS / `RESEARCH_UNAVAILABLE` remain fail-closed · **no** fake HIT.

### 13.3 Historical Executed

- ATH jobs → index → Host → KNR lookup.
- Flags: `HISTORICAL_EXECUTED_IMPLEMENTED=true` · **`AUTHORITY=false`**.
- **≠** KNR Catalog · **≠** auto authority.

---

## 14. LABOR

```text
LABOR plane
  → Work Catalog lookup (workId + unit)
  → OUR RATE CURRENT? YES → REUSE (HTTP 0) = AUTO_RATE_ACCEPT (REUSE) · GO23
                     NO  → selective research (allowlist) when executeResearch
                          → Evidence → Candidate
                          → Owner G2 Accept → OUR RATE   ← exception path (GO23)
                          → AUTO_RATE_PERSIST from candidate = OPEN R1 (default NO)
```

| Element | SSOT |
|---------|------|
| Catalog | `kw-wgdom-work-catalog` |
| Lookup | `lookupWorkRate` |
| Research | `runSelectiveWorkRateResearch` |
| Evidence | `kw-wgdom-labor-source-evidence` |
| Accept | `acceptWorkRateResearchCandidate` |
| Policy | [`AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md`](./AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md) §4 |

**NIGDY:** research gdy stawka CURRENT · Evidence ≠ OUR RATE · research ≠ silent Accept · `companyPricePln` ≠ OUR RATE · drugi labor catalog.

**G2 Labor:** Chief **NOT** required. Routine = **AUTO_RATE** under contract (GO23) · Owner Accept = exception · CHROBREGO m² **CLOSED/PASS** (benchmark) · Orchestra wire **IMPLEMENTED ON MAIN** (B2 @ `923ea4b3`) · **≠ PV**.
**P5:** remains on authoritative **`lookupWorkRate`** · G2 RATE attestation does **not** replace Catalog First / Evidence / Research path.

---

## 15. MATERIAL + Catalog + PM + Accept path

```text
MATERIAL plane
  → material identity → Price Memory
  → CURRENT HIT? YES → REUSE
                NO  → DIY selective research (LM/Casto/OBI)
                     → quote/purchase → commercial margin → SELL candidate
                     → Owner Accept → PM CURRENT
```

| Element | Notes |
|---------|-------|
| PM / commercial | `price-memory` · `our-price-catalog` · `computeSellPricePln` |
| DIY LIVE | Leroy Merlin · Castorama · OBI |
| DIY NOT IMPLEMENTED | **Onninen** · **TIM.pl** |
| Edge | `mmr-diy-selective-lookup` · `createEdgeDiySelectiveLookup` · `parseDiyShopHtml` |
| Provider | `createSelectiveDiyTrioResearchProvider` |
| 403→502 | Edge shop **403** mapped **502** = **PROVIDER BLOCK** · **no anti-bot bypass** |
| G2 Material Accept | requires `chiefMaterialAvailable` · Reject allowed with Chief OFF · **exception path** (GO23) |
| `mat.inv.*` | HARD-FORBID DIY invent |
| AUTO_BOM | TechnologyPack singleton **or** explicit LABOR_ONLY allowlist · DF §5 · **on main** B2 @ `923ea4b3` · **≠ PV** |

**Accept path (exception):** Candidate → Owner Gate G2 → PM write → Orchestra refresh epochs.  
**Routine BOM:** `AUTO_BOM_ACCEPT` when pack/LABOR_ONLY contract PASS (GO23 policy).  
**Research ≠ Accept.** · **MISSING_BOM ≠ invent LABOR_ONLY** (Master / DF §6).

---

## 16. RESEARCH / SCRAPING ARCHITECTURE

### 16.1 Where Internet search happens

| Domain | Entry | Transport | Legal rule |
|--------|-------|-----------|------------|
| **Labor** | `runSelectiveWorkRateResearch` | allowlisted public sources (KB/CR/SCCOT/Extradom etc.) | selective · ONE-work · cooldown |
| **Material DIY** | `createSelectiveDiyTrioResearchProvider` | Edge `mmr-diy-selective-lookup` + HTML parse | LM/Casto/OBI only LIVE |
| **KNR public discovery** | Global KNR discovery sources | allowlist → PENDING_VERIFY | **≠** auto VERIFIED |
| **Historical** | ATH fetch from known jobs | existing job bytes | **≠** web scrape catalog |

**NIE** ma: unrestricted crawl · anti-bot bypass · paywall scrape · invent Onninen/TIM.

### 16.2 When Research is allowed

```text
ALLOWED when ALL:
  · IK entry / P5|P6 research flags allow executeResearch
  · Classification plane LABOR or MATERIAL (or leaf — below)
  · Lookup MISS (HIT ⇒ HTTP 0)
  · NOT UNKNOWN parent
  · NOT COMPOUND parent research (HOLD)

FORBIDDEN:
  · COMPOUND parent / UNKNOWN parent invent
  · Accept / OUR RATE / PM ACTIVE write from research alone
  · fabricating providers
```

Research-on-Miss (AUTONOMY-08 P2) = **CLOSED/PV** (capability) · live may be NOT OBSERVABLE gdy IK OFF.

### 16.3 COMPOUND held

- Parent COMPOUND → **`RESEARCH_HELD_COMPOUND`** (labor + material lines) · surface **`93d701eb`**.
- Composite → **`BOTH_HOLD`** · often **`NO_PACK`** until technology pack binds leaves.

### 16.4 Leaf exception (`05efc528`)

**Leaf Research Orchestrator:**

- pack-bound **labor/material leaf** only
- **no parent research**
- **no Accept / PM ACTIVE / OUR RATE write**
- DRAFT pack may guide qtyFactor / materialKey — **DRAFT ≠ accepted**

### 16.5 Phase C package→kg (`9e5f8019`)

- Legal package→kg conversion when **same-product evidence**
- **`autoAccepted=false`**
- live DIY may be **blocked upstream** (PROVIDER BLOCK) — conversion ≠ force Accept

### 16.6 Auto research path (skrót)

```text
Orchestra P5/P6 async
  → classification gate
  → internal-first / catalog HIT?
       YES → reuse
       NO  → executeResearch?
              YES → provider (labor allowlist | DIY trio)
                    → candidate / evidence
                    → Owner Gate queue
              NO  → HOLD / GAP
COMPOUND parent → HOLD (+ optional leaf orch. if pack)
```

### 16.7 DIY provider matrix (LIVE vs NOT)

| Provider | Status | Entry |
|----------|--------|-------|
| Leroy Merlin | **LIVE IMPLEMENTED** | DIY trio |
| Castorama | **LIVE IMPLEMENTED** | DIY trio |
| OBI | **LIVE IMPLEMENTED** | DIY trio |
| Onninen | **NOT IMPLEMENTED** | — |
| TIM.pl | **NOT IMPLEMENTED** | — |

Wiring: `createSelectiveDiyTrioResearchProvider` + `createEdgeDiySelectiveLookup` + `mmr-diy-selective-lookup` + `parseDiyShopHtml`.

| Edge HTTP | Mapping | Meaning |
|-----------|---------|--------|
| Shop **403** | **502** | **PROVIDER BLOCK** |
| Anti-bot bypass | — | **FORBIDDEN** |

### 16.8 Leaf Research Orchestrator — kontrakt

| Rule | Value |
|------|-------|
| Commit | `05efc528` — enable compound leaf research |
| Scope | pack-bound labor/material **leaf** |
| Parent COMPOUND research | **NO** |
| Accept / PM ACTIVE / OUR RATE | **NO** |
| Session dedupe | in-orchestrator done-set |
| Surface parent hold | `93d701eb` RESEARCH_HELD_COMPOUND |

### 16.9 Package→kg Phase C

| Rule | Value |
|------|-------|
| Commit | `9e5f8019` |
| UI tip era | 2.66.167 |
| Evidence | same-product only |
| `autoAccepted` | **false** |
| Upstream DIY block | may prevent live quote — conversion ≠ Accept |

---

## 16A. KNOWLEDGE BASE / LEARNING LOOP ★★ (GO44 + GO55)

> **Owner decisions OD-43-01…OD-43-12 FROZEN** · GO43 audit · GO44 Master amendment · **GO55 = Master reconcile with GO53 / OD-52** (docs only; no runtime in GO55).  
> Sibling depth: PRICE-MEMORY-CATALOG-01 DF · IK-MIGRATION-01-P5.16-B · IdentityCandidate GO35–41 · AUTO-G2 DF · Labor Evidence GO46–GO53.

### 16A.1 Purpose — Knowledge Base

**IK Knowledge Base** = reusable knowledge accumulated from tender processing, catalogs, research, accepted identity, TechnologyPack/BOM, pricing, and historical observations.

```text
Every processed tender SHOULD contribute reusable knowledge
when sufficient evidence exists and the destination/authority
rules for that knowledge type are satisfied.
```

**Product learning loop (intended):**

```text
CATALOG FIRST
  → RESEARCH FALLBACK (when legal)
  → EVIDENCE (durable)
  → CANDIDATE (where required)
  → ACCEPT / AUTO eligibility (only where separately authorized)
  → CANONICAL KNOWLEDGE
  → INDEX
  → NEXT TENDER REUSE
```

**Runtime status (GO55 reconcile):** loop remains **PARTIAL** overall.

| Slice | Status |
|-------|--------|
| Catalog First + Research fallback (labor OUR RATE / material PM) | **IMPLEMENTED** |
| Labor Evidence **persist** (Wave-1 QUALIFIED → KV) | **IMPLEMENTED** (GO46) |
| Labor Evidence **reuse** + Research **HTTP suppress** | **IMPLEMENTED** (GO53 · OD-52 STATE_ONLY) |
| Knowledge Destination Router thin facade | **IMPLEMENTED** (GO48) · Material Evidence / Pack·BOM adapters **OPEN** |
| Material Evidence plane (parity with labor) | **NOT IMPLEMENTED** |
| Accept→Catalog (OUR RATE / PM) | **IMPLEMENTED** (separate Accept gates) |
| IdentityCandidate | **IMPLEMENTED** (GO35–41) · cloud `DATA_KEYS` **OPEN** |
| Full Knowledge Loop CLOSED | **NO** — do not claim |

**Orchestra placement (authoritative):**

```text
IK Orchestra
  → Expert Chain
    → Labor Expert
      → Catalog First (lookupWorkRate / OUR RATE)
      → Evidence (when OUR RATE MISSING — not STALE bypass)
      → Research fallback (when Evidence insufficient / STALE / conflict)
```

Knowledge Destination Router = **supporting service** for destination/persist routing.  
**NOT** another Orchestra. **NOT** another Expert Chain.

### 16A.2 Separate knowledge planes (OD-43-10)

| Plane | Role | MUST NOT be treated as |
|-------|------|------------------------|
| Work Catalog / OUR RATE | Canonical labor BASE after Accept | Evidence · companyPrice |
| Labor Evidence | Source observations | OUR RATE · PM · SELL · margin · Finance · G3 |
| Price Memory / `marketQuotes` | Material commercial CURRENT | Labor OUR RATE |
| Material knowledge (identity/hosts) | Product identity | invent from namePl |
| Research Candidate | Ephemeral / session proposal | Canonical |
| IdentityCandidate | Proposed Work identity (GO35–41) | OUR RATE · Pack ACTIVE |
| TechnologyPack / BOM | Compound leaf binding | Identity Accept |
| KNR / G177 | Norm discovery / PENDING_VERIFY | Work Catalog id |
| Historical knowledge | ATH evidence index | authority pricing |
| commercialPricing / margin | Owner margin | Research quote |
| SELL | **Derived** BASE + effective margin | Independent authority |
| Tender-specific knowledge | Case/OfferBoq/context | Global catalog overwrite |
| Legacy `companyPrice` / `companyPricePln` | Technical legacy | OUR RATE |

**HARD:** Do **not** collapse these into one generic price table. Connected planes ≠ one giant table.

```text
Evidence ≠ OUR RATE
Evidence ≠ Price Memory
Evidence ≠ SELL
Evidence ≠ margin / Finance / G3
Evidence NEVER auto-promotes to OUR RATE
```

### 16A.3 Catalog First (OD-43-09 / OD-43-12)

**Mandatory lookup order:**

```text
1. Local / catalog knowledge (Work Catalog · Price Memory · indexes)
2. Other durable reusable knowledge (Labor Evidence — when Catalog First MISS)
3. Only then Research fallback (allowlist / DIY Edge)
```

| Lookup state | Legal behavior |
|--------------|----------------|
| **HIT** (CURRENT OUR RATE / CURRENT PM) | **REUSE** · HTTP 0 · no Research · Evidence not consulted for suppress |
| **MISS** (OUR RATE missing) | may consult Labor Evidence · then Research if Evidence insufficient |
| **STALE** (OUR RATE stale) | may Research / refresh under domain policy · **Evidence MUST NOT suppress refresh** (GO53) |
| **INSUFFICIENT** | HOLD / GAP · Candidate or Owner — no fabricate |
| **AMBIGUOUS** | EXCEPTION / HOLD · preserve competitors |
| **RESEARCH REQUIRED** | MISS + Evidence insufficient + executeResearch allowed — still ≠ Accept |
| **FORBIDDEN** | UNKNOWN parent invent · COMPOUND parent research · silent canonical write |

Labor entry: `lookupWorkRate` (**only** `ourWorkRate`). Material entry: `lookupPriceMemory` / `evaluateMaterialCache`. See §14–§15.

**CURRENT OUR RATE remains stronger than Evidence.** Evidence is consulted only after Catalog First does **not** yield CURRENT OUR RATE reuse.

### 16A.4 Research fallback (OD-43-02 / OD-43-03)

Research is **fallback**, not default.

```text
Research ≠ Accept
Research ≠ OUR RATE
Research ≠ SELL
Research ≠ TechnologyPack ACTIVE
Research ≠ Identity Accept
```

Allowed when **all** of §16.2 hold (plane LABOR/MATERIAL/leaf · MISS · flags · not UNKNOWN/COMPOUND parent invent) **and** Labor Evidence reuse did not suppress (see §16A.5a).

### 16A.5 Research → Evidence (OD-43-02 · GO46)

**Owner rule:** every **meaningful** Research execution/result **MUST** produce **durable Evidence** suitable for future reuse.

| Rule | Value |
|------|-------|
| Evidence authority | Observation / provenance — **not** canonical OUR RATE / PM |
| Labor Evidence store | `kw-wgdom-labor-source-evidence` |
| Material evidence path | **NOT IMPLEMENTED** as labor-parity Evidence plane — Quotes history ≠ auto PM CURRENT |
| Candidate | may coexist with Evidence · Candidate ≠ Accepted rate |
| Labor persist runtime | **IMPLEMENTED** (GO46) — Wave-1 QUALIFIED → Evidence KV via KDR |
| Labor reuse / HTTP suppress | **IMPLEMENTED** (GO53) — see §16A.5a |

**Do not invent unsupported Evidence fields.** Preserve existing observation schemas; extend only via Owner GO + implementation.

### 16A.5a Labor Evidence Reuse / Research Suppression ★★ (GO53 · OD-52)

**Owner decision OD-52-EVIDENCE-FRESHNESS-MODE = `STATE_ONLY`.**

```text
Evidence freshness = authoritative Evidence state VALID vs STALE
There is NO calendar TTL for Evidence.
Do NOT copy OUR RATE 90-day rule to Evidence.
Do NOT invent 7/30/60/90/180 day Evidence expiry.
lastVerifiedAt for Evidence = NOT introduced (KB-06 remains OPEN).
```

**Distinction (HARD):**

| Plane | Freshness rule |
|-------|----------------|
| **OUR RATE** | Existing **90-day** catalog freshness — **unchanged** · own rule |
| **Labor Evidence** | **STATE_ONLY** · VALID eligible · STALE not eligible for suppress |

**Labor path (authoritative runtime GO53):**

```text
Labor Expert
  → Catalog First
  → CURRENT OUR RATE REUSE (HIT) → stop · HTTP 0 · Evidence not used to suppress
  → if OUR RATE STALE → Research / refresh path · Evidence MUST NOT bypass STALE
  → if OUR RATE MISSING
       → Evidence lookup (same workId)
       → evaluateLaborEvidenceReuseSufficiency
       → SUFFICIENT + VALID → EVIDENCE_REUSE → external HTTP suppressed
       → else (INSUFFICIENT / STALE / conflict / incompatible) → existing Research path
```

| Outcome | Behavior |
|---------|----------|
| VALID + sufficient | Research HTTP **suppress** · `EVIDENCE_REUSE` · PLN for Expert display only · **≠** OUR RATE write |
| STALE / insufficient / conflict | Research **allowed** (flags permitting) |
| STALE OUR RATE | Evidence **cannot** suppress refresh |
| `forceRefresh` | bypass Evidence suppress |

**Owner sufficiency policy (document only proven rules — no invented thresholds):**

1. exact canonical `workId` required  
2. exact unit required  
3. compatible labor scope required  
4. package / material / parent / compound cannot satisfy labor leaf  
5. `names_loosely` is **not** sufficient for automatic suppress  
6. one VALID observation **may** be sufficient  
7. material price conflicts **fail closed**  
8. region must be compatible where region is required  
9. STALE OUR RATE **cannot** be bypassed by Evidence  
10. Evidence **cannot** automatically become OUR RATE  

Implementation: `src/lib/work-catalog/labor-evidence-reuse-sufficiency.ts` · `evaluateLaborEvidenceReuseSufficiency` · Research seam `work-rate-research.ts` (`EVIDENCE_REUSE_POLICY = STATE_ONLY`).

**Material Evidence reuse / suppress:** **NOT IMPLEMENTED**.

### 16A.6 Knowledge Destination Router (OD-43-03 · GO48)

**Architectural contract:**

```text
Research Result
  → Knowledge Type
  → Destination
  → Authority
  → Persistence
  → Index
  → Reuse
```

| Concept | Is |
|---------|-----|
| **Knowledge Destination Router** | Supporting policy/runtime facade mapping research outputs to planes |
| **`catalog-write-router` / `saveWorkCatalogRouted`** | **Persist gate** for Work Catalog only — **≠** Knowledge Destination Router |

**Status:** contract **DOCUMENTED (GO44)** · thin facade **IMPLEMENTED (GO48)** · Labor Evidence producer wiring **IMPLEMENTED (GO49)** · Labor Evidence reuse/suppress **IMPLEMENTED (GO53)** · Material Evidence / Pack·BOM adapters **OPEN** · overall KDR = **PARTIAL** (not a second Orchestra).

### 16A.7 Knowledge Destination Matrix

| Knowledge type | Destination | Authority | Reusable | Canonical | Owner Accept required | AUTO persist canonical |
|----------------|-------------|-----------|----------|-----------|----------------------|------------------------|
| Labor rate quote | Evidence + Research Candidate → OUR RATE | Owner Accept | after Accept | OUR RATE | **YES** (exception path; AUTO_RATE_PERSIST **OPEN R1** default **NO**) | **NO** default |
| Material DIY quote | Candidate → Price Memory `marketQuotes` | Owner Accept (+ Chief when required) | after Accept | PM CURRENT | **YES** | **NO** |
| Market quote | same as material / Quotes | Owner Accept | after Accept | PM | **YES** | **NO** |
| Work identity | IdentityCandidate → CatalogWork | Owner Accept (GO39/41) | after Accept | CatalogWork.id | **YES** | **NO** |
| IdentityCandidate | `kw-identity-candidates` (local durable from OWNER_REVIEW) | Owner Review / Accept | after Accept | no | Review YES · Accept for WC | create/queue may be autonomous under GO40 |
| KNR / G177 | `kw-knr-catalog` / discovery evidence | PENDING_VERIFY → Owner VERIFY | after VERIFY | VERIFIED only after Owner | VERIFY YES | discovery≠VERIFIED |
| Technology / BOM / TechnologyPack | Pack registry / BOM adapters | separate Owner/pack gates | pack-bound | ACTIVE pack | pack ACTIVE ≠ Identity Accept | AUTO_BOM only under GO23 contract |
| Supplier / regional info | Evidence / source metadata | observation | PARTIAL | no | OPEN | OPEN |
| Historical observation | Historical index | authority=false | evidence | no | — | index only |
| Tender-specific price | tender/OfferBoq/context | case | case-scoped | no global overwrite | case | no |
| Labor Evidence | Evidence KV | observation | **YES** when VALID+sufficient (GO53) | no | no for observe | persist **IMPLEMENTED** (GO46) · **≠** OUR RATE |
| Material Evidence | — | — | — | — | — | **NOT IMPLEMENTED** |
| Research Candidate | session / Orchestra | candidate | **NO** until Accept | no | for canonical | candidate create YES · Accept NO |
| Margin | `commercialPricing` / settings | Owner | YES | item/global | manual / floor apply | no from Research |
| SELL | derived `computeSellPricePln` | derived | no store as authority | **NO** | — | never as knowledge authority |
| companyPricePln | CatalogWork legacy | LEGACY | N/A | **≠ OUR RATE** | — | **FORBIDDEN** as OUR RATE seed |

Unresolved cells marked **OPEN** must not be invented in code without Owner GO.

### 16A.8 Price lifecycle (OD-43-06 / OD-43-08 / OD-43-11 · OD-52)

**Canonical distinctions:**

| Type | Meaning |
|------|---------|
| **OUR RATE** | Owner-accepted labor **BASE** (`ourWorkRate`) |
| **companyPrice / companyPricePln** | LEGACY technical — **MUST NOT** silently become OUR RATE |
| **Price Memory** | Material commercial CURRENT via `marketQuotes` |
| **Market / purchase price** | Quotes / invoice paths as implemented |
| **Evidence** | Observations — **STATE_ONLY** freshness (VALID/STALE) · **≠** OUR RATE |
| **Research Candidate** | Proposal only |
| **Historical price** | Historical index — not authority |
| **SELL** | **Derived** — BASE + **effective margin** — **not** an independent knowledge authority |

**Lifecycle timestamps (conceptual contract):**

| Field | Meaning |
|-------|---------|
| `createdAt` | first creation of the knowledge object/rate |
| `updatedAt` | last mutation of stored value |
| `effectiveAt` | when the rate/price becomes commercially effective (if/when supported) |
| `lastVerifiedAt` | last Owner/system verification that the reusable price is still valid |

**Implementation note:** existing code uses `updatedAt`, rate freshness helpers, and `freshnessStatus` / freshnessUx for **OUR RATE / PM**. Unified `lastVerifiedAt` on all planes = **OPEN** (KB-06). **Evidence** uses observation `freshnessStatus` VALID/STALE under OD-52 — **no** Evidence calendar TTL; **do not** invent Evidence `lastVerifiedAt` in GO55.

**Freshness states:**

| Plane | States / rule |
|-------|----------------|
| OUR RATE / PM | **CURRENT** · **STALE** · **MISSING** — catalog helpers · OUR RATE **90d** rule remains its own |
| Labor Evidence | **VALID** · **STALE** — **STATE_ONLY** (OD-52) · no calendar TTL |

### 16A.9 Manual vs automatic price update

| Mode | Allowed today |
|------|----------------|
| Manual OUR RATE | YES — catalog UI → `patchOurWorkRateInStore` → routed save |
| Manual PM base | PARTIAL — Accept / force-refresh Accept → Quotes |
| Manual item margin | YES — `commercialPricing` |
| Manual global margin floor | YES — `applyGlobalCommercialMarginFloorToStore` |
| Automatic Research | YES on MISS+flags **when Evidence does not suppress** (labor) |
| Automatic Labor Evidence persist | **YES** (GO46) on meaningful QUALIFIED research |
| Automatic Labor Evidence reuse / HTTP suppress | **YES** (GO53) when VALID+sufficient · **≠** OUR RATE |
| Automatic Material Evidence | **NO** / **NOT IMPLEMENTED** |
| Automatic Candidate | YES ephemeral |
| Automatic canonical OUR RATE / PM | **NO** unless separate explicit AUTO policy (R1 OPEN default NO) |

Separate: manual update · Research evidence · Candidate · Accept · canonical update.

### 16A.10 Margin architecture (OD-43-07 / OD-43-08)

**Global margin is a FLOOR.**

```text
effectiveMargin(position) = max(positionMargin, globalMarginFloor)
```

| Example | Result |
|---------|--------|
| global 20%, position 15% | **20%** |
| global 20%, position 20% | **20%** |
| global 20%, position 30% | **30%** |

**HARD:** A global margin update **MUST NEVER** lower an already higher position/item margin.

**Runtime (already implemented — do not re-implement):** `applyGlobalMarginFloor` / `applyGlobalCommercialMarginFloorToStore` in `our-price-catalog.ts`. Per-item save = explicit overwrite (Owner). Read-time labor fallback: `defaultLaborCommercialMarginPct` when item margin UNSET (explicit `0` blocks fallback).

**SELL:**

```text
SELL = BASE + effective margin
     = computeSellPricePln(BASE, effectiveMarginPct)
```

SELL is **derived** — not a knowledge authority (OD-43-11).

### 16A.11 IdentityCandidate reconciliation (OD-43-04 / OD-43-05 · GO35–41)

IdentityCandidate is a **first-class** architectural entity.

| Status | Persistence (GO37/GO38 Owner freeze) |
|--------|--------------------------------------|
| DISCOVERED / DRAFT_INTERNAL / IDENTITY_CANDIDATE | **EPHEMERAL** (pre-Owner-Review) |
| OWNER_REVIEW | **DURABLE · NO EXPIRATION** |
| ACCEPTED_CANONICAL | durable provenance |
| REJECTED | durable indefinite |
| SUPERSEDED | durable indefinite |

```text
No EXPIRED state.
No hard-delete of durable decision history.
Rejected fingerprints must not resurrect via similarity.
```

| Accept Identity | Does **NOT** |
|-----------------|--------------|
| Creates/reuses CatalogWork (GO39/41) | Activate TechnologyPack |
| | Write OUR RATE |
| | Unlock Finance |
| | Execute G3 |
| | Run A1 classification write |

**Cloud:** `kw-identity-candidates` durability/authority requirements are defined here; **automatic expansion into Supabase `DATA_KEYS` is NOT authorized** (OD-43-05 · KB-05 cloud cell **OPEN**). Separate Owner GO required.

**Control Work (TPI/729):** `cc-ic-accept-6c2b8e82` — created by explicit Owner Accept GO41 · A1/Pack/Rate/Research remain **0** until Owner GO.

### 16A.12 Learning loop & cost optimization (OD-43-09 / OD-43-12 · GO53)

```text
Tender A
  → Catalog First
  → Research if required (after Evidence miss/insufficient)
  → Evidence persist (durable — GO46)
  → Candidate
  → Owner / authorized AUTO acceptance
  → Canonical Knowledge (OUR RATE / PM)
  → Index
  → Tender B Catalog First
  → CURRENT OUR RATE REUSE  OR  Evidence VALID+sufficient → HTTP suppress (GO53)
  → else Research
```

Knowledge reuse **MUST** reduce: Supabase reads/writes · external research · duplicate research · repeated normalization · repeated candidates.

**HARD:** Process-memory cooldown alone is **insufficient** as the only protection against repeated research after reload (OD-43-12 · **KB-07 OPEN**). Durable Evidence + Catalog First + Accept are the primary protections; durable cooldown/index beyond Evidence = **OPEN** enhancement.

### 16A.13 Orphan knowledge

**Orphan** = research/evidence/candidate data that cannot be reused because destination, authority, index, or persistence is missing.

**Known (GO55 reconcile):**

| Orphan | Why | Status |
|--------|-----|--------|
| Ephemeral labor/material candidates | discarded on session end | OPEN |
| Labor research without Evidence append | main path persist **CLOSED** GO46 for QUALIFIED Wave-1 | residual edge cases only |
| APF ephemeral candidates | never OUR RATE | OPEN |
| Leaf research sans Accept | no catalog write | OPEN |
| IdentityCandidate not cloud-synced | OD-43-05 deliberate hold | OPEN |
| Material Evidence plane | not implemented | OPEN |

### 16A.14 Gap Register (GO55 · extended GO65 autonomy)

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| KB-01 | Missing Knowledge Base / Learning Loop chapter in Master | CRITICAL | **CLOSED** (GO44 §16A) · body kept current by **GO55** |
| KB-02 | Durable Labor Research Evidence + reuse/suppress | CRITICAL | **IMPLEMENTED / DOCUMENTED** — persist GO46 · reuse+HTTP suppress GO53 · Master **GO55** · Material Evidence **still NOT IMPLEMENTED** |
| KB-03 | Knowledge Destination Router | HIGH | **PARTIAL** — facade GO48 + producer GO49 + labor suppress GO53 **CLOSED** · Material Evidence / Pack·BOM adapters **OPEN** |
| KB-04 | Global margin floor absent from Master | HIGH | **CLOSED** by GO44 §16A.10 |
| KB-05 | IdentityCandidate Master reconciliation | HIGH | **CLOSED** by GO44 §16A.11 · cloud `DATA_KEYS` still **OPEN** |
| KB-06 | `lastVerifiedAt` lifecycle gap | MEDIUM | **OPEN** |
| KB-07 | Process-memory-only research cooldown/dedup | MEDIUM | **OPEN** |
| AG-01 | AUTO G1 main Orchestra / IdentityPhase integration | HIGH | **IMPLEMENTED ON MAIN** @ `42a82b08` (GO60/GO61) · **PRODUCTION VERIFY OPEN** |
| AG-02 | AUTO G2 main Orchestra RATE∥BOM integration | HIGH | **IMPLEMENTED ON MAIN** @ `923ea4b3` (GO63/GO64) · **PRODUCTION VERIFY OPEN** |

**Do not** mark entire Knowledge Loop CLOSED. **Do not** close KB-06 / KB-07. **Do not** mark Material Evidence complete.
**Do not** claim AG-01/AG-02 PRODUCTION VERIFIED. Finance / G3 / IdentityCandidate cloud remain **OPEN** as before.

### 16A.15 Amendment / Traceability Register (GO43–GO55)

| GO | Role | Verdict / tip |
|----|------|---------------|
| **GO43** | Learning-loop audit | `IK_KNOWLEDGE_LEARNING_LOOP_AUDIT_PASS_PARTIAL_LOOP_SSOT_INCOMPLETE` |
| **GO44** | Master Knowledge Loop amendment | §16A · docs only |
| **GO45** | Evidence seam audit | Wave-1 writes Evidence · Catalog First consumer then OPEN |
| **GO46** | Labor Evidence persistence | tip `2.66.188` · persist **IMPLEMENTED** |
| **GO47** | Knowledge Router audit | DISTRIBUTED · no central router yet |
| **GO48** | Knowledge Router thin facade | tip `2.66.189` · **IMPLEMENTED** · KDR overall **PARTIAL** |
| **GO49** | Evidence reuse E2E (producer + lookup) | tip `2.66.190` · HTTP suppress then OPEN → closed by GO53 |
| **GO50** | Sufficiency policy audit | policy tree · no invent thresholds |
| **GO51** | Integration / freshness audit | freshness threshold OPEN → OD-52 |
| **GO52** | STATE_ONLY decision + suppress design | **OD-52 = STATE_ONLY** · no Evidence calendar TTL |
| **GO53** | Evidence sufficiency + HTTP suppress runtime | tip `2.66.191` · `PASS_EVIDENCE_SUPPRESS_RUNTIME` |
| **GO54** | Master vs runtime audit | `PASS_AUDIT_SSOT_PARTIAL_ALIGNMENT_DOCS_STALE` |
| **GO55** | Master SSOT reconciliation | docs only · aligns §16A with GO53/OD-52 |
| **GO60** | B1 AUTO G1 IdentityPhase IMPLEMENT | tip `2.66.192` · working tree then surgical |
| **GO61** | Surgical commit B1 | **`42a82b08`** · on main · **≠ PV** |
| **GO62** | AUDIT B2 readiness / Master overclaim | GO24 was WIP-not-main |
| **GO63** | B2 AUTO G2 Orchestra IMPLEMENT | tip `2.66.193` · working tree |
| **GO64** | Surgical commit+push B2 | **`923ea4b3`** · on main · **≠ PV** |
| **GO65** | Master SSOT reconcile B1+B2 | **THIS** · docs only · main≠prod |

**Owner OD-43-01:** Master amendment **before** further A1 / TechnologyPack / autonomous rate **runtime** work on the learning path (history). Autonomy G1/G2 main wire landed via B1/B2 — Knowledge Loop labor path remains separate.

---

## 17. COMPOSITE / TECHNOLOGY PACK / gładzie

### 17.1 Composite contract

- `ik-composite-both-hold.ts` · `feedsP7Bid=false` **FROZEN**.
- Leaf Material/Labor → `computePositionCost()` **UNCHANGED**.
- Parent classification COMPOUND **UNCHANGED**.

### 17.2 TPI gładzie evidence (capability · not auto global CASE)

| Fakt | Wartość |
|------|---------|
| Raw COMPOUND | **29** |
| After mapping | **13** true gładzie · **10** painting · **6** GK |
| Gładzie bind | **13** → `legacy-gladzie_tynki-m2` |
| Status | **`RESEARCH_HELD_COMPOUND`** · **`NO_PACK`** · **`BOTH_HOLD`** |
| DRAFT pack | `pack.tpi729.gladzie_tynki.draft@0.1.0` |
| Parent | `legacy-gladzie_tynki-m2` |
| Labour | self-bind |
| Material | `mat.gladz_gipsowa` |
| qtyFactor | **4.00 kg/m²** |
| Pack state | **DRAFT only** |

**Owner-selected (NOT auto accepted):**

| Param | Value |
|-------|-------|
| OUR RATE | **45 PLN/m²** |
| Material candidate | **2.65 PLN/kg** |
| Material margin | **20%** |
| Labor margin | **25%** |
| qtyFactor | **4.00** |
| Envelope | **2.5–4.0 kg/m²** |

**Host:** `cw.product.gladz_gipsowa` exists (`60bd33ac`).
**PM:** **MISS** · demand `mat.gladz_gipsowa|cw.product.gladz_gipsowa|wroclaw|BOTH_MISSING` = **1** · **no Accept**.

**LP2:** `IDENTITY_GAP` / `NIEPRAWIDŁOWA_JEDNOSTKA` → **LEAVE GAP**.

---

## 18. F5 / P7 / P8

| Layer | Role | Mutates Final Bid? |
|-------|------|--------------------|
| **F5** `computePositionCost` | position PLN from OUR RATE + SELL + BOM/… | **no** |
| **P7** | read-only bid preparation | **no** |
| **P8** | risk/decision prepare | **no** |
| **G3** | Owner Final Bid persist | **yes** (Owner only) |

**Flags:** P7/P8 `"AUTO"|"OFF"|"ON"` (B-POLICY). OFF wins.
**Line-tolerant:** qty≤0 → GAP `NIEPRAWIDLOWA_ILOSC` · P8 NOT READY on unresolved/gaps · G3 refuse when unresolved/gaps/`packageGatePass===false`.

**CHROBREGO G3:** CLOSED/PERSISTED — **≠** TPI Final Bid · **≠** Środa Final Bid.

---

## 19. NG11 / CHIEF / canonicalCostInputReady (MAJOR)

### 19.1 Readiness formula (LOCKED · source `derive-pipeline-readiness.ts`)

```text
canonicalCostInputReady
  := hasUsableKosztorysBidLines(resolveKosztorysSnapshotForPricing(item))
  // usable kosztorysForBid — DOES NOT require dossier.kosztorys

canComputeTenderPricingAuto
  := enabled
     ∧ (partialDossierReady ∨ heavyDone ∨ canonicalCostInputReady)
     ∧ (canonicalReady ∨ resolvedCostStatus ≠ NOT_FOUND)

pricingReadyPartial
  := (partialDossierReady ∨ canonicalCostInputReady)
     ∧ ownerFinanceProposal.ok === true

pricingReadyFinal
  := ownerFinanceProposal.ok === true
     ∧ heavy parse done
     ∧ (metadata stamp ∨ legacy non-enriching)

pricingReady
  := pricingReadyFinal ∨ pricingReadyPartial ∨ (legacy combine)
```

**`00b10b97` change:** `pricingReadyPartial` / COST INPUT akceptuje **C2 `kosztorysForBid`** gdy `dossier.kosztorys` jest **null**.
**UNCHANGED:** nadal **wymaga** `ownerFinanceProposal.ok === true` dla `pricingReadyPartial`.
**Chief `createChiefSessionEngine.start` (LOCKED):**
`readyForChiefInput === true` **∧** `pricingReady === true`
(else idle + `not_ready_for_chief_input` | `pricing_not_ready`).
**NIE** przepisywać Chief na „ignore finance” / „ignore OfferBoq”.

### 19.2 TPI PV @ NG11 align (interpretacja)

| Observation | Meaning |
|-------------|---------|
| `canonicalCostInputReady=true` | C2 handoff **działa** |
| `dossier.kosztorys=null` | **oczekiwane** na C2 path |
| `ownerFinanceProposal.ok=false` | **FIRST BLOCKER** — finance proposal nie OK w mode `offer_boq_ai` |
| `pricingReady*=false` | **CORRECT** względem formuły |
| Chief `pricing_not_ready` | **CORRECT** — nie bug NG11 |
| Cost Expert null / Workspace hidden | downstream of not_ready |

**Werdykt:** NG11 align **PRODUCTION VERIFIED** jako odblokowanie COST INPUT.
**Open work:** rozwiązać **`OWNER_FINANCE_NOT_OK`** — **tylko Owner GO** (AUDIT → decyzja → ewentualny IMPLEMENT). Nie claim „NG11 broken”.

### 19.3 Chief vs Orchestra

- Chief = Case/Task/dossier presentation · material G2 Accept dependency when wiring ON.
- Orchestra = IK sequencer.
- `ikChiefWiringEnabled=false` on prod may leave Chief paths PARTIAL / NOT OBSERVABLE — **≠** license to invent second Chief.

### 19.4 No `dossier.kosztorys` write from C2

```text
C2 FULL → kosztorysForBid → OfferBoq
C2 FULL ↛ dossier.kosztorys
```

Pliki: `cost-c2-ingest-bid-handoff.ts` · `cost-multi-02.ts` · changelog 2.66.168 era.

### 19.5 Dependency chain TPI (capability)

```text
Owner Ingest FULL PDF
  → OCR / parse (HISTORY OD-OCR-47)
  → C2 derived D1/D2/D3 + P lineage
  → Owner Map all → kosciuszki-46-4
  → C2 admit (P out of compose) @ b5d8aa9f
  → hydrate FULL @ 75d0f090 (when lean cloud)
  → kosztorysForBid / OfferBoq @ ad438386   ★ PV CLOSED
  → canonicalCostInputReady=true @ 00b10b97 ★ PV CLOSED
  → canComputeTenderPricingAuto=true
  → resolveTenderPricingAutoProposal(mode=offer_boq_ai)
  → ownerFinanceProposal.ok=false
  → pricingReadyPartial/Final/Ready=false
  → Chief not_ready / pricing_not_ready
  → ★ CURRENT OPEN NODE: OWNER_FINANCE_NOT_OK
```

### 19.6 Co wolno / czego nie wolno po NG11 PV

| Akcja | Legal? |
|-------|--------|
| Twierdzić NG11 align PV PASS | **TAK** |
| Twierdzić Global IK PV | **NIE** |
| Twierdzić TPI Final Bid ready | **NIE** |
| Auto-fix `ownerFinanceProposal` | **NIE** bez Owner GO |
| Zapisać C2 do `dossier.kosztorys` „żeby Chief wystartował” | **NIE** |
| Przepiąć CURRENT CASE na TPI | **NIE** bez Owner GO |
| Reopen CHROBREGO | **NIE** |
| AUDIT root cause finance `ok=false` | **TAK** (read-only) |
| IMPLEMENT fix finance | **tylko po Owner GO** |

### 19.7 Key source files (REUSE)

| File | Role |
|------|------|
| `src/lib/tender-pipeline/derive-pipeline-readiness.ts` | readiness formulas |
| `src/app/hooks/useTenderPipelineRuntime.ts` | wires signals |
| `src/lib/cost-multi-02.ts` | `resolveCostBidInput` / `kosztorysForBid` |
| `src/lib/cost-c2-ingest-bid-handoff.ts` | C2 compose → bid snapshot |
| `src/app/hooks/useChiefOrchestratorSession.ts` | Chief pricingReady gate |
| `src/lib/tenders-bid-calculator.ts` | `resolveTenderPricingAutoProposal` |

---

## 20. OWNER GATES table

| Gate | Co | Persist | Research? | Auto? | Status |
|------|----|---------|-----------|-------|--------|
| **G1 Identity (routine)** | `AUTO_G1_ACCEPT` under contract | OfferBoq LS (`auto_contract`) | Research Again = permitted re-resolve (≠ Accept) | **YES (routine)** | **GO20 POLICY** · **IMPLEMENTED ON MAIN** B1 @ `42a82b08` · **≠ PV** · DF `AUTO-G1-ACCEPT` |
| **G1 Identity (exception)** | Accept/Edit/Reject | OfferBoq LS (`manual`) | recalc | **no** (escalation only) | UI Owner Gate · PV PASS (durable) · Reject fixtures NOT VERIFIED |
| **G2 Labor (routine)** | `AUTO_RATE_ACCEPT` REUSE CURRENT | Work Catalog **read** + OfferBoq `autoG2Rate` attestation | research → candidate ≠ Accept | **YES (conditional)** | **GO23 POLICY** · **IMPLEMENTED ON MAIN** B2 @ `923ea4b3` · **≠ PV** · DF `AUTO-G2-ACCEPT` · P5 still `lookupWorkRate` |
| **G2 Labor (exception)** | Accept candidate OUR RATE | Work Catalog write | ≠ Accept | **no** (escalation only) | `acceptWorkRateResearchCandidate` · CHROBREGO CLOSED |
| **G2 BOM (routine)** | `AUTO_BOM_ACCEPT` pack \| LABOR_ONLY | TechnologyPack / allowlist + `autoG2Bom` attestation | ≠ invent · ≠ provisional | **YES (conditional)** | **GO23 POLICY** · **IMPLEMENTED ON MAIN** B2 @ `923ea4b3` · **≠ PV** |
| **G2 Material (exception)** | Accept candidate PM | Price Memory | ≠ Accept | **no** (escalation only) | requires Chief avail · global WAIT natural candidate |
| **G3 Final Bid** | Persist `ikFinalBid` | pipeline item | no | **no** | CHROBREGO CLOSED · inne = osobny GO · **KEEP Owner** |
| **KL-6 KNR VERIFY** | DISCOVERED → VERIFIED | knr catalog | discovery ≠ verify | **no** | CLOSED/PV UI |
| **Owner Map** | document→dwelling | LS multi-dwelling | no | **no** | REQUIRED multi |
| **Margin / commercial** | owner commercialPricing | Catalog regions | no | **no** | A01 F5 MARGIN CLOSED (HISTORY) |
| **Leaf DRAFT pack** | qtyFactor / bind draft | DRAFT only | leaf research only | **no Accept** | TPI gładzie DRAFT |
| **AI Owner Authority Level A** | execute as Owner | — | — | — | **NOT AUTHORIZED** |

**HISTORY (pre-GO20):** G1 Auto = **no** — superseded by §12.2.1 for **routine** G1. Do not cite as current product law.  
**HISTORY (pre-GO23):** G2 Labor/Material Auto = **no** — superseded by §12.2.3 for **conditional routine** G2. Do not cite as current product law.  
**HISTORY (GO24):** AUTO G2 runtime existed in **WIP** and was overclaimed as «on main» until GO62; main landing = **GO64 `923ea4b3`**.  
**HARD (GO65):** «IMPLEMENTED ON MAIN» **≠** PRODUCTION VERIFIED (`2.66.170`).

**Research ≠ Accept ≠ Final Bid.**  
**AUTO_G1 ≠ invent identity / unit / price.**  
**AUTO_G2 ≠ invent rate / BOM / waste · ≠ companyPrice→OUR RATE · ≠ Evidence→OUR RATE.**  
**Finance `ok` = derived from BidCutoverGate prerequisites — not an Owner click.**

---

## 21. EXPERIENCE / OBSERVABILITY

DF: [`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md)

| Phase | Status |
|-------|--------|
| 1–2 Observation SSOT | **CLOSED / PV** |
| 3 Live Visualization | **CLOSED / PV** |
| 4 Team Conversation status overlay | **CLOSED / PV** @ `c1b3ad7d` (HISTORY tip) |
| **5** ETA · Final Wrap-up · hints B | **NOT AUTHORIZED** |

**HARD:** Experience = projekcja Orchestra · **≠** storytelling engine · **≠** LLM per expert.

---

## 22. PERSISTENCE MAP

| Key / store | Scope | Cloud? | Notes |
|-------------|-------|--------|-------|
| `kw-tender-ingest-v1` | FULL artifacts | **NO** | browser/session registry · hydrate source |
| `kw-tenders-pipeline` | lean items | **YES** | Track B strip · snapshots may omit |
| `kw-tenders-pipeline-guard` | guard meta | **YES** | count/revision · **≠** CAS |
| `kw-multi-dwelling-package-v1` | Owner Map / compose | **NO (LS)** | documentToDwelling |
| OfferBoq attach (dwelling) | lines v5 | LS | G1 persist |
| `kw-wgdom-work-catalog` | OUR RATE / works / `marketQuotes` (PM) / `commercialPricing` | **YES** | Accept writes · margin Owner |
| `kw-wgdom-labor-source-evidence` | Evidence | **YES** | ≠ OUR RATE · OD-43-02 SHOULD append on research |
| Price Memory / commercial | materials via WC Quotes | **YES** | Accept writes |
| `kw-identity-candidates` | IdentityCandidate OWNER_REVIEW+ | **NO cloud DATA_KEYS (GO44)** | local durable · OD-43-05 no auto expand |
| `kw-knr-catalog` | KNR knowledge | **YES** | PENDING_VERIFY / VERIFY |
| `kw-owner-rate-input-v1` | Owner Input | **NO (LS)** | equipment/transport |
| Chief dossier | session | memory | not cloud SSOT |
| `ikFinalBid` | Final Bid | in pipeline item | G3 Owner |

**HARD persistence:**

1. Ingest FULL ≠ cloud SSOT.
2. Cloud lean omission ≠ deletion of local truth.
3. Legal FULL restore from dump = valid **observation** path for PV.
4. **Never** use C2 compose as writer into `dossier.kosztorys`.

### 22.1 Persistence HARD rules (powtórzenie kontraktu)

```text
1. kw-tender-ingest-v1 = FULL browser/session artifact registry (NOT cloud SSOT)
2. kw-tenders-pipeline cloud = lean (snapshots may be omitted)
3. Legal FULL restore from dump for PV = valid observation path
4. C2 compose writes kosztorysForBid / OfferBoq — NEVER dossier.kosztorys
5. Track B omission ≠ deletion of local truth
6. bundleRevision ≠ CAS
7. Identity writes: routine = `AUTO_G1_ACCEPT` (`auto_contract`) · exception = Owner Gates (`manual`)
7b. Rate/BOM: routine = `AUTO_RATE_ACCEPT` / `AUTO_BOM_ACCEPT` under GO23 DF (REUSE/pack/LABOR_ONLY) · Catalog/PM **write** from research still Owner (R1 CLOSED = NO) · Orchestra wire **on main** B2 @ `923ea4b3` · attestations ≠ Catalog write · **≠ PV**
8. G3 Final Bid = Owner-only persist on pipeline item
9. Never write C2 / AUTO_G1 identity into `dossier.kosztorys`
```

### 22.2 Co wolno obserwować bez mutacji

- LIVE `/version.json`
- Read-only pipeline / OfferBoq / finance proposal reasons
- FULL dump restore **lokalnie** do PV observation (bez claim cloud SSOT)
- Harness / unit tests na fixture

---

## 23. SAFETY invariants

```text
1.  Decision Tree primacy — jeden tree · TPI ≠ auto new CASE
2.  REUSE → CONNECT → VERIFY — SEARCH BEFORE CREATE
3.  Evidence ≠ OUR RATE ≠ research quote
4.  companyPricePln ≠ OUR RATE
5.  COMPOUND parent research HOLD · leaf exception only
6.  UNKNOWN HOLD
7.  LP unit/identity GAP → LEAVE GAP (no auto-fix)
8.  C2 ↛ dossier.kosztorys
9.  pricingReadyPartial still needs ownerFinanceProposal.ok
10. Chief formula unchanged (no invent bypass)
11. No anti-bot bypass · 403→502 PROVIDER BLOCK
12. Onninen/TIM NOT IMPLEMENTED — nie udawać
13. Historical authority=false unless Owner GO
14. KNR discovery max PENDING_VERIFY
15. feedsP7Bid=false on composite BOTH_HOLD
16. G3 refuse on unresolved/gaps/package fail
17. No git add -A · no vercel deploy
18. No unrelated WIP in commits
19. GLOBAL IK PV = NO until Owner declares
20. CHROBREGO CLOSED — do not reopen
21. KL-3 must settle busy→ready (no deadlock)
22. Live /version.json = runtime authority
23. G1 routine = AUTO_G1_ACCEPT under contract (GO20) · on main B1 @ 42a82b08 · ≠ invent · ≠ first-candidate · EXCEPTION ≠ force Owner click · ≠ PV
24. G2 routine = AUTO_RATE_ACCEPT / AUTO_BOM_ACCEPT under contract (GO23) · on main B2 @ 923ea4b3 · ≠ invent rate/BOM · research→OUR RATE persist = NO (R1 CLOSED) · autoG2* = attestation · P5 = lookupWorkRate · EXCEPTION ≠ force Owner click · ≠ PV
24. G3 Final Bid remains Owner · Finance ok remains derived (not click)
```

**Pricing safety (TPI NG11 PV):** demand gładź=1 · PM=0 · quotes=0 · OUR RATE null · margin null → **PASS** (fail-closed, nie silent price).

### 23.1 Explicit anti-patterns

```text
❌ „Zróbmy dossier.kosztorys z C2, żeby Chief wystartował”
❌ „COMPOUND → odpal research na parent”
❌ „Accept 45 PLN / 2.65 PLN/kg automatycznie — Owner selected”
❌ „TPI jest teraz CURRENT CASE zamiast Środy”
❌ „NG11 zepsuty, bo pricingReady=false”
❌ „Routine G1 = Owner must click Accept for every AMBIGUOUS line”
❌ „AUTO_G1 = first candidate / invent catalogWorkId”
❌ „AUTO_G1 unlocks Finance / G3 without BidCutoverGate / Owner Final Bid”
❌ „Routine G2 = Owner must click Accept when OUR RATE CURRENT + BOM pack/LABOR_ONLY OK”
❌ „AUTO_G2 = invent rate/BOM · research candidate silent OUR RATE · companyPrice→OUR RATE”
❌ „MISSING_BOM → invent LABOR_ONLY”
❌ „Onninen już mamy” / „obejdź 403”
❌ „Global IK PRODUCTION VERIFIED”
❌ „Reopen CHROBREGO, żeby mieć wzorzec Accept”
❌ Drugi Orchestra / Chief / Catalog / Decision Tree / Master SSOT
```

### 23.2 Payroll / sync boundary

IK costing **nie** autoryzuje zmian Payroll CAS / settlement / `finalizePayrollBundleMerge` bez Gate + Owner GO.
Przy pracy IK: **nie** ruszaj `cloud-sync` merge payroll „przy okazji”.

---

## 24. CURRENT OPEN WORK

> Dependency-ordered. **FIRST = `OWNER_FINANCE_NOT_OK`.**

| # | Item | Depends on | Status | Legal next |
|---|------|------------|--------|------------|
| **1** | **`OWNER_FINANCE_NOT_OK`** (`ownerFinanceProposal.ok=false`, mode `offer_boq_ai`) | C2→OfferBoq **DONE** · NG11 align **DONE** | **OPEN / CURRENT NODE** | **Owner GO only** (AUDIT root cause → decyzja) |
| 1a | AUTO G1 main integration (B1) | GO20/GO60/GO61 | **IMPLEMENTED ON MAIN** @ `42a82b08` · **PV OPEN** | Owner deploy/PV GO only |
| 1b | AUTO G2 main integration (B2) | GO23/GO63/GO64 | **IMPLEMENTED ON MAIN** @ `923ea4b3` · **PV OPEN** | Owner deploy/PV GO only |
| 2 | Chief start / Cost Expert / Expert Workspace on TPI | #1 finance ok → pricingReady* | BLOCKED by #1 | after #1 |
| 3 | Gładzie: DRAFT pack → real pack / Accept path | Owner rates/margins selected but **not** accepted · PM MISS · DIY maybe PROVIDER BLOCK | OPEN / PARTIAL | Owner GO |
| 4 | Leaf research results → Owner Accept labor/material | #3 pack + research candidates | OPEN | Owner GO |
| 5 | LP2 IDENTITY_GAP / bad unit | — | **HOLD / LEAVE GAP** | Owner GO (no auto-fix) |
| 6 | TPI Full IK E2E → Final Bid | #1… pricing + Accept chain + G3 GO | **OPEN / NOT VERIFIED** | Owner GO |
| 7 | Środa further REAL SOURCE / beyond A0.2 | CURRENT CASE | OPEN | Owner GO |
| 8 | AUTONOMY-08 epic closeout | residual gates | OPEN | Owner GO |
| 9 | Experience Phase 5 | DF | **NOT AUTHORIZED** | Owner GO |
| 10 | Full Phase 2E KNR catalog product | KL corpus | OPEN | Owner GO |
| 11 | Material G2 Accept (global/other tenders) | Chief + natural candidate | case-by-case | Owner GO |
| 12 | Onninen / TIM providers | — | **NOT IMPLEMENTED** | Owner GO if ever |
| 13 | **KB-02** Labor Evidence persist+reuse+suppress | §16A.5 / §16A.5a | **IMPLEMENTED / DOCUMENTED** (GO55) · Material Evidence **NOT IMPLEMENTED** | Owner GO only for Material |
| 14 | **KB-03** Knowledge Destination Router | §16A.6 | **PARTIAL** | Material Evidence / Pack·BOM adapters OPEN |
| 15 | **KB-06/07** lastVerifiedAt + durable research dedup | §16A | **OPEN** | Owner GO |
| 16 | A1 / TechnologyPack / OUR RATE on `cc-ic-accept-6c2b8e82` | Identity Accept GO41 **DONE** | **OPEN** · **0** mutations | Owner GO — **after** Master learning SSOT (OD-43-01) |

**Zakaz:** invent „napraw finance” / „włącz Chief” / „Accept 45 PLN” / „AUTO OUR RATE z research” bez Owner GO.

### 24.1 Recommended Owner AUDIT questions (read-only)

Dla `#1 OWNER_FINANCE_NOT_OK` — **bez IMPLEMENT**:

1. Co dokładnie zwraca `resolveTenderPricingAutoProposal` dla TPI (reasons / gaps / missing rates)?
2. Czy OfferBoq 89 jest widoczne dla kalkulatora w mode `offer_boq_ai`?
3. Czy blocker to brak OUR RATE / PM / margin / PackageGate / inny?
4. Czy pricing safety PASS (demand/PM/quotes null) jest zgodny z oczekiwaniem fail-closed?
5. Jaki minimalny Owner GO odblokuje `ok=true` **bez** zapisu do `dossier.kosztorys`?

### 24.2 Non-goals (teraz)

- Global IK Production Verified claim
- Experience Phase 5
- Onninen / TIM providers
- Auto-fix LP2 unit gaps
- Reopen CHROBREGO
- Second Orchestra / Chief / Catalog
- Invent S10 / new Decision Tree CASE

---

## 25. CLOSED CHECKPOINTS

| Checkpoint | SHA / tip | Status |
|------------|-----------|--------|
| TPI FULL hydration DESIGN-C | `75d0f090` | CLOSED / PV |
| C2 parent admission multi-boq | `b5d8aa9f` | CLOSED / PV |
| KL-3 knowledge busy lifecycle | `ece4f8be` | CLOSED / PV |
| Docs reconcile C2+KL-3 | `e025527d` | CLOSED (docs) |
| Compound research hold surface | `93d701eb` | CLOSED / IMPLEMENTED |
| Compound leaf research enable | `05efc528` | CLOSED / IMPLEMENTED |
| Legal package→kg | `9e5f8019` | CLOSED / IMPLEMENTED |
| Gładź gypsum host spec | `60bd33ac` | CLOSED / IMPLEMENTED |
| C2→kosztorysForBid/OfferBoq | `ad438386` / 2.66.168 | **CLOSED / PV** |
| NG11 partial accepts C2 cost input | `00b10b97` / 2.66.168 | **CLOSED / PV** |
| Line-tolerant expert admission | `a5d19047` | CLOSED / PV |
| OD-OCR-47 path | HISTORY `2f3d1847` | PASS / HISTORY |
| Track B lean | HISTORY 2.66.144–146 | CLOSED |
| CHROBREGO G1/G2/G3 | 56/0 · Final Bid | **CLOSED CASE** |
| Środa A0.2 frontend PV | OD-OCR-37 | VERIFIED |
| Experience Phases 1–4 | `c1b3ad7d` era | CLOSED / PV |
| A08 P0/P1/P2 | various | CLOSED / PV |
| A08 P3 | `3822acb` | IMPLEMENTED · epic OPEN |
| Composite BOTH_HOLD | `d62eb2a4` era | CLOSED / PV |
| F5 Bid cutover rebuild | earlier | CLOSED / PV |
| Multi-BOQ / Multi-Dwelling / Ingest-01 | 2.66.43 era | CLOSED / PV |
| **GO65** Master reconcile B1+B2 main≠prod | docs only | **CLOSED (docs)** · runtime unchanged |
| **GO64** B2 surgical commit AUTO G2 | `923ea4b3` / tip `2.66.193` | **IMPLEMENTED ON MAIN** · **≠ PV** |
| **GO61** B1 surgical commit AUTO G1 | `42a82b08` / tip `2.66.192` | **IMPLEMENTED ON MAIN** · **≠ PV** |
| **GO55** Master §16A Knowledge Loop reconcile | docs · OD-52 / GO53 | **CLOSED (docs)** |
| **GO53** Evidence sufficiency + HTTP suppress STATE_ONLY | tip `2.66.191` · OD-52 | **IMPLEMENTED** (labor path; see §16A) |
| **GO49** router consumption E2E | tip `2.66.190` · Research→KDR→Evidence | **CLOSED** labor path · suppress via GO53 |
| **GO48** Knowledge Destination Router facade | tip `2.66.189` | **IMPLEMENTED** · KDR overall **PARTIAL** (Material OPEN) |
| **GO46** labor Evidence persist | tip `2.66.188` | **IMPLEMENTED** |
| **GO44** Master Knowledge Base / Learning Loop | docs · §16A · tip `2.66.187` | **CLOSED (docs)** · kept current by GO55 |
| GO43 Learning Loop audit | `.tmp/goa-tpi729-knowledge-learning-loop-go43.*` | **CLOSED (audit)** |
| GO41 GK Identity Owner Accept | `cc-ic-accept-6c2b8e82` · local WIP | **CLOSED (Accept)** · A1/Pack/Rate still 0 |

---

## 26. IMPLEMENTATION HISTORY (compact)

| Era | Skrót |
|-----|-------|
| Pre-IK / Przetargi 3.0 | TendersModule · BZP · Offer · Bid PDF |
| Pricing rebuild F4–F5 | OfferBoq → Position Cost → Bid cutover |
| Multi-Dwelling / Multi-BOQ / Ingest | N docs × dwellings · LS ingest FULL |
| IE Labor Evidence + Tablica | OUR RATE Accept data verified |
| Classification Gate | LABOR/MATERIAL/COMPOUND/UNKNOWN freeze |
| IK Entry + Autonomy 05–08 | AUTO/OFF/ON · P7/P8 · Research-on-Miss · Settings · Docs→BOQ · Owner Gates |
| KNR Expert + KL + WC bridge | catalogBasis · PENDING_VERIFY · P3/P4 trust |
| Experience 1–4 | Observation · Live Viz · EC overlay |
| CHROBREGO end-to-end | 56/0 + G3 Final Bid |
| Środa A0.2 | Work Catalog coverage CURRENT CASE |
| OCR + C2 + Track B | PDF→derived D1–D3 · lean cloud |
| Line-tolerant admission | DOCUMENT TRUTH ≠ EXPERT ADMISSION |
| TPI capability chain 2026-09 | hydrate → C2 admit → OfferBoq → NG11 align → **finance blocker** |
| Autonomy B1+B2 (main) | G1 AUTO → G2 RATE∥BOM → Classification · tips 2.66.192–193 · **≠ PV** |
| Gładzie / leaf / DIY | DRAFT pack · leaf orch. · package→kg · host gladz |

Szczegóły session closeoutów = **HISTORY** w osobnych plikach — **nie** powielane tutaj.

---

## 27. COLD START + function discovery rule

### 27.1 Cold-start order

```text
1. TEN PLIK (Master SSOT)
2. §9 CURRENT DECISION TREE — Case · Capability · Open Node
3. §16A Knowledge Base / Learning Loop (Catalog First · Evidence · Margin floor · IdentityCandidate)
4. §10 LIVE version.json + checkpoints
5. §24 CURRENT OPEN WORK (FIRST blocker)
6. docs/AI/09_PRODUCTION_BASELINE.md (documentary tip)
7. INTELLIGENT-ESTIMATOR-REUSE-MAP.md (zanim cokolwiek CREATE)
8. IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md (formal DF)
9. Architecture / Data Flow siblings (gdy potrzeba głębokości)
10. STOP — czekaj Owner GO zanim IMPLEMENT
```

### 27.2 Function discovery rule

```text
ZANIM napiszesz nowy moduł / provider / parser / gate:
  1. Grep / Glob symbolu w src/lib + src/app
  2. Sprawdź REUSE MAP (§29 + plik sibling)
  3. Sprawdź Orchestra matrix (§8)
  4. Sprawdź Decision Tree node (§9 / §24)
  5. Klasyfikuj: REUSE | CONNECT | VERIFY | NEW
  6. NEW ⇒ udokumentuj GAP + seam + Owner GO — STOP
```

**Pierwsze pytanie cold-startu:** jaki jest **CURRENT OPEN NODE** (§9 / §24) — nie „co budować od zera?”.

---

## 28. WIP / GOVERNANCE

| Rule | Value |
|------|-------|
| Tryb domyślny | **UTRZYMANIE** |
| Nowy epic / S10 / global ON Przetargi | **tylko Owner GO** |
| Experience Phase 5 | **NOT AUTHORIZED** |
| AI Owner Authority Level A execute | **NOT AUTHORIZED** |
| Commit / push | tylko jawne polecenie Ownera |
| Unrelated WIP | **nie** zagarniać do commitów IK |
| Docs tip vs live | lag **EXPECTED** |
| Invent next legal step | **FORBIDDEN** |

Pointer policy: [`IK-AI-OWNER-AUTHORITY-POLICY.md`](./IK-AI-OWNER-AUTHORITY-POLICY.md).

---

## 29. Pointers to sibling docs

| Dokument | Rola |
|----------|------|
| **TEN PLIK** | ★★ Master SSOT / cold-start IK |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | REUSE map — DO NOT DUPLICATE |
| [`INTELLIGENT-ESTIMATOR-ARCHITECTURE.md`](./INTELLIGENT-ESTIMATOR-ARCHITECTURE.md) | Architecture depth |
| [`INTELLIGENT-ESTIMATOR-DATA-FLOW.md`](./INTELLIGENT-ESTIMATOR-DATA-FLOW.md) | Data flow |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | AI continuity helper (≠ drugi Master) |
| [`IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md`](./IK-MASTER-DECISION-TREE-DESIGN-FREEZE.md) | Formal Decision Tree DF |
| [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) | Documentary production tip SSOT |
| [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) | Process entry (Gate → checklist) |
| [`../AI/PAYROLL_SAFETY_GATE.md`](../AI/PAYROLL_SAFETY_GATE.md) | Payroll Hard Gate (osobny od IK) |
| Experience DF | `IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md` |
| Continuity handoffs | `IK-MASTER-CONTINUITY-HANDOFF-*.md` — **HISTORY / session** · nie zastępują Master |
| GO43 Learning Loop audit | `.tmp/goa-tpi729-knowledge-learning-loop-go43.{json,md}` — HISTORY audit |
| GO44 Master amendment artefact | `.tmp/goa-tpi729-knowledge-learning-loop-go44.{json,md}` |
| PRICE-MEMORY / margin DF | `PRICE-MEMORY-CATALOG-01-DESIGN-FREEZE.md` · `IK-MIGRATION-01-P5.16-B-COMMERCIAL-PRICING.md` |

**DEPRECATED jako entry IK:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

---

## 30. STOP / Owner GO only

```text
════════════════════════════════════════════════════════
STOP.

CURRENT CASE BRANCH …………… ŚRODA A0.2 (UNCHANGED)
CURRENT CAPABILITY TRACK … TPI/729 Document→C2→OfferBoq→NG11
CURRENT OPEN NODE …………… OWNER_FINANCE_NOT_OK
CHROBREGO …………………… CLOSED — do not reopen
GLOBAL IK PV ……………… NO
LIVE PRODUCTION …………… fetch /version.json
  (2026-09-09: 2.66.170 / 9d22263) — B1/B2 NOT PV
CODE MAIN ………………… 2.66.193 @ 923ea4b3
  B1 AUTO G1 ……………… IMPLEMENTED ON MAIN @ 42a82b08 · ≠ PV
  B2 AUTO G2 ……………… IMPLEMENTED ON MAIN @ 923ea4b3 · ≠ PV
  Orchestra ………………… Doc→KNR→G1→G2→Class→P5/P6→…→Finance→G3 Owner
  autoG2* ………………… attestation · P5 = lookupWorkRate

C2→OfferBoq ………………… CLOSED/PV @ ad438386
NG11 C2 align ……………… CLOSED/PV @ 00b10b97
  (NOT an implementation failure)
NO write C2 → dossier.kosztorys
Chief formula ……………… UNCHANGED
COMPOUND parent research … HELD
Leaf research ……………… exception only (no Accept)
DIY LIVE …………………… LM / Casto / OBI
Onninen / TIM ……………… NOT IMPLEMENTED
Knowledge Loop …………… labor path IMPLEMENTED · Material OPEN
Finance / G3 ……………… Owner-controlled · node OWNER_FINANCE_NOT_OK
TPI baseline ……………… 89/59/52/37/7 UNCHANGED by B1/B2

CURRENT NEXT LEGAL ……… Owner GO only.
Nie inventuj semantyki, commitów, Accept, Final Bid, ani next step.
════════════════════════════════════════════════════════
```

**OWNER GO wymagany** przed: IMPLEMENT finansów · Accept gładzi · Final Bid TPI · reopen CHROBREGO · Phase 5 · nowych providerów · zmianą Decision Tree CASE · **claim B1/B2 PRODUCTION VERIFIED**.

---

*Koniec Master SSOT · MASTER RECONCILED 2026-09-09 · GO65 docs only · awaiting Owner review*
