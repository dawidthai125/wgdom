# IK-MIGRATION-01 P4-REAL — Real Labor Expert (44 trusted Work)

**Status:** **PARTIAL** (runtime truthful · CURRENT HIT majority · research GAP honest · ZERO invent)  
**Date:** 2026-08-15  
**Tip UI:** 2.66.71  
**Depends:** P5.7 COMPLETE (`b7b85a99`) · P4 Labor Expert REUSE  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Objective

```text
44 TRUSTED WORK
→ existing runIkMasterBoqLaborExpert
→ lookupWorkRate CURRENT | MISS
→ runIkLaborGapResearch (LABOR + MISS only)
→ Candidate → Owner Accept REQUIRED (ZERO auto)
```

## Reuse audit (no second Labor Expert)

| FILE | FUNCTION | INPUT | OUTPUT | PERSISTENCE | REUSE |
|------|----------|-------|--------|-------------|-------|
| `boq-shadow-adapter.ts` | `resolveWorkIdentityFromOfferBoqLine` | mapped line | OK + unitRaw | none | identity |
| `classification-gate.ts` | `classifyEstimatorPricingPlane` | workId | LABOR/MATERIAL/COMPOUND | none | A1 |
| `work-rate-lookup.ts` | `lookupWorkRate` | store, workId, unit | CURRENT/STALE/MISSING | OUR RATE in catalog | CURRENT |
| `labor-research-bridge.ts` | `runIkLaborGapResearch` | gap job | REUSE/CANDIDATE/GAP | none until Accept | research |
| `work-rate-accept.ts` | `acceptWorkRateResearchCandidate` | candidate | OUR RATE write | `kw-wgdom-work-catalog` | Owner only |
| `ik-labor-expert.ts` | `runIkMasterBoqLaborExpert` | READY Master BOQ | counts + lines | none | **SSOT** |
| `ik-labor-expert.ts` | `summarizeIkLaborForTrustedWorkLines` | report + trusted ids | slice metrics | none | P4-REAL |

## Live Gate B (prod catalog · 2026-08-15)

| Metric | Value |
|--------|-------|
| MASTER BOQ | **430** |
| TRUSTED WORK INPUT | **44** |
| Plane LABOR / MATERIAL / COMPOUND | **38 / 2 / 4** |
| CURRENT OUR RATE HIT | **31** |
| RESEARCH_GAP (MISS→research→no evidence) | **7** |
| rateStatus NONE (MATERIAL+COMPOUND) | **6** |
| RESEARCH KEYS / CALLS | **2** (`plyta-gk\|m2`, `wykwity\|m2`) |
| EVIDENCE / CANDIDATES | **0** |
| OWNER ACCEPT REQUIRED | **0** |
| ACCEPTED OUR RATE | **0** |
| AUTO-ACCEPT | **NO** |
| ORPHAN RATES | **0** |
| INVENTED RATES | **0** |

### HIT by Work

| Work ID | Lines HIT |
|---------|-----------|
| `cc-w2-mocowanie-aparatow` | 19 |
| `cc-w2-przygotowanie-osprzet` | 8 |
| `cc-w2-przebijanie-otworow` | 4 (incl. P5.7 `otw.`↔`szt`) |

### RESEARCH_GAP (honest — no candidate invent)

| Work ID | Lines | Unit |
|---------|-------|------|
| `cc-w2-plyta-gk-zabudowa` | 6 | m2 |
| `cc-w2-wykwity-zacieki` | 1 | m2 |

### Non-labor trusted (no Labor Expert rate path — Owner classification)

| Work ID | Plane | Lines |
|---------|-------|-------|
| `cc-p0c-w1-zawor-odpowietrzajacy` | MATERIAL | 2 |
| `cc-p0c-w1-zaprawianie-bruzd` | COMPOUND | 4 |

**44 = 31 HIT + 7 GAP + 6 NONE** · coverage PASS.

## Research boundary

Research **only** LABOR + trusted identity + OUR RATE MISS · dedupe `workId|unit`.  
FORBIDDEN: UNKNOWN · MATERIAL · COMPOUND · invent rate from description.

## Owner Accept

Live: **no candidates** → Accept N/A (not FAIL).  
Harness: Accept + second `lookupWorkRate` CURRENT when fixture yields candidate.

## Tests

- `npx vite-node scripts/test-ik-migration-01-p4-real-labor.mjs`
- Live: `scripts/probe-ik-migration-01-p4-real-labor.mjs` (gitignored)

## Forbidden

Position Cost · F5 · Bid · Material Expert · auto-Accept · ATH writer · NG-10 delete · global `ikEntryEnabled` ON.

## NEXT

P5 REAL Material only after Owner GO · optional Owner Accept when research yields candidates for plyta/wykwity.
