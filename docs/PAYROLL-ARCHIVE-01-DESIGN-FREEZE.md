# PAYROLL-ARCHIVE-01 — kw-archive Stale Apply Reconcile · DESIGN FREEZE

> **Status:** **IMPLEMENT COMPLETE** · **v2.65.4** · **CORE OWNER GO APPROVED**  
> **Data freeze:** 2026-07-12  
> **Bundle ID:** PAYROLL-ARCHIVE-01  
> **Class:** **CORE** (Protected Core)  
> **Baseline prod:** UI **2.63.96** · commit **`4b35228`** (feature) · docs **`58a7d38`**  
> **STABILIZATION WINDOW:** ACTIVE  
> **Audyt:** **PASS** (sesja 2026-07-12 — Archiwum / Piotrek / Pn cofa się po chwili)  
> **RCA:** **PASS** — brak post-merge reconcile dla `kw-archive` (wzorzec PLATFORM-SYNC-01A + PAYROLL-RACE-01 nieprzeniesiony)  
> **Powiązane:** [`PAYROLL-RACE-01-DESIGN-FREEZE.md`](PAYROLL-RACE-01-DESIGN-FREEZE.md) (CLOSED · v2.63.68) · [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) § 3.5 (PLATFORM-SYNC-01A) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md`](PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md) (**osobny bundle — poza scope**)

```text
CEL:     Edycje dni / stawek / kosztów w widoku Archiwum (kw-archive) nie mogą być cofane
         przez applyAdminDataBundle po async pull w runCloudSync / pullFromCloudAndMerge.

PROBLEM: kw-archive nie posiada ochrony analogicznej do:
         - reconcilePayrollKeysWithFreshLocal (PAYROLL-RACE-01)
         - reconcileOperationalNotesInMergedBundle (PLATFORM-SYNC-01A)

ZASADA:  Reuse First — mergeIncomingWithStored + istniejący mergeArchive.
         Zero Duplicate Logic — jeden helper reconcileArchiveWithFreshLocal.
         One Bundle = One Goal — tylko archive stale-apply race (nie S6 restore, nie F1).

ZAKAZ:   Zmiana algorytmu mergeArchive / mergeWeekEmployeeRecord / pickDaysByTimestamps.
         Zmiany Edge · PWRB · finalizePayrollBundleMerge · roster richness override.
         Rozszerzanie reconcilePayrollKeysWithFreshLocal o kw-archive (osobny helper).
         IMPLEMENT bez explicit CORE Owner GO.
```

---

## 0. Werdykt freeze (draft)

| Pole | Wartość |
|------|---------|
| **Problem** | Owner zaznacza poniedziałek w Archiwum (poprzedni tydzień, np. Piotrek) → chwilowo ✓ + przeliczona wypłata → po ~2–5 s dzień sam się odznacza |
| **Root cause PRIMARY** | `computeMergedDataBundle` zamraża `valuesForMerge` przed `await fetchKeysFromCloud`; po await `applyAdminDataBundle` nadpisuje świeższy `kw-archive` z LS/React **bez** post-merge reconcile |
| **Root cause SECONDARY** | Ścieżka `patchArchiveWeek` / `updateArchiveWeekEmployee*` **nie** używa guard/suppress parity z LP (`runPayrollWeekEmployeeFieldEdit`) |
| **Źródło danych Archiwum** | **Snapshot** `kw-archive[].weekEmployees` — **nie** live `kw-week-employees` |
| **Nowe pole KV** | **Brak** |
| **Zmiana Edge** | **Brak** |
| **Zmiana PWRB** | **Brak** |
| **Zmiana merge LWW** | **Brak** — tylko **kolejność** reconcile przed apply |
| **Rekomendacja** | **Wariant A** (Archive Reconcile po merge); opcjonalny **Wariant B** jako 1B (suppress parity) w tym samym lub kolejnym CORE bundle |

**DESIGN FREEZE DRAFT — oczekuje CORE Owner GO · IMPLEMENT BLOCKED**

---

## 1. Kontekst audytu (skrót)

### 1.1 Execution flow (frozen facts)

```text
ArchiveView → WeekEmployeeDetail → PayrollDayEditor (Pn active)
  → updateArchiveWeekEmployeeDay → patchArchiveWeek → buildWeekSnapshot
  → setSavedWeeks (useLocalStorage "kw-archive")     ← persist OK, UI OK

useEffect(savedWeeks) → scheduleAutoCloudSync (2s)
  → runCloudSync / pullFromCloudAndMerge
  → computeMergedDataBundle(valuesForMerge @ T0)
  → await fetchKeysFromCloud                         ← edycja może trafić do LS w trakcie
  → mergeArchive(stale valuesForMerge, cloud)
  → reconcileOperationalNotesInMergedBundle          ← tylko notatki
  → reconcilePayrollKeysWithFreshLocal               ← tylko roster + jobs
  → applyAdminDataBundle → setSavedWeeks(merged)   ← COFNIĘCIE Pn
```

### 1.2 Dowód wzorca naprawy (już w prod)

| Bundle | Klucz | Helper | Status |
|--------|-------|--------|--------|
| PLATFORM-SYNC-01A | `kw-operational-notes` | `reconcileOperationalNotesInMergedBundle` | CLOSED 2.63.33 |
| PAYROLL-RACE-01 | `kw-week-employees`, `kw-jobs` | `reconcilePayrollKeysWithFreshLocal` | CLOSED 2.63.68 |
| **PAYROLL-ARCHIVE-01** | **`kw-archive`** | **brak** | **OPEN** |

PAYROLL-RACE-01 Principle **#PR-002** celowo **nie** rozszerzał reconcile na `kw-archive` — ten bundle to **osobny** program.

---

## 2. Warianty — porównanie

### Macierz skrócona

| Kryterium | **A — Archive Reconcile** | **B — Archive Sync Hold** | **C — Reuse istniejącego** | **D — Inna architektura** |
|-----------|---------------------------|---------------------------|------------------------------|---------------------------|
| Naprawia stale apply (PRIMARY) | **TAK** | Częściowo | Zależy od podwariantu | Zależy |
| Zmiana merge algorithm | Nie | Nie | Nie (preferowane) | Ryzyko tak |
| Pliki dotknięte | 2 (+ test) | 3–5 | 1–3 | 4–10+ |
| Multi-device regresja | Niska (reuse merge) | Niska | Niska–średnia | Średnia–wysoka |
| Parity z PAYROLL-RACE-01 | **Wysoka** | Uzupełnia A | Średnia | Niska |
| Rollback | Łatwy | Łatwy | Średni | Trudny |
| **Rekomendacja** | **★ PRIMARY** | Opcjonalny 1B | Tylko jeśli A odrzucone | Nie na ten incydent |

---

## 3. Wariant A — Archive Reconcile po merge

### 3.1 Opis

Nowy export `reconcileArchiveWithFreshLocal(merged, freshArchive?)` w `cloud-sync.ts`:

- Po `await pullAndMergeDataBundle` / przed `applyAdminDataBundle`
- Odczyt świeżego `kw-archive` z `readLocalStorageDataKey("kw-archive")`
- `out[archIdx] = mergeIncomingWithStored("kw-archive", fresh, merged[archIdx])`
- Semantyka: **stored (świeży LS) wygrywa** kolizje ze stale merged bundle przez **istniejący** `mergeArchive`

### 3.2 Integracja (frozen)

```text
pullAndMergeDataBundle(adminDataBundle())
  → reconcileOperationalNotesInMergedBundle(merged)
  → reconcilePayrollKeysWithFreshLocal(reconciled)
  → reconcileArchiveWithFreshLocal(payrollReconciled)   // NOWE
  → applyAdminDataBundle(archiveReconciled)
```

**Dwa call site** (parity PAYROLL-RACE-01 #PR-003):

1. `runCloudSync` (`App.tsx`)
2. `pullFromCloudAndMerge` (`App.tsx`)

### 3.3 Wpływ na Protected Core

| Aspekt | Ocena |
|--------|-------|
| `cloud-sync.ts` | +1 export (~15 linii), zero zmian w `mergeArchive` |
| `App.tsx` | +2 wywołania przed apply |
| `kw-week-employees` / PWRB / B4 merge | **Bez dotyku** |
| Edge `make-server` | **Bez deploy** |
| Archiwum edycja (`patchArchiveWeek`) | **Bez zmiany logiki biznesowej** |

**Klasyfikacja:** minimalny CORE patch — ten sam profil ryzyka co PLATFORM-SYNC-01A i PAYROLL-RACE-01 1A.

### 3.4 Rollback

| Krok | Akcja |
|------|-------|
| Revert commit | Usunąć helper + 2 call site |
| Prod | Poprzedni build; dane KV bez migracji |
| Dane użytkownika | Brak utraty — cofa tylko fix (race wraca) |
| Czas rollback | < 1 release cycle (frontend only) |

### 3.5 Ryzyka

| Ryzyko | Prawdop. | Mitygacja |
|--------|----------|-----------|
| Regresja multi-device sync archiwum | Niskie | AC: świeży LS **merge** z merged (nie blind overwrite); testy round-trip |
| Fałszywe „wygranie” lokalnego pustego archiwum nad bogatszą chmurą | Bardzo niskie | `mergeIncomingWithStored` + `mergeArchive` już produkcyjnie sprawdzone przy import/backup |
| Duplikacja logiki reconcile | Średnie (organizacyjne) | Jeden helper; **nie** rozszerzać `reconcilePayrollKeysWithFreshLocal` (#PA-001) |
| Push nadal ze stale bundle | Niskie | `prepareDataBundleForCloudPush` już re-merge z LS przed push (#PR-004 parity) |

### 3.6 Testy (gate)

| ID | Test | Typ |
|----|------|-----|
| PA-T01 | `reconcileArchiveWithFreshLocal` — fresh LS z `Pn.active=true` + stale merged `false` → archived | unit (`cloud-sync`) |
| PA-T02 | Regresja P0R-T05 analog — stale pull bez reconcile cofa dzień; z reconcile zachowuje | unit (mirror `test-operational-notes-sync-race-p0.mjs`) |
| PA-T03 | Multi-round: cloud stale × 3 sync → reconcile zawsze trzyma lokalną edycję | unit |
| PA-T04 | `mergeArchive` round-trip: dwa urządzenia, różne tygodnie — bez utraty tygodnia | unit (istniejące + 1 case) |
| PA-T05 | `npm run test:infra -- --scope payroll` | integracja — **15/15 PASS** (brak regresji) |
| PA-T06 | Opcjonalnie preview: edycja Pn w Archiwum → wait sync debounce → Pn nadal active | manual / harness |

**Nowy skrypt (proponowany):** `scripts/test-payroll-archive-sync-race-p0.mjs` (PA-T01–T04).

### 3.7 Wpływ na Cloud Sync

| Ścieżka | Zmiana |
|---------|--------|
| `computeMergedDataBundle` | **Bez zmian** |
| `prepareDataBundleForCloudPush` | **Bez zmian** |
| `pullAndMergeDataBundle` | **Bez zmian** (reconcile na warstwie App) |
| `applyAdminDataBundle` | Wejście = już zreconcile'owane `kw-archive` |
| `pushMergedDataBundleToCloud` | Po apply LS zgodny z reconcile → push OK |
| Egress / batch-get | **Bez zmian** częstotliwości |
| `suppressAutoSyncUntilRef` | **Bez zmian** w wariancie A |

---

## 4. Wariant B — Archive Sync Hold (analogiczny do Payroll)

### 4.1 Opis

Oparcie o `cloud-sync-mutation-guard.ts`:

- Nowy scope `kw-archive` + `KW_ARCHIVE_DEFAULT_SUPPRESS_MS` (propozycja: **6000** — parity LP)
- Export `withKwArchiveMutation(fn)` lub reuse `withKwWeekEmployeesMutation` **nie** — osobny scope
- Wrapper `runArchiveWeekEmployeeFieldEdit(mutate)` opakowujący wszystkie `updateArchiveWeekEmployee*`
- `bumpArchiveEditAutoSyncHold()` → `suppressAutoSyncUntilRef` + `extendScopeSuppress("kw-archive")`

### 4.2 Wpływ na Protected Core

| Aspekt | Ocena |
|--------|-------|
| Naprawia PRIMARY race | **NIE w pełni** — tylko zmniejsza okno (debounce 2s vs suppress 6s) |
| `patchArchiveWeek` + 6 handlerów | Refactor wrap |
| Guard globalny | Nowy scope w `CloudSyncScope` |
| Kolizja z LP guard | Niska — osobne scope tokeny |

### 4.3 Rollback

Revert wrapperów w `App.tsx` + opcjonalnie scope w guard. Frontend only.

### 4.4 Ryzyka

| Ryzyko | Prawdop. | Uwagi |
|--------|----------|-------|
| Incydent nadal możliwy przy sync in-flight > 6s | Średnie | Dlatego B **nie wystarcza** sam |
| Blokada pull przez `cloudSyncMutationGuard.isBlocked()` | Niskie | Może opóźnić multi-device refresh |
| Duplikacja wzorca PAYROLL-RACE-01 1B | — | Akceptowalne jeśli bundle A+B |

### 4.5 Testy

| ID | Test |
|----|------|
| PB-T01 | Podczas `withKwArchiveMutation` → `pullFromCloudAndMerge` skip (`guard_blocked`) |
| PB-T02 | Po edycji archiwum `suppressAutoSyncUntilRef` ≥ now + 6000 |
| PB-T03 | Regresja: sync po suppress expiry nadal OK |

### 4.6 Wpływ na Cloud Sync

- Opóźnia `runCloudSync` / `pullFromCloudAndMerge` w oknie edycji
- **Nie** naprawia apply ze stale merged — wymaga A

---

## 5. Wariant C — Reuse istniejącego mechanizmu

### 5.1 Podwarianty

| ID | Opis | Werdykt |
|----|------|---------|
| **C1** | Rozszerzyć `reconcilePayrollKeysWithFreshLocal` o `kw-archive` | **ODRZUĆ** — łamie PAYROLL-RACE-01 #PR-002; miesza roster z archiwum |
| **C2** | Uogólnić do `reconcileKeysWithFreshLocal(keys: DataKey[])` | Możliwe, ale **over-engineering**; trudniejszy rollback |
| **C3** | Wyłącznie `mergeOperationalNotes` pattern — osobna funkcja jak A | **= Wariant A** (rekomendowany kształt) |
| **C4** | Końcowy re-read LS w `computeMergedDataBundle` po await (przed return) | Naprawia merge **i** apply; **szerszy** blast radius niż A |
| **C5** | `prepareDataBundleForCloudPush` rozszerzone o archive reconcile | Dotyka push path — ryzyko zmiany fingerprint / AC4 |

### 5.2 Wpływ na Protected Core (C2 / C4)

| Podwariant | Protected Core |
|------------|----------------|
| C2 | Refactor 3 istniejących reconcile → jeden generic — **średnie ryzyko** |
| C4 | Zmiana `computeMergedDataBundle` — dotyka **wszystkie** sync entry points |
| C5 | Zmiana push semantics — **wysokie ryzyko** regresji SYNC-ARCH-01 |

### 5.3 Rollback

C3/A: łatwy. C2/C4/C5: trudniejszy — większy diff.

### 5.4 Ryzyka

- C1: konfuzja semantyczna payroll vs archive w jednym helperze
- C4: podwójne reconcile (merge + apply) — trudniejszy debug
- C5: niezgodność z #PR-004 (1A naprawia apply, nie push)

### 5.5 Testy

C3 = PA-T*. C4 wymaga pełnego `test:infra` + sync metrics. C5 wymaga AC4 fingerprint regression.

### 5.6 Wpływ na Cloud Sync

| Podwariant | Sync |
|------------|------|
| C3 (=A) | Tylko pre-apply |
| C4 | Merge + apply |
| C5 | Push path |

---

## 6. Wariant D — Inna architektura

### 6.1 Opcje

| ID | Opis | Ocena |
|----|------|-------|
| **D1** | Archiwum: local-wins always (skip `mergeArchive` on pull) | **ODRZUĆ** — utrata multi-device dla zapisanych tygodni |
| **D2** | Dedykowany `pushKeysToCloud(["kw-archive"])` natychmiast po `patchArchiveWeek` | Wyższy egress; nie naprawia pull apply race sam |
| **D3** | Generation counter / ETAP B (jak notatki ON HOLD) | Overkill; odłożyć |
| **D4** | Archiwum edytowalne tylko offline (block sync) | Regresja UX |
| **D5** | Przenieść edycję archiwum do live roster + `refreshSavedActiveWeekSnapshot` | **ODRZUĆ** — zmiana modelu; „poprzedni tydzień” ≠ bieżący `weekFrom` |
| **D6** | Edge-side LWW na `weekEmployees` w archiwum | Wymaga deploy Edge — **poza STABILIZATION** |

### 6.2 Wpływ na Protected Core

Wszystkie D1–D6: **wysoki** lub **bardzo wysoki** — poza zakresem incydentu.

### 6.3 Rollback

D2/D6: częściowo nieodwracalne (chmura w innym stanie).

### 6.4 Ryzyka

- D1: utrata danych z drugiego urządzenia
- D5: fundamentalna zmiana SSOT archiwum
- D6: Protected Core + Edge deploy gate

### 6.5 Testy

Pełna seria payroll + multi-device E2E — kosztowne.

### 6.6 Wpływ na Cloud Sync

D1/D4/D6: zmiana fundamentalnej semantyki sync — **niezgodne** z ADR / SYNC-ARCH.

---

## 7. Principles (wiążące — draft)

### #PA-001 — SSOT reconcile = `mergeIncomingWithStored`

`reconcileArchiveWithFreshLocal` **musi** używać `readLocalStorageDataKey` + `mergeIncomingWithStored` + `mergeDataKey("kw-archive")` — **bez** nowej logiki LWW.

### #PA-002 — Osobny helper (nie rozszerzać PAYROLL-RACE-01)

**Nie** dodawać `kw-archive` do `reconcilePayrollKeysWithFreshLocal` (#PR-002 pozostaje w mocy).

### #PA-003 — Dwa call site apply (parity)

Jak #PR-003: `runCloudSync` + `pullFromCloudAndMerge`.

### #PA-004 — Push path bez zmiany semantyki

Jak #PR-004: `prepareDataBundleForCloudPush` bez duplikacji reconcile.

### #PA-005 — Bez zmian merge algorithm

`mergeArchive`, `mergeWeekEmployeeRecord`, `pickDaysByTimestamps` — **frozen**.

### #PA-006 — One Bundle = One Goal

PAYROLL-ARCHIVE-01 = archive stale-apply race. **Nie** mieszać z PR-PAY-S6 restore eligibility, F1 extraCosts, Edge.

### #PA-007 — Opcjonalny 1B (Wariant B)

Jeśli Owner GO obejmuje A+B: jeden release; jeśli tylko A — B w backlogu CORE.

### #PA-008 — Test gate

`test-payroll-archive-sync-race-p0.mjs` PASS + `npm run test:infra -- --scope payroll` 15/15.

---

## 8. Rekomendacja

### ★ Wariant **A** — Archive Reconcile po merge

**Uzasadnienie:**

1. **Identyczny wzorzec** do dwóch sprawdzonych produkcyjnie napraw (PLATFORM-SYNC-01A, PAYROLL-RACE-01 1A).
2. **Minimalny diff** Protected Core (1 helper + 2 call site + testy).
3. **Naprawia PRIMARY root cause** (stale apply), nie tylko okno czasowe.
4. **Rollback** i **brak Edge deploy** — najniższe ryzyko w STABILIZATION WINDOW.
5. PAYROLL-RACE-01 już przewidział **osobny** program dla `kw-archive` (#PR-002).

### Opcjonalnie (Owner discretion)

**Wariant B** jako etap **1B** w tym samym bundle — defense in depth, parity suppress z LP. **Nie zastępuje A.**

### Odrzucone na ten incydent

- **C1, C4, C5, D1, D5, D6** — zbyt szeroki blast radius lub zmiana modelu.
- **B samodzielnie** — niewystarczający dla sync in-flight.

---

## 9. Scope IMPLEMENT (po Owner GO — nie teraz)

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync.ts` | `reconcileArchiveWithFreshLocal` export |
| `src/app/App.tsx` | 2× call przed `applyAdminDataBundle` |
| `scripts/test-payroll-archive-sync-race-p0.mjs` | PA-T01–T04 |
| `docs/ARCHITECTURE.md` | § sync reconcile — wpis PAYROLL-ARCHIVE-01 |
| `CHANGELOG` | po IMPLEMENT + verify |

**Opcjonalnie 1B:** `cloud-sync-mutation-guard.ts`, `runArchiveWeekEmployeeFieldEdit`, refactor `updateArchiveWeekEmployee*`.

---

## 10. Acceptance Criteria (draft)

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| AC1 | Edycja `Pn.active` w Archiwum przeżywa `runCloudSync` zaczęty przed edycją | PA-T02 |
| AC2 | Edycja przeżywa `pullFromCloudAndMerge` (focus) | PA-T02 / manual |
| AC3 | Multi-device: mergeArchive semantyka bez regresji | PA-T04 |
| AC4 | Brak zmian w `mergeArchive` / Edge | diff review |
| AC5 | `test:infra --scope payroll` 15/15 | CI / local |
| AC6 | Prod verify FAST po release | `version.json` |

---

## 11. Status gate

```text
AUDIT:         PASS
RCA:           PASS
DESIGN FREEZE: DRAFT (ten dokument)
ARCH REVIEW:   PENDING
CORE Owner GO: PENDING
IMPLEMENT:     BLOCKED
COMMIT/PUSH:   BLOCKED
```

**Następny krok:** Owner GO na Wariant **A** (± opcjonalny **B**) → ARCH REVIEW → IMPLEMENT.
