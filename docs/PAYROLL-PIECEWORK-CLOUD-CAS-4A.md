# PAYROLL AKORD — Piecework Cloud CAS (Phase 4A)

> **STATUS:** **CLOSED / PRODUCTION VERIFIED** (part of **AKORD V1**)  
> **Aktualizacja:** 2026-09-14  
> **Commit:** `0e3fa0cb` · tip chain → **`892e04c4`** / UI **2.66.226**  
> **Payable SSOT (week advances ≠ remaining):** [`PAYROLL-AKORD-PAYABLE-SSOT-4B.md`](PAYROLL-AKORD-PAYABLE-SSOT-4B.md)  
> **Protected week roster:** unchanged — piecework CAS **≠** `kw-week-employees` / PWRB

**Scope note:** 4A delivered Cloud CAS + advance-cap only. UI / archive / PDF / payout semantics completed in later CLOSED phases (see AKORD SSOT §10).

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

UI / domain mutations: `commitPieceworkOp` → above path only (no blind `persistKey` / generic whole-document write for piecework).

## Edge

`batch-set` branch for `kw-payroll-piecework`:

1. Require `pieceworkCas` + `expectedPieceworkRevision`
2. Compare vs `kw-payroll-piecework-meta.pieceworkRevision`
3. Merge Cloud ∪ incoming (union-by-id / LWW / delete-wins — Phase 2)
4. Validate `SUM(active advances) ≤ agreedAmount` per active allocation
5. Pre-commit meta recheck
6. Persist merged state + bump revision atomically in same `mset`

## Invariant

Active advance = row without `deletedAt`. Cap is hard-block (no owner override in V1).

## Isolation

Piecework CAS is **independent** of `kw-week-employees` / PWRB / `payrollWeekCas`.

## Atomicity note

Same optimistic-revision class as work-catalog / payroll-week CAS (KV upsert + revision check). Not a Postgres row-level CAS primitive. Residual multi-writer TOCTOU between recheck and upsert is the same residual as existing catalog CAS.

## Tests

`npx vite-node scripts/test-payroll-piecework-cas-p4a.mjs` — **37 PASS** (closeout evidence).
