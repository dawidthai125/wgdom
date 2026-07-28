# COST-PARSER-01 ZIP-UNPACK — IMPLEMENTATION REPORT

> **UI:** 2.65.73  
> **Data:** 2026-07-28  
> **DF:** [`COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md`](COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md)

## Zakres

| Deliverable | Status |
|-------------|--------|
| Klasyfikator A/B/C | DONE — `src/lib/cost-parser-zip-unpack.ts` |
| Macierz copy UI | DONE — presentation F2 + `zipState` |
| 1× retry unpack | DONE — `prepareTenderDossierParseSession` |
| HeavyDone §4 | DONE — `canStampHeavyParsedAtForZipUnpack` + `parsedAt` gate |
| `scanSummary` flags | DONE — `zipUnpackRetryUsed` · `zipCostInnerPresent` · `zipUnpackFailReason` |
| `data-cost-parser-zip-state` | DONE — Outcome / sticky / empty |
| Testy AC-ZU | DONE — `scripts/test-cost-parser-01-zip-unpack.mjs` |
| Changelog | DONE — **2.65.73** |

## Poza zakresem (nietknięte)

- Bid / COST-PIPELINE / AI Cost / OfferBoq engines
- Parsery ATH/XLSX/PDF
- CR-02 `archive_candidate`
- Payroll / Cloud Sync merge
- Epic B / multi-ATH

## AC

| ID | Werdykt |
|----|---------|
| AC-ZU-1 | PASS |
| AC-ZU-2 | PASS |
| AC-ZU-3 | PASS |
| AC-ZU-4 | PASS |
| AC-ZU-5 | PASS |
| AC-ZU-6 | PASS (guard F2 REUSE) |
| AC-ZU-7 | PASS |
| AC-ZU-8 | PASS |
| AC-ZU-9 | PASS |
| AC-ZU-10 | PASS (build) |

## Pliki

- `src/lib/cost-parser-zip-unpack.ts` (new)
- `src/lib/cost-regression-f2.ts`
- `src/lib/tender-document-resolver.ts`
- `src/lib/tender-dossier-pipeline.ts`
- `src/lib/tender-dossier-trace.ts`
- Outcome / sticky / Kosztorysy / OfferBoq empty
- `scripts/test-cost-parser-01-zip-unpack.mjs`
- `src/app/changelog-data.ts` · `CHANGELOG.md`
