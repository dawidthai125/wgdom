# EXPERT AI P0 — DUAL-ENABLEMENT / OFFER PLN — DESIGN FREEZE

> **STATUS:** **P0 CLOSED** · **PRODUCTION VERIFIED** · tip **`1902daa7`** · UI **2.66.22** · [`CLOSEOUT`](EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md) · [`PV`](EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md)  
> **ID:** EXPERT-AI-P0-DUAL-ENABLEMENT-DF  
> **Date:** 2026-08-09  
> **Baseline tip:** UI **2.66.22** · feature **`1902daa7`** · prior **`f5f598c5`**  
> **PLAN:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-PLAN.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-PLAN.md)  
> **AUDIT:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT.md)  
> **Priors:** TM-01 S0–S9 CLOSED · Enablement CLOSED · Q12 PASS · S8 HOLD REMOVE LOCKED

```text
════════════════════════════════════════════════════════
DESIGN FREEZE — LOCKED

AXIS-M  = ACCESS ONLY     (isTenderExpertEffective)
AXIS-D  = RUNTIME MASTER  (expertAiDecydentEnabled → Session/Decision)

Presentation / Dual Outcome / Offer PLN / Session·DW stack
  → follow D Session (isChiefOrchestratorSessionEnabled)
  → NEVER raw M alone

F1 M=1 D=0:
  NO false Expert runtime ON
  Bid PRIMARY
  Chief does NOT run
  Dual Outcome OFF (legacy PRIMARY)
  NO third flag / store / price engine

QUALITY GATE:
  M ≠ runtime master
  D ≠ access gate
════════════════════════════════════════════════════════
```

---

## 0. Owner GO

| Gate | Status |
|------|--------|
| OWNER GO → PLAN | **ISSUED** |
| OWNER GO → DESIGN FREEZE | **ISSUED** |
| OWNER GO → IMPLEMENT | **ISSUED** · **COMPLETE** |
| OWNER GO → COMMIT / PUSH / PV | **ISSUED** · **PASS** |
| OWNER GO → FINAL CLOSEOUT | **ISSUED** (this pack) |

---

## 1. Exact vocabulary (LOCKED)

| Term | Meaning | Symbol |
|------|---------|--------|
| **Expert available (access)** | User may open Przetargi module | AXIS-M · `isTenderExpertEffective` |
| **Expert AI runtime active** | Decydent Session may run Chief + DW Persist path | AXIS-D Session · `isChiefOrchestratorSessionEnabled()` |
| **Expert ON** (user-facing Moduły) | Persistent D master ON | `AppSettings.expertAiDecydentEnabled` |
| **Expert ON** (presentation / Dual Outcome / PLN) | **Runtime active** = D Session (after LS) | `isExpertAiRuntimeEffective()` alias OR direct Session flag |
| **NOT Expert ON** | Must not be inferred from M alone | — |

**Quality gate proof:** M never becomes runtime master; D never becomes access gate (`isTenderExpertEffective` body stays `adminCanViewTendersTab` only).

---

## 2. Exact truth table (LOCKED)

| # | M | D Session | Module access | Chief run | Dual Outcome PRIMARY | Legacy GO / Strategy write | Offer PLN authority |
|---|---|-----------|---------------|-------------|----------------------|----------------------------|---------------------|
| T00 | 0 | 0 | no (staff) | no | N/A | N/A | N/A |
| T01 | 0 | 1 | edge (LS OV / rare) | if UI reachable | PRIMARY iff DW Decision effective | demote | **`bid_legacy`** if Bid present (M=0 ⇒ never Offer-primary policy) |
| **T10** | **1** | **0** | **yes** | **no** | **OFF** | **SHOW / allow** | **`bid_legacy`** (Bid PRIMARY) |
| **T11** | **1** | **1** | **yes** | **yes if ready** | **ON** | **HIDE / demote** | Offer if set else **NO PRIMARY** |

**F1 = T10** — primary production Super Admin default.

---

## 3. Exact runtime flow per state

### T10 — M=1 D=0 (F1)

```text
AppSettings.expertAiDecydentEnabled = false (typical)
isChiefOrchestratorSessionEnabled = false
isExpertAiRuntimeEffective = false

Session stack enabled = false (no M short-circuit)
useChiefOrchestratorSession → no runChief
chiefSessionForDecision = null
DW Dual Outcome PRIMARY = false
Hub resolveAuthoritativeOfferPln(expertEffective=false, bid, offer)
  → primary = Bid.recommendedBidPln · source bid_legacy
```

### T11 — M=1 D=1

```text
expertAiDecydentEnabled = true (or LS Session "1")
isChiefOrchestratorSessionEnabled = true
isExpertAiRuntimeEffective = true

Session stack = true (unless LS kill)
Chief runs if OfferBoq + pricingReady*
dossier.primaryRecommendation.offerPricePln may exist
DW PRIMARY · legacy demote
resolveAuthoritativeOfferPln(expertEffective=true, …)
  → Offer primary OR NO PRIMARY if offer null (NEVER Bid fallback while D ON)
```

### T00 / T01

Access/routing unchanged (S1). T01: if somehow UI reachable with M=0, PLN policy = Bid primary (do not invent Offer-primary without M).

---

## 4. Exact UI semantics (LOCKED)

| Surface | T10 (D=0) | T11 (D=1) |
|---------|-----------|-----------|
| Moduły toggle | OFF = Expert AI runtime off | ON = runtime master |
| Hub `data-s2-dw-primary` / Expert runtime cues | **0 / absent** (must not claim Expert runtime) | **1** when Dual Outcome applies |
| Hub PLN headline | Bid badge / bid_legacy | Offer badge or NO PRIMARY |
| PrimaryAction GO write | allowed (legacy) | suppressed → DW surface |
| DecisionView owner buttons | shown | hidden / demote |
| Strategy `setOwnerDecision` omit | no (writes OK) | yes when runtime ON |
| TRE Outcome auto | allowed per S7 when runtime OFF | never auto; Hub-first / recovery CTA |
| Eksperci / Session mount | idle / not mounted as live | live when ready |

Copy rule: never equate „module visible” with „Expert AI ON”.

Optional thin Moduły hint (allowlist): OFF = legacy Bid/Strategy; ON = Przebieg+Decydent.

---

## 5. Surface behavior matrix (LOCKED)

| Surface | Keys on | T10 | T11 |
|---------|---------|-----|-----|
| **Session hook start** | D Session (+ stack aligned to D) | no run | run if ready |
| **Decision Workspace** | D Decision (coupled) + session prop | no Decydent Persist UI | full path |
| **Dual Outcome** | **D runtime** | legacy PRIMARY | DW PRIMARY |
| **Offer PLN authority** | **D runtime** as `expertEffective` arg | Bid primary | Offer / NO PRIMARY |
| **Hub** | D for cues + authority | Bid headline | Offer / none |
| **Bid primary** | when D runtime false | yes | no (secondary only if Offer primary) |
| **AXIS-M** | access only | may be true | may be true |

---

## 6. Exact resolver ownership (LOCKED)

### 6.1 Unchanged ownership

| Symbol | Owner file | Semantics |
|--------|------------|-----------|
| `isTenderExpertEffective` | `tender-expert-effective.ts` | **ACCESS only** — body = `adminCanViewTendersTab` · **NO Enablement** |
| `resolveTenderExpertEffective` | same | convenience ACCESS |
| `isChiefOrchestratorSessionEnabled` | `chief-session/flag.ts` | D Session · LS `"0"`>`"1"`>AppSettings>false |
| `isDecisionWorkspaceEnabled` | `decision-workspace-ui/flag.ts` | D Decision · coupling KEEP |
| `AppSettings.expertAiDecydentEnabled` | `app-settings.ts` | **sole persistent** runtime master |

### 6.2 Changed ownership / wiring

| Symbol | Change (LOCKED) |
|--------|-----------------|
| `isExpertAiRuntimeEffective()` | **ADD** thin alias in `tender-expert-effective.ts` (or adjacent export) = `isChiefOrchestratorSessionEnabled()` · **no new storage** · no AppSettings field |
| `isChiefSessionStackEnabled` | **REMOVE** `if (expertEffective) return true` M short-circuit. Resolve: LS kill/force on Session key **or** delegate to Session flag only (single LS SSOT = Session flag). Parameter `expertEffective` **deprecated for M**; callers pass runtime or call Session directly — DF: **stackEnabled := isChiefOrchestratorSessionEnabled()** (LS already inside). Keep function for API stability; ignore M meaning. |
| `isDecisionWorkspaceStackEnabled` | Same: **:= isDecisionWorkspaceEnabled()** (coupling+LS inside). No M short-circuit. |
| `isTenderExpertDwKillActive` | Recompute: runtime D Session ON && Decision stack OFF (LS Decision `"0"`) |
| `resolveAuthoritativeOfferPln({ expertEffective })` | Parameter means **D runtime**, not M. Formula KEEP: true→Offer/none; false→Bid |
| `resolveAuthoritativeOfferPlnForRole` | **MUST NOT** call `isTenderExpertEffective`. Call `isExpertAiRuntimeEffective()` / Session flag |

### 6.3 Call-site rule (LOCKED)

Any former `const expertEffective = resolveTenderExpertEffective(role)` used for Dual Outcome / PLN / TRE Hub-first / demote **MUST** become:

```text
const expertAiRuntime = isExpertAiRuntimeEffective()
// or isChiefOrchestratorSessionEnabled()
```

Keep `resolveTenderExpertEffective` **only** where ACCESS is required (rare after fix; grep-driven).

### 6.4 LS compatibility (LOCKED)

| Key | Semantics |
|-----|-----------|
| `kw-chief-orchestrator-session` `"0"` | Force Session/runtime OFF |
| `"1"` | Force Session/runtime ON |
| `kw-decision-workspace` `"0"`/`"1"` | KEEP + Session coupling |
| Precedence | **Unchanged** Enablement DF |

No new LS keys.

---

## 7. Exact allowlist (LOCKED)

| # | Path | Permitted change |
|---|------|------------------|
| 1 | `src/lib/tender-expert-effective.ts` | alias runtime · stack helpers · DwKill |
| 2 | `src/lib/tender-offer-pln-authority.ts` | ForRole → runtime D; comments |
| 3 | `src/app/TenderDetailPage.tsx` | stack + Dual Outcome/TRE `expertEffective` → runtime D |
| 4 | `src/app/TenderWorkflowHubPanel.tsx` | cues + authority input → runtime D |
| 5 | `src/app/TenderWorkflowPrimaryAction.tsx` | demote/gate → runtime D |
| 6 | `src/app/TenderDecisionView.tsx` | hide/demote → runtime D |
| 7 | `src/app/tenders/components/TendersStrategyContent.tsx` | omit write → runtime D |
| 8 | `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | authority → runtime D |
| 9 | `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | `flagEnabled` via Decision stack aligned to D |
| 10 | `src/app/AdminSettingsModal.tsx` | **optional** one-line hint only |
| 11 | `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | stack/PRIMARY expectations; F1 cases |
| 12 | `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` | PLN authority semantics if asserted via ForRole |
| 13 | `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | expertEffective meaning |
| 14 | `scripts/test-tender-modernization-01-s6-decision-persist-bridge.mjs` | PrimaryAction patterns if needed |
| 15 | `scripts/test-tender-modernization-01-s7-hub-first.mjs` | expertEffective = runtime D |
| 16 | `scripts/test-expert-ai-production-enablement-01.mjs` | add F1 presentation/PLN if needed; precedence KEEP |
| 17 | Docs: this DF + thin PLAN status / post-release note | continuity |

**Do not expand** without STOP + Owner amend DF.

**Confirm OUT of allowlist unless grep forces:** `BestOpportunityCard.tsx` — currently no direct `resolveTenderExpertEffective` (demote via Strategy omit). Leave OUT.

---

## 8. Exact symbols permitted to change (LOCKED)

| Symbol | Action |
|--------|--------|
| `isExpertAiRuntimeEffective` | **ADD** (thin) |
| `isChiefSessionStackEnabled` | **EDIT** body |
| `isDecisionWorkspaceStackEnabled` | **EDIT** body |
| `isTenderExpertDwKillActive` | **EDIT** body |
| `resolveAuthoritativeOfferPlnForRole` | **EDIT** |
| Call-site locals `expertEffective` (presentation) | **REWIRE** source |
| `isTenderExpertEffective` **body** | **NO CHANGE** |
| `isChiefOrchestratorSessionEnabled` **body** | **NO CHANGE** (reuse) |
| `isDecisionWorkspaceEnabled` **body** | **NO CHANGE** (reuse) |
| Persist / Offer Expert compute / Bid formulas | **NO CHANGE** |

---

## 9. Exact tests / harness (LOCKED)

| Harness | Required updates |
|---------|------------------|
| S2 Dual Outcome | Stack: M=true must **not** force stack ON when Session OFF; PRIMARY/demote follow runtime D; keep ACCESS tests for `isTenderExpertEffective` |
| S4 Hub / S3 authority | `resolveAuthoritativeOfferPln({expertEffective:false})` Bid primary; true→Offer/NO PRIMARY; ForRole uses D |
| S5 / S6 | Source patterns still valid with runtime variable name if needed |
| S7 | `showTre01Outcome` uses runtime D |
| Enablement | Precedence/coupling unchanged; optional AC F1 Hub Bid when D OFF |
| New minimal unit cases in S2 or enablement | T10 Bid primary · T11 Offer primary · stack no M short-circuit |

---

## 10. AC-P0-F1…N (LOCKED)

| ID | Criterion |
|----|-----------|
| **AC-P0-F1** | T10 (M=1 D=0): Dual Outcome does **not** present Expert runtime PRIMARY |
| **AC-P0-F2** | T10: Hub authority = **`bid_legacy`** when Bid present |
| **AC-P0-F3** | T10: Chief does **not** run |
| **AC-P0-F4** | T11 + Offer ready: authority = **`offer_expert`** |
| **AC-P0-F5** | T11 + Offer null: **NO PRIMARY** (no Bid fallback) |
| **AC-P0-F6** | `isTenderExpertEffective(super_admin)` still true with D=0 |
| **AC-P0-F7** | LS Session `"0"` ⇒ runtime OFF despite AppSettings ON |
| **AC-P0-F8** | LS Session `"1"` ⇒ runtime ON despite AppSettings OFF |
| **AC-P0-F9** | Decision coupling KEEP |
| **AC-P0-F10** | No new AppSettings field · no new LS key · no new store |
| **AC-P0-F11** | `offerPricePln` / `directPln` / `recommendedBidPln` formulas untouched |
| **AC-P0-F12** | `useTenderOfferRun.ts` git diff empty |
| **AC-P0-F13** | Diff ⊆ allowlist §7 |
| **AC-P0-F14** | S2/S4/S5/S6/S7 + enablement harness PASS after expectation update |
| **AC-P0-F15** | Quality gate: M body unchanged access; D remains runtime master |

---

## 11. Regression matrix (LOCKED)

| Area | Gate |
|------|------|
| Enablement precedence/coupling | PASS |
| Q12 Case identity | NO TOUCH / still PASS |
| Persist API / S6 bridge | NO TOUCH |
| S8 HOLD (Bid/Offer/TRE keep) | PASS |
| S3 Offer/Bid/NO PRIMARY formula | PASS with D-keyed `expertEffective` |
| S1 module access | PASS |
| Build | PASS |

---

## 12. Rollback (LOCKED)

```text
git revert <implement-commit>
```

No migration. Tip target pre-fix: **`f5f598c5`**.

---

## 13. Compatibility (LOCKED)

| Mechanism | Compatibility |
|-----------|----------------|
| `AppSettings.expertAiDecydentEnabled` | Unchanged field · sole persistent D master |
| LS `"0"` / `"1"` | Unchanged precedence |
| S2 Dual Outcome | Narrow amend: PRIMARY key = **runtime D**, not Module |
| S3 PLN | Narrow amend: authority `expertEffective` = **runtime D** |
| Enablement DF | Strengthened (consumers finally honor D) |
| Three PLN fields | Unchanged engines |

**Proof — no third anything:**

| Forbidden | Proof |
|-----------|-------|
| Third flag | No new AppSettings/LS key in allowlist |
| Third store | No new KV |
| Third price / scoring / Expert engine | Only presentation resolver rewire |
| New Persist path | Host/Persist untouched |

---

## 14. Explicit OUT (LOCKED)

`useTenderOfferRun.ts` · Persist/Strategy/TRE/Bid/OfferBoq/Expert BC · S8 HOLD REMOVE · S10 · cloud · third flag/store/engine · changing `isTenderExpertEffective` into runtime · making D an access gate · Bid→primary while D=ON · merge PLN SSOTs

---

## 15. Narrow contract amend note (S2/S3)

Historical closeouts said „Expert-effective = Module”. **After Enablement**, that equality is **false for presentation**.

| Historical phrase | DF meaning now |
|-------------------|----------------|
| Expert-effective (Module / S1) | **ACCESS** · `isTenderExpertEffective` |
| Expert ON (Dual Outcome / Offer PLN / stack) | **RUNTIME D** · Session flag |

Docs tip update = thin after IMPLEMENT — not a new epic.

---

## 16. Quality gate checklist (pre-COMPLETE)

| Check | Result |
|-------|--------|
| M remains access only | **PASS** (body frozen) |
| D remains runtime master | **PASS** |
| F1 T10 Bid primary + no false Expert runtime | **LOCKED** |
| T11 Offer/NO PRIMARY | **LOCKED** |
| No third flag/store/engine | **LOCKED** |
| `useTenderOfferRun` OUT | **LOCKED** |

---

## 17. NEXT GATE

```text
P0 CLOSED · PRODUCTION VERIFIED · tip 1902daa7

CLOSEOUT: EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md
PV: EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md

NEXT: WAITING FOR NEXT OWNER GO · NIE invent S10
```
