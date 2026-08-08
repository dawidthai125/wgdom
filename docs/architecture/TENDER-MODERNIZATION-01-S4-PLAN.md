# TENDER-MODERNIZATION-01 / S4 — PLAN (Hub UX)

> **STATUS:** **PLAN COMPLETE** · **DF** → [`TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** TENDER-MODERNIZATION-01-S4-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S4 — Hub UX**  
> **TRYB:** **PLAN ONLY** (zamknięty przez S4 DF) · ZERO kodu w tym dokumencie  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / **`ec8a5044`** · **PRODUCTION VERIFIED** · GREEN  
> **Owner GO PLAN:** 2026-08-08 (jawny)  
> **SSOT IMPLEMENT:** [`TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S4-AUDIT.md`](TENDER-MODERNIZATION-01-S4-AUDIT.md) (**COMPLETE**)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §7 · §11 S4 · §12 AC-S4  
> **Epic PLAN:** [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md) §7 · §10 S4  
> **Pricing SSOT:** [`TENDER-PRICING-SSOT.md`](TENDER-PRICING-SSOT.md) (S3 CLOSED — NO TOUCH authority)  
> **Prior CLOSED:** S0 · S1 · S2 · S3  
> **Next:** Owner GO **IMPLEMENT S4** (osobny turn)

```text
════════════════════════════════════════════════════════
S4 PLAN — Hub UX (thin presentation / hierarchy)

Cel: jedna historia Hub
  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA

G1  story order + hierarchy cues
G2  Intelligence PINNED → recovery accordion (≠ SSOT)
G3  jedna primary surface PLN (visual) · S3 authority KEEP

S4-A  Intelligence demote + CL shortcut retarget
S4-B  Hub surface reorder (CL path SSOT)
S4-C  Chief internal order (Trace/EW before Offer Rec)
S4-D  DW presentation: Validation cue · demote duplicate PLN
S4-E  Single primary PLN surface · secondary demote
S4-F  Hierarchy labels / PrimaryAction copy · harness AC

OUT: 8 LOCK BC · Strategy rewrite · TRE delete · S5/S6/S8
     useTenderOfferRun WIP · third PLN/engine/intelligence

STATUS: PLAN COMPLETE · DF COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. DF epic alignment (pre-check)

| Epic DF § | PLAN alignment | Konflikt? |
|-----------|----------------|-----------|
| §7.1 historia 5 kroków | S4-B/C/D/F | **NIE** |
| §7.2 surface order | target map §1 | **NIE** |
| Intelligence → collapse/recovery | S4-A | **NIE** |
| ZERO Intelligence 2 | denylist | **NIE** |
| Ukrycie Validation **ZAKAZ** | S4-D KEEP Validation visible | **NIE** |
| Allowlist DF §11 S4 | §2 poniżej (precyzja) | **NIE** |
| AC-S4-1…4 | §4 testowalne | **NIE** |
| S2 DW primary · S3 Offer PLN | regresja §5–§6 | **NIE** |
| TRE full-screen poza S4 | OUT S7 | **NIE** |

**STOP:** nie wymagany · **READY FOR DESIGN FREEZE** po Owner GO.

---

## 1. Current → Target hierarchy map

### 1.1 CURRENT (tip · Command Layer ON · Hub recovery)

```text
[CL] Process Strip · Trust · Primary CTA · chip → #tender-intelligence-hub
[Hub]
  1. S3 PLN headline          (text-xl primary)
  2. Progress compact         (ANALIZA partial)
  3. Intelligence PINNED      ★ „Podsumowanie oferty” = de facto SSOT scroll
  4. Chief Dossier
       Session
       Offer Rec PLN          ★ REKOMENDACJA przed EW
       Blockers / timeline / traces
       Expert Workspace       (collapsed <details>)  ← EKSPERCI demoted
  5. Decision Workspace
       Validation             ← WALIDACJA
       Rec PLN again          ★ duplikat
       Findings
       Actions                ← DECYZJA
  6. S2 cue (muted)
  7. Accordion „Szczegóły postępu”  (Analysis strip · V2 · blockers)
[After Hub] Portfolio GO/HOLD (Strategy — OUT rewrite)
```

### 1.2 TARGET (S4 · CL path = SSOT hierarchy)

```text
[CL] Process Strip · Trust · Primary CTA
     chip: retarget → Hub story / #chief-dossier-surface lub #tender-progress-accordion
     (NIE primary SSOT Intelligence)

[Hub]  data-s4-hub-hierarchy="1"
  A. ANALIZA
       Progress compact
       (opc. thin label „Analiza”)
       Analysis details → tylko w recovery accordion (nie pinned Intelligence)

  B. EKSPERCI
       Chief Dossier header / Session / Trace
       Expert Workspace (Slot A) — widoczny w story PRZED Offer Rec
       (EW może zostać <details>, ale pozycja = przed rekomendacją ceny)

  C. WALIDACJA
       Decision Workspace — Validation summary jako pierwszy substantive panel DW
       (KEEP Validation · NIE ukrywać · NIE przenosić BC)

  D. REKOMENDACJA
       Chief Offer Recommendation  = system recommendation surface
       DW Recommendation panel     = RO / secondary presentation (bez 2. primary PLN card)

  E. DECYZJA
       Decision Actions (PRIMARY human) — KEEP S2
       S2 hierarchy cue KEEP

  F. RECOVERY (nie SSOT procesu)
       Accordion „Szczegóły / Intelligence (recovery)”
         · InsightsCompact (były Intelligence Hub)
         · Analysis status strip
         · Blockers / checklist / positions
         · id anchor retained for scroll (patrz §7)

[PLN]  JEDNA primary surface (patrz §8)
       Authority = resolveAuthoritativeOfferPln (S3) — NO TOUCH helper/formuł
```

### 1.3 Map gaps → PLAN steps

| Gap AUDIT | Target fix | Step |
|-----------|------------|------|
| **G1** brak jednej historii | reorder + labels §1.2 | S4-B · S4-C · S4-D · S4-F |
| **G2** Intelligence pinned | → recovery accordion | **S4-A** |
| **G3** PLN ×3 visual | jedna primary surface | **S4-E** (+ S4-D demote DW PLN) |

---

## 2. Exact minimal allowlist

### 2.1 IN (LOCKED dla PLAN → DF)

| # | Plik | Dozwolone zmiany | Zakaz w pliku |
|---|------|------------------|---------------|
| 1 | `src/app/TenderWorkflowHubPanel.tsx` | mount order · move Insights do accordion · hierarchy `data-*` · PLN headline demotion/placement · thin labels | Session/DW Host props domain · authority calc change |
| 2 | `src/app/TenderWorkspaceV2Panel.tsx` | InsightsCompact: nie pin w Hub primary · props/anchor recovery · copy title „recovery” | insights engine / overlay BC |
| 3 | `src/app/chief-dossier/ChiefDossierSurface.tsx` | **UI order only**: Trace (+ EW) **przed** Offer Rec | Chief VM / Session / Expert BC |
| 4 | `src/app/decision-workspace/DecisionWorkspaceSurface.tsx` | **presentation only**: order cues · demote Rec PLN visual (size/badge secondary) | Validation rules · Persist · Host wire · actions semantics |
| 5 | `src/app/TenderWorkflowPrimaryAction.tsx` | **copy only** (labels / aria / helper text) | ownerDecision write logic (S2 KEEP) · nawigacja BC |
| 6 | `src/app/TenderDetailPage.tsx` **OR** `src/lib/tender-command-layer-ux.ts` | Intelligence shortcut: label + scroll target retarget | TRE gate · tab routing · Session build |
| 7 | Harness (nowy thin) | `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` (lub alias) | — |
| 8 | Docs | S4 DF · IMPLEMENT · CLOSEOUT · PV · tip pointers | — |

**Opcja CL (#6):** **IN** tego PLANU (zalecane) — bez retargetu shortcut G2 pozostaje FAIL (chip nadal SSOT-scroll do Intelligence).

### 2.2 OUT (LOCKED)

| Item | Powód |
|------|-------|
| Expert / Chief / Session / Validation **BC** | 8 LOCK |
| Wire Adapters · Technology/TF | 8 LOCK |
| OfferBoq / Bid **domain calculation** · `tender-offer-pln-authority.ts` formuły | S3 LOCK · NO TOUCH authority |
| Strategy rewrite · Portfolio panel BC | osobny system |
| TRE delete / Outcome engine / `tenders-v4-config` default | **S7** |
| Tab Decyzja → DW (**S5**) · Persist bridge (**S6**) · Hard REMOVE (**S8**) | poza slice |
| `src/app/hooks/useTenderOfferRun.ts` | LOCAL WIP · **nie stage** |
| Nowe Intelligence BC / Intelligence 2 | ZERO third intelligence |
| Trzeci PLN field (`unifiedPln` itd.) | S3 LOCK |
| Process Strip taxonomy rewrite (Docs→Oferta → 5-step) | P2 · poza minimal S4 (G8) |
| `TenderPrzetargWorkspace` Portfolio demote | OUT default; wymaga osobnego Owner expand |

### 2.3 Diff budget (guard)

```text
Diff ⊆ allowlist §2.1
Brak zmian w src/lib/{execution,material,pricing,cost,offer}-expert/**
Brak zmian w src/lib/chief-orchestrator/** · chief-session/** · chief-wire-adapters/**
Brak zmian w src/lib/validation-expert/**
Brak zmian w Bid calculator / OfferBoq pricing engine
Brak stage useTenderOfferRun.ts
```

---

## 3. Proponowana kolejność zmian (IMPLEMENT later)

Kolejność = jeden commit logiczny lub małe sekwencyjne PR — **bez** big-bang poza Hub.

| Krok | ID | Treść | Zamyka |
|------|-----|-------|--------|
| 1 | **S4-A** | Przenieś `TenderWorkspaceV2InsightsCompact` z pinned Hub do accordion recovery; zachowaj komponent REUSE; retarget CL shortcut | G2 |
| 2 | **S4-B** | Ustal mount order Hub CL: Progress → Chief → DW → accordion; thin step labels / `data-s4-step` | G1 partial |
| 3 | **S4-C** | `ChiefDossierSurface`: Trace + EW **przed** `ChiefOfferRecommendation` (UI only) | G1 / G4 / AC-S4-3 |
| 4 | **S4-D** | `DecisionWorkspaceSurface`: Validation first (już tip — potwierdź); demote Rec PLN card → secondary typography | G1 / G3 |
| 5 | **S4-E** | Jedna primary PLN surface w Hub stack (patrz §8); secondary Bid mismatch KEEP | G3 / AC-S4-4 |
| 6 | **S4-F** | PrimaryAction copy · hierarchy cue · harness AC-S4-1…4 · regresja S2/S3 smoke | AC + regresja |
| 7 | Docs PV | Owner QA hierarchy · tip bump tylko przy release | CLOSE |

**Non-CL path:** mirror Intelligence-not-pinned (już w accordion) — bez drugiej architektury; CL path = SSOT testów.

---

## 4. AC-S4-1…4 — kryteria testowalne

### AC-S4-1 — Hub czyta się jako ANALIZA→EKSPERCI→WALIDACJA→REKOMENDACJA→DECYZJA

| | |
|--|--|
| **PASS gdy** | Na ścieżce Hub (TRE recovery / Hub force): kolejność DOM / `data-s4-step` = Analysis → Experts → Validation → Recommendation → Decision; brak Intelligence między Progress a Chief |
| **Harness** | assert order selectors: progress / chief (traces\|ew before offer-rec) / dw-validation / offer-rec-or-dw-rec / dw-actions |
| **FAIL gdy** | Intelligence pinned powyżej Chief; Offer Rec przed Trace/EW bez cue; brak Validation przed Actions |

### AC-S4-2 — Intelligence ≠ primary SSOT

| | |
|--|--|
| **PASS gdy** | Brak pinned `#tender-intelligence-hub` w primary Hub stack; Insights tylko w recovery accordion (lub równoważny `<details>`); CL shortcut **nie** reklamuje Intelligence jako „Podsumowanie oferty = proces SSOT” — retarget / copy recovery |
| **Harness** | `query` Hub primary: zero `[data-tender-intelligence-hub]` poza accordionem; accordion zawiera insights |
| **FAIL gdy** | InsightsCompact sibling Progress powyżej Chief; shortcut scroll = jedyny „kanoniczny hub oferty” |

### AC-S4-3 — Chief + EW + DW widoczne w hierarchy

| | |
|--|--|
| **PASS gdy** | Przy Session ON: `#chief-dossier-surface` + `#expert-workspace-surface` (w Chief) + `#decision-workspace-surface` obecne; EW **przed** Offer Rec w DOM Chief; DW Actions = human primary (S2 attrs KEEP) |
| **Harness** | mount flags + relative order Trace/EW vs Offer Rec |
| **FAIL gdy** | brak DW/Chief przy stack ON; EW usunięty; Validation ukryty |

### AC-S4-4 — Jeden primary PLN (visual)

| | |
|--|--|
| **PASS gdy** | W Hub stack **co najwyżej jedna** powierzchnia z primary PLN chrome (`text-xl` / `data-s4-primary-pln="1"` / równoważny); pozostałe PLN = secondary/caption lub hidden gdy Expert ON + Offer primary; **authority** nadal `resolveAuthoritativeOfferPln` |
| **Harness** | count `[data-s4-primary-pln="1"]` ≤ 1; S3 attrs `data-s3-primary-source` zgodne; regresja S3 harness MATCH/EXPECTED unchanged |
| **FAIL gdy** | Hub headline + Chief Offer + DW Rec jednocześnie `text-xl` primary; nowy PLN field |

---

## 5. Regresja S3 pricing authority

| Check | Wymaganie |
|-------|-----------|
| Helper | `resolveAuthoritativeOfferPln` / `…ForRole` — **NO TOUCH** semantyki |
| Expert ON + Offer | PRIMARY = `offerPricePln` |
| Expert ON + Offer null | **NO PRIMARY** (nie Bid fallback) |
| Expert OFF | PRIMARY = `recommendedBidPln` |
| Cost | `OfferBoq.directPln` ≠ oferta |
| ZERO third PLN | brak `unifiedPln` / nowego SSOT field |
| Harness S3 | `scripts/test-tender-modernization-01-pricing-parity.mjs` (lub tip alias) — **PASS** bez regresji klas verdict |
| TRE Outcome | poza S4 UI — **nie** psuć S3 TRE presentation w tym slice (NO TOUCH Outcome chyba że DF S4 jawnie doda — **nie** dodajemy) |

**S4-E** zmienia tylko **która karta wygląda primary** — nie źródło liczby.

---

## 6. Regresja DW / Chief / EW

| Surface | KEEP | S4 może |
|---------|------|---------|
| Chief Session status / blockers / timeline / traces | TAK | tylko order względem Offer Rec |
| Expert Workspace EE→ME→PE→Cost→Offer | TAK (kolejność paneli LOCKED) | pozycja Slot A względem Offer Rec; **nie** zmieniać paneli |
| DW Validation / Findings / Actions / Persist wire | TAK | demote visual Rec PLN; **nie** zmieniać action IDs / Persist |
| S2 `data-s2-dw-primary` / Expert-effective | TAK | zachować |
| PrimaryAction → scroll DW (Expert ON) | TAK | copy only |

**Smoke sugerowany (IMPLEMENT):** istniejące harness S2 Dual Outcome + Chief UI + Expert Workspace + Decision Workspace — zero FAIL nowych.

---

## 7. Plan zachowania Intelligence jako recovery

### 7.1 Zasada

```text
Intelligence = REUSE istniejącego InsightsCompact / narrative
             ≠ nowy silnik
             ≠ SSOT procesu
             ≠ SSOT decyzji
             = recovery / deep detail w accordion
```

### 7.2 Mechanika (PLAN)

| Element | Target |
|---------|--------|
| Mount | **Usuń** z CL primary stack (Hub 195–200 dziś) |
| Destination | Wewnątrz `#tender-progress-accordion` (REUSE accordion) **lub** osobny `<details data-s4-intelligence-recovery>` sibling accordion — prefer **jeden** accordion recovery, żeby nie dublować UI |
| `id="tender-intelligence-hub"` | **KEEP** na recovery root (scroll continuity) — ale **nie** pinned primary |
| Title copy | np. „Intelligence / alerty (recovery)” · nie „Podsumowanie oferty” jako proces |
| Cost shortcut row w Insights | KEEP w recovery (nawigacja wyceny ≠ decision SSOT) |
| GuideView | docs-only update przy release (nie blocker PLAN) |

### 7.3 Command Layer shortcut

| CURRENT | TARGET |
|---------|--------|
| Label „Podsumowanie oferty” → scroll `#tender-intelligence-hub` | Label np. „Przebieg / Hub” → `#chief-dossier-surface` **lub** otwórz accordion + scroll recovery **jako secondary** |
| Pozycja chip | KEEP w CL (thin) |

**Zakaz:** usunięcie całego InsightsCompact z DOM (NO BLIND DELETE) — tylko demote.

---

## 8. Plan usunięcia wizualnych duplikatów PLN (bez zmiany SSOT)

### 8.1 Designation (presentation)

| Rola visual | Surface (wybór LOCKED w DF S4) | Chrome |
|-------------|--------------------------------|--------|
| **PRIMARY PLN** | **Jedna** z: Hub S3 headline **albo** Chief Offer Rec — **DF wybierze jedną** (rekomendacja PLAN poniżej) | `text-xl` + source badge + `data-s4-primary-pln="1"` |
| **SECONDARY** | pozostałe | caption / `text-sm` / „szczegóły” / ukryj kwotę gdy redundant |
| Bid secondary | Hub mismatch line | KEEP S3 (`data-s3-bid-secondary`) — nie primary |

### 8.2 Rekomendacja PLAN (do DF)

```text
PRIMARY PLN surface = Hub headline (data-s3-primary-pln-headline)
  — już używa resolveAuthoritativeOfferPln
  — jedna kontrolka SSOT presentation

Chief Offer Recommendation: KEEP treść / scenarios / handoff
  — PLN: demote do secondary (ta sama liczba, mniejszy chrome)
  — NIE usuwać komponentu

DW Recommendation Panel: KEEP scenarios / badges
  — PLN: secondary / „zgodnie z Offer Expert” bez drugiego text-xl
  — NIE zmieniać Persist / actions

EW OfferDetailsPanel: KEEP w details (już secondary)
```

**Alternatywa DF (Owner):** PRIMARY = Chief Offer Rec · Hub headline ukryty gdy Chief `showOffer` — równoważne AC-S4-4; DF musi wybrać **jedną** opcję.

### 8.3 Zakaz

- Nowy helper PLN / nowe pole  
- Ukrycie Bid calculator  
- Zmiana `offerPricePln` / Bid formulas  
- Traktowanie `directPln` jako primary oferta  

---

## 9. Rollback

| Warstwa | Mechanizm |
|---------|-----------|
| Kod | `git revert` UI commit S4 · lub layout flag `kw-tm01-s4-hub-ux` **OFF** (opcjonalnie w DF — default **nie** wymagać nowej flagi; prefer revert) |
| Dane | **brak** migracji · stores NIE ruszane |
| Intelligence | powrót InsightsCompact do pinned = pre-S4 |
| PLN | powrót ×3 cards chrome |
| S2/S3 | nietknięte przy revert S4-only diff |

**Preferencja PLAN:** **bez** nowej LS flagi (ZERO flag sprawl) · rollback = revert commit.  
Jeśli DF chce kill-switch: jedna LS opt-in OFF — Owner decyzja w DF.

---

## 10. Ryzyka i guardrails

| Ryzyko | Poziom | Guardrail |
|--------|--------|-----------|
| Big-bang Hub rewrite | HIGH | Diff ⊆ allowlist · kroki S4-A…F · no new BC |
| Intelligence Blind Delete | HIGH | REUSE InsightsCompact · tylko relocate |
| Uszkodzenie S3 authority | HIGH | NO TOUCH `tender-offer-pln-authority` · harness S3 regresja |
| Uszkodzenie DW Actions / Persist | HIGH | DecisionWorkspaceSurface presentation-only |
| EW „zniknie” przy reorder | MED | AC-S4-3 harness · keep Slot A |
| Validation ukryte | MED | DF zakaz · assert panel present |
| CL shortcut orphan | MED | #6 allowlist retarget obowiązkowy dla AC-S4-2 |
| TRE default ON — Hub niewidoczny w QA | MED | PV checklist: Hub recovery path · `kw-tre-01-slice-a=0` opc. |
| Strategy Portfolio GO/HOLD confusion | LOW | OUT rewrite; copy later Owner |
| WIP OfferRun stage | HIGH | explicit denylist path |
| Dwie hierarchie CL vs non-CL | LOW | testować CL; non-CL mirror demote |
| Guide/Help stale copy | LOW | docs przy CLOSEOUT |

### Guardrails checklist (pre-IMPLEMENT)

```text
[ ] Owner GO DESIGN FREEZE S4
[ ] DF wybiera PRIMARY PLN surface (Hub headline vs Chief Rec)
[ ] Allowlist = §2.1 exact
[ ] 8 LOCK listed in DF
[ ] Harness AC-S4-1…4 planned
[ ] S3 parity harness in regression gate
[ ] useTenderOfferRun.ts not staged
[ ] No TRE/Strategy/S5–S8 in same PR
```

---

## 11. Dependencies / non-goals

| | |
|--|--|
| **Wymagane tip** | S0–S3 CLOSED · `ec8a5044` · GREEN |
| **PV gate** | S2 + S3 CLOSED (spełnione) |
| **Non-goals** | S5 tab · S6 bridge · S7 TRE deprecate · S8 REMOVE · Strategy · Expert enablement flag · cloud Persist |

---

## 12. Harness / QA plan (IMPLEMENT later)

| Artefakt | Rola |
|----------|------|
| `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` | AC-S4-1…4 DOM/order/attrs (unit/jsdom lub static render harness jak S2) |
| Existing S2 / S3 / Chief / EW / DW harness | regresja |
| Owner QA | visual Hub recovery · Expert ON/OFF PLN · Intelligence w accordion · DW Actions |

---

## 13. READY?

| | |
|--|--|
| **PLAN COMPLETE** | **YES** |
| **DF** | [`TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md) **COMPLETE** |
| **READY FOR IMPLEMENT** | **YES** — czekaj **Owner GO IMPLEMENT** |
| **Runtime / kod ten turn** | **EMPTY** |

---

## 14. Closing

```text
S4 PLAN COMPLETE
Owner GO PLAN: honoured (docs only)

Target hierarchy:
  ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA
Intelligence: recovery accordion (REUSE)
PLN: one primary surface (visual) · S3 authority untouched
Allowlist: Hub · V2 · ChiefDossierSurface · DW Surface presentation
         · PrimaryAction copy · CL shortcut
OUT: 8 LOCK · Strategy · TRE delete · S5/S6/S8 · OfferRun WIP

STOP — czekaj OWNER GO → IMPLEMENT
```
