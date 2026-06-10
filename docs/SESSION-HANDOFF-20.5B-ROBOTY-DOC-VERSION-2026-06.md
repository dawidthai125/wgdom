# SESSION HANDOFF — Seria 20.5B.5 → 20.5B.6A.4 (2026-06-09)

> **Status:** **CLOSED** · **Prod baseline:** v**2.50.57** · commit _TBD_ · deploy _TBD_

Handoff zbiorczy: Roboty UX Pack, audyt dokumentacji, naming refresh, version awareness, **Worker Mobile UX**, gotowość operacyjna worker/inspektor.

---

## ★ Baseline produkcyjny

```text
Version: 2.50.57
App commit: TBD
Deploy: TBD
Status: RELEASED · STABLE
```

| Sprint | Wersja | Commit | Deploy | Raport |
|--------|--------|--------|--------|--------|
| **20.5B.6A.4** Worker Mobile UX | 2.50.57 | _TBD_ | _TBD_ | [`RELEASE-REPORT-20.5B.6A.4.md`](RELEASE-REPORT-20.5B.6A.4.md) |
| **20.5B.7** Version Awareness | 2.50.56 | `1be7a80` | `4995835869` | [`RELEASE-REPORT-20.5B.7.md`](RELEASE-REPORT-20.5B.7.md) |
| **20.5B.6A.1** Dokumentacja Naming | 2.50.55 | `782fe87` | `4995467947` | [`RELEASE-REPORT-20.5B.6A.1.md`](RELEASE-REPORT-20.5B.6A.1.md) |
| **20.5B.5** Roboty UX Pack | 2.50.54 | `ae35c56` | `4995226877` | [`RELEASE-REPORT-20.5B.5.md`](RELEASE-REPORT-20.5B.5.md) |

---

## 20.5B.6A.4 — Worker Mobile UX (2.50.57)

**Zakres:** UX only — **bez zmian** `workerReports[]`, sync, KV, Edge.

| Sub | Co |
|-----|-----|
| **4A** | `computeWorkerJobProgress` + `WorkerJobProgressFlow` |
| **4B** | `JobReportForm layout="worker"` — touch 44px+ |
| **4C** | Baner edukacyjny, CTA, scroll do `#worker-section-*` |

**Kluczowe pliki:** `worker-job-progress.ts`, `WorkerJobProgressFlow.tsx`, `WorkerStepCta.tsx`, `WorkerPhotoView.tsx`, `JobReportForm.tsx`

**Smoke:** `smoke-test-worker-mobile-ux-20.5b6a4.mjs`, `smoke-prod-bundle-2.50.57.mjs`

---

## 20.5B.5 — Roboty UX Pack (2.50.54)

**Zakres:** tylko admin/inspektor meta + filtry listy — **bez wpływu na worker upload**.

| Sub | Co |
|-----|-----|
| **5A** | Domyślny filtr „W trakcie”; kolejność tabów faz |
| **5B** | Etykieta typ lokalu **Socjalny** (key `komunalny`) |
| **5C** | Pole **`gasFurnaceStatus`** (Zostaje / Wymiana / Brak) — admin, inspektor, PDF/ZIP |
| **5D** | Docs: plan techniczny PDF = dokument odbiorowy „Rysunek/Plan” |

**Kluczowe pliki:** `JobsView.tsx`, `JobListStatus.tsx`, `job-meta.ts`, `JobMetaPickers.tsx`, `InspectorPanel.tsx`, `job-documents-pack.ts`

**Smoke:** `smoke-test-jobs-default-filter-20.5b5a.mjs`, `smoke-test-job-meta-20.5b5b.mjs`, `smoke-test-gas-furnace-20.5b5c.mjs`

---

## 20.5B.6 — Audyt produktowy (READ ONLY, CLOSED)

**Werdykt:** GO dla **20.5B.6A** — naming + semantyka UI, **bez zmian modelu** `workerReports[]`.

Zakładka „Raport” → ujednolicenie na **„Dokumentacja”** we wszystkich rolach.

---

## 20.5B.6A.1 — Dokumentacja Robót Naming Refresh (2.50.55)

**Tylko copy/UI** — model danych bez zmian.

| Stare | Nowe |
|-------|------|
| Raporty (tab) | **Dokumentacja** |
| Raport z budowy | **Dokumentacja robót** |
| Zakresy i wymiary (inspektor) | **Dokumentacja** |
| Nowe raporty od pracowników (pulpit) | **Nowa dokumentacja od ekipy** |

**Hinty (nowe):**

- `JOB_DOCUMENTATION_SOURCE_HELP` — obrys/wymiary ≠ plan techniczny PDF
- `RYSUNEK_PLAN_CHECKLIST_HELP` — 3 źródła zaliczenia „Rysunek/Plan”

**Kluczowe pliki:**

| Plik | Rola |
|------|------|
| `JobDetailSectionNav.tsx` | Tab admin „Dokumentacja” |
| `JobWorkerReportsPanel.tsx` | Panel admin + hint |
| `WorkerPhotoView.tsx` | Copy pracownika |
| `InspectorNavigation.tsx` / `InspectorPanel.tsx` | Inspektor |
| `DashboardView.tsx` | Alert pulpit |
| `job-documents.ts` | Stałe help UI |
| `GuideView.tsx` | FAQ |

**Nie zmieniano:** `workerReports[]`, sync, KV, Edge, `REQUIRED_DOCS`, PDF/ZIP.

**Smoke:** `smoke-test-job-documentation-labels-20.5b6a.mjs` (19/19)

---

## 20.5B.7 — Version Awareness & Update Banner (2.50.56)

**Problem:** użytkownicy ze starą kartą SPA po deploy nie widzą nowych funkcji (wymagali Ctrl+Shift+R).

**Rozwiązanie:**

```text
APP_VERSION (bundle)  vs  /version.json (serwer)
  → banner „Dostępna nowa wersja WGDOM”
  → „Odśwież teraz” = location.reload()
  → „Później” = sessionStorage dismiss
  → BRAK auto-reload (20.5B.7C poza zakresem)
```

**Kluczowe pliki:**

| Plik | Rola |
|------|------|
| `src/lib/app-version.ts` | `APP_VERSION` w main bundle |
| `src/lib/app-version-check.ts` | Polling 5 min + focus + visibility |
| `src/app/AppUpdateBanner.tsx` | UI banner |
| `src/main.tsx` | Globalny mount |
| `vite.config.ts` | Plugin `wgdom-version-json`, `__APP_VERSION__` define |
| `scripts/read-changelog-version.mjs` | Parser wersji z changelog |

**Smoke:** `smoke-test-app-version-check-20.5b7.mjs` (10/10) · prod: `smoke-prod-bundle-2.50.56.mjs`

**ARCHITECTURE:** § 13.1 Version Awareness

---

## Workflow operacyjny — Worker → Admin → Inspector

**Audyt gotowości (2026-06-09):** [`AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md) · werdykt **GO**

### Pracownik (`WorkerPhotoView.tsx`)

1. **Zdjęcia budowlane** → `photos[]` (before/after/progress) via `uploadPhoto()` → storage-upload
2. **Dokumentacja robót** → `JobReportForm`:
   - zakres → `workerReports[].workScopeText`
   - **wymiary** → `workerReports[].rooms[]` (formularz, nie osobne zdjęcie)
   - **obrys** → `workerReports[].sketch` („Foto rysunku”, upload jako sketch)
3. **Zapis** → `syncJobs()` → `kw-jobs` + `pushKeysToCloudSafe`
4. **Offline** → `photo-queue.ts`

### Admin (`JobsView.tsx`)

- **Zdjęcia** → tab Zdjęcia (akceptacja pending)
- **Dokumentacja** → tab Dokumentacja → `JobWorkerReportsPanel`
- **Checklista** → `syncJobDocumentsFromReports` (zakres/rysunek)

### Inspektor (`InspectorPanel.tsx`)

- Tab **Dokumentacja** — `workerReports[]` (zakres, wymiary, sketch)
- Tab **Galeria** — `photos[]` approved + własne `inspectorPhotos[]`
- **Checklista odbiorowa** — `InspectorDocChecklist` + help Rysunek/Plan
- **Plan techniczny PDF** — `jobFiles[]` kind `plan_techniczny` (read-only)

### Wspólny model

```text
Job @ kw-jobs
  photos[]           — zdjęcia ekipy (pending → approved)
  workerReports[]    — dokumentacja wykonania (BEZ osobnego klucza KV)
  jobFiles[]         — zlecenie, kosztorys, plan_techniczny
  documents{}        — checklista odbiorowa (auto z raportów/plików)
```

**Merge:** `mergeJobsById` w `cloud-sync.ts`

---

## Regresja obowiązkowa (po zmianach w Roboty / dokumentacji / worker)

```bash
npm run build
npx vite-node scripts/smoke-test-job-documentation-labels-20.5b6a.mjs
npx vite-node scripts/smoke-test-technical-drawing-20.5a9.mjs
npx vite-node scripts/smoke-test-media-separation-20.5a8.mjs
npx vite-node scripts/smoke-test-jobs-2.0-midb.mjs
npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs   # po 20.5B.7+
```

---

## Następny backlog (tylko na polecenie)

| ID | Opis |
|----|------|
| **20.5B.7C** | Optional auto refresh — domyślnie OFF |
| **20.5B.6A.2** | Kolejność tabów / worker sub-nav |
| **20.5A.11** | Inspektor read-only załączników ogólnych |
| **20.3C** | Legacy CC + GuideView |
| **E2E worker flow** | Pełny test: zdjęcie → dokumentacja → admin → inspektor |

---

## Nie zmieniaj bez polecenia

- Model `workerReports[]` i sync `kw-jobs`
- Media separation 20.5A.8
- Plan techniczny / `jobFiles[]` semantyka 20.5A.9
- Auto-reload w 20.5B.7 (tylko manual banner)
- Generic attachments `jobAttachments[]` (20.5A.10)
