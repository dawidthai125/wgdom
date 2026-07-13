# JOBS-SYNC-DESIGN-FREEZE-01 — Admin bundle sync lifecycle · DESIGN FREEZE

> **Status:** **CLOSED** — zaimplementowano w **JOBS-SYNC-FIX-01** · prod **2.65.13** @ **`309609e`**  
> **Data:** 2026-07-13  
> **Release verification:** [`docs/releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md`](../releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md)

| Gate | Wartość |
|------|---------|
| Runtime trace | **JOBS-PHOTOS-LIVE-INSTRUMENTATION-03** — COMPLETE |
| Audit | **JOBS-ADMIN-BUNDLE-ROOT-CAUSE-01** — COMPLETE |
| Implementacja | **JOBS-SYNC-FIX-01** — **CLOSED** · **2.65.13** @ **`309609e`** |
| Prod smoke | **JOBS-SYNC-PRODUCTION-SMOKE-01** — **PASS** |

**Workflow:** AUDIT ✓ → TRACE ✓ → ROOT CAUSE ✓ → DESIGN FREEZE ✓ → Owner GO ✓ → IMPLEMENT ✓ → VERIFY ✓ → **CLOSE**.

**Powiązane (read-only):** [`JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md`](JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md) · [`SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md`](SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)

---

## 1. Problem

### 1.1 Symptom (prod, potwierdzony trace)

Po lokalnej mutacji zdjęć w Robotach (upload/delete):

1. UI pokazuje poprawny stan (np. 2 zdjęcia po delete).
2. Po ~2–3 s stan **cofa się** (np. 2 → 3 zdjęcia — „resurrection”).
3. Po kolejnym sync czasem wraca poprawny stan.

### 1.2 Co NIE jest problemem (zamknięte audyty)

- `mergePhotos` / union semantics (JOBS-ASSETS-SYNC-01 CLOSED)
- `deletedPhotoTombstones` (JOBS-PHOTOS-DELETE-SYNC-01 CLOSED)
- `failedUrls` / gallery / upload pipeline / Edge batch-set merge jako pierwotna przyczyna UI empty
- Instrumentacja (JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 CLOSED)

### 1.3 Problem systemowy

**Admin full-bundle sync** (`runCloudSync` / `pullFromCloudAndMerge`) **nadpisuje React nowszym lub równorzędnym bundle z merge**, zanim lokalna mutacja zostanie utrwalona w KV — lub **reconcile czyta przestarzały localStorage**.

---

## 2. Root Cause (potwierdzony)

### RC-1 — Kolejność `runCloudSync`: pull → merge → apply → push

| Faza | Kiedy | Skutek dla delete |
|------|-------|-------------------|
| `batch-get` | **Przed** push | KV nadal ma 3 zdjęcia |
| `computeMergedDataBundle` | merge local + cloud | bundle może mieć 3 zdjęcia |
| `applyAdminDataBundle` | **Przed** push | UI: 2 → 3 |
| `batch-set` | **Po** apply | za późno dla UI |

**Lokalizacja:** `App.tsx` — `runCloudSync` (~842–862): `pullAndMergeDataBundle` → `reconcileAdminBundleWithFreshLocal` → `applyAdminDataBundle` → `pushMergedDataBundleToCloud`.

**Tworzenie bundle:** `cloud-sync.ts` — `computeMergedDataBundle` (~2795): `prepareDataBundleForCloudPush` → `fetchKeysFromCloud` → `mergeAllDataKeys`.

### RC-2 — `reconcileAdminBundleWithFreshLocal` ufa localStorage zamiast React

| Krok | Źródło „fresh” | Ryzyko |
|------|----------------|--------|
| `reconcileJobsWithFreshLocal` | `readLocalStorageDataKey("kw-jobs")` | przy QuotaExceeded LS **starszy** niż React |
| `reconcilePayrollKeysWithFreshLocal` | `readLocalStorageDataKey("kw-week-employees")` | ten sam wzorzec |
| `reconcileArchiveWithFreshLocal` | `readLocalStorageDataKey("kw-archive")` | ten sam wzorzec |
| `reconcileOperationalNotesInMergedBundle` | `readLocalStorageDataKey("kw-operational-notes")` | ten sam wzorzec |

**Lokalizacja:** `cloud-sync.ts` ~2986–3000.

### RC-3 — `applyAdminDataBundle` jest executorem (nie źródłem)

Funkcja poprawnie aplikuje otrzymany `finalBundle` przez `setJobs`. Winny jest **bundle wejściowy**, nie apply.

---

## 3. Odpowiedzi na pytania projektowe

### 3.1 Jaki powinien być prawidłowy lifecycle?

#### Obecny (auto-sync `runCloudSync`)

```text
User mutation (updateJob / appendJobPhotos)
    ↓
setJobs → React state (+ próba LS write)
    ↓
scheduleAutoCloudSync (debounce 2000 ms)
    ↓
runCloudSync()
    ↓
adminDataBundle()                    ← snapshot React (moment startu sync)
    ↓
computeMergedDataBundle()
    ├─ prepareDataBundleForCloudPush (React + LS)
    ├─ fetchKeysFromCloud (batch-get) ← KV sprzed lokalnej mutacji
    └─ mergeAllDataKeys(local, cloud)
    ↓
reconcileAdminBundleWithFreshLocal()  ← re-read LS (może być stale)
    ↓
applyAdminDataBundle()               ← setJobs — UI regression
    ↓
pushMergedDataBundleToCloud()        ← batch-set (za późno dla UI)
```

#### Obecny (`pullFromCloudAndMerge` — focus / visibility)

```text
focus / visibilitychange
    ↓
pullFromCloudAndMerge()
    ↓
[ten sam łańcuch merge → reconcile → apply]
    ↓
(brak push)
```

#### Docelowy (invarianty)

```text
INVARIANT A — Local authority
  Jeśli React ma nowszą mutację niż ostatni zastosowany bundle,
  żaden apply nie może cofnąć tej mutacji.

INVARIANT B — Push visibility
  Lokalna mutacja użytkownika musi trafić do KV
  zanim merge z KV może nadpisać UI tej samej domeny.

INVARIANT C — Fresh reconcile SSOT
  „Świeży lokalny” stan po await = jawny snapshot z React
  (lub gwarantowany zapis LS), nigdy cichy fallback na stale LS.

INVARIANT D — Separation of concerns
  Auto-sync po edycji użytkownika = primarily WRITE (push domain delta).
  Pull + apply = primarily READ (cross-device / focus), z guardem local authority.

Docelowy lifecycle (konceptualny):

User mutation
    ↓
setJobs (React SSOT UI)
    ↓
persist attempt (LS + tombstones) — fail-loud jeśli krytyczne
    ↓
[PATH WRITE] runCloudSyncWrite / domain push
    ├─ capture local authority snapshot (jobs + tombstones)
    ├─ push do KV (batch-set scoped)
    └─ NIE apply merged cloud over local authority
    ↓
[PATH READ] pullFromCloudAndMerge (focus / manual / post-push optional)
    ├─ batch-get
    ├─ merge(local authority, cloud)
    ├─ reconcile(fresh = React snapshot po await)
    └─ apply tylko jeśli generation guard PASS
```

---

### 3.2 Push przed apply, czy opóźnione apply?

| Opcja | Opis | Werdykt DF |
|-------|------|------------|
| **O1 — Push przed apply** | W `runCloudSync`: najpierw push lokalnego snapshotu, potem pull/merge/apply | **Częściowo zalecane** dla auto-sync po mutacji użytkownika — ale push **musi** iść przez istniejący merge guard (Payroll Guard, tombstones), nie blind overwrite |
| **O2 — Opóźnione apply** | Apply dopiero po `batch-set` OK | **Nie wystarcza samo** — po push nadal pull+merge może cofnąć UI jeśli merge union przywraca photos |
| **O3 — Split paths** | Auto-sync = push-only; apply tylko na pull (focus) | **Zalecane jako kierunek minimalny** — reuse wzorca domain push (SYNC-ARCH-01 INV-4) |
| **O4 — Apply guard** | Apply zawsze, ale `kw-jobs` merge z live React przed setJobs | **Zalecane jako warstwa obronna** (belt + suspenders) |

**Rekomendacja DF:** **O3 + O4** (nie wyłącznie O1). Auto-sync po lokalnej edycji **nie powinien** wołać `applyAdminDataBundle` dla kluczy objętych lokalną mutacją w tym cyklu. Osobny pull path może apply z **generation guard**.

Czyste „push przed apply” w jednym `runCloudSync` bez split **zwiększa ryzyko** utraty danych cross-device jeśli push pominie merge z chmurą.

---

### 3.3 Czy `computeMergedDataBundle()` powinien znać pending local mutations?

**Tak — koncepcyjnie**, ale **nie przez nowy równoległy mechanizm**.

| Podejście | Opis |
|-----------|------|
| **Pending flag per key** | `cloudSyncMutationGuard` już istnieje dla payroll/jobs assignments — **rozszerzyć semantykę** zamiast duplikować |
| **Local authority snapshot** | Przekazać jawny `localAuthority: { jobs, tombstones, capturedAt }` do merge zamiast polegać wyłącznie na `values` z momentu startu |
| **Skip cloud merge for key** | Gdy pending local mutation na `kw-jobs` — merge używa local authority, cloud tylko dla innych kluczy |

**Rekomendacja DF:** `computeMergedDataBundle` powinien przyjmować opcjonalny **local authority overlay** (reuse `adminDataBundle()` snapshot **po await**, nie tylko przed). Nie czytać „pending” z KV — KV jest z definicji opóźnione względem React w cyklu pull-before-push.

---

### 3.4 Czy `reconcileAdminBundleWithFreshLocal()` powinno ufać localStorage?

**Nie — gdy React jest nowszy lub LS write zawiódł.**

| Stan | Obecne zachowanie | Docelowe |
|------|-------------------|----------|
| LS == React | OK | OK |
| LS stale, React fresh | **BUG** (QuotaExceeded) | **React wygrywa** jako fresh |
| LS fresh, inna karta | cross-tab | LS nadal ważny **tylko** jeśli `storage` event / znany zapis |

**Rekomendacja DF:**

- `reconcile*WithFreshLocal` przyjmuje **jawny `fresh` z App** (React snapshot po await).
- `readLocalStorageDataKey` = fallback **tylko** gdy brak explicit fresh **i** LS odczyt OK.
- Przy znanym `QuotaExceeded` — **nigdy** nie traktować LS jako SSOT (log + metryka).

To jest **REUSE** istniejącego parametru `fresh?.jobs` w `reconcileJobsWithFreshLocal` — dziś opcjonalny, prawie nigdy przekazywany z App.

---

### 3.5 Czy potrzebujemy wersjonowania bundle (revision / generation)?

**Tak — minimalne generation guard**, nie pełny distributed versioning.

| Poziom | Opis | Potrzeba |
|--------|------|----------|
| **G0 — brak** | Obecny stan | Insufficient |
| **G1 — monotonic local generation** | `jobsRevision++` przy każdym user `setJobs`; apply odrzuca bundle jeśli `bundle.capturedRevision < currentRevision` | **Zalecane minimum** |
| **G2 — per-job updatedAt gate** | apply odrzuca job-level regression vs React | Już częściowo w merge — **niewystarczające** dla photos union |
| **G3 — KV revision / CAS** | SYNC-ARCH-01B witness | Out of scope tego fixa |

**Rekomendacja DF:** **G1** na poziomie App sync cycle (lekkie, bez nowego KV). Generation bump przy user mutation; `applyAdminDataBundle` / pull path sprawdza przed `setJobs`.

---

### 3.6 Impact analysis — inne moduły z tą samą architekturą

Wszystkie klucze w `DATA_KEYS` przechodzą przez **ten sam** `runCloudSync` → `computeMergedDataBundle` → `applyAdminDataBundle`.

| Moduł / domena | Klucz(e) KV | Reconcile fresh LS | Ryzyko identycznego buga | Uwagi |
|----------------|-------------|--------------------|--------------------------|-------|
| **Roboty (photos)** | `kw-jobs` | `reconcileJobsWithFreshLocal` | **P0 CONFIRMED** | trace 3→2→3 |
| **Roboty (inspector, workEntries, address)** | `kw-jobs` | j.w. | **HIGH** | ROBOTS-INSPECTOR-01 / JOBS-ADDRESS-SYNC-01 — częściowe łatki reconcile |
| **Lista Płac** | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo` | `reconcilePayrollKeysWithFreshLocal` | **HIGH** | PAYROLL-RACE / PWRB — osobne closeouty, ten sam pull-before-apply |
| **Archiwum LP** | `kw-archive` | `reconcileArchiveWithFreshLocal` | **MEDIUM** | PAYROLL-ARCHIVE-01 |
| **Kadry** | `kw-directory` | brak dedykowanego reconcile | **MEDIUM** | merge LWW w `mergeAllDataKeys` |
| **Kontakty** | `kw-contacts` | brak | **LOW–MEDIUM** | rzadsze szybkie edycje |
| **Urlopy** | `kw-employee-leaves` | brak | **MEDIUM** | |
| **Do rozliczenia** | `kw-recoverable-charges` | brak | **MEDIUM** | |
| **Notatki operacyjne** | `kw-operational-notes` | `reconcileOperationalNotesInMergedBundle` | **MEDIUM** | PLATFORM-SYNC-01A |
| **WM Druk** | `kw-wm-print-*` (4 klucze) | brak | **MEDIUM** | DEFERRED bootstrap, ale apply w tym samym bundle |
| **Pomiary / schematy** | `kw-electrical-*` | brak | **MEDIUM** | |
| **Przetargi** | `kw-tenders-*`, profile, calibration | brak | **LOW–MEDIUM** | cięższe obiekty; rzadziej edycja w 2 s oknie |
| **Work catalog** | `kw-wgdom-work-*` | brak | **LOW** | |

**Ścieżki poza full bundle (mniejsze ryzyko tego konkretnego buga):**

- Domain push: `persistPayrollRoster`, `pushJobsAfterDelete`, `commitOperationalNotes` — **nie** przechodzą przez apply regression w tym samym cyklu.
- WM / tenders osobne sync lib (`wm-print-sync.ts`, `tenders-bzp.ts`) — osobne ścieżki, ale **admin nadal** dostaje full bundle apply przy focus.

**Wniosek impact:** Fix musi być na warstwie **sync lifecycle + reconcile SSOT + apply guard**, nie wyłącznie `mergePhotos`. Payroll i jobs dzielą ten sam mechanizm — regresja LP jest **realnym ryzykiem** przy naiwnym reorder push/apply.

---

### 3.7 Najmniejszy możliwy fix (SSOT · REUSE · ZERO DUPLICATE · PROTECTED CORE)

#### Zasady

| Zasada | Zastosowanie |
|--------|--------------|
| **SSOT FIRST** | React = UI authority; KV = cross-device; LS = cache cross-tab **tylko** gdy zapis OK |
| **REUSE FIRST** | Rozszerzyć `reconcileAdminBundleWithFreshLocal(fresh)` + istniejący `cloudSyncMutationGuard`; nie nowy orchestrator |
| **ZERO DUPLICATE** | Nie kopiować merge — jedna ścieżka `mergeJobsById` |
| **PROTECTED CORE** | Minimalny diff: `App.tsx` sync orchestration + `cloud-sync.ts` reconcile API; **bez** zmiany `finalizePayrollBundleMerge`, Edge, Payroll Guard semantyki |

#### Rekomendowany minimalny pakiet (MF-REC) — 3 warstwy

| ID | Warstwa | Zakres | Pliki (szacunek) |
|----|---------|--------|------------------|
| **MF-1** | **Fresh reconcile SSOT** | App przekazuje `fresh: { jobs, weekEmployees, archive, operationalNotes }` z **React po await** do `reconcileAdminBundleWithFreshLocal` | `App.tsx`, sygnatura już w `cloud-sync.ts` |
| **MF-2** | **Split auto-sync apply** | `runCloudSync` wywołany z auto-debounce po user edit: **push** merged bundle, **pomiń apply** dla kluczy z aktywną lokalną mutacją (guard) | `App.tsx` |
| **MF-3** | **Generation guard** | Monotonic `localBundleGeneration`; `applyAdminDataBundle` odrzuca regresję względem generation | `App.tsx` (+ ewent. cienki helper lib) |

**Czego MF-REC świadomie NIE robi (out of scope minimal fix):**

- Pełny SYNC-ARCH-01 domain split
- Zmiana kolejności globalnego merge w Edge
- Nowy KV revision / CAS
- Zmiana `mergePhotos` / tombstone semantics

---

## 4. Opcje rozwiązania

### Opcja A — MF-REC (rekomendowana)

Patrz §3.7. Trzy warstwy: fresh React reconcile + ograniczenie apply na auto-sync + generation guard.

| Plusy | Minusy |
|-------|--------|
| Najmniejszy blast radius | Wymaga precyzyjnej klasyfikacji „user mutation sync” vs „focus pull” |
| Reuse istniejących hooków reconcile | Dwa zachowania `runCloudSync` — ryzyko pomyłki w testach |
| Nie psuje Payroll merge SSOT | Nie rozwiązuje fundamentalnie pull-before-push dla focus pull |

**Ryzyka:** regresja Lista Płac jeśli apply skip zbyt agresywny; mitigacja: guard tylko `kw-jobs` + generation per-domain.

---

### Opcja B — Push-then-pull w jednym `runCloudSync`

Zmiana kolejności: push lokalnego snapshotu → batch-get → merge → apply.

| Plusy | Minusy |
|-------|--------|
| KV aktualne przed batch-get | Push bez pełnego merge może **nadpisać** cross-device zmiany |
| Prosta narracja | Koliduje z Payroll Guard / replace semantics |
| | Wysokie ryzyko PROTECTED CORE |

**Ryzyka:** **P0** data loss payroll / roster — **odrzucone** jako minimal fix.

---

### Opcja C — Apply delay do końca push

Obecna kolejność merge, ale `applyAdminDataBundle` dopiero po `batch-set` OK.

| Plusy | Minusy |
|-------|--------|
| Mniejsza zmiana kolejności | UI nadal może dostać zły bundle z merge (union photos) |
| | Nie naprawia RC-2 (stale LS) |
| | Opóźnienie UI 1–3 s bez korzyści |

**Ryzyka:** resurrection **nadal możliwy** — **niewystarczające**.

---

### Opcja D — Pełny SYNC-ARCH-01 (domain split)

Payroll / Jobs / Aux jako osobne domain sync; RS wąski.

| Plusy | Minusy |
|-------|--------|
| Architektonicznie poprawne długoterminowo | Duży scope — **nie** minimal fix |
| Już zaprojektowane (DF APPROVED) | Wymaga wielu slice’ów i Owner GO per slice |

**Ryzyka:** STABILIZATION WINDOW — epic overlap.

---

### Opcja E — Tylko fix reconcile (bez split apply)

Sam MF-1: React zamiast LS w reconcile.

| Plusy | Minusy |
|-------|--------|
| Bardzo mały diff | **Nie naprawia RC-1** gdy merge z cloud union przywraca photos przed reconcile |
| Szybki | Niewystarczające jako sole fix |

**Ryzyka:** partial fix — resurrection może zostać.

---

## 5. Rekomendacja

| Pole | Wartość |
|------|---------|
| **Wybór** | **Opcja A (MF-REC)** |
| **Uzasadnienie** | Jedyny wariant spełniający minimal scope + PROTECTED CORE + naprawia oba RC (pull-before-apply na auto path + stale LS) |
| **Program implementacji** | `JOBS-SYNC-FIX-01` — osobny bundle, Owner GO, #CORE-013 |
| **Priorytet warstw** | MF-1 → MF-2 → MF-3 (każda warstwa testowalna osobno) |

**Owner decision required przed implementacją:**

1. Czy auto-sync po edycji Roboty **może** pominąć apply (push-only path)? — **rekomendacja: TAK**
2. Czy generation guard obejmuje tylko `kw-jobs` w v1, czy też payroll keys? — **rekomendacja: kw-jobs v1; payroll v1.1 po smoke**

---

## 6. Migration plan (implementacja — po GO)

| Faza | Działanie | Verify |
|------|-----------|--------|
| **M0** | Zachować live trace na prod do baseline capture | trace export |
| **M1** | MF-1: przekazywanie fresh React do reconcile | unit: reconcile z React vs LS |
| **M2** | MF-2: auto-sync push-only path dla user mutation | trace: brak apply 2→3 po delete |
| **M3** | MF-3: generation guard | trace: apply odrzucone gdy generation stale |
| **M4** | Regresja: JA-PHOTO-DEL, JA-ASSETS, PAYROLL-GUARD-S1, ROBOTS-INSPECTOR-01 | smoke manifest |
| **M5** | Owner prod repro Obornicka 61 m.8 | upload + delete, brak resurrection |
| **M6** | Usunięcie instrumentacji trace (osobny bundle) | po domknięciu RCA |

**Deploy:** Release **B** (functional) · [`WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md)

---

## 7. Rollback plan

| Trigger | Akcja |
|---------|-------|
| Regresja Lista Płac / roster | Revert commit `JOBS-SYNC-FIX-01`; push `main`; verify `version.json` |
| Regresja cross-device jobs | Revert + przywróć trace; Owner smoke multi-device |
| Payroll Guard block spike | Revert MF-2 first (apply path restore); keep MF-1 jeśli izolowane |

**Rollback nie wymaga** migracji KV — zmiany wyłącznie frontend orchestration.

**Git:** tag pre-fix `wgdom-pre-jobs-sync-fix-01-<version>` przed push (Owner / release checklist).

---

## 8. Test plan

### 8.1 Unit / lib (vite-node)

| ID | Scenariusz | Oczekiwany wynik |
|----|------------|------------------|
| T-SYNC-01 | reconcile z explicit React fresh (2 photos) vs merged (3) | final jobs = 2 |
| T-SYNC-02 | reconcile bez fresh, LS stale (3), React would be 2 | **obecnie FAIL** → po fix PASS z explicit fresh |
| T-SYNC-03 | generation guard: apply z generation-1 przy current=2 | apply skipped / no regression |

### 8.2 Integration smoke (istniejące + nowy)

| Skrypt | Zakres |
|--------|--------|
| `test-jobs-photos-delete-sync-01.mjs` | tombstones — regresja |
| `test-jobs-assets-sync-01.mjs` | union — regresja |
| `test-robots-inspector-01-sync-race.mjs` | inspector reconcile |
| `test-payroll-*` (gate B payroll) | roster nie cofnięty |
| **NOWY** `test-jobs-sync-lifecycle-01.mjs` | symulacja: user delete → auto-sync → brak resurrection |

### 8.3 Prod Owner (manual)

1. `__WG_JOBS_PHOTOS_LIVE_TRACE__.enable()`
2. Roboty → Obornicka 61 m.8
3. Delete zdjęcia → **brak** 2→3 w trace
4. `findFirstRegression()` → **null**
5. F5 → stan utrzymany
6. Drugie urządzenie (opcjonalnie) → cross-device po push

### 8.4 Metryki

- `__wgdomSyncMetrics()` — batch-get / batch-set / pushSkipped bez anomalii
- Brak wzrostu Payroll Guard blocks

---

## 9. Inwarianty (INV — frozen na czas JOBS-SYNC-FIX-01)

| ID | Inwariant |
|----|-----------|
| **INV-J01** | Nie zmieniać semantyki `mergeJobsById` / `finalizePayrollBundleMerge` |
| **INV-J02** | Nie zmieniać Edge `batch-set` / replace keys |
| **INV-J03** | `CloudSyncMutationGuard` — bez regresji kontraktu |
| **INV-J04** | `pullFromCloudAndMerge` na focus — nadal dozwolony, z generation guard |
| **INV-J05** | Tombstones `deletedPhotoTombstones` — bez zmian |
| **INV-J06** | Jeden bundle = jeden cel (#CORE-013) |

---

## 10. Sign-off

| Rola | Status | Data |
|------|--------|------|
| Audit + trace | **COMPLETE** | 2026-07-13 |
| Design freeze (ten dokument) | **READY FOR OWNER REVIEW** | 2026-07-13 |
| Owner GO implementacji | **PENDING** | — |
| `JOBS-SYNC-FIX-01` IMPLEMENT | **BLOCKED** | — |

---

## 11. Następny krok

1. Owner review tego DESIGN FREEZE.
2. Owner GO → program **`JOBS-SYNC-FIX-01`** (implementacja MF-REC).
3. Po verify prod → osobny program usunięcia instrumentacji trace.

**STOP — brak implementacji w tym programie.**
