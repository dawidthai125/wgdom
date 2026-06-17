# SESSION HANDOFF — Lista Płac · Przydziały robót (PAYROLL-ASSIGNMENTS-P1)

> **Status:** **P1 CLOSED** · prod **2.59.49** · commit **`94ad114`** · **PRODUCTION VERIFIED**  
> **Data closeout:** 2026-06-16  
> **Raport implementacji:** [`audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md`](../audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md)

---

## 1. Cel biznesowy (zrealizowany)

Administrator codziennie:

1. Wpisuje godziny w **Liście Płac** (Szczegóły dni).
2. Przypisuje pracowników do robót — wcześniej tylko przez **Roboty → Pracownicy** (szukanie roboty po robocie).

**P1** dodaje trzeci widok w Liście Płac: **Przydziały robót** — szybki edytor tych samych danych co Roboty → Pracownicy, bez nowego KV i bez zmiany modelu godzin/wypłat.

---

## 2. Twarde ograniczenia (NIE łamać w P2+)

| Zakaz | Powód |
|-------|--------|
| Zmiana modelu godzin pracownika (`emp.days`) z tego widoku | SSOT godzin = Lista Płac |
| Nowy klucz KV / nowa domena danych | Przydziały = `job.workEntries[]` w `kw-jobs` |
| Duplikacja algorytmu spójności | Używać `payrollJobConsistencyAlerts` z `app-domain.ts` |
| Zmiana liczenia wypłat, zaliczek, sobót, Grafiku | P1 = tylko dodatkowy widok edycji |

---

## 3. Architektura danych

```text
┌─────────────────────────────────────────────────────────────────┐
│  kw-week-employees (WeekEmployee[])                              │
│  emp.days[Pn…So]  ← JEDYNE źródło godzin (dayBaseHoursOnly)     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ read-only w panelu przydziałów
                            ▼
              PayrollJobAssignmentsPanel (PayrollView)
                            │ read/write
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  kw-jobs (Job[])                                                 │
│  job.workEntries[]  ← SSOT przydziałów (WorkEntry)              │
│  { id, directoryId, employeeName, date, hours, rate, notes? }   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ ta sama struktura co JobsView
                            ▼
              Roboty → Pracownicy (JobsView.tsx)
```

**Sync zapisu:** `onSetJobs={setJobs}` z `App.tsx` → `useLocalStorage("kw-jobs")` + auto-sync chmury (jak Roboty).

---

## 4. Struktura UI — Lista Płac

**Plik:** `src/app/PayrollView.tsx`

### 4.1 Trzy tryby listy (`payrollListMode`)

| Tryb | localStorage key | Zawartość |
|------|------------------|-----------|
| `summary` | `wg-payroll-list-mode` | Tabela sum (domyślny) |
| `detailed` | j.w. | Szczegóły dni Pn–So |
| `assignments` | j.w. | Lista pracowników + badge spójności |

Przełączniki: ten sam styl co Sumy / Szczegóły dni (inline-flex, role=tab).

### 4.2 Panel boczny (wybór pracownika)

| `payrollListMode` | Panel |
|-------------------|--------|
| `summary` / `detailed` | `WeekEmployeeDetail` — godziny, zaliczki, koszty, defer |
| `assignments` | `PayrollJobAssignmentsPanel` — edycja `workEntries` |

### 4.3 Badge na liście (tryb assignments)

| Badge | Warunek (reuse alertów) |
|-------|-------------------------|
| 🟢 Spójne | brak alertów dla pracownika |
| 🟡 Nieprzypisane | `payroll_only` |
| 🔴 Niezgodność | `mismatch` lub `job_only` |
| (brak) | `multiSiteDaily` — pomijany w spójności |

Helper: `employeePayrollAssignmentBadge()` w `payroll-job-assignments.ts`.

---

## 5. Struktura funkcji — `PayrollJobAssignmentsPanel`

**Plik:** `src/app/PayrollJobAssignmentsPanel.tsx`

Per dzień tygodnia (`weekDayColumns(weekFrom)`):

| Element UI | Akcja |
|------------|--------|
| Dropdown robota | `moveWorkEntryToJob()` — tylko roboty `inferJobPhase !== "completed"` |
| Input godzin | `updateWorkEntryHoursInJobs()` |
| Usuń (×) | `removeWorkEntryFromJobs()` |
| + Dodaj robociznę | `addWorkEntryForEmployee()` — domyślnie pozostałe h z LP |
| Kopiuj z wczoraj | `copyEmployeeAssignmentsFromPreviousDay()` — proporcje wczoraj, suma = LP dziś |
| Stopka dnia | `dayPayrollAssignmentFooter()` → Lista Płac Xh · Roboty Yh · ✅/❌ |

---

## 6. Biblioteka — `src/lib/payroll-job-assignments.ts`

| Eksport | Rola |
|---------|------|
| `jobsForPayrollAssignmentDropdown` | Filtr robót niearchiwalnych |
| `payrollAssignmentAlertsForWeek` | Wrapper na `payrollJobConsistencyAlerts` |
| `employeePayrollAssignmentBadge` | 🟢🟡🔴 |
| `dayPayrollAssignmentFooter` | Tekst stopki dnia |
| `employeeDayAssignmentRows` | Wrapper `jobSitesForEmployeeOnDate` |
| `canCopyAssignmentsFromPreviousDay` | Warunek CTA kopiowania |
| `copyEmployeeAssignmentsFromPreviousDay` | Mutacja jobs + `distributeHoursAcrossEntries` |
| `updateWorkEntryHoursInJobs` | PATCH hours |
| `removeWorkEntryFromJobs` | DELETE entry |
| `moveWorkEntryToJob` | Zmiana jobId (nowe id wpisu) |
| `addWorkEntryForEmployee` | INSERT entry |

**Reuse z `app-domain.ts` (nie duplikować):**

- `payrollJobConsistencyAlerts`, `jobHoursComparableToPayrollBase`, `jobSitesForEmployeeOnDate`
- `distributeHoursAcrossEntries`, `dayBaseHoursOnly`, `workEntryMatchesEmployee`
- `fixJobsForConsistencyAlert` — tylko Dashboard (auto-fix); panel P1 nie wywołuje

---

## 7. Integracja routera

**Plik:** `src/app/admin/AdminViewRouter.tsx`

```tsx
<PayrollView
  ...
  jobs={jobs}
  onSetJobs={setJobs}   // ← dodane w P1
/>
```

Bez tego propa panel nie zapisuje do `kw-jobs`.

---

## 8. Spójność LP ↔ Roboty (Dashboard)

**SSOT algorytmu:** `payrollJobConsistencyAlerts()` w `src/app/app-domain.ts`

- Godziny LP: `dayBaseHoursOnly(emp.days[dayKey])`
- Godziny robót: `jobHoursComparableToPayrollBase(...)` (nadmiar = dodatkowe h z LP nie liczy się jako rozbieżność)
- Multi-site (`directory.multiSiteDaily`): pomijany w alertach

Dashboard **Spójność** i panel **Przydziały robót** używają tego samego źródła — nie tworzyć trzeciej logiki.

---

## 9. Testy

```bash
npm run build
npx vite-node scripts/test-payroll-assignments-p1.mjs   # T01–T07, 16 asercji
npx vite-node scripts/test-dashboard-v3-counts.mjs      # regresja Dashboard (spójność lib)
```

| Test | Scenariusz |
|------|------------|
| T01 | 1 pracownik, 1 robota, 9h=9h |
| T02 | 2 roboty, 5+4=9h |
| T03 | LP 9h, roboty 7h → mismatch |
| T04 | edycja Roboty widoczna w helperach przydziałów |
| T05 | mutacje lib → suma 9h na 2 robotach |
| T06 | `dayBaseHoursOnly` bez regresji |
| T07 | `payrollJobConsistencyAlerts` bez regresji |

---

## 10. Release

| Pole | Wartość |
|------|---------|
| Wersja | **2.59.49** |
| Commit | **`94ad114`** |
| CHANGELOG | `src/app/changelog-data.ts` |
| HelpView | FAQ „Jak przypisać pracownika do robót z listy płac?” |
| Workflow | IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY FAST |

---

## 11. Backlog P2 (OPEN — tylko na polecenie)

P1 **nie implementować** bez nowego briefu:

| Id | Pomysł | Ryzyko |
|----|--------|--------|
| P2-A | Badge spójności także w trybach Sumy/Szczegóły | UX-only, niskie |
| P2-B | „Kopiuj cały tydzień” / „Kopiuj wczoraj dla wszystkich” | sync masowy — wymaga audytu |
| P2-C | Auto-fix spójności z panelu (reuse `fixJobsForConsistencyAlert`) | dotyk Dashboard semantics |
| P2-D | Activity log przy zapisie z LP (`appendJobActivity`, actor „Lista płac”) | nice-to-have |
| P2-E | Widok wszystkich pracowników naraz (macierz dzień×robota) | duży UX |

---

## 12. Powiązane dokumenty

| Dokument | Kiedy czytać |
|----------|--------------|
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) § 10.2 | Pełna sekcja architektury przydziałów |
| [`docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md) | Semantyka saved/closed listy płac |
| [`docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md) | Roboty → Pracownicy workflow |
| [`CURRENT-TASK.md`](../CURRENT-TASK.md) | Status sesji / następny temat |
