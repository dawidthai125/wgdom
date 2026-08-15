# IK-MIGRATION-01 P5.12 — Allowlist

**Date:** 2026-08-15  
**Mode:** STOP / honest blocker (no Material Expert V2 · no invent `mat.*`)

## Allowed (this package)

| Path | Role |
|------|------|
| `docs/architecture/IK-MIGRATION-01-P5.12-REAL-MATERIAL-ODPOWIETRZNIK.md` | blocker SSOT + Owner residual |
| `docs/architecture/IK-MIGRATION-01-P5.12-ALLOWLIST.md` | this file |
| `scripts/test-ik-migration-01-p512-real-material.mjs` | honesty Gate A/B/C tests |

## Explicitly NOT touched

- Payroll / cloud-sync / F5 / Bid / PDF / ATH writer / NG-10
- P4 Labor / zaprawianie classification
- Product Mapper invent (`mat.*` / `cw.product.*` / aliases)
- `acceptMaterialResearchCandidate` auto-call
- Material Expert V2
- `ikEntryEnabled` (stays OFF)
- Unrelated WIP in working tree
