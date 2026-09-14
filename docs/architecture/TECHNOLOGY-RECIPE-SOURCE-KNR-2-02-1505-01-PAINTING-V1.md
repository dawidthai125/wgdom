# SOURCE PACK — KNR 2-02 1505-01 PAINTING V1

> **Owner GO:** YES · AUT-BOM 4 leaves · 2026-09-14  
> **Authority type:** `NORMAL_TECHNOLOGY_PACK`  
> **Evidence class:** PUBLIC cost-estimate observation (≠ licensed KNR book)

## Identity

| Field | Value |
|-------|-------|
| CatalogWork | `cw.knr.knr-2-02.1505-01.m2` |
| PackId | `pack.painting.knr_2_02_1505_01_v1` |
| Unit | m2 |
| Description | Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych — tynków gładkich bez gruntowania |

## Evidence

| Source | Type | Finding |
|--------|------|---------|
| Exact public cost estimate | public | KNR 2-02 **1505-01**: farba emulsyjna **0.2891 dm³/m²**, labour **0.1391 r-g/m²**, aux 1.5% |

## Material identity

Source wording = **farba emulsyjna**. Repository has **no** separate `mat.farba_emulsyjna`.

Accepted key: `mat.farba_lateksowa_wewnetrzna` because:

1. S4 Owner GO — **sole paint product** in `material-market-map`
2. `TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1` technology line: **interior white emulsion / acrylic** → that key

## Recipe (production BOM)

| Material | Key | Unit | qtyFactor | Status |
|----------|-----|------|-----------|--------|
| Farba emulsyjna (sole paint product) | `mat.farba_lateksowa_wewnetrzna` | l | **0.2891** | Owner GO · PUBLIC_COST_ESTIMATE_OBSERVED |

- Two coats baked into factor — no `coats` selector.
- Aux 1.5% omitted · labour[] tech ≠ OUR RATE (Finance = 1.18).

## Explicit non-authority

- NOT economy `0.166667`
- NOT 1505-03 / 1505-05 / 1505-07 substitution
- NOT licensed KNR book claim
- NOT OUR RATE invent from r-g
