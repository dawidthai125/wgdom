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

Ten plik **nie** zastępuje Master SSOT. Jest continuity / cold-start dla Cursor i ChatGPT po zamknięciu slice'ów **A01** i **A09**.

---

## 0. Production baseline (live)

| Pole | Wartość |
|------|---------|
| **HEAD / origin/main** | **`8ccb3e9b`** (`8ccb3e9b02ba04ff493bf0adb78dda11de0e5418`) |
| **ahead/behind** | **0/0** |
| **Ostatni commit** | `feat(ik): add owner-approved A09 package work` |
| **Live `version.json`** | UI **2.66.113** · commit **`8ccb3e9`** · timestamp **2026-08-24T03:36:11.631Z** |
| **Vercel** | **SUCCESS** @ `8ccb3e9b` |
| **Brak bumpu UI** | **EXPECTED** — A09 commit bez changelog bump |

**Uwaga:** `docs/AI/09_PRODUCTION_BASELINE.md` może wskazywać starszy deploy commit w narracji historycznej. **Live `version.json` + `git log -1`** są tip SSOT dla tej sesji.

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

> INTELIGENTNY KOSZTORYSANT NIE JEST ZBIorem NIEZALEŻNYCH MODUŁÓW. TO JEDEN ZESPÓŁ EKSPERTÓW DZIAŁAJĄCY NAD WSPÓLNYM CASE PRZETARGOWYM, WYKORZYSTUJĄCY ISTNIEJĄCE SSOT WGDOM. CHIEF KOORDYNUJE. IKENTRYHOST ORKIESTRUJE. EKSPERCI DOMENOWI WYKONUJĄ SWOJE ZADANIA. KNR DOSTARCZA KNOWLEDGE/EVIDENCE. LABOR DOSTARCZA OUR RATE. MATERIAL DOSTARCZA PRICE MEMORY/SELL. COMPOSITE ŁĄCZY R+M. F5 LICZY POSITION COST. P7 BUDUJE WARSTWĘ BID. P8 OCENIA RYZYKO. OWNER ZACHOWUJE AUTHORITY. EXPERT CONVERSATION POKAZUJE PRAWDZIWY STAN PIPELINE. BID/PDF POZOSTAJE W ISTNIEJĄCYM STACKU. **NIE BUDUJEMY TEGO OD NOWA. INTEGRUJEMY TO W JEDEN SPÓJNY SYSTEM.**

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
       → IkEntryHost / orchestra
            → P2 Document Expert (NG-02 bridge)
            → Owner Map gate (multi-dwelling)
            → KNR Expert (+ historicalIndex, authority=false)
            → KL lookup side-channel (lookup-only)
            → Classification (BEFORE research)
            → P5 Labor → Work Catalog / research on MISS
            → P6 Material → Price Memory / research on MISS
            → Composite BOTH_HOLD → F5 computePositionCost
            → P7 position cost bid (read-only path)
            → P8 risk / validation prepare
            → ExpertConversationSurface (truth filter VM)
  → Bid / Offer / PDF (istniejący stack)
```

**Flagi:** `src/lib/intelligent-estimator/ik-entry-flag.ts` · jedyny biznesowy switch IK = `ikEntryEnabled`.

---

## 4. Pełne drzewo IK — status (source @ `8ccb3e9b`)

| Element | Location (primary) | Status | SSOT / store | Notes |
|---------|-------------------|--------|--------------|-------|
| **Chief** | `chief-session` · `chief-orchestrator` · dossier UI | **CURRENT** | in-memory dossier | Hub UI + P8 input |
| **Host** | `IkEntryHost` · `orchestra/*` | **CURRENT** | flags | Sequencer runtime |
| **Document Expert** | `ik-document-expert` · NG-02 bridge · ingest | **CURRENT** | OfferBoq / multi-boq | REUSE parsers |
| **Owner Map** | `multi-dwelling/*` · `ik-dwelling-mapping` | **CURRENT** | `kw-multi-dwelling-package-v1` | PackageGate |
| **KNR A** | `buildCatalogBasisFromRawCode` · `ik-knr-expert` | **PRODUCTION VERIFIED** | catalogBasis evidence | ≠ pricing |
| **KNR B** | `ik-knr-expert` + evidence | **CURRENT** | KNR evidence store | |
| **KNR C** | `ik-knr-conversation` | **CURRENT** | VM copy | |
| **KNR D** | `ik-knr-owner-mapping.ts` | **IMPLEMENTED** | `OWNER_KNR_MAPPINGS` **empty** | bounded write |
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
| **Expert Conversation** | `ExpertConversationSurface` · `ik-entry-conversation` | **CURRENT** | VM only | no fake chat store |
| **Bid** | `tenders-bid-calculator.ts` | **CURRENT** | — | REUSE |
| **PDF** | `tender-bid-package-pdf.ts` | **CURRENT** | — | REUSE |
| **Identity mapping** | `work-rate-identity-mapping.ts` | **CURRENT** | 4 Owner rows | LABOR only |
| **Package plane** | costSplit on CatalogWork | **CURRENT** | catalog KV | ≠ identity row |
| **A01-S1** | LP4 identity | **FROZEN GREEN** | `3e4adfff` | |
| **A01-LP5** | LP5/LP10 identity + catalog | **FROZEN GREEN** | `f012d39a` / OPS `cf802cbd` | |
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
| **D** Owner KNR mapping | **IMPLEMENTED** · **`OWNER_KNR_MAPPINGS` = empty** |
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

**Nie wymyślaj** kolejnych slice'ów bez AUDIT + Owner GO.

---

## 10. HARD LOCKS (maintenance window)

Bez **AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → Owner GO**:

- nowy ekspert / orchestrator / KNR system / Work Catalog / Price Memory
- drugi F5 / Bid engine / chat store / LLM per expert
- auto Accept OUR RATE · auto KNR map · research for UNKNOWN/COMPOUND
- Evidence → OUR RATE · companyPrice → OUR RATE · Historical authority=true
- `git add -A` · `git reset --hard` · `git clean`

---

## 11. Cold start — Cursor (AUDIT ONLY)

```text
1. git status
2. git log -10
3. read INTELLIGENT-ESTIMATOR-MASTER-SSOT.md
4. read THIS handoff
5. curl version.json
6. locate IkEntryHost, Chief, ik-labor-expert, ik-material-expert, ik-knr-expert
7. locate work-rate-identity-mapping (4 rows)
8. verify A01 FROZEN + A09 PACKAGE (NOT identity)
9. compare production vs local WIP — do NOT stage WIP
10. AUDIT ONLY — ZERO CODE until Owner GO
```

---

## 12. Cold start — ChatGPT

```text
KONTYNUUJ WGDOM IK — NIE BUDUJ OD NOWA.

Start:
  docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md
  docs/architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md
  docs/AI/09_PRODUCTION_BASELINE.md + live version.json

HEAD = 8ccb3e9b · A09 PACKAGE GREEN · A01 FROZEN GREEN
Rate A09 = PENDING_OWNER_INPUT · 118 = FORBIDDEN
G177 = PACKAGE catalog only · NOT identity mapping

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
NEXT = Owner GO → AUDIT → (optional) A09 rate slice OR identity/KNR gap
DO NOT: auto rate · auto KNR bridge · team UI · new experts
```

**STOP.**
