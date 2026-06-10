# Release Report — v2.50.61 Worker Report PDF Export (20.5A.12C)

**Data:** 2026-06-10  
**Wersja UI:** **2.50.61**  
**Commit:** **`1edf0f9`** — `feat(jobs): worker report PDF export per documentation entry (20.5A.12C)`  
**Deploy:** **`5000212026`** — **SUCCESS**  
**Status:** **RELEASED · STABLE**

---

## Summary

Eksport PDF pojedynczego wpisu `workerReports[]` — zakres, wymiary, obrys, notatki. UI: Roboty → Dokumentacja + Files Hub. pdfMake lazy + `deliverPdfBlob` (iOS Safari).

**Bez zmian:** sync, KV, Edge, model danych.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/lib/worker-report-pdf.ts` | Pełna implementacja PDF |
| `src/lib/inspector-report-pdf.ts` | Eksport `deliverPdfBlob` |
| `src/app/JobWorkerReportsPanel.tsx` | Eksportuj PDF |
| `src/app/JobFilesHub.tsx` | Eksportuj PDF |
| `scripts/smoke-test-worker-report-pdf-20.5a12c.mjs` | Smoke T1–T15 |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-worker-report-pdf-20.5a12c.mjs` | **15/15 PASS** |
| `smoke-test-files-hub-20.5a12.mjs` | **PASS** |
| Prod `/version.json` | **2.50.61 PASS** (obie domeny) |
| Prod smoke `smoke-prod-bundle-2.50.61.mjs` | **required PASS** |

---

## PDF manual smoke

| Test | Wynik |
|------|-------|
| A — Dokumentacja → Eksportuj PDF | Do potwierdzenia w przeglądarce |
| B — Pliki → Dokumentacja → Eksportuj PDF | Do potwierdzenia w przeglądarce |
| C — Zawartość PDF | Weryfikacja bundle: „Dokumentacja rob”, „Eksportuj PDF” |
| D — Obrys sketch | Fallback „Obrys lokalu niedostępny” w kodzie |

---

## Poprzedni baseline

v2.50.60 · `b653782` · deploy `5000129417` (Cross-tab Version Awareness 20.5B.7D)
