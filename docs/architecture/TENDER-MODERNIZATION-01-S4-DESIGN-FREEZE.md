# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S4 (Hub UX)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **READY FOR IMPLEMENT** (czekaj Owner GO)  
> **ID:** TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S4 — Hub UX**  
> **TRYB:** DESIGN FREEZE (LOCKED) · IMPLEMENT tylko po jawnym Owner GO  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** / **`ec8a5044`** · **PRODUCTION VERIFIED** · GREEN  
> **Owner GO DF:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S4-AUDIT.md`](TENDER-MODERNIZATION-01-S4-AUDIT.md) (**COMPLETE**)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S4-PLAN.md`](TENDER-MODERNIZATION-01-S4-PLAN.md) (**COMPLETE**)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §7 · §11 S4 · §12 AC-S4  
> **Pricing SSOT:** [`TENDER-PRICING-SSOT.md`](TENDER-PRICING-SSOT.md) — **NO TOUCH** authority  
> **Decision arch:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md) — DW = primary human · Intelligence ≠ decyzja  
> **Prior CLOSED:** S0 · S1 · S2 · S3

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S4 — DESIGN FREEZE

LOCKED story (CL Hub path = SSOT):
  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA

LOCKED primary PLN surface (visual):
  Hub headline [data-s3-primary-pln-headline] + data-s4-primary-pln="1"
  Authority = resolveAuthoritativeOfferPln (S3) — NO TOUCH

LOCKED Intelligence:
  recovery accordion ONLY · ≠ SSOT procesu · ≠ SSOT decyzji
  REUSE InsightsCompact · NO Blind Delete · NO Intelligence 2

LOCKED CL shortcut:
  label ≠ „Podsumowanie oferty” jako proces SSOT
  scroll → [data-tender-workflow-hub] (start Hub / ANALIZA)
  NIE primary target #tender-intelligence-hub

LOCKED Chief DOM order:
  Session → Trace → Expert Workspace → Offer Recommendation
  (+ blockers/loop/timeline KEEP między Session a Trace OK)

LOCKED DW DOM order:
  ProcessStatus → Validation → Recommendation → Findings → Actions

LOCKED duplicate PLN chrome:
  PRIMARY = Hub headline only (≤1 × data-s4-primary-pln="1")
  Chief Offer PLN = secondary
  DW Rec PLN = secondary
  Bid secondary mismatch KEEP (S3)

NO NEW FLAG
Allowlist STRICT · 8 LOCK · thin UX only
OUT: Strategy rewrite · TRE delete · S5/S6/S8 · OfferRun WIP
     third PLN · third engine

STATUS: DESIGN FREEZE COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S4-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S4-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT S4 → AC harness → Owner QA → build
        → commit allowlist ONLY → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend.  
Agent **nie** rozszerza allowlist, **nie** rusza 8 LOCK BC, **nie** zmienia S3 authority, **nie** usuwa Intelligence, **nie** dodaje flagi, **nie** wchodzi w S5–S8.

### STOP conditions (pre-IMPLEMENT)

| STOP jeśli | Stan DF |
|------------|---------|
| Potrzeba nowego BC / Intelligence 2 | **NIE** — denylist |
| Potrzeba zmiany `tender-offer-pln-authority` | **NIE** — S3 LOCK |
| Potrzeba Strategy / TRE delete | **NIE** — OUT |
| Primary PLN surface niejednoznaczny | **NIE** — §3 LOCK Hub headline |
| Wymagana nowa flaga LS/AppSettings | **NIE** — §12 · rollback = revert |
| Validation ma być ukryte | **NIE** — zakaz epic DF |

**STOP:** nie wymagany.

---

## 1. Scope

### IN (LOCKED) — kroki S4-A…F

| Krok | Treść LOCKED |
|------|----------------|
| **S4-A** | Intelligence → recovery accordion · CL shortcut retarget |
| **S4-B** | Reorder Hub CL path = SSOT hierarchy + `data-s4-*` |
| **S4-C** | Chief: Trace → EW → Offer Recommendation |
| **S4-D** | DW: Validation KEEP · demote duplicate PLN chrome |
| **S4-E** | Jedna primary PLN surface = Hub headline |
| **S4-F** | PrimaryAction / hierarchy copy · harness AC-S4-1…4 |
| **Docs** | IMPLEMENT · PV · CLOSEOUT · tip pointers przy release |

### OUT (LOCKED)

| Item | |
|------|--|
| Expert / Chief / Session / Validation **BC** | 8 LOCK |
| Wire Adapters · Technology / TF | 8 LOCK |
| OfferBoq / Bid **domain calculation** | 8 LOCK |
| `tender-offer-pln-authority.ts` semantics / formulas | S3 LOCK |
| Strategy rewrite · Portfolio BC | OUT |
| TRE delete / Outcome engine / default flag TRE | **S7** |
| Tab Decyzja → DW · Persist bridge · Hard REMOVE | **S5 / S6 / S8** |
| `useTenderOfferRun.ts` | WIP · **nie stage** |
| Third PLN field · third pricing/intelligence engine | **ZAKAZ** |
| Process Strip taxonomy rewrite (Docs→Oferta) | OUT minimal S4 |
| Nowa flaga `kw-tm01-s4-*` / AppSettings | **OUT** (§12) |

**Scope:** **PASS**.

---

## 2. Final Hub hierarchy (LOCKED)

### 2.1 Historia użytkownika (LOCKED)

```text
ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA
(+ RECOVERY accordion — poza narracją SSOT)
```

### 2.2 Mount order — Command Layer ON (SSOT test path)

```text
[Command Layer — poza Hub panelem, KEEP thin]
  Process Strip · Trust · Primary CTA
  Shortcut chip → §5 (retarget)

[data-tender-workflow-hub][data-s4-hub-hierarchy="1"]
  1. [data-s4-step="analiza"]
       Progress compact (TenderWorkspaceV2ProgressCompact)
       opc. thin label „Analiza”
       — BRAK pinned Intelligence

  2. [data-s4-step="eksperci"]  #chief-dossier-surface
       ChiefSessionStatusBar
       (blockers / loop / timeline — KEEP jeśli show*)
       ChiefExpertTraceList          ← Trace
       ExpertWorkspaceSurface        ← EW (Slot A; <details> OK)
       — Offer Rec NIE tutaj jeszcze

  3–5. #decision-workspace-surface  (gdy Session for DW)
       [data-s4-step="walidacja"]   DecisionValidationSummary
       [data-s4-step="rekomendacja"] 
            ChiefOfferRecommendation  ★ system REKOMENDACJA
                 — UWAGA kolejności: Offer Rec jest W Chief (§4)
                 — w narracji Hub: po EKSPERCI, przed / równolegle z DW Rec
       W praktyce DOM LOCKED §2.3:

  DOM Hub (final):
       ANALIZA (Progress)
       Chief (Session → … → Trace → EW → Offer Rec)   ← Rec = krok D w Chief
       DW (Validation → Rec secondary → Findings → Actions)
       S2 hierarchy cue (KEEP)
       Recovery accordion (§6)

  6. [data-s4-step="decyzja"] = DecisionActionsBar (w DW)
  7. Recovery accordion [data-s4-recovery="1"]
```

### 2.3 Precyzyjny DOM Hub (LOCKED — jedna prawda)

```text
Hub children order (commandLayerActive === true):

  A. [data-s3-primary-pln-headline][data-s4-primary-pln="1"]   // gdy primaryPln != null
  B. [data-s4-step="analiza"] ProgressCompact
  C. #chief-dossier-surface [data-s4-step="eksperci"]
       internal: §4
  D. #decision-workspace-surface
       internal: §5 DW order
       data-s4-step na Validation / Rec / Actions zgodnie z §9
  E. [data-s2-hub-hierarchy-cue] (Expert ON) KEEP
  F. #tender-progress-accordion [data-s4-recovery="1"]
       InsightsCompact (Intelligence recovery)
       AnalysisStatusStrip
       V2 panel (skip progress/insights already shown)
       Blockers · Checklist · Positions

ZAKAZ: InsightsCompact jako sibling Progress powyżej Chief
```

**Uwaga narracyjna:**  
`Offer Recommendation` żyje **wewnątrz Chief** (po EW) = krok **REKOMENDACJA**.  
DW Recommendation = **ta sama rekomendacja**, chrome **secondary** (§7).  
DW Actions = **DECYZJA**.  
Validation w DW = **WALIDACJA** (przed DW Rec i Actions).

### 2.4 Path `commandLayerActive === false`

Mirror: brak pinned Intelligence; Insights tylko w recovery/accordion path; Chief/DW order jak §4–§5.  
**Testy AC:** ścieżka CL ON = SSOT.

**Hierarchy:** **PASS** (zamrożone).

---

## 3. Primary PLN surface owner (LOCKED)

| | LOCKED |
|--|--------|
| **Właściciel primary PLN (visual)** | **Hub headline** — `data-s3-primary-pln-headline` + **`data-s4-primary-pln="1"`** |
| **Źródło liczby** | `resolveAuthoritativeOfferPln` / `…ForRole` — **NO TOUCH** |
| **Badge źródła** | KEEP S3: Offer / Bid / none |
| **Gdy `primaryPln == null`** | **brak** headline · **NO PRIMARY** (Expert ON + Offer null) — S3 |
| **Bid secondary line** | KEEP `data-s3-bid-secondary` gdy Expert ON + mismatch/diff — **nie** `data-s4-primary-pln` |
| **Mismatch badge** | KEEP `data-s3-mismatch-badge` |

```text
COUNT([data-s4-primary-pln="1"]) ≤ 1  w całym Hub stack
```

**Alternatywa PLAN (Chief = primary) — ODRZUCONA** w tym DF.  
Zmiana wymaga DF amend + Owner GO.

**Primary PLN owner:** **PASS**.

---

## 4. Chief internal order (LOCKED)

```text
#chief-dossier-surface
  header (title/subtitle)
  ChiefSessionStatusBar
  empty message (gdy emptyish)
  ChiefBlockersPanel          // jeśli showBlockers
  ChiefLoopReturnBadge        // jeśli showLoopReturn
  ChiefTaskTimeline           // jeśli showTimeline
  ChiefExpertTraceList        // jeśli showTraces     ← TRACE
  ExpertWorkspaceSurface      // jeśli VM != null     ← EW
  ChiefOfferRecommendation    // jeśli showOffer      ← OFFER REC (po EW)
```

| Reguła | LOCKED |
|--------|--------|
| Trace **przed** EW | TAK (gdy oba widoczne) |
| EW **przed** Offer Rec | TAK (gdy oba widoczne) |
| Offer Rec **przed** Trace/EW | **FORBIDDEN** |
| EW `<details>` collapsed default | **ALLOWED** (pozycja w DOM = przed Rec) |
| Zmiana paneli EE→ME→PE→Cost→Offer | **FORBIDDEN** |
| Chief VM / Session BC | **NO TOUCH** |

**Chief order:** **PASS**.

---

## 5. Decision Workspace order (LOCKED)

```text
#decision-workspace-surface
  header
  DecisionProcessStatusBar
  empty message (gdy)
  DecisionValidationSummary      ← WALIDACJA
  DecisionRecommendationPanel    ← REKOMENDACJA (chrome secondary §7)
  DecisionFindingsPanel          ← KEEP między Rec a Actions
  DecisionActionsBar             ← DECYZJA (PRIMARY human · S2)
```

| Reguła | LOCKED |
|--------|--------|
| Validation **przed** Recommendation | TAK |
| Recommendation **przed** Actions | TAK |
| Validation ukryte | **FORBIDDEN** |
| Actions semantics / Persist | **NO TOUCH** (S2 KEEP) |
| `data-s2-dw-primary` | KEEP gdy Expert-effective |

**DW order:** **PASS**.

---

## 6. Intelligence = recovery accordion (LOCKED)

| | LOCKED |
|--|--------|
| Rola | **Recovery / deep detail** — **nie** SSOT procesu · **nie** SSOT decyzji |
| Komponent | **REUSE** `TenderWorkspaceV2InsightsCompact` |
| Mount tip (przed) | pinned sibling Progress w Hub CL |
| Mount target | **Wewnątrz** `#tender-progress-accordion` z `data-s4-recovery="1"` |
| `id="tender-intelligence-hub"` | **KEEP** na recovery Insights root (scroll continuity) |
| Title copy | **nie** „Podsumowanie oferty” jako kanon procesu; np. „Alerty / Intelligence (recovery)” |
| Cost shortcut row w Insights | **KEEP** w recovery (nawigacja wyceny OK) |
| Blind delete InsightsCompact | **FORBIDDEN** |
| Nowe Intelligence BC | **FORBIDDEN** |

**Intelligence:** **PASS**.

---

## 7. Command Layer shortcut retarget (LOCKED)

| | LOCKED |
|--|--------|
| **Pliki** | `TenderDetailPage.tsx` **i/lub** `tender-command-layer-ux.ts` (label helper) |
| **Label CURRENT** | „Podsumowanie oferty” (`buildIntelligenceHubShortcutLabel`) |
| **Label TARGET** | „Hub przetargu” (lub równoważne PL bez „Podsumowanie oferty” jako SSOT) |
| **Scroll target CURRENT** | `#tender-intelligence-hub` |
| **Scroll target TARGET** | **`[data-tender-workflow-hub]`** (start Hub / ANALIZA) |
| **Fallback** | jeśli Hub brak (TRE Outcome): istniejący recovery Hub path / `onOpenHub` — **nie** wymuszać Intelligence |
| **Secondary** | opcjonalny deep-link do recovery Intelligence **nie** jest CL primary chip |

**CL shortcut:** **PASS**.

---

## 8. Duplicate PLN chrome (LOCKED)

| Surface | Chrome LOCKED | Attr |
|---------|---------------|------|
| **Hub headline** | **PRIMARY** — `text-xl` / równoważny dominant | `data-s4-primary-pln="1"` + `data-s3-primary-pln-headline` |
| **Chief Offer Recommendation** | **SECONDARY** — PLN ≤ `text-base` / caption; **bez** peer primary card | `data-s4-primary-pln` **ABSENT**; opc. `data-s4-pln-chrome="secondary"` |
| **DW Recommendation Panel** | **SECONDARY** — ta sama liczba z authority, mniejszy chrome; badge Offer OK | j.w. |
| **EW OfferDetailsPanel** | tertiary / details (KEEP) | brak primary |
| **Bid secondary** | Hub only pod headline | `data-s3-bid-secondary` |

```text
ZAKAZ: Hub + Chief + DW jednocześnie jako text-xl primary
ZAKAZ: nowy PLN SSOT field
ZAKAZ: zmiana wartości poza resolveAuthoritativeOfferPln
```

Komponenty Chief/DW Rec **zostają** (treść, scenarios, handoff) — tylko **chrome PLN**.

**Duplicate PLN:** **PASS**.

---

## 9. AC-S4-1…4 + DOM / data-* assertions (LOCKED)

### AC-S4-1 — Jedna historia

| | |
|--|--|
| **PASS** | Na Hub (CL ON, Hub visible): kolejność kroków zgodna z §2.3; brak Intelligence pinned między Progress a Chief |
| **Assert** | `hub.query('[data-s4-step="analiza"]')` przed Chief; Chief przed DW Actions; brak `[data-tender-intelligence-hub]` poza `[data-s4-recovery]` |

### AC-S4-2 — Intelligence ≠ primary SSOT

| | |
|--|--|
| **PASS** | Insights tylko w recovery; CL shortcut nie scrolluje do Intelligence jako primary |
| **Assert** | `hub.queryAll('[data-tender-intelligence-hub]').every(el => el.closest('[data-s4-recovery="1"]'))` · shortcut target = `[data-tender-workflow-hub]` · label ≠ legacy SSOT „Podsumowanie oferty” (proces) |

### AC-S4-3 — Chief + EW + DW w hierarchy

| | |
|--|--|
| **PASS** | Przy Session ON: Chief + (EW gdy VM) + DW zamontowane; w Chief: Trace przed EW przed Offer Rec (gdy widoczne) |
| **Assert** | `#chief-dossier-surface` · `#expert-workspace-surface` (gdy VM) · `#decision-workspace-surface` · relative order Trace/EW/OfferRec · Validation visible · Actions present · `data-s2-dw-primary` KEEP |

### AC-S4-4 — Jeden primary PLN visual

| | |
|--|--|
| **PASS** | `document.querySelectorAll('[data-s4-primary-pln="1"]').length ≤ 1` w Hub; gdy Expert ON + Offer: source `offer_expert`; Offer null → brak primary attr; Bid secondary ≠ primary |
| **Assert** | S3 attrs `data-s3-primary-source` / mismatch KEEP · Chief/DW **bez** `data-s4-primary-pln="1"` |

### Harness artefakt (IMPLEMENT)

```text
scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs
```

**AC:** **PASS** (zamrożone jako testowalne).

---

## 10. Implementation allowlist (LOCKED · minimal)

| # | Path | Dozwolone |
|---|------|-----------|
| 1 | `src/app/TenderWorkflowHubPanel.tsx` | order · recovery mount · `data-s4-*` · primary PLN attr na headline |
| 2 | `src/app/TenderWorkspaceV2Panel.tsx` | InsightsCompact recovery title/anchor · brak pin w primary |
| 3 | `src/app/chief-dossier/ChiefDossierSurface.tsx` | **UI order only** §4 |
| 4 | `src/app/chief-dossier/ChiefOfferRecommendation.tsx` | **PLN chrome demote only** (jeśli potrzebne do AC-S4-4; thin class/attr) |
| 5 | `src/app/decision-workspace/DecisionWorkspaceSurface.tsx` | order confirm · `data-s4-step` |
| 6 | `src/app/decision-workspace/DecisionRecommendationPanel.tsx` | **PLN chrome demote only** |
| 7 | `src/app/TenderWorkflowPrimaryAction.tsx` | **copy only** |
| 8 | `src/app/TenderDetailPage.tsx` | shortcut scroll target |
| 9 | `src/lib/tender-command-layer-ux.ts` | shortcut label helper |
| 10 | `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` | NEW harness |
| 11 | Docs S4 IMPLEMENT / PV / CLOSEOUT (+ tip pointers przy release) | |

**Allowlist #4 i #6:** tylko jeśli demote w Surface niewystarczający — **PLN chrome only**, zero logiki kwoty.

**Diff MUST ⊆** powyższa lista (+ docs/harness).

**Zakaz stage:** `src/app/hooks/useTenderOfferRun.ts` · Strategy · TRE · Expert lib · authority helper.

---

## 11. S3 authority / parity — ZERO zmian (LOCKED)

| Artefakt | S4 |
|----------|-----|
| `src/lib/tender-offer-pln-authority.ts` | **NO TOUCH** |
| [`TENDER-PRICING-SSOT.md`](TENDER-PRICING-SSOT.md) | **NO TOUCH** semantyki |
| S3 parity harness | **regresja PASS** wymagana przed CLOSE |
| Expert ON → Offer primary | KEEP |
| Expert ON + null → NO PRIMARY | KEEP |
| Expert OFF → Bid primary | KEEP |
| `OfferBoq.directPln` = COST | KEEP |
| Third PLN | **FORBIDDEN** |

**S3 zero-change:** **PASS**.

---

## 12. Rollback (LOCKED)

| | LOCKED |
|--|--------|
| Mechanizm | **`git revert`** commitu/ów S4 (UI allowlist) |
| Nowa flaga LS / AppSettings | **NIE** — brak konieczności (DF §14) |
| Migracja danych | **brak** |
| Stores | **nietknięte** |
| S2 / S3 behavior po revert | tip pre-S4 hierarchy |

**Rollback:** **PASS**.

---

## 13. Owner Verification matrix (LOCKED)

| ID | Scenariusz | Oczekiwane | Gate |
|----|------------|------------|------|
| **OV-S4-1** | Hub recovery (TRE off lub Open Hub) · Expert ON · Session ON | Widoczna kolejność ANALIZA→…→DECYZJA · Intelligence w accordion | AC-S4-1 |
| **OV-S4-2** | CL chip „Hub przetargu” | Scroll do Hub start · **nie** focus pinned Intelligence | AC-S4-2 |
| **OV-S4-3** | Accordion recovery open | Insights + alerty dostępne · REUSE | AC-S4-2 |
| **OV-S4-4** | Chief z Offer + EW | Trace → EW → Offer Rec w DOM | AC-S4-3 |
| **OV-S4-5** | DW | Validation widoczne · Actions primary · Rec PLN nie konkuruje text-xl z Hub | AC-S4-3/4 |
| **OV-S4-6** | Expert ON + Offer PLN | **Jeden** dominant PLN = Hub headline · badge Offer | AC-S4-4 + S3 |
| **OV-S4-7** | Expert ON + Offer null | Brak primary headline · Bid **nie** awansuje | S3 NO PRIMARY |
| **OV-S4-8** | Expert OFF | Bid primary w headline (S3) · Hub hierarchy nadal spójna | S3 + S4 |
| **OV-S4-9** | CTA Expert ON | Nadal scroll/focus DW (S2) · copy OK | S2 regresja |
| **OV-S4-10** | Strategy / Portfolio | Działa jak tip · **bez** rewrite S4 | OUT check |
| **OV-S4-11** | Harness S4 + S3 parity | PASS | CI/local |
| **OV-S4-12** | Diff review | ⊆ allowlist §10 · brak OfferRun WIP | Release |

**Owner Verification:** **PASS** (zamrożone).

---

## 14. Flagi (LOCKED)

```text
NO NEW FLAG

Uzasadnienie: S4 = pure presentation/reorder.
Kill-switch = git revert.
LS Session/DW pozostają kill-switch S2 (NO TOUCH semantyki).
```

**Flags:** **PASS**.

---

## 15. 8 LOCK + Decision architecture carry-forward

| LOCK | S4 |
|------|-----|
| Expert BC | NO TOUCH |
| Chief BC | NO TOUCH (tylko Surface order) |
| Session BC | NO TOUCH |
| Validation BC | NO TOUCH (tylko panel order/visibility KEEP) |
| Adapters | NO TOUCH |
| TF | NO TOUCH |
| OfferBoq / Bid domain | NO TOUCH |
| DW = primary human decision | KEEP ([`DECISION-ARCHITECTURE`](DECISION-ARCHITECTURE.md)) |
| Intelligence / Chief rec | doradcze · **NIE** decyzja człowieka | KEEP |

---

## 16. Implementation sequence (LOCKED hint)

```text
S4-A → S4-B → S4-C → S4-D → S4-E → S4-F → harness → Owner OV → PV → CLOSEOUT
```

Jeden PR / jeden commit logiczny **dozwolony**, jeśli diff ⊆ allowlist.

---

## 17. READY FOR IMPLEMENT?

| | |
|--|--|
| **DESIGN FREEZE COMPLETE** | **YES** |
| **READY FOR IMPLEMENT** | **YES** — **czekaj jawny Owner GO IMPLEMENT** |
| **IMPLEMENT / COMMIT / PUSH ten turn** | **NO** |
| **Runtime diff ten turn** | **EMPTY** |

---

## 18. Closing

```text
S4 DESIGN FREEZE COMPLETE
Owner GO DF: honoured (docs only)

Hierarchy LOCKED:
  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA
Primary PLN LOCKED: Hub headline (data-s4-primary-pln="1")
Intelligence LOCKED: recovery accordion (REUSE)
CL shortcut LOCKED: Hub start — nie Intelligence
Chief LOCKED: Trace → EW → Offer Rec
DW LOCKED: Validation → Rec → Findings → Actions
Duplicate PLN LOCKED: secondary chrome on Chief/DW
NO NEW FLAG · 8 LOCK · allowlist STRICT
S3 authority: ZERO CHANGE

STOP — czekaj OWNER GO → IMPLEMENT
```
