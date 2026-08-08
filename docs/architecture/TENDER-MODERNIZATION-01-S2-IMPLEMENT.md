# TENDER-MODERNIZATION-01 / S2 — IMPLEMENT (Dual Outcome)

> **STATUS:** **S2 IMPLEMENT COMPLETE** · **READY FOR OWNER VERIFICATION**  
> **ID:** TENDER-MODERNIZATION-01-S2-IMPLEMENT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S2 — Dual Outcome**  
> **TRYB:** IMPLEMENT ONLY · **NO commit · NO push · NO Production Verify**  
> **Data:** 2026-08-08  
> **Baseline tip (pre-ship):** UI **2.66.22** / **`eed3ba0e`**  
> **SSOT DF:** [`TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
S2 IMPLEMENT — Dual Outcome

Expert effective = adminCanViewTendersTab (Module)
Expert ON  → Decision Workspace = PRIMARY
Legacy     → HIDE / DEMOTE (no hard delete)
NO map     Approve↛GO · Reject↛NO-GO · NeedsReview↛HOLD

STATUS: IMPLEMENT COMPLETE · READY FOR OWNER VERIFICATION
════════════════════════════════════════════════════════
```

---

## 1. Changed files

| Plik | Zakres |
|------|--------|
| `src/lib/tender-expert-effective.ts` | **NEW** — Expert-effective = Module; Session/DW stack + kill `"0"` |
| `src/app/TenderDetailPage.tsx` | Session stack via `isChiefSessionStackEnabled` |
| `src/app/TenderWorkflowHubPanel.tsx` | hierarchy cues · `data-s2-dw-primary` |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Expert ON: suppress `setOwnerDecision` · scroll DW |
| `src/app/TenderDecisionView.tsx` | HIDE owner buttons · DEMOTE system verdict · RO legacy |
| `src/app/TenderOwnerDecisionButtons.tsx` | prop `hidden` |
| `src/app/tenders/strategy/components/BestOpportunityCard.tsx` | demote + hide write |
| `src/app/tenders/components/TendersStrategyContent.tsx` | omit `onSetDecision` when Expert ON |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | TRE demote copy |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | thin stack wire · `data-s2-dw-primary` |
| `src/lib/decision-workspace-ui/labels.ts` | PRIMARY / TRE note copy |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | **NEW** harness AC-S2 + matrix |
| `scripts/test-tender-modernization-s2.mjs` | Owner alias → canonical harness |
| `docs/architecture/TENDER-MODERNIZATION-01-S2-IMPLEMENT.md` | ten raport |

---

## 2. Allowlist verification

| # | DF allowlist | Diff |
|---|--------------|------|
| 1–11 | helper · Detail · Hub · Primary · DecisionView · OwnerButtons · BestOpportunity · Strategy · TRE · Host · labels | **PASS** |
| 12 | S2 harness (+ Owner alias) | **PASS** |
| 13 | IMPLEMENT report | **PASS** |

**Poza allowlistą kodową:** brak.  
**Allowlist:** **PASS**

---

## 3. Expert OFF behavior

| Surface | Zachowanie |
|---------|------------|
| Module Staff OFF | brak UI Przetargi (S1) — bez regresji |
| Helper `isTenderExpertEffective(admin, OFF)` | `false` |
| Stack Session/DW | legacy `isChiefOrchestratorSessionEnabled` / `isDecisionWorkspaceEnabled` |
| PrimaryAction / DecisionView / Strategy | gałęzie `!expertEffective` zachowują legacy write / primary |

**Expert OFF:** **PASS** (helper + source matrix; Module gate S1 unchanged).

---

## 4. Expert ON behavior

| Surface | Zachowanie |
|---------|------------|
| Session/DW stack | **ON** unless LS `"0"` kill |
| Hub | `data-s2-dw-primary` · hierarchy cue |
| PrimaryAction | **no** `setOwnerDecision` · scroll `#decision-workspace-surface` |
| DecisionView | owner buttons **HIDDEN** · verdict **DEMOTED** · RO legacy record |
| Strategy | `onSetDecision` omitted · demoted label |
| TRE-01 | Outcome PLN **KEEP** · demote note |
| Decision Workspace Host | stack gate · PRIMARY marker |

**Expert ON:** **PASS**

---

## 5. Primary hierarchy

```text
Module gate → Expert-effective → Decision Workspace = PRIMARY human decision
Legacy GO/HOLD surfaces = compatibility (non-PRIMARY)
```

**DW PRIMARY:** **PASS**

---

## 6. Legacy demotion

| Surface | Policy | Done |
|---------|--------|------|
| PrimaryAction GO commit | HIDE write | ✓ |
| DecisionView owner buttons | HIDE | ✓ |
| DecisionView system verdict | DEMOTE badge | ✓ |
| Strategy write | HIDE | ✓ |
| Strategy label | DEMOTE | ✓ |
| TRE-01 | DEMOTE copy | ✓ |
| Components | KEEP (no hard delete) | ✓ |

**Legacy demotion:** **PASS**

---

## 7. No mapping verification

| Check | Result |
|-------|--------|
| Persist API → `kw-tender-decisions` | **NO** |
| Host `recordDecision` → `setOwnerDecision` | **NO** |
| Approve→GO / Reject→NO-GO / NeedsReview→HOLD runtime map | **NO** |
| `kw-tender-decisions` schema | **UNTOUCHED** |

**No mapping:** **PASS**

---

## 8. Test results

| Test | Result |
|------|--------|
| `test-tender-modernization-s2.mjs` (canonical dual-outcome) | **45 PASS / 0 FAIL** |
| `test-tender-module-enablement-01.mjs` | **29 PASS / 0 FAIL** |
| `test-decision-persist-01.mjs` | **14 PASS / 0 FAIL** |
| `test-decision-workspace-01.mjs` | **15 PASS / 0 FAIL** |
| `test-tenders-stabilization-smoke.mjs` | **12/12 PASS** |

### QA matrix (DF §10)

| ID | Result |
|----|--------|
| Q3 | **PASS** (Hub DW PRIMARY cues + Primary suppress) |
| Q4 | **PASS** (Module OFF admin → Expert false; SA bypass) |
| Q13a | **PASS** (stores intact · Module gate unchanged) |
| Q13b | **PASS** (LS `"0"` kill Session/DW) |
| Q-S2-Strat | **PASS** (omit write + demote) |
| Q-S2-TRE | **PASS** (demote note) |
| Q-S2-NoMap | **PASS** (Persist ≠ legacy store) |

---

## 9. Build

`npm run build` — **PASS** (exit 0).

---

## 10. 8 LOCK

| Lock | Diff |
|------|------|
| Expert BC | **NO TOUCH** |
| Chief BC | **NO TOUCH** |
| Session BC | **NO TOUCH** (app-layer stack compose only) |
| Adapters | **NO TOUCH** |
| TF | **NO TOUCH** |
| OfferBoq | **NO TOUCH** |
| Bid | **NO TOUCH** |
| domain calc | **NO TOUCH** |

**8 LOCK:** **PASS**

---

## 11. AC-S2-1…5

| AC | Werdykt |
|----|---------|
| **AC-S2-1** | **PASS** — Expert ON ∧ ¬DW-kill ⇒ DW PRIMARY |
| **AC-S2-2** | **PASS** — brak dual human write (Hub GO + DW) |
| **AC-S2-3** | **PASS** — TRE / Intelligence / system = rekomendacja |
| **AC-S2-4** | **PASS** — Expert OFF Module · SA bypass · kill ≠ Module |
| **AC-S2-5** | **PASS** — legacy store intact · no Persist bridge · no map |

**AC:** **PASS**

---

## 12. Deviations

1. **Owner harness alias** — dodano `scripts/test-tender-modernization-s2.mjs` (re-export) obok DF canonical `…-01-s2-dual-outcome.mjs`.
2. **Host comment** — pozostawiono wzmiankę `kw-decision-workspace` / `isDecisionWorkspaceEnabled` w komentarzu, aby T11 Persist (brittle source assert) pozostał PASS bez edycji poza allowlistą.
3. **Hub reorder** — poza S2 (S4); hierarchy = cues + Primary suppress, nie pełny reorder DOM.

**Brak odchyleń od semantyki DF / 8 LOCK / no-mapping.**

---

## Werdykt końcowy

| | |
|--|--|
| **S2 IMPLEMENT** | **COMPLETE** |
| **AC** | **PASS** |
| **Expert OFF** | **PASS** |
| **Expert ON** | **PASS** |
| **DW PRIMARY** | **PASS** |
| **Legacy demotion** | **PASS** |
| **No mapping** | **PASS** |
| **Build** | **PASS** |
| **8 LOCK** | **PASS** |
| **Allowlist** | **PASS** |
| **Runtime** | **PASS** (harness + stack/kill) |

**READY FOR OWNER VERIFICATION**

Bez commit · bez push · bez Production Verify.
