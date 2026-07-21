# TEST-HARNESS-01 H0.x — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger  
> **Status:** IMPLEMENTATION COMPLETE · czekaj Owner Verification  
> **Data:** 2026-07-21  
> **Owner GO IMPLEMENT:** ✅  
> **COMMIT / PUSH:** **NIE**  
> **UI / version bump:** **NIE** (tooling-only)  
> **Baseline tip:** **`3356349`** · UI **2.65.35**

---

## 1. Werdykt

```text
IMPLEMENT COMPLETE
BUILD: PASS
h0x-recover --dry-run: PASS (exit 0)
h0x-recover --allow-prod: PASS (exit 0) · kill-sim + recover
```

---

## 2. Zakres zrealizowany (H0.x.0–H0.x.6)

| Etap | Status |
|------|--------|
| H0.x.0 Wiring | ✅ `persist-ledger` · `h0x-lock` · `cleaner-registry` · `ledger-bridge` · `h0x-recovery` |
| H0.x.1 Ledger lifecycle | ✅ pending→open→cleaning→closed→prune · atomic JSON |
| H0.x.2 Lock lifecycle | ✅ acquire/release · stale · `PSB_H0X_LOCK_HELD` |
| H0.x.3 Bridge + registry | ✅ `LedgerCleanupTracker` · REUSE tender/job/catalog cleaners |
| H0.x.4 Recovery | ✅ runner pre-recover · `h0x-recover` kill-sim |
| H0.x.5 Scan + de-dupe | ✅ `PSB_H0X_SCAN=1` · H1/H2 orphan-scrub deprecated |
| H0.x.6 Closeout | ✅ manifest · README · wrapper · ten raport |

---

## 3. Pliki

| Plik | Akcja |
|------|--------|
| `test-infra/prod-sandbox/persist-ledger.mjs` | **NOWY** |
| `test-infra/prod-sandbox/h0x-lock.mjs` | **NOWY** |
| `test-infra/prod-sandbox/cleaner-registry.mjs` | **NOWY** |
| `test-infra/prod-sandbox/ledger-bridge.mjs` | **NOWY** |
| `test-infra/prod-sandbox/h0x-recovery.mjs` | **NOWY** |
| `test-infra/prod-sandbox/scenarios/h0x-recover.mjs` | **NOWY** |
| `test-infra/prod-sandbox/catalog-helpers.mjs` | + `cleanupSandboxCatalogWork` |
| `test-infra/prod-sandbox/runner.mjs` | recovery + h0x + signals |
| `test-infra/prod-sandbox/scenarios/h1-tender.mjs` | ledger bridge · scrub de-dupe |
| `test-infra/prod-sandbox/scenarios/h2-jobs-photos.mjs` | ledger bridge · scrub de-dupe |
| `test-infra/prod-sandbox/scenarios/h4-cloud.mjs` | ledger bridge |
| `test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs` | ledger bridge · REUSE catalog cleaner |
| `test-infra/prod-sandbox/README.md` | H0.x docs |
| `test-infra/test-manifest.json` | `prod-sandbox-h0x` / `PROD-SANDBOX-H0X` |
| `scripts/test-prod-sandbox-h0x.mjs` | thin wrapper (default dry-run) |

**Zero zmian:** Core · Payroll · Theme · Edge · new KV · UI changelog.

---

## 4. Komendy

```bash
npm run test:prod-sandbox -- --scenario h0x-recover --dry-run
npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
PSB_H0X_SCAN=1 npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
npm run test:infra -- --suite prod-sandbox-h0x
```

---

## 5. Evidence (ta sesja)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `h0x-recover --dry-run` | **PASS** exit 0 · lock/ledger/unknown-kind |
| `h0x-recover --allow-prod` | **PASS** exit 0 · kill-sim seed → recover → absent |
| Report allow-prod | `.tmp/prod-sandbox-out/h0x-recover-mrusea0x/report.json` |

---

## 6. Owner Verification checklist

- [ ] `h0x-recover --dry-run` → exit 0  
- [ ] `h0x-recover --allow-prod` → kill-sim + recover PASS  
- [ ] Potwierdzenie: brak diff Protected Core / Payroll / Theme / Edge  
- [ ] Decyzja: potem COMMIT (bez push do osobnego GO)

**Czekam na Owner GO → OWNER VERIFICATION.**

---

## 7. Protected Core

**Zero** changes to: `cloud-sync.ts`, Edge functions, Payroll, Theme, `App.tsx`, UI version.

```text
D5 ZERO Core: HELD
```
