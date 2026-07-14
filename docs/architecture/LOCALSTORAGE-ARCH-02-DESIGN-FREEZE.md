# LOCALSTORAGE-ARCH-02 — Storage Manager · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0 — PROPOSED** · **IMPLEMENT BLOCKED**  
> **Data freeze:** 2026-07-14  
> **Program ID:** **LOCALSTORAGE-ARCH-02**  
> **Class:** **PLATFORM / CORE persistence** (nie Payroll hotfix)  
> **Poprzednik:** LOCALSTORAGE-QUOTA-P1 (AUDIT) · PAYROLL-P0-FIX-01 (Quota ≠ bootstrap FAILED)  
> **STABILIZATION WINDOW:** ACTIVE — wymaga **Owner GO** przed IMPLEMENT  
> **Zakaz w tym epicu:** zmiana logiki Payroll / CloudLoader gate / Cloud Sync merge / Edge Functions

```text
WORKFLOW:
  AUDIT (QUOTA-P1) ✅ → DESIGN FREEZE v1.0 ✅ (ten plik)
  → ARCHITECTURE REVIEW ⏸
  → OWNER GO ⏸
  → IMPLEMENT (etapy A→E) ⏸

Root (CONFIRMED, QUOTA-P1):
  localStorage używany jako drugi pełny datastore
  + duplikaty snapshot (bundle×2, jobs×12)
  + full-array writes (pipeline)
  → QuotaExceeded na ostatnich pisarzach (pipeline / WM)
  Payroll FIX-01 tylko oddzielił bootstrap SUCCESS od storage failure.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | Docelowa warstwa persistence: StorageManager + budżet + telemetria + Tier 1/2/3 |
| **Cel** | Nigdy nie przekroczyć limitu Tier1; zero `QuotaExceededError` w UX |
| **SSOT cloud** | Supabase KV / Storage — **bez zmian modelu merge** |
| **SSOT local Tier1** | `StorageManager` (jeden writer LS) |
| **SSOT local Tier2** | IndexedDB via StorageManager |
| **Tier3** | pamięć procesu (module / React) |
| **Nowe pole KV** | **Brak** (migration lokalna; cloud payload shape może być lean w osobnym briefie) |
| **Zmiana Edge** | **Zakaz** |
| **Payroll** | **Zakaz** logiki; klucze payroll = Tier1 CRITICAL (tylko facade writer) |
| **CloudLoader / cloud-sync** | **Zakaz** zmian gate/merge w tym epicu; migracja `setItem` → facade **osobnym** Owner GO / etapem F |
| **Principles** | **#LSA-001…016** (§2) |
| **Owner GO** | **Path Platform CORE** — przed IMPLEMENT A0 |

---

## 1. AUDIT (skrót wejściowy — CLOSED jako założenie)

### 1.1 Problem

Po PAYROLL-P0-FIX-01 Lista Płac nie pada na `QuotaExceeded`. Production nadal zgłasza `QuotaExceededError` dla:

- `kw-tenders-pipeline`
- `kw-wm-print-templates`

To **objaw pełnego bunkra ~5 MB**, nie wyłącznie wina tych dwóch kluczy.

### 1.2 Root causes (uszeregowanie)

| P | Przyczyna | Dowód w kodzie |
|---|-----------|----------------|
| 1 | **Full domain mirror** `kw-local-snapshot-bundle` + `-prev` | `local-data-backup.ts` · przed `runCloudSync` |
| 2 | **N× jobs** `kw-jobs-local-snaps` (max 12) + `kw-jobs-last-good` | `jobs-safety.ts` |
| 3 | **Full-array pipeline** + ciężkie pola (`noticeHtml`, dossier ≤500) | `saveTendersPipelineLocal` |
| 4 | **Wielu bezpośrednich `setItem`** poza budgetem | ≥50 plików `src/` |
| 5 | Double-write WM (`useLocalStorage` + `persistWmPrintLocal`) | `wm-print-sync.ts` |

### 1.3 Inwentaryzacja writerów (stan repo 2026-07-14)

| Metryka | Wartość |
|---------|---------|
| Pliki z `localStorage.setItem` | **~48** |
| Istniejący bezpieczny kontrakt | `safeSetLocalStorageJson` / `Raw` / `persistBootstrapMergedKey` (`cloud-sync.ts`) |
| Centralny StorageManager | **Brak** |
| Globalny budget | **Brak** |
| Telemetria | Częściowa: pipeline `wgdom-pipeline-ls` · nie globalna |

### 1.4 Zakres NIE audytowany ponownie

Payroll merge / display / `pullFromCloudAndMerge` — **CLOSED** (PAYROLL-P0).

---

## 2. Principles (#LSA-001…016)

| ID | Zasada |
|----|--------|
| **#LSA-001** | **ONE STORAGE WRITER** — biznes nie woła `localStorage.setItem` |
| **#LSA-002** | **SSOT FIRST** — KV/Storage chmura bez zmiany semantyki merge |
| **#LSA-003** | **REUSE FIRST** — StorageManager owija `safeSetLocalStorage*`; nie duplikuje catch |
| **#LSA-004** | **ZERO DUPLICATE LOGIC** — budget/telemetria w jednym module |
| **#LSA-005** | **NO DIRECT setItem** — wyjątek tymczasowy: tylko implementacja StorageManager + (do etapu F) cloud-sync facade |
| **#LSA-006** | **NO DUPLICATED SNAPSHOTS** — zakaz N kopii pełnych `jobs[]` / pełnego `DATA_KEYS` w LS |
| **#LSA-007** | **NO FULL DOMAIN MIRROR** — zakaz `kw-local-snapshot-bundle*` w Tier1 |
| **#LSA-008** | **TIER CLASSIFICATION** — każdy klucz ma klasę + tier docelowy |
| **#LSA-009** | **BUDGET BEFORE WRITE** — estimate → check → persist \| fallback IDB \| deny+telemetry |
| **#LSA-010** | **NEVER SURFACE QuotaExceeded** — catch wewnątrz managera; UX = soft fail / IDB |
| **#LSA-011** | **PAYROLL FREEZE** — brak zmian logiki Payroll w tym epicu |
| **#LSA-012** | **LOADER/SYNC FREEZE** — CloudLoader gate + merge SSOT bez zmian w A–E |
| **#LSA-013** | **EDGE FREEZE** — brak zmian Edge Functions |
| **#LSA-014** | **LEAN HOT PATH** — heavy fields → Tier3 memory / Tier2 IDB, nie LS |
| **#LSA-015** | **MIGRATE IN STAGES A→E** — mierzalne redukcje bytes; bez big-bang |
| **#LSA-016** | **TELEMETRY ALWAYS ON (diag)** — `__WG_STORAGE__` do closeout epicu |

---

## 3. Architecture — StorageManager

### 3.1 Pozycja w systemie

```text
  UI / hooks / domain modules
           │
           ▼
   ┌───────────────────┐
   │  StorageManager   │  ← JEDYNY publiczny API lokalnego zapisu
   │  .save / .load    │
   │  .remove / .estimate
   └─────────┬─────────┘
             │
     ┌───────┼───────────┐
     ▼       ▼           ▼
  Budget   Classifier  Telemetry
     │       │
     ▼       ▼
  Tier1 LS  Tier2 IDB  Tier3 Memory (optional handle)
```

**Cloud sync:** nadal czyta/pisze dane domenowe; **ścieżka LS** docelowo tylko przez StorageManager (etap F — poza A–E, osobne GO).

### 3.2 Public API (design)

```ts
// src/lib/storage/storage-manager.ts  (PROPOSED)

type StorageClass = "CRITICAL" | "CACHE" | "ARCHIVE" | "TEMP" | "SYNC";
type StorageTier = 1 | 2 | 3;

interface StorageSaveOptions {
  class?: StorageClass;       // override registry
  writer?: string;            // caller id for telemetry
  allowFallbackIdb?: boolean; // default true for non-CRITICAL
  raw?: boolean;              // string bez JSON.stringify
}

interface StorageSaveResult {
  ok: boolean;
  tier: StorageTier;
  bytes: number;
  budgetState: "ok" | "warning" | "critical" | "denied" | "fallback_idb";
  storageFailure: boolean;    // Quota caught internally
  errorName?: string;
}

declare const StorageManager: {
  save(key: string, value: unknown, opts?: StorageSaveOptions): Promise<StorageSaveResult>;
  saveSync(key: string, value: unknown, opts?: StorageSaveOptions): StorageSaveResult; // Tier1 only
  load<T>(key: string): Promise<T | null>;
  loadSync<T>(key: string): T | null; // Tier1 (+ legacy LS read during migration)
  remove(key: string): Promise<void>;
  estimateJsonBytes(value: unknown): number;
  getTier(key: string): StorageTier;
  getClass(key: string): StorageClass;
};
```

### 3.3 Zachowanie `save`

```text
1. Resolve class + tier from Key Registry (#LSA-008)
2. bytes = estimate(value)
3. If tier === 3 → MemoryStore.set; return ok (no LS)
4. If tier === 2 → IdbStore.put; return ok
5. If tier === 1:
     a. BudgetManager.canAccept(key, bytes)
     b. if DENIED + allowFallbackIdb → write Tier2 + mark shadow; telemetry
     c. if DENIED + CRITICAL → log critical; try strip/evict CACHE/TEMP; retry once
     d. persist via internal safeSet (reuse safeSetLocalStorageJson)
     e. NEVER rethrow QuotaExceeded
6. Telemetry.recordWrite(...)
```

### 3.4 Relacja do istniejącego kodu (#LSA-003)

| Istniejące | Rola po freeze |
|------------|----------------|
| `safeSetLocalStorageJson/Raw` | **Implementation detail** StorageManager Tier1 (private albo thin re-export) |
| `persistBootstrapMergedKey` | Woła `StorageManager.save` (etap F) — do A–E **nietykane** |
| `persistKey` | Cloud push + LS → LS część → StorageManager (etap F) |
| `useLocalStorage` | Jedyny React hook path → `StorageManager.saveSync` |

### 3.5 Zakaz

```text
❌ localStorage.setItem w modułach biznesowych
❌ drugi BudgetManager
❌ osobne „try/catch quota” poza StorageManager (po migracji pliku)
❌ zapis pełnego DATA_KEYS do jednego klucza LS
```

---

## 4. Budget manager design

### 4.1 Stałe

```ts
const STORAGE_WARNING  = 1.2 * 1024 * 1024; // 1.2 MB
const STORAGE_CRITICAL = 1.4 * 1024 * 1024; // 1.4 MB
const STORAGE_LIMIT    = 1.5 * 1024 * 1024; // 1.5 MB  — Tier1 ceiling
```

Uwaga: limit przeglądarki (~5 MB) ≠ Tier1 budget. Tier1 **świadomie** trzymamy ≪ browser quota, żeby Tier2/legacy migration miały przestrzeń awaryjną.

### 4.2 Algorytm

```text
total = sum(bytes of all Tier1 keys currently in LS)
projected = total - oldKeyBytes + newBytes

if projected <= WARNING  → OK
if projected <= CRITICAL → OK + warn telemetry
if projected <= LIMIT    → OK + critical telemetry
if projected > LIMIT     →
    if class in (CACHE, TEMP) → DENY (drop write or Tier3)
    if class ARCHIVE/SYNC     → FALLBACK IDB
    if class CRITICAL         → EVACUATE (delete CACHE/TEMP keys) → retry
                                if still > LIMIT → FALLBACK IDB shadow + fail-loud console
```

### 4.3 Estimate

- Prefer `new Blob([JSON.stringify(value)]).size` (jak pipeline telemetry).
- Fallback: `length * 2` dla UTF-16 approximation.
- Cache size map in-memory; invalidate on save/remove.

### 4.4 Evacuation order (CRITICAL pressure)

1. `TEMP` keys  
2. `CACHE` keys  
3. Non-registry `wg-*` diagnostics  
4. **Nigdy** evacuate: payroll current, auth, app-settings, weekFrom/To  

---

## 5. Telemetry design

### 5.1 Global

```ts
window.__WG_STORAGE__ = {
  enable(): void;
  disable(): void;
  report(): string;           // human dump
  largest(n?: number): Array<{ key: string; bytes: number; class: string; tier: number }>;
  budget(): { total: number; warning: number; critical: number; limit: number; state: string };
  writers(): Array<{ writer: string; count: number; lastAt: string; lastKey: string }>;
  history(): Array<StorageWriteEvent>; // ring ≤ 500
  classification(): Record<string, { class: string; tier: number }>;
};
```

### 5.2 Event

```ts
type StorageWriteEvent = {
  t: number;
  key: string;
  bytes: number;
  writer: string;
  tier: number;
  class: string;
  budgetState: string;
  ok: boolean;
};
```

### 5.3 Zasady telemetrii

- Auto-enable w build diag / session flag (jak payroll boot path).  
- Telemetria **nie** zapisuje dużych payloadów do LS (ring w pamięci; opcjonalnie mały ring IDB).  
- Pipeline-specific `wgdom-pipeline-ls` → po migracji **absorpcja** do `__WG_STORAGE__` (bez podwójnej logiki).

---

## 6. Data classification (wszystkie DATA_KEYS + krytyczne AUX)

### 6.1 Klasy

| Class | Znaczenie | Tier docelowy |
|-------|-----------|---------------|
| **CRITICAL** | Bez tego App/Payroll/Auth nie startuje poprawnie | **1** |
| **SYNC** | Synchronizowane domenowo; hot subset może być lean | **2** (hot stub opcjonalnie 1) |
| **ARCHIVE** | Historia / cold | **2** |
| **CACHE** | Da się odtworzyć z cloud/parse | **2** lub **3** |
| **TEMP** | Ephemeral UI | **3** (lub sessionStorage) |

### 6.2 Registry (freeze table)

| Key | Class | Tier docelowy | Notes |
|-----|-------|---------------|-------|
| `kw-week-employees` | CRITICAL | 1 | Payroll — **no logic change** |
| `kw-weekFrom` / `kw-weekTo` | CRITICAL | 1 | |
| `kw-directory` | CRITICAL | 1 | |
| `kw-admin-*` / `kw-app-settings` / hash | CRITICAL | 1 | Auth/ACL |
| `kw-jobs` | SYNC | 2 (+ lean index 1 opcjonalnie) | photos URLs → Storage |
| `kw-archive` | ARCHIVE | 2 | |
| `kw-tenders-pipeline` | SYNC | 2 | strip heavy → Tier3/IDB |
| `kw-wm-print-templates` | SYNC | 2 | meta; single writer |
| `kw-wm-print-job-docs` | SYNC | 2 | |
| `kw-wm-print-settings` | CRITICAL | 1 | small |
| `kw-wm-print-history` | ARCHIVE | 2 | |
| `kw-wgdom-work-catalog` / bundles | SYNC | 2 | |
| `kw-wgdom-cost-catalog` (legacy) | CACHE | 2 / delete | |
| `kw-wgdom-cost-catalog-history` | ARCHIVE | 2 | |
| `kw-electrical-*` | SYNC/ARCHIVE | 2 | settings small → 1 |
| `kw-electrical-schematics` | SYNC | 2 | |
| `kw-company-profile` / tenders company / keywords | SYNC | 1–2 | profile medium → 1 OK if lean |
| `kw-tender-calibration` / price-overrides | SYNC | 2 | |
| `kw-contacts` / leaves / charges / notes | SYNC | 1 | usually small–medium |
| `kw-delivery-package-publications` | SYNC | 2 | |
| `kw-security-audit-log` / `kw-wm-druk-audit-log` / notes audit | ARCHIVE | 2 | ring |
| tombstones `*-deleted-ids` | CRITICAL | 1 | small |
| `kw-local-snapshot-bundle*` | CACHE | **2 only** | **usuń z Tier1** |
| `kw-jobs-local-snaps` / `kw-jobs-last-good` | CACHE | **2 only** | **usuń z Tier1** |
| UI `wg-*` / list prefs / music / autonomous-run | TEMP | 3 / session | |
| telemetry rings | TEMP | 3 | |

Classifier: `src/lib/storage/storage-key-registry.ts` (PROPOSED) — pojedyncze źródło prawdy.

---

## 7. Migration plan (Etapy A→E + F)

### 7.0 A0 — Measurement (Owner + agent, read-only / diag)

- Skrypt lub `__WG_STORAGE__.largest()` na prod (po dostarczeniu telemetrii w A0b).  
- Freeze nie wymaga kodu A0 do ARCH REVIEW; IMPLEMENT zaczyna od A0b+ A1.

### Etap A — Snapshot bundles → IDB

| | |
|--|--|
| **Usuń z LS** | `kw-local-snapshot-bundle`, `kw-local-snapshot-bundle-prev` |
| **Przenieś** | `saveLocalDataSnapshot` → IDB store `wg-snapshots` |
| **Zysk** | największy single win (2× pełny DATA_KEYS) |
| **Pliki** | `local-data-backup.ts`, call sites `App.tsx` |
| **Zakaz** | zmiana `pullAndMergeDataBundle` |

### Etap B — Jobs snapshots → IDB

| | |
|--|--|
| **Usuń z LS** | `kw-jobs-local-snaps`, `kw-jobs-last-good` |
| **Cap** | max **1–2** cold copies w IDB |
| **Pliki** | `jobs-safety.ts`, `App.tsx`, `WorkerPhotoView.tsx`, `weekly-backup-email.ts` |

### Etap C — Pipeline lean + IDB

| | |
|--|--|
| **LS / IDB** | Lean index (id, status, dates, scores) opcjonalnie Tier1; **body** Tier2 |
| **Strip z hot persist** | `noticeHtml`, heavy `tenderDossier.kosztorys` rows → memory/IDB blob per tenderId |
| **Writer** | `saveTendersPipelineLocal` → StorageManager |
| **Pliki** | `tenders-bzp.ts`, `tender-pipeline-persist-coalesce.ts`, `useTendersPipeline.ts` |
| **Zakaz** | zmiana scoringu / BZP API / Edge |

### Etap D — WM single writer + IDB

| | |
|--|--|
| **Single writer** | tylko StorageManager (koniec double-write `persistWmPrintLocal` + hook) |
| **History / templates cold** | Tier2 |
| **Settings** | pozostaje Tier1 |
| **Pliki** | `wm-print-sync.ts`, `useLocalStorage` (jeśli key WM), `WmPrintView` commit path |

### Etap E — Audit logs ring → IDB

| | |
|--|--|
| **Keys** | `kw-security-audit-log`, `kw-wm-druk-audit-log`, `kw-operational-notes-audit-log` |
| **Ring** | keep last N in IDB; LS empty or tiny pointer |
| **Pliki** | `security-audit-log.ts`, `wm-druk-audit.ts`, `operational-notes-audit.ts`, merge helpers |

### Etap F — Platform facade (OSOBNE GO)

| | |
|--|--|
| **Cel** | `useLocalStorage`, `persistKey` LS branch, tombstone savers, **CloudLoader** only przez StorageManager |
| **Zakaz w F bez GO** | zmiana bootstrap phase machine / merge / Payroll |
| **Cloud-sync** | zamiana `localStorage.setItem` → `StorageManager.save*` **bez** zmiany merge |

---

## 8. Impact analysis

| Obszar | Impact | Kiedy |
|--------|--------|-------|
| Quota / P0 UX | Eliminacja QuotaExceeded w normal use | po A+B (+C) |
| Czas sync | Mniejszy sync prelude (brak bundle write) | A |
| Restore lokalny | Recovery UI czyta IDB zamiast LS | A/B — wymaga UI smoke |
| Pipeline UX | Może wymagać async hydrate body | C — plan read-through |
| WM Druk | Zachowanie meta; mniej double IO | D |
| Audit Hub | Odczyt ring z IDB | E |
| Payroll | **Brak** (facade only) | — |
| CloudLoader ready | **Brak** w A–E | F opcjonalnie |
| Edge / KV schema | **Brak** | — |
| Testy | nowe: budget, classifier, migration A/B | per etap |
| Bundle size | + mały moduł storage (~kilka KB) | A0b |

---

## 9. Ryzyka

| ID | Ryzyko | Mitigation |
|----|--------|------------|
| R1 | IDB niedostępne (Safari private) | Tier1 fallback + budget evacuate; feature detect |
| R2 | Split-brain LS vs IDB podczas migracji | read order: IDB → LS legacy; one-shot migrate flag |
| R3 | Async hydrate pipeline → biały ekran | keep lean list sync; body lazy |
| R4 | `runCloudSync` zakłada snapshot LS | rewrite snapshot API before A deploy |
| R5 | Inspectors / multi-tab | `storage` event tylko LS; IDB needs BroadcastChannel (backlog) |
| R6 | Scope creep w cloud-sync | F osobne GO; A–E nie ruszają merge |
| R7 | Budget LIMIT zbyt agresywny po migracji? | A0 bytes measurement; adjust constants |
| R8 | Orphan keys nadal piszą setItem | lint/eslint rule `no-restricted-properties` po F |
| R9 | Double persistence cloud+local size | out of scope — cloud payload personal epic |

---

## 10. Lista plików wymagających migracji

### 10.1 Nowe (PROPOSED)

| Plik | Rola |
|------|------|
| `src/lib/storage/storage-manager.ts` | API + orchestration |
| `src/lib/storage/storage-budget.ts` | WARNING/CRITICAL/LIMIT |
| `src/lib/storage/storage-key-registry.ts` | class + tier |
| `src/lib/storage/storage-idb.ts` | Tier2 adapter |
| `src/lib/storage/storage-memory.ts` | Tier3 |
| `src/lib/storage/storage-telemetry.ts` | `__WG_STORAGE__` |
| `scripts/test-storage-manager-*.mjs` | budget + classify + migrate |

### 10.2 Etap A–B (priority)

| Plik |
|------|
| `src/lib/local-data-backup.ts` |
| `src/lib/jobs-safety.ts` |
| `src/app/App.tsx` (call sites snapshot only — **nie** payroll/sync merge) |
| `src/app/WorkerPhotoView.tsx` (jobs snapshot call) |
| `src/lib/weekly-backup-email.ts` |

### 10.3 Etap C

| Plik |
|------|
| `src/lib/tenders-bzp.ts` (`saveTendersPipelineLocal`) |
| `src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts` |
| `src/app/hooks/useTendersPipeline.ts` (indirect) |
| `src/lib/tenders-pipeline-session-cache.ts` (align with Tier3) |

### 10.4 Etap D

| Plik |
|------|
| `src/lib/wm-print/wm-print-sync.ts` |
| `src/app/WmPrintView.tsx` (commit path — tylko writer wiring) |
| `src/app/hooks/useLocalStorage.ts` (gdy key WM) |

### 10.5 Etap E

| Plik |
|------|
| `src/lib/security-audit-log.ts` |
| `src/lib/wm-druk-audit.ts` |
| `src/lib/operational-notes-audit.ts` (+ notes AUX writers) |

### 10.6 Etap F (poza A–E — osobne GO)

| Plik | Uwaga |
|------|-------|
| `src/app/hooks/useLocalStorage.ts` | central React writer |
| `src/lib/cloud-sync.ts` | **tylko** zamiana setItem → StorageManager; **bez** merge |
| `src/app/CloudLoader.tsx` | **tylko** facade; **bez** phase/gate |
| `src/app/inspector/useInspectorDataSync.ts` | |
| `src/app/LoginScreen.tsx` | |
| `src/app/WorkerPhotoView.tsx` | pozostałe setItem |
| `src/lib/admin-auth.ts` | |
| `src/lib/app-settings.ts` | |
| `src/lib/electrical-measurements/sync.ts` | |
| `src/lib/electrical-schematics/sync.ts` | |
| `src/lib/work-catalog/work-catalog-store.ts` | |
| `src/lib/work-catalog/work-bundle-store.ts` | |
| `src/lib/wgdom-cost-catalog-store.ts` | |
| `src/lib/wgdom-cost-catalog-history.ts` | |
| `src/lib/wgdom-user-classification-dictionary.ts` | |
| `src/lib/company-qualification-profile.ts` | |
| `src/lib/tenders-bzp-company.ts` | |
| `src/lib/tenders-bzp-learn.ts` | |
| `src/lib/tender-cost-calibration.ts` | |
| `src/lib/tender-price-overrides.ts` | |
| `src/lib/delivery-package-publications/publication.ts` | |
| `src/lib/inspector-stats.ts` | |
| `src/lib/tenders-sync.ts` | tombstones |
| + UX TEMP writers | `tenders-list-ux`, music, autonomous, etc. → Tier3/session |

### 10.7 Explicit OUT OF SCOPE (nie zmieniać w LOCALSTORAGE-ARCH-02 A–E)

| Plik / obszar | Powód |
|---------------|--------|
| Payroll merge / `finalizePayrollBundleMerge` / display | #LSA-011 |
| CloudLoader bootstrap phase / timeout | #LSA-012 |
| `pullFromCloudAndMerge` / Edge `index.tsx` | #LSA-012/013 |
| Parser / BZP scoring / WM PDF generator | nie persistence layer |

---

## 11. Acceptance criteria (epic)

1. Tier1 total bytes (prod median) **≤ 1.5 MB**.  
2. `__WG_STORAGE__.budget().state` ≠ overflow w smoke Ctrl+Shift+R + Przetargi + WM.  
3. Brak `QuotaExceededError` w console przy normalnym flow.  
4. Brak `localStorage.setItem` w domenowych modułach (eslint), poza `storage-*`.  
5. Snapshot bundles i jobs multi-snaps **nie** istnieją w LS.  
6. Payroll smoke regresyjny **PASS** (bez zmian kodu payroll).  
7. Cloud sync merge parity testy istniejące **PASS**.

---

## 12. Owner GO checklist

| # | Pytanie | Wymagane |
|---|---------|----------|
| 1 | APPROVE design freeze v1.0? | TAK |
| 2 | APPROVE etap A→E kolejność? | TAK |
| 3 | Potwierdź: CloudLoader/cloud-sync merge **OUT** do etapu F? | TAK |
| 4 | Potwierdź: Payroll **OUT**? | TAK |
| 5 | A0 live bytes dump na prod przed A? | Zalecane |

**IMPLEMENT starts only after explicit Owner GO.**

---

## 13. Document control

| | |
|--|--|
| **Supersedes** | — (QUOTA-P1 był AUDIT-only) |
| **Related** | PAYROLL-P0-FIX-01 · LOCALSTORAGE-QUOTA-P1 |
| **Next** | ARCHITECTURE REVIEW → Owner GO → IMPLEMENT A0b/A |

**STOP — DESIGN FREEZE ONLY · NO IMPLEMENTATION IN THIS STEP.**
