# IK-OCR-PHASE-01 — MVP-B1 (scan-only PDF)

**Status:** IMPLEMENTED (B1) · **B2/C2 derived CONNECT:** LANDED (OD-OCR-15) · mixed page-selective OCR still OUT
**Gates:** OD-OCR-1..7 · OD-OCR-15 C2 IMPLEMENTATION GO
**Date:** 2026-09-03 · UI **2.66.141**

## Scope

CASE B only: `noTextLayer` / `likelyScan` → local OCR → **text evidence** → existing `parsePdfPrzedmiarHeuristic` → `AthPreviewRow` → existing Master BOQ / Orchestra.

**C2 (OD-OCR-15):** after trusted OCR, optional `intraPdfDerived` → N truthful `derived_cost_segment` docs (`parentDocumentId` + 0-based pageRange + explicit branch) → existing Multi-BOQ. Ambiguous/weak → HOLD.

## Insertion seam

`parseDocumentToKosztorys` (`tenders-bzp-doc-parse.ts`) after `extractPdfText`.
C2: `connectIntraPdfDerivedCostDocuments` (`tender-ingest/derived-cost-segment.ts`).

## Hard rules

- Heuristic = STRUCTURE AUTHORITY (per segment for derived)
- OCR ≠ trusted BOQ / OUR RATE / Accept / Final Bid
- TEXT-FIRST: usable native text → OCR calls = 0
- Fail-soft: unavailable / null confidence / error → CASE 3 HOLD
- No invented numeric DF confidence thresholds
- Mixed page-selective OCR = still OUT
- `pageIndex` in `DwellingLineProvenance` = B1.1 deferred (pageRange on derived **document**)
- No `parentArchiveId` misuse · no LogicalBoq type · no OfferBoq bump

## Key files

| File | Role |
|------|------|
| `ocr-types.ts` | Result contract |
| `ocr-provider.ts` | Registry + trust gate + test inject |
| `ocr-browser-local.ts` | tesseract.js adapter |
| `ocr-pdf-raster.ts` | pdf.js → canvas (browser) |
| `ocr-run-b1.ts` | TEXT-FIRST runner |
| `derived-cost-segment.ts` | C2 segmentation + derived register |
| `ocr-contract.ts` | DI stub (AMEND-6 compatible) |

## Test

`npx vite-node scripts/test-ik-ocr-mvp-b1.mjs`
`npx vite-node scripts/test-ik-ocr-c2-derived-docs.mjs`

## Evidence

Real tender TPI/729/2026 `Przedmiar.pdf` (23p scan): fail-soft HOLD without provider; fixture OCR → heuristic rows. **≠** Global IK Production Verified.
