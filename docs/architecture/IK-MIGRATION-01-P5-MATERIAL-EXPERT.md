# IK-MIGRATION-01 P5 — Material Expert (Identity → Price Memory → Research)

**Status:** IMPLEMENTATION · Owner GO P5 APPROVED  
**Date:** 2026-08-15  
**Depends:** P4 Labor Expert COMPLETE

## Objective

```text
Master BOQ line
→ mapOfferBoqLine (Product Mapper)
→ resolveDemandProductIdentityExact (trusted material identity)
→ evaluateMaterialCache / Price Memory (HIT → reuse)
→ executeMaterialResearchPhase2 (MISS only · never auto-Accept)
→ Candidate → Owner Accept REQUIRED → Price Memory persist
```

## Reuse audit

| FILE | FUNCTION | INPUT | OUTPUT | PERSISTENCE | OWNER | REUSE |
|------|----------|-------|--------|-------------|-------|-------|
| `material-market-map.ts` | `resolveDemandProductIdentityExact` | materialKey / exact alias / product cw | identity or null | none | PE map | **SSOT identity** |
| `market-material-research-cache.ts` | `evaluateMaterialCache` | materialKey + worksById | CURRENT / STALE / MISSING | Quotes | Price Memory | **HIT gate** |
| `market-material-research-wire.ts` | `executeMaterialResearchPhase2` | demand + lease | candidate · autoAccepted:false | none | MMR-02 | **Research** |
| `market-material-research-orchestrate.ts` | `acceptMaterialResearchCandidate` | PriceCandidate | Quotes commit | `kw-wgdom-work-catalog` | Accept | **Owner only** |
| `diy-selective-lookup-client.ts` | DIY Edge | selective | product/price | none | Legal/D1 | via Phase2 provider |
| `ik-material-expert.ts` | `runIkMasterBoqMaterialExpert` | READY Master BOQ | counts + per-line | none | IK P5 | **NEW thin orchestration** |

## Research boundary

Research **only** when:

- trusted material identity (`resolveDemandProductIdentityExact`)
- plane ≠ LABOR
- Price Memory **MISSING** (not CURRENT)
- deduped by `materialKey|region`

**Forbidden:** research for UNKNOWN without identity · invent SKU from namePl · auto-Accept.

## Counts (line coverage)

Every Master BOQ line → exactly one bucket:

`MATERIAL` | `LABOR` | `BOTH` | `UNRESOLVED` | `NON_COST`

Sum must equal input (430 on live ZZK).

## Live tender

`08def45d-ead6-5db8-962b-120001d33d37` — may truthfully show **0** material identities (no invent). Harness proves HIT / MISS→research→Accept→second lookup.

## P5.12 (2026-08-15) — odpowietrznik REAL STOP

Focus 2 × `cc-p0c-w1-zawor-odpowietrzajacy`: Work plane MATERIAL OK, but
`resolveDemandProductIdentityExact = null` → existing Material Expert cannot run
Price Memory / Phase2 without inventing `mat.*`. Owner Leroy/Castorama evidence
stays outside the pipeline until Owner-approved identity. See
[`IK-MIGRATION-01-P5.12-REAL-MATERIAL-ODPOWIETRZNIK.md`](./IK-MIGRATION-01-P5.12-REAL-MATERIAL-ODPOWIETRZNIK.md).

## Tests

- `npx vite-node scripts/test-ik-migration-01-p5-material-expert.mjs`
- Live: `npx vite-node scripts/probe-ik-migration-01-p5-material-expert.mjs` (gitignored probe-*)

## Forbidden

Labor rewrite · F5/Bid · Position Cost · auto-Accept · ATH writer · NG-10 delete · invent product from namePl alone.
