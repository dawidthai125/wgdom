# SOURCE PACK — KNR 2-02 0815-05 GYPSUM SKIM CEILING V1

> **Owner GO:** YES · TPI/729 · 2026-09-13  
> **Authority type:** `NORMAL_TECHNOLOGY_PACK`  
> **Research:** `.tmp/go-tpi729-0815-05-bom-authority-research.json`

## Identity

| Field | Value |
|-------|-------|
| SystemId | `KNR_2-02_0815-05_GYPSUM_SKIM_CEILING_V1` |
| CatalogWork | `cw.knr.knr-2-02.0815-05.m2` |
| PackId | `pack.gypsum_skim.ceiling_0815_05_v1` |
| Unit | m2 |
| Description | Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach z elementów prefabrykowanych i betonów wylewanych |

## Evidence

| Source | Type | Finding |
|--------|------|---------|
| BIP Kraków zid=134490 | BIP / public institution | KNR 2-02 0815/05: Gips budowlany szpachlowy **2.5 kg/m²**, woda 0.00175 m³/m², mat. pomocnicze 1.5%; labor r-g (≠ OUR RATE) |
| URL | | https://www.bip.krakow.pl/plik.php?mode=shw&new=t&wer=0&zid=134490 |

## Recipe (production BOM)

| Material | Key | Unit | qtyFactor | Status |
|----------|-----|------|-----------|--------|
| Gładź gipsowa | `mat.gladz_gipsowa` | kg | **2.5** | Owner-GO-approved for ACTIVE pack · **PROVISIONAL** pending licensed KNR book confirmation |

### Model constraints (not invented away)

- **Water:** no existing `mat.woda` in material map — omitted (same as painting/priming packs).
- **1.5% auxiliares:** TF has no separate % engine (`wastePolicy` = included_in_factor \| none) — not modeled as a second line; primary 2.5 kg/m² not silently inflated.
- **Labour lines:** empty — Finance labor from OUR RATE on CatalogWork; BIP hours are technology norms only.

## Explicit non-authority

- NOT `LABOR_ONLY_AUTO_BOM_V1`
- NOT Owner labor-only allowlist
- NOT `pack.painting.economy_interior_white_v1`
- NOT 0815-04 / 0815-06 qty reuse

## Layer split

- **CLLR** = identity (compound → labor leaf). Production Orchestra IdentityPhase passes `packs=undefined` so ALLB is optional-skipped.
- **TechnologyPack** = BOM / technology (leaf-exact `steps[].catalogWorkId` only — do **not** bind `legacy-gladzie_tynki-m2` in steps, or non-ceiling parent lines would inherit this recipe).
- **Finance** = consumes resolved BOM via `ensureBaselineTechnologyPacksRegistered` + OUR RATE + material sell.
- Injecting this leaf-only pack into CLLR `packs[]` → ALLB_BLOCK (`LEAF_PACK_NOT_BOUND`) — expected; not a Finance defect.
