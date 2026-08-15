# IK-MIGRATION-01 P5.13 — Material Research Entry (demand without materialKey)

**Status:** COMPLETE (design freeze implemented)  
**Date:** 2026-08-15  
**Tip:** **2.66.75**  
**Baseline:** P5.12 BLOCKED (`cab5810f`) · tip **2.66.74**  
**Owner GO:** APPROVED (supplier research = intended core function)

## AUDIT (verified)

| Gate | Result for `cc-p0c-w1-zawor-odpowietrzajacy` |
|------|-----------------------------------------------|
| MATERIAL plane | OK |
| `assertMaterialResearchAllowed(workId)` | OK |
| `resolveDemandProductIdentityExact` | **null** (no invent) |
| P5.12 ME entry | blocked at `researchEligible` requiring identity |
| `lookupPriceMemory` / `evaluateMaterialCache` | already resolve by **`catalogWorkId`** when work exists in `worksById` (materialKey optional) |
| `executeMaterialResearchPhase2` | needs non-empty `PriceDemandRecord.materialKey` for lease/cooldown/plumbing |
| Accept | writes Quotes to `candidate.catalogWorkId` (existing contract) |

## RCA

```text
ROOT CAUSE:
  IK Material Expert gated Supplier Research on product identity
  (resolveDemandProductIdentityExact) BEFORE research.

DESIRED CONTRACT:
  Material Demand (Work + description + unit + MATERIAL plane)
  → Price Memory if resolvable (identity OR workId quotes)
  → else Supplier Research
  → Candidate → Owner Accept → Price Memory on catalogWorkId

NOT ROOT CAUSE:
  Legal/supplier permission (Owner: Leroy/Castorama/OBI/TIM/Onninen approved)
  Missing Material Expert V2
```

## PLAN (smallest extension)

1. **Reuse** `runIkMasterBoqMaterialExpert` · Phase2 · Accept · Price Memory · providers.
2. Add **demand research coordination key** `demand.work.<workId>` — **not** a product `mat.*` invent.
3. When plane **MATERIAL** + trusted Work Identity + no product identity:
   - `evaluateMaterialCache({ materialKey: "", catalogWorkId: workId })` — no fabricated mat.*
   - CURRENT → HIT
   - else → Phase2 with `materialKey=demand.work.<workId>`, `catalogWorkId=workId`, `normalizedName=description`
4. Keep existing **mat.*** identity path **unchanged**.
5. Boundary: allow research without product identity **only** for MATERIAL + demand key; still forbid LABOR / UNKNOWN invent.
6. **No** MaterialExpertV2 · **no** auto-Accept · **no** invent SKU/price.

## DESIGN FREEZE

| Decision | Freeze |
|----------|--------|
| DF-1 | Demand ≠ product identity; research may start with `materialKey` product = null |
| DF-2 | Coordination key `demand.work.<workId>` is plumbing only — not Owner product invent |
| DF-3 | Price Memory after Accept = Quotes on **Work** `catalogWorkId` (existing Accept) |
| DF-4 | Product `mat.*` / Product Mapper invent **still forbidden** in P5.13 |
| DF-5 | Zaprawianie LABOR never enters Material Expert research |
| DF-6 | Injected harness evidence (Leroy/Castorama) OK; no hard-coded URLs in ME |
| DF-7 | `ikEntryEnabled` stays OFF default |

## Allowlist

See `IK-MIGRATION-01-P5.13-ALLOWLIST.md`.
