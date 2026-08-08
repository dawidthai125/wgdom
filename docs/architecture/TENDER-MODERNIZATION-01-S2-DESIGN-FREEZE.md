# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S2 (Dual Outcome)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **READY FOR IMPLEMENT**  
> **ID:** TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S2 — Dual Outcome**  
> **TRYB:** DESIGN FREEZE (LOCKED) · IMPLEMENT tylko po Owner GO  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** / **`eed3ba0e`** · Module Enablement CLOSED  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §1A · §4  
> **PLAN:** [`TENDER-MODERNIZATION-01-S2-PLAN.md`](TENDER-MODERNIZATION-01-S2-PLAN.md) (**COMPLETE**)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S2-AUDIT.md`](TENDER-MODERNIZATION-01-S2-AUDIT.md) (**COMPLETE** · Conflict A RESOLVED)  
> **S1:** [`TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md`](TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S2 — DESIGN FREEZE

LOCKED:
  Expert effective = adminCanViewTendersTab
                   = MODULE effective
  NO NEW FLAG      = expertAiDecydentEnabled FORBIDDEN

  Expert ON  → Decision Workspace = PRIMARY human decision
  Expert OFF → legacy behavior UNCHANGED (Module OFF Staff = no UI)

  Legacy (ON): HIDE or DEMOTE — NEVER second PRIMARY
    TenderDecisionView · PrimaryAction GO · Strategy GO/HOLD
    Intelligence presentation · TRE-01 (copy)

  Semantyka: Proces ≠ rekomendacja ≠ decyzja człowieka
  NO runtime map: Approve↛GO · Reject↛NO-GO · NeedsReview↛HOLD
  Bridge store = S6 · Tab Decyzja = S5 · TRE deprecate = S7 · REMOVE = S8

  Thin presentation / hierarchy ONLY
  ZERO second engine · validation · store · Expert path

  Allowlist STRICT · 8 LOCK · NO BIG-BANG

STATUS: DESIGN FREEZE COMPLETE · READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S2-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S2-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT S2 → AC → QA → build → commit allowlist → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend. Agent **nie** rozszerza allowlist, **nie** mapuje Persist→legacy, **nie** usuwa legacy.

---

## 1. PRIMARY HIERARCHY (LOCKED)

```text
MODULE GATE (tendersTabForStaffEnabled)
  → adminCanViewTendersTab  =  Expert / Przetargi EFFECTIVE
  → Decision Workspace      =  PRIMARY human decision
  → Legacy surfaces         =  compatibility / bridge / historical continuity
                               (HIDE or DEMOTE — never peer PRIMARY)
```

| Warstwa | Rola LOCKED | SSOT decyzji człowieka? |
|---------|-------------|-------------------------|
| Process / pipeline / TRE-01 PLN | informacyjny / pricing outcome | **NIE** |
| Intelligence / scoring GO·HOLD·NO-GO | rekomendacja systemu | **NIE** |
| Validation | QA doradcza | **NIE** |
| **Decision Workspace Actions** | decyzja człowieka | **TAK** (gdy Expert-effective ∧ ¬DW-kill) |
| Legacy GO/HOLD UI · PrimaryAction GO · Strategy buttons | compatibility | **NIE** jako PRIMARY gdy Expert ON |

**PRIMARY:** **PASS** (zamrożone).

---

## 2. EXPERT-EFFECTIVE GATE (LOCKED)

| | LOCKED |
|--|--------|
| **Detection** | `isTenderExpertEffective(role, settings) := adminCanViewTendersTab(role, settings)` |
| **Master gate** | `AppSettings.tendersTabForStaffEnabled` (+ Super Admin bypass w helperze) |
| **FORBIDDEN** | `expertAiDecydentEnabled` · nowy LS master · trzeci system flag |
| **LS** `kw-chief-orchestrator-session` / `kw-decision-workspace` | **kill-switch only**: `"0"` = force OFF stack · **nie** enablement Staff |
| **Stack wire (thin)** | Expert-effective ⇒ Session/DW surfaces **ON** unless kill `"0"` · app-layer compose (DetailPage / Host) — **nie** Session/Expert BC |

---

## 3. EXPERT OFF / ON MATRIX (LOCKED)

### 3.1 Definicje

| Stan | Znaczenie LOCKED |
|------|------------------|
| **Expert OFF** | Staff bez dostępu do Przetargi (Module OFF) → **brak UI modułu** · legacy in-module **N/A** · zachowanie S1 bez regresji |
| **Expert ON** | Użytkownik w module z `adminCanViewTendersTab === true` (Admin/Moderator ON lub Super Admin) |
| **Kill-switch** | Expert ON + LS `"0"` → stack Expert HIDE · legacy human buttons **nadal nie-PRIMARY** |

### 3.2 Matrix per surface

| Surface | Expert OFF | Expert ON |
|---------|------------|-----------|
| **Hub** | N/A (brak modułu Staff) | DW = PRIMARY · legacy GO commit HIDE |
| **Decision** (`TenderDecisionView`) | N/A | owner buttons **HIDE** · system verdict **DEMOTE** |
| **Strategy** | N/A | write buttons **HIDE** · label **DEMOTE** (compatibility / lejek) |
| **Intelligence** | N/A | presentation **DEMOTE** (badge rekomendacja) · engine **NO TOUCH** |
| **Decision Workspace** | N/A | **PRIMARY** Actions (Approve/Reject/Needs Review/Return) |
| **TRE-01** | N/A | KEEP Outcome PLN · copy **DEMOTE** („nie decyzja Decydenta”) · engine **NO TOUCH** |

**Expert OFF:** **PASS** · **Expert ON:** **PASS** (zamrożone).

---

## 4. HIDE / DEMOTE PER LEGACY SURFACE (LOCKED)

| Surface | Policy ON | Szczegół LOCKED |
|---------|-----------|-----------------|
| **PrimaryAction** `ownerDecision` → `setOwnerDecision` | **HIDE** | Zakaz zapisu GO z CTA · redirect: scroll/focus `#decision-workspace-surface` **lub** CTA procesu (bez owner enum) |
| **PrimaryAction** process / nav CTA | **KEEP** | Nawigacja dokumentów/wyceny OK |
| **TenderDecisionView** owner buttons | **HIDE** | Komponent **KEEP** · bez hard delete |
| **TenderDecisionView** system verdict | **DEMOTE** | Badge: rekomendacja systemu ≠ decyzja Decydenta |
| **TenderDecisionView** legacy record RO | **OPTIONAL** | Odczyt continuity · **bez** nowych zapisów z UI |
| **Strategy** DecisionButtons / `onSetDecision` | **HIDE** write + **DEMOTE** label | KPI/read store **KEEP** |
| **Intelligence** `displayDecision` UI | **DEMOTE** | Copy/badge only · **NO** overlay engine change |
| **TRE-01** Outcome | **DEMOTE** copy | Pricing recommendation · **NO** Offer Run / Bid change |
| **DecisionWorkspaceHost** | **PRIMARY** | Thin visibility wire only |

**Legacy nie jest usuwane w S2.**

**Legacy demotion:** **PASS**.

---

## 5. SEMANTIC SEPARATION (LOCKED)

```text
Proces / pipeline / TRE-01 PLN     ≠  decyzja człowieka
Intelligence / scoring enum        ≠  decyzja człowieka
Validation verdict                 ≠  decyzja człowieka
Decision Workspace Actions         =  PRIMARY decyzja człowieka (Expert ON)
Legacy GO/HOLD/NO-GO               =  compatibility only (nie PRIMARY)
```

### 5.1 Zakaz mapowania runtime (LOCKED)

| DW action | Legacy enum | S2 |
|-----------|-------------|-----|
| Approve | GO | **NO WRITE / NO MAP** |
| Reject | NO-GO | **NO WRITE / NO MAP** |
| Needs Review | HOLD | **NO WRITE / NO MAP** |

Mostek Persist → `kw-tender-decisions` = **S6 only**.

**No mapping:** **PASS**.

---

## 6. VIEWMODEL / LOGIC CONSTRAINTS (LOCKED)

| Zakaz | |
|-------|--|
| Drugi decision engine | **NIE** |
| Drugi validation | **NIE** |
| Drugi store | **NIE** |
| Drugi Expert path / flag | **NIE** |
| Zmiana Persist API | **NIE** |
| Zmiana Intelligence overlay BC | **NIE** |

**DOZWOLONE:** thin presentation · hierarchy props · hide/demote · helper gate · harness asserts.

---

## 7. ALLOWLIST (LOCKED — STRICT)

| # | Artefakt | Zakres |
|---|----------|--------|
| 1 | `src/lib/tender-expert-effective.ts` (**nowy**) | `isTenderExpertEffective` · kill-switch readers |
| 2 | `src/app/TenderDetailPage.tsx` | compose Session/DW enable z helper |
| 3 | `src/app/TenderWorkflowHubPanel.tsx` | Hub hierarchy / primary cues |
| 4 | `src/app/TenderWorkflowPrimaryAction.tsx` | HIDE ownerDecision write · redirect |
| 5 | `src/app/TenderDecisionView.tsx` | HIDE buttons · DEMOTE verdict |
| 6 | `src/app/TenderOwnerDecisionButtons.tsx` | opcjonalnie prop hidden/disabled |
| 7 | `src/app/tenders/strategy/components/BestOpportunityCard.tsx` | DEMOTE + HIDE write |
| 8 | `src/app/tenders/components/TendersStrategyContent.tsx` | nie podawać `onSetDecision` gdy ON |
| 9 | `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | copy only |
| 10 | `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | thin Expert-effective / kill honor |
| 11 | `src/lib/decision-workspace-ui/labels.ts` | opcjonalnie copy PRIMARY / note |
| 12 | `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` (**nowy**) | harness AC-S2-1…5 + matrix |
| 13 | docs S2 (CLOSEOUT/PV później) | docs only |

**Zero poza allowlist.** Diff IMPLEMENT ⊆ ta lista.

---

## 8. DENYLIST (LOCKED)

| Absolutnie OUT S2 | Slice |
|-------------------|-------|
| Persist bridge → `kw-tender-decisions` | **S6** |
| Migracja / schema store | **S6/S8** |
| Hard delete DecisionView / Strategy / TRE-01 / Intelligence | **S5/S7/S8** |
| Tab Decyzja → DW mount | **S5** |
| TRE-01 removal / default OFF engine | **S7** |
| Expert / Chief / Session / Validation **BC** | — |
| Decision Persist API contract | — |
| Bid / OfferBoq / TF / domain calc | — |
| Cloud sync / KV | — |
| `expertAiDecydentEnabled` | **FORBIDDEN** |
| Runtime Approve↔GO map | **S6** |
| Trzeci store / engine / flag system | — |

**Store untouched:** **PASS** · **S5/S6/S7/S8 boundaries:** **PASS**.

---

## 9. ACCEPTANCE CRITERIA (LOCKED)

| AC | Treść |
|----|--------|
| **AC-S2-1** | Expert ON ∧ ¬DW-kill ⇒ DW = jedyna PRIMARY human decision surface w Hub |
| **AC-S2-2** | Brak dwóch równorzędnych zestawów decyzji człowieka (Hub GO CTA + DW) |
| **AC-S2-3** | TRE-01 / Intelligence / system verdict = rekomendacja ≠ SSOT człowieka |
| **AC-S2-4** | Expert OFF (Module OFF Staff) ⇒ brak Przetargi · Super Admin bypass OK · kill ≠ Module gate |
| **AC-S2-5** | `kw-tender-decisions` istnieje · brak schema change · brak Persist→legacy bridge · brak runtime map |

### Matrix (harness)

Expert OFF / Expert ON × Hub · Decision · Strategy · Intelligence · DW · TRE-01 — zgodnie z §3.2.

---

## 10. OWNER QA (LOCKED)

| ID | Scenariusz |
|----|------------|
| **Q3** | Expert ON · Hub: jedna PRIMARY = DW |
| **Q4** | Expert OFF Staff · brak Przetargi |
| **Q13a** | Module OFF rollback · stores intact |
| **Q13b** | LS Session/DW `"0"` · stack OFF · legacy human buttons nie-PRIMARY |
| **Q-S2-Strat** | Strategy nie wygląda jak drugi Decydent |
| **Q-S2-TRE** | TRE-01 = rekomendacja ceny |
| **Q-S2-NoMap** | Approve w DW **nie** tworzy GO w `kw-tender-decisions` |

### Regression (LOCKED)

| Suite |
|-------|
| S2 harness (`test-tender-modernization-01-s2-dual-outcome.mjs`) |
| Module Enablement harness |
| Decision Persist harness |
| TI-B4 / tenders smoke |
| `npm run build` |

---

## 11. ROLLBACK (LOCKED)

```text
git revert S2 allowlist commit
  → PrimaryAction znowu może setOwnerDecision
  → DecisionView buttons wracają
  → Strategy onSetDecision wraca
  → DetailPage wraca do pre-wire flags (jeśli zmienione)
Module gate S1 bez zmian
Stores nietknięte
Nigdy: force-push · half-on S6 bridge · delete stores
```

---

## 12. 8 LOCK (LOCKED)

| # | Warstwa | S2 |
|---|---------|-----|
| 1 | Expert BC | **NO TOUCH** |
| 2 | Chief BC | **NO TOUCH** |
| 3 | Session BC | **NO TOUCH** (tylko app enable compose + kill read) |
| 4 | Wire Adapters | **NO TOUCH** |
| 5 | Technology Foundation | **NO TOUCH** |
| 6 | OfferBoq | **NO TOUCH** |
| 7 | Bid calculator | **NO TOUCH** |
| 8 | Domain calculations | **NO TOUCH** |

**8 LOCK:** **PASS**.

---

## 13. PAYROLL SAFETY GATE (przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK* (*kill-switch read · Persist REUSE istniejący Host · Module gate REUSE)
G3 Cloud/KV:     NIE (poza AppSettings Module — NO TOUCH S2)
G4 Edge:         NIE
G5 OfferBoq:     NIE
G6 Bid:          NIE
G7 Sync/merge:   NIE
G8 FEATURE:      TAK (thin UX hierarchy)
G9 Owner GO:     wymagany przed IMPLEMENT
```

---

## 14. Anti-patterns (FAIL IMPLEMENT)

1. Dwa PRIMARY zestawy decyzji człowieka przy Expert ON.  
2. Runtime mapowanie Approve→GO (lub odwrotnie).  
3. `expertAiDecydentEnabled` lub drugi master gate.  
4. Persist bridge / schema store.  
5. Hard delete legacy.  
6. Zmiana Expert/Chief/Session/Validation BC.  
7. Inteligence overlay formula change.  
8. Diff poza allowlist §7.  
9. `git add -A`.  
10. Traktować LS Session/DW jako Staff enablement (zamiast kill-switch).

---

## 15. Verdict

```text
════════════════════════════════════════════════════════
S2 DESIGN FREEZE COMPLETE

Primary:                 PASS
Expert OFF:              PASS
Expert ON:               PASS
Legacy demotion:         PASS
No mapping:              PASS
Store untouched:         PASS
S5/S6/S7/S8 boundaries:  PASS
8 LOCK:                  PASS
Runtime diff (ten turn): EMPTY

READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

**Następny krok:** Owner GO **IMPLEMENT S2** — diff ⊆ allowlist §7 · AC-S2-1…5 · QA §10 · build PASS.

Bez kodu · bez commit · bez push (ten turn DF only).
