# IK Public KNR Research Engine

> **Status:** LOCAL IMPLEMENT (2.66.135) · **NO RELEASE** until Owner GO  
> **SSOT catalog:** `kw-knr-catalog` (reuse — **no second catalog**)  
> **Principle:** Autonomous in **search** · Non-autonomous in **guessing**

## Mapping (Owner vocabulary → existing SSOT)

| Prompt term | Actual SSOT |
|---|---|
| `VERIFIED_PUBLIC` | catalog `PENDING_VERIFY` + evidence `DISCOVERED` |
| `DISCOVERED` | evidence store `discoveryStatus=DISCOVERED` |
| Owner VERIFY / ACTIVE BOM | write-router `VERIFIED` only (KL-6) — **never auto** |
| SYSTEM RESEARCH CACHE write | `stageDiscoveryFactToPendingCatalog` + evidence ingest |

## Flow

```
Tender BOQ podstawa
  → L0 lookupKnrCatalog / evidence (HTTP=0)
       HIT VERIFIED → continue analysis
       PENDING/EVIDENCE → no duplicate · BOM may still HOLD
  → L1 Public discovery engine
       BY_KEY preferred (existing selection)
       PublicKnrSourceRegistry fallback (no NO_SOURCE_SELECTION stop)
       multi-query planner · source scoring · cross-family gate
       runKnrDiscoveryOnDemand (merged allowlist + registry URLs)
       scraper adapters (injected / fixture)
  → extract code + description + unit (BOM only if hard qty)
  → multi-source validate → confidence HIGH still PENDING_VERIFY
  → stage PENDING_VERIFY → reanalysisTargets (tenderId/dwellingId/lineId)
  → reanalyzeRequired → F5 / Auto Gap / Cutover
```

## Files

| File | Role |
|---|---|
| `ik-public-knr-discovery-engine.ts` | `runPublicKnrDiscovery` · BY_KEY+registry · trace |
| `ik-public-knr-source-registry.ts` | `PublicKnrSourceRegistry` · effective allowlist merge |
| `ik-public-knr-scoring.ts` | Source + record scoring |
| `ik-public-knr-validation.ts` | Cross-family gate · multi-source · BOM status |
| `ik-public-knr-research-engine.ts` | `runIkPublicKnrResearch` / Sync (facade) |
| `ik-public-knr-query.ts` | Multi-query planner |
| `ik-public-knr-scraper.ts` | Adapter + paywall skip |
| `ik-public-knr-types.ts` | Telemetry · trace · records |
| `ik-knr-catalog-as-normative.ts` | Catalog → BOM L2 (VERIFIED materials only) |
| `knr-discovery-on-demand.ts` | Existing legal HTTP loop (REUSE) |
| `knr-discovery-allowlist.ts` | Owner HTTPS allowlist (REUSE + registry merge) |

## Production honesty

- Live HTTP for **BY_KEY** allowlist entries **or** registry-matched public `sourceId` (legal gate).
- `NO_SOURCE_SELECTION` is **not** terminal — registry fallback runs first.
- WACETOB / SEKOCENBUD remain **LICENSE_REQUIRED** (not scraped).
- Paywall → skip source, continue next.
- Public BOQ PDF usually yields **KNR SUCCESS · BOM NOT_COMPLETE** (no invent qtyFactor).

## Real-world READ-ONLY

`npx vite-node scripts/real-public-knr-readonly.mjs` — fetch public BIP/gov/university URLs, extract, **no catalog write**.

## Tests

`npx vite-node scripts/test-ik-public-knr-research.mjs` — A–T + registry fallback + cross-family.

## MOPS

Codes like `KNR-W 4-03 1124-01`, `KNR 13-21 0402-03`:

1. Registry selects public BIP/gov/PDF sources when BY_KEY empty → PENDING_VERIFY on extract success  
2. `cw.etics.render` + electrical desc → **IDENTITY_MISMATCH** (no ETICS BOM) + optional KNR evidence  
3. RCD `NO_WORK_ID` → **KNR_EVIDENCE_FOUND + IDENTITY_REQUIRED** (no invented workId)  
4. Same itemCode different catalog (4-03 vs 13-21) → **CROSS_FAMILY_REJECT**

## Write boundary

| Write | Allowed |
|---|---|
| Evidence DISCOVERED / Catalog PENDING_VERIFY | YES (research cache) |
| Catalog VERIFIED / TechPack ACTIVE / PM Accept / P7 / G3 | **NO** |
| Invent materialKey / qtyFactor / workId | **NO** |
