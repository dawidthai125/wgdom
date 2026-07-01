# RELEASE REPORT — NG-04.4 Polish & EPIC Close

> **Version:** **2.63.12**  
> **Date:** 2026-07-01  
> **Epic:** NG-04 — Kosztorys Workspace PRO · **EPIC CLOSED**  
> **Status:** **RELEASED**

---

## Release summary

| Pole | Wartość |
|------|---------|
| **Commit** | **`ab6637f`** |
| **Push** | `origin/main` |
| **VERIFY** | `https://www.wgdom.fun/version.json` → **2.63.12** |
| **NG-04.4** | **CLOSED** |
| **NG-04** | **EPIC CLOSED** |

NG-04.4 zamyka epic **porządkiem UX/a11y** — Principle **#010 Polish Only**. Bez nowych funkcji, kolumn, parserów ani zmian ViewModel.

---

## Deliverables (P1 + P2)

| ID | Opis | Status |
|----|------|--------|
| UX-01 | Nagłówek BOQ + strip nad search | ✅ |
| UX-03 | Etykieta „Benchmark rbh” desktop | ✅ |
| ATH-01 | Brak tooltip UI na `priced` | ✅ |
| ATH-02 | `aria-label` na triggerze ATH | ✅ |
| M-01 | Touch 44px na przycisku ⓘ | ✅ |
| DOC-01 | HelpView FAQ BOQ Explorer | ✅ |
| UX-04 | `rows_fallback` tylko DEV | ✅ |
| UX-07 | Empty „Brak pozycji w katalogu” | ✅ |
| ATH-03 | `TooltipProvider` na sekcji | ✅ |
| ATH-04 | aria na chipie pliku | ✅ |
| M-02 | `caption` sr-only + `scope="col"` | ✅ |
| M-03 | `aria-pressed` na filtrach | ✅ |
| B-01 | Benchmark empty → „—” | ✅ |

---

## Test matrix

| Skrypt | Wynik |
|--------|-------|
| `test-ng04-4-polish-epic-close.mjs` | **22/22** |
| `test-ng04-3-ath-fidelity.mjs` | **34/34** |
| `test-ng04-2-benchmark-per-line.mjs` | **27/27** |
| `test-ng04-kosztorys-boq-explorer.mjs` | **19/19** |
| `test-ng04-m8-large-boq-performance.mjs` | **108/108** |
| `test-v41-kosztorys-workspace.mjs` | **87/87** (T21–T22) |
| `test-tender-kosztorys-process-phase.mjs` | **18/18** |
| `test-tp200b-snapshot-fidelity.mjs` | **22/22** |
| `npm run build` | **PASS** |

---

## Files changed (release bundle)

- `CHANGELOG.md` / `src/app/changelog-data.ts`
- `CURRENT-TASK.md`
- `src/app/GuideView.tsx`
- `src/app/kosztorys/KosztorysBoqExplorerSection.tsx`
- `src/app/kosztorys/BoqAthTooltip.tsx`
- `src/app/kosztorys/BoqAthSourceStrip.tsx`
- `src/app/kosztorys/BoqLaborBenchmarkBadge.tsx`
- `scripts/test-ng04-4-polish-epic-close.mjs` (NEW)
- `scripts/test-v41-kosztorys-workspace.mjs`
- `docs/NG-04-DESIGN-FREEZE.md`
- `docs/NG-04.4-DESIGN-FREEZE.md`
- `docs/NG-04-EPIC-CLOSE-REPORT.md`
- `docs/NG-04-EPIC-CLOSE-PLAN.md`
- `docs/RELEASE-REPORT-NG-04.4.md`
- `docs/ARCHITECTURE-REVIEW-2026-TENDERS.md` (NEW)
- `audit/NG-04.4-POLISH-EPIC-CLOSE-AUDIT.md`

---

## Related

- Epic close: [`NG-04-EPIC-CLOSE-REPORT.md`](NG-04-EPIC-CLOSE-REPORT.md)
- Architecture review: [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md)
