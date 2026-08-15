# IK-MIGRATION-01 P5.11 — Allowlist

**Date:** 2026-08-15  
**Owner GO:** `cc-p0c-w1-zaprawianie-bruzd` COMPOUND → LABOR · remove MATERIALS_REQUIRED (scoped)

## Allowlist

| Path | Change |
|------|--------|
| `src/lib/intelligent-estimator/owner-classification-map.ts` | plane LABOR · counts LABOR+1 COMPOUND−1 |
| `src/lib/tender-position-cost/labor-only-classification.ts` | remove workId from MATERIALS_REQUIRED |
| `src/lib/tender-position-cost/wave1-materials-required.ts` | remove pending row (folia remains) |
| `src/lib/intelligent-estimator/ik-material-identity-p59.ts` | LABOR plane → not material blocker |
| `scripts/test-ik-migration-01-p511-zaprawianie-labor.mjs` | **NEW** P5.11 |
| `scripts/test-ik-migration-01-p59-material-identity.mjs` | zaprawianie no longer PENDING |
| `scripts/test-ik-migration-01-p5-real-material.mjs` | zaprawianie LABOR_SKIPPED |
| `scripts/test-work-rate-kb-bruzdy-policy-01.mjs` | Gate LABOR allows research |
| `docs/architecture/IK-MIGRATION-01-P5.11-ZAPRAWIANIE-LABOR.md` | closeout |
| `docs/architecture/IK-MIGRATION-01-P5.11-ALLOWLIST.md` | this file |
| `src/app/changelog-data.ts` | tip 2.66.74 |
| `CHANGELOG.md` | tip |

## Forbidden

Payroll · cloud-sync · F5 · Bid · PDF · ATH · NG-10 · Material research Phase2 · Price Memory · unrelated WIP · other MATERIALS_REQUIRED IDs (folia stays).
