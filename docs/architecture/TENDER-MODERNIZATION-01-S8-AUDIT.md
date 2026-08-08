# TENDER-MODERNIZATION-01 / S8 — AUDIT (Hard REMOVE / Bid retirement)

> **STATUS:** **AUDIT COMPLETE** · **PLAN COMPLETE** · **DF COMPLETE** · **IMPLEMENT COMPLETE (HOLD)** · **WAITING FOR OWNER GO → COMMIT**  
> **ID:** TENDER-MODERNIZATION-01-S8-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S8 — Hard REMOVE / Bid retirement**  
> **STAGE:** **AUDIT** (closed by PLAN + DF · OPTION A HOLD) · ZERO IMPLEMENT  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** · feature **`617f0cb5`** · docs tip **`df395eed`** · live `version.json` tip **`df395ee`** (docs tip on CDN)  
> **Prior CLOSED:** S0–S7 · **PRODUCTION VERIFIED**  
> **PLAN:** [`TENDER-MODERNIZATION-01-S8-PLAN.md`](TENDER-MODERNIZATION-01-S8-PLAN.md) (**COMPLETE** · rekomendacja **OPTION A HOLD**)  
> **DF:** [`TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE.md) (**COMPLETE** · **HOLD REMOVE**)  
> **DF SSOT epic:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) § S8 · §9 L8 G1–G8 · AC-S8-1…4  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md) § S8  
> **Prior S7:** [`S7-CLOSEOUT`](TENDER-MODERNIZATION-01-S7-CLOSEOUT.md) · Hub-first · recovery CTA DetailPage  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — lokalne **M** (TRACE) · **NO TOUCH / NO STAGE / NO DELETE**

```text
════════════════════════════════════════════════════════
S8 AUDIT — Hard REMOVE readiness

VERDICT (evidence):
  ZERO file-level orphans ready for hard REMOVE under L8.
  Bid / OfferBoq / Outcome recovery / Offer Run / DecisionView /
  Strategy legacy store / S6 bridge = LIVE consumers ≫ 0.

  S3-D Bid retirement = BLOCKED (Expert OFF Bid primary + COST_PIPELINE_01 ON).
  DecisionView DELETE = BLOCKED (mount + Expert OFF write + harness).
  kw-tender-decisions DELETE = BLOCKED (Strategy SSOT readers).
  TRE Outcome engine DELETE = BLOCKED (S7 recovery + Expert OFF R0).

  ONLY micro-candidates = symbol-level dead exports
    (digestOfferRunSnapshot · emitOfferRunDegradedAudit ·
     resetOfferRunIdMemoryForTests · removeOwnerDecision unused UI)
    → still REQUIRE L8 + Owner GO · NOT auto-REMOVE.

SEKWENCJA OBOWIĄZUJE:
  KEEP → PARITY → MIGRATION → DEPRECATION → CONSUMER AUDIT → REMOVE
  (dziś = CONSUMER AUDIT; REMOVE = tylko po PLAN + DF + L8 + Owner GO)

STOP — WAIT OWNER GO → COMMIT (docs allowlist HOLD)
════════════════════════════════════════════════════════
```

---

## 0. Scope / method

| | |
|--|--|
| **Mode** | Read-only grep + source read · **zero** code change |
| **Sources** | `src/` · TM-01 harnesses S2–S7 · TRE-01/02 scripts · DF/MASTER S8 · S7 CLOSEOUT |
| **NON-goals** | PLAN · IMPLEMENT · delete · tip update · S3-D · store migration |
| **L8 reminder** | G1–G8 per mikro-item · allowlist-only · never force-push |

---

## A. S8 inventory

### A.1 DF candidates (aspirational — not auto)

| DF candidate | Post-S7 evidence |
|--------------|------------------|
| Deprecated Intelligence UI | InsightsCompact still **live** Hub recovery (`TenderWorkflowHubPanel`) · Intelligence context **live** |
| DecisionView po S5 | Still **mounted** Decyzja overview + Expert OFF write |
| Legacy store `kw-tender-decisions` po S6 | Still **Strategy SSOT** · many readers · Expert OFF writers |
| Obsolete flags | `kw-tre-01-slice-a` **KEEP** (S7 R0) · `COST_PIPELINE_01` **KEEP** (default ON) |
| Bid retire (po S3-D) | **S3-D not done** · Bid consumers ≫ 0 |

### A.2 TRE / Outcome / Offer Run surfaces (live)

| Surface | Path | Post-S7 role |
|---------|------|----------------|
| Outcome UI | `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | Recovery (Expert ON CTA) · Expert OFF LS=`1` R0 |
| Offer Run hook | `src/app/hooks/useTenderOfferRun.ts` | Sole UI bridge · **LOCAL WIP M** |
| Offer Run model | `src/lib/tender-offer-run.ts` | Snapshot + LS `kw-tre-01-offer-run-id:*` |
| Foundation | `src/lib/tender-offer-run-foundation.ts` | Bootstrap / audits / events |
| Recommendation VM | `src/lib/tender-recommendation-result.ts` | Build + `formatRecommendedOfferPln` |
| Flag | `src/lib/tenders-v4-config.ts` | `TRE_01_SLICE_A_DEFAULT=false` · LS R0 |
| Host / recovery | `src/app/TenderDetailPage.tsx` | `showTre01Outcome` · `data-s7-*` |

### A.3 Non-TRE “Outcome” (do not conflate)

| Surface | Distinguisher |
|---------|----------------|
| `TenderAutonomousGate` / `TenderAutonomousOutcomeScreen` | NG-10 · Hub-first path · **≠** TRE |
| DW Recommendation / Chief Offer Rec | Decision Workspace / Chief · **≠** TRE |

### A.4 Bid / OfferBoq (domain)

| Family | Evidence |
|--------|----------|
| `tender-offer-boq*.ts` (12+) | Live pricing / mapping / CI / adapter |
| `tenders-bid-calculator.ts` | L2 Bid |
| `COST_PIPELINE_01` default **true** | `useTenderPricingAuto` |
| UI | `TenderBidProposalPanel` · OfferBoq Kosztorys · Bid PDF |
| Authority | Expert OFF ⇒ Bid primary PLN (`tender-offer-pln-authority`) |

### A.5 Decision stack

| Surface | Path |
|---------|------|
| DecisionView | `TenderDecisionView.tsx` |
| PrimaryAction | `TenderWorkflowPrimaryAction.tsx` |
| DW Host + S6 bridge | `DecisionWorkspaceHost` · `decision-persist-legacy-bridge.ts` |
| Owner store | `tenders-strategy-owner-decisions.ts` · `useOwnerTenderDecisions` |
| Persist | `decision-persist/*` · `kw-decision-persist-v1` |

---

## B. Consumer graph (condensed)

```text
                    ┌─────────────────────────────────────┐
                    │         TenderDetailPage            │
                    │  Hub-first (S7) · recovery CTA      │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
  useTenderOfferRun        TenderAutonomousGate     DetailPanel / Hub
  (flag OR recovery)              │                 │
           │                      ▼                 ├─ DecisionWorkspaceHost
           ▼               AutonomousOutcome        │    recordDecision → Persist
  tender-offer-run*                                 │    map → setOwnerDecision
  recommendation-result                             ├─ TenderDecisionView
           │                                        ├─ Bid / OfferBoq panels
           ▼                                        └─ PrimaryAction (Expert OFF write)
  TenderRecommendationOutcomeView
           │
           └─ formatRecommendedOfferPln ◄── HubPanel (format only)

  kw-decision-persist-v1 ◄── Host only (write/hydrate)
           │ Persist SUCCESS + scoringBundle
           ▼
  mapPersistActionToLegacyOwnerDecision (pure)
           ▼
  kw-tender-decisions ◄── Host / DecisionView / PrimaryAction / BestOpportunity (Expert OFF)
           ▼
  Strategy snapshot · Action Center · Forecast · Alerts · List queues · ShortcutPanel
```

**Explore evidence:** [TRE/OfferRun map](c9c0b289-2d95-4484-b9c4-a6b1e9715cc6) · [Bid/Decision map](9c99ff77-c409-4701-9f08-a91279af5236)

---

## C. Writer / reader map

### C.1 `kw-tender-decisions`

| Role | Actors |
|------|--------|
| **Writers** | `DecisionWorkspaceHost` (S6 after Persist OK) · `TenderDecisionView` (Expert OFF) · `TenderWorkflowPrimaryAction` (Expert OFF GO) · Strategy `BestOpportunityCard` (Expert OFF) |
| **Readers** | Strategy snapshot · Action Center · Forecast 90d · Alerts · list UX queues · ShortcutPanel · DetailPanel / Przetarg command · intelligence next-action |
| **Dead export** | `removeOwnerDecision` — **no UI caller** (API-only) |

### C.2 `kw-decision-persist-v1`

| Role | Actors |
|------|--------|
| **Writers** | `DecisionWorkspaceHost` **only** (`recordDecision`) |
| **Readers** | Host `hydrateDecision` · `listDecisionHistory` = **API + harness only** (no history UI) |
| **Bridge** | Pure map in `decision-persist-legacy-bridge.ts` · **zero** Persist API touch of legacy key |

Neither key is cloud-synced (`cloud-sync` OUT).

---

## D. Runtime paths (post-S7)

| Path | When |
|------|------|
| **Hub-first tip** | Default: `TRE_01_SLICE_A_DEFAULT=false` · Expert ON without recovery · Expert OFF without LS=`1` |
| **TRE Outcome early-return** | Expert ON + `tre01RecoveryOutcome` **OR** Expert OFF + `tre01SliceA` · tab `przetarg` · !forceWorkspace |
| **Offer Run enabled** | `(tre01SliceA \|\| tre01RecoveryOutcome) && item` |
| **Autonomous theater** | Hub-first workspace under `TenderAutonomousGate` (not TRE) |
| **DW Persist-first** | Hub and/or Decyzja overview · Expert ON primary |
| **Legacy owner write** | Expert OFF: DecisionView / PrimaryAction / BestOpportunity |

---

## E. Feature / config flag dependencies

| Flag / key | Default | Consumers | S8 class |
|------------|---------|-----------|----------|
| `kw-tre-01-slice-a` / `isTre01SliceAEnabled` | **false** | DetailPage · TRE harnesses | **KEEP** (R0 Expert OFF) |
| `kw-tre-01-offer-run-id:*` | — | offer-run model | **KEEP** while Offer Run live |
| `kw-cost-pipeline-01` | **true** | pricing auto · Bid path | **KEEP** |
| `kw-decision-persist-v1` | — | Host Persist | **KEEP** |
| `kw-tender-decisions` | — | Strategy SSOT | **MIGRATE** (not REMOVE) |
| Session / DW / Expert stack flags | existing | S2+ | **KEEP** · 8 LOCK |

**FORBIDDEN in S8 without DF amend:** new master flag · rename LS keys · flip COST_PIPELINE OFF as “delete Bid”.

---

## F. Recovery dependencies (S7 contract — LOCK)

| Recovery | Dependency | REMOVE impact |
|----------|------------|---------------|
| DetailPage `data-s7-tre-recovery-cta` | Outcome View + Offer Run hook + engines | Breaks Expert ON recovery |
| Expert OFF LS=`1` | `isTre01SliceAEnabled` + early-return | Breaks R0 power-user path |
| Outcome → Hub (`onOpenHub`) | `tre01ForceWorkspace` / recovery clear | UX escape |
| Hub Insights recovery (S4) | `TenderWorkspaceV2InsightsCompact` | Separate from TRE · **KEEP** |
| S6 Persist FAIL | ZERO legacy mirror | Strategy stale if bridge deleted |

**S7 recovery MUST remain until explicit Owner GO to retire recovery itself (out of default S8 aspirational Bid list).**

---

## G. Test / doc dependencies

| Suite | Depends on | Block REMOVE of |
|-------|------------|-----------------|
| S7 hub-first (30) | DetailPage markers · Outcome file · Offer Run exists · DEFAULT false | Outcome / hook / flag |
| S6 bridge (28) | Host Persist-first · map · scoringBundle · DecisionView KEEP | Bridge / Host / DecisionView mount |
| S5 (27) | Decyzja overview Host + DecisionView | DecisionView |
| S4 (37) | Hub hierarchy · Insights recovery · PLN | Hub Insights · authority |
| S2 (45) | Dual Outcome · Persist no legacy key · demote note | DecisionView demote · Persist contract |
| TRE-01 / TRE-02 | offer-run + DEFAULT/LS | Offer Run / flag |
| Cost pipeline / S3 parity | Bid vs Offer · OfferBoq | Bid / OfferBoq |
| Docs | S7 CLOSEOUT · DF L8 · MASTER S8 | — (docs only) |

---

## H. Migration / parity requirements (before any REMOVE)

| Target | Required before REMOVE |
|--------|------------------------|
| Bid authoritative | **S3-D** (deprecate Bid primary) + Expert OFF path parity on Offer · Owner GO |
| `kw-tender-decisions` | Strategy readers migrate to Persist **or** derived projection · parity harness · then zero writers |
| DecisionView | Expert OFF write moved fully to DW · system verdict surface defined · harness rewrite |
| TRE Outcome / Offer Run | Retire S7 recovery CTA + Expert OFF R0 **or** replace with Hub PLN-only · re-grep |
| OfferBoq | **Not** in S8 default · 8 LOCK #7 · only if Bid retire cascade proven |

**Parity rule (DF):** KEEP → PARITY → MIGRATION → DEPRECATION → CONSUMER AUDIT → REMOVE.

---

## I. Candidate removals

### I.1 File-level REMOVE CANDIDATE — **NONE**

Every inventoried file has ≥1 live tip consumer (UI and/or required harness contract).

### I.2 Symbol-level micro-candidates (optional future allowlist — **not** proven L8-complete)

| Symbol | File | Proof of no runtime consumer |
|--------|------|------------------------------|
| `digestOfferRunSnapshot` | `tender-offer-run-foundation.ts` | Export only · not called by bootstrap/hook |
| `emitOfferRunDegradedAudit` | `tender-offer-run-foundation.ts` | Export only · hook uses Event path |
| `resetOfferRunIdMemoryForTests` | `tender-offer-run.ts` | Export only · no test import |
| `removeOwnerDecision` | `tenders-strategy-owner-decisions.ts` | Export only · no UI caller |

These are **dead exports**, not orphan modules. Removing them is cosmetic cleanup — still needs Owner GO + allowlist + tests · **does not** advance Bid retirement / DecisionView delete / store delete.

### I.3 Explicit NOT REMOVE CANDIDATE (blocked)

| Item | Why blocked |
|------|-------------|
| `TenderRecommendationOutcomeView` | S7 recovery + R0 + harness |
| `useTenderOfferRun.ts` | Sole consumer · **PROTECTED WIP** |
| `tender-offer-run*` / foundation | Live via hook + cost tests |
| Bid calculator / OfferBoq family | COST_PIPELINE + Expert OFF PLN + UI + PDF + Chief RO |
| `TenderDecisionView` | Mounted · Expert OFF write · S5/S6 harness |
| `kw-tender-decisions` | Strategy SSOT readers |
| S6 bridge / Host Persist-first | Strategy lejek after Expert ON Approve |
| Hub InsightsCompact | S4 recovery live |
| Autonomous Gate/Outcome | Hub-first NG-10 · ≠ TRE orphan |

---

## J. Proof per candidate (summary)

| Candidate | Live consumers (proof) | REMOVE? |
|-----------|------------------------|---------|
| Outcome UI | `TenderDetailPage` early-return · S7/S2 harness | **NO** |
| Offer Run hook | `TenderDetailPage` only · WIP M | **NO** (+ protected) |
| Offer Run lib | hook + TRE/cost scripts | **NO** |
| Rec. result / format | Outcome + **HubPanel** | **NO** |
| TRE flag | DetailPage + TRE harness | **NO** |
| Bid / OfferBoq | pricing runtime · panels · PDF · authority · 50+ scripts | **NO** |
| DecisionView | DetailPanel overview · Expert OFF · harness | **NO** |
| PrimaryAction write | Expert OFF CTA | **NO** (path DEPRECATE when Expert ON only) |
| Legacy store | Strategy / lists / alerts / forecast | **NO** |
| Persist store | Host write/hydrate | **NO** |
| Bridge map | Host after Persist | **NO** |
| Dead exports (§I.2) | zero call sites | **MAYBE micro** after GO |

---

## K. Risks

| Premature REMOVE | Blast radius |
|------------------|--------------|
| TRE Outcome / Offer Run | Breaks Expert ON recovery · Expert OFF R0 · S7 AC |
| Bid / OfferBoq | Breaks Outcome PLN · Kosztorys · PDF · Expert OFF authority · Chief/Execution RO |
| DecisionView file | Breaks Decyzja fallback · Expert OFF owner UX · S5/S6 |
| `kw-tender-decisions` | Empty Action Center / wrong queues / forecast GO |
| S6 bridge only | Expert ON Persist OK · Strategy stale (pre-S6 regression) |
| Touch `useTenderOfferRun` WIP | Contaminates tip with TRACE · violates S7/S8 WIP rule |

---

## L. Rollback

| Layer | Action |
|-------|--------|
| Any future mikro-REMOVE commit | `git revert <sha>` · **never** force-push |
| TRE flag R0 | LS `kw-tre-01-slice-a=1` (Expert OFF Outcome) · tip DEFAULT stays false |
| COST_PIPELINE | LS `kw-cost-pipeline-01=0` (catalog Bid) — **not** a delete |
| Persist / legacy | No down-migration · localStorage rows leave |

---

## M. Proposed allowlist (PLAN hint only — **not** authorized)

**Default S8 PLAN recommendation:** **empty REMOVE allowlist** until Owner picks a micro-item.

| If Owner wants minimal cleanup | Possible micro-allowlist |
|--------------------------------|--------------------------|
| Dead export prune | Only §I.2 symbols · **no** file delete · harness update if needed |
| **OUT of first PLAN** | Bid · OfferBoq · Outcome · Offer Run files · DecisionView · stores · S6 · Hub · Autonomous |

---

## N. Explicit OUT (AUDIT LOCK)

| OUT |
|-----|
| Hard delete TRE / Offer Run / Bid / OfferBoq engines |
| DecisionView delete |
| `kw-tender-decisions` delete |
| S6 bridge rewrite / Persist API change |
| S4/S5 UX rewrite |
| S3-D / Bid retirement without separate GO |
| New scoring · third store · third engine · cloud |
| `useTenderOfferRun.ts` modify / stage / delete |
| Blind big-bang cleanup · unrelated refactor |
| Auto-start PLAN / IMPLEMENT |

---

## O. AC-S8 candidates (from DF + this AUDIT)

| AC | Candidate assertion |
|----|---------------------|
| **AC-S8-1** | Per-item zero tip consumers (re-grep `src/` + required harness) |
| **AC-S8-2** | Osobny Owner GO REMOVE for that item |
| **AC-S8-3** | Diff ⊆ jawny mikro-allowlist |
| **AC-S8-4** | PV PASS after remove |
| **AC-S8-5** *(proposed)* | S2=45 · S4=37 · S5=27 · S6=28 · S7=30 still PASS |
| **AC-S8-6** *(proposed)* | Bid/OfferBoq/DecisionView/stores untouched unless item explicitly allowlisted |
| **AC-S8-7** *(proposed)* | `useTenderOfferRun.ts` not in tip diff |
| **AC-S8-8** *(proposed)* | S7 recovery markers still present **unless** recovery retirement is the allowlisted item |

---

## P. Recommendation

| | |
|--|--|
| **Verdict** | **NO hard REMOVE is READY** under L8 for DF aspirational list (Intelligence / DecisionView / legacy store / Bid). |
| **S3-D / Bid retire** | **BLOCKED** — live Expert OFF Bid primary + COST_PIPELINE_01 ON + UI/PDF/tests. |
| **Safe next** | **DONE:** PLAN + DF + IMPLEMENT HOLD. Next = Owner GO → **COMMIT** (docs AUDIT/PLAN/DF/IMPLEMENT) · optional PV/CLOSEOUT. Residual MIGRATE/S3-D = osobny track. |
| **Do not** | Assume any file qualifies for REMOVE · invent cleanup · manufacture feature commit |

```text
STOP — WAIT OWNER GO → COMMIT (docs allowlist HOLD)
```

---

## Appendix — Classification matrix

| Item | Class |
|------|-------|
| TRE Outcome UI | **DEPRECATE** (primary done in S7) · **KEEP** recovery |
| Offer Run hook / libs | **KEEP** · S8 REMOVE only after recovery retirement |
| TRE flag LS | **KEEP** |
| Bid / OfferBoq | **KEEP** · Bid retire **BLOCKED** |
| DecisionView | **DEPRECATE** write @ Expert ON · **KEEP** file |
| PrimaryAction / BestOpportunity write | **DEPRECATE** @ Expert ON · **KEEP** @ Expert OFF |
| `kw-tender-decisions` | **MIGRATE** (long) · **KEEP** now |
| Persist + S6 bridge | **KEEP** |
| Hub Insights recovery | **KEEP** |
| Autonomous NG-10 | **KEEP** (≠ TRE) |
| Dead exports §I.2 | **REMOVE CANDIDATE (symbol)** · low value |
| `useTenderOfferRun.ts` WIP | **PROTECTED** · NO TOUCH |

---

## Protected WIP check (this audit)

| Check | Result |
|-------|--------|
| `git status` `useTenderOfferRun.ts` | **M** (local TRACE) |
| Modified by this AUDIT? | **NO** |
| Staged? | **NO** |
