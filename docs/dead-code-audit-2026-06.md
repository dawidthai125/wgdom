# Audyt martwego kodu — całe repo (2026-06)

> **Tylko audyt** — nic nie usuwano. Indeks: [`SESSION-HANDOFF-2026-06.md`](SESSION-HANDOFF-2026-06.md)

---

## Podsumowanie

| Metryka | Wartość |
|---------|---------|
| Pliki `src/` bezpieczne do usunięcia | **7** (~1,3k LOC) |
| Stub `components/ui/` bez importu z app | **~35** (nie wpływają na bundle Vite) |
| Skrypty archiwizowalne | **~40–50** (ops, nie runtime) |
| Wpływ `npm run build` po usunięciu 7 plików TSX | **Brak** (już poza grafem importów) |

---

## A — Bezpieczne do usunięcia (pewność wysoka)

| Plik | Powód |
|------|--------|
| `src/app/tenders/strategy/components/CompanyHealthCard.tsx` | @legacy ETAP 5A, zero importów |
| `src/app/tenders/strategy/components/GrowthModeSelector.tsx` | j.w. |
| `src/app/tenders/strategy/components/OpportunityRadar.tsx` | j.w. |
| `src/app/tenders/strategy/components/Forecast90Days.tsx` | j.w. |
| `src/app/tenders/strategy/components/DecisionCenter.tsx` | j.w. |
| `src/app/tenders/strategy/components/ImpactPanel.tsx` | UI nigdy montowany; lib `computeTenderImpact` żywy |
| `src/app/TenderExternalDocsPanel.tsx` | Zastąpione przez `TenderDetailPanel` + `discoverExternalTenderDocs` |

Dokumentacja: [`tender-center-pro-legacy-components.md`](tender-center-pro-legacy-components.md)

---

## B — Wymaga weryfikacji

- `src/app/components/ui/*` — tylko `accordion`, `dialog`, `popover`, `ImageWithFallback` importowane z app.
- `scripts/extract-*`, `strip-*`, `diag-*`, `smoke-etap*` — jednorazowe / QA.
- `default_shadcn_theme.css` (root).

---

## C — Nie usuwać

- `scripts/run-scheduled-backup.mjs` (CI), `scripts/mobile-audit.mjs`, `test-tender-center-*.mjs`, `test-*-8.5*`, `test-*-9.0*`.
- `supabase/functions/make-server-0afb8820/*`
- `docs/`, `.cursor/rules/`, `e2e/`
- Cały kod Fazy 8–9 w `JobsView`, `WorkerPhotoView`, `job-wm.ts`, `app-domain.ts`

---

## Martwy kod w żywych plikach

| Lokalizacja | Element |
|-------------|---------|
| `App.tsx` | `tenderDashStats` fetch (@legacy 7G); importy `JobListCard`, `JobCostBreakdownPanel`… bez użycia w ciele |
| `DashboardView.tsx` | `void _legacyTendersStats` |
| `useCommandCenterExecutiveSnapshot.ts` | funkcja hook — tylko typy używane w Context |
| `inspector-stats.ts` | `*Sync` deprecated |
| `tenders-map-coords.ts` | `buildStaticMapUrl()` → `""` |
| `JobFilesBrowser.tsx` | alias `InspectorJobFilesBrowser` bez importów |
| `TenderPortfolioCounters.tsx` | export `TenderPortfolioCounters` — używany jest `TenderPortfolioPanel` |

---

## Nieużywane pakiety npm (brak importu w `src/`)

`@mui/material`, `@mui/icons-material`, `@emotion/*`, `react-dnd`, `react-router`, `react-slick`, `react-responsive-masonry`, `react-popper`, `@popperjs/core`, `canvas-confetti`, `date-fns`, `motion` — oraz deps tylko w nieużywanych `ui/*` (`cmdk`, `vaul`, `recharts`, …).

---

## Plan cleanup (fazy)

1. Usuń 7 plików legacy CC + test build.
2. Oczyść martwe importy i `tenderDashStats` w `App.tsx`.
3. `package.json` — usuń MUI/emotion/react-dnd itd.
4. Opcjonalnie `scripts/archive/` dla extract/diag.
5. Root: `before-*.json` poza git (część już w `.gitignore`).
