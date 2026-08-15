# IK-MIGRATION-01 P5-REAL — Real Material Expert (ZZK focus)

**Status:** **PARTIAL** (focus 6 verified · ZERO invent mat.* · Accept proven in harness)  
**Date:** 2026-08-15  
**Tip UI:** 2.66.72  
**Depends:** P4-REAL PARTIAL (`2a31f0a7`) · P5 Material Expert REUSE  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Objective

```text
MATERIAL / COMPOUND focus (from P4)
→ existing runIkMasterBoqMaterialExpert
→ resolveDemandProductIdentityExact
→ evaluateMaterialCache CURRENT | MISS
→ executeMaterialResearchPhase2 (MISS only)
→ Candidate → Owner Accept REQUIRED (ZERO auto)
```

## Reuse audit (no second Material Expert)

| FILE | FUNCTION | INPUT | OUTPUT | PERSISTENCE | REUSE |
|------|----------|-------|--------|-------------|-------|
| `tender-offer-boq-mapping.ts` | `mapOfferBoqLine` | BOQ line | alias / product bind | none | Product Mapper |
| `material-market-map.ts` | `resolveDemandProductIdentityExact` | catalogWorkId / name+unit | mat.* or null | none | identity SSOT |
| `market-material-research-cache.ts` | `evaluateMaterialCache` | materialKey, works | CURRENT/STALE/MISS | Price Memory quotes | HIT first |
| `market-material-research-wire.ts` | `executeMaterialResearchPhase2` | demand | candidate / GAP | none until Accept | research |
| `market-material-research-orchestrate.ts` | `acceptMaterialResearchCandidate` | candidate | Price Memory write | work catalog quotes | Owner only |
| `ik-material-expert.ts` | `runIkMasterBoqMaterialExpert` | READY Master BOQ | counts + lines | none | **SSOT** |
| `ik-material-expert.ts` | `summarizeIkMaterialForFocusLines` | report + focus ids | slice metrics | none | P5-REAL |
| `wave1-materials-required.ts` | `isWave1MaterialsRequiredPending` | workId | PENDING_OWNER_NORM | none | COMPOUND contract |

## COMPOUND rule (no invent)

Existing Wave1 contract:

- `cc-p0c-w1-zaprawianie-bruzd` → **MATERIALS_REQUIRED · PENDING_OWNER_NORM**
- No Owner-approved `materialKey` / qtyFactor → **no TechnologyPack**
- P5 must **not** invent SKU/price from description
- Coverage label: **NO_MATERIAL_COMPONENT**

`researchEligible` already allows COMPOUND/BOTH **only when** trusted `materialIdentity` exists. Without identity → priceStatus `NONE` (no research).

## Live Gate B (prod catalog · 2026-08-15)

### Focus from P4 (2 MATERIAL + 4 COMPOUND)

| Metric | Value |
|--------|-------|
| MATERIAL INPUT | **2** (`cc-p0c-w1-zawor-odpowietrzajacy`) |
| COMPOUND MATERIAL INPUT | **4** (`cc-p0c-w1-zaprawianie-bruzd`) |
| TOTAL MATERIAL EXPERT INPUT | **6** |
| MATERIAL IDENTITY RESOLVED | **0** |
| PRICE MEMORY HIT / MISS | **0 / 0** |
| RESEARCH / PRODUCTS / EVIDENCE / CANDIDATES | **0** |
| NO_MATERIAL_COMPONENT | **6** |
| AUTO-ACCEPT | **NO** |

Reason: Wave1 work IDs are **not** `cw.product.*` / `mat.*` map entries; zaprawianie = PENDING_OWNER_NORM; zawór = Owner MATERIAL plane without product Quotes identity. **No invent.**

### Full Master BOQ incidental (not invent, not focus)

| Metric | Value |
|--------|-------|
| materialIdentityResolved | **6** |
| priceMemoryHit | **5** |
| priceMemoryMiss | **1** |
| researchCalls | **1** (`mat.inv.50\|wroclaw`) |
| candidates / evidence | **0** (honest GAP) |

## Tests

- `npx vite-node scripts/test-ik-migration-01-p5-real-material.mjs`
- Live: `scripts/probe-ik-migration-01-p5-real-material.mjs` (gitignored probe pattern)

## Forbidden

Position Cost · F5 · Bid · P4 Labor rewrite · invent mat.* · auto-Accept · ATH writer · NG-10 delete · global `ikEntryEnabled` ON.

## NEXT

P6 Position Cost / Bid only after Owner review of real Labor + Material coverage.
