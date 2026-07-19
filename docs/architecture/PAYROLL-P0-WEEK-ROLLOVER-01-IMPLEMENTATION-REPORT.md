# PAYROLL-P0-WEEK-ROLLOVER-01 — IMPLEMENTATION REPORT

> **Incident:** PAYROLL-P0-WEEK-ROLLOVER-01  
> **Status:** IMPLEMENTATION COMPLETE · **czekaj na Owner Verification**  
> **Data:** 2026-07-19  
> **COMMIT / PUSH:** **NIE**  
> **Wersja UI:** **2.65.34** (changelog lokalny, nie na prod)

---

## 1. Zakres

| IN | OUT |
|----|-----|
| `classifyPayrollWeekTransition` + **PAYROLL-ROLL-001** | PWRB API |
| `tryPayrollWeekCycle` / mount align | `cloud-sync.ts` merge B4 |
| Real rollover → `autoArchiveAndAdvance` | Edge Functions |
| Testy P0 + regresja 03/04 | Payroll calc / biweekly formula rewrite |

---

## 2. PAYROLL-ROLL-001 (zaimplementowane)

| Ścieżka | Zachowanie |
|---------|------------|
| **Bootstrap / align** | Stored week **już w archiwum** → `setWeekFrom/To` only → `return` (bez clear) |
| **Real rollover** | Calendar-behind + żywy roster + **brak** archiwum stored → `autoArchiveAndAdvance` (archive → clear → advance → `pushPayrollWeekAfterRollover`) |

---

## 3. Pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/payroll-cycle.ts` | `classifyPayrollWeekTransition`, `PAYROLL_ROLL_001`; `resolvePayrollOperationalWeekKeys` deleguje + `kind` |
| `src/app/App.tsx` | `tryPayrollWeekCycle` + mount-effect wg ROLL-001 |
| `scripts/test-payroll-p0-week-rollover-01.mjs` | nowy |
| `scripts/test-payroll-display-p0-regression-03/04.mjs` | zaktualizowane pod ROLL-001 |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.65.34** |

---

## 4. Kryterium rozróżnienia

```text
calendarBehind && liveRosterCount > 0
  ├─ findPayrollWeekSnapshot(stored) ma weekEmployees → ALIGN
  └─ else → ROLLOVER (autoArchiveAndAdvance)
```

---

## 5. Weryfikacja lokalna

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `test-payroll-p0-week-rollover-01.mjs` | **20 PASS** |
| `test-payroll-display-p0-regression-03.mjs` | **14 PASS** |
| `test-payroll-display-p0-regression-04.mjs` | **19 PASS** |
| Protected Core (cloud-sync / PWRB / Edge) | **0 diff** |

---

## 6. Uwaga operacyjna (dane już pomieszane)

Fix chroni **kolejne** rollovery. Jeśli prod już ma nowe daty + stary roster bez archiwum — może być potrzebny ręczny recovery (PLAN §6) przed/po deploy.

---

**Koniec IMPLEMENTATION REPORT**
