# TEST-HARNESS-01 H1 — IMPLEMENTATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H1** · Tender Production Sandbox  
> **Status:** OWNER VERIFICATION **PASS** · zob. `TEST-HARNESS-01-H1-FINAL-VERIFICATION.md`  
> **Data:** 2026-07-19  
> **COMMIT / PUSH:** **NIE**  
> **CHANGELOG / UI:** **bez zmian** (tooling only)

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `h1-tender` scenario (always-create `psb-*`) | H2–H5 |
| PDF import (Playwright) + stable asserts | Protected Core / Edge / Payroll / catalog |
| PSB-001 cleanup + tombstone | H0.x Persist Ledger |
| **H1-001 Stable Assertions** | 1:1 row / PLN compares |
| Manifest `prod-sandbox-h1` | Gate B/C |

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h1-tender.mjs` | scenariusz H1 |
| `test-infra/prod-sandbox/kv-client.mjs` | Edge batch-get/set (bez cloud-sync) |
| `test-infra/prod-sandbox/tender-helpers.mjs` | seed merge-append + cleanup retry |
| `test-infra/prod-sandbox/fixtures/sample-przedmiar.pdf` | fixture |
| `test-infra/prod-sandbox/runner.mjs` | rejestracja h1-tender |
| `scripts/test-prod-sandbox-h1.mjs` | orchestrator entry (`--allow-prod`) |
| `test-infra/test-manifest.json` | suite `prod-sandbox-h1` / `PROD-SANDBOX-H1` |
| docs H1 RCA/PLAN/DF/Review + ten raport | AUDIT + impl |

---

## 3. H1-001 Stable Assertions

Weryfikowane wyłącznie:

- create / PDF import / analysis / proposal / save / cleanup  

**Nie** porównywane: liczba pozycji, kwoty PLN, pełny wynik analizy.  
**UNKNOWN** klasyfikacji → **WARNING** (exit 0 jeśli brak FAIL).

---

## 4. Anty-wipe (hybryda)

Po seed KV: **hydratacja `localStorage` pipeline z chmury** przed nawigacją UI — zapobiega `batch-set` klienta bez `psb-*` (zaobserwowane w pierwszej iteracji).

Cleanup: retry do 5× (late UI push) + drain po `browser.close`.

---

## 5. Uruchomienie

```bash
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod --dry-run
npm run test:infra -- --suite prod-sandbox-h1 --allow-prod
```

---

## 6. Owner Verification checklist

- [x] H1 `--allow-prod` exit 0 (WARNING classification OK)
- [x] Cleanup verify — brak leftover `psb-tender-*`
- [x] H0 nadal PASS
- [x] Brak zmian Protected Core
- [x] Decyzja commit  

**Owner Verification PASS** · push = Owner GO.
