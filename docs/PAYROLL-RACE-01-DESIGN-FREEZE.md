# PAYROLL-RACE-01 — Stale Apply Reconcile + Edit Suppress · DESIGN FREEZE

> **Status:** **CLOSED** · **v2.63.68** · **CORE OWNER GO APPROVED** · **IMPLEMENT COMPLETE**  
> **Data freeze:** 2026-07-08 (v1.1 po ARCH REVIEW)  
> **Bundle ID:** PAYROLL-RACE-01  
> **Class:** **CORE**  
> **Baseline prod:** UI **2.63.67** · commit **`570e615`**  
> **STABILIZATION WINDOW:** ACTIVE  
> **Audyt:** ACCEPTED (sesja 2026-07-08)  
> **Powiązane:** [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) · [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) § 3.5 (wzorzec reconcile) · [`PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md`](PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md) (**osobny bundle — poza scope**)

```text
CEL:     Edycje dni LP i przydziałów robót nie mogą być cofane przez applyAdminDataBundle
         po async pull w runCloudSync / pullFromCloudAndMerge.

ZASADA:  Reuse First — mergeIncomingWithStored + wzorzec PLATFORM-SYNC-01A reconcile.
         Zero Duplicate Logic — jeden helper reconcilePayrollKeysWithFreshLocal.
         Guard First (1B) — withKwWeekEmployeesMutation / withKwJobsWorkEntryMutation + SSOT suppress helper.
         One Bundle = One Goal — tylko race apply + suppress parity (1A + 1B).

ZAKAZ:   Zmiana algorytmu merge (mergeWeekEmployeeRecord / mergeJobsById).
         Zmiany Edge · PWRB · finalizePayrollBundleMerge semantics · F1 extraCosts.
         Duplikowanie extendSuppress + suppressAutoSyncUntilRef w każdym handlerze.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Problem** | Przy szybkiej edycji LP (~15 osób): 1–2 dni lub 1–3 przydziały cofają się po sync; ponowne ustawienie zwykle zostaje |
| **Root cause PRIMARY** | `runCloudSync()` zamraża bundle w `adminDataBundle()` na starcie pull; po `await` `applyAdminDataBundle()` nadpisuje nowszy LS/React |
| **Root cause SECONDARY** | Brak guard parity na edycjach pól LP; `withKwJobsWorkEntryMutation` kończy token przed debounced sync |
| **`saveWeek()`** | **Poza scope** — archiwum tygodnia, nie ścieżka gorąca dni/przydziałów |
| **Nowe pole KV** | **Brak** |
| **Zmiana Edge** | **Brak** |
| **Zmiana PWRB** | **Brak** |
| **Zmiana merge LWW** | **Brak** — tylko **kolejność** reconcile przed apply |
| **Etapy** | **1A** reconcile przed apply · **1B** guard abstraction (bez duplikacji suppress) |
| **Gate release** | Payroll scope **15/15** + nowy test race + AC7–AC9 |

**DESIGN FREEZE v1.1 — APPROVED · ARCH REVIEW PASS · CORE OWNER GO PENDING · IMPLEMENT BLOCKED**

---

## 0a. ARCH REVIEW — PASS (CONDITIONAL)

| # | Werdykt | Uwagi |
|---|---------|-------|
| AR-1 | **PASS** | 1A wystarczy bez zmiany merge — reuse `mergeIncomingWithStored` |
| AR-2 | **PASS** | 1B przez istniejący guard — bez kolizji z PWRB async |
| AR-3 | **PASS** | #CORE-013 — jeden bundle 1A+1B |
| AR-4 | **PASS** | #CORE-014 — allowlista §7 |
| AR-5 | **PASS** | Edge parity bez deploy Edge |
| AR-6 | **PASS** | F1 pozostaje osobnym bundle |
| AR-7 | **CONDITION** | 1B **musi** używać abstrakcji guard (`withKw*Mutation` + SSOT `extendScopeSuppress`) — **zakaz** copy-paste suppress w handlerach |
| AR-8 | **CONDITION** | AC7–AC9 obowiązkowe w test planie przed release |

**Approved direction (ARCH):**

- Reuse `mergeIncomingWithStored()`
- Tylko `kw-week-employees` + `kw-jobs`
- Brak zmian Edge / PWRB / merge algorithm
- Stage **1A** bezpośrednio przed `applyAdminDataBundle()`
- Stage **1B** — preferuj istniejącą abstrakcję guard; unikaj duplikacji logiki suppress

**IMPLEMENT pozostaje BLOCKED** do explicit **CORE Owner GO**.

---

## 1. PLAN (skrót — zaakceptowany)

| Krok | Opis | Status |
|------|------|--------|
| AUDIT | Mapa flow click → LS → sync → apply; RC-1..RC-4 | **COMPLETE** |
| PLAN | 1A reconcile + 1B guard; scope plików; AC1–AC9 | **COMPLETE** |
| DESIGN FREEZE v1.1 | Principles, pliki, testy, wykluczenia | **FROZEN** |
| ARCH REVIEW | Boundary CORE, regresje B4/B6, #CORE-013 | **PASS** |
| **CORE Owner GO** | Explicit approval Protected Core | **⏸ PENDING** |
| IMPLEMENT | Po explicit CORE GO | **⛔ BLOCKED** |

---

## 2. Principles (wiążące)

### #PR-001 — SSOT reconcile = `mergeIncomingWithStored`

`reconcilePayrollKeysWithFreshLocal` **musi** używać istniejącego `readLocalStorageDataKey` + `mergeIncomingWithStored` + `mergeDataKey` — **bez** nowej logiki LWW.

### #PR-002 — Tylko dwa klucze payroll w reconcile apply

Do reconcile przed apply wchodzą **wyłącznie**:

| Klucz | Indeks |
|-------|--------|
| `kw-week-employees` | `DATA_KEYS` |
| `kw-jobs` | `DATA_KEYS` |

**Nie** rozszerzać na `kw-archive`, `kw-directory`, notatki (osobne wzorce).

### #PR-003 — Dwa call site apply (parity pull + push cycle)

Helper wywoływany **natychmiast przed** `applyAdminDataBundle` w:

1. `runCloudSync` (`App.tsx`)
2. `pullFromCloudAndMerge` (`App.tsx`)

Wzorzec jak `reconcileOperationalNotesInMergedBundle` po `pullAndMergeDataBundle`.

### #PR-004 — Push path bez zmiany semantyki

`prepareDataBundleForCloudPush` już re-merge z LS przed push — **nie duplikować** tam logiki 1A. 1A naprawia **apply**, nie zastępuje push reconcile.

### #PR-005 — Guard abstraction (1B) — ARCH CONDITION

1B **musi** opierać się na istniejącej abstrakcji `cloud-sync-mutation-guard.ts`:

| Mechanizm | Rola |
|-----------|------|
| `withKwWeekEmployeesMutation(fn)` | Opakowanie synchronicznych mutacji pól LP (begin/end + default suppress) |
| `withKwJobsWorkEntryMutation(fn)` | Już używane w `PayrollJobAssignmentsPanel` — **zachować** |
| `extendScopeSuppress(scope)` | **NOWY** cienki export — `extendSuppress(defaultSuppressMs(scope))` bez powielania stałych MS w call site |

**Zakaz:** powielanie w każdym handlerze pary `extendSuppress(MS)` + `suppressAutoSyncUntilRef = ...`.

**Dozwolone:** **jeden** helper App-level `bumpPayrollEditAutoSyncHold()` wywoływany z wewnątrz wspólnego wrappera edycji LP (parity `persistPayrollRoster`).

### #PR-006 — Scope suppress (SSOT w guard)

| Ścieżka edycji | Wrapper / scope | MS (SSOT) |
|----------------|-----------------|-----------|
| Dni / prevSaturday / extraCosts / carry / rate (pola LP) | `withKwWeekEmployeesMutation` + opcj. `extendScopeSuppress("kw-week-employees")` | `KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS` (**6000**) |
| Przydziały `workEntries` (LP panel) | `withKwJobsWorkEntryMutation` (istniejące) + opcj. `extendScopeSuppress("kw-jobs")` | `KW_JOBS_DEFAULT_SUPPRESS_MS` (**4500**) |

`suppressAutoSyncUntilRef` — **jeden** bump w shared wrapperze LP (6000 ms), nie per-handler.

### #PR-007 — PWRB / roster add-remove bez zmian

`pwrAdd` / `pwrRemove` / `pwrPush` / `withKwWeekEmployeesAsyncMutation` — **bez diff** w tym bundle.

### #PR-008 — F1 extraCosts = osobny program

Whole-array LWW `extraCosts` — **nie** naprawiane w PAYROLL-RACE-01.

### #PR-009 — One Bundle = One Goal (#CORE-013)

Jeden commit IMPLEMENT: **1A + 1B** razem. **Zakaz** mieszania z FEATURE UI, F1, Edge-Opt, TOKEN.

### #PR-010 — Test gate obowiązkowy

`npm run test:infra -- --scope payroll` → **15/15 PASS** przed release.

### #PR-011 — AC8 = główny dowód 1A

Edycje wykonane **podczas** trwającego pull muszą przeżyć apply dzięki `reconcilePayrollKeysWithFreshLocal` (świeży LS read tuż przed apply).

### #PR-012 — AC9 = brak regresji multi-device

Reconcile **nie** zmienia semantyki merge chmura↔lokalny dla normalnego sync dwóch urządzeń — tylko chroni świeższy LS przed nadpisaniem przez stale merged bundle.

---

## 3. Etap 1A — `reconcilePayrollKeysWithFreshLocal`

### 3.1 Sygnatura (docelowa)

```typescript
/**
 * PAYROLL-RACE-01 — po await pull merge: świeży LS payroll + reconcile przed apply.
 * Zapobiega cofnięciu edycji dni/przydziałów gdy runCloudSync zaczął ze stale snapshot.
 */
export function reconcilePayrollKeysWithFreshLocal(
  merged: unknown[],
  fresh?: { weekEmployees?: unknown | null; jobs?: unknown | null },
): unknown[];
```

### 3.2 Algorytm (frozen)

```text
INPUT: merged[] (wynik pullAndMergeDataBundle / computeMergedDataBundle)
OUTPUT: out[] (kopia merged)

empIdx = DATA_KEYS.indexOf("kw-week-employees")
jobsIdx = DATA_KEYS.indexOf("kw-jobs")

freshEmps = fresh?.weekEmployees ?? readLocalStorageDataKey("kw-week-employees")
freshJobs = fresh?.jobs ?? readLocalStorageDataKey("kw-jobs")

if empIdx >= 0:
  out[empIdx] = mergeIncomingWithStored("kw-week-employees", freshEmps, merged[empIdx])

if jobsIdx >= 0:
  out[jobsIdx] = mergeIncomingWithStored("kw-jobs", freshJobs, merged[jobsIdx])

return out
```

**Semantyka:** `mergeIncomingWithStored(stored, incoming)` — stored (świeży LS) wygrywa kolizje z `incoming` (merged ze starego snapshot T0) przez **istniejący** `mergeDataKey`.

### 3.3 Integracja App.tsx (frozen)

```text
pullAndMergeDataBundle(adminDataBundle())
  → reconcileOperationalNotesInMergedBundle(merged)   // istniejące
  → reconcilePayrollKeysWithFreshLocal(reconciled)    // NOWE 1A
  → applyAdminDataBundle(payrollReconciled)
```

To samo w `pullFromCloudAndMerge`.

### 3.4 Pliki 1A

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync.ts` | Nowy export `reconcilePayrollKeysWithFreshLocal` |
| `src/app/App.tsx` | Import + 2 call site przed `applyAdminDataBundle` |

---

## 4. Etap 1B — Guard abstraction (bez duplikacji suppress)

### 4.1 Cel

Zmniejszyć okno race **oraz** zachować suppress przez końcówkę debounce — **bez** copy-paste suppress w każdym handlerze (ARCH CONDITION AR-7).

### 4.2 Nowy export guard (frozen — **wymagany**)

W `cloud-sync-mutation-guard.ts`:

```typescript
/** PAYROLL-RACE-01 — extend suppress dla scope z SSOT defaultSuppressMs (bez duplikacji MS). */
export function extendScopeSuppress(scope: CloudSyncScope): void {
  cloudSyncMutationGuard.extendSuppress(defaultSuppressMs(scope));
}
```

Eksport `KW_JOBS_DEFAULT_SUPPRESS_MS` (obecnie private) — **dopuszczone** jeśli testy wymagają; preferowany dostęp tylko przez `extendScopeSuppress`.

### 4.3 Wspólny wrapper edycji LP (`App.tsx`) — frozen

**Jeden** helper zamiast powielania w handlerach:

```typescript
function runPayrollWeekEmployeeFieldEdit(mutate: () => void): void {
  bumpPayrollEditAutoSyncHold(); // suppressAutoSyncUntilRef +6000 — parity persistPayrollRoster
  withKwWeekEmployeesMutation(() => {
    extendScopeSuppress("kw-week-employees"); // przedłużenie na debounce window
    mutate();
  });
}
```

Handlery §4.4 wywołują **wyłącznie** `runPayrollWeekEmployeeFieldEdit(() => { setWeekEmployees(...) })`.

### 4.4 Handlery objęte 1B (frozen lista)

| Handler | Wrapper |
|---------|---------|
| `updateWeekEmployeeDay` | `runPayrollWeekEmployeeFieldEdit` |
| `updateWeekEmployeePrevSaturday` | j.w. |
| `updateWeekEmployeeExtraCosts` | j.w. |
| `updateWeekEmployeePayrollCarryForward` | j.w. |
| `updateWeekEmployeeRate` | j.w. |
| `updateWeekEmployee` (legacy) | j.w. jeśli nadal w API |

**Poza listą 1B:** `toggleSettled`, `addFromDirectory` / `removeWeekEmployee` (PWRB), `saveWeek` / `doSaveWeek`, `syncWeekRatesFromDirectory` (ma własny async guard).

### 4.5 Przydziały (`PayrollJobAssignmentsPanel.tsx`)

**Zachować** istniejące `withKwJobsWorkEntryMutation(() => onSetJobs(updater))`.

**Dodać** (jedna linia w `applyJobs`, bez duplikacji MS):

```typescript
extendScopeSuppress("kw-jobs");
```

**przed** lub **wewnątrz** wrappera `withKwJobsWorkEntryMutation` — bez drugiego mechanizmu suppress.

### 4.6 Pliki 1B

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync-mutation-guard.ts` | `extendScopeSuppress` export |
| `src/app/App.tsx` | `runPayrollWeekEmployeeFieldEdit` + `bumpPayrollEditAutoSyncHold` + refactor handlerów |
| `src/app/PayrollJobAssignmentsPanel.tsx` | `extendScopeSuppress("kw-jobs")` w `applyJobs` |

**Poza scope:** `JobsView.tsx` Roboty → Pracownicy (backlog parity).

---

## 5. Acceptance Criteria (frozen)

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **AC1** | Brak utraty edycji **dni** LP podczas sync | T-RACE-01, T-RACE-03 |
| **AC2** | Brak utraty **workEntries** / przydziałów podczas sync | T-RACE-02 |
| **AC3** | Brak regresji bootstrap merge | `test-p11-bootstrap-payroll.mjs`, `test-payroll-bootstrap-runtime-parity-b4.mjs` |
| **AC4** | Brak regresji Edge parity | `test-payroll-edge-parity-b6.mjs` |
| **AC5** | Payroll Gate **15/15** | `npm run test:infra -- --scope payroll` |
| **AC6** | Stress: 15 pracowników, **100** szybkich edycji, **0** utrat | T-RACE-06 |
| **AC7** | Stress: **200** szybkich edycji, **0** utrat | T-RACE-07 |
| **AC8** | **Mid-flight pull:** edycje lokalne wykonane **podczas** pull muszą przeżyć apply | T-RACE-08 |
| **AC9** | **Two-device regression:** normalna synchronizacja chmury (merge cloud→local bez stale snapshot race) **bez zmian** | T-RACE-09 + B4/B6 + manual smoke dwóch urządzeń |

---

## 6. Plan testów

### 6.1 Nowy skrypt (obowiązkowy)

**`scripts/test-payroll-race-apply-reconcile.mjs`**

| ID | Scenariusz | AC |
|----|------------|-----|
| **T-RACE-01** | merged stale T0; fresh LS ma edycję dnia → reconcile → edycja obecna | AC1 |
| **T-RACE-02** | merged jobs stale; fresh LS ma workEntry → reconcile → wpis obecny | AC2 |
| **T-RACE-03** | Dwa pracowników, dwie edycje dni tylko w fresh — obie przetrwają | AC1 |
| **T-RACE-04** | Helper nie dotyka `kw-directory` / archive | — |
| **T-RACE-05** | Pusty fresh → zachowanie jak dotąd (incoming) | AC9 |
| **T-RACE-06** | 15 emp × round-robin, **100** iter reconcile — 0 lost | AC6 |
| **T-RACE-07** | **200** rapid synthetic edits (mix days + workEntries) — 0 lost | AC7 |
| **T-RACE-08** | **Mid-flight:** zapis fresh LS **po** zbudowaniu merged, **przed** reconcile — wszystkie edycje w apply output | AC8 |
| **T-RACE-09** | **Two-device:** cloud-only delta + local bez edycji w trakcie pull → merge wynik identyczny jak bez reconcile (brak nadmiarowego nadpisania) | AC9 |

### 6.2 Regresje obowiązkowe

Wszystkie `scope:payroll` w `test-infra/test-manifest.json` → **15/15 PASS**.

Rekomendowane: `audit:pwrb` · `test-pwrb-boundary-rcb` · `test-payroll-work-entry-merge-fidelity.mjs`.

### 6.3 Manifest (post-IMPLEMENT)

Wpisy `lib-payroll-race-01` → `test-payroll-race-apply-reconcile.mjs`, `condition: scope:payroll`.

---

## 7. Pliki bundle (allowlista IMPLEMENT)

| Plik | Etap | Klasa |
|------|------|-------|
| `src/lib/cloud-sync.ts` | 1A | CORE |
| `src/lib/cloud-sync-mutation-guard.ts` | 1B | CORE |
| `src/app/App.tsx` | 1A + 1B | CORE |
| `src/app/PayrollJobAssignmentsPanel.tsx` | 1B | CORE-adjacent |
| `scripts/test-payroll-race-apply-reconcile.mjs` | test | CORE |
| `test-infra/test-manifest.json` | manifest | infra |
| `src/app/changelog-data.ts` | changelog | release |
| `CHANGELOG.md` | changelog | release |

**Zakaz dotykania:** `supabase/functions/**`, `payroll-week-roster-bundle.ts`, `CloudLoader.tsx`, `tender-ux-tokens.ts`.

---

## 8. Wykluczenia (Out of Scope)

| Element | Powód |
|---------|--------|
| Zmiana `mergeWeekEmployeeRecord` / `mergeJobsById` | #PR-007 |
| Edge `mergeWeekEmployeesUnion` | #PR-007 |
| PWRB facade / I-1…I-4 | RC-B CLOSED |
| F1 per-item `extraCosts` merge | Osobny bundle |
| `saveWeek` / archive semantics | Nie na ścieżce gorącej |
| S7 batch-set 500 / Edge-Opt-B | Evidence Gate |
| JobsView assignment guard | Backlog |
| Revision gate (`rosterRevision` skip apply) | Etap 2 — tylko jeśli 1A+1B niewystarczające |

---

## 9. Ryzyka i mitigacje

| ID | Ryzyko | P | Mitigacja |
|----|--------|---|-----------|
| R1 | Reconcile maskuje bug merge | Ś | T-RACE-05/09; B4/B6 |
| R2 | Double-merge zbyt agresywny | Ś | Reuse `mergeIncomingWithStored` |
| R3 | Zbyt długi suppress | N | SSOT MS w guard; jeden wrapper |
| R4 | Token `withKw*` kończy się przed debounce | Ś | `extendScopeSuppress` w wrapperze + `bumpPayrollEditAutoSyncHold` |
| R5 | Multi-tab | Ś | LS fresh read — benefit 1A |
| R6 | Regresja notatek | N | Kolejność reconcile §3.3 |

---

## 10. CORE Owner decision — następny krok

| Decyzja | Wymagana |
|---------|----------|
| **CORE Owner GO** | Explicit approval Protected Core przed IMPLEMENT |
| **IMPLEMENT** | **BLOCKED** bez GO |
| **Release** | Typ **B** · gate 15/15 + T-RACE-01…09 |

Po **CORE Owner GO** → IMPLEMENT 1A+1B → BUILD → TEST → COMMIT → PUSH → VERIFY.

---

## 11. Release / wersjonowanie

| Pole | Wartość |
|------|---------|
| **Typ release** | **B** (functional CORE + test) |
| **Wersja (plan)** | **2.63.68** (patch od 2.63.67) |
| **CHANGELOG label** | `PAYROLL-RACE-01 — reconcile przed apply + guard edycji LP` |
| **VERIFY** | Jedno `curl` `version.json` |
| **HOTFIX class** | BUGFIX · CORE |

---

## 12. Ograniczenia dokumentu

- DESIGN FREEZE v1.1 **nie** zawiera implementacji kodu.
- **IMPLEMENT BLOCKED** do explicit **CORE Owner GO**.
- Stress AC6/AC7 na prod — owner manual po deploy.

---

*SSOT bundle: ten plik. Workflow: AUDIT ✅ → PLAN ✅ → DESIGN FREEZE v1.1 ✅ → ARCH REVIEW ✅ → **CORE Owner GO ⏸** → IMPLEMENT ⛔ BLOCKED. One Bundle = One Goal · Zero Mixed Commit.*
