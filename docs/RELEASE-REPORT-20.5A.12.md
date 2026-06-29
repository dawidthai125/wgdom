# Release Report — v2.50.58 Files Hub Consolidation (20.5A.12)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.58**  
**Commit:** **`211364b`** — `feat(files): Files Hub consolidation with unified file counters (20.5A.12)`  
**Deploy:** **`4999362359`** — **SUCCESS**  
**Status:** **RELEASED · STABLE**

---

## Summary

Warstwa prezentacji **Files Hub** — jeden widok plików roboty bez migracji danych.

- **12A** — `JobFilesHub.tsx`: kontrakt + dokumentacja ekipy + załączniki + checklista (info)
- **12B** — ujednolicone liczniki: `countFilesHubItems()` SSOT
- **12B.1-min** — `JobAllFilesView` nagłówek = hub count (lista kontraktowa bez zmian)
- **12C stub** — `worker-report-pdf.ts` (PDF w następnym sprincie)

**Bez zmian:** `workerReports[]`, `jobFiles[]`, `jobAttachments[]`, `cloud-sync.ts`, KV, Edge, Storage.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/lib/files-hub-index.ts` | Agregacja hub + liczniki SSOT |
| `src/app/JobFilesHub.tsx` | UI 4 sekcji |
| `src/lib/worker-report-pdf.ts` | Stub PDF 12C |
| `src/app/JobsView.tsx` | Integracja hub |
| `src/app/JobFilesBrowser.tsx` | Media read-only hub |
| `src/app/MediaView.tsx` | Liczniki hub |
| `src/app/JobAllFilesView.tsx` | 12B.1-min counters |
| `src/lib/job-files-index.ts`, `job-files-browser.ts` | Delegacja liczników |
| `src/app/admin/admin-nav.ts` | Badge images + hub |
| `scripts/smoke-test-files-hub-20.5a12.mjs` | Smoke lokalny |
| `scripts/smoke-prod-bundle-2.50.58.mjs` | Prod bundle smoke |

---

## Walidacja (lokalna pre-release)

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-files-hub-20.5a12.mjs` | **PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| `smoke-test-generic-attachments-20.5a10.mjs` | **T1–T20 PASS** |
| `smoke-test-job-documentation-labels-20.5b6a.mjs` | **19/19 PASS** |
| `smoke-test-jobs-2.0-midb.mjs` | **21/21 PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **10/10 PASS** |

---

## Prod verify

| Check | wgdom.fun | wgdom.online |
|-------|-----------|--------------|
| `/version.json` = 2.50.58 | **PASS** | **PASS** |
| Prod smoke 2.50.58 | **PASS** (22/22 required) | **PASS** |
| CI Mobile smoke | **PASS** (run `27252163593`) | — |

---

## Version Awareness (20.5B.7 — pierwszy test prod)

Deploy 2.50.58 był pierwszym realnym testem Version Awareness na produkcji.

**Scenariusz manualny:** karta A przed deploy → deploy → focus/visibility → banner „Dostępna nowa wersja WGDOM” → „Odśwież teraz” → reload.

**Automatyczna weryfikacja prod (smoke):** banner copy, `Odśwież teraz`, `visibilitychange`, `location.reload` — **PASS**.

---

## Dokumentacja deweloperska

| Plik | Rola |
|------|------|
| [`SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](SESSION-HANDOFF-20.5A.12-FILES-HUB.md) | **★ Handoff sprintu** — pełny kontekst deweloperski |
| [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) | Baseline prod |
| [`CURRENT-TASK.md`](../CURRENT-TASK.md) | Wznowienie sesji |
| [`AGENTS.md`](../AGENTS.md) § 3g4 | Skrót Files Hub |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.2 | Architektura hub |

---

## Commity release

| SHA | Opis |
|-----|------|
| `211364b` | feat(files): Files Hub consolidation (kod + smoke lokalny) |
| `3d1cc33` | docs(release): prod smoke markers + handoff baseline |

---

## Backlog

- **20.5A.12B.1-full** — kafle `JobAllFilesView` per-adres z hub expand (raporty/załączniki)
- **20.5A.12C** — Worker Report PDF Export
