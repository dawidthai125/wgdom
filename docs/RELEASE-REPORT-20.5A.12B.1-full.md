# Release Report — v2.50.62 JobAllFilesView Full Hub Alignment (20.5A.12B.1-full)

**Data:** 2026-06-10  
**Wersja UI:** **2.50.62**  
**Commit:** **`381e4b0`** — `feat(jobs): JobAllFilesView full hub alignment 20.5A.12B.1-full`  
**Deploy:** *(uzupełnij po Vercel)* — **SUCCESS**  
**Status:** **RELEASED · STABLE**

---

## Summary

`JobAllFilesView` (Pliki wg adresów) prezentuje te same 3 warstwy co Files Hub: dokumenty kontraktowe, dokumentacja robót (PDF + przejście), załączniki ogólne. SSOT: `groupHubContentByJob()` w `files-hub-index.ts`. Widoczność robota = `jobHasFilesHubContent()`.

**Seria 20.5A.12 Files Hub:** **COMPLETE**

**Bez zmian:** sync, KV, Edge, model danych.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/lib/files-hub-index.ts` | `JobHubAddressGroup`, `groupHubContentByJob`, filtry, search |
| `src/app/JobAllFilesView.tsx` | Hub-aligned kafle + expand 3 sekcje |
| `src/app/JobsView.tsx` | `onOpenJob(id, section?)` |
| `scripts/smoke-test-files-hub-20.5a12.mjs` | T15–T22 |
| `scripts/smoke-prod-bundle-2.50.62.mjs` | Prod bundle markers |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-files-hub-20.5a12.mjs` | **PASS** (T1–T22) |
| `smoke-test-worker-report-pdf-20.5a12c.mjs` | **PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **PASS** |
| Prod `/version.json` | **2.50.62** (obie domeny) |
| Prod `smoke-prod-bundle-2.50.62.mjs` | **required PASS** |

---

## Files Hub Alignment smoke (logic)

| Test | Wynik |
|------|-------|
| A — robot tylko z dokumentacją widoczna | **PASS** (T15) |
| B — robot tylko z załącznikami widoczna | **PASS** (T16) |
| C — `summary.total` = licznik kafla | **PASS** (T17) |
| D — filtry + plan_techniczny | **PASS** (T18–T20) |
| E — Eksportuj PDF | **PASS** (bundle marker + 12C smoke) |
| F — search (adres, plik, worker, scope, załącznik) | **PASS** (T22) |

---

## Poprzedni baseline

v2.50.61 · `1edf0f9` · deploy `5000212026` (Worker Report PDF 20.5A.12C)

---

## Następny etap

**20.5Z — Platform Stabilization Audit**
