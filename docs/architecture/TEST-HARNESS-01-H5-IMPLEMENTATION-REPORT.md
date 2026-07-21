# TEST-HARNESS-01 H5 — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Status:** OWNER VERIFICATION **PASS** · awaiting Owner GO COMMIT  
> **Data:** 2026-07-21  
> **COMMIT / PUSH:** **NIE** (czekaj Owner GO)  
> **CHANGELOG / UI version:** **bez zmian** (tooling only · UI **2.65.35**)  
> **SSOT verification:** [`TEST-HARNESS-01-H5-OWNER-VERIFICATION.md`](TEST-HARNESS-01-H5-OWNER-VERIFICATION.md)  
> **DF / ARCH:** [`TEST-HARNESS-01-H5-DESIGN-FREEZE.md`](TEST-HARNESS-01-H5-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H5-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H5-ARCHITECTURE-REVIEW.md) · **ARCH APPROVED**

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `h5-biblioteka` KV-only CRUD na `kw-wgdom-work-catalog` | Playwright / UI Biblioteka |
| FORBIDDEN gate (payroll + cost-catalog + bundles + tenders/jobs) | Protected Core / Edge / Payroll / Theme |
| `catalog-helpers.mjs` (in-memory shape) | Import `mergeWorkCatalogStore` / Core |
| Create → keyword → edit → delete → PSB-001 | `kw-wgdom-cost-catalog` · work-bundles |
| Manifest `PROD-SANDBOX-H5` | Gate B/C auto · nowy KV |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs` | Scenariusz H5 |
| `test-infra/prod-sandbox/catalog-helpers.mjs` | build/upsert/edit/remove `psb-*` |
| `test-infra/prod-sandbox/forbidden-keys.mjs` | H5 gate + shared base FORBIDDEN (H4 reuse) |
| `test-infra/prod-sandbox/runner.mjs` | Rejestracja `h5-biblioteka` / `h5` |
| `test-infra/prod-sandbox/README.md` | Docs CLI H5 |
| `scripts/test-prod-sandbox-h5.mjs` | Thin wrapper orchestrator |
| `test-infra/test-manifest.json` | Suite `prod-sandbox-h5` · `PROD-SANDBOX-H5` |
| ten raport | Closeout implementacji |

**Reuse:** `kv-client.mjs` · H0 markers/mutate-guard/cleanup/report/allowlist · H4 FORBIDDEN pattern.

---

## 3. Mapowanie H5.0–H5.5

| Etap | Realizacja |
|------|------------|
| H5.0 Wiring | runner IMPLEMENTED + alias `h5` + manifest |
| H5.1 FORBIDDEN | `assertH5KeysWritable` + wrap + self-check payroll/cost |
| H5.2 Create + keyword | upsert fixture · parity keywords |
| H5.3 Edit | keywords → `psb-h5-kw-edited` · non-psb keywords unchanged |
| H5.4 Delete + cleanup | remove + PSB-001 + dual-region verify |
| H5.5 Closeout | README · wrapper · ten raport |

---

## 4. Protected Core

**Zero** changes to: `cloud-sync.ts`, Edge, Payroll, fence, Theme, `App.tsx`, `src/lib/work-catalog/**`, UI changelog, `version.json`.

---

## 5. Jak uruchomić

```bash
npm run test:prod-sandbox -- --scenario h5-biblioteka --dry-run
npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod
npm run test:infra -- --suite prod-sandbox-h5
```

---

## 6. Owner Verification checklist

- [ ] `h5-biblioteka --dry-run` → exit 0  
- [ ] `h5-biblioteka --allow-prod` → exit 0 · create/edit/delete · cleanup PASS · preservacja OK  
- [ ] Report w `.tmp/prod-sandbox-out/*/report.json`  
- [ ] Potwierdzenie: brak diff Protected Core / cost-catalog untouched  
- [ ] Decyzja: potem commit (bez push do osobnego GO)

**Czekam na Owner GO → OWNER VERIFICATION.**

---

## 7. BUILD / DRY-RUN

| Check | Wynik |
|-------|--------|
| `npm run build` | **PASS** (exit 0 · ~29s) |
| `h5-biblioteka --dry-run` | **PASS** (exit 0 · FORBIDDEN self-check · writes=0 · cleanup PASS) |

**COMMIT / PUSH:** nie wykonano.
