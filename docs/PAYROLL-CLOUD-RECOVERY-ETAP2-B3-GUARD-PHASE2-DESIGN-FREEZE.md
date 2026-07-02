# PAYROLL-CLOUD-RECOVERY — Etap 2 · B3 Guard Phase 2 · DESIGN FREEZE

> **Status:** **DESIGN FREEZE FINAL** — czeka na akceptację właściciela repo · **IMPLEMENT: NO GO**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0 FINAL  
> **Baseline prod:** v2.63.17 (`734cbfe`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** AUDIT PAYROLL-CLOUD-RECOVERY backlog B3 (2026-07-01) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md) (B1+B2) · [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md)

---

## 0. Werdykt freeze (zakres)

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-CLOUD-RECOVERY — **Etap 2 · B3** |
| **Bundle** | **B3** — Guard Phase 2 (`kw-week-employees`) |
| **Cel** | Koordynacja sync składu LP przez **`CloudSyncMutationGuard`** — pełny reuse istniejącego mechanizmu |
| **Principles** | **Brak nowych** — obowiązują **#003, #005, #006, #007, #008, #011–#013** z guard freeze P0 |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu danych** | **Brak** |
| **`mergeWeekEmployees`** | **Bez zmian** |
| **Edge / Supabase** | **Bez zmian** |
| **`payrollRosterPushRef`** | **Pozostaje** — równolegle z guardem do czasu pełnej migracji wszystkich ścieżek roster push |
| **Usunięcie `payrollRosterPushRef`** | **Poza scope B3** — osobny bundle (faza 2b / cleanup) |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

---

## 1. Scope

### 1.1 Problem (RCA)

Po B1+B2 (v2.63.17) koordynacja sync składu tygodnia LP opiera się na **`payrollRosterPushRef`** + **`suppressAutoSyncUntilRef`** — osobnym od `CloudSyncMutationGuard`, który już blokuje auto-sync dla `kw-jobs` (v2.63.16–17).

**Skutek:** duplicate logic (#003) — dwa niezależne mechanizmy decydują „czy wolno pull-merge-push” podczas mutacji składu. Guard ma scope `kw-week-employees` w typach, ale **nie jest używany** na ścieżkach roster push (Principle **#006** — faza 2).

### 1.2 Cel B3

**Dodać** tokeny guarda `kw-week-employees` na ścieżkach push składu LP — **bez usuwania** działających warstw `payrollRosterPushRef` i `suppressAutoSyncUntilRef` w tym release.

Guard staje się **równoległym SSOT koordynacji** (defense in depth). Usunięcie refów — **dopiero** gdy wszystkie ścieżki roster push będą objęte guardem i zweryfikowane (bundle poza B3).

### 1.3 Ścieżki objęte IMPLEMENT

| ID | Ścieżka | Plik | Operacja |
|----|---------|------|----------|
| **R1** | `persistPayrollRoster` | `App.tsx` | Push składu po dodaniu/usunięciu/wyczyszczeniu/zastąpieniu z Kadr |
| **R2** | `syncWeekRatesFromDirectory` (async IIFE push) | `App.tsx` | Push składu + ewentualny snapshot archiwum przy sync stawek z kartoteki |

**Wzorzec R1/R2 (async push):**

```text
token = cloudSyncMutationGuard.begin('kw-week-employees', { suppressMs: 6000 })
payrollRosterPushRef.current = true          ← ZACHOWAĆ (nie usuwać w B3)
suppressAutoSyncUntilRef = now + 6000        ← ZACHOWAĆ (nie usuwać w B3)
void push*(...)
  .finally(() => {
    cloudSyncMutationGuard.end(token)        ← NOWE
    payrollRosterPushRef.current = false     ← ZACHOWAĆ
  })
  .catch(fail-loud toast)                    ← B1 bez regresji
```

**Uwaga async:** `withKwWeekEmployeesMutation` (sync) **nie wystarczy** dla R1/R2 — push jest fire-and-forget. Obowiązuje jawny `begin` / `end` w `finally` po zakończeniu Promise (Principle **#012 R12.6**).

### 1.4 Ścieżki sync — bez zmiany warunków ref

W `pullFromCloudAndMerge`, `runCloudSync`, `scheduleAutoCloudSync`:

- Sprawdzenie **`payrollRosterPushRef.current`** — **zachować** (nie usuwać w B3).
- Sprawdzenie **`cloudSyncMutationGuard.isBlocked()`** — **już jest**; po B3 `begin('kw-week-employees')` automatycznie blokuje globalnie przez `suppressUntil` + aktywny token.

**Nie** usuwać w B3 żadnego z istniejących warunków — guard **dodaje** warstwę, nie zastępuje refów w tym bundle.

### 1.5 Jawne wyłączenia (poza B3)

| Element | Powód |
|---------|--------|
| Usunięcie `payrollRosterPushRef` | Faza 2b — po pełnej migracji wszystkich ścieżek |
| Usunięcie `suppressAutoSyncUntilRef` na ścieżce roster | Osobny bundle cleanup |
| `pushPayrollWeekAfterRollover` | Obecnie **bez** `payrollRosterPushRef` — backlog **B3.1** (osobny freeze) |
| `mergeWeekEmployees` / UNION `directoryId` | SSOT P0 roster — zamknięte 2.63.15 |
| Edge `batch-set` merge | Bundle **B6** Edge Parity |
| `applyBootstrapPayrollMerge` | Bundle **B4** RCA-3 |
| Closed week UI | Bundle **B5** RCA-2 |
| B4 · B5 · B6 · B7 | Etap 2 — osobne freeze |
| Nowe Principles | Zakaz |
| Zmiana `skipPayrollGuard` / Payroll Guard shrink | **#008** — bez zmian |
| B1 fail-loud toast | Bez regresji |
| B2 JobsView guard J1–J5 | Bez regresji |

### 1.6 Pliki IMPLEMENT (plan)

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync-mutation-guard.ts` | `KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS = 6000` · `withKwWeekEmployeesMutation` (sync) · opcjonalnie `withKwWeekEmployeesAsyncMutation` (reuse `begin`/`end`, bez duplikacji logiki) |
| `src/app/App.tsx` | R1 · R2 — `begin`/`end` guard + zachowanie refów |
| `scripts/test-payroll-roster-guard-phase2.mjs` | **NOWY** — testy B3 |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §11 | jedna linia — guard faza 2 roster |

**Bez zmian:**

- `src/lib/cloud-sync.ts` — merge, push kontrakty
- `supabase/functions/make-server-0afb8820/index.tsx`
- `CloudSyncMutationGuard` API poza rozszerzeniem helperów (begin/end/isBlocked bez zmian semantyki)

---

## 2. SSOT

| Warstwa | SSOT | B3 |
|---------|------|-----|
| Skład tygodnia LP | `kw-week-employees[]` · `mergeWeekEmployees` UNION po `directoryId` | **bez zmian** |
| Push składu | `pushWeekEmployeesToCloud` + `replaceWeekEmployeesKeys` + `skipPayrollGuard: true` | **bez zmian** |
| Kiedy wolno auto-sync (jobs) | `withKwJobsWorkEntryMutation` / `isBlocked()` | **bez zmian** |
| Kiedy wolno auto-sync (roster) | **`CloudSyncMutationGuard` scope `kw-week-employees`** | **NOWE w B3** |
| Legacy in-flight roster | `payrollRosterPushRef` | **zachowane równolegle** (do fazy 2b) |
| Legacy defer suppress | `suppressAutoSyncUntilRef` na R1/R2 | **zachowane równolegle** |
| Payroll Guard (>50% shrink) | `applyPayrollGuardBeforePush` | **bez zmian** (#008) |
| Prawda biznesowa składu | React state + LS + `mergeWeekEmployees` | guard **nie** przechowuje danych (#011) |

**B3 nie tworzy drugiego guarda** — rozszerza użycie istniejącego singletonu `cloudSyncMutationGuard`.

---

## 3. Reuse First

| Element | Reuse | Uwagi |
|---------|-------|-------|
| `cloudSyncMutationGuard.begin` / `end` | **100%** — ten sam moduł co `kw-jobs` | Tokeny per scope (#012 R12.5) |
| `withKwJobsWorkEntryMutation` | **Wzorzec** dla `withKwWeekEmployeesMutation` | Jedna linia różnicy: scope + default `suppressMs` |
| `isBlocked()` w `App.tsx` | **Już podłączone** — bez nowych hooków sync | Guard globalny + scope |
| `msUntilUnblocked()` | **Już używane** w `scheduleAutoCloudSync` | Po B3 obejmuje też roster token |
| `reset()` w `CloudLoader` | **Bez zmian** (#013) | Bootstrap recovery |
| `payrollRosterPushRef` | **Zachować** — nie duplikować nowym refem | Do usunięcia w przyszłości |
| `pushWeekEmployeesToCloud` | **Bez zmiany kontraktu** | R1 |
| B1 fail-loud `.catch` + toast | **Bez regresji** | R1 |

**Domyślne `suppressMs` dla `kw-week-employees`:** **6000** ms — parity z dzisiejszym `suppressAutoSyncUntilRef` na ścieżce roster (R1).

**Domyślne `suppressMs` dla `kw-jobs`:** **4500** ms — **bez zmian** (v2.63.16).

---

## 4. Zero Duplicate Logic

| Zagrożenie | Mitigacja w freeze |
|------------|-------------------|
| Nowy ref `payrollRosterPushRef2` / `weekEmployeesPushRef` | **Zakaz** (#003) |
| Osobna logika TTL poza guardem na R1/R2 | **Zakaz nowej** — `begin` ustawia `suppressUntil`; ref App **zachowany** tylko jako legacy layer do fazy 2b |
| Duplikat `begin`/`end` w wielu plikach | Helper `withKwWeekEmployeesMutation` / `withKwWeekEmployeesAsyncMutation` w **jednym** pliku lib |
| Guard przechowuje `WeekEmployee[]` | **Zakaz** (#011) |
| Zmiana merge przy okazji B3 | **Zakaz** — poza scope |
| Usunięcie ref „przy okazji” | **Zakaz w B3** — wymaga osobnego freeze + pełnej listy ścieżek |

**Docelowa architektura (po serii faza 2 → 2b):**

```text
Dziś (po B3):     ref + suppressRef + guard token  (3 warstwy — akceptowalne w B3)
Docelowo (2b):    guard token only                  (poza B3)
```

**Wzorzec helpera (freeze — bez duplikacji logiki guarda):**

```typescript
// cloud-sync-mutation-guard.ts — mirror withKwJobsWorkEntryMutation
export function withKwWeekEmployeesMutation<T>(fn: () => T): T {
  const token = begin("kw-week-employees", { suppressMs: KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS });
  try {
    return fn();
  } finally {
    end(token);
  }
}

/** Opcjonalnie — async push R1/R2; wewnętrznie tylko begin/end */
export async function withKwWeekEmployeesAsyncMutation(fn: () => Promise<void>): Promise<void> {
  const token = begin("kw-week-employees", { suppressMs: KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS });
  try {
    await fn();
  } finally {
    end(token);
  }
}
```

Implementacja **musi** delegować do istniejących `begin`/`end` — **zakaz** kopii liczników tokenów poza modułem guard.

---

## 5. Acceptance Criteria

### 5.1 Bundle B3 — Guard Phase 2

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **B3-AC1** | R1: `begin('kw-week-employees')` przed push · `end(token)` w `finally` po Promise | code review |
| **B3-AC2** | R2: ten sam wzorzec begin/end na async push | code review |
| **B3-AC3** | `payrollRosterPushRef` **nadal ustawiane** na R1/R2 — **nie usunięte** | code review |
| **B3-AC4** | `suppressAutoSyncUntilRef` na R1/R2 **nadal ustawiane** — **nie usunięte** | code review |
| **B3-AC5** | Podczas aktywnego tokena roster: `cloudSyncMutationGuard.isBlocked() === true` | `test-payroll-roster-guard-phase2.mjs` |
| **B3-AC6** | Po `end(token)`: guard odblokowany (brak wycieku tokena) | j.w. |
| **B3-AC7** | B1 fail-loud toast przy błędzie push — **bez regresji** | regresja + smoke manual S1 |
| **B3-AC8** | `withKwWeekEmployeesMutation` eksportowany z lib (sync path gotowy na przyszłe ścieżki) | code review |
| **B3-AC9** | Regresja T1–T7 roster merge — **PASS** | `test-payroll-add-from-directory-merge-p0.mjs` |
| **B3-AC10** | Regresja T11–T13 jobs guard — **PASS** | `test-cloud-sync-mutation-guard.mjs` · `test-payroll-work-entry-merge-fidelity.mjs` |
| **B3-AC11** | `mergeWeekEmployees` — **zero diff** poza ewentualnym importem | code review |
| **B3-AC12** | Edge / Supabase — **zero diff** | code review |

### 5.2 Smoke manualny (Vercel — po IMPLEMENT)

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| **S1** | Kadry → dodaj pracownika → LP | Widoczny · brak zniknięcia po ~10 s auto-sync |
| **S2** | S1 + druga karta / odświeżenie | Skład spójny |
| **S3** | Sync stawek z kartoteki (jeśli dostępny) | Brak nadpisania składu przez auto-sync w trakcie push |
| **S4** | Symulacja offline przy dodaniu (DevTools) | Toast fail-loud B1 · po powrocie online sync OK |

---

## 6. Plan testów

### 6.1 Nowy skrypt — `test-payroll-roster-guard-phase2.mjs`

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| **B3-T1** | `begin('kw-week-employees')` → `isBlocked()` true | PASS |
| **B3-T2** | `end(token)` → `isBlocked()` false (po wygaśnięciu suppress) | PASS |
| **B3-T3** | Dwa nakładające się tokeny roster — `end(tokenA)` nie odblokowuje przed `end(tokenB)` | PASS (#012) |
| **B3-T4** | `end(unknownToken)` → no-op, scope nadal blocked | PASS (#012 R12.1) |
| **B3-T5** | `reset()` po symulowanym wycieku → `isBlocked()` false | PASS (#013) |
| **B3-T6** | Scope `kw-week-employees` vs `kw-jobs` — niezależne liczniki | PASS (#012 R12.5) |
| **B3-T7** | `defaultSuppressMs('kw-week-employees')` === 6000 | PASS |

**Implementacja testu:** import / dynamiczny load `cloud-sync-mutation-guard.ts` — **bez** React, **bez** KV (wzorzec `test-cloud-sync-mutation-guard.mjs`).

### 6.2 Regresja obowiązkowa (gate release)

```bash
npx vite-node scripts/test-payroll-roster-guard-phase2.mjs
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
npx vite-node scripts/test-payroll-week-employee-merge-asymmetry.mjs
npx vite-node scripts/test-cloud-sync-mutation-guard.mjs
npx vite-node scripts/test-payroll-work-entry-merge-fidelity.mjs
npx vite-node scripts/test-payroll-guard-push-fail-loud-p0.mjs
npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs
```

**Gate:** wszystkie **PASS** przed commit release.

### 6.3 Poza scope testów B3

- E2E Playwright debounce auto-sync — backlog
- Testy Edge `batch-set` — bundle B6
- TEST-INFRA-001 harness — osobny epic

---

## 7. Bundle Release Plan

| Pole | Wartość |
|------|---------|
| **Wersja docelowa** | **2.63.18** (patch) |
| **Bundle** | **B3 only** — Guard Phase 2 roster |
| **Pliki kodu** | ≤ 3 (`cloud-sync-mutation-guard.ts`, `App.tsx`, nowy test) + changelog + ARCHITECTURE |
| **Deploy** | **Frontend only** — Vercel Git Integration |
| **Supabase** | **Nie** — zero zmian Edge |
| **RELEASE MODE** | **FAST RELEASE** |
| **Workflow** | IMPLEMENT → BUILD → TEST → commit (na polecenie) → push → VERIFY FAST `version.json` |
| **Commity** | Preferowany **jeden** commit izolowany B3 |
| **HOTFIX CLASSIFICATION** | **BUGFIX** + **REFACTOR** (sync coordination — bez zmiany UX copy poza changelog) |

### 7.1 Kolejność IMPLEMENT

1. `cloud-sync-mutation-guard.ts` — helpery + stała 6000 ms  
2. `App.tsx` — R1 `persistPayrollRoster`  
3. `App.tsx` — R2 `syncWeekRatesFromDirectory`  
4. `test-payroll-roster-guard-phase2.mjs`  
5. BUILD + regresja §6.2  
6. CHANGELOG + ARCHITECTURE §11  

### 7.2 Rollback

Revert commit B3 — przywraca wyłącznie warstwę guard token na roster; `payrollRosterPushRef` pozostaje funkcjonalny (brak regresji sync).

---

## 8. GO / NO GO

| Etap | Werdykt |
|------|---------|
| **AUDIT B3** | **GO** |
| **DESIGN FREEZE B3 (ten dokument)** | **FINAL** — czeka na **akceptację właściciela** |
| **IMPLEMENT** | **NO GO** do explicit polecenia po akceptacji freeze |
| **RELEASE** | **NO GO** do IMPLEMENT + BUILD + TEST PASS |

### 8.1 Warunki GO IMPLEMENT

- [ ] Właściciel repo akceptuje ten dokument  
- [ ] STABILIZATION WINDOW — hotfix payroll w dozwolonym zakresie  
- [ ] Brak równoległego IMPLEMENT B4/B5/B6 w tym samym commicie  

### 8.2 Backlog po B3 (osobne freeze)

| ID | Temat |
|----|--------|
| **B3.1** | `pushPayrollWeekAfterRollover` → guard roster |
| **B3.2** | Usunięcie `payrollRosterPushRef` po pełnej migracji ścieżek |
| **B4** | `applyBootstrapPayrollMerge` (RCA-3) |
| **B5** | Closed week UI (RCA-2) |
| **B6** | Edge Parity `directoryId` vs UUID |

---

## 9. Ryzyka (skrót)

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| RB3-1 | Trzy warstwy blokady (ref + suppressRef + guard) — złożoność | Niski | Tymczasowe w B3; cleanup w B3.2 |
| RB3-2 | Wyciek tokena przy throw przed `finally` | Średni | `finally` obowiązkowy; T13 + B3-T5 |
| RB3-3 | Regresja B1 fail-loud | Niski | B3-AC7 · gate regresji |
| RB3-4 | Global `suppressUntil` przedłuża sync jobs podczas roster push | Akceptowalne | Zgodne z dzisiejszym `suppressAutoSyncUntilRef`; scope jobs nadal przez osobne tokeny |

---

*SSOT bundle B3: ten plik · IMPLEMENT tylko na explicit polecenie właściciela repo.*
