# IK-MIGRATION-01 P5 — Material Expert (Identity → Price Memory → Research)

**Status:** IMPLEMENTATION · Owner GO P5 APPROVED  
**Date:** 2026-08-15  
**Depends:** P4 Labor Expert COMPLETE

## Objective

```text
Master BOQ line
→ mapOfferBoqLine (Product Mapper)
→ resolveDemandProductIdentityExact (product identity · optional)
→ evaluateMaterialCache / Price Memory (HIT → reuse)
   · product identity OR work-anchored catalogWorkId (P5.13)
→ executeMaterialResearchPhase2 (MISS only · never auto-Accept)
   · materialKey|region OR demand.work.<workId>|region
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

Research when:

- **(A)** trusted product identity (`resolveDemandProductIdentityExact`) + Price Memory MISS, **or**
- **(B)** P5.13 Material Demand: plane MATERIAL + Work Identity + no product mat.* → coordination key `demand.work.<workId>` → Supplier Research (never auto-Accept)

Also: plane ≠ LABOR · Price Memory **MISSING** (not CURRENT) · deduped by research key|region.

**Forbidden:** invent SKU/brand/price from namePl · research on LABOR · Material Expert V2 · auto-Accept.

## Counts (line coverage)

Every Master BOQ line → exactly one bucket:

`MATERIAL` | `LABOR` | `BOTH` | `UNRESOLVED` | `NON_COST`

Sum must equal input (430 on live ZZK).

## Live tender

`08def45d-ead6-5db8-962b-120001d33d37` — may truthfully show **0** product material identities (no invent). Harness proves HIT / MISS→research→Accept→second lookup.

## P5.12 / P5.13 (2026-08-15) — odpowietrznik

P5.12 documented identity-before-research **BLOCKED**. P5.13 Owner GO opens demand→research
without inventing `mat.*`. See
[`IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md`](./IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md).

## Tests

- `npx vite-node scripts/test-ik-migration-01-p5-material-expert.mjs`
- Live: `npx vite-node scripts/probe-ik-migration-01-p5-material-expert.mjs` (gitignored probe-*)

## Forbidden

Labor rewrite · F5/Bid · Position Cost · auto-Accept · ATH writer · NG-10 delete · invent product from namePl alone.
