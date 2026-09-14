# MATERIAL IDENTITY BLOCK — NNRNKB 1134-01 / 1134-02 (AUT-BOM 2026-09-14)

> **Status:** `MATERIAL_IDENTITY_REQUIRED` · packs **NOT** created  
> **Owner GO:** AUT-BOM 4 leaves · factors observed but identity gate FAIL

## Observed factors (held — not implemented)

| Leaf | Factor | Labour | Source material wording |
|------|--------|--------|-------------------------|
| `cw.knr.nnrnkb.1134-01.m2` | 0.21 L/m² | 0.06 r-g/m² | CT17 / Atlas Uni-Grunt · horizontal |
| `cw.knr.nnrnkb.1134-02.m2` | 0.22 L/m² | 0.08 r-g/m² | CT17 / Atlas Uni-Grunt · vertical |

## Why blocked

Repository taxonomy **explicitly excludes** CT17 / Atlas Uni-Grunt from `mat.grunt`:

- `docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md` — CT17 / Atlas Uni-Grunt = **OUT** of ECONOMY_INTERIOR_PRIMER_V1 (`mat.grunt` = lateksowa farba podkładowa)
- `scripts/test-technology-recipe-consumption-priming-01.mjs` — CT17 / Atlas → **no** `mat.grunt`
- S4 alias is „Grunt uniwersalny” / „Grunt podłoża” — **not** named CT17 / Atlas Uni-Grunt

Owner GO forbids inventing a new material key in this step.

## Required before next GO

Owner-approved material identity for deep-penetrating primer (new `mat.*` or explicit taxonomy remap of CT17/Atlas → existing key), then leaf-scoped packs with exact factors above. Keep 1134-01 ≠ 1134-02.
