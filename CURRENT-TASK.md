# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-18 · **V3.1 Intelligence Sprint 1 (2.60.0 lokalnie)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.52** · P1 Document Insights |
| **Wersja lokalna** | **2.60.0** — V3.1 Intelligence Dashboard (Sprint 1) |
| **Stream V3.1 Sprint 1** | **COMPLETE lokalnie** — lib + UI + docs |
| **Poprzedni lokalny** | **2.59.53** P2A Scope From PDF Text |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **V3.1 Intelligence** | [`docs/V3.1-SPRINT-1-IMPLEMENTATION-PLAN.md`](docs/V3.1-SPRINT-1-IMPLEMENTATION-PLAN.md) · **ARCHITECTURE § 12.1.13** |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **P1 Document Insights** | [`docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md`](docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md) |

## Ukończone — V3.1 Sprint 1 (2026-06-18)

| Faza | Zakres |
|------|--------|
| **A** | `tender-intelligence-*` lib + `test-v31` (34 PASS) |
| **B** | `tender-owner-language-pl.ts` — Intelligence copy |
| **C** | `TenderDetailPanel` wiring + `TenderOwnerView` 7 sekcji (renderer `intelligenceCtx`) |
| **D** | CHANGELOG 2.60.0 · GuideView · ARCHITECTURE § 12.1.13 |

## Smoke — V3.1 + regresja

```bash
npm run build
npx vite-node scripts/test-v31-tender-intelligence.mjs
npx vite-node scripts/test-p5-owner-view.mjs
npx vite-node scripts/test-p5-owner-language.mjs
npx vite-node scripts/test-p1c-executive-summary.mjs
npx vite-node scripts/test-p1d-work-scope-inference.mjs
npx vite-node scripts/test-p2a-scope-from-pdf-text.mjs
```

## Manual smoke (po deploy)

- **CASE A:** dossier + kosztorys + marża → STARTUJ, zakres, ekonomia, 1 akcja
- **CASE B:** brak kosztorysu/marży → ANALIZUJ (nie STARTUJ)
- **CASE C:** ref gap → ODPUŚĆ, bloker kwalifikacji

## Następny krok

**COMMIT → PUSH → VERIFY `version.json` = 2.60.0** (na polecenie)

**Backlog OPEN:** Sprint 2 landing DECYZJE · V3.2 Zasoby · Quick Estimate

## Kluczowe pliki V3.1

| Co | Plik |
|----|------|
| Kontekst SSOT | `src/lib/tender-intelligence-context.ts` |
| Overlay | `src/lib/tender-intelligence-overlay.ts` |
| Next action | `src/lib/tender-intelligence-next-action.ts` |
| Wiring | `src/app/TenderDetailPanel.tsx` |
| UI renderer | `src/app/TenderOwnerView.tsx` |
| Copy PL | `src/lib/tender-owner-language-pl.ts` |
