# Production Sandbox Harness (TEST-HARNESS-01)

> **Slices:** **H0–H4 RELEASED** · H4 epic **CLOSED** · **H5 IMPLEMENTED** (awaiting Owner Verification)  
> **H0** foundations · **H1** Tender · **H2** Jobs photos · **H3-A** Payroll RO · **H4** Cloud KV-only · **H5** Biblioteka work-catalog  
> **SSOT H5:** [`docs/architecture/TEST-HARNESS-01-H5-DESIGN-FREEZE.md`](../../docs/architecture/TEST-HARNESS-01-H5-DESIGN-FREEZE.md) · ARCH [`TEST-HARNESS-01-H5-ARCHITECTURE-REVIEW.md`](../../docs/architecture/TEST-HARNESS-01-H5-ARCHITECTURE-REVIEW.md)

## Run

```bash
npm run test:prod-sandbox
npm run test:prod-sandbox -- --scenario h0-preflight
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
npm run test:prod-sandbox -- --scenario h3-payroll --allow-prod
npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
npm run test:prod-sandbox -- --scenario h5-biblioteka --dry-run
npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod
```

Via orchestrator (manual / Owner — not in gate B/C):

```bash
npm run test:infra -- --suite prod-sandbox-h0
npm run test:infra -- --suite prod-sandbox-h1 --allow-prod
npm run test:infra -- --suite prod-sandbox-h2 --allow-prod
npm run test:infra -- --suite prod-sandbox-h3 --allow-prod
npm run test:infra -- --suite prod-sandbox-h4 --allow-prod
npm run test:infra -- --suite prod-sandbox-h5 --allow-prod
```

## H5 notes (Biblioteka · work-catalog KV-only)

- Write-surface: **`kw-wgdom-work-catalog` only** · **`kw-wgdom-cost-catalog` = REJECT**
- Flow: `batch-get` → CREATE `CatalogWork` `psb-*` + keywords → EDIT → DELETE → PSB-001 cleanup (both regions)
- RMW anti-wipe: preservacja non-`psb-*` · non-psb keywords unchanged
- **FORBIDDEN** payroll/auth/billing + cost-catalog + bundles + tenders/jobs writes
- **KV-only** — no Playwright / UI Biblioteka required for PASS
- Reuse: H0 markers/guard/cleanup · H4 FORBIDDEN pattern · `kv-client` · `catalog-helpers.mjs`
- Zero Protected Core / Edge / Payroll / Theme / new KV
- Requires `--allow-prod` for real writes

## H4 notes (Cloud KV-only)

- `batch-get` → nested seed `psb-cloud-*` via **reuse** H1 `buildSandboxTenderItem` / `seedSandboxTender` → parity → preservacja non-`psb-*` → cleanup + `kw-tenders-deleted-ids`
- **FORBIDDEN keys** hard-deny (payroll / auth / billing) before every `batch-set`
- **KV-only** — no Playwright / no login required for PASS
- Telemetry / `batchSetRetries=0` → **WARNING only** (never FAIL)
- Zero Protected Core / Edge / Payroll / Theme / new KV
- Requires `--allow-prod` for real writes

## H3-A notes (Payroll read-only)

- Open Lista Płac → `batch-get` week/roster → verify roster / KPI / totals → **H3-001 Stable Assertions** → cleanup **no-op** (PSB-001)
- **Never** „Zapisz tydzień” · **never** `batch-set` payroll · **never** seed week
- Empty roster → FAIL unless `PSB_H3_ALLOW_EMPTY=1` (WARNING)
- Zero Protected Core / cloud-sync / PWRB / Edge
- H3-B/C (save) require separate Owner GO — not implemented

## H2 notes

- Always-create `psb-job-*` → upload N → sync → delete M → **H2-001 Sync Stability Window** → no resurrection → cleanup + `kw-jobs-deleted-ids`
- Default N=2, M=1 · env `PSB_H2_UPLOAD_N` / `PSB_H2_DELETE_M` / `PSB_H2_SYNC_STABILITY_MS` (default 5000)
- Anti-wipe: login → settle → seed → hydrate `localStorage` `kw-jobs` (H1 pattern)
- Requires `--allow-prod` for real writes
- Zero Protected Core / cloud-sync / job-photos product code

## H1 notes

- Always-create `psb-tender-*` → PDF (Playwright) → stable asserts → cleanup + tombstone
- **H1-001 Stable Assertions** — no 1:1 row counts; UNKNOWN = WARNING
- Hybrid: Playwright when possible; KV `uploadedFile` stub fallback
- Requires `--allow-prod` for real writes

## PSB-001 Cleanup Guarantee

Every entity **created** by the harness must be cleaned up after **PASS** and after **FAIL**.  
H3-A creates **no** entities → cleanup `runAll()` no-op **PASS** (`mutatedIds: []`).

| Cleanup result | Exit |
|----------------|------|
| leftovers present | **4** + list of leftover IDs |
| scenario FAIL (cleanup OK) | **3** |
| precondition | **2** |
| PASS | **0** |

## Allowlist

Copy `allowlist.example.json` → `allowlist.json` (gitignored) or set `PSB_*` env vars.  
Empty allowlist OK for always-create `psb-*` + cleanup.  
`PSB_PAYROLL_WEEK_ID` does **not** enable save in H3-A.  
`PSB_CATALOG_ROW_IDS` optional for H5 (always-create `psb-catalog-*` preferred).

## Zakazy

- No Protected Core / cloud-sync / Edge / Payroll / Theme
- No H3-B/C save · No H0.x without Owner GO
- No `kw-wgdom-cost-catalog` writes (H5 REJECT)
- No `kw-wgdom-work-bundles` writes
- H4/H5: no dual-writer · no new KV · no Playwright hard dependency for PASS
