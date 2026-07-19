# TEST-HARNESS-01 H3-A — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H3-A** · Payroll Production Sandbox (read-only)  
> **Status:** IMPLEMENTATION COMPLETE · **czekaj na Owner Verification**  
> **Data:** 2026-07-19  
> **COMMIT / PUSH:** **NIE**  
> **CHANGELOG / UI:** **bez zmian** (tooling only)

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `h3-payroll` scenario H3-A | H3-B / H3-C save |
| login → settle → open LP → batch-get → roster/KPI/totals → H3-001 → RO gate → cleanup no-op | Protected Core / cloud-sync / PWRB / Edge |
| `payroll-helpers.mjs` mirrors (no cloud-sync import) | Seed week / batch-set payroll |
| Manifest `prod-sandbox-h3` | Gate B/C · H0.x |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h3-payroll.mjs` | scenariusz H3-A |
| `test-infra/prod-sandbox/payroll-helpers.mjs` | RO mirrors: `payrollMetrics` · production filter · H3-001 parsers |
| `test-infra/prod-sandbox/runner.mjs` | rejestracja `h3-payroll` |
| `scripts/test-prod-sandbox-h3.mjs` | orchestrator entry (`--allow-prod`) |
| `test-infra/test-manifest.json` | suite `prod-sandbox-h3` / `PROD-SANDBOX-H3` |
| `test-infra/prod-sandbox/README.md` | docs H3-A |
| docs H3 RCA/PLAN/DF/Review | AUDIT (wcześniej) |

---

## 3. Pipeline (zaimplementowany)

```text
login → settle (5s, no seed)
  → open Lista Płac (Sumy)
  → batch-get kw-weekFrom/To + week-employees + directory
  → verify week UI ↔ KV
  → verify roster (production filter mirror)
  → verify KPI (payrollMetricsMirror)
  → verify totals (fmtH „Razem (tydzień)” ≈ KPI)
  → H3-001 Stable Assertions
  → RO gate writes=0
  → finally cleanup no-op (PSB-001)
```

---

## 4. H3-001 Stable Assertions

- ISO week dates UI ↔ KV  
- roster count (production)  
- `activeDays` / `totalHours`  
- UI hours (`Xh` / `Xh Ym`) ≈ KPI (eps 0.15)  
- **bez** PLN stringów  

---

## 5. Zakazy przestrzegane

- brak „Zapisz tydzień”  
- brak `batch-set` payroll  
- brak seedu / LS hydrate `kw-week-*`  
- brak importu `cloud-sync` / PWRB  
- H3-B/C nie rozpoczęte  

---

## 6. Weryfikacja lokalna (przed Owner Verification)

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| H3-A `--dry-run` | **PASS** exit 0 |
| H3-A `--allow-prod` (prod) | **PASS** exit 0 · week 2026-07-13–18 · roster 14 · hours 587 |
| H0 preflight | **PASS** |
| H1 `--dry-run` | **PASS** (WARNING classification — expected) |
| H2 `--dry-run` | **PASS** |

---

## 7. Następny krok

**Owner Verification** → potem ewentualny commit / tooling release (bez bump UI).  
**Nie** startować H3-B/C / H4 bez osobnego GO.
