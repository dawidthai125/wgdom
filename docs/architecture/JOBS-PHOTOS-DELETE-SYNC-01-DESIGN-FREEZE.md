# JOBS-PHOTOS-DELETE-SYNC-01 — Tombstone delete `photos[]` · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0** — **FROZEN** · **Owner GO APPROVED** · **IMPLEMENTED** (pending verify)  
> **Data freeze:** 2026-07-12  
> **Bundle ID:** JOBS-PHOTOS-DELETE-SYNC-01  
> **Class:** **CORE-adjacent** (wąski patch `mergePair` + `job-photos.ts` + delete UI + test harness)  
> **Baseline prod:** UI **2.65.9** · commit **`f8a64d7`** · **JOBS-ASSETS-SYNC-01 CLOSED** · **STABILIZATION WINDOW ACTIVE**  
> **Audyt:** **ACCEPTED** (2026-07-12 — RCA: union `mergePhotos` bez delete markerów)  
> **Powiązane:** [`JOBS-ASSETS-SYNC-01-DESIGN-FREEZE.md`](JOBS-ASSETS-SYNC-01-DESIGN-FREEZE.md) · [`JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md) · [`architecture/CORE-01A-CHANGE-CHECKLIST.md`](CORE-01A-CHANGE-CHECKLIST.md) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)

```text
CEL:     Usunięte zdjęcia ekipy (photos[]) nie mogą wracać po auto-sync (~2 s), pull/merge chmury ani F5.

ZASADA:  Tombstone per PhotoEntry.id na robocie — parity deletedJobFileTombstones / mergeJobFiles.
         Zachować union upload z JOBS-ASSETS-SYNC-01 (add + sync PASS).
         One Bundle = One Goal — tylko crew photos[] delete-sync MVP.

ZAKAZ:   Powrót do LWW całej tablicy photos[].
         Zmiana Edge / PWRB / finalizePayrollBundleMerge / payroll roster semantics.
         Pełny rewrite reconcile chain.
         Mixed bundle z LP / payroll / FEATURE UI poza allowlistą §8.
         inspectorPhotos / workerReports / materials (backlog ASSETS-03).
         Storage blob delete po tombstone (osobny scope).
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Problem** | Po JOBS-ASSETS-SYNC-01: upload stabilny ✓ — usunięte zdjęcia wracają po ~2 s ✗ |
| **Root cause PRIMARY** | `mergePhotos()` — **union po `id` bez tombstones**; chmura ze starym wpisem przywraca usunięty `PhotoEntry.id` |
| **Root cause SECONDARY** | Delete UI = `photos.filter` bez `deletedPhotoTombstones[]` — merge nie widzi intencji delete |
| **Root cause TERTIARY** | `reconcileJobsWithFreshLocal` → ten sam `mergeJobsById` / `mergePair` |
| **Pole danych** | `job.photos[]` + **nowe** `job.deletedPhotoTombstones[]` w `kw-jobs` |
| **Nowy klucz KV globalny** | **Brak** (tombstones per-job, jak `deletedJobFileTombstones`) |
| **Zmiana Edge** | **Brak** |
| **Zmiana PWRB / LP merge** | **Brak** |
| **Zmiana reconcile chain** | **Brak** (tylko semantyka w `mergePair` + lib) |
| **Zmiana `mergeJobsById`** | **Tak — wąska** (tombstones + `mergePhotos(..., tombstones)`) |
| **Gate release** | JA-PHOTO-DEL-T01…T10 PASS + regresja JA-ASSETS / JA / RI / PR + prod smoke delete |

**DESIGN FREEZE v1.0 — FROZEN · Owner GO APPROVED · IMPLEMENT blocked until this doc**

---

## 1. Objaw produkcyjny (post ASSETS-01)

| Krok | Oczekiwane | Obserwowane |
|------|------------|-------------|
| Roboty → Zdjęcia → upload | Zdjęcia zostają po sync | **PASS** (ASSETS-01) |
| Usuń zdjęcie (admin / pracownik) | Znika z UI i nie wraca | **PASS** chwilowo |
| Oczekiwanie ~2 s (auto-sync) | Usunięte nie wraca | **Wraca** |
| F5 / inna karta | Brak usuniętego w `kw-jobs` | **Często wraca** z chmury |

Timing koreluje z `AUTO_SYNC_DEBOUNCE_MS = 2000` (`cloud-sync-throttle.ts`).

---

## 2. Rozwiązanie zamrożone (Wariant A — jedyny w MVP)

### 2.1 Model danych — `PhotoTombstone`

Parity z `JobFileTombstone` (`job-documents.ts`).

```typescript
/** src/lib/job-photos.ts — minimalny kształt (bez importu app-domain w merge path) */
export interface PhotoTombstone {
  photoId: string;       // PhotoEntry.id — crypto.randomUUID() z uploadPhoto()
  deletedAt: string;     // ISO — LWW przy merge tombstones
  deletedBy?: string;    // displayName admin / worker
  path?: string;         // opcjonalnie PhotoEntry.path — backlog storage cleanup
  label?: string;        // opcjonalnie — audyt / activity
}
```

Na `Job` (`app-domain.ts`):

```typescript
deletedPhotoTombstones?: PhotoTombstone[];
```

**Identyfikator merge:** `PhotoEntry.id` (bez zmian od ASSETS-01).

### 2.2 Helpery lib — parity `jobFiles`

| Helper | Wzorzec | Semantyka |
|--------|---------|-----------|
| `buildPhotoTombstone(photo, opts)` | `buildJobFileTombstone` | Tworzy tombstone z `PhotoEntry` |
| `appendPhotoTombstone(job, tombstone)` | `appendJobFileTombstone` | Dedup po `photoId`, nowszy wygrywa w tablicy job |
| `mergePhotoTombstones(a, b)` | `mergeJobFileTombstones` | Union po `photoId`; kolizja → wyższy `deletedAt` |
| `filterPhotosByTombstones(photos, tombstones)` | `filterJobFilesByTombstones` | Wyklucza `photoId` z Set tombstones |
| `removePhotoWithTombstone(job, photoId, opts)` | `removeJobFileAttachmentWithTombstone` | append tombstone + filter `photos[]` |
| `mergePhotos(a, b, tombstones?)` | `mergeJobFiles` (bez kind-LWW) | Union po `id` na **przefiltrowanych** tablicach; kolizja id → wpis z **b** (drugi argument) jak dziś |

### 2.3 `mergePhotos` — sygnatura zamrożona

```typescript
export function mergePhotos<T extends CrewPhotoMergeEntry>(
  a: T[] | undefined,
  b: T[] | undefined,
  tombstones?: PhotoTombstone[],
): T[] {
  const map = new Map<string, T>();
  for (const p of filterPhotosByTombstones([...(a || []), ...(b || [])], tombstones)) {
    if (p?.id) map.set(p.id, p);
  }
  return [...map.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt));
}
```

**Reguły:**

1. **Pusty / brak tombstones** → zachowanie identyczne jak ASSETS-01 (regresja upload).
2. **Tombstone na `photoId`** → wpis **nigdy** nie trafia do wyniku merge, nawet gdy jest w chmurze.
3. **Nie** stosować LWW całej tablicy `photos[]` (zakaz — regresja ASSETS-01).

### 2.4 Zmiana w `mergePair` (`cloud-sync.ts`)

Wzorzec bloków `deletedJobFileTombstones` / `mergeJobFiles` (L891–925).

```typescript
const mergedPhotoTombstones = mergePhotoTombstones(
  prev.deletedPhotoTombstones,
  j.deletedPhotoTombstones,
);

// ...

return {
  // ...
  photos: mergePhotos(prev.photos, j.photos, mergedPhotoTombstones),
  deletedPhotoTombstones: mergedPhotoTombstones.length ? mergedPhotoTombstones : undefined,
  // ...
};
```

**Zawsze** union `photos` z filtrem tombstones — **niezależnie** od `jTs` vs `prevTs` (jak ASSETS-01 dla add; unlike jobFiles nie ma gałęzi LWW tablicy przy różnym `updatedAt`).

Typ `J` w `mergeJobsById` — dodać `deletedPhotoTombstones?: PhotoTombstone[]`.

### 2.5 Ścieżki delete UI (MVP)

| Ścieżka | Plik | Dziś | Po IMPLEMENT |
|---------|------|------|--------------|
| Admin — usuń kafelek | `JobPhotoGallery.tsx` → `JobsView` `onUpdate` | `photos.filter` | `removePhotoWithTombstone` (lub filter + tombstone w jednym helperze) |
| Admin — wyczyść odrzucone | `JobPhotoGallery.tsx` L184 | `filter status !== rejected` | Każde odrzucone `id` → tombstone przed usunięciem z tablicy |
| Pracownik — usuń swoje | `WorkerPhotoView.tsx` `deleteMyPhoto` | `photos.filter` | `removePhotoWithTombstone` |

**Activity log (zalecane, w bundle):**

```typescript
{ type: "photo_delete", text: "Usunięto zdjęcie (before)…" }
```

**`updatedAt` na job (zalecane):** `updatedAt: new Date().toISOString()` przy delete — spójność z innymi mutacjami job; **nie zastępuje** tombstones.

**Nie istnieją** `deletePhoto()` / `removeJobPhoto()` — MVP wprowadza **`removePhotoWithTombstone`** jako SSOT delete.

### 2.6 Propagacja do chmury

Bez zmian w Edge — tombstones podróżują w `kw-jobs` jak `deletedJobFileTombstones`:

1. Delete → `setJobs` / `useLocalStorage` → LS
2. `runCloudSync` → merge z tombstones → push bundle
3. Inne urządzenie pull → `mergePhotoTombstones` + `mergePhotos` → delete utrzymany

**Storage blob** (`PhotoEntry.path` / `publicUrl`) — **poza MVP**; tombstone może zapisać `path` na przyszły cleanup.

---

## 3. Poza zakresem v1.0 — backlog **ASSETS-03**

| Kolekcja | Problem dziś | Program |
|----------|--------------|---------|
| `inspectorPhotos[]` | `mergeInspectorPhotos` union bez tombstones; `removeInspectorPhoto` = filter | **ASSETS-03** |
| `workerReports[]` | LWW całej tablicy | **ASSETS-03** |
| `materials[]` | LWW całej tablicy | **ASSETS-03** |
| Storage delete po photo tombstone | Blob zostaje w Supabase | **ASSETS-03** lub osobny housekeeping |

**ASSETS-02** (z ASSETS-01 freeze) — union `workerReports` / `materials` — **nadal backlog**; nie mieszać z tym bundle.

---

## 4. Pliki allowlist (IMPLEMENT)

| Plik | Zmiana |
|------|--------|
| `src/lib/job-photos.ts` | `PhotoTombstone`, `buildPhotoTombstone`, `appendPhotoTombstone`, `mergePhotoTombstones`, `filterPhotosByTombstones`, `removePhotoWithTombstone`, **`mergePhotos(..., tombstones?)`** |
| `src/lib/cloud-sync.ts` | `mergePair` — `mergedPhotoTombstones` + `photos` + `deletedPhotoTombstones` |
| `src/app/app-domain.ts` | `Job.deletedPhotoTombstones?` |
| `src/app/JobPhotoGallery.tsx` | delete / clear-rejected → tombstone path |
| `src/app/WorkerPhotoView.tsx` | `deleteMyPhoto` → tombstone path |
| `src/app/JobsView.tsx` | `onUpdate` photos — opcjonalnie activity `photo_delete` + `updatedAt` |
| `scripts/test-jobs-photos-delete-sync-01.mjs` | **NOWY** — JA-PHOTO-DEL-T01…T10 |
| `scripts/test-jobs-assets-sync-01.mjs` | Aktualizacja wywołań `mergePhotos` (3. arg opcjonalny) — regresja |
| `src/app/changelog-data.ts` | po IMPLEMENT |
| `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` | § merge `photos[]` + tombstones |

**Zakaz dotykania:** `cloud-sync-mutation-guard.ts`, Edge, PWRB, `PayrollView`, `finalizePayrollBundleMerge`, `inspectorPhotos` merge, `workerReports`, `materials`.

---

## 5. Test plan (JA-PHOTO-DEL-T01…T10)

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| T01 | `mergePhotoTombstones` — dwa źródła, ten sam `photoId` | jeden tombstone, wyższy `deletedAt` |
| T02 | `filterPhotosByTombstones` | usunięte `photoId` nie w tablicy |
| T03 | `mergePhotos` + tombstone: local bez photo, cloud z photo | **photo nie w wyniku** |
| T04 | `mergePhotos` bez tombstone: local +photo, cloud bez | **photo w wyniku** (regresja ASSETS-01) |
| T05 | `mergeJobsById` — local tombstone + delete, cloud ze starym photo | **photo nie wraca** |
| T06 | `removePhotoWithTombstone` — stan job | krótsza `photos[]` + wpis w `deletedPhotoTombstones` |
| T07 | Symulacja reconcile: fresh LS z tombstone, merged cloud ze photo | delete utrzymany |
| T08 | Regresja `jobFiles` / `workEntries` / `assignedInspectorId` | PASS (bez zmian) |
| T09 | Regresja JA-ASSETS-T01…T08 | PASS |
| T10 | Regresja JA / RI / PAYROLL-RACE (skrót orchestratora) | PASS |

**Prod smoke (post-release):** Playwright na www.wgdom.fun — upload 1–2 zdjęć → delete 1 → wait 5 s → licznik/kafelki → F5 → brak resurrection + `deletedPhotoTombstones` w LS dla `photoId`.

---

## 6. Definition of Done (IMPLEMENT)

| # | Kryterium |
|---|-----------|
| D1 | `npm run build` PASS |
| D2 | JA-PHOTO-DEL-T01…T10 PASS |
| D3 | JA-ASSETS-T01…T08 PASS (regresja add+sync) |
| D4 | Regresja JOBS-ADDRESS / ROBOTS-INSPECTOR / PAYROLL-RACE PASS |
| D5 | Prod smoke delete persist after sync + F5 |
| D6 | CHANGELOG + ARCHITECTURE |
| D7 | Brak zmian poza allowlistą §4 |
| D8 | Protected Core checklist #CORE-013 / #CORE-014 |
| D9 | PRODUCTION VERIFIED |

---

## 7. Blast radius

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| `mergePair` / `cloud-sync.ts` | CORE-adjacent | Wąski diff; testy T05/T07/T08/T09 |
| Model `Job` | Niskie | Opcjonalne pole; backward compatible |
| Upload add+sync | **Regresja krytyczna** | T04, T09, prod smoke ASSETS |
| Payroll / LP | **GREEN** | Brak dotyku |
| Multi-device delete | Cel fixa | T05, T07 |
| Import backup JSON | Średnie | Stare backupy bez tombstones — photos mogą wrócić do pierwszego merge (akceptowalne V1) |

---

## 8. Rollback

Revert commit IMPLEMENT — przywraca `mergePhotos` bez tombstones i delete = filter only.

- **Skutek:** delete znowu „wraca po sync”; upload add+sync pozostaje OK (ASSETS-01).
- **Dane:** `deletedPhotoTombstones[]` w KV stają się ignorowane po rollback (orphan metadata — nieszkodliwe).

---

## 9. Sekwencja programów (kontekst)

```text
JOBS-ASSETS-SYNC-01 (2.65.9)  →  add + sync PASS
JOBS-PHOTOS-DELETE-SYNC-01    →  delete + sync PASS  ← TEN FREEZE
ASSETS-03 (backlog)           →  inspectorPhotos / workerReports / materials
```

---

*DESIGN FREEZE v1.0 · 2026-07-12 · Owner GO APPROVED · IMPLEMENT na polecenie po tym dokumencie*
