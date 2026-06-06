# Sprint 20.1B Closure — Carry Forward Workflow (saved ≠ closed)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Release

* **v2.45.39**
* Commit po push — `fix(payroll): allow carry forward on saved active week (20.1B)`
* Production: https://www.wgdom.fun

---

## Problem biznesowy (Kamil)

Scenariusz produkcyjny:

1. Właściciel klika **„Zapisz tydzień”** (backup).
2. Rollover **nie nastąpił** — nadal bieżący tydzień Pn–So.
3. Pracownik **Kamil Elektryk** (35h, 1050 PLN) prosi o przeniesienie wypłaty.
4. W 20.1A przycisk ⏭ był **ukryty** — `isArchivedWeek` traktował zapis jak zamknięcie tygodnia.

To nie odpowiadało workflow: zapis = kopia zapasowa, nie koniec edycji wypłat.

---

## Rozwiązanie: saved vs closed

| Pojęcie | Definicja | Defer ⏭ | Źródło listy / PDF |
|---------|-----------|---------|---------------------|
| **saved** | wpis w `savedWeeks` | ✅ (gdy operacyjny) | **live** `weekEmployees` |
| **closed** | `weekFrom/weekTo ≠ getPayrollWeekRange()` | ❌ `closed_week` | **snapshot** archiwum |

**Kluczowe funkcje:**

* `isPayrollWeekSaved()` — `payroll-cycle.ts`
* `isPayrollWeekClosed()` — `payroll-cycle.ts`
* `canDeferPayroll(..., isClosedWeek)` — `closed_week` zamiast `archived_week`
* `refreshSavedActiveWeekSnapshot()` — `App.tsx`

---

## Architektura

```
Aktywny tydzień payroll (saved lub nie)
  → weekEmployees live
  → employeeLeaves live
  → defer ⏭ OK
  → PDF/DOCX z live
  → jeśli saved → snapshot odświeżany przy zmianach

Tydzień historyczny (po rollover / nawigacja wstecz)
  → payrollEmployees ze snapshot
  → archivedSnapshot w calc
  → defer ⏭ blocked (closed_week)
  → PDF/DOCX ze snapshot (immutable)
```

**Urlopy 20.0A:** bez zmian — retro-urlop na tygodniach w `savedWeeks` nadal zablokowany (`archived_week` w walidacji leaves).

---

## Pliki zmienione

| Plik | Rola |
|------|------|
| `payroll-cycle.ts` | `isPayrollWeekSaved`, `isPayrollWeekClosed` |
| `payroll-carry-forward.ts` | `closed_week` w `canDeferPayroll` |
| `payroll-leave-overlay.ts` | biweekly overlay: snapshot tylko gdy closed |
| `PayrollView.tsx` | `isSavedWeek` / `isClosedWeek`, banery, live vs snapshot |
| `WeekEmployeeDetail.tsx` | prop `isClosedWeek` |
| `App.tsx` | `refreshSavedActiveWeekSnapshot` |
| `GuideView.tsx` | instrukcja saved vs closed |

---

## Testy

### Scenariusze 20.1B (A–F) — `smoke-test-payroll-carry-forward-20.1b.mjs`

| ID | Scenariusz | Wynik |
|----|------------|-------|
| A | active → save → defer | PASS |
| B | save → refresh → defer | PASS |
| C | save → defer → PDF | PASS |
| D | save → defer → rollover → carry in | PASS |
| E | historyczny → defer blocked | PASS |
| F | regresja urlopów 20.0A | PASS |

### Pre-commit (TEST 1–9) — `pre-commit-verify-20.1b.mjs`

Kamil 35h/1050, PDF, DOCX, snapshot refresh, rollover, closed week — **PASS**

### Regresje

| Suite | Wynik |
|-------|-------|
| `smoke-test-employee-leaves-20.0a.mjs` | PASS |
| `smoke-test-payroll-carry-forward-20.1a.mjs` | PASS |
| `post-smoke-20.1a.mjs` | PASS |
| `npm run build` | PASS |

---

## Ryzyka

| Ryzyko | Priorytet |
|--------|-----------|
| Granica rollover Nd ≥20:00 — manualny check w niedzielę | Niski |
| Brak E2E Playwright na prod dla Kamila — smoke programowy PASS | Niski |
| Edycja live przy widoku tygodnia historycznego — edge case sprzed 20.1B | Niski |

---

## Status

**CLOSED**

---

## Następny sprint

TBD
