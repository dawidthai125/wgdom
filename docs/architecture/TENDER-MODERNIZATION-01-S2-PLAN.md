# TENDER-MODERNIZATION-01 / S2 — PLAN (Dual Outcome)

> **STATUS:** **PLAN COMPLETE** · **DF** → [`TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** TENDER-MODERNIZATION-01-S2-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S2 — Dual Outcome**  
> **TRYB:** **PLAN ONLY** (zamknięty przez S2 DF) · ZERO kodu w tym dokumencie  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / **`eed3ba0e`**  
> **SSOT IMPLEMENT:** [`TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §1A · §4  
> **Prior:** [`TENDER-MODERNIZATION-01-S2-AUDIT.md`](TENDER-MODERNIZATION-01-S2-AUDIT.md) · [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md)  
> **S1:** [`TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md`](TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) (**CLOSED**)

```text
════════════════════════════════════════════════════════
S2 PLAN — Dual Outcome (thin hierarchy / UX)
(+ pointer → S2 DESIGN FREEZE COMPLETE)

STATUS: PLAN COMPLETE · DF COMPLETE · READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Re-grep confirmation (pre-PLAN)

| Artefakt | Consumers tip (src) | S2 touch? |
|----------|---------------------|-----------|
| `kw-tender-decisions` | `tenders-strategy-owner-decisions` · Strategy · alerts · lists · PrimaryAction · DecisionView | **read OK** · **no schema** · **reduce primary writes** (UX gate) |
| `TenderDecisionView` | `TenderDetailPanel` · deprecated `TenderOwnerView` | **demote** owner buttons / copy |
| `TenderOwnerDecisionButtons` | DecisionView · (pattern in Strategy `DecisionButtons`) | **hide/demote** when effective |
| `TenderWorkflowPrimaryAction` | Hub · Command Layer (`TenderDetailPage`) | **block ownerDecision write** / redirect |
| Strategy GO/HOLD | `BestOpportunityCard` · `TendersStrategyContent.setOwnerDecision` | **demote UI** · optional disable write |
| `DecisionWorkspaceHost` | `TenderWorkflowHubPanel` | **KEEP primary** · thin visibility wire |
| TRE-01 | `TenderDetailPage` · `TenderRecommendationOutcomeView` · Offer Run | **copy only** · **NO engine** |
| Intelligence `displayDecision` | overlay · DecisionView verdict · Autonomous · next-action | **badge/copy** · **NO overlay BC** |

**Werdykt re-grep:** DF wykonalne thin UX + app-layer gate wire · **bez** naruszenia 8 LOCK · **STOP nie wymagany**.

---

## 1. Owner locks (carry-forward)

| | LOCKED |
|--|--------|
| Master gate | `AppSettings.tendersTabForStaffEnabled` |
| Expert effective | `adminCanViewTendersTab(role, settings)` (= Module effective) |
| NO NEW FLAG | `expertAiDecydentEnabled` · trzeci system flag |
| LS Session/DW | kill-switch / harness / dev ONLY (`"0"` = force OFF) |
| S1 | Module Enablement CLOSED |
| Store bridge Persist→legacy | **S6** — **nie** S2 |
| Runtime map approve↔GO | **ZAKAZ** w S2 |

---

## A. CURRENT → TARGET UX MAP

| Surface | CURRENT (tip) | TARGET (S2) |
|---------|---------------|-------------|
| **Module access** | Staff gate S1 | bez zmian |
| **Expert-effective detection** | brak hierarchy helper | thin `isTenderExpertEffective` = `adminCanViewTendersTab` |
| **Session / DW visibility** | LS default OFF → DW często brak | Module effective ⇒ stack **ON** unless LS `"0"` kill · **app wire** (nie nowy AppSettings) |
| **Hub + DW** | DW + legacy CTA równolegle | DW = **PRIMARY** human decision |
| **PrimaryAction `ownerDecision: GO`** | zapis `kw-tender-decisions` | **HIDE** commit GO · CTA → scroll/focus DW lub nawigacja procesu |
| **TenderDecisionView buttons** | primary owner GO/HOLD/NO-GO | **HIDE** buttons · optional RO “compatibility record” |
| **DecisionView system verdict** | wygląda jak decyzja | **DEMOTE** badge „rekomendacja systemu” |
| **Strategy DecisionButtons** | primary „Moja decyzja” | **DEMOTE** (+ prefer **disable write** gdy effective) |
| **Intelligence display** | GO/HOLD/NO-GO chip | **DEMOTE** copy/badge rekomendacja |
| **TRE-01** | Outcome PLN landing | **KEEP** recommendation/pricing · thin copy |
| **Persist / stores** | niezależne | **NO TOUCH** schema · **no** approve→GO write |

**CURRENT → TARGET:** **PASS** (planowalny thin path).

---

## B. Exact surfaces

### B.1 Hub (`TenderWorkflowHubPanel`)

| | |
|--|--|
| **Rola S2** | Kontener hierarchy: DW powyżej / wyraźnie primary vs accordion recovery |
| **Primary** | `DecisionWorkspaceHost` gdy Expert-effective i stack nie zabity |
| **Legacy CTA** | `TenderWorkflowPrimaryAction` bez `setOwnerDecision` |
| **OUT** | reorder pełnego Hub (S4) · Intelligence collapse heavy |

### B.2 PrimaryAction (`TenderWorkflowPrimaryAction` + Command Layer slot)

| | |
|--|--|
| **CURRENT** | `action.ownerDecision` → `setOwnerDecision` (GO) |
| **TARGET** | gdy Expert-effective: **nie** wołać `setOwnerDecision` · zamiast: scroll do `#decision-workspace-surface` / Host · lub CTA procesu (dokumenty/wycena) bez owner enum |
| **Policy** | **HIDE** human-decision commit z CTA |

### B.3 TenderDecisionView

| | |
|--|--|
| **KEEP** | komponent · finance · narrative · system verdict (demoted) |
| **HIDE** | `TenderOwnerDecisionButtons` gdy Expert-effective |
| **DEMOTE** | werdykt systemu: badge „Rekomendacja systemu — nie decyzja Decydenta” |
| **RO optional** | pokaż ostatni legacy record jako continuity (bez nowych zapisów z UI) |
| **OUT** | hard delete · tab→DW mount (**S5**) |

### B.4 Strategy (`BestOpportunityCard` / `TendersStrategyContent`)

| | |
|--|--|
| **KEEP** | portfolio · KPI · odczyt `kw-tender-decisions` |
| **DEMOTE** | sekcja „Moja decyzja” → „Lejek / compatibility (legacy)” |
| **HIDE write** | `onSetDecision` / DecisionButtons gdy Expert-effective (zalecane — unika dual SSOT) |
| **OUT** | Strategy BC rewrite · migracja do Persist |

### B.5 Intelligence (`overlay.displayDecision`)

| | |
|--|--|
| **KEEP** | overlay engine · Autonomous gate-exit (frozen) |
| **DEMOTE** | UI copy/badge w DecisionView / Hub shortcuts: rekomendacja ≠ SSOT człowieka |
| **OUT** | zmiana `tender-intelligence-overlay.ts` logiki decyzji |

### B.6 Decision Workspace (`DecisionWorkspaceHost`)

| | |
|--|--|
| **PRIMARY** | Approve / Reject / Needs Review / Return |
| **Store** | wyłącznie istniejący Persist path (bez bridge) |
| **Wire** | widoczność: Expert-effective ∧ ¬kill-switch DW |
| **OUT** | Persist API · Validation rules · Host domain |

### B.7 TRE-01 (`TenderRecommendationOutcomeView`)

| | |
|--|--|
| **KEEP** | Offer Run · Bid PLN · Outcome landing |
| **DEMOTE copy** | „Rekomendowana cena oferty — nie decyzja Decydenta” |
| **OUT** | engine · `tenders-v4-config` default · deprecation (**S7**) |

---

## C. Expert-effective gate

```text
isTenderExpertEffective(role, appSettings)
  := adminCanViewTendersTab(role, appSettings)

// W UI Przetargi (użytkownik już wszedł):
//   Staff Module ON  → true
//   Super Admin      → true (bypass)
//   Staff Module OFF → UI niedostępne (S1) → N/A

Kill-switch (NIE master enablement):
  LS kw-chief-orchestrator-session === "0"  → Session stack OFF
  LS kw-decision-workspace === "0"          → DW surface OFF
  brak klucza / "1"                         → stack follows Expert-effective
                                              (production default ON when effective)
```

| Zasada | |
|--------|--|
| Production master | **tylko** Module gate |
| LS `"0"` | force OFF stack Expert (dev/harness) |
| LS nie jest | enablement Admin/Moderator |
| **Zakaz** | `expertAiDecydentEnabled` |

**Implementacja planowana (thin):** nowy helper allowlist (np. `src/lib/tender-expert-effective.ts`) + wire w `TenderDetailPage` / Host — **bez** zmiany Expert/Chief/Session **BC**.

**Expert-effective:** **PASS** (REUSE Module ACL).

---

## D. Hide vs demote policy

| Surface | Expert-effective ON | Kill-switch stack OFF (LS `"0"`) | Module OFF Staff |
|---------|---------------------|----------------------------------|------------------|
| DW Actions | **PRIMARY** show | **HIDE** (kill) | N/A (no module) |
| PrimaryAction owner GO | **HIDE** commit | **HIDE** commit (nadal) | N/A |
| PrimaryAction process CTA | KEEP (nawigacja) | KEEP | N/A |
| DecisionView owner buttons | **HIDE** | **HIDE** | N/A |
| DecisionView system verdict | **DEMOTE** + badge | **DEMOTE** | N/A |
| Strategy write buttons | **HIDE** (zalecane) | **HIDE** | N/A |
| Strategy read / KPI | KEEP + demote label | KEEP | N/A |
| Intelligence chip | **DEMOTE** badge | **DEMOTE** | N/A |
| TRE-01 | KEEP + demote copy | KEEP + copy | N/A |
| Legacy store reads | KEEP | KEEP | N/A |

**Uwaga kill-switch:** Module effective + stack OFF ⇒ brak PRIMARY DW i brak legacy human buttons → pustka decyzyjna (akceptowalna dla kill-switch; QA Q-kill).

**Legacy demotion:** **PASS**.

---

## E. Decision semantics

```text
Proces / pipeline / TRE-01 PLN     ≠  decyzja człowieka
Intelligence / scoring GO|HOLD|NO-GO ≠  decyzja człowieka (rekomendacja systemu)
Validation verdict                 ≠  decyzja człowieka (QA)
Decision Workspace Actions         =  jedyna PRIMARY decyzja człowieka (Module effective)
Legacy GO/HOLD/NO-GO UI            =  compatibility / historical continuity (nie PRIMARY)
```

| Zakaz S2 | |
|----------|--|
| Runtime `approve` → write `GO` | **NIE** (S6) |
| Runtime `reject` → `NO-GO` | **NIE** |
| Runtime `needs_review` → `HOLD` | **NIE** |
| Traktować Validation jako owner verdict | **NIE** |

**Primary hierarchy:** **PASS**.

---

## F. S2 allowlist (planowana)

| # | Plik / artefakt | Zakres thin |
|---|-----------------|-------------|
| 1 | `src/lib/tender-expert-effective.ts` (**nowy**) | `isTenderExpertEffective` · kill-switch readers · **zero BC** |
| 2 | `src/app/TenderDetailPage.tsx` | Session/DW enable compose z helper (zamiast raw LS-as-master) |
| 3 | `src/app/TenderWorkflowHubPanel.tsx` | hierarchy props / primary placement cues |
| 4 | `src/app/TenderWorkflowPrimaryAction.tsx` | gate `ownerDecision` write · redirect DW |
| 5 | `src/app/TenderDecisionView.tsx` | hide buttons · demote verdict copy |
| 6 | `src/app/TenderOwnerDecisionButtons.tsx` | opcjonalnie `disabled`/`hidden` prop (thin) |
| 7 | `src/app/tenders/strategy/components/BestOpportunityCard.tsx` | demote + hide write |
| 8 | `src/app/tenders/components/TendersStrategyContent.tsx` | nie podawać `onSetDecision` gdy effective |
| 9 | `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | copy badge only |
| 10 | `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | thin: honor Expert-effective / kill (prop lub helper) — **bez** Persist API change |
| 11 | `src/lib/decision-workspace-ui/labels.ts` | copy PRIMARY / TRE note (opcjonalnie) |
| 12 | `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` (**nowy**) | harness AC-S2-1…5 |
| 13 | docs S2 PLAN/DF/CLOSEOUT (później) | docs only |

**Rozszerzenie vs DF one-liner allowlist:** jawne Strategy/DetailPage/helper — nadal **thin UX/wire**, zgodne z duchem DF S2 OUT (no BC / no store).

---

## G. S2 denylist

| Zakazane | Slice właściwy |
|----------|----------------|
| Bridge Persist → `kw-tender-decisions` | **S6** |
| Zmiana schema store / migracja danych | **S6/S8** |
| Hard delete DecisionView / Strategy / TRE-01 / Intelligence | **S5/S7/S8** |
| Mount DW na tab Decyzja (pełna migracja) | **S5** |
| Expert / Chief / Session / Validation **BC** | — |
| Decision Persist API (`recordDecision` contract) | — |
| OfferBoq / Bid / TF / domain calc | — |
| Cloud sync / KV | — |
| `expertAiDecydentEnabled` | **FORBIDDEN** |
| Runtime mapowanie approve↔GO | **S6** |
| Trzeci decision store / flag system | — |

**Store untouched / S5–S8 boundaries:** **PASS**.

---

## H. Acceptance Criteria + QA

### AC (minimum)

| AC | Treść |
|----|--------|
| **AC-S2-1** | Module/Expert effective ∧ ¬DW-kill ⇒ DW = jedyna PRIMARY human decision surface w Hub viewport |
| **AC-S2-2** | Brak dwóch równorzędnych zestawów przycisków decyzji człowieka (Hub CTA GO + DW Actions) |
| **AC-S2-3** | TRE-01 / Intelligence / system verdict oznaczone jako rekomendacja ≠ SSOT człowieka |
| **AC-S2-4** | Module OFF Staff ⇒ brak Przetargi (S1) · Super Admin bypass OK · kill-switch nie łamie Module gate |
| **AC-S2-5** | `kw-tender-decisions` istnieje · schema/API store bez zmian · brak Persist→legacy bridge |

### Test matrix (harness + Owner QA)

| Surface | Expert OFF* | Expert ON (Module access) |
|---------|-------------|---------------------------|
| **Hub** | N/A Staff / SA w module = ON | DW primary · legacy GO commit hidden |
| **Decision (DecisionView)** | N/A / ON | owner buttons hidden · system demoted |
| **Strategy** | N/A / ON | write demoted/hidden · label compatibility |
| **Intelligence** | N/A / ON | badge rekomendacja |
| **DW** | N/A; kill `"0"` ⇒ hidden | visible primary Actions |
| **TRE-01** | N/A / ON | PLN outcome + copy „nie decyzja Decydenta” |

\* **Expert OFF** w sensie Module OFF Staff = brak UI (ACL). W module Super Admin zawsze Expert-effective ON. Osobno: **kill-switch** matrix (stack OFF).

### Owner QA

| ID | Scenariusz |
|----|------------|
| Q3 | Module ON · Hub: jedna PRIMARY (DW) |
| Q4 | Module OFF Admin/Moderator · brak Przetargi |
| Q13a | Module OFF rollback stores intact |
| Q13b | LS Session/DW `"0"` · stack OFF · legacy human buttons nadal nie-PRIMARY |
| Q-S2-Strat | Strategy nie wygląda jak drugi Decydent |
| Q-S2-TRE | TRE-01 copy rekomendacja ceny |
| Q-S2-NoMap | Approve w DW **nie** tworzy GO w `kw-tender-decisions` |

---

## I. Rollback

```text
1. Feature/hierarchy OFF (revert S2 allowlist commit)
   → PrimaryAction znowu może setOwnerDecision
   → DecisionView buttons wracają
   → Strategy onSetDecision wraca
2. Module gate bez zmian (S1)
3. Stores nietknięte
4. LS kill-switch bez zmian semantyki plików flag (jeśli tylko app wire — revert DetailPage)
Nigdy: force-push · delete stores · S6 bridge left half-on
```

---

## J. Regression plan

| Suite | Cel |
|-------|-----|
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | AC-S2-1…5 static/harness |
| `scripts/test-tender-module-enablement-01.mjs` | S1 ACL bez regresji |
| `scripts/test-decision-persist-01.mjs` | Persist API NO TOUCH |
| Decision Workspace / Session existing harness | DW nadal działa gdy stack ON |
| TI-B4 / tenders smoke (12) | smoke Przetargi |
| `npm run build` | compile |
| Manual: Module ON Hub · Strategy · TRE-01 · Decyzja tab | Owner Q3 |

---

## K. 8 LOCK verification (PLAN)

| LOCK | S2 |
|------|-----|
| Expert BC | **NO TOUCH** |
| Chief BC | **NO TOUCH** |
| Session BC | **NO TOUCH** (tylko app enable compose + kill read) |
| Wire Adapters | **NO TOUCH** |
| TF | **NO TOUCH** |
| OfferBoq | **NO TOUCH** |
| Bid calculator | **NO TOUCH** |
| Domain calculations | **NO TOUCH** |
| Persist API / store schema | **NO TOUCH** |
| Cloud sync | **NO TOUCH** |

**8 LOCK:** **PASS**.

---

## 2. Residual risks (nie BLOKUJĄ PLAN)

1. Kill-switch + demoted legacy ⇒ brak human decision UI (świadome).  
2. Strategy write hide może zaskoczyć power-userów lejka — copy „compatibility / S6 bridge later”.  
3. Tab Decyzja bez DW mount do **S5** — DecisionView bez buttons; CTA w Hub wskazuje DW na Przetarg.  
4. Session/DW default-ON-when-effective to **semantyka wire** — DF §1A.4 wymaga opisu; DF S2 allowlist rozszerzony w tym PLAN (do potwierdzenia w S2 DF freeze).

**Konflikt DF hard:** **BRAK** · rozszerzenie allowlist wymaga akceptacji w Design Freeze S2 slice.

---

## 3. Slice boundaries checklist

| Boundary | Status |
|----------|--------|
| S5 tab Decyzja → DW | **OUT** S2 |
| S6 Persist bridge | **OUT** S2 |
| S7 TRE-01 deprecate | **OUT** S2 |
| S8 hard REMOVE | **OUT** S2 |
| S2 thin hierarchy only | **IN** |

---

## 4. Verdict

```text
════════════════════════════════════════════════════════
S2 PLAN COMPLETE

Current → Target:        PASS
Expert effective:        PASS
Primary hierarchy:       PASS
Legacy demotion:         PASS
Store untouched:         PASS
S5/S6/S7/S8 boundaries:  PASS
8 LOCK:                  PASS

AC: AC-S2-1 … AC-S2-5 (+ matrix Expert OFF/ON)
QA: Q3 · Q4 · Q13a/b · Q-S2-Strat · Q-S2-TRE · Q-S2-NoMap
Allowlist: §F (13)
Denylist: §G
Regression: §J
Rollback: §I

READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

**Następny krok Owner:** **GO IMPLEMENT S2** — SSOT: [`TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md).

Bez kodu · bez implementacji · bez commit · bez push (ten dokument = PLAN only).
