# PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD — HOTFIX P0 · DESIGN FREEZE FINAL

> **Status:** **DESIGN FREEZE v1.3 FINAL** — **IMPLEMENT czeka na explicit polecenie**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.3 FINAL  
> **Baseline prod:** v2.63.15 (`1a65341`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt P0:** zatwierdzony · RCA: overwrite `jobs` przez `runCloudSync` / `pullFromCloudAndMerge` bez guarda mutacji `kw-jobs`  
> **Powiązane:** [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) · [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md)

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD (hotfix P0) |
| **Principles** | **#001–#013** — FINAL |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu `WorkEntry` / `Job`** | **Brak** — SSOT przydziału = `job.workEntries[]` w `kw-jobs` |
| **Nowy moduł** | `CloudSyncMutationGuard` (`src/lib/cloud-sync-mutation-guard.ts`) — **wyłącznie koordynacja sync** |
| **Zakaz** | `jobsAssignmentPushRef` i inne modułowe refy sync — **#003** |
| **Zakres** | Guard mutacji `kw-jobs`, wrapper przydziałów LP, testy T11–T13, faza 1 hotfix |
| **Poza zakresem P0** | Pełna migracja `payrollRosterPushRef` → guard (faza 2), refactor `moveWorkEntryToJob`, zmiana `mergeWeekEmployees` (2.63.15) |

---

## 1. Principles #001–#013 (wiążące — FINAL)

### #001 — SSOT przydziału = `job.workEntries[]`

Przydziały robót (Lista Płac → Przydziały, Roboty → Pracownicy) zapisują wyłącznie do **`kw-jobs`** / `job.workEntries[]`. **Bez** nowego klucza KV i bez duplikacji w `WeekEmployee`.

### #002 — Zachować merge union + tombstone

**Nie zmieniać** semantyki `mergeWorkEntriesById` / `mergeJobsById` (fix 2.62.22 / 2.62.34): union po `id`, tombstone blokuje restore ze stale cloud, `updatedAt` LWW per job.

### #003 — Zakaz modułowych refów sync

**Zabronione:** dedykowane refy typu `jobsAssignmentPushRef`, `payrollAssignmentPushRef` itd.

**Dozwolone:** jeden **`CloudSyncMutationGuard`** jako SSOT decyzji „czy wolno auto pull-merge-push”.

### #004 — Scope `kw-jobs` przy mutacji `workEntries`

Każda mutacja `workEntries` (add / move / hours / remove) w ścieżkach przydziałów **musi** przejść przez guard:

- `guard.begin('kw-jobs', { suppressMs: ≥ 4500 })` → mutacja → `guard.end(token)` w `finally`.

Dotyczy minimum: `PayrollJobAssignmentsPanel` → `onSetJobs`. Rozszerzenie na `JobsView` — **P0.1** (rekomendowane w tym samym release jeśli ten sam `setJobs`).

### #005 — Jedno miejsce sprawdzenia blokady

`runCloudSync`, `pullFromCloudAndMerge`, `scheduleAutoCloudSync` — sprawdzają **`cloudSyncMutationGuard.isBlocked()`** (oraz istniejące warunki do czasu fazy 2).

Faza 1: guard **dodany równolegle** do `suppressAutoSyncUntilRef` / `payrollRosterPushRef` — **bez usuwania** działających guardów LP (2.63.15).

### #006 — Scope `kw-week-employees` (faza 2)

`payrollRosterPushRef` → `guard.inFlight('kw-week-employees')` w osobnym sprincie stabilizacji. **Do migracji:** `payrollRosterPushRef` **pozostaje** zachowany 1:1 w P0.

### #007 — `prepareDataBundleForCloudPush` bez regresji

Przed pull-merge-push bundle **musi** brać świeższy stan `kw-jobs` z LS, gdy React snapshot jest starszy w oknie guard. Mechanizm już istnieje — **utrzymać**, nie duplikować.

### #008 — Payroll Guard ≠ Mutation Guard

`applyPayrollGuardBeforePush` (>50% shrink godzin) i `skipPayrollGuard` — **bez zmian** w tym hotfixie. Guard mutacji **nie zastępuje** Payroll Guard.

### #009 — Testy regresji obowiązkowe (gate release)

| ID | Temat | Plik |
|----|-------|------|
| **T11** | `moveWorkEntryToJob` + `mergeJobsById` ze stale cloud | `test-payroll-work-entry-merge-fidelity.mjs` |
| **T12** | Race debounce: V1→V2 local + stale React + stale cloud → wynik = V2 | j.w. (+ opcjonalnie unit guard tokenów) |
| **T13** | Recovery: wyciek tokena → `reset()` → `isBlocked() === false` | `test-cloud-sync-mutation-guard.mjs` (lub sekcja guard w T12) |
| T1–T10 | Istniejące merge fidelity | j.w. — **muszą PASS** |
| T1–T7 | Payroll roster (2.63.15) | `test-payroll-add-from-directory-merge-p0.mjs` — **muszą PASS** |

### #010 — Poza zakresem P0

- Refactor `moveWorkEntryToJob` (in-place `jobId` zamiast nowego UUID),
- Zmiana `mergeWeekEmployees` / skład LP,
- Migracja wszystkich `commit*` pod guard (faza 2),
- E2E Playwright debounce 2 s (backlog smoke).

### #011 — Guard bez stanu biznesowego (NOWE — architekt v1.2)

**`CloudSyncMutationGuard` nie przechowuje żadnego stanu biznesowego.**

| Dozwolone w guardzie | Zabronione w guardzie |
|----------------------|------------------------|
| Liczniki tokenów per scope | `Job[]`, `WeekEmployee[]`, `workEntries` |
| `suppressUntil` (timestamp) | Snapshoty danych do merge |
| Metadane scope (`DataKey`, TTL) | Logika `mergeJobsById` / `moveWorkEntryToJob` |
| `isBlocked()` / `extendSuppress(ms)` | Decyzje „który wpis wygrał” w domenie |

**Jedyna odpowiedzialność:** koordynacja **kiedy** wolno wykonać auto-sync (pull / merge / push / schedule), nie **co** jest prawdą biznesową.

Prawda biznesowa pozostaje w: React state + LS (`useLocalStorage`) + `cloud-sync.ts` merge — zgodnie z ARCHITECTURE §11.

### #012 — Token begin/end, odporność na równoległe mutacje (NOWE — architekt v1.2)

**`guard.begin(scope)` zwraca `token` (niepusty identyfikator operacji).**

**`guard.end(token)` zwalnia dokładnie tę operację, która rozpoczęła blokadę** — nie „ostatnią” ani „globalną” bez identyfikatora.

Mechanizm **musi** być odporny na równoległe mutacje:

```text
Operacja A: tokenA = begin('kw-jobs')     // inFlight['kw-jobs'] = 1
Operacja B: tokenB = begin('kw-jobs')     // inFlight['kw-jobs'] = 2
end(tokenA)                               // inFlight = 1 → nadal blocked
end(tokenB)                               // inFlight = 0 → unblock (jeśli suppress wygasł)
```

**Wymagania implementacyjne (freeze):**

| Reguła | Opis |
|--------|------|
| **R12.1** | `end(unknownToken)` → no-op (dev warn opcjonalny), **nie** zeruje całego scope |
| **R12.2** | `end(token)` idempotentny dla tego samego tokena (drugi call = no-op) |
| **R12.3** | `isBlocked(scope?)` = true gdy **jakikolwiek** aktywny token w scope **lub** global `suppressUntil > now` |
| **R12.4** | `suppressUntil` = `max(istniejący, now + suppressMs)` — równoległe `begin` **przedłużają** okno, nie skracają |
| **R12.5** | Różne scope (`kw-jobs` vs `kw-week-employees`) — **niezależne** liczniki tokenów |
| **R12.6** | `begin` / `end` w `try/finally` na ścieżce mutacji — wyciek tokena = bug P0 |

**API freeze (minimalne):**

```typescript
type CloudSyncScope = 'kw-jobs' | 'kw-week-employees' | 'kw-directory' | 'full-bundle' | string;

type MutationToken = string & { readonly __brand: 'CloudSyncMutationToken' };

interface BeginOptions {
  suppressMs?: number;  // default 4500 dla kw-jobs
}

begin(scope: CloudSyncScope, opts?: BeginOptions): MutationToken;
end(token: MutationToken): void;
isBlocked(scope?: CloudSyncScope): boolean;
extendSuppress(ms: number): void;  // opcjonalnie — dla istniejących commit* w fazie 2
reset(): void;  // #013 — wyłącznie bootstrap / restart / recovery
```

### #013 — Recovery: awaryjny reset tokenów (NOWE — architekt v1.3)

**`CloudSyncMutationGuard` musi posiadać mechanizm awaryjnego resetu aktywnych tokenów** — `reset()` (alias dopuszczalny: `clearAll()`).

| Aspekt | Freeze |
|--------|--------|
| **Cel** | Wyeliminować ryzyko **trwałego** zablokowania synchronizacji po nieobsłużonym wyjątku (wyciek tokena mimo braku `finally`) |
| **Zakres resetu** | Zeruje **wszystkie** aktywne tokeny we **wszystkich** scope; zeruje `suppressUntil` guarda (stan koordynacji sync → neutralny) |
| **Nie robi** | Merge danych, odczyt/zapis LS/KV, modyfikacja React state, rollback mutacji biznesowych |
| **Dozwolone wywołania** | **Wyłącznie:** pełny restart aplikacji (init modułu), zakończenie bootstrapu chmury (`CloudLoader`), odzyskanie sesji po błędzie krytycznym sync |
| **Zabronione wywołania** | W trakcie normalnej edycji UI, w `setJobs`, w `runCloudSync`, jako „skrót” zamiast `end(token)`, w pętli retry bez warunku recovery |

**Punkty podłączenia IMPLEMENT (freeze):**

| Moment | Plik | Uzasadnienie |
|--------|------|--------------|
| Sukces bootstrapu chmury | `CloudLoader.tsx` (po `markCloudBootstrapSuccess`) | Czysty guard po merge bootstrap — brak dziedziczenia tokenów z poprzedniej sesji / HMR |
| Init guard (singleton) | `cloud-sync-mutation-guard.ts` | Stan początkowy = pusty (równoważne `reset()` przy pierwszym imporcie) |
| Recovery sync (opcjonalnie P0) | `App.tsx` — **tylko** ścieżka jawnego recovery po błędzie krytycznym pull/push | Odblokowanie sync gdy `isBlocked()` utknął mimo brak aktywnej mutacji UI |

**Zgodność z #011:** `reset()` czyści **wyłącznie** metadane koordynacji (tokeny + `suppressUntil`), **nie** stan biznesowy.

**Zgodność z #012:** `reset()` nie zastępuje `end(token)` w happy path — to **sieć bezpieczeństwa**, nie normalny cykl życia operacji.

---

## 2. Analiza wpływu #011, #012, #013 oraz T13

### 2.1 Wpływ #011 — brak stanu biznesowego

### 2.1 Wpływ #011 — brak stanu biznesowego

| Obszar | Wpływ | Ocena |
|--------|-------|-------|
| **Separacja warstw** | Guard nie może „naprawiać” merge ani trzymać kopii `jobs` | **Pozytywny** — mniejsze ryzyko drugiego SSOT |
| **Testowalność** | Unit testy guard = tylko tokeny + timestampy | **Pozytywny** — T12+ guard unit bez fixture LP |
| **Rozmiar modułu** | ~80–120 linii, zero importów z `app-domain` / `payroll-job-assignments` | **Pozytywny** — brak cykli ARCH-001 |
| **Debugowanie** | Przyczyna revertu nadal w merge/sync path, nie w guard | **Neutralny** — guard tylko opóźnia zły merge |
| **Antywzorzec** | Niemożliwe `guard.setJobsSnapshot(...)` | **Eliminuje** klasę bugów „guard wie lepiej niż merge” |

**Konsekwencja dla IMPLEMENT:** wrapper `withJobsMutation(fn)` wywołuje `setJobs` **wewnątrz** `fn` — guard **nie** opakowuje wyniku merge; wyłącznie blokuje sync w oknie mutacji.

### 2.2 Wpływ #012 — tokeny i równoległość

| Scenariusz | Bez tokenów (boolean ref) | Z tokenami (#012) |
|------------|---------------------------|-------------------|
| Dwa szybkie `handleJobChange` | `end` pierwszej operacji **przedwcześnie** odblokowuje drugą | **PASS** — licznik do zera dopiero po `end(tokenB)` |
| `moveWorkEntry` + równoległy `addRow` | Race na jednym `pushRef=true` | **PASS** — dwa tokeny, jeden scope |
| Błąd w `setJobs` (throw) | Wyciek `ref=true` na stałe | **Mitigacja** — `finally { end(token) }` |
| Różne scope: roster push + jobs edit | Jeden globalny ref blokowałby za dużo/za mało | **PASS** — scope niezależne (#012 R12.5) |

**Konsekwencja dla IMPLEMENT:**

- Zastąpienie wzorca `payrollRosterPushRef = true/false` w fazie 2 **wymaga** tokenów — boolean nie spełnia #012 przy nakładających się push.
- Faza 1 P0: tokeny **obowiązkowe** od pierwszego dnia dla `kw-jobs` — unika drugiej migracji API.

**Ryzyko reszidualne:** `suppressUntil` globalny — równoległe scope mogą wzajemnie przedłużać okno suppress (#012 R12.4). **Akceptowalne** — zgodne z dzisiejszym `suppressAutoSyncUntilRef`; **mitigowane** przez `reset()` przy bootstrap (#013).

### 2.3 Wpływ #013 — recovery

| Obszar | Wpływ | Ocena |
|--------|-------|-------|
| **Wyciek tokena po throw** | Bez reset: `isBlocked()` = true **na stałe** do F5 | **#013 eliminuje** klasę P0 „sync martwy” |
| **HMR / dev** | Singleton modułu może zachować tokeny między reloadami częściowymi | **Pozytywny** — reset przy bootstrap |
| **Bezpieczeństwo danych** | Reset **nie** cofa lokalnych mutacji ani nie pushuje chmury | **Zgodne z #011** — zero ingerencji w merge |
| **Race przy bootstrap** | `reset()` po merge CloudLoader = guard pusty, dane już w LS/React | **Neutralny** — sync może wznowić normalnie |
| **Nadużycie `reset()`** | Wywołanie w trakcie edycji → przedwczesny sync | **Ryzyko** — freeze **zabrania** poza 3 punktami (#013) |

**Konsekwencja dla IMPLEMENT:** `reset()` **nie** wywołuje `runCloudSync` — tylko odblokowuje możliwość sync; harmonogram pozostaje w `App.tsx` (`scheduleAutoCloudSync`, focus pull).

**Relacja z `suppressAutoSyncUntilRef` (App):** ref w `App.tsx` **pozostaje niezależny** w fazie 1; `reset()` guarda **nie** zeruje `suppressAutoSyncUntilRef`. Po `reset()` guard `isBlocked()` może być false, ale App nadal może deferować sync przez własny suppress — **akceptowalne** (defense in depth). T13 testuje **wyłącznie** guard.

### 2.4 Wpływ T13 — recovery test

| Aspekt | Wpływ |
|--------|-------|
| **Gate release** | T13 **obowiązkowy** obok T11–T12 (#009 rozszerzone) |
| **Zakres testu** | Unit guard — **bez** React, **bez** merge, **bez** KV |
| **Wykonalność** | **TAK** — ~25–40 linii w dedykowanym skrypcie |
| **Regresja** | Wykrywa brak `reset()` lub błędną implementację `isBlocked` po wycieku |

---

## 3. Zgodność z SSOT · Reuse First · Zero Duplicate Logic

### 3.1 SSOT (Single Source of Truth)

| Warstwa | SSOT | Zgodność #011–#012 |
|---------|------|---------------------|
| Przydziały | `job.workEntries[]` w `kw-jobs` | **TAK** — guard nie tworzy drugiego magazynu (#001, #011) |
| Godziny LP | `emp.days` w `kw-week-employees` | **TAK** — poza zakresem; guard nie dotyka |
| Merge | `cloud-sync.ts` | **TAK** — #002 zachowuje istniejący merge |
| Sync orchestration | `App.tsx` + guard **tylko** „kiedy sync” | **TAK** — #011, #013 |
| Recovery | Bootstrap / init — **nie** dotyka danych | **TAK** — #013 |

**Werdykt SSOT:** **PASS** — guard jest warstwą orchestracji, nie domeną; `reset()` nie zmienia SSOT danych.

### 3.2 Reuse First

| Element | Reuse | Uwagi |
|---------|-------|-------|
| `suppressAutoSyncUntilRef` (4500 ms) | **Reuse** wzorca TTL | Guard **konsoliduje** w fazie 2; faza 1 — współistnienie (#005) |
| `payrollRosterPushRef` | **Reuse** semantyki in-flight | Faza 2: ten sam scope `kw-week-employees`, inne API (#006) |
| `prepareDataBundleForCloudPush` | **Reuse** bez zmian | #007 |
| `moveWorkEntryToJob`, `mergeJobsById` | **Reuse** | #002, #010 — bez refactoru |
| `setJobs` / `useLocalStorage` | **Reuse** | Wrapper `withJobsMutation`, nie nowy hook storage |
| `PayrollJobAssignmentsPanel` | **Reuse** UI P1 | Tylko opakowanie `onSetJobs` |
| `markCloudBootstrapSuccess` / `CloudLoader` | **Reuse** hooka bootstrap | `reset()` guard po sukcesie bootstrap (#013) |
| `suppressAutoSyncUntilRef` | **Reuse** równoległy | Nie zastępowany przez `reset()` guarda w P0 |

**Werdykt Reuse First:** **PASS** — jeden moduł infrastrukturalny; recovery podpięty pod istniejący bootstrap.

### 3.3 Zero Duplicate Logic

| Zagrożenie | Mitigacja w freeze |
|------------|-------------------|
| Drugi algorytm merge przydziałów | **Zakaz** — #002 |
| Duplikat `suppress += 4500` w każdym panelu | Guard `begin(suppressMs)` — **jeden** mechanizm TTL (#012 R12.4) |
| Osobna logika „czy sync” w LP vs Roboty | **Jeden** `isBlocked()` w 3 punktach App (#005) |
| Guard trzyma kopię jobs do porównania | **Zakaz** — #011 |
| Tokeny per moduł (różne implementacje) | **Jeden** `CloudSyncMutationGuard` — #003, #012 |
| Osobny „recovery sync” w domenie | **Zakaz** — tylko `reset()` w guard (#013) |

**Werdykt Zero Duplicate Logic:** **PASS** — freeze explicite zabrania modułowych refów, stanu biznesowego w guardzie i `reset()` poza bootstrap/recovery.

---

## 4. Architektura `CloudSyncMutationGuard` (faza 1)

```text
┌──────────────────────────────────────────────────────────────────┐
│  PayrollJobAssignmentsPanel / JobsView                            │
│  withJobsMutation(() => setJobs(next))                           │
│    begin('kw-jobs') → token                                      │
│    … mutacja workEntries …                                       │
│    end(token) w finally                                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ brak stanu biznesowego (#011)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  CloudSyncMutationGuard (lib)                                    │
│  tokens: Map<scope, Set<tokenId>>                                │
│  suppressUntil: number                                           │
│  reset() → tokens=∅, suppressUntil=0 (#013)                      │
│  isBlocked() → tokens非空 ∨ now < suppressUntil                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  runCloudSync      pullFromCloudAndMerge   scheduleAutoCloudSync
  if isBlocked() → defer / return

CloudLoader (po markCloudBootstrapSuccess) → reset() guard (#013)
```

**Faza 2 (osobny sprint):** `persistPayrollRoster` → `begin('kw-week-employees')` zamiast `payrollRosterPushRef`; opcjonalnie `commit*` → `extendSuppress`.

---

## 5. Cloud Sync — mapa guardów po IMPLEMENT (faza 1)

| Mechanizm | P0 faza 1 | Faza 2 |
|-----------|-----------|--------|
| `CloudSyncMutationGuard` (`kw-jobs`) | **NOWY** | rozszerzenie scope |
| `guard.reset()` (#013) | **NOWY** — CloudLoader bootstrap | opcjonalnie recovery sync |
| `suppressAutoSyncUntilRef` | **Zachować** | konsolidacja w guard |
| `payrollRosterPushRef` | **Zachować** | → `guard` scope LP |
| `mergeWorkEntriesById` | **Bez zmian** | — |
| Payroll Guard (shrink) | **Bez zmian** | — |
| `prepareDataBundleForCloudPush` | **Bez zmian** | — |

---

## 6. Zakazy (freeze)

- `jobsAssignmentPushRef` lub jakikolwiek nowy modułowy ref sync (**#003**)
- Przechowywanie `jobs` / `workEntries` / `weekEmployees` w guardzie (**#011**)
- `end()` bez tokena lub `end()` zerujące cały scope (**#012**)
- `reset()` / `clearAll()` poza bootstrap / restart / jawny recovery sync (**#013**)
- `reset()` jako zamiennik `end(token)` w happy path (**#013**)
- Zmiana semantyki merge / `moveWorkEntryToJob` w P0 (**#002**, #010)
- Usunięcie `payrollRosterPushRef` przed migracją 1:1 (**#006**)
- Migracja prod KV

---

## 7. Pliki objęte IMPLEMENT (plan)

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync-mutation-guard.ts` | **NOWY** — API #011–#013 |
| `scripts/test-cloud-sync-mutation-guard.mjs` | T12-guard (tokeny) + **T13** (recovery) |
| `src/app/CloudLoader.tsx` | `reset()` po `markCloudBootstrapSuccess` (#013) |
| `src/app/App.tsx` | `isBlocked()` w sync paths; `withJobsMutation` / wrap `setJobs` dla przydziałów |
| `src/app/PayrollView.tsx` lub panel | przekazanie wrapped `onSetJobs` (minimalny diff) |
| `scripts/test-payroll-work-entry-merge-fidelity.mjs` | **T11**, **T12** |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §11 | sekcja Mutation Guard |

**Opcjonalnie P0.1:** ten sam wrapper na `JobsView` `setJobs` (ten sam race).

---

## 8. Testy regresji (FINAL)

### T11 — `moveWorkEntryToJob` + stale cloud merge

**Setup:** Job A (wpis `e1` dla `dir-X`), Job B pusty. Local: `addWorkEntry` → `moveWorkEntryToJob(e1, A→B)`. Cloud stale: stan sprzed move ( `e1` na A).

**PASS:** Po `mergeJobsById(local, staleCloud)` — `e1` na B, tombstone na A blokuje restore ze stale; `directoryId` zachowany.

### T12 — debounce / race (logika, bez React)

**Setup:**

1. V0 = cloud baseline  
2. V1 = local po `addRow` (wpis na `assignmentJobs[0]`)  
3. V2 = local po `moveWorkEntryToJob` (ten sam wpis, nowy UUID, inna robota)  
4. `prepareDataBundleForCloudPush([staleReactV1], LS=V2)` + `mergeJobsById` ze stale cloud V0  

**PASS:** wynik = V2 (przydział na docelowej robocie).

**T12-guard (unit):** dwa `begin('kw-jobs')` → `isBlocked`; `end(token1)` → nadal blocked; `end(token2)` → unblock (przy wygasłym suppress).

### T13 — Recovery po przerwanym cyklu (unit, **obowiązkowy**)

**Scenariusz (kolejność ściśle):**

1. `tokenA = begin('kw-jobs')` — scopeA  
2. `tokenB = begin('kw-week-employees')` — scopeB (różny scope — #012 R12.5)  
3. `end(tokenA)` — scopeA zwolniony  
4. **Symulacja przerwania:** `tokenB` **nie** dostaje `end()` (throw / przerwany cykl)  
5. Asercja pośrednia: `isBlocked() === true` (wyciek `tokenB` lub aktywny `suppressUntil`)  
6. `reset()`  
7. **PASS:** `isBlocked() === false`  
8. **PASS (semantyczna):** kolejne `begin` + `end` działa; guard akceptuje nowy cykl sync (brak „zombie” tokenów)

**FAIL:** `isBlocked()` true po `reset()`; `end(tokenB)` po `reset()` nie powoduje underflow; drugi `begin` nie widzi starych tokenów.

**Uwaga:** T13 **nie** testuje `runCloudSync` — tylko guard. Integracja sync = smoke manualny S1–S5.

### Smoke regresji (gate)

```bash
npx vite-node scripts/test-cloud-sync-mutation-guard.mjs
npx vite-node scripts/test-payroll-work-entry-merge-fidelity.mjs
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
npx vite-node scripts/test-payroll-job-assignments-p1.mjs
```

### Smoke manualny (Vercel)

| ID | Kroki |
|----|-------|
| S1 | LP → Przydziały → wybierz robota w dropdown (1. raz) → zostaje |
| S2 | ≥5 s → nadal poprawna robota |
| S3 | Ctrl+F5 → przydział zachowany |
| S4 | Zmiana A→B→C bez „cofania” na 2. klik |
| S5 | Dwie karty: edycja przydziałów → obie spójne po sync |

---

## 9. Ocena ryzyka regresji (v1.3)

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| Wyciek tokena | Średnie → **Niskie** z #013 | `finally { end(token) }` + **T13** |
| `#013` — `reset()` w złym miejscu | Średnie | Freeze: tylko CloudLoader bootstrap + init; zakaz w `setJobs` |
| `#013` — sync za wcześnie po bootstrap | Niskie | `suppressAutoSyncUntilRef` App + `initialAutoSyncSuppressUntil` nadal aktywne |
| `#011` — przypadkowy stan w guard | Niskie | Code review: zero importów domenowych |
| `#012` — przedwczesny unblock | Niskie | Tokeny obowiązkowe; T12-guard |
| Zbyt długi suppress (guard) | Niskie | `reset()` przy bootstrap; TTL 4500 ms |
| Regresja merge 2.62.22 | Niskie | T1–T11 PASS |
| Regresja LP 2.63.15 | Niskie | Nie dotykać `mergeWeekEmployees`; T1–T7 |
| Pełna migracja refów (faza 2) | Wyższe | Osobny sprint po stabilizacji P0 |

**Ogólna ocena IMPLEMENT (faza 1 + #011–#013):** **GO** po akceptacji v1.3 FINAL i PASS **T11 + T12 + T13**.

---

## 10. Historia wersji dokumentu

| Wersja | Data | Zmiana |
|--------|------|--------|
| v1.0 | 2026-07-01 | RCA + propozycja `jobsAssignmentPushRef` |
| v1.1 | 2026-07-01 | `CloudSyncMutationGuard`, #001–#010, odrzucenie modułowego ref |
| v1.2 FINAL | 2026-07-01 | **#011** brak stanu biznesowego · **#012** token begin/end |
| **v1.3 FINAL** | 2026-07-01 | **#013** recovery `reset()` · **T13** recovery test · wpływ na architekturę i ryzyko |

---

## 11. Werdykt audytu review (v1.3)

| Kryterium | Status |
|-----------|--------|
| Root Cause | **PASS** |
| CloudSyncMutationGuard | **PASS** |
| DESIGN FREEZE #001–#013 | **PASS FINAL** |
| T11 + T12 + T13 (gate) | **PASS FINAL** (spec freeze) |
| SSOT | **PASS** |
| Reuse First | **PASS** |
| Zero Duplicate Logic | **PASS** |
| IMPLEMENT | **Czeka na explicit polecenie** |

---

*SSOT hotfixu przydziałów: ten plik · IMPLEMENT tylko na explicit polecenie właściciela repo.*
