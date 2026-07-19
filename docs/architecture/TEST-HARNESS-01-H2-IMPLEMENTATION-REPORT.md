# TEST-HARNESS-01 H2 — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H2** · Jobs Production Sandbox  
> **Status:** OWNER VERIFICATION **PASS** · zob. `TEST-HARNESS-01-H2-FINAL-VERIFICATION.md`  
> **Data:** 2026-07-19  
> **COMMIT / PUSH:** **NIE**  
> **CHANGELOG / UI:** **bez zmian** (tooling only)

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `h2-jobs-photos` scenario | H3–H5 |
| create → upload N → sync → delete M → **H2-001** → no resurrection → cleanup | Protected Core / Edge / `job-photos.ts` / `cloud-sync` |
| Always-create `psb-job-*` + PSB-001 | H0.x Persist Ledger |
| Manifest `prod-sandbox-h2` | Gate B/C |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h2-jobs-photos.mjs` | scenariusz H2 |
| `test-infra/prod-sandbox/job-helpers.mjs` | seed merge-append + cleanup + `kw-jobs-deleted-ids` |
| `test-infra/prod-sandbox/fixtures/sample-job-photo.png` | fixture |
| `test-infra/prod-sandbox/runner.mjs` | rejestracja `h2-jobs-photos` |
| `scripts/test-prod-sandbox-h2.mjs` | orchestrator entry (`--allow-prod`) |
| `test-infra/test-manifest.json` | suite `prod-sandbox-h2` / `PROD-SANDBOX-H2` |
| `test-infra/prod-sandbox/README.md` | docs H2 |
| docs H2 RCA/PLAN/DF/Review (+ DF #H2-001 Sync Stability Window) | AUDIT + Owner principle |

---

## 3. H2-001 Sync Stability Window

Po delete:

1. LS drop observed  
2. best-effort `kw-jobs` batch-set wait  
3. **wait `PSB_H2_SYNC_STABILITY_MS` (default 5000)**  
4. dopiero wtedy `batch-get` verify no resurrection + tombstone parity  

---

## 4. Anty-wipe + seed

- Login → settle → seed `kw-jobs` → hydrate LS (wzór H1)  
- Seed wymaga `assignedInspectorId: "szymon"` — inaczej `JobsView.updateJob` blokuje delete (`validateJobAssignedInspectorForSave`)

---

## 5. Uruchomienie

```bash
npm run test:prod-sandbox -- --scenario h2-jobs-photos --dry-run
npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
npm run test:infra -- --suite prod-sandbox-h2 --allow-prod
```

Env: `PSB_H2_UPLOAD_N` · `PSB_H2_DELETE_M` · `PSB_H2_SYNC_STABILITY_MS`

---

## 6. Owner Verification checklist

- [x] H2 `--allow-prod` exit 0  
- [x] `cleanupStatus=PASS` · brak leftover `psb-job-*`  
- [x] H2-001 window enforced in steps  
- [x] H0 regression PASS  
- [x] Brak zmian Protected Core  
- [x] Decyzja commit  

**Owner Verification PASS** · push = Owner GO.
