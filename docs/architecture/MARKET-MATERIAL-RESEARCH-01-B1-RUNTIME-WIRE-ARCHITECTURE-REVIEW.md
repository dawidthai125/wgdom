# MARKET-MATERIAL-RESEARCH-01 B1
# ARCHITECTURE REVIEW

> **ID:** `MARKET-MATERIAL-RESEARCH-01-B1-RUNTIME-WIRE`  
> **Gate:** ARCHITECTURE REVIEW ONLY  
> **Date:** 2026-08-11  
> **Owner GO AR:** **YES**  
> **DF under review:** [`MARKET-MATERIAL-RESEARCH-01-B1-RUNTIME-WIRE-DESIGN-FREEZE.md`](./MARKET-MATERIAL-RESEARCH-01-B1-RUNTIME-WIRE-DESIGN-FREEZE.md)  
> **Parent DF:** [`MARKET-MATERIAL-RESEARCH-01-DESIGN-FREEZE.md`](./MARKET-MATERIAL-RESEARCH-01-DESIGN-FREEZE.md)  
> **Prior audit:** STAGE B1 RUNTIME-WIRE AUDIT / RCA / PLAN (session)  
> **DF modified by this review:** **NO**

```text
CODE = ZERO · TESTS = ZERO · COMMIT = NONE · PUSH = NONE
PRODUCTION = UNCHANGED · EXTERNAL HTTP = ZERO · PRICE MUTATION = ZERO
```

---

## A. VERDICT

**PASS WITH CONSTRAINT**

DF B1 is **architecturally valid** and consistent with parent MARKET-MATERIAL-RESEARCH-01 DF + Stage B1 audit.

- **No BLOCKER** requiring Owner architecture amend.  
- **No** new Edge / DATA_KEY / SQL / second lock / PE global change required.  
- Constraints below are **IMPLEMENT CONSTRAINTS** only (fit inside frozen DF).

**DF = VALID** · **OWNER DECISIONS = NONE** · **WAITING FOR OWNER GO IMPLEMENT**

---

## B. Baseline

| Item | Value | AR check |
|------|-------|----------|
| Production UI | 2.66.24 | OK |
| Repo tip | `8329997b` | OK |
| Stage A Hard SF | `a3c7da0f` PRODUCTION GREEN | OK — REUSE |
| Stage B library | `8329997b` LIBRARY GREEN | OK — REUSE |
| Stage B runtime wire | NOT IMPLEMENTED | OK — subject of B1 |
| B1 DF | docs only · CODE ZERO | OK |
| SCREED / PAINTING / DECOMP / PRICE-PATH | FROZEN / GREEN | OUT of mutate |

---

## C. PHASE 1

**PASS** (AR #1)

| Check | Result |
|-------|--------|
| Location = `chief-orchestrator/run.ts` T4 | **PASS** — matches existing SSOT (`recordPriceDemandsFromExperts` neighborhood) |
| BOM → unique keys → Memory → CURRENT/STALE/MISSING → STOP | **PASS** |
| No provider / lease / HTTP / wait / per-line jobs | **PASS** (E.3 MUST table) |
| Non-blocking · fail-soft · session/run gated | **PASS** |
| Not React render | **PASS** |
| Aligns parent DF §4 #8 BACKGROUND / #14 NO RESEARCH FOR CURRENT / #15 NO RENDER RESEARCH | **PASS** — Phase 1 = enqueue only |

**Wire rationale check:** DF correctly states reason = **Chief T4 SSOT**, not “bundle empty.” **PASS**

---

## D. STALE semantics

**PASS** (AR #2 — CRITICAL)

| Check | Result |
|-------|--------|
| `marketPricePln > 0` ≠ CURRENT for research eligibility | **PASS** (DF §I) |
| STALE → DEMAND eligible | **PASS** |
| No global PE change | **PASS** |
| No global null of stale prices | **PASS** |
| No Real Cost change | **PASS** |
| Correction only at demand/research eligibility | **PASS** |
| B1-T4 locked: STALE + numeric PE → demand MUST exist | **PASS** |

Aligned with parent DF §5.A / §6.1 (STALE ≠ CURRENT) and prior RCA gap on `collectPriceDemandCandidates`.

---

## E. CURRENT cache-first

**PASS** (AR #3)

| Check | Result |
|-------|--------|
| CURRENT → zero demand / research / lease / provider | **PASS** (DF §H) |
| No CURRENT → research path | **PASS** |
| Re-open same tender does not force research when CURRENT | **PASS** (cache gate) |

**IMPLEMENT CONSTRAINT (not blocker):** Evaluation order in code MUST be:

```text
CACHE usability FIRST
  → if CURRENT: REUSE and STOP
  → else: cooldown / demand / Phase 2 path
```

Cooldown **MUST NOT** override or bypass the CURRENT cache gate (Owner AR #3). DF implies this; implementers must not invert order.

---

## F. Dedup

**PASS** (AR #4)

| Check | Result |
|-------|--------|
| Canonical key `materialKey|region` | **PASS** |
| 20 BOQ lines → 1 need | **PASS** |
| Multi-user → same `researchJobId` → Stage A | **PASS** |
| Dedup before demand/claim/provider | **PASS** |

Consistent with Stage B `dedupeNeededMaterialKeys` + parent DF §5.B–E.

---

## G. Hard Single-Flight

**PASS** (AR #5)

| Check | Result |
|-------|--------|
| Only Stage A lease | **PASS** |
| Forbidden second lock / navigator.locks / in-memory Hard SF / LWW lock / new Edge lock | **PASS** |
| 10 claimants → 1 ACTIVE | Covered by B1-T7 + Stage A prod proof | **PASS** |

---

## H. PHASE 2

**PASS** (AR #6)

| Check | Result |
|-------|--------|
| Execute path: demand → cooldown → claim → provider → CANDIDATE → Accept | **PASS** |
| Not part of sync Chief T4 | **PASS** (`executeResearch=false` in Phase 1) |
| Not on render / refresh / per-line | **PASS** |
| Expert Workspace = Owner surface only | **PASS** |
| Auto-accept forbidden | **PASS** |

**IMPLEMENT CONSTRAINT:** Parent DF allows future background worker; B1 freezes Owner CTA as Phase 2 trigger. That is **sufficient** for B1. Do **not** invent a full background worker in B1 without separate Owner GO.

---

## I. Owner Accept

**PASS** (AR #7)

| Check | Result |
|-------|--------|
| AUTO ACCEPT = FORBIDDEN | **PASS** |
| Provider = CANDIDATE only | **PASS** |
| No Accept → no approved Quotes | **PASS** (B1-T8) |
| Accept → existing path → Quotes → history → Memory CURRENT | **PASS** |
| Purchase separate · Market ≠ Real Cost | **PASS** |

---

## J. Load protection

**PASS** (AR #8)

| Check | Result |
|-------|--------|
| Order DEDUP → CACHE → DEMAND → COOLDOWN → CLAIM → provider | **PASS** |
| `MMR_MAX_ACTIVE_CLAIMS_PER_PASS = 8` | **PASS** |
| No per-line HTTP / unbounded Promise.all / polling / crawl / research-all | **PASS** |

**IMPLEMENT CONSTRAINT:** Cooldown persistence must stay within DF (ephemeral / session / demand-adjacent) — **no new DATA_KEY** without STOP + amend.

---

## K. Data / Edge boundary

**PASS** (AR #9)

| Check | Result |
|-------|--------|
| No new Edge endpoint | **PASS** |
| No new DATA_KEY / SQL / table / research worker engine | **PASS** |
| Reuse demand + Quotes + history + Memory + Stage A | **PASS** |
| File outside allowlist → STOP | **PASS** |

---

## L. Scope isolation

**PASS** (AR #10)

OUT locked: SCREED · PAINTING · DECOMP · PRICE-PATH · Purchase · Bid · bid-time-load-guard · Stage A impl rewrite · live shops · scraping · invent.

**PASS**

---

## M. ZZK verification

**PASS** (AR #11)

| Check | Result |
|-------|--------|
| Tender `08dee178` / ZZK-NZ/241/3408/72/26 | **PASS** |
| Keys: grunt / farba / jastrych | **PASS** |
| Qty listed but **not** research input | **PASS** |
| Research = identity / unit price / provenance / freshness | **PASS** |
| PHASE 1 unique needs ≤ 3 (not 80) | **PASS** |

---

## N. Test contract

**PASS** (AR #12)

B1-T1…T12 cover enqueue, dedup, CURRENT, **critical STALE+numeric PE (T4)**, MISSING, Phase 1 zero provider/lease (T6), Hard SF (T7), Accept gates (T8–T10), max claims (T11), regressions (T12).

**Sufficient** for B1 GO IMPLEMENT gate.

**IMPLEMENT CONSTRAINT:** Harness must construct STALE Memory **and** PE line with numeric `marketPricePln` for T4 — do not fake T4 by omitting PE price.

---

## O. Allowlist

**PASS** (AR #13)

Minimal set is **sufficient**:

1. `chief-orchestrator/run.ts`  
2. existing demand bridge **or** thin `market-material-research-wire.ts` if required  
3. existing Stage B orchestration (reuse)  
4. small Stage A client lease adapter if Phase 2 needs it  
5. `CostDetailsPanel` / `DemandPriceResearchPanel` if Phase 2 UI glue needed  
6. B1 test harness  

No speculative expansion approved.

| Candidate expansion | AR stance |
|---------------------|-----------|
| Touch `demand-collect.ts` / `demand-record.ts` as “existing demand bridge” | **Allowed** under DF item #2 — not a new speculative file |
| New Edge route / cloud-sync DATA_KEYS | **STOP / amend** |
| Rewrite Stage B orchestrate | **Forbidden** |

---

## P. Owner decisions required

**NONE**

No architecture amend required for:

- Edge  
- DATA_KEY  
- SQL  
- PE global semantics  
- Stage A lease rewrite  
- Live shop connection  

---

## Q. Implementation constraints

(Only items that fit inside frozen DF — **not** blockers.)

1. **Cache-before-cooldown:** CURRENT gate must run before cooldown; cooldown must not unlock research for CURRENT.  
2. **Freshness mapping:** Map Memory `fresh|usable` (and Owner wording “ok”) → CURRENT; `stale` → STALE; miss → MISSING — **without** changing PE modules.  
3. **Eligibility-only STALE fix:** Do not alter `analyze-line` / global PE; fix MARKET research demand eligibility in B1 bridge / Stage B cache path.  
4. **Phase 1 = enqueue only:** Prefer `orchestrateMaterialResearch({ executeResearch: false })` or equivalent; never claim/provider in T4.  
5. **Phase 2 trigger:** Owner CTA only in B1; no mount `useEffect` research; no background worker unless later Owner GO.  
6. **Cooldown storage:** Ephemeral/session/demand-adjacent — no new `DATA_KEY` without STOP.  
7. **Allowlist discipline:** `demand-record` / `demand-collect` edits only as thin eligibility bridge; any other new module → STOP.  
8. **B1-T4 fidelity:** Test must prove STALE+numeric PE still creates demand.  
9. **Purchase/BOTH_MISSING:** Do not break existing purchase-missing demand semantics while correcting MARKET STALE eligibility.  
10. **Mock only:** Phase 2 provider remains `mock_manual` / manual Accept path — zero live shop HTTP.

---

## R. FINAL GATE

```text
ARCHITECTURE REVIEW = PASS WITH CONSTRAINT
DF = VALID
OWNER DECISIONS = NONE
BLOCKERS = NONE

WAITING FOR OWNER GO IMPLEMENT
```

```text
CODE = ZERO
TESTS = ZERO
COMMIT = NONE
PUSH = NONE
PRODUCTION = UNCHANGED
EXTERNAL HTTP = ZERO
SCRAPING = ZERO
INVENT = ZERO
PRICE MUTATION = ZERO

SCREED = FROZEN
PAINTING = GREEN
DECOMP = GREEN
PRICE-PATH = GREEN
STAGE A = PRODUCTION GREEN
STAGE B = LIBRARY GREEN
B1 RUNTIME WIRE = AR PASS · IMPLEMENT NOT STARTED
```

**NIE WYKONANO IMPLEMENTACJI.**
