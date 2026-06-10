# PROJECT HANDOFF FINAL — Seria 20.5Z (Platform Stabilization)

> **Oficjalny końcowy handoff** po zamknięciu serii 20.5Z · **Data:** 2026-06-10  
> **Hasło agenta:** „kontynuuj WGDOM” · **Audyt zamknięcia:** 20.5Z.3 Platform Stabilization Audit — **GO**

**Źródła prawdy:** [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) · [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md) · [`SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md`](SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md)

---

## 1. PROJECT

**W&G DOM** — aplikacja React/Vite do zarządzania robotami budowlanymi, ekipami, dokumentacją, plikami i rozliczeniami.

| Element | Wartość |
|---------|---------|
| **Monolit UI** | `src/app/App.tsx` + panele w `src/app/` |
| **Frontend deploy** | push `main` → Vercel (wgdom.fun / wgdom.online) |
| **Backend** | Supabase Edge Function `make-server-0afb8820` |
| **Sync** | `src/lib/cloud-sync.ts` — LocalStorage ↔ KV |
| **Repo** | https://github.com/dawidthai125/wgdom · branch `main` |
| **Pełna architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) |

Seria **20.5Z** domknęła warstwę **Platform Stabilization**: E2E gates, PWA hardening, Jobs UI cleanup, E2E Version Awareness — **bez zmian modelu danych i sync** (poza testami i build/infra).

---

## 2. PRODUCTION BASELINE

```text
Version:         2.50.62
Deploy:          5000967334  (SUCCESS)
Feature Commit:  640e3a9     (20.5Z.4A Jobs Cleanup)
App Feature:     381e4b0     (20.5A.12B.1-full JobAllFilesView Hub)
E2E Commit:      8906485     (20.5Z.2B E2E Version Awareness)
E2E Happy Path:  caf344e     (20.5Z.1)
PWA Commit:      46556a7     (20.5Z.2A)
Docs Commit:     ca5fabb     (release docs 20.5Z.2B)
Handoff Docs:    7dc4a5c     (SESSION-HANDOFF 20.5Z)
```

| Status | Wartość |
|--------|---------|
| **RELEASED** | TAK — prod https://www.wgdom.fun · https://www.wgdom.online |
| **STABLE** | TAK |
| **E2E HARDENED** | TAK — CI `#27260457990` |
| **PWA HARDENED** | TAK — SW `wgdom-shell-2.50.62` |
| **READY FOR NEXT FEATURE STREAM** | TAK |

---

## 3. KEY RELEASES

### Seria 20.5A.12 — Files Hub (fundament plików)

| Sprint | Wersja | Commit | Raport |
|--------|--------|--------|--------|
| **20.5A.12** Files Hub Consolidation | 2.50.58 | `211364b` | [`RELEASE-REPORT-20.5A.12.md`](RELEASE-REPORT-20.5A.12.md) |
| **20.5A.12B.1-full** JobAllFilesView Hub | 2.50.62 | `381e4b0` | [`RELEASE-REPORT-20.5A.12B.1-full.md`](RELEASE-REPORT-20.5A.12B.1-full.md) |
| **20.5A.12C** Worker Report PDF | 2.50.61 | `1edf0f9` | [`RELEASE-REPORT-20.5A.12C.md`](RELEASE-REPORT-20.5A.12C.md) |

### Seria 20.5B — Roboty UX + Version Awareness

| Sprint | Wersja | Commit | Raport |
|--------|--------|--------|--------|
| **20.5B.7** Version Awareness | 2.50.56 | `1be7a80` | [`RELEASE-REPORT-20.5B.7.md`](RELEASE-REPORT-20.5B.7.md) |
| **20.5B.7D** Cross-tab Update Banner | 2.50.60 | `b653782` | [`RELEASE-REPORT-20.5B.7D.md`](RELEASE-REPORT-20.5B.7D.md) |

### Seria 20.5Z — Platform Stabilization (CLOSED)

| Sprint | Typ | Commit | Deploy / CI |
|--------|-----|--------|-------------|
| **20.5Z.1** E2E Happy Path | test | `caf344e` | CI `#27258082838` |
| **20.5Z.2A** PWA hardening | build/infra | `46556a7` | Vercel `#5000728139` |
| **20.5Z.4A** Jobs Cleanup | UI | `640e3a9` | Vercel `#5000967334` |
| **20.5Z.2B** E2E Version Awareness | test | `8906485` | CI `#27260457990` |

**Raport 20.5Z.2B:** [`RELEASE-REPORT-20.5Z.2B.md`](RELEASE-REPORT-20.5Z.2B.md)

---

## 4. CURRENT WORKFLOW

### Worker → Admin → Inspector (operacyjny flow)

```text
WorkerPhotoView
  → zdjęcia (photos[])
  → dokumentacja (workerReports[]: zakres, rooms[], sketch)
  → syncJobs() → kw-jobs → pushKeysToCloudSafe
        ↓
JobsView (admin)
  → tab Zdjęcia (approve/reject)
  → tab Dokumentacja (JobWorkerReportsPanel + PDF)
  → tab Pliki (JobFilesHub)
        ↓
InspectorPanel
  → tab Dokumentacja (read-only workerReports)
  → tab Pliki globalnie (JobFilesHub readonly)
  → plan techniczny read-only; kosztorys/zlecenie upload (by design)
```

**SSOT danych roboty:** `kw-jobs` — `photos[]`, `workerReports[]`, `jobFiles[]`, `jobAttachments[]`.

### Deploy i testy

```bash
# Build + preview (E2E)
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version

# Smoke regresja
npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs
npx vite-node scripts/smoke-test-files-hub-20.5a12.mjs
npx vite-node scripts/smoke-test-worker-report-pdf-20.5a12c.mjs
npx vite-node scripts/smoke-test-pwa-version-20.5z2a.mjs
```

---

## 5. FILES ARCHITECTURE

Trzy warstwy plików na robocie (nie mieszać):

| Warstwa | Pole | Zawartość |
|---------|------|-----------|
| **Kontrakt** | `jobFiles[]` | Zlecenie, kosztorys, plan techniczny (`kind`) |
| **Dokumentacja ekipy** | `workerReports[]` | Zakres, wymiary (`rooms[]`), obrys (`sketch`) |
| **Załączniki ogólne** | `jobAttachments[]` | Pliki admin/worker poza kontraktem |
| **Zdjęcia** | `photos[]` | Galeria robót (osobna warstwa, nie w hub liczniku) |

**Kluczowe pliki:** `job-documents.ts`, `job-attachments.ts`, `media-separation.ts`, `files-hub-index.ts`

**Nie zmieniaj bez polecenia:** sync/merge `kw-jobs`, tombstone 20.5B.3, pipeline BZP.

---

## 6. FILES HUB STRUCTURE

**SSOT:** `src/lib/files-hub-index.ts`

| Sekcja UI | Źródło danych | Licznik |
|-----------|---------------|---------|
| Dokumenty kontraktowe | `jobFiles[]` | `countFilesHubItems()` |
| Dokumentacja robót | `workerReports[]` | wliczane |
| Załączniki ogólne | `jobAttachments[]` | wliczane |
| Checklista (info) | `getFilesHubChecklistSummary()` | **poza** licznikiem |

**Widoki:**

| Widok | Rola |
|-------|------|
| `JobFilesHub.tsx` | Roboty → tab Pliki (admin full / inspector readonly) |
| `JobAllFilesView.tsx` | Media → Pliki — kafle per adres (`groupHubContentByJob`) |
| `JobFilesBrowser.tsx` | Inspektor globalny — deleguje do hub SSOT |

**Zgodność Hub ↔ JobAllFilesView:** ten sam `groupHubContentByJob()` — PASS (audyt 20.5Z.3).

**Smoke:** `smoke-test-files-hub-20.5a12.mjs` (T1–T22)

---

## 7. VERSION AWARENESS ARCHITECTURE

**Źródło prawdy wersji:** `CHANGELOG[0].version` w `changelog-data.ts` → vite `__APP_VERSION__` + `dist/version.json`

```text
APP_VERSION (bundle)
        ↓
fetch /version.json (cache: no-store)
        ↓
useAppVersionCheck() — polling 5 min + focus + visibilitychange
        ↓
serverVersion ≠ APP_VERSION → AppUpdateBanner
        ↓
„Odśwież teraz” → location.reload()
„Później” → sessionStorage wg-update-banner-dismiss
        ↓
Cross-tab (20.5B.7D): localStorage wg-update-server-version + storage event
```

| Plik | Rola |
|------|------|
| `src/lib/app-version.ts` | `APP_VERSION` w bundle |
| `src/lib/app-version-check.ts` | Hook, fetch, cross-tab, dismiss |
| `src/app/AppUpdateBanner.tsx` | Globalny banner w `main.tsx` |

**Zamierzone ograniczenia:** brak auto-reload (backlog 20.5B.7C); dismiss per karta.

**Smoke:** `smoke-test-app-version-check-20.5b7.mjs` (14/14) · ARCHITECTURE § 13.1

---

## 8. PWA ARCHITECTURE

| Element | Implementacja |
|---------|---------------|
| **SW źródło** | `scripts/sw.template.js` |
| **Generowanie** | `scripts/generate-service-worker.mjs` → `dist/sw.js` |
| **Cache** | `wgdom-shell-{APP_VERSION}` — nowy cache przy każdym release |
| **version.json** | Network-only w SW (bez `caches.match`, bez fallback do `index.html`) |
| **Vercel** | `vercel.json` — `Cache-Control: no-store` dla `/version.json` |
| **Rejestracja** | `pwa-install.ts` → `/sw.js` po `load`; skip na Capacitor |

**Ważne:** `public/sw.js` **usunięty** — nie podbijać ręcznie; wystarczy wpis w `CHANGELOG[0]`.

**Smoke:** `smoke-test-pwa-version-20.5z2a.mjs` (Z1–Z14) · Prod SW: `wgdom-shell-2.50.62`

---

## 9. E2E COVERAGE

**Workflow:** `.github/workflows/e2e-happy-path.yml`  
**Środowisko:** `npm run build` → preview `http://127.0.0.1:4173`

| Gate | Plik | Zakres |
|------|------|--------|
| **Happy Path** | `e2e/worker-admin-inspector-happy-path.spec.ts` | Worker dokumentacja → admin Dokumentacja + Files Hub → inspector |
| **Version Awareness** | `e2e/version-awareness.spec.ts` | VA-001…VA-004 |

| Scenariusz | Co weryfikuje |
|------------|---------------|
| **VA-001** | Mock `/version.json` → banner |
| **VA-002** | Dismiss „Później” → sessionStorage |
| **VA-003** | Fazowy mock → reload → cleanup cross-tab key |
| **VA-004** | `context.newPage()` — natywny storage event |

**Komendy:** `npm run test:e2e:happy` · `npm run test:e2e:version`

**Ostatni CI SUCCESS:** `#27260457990` (~65 s) — 1 happy + 4 version passed

**Luki (backlog, nie blokują GO):** brak E2E zdjęć worker, billing, real sync, PWA install.

---

## 10. PLATFORM READINESS

Wynik audytu **20.5Z.3** (READ ONLY):

| Obszar | Werdykt |
|--------|---------|
| Worker Readiness | **PASS** |
| Admin Readiness | **PASS** |
| Inspector Readiness | **PASS** |
| Files Hub Readiness | **PASS** |
| PDF Export Readiness | **PASS** |
| Version Awareness Readiness | **PASS** |
| PWA Readiness | **PASS** |
| E2E Readiness | **PASS** |
| Operational Readiness | **PASS** |

**Audyt operacyjny 20.5B:** [`AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md) — **GO**

---

## 11. KNOWN OPEN RISKS

| Ryzyko | Poziom | Uwagi |
|--------|--------|-------|
| Stale localStorage nadpisuje KV (hasła admin, martwe URL) | **HIGH** | Known Issue P11/P15 — hard refresh po incydencie |
| CI path gap — zmiana tylko `vercel.json`/`sw.template.js` bez triggera E2E | **MEDIUM** | Rozszerzyć `paths` w workflow |
| PWA smoke Z1–Z14 poza CI | **MEDIUM** | Manualny |
| Bulk auto-review raportów przy otwarciu roboty (admin) | **MEDIUM** | UX |
| Sketch upload bez offline queue (worker) | **MEDIUM** | Słaba sieć |
| Fragmentacja plików inspektora (detal vs global hub) | **MEDIUM** | UX |
| Dryf `PROJECT-GUIDE.md` (stary baseline, `public/sw.js`) | **MEDIUM** | Docs debt |
| Duplikat `loadPdfMake` w modułach PDF | **LOW** | Tech debt |
| Settlement P0/P1 (CSV, dashboard KPI) | **LOW** | Osobny moduł billing — backlog 20.4C |

**Brak otwartego P0** blokującego platformę po serii 20.5Z.

---

## 12. RECOMMENDED NEXT FEATURE STREAM

Kolejne prace **tylko na polecenie** użytkownika:

| ID | Opis |
|----|------|
| **UX hardening** | Deep linki Pulpit → tab Dokumentacja/Zdjęcia; auto-review po wejściu w tab |
| **Worker offline** | Kolejka offline dla sketch upload |
| **Inspector UX** | Ujednolicenie detalu plików z Files Hub; PDF w sekcji reports |
| **CI** | PWA smoke w CI; rozszerzenie `paths` workflow |
| **Docs** | Aktualizacja `PROJECT-GUIDE.md` do v2.50.62 |
| **20.5B.7C** | Optional auto refresh (domyślnie OFF) |
| **20.5A.11** | Inspektor read-only załączniki w detalu roboty |
| **20.3C** | Legacy CC + GuideView |
| **Roboty 2.0 FULL** | Pełna implementacja |
| **E2E rozszerzenie** | Worker zdjęcia + real sync flow |

**Nie podbijaj wersji** bez formalnego release.

---

## 13. FINAL VERDICT

Seria **20.5Z Platform Stabilization** jest **zakończona**. Platforma WGDOM v2.50.62 jest gotowa do kolejnego strumienia funkcji.

```text
20.5Z

COMPLETE

WGDOM v2.50.62

STABLE
E2E HARDENED
PWA HARDENED

READY FOR NEXT FEATURE STREAM
```

---

*Dokument utworzony: 2026-06-10 · Tryb: IMPLEMENT · Audyt zamknięcia: 20.5Z.3 GO*
