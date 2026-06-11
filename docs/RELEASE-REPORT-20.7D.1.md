# Release Report — 20.7D.1 Hero Compression

**Data:** 2026-06-11  
**Wersja UI:** **2.50.67**  
**Sprint:** **20.7D.1** — Hero accordion compact + KPI first  
**Baseline:** 2.50.66 · `3e46ae8`

---

## Summary

Zmniejszona dominacja Hero DZIŚ na Pulpicie. KPI wraca jako pierwszy blok operacyjny. Hero w wariantie **compact accordion** (domyślnie zwinięty), scalony z **Przetargi — skrót** lub standalone dla adminów bez Przetargów.

**Bez zmian:** `buildHeroToday()`, ranker, dedupe Uwaga dziś, nawigacja `resolveHeroItemNavigation`.

---

## Zakres

| Element | Zmiana |
|---------|--------|
| `HeroDzisPanel` | `variant="compact"`, accordion, `embedded` |
| `DashboardView` | Reorder: KPI → Do odzyskania → Przetargi+Hero / fallback |
| `CommandCenterExecutivePanel` | Hero compact przed CTA CC |
| `e2e/dashboard-hero.spec.ts` | A: KPI przed Hero; B: expand przed count |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | PASS |
| `npm run test:e2e:happy` | 9/9 PASS |
| Hero unit tests | 13+4+10 PASS |

| Commit | **`f94b530`** |
| CI | `#27322541521` E2E · `#27322541526` mobile — SUCCESS |

**Status:** **DEPLOYED** on `main`
