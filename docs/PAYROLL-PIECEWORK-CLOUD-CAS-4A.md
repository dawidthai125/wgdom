# PAYROLL AKORD — Piecework Cloud CAS (Phase 4A)

**Status:** Phase 4A — Cloud CAS + advance-cap invariant only (no UI / payable).

## Keys

| Key | Role |
|-----|------|
| `kw-payroll-piecework` | Durable piecework state (jobs / allocations / advances) |
| `kw-payroll-piecework-meta` | `{ pieceworkRevision, updatedAt }` — **not** payroll week revision |

## Client write path

`pushPayrollPieceworkToCloudSafe` (intercepted from `pushKeysToCloud` / `pushKeyToCloud`):

1. Fetch Cloud piecework + meta (fail closed if unreadable)
2. `preparePieceworkServerWrite(cloud, candidate)` — Phase 2 merge ∪ then cap check
3. CAS `batch-set` with `pieceworkCas: true` + `expectedPieceworkRevision`
4. On `piecework_stale_revision` → re-fetch → rebase candidate onto Cloud → retry (max **3**)
5. On `piecework_invariant_violated` → throw (no blind retry)
6. Non-CAS / legacy piecework writes → Edge **409** `piecework_legacy_client_rejected`

## Edge

`batch-set` branch for `kw-payroll-piecework`:

1. Require `pieceworkCas` + `expectedPieceworkRevision`
2. Compare vs `kw-payroll-piecework-meta.pieceworkRevision`
3. Merge Cloud ∪ incoming (union-by-id / LWW / delete-wins — Phase 2)
4. Validate `SUM(active advances) ≤ agreedAmount` per active allocation
5. Pre-commit meta recheck
6. Persist merged state + bump revision atomically in same `mset`

## Invariant

Active advance = row without `deletedAt`. Cap is hard-block (no owner override in 4A).

## Isolation

Piecework CAS is **independent** of `kw-week-employees` / PWRB / `payrollWeekCas`.

## Atomicity note

Same optimistic-revision class as work-catalog / payroll-week CAS (KV upsert + revision check). Not a Postgres row-level CAS primitive. Residual multi-writer TOCTOU between recheck and upsert is the same residual as existing catalog CAS.

## Tests

`npx vite-node scripts/test-payroll-piecework-cas-p4a.mjs`
