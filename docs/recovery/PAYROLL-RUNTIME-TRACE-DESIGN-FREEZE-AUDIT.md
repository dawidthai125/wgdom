# PAYROLL Runtime Trace — Design Freeze Audit (pre-implementation)

> **Tryb:** READ ONLY · AUDIT ONLY  
> **Data:** 2026-07-04  
> **SSOT audytowany:** [`PAYROLL-RUNTIME-TRACE-SPEC.md`](PAYROLL-RUNTIME-TRACE-SPEC.md) **v1.1**  
> **Kontekst:** Documentation Phase **COMPLETE** · Spec **CERTIFIED** · Incydent prod **nadal OPEN** (post S1 v2.63.28)  
> **Cel audytu:** Zgodność spec ↔ kod **przed** Runtime Trace Design Freeze i implementacją loggera  
> **Zakaz:** implementacja · build · commit · push · Design Freeze **nie rozpoczęty** w tym kroku

---

## Werdykt audytu (skrót)

| Pytanie | Werdykt |
|---------|---------|
| 1. Spec opisuje wszystkie miejsca kodu incydentu? | **PASS** z 3 lukami P2 (poniżej) |
| 2. Nowe ścieżki od czasu spec? | **PASS** — brak driftu względem v2.63.28 / S1 |
| 3. Nowe funkcje wymagające trace? | **3 luki** — nie blokują Design Freeze |
| 4. Implementacja wyłącznie wg SSOT? | **CONDITIONAL PASS** — KG-1…KG-5 już w §12 |
| 5. Design Freeze możliwy? | **TAK** — po tym audycie |
| 6. CERTIFIED SSOT nadal ważny? | **TAK** |

```text
PASS

Blockery Design Freeze: brak

Blockery implementacji loggera (znane, udokumentowane w §12 v1.1):
  — KG-1 / KG-5 (Edge success observability)
  — KG-2 / KG-3 (procedura multi-device)
```

**Rekomendacja:** Runtime Trace **Design Freeze** może zostać **rozpoczęty** po Owner GO — bez zmian v1.1, z załącznikiem „Implementation Notes” dla 3 luk P2 (§4).

---

## 1. Metodologia

| Źródło | Użycie |
|--------|--------|
| `PAYROLL-RUNTIME-TRACE-SPEC.md` v1.1 | SSOT emitterów, envelope, RC matrix |
| `PAYROLL-ROOT-CAUSE-VALIDATION.md` | Ścieżka P1→P4 incydentu |
| `S1-PRODUCTION-INCIDENT-REVIEW.md` | Scenariusz repro |
| Kod `src/` + `supabase/.../index.tsx` | Weryfikacja E2E (HEAD workspace = post-S1) |

**Nie wykonano:** diff git od 2026-07-04 · runtime prod · implementacji trace.

---

## 2. Mapowanie incydentu → kod → spec

### 2.1 Urządzenie A (Chrome) — add

| Krok | Kod (zweryfikowany) | Spec v1.1 | Zgodność |
|------|---------------------|-----------|----------|
| UI add | `PayrollView` → `onAddFromDirectory` → `App.addFromDirectory` | E01, G1b | ✓ |
| Dedup | `filterDirectoryForPayrollWeekAdd` (`app-domain.ts` ~431) | G1b | ✓ |
| React + LS #1 | `setWeekEmployees` via `useLocalStorage` (`hooks/useLocalStorage.ts` ~23–33) | E12* | △ patrz §4.1 |
| Domain push schedule | `persistPayrollRoster` + `suppressAutoSyncUntilRef` +6000ms | E02, G9 | ✓ |
| Guard | `withKwWeekEmployeesAsyncMutation` | E03 | ✓ |
| Collapse | `collapseWeekEmployeesByIdentity` w `pushWeekEmployeesToCloud` | E22 | ✓ |
| LS #2 | `localStorage.setItem` w `pushWeekEmployeesToCloud` (~2266) | G6 | ✓ |
| batch-set | `pushKeysToCloud` → `fetch batch-set` (~2214) | E05, E19 | ✓ |
| Edge KV | `index.tsx` kw-week-employees + tombstones + forceReplace | E06, E23 | ✓ (emit KG-5) |
| Auto-sync later | `scheduleAutoCloudSync` → `runCloudSync` | E13, G9 | ✓ |
| Pull merge | `pullAndMergeDataBundle` → `computeMergedDataBundle` | G3, E08 | ✓ |
| Union slot | `mergeAllDataKeys` case `kw-week-employees` | G1, E09 | ✓ |
| Sanitize / pick | `sanitizeWeekEmployeesForTargetRange` → `mergeWeekEmployeesForWeekRange` | E17 (P2 sanitize) | ✓ |
| Finalize | `finalizePayrollBundleMerge` | E10 | ✓ |
| Anti-leak | `applyRuntimePayrollAntiLeak` | E18 | ✓ |
| Apply UI | `applyAdminDataBundle` → `setWeekEmployees` | E11, E12 | ✓ |
| Production filter | `useEffect` `filterProductionWeekEmployees` (~344–351) | G4 | ✓ |
| Display | `resolvePayrollDisplayEmployees` w `PayrollView` | G11 | ✓ |
| RS push (S1) | `pushMergedDataBundleToCloud` + `filterRsPushKeysAndValues` | E20, E21 | ✓ (payroll wykluczony) |

### 2.2 Urządzenie B (iPhone refresh)

| Krok | Kod | Spec | Zgodność |
|------|-----|------|----------|
| Bootstrap batch-get | `CloudLoader` `fetchKeysFromCloud` CORE keys (~59) | E07, E15 | ✓ |
| Merge | `mergeAllDataKeys` → `applyBootstrapPayrollMerge` | G1, E16 | ✓ |
| LS persist | `bootstrapMergedShouldPersist` → `localStorage.setItem` (~138–139) | △ §4.2 | |
| Bootstrap push | `bootstrapMergedShouldPush` → `pushKeysToCloud` (~167–176) | G5a, G5b | ✓ |
| App mount | `useLocalStorage` read `kw-week-employees` | E12 (implicit) | ✓ |
| Display | `PayrollView` `displayEmployees` | G11 | ✓ |

### 2.3 Ścieżki poza repro incydentu (spec P2 — akceptowalne)

| Ścieżka | W spec | Uwagi |
|---------|--------|-------|
| `removeWeekEmployee` + tombstone | P2 | Nie dotyczy add |
| `pushPayrollWeekAfterRollover` | P2 | Nie dotyczy add |
| `importBackup` merge roster (~1022–1024) | **brak** | Poza repro admin add |
| `WorkerPhotoView` push | **brak** | Worker, nie admin LP |
| Restore payroll backup (~1182–1205) | P2 `push.restore` | Poza repro |

---

## 3. Spójność wewnętrzna v1.1

| Obszar | Werdykt | Uwagi |
|--------|---------|-------|
| §1 ID ↔ §3.1 envelope | **PASS** | `bootstrapPushId`, `httpSeq`, `parentOperationId` spójne |
| §2 emitters ↔ §4.1 warstwy | **PASS** | 11 warstw pokryte |
| §4.6 DISPLAY reguła | **MINOR** | Sformułowanie „nie ma” mylące; §11 RC matrix jest SSOT |
| §5 L6 Edge vs §12 KG-5 | **PASS** | Jawna luka, bez sprzeczności |
| §11 RC ↔ §2 emitters | **PASS** | Każda klasa RC ma kotwicę event |
| §13 ~90% ↔ §12 Known Gaps | **PASS** | Spójne |

**Sprzeczności blokujące:** **nie stwierdzono**

---

## 4. Luki spec ↔ kod (wymagają uwagi przy implementacji)

### 4.1 GAP-A — `useLocalStorage` pierwszy zapis LS (P2)

| Pole | Wartość |
|------|---------|
| **Funkcja** | `useLocalStorage` setter dla `kw-week-employees` |
| **Plik** | `src/app/hooks/useLocalStorage.ts` (~23–33) |
| **Brakujący event** | `payroll.roster.ls.write` z `trigger=ui_add` **lub** rozszerzenie E12 o `source=useLocalStorage` |
| **Brakujące pole** | `applyWriteTimestampsApplied: boolean` (opcjonalne) |
| **Wpływ RC** | **Niski** — chronologia `rosterRevision` między E01 a G6; **nie** zmienia klasy RC przy poprawnym E01+G6 |
| **Bloker Design Freeze?** | **NIE** — implementacja może spiąć E12 w hooku dla klucza `kw-week-employees` bez zmiany spec |

### 4.2 GAP-B — CloudLoader `bootstrapMergedShouldPersist` (P2)

| Pole | Wartość |
|------|---------|
| **Funkcja** | `bootstrapMergedShouldPersist` → `localStorage.setItem(key, merged)` |
| **Plik** | `src/app/CloudLoader.tsx` (~138–139) |
| **Brakujący event** | `sync.bootstrap.ls.persist` |
| **Brakujące pole** | `key`, `roster` snapshot, `rosterRevision` |
| **Wpływ RC** | **Średni** na urządzeniu B — stan przed `G5b`; utrata widoczna w L9 `weekEmpRaw` jeśli KV OK |
| **Bloker Design Freeze?** | **NIE** — L9/L10/L11 wystarczą do RC-03* vs RC-04* na B |

### 4.3 GAP-C — `mergeDeletedWeekEmployeeKeys` przed merge (P2)

| Pole | Wartość |
|------|---------|
| **Funkcja** | `mergeDeletedWeekEmployeeKeys` + `saveDeletedWeekEmployeeKeys` |
| **Plik** | `src/lib/cloud-sync.ts` (~2590–2591) w `computeMergedDataBundle` |
| **Brakujący event** | `sync.merge.tombstones.week_employees` |
| **Brakujące pole** | `mergedTombstoneCount`, `subjectInTombstoneSet: boolean` |
| **Wpływ RC** | **Średni** — fałszywy tombstone z chmury → RC-03a / RC-04a przez filter w merge |
| **Bloker Design Freeze?** | **NIE** — E23 + `tombstoneHitsOnSubject` na Edge pokrywa główną oś; gap dotyczy **local** tombstone merge |

### 4.4 Znane luki już w SSOT §12 (nie są nowe)

| ID | Status audytu |
|----|----------------|
| KG-1 Edge success `requestId` | Potwierdzony w kodzie — `pushKeysToCloud` nie parsuje body sukcesu (~2225–2228) |
| KG-2 wspólny `operationId` | Proceduralny — bez zmian |
| KG-3 dwa dumpy | Proceduralny — bez zmian |
| KG-4 `X-WGDOM-Trace-Id` | Brak w `API_HEADERS` / Edge |
| KG-5 E06 po stronie klienta | Wymaga Edge deploy lub proxy event przy implementacji |

---

## 5. Nowe ścieżki od czasu spec (2026-07-04)

| Sprawdzenie | Wynik |
|-------------|-------|
| S1 `filterRsPushKeysAndValues` / `RS_PUSH_EXCLUDED_*` | **W spec E21** · kod `cloud-sync.ts` ~349–378 |
| S1 `rsBundleFingerprintFromMerged` | Poza roster trace (fingerprint only) — **OK** |
| Zmiany `finalizePayrollBundleMerge` | Zgodne z E10 |
| Edge union `mergeWeekEmployeesUnion` | W spec P2 `edge.kv.week_employees.union_fallback` |
| Nowe pliki payroll sync | **Brak** |

**Werdykt §5:** **PASS** — brak driftu kodu wymagającego v1.2 przed Design Freeze.

---

## 6. Root Cause Decision Matrix — audyt kompletności

| Klasa | Pokrycie kodem | Emitter w spec | Jednoznaczność |
|-------|-----------------|----------------|----------------|
| RC-01 | ✓ | G1b, E04 skip | ✓ |
| RC-02 | ✓ | E02 error, E05 | ✓ |
| RC-03a | ✓ (Edge) | E06, E23 | △ KG-5 — prawdopodobne, nie pewne bez Edge |
| RC-03b | ✓ | G5b, E06 | ✓ przy `httpSeq` + dwa dumpy |
| RC-03c | ✓ | L3/L5/L7 | ✓ |
| RC-04a | ✓ | E17 | ✓ |
| RC-04b | ✓ | E10 | ✓ |
| RC-04c | ✓ | E18 | ✓ |
| RC-04d | ✓ | G1 | ✓ |
| RC-05 | ✓ | E11 | ✓ |
| RC-06a | ✓ | G4 | ✓ |
| RC-06b | ✓ | G11 | ✓ |
| RC-07 | ✓ | L5+L7+L9 timing | ✓ (proceduralnie) |

**Reguły priorytetu §11.1:** spójne z `PAYROLL-ROOT-CAUSE-VALIDATION.md` P2/P3/P4.

**Werdykt §6:** **PASS** — macierz kompletna; jedyna niepewność klasyfikacji to **RC-03a** (udokumentowane KG-1/KG-5).

---

## 7. Czy implementacja może iść wyłącznie wg SSOT?

| Obszar | Bez nowych decyzji arch.? |
|--------|---------------------------|
| Tier P0 emitters | **TAK** |
| Tier P1 emitters | **TAK** |
| Envelope v1.1 | **TAK** |
| Ring buffer + dump API | **MINOR** — kształt JSON dump nie zdefiniowany byte-level; **nie** decyzja architektoniczna |
| E06 Edge event | **NIE bez KG** — wymaga wyboru: (a) tylko klient-proxy, (b) Edge deploy — **obie opcje przewidziane w §12** |
| OPERATION_ID multi-device | **Procedura Owner** — w §7/§12 |

**Werdykt §7:** **CONDITIONAL PASS** — logger implementowalny wg SSOT; **jedyna** decyzja implementacyjna (nie arch.) to **KG-1/KG-5 observability Edge** — już wpisana w Known Gaps.

**Nie wymaga:** S2, zmian merge, zmian sync architecture.

---

## 8. Zgodność z certyfikacją i closeout

| Dokument | Status po audycie |
|----------|-------------------|
| [`PAYROLL-RUNTIME-TRACE-CERTIFICATION.md`](PAYROLL-RUNTIME-TRACE-CERTIFICATION.md) | **Ważny** — brak nowych blockerów |
| [`PAYROLL-RUNTIME-TRACE-DOCUMENTATION-CLOSEOUT.md`](PAYROLL-RUNTIME-TRACE-DOCUMENTATION-CLOSEOUT.md) | **Ważny** — Documentation Phase pozostaje COMPLETE |
| v1.1 jako SSOT | **Potwierdzony** — v1.2 **nie wymagane** przed Design Freeze |

---

## 9. Rekomendacje (bez implementacji)

| # | Rekomendacja | Priorytet |
|---|--------------|-----------|
| R1 | Design Freeze dokument może referować v1.1 + ten audyt | Przy GO |
| R2 | Implementation Notes: GAP-A/B/C jako hook points (bez zmiany RC matrix) | Przy implementacji |
| R3 | KG-1 rozstrzygnąć w Design Freeze: klient-only vs Edge success body | Przy implementacji |
| R4 | **Nie** rozpoczynać fix incydentu roster przed trace repro | Zgodnie ze STABILIZATION |

---

## 10. Werdykt końcowy

```text
PASS

Blockery Design Freeze: brak

Blockery implementacji (udokumentowane, nie nowe):
  KG-1  Edge success requestId
  KG-5  E06 server-side emit
  KG-2  Cross-device operationId (procedura)
  KG-3  Dwa dumpy trace (procedura)

Luki P2 (nie blokują freeze):
  GAP-A  useLocalStorage LS write
  GAP-B  bootstrapMergedShouldPersist
  GAP-C  mergeDeletedWeekEmployeeKeys w computeMergedDataBundle
```

**Runtime Trace Specification v1.1** pozostaje **CERTIFIED SSOT**.  
**Design Freeze** może zostać **rozpoczęty** po **Owner GO** — bez implementacji w tym kroku.

---

**Ostatnia aktualizacja:** 2026-07-04 · Design Freeze Audit · READ ONLY · ZERO IMPLEMENTATION
