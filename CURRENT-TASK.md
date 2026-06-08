# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-08  
**Wersja UI (prod):** **2.49.40** — Sprint 20.1C.2 Dashboard alerts alignment  
**Prod `origin/main` HEAD:** **`75de889`** · https://www.wgdom.fun  
**Status Sprint 20.1C.2:** **CLOSED**

---

## Sprint 20.1C.2 — Dashboard alerts alignment (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.49.40** |
| **Commit** | **`75de889`** — `fix(payroll): align dashboard alerts with rollover blockers (20.1C.2)` |
| **Pliki** | 6 · **+231 / −15** |
| **Production** | https://www.wgdom.fun |
| **Vercel deploy** | **PASS** @ `75de889` |

### Zakres

| Element | Opis |
|---------|------|
| **DashboardView** | Alerty payroll → `listPayrollRolloverBlockers` (kasa sobotnia), nie `!settled` |
| **Helper** | `listPayrollRolloverBlockers`, `countPayrollDashboardBlockers` w `payroll-rollover.ts` |
| **employeeLeaves** | Przekazane do Dashboard (urlop → brak fałszywego alarmu) |
| **Smoke** | `smoke-test-payroll-dashboard-20.1c2.mjs` (T1–T5) |

### Post-deploy smoke (2026-06-08)

| Suite | Wynik |
|-------|-------|
| payroll-dashboard 20.1C.2 | **5/5 PASS** |
| rollover 20.1C | **9/9 PASS** (w tym biweekly T3/T4) |
| carry-forward 20.1B | **7/7 PASS** |
| sync payroll 20.1C.1 | **5/5 PASS** |
| sync integration 20.1C.1 | **6/6 PASS** |
| recoverable charges 20.3A | **18/18 PASS** |

**Następny sprint:** **20.5A.3** — Inspektor billing (nie rozpoczęty)

---

## Seria payroll 20.1C (CLOSED)

| Sprint | Wersja | Commit | Status |
|--------|--------|--------|--------|
| 20.1C rollover | 2.49.20 | `c6614cc` | CLOSED |
| 20.1C.1 sync integrity | 2.49.30 | `a728528` | CLOSED |
| **20.1C.2 dashboard alerts** | **2.49.40** | **`75de889`** | **CLOSED** |

---

## Seria billing + Roboty (CLOSED)

| Sprint | Wersja | Commit | Status |
|--------|--------|--------|--------|
| 20.5A.3 smoke billing | — | `b4ab4b1` | CLOSED (test-only) |
| 20.5A.2 Create from job | 2.49.10 | `571b90b` | CLOSED |
| 20.5A.1 Jobs read-only | 2.49.00 | `637f12c` | CLOSED |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md  ← billing + jobs 20.3A–20.5A.2
3. docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md  ← carry saved ≠ closed
4. docs/ARCHITECTURE.md § 10.1 payroll
5. AGENTS.md
```
