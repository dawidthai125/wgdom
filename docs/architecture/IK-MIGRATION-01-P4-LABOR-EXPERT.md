# IK-MIGRATION-01 P4 — Labor Expert (Work Identity → CURRENT / Research)

**Status:** IMPLEMENTATION · Owner GO P4 APPROVED  
**Date:** 2026-08-15  
**Depends:** P3 Classification COMPLETE

## Objective

```text
Master BOQ line
→ mapOfferBoqLine (Product Mapper / Alias)
→ resolveWorkIdentityFromOfferBoqLine
→ classifyEstimatorPricingPlane (A1)
→ lookupWorkRate (CURRENT / MISS)
→ runIkLaborGapResearch (MISS only · LABOR only)
→ Candidate → Owner Accept REQUIRED (ZERO auto-Accept)
```

## Reuse audit

| FILE | FUNCTION | INPUT | OUTPUT | PERSISTENCE | OWNER | REUSE |
|------|----------|-------|--------|-------------|-------|-------|
| `tender-offer-boq-mapping.ts` | `mapOfferBoqLine` | OfferBoqLine + works | mapped line + catalogWorkId | none | Product Mapper | **SSOT identity producer** |
| `boq-shadow-adapter.ts` | `resolveWorkIdentityFromOfferBoqLine` | mapped line | OK / NO_IDENTITY / AMBIGUOUS | none | F5 shadow | **import-only** |
| `classification-gate.ts` | `classifyEstimatorPricingPlane` | workId | LABOR/MATERIAL/COMPOUND/UNKNOWN | none | A1 | SSOT plane |
| `work-rate-lookup.ts` | `lookupWorkRate` | store, workId, unit | CURRENT/STALE/MISSING | catalog OUR RATE | Work Catalog | CURRENT path |
| `labor-research-bridge.ts` | `runIkLaborGapResearch` | IkLaborGapJob | REUSE/CANDIDATE/GAP | none (Accept separate) | IK W2 | Research |
| `work-rate-accept.ts` | `acceptWorkRateResearchCandidate` | candidate | OUR RATE write | `kw-wgdom-work-catalog` | Accept | **not auto in P4** |
| `ik-labor-expert.ts` | `runIkMasterBoqLaborExpert` | READY Master BOQ | counts + per-line | none | IK P4 | **NEW thin orchestration** |

## Research boundary

Research **only** when:

- trusted work identity (`resolve` status OK)
- plane **LABOR** (Owner seed)
- OUR RATE **MISS** (or STALE)
- deduped by `workId|unit`

**Forbidden:** research for UNRESOLVED / UNKNOWN / MATERIAL / COMPOUND.

## Counts (line coverage)

Every Master BOQ line → exactly one bucket:

`LABOR` | `NON_LABOR` | `BOTH` | `UNRESOLVED` | `NON_COST`

Sum must equal input (430 on live ZZK).

## Tests

- `npx vite-node scripts/test-ik-migration-01-p4-labor-expert.mjs`
- Live: `npx vite-node scripts/probe-ik-migration-01-p4-labor-expert.mjs` (gitignored probe-*)

## Forbidden

Material Expert · F5/Bid · Position Cost · auto-Accept · ATH writer · NG-10 delete · invent identity from namePl alone.
