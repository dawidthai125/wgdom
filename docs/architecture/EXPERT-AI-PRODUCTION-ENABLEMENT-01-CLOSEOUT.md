# EXPERT-AI-PRODUCTION-ENABLEMENT-01 — CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED** · **Q12 FIX VERIFIED**  
> **ID:** EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT  
> **Production Version:** **2.66.22**  
> **Feature / Deploy Commit:** **`4ba06032`** (`4ba06032794fd3d18d7f8ba204c6326bff0a98e2`) · tip short **`4ba0603`**  
> **Prior tip (pre-Enablement feature):** **`29a48fb3`**  
> **Data:** 2026-08-09  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Q12 PV:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md)  
> **Q12 DF:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md)  
> **Q12 IMPLEMENT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md)  
> **DF:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md)  
> **PLAN:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md)  
> **AUDIT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md)

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — CLOSED

2.66.22 / 4ba06032
PRODUCTION VERIFIED
Q12 FIX VERIFIED (reload hydrate)

Master gate     = AppSettings.expertAiDecydentEnabled (default false)
Storage REUSE   = kw-app-settings (Super Admin ⚙ Moduły)
Legacy LS       = kw-chief-orchestrator-session · kw-decision-workspace
Precedence      = "0" > "1" > AppSettings > false
Coupling        = Decision effective ⇒ Session effective
Persist         = kw-decision-persist-v1 · contract UNCHANGED
Q12 identity    = stableCaseStamp (Option A)
  caseId + dossier.finishedAt content-stable across reload

NO third store · NO third flag · NO Persist API change
NO useTenderOfferRun touch
NO TenderDetailPage / S2 tip fix in this epic

ACTIVE EPIC = NONE
TRYB = UTRZYMANIE
NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Delivered

| Element | Treść |
|---------|--------|
| **Enablement** | Master gate `expertAiDecydentEnabled` · Moduły UI · Session↔Decision coupling · defaults OFF |
| **Q12 FIX** | Content-stable Case identity — Option A |
| **stableCaseStamp** | `kosztorys.parsedAt ?? tenderDossier.builtAt ?? content:token\|pv:N` |
| **Fingerprint** | `recomputeToken\|parserVersionNum\|stableCaseStamp` |
| **caseId** | `chief:${item.id}:${fingerprint}` — **stable across full reload** |
| **dossier.finishedAt** | `nowIso = stableCaseStamp` — **stable across full reload** |
| **Persist** | Matching `tenderId ∧ caseId ∧ dossierFinishedAt` **UNCHANGED** |
| **Feature commit** | **`4ba06032`** · prod tip **`4ba0603`** |

### Allowlist (feature commit)

| Path | Role |
|------|------|
| `src/app/hooks/useChiefOrchestratorSession.ts` | stamp · `builtAtIso` · `nowIso` |
| `src/lib/chief-session/case-id.ts` | `resolveStableCaseStamp` + fingerprint |
| `src/lib/chief-session/index.ts` | export |
| `scripts/test-wire-chief-session-01.mjs` | AC-F1…F5 |
| Enablement / Q12 docs (in feature + this closeout pack) | DF · IMPLEMENT · PV · CLOSEOUT |

---

## 2. Q12 RCA (frozen)

| Item | Fact |
|------|------|
| **Root cause** | Session reminted wall-clock Case identity on reload (`assemble` default `builtAt`, fingerprint clock, missing `nowIso`) |
| **Symptom** | Persist write OK → reload → hydrate miss → UI **Decyzja: brak** |
| **Chosen fix** | **Option A** — stabilize Case identity; Persist contract untouched |
| **OUT** | tenderId-only hydrate · relaxed matching · third store · `useTenderOfferRun` |

---

## 3. Production Verify (Q12)

| Check | Result |
|-------|--------|
| Write `needs_review` | **PASS** |
| Chip before reload | **Decyzja: do przeglądu** |
| Chip after FULL reload | **Decyzja: do przeglądu** |
| `caseId` before/after | **SAME** |
| `dossier.finishedAt` before/after | **SAME** |
| Content invalidation (real BOQ change) | **NOT TESTED** — no safe prod BOQ mutation |
| Live regression (Persist key · no third store · no `useTenderOfferRun` TRACE · Expert AI restored OFF) | **PASS** |
| Overall Q12 PV | **PASS** · FIXED / VERIFIED |

Evidence (local, not in git): `.tmp-enablement-pv/browser-qa-live/q12pv-report.json`

SSOT PV doc: [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md)

---

## 4. Known OUT / residuals (not this epic)

| Item | Status |
|------|--------|
| **S2 harness 44/45** | **PRE-EXISTING** on baseline **`29a48fb3`** · raw `isChiefOrchestratorSessionEnabled()` in `TenderDetailPage.tsx` · **OUT** · **DO NOT FIX** in Q12 |
| **`src/lib/bid-time-load-guard/**`** | Unrelated local WIP · **OUT** · **DO NOT TOUCH** |
| **`src/app/hooks/useTenderOfferRun.ts`** | **PROTECTED** LOCAL M · **NO TOUCH** in this epic |
| Content invalidation live | **NOT TESTED** (see §3) |
| Cloud Persist / Audit Hub | Residual — only Owner GO → AUDIT |

---

## 5. Boundary

| Warstwa | Status |
|---------|--------|
| Persist API / store / types | **NO TOUCH** (contract KEEP) |
| DecisionWorkspaceHost | **NO TOUCH** |
| Chief BC / adapters / Experts | **NO TOUCH** |
| OfferBoq / Bid / TRE / Strategy | **NO TOUCH** |
| `useTenderOfferRun.ts` | **PROTECTED · OUT** |
| TenderDetailPage / S2 tip FAIL | **OUT** |

---

## 6. NEXT

**ACTIVE EPIC = NONE** · **TRYB = UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**.

Cloud Persist · Audit Hub · Bid Time-Load Guard izolowany COMMIT · S2 DetailPage cleanup · content-invalidation Owner QA — **tylko** Owner GO → AUDIT.
