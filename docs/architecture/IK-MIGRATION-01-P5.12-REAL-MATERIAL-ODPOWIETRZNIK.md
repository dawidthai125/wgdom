# IK-MIGRATION-01 P5.12 — Real Material Expert (odpowietrznik 1/2")

**Status:** **SUPERSEDED by P5.13** (research entry without pre-existing product materialKey)  
**Historical status:** **BLOCKED** (honest architecture STOP under P5.12 no-invent brief)  
**Date:** 2026-08-15  
**Baseline tip:** 2.66.74 · commit `276909d4` (P5.11) · blocker docs `cab5810f`  
**Supersede:** [`IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md`](./IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md)  
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
| Material Expert (P5.12) | `runIkMasterBoqMaterialExpert` | `materialIdentity=null` → **no** research (old contract) |
| Material Expert (P5.13+) | same | demand path → Phase2 with `demand.work.<workId>` |

## Exact blocker (P5.12 STOP — historical)

```text
Work Identity MATERIAL plane = OK
assertMaterialResearchAllowed(workId) = OK
resolveDemandProductIdentityExact = null
→ materialIdentity = null
→ researchEligible = false
→ Price Memory / Phase2 cannot run

P5.12 forbade invent mat.* → STOP.
P5.13 Owner GO: move prerequisite — demand → research → Accept → Price Memory.
```

## Related

- P5.13 entry: `IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md`
- P5.11 zaprawianie LABOR: `IK-MIGRATION-01-P5.11-ZAPRAWIANIE-LABOR.md`
