# EXPERT AI — P0 DUAL-ENABLEMENT / OFFER PLN DEEP AUDIT (AS-IS)

> **STATUS:** **AUDIT COMPLETE** · **P0 CLOSED** (mismatch fixed · tip **`1902daa7`**) · [`CLOSEOUT`](EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md)  
> **ID:** EXPERT-AI-P0-DUAL-ENABLEMENT-AUDIT  
> **Date:** 2026-08-09  
> **Production tip:** UI **2.66.22** · **`1902daa7`** (was **`f5f598c5`** at audit time)  
> **Prior:** [`EXPERT-AI-POST-RELEASE-AUDIT.md`](EXPERT-AI-POST-RELEASE-AUDIT.md)  
> **Locks:** TM-01 S0–S9 CLOSED · S8 HOLD REMOVE · NO TOUCH `useTenderOfferRun.ts` · no Persist/Strategy/OfferBoq/TRE rewrite

```text
P0 VERDICT = CONFIRMED ARCHITECTURAL SPLIT
             + CONFIRMED RUNTIME MISMATCH (Super Admin / staff Expert-effective)

Two independent “Expert ON” axes exist in production:
  AXIS-M = Module Expert-effective  (isTenderExpertEffective / adminCanViewTendersTab)
  AXIS-D = Decydent Enablement      (AppSettings.expertAiDecydentEnabled → Session/Decision flags)

Offer PLN authority (S3) keys ONLY on AXIS-M.
Chief run + Persist Decydent key on AXIS-D (inner) / AXIS-M (outer stack).

When AXIS-M=ON and AXIS-D=OFF (default for Super Admin):
  → UI treats Expert as ON for Dual Outcome / Offer-primary policy
  → Chief does NOT run
  → offerPricePln absent → Hub/TRE show NO PRIMARY (Bid intentionally NOT promoted)
```

---

## A. Executive verdict

| Question | Answer (evidence-backed) |
|----------|--------------------------|
| Are there two independent activation mechanisms? | **YES** — AXIS-M vs AXIS-D |
| Can they differ at runtime? | **YES** — default Super Admin: M=ON, D=OFF |
| Does „Expert AI ON” (Moduły toggle) mean full pipeline + Offer PLN? | **NO** — toggle = AXIS-D only |
| Does S3 Offer PLN primary require Decydent Enablement? | **NO** — requires AXIS-M only |
| Is `Offer.offerPricePln` from AI Cost? | **NO** — from **Offer Expert** (`analyzeOfferFromCost`) after Chief run |
| Is Bid `recommendedBidPln` from Offer Expert? | **NO** — Bid Proposal / AI Cost adapter path |
| Is this a code bug in Q12? | **NO** — intentional TM-01 S2/S3 design + later Enablement gate layered on Session |
| Severity | **P0 product/UX architecture** — not payroll / not Persist contract break |

---

## B. Exact flag graph

```text
AppSettings (kw-app-settings)
├── tendersTabForStaffEnabled  ──┐
│                                ▼
│   adminCanViewTendersTab(role, settings)
│     super_admin → ALWAYS true
│     admin|moderator → true iff tendersTabForStaffEnabled
│                                ▼
│              isTenderExpertEffective(role, settings)     ===== AXIS-M
│              resolveTenderExpertEffective(role)
│                                │
│                ┌───────────────┼───────────────────────────────┐
│                ▼               ▼                               ▼
│   isChiefSessionStackEnabled(M)   isDecisionWorkspaceStackEnabled(M)
│   LS kw-chief-orchestrator-session   LS kw-decision-workspace
│   "0" kill > "1" force >             "0" kill > "1" force >
│   (M ? true : legacy SessionFlag)    (M ? true : legacy DecisionFlag)
│                │                               │
│                ▼                               ▼
│   DetailPage: mount Session hook     Host: flagEnabled (stack)
│   enabled = stack && item
│
└── expertAiDecydentEnabled (default false)  ===== AXIS-D master
         │
         ▼
   isChiefOrchestratorSessionEnabled()     ===== AXIS-D Session
   LS "0" > "1" > AppSettings.expertAiDecydentEnabled > false
         │
         ├─► useChiefOrchestratorSession INNER GATE
         │     if (!isChiefOrchestratorSessionEnabled()) invalidate — NO runChief
         │
         ├─► chiefSessionForDecision = SessionFlag && tab…
         │     (DW receives session ONLY if AXIS-D Session ON)
         │
         └─► isDecisionWorkspaceEnabled()
               Coupling: !Session ⇒ false
               else LS "0">"1"> AppSettings.expertAiDecydentEnabled > false
```

### Flag table (A–D asked)

| Symbol | Axis | Storage / input | Default | Turns ON when |
|--------|------|-----------------|---------|---------------|
| **A** `AppSettings.expertAiDecydentEnabled` | D master | `kw-app-settings` · UI Moduły | **false** | Super Admin toggles ON |
| **B** `isTenderExpertEffective` | M | role + `tendersTabForStaffEnabled` | **true for super_admin** | Module access |
| **C** `isChiefOrchestratorSessionEnabled` | D Session | LS + A | false | A or LS `"1"` |
| **D** `isDecisionWorkspaceEnabled` | D Decision | C + LS + A | false | C and (A or LS `"1"`) |
| Stack helpers | M outer | B + LS | SA: stack ON | B true ⇒ stack ON |

**Critical asymmetry:** Stack helpers (**M**) can be ON while Session flag (**D**) is OFF → hook mounts but **does not run** Chief.

---

## C. Exact Offer PLN graph

```text
[AI Cost / OfferBoq path — independent of AXIS-D]
  snapshot → OfferBoq lines
    → applyOfferBoqCostIntelligence (heuristics)
    → applyOfferBoqPricing → totals.directPln          ===== OfferBoq.directPln
    → bid adapter → Bid Proposal → recommendedBidPln  ===== Bid.recommendedBidPln
    → pipelineRuntime.bidProposal / ownerFinanceProposal
    → useTenderOfferRun (TRE) reads bidProposal → recommendedOfferPln (Offer Run VM)
         NOTE: useTenderOfferRun = PROTECTED LOCAL WIP · TRACE present · NOT modified here

[Expert Offer path — requires AXIS-D Session run]
  assembleChiefWireRuntimeRo(OfferBoq RO + catalog + company)
    → runChiefOrchestrator
      → … Cost Expert → Offer Expert analyzeOfferFromCost
         compute: offerPricePln = realCost + margin + risk   ===== Offer.offerPricePln
      → dossier.primaryRecommendation.offerPricePln
    → chiefSessionForDecision (needs AXIS-D Session ON)
    → Hub / DW panels

[Authority presentation — S3 — keys on AXIS-M ONLY]
  resolveAuthoritativeOfferPln({
    expertEffective: AXIS-M,          // NOT AXIS-D
    offerPricePln,                    // from dossier if Session ran
    recommendedBidPln,                // from Bid
  })
    AXIS-M ON  → primary = offerPricePln | null  (source offer_expert | none)
                 Bid = secondary only — NEVER promoted to primary
    AXIS-M OFF → primary = recommendedBidPln     (source bid_legacy)
```

### Relation of three PLN fields

| Field | Owner engine | Meaning | Includes margin/risk? |
|-------|--------------|---------|------------------------|
| **G** `OfferBoq.totals.directPln` | AI Cost pricing | Koszt bezpośredni pozycji | **NO** (direct stack) |
| **F** `Bid.recommendedBidPln` | Bid Proposal (+ adapter from direct) | Legacy rekomendowana oferta | **YES** (Bid model) |
| **E** `Offer.offerPricePln` / `primaryRecommendation.offerPricePln` | **Offer Expert** via Chief | Expert rekomendowana oferta | **YES** (Offer Expert model) |

They are **three different numbers** from **two cost stacks + two offer models**. S3 parity helper may classify MATCH / EXPECTED_DELTA / UNEXPECTED_DELTA — dual engines are **EXPECTED** under S8 HOLD (no Bid removal).

---

## D. SSOT matrix

| Concern | SSOT (AS-IS) | NOT SSOT |
|---------|--------------|----------|
| Module / Dual Outcome „Expert-effective” | `isTenderExpertEffective` ← `adminCanViewTendersTab` | `expertAiDecydentEnabled` |
| Chief **run** allowed | `isChiefOrchestratorSessionEnabled` ← Enablement/LS | Stack helper alone |
| DW **session prop** | `isChiefOrchestratorSessionEnabled` in DetailPage | Host stack alone |
| DW Host mount kill | `isDecisionWorkspaceStackEnabled(M)` | — |
| Authoritative Hub/TRE PLN | `resolveAuthoritativeOfferPln` + AXIS-M | Enablement flag |
| Economic Offer Expert PLN | dossier after Chief | AI Cost directPln |
| Legacy Bid PLN | Bid Proposal / ownerFinance | Offer Expert |
| Decydent decision | `kw-decision-persist-v1` then S6 → `kw-tender-decisions` | TRE recommendation |

---

## E. Consumer matrix

| MECHANISM | OWNER | INPUT | OUTPUT | FLAG | STORAGE | CONSUMERS | SSOT? | LEGACY/NEW | RISK |
|-----------|-------|-------|--------|------|---------|-----------|-------|------------|------|
| `tendersTabForStaffEnabled` | S1 Module | AppSettings | staff sees Przetargi | AppSettings | `kw-app-settings` | `adminCanViewTendersTab` | Module SSOT | S1 | Low |
| `isTenderExpertEffective` | S2 | role+settings | boolean M | derived | none | Hub, PrimaryAction, DecisionView, Strategy, TRE, PLN authority, stacks | **M SSOT** | S2 | **P0 split** |
| `expertAiDecydentEnabled` | Enablement | Moduły toggle | boolean D | AppSettings | `kw-app-settings` | Session/Decision flags | **D master** | Enablement | Default OFF |
| `isChiefOrchestratorSessionEnabled` | Session flag | LS+D | boolean | LS+AppSettings | `kw-chief-orchestrator-session` | Hook inner, DetailPage DW prop, Decision coupling | D Session | Wire+Enablement | Must for run |
| `isChiefSessionStackEnabled` | S2 stack | M+LS | mount Session | LS+M | same LS key | `TenderDetailPage` | Outer only | S2 | **Shell without run** |
| `isDecisionWorkspaceEnabled` | DW flag | Session+LS+D | boolean | LS+AppSettings | `kw-decision-workspace` | legacy path when M OFF | D Decision | Wire+Enablement | Coupled |
| `isDecisionWorkspaceStackEnabled` | S2 stack | M+LS | Host flagEnabled | LS+M | same | `DecisionWorkspaceHost` | Outer | S2 | Host without session |
| `resolveAuthoritativeOfferPln` | S3 | M+offer+bid | primaryPln/source | uses M | none | Hub, TRE Outcome | PLN present | S3 | **NO PRIMARY when M ON & offer null** |
| Offer Expert `offerPricePln` | Offer Expert | Cost handoff | number | needs Chief | dossier RAM | DW Rec, Hub via session | Expert offer | Experts-P0 | Needs D run |
| Bid `recommendedBidPln` | Bid | AI Cost/direct | number | module | pipeline/Bid | Hub secondary, TRE Offer Run, authority when M OFF | Bid offer | legacy | Dual engine |
| `OfferBoq.directPln` | AI Cost | lines/pricing | number | — | OfferBoq doc | Bid adapter input | Direct cost | AI Cost | Not offer PLN |
| `useTenderOfferRun` | TRE-01 | pipeline bidProposal | Offer Run VM | TRE enable paths | events/audit | Outcome screen | Offer Run | TRE · **PROTECTED M** | TRACE WIP; not Enablement |

---

## F. Concrete mismatch scenarios

### Scenario F1 — Default Super Admin (PRODUCTION DEFAULT)

| Axis | Value |
|------|-------|
| AXIS-M `isTenderExpertEffective(super_admin)` | **true** (always) |
| AXIS-D `expertAiDecydentEnabled` | **false** (default) |
| Session flag C | **false** |
| Session stack | **true** (M⇒stack ON) |
| Chief `runChiefOrchestrator` | **NO** (inner gate) |
| `chiefSessionForDecision` | **null** |
| `offerPricePln` into Hub | **null** |
| `recommendedBidPln` | may be **present** (AI Cost→Bid) |
| `resolveAuthoritativeOfferPln` | `expertEffective:true` → **primaryPln=null**, `source:"none"` |
| Hub headline | **NO PRIMARY** (Bid **not** shown as primary) |
| Dual Outcome cues | `data-s2-dw-primary="1"` etc. may still assert Expert ON |
| DW Persist Decydent | **OFF** |

**This is the default production posture for Dawid / Super Admin until Moduły Expert AI is toggled ON.**

### Scenario F2 — Super Admin + Enablement ON

| Axis | Value |
|------|-------|
| M | true |
| D | true |
| Chief run | **YES** (if BOQ+pricing ready) |
| offerPricePln | from Offer Expert |
| Authority | primary = Offer · Bid secondary |
| DW Persist | **ON** |

**Axes aligned for SA.**

### Scenario F3 — Staff admin, `tendersTabForStaffEnabled=true`, Enablement OFF

Same split as F1 (M=true, D=false) if they can open Przetargi.

### Scenario F4 — Staff, tenders tab OFF

M=false → no Przetargi access → Offer PLN / Expert UI N/A for that role.

### Scenario F5 — Enablement ON but LS Session `"0"` kill

D Session forced OFF → no Chief run · Decision coupling OFF · even if Moduły shows ON (AppSettings still true but LS kills runtime).

### Scenario F6 — M OFF path (theoretical non-SA without tab) + Enablement ON via LS `"1"`

Stack falls through to legacy Session flag → run possible if Session LS/AppSettings ON; Offer authority uses Bid primary (M false). Rare for SA.

---

## G. Severity

| ID | Finding | Severity |
|----|---------|----------|
| P0-1 | Two independent ON axes (M vs D) | **P0 architectural split** |
| P0-2 | Default SA: M ON + D OFF → Expert UI/policy without Chief + **NO PRIMARY** despite Bid | **P0 runtime mismatch** |
| P0-3 | S3 Offer PLN authority ignores Enablement | **P0** (by design of S3, harmful after Enablement) |
| P1 | Naming „Expert AI” conflates Moduły Decydent with Module Expert-effective | P1 UX |
| P1 | Docs (`EXPERT-AI-ARCHITECTURE`) may still describe single Expert-effective | P1 docs |
| P2 | Dual PLN engines Offer vs Bid (EXPECTED under S8 HOLD) | P2 / accepted residual |
| — | Q12 Persist identity | **NOT this P0** (fixed / verified) |

---

## H. Evidence / file + symbol references

| Claim | Evidence |
|-------|----------|
| M = module tab, not Enablement | `isTenderExpertEffective` → `adminCanViewTendersTab` · `tender-expert-effective.ts` L49–56 · `admin-auth.ts` L852–859 |
| SA always M ON | `role === "super_admin" return true` |
| D Session = Enablement | `chief-session/flag.ts` L40–45 |
| D Decision coupled to Session | `decision-workspace-ui/flag.ts` L43–50 |
| Stack ON when M ON | `isChiefSessionStackEnabled` L84–90 |
| Inner run requires D Session | `useChiefOrchestratorSession.ts` L79–82 |
| DW session prop requires D Session | `TenderDetailPage.tsx` L255–261 |
| Host uses **stack** not pure Decision flag | `DecisionWorkspaceHost.tsx` `isDecisionWorkspaceStackEnabled(expertEffective)` |
| Offer PLN authority uses M | `tender-offer-pln-authority.ts` L123–158, L166–169 |
| Hub feeds offer only from DW session dossier | `TenderWorkflowHubPanel.tsx` L97–105 |
| Offer price computed in Offer Expert | `offer-expert/compute-offer.ts` L28 · `analyze.ts` |
| directPln from AI Cost pricing | `tender-offer-boq-pricing-engine.ts` ~L900 |
| Bid from adapter/direct | `tender-offer-boq-bid-adapter.ts` L99–194 |
| Offer Run ≠ Offer Expert | `useTenderOfferRun.ts` + `tender-offer-run.ts` (bidProposal) |
| Enablement default false | `app-settings.ts` `expertAiDecydentEnabled: false` |

---

## I. What is NOT a problem

| Item | Why |
|------|-----|
| Persist triple matching / Q12 | Verified PASS; separate concern |
| Existence of Bid + Offer dual engines | TM-01 S3 EXPECTED_DELTA · S8 HOLD REMOVE forbids Bid retirement |
| AI Cost heuristics ≠ LLM | Expected; not this P0 |
| `useTenderOfferRun` local TRACE WIP | Protected OUT; not Enablement SSOT |
| S2 harness 44/45 DetailPage raw Session call | Pre-existing tip FAIL; related symptom of dual gates, but harness OUT of this audit fix scope |
| Cloud Persist absence | Residual, not dual-flag root cause |

---

## J. What remains unresolved (no solution proposed)

| Open | Note |
|------|------|
| Whether AXIS-M and AXIS-D **should** be unified | OUT of this audit (no PLAN) |
| Whether S3 authority should key on AXIS-D / Session dossier presence | OUT |
| Whether Hub should fall back to Bid when M ON & offer null | Currently **forbidden** by S3 DF (NO PRIMARY) |
| Owner product intent: „Expert AI ON” label vs Module Expert-effective | Needs Owner interpretation |
| Staff-facing copy that says Expert without naming which axis | UX residual |

---

## Answers to explicit questions (§6–§10)

### 6. What does „Expert AI ON” mean today?

**d) something else — ambiguous; depends which control you mean.**

| If user means… | Actually means |
|----------------|----------------|
| Moduły **Expert AI · Przebieg i Decydent** | AXIS-D → Session+Decision run + Persist Decydent (**b** partial: full Expert **pipeline when ready**, not automatic Offer PLN headline without dossier) |
| TM-01 „Expert-effective” / Dual Outcome | AXIS-M → module access + PLN authority + stack chrome (**not** Decydent Persist) |
| Combined „full pipeline + Offer PLN“ (**c**) | Only when **both** M and D are ON **and** Chief produced `offerPricePln` |

It is **not** (a) „only Decydent UI“ alone — AXIS-D also gates Chief Session run.

### 7–8. Can AppSettings ON and Expert-effective differ?

**YES.**

- AppSettings Enablement OFF + Expert-effective ON → **F1** (default SA).  
- AppSettings Enablement ON + Expert-effective OFF → staff without tenders tab (no UI); or LS edge cases.

### 9. What is `Offer.offerPricePln`?

**Result of Expert pipeline (Offer Expert)** after Chief Cost→Offer — **not** AI Cost direct, **not** Offer Run Bid VM, **not** manual (unless later user edits outside this graph — not observed as Hub SSOT).

### 10. Relation

```text
OfferBoq.directPln     = AI Cost direct (input to Bid)
Bid.recommendedBidPln  = Bid offer model (legacy primary when M OFF)
Offer.offerPricePln    = Offer Expert offer model (primary when M ON AND dossier present)
```

Authority picks **one presentation**; it does not merge formulas.

---

## P0 VERDICT

```text
P0 VERDICT = CONFIRMED ARCHITECTURAL SPLIT
             + CONFIRMED RUNTIME MISMATCH

NOT = NO ISSUE
NOT = BLOCKED / INSUFFICIENT EVIDENCE
```

**STOP.** No PLAN · no IMPLEMENT · no COMMIT · no PUSH.
