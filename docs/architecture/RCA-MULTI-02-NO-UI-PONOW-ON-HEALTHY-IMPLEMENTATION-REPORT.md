# RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY — IMPLEMENTATION REPORT

> **ID:** RCA-MULTI-02 Force Heavy Rescan  
> **UI:** **2.65.76**  
> **Data:** 2026-07-29  
> **DF:** [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md)

## Zakres (F0–F3)

| Etap | Status | Co |
|------|--------|-----|
| F0 | DONE | `forceHeavyRescanAt` · wyjątek `tenderDossierHeavyParseDone` · `COST_MULTI_02_FORCE_RESCAN_CTA` · helpers CTA |
| F1 | DONE | `forceHeavyRescan` w `useTenderDossierHeavyLazy` + `useTenderPipelineRuntime` · `existingDossier: null` przy force · race `forceRescanAtRef` |
| F2 | DONE | CTA „Uzupełnij odczyty branż” + `window.confirm` · busy · `data-force-heavy-rescan` |
| F3 | DONE | testy · changelog · release docs |

## Pliki

| Plik | Rola |
|------|------|
| `src/lib/cost-multi-02-force-rescan.ts` | flaga · CTA visibility · patch/clear · telemetry |
| `src/lib/tenders-bzp-brief.ts` | pole `forceHeavyRescanAt?` |
| `src/lib/tender-dossier-pipeline.ts` | heavyDone wyjątek (gdy flaga ON) |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | `forceHeavyRescan` · ref race · fresh Heavy |
| `src/app/hooks/useTenderPipelineRuntime.ts` | export `forceHeavyRescan` |
| `src/lib/tender-pipeline/tender-pipeline-types.ts` | typ runtime |
| `src/app/TenderKosztorysWorkspace.tsx` | CTA + confirm + busy |
| `src/app/TenderDetailPage.tsx` | wire handler |
| `scripts/test-cost-multi-02-force-rescan.mjs` | T1–T6 + I1–I3 + N* |
| `changelog-data.ts` / `CHANGELOG.md` | **2.65.76** |

## Zakazy (respektowane)

Discovery · parsers · Aggregate merge · Bid formulas · OfferBoq engines · CostPackage · BranchPackage · cloud-sync.ts · Payroll · bump `parserVersion` jako invalidate · null `kosztorys`.

## Testy

```text
npx vite-node scripts/test-cost-multi-02-force-rescan.mjs  → 36 PASS
npx vite-node scripts/test-cost-multi-02.mjs               → PASS (regresja)
npm run build                                              → PASS
```

## AC (kod)

| ID | Werdykt |
|----|---------|
| AC-FR-01…05 | PASS (unit + UI wire) |
| AC-FR-10…14 | PASS (unit + source contract) |
| AC-FR-20…23 | PASS synthetic I2/I3; live PV → osobny raport |
| AC-FR-N1…N4 | PASS |
