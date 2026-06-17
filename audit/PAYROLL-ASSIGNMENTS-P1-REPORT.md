# PAYROLL-ASSIGNMENTS-P1 — Raport końcowy

**Data:** 2026-06-16  
**Wersja:** **2.59.49**  
**Werdykt:** **RELEASE GO**

---

## Zakres

Widok **Przydziały robót** w Liście Płac — dodatkowy edytor istniejących `job.workEntries[]` bez nowego KV, bez zmian modelu godzin/wypłat.

---

## Zmienione pliki

| Plik | Rola |
|------|------|
| `src/lib/payroll-job-assignments.ts` | Pure helpers: dropdown robót, footer spójności, mutacje workEntries, kopia z wczoraj |
| `src/app/PayrollJobAssignmentsPanel.tsx` | Panel boczny edycji przydziałów per dzień |
| `src/app/PayrollView.tsx` | Tab „Przydziały robót”, lista z badge, warunkowy panel |
| `src/app/admin/AdminViewRouter.tsx` | Prop `onSetJobs={setJobs}` → PayrollView |
| `src/app/changelog-data.ts` | v2.59.49 |
| `src/app/GuideView.tsx` | FAQ przydziały |
| `CHANGELOG.md` | Skrót |
| `scripts/test-payroll-assignments-p1.mjs` | Smoke T01–T07 |

---

## Architektura

```
Lista Płac (godziny)          Roboty → Pracownicy
       │ read-only                    │ read/write
       ▼                              ▼
 dayBaseHoursOnly(emp.days)     job.workEntries[]  ← SSOT przydziałów (kw-jobs)
       │                              ▲
       └──── PayrollJobAssignmentsPanel ──┘
                    onSetJobs(setJobs)
```

- **Spójność:** reuse `payrollJobConsistencyAlerts`, `jobHoursComparableToPayrollBase`, `jobSitesForEmployeeOnDate`
- **Kopia wczoraj:** `distributeHoursAcrossEntries` + proporcje z `jobSitesForEmployeeOnDate`
- **Filtr robót:** `inferJobPhase !== "completed"`

---

## Build

```
npm run build → PASS (25.9s)
```

---

## Smoke

```
npx vite-node scripts/test-payroll-assignments-p1.mjs → 16/16 PASS
```

| Test | Wynik |
|------|-------|
| T01 9h=9h | PASS |
| T02 5+4=9h | PASS |
| T03 mismatch 7h vs 9h | PASS |
| T04 Roboty→Przydziały | PASS |
| T05 Przydziały→Roboty | PASS |
| T06 dayBaseHoursOnly | PASS |
| T07 payrollJobConsistencyAlerts | PASS |

---

## Regression

| Obszar | Wynik |
|--------|-------|
| Lista Płac (Sumy/Szczegóły) | Bez zmian logiki — tylko nowy tab |
| Wypłaty / zaliczki / sobota | Bez zmian |
| Grafik | Bez zmian kodu |
| Dashboard Spójność | Bez zmian — reuse alertów |
| Roboty → Pracownicy | Bez zmian — ten sam model |
| `test-dashboard-v3-counts.mjs` | PASS |

---

## Wpływ

| Moduł | Wpływ |
|-------|-------|
| Lista Płac | +tab + panel; godziny/wypłaty bez zmian |
| Grafik | Brak |
| Dashboard Spójność | Brak zmian algorytmu |

---

## Git / Deploy

| Pole | Wartość |
|------|---------|
| Commit | `94ad114` |
| Push | `main` → origin PASS |
| VERIFY DEPLOY FAST | `version.json` → **2.59.49** |
| PRODUCTION VERIFIED | **TAK** |
| RELEASE GO | **TAK** |
