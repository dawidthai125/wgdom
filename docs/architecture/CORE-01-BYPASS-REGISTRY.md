# CORE-01 — Bypass Registry

> **Status:** **ACTIVE** (read-only registry) · **Fixy:** CORE-01B (po RC-B-POST-RELEASE-01)  
> **Data:** 2026-07-04 · **Źródło:** audyt CORE-01 (2026-07-04)  
> **Design Freeze:** [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md)  
> **Zasada:** wpis w registry **nie implikuje** natychmiastowego fixu — CORE-01A tylko dokumentuje

---

## 1. Legenda

| Severity | Znaczenie |
|----------|-----------|
| **HIGH** | Może złamać G-0 lub I-4 w prod |
| **MEDIUM** | Drift LS/KV lub resurrection przy race |
| **LOW** | Dryft SSOT / maintenance risk |

| Status | Znaczenie |
|--------|-----------|
| **OPEN** | Aktywna luka |
| **WAIVED** | Znana; Gate CORE może FAIL z waiver do CORE-01B |
| **CLOSED** | Naprawione w CORE-01B |

---

## 2. Rejestr bypass (pełna tabela)

| ID | Severity | Status | Plik / ścieżka | Opis luki | Naruszony inwariant | Plan |
|----|----------|--------|----------------|-----------|---------------------|------|
| **BYP-H1** | HIGH | OPEN | `WorkerPhotoView.tsx` `syncWeekEmployees` | `setItem(kw-week-employees)` + `pushKeysToCloudSafe(["kw-week-employees"])` bez tombstones, bez PWRB, bez `replaceWeekEmployeesKeys` | I-4, G-0 | CORE-01B-1 |
| **BYP-H2** | HIGH | OPEN | `App.tsx` `clearAllWeekEmployees` | `pwrPush([])` bez `addDeletedWeekEmployeeKey` per usunięty pracownik | G-0, S2 | CORE-01B-2 |
| **BYP-H3** | HIGH | OPEN | `App.tsx` `filterProductionWeekEmployees` | `setWeekEmployees` filtruje roster bez `pwrRemove` / tombstonów | G-0 | CORE-01B-3 |
| **BYP-M1** | MEDIUM | OPEN | `cloud-sync.ts` `pushPayrollWeekAfterRollover` | Push roster bez coupled `kw-week-employees-deleted-ids` w tym samym batch | I-4 | CORE-01B-4 |
| **BYP-M2** | MEDIUM | OPEN | `App.tsx` `updateWeekEmployee*` (hours, rate, settled, carry) | Tylko LS via `useLocalStorage`; RS push wyklucza payroll (S1-1) — KV lag do następnego `pwrPush` | S1-1 (by design?) | CORE-01B-5 (polityka) |
| **BYP-M3** | MEDIUM | OPEN | `App.tsx` `restoreWeekFromArchive` | Local roster replace; brak domain push | cross-device drift | CORE-01B-6 |
| **BYP-M4** | MEDIUM | OPEN | `App.tsx` auto-restore empty week | Kopia archive → live roster; brak PWRB push | cross-device drift | CORE-01B-7 |
| **BYP-M5** | MEDIUM | OPEN | `App.tsx` `replaceWeekWithAllActive` | Full roster swap; displaced employees mogą nie mieć tombstonów | G-0 | CORE-01B-8 |
| **BYP-M6** | MEDIUM | OPEN | `CloudLoader.tsx` bootstrap push | `pushKeysToCloud` dla `kw-week-employees` bez `pushWeekEmployeesToCloud` coupled path | I-4 (częściowy) | CORE-01B-9 |
| **BYP-M7** | MEDIUM | OPEN | `App.tsx` `importBackup` post-merge | `pushAllDataToCloud` po `pwrImportMerge` — RS wyklucza payroll keys | wymaga explicit `pwrPush` verify | CORE-01B-10 |
| **BYP-M8** | LOW | OPEN | `App.tsx` `addFromDirectory` | Duplikuje `pwrAdd` inline; `pwrAdd` martwe w prod | SSOT dryft | CORE-01B-11 |
| **BYP-L1** | LOW | OPEN | `App.tsx` `restoreAllDataFromCloud` | `mergeDataKey` per DATA_KEYS bez `pwrImportMerge`/I-1 | G-0 przy restore | CORE-01B-12 |
| **BYP-L2** | LOW | OPEN | `pwrPullMerge` | Zdefiniowany, nieużywany | dead API | CORE-01B-13 (cleanup) |

---

## 3. Mapowanie na guard statyczny (CORE-01A)

| Bypass ID | Wykrywalny przez | Reguła | Oczekiwany wynik w 01A |
|-----------|------------------|--------|------------------------|
| BYP-H1 | `audit-pwrb-boundary` | CI-PWRB-7 | **FAIL** → waiver |
| BYP-H1 | `audit-core-ls-writes` | CI-CORE-LS-2 | **FAIL** → waiver |
| BYP-H2 | — | brak (logika, nie import) | manual registry |
| BYP-H3 | `audit-core-ls-writes` | CI-CORE-LS-2 | **FAIL** → waiver |
| BYP-M6 | — | brak w 01A | manual |
| BYP-M8 | — | brak | manual |

---

## 4. Procedura aktualizacji registry

1. Nowa luka wykryta w AUDIT → dodaj wiersz z ID `BYP-{severity}{n}`.
2. **Nie** fixuj w CORE-01A — przenieś do [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md).
3. Po fix w CORE-01B → status **CLOSED** + commit hash + test ID.
4. Usuń waiver z `test-manifest.json` gdy guard PASS.

---

## 5. Werdykt registry (2026-07-04)

| Metryka | Wartość |
|---------|---------|
| HIGH OPEN | 3 |
| MEDIUM OPEN | 7 |
| LOW OPEN | 2 |
| CLOSED | 0 |
| **Gotowość Gate CORE bez waiver** | **NIE** (wymaga CORE-01B lub waivers w manifest v1.2) |

---

*Registry read-only w CORE-01A · fixy wyłącznie CORE-01B po RC-B-POST-RELEASE-01*
