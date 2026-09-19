# STORAGE-TIER1-PIPELINE-CONTRACT-01 — PLAN

> **Status:** **PLAN COMPLETE · EXECUTED · CLOSED** (Phase 22 §18) · historyczny banner „IMPLEMENT = NO” superseded  
> **Data:** 2026-09-17 · **Closeout:** 2026-09-19 · **Baseline (plan):** `3bfecc7f` / 2.66.230 · **Production:** **2.66.231** / **`16bfb9f3`**  
> **ADR (LOCKED):** [`ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md`](ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md) — D1–D10 nie są tu renegocjowane  
> **Epic:** [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md)  
> **Reguła krytyczna (CSR):** NIGDY `LS = INDEX ∧ IDB ∈ {missing, invalid, stale-bez-FULL} ∧ brak odtworzenia FULL`. Każda faza poniżej wymusza kolejność: **IDB FULL ACK → dopiero LS INDEX**.

```text
PHASE 0 preflight → 1 IDB envelope → 2 INDEX builder → 3 dual-write safe → 4 readers (batch) →
5 LS INDEX cutover (flag) → 6 one-writer → 7 quota/budget → 8 compat/migration → 9 02F ideas → 10 prod migration
Gate po każdej fazie · brak big-bang · brak jednoczesnej zmiany readerów i writerów
```

---

## 1. BASELINE (Phase 0 — FACT)

| Pole | Wartość |
|---|---|
| HEAD / origin/main | `3bfecc7f` / `3bfecc7f` · branch `main` |
| prod `version.json` | 2.66.230 · `3bfecc7` · 2026-09-16T07:27Z |
| CHANGELOG[0] | 2.66.230 |
| working tree | WIP sprzed programu (52 M w `src/`, wiele `??` docs/tmp) — **nietknięty**; ADR + ten PLAN = `??` |
| cloud KV | body 505 poz. · 2.398 MB lean · guard rev 291 · flagi `pipelineCloudLeanGuardV1=true`, `…MigrationComplete=true`, `…Rollback=false`, `pipelineBootstrapPersistLocal=true` |
| Owner prod | LS total ≈ 4.679 MB · pipeline LS-lean attempted ≈ 2.65–2.69 MB → Quota · ostatni udany LS zapis ≈ 0.595 MB |

---

## 2. CURRENT CONTRACT (FACT, potwierdzone w MAIN)

### 2.1 Seamy zapisu (write)

| Writer | Ścieżka | LS | IDB | Cloud |
|---|---|---|---|---|
| A | `saveTendersPipelineLocal` (`tenders-bzp.ts:669-704`) | LS-lean (`stripTenderPipelineForLocalStorage`, cold.ts:16-36) · quota → telemetria, cicho | `setPipelineColdMemory` → `idbSet(tenders-pipeline-full, items)` surowa tablica, wynik tylko do telemetrii (cold.ts:38-51) | — |
| A′ | `saveTendersPipeline` (`tenders-bzp.ts:745-751`) | A | A | `pushTenderPipelineToCloud` |
| A″ | `syncTenderPipelineLocalOnly` / `persistTenderPipelineImmediate` (`persist-coalesce.ts:65-68, 183-202`) | A + `patchPipelineSessionCache` | A | seam (debounce) |
| B | `persistBootstrapMergedKey` (`cloud-sync.ts:3378-3387`) z `fetchAndMergeDeferredBootstrap` (`:3418-3432`) | **raw** `safeSetLocalStorageJson(merged)` | **nie** | seam (`:3480-3491`) gdy flagi true |
| C | `importBackup` (`App.tsx:1796-1808`) | **raw** `localStorage.setItem` po `mergeTenderDataKey` | nie | `batch-set` |
| D | `resetTendersPipeline` (`tenders-admin.ts:14-20`) | A(`[]`) ×2 | A(`[]`) | `persistKey` → seam → write-safety BLOCK gdy cloud > 0 (`cloud-sync.ts:5217-5236`) |
| E | `persist-ingest-artifact-patch.ts` | brak | brak | authoritative patch cloud (D4-D OUT OF SCOPE) |
| F | `restoreAllDataFromCloud` (`App.tsx:2021-2035`) | **raw** `setItem` wszystkich `DATA_KEYS` | nie | `pushAllDataToCloud` (route do seam) |

### 2.2 Seamy odczytu (read) — R1–R10 (U8) potwierdzone + 0 nowych

| # | Reader | Plik | Czyta dziś |
|---|---|---|---|
| R1 | `loadTendersPipelineLocal` | `tenders-bzp.ts:613-626` | LS → `resolvePipelineLocalWithCold` (cold mem > lean) |
| R2 | `hydratePipelineSessionCacheFromLocalStorage` | `session-cache.ts:65-74` (event `wgdom-deferred-bootstrap`) | **LS body → podmienia `cache.items`** |
| R3 | `importBackup` local side | `App.tsx:1797` | LS body |
| R4 | `exportBackup` | `App.tsx:1714-1721` | LS body (sync) |
| R5 | `restoreAllDataFromCloud` local side | `App.tsx:2030` → `readLocalDataBundle` | LS body |
| R6 | CloudLoader core merge | `CloudLoader.tsx:186-312` | LS do `mergeAllDataKeys`; **nie persistuje pipeline** (`persistCoreKey` typowany CORE) |
| R7 | `readLocalDataBundle` / `saveLocalDataSnapshot` | `local-data-backup.ts:81-121` | LS body → IDB snapshot bundle |
| R8 | `collectLocalBackupData` | `weekly-backup-email.ts:8-18` | LS body |
| R9 | deferred bootstrap local side | `cloud-sync.ts:3419` `readLocalStorageDataKey` | LS body |
| R10 | write-safety snapshot | `pushTenderPipelineToCloud(fullItems)` (RAM) · generyczny seam `cloud-sync.ts` czyta LS | RAM / LS |

Dodatkowe wystąpienia `kw-tenders-pipeline` w `payroll-auto-sync-pipeline.ts`, `tender-offer-run.ts`, `AdminSettingsModal.tsx`, `GuideView.tsx`, `changelog-data.ts` = komentarze/copy — **nie readery**.

### 2.3 Istniejące prymitywy (REUSE — potwierdzone)

| # | Prymityw | Stan | Użycie w PLAN |
|---|---|---|---|
| 1 | `saveTendersPipelineLocal` | sync, `void`, LS-lean + cold | **canonical writer** (rozszerzenie in-place) |
| 2 | `setPipelineColdMemory` | RAM + fire-and-forget `idbSet` | rozszerzenie: envelope + ack promise |
| 3 | `hydratePipelineColdFromIdb` | akceptuje tylko `Array && length>0` | rozszerzenie: envelope parse + status |
| 4 | `storage-idb.ts` | `idbSet/idbGet/idbRemove/idbKeys`, DB `wgdom-storage-v1`/`kv`, rekord `{key,value,updatedAt}` | **bez zmian** (adapter wystarcza) |
| 5–8 | `TenderPipelineGuardV1`, `parseTenderPipelineGuard`, `verifyPipelineBodyGuardIkFinalBidParity`, `buildTenderPipelineGuard` | schema v1 z `id/updatedAt/ikFinalBid`, `itemCount`, `bundleRevision` | wzorzec envelope; parity IDB↔guard; **guard.items[].id = zbiór id do stale/subset detection** |
| 9 | `stripTenderPipelineForLocalStorage` | 2 pola + `_coldRowsCount` | **zastąpiony** przez INDEX builder w Phase 5 (pozostaje do Phase 8 dla legacy-LEAN compat write) |
| 10 | `stripTenderPipelineForCloud` | 5 pól + `_cloudLean`; `_rowsOmitted` | + strip markerów lokalnych (`_lsIndex`, `_coldRowsCount`) — additive |
| 11 | `kosztorysRowsFieldAbsent` / `kosztorysEffectiveRowCount` / `mergeKosztorysPreserveHeavy` | `tender-dossier-merge.ts:32,199,236` | merge legacy-LEAN ↔ IDB FULL |
| 12 | `mergePipelineItem` / `mergeTenderPipelineForCloud` | `tenders-sync.ts:142` z `isCloudLeanFieldOmitted` | merge IDB FULL ↔ cloud lean (stale IDB) |
| 13 | `pushTenderPipelineToCloud` | fail-closed, guard verify, unconfirmed latch | **bez zmian** |
| 14 | `persistBootstrapMergedKey` | generyczny raw | Phase 6: branch pipeline → canonical writer |
| 15 | `persistKey(TENDERS_PIPELINE_KEY)` | już deleguje do A + seam | bez zmian |
| 16 | `persist-coalesce.ts` | debounce cloud, LS sync | bez zmian (woła A) |
| 17 | session-cache hydrate | LS body | Phase 4.1: `getPipelineColdMemory()` |
| 18 | write-safety | `evaluatePipelineSnapshotWriteSafety` id + `ikFinalBid` | bez zmian; źródło snapshot = RAM/FULL lub INDEX (zawiera oba pola) |
| 19 | backup export/import | `App.tsx:1714-1808` | Phase 4.6/4.7 |
| 20 | `restoreAllDataFromCloud` | `App.tsx:2021-2035` | Phase 6 |
| 21 | Admin reset | `tenders-admin.ts` | Phase 6 (reset sub-step) |
| 22 | `storage-budget.ts` | WARNING/CRITICAL/LIMIT 1.2/1.4/1.5 MiB **globalne**; `estimateJsonBytes`, `measureLocalStorageBytes` (pełny skan!) | Phase 7: per-key semantyka; **zakaz** pełnego skanu na hot-path (lekcja 02F V-PERF-A) |
| 23 | `storage-telemetry.ts` | `recordStorageWrite {key,bytes,writer,ok,tier,note}`, `__WG_STORAGE__` | rozszerzenie **tylko przez `note`** + nowe `writer` id — bez zmiany typu |
| 24 | `app-settings.ts` flagi | `pipelineCloudLean*` (remote-wins, default false), `isPipelineCloudLeanClientVersionAllowed`, `PIPELINE_CLOUD_LEAN_MIN_APP_VERSION` | wzorzec dla NEW-03 |
| 25 | 02F WIP | `storage-manager.ts` importuje `estimateJsonBytesFast` (brak na MAIN) → niekompilowalne; `storage-key-registry.ts`, `storage-budget-cache.ts`, `storage-tier1-ls.ts` untracked | **analiza only** — idee: cache+delta budżetu, denied/fallback semantics, writer id |

Test infra: `npm run test:infra` (manifest `test-infra/test-manifest.json`), wzorce `scripts/test-localstorage-arch-02-ae.mjs` (stub `indexedDB = undefined`), `test-ik-od-ocr-25-track-b-pipeline-lean-guard.mjs`, `test-pipeline-write-safety-truncation.mjs`, `test-localstorage-arch-02f-p0-perf.mjs` (perf harness pattern). **Brak** `fake-indexeddb` w `node_modules` (FACT) → patrz NEW-05.

---

## 3. TARGET CONTRACT (z ADR, bez zmian)

```text
RAM  coldMem/session = FULL
IDB  tenders-pipeline-full = ENVELOPE v1 { schemaVersion, bundleRevision(cloudRevisionSeen), localSeq,
                                          itemCount, writtenAt, maxUpdatedAt, items: FULL[] }  ← D1/D5
LS   kw-tenders-pipeline = INDEX[] (per-item additive marker _lsIndex:{v:1})                ← D2
KV   kw-tenders-pipeline LEAN + guard v1 — bez zmian                                        ← D3
Writer: saveTendersPipelineLocal (jedyny local) · pushTenderPipelineToCloud (jedyny cloud) ← D6/D7
Reader: LS INDEX → IDB FULL → RAM · rebuild LS best-effort                                  ← D8
```

---

## 4. REUSE MAP → FILE-LEVEL CHANGE MAP (§6 poniżej) — skrót

| Potrzeba | REUSE | NEW |
|---|---|---|
| IDB adapter | `storage-idb.ts` | — |
| envelope | wzorzec `TenderPipelineGuardV1` + `parseTenderPipelineGuard` | **NEW-01** typ + parse/validate w `tenders-pipeline-cold.ts` |
| INDEX builder | `buildTenderPipelineGuard` (id/updatedAt/ikFinalBid) + pola U3 | **NEW-02** `buildTenderPipelineLsIndex` + marker `_lsIndex` |
| flaga rollout/rollback | wzorzec `pipelineCloudLeanRollback` | **NEW-03** `pipelineLocalIndexV1` |
| ack writer | `idbSet → boolean` | **NEW-04** wynik/promise w `saveTendersPipelineLocal` (in-place) |
| IDB w testach node | stub jak `test-localstorage-arch-02-ae.mjs` | **NEW-05** in-memory `indexedDB` stub (test-only) |
| budżet per-key | `estimateJsonBytes`, `budgetStateForTotal` | **NEW-06** stałe per-key INDEX + cache total (Phase 7) |
| stale/subset | `guard.items[].id`, `bundleRevision`, `maxUpdatedAt` | — |
| merge | `mergeTenderPipelineForCloud`, `mergeKosztorysPreserveHeavy` | — |
| telemetria | `recordStorageWrite`, `logPipelineLocalSaveTelemetry` | — (nowe `note`/`writer`) |
| cloud seam | `pushTenderPipelineToCloud` | — |

---

## 5. IMPLEMENTATION PHASES

### PHASE 0 — BASELINE / READ-ONLY PREFLIGHT
Kroki: `git rev-parse HEAD origin/main` · `curl version.json` · ADR obecny i LOCKED · `git status` (WIP nie zagarniać) · potwierdzenie §2.1/§2.2 (grep `saveTendersPipelineLocal`, `kw-tenders-pipeline`, `TENDERS_PIPELINE_KEY`) · `npm run build` PASS · `npm run test:infra -- --gate B --scope tenders` PASS.  
**GATE 0:** baseline exact (HEAD = origin = prod), build PASS, testy tenders PASS, 0 mutacji.

### PHASE 1 — IDB DURABLE CONTRACT (envelope) — bez zmiany LS
Zakres: `tenders-pipeline-cold.ts` (+ testy). LS nadal LS-lean (bez zmian w `saveTendersPipelineLocal` poza wywołaniem nowej sygnatury cold).

1. **NEW-01** `TenderPipelineIdbEnvelopeV1`:
   `{ schemaVersion: 1, bundleRevision: number /* cloud guard rev widziany przy zapisie, 0 offline-never */, localSeq: number /* monotonic per device */, itemCount, writtenAt: ISO, maxUpdatedAt: ISO|"" , items: TenderPipelineItem[] }`.
2. `parsePipelineIdbEnvelope(raw)` → `{status: "OK"|"MISSING"|"LEGACY_ARRAY"|"CORRUPT", envelope?}`:
   - `null` → MISSING · `Array.isArray(raw)` → LEGACY_ARRAY (dzisiejszy kształt, traktuj jako FULL bez metadanych) · obiekt z `schemaVersion===1 && Array.isArray(items) && items.length===itemCount && items.every(id)` → OK · inaczej CORRUPT.
3. `evaluatePipelineIdbFreshness(envelope, guard: TenderPipelineGuardV1|null)` → `FRESH | STALE_REVISION | STALE_UPDATED_AT | SUBSET_MISSING_IDS | NO_REFERENCE` (guard null → NO_REFERENCE, nie STALE). Stale **nigdy nie odrzuca FULL** — oznacza do merge.
4. `setPipelineColdMemory(items, meta)` → zwraca `Promise<{ ok: boolean; bytes; localSeq }>` (ack). RAM ustawiany synchronicznie jak dziś.
5. `hydratePipelineColdFromIdb()` → `Promise<{ items|null, status }>`; zachowuje dotychczasową semantykę zwrotu dla istniejących callerów (adapter: `items ?? null`).
6. Corrupt/missing → `recordStorageWrite({key: PIPELINE_COLD_IDB_KEY, ok:false, writer:"tenders-pipeline.cold.read", note: status})`.
7. Migration: LEGACY_ARRAY → przy pierwszym zapisie envelope; przy odczycie traktowana jak FULL (`bundleRevision 0`, `localSeq 0`).

Testy (NEW-05 stub + `vite-node`): envelope roundtrip · MISSING · LEGACY_ARRAY · CORRUPT (itemCount≠length, brak id, zły schemaVersion) · STALE_REVISION / STALE_UPDATED_AT / SUBSET vs guard · ack false gdy `indexedDB` undefined · persistence przez „reload” (nowy import modułu, stub zachowuje store).  
**GATE 1:** IDB FULL proven durable: 100 % testów; `npm run build`; brak zmiany LS/readerów; perf P-1/P-2 (§11) zmierzone.

### PHASE 2 — FULL → INDEX BUILDER (bez przełączania readerów)
**NEW-02** `buildTenderPipelineLsIndex(items)` w `tenders-pipeline-cold.ts` (obok stripu). Pola — **wyłącznie z kodu MAIN**:

| Pole | Reader (MAIN) | Powód |
|---|---|---|
| `id`, `updatedAt`, `ikFinalBid` | guard, write-safety (R10), merge | tożsamość + krytyczne pole C |
| `title`, `status`, `submittingOffersDate`, `publicationDate`, `organizationName`, `organizationCity`, `organizationProvince`, `cpvCode`, `tenderId`, `bzpNumber` | `tenders-list-ux.ts`, `tenders-list-filters.ts`, `TenderListDesktopCard/MobileCard.tsx` | lista/filtry |
| `relevanceScore`, `matchedKeywords`, `isWroclaw`, `priorityBuyerId`, `priorityBuyerLabel` | `recalculateTenderItemScore` (`tenders-bzp.ts:327-343`), lista | scoring bez FULL |
| `linkedJobId`, `ourEstimatePln` | karta listy, Pulpit `TendersShortcutPanel` | CTA/KPI |
| `_lsIndex: { v: 1 }` | detektor legacy vs INDEX | marker additive (wzorzec `_cloudLean`) |

Pola strategy poza U3 (`swzAnalysis.estimatedValuePln`, `swzAnalysis.implementationDays`, `tenderDossier.bidProposal.recommendedBidPln`, `noticeHtml` w `tenders-strategy-health.ts:91`) — **PLAN decyzja:** NIE w INDEX; `useTendersStrategySnapshot` konsumuje items z Providera (RAM FULL po hydracji), nie z LS → brak potrzeby. Weryfikacja w Phase 4.2 (grep readerów strategy → źródło = `useTendersPipeline` state).  
Test: INDEX completeness — statyczny test odczytujący listę pól używanych przez każdy reader listy/filtrów/scoringu (harness porównuje `Object.keys(indexItem)` z listą pól czytanych; 505 syntetycznych poz.); rozmiar INDEX zmierzony (P-3).  
**GATE 2:** INDEX contract proven (każde pole ma reader + test), rozmiar INDEX 505 poz. znany (wejście do Phase 7).

### PHASE 3 — DUAL-WRITE SAFE MODE (canonical writer, LS nadal kompatybilny)
Zakres: `saveTendersPipelineLocal` (in-place, **NEW-04**):

```text
saveTendersPipelineLocal(items):
  1. RAM: coldMem = items (sync)
  2. IDB: ackPromise = setPipelineColdMemory(items, {bundleRevision: lastSeenGuardRev, localSeq: ++seq})
  3. LS (Phase 3 = compat): zapis LS-lean jak dziś (stripTenderPipelineForLocalStorage) — kolejność bez zmian
  4. telemetria: recordStorageWrite tier1 (ls) + tier2 (idb ack) · logPipelineLocalSaveTelemetry przy błędzie
  5. zwrot: void (sygnatura zachowana) + eksport `awaitPipelineLocalWriteSettled()` (test/diag) 
```
Failure semantics Phase 3: IDB fail → LS-lean nadal pisany (kompat, jak dziś) + telemetria `idb_write_failed`; LS quota → jak dziś (telemetria) + IDB FULL dalej; oba → RAM + cloud seam; brak retry-loop; brak utraty względem MAIN (Phase 3 jest ⊇ dzisiejszego zachowania).  
Testy: IDB fail · LS fail (stub `setItem` throw) · quota (DOMException name `QuotaExceededError`) · partial write (IDB ok + LS fail; IDB fail + LS ok) · reload (hydrate z envelope) · 505 poz.  
**GATE 3:** brak regresji vs MAIN (testy Track B + write-safety + NG11 timing PASS), ack rate w telemetrii, perf P-1..P-4.

### PHASE 4 — READER MIGRATION (pojedynczo, batch gates)

| # | Reader | CURRENT | TARGET | COMPAT | TEST | ROLLBACK |
|---|---|---|---|---|---|---|
| 4.1 | R2 session-cache hydrate | LS body → `cache.items` | `getPipelineColdMemory() ?? readPipelineLocal()`; **nigdy** nie podmieniaj FULL sesji na INDEX/lean (jeżeli LS zawiera `_lsIndex` lub `_coldRowsCount` → pomiń items, patchuj tylko keywords) | import `tenders-pipeline-cold` (brak cyklu: cold → storage/*, type-only tenders-bzp) | hydrate nie degraduje `rows`/snapshot; keywordsEpoch nadal patchowany | revert 1 pliku |
| 4.2 | list/scoring/strategy | items z Providera | bez zmiany kodu — **weryfikacja**, że żaden komponent nie czyta LS bezpośrednio (grep) | — | test istniejący `test-tender-pipeline-*` | — |
| 4.3 | merge (`loadTendersPipeline` R1) | `hydrateCold` → LS lean → cold wins | reader chain: IDB envelope OK → FULL; legacy LS FULL/LEAN → merge preserve-heavy z IDB; INDEX → tylko gdy IDB OK; INDEX + IDB missing → cloud hydrate (lean) + telemetria `index_without_full` | `resolvePipelineLocalWithCold` zachowany | L/M/N/G/F/E | revert R1 |
| 4.4 | write-safety R10 | RAM fullItems / LS w generic seam | bez zmiany kodu; test, że INDEX zawiera `id`+`ikFinalBid` → verdict identyczny jak z FULL | — | Q + 505 | — |
| 4.5 | detail (`TenderDetailPanel`) | items z Providera | bez zmiany; test „detal po reload z INDEX + IDB OK ma rows/snapshot” | — | B | — |
| 4.6 | backup export R4/R8 | LS body | pipeline body := `await hydratePipelineColdFromIdb()` → `loadTendersPipelineLocal()` (FULL); `exportBackup` staje się async; e-mail backup analogicznie | plik backup nadal `Record<key, array>` | O (FULL w pliku) · rozmiar zmierzony | revert |
| 4.7 | backup import R3/C | LS body local side + raw setItem | local side = FULL (jak 4.6); zapis → **canonical writer** (Phase 6 domyka) | merge `mergeTenderDataKey` bez zmian | O | revert |
| 4.8 | restore R5/F | `readLocalDataBundle` LS + raw setItem | local side pipeline = FULL; zapis → canonical writer (Phase 6) | pozostałe klucze bez zmian | O | revert |
| 4.9 | R6 CloudLoader, R7 snapshot bundle, R9 deferred local | LS body | R6: bez zmian (wynik pipeline nieużywany — test potwierdza); R7: snapshot bundle zawiera to, co w LS (INDEX) — **PLAN decyzja: NIE dublować FULL w snapshot bundle** (#LSA-006; FULL jest już w IDB pod własnym kluczem); R9: local side = FULL z cold (`readLocalStorageDataKey` branch pipeline) | — | B/N | revert |

Batch gates: **4A** (4.1–4.5) · **4B** (4.6–4.9). Po 4A dopiero można myśleć o INDEX; po 4B dopiero Phase 5.

### PHASE 5 — LS INDEX CUTOVER (za flagą NEW-03, per-device safety)
Warunki wejścia: GATE 1–4B PASS · flaga `pipelineLocalIndexV1` (default **false**, remote-wins).

```text
saveTendersPipelineLocal(items) [flag ON]:
  RAM sync → ack = await IDB envelope write
  ack.ok  → LS := buildTenderPipelineLsIndex(items) (budżet Phase 7)     ← INDEX dopiero po ACK
  ack.fail→ LS bez zmian (poprzednia zawartość: legacy lub INDEX poprz. rev) + telemetria idb_write_failed
                                                                           + [flag OFF na tym urządzeniu nie jest potrzebne — pisarz sam nie przełącza]
```
Legacy detection przy odczycie (R1): `items[0]?._lsIndex?.v===1` → INDEX · `kosztorys._coldRowsCount` obecny lub brak `noticeHtml`&&`rows=[]`&&`rowCount>0` → LEGACY_LEAN · inaczej LEGACY_FULL.  
Migracja nie-destrukcyjna: legacy LS jest **nadpisywany INDEX-em wyłącznie po ack IDB envelope zawierającego ⊇ zbiór id z legacy LS** (test SUBSET). Do tego czasu LS pozostaje legacy.  
Cloud: `stripTenderPipelineForCloud` usuwa `_lsIndex` i `_coldRowsCount` (additive; test).  
Rollback: flaga OFF → writer wraca do Phase 3 compat (LS-lean) przy następnym zapisie; INDEX w LS pozostaje czytelny dla R1 (chain → IDB FULL).  
Testy: L legacy FULL · M legacy LEAN · N INDEX · G empty IDB (→ LS pozostaje legacy, brak INDEX) · F stale IDB (→ merge, potem INDEX) · E corrupt IDB (→ jak missing) · C quota (→ LS stare, IDB FULL) · S old client czyta INDEX jako tablicę (lista działa, detal bez heavy do cloud merge).  
**GATE 5:** CSR udowodnione testem: nie istnieje ścieżka, w której LS staje się INDEX bez wcześniejszego ack envelope OK.

### PHASE 6 — ONE-WRITER ENFORCEMENT
- B: `persistBootstrapMergedKey` → branch `key === TENDERS_PIPELINE_KEY` → `saveTendersPipelineLocal(asTenderPipelineItems(merged))` (dynamic import jak w `persistKey`, bez cyklu).
- C: `importBackup` — pipeline wyłączony z pętli `Object.entries(data).forEach(setItem)` → canonical writer.
- F: `restoreAllDataFromCloud` — pętla `DATA_KEYS` pomija pipeline → canonical writer; bundle-level operacja pozostaje.
- D: reset safety-first (§11 ADR): `fetchKeysFromCloud([body,guard])` → `guardTenderPipelineCloudWrite([], cloud)` → BLOCK ⇒ **zero destrukcji lokalnej**, komunikat; ALLOW ⇒ `pushTenderPipelineToCloud([])` → canonical writer(`[]`) → `clearDeletedTenderIds` → `persistKey(TENDERS_DELETED_IDS_KEY, [])`. **UWAGA:** przy cloud > 0 write-safety zawsze BLOCK (`countRegression`) → reset pipeline w praktyce możliwy tylko przy pustym cloud — patrz OWNER DECISION REQUIRED #1.
- Test „raw writer absence”: statyczny grep-test (`scripts/`), że `localStorage.setItem(<pipeline key>)` występuje wyłącznie w `saveTendersPipelineLocal`; routing test dla B/C/F (stub writer, licznik wywołań).  
**GATE 6:** 0 raw writerów poza canonical; testy P (reset) + O (restore/import) PASS.

### PHASE 7 — QUOTA / BUDGET (D8 finalizacja na realnym INDEX size)
Rozdział:

| Warstwa | Definicja | Egzekucja |
|---|---|---|
| **BROWSER QUOTA** | nieznana z góry (UNKNOWN U9); jedyny pewny sygnał = `QuotaExceededError` | catch → BLOCK LS (bez retry), FULL w IDB, telemetria `quota_blocked_index` |
| **PROJECT BUDGET per-key (INDEX)** | **NEW-06** `PIPELINE_INDEX_LS_WARN` / `PIPELINE_INDEX_LS_BLOCK` — kalibrowane z P-3 (INDEX 505 poz.; hipoteza ≈ 0.3–0.4 MB → WARN 0.75 MB / BLOCK 1.0 MB **do potwierdzenia pomiarem**) | estimate INDEX → WARN telemetria / BLOCK bez `setItem` |
| **PROJECT BUDGET global (1.2/1.4/1.5 MiB)** | istniejące stałe — **NIE** warunek dla INDEX (LS total 4.679 MB > LIMIT) | tylko telemetria WARN off-hot-path (`requestIdleCallback`/po zapisie, max 1×/60 s), **zakaz** `measureLocalStorageBytes()` w hot-path (lekcja 02F V-PERF-A) |

UX: bez nowego UI w tym programie; diagnostyka przez `__WG_STORAGE__` + `readPipelineLocalSaveTelemetry` (istniejące). Ewentualny banner = osobny brief.  
Fallback: LS BLOCK → reader chain IDB FULL → RAM; rebuild LS INDEX przy następnym udanym zapisie (best-effort, bez pętli).  
**GATE 7:** progi per-key uzasadnione pomiarem; test C/H/I; brak pełnego skanu LS w hot-path (perf P-5).

### PHASE 8 — BACKWARD COMPATIBILITY / MIGRATION (konsolidacja)
Macierz stanów startowych → zachowanie (test per wiersz):

| LS | IDB | Zachowanie |
|---|---|---|
| legacy FULL | missing/legacy-array | FULL := LS → envelope → ack → INDEX |
| legacy FULL | OK/stale | merge preserve-heavy (LS FULL ∪ IDB) → envelope → INDEX |
| legacy LEAN | OK | FULL := IDB (rows/snapshot z IDB, `kosztorysRowsFieldAbsent` chroni `rows=[]`+`rowCount>0`) → envelope → INDEX |
| legacy LEAN | missing | FULL := LEAN (heavy brak) → envelope (itemCount = LEAN) → INDEX; heavy klasy A regenerowalne; telemetria `full_from_lean` |
| INDEX | OK | normalna |
| INDEX | stale | merge IDB ↔ cloud lean → envelope → INDEX |
| INDEX | missing/corrupt | **CSR case**: telemetria `index_without_full` → hydracja cloud lean → envelope → LS pozostaje INDEX (id-set z cloud) · heavy regenerowalne · brak destrukcji |
| dowolne | dowolne, flag OFF | writer Phase 3 compat; reader chain bez zmian |
| old client | INDEX | czyta tablicę; lista OK; detal bez heavy do cloud merge (`_lsIndex` ignorowany jak `_cloudLean`) |
| partial migration (urządzenia) | — | cloud lean = wspólny mianownik; bez wpływu |
Kasowanie legacy: **żadnego** `removeItem` — legacy LS jest nadpisywany INDEX-em tylko po ack (Phase 5).  
**GATE 8:** wszystkie wiersze PASS; test S (old client) na buildzie poprzedniej wersji (preview) czytającym INDEX.

### PHASE 9 — 02F PARTIAL RECOVERY (idee, nie kod)
| Idea 02F | Realizacja w tym programie | Zakaz |
|---|---|---|
| one-writer | Phase 6 (tylko pipeline) | generic StorageManager |
| budget-before-write | Phase 7 (per-key + cache total/delta zaimplementowane minimalnie **w** `tenders-pipeline-cold.ts`/`storage-budget.ts`, nie import `storage-budget-cache.ts`) | import untracked 02F |
| telemetry | `writer` id + `note` (Phase 1–7) | nowy moduł |
| routing | writer decyduje FULL→IDB / INDEX→LS | tier registry dla wszystkich kluczy |
**GATE 9:** review, że żaden plik `src/lib/storage/{storage-manager,storage-key-registry,storage-budget-cache,storage-tier1-ls}.ts` nie jest importowany (grep-test).

### PHASE 10 — PRODUCTION MIGRATION
Preflight (read-only, Owner): `__WG_STORAGE__.largest()`, IDB `tenders-pipeline-full` (status envelope / count), `navigator.storage.estimate()`, KV guard rev/count.  
Kroki: (1) release kodu z flagą **OFF** (Phase 3–4 aktywne: envelope + readers) → telemetria ack rate ≥ 1 sesja Ownera; (2) Owner preflight: envelope OK, itemCount = KV 505, parity ikFinalBid; (3) flaga **ON** (remote-wins; bezpieczna per-device, bo writer wymaga własnego ack); (4) weryfikacja: LS pipeline bytes ↓ (INDEX), IDB envelope rev/seq rośnie, brak `quota_blocked_index`, lista/detal/IK G3 OK; (5) STOP conditions §14.  
Rollback: flaga OFF → compat writer; brak destrukcji; IDB envelope zostaje.  
**GATE 10:** PRODUCTION VERIFIED wg `WORKFLOW-RELEASE-DEPLOY.md` (jedno `version.json`).

---

## 6. FILE-LEVEL CHANGE MAP

| Plik | Faza | Zmiana | Typ |
|---|---|---|---|
| `src/lib/storage/tenders-pipeline-cold.ts` | 1,2,5,7 | envelope (NEW-01), freshness, ack, `buildTenderPipelineLsIndex` (NEW-02), per-key budżet (NEW-06) | rozszerzenie |
| `src/lib/tenders-bzp.ts` | 3,4.3,5 | `saveTendersPipelineLocal` writer contract (NEW-04); `loadTendersPipelineLocal` legacy detect + chain; `loadTendersPipeline` hydrate status | in-place |
| `src/lib/tenders-pipeline-session-cache.ts` | 4.1 | hydrate z cold memory; nie podmieniać FULL na INDEX/lean | 1 funkcja |
| `src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts` | 5 | strip `_lsIndex`, `_coldRowsCount` | additive |
| `src/lib/app-settings.ts` | 5 | `pipelineLocalIndexV1` (NEW-03) + helper | wzorzec |
| `src/lib/cloud-sync.ts` | 4.9, 6 | `readLocalStorageDataKey` pipeline → FULL; `persistBootstrapMergedKey` pipeline → canonical writer | 2 branch'e |
| `src/app/App.tsx` | 4.6, 4.7, 6 | `exportBackup` async FULL; `importBackup` pipeline → writer; `restoreAllDataFromCloud` pipeline → writer | 3 miejsca |
| `src/lib/weekly-backup-email.ts` | 4.6 | pipeline body FULL | 1 branch |
| `src/lib/local-data-backup.ts` | 4.9 | bez zmian (decyzja: snapshot bundle = LS INDEX) — test potwierdza | — |
| `src/lib/tenders-admin.ts` | 6 | reset safety-first order | przepisanie 1 fn |
| `src/lib/storage/storage-budget.ts` | 7 | opcjonalnie cache total/delta (bez skanu hot-path) | rozszerzenie |
| `src/app/CloudLoader.tsx` | 4.9 | **bez zmian** (test) | — |
| `scripts/test-storage-tier1-pipeline-{01-envelope,02-index,03-dual-write,04-readers,05-cutover,06-one-writer,07-budget,08-compat,09-no-02f-import,perf}.mjs` | 1–9 | nowe skrypty testowe (`vite-node`) + wpis do `test-infra/test-manifest.json` (scope tenders) | NEW test |
| `src/app/changelog-data.ts`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `GuideView` | release | wpisy | docs |
| **Zakaz zmian:** `storage-idb.ts` (adapter wystarcza), `tender-pipeline-cloud-push.ts`, `tender-pipeline-write-safety.ts`, `tender-pipeline-guard.ts`, `tenders-sync.ts`, `tender-dossier-merge.ts`, Edge, Payroll | | | |

---

## 7. TEST MATRIX (A–T → faza, harness)

| ID | Scenariusz | Faza | Oczekiwane |
|---|---|---|---|
| A | normal write | 3,5 | RAM sync; IDB envelope ack; LS compat/INDEX po ack |
| B | reload | 1,4,5 | chain LS INDEX → IDB FULL; detal ma rows/snapshot |
| C | browser quota (`QuotaExceededError`) | 3,7 | LS BLOCK bez retry; IDB FULL ok; telemetria |
| D | IDB unavailable (`indexedDB` undefined) | 1,3,5 | ack false; LS pozostaje legacy (flag ON) / lean (OFF); brak INDEX |
| E | IDB corruption | 1,4.3,8 | CORRUPT → ignoruj + telemetria → jak missing |
| F | stale IDB (rev/maxUpdatedAt/subset) | 1,4.3,8 | merge z cloud lean; nie odrzucaj FULL |
| G | empty IDB | 5,8 | brak INDEX cutover do czasu ack |
| H | LS unavailable (`setItem` throw non-quota) | 3,7 | save_error telemetria; IDB ok; reader chain |
| I | both failures | 3 | RAM-only; cloud seam działa; telemetria critical; brak crash UI |
| J | cloud unavailable | 4.3 | local chain; seam BLOCK `CLOUD_READ_FAILED` bez zmian |
| K | cloud lean (`_cloudLean`) ↔ IDB FULL merge | 4.3 | heavy z IDB zachowane (`isCloudLeanFieldOmitted`) |
| L | legacy FULL LS | 5,8 | FULL → envelope → ack → INDEX |
| M | legacy LEAN LS (`_coldRowsCount`) | 5,8 | rows z IDB; brak nadpisania rows pustką |
| N | INDEX LS | 5,8 | normalna |
| O | backup export/import/restore | 4.6–4.8, 6 | plik zawiera FULL; import/restore przez canonical writer |
| P | admin reset | 6 | BLOCK ⇒ zero destrukcji lokalnej; ALLOW ⇒ cloud → local |
| Q | write-safety BLOCK | 4.4 | verdict z INDEX = verdict z FULL |
| R | 505 production-sized dataset | 1,3,5,perf | rozkład wg §1.5 ADR (avg 4.7 KB lean; max item 168 KB; FULL z rows/snapshot syntetycznie ≥ 2× lean) |
| S | old client | 8 | preview poprzedniej wersji czyta INDEX jako tablicę; lista OK |
| T | rollback (flag OFF) | 5,8 | writer compat; brak destrukcji; IDB envelope zostaje |

Harness: `vite-node` + stub `localStorage` (Map) + **NEW-05** in-memory `indexedDB` stub (open/transaction/objectStore put/get/getAllKeys/delete, `onupgradeneeded`, `oncomplete`, tryb „fail” dla D/H/I); S/T dodatkowo Playwright preview (`e2e/`).

---

## 8. MIGRATION STRATEGY (skrót Phase 5/8/10)
1. Kod out z flagą OFF (envelope + readers) → obserwacja ack.
2. Owner preflight read-only.
3. Flag ON — cutover per-device wyłącznie po lokalnym ack envelope ⊇ id legacy LS.
4. Legacy LS nadpisywany INDEX-em (bez `removeItem`); IDB legacy-array → envelope przy pierwszym zapisie.
5. Cloud bez zmian (rev 291+ rośnie normalnie).

## 9. ROLLBACK STRATEGY
| Poziom | Mechanizm | Utrata |
|---|---|---|
| Faza dev (1–4) | revert commit(ów) fazy | brak (LS nadal lean, IDB envelope czytelny jako FULL przez `Array.isArray(env.items)`? — **NIE**: legacy reader `hydratePipelineColdFromIdb` MAIN akceptuje tylko tablicę → po rollbacku do MAIN IDB envelope = ignorowany → LS lean + cloud lean = stan dzisiejszy. Akceptowalne (Phase 1–4 nie zmieniają LS). |
| Phase 5+ | flaga OFF (remote-wins) | brak; LS INDEX czytelny przez chain; przy rollbacku **kodu** do wersji sprzed programu: LS INDEX czytany jako lean-body → detal bez heavy do cloud merge (test S) |
| Prod | redeploy poprzedniej wersji | jak wyżej; zakaz `localStorage.clear()` / usunięcia IDB |

## 10. TELEMETRY (rozszerzenie istniejących, bez nowego typu)
`recordStorageWrite` z `writer` ∈ {`tenders-bzp.saveTendersPipelineLocal`, `tenders-pipeline.cold`, `tenders-pipeline.cold.read`, `tenders-pipeline.index`} i `note` ∈ {`envelope_ok`, `idb_write_failed`, `idb_missing|legacy_array|corrupt|stale_revision|stale_updated_at|subset`, `index_written`, `index_blocked_budget`, `quota_blocked_index`, `legacy_full|legacy_lean|index_detected`, `index_without_full`, `reader_fallback:<R#>:<LS|IDB|RAM|CLOUD>`, `reset_blocked:<code>`}. Ring buffer `logPipelineLocalSaveTelemetry` rozszerzony o `kind: "idb_error" | "quota_blocked"` (typ union additive). Bez PII.

## 11. PERFORMANCE PLAN (pomiar, nie „działa”)
Harness `scripts/test-storage-tier1-pipeline-perf.mjs` (wzorzec `test-localstorage-arch-02f-p0-perf.mjs`), dataset R (505 + worst-case 1 item 168 KB lean / ~1 MB FULL syntetyczny), p50/p95 × 20 iteracji, node + Playwright (prawdziwy IDB):

| ID | Metryka | Próg akceptacji (propozycja, kalibracja po pierwszym pomiarze) |
|---|---|---|
| P-1 | IDB write envelope 505 | p95 < 300 ms (browser) |
| P-2 | IDB read + parse envelope | p95 < 200 ms |
| P-3 | INDEX serialize (bytes + ms) | p95 < 25 ms; bytes zapisane jako fakt do Phase 7 |
| P-4 | FULL `JSON.stringify` (+ Blob size) | p95 < 150 ms; **jedna** serializacja na zapis (nie 2× jak dziś: `estimateJsonBytes` + `JSON.stringify`) |
| P-5 | budżet hot-path | 0 wywołań `measureLocalStorageBytes()` w `saveTendersPipelineLocal` (test asercja) |
| P-6 | bootstrap (`loadTendersPipeline`) delta vs MAIN | ≤ +100 ms p95 |
| P-7 | session hydrate (R2) | ≤ dziś (bez `JSON.parse` LS body → szybciej) |
| P-8 | cloud sync impact | 0 dodatkowych żądań Edge (asercja licznika `fetchKeysFromCloud`) |
| P-9 | NG11 timing (`test-ng11-pipeline-timing.mjs`) | PASS bez regresji |
Wynik = warunek GATE 3/5/7; regresja > progu = STOP.

## 12. UNKNOWNs
| U | Stan | Domknięcie | Blokuje |
|---|---|---|---|
| U1 FULL per pole (snapshoty/rows) | UNKNOWN | Owner: eksport IDB / `hydratePipelineColdFromIdb` w DevTools (read-only) | kalibracja P-1/P-4, backup size — nie blokuje Phase 0–4 |
| U6 stan IDB Ownera | UNKNOWN | DevTools | Phase 10 preflight (obowiązkowy), nie Phase 1–9 |
| U9 browser quota | UNKNOWN | `navigator.storage.estimate()` | tylko Phase 7 progi absolutne (nie używamy) |
| INDEX size 505 | INFERENCE 0.3–0.4 MB | Phase 2 pomiar P-3 | Phase 7 progi |
| CPU writer | UNKNOWN | Phase 3 P-1..P-5 | GATE 3 |
| `kw-tender-ingest-v1` size | UNKNOWN | Owner | OUT OF SCOPE (presja globalna) |

## 13. NEW components (nieuniknione)

| NEW-ID | Purpose | Why reuse insufficient | Location | API | Owner | Tests | Rollback | Migration impact |
|---|---|---|---|---|---|---|---|---|
| **NEW-01** | IDB envelope v1 + parse/validate/freshness | `TenderPipelineGuardV1` nie niesie FULL items, `writtenAt`, `maxUpdatedAt`, `localSeq`; surowa tablica nie ma metadanych (D5) | `tenders-pipeline-cold.ts` | `TenderPipelineIdbEnvelopeV1`, `parsePipelineIdbEnvelope`, `evaluatePipelineIdbFreshness` | pipeline storage | Phase 1 (E/F/G) | revert; legacy-array nadal czytelna | IDB legacy-array → envelope przy 1. zapisie |
| **NEW-02** | INDEX builder + marker `_lsIndex` | `stripTenderPipelineForLocalStorage` = FULL−2 (D2 zakazuje); `buildTenderPipelineGuard` daje tylko 3 pola | `tenders-pipeline-cold.ts` | `buildTenderPipelineLsIndex(items)`, `detectPipelineLsKind(raw)` | pipeline storage | Phase 2 completeness, 5 | flag OFF | legacy client ignoruje marker |
| **NEW-03** | flaga `pipelineLocalIndexV1` | żadna istniejąca flaga nie steruje lokalnym kształtem LS; D9 wymaga rollback flag | `app-settings.ts` | `isPipelineLocalIndexEnabled()` | Owner (kw-app-settings) | Phase 5/8 T | OFF | remote-wins; bez nowego KV |
| **NEW-04** | writer ack/result | `saveTendersPipelineLocal` = `void`, IDB fire-and-forget; D5 write acknowledgement | `tenders-bzp.ts` (in-place) | sygnatura `void` zachowana + `awaitPipelineLocalWriteSettled(): Promise<PipelineLocalWriteResult>` | pipeline storage | Phase 3 | revert | — |
| **NEW-05** | test-only in-memory `indexedDB` stub | brak `fake-indexeddb`; istniejący stub = `undefined` (fail-open) | `scripts/_lib/idb-memory-stub.mjs` | `installIdbStub({failMode})` | test infra | używany przez 01–08 | usunięcie | brak (dev) |
| **NEW-06** | per-key INDEX budżet + cache total/delta | `storage-budget.ts` ma tylko progi globalne 1.2/1.4/1.5 MiB (nieadekwatne przy LS 4.679 MB) i pełny skan | `storage-budget.ts` (stałe) + `tenders-pipeline-cold.ts` (check) | `PIPELINE_INDEX_LS_WARN/BLOCK`, `evaluatePipelineIndexBudget(bytes)` | pipeline storage | Phase 7 C/H | revert | — |

Alternatywa dla NEW-05: `npm i -D fake-indexeddb` — decyzja PLAN: **stub własny** (brak nowej zależności; wzorzec repo = stuby w `scripts/`). Jeżeli Owner woli dependency → zamiana bez wpływu na fazy.

## 14. STOP CONDITIONS (każda faza)
- Jakikolwiek test z ADR/Track B/write-safety/NG11 FAIL → STOP fazy.
- Wykryta ścieżka LS INDEX bez ack envelope (CSR) → STOP + RCA.
- Perf regresja > progu §11 → STOP (nie „optymalizować później”).
- Konieczność zmiany `tender-pipeline-cloud-push.ts`, write-safety, guard, Edge, Payroll → STOP (poza zakresem ADR).
- Konieczność nowego klucza KV lub generic storage-managera → STOP (Owner GO).
- Prod: `quota_blocked_index` > 0 lub `index_without_full` > 0 po flag ON → flaga OFF + raport.
- Untracked plik `src/` z importem w tracked kodzie przed push → STOP (P0 Vercel ENOENT).

## 15. OWNER GO CHECKLIST (przed IMPLEMENT Phase 1)
- [ ] ADR FINAL + PLAN przeczytane; D1–D10 bez zmian.
- [ ] **OWNER DECISION REQUIRED #1 — Reset przy niepustym cloud:** write-safety zawsze BLOCK-uje `[]` gdy cloud > 0. Opcje: (a) reset = tylko przy pustym cloud (default PLAN, zero nowej ścieżki), (b) jawny Owner override poza tym programem (osobny brief, nie tu). Bez tej decyzji Phase 6 realizuje (a); nie blokuje Phase 1–5.
- [ ] **OWNER CONFIRMATION #2 — ryzyko rezydualne IDB fail przy flag ON:** urządzenie bez IDB nigdy nie przełącza LS na INDEX (pozostaje legacy lean) — akceptacja, że takie urządzenie ma dzisiejsze zachowanie (quota ryzyko bez zmian). Nie zmienia D8.
- [ ] **OWNER CONFIRMATION #3 — backup FULL:** eksport pliku/e-maila zawiera FULL z IDB (większy plik). Alternatywa (lean parity) = zmiana zakresu D7 BACKUP → wróć do Ownera.
- [ ] Zgoda na NEW-01…NEW-06 (żaden nie jest generic storage-managerem).
- [ ] Zgoda na kolejność faz i gate'y (brak skoków do Phase 5 przed GATE 4B).
- [ ] Preflight read-only Ownera przed Phase 10 (IDB, LS largest, estimate).
- [ ] Commit/push wyłącznie na polecenie; release wg `WORKFLOW-RELEASE-DEPLOY.md`.

---

## 16. SPECIAL PLAN QUESTIONS — odpowiedzi

| # | Pytanie | Odpowiedź |
|---|---|---|
| 1 | IDB ACK przed LS INDEX write? | **TAK** (Phase 5+). RAM sync; LS INDEX zapisywany w kontynuacji promise ack. Do czasu ack LS trzyma poprzednią zawartość. W Phase 3 (compat) LS-lean pisany bez czekania (jak dziś). |
| 2 | Stale IDB? | `envelope.bundleRevision < guard.bundleRevision` ∨ `maxUpdatedAt < max(guard.items.updatedAt)` ∨ `guard.items.ids ⊄ envelope.ids` (SUBSET). Guard = referencja cloud; brak guard → NO_REFERENCE (nie stale). |
| 3 | Corruption? | parse fail ∨ `schemaVersion≠1` ∨ `!Array.isArray(items)` ∨ `items.length≠itemCount` ∨ item bez `id` ∨ (gdy guard) parity `ikFinalBid` mismatch → CORRUPT → ignoruj + telemetria. |
| 4 | Revision offline? | envelope niesie 2 pola: `bundleRevision` = ostatni widziany guard rev (może być stary) + `localSeq` monotonic per device (`++` na każdy zapis). Offline rośnie tylko `localSeq`. |
| 5 | Cloud `bundleRevision` jako lokalna revision? | **Jako referencja świeżości — tak; jako lokalna revision — nie** (nie rośnie offline, jest per-cloud). Stąd `localSeq`. |
| 6 | Migracja legacy LS FULL? | detect (brak `_lsIndex`, brak `_coldRowsCount`) → FULL := LS ∪ IDB (preserve-heavy) → envelope ack → INDEX nadpisuje LS. |
| 7 | Migracja legacy LS LEAN? | detect `_coldRowsCount` → FULL := IDB (jeśli OK) z merge `mergeKosztorysPreserveHeavy`; jeśli IDB missing → FULL := LEAN (telemetria `full_from_lean`) → envelope → INDEX. |
| 8 | LS quota fail? | BLOCK (bez retry), IDB FULL + RAM aktualne, telemetria `quota_blocked_index`, reader chain IDB; rebuild przy następnym zapisie. |
| 9 | IDB write fail? | LS **nie** przechodzi na nową rev INDEX (zostaje poprzednia zawartość); RAM + cloud seam działają; telemetria `idb_write_failed`; przy flag ON urządzenie bez IDB pozostaje legacy lean. |
| 10 | Oba fail? | RAM-only sesja; cloud lean nadal cross-device authority (ikFinalBid chronione write-safety); telemetria critical; reload → hydracja cloud + regeneracja klasy A. Jawnie raportowane, nie ukrywane. |
| 11 | Session cache? | Hydrate z `getPipelineColdMemory()`; nigdy nie podmienia FULL na INDEX/lean z LS; keywords patch bez zmian. |
| 12 | Write-safety snapshot? | `pushTenderPipelineToCloud(fullItems)` = RAM FULL (bez zmian). Generic seam czytający LS → INDEX zawiera `id`+`ikFinalBid` → verdict identyczny (test Q). |
| 13 | Backup FULL? | `exportBackup`/e-mail: `await hydratePipelineColdFromIdb()` → `loadTendersPipelineLocal()` (FULL z cold). Fallback: chain (INDEX gdy brak FULL) + telemetria. |
| 14 | Restore bez LS? | local side = FULL z cold/IDB; merge `mergeDataKey`; zapis pipeline → canonical writer; pozostałe klucze raw jak dziś (bundle-level). |
| 15 | Admin reset a write-safety? | cloud read → `guardTenderPipelineCloudWrite([], cloud)` → BLOCK ⇒ brak destrukcji; ALLOW ⇒ cloud → local. Cloud > 0 ⇒ zawsze BLOCK → OWNER DECISION REQUIRED #1. |
| 16 | Nowy marker INDEX? | **TAK** — `_lsIndex:{v:1}` per-item additive (wzorzec `_cloudLean`); brak envelope w LS (tablica zachowana dla old clients). |
| 17 | Nowa flaga? | **TAK** — `pipelineLocalIndexV1` (NEW-03), default false, remote-wins, kill-switch. |
| 18 | Nowy envelope? | **TAK** — IDB (NEW-01); **NIE** w LS. |
| 19 | Nowy seam? | **NIE.** Local = `saveTendersPipelineLocal`, cloud = `pushTenderPipelineToCloud`. |
| 20 | Który NEW nieunikniony? | NEW-01, NEW-02, NEW-03, NEW-04 — wynikają wprost z D2/D5/D6/D9. NEW-05 — test-only. NEW-06 — wynika z D8 + faktu LS 4.679 MB > 1.5 MiB. Żaden nie jest generic storage-managerem. |

---

## 17. FINAL GATE (historyczny — pre-IMPLEMENT)

```text
PLAN                 = COMPLETE
ADR_FINAL            = COMPLETE
OWNER_DECISIONS      = LOCKED
TARGET_ARCHITECTURE  = LOCKED
IMPLEMENTATION       = NO
COMMIT               = NO
PUSH                 = NO
PROD_MUTATION        = NO

OWNER DECISION REQUIRED (nie-blokujące Phase 1–5):
  #1 reset przy niepustym cloud (Phase 6 sub-step)
OWNER CONFIRMATION:
  #2 rezydualne ryzyko urządzeń bez IDB · #3 backup FULL size
NEXT = Owner GO → IMPLEMENT Phase 1 (po GATE 0)
```

---

## 18. CLOSEOUT — PLAN EXECUTED (Phase 22 · documentation only)

> Historyczny §17 pozostaje jako zapis stanu sprzed IMPLEMENT. Phases 1–21 **wykonane**; ten wpis nie zmienia D1–D10 ani NEW-01…NEW-06.

| Pole | Wartość |
|---|---|
| **PLAN status** | **EXECUTED · CLOSED** |
| **Release** | **2.66.231** / **`16bfb9f3`** |
| **Production** | flag **ON** · min **2.66.231** · IDB FULL → LS INDEX → Cloud LEAN |
| **Phase 21** | COMPLETE · P20-P3-03 **CLOSED** |
| **Phase 22** | Documentation closeout |
| **Epic** | [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md) |
| **Limitation** | Downgrade after INDEX **UNSUPPORTED** · ingest **OUT** |

```text
PLAN_CLOSEOUT        = COMPLETE
IMPLEMENTATION       = COMPLETE
PRODUCTION_ROLLOUT   = PASS
RUNTIME_CHANGE_P22   = NO
```
