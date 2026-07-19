# Production Sandbox Harness (TEST-HARNESS-01)

> **Slices:** **H0** foundations · **H1** Tender sandbox · H2–H5 **NOT IMPLEMENTED**  
> **SSOT:** [`docs/architecture/TEST-HARNESS-01-DESIGN-FREEZE.md`](../../docs/architecture/TEST-HARNESS-01-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H1-DESIGN-FREEZE.md`](../../docs/architecture/TEST-HARNESS-01-H1-DESIGN-FREEZE.md)

## Run

```bash
npm run test:prod-sandbox
npm run test:prod-sandbox -- --scenario h0-preflight
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod --dry-run
```

Via orchestrator (manual / Owner — not in gate B/C):

```bash
npm run test:infra -- --suite prod-sandbox-h0
npm run test:infra -- --suite prod-sandbox-h1 --allow-prod
```

## H1 notes

- Always-create `psb-tender-*` → PDF (Playwright) → stable asserts → cleanup + tombstone
- **H1-001 Stable Assertions** — no 1:1 row counts; UNKNOWN = WARNING
- Hybrid: Playwright when possible; KV `uploadedFile` stub fallback
- Requires `--allow-prod` for real writes

## PSB-001 Cleanup Guarantee

Every entity **created** by the harness must be cleaned up after **PASS** and after **FAIL**.

| Cleanup result | Exit |
|----------------|------|
| leftovers present | **4** + list of leftover IDs |
| scenario FAIL (cleanup OK) | **3** |
| precondition | **2** |
| PASS | **0** |

## Allowlist

Copy `allowlist.example.json` → `allowlist.json` (gitignored) or set `PSB_*` env vars.  
Empty allowlist OK for always-create `psb-*` + cleanup.

## Zakazy

- No Protected Core / cloud-sync / Edge / Payroll / catalog mutations
- No H2–H5 without Owner GO
