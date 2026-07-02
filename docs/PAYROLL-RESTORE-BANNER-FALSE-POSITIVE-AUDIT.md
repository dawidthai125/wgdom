# PAYROLL — AUDIT: False positive „W archiwum jest pełniejsza wersja tego tygodnia”

> **Status:** **AUDIT COMPLETE** · **READ ONLY** · **IMPLEMENT: NO GO**  
> **Data audytu:** 2026-07-01  
> **Baseline prod:** **v2.63.23** · commit **`d670892`**  
> **STABILIZATION WINDOW:** ACTIVE

```text
AUDIT:     COMPLETE
RCA:       CONFIRMED — banner używa weekEmployeesListRichness (heurystyka strukturalna), nie parity payroll ani jednego SSOT z live rosterem
IMPLEMENT: NO GO
```

---

## 1. Root cause

**PRIMARY:** Baner porównuje **dwa niezależne magazyny** tego samego tygodnia:

| Strona | Źródło | Klucz KV |
|--------|--------|----------|
| **Current** | `weekEmployees` (props) | `kw-week-employees` |
| **Archive** | `archivedForWeek.weekEmployees` | `kw-archive[].weekEmployees` |

Warunek: `weekEmployeesListRichness(archive) > weekEmployeesListRichness(live) + 1`.

**`weekEmployeesListRichness` nie mierzy godzin ani kwot wypłaty** — liczy punkty strukturalne (`dayRichness`: `active`, `from`/`to`, `extraHours`, `notes`, `zaliczka`; `prevSaturday`; `extraCosts.length × 3`). Dwa stany z **identycznymi sumami w Liście Płac** mogą różnić się richness o ≥2 (np. stare `active:true` w archiwum vs `active:false` na live przy zachowanych `from`/`to`).

**SECONDARY — sync rozjeżdża klucze:**

- `runCloudSync` / `computeMergedDataBundle` scala **`kw-week-employees`** i **`kw-archive`** osobno (`mergeArchive` wewnętrznie robi `mergeWeekEmployees` union na `weekEmployees` w tygodniu).
- Brak kroku „po merge wyrównaj `archive[week].weekEmployees` do live dla bieżącego tygodnia operacyjnego”.
- Chmura lub druga karta może **ponownie wzbogacić archiwum** po lokalnym czyszczeniu live rosteru.

**SECONDARY — `refreshSavedActiveWeekSnapshot` nie zawsze działa:**

- Aktualizuje archiwum z live tylko gdy istnieje wpis `weekFrom|weekTo` **i** `!isPayrollWeekClosedForUi` (App.tsx L1259–1270).
- Edycja wyłącznie w zakładce **Archiwum** (`patchArchiveWeek`) zmienia tylko `kw-archive` → baner słusznie zostaje, ale użytkownik może tego nie rozumieć.

**SECONDARY — próg `+ 1`:** Wystarczy różnica **2 punkty** richness (np. jeden dzień: archiwum `active` +3 vs live nieaktywny +1).

**Nie jest root cause:** B6 Edge parity, B5 `displayEmployees`, workEntries, smoke w CI (chyba że zostawiły dane w prod KV/archiwum).

---

## 2. Current comparison algorithm

**Plik:** `src/app/PayrollView.tsx` L594, L714–721

```text
archivedForWeek = savedWeeks.find(w => w.weekFrom === weekFrom && w.weekTo === weekTo)

archiveRichness  = weekEmployeesListRichness(archivedForWeek.weekEmployees)
currentRichness  = weekEmployeesListRichness(weekEmployees)

showRestoreBanner =
  !isClosedWeek
  AND onRestoreFromArchive
  AND archivedForWeek?.weekEmployees?.length > 0
  AND archiveRichness > currentRichness + 1
```

**`weekEmployeesListRichness`** (`cloud-sync.ts` L924–927) → suma `weekEmployeeRichness` per rekord.

**`weekEmployeeRichness`** (L911–921):

```text
per employee:
  Σ dayRichness(days[*])
  + dayRichness(prevSaturday)
  + (extraCosts.length × 3)
```

**`dayRichness`** (L884–892):

| Składnik | Punkty |
|---------|--------|
| `active` | +2 |
| `from` lub `to` ustawione | +1 |
| każdy `extraHours[]` | +8 |
| `notes.length` | +4 per znak |
| `zaliczka > 0` | +1 |

**Akcja CTA:** `restoreWeekFromArchive` (App.tsx L1173–1181) — kopiuje `snap.weekEmployees` → `setWeekEmployees` (głęboki JSON clone). **Nie** aktualizuje archiwum ani nie pushuje od razu do chmury.

---

## 3. Data flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ PayrollView (operacyjny tydzień, !isClosedWeek)                          │
│   live: weekEmployees ← kw-week-employees (React + LS)                 │
│   archive slice: savedWeeks.find(weekFrom, weekTo).weekEmployees         │
│                    ← kw-archive                                          │
│   UI totals/rows: z live (displayEmployees = weekEmployees gdy !closed)  │
│   BANER: richness(archive.weekEmployees) vs richness(live)               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────┐                         ┌───────────────────┐
│ kw-week-employees │                         │ kw-archive        │
│ mergeWeekEmployees│                         │ mergeArchive      │
│ finalizePayroll   │                         │  └ mergeWeekEmployees
│ BundleMerge (B4)  │                         │     per week key  │
│ P11 richness      │                         │                   │
└───────────────────┘                         └───────────────────┘
        │                                               │
        └─────────────── runCloudSync ──────────────────┘
                        (osobne merge, brak lockstep)
```

**Ścieżki wyrównania (częściowe):**

| Akcja | Wyrównuje archive ← live? |
|-------|---------------------------|
| `updateWeekEmployee*` / remove / add | Tak, jeśli `refreshSavedActiveWeekSnapshot` (operacyjny tydzień + wpis archiwum) |
| `doSaveWeek` / `saveWeek` | Tak — `buildWeekSnapshot(..., weekEmployees)` nadpisuje cały tydzień |
| `restoreWeekFromArchive` | Live ← archive (odwrotnie) |
| `runCloudSync` | Oba niezależnie; archive może zyskać union z chmury |
| Edycja w `ArchiveView` | Tylko archive |
| `applyRuntimePayrollAntiLeak` | Czyści **tylko** live `kw-week-employees`, nie archiwum |

---

## 4. Edge cases

| ID | Scenariusz | Baner | Wyjaśnienie |
|----|------------|-------|-------------|
| **E1** | Te same kwoty LP, różna struktura dni (`active` / `notes` / `extraHours`) | **TRUE (false positive)** | Richness ≠ payroll totals |
| **E2** | Usunięto smoke z live, archiwum z poprzedniego save / chmury | **TRUE** | Union w `mergeArchive` lub brak `refresh` |
| **E3** | `saveWeek` → „Nadpisać?” → Anuluj | **TRUE** | Archiwum stare, live nowe |
| **E4** | Sync po czyszczeniu na karcie A; karta B miała bogatsze archiwum w chmurze | **TRUE** | `mergeArchive` przywraca bogatsze `weekEmployees` |
| **E5** | Edycja tylko w Archiwum (historia) | **TRUE** | Zamierzone — dwa SSOT |
| **E6** | Tydzień closed (`isClosedWeek`) | **FALSE** | B5 gate `!isClosedWeek` |
| **E7** | Brak `weekEmployees` w archiwum (stary snapshot) | **FALSE** | Warunek `.length` |
| **E8** | Różnica richness ≤ 1 | **FALSE** | Próg `+ 1` |
| **E9** | Default `defaultDay()`: `active:false`, `from`/`to` set | Podwyższa baseline | 1 pkt/dzień/os. bez pracy |
| **E10** | `extraCosts` odrzucone w UI | Nadal w richness | Liczy `length`, nie status |
| **E11** | Po rollover: anti-leak czyści live, archiwum poprzedniego tygodnia bogate | Baner na **innym** weekFrom | Tylko jeśli ten sam zakres dat w archiwum |

**Smoke / test remnants:** Skrypty (`test-payroll-guard-push-fail-loud-p0.mjs`, `test-payroll-refresh-team-race-p0.mjs`) używają `weekEmployeesListRichness >= 8` jako progu testowego — **nie** sterują banerem bezpośrednio. False positive na prod wymaga **danych w KV** (bogatsze `kw-archive[].weekEmployees` vs `kw-week-employees`), typowo po smoke na prod, sync lub wcześniejszym save bez nadpisania.

---

## 5. SSOT violations

| # | Naruszenie | Dowód | Severity |
|---|------------|-------|----------|
| **V1** | **Decyzja UX „pełniejsza wersja” ≠ SSOT payroll** | Baner: `weekEmployeesListRichness`; tabela LP: `calcWeekEmployeeForPayroll` | **PRIMARY** |
| **V2** | **Dwa SSOT tygodnia operacyjnego** | `kw-week-employees` vs `kw-archive[].weekEmployees` bez lockstep po sync | **PRIMARY** |
| **V3** | **Ten sam próg co P11/bootstrap** | `bootstrapMergedShouldPush` używa `richness > cloud + 1` (cloud-sync L1734–1736) — inny cel, ta sama heurystyka | MED |
| **V4** | **Komunikat obiecuje godziny/Sob.pr.** | Copy: „Brakuje godzin Sob.pr.…”; metric nie sprawdza godzin (`payrollMetrics`) | MED |
| **V5** | **`workEntries` w snapshot ignorowane** | `buildWeekSnapshot` zachowuje `existing.workEntries`; baner ich nie widzi | LOW |

**Zachowane (nie psuć w fixie):** B5 `!isClosedWeek` gate, `resolvePayrollDisplayEmployees`, `finalizePayrollBundleMerge`, `patchArchiveWeek` dla historii.

---

## 6. Minimal DESIGN FREEZE scope (propozycja)

**Bundle roboczy:** `PAYROLL-RESTORE-BANNER-RCA` (poza B6; patch UI/logika banera).

| ID | Zmiana | Pliki |
|----|--------|-------|
| **RB-1** | Warunek banera: **`payrollMetrics` parity** (activeDays + totalHours) lub richness **tylko** gdy metrics też wskazują stratę | `PayrollView.tsx` (+ ewent. export helper z `cloud-sync.ts`) |
| **RB-2** | Alternatywa / dodatek: próg richness `+ N` (np. +5) lub % relative threshold | `PayrollView.tsx` |
| **RB-3** | Po `doSaveWeek` / udanym `refreshSavedActiveWeekSnapshot`: invariant `archive.weekEmployees` ≡ live dla aktywnego tygodnia (już prawie tak — udokumentować + test) | `App.tsx` |
| **RB-4** | Opcjonalnie: po `runCloudSync`, dla `weekFrom/weekTo` operacyjnego — clamp archiwum do live jeśli live jest źródłem prawdy ( **ostrożnie** — ryzyko utraty danych z innej karty) | **OOS MIN** — wymaga osobnej decyzji |
| **RB-5** | Test: `scripts/test-payroll-restore-banner-false-positive.mjs` — ten sam payroll metrics, różny richness → baner OFF | **NOWY** |
| **RB-6** | Copy banera dopasować do rzeczywistego warunku | `PayrollView.tsx` |

**Out of scope MIN:**

- Zmiana `mergeArchive` / B4 / B6
- Automatyczne „Przywróć z archiwum” bez akcji użytkownika
- Porównanie `workEntries` lub `employees` summary snapshot
- Nowe KV / Principles

**Acceptance (propozycja):**

| AC | Kryterium |
|----|-----------|
| RB-AC1 | Identyczne `payrollMetrics(live)` i `payrollMetrics(archive.weekEmployees)` → baner **OFF** |
| RB-AC2 | Rzeczywista strata godzin (metrics) → baner **ON** |
| RB-AC3 | B5: baner nadal **OFF** na `isClosedWeek` |
| RB-AC4 | Regresja B3/B4/B5/B6 testów PASS |

---

## GO / NO GO

| Etap | Status |
|------|--------|
| **AUDIT** | **COMPLETE** |
| **DESIGN FREEZE** | Propozycja §6 — oczekuje akceptacji |
| **IMPLEMENT** | **NO GO** |

---

*SSOT audytu: ten plik · bez zmian kodu.*
