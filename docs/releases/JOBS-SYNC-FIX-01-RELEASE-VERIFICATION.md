# JOBS-SYNC-FIX-01 — Release Verification Report

> **Program:** JOBS-SYNC-FIX-01 · **JOBS-SYNC-PRODUCTION-SMOKE-01**  
> **Design Freeze:** [`docs/architecture/JOBS-SYNC-DESIGN-FREEZE-01.md`](../architecture/JOBS-SYNC-DESIGN-FREEZE-01.md)  
> **Release:** UI **2.65.13** · commit **`309609e`** · 2026-07-13  
> **Baseline:** **2.65.12** @ `1591310` (instrumentacja trace) · photos regression **OPEN** → **CLOSED**

| Pole | Wartość |
|------|---------|
| **STATUS** | **CLOSED** |
| **PRODUCTION VERIFIED** | **TAK** — `version.json` **2.65.13** @ **`309609e`** |
| **Prod smoke** | **PASS** — photos **19/19** · payroll spot **1/1** |

**Powiązane:** JOBS-ADMIN-BUNDLE-ROOT-CAUSE-01 (audit) · JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 (trace) · JOBS-PHOTOS-DELETE-SYNC-01 / JOBS-ASSETS-SYNC-01 (merge/tombstones — bez zmian w tym release)

---

## 1. Root Cause (potwierdzony runtime trace)

Łańcuch z `JOBS-ADMIN-BUNDLE-ROOT-CAUSE-01`:

```text
updateJob() → setJobs() (np. 3→2)
  → runCloudSync()
  → computeMergedDataBundle()        ← batch-get przed push (KV nadal 3)
  → reconcileAdminBundleWithFreshLocal()
  → applyAdminDataBundle()           ← setJobs() 2→3 (resurrection UI)
  → pushMergedDataBundleToCloud()
```

| ID | Przyczyna | Skutek |
|----|-----------|--------|
| **RC-1** | `runCloudSync`: pull → merge → **apply** → push | Auto-sync aplikuje bundle ze **starego KV** zanim push zapisze lokalną mutację |
| **RC-2** | `reconcile*WithFreshLocal` czytał wyłącznie `localStorage` | Przy QuotaExceeded LS **starszy** niż React — reconcile wzmacniał stale bundle |
| **RC-3** | `applyAdminDataBundle` = executor | Nie źródło buga — winny bundle wejściowy |

**Nie było root cause:** `mergePhotos`, tombstones, gallery, upload/delete pipeline, Edge merge.

---

## 2. Design Freeze

**SSOT:** [`JOBS-SYNC-DESIGN-FREEZE-01.md`](../architecture/JOBS-SYNC-DESIGN-FREEZE-01.md) — **APPROVED** → **IMPLEMENTED** → **CLOSED**

Zatwierdzone mechanizmy (MF-REC):

| ID | Opis | Status |
|----|------|--------|
| **MF-1** | Reconcile z aktualnego React snapshot gdy nowszy od LS | **IMPLEMENTED** |
| **MF-2** | Auto-sync po lokalnej mutacji = **WRITE FIRST** (skip apply w tym cyklu) | **IMPLEMENTED** |
| **MF-3** | Generation guard — starszy bundle nie nadpisuje nowszego React | **IMPLEMENTED** |

**Poza zakresem (zachowane):** merge/tombstones, Edge, upload/delete UI, Protected Core payroll merge.

---

## 3. Implementacja (MF-1 / MF-2 / MF-3)

### MF-1 — React fresh w reconcile

| Element | Plik |
|---------|------|
| `resolveReconcileFreshForKey()` — score `updatedAt` / `dataUpdatedAt` | `src/lib/cloud-sync.ts` |
| `buildAdminFreshSnapshot()` — jobs, weekEmployees, archive, operationalNotes | `src/app/App.tsx` |
| Reconcile chain używa explicit fresh | `reconcileAdminBundleWithFreshLocal` |

### MF-2 — Write-first auto-sync

| Element | Plik |
|---------|------|
| `runCloudSync({ writeOnly: true })` na auto-debounce | `src/app/App.tsx` |
| Skip `applyAdminDataBundle` gdy `writeOnly` | `runCloudSync` |
| Apply pozostaje: focus pull, manual retry, `pullFromCloudAndMerge` | `pullFromCloudAndMerge`, `onRetrySync` |

### MF-3 — Generation guard

| Element | Plik |
|---------|------|
| `bumpAdminBundleGeneration()` / `shouldApplyAdminBundleAtGeneration()` | `src/lib/admin-bundle-sync-guard.ts` |
| Bump przy user-write (`!skipApplyWriteTimestamps`) | `src/app/hooks/useLocalStorage.ts` |
| Capture generation na start sync; guard przed apply | `App.tsx` |

**Commit implementacji:** **`309609e`** — `fix(sync): JOBS-SYNC-FIX-01 write-first admin bundle lifecycle`

---

## 4. BUILD / TEST (pre-release)

| Gate | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `scripts/test-jobs-sync-lifecycle-01.mjs` (T1–T5) | **37/37 PASS** |
| `scripts/test-payroll-race-apply-reconcile.mjs` | **12/12 PASS** |
| `scripts/test-jobs-photos-delete-sync-01.mjs` | **21/21 PASS** |

---

## 5. Production Verify

### `version.json` (jednorazowo)

```json
{
  "version": "2.65.13",
  "commit": "309609e",
  "timestamp": "2026-07-13T06:21:19.649Z"
}
```

| Check | Oczekiwane | Wynik |
|-------|------------|-------|
| `version` | **2.65.13** | **PASS** |
| `commit` | **309609e** | **PASS** |

**PRODUCTION VERIFIED**

---

## 6. Production Smoke — JOBS-SYNC-PRODUCTION-SMOKE-01

**Robota testowa:** Obornicka 61 m.8 (`dc35eef8-8cb1-4e2f-a54a-8f6fe457f937`)

| # | Scenariusz | Wynik |
|---|------------|-------|
| 1 | Upload — liczba rośnie, nie znika po auto-sync | **PASS** |
| 2 | Delete — liczba maleje, nie wraca | **PASS** |
| 3 | Odczekaj ≥30s po delete — brak resurrection | **PASS** |
| 4 | F5 / reload — stan zachowany | **PASS** |
| 5 | Drugie urządzenie (fresh bootstrap) — sync poprawny | **PASS** |
| 6 | Generation guard nie blokuje prawidłowego remote pull | **PASS** (Device B pull po zmianie A) |
| 7 | Payroll — roster stabilny po auto-sync | **PASS** (roster=14, 10s) |

| Harness | Wynik |
|---------|-------|
| Photos prod smoke (Playwright) | **19/19 PASS** |
| Payroll spot check | **1/1 PASS** |

**Smoke: PASS**

Artefakt (lokalny, niecommitowany): `.tmp/jobs-photos-delete-sync-01-prod-smoke-report.json`

---

## 7. Protected Core (post-deploy)

| Obszar | Status |
|--------|--------|
| `mergePhotos` / tombstones | **GREEN** — bez zmian |
| Edge / storage-upload | **GREEN** — bez zmian |
| Payroll merge / PWRB | **GREEN** — regresja 12/12 + prod roster stable |
| Upload/delete UI | **GREEN** — bez zmian |

---

## 8. Lessons Learned

1. **Apply przed push w auto-sync** — pełny bundle sync z `batch-get` przed `batch-set` może cofnąć UI nawet gdy merge/tombstones są poprawne; lokalna mutacja wymaga **write-first** (push bez apply w tym samym cyklu).
2. **Reconcile ≠ React** — `readLocalStorageDataKey` po mutacji nie jest równoważny ze stanem React (QuotaExceeded, opóźniony zapis); reconcile musi przyjmować explicit snapshot z React.
3. **Trace przed fixem** — instrumentacja `jobs-photos-live-trace` (2.65.11–12) dała jednoznaczny łańcuch `setJobs 3→2 → applyAdminDataBundle → setJobs 2→3`; bez runtime trace RCA byłby spekulatywny.
4. **Generation guard jako safety net** — minimalny licznik generacji blokuje apply gdy użytkownik edytuje podczas await sync; uzupełnia MF-2, nie zastępuje.
5. **Remote pull nadal działa** — `writeOnly` dotyczy auto-sync po **lokalnej** mutacji; focus/bootstrap/pull nadal aplikuje bundle (z guardem generacji).

---

## 9. VERSION / GIT

| Pole | Wartość |
|------|---------|
| Changelog | **2.65.13** |
| Release commit | **`309609e`** |
| Poprzedni prod | **2.65.12** @ `1591310` |

---

## 10. HOTFIX CLASSIFICATION

BUGFIX  
UX

---

## 11. WERDYKT

| Program | Status |
|---------|--------|
| **JOBS-SYNC-FIX-01** | **CLOSED** |
| **JOBS-SYNC-PRODUCTION-SMOKE-01** | **CLOSED** |

**RELEASE GO** · **PRODUCTION VERIFIED** · **SMOKE PASS** · **PROGRAM CLOSED**
