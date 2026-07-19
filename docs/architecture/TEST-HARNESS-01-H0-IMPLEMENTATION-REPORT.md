# TEST-HARNESS-01 H0 — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H0**  
> **Status:** IMPLEMENTATION COMPLETE (awaiting Owner Verification)  
> **Data:** 2026-07-19  
> **COMMIT / PUSH:** **NIE** (Owner Verification first)  
> **CHANGELOG / UI version:** **bez zmian** (tooling only — Owner)

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `test-infra/prod-sandbox/**` foundations | H1–H5 scenarios |
| markers `psb-*`, allowlist, mutate-guard | Protected Core / cloud-sync / Edge |
| **PSB-001 Cleanup Guarantee** | Payroll logic |
| runner + `npm run test:prod-sandbox` | UI / App.tsx |
| manifest suite `prod-sandbox-h0` (not gate B/C) | New KV keys |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/markers.mjs` | `psb-*` ID / identity |
| `test-infra/prod-sandbox/allowlist.mjs` | D7 env + file merge |
| `test-infra/prod-sandbox/mutate-guard.mjs` | D8 `PSB_MUTATE_DENIED` |
| `test-infra/prod-sandbox/cleanup.mjs` | **PSB-001 Cleanup Guarantee** |
| `test-infra/prod-sandbox/report.mjs` | D11 JSON → `.tmp/prod-sandbox-out/` |
| `test-infra/prod-sandbox/runner.mjs` | CLI + exit codes |
| `test-infra/prod-sandbox/scenarios/h0-preflight.mjs` | H0 self-test |
| `test-infra/prod-sandbox/allowlist.example.json` | template |
| `test-infra/prod-sandbox/README.md` | ops |
| `scripts/test-prod-sandbox.mjs` | npm wrapper |
| `package.json` | script `test:prod-sandbox` |
| `test-infra/test-manifest.json` | suite + `PROD-SANDBOX-H0` |
| `.gitignore` | `allowlist.json` + out dir |

---

## 3. PSB-001 Cleanup Guarantee

Owner GO H0 naming: **PSB-001 = Cleanup Guarantee**.

| After | Behavior |
|-------|----------|
| PASS | `CleanupTracker.runAll()` must leave **0** leftovers |
| FAIL | same — cleanup still runs / failTracker proves leftovers → **exit 4** |
| Leftovers | printed + listed in `report.json` |

DF table `#PSB-001` (“Never touch”) remains via **mutate-guard** (documented dual naming in README).

---

## 4. Protected Core

**Zero** changes to: `cloud-sync.ts`, Edge, Payroll, App.tsx, merge, guards.

---

## 5. Jak uruchomić

```bash
npm run test:prod-sandbox
npm run test:prod-sandbox -- --scenario h0-preflight --dry-run
npm run test:infra -- --suite prod-sandbox-h0
npm run test:infra:validate
```

H1+ → `PSB_SCENARIO_NOT_IMPLEMENTED` (exit 2).

---

## 6. Owner Verification checklist

- [ ] `npm run test:prod-sandbox` → exit 0  
- [ ] Report w `.tmp/prod-sandbox-out/*/report.json`  
- [ ] Potwierdzenie: brak zmian Protected Core  
- [ ] Decyzja: commit (bez push)  

**Czekam na Owner Verification.**
