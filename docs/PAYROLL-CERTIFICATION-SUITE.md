# PAYROLL CERTIFICATION SUITE (test design — read-only)

> **Typ:** Zestaw testów regresyjnych modułu Lista Płac. **NIE** zwykły smoke — wykonywany po **każdej większej zmianie Payroll lub Cloud Sync**.
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** v2.63.27
> **Charakter:** AUDIT + TEST DESIGN. Bez implementacji, poprawek kodu, BUILD, COMMIT.
> **Zasada BUG:** wykryty błąd → **NIE naprawiać**; wpisać do §9 z reprodukcją.
> **Workflow:** AUDIT → TEST DESIGN → RAPORT → STOP.

---

## 0. Meta

### 0.1 Zasada każdego testu (ETAP 3)
Każdy test przechodzi 5 faz. Po `VERIFY CLEAN` stan systemu = **identyczny** jak przed `SETUP`.

```
SETUP        → przygotuj dane wejściowe (znany stan bazowy)
TEST         → wykonaj jedną akcję użytkownika
VERIFY       → sprawdź oczekiwany efekt (UI + KV local + KV cloud)
ROLLBACK     → cofnij zmianę (odwrotna akcja / restore snapshotu)
VERIFY CLEAN → potwierdź powrót do stanu bazowego (diff pusty)
```

### 0.2 Środowisko i narzędzia obserwacji
| Narzędzie | Zastosowanie |
|-----------|--------------|
| `__wgdomSyncMetrics()` | `{batchGet, batchSet, pushSkipped}` — liczba requestów per akcja |
| `localStorage.getItem('kw-week-employees')` | stan roster local (SSOT klienta) |
| DevTools Network `POST /batch-get` `/batch-set` | payload, latency, treść żądania |
| `[sync-metrics]` / `[payroll-guard]` console | ślad guardów |
| Supabase Dashboard → KV | stan cloud (weryfikacja push) |
| Konto testowe | pracownik `test`, tel. `+48 000 000 000` (tylko worker) |

> **Zasada bezpieczeństwa danych prod:** testy multi-device wykonywać na **sandbox tygodniu / sandbox pracownikach**, nie na realnym payrollu prod (TI-B2 `HARNESS_SANDBOX_JOB_IDS` — gate P0). Przy braku sandboxu: snapshot backup przed suitą + restore.

### 0.3 Inwarianty pod testem (co suita chroni)
| ID | Inwariant | Mechanizm |
|----|-----------|-----------|
| P-INV-1 | Godziny/dni nie znikają po sync | LWW `dataUpdatedAt`, `finalizePayrollBundleMerge` |
| P-INV-2 | `settled` nie cofa się po merge | `settledUpdatedAt` LWW, `preserveSettledLwwFromLocal` |
| P-INV-3 | Stawka LWW niezależna | `rateUpdatedAt` |
| P-INV-4 | Usunięty pracownik nie wraca | tombstone `kw-week-employees-deleted-ids` **(F2 — local-only, OPEN)** |
| P-INV-5 | Rollover nie „przecieka” starymi danymi | `applyRuntimePayrollAntiLeak` |
| P-INV-6 | Roster nie kurczy się bez powodu | `applyPayrollGuardBeforePush` (>50% shrink) |
| P-INV-7 | Auto-sync nie wyścig z mutacją | `CloudSyncMutationGuard`, `withKwWeekEmployeesAsyncMutation` |
| P-INV-8 | Bootstrap == runtime merge | B4 parity `finalizePayrollBundleMerge` |
| P-INV-9 | Edge == klient merge | B6 Edge parity |
| P-INV-10 | Zamknięty tydzień = read-only | `isClosedWeek` / `isPayrollWeekClosedForUi` |

### 0.4 Znane defekty (spodziewane FAIL — nie zgłaszać jako nowe)
| ID | Opis | Status | SSOT |
|----|------|--------|------|
| **F1** | Lost Update `extraCosts` (whole-array LWW na `dataUpdatedAt`) | OPEN HIGH · REPRO REQUIRED | [`PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md`](PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md) |
| **F2** | Resurrection — `kw-week-employees-deleted-ids` nie synchronizowany | OPEN P0 · S7-5 | [`PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md) |
| **RS-2** | `clearAllWeekEmployees` nie tworzy tombstonów | OPEN (pochodna F2) | Certification 2026 |
| **H1** | `batch-set` HTTP 500 (`kv.mset` timeout) | UNCONFIRMED | [`PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) |

---

## 1. ETAP 1 — Inwentaryzacja funkcji Payroll

Osadzenie w kodzie: `src/app/App.tsx`, `src/app/PayrollView.tsx`, `src/app/WeekEmployeeDetail.tsx`, `src/lib/payroll-*.ts`, `src/lib/cloud-sync.ts`.

| # | Funkcja użytkownika | Handler | Plik:linia | Klucz KV | Typ mutacji |
|---|---------------------|---------|-----------|----------|-------------|
| F01 | Dodanie pracownika z kartoteki | `onAddFromDirectory` → `persistPayrollRoster` | `PayrollView.tsx:509` · `App.tsx:1309` | `kw-week-employees` | EXPLICIT push |
| F02 | Usunięcie pracownika | `removeWeekEmployee` | `App.tsx:1350` | `kw-week-employees` (+ local tombstone) | EXPLICIT + tombstone |
| F03 | Wyczyść wszystkich | `clearAllWeekEmployees` | `App.tsx:1364` | `kw-week-employees` | EXPLICIT (**RS-2**) |
| F04 | Zamień na wszystkich aktywnych | `onReplaceWithAllActive` | `PayrollView.tsx:488` | `kw-week-employees` | EXPLICIT |
| F05 | Edycja rekordu (ogólna) | `updateWeekEmployee` | `App.tsx:1379` | `kw-week-employees` | AUTO (debounce 2 s) |
| F06 | Godziny (from/to) | `updateWeekEmployeeDay` | `App.tsx:1421` | `kw-week-employees` | AUTO |
| F07 | Dni (active on/off) | `updateWeekEmployeeDay` | `App.tsx:1421` | `kw-week-employees` | AUTO |
| F08 | Godziny dodatkowe | `updateWeekEmployeeDay` (`extraHours[]`) | `App.tsx:1421` | `kw-week-employees` | AUTO |
| F09 | Sobota poprzednia | `updateWeekEmployeePrevSaturday` | `App.tsx:1449` | `kw-week-employees` | AUTO |
| F10 | Zaliczki (per dzień) | `updateWeekEmployeeDay` (`day.zaliczka`) | `App.tsx:1421` | `kw-week-employees` | AUTO |
| F11 | Premie / koszty do zwrotu | `updateWeekEmployeeExtraCosts` | `App.tsx:1402` | `kw-week-employees` | AUTO (**F1**) |
| F12 | Akceptacja/odrzucenie kosztu | `onPatchExtraCosts` (status) | `WeekEmployeeDetail.tsx:263` | `kw-week-employees` | AUTO (**F1**) |
| F13 | Stawka PLN/h | `updateWeekEmployeeRate` | `App.tsx:1436` | `kw-week-employees` (`rateUpdatedAt`) | AUTO |
| F14 | Settled (rozliczony) | `onToggleSettled` | `App.tsx:1618` | `kw-week-employees` (`settledUpdatedAt`) | EXPLICIT (immediate) |
| F15 | Recoverable charges | panel „Do rozliczenia” | `recoverable-charges.ts` | `kw-recoverable-charges` (+ tombstone) | AUTO |
| F16 | Wybór roboty (przydział) | Przydziały robót → `workEntries[]` | `payroll-job-assignments.ts` | `kw-jobs` | EXPLICIT |
| F17 | Zmiana roboty | jw. | `payroll-job-assignments.ts` | `kw-jobs` | EXPLICIT |
| F18 | Zapisz tydzień (archive) | `onSaveWeek` → `savedWeeks` | `PayrollView.tsx:487` | `kw-archive` | EXPLICIT |
| F19 | Restore z archiwum | `restoreWeekFromArchive` | `App.tsx:1229` | `kw-week-employees` ← `kw-archive` | AUTO po zmianie |
| F20 | Rollover tygodnia | `tryPayrollWeekCycle` / `payrollWeekCycleRef` | `App.tsx:1736,1710` | `kw-weekFrom/To`, `kw-archive`, `kw-week-employees` | timer 60 s + anti-leak |
| F21 | Readonly (tydzień zamknięty) | `isClosedWeek` gating | `PayrollView.tsx:1471–1474` | — | brak (blokada edycji) |
| F22 | Urlopy / nieobecności | `EmployeeLeavesSection` | `employee-leaves.ts` | `kw-employee-leaves` (+ tombstone) | AUTO |
| F23 | Carry forward (odroczenie ⏭) | `handleDeferPayroll` / `updateWeekEmployeePayrollCarryForward` | `PayrollView.tsx:1470` · `App.tsx:1464` | `kw-week-employees` | AUTO |
| F24 | Edycja rekordu archiwum | `updateArchiveWeekEmployee*` | `App.tsx:1531–1608` | `kw-archive` | AUTO |
| F25 | Sync (pull+push) | `runCloudSync` / `pullFromCloudAndMerge` | `App.tsx:724,696` | pełny bundle | AUTO/focus/visibility |
| F26 | Restore payroll z chmury | `restorePayrollFromCloud` | `App.tsx:1174` | `kw-week-employees` | EXPLICIT |
| F27 | Eksport PDF / Word | `generatePayrollPdfBlob` / `WordBlob` | `PayrollView.tsx:807,817` | — | read-only |

Model danych (osadzenie): `DayData { active, from, to, zaliczka, extraHours[] }` (`payroll-cycle.ts:110`), `EmployeeExtraCost { id, description, amount, status?, rejectReason? }` (`WeekEmployeeDetail.tsx:100`), `WeekEmployee { days{}, prevSaturday, extraCosts[], rate, settled, payrollCarryForward, dataUpdatedAt, rateUpdatedAt, settledUpdatedAt }`.

> **Uwaga mapowania „potrącenia”:** aplikacja modeluje **zaliczki** (`day.zaliczka`, odejmowane od netto) i **koszty do zwrotu** (`extraCosts`, dodawane do netto). Odrębne pole „potrącenie” nie istnieje — potrącenie realizowane przez `zaliczka` lub ujemny `extraCost.amount`. Test F10/F11 pokrywa oba.

---

## 2. ETAP 2 + 3 — Testy per funkcja (SETUP/TEST/VERIFY/ROLLBACK/VERIFY CLEAN)

> Konwencja: `[SANDBOX]` tydzień/pracownik testowy. Snapshot `S0 = localStorage['kw-week-employees']` przed każdym testem; ROLLBACK przywraca `S0`.

### C-F01 · Dodanie pracownika
- **SETUP:** sandbox tydzień; roster N pracowników; zapamiętaj `S0`; kartoteka zawiera testowego pracownika X.
- **TEST:** „Dodaj z kartoteki” → X.
- **VERIFY:** roster = N+1; X widoczny; local ma X; po EXPLICIT push cloud `kw-week-employees` ma X; `__wgdomSyncMetrics().batchSet` +1.
- **ROLLBACK:** usuń X (`removeWeekEmployee`).
- **VERIFY CLEAN:** roster = N; `kw-week-employees` == `S0`; brak X w cloud po sync.

### C-F02 · Usunięcie pracownika
- **SETUP:** roster zawiera X; `S0`.
- **TEST:** usuń X.
- **VERIFY:** roster N-1; local tombstone `kw-week-employees-deleted-ids` zawiera klucz X; push nie przywraca X.
- **ROLLBACK:** dodaj X ponownie z kartoteki; usuń wpis tombstone (jeśli dotyczy).
- **VERIFY CLEAN:** roster == `S0`.
- ⚠ **F2:** po sync z drugiego urządzenia X może wrócić (tombstone local-only) — patrz C-MD-Resurrection.

### C-F03 · Wyczyść wszystkich
- **SETUP:** roster N; `S0`.
- **TEST:** „Wyczyść wszystkich”.
- **VERIFY:** roster 0; ⚠ **RS-2** brak tombstonów.
- **ROLLBACK:** restore `S0` do local + push.
- **VERIFY CLEAN:** roster == `S0`.

### C-F04 · Zamień na wszystkich aktywnych
- **SETUP:** roster częściowy; kartoteka M aktywnych; `S0`.
- **TEST:** „Zamień na wszystkich aktywnych”.
- **VERIFY:** roster = M aktywnych; brak duplikatów (merge key directoryId).
- **ROLLBACK:** restore `S0`.
- **VERIFY CLEAN:** roster == `S0`.

### C-F05 · Edycja ogólna
- **SETUP:** X w rosterze; `S0`; zanotuj `dataUpdatedAt(X)`.
- **TEST:** zmień dowolne pole (np. dzień active).
- **VERIFY:** pole zmienione; `dataUpdatedAt(X)` wzrósł; po 2 s AUTO push.
- **ROLLBACK:** przywróć poprzednią wartość.
- **VERIFY CLEAN:** pola == `S0` (poza `dataUpdatedAt`, który rośnie — dopuszczalny).

### C-F06 · Godziny (from/to)
- **SETUP:** X, dzień Pon active; `S0`.
- **TEST:** zmień `to` 16:00→18:00.
- **VERIFY:** godziny tygodnia +2h; suma brutto rośnie; AUTO push.
- **ROLLBACK:** `to` → 16:00.
- **VERIFY CLEAN:** godziny == `S0`.

### C-F07 · Dni (active on/off)
- **SETUP:** X, dzień Sob nieaktywny; `S0`.
- **TEST:** aktywuj Sob.
- **VERIFY:** dzień liczony; godziny rosną.
- **ROLLBACK:** dezaktywuj Sob.
- **VERIFY CLEAN:** == `S0`.

### C-F08 · Godziny dodatkowe
- **SETUP:** X, dzień Pon; `S0`.
- **TEST:** dodaj `extraHours` 18:00–20:00.
- **VERIFY:** +2h dodatkowe w gridzie extra; export uwzględnia.
- **ROLLBACK:** usuń wpis extraHours.
- **VERIFY CLEAN:** == `S0`.

### C-F09 · Sobota poprzednia
- **SETUP:** X; `prevSaturday` pusty; `S0`.
- **TEST:** ustaw `prevSaturday` 07:00–15:00.
- **VERIFY:** `prevSatGross` > 0; suma uwzględnia.
- **ROLLBACK:** wyczyść `prevSaturday`.
- **VERIFY CLEAN:** == `S0`.

### C-F10 · Zaliczki
- **SETUP:** X, dzień Pon; `S0`.
- **TEST:** `day.zaliczka` = 200.
- **VERIFY:** `totalZaliczka` +200; netto -200.
- **ROLLBACK:** `zaliczka` = "".
- **VERIFY CLEAN:** == `S0`.

### C-F11 · Premie / koszty do zwrotu (⚠ F1)
- **SETUP:** X; `extraCosts` = []; `S0`.
- **TEST:** dodaj koszt {opis:"Materiały", amount:150}.
- **VERIFY:** „Koszty do zwrotu” +150; netto +150.
- **ROLLBACK:** usuń pozycję.
- **VERIFY CLEAN:** `extraCosts` == `S0`.
- ⚠ **F1:** przy równoczesnej edycji innego pola (np. godzin) na drugim urządzeniu koszt może zniknąć — patrz C-MD-F1.

### C-F12 · Akceptacja/odrzucenie kosztu
- **SETUP:** X ma koszt pending (submittedBy worker); `S0`.
- **TEST:** admin → „Zatwierdź”.
- **VERIFY:** `status="approved"`; koszt liczony do netto.
- **ROLLBACK:** cofnij do pending.
- **VERIFY CLEAN:** == `S0`.

### C-F13 · Stawka PLN/h (LWW niezależny)
- **SETUP:** X rate=30; `S0`; zanotuj `rateUpdatedAt`.
- **TEST:** rate → 35.
- **VERIFY:** brutto przeliczone; `rateUpdatedAt` wzrósł; `dataUpdatedAt` niezmieniony przez samą stawkę.
- **ROLLBACK:** rate → 30.
- **VERIFY CLEAN:** == `S0`.

### C-F14 · Settled (immediate push, P-INV-2)
- **SETUP:** X settled=false; `S0`.
- **TEST:** klik „Rozliczony”.
- **VERIFY:** settled=true; `settledUpdatedAt` wzrósł; **natychmiastowy** push (suppress cleared); `batchSet` +1 bez czekania 2 s.
- **ROLLBACK:** klik ponownie (settled=false).
- **VERIFY CLEAN:** == `S0`.

### C-F15 · Recoverable charges
- **SETUP:** robota sandbox; `kw-recoverable-charges` `S0`.
- **TEST:** dodaj obciążenie.
- **VERIFY:** pozycja w `kw-recoverable-charges`; AUTO push; dashboard „Do odzyskania” +1.
- **ROLLBACK:** usuń (tombstone `kw-recoverable-charges-deleted-ids`).
- **VERIFY CLEAN:** == `S0`.

### C-F16/F17 · Wybór / zmiana roboty (assignments)
- **SETUP:** X w rosterze; robota A/B sandbox; `kw-jobs` `S0`.
- **TEST:** przydziel X do roboty A → zmień na B.
- **VERIFY:** `job.workEntries[]` A ma X, potem B ma X, A nie; badge spójności 🟢.
- **ROLLBACK:** usuń przydziały.
- **VERIFY CLEAN:** `kw-jobs` == `S0`; godziny/wypłaty X **niezmienione** (przydział ≠ godziny).

### C-F18 · Zapisz tydzień (archive)
- **SETUP:** aktywny tydzień z danymi; `kw-archive` `S0`.
- **TEST:** „Zapisz tydzień”.
- **VERIFY:** snapshot w `savedWeeks`/`kw-archive`; aktywny tydzień pozostaje live (saved ≠ closed, 20.1B).
- **ROLLBACK:** usuń snapshot z archiwum.
- **VERIFY CLEAN:** `kw-archive` == `S0`.

### C-F19 · Restore z archiwum
- **SETUP:** archiwum ma tydzień W; aktywny roster `S0`.
- **TEST:** „Przywróć z archiwum” → W.
- **VERIFY:** roster = eligible z W (S6 filtr); local zaktualizowany; AUTO push.
- **ROLLBACK:** restore `S0`.
- **VERIFY CLEAN:** == `S0`.

### C-F20 · Rollover (P-INV-5)
- **SETUP:** ustaw `weekTo` = wczoraj (wymuś warunek rollover); brak blockerów; `S0` (weekFrom/To/archive/roster).
- **TEST:** trigger `tryPayrollWeekCycle` (timer 60 s lub ręcznie).
- **VERIFY:** poprzedni tydzień → archiwum; nowy tydzień pusty/carry; **brak przecieku** starych danych (anti-leak); `settled` zresetowany w nowym.
- **ROLLBACK:** restore snapshotów weekFrom/To/archive/roster.
- **VERIFY CLEAN:** == `S0`.

### C-F21 · Readonly (tydzień zamknięty, P-INV-10)
- **SETUP:** tydzień historyczny/closed; `S0`.
- **TEST:** próba edycji godzin/extraCosts/rate.
- **VERIFY:** `onPatch*` = no-op; UI „tylko odczyt”; brak zmiany local; brak push.
- **ROLLBACK:** — (brak zmiany).
- **VERIFY CLEAN:** == `S0` (bez mutacji).

### C-F22 · Urlopy / nieobecności
- **SETUP:** X; `kw-employee-leaves` `S0`.
- **TEST:** dodaj urlop X (Pon–Wt).
- **VERIFY:** overlay w payroll (dni oznaczone); `kw-employee-leaves` +1; AUTO push.
- **ROLLBACK:** usuń urlop (tombstone `kw-employee-leaves-deleted-ids`).
- **VERIFY CLEAN:** == `S0`.

### C-F23 · Carry forward (⏭)
- **SETUP:** X w aktywnym tygodniu; kwota do wypłaty > 0; `S0`.
- **TEST:** „Odrocz wypłatę” ⏭.
- **VERIFY:** `payrollCarryForward` ustawiony (MODEL A frozen amount); UI baner carry; AUTO push.
- **ROLLBACK:** cofnij odroczenie.
- **VERIFY CLEAN:** == `S0`.

### C-F24 · Edycja rekordu archiwum
- **SETUP:** archiwum W ma X; `kw-archive` `S0`.
- **TEST:** zmień godzinę X w W.
- **VERIFY:** zmiana w `kw-archive`; aktywny roster nietknięty.
- **ROLLBACK:** przywróć wartość.
- **VERIFY CLEAN:** `kw-archive` == `S0`.

### C-F25 · Sync (pull+push)
- **SETUP:** local i cloud spójne; `S0`; zanotuj metryki.
- **TEST:** wymuś `runCloudSync` (focus po >15 s).
- **VERIFY:** pull → merge → push tylko gdy `bundleFingerprint` różny; brak zmiany danych przy braku zmian (`pushSkipped` +1).
- **ROLLBACK:** — (idempotentne).
- **VERIFY CLEAN:** local == `S0`.

### C-F26 · Restore payroll z chmury
- **SETUP:** cloud ma znany stan; local zmodyfikowany; `S0`.
- **TEST:** `restorePayrollFromCloud("prev")`.
- **VERIFY:** local = wersja z chmury.
- **ROLLBACK:** restore `S0`.
- **VERIFY CLEAN:** == `S0`.

### C-F27 · Eksport PDF/Word (read-only)
- **SETUP:** tydzień z danymi; `S0`.
- **TEST:** eksport PDF i Word.
- **VERIFY:** pliki generują się; zawierają godziny/extra/zaliczki/koszty/prevSat; **brak** mutacji stanu.
- **ROLLBACK:** — .
- **VERIFY CLEAN:** local == `S0` (bit-identyczny).

---

## 3. ETAP 4 — Multi-Device

> Urządzenia: A, B, (C). Każdy scenariusz: `S0` na obu, akcja, sync, VERIFY na obu, ROLLBACK, VERIFY CLEAN na obu.

### C-MD-01 · 2 urządzenia — edycje rozłączne
- **SETUP:** A i B ten sam roster `S0`.
- **TEST:** A zmienia godziny X (Pon); B zmienia godziny Y (Wt).
- **VERIFY:** po sync obu — obie zmiany obecne (merge per-klucz, różni pracownicy → brak kolizji).
- **ROLLBACK/CLEAN:** restore `S0` na obu.

### C-MD-F1 · 2 urządzenia — kolizja pola tego samego pracownika (⚠ F1)
- **SETUP:** A i B mają X, `extraCosts`=[].
- **TEST:** A dodaje `extraCost` (premia); B (bez pull) zmienia godziny X → B push.
- **VERIFY (Expected):** zachowane i godziny, i premia. **Predicted (F1):** premia znika, jeśli `dataUpdatedAt(B) > dataUpdatedAt(A)` (whole-array LWW).
- **PASS/FAIL:** PASS = oba pola obecne. FAIL = utrata premii → **potwierdzenie F1** (nie nowy bug).
- **Evidence:** `kw-week-employees` A/B/cloud + `dataUpdatedAt` X przed/po; `__wgdomSyncMetrics`.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-Resurrection · 2 urządzenia — usunięcie (⚠ F2)
- **SETUP:** A i B mają X.
- **TEST:** A usuwa X (tombstone local A); B (ze starym stanem) robi sync/push.
- **VERIFY (Expected):** X pozostaje usunięty. **Predicted (F2):** X wraca (tombstone nie w cloud).
- **PASS/FAIL:** FAIL = resurrection → **potwierdzenie F2/S7-5**.
- **ROLLBACK/CLEAN:** usuń X na obu; restore `S0`.

### C-MD-Settled · 2 urządzenia — settled LWW (P-INV-2)
- **SETUP:** A, B mają X settled=false.
- **TEST:** A → settled=true (push natychmiast); B ze starym stanem edytuje godziny → push.
- **VERIFY:** settled=true zachowany (`settledUpdatedAt` LWW + `preserveSettledLwwFromLocal`).
- **PASS/FAIL:** FAIL = settled cofnięty na false.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-03 · 3 urządzenia
- **SETUP:** A, B, C ten sam roster.
- **TEST:** A godziny X, B stawka X, C settled X — równolegle.
- **VERIFY:** godziny (dataUpdatedAt), stawka (rateUpdatedAt), settled (settledUpdatedAt) — **trzy niezależne LWW** współistnieją.
- **PASS/FAIL:** FAIL = którakolwiek zmiana utracona.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-Offline · offline → online
- **SETUP:** A online, B offline (DevTools throttling Offline); `S0`.
- **TEST:** B edytuje godziny offline; A edytuje inny dzień online i pushuje; B wraca online.
- **VERIFY:** po pull+push B — merge obu zmian; brak nadpisania A przez stale B (guard shrink P-INV-6).
- **PASS/FAIL:** FAIL = utrata którejś zmiany lub shrink roster.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-Stale · stale client (karta otwarta długo)
- **SETUP:** A otwarta zakładka Payroll (bez interakcji, np. „2 dni” symulowane); B robi wiele zmian i pushuje.
- **TEST:** A po długim czasie edytuje jedno pole i zapisuje.
- **VERIFY:** przed push A następuje pull/merge (focus/visibility throttle) → zmiany B zachowane; tylko pole edytowane przez A nadpisane świeżo.
- **PASS/FAIL:** FAIL = masowe nadpisanie zmian B stanem A (Lost Update wielopolowy).
- **Evidence:** kolejność `batch-get`/`batch-set` w metrykach; `bundleFingerprint`.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-HardReload · Ctrl+Shift+R
- **SETUP:** A z lokalnymi zmianami przed sync; `S0` w cloud.
- **TEST:** Ctrl+Shift+R (hard reload, czyści cache/SW).
- **VERIFY:** bootstrap CloudLoader ładuje z cloud; niezsynchronizowane lokalne zmiany — udokumentuj czy przetrwały (LS) czy nie.
- **PASS/FAIL:** PASS = brak utraty **zsynchronizowanych** danych; utrata niezsynchronizowanych lokalnych = znany kompromis (udokumentuj).
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-Focus · focus sync
- **SETUP:** A i B; B pushuje zmianę; A w tle.
- **TEST:** przełącz focus na A (>15 s od ostatniego pull).
- **VERIFY:** A wykonuje pull (throttle 15 s), widzi zmianę B; <15 s → brak dodatkowego pull.
- **PASS/FAIL:** FAIL = brak pull po >15 s lub pull-storm <15 s.
- **ROLLBACK/CLEAN:** restore `S0`.

### C-MD-Visibility · visibility sync
- **SETUP:** jw. z `visibilitychange` (tab hidden→visible).
- **TEST:** ukryj i pokaż kartę A po >15 s.
- **VERIFY:** pull przy `visible`; throttle respektowany.
- **PASS/FAIL:** jw.
- **ROLLBACK/CLEAN:** restore `S0`.

---

## 4. ETAP 5 — Smoke Suite (2–3 min)

Minimalny zestaw „szybko wykryj regresję krytyczną”. Single device (poza SM-6).

| ID | Krok | PASS |
|----|------|------|
| SM-1 | Dodaj pracownika z kartoteki | roster +1, push OK |
| SM-2 | Zmień godziny + zaliczka | brutto/netto przeliczone |
| SM-3 | Dodaj `extraCost` | koszt do zwrotu +kwota |
| SM-4 | Toggle settled → i cofnij | `settledUpdatedAt` rośnie, immediate push |
| SM-5 | Usuń pracownika | roster -1, tombstone local |
| SM-6 | Focus po >15 s (2. karta pushnęła) | pull widzi zmianę |
| SM-7 | Reload (F5) | dane z cloud spójne |
| SM-CLEAN | Restore `S0` | roster/local == start |

**Kryterium Smoke:** 8/8 PASS → GO. Jakikolwiek FAIL (poza znanymi F1/F2) → STOP + BUG.

---

## 5. ETAP 6 — Regression Suite (pre-merge Payroll/Cloud Sync)

Wykonywane **przed każdym merge** dotykającym Payroll lub `cloud-sync.ts`.

### 5.1 Blok A — funkcje (ETAP 2)
Wszystkie C-F01…C-F27. **Warunek:** każdy przechodzi SETUP→…→VERIFY CLEAN (diff pusty).

### 5.2 Blok B — multi-device (ETAP 4)
C-MD-01, C-MD-F1, C-MD-Resurrection, C-MD-Settled, C-MD-03, C-MD-Offline, C-MD-Stale, C-MD-HardReload, C-MD-Focus, C-MD-Visibility.

### 5.3 Blok C — inwarianty (skrypty istniejące, jeśli obecne)
| Inwariant | Skrypt referencyjny |
|-----------|---------------------|
| Settled merge | `test-payroll-settled-merge-fix-a.mjs` |
| Bootstrap/runtime parity | `test-payroll-bootstrap-runtime-parity-b4.mjs` |
| Edge parity | `test-payroll-edge-parity-b6.mjs` |
| Bootstrap payroll | `test-p11-bootstrap-payroll.mjs` |
| Carry forward | `smoke-test-payroll-carry-forward-20.1b.mjs` |
| Rollover | `smoke-test-payroll-rollover-20.1c.mjs` |
| Week closed | `smoke-test-payroll-week-closed-20.1d.mjs` |
| Leaves | `smoke-test-employee-leaves-20.0a.mjs` |
| Guard mutation | (`cloud-sync-mutation-guard` — PAYROLL-GUARD-S1 E2E) |

> Skrypty potwierdzić `Glob`/uruchomieniem **przy realizacji** (nie w tej fazie designu).

### 5.4 Kryterium merge
- Blok A: 27/27 PASS.
- Blok B: PASS z wyłączeniem **znanych** F1/F2 (jawnie odnotowane jako OPEN, nie blokują merge nienaruszającego ich obszaru — decyzja właściciela).
- Blok C: wszystkie skrypty PASS.
- Regresja liczby requestów (jeśli zmiana Cloud Sync): `__wgdomSyncMetrics` nie gorsze niż baseline.

---

## 6. Mapa pokrycia (funkcja → testy)

| Funkcja | Smoke | Regression | Multi-device |
|---------|:-----:|:----------:|:------------:|
| Dodanie (F01) | SM-1 | C-F01 | C-MD-01 |
| Usunięcie (F02) | SM-5 | C-F02 | C-MD-Resurrection |
| Godziny/dni (F06–08) | SM-2 | C-F06/07/08 | C-MD-01/03/Offline/Stale |
| Zaliczki (F10) | SM-2 | C-F10 | C-MD-Stale |
| Premie/koszty (F11–12) | SM-3 | C-F11/12 | C-MD-F1 |
| Stawka (F13) | — | C-F13 | C-MD-03 |
| Settled (F14) | SM-4 | C-F14 | C-MD-Settled/03 |
| Archive/Restore (F18–19) | — | C-F18/19/24 | — |
| Rollover (F20) | — | C-F20 | — |
| Readonly (F21) | — | C-F21 | — |
| Leaves (F22) | — | C-F22 | — |
| Carry forward (F23) | — | C-F23 | — |
| Sync (F25) | SM-6/7 | C-F25/26 | C-MD-Focus/Visibility/HardReload |
| Recoverable (F15) | — | C-F15 | — |
| Assignments (F16–17) | — | C-F16/17 | — |
| Export (F27) | — | C-F27 | — |

---

## 7. Checklista PASS/FAIL (wykonanie)

> Kopiuj przy każdym cyklu certyfikacji. `☐` = PASS/FAIL/BLOCKED + notatka.

**Nagłówek:** data · HEAD · wersja · wykonawca · środowisko (sandbox/prod) · device count.

### 7.1 Funkcje (ETAP 2)
```
☐ C-F01 Dodanie             ☐ C-F10 Zaliczki           ☐ C-F19 Restore archiwum
☐ C-F02 Usunięcie           ☐ C-F11 Premie/koszty      ☐ C-F20 Rollover
☐ C-F03 Wyczyść wszystkich  ☐ C-F12 Akcept./odrzuć     ☐ C-F21 Readonly
☐ C-F04 Zamień aktywnych    ☐ C-F13 Stawka             ☐ C-F22 Urlopy
☐ C-F05 Edycja ogólna       ☐ C-F14 Settled            ☐ C-F23 Carry forward
☐ C-F06 Godziny             ☐ C-F15 Recoverable        ☐ C-F24 Edycja archiwum
☐ C-F07 Dni                 ☐ C-F16 Wybór roboty       ☐ C-F25 Sync
☐ C-F08 Godziny dodatkowe   ☐ C-F17 Zmiana roboty      ☐ C-F26 Restore z chmury
☐ C-F09 Sobota poprz.       ☐ C-F18 Zapisz tydzień     ☐ C-F27 Eksport PDF/Word
```

### 7.2 Multi-device (ETAP 4)
```
☐ C-MD-01 Edycje rozłączne     ☐ C-MD-03 3 urządzenia        ☐ C-MD-HardReload
☐ C-MD-F1 Kolizja pola (F1)    ☐ C-MD-Offline                ☐ C-MD-Focus
☐ C-MD-Resurrection (F2)       ☐ C-MD-Stale (długa karta)    ☐ C-MD-Visibility
☐ C-MD-Settled (LWW)
```

### 7.3 Smoke (ETAP 5)
```
☐ SM-1  ☐ SM-2  ☐ SM-3  ☐ SM-4  ☐ SM-5  ☐ SM-6  ☐ SM-7  ☐ SM-CLEAN
```

### 7.4 Regresja skryptowa (Blok C)
```
☐ settled-merge  ☐ bootstrap-runtime-parity-b4  ☐ edge-parity-b6
☐ p11-bootstrap  ☐ carry-forward-20.1b  ☐ rollover-20.1c
☐ week-closed-20.1d  ☐ leaves-20.0a  ☐ guard-mutation (PAYROLL-GUARD-S1)
```

### 7.5 Werdykt
```
FUNKCJE:      __/27 PASS
MULTI-DEVICE: __/10 PASS (F1/F2 = known OPEN)
SMOKE:        __/8 PASS
SKRYPTY:      __/9 PASS
VERIFY CLEAN globalny: local == baseline  ☐
WERDYKT: CERTIFIED / NOT CERTIFIED
```

---

## 8. VERIFY CLEAN — protokół globalny
Po całej suicie:
1. `localStorage['kw-week-employees']` == `S0` (baseline).
2. `kw-archive`, `kw-employee-leaves`, `kw-recoverable-charges`, `kw-jobs` == baseline.
3. Cloud (Supabase KV) == baseline po ostatnim sync.
4. Brak „sierocych” tombstonów z testów.
5. Metryki sync w normie (brak pętli push).

Jeśli którykolwiek ≠ baseline → **NOT CERTIFIED** + wpis §9.

---

## 9. BUG Register (wypełniać podczas wykonania)

> W tej fazie (design) **pusty**. Podczas wykonania: błąd → NIE naprawiać → wpis poniżej.

| ID | Test | Repro (kroki) | Expected | Actual | Severity | Klucz KV | Status |
|----|------|---------------|----------|--------|----------|----------|--------|
| — | — | — | — | — | — | — | — |

**Wzór wpisu:** `BUG-<n> · C-<test> · [1..N kroki] · Expected: … · Actual: … · Severity: P0/P1/P2 · Evidence: <link/log>`.

Znane (pre-existing, nie liczyć jako nowe): **F1**, **F2**, **RS-2**, **H1** (§0.4).

---

## 10. Rejestr powiązań
| Dokument | Relacja |
|----------|---------|
| [`PAYROLL-CERTIFICATION-2026-AUDIT.md`](PAYROLL-CERTIFICATION-2026-AUDIT.md) | Audyt źródłowy (React state, H, F1) |
| [`PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md`](PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md) | F1 szczegóły |
| [`PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md`](PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md) | REPRO F1 (bazę do C-MD-F1) |
| [`PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md) | F2/S7-5 |
| [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) | metryki, baseline requestów |
| [`PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md`](PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md) | AC regresji requestów |
| ARCHITECTURE § 10.1, § 11.3 | Payroll + sync |

---

*SSOT Payroll Certification Suite: ten plik. TEST DESIGN — bez implementacji, poprawek, BUILD, COMMIT. Workflow: AUDIT → TEST DESIGN → RAPORT → STOP.*
