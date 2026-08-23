# IK-OWNER-A01-LP5 — OPS Seed Report

| Field | Value |
|-------|-------|
| **Epic** | `IK-OWNER-A01-LP5-OPS-SEED` |
| **Date** | 2026-08-23 |
| **Owner Decision** | [`IK-OWNER-CREATE-A01-LP5-DECISION.md`](./IK-OWNER-CREATE-A01-LP5-DECISION.md) |
| **Implementation** | [`IK-OWNER-CREATE-A01-LP5-IMPLEMENTATION.md`](./IK-OWNER-CREATE-A01-LP5-IMPLEMENTATION.md) |

---

## OPS AUDIT

| # | Check | Result |
|---|-------|--------|
| 1 | `insertWorkBothRegions` pattern | **PASS** — reuse via `applyA01Lp5CatalogSeed` (both `wroclaw` + `dolnyslask`) |
| 2 | Wave-2 OPS precedent | **PASS** — `catalog-wave-2-ops.mjs` byId merge + `batch-set` |
| 3 | Required fields | **PASS** — `id`, `tradeId`, `namePl`, `unit`, `companyPricePln`, `active`, `source`, `costSplit`, … |
| 4 | KV pre-check | **PASS** — workId **ABSENT** both regions |
| 5 | Idempotency | **PASS** — `PRESENT_OK` → no duplicate / no overwrite |

**Note:** Prod KV slice (36 works) does not contain `cc-w2-oczyszczenie-podloza` — identity A01-S1 row unchanged in code; OPS did not touch oczyszczenie.

---

## SEED EXECUTION

| Field | Value |
|-------|-------|
| Script | `scripts/catalog-ik-owner-a01-lp5-ops.mjs --execute` |
| KV key | `kw-wgdom-work-catalog` |
| Backup | `.tmp/catalog-ik-owner-a01-lp5-backup.json` |
| Report | `.tmp/catalog-ik-owner-a01-lp5-ops-report.json` |

---

## VALIDATION

| Check | Result |
|-------|--------|
| `test-catalog-ik-owner-a01-lp5-ops.mjs` | **9/9 PASS** |
| Cloud verify wroclaw | **PRESENT_OK** |
| Cloud verify dolnyslask | **PRESENT_OK** |
| Re-run `--execute` (idempotent) | **NO-OP** (`CHANGED=false`) |
| `test-labor-identity-mapping-a01-lp5.mjs` | **14/14 PASS** |
| `test-labor-identity-mapping-a01-s1.mjs` | **8/8 PASS** |
| `npm run build` | **PASS** |

---

## FINAL REPORT

```text
OPS AUDIT = PASS
WORK_ID = cc-w2-impregnacja-biobojcza-m2
REGION A (wroclaw) = PRESENT
REGION B (dolnyslask) = PRESENT
DUPLICATE = NO
IDEMPOTENT = PASS
A01-S1 = UNCHANGED
MAP DELTA = 0
CLASSIFICATION DELTA = 0
KNR DELTA = 0
ARCHITECTURE DELTA = 0
TESTS = 9/9 OPS · 14/14 A01-LP5 · 8/8 A01-S1
BUILD = PASS
FILES CHANGED = scripts/catalog-ik-owner-a01-lp5-ops.mjs (NEW)
                scripts/test-catalog-ik-owner-a01-lp5-ops.mjs (NEW)
                src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts (NEW)
                src/lib/work-catalog/index.ts (export)
COMMIT = NO
PUSH = NO
DEPLOY = NO
```

---

## FILES MANIFEST

| File | Role |
|------|------|
| `src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts` | Idempotent merge SSOT |
| `scripts/catalog-ik-owner-a01-lp5-ops.mjs` | KV dry-run / execute |
| `scripts/test-catalog-ik-owner-a01-lp5-ops.mjs` | Local OPS tests |

**Not touched:** identity mappings · A01-S1 · classification · KNR · alias-pack-wave2
