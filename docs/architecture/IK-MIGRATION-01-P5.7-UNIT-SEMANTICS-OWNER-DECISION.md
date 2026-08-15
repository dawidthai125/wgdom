# IK-MIGRATION-01 P5.7 — Unit Semantics / Owner Decision

**Status:** **COMPLETE** (Owner GO G1+G2 ACCEPT · local allowlist only)  
**Date:** 2026-08-15  
**Tip UI:** 2.66.70  
**Depends:** P5.6 `d31fa822`  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Owner decision (APPROVED)

| Group | Mapping | Work ID | Lines | Decision |
|-------|---------|---------|-------|----------|
| **G1** | `otw.` ↔ `szt` | `cc-w2-przebijanie-otworow` | 4 | ACCEPT |
| **G2** | `aparat` ↔ `szt` | `cc-w2-przygotowanie-osprzet` | 6 | ACCEPT |

## Implementation (local — NOT global)

| File | Role |
|------|------|
| `src/lib/catalog-coverage/owner-unit-compatibility.ts` | Owner allowlist · `resolveOwnerWorkUnitCompatibility` |
| `src/lib/tender-position-cost/boq-shadow-adapter.ts` | Apply before `INVALID_UNIT` · preserve `unitRaw` |
| `ik-identity-coverage` / EC | `unitCompatibilityConfirmed` · `UNIT_COMPATIBILITY_CONFIRMED` |

**Hard locks:**

- `normalizeWgdomCostUnit` **unchanged** (no `otw`/`aparat`)
- `WM_UNIT_ALIAS_TO_SZT` **not** identity SSOT
- quantity **unchanged** (1:1 count)
- source unit on Master BOQ line **preserved** (`unitRaw` / coverage `unit`)
- no OUR RATE / research / price Accept
- no new Work Catalog entries

## Live result (prod catalog)

| Metric | Before (P5.6) | After (P5.7) |
|--------|---------------|--------------|
| TRUSTED WORK | 34 | **44** |
| TRUSTED MATERIAL | 6 | **6** |
| UNIT COMPAT CONFIRMED | 0 | **10** |
| INVALID_UNIT Pack | 10 | **0** |
| Master BOQ | 430 | **430** |

## Tests

`npx vite-node scripts/test-ik-migration-01-p57-unit-semantics.mjs`

## ATH writer

**GAP / NOT IMPLEMENTED**

## NEXT

P4 real Labor on trusted Work identities (44 lines eligible for lookupWorkRate / research on MISS).
