# JOBS-PHOTOS-DELETE-SYNC-01 — Final Closeout Report

> **Status:** **RELEASE GO · PRODUCTION VERIFY PENDING**  
> **Bundle:** JOBS-PHOTOS-DELETE-SYNC-01 · DESIGN FREEZE v1.0  
> **Baseline przed:** UI **2.65.9** · JOBS-ASSETS-SYNC-01 CLOSED  
> **Release:** UI **2.65.10** · 2026-07-12

---

## Problem

Po JOBS-ASSETS-SYNC-01: upload stabilny, ale **usunięte zdjęcia wracały** po auto-sync (~2 s) — union `mergePhotos` bez delete markerów.

---

## Rozwiązanie

| Element | Zmiana |
|---------|--------|
| `deletedPhotoTombstones[]` | Pole na `Job` w `kw-jobs` |
| `mergePhotoTombstones` / `filterPhotosByTombstones` | `job-photos.ts` |
| `mergePhotos(a, b, tombstones?)` | Filtr przed union |
| `removePhotoWithTombstone` | Admin + pracownik delete |
| `mergePair` | Parity `deletedJobFileTombstones` |

**Bez zmian:** uploadPhoto, App.tsx CORE, reconcile chain, Edge, inspectorPhotos, workerReports, materials.

---

## Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | `npm run build` PASS | **PASS** |
| D2 | JA-PHOTO-DEL-T01…T11 PASS | **PASS** (21/21) |
| D3 | JA-ASSETS regresja | **PASS** (16/16) |
| D4 | JA / JF / RI / PAYROLL regresja | **PASS** |
| D5 | CHANGELOG + ARCHITECTURE | **PASS** |
| D6 | Allowlist only | **PASS** |
| D7 | PRODUCTION VERIFIED | **PENDING** post-push smoke |

---

## Backlog ASSETS-03 (poza scope)

- `inspectorPhotos[]` tombstones
- `workerReports[]` / `materials[]` union
- Storage blob cleanup po photo delete

---

## Powiązane

- [`JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md`](JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md)
- [`JOBS-PHOTOS-DELETE-SYNC-01-RELEASE-VERIFICATION.md`](JOBS-PHOTOS-DELETE-SYNC-01-RELEASE-VERIFICATION.md)
- [`JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md)
