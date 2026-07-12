# JOBS-ASSETS-SYNC-01 — Union merge `photos[]` · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0** — **IMPLEMENTED** · **PRODUCTION VERIFY PENDING**  
> **Data freeze:** 2026-07-12  
> **Bundle ID:** JOBS-ASSETS-SYNC-01  
> **Class:** **CORE-adjacent** (wąski patch `mergeJobsById` + lib photos merge + test harness)  
> **Baseline prod:** UI **2.65.8** · commit **`8b3c991`** · **STABILIZATION WINDOW ACTIVE**  
> **Audyt:** **ACCEPTED** (sesja 2026-07-12 — AUDIT ONLY, RCA w `JOBS-ASSETS-SYNC-01` audit)  
> **Powiązane:** [`JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md`](JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md) · [`ROBOTS-INSPECTOR-01-CLOSEOUT.md`](ROBOTS-INSPECTOR-01-CLOSEOUT.md) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`architecture/CORE-01A-CHANGE-CHECKLIST.md`](CORE-01A-CHANGE-CHECKLIST.md)

```text
CEL:     Zdjęcia ekipy (photos[]) nie mogą znikać z UI po auto-sync (~2 s) ani po pull/merge chmury.

ZASADA:  Union merge photos[] po id — wzorzec mergeInspectorPhotos / mergeWorkEntriesById.
         Minimalny blast radius — jeden punkt w mergePair + helper lib.
         One Bundle = One Goal — tylko JOBS-ASSETS-SYNC-01 (photos[] MVP).

ZAKAZ:   Zmiana Edge · PWRB · finalizePayrollBundleMerge · payroll roster semantics.
         Pełny rewrite reconcile chain.
         Mixed bundle z LP / payroll / FEATURE UI poza allowlistą §9.
         workerReports[] / materials[] w tym bundle (backlog ASSETS-02).
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Problem** | Roboty → Zdjęcia — upload OK, toast, licznik rośnie, kafelki widoczne → po ~2 s znikają |
| **Root cause PRIMARY** | `mergeJobsById` / `mergePair` — `photos[]` podlega **LWW całej tablicy** (brak union po `id`) |
| **Root cause SECONDARY** | `applyAdminDataBundle` → `setJobs(normalizeJobsList)` **full replace** UI po merge |
| **Root cause TERTIARY** | `reconcileJobsWithFreshLocal` używa tego samego `mergeJobsById` — nie ratuje `photos[]` gdy merged ma wyższy `updatedAt` |
| **Root cause QUATERNARY (tie)** | Remis `updatedAt` → `jobMergeScore` może wybrać chmurę bez nowych photos (bogatsze `jobFiles` ×4) |
| **Pole danych** | `job.photos[]` w `kw-jobs` |
| **Nowe pole KV** | **Brak** |
| **Zmiana Edge** | **Brak** |
| **Zmiana PWRB / LP merge** | **Brak** |
| **Zmiana reconcile chain** | **Brak** (tylko poprawiona semantyka w `mergePair`) |
| **Zmiana `mergeJobsById`** | **Tak — wąska** (`mergePhotos` w `mergePair`) |
| **Gate release** | JA-ASSETS-T01…T08 PASS + regresja JA/RI/PR + prod smoke photos |

**DESIGN FREEZE v1.0 — FROZEN · Owner GO APPROVED · IMPLEMENTED (2.65.9)**

---

## 1. Objaw produkcyjny

| Krok | Oczekiwane | Obserwowane |
|------|------------|-------------|
| Roboty → Zdjęcia → upload | Toast sukces, kafelki, licznik ↑ | **PASS** (chwilowo) |
| Oczekiwanie ~2 s | Zdjęcia zostają | **Znikają z UI** |
| Odświeżenie / inna karta | Zdjęcia w chmurze po push | Często brak w LS/UI do czasu ponownego uploadu |

Timing koreluje z `AUTO_SYNC_DEBOUNCE_MS = 2000` (`cloud-sync-throttle.ts`).

---

## 2. Rozwiązanie zamrożone (Wariant A — zalecany)

### 2.1 Nowy helper `mergePhotos`

Wzorzec: `mergeInspectorPhotos` (`src/lib/job-wm.ts` L486–495).

```typescript
// src/lib/job-photos.ts (nowy) lub job-wm.ts jeśli właściciel domeny WM
export function mergePhotos(
  a: PhotoEntry[] | undefined,
  b: PhotoEntry[] | undefined,
): PhotoEntry[] {
  const map = new Map<string, PhotoEntry>();
  for (const p of [...(a || []), ...(b || [])]) {
    if (p?.id) map.set(p.id, p);
  }
  return [...map.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt));
}
```

### 2.2 Zmiana w `mergePair` (`cloud-sync.ts`)

W return `mergePair` **jawnie** nadpisać `photos` z `pick`:

```typescript
photos: mergePhotos(prev.photos, j.photos),
```

**Zawsze union** — niezależnie od `jTs` vs `prevTs` (jak `workEntries`).

### 2.3 Defense in depth (opcjonalne w bundle, zalecane)

`appendJobPhotos` (`JobsView.tsx` L890–904) — explicite:

```typescript
updatedAt: new Date().toISOString(),
```

Analogicznie ścieżki `WorkerPhotoView` upload.

### 2.4 Poza zakresem v1.0 (backlog ASSETS-02)

| Kolekcja | Semantyka dziś | Backlog |
|----------|------------------|---------|
| `workerReports[]` | LWW | union po `report.id` |
| `materials[]` | LWW | union po id |
| Tombstones photos | brak | osobny program jeśli wymagane delete-sync |

---

## 3. Pliki allowlist (IMPLEMENT)

| Plik | Zmiana |
|------|--------|
| `src/lib/job-photos.ts` | **NOWY** — `mergePhotos` |
| `src/lib/cloud-sync.ts` | `mergePair` → `photos: mergePhotos(...)` |
| `src/app/JobsView.tsx` | opcjonalny explicit `updatedAt` w `appendJobPhotos` |
| `scripts/test-jobs-assets-sync-01.mjs` | **NOWY** — JA-ASSETS-T01…T08 |
| `src/app/changelog-data.ts` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` | § merge `photos[]` |

**Zakaz dotykania:** `cloud-sync-mutation-guard.ts`, Edge, PWRB, `PayrollView`, `finalizePayrollBundleMerge`.

---

## 4. Test plan (JA-ASSETS-T01…T08)

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| T01 | `mergePhotos` union dwóch tablic bez kolizji id | length = suma unikalnych |
| T02 | Kolizja id — nowszy `uploadedAt` wygrywa wpis | jeden rekord, nowszy |
| T03 | `mergeJobsById` local +photos, cloud bez photos, cloud newer `updatedAt` | **photos zachowane** |
| T04 | Remis `updatedAt`, cloud wyższy `jobMergeScore`, local +photos | **photos zachowane** |
| T05 | Symulacja reconcile: fresh LS +photos, merged bez | **photos zachowane** |
| T06 | Regresja `jobFiles` union — bez zmian | PASS |
| T07 | Regresja `workEntries` union — bez zmian | PASS |
| T08 | Regresja `assignedInspectorId` field merge — bez zmian | PASS |

Prod smoke (post-release): Playwright — upload photo → wait 4,5 s → kafelek nadal widoczny + `kw-jobs` LS.

---

## 5. Definition of Done (IMPLEMENT)

| # | Kryterium |
|---|-----------|
| D1 | `npm run build` PASS |
| D2 | JA-ASSETS-T01…T08 PASS |
| D3 | Regresja JOBS-ADDRESS / ROBOTS-INSPECTOR / PAYROLL-RACE PASS |
| D4 | Prod smoke photos persist after sync |
| D5 | CHANGELOG + ARCHITECTURE |
| D6 | Brak zmian poza allowlistą §3 |
| D7 | PRODUCTION VERIFIED |

---

## 6. Rollback

Revert commit — przywraca LWW na `photos[]`. Dane w storage Supabase **nie** są usuwane przez bug (tylko metadane w KV giną z UI).

---

*AUDIT ONLY · 2026-07-12 · Owner GO required before IMPLEMENT*
