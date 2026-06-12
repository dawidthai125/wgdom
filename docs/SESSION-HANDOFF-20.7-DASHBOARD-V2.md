# SESSION HANDOFF — Dashboard V2 (seria 20.7C + 20.7D)

> **⚠ SUPERSEDED (historyczny):** Pulpit od **v2.50.74** = **Dashboard V3**.  
> **SSOT Pulpicu:** [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md) — **nie przywracać** Hero / `attentionCount`.

> **Hasło:** „kontynuuj WGDOM”  
> **Data:** 2026-06-11  
> **Status serii:** **SUPERSEDED** przez Dashboard V3 (2.50.74)  
> **★ CZYTAJ NA START** przy pracy na Pulpicie, Hero DZIŚ, Przetargi — skrót, Uwaga dziś

**Powiązane:** [`AGENTS.md`](../AGENTS.md) · [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 · [`tender-center-7g-executive.md`](tender-center-7g-executive.md)

---

## 1. Werdykt i baseline prod

```text
DASHBOARD V2 COMPLETE
HERO COMPRESSION DEPLOYED (20.7D.1)
STABLE · E2E HARDENED
```

| Pole | Wartość |
|------|---------|
| **Wersja UI (changelog)** | **2.50.67** (2.50.66 = 20.7C.2 · 2.50.67 = 20.7D.1) |
| **Commit `main` (app)** | **`f94b530`** — `feat(dashboard): compress hero today panel (20.7D.1)` |
| **Poprzedni** | **`3e46ae8`** — Dashboard V2 Complete (20.7C.2) |
| **Prod** | https://www.wgdom.fun |
| **CI E2E** | `#27322541521` SUCCESS (happy) · `#27322541526` SUCCESS (mobile) |

**Release raporty:**

- [`RELEASE-REPORT-20.7C.2.md`](RELEASE-REPORT-20.7C.2.md) — Hero DZIŚ + konsolidacja + E2E
- [`RELEASE-REPORT-20.7D.1.md`](RELEASE-REPORT-20.7D.1.md) — Hero accordion compact

---

## 2. Co zrobiliśmy (timeline)

| Sprint | Commit | Zakres |
|--------|--------|--------|
| **20.7C.1** | `070e52f` | Uproszczenie `CommandCenterExecutivePanel` (przygotowanie pod V2) |
| **20.7C.2A** | `3e46ae8` | Lib: `dashboard-hero-today.ts` — ranker, `buildHeroToday()`, testy |
| **20.7C.2B** | `3e46ae8` | UI: `HeroDzisPanel.tsx`, integracja w `DashboardView` |
| **20.7C.2C** | `3e46ae8` | Konsolidacja Uwaga dziś, Action Center sloty, E2E `dashboard-hero.spec.ts` |
| **Release 2.50.66** | `3e46ae8` | Dashboard V2 Complete — prod deploy |
| **20.7D audit** | — | READ ONLY: plan kompresji Hero (accordion) |
| **20.7D.1** | `f94b530` | Hero `variant="compact"` accordion, reorder KPI first, merge w Przetargi — skrót |

---

## 3. Architektura Dashboard V2 — źródła priorytetów

### 3.1 Model konsolidacji (po 20.7C.2C)

| Źródło na Pulpicie | Rola |
|--------------------|------|
| **Hero DZIŚ** | Główne TOP priorytety dnia (`buildHeroToday`, max 5 w UI po expand) |
| **Uwaga dziś** | Rozszerzona lista szczegółów; sekcje pokryte przez Hero **ukryte** (dedupe) |
| **Przetargi — skrót** | Liczniki pilnych + **Hero compact** + CTA Command Center |
| **Action Center (CC)** | Pełna analiza w module Przetargi; na Pulpicie tylko slotowa prezentacja forecast |
| **Morning Briefing** | Narracja w Command Center, **nie** na Pulpicie |

### 3.2 SSOT logiki Hero (NIE ZMIENIAĆ bez nowego sprintu)

| Plik | API / odpowiedzialność |
|------|------------------------|
| `src/lib/dashboard-hero-today.ts` | `buildHeroToday()`, `buildHeroTodayRankedAll()`, ranker, mappers |
| `src/lib/dashboard-hero-consolidation.ts` | `getHeroCoveredUwagaSections()` — dedupe vs Uwaga dziś |
| `src/lib/tenders-strategy-action-center.ts` | `buildActionCenter()` — **silnik** Action Center |
| `src/lib/tenders-strategy-action-center-display.ts` | Prezentacja slotów forecast w UI (bez %) |

**Zasada:** zmiany UI (20.7D.1) **nie dotykają** powyższych silników.

### 3.3 Flow danych na Pulpicie

```text
CommandCenterProvider (gdy canViewTendersNav)
  → ccContext.snapshot.actionCenter, forecast90, health, morningBriefing
  → heroTodayInput w DashboardView
  → buildHeroToday(heroTodayInput)     // TOP 5 do UI
  → buildHeroTodayRankedAll(...)       // pełna lista do dedupe Uwaga dziś
  → getHeroCoveredUwagaSections(...)
```

Operacyjne alerty (WM, płace, dokumenty, inspektor…) → `mapOperationalAlertsToHeroItems()` w lib.

### 3.4 Układ Pulpicu (po 20.7D.1)

```text
1. Nagłówek Pulpit + quick actions
2. Banner sobota (warunkowy)
3. KPI grid (5 kart)                    ← pierwszy blok operacyjny
4. Do odzyskania
5. Przetargi — skrót + Hero compact     (canViewTenders)
   LUB Hero compact standalone           (!canViewTenders)
6. Uwaga dziś (z dedupe)
7. Pracuje dziś · Roboty w trakcie · wypłaty…
```

**Hero compact (accordion):**

- Domyślnie **zwinięty** (~wysokość karty KPI)
- Pokazuje: headline, critical/high counts, **top 1 item**, przycisk „Pokaż priorytety”
- Po expand: pełna lista TOP 5 (`HeroActionRow`, ta sama nawigacja)
- `aria-label="Hero DZIŚ"` — **zachowane** dla E2E i a11y

---

## 4. Mapa plików (Dashboard V2)

| Plik | Rola |
|------|------|
| `src/app/DashboardView.tsx` | Layout Pulpicu, `heroTodayInput`, dedupe Uwaga, KPI |
| `src/app/HeroDzisPanel.tsx` | `variant="full" \| "compact"`, `embedded`, nawigacja |
| `src/app/tenders/strategy/components/CommandCenterExecutivePanel.tsx` | Przetargi — skrót + embedded Hero compact |
| `src/lib/dashboard-hero-today.ts` | Ranker SSOT |
| `src/lib/dashboard-hero-consolidation.ts` | Dedupe Uwaga dziś |
| `src/lib/tenders-strategy-action-center-display.ts` | Sloty w Action Center UI |
| `src/app/tenders/strategy/context/CommandCenterContext.tsx` | Snapshot CC dla Hero input |
| `e2e/dashboard-hero.spec.ts` | E2E Hero (A–E) |

**Testy unit (vite-node):**

```bash
npx vite-node scripts/test-dashboard-hero-today.mjs      # 13/13
npx vite-node scripts/test-dashboard-hero-consolidation.mjs # 4/4
npx vite-node scripts/test-hero-dzis-panel.mjs             # 10/10
```

**E2E:**

```bash
npm run build
npm run preview -- --port 4173 --strictPort
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
```

---

## 5. Co NIE zmieniać (reguły dla agentów)

1. **Nie modyfikuj** `buildHeroToday()` rankingu / slice TOP 5 w lib bez nowego sprintu 2A.
2. **Nie modyfikuj** `buildActionCenter()` — tylko warstwa display (`tender-center-action-center-display.ts`).
3. **Nie usuwaj** komponentu Uwaga dziś — tylko dedupe sekcji (`heroUwagaCovered`).
4. **Braki dokumentów** w Uwaga dziś — zawsze widoczne (inline toggle UX).
5. **Fallback Hero** — admin bez `canViewTenders` musi mieć `HeroDzisPanel variant="compact"` między Do odzyskania a Uwaga dziś.
6. **Nie uzależniaj** Hero od modułu Przetargi wyłącznie — fallback obowiązkowy.

---

## 6. E2E `dashboard-hero.spec.ts` (scenariusze)

| ID | Scenariusz | Uwaga |
|----|------------|-------|
| A | KPI **przed** Hero (`kpiBox.y < heroBox.y`) | Po 20.7D.1 |
| B | Klik „Pokaż priorytety” → `ul li` ≤ 5 | Accordion |
| C | WM w Hero, brak WM w Uwaga dziś | Dedupe |
| D | Mobile 390×844, brak H-scroll | |
| E | Empty state (Stanisław, bez CC) | „Dziś nie ma pilnych spraw.” |

---

## 7. Co będziemy robić (kolejne kroki — propozycje)

**Seria 20.7 — CLOSED.** Otwarte tylko na polecenie produktu:

| Temat | Opis | Priorytet |
|-------|------|-----------|
| **20.7D.2** (opcjonalny) | Changelog UI 2.50.67 release + manual UX screenshots po compression | Niski |
| **Hero deep link** | Scroll do expand Hero z banneru „Do ogarnięcia” | Średni |
| **GuideView / changelog** | Zaktualizować opisy Pulpitu (Hero compact, KPI first) | Średni |
| **Command Center** | Dalsze uproszczenia OwnerDashboard (poza zakresem 20.7C) | Backlog |
| **Wersja 2.51.x** | Nowy strumień funkcji po Dashboard V2 | Po decyzji właściciela |

**Nie planowane bez audytu:** zmiana rankera Hero, scalanie Uwaga dziś z Hero w jeden komponent, usuwanie Hero.

---

## 8. Pułapki i znane zachowania

| Sytuacja | Zachowanie |
|----------|------------|
| Super Admin + CC | Hero w **Przetargi — skrót** (embedded compact) |
| Admin bez Przetargów (np. Stanisław) | Standalone Hero compact |
| Empty Hero z CC | Przy Super Admin forecast zawsze generuje akcje — empty state tylko bez CC + puste operacyjne |
| Dedupe WM | Wymaga `buildHeroTodayRankedAll` (nie tylko TOP 5) |
| E2E seed | `e2e/dashboard-hero.spec.ts` + `e2e/fixtures/e2e-seed.ts` |
| Preview E2E | `PW_BASE_URL=http://127.0.0.1:4173` po `npm run build` |

---

## 9. Komendy szybkiego smoke (agent)

```bash
npm run build
npx vite-node scripts/test-dashboard-hero-today.mjs
npx vite-node scripts/test-dashboard-hero-consolidation.mjs
npx vite-node scripts/test-hero-dzis-panel.mjs
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
```

---

*Handoff utworzony: 2026-06-11 · baseline `f94b530` · Dashboard V2 + Hero Compression COMPLETE*
