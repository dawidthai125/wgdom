# PAYROLL-CLOUD-RECOVERY — Etap 2 B5 · CLOSEOUT

> **Status:** **CLOSED** · **Data closeout:** 2026-07-01  
> **Prod baseline:** **v2.63.22** (`187afb8`) · **PRODUCTION VERIFIED**  
> **STABILIZATION WINDOW:** ACTIVE

---

## 1. Background

**Epic:** PAYROLL-CLOUD-RECOVERY — Etap 2 · **Bundle B5** (RCA-2: Closed Week UI)  
**Ticket legacy:** P0.1b  
**Baseline przed B5:** v2.63.21 (`b3d5664`) — B4 Bootstrap Merge SSOT CLOSED

Po zamknięciu B4 (jednolity merge payroll bootstrap/runtime) pozostał otwarty problem warstwy UI: Lista Płac przy tygodniu **historycznym** (closed) pokazywała baner „podgląd ze snapshotu”, ale część interakcji nadal operowała na live `kw-week-employees`. Użytkownik mógł przeglądać archiwum W1, podczas gdy mutacje rosteru dotykały bieżącego tygodnia W2 — szczególnie po rolloverze, gdy UUID snapshotu nie występowały w live rosterze.

**Cel biznesowy B5:** Bezpieczny podgląd historycznego tygodnia w Liście Płac (tabela, panel szczegółów, PDF/DOCX ze snapshotu) w trybie read-only; edycja historii wyłącznie w zakładce **Archiwum**.

**Workflow wykonany:**

```text
AUDIT B5 ✅ → DESIGN FREEZE B5 ✅ → IMPLEMENT ✅ → BUILD ✅ → TEST ✅ → RELEASE ✅ → VERIFY ✅ → CLOSEOUT
```

**Dokumenty źródłowe:**
- [`PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md`](PAYROLL-CLOUD-RECOVERY-B5-AUDIT.md)
- [`PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md)
- [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md)

---

## 2. RCA summary

**RCA-2 — Split-brain w `PayrollView`**

| Warstwa | As-is (bug) | Root cause |
|---------|-------------|------------|
| **Display** | Częściowo `payrollEmployees` (snapshot gdy closed + archiwum) | Niekompletna migracja do jednego SSOT |
| **Mutation / selection** | `weekEmployees` (live KV) | Brak gatingu read-only przy `isClosedWeek` |
| **Gates** | Empty state, PDF disable, licznik rozliczonych z live | Ten sam split-brain |
| **Panel szczegółów** | `selectedEmp = weekEmployees.find(id)` | Po rolloverze UUID ze snapshotu → `null` → panel się nie otwierał |
| **Closed bez archiwum** | Fallback na live `weekEmployees` | Sprzeczność z banerem „historyczny” |

**Mechanizm błędu (typowy flow po rolloverze):**

```text
Rollover W1 → W2 (weekEmployees = [], archiwum W1 w kw-archive)
Użytkownik ustawia daty na W1
  → isClosedWeek = true, baner violet
  → tabela ze snapshotu (payrollEmployees)
  → klik wiersza: selectedEmpId = UUID ze snapshotu
  → selectedEmp = weekEmployees.find(id) → null
  → panel szczegółów niedostępny LUB (gdy live niepusty) mutacje dotykają W2
```

**Co NIE było root cause (lib poprawne — bez zmian w B5):**
- `isPayrollWeekClosedForUi` + `hasPayrollRolloverBlockers` (20.1D)
- `finalizePayrollBundleMerge` / anti-leak (B4)
- `CloudSyncMutationGuard` (B3)
- `buildWeekSnapshot`, rollover w `App.tsx`
- `ArchiveView` + `patchArchiveWeek*` (SSOT edycji historii)

---

## 3. Audit conclusions

**Werdykt audytu:** RCA-2 **CONFIRMED** — bug wyłącznie w orchestracji UI `PayrollView`, nie w modelu KV ani merge sync.

### Główne naruszenia SSOT (V1–V6)

| ID | Naruszenie | Severity | Status po B5 |
|----|------------|----------|--------------|
| **V1** | Display SSOT ≠ Mutation SSOT (`payrollEmployees` vs `weekEmployees`) | PRIMARY | **Naprawione** — `displayEmployees` |
| **V2** | Gate’y (empty, export) z live zamiast display | HIGH | **Naprawione** |
| **V3** | `selectedEmp` z live KV | HIGH | **Naprawione** |
| **V4** | Baner „snapshot” + live fallback przy closed bez archiwum | MED | **Naprawione** — `[]` + empty state |
| **V5** | `onWeekChange` nie przełącza rosteru (by design) | MED | **Bez zmian** — read-only w LP wystarczy |
| **V6** | LP mutuje live zamiast `patchArchiveWeek` przy closed | HIGH | **Naprawione** — read-only + no-op handlery |

### Ryzyka zidentyfikowane w audycie

| Ryzyko | Ocena | Mitigacja B5 |
|--------|-------|--------------|
| Mutacja W2 podczas podglądu W1 | HIGH | Ukryte/wyłączone kontrolki mutacji gdy `isClosedWeek` |
| Panel szczegółów nieotwieralny po rolloverze | HIGH | `selectedEmp` z `displayEmployees` |
| Violet baner + live dane | MED | Brak fallbacku; empty state z komunikatem |
| Przydziały robót mutują `kw-jobs` | MED | Ukryty tab „Przydziały”; auto-switch do „Sumy” |
| `showRestoreBanner` na closed week | LOW | Gated `!isClosedWeek` |

### Wzorzec poprawny (bez zmian)

`ArchiveView` pozostaje SSOT edycji snapshotu historycznego — `WeekEmployeeDetail` bez `readOnly`, handlery `patchArchiveWeek*`.

---

## 4. Design Freeze summary

**Dokument:** [`PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-B5-DESIGN-FREEZE.md) · v1.0 · **APPROVED**

| Zasada freeze | Decyzja |
|---------------|---------|
| Nowe Principles | **Brak** (#001–#013) |
| Nowe pola KV | **Brak** |
| Zmiana merge/sync | **Brak** |
| Zmiana `payroll-cycle` / rollover | **Brak** |
| Zakres kodu | `PayrollView` + minimalny `readOnly` w `WeekEmployeeDetail` + test + docs |

### Zakres IMPLEMENT (B5-1 … B5-9)

| ID | Element | Delivered |
|----|---------|-----------|
| B5-1 | `displayEmployees` SSOT | ✅ |
| B5-2 | Read-only closed — brak mutacji rosteru | ✅ |
| B5-3 | Empty state closed bez snapshotu | ✅ |
| B5-4 | `showRestoreBanner` tylko `!isClosedWeek` | ✅ |
| B5-5 | `selectedEmp` z `displayEmployees` | ✅ |
| B5-6 | `WeekEmployeeDetail.readOnly` | ✅ |
| B5-7 | Ukrycie tab „Przydziały robót” gdy closed | ✅ |
| B5-8 | `test-payroll-closed-week-ui-rca2.mjs` | ✅ |
| B5-9 | CHANGELOG + ARCHITECTURE §10.1 | ✅ (w release commit) |

### Explicit out of scope (zachowane)

`App.tsx`, `ArchiveView`, `cloud-sync.ts`, `CloudLoader.tsx`, `payroll-cycle.ts`, `payroll-rollover.ts`, B6 Edge Parity, TEST-INFRA-001.

---

## 5. Implemented changes

**Release commit:** `187afb8` · **7 plików** · +277 / −45 linii

### `resolvePayrollDisplayEmployees` — SSOT display (`src/lib/payroll-display.ts`)

```text
IF !isClosedWeek        → weekEmployees (live)
IF isClosedWeek + arch  → archivedForWeek.weekEmployees (snapshot)
IF isClosedWeek, no arch → [] (bez live fallback)
```

Eksport czystej funkcji umożliwia testy C1–C5 bez mountu React.

### `PayrollView.tsx` (PRIMARY)

| Obszar | Zmiana |
|--------|--------|
| SSOT | `displayEmployees` zamiast `payrollEmployees`; konsumenci: `rows`, `cashSplit`, selekcja, gate’y, eksport |
| Read-only | Ukryte: dodaj/usuń/odśwież skład/zapisz/kopiuj/stawki z kartoteki; settled/delete w tabeli |
| Panel | `readOnly={isClosedWeek}`; no-op `onPatch*` gdy closed |
| Banery | Violet z dopiskiem gdy brak archiwum; `showRestoreBanner` gated |
| Przydziały | Tab ukryty; `useEffect` wraca do „Sumy” gdy closed |
| Empty state | Osobny komunikat closed vs operacyjny |
| Backlog biweekly | `backlogCheck` wyłączony gdy closed (reguła operacyjna) |

### `WeekEmployeeDetail.tsx` (MINOR)

- Prop `readOnly?: boolean`
- `disabled` / `readOnly` na stawce i kosztach; `pointer-events-none` na edytorach dni
- Ukryte: dodaj koszt, usuń, akceptuj/odrzuć gdy `readOnly`
- Defer ⏭ — bez zmian (już `!isClosedWeek`)

### Docs (release commit)

- `CHANGELOG.md`, `src/app/changelog-data.ts` → v2.63.22
- `docs/ARCHITECTURE.md` §10.1 — jedna linia B5

---

## 6. Tests executed

### B5 — nowy

| Skrypt | Wynik |
|--------|-------|
| `scripts/test-payroll-closed-week-ui-rca2.mjs` | **17/17 PASS** (C1–C5) |

| ID | Scenariusz | Wynik |
|----|------------|-------|
| C1 | Closed + archiwum + pusty live → snapshot; `selectedEmp` resolvable | PASS |
| C2 | Closed bez archiwum → `[]`, brak live fallback | PASS |
| C3 | Read-only gating w `PayrollView` (source checks) | PASS |
| C4 | Operacyjny tydzień → `displayEmployees === weekEmployees` | PASS |
| C5 | 20.1D blockers → UI operacyjny mimo kalendarza za | PASS |

### Regresja (gate przed release)

| Skrypt | Wynik |
|--------|-------|
| `smoke-test-payroll-week-closed-20.1d.mjs` | **6/6 PASS** |
| `smoke-test-payroll-carry-forward-20.1b.mjs` | **7/7 PASS** |
| `pre-commit-verify-20.1b.mjs` | **6/6 PASS** |
| `test-payroll-roster-guard-phase2.mjs` (B3) | **15/15 PASS** |
| `test-payroll-bootstrap-runtime-parity-b4.mjs` (B4) | **13/13 PASS** |
| `npm run build` | **PASS** |

---

## 7. Production release

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.22** |
| **Commit** | `187afb8` |
| **Branch** | `main` |
| **Typ** | FAST RELEASE · frontend-only · Vercel auto-deploy |
| **Poprzedni prod** | v2.63.21 (`b3d5664`) |
| **KV migration** | Brak |
| **Rollback** | Revert do `b3d5664` / v2.63.21 |

### Weryfikacja produkcji (jednorazowa)

`https://www.wgdom.fun/version.json`:

```json
{
  "version": "2.63.22",
  "commit": "187afb8",
  "timestamp": "2026-07-01T17:03:32.007Z"
}
```

**Status: PRODUCTION VERIFIED**

### Smoke manualny (rekomendowany po deploy)

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| S1 | Po rolloverze: daty na W1 z archiwum | Tabela + panel ze snapshotu; brak przycisków edycji |
| S2 | Bieżący tydzień: edycja godzin, zapis | Bez regresji |
| S3 | Nd≥20:00 + nierozliczona kasa | Defer ⏭ widoczny (20.1D operacyjny) |

---

## 8. Architecture impact

### Bez zmian (lib / KV / sync)

| Warstwa | Pliki |
|---------|-------|
| Semantyka saved/closed | `payroll-cycle.ts` |
| Rollover blockers | `payroll-rollover.ts` |
| Merge payroll SSOT | `cloud-sync.ts` (B4) |
| Guard push rosteru | B3 CLOSED |
| Orchestracja rollover/snapshot | `App.tsx` |
| Edycja historii | `ArchiveView.tsx` |

### Zmiana UI-only

```text
PayrollView
  ├── isClosedWeek = isPayrollWeekClosedForUi(...)     [reuse lib]
  ├── displayEmployees = resolvePayrollDisplayEmployees(...)  [NEW SSOT display]
  ├── isPayrollReadOnly := isClosedWeek
  └── konsumenci display: tabela · selectedEmp · export · empty · liczniki

WeekEmployeeDetail
  └── readOnly={isClosedWeek}   (ArchiveView: bez readOnly — edycja OK)
```

### SSOT warstw po B5

| Warstwa | SSOT |
|---------|------|
| Wykrycie closed (UI) | `isPayrollWeekClosedForUi` — lib |
| Wyświetlanie w LP | `displayEmployees` — `PayrollView` / `payroll-display.ts` |
| Mutacje rosteru | `weekEmployees` — tylko gdy `!isClosedWeek` |
| Edycja historii | `ArchiveView` + `patchArchiveWeek*` |
| Snapshot archiwum | `kw-archive` → `WeekSnapshot.weekEmployees` |

**ARCHITECTURE.md** §10.1 — dodana linia B5 closed week read-only UI (v2.63.22).

---

## 9. Lessons learned

1. **Partial SSOT jest gorszy niż brak SSOT.** Wprowadzenie `payrollEmployees` tylko do renderu tabeli bez migracji selekcji i gate’ów stworzyło split-brain trudniejszy do wykrycia niż czysty live-only UI.

2. **Baner UI ≠ gwarancja trybu.** Violet „historyczny” wymagał jawnego `isPayrollReadOnly` na wszystkich ścieżkach mutacji — nie wystarczy zmienić źródła danych w jednym `useMemo`.

3. **`onWeekChange` tylko daty to decyzja architektoniczna.** Historia żyje w `kw-archive`, nie w per-week KV. B5 naprawia objawy przez read-only w LP zamiast przebudowy modelu danych — zgodnie ze STABILIZATION WINDOW.

4. **Reuse komponentu wymaga `readOnly`.** `WeekEmployeeDetail` współdzielony przez LP i Archiwum — defer był już gated; brakowało ogólnego prop read-only dla edytorów.

5. **Czysta funkcja + test vite-node.** `resolvePayrollDisplayEmployees` w `payroll-display.ts` umożliwia C1–C5 bez Playwright i bez duplikacji formuły w teście.

6. **Regresja 20.1B/20.1D jest obowiązkowa.** Closed semantics to lib + UI — zmiana display nie może łamać wyjątku blockers (C5 / T1–T6).

---

## 10. Final verdict

```text
CLOSED — PAYROLL-CLOUD-RECOVERY Etap 2 B5
BASELINE v2.63.22 · COMMIT 187afb8 · PRODUCTION VERIFIED
RCA-2 split-brain PayrollView: RESOLVED
displayEmployees SSOT + read-only closed week UI
Lib/sync/KV: UNCHANGED
Backlog Etap 2 OPEN: B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE
```

| Etap | Status |
|------|--------|
| AUDIT B5 | ✅ COMPLETE |
| DESIGN FREEZE B5 | ✅ APPROVED |
| IMPLEMENT B5 | ✅ COMPLETE |
| BUILD | ✅ PASS |
| TEST (B5 + regresja) | ✅ PASS |
| RELEASE | ✅ v2.63.22 |
| PRODUCTION VERIFIED | ✅ |
| **B5 CLOSEOUT** | ✅ **CLOSED** |

### Łańcuch prod PAYROLL (pełny po B5)

```text
2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2
→ 2.63.18 B3 · 2.63.19 B3.1 · 2.63.20 B3.2 (Guard Phase CLOSED)
→ 2.63.21 B4 (Bootstrap Merge SSOT CLOSED)
→ 2.63.22 B5 (Closed Week UI CLOSED)
```

### Następny bundle (poza scope B5)

| ID | Temat | Status |
|----|-------|--------|
| **B6** | Edge Parity — merge `directoryId` vs UUID | OPEN |
| **TEST-INFRA-001** | Harness Playwright LP L0–L5 | READY · NOT STARTED |
