# EXPERT-AI-PRODUCTION-ENABLEMENT-01 — PLAN

> **STATUS:** **PLAN COMPLETE** · DF → [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN  
> **TRYB:** PLAN (bez IMPLEMENT · bez kodu · bez commit · bez push)  
> **Baseline tip:** UI **2.66.22** / commit **`adde246a`** (`adde246ab3d6cb4130b308b960c790814ea62e79`) · **PRODUCTION VERIFIED**  
> **Data:** 2026-08-08  
> **AUDIT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md) (**COMPLETE**)  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md)  
> **Prior CLOSED:** DECISION-PERSIST-01 · WIRE-EXPERTS-UI-01 · DECISION-WORKSPACE-01 · VALIDATION-EXPERT-01 · WIRE-CHIEF-* · CHIEF-ORCHESTRATOR-P0 · EXPERTS-P0

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — PLAN

Cel: bezpieczny production enablement całego Expert AI stacku
     bez ręcznego localStorage.

Architektura (LOCKED na DF):
  Master gate = AppSettings (Super Admin) — REUSE
  Legacy LS keys = kill-switch / OV force — REUSE
  ZERO nowego systemu flag
  Coupling: Session ⊇ Decision ⊇ Persist
  Readiness: OfferBoq lines ∧ pricingReady*
  Fail-soft RO zachowane
  Persist = local-first P0 · Cloud OUT

STATUS: PLAN COMPLETE · DF COMPLETE · READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT  → EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md
[DONE]  PLAN   → TEN DOKUMENT
[DONE]  DESIGN FREEZE → EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md
[NEXT]  Owner GO IMPLEMENT → S0–S8 → QA → COMMIT allowlist → PUSH → PV → CLOSEOUT
```

| Zasada | Wymaganie |
|--------|-----------|
| **REUSE FIRST** | AppSettings + AdminSettingsModal „Moduły” · istniejące `flag.ts` Session/Decision · Host/Hub wire · readiness w Session engine |
| **ZERO DUPLICATE** | brak 3. klucza LS „master” · brak drugiego systemu flag · brak nowego Expert BC |
| **8 LOCK** | Expert/Chief/Validation/Adapters/TF/OfferBoq **NO TOUCH** · Session engine **NO TOUCH** (DF) |
| **Stabilization** | brak IMPLEMENT bez Owner GO |

---

## 1. Cel produktu

Po włączeniu przez Super Admin (bez DevTools):

1. Admin otwiera przetarg → tab **Przetarg**.  
2. Gdy **OfferBoq ma linie** **i** `pricingReadyPartial || pricingReadyFinal` → Session auto-start → Chief → Dossier + Expert Workspace.  
3. Gdy dossier/validation gotowe → Decision Workspace (akcje Decydenta).  
4. `approve` / `reject` / `needs_review` → Decision Persist (local-first) + hydracja po refresh.  
5. Brak danych RO → **fail-soft** (`not_ready` / `pricing_not_ready` / `no_dossier`) — **bez** `runChief` na not_ready.  
6. Kill-switch natychmiastowy (`'0'` / AppSettings OFF) wyłącza stack.

---

## 2. IN / OUT

### 2.1 IN (P0)

| # | Element |
|---|---------|
| 1 | Master enablement via **AppSettings** (Super Admin ⚙ → Moduły) |
| 2 | Thin resolver w istniejących `isChiefOrchestratorSessionEnabled` / `isDecisionWorkspaceEnabled` |
| 3 | Coupling Session → Decision → Persist |
| 4 | Kill-switch LS `'0'` (per surface) + AppSettings OFF |
| 5 | OV force LS `'1'` (smoke / Owner) |
| 6 | Thin wire: Decision Host tylko gdy Session enablement ON |
| 7 | Thin UX: Decision surface nie jako pusty shell bez kontekstu (patrz §7) |
| 8 | Harness enablement + Owner QA matrix |
| 9 | Docs tip / CLOSEOUT po PV |

### 2.2 OUT

| # | Element |
|---|---------|
| 1 | Expert / Chief / Validation / Wire Adapters / TF / OfferBoq BC |
| 2 | Nowy Expert · nowy system flag · nowy LS key master |
| 3 | Cloud sync Decision Persist · Audit Hub · mostek `kw-tender-decisions` |
| 4 | Zmiana logiki domenowej ekspertów / verdict / LOOP |
| 5 | Auto-start Chief przy not_ready |
| 6 | Flip default **bez** AppSettings + kill-switch (zakaz AUDIT) |

---

## 3. Architektura enablement (LOCKED dla DF)

```text
┌─────────────────────────────────────────────────────────┐
│  Super Admin ⚙ AppSettings.expertAiDecydentEnabled      │
│  (REUSE kw-app-settings · cloud merge jak wmRysunki)     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Resolver (w istniejących flag.ts — ZERO nowego systemu)│
│                                                         │
│  Session ON  ⇔  resolve(Session LS, AppSettings)        │
│  Decision ON ⇔  resolve(Decision LS, AppSettings)       │
│                 AND Session ON                          │
│                                                         │
│  Expert Workspace  ⇔ Session ON (bez zmian)             │
│  Decision Persist  ⇔ Decision ON (bez zmian Host)       │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Session hook    Dossier+EW      Decision Host
   (auto-start     (mount gdy      (mount gdy
    tylko gdy       Session ON)     Session ON ∧
    ready*)                         Decision ON)
```

\*ready = §8 readiness (już w Session engine) — **nie** reimplementować w enablement.

---

## 4. Proponowany master gate

| | PLAN LOCK (do DF) |
|--|-------------------|
| **Nazwa pola AppSettings** | `expertAiDecydentEnabled: boolean` |
| **Default AppSettings** | **`false`** (bezpieczny rollout) |
| **UI** | ⚙ Super Admin → sekcja **Moduły** — jeden przełącznik PL np. „Expert AI · Decydent (Przetargi)” |
| **Sync** | REUSE `saveAppSettings` / `mergeAppSettings` (jak `wmRysunkiEnabled`) |
| **Efekt ON** | Session + Decision resolvery zwracają **true** (jeśli brak LS `'0'`) |
| **Efekt OFF** | Session + Decision **false** (chyba że LS `'1'` OV force) |
| **Nowy LS key** | **ZAKAZ** |

**Uzasadnienie master = AppSettings (nie nowy LS):**  
REUSE istniejącego systemu ustawień chmurowych org-wide; Super Admin bez DevTools; spójność z WM Rysunki / Worker Sketch; ZERO third flag system.

---

## 5. Polityka flag (legacy LS + AppSettings)

### 5.1 Zachowane klucze (REUSE)

| Klucz | Rola po enablement |
|-------|-------------------|
| `kw-chief-orchestrator-session` | Kill / OV force Session |
| `kw-decision-workspace` | Kill / OV force Decision |

### 5.2 Precedence (LOCKED)

Dla każdej powierzchni (Session / Decision):

```text
1. LS === '0'           → FORCE OFF   (kill-switch natychmiastowy)
2. LS === '1'           → FORCE ON    (OV / smoke — nadpisuje AppSettings OFF)
3. AppSettings.expertAiDecydentEnabled === true  → ON
4. else                 → OFF         (code DEFAULT false pozostaje fallback)
```

Dodatkowo dla **Decision**:

```text
Decision effective ON  ⇒  (resolve Decision) ∧ (Session effective ON)
```

### 5.3 Coupling (LOCKED)

```text
Enablement (AppSettings)
  → Chief Session (+ Expert Workspace + Dossier)
    → Decision Workspace
      → Decision Persist
```

| Warstwa | Gate |
|---------|------|
| Session + Dossier + Expert Workspace | Session effective ON |
| Decision Workspace + Persist | Decision effective ON **∧** Session effective ON |
| Validation (cache) | tylko wewnątrz Decision Host (bez zmian) |

**Zakaz:** Decision ON przy Session OFF (eliminuje idle `no_dossier` z samotnej flagi Decision).

---

## 6. Polityka kill-switch

| Mechanizm | Zachowanie | SLA |
|-----------|------------|-----|
| **LS `'0'`** na Session | Session OFF · Dossier/EW znikają · Decision też OFF (coupling) | natychmiast po reload / next read flag |
| **LS `'0'`** na Decision | Decision/Persist OFF · Session może zostać ON (Dossier+EW OK) | natychmiast |
| **AppSettings OFF** | obie powierzchnie OFF (chyba LS `'1'` OV) | po save + re-read settings |
| **LS remove / brak** | wraca do AppSettings / default | — |

**MUST:** wartość `"0"` **zawsze** wygrywa nad AppSettings ON (Owner / support emergency).

---

## 7. Default ON/OFF (rollout)

| Etap | Policy |
|------|--------|
| **P0 IMPLEMENT (ten EPIC)** | AppSettings default **`false`** · code DEFAULT flag **`false`** · Super Admin **włącza** świadomie |
| **P0 po Owner QA PASS** | Org może mieć AppSettings **true** na prod (bez bumpa tipu obowiązkowego) |
| **P1 (osobny GO)** | opcjonalnie code DEFAULT / tip „ON by default” — **nie** w P0 |

**Zakaz P0:** samotny flip `CHIEF_*_DEFAULT = true` / `DECISION_*_DEFAULT = true` bez AppSettings + kill-switch.

---

## 8. Readiness gates (LOCKED — REUSE istniejącego)

Chief Session **nie** startuje `runChief`, gdy:

```text
¬ readyForChiefInput
  ⇔  OfferBoq == null ∨ OfferBoq.lines.length === 0
      ∨ pricing catalog null ∨ company null
∨
¬ (pricingReadyPartial ∨ pricingReadyFinal)
```

Źródła już w tipie: `assembleChiefWireRuntimeRo` · `chief-session/engine.ts` · `useChiefOrchestratorSession`.

**Enablement EPIC:** **NIE** duplikuje readiness; **NIE** omija gate; DF potwierdza zero regresji harness Session.

---

## 9. Fail-soft (LOCKED)

Zachować bez zmian semantyki:

| Stan | UI / Session |
|------|----------------|
| `not_ready_for_chief_input` | Dossier phase `not_ready` · copy „Brak gotowego przedmiaru / OfferBoq…” |
| `pricing_not_ready` | Dossier phase `not_ready` · copy pricing |
| `no_dossier` | Decision — tylko gdy Session ON i brak dossier (patrz §10) |
| blocked / error | istniejące phases |

**Zakaz:** crash · silent success · auto-GO.

---

## 10. Decision Workspace — kontekst (thin enablement UX)

### 10.1 Mount policy (PLAN)

| Warunek | Decision Host |
|---------|---------------|
| Session effective OFF | **nie montować** / nie przekazywać session (fix wire `TenderDetailPage`) |
| Session ON ∧ Decision OFF | nie render surface (`hidden`) |
| Session ON ∧ Decision ON ∧ tab ≠ Przetarg | null (jak dziś) |
| Session ON ∧ Decision ON ∧ tab Przetarg | Host ON |

### 10.2 Visibility policy (PLAN — do DF)

Pokazywać Decision **surface** gdy `uiPhase` ∈:

`process_running` · `process_blocked` · `ready_for_decision` · `decision_recorded` · `error`

Dla `no_dossier` przy idle (Session nigdy nie wystartowała / not_ready):  
**preferowane:** surface **ukryta** lub jeden-liniowy status pod Dossier — **bez** pełnego Actions/Findings shell.  
Szczegół copy/layout → **DESIGN FREEZE** (bez domain calc).

Validation: Host nadal woła cache tylko gdy flag ON + dossier path — **bez** re-QA BC.

---

## 11. Decision Persist

| | P0 | P1 / OUT |
|--|----|----------|
| Storage | `kw-decision-persist-v1` local-first | Cloud KV / sync |
| API | bez zmian | — |
| Wire | Host only | — |
| Copy | toast „lokalnie” (już jest) | Audit Hub |

---

## 12. Owner QA matrix (MUST przed PV PASS)

| ID | Scenariusz | Oczekiwanie |
|----|------------|-------------|
| **Q1** | Happy path: AppSettings ON · OfferBoq lines · pricingReady · tab Przetarg | Session run → Dossier+EW → Validation → Decision → Persist append · hydrate po refresh |
| **Q2** | Partial pricing: tylko partial **lub** brak final | start OK gdy partial\|final; gdy brak obu → `pricing_not_ready` · **bez** runChief |
| **Q3** | Blocked dossier/verdict | Decision `process_blocked` / Approve OFF wg macierzy DW · Persist opcjonalnie needs_review |
| **Q4** | No dossier / no OfferBoq lines | `not_ready` · Decision nie jako pełny shell Actions |
| **Q5** | Refresh po approve | hydrate latest · phase `decision_recorded` |
| **Q6** | Decision action | append UUID · brak lastModified |
| **Q7** | Persist hydration mismatch fingerprint | hydrate null · historia zostaje |
| **Q8** | Kill LS Session `'0'` | stack OFF mimo AppSettings ON |
| **Q9** | Kill LS Decision `'0'` | Dossier+EW ON · Decision/Persist OFF |
| **Q10** | AppSettings OFF | obie OFF (bez LS `'1'`) |
| **Q11** | OV LS `'1'` przy AppSettings OFF | Session/Decision ON (smoke) |
| **Q12** | Tab ≠ Przetarg | Decision Host null |

---

## 13. Acceptance Criteria (AC1–AC16)

| AC | Kryterium |
|----|-----------|
| **AC1** | Master gate = AppSettings `expertAiDecydentEnabled` · Super Admin Moduły |
| **AC2** | ZERO nowego systemu flag · ZERO nowego LS master key |
| **AC3** | Precedence §5.2 ( `'0'` > `'1'` > AppSettings > default false) |
| **AC4** | Decision effective ⇒ Session effective |
| **AC5** | Default AppSettings **false** w P0 |
| **AC6** | Kill-switch `'0'` natychmiast wyłącza wskazaną powierzchnię |
| **AC7** | Readiness: OfferBoq lines ∧ (pricingReadyPartial∨Final) — REUSE engine |
| **AC8** | Brak `runChief` przy not_ready / pricing_not_ready |
| **AC9** | Fail-soft phases zachowane |
| **AC10** | Decision Host nie montowany przy Session OFF |
| **AC11** | Decision surface bez pustego Actions shell przy braku kontekstu (§10.2) |
| **AC12** | Persist local-first · Cloud OUT |
| **AC13** | ZERO diff Expert/Chief/Validation/Adapters/TF/OfferBoq BC |
| **AC14** | Session engine — tylko jeśli DF uzna thin wire za konieczny; preferencja: zero zmian engine |
| **AC15** | Harness enablement PASS + regresja Session/Decision/Persist/EW |
| **AC16** | Owner QA Q1–Q12 PASS · diff ⊆ allowlist |

---

## 14. Slices implementacyjne (propozycja DF)

| Slice | Treść | Done when |
|-------|-------|-----------|
| **S0** | AppSettings pole + merge + default false | typ + load/save |
| **S1** | Resolver w `chief-session/flag.ts` + `decision-workspace-ui/flag.ts` | precedence + coupling |
| **S2** | AdminSettingsModal toggle Moduły | Super Admin ON/OFF |
| **S3** | Thin wire: `chiefSessionForDecision` tylko gdy Session ON | brak Decision przy Session OFF |
| **S4** | Thin Decision visibility `no_dossier` (§10.2) | DF copy |
| **S5** | Harness `test-expert-ai-production-enablement-01.mjs` | AC flag/precedence |
| **S6** | Regresja Persist/DW/Session/EW/Validation | PASS |
| **S7** | Owner QA Q1–Q12 | PASS |
| **S8** | IMPLEMENT report → OV → COMMIT → PV → CLOSEOUT | tip docs |

---

## 15. Allowlist (propozycja — freeze w DF)

### 15.1 Thin touch (oczekiwane)

| Plik | Limit |
|------|-------|
| `src/lib/app-settings.ts` | pole + merge + default |
| `src/app/AdminSettingsModal.tsx` | jeden toggle Moduły |
| `src/lib/chief-session/flag.ts` | resolver AppSettings + precedence |
| `src/lib/decision-workspace-ui/flag.ts` | resolver + coupling Session |
| `src/app/TenderDetailPage.tsx` | tylko warunek przekazania session → Decision |
| `src/lib/decision-workspace-ui/view-model.ts` **lub** Host | tylko visibility `no_dossier` (DF) |
| `scripts/test-expert-ai-production-enablement-01.mjs` | nowy harness |

### 15.2 Docs (poza feature commit lub osobny docs)

`docs/architecture/EXPERT-AI-PRODUCTION-ENABLEMENT-01-*` · tip SSOT po CLOSEOUT

### 15.3 NO TOUCH

| Path |
|------|
| `src/lib/*-expert/**` · `chief-orchestrator/**` · `validation-expert/**` |
| `chief-wire-adapters/**` · `technology-foundation/**` |
| `decision-persist/**` (logika store/API) |
| OfferBoq / Bid / TRE write paths |
| `expert-workspace/**` (poza ewentualnym zero) |

---

## 16. PAYROLL SAFETY GATE (przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*tylko istniejące flag keys + AppSettings LS — REUSE)
G3 Cloud/KV:     TAK*  (*tylko AppSettings merge — REUSE; NIE Decision Persist cloud)
G4 Edge:         NIE
G5 OfferBoq:     NIE write
G6 Bid:          NIE
G7 Sync/merge:   TAK*  (*wyłącznie merge AppSettings — wzorzec wmRysunki)
G8 FEATURE:      TAK (enablement)
G9 Owner GO:     wymagany przed IMPLEMENT
```

**Werdykt Gate:** **PASS** przy scoped AppSettings + zero Persist cloud.

---

## 17. Ryzyka i mitigacje

| Ryzyko | Mitigacja P0 |
|--------|----------------|
| Dual flag drift | Coupling Decision⇒Session · jeden AppSettings toggle |
| Auto-start CPU | Readiness gate REUSE · default AppSettings OFF |
| Persist ≠ cloud | toast lokalny · Dual Outcome docs |
| Force `'1'` nadużycie | tylko OV/smoke · nie dokumentować jako prod path |
| Merge AppSettings | REUSE istniejący merge helper pattern |

---

## 18. Decyzje otwarte dla DESIGN FREEZE (do zamrożenia)

| # | Pytanie | Rekomendacja PLAN |
|---|---------|-------------------|
| D1 | Nazwa pola AppSettings | `expertAiDecydentEnabled` |
| D2 | Copy PL toggle | „Expert AI · Przebieg i Decydent” |
| D3 | `no_dossier` = hide vs one-liner | hide pełnego shell Actions |
| D4 | Czy Session engine.ts w allowlist | **NIE** (preferencja) |
| D5 | P0 default AppSettings | **false** |

---

## 19. Verdict

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — PLAN COMPLETE

Master gate = AppSettings (Super Admin)
Legacy LS = kill-switch + OV force
Coupling Session ⊇ Decision ⊇ Persist
Default OFF (bezpieczny rollout)
Readiness REUSE · Fail-soft REUSE
Persist local-first · Cloud OUT
AC1–AC16 · S0–S8 · allowlist thin

DF COMPLETE · READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

**Następny krok Owner:** **GO IMPLEMENT** — SSOT DF: [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md).

Bez kodu · bez commit · bez push (do Owner GO IMPLEMENT).
