# Production Sandbox Harness (TEST-HARNESS-01)

> **Slice:** **H0** foundations only · H1–H5 **NOT IMPLEMENTED**  
> **SSOT:** [`docs/architecture/TEST-HARNESS-01-DESIGN-FREEZE.md`](../../docs/architecture/TEST-HARNESS-01-DESIGN-FREEZE.md)

## Run

```bash
npm run test:prod-sandbox
npm run test:prod-sandbox -- --scenario h0-preflight
npm run test:prod-sandbox -- --scenario h0-preflight --dry-run
```

Via orchestrator (manual / Owner — not in gate B/C):

```bash
npm run test:infra -- --suite prod-sandbox-h0
```

## PSB-001 Cleanup Guarantee (Owner H0)

Every entity **created** by the harness must be cleaned up after **PASS** and after **FAIL**.

| Cleanup result | Exit |
|----------------|------|
| leftovers present | **4** + list of leftover IDs |
| scenario FAIL (cleanup OK) | **3** |
| precondition | **2** |
| PASS | **0** |

Design Freeze table `#PSB-001` (“Never touch non-sandbox”) is enforced by `mutate-guard.mjs`.  
Owner H0 **PSB-001 Cleanup Guarantee** is implemented in `cleanup.mjs` (maps to DF **D9** + **#PSB-005**).

## Allowlist

1. Copy `allowlist.example.json` → `allowlist.json` (gitignored), **or**
2. Set env: `PSB_JOB_IDS`, `PSB_TENDER_IDS`, `PSB_CATALOG_ROW_IDS`, `PSB_PAYROLL_WEEK_ID`, `PSB_ALLOWLIST_PATH`

Empty allowlist is OK for H0 (create `psb-*` + cleanup only).

## Markers

- Prefix: `psb-`
- `makePsbId(kind)` / `isPsbId` / `isSandboxMarkedEntity`

## Zakazy (H0)

- No Protected Core / cloud-sync / Edge / Payroll logic changes
- No H1–H5 scenarios
- No commit of secrets or `allowlist.json` with live IDs unless Owner intends

## Reports

Written to `.tmp/prod-sandbox-out/<runId>/report.json` (gitignored).
