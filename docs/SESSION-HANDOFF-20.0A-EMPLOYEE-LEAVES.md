# Sprint 20.0A Closure

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Release

* **v2.45.37**
* Commit **`778f616`** — `feat(payroll): add employee leave management (20.0A)`
* Production: https://www.wgdom.fun

---

## Cel

Wdrożenie **zarządzania nieobecnościami pracowników** (urlop, chorobowe, bezpłatny) w kartotece admina z pełną integracją listy płac: live overlay zerujący wypłatę, eksport PDF/DOCX ze statusem nieobecności, synchronizacja chmura z tombstone'ami oraz ochrona historycznych snapshotów archiwum.

---

## Zakres zmian

| Obszar | Pliki / klucze |
|--------|----------------|
| **Employee Leave CRUD** | `EmployeeLeavesSection.tsx`, `DirectoryView.tsx`, `employee-leaves.ts` |
| **Weekly Leave Ranges** | Tygodnie Pn–So (`listPayrollWeekRanges`, picker Od/Do) |
| **Payroll Overlay** | `payroll-leave-overlay.ts`, `PayrollView.tsx`, `toPayrollCalcRows` |
| **PDF/DOCX Integration** | `payroll-export.ts` — `payrollNetDisplayText`, URLOP w kolumnie Do wypłaty |
| **Archive Protection** | `buildWeekSnapshot` → `EmployeeSnapshot.leaveStatus`; archiwum bez live lookup |
| **Tombstone Sync** | `kw-employee-leaves-deleted-ids`, `mergeEmployeeLeaves`, Edge `batch-set` |
| **Biweekly Support** | `calcBiweeklyWeekNetWithLeave`, `computePayrollCashSplit` z callbackiem urlopu |

**KV:** `kw-employee-leaves` · **Tombstone:** `kw-employee-leaves-deleted-ids`  
**Edge:** walidacja payloadu leaves + filtrowanie deleted IDs przy batch-set

---

## Wykryte problemy podczas wdrożenia

### 1. Biweekly cash split

**Objaw:** Pracownik z wypłatą co 2 tygodnie miał niezerowy `totalSaturdayCash` / `biweeklyPayoutNet` mimo urlopu w tygodniu bieżącym.

**Przyczyna:** `computePayrollCashSplit` / `calcBiweeklyRowDisplay` liczyły net z surowych godzin, ignorując overlay urlopu.

### 2. Leave picker UX

**Objaw:** Błędny format dat w pickerze; tygodnie wstecz zamiast aktualnego zakresu płacowego; trudny wybór „Od–Do”.

**Przyczyna:** Brak spójności z `getPayrollWeekRange()` / `listPayrollWeekRanges()`; niepoprawne formatowanie dat.

### 3. Delete + Sync merge

**Objaw:** Usunięty urlop wracał po odświeżeniu / sync z chmury.

**Przyczyna:** `mergeEmployeeLeaves` robił union bez tombstone'ów; stale closure w `onCommit()` pushował stary stan; Edge nie filtrował usuniętych ID.

---

## Rozwiązania

| Problem | Rozwiązanie |
|---------|-------------|
| **Biweekly** | `calcBiweeklyWeekNetWithLeave` + opcjonalny callback w `calcBiweeklyRowDisplay` / `computePayrollCashSplit` — net=0 gdy `leaveStatus` |
| **Picker UX** | `fmtDate()`, `getPayrollWeekRange()`, `listPayrollWeekRanges()` — 52 tyg. w przód, bez archiwum; `weekStart`=Pn, `weekEnd`=So |
| **Delete + sync** | Tombstone `kw-employee-leaves-deleted-ids`; `commitEmployeeLeaves(next, deletedId?)`; merge filtruje deleted IDs; Edge batch-set respektuje tombstone list |

---

## Wyniki testów

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `scripts/smoke-test-employee-leaves-20.0a.mjs` | **PASS** (CRUD, overlay, PDF, DOCX, archiwum, biweekly, sync) |
| `scripts/test-leave-delete-sync-20.0a.mjs` | **PASS** |
| Production verification (Vercel + Edge GHA) | **PASS** |

---

## Status

**CLOSED**

---

## Następny sprint

**TBD**
