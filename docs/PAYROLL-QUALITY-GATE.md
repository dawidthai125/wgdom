# PAYROLL QUALITY GATE (procedura pre-merge — BACKLOG)

> **Typ:** Obowiązkowa procedura kontroli jakości **przed każdym merge dotyczącym Payroll lub Cloud Sync**.
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** v2.63.27
> **Status:** 📋 **PLAN / BACKLOG** — dokument referencyjny; egzekwowanie po zamknięciu aktywnego P0 (S7-5/F1).
> **Powiązanie:** [`PAYROLL-CERTIFICATION-SUITE.md`](PAYROLL-CERTIFICATION-SUITE.md) (definicje testów), [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) (baseline requestów).
> **Workflow:** PLAN → BACKLOG → STOP. Bez zmian kodu, BUILD, COMMIT.

---

## 0. Zasada nadrzędna

> **Żaden merge dotykający Payroll lub `cloud-sync.ts` nie trafia na `main` bez przejścia Quality Gate.**

Gate = zestaw poziomów testów + checklista + jednoznaczny werdykt **BLOCKED / ALLOWED**. Zakres wymaganych testów zależy od **typu zmiany** (§2). Definicje testów: `PAYROLL-CERTIFICATION-SUITE.md`.

---

## 1. Poziomy testów

| Poziom | Zakres | Czas | Źródło | Kiedy |
|--------|--------|------|--------|-------|
| **L1 · Smoke** | 8 kroków krytycznych (SM-1…SM-7 + SM-CLEAN) | 2–3 min | Suite §4 | każda zmiana dotykająca Payroll UI/logiki |
| **L2 · Regression** | 27 funkcji C-F01…C-F27 (SETUP→VERIFY CLEAN) + Blok C skrypty | 30–60 min | Suite §2, §5.3 | zmiana logiki Payroll / kalkulacji / archiwum |
| **L3 · Multi Device** | 10 scenariuszy C-MD-* (2/3 dev, offline, stale, hard reload, focus, visibility) | 60–90 min | Suite §3 | zmiana sync/merge/LWW/tombstonów/guardów |
| **L4 · Certification** | L1+L2+L3 + VERIFY CLEAN globalny + Production Observation | pełny cykl | Suite całość | zmiana architektury sync / bundle / Edge / release major |

**Zależność:** wyższy poziom **zawiera** niższe (L4 ⊃ L3 ⊃ L2 ⊃ L1). L3 nie może być PASS bez wcześniejszego L1+L2 PASS.

---

## 2. Macierz: typ zmiany → wymagany poziom

| Typ zmiany | Przykład | L1 | L2 | L3 | L4 |
|------------|----------|:--:|:--:|:--:|:--:|
| **Kosmetyka UI** (label, styl, kolejność) | zmiana tekstu przycisku | ✅ | — | — | — |
| **UI logika bez danych** | filtr widoku, sortowanie listy | ✅ | ✅ | — | — |
| **Kalkulacja Payroll** | brutto/netto, zaliczka, extraCost sum | ✅ | ✅ | — | — |
| **Model danych `WeekEmployee`** | nowe pole, zmiana `DayData` | ✅ | ✅ | ✅ | — |
| **Merge / LWW** | `mergeWeekEmployees`, `dataUpdatedAt` | ✅ | ✅ | ✅ | ✅ |
| **Tombstones** | `*-deleted-ids`, F2/S7-5 | ✅ | ✅ | ✅ | ✅ |
| **Cloud Sync transport** | bundle split PR-PERF-S1, `runCloudSync` | ✅ | ✅ | ✅ | ✅ |
| **Edge (`index.tsx`)** | `batch-set`, `kv.mset`, parity | ✅ | ✅ | ✅ | ✅ |
| **Guardy** | `CloudSyncMutationGuard`, `applyPayrollGuardBeforePush` | ✅ | ✅ | ✅ | — |
| **Rollover / Archive / Restore** | `tryPayrollWeekCycle`, anti-leak | ✅ | ✅ | ✅ | — |
| **Release major Payroll** | epic close, wersja X.Y.0 | ✅ | ✅ | ✅ | ✅ |

> **Reguła eskalacji:** jeśli zmiana dotyka **więcej niż jednego** typu, obowiązuje **najwyższy** wymagany poziom. Wątpliwość → poziom wyższy.

---

## 3. Checklista Quality Gate

> Wypełnić dla konkretnego merge. Każda pozycja: PASS / FAIL / N/A + notatka. Poziom wg §2.

```
MERGE: <opis> · HEAD: <commit> · Typ zmiany: <…> · Wymagany poziom: L<n>

□ Smoke PASS                    (L1 — 8/8; wymagane zawsze)
□ Regression PASS               (L2 — 27/27 funkcji + Blok C skrypty)
□ Multi Device PASS             (L3 — 10/10 scenariuszy; F1/F2 = known)
□ VERIFY CLEAN PASS             (local + cloud == baseline; brak sierocych tombstonów)
□ No New Bugs                   (BUG Register bez nowych wpisów P0/P1)
□ Known Bugs unchanged          (F1, F2, RS-2, H1 — status i zachowanie bez zmian)
□ Production Observation PASS   (L4 — metryki sync/resurrection po deploy; patrz §3.1)
```

Pozycje **niewymagane** dla danego poziomu → oznacz `N/A` (nie „PASS”).

### 3.1 Production Observation (tylko L4)
Po deploy, okno obserwacji (min. 1 cykl payroll / 24 h):
- `__wgdomSyncMetrics()` — `batchGet`/`batchSet`/`pushSkipped` w normie, brak push-storm.
- Brak resurrection (roster stabilny między urządzeniami).
- Brak HTTP 500 `batch-set` (H1).
- Liczba requestów **nie gorsza** niż baseline (`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`).

---

## 4. Definicja werdyktu

### 4.1 Merge BLOCKED — jeśli **którekolwiek**:
- L1 Smoke FAIL (jakikolwiek z 8).
- Wymagany L2/L3/L4 nie wykonany lub FAIL.
- **VERIFY CLEAN FAIL** — stan nie wraca do baseline (utrata/rozjazd danych).
- **No New Bugs FAIL** — nowy BUG P0/P1 (utrata danych, resurrection, settled cofnięty, shrink roster).
- **Known Bugs changed** — regresja znanego defektu (np. F1 rozszerza zakres, F2 na nowej ścieżce).
- Wzrost liczby requestów sync bez uzasadnienia (przy zmianie Cloud Sync).
- L4 wymagany, a Production Observation FAIL lub pominięty.

### 4.2 Merge ALLOWED — tylko gdy **wszystkie**:
- Wszystkie wymagane poziomy (wg §2) = PASS.
- VERIFY CLEAN globalny = PASS.
- Zero nowych BUG P0/P1.
- Znane defekty (F1/F2/RS-2/H1) — status i zachowanie **niezmienione**.
- Dla L4: Production Observation = PASS.

> **Wyjątek świadomy:** merge z **known FAIL** (F1/F2) dozwolony **wyłącznie**, gdy zmiana **nie dotyka** ich obszaru i właściciel jawnie akceptuje (wpis w raporcie). Nowy P0/P1 = zawsze BLOCKED.

---

## 5. Przykładowy raport końcowy

```
========================================
PAYROLL QUALITY GATE — RAPORT
========================================
Merge:            PR-XYZ — fix kalkulacja zaliczki netto
HEAD:             a1b2c3d
Typ zmiany:       Kalkulacja Payroll
Wymagany poziom:  L2 (Smoke + Regression)
Środowisko:       sandbox tydzień, 1 device (+2 dla L3 N/A)
Wykonawca:        <osoba> · Data: 2026-07-04

----------------------------------------
CHECKLISTA
----------------------------------------
☑ Smoke PASS                  8/8
☑ Regression PASS             27/27 funkcji · Blok C 9/9 skryptów
☐ Multi Device PASS           N/A (typ zmiany nie dotyka sync/merge)
☑ VERIFY CLEAN PASS           local + cloud == baseline
☑ No New Bugs                 BUG Register: 0 nowych
☑ Known Bugs unchanged        F1/F2/RS-2/H1 bez zmian
☐ Production Observation PASS N/A (nie L4)

----------------------------------------
METRYKI
----------------------------------------
Sync requests/edycja:  bez zmian vs baseline
batch-set 500:         brak

----------------------------------------
BUG REGISTER (nowe)
----------------------------------------
brak

----------------------------------------
WERDYKT
----------------------------------------
MERGE ALLOWED ✅
Uzasadnienie: wymagany poziom L2 spełniony; VERIFY CLEAN PASS;
brak nowych bugów; znane defekty niezmienione; L3/L4 N/A dla tego typu.
========================================
```

Wariant BLOCKED (dla kontrastu):
```
WERDYKT: MERGE BLOCKED ❌
Powód: C-F14 Settled FAIL — po toggle+sync settled cofa się na false
       (VERIFY CLEAN FAIL, No New Bugs FAIL → BUG-1 P1).
Akcja: NIE naprawiać w tym gate; zwrot do autora + wpis BUG-1 w Suite §9.
```

---

## 6. Rejestr powiązań
| Dokument | Rola |
|----------|------|
| [`PAYROLL-CERTIFICATION-SUITE.md`](PAYROLL-CERTIFICATION-SUITE.md) | definicje L1–L4, checklisty, BUG Register |
| [`PAYROLL-CERTIFICATION-2026-AUDIT.md`](PAYROLL-CERTIFICATION-2026-AUDIT.md) | znane defekty (F1, H) |
| [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) | baseline requestów |
| [`PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md`](PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md) | zmiana transportu → L4 |
| `docs/WORKFLOW-RELEASE-DEPLOY.md` | release/deploy po ALLOWED |

---

*SSOT Payroll Quality Gate: ten plik. PLAN / BACKLOG — bez implementacji, BUILD, COMMIT. Workflow: PLAN → BACKLOG → STOP.*
