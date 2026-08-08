# TENDER-MODERNIZATION-01 / S4 — AUDIT (Hub UX)

> **STATUS:** **AUDIT COMPLETE** · **READY FOR PLAN**  
> **ID:** TENDER-MODERNIZATION-01-S4-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S4 — Hub UX**  
> **TRYB:** **AUDIT ONLY** (bez IMPLEMENT · bez commit · bez push)  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / **`ec8a5044`** ([`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md))  
> **Owner GO:** S4 AUDIT — 2026-08-08  
> **SSOT polityki:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §7 · §11 S4 · [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md) §7 · §10 S4  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **Dependencies tip:** **S2 CLOSED** · **S3 CLOSED** (wymagane przed S4 PV)

```text
════════════════════════════════════════════════════════
S4 AUDIT — Hub UX / hierarchy / surfaces / primary cues

Cel DF:
  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA

Runtime tip (prod path Command Layer ON):
  PLN headline → Progress → Intelligence (PINNED)
  → Chief (Offer Rec → … → EW collapsed)
  → DW (Validation → Rec → Actions)
  → accordion „Szczegóły postępu”

AC-S4-1…4: FAIL / PARTIAL (gaps → PLAN)
8 LOCK: PASS (audit read-only)
Strategy: OUTSIDE Hub (KEEP osobny)
TRE-01 Outcome: OUTSIDE Hub (S7 — nie S4 delete)

READY FOR S4 PLAN: YES
READY FOR IMPLEMENT S4: po Owner GO PLAN (osobny turn)
════════════════════════════════════════════════════════
```

---

## 0. Zakres audytu / 8 LOCK

| | |
|--|--|
| **IN** | Hub UX hierarchy · surface order · primary cues · Intelligence demotion readiness · PLN visual multiplicity · consumer map · allowlist |
| **OUT** | IMPLEMENT · Strategy rewrite · TRE hard delete · Bid/Offer/OfferBoq domain · Expert/Chief/Session/Validation BC · store schema · S5 tab · S6 bridge · S8 REMOVE |
| **8 LOCK** | Expert BC · Chief BC · Session BC · Wire Adapters · TF · OfferBoq · Bid calculator · domain calculations — **NO TOUCH** (audit only) |

### Zachowane kontrakty (must keep — verify only)

| Kontrakt | Tip status | S4 impact |
|----------|------------|-----------|
| Expert AI = PRIMARY path | S1/S2 LOCKED | KEEP |
| Decision Workspace = primary decision | S2 · `data-s2-dw-primary` | KEEP · hierarchy UX only |
| Offer Expert = primary PLN @ Expert ON | S3 · `resolveAuthoritativeOfferPln` | KEEP authority · thin visual demotion of duplicates |
| NO PRIMARY gdy brak `offerPricePln` | S3 | KEEP |
| Strategy = osobny system | Portfolio + Strategia poza Hub | KEEP OUT of S4 rewrite |
| Legacy = bridge/compatibility | S2 cue + Bid secondary | KEEP |
| ZERO third pricing/store/intelligence | tip | **ZAKAZ** Intelligence 2 / 3. PLN / 3. store |

---

## 1. Current Hub Mount Tree (tip)

### 1.1 Prod path — `commandLayerActive === true`

Źródło: `TenderDetailPage` → `TenderDetailPanel` → `TenderPrzetargWorkspace` → `TenderWorkflowHubPanel`.

**Command Layer (powyżej Hub — poza panelem, ale konkuruje o uwagę):**

| # | Surface | Plik (evidence) |
|---|---------|-----------------|
| CL | Process Strip · Trust · Primary CTA · chip „Podsumowanie oferty” → `#tender-intelligence-hub` | `TenderDetailPage.tsx` · `TenderWorkflowProcessStrip` · `TenderWorkflowPrimaryAction` |

**Wewnątrz `TenderWorkflowHubPanel` (`data-tender-workflow-hub`):**

| # | Surface | Plik:linie | Rola tip |
|---|---------|------------|----------|
| 1 | S3 PLN headline | `TenderWorkflowHubPanel.tsx` 122–153 | Authoritative PLN + badge |
| 2 | Progress compact | `TenderWorkspaceV2Panel.tsx` 86–127 via Hub 194 | % / pillars (ANALIZA partial) |
| 3 | **Intelligence Hub** `#tender-intelligence-hub` „Podsumowanie oferty” | `TenderWorkspaceV2Panel.tsx` 132–211 via Hub 195–200 | **PINNED** insights + cost CTA |
| 4 | **Chief Dossier** `#chief-dossier-surface` | Hub 201–206 · `ChiefDossierSurface.tsx` 35–84 | „Przebieg ekspertów” |
| 4a | Session status | `ChiefSessionStatusBar` | |
| 4b | **Offer Recommendation** (PLN `text-xl`) | `ChiefOfferRecommendation` · Surface 56–63 | REKOMENDACJA (przed EW) |
| 4c | Blockers / loop / timeline / traces | Surface 65–78 | |
| 4d | **Expert Workspace** (nested `<details>` collapsed) | Surface 80–82 · `ExpertWorkspaceSurface.tsx` 30–47 | EKSPERCI demoted |
| 5 | **Decision Workspace Host** | Hub 207–212 | |
| 5a | Validation summary | `DecisionWorkspaceSurface.tsx` 54 | WALIDACJA (po Rec Chief) |
| 5b | Recommendation panel (PLN again) | Surface 55–59 | REKOMENDACJA ×2 |
| 5c | Findings | Surface 60 | |
| 5d | **Akcje Decydenta** | Surface 61 · `DecisionActionsBar` | DECYZJA PRIMARY |
| 6 | S2 hierarchy cue (text 10px) | Hub 230–237 | muted |
| 7 | Accordion „Szczegóły postępu” | Hub 239–287 | Analysis strip · V2 · blockers · checklist |

**Po Hub (ten sam scroll Przetarg — poza panelem):**

| # | Surface | Plik | Uwaga |
|---|---------|------|-------|
| P1 | Portfolio Position GO/HOLD/NO-GO | `TenderPrzetargWorkspace.tsx` 155–161 | Strategy bridge — **osobny system** |
| P2 | Accordion „Informacje o przetargu” | 163+ | KEEP info |
| P3 | Operator / footer GO/HOLD → tab Decyzja | 283–310 | Legacy cue |

### 1.2 TRE-01 Outcome (brama przed Hub)

Gdy TRE Slice A default ON i tab Przetarg bez force Hub: `TenderRecommendationOutcomeView` **zastępuje** Hub (`TenderDetailPage`). Recovery → Hub.  
**S4:** nie usuwać TRE (→ **S7**). Audyt Hub AC wymaga ścieżki recovery / flag OFF do obserwacji hierarchy.

### 1.3 Path `commandLayerActive === false`

Trust → Strip → PrimaryAction → Chief → DW → cue → accordion z pełnym V2 (bez pinned `#tender-intelligence-hub`).  
**Gap:** dwie hierarchie CL vs non-CL.

---

## 2. Surface Inventory

| Surface | Komponent | Rola dziś | Widoczność | Primary cue? | Expert / Legacy | PLN |
|---------|-----------|-----------|------------|--------------|-----------------|-----|
| Process Strip | `TenderWorkflowProcessStrip` | Etapy Docs→Oferta | CL zawsze | Stage chips | Shared | NIE |
| Primary CTA | `TenderWorkflowPrimaryAction` | Next step | CL | Sticky CTA | Expert ON → scroll DW | NIE |
| S3 PLN headline | Hub | Authoritative strip | gdy `primaryPln != null` | **TAK** `text-xl` | Offer / Bid per S3 | TAK |
| Progress compact | V2 Progress | Postęp % | CL pinned | % | Shared | NIE |
| Intelligence Hub | V2 InsightsCompact | Alerty + narracja | CL **pinned** | Heading + CL shortcut | Legacy narracja | NIE |
| Chief Dossier | `ChiefDossierSurface` | Session + offer + traces | Session VM | „Przebieg ekspertów” | Expert | via Offer |
| Chief Offer Rec | `ChiefOfferRecommendation` | System offer | `showOffer` | **TAK** primary card | Expert Offer | `offerPricePln` |
| Expert Workspace | `ExpertWorkspaceSurface` | EE→…→Offer details | nested collapsed | summary „rozwiń” | Expert | w panelach |
| DW Validation | `DecisionValidationSummary` | QA | DW stack | sekcja | Expert | NIE |
| DW Rec | `DecisionRecommendationPanel` | Offer rec | DW | **TAK** primary card | Expert | Offer |
| DW Actions | `DecisionActionsBar` | Human decision | DW | **TAK** filled buttons | Expert PRIMARY | NIE |
| Progress accordion | Hub `<details>` | Recovery detail | zawsze | „Szczegóły postępu” | Shared | NIE |
| Portfolio Position | `TenderPortfolioPositionPanel` | Score + GO/HOLD | po Hub | badges | **Strategy** | NIE |
| TRE Outcome | `TenderRecommendationOutcomeView` | Landing ceny | TRE default | full-page PLN | S3 authority | Offer/Bid |

---

## 3. Narrative Check vs Target (DF §7)

```text
TARGET:  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA
RUNTIME: PLN → Progress → Intelligence → Chief(Rec→EW) → DW(Val→Rec→Actions)
```

| Krok DF | Obecny? | Gdzie | Konflikt |
|---------|---------|-------|----------|
| **ANALIZA** | Partial | Progress compact; Analysis strip **w accordion** | Intelligence pinned silniejszy wizualnie; Strip = Docs→Oferta ≠ 5-step |
| **EKSPERCI** | TAK, demoted | Trace + EW **collapsed** pod Chief, **po** Offer Rec | Kolejność odwrotna vs DF (Rec przed EW) |
| **WALIDACJA** | TAK | Wewnątrz DW, **po** całym Chief | Brak osobnego kroku Hub; po REKOMENDACJI Chief |
| **REKOMENDACJA** | TAK ×2+ | Chief Offer + DW Rec (+ naming Intelligence) | Duplikat primary-looking cards |
| **DECYZJA** | TAK | DW Actions; CTA scroll | Portfolio GO/HOLD + footer konkurują poniżej Hub |

**Werdykt AC-S4-1:** **FAIL** — brak czytelnej jednej historii 5 kroków; Intelligence nadal w primary viewport.

---

## 4. Intelligence Hub Status (AC-S4-2)

| Pytanie | Finding | Evidence |
|---------|---------|----------|
| Primary viewport SSOT? | **TAK efektywnie** (CL path) | `TenderWorkspaceV2InsightsCompact` pinned Hub 195–200; `id="tender-intelligence-hub"` |
| Collapse / recovery? | **NIE** na CL path | Accordion to osobna treść; Intelligence poza accordionem |
| CL shortcut? | **TAK** — scroll do Intelligence | `TenderDetailPage` chip `buildIntelligenceHubShortcutLabel` |
| DF target | DEPRECATED → collapse / recovery accordion | DF §7.2 |
| Guide copy | nadal opisuje hub jako kanoniczny skrót | `GuideView` Q&A |

**Werdykt AC-S4-2:** **FAIL**.

---

## 5. Chief + EW + DW Hierarchy (AC-S4-3)

| Element | Mounted? | Hierarchy quality |
|---------|----------|-------------------|
| Chief Dossier | TAK (gdy Session VM) | Peer section OK |
| Expert Workspace | TAK | Nested + default collapsed + **po** Offer Rec |
| Decision Workspace | TAK | Peer section OK; Validation wewnętrznie przed Actions |

**Werdykt AC-S4-3:** **PARTIAL** — komponenty istnieją; nie tworzą peer story steps DF §7.

---

## 6. PLN Surfaces (AC-S4-4) — S3 residue

Authority helper tip: **PASS** (`tender-offer-pln-authority.ts` · S3 CLOSED).

| Surface | Prezentacja | Źródło |
|---------|-------------|--------|
| Hub headline `data-s3-primary-pln-headline` | Primary + Bid secondary przy mismatch | Offer / Bid per Expert |
| Chief Offer Recommendation | Primary card PLN | `offerPricePln` |
| DW Recommendation Panel | Primary card PLN + badge | Offer Expert |
| EW OfferDetailsPanel | W collapsed details | Offer |
| TRE Outcome (poza Hub) | Authoritative / NO PRIMARY | S3 |

**Werdykt AC-S4-4:** **FAIL wizualnie** — authority SSOT OK, ale **3+ duże PLN** w stacku Hub (headline + Chief + DW).  
**NIE** trzeci silnik — tylko multiplikacja presentation (PLAN: demote visual, nie nowy PLN field).

---

## 7. S2 Dual Outcome Residues (Hub-adjacent)

| Check | Tip | Notes |
|-------|-----|-------|
| DW primary attrs | PASS | Hub `data-s2-dw-primary` · Host attrs |
| CTA Expert ON → scroll DW (nie setOwnerDecision GO) | PASS (S2) | `TenderWorkflowPrimaryAction` |
| Hierarchy cue text | PASS (weak) | 10px muted |
| Portfolio GO/HOLD poniżej Hub | **Competing cue** | Strategy — **OUT of S4 rewrite**; PLAN może tylko thin copy/demote w Przetarg workspace chrome jeśli Owner rozszerzy allowlist |
| Tab Decyzja / DecisionView | poza Hub | **S5** |

---

## 8. Consumer Map

```text
TenderDetailPage
  ├─ Command Layer (Strip / CTA / Intelligence shortcut)
  ├─ TRE-01 Outcome OR DetailPanel
  └─ TenderDetailPanel
       └─ TenderPrzetargWorkspace          ← jedyny importer HubPanel
            ├─ TenderWorkflowHubPanel      ← S4 centrum
            │    ├─ V2 Progress / Insights
            │    ├─ ChiefDossierSurface (+ EW nested)
            │    ├─ DecisionWorkspaceHost
            │    └─ progress accordion
            ├─ TenderPortfolioPositionPanel  ← Strategy bridge (OUT)
            └─ info / operator / footer
```

| Konsument | Relacja |
|-----------|---------|
| `TenderPrzetargWorkspace.tsx` | **jedyny** import `TenderWorkflowHubPanel` |
| `TenderDetailPanel` / `TenderDetailPage` | props VMs + CL chrome |
| Strategy module | **poza** Hub — `openTendersStrategy` / Portfolio |
| Persist / Bid calculator / Expert BC | konsumowane pośrednio przez Host/VM — **NO TOUCH S4** |

---

## 9. Gap Report (ranked)

### P0 — blokują AC-S4

| ID | Gap | AC | Kierunek PLAN (thin) |
|----|-----|-----|----------------------|
| **G1** | Brak narracji ANALIZA→…→DECYZJA; Intelligence między Progress a Chief | AC-S4-1 | Reorder / labels / collapse — bez nowego BC |
| **G2** | Intelligence Hub pinned + CL shortcut = primary SSOT | AC-S4-2 | Demote → accordion recovery; shortcut retarget / copy |
| **G3** | PLN ×3+ primary-looking (headline + Chief + DW) | AC-S4-4 | Jedna primary surface PLN; demote pozostałe do secondary/RO |

### P1

| ID | Gap | AC | Notes |
|----|-----|-----|-------|
| **G4** | EW collapsed + po Offer Rec (odwrócona kolejność vs DF) | AC-S4-3 | Thin reorder wewnątrz Chief surface allowlist |
| **G5** | Validation dopiero w DW po Chief Rec | AC-S4-1 | Hierarchy cue / section order — bez Validation BC |
| **G6** | TRE default ON ukrywa Hub first-paint | observability | **S7** scope delete; S4 PLAN: QA path = recovery / flag |
| **G7** | Portfolio GO/HOLD konkuruje z DW primary | S2 residue | Strategy OUT; optional thin demote copy **tylko** jeśli Owner GO rozszerzy allowlist poza Hub |

### P2

| ID | Gap | Notes |
|----|-----|-------|
| **G8** | Process Strip Docs→Oferta ≠ 5-step modernization | Parallel taxonomy — nie przepisywać Strip w S4 bez GO |
| **G9** | Accordion miesza Analysis + blockers + checklist | ANALIZA boundary |
| **G10** | CL vs non-CL dwie hierarchie | Prefer CL path as SSOT PLAN |

### Nie-gapy (PASS / OUT)

| Temat | Status |
|-------|--------|
| S3 authority helper | PASS |
| Bid calculator istnieje | PASS (KEEP) |
| ZERO third pricing engine | PASS |
| Strategy osobny | PASS (poza Hub) |
| TRE hard delete | OUT → S5/S7 |
| DecisionView hard delete | OUT → S5/S8 |
| Cloud Persist | OUT |

---

## 10. Allowlist (propozycja AUDIT → PLAN)

Zgodnie z DF §11 S4 (+ precyzja z evidence):

### IN (thin UX / layout / copy)

| Plik | Zakres oczekiwany PLAN |
|------|------------------------|
| `src/app/TenderWorkflowHubPanel.tsx` | order surfaces · Intelligence demote · PLN headline demotion · hierarchy cues |
| `src/app/TenderWorkspaceV2Panel.tsx` | InsightsCompact pin→collapse · Progress placement |
| `src/app/chief-dossier/ChiefDossierSurface.tsx` | thin order Trace/EW vs Offer Rec (UI only) |
| `src/app/decision-workspace/DecisionWorkspaceSurface.tsx` | thin hierarchy / demote duplicate PLN presentation **only** |
| `src/app/TenderWorkflowPrimaryAction.tsx` | copy/chrome only (już S2-aware) |
| Opcjonalnie (Owner confirm w PLAN): `TenderDetailPage.tsx` / `tender-command-layer-ux.ts` | Intelligence shortcut demote / retarget — **chrome thin** |

### OUT (zakaz S4)

| OUT | Powód |
|-----|-------|
| Expert / Chief / Session / Adapters / TF / OfferBoq / Bid **domain** | 8 LOCK |
| Nowe Intelligence BC / „Intelligence 2” | DF zakaz · ZERO third intelligence |
| Strategy module rewrite | osobny system |
| TRE-01 delete / Outcome engine | S7 |
| Tab Decyzja → DW mount | S5 |
| Persist bridge / store | S6 |
| Hard REMOVE | S8 |
| `useTenderOfferRun.ts` WIP | poza TM-01 S4 · nie stage |
| Trzeci PLN field / unifiedPln | S3 LOCK |

### Rollback (DF)

Revert UI commit / layout flag — bez migracji danych.

---

## 11. Dependencies

| Dependency | Status | Blokuje S4? |
|------------|--------|-------------|
| S0 orphan | CLOSED | NIE |
| S1 Module Enablement | CLOSED | NIE |
| S2 Dual Outcome | CLOSED | NIE (required before PV) |
| S3 Align Pricing | CLOSED | NIE (required before PV · AC-S4-4) |
| S3-D Bid deprecate | OPEN | NIE — OUT S4 |
| S5–S8 | OPEN | NIE startują w S4 |
| TRE default ON | tip | NIE blokuje PLAN; wpływa na QA observability |
| Local WIP `useTenderOfferRun.ts` | LOCAL M | **NIE** wchodzi do S4 |

**PV gate (DF):** S2 + S3 CLOSED — **spełnione**.

---

## 12. Primary Policy Check (Hub)

| Polityka | Oczekiwane | Runtime Hub | Werdykt |
|----------|------------|-------------|---------|
| Expert AI PRIMARY path | Module effective | Session/DW stack gdy effective | PASS (path) |
| DW = primary decision | jedna human decision | DW Actions + S2 cue; Portfolio GO/HOLD adjacent | PARTIAL (adjacent) |
| Offer = primary PLN @ ON | S3 | authority OK; visual ×3 | PARTIAL |
| NO PRIMARY @ Offer null | S3 | helper + TRE | PASS (authority) |
| Intelligence ≠ SSOT | S4 | nadal pinned | **FAIL** |
| Strategy osobny | KEEP | poza Hub | PASS |
| ZERO third engines | KEEP | brak 3. silnika | PASS |

---

## 13. Recommendation (AUDIT → PLAN)

1. **S4 PLAN thin** — hierarchy only: demote Intelligence → recovery; reorder story cues; single primary PLN surface visual; EW/Trace vs Rec order.  
2. **Nie** otwierać S5/S6/S7/S8 w tym samym turnie.  
3. **Nie** tworzyć Intelligence 2 / trzeciego PLN / nowego store.  
4. Strategy / Portfolio — poza rewrite; demote copy tylko z jawnym Owner allowlist expand.  
5. TRE — dokumentować QA via Hub recovery; deprecation = S7.  
6. Harness AC-S4-1…4 (presentation assertions) w PLAN.  
7. WIP `useTenderOfferRun.ts` — **nie** stage.

---

## 14. READY FOR PLAN / IMPLEMENT?

| | |
|--|--|
| **READY FOR S4 PLAN** | **YES** |
| **READY FOR IMPLEMENT S4** | **NIE** — wymaga Owner GO na osobny turn **PLAN** → potem GO IMPLEMENT |
| **8 LOCK** | **PASS** (ten turn = docs audit only) |
| **Runtime diff ten turn** | **EMPTY** (brak zmian kodu) |

---

## 15. Evidence Pointers

| Temat | Ścieżka |
|-------|---------|
| Hub order CL | `src/app/TenderWorkflowHubPanel.tsx` 192–213 |
| Intelligence pinned | `src/app/TenderWorkspaceV2Panel.tsx` 132–211 |
| Chief Rec → EW | `src/app/chief-dossier/ChiefDossierSurface.tsx` 56–82 |
| EW collapsed | `src/app/expert-workspace/ExpertWorkspaceSurface.tsx` 30–47 |
| DW Val → Rec → Actions | `src/app/decision-workspace/DecisionWorkspaceSurface.tsx` 54–61 |
| PLN authority | `src/lib/tender-offer-pln-authority.ts` |
| Pricing SSOT | `docs/architecture/TENDER-PRICING-SSOT.md` |
| Hub sole consumer | `src/app/TenderPrzetargWorkspace.tsx` 133 |
| Portfolio Strategy | `src/app/TenderPrzetargWorkspace.tsx` 155–161 |
| DF Hub hierarchy | `TENDER-MODERNIZATION-01-DESIGN-FREEZE.md` §7 |
| AC-S4 | DF §12 · PLAN §11 |

---

## 16. Closing

```text
S4 AUDIT COMPLETE
Owner GO AUDIT: honoured (docs only)

Target: ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA
Runtime: Intelligence still PINNED · EW demoted · PLN ×3 visual · DW Actions OK

AC-S4-1 FAIL
AC-S4-2 FAIL
AC-S4-3 PARTIAL
AC-S4-4 FAIL (visual) / authority PASS

8 LOCK PASS
ZERO third engine PASS
Strategy OUTSIDE Hub PASS
TRE delete OUT (S7)

READY FOR S4 PLAN
WAITING FOR OWNER GO → PLAN (nie IMPLEMENT)
```
