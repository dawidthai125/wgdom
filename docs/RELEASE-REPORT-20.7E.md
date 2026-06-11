# Release Report — 20.7E Dashboard IA Cleanup

**Data:** 2026-06-11  
**Wersja UI:** **2.50.68**  
**Sprint:** **20.7E** — Dashboard Information Architecture Cleanup  
**Baseline:** 2.50.67 · `f94b530`

---

## Summary

Poprawa IA Pulpicu: „Najważniejsze dziś” jako osobna sekcja (poza „Przetargi — skrót”), neutralna kolorystyka, Uwaga dziś jako compact accordion, nowa kolejność sekcji.

**Bez zmian:** `buildHeroToday()`, ranker, dedupe, Action Center, Command Center silniki, logika KPI.

---

## Zakres (D1–D13)

| ID | Zmiana |
|----|--------|
| D1 | Kolejność: KPI → Najważniejsze → Uwaga → Do odzyskania → Przetargi — skrót → reszta |
| D2 | UI „Najważniejsze dziś” (Hero = technicznie) |
| D3 | Standalone sekcja dla wszystkich adminów |
| D4 | CC skrót: liczniki + pipeline status + CTA |
| D5 | Najważniejsze: accordion compact, TOP 5 |
| D6 | Uwaga: accordion, pełna treść po expand |
| D7 | Brak auto-expand |
| D8–D9 | Neutral cards, delikatniejsze akcenty |
| D11 | Skrót „Braki dokumentów: N” w zwiniętej Uwaga |
| D12 | KPI copy „priorytety i szczegóły poniżej” |
| D13 | Subtitle CC tylko przetargowy |

---

## Pliki

- `src/app/DashboardView.tsx`
- `src/app/HeroDzisPanel.tsx`
- `src/app/tender-center/components/CommandCenterExecutivePanel.tsx`
- `e2e/dashboard-hero.spec.ts`
- `src/app/changelog-data.ts`, `GuideView.tsx`

**Status:** **READY FOR DEPLOY** (po testach CI)
