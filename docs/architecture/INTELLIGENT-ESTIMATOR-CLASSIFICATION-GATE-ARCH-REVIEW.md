# ARCH REVIEW — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE

> **Epic:** `INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE`  
> **SSOT Design Freeze:** [`INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md`](./INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md)  
> **Owner Final map:** [`INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT.md`](./INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT.md)  
> **Tip / baseline:** **2.66.56** / **`d0c1f198`**  
> **Date:** 2026-08-14  
> **Mode:** ARCH REVIEW ONLY · **ZERO CODE** · **ZERO IMPLEMENT** · **ZERO KV**

```text
DESIGN FREEZE   = APPROVED
ARCH REVIEW     = CLOSED · was APPROVE WITH AMENDMENTS · A1–A5 CLOSED
OWNER DECISION CLOSEOUT (A1–A5) = COMPLETE
IMPLEMENT       = GREEN (local · v2.66.57 · undeployed)
COMMIT/PUSH/DEPLOY = NOT DONE
Evidence / Registry / Catalogs / OUR RATE = UNCHANGED (guards only)
SOURCE GAP      = OPEN
NICHE           = NOT CLAIMED
NEXT            = OWNER GO: COMMIT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```

---

## A. Scope review

| In scope | Out of scope |
|----------|--------------|
| Verify Design Freeze contract for `classifyEstimatorPricingPlane` | Any code / IMPLEMENT |
| Confirm four-state model + routing | Material Catalog KV creation |
| Call-site / bypass risk vs current repo | Remapping Owner 29/24/6/30 |
| Integration with existing labor/material stacks | PASS2 / qualify / median / hosts / Accept |
| Amendments / blockers (docs only) | Fixing code paths |

**Owner FINAL counts (re-verified from closeout artefact):** LABOR **29** · MATERIAL **24** · COMPOUND **6** · UNKNOWN **30** · total **89**.

---

## B. Architecture verdict

| Criterion | Status |
|-----------|--------|
| Classification-first before source selection | **PASS** (design) |
| Four explicit states · no fallback | **PASS** |
| LABOR / MATERIAL plane separation | **PASS** |
| COMPOUND / UNKNOWN = HOLD | **PASS** |
| Upstream of D1 / identity / Evidence / OUR RATE | **PASS** |
| Pure routing · no pricing writes | **PASS** |
| Owner map as sole seed for 89 | **PASS** (with A1 stricter heuristics) |
| Call-site completeness vs current bypasses | **AMEND** (A2–A4) |
| Dedicated Material Catalog | **GAP** (A5 — not invent) |

**Overall:** Design Freeze is **architecturally sound** as the central gate.  
**Verdict:** **APPROVE WITH AMENDMENTS** — not BLOCKED; amendments are wiring / scope tightening, not a redesign of the four-state model.

---

## C. Classification contract review

| Item | Design Freeze | Arch Review |
|------|---------------|-------------|
| Function | `classifyEstimatorPricingPlane` | **APPROVED** name/role |
| Inputs | workId / materialKey / namePl / unit / lineKindHint | **APPROVED** — seed by workId first |
| Outputs | plane + allow*Research + hold | **APPROVED** |
| Authority | Owner seed > rules > UNKNOWN | **AMEND A1:** v1 IMPLEMENT = Owner seed **only** for known ids; else UNKNOWN — **no new heuristics** |
| Persistence | Code-frozen map · no new KV | **APPROVED** |
| Writes | None | **APPROVED** |

**Confirmed:** Classification must not use source availability as evidence of class (produkt ≠ montaż).

---

## D. Routing review

| Plane | Designed route | Arch Review |
|-------|----------------|-------------|
| LABOR | Work Catalog → miss → KEEP-4 labor research | **APPROVED** |
| MATERIAL | Price Memory → miss → DIY | **APPROVED** (Material Catalog KV = GAP A5) |
| COMPOUND | HOLD · no research | **APPROVED** |
| UNKNOWN | HOLD · no research · no invent | **APPROVED** |

Order binding:

```text
classification → routing → source selection
```

Inverse (`source → classification`) remains **FORBIDDEN** — Design Freeze correctly states this.

---

## E. Labor / Material separation review

| Lock | Present in Design Freeze? | Present in prod code today? |
|------|---------------------------|-----------------------------|
| Labor research ≠ material hosts | Yes | Yes (KEEP-4 vs DIY) |
| Material research ≠ labor Evidence | Yes | Yes (separate modules) |
| companyPrice ≠ marketBase | Reuse | Yes |
| Evidence ≠ OUR RATE | Reuse | Yes |
| Gate does not replace identity/D1 | Yes | N/A (not implemented) |
| `isLaborCatalogWorkBlockedForProductQuotes` | Reuse noted | Yes |

**PASS** — Gate is additive upstream; does not fork or replace labor/material engines.

---

## F. Compound / Unknown safety review

| Rule | Design Freeze | Arch Review |
|------|---------------|-------------|
| COMPOUND ≠ LABOR/MATERIAL | Explicit | **PASS** |
| No auto split / bucket | Explicit | **PASS** |
| UNKNOWN ≠ LABOR/MATERIAL | Explicit | **PASS** |
| No UNKNOWN→LABOR fallback | Explicit | **PASS** |
| No research on HOLD planes | Flags table | **PASS** |

**PASS** — terminal HOLD semantics are correctly designed.

---

## G. Call-site review (critical)

### G.1 Designed guards (Design Freeze §I)

| Target | Design intent |
|--------|---------------|
| `runIkLaborGapResearch` | Assert labor research allowed |
| `runSelectiveWorkRateResearch` | Assert at entry |
| Material DIY / MMR entry | Assert material research allowed |
| Gap-job creation | Classify before enqueue |

### G.2 Measured bypasses in current repo (pre-IMPLEMENT)

| Path | File | Risk if Gate only on IK bridge |
|------|------|--------------------------------|
| Direct labor research from Work Catalog UI | `src/app/hooks/useWorkCatalog.ts` → `runSelectiveWorkRateResearch` | **HIGH** — bypasses IK-only guard |
| IK labor research | `labor-research-bridge.ts` → selective research | Covered if both entries guarded |
| Labor gap jobs | `inventory-gaps.ts` `maybePushLabor` on `BRAK_STAWKI_ROBOT` | **HIGH** — today enqueues any OK identity without plane |
| Material research wire/orchestrate/refresh | `market-material-research-wire.ts`, `…-orchestrate.ts`, `our-price-catalog-refresh.ts` | **MED** — multiple entries; must all assert when classifying by `catalogWorkId`/`workId` |
| F5 / `boq-shadow-adapter` | Emits `BRAK_STAWKI_ROBOT` on labor miss | **MED** — gap emission should respect plane (see A4) |

**Conclusion:** Design Freeze *intent* is correct, but IMPLEMENT **must** place the hard assert on **`runSelectiveWorkRateResearch` itself** (and all material research orchestrators), not only on `runIkLaborGapResearch`. Documented as **Amendment A2–A4**.

No code fix in this review (HARD LOCK).

---

## H. Existing architecture integration

### H.1 Labor stack — Gate must NOT replace

| Component | Integration |
|-----------|-------------|
| `WORK_RATE_OWNER_SYNONYMS` / D1 scope | Downstream after LABOR route |
| `WR-LABOR-IDENTITY-MAPPING` | Downstream |
| Evidence DB | Downstream optional; Gate never writes |
| Work Catalog / `lookupWorkRate` / Accept / OUR RATE | Downstream labor only |
| PASS2 / qualify / median | Unchanged |

**PASS**

### H.2 Material stack — measured GAP

| Component | Status |
|-----------|--------|
| Price Memory (`marketQuotes` / `mat.*`) | **MEASURED** SSOT for material sell today |
| DIY selective (Leroy/Castorama/OBI) | **MEASURED** |
| Dedicated `kw-wgdom-material-catalog` | **ABSENT** |

**GAP A5 (do not invent):** v1 MATERIAL route = **Price Memory + DIY** as designed. Full Material Catalog KV = **future Owner epic**, not this Gate.

### H.3 Catalog hygiene (context, not Gate blocker)

Owner FINAL marks 24 MATERIAL rows that still live on the labor commercial floor. Gate **blocks labor research** for them; physical catalog split is a **later hygiene epic** (Design Freeze non-goal). Arch Review **accepts** this sequencing.

---

## I. Security / anti-invention review

| Check | Result |
|-------|--------|
| produkt ≠ montaż | Design Freeze B.2 **PASS** |
| Source availability ≠ class | Explicit **PASS** |
| No invent on uncertainty → UNKNOWN | **PASS** (A1 tightens: no heuristic invent in v1) |
| Owner map frozen 29/24/6/30 | **PASS** — no remap in IMPLEMENT |
| Gate cannot write Evidence/Catalog/OUR RATE/Accept/margin | **PASS** |
| Gate cannot run research | **PASS** (routing only; research modules check flags) |

---

## J. Testability review

Design Freeze T01–T18 + golden 89 round-trip: **APPROVED**.

**Additional tests required by amendments (still design-only):**

| ID | Assertion |
|----|-----------|
| **T19** | Direct `runSelectiveWorkRateResearch` blocked for MATERIAL/COMPOUND/UNKNOWN seed |
| **T20** | `maybePushLabor` / gap inventory does not enqueue labor jobs for non-LABOR planes |
| **T21** | Material orchestrator blocked when primary workId plane = LABOR/COMPOUND/UNKNOWN |
| **T22** | Outside-89 workId without seed → UNKNOWN (no heuristic LABOR/MATERIAL) |

---

## K. Amendments (binding for Owner Decision Closeout)

### A1 — No new heuristics in v1 IMPLEMENT (STRICTER)

Design Freeze §D.1 allowed noun/verb heuristics after seed miss.  
**Owner GO for Arch Review / IMPLEMENT:** for this epic, **code-frozen Owner map only**.

- Hit in 89-map → Owner FINAL plane  
- Miss / no workId → **UNKNOWN** (or MATERIAL only if `materialKey` is the sole identity under research and no conflicting workId — optional narrow rule; prefer UNKNOWN when ambiguous)  
- **Forbidden:** invent new automatic remaps; expand map; re-open Owner decisions  

### A2 — Hard guard on `runSelectiveWorkRateResearch`

Labor research entry SSOT must assert classify **inside** `runSelectiveWorkRateResearch` (covers `useWorkCatalog.researchOurWorkRate` bypass).  
Guarding only `runIkLaborGapResearch` is **insufficient**.

### A3 — Hard guard on all material research orchestrators

Assert classify (when `workId`/`catalogWorkId` present) at:

- `market-material-research-wire`  
- `market-material-research-orchestrate`  
- `our-price-catalog-refresh` (and any other write/research entry)

Research by pure `mat.*` without workId may proceed as MATERIAL-plane research **without** inventing a workId class.

### A4 — Gap-job / F5 labor gap emission

`inventory-gaps.maybePushLabor` and emission of `BRAK_STAWKI_ROBOT` must run **only when** `classify(workId).plane === LABOR` (and `allowLaborResearch`).

MATERIAL / COMPOUND / UNKNOWN → **no** labor gap job · optional future hold gap codes (`CLASSIFY_*_HOLD`) — out of Gate write scope; UI/gap codes may be thin follow-up in same IMPLEMENT if Owner allows, else HOLD messaging only.

### A5 — Material Catalog GAP (document only)

No dedicated Material Catalog KV.  
**Do not invent** in this epic. MATERIAL route uses Price Memory + DIY. Recorded GAP for future epic.

### A6 — Non-amendment clarifications (already OK)

- Four states · no fallback · COMPOUND/UNKNOWN HOLD — unchanged  
- Existing D1/identity/Evidence/OUR RATE — unchanged  
- Owner counts 29/24/6/30 — frozen  

---

## L. Final verdict

```text
ARCH REVIEW = APPROVE WITH AMENDMENTS
```

| If… | Then… |
|-----|--------|
| Owner accepts A1–A5 | Proceed to **OWNER DECISION CLOSEOUT (amendments)** then later IMPLEMENT GO |
| Owner rejects A1 (wants heuristics) | Must re-open Design Freeze — do not IMPLEMENT silently |
| Owner requires Material Catalog KV now | **BLOCKED** for Gate-only epic — separate design needed |

**This review does NOT authorize IMPLEMENT.**  
**STOP** until Owner Decision Closeout on amendments.

---

## Checklist vs Owner “MUST BE CONFIRMED”

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Classification first | **PASS** (+ A2/A3 wire) |
| 2 | Four states · no fallback | **PASS** |
| 3 | LABOR routing | **PASS** |
| 4 | MATERIAL routing | **PASS** (+ GAP A5) |
| 5 | COMPOUND HOLD | **PASS** |
| 6 | UNKNOWN HOLD | **PASS** |
| 7 | Existing labor arch preserved | **PASS** |
| 8 | Material arch / no invent catalog | **PASS** + **GAP A5** |
| 9 | Call-site safety | **AMEND A2–A4** |
| 10 | Owner FINAL map only | **PASS** + **A1** |
| 11 | Data safety (no writes) | **PASS** |
| 12 | Anti-invent produkt≠montaż | **PASS** |

---

## OWNER DECISION CLOSEOUT — Amendments A1–A5

> See also Design Freeze § OWNER DECISION CLOSEOUT.

| ID | Owner Decision | Status |
|----|----------------|--------|
| **A1** | **APPROVE** | **CLOSED** |
| **A2** | **APPROVE** | **CLOSED** |
| **A3** | **APPROVE** | **CLOSED** |
| **A4** | **APPROVE** | **CLOSED** |
| **A5** | **APPROVE** | **CLOSED** |

**CHANGE:** none. Amendments are binding for IMPLEMENT.

```text
OWNER DECISION CLOSEOUT = COMPLETE
ARCH REVIEW             = CLOSED
DESIGN FREEZE           = APPROVED
IMPLEMENT               = NOT DONE
NEXT                    = OWNER GO: IMPLEMENT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```

---

## Final status

```text
DESIGN FREEZE      = APPROVED
ARCH REVIEW        = CLOSED
OWNER DECISION     = COMPLETE (A1–A5 APPROVE)

IMPLEMENT          = NOT DONE
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE

Evidence           = UNCHANGED
Registry           = UNCHANGED
Work Catalog       = UNCHANGED
Material Catalog   = UNCHANGED
OUR RATE           = UNCHANGED
SOURCE GAP         = OPEN
NICHE              = NOT CLAIMED

STOP.
NEXT               = OWNER GO: IMPLEMENT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```
