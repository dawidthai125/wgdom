# IK-MIGRATION-01 P5.13 — Allowlist

**Date:** 2026-08-15

## Allowed

| Path | Role |
|------|------|
| `src/lib/intelligent-estimator/ik-material-expert.ts` | demand research entry (no mat.* invent) |
| `src/lib/intelligent-estimator/index.ts` | export helpers if needed |
| `scripts/test-ik-migration-01-p513-material-research-entry.mjs` | **NEW** Gate A/B/C |
| `scripts/test-ik-migration-01-p512-real-material.mjs` | supersede blocker asserts → entry now allowed |
| `docs/architecture/IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md` | AUDIT/RCA/PLAN/DF |
| `docs/architecture/IK-MIGRATION-01-P5.13-ALLOWLIST.md` | this file |
| `docs/architecture/IK-MIGRATION-01-P5-MATERIAL-EXPERT.md` | contract pointer |
| `docs/architecture/IK-MIGRATION-01-P5.12-REAL-MATERIAL-ODPOWIETRZNIK.md` | superseded note |
| `src/app/changelog-data.ts` | tip **2.66.75** |
| `CHANGELOG.md` | tip line |
| `docs/AI/09_PRODUCTION_BASELINE.md` | tip SSOT §1 only if release |

## Forbidden

Payroll · cloud-sync · F5 · Bid · PDF · ATH · NG-10 · D · P4 · zaprawianie · MaterialExpertV2 · invent `mat.*` / `cw.product.*` · unrelated WIP · `git add -A`
