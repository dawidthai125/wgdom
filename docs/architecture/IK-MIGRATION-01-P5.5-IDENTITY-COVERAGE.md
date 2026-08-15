# IK-MIGRATION-01 P5.5 — Real Identity Coverage (Work + Material)

**Status:** IMPLEMENTATION / AUDIT-DRIVEN · Owner GO P5.5 APPROVED  
**Date:** 2026-08-15  
**Depends:** P4 Labor + P5 Material COMPLETE  
**Tip UI:** 2.66.68

## Objective

```text
Master BOQ (430)
→ existing identity mechanisms (REUSE only)
→ coverage matrix + EC facts
→ handoff readiness for P4/P5
```

**NOT:** pricing · research · Position Cost · Bid · invent from namePl · fuzzy auto-trust.

## Reuse audit

| Mechanism | File | Role | Trusted? |
|-----------|------|------|----------|
| Product Mapper | `mapOfferBoqLine` | Bind `catalogWorkId` | TRUSTED_MATCH only (`alias`/`exact_knr`/`catalog_map`/`manual`) · **Quotes gate** blocks bind without useful Quotes |
| Work identity | `resolveWorkIdentityFromOfferBoqLine` | OK / AMBIGUOUS / NO_IDENTITY | SSOT for Work |
| Catalog Alias Pack | `resolveCatalogCoverageAlias` | Owner-approved text → productId | Text hit ≠ Mapper bind when missing work/Quotes |
| Material exact | `resolveDemandProductIdentityExact` | mat.* / exact alias / product cw | SSOT for Material |
| Labor identity registry | `resolveLaborIdentityMapping` | exact_normalized research attach | CR/KB source names — **not** BOQ przedmiar SSOT |
| Owner dwelling map | `documentToDwelling` | document → dwelling | **Not** line→workId |

## Hard locks

- namePl ≠ trusted identity
- ZERO `runIkLaborGapResearch` / `executeMaterialResearchPhase2` in P5.5
- ZERO auto-Accept
- Quotes gate on Mapper **unchanged** (no silent bind without Quotes)

## Primary status (exclusive · sum = N)

`NON_COST` · `TRUSTED_WORK` · `TRUSTED_MATERIAL` · `TRUSTED_BOTH` · `APPROVED_ALIAS` · `OWNER_MAPPING_POSSIBLE` · `AMBIGUOUS` · `IDENTITY_GAP`

## Tests

- `npx vite-node scripts/test-ik-migration-01-p55-identity-coverage.mjs`
- Live: `npx vite-node scripts/probe-ik-migration-01-p55-identity-coverage.mjs` (gitignored probe-*)

## Expected live outcome

ZZK `08def45d…` may remain **0 trusted** Work/Material identities — **truthful** when Alias Pack misses wording and/or Quotes gate blocks bind. P5.5 closes **PARTIAL** if coverage insufficient for P6.
