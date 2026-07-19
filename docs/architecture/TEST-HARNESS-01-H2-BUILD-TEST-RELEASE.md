# TEST-HARNESS-01 H2 — BUILD / TEST / RELEASE READINESS

> **Data:** 2026-07-19 · **Slice H2** · tooling only · **NIE commit / NIE push**

---

## BUILD REPORT

```text
npm run build → PASS (exit 0)
```

Pre-existing Vite chunk-size / externalize warnings — nie regresja H2.

---

## TEST REPORT

### Dry-run

```text
npm run test:prod-sandbox -- --scenario h2-jobs-photos --dry-run
→ scenarioStatus=PASS · cleanupStatus=PASS · exitCode=0
```

### Live (`--allow-prod`)

| Pole | Wartość |
|------|---------|
| Out | `.tmp/prod-sandbox-out/h2-jobs-photos-mrrzgibx/` |
| Job | `psb-job-mrrzgic1-25mhzqoi` |
| `scenarioStatus` | **PASS** |
| `cleanupStatus` | **PASS** |
| `exitCode` | **0** |

| Step | Status |
|------|--------|
| h2.principle (H2-001 · N=2 M=1) | PASS |
| h2.fixture | PASS |
| h2.create / create-stable | PASS |
| h2.open-job / photos-tab | PASS |
| h2.upload / sync | PASS |
| h2.delete (LS+push) | PASS |
| h2.stability-window (5000ms) | PASS |
| h2.no-resurrection (photos=1 tombs=1) | PASS |
| h2.cleanup / cleanup-verify | PASS |

### H0 regression

```text
npm run test:prod-sandbox -- --scenario h0-preflight
→ PASS · exit 0
```

### Cleanup verification

- PSB-001 `finally` · leftovers `[]`  
- Post-verify: job absent from `kw-jobs`  
- Tombstone `kw-jobs-deleted-ids` (cleaner)

---

## Protected Core

0 zmian w:

- `cloud-sync.ts` · `job-photos.ts` · `App.tsx` · Edge · payroll

---

## RELEASE READINESS

| Kryterium | Status |
|-----------|--------|
| Build PASS | ✓ |
| H2 dry-run PASS | ✓ |
| H2 `--allow-prod` PASS | ✓ |
| H2-001 Sync Stability Window | ✓ |
| cleanupStatus PASS | ✓ |
| H0 regression PASS | ✓ |
| Protected Core clean | ✓ |
| Pliki implementacji tracked+committed | **NIE** — await Owner Verification / commit GO |
| CHANGELOG / UI bump | **N/A** |
| Gate B/C | **nie** — manual |
| Push | **BLOCKED** |

```text
RELEASE READINESS: READY FOR OWNER VERIFICATION
RELEASE NOT READY (no commit yet — by Owner order)
```

========================================

HOTFIX CLASSIFICATION

OTHER (test-infra)

========================================

**Czekam na Owner Verification** · potem commit H2 only · **bez** push bez GO.
