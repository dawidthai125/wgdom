# IK MASTER CONTINUITY HANDOFF — 2026-08-24

> **ID:** `IK-MASTER-CONTINUITY-HANDOFF-2026-08-24`
> **STATUS:** **ACTIVE** · **SESSION CLOSEOUT** · DOCUMENTATION ONLY
> **Date:** 2026-08-24
> **Mode:** ZERO CODE · ZERO KV WRITE · ZERO COMMIT WIP · docs-only closeout
> **Contract SSOT (nie zastępować):** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)
> **Prior session handoff:** [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md)
> **Tip UI (pointer):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
KONTYNUUJ WGDOM IK — NIE BUDUJ OD NOWA.

Przeczytaj Master SSOT → TEN handoff → git status → AUDIT ONLY.
IK = JEDEN ZESPÓŁ EKSPERTÓW nad ISTNIEJĄCYM stackiem WGDOM.
════════════════════════════════════════════════════════
```

Ten plik **nie** zastępuje Master SSOT. Jest continuity / cold-start dla Cursor i ChatGPT po zamknięciu slice'ów **A01** (w tym **F5 MARGIN**) i **A09**.

---

## 0. Production baseline (live)

| Pole | Wartość |
|------|---------|
| **HEAD / origin/main** | **`82f3520e`** (`82f3520e1f7e0f5b763792fb2592b4247be7df8a`) |
| **ahead/behind** | **0/0** |
| **Ostatni commit (tip)** | `feat: add A01 commercial margin ops` |
| **Live `version.json`** | UI **2.66.115** · commit **`82f3520`** · timestamp **2026-08-24T21:23:45.724Z** |
| **Deploy status** | **PROPAGATED / GREEN** — brak nowego deploy wymaganego po aktualnym `main` |
| **Prior slice (Observability Ph 4)** | **`c1b3ad7d`** — Team Conversation overlay · **≠** current tip |
| **Prior slice (A09)** | **`8ccb3e9b`** — Owner package work · nadal ważny kontrakt · **≠** current tip |

**Uwaga:** **Live `version.json` + `git log -1`** są tip SSOT. Ten plik + [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) muszą być zsynchronizowane po każdym tip bump.

### 0.1 Observability Projection Phases 1–4 (**CLOSED GREEN**)

| Phase | Status | Commit |
|-------|--------|--------|
| 1–2 Analysis Observation SSOT | **PRODUCTION VERIFIED** | `b56f3d43` |
| 3 Live Visualization | **PRODUCTION VERIFIED** | `b56f3d43` |
| 4 Team Conversation overlay | **PRODUCTION VERIFIED** | **`c1b3ad7d`** |
| 5 ETA / Final Wrap-up | **NOT AUTHORIZED** | — |

**Phase 4 tests:** P4 **78/78** · P12 **91/91** · P3 **81/81** · build **PASS**.

### 0.2 A01 F5 MARGIN — commercialPricing (**CLOSED GREEN**)

| Pole | Wartość |
|------|---------|
| **Commit (code + prod)** | **`82f3520e`** (`82f3520e1f7e0f5b763792fb2592b4247be7df8a`) |
| **Status** | **CLOSED / PRODUCTION VERIFIED GREEN** |
| **LP9** | `cc-w2-oczyszczenie-podloza` · marginPct **25** · source **owner** · regions **wroclaw + dolnyslask** |
| **LP10** | `cc-w2-impregnacja-biobojcza-m2` · marginPct **25** · source **owner** · regions **wroclaw + dolnyslask** |
| **OUR RATE** | LP9 **18** · LP10 **22** · **frozen / unchanged** |
| **F5 SELL** | LP9 **22.5 PLN/m²** · LP10 **27.5 PLN/m²** |
| **MarketQuotes** | **frozen** (LP9 ts `2026-08-24T18:06:45.759Z` · LP10 ts `2026-08-24T19:09:38.711Z`) |
| **Collateral** | `cc-w2-scianki-dzialowe-gr-pakiet-m2` · **UNCHANGED** |
| **Prod idempotency** | dry-run **`CHANGED=false`** (all 4 regions) |
| **KV execute** | **COMPLETE** (prior session) · **no further `--execute` authorized** |
| **Tests** | `test-catalog-ik-owner-a01-commercial-margin-ops.mjs` **36/0** |
| **Pliki** | `ik-owner-create-a01-commercial-margin-ops.ts` · `catalog-ik-owner-a01-commercial-margin-ops.mjs` |

**Nie** oznacza to globalnego IK E2E GREEN ani zamknięcia AUTONOMY-08 epic / KNR full bridge / Observability Phase 5.

---

## 1. Najważniejsza zasada IK

```text
IK NIE JEST NOWYM SYSTEMEM PRZETARGÓW.

IK = JEDEN ZESPÓŁ EKSPERTÓW
     nad ISTNIEJĄCYM STACKIEM WGDOM
     + wspólne SSOT + evidence + pricing + position cost + bid/PDF.

NIE: Tenders V2 · IK V2 · KNR V2 · Labor V2 · Material V2.
```

**Canonical sentence (zapisana też w Master SSOT §19):**

> **INTELIGENTNY KOSZTORYSANT NIE JEST ZBIOREM NIEZALEŻNYCH MODUŁÓW. TO JEDEN ZESPÓŁ EKSPERTÓW DZIAŁAJĄCY NAD WSPÓLNYM CASE PRZETARGOWYM, WYKORZYSTUJĄCY ISTNIEJĄCE SSOT WGDOM. CHIEF KOORDYNUJE. IKENTRYHOST ORKIESTRUJE. EKSPERCI DOMENOWI WYKONUJĄ SWOJE ZADANIA. KNR DOSTARCZA KNOWLEDGE/EVIDENCE. LABOR DOSTARCZA OUR RATE. MATERIAL DOSTARCZA PRICE MEMORY/SELL. COMPOSITE ŁĄCZY R+M. F5 LICZY POSITION COST. P7 BUDUJE WARSTWĘ BID. P8 OCENIA RYZYKO. OWNER ZACHOWUJE AUTHORITY. EXPERT CONVERSATION / IK EXPERIENCE POKAZUJE PRAWDZIWY STAN PIPELINE (NIE FIKCYJNĄ ROZMOWĘ). LIVE VISUALIZATION + ETA + FINAL SUMMARY SĄ TARGET EXPERIENCE NAD RUNTIME. BID/PDF POZOSTAJE W ISTNIEJĄCYM STACKU. NIE BUDUJEMY TEGO OD NOWA. INTEGRUJEMY TO W JEDEN SPÓJNY, PRODUKCYJNY SYSTEM END-TO-END.**

---

## 2. Chief ≠ Host

| Byt | Pliki | Rola | NIE jest |
|-----|-------|------|----------|
| **Chief** | `src/lib/chief-session/*` · `chief-orchestrator/*` · `chief-dossier-ui/*` · `useChiefOrchestratorSession.ts` | Case/task/dossier · lifecycle · prezentacja | Drugim Hostem · Decydentem · pricing engine |
| **Host** | `IkEntryHost.tsx` · `orchestra/*` · `IkOrchestraPageBridge.tsx` | Runtime pipeline P2→KNR→Class→P5→P6→Composite→P7→P8→EC | Drugim Chiefem · drugim TenderModule |

---

## 3. Runtime flow (CURRENT)

```text
PRZETARG
  → TendersModule
  → TenderDetailPage
       → useHistoricalExecutedHostIndex (gdy IK ON)
       → useChiefOrchestratorSession (Chief)
       → useIkOrchestra → IkOrchestraSnapshot
       → IkEntryHost
            → P2: Document Expert / NG-02 ingest
            → Owner Map gate (multi-dwelling)
            → KNR Expert (+ historicalIndex, authority=false)
            → KL lookup side-channel (lookup-only)
            → Identity phase (OfferBoq work identity · persist W2 gated)
            → Classification (BEFORE research)
            → Identity Coverage (optional flag)
            → P5 Labor / P6 Material (async)
            → Composite BOTH_HOLD → F5 computePositionCost
            → P7 position cost bid (read-only path)
            → P8 risk / validation prepare
            → buildAnalysisObservation(orchestra)
            → LiveVisualizationView
            → IkOwnerActionQueueNavigate
            → legacyVm = buildIkEntryConversationViewModel
            → vm = overlayObservationStatusesOnConversationVm(legacyVm, observation)
            → ExpertConversationSurface vm={vm}
  → Bid / Offer / PDF (istniejący stack)
```

**Sync SSOT order** (`ik-orchestra-engine.ts`): Document → KNR → Identity → Classification → IdentityCoverage → Composite → P7 → P8.  
**Labor/Material:** async w `use-ik-orchestra.ts` — nie mutują Observation semantics bez briefu.

**Flagi:** `src/lib/intelligent-estimator/ik-entry-flag.ts` · jedyny biznesowy switch IK = `ikEntryEnabled`.

---

## 4. Pełne drzewo IK — status (source @ `82f3520e`)

| Element | Location (primary) | Status | SSOT / store | Notes |
|---------|-------------------|--------|--------------|-------|
| **Chief** | `chief-session` · `chief-orchestrator` · dossier UI | **CURRENT** | in-memory dossier | Hub UI + P8 input |
| **Host** | `IkEntryHost` · `orchestra/*` | **CURRENT** | flags | Sequencer runtime |
| **Document Expert** | `ik-document-expert` · NG-02 bridge · ingest | **CURRENT** | OfferBoq / multi-boq | REUSE parsers |
| **Owner Map** | `multi-dwelling/*` · `ik-dwelling-mapping` | **CURRENT** | `kw-multi-dwelling-package-v1` | PackageGate |
| **KNR A** | `buildCatalogBasisFromRawCode` · `ik-knr-expert` | **PRODUCTION VERIFIED** | catalogBasis evidence | ≠ pricing |
| **KNR B** | `ik-knr-expert` + evidence | **CURRENT** | KNR evidence store | |
| **KNR C** | `ik-knr-conversation` | **CURRENT** | VM copy | |
| **KNR D** | `ik-knr-owner-mapping.ts` | **IMPLEMENTED** | `OWNER_KNR_MAPPINGS` **1 Owner row** (WYKWITY) · `OWNER_KNR_MATERIAL_MAPPINGS` **empty** | bounded write |
| **KL** | `knr-knowledge/*` | **PARTIAL** | KV + lookup | corpus bounded |
| **Historical** | `historical-executed/*` | **PRODUCTION VERIFIED** (slice) | in-memory index | **authority=false** |
| **Classification** | `classification-gate` · `ik-classification` | **FROZEN** | owner-classification-map | BEFORE research |
| **Labor** | `ik-labor-expert` | **CURRENT** | Work Catalog | |
| **Work Catalog** | `work-catalog/*` | **CURRENT** | `kw-wgdom-work-catalog` | regions wroclaw/dolnyslask |
| **Labor Research** | `work-rate-research.ts` | **CURRENT** | cooldown | MISS only |
| **Evidence** | `labor-source-evidence/*` | **CURRENT** | `kw-wgdom-labor-source-evidence` | **≠ OUR RATE** |
| **Labor Accept** | `work-rate-accept.ts` | **CURRENT** | CatalogWork.ourWorkRate | Owner only |
| **Material** | `ik-material-expert` | **CURRENT** | Price Memory | |
| **Price Memory** | `price-intelligence/*` | **CURRENT** | PM stores | |
| **Material Accept** | accept material path | **CURRENT** | PM | Owner only |
| **Composite** | `ik-composite-both-hold` | **IMPLEMENTED** | — | `feedsP7Bid=false` **FROZEN** |
| **F5** | `tender-position-cost/engine.ts` | **PRODUCTION EXISTING** | ephemeral | REUSE |
| **P7** | `ik-p7-position-cost-bid.ts` | **IMPLEMENTED** | — | gated AUTO/OFF/ON |
| **P8** | `ik-p8-risk-decision.ts` | **IMPLEMENTED** | validation-expert | |
| **P9** | `ik-p9-owner-verify.ts` | **PARTIAL** | verify marker | diag-only seam |
| **Validation** | `validation-expert/*` | **CURRENT** | — | via P8 |
| **Expert Conversation** | `ExpertConversationSurface` · `ik-entry-conversation` | **PRODUCTION VERIFIED** (Phase 4 overlay) | VM presentation | Observation = status SSOT |
| **Observation** | `analysis-observation.ts` · `buildAnalysisObservation` | **PRODUCTION VERIFIED** (Phases 1–2) | pure projection | status/progress SSOT |
| **Live Visualization** | `LiveVisualizationView.tsx` | **PRODUCTION VERIFIED** (Phase 3) | READ-ONLY consumer | no progress engine in EC |
| **Owner Action Queue** | `ik-owner-action-queue.ts` · `IkOwnerActionQueueNavigate` | **CURRENT** | deep links | Owner decisions |
| **Bid** | `tenders-bid-calculator.ts` | **CURRENT** | — | REUSE |
| **PDF** | `tender-bid-package-pdf.ts` | **CURRENT** | — | REUSE |
| **Identity mapping** | `work-rate-identity-mapping.ts` | **CURRENT** | 4 Owner rows | LABOR only |
| **Package plane** | costSplit on CatalogWork | **CURRENT** | catalog KV | ≠ identity row |
| **A01-S1** | LP4 identity | **FROZEN GREEN** | `3e4adfff` | |
| **A01-LP5** | LP5/LP10 identity + catalog | **FROZEN GREEN** | `f012d39a` / OPS `cf802cbd` | |
| **A01-S3** | LP10 OUR RATE + classification | **CLOSED** | `e7774ca5` | OUR RATE ops |
| **A01 F5 MARGIN** | commercialPricing 25% owner | **PRODUCTION VERIFIED GREEN** | `82f3520e` | dual-region · idempotent |
| **A09 PACKAGE** | catalog CREATE | **PRODUCTION VERIFIED** | `8ccb3e9b` | **NOT identity** |

Szczegóły kart: Master SSOT §10–§12.

---

## 5. KNR — pozycja w IK

KNR **nie** jest osobnym systemem. Jest częścią jednego IK.

**Pliki (CURRENT na HEAD):**

| Warstwa | Pliki |
|---------|-------|
| Expert | `ik-knr-expert.ts` · `ik-knr-owner-mapping.ts` · `ik-knr-conversation.ts` |
| KL / catalog | `knr-knowledge/knr-catalog-lookup.ts` · `knr-catalog-write-router.ts` · `knr-catalog-sync.ts` · `knr-verify-orchestrator.ts` |
| Evidence | `knr-evidence-store.ts` · `knr-ingest-pipeline.ts` · `knr-normalize-contract.ts` |
| Legal | `knr-legal-gate-runtime.ts` |
| Research | `knr-research-kl3b.ts` · providers |
| UI | `KnrCatalogPanel.tsx` · `KnrVerifyAdminView.tsx` |

**Slice status:**

| Slice | Status |
|-------|--------|
| **A** catalogBasis | **PRODUCTION VERIFIED** |
| **B** evidence + Historical | **CURRENT** |
| **C** Expert Conversation | **CURRENT** |
| **D** Owner KNR mapping | **IMPLEMENTED** · **`OWNER_KNR_MAPPINGS` = 1 row** (WYKWITY) · material map **empty** |
| **KL** | **PARTIAL** · lookup-oriented |

**KNR NIE ustala:** OUR RATE · material price · SELL · Bid · Owner Accept.

### 5.1 Kluczowy GAP (TARGET — nie implementować bez GO)

```text
Obecnie:
  KNR evidence → KL → Slice D wymaga EXISTING catalogWorkId

Brakuje bezpiecznego mostu:
  KNR FACT → PROPOSED WORK → OWNER ACCEPT → WORK CATALOG → Slice D

To jest TARGET/GAP, nie CURRENT.
Nie automatyczne mapowanie. Nie implementować w maintenance window bez AUDIT + Owner GO.
```

---

## 6. Owner identity registry (production @ `8ccb3e9b`)

**4 Owner rows** w `WORK_RATE_IDENTITY_MAPPINGS`:

| mappingId | Target | Aliases |
|-----------|--------|---------|
| `lim-w1-tablica-rozdzielcza-cr` | Wave-1 | … |
| `lim-w1-podejscie-wod-kan-cr` | Wave-1 | … |
| `lim-ik-a01-lp4-oczyszczenie-wm` | `cc-w2-oczyszczenie-podloza` | LP4 |
| `lim-ik-a01-lp5-impregnacja-wm` | `cc-w2-impregnacja-biobojcza-m2` | LP5 + LP10 |

### A01-S1 — FROZEN GREEN (`3e4adfff`)

| Case | Result |
|------|--------|
| LP4 → oczyszczenie | **HIT** → `cc-w2-oczyszczenie-podloza` |
| LP5 → oczyszczenie | **MISS** |
| zmywanie | **MISS** |
| gruntowanie | **MISS** |

### A01-LP5 — FROZEN GREEN

| Slice | Commit | Status |
|-------|--------|--------|
| Identity | `f012d39a` | **PRODUCTION VERIFIED** |
| Catalog OPS | `cf802cbd` | **PRODUCTION VERIFIED** |

| Case | Result |
|------|--------|
| LP5 → impregnacja | **HIT** → `cc-w2-impregnacja-biobojcza-m2` |
| LP10 → impregnacja | **HIT** |
| LP5 → oczyszczenie | **MISS** |
| zmywanie / gruntowanie | **MISS** |

---

## 7. A09 PACKAGE — PRODUCTION VERIFIED GREEN (`8ccb3e9b`)

| Pole | Wartość |
|------|---------|
| **workId** | `cc-w2-scianki-dzialowe-gr-pakiet-m2` |
| **Domain** | PACKAGE / `LABOR_MATERIAL_PACKAGE` (via costSplit 0.5/0.5) |
| **unit** | `m2` |
| **tradeId** | `SCIANY_GK` |
| **namePl** | `Ścianki działowe GR — pakiet GK (ruszt, obustronnie)` |
| **G177 verbatim** | provenance constant / `descriptionPl` — **NOT identity alias** |
| **KV wroclaw** | **PRESENT** |
| **KV dolnyslask** | **PRESENT** |
| **duplicate** | **NO** |
| **idempotent** | **PASS** |
| **companyPricePln** | **0** |
| **ourWorkRate** | **absent** |
| **rate status** | **PENDING_OWNER_INPUT** |
| **118** | **NOT USED** |
| **LABOR host** | `p2b-scianka-gk-na-stelazu-m2` **UNTOUCHED** |
| **Identity mapping** | **NONE for G177 — EXPECTED** |
| **WORK_RATE_IDENTITY_MAPPINGS delta** | **0** |

**Pliki slice (committed):**

- `src/lib/work-catalog/ik-owner-create-a09-package-catalog.ts`
- `src/lib/work-catalog/ik-owner-create-a09-package-ops.ts`
- `scripts/catalog-ik-owner-a09-package-ops.mjs`
- tests + `docs/architecture/IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md`

**Następny krok A09:** Owner-priced rate slice — **osobne GO**, nie auto 118.

---

## 8. Authority map (skrót)

| Akcja | Authority |
|-------|-----------|
| Discover documents | Document Expert / existing ingest |
| Discover historical | Historical (read-only) |
| Lookup labor | Work Catalog |
| Lookup material | Price Memory |
| Lookup KNR | KNR / KL |
| Calculate position cost | F5 |
| Propose rate/price | Labor/Material Candidate |
| Accept OUR RATE | **Owner** |
| Accept material | **Owner** |
| Verify KNR | Owner / KL VERIFY boundary |
| Finalize bid | Bid stack + **Owner** |
| Historical write | **NOBODY** |
| KNR auto-write catalogWorkId | **FORBIDDEN** poza Slice D |

---

## 9. Known NEXT gaps (post-A09)

| # | Gap | Status |
|---|-----|--------|
| 1 | **A09 Owner-priced rate** | **PENDING_OWNER_INPUT** |
| 2 | KNR full catalog / KL expansion | **PARTIAL / GAP** |
| 3 | KNR FACT → proposed Work Catalog bridge | **TARGET / GAP** — no GO |
| 4 | A03 unit resolution | **HOLD** |
| 5 | A07 evidence / CREATE | **HOLD** |
| 6 | A01-S2 zmywanie | **HOLD** — brak Owner-grade verbatim BOQ |
| 7 | A02/A04/A05/A06/A08/A10 | **HOLD** — insufficient evidence |
| 8 | KNR ×20 bulk mapping | **BLOCKED** |
| 9 | **IK Analysis Experience — Phase 5** (ETA · Final Summary · hints Variant B) | **NOT AUTHORIZED** · Phases **1–4 CLOSED GREEN** @ **`c1b3ad7d`** · Master **§13.11** |

**Nie wymyślaj** kolejnych slice'ów bez AUDIT + Owner GO.

---

## 9.1 IK Analysis Experience — Phases 1–4 (**CLOSED**) + Phase 5 boundary

Master SSOT **§13** · **§13.11** · **§22**.

**CLOSED / PRODUCTION VERIFIED GREEN:**

| Phase | Deliverable |
|-------|-------------|
| **1–2** | `AnalysisObservation` · `buildAnalysisObservation(orchestra)` · status/progress SSOT |
| **3** | `LiveVisualizationView` · READ-ONLY consumer |
| **4** | `mapObservationStatusToEcStepStatus` · `resolveObservationStageIdForEcStep` · `overlayObservationStatusesOnConversationVm` · Host wiring |

**Frozen Phase 4 contracts (must survive):**

- Observation bridge: `running→active` · `failed→gap` · no `skipped` from Observation
- `DWELLING_MAP_COMPLETE|REQUIRED` + `validation` → `boq`
- Variant A: `conversationHints=[]`
- Overlay pure copy · `enforceIkConversationTruth` · `done` without valid `sourceRef` → `hold`
- No EC progress engine · Live Viz = primary progress surface

**NOT AUTHORIZED:** Phase 5 · Variant B · ETA · Final engine · findings migration · second orchestrator.

Design Freeze: [`IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md`](./IK-ANALYSIS-OBSERVABILITY-PROJECTION-01-DESIGN-FREEZE.md) §21 (DWELLING_MAP amend).

---

## 10. HARD LOCKS (maintenance window)

Bez **AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → Owner GO**:

- nowy ekspert / orchestrator / KNR system / Work Catalog / Price Memory
- drugi F5 / Bid engine / chat store / LLM per expert
- auto Accept OUR RATE · auto KNR map · research for UNKNOWN/COMPOUND
- Evidence → OUR RATE · companyPrice → OUR RATE · Historical authority=true
- `git add -A` · `git reset --hard` · `git clean`

---

## 11. DO NOT TOUCH (permanent safety)

Bez **jawnego Owner GO** + AUDIT:

| Zakaz | Powód |
|-------|--------|
| F5 engine semantics (`tender-position-cost/engine.ts`) | Position Cost SSOT · REUSE only |
| OUR RATE mutate (Accept / ops `--execute`) | Owner authority · A01 rates **frozen** |
| MarketQuotes mutate | A01 quotes **frozen** |
| Collateral `cc-w2-scianki-dzialowe-gr-pakiet-m2` | A09 / F5 guard |
| `commercialPricing` re-execute F5 margin | **COMPLETE** · **no further `--execute`** |
| `cloud-sync` CORE / Payroll merge / carry | Protected Core |
| Unrelated WIP commit (`App.tsx`, `work-catalog-store/sync`, Payroll) | Pre-existing · nie zagarniać |
| `git add -A` | Zagarnia WIP |
| Production flag flip (`ikEntryEnabled` / D) bez PV | Observability risk |
| KNR auto-write `catalogWorkId` poza Slice D | Authority boundary |
| Reopen CLOSED GREEN slice bez briefu | F5 MARGIN · A01 · Observability 1–4 |

---

## 12. COLD START — NEW GPT / NEW CURSOR AGENT

```text
════════════════════════════════════════════════════════
COLD START — NEW GPT / NEW CURSOR AGENT
NIE czytaj starego chatu. Repo + docs = SSOT.
════════════════════════════════════════════════════════

CHECKPOINT (live):
  HEAD / origin/main = 82f3520e1f7e0f5b763792fb2592b4247be7df8a
  Production UI = 2.66.115 · version.json commit = 82f3520
  F5 MARGIN = CLOSED / PRODUCTION VERIFIED / GREEN
  LP9 margin 25% owner · BASE 18 · SELL 22.5 · wroclaw+dolnyslask
  LP10 margin 25% owner · BASE 22 · SELL 27.5 · wroclaw+dolnyslask
  OUR RATE / MarketQuotes / scianki collateral = FROZEN
  Idempotency CHANGED=false · no further KV --execute

READ ORDER:
  1. docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md   ← contract
  2. docs/AI/09_PRODUCTION_BASELINE.md + live version.json    ← tip
  3. docs/architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md  ← THIS
  4. docs/AI/MASTER-AI-HANDOFF.md · docs/AI/WGDOM-COLD-START-HANDOFF.md (pointers)

RULES:
  1. Read canonical SSOT first — never assume old chat context.
  2. Repository evidence is authoritative over chat memory.
  3. Never modify production / KV without explicit Owner GO.
  4. Never reopen CLOSED GREEN work unless explicitly requested.
  5. Preserve OPEN / BLOCKED / PLANNED / WIP boundaries.
  6. Never use git add -A.
  7. Start every implementation with READ-ONLY audit.
  8. Distinguish IK Host experts (ik-*-expert) from Chief experts (*-expert packages).
  9. IK Material Expert ≠ Chief Material Expert (different implementations).
 10. Whole IK ≠ global E2E GREEN · AUTONOMY-08 epic NOT CLOSED · Phase 5 NOT AUTHORIZED.

Cursor first actions:
  git status · git log -10 · curl version.json · locate IkEntryHost + orchestra + Chief
  AUDIT ONLY — ZERO CODE until Owner GO
```

### 12.1 Cold start — Cursor (AUDIT ONLY)

```text
1. git status
2. git log -10
3. read INTELLIGENT-ESTIMATOR-MASTER-SSOT.md  (± §13 Experience · §17 · §21)
4. read THIS handoff
5. curl version.json
6. locate IkEntryHost, Chief, ik-labor-expert, ik-material-expert, ik-knr-expert
7. locate ExpertConversationSurface + ik-entry-conversation (CURRENT foundation)
8. locate work-rate-identity-mapping (4 rows)
9. verify A01 FROZEN + A09 PACKAGE (NOT identity) + F5 MARGIN GREEN
10. compare production vs local WIP — do NOT stage WIP
11. AUDIT ONLY — ZERO CODE until Owner GO
    (Phase 5 / Experience beyond overlay = NOT AUTHORIZED bez osobnego GO)
```

### 12.2 Cold start — ChatGPT

```text
KONTYNUUJ WGDOM IK — NIE BUDUJ OD NOWA.

Start:
  docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md
  docs/architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md
  docs/AI/09_PRODUCTION_BASELINE.md + live version.json

HEAD = 82f3520e · F5 MARGIN GREEN · Observability Phases 1–4 GREEN @ c1b3ad7d (ancestor) · Phase 5 NOT AUTHORIZED
A01 F5: LP9/LP10 margin 25% owner · OUR RATE/MarketQuotes frozen · no further KV execute
A09 PACKAGE @ 8ccb3e9b = historyczny slice · nadal ważny kontrakt
Rate A09 = PENDING_OWNER_INPUT · 118 = FORBIDDEN
G177 = PACKAGE catalog only · NOT identity mapping
AUTONOMY-08 epic NOT CLOSED · global IK E2E NOT GREEN

First action: AUDIT ONLY.
```

---

## 13. Dokumenty powiązane (nie zastępują Master)

| Dokument | Rola |
|----------|------|
| [`IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md`](./IK-OWNER-A09-PACKAGE-S1-IMPLEMENTATION.md) | A09 slice closeout |
| [`IK-OWNER-CREATE-A09-PACKAGE-DECISION.md`](./IK-OWNER-CREATE-A09-PACKAGE-DECISION.md) | Owner CREATE decision |
| [`IK-OWNER-CREATE-A01-LP5-IMPLEMENTATION.md`](./IK-OWNER-CREATE-A01-LP5-IMPLEMENTATION.md) | A01-LP5 |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | REUSE FIRST |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Protokół cold-start |

---

## 14. Sesja zamknięta

```text
ACTIVE IMPLEMENTATION = NONE
F5 MARGIN = CLOSED GREEN @ 82f3520e · no further --execute
NEXT = Owner GO → AUDIT → (optional) A09 rate slice OR identity/KNR gap OR Observability Phase 5
DO NOT: auto rate · auto KNR bridge · team UI · new experts · F5 margin re-execute
```

**STOP.**
