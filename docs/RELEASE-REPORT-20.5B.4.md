# Release Report — v2.50.53 Dashboard WM Cleanup (20.5B.4)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.53**  
**Commit:** **`74890bd`**  
**Deploy:** **`4995023669`** — **SUCCESS**  
**CI Mobile:** run **`27231309821`** — **SUCCESS**  
**Status:** **RELEASED**

---

## Summary

Usunięto osadzoną sekcję Portfolio WM z Pulpicu administratora. KPI „Aktywne WM” oraz alerty terminów odbioru pozostają; skróty kierują do zakładki **Roboty**. `WmPortfolioView` nadal działa w panelu inspektora terenowego (`InspectorPanel`).

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/app/DashboardView.tsx` | Usunięto embedded `WmPortfolioView`; repoint KPI/alertów → `onNavigate("jobs")` |
| `src/app/changelog-data.ts` | Wpis 2.50.53 |
| `src/app/GuideView.tsx` | FAQ — Portfolio WM nie na Pulpicie |
| `docs/ARCHITECTURE.md` | § 8 — Dashboard WM vs Roboty/InspectorPanel |
| `CHANGELOG.md` | Skrót 2.50.53 |
| `scripts/smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | Smoke T1–T6 |
| `scripts/smoke-test-inspector-admin-simplification-20.5b2.mjs` | T10 zaktualizowany |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | **13/13 PASS** |
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | **29/29 PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| GitHub Actions `#27231309821` | **SUCCESS** |
| Vercel deploy `#4995023669` | **SUCCESS** |
| Prod bundle `smoke-prod-bundle-2.50.53.mjs` | **9/9 PASS** × wgdom.fun + wgdom.online |

---

## Post-Deploy Smoke (bundle)

| Checklist | Wynik |
|-----------|-------|
| Dashboard — brak Portfolio WM embedded | **PASS** (brak `wm-portfolio`, brak `Portfolio WM →`) |
| KPI „Aktywne WM” | **PASS** |
| Link „Roboty →” | **PASS** |
| InspectorPanel — Portfolio WM | **PASS** |
| Wersja prod 2.50.53 | **PASS** |

---

## Baseline po wdrożeniu

```text
Version: 2.50.53
Commit: 74890bd
Deploy: 4995023669
Status: RELEASED · STABLE
```
