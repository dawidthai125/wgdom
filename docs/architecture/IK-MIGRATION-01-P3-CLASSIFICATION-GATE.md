# IK-MIGRATION-01 P3 — Classification Gate (Master BOQ → plane)

**Status:** IMPLEMENTATION · Owner GO P3 APPROVED  
**Date:** 2026-08-15  
**Tip:** bump with release (`changelog-data` / `09`)

## Objective

Master BOQ **READY** → existing **Classification Gate** → plane + handoff flags for Labor/Material experts.

**NOT:** pricing · research · Bid · F5 · Position Cost · auto-Accept.

## Reuse (SEARCH FIRST)

| FILE | FUNCTION | INPUT | OUTPUT | RUNTIME OWNER | REUSE |
|------|----------|-------|--------|---------------|-------|
| `classification-gate.ts` | `classifyEstimatorPricingPlane` | workId / materialKey / namePl / unit | `EstimatorClassifyResult` | A1 Owner seed | **SSOT — do not fork** |
| `classification-types.ts` | `EstimatorPricingPlane` | — | `LABOR` \| `MATERIAL` \| `COMPOUND` \| `UNKNOWN` | Design Freeze | Taxonomy (COMPOUND≡BOTH, UNKNOWN≡UNRESOLVED) |
| `owner-classification-map.ts` | `getOwnerClassificationPlane` | workId | plane \| null | Frozen 89 seeds | Authority A1 |
| `ik-document-expert.ts` | `runIkDocumentExpert` | item + package | Master BOQ + `masterBoqLines[]` | Document Expert | Input contract READY |
| `ik-classification.ts` | `runIkMasterBoqClassification` | READY expert lines | counts + per-line classify | IK P3 orchestration | **NEW thin layer** |
| `ik-entry-conversation.ts` | EC facts | classification report | CLASSIFICATION_* events | Expert Conversation | Extend existing surface |

## Path

```text
MultiDwellingPackagePanel / applyExplicitOwnerDwellingMap
  → Document Expert Master BOQ READY (composed lines + dwellingId)
  → runIkMasterBoqClassification
  → classifyEstimatorPricingPlane (A1)
  → handoff: LABOR_READY_FOR_EXPERT | MATERIAL_READY_FOR_EXPERT | BOTH_HOLD | UNRESOLVED
  → Expert Conversation facts (sourceRef kind=classification)
```

## A1 truth

Without `catalogWorkId` / `mat.*` on composed lines → **UNKNOWN (UNRESOLVED)**.  
Never invent LABOR/MATERIAL from `namePl`. Research starts in **P4+**.

## Gates

- **Gate A:** `ikEntryEnabled=false` → NG-10  
- **Gate B:** real tender `08def45d-…` · 430 lines · reconcile · provenance · dwelling · branch  

## Tests

- `npx vite-node scripts/test-ik-migration-01-p3-classification.mjs`
- Live: `npx vite-node scripts/probe-ik-migration-01-p3-classification.mjs`

## Forbidden

ATH writer · NG-10 delete · F5/Bid · Castorama/Leroy/OBI · OUR RATE / Price Memory writes · `expertAiDecydentEnabled` as IK switch.
