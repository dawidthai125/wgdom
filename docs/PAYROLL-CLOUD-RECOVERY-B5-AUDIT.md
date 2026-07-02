# PAYROLL-CLOUD-RECOVERY — Etap 2 B5 · AUDIT ARCHITEKTURY (RCA-2 Closed Week UI)

> **Status:** **AUDIT COMPLETE** · **READ ONLY** · **IMPLEMENT: NO GO**  
> **Data audytu:** 2026-07-01  
> **Baseline prod:** **v2.63.21** · commit **`b3d5664`** · **PRODUCTION VERIFIED**  
> **STABILIZATION WINDOW:** ACTIVE  
> **Workflow:** AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → RELEASE → VERIFY

---

## Werdykt

```text
AUDIT B5:        COMPLETE
RCA-2:           CONFIRMED — split-brain PayrollView (display vs mutation SSOT)
DESIGN FREEZE:   NOT STARTED
IMPLEMENT:       NO GO
```

| Pole | Wartość |
|------|---------|
| **Bundle** | B5 — RCA-2: closed week + archiwum UI (legacy P0.1b) |
| **Root cause** | `PayrollView` częściowo renderuje snapshot (`payrollEmployees`), mutacje i gate’y opierają na live `weekEmployees` (KV) |
| **Lib layer** | `payroll-cycle`, `payroll-rollover`, `buildWeekSnapshot`, B4 merge — **poprawne**; bug w UI orchestration |
| **Ortogonalność** | B3 guard · B6 Edge — poza scope; B4 może pogłębiać rozjazd live vs archiwum |

---

## 1. Current architecture

### 1.1 Model danych KV (payroll)

| Klucz | Zawartość | Scope |
|-------|-----------|-------|
| `kw-weekFrom` / `kw-weekTo` | Aktywny zakres dat w UI | Jeden parę na sesję LS |
| `kw-week-employees` | **Bieżący operacyjny skład** (`WeekEmployee[]`) | **Nie** per-week history — jeden wektor |
| `kw-archive` | `WeekSnapshot[]` — backup + `weekEmployees` freeze | Historia tygodni |
| `kw-employee-leaves` | Urlopy overlay (live) | Globalny |
| `kw-jobs` | Przydziały `workEntries[]` | Globalny |

**Fakt architektoniczny:** historia operacyjna tygodnia żyje w `kw-archive[].weekEmployees`, nie w osobnym kluczu KV per tydzień.

### 1.2 Warstwy semantyczne (saved vs closed)

| Koncept | Helper | Plik | Znaczenie |
|---------|--------|------|-----------|
| **Saved** | `isPayrollWeekSaved` | `payroll-cycle.ts` | Snapshot backup istnieje — **nie** zamyka tygodnia |
| **Closed (kalendarz)** | `isPayrollWeekClosed` | `payroll-cycle.ts` | `weekFrom/weekTo ≠ getPayrollWeekRange(now)` |
| **Closed (UI)** | `isPayrollWeekClosedForUi` | `payroll-cycle.ts` | Closed **chyba że** `hasRolloverBlockers` (Sprint 20.1D) |
| **Defer ⏭** | `canDeferPayroll` → `closed_week` | `payroll-carry-forward.ts` | Zablokowany gdy UI closed |

### 1.3 Diagram architektury (as-is)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ CloudLoader (bootstrap)                                                    │
│   mergeAllDataKeys → applyBootstrapPayrollMerge (= finalizePayroll…)    │
│   persist BOOTSTRAP_CORE_KEYS incl. week-employees, archive, weekFrom/To  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│ App.tsx (orchestracja)                                                   │
│   weekEmployees, savedWeeks, weekFrom, weekTo (useLocalStorage)         │
│   buildWeekSnapshot · refreshSavedActiveWeekSnapshot                      │
│   autoArchiveAndAdvance · tryPayrollWeekCycle · toggleSettled           │
│   persistPayrollRoster (guard kw-week-employees)                        │
└───────────────┬─────────────────────────────┬─────────────────────────────┘
                │                             │
     ┌──────────▼──────────┐       ┌──────────▼──────────┐
     │ PayrollView         │       │ ArchiveView          │
     │ payrollEmployees?   │       │ week.weekEmployees   │
     │ vs weekEmployees    │       │ patchArchiveWeek*    │
     └──────────┬──────────┘       └─────────────────────┘
                │
     ┌──────────▼──────────────────────────────────────────┐
     │ Runtime sync (focus / auto)                            │
     │ computeMergedDataBundle                                │
     │   → finalizePayrollBundleMerge (B4 SSOT)               │
     │   → applyRuntimePayrollAntiLeak (rollover only)        │
     └────────────────────────────────────────────────────────┘
```

### 1.4 Payroll week lifecycle

| Faza | Trigger | Akcja | Pliki |
|------|---------|-------|-------|
| **Operacyjny** | Bieżący Pn–So | Live `weekEmployees`, edycja, defer OK | `PayrollView`, `App.tsx` |
| **Saved (backup)** | „Zapisz tydzień” / auto niedziela | `buildWeekSnapshot` → `savedWeeks` | `App.tsx` `doSaveWeek`, `trySundayArchiveOnly` |
| **Blocked rollover** | `!settled && saturdayCash > 0` | Tydzień **operacyjny** mimo kalendarza (20.1D) | `payroll-rollover.ts` |
| **Rollover** | Nd ≥20:00 lub Pn+ bez blockers | `autoArchiveAndAdvance`: snapshot + `weekEmployees=[]` + push | `App.tsx` L1601–1624 |
| **Closed (UI)** | Kalendarz za `getPayrollWeekRange` + brak blockers | Podgląd ze snapshotu (częściowy) | `PayrollView` L610–614 |
| **History browse** | Zmiana dat w LP / Archiwum | LP: split-brain; Archiwum: SSOT snapshot | `PayrollView`, `ArchiveView` |

### 1.5 `finalizePayrollBundleMerge` (B4 — poza root cause B5)

Ścieżki: **bootstrap** (`CloudLoader` → `applyBootstrapPayrollMerge`) i **runtime** (`computeMergedDataBundle`).

Pipeline:
1. `alignWeekRangeInMerged`
2. `sanitizeWeekEmployeesForTargetRange` (`mergeWeekEmployeesForWeekRange`)
3. Week mismatch guard 20.1C.1
4. P11 richness override (bogatsza chmura → `mergeWeekEmployees([], cloud)`)

Runtime-only: `applyRuntimePayrollAntiLeak` — pusty nowy tydzień + bogate archiwum → wyczyść `weekEmployees`.

**Wpływ na B5:** sync może wzbogacić **live** roster podczas gdy UI closed pokazuje **archiwum** → większy delta `showRestoreBanner`; nie naprawia ani nie powoduje split-brain UI.

---

## 2. UI flow

### 2.1 PayrollView — stany UI

| Stan | Warunki | Baner | Źródło tabeli | Edycja |
|------|---------|-------|---------------|--------|
| **A — Operacyjny** | `!isClosedWeek` | brak / sobota | `weekEmployees` | Pełna |
| **B — Saved operacyjny** | `isSavedWeek && !isClosedWeek` | emerald „kopia zapasowa” | `weekEmployees` (live) | Pełna + refresh snapshot |
| **C — Closed + archiwum** | `isClosedWeek && archivedForWeek.weekEmployees` | violet „historyczny” | `archivedForWeek.weekEmployees` | **Częściowo aktywna (BUG)** |
| **D — Closed bez archiwum** | `isClosedWeek && !archivedForWeek.weekEmployees` | violet | **fallback `weekEmployees`** (BUG) | Pełna (sprzeczność) |

### 2.2 ArchiveView — wzorzec poprawny

- Lista tygodni z `savedWeeks`
- Edycja przez `onUpdateWeekEmployee*(weekId, …)` → `patchArchiveWeek` w `App.tsx`
- `WeekEmployeeDetail` **bez** `isClosedWeek` — edycja snapshotu jest **zamierzona**
- `onToggleArchiveSettled(weekId, empId)` — settled na snapshot, nie live KV

### 2.3 Przepływ użytkownika (closed week)

```text
Użytkownik ustawia daty W1 (historyczny)
  → isClosedWeek = true
  → baner violet
  → tabela z archivedForWeek.weekEmployees (jeśli istnieje)
  → klik wiersza: selectedEmpId = snapshot UUID
  → selectedEmp = weekEmployees.find(id) → null (po rolloverze)
  → panel szczegółów NIE OTWIERA SIĘ
  → przyciski Dodaj/Zapisz/Usuń nadal widoczne → mutują live KV (W2)
```

---

## 3. State flow

### 3.1 React state (`App.tsx`)

| State | Storage | Powiązanie z tygodniem |
|-------|---------|------------------------|
| `weekEmployees` | `kw-week-employees` | **Tylko bieżący operacyjny skład** — nie przełącza się przy `onWeekChange` |
| `savedWeeks` | `kw-archive` | Wszystkie tygodnie |
| `weekFrom` / `weekTo` | `kw-weekFrom` / `kw-weekTo` | Wybrany zakres UI — **może ≠ roster scope** |

### 3.2 `onWeekChange` (AdminViewRouter L481–484)

```typescript
onWeekChange={(f, t) => { setWeekFrom(f); setWeekTo(t); }}
```

**Brak:** przeładowania rosteru, przełączenia trybu read-only, synchronizacji z archiwum.

### 3.3 `refreshSavedActiveWeekSnapshot` (App.tsx L1259–1271)

- Aktualizuje snapshot **tylko** gdy `!isPayrollWeekClosedForUi`
- Wywoływane po mutacjach rosteru (add, remove, day, settled, defer…)
- **Poprawne** — nie nadpisuje archiwum historycznego podczas operacyjnej edycji

### 3.4 Auto-restore przy mount (App.tsx L1706–1720)

- Jednorazowy: jeśli `weekEmployees.length === 0` i snapshot dla `weekFrom/weekTo` istnieje → restore do live KV
- **Nie** uruchamia się przy nawigacji wstecz po rolloverze

---

## 4. Data flow

### 4.1 Snapshot creation (`buildWeekSnapshot`)

**Plik:** `app-domain.ts` L1855–1916

Wejście: live `weekEmployees` + `jobs` + `employeeLeaves` + opcjonalny `existing` snapshot.

Wyjście `WeekSnapshot`:
- `employees[]` — zamrożone sumy + carry + leaveStatus
- `weekEmployees[]` — **deep copy** pełnych `WeekEmployee` (godziny, stawki, settled)
- `workEntries[]` — z jobs lub z existing

### 4.2 PayrollView display pipeline

```text
weekEmployees (KV) ──┐
                   ├── isClosedWeek? ──► payrollEmployees
archivedForWeek ───┘         │
                             ▼
                    calcWeekEmployeeForPayroll
                    (archivedSnapshot / livePayroll)
                             ▼
                           rows → tabela, PDF, cashSplit
```

### 4.3 Mutation pipeline (operacyjny)

```text
UI action (PayrollView)
  → onUpdate* / toggleSettled / persistPayrollRoster
  → setWeekEmployees (kw-week-employees)
  → refreshSavedActiveWeekSnapshot (jeśli !closed)
  → withKwWeekEmployeesAsyncMutation → push cloud
```

### 4.4 Cloud bootstrap vs runtime

| Faza | Entry | Payroll merge |
|------|-------|---------------|
| Bootstrap | `CloudLoader` mount | `applyBootstrapPayrollMerge` |
| Runtime pull | `runCloudSync`, focus | `computeMergedDataBundle` |
| Rollover push | `pushPayrollWeekAfterRollover` | Osobny kontrakt (archive + pusty roster) |

`kw-archive` merge: `mergeArchive` — richness + `savedAt` + `mergeWeekEmployees` per week key.

---

## 5. Edge cases

| ID | Scenariusz | Zachowanie as-is | Ocena |
|----|------------|------------------|-------|
| **E1** | Nd ≥20:00 + blockers na W1 | `isClosedWeekForUi=false` — operacyjny W1 | OK (20.1D T2) |
| **E2** | Nd ≥20:00 + wszyscy rozliczeni | `isClosedWeek=true`, auto-advance W2 | OK |
| **E3** | Rollover → W2 pusty, user wraca datami na W1 | Tabela snapshot, panel null, mutacje na W2 | **FAIL** |
| **E4** | Closed W1 bez snapshotu w archiwum | Baner violet + live `weekEmployees` | **FAIL** |
| **E5** | Saved + operacyjny, edycja godzin | Live + refresh snapshot | OK |
| **E6** | Closed, klik „Zapisz tydzień” | `doSaveWeek` z live roster dla dat W1 | **FAIL** (nadpisanie) |
| **E7** | `showRestoreBanner` na closed week | CTA „Przywróć” gdy już na snapshotcie | **FAIL** (mylące) |
| **E8** | B4 P11: sync wzbogaca live pod closed UI | Tabela archiwum, live bogatszy | Niespójność (symptom) |
| **E9** | `applyRuntimePayrollAntiLeak` po rolloverze | `weekEmployees=[]` — OK | OK |
| **E10** | ArchiveView edycja W1 | `patchArchiveWeek` — snapshot only | OK (wzorzec) |
| **E11** | Przydziały (assignments mode) na closed | Mutuje `kw-jobs` bez guard | **FAIL** |
| **E12** | UUID snapshot ≠ UUID live po restore | `toggleSettled(snapshotId)` no-op | **FAIL** |

---

## 6. Risks

| ID | Ryzyko | Sev | Mitigacja (freeze) |
|----|--------|-----|---------------------|
| R1 | Mutacja W2 podczas podglądu W1 | **CRITICAL** | Read-only gating `isClosedWeek` |
| R2 | Nadpisanie archiwum W1 danymi W2 (`saveWeek`) | **HIGH** | Wyłączyć save/mutacje rosteru gdy closed |
| R3 | Panel szczegółów niedostępny po rolloverze | **HIGH** | `selectedEmp` z `payrollEmployees` |
| R4 | Regresja 20.1D blockers exception | MED | Gate smoke 20.1d T1–T6 |
| R5 | Zablokowanie edycji saved operacyjnego | MED | `isClosedWeek` ≠ `isSavedWeek` |
| R6 | Duplikacja logiki Archive vs Payroll closed | MED | LP closed = read-only; edycja historii w Archiwum |
| R7 | Brak testu integracyjnego UI closed | MED | `test-payroll-closed-week-ui-rca2.mjs` |

---

## 7. Duplicate logic

| Obszar | Lokalizacja A | Lokalizacja B | Werdykt |
|--------|---------------|---------------|---------|
| Podgląd archiwum tygodnia | `PayrollView` (closed, częściowy) | `ArchiveView` (pełny) | **Duplikat niepełny** — LP powinien delegować read-only |
| Edycja snapshotu | `patchArchiveWeek*` (App) | `updateWeekEmployee*` (live) | **Dwa SSOT** — OK jeśli LP closed nie używa live path |
| Closed detection | `isPayrollWeekClosed` | `isPayrollWeekClosedForUi` | **OK** — różne role (legacy vs UI) |
| Biweekly + leave overlay | `payroll-leave-overlay` | `PayrollView` cashSplit | **OK** — reuse `calcBiweeklyWeekNetWithLeave` |
| Richness restore CTA | P11 merge (`cloud-sync`) | `showRestoreBanner` (`PayrollView`) | **Powiązane** — banner bez `!isClosedWeek` |
| `WeekEmployeeDetail` | PayrollView (live path) | ArchiveView (archive path) | **Reuse komponentu** — brak `readOnly` prop |

---

## 8. SSOT violations

| # | Naruszenie | Dowód | Severity |
|---|------------|-------|----------|
| **V1** | **Display SSOT ≠ Mutation SSOT** w `PayrollView` | `payrollEmployees` vs `weekEmployees` L611–737 | **PRIMARY** |
| **V2** | **Gate SSOT** używa live zamiast display | `weekEmployees.length` empty/export L1039, L974 | HIGH |
| **V3** | **Selection SSOT** — `selectedEmp` z live KV | L737 vs rows ze snapshot | HIGH |
| **V4** | **Closed semantics** — baner „snapshot” + live fallback | L611–614, L838 | MED |
| **V5** | **Week range SSOT** — `weekFrom/weekTo` nie wiąże rosteru | `onWeekChange` tylko daty | MED |
| **V6** | **Archive edit SSOT** — LP mutuje live zamiast `patchArchiveWeek` | `toggleSettled`, `onUpdateWeekEmployeeDay` | HIGH |

**Nie naruszone (zachować):**
- `isPayrollWeekClosedForUi` + `hasPayrollRolloverBlockers` (lib SSOT)
- `finalizePayrollBundleMerge` (merge SSOT B4)
- `ArchiveView` → `patchArchiveWeek` (archiwum SSOT)
- `buildWeekSnapshot` (snapshot SSOT)

---

## 9. Files involved

### 9.1 Core (B5 scope)

| Plik | Rola w audycie |
|------|----------------|
| `src/app/PayrollView.tsx` | Split-brain, banery, gate’y, mutacje — **główny plik B5** |
| `src/app/WeekEmployeeDetail.tsx` | Brak read-only gdy `isClosedWeek` (tylko defer hidden) |
| `src/app/App.tsx` | Orchestracja: snapshot, rollover, restore, `toggleSettled`, `onWeekChange` wiring |
| `src/app/admin/AdminViewRouter.tsx` | `onWeekChange` — tylko daty |
| `src/lib/payroll-cycle.ts` | `isPayrollWeekSaved/Closed/ClosedForUi`, `getPayrollWeekRange` |
| `src/lib/payroll-rollover.ts` | `hasPayrollRolloverBlockers` → wpływ na closed UI |
| `src/lib/payroll-leave-overlay.ts` | Overlay archiwum vs live przy closed |
| `src/lib/payroll-carry-forward.ts` | `canDeferPayroll` + `closed_week` |
| `src/app/app-domain.ts` | `buildWeekSnapshot`, `WeekSnapshot` model |

### 9.2 Reference (wzorzec poprawny / kontekst)

| Plik | Rola |
|------|------|
| `src/app/ArchiveView.tsx` | SSOT edycji historii (`weekId`-scoped handlers) |
| `src/app/CloudLoader.tsx` | Bootstrap merge payroll |
| `src/lib/cloud-sync.ts` | `finalizePayrollBundleMerge`, `mergeArchive`, anti-leak |
| `src/app/PayrollJobAssignmentsPanel.tsx` | Brak `isClosedWeek` — mutacje jobs |

### 9.3 Testy (gate)

| Plik | Status |
|------|--------|
| `scripts/smoke-test-payroll-week-closed-20.1d.mjs` | **6/6 PASS** (lib semantics) |
| `scripts/smoke-test-payroll-carry-forward-20.1b.mjs` | Regresja saved/closed |
| `scripts/pre-commit-verify-20.1b.mjs` | Regresja carry |
| `scripts/test-payroll-closed-week-ui-rca2.mjs` | **BRAK** — proponowany w freeze |

### 9.4 Dokumentacja

| Plik |
|------|
| `docs/ARCHITECTURE.md` §10.1 (carry, saved/closed) |
| `docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md` |
| `docs/PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md` |

---

## 10. Recommended DESIGN FREEZE scope

### 10.1 W scope B5 (MIN)

| ID | Zmiana | Pliki |
|----|--------|-------|
| **B5-S1** | Jeden `displayEmployees` SSOT w `PayrollView` dla tabeli, selekcji, gate’ów, eksportu | `PayrollView.tsx` |
| **B5-S2** | Tryb **read-only** gdy `isClosedWeek` — wyłączyć mutacje rosteru, save, restore banner, settled/delete, add/replace/clear | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` (`readOnly`) |
| **B5-S3** | Closed bez snapshotu: empty state + komunikat (brak live fallback) | `PayrollView.tsx` |
| **B5-S4** | `showRestoreBanner` tylko gdy `!isClosedWeek` | `PayrollView.tsx` |
| **B5-S5** | Przydziały: read-only lub ukrycie trybu assignments gdy closed | `PayrollView.tsx`, opcj. `PayrollJobAssignmentsPanel.tsx` |
| **B5-S6** | Test `test-payroll-closed-week-ui-rca2.mjs` (C1–C5) | **NOWY** |
| **B5-S7** | Changelog + ARCHITECTURE §10.1 jedna linia | docs |

### 10.2 Poza scope B5 (explicit NO)

| Element | Powód |
|---------|-------|
| Zmiana `payroll-cycle.ts` semantyki saved/closed | Zamknięte sprinty 20.1B/20.1D |
| `finalizePayrollBundleMerge` / CloudLoader | B4 CLOSED |
| `CloudSyncMutationGuard` | B3 CLOSED |
| Edge `batch-set` parity | B6 osobny bundle |
| Per-week `kw-week-employees` w KV | Nowy model danych |
| Pełna edycja historii w LP | Zostaje w `ArchiveView` |
| `TEST-INFRA-001` harness | Osobny epic |

### 10.3 Acceptance criteria (propozycja freeze)

| AC | Kryterium |
|----|-----------|
| B5-AC1 | `isClosedWeek` → brak mutacji `kw-week-employees` z LP |
| B5-AC2 | Panel szczegółów otwiera się po rolloverze + nawigacja W1 |
| B5-AC3 | Closed bez archiwum → empty state, brak violet+live sprzeczności |
| B5-AC4 | Saved operacyjny (`isSavedWeek && !isClosedWeek`) bez regresji |
| B5-AC5 | 20.1D T1–T6 PASS + nowy test RCA-2 PASS |
| B5-AC6 | Brak nowych Principles / KV |

### 10.4 Release (propozycja)

- **Wersja:** 2.63.22 (patch)
- **Tryb:** FAST RELEASE (frontend-only)
- **Klasyfikacja:** BUGFIX + UX
- **Deploy:** Vercel only

---

## GO / NO GO

| Etap | Status |
|------|--------|
| **AUDIT B5** | **COMPLETE** |
| **DESIGN FREEZE** | **NOT STARTED** — na akceptację właściciela |
| **IMPLEMENT** | **NO GO** |

---

*SSOT audytu B5: ten plik · bez implementacji do DESIGN FREEZE GO.*
