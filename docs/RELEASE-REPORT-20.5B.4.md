# Release Report — v2.50.53 Dashboard WM Cleanup (20.5B.4)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.53**  
**Status:** IMPLEMENT DONE · oczekuje commit/deploy

---

## Summary

Usunięto osadzoną sekcję Portfolio WM z Pulpicu administratora. KPI „Aktywne WM” oraz alerty terminów odbioru pozostają; skróty kierują do zakładki **Roboty**. `WmPortfolioView` nadal działa w panelu inspektora terenowego (`InspectorPanel`).

---

## Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/DashboardView.tsx` | Usunięto embedded `WmPortfolioView`; repoint KPI/alertów → `onNavigate("jobs")` |
| `src/app/changelog-data.ts` | Wpis 2.50.53 |
| `src/app/GuideView.tsx` | FAQ — Portfolio WM nie na Pulpicie |
| `docs/ARCHITECTURE.md` | § 8 — Dashboard WM vs Roboty/InspectorPanel |
| `CHANGELOG.md` | Skrót 2.50.53 |
| `CURRENT-TASK.md` | Stan sprintu |
| `scripts/smoke-test-inspector-admin-simplification-20.5b2.mjs` | T10 — brak portfolio na Pulpicie |
| `scripts/smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | **NOWY** — T1–T6 |

**Bez zmian:** `WmPortfolioView.tsx`, `InspectorPanel.tsx`, `job-wm.ts`, sync, KV, Edge.

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-dashboard-wm-cleanup-20.5b4.mjs` | **13/13 PASS** (T1–T6) |
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | **29/29 PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |

---

## Proponowany commit

```
feat(dashboard): remove embedded Portfolio WM section (20.5B.4)

Pulpit keeps WM KPI and alerts but routes shortcuts to Roboty instead
of scrolling to a duplicate portfolio list; InspectorPanel unchanged.
```

---

## Deploy

- **Frontend:** push `main` → Vercel auto-deploy
- **Supabase:** nie wymagany (tylko UI)
