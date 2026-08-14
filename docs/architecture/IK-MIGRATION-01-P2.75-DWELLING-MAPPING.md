# IK-MIGRATION-01 P2.75 — Dwelling / address mapping

> **STATUS:** SUPERSEDED by P2.75-B COMPLETE — see [`IK-MIGRATION-01-P2.75-B-OWNER-MAP-READY.md`](./IK-MIGRATION-01-P2.75-B-OWNER-MAP-READY.md)  
> **Date:** 2026-08-15  
> **Tip:** 2.66.64  
> **Real tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Audit (reuse — no duplicate system)

| Question | Answer |
|----------|--------|
| A Authoritative mechanism? | **YES** — `TenderPackage.documentToDwelling` + `dwellings[].sourceDocumentIds` |
| B Persisted? | **YES** — localStorage `kw-multi-dwelling-package-v1` |
| C Local or cloud? | **Local only** (not DATA_KEYS / cloud-sync) |
| D Owner UI? | **YES** — `MultiDwellingPackagePanel` (Hub) |
| E Reuse directly? | **YES** |
| F Compose contract | `buildDwellingDocumentSet` → `resolveDwellingCostSnapshotForPricing` → `mergeDwellingArtifactLines` → `composeDwellingOfferBoq` + `lineProvenance` |

**HARD:** filename / street / lok. = evidence only. Never silent SSOT.

## Allowlist (this release)

- `src/lib/intelligent-estimator/ik-dwelling-mapping.ts` (NEW)
- `src/lib/intelligent-estimator/ik-document-expert.ts`
- `src/lib/intelligent-estimator/ik-entry-conversation.ts`
- `src/lib/intelligent-estimator/index.ts`
- `src/app/TenderWorkflowHubPanel.tsx` (pass `costDocumentIds`)
- `scripts/test-ik-migration-01-p275-dwelling-map.mjs`
- changelog + this doc

## What changed

1. Multi-source **without** complete Owner map → Master BOQ **cannot** be READY (`MULTI_SOURCE_NO_DWELLING_MAP` / `OWNER_MAP_REQUIRED`).
2. Complete Owner map → compose **all** dwellings; `composedLineCount` = sum; integrity vs source; KEEP ONE = explained loss.
3. Candidate hints (Kotlarska / Nasturcjowa / Ptasia / Żernicka / wentylacja) for Owner UI evidence — **never auto-Accept**.
4. Shared/common (wentylacja) → `shared_or_common` candidate → Owner must decide; no invent allocation.
5. EC facts: `DWELLING_MAP_REQUIRED` / `DWELLING_MAP_COMPLETE` / `LINE_INTEGRITY_*`.

## Live tender Gate B

| Metric | Value |
|--------|-------|
| EXTRACTED LINES (P2.5) | **484** |
| Authoritative Owner map in repo | **NO** (would invent from filenames) |
| MASTER BOQ | **PARTIAL / HOLD** until Owner maps in Hub |
| NEXT for READY | Owner: enable multi → confirm dwellings → map each cost artifact (incl. shared/wentylacja decision) |

## Out of scope

Classification / Labor / Material research / ATH writer / NG-10 delete / D / cloud persist of package.
