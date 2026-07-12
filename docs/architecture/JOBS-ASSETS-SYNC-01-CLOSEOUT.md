# JOBS-ASSETS-SYNC-01 — Final Closeout Report

> **Status:** **RELEASE GO · DEPLOY PROPAGATING**  
> **Bundle:** JOBS-ASSETS-SYNC-01 · DESIGN FREEZE v1.0  
> **Baseline przed:** UI **2.65.8** · `8b3c991`  
> **Release:** UI **2.65.9** · **`f8a64d7`** · 2026-07-12

---

## Problem

Roboty → Zdjęcia: upload OK, toast, licznik rośnie — po ~2 s zdjęcia znikają z UI (auto-sync).

---

## Root cause (potwierdzony)

`mergeJobsById.mergePair` — `photos[]` podlegało LWW całej tablicy bez union (w przeciwieństwie do `jobFiles` / `workEntries`).

---

## Rozwiązanie

| Element | Zmiana |
|---------|--------|
| `src/lib/job-photos.ts` | **NOWY** — `mergePhotos()` union po `id` |
| `src/lib/cloud-sync.ts` | `mergePair` → `photos: mergePhotos(prev, j)` |
| Test | `scripts/test-jobs-assets-sync-01.mjs` JA-ASSETS-T01…T08 |

**Bez zmian:** reconcile chain, App.tsx, uploadPhoto, Edge, workerReports, jobFiles.

---

## PhotoEntry.id

`crypto.randomUUID()` w `uploadPhoto()` — trwały klucz merge.

---

## Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | `npm run build` PASS | **PASS** |
| D2 | JA-ASSETS-T01…T08 | **PASS** (16/16) |
| D3 | Regresja JA/JF/RI/PAYROLL | **PASS** |
| D4 | CHANGELOG + ARCHITECTURE | **PASS** |
| D5 | Protected Core | **PASS** |
| D6 | PRODUCTION VERIFIED | **DEPLOY PROPAGATING** |

---

## Powiązane

- [`JOBS-ASSETS-SYNC-01-RELEASE-VERIFICATION.md`](JOBS-ASSETS-SYNC-01-RELEASE-VERIFICATION.md)
- [`JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md)
- Backlog: **ASSETS-02** — `workerReports[]` union
