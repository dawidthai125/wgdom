# AUDIT / PLAN — Evidence → OUR RATE Contract (TABLICA)

> **Epic context:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **Document:** `IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT`  
> **Tip:** **2.66.59** / **`9bcc558`**  
> **Date:** 2026-08-14  
> **Mode:** AUDIT / PLAN ONLY · **ZERO** implement · Accept · OUR RATE write · Evidence write · Catalog write · code · commit · push · deploy

```text
AUDIT COMPLETE

Verdict class: B (with reuse of existing Accept SSOT)

A) Safe Research Candidate → Owner Accept → OUR RATE  = EXISTS (REUSE)
B) Direct Evidence → OUR RATE                         = FORBIDDEN + NO API
Bridge Evidence → Candidate/Accept                    = GAP (not implemented)

OUR RATE DERIVATION for Tablica Accept value          = OWNER DECISION REQUIRED
Automatic OUR RATE = 546                              = FORBIDDEN

Writes this GO = 0
STOP — no IMPLEMENT / Accept
```

---

## 0. Verified state (read-only confirm)

| Layer | Value |
|-------|--------|
| Evidence | **67** · revision **3** · etag **`r3-a8226101`** |
| Tablica evidenceId | `7bd0bcf8-07cf-427f-896a-f532cfdfaa0e` |
| Tablica Evidence | 312–780 / `szt` · `pricePoint=null` · VALID · laborOnly |
| Catalog | **460 / 34 / 426** |
| Control companyPrice / OUR RATE / margin | **35 / null / 0** |
| Tablica catalog | companyPrice **420** · `ourWorkRate` **null** · marginPct **0** |
| Podejście | HOLD · UNIT_EQUIVALENCE UNPROVEN |
| Wykwity | SOURCE GAP REAL |
| Accept | **NOT DONE** |

**Business lock:** Evidence ≠ OUR RATE · companyPrice (420) ≠ OUR RATE · midpoint 546 ≠ automatic OUR RATE.

---

## 1. Current SSOT flow (REUSE FIRST)

### 1.1 Layer stack (Evidence DF + KB-BRUZDY Policy)

From [`WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md`](./WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md) §3.1 and [`WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01-DESIGN-FREEZE.md`](./WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01-DESIGN-FREEZE.md) §1–2:

```text
① SOURCE / Evidence observation   (durable KV · provenance)
② AGGREGATION INPUT POOL          (scope + qualify filtered)
③ marketBase                      (DERIVED · midpoint/point · median)
④ Candidate                       (proposedOurRate = marketBase × (1+margin/100))
⑤ Owner Accept                    (ONLY write gate)
⑥ OUR RATE                        (CatalogWork.ourWorkRate.ourRatePln)

FORBIDDEN shortcut: Evidence → OUR RATE
```

Three never-conflated values (KB-BRUZDY §1.4):

| Layer | Example Tablica | Meaning |
|-------|-----------------|--------|
| SOURCE RANGE | **312–780** | Raw evidence |
| MARKET BASE (DERIVED) | **546** | Midpoint of range |
| PROPOSED / ACCEPTED OUR RATE | after margin + Owner Accept | Firm rate |

### 1.2 What exists vs what does not

| Path | Exists? | Notes |
|------|---------|-------|
| Selective research → Candidate → Owner Accept → `ourWorkRate` | **YES** | Production UI + lib |
| Manual Owner edit → `ourWorkRate` (`sourceType: OWNER`) | **YES** | Separate from research Accept |
| Evidence KV write | **YES** | Isolated store |
| Evidence → Accept API | **NO** | Explicitly forbidden in Evidence DF |
| Evidence → auto OUR RATE | **NO** | Hard forbid |
| Accept UI override of suggested PLN before Accept | **NO** | Accept commits `candidate.suggestedRatePln` as-is; edit is a different path |

---

## 2. Existing Accept mechanism

### 2.1 Core function

**File:** `src/lib/work-catalog/work-rate-accept.ts`  
**Symbol:** `acceptWorkRateResearchCandidate`

| Behavior | Detail |
|----------|--------|
| Input | `WorkRateResearchCandidate` (not Evidence observation) |
| Rate written | `round(candidate.suggestedRatePln)` → `ourWorkRate.ourRatePln` |
| History | Appends each candidate observation as `kind: SOURCE` · then `kind: OUR` / `sourceType: ACCEPT` |
| Does **not** mutate | `companyPricePln` · `marketQuotes` · `commercialPricing` |
| Requires | Valid workId · unit match · suggestedRatePln > 0 |

### 2.2 Call-sites (Accept)

| Call-site | Role |
|-----------|------|
| `src/app/hooks/useWorkCatalog.ts` → `acceptOurWorkRateResearch` | Catalog UI Accept + `saveWorkCatalogRouted` |
| `src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx` → `onAcceptResearch` | Owner clicks Accept on pending Candidate |
| `src/lib/ik-pricing-orchestrator/labor-research-bridge.ts` → `acceptIkLaborResearchAndNotify` | IK wire: Accept → persist → notify (only if save OK) |
| Export barrel | `src/lib/work-catalog/index.ts` |

### 2.3 Manual OUR RATE (non-Accept-research)

| Call-site | Role |
|-----------|------|
| `src/lib/work-catalog/work-rate-patch.ts` → `patchOurWorkRateInStore` | Owner-typed PLN · `sourceType: OWNER` |
| `useWorkCatalog.updateOurWorkRate` | UI „Edytuj stawkę” |

This is **not** Evidence Accept. It is a parallel Owner authority path.

---

## 3. Existing OUR RATE / derivation mechanism

### 3.1 Research Candidate construction

**File:** `src/lib/work-catalog/work-rate-research.ts` → `runSelectiveWorkRateResearch`

```text
qualified observations
  → calculateRepresentativeWorkRate (median of ratePln)
  → marketBaseRatePln
  → proposedOurRatePln = computeProposedWorkRatePln(marketBase, marginPct)
  → suggestedRatePln = proposedOurRatePln
  → status CANDIDATE
```

### 3.2 Range → marketBase

**File:** `src/lib/work-catalog/work-rate-market-base.ts`

| Function | Formula |
|----------|---------|
| `computeWorkRateMarketBaseFromRange` | `round2((min+max)/2)` |
| `computeWorkRateMarketBaseFromPoint` | identity |
| `computeProposedWorkRatePln` | REUSE `computeSellPricePln` = marketBase × (1 + marginPct/100) |

**SSOT policy:** midpoint as **marketBase** is intentional and **DERIVED** — must remain labeled DERIVED, never silently as SOURCE `pricePoint`.

### 3.3 Median / aggregation

**File:** `src/lib/work-catalog/work-rate-qualify.ts` → `calculateRepresentativeWorkRate`  
Method: median of qualified `ratePln` with region preference (WROCLAW → DOLNY_SLASK → POLSKA).  
`lowSample` when sampleSize < 3; **n=1 still eligible** for Candidate (must surface lowSample).

### 3.4 Expert RO (no write)

| File | Role |
|------|------|
| `src/lib/ik-pricing-orchestrator/labor-rate-evidence.ts` | Evidence Pack RO · `candidateRatePln === suggestedRatePln` |
| `src/lib/ik-pricing-orchestrator/labor-rate-expert-rec.ts` | Stance/confidence · `expertMayWrite/Accept=false` |
| `IkLaborCandidateReviewCard.tsx` | UI review · does not auto-Accept |

---

## 4. Exact call-site map (summary)

```text
RESEARCH
  runSelectiveWorkRateResearch
    ← OurWorkRateCatalogPanel.onResearchMarket
    ← useWorkCatalog.researchOurWorkRate
    ← runIkLaborGapResearch (labor-research-bridge)

CANDIDATE (in-memory)
  WorkRateResearchCandidate
    marketBaseRatePln · proposedOurRatePln · suggestedRatePln
    observations[] (ratePln = point OR range midpoint)

OWNER ACCEPT
  acceptWorkRateResearchCandidate
    ← acceptOurWorkRateResearch / onAcceptResearch
    ← acceptIkLaborResearchAndNotify

OUR RATE PERSIST
  CatalogWork.ourWorkRate  (kw-wgdom-work-catalog via saveWorkCatalogRouted)

EVIDENCE KV (parallel · isolated)
  kw-wgdom-labor-source-evidence
  buildLaborSourceEvidenceObservation / applyLaborSourceEvidenceDelta
  ✗ NO Accept import
  ✗ NO OUR RATE write
```

---

## 5. Safety locks (checklist)

| Lock | Status | Where |
|------|--------|-------|
| Evidence ≠ OUR RATE | **PRESENT** | Evidence types header · DF · ingest/store comments |
| Accept-only for research → OUR RATE | **PRESENT** | accept.ts · KB-BRUZDY · Evidence DF „Data path FORBIDDEN: Evidence → OUR RATE” |
| companyPrice protection | **PRESENT** | Accept does not touch companyPrice · `isCompanyPriceForbiddenAsWorkRateBase` · Tablica companyPrice 420 orthogonal |
| OUR RATE protection (no silent write) | **PRESENT** | No auto-Accept · research only proposes Candidate |
| margin protection | **PRESENT** | Accept does not rewrite `commercialPricing`; margin used only in proposed formula |
| Catalog isolation from Evidence writers | **PRESENT** | Separate KV · Evidence writers never patch catalog |
| Range preservation in Evidence | **PRESENT** | Tablica Evidence: priceKind=range · pricePoint=null |
| No implicit midpoint as Evidence pricePoint | **PRESENT** (this observation) | Live Evidence pricePoint=null |
| Provenance preservation | **PRESENT** | Evidence schema + Candidate observations + Accept history |
| Midpoint as marketBase in research | **PRESENT by design** | KB-BRUZDY / market-base.ts — **DERIVED layer**, not Accept without Owner |

### Gaps (do **not** fix in this GO)

| ID | Gap | Severity |
|----|-----|----------|
| G1 | No API: Evidence observation → Candidate / Accept | **HIGH** for „Evidence-first” product story |
| G2 | Accept UI does not let Owner pick min / max / custom before committing suggestedRate | **MED** — workaround = separate „Edytuj stawkę” |
| G3 | With marginPct=0, proposed OUR RATE **numerically equals** midpoint — easy to confuse layers | **MED** (documentation / Owner review risk, not missing formula) |
| G4 | n=1 Candidate allowed (`lowSample`) — Owner must see sample honesty | **LOW** (already flagged in policy) |
| G5 | No first-class „Owner Decision: OUR RATE = f(Evidence range)” contract beyond Accept of research Candidate | **HIGH** for Tablica case |

---

## 6. Gaps vs Owner business lock

Owner lock: **do not** take OUR RATE = 546 without SSOT rule **and** Owner approval.

| Statement | Audit result |
|-----------|--------------|
| Midpoint formula exists for **marketBase** | **YES** (SSOT) |
| Midpoint formula alone writes OUR RATE | **NO** |
| Accept writes suggested (= proposed = marketBase×margin) | **YES** — only after Owner click |
| Evidence write implies Accept | **NO** |
| companyPrice 420 may seed OUR RATE | **NO** (forbidden) |
| System forces Owner to choose among 312 / 546 / 780 / custom | **NO** — **GAP G2/G5** |

Therefore for Tablica:

```text
OUR RATE DERIVATION = OWNER DECISION REQUIRED

Not missing midpoint math —
missing an Owner-approved *choice* of which commercial value
to Accept as OUR RATE for this Evidence range.
```

---

## 7. TABLICA case study

| Field | Value |
|-------|--------|
| Evidence | 312–780 zł/`szt` · VALID · laborOnly · CR electrical URL |
| SOURCE RANGE | **312–780** |
| DERIVED MIDPOINT | **546** |
| Catalog marginPct | **0** |
| If Candidate rebuilt today | marketBase≈546 · proposed≈**546** (margin 0) |
| companyPrice | **420** (must stay out of OUR RATE) |
| Current OUR RATE | **null** |
| Accept | **NOT DONE** |

### What Accept would do *if* Owner ran research+Accept now

Without any new code: research Candidate → Accept would persist **OUR RATE ≈ 546** (suggestedRatePln), append SOURCE history using observation `ratePln` (midpoint), leave companyPrice 420 untouched.

That is **SSOT-consistent** with KB-BRUZDY **only if** Owner consciously Accepts that commercial proposal.  
It is **not** automatic from Evidence write.  
It is **not** licensed by this AUDIT to execute.

### What must **not** happen

| Forbidden | Why |
|-----------|-----|
| Auto OUR RATE = 546 from Evidence | Evidence ≠ OUR RATE |
| OUR RATE = companyPrice 420 | Orthogonal / protection |
| OUR RATE = min 312 or max 780 without Owner rule | No SSOT pick-min/max |
| Collapse Evidence pricePoint to 546 | Violates range preservation already achieved |

---

## 8. Range handling

| Layer | How range is handled |
|-------|----------------------|
| Evidence KV | `priceMin`/`priceMax` · `priceKind=range` · `pricePoint=null` |
| Research qualify | Stores `sourceMinPln`/`sourceMaxPln` · `ratePln` = midpoint for aggregation |
| marketBase | Midpoint (or point) |
| Median | Across observation `ratePln` values |
| Accept history SOURCE rows | Uses `obs.ratePln` (midpoint), not raw min/max fields on OurWorkRate history |

**Note:** Accept history currently **does not** persist min/max as first-class OUR-rate history fields — provenance of range lives better in Evidence KV / Candidate observations. Gap for richer Accept provenance = optional future epic (not required to unblock Owner Decision on rate choice).

---

## 9. Midpoint handling

| Use | Allowed? |
|-----|----------|
| Derived marketBase | **YES** (SSOT) |
| Evidence `pricePoint` | **NO** for ranges (Tablica correctly null) |
| Automatic OUR RATE | **NO** |
| Display in Owner review as „propozycja” | **YES** (existing UI copy: mediana / propozycja) |
| Owner Accept of proposed value | **YES** — explicit click only |

---

## 10. Owner decision required?

```text
Owner Decision REQUIRED before any Tablica OUR RATE write.

Questions for Owner (not answered by this AUDIT):

Q1) Accept research Candidate path (proposed ≈ 546 @ margin 0)?
Q2) Manual Owner rate (patchOurWorkRate) — value chosen by Owner?
Q3) Open thin epic: Evidence → proposal card with explicit
    Owner choice {min, mid, max, custom} → existing Accept/patch?
Q4) Change margin first, then Accept (proposed ≠ mid)?

This AUDIT does NOT recommend a numeric OUR RATE.
```

---

## 11. Verdict A vs B

### A) Existing safe SSOT flow Evidence → Accept → OUR RATE?

**Not as a single pipe.**

- **Research Candidate → Owner Accept → OUR RATE** = **SAFE · EXISTS · REUSE**  
- **Evidence → OUR RATE** = **FORBIDDEN** by Evidence DF  
- Evidence is an **input pool** for future aggregation (DF §3), not an Accept trigger

### B) Missing explicit OUR RATE derivation contract for Tablica?

**YES — for commercial choice.**

Midpoint→marketBase→proposed formula **exists**.  
What is missing for Tablica is an **Owner Decision** on whether (and which) value becomes OUR RATE, plus optionally a thin Evidence→review bridge (G1/G5).

```text
RECOMMENDED CLASSIFICATION = B
  (reuse Accept SSOT; do not invent parallel Accept;
   open Owner Decision / thin epic for Tablica rate choice)
```

---

## 12. Recommended next Owner GO / EPIC

| Priority | Next | Scope |
|----------|------|-------|
| **1** | **OWNER DECISION — TABLICA OUR RATE VALUE** | Choose: Accept≈546 (via research Candidate) · manual OWNER PLN · or defer |
| **2** (optional) | Thin epic: **Evidence → Owner proposal card** | Read Evidence · show SOURCE range + DERIVED mid + proposed · Owner picks · call **existing** `acceptWorkRateResearchCandidate` or `patchOurWorkRateInStore` — **ZERO** new Accept engine |
| **3** | NOT NOW | Podejście (unit UNPROVEN) · Wykwity · mass Accept · margin rewrite |

**Do not** auto-IMPLEMENT.  
**Do not** Accept in the same GO as Decision unless Owner explicitly says so.

---

## 13. Final status

```text
AUDIT COMPLETE

Evidence: 67 / rev 3 / r3-a8226101
Tablica: VALID / VERIFIED (Evidence only)
Podejście: HOLD / UNIT_EQUIVALENCE UNPROVEN
Wykwity: SOURCE GAP REAL
Catalog: 460 / 34 / 426
OUR RATE (Tablica): null
Accept: NOT DONE
Margin (Tablica): 0
companyPrice (Tablica): 420 (orthogonal)
Writes: 0

NEXT OWNER GO (recommendation):
  OWNER DECISION — TABLICA OUR RATE VALUE
  (optional later: Evidence→proposal bridge epic)

NO IMPLEMENT · NO ACCEPT · NO OUR RATE WRITE
STOP
```
