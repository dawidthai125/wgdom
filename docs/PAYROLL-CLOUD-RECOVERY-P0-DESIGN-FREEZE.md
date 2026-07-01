# PAYROLL-CLOUD-RECOVERY — HOTFIX P0 · DESIGN FREEZE FINAL

> **Status:** **IMPLEMENT COMPLETE** (v2.63.15) — commit/push **czeka na polecenie** właściciela repo  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.1 FINAL  
> **Baseline prod:** v2.63.12+ · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt P0:** zatwierdzony · RCA: `mergeWeekEmployees()` błędnie interpretuje lokalne dodanie jako zdalne usunięcie

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-CLOUD-RECOVERY (hotfix P0) |
| **Principles** | **#001–#010** — FINAL |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu `WeekEmployee`** | **Brak nowych pól** — `directoryId` **obowiązkowy** dla nowych rekordów (#010) |
| **Zakres** | `mergeWeekEmployees`, `addFromDirectory`, ochrona `runCloudSync`, testy T1–T7 |
| **Poza zakresem** | RCA-2 (closed week UI), RCA-3 (`applyBootstrapPayrollMerge`), pełny epic P0.2–P0.4 |

---

## 1. Principles #001–#010 (wiążące — FINAL)

### #001 — Tożsamość składu = `directoryId`

SSOT tożsamości osoby w składzie tygodnia: **`weekEmployeeMergeKey` → `dir:{directoryId}`** gdy `directoryId` jest ustawione.

UUID `WeekEmployee.id` pozostaje identyfikatorem **rekordu** (edycja wiersza, defer, export), ale **nie decyduje o składzie** przy merge.

Fallback bez `directoryId` (legacy): `name:{normalizedName}` → `id:{uuid}` — **wyłącznie** rekordy historyczne (#010).

### #002 — Lokalne dodanie nie może zginąć w merge

Operacja użytkownika „dodaj z kartyoteki” = **lokalne rozszerzenie składu** po `directoryId`.

Merge **musi** zwrócić unię osób (local ∪ cloud) po `weekEmployeeMergeKey`, z `mergeWeekEmployeeRecord` per para.

Gałąź „cloud ⊂ local po UUID + mniej rekordów” **nie może** obcinać lokalnych osób z **nowym** `directoryId` względem chmury.

### #003 — Zdalne usunięcie nadal respektowane

Usunięcie na urządzeniu B = brak `weekEmployeeMergeKey` w wyniku po stronie, która wykonała usunięcie.

**Rozróżnienie dodanie vs usunięcie:** po **`directoryId` / `weekEmployeeMergeKey`**, nie po samym zbiorze UUID.

### #004 — Deduplikacja w `addFromDirectory`

Przed `weekEmployeeFromDir`: **nie dodawać**, jeśli `directoryId` już jest w bieżącym `weekEmployees`.

Ponowne dodanie = **no-op** (brak push gdy `toAdd.length === 0`).

### #005 — `runCloudSync` nie nadpisuje świeżego składu

Podczas `payrollRosterPushRef === true` → **skip** pull-merge-push wpływający na świeży skład.

W oknie `suppressAutoSyncUntilRef` po `persistPayrollRoster` → **nie** stosować merge składu ze starszą chmurą.

Defense in depth: po poprawce merge (#009) orchestration nie powinna być jedyną barierą.

### #006 — Push składu pozostaje jawny

`persistPayrollRoster` → `pushWeekEmployeesToCloud(..., { skipPayrollGuard: true })` — **bez zmiany** kontraktu.

Fail-loud przy błędzie push — **P1 backlog**, nie blokuje hotfixu P0.

### #007 — Payroll Guard bez regresji

Guard (>50% shrink godzin) **nie dotyczy** świadomego dodania osoby (bez godzin).

`skipPayrollGuard` w `persistPayrollRoster` — **zachować**.

Nowy merge **nie może** zmniejszać liczby unikalnych `directoryId` bez jawnego usunięcia użytkownika.

### #008 — Brak migracji KV danych

Hotfix = **logika merge/sync** — **zero** batch-set / migracji prod `kw-week-employees`.

Legacy bez `directoryId` — merge po name/id jak dotąd (#010).

### #009 — Merge vs starszy snapshot chmury (NOWE — architekt)

**Merge nie może usuwać lokalnych rekordów wyłącznie dlatego, że nie istnieją jeszcze w starszym snapshotcie chmury.**

Domyślna strategia dla lokalnego dodania: **UNION po `weekEmployeeMergeKey`**.

Starszy snapshot KV (mniej osób, brak nowych kluczy `dir:{directoryId}`) **nie jest** sygnałem usunięcia — jest sygnałem **opóźnienia replikacji** lub **równoległej edycji** na innym urządzeniu.

Gałąź UUID-subset (obecna L1238–1251 w `mergeWeekEmployees`) **musi zostać usunięta** lub zastąpiona union-by-key zgodnie z #009.

### #010 — `directoryId` obowiązkowy dla nowych rekordów (NOWE — architekt)

Dla **wszystkich nowo tworzonych** rekordów `WeekEmployee` wymagany jest **`directoryId`**.

Ścieżki objęte:
- `weekEmployeeFromDir` (dodanie z kartyoteki),
- `replaceWeekWithAllActive`,
- `copyFromLastWeek` / picker,
- każda przyszła ścieżka tworzenia składu.

**Fallback** (`name` → `weekEmployeeMergeKey`, potem `id` / UUID) pozostaje **wyłącznie** dla rekordów **legacy** zachowanych dla kompatybilności wstecznej — **nie** dla nowych wpisów produkcyjnych.

Walidacja dev/test: nowy rekord bez `directoryId` poza ścieżką legacy = **błąd implementacji** (assert w testach T5, T7).

---

## 2. Algorytm merge (docelowy)

```
mergeWeekEmployees(local, cloud):

1. local puste → collapse(cloud)

2. Mapy localByKey, cloudByKey po weekEmployeeMergeKey

3. Union kluczy

4. Per klucz: oba → mergeWeekEmployeeRecord; tylko local → local; tylko cloud → cloud

5. collapseWeekEmployeesByIdentity(wynik)
```

Zgodne z **#002**, **#009**, **#010**.

---

## 3. SSOT tożsamości

| Warstwa | SSOT |
|---------|------|
| Kartoteka | `DirectoryEmployee.id` → `kw-directory` |
| Osoba w tygodniu LP | `WeekEmployee.directoryId` → `dir:{id}` |
| Rekord wiersza (UI) | `WeekEmployee.id` (UUID) |
| Skład tygodnia | `kw-week-employees[]` unikalne po `directoryId` |
| Merge / sync | UNION po `weekEmployeeMergeKey` (#009) |

---

## 4. Cloud Sync (freeze)

| Guard | Działanie |
|-------|-----------|
| `payrollRosterPushRef` | `runCloudSync` skip (jak `pullFromCloudAndMerge`) |
| `suppressAutoSyncUntilRef` | defer merge składu po `persistPayrollRoster` |
| Merge #009 | starszy cloud **nie obcina** lokalnych dodatków |

---

## 5. Zakazy (freeze)

- Migracja prod KV / batch-set składu  
- Zmiana schematu `WeekEmployee` (nowe pola)  
- Zmiana progów Payroll Guard w tym release  
- `applyBootstrapPayrollMerge` (RCA-3) — osobny ticket  
- Closed-week UI (RCA-2) — osobny ticket  
- Tworzenie nowych `WeekEmployee` **bez** `directoryId` (#010)

---

## 6. Pliki objęte IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync.ts` | `mergeWeekEmployees` — UNION (#009) |
| `src/app/App.tsx` | `addFromDirectory` dedup (#004); `runCloudSync` guard (#005) |
| `src/app/app-domain.ts` | `weekEmployeeFromDir` — enforce `directoryId` (#010) |
| `scripts/test-payroll-add-from-directory-merge-p0.mjs` | T1–T7 |
| `scripts/test-payroll-week-employee-merge-asymmetry.mjs` | T6 |

---

## 7. Testy regresji (FINAL)

### `test-payroll-add-from-directory-merge-p0.mjs`

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| **T1** | local N+1 (nowy UUID + `directoryId`), cloud N (stare UUID) | **N+1** unikalnych `directoryId` |
| **T2** | `computeMergedDataBundle` ze stale cloud po lokalnym dodaniu | nowa osoba **zostaje** |
| **T3** | Zdalne usunięcie: brak `dir-X` local i cloud | `dir-X` **nie wraca** |
| **T4** | Ten sam `directoryId`, różne UUID local vs cloud | 1 rekord, `mergeWeekEmployeeRecord` |
| **T5** | `addFromDirectory`: ten sam `directoryId` 2× | **0** nowych; każdy nowy rekord ma `directoryId` |
| **T6** | (w asymmetry) local +1 `directoryId` vs pełny cloud | union, nie subset |
| **T7** | **Sync dwóch urządzeń** (poniżej) | **X + Y**, bez utraty |

### T7 — Synchronizacja dwóch urządzeń (NOWE — architekt)

**Urządzenie A:**
- skład początkowy wspólny (np. N osób),
- dodaje pracownika **X** (`directoryId: dir-X`, nowy UUID).

**Urządzenie B:**
- ten sam skład początkowy (stary snapshot chmury),
- dodaje pracownika **Y** (`directoryId: dir-Y`, nowy UUID).

**Chmura przed merge:** snapshot **bez** X i Y (lub tylko stan początkowy N).

**Merge symulowany:**
1. `mergeWeekEmployees(localA, cloudStale)` → zawiera **X** (+ ewentualnie Y jeśli B już pushnął),
2. `mergeWeekEmployees(localB, wynikA)` lub `mergeWeekEmployees(merge(A,cloud), merge(B,cloud))` — wariant **concurrent edit**,
3. wynik końcowy po dwóch krokach merge (symulacja pull sync obu kart).

**PASS:** wynik zawiera **X i Y** (oba `directoryId`), łącznie **N+2** unikalnych kluczy `dir:*`, **bez utraty** żadnego z rekordów dodanych lokalnie.

**FAIL:** brak X lub Y wyłącznie dlatego, że nie było ich w starszym snapshotcie chmury (#009).

### Smoke regresji (istniejące — uruchomić)

```bash
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
npx vite-node scripts/test-payroll-week-employee-merge-asymmetry.mjs
npx vite-node scripts/test-payroll-refresh-team-race-p0.mjs
npx vite-node scripts/post-smoke-20.1a.mjs
npx vite-node scripts/test-payroll-guard-push-fail-loud-p0.mjs
```

### Smoke manualny (Vercel)

| ID | Kroki |
|----|-------|
| S1 | Kadry → nowy → LP → dodaj → widoczny |
| S2 | ≥10 s auto-sync → nadal widoczny |
| S3 | Ctrl+F5 → nadal widoczny |
| S4 | Ponowne dodanie → brak duplikatu |
| S5 | Dwie karty: dodaj różnych pracowników → obaj po sync |

---

## 8. BUILD plan (skrót)

1. IMPLEMENT zgodnie z #001–#010  
2. `npm run build` PASS  
3. T1–T7 + smoke regresji PASS  
4. Changelog + ARCHITECTURE §11  
5. Commit/push na polecenie · VERIFY FAST `version.json`

**RELEASE MODE:** FAST RELEASE · **HOTFIX:** BUGFIX

---

## 9. Backlog po hotfixie

| Ticket | Temat |
|--------|--------|
| P0.1b | RCA-2: closed week + archiwum |
| P0.1c | RCA-3: `applyBootstrapPayrollMerge` |
| P0.1d | Fail-loud `persistPayrollRoster` |
| P0.2–P0.4 | Reszta Payroll Cloud Recovery |

---

*SSOT hotfixu: ten plik · IMPLEMENT tylko na explicit polecenie.*
