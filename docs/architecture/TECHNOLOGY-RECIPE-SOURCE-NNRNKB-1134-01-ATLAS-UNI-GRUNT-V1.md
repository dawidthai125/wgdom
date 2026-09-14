# SOURCE PACK — NNRNKB 202 1134-01 ATLAS UNI-GRUNT V1

> **Owner GO:** YES · AUT-BOM priming · 2026-09-14  
> **Authority type:** `NORMAL_TECHNOLOGY_PACK`  
> **Evidence class:** PUBLIC cost-estimate observation (≠ licensed NNRNKB book)

## Identity

| Field | Value |
|-------|-------|
| CatalogWork | `cw.knr.nnrnkb.1134-01.m2` |
| PackId | `pack.priming.nnrnkb_1134_01_v1` |
| Unit | m2 |
| Orientation | horizontal / sufity |
| Description | Gruntowanie podłoży preparatami Ceresit CT 17 i Atlas Uni-Grunt — powierzchnie poziome |

## Material identity

| Field | Value |
|-------|-------|
| Selected material | **ATLAS UNI-GRUNT** |
| materialKey | `mat.atlas_uni_grunt` |
| Explicit non-identity | `mat.grunt` (economy latex primer) · CT17 (not aliased) |

NNRNKB text lists CT17 **or** Atlas Uni-Grunt as accepted preparations under the same catalog item. Recipe persists the observed product **ATLAS UNI-GRUNT** only.

## Evidence

| Source | Type | Finding |
|--------|------|---------|
| ZUT public tender cost estimate | public institution | NNRNKB 202 **1134-01**: ATLAS UNI GRUNT **0.21 dm³/m²**, labour **0.06 r-g/m²** |
| ATLAS official product page | manufacturer | product exists; typical 0.05–0.2 **kg/m²** — **NOT** used as recipe factor |

## Recipe (production BOM)

| Material | Key | Unit | qtyFactor | Status |
|----------|-----|------|-----------|--------|
| ATLAS UNI-GRUNT | `mat.atlas_uni_grunt` | l | **0.21** | Owner GO · PUBLIC_COST_ESTIMATE_OBSERVED |

- **dm³ = L** · **no kg/m² density conversion**
- labour[] 0.06 h/m² tech ≠ OUR RATE (Finance = **1.04**)

## Explicit non-authority

- NOT `pack.priming.economy_interior_v1` / `legacy-gruntowanie-m2`
- NOT economy factor 0.10 L/m²
- NOT `mat.grunt`
- NOT 1134-02 collapse
- NOT licensed NNRNKB book claim
