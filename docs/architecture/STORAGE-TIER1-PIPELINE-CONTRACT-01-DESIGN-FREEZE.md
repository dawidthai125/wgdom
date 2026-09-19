# STORAGE-TIER1-PIPELINE-CONTRACT-01 — DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.1 — AMENDED (F-P0-01)** · **IMPLEMENTED · PRODUCTION VERIFIED · EPIC CLOSED** (Phase 22 closeout)  
> **Data:** 2026-09-17 (v1.0) · **Amendment A:** 2026-09-17 — [§A DESIGN FREEZE AMENDMENT — F-P0-01](#a-design-freeze-amendment--f-p0-01) (Owner: F-P0-01 ACCEPTED, D1–D10 LOCKED) · **Closeout:** 2026-09-19 — [§23](#23-closeout--production-verified-phase-22)  
> **Implement baseline (history):** `main` @ `3bfecc7f` = prod 2.66.230 · **Production tip:** **2.66.231** / **`16bfb9f3`**  
> **ADR (LOCKED):** [`ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md`](ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md) · **PLAN:** [`STORAGE-TIER1-PIPELINE-CONTRACT-01-PLAN.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-PLAN.md) · **Epic:** [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md)  
> **Owner GO:** YES (Design Freeze + IMPLEMENT + rollout) · **Owner Confirmations:** #1 RESET BLOCK · #2 NO IDB = NO INDEX · #3 BACKUP = FULL  
> **Zakres:** wyłącznie `kw-tenders-pipeline` (LS) · `tenders-pipeline-full` (IDB) · readery R1–R10 · writerzy A/B/C/D/F. **Poza zakresem:** cloud contract, Edge, Payroll, `kw-tender-ingest-v1`, inne klucze LS, generic storage-manager.

```text
INVARIANTY (LOCKED):
  PIPELINE-DURABLE-01  LS INDEX ≠ canonical, dopóki FULL nie jest VALID + DURABLE (ACK) w IDB
  PIPELINE-QUOTA-01    QuotaExceededError LS nie może zniszczyć jedynej trwałej kopii FULL
  PIPELINE-WRITER-01   tylko canonical writer wykonuje localStorage.setItem(kw-tenders-pipeline)
  PIPELINE-CLOUD-01    cloud = LEAN authority, kontrakt bez zmian
  PIPELINE-INGEST-01   kw-tender-ingest-v1 poza zakresem

INVARIANTY DODANE AMENDMENTEM A (LOCKED — §A.3):
  PIPELINE-INDEX-01         INDEX IS NEVER FULL — obiekt z `_lsIndex` nigdy nie jest FULL TenderPipelineItem
  PIPELINE-FULL-SOURCE-01   FULL tylko z: RAM FULL · VALID IDB FULL · jawnie zwalidowane zewnętrzne źródło FULL; LS INDEX sam nigdy
  PIPELINE-NO-CONVERSION-01 brak implicit INDEX → FULL (cast / merge / save / envelope lub ekwiwalent)
  PIPELINE-CLOUD-SAFETY-01  projekcje INDEX nigdy nie nadpisują FULL/LEAN w cloud; INDEX bez FULL = tylko degraded UI
```

---

## 0. Słownik zamrożony

| Termin | Znaczenie |
|---|---|
| **FULL** | `TenderPipelineItem[]` w kształcie MAIN, bez stripu |
| **ENVELOPE** | rekord IDB `tenders-pipeline-full` v1 (§1) |
| **INDEX** | `TenderPipelineIndexItemV1[]` w LS (§2) |
| **LEGACY_FULL** | LS z pełnym body (przed LOCALSTORAGE-ARCH-02 C) |
| **LEGACY_LEAN** | LS = FULL − `noticeHtml` − `kosztorys.rows` (+ `_coldRowsCount`) — dzisiejszy kształt |
| **LEGACY_ARRAY** | IDB = surowa tablica FULL (dzisiejszy kształt) |
| **ACK** | `idbSet` rozwiązane `true` **i** read-back envelope parse OK z tym samym `localSeq` (§1.7) |
| **compat mode** | writer zapisuje LS jako LEGACY_LEAN (zachowanie MAIN) |
| **canonical writer** | `saveTendersPipelineLocal` (`src/lib/tenders-bzp.ts`) |
| **cloud seam** | `pushTenderPipelineToCloud` (`src/lib/tender-pipeline/tender-pipeline-cloud-push.ts`) |

---

## 1. IDB ENVELOPE — **NEW-01** (API zamrożone)

Lokalizacja: `src/lib/storage/tenders-pipeline-cold.ts` (rozszerzenie istniejącego modułu). Adapter: `storage-idb.ts` **bez zmian** (rekord `{key, value, updatedAt}`; `value` = envelope).

### 1.1 Typ

```ts
export const PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION = 1 as const;

export interface TenderPipelineIdbEnvelopeV1 {
  schemaVersion: 1;                 // required
  bundleRevision: number;           // required — ostatni widziany cloud guard.bundleRevision (0 = nigdy)
  localSeq: number;                 // required — monotonic per device, ++ na każdy zapis canonical writera
  itemCount: number;                // required — items.length (aktywne + tombstoned obecne w FULL; bez filtrowania)
  writtenAt: string;                // required — ISO
  maxUpdatedAt: string;             // required — max(items[].updatedAt) lub "" gdy brak
  items: TenderPipelineItem[];      // required — FULL payload
  deletedIdsRevision?: string;      // optional — computeDeletedIdsRevision(getDeletedTenderIds()) w chwili zapisu (REUSE guard.ts:28)
  appVersion?: string;              // optional — APP_VERSION (diag)
  writer?: string;                  // optional — "tenders-bzp.saveTendersPipelineLocal" | "migration.legacy_full" | "migration.legacy_lean" | "restore" | "import"
}
```

Nie ma pola „validation” przechowywanego w rekordzie — walidacja jest **obliczana przy odczycie** (§1.3); przechowywane metadane (`itemCount`, `maxUpdatedAt`, `localSeq`, `bundleRevision`) są jej wejściem.

### 1.2 `localSeq` — źródło
Moduł `tenders-pipeline-cold.ts` trzyma `let localSeq = 0` inicjalizowany przy `hydratePipelineColdFromIdb()` z `envelope.localSeq` (MISSING/LEGACY_ARRAY/CORRUPT → 0). Każdy zapis: `localSeq += 1` **przed** `idbSet`. Brak zapisu do LS/KV tego licznika (IDB envelope = SSOT `localSeq`).

### 1.3 Parser (REUSE wzorca `parseTenderPipelineGuard`)

```ts
export type PipelineIdbReadStatus = "OK" | "MISSING" | "LEGACY_ARRAY" | "CORRUPT";
export interface PipelineIdbReadResult {
  status: PipelineIdbReadStatus;
  envelope: TenderPipelineIdbEnvelopeV1 | null;   // OK → envelope; LEGACY_ARRAY → envelope syntetyczny (localSeq 0, bundleRevision 0, writtenAt "", writer "legacy_array")
  reason?: string;                                 // CORRUPT: "schema_version" | "items_not_array" | "item_count_mismatch" | "item_without_id" | "duplicate_id" | "seq_not_finite" | "parse_failed"
}
export function parsePipelineIdbEnvelope(raw: unknown): PipelineIdbReadResult;
```

| Warunek (kolejność) | Status |
|---|---|
| `raw == null` | **MISSING** |
| `Array.isArray(raw)` | **LEGACY_ARRAY** (każdy element bez `id` → CORRUPT `item_without_id`) |
| `typeof raw !== "object"` | CORRUPT `parse_failed` |
| `raw.schemaVersion !== 1` | CORRUPT `schema_version` |
| `!Array.isArray(raw.items)` | CORRUPT `items_not_array` |
| `raw.items.length !== raw.itemCount` | CORRUPT `item_count_mismatch` |
| ∃ item bez `typeof id === "string" && id !== ""` | CORRUPT `item_without_id` |
| duplikat `id` | CORRUPT `duplicate_id` |
| ∃ item z `"_lsIndex" in item` **(AMENDMENT A §A.6 D — backstop PIPELINE-INDEX-01)** | CORRUPT `item_index_marker` |
| `!Number.isFinite(localSeq) \|\| localSeq < 0` ∨ `!Number.isFinite(bundleRevision)` | CORRUPT `seq_not_finite` |
| inaczej | **OK** |

CORRUPT ⇒ envelope **ignorowany** (nie kasowany — brak `idbRemove` w tym programie), telemetria `note: "idb_corrupt:<reason>"`.

### 1.4 STALE detection (REUSE `TenderPipelineGuardV1.items[].id/updatedAt`, `bundleRevision`)

```ts
export type PipelineIdbFreshness =
  | "FRESH" | "NO_REFERENCE" | "STALE_REVISION" | "STALE_UPDATED_AT" | "SUBSET_MISSING_IDS";
export function evaluatePipelineIdbFreshness(
  env: TenderPipelineIdbEnvelopeV1,
  guard: TenderPipelineGuardV1 | null,
  deletedIds: Iterable<string>,
): { freshness: PipelineIdbFreshness; missingIds: string[] };
```

| Warunek (kolejność) | Wynik |
|---|---|
| `guard == null` (cloud niedostępny / brak guard) | NO_REFERENCE — traktuj jak FRESH lokalnie |
| `env.bundleRevision < guard.bundleRevision` | STALE_REVISION |
| ∃ `g ∈ guard.items` : `g.id ∉ env.items.id` ∧ `g.id ∉ deletedIds` | SUBSET_MISSING_IDS (lista ≤ 50) |
| `max(guard.items.updatedAt) > env.maxUpdatedAt` | STALE_UPDATED_AT |
| inaczej | FRESH |

STALE **nigdy nie odrzuca FULL** — FULL z envelope wchodzi jako strona lokalna do `mergeTenderPipelineForCloud(full, cloudLean, deletedIds)` (REUSE), wynik → canonical writer. `ikFinalBid` parity: `verifyPipelineBodyGuardIkFinalBidParity(env.items, guard)` (REUSE) — mismatch ⇒ telemetria `idb_bid_parity_mismatch`, **nie** CORRUPT (cloud wygrywa przez merge).

### 1.5 Semantyka `bundleRevision` (odpowiedź Q4/Q5 PLAN)
`bundleRevision` w envelope = **referencja** (ostatni guard rev widziany przez ten klient — z `pushTenderPipelineToCloud` post-verify lub z `loadTendersPipeline` fetch). Nie rośnie offline. Lokalna kolejność = `localSeq`. Porównania: świeżość względem cloud → `bundleRevision`/`maxUpdatedAt`/id-set; spójność LS↔IDB → `localSeq` (§2.4).

### 1.6 Zapis

```ts
export interface PipelineIdbWriteResult { ok: boolean; localSeq: number; bytes: number; ms: number; reason?: "idb_unavailable" | "idb_write_failed" | "readback_mismatch" | "validation_failed" }
export function setPipelineColdMemory(items: TenderPipelineItem[], meta: { bundleRevision: number; writer: string }): Promise<PipelineIdbWriteResult>;
```
Sekwencja: RAM `coldMem = items` (sync) → `validatePipelineFullForWrite(items)` (§3.1) → `localSeq += 1` → envelope → `idbSet` → **read-back** `idbGet` → `parsePipelineIdbEnvelope` OK ∧ `localSeq` równe ⇒ `ok: true`. Bytes: jedna serializacja (`JSON.stringify(envelope)` → `Blob.size`) — `estimateJsonBytes` na `items` **usunięty** z hot-path (dziś podwójna serializacja).

### 1.7 ACK = `ok === true` po read-back. Bez read-back OK nie ma ACK (DURABLE-01).

### 1.8 Odczyt

```ts
export function hydratePipelineColdFromIdb(): Promise<{ items: TenderPipelineItem[] | null; status: PipelineIdbReadStatus; envelope: TenderPipelineIdbEnvelopeV1 | null }>;
export function getPipelineColdEnvelopeMeta(): { localSeq: number; bundleRevision: number; status: PipelineIdbReadStatus } | null;   // RAM, sync
```
LEGACY_ARRAY ⇒ `items` = tablica (FULL bez metadanych), `coldMem` ustawiony; migracja do envelope przy **pierwszym** zapisie canonical writera (§8.3). Istniejący kontrakt zwrotu `TenderPipelineItem[] | null` zachowany przez adapter dla obecnych callerów (`loadTendersPipeline`).

### 1.9 Migration/versioning envelope
`schemaVersion` bump = nowy parser + migracja rekordu przy odczycie (v(n) → v(n+1)) — poza tym programem. v1 nie zna pól przyszłych; nieznane pola ignorowane (additive).

---

## 2. INDEX — **NEW-02** (kształt zamrożony, builder nie implementowany)

### 2.1 Zasada
> **AMENDMENT A (§A.3/§A.5):** INDEX jest **odrębną klasą semantyczną** (`TenderPipelineIndexItemV1`), nie podtypem FULL. INDEX służy wyłącznie: (a) degraded/read-only UI, (b) guard fields dla write-safety verdict (`id/updatedAt/ikFinalBid`), (c) id-set do walidacji subset przy recovery. INDEX **nigdy** nie jest wejściem merge body, writera FULL, backupu, cloud seamu ani deferred bootstrap. Zdanie poniżej o „merge” czytać w tym sensie.

INDEX = projekcja FULL zawierająca **wyłącznie** pola czytane przez readery MAIN, gdy UI/guard może dostać items z LS (R1 fallback przed hydracją IDB / tryb zdegradowany, R2, R10; R9 tylko id-set). Weryfikacja readerów: R1–R10 (PLAN §2.2) + konsumenci items z Providera, którzy w trybie zdegradowanym dostają INDEX: `tenders-list-ux.ts`, `tenders/list/tender-list-card-model.ts`, `TenderListKpiDashboard.tsx`, `TenderListFiltersPanel.tsx`, `TendersShortcutPanel.tsx`, `tenders-strategy-*.ts`, `recalculateTenderItemScore`, `tenders-wadium.ts::computeWadiumInfo`, guard/write-safety.

### 2.2 INDEX_ITEM (v1)

| FIELD | SOURCE FULL | READER (MAIN) | WHY REQUIRED | TEST | OWNER OF VALUE |
|---|---|---|---|---|---|
| `id` | `item.id` | wszyscy; guard; write-safety | tożsamość | T-IDX-01 | BZP/ingest |
| `updatedAt` | `item.updatedAt` | guard, merge LWW, strategy | świeżość/merge | T-IDX-01 | writer |
| `ikFinalBid` | `item.ikFinalBid ?? null` | write-safety (`criticalLoss`), guard parity | klasa C (CLOUD+IDB) | T-IDX-02, Q | Owner (G3) |
| `title` | `item.title` | karty, scoring, search | render/scoring | T-IDX-03 | BZP |
| `status` | `item.status` | list-ux filtry, karty, KPI, shortcut | filtr/kolejki | T-IDX-03 | Owner/auto |
| `submittingOffersDate` | `item.submittingOffersDate` | list-ux sort/deadline, karty, scoring, strategy | terminy | T-IDX-03 | BZP |
| `publicationDate` | `item.publicationDate` | scoring | scoring | T-IDX-03 | BZP |
| `organizationName`, `organizationCity`, `organizationProvince` | j.w. | karty, scoring, filtry | render/scoring | T-IDX-03 | BZP |
| `cpvCode` | `item.cpvCode` | scoring, strategy | scoring | T-IDX-03 | BZP |
| `tenderId`, `bzpNumber` | j.w. | karty, scoring, linki | identyfikacja | T-IDX-03 | BZP |
| `relevanceScore`, `matchedKeywords` | j.w. | list-ux sort, karty | ranking | T-IDX-03 | scoring |
| `isWroclaw`, `priorityBuyerId`, `priorityBuyerLabel` | j.w. | list-ux, karty, scoring (`priorityOrg`), strategy | filtr/ranking | T-IDX-03 | scoring |
| `addedAt` | `item.addedAt` | strategy (`i.addedAt`) | wiek pozycji | T-IDX-03 | writer |
| `linkedJobId` | `item.linkedJobId ?? null` | karty (badge), shortcut, strategy | CTA robota | T-IDX-03 | Owner |
| `ourEstimatePln` | `item.ourEstimatePln ?? null` | strategy, wadium (`estimatedValuePlnFromItem`) | KPI | T-IDX-03 | Owner |
| `tenderState` | `item.tenderState ?? null` | karta (badge stanu) | render | T-IDX-03 | e-Zamówienia |
| `awardResult` → `{ isUs, fetchedAt }` | `item.awardResult` | karta (`isUs`), strategy (`isUs`, `fetchedAt`) | badge wyniku | T-IDX-04 | BZP award |
| `tenderFit` → `{ fitLabel, winChancePct }` | `item.tenderFit` | karta, strategy | badge fit | T-IDX-04 | fit engine |
| `swzAnalysis` → `{ profitabilityHint, estimatedValuePln, estimatedValueRaw, implementationDays, wadiumPercent, wadiumPln, wadiumRaw }` | `item.swzAnalysis` | karta (`profitabilityHint`, wadium), strategy (`estimatedValuePln`, `implementationDays`), `computeWadiumInfo` | badge/wadium/KPI | T-IDX-04 | SWZ parser |
| `_lsIndex` | — | detektor (§2.4) | marker | T-IDX-05 | writer |

**Nie w INDEX (celowo):** `noticeHtml`, `tenderDossier` (w tym `kosztorys`, `catalogQuantities`, `bidProposal`), `bzpDocuments`, `uploadedFile`, `externalDocDiscovery`, `changeMonitor`, `qaMonitor`, `estimateHistory`, `notes`, `orderType`, `moIdentifier`, `noticeNumber`, `ezamowieniaUrl`, `documentsFetchedAt`, `submittedBidPln`, `submittedAt`, `ocdsId`, `ingestMode`, `retention`, `sourceUrls`, `_cloudLean`. Readery strategy używające `tenderDossier?.bidProposal?.recommendedBidPln`, `tenderDossier?.kosztorys?.ok`, `bzpDocuments?.length`, `noticeHtml`, `uploadedFile` operują przez `?.` — w trybie zdegradowanym = „brak” (identycznie jak dziś dla `noticeHtml`/`rows` w LEGACY_LEAN). Test T-IDX-06 „degraded render” to wymusza (lista + detal + Pulpit bez crash na INDEX-only dataset).

### 2.3 Typy

```ts
export interface TenderPipelineLsIndexMarker { v: 1; seq: number }   // seq = envelope.localSeq, z którym INDEX został zbudowany
export type TenderPipelineIndexItemV1 =
  Pick<TenderPipelineItem, "id" | "updatedAt" | "title" | "status" | "submittingOffersDate" | "publicationDate"
    | "organizationName" | "organizationCity" | "organizationProvince" | "cpvCode" | "tenderId" | "bzpNumber"
    | "relevanceScore" | "matchedKeywords" | "isWroclaw" | "priorityBuyerId" | "priorityBuyerLabel" | "addedAt">
  & { ikFinalBid: IkG3FinalBidRecord | null; linkedJobId: string | null; ourEstimatePln: number | null; tenderState: string | null;
      awardResult: Pick<TenderAwardResult, "isUs" | "fetchedAt"> | null;
      tenderFit: Pick<TenderFitAssessment, "fitLabel" | "winChancePct"> | null;
      swzAnalysis: Pick<TenderSwzAnalysis, "profitabilityHint" | "estimatedValuePln" | "estimatedValueRaw" | "implementationDays" | "wadiumPercent" | "wadiumPln" | "wadiumRaw"> | null;
      _lsIndex: TenderPipelineLsIndexMarker };
export type TenderPipelineIndexCollectionV1 = TenderPipelineIndexItemV1[];   // LS value = tablica (kompatybilność old client)
export function buildTenderPipelineLsIndex(items: TenderPipelineItem[], seq: number): TenderPipelineIndexCollectionV1;   // NIE implementować w Design Freeze
```
Brak envelope w LS (tablica zachowana — old client `Array.isArray` OK). Brak osobnego klucza meta w LS.

### 2.4 Detekcja kształtu LS (reader)

```ts
export type PipelineLsKind = "INDEX" | "LEGACY_LEAN" | "LEGACY_FULL" | "EMPTY" | "MISSING" | "CORRUPT";
export function detectPipelineLsKind(raw: string | null): { kind: PipelineLsKind; seq?: number; items?: unknown[] };
```

| Warunek (kolejność) | Kind |
|---|---|
| `raw == null` | MISSING |
| parse fail ∨ `!Array.isArray` | CORRUPT |
| `length === 0` | EMPTY |
| każdy item ma `_lsIndex.v === 1` ∧ wszystkie `seq` równe | **INDEX** (`seq`) |
| część items ma `_lsIndex` (mieszane) ∨ różne `seq` | CORRUPT (`index_mixed`) |
| ∃ item z `tenderDossier.kosztorys._coldRowsCount` ∨ (∀ items brak `noticeHtml` ∧ ∃ `kosztorys.rows=[]` ∧ `rowCount>0`) | **LEGACY_LEAN** |
| inaczej | **LEGACY_FULL** |

INDEX ważność względem IDB (po hydracji): `seq === envelope.localSeq` → VALID · `seq < envelope.localSeq` → STALE (IDB nowsze; rebuild LS) · `seq > envelope.localSeq` → INCONSISTENT (niemożliwe przy ACK-first; traktuj jak STALE + telemetria `index_seq_ahead`) · envelope MISSING/CORRUPT → **INDEX_WITHOUT_FULL** (§4.3).

---

## 3. WRITER CONTRACT — canonical `saveTendersPipelineLocal` (**NEW-04**, in-place)

### 3.1 Walidacja FULL (przed jakimkolwiek zapisem)
`validatePipelineFullForWrite(items)`: `Array.isArray` ∧ ∀ item: obiekt ∧ `id` niepusty string ∧ brak duplikatów `id` ∧ **(AMENDMENT A §A.6.4) ∀ item: `!("_lsIndex" in item)`** — reason `index_not_full`. FAIL ⇒ telemetria `writer_validation_failed:<reason>`, **żaden** zapis IDB/LS, funkcja kończy. RAM: dla reason ≠ `index_not_full` RAM aktualizowany (UI = prawda sesji); dla `index_not_full` **RAM (`coldMem`) NIE jest aktualizowany** — `coldMem` może zawierać wyłącznie FULL (PIPELINE-INDEX-01). (Dziś taki stan nie występuje w praktyce; guard defensywny — dla `_lsIndex` = backstop kontraktu §A, pierwsza linia obrony jest upstream §A.6.)

### 3.2 Sekwencja (flag ON = `isPipelineLocalIndexEnabled()`)

```text
saveTendersPipelineLocal(items)                       // sygnatura: (items) => void — bez zmian
 1 FULL RAM        coldMem = items (sync) · patch session-cache przez callerów jak dziś
 2 VALIDATE        §3.1
 3 WRITE IDB FULL  setPipelineColdMemory(items, {bundleRevision: lastSeenGuardRev, writer})
 4 WAIT ACK        (async) result.ok po read-back
 5 BUILD INDEX     ok → buildTenderPipelineLsIndex(items, result.localSeq); jedna serializacja → payload
 6 BUDGET          evaluatePipelineIndexBudget(bytes) (§7) → WARN telemetria / BLOCK → skip 7
 7 WRITE LS INDEX  localStorage.setItem(KEY, payload) · catch Quota → BLOCK (§7)
 8 TELEMETRY       recordStorageWrite ×2 (tier 2 idb, tier 1 ls) + logPipelineLocalSaveTelemetry przy błędach
 9 CLOUD           poza writerem: caller (persistKey / persist-coalesce / saveTendersPipeline) → pushTenderPipelineToCloud(items) — bez zmian
```
Flag **OFF** (compat): kroki 1–3 jak wyżej (envelope pisany zawsze — IDB durable od Phase 3), krok 5–7 zastąpione **synchronicznym** zapisem LEGACY_LEAN (`stripTenderPipelineForLocalStorage`) jak dziś, bez czekania na ACK. Dzięki temu Phase 3 ⊇ MAIN.

Flag **ON** ∧ ACK fail ⇒ **fallback compat**: zapis LEGACY_LEAN (nie INDEX) + telemetria `idb_write_failed → compat_write` (Owner #2: urządzenie bez valid durable FULL zostaje w LEAN mode). LS nigdy nie otrzymuje INDEX z `seq` bez ACK tego `seq`.

Zwrot: `void` zachowane; dodatkowo `export function awaitPipelineLocalWriteSettled(): Promise<PipelineLocalWriteResult>` (ostatni zapis; test/diag), gdzie `PipelineLocalWriteResult = { idb: PipelineIdbWriteResult; ls: { mode: "index" | "compat" | "skipped"; ok: boolean; bytes: number; reason?: "quota" | "error" | "budget_block" | "no_ack" } }`.

### 3.3 Failure paths (zamrożone)

| # | Sytuacja | IDB | LS | RAM | Cloud | Telemetria | Jedyna kopia FULL |
|---|---|---|---|---|---|---|---|
| A | IDB ok + LS ok | envelope seq N | INDEX seq N (ON) / LEAN (OFF) | FULL | seam wg callera | `envelope_ok`, `index_written` | IDB ✔ |
| B | IDB ok + LS quota | envelope seq N | **bez zmian** (poprzednia zawartość) | FULL | seam | `quota_blocked_index` (+ ring buffer `quota_blocked`) | IDB ✔ (QUOTA-01) |
| C | IDB ok + LS error (non-quota) | envelope seq N | bez zmian | FULL | seam | `ls_write_error` | IDB ✔ |
| D | IDB fail + LS existing valid (INDEX seq N−1 lub LEGACY) | envelope N−1 (stare) | **compat write LEAN(N)** (ON→fallback; OFF→jak dziś) | FULL N | seam | `idb_write_failed`, `compat_write` | LEAN(N) w LS + envelope N−1 + cloud lean → odtwarzalne przez merge (§8.2) |
| E | IDB fail + LS missing | brak | compat write LEAN(N) | FULL N | seam | `idb_write_failed`, `compat_write`, `no_prior_local` | LEAN w LS + cloud lean; heavy klasy A/B tylko RAM → **jawnie raportowane** (`heavy_not_durable`) |
| F | IDB fail + LS quota | brak/stare | bez zmian | FULL N | seam | `idb_write_failed`, `quota_blocked_compat`, **`no_local_durable`** (critical) | cloud lean (klasa C chronione write-safety) + RAM; heavy nie-durable → raport, nie ukrywanie |
| G | cloud failure | jak A–F | jak A–F | FULL | throw z seam do callera (dziś: catch/alert) | seam telemetria istniejąca | lokalnie ✔ |
| H | cloud write-safety BLOCK | jak A–F | jak A–F | FULL | `PipelineWriteSafetyBlockedError` (pre-write, bez latch) | istniejące kody `PIPELINE_*_BLOCKED` | lokalnie ✔ |

W żadnej ścieżce writer nie wykonuje `removeItem` ani nie nadpisuje LS pustką. Brak retry-loop; brak „downgrade do niezdefiniowanego formatu” (compat = zdefiniowany LEGACY_LEAN).

---

## 4. READER CONTRACT

### 4.1 Ścieżki
```text
NORMAL (sync, R1 loadTendersPipelineLocal):   LS → detectPipelineLsKind → chain (§4.2) → items
FULL REQUIRED (async, loadTendersPipeline):   hydratePipelineColdFromIdb → RAM FULL ← IDB FULL → (cloud merge) → canonical writer → rebuild LS INDEX best-effort
```
Kolejność źródeł (D8): **RAM FULL (coldMem) → IDB FULL → LS** (LS = INDEX/LEGACY tylko gdy brak RAM/IDB). To zgodne z dzisiejszym `resolvePipelineLocalWithCold` (cold wins).

### 4.2 Zachowanie R1 wg kształtu LS (po hydracji IDB, jeżeli była; przed hydracją coldMem może być null)

| LS kind | IDB status | Reader zwraca | Akcja poboczna |
|---|---|---|---|
| INDEX VALID (seq = env) | OK | coldMem FULL | — |
| INDEX STALE (seq < env) | OK | coldMem FULL | rebuild LS INDEX przez canonical writer (best-effort, po budżecie) |
| INDEX (dowolny seq) | MISSING / CORRUPT / LEGACY_ARRAY→CORRUPT | **INDEX items** (tryb zdegradowany, **read-only**) + `setPipelineFullAvailability("DEGRADED_INDEX")` | telemetria `index_without_full`; **AMENDED (§A.7 CASE 2/3):** `loadTendersPipeline` **nie** wykonuje `merge(INDEX, cloud)`; recovery FULL′ wyłącznie z cloud lean jako całości pod warunkiem subset (§A.5.3) → canonical writer → envelope (ACK) → LS INDEX; brak recovery ⇒ pozostaje DEGRADED_INDEX, brak zapisu FULL, brak push |
| INDEX | brak hydracji jeszcze (coldMem null, sync call) | INDEX items (**read-only do czasu FULL**) | zdegradowany do czasu `loadTendersPipeline`; availability = `UNKNOWN` → żadna operacja FULL-required nie startuje (§A.6.1) |
| LEGACY_FULL | * | FULL z LS ∪ coldMem (preserve-heavy) | migracja §8.1 przy następnym zapisie |
| LEGACY_LEAN | OK | coldMem FULL (jak dziś) | migracja §8.2 |
| LEGACY_LEAN | MISSING/CORRUPT | LEAN items | telemetria `legacy_lean_without_full`; §8.2 (FULL recovery) |
| EMPTY | OK | coldMem FULL | rebuild LS |
| EMPTY | MISSING | `[]` | — |
| MISSING | OK | coldMem FULL | rebuild LS |
| MISSING | MISSING | `[]` (jak dziś) | cloud hydrate w `loadTendersPipeline` |
| CORRUPT | OK | coldMem FULL | rebuild LS; telemetria `ls_corrupt` |
| CORRUPT | MISSING | `[]` | telemetria; cloud hydrate |

Reader **nigdy** nie zapisuje LS sam — rebuild = wywołanie canonical writera (jedyny setItem).

### 4.3 INDEX_WITHOUT_FULL (przypadek CSR) — zamrożona reakcja **(AMENDED — v1.0 krok 2 był źródłem F-P0-01; obowiązuje §A.7 CASE 2)**
1. Telemetria `index_without_full` (critical); `pipelineFullAvailability = "DEGRADED_INDEX"`. 2. `loadTendersPipeline`: cloud lean fetch → **bez** `mergeTenderPipelineForCloud(indexItems, cloud)` (ZAKAZ — PIPELINE-NO-CONVERSION-01). Recovery FULL′ (§A.5.3): `FULL′ := cloudLeanItems` (całość, nienaruszona przez INDEX) **tylko jeżeli** `ids(INDEX) ⊆ ids(cloud) ∪ deletedIds`; wtedy → VALIDATE → canonical writer (`writer:"recovery.cloud_lean"`) → envelope ACK → LS INDEX (seq nowy) → availability `FULL`. Warunek subset niespełniony ⇒ **brak recovery**, telemetria `index_ids_not_in_cloud:<n>` (critical), stan pozostaje DEGRADED_INDEX. 3. Brak destrukcji; brak `removeItem`; **brak push do cloud** z tej ścieżki (recovery jest lokalne). 4. Jeżeli cloud niedostępny: INDEX pozostaje jedynym lokalnym źródłem; UI zdegradowane **read-only** (§A.7); brak zapisu FULL, brak zapisu INDEX nowego seq. Heavy klasy A regenerowalne z parserów/Storage; klasy B (events) — utracone lokalnie, jak dziś przy braku IDB (jawnie raportowane, nie ukrywane).

### 4.4 R3–R10 — źródło items

| R | Źródło TARGET | Uwagi |
|---|---|---|
| R2 session-cache | `getPipelineColdMemory()` (§5) | nigdy LS body |
| R3 import local side | `await hydratePipelineColdFromIdb()` → `resolvePipelineFullSource()` (§A.5.2) — **nigdy** `loadTendersPipelineLocal()` (może zwrócić INDEX) | **AMENDED §A.8:** brak FULL ⇒ local side = `[]` + warunek subset (§A.5.3) albo BLOCK importu pipeline; zapis → canonical writer |
| R4/R8 backup export | §9 | FULL VALID albo INCOMPLETE |
| R5 restore local side | jak R3 | **AMENDED §A.8** — jak R3 |
| R6 CloudLoader | LS (INDEX/LEGACY) do `mergeAllDataKeys` — wynik pipeline nieużywany | **AMENDED §A.6.3:** `mergeTenderPipelineForCloud` wyklucza stronę INDEX (nie throw) ⇒ wynik dla pipeline = cloud-side (core phase: `[]`); test potwierdza brak persistu i brak throw |
| R7 snapshot bundle | LS (INDEX) — świadomie **nie** FULL (#LSA-006; FULL jest w IDB pod własnym kluczem) | bez zmian kodu |
| R9 deferred bootstrap local side | `readLocalStorageDataKey(TENDERS_PIPELINE_KEY)` → branch: `getPipelineColdMemory() ?? LS` | **AMENDED §A.8.4:** local side = `coldMem` ∨ LS gdy kind ∈ {LEGACY_FULL, LEGACY_LEAN}; LS kind INDEX ∧ coldMem null ⇒ **klucz pipeline pominięty** (bez merge, bez persist, bez push; telemetria `bootstrap_pipeline_skipped_no_full`) |
| R10 write-safety | RAM FULL (`fullItems`) w seam; INDEX zawiera `id/updatedAt/ikFinalBid` ⇒ verdict identyczny gdy generic seam czyta LS | §6 |

---

## 5. SESSION CACHE — kontrakt (`tenders-pipeline-session-cache.ts`)

| Pytanie | Zamrożona odpowiedź |
|---|---|
| Kiedy pobiera INDEX? | **Nigdy do `cache.items`.** LS body nie jest czytane przez ten moduł (usunięcie `readPipelineLocal` z hydrate). |
| Kiedy pobiera FULL? | `hydratePipelineSessionCacheFromLocalStorage` (event `wgdom-deferred-bootstrap`) → `const full = getPipelineColdMemory()`; jeżeli `full != null` → `patchPipelineSessionCache(full, {customKeywords, partialMeta})`; jeżeli `null` → patch **tylko** `customKeywords`/`keywordsEpoch` (items bez zmian). |
| Kiedy hydratuje IDB? | Nie hydratuje sam. Hydracja IDB należy do `loadTendersPipeline()` (`useTendersPipeline`), która już `await hydratePipelineColdFromIdb()`. Session-cache pozostaje sync. |
| Kiedy FULL trafia do RAM? | (a) `loadTendersPipeline` → coldMem; (b) każdy `saveTendersPipelineLocal` → coldMem (sync, krok 1). |
| Lazy? | Tak — brak hydracji przy imporcie modułu; brak I/O w event handlerze poza odczytem keywords (mały klucz). |
| Pełny skan LS? | 0 — moduł czyta wyłącznie `kw-tenders-custom-keywords`. |
| Import | `import { getPipelineColdMemory } from "@/lib/storage/tenders-pipeline-cold"` — bez cyklu (cold → storage/*, type-only `tenders-bzp`). |
| TTL / generation / `cloudHydrated` | bez zmian. |
| `patchPipelineSessionCache` wywoływane z coalesce/`saveTendersPipeline` | bez zmian (dostaje FULL od callera). |

---

## 6. WRITE-SAFETY — SOURCE OF TRUTH (bez zmian mechanizmu)

| Ścieżka | Snapshot lokalny | Zmiana |
|---|---|---|
| `pushTenderPipelineToCloud(fullItems)` (persistKey, coalesce, `saveTendersPipeline`, deferred bootstrap, reset) | **RAM FULL** przekazany przez callera | **brak** |
| generic seam w `cloud-sync.ts` czytający LS przed push (`pushKeysToCloudSafe` route) | LS: INDEX (id, updatedAt, ikFinalBid obecne) lub LEGACY | **brak** kodu; test Q: verdict(INDEX) ≡ verdict(FULL) dla `missingRecords`, `countRegression`, `criticalLoss` |
| `evaluatePipelineSnapshotWriteSafety`, `guardTenderPipelineCloudWrite`, `assertTenderPipelineCloudWriteAllowed`, kody `PIPELINE_*_BLOCKED` | — | **REUSE, zero zmian** |
Zachowane: `id`, `updatedAt` (guard), `ikFinalBid` (criticalLoss), missing-records protection, count-regression protection. **Żadna zmiana write-safety nie jest wymagana** (NEW = 0 w tym obszarze). Jeżeli IMPLEMENT wykaże konieczność — STOP (poza zakresem ADR).

---

## 7. QUOTA — trzy warstwy (nigdy utożsamiane)

| Warstwa | Co to jest | MEASURE | WARN | BLOCK | TELEMETRIA | FALLBACK |
|---|---|---|---|---|---|---|
| **A. Browser quota** | limit przeglądarki (UNKNOWN U9; ~5 MiB UTF-16 w Chromium — nie zakładane) | brak (niemierzalne bez exception) | — | `catch DOMException QuotaExceededError/code 22/1014` → **BLOCK LS write** | `quota_blocked_index` / `quota_blocked_compat` | FULL w IDB (QUOTA-01); LS bez zmian; reader chain IDB → RAM |
| **B. WGDOM per-key INDEX budget (NEW-06)** | budżet projektowy dla `kw-tenders-pipeline` INDEX | `bytes = Blob(payloadINDEX).size` — ta sama serializacja co do `setItem` (1 serializacja) | `bytes ≥ PIPELINE_INDEX_LS_WARN` → telemetria `index_budget_warning` | `bytes ≥ PIPELINE_INDEX_LS_BLOCK` → **skip setItem**, telemetria `index_budget_block` | j.w. | FULL w IDB; LS poprzednia zawartość |
| **C. Global 1.2/1.4/1.5 MiB (istniejące `storage-budget.ts`)** | próg telemetryczny całego LS | `measureLocalStorageBytes()` **poza hot-path**: ≤ 1×/60 s, po zapisie, w `requestIdleCallback ?? setTimeout(0)` | `budgetStateForTotal` → `recordStorageWrite({key:"__ls_total__", note: state})` | **nigdy** nie blokuje INDEX | `ls_total:<state>` | — |

Wartości NEW-06 (**PROVISIONAL**, kalibracja = GATE 2 pomiar P-3; zmiana w granicach PLAN Phase 7 nie wymaga Owner decision): `PIPELINE_INDEX_LS_WARN = 768 KiB`, `PIPELINE_INDEX_LS_BLOCK = 1 MiB`. Jeżeli pomiar INDEX 505 poz. > 1 MiB → **OWNER DECISION REQUIRED** (INDEX shape vs budżet), nie samowolna zmiana progu.  
Zakazy: retry po quota; testowy `setItem`; automatyczny downgrade formatu; `measureLocalStorageBytes()` w `saveTendersPipelineLocal`.

---

## 8. MIGRATION — sekwencje

### 8.1 LEGACY_FULL LS → INDEX (flag ON)
```text
detect LEGACY_FULL → FULL := mergePreserveHeavy(LS_FULL, coldMem?) → VALIDATE (§3.1)
→ canonical writer(FULL, writer:"migration.legacy_full") → IDB envelope → ACK
→ INDEX build → LS INDEX (nadpisuje legacy; bez removeItem)
ACK fail → LS pozostaje LEGACY_FULL (compat write pominięty, bo LS już ma FULL) + telemetria
```
Trigger: pierwszy `loadTendersPipeline()` po włączeniu flagi (nie przy imporcie modułu) — czyli przy starcie Przetargów/Pulpitu.

### 8.2 LEGACY_LEAN LS → INDEX (flag ON)
```text
detect LEGACY_LEAN → attempt FULL recovery:
   IDB OK/LEGACY_ARRAY → FULL := mergeTenderPipelineForCloud(LEAN, IDB_FULL) z mergeKosztorysPreserveHeavy
                        (rows z IDB gdy LEAN.rows=[] ∧ _coldRowsCount>0 / kosztorysRowsFieldAbsent)
   IDB MISSING/CORRUPT → cloud lean fetch → FULL′ := merge(LEAN, cloud)  (heavy A/B brak → telemetria full_from_lean)
→ VALIDATE → canonical writer(FULL, "migration.legacy_lean") → envelope → ACK → INDEX → LS
ACK fail → NO INDEX CUTOVER; LS pozostaje LEGACY_LEAN (compat); telemetria
```
Uwaga: FULL′ z LEAN+cloud jest **FULL w sensie kontraktu** (komplet id, wszystkie pola niestripowane), z brakiem heavy klasy A/B — dopuszczalne (klasa A regenerowalna; jak dziś przy braku IDB). INDEX cutover następuje **wyłącznie** po ACK envelope FULL′. **(AMENDMENT A §A.4):** LEGACY_LEAN ≠ INDEX — LEAN jest klasą FULL-compatible (FULL − 2 heavy, bez `_lsIndex`), dlatego może być stroną merge; INDEX nie może (PIPELINE-INDEX-01). Sekwencja §8.2 pozostaje bez zmian.

### 8.3 IDB LEGACY_ARRAY → ENVELOPE
Przy pierwszym zapisie canonical writera (dowolny trigger) — envelope `localSeq = 1`, `bundleRevision = lastSeen ?? 0`, `writer` wg źródła. Bez osobnego kroku migracyjnego.

### 8.4 Zakazy
Brak `localStorage.removeItem(kw-tenders-pipeline)`, brak `idbRemove(tenders-pipeline-full)`, brak `migratePipelineFullToLeanGuard` (cloud) — cloud bez zmian.

---

## 9. BACKUP — sekwencja (Owner #3: BACKUP = FULL, EMAIL = FULL)

```text
exportBackup / collectLocalBackupData (async):
  1 { items, status, envelope } = await hydratePipelineColdFromIdb()
  2 VALIDATE: status ∈ {OK, LEGACY_ARRAY} ∧ items.length > 0   → FULL VALID
     inaczej → (coldMem != null ∧ ostatni zapis miał ACK) → FULL VALID (RAM potwierdzone durable)
     inaczej → NO VALID FULL
  3 FULL VALID  → data["kw-tenders-pipeline"] = items (FULL) · metadata: data["__wgdomBackupMeta"]? — NIE (import loop wpisałby klucz do LS)
                  → metadata wyłącznie w nazwie pliku: backup-YYYY-MM-DD-full.json + telemetria backup_pipeline_full{itemCount, localSeq}
  4 NO VALID FULL → klucz "kw-tenders-pipeline" POMINIĘTY w pliku · nazwa backup-YYYY-MM-DD-INCOMPLETE.json
                  → alert Ownera: "Backup niekompletny — pipeline FULL niedostępny (IDB)" · telemetria backup_pipeline_incomplete
  5 pozostałe klucze: bez zmian (LS raw jak dziś)
E-mail (weekly-backup-email.ts): identyczna walidacja; NO VALID FULL → klucz pominięty + telemetria; payload/Edge bez zmian (brak nowego pola — EDGE FREEZE)
```
INDEX **nigdy** nie jest eksportowany jako `kw-tenders-pipeline` (zakaz udawania FULL). Import (§11 C) akceptuje FULL z pliku i przechodzi przez canonical writer. **(AMENDMENT A §A.8.1–A.8.3):** krok 2 „FULL VALID” = `resolvePipelineFullSource()` status `FULL` (§A.5.2); import waliduje plik jako zewnętrzne źródło FULL (`_lsIndex` w pliku ⇒ odrzucenie klucza pipeline z importu, `import_pipeline_rejected:index_payload`).

---

## 10. RESET — sekwencja (Owner #1: NON-EMPTY CLOUD = BLOCK, bez override)

```text
resetTendersPipeline():
  1 [body, guard] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY])
    fetch fail → verdict = guardTenderPipelineCloudWrite([], "UNAVAILABLE") → BLOCK (PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED)
  2 verdict = guardTenderPipelineCloudWrite([], body, {deletedIds})       // REUSE, bez zmian
  3 BLOCK (cloud non-empty ∨ unavailable) → throw PipelineWriteSafetyBlockedError
       → LOCAL UNTOUCHED: brak saveTendersPipelineLocal([]), brak clearDeletedTenderIds, brak IDB/LS/RAM zmian
       → UI (AdminSettingsModal) pokazuje kod verdictu (istniejący alert)  · telemetria reset_blocked:<code>
  4 ALLOW (cloud empty)  → await pushTenderPipelineToCloud([])              // cloud first
       → saveTendersPipelineLocal([])  (canonical: envelope itemCount 0 → ACK → INDEX [] / compat [])
       → clearDeletedTenderIds() → await persistKey(TENDERS_DELETED_IDS_KEY, [])
       → invalidatePipelineSessionCache("reset-pipeline")
```
Kolejność dzisiejsza (local wipe przed sprawdzeniem) = **usunięta**. Brak Owner override. `resetAllTendersSection` propaguje throw (keywords/profile nie resetowane, gdy pipeline BLOCK) — zamrożone jako zachowanie „wszystko albo nic” dla sekcji.

---

## 11. ONE WRITER — wejścia (WRITER-01)

| Wejście | CURRENT | TARGET | ROUTE | RAW setItem | IDB write | TEST | ROLLBACK |
|---|---|---|---|---|---|---|---|
| **A runtime** (`saveTendersPipeline`, coalesce `syncTenderPipelineLocalOnly`/`persistTenderPipelineImmediate`, `persistKey`) | `saveTendersPipelineLocal` + seam | bez zmian trasy; writer rozszerzony | canonical | NO (tylko wewnątrz canonical) | YES (envelope) | T-A, T-R | flag OFF |
| **B bootstrap** (`persistBootstrapMergedKey` ← `fetchAndMergeDeferredBootstrap`) | `safeSetLocalStorageJson(key, merged)` raw | `if (key === TENDERS_PIPELINE_KEY) → saveTendersPipelineLocal(asTenderPipelineItems(merged))` (dynamic import jak `persistKey`), zwrot `{ok:true}`; cloud seam jak dziś (`:3480`); **AMENDED §A.8.4:** local side wg R9 (§4.4) — bez FULL klucz pominięty **przed** merge | canonical | **NO** | YES | T-W-B (stub writer, licznik), T-INDEX-NEVER-FULL #5 | revert 1 branch |
| **C backup import** (`importBackup` `App.tsx:1796-1808`) | merge z LS body → raw `setItem` w pętli | local side = `resolvePipelineFullSource()` (§A.5.2, **nie** LS body); `data[KEY]` usunięty z pętli `Object.entries(...).forEach(setItem)` → `saveTendersPipelineLocal(merged)`; `batch-set` cloud jak dziś (route seam); **AMENDED §A.8.1** | canonical | **NO** | YES | T-O, T-INDEX-NEVER-FULL #7 | revert |
| **D admin reset** (`tenders-admin.ts`) | `saveTendersPipelineLocal([])` przed write-safety | §10 | canonical (po ALLOW) | NO | YES (po ALLOW) | T-P | revert |
| **F restore-all** (`restoreAllDataFromCloud` `App.tsx:2021-2035`) | raw `setItem` wszystkich `DATA_KEYS`; local side = `readLocalDataBundle()` (LS) | pętla `DATA_KEYS` z `if (key === TENDERS_PIPELINE_KEY) { saveTendersPipelineLocal(mergedPipeline); continue; }`; local side pipeline = `resolvePipelineFullSource()` (**nie** `localBundle[KEY]`); `pushAllDataToCloud(merged)` bez zmian (route seam); **AMENDED §A.8.2** | canonical | **NO** (dla pipeline) | YES | T-O, T-INDEX-NEVER-FULL #8 | revert |
| E ingest patch | cloud-only | bez zmian (INGEST-01) | — | NO | NO | — | — |
Test „raw writer absence”: statyczna asercja (`scripts/`), że `localStorage.setItem` z `TENDERS_PIPELINE_KEY`/`"kw-tenders-pipeline"` występuje wyłącznie w `saveTendersPipelineLocal`; `Object.entries(data).forEach(setItem)` w `App.tsx` musi filtrować klucz (test dynamiczny ze stubem).

---

## 12. 02F — granica

| REUSE (idea) | Realizacja | DO NOT USE |
|---|---|---|
| one writer | §11 (tylko pipeline) | `src/lib/storage/storage-manager.ts` (untracked; `estimateJsonBytesFast` nie istnieje na MAIN) |
| budget-before-write | §7 B (per-key, 1 serializacja, bez skanu) | `storage-key-registry.ts` (untracked) |
| telemetry | §16 (`writer`/`note` w istniejącym `recordStorageWrite`) | `storage-budget-cache.ts` (untracked) |
| routing | writer: FULL→IDB, INDEX→LS (jeden klucz) | `storage-tier1-ls.ts` (untracked) · jakikolwiek import 02F · `estimateJsonBytesFast` |
Test T-02F: grep-asercja braku importów w/w plików w `src/`.

---

## 13. FEATURE FLAG — **NEW-03** `pipelineLocalIndexV1`

Weryfikacja istniejących: `pipelinePerfDebouncePersist` (cloud debounce), `pipelineBootstrapPersistLocal` (bootstrap persist), `pipelineCloudLeanGuardV1`/`…MigrationComplete`/`…Rollback`/`…MigrationRev`/`…MinCommit` (cloud contract) — **żadna nie steruje kształtem LS** ⇒ NEW-03 nieunikniony (D9 rollback flag).

| Element | Zamrożone |
|---|---|
| Klucz | `AppSettings.pipelineLocalIndexV1: boolean`, default **`false`**, w `kw-app-settings` (remote-wins jak pozostałe), bez nowego KV |
| Helper | `isPipelineLocalIndexEnabled(): boolean` (`app-settings.ts`) |
| **OFF** | compat: envelope IDB pisany zawsze (od Phase 3), LS = LEGACY_LEAN sync; reader chain aktywny (IDB → LS); migracja §8 **nie** startuje |
| **ON** | writer §3.2 (ACK → INDEX); migracja §8 przy `loadTendersPipeline`; fallback compat przy ACK fail (Owner #2) |
| ON→OFF (rollback) | następny zapis = compat LEGACY_LEAN nadpisuje INDEX; INDEX w LS do tego czasu czytelny przez chain (IDB FULL) i przez old client (tablica) |
| UI | przełącznik w `AdminSettingsModal` (Super Admin) obok istniejących flag pipeline — copy PL; brak auto-ON |
| Prod | **brak mutacji w Design Freeze**; ON wyłącznie w Phase 10 po preflight |

---

## 14. PERFORMANCE — acceptance gates (LOCKED; kalibracja tylko przez Owner)

| Gate | Próg | Pomiar | Faza |
|---|---|---|---|
| P-1 IDB write envelope (505) | p95 < 300 ms | Playwright preview (prawdziwy IDB) + node stub (czas serializacji) | 1, 3 |
| P-2 IDB read + parse | p95 < 200 ms | j.w. | 1 |
| P-3 INDEX serialization | p95 < 25 ms; **bytes zapisane** (wejście §7 B) | node, 505 poz. | 2 |
| P-4 FULL serialization | **dokładnie 1** `JSON.stringify(envelope)` na canonical write (asercja licznika stub) | node | 3 |
| P-5 full LS scan w hot-path | **0** wywołań `measureLocalStorageBytes()` w `saveTendersPipelineLocal`/readerach (asercja) | node | 3, 7 |
| P-6 bootstrap `loadTendersPipeline` | ≤ +100 ms p95 vs MAIN baseline (ten sam dataset) | node + preview | 4, 5 |
| P-7 session hydrate R2 | ≤ MAIN (brak `JSON.parse` LS body) | node | 4 |
| P-8 cloud sync | 0 dodatkowych `fetchKeysFromCloud` na zapis (asercja) | node | 3 |
| P-9 NG11 timing | `scripts/test-ng11-pipeline-timing.mjs` PASS | istniejący | każda |
Dataset: 505 poz. wg rozkładu KV (avg 4.7 KB lean, max item 168 KB) + FULL syntetyczny (rows/snapshots) ≥ 2× lean; worst-case 1 item ≈ 1 MB FULL. Istniejące benchmarki (`test-localstorage-arch-02f-p0-perf.mjs`) nie podważają progów (dotyczyły pełnego skanu LS — P-5). Jeżeli pomiar Phase 1–3 przekroczy próg → **OWNER DECISION REQUIRED**, nie zmiana progu.

---

## 15. TEST CONTRACT A–T

Harness: `vite-node` + stub `localStorage` (Map, tryb `quota`/`throw`) + **NEW-05** stub `indexedDB` in-memory (`installIdbStub({ mode: "ok" | "unavailable" | "write_fail" | "corrupt_readback" })`); S/T dodatkowo Playwright `preview @4173`. Rollback dla każdego testu = flag OFF / revert fazy (żaden test nie wymaga czyszczenia prod).

| ID | TEST | PHASE | INPUT | EXPECTED | FAILURE (= STOP) |
|---|---|---|---|---|---|
| A | normal write | 3,5 | FULL 505, IDB ok, LS ok, flag ON/OFF | ON: envelope seq N ACK → LS INDEX seq N; OFF: envelope + LS LEAN; RAM = FULL | INDEX bez ACK; 2 serializacje FULL |
| B | reload | 1,4,5 | po A: nowy import modułów, IDB stub trwały | chain → coldMem FULL; detal ma rows/snapshot; LS INDEX VALID | INDEX zwrócony mimo IDB OK |
| C | browser quota | 3,7 | LS stub throw `QuotaExceededError` przy INDEX | LS bez zmian; envelope ACK; `quota_blocked_index`; brak retry | utrata envelope; retry |
| D | IDB unavailable | 1,3,5 | `indexedDB` undefined, flag ON | ACK false → compat LEAN write; **brak INDEX**; telemetria | LS = INDEX |
| E | corruption | 1,4,8 | envelope z `itemCount≠length` / brak `id` / `schemaVersion 2` | CORRUPT → ignoruj (bez `idbRemove`), reader jak MISSING, telemetria | envelope użyty |
| F | stale IDB | 1,4,8 | envelope rev 290 vs guard 291 / brak id z guard | STALE_* → merge z cloud lean → writer → nowy envelope → INDEX | FULL odrzucony |
| G | empty IDB | 5,8 | LS LEGACY_LEAN, IDB MISSING, cloud lean OK, flag ON | FULL′ = merge(LEAN, cloud) → envelope ACK → INDEX; `full_from_lean` | INDEX przed ACK |
| H | LS unavailable | 3,7 | `setItem` throw non-quota | `ls_write_error`; envelope ACK; chain IDB | crash callera |
| I | both unavailable | 3 | IDB undefined + LS throw | RAM FULL; `no_local_durable`; seam push działa (stub) | wyjątek do UI |
| J | cloud unavailable | 4 | `fetchKeysFromCloud` throw | R1 chain lokalny; seam BLOCK `CLOUD_READ_FAILED`; reset BLOCK | lokalna destrukcja |
| K | cloud lean merge | 4 | IDB FULL z rows + cloud `_cloudLean` | `mergeTenderPipelineForCloud` zachowuje rows/snapshot (`isCloudLeanFieldOmitted`) | rows → [] |
| L | legacy FULL | 5,8 | LS LEGACY_FULL (noticeHtml, rows), IDB MISSING, flag ON | §8.1: envelope ACK → INDEX; heavy w envelope | INDEX bez envelope |
| M | legacy LEAN | 5,8 | LS `_coldRowsCount>0`, IDB LEGACY_ARRAY z rows | rows z IDB; envelope; INDEX; `_coldRowsCount` nie w cloud | rows utracone |
| N | INDEX | 5,8 | LS INDEX seq 7, envelope seq 7 / 8 / MISSING | VALID → FULL; STALE → FULL + rebuild; MISSING → INDEX items (read-only) + `index_without_full` + recovery **§A.5.3 (bez merge INDEX)** | rebuild bez ACK; INDEX w merge |
| **T-INDEX-NEVER-FULL** | semantic boundary (F-P0-01) | **1 (guard), 4, 5, 6, 8** | §A.9 — 10 scenariuszy | §A.9 oracle: FULL durable pozostaje **absent** zamiast INDEX; cloud unchanged; brak false VALID envelope; degraded explicit | jakiekolwiek INDEX → FULL / envelope / cloud |
| O | backup | 4.6–4.8, 6 | export (IDB OK / MISSING); import pliku FULL; restore-all | FULL w pliku `-full`; MISSING → klucz pominięty + `-INCOMPLETE` + alert; import/restore → canonical writer (0 raw) | INDEX w backupie jako pipeline |
| P | reset | 6 | cloud 505 / cloud [] / cloud unavailable | 505: BLOCK, local nietknięte (LS/IDB/RAM/tombstones); []: cloud→local kolejność; unavailable: BLOCK | local wipe przy BLOCK |
| Q | write-safety BLOCK | 4 | local INDEX vs cloud z `ikFinalBid` brak lokalnie / mniej id | verdict(INDEX) ≡ verdict(FULL): `criticalLoss`, `missingRecords`, `countRegression` | rozbieżny verdict |
| R | 505 dataset | 1,3,5,perf | dataset §14 | P-1…P-9 w progach; INDEX bytes zapisane | próg przekroczony |
| S | old client | 8 | preview build MAIN `3bfecc7f` + LS INDEX + IDB envelope | lista renderuje (tablica); `hydratePipelineColdFromIdb` MAIN ignoruje envelope (nie-tablica) → brak crash; detal bez heavy do cloud merge | crash / pusty ekran |
| T | rollback | 5,8 | flag ON→OFF po N | następny zapis = LEAN; INDEX czytelny do tego czasu; envelope zostaje; brak `removeItem` | destrukcja |
| T-IDX-01…06 | INDEX contract | 2 | 505 poz. FULL → INDEX | pola §2.2 obecne/typowane; brak pól spoza listy; degraded render (lista/detal/Pulpit/strategy) bez crash | pole „na zapas”; crash |
| T-W-B | writer routing | 6 | stub canonical writer; wywołaj B/C/F | licznik canonical = 3; raw `setItem` pipeline = 0 | raw > 0 |
| T-02F | brak importu 02F | 9 | grep `src/` | 0 importów | > 0 |

---

## 16. TELEMETRIA (REUSE `recordStorageWrite`/`__WG_STORAGE__`/`logPipelineLocalSaveTelemetry`; bez nowego typu)

| Zdarzenie | `key` | `writer` | `tier` | `note` |
|---|---|---|---|---|
| envelope write | `tenders-pipeline-full` | `tenders-pipeline.cold` | 2 | `envelope_ok:seq=<n>` / `idb_write_failed:<reason>` / `readback_mismatch` |
| envelope read | `tenders-pipeline-full` | `tenders-pipeline.cold.read` | 2 | `idb_ok` / `idb_missing` / `idb_legacy_array` / `idb_corrupt:<reason>` / `idb_stale:<freshness>` / `idb_bid_parity_mismatch` |
| LS INDEX write | `kw-tenders-pipeline` | `tenders-bzp.saveTendersPipelineLocal` | 1 | `index_written:seq=<n>` / `index_budget_warning` / `index_budget_block` / `quota_blocked_index` / `ls_write_error` |
| LS compat write | `kw-tenders-pipeline` | j.w. | 1 | `compat_write` / `quota_blocked_compat` / `no_prior_local` / `no_local_durable` / `heavy_not_durable` |
| LS detect | `kw-tenders-pipeline` | `tenders-bzp.loadTendersPipelineLocal` | 1 | `ls_kind:<kind>` / `index_without_full` / `legacy_lean_without_full` / `ls_corrupt` / `index_seq_ahead` |
| reader fallback | `kw-tenders-pipeline` | `<R#>` | 3 | `reader_fallback:<LS\|IDB\|RAM\|CLOUD>` |
| migration | `kw-tenders-pipeline` | `migration.legacy_full` / `migration.legacy_lean` | 1 | `migrated_to_index:seq=<n>` / `migration_no_ack` / `full_from_lean` |
| backup | `kw-tenders-pipeline` | `backup.export` / `backup.email` | 3 | `backup_pipeline_full:count=<n>` / `backup_pipeline_incomplete` |
| reset | `kw-tenders-pipeline` | `tenders-admin.reset` | 3 | `reset_blocked:<code>` / `reset_allowed` |
| global LS | `__ls_total__` | `storage-budget.idle` | 1 | `ls_total:<ok\|warning\|critical\|over>` (≤ 1×/60 s, off-hot-path) |
| ring buffer (`wgdom-pipeline-ls-telemetry`) | — | — | — | `kind` union rozszerzony additive: `"quota_exceeded" \| "save_error" \| "idb_error" \| "quota_blocked" \| "budget_block"` |
Bez PII. Diag ON do closeout (#LSA-016).

---

## 17. COMPATIBILITY MATRIX

| Kombinacja | Status | Zachowanie |
|---|---|---|
| OLD CLIENT × OLD LS (LEGACY_LEAN/FULL) | **SUPPORTED** | dzisiejsze |
| OLD CLIENT × INDEX LS | **SUPPORTED (degraded)** | tablica czytana jako body; lista OK; detal bez heavy do cloud merge; `_lsIndex` ignorowany; old `hydratePipelineColdFromIdb` ignoruje envelope (nie-tablica) → cold null → lean path |
| OLD CLIENT × IDB ENVELOPE | **SUPPORTED (degraded)** | envelope ignorowany; brak nadpisania (old writer `idbSet(items)` nadpisze envelope tablicą → nowy klient: LEGACY_ARRAY → re-envelope przy zapisie) — akceptowalne, bez utraty |
| NEW CLIENT × OLD FULL LS | **MIGRATED** (§8.1) | po ACK |
| NEW CLIENT × OLD LEAN LS | **MIGRATED** (§8.2) | po FULL recovery + ACK; bez recovery = compat |
| NEW CLIENT × INDEX LS | **SUPPORTED** | §4.2 |
| IDB missing | **SUPPORTED (no cutover)** | compat mode (Owner #2); `index_without_full` gdy LS już INDEX → cloud recovery |
| IDB stale | **MIGRATED** | merge cloud lean → nowy envelope |
| IDB corrupt | **SUPPORTED (no cutover)** | jak missing; brak `idbRemove` |
| cloud LEAN | **SUPPORTED** | bez zmian kontraktu (CLOUD-01) |
| cloud rollback (`pipelineCloudLeanRollback=true`) | **SUPPORTED** | seam wraca do FULL push (istniejące); local contract niezależny |
| `kw-tender-ingest-v1` | **OUT OF SCOPE** | INGEST-01 |
| Reset przy cloud non-empty | **BLOCKED** (by design, Owner #1) | local nietknięte |
| Backup bez valid FULL | **BLOCKED jako „kompletny”** — eksport INCOMPLETE | Owner #3 |
| Partial migration (część urządzeń INDEX) | **SUPPORTED** | cloud lean = wspólny mianownik |

---

## 18. FILE-LEVEL DESIGN

| FILE | CURRENT | TARGET | CHANGE | REUSE/NEW | DEPENDENCIES | TEST | ROLLBACK |
|---|---|---|---|---|---|---|---|
| `src/lib/storage/tenders-pipeline-cold.ts` | strip LEAN, coldMem, best-effort `idbSet`, hydrate tablicy | envelope v1 (parse/freshness/ack/read-back), `localSeq`, `buildTenderPipelineLsIndex`, `detectPipelineLsKind`, `evaluatePipelineIndexBudget`, `getPipelineColdEnvelopeMeta` | rozszerzenie | NEW-01, NEW-02, NEW-06; REUSE `storage-idb`, `guard.ts` (typy, `computeDeletedIdsRevision`, parity) | `storage-idb`, `storage-budget`, `storage-telemetry`, type-only `tenders-bzp`, `tender-pipeline-guard` (type + 2 fn — **sprawdzić cykl**: guard.ts importuje `tenders-sync` → `tenders-bzp`? guard importuje `getDeletedTenderIds` z `tenders-sync`; cold importuje guard → potencjalny cykl cold→guard→tenders-sync→…→cold. **Rozwiązanie zamrożone:** parity/freshness przyjmują `deletedIds` jako parametr; import z guard.ts **type-only** + `computeDeletedIdsRevision` (czysta fn) — jeżeli cykl mimo to → przenieść czyste fn do `tender-pipeline-guard-core.ts` **(NEW-07 warunkowy)**) | Phase 1–2, 7 | revert modułu (LEGACY_ARRAY nadal czytelna) |
| `src/lib/tenders-bzp.ts` | `saveTendersPipelineLocal` LEAN+cold; `loadTendersPipelineLocal` cold-wins | writer §3; reader §4.2; `loadTendersPipeline` hydrate status + migracja §8 trigger | in-place | NEW-04 | cold.ts, app-settings (flag), telemetria | Phase 3–5, 8 | revert; flag OFF |
| `src/lib/tenders-pipeline-session-cache.ts` | hydrate z LS body | §5 | 1 fn | REUSE `getPipelineColdMemory` | cold.ts | Phase 4.1 | revert |
| `src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts` | strip 5 pól + `_cloudLean` | `delete kosztorys._coldRowsCount` (M). **`delete next._lsIndex` — USUNIĘTE z TARGET (§A.10):** seam nigdy nie otrzymuje INDEX (precondition §A.6.5), więc strip `_lsIndex` byłby ukrytą konwersją INDEX→LEAN (PIPELINE-NO-CONVERSION-01) | additive | REUSE | — | test Track B + M | revert |
| **`src/lib/tender-pipeline/tender-pipeline-representation.ts`** (**NEW-08**) | — | leaf module: `hasLsIndexMarker`, `classifyPipelineRepresentation`, `PipelineIndexNotFullError`, `pipelineFullAvailability` (§A.5) | nowy plik (leaf, type-only importy) | NEW-08 | type-only `tenders-bzp`, type-only `cold.ts` — **zero** value-importów (brak cyklu; NEW-07 nadal NOT REQUIRED) | T-INDEX-NEVER-FULL, `audit-import-cycles` | usunięcie pliku + revert 5 callerów |
| `src/lib/tenders-sync.ts` | `mergeTenderPipelineForCloud(local, cloud)` — obie strony jako `TenderPipelineItem` | **AMENDED §A.6.3:** precondition na wejściu — strona z `_lsIndex` wykluczona z merge body (nie-uczestnik), telemetria; `mergePipelineItem` bez zmian (nigdy nie widzi INDEX) | 1 precondition + telemetria | REUSE + NEW-08 (`hasLsIndexMarker`) | NEW-08 (leaf) | T-INDEX-NEVER-FULL #6, K | revert |
| `src/lib/tender-pipeline/tender-pipeline-cloud-push.ts` | `pushTenderPipelineToCloud(fullItems)` | **AMENDED §A.6.5:** precondition `hasLsIndexMarker(items)` ⇒ throw `PipelineIndexNotFullError` (pre-write, przed write-safety) | 1 precondition | REUSE + NEW-08 | NEW-08 | T-INDEX-NEVER-FULL #9/#10 | revert |
| `src/lib/app-settings.ts` | flagi cloud lean | + `pipelineLocalIndexV1` + `isPipelineLocalIndexEnabled` | wzorzec | NEW-03 | — | Phase 5 | default false |
| `src/lib/cloud-sync.ts` | `persistBootstrapMergedKey` raw; `readLocalStorageDataKey` LS | branch pipeline → canonical writer; branch local side → coldMem ?? LS | 2 branch'e | REUSE (`persistKey` wzorzec dynamic import) | tenders-bzp (dynamic) | T-W-B, Phase 4.9 | revert |
| `src/app/App.tsx` | `exportBackup` sync LS; `importBackup` raw loop; `restoreAllDataFromCloud` raw loop | §9 async export (+ INCOMPLETE); §11 C/F | 3 miejsca | REUSE `hydratePipelineColdFromIdb`, `loadTendersPipelineLocal` | cold.ts, tenders-bzp | T-O | revert |
| `src/lib/weekly-backup-email.ts` | LS body | §9 e-mail | 1 branch (async) | REUSE | cold.ts | T-O | revert |
| `src/lib/tenders-admin.ts` | wipe → persistKey | §10 | przepisanie `resetTendersPipeline` | REUSE `guardTenderPipelineCloudWrite`, `pushTenderPipelineToCloud`, `fetchKeysFromCloud` | write-safety, seam | T-P | revert |
| `src/app/AdminSettingsModal.tsx` | flagi pipeline | + przełącznik NEW-03 (copy PL) | UI | wzorzec | app-settings | manual smoke | revert |
| `src/lib/storage/storage-budget.ts` | progi globalne | + `PIPELINE_INDEX_LS_WARN/BLOCK` (stałe) | additive | NEW-06 | — | Phase 7 | revert |
| `src/lib/storage/storage-telemetry.ts` | `recordStorageWrite` | **bez zmian** (note/writer to stringi) | — | REUSE | — | — | — |
| `src/lib/storage/storage-idb.ts` | adapter | **bez zmian** | — | REUSE | — | — | — |
| `tender-pipeline-write-safety.ts`, `tender-pipeline-guard.ts`, `tender-dossier-merge.ts`, `CloudLoader.tsx`, `local-data-backup.ts`, Edge, Payroll | — | **bez zmian** (test potwierdza). `tenders-sync.ts` i `tender-pipeline-cloud-push.ts` przeniesione do wierszy AMENDED powyżej (precondition only, bez zmiany algorytmu merge/write-safety) | — | REUSE | — | — | — |
| `src/app/tenders/strategy/hooks/useTendersPipeline.ts` (`loadTendersPipeline()` `:222`, `:346`) | items z `loadTendersPipeline` traktowane jako edytowalne | **AMENDED §A.7:** odczyt `getPipelineFullAvailability()`; `DEGRADED_INDEX`/`UNKNOWN` ⇒ mutacje (`updateItem`, `saveTendersPipeline`, coalesce) **nie startują** + jawny stan UI „tylko odczyt — brak pełnych danych lokalnych” | 1 gate + 1 banner | NEW-08 (`getPipelineFullAvailability`) | NEW-08 | T-INDEX-NEVER-FULL #10 | revert |
| `scripts/test-storage-tier1-pipeline-*.mjs` + `scripts/_lib/idb-memory-stub.mjs` | — | testy §15 + manifest `test-infra/test-manifest.json` (scope tenders) | NEW test | NEW-05 | — | — | usunięcie |
| `changelog-data.ts`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `GuideView` | — | wpisy przy release | docs | — | — | — | — |

---

## 19. SEARCH BEFORE CREATE — rejestr NEW (zamrożony)

| NEW-ID | WHY | WHY REUSE INSUFFICIENT | LOCATION | API | OWNER | TEST | ROLLBACK | MIGRATION IMPACT |
|---|---|---|---|---|---|---|---|---|
| **NEW-01** envelope v1 | D1/D5 | `TenderPipelineGuardV1` bez FULL/`writtenAt`/`maxUpdatedAt`/`localSeq`; surowa tablica bez metadanych | `tenders-pipeline-cold.ts` | §1.1, §1.3, §1.4, §1.6, §1.8 | pipeline storage | E/F/G, B | revert; LEGACY_ARRAY czytelna | IDB tablica → envelope przy 1. zapisie |
| **NEW-02** INDEX + marker | D2 | `stripTenderPipelineForLocalStorage` = FULL−2 (zakaz D2); `buildTenderPipelineGuard` = 3 pola | `tenders-pipeline-cold.ts` | §2.3, §2.4 | pipeline storage | T-IDX-01…06, N, S | flag OFF | old client ignoruje `_lsIndex` |
| **NEW-03** flaga | D9 rollback | brak flagi sterującej kształtem LS | `app-settings.ts` | §13 | Owner | T, A | OFF | remote-wins, bez KV |
| **NEW-04** ack/result writera | D5 write ack, D6 | `saveTendersPipelineLocal` = `void`, IDB fire-and-forget | `tenders-bzp.ts` | `awaitPipelineLocalWriteSettled()`, `PipelineLocalWriteResult` | pipeline storage | A–I | revert | — |
| **NEW-05** stub `indexedDB` (test) | brak `fake-indexeddb`; stub MAIN = `undefined` | fail-open stub nie testuje ACK/corrupt | `scripts/_lib/idb-memory-stub.mjs` | `installIdbStub({mode})` | test infra | wszystkie | usunięcie | — (alternatywa: `fake-indexeddb` devDep — decyzja Owner opcjonalna) |
| **NEW-06** per-key budżet INDEX | D8 | progi globalne 1.2/1.4/1.5 MiB nieadekwatne (LS 4.679 MB); pełny skan | `storage-budget.ts` (stałe) + `cold.ts` (`evaluatePipelineIndexBudget`) | §7 B | pipeline storage | C, R, P-3/P-5 | revert | — |
| **NEW-07** (warunkowy) `tender-pipeline-guard-core.ts` | cykl importów cold→guard→tenders-sync | tylko jeśli type-only import + parametr `deletedIds` nie wystarczą (ARCH-001 `audit-import-cycles`) | `src/lib/tender-pipeline/` | przeniesienie czystych fn (`computeDeletedIdsRevision`, `ikFinalBidDeepEqual`, typy) — re-export z guard.ts | pipeline | `audit-import-cycles` | revert | — |
| **NEW-08** representation guard (AMENDMENT A) | F-P0-01: brak w MAIN jakiejkolwiek reprezentacji granicy FULL/INDEX; `TenderPipelineItem` jest strukturalnie „szerszy” od INDEX → TS nie odróżnia | REUSE niewystarczające: `detectPipelineLsKind` (NEW-02) klasyfikuje **surowy string LS**, nie tablicę już sparsowaną w merge/seam; `validatePipelineFullForWrite` (§3.1) działa tylko w writerze, a granica musi być w merge (tenders-sync), seamie (cloud-push), imporcie/restore (App) i bootstrap (cloud-sync); `cold.ts` nie może być importowany przez `tenders-sync` (cykl cold→guard→tenders-sync) | `src/lib/tender-pipeline/tender-pipeline-representation.ts` — **leaf**, wyłącznie type-only importy | §A.5 (`hasLsIndexMarker`, `classifyPipelineRepresentation`, `PipelineIndexNotFullError`, `get/setPipelineFullAvailability`) | pipeline storage | T-INDEX-NEVER-FULL, `audit-import-cycles` (0 nowych cykli) | usunięcie pliku; revert preconditions (5 callerów) — FULL/IDB/LS/cloud bez migracji | brak (nowy marker nie jest zapisywany; klasyfikacja po istniejącym `_lsIndex`) |
Brak: nowego seamu, nowego klucza KV/LS, envelope w LS, generic storage-managera, zmian algorytmu write-safety/guard/merge/Edge (NEW-08 dodaje wyłącznie **preconditions** na wejściach). **NEW-07 = NOT REQUIRED** (ARCH REVIEW: `audit-import-cycles` PASS; NEW-08 jako leaf nie zmienia tego).

---

## 20. GATES (wejście IMPLEMENT per faza — z PLAN, niezmienione)
GATE 0 baseline exact · GATE 1 envelope durable (E/F/G, P-1/P-2) · GATE 2 INDEX contract (T-IDX, P-3 bytes) · GATE 3 dual-write ⊇ MAIN (A–I, P-4/P-5/P-8/P-9) · GATE 4A/4B readery · GATE 5 CSR proven (D, G, L, M, N) · GATE 6 one-writer (T-W-B, O, P) · GATE 7 budżet skalibrowany · GATE 8 macierz §17 · GATE 9 T-02F · GATE 10 PRODUCTION VERIFIED.

---

## 21. Otwarte pozycje (nie blokują Design Freeze)

| Pozycja | Typ | Domknięcie |
|---|---|---|
| Wartości NEW-06 WARN/BLOCK | PROVISIONAL | GATE 2 pomiar; > 1 MiB ⇒ OWNER DECISION REQUIRED |
| Cykl importów cold ↔ guard | ryzyko techniczne | `audit-import-cycles` w Phase 1; NEW-07 warunkowo |
| `fake-indexeddb` vs stub własny | preferencja | Owner opcjonalnie; default stub |
| U1/U6/U9 | UNKNOWN prod | Owner preflight przed Phase 10 |
| **Old client × INDEX LS — partial migration (§A.11)** | ryzyko rezydualne | **OWNER PREFLIGHT ITEM** przed flag ON (Phase 10): wszystkie urządzenia Ownera na wersji z amendmentem A |
| Progi P-1…P-9 po pierwszym pomiarze | LOCKED | przekroczenie ⇒ OWNER DECISION REQUIRED |
| Lokalizacja gate UI degraded (§A.7) — hook vs Provider | detal implementacyjny | IMPLEMENT Phase 4 (bez wpływu na kontrakt: gate musi być **przed** każdą mutacją) |
| ARCH REVIEW P1/P2/P3 (F-P1-*, F-P2-*, F-P3-*) | poza tym amendmentem | osobne domknięcia wg ARCH REVIEW; amendment A dotyczy wyłącznie F-P0-01 |

Nie wystąpił problem wymagający zmiany Owner Decision D1–D10 ani Confirmations #1–#3 (potwierdzone również dla Amendmentu A — §A.11).

---

## A. DESIGN FREEZE AMENDMENT — F-P0-01

> **Status:** **AMENDMENT A — LOCKED** (2026-09-17) · Owner: F-P0-01 = ACCEPTED · D1–D10 LOCKED · target architecture LOCKED (RAM FULL · IDB FULL durable · LS INDEX hot · CLOUD LEAN).  
> **Zakres:** wyłącznie granica semantyczna INDEX/FULL. Nie zmienia kształtu INDEX (21 pól + 3 projekcje + `_lsIndex`), envelope, flagi, budżetu, resetu ani cloud contract. **Dokumentacja only — brak kodu.**

### A.1 Finding (ARCH REVIEW F-P0-01, P0 — data loss / architecture unsafe)

Design Freeze v1.0 (§4.2 wiersz „INDEX + MISSING/CORRUPT”, §4.3 krok 2) przewidywał `mergeTenderPipelineForCloud(indexItems, cloud)`. Na MAIN `mergePipelineItem` (`src/lib/tenders-sync.ts`) przy równym `updatedAt` wybiera stronę **primary = local**; nested objects są łączone spread-em (`{...secondary, ...primary}` lub ekwiwalent per pole). Gdy local jest INDEX, jego projekcje `swzAnalysis` (7 pól), `tenderFit` (2), `awardResult` (2) **zastępują** pełne obiekty z cloud; pola spoza INDEX (`tenderDossier`, `bzpDocuments`, `notes`, `noticeHtml`, …) przechodzą z cloud, więc wynik **wygląda jak FULL** — i jako taki trafia do canonical writera → envelope OK (false VALID) → ACK → LS INDEX (seq nowy) → następny push seamem → cloud otrzymuje zubożone obiekty. Write-safety nie wykrywa (guard fields `id/updatedAt/ikFinalBid` nienaruszone). Strata cicha.

### A.2 Root cause (klasa problemu)

MAIN i Freeze v1.0 nie mają **pojęcia klasy reprezentacji**: `TenderPipelineItem` jest strukturalnie nadtypem INDEX (INDEX = `Pick` + projekcje), więc każda funkcja przyjmująca `TenderPipelineItem[]` akceptuje INDEX bez sygnału. Granica była zdefiniowana tylko **w writerze** (§3) i **w readerze** (§4.2), a nie na wejściach operacji FULL-required (merge, seam, import, restore, bootstrap, session-cache). Konsekwencja: dowolna ścieżka `LS → parse → merge → save` promuje INDEX do FULL. Problemem jest **granica semantyczna, nie istnienie projekcji** — projekcje pozostają.

Potwierdzone na MAIN wejścia, przez które wartość LS `kw-tenders-pipeline` (po IMPLEMENT: INDEX) wchodzi do merge/persist/push:

| # | Wejście MAIN | Ścieżka | Ryzyko F-P0-01 |
|---|---|---|---|
| E1 | `loadTendersPipeline()` (`tenders-bzp.ts`) | `loadTendersPipelineLocal()` → `mergeTenderPipelineForCloud(local, cloud)` → `finalizePipelineLoadWithIngestHydrate(…, persistAlways)` → `saveTendersPipelineLocal` | **główna** (§A.1) |
| E2 | `loadTendersPipeline()` catch path | `finalizePipelineLoadWithIngestHydrate(loadTendersPipelineLocal())` → przy `hydratedCount>0` save | INDEX → envelope |
| E3 | `fetchAndMergeDeferredBootstrap` (`cloud-sync.ts`) | `readLocalStorageDataKey(KEY)` → `mergeDataKey` → `persistBootstrapMergedKey` + `bootstrapMergedShouldPush` → seam | INDEX → envelope + cloud |
| E4 | `importBackup` (`App.tsx:1797-1798`) | `JSON.parse(localStorage.getItem(KEY))` → `mergeTenderDataKey(KEY, local, file)` → setItem → batch-set | INDEX → LS/cloud |
| E5 | `restoreAllDataFromCloud` (`App.tsx:2030-2035`) | `readLocalDataBundle()[KEY]` → `mergeDataKey` → setItem → `pushAllDataToCloud(merged)` | INDEX → LS/cloud |
| E6 | `prepareKeysForCloudPush` (`cloud-sync.ts:3589-3596`) / `prepareDataBundleForCloudPush` (`:2163-2175`) | `readLocalStorageDataKey(KEY)` → `mergeIncomingWithStored` → `mergeDataKey(stored=LS, incoming)` → push | INDEX merge do outgoing (gdy generic route aktywna: flagi cloud-lean OFF / `skipPipelineLeanIntercept`) |
| E7 | `mergeAllDataKeys` (CloudLoader R6) | LS bundle → `mergeDataKey(KEY, LS, null)` | wynik nieużywany dla pipeline — ryzyko 0, ale precondition nie może rzucać (loop core keys) |
| E8 | `hydratePipelineSessionCacheFromLocalStorage` (R2) | `readPipelineLocal()` → `cache.items` | INDEX w RAM cache → coalesce → save (§5 już usuwa odczyt LS — potwierdzone) |

Wspólny choke-point generyczny E3/E4/E5/E6/E7: `mergeDataKey(KEY) → mergeTenderDataKey → mergeTenderPipelineForCloud`. Wspólny choke-point dedykowany E1/E2: `loadTendersPipelineLocal()` zwracający INDEX jako `TenderPipelineItem[]`.

### A.3 Invarianty (LOCKED)

```text
PIPELINE-INDEX-01         INDEX IS NEVER FULL.
                          Obiekt niosący `_lsIndex` NIGDY nie jest traktowany jako FULL TenderPipelineItem.
                          INDEX NIE jest akceptowany jako źródło FULL przez: mergePipelineItem,
                          mergeTenderPipelineForCloud, saveTendersPipelineLocal, cloud push, backup export,
                          backup import, restore, deferred bootstrap, write-safety snapshot (jako body),
                          ani żadną inną operację FULL-required.

PIPELINE-FULL-SOURCE-01   Operacja wymagająca FULL pobiera FULL WYŁĄCZNIE z:
                          (1) RAM FULL (coldMem), (2) VALID IDB FULL (envelope OK / LEGACY_ARRAY),
                          (3) jawnie zwalidowanego zewnętrznego źródła FULL (§A.5.3).
                          LS INDEX sam NIGDY nie jest źródłem odzysku FULL.

PIPELINE-NO-CONVERSION-01 Brak implicit INDEX → FULL. Zakazane w szczególności:
                          INDEX → cast → merge → save → IDB envelope (lub ekwiwalent semantyczny,
                          w tym strip `_lsIndex` przed merge/seam).

PIPELINE-CLOUD-SAFETY-01  Projekcje INDEX NIGDY nie nadpisują FULL/LEAN w cloud.
                          Gdy lokalny FULL niedostępny: INDEX może zasilać degraded UI,
                          ale NIE może stać się źródłem cloud FULL/LEAN przez ścieżkę merge FULL.
```

### A.4 Granica semantyczna — klasy reprezentacji

| Klasa | Definicja | Marker | Może być stroną merge body? | Może być wejściem writera FULL? | Może iść do seamu? |
|---|---|---|---|---|---|
| **FULL** | `TenderPipelineItem[]` MAIN, bez stripu | brak `_lsIndex` na każdym item **+ provenance** ∈ {RAM, IDB VALID, zwalidowane zewnętrzne} | TAK | TAK | TAK |
| **LEGACY_FULL** | LS z pełnym body (pre-ARCH-02) | brak `_lsIndex`; `noticeHtml`/`rows` obecne | TAK (FULL-compatible) | TAK (migracja §8.1) | TAK |
| **LEGACY_LEAN** | FULL − `noticeHtml` − `kosztorys.rows` (+ `_coldRowsCount`) | brak `_lsIndex` | TAK (preserve-heavy; §8.2) | TAK (compat) | TAK (jak dziś) |
| **CLOUD_LEAN** | body z KV, `_cloudLean` markers | brak `_lsIndex` | TAK (strona cloud; omission ≠ deletion) | TAK jako FULL′ po recovery §A.5.3 | — (pochodzi z cloud) |
| **INDEX** | `TenderPipelineIndexItemV1[]` (§2.3) | **`_lsIndex.v === 1`** | **NIE** | **NIE** | **NIE** |

Zasady: (i) `_lsIndex` jest **wystarczający i jedyny** do identyfikacji INDEX; (ii) **nie wolno** wnioskować FULL z `Array.isArray(items)` ani z obecności pól wymaganych INDEX-u (INDEX je zawiera z definicji); (iii) klasyfikacja FULL wymaga **braku** `_lsIndex` **oraz** provenance (RAM/IDB/zwalidowane) — sam kształt nie wystarcza; (iv) klasa jest właściwością **kolekcji**: kolekcja mieszana (część items z `_lsIndex`) = `INDEX_INVALID`/`CORRUPT (index_mixed)` — nigdy FULL; (v) INDEX nie jest zapisywany do RAM `coldMem`, do envelope, do cloud, do pliku backupu.

Stany walidacyjne (LOCKED):

| Stan | Definicja | Użycie |
|---|---|---|
| `FULL_VALID` | brak `_lsIndex` ∧ VALIDATE §3.1 PASS ∧ provenance ∈ {RAM, IDB OK/LEGACY_ARRAY, zewnętrzne zwalidowane} | jedyne wejście FULL-required |
| `FULL_INVALID` | brak `_lsIndex` ∧ VALIDATE FAIL (id/duplikaty/nie-tablica) | odrzucenie writer (§3.1), telemetria |
| `INDEX_VALID` | ∀ items `_lsIndex.v===1` ∧ jeden `seq` | degraded UI, guard fields, id-set |
| `INDEX_INVALID` | mieszane `_lsIndex` ∨ różne `seq` ∨ item bez `id` | traktuj jak CORRUPT LS (§2.4 `index_mixed`) |
| `LEGACY_FULL` / `LEGACY_LEAN` | §2.4 | FULL-compatible (migracja §8) |
| `MISSING` | LS `null` / IDB brak rekordu | chain dalej |
| `CORRUPT` | parse fail / envelope CORRUPT (§1.3) | ignoruj, bez kasowania |
| `STALE` | INDEX `seq < envelope.localSeq` ∨ IDB freshness `STALE_*` (§1.4) | rebuild / merge **FULL** z cloud — nigdy z INDEX |

### A.5 FULL-source rules i NEW-08

#### A.5.1 NEW-08 — `tender-pipeline-representation.ts` (leaf; **nie implementować w tym etapie**)

```ts
// src/lib/tender-pipeline/tender-pipeline-representation.ts — ZERO value-importów (type-only)
export type PipelineRepresentation = "FULL" | "INDEX" | "INDEX_INVALID" | "EMPTY" | "NOT_ARRAY";
export function hasLsIndexMarker(items: unknown): boolean;                 // O(n) top-level: ∃ item obiekt ∧ "_lsIndex" in item
export function classifyPipelineRepresentation(items: unknown): PipelineRepresentation;
                                                                           // NOT_ARRAY | EMPTY | INDEX (∀ `_lsIndex.v===1`, 1 seq) | INDEX_INVALID (mieszane) | FULL (∀ brak `_lsIndex`) — FULL tu = kształt; provenance dokłada caller
export class PipelineIndexNotFullError extends Error { code: "PIPELINE_INDEX_NOT_FULL"; context: string }
export type PipelineFullAvailability = "UNKNOWN" | "FULL" | "DEGRADED_INDEX" | "EMPTY";
export function getPipelineFullAvailability(): PipelineFullAvailability;   // RAM, sync
export function setPipelineFullAvailability(next: PipelineFullAvailability, reason: string): void;  // wywołuje: cold.ts (hydrate), tenders-bzp.ts (loadTendersPipeline, writer), recovery §A.5.3
```

Uzasadnienie leaf: `tenders-sync.ts` musi importować guard, a `cold.ts → guard.ts → tenders-sync.ts` = cykl przy imporcie z `cold.ts`; leaf bez value-importów nie tworzy krawędzi (NEW-07 nadal NOT REQUIRED; potwierdzenie `audit-import-cycles` w Phase 1). Brak nowego markera zapisywanego do danych — klasyfikacja po istniejącym `_lsIndex` (NEW-02).

#### A.5.2 `resolvePipelineFullSource()` (rozszerzenie `cold.ts` / `tenders-bzp.ts`, nie nowy plik)

```ts
export async function resolvePipelineFullSource(): Promise<
  | { status: "FULL"; items: TenderPipelineItem[]; provenance: "RAM" | "IDB_OK" | "IDB_LEGACY_ARRAY" | "LS_LEGACY_FULL" | "LS_LEGACY_LEAN" }
  | { status: "NO_FULL"; index: TenderPipelineIndexItemV1[] | null; lsKind: PipelineLsKind; idbStatus: PipelineIdbReadStatus }
  | { status: "EMPTY" }>;
```
Kolejność (D8): RAM `coldMem` → `hydratePipelineColdFromIdb()` (OK/LEGACY_ARRAY) → LS **tylko** gdy `detectPipelineLsKind` ∈ {LEGACY_FULL, LEGACY_LEAN} → inaczej `NO_FULL` (z INDEX do degraded/id-set) lub `EMPTY`. **`loadTendersPipelineLocal()` (sync R1) zachowuje sygnaturę `TenderPipelineItem[]` dla UI**, ale każdy caller FULL-required (E1–E6) przechodzi na `resolvePipelineFullSource()`; R1 ustawia `setPipelineFullAvailability("DEGRADED_INDEX")` gdy zwraca INDEX.

#### A.5.3 Zewnętrzne źródło FULL — walidacja (jedyne dopuszczalne: cloud lean, plik backupu, cloud restore snapshot)

```text
acceptExternalFull(source, indexIds, deletedIds):
  1 classifyPipelineRepresentation(source) === "FULL"      // ∄ `_lsIndex` — INDEX/mieszane ⇒ REJECT (external_source_index)
  2 VALIDATE §3.1 (id, duplikaty)                          // FAIL ⇒ REJECT
  3 SUBSET: ids(INDEX_local) ⊆ ids(source) ∪ deletedIds    // FAIL ⇒ REJECT (index_ids_not_in_source:<n>, lista ≤ 50) — chroni id-y znane lokalnie
  4 PASS ⇒ FULL′ := source (NIENARUSZONE — bez merge z INDEX) → canonical writer(writer: "recovery.cloud_lean" | "import" | "restore")
```
Brak lokalnego INDEX (LS MISSING/EMPTY/CORRUPT) ⇒ krok 3 trywialnie PASS. FULL′ z cloud lean ma `_cloudLean` markers (omission ≠ deletion, Track B) — zgodne z §8.2 „FULL w sensie kontraktu”. Recovery **nigdy** nie wykonuje push do cloud (jest lokalne); kolejny normalny zapis użytkownika przechodzi zwykłą trasą seam + write-safety.

### A.6 Reguły kontraktowe A–H (wymagane przez Ownera)

| # | Wymaganie | Zamrożony kontrakt | Gdzie (IMPLEMENT) |
|---|---|---|---|
| **A** | INDEX = odrębna klasa | `TenderPipelineIndexItemV1` (NEW-02) **nie** jest przypisywalny do parametrów FULL-required przez konwencję + runtime `hasLsIndexMarker` (NEW-08); §A.4 | `representation.ts`, JSDoc na sygnaturach FULL-required |
| **B** | funkcje FULL-required odrzucają INDEX | precondition `hasLsIndexMarker(items)` ⇒ `PipelineIndexNotFullError` **lub** wykluczenie strony (tylko merge — §A.6.3) | `saveTendersPipelineLocal` (§3.1 reason `index_not_full`), `pushTenderPipelineToCloud`, `setPipelineColdMemory`, `resetTendersPipeline` (n/a — `[]`), `collectLocalBackupData` |
| **C** | merge nie przyjmuje INDEX jako normalnego `TenderPipelineItem` | **§A.6.3** | `mergeTenderPipelineForCloud` (wejście; `mergePipelineItem` bez zmian — nigdy nie widzi INDEX) |
| **D** | writer nie persistuje INDEX jako FULL | §3.1: `index_not_full` ⇒ brak RAM/IDB/LS, telemetria; envelope **nigdy** nie zawiera `_lsIndex` — parser §1.3 dodatkowo: item z `_lsIndex` ⇒ CORRUPT `item_index_marker` (backstop na odczycie) | `tenders-bzp.ts`, `cold.ts` |
| **E** | seam nie otrzymuje INDEX-derived FULL | `pushTenderPipelineToCloud(items)`: precondition przed write-safety ⇒ throw `PipelineIndexNotFullError` (pre-write, bez latch, bez zmian write-safety). Generic route (`pushKeysToCloud`/`pushAllDataToCloud`): `mergeIncomingWithStored` z `stored` = INDEX ⇒ §A.6.3 (INDEX wykluczony ⇒ outgoing = incoming FULL bez zmian) | `cloud-push.ts`, `tenders-sync.ts` |
| **F** | backup nie eksportuje INDEX jako FULL | §9 krok 2 = `resolvePipelineFullSource().status === "FULL"`; `NO_FULL` ⇒ klucz pominięty + INCOMPLETE (Owner #3) | `App.tsx`, `weekly-backup-email.ts` |
| **G** | restore nie promuje INDEX do FULL | local side = `resolvePipelineFullSource()`; `NO_FULL` ⇒ cloud snapshot przez `acceptExternalFull` (§A.5.3) — REJECT ⇒ klucz pipeline pominięty w restore (inne klucze bez zmian) + alert | `App.tsx` F |
| **H** | deferred bootstrap nie promuje INDEX | local side = `coldMem` ∨ LS LEGACY_*; INDEX ∧ coldMem null ⇒ **skip klucza** przed `mergeDataKey` (bez merge, persist, push) + `bootstrap_pipeline_skipped_no_full`; FULL odzyskiwany przez `loadTendersPipeline` (§A.5.3), nie przez bootstrap | `cloud-sync.ts` R9 |

#### A.6.1 Availability gate (upstream, pierwsza linia)
`getPipelineFullAvailability()` ∈ {`UNKNOWN`, `DEGRADED_INDEX`} ⇒ **żadna** operacja FULL-required nie startuje: `updateItem`/`saveTendersPipeline`/coalesce (`useTendersPipeline`), `persistKey(TENDERS_PIPELINE_KEY)`, import/restore/backup pipeline, bootstrap pipeline. UI pokazuje jawny stan read-only (copy PL: „Tylko odczyt — brak pełnych danych lokalnych; trwa odzyskiwanie z chmury”). `FULL`/`EMPTY` ⇒ normalna praca. Backstop (druga linia) = preconditions §A.6 B/E oraz §3.1.

#### A.6.2 `finalizePipelineLoadWithIngestHydrate` (`tenders-bzp.ts:707`)
Precondition: wejście FULL (`!hasLsIndexMarker(items)`); INDEX ⇒ **return items bez hydracji ingest i bez save** (INGEST-01 bez zmian; hydracja artefaktów do INDEX byłaby konwersją). Dotyczy E1 i E2 (catch path).

#### A.6.3 Merge contract (`mergeTenderPipelineForCloud`, `mergeDataKey`, `mergeTenderDataKey`)
```text
mergeTenderPipelineForCloud(local, cloud, deletedIds):
  PRE  localClass  = classifyPipelineRepresentation(local)
       cloudClass  = classifyPipelineRepresentation(cloud)
  IF localClass ∈ {INDEX, INDEX_INVALID}:
       local := []                       // strona INDEX NIE jest uczestnikiem merge body
       telemetry merge_index_side_excluded:{side:"local", count}
  IF cloudClass ∈ {INDEX, INDEX_INVALID}:  // nie powinno wystąpić (cloud nigdy nie dostaje INDEX)
       cloud := cloud.filter(item bez `_lsIndex`)   // item z markerem = CORRUPT, wykluczony
       telemetry merge_index_side_excluded:{side:"cloud", count} (critical)
  THEN istniejący algorytm (mergePipelineItem, LWW, preserve-heavy, tombstones) — BEZ ZMIAN
```
Semantyka „use FULL side”: gdy jedna strona INDEX, wynik = druga strona (FULL/LEAN/CLOUD_LEAN) nienaruszona; id-y istniejące tylko w INDEX **nie są emitowane** (nie ma dla nich FULL) — dlatego callery FULL-required **nie mogą** persistować wyniku merge, jeżeli local był INDEX, bez spełnienia SUBSET (§A.5.3); w praktyce callery E1–E6 po amendmencie **nie przekazują INDEX** do merge (gate §A.6.1 + R9 skip), a precondition w merge jest backstopem, który: (a) nie rzuca (bezpieczny dla pętli `mergeAllDataKeys`/bootstrap), (b) nie produkuje „FULL z projekcji”. `mergeDataKey`/`mergeTenderDataKey` — bez zmian (delegują). `mergePipelineItem` — bez zmian; **zakaz**: `{...secondary, ...primary}` z primary INDEX nigdy nie zachodzi, bo INDEX nie dociera do tej funkcji.

#### A.6.4 Writer — patrz §3.1 (reason `index_not_full`, RAM nieaktualizowany).
#### A.6.5 Seam — patrz §A.6 E. Write-safety (`evaluatePipelineSnapshotWriteSafety` i kody `PIPELINE_*_BLOCKED`) **bez zmian** (§6 zachowane): INDEX może nadal służyć jako **snapshot guard fields** do verdictu (test Q), ale nie jako body.

### A.7 Degraded mode — przypadki zamrożone

| CASE | LS | IDB | FULL źródło | INDEX rola | Merge | Zapis FULL | Cloud | UI |
|---|---|---|---|---|---|---|---|---|
| 1 | INDEX | VALID FULL (OK / LEGACY_ARRAY) | IDB → RAM | hot/index only; STALE seq ⇒ rebuild LS przez writer | FULL ↔ cloud (normalnie) | TAK (FULL) | normalnie (seam + write-safety) | pełne |
| 2 | INDEX | MISSING | brak → `DEGRADED_INDEX` | degraded/read-only UI + id-set | **BLOKADA** merge z INDEX; recovery §A.5.3 z cloud lean (subset PASS ⇒ FULL′ → writer → ACK → `FULL`) | **NIE** dopóki brak FULL′; nigdy save-as-FULL z INDEX | **brak push** z INDEX; recovery lokalne | read-only + komunikat; po recovery pełne |
| 3 | INDEX | CORRUPT | brak → `DEGRADED_INDEX` | jak 2 | **zakaz** INDEX→FULL; envelope CORRUPT ignorowany, **nie kasowany**; recovery §A.5.3 | jak 2 (nowy envelope po recovery nadpisuje CORRUPT — jedyna dozwolona forma „naprawy”) | jak 2 | jak 2 |
| 4 | INDEX | STALE (`STALE_*` §1.4) | IDB FULL (**nie odrzucany**) → RAM | hot/index only | FULL(IDB) ↔ cloud lean wg §1.4 (istniejący kontrakt stale) | TAK (FULL merged) | normalnie | pełne |
| 5 | INDEX | brak hydracji (sync, coldMem null) | `UNKNOWN` | tymczasowe UI | żaden merge FULL-required nie startuje | NIE | NIE | read-only do `loadTendersPipeline` |
| 6 | INDEX | MISSING/CORRUPT ∧ cloud niedostępny | brak | degraded/read-only | brak | NIE | NIE (seam i tak BLOCK `CLOUD_READ_FAILED`) | read-only, jawny komunikat, retry przy następnym `loadTendersPipeline` |
| 7 | INDEX | MISSING ∧ subset FAIL (`index_ids_not_in_cloud`) | brak | degraded | brak | NIE | NIE | read-only + komunikat critical dla Ownera (id-y lokalne bez FULL nigdzie) |

Wspólne: brak `removeItem`/`idbRemove`; INDEX w LS **pozostaje** (nie nadpisywany pustką ani LEAN z INDEX); heavy klasy B po recovery z cloud lean = utracone lokalnie — **raportowane** (`heavy_not_durable`), nie ukrywane.

### A.8 Backup / import / restore / bootstrap — sekwencje amendowane

1. **Import (§11 C, E4):** `local = await resolvePipelineFullSource()`; `file = data[KEY]` → `acceptExternalFull(file, indexIds(local.NO_FULL ? local.index : []), deletedIds)`; REJECT ⇒ `delete data[KEY]` + alert „pipeline pominięty” (inne klucze importowane jak dziś); PASS ∧ local FULL ⇒ `merged = mergeTenderDataKey(KEY, local.items, file)`; PASS ∧ NO_FULL ⇒ `merged = file` (bez merge z INDEX); → `saveTendersPipelineLocal(merged)`; `batch-set` cloud jak dziś (seam route, write-safety).
2. **Restore-all (§11 F, E5):** local side = `resolvePipelineFullSource()`; `cloudValues[KEY]` → jak import (cloud snapshot = zewnętrzne źródło); `localBundle[KEY]` (LS) **nieużywany** dla pipeline; `pushAllDataToCloud(merged)` → `prepareDataBundleForCloudPush` → `mergeIncomingWithStored(stored=LS INDEX?, incoming=FULL)` ⇒ §A.6.3 wyklucza INDEX ⇒ outgoing = FULL.
3. **Export (§9):** bez zmian poza A.6 F.
4. **Deferred bootstrap (§11 B, E3):** przed `mergeDataKey(KEY, …)`: `local = getPipelineColdMemory() ?? (lsKind ∈ LEGACY_* ? LS : null)`; `null` ⇒ `continue` (klucz pominięty: brak merge/persist/push) + telemetria; `bootstrapMergedShouldPush` nie jest ewaluowany dla pominiętego klucza.
5. **CloudLoader R6 (E7):** bez zmian kodu; §A.6.3 gwarantuje brak throw i brak „FULL z INDEX” (wynik nieużywany, test potwierdza).
6. **Session-cache R2 (E8):** §5 (brak odczytu LS body) — bez zmian względem v1.0; dodatkowo `patchPipelineSessionCache` otrzymuje items wyłącznie od callerów FULL (gate §A.6.1).

### A.9 Test contract — **T-INDEX-NEVER-FULL** (LOCKED; harness §15 + NEW-05 IDB stub + stub cloud)

| # | Scenariusz | Setup | Oczekiwane |
|---|---|---|---|
| 1 | LS INDEX + IDB MISSING | INDEX seq 7 (505 poz.), IDB pusty, cloud lean 505, flag ON | `resolvePipelineFullSource` = NO_FULL; availability DEGRADED_INDEX; recovery: subset PASS ⇒ envelope = **cloud lean nienaruszony** (0 pól z INDEX-projekcji różnych od cloud); INDEX odbudowany po ACK; **0 push** |
| 2 | LS INDEX + IDB VALID | INDEX seq 7, envelope seq 7 z rows/snapshot | FULL z IDB; merge FULL↔cloud; INDEX nie w merge (`merge_index_side_excluded` = 0 wywołań); rows/snapshot zachowane |
| 3 | LS INDEX + IDB CORRUPT | envelope `itemCount≠length` | jak #1; envelope CORRUPT nie kasowany przed recovery; po recovery nowy envelope OK |
| 4 | LS INDEX + IDB STALE | envelope rev 290, guard rev 291, brakujący id z guard | FULL(IDB) użyty (nie odrzucony); merge FULL↔cloud; wynik zawiera pełne `swzAnalysis`/`tenderFit`/`awardResult` z IDB/cloud, **nie** 7/2/2-polowe projekcje |
| 5 | deferred bootstrap, coldMem = null | LS INDEX, cloud lean dostępny, flagi bootstrap persist ON | klucz pipeline pominięty; `persistBootstrapMergedKey` **nie wywołany** dla KEY; seam **nie wywołany**; telemetria `bootstrap_pipeline_skipped_no_full`; inne klucze bootstrap normalnie |
| 6 | `loadTendersPipeline` cloud merge | LS INDEX + IDB MISSING + cloud lean z pełnym `swzAnalysis` (≥ 12 pól) | wynik dla UI = cloud lean; **żaden** item w envelope nie ma `swzAnalysis` ⊂ 7 pól INDEX gdy cloud miał więcej; `mergeTenderPipelineForCloud` nie dostał INDEX jako `local` **lub** wykluczył go (asercja telemetrii) |
| 7 | backup import z INDEX local | LS INDEX, IDB MISSING, plik FULL 505 | `merged === file` (deep-equal); envelope = file; 0 raw setItem; plik z `_lsIndex` ⇒ klucz odrzucony + alert |
| 8 | restore-all z INDEX local | LS INDEX, IDB MISSING, cloud snapshot FULL/LEAN | pipeline merged = snapshot (bez INDEX); `pushAllDataToCloud` outgoing pipeline deep-equal snapshot (INDEX wykluczony w `prepareDataBundleForCloudPush`) |
| 9 | cloud unavailable + INDEX local | `fetchKeysFromCloud` throw; LS INDEX; IDB MISSING | availability DEGRADED_INDEX; UI items = INDEX (read-only); 0 zapisów IDB; 0 setItem; seam nie wywołany (a gdyby — BLOCK `CLOUD_READ_FAILED`) |
| 10 | user save przy samym INDEX | jak #9; wywołaj `updateItem`/`saveTendersPipeline` z hooka oraz bezpośrednio `saveTendersPipelineLocal(INDEX)` i `pushTenderPipelineToCloud(INDEX)` | hook: mutacja nie startuje + stan read-only; writer: `writer_validation_failed:index_not_full`, coldMem **null pozostaje**, 0 IDB/LS write; seam: `PipelineIndexNotFullError` **przed** write-safety; cloud stub bez zapisów |

**Oracle (dla każdego #):** (a) INDEX nigdy nie staje się FULL — ∄ envelope/coldMem/cloud/plik z item posiadającym `_lsIndex` ∨ z projekcją zastępującą pełny obiekt; (b) IDB FULL nigdy nie nadpisany przez INDEX — po scenariuszu envelope ≡ stan początkowy **albo** ≡ zwalidowane zewnętrzne FULL′; (c) cloud stub: liczba zapisów = 0 dla #1,#3,#5,#6,#9,#10; dla #7/#8 outgoing deep-equal zwalidowanemu FULL; (d) brak false VALID envelope — `parsePipelineIdbEnvelope` po scenariuszu: OK ⇒ items bez `_lsIndex`; (e) brak cichej straty — każdy brak FULL ma telemetrię critical (`index_without_full`, `index_ids_not_in_cloud`, `bootstrap_pipeline_skipped_no_full`, `writer_validation_failed:index_not_full`); (f) degraded explicit — `getPipelineFullAvailability()==="DEGRADED_INDEX"` ∧ UI read-only flag. **Najsilniejsza asercja:** `INDEX(local) ∧ ¬FULL_VALID` ⇒ po dowolnej operacji **FULL durable pozostaje nieobecny** (nie zastąpiony INDEX) ∧ **cloud niezmieniony**.

Faza: guard leaf + testy jednostkowe Phase 1; integracje z fazą właściwą (4 readery, 5 CSR, 6 one-writer, 8 macierz). GATE 5 (CSR proven) rozszerzony o T-INDEX-NEVER-FULL #1–#6; GATE 6 o #7–#8, #10; GATE 4 o #9. Manifest `test-infra/test-manifest.json` scope tenders.

### A.10 Telemetria (additive; REUSE `recordStorageWrite`, bez nowego typu)
`merge_index_side_excluded:<side>:<n>` (writer `tenders-sync.merge`, tier 3) · `bootstrap_pipeline_skipped_no_full` (`cloud-sync.bootstrap`, tier 3) · `writer_validation_failed:index_not_full` (§16 LS write) · `index_ids_not_in_cloud:<n>` / `index_ids_not_in_source:<n>` (`recovery`, tier 3, critical) · `external_source_index` / `import_pipeline_rejected:index_payload` (`backup.import` / `restore`) · `seam_rejected:index_not_full` (`tender-pipeline.cloud-push`) · `full_availability:<state>:<reason>` (`tenders-bzp.loadTendersPipeline`). Ring buffer `kind` bez zmian.

### A.11 Migration / rollback / compat implications

| Aspekt | Implikacja |
|---|---|
| Migracja §8.1/§8.2 | **bez zmian** — LEGACY_FULL/LEGACY_LEAN są FULL-compatible (§A.4); INDEX nigdy nie jest wejściem migracji |
| Migracja INDEX_WITHOUT_FULL (§4.3) | zmieniona: recovery = `acceptExternalFull(cloudLean)` zamiast `merge(INDEX, cloud)`; wymaga subset PASS — inaczej DEGRADED (Owner widzi critical) |
| Envelope v1 | bez zmiany schematu; parser dodaje CORRUPT `item_index_marker` (backstop) — additive |
| INDEX shape (NEW-02) | **bez zmian** — 21 pól + 3 projekcje + `_lsIndex`; projekcje pozostają (problemem była granica, nie ich istnienie) |
| Flag OFF (compat) | INDEX nie jest produkowany; klasa LEGACY_LEAN → wszystkie preconditions PASS ⇒ **Phase 3 ⊇ MAIN zachowane** |
| Rollback ON→OFF | jak §13; dodatkowo: INDEX w LS do czasu nadpisania LEAN jest dla nowego klienta klasą INDEX (chain IDB → RAM), dla old clienta tablicą body (degraded) — bez promocji |
| Old client × INDEX LS (§17) | old client **nie zna** granicy: przy `coldMem null` (envelope ignorowany) czyta INDEX jako body, może wykonać `merge(INDEX, cloud)` **starym kodem** i pushnąć — **ryzyko rezydualne partial-migration**, mitygacja: write-safety old client (guard fields OK) nie wykryje; dlatego ON w Phase 10 dopiero po potwierdzeniu, że wszystkie urządzenia Ownera są na wersji z amendmentem (preflight) — **OWNER PREFLIGHT ITEM** (dopisane do §21 U-list) |
| NEW-08 rollback | usunięcie leaf + 5 preconditions; brak migracji danych (marker nie zapisywany) |
| Owner Decisions D1–D10 | **bez zmian**; Confirmations #1–#3 bez zmian; target architecture bez zmian |
| 02F | brak kodu/importów; `estimateJsonBytesFast` nie używany |
| NEW-07 | NOT REQUIRED (bez zmian) |

### A.12 Gate amendmentu

```text
AMENDMENT                   = COMPLETE
F-P0-01                     = CLOSED (na poziomie Design Freeze; weryfikacja = RE-RUN ARCH REVIEW)
PIPELINE-INDEX-01           = LOCKED
PIPELINE-FULL-SOURCE-01     = LOCKED
PIPELINE-NO-CONVERSION-01   = LOCKED
PIPELINE-CLOUD-SAFETY-01    = LOCKED
TEST_T-INDEX-NEVER-FULL     = DEFINED
NEW-08                      = DOCUMENTED (nie implementowany)
NEW-07                      = NOT REQUIRED
```

---

## 22. FINAL GATE (historyczny — pre-IMPLEMENT)

```text
DESIGN_FREEZE        = AMENDED (v1.1 — F-P0-01)
ADR_FINAL            = COMPLETE
PLAN                 = COMPLETE
OWNER_DECISIONS      = LOCKED
TARGET_ARCHITECTURE  = LOCKED
DESIGN               = LOCKED

IMPLEMENTATION       = NO
COMMIT               = NO
PUSH                 = NO
PROD_MUTATION        = NO

NEXT                 = RE-RUN ARCH REVIEW (nie automatycznie)
```

---

## 23. CLOSEOUT — PRODUCTION VERIFIED (Phase 22 · documentation only)

> Amendment A (§A) i invarianty PIPELINE-* **pozostają LOCKED**. Historyczny §22 = stan sprzed IMPLEMENT. Brak zmian runtime w Phase 22.

| Pole | Wartość |
|---|---|
| **DF status** | **FROZEN · IMPLEMENTED · PRODUCTION VERIFIED** |
| **Release** | **2.66.231** / **`16bfb9f3`** |
| **Authority** | IDB FULL (local durable) · LS INDEX (hot) · Cloud LEAN (cross-device) |
| **INDEX** | NEVER FULL · NEVER Cloud · NO implicit conversion |
| **Flag / min (prod)** | `pipelineLocalIndexV1=true` · `pipelineLocalIndexMinAppVersion=2.66.231` |
| **Phase 21** | COMPLETE · P20-P3-03 **CLOSED** |
| **Downgrade** | **UNSUPPORTED** after INDEX rollout |
| **Rollback** | flag `false` only (IDB FULL preserved) |
| **Ingest** | OUT OF SCOPE |
| **Epic** | [`STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-EPIC-CLOSEOUT.md) |

```text
DESIGN_FREEZE_CLOSEOUT = COMPLETE
AMENDMENT_A            = PRESERVED
INVARIANTS             = LOCKED
IMPLEMENTATION         = COMPLETE
PRODUCTION_ROLLOUT     = PASS
RUNTIME_CHANGE_P22     = NO
PROD_MUTATION_P22      = NO
EPIC                   = CLOSED
```
