# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S8 (HOLD REMOVE)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **IMPLEMENT COMPLETE (HOLD)** · **WAITING FOR OWNER GO → COMMIT**  
> **ID:** TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S8 — Hard REMOVE / Bid retirement**  
> **TRYB:** DESIGN FREEZE (LOCKED) · **OPTION A — HOLD REMOVE**  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** · feature **`617f0cb5`** · docs tip **`df395eed`** · **PRODUCTION VERIFIED** · GREEN  
> **Owner GO DF:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S8-AUDIT.md`](TENDER-MODERNIZATION-01-S8-AUDIT.md) (**COMPLETE**)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S8-PLAN.md`](TENDER-MODERNIZATION-01-S8-PLAN.md) (**COMPLETE** · rekomendacja A)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **Decision arch:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) § S8 · L8 G1–G8 · AC-S8-1…4  
> **Prior CLOSED:** S0 · S1 · S2 · S3 · S4 · S5 · S6 · S7  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **NIGDY** edycja / stage / delete w S8 tip

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S8 — DESIGN FREEZE

LOCKED DECISION:
  OPTION A — HOLD REMOVE

LOCKED:
  NO hard REMOVE in S8
  NO file deletion
  NO DecisionView / TRE / Offer Run / Bid / OfferBoq delete
  NO kw-tender-decisions delete
  NO S6 bridge / Strategy rewrite / scoring / third store / cloud
  NO useTenderOfferRun.ts changes
  NO micro dead-export cleanup (4 symbols KEEP)

S8 = HOLD / ARCHITECTURAL CLOSEOUT SLICE
     ≠ forced cleanup slice

IMPLEMENT MAY LEGITIMATELY BE:
  ZERO functional code changes
  Docs-only tip (IMPLEMENT / CLOSEOUT / MASTER / 09)
  Do NOT invent code to force a feature commit

STATUS: DESIGN FREEZE COMPLETE · IMPLEMENT COMPLETE (HOLD · ZERO code)
         WAIT OWNER GO → COMMIT (docs allowlist)
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S8-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S8-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED · OPTION A)
[DONE]  Owner GO IMPLEMENT S8 → ZERO functional code · IMPLEMENT.md
[NEXT]  Owner GO COMMIT (docs allowlist AUDIT/PLAN/DF/IMPLEMENT)
        → optional PV/CLOSEOUT/tip SSOT · NIE invent code
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend.  
Agent **nie** usuwa symboli/plików, **nie** startuje OPTION B bez DF amend, **nie** rusza S6/Strategy/Bid/TRE, **nie** edytuje `useTenderOfferRun.ts`, **nie** auto-startuje IMPLEMENT.

### STOP conditions (pre-IMPLEMENT)

| STOP jeśli | Stan DF |
|------------|---------|
| Agent planuje delete plików / symboli | **STOP** — OUT S8 HOLD |
| Agent planuje Bid / DecisionView / store REMOVE | **STOP** — BLOCKED |
| Agent „wymyśla” cleanup żeby mieć feature commit | **STOP** — FORBIDDEN |
| Potrzeba edycji `useTenderOfferRun.ts` | **STOP** — PROTECTED |
| Potrzeba S6 / scoring / Strategy rewrite | **STOP** — OUT |

**STOP:** nie wymagany dla docs-only IMPLEMENT.

---

## A. Exact S8 HOLD semantics (LOCKED)

| | LOCKED |
|--|--------|
| **Definition** | S8 **nie** wykonuje hard REMOVE ani mikro-delete. Slice zamyka etap „consumer audit → świadomy HOLD” w roadmapie TM-01. |
| **Product tip** | Feature tip **`617f0cb5`** (S7) **pozostaje** tipem funkcjonalnym Przetargów. |
| **Code tip** | **ZERO** zmian funkcjonalnych `src/` w S8. |
| **Docs tip** | Dozwolony osobny tip docs (IMPLEMENT/CLOSEOUT/MASTER/09) po Owner GO IMPLEMENT. |
| **OPTION B** | **NOT IN SCOPE** tego DF · wymaga **DF amend** + osobnego Owner GO. |
| **OPTION C** | **OUT** dla 4 symboli · szerszy MIGRATE = osobny track Owner GO → AUDIT. |

```text
HOLD REMOVE =
  audited surfaces remain in tip
  + removal deferred until absolute L8 proof + Owner GO
  + S8 slice may CLOSE as architectural HOLD
```

---

## B. Explicit no-delete inventory (LOCKED)

| Surface | Path / key | S8 action |
|---------|------------|-----------|
| DecisionView | `TenderDecisionView.tsx` | **KEEP** · NO DELETE |
| TRE Outcome UI | `TenderRecommendationOutcomeView.tsx` | **KEEP** (S7 recovery) |
| Offer Run hook | `useTenderOfferRun.ts` | **KEEP** · **PROTECTED WIP** |
| Offer Run model | `tender-offer-run.ts` | **KEEP** |
| Offer Run foundation | `tender-offer-run-foundation.ts` | **KEEP** (incl. 2 unused exports) |
| Recommendation VM | `tender-recommendation-result.ts` | **KEEP** |
| Bid domain | `tenders-bid-calculator.ts` + Bid UI/PDF | **KEEP** |
| OfferBoq family | `tender-offer-boq*.ts` + UI | **KEEP** |
| Legacy store | `kw-tender-decisions` | **KEEP** |
| Persist store | `kw-decision-persist-v1` | **KEEP** |
| S6 bridge | `decision-persist-legacy-bridge.ts` + Host | **KEEP** · NO TOUCH |
| Hub Insights recovery | `TenderWorkspaceV2InsightsCompact` | **KEEP** |
| Autonomous NG-10 | Gate / OutcomeScreen | **KEEP** |
| TRE flag | `kw-tre-01-slice-a` / DEFAULT false | **KEEP** |
| COST_PIPELINE_01 | default ON | **KEEP** |

**NO file deletion in S8. NO directory purge. NO blind cleanup.**

---

## C. Protected surfaces (LOCKED)

| Surface | Rule |
|---------|------|
| `src/app/hooks/useTenderOfferRun.ts` | **LOCAL M** · **NO TOUCH** · **NO STAGE** · **NO DELETE** · OUT tip |
| S6 Persist-first Host + bridge | **NO TOUCH** |
| S4 Hub hierarchy / S5 Decyzja overview | **NO TOUCH** |
| 8 LOCK BC (Expert/Chief/Session/Validation/Adapters/TF/OfferBoq/Bid calc) | **NO TOUCH** |
| Scoring SSOT (`scoreTender` / `scoringBundle`) | **NO TOUCH** |
| Cloud / third store / third engine / third PLN | **FORBIDDEN** |

---

## D. Why the four symbols remain (LOCKED)

| Symbol | File | Why KEEP in S8 |
|--------|------|----------------|
| `digestOfferRunSnapshot` | `tender-offer-run-foundation.ts` | Static zero call-site **≠** absolute L8 · FND API symmetry with live `digestRecommendationPayload` |
| `emitOfferRunDegradedAudit` | `tender-offer-run-foundation.ts` | Parallel to live `emitOfferRunDegradedEvent` · Audit half unused · hygiene only |
| `resetOfferRunIdMemoryForTests` | `tender-offer-run.ts` | Intentional test API · unused today · future harness toolkit |
| `removeOwnerDecision` | `tenders-strategy-owner-decisions.ts` | Public store CRUD completeness · no UI caller · not store REMOVE |

**Frozen decision:** evidence of static zero call-site exists (PLAN §1) · proof is **NOT** absolute L8 → **KEEP / HOLD** · **NO micro cleanup IMPLEMENTATION**.

---

## E. Evidence threshold for future removal (LOCKED)

Future REMOVE (poza tym DF) wymaga **wszystkich**:

| Threshold | |
|-----------|--|
| T1 | AUDIT REMOVE dedicated (fresh) **or** post-MIGRATE zero consumers |
| T2 | Re-grep `src/` + `scripts/` + tip bundle strings |
| T3 | Brak importów tip path + brak string/dynamic refs |
| T4 | Parity/bridge **nie** wymaga symbolu/pliku |
| T5 | Harness PASS (S2/S4/S5/S6/S7 + item-specific) |
| T6 | Owner QA + PV PASS |
| T7 | **Osobny Owner GO REMOVE** |
| T8 | Diff ⊆ jawny mikro-allowlist |

= Epic L8 G1–G8. **S8 HOLD nie spełnia T7 dla delete** — bo GO jest HOLD, nie REMOVE.

---

## F. What constitutes absolute L8 proof (LOCKED)

| Absolute proof = | NOT absolute |
|------------------|--------------|
| Zero tip consumers **and** zero harness contract **and** Owner GO REMOVE | Unused-export / lint alone |
| Re-grep after MIGRATE proves no Strategy/Offer Run/Bid dependency | Naming / intuition / „looks orphan” |
| PV confirms no behavior/UI regression | Static zero call-site **alone** (today’s 4 symbols) |
| Allowlist names exact symbols/files | Broad „cleanup pass” |

**For the 4 symbols today:** static zero call-site = **hygiene candidate** · **NOT** absolute L8 · **KEEP**.

---

## G. Future migration / removal remains OUT (LOCKED)

| Track | S8 DF |
|-------|-------|
| S3-D Bid authoritative deprecate | **OUT** · osobny Owner GO → AUDIT |
| Strategy migrate off `kw-tender-decisions` | **OUT** |
| DecisionView file REMOVE | **OUT** |
| TRE Outcome / Offer Run REMOVE | **OUT** (after S7 recovery retirement + L8) |
| OPTION B micro dead-export | **OUT** unless DF amend |
| Cloud Persist / third store | **OUT** |
| EPIC TM-01 CLOSE | **OUT** of S8 code · see §Q |

---

## H. AC-S8 (LOCKED — HOLD)

| AC | Exact assertion |
|----|-----------------|
| **AC-S8-1** | S8 tip **nie** usuwa plików z inventory §B |
| **AC-S8-2** | S8 tip **nie** usuwa 4 symboli §D |
| **AC-S8-3** | Diff funkcjonalny `src/` dla S8 = **EMPTY** (docs-only allowlist) |
| **AC-S8-4** | `useTenderOfferRun.ts` **nie** w tip diff |
| **AC-S8-5** | S6 bridge / DecisionView / Bid / OfferBoq / TRE Outcome files **present** |
| **AC-S8-6** | S7 markers still in DetailPage source (`data-s7-hub-first`, `data-s7-tre-recovery-cta`) |
| **AC-S8-7** | Regression: S2=45 · S4=37 · S5=27 · S6=28 · S7=30 · build PASS |
| **AC-S8-8** | Docs: S8 IMPLEMENT + CLOSEOUT record HOLD · tip docs point feature **`617f0cb5`** · S8 CLOSED as HOLD |
| **AC-S8-9** | No invented feature commit without code need |

Epic AC-S8-1…4 (zero consumers / Owner GO / allowlist / PV) interpretowane dla HOLD jako: **zero consumers of a REMOVE action** (nic nie usuwamy) · Owner GO = HOLD · allowlist = docs · PV = no UI delta.

---

## I–N. Regression (LOCKED)

| Gate | Required |
|------|----------|
| **I** S2 | **45 PASS** |
| **J** S4 | **37 PASS** |
| **K** S5 | **27 PASS** |
| **L** S6 | **28 PASS** |
| **M** S7 | **30 PASS** |
| **N** Build | **PASS** |

Re-run at IMPLEMENT/CLOSEOUT even if ZERO code change (sanity).

---

## O. OV-S8 (LOCKED — HOLD)

| OV | Check | Expect |
|----|-------|--------|
| **OV-S8-1** | Prod tip feature | Still S7 Hub-first behavior (`617f0cb*` or docs tip on CDN) |
| **OV-S8-2** | Expert ON Hub-first | No Outcome auto |
| **OV-S8-3** | Recovery CTA | Still present / works |
| **OV-S8-4** | DecisionView / Strategy / Bid | Unchanged |
| **OV-S8-5** | Owner confirms | S8 = HOLD · no forced cleanup |

---

## P. Rollback (LOCKED)

| | |
|--|--|
| Functional code | **N/A** (none expected) |
| Docs tip | `git revert <docs-sha>` · never force-push |
| Product | Feature tip remains S7 · LS R0 Expert OFF unchanged |

---

## Q. Final TM-01 closeout criteria (LOCKED — residual)

S8 HOLD **nie** równa się automatycznemu **EPIC TM-01 CLOSED**.

| Criterion | Required for EPIC CLOSE |
|-----------|-------------------------|
| S0–S7 | **CLOSED** · PRODUCTION VERIFIED |
| S8 | **CLOSED as HOLD** (ten slice) **or** later REMOVE micro after L8 |
| Residual Bid retire | S3-D + L8 + Owner GO **or** explicit Owner defer forever |
| Residual DecisionView / legacy store | MIGRATE + L8 + Owner GO **or** explicit Owner defer |
| Residual TRE engines | Recovery retirement + L8 **or** explicit Owner defer |
| Owner GO | Jawny **EPIC CLOSE** (osobny) |

```text
TM-01 EPIC CLOSE ≠ S8 HOLD alone
S8 HOLD = roadmap honesty: audited, removal deferred
```

---

## 14. Allowlist (LOCKED — IMPLEMENT)

### Code / functional

| | |
|--|--|
| **Functional `src/`** | **EMPTY** |
| **Symbol deletes** | **EMPTY** |
| **File deletes** | **EMPTY** |

### Docs (EXPECTED IMPLEMENT / CLOSEOUT)

| File | Role |
|------|------|
| `docs/architecture/TENDER-MODERNIZATION-01-S8-IMPLEMENT.md` | Record ZERO code · AC HOLD |
| `docs/architecture/TENDER-MODERNIZATION-01-S8-PRODUCTION-VERIFY.md` | No UI delta / tip verify |
| `docs/architecture/TENDER-MODERNIZATION-01-S8-CLOSEOUT.md` | S8 CLOSED HOLD |
| `docs/architecture/TENDER-MODERNIZATION-01-S8-AUDIT.md` | Already exists · may update status |
| `docs/architecture/TENDER-MODERNIZATION-01-S8-PLAN.md` | Already exists · may update status |
| `docs/architecture/TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE.md` | TEN plik |
| Tip SSOT pack | `09` · MASTER* · cold-start · CURRENT-TASK · PHC · AGENTS · TM-01 MASTER |

**FORBIDDEN tip:** `useTenderOfferRun.ts` · any Bid/TRE/Decision delete · `git add -A`.

---

## 15. OUT (LOCKED)

| OUT |
|-----|
| Hard REMOVE / file delete / symbol delete |
| OPTION B micro cleanup |
| DecisionView / TRE / Offer Run / Bid / OfferBoq / store delete |
| S6 bridge · Strategy rewrite · scoring · cloud · third store |
| `useTenderOfferRun.ts` any change |
| Invented functional commit |
| Auto EPIC TM-01 CLOSE |
| S9 / non-TM work |

---

## 16. 8 LOCK + NO BIG-BANG (LOCKED)

| # | LOCK |
|---|------|
| 1–8 | Expert · Chief · Session · Validation · Adapters · TF · OfferBoq · Domain calc — **NO TOUCH** |
| | NO BIG-BANG · REUSE FIRST · ZERO DUPLICATE · SSOT FIRST · NO BLIND DELETE |

---

## 17. IMPLEMENT expectations (LOCKED)

```text
Owner GO IMPLEMENT S8
  → DO NOT invent code
  → Write IMPLEMENT doc: "ZERO functional changes · HOLD"
  → Re-run S2/S4/S5/S6/S7 + build
  → OV-S8 HOLD
  → Docs tip commit (AUDIT/PLAN/DF already local may be included)
  → PV docs · CLOSEOUT · tip SSOT
  → STOP · residual tracks only on new Owner GO
```

---

## 18. STOP

```text
DESIGN FREEZE COMPLETE
OPTION A HOLD REMOVE LOCKED
READY FOR IMPLEMENT (docs-only expected)

WAIT: OWNER GO → S8 IMPLEMENT
DO NOT auto-start IMPLEMENT
DO NOT invent cleanup
```
