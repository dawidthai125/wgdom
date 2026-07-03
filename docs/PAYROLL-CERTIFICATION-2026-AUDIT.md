# PAYROLL CERTIFICATION 2026 — AUDIT (read-only)

> **Typ:** Certyfikacja istniejącego modułu Lista Płac (NIE nowy EPIC, NIE implementacja).
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod UI:** v2.63.27
> **Metoda:** Analiza statyczna kodu (klient + Edge). Bez zmian kodu, bez BUILD, bez COMMIT.
> **Kontekst P0:** 🔴 Payroll Cloud Sync Incident ACTIVE (batch-set 500 + resurrection). Certyfikacja mierzy się także z tym incydentem.
> **Workflow:** AUDIT → RAPORT → STOP.

---

## 0. Streszczenie wykonawcze (werdykt certyfikacji)

| Obszar | Werdykt |
|--------|---------|
| **Zapis pojedynczego urządzenia (single device)** | ✅ **PASS** |
| **Merge pól LWW (godziny/dni, stawka, settled)** | ⚠️ **WARNING** (zależność od zegara klienta) |
| **Merge tablicy `extraCosts` (premie/dodatki/koszty)** | ❌ **FAIL** (Lost Update — coarse LWW sprzężone z `dataUpdatedAt`) — **F1 OPEN** |
| **Formularz po auto-pull (conflict overwrite, scenariusz H)** | ✅ **PASS / CLOSED** (patch-na-`prev` ETAP 1 — brak stale snapshot; problem nie leży w React state) |
| **Propagacja usunięcia pracownika (delete/resurrection)** | ❌ **FAIL** (znany P0 — S7-5 DESIGN FREEZE, IMPLEMENT WAITING) |
| **`clearAllWeekEmployees` (wyczyść skład)** | ❌ **FAIL** (brak tombstonów → resurrection całego składu) |
| **Roster shrink / whole-bundle loss** | ✅ **PASS** (PayrollGuard + Edge shrink block + week-scope S1) |
| **Zero-hours / świadome wyczyszczenie** | ✅ **PASS** (S3 clear-wins) |
| **Settled (Rozliczony) persistence** | ✅ **PASS** (S5 dedykowany LWW) |
| **Archive / Save Week** | ✅ **PASS** |
| **Rollover** | ✅ **PASS** (B-series + anti-leak) |
| **Restore z archiwum** | ⚠️ **WARNING** (eligible S6 OK; push zależny od auto-sync) |
| **Transport batch-set (HTTP 500)** | ❌ **FAIL** (znany P0 — S7-2/S7-4, H1 UNCONFIRMED) |

**Ogólny werdykt certyfikacji: `CONDITIONAL PASS z aktywnymi P0`.** Rdzeń payroll (single-device, roster integrity, settled, zero-hours, rollover, archive) jest solidnie zabezpieczony wieloma warstwami. Certyfikacji **nie można domknąć** do zamknięcia trzech twardych braków: **(F1) Lost Update na `extraCosts`**, **(F2) resurrection przez brak współdzielonych tombstonów** (S7-5), **(F3) transport batch-set 500** (S7-2). F1 nie jest jeszcze objęty żadnym bundlem naprawczym.

---

## 1. Zakres i mapa modułu

### 1.1 Pliki objęte audytem

| Warstwa | Pliki |
|---------|-------|
| **UI / handlery** | `src/app/App.tsx` (orkiestracja + handlery `kw-week-employees` 1229–1691), `src/app/PayrollView.tsx`, `src/app/WeekEmployeeDetail.tsx`, `src/app/payroll-editors.tsx`, `src/app/PayrollJobAssignmentsPanel.tsx` |
| **Logika domenowa** | `src/lib/payroll-cycle.ts`, `payroll-carry-forward.ts`, `payroll-carry-snapshot.ts`, `payroll-rollover.ts`, `payroll-leave-overlay.ts`, `payroll-job-assignments.ts`, `payroll-export.ts`, `payroll-display.ts`, `employee-leaves.ts` |
| **Sync / merge (SSOT klient)** | `src/lib/cloud-sync.ts`, `payroll-week-employee-merge.ts`, `cloud-sync-mutation-guard.ts`, `cloud-sync-throttle.ts` |
| **Sync / merge (SSOT Edge)** | `supabase/functions/make-server-0afb8820/index.tsx`, `kv_store.tsx` |

### 1.2 Klucze KV (persystencja Payroll)

| Klucz | Rola | Pushowany? | Tombstony |
|-------|------|-----------|-----------|
| `kw-week-employees` | Skład + godziny + stawki + settled tygodnia | ✅ (force-replace na main path) | ⚠️ tombstony **lokalne**, NIE pushowane (F2) |
| `kw-week-employees-deleted-ids` | Tombstony usunięć (week-scoped) | ❌ **NIE** (EV8) | — |
| `kw-archive` | Zapisane tygodnie (snapshoty) | ✅ | `kw-archive-deleted-ids` ✅ |
| `kw-weekFrom` / `kw-weekTo` | Bieżący zakres Pn–So | ✅ | — |
| `kw-employee-leaves` | Urlopy/chorobowe/bezpłatne | ✅ | `kw-employee-leaves-deleted-ids` ✅ |
| `kw-recoverable-charges` | Do rozliczenia (billing, poza LP) | ✅ | `kw-recoverable-charges-deleted-ids` ✅ |
| `kw-jobs` | Roboty (przydziały `workEntries[]`) | ✅ | `kw-jobs-deleted-ids` ✅ |

### 1.3 Trzy ścieżki utrwalania (KRYTYCZNE dla oceny)

1. **LS auto** — `useLocalStorage("kw-week-employees", [])` (`App.tsx:204`): każda mutacja stanu natychmiast do localStorage.
2. **Cloud EXPLICIT (roster/rollover)** — `persistPayrollRoster` → `pushWeekEmployeesToCloud(next, {skipPayrollGuard:true})` z `replaceWeekEmployeesKeys=["kw-week-employees"]`; owinięte `withKwWeekEmployeesAsyncMutation` + `suppressAutoSyncUntilRef=+6000ms`. Używane przez: `addFromDirectory` (1337), `removeWeekEmployee` (1350), `clearAllWeekEmployees` (1364), `replaceWeekWithAllActive` (1370), rollover → `pushPayrollWeekAfterRollover` (1682).
3. **Cloud AUTO (edycja pól)** — edycje godzin/stawki/kosztów/carry/prevSaturday NIE pushują jawnie; tylko bumpują znaczniki + `refreshSavedActiveWeekSnapshot`, a `useEffect` auto-save (`App.tsx:977`, dep `weekEmployees`) uruchamia `scheduleAutoCloudSync` → debounce 2s → `runCloudSync`. `toggleSettled` (1618) jest wyjątkiem — wymusza sync po 400ms kasując suppress.

---

## 2. Architektura synchronizacji (fakty z kodu)

### 2.1 Pętla `runCloudSync` (`App.tsx:724`)

```
runCloudSync:
  guardy wejścia: tabVisible / pullInFlight / deleteJobsInFlight / mutationGuard.isBlocked / suppressWindow / syncInFlight
  1. lastPullAtRef = now
  2. merged = pullAndMergeDataBundle(local)     ← PULL cloud + MERGE (LWW) do lokalnego
  3. applyAdminDataBundle(merged)               ← lokalny stan już zmutowany
  4. if fingerprint(merged) == lastPushed → recordPushSkipped (AC4)   [PR-PAY-S7-4A]
     else pushMergedDataBundleToCloud(merged)   ← PUSH (force-replace week-employees)
```

- **Kolejność PULL→MERGE→PUSH** — chroni przed nadpisaniem chmury pustszą/starszą wersją: przed pushem lokalny stan jest scalony z chmurą (per-pole LWW).
- **`pullFromCloudAndMerge`** (`App.tsx:696`) na `focus` + `visibilitychange` (`App.tsx:984–1000`), throttle `MIN_PULL_INTERVAL_MS=15s` (`shouldPullNow`). Efekt: przy widocznej karcie urządzenie ciągle scala zmiany z chmury.
- **`pushMergedDataBundleToCloud`** (`cloud-sync.ts:2577`) **zawsze** ustawia `replaceWeekEmployeesKeys=["kw-week-employees"]` (linia 2594) → Edge robi **force-replace** roster (pomija union/shrink-block Edge). Skład wypchnięty = skład zmergowany po stronie klienta = **klient jest autorytatywny** dla składu.

### 2.2 Merge rekordu pracownika (`mergeWeekEmployeeRecord`, `cloud-sync.ts:1290`)

| Pole | Reguła merge | Ocena |
|------|--------------|-------|
| `days` (godziny dzienne) | `pickDaysByTimestamps` (1294) — nowszy `dataUpdatedAt` wygrywa; remis → `mergeDaysByRichness` (clear-wins S3). **Per-klucz dnia spread**, nie całościowa podmiana | ✅ dobra granularność |
| `prevSaturday` | osobne `pickPrevSaturdayByTimestamps` | ✅ |
| `rate` | osobne `rateUpdatedAt` (1312/1326) | ✅ dekopling |
| `settled` / `settledUpdatedAt` | `pickSettledByTimestamps` (903) — dedykowany LWW + ochrona spurious-unsettle + remis→LOCAL (S5) | ✅ |
| `payrollCarryForward` | `pickPayrollCarryForward` — po `amount`/`createdAt` | ✅ |
| **`extraCosts` (premie/dodatki/koszty)** | **całościowe LWW tablicy** sprzężone z `dataUpdatedAt` (1299–1310) | ❌ **coarse — F1** |
| pozostałe pola rekordu | `{...c, ...l, ...dataWinner}` — cały rekord zwycięzcy `dataUpdatedAt` | ⚠️ |

### 2.3 Guardy tożsamości / składu

- `weekEmployeeMergeKey` (`payroll-week-employee-merge.ts:17`): `dir:<directoryId>` → `name:<norm>` → `id:<uuid>`. **Niestabilny między urządzeniami** (kopia bez `directoryId` → inny klucz) — H-R-KEY.
- `mergeWeekEmployeesForWeekRange` (`cloud-sync.ts:1619`): week-scope hard guard (S1) + filtr tombstonów (S2, **lokalny**) + UNION w obrębie tygodnia.
- `finalizePayrollBundleMerge` (1738): align zakresu + sanitize + richness override (adopcja bogatszej chmury tego samego tygodnia) z zachowaniem settled LWW (`preserveSettledLwwFromLocal`, 1716) i respektem tombstonów (1778).
- `applyRuntimePayrollAntiLeak` (1792): pusty skład nowego tygodnia + bogate archiwum → NIE re-populuj z chmury (ochrona rollover leak).

### 2.4 Guardy shrink / transport

- **PayrollGuard** (`applyPayrollGuardBeforePush`, 1225): jeśli `wouldBlockPayrollShrink` (spadek >50% activeDays/hours vs chmura) → usuwa `kw-week-employees` z pushu i **blokuje** (fail-loud). Bypass: `skipPayrollGuard` (roster/rollover — świadome).
- **Edge shrink/expansion** (`index.tsx:630–652`): przy braku force-replace — union na shrink lub roster-expansion. Na main path force-replace → pomijane.
- **CloudSyncMutationGuard** (`cloud-sync-mutation-guard.ts`): suppress auto-sync podczas mutacji roster (6s `kw-week-employees`, 4.5s `kw-jobs`) — zapobiega wyścigowi push roster × auto-sync.
- **Transport batch-set** (`index.tsx:581`): jeden `kv.mset` całego bundla; S7-1 dodał `try/catch`+`app.onError`+requestId. **Brak chunków/izolacji** → HTTP 500 przy timeout (F3, H1 UNCONFIRMED).

---

## 3. Certyfikacja funkcji użytkownika (A/B/C/D/E)

> Format: **A.** Funkcja · **B.** Zabezpieczenia · **C.** Zagrożenia · **D.** Ryzyko · **E.** Status.

### F-01 · Dodanie pracownika do tygodnia
- **A.** `addFromDirectory` (`App.tsx:1337`) → `weekEmployeeFromDir` → `persistPayrollRoster` (explicit push force-replace) + snapshot.
- **B.** UNION po merge-key (dodanie nie ginie — #009); explicit push + suppress 6s + `withKwWeekEmployeesAsyncMutation`; `filterDirectoryForPayrollWeekAdd` (dedup).
- **C.** Dodanie na A + równoległe dodanie innej osoby na B → oba przetrwają (union). Dodanie osoby, którą B właśnie usunął (tombstone tylko na B) → wróci u A (odwrotność resurrection).
- **D.** NISKIE (dla samego dodania).
- **E.** ✅ **PASS**.

### F-02 · Usunięcie pracownika z tygodnia
- **A.** `removeWeekEmployee` (`App.tsx:1350`) → `addDeletedWeekEmployeeKey(weekFrom, weekTo, removed)` (tombstone week-scoped) + `persistPayrollRoster([])`.
- **B.** Tombstone S2 filtruje w `mergeWeekEmployeesForWeekRange` (obie strony); week-scoped (nie blokuje innych tygodni); force-replace push.
- **C.** **Tombstone jest LOKALNY** — `kw-week-employees-deleted-ids` NIE jest pushowany (`cloud-sync.ts:2579`) ani pobierany (2505–2517). Urządzenie B bez tombstona re-dodaje przez UNION → **resurrection cross-device** (dowód prod: Mikołaj/Tomek). Niestabilny merge-key może ominąć nawet lokalny filtr.
- **D.** **WYSOKIE** (aktywny P0).
- **E.** ❌ **FAIL** — objęte S7-5 (DESIGN FREEZE APPROVED, IMPLEMENT WAITING). Single-device: PASS; multi-device: FAIL.

### F-03 · Edycja pracownika (przypisanie z kartoteki / stawka z katalogu)
- **A.** `updateWeekEmployee` (1379), `assignEmployeeFromDirectory`/`syncWeekRatesFromDirectory` (1481).
- **B.** `rateUpdatedAt`/`dataUpdatedAt` bumpowane rozdzielnie; `syncWeekRatesFromDirectory` pełny push pod mutation guard + suppress.
- **C.** Zmiana tożsamości (nadanie `directoryId`) zmienia `weekEmployeeMergeKey` → potencjalny rozjazd merge-key między urządzeniami (H-R-KEY) i dublowanie/rozdzielenie rekordu przy jednoczesnym istnieniu kopii `name:`.
- **D.** ŚREDNIE.
- **E.** ⚠️ **WARNING** — stabilizacja merge-key = S7-5-4 (ETAP 2 warunkowy).

### F-04 · Edycja godzin dziennych (active / godziny / nadgodziny)
- **A.** `updateWeekEmployeeDay` (1421) — bumpuje `dataUpdatedAt`, auto-sync 2s.
- **B.** `pickDaysByTimestamps` per-klucz dnia (spread) — inne dni drugiego urządzenia przetrwają; clear-wins S3 na remisie.
- **C.** Ten sam dzień edytowany na A i B blisko w czasie → LWW po `dataUpdatedAt` (ms, **zegar klienta**) → jedna zmiana przepada (oczekiwane). **Edycja godzin bumpuje wspólny `dataUpdatedAt` → patrz sprzężenie z `extraCosts` (F-06).**
- **D.** ŚREDNIE (sam dzień: niskie).
- **E.** ⚠️ **WARNING** (zależność od zegara klienta; poza tym dobra granularność).

### F-05 · Edycja stawki (rate)
- **A.** `updateWeekEmployeeRate` (1436) → `rateUpdatedAt`.
- **B.** Dedykowany `rateUpdatedAt` (dekopling od godzin) — `pickRateByTimestamps`.
- **C.** Równoległa zmiana stawki A/B → LWW `rateUpdatedAt` (zegar klienta) → jedna przepada (oczekiwane).
- **D.** NISKIE.
- **E.** ✅ **PASS** (z ogólnym zastrzeżeniem zegara).

### F-06 · Premie / dodatki / koszty (`extraCosts`)
- **A.** `updateWeekEmployeeExtraCosts` (1402) → `dataUpdatedAt`.
- **B.** Zmiana bumpuje `dataUpdatedAt`; przy remisie brak per-item merge.
- **C.** **`extraCosts` scalane CAŁOŚCIOWO po `dataUpdatedAt`** (`mergeWeekEmployeeRecord:1299–1310). `dataUpdatedAt` jest **wspólny** dla godzin, prevSaturday i extraCosts. Skutek: urządzenie A edytujące **godziny** (nowszy `dataUpdatedAt`) **nadpisuje całą tablicę `extraCosts`** dodaną przez B → **cichy Lost Update premii/kosztów**. Analogicznie odwrotnie. Nie ma tu tombstonów ani per-item LWW.
- **D.** **WYSOKIE** (cichy, bez alertu, dotyka pieniędzy).
- **E.** ❌ **FAIL** — **F1, niepokryty żadnym bundlem** (poza zakresem S7-5). Wymaga osobnego AUDIT/DESIGN (per-item merge lub własny `extraCostsUpdatedAt`).

### F-07 · Recoverable charges (Do rozliczenia)
- **A.** Osobny KV `kw-recoverable-charges` (billing, poza `kw-week-employees`); tombstony `kw-recoverable-charges-deleted-ids` pushowane.
- **B.** Deleted-ids współdzielone (push+pull+merge) — pełna semantyka usunięcia cross-device.
- **C.** Merge per-record; poza rdzeniem payroll LWW.
- **D.** NISKIE (w kontekście LP).
- **E.** ✅ **PASS** (osobny obszar — pełna certyfikacja billing poza tym raportem).

### F-08 · Urlopy (vacation) / F-09 · Chorobowe (sick) / bezpłatne (unpaid)
- **A.** `kw-employee-leaves` (`employee-leaves.ts`); overlay na payroll bez zmiany `calcWeekEmployee` (`payroll-leave-overlay.ts`).
- **B.** Walidacja (overlap, archived_week) klient + **Edge** (`validateEmployeeLeavesKv`, `index.tsx:696`); tombstony `kw-employee-leaves-deleted-ids` pushowane; merge LWW po `updatedAt` (`mergeEmployeeLeaves:173`).
- **C.** Edge odrzuca niepoprawny payload (keeping previous) — możliwy „silent reject” jeśli klient wyśle nakładający się zakres (blokada, nie utrata).
- **D.** NISKIE.
- **E.** ✅ **PASS** (deleted-ids współdzielone → brak resurrection urlopów; przewaga nad `kw-week-employees`).

### F-10 · Zero hours (świadome wyczyszczenie godzin)
- **A.** `updateWeekEmployeeDay` z pustym dniem → `dataUpdatedAt`.
- **B.** S3 clear-wins: `pickDaysByTimestamps` nowszy wygrywa (w tym clear); `mergeDaysByRichness` `isZeroedDay` honoruje świadome zero na remisie.
- **C.** Clear na A vs bogatszy dzień z chmury o remisowym `dataUpdatedAt` → clear-wins działa; przy starszym `dataUpdatedAt` clear może przegrać (oczekiwane LWW).
- **D.** NISKIE.
- **E.** ✅ **PASS**.

### F-11 · Settled („Rozliczony” / cofnięcie)
- **A.** `toggleSettled` (1618) → `settledUpdatedAt`; wymusza sync po 400ms (kasuje suppress). Archiwum: `toggleArchiveSettled` (1613).
- **B.** Dedykowany LWW `pickSettledByTimestamps` (903): nowszy `settledUpdatedAt` wygrywa; ochrona spurious-unsettle; remis→LOCAL (S5, nie OR). `preserveSettledLwwFromLocal` przy richness override.
- **C.** Równoległy toggle A/B → LWW ms (zegar klienta) → jeden stan wygrywa (oczekiwane). Remis obsłużony deterministycznie.
- **D.** NISKIE.
- **E.** ✅ **PASS** (najlepiej zabezpieczone pole — S5).

### F-12 · Zapis tygodnia (Save Week / snapshot archiwum)
- **A.** `saveWeek`/`doSaveWeek` (1648/1661) → `buildWeekSnapshot` → `setSavedWeeks` (kw-archive); auto-sync bundla.
- **B.** `mergeArchive` (1381) union po kluczu tygodnia; per-week richness + `savedAt` LWW; tombstony archiwum pushowane; `triggerWeeklyBackupEmail`.
- **C.** Snapshot pracowników w archiwum scalany przez `mergeWeekEmployees` → dziedziczy caveaty LWW (F-06 dot. extraCosts w archiwum).
- **D.** NISKIE–ŚREDNIE.
- **E.** ✅ **PASS** (skład tygodni bezpieczny; caveat extraCosts wspólny z F-06).

### F-13 · Rollover (przejście na nowy tydzień)
- **A.** `autoArchiveAndAdvance` (1668) → snapshot starego + `pushPayrollWeekAfterRollover` (atomic weekFrom/To/emps=[]/archive, force-replace, skipGuard) + suppress 6s.
- **B.** Atomowy push; `applyRuntimePayrollAntiLeak` blokuje re-populację nowego pustego tygodnia z chmury; `blocksPayrollRollover` (nierozliczona kasa sobotnia); `isPayrollWeekClosedForUi`.
- **C.** Dwa urządzenia rollują równolegle → oba force-replace; ostatni wygrywa zakres (ale skład nowego tygodnia i tak pusty; archiwum union).
- **D.** NISKIE.
- **E.** ✅ **PASS** (seria B + 20.1C dobrze pokryte).

### F-14 · Restore z archiwum
- **A.** `restoreWeekFromArchive` (1229) → `eligibleArchiveWeekEmployees` (S6, tombstone-aware) → `setWeekEmployees`.
- **B.** S6: przywraca wyłącznie eligible roster (bez usuniętych/smoke); wymaga confirm; blokada gdy skład = sami usunięci.
- **C.** **Nie pushuje jawnie** — polega na auto-sync (2s). Okno między restore a push: pull mógłby scalić starszą chmurę (ale restored jest bogatszy → richness override po jego stronie). Restore przywraca skład, ale tombstony pozostają lokalne (F2 nadal dotyczy powrotu na inne urządzenia).
- **D.** ŚREDNIE.
- **E.** ⚠️ **WARNING** (logika eligible = PASS; ścieżka utrwalenia mniej jawna niż roster ops).

### F-15 · Readonly week (closed / historyczny)
- **A.** `isPayrollWeekClosedForUi` (`payroll-cycle.ts`) — closed vs saved (20.1B/20.1D); blockers rollover (20.1C).
- **B.** Live vs snapshot freeze; defer ⏭ do rolloveru; overlay urlopów na snapshot.
- **C.** Zegar niedzielny ≥20:00 + blockers → tydzień operacyjny (nie historyczny) — pokryte 20.1D.
- **D.** NISKIE.
- **E.** ✅ **PASS**.

### F-16 · Payroll metrics (liczniki)
- **A.** `payrollMetrics` (1077) — activeDays + totalHours; baner restore (`shouldShowPayrollRestoreBanner`, S6 eligible), dashboard blockers.
- **B.** RB v2.63.24 false-positive fix; S6 eligible roster (bez tombstonów) w banerze.
- **C.** Metryki pochodne — brak zapisu; ryzyko tylko prezentacyjne.
- **D.** NISKIE.
- **E.** ✅ **PASS**.

### F-17 · Przydziały robót (assignments z LP)
- **A.** `PayrollJobAssignmentsPanel` / `payroll-job-assignments.ts` → edycja `job.workEntries[]` w **`kw-jobs`** (nie `kw-week-employees`).
- **B.** Guard `withKwJobsWorkEntryMutation` (scope kw-jobs, suppress 4.5s); Edge jobs shrink block + jobs tombstones; `CloudSyncMutationGuard` J1–J5 (B2).
- **C.** Edycja workEntries vs równoległa edycja tej samej roboty na innym urządzeniu → merge jobs LWW (osobny obszar).
- **D.** NISKIE (w kontekście LP).
- **E.** ✅ **PASS** (granica LP↔jobs czysta; certyfikacja jobs osobno).

### F-18 · Carry forward / odroczenie wypłaty (defer ⏭)
- **A.** `updateWeekEmployeePayrollCarryForward` (1464) → `dataUpdatedAt`; MODEL A freeze (`payroll-carry-forward.ts`, `payroll-carry-snapshot.ts`).
- **B.** `pickPayrollCarryForward` — chmura bez pola nie kasuje lokalnego defer; snapshot carry przy zapisie tygodnia; carry-in z poprzedniego archiwum.
- **C.** `payrollCarryForward` bumpuje wspólny `dataUpdatedAt` → to samo sprzężenie co F-06 (edycja godzin może nadpisać stan carry przez `{...dataWinner}`), choć `pickPayrollCarryForward` częściowo chroni po `amount`/`createdAt`.
- **D.** ŚREDNIE.
- **E.** ⚠️ **WARNING** (chroniony częściowo; współdzieli `dataUpdatedAt` z godzinami/kosztami).

### F-19 · Export (PDF / Word)
- **A.** `payroll-export.ts` — generacja z bieżącego stanu; read-only wobec danych.
- **B.** Brak zapisu; ACL stawek (moderator) w eksporcie.
- **C.** Eksport stanu sprzed sync (stale) — tylko prezentacja.
- **D.** NISKIE.
- **E.** ✅ **PASS**.

---

## 4. Scenariusz krytyczny (punkt 4 zlecenia): Komputer A otwarty 2 dni, B robi zmiany, A zapisuje

### 4.1 Przebieg wg kodu

| Warunek A | Zachowanie |
|-----------|-----------|
| **Karta A WIDOCZNA przez 2 dni** | `pullFromCloudAndMerge` na focus/visibility (throttle 15s) — A **ciągle scala** zmiany B do lokalnego. Auto-save 2s pushuje. Po 2 dniach stan A ≈ chmura. Zapis A: pull→merge→push. **Whole-roster i per-dzień: bezpieczne.** |
| **Karta A W TLE (hidden) przez 2 dni** | `tabVisibleRef=false` → **brak pull, brak auto-sync**. A trzyma snapshot sprzed 2 dni. Po powrocie (visibility) `pullFromCloudAndMerge` odpala PRZED jakimkolwiek pushem → scala B. Manualny/edycyjny zapis A również pulluje-przed-push. |

### 4.2 Ocena Lost Update

- **Czy możliwy Lost Update?** — **TAK, w trzech przypadkach:**
  1. **`extraCosts` (F1):** jeśli A edytuje cokolwiek bumpującego `dataUpdatedAt` (godziny/prevSat/carry) na rekordzie, którego B zmienił `extraCosts` — po merge A jest `dataWinner` → **cała tablica `extraCosts` B przepada**. Cichy. (`cloud-sync.ts:1299–1310`).
  2. **Pola rekordu spoza jawnego LWW:** `{...c, ...l, ...dataWinner}` (1318–1321) — zwycięzca `dataUpdatedAt` nadpisuje cały rekord poza jawnie mergowanymi polami (days/rate/settled/prevSat/carry/extraCosts). Dowolne przyszłe pole dodane bez własnego znacznika → Lost Update.
  3. **Clock skew (zegar klienta):** wszystkie znaczniki to `new Date().toISOString()` po stronie klienta. Jeśli zegar A jest przesunięty **do przodu**, **stare** edycje A wyglądają na „nowsze” niż realnie świeższe edycje B → A **nadpisuje nowsze dane B** mimo pull-before-push. Brak znacznika autorytatywnego serwera.

- **Czy możliwe nadpisanie nowych danych?** — **TAK**: (a) przez `extraCosts` coarse LWW, (b) przy skew zegara. Whole-bundle/whole-roster nadpisanie: **NIE** (PayrollGuard shrink + Edge shrink block + pull-before-push).

- **Czy guardy temu zapobiegają?**
  - Zapobiegają: **utracie całego rostera** (PayrollGuard `wouldBlockPayrollShrink`, Edge `isSuspiciousPayrollShrink`), **cross-week leak** (S1), **regresji settled** (S5), **utracie per-dzień** (days per-klucz spread + S3).
  - **NIE zapobiegają:** Lost Update na `extraCosts` (brak per-item/dedykowanego znacznika), Lost Update pól spoza jawnego LWW, błędnemu LWW przy clock skew (brak wersjonowania/serwerowego czasu/ETag).

- **Dokładne miejsce w kodzie (gdy NIE zapobiega):**
  - `src/lib/cloud-sync.ts:1299–1310` — `extraCosts` całościowe LWW po `dataUpdatedAt` (**F1, root Lost Update**).
  - `src/lib/cloud-sync.ts:1318–1321` — `{...c, ...l, ...dataWinner}` (pola rekordu bez własnego znacznika).
  - `src/app/App.tsx:1383,1404,1423` i pokrewne — `now = new Date().toISOString()` (znacznik klienta, brak czasu serwera → skew).
  - Brak jakiejkolwiek kontroli wersji/optimistic-lock: `pushMergedDataBundleToCloud` → `kv.mset` force-replace bez `expectedVersion`/ETag (`cloud-sync.ts:2577`, Edge `index.tsx:604–652,707`).

---

## 5. Weryfikacja zabezpieczeń (punkt 5 zlecenia)

| # | Mechanizm | Miejsce | Werdykt |
|---|-----------|---------|---------|
| 1 | **CloudSyncMutationGuard** | `cloud-sync-mutation-guard.ts` · `App.tsx:699,728` | ✅ Działa — suppress scope+czas; token begin/end; blokuje auto-sync w oknie mutacji roster. Brak stanu biznesowego (#011). |
| 2 | **withKwWeekEmployeesAsyncMutation** | `cloud-sync-mutation-guard.ts:101` · `App.tsx:1311,1494,1682` | ✅ Owija async push roster w begin/end (R1/R2); parytet z suppress 6s. |
| 3 | **finalizePayrollBundleMerge** | `cloud-sync.ts:1738` | ✅ align+sanitize+richness override+week guard; SSOT bootstrap/runtime (B4). |
| 4 | **preserveSettledLwwFromLocal** | `cloud-sync.ts:1716` | ✅ Richness override nie nadpisuje nowszego settled (S5). |
| 5 | **applyRuntimePayrollAntiLeak** | `cloud-sync.ts:1792` | ✅ Nowy pusty tydzień + bogate archiwum → brak re-populacji z chmury. |
| 6 | **bootstrap/runtime parity** | `applyBootstrapPayrollMerge` (1816) = `finalizePayrollBundleMerge` | ✅ Ta sama funkcja bootstrap i runtime (B4). |
| 7 | **Edge parity** | `payroll-week-employee-merge.ts` importowany klient + Edge; `mergeWeekEmployeesUnion` (index.tsx:230) | ✅ Wspólny kernel union po merge-key. ⚠️ ALE main push force-replace → Edge union rzadko aktywny; parytet dotyczy głównie shrink/backup/restore. |
| 8 | **weekEmployeeMergeKey** | `payroll-week-employee-merge.ts:17` | ⚠️ Niestabilny (dir→name→id) — H-R-KEY; może ominąć lokalny filtr tombstonów. |
| 9 | **deleted tombstones** | `cloud-sync.ts:505–575` (week) · 2579 push | ❌ **`kw-week-employees-deleted-ids` NIE pushowany/pobierany** — root resurrection (F2/S7-5). Pozostałe deleted-ids (jobs/dir/archive/leaves/charges) ✅ pushowane. |
| 10 | **LWW** | `pickDays/pickSettled/pickRate` | ⚠️ Poprawny algorytmicznie, ale **oparty na zegarze klienta** (brak czasu serwera) + `extraCosts` coarse (F1). |
| 11 | **replaceWeekEmployeesKeys** | `cloud-sync.ts:2594,2237,2262` · Edge 604 | ⚠️ Main path zawsze force-replace (dobre dla intencjonalnego składu, ale wyłącza Edge union guard). `pushKeysToCloudSafe`/WorkerPhotoView **bez** flagi → tam Edge union może re-dodać (H-R3). |

---

## 6. Macierz scenariuszy testowych (punkt 3 zlecenia)

Legenda: ✅ pokryte/bezpieczne · ⚠️ ryzyko/do testu · ❌ znana luka.

| Funkcja / Scenariusz | Single | 2 Dev | 3 Dev | Offline | Refresh | Ctrl+Shift+R | Restart app | Cloud Sync | Merge | Conflict | Lost Update | Resurrection | Archive | Restore | Rollover |
|----------------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| F-01 Dodanie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| F-02 Usunięcie | ✅ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ |
| F-04 Godziny | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | — | ✅ | ✅ | ✅ |
| F-05 Stawka | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | — | ✅ | ✅ | ✅ |
| F-06 extraCosts | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | — | ⚠️ | ⚠️ | ✅ |
| F-08/09 Urlopy/chor. | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F-10 Zero hours | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| F-11 Settled | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| F-12 Save Week | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| F-13 Rollover | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F-14 Restore | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| F-17 Assignments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | — | — | — |
| F-18 Carry/defer | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | — | ✅ | ✅ | ✅ |
| **clearAll** | ✅ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ |
| **batch-set transport** | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | — | — | — | — | ⚠️ | ⚠️ | ⚠️ |

---

## 7. Rejestry ryzyka (punkt 7 zlecenia)

### 7.1 Race conditions

| # | Race | Miejsce | Mitigacja obecna | Ryzyko resztkowe |
|---|------|---------|------------------|------------------|
| RC-1 | Push roster × auto-sync (ta sama karta) | `App.tsx` suppress + `CloudSyncMutationGuard` | ✅ suppress 6s + token | NISKIE |
| RC-2 | Dwa urządzenia force-replace roster równolegle | `pushMergedDataBundleToCloud:2594` (brak wersji) | pull-before-push | ŚREDNIE — last-writer-wins składu (per-record LWW ratuje różne osoby) |
| RC-3 | `runCloudSync` reentrancy | `syncInFlightRef`/`pendingCloudSyncRef` (730) | ✅ kolejkowanie | NISKIE |
| RC-4 | `pullFromCloudAndMerge` vs `runCloudSync` | `pullInFlightRef` guardy | ✅ | NISKIE |
| RC-5 | Edge: `rotateKvBackups` przed `kv.mset` — częściowa mutacja gdy mset padnie | `index.tsx:634,657,707` (EV6) | brak transakcji | ŚREDNIE (backup zrotowany mimo faila) |
| RC-6 | Edycja pola A + usunięcie tego pracownika na B (delete vs edit) | brak „delete-wins” | tombstone (lokalny) | WYSOKIE — brak reguły AC12 (delete-wins) |
| RC-7 | `settledSyncTimer` 400ms vs debounce 2s | `App.tsx:1628` | kasuje suppress | NISKIE |

### 7.2 Lost Update (potencjalne)

| # | Lost Update | Miejsce | Status |
|---|-------------|---------|--------|
| LU-1 | **`extraCosts` nadpisane przez edycję godzin** (wspólny `dataUpdatedAt`) | `cloud-sync.ts:1299–1310` | ❌ **F1 — niepokryty** |
| LU-2 | Pola rekordu spoza jawnego LWW (`{...dataWinner}`) | `cloud-sync.ts:1318–1321` | ⚠️ ryzyko przyszłych pól |
| LU-3 | Clock skew klienta → stare edycje wygrywają | `App.tsx:1383,1404,...` (Date.now klient) | ⚠️ systemowe (brak czasu serwera) |
| LU-4 | Restore bez jawnego push — okno merge | `App.tsx:1244` | ⚠️ do testu |
| LU-5 | Carry/defer nadpisany edycją godzin (wspólny `dataUpdatedAt`) | `App.tsx:1464` + merge 1330 | ⚠️ częściowo chroniony `pickPayrollCarryForward` |
| LU-6 | Assignments `workEntries[]` równoległa edycja | `payroll-job-assignments.ts` (kw-jobs) | ⚠️ osobny obszar |

### 7.3 Resurrection (potencjalne)

| # | Resurrection | Miejsce | Status |
|---|--------------|---------|--------|
| RS-1 | **Usunięty pracownik wraca cross-device** (tombstone lokalny) | `cloud-sync.ts:2579` (brak push deleted-ids), 2505–2517 (brak fetch) | ❌ **F2 / S7-5 (DESIGN FREEZE APPROVED)** |
| RS-2 | **`clearAllWeekEmployees` — cały skład wraca** (brak tombstonów) | `App.tsx:1364` | ❌ pochodna F2 — brak tombstonowania przy clear |
| RS-3 | Niestabilny merge-key omija lokalny filtr | `payroll-week-employee-merge.ts:17` | ⚠️ H-R-KEY / S7-5-4 |
| RS-4 | Edge union re-dodaje na ścieżkach bez force-replace | `index.tsx:642–650` (`pushKeysToCloudSafe`/WorkerPhotoView) | ⚠️ H-R3 / S7-5-3 |
| RS-5 | Restore przywraca, ale tombstony nie propagują | `App.tsx:1229` + F2 | ⚠️ pochodna F2 |

### 7.4 Miejsca wymagające dalszych testów (device / runtime evidence)

| # | Test do wykonania | Powód |
|---|-------------------|-------|
| T-1 | **Repro LU-1 (F1 — OPEN)**: A edytuje godziny, B dodaje premię temu samemu pracownikowi → sprawdzić czy premia B przepada | potwierdzenie F1 na realnych urządzeniach |
| T-1H | **Regression guard H (CLOSED analitycznie)**: po potwierdzonym auto-pull edycja godzin **nie** kasuje `extraCosts` B → PASS = fix ETAP 1 działa | strażnik regresji „stale safeEmp snapshot” |
| T-2 | **Repro RS-2**: A `clearAllWeekEmployees`, B ma skład → czy skład wraca po sync | potwierdzenie braku tombstonu przy clear |
| T-3 | **Clock skew (LU-3)**: ustawić zegar A +10 min, edytować stare dane → czy nadpisze nowsze B | ryzyko systemowe LWW |
| T-4 | **batch-set 500 (F3/H1)**: zebrać requestId · error.message · Edge stack · Postgres log (OBSERVATION S7 §B1–B9) | H1 UNCONFIRMED |
| T-5 | **Konwergencja 3 urządzeń** po usunięciu (AC11 S7-5) | wymóg zamknięcia S7-5 |
| T-6 | **Offline return (AC10)**: urządzenie offline z zaległym rosterem wraca online | resurrection po powrocie |
| T-7 | **Restore push window (LU-4)**: restore + natychmiastowy pull z innego urządzenia | okno bez jawnego push |
| T-8 | **RC-5 partial mutation**: mset pada po rotacji backupów → stan KV backupów vs główny | spójność transakcyjna Edge |
| T-9 | **Merge-key rozjazd (RS-3)**: rekord z `directoryId` vs kopia bez → czy tombstone trafia | H-R-KEY |
| T-10 | **Restart aplikacji / PWA SW**: trwałość tombstonów localStorage po restarcie (AC13) | persystencja tombstonów |

---

## 7.5 Scenariusz H — conflict overwrite po auto-pull · WERDYKT KOŃCOWY (✅ PASS · CLOSED)

> **Kontekst:** REPRO plan `docs/PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md` §2 (scenariusz H). Analiza kodu HEAD `0cdbc54`. Hipoteza „formularz trzyma własną kopię rekordu i nadpisuje świeżo pobrane `extraCosts`” — **OBALONA**.

### 1. Dlaczego H jest PASS
Po potwierdzonym auto-pull (krok 4) stan `weekEmployees` zawiera już `extraCosts` urządzenia B. Edycja godzin idzie przez `updateWeekEmployeeDay` (`App.tsx:1421–1434`), który **patchuje wyłącznie `days` na `prev`** (najświeższym stanie) i zwraca `{...e, days, dataUpdatedAt: now}` — `extraCosts` **nietknięte**. Push (force-replace) wysyła rekord zawierający **premię B + godziny A**. Nic nie ginie → **PASS**.

### 2. Dlaczego formularz nie utrzymuje stale snapshot
`WeekEmployeeDetail` jest **bezstanowy względem rekordu**: `safeEmp = ensureWeekEmployeeDays(emp)` liczony z **prop `emp` co render** (`WeekEmployeeDetail.tsx:86`), brak `useState(emp)`. `PayrollView` przechowuje **`selectedEmpId: string`** (`:529`), a rekord wyprowadza co render z **żywej tablicy**: `selectedEmp = displayEmployees.find(e=>e.id===selectedEmpId)` (`:749`). Brak przycisku „zapisz cały rekord” — edycje to **natychmiastowe patche pojedynczych pól po `id`** (`onPatchDay=(k,n)=>onUpdateWeekEmployeeDay(selectedEmp.id,k,n)`, `:1471`). Żadna warstwa nie zamraża kopii rekordu.

### 3. Dlaczego problem nie leży w React state
Handlery używają **functional update** `setWeekEmployees(prev => …)` — czytają **najświeższy** stan, nie zamkniętą w closure kopię. `updateWeekEmployeeDay`/`updateWeekEmployeeExtraCosts` patchują **jedno pole po `id`**, nie nadpisują całego rekordu. Nawet gdyby panel wyrenderował chwilowo starszy `selectedEmp`, patch i tak trafia po `id` na `prev` (żywy) — `extraCosts` nie są w tej ścieżce nigdy zapisywane, więc React state ich **nie gubi**. Źródłem ewentualnej utraty jest **merge sync** (F1), nie warstwa komponentu.

### 4. Dlaczego H to jedynie regression guard dla ETAP 1
Komentarze `App.tsx:1401,1420` — „patch na prev state (**bez stale safeEmp snapshot**)” — dokumentują, że bug „własnej kopii” został **świadomie naprawiony w ETAP 1**. Scenariusz H testuje dokładnie tę ścieżkę: **PASS = fix działa**. **FAIL przy potwierdzonym pull = regresja ETAP 1** (osobny P0, nie nowy wektor). Wartość H = **strażnik regresji**, nie nowe odkrycie.

### 5. Potwierdzenie: jedynym aktywnym kandydatem pozostaje F1
H rozpada się na dwie ścieżki: **(a) pull wylądował → PASS** (ETAP 1); **(b) pull nie wylądował** (karta stale aktywna → brak eventu focus/visibility; okno throttle 15 s) → A edytuje na **stale base `[]`** i force-replace nadpisuje premię B — **to dokładnie F1** (coarse `extraCosts` LWW + wspólny `dataUpdatedAt`, `cloud-sync.ts:1299–1310`), nie osobny mechanizm. **Wniosek: jedynym aktywnym kandydatem Lost Update dla `extraCosts` pozostaje F1.**

| Scenariusz H | Status |
|--------------|--------|
| Werdykt analityczny | ✅ **PASS** |
| Status | 🔒 **CLOSED** (analiza kodu; opcjonalny device-check = regression guard ETAP 1) |
| Klasyfikacja | **Pokrywany przez F1** — brak nowego wektora na poziomie formularza/React state |
| F1 (`extraCosts` merge / stale base) | ❌ **OPEN** — REPRO na urządzeniach (T-1) |

---

## 8. Mapowanie do istniejących bundli naprawczych

| Ustalenie | Objęte bundlem? |
|-----------|-----------------|
| **F2 / RS-1 / RS-3 / RS-4** (resurrection, tombstony, merge-key, force-replace) | ✅ **S7-5** DESIGN FREEZE APPROVED (ETAP 1 = S7-5-1+S7-5-2; ETAP 2 = S7-5-3+S7-5-4). IMPLEMENT WAITING. |
| **F3 / batch-set 500** | ✅ **S7-2** (NO GO do H1) / **S7-4A** (OBSERVATION) / S7-1 (diagnostyka CLOSED). |
| **RS-2 / clearAll bez tombstonu** | ⚠️ Powiązane z S7-5, ale **nie wymienione wprost** w DESIGN FREEZE — do rozważenia jako AC dodatkowe. |
| **F1 / LU-1 / LU-2 / extraCosts coarse LWW** | ❌ **OPEN — NIEOBJĘTE żadnym bundlem.** Wymaga osobnego AUDIT + DESIGN FREEZE (per-item merge lub `extraCostsUpdatedAt`). REPRO na urządzeniach: T-1. |
| **Scenariusz H / conflict overwrite po auto-pull (React state / stale snapshot)** | ✅ **CLOSED (PASS).** Pokrywany przez fix ETAP 1 (patch-na-`prev`). Nie wektor. Device-check = regression guard, nie warunek certyfikacji. |
| **LU-3 / clock skew (LWW bez czasu serwera)** | ❌ **NIEOBJĘTE.** Ryzyko systemowe — decyzja architektoniczna (server timestamp / wersjonowanie / ETag). |
| **RC-2 / brak optimistic-lock** | ❌ **NIEOBJĘTE.** Powiązane z G6 ETag (out of scope S7). |

---

## 9. Rekomendacje (bez implementacji — do decyzji właściciela)

> Zgodnie ze zleceniem NIE proponuję kodu. Poniżej wyłącznie priorytety do ewentualnego osobnego AUDIT/DESIGN FREEZE.

1. **P0 (znane):** dokończyć OBSERVATION S7-4A → IMPLEMENT S7-5 ETAP 1 (resurrection) → warunkowo S7-2 (500).
2. **P1 (NOWE, z tej certyfikacji):** osobny bundle dla **F1 `extraCosts` Lost Update** — najpoważniejsze niepokryte ryzyko finansowe (cichy zanik premii/kosztów). Kandydaci: dedykowany `extraCostsUpdatedAt` lub per-item merge z id.
3. **P1:** **RS-2 `clearAllWeekEmployees`** — dodać tombstonowanie składu (spójność z `removeWeekEmployee`).
4. **P2 (architektoniczne):** ocena **LWW na zegarze klienta** (LU-3) i **braku optimistic-lock** (RC-2) — server timestamp / wersja rekordu / ETag.
5. **Testy:** rozszerzyć harness o T-1…T-10 (sekcja 7.4), w tym Golden Regression dla LU-1 i RS-2.

---

## 10. Ograniczenia audytu

- Audyt **statyczny** (kod). Zachowania runtime (clock skew, batch-set 500, konwergencja wielu urządzeń) **wymagają dowodu z produkcji/urządzeń** (sekcja 7.4).
- H1 (batch-set timeout = Root Cause) pozostaje **UNCONFIRMED**.
- Billing (`kw-recoverable-charges`) i Jobs (`kw-jobs` / assignments) certyfikowane wyłącznie w części styku z LP.

---

# Executive Summary

> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod UI:** v2.63.27 · Analiza statyczna kodu.

## 1. PASS (zamknięte)

Obszary zweryfikowane pozytywnie na poziomie kodu — **zamknięte**:

| # | Obszar | Ustalenie | Dowód |
|---|--------|-----------|-------|
| 1 | **React state** | Utrata `extraCosts` nie pochodzi z warstwy komponentu — źródłem jest merge sync (F1), nie React state | `App.tsx:1421–1434` |
| 2 | **Stale snapshot** | Formularz **nie** trzyma własnej kopii rekordu — brak `useState(emp)`, `safeEmp` liczony z prop co render | `WeekEmployeeDetail.tsx:86` |
| 3 | **ETAP 1 regression guard** | Bug „stale safeEmp snapshot” świadomie naprawiony — patch-na-`prev` | `App.tsx:1401,1420` |
| 4 | **Functional updates** | `setWeekEmployees(prev => …)` czyta najświeższy stan (nie closure-kopię) | `App.tsx:1402,1421` |
| 5 | **selectedEmpId** | Selekcja to **string ID**, nie zamrożony obiekt | `PayrollView.tsx:529` |
| 6 | **Re-derived record** | `selectedEmp = displayEmployees.find(e=>e.id===selectedEmpId)` — co render z żywej tablicy | `PayrollView.tsx:749` |
| 7 | **Per-day patch** | Edycja godzin patchuje wyłącznie `days` po `id`, `extraCosts` nietknięte | `App.tsx:1424–1429`, `PayrollView.tsx:1471` |
| 8 | **Scenariusz H** | Conflict overwrite po auto-pull → ✅ **PASS / CLOSED** (regression guard ETAP 1, brak nowego wektora) | §7.5 |

## 2. OPEN (P0)

| # | Pozycja | Status | Bundle |
|---|---------|--------|--------|
| 1 | **Resurrection** (usunięty pracownik / skład wraca cross-device — brak współdzielonych tombstonów) | ❌ **OPEN — P0** | S7-5 DESIGN FREEZE **APPROVED**, IMPLEMENT WAITING |
| 2 | **batch-set 500** (transport HTTP 500, Root Cause H1 = kv.mset timeout) | ❌ **OPEN — P0** · **H1 UNCONFIRMED** | S7-2 (NO GO do H1) / S7-4A OBSERVATION |

## 3. OPEN (HIGH)

| # | Pozycja | Status |
|---|---------|--------|
| 1 | **F1 — Lost Update `extraCosts`** (premie/dodatki/koszty — coarse whole-array LWW sprzężone ze wspólnym `dataUpdatedAt`) | ❌ **OPEN — HIGH** · **REPRO REQUIRED** · **DESIGN FREEZE NOT STARTED** |

---

**Payroll Certification 2026 pozostaje otwarta do czasu zamknięcia aktywnych pozycji OPEN.**

---

*SSOT certyfikacji Payroll 2026: ten plik. Read-only — bez zmian kodu, bez BUILD, bez COMMIT. Workflow: AUDIT → RAPORT → STOP.*
