# PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01

> **Status:** **CLOSED** · **Data:** 2026-07-13  
> **Tryb:** DESIGN FREEZE → **Wariant B IMPLEMENTED** → **PRODUCTION VERIFIED**  
> **Powiązane audyty:** PAYROLL-WEEK-DATA-LOSS-01 · PAYROLL-ROSTER-ROOT-CAUSE-01  
> **Prod baseline:** **v2.65.14** @ **`26f3eb5`** (PAYROLL-ANTI-LEAK-FIX-01 CLOSED)  
> **Release verification:** [`docs/releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md`](../releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md)

---

## 1. Problem

Po wpisaniu godzin dla **nowego tygodnia płacowego** (2026-07-13–18) Owner widzi **pustą listę płac (0 osób)** mimo że dane zostały zapisane do chmury.

**SSOT Cloud KV (batch-get, readonly):**

| Pole | Wartość |
|------|---------|
| `kw-week-employees` | **14** pracowników |
| Aktywne dni (Pn) | **11** |
| `kw-weekFrom` / `kw-weekTo` | `2026-07-13` / `2026-07-18` |
| `dataUpdatedAt` | 2026-07-13 ~06:12–06:14 UTC |

**Utrata dotyczy wyłącznie ścieżki runtime apply** — nie KV.

---

## 2. Root Cause (potwierdzony)

```text
Cloud KV (14) ✓
    ↓ batch-get
mergeAllDataKeys → 14 ✓
    ↓
finalizePayrollBundleMerge → 14 ✓
    ↓
applyRuntimePayrollAntiLeak → 0 ✗  ← PIERWSZY PUNKT UTRATY
    ↓
reconcileAdminBundleWithFreshLocal (fresh React []) → 0
    ↓
applyAdminDataBundle → setWeekEmployees([]) → UI 0
```

**Winowajca:** `applyRuntimePayrollAntiLeak()` w `src/lib/cloud-sync.ts` (~2052).

**Nie są winowajcami:** `mergeAllDataKeys` · `finalizePayrollBundleMerge` · `reconcile*` · `applyAdminDataBundle` · `setWeekEmployees` (ostatnie dwa tylko materializują błąd).

**Warunek strzału (prod):**

```text
valuesForMerge[kw-week-employees].length === 0   // pusty lokalny snapshot
AND archive ma tydzień z richness ≥ 8            // poprzedni tydzień 15 os.
AND merged[kw-week-employees] richness > 0       // poprawne 14 z chmury
→ merged[kw-week-employees] = []
```

Funkcja **nie rozróżnia**:

- pustego lokalu **po rolloverze** (zamierzone), od
- pustego lokalu **przy focus pull** ze **świeżym**, poprawnym rosterem w Cloud **tego samego tygodnia**.

---

## 3. Historia — po co powstał anti-leak?

| Data / wersja | Kontekst |
|---------------|----------|
| **Sprint 20.1C** (2.49.20) | Auto-rollover Nd ≥20:00 — nowy tydzień płacowy |
| **Sprint 20.1C.1** (2.49.30) | **Incydent rollover leak:** po F5 / sync chmura ze **starym tygodniem** przywracała godziny na **nowy** pusty tydzień |
| **2.62.81** | „Odśwież skład” — opóźniony merge; anti-leak czyta LS (`test-payroll-refresh-team-race-p0.mjs`) |
| **PAYROLL B4** (2.63.21) | `finalizePayrollBundleMerge` = SSOT bootstrap + runtime; **anti-leak pozostaje runtime-only** |
| **PAYROLL-CERTIFICATION** | **P-INV-5:** rollover nie przecieka starymi danymi |
| **2026-07-13 P0** | Anti-leak kasuje **poprawny** roster bieżącego tygodnia z Cloud |

**Oryginalny cel:** po rolloverze UI ma **pusty** nowy tydzień; **stary KV** (bogaty skład poprzedniego tygodnia) nie może **z powrotem zalać** listy płac przez `pullFromCloudAndMerge` / focus sync.

**Mechanizm zamierzony:** jeśli lokalny payroll jest pusty, a archiwum poprzedniego tygodnia bogate, a merge z chmury coś przywrócił → **wyczyść** (traktuj jako leak).

---

## 4. Inwarianty, które anti-leak miał chronić

| ID | Inwariant |
|----|-----------|
| **AL-INV-1** | Po rolloverze nowy tydzień Pn–So startuje z **pustym** `kw-week-employees` w UI |
| **AL-INV-2** | Godziny / skład **poprzedniego** tygodnia **nie wracają** na bieżący tydzień przez sync/pull |
| **AL-INV-3** | Bogate **archiwum** poprzedniego tygodnia ≠ sygnał do repopulacji live rosteru |
| **AL-INV-4** | Anti-leak **tylko runtime** (`computeMergedDataBundle`) — bootstrap F5 używa `finalizePayrollBundleMerge` bez anti-leak |
| **AL-INV-5** | Rollover push (`pushPayrollWeekAfterRollover`) zapisuje pusty skład + nowy zakres do KV |

**Powiązane (już w innych warstwach):**

| ID | Warstwa | Rola |
|----|---------|------|
| **20.1C.1** | `finalizePayrollBundleMerge` week mismatch | nie adoptuj chmury z **innego** `weekFrom/weekTo` |
| **PR-PAY-S1** | `mergeWeekEmployeesForWeekRange` | twardy week-scope guard |
| **P11** | richness override w finalize | adoptuj bogatszą chmurę **tego samego** tygodnia |
| **PAYROLL-RACE** | `reconcilePayrollKeysWithFreshLocal` | świeży React/LS po await merge |

---

## 5. Odpowiedzi na pytania Owner Review

### 5.1 Po co istnieje `applyRuntimePayrollAntiLeak()`?

Blokada **rollover leak (RC-04c):** stary bogaty KV nie może ponownie wypełnić **zamierzenie pustego** nowego tygodnia po Nd ≥20:00 / `autoArchiveAndAdvance`.

Historyczny incydent: **20.1C.1 STALE_KV** — F5 lub focus pull po rolloverze przywracał godziny poprzedniego tygodnia.

### 5.2 Czy `payrollSource.length === 0` jest nadal poprawny po JOBS-SYNC-FIX-01 / MF-2?

**NIE — w pełnym pipeline sync.**

| Element | Wpływ MF-2 |
|---------|------------|
| **Auto-sync debounce** | `runCloudSync({ writeOnly: true })` — **pomija apply** → anti-leak **nie trafia do UI** na tej ścieżce |
| **Focus / visibility / native resume** | `pullFromCloudAndMerge` → **pełny apply** → anti-leak **trafia do UI** |
| **`valuesForMerge`** | `prepareDataBundleForCloudPush` — jeśli LS ma 14, warunek `length === 0` **fałszywy** (ochrona S2) |
| **Race** | Stale `adminDataBundle()` **+** pusty LS → warunek **prawdziwy** mimo Cloud 14 |

**Wniosek:** MF-2 **częściowo** ogranicza regresję (auto-sync), ale **nie naprawia** focus pull. Warunek `payrollSource.length === 0` jest **nadmiernie szeroki** — traktuje każdy pusty snapshot jak „rollover intentional”, także gdy Cloud ma **SSOT bieżącego tygodnia**.

### 5.3 Czy anti-leak powinien uwzględniać Cloud jako źródło prawdy?

**TAK — gdy week scope się zgadza.**

| Sygnał | Interpretacja |
|--------|----------------|
| `cloudWeekKey === targetWeekKey` **AND** cloud roster > 0 | **Legitymne dane bieżącego tygodnia** — nie czyścić |
| `cloudWeekKey !== targetWeekKey` **AND** local pusty | **Prawdziwy leak** — blokować / czyścić |
| Local pusty, cloud pusty, archive bogate | **Post-rollover** — zamierzone pusty tydzień |

Obecna implementacja **ignoruje** `cloudWeekFrom/To` w warunku strzału.

### 5.4 Czy wystarczy zmiana warunku, czy przebudowa?

| Ocena | Wariant |
|-------|---------|
| **Wystarczy warunek** | Wariant **Minimalny** i **Bezpieczny** — doprecyzowanie predykatu (week scope + intent) |
| **Przebudowa** | Wariant **Docelowy** — usunięcie anti-leak z merge; ochrona rollover wyłącznie w warstwach week-scope + rollover push + reconcile |

Rekomendacja: **Bezpieczny** na P0 hotfix; **Docelowy** jako follow-up po regresji 20.1C.1 STALE_KV.

### 5.5 `applyAdminDataBundle` — producent czy executor?

**Tylko executor.** Przekazuje `incoming` z `finalBundle` do `setWeekEmployees` bez transformacji rosteru.

---

## 6. Trzy warianty rozwiązania

### 6.1 Wariant A — **Minimalny**

**Zmiana:** rozszerz predykat anti-leak o **week-scope gate**.

```text
FIRE anti-leak ONLY WHEN:
  payrollSource.length === 0
  AND archiveRich (≥8)
  AND mergedRoster.length > 0
  AND cloudWeekKey !== targetWeekKey    ← NOWE
```

**Efekt:** Cloud z **14** i `2026-07-13–18` **nie jest kasowany** przy pustym lokalu.

**Zostaje:** ochrona gdy chmura niesie **stary** tydzień (mismatch keys).

| + | − |
|---|---|
| 1 warunek, ~5 linii | Nie rozwiązuje edge: stary roster w KV z **nowymi** kluczami (rzadkie) |
| Niska regresja poza P0 | Nadal zależy od `valuesForMerge` jako proxy „intentional empty” |

---

### 6.2 Wariant B — **Bezpieczny** (rekomendowany P0)

**Zmiana:** anti-leak strzela **wyłącznie** przy wykrytym **cross-week leak**, nie przy pustym lokalu per se.

```text
FIRE anti-leak ONLY WHEN:
  payrollSource.length === 0
  AND archiveRich (≥8)
  AND mergedRoster.length > 0
  AND (
    cloudWeekKey !== targetWeekKey
    OR sanitizeWouldImportForeignWeek(local, cloud, target)  // opcjonalnie helper
  )
```

**Dodatkowo (obowiązkowe w tym wariancie):**

1. **Trace:** `sync.merge.payroll.anti_leak` — pola `cloudWeekKey`, `targetWeekKey`, `reason: cross_week_leak | skipped_same_week_cloud`.
2. **Regresja:** prod scenario S1 z audytu → roster **14** po merge (nie 0).
3. **Zachować:** `test-payroll-refresh-team-race-p0.mjs` T3 (stary KV, inny tydzień → nadal 0).

| + | − |
|---|---|
| Naprawia P0 bez usuwania P-INV-5 | Więcej niż 1 linia; wymaga test matrix |
| Zgodny z SSOT Cloud jako prawda dla bieżącego tygodnia | Dwa predykaty do utrzymania |

---

### 6.3 Wariant C — **Docelowy**

**Zmiana:** **usunąć** `applyRuntimePayrollAntiLeak` z `computeMergedDataBundle`.

Ochrona rollover przeniesiona na:

| Warstwa | Mechanizm |
|---------|-----------|
| Rollover runtime | `autoArchiveAndAdvance` → `setWeekEmployees([])` + `pushPayrollWeekAfterRollover` (replace) |
| Merge week-scope | `mergeWeekEmployeesForWeekRange` + `finalizePayrollBundleMerge` mismatch (20.1C.1) |
| Bootstrap | `sanitizeWeekEmployeesForTargetRange` + `stripWeekEmployeeHoursList` |
| Apply race | `reconcileAdminBundleWithFreshLocal` + `resolveReconcileFreshForKey` |
| Focus pull | opcjonalnie: generation guard + **nie apply** gdy payroll w trakcie edycji (rozszerzenie MF-2 na pull) |

| + | − |
|---|---|
| Usunięcie dublowanej logiki | Wysokie ryzyko regresji STALE_KV |
| Jedna ścieżka merge (B4 SSOT) | Wymaga pełnego C-F20 + STALE_KV + cross-device |
| Spójność z SYNC-ARCH / domain split | Effort >> P0 |

---

## 7. Impact Analysis

| Domena | Dotknięcie | Ryzyko | Uwagi |
|--------|------------|--------|-------|
| **Payroll** | **BEZPOŚREDNIE** | **P0** | `kw-week-employees`, rollover, focus pull, archiwum |
| **Jobs** | **BRAK** | — | Anti-leak nie dotyka `kw-jobs`; JOBS-SYNC MF-1/2/3 bez zmian |
| **Directory** | **BRAK** | — | Brak merge directory w anti-leak |
| **Tender** | **BRAK** | — | Poza `computeMergedDataBundle` payroll slice |
| **WM Druk** | **BRAK** | — | Brak |

**Ścieżki sync dotknięte (Payroll only):**

| Ścieżka | Dziś | Po fix B |
|---------|------|----------|
| `pullFromCloudAndMerge` (focus) | **REGRESJA P0** | Naprawione |
| `runCloudSync` auto (writeOnly) | OK (bez apply) | Bez zmian |
| `runCloudSync` manual / bez writeOnly | Możliwa regresja | Naprawione |
| `CloudLoader` bootstrap | Bez anti-leak | Bez zmian |
| Rollover `tryPayrollWeekCycle` | OK | Wymaga regresji C-F20 |

---

## 8. Ryzyka

| Ryzyko | Prawdop. | Mitigacja |
|--------|----------|-----------|
| Regresja **20.1C.1 STALE_KV** (stary tydzień wraca) | Średnie (A) / Niskie (B) / Wyższe (C) | `smoke-test-payroll-rollover-sync-20.1c1.mjs` + STALE_KV integracja |
| Cross-device: urządzenie A rollover, B pull stary KV | Niskie | Week mismatch w finalize + week-scope gate |
| Owner wpisuje godziny, focus pull w trakcie | **Potwierdzone P0** | Wariant B + reconcile fresh React |
| Usunięcie anti-leak bez pełnej matrycy | Wysokie (C) | Tylko po Owner GO + pełny test plan |
| Naruszenie INV-J01 (JOBS-SYNC) | Brak | Zmiana tylko `applyRuntimePayrollAntiLeak`, nie `finalizePayrollBundleMerge` |

---

## 9. Rekomendacja

```text
OWNER REVIEW → GO implementacji: Wariant B (Bezpieczny)
Program implementacji: PAYROLL-ANTI-LEAK-FIX-01 (osobny bundle, #CORE)
Priorytet: P0 — przed kolejnym poniedziałkiem rolloveru
Nie implementować Wariantu C w tym samym bundle co P0
```

**Uzasadnienie:**

1. Root cause jest **wąski** — błędny predykat, nie cały merge.
2. Wariant B naprawia prod (Cloud 14 + pusty local) **bez** usuwania P-INV-5.
3. MF-2 **nie zastępuje** fixa — focus pull nadal wymaga poprawki anti-leak.
4. Wariant C zostaje jako **SYNC-ARCH / PAYROLL-DOMAIN** follow-up po stabilizacji.

---

## 10. Migration Plan (po Owner GO)

| Krok | Działanie |
|------|-----------|
| M1 | Design freeze **APPROVED** (ten dokument) |
| M2 | Implementacja Wariantu B w `applyRuntimePayrollAntiLeak` |
| M3 | Rozszerzyć trace `anti_leak` o `cloudWeekKey` / `targetWeekKey` / `skippedReason` |
| M4 | Testy: nowy `test-payroll-anti-leak-same-week-cloud-p0.mjs` (prod scenario S1) |
| M5 | Regresja: `test-payroll-refresh-team-race-p0.mjs`, `test-payroll-bootstrap-runtime-parity-b4.mjs`, `smoke-test-payroll-rollover-sync-20.1c1.mjs` |
| M6 | `npm run build` + payroll smoke |
| M7 | Release B (functional UI) → push `main` → verify FAST `version.json` |
| M8 | Owner smoke: Lista Płac → wpis godzin → zmiana zakładki → powrót (focus pull) |
| M9 | Obserwacja 24h — trace `anti_leak` fired=0 dla same-week cloud |

**Bez migracji KV.** Cloud prod **nie wymaga** restore — dane są poprawne.

---

## 11. Rollback Plan

| Trigger | Akcja |
|---------|-------|
| Regresja rollover STALE_KV | Revert commit `PAYROLL-ANTI-LEAK-FIX-01` |
| Payroll Guard spike | Revert + audyt push path |
| Owner zgłasza leak poprzedniego tygodnia | Revert natychmiast; wrócić do Wariantu A jako hot-hotfix |

```text
git revert <commit-fix>
git push origin main
curl -s https://www.wgdom.fun/version.json  → verify FAST
```

**Dane prod:** rollback **nie kasuje** KV; UI może wymagać F5 po revert.

---

## 12. Test Plan

### 12.1 Automatyczne (gate release)

| ID | Skrypt | Oczekiwanie |
|----|--------|-------------|
| **T-AL-01** | `test-payroll-anti-leak-same-week-cloud-p0.mjs` (**NOWY**) | Cloud 14, local `[]`, same week → merged **14**, anti-leak **nie strzela** |
| **T-AL-02** | `test-payroll-refresh-team-race-p0.mjs` T1–T3 | T3: stary leak → **0** (zachować) |
| **T-AL-03** | `test-payroll-bootstrap-runtime-parity-b4.mjs` | B4-T4 anti-leak intentional empty week (cross-week) |
| **T-AL-04** | `smoke-test-payroll-rollover-sync-20.1c1.mjs` | STALE_KV bez leak |
| **T-AL-05** | `npm run build` | PASS |

### 12.2 Manual prod (Owner)

| ID | Kroki | PASS |
|----|-------|------|
| **M-AL-01** | Lista Płac → wpisz godziny 3+ osób → Alt+Tab → wróć | Godziny **widoczne** |
| **M-AL-02** | DevTools → `localStorage['kw-week-employees']` po M-AL-01 | length **> 0** |
| **M-AL-03** | Niedziela ≥20:00 rollover (sandbox) → nowy tydzień | Skład **pusty**, bez godzin poprzedniego tygodnia |

### 12.3 Trace (opcjonalnie)

Szukaj w konsoli: `sync.merge.payroll.anti_leak` — po fixie dla same-week cloud: `fired: false` lub `skippedReason: same_week_cloud_ssot`.

---

## 13. Sign-off

| Rola | Status | Data |
|------|--------|------|
| Audit PAYROLL-WEEK-DATA-LOSS-01 | **COMPLETE** | 2026-07-13 |
| Root cause PAYROLL-ROSTER-ROOT-CAUSE-01 | **CONFIRMED** | 2026-07-13 |
| Design freeze (ten dokument) | **CLOSED** — Wariant B | 2026-07-13 |
| Owner GO implementacji | **GO** | 2026-07-13 |
| `PAYROLL-ANTI-LEAK-FIX-01` IMPLEMENT | **CLOSED** — **2.65.14** @ **`26f3eb5`** | 2026-07-13 |
| `PAYROLL-ANTI-LEAK-PRODUCTION-SMOKE-01` | **CLOSED** — smoke **12/12 PASS** | 2026-07-13 |

---

## 14. Następny krok

**PROGRAM CLOSED** — brak otwartych akcji w PAYROLL-ANTI-LEAK.

Opcjonalny follow-up (osobny program, Owner GO): Wariant C (usunięcie anti-leak z merge) w ramach SYNC-ARCH / PAYROLL-DOMAIN; doprecyzowanie P-INV-5 w `PAYROLL-CERTIFICATION-SUITE.md`.
