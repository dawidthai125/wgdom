# IK-MIGRATION-01 P5.12 — Real Material Expert (odpowietrznik 1/2")

**Status:** **BLOCKED** (honest architecture STOP · Owner GO received · **no invent**)  
**Date:** 2026-08-15  
**Baseline tip:** 2.66.74 · commit `276909d4` (P5.11)  
**Real tender:** `08def45d-ead6-5db8-962b-120001d33d37` · Master BOQ 430  
**Focus:** 2 × `cc-p0c-w1-zawor-odpowietrzajacy` (`obl_95b8d9fa` kotlarska · `obl_f676979e` ptasia)

## Owner GO (approved scope)

- Focus **only** 2 zawór / odpowietrznik MATERIAL lines.
- **Do not** touch zaprawianie (LABOR after P5.11).
- **Do not** modify P4 Labor.
- Owner-provided retail evidence (not auto-accept):
  - Leroy Merlin · product `89178695` · **56.99 PLN/szt.** · odpowietrznik automatyczny 1/2" z zaworem stopowym
  - Castorama · code `5902510004040` · **40.48 PLN/szt.** · AFRISO 1/2"
- Flow: Demand → Material Expert → Price Memory → MISS → Research → Candidate → **Owner Accept** → Price Memory.
- Forbidden: invent `mat.*` / `cw.product.*` · auto-Accept · averaging · Material Expert V2.

## Audit — existing Material Expert (reuse map)

| Step | Function | Result for 2 zawór lines |
|------|----------|--------------------------|
| Work plane | `classifyEstimatorPricingPlane` | **MATERIAL** · `allowMaterialResearch=true` |
| Classification research gate | `assertMaterialResearchAllowed({ catalogWorkId })` | **ok:true** (plane MATERIAL) |
| Product identity | `resolveDemandProductIdentityExact({ catalogWorkId: cc-p0c-w1-zawor-odpowietrzajacy, namePl, unit })` | **`null`** |
| Material Expert | `runIkMasterBoqMaterialExpert` | `materialIdentity=null` → **no** `evaluateMaterialCache` · **no** Phase2 |
| Price Memory | `evaluateMaterialCache` | never called (no `materialKey`) |
| Research | `executeMaterialResearchPhase2` | contract requires `PriceDemandRecord.materialKey` |
| Accept | `acceptMaterialResearchCandidate` | not reached (correct — no auto-Accept) |

## Exact blocker (STOP)

```text
Work Identity MATERIAL plane = OK
assertMaterialResearchAllowed(workId) = OK
resolveDemandProductIdentityExact = null
→ materialIdentity = null
→ researchEligible = false
→ Price Memory / Phase2 cannot run

Existing architecture does NOT support description-only / workId-only
material research without a trusted product/material identity.

Creating mat.* or cw.product.* (or S4 aliases) = invent under this brief
→ FORBIDDEN.

Owner Leroy / Castorama evidence cannot enter the existing pipeline
until a trusted demand identity exists (Owner-approved identity first).

Material Expert V2 = OUT OF SCOPE → STOP.
```

P5 doc SSOT (`IK-MIGRATION-01-P5-MATERIAL-EXPERT.md`): research **only** when trusted
`resolveDemandProductIdentityExact` succeeds. Live ZZK may truthfully show **0**
material identities — **no invent**.

## What was NOT done (correct under brief)

- No new `mat.*` / `cw.product.*` / Product Mapper aliases.
- No call to `acceptMaterialResearchCandidate`.
- No Price Memory write from research.
- No zaprawianie material component / research.
- No P4 Labor changes.
- No Material Expert V2.

## Gate B interpretation

Gate B allows: trusted CURRENT hit **OR** research **OR** **honest blocker**.

This package documents **honest blocker** = **Gate B PASS** for P5.12 under the
no-invent constraint. Residual: Owner must approve a **trusted material identity**
(or a separate epic that changes the research contract) before Leroy/Castorama
candidates can be produced by the existing Material Expert.

## Residual for Owner

1. Review / Accept **4 Labor** zaprawianie candidates @ 20 PLN/mb (P4-REAL / P5.11).
2. Decide identity path for 2 × odpowietrznik (Owner-approved `mat.*` + product + aliases)
   **before** re-running Material Expert research with retail evidence.
3. **P6** Position Cost / Bid — only after verified Labor + Material coverage.

## Related

- P5.8 audit: `IK-MIGRATION-01-P5.8-MATERIAL-IDENTITY-WAVE1-AUDIT.md`
- P5.9 identity: `IK-MIGRATION-01-P5.9-IDENTITY-OWNER-NORM.md` · `PRODUCT_IDENTITY_GAP`
- P5.11 zaprawianie LABOR: `IK-MIGRATION-01-P5.11-ZAPRAWIANIE-LABOR.md`
