# TEST-HARNESS-01 H4 — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Status:** IMPLEMENTATION COMPLETE (awaiting Owner Verification / BUILD GO)  
> **Data:** 2026-07-20  
> **COMMIT / PUSH:** **NIE** (czekaj Owner GO)  
> **CHANGELOG / UI version:** **bez zmian** (tooling only)  
> **DF / ARCH:** [`TEST-HARNESS-01-H4-DESIGN-FREEZE.md`](TEST-HARNESS-01-H4-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H4-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H4-ARCHITECTURE-REVIEW.md) · **ARCH APPROVED**

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `h4-cloud` KV-only round-trip | Playwright / UI |
| FORBIDDEN keys gate | Protected Core / Edge / Payroll / Theme |
| Reuse H1 tender-helpers + `buildSandboxTenderItem` | Nowy builder / nowy KV |
| Soft metrics WARNING | FAIL na `batchSetRetries=0` |
| Manifest `PROD-SANDBOX-H4` | Gate B/C · H5 · dual-writer |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h4-cloud.mjs` | Scenariusz H4 |
| `test-infra/prod-sandbox/forbidden-keys.mjs` | H4.1 FORBIDDEN gate + kv wrap |
| `test-infra/prod-sandbox/runner.mjs` | Rejestracja `h4-cloud` / `h4` |
| `test-infra/prod-sandbox/README.md` | Docs CLI H4 |
| `scripts/test-prod-sandbox-h4.mjs` | Thin wrapper orchestrator |
| `test-infra/test-manifest.json` | Suite `prod-sandbox-h4` · `PROD-SANDBOX-H4` |
| ten raport | Closeout implementacji |

**Reuse (bez kopiowania merge):** `kv-client.mjs` · `tender-helpers.mjs` (`buildSandboxTenderItem`, `seedSandboxTender`, `cleanupSandboxTender`, `fetchSandboxTender`) · H0 markers/mutate-guard/cleanup/report.

---

## 3. Mapowanie H4.0–H4.5

| Etap | Realizacja |
|------|------------|
| H4.0 Wiring | runner IMPLEMENTED + alias `h4` |
| H4.1 FORBIDDEN | `forbidden-keys.mjs` + self-check steps + wrap `batchSet` |
| H4.2 Nested write + parity | H1 seed + fetch + preservacja non-`psb-*` |
| H4.3 Cleanup | `cleanupSandboxTender` + PSB-001 `finally` via `CleanupTracker.runAll` |
| H4.4 Telemetry soft | step `h4.metrics` WARNING · meta.metrics |
| H4.5 Closeout | README + manifest + ten raport |

---

## 4. Protected Core

**Zero** changes to: `cloud-sync.ts`, Edge, Payroll, fence, Theme, `App.tsx`, UI changelog.

---

## 5. Jak uruchomić

```bash
npm run test:prod-sandbox -- --scenario h4-cloud --dry-run
npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
npm run test:infra -- --suite prod-sandbox-h4
```

---

## 6. Owner Verification checklist

- [ ] `h4-cloud --dry-run` → exit 0  
- [ ] `h4-cloud --allow-prod` → exit 0 · cleanup PASS · preservacja OK  
- [ ] Report w `.tmp/prod-sandbox-out/*/report.json` (metrics WARNING OK)  
- [ ] Potwierdzenie: brak diff Protected Core  
- [ ] Decyzja: BUILD / TEST GO · potem commit (bez push do osobnego GO)

**Czekam na Owner GO BUILD / Verification.**
