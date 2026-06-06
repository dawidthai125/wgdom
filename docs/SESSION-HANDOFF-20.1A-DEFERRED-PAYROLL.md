# Sprint 20.1A Closure

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Release

* **v2.45.38**
* Commit **`f24fafe`** — `feat(payroll): add deferred payroll payment (20.1A)`
* Production: https://www.wgdom.fun

---

## Cel

Jednorazowe przeniesienie wypłaty na następny tydzień.

---

## Model

**MODEL A** — zamrożona kwota w momencie kliknięcia ⏭. Kwota `payrollCarryForward.amount` **nie** przelicza się po późniejszej zmianie godzin ani stawki w tygodniu źródłowym.

---

## Zakres

| Obszar | Pliki / klucze |
|--------|----------------|
| **payrollCarryForward** | `WeekEmployee.payrollCarryForward` w `kw-week-employees` — bez nowego klucza KV |
| **PayrollView** | `calcWeekEmployeeForPayroll`, ⏭ UI, totals, export |
| **WeekEmployeeDetail** | Przycisk defer, banery carry |
| **Archive Snapshot** | `buildWeekSnapshot(..., savedWeeksForCarry)` → `carryForwardOut/In` w `EmployeeSnapshot` |
| **PDF** | `payrollNetDisplayText` — PRZENIESIONO / suma z przen. |
| **DOCX** | Ten sam tekst co PDF |
| **Sync** | `pickPayrollCarryForward()` w `mergeWeekEmployeeRecord` |
| **Import cycle fix** | `payroll-carry-snapshot.ts` — snapshot bez cyklu `app-domain` ↔ `payroll-leave-overlay` |

**Priorytet overlay:** urlop → carry out → carry in → biweekly  
**Biweekly V1:** defer **zablokowany** (`canDeferPayroll` → `biweekly_blocked`)

---

## Problemy wykryte podczas wdrożenia

### 1. Vite HMR CommandCenterContext crash

**Objaw:** `useCommandCenterContext wymaga CommandCenterProvider (canViewTendersNav)` na Pulpicie w dev.

**Przyczyna:** Niespójny stan HMR Vite — dwie instancje `CommandCenterContext.tsx` z różnymi `?t=` w tym samym drzewie React (partial invalidation po zmianach 20.1A).

**Status:**

* Nie był regresją produkcyjną
* Eksperyment `DashboardView.tsx` (Guarded provider) **nie wszedł** do commita `f24fafe`
* Po pełnym restarcie `npm run dev` problem **nie reprodukuje się**
* Produkcja (Vercel bundle) — **PASS**

---

## Wyniki testów

| Test | Wynik |
|------|-------|
| `scripts/post-smoke-20.1a.mjs` | **PASS** |
| `scripts/smoke-test-payroll-carry-forward-20.1a.mjs` | **PASS** |
| `scripts/smoke-test-employee-leaves-20.0a.mjs` (regresja) | **PASS** |
| `npm run build` | **PASS** |
| Production deploy (Vercel @ `f24fafe`) | **PASS** |
| Bundle verification (2.45.38, `payrollCarryForward`) | **PASS** |

---

## Status

**CLOSED**

---

## Następny sprint

TBD
