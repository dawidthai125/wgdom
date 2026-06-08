# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-08  
**Wersja UI (prod):** **2.49.60** — Sprint 20.1D Closed week semantics  
**Prod `origin/main` HEAD:** *(po push tej sesji)* · https://www.wgdom.fun  
**Status Sprint 20.1D:** **CLOSED** (po deploy)

---

## Sprint 20.1D — Closed week przy zablokowanym rolloverze (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.49.60** |
| **Commit** | `fix(payroll): keep blocked rollover weeks operational (20.1D)` |
| **Pliki** | 5 kod + smoke + docs |
| **Production** | https://www.wgdom.fun |

### Zakres

| Element | Opis |
|---------|------|
| **`isPayrollWeekClosedForUi`** | Calendar behind + `hasRolloverBlockers` → nadal operacyjny |
| **PayrollView** | Baner, live vs snapshot, defer ⏭ |
| **App.tsx** | `refreshSavedActiveWeekSnapshot`, sync rates |
| **payroll-leave-overlay** | Biweekly overlay z nową semantyką |
| **Smoke** | `smoke-test-payroll-week-closed-20.1d.mjs` (T1–T6) |

### Post-deploy smoke

| Suite | Wynik |
|-------|-------|
| payroll-week-closed 20.1D | **6/6 PASS** |
| rollover 20.1C | **9/9 PASS** |
| dashboard 20.1C.2 | **5/5 PASS** |
| carry-forward 20.1B | **7/7 PASS** |

**Następny sprint:** **20.5A.3** — Inspektor billing (nie rozpoczęty)

---

## Seria payroll 20.1A–20.1D (CLOSED)

| Sprint | Wersja | Opis | Status |
|--------|--------|------|--------|
| 20.1A carry forward | 2.45.38 | Odroczenie wypłaty ⏭ | CLOSED |
| 20.1B saved ≠ closed | 2.45.39 | Defer po „Zapisz tydzień” | CLOSED |
| 20.1C rollover | 2.49.20 | Kasa sobotnia blokuje advance | CLOSED |
| 20.1C.1 sync integrity | 2.49.30 | F5 / KV po rolloverze | CLOSED |
| 20.1C.2 dashboard alerts | 2.49.40 | `listPayrollRolloverBlockers` | CLOSED |
| **20.1D closed semantics** | **2.49.60** | Blockers + Nd 20:00 = operacyjny | **CLOSED** |

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
4. docs/ARCHITECTURE.md § 10.1 payroll (20.1D: isPayrollWeekClosedForUi)
5. AGENTS.md
```
