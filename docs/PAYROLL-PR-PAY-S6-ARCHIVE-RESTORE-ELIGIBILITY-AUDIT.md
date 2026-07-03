# PAYROLL — PR-PAY-S6 · Archive Restore Eligibility Guard · AUDIT + DESIGN FREEZE

> **Status:** `AUDIT COMPLETE` · `DESIGN FREEZE DRAFT` · **IMPLEMENT: NO GO**
> **Data audytu:** 2026-07-03
> **Baseline prod:** **GREEN** · **HEAD `b86fc3c`**
> **STABILIZATION WINDOW:** ACTIVE
> **Powiązane (CLOSED):** [`PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md`](PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md) (RB v2.63.24) · PR-PAY-S1…S5 (P0 Incident, `1d5b0b7`→`fd56cf7`)

```text
AUDIT:         COMPLETE
RCA:           CONFIRMED — banner i restore nie stosują tombstonów PR-PAY-S2 do strony ARCHIWUM
DESIGN FREEZE: DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:     NO GO
```

---

## 1. Root Cause

Baner metrykowy wprowadzony w RB (v2.63.24) działa poprawnie **jako metryka** (`payrollMetrics`: `activeDays` + `totalHours`), ale porównuje **niefiltrowany** skład archiwum. Sedno PR-PAY-S6:

> **Ani baner (`shouldShowPayrollRestoreBanner`), ani akcja przywracania (`restoreWeekFromArchive`) nie stosują tombstonów Week Employee (PR-PAY-S2) do strony ARCHIWUM (`kw-archive[week].weekEmployees`).**

Łańcuch defektu:

1. Pracownik (stary / smoke / testowy) zostaje **legalnie usunięty** z live → zapis tombstone `kw-week-employees-deleted-ids` (PR-PAY-S2, klucz per-tydzień `weekFrom|weekTo::mergeKey`).
2. Ten sam pracownik **pozostaje** w `kw-archive[week].weekEmployees` — trafił tam wcześniej przez `doSaveWeek` / rollover / union w `mergeArchive` / sync z drugiej karty.
3. Baner: `archivePayrollRicherThanLive(archivedForWeek.weekEmployees, live)` — archiwum ma **więcej dni/godzin**, bo liczy godziny usuniętego pracownika → **baner ON** mimo że bieżąca lista jest poprawna (false positive względem *uprawnionego* składu).
4. Klik „Przywróć z archiwum" → `restoreWeekFromArchive` wykonuje `setWeekEmployees(JSON.parse(JSON.stringify(snap.weekEmployees)))` — **surowy klon, bez filtra tombstonów** → **wskrzeszenie** starych/smoke pracowników.

**Kluczowa asymetria:** live jest chroniony tombstonami w warstwie merge (`finalizePayrollBundleMerge`, richness override), ale **archiwum nie jest filtrowane tombstonami przy odczycie, porównaniu banera ani przy restore**.

---

## 2. Evidence

| # | Obserwacja | Skutek |
|---|------------|--------|
| **EV1** | `shouldShowPayrollRestoreBanner` przyjmuje surowe `archivedWeekEmployees` i przekazuje do `archivePayrollRicherThanLive` bez filtra tombstonów | Baner ON dla usuniętych rekordów obecnych tylko w archiwum |
| **EV2** | `PayrollView.tsx` przekazuje `archivedForWeek?.weekEmployees` (surowe) do helpera banera | Brak eligibility na wejściu banera |
| **EV3** | `restoreWeekFromArchive` (App.tsx) robi `setWeekEmployees(JSON clone snap.weekEmployees)` bez `filterDeletedWeekEmployees` | Restore wskrzesza tombstonowanych / smoke |
| **EV4** | Tombstones PR-PAY-S2 (`deletedWeekEmployeeMergeKeySet`, `filterDeletedWeekEmployees`) używane w `finalizePayrollBundleMerge` i richness override, **ale nie** w banerze/restore | Ochrona tylko po stronie live-merge |
| **EV5** | „Smoke workers" nie mają dedykowanego markera — to synthetic week-employees seedowane przez harness (`e2e/fixtures/payroll-harness-seed.ts`, TI-B2.1 Preview First) do `kw-week-employees` + `kw-archive`; identyfikacja jak każdy rekord przez `weekEmployeeMergeKey` (`dir:` → `name:` → `id:`) | Traktowane jak każdy usunięty pracownik — ten sam guard je pokrywa |

---

## 3. Code References

Baner — `src/lib/cloud-sync.ts`:

```1091:1097:src/lib/cloud-sync.ts
export function shouldShowPayrollRestoreBanner(
  weekEmployees: unknown[],
  archivedWeekEmployees?: unknown[] | null,
): boolean {
  if (!Array.isArray(archivedWeekEmployees) || archivedWeekEmployees.length === 0) return false;
  return archivePayrollRicherThanLive(archivedWeekEmployees, weekEmployees);
}
```

Metryka porównania — `src/lib/cloud-sync.ts`:

```1076:1088:src/lib/cloud-sync.ts
/** Archiwum ma więcej dni aktywnych lub godzin niż live (PRIMARY warunek banera RB). */
export function archivePayrollRicherThanLive(
  archivedWeekEmployees: unknown,
  liveWeekEmployees: unknown,
  epsHours = PAYROLL_RESTORE_BANNER_EPS_HOURS,
): boolean {
  const archiveM = payrollMetrics(archivedWeekEmployees);
  const liveM = payrollMetrics(liveWeekEmployees);
  return (
    archiveM.activeDays > liveM.activeDays
    || archiveM.totalHours > liveM.totalHours + epsHours
  );
}
```

Wywołanie banera (surowe archiwum) — `src/app/PayrollView.tsx`:

```714:718:src/app/PayrollView.tsx
  const showRestoreBanner = Boolean(
    !isClosedWeek &&
    onRestoreFromArchive &&
    shouldShowPayrollRestoreBanner(weekEmployees, archivedForWeek?.weekEmployees),
  );
```

Restore bez filtra tombstonów — `src/app/App.tsx`:

```1203:1211:src/app/App.tsx
  const restoreWeekFromArchive = useCallback(() => {
    const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
    if (!snap?.weekEmployees?.length) {
      alert("Brak pełnego archiwum dla tego tygodnia. Sprawdź zakładkę Archiwum lub import backup JSON (górny pasek / ⚙ Ustawienia).");
      return;
    }
    if (!window.confirm(`Przywrócić godziny, Sob.pr. i dodatkowe wpisy z archiwum (${fmtDate(weekFrom)} – ${fmtDate(weekTo)})?`)) return;
    setWeekEmployees(JSON.parse(JSON.stringify(snap.weekEmployees)) as WeekEmployee[]);
  }, [savedWeeks, weekFrom, weekTo, setWeekEmployees]);
```

Istniejące (reużywalne) API tombstonów PR-PAY-S2 — `src/lib/cloud-sync.ts`:

```551:574:src/lib/cloud-sync.ts
/** Zbiór weekEmployeeMergeKey usuniętych DLA danego tygodnia (zdejmuje prefix). */
export function deletedWeekEmployeeMergeKeySet(
  deleted: string[],
  weekFrom: unknown,
  weekTo: unknown,
): Set<string> {
  const wk = weekRangeKey(weekFrom, weekTo);
  const prefix = `${wk}${WEEK_EMPLOYEE_TOMBSTONE_SEP}`;
  const set = new Set<string>();
  if (!wk) return set;
  for (const id of normalizeDeletedWeekEmployeeKeys(deleted)) {
    if (id.startsWith(prefix)) set.add(id.slice(prefix.length));
  }
  return set;
}

/** Usuń z listy rekordy, których weekEmployeeMergeKey znajduje się w tombstonach tygodnia. */
export function filterDeletedWeekEmployees(list: unknown[], tombstoned: Set<string>): unknown[] {
  if (tombstoned.size === 0) return list;
  return list.filter((item) => {
    if (!item || typeof item !== "object") return true;
    return !tombstoned.has(weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }));
  });
}
```

---

## 4. Audit Findings

| Element audytu | Ustalenie |
|---|---|
| **Funkcja banera** | `shouldShowPayrollRestoreBanner` → `archivePayrollRicherThanLive` → `payrollMetrics` (activeDays + totalHours, EPS `0.05` h). Poprawna metryka, **zła baza** (nieodfiltrowane archiwum). |
| **Porównanie archive/current** | Dwa magazyny: live `kw-week-employees` vs `kw-archive[weekFrom\|weekTo].weekEmployees`. Live chroniony tombstonami w merge; archiwum **nie** przy odczycie/porównaniu. |
| **Tombstones (PR-PAY-S2)** | Istnieją i działają w `finalizePayrollBundleMerge` / richness override. Klucz per-tydzień (`weekFrom\|weekTo::mergeKey`) — kolejne tygodnie (rollover/carry) nietknięte. **Nieużyte** w banerze i restore. |
| **Deleted IDs** | `kw-week-employees-deleted-ids` (S2) — per-tydzień. Dodatkowo `kw-directory-deleted-ids` (usunięci z kartoteki) — potencjalnie „starzy" pracownicy nadal w archiwum bez tombstone tygodnia (**wariant wtórny**, poza MIN). |
| **Smoke workers** | Brak dedykowanego markera. Synthetic week-employees z harness (`payroll-harness-seed.ts`, TI-B2.1, loopback/Preview First) w `kw-week-employees` + `kw-archive`. Identyfikacja przez `weekEmployeeMergeKey`. Pokryte tym samym guardem. |
| **Restore** | `setWeekEmployees(snap.weekEmployees)` surowo → wskrzesza tombstonowanych; nie stosuje anti-leak, nie pushuje. |

---

## 5. Design Freeze

**Zasada:** wprowadzić pojęcie **„eligible archive roster"** = `archive.weekEmployees` **minus** tombstones tygodnia (reuse PR-PAY-S2, Zero Duplicate Logic) i użyć go w **obu** miejscach: baner (G1) oraz restore (G2).

| ID | Zmiana | Plik (docelowy IMPLEMENT) |
|----|--------|---------------------------|
| **S6-1** | Nowy **pure** helper `eligibleArchiveWeekEmployees(archived, weekFrom, weekTo, deletedKeys?)` = `filterDeletedWeekEmployees(archived, deletedWeekEmployeeMergeKeySet(deletedKeys, weekFrom, weekTo))` | `src/lib/cloud-sync.ts` |
| **S6-2** | Baner (**guard G1**) liczony z **eligible** archiwum — helper przyjmuje przefiltrowaną listę lub dodatkowe argumenty `weekFrom/weekTo/deletedKeys` | `src/lib/cloud-sync.ts` + `src/app/PayrollView.tsx` |
| **S6-3** | `restoreWeekFromArchive` (**guard G2**) przywraca **eligible** roster, nie surowy `snap.weekEmployees` | `src/app/App.tsx` |
| **S6-4** | Test regresji false-resurrection | `scripts/test-payroll-archive-restore-eligibility-s6.mjs` (NOWY) |

**Zachowane (nie psuć):** metryka `payrollMetrics` i EPS RB · B5 gate `!isClosedWeek` · per-tydzień scope tombstonów (S2) · `mergeArchive` / `finalizePayrollBundleMerge` · Edge parity B6.

> **UWAGA:** powyższe to plan IMPLEMENT do przyszłego bundla. Ten dokument **nie** wprowadza żadnych zmian kodu.

---

## 6. Risks

| # | Ryzyko | Mitygacja |
|---|--------|-----------|
| **R1** | Dotknięcie ścieżki restore payroll (P0-wrażliwej) | Helper czysty (pure), pełne testy przed release |
| **R2** | Nadmierne filtrowanie ukryłoby realną stratę danych | AC7 — baner nadal ON dla nietombstonowanych rekordów obecnych tylko w archiwum |
| **R3** | Rozjazd klient↔Edge | Brak zmian Edge/merge — guard tylko po stronie odczytu/UI klienta |
| **R4** | Regresja PR-PAY-S2 week-scope | Test week-scope (tombstone CUR nie wpływa na NEXT) w gate regresji |
| **R5** | `kw-directory-deleted-ids` (usunięci z kartoteki) poza guardem MIN | Świadomie OOS — osobna decyzja właściciela |

---

## 7. Out Of Scope

| Element | Powód |
|---------|--------|
| Zmiana `mergeArchive` / B4 / B6 / union archiwum | Osobny epic sync |
| Auto-clamp `kw-archive` do live po `runCloudSync` | Ryzyko utraty danych z innej karty |
| Włączenie `kw-directory-deleted-ids` do guardu | Wariant wtórny — osobna decyzja |
| Zmiana progów `payrollMetrics` / EPS | Poza RCA S6 |
| Automatyczne przywracanie bez kliknięcia | UX / bezpieczeństwo |
| Zmiana `isClosedWeek` / B5 `displayEmployees` | B5 CLOSED |
| Nowe KV / Principles #014+ | Zakaz |
| Zmiany Edge `make-server-0afb8820` | Brak zmian serwerowych |

---

## 8. Test Plan

**Nowy:** `scripts/test-payroll-archive-restore-eligibility-s6.mjs` (po IMPLEMENT).
Import: `eligibleArchiveWeekEmployees`, `shouldShowPayrollRestoreBanner`, `payrollMetrics`, `deletedWeekEmployeeMergeKeySet`, `filterDeletedWeekEmployees`.

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| **T1** | Archiwum z 1 tombstonowanym (z godzinami), live poprawny; eligible == live | Baner **OFF** |
| **T2** | Realna strata: nietombstonowany pracownik z godzinami tylko w archiwum | Baner **ON** |
| **T3** | Restore z tombstonem | Live **nie** dostaje wskrzeszonego (eligible zastosowany) |
| **T4** | Tombstone tygodnia CUR nie wpływa na NEXT (week-scope) | Regresja S2 PASS |
| **T5** | Smoke worker (synthetic) tombstonowany, obecny w archiwum | Baner **OFF** + restore go pomija |
| **T6** | `archivedWeekEmployees` null / `[]` | Baner **OFF** |

**Gate regresji (obowiązkowe przed release, poza tym bundlem dokumentacyjnym):**

```bash
npx vite-node scripts/test-payroll-archive-restore-eligibility-s6.mjs
npx vite-node scripts/test-payroll-deletion-tombstones-pr-pay-s2.mjs
npx vite-node scripts/test-payroll-restore-banner-false-positive.mjs
npx vite-node scripts/test-payroll-closed-week-ui-rca2.mjs
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs
npx vite-node scripts/test-payroll-edge-parity-b6.mjs
npm run build
```

---

## 9. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC1** | `eligible(archive)` metryki == live → baner **OFF** |
| **AC2** | Realna strata (metryki eligible archiwum > live) → baner **ON** |
| **AC3** | Restore **nie** wskrzesza tombstonowanych / smoke workers |
| **AC4** | B5 gate `!isClosedWeek` zachowany |
| **AC5** | Regresja PR-PAY-S2 / RB / B4 / B6 PASS |
| **AC6** | Brak nowych KV / Principles |
| **AC7** | **Banner musi nadal pojawiać się w przypadku rzeczywistej utraty danych (nietombstonowane rekordy obecne wyłącznie w archiwum).** |

---

## GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT** | **COMPLETE** |
| **DESIGN FREEZE** | **DRAFT** — oczekuje akceptacji właściciela repo |
| **IMPLEMENT** | **NO GO** |

---

*SSOT audytu PR-PAY-S6: ten plik · bez zmian kodu · commit wyłącznie dokumentacyjny.*
