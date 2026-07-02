# PAYROLL-CLOUD-RECOVERY — Etap 2 B5 · DESIGN FREEZE (Closed Week UI)

> **Status:** **DESIGN FREEZE DRAFT** — czeka na akceptację właściciela repo · **IMPLEMENT: NO GO**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0  
> **Baseline prod:** **v2.63.21** (`b3d5664`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** [`PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md`](PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) · [`SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md)

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-CLOUD-RECOVERY — **Etap 2 · B5** |
| **Bundle** | **B5** — RCA-2: Closed week + archiwum UI |
| **Ticket legacy** | P0.1b |
| **Principles** | **Brak nowych** — obowiązują istniejące **#001–#013** (P0 roster + guard) |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu danych** | **Brak** |
| **Zmiana architektury merge/sync** | **Brak** — wyłącznie warstwa UI `PayrollView` (+ minimalny `readOnly` w `WeekEmployeeDetail`) |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

```text
AUDIT B5:        COMPLETE
DESIGN FREEZE:   DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:       NO GO
```

---

## 1. Goal

**Problem (RCA-2):** `PayrollView` renderuje tydzień historyczny (closed) częściowo ze snapshotu archiwum (`archivedForWeek.weekEmployees`), ale mutacje, selekcja wiersza, gate’y pustej listy i eksport nadal opierają się na live `weekEmployees` (`kw-week-employees`). Po rolloverze lub nawigacji wstecz użytkownik widzi baner „podgląd ze snapshotu”, lecz UI zachowuje się jak operacyjny — w tym ryzyko mutacji **bieżącego** tygodnia podczas podglądu **historycznego**.

**Cel B5:** Ujednolicić **jedno źródło wyświetlania** (`displayEmployees`) w `PayrollView` i wymusić **tryb read-only** dla tygodnia closed (`isPayrollWeekClosedForUi === true`), bez zmiany semantyki lib (`payroll-cycle`, rollover, sync) ani modelu KV.

**Sukces biznesowy:** Administrator może bezpiecznie przeglądać historyczny tydzień w Liście Płac (tabela, panel szczegółów, PDF/DOCX) ze snapshotu; edycja historii pozostaje w zakładce **Archiwum**.

---

## 2. Scope

### 2.1 Bundle B5 — zakres IMPLEMENT (plan)

| ID | Element | Opis |
|----|---------|------|
| **B5-1** | `displayEmployees` SSOT | Jedna pochodna lista w `PayrollView` dla tabeli, selekcji, gate’ów, eksportu, liczników |
| **B5-2** | Read-only closed | Gdy `isClosedWeek` — brak mutacji rosteru z LP (dodaj/usuń/save/settled/delete/edycja dni/stawek) |
| **B5-3** | Empty state closed bez snapshotu | Brak fallbacku na live `weekEmployees`; komunikat + CTA do Archiwum |
| **B5-4** | `showRestoreBanner` | Tylko gdy `!isClosedWeek` (operacyjny tydzień z bogatszym archiwum) |
| **B5-5** | Panel szczegółów | `selectedEmp` z `displayEmployees`, nie z `weekEmployees` |
| **B5-6** | `WeekEmployeeDetail.readOnly` | Edytory disabled gdy closed (defer już ukryty — bez zmiany logiki defer) |
| **B5-7** | Tryb Przydziały | Gdy closed — read-only lub ukrycie tab „Przydziały robót” (preferowane: ukrycie / disable switch) |
| **B5-8** | Test RCA-2 | `scripts/test-payroll-closed-week-ui-rca2.mjs` — **NOWY** |
| **B5-9** | Docs release | `changelog-data.ts`, `CHANGELOG.md`, `docs/ARCHITECTURE.md` §10.1 (jedna linia) |

### 2.2 Pliki objęte IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `src/app/PayrollView.tsx` | SSOT `displayEmployees`, read-only gating, empty state, banner, selekcja |
| `src/app/WeekEmployeeDetail.tsx` | Prop `readOnly?: boolean` — disable inputów / przycisków edycji |
| `scripts/test-payroll-closed-week-ui-rca2.mjs` | **NOWY** |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §10.1 | jedna linia — B5 closed week read-only UI |

### 2.3 Bez zmian (explicit)

| Plik / warstwa | Powód |
|----------------|-------|
| `src/lib/payroll-cycle.ts` | Semantyka saved/closed zamknięta (20.1B/20.1D) |
| `src/lib/payroll-rollover.ts` | Blockers → operacyjny wyjątek — bez zmian |
| `src/lib/cloud-sync.ts` | B4 merge SSOT — bez zmian |
| `src/app/CloudLoader.tsx` | Bootstrap — bez zmian |
| `src/app/App.tsx` | **Poza scope B5** — orchestracja rollover/snapshot bez refaktoru (chyba że wymagany 1-liner guard w LP wystarczy w `PayrollView`) |
| `src/app/ArchiveView.tsx` | SSOT edycji historii — bez zmian |
| `src/app/admin/AdminViewRouter.tsx` | `onWeekChange` — bez zmian (tylko daty; read-only w LP wystarczy) |
| `CloudSyncMutationGuard` | B3 CLOSED |

**Zakaz:** mieszania B5 z B6, TEST-INFRA, refaktorem `App.tsx` rollover, zmianą `onWeekChange` do ładowania rosteru per week.

---

## 3. Out of scope

| Element | Powód wyłączenia |
|---------|------------------|
| Zmiana `isPayrollWeekSaved` / `isPayrollWeekClosed` / `isPayrollWeekClosedForUi` | Sprint 20.1B/20.1D CLOSED |
| `finalizePayrollBundleMerge` / `applyBootstrapPayrollMerge` | B4 CLOSED |
| `CloudSyncMutationGuard` / roster push | B3 CLOSED |
| Edge `batch-set` merge `directoryId` vs UUID | B6 osobny bundle |
| Per-week `kw-week-employees` w KV | Nowy model danych |
| Pełna edycja historii w Liście Płac | Zostaje w `ArchiveView` (`patchArchiveWeek`) |
| `restoreWeekFromArchive` zmiana semantyki w `App.tsx` | Operacyjny restore — tylko gdy `!isClosedWeek` (banner już gated w LP) |
| `TEST-INFRA-001` Playwright harness | Osobny epic |
| Nowe Principles #014+ | Zakaz |
| Refactor `payrollEmployees` → shared hook poza `PayrollView` | Over-engineering — scope MIN |
| Zmiana `autoArchiveAndAdvance` / `tryPayrollWeekCycle` | Poza RCA-2 |
| `PayrollJobAssignmentsPanel` nowy moduł guard | Wystarczy ukrycie/disable trybu w `PayrollView` |

---

## 4. SSOT principles

### 4.1 Istniejące Principles (wiążące — bez nowych)

Obowiązują **#001–#013** z freeze P0 roster + guard. B5 **nie wprowadza** nowych numerów.

### 4.2 SSOT warstw po B5

| Warstwa | SSOT | Uwagi |
|---------|------|-------|
| **Wykrycie closed (UI)** | `isPayrollWeekClosedForUi(weekFrom, weekTo, hasRolloverBlockers)` | `payroll-cycle.ts` — **reuse, bez zmian** |
| **Wykrycie saved** | `isPayrollWeekSaved(savedWeeks, weekFrom, weekTo)` | **reuse** |
| **Blockers rollover** | `hasPayrollRolloverBlockers` | `payroll-rollover.ts` — **reuse** |
| **Snapshot archiwum** | `savedWeeks.find(w => w.weekFrom/weekTo)` → `WeekSnapshot.weekEmployees` | `kw-archive` |
| **Operacyjny roster (mutacje)** | `weekEmployees` → `kw-week-employees` | Tylko gdy `!isClosedWeek` |
| **Wyświetlanie w LP** | **`displayEmployees`** (nowy SSOT **wyłącznie w PayrollView**) | Patrz §6 |
| **Edycja historii** | `ArchiveView` + `patchArchiveWeek*` | **Bez zmian** |
| **Defer ⏭** | `canDeferPayroll(..., isClosedWeek)` | Już blokuje `closed_week` |
| **Merge/sync chmury** | `finalizePayrollBundleMerge` | B4 — **bez zmian** |

### 4.3 Zasady freeze (B5-specific)

| # | Zasada |
|---|--------|
| **B5-P1** | `displayEmployees` jest **jedynym** źródłem dla renderu tabeli, panelu, PDF/DOCX args, empty gate, settled count w `PayrollView` |
| **B5-P2** | `weekEmployees` (live KV) **nie** może być używane do display gate’ów gdy `isClosedWeek` |
| **B5-P3** | `isClosedWeek` implikuje **read-only** w LP — mutacje live KV z LP są **zabronione** |
| **B5-P4** | Closed bez snapshotu → **pusta lista display**, nie fallback live |
| **B5-P5** | Nie duplikować logiki `ArchiveView` — LP closed = podgląd; Archiwum = edycja |
| **B5-P6** | `isSavedWeek && !isClosedWeek` pozostaje w pełni operacyjny (bez regresji 20.1B) |

---

## 5. UI state transitions

### 5.1 Stany `PayrollView` (po B5)

| Stan ID | Warunek | `isClosedWeek` | Baner | `displayEmployees` | Tryb LP |
|---------|---------|----------------|-------|-------------------|---------|
| **S1 — Operacyjny** | `!isClosedWeek` | false | opcjonalnie sobota | `weekEmployees` | **Edycja** |
| **S2 — Saved operacyjny** | `isSavedWeek && !isClosedWeek` | false | emerald | `weekEmployees` | **Edycja** + refresh snapshot |
| **S3 — Closed + snapshot** | `isClosedWeek && archivedForWeek?.weekEmployees?.length` | true | violet | `archivedForWeek.weekEmployees` | **Read-only** |
| **S4 — Closed bez snapshotu** | `isClosedWeek && !archivedForWeek?.weekEmployees?.length` | true | violet + empty hint | `[]` | **Read-only** (pusty) |

### 5.2 Diagram przejść

```text
                    onWeekChange / rollover / czas
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    [S1 Operacyjny]    [S2 Saved oper.]     (S1 ⊆ S2 gdy saved)
         │                    │
         │  kalendarz za      │  ten sam
         │  getPayrollWeekRange│
         │  + brak blockers   │
         ▼                    ▼
    [S3 Closed+snap] ◄─── has archivedForWeek.weekEmployees
         │
         │  brak weekEmployees w archiwum
         ▼
    [S4 Closed empty]

Wyjątek 20.1D (bez zmian):
  hasRolloverBlockers → isClosedWeek=false → pozostaje S1/S2 (operacyjny)
```

### 5.3 Przejścia wywoływane przez użytkownika

| Akcja | Ze stanu | Do stanu | Uwaga |
|-------|----------|----------|-------|
| Zmiana dat na W historyczny | S1/S2 | S3 lub S4 | **Bez** ładowania live rosteru |
| „Bieżący tydzień” | S3/S4 | S1 | `goToCurrent` / auto-advance — bez zmian w App |
| Podgląd PDF | S3 | S3 | Eksport ze snapshotu (`displayEmployees`) |
| Edycja dni | S1/S2 | S1/S2 | Dozwolona |
| Edycja dni | S3/S4 | — | **Zablokowana** (`readOnly`) |
| Zakładka Archiwum | dowolny | — | Pełna edycja snapshotu (poza B5) |

---

## 6. `displayEmployees` SSOT design

### 6.1 Definicja (freeze)

W `PayrollView.tsx` — **jedna** pochodna `useMemo`:

```text
displayEmployees :=
  IF isClosedWeek AND archivedForWeek?.weekEmployees?.length
    THEN archivedForWeek.weekEmployees
  ELSE IF isClosedWeek
    THEN []                                    ← B5-P4: brak live fallback
  ELSE
    weekEmployees
```

**Rename:** istniejące `payrollEmployees` → **`displayEmployees`** (semantyczna nazwa SSOT display).

### 6.2 Konsumenci `displayEmployees` (wszystkie muszą używać SSOT)

| Konsument | As-is (bug) | Po B5 |
|-----------|-------------|-------|
| `rows` / `calcWeekEmployeeForPayroll` | częściowo `payrollEmployees` | `displayEmployees` |
| `selectedEmp` | `weekEmployees.find` | `displayEmployees.find` |
| `weekEmployees.length === 0` empty gate | live | `displayEmployees.length === 0` |
| PDF/DOCX disabled | live | `displayEmployees.length === 0` |
| Licznik „rozliczonych” | live | `displayEmployees` |
| `cashSplit` input roster | `payrollEmployees` | `displayEmployees` (już OK — utrzymać) |
| `biweeklyMissingPrevWeekArchive` | live `weekEmployees` | **Bez zmian** — reguła operacyjna (tylko gdy `!isClosedWeek`) |

### 6.3 Co pozostaje na `weekEmployees` (live)

| Użycie | Kiedy |
|--------|-------|
| Props z `App.tsx` | Zawsze — źródło operacyjnych mutacji |
| `hasRolloverBlockers(weekEmployees, …)` | Zawsze — blockers dotyczą **bieżącego** rosteru w wybranym zakresie dat |
| `showRestoreBanner` richness compare | `currentRichness = weekEmployeesListRichness(weekEmployees)` — tylko gdy `!isClosedWeek` |
| Handlery `onAddFromDirectory`, `onToggleSettled`, … | Wywoływane **tylko** gdy `!isClosedWeek` (UI disabled / brak onClick) |

**Zakaz:** używania `weekEmployees` do renderu tabeli lub selekcji gdy `isClosedWeek`.

---

## 7. Read-only behavior for closed weeks

### 7.1 Warunek read-only

```text
isPayrollReadOnly := isClosedWeek
  (= isPayrollWeekClosedForUi(weekFrom, weekTo, hasRolloverBlockers))
```

Gdy `isPayrollReadOnly === true`:

### 7.2 Kontrolki LP — wyłączone / ukryte

| Kontrolka | Akcja |
|-----------|-------|
| Dodaj pracownika / picker | **Ukryte** lub `disabled` |
| Usuń wszystkich / Odśwież skład / Wszyscy aktywni | **Ukryte** |
| Stawki z kartoteki | **Ukryte** |
| Zapisz tydzień | **Ukryte** |
| Kopiuj z poprzedniego tygodnia | **Ukryte** |
| Przywróć z archiwum (banner) | **Nie pokazywać** (`showRestoreBanner` gated) |
| Rozliczony / Usuń wiersz | **Ukryte** lub `disabled` w tabeli |
| ⏭ Defer | Już ukryte (`!isClosedWeek`) — **bez zmian** |
| Tab „Przydziały robót” | **Ukryty** lub `disabled` (preferowane ukrycie) |
| Edycja w `WeekEmployeeDetail` | `readOnly={true}` |
| Email wypłat | **Dozwolony** tylko read (jeśli używa `rows` ze snapshotu) — bez mutacji rosteru |
| Podgląd PDF / PDF / Word | **Dozwolone** (eksport ze snapshotu) |
| Zmiana dat / Bieżący tydzień | **Dozwolone** (nawigacja) |

### 7.3 `WeekEmployeeDetail.readOnly`

| Element | `readOnly=true` |
|---------|-----------------|
| Input stawki | `disabled` |
| `PayrollDayEditor` (dni, Sob.pr.) | `disabled` / brak `onUpdate` |
| Koszty do zwrotu — dodaj/edytuj | `disabled` |
| Przycisk defer | już warunkowy — bez zmian |

**ArchiveView:** `WeekEmployeeDetail` **bez** `readOnly` — edycja snapshotu zamierzona.

### 7.4 Brak nowych ścieżek mutacji

B5 **nie** dodaje `patchArchiveWeek` do LP. Edycja historii = wyłącznie **Archiwum**.

---

## 8. Empty-state behavior when snapshot is unavailable

### 8.1 Warunek

```text
isClosedWeek === true
AND (archivedForWeek == null OR !archivedForWeek.weekEmployees?.length)
```

### 8.2 Zachowanie UI (freeze)

| Element | Zachowanie |
|---------|------------|
| `displayEmployees` | `[]` — **bez** fallbacku na `weekEmployees` |
| Baner violet | **Tak** — „Tydzień historyczny” z dopiskiem: brak zapisanego snapshotu dla tego zakresu |
| Tabela | Empty state (ikona + tekst) |
| Tekst empty | np. „Brak zapisanego archiwum dla tygodnia {weekFrom}–{weekTo}. Zapisz tydzień przed rolloverem lub otwórz zakładkę Archiwum.” |
| CTA | Link/przycisk „Przejdź do Archiwum” (jeśli `onSetView` dostępny) lub tekst informacyjny — **bez** mutacji danych |
| PDF/DOCX | **Disabled** (`displayEmployees.length === 0`) |
| Panel szczegółów | Niedostępny |
| Kontrolki mutacji | Wszystkie ukryte (read-only) |

### 8.3 Czego nie robić

- **Nie** pokazywać live `weekEmployees` z innego tygodnia przy banerze „historyczny”.
- **Nie** auto-restore z archiwum do live KV przy samym `onWeekChange` (to pozostaje wyłącznie jednorazowy mount effect w `App.tsx` — poza B5).

---

## 9. Acceptance Criteria

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **B5-AC1** | Gdy `isClosedWeek`, żadna akcja UI w LP nie wywołuje mutacji `weekEmployees` / `persistPayrollRoster` / `toggleSettled` / `onUpdateWeekEmployee*` | code review + test C3 |
| **B5-AC2** | Po rolloverze: nawigacja dat na W1 + snapshot istnieje → panel szczegółów otwiera się po kliknięciu wiersza | test C1 + smoke manual S1 |
| **B5-AC3** | Closed bez snapshotu: `displayEmployees=[]`, empty state, brak sprzeczności violet + live dane | test C2 |
| **B5-AC4** | `isSavedWeek && !isClosedWeek`: pełna edycja, refresh snapshot, defer — **bez regresji** | `smoke-test-payroll-carry-forward-20.1b.mjs` + test C4 |
| **B5-AC5** | Wyjątek 20.1D: `hasRolloverBlockers` → `isClosedWeek=false` → edycja dozwolona | `smoke-test-payroll-week-closed-20.1d.mjs` T1–T6 + test C5 |
| **B5-AC6** | **Single `displayEmployees` source:** tabela, `selectedEmp`, empty gate, PDF disable, settled count, eksport args — **wszystkie** czytają wyłącznie `displayEmployees`; grep `PayrollView` nie używa `weekEmployees` do renderu gdy `isClosedWeek` | code review + test C1–C3 |
| **B5-AC7** | `showRestoreBanner` tylko gdy `!isClosedWeek` | code review |
| **B5-AC8** | Brak zmian w `payroll-cycle.ts`, `cloud-sync.ts`, `CloudLoader.tsx` | code review |
| **B5-AC9** | `test-payroll-closed-week-ui-rca2.mjs` — **PASS** | automatyczny |
| **B5-AC10** | `npm run build` PASS | BUILD gate |

### Smoke manualny (po IMPLEMENT)

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| **S1** | Po rolloverze: daty na poprzedni tydzień z archiwum | Tabela + panel ze snapshotu; brak przycisków edycji |
| **S2** | Bieżący tydzień operacyjny: edycja godzin, zapis | Bez regresji |
| **S3** | Nd≥20:00 + nierozliczona kasa: defer ⏭ widoczny | Operacyjny tryb (20.1D) |

---

## 10. Files affected

### 10.1 IMPLEMENT (zmiany kodu)

| Plik | Typ zmiany |
|------|------------|
| `src/app/PayrollView.tsx` | **PRIMARY** — displayEmployees, read-only, empty state, banner |
| `src/app/WeekEmployeeDetail.tsx` | **MINOR** — prop `readOnly` |
| `scripts/test-payroll-closed-week-ui-rca2.mjs` | **NEW** |

### 10.2 Release docs (po IMPLEMENT)

| Plik |
|------|
| `src/app/changelog-data.ts` |
| `CHANGELOG.md` |
| `docs/ARCHITECTURE.md` §10.1 |
| `docs/PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md` (status → IMPLEMENT COMPLETE) |
| `docs/PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md` (po VERIFY — osobny dokument) |

### 10.3 Read-only reference (bez zmian w B5)

| Plik |
|------|
| `src/app/App.tsx` |
| `src/app/ArchiveView.tsx` |
| `src/app/admin/AdminViewRouter.tsx` |
| `src/lib/payroll-cycle.ts` |
| `src/lib/payroll-rollover.ts` |
| `src/lib/payroll-leave-overlay.ts` |
| `src/lib/cloud-sync.ts` |
| `src/app/CloudLoader.tsx` |

---

## 11. Test plan

### 11.1 Gate regresji (obowiązkowe przed release)

```bash
# B5 — nowy
npx vite-node scripts/test-payroll-closed-week-ui-rca2.mjs

# Lib semantics closed (20.1D)
npx vite-node scripts/smoke-test-payroll-week-closed-20.1d.mjs

# Saved vs closed carry
npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs
npx vite-node scripts/pre-commit-verify-20.1b.mjs

# B4 merge (brak regresji sync)
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs

# Guard + roster (B3)
npx vite-node scripts/test-payroll-roster-guard-phase2.mjs

# BUILD
npm run build
```

### 11.2 `test-payroll-closed-week-ui-rca2.mjs` — scenariusze (spec freeze)

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| **C1** | `isClosedWeek` + archiwum + `weekEmployees=[]` | `displayEmployees` = snapshot; `selectedEmp` resolvable po id z snapshot |
| **C2** | `isClosedWeek` + brak `archivedForWeek.weekEmployees` | `displayEmployees=[]`; **nie** `weekEmployees` |
| **C3** | `isClosedWeek` | `isPayrollReadOnly` → handlery mutacji nie powinny być wywołane (unit/logic) |
| **C4** | `isSavedWeek && !isClosedWeek` | `displayEmployees === weekEmployees`; defer OK |
| **C5** | blockers + kalendarz za (20.1D) | `isClosedWeek=false`; `displayEmployees === weekEmployees` |

Implementacja testu: czyste funkcje wyciągnięte z logiki `displayEmployees` (vite-node import z `PayrollView` helper lub lokalna replika formuły freeze §6.1 — **bez** duplikacji poza jednym helperem exportowanym z `PayrollView` lub `payroll-display.ts` — **decyzja IMPLEMENT:** preferowane inline helper w `PayrollView` + export named `resolvePayrollDisplayEmployees` dla testu; **tylko jeśli** nie zwiększa scope — alternatywa: test replikuje formułę §6.1 dosłownie).

### 11.3 VERIFY prod (po release)

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: 2.63.22 (lub kolejny patch)
```

Smoke manual S1–S3 (§9).

---

## 12. Release impact

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.22** (patch) |
| **Commit scope** | 1 commit B5 preferowany (izolacja review) |
| **RELEASE MODE** | **FAST RELEASE** (frontend-only, <10 plików kodu + docs) |
| **HOTFIX CLASSIFICATION** | BUGFIX + UX |
| **Deploy** | Vercel only — **bez** Supabase Edge |
| **STABILIZATION WINDOW** | Świadomy hotfix payroll UI — na polecenie właściciela po DESIGN FREEZE GO |
| **Ryzyko prod** | Niskie–średnie: dotyczy wyłącznie widoku LP dla tygodni historycznych; operacyjny tydzień bez zmian semantyki |
| **Użytkownicy dotknięci** | Admin/Moderator — Lista Płac, podgląd tygodni wstecz |
| **Breaking** | Brak zmian KV/API |

### Mapa plików per commit

```text
Commit 1 — B5 IMPLEMENT:
  src/app/PayrollView.tsx
  src/app/WeekEmployeeDetail.tsx
  scripts/test-payroll-closed-week-ui-rca2.mjs

Commit 2 — docs/release (opcjonalnie ten sam commit):
  changelog-data.ts, CHANGELOG.md, ARCHITECTURE.md §10.1
  PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md (status)
```

**Zakaz:** mieszania z B6, Mobile, Tender, TEST-INFRA w tym samym commicie.

---

## 13. Rollback plan

### 13.1 Werdykt rollback

| Poziom | Akcja |
|--------|-------|
| **L1 — Vercel revert** | Przywrócenie deploymentu **v2.63.21** (`b3d5664`) — **preferowane** |
| **L2 — Git revert** | `git revert <commit-b5>` na `main` + redeploy |
| **L3 — Hotfix forward** | Tylko gdy revert niemożliwy — minimalny patch przywracający poprzednie zachowanie `payrollEmployees` |

### 13.2 Dane / KV

| Aspekt | Rollback impact |
|--------|-----------------|
| `kw-week-employees` | **Brak migracji** — rollback UI nie wymaga restore KV |
| `kw-archive` | **Brak zmian** w B5 — rollback bezpieczny |
| Chmura | Brak zmiany kontraktu push/merge |

### 13.3 Sygnały do rollback

- Regresja: operacyjny tydzień nieedytowalny przy `!isClosedWeek`
- Regresja: 20.1D blockers — defer zablokowany błędnie
- Panel szczegółów nadal niedostępny po fix (AC2 fail w prod)
- Nowe mutacje live KV pod closed week (AC1 fail)

### 13.4 Weryfikacja po rollback

```bash
curl -s https://www.wgdom.fun/version.json   # → 2.63.21
npx vite-node scripts/smoke-test-payroll-week-closed-20.1d.mjs
```

Dokumentacja: wpis w `INCIDENTS-2026-06.md` jeśli P0; aktualizacja `CURRENT-TASK.md` — B5 wraca OPEN.

---

## 14. GO / NO GO

### 14.1 Warunki GO (IMPLEMENT)

| # | Warunek | Status |
|---|---------|--------|
| G1 | AUDIT B5 zatwierdzony | **TAK** |
| G2 | DESIGN FREEZE B5 zaakceptowany przez właściciela repo | **CZEKA** |
| G3 | Scope ograniczony do §2 (bez B6, sync, lib) | **TAK** |
| G4 | Brak nowych Principles / KV | **TAK** |
| G5 | STABILIZATION WINDOW — świadome wejście na polecenie | **CZEKA** |

### 14.2 Werdykt

| Werdykt | Warunek |
|---------|---------|
| **DESIGN FREEZE GO** | G1 + G3 + G4 + akceptacja §1–§13 przez właściciela |
| **IMPLEMENT GO** | DESIGN FREEZE GO + G2 + G5 + explicit polecenie IMPLEMENT |
| **IMPLEMENT NO GO** | Rozszerzenie o B6/sync/App rollover · zmiana `payroll-cycle` · per-week KV |

### 14.3 Stan dokumentu

```text
DESIGN FREEZE: DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:     NO GO (zabroniony do akceptacji)
```

---

*SSOT freeze B5: ten plik · IMPLEMENT tylko na explicit polecenie po DESIGN FREEZE GO.*
