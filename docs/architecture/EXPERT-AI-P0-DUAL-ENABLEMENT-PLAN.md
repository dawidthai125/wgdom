# EXPERT AI P0 — DUAL-ENABLEMENT / OFFER PLN — PLAN ONLY

> **STATUS:** **PLAN COMPLETE** · **P0 CLOSED** · tip **`1902daa7`** · [`CLOSEOUT`](EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md) · DF [`EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md)  
> **ID:** EXPERT-AI-P0-DUAL-ENABLEMENT-PLAN  
> **Date:** 2026-08-09  
> **Baseline tip:** UI **2.66.22** · feature **`1902daa7`** · prior **`f5f598c5`**  
> **AUDIT:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md)  
> **Priors CLOSED:** TM-01 S0–S9 · EXPERT-AI-PRODUCTION-ENABLEMENT-01 · Q12  
> **TRYB:** P0 CLOSED · UTRZYMANIE

```text
════════════════════════════════════════════════════════
P0 PLAN — EXECUTIVE

KEEP:
  AXIS-M = module / access (isTenderExpertEffective)
  AXIS-D = runtime Decydent master (expertAiDecydentEnabled → Session/Decision)

FIX:
  Stop using AXIS-M as proxy for „Expert AI ON” in:
    · Session/DW stack helpers
    · Dual Outcome PRIMARY / demote
    · S3 Offer PLN authority

USE INSTEAD:
  Runtime presentation/effective = AXIS-D Session
    isChiefOrchestratorSessionEnabled()
  (optionally ∧ AXIS-M where module access is required)

NO third flag · NO new store · NO new price engine
NO merge Offer.offerPricePln / directPln / recommendedBidPln
NO TOUCH useTenderOfferRun.ts · S8 HOLD · Persist/Strategy/TRE BC
════════════════════════════════════════════════════════
```

---

## 1. Executive decision

| Decision | Plan lock (proposed) |
|----------|----------------------|
| **A. AXIS-M remains access gate?** | **YES** — `isTenderExpertEffective` := `adminCanViewTendersTab` **unchanged** |
| **B. AXIS-D remains runtime master?** | **YES** — `AppSettings.expertAiDecydentEnabled` (+ LS precedence) remains **sole persistent** Decydent/Session runtime master |
| **C. UI „Expert AI ON” represents?** | **AXIS-D** (Moduły toggle already does). Presentation/Dual Outcome/Offer-primary must follow **AXIS-D Session**, not M |
| **Root fix** | Introduce / standardize a **thin derived runtime effective** (no new storage) and **rewire consumers** that currently treat M as Expert AI runtime |
| **S3 contract amend (narrow)** | Authoritative Offer PLN keys on **runtime Decydent Session (D)**, not Module (M). When D=OFF → **Bid primary** (legacy). When D=ON + Offer null → **NO PRIMARY** (S3 lock KEEP). When D=ON + Offer set → Offer primary |
| **S2 Dual Outcome amend (narrow)** | PRIMARY/demote keys on **D Session**, not M |
| **Enablement DF** | KEEP master gate, coupling, precedence, defaults — **do not duplicate** |

This is a **semantic alignment** of post-Enablement reality with S2/S3 helpers that still assume „Expert-effective = Module”.

---

## 2. Problem statement

Default Super Admin production:

| Axis | Value | Effect today |
|------|-------|--------------|
| M | ON | Dual Outcome / PLN authority / stack treat „Expert ON” |
| D | OFF | Chief does not run · DW session null · no `offerPricePln` |

Result: UI/policy says Expert ON → **NO PRIMARY** (Bid blocked from headline) → Chief idle → Decydent Persist unavailable. User-visible contradiction with Moduły „Expert AI · Przebieg i Decydent = OFF”.

Not a Q12/Persist bug. Not a missing third price. **Consumer wiring after Enablement.**

---

## 3. AXIS-M / AXIS-D semantics (planned)

| Axis | Symbol | Meaning AFTER fix | May imply Chief run? | May imply Offer primary? |
|------|--------|-------------------|----------------------|---------------------------|
| **M** | `isTenderExpertEffective` | **Access** to Przetargi module / staff gate | **NO** | **NO** |
| **D** | `expertAiDecydentEnabled` → `isChiefOrchestratorSessionEnabled` / Decision coupling | **Runtime** Expert AI Decydent (Session+DW) | **YES** (if ready) | **YES** (if dossier Offer exists; else NO PRIMARY) |

**Derived (no new AppSettings field):**

```text
expertAiRuntimeEffective :=
  isChiefOrchestratorSessionEnabled()
  ∧ (optional) isTenderExpertEffective(role, settings)

PLAN DEFAULT: expertAiRuntimeEffective := isChiefOrchestratorSessionEnabled()
Rationale: Session flag already encodes AppSettings + LS "0"|"1".
Module access is enforced by routing/UI — Super Admin always has M;
staff without tab never reach Hub.
Optional ∧ M only if DF proves a staff path can open Przetargi with M=false (should not).
```

**Do not rename** `isTenderExpertEffective` to mean runtime — keep API; stop misusing it.

---

## 4. Desired truth table

| M | D Session | Module UI | Chief run | Dual Outcome PRIMARY (DW) | Legacy GO CTAs | Offer PLN authority |
|---|-----------|-----------|-----------|---------------------------|----------------|---------------------|
| 0 | 0 | no Przetargi (staff) | no | N/A | N/A | N/A |
| 0 | 1 | edge / LS OV | possible if UI reachable | PRIMARY if DW stack | demote | Bid primary (M off) *or* treat as no-access — DF pick; PLAN prefers: if UI reachable, Bid primary |
| **1** | **0** | **yes** | **no** | **OFF** (legacy PRIMARY) | **SHOW** legacy | **`bid_legacy`** |
| **1** | **1** | **yes** | **yes if ready** | **ON** | **HIDE/demote** | Offer if present else **NO PRIMARY** |

**F1 mismatch (M=1 D=0) becomes coherent:** Bid can be Hub primary again; no false „Expert ON” Dual Outcome; stack does not pretend Session is live.

---

## 5. Runtime flow after fix

```text
Moduły: Expert AI · Przebieg i Decydent (AXIS-D)
  → AppSettings.expertAiDecydentEnabled
  → isChiefOrchestratorSessionEnabled / isDecisionWorkspaceEnabled (precedence KEEP)
  → expertAiRuntimeEffective ≈ Session flag

DetailPage:
  Session hook enabled := stack(runtime D) ∧ item
  stack helpers: DO NOT short-circuit ON solely because M=true

Hub / TRE / Dual Outcome / PLN:
  expertEffective_for_presentation := expertAiRuntimeEffective (D)
  resolveAuthoritativeOfferPln({ expertEffective: D, offer, bid })

AXIS-M:
  still gates who sees Przetargi (S1)
  NOT used as Expert AI runtime proxy
```

---

## 6. SSOT decision

| Concern | SSOT after fix |
|---------|----------------|
| Persistent Decydent master | **`AppSettings.expertAiDecydentEnabled`** only (no third flag) |
| Runtime Session | `isChiefOrchestratorSessionEnabled` (LS > AppSettings) |
| Runtime Decision | `isDecisionWorkspaceEnabled` (coupling KEEP) |
| Module access | `isTenderExpertEffective` / `adminCanViewTendersTab` |
| Presentation „Expert AI active” | **derived** from Session (D), not M |
| `Offer.offerPricePln` | Offer Expert / dossier — **unchanged formula** |
| `OfferBoq.directPln` | AI Cost — **unchanged** |
| `Bid.recommendedBidPln` | Bid — **unchanged** |
| Persist | unchanged |

---

## 7. Resolver strategy

### 7.1 KEEP (no semantic change)

| API | Action |
|-----|--------|
| `isTenderExpertEffective` / `resolveTenderExpertEffective` | **KEEP** = module access |
| `isChiefOrchestratorSessionEnabled` | **KEEP** = D Session |
| `isDecisionWorkspaceEnabled` | **KEEP** + coupling |
| Enablement precedence LS `"0"` > `"1"` > AppSettings > false | **KEEP** |

### 7.2 CHANGE (narrow)

| API / site | Change |
|------------|--------|
| `isChiefSessionStackEnabled(expertEffective: M)` | **Stop** `if (M) return true`. Resolve from **Session flag** (+ LS kill/force on same keys). Signature: prefer pass-through to Session, or `stackEnabled := SessionFlag` with LS already inside Session flag — **avoid double LS**. DF must pick one SSOT for LS read (Session flag already reads LS). |
| `isDecisionWorkspaceStackEnabled(M)` | Same: align with **Decision flag** / Session coupling, not M short-circuit |
| `resolveAuthoritativeOfferPln` / `ForRole` | `expertEffective` input must mean **runtime D**, not M. `ForRole` must not call `isTenderExpertEffective`; call Session flag (or new thin alias) |
| Dual Outcome call sites | Replace `resolveTenderExpertEffective` **for PRIMARY/demote/Offer-primary presentation** with runtime D helper |

### 7.3 ADD (thin, optional, no storage)

```text
isExpertAiRuntimeEffective(): boolean
  = isChiefOrchestratorSessionEnabled()
```

Purpose: readable name at call sites; **zero new persistence**. If DF decides alias unnecessary, call Session flag directly.

### 7.4 Compatibility LS `"0"` / `"1"`

| LS | Behavior (KEEP Enablement) |
|----|----------------------------|
| Session `"0"` | Force runtime OFF (kill) even if AppSettings ON |
| Session `"1"` | Force runtime ON (OV) even if AppSettings OFF |
| Decision `"0"`/`"1"` | KEEP + coupling Session OFF ⇒ Decision OFF |

Stack helpers must **not** bypass LS by M=true short-circuit (today’s bug class).

---

## 8. UI semantics

| Surface | Planned copy / behavior |
|---------|-------------------------|
| Moduły toggle | Remains **„Expert AI · Przebieg i Decydent”** = AXIS-D SSOT |
| When D=OFF | No Dual Outcome „DW PRIMARY” chrome implying live Experts; legacy CTAs available per S2 demote rules inverted correctly |
| When D=ON | DW PRIMARY · legacy demote · Offer PLN policy as S3 with D |
| Do **not** label module access (M) as „Expert AI ON” | If any leftover copy ties M to Expert AI — thin copy fix |
| AdminSettings hint | One line: OFF = legacy Bid/Strategy path; ON = Session+Decydent (optional DF) |

---

## 9. Exact allowlist (PLAN — justification required)

| Path | Why |
|------|-----|
| `src/lib/tender-expert-effective.ts` | Fix stack helpers — remove M⇒force ON; wire to D Session/Decision |
| `src/lib/tender-offer-pln-authority.ts` | Authority `expertEffective` = runtime D, not M |
| `src/app/TenderDetailPage.tsx` | Session enable + Dual Outcome/TRE gates that misuse M as runtime |
| `src/app/TenderWorkflowHubPanel.tsx` | `data-s2-*` / PLN authority consumer |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Expert gate / demote |
| `src/app/TenderDecisionView.tsx` | Expert ON hide/demote |
| `src/app/tenders/components/TendersStrategyContent.tsx` | omit write when runtime D |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | S3 NO PRIMARY / authority |
| `src/app/tenders/strategy/components/BestOpportunityCard.tsx` | if uses M for demote (confirm in DF) |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | `flagEnabled` stack vs Decision — align with D |
| `src/app/AdminSettingsModal.tsx` | optional one-line hint only |
| Harness: `test-tender-modernization-01-s2-*.mjs`, `s3` if exists, `test-expert-ai-production-enablement-01.mjs` | Update expectations M≠runtime; add F1 truth-table cases |
| Docs thin: this PLAN → DF later; tip note after ship | Continuity |

**DF will finalize allowlist** — drop files with zero M-as-runtime usage after grep proof.

---

## 10. Exact OUT

| OUT | Reason |
|-----|--------|
| New AppSettings field / third flag | Forbidden |
| New KV / Persist key | Forbidden |
| New Expert / price / scoring engine | Forbidden |
| Merge `offerPricePln` · `directPln` · `recommendedBidPln` | Forbidden |
| Persist / Strategy / TRE / Bid / OfferBoq BC rewrite | Forbidden |
| Bid removal / S8 HOLD REMOVE | Forbidden |
| `useTenderOfferRun.ts` | **PROTECTED · NO TOUCH** |
| Cloud | Forbidden |
| Changing `isTenderExpertEffective` to include Enablement | Would destroy S1 access SSOT |
| S10 / new epic packaging beyond this P0 | Forbidden |
| Big-bang rename of all „Expert-effective” strings in docs history | Out of scope (thin note only) |

---

## 11. AC-P0-1…N

| ID | Criterion |
|----|-----------|
| **AC-P0-1** | M=1 D=0 (default SA): **no** Dual Outcome DW-PRIMARY cue implying live Expert AI; legacy path usable |
| **AC-P0-2** | M=1 D=0: Hub Offer authority = **`bid_legacy`** when Bid present (not `none` solely because M) |
| **AC-P0-3** | M=1 D=1 + Chief Offer ready: authority = **`offer_expert`** primary |
| **AC-P0-4** | M=1 D=1 + Offer null: **NO PRIMARY** (S3 KEEP — never Bid fallback while D ON) |
| **AC-P0-5** | D=0: Chief **does not** `runChiefOrchestrator` |
| **AC-P0-6** | D=1 + readiness: Chief **does** run (Enablement KEEP) |
| **AC-P0-7** | LS Session `"0"` kills runtime even if AppSettings ON |
| **AC-P0-8** | LS Session `"1"` forces runtime ON even if AppSettings OFF (OV) |
| **AC-P0-9** | Decision coupling: Session OFF ⇒ Decision OFF |
| **AC-P0-10** | `isTenderExpertEffective` still equals module access (SA always true) |
| **AC-P0-11** | No new flag · no new store · no new engine |
| **AC-P0-12** | Price field semantics unchanged (three PLN remain distinct) |
| **AC-P0-13** | `useTenderOfferRun.ts` diff empty |
| **AC-P0-14** | Enablement + S2 + S3 harnesses updated/pass per new truth table |
| **AC-P0-15** | Moduły toggle remains sole persistent D master |

---

## 12. Regression matrix

| Suite / area | Expectation |
|--------------|-------------|
| `test-expert-ai-production-enablement-01` | Precedence/coupling/defaults KEEP |
| TM-01 S2 Dual Outcome harness | Expectations: PRIMARY/demote follow **D**, not M alone |
| TM-01 S3 PLN / parity harness (if present) | Authority input = D; F1 Bid primary |
| S4/S5/S6 smoke | No Persist/Host contract break |
| Q12 identity | Unaffected (Session identity KEEP) |
| S7 TRE Hub-first | Expert ON (=D) never auto Outcome; Expert OFF (=D off) legacy — confirm call sites |
| S8 HOLD | No Bid/Offer removal |
| Manual SA: D OFF → Bid headline; D ON → Offer/NO PRIMARY | Owner PV |

---

## 13. Rollback

```text
git revert <p0-fix-commit>
```

No migration. LS/AppSettings unchanged shape. Tip rollback to **`f5f598c5`** / pre-fix.

---

## 14. Migration / compatibility

| Topic | Plan |
|-------|------|
| AppSettings schema | **No change** |
| LS keys | **No change** — semantics KEEP |
| Existing SA with D=OFF | Behavior **improves** (Bid primary returns) — intentional |
| Existing SA with D=ON | Unchanged happy path |
| S2/S3 closed docs | **Amend note** in DF/closeout: Expert-effective(Module) ≠ Expert AI runtime; presentation keys on D |
| Enablement DF | **No contradict** — strengthens „master = expertAiDecydentEnabled” |

---

## 15. Risks

| Risk | Mitigation |
|------|------------|
| S2/S3 literal „Expert-effective = Module” conflict | Explicit narrow contract amend in DF; Owner GO |
| Over-broad allowlist | Grep-driven DF prune |
| Stack/Session double LS read | Single SSOT path in DF |
| Staff M=0 D=1 edge | Rare; truth table row; prefer Bid if UI reachable |
| Copy-only insufficient | Must change resolvers, not only strings |
| Touching Offer Run accidentally | Absolute exclude `useTenderOfferRun.ts` |

---

## 16. Explicit non-goals

- Unifying three PLN into one engine  
- LLM / new „intelligent” estimator  
- Cloud Persist / Audit Hub  
- Removing Bid or TRE  
- Changing Persist hydrate matching  
- Fixing S2 harness DetailPage raw Session call as primary scope (may fall out naturally if raw call removed — **only if** in allowlist with proof)  
- Renaming AXIS-M API  
- Inventing S10  

---

## Answers to PLAN gates A–I (summary)

| # | Answer |
|---|--------|
| A | M stays **access** |
| B | D stays **runtime master** |
| C | UI Expert AI = **D**; not M; not a third combined stored flag |
| D | Truth table §4 |
| E | **Yes** — `expertAiDecydentEnabled` sole persistent runtime master |
| F | **Yes** — M may be ON without implying runtime; UI must not claim otherwise |
| G | LS `"0"`/`"1"` KEEP Enablement precedence; fix M short-circuit bypass |
| H | **Combination:** resolver adjustment (stack + PLN + Dual Outcome consumers) + thin optional alias + harness + optional one-line Moduły hint — **not** copy-only |
| I | Reuse Enablement Session/Decision flags; do **not** re-implement master gate; amend S2/S3 **consumer** meaning of „Expert ON” for presentation only |

---

## NEXT GATE

```text
PLAN COMPLETE · DESIGN FREEZE COMPLETE
SSOT: EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md

STOP — no IMPLEMENT until OWNER GO → IMPLEMENT
```
