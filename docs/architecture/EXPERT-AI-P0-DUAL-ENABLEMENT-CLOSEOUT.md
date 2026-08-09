# EXPERT-AI-P0-DUAL-ENABLEMENT — CLOSEOUT

> **STATUS:** **P0 CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT  
> **Production Version:** **2.66.22**  
> **Feature / Deploy Commit:** **`1902daa7`** (`1902daa7bad6b5360fcc95188f6889a314fffa3f`) · tip short **`1902daa`**  
> **Parent tip:** **`f5f598c5`** (Enablement docs closeout) · prior feature Q12 **`4ba06032`**  
> **Data:** 2026-08-09  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PV:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md)  
> **DF:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md)  
> **PLAN:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-PLAN.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-PLAN.md)  
> **AUDIT:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md)

```text
════════════════════════════════════════════════════════
EXPERT-AI-P0-DUAL-ENABLEMENT — CLOSED

2.66.22 / 1902daa7
PRODUCTION VERIFIED

AXIS-M = ACCESS only (isTenderExpertEffective / adminCanViewTendersTab)
AXIS-D = RUNTIME master (expertAiDecydentEnabled → Session/Decision)

isExpertAiRuntimeEffective() = thin alias → isChiefOrchestratorSessionEnabled()
Stack helpers := Session / Decision flags (NO M short-circuit)
Offer PLN authority expertEffective = D runtime (not M)

F1 M=1 D=0:
  runtime OFF · Session/DW OFF · Bid PRIMARY · no false Expert Offer

M=1 D=1:
  runtime ON · Offer PRIMARY if Offer set · NO PRIMARY if Offer null

LS "0" force OFF · LS "1" legacy OV · Decision ⇒ Session KEEP
NO third flag · NO third store · NO third PLN / price engine
S7 Hub-first KEEP · Q12 stable identity KEEP · Persist UNCHANGED

useTenderOfferRun.ts = OUT / PROTECTED
bid-time-load-guard = OUT / PRE-EXISTING WIP
current-tree build FAIL (bid WIP) = PRE-EXISTING / OUT
isolated P0 build = PASS

ACTIVE EPIC = NONE
TRYB = UTRZYMANIE
NEXT: WAITING FOR NEXT OWNER GO · NIE invent S10
════════════════════════════════════════════════════════
```

---

## 0. Closeout checklist (locked)

| # | Item | Status |
|---|------|--------|
| 1 | P0 IMPLEMENT | **COMPLETE** |
| 2 | P0 COMMIT | **`1902daa7`** |
| 3 | PUSH | **PASS** |
| 4 | PRODUCTION | **`1902daa7*`** · UI **2.66.22** |
| 5 | PV | **PASS** |
| 6 | M | **ACCESS** |
| 7 | D | **RUNTIME** |
| 8 | M=1 D=0 | runtime OFF · Session/DW OFF · Bid PRIMARY · no false Expert Offer |
| 9 | M=1 D=1 | runtime ON · Offer PRIMARY if Offer exists |
| 10 | LS `"0"` | force OFF |
| 11 | LS `"1"` | legacy OV |
| 12 | Decision ⇒ Session | **KEEP** |
| 13 | third flag | **NONE** |
| 14 | third store | **NONE** |
| 15 | third PLN / price engine | **NONE** |
| 16 | S7 Hub-first | **KEEP** |
| 17 | Q12 stable identity | **KEEP** |
| 18 | Persist contract | **UNCHANGED** |
| 19 | `useTenderOfferRun.ts` | **OUT / PROTECTED** |
| 20 | `bid-time-load-guard` | **OUT / PRE-EXISTING WIP** |
| 21 | current-tree build + bid WIP | **FAIL = PRE-EXISTING / OUT** |
| 22 | isolated P0 build | **PASS** |

---

## 1. Delivered

| Element | Treść |
|---------|--------|
| **Runtime alias** | `isExpertAiRuntimeEffective()` = `isChiefOrchestratorSessionEnabled()` |
| **Stack** | `isChiefSessionStackEnabled` / `isDecisionWorkspaceStackEnabled` ignore M |
| **DwKill** | runtime D ON ∧ DW stack OFF |
| **PLN ForRole** | uses runtime D — **not** `isTenderExpertEffective` |
| **Consumers** | Dual Outcome / Hub / PrimaryAction / DecisionView / Strategy / TRE / Host → D |
| **Feature commit** | **`1902daa7`** · prod tip **`1902daa`** |

### Allowlist (feature commit — 12 files)

| Path | Role |
|------|------|
| `src/lib/tender-expert-effective.ts` | alias · stack · DwKill |
| `src/lib/tender-offer-pln-authority.ts` | ForRole → D |
| `src/app/TenderDetailPage.tsx` | Dual Outcome / TRE → D |
| `src/app/TenderWorkflowHubPanel.tsx` | cues + PLN → D |
| `src/app/TenderWorkflowPrimaryAction.tsx` | demote → D |
| `src/app/TenderDecisionView.tsx` | hide/demote → D |
| `src/app/tenders/components/TendersStrategyContent.tsx` | omit write → D |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | authority → D |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | DW stack := Decision |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | F1 / stack |
| `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` | ForRole |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | runtime marker |

---

## 2. Truth table (locked · verified)

| Stan | Wynik |
|------|--------|
| **M=1 D=0 (F1)** | runtime OFF · Session/DW OFF · **Bid PRIMARY** · no false Expert Offer · Chief no-run |
| **M=1 D=1** | runtime ON · Offer PRIMARY if set · NO PRIMARY if Offer null |
| LS Session `"0"` | force runtime OFF |
| LS Session `"1"` | legacy OV ON |
| Decision | coupling **KEEP** (`Decision ⇒ Session`) |

---

## 3. Production Verify

| Check | Result |
|-------|--------|
| tip `1902daa7*` · UI **2.66.22** | **PASS** |
| Bundle forensics (`TendersModule-Dp9bh5sc.js`) | **PASS** — `Ea→wa`, stack `qC→wa`, Decision `pC` couples Session, Hub PLN=`Ea()` |
| TRACE / third flag / bid WIP in prod | **ABSENT** |
| Harnesses S2–S7 + Enablement + Session/Q12 + DW + Persist + truth table | **PASS** (see PV) |
| Isolated P0 build | **PASS** |
| Current-tree build + bid WIP | **FAIL** — **PRE-EXISTING / OUT** |

SSOT PV: [`EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md)

---

## 4. Known OUT / residuals

| Item | Status |
|------|--------|
| **`src/app/hooks/useTenderOfferRun.ts`** | **PROTECTED** LOCAL M · **NO TOUCH** |
| **`src/lib/bid-time-load-guard/**`** | Unrelated WIP · **OUT** · build FAIL PRE-EXISTING |
| **`tenders-bid-calculator.ts` / `tender-offer-boq-bid-adapter.ts`** | Unrelated WIP · **OUT** |
| **S10 / new epic** | **DO NOT invent** — only Owner GO → AUDIT |
| Content invalidation live (Q12) | still **NOT TESTED** (Enablement residual) |

---

## 5. Boundary

| Warstwa | Status |
|---------|--------|
| Persist API / store / types | **NO TOUCH** |
| OfferBoq / Bid formulas / Expert engines | **NO TOUCH** |
| TRE Hub-first (S7) | **KEEP** |
| Q12 Case identity | **KEEP** |
| TM-01 S8 HOLD REMOVE | **KEEP** |
| Third flag / store / price engine | **NONE** |

---

## 6. NEXT

```text
P0 CLOSED · PRODUCTION VERIFIED

ACTIVE EPIC = NONE
TRYB = UTRZYMANIE
NEXT = WAITING FOR NEXT OWNER GO → AUDIT
NIE invent S10
```
