# SOURCE PACK — KNR 4-01 1204-02 PAINTING V1

> **Owner GO:** YES · AUT-BOM 4 leaves · 2026-09-14  
> **Authority type:** `NORMAL_TECHNOLOGY_PACK`  
> **Evidence class:** PUBLIC cost-estimate observation (≠ licensed KNR book)

## Identity

| Field | Value |
|-------|-------|
| CatalogWork | `cw.knr.knr-4-01.1204-02.m2` |
| PackId | `pack.painting.knr_4_01_1204_02_v1` |
| Unit | m2 |
| Description | Dwukrotne malowanie farbami lateksowymi starych tynków wewnętrznych ścian |

## Evidence

| Source | Type | Finding |
|--------|------|---------|
| BIP CKZiU / official public cost estimate | public institution | KNR 4-01 1204-02: Farba lateksowa wewnętrzna **0.286 dm³/m²**, labour **0.119 r-g/m²**, aux 2% |
| BIP Przemyśl | public | KNR 4-01 1204/02: **0.286 dm³/m²** farba lateksowa |

## Recipe (production BOM)

| Material | Key | Unit | qtyFactor | Status |
|----------|-----|------|-----------|--------|
| Farba lateksowa wewnętrzna | `mat.farba_lateksowa_wewnetrzna` | l | **0.286** | Owner GO · PUBLIC_COST_ESTIMATE_OBSERVED |

- **dm³ = L** for liquid paint.
- **Two coats** baked into KNR factor — no `coats` selector (deterministic leaf).
- **Aux 2%:** omitted (no % engine).
- **labour[]:** 0.119 h/m² technology norm ≠ OUR RATE (Finance = CatalogWork 3.72).

## Explicit non-authority

- NOT economy Policy-B `0.166667`
- NOT `legacy-malowanie-m2` bind
- NOT licensed KNR book claim
- NOT OUR RATE invent from r-g
