# IK-MIGRATION-01 P5.9 — Allowlist (before implement)

**Date:** 2026-08-15  
**Mode:** CONTROLLED SCOPE · Owner GO = investigate/register **only if** existing SSOT evidence

## Evidence verdict (pre-code)

| Group | Question | Verdict |
|-------|----------|---------|
| Zaprawianie ×4 | Existing `materialKey` + `qtyFactor` TechnologyPack? | **NO** — `listWave1RegisteredMaterialsPacks()=[]` · `WAVE1_MATERIALS_REQUIRED_PENDING` · RECIPE DF: no Owner norm catalog |
| Zawór ×2 | Existing `mat.*` / `cw.product.*` for Work? | **NO** — not in `DEFAULT_MATERIAL_MARKET_MAP` · `resolveDemandProductIdentityExact` = null · no invoice `odpowietrz*` |

→ **NO pack register · NO product invent** · classify honest outcomes only.

## Allowlist files

| Path | Change |
|------|--------|
| `src/lib/tender-position-cost/wave1-materials-required.ts` | Expose pending **missing** fields (materialKey/qtyFactor) · packs remain `[]` |
| `src/lib/intelligent-estimator/ik-material-identity-p59.ts` | **NEW** — identity blocker classifier (no pricing) |
| `src/lib/intelligent-estimator/index.ts` | Export P5.9 |
| `src/lib/intelligent-estimator/ik-entry-conversation.ts` | Optional identity GAP facts only |
| `scripts/test-ik-migration-01-p59-material-identity.mjs` | **NEW** — A–Q |
| `docs/architecture/IK-MIGRATION-01-P5.9-MATERIAL-IDENTITY-OWNER-NORM.md` | Closeout |
| `docs/architecture/IK-MIGRATION-01-P5.9-ALLOWLIST.md` | This file |
| `src/app/changelog-data.ts` | Tip bump |
| `CHANGELOG.md` | Tip bump |

## Forbidden (STOP if touched)

Payroll · cloud-sync · F5 · Bid · PDF · ATH writer · NG-10 · P4 Labor · `executeMaterialResearchPhase2` / Accept · invent mat.* / qtyFactor · Price Memory · unrelated WIP.

## Gates

- A: `ikEntryEnabled=false` → NG-10  
- B: real focus 6 → outcome A/B/C/D per line (no invent)  
- C: invented keys/factors/products = 0 · qty/unit/provenance intact  
