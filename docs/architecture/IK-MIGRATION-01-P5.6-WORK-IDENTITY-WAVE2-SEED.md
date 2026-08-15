# IK-MIGRATION-01 P5.6 — Work Identity Wave 2 Seed

**Status:** COMPLETE (verification · **no new Work Catalog write**)  
**Date:** 2026-08-15  
**Depends:** P5.5 Identity Coverage · existing `catalog-wave-2-ops` · Alias Pack Wave1/Wave2  
**Tip UI:** 2.66.69

## Objective

```text
Owner-approved Catalog Alias Pack (44 hits on ZZK)
→ existing Work Catalog (Wave 1/2 Product IDs)
→ TRUSTED_MATCH (unit OK + Quotes)
→ handoff P4 Labor Expert
```

**NOT:** second Work Catalog · BOQ line→work UI · invent work · Material Identity · pricing · research · auto-Accept.

## Audit verdict (prod KV · 2026-08-15)

| Check | Result |
|-------|--------|
| Prod active works | **460** |
| Wave 2 Product IDs present | **8/8** + useful Quotes **8/8** |
| Wave 1 Pack IDs present | **6/6** + Quotes |
| Distinct products in 44 Alias hits | **7** (all already in catalog) |
| SEED ELIGIBLE (missing work) | **0** |
| SEED CREATED (this release) | **0** |
| Duplicate works | **0** |

### P5.5 vs P5.6 coverage (same tender `08def45d…`, Master BOQ 430)

| Metric | P5.5 probe (empty LS) | P5.6 (prod catalog) |
|--------|----------------------|---------------------|
| TRUSTED WORK | **0** | **34** |
| TRUSTED MATERIAL | **0** | **6** |
| APPROVED ALIAS (text Pack) | **44** | **44** |
| OWNER_MAPPING_POSSIBLE | **44** | **0** |
| IDENTITY GAP | **382** | **85** |
| AMBIGUOUS | — | **291** |
| NON_COST | **4** | **4** |

P5.5 `missingWork=true` was a **probe artifact** (empty `localStorage`), not absence of Wave 2 in prod SSOT.

### Alias → Work matrix (44 line hits → 7 products)

| Alias | Product ID | Hits | Work+Quotes | Trusted lines | Residual |
|-------|------------|------|-------------|---------------|----------|
| mocowanie_aparatow | `cc-w2-mocowanie-aparatow` | 19 | YES | 19 | — |
| przygotowanie_pod_osprzet | `cc-w2-przygotowanie-osprzet` | 8 | YES | 2 | 6× `INVALID_UNIT` (`aparat`≠`szt`) |
| plyta_gk_zabudowa | `cc-w2-plyta-gk-zabudowa` | 6 | YES | 6 | — |
| przebijanie_otworow | `cc-w2-przebijanie-otworow` | 4 | YES | 0 | 4× `INVALID_UNIT` (`otw.`≠`szt`) |
| zaprawianie_bruzd | `cc-p0c-w1-zaprawianie-bruzd` | 4 | YES | 4 | — |
| zawor_odpowietrzajacy | `cc-p0c-w1-zawor-odpowietrzajacy` | 2 | YES | 2 | — |
| wykwity_zacieki | `cc-w2-wykwity-zacieki` | 1 | YES | 1 | — |

**SAFE TO SEED new works:** **NO** (already present — creating again = duplicate / invent risk).

**OWNER_REVIEW_REQUIRED:** 10 Pack hits with Mapper bind + `INVALID_UNIT` — unit semantics, **not** missing Work Identity.

## Source of Wave 2

| Source | Role |
|--------|------|
| A. Existing Work Catalog (`kw-wgdom-work-catalog`) | **SSOT** — already seeded |
| B. `scripts/catalog-wave-2-ops.mjs` | Historical controlled seed + Quotes REUSE |
| C. Alias Pack Wave2 (`alias-pack-wave2.ts`) | Owner-approved text → Product ID |
| D. Quotes | Confirm useful Quotes on existing works — **not** auto-create work |

Quote → new Work Catalog entry: **GAP** (not an approved auto mechanism). Quotes attach only via existing OPS / market import.

## Work Identity contract (REUSE)

`CatalogWork`: `id`, `tradeId`, `namePl`, `unit`, `companyPricePln`, `marketQuotes?`, `keywords`, `active`, `source`, `descriptionPl?`, … — **no** simplified invent object.

## Hard locks

- No `work-001` / `auto-work-from-alias`
- No Material / Price Memory / Castorama path
- No P4 pricing execution in P5.6
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED**
- ATH writer **GAP / NOT IMPLEMENTED**

## Code

- `ik-identity-coverage.ts` — `wave2SeedAudit` (seedCreated always **0** in coverage)
- `ik-entry-conversation.ts` — `IDENTITY_SEED_COMPLETED` · `WORK_IDENTITY_COVERAGE_CHANGED` · `OWNER_REVIEW_REQUIRED`
- Test: `scripts/test-ik-migration-01-p56-wave2-seed.mjs`
- Live audit probe (gitignored): `scripts/probe-ik-migration-01-p56-wave2-seed-audit.mjs`

## NEXT (Owner GO only)

1. Unit Owner decision for `otw.` / `aparat` ↔ catalog `szt` (10 lines) — **not** invent work  
2. Then real P4 Labor hit/research on trusted Work IDs  
3. Then P5 Material hit/research  
4. Then P6 Position Cost / Bid
