# ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01 — kontrakt storage dla `kw-tenders-pipeline`

> **Status:** **ADR FINAL — ACCEPTED (Owner Decisions D1–D10 LOCKED)** · **IMPLEMENTED · PRODUCTION VERIFIED · EPIC CLOSED** (Phase 22 §25)  
> **Data ADR FINAL:** 2026-09-17 · **Closeout:** 2026-09-19  
> **Baseline (ADR):** `main` @ `3bfecc7f` = prod 2.66.230 · **Production tip:** **2.66.231** / **`16bfb9f3`**  
> **Program:** STORAGE-TIER1-PIPELINE-CONTRACT-01 (RCA → ADR → PLAN → DF → IMPLEMENT → PV → ROLLOUT → UI VERIFY → **DOCUMENTATION CLOSEOUT**)  
> **Klasa:** PLATFORM / CORE persistence · **Payroll OUT OF SCOPE** · **Edge OUT OF SCOPE**  
> **Poprzednicy:** [`LOCALSTORAGE-ARCH-02-DESIGN-FREEZE.md`](LOCALSTORAGE-ARCH-02-DESIGN-FREEZE.md) (Principles #LSA-001…016) · [`LOCALSTORAGE-ARCH-02F-RCA.md`](LOCALSTORAGE-ARCH-02F-RCA.md) · OD-OCR-25 Track B (cloud lean + guard) · OD-OCR-29B (canonical cloud seam)  
> **Powiązane:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §10.5 / §10.5.1 · [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md) · [`ADR-CLOUD-SYNC-ARCHITECTURE.md`](ADR-CLOUD-SYNC-ARCHITECTURE.md) (PROPOSED, nie zmieniany)  
> **Uwaga historyczna:** blok poniżej („NIE jest IMPLEMENT”) opisuje stan z 2026-09-17; implementacja i produkcja domknięte w §25.

```text
FACT → DECISION → CONSEQUENCE → RISK → DEPENDENCY → UNKNOWN
Ten ADR NIE zawiera rankingu architektur. Architektura została wybrana przez Ownera.
Ten ADR NIE jest PLAN-em ani IMPLEMENT-em. Żaden kod, LS, IDB, KV, flaga nie został zmieniony.
```

---

## 0. Streszczenie decyzji (LOCKED)

| ID | Decyzja Ownera |
|---|---|
| **D1** | **YES** — IndexedDB jest **LOCAL DURABLE FULL authority** dla pipeline |
| **D2** | **INDEX** — LocalStorage trzyma **wyłącznie canonical hot INDEX** dla istniejących readerów; nie FULL, nie obecny LEAN (FULL − 2 pola) |
| **D3** | **CLOUD LEAN** — Supabase KV pozostaje LEAN cross-device authority; Track B / guard / write-safety bez zmian |
| **D4** | A (regenerowalne) = **IDB** · B (historia) = **IDB** · C (`ikFinalBid`) = **CLOUD + IDB** · D (ingest artifacts) = **OUT OF SCOPE** |
| **D5** | **FULL IDB COMPLETENESS CONTRACT** — min. `schemaVersion`, `bundleRevision`, `itemCount`, `writtenAt`, `maxUpdatedAt`, validation, stale/missing/corrupt detection, write acknowledgement |
| **D6** | **ONE WRITER** — canonical local writer = istniejący `saveTendersPipelineLocal`, rozszerzony: FULL → IDB, INDEX → LS; **bez** nowego generic storage-managera (osobny Owner GO) |
| **D7** | LOCAL = canonical writer · CLOUD = `pushTenderPipelineToCloud` · BACKUP = canonical writer · RESET = safety-first (write-safety przed destrukcją local) · INGEST = osobny cloud seam |
| **D8** | BUDGET = MEASURE + WARN + BLOCK · ON QUOTA = BLOCK LS write, FULL durable w IDB · READER FALLBACK = LS INDEX → IDB FULL → RAM; LS rebuild best-effort |
| **D9** | **MIGRATION + BACKWARD COMPATIBILITY** — nie reset; legacy FULL LS / legacy LEAN LS / INDEX / missing-stale IDB |
| **D10** | **PARTIAL RECOVERY 02F** — idee: one-writer, budget-before-write, telemetry, routing; **nie** przywracać WIP 02F jako implementacji |

---

## 1. Problem / RCA (FACT)

### 1.1 Symptom (OWNER PROD OBSERVATION)
- `QuotaExceededError` przy zapisie `kw-tenders-pipeline` do LocalStorage: attempted ≈ 2.65–2.69 MB UTF-8, itemCount 495–505, LS total ≈ 4.679 MB, klient 2.66.226.
- Log `[pipeline-cloud-lean] deferred bootstrap pipeline write failed (fail-closed, no raw fallback)` (`cloud-sync.ts:3488`).
- Ostatni **udany** zapis LS pipeline ≈ 0.595 MB (stale body).

### 1.2 Immediate cause (CODE FACT)
- Writer A `saveTendersPipelineLocal` (`tenders-bzp.ts:669-704`) zapisuje **LS-lean** = FULL − `noticeHtml` − `kosztorys.rows` (`storage/tenders-pipeline-cold.ts:16-36`). LS-lean **zachowuje** `scanSummary.branchWinnerArtifacts[].snapshot`, `changeMonitor/qaMonitor.events`, `catalogQuantities`, `swzAnalysis`, `bzpDocuments`, `changeMonitor.snapshot`, `tenderFit`.
- Cała tablica (505 poz.) jest pisana atomowo → jedno `setItem` ≈ 2.7 MB przy LS już zajętym w ~4.7 MB.

### 1.3 Contributing causes (CODE FACT)
- Dwie **różne** definicje „lean”: LS-lean (2 pola) vs cloud-lean (5 pól: `noticeHtml`, `kosztorys.rows`, `artifact.snapshot`, `changeMonitor.events`, `qaMonitor.events`; `tender-pipeline/tender-pipeline-cloud-lean.ts`).
- ≥4 fizyczne ścieżki `localStorage.setItem` na klucz (§3.3) z 3 semantykami (lean / raw merged / raw import).
- Budżet `storage-budget.ts` (WARNING 1.2 MiB / CRITICAL 1.4 MiB / LIMIT 1.5 MiB) **nie jest egzekwowany**; LS total = 3× LIMIT.
- Quota łapana cicho: Writer A → telemetria + ring buffer (`logPipelineLocalSaveTelemetry`), Writer B → log fail-closed, C/F → cisza/abort. UI zakłada sukces.
- Pipeline **nie jest** największym kluczem LS: MDP 1.138 · work-catalog 1.016 · jobs 0.754 · archive 0.410 MB (KV = LS 1:1, PRODUCTION FACT).

### 1.4 Primary root cause (RCA, FACT)
Kontrakt Tier-1 z `LOCALSTORAGE-ARCH-02-DESIGN-FREEZE.md` (#LSA-001, #LSA-009, #LSA-014) **nie został zaimplementowany**: `kw-tenders-pipeline` pozostał w LS jako pełny zbiór pozycji z niewystarczającym stripem, bez budżetu i bez zdefiniowanego LOCAL DURABLE FULL. 02F (fasada) nigdy nie weszło do MAIN (untracked, niekompilowalne — §15).

### 1.5 Production facts z KV (2026-09-17, read-only `batch-get`)

| Fakt | Wartość |
|---|---|
| cloud body | 505 poz. · **2.398 MB** UTF-8 · avg 4 749 B · min 384 B · max 168 460 B · 505/505 `_cloudLean` |
| 5 pól omitted w cloud | łącznie **0.1 %** body |
| największe pola cloud | `tenderDossier.kosztorys.catalogQuantities` **26.2 %** · `swzAnalysis` 10.6 % · `bzpDocuments` 7.4 % · `changeMonitor.snapshot` 6.4 % · `tenderFit` 6.1 % · `cpvCode` 6.0 % |
| `ikFinalBid` | 1 poz. (body = guard) |
| guard | `bundleRevision` 291 · `bundleAt` 2026-09-16T10:55Z · `itemCount` 505 · parity id 100 % · `deletedIdsRevision` obecne |
| flagi `kw-app-settings` | `pipelineCloudLeanGuardV1=true` · `pipelineCloudLeanMigrationComplete=true` · `pipelineCloudLeanRollback=false` · `pipelineCloudLeanMigrationRev=1` · `pipelineBootstrapPersistLocal=true` |
| `_coldRowsCount` (marker LS-lean) w cloud | 26 poz. (wyciek markera lokalnego do cloud) |
| `kw-tenders-deleted-ids` | 11 |
| `kw-tender-ingest-v1`, `kw-knr-evidence`, `kw-owner-rate-input-v1` | brak w KV (LS-only) |

---

## 2. Current architecture (FACT, MAIN `3bfecc7f`)

```text
RAM   session cache (TTL)  ─ hydrate z LS podmienia items na LS body (session-cache.ts:65-74)
 │
 ├─► LS   kw-tenders-pipeline = LS-lean · pełny zbiór id · ≥4 writerów (§3.3)
 │        quota → catch silent → LS stale
 │
 ├─► IDB  wgdom-storage-v1 / store kv / key tenders-pipeline-full
 │        FULL surowa tablica · tylko Writer A (setPipelineColdMemory) · best-effort (idbSet→ok)
 │        brak revision/itemCount/writtenAt · reader akceptuje tylko length>0
 │
 └─► KV   kw-tenders-pipeline (LEAN, _cloudLean) + kw-tenders-pipeline-guard (schema v1)
          canonical seam pushTenderPipelineToCloud · write-safety fail-closed · flagi true/true
```

### 2.1 Rzeczywiste authority dziś

| Warstwa | Authority | Uwagi |
|---|---|---|
| KV | LEAN cross-device | heavy (rows, snapshots, events) **poza** cloud |
| LS | de facto lokalny FULL **zbiór id** | body lean; wszystkie readery zakładają komplet pozycji |
| IDB | best-effort FULL copy | może być starsze niż LS (Writer B/C/F omijają IDB) |
| RAM | session state | jedyne miejsce, gdzie FULL po merge istnieje w całości do zapisu |

### 2.2 GAP (potwierdzone RCA/ADR AUDIT)
1. Brak jawnie zdefiniowanego LOCAL DURABLE FULL.
2. Brak formalnego IDB completeness contract.
3. Brak canonical local writer.
4. Brak budget-before-write enforcement.
5. Brak jawnego quota fallback.

---

## 3. Inwentaryzacja stanu MAIN istotna dla kontraktu (FACT)

### 3.1 Readery zakładające synchroniczny FULL zbiór w LS (U8 — 10 ścieżek)

| # | Reader | Plik:linia | Zakłada |
|---|---|---|---|
| R1 | `loadTendersPipelineLocal` | `tenders-bzp.ts:613-626` | LS body lub cold IDB (jedyny reader świadomy lean) |
| R2 | `readPipelineLocal` / `hydratePipelineSessionCacheFromLocalStorage` | `tenders-pipeline-session-cache.ts:36-74` | LS body = items sesji |
| R3 | backup import merge | `App.tsx:1796-1798` | LS body jako strona local merge |
| R4 | `exportBackup` (wszystkie `DATA_KEYS`) | `App.tsx:1714-1717` | LS body = treść backupu |
| R5 | `restoreAllDataFromCloud` | `App.tsx:2021-2035` | `readLocalDataBundle` → merge → raw `setItem` wszystkich `DATA_KEYS` |
| R6 | core bootstrap | `CloudLoader.tsx:184-198` | czyta LS do `mergeAllDataKeys`; **nie** persistuje pipeline (`persistCoreKey` typowany CORE) |
| R7 | `readLocalDataBundle` (IDB snapshot) | `local-data-backup.ts:81-100` | LS body = snapshot |
| R8 | `collectLocalBackupData` (e-mail) | `weekly-backup-email.ts:8-18` | LS body = backup e-mail |
| R9 | deferred bootstrap local side | `cloud-sync.ts` `readLocalStorageDataKey` w `fetchAndMergeDeferredBootstrap` (3390+) | LS body = strona local merge |
| R10 | write-safety local snapshot | `cloud-sync.ts:4969-4979`, `tender-pipeline-cloud-push.ts` | komplet `id` + `ikFinalBid` w lokalnym snapshot; brak → BLOCK |

### 3.2 Minimalny zestaw pól realnie czytany przez listę / scoring / guard (U3 — bez nowych pól)

`id, title, status, submittingOffersDate, publicationDate, organizationName, organizationCity, organizationProvince, cpvCode, tenderId, relevanceScore, matchedKeywords, isWroclaw, priorityBuyerId, priorityBuyerLabel, updatedAt, ikFinalBid, linkedJobId, ourEstimatePln, bzpNumber`

Źródła: `tenders-list-ux.ts`, `tenders-list-filters.ts`, `TenderListDesktopCard/MobileCard.tsx`, `recalculateTenderItemScore` (`tenders-bzp.ts:327-343`), `tenders-strategy-*.ts` (dodatkowo `swzAnalysis?.estimatedValuePln`, `swzAnalysis?.implementationDays`, `tenderDossier?.bidProposal?.recommendedBidPln`, `noticeHtml` w `tenders-strategy-health.ts:91` — dziś i tak strippowane), guard (`id, updatedAt, ikFinalBid`).

### 3.3 Writerzy lokalni (U5/U8)

| Writer | Wejście | LS | IDB | Cloud |
|---|---|---|---|---|
| **A** | `saveTendersPipelineLocal` (`tenders-bzp.ts:669`) | LS-lean + telemetria | FULL (`setPipelineColdMemory`) | — (osobno przez `persistTenderPipelineImmediate` → `pushTenderPipelineToCloud`) |
| **B** | `persistBootstrapMergedKey` w `fetchAndMergeDeferredBootstrap` (`cloud-sync.ts:3378`, `:3450-3488`) | raw merged, fail-closed log | **nie** | canonical seam (29B) |
| **C** | backup import (`App.tsx:1796+`) | raw | nie | `batch-set` |
| **D** | `resetTendersPipeline` (`tenders-admin.ts:14-20`) → `persistKey` (`cloud-sync.ts:5217-5236`) | A ×2 (`[]`) | A (`[]`) | canonical seam + write-safety → BLOCK gdy cloud > 0 |
| **E** | ingest artifact patch (`tender-ingest/persist-ingest-artifact-patch.ts`) | **brak** | brak | authoritative body patch (cloud only) |
| **F** | `restoreAllDataFromCloud` (`App.tsx:2033`) | raw `setItem` wszystkich `DATA_KEYS` | nie | `pushAllDataToCloud` → `pushMergedDataBundleToCloud` (route do seam gdy flagi true) |

### 3.4 Istniejące komponenty (REUSE, FACT)

| Cel | Komponent |
|---|---|
| IDB KV | `storage/storage-idb.ts` (`idbSet/idbGet/idbRemove/idbKeys`, DB `wgdom-storage-v1`, store `kv`, `keyPath: "key"`) |
| cold FULL | `storage/tenders-pipeline-cold.ts` (`PIPELINE_COLD_IDB_KEY`, `setPipelineColdMemory`, `hydratePipelineColdFromIdb`, `resolvePipelineLocalWithCold`) |
| strip | `stripTenderPipelineForLocalStorage` (cold.ts) · `stripTenderPipelineForCloud` / `CLOUD_LEAN_OMITTED_FIELDS` / `isCloudLeanFieldOmitted` (cloud-lean.ts) |
| guard schema | `tender-pipeline-guard.ts` (`TenderPipelineGuardV1`: `schemaVersion`, `bundleRevision`, `bundleAt`, `itemCount`, `deletedIdsRevision`, `items[id,updatedAt,ikFinalBid]`, `parseTenderPipelineGuard`, `verifyGuardBodyParity`) |
| write-safety | `tender-pipeline-write-safety.ts` (`evaluatePipelineSnapshotWriteSafety`, `assertTenderPipelineCloudWriteAllowed`, kody `PIPELINE_*_BLOCKED`) |
| cloud seam | `tender-pipeline/tender-pipeline-cloud-push.ts` (`pushTenderPipelineToCloud`, `measurePipelineCloudPayloadSizes`) · `tender-pipeline-cloud-route.ts` |
| migracja cloud | `tender-pipeline/tender-pipeline-migration.ts` (`migratePipelineFullToLeanGuard`, `getPipelineMigrationRev`) |
| merge | `tenders-sync.ts` (`mergeTenderPipelineForCloud`, `mergePipelineItem`) · `tender-dossier-merge.ts` (`mergeTenderDossierByQuality`, `kosztorysRowsFieldAbsent`) |
| budżet | `storage/storage-budget.ts` (`STORAGE_WARNING/CRITICAL/LIMIT`, `estimateJsonBytes`, `measureLocalStorageBytes`, `budgetStateForTotal`) |
| telemetria | `storage/storage-telemetry.ts` (`recordStorageWrite`, `reportStorageTelemetry`, `__WG_STORAGE__`) · `logPipelineLocalSaveTelemetry` / `readPipelineLocalSaveTelemetry` (`tenders-bzp.ts:640-667`) |
| flagi | `app-settings.ts` (`pipelineCloudLeanGuardV1`, `…MigrationComplete`, `…Rollback`, `…MigrationRev`, `pipelineBootstrapPersistLocal`) |
| session cache | `tenders-pipeline-session-cache.ts` (`cloudHydrated`, `generation`, TTL) |

---

## 4. Target architecture (DECISION)

```text
RAM   session cache = FULL (po hydracji z IDB / cloud merge)
 │
 ├─► LS   kw-tenders-pipeline = canonical hot INDEX (D2)        ← ONE WRITER (D6)
 │        pola: §3.2 (zestaw istniejących readerów; bez nowych pól)
 │        budżet: MEASURE → WARN → BLOCK (D8); przy BLOCK LS pozostaje stale / rebuild best-effort
 │
 ├─► IDB  tenders-pipeline-full = LOCAL DURABLE FULL authority (D1)
 │        completeness contract (D5): schemaVersion · bundleRevision · itemCount · writtenAt ·
 │        maxUpdatedAt · validation · stale/missing/corrupt detection · write ack
 │        klasy A (regenerowalne) i B (historia) = IDB; C (ikFinalBid) = CLOUD + IDB (D4)
 │
 └─► KV   kw-tenders-pipeline LEAN + guard — bez zmian (D3); seam pushTenderPipelineToCloud (D7)

READER FALLBACK (D8): LS INDEX → IDB FULL → RAM · LS rebuild best-effort
INGEST (D4-D / D7): osobny cloud seam, poza kontraktem local writera
```

CONSEQUENCE: readery R1–R10 (§3.1) przestają otrzymywać z LS pełne body — każdy musi zostać w PLAN jawnie sklasyfikowany: (a) czyta INDEX i mu to wystarcza, (b) hydratuje FULL z IDB/RAM przez canonical reader, (c) zmienia semantykę (backup/e-mail/restore). To jest **główny koszt** D2 i główny obszar ryzyka regresji.

---

## 5. Authority matrix (DECISION)

| Dane | RAM | LS (INDEX) | IDB (FULL) | KV (LEAN) | Authority |
|---|---|---|---|---|---|
| zbiór `id` (komplet) | tak | **tak** (INDEX) | tak | tak (guard) | KV guard (cross-device) · IDB (local durable) |
| pola INDEX (§3.2) | tak | **tak** | tak | tak | KV (lean) → IDB → LS |
| A — regenerowalne (`rows`, `branchWinnerArtifacts[].snapshot`, `noticeHtml`, `catalogQuantities`, `swzAnalysis`, `bzpDocuments`) | tak | nie | **tak (D4-A)** | częściowo (`catalogQuantities`, `swzAnalysis`, `bzpDocuments` są w cloud lean — FACT) | **IDB** lokalnie; cloud dla pól nieomijanych; regeneracja z parserów/Storage jako ostatnia linia |
| B — historia (`changeMonitor/qaMonitor.events`, `changeMonitor.snapshot`, `estimateHistory`) | tak | nie | **tak (D4-B)** | events omitted; snapshot w cloud | **IDB** |
| C — `ikFinalBid` | tak | **tak** (pole INDEX, wymagane przez write-safety R10) | tak | **tak** (body + guard parity) | **CLOUD + IDB (D4-C)** |
| D — ingest artifacts (`kw-tender-ingest-v1`) | — | LS-only dziś | — | brak | **OUT OF SCOPE (D4-D)** — osobny seam |
| tombstones `kw-tenders-deleted-ids` | — | tak | — | tak | bez zmian (nie objęte tym ADR) |

---

## 6. FULL vs INDEX boundary (DECISION + FACT)

- **INDEX (LS)** = wyłącznie pola z §3.2, wynikające z istniejących readerów. **Zakaz** dodawania nowych pól bez SEARCH BEFORE CREATE (§22).
- **FULL (IDB/RAM)** = cały `TenderPipelineItem` w kształcie MAIN (bez stripu), łącznie z polami klas A/B/C.
- Pola z `tenders-strategy-*.ts` czytane poza §3.2 (`swzAnalysis?.estimatedValuePln`, `swzAnalysis?.implementationDays`, `tenderDossier?.bidProposal?.recommendedBidPln`, `noticeHtml`) — **PLAN rozstrzyga**, czy wchodzą do INDEX (jako pojedyncze skalarne pola pochodne) czy strategy snapshot hydratuje FULL. Ten ADR **nie** dodaje ich do INDEX z góry.
- Marker: INDEX musi być rozróżnialny od legacy body (D9) — **PLAN** definiuje sposób rozróżnienia w oparciu o istniejące wzorce (`_cloudLean`, `_coldRowsCount`), bez nowego klucza KV.
- UNKNOWN: rozmiar INDEX dla 505 poz. (szacunek na podstawie cloud: same pola skalarne ≈ `id`+`title`+`cpvCode`+`tenderId`+daty+`organization*` ≈ 0.3–0.4 MB — INFERENCE z rozkładu §1.5; PLAN mierzy).

---

## 7. IDB completeness contract (DECISION D5)

| Element | CODE FACT dziś | Kontrakt docelowy (LOCKED minimum) |
|---|---|---|
| `schemaVersion` | brak | wymagane; wzorzec `PIPELINE_GUARD_SCHEMA_VERSION` |
| `bundleRevision` | brak | wymagane; źródło: guard cloud (`bundleRevision`) gdy dostępny, lokalny licznik gdy offline — **PLAN rozstrzyga regułę** |
| `itemCount` | tylko `length` | wymagane; = liczba aktywnych pozycji (bez tombstones) |
| `writtenAt` | brak | wymagane (ISO) |
| `maxUpdatedAt` | brak | wymagane; max `items[].updatedAt` |
| validation | `Array.isArray && length>0` | wymagane: `schemaVersion` match · `Array.isArray(items)` · `items.length === itemCount` · każdy item ma `id` · `ikFinalBid` parity względem guard, gdy guard dostępny (reuse `verifyGuardBodyParity`) |
| stale detection | brak | wymagane: `bundleRevision` < guard.`bundleRevision` **lub** `maxUpdatedAt` < guard max → STALE (nie odrzucaj; oznacz i merge) |
| missing detection | `null`/pusta → fallback lean | wymagane: `null` / brak klucza → MISSING (K7) |
| corrupt detection | brak | wymagane: parse/validation fail → CORRUPT → nie używaj; telemetria |
| write acknowledgement | `idbSet → boolean` ignorowany przez callera | wymagane: writer zna wynik (ok/fail) i emituje telemetrię; **PLAN rozstrzyga**, czy LS INDEX write czeka na ack IDB (sync/async) |
| eviction | brak detekcji | MISSING po wcześniejszym OK = EVICTED (telemetria) |
| migration | brak wersji | `schemaVersion` bump = migracja rekordu (D9) |

CONSEQUENCE: rekord IDB zmienia kształt z surowej tablicy na envelope (metadane + `items`). D9 obejmuje legacy surową tablicę.

RISK: K7 — IDB unavailable (tryb prywatny, eviction, uszkodzenie) → FULL nie jest durable na tym urządzeniu; kontrakt musi to **wykrywać i raportować**, a nie ukrywać.

---

## 8. Local writer contract (DECISION D6)

Canonical local writer = **istniejący `saveTendersPipelineLocal(items)`** (`tenders-bzp.ts:669`), rozszerzony:

1. `items` = FULL (kształt MAIN).
2. **FULL → IDB** z envelope D5; wynik (ack) znany writerowi.
3. **INDEX → LS** (`kw-tenders-pipeline`) po **budget check** D8 (MEASURE → WARN → BLOCK).
4. RAM (cold memory / session cache) aktualizowany zawsze, niezależnie od wyniku LS/IDB.
5. Telemetria `recordStorageWrite` dla obu tierów (tier 1 = INDEX, tier 2 = FULL) + istniejący ring buffer `logPipelineLocalSaveTelemetry`.
6. **Żaden inny moduł nie woła `localStorage.setItem(TENDERS_PIPELINE_KEY, …)`** — B, C, F delegują (D7). #LSA-001/#LSA-005.
7. **Nie** powstaje generic storage-manager (D6, D10). Rozszerzenie dotyczy wyłącznie tego klucza.

CONSEQUENCE: `persistKey(TENDERS_PIPELINE_KEY)` (`cloud-sync.ts:5222-5236`) już deleguje do A — pozostaje. `persistBootstrapMergedKey` (B) i raw `setItem` (C, F) wymagają zmiany na delegację w PLAN.

UNKNOWN: koszt CPU strip INDEX + IDB write dla 505 poz. na słabym urządzeniu (poprzednia regresja wydajności zablokowała 02F F1 — §15).

---

## 9. Cloud seam contract (DECISION D3/D7 — bez zmian funkcjonalnych)

- Jedyny cloud writer pipeline: **`pushTenderPipelineToCloud`** (lean + guard + verify + write-safety). FACT: `persistKey` woła go bezpośrednio; ścieżki generyczne (`fetchAndMergeDeferredBootstrap`, `pushKeysToCloud`, `pushMergedDataBundleToCloud`, `pushKeysToCloudSafe`) routują przez `shouldRoutePipelinePushToCanonicalSeam` **tylko** gdy flagi true/true (prod: true/true).
- Write-safety **wymaga kompletnego lokalnego snapshotu** (`id` + `ikFinalBid`) — po D2 snapshot do write-safety **musi pochodzić z FULL (IDB/RAM), nie z LS INDEX**, chyba że INDEX zawiera `id` + `ikFinalBid` (zawiera — §3.2). PLAN potwierdza źródło.
- Cloud contract (5 pól omitted, `_cloudLean`, guard v1) — **bez zmian**. Wyciek `_coldRowsCount` do cloud (26 poz.) = obserwacja do PLAN (czy strip cloud ma usuwać markery lokalne) — **nie** zmiana kontraktu.
- Edge Functions — **zakaz zmian** (#LSA-013).

---

## 10. Backup contract (DECISION D7 BACKUP = canonical writer)

| Ścieżka | FACT dziś | Kontrakt docelowy |
|---|---|---|
| `exportBackup` (R4) | czyta LS body → JSON z LS-lean (bez rows/noticeHtml) | źródło treści pipeline w backupie: **FULL z IDB/RAM przez canonical reader**, nie LS INDEX — **PLAN rozstrzyga**, czy backup = FULL czy LEAN parity (rozmiar pliku) |
| backup import (R3 / Writer C) | raw `setItem` po merge z LS | **deleguje do canonical writer** (FULL → IDB, INDEX → LS) |
| `restoreAllDataFromCloud` (R5 / Writer F) | raw `setItem` wszystkich `DATA_KEYS` | pipeline **wyłączony z raw pętli** → canonical writer; pozostałe klucze poza zakresem ADR |
| IDB snapshot `local-data-backup.ts` (R7) | LS body → `kw-local-snapshot-bundle*` w IDB | pipeline w snapshot = INDEX (LS) — **PLAN rozstrzyga**, czy snapshot rotacyjny ma zawierać FULL (podwójna kopia w IDB, #LSA-006) |
| e-mail backup (R8) | LS body | jak R4 |

RISK: dzisiejsze backupy **już** są lean (bez rows/noticeHtml) — restore z backupu nie odtwarza heavy. D2 nie pogarsza tego, o ile backup czyta FULL z IDB.

---

## 11. Reset safety contract (DECISION D7 RESET = safety-first)

FACT: `resetTendersPipeline` (`tenders-admin.ts:14-20`) → `clearDeletedTenderIds()` → `saveTendersPipelineLocal([])` → `persistKey(KEY, [])` (A ponownie + `pushTenderPipelineToCloud([])` → write-safety **BLOCK** przy cloud > 0) → `alert(e.message)` (`AdminSettingsModal.tsx:839-845`). Efekt: **lokalny wipe (LS + IDB) wykonany przed sprawdzeniem**, cloud nietknięty.

Kontrakt docelowy:
1. Najpierw **ocena możliwości operacji**: odczyt cloud + `guardTenderPipelineCloudWrite([], cloud)`; jeżeli BLOCK → **żadnej destrukcji lokalnej**, komunikat do Ownera.
2. Dopiero po pozytywnym werdykcie (lub jawnym Owner override — **PLAN rozstrzyga**, czy override istnieje) → cloud write → local wipe przez canonical writer (IDB + LS + RAM + tombstones).
3. Kolejność: cloud → local (nie local → cloud).

---

## 12. Quota contract (DECISION D8)

### 12.1 PIPELINE QUOTA (ten ADR)
- **MEASURE**: `estimateJsonBytes(INDEX)` + `measureLocalStorageBytes().total` przed `setItem` (reuse `storage-budget.ts`).
- **WARN**: `budgetStateForTotal(total + delta)` ∈ {warning, critical} → telemetria + (PLAN) sygnał UI.
- **BLOCK**: stan `over` **lub** `QuotaExceededError` → **nie pisz LS**; FULL pozostaje w IDB (D1); INDEX w LS = stale; RAM aktualne; telemetria `quota_blocked`.
- **Zakaz**: retry-loop, testowy `setItem`, downgrade body bez wiedzy readerów.
- Progi: istniejące `STORAGE_WARNING/CRITICAL/LIMIT` (1.2/1.4/1.5 MiB) są **budżetem projektowym**, nie limitem przeglądarki. FACT: LS total 4.679 MB > LIMIT → przy dzisiejszych progach **każdy** zapis byłby BLOCK. **PLAN musi rozstrzygnąć** progi/semantykę (per-key vs global) — inaczej D8 zablokuje INDEX na starcie. Ten ADR **nie** zakłada realnego quota 5 MiB.

### 12.2 GLOBAL LOCALSTORAGE BUDGET (poza zakresem funkcjonalnym, w zakresie faktów)
- FACT: MDP 1.138 · work-catalog 1.016 · jobs 0.754 · archive 0.410 MB (KV = LS) + `kw-knr-evidence` 0.229 (LS-only) + `kw-tender-ingest-v1` (UNKNOWN). Pipeline = 12.7 % LS.
- CONSEQUENCE: D8 dla pipeline **nie usuwa** presji globalnej; inne klucze = osobne briefy (Owner GO). Ten ADR **nie** klasyfikuje innych kluczy.

### 12.3 READER FALLBACK
`LS INDEX → IDB FULL → RAM`; jeżeli LS INDEX stale/missing, a IDB FULL OK → **LS rebuild best-effort** (zapis INDEX przez canonical writer, pod budżetem). Jeżeli IDB MISSING/CORRUPT i RAM pusty → hydracja z cloud (lean) + regeneracja heavy (klasa A) na żądanie — **PLAN definiuje UX** (nie ten ADR).

---

## 13. Reader fallback (DECISION D8 → mapa R1–R10)

| Reader | Docelowo czyta | Fallback |
|---|---|---|
| R1 `loadTendersPipelineLocal` | INDEX (LS) → FULL (IDB) → RAM | jedyny reader już częściowo zgodny (`resolvePipelineLocalWithCold`) |
| R2 session-cache hydrate | **nie może** podmieniać items sesji na LS INDEX; hydratuje FULL (IDB/RAM) lub tylko patch INDEX-owych pól | PLAN |
| R3/R4/R5/R7/R8 backup/restore/e-mail | FULL z IDB/RAM (§10) | PLAN (rozmiar) |
| R6 CloudLoader core | czyta LS (INDEX) do merge, nie persistuje — wpływ: merge core z INDEX zamiast body (tylko CPU; wynik nieużywany dla pipeline) | weryfikacja w PLAN |
| R9 deferred bootstrap local side | strona local merge = FULL (IDB/RAM), nie INDEX; wynik → canonical writer | PLAN |
| R10 write-safety | snapshot local = FULL (IDB/RAM) lub INDEX (zawiera `id`+`ikFinalBid`) | PLAN potwierdza |
| detal `TenderDetailPanel`, merge, rescore-persist, IK G3 | FULL (RAM po hydracji) | bez zmian semantyki, zmiana źródła |

---

## 14. Migration / backward compatibility (DECISION D9 — nie reset)

| Scenariusz startowy | Detekcja | Zachowanie |
|---|---|---|
| **legacy LS FULL** (stare body z `noticeHtml`/`rows`) | brak markera INDEX; obecność heavy pól | traktuj jako FULL → zapisz do IDB (D5) → przepisz LS na INDEX przez canonical writer |
| **legacy LS LEAN** (0.595 MB, `_coldRowsCount`) | marker `_coldRowsCount` / brak `noticeHtml`, `rows=[]` | traktuj jako LEAN → merge z IDB FULL (jeśli jest) → IDB envelope → LS INDEX; `rows=[]` chronione przez `kosztorysRowsFieldAbsent` tylko przy `rowCount>0` (FACT) |
| **INDEX** (docelowe) | marker INDEX + `schemaVersion` | ścieżka normalna |
| **IDB missing** | `idbGet → null` | źródło FULL = cloud lean (+ legacy LS jeśli pełniejsze) → zapisz envelope; heavy klasy A regenerowane na żądanie |
| **IDB stale** (rev/maxUpdatedAt < guard) | D5 detection | nie odrzucaj; merge z cloud (`mergeTenderPipelineForCloud`, preserve-heavy) → nowy envelope |
| **IDB legacy raw array** (dzisiejszy kształt) | brak envelope | traktuj jako FULL bez metadanych → migruj do envelope przy pierwszym zapisie |
| **IDB corrupt** | parse/validation fail | ignoruj + telemetria → jak missing |
| **legacy client** (< wersja z INDEX) na tym samym urządzeniu | czyta LS INDEX jako body → lista działa (pola §3.2), detal bez heavy do czasu cloud merge | akceptowalne? — **PLAN rozstrzyga** gate wersji (wzorzec `PIPELINE_CLOUD_LEAN_MIN_APP_VERSION`, `app-settings.ts:409-424`) |
| **partial migration** (część urządzeń INDEX, część legacy) | cloud lean = wspólny mianownik | bez wpływu na cloud contract (D3) |
| **migration flag** | brak flagi dla local contract (FACT) | **PLAN rozstrzyga**, czy potrzebna flaga kill-switch analogiczna do `pipelineCloudLeanRollback` (nowy element — SEARCH BEFORE CREATE) |
| **cloud migration** | rev 291, parity 100 % | **brak** — cloud bez zmian |

Zależności: D1 (IDB jako cel migracji), D2 (kształt INDEX), D5 (envelope), D8 (czy INDEX mieści się pod budżetem na starcie — inaczej migracja kończy się BLOCK i LS pozostaje legacy).

---

## 15. 02F partial recovery (DECISION D10)

| Element 02F | Stan (FACT) | Decyzja |
|---|---|---|
| `src/lib/storage/storage-manager.ts` | untracked; importuje `estimateJsonBytesFast` nieistniejące na MAIN → **niekompilowalne** | **NIE przywracać** |
| `storage-key-registry.ts` | untracked; zwraca Tier 1 dla wszystkich kluczy | NIE przywracać |
| `storage-budget-cache.ts`, `storage-tier1-ls.ts` (pusty) | untracked | NIE przywracać |
| docs 02F (`LOCALSTORAGE-ARCH-02F-*`) | tracked/untracked mieszane; `IMPLEMENTATION-REPORT` deklaruje COMPLETE wbrew stanowi MAIN (DOCUMENTATION_CONFLICT) | pozostają historyczne; **nie** są SSOT |
| idea **one-writer** | #LSA-001 | **ODZYSKANA** jako D6 (zakres: tylko pipeline) |
| idea **budget-before-write** | #LSA-009 | **ODZYSKANA** jako D8 (reuse `storage-budget.ts`) |
| idea **telemetry** | #LSA-016, `__WG_STORAGE__` (już na MAIN) | **ODZYSKANA** — rozszerzenie eventów, bez nowego modułu |
| idea **routing** (fasada decyduje o tierze) | 02F | **ODZYSKANA** w wąskiej formie: canonical writer routuje FULL→IDB / INDEX→LS dla jednego klucza |
| regresja wydajności F1 (`P0-TENDERS-FREEZE`) | zablokowała 02F | **wymaga ponownej weryfikacji** w PLAN (budżet CPU zapisu) |
| zgodność 02F z Track B / 29B | 02F powstało przed lean+guard | wymaga ponownej weryfikacji, jeżeli PLAN sięga po fragmenty kodu |

---

## 16. Explicit non-goals

- Nowy generic storage-manager / fasada dla wszystkich `DATA_KEYS` (wymaga osobnego Owner GO).
- Zmiana cloud contract (5 pól omitted, guard v1, write-safety, Edge).
- Klasyfikacja/migracja innych dużych kluczy LS (MDP, work-catalog, jobs, archive, knr-evidence).
- `kw-tender-ingest-v1` (D4-D OUT OF SCOPE).
- Payroll, CloudLoader gate, merge SSOT poza pipeline (#LSA-011/012).
- Zmiana semantyki `kw-tenders-deleted-ids`.
- Auto-run migracji cloud (`migratePipelineFullToLeanGuard`).
- Założenie realnego quota przeglądarki (5 MiB) jako stałej.
- Rozwiązanie „blank UI” lokalnego budżetu (osobny audyt `IK-LOCALHOST-STORAGE-BUDGET-*`).

---

## 17. Risks (RISK)

| # | Ryzyko | Skutek | Mitygacja w PLAN |
|---|---|---|---|
| R-1 | Readery R2–R10 czytają INDEX jak body | puste detale, błędny merge, backup ze stubami, write-safety BLOCK | mapa §13, testy per reader, etapy odwracalne |
| R-2 | K7 IDB unavailable | brak LOCAL DURABLE FULL na urządzeniu | detekcja D5 + telemetria + hydracja z cloud + regeneracja |
| R-3 | Budżet D8 przy LS 4.679 MB > LIMIT 1.5 MiB | INDEX zawsze BLOCK → migracja nie kończy się | PLAN definiuje progi/semantykę przed IMPLEMENT |
| R-4 | Regresja wydajności zapisu (jak 02F F1) | freeze UI Przetargi | pomiar CPU, coalesce (reuse `tender-pipeline-persist-coalesce.ts`) |
| R-5 | Utrata heavy klasy A/B przy IDB stale + LS INDEX | brak rows/snapshot lokalnie | merge preserve-heavy z IDB przed nadpisaniem; nie nadpisuj IDB pustszym |
| R-6 | Session-cache hydrate (R2) nadpisuje FULL INDEX-em | persist FULL bez heavy → cloud lean bez `rowCount` → utrata | R2 zmieniony przed włączeniem INDEX |
| R-7 | Reset (D7) z override | destrukcja lokalna przy cloud BLOCK | kolejność cloud→local, brak override bez Owner GO |
| R-8 | Legacy klient na tym samym urządzeniu | detal bez heavy do merge | gate wersji (PLAN) |
| R-9 | Marker INDEX wycieka do cloud (jak `_coldRowsCount`) | pole śmieciowe w KV | strip cloud usuwa markery lokalne (PLAN, bez zmiany kontraktu) |
| R-10 | Backup FULL z IDB zwiększa rozmiar pliku/e-maila | limity poczty | PLAN: FULL vs LEAN parity w backupie |

---

## 18. Rollback strategy

- Każdy etap PLAN musi być **odwracalny** bez utraty danych: IDB envelope zachowuje FULL; LS INDEX można odtworzyć z IDB; cloud niezmieniony.
- **Kill-switch lokalny**: PLAN rozstrzyga, czy istniejący wzorzec flag (`app-settings.ts`, remote-wins) zostaje użyty do wyłączenia INDEX (powrót do zapisu LS-lean przez ten sam canonical writer). Bez flagi rollback = redeploy poprzedniej wersji (Vercel) — akceptowalne tylko, jeżeli PLAN wykaże, że legacy klient poprawnie czyta INDEX/IDB envelope (D9).
- Cloud: `pipelineCloudLeanRollback` istnieje, **nie jest** częścią tego rollbacku (D3 bez zmian).
- Zakaz rollbacku przez `localStorage.clear()` / usunięcie IDB (destrukcja lokalna).

---

## 19. Telemetry / observability

Reuse (FACT): `recordStorageWrite` / `__WG_STORAGE__.report()/largest()/budget()/writers()/history()` (`storage-telemetry.ts`), `logPipelineLocalSaveTelemetry` ring buffer (`wgdom-pipeline-ls-telemetry`, max 50), kody write-safety.

Wymagane zdarzenia (rozszerzenie istniejących, bez nowego modułu):

| Zdarzenie | Pola |
|---|---|
| `pipeline.idb.write` | ok/fail, bytes, itemCount, bundleRevision, writtenAt, durationMs |
| `pipeline.idb.read` | status ∈ {OK, MISSING, STALE, CORRUPT, EVICTED}, bundleRevision(IDB vs guard), itemCount |
| `pipeline.ls.index.write` | ok/blocked/quota, bytes, total LS, budgetState |
| `pipeline.ls.legacy.detected` | kind ∈ {FULL, LEAN, INDEX, unknown} |
| `pipeline.reader.fallback` | reader id (R1–R10), source ∈ {LS, IDB, RAM, CLOUD} |
| `pipeline.reset.blocked` | verdict code |

Zasada #LSA-016: telemetria diag ON do closeout; bez PII (jak dziś).

---

## 20. Implementation dependencies

| Zależność | Stan | Blokuje |
|---|---|---|
| D5 envelope zdefiniowany (schema) | ADR LOCKED, szczegół w PLAN | D1, D9 |
| Progi/semantyka budżetu D8 przy LS 4.679 MB | **OPEN → PLAN** | włączenie INDEX |
| Mapa R1–R10 → INDEX/FULL/zmiana semantyki | ADR §13, decyzje szczegółowe w PLAN | D2 |
| Delegacja B/C/F do canonical writer | PLAN | D6/D7 |
| Reset cloud→local | PLAN | D7 |
| Gate wersji / kill-switch lokalny | **OPEN → PLAN** (nowy element?) | D9, §18 |
| Weryfikacja wydajności zapisu (F1 regresja) | **OPEN → PLAN** | D6 |
| U6 stan IDB Ownera (505/FULL vs puste/stale) | **UNKNOWN** (odczyt w profilu Ownera) | ocena ryzyka migracji D9, nie kontrakt |
| U1 rozmiar FULL / INDEX | **UNKNOWN / INFERENCE** | wymiarowanie D8 |
| U9 realny quota | **UNKNOWN** | tylko jeśli PLAN wybiera próg absolutny |

---

## 21. PLAN entry criteria

```text
ADR FINAL            = COMPLETE
OWNER DECISIONS      = LOCKED (D1–D10, §0)
TARGET ARCHITECTURE  = LOCKED (§4–§14)
IMPLEMENTATION       = NO
COMMIT               = NO
PUSH                 = NO
PROD MUTATION        = NO
NEXT                 = PLAN
```

PLAN musi:
1. Rozbić implementację na **małe, odwracalne etapy** z osobnymi testami i gate'ami (wzorzec #LSA-015, `docs/AI/FEATURE_IMPLEMENTATION_CHECKLIST.md`, `PAYROLL_SAFETY_GATE.md` jako gate formalny mimo Payroll OUT OF SCOPE).
2. Rozstrzygnąć pozycje oznaczone „PLAN rozstrzyga” (§6, §7, §8, §9, §10, §11, §12.1, §14, §18).
3. Zdefiniować testy: envelope D5 (validation/stale/corrupt), canonical writer (FULL→IDB, INDEX→LS, BLOCK), każdy reader R1–R10, migracja z 3 stanów legacy, reset safety-first, telemetria.
4. Zaplanować pomiary read-only w profilu Ownera **przed** etapem migracji: `__WG_STORAGE__.largest()`, IDB `tenders-pipeline-full` count/size, `navigator.storage.estimate()`, `kw-tender-ingest-v1` size.
5. Nie zaczynać od etapu, który zmienia kształt LS, zanim R2 (session-cache hydrate) i R10 (write-safety) nie będą czytać FULL/INDEX poprawnie.

---

## 22. SEARCH BEFORE CREATE requirements

Przed dodaniem **jakiegokolwiek** nowego symbolu PLAN/IMPLEMENT musi wykazać brak istniejącego odpowiednika:

| Potrzeba | Najpierw sprawdź (istniejące) |
|---|---|
| envelope IDB / metadane | `TenderPipelineGuardV1`, `parseTenderPipelineGuard`, `verifyGuardBodyParity` (`tender-pipeline-guard.ts`) |
| strip INDEX | `stripTenderPipelineForLocalStorage`, `stripTenderPipelineForCloud`, `CLOUD_LEAN_OMITTED_FIELDS`, `buildTenderPipelineGuard` (już produkuje `id/updatedAt/ikFinalBid`) |
| zapis/odczyt IDB | `storage-idb.ts`, `tenders-pipeline-cold.ts` |
| budżet | `storage-budget.ts` (`estimateJsonBytes`, `measureLocalStorageBytes`, `budgetStateForTotal`) |
| telemetria | `storage-telemetry.ts`, `logPipelineLocalSaveTelemetry` |
| detekcja lean/legacy | `isCloudLeanFieldOmitted`, `_cloudLean`, `_coldRowsCount`, `kosztorysRowsFieldAbsent`, `kosztorysEffectiveRowCount` |
| merge preserve-heavy | `mergeTenderPipelineForCloud`, `mergeTenderDossierByQuality` |
| write-safety / reset | `guardTenderPipelineCloudWrite`, `assertTenderPipelineCloudWriteAllowed`, `resetTendersPipeline` |
| flagi / gate wersji | `app-settings.ts` (`pipelineCloudLean*`, `pipelineBootstrapPersistLocal`), `isAppVersionAtLeast`, `PIPELINE_CLOUD_LEAN_MIN_APP_VERSION` |
| coalesce zapisu | `tender-pipeline-persist-coalesce.ts` |
| hydracja readerów | `hydratePipelineColdFromIdb`, `resolvePipelineLocalWithCold`, `hydratePipelineSessionCacheFromLocalStorage` |
| backup/restore | `readLocalDataBundle`, `collectLocalBackupData`, `exportBackup`, `restoreAllDataFromCloud`, `importBackup` |
| 02F | **zakaz** importu z untracked `storage-manager.ts` / `storage-key-registry.ts` / `storage-budget-cache.ts` / `storage-tier1-ls.ts` |

Potencjalnie **nieuniknione NEW** (do jawnego uzasadnienia w PLAN): typ envelope IDB (jeżeli guard v1 nie wystarcza), marker INDEX w LS, funkcja budująca INDEX z §3.2, lokalny kill-switch (jeżeli PLAN go wymaga), zdarzenia telemetrii §19.

---

## 23. Pozostałe UNKNOWN (nie blokują ADR FINAL)

| UNKNOWN | Źródło zamknięcia | Wpływ |
|---|---|---|
| U1 — rozkład FULL per pole (snapshoty artefaktów + rows) | eksport IDB `tenders-pipeline-full` w profilu Ownera | wymiarowanie D8, backup FULL vs LEAN |
| U6 — stan IDB Ownera (istnieje / 505 / stale) | DevTools read-only | ocena ryzyka startu migracji D9 |
| U9 — realny quota / `navigator.storage.estimate()` | profil Ownera | tylko przy progu absolutnym D8 |
| rozmiar `kw-tender-ingest-v1` | profil Ownera | D4-D OUT OF SCOPE; presja globalna |
| rozmiar INDEX dla 505 poz. | PLAN pomiar (INFERENCE 0.3–0.4 MB) | D8 |
| koszt CPU canonical writer (FULL→IDB + INDEX) | PLAN pomiar | D6, R-4 |

---

## 24. Historia dokumentu

| Data | Zmiana |
|---|---|
| 2026-09-17 | ADR FINAL — Owner Decisions D1–D10 LOCKED; target architecture LOCKED; PLAN entry criteria. Brak zmian kodu/LS/IDB/KV/flag. |
| 2026-09-19 | **CLOSEOUT (Phase 22)** — implementation + production rollout + UI verify COMPLETE; D1–D10 **UNCHANGED**; see §25. |

---

## 25. CLOSEOUT — PRODUCTION VERIFIED (Phase 22 · documentation only)

> **D1–D10 LOCKED — nie renegocjowane.** Ten wpis tylko domyka cykl życia ADR po dowodach Phase 18–21.

| Pole | Wartość |
|---|---|
| **STATUS** | **IMPLEMENTED · PRODUCTION VERIFIED · EPIC CLOSED** |
| **Release** | UI **2.66.231** · commit **`16bfb9f3`** |
| **Architecture** | **IDB FULL → LS INDEX → Cloud LEAN** |
| **`pipelineLocalIndexV1`** | **`true`** (production AppSettings) |
| **`pipelineLocalIndexMinAppVersion`** | **`"2.66.231"`** |
| **Phase 18** | Production verify (flag OFF → release on tip) |
| **Phase 19** | Min version set |
| **Phase 20** | INDEX ON · PRODUCTION_ROLLOUT **PASS** |
| **Phase 21** | Authenticated Przetargi UI **PASS** · **P20-P3-03 CLOSED** |
| **Destructive migration** | **NO** |
| **Data loss / QuotaExceeded / unexpected write (rollout)** | **NO / NO / NO** |
| **Downgrade after INDEX** | **UNSUPPORTED** (Owner Rule #6 · P20-P2-01) |
| **Supported rollback** | flag `false` only · IDB FULL preserved · no INDEX→FULL · no Cloud reset |
| **Ingest** | `kw-tender-ingest-v1` **OUT OF SCOPE** (D4 / PIPELINE-INGEST-01) |
| **Canonical closeout** | [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md) |

```text
ADR_CLOSEOUT         = COMPLETE
IMPLEMENTATION       = COMPLETE (Phases 1–11 + release 12–17)
PRODUCTION_VERIFY    = PASS (18–21)
RUNTIME_CHANGE_P22   = NO
PROD_MUTATION_P22    = NO
```
