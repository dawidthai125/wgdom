# PAYROLL-CLOUD-RECOVERY — Etap 2 B6 · AUDIT ARCHITEKTURY (Edge Parity)

> **Status:** **AUDIT COMPLETE** · **READ ONLY** · **IMPLEMENT: NO GO**  
> **Data audytu:** 2026-07-01  
> **Baseline prod:** **v2.63.22** · release commit **`187afb8`** · **PRODUCTION VERIFIED**  
> **Repository HEAD:** `b107ea9` (docs only)  
> **STABILIZATION WINDOW:** ACTIVE  
> **Workflow:** AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → RELEASE → VERIFY

---

## Werdykt

```text
AUDIT B6:        COMPLETE
RCA:             CONFIRMED — Client merge (directoryId SSOT) ≠ Edge batch-set merge (UUID SSOT)
DESIGN FREEZE:   NOT STARTED
IMPLEMENT:       NO GO
```

| Pole | Wartość |
|------|---------|
| **Bundle** | B6 — Edge Parity: `kw-week-employees` merge `directoryId` vs UUID |
| **Root cause** | `mergeWeekEmployees` (klient) scala po `weekEmployeeMergeKey` (`dir:{directoryId}`); Edge `batch-set` scala po `emp.id` (UUID) i blokuje „rozszerzenie rosteru” nowymi UUID |
| **Warstwa lib klienta (P0/B4)** | **Poprawna** dla pull/bootstrap/runtime — bug w **serwerze Edge** + ścieżkach push **bez** `replaceWeekEmployeesKeys` |
| **Guard klienta (B3)** | Chroni timing auto-sync; **nie** naprawia semantyki Edge merge |

**Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md)

---

## 1. Current architecture

### 1.1 Trzy warstwy synchronizacji payroll roster

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA A — Klient pull/merge (SSOT po P0 + B4)                              │
│   mergeDataKey("kw-week-employees") → mergeWeekEmployees                     │
│   finalizePayrollBundleMerge → sanitize + P11 richness + week mismatch       │
│   Plik: src/lib/cloud-sync.ts                                                │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ batch-get (read)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA B — Edge KV (batch-set)                                              │
│   mergeWeekEmployeesUnion(prev, next)        — klucz: emp.id (UUID)        │
│   mergeWeekEmployeesKeepPrevRoster(prev,next)— przy „expansion” UUID         │
│   mergeWeekEmployeeRecordByTimestamps        — per-rekord (częściowa parity) │
│   Plik: supabase/functions/make-server-0afb8820/index.tsx                    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ kv_store_0afb8820
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARSTWA C — Klient push guards                                               │
│   applyPayrollGuardBeforePush (wouldBlockPayrollShrink) — przed fetch      │
│   CloudSyncMutationGuard — defer pull/sync podczas mutacji                   │
│   replaceWeekEmployeesKeys — bypass Edge merge (force replace)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Kluczowe funkcje — mapa

| Funkcja | Warstwa | Klucz tożsamości | Plik |
|---------|---------|------------------|------|
| `weekEmployeeMergeKey` | Klient | `dir:{directoryId}` → `name:` → `id:` | `cloud-sync.ts` |
| `mergeWeekEmployees` | Klient | `weekEmployeeMergeKey` | `cloud-sync.ts` |
| `mergeWeekEmployeeRecord` | Klient | per matched key | `cloud-sync.ts` |
| `mergeWeekEmployeesUnion` | **Edge** | **`emp.id` (UUID)** | `index.tsx` L253 |
| `mergeWeekEmployeesKeepPrevRoster` | **Edge** | **UUID** | `index.tsx` L235 |
| `mergeWeekEmployeeRecordByTimestamps` | Edge | N/A (para rekordów) | `index.tsx` L336 |
| `finalizePayrollBundleMerge` | Klient | używa `mergeWeekEmployees` | `cloud-sync.ts` |
| `wouldBlockPayrollShrink` | Klient push guard | metryki `activeDays` / `totalHours` | `cloud-sync.ts` |
| `isSuspiciousPayrollShrink` | Edge | `weekEmployeesRichness` | `index.tsx` L462 |

### 1.3 API surface

| Endpoint | Rola |
|----------|------|
| `POST .../batch-get` | Odczyt kluczy KV (bez merge) |
| `POST .../batch-set` | Zapis z **serwerowym** merge dla `kw-week-employees`, `kw-jobs`, `kw-archive`, `kw-directory` |
| `POST .../restore-payroll-backup` | Przywracanie — `mergeWeekEmployeesUnion` (UUID) |

---

## 2. Edge vs Client parity

### 2.1 Lista roster — tożsamość (PRIMARY GAP)

| Aspekt | Klient `mergeWeekEmployees` | Edge `mergeWeekEmployeesUnion` |
|--------|----------------------------|--------------------------------|
| Klucz union | `weekEmployeeMergeKey` → **`dir:{directoryId}`** pierwszeństwo | **`emp.id`** (UUID) |
| Ten sam człowiek, różne UUID | **1 rekord** (merge per `directoryId`) | **2 rekordy** lub utrata jednego przy KeepPrevRoster |
| Nowy `directoryId` na urządzeniu A | Zachowany po pull na B | Zachowany tylko jeśli push z `replaceWeekEmployeesKeys` |
| Legacy bez `directoryId` | `name:` / `id:` fallback (#010) | Tylko `id:` — brak `name:` fallback |

### 2.2 Rekord — pola (SECONDARY GAP, częściowo FIX A)

| Pole / logika | Klient `mergeWeekEmployeeRecord` | Edge `mergeWeekEmployeeRecordByTimestamps` |
|---------------|----------------------------------|--------------------------------------------|
| `days` | `pickDaysByTimestamps` + `mergeDaysByRichness` przy remisie | Prosty spread po `dataUpdatedAt` |
| `prevSaturday` | `pickPrevSaturdayByTimestamps` + richness | **Brak** — nie scalane explicite |
| `extraCosts` | Winner po `dataUpdatedAt` | **Brak** w edge merge |
| `payrollCarryForward` | `pickPayrollCarryForward` | **Brak** |
| `settled` / `settledUpdatedAt` | `pickSettledByTimestamps` + spurious unsettle | **Parity FIX A** (2026-06-03) — zsynchronizowane |
| `rate` / `rateUpdatedAt` | Parity | Parity |

Test `scripts/test-payroll-settled-merge-fix-a.mjs` weryfikuje **tylko settled** — nie pełną parity rekordu.

### 2.3 Shrink / expansion guards

| Guard | Gdzie | Warunek | Akcja |
|-------|-------|---------|-------|
| `wouldBlockPayrollShrink` | Klient pre-push | `activeDays` lub `totalHours` −50% vs chmura | **Usuwa** `kw-week-employees` z batch (throw PAYROLL_GUARD_BLOCKED) |
| `isSuspiciousPayrollShrink` | Edge batch-set | pusty roster lub richness −55% | `mergeWeekEmployeesUnion` (UUID) |
| `hasWeekEmployeesRosterExpansion` | Edge batch-set | **nowy UUID** w `next` vs `prev` | `mergeWeekEmployeesKeepPrevRoster` — **odrzuca nowe UUID** |
| `forceReplaceWeekEmployees` | Edge | `replaceWeekEmployeesKeys` zawiera klucz | **Pomija** shrink i expansion merge |

**Asymetria:** Klient blokuje push przy shrink metryk; Edge przy expansion UUID **cicho obcina** roster do poprzedniego zbioru UUID — sprzeczne z P0 #009 (union po `directoryId`).

---

## 3. Data flow

### 3.1 Bootstrap (CloudLoader)

```text
batch-get (core keys)
  → mergeAllDataKeys (klient, directoryId union)
  → applyBootstrapPayrollMerge (= finalizePayrollBundleMerge)
  → localStorage persist
  → pushKeysToCloud (opcjonalnie)
       replaceWeekEmployeesKeys jeśli kw-week-employees w pushKeys
```

**Parity:** Pull/bootstrap **klient-only** — poprawny SSOT `directoryId`. Push bootstrap z `replaceWeekEmployeesKeys` omija Edge merge.

### 3.2 Runtime sync admin (`runCloudSync`)

```text
pullAndMergeDataBundle
  → computeMergedDataBundle
       batch-get + mergeAllDataKeys + finalizePayrollBundleMerge + anti-leak
pushMergedDataBundleToCloud
  → replaceWeekEmployeesKeys: ["kw-week-employees"]  ← bypass Edge UUID merge
```

**Parity:** Pełny cykl admina **omija** problem expansion dzięki `replace`. Klient i chmura zgadzają się po pull; push nadpisuje KV.

### 3.3 Roster push operacyjny (`persistPayrollRoster`)

```text
withKwWeekEmployeesAsyncMutation
  → pushWeekEmployeesToCloud(next, { skipPayrollGuard: true })
       collapseWeekEmployeesByIdentity (directoryId)
       replaceWeekEmployeesKeys: ["kw-week-employees"]
```

**Parity:** Ścieżka dodania/usunięcia z LP — **replace** — Edge merge nie działa. P0 testy (`test-payroll-add-from-directory-merge-p0.mjs`) mockują `batch-set` jako **bezpośredni zapis KV** — **nie testują** logiki Edge.

### 3.4 Partial push (`pushKeysToCloudSafe`) — **GAP PATH**

```text
batch-get (tylko żądane klucze)
  → mergeDataKey per key (klient: mergeWeekEmployees po directoryId)
  → pushKeysToCloud BEZ replaceWeekEmployeesKeys
       → Edge: expansion? → mergeWeekEmployeesKeepPrevRoster → UTRATA nowych osób
```

**Konsumenci `pushKeysToCloudSafe(["kw-week-employees"], ...)`:**
- `src/app/WorkerPhotoView.tsx` — worker edycja rosteru
- `src/app/App.tsx` — restore składu z archiwum (partial)

### 3.5 batch-get

Prosty odczyt — **brak merge**. Parity dotyczy wyłącznie ścieżek zapisu i klientowego pull-merge.

---

## 4. Merge flow (szczegółowo)

### 4.1 Klient — `mergeWeekEmployees` (P0 SSOT)

```text
localArr, cloudArr
  → indexByMergeKey (weekEmployeeMergeKey) per strona
  → allKeys = union kluczy
  → per key: mergeWeekEmployeeRecord(l,c) | l | c
  → collapseWeekEmployeesByIdentity
```

### 4.2 Edge — `batch-set` dla `kw-week-employees`

```text
prev = kv.get("kw-week-employees")
next = incoming value
if prev != null:
  if intentionalClear → skip merge guards
  else if suspiciousShrink → next = mergeWeekEmployeesUnion(prev, next)   // UUID
  else if rosterExpansion → next = mergeWeekEmployeesKeepPrevRoster(...)   // UUID, drop new
safeValues[i] = next
kv.set(...)
```

### 4.3 `finalizePayrollBundleMerge` (B4 — bez zmian w B6)

```text
alignWeekRangeInMerged
  → sanitizeWeekEmployeesForTargetRange (mergeWeekEmployeesForWeekRange)
  → week mismatch guard (20.1C.1)
  → P11: jeśli cloud bogatsza → mergeWeekEmployees([], cloudEmps)
```

**Uwaga:** Anti-leak (`applyRuntimePayrollAntiLeak`) tylko runtime. Edge nie implementuje anti-leak — polega na klientowym bundle przed push z replace.

### 4.4 Archiwum — merge zagnieżdżony

Klient `mergeArchive` → wewnętrznie `mergeWeekEmployees` (directoryId) dla `weekEmployees` w tygodniu.

Edge `mergeArchiveUnion` → wybór całego snapshotu po score — **bez** per-field merge `weekEmployees` na Edge.

---

## 5. Identifier flow

### 5.1 `directoryId` (SSOT biznesowy od P0 #001)

| Etap | Zachowanie |
|------|------------|
| `weekEmployeeFromDir` | Nowy rekord **z** `directoryId` |
| `addFromDirectory` | Dedup po `directoryId` przed dodaniem |
| `collapseWeekEmployeesByIdentity` | Kolaps duplikatów przed push |
| `weekEmployeeMergeKey` | `dir:{directoryId}` gdy ustawione |
| Edge `weekEmployeeIds` | **Ignoruje** `directoryId` — tylko `id` |

### 5.2 UUID (`WeekEmployee.id`)

| Użycie | Klient | Edge |
|--------|--------|------|
| Klucz union roster | Fallback (`id:`) gdy brak dir/name | **Jedyny** klucz |
| `weekEmployeesSamePerson` | UUID match **lub** merge key | Brak |
| Expansion detection | N/A | `!prevIds.has(newId)` |
| Selekcja UI (B5) | `displayEmployees.find(id)` | N/A |

### 5.3 Scenariusz referencyjny (RCA B6)

```text
Stan KV: N osób (UUID zestaw S)
Urządzenie Worker: dodaje osobę Y (directoryId=dir-Y, UUID nowy, ∉ S)
  → pushKeysToCloudSafe:
       klient merge: N+1 osób (union po directoryId) ✓
       Edge expansion: UUID ∉ S → KeepPrevRoster
       KV zostaje: N osób — Y ZNIKA ✗
Urządzenie Admin: persistPayrollRoster z replace
  → KV: pełny lokalny roster (może nadpisać stale) — inna klasa ryzyka (B3/B1)
```

---

## 6. Edge cases

| ID | Scenariusz | Klient pull | Edge batch-set (bez replace) | Werdykt |
|----|------------|-------------|------------------------------|---------|
| **E1** | Ten sam `directoryId`, różne UUID local vs cloud | 1 osoba | 2 osoby (union UUID) lub utrata przy expansion | **GAP** |
| **E2** | Worker dodaje z Kadr (`pushKeysToCloudSafe`) | Union OK | Expansion → KeepPrevRoster | **GAP** |
| **E3** | Admin `runCloudSync` po worker add | Pull odzyskuje Y | Push replace zapisuje merged | **OK** (jeśli worker push nie nadpisał KV) |
| **E4** | Stary telefon push mniejszego rosteru (shrink richness) | Guard może zablokować | Union UUID — nie łączy po dir | **GAP** częściowy |
| **E5** | `persistPayrollRoster` replace | N/A | Bypass merge | **OK** (stale overwrite risk osobno) |
| **E6** | Rollover pusty tydzień + partial push | anti-leak runtime | intentionalClear jeśli archiwum w batch | Złożone — poza B6 core |
| **E7** | `restore-payroll-backup` Edge | N/A | `mergeWeekEmployeesUnion` UUID | **GAP** przy dir collision |
| **E8** | Legacy rekord bez `directoryId` | `name:` / `id:` key | UUID only | **GAP** dla starych wpisów |
| **E9** | Dwa urządzenia dodają **różne** osoby, oba replace push race | N/A | Last write wins | Poza B6 (znane ryzyko replace) |

---

## 7. Risks

| Ryzyko | Severity | Opis |
|--------|----------|------|
| **R1** | **HIGH** | Utrata dodania z Kadr/worker przez `mergeWeekEmployeesKeepPrevRoster` |
| **R2** | **HIGH** | Duplikaty tej samej osoby (2 UUID) w KV po Edge union |
| **R3** | MED | `mergeWeekEmployeeRecord` field drift (prevSat, extraCosts, carry) po Edge merge |
| **R4** | MED | Testy P0 mockują batch-set bez Edge — fałszywe poczucie pełnej parity |
| **R5** | MED | Deploy B6 wymaga **Supabase Edge** + weryfikacji prod (nie tylko Vercel) |
| **R6** | LOW | Dual shrink guards (metryki vs richness) — trudniejszy debug |
| **R7** | LOW | `restore-payroll-backup` UUID merge przy przywracaniu |

**Mitigacje już istniejące (nie zastępują B6):**
- Admin full sync + `replaceWeekEmployeesKeys`
- `persistPayrollRoster` + guard + suppress
- Klient pull zawsze re-aplikuje `mergeWeekEmployees` przy odświeżeniu

---

## 8. SSOT violations

| # | Naruszenie | Dowód | Severity |
|---|------------|-------|----------|
| **V1** | **Tożsamość rosteru:** klient `directoryId` vs Edge `UUID` | `weekEmployeeMergeKey` vs `mergeWeekEmployeesUnion` map key | **PRIMARY** |
| **V2** | **Semantyka union:** P0 #009 vs `hasWeekEmployeesRosterExpansion` | Edge odrzuca nowe UUID | **PRIMARY** |
| **V3** | **Test SSOT:** testy importują klienta, nie Edge handler | `test-payroll-add-from-directory-merge-p0.mjs` mock KV write | HIGH |
| **V4** | **Dokumentacja:** ARCHITECTURE §11.2 mówi o Edge FIX A settled; nie wspomina UUID gap | `docs/ARCHITECTURE.md` L650 | MED |
| **V5** | **Duplikat logiki merge** — dwa implementacje bez wspólnego modułu | `cloud-sync.ts` + `index.tsx` | MED (maintenance) |

**Nie naruszone (zachować):**
- `finalizePayrollBundleMerge` (B4 CLOSED)
- `CloudSyncMutationGuard` (B3 CLOSED)
- `displayEmployees` / closed week UI (B5 CLOSED)
- Principles P0 #001–#013 na **warstwie klienta**

---

## 9. Files involved

### 9.1 Core B6 scope

| Plik | Rola |
|------|------|
| `supabase/functions/make-server-0afb8820/index.tsx` | **PRIMARY** — `batch-set`, `mergeWeekEmployeesUnion`, `KeepPrevRoster`, `mergeWeekEmployeeRecordByTimestamps` |
| `src/lib/cloud-sync.ts` | SSOT klienta — `weekEmployeeMergeKey`, `mergeWeekEmployees`, `mergeWeekEmployeeRecord`, push guards |
| `src/lib/cloud-sync-mutation-guard.ts` | Defer sync — **bez zmian** w B6 (interakcja: nie zastępuje Edge parity) |

### 9.2 Push/pull konsumenci (kontekst)

| Plik | Ścieżka payroll |
|------|-----------------|
| `src/app/CloudLoader.tsx` | Bootstrap merge + push z replace |
| `src/app/App.tsx` | `runCloudSync`, `persistPayrollRoster`, `pushKeysToCloudSafe` restore |
| `src/app/WorkerPhotoView.tsx` | `pushKeysToCloudSafe(["kw-week-employees"])` — **GAP** |
| `src/app/InspectorPanel.tsx` | jobs only via safe push |

### 9.3 Testy (gate / luki)

| Plik | Co testuje | Edge? |
|------|------------|-------|
| `scripts/test-payroll-add-from-directory-merge-p0.mjs` | Klient `mergeWeekEmployees` | **Nie** (mock direct KV) |
| `scripts/test-payroll-week-employee-merge-asymmetry.mjs` | `mergeWeekEmployeesForWeekRange` | Nie |
| `scripts/test-payroll-settled-merge-fix-a.mjs` | Settled field parity client vs mirror Edge | Częściowo |
| `scripts/test-payroll-bootstrap-runtime-parity-b4.mjs` | B4 finalize — klient | Nie |
| `scripts/test-payroll-roster-guard-phase2.mjs` | Mutation guard | Nie |
| **BRAK** | Edge `batch-set` handler z directoryId | **Do utworzenia w B6** |

### 9.4 Dokumentacja

| Plik |
|------|
| `docs/ARCHITECTURE.md` §11.1–11.2 |
| `docs/PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md` |
| `docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md` §7 |
| `CURRENT-TASK.md` — B6 OPEN |

---

## 10. Recommended DESIGN FREEZE scope

### 10.1 W scope B6 (MIN)

| ID | Zmiana | Pliki |
|----|--------|-------|
| **B6-S1** | Edge `mergeWeekEmployeesUnion` — klucz **`weekEmployeeMergeKey`** (port logiki z klienta; wspólny moduł lub kopia zsynchronizowana 1:1) | `index.tsx` (+ ewent. shared `payroll-merge.ts`) |
| **B6-S2** | Edge `mergeWeekEmployeesKeepPrevRoster` — expansion po **`directoryId` / merge key**, nie surowy UUID; lub **usunięcie** expansion block gdy union jest po dir (decyzja freeze) | `index.tsx` |
| **B6-S3** | Edge `hasWeekEmployeesRosterExpansion` — detekcja nowych **`dir:*`** kluczy | `index.tsx` |
| **B6-S4** | `restore-payroll-backup` — ten sam merge key co batch-set | `index.tsx` |
| **B6-S5** | Test **`scripts/test-payroll-edge-parity-b6.mjs`** — scenariusze E1, E2, E7 + mirror handler lub import shared | **NOWY** |
| **B6-S6** | ARCHITECTURE §11.2 — jedna linia: Edge union po `directoryId` (po IMPLEMENT) | docs |

### 10.2 Opcjonalne (freeze decision — poza MIN)

| ID | Zmiana | Uwaga |
|----|--------|-------|
| **B6-O1** | Pełna parity `mergeWeekEmployeeRecord` na Edge (prevSat, extraCosts, carry) | Osobny pod-bundle lub B6.2 |
| **B6-O2** | Wspólny pakiet TS Deno+Vite (`payroll-merge-ssot.ts`) | Redukcja driftu — koszt deploy Deno |
| **B6-O3** | `pushKeysToCloudSafe` zawsze `replaceWeekEmployeesKeys` dla rosteru | Obchodzi symptom, **nie** naprawia KV race na Edge |

### 10.3 Poza scope B6 (explicit NO)

| Element | Powód |
|---------|-------|
| Zmiana modelu KV / per-week `kw-week-employees` | Nowy model danych |
| `finalizePayrollBundleMerge` / B4 | CLOSED |
| `CloudSyncMutationGuard` / B3 | CLOSED |
| Closed week UI / B5 | CLOSED |
| `PayrollView` / `App.tsx` rollover | Poza RCA Edge |
| Nowe Principles #014+ | Zakaz |
| Egress / partial bundle sync | Osobny epic (ARCHITECTURE §11.4) |
| TEST-INFRA-001 Playwright | Osobny epic |

### 10.4 Acceptance criteria (propozycja freeze)

| AC | Kryterium |
|----|-----------|
| B6-AC1 | Edge union po `directoryId` — ten sam człowiek, 2 UUID → 1 rekord w KV |
| B6-AC2 | Worker `pushKeysToCloudSafe` symulacja — nowy `directoryId` nie ginie przy expansion guard |
| B6-AC3 | Regresja P0 `test-payroll-add-from-directory-merge-p0.mjs` PASS |
| B6-AC4 | Regresja B3/B4/B5 testów PASS |
| B6-AC5 | `test-payroll-edge-parity-b6.mjs` PASS |
| B6-AC6 | Deploy Edge + VERIFY (nie tylko Vercel) |
| B6-AC7 | Brak nowych KV / Principles |

### 10.5 Release (propozycja)

| Pole | Wartość |
|------|---------|
| **Wersja** | 2.63.23 (patch) lub 2.64.0 — decyzja właściciela |
| **Deploy** | **Supabase Edge** (`make-server-0afb8820`) + ewent. Vercel jeśli shared module w bundlu klienta |
| **Klasyfikacja** | BUGFIX sync / data integrity |
| **Rollback** | Redeploy poprzedniego Edge + Vercel |

---

## GO / NO GO

| Etap | Status |
|------|--------|
| **AUDIT B6** | **COMPLETE** |
| **DESIGN FREEZE** | **NOT STARTED** — na akceptację właściciela |
| **IMPLEMENT** | **NO GO** |

---

*SSOT audytu B6: ten plik · bez implementacji do DESIGN FREEZE GO.*
