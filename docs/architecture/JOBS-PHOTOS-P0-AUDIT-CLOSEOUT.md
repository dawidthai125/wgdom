# JOBS-PHOTOS-P0 — Audit series closeout (photos upload/delete regression)

> **Status:** **AUDIT COMPLETE** · **LIVE INSTRUMENTATION WIP** (lokalnie, nie na prod)  
> **Data:** 2026-07-13  
> **Prod baseline:** **2.65.10** @ **`d8f2d99`** · https://www.wgdom.fun  
> **Test job:** Obornicka 61 m.8 · `dc35eef8-8cb1-4e2f-a54a-8f6fe457f937`

---

## 1. Cel serii

Wyjaśnić symptom Ownera: po upload/delete zdjęcia w Robotach — znikają, po ~2–3 s wracają / resurrection.

**Zakres audytów:** writers, apply call-sites, React closures, UI render, `failedUrls`, runtime trace.  
**Poza zakresem fixów** — tylko AUDIT + tymczasowa instrumentacja live.

---

## 2. Programy (kolejność)

| ID | Temat | Werdykt |
|----|--------|---------|
| **WRITER-AUDIT-01** | 19 writerów `kw-jobs` / `setJobs` | Upload/delete → debounce 2 s → `runCloudSync` |
| **BATCHSET-FORENSICS-01** | (historyczny) trace batch-set | Delete: BS#1 **przed** delete wysłał stale KV; resurrection via batch-get |
| **PRE-BUNDLE-MUTATION-01** | Mutacje `App.jobs` w oknie debounce | Auto: `pullFromCloudAndMerge` / overlap `runCloudSync` |
| **APPLY-CALLSITE-01** | Wywołania `applyAdminDataBundle` | **2 call-site** w `App.tsx` tylko |
| **REACT-CLOSURE-01** | Stale closure w sync callbacks | **TAK możliwy** (in-flight sync przed append) |
| **CLOSURE-PROOF-01** | Runtime proof stale instance | **NIE** w zebranych trace (upload prod) |
| **UI-RENDER-01** | `JobPhotoGallery` → „Brak zdjęć” | Tylko gdy `filterAvailablePhotos(photos).length === 0` |
| **FAILEDURLS-TRACE-01** | `failedUrls` ukrywa wszystkie | **NIE** — 0 IMG onError po upload |
| **LIVE-INSTRUMENTATION-01** | Owner manual repro + export | **WIP lokalny** — patrz §5 |

---

## 3. Werdykty skrócone (bez fixa)

### Sync / apply

- **`applyAdminDataBundle`** — tylko z `pullFromCloudAndMerge` (focus/visibility/resume) lub `runCloudSync` (debounce 2 s).
- **`appendJobPhotos`** nie ustawia `cloudSyncMutationGuard` ani `suppressAutoSyncUntilRef` → pull może nadpisać w oknie debounce.
- **Stale React closure** — możliwy w kodzie (sync start przed append, `apply` po append); **nie potwierdzony** w upload trace prod.

### UI „Brak zdjęć”

- Ścieżka: `selectedJob.photos` → `filterAvailablePhotos` → `visiblePhotos.length === 0`.
- **Nie** filtruje `status` — tylko URL (`publicUrl`/`path`) + `failedUrls` + dead storage.
- Po udanym upload admin: **nie** empty state w trace (uiTiles = photos count).

### `failedUrls`

- Mechanizm **nie** ukrył zdjęć w runtime trace upload (prod 2.65.10).
- „Brak zdjęć” z przyczyny B (wszystkie URL failed) — **wykluczone** w tej reprodukcji.

### Już CLOSED na prod (kontekst)

- **JOBS-PHOTOS-DELETE-SYNC-01** (`d8f2d99`) — `deletedPhotoTombstones[]` + `mergePhotos` tombstone filter.
- **JOBS-ASSETS-SYNC-01** (`f8a64d7`) — union `mergePhotos`.

---

## 4. Artefakty runtime (.tmp — nie commitować)

| Plik | Opis |
|------|------|
| `.tmp/jobs-photos-upload-p0-trace-01-report.json` | Upload trace prod |
| `.tmp/jobs-photos-delete-p0-runtime-trace-report.json` | Delete trace + firstResurrection |
| `.tmp/jobs-photos-p0-failedurls-trace-01-report.json` | failedUrls — VERDICT **NEITHER** |
| `.tmp/jobs-photos-p0-failedurls-trace-01.mjs` | Skrypt trace (read-only hook) |

---

## 5. LIVE INSTRUMENTATION (WIP — usuń po Owner repro)

**Flaga:** `localStorage.setItem("wg-jobs-photos-live-trace", "1")` + reload.

**Pliki (TEMP — nie na prod bez Owner GO):**

| Plik | Rola |
|------|------|
| `src/lib/jobs-photos-live-trace.ts` | Bufor zdarzeń, export JSON |
| `src/app/hooks/useLocalStorage.ts` | log `setJobs` + `storage` |
| `src/app/App.tsx` | sync / pull / apply / focus |
| `src/app/JobsView.tsx` | `selectedJobId`, append, update |

**Export po reprodukcji Ownera:**

```javascript
__wgdomJobsPhotosLiveTraceExport()
// lub
__WG_JOBS_PHOTOS_LIVE_TRACE__.findFirstRegression()
```

**Następny krok:** Owner ręczna reprodukcja → analiza `firstRegression` → **usunąć całą instrumentację** (bez fixa bez Owner GO).

---

## 6. Następny krok (Owner)

1. Włączyć trace (§5) na **dev** lub po deploy bundle instrumentation.
2. Upload → czekać na zniknięcie → export JSON.
3. Agent analizuje pierwsze `setJobs` / `applyAdminDataBundle` z regresją `photos.length`.
4. Dopiero potem: AUDIT → PLAN → Owner GO → fix (osobny bundle, #CORE-013).

**Nie implementować fixa** na podstawie samych audytów statycznych — czekać na log live lub potwierdzenie Ownera.

---

## 7. Powiązane SSOT

- [`JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md`](JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md) — tombstones prod fix
- [`JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md) — union merge photos
- [`ROBOTS-INSPECTOR-01-CLOSEOUT.md`](ROBOTS-INSPECTOR-01-CLOSEOUT.md) — reconcile przed apply
