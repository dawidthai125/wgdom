# IK-OCR-PHASE-01 — MVP-B1 (scan-only PDF)

**Status:** IMPLEMENTED (B1) · **B2:** DEFERRED  
**Gates:** OD-OCR-1..7 APPROVED · browser/local only  
**Date:** 2026-09-03 · UI **2.66.138**

## Scope

CASE B only: `noTextLayer` / `likelyScan` → local OCR → **text evidence** → existing `parsePdfPrzedmiarHeuristic` → `AthPreviewRow` → existing Master BOQ / Orchestra.

## Insertion seam

`parseDocumentToKosztorys` (`tenders-bzp-doc-parse.ts`) after `extractPdfText`.

## Hard rules

- Heuristic = STRUCTURE AUTHORITY  
- OCR ≠ trusted BOQ / OUR RATE / Accept / Final Bid  
- TEXT-FIRST: usable native text → OCR calls = 0  
- Fail-soft: unavailable / null confidence / error → CASE 3 HOLD  
- No invented numeric DF confidence thresholds  
- Intra-PDF Multi-BOQ + mixed page-selective OCR (B2) = OUT  
- `pageIndex` in `DwellingLineProvenance` = B1.1 deferred  

## Key files

| File | Role |
|------|------|
| `ocr-types.ts` | Result contract |
| `ocr-provider.ts` | Registry + trust gate + test inject |
| `ocr-browser-local.ts` | tesseract.js adapter |
| `ocr-pdf-raster.ts` | pdf.js → canvas (browser) |
| `ocr-run-b1.ts` | TEXT-FIRST runner |
| `ocr-contract.ts` | DI stub (AMEND-6 compatible) |

## Test

`npx vite-node scripts/test-ik-ocr-mvp-b1.mjs`

## Evidence

Real tender TPI/729/2026 `Przedmiar.pdf` (23p scan): fail-soft HOLD without provider; fixture OCR → heuristic rows. **≠** Global IK Production Verified.
