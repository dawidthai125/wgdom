# PAYROLL-CLOUD-RECOVERY — Etap 2 · DESIGN FREEZE

> **Status:** **DESIGN FREEZE DRAFT** — czeka na akceptację właściciela repo  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0  
> **Baseline prod:** v2.63.16 (`31a687a`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** AUDIT PAYROLL-CLOUD-RECOVERY Etap 2+ (2026-07-01) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md) · [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md)

---

## 0. Werdykt freeze (zakres)

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-CLOUD-RECOVERY — **Etap 2** |
| **Bundle w scope** | **B1** · **B2** |
| **Bundle poza scope** | **B3** (guard faza 2 roster) · **B4** (RCA-3 bootstrap) · **B5** (RCA-2 closed week) · **B6** (Edge parity) · **B7** (P0.2–P0.4) |
| **Nowe Principles** | **Brak** — obowiązują istniejące **#001–#013** z freeze P0 roster + guard |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu danych** | **Brak** |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

---

## 1. Scope

### 1.1 Bundle B1 — Fail-loud `persistPayrollRoster` (P0.1d)

**Problem (RCA):** `persistPayrollRoster` wywołuje `pushWeekEmployeesToCloud` z `.catch(() => {})` — błąd sieci / `batch-set` jest **cichy**. Lokalny stan React/LS pokazuje dodaną osobę, chmura może pozostać bez niej; użytkownik nie dostaje sygnału.

**Cel:** Po nieudanym pushu składu tygodnia — **widoczny komunikat** (toast), bez zmiany semantyki merge ani Payroll Guard.

**Ścieżki objęte (wyłącznie push składu):**

| Wywołanie | Trigger UI |
|-----------|------------|
| `persistPayrollRoster` | Dodaj z kartyoteki · usuń z LP · wyczyść skład · zastąp całym aktywnym składem · copy z poprzedniego tygodnia (gdy mutuje skład) |

**Poza zakresem B1:**

- Zmiana `skipPayrollGuard: true` (zachować — świadome dodanie osoby bez godzin)
- Zmiana `mergeWeekEmployees` / `payrollRosterPushRef` / guard faza 2 (**B3**)
- Fail-loud pełnego `runCloudSync` (już jest — `isPayrollGuardBlockedError` + toast)
- Retry automatyczny pushu roster
- Blokada UI / rollback lokalnego stanu po błędzie push

**Pliki IMPLEMENT (plan):**

| Plik | Zmiana |
|------|--------|
| `src/app/App.tsx` | `persistPayrollRoster` — obsługa błędu, toast, usunięcie silent catch |
| `src/lib/cloud-sync.ts` | Eksport stałej komunikatu + helper `isPayrollRosterPushError` (reuse wzorzec `PAYROLL_GUARD_BLOCKED_MESSAGE`) |
| `scripts/test-payroll-roster-push-fail-loud-p0.mjs` | **NOWY** — test jednostkowy ścieżki błędu push |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §11 | jedna linia — fail-loud roster push |

---

### 1.2 Bundle B2 — JobsView `CloudSyncMutationGuard` (Guard P0.1)

**Problem (RCA):** `PayrollJobAssignmentsPanel` opakowuje mutacje `workEntries` w `withKwJobsWorkEntryMutation` (v2.63.16). `JobsView` mutuje `job.workEntries[]` przez bezpośrednie `setJobs` / `updateJob` **bez guarda** — ten sam race: auto-sync pull-merge może nadpisać świeżą edycję przydziału/godzin/notatki wpisu.

**Cel:** Wszystkie mutacje **`workEntries[]`** w `JobsView` przechodzą przez **ten sam** wrapper co Lista Płac → Przydziały (**#004**, **#011**, **#012** z guard freeze).

**Mutacje objęte (minimum):**

| ID | Ścieżka w `JobsView.tsx` | Operacja |
|----|--------------------------|----------|
| J1 | `handleRemoveWorkEntry` | usuń wpis pracownika |
| J2 | `handleAddEntry` | dodaj wpis (Pracownicy) |
| J3 | `appendWorkEntries` | dodaj wiele wpisów (kopiuj wczoraj / z LP / kopiuj na dziś) |
| J4 | `copyEntryToToday` | kopia wpisu na dziś |
| J5 | edycja `notes` inline (onChange w tabeli Pracownicy) | aktualizacja `workEntries` |

**Poza zakresem B2:**

- Mutacje job **bez** `workEntries` (`updateJob` dla dokumentów, WM, billing, fazy, inspektor, activity…)
- `addJob` / `deleteJob` / `deleteBulkSelected`
- `setJobs` w `useEffect` markowania `workerReports` (adminReviewedAt)
- `appendJobPhotos` i inne pola `Job`
- Nowy moduł guard / `jobsAssignmentPushRef` (**#003**)
- Refactor `moveWorkEntryToJob` (**#010** guard freeze)
- Rozszerzenie guard na `payrollRosterPushRef` (**B3**)

**Pliki IMPLEMENT (plan):**

| Plik | Zmiana |
|------|--------|
| `src/app/JobsView.tsx` | `applyJobs` + podmiana ścieżek J1–J5 |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §11 | JobsView w scope `kw-jobs` guard |

**Bez zmian (reuse istniejącego):**

- `src/lib/cloud-sync-mutation-guard.ts` — **bez modyfikacji API**
- `src/app/App.tsx` — guard w sync paths już podłączony (v2.63.16)

---

### 1.3 Jawne wyłączenia (B3–B7)

| Bundle | Temat | Powód wyłączenia |
|--------|-------|------------------|
| B3 | `payrollRosterPushRef` → guard `kw-week-employees` | Osobny sprint; nie mieszać z B1/B2 |
| B4 | `applyBootstrapPayrollMerge` (RCA-3) | Wymaga osobnego RCA |
| B5 | Closed week UI (RCA-2) | Wymaga osobnego RCA |
| B6 | Edge merge `directoryId` vs UUID | Deploy Supabase — osobny release |
| B7 | P0.2–P0.4 | Niezdefiniowany — STOP |

---

## 2. SSOT

| Warstwa | SSOT | Bundle |
|---------|------|--------|
| Skład tygodnia LP | `kw-week-employees` · `mergeWeekEmployees` UNION po `directoryId` | B1 (push tylko) |
| Push składu | `pushWeekEmployeesToCloud` + `replaceWeekEmployeesKeys` | B1 |
| Przydziały / wpisy pracowników na robocie | `job.workEntries[]` w `kw-jobs` | B2 |
| Merge przydziałów | `mergeWorkEntriesById` / `mergeJobsById` — **bez zmian** (#002) | B2 |
| Kiedy wolno auto-sync | `CloudSyncMutationGuard.isBlocked()` w `App.tsx` | B2 (reuse) |
| Komunikat błędu roster push | Nowa stała w `cloud-sync.ts` (wzorzec `PAYROLL_GUARD_BLOCKED_MESSAGE`) | B1 |
| Orchestracja roster in-flight | `payrollRosterPushRef` — **bez zmian** w B1/B2 | — |

**B1 nie tworzy drugiego SSOT składu** — tylko ujawnia błąd istniejącego pushu.

**B2 nie tworzy drugiego guarda** — reuse `withKwJobsWorkEntryMutation` (#003, #011).

---

## 3. Reuse

| Element | Reuse | Bundle |
|---------|-------|--------|
| `pushWeekEmployeesToCloud` | **Bez zmiany kontraktu** | B1 |
| `PAYROLL_GUARD_BLOCKED_MESSAGE` / `isPayrollGuardBlockedError` | **Wzorzec** dla roster push error | B1 |
| `toast.error` + `description` | Ten sam UX co `runCloudSync` catch | B1 |
| `withKwJobsWorkEntryMutation` | **Identyczny** import jak `PayrollJobAssignmentsPanel` | B2 |
| Wzorzec `applyJobs(updater)` | Kopia semantyki z `PayrollJobAssignmentsPanel` L51–56 | B2 |
| `cloudSyncMutationGuard` w `App.tsx` | Już w `runCloudSync` / `pullFromCloudAndMerge` — **bez zmian** | B2 |
| `payrollRosterPushRef` + `suppressAutoSyncUntilRef` | **Zachować** równolegle (faza 1 guard doc #005) | B1, B2 |

---

## 4. Zero Duplicate Logic

| Zagrożenie | Mitigacja w freeze |
|------------|-------------------|
| Drugi guard / `jobsAssignmentPushRef` | **Zakaz** — tylko `withKwJobsWorkEntryMutation` (#003) |
| Osobna logika TTL suppress w JobsView | **Zakaz** — guard `begin('kw-jobs', suppressMs: 4500)` w lib |
| Duplikat merge przydziałów | **Zakaz** — #002; B2 tylko opakowuje `setJobs` |
| Osobny retry push roster | **Zakaz** w B1 — toast + log; retry = użytkownik / auto-sync później |
| Nowy helper sync w App dla JobsView | **Zakaz** — mutacja zostaje w `JobsView`, guard z lib |
| Kopiowanie całego `updateJob` pod guard | **Zakaz** — guard tylko na ścieżkach J1–J5; `updateJob` ogólny bez guarda |

**Wzorzec B2 (freeze):**

```text
applyJobs(updater) := withKwJobsWorkEntryMutation(() => setJobs(updater))

handleRemoveWorkEntry / appendWorkEntries / … → applyJobs
updateJob (dokumenty, WM, billing, …) → setJobs bez guarda
```

---

## 5. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| RB1 | Toast spam przy wielokrotnym szybkim dodawaniu z Kadr | Niski | Ten sam `id` toast co sync (`sonner` dedup) lub stały `id: "payroll-roster-push"` |
| RB2 | Użytkownik widzi błąd, ale lokalny skład zostaje | Akceptowalne | Zgodne z #002 — merge przy kolejnym sync; komunikat explicite w copy PL |
| RB3 | B2 — `updateJob` z activity dla work_entry poza `applyJobs` | Średni | `handleAddEntry` / `appendWorkEntries` muszą iść przez `applyJobs`; activity wewnątrz updatera lub tuż po, w jednym ticku guard |
| RB4 | B2 — notatki inline: każdy keystroke = begin/end | Średni | **Akceptowalne** — ten sam wzorzec co debounce LP; suppress 4500 ms przedłuża się (#012 R12.4) |
| RB5 | Regresja T1–T13 istniejących testów | Niski | Gate regresji obowiązkowy (§6) |
| RB6 | Mieszanie B1+B2 w jednym commicie bez izolacji review | Niski | Release plan §7 — preferowane **dwa commity**, jeden release OK |

---

## 6. Acceptance Criteria

### 6.1 Bundle B1 — Fail-loud roster push

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **B1-AC1** | Usunięty silent `.catch(() => {})` w `persistPayrollRoster` | code review |
| **B1-AC2** | Przy odrzuconym `batch-set` / błędzie sieci: `toast.error` z czytelnym komunikatem PL | smoke manual S1 |
| **B1-AC3** | `payrollRosterPushRef` zwalniane w `finally` także przy błędzie | code review |
| **B1-AC4** | `skipPayrollGuard: true` **bez zmian** | code review |
| **B1-AC5** | Eksport `PAYROLL_ROSTER_PUSH_FAILED_MESSAGE` + `isPayrollRosterPushError` w `cloud-sync.ts` | unit test |
| **B1-AC6** | Test `test-payroll-roster-push-fail-loud-p0.mjs` — symulacja fail `batch-set` → throw / helper true | automatyczny |
| **B1-AC7** | Regresja T1–T7 roster merge — **PASS** | `test-payroll-add-from-directory-merge-p0.mjs` |

**Smoke manualny B1:**

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| S1 | Kadry → dodaj osobę do LP (normalny prod) | Sukces bez toastu błędu |
| S2 | (opcjonalnie dev) symulacja offline przy dodaniu | Toast błędu zapisu składu; po powrocie sieci sync odzyskuje |

---

### 6.2 Bundle B2 — JobsView guard

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **B2-AC1** | `applyJobs` w `JobsView` używa `withKwJobsWorkEntryMutation` | code review |
| **B2-AC2** | Ścieżki J1–J5 przechodzą przez `applyJobs` | code review |
| **B2-AC3** | `updateJob` dla pól innych niż `workEntries` — **bez** guarda | code review |
| **B2-AC4** | `cloud-sync-mutation-guard.ts` — **brak** zmian API | code review |
| **B2-AC5** | Regresja T11–T13 + T1–T10 merge fidelity — **PASS** | skrypty §6.3 |
| **B2-AC6** | Brak nowego ref sync (#003) | code review |

**Smoke manualny B2 (Vercel):**

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| S1 | Roboty → robota → Pracownicy → dodaj wpis | Wpis zostaje po ≥5 s |
| S2 | Ctrl+F5 | Wpis zachowany |
| S3 | Usuń wpis → sync | Nie wraca ze stale cloud |
| S4 | Edycja notatki wpisu → sync | Notatka zachowana |
| S5 | Lista Płac Przydziały nadal PASS (regresja 2.63.16) | S1 z guard doc |

---

### 6.3 Testy gate release (oba bundle)

```bash
# B1
npx vite-node scripts/test-payroll-roster-push-fail-loud-p0.mjs
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs

# B2 + regresja guard
npx vite-node scripts/test-cloud-sync-mutation-guard.mjs
npx vite-node scripts/test-payroll-work-entry-merge-fidelity.mjs
npx vite-node scripts/test-payroll-assignments-p1.mjs

# Wspólna regresja roster
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
npx vite-node scripts/test-payroll-week-employee-merge-asymmetry.mjs
```

**BUILD:** `npm run build` PASS (gate IMPLEMENT).

---

## 7. Bundle Release Plan

### 7.1 Kolejność IMPLEMENT

```text
Akceptacja DESIGN FREEZE (ten dokument)
  → IMPLEMENT B1
  → IMPLEMENT B2
  → BUILD + testy §6.3
  → changelog (jedna wersja patch lub dwa patche — patrz §7.2)
  → commit(y) na polecenie właściciela
  → push na polecenie
  → VERIFY FAST version.json
```

### 7.2 Wersjonowanie

| Opcja | Wersja | Kiedy |
|-------|--------|-------|
| **A (zalecana)** | **2.63.17** — jeden release Etap 2 MIN | B1 + B2 w jednym bundle deploy |
| **B** | 2.63.17 (B1) + 2.63.18 (B2) | Gdy właściciel wymaga osobnych pushy |

**RELEASE MODE:** FAST RELEASE (oba bundle łącznie <15 plików, bez Shared poza dokumentacją).

**HOTFIX CLASSIFICATION:** BUGFIX + UX

### 7.3 Mapa plików per commit (izolacja)

**Commit 1 — B1 (tylko fail-loud roster):**

- `src/app/App.tsx` (fragment `persistPayrollRoster`)
- `src/lib/cloud-sync.ts` (stała + helper)
- `scripts/test-payroll-roster-push-fail-loud-p0.mjs`

**Commit 2 — B2 (tylko JobsView guard):**

- `src/app/JobsView.tsx`

**Commit 3 — docs/release (wspólny lub per commit):**

- `src/app/changelog-data.ts`
- `CHANGELOG.md`
- `docs/ARCHITECTURE.md`
- `docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md` (status → IMPLEMENT COMPLETE)

**Zakaz:** mieszania z Mobile · Tender · Inspector · TEST-INFRA · Edge `index.tsx`.

### 7.4 VERIFY

Po push: **jedno** `curl -s https://www.wgdom.fun/version.json` → oczekiwana wersja z changelog.

---

## 8. GO / NO GO

### 8.1 Warunki GO (IMPLEMENT)

| # | Warunek | Status |
|---|---------|--------|
| G1 | AUDIT Etap 2+ zatwierdzony | **TAK** |
| G2 | DESIGN FREEZE B1+B2 zaakceptowany przez właściciela repo | **CZEKA** |
| G3 | Scope ograniczony do B1+B2 (B3–B7 wyłączone) | **TAK** (ten dokument) |
| G4 | Brak nowych Principles / KV / zmian merge | **TAK** |
| G5 | STABILIZATION WINDOW — świadome wejście w Etap 2 MIN na polecenie | **CZEKA** (właściciel) |

### 8.2 Werdykt

| Werdykt | Warunek |
|---------|---------|
| **DESIGN FREEZE GO** | G1 + G3 + G4 spełnione; właściciel akceptuje §1–§7 |
| **IMPLEMENT GO** | DESIGN FREEZE GO + G2 + G5 |
| **IMPLEMENT NO GO** | Rozszerzenie o B3–B7 bez nowego freeze; zmiana merge/guard API; brak testów §6.3 |

### 8.3 Stan dokumentu

```text
DESIGN FREEZE: DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:     NO GO (zabroniony do akceptacji)
```

---

*SSOT Etap 2 (B1+B2): ten plik · IMPLEMENT tylko na explicit polecenie po DESIGN FREEZE GO.*
