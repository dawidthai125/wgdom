# ETAP 7G — Pulpit admina × COMMAND CENTER AI (executive summary)

> **Dla agentów AI:** czytaj ten plik przed zmianą pulpitu, `tenderDashStats` lub integracji CC.  
> **Prod:** `main` @ **`88c25f8`** (UI **2.45.27**) · https://www.wgdom.fun  
> **Faza 8:** **zamknięta** (8.0–8.4). **ETAP 8.5** / **Faza 9** — nie rozpoczynaj bez polecenia.

---

## Cel 7G

Właściciel po zalogowaniu na **Pulpit** (`view === "dashboard"`) widzi skrót COMMAND CENTER AI **bez** wchodzenia w zakładkę **Przetargi** (`view === "tenders"`).

Pełny moduł CC pozostaje w `TenderCenterProView` → `OwnerDashboard`.

---

## Mapa plików

| Plik | Rola |
|------|------|
| `src/app/tender-center/context/CommandCenterContext.tsx` | **ETAP 7H** — `CommandCenterProvider` + wspólny pipeline i snapshot |
| `src/app/admin/AdminViewRouter.tsx` | Owija widoki admina w `CommandCenterProvider` gdy `canViewTendersNav` |
| `src/app/DashboardView.tsx` | Renderuje `CommandCenterExecutivePanel` gdy `canViewTenders && onOpenTenders` |
| `src/app/tender-center/components/CommandCenterExecutivePanel.tsx` | UI executive: 5 kart + Action Center (max 3) + CTA — **odczyt z Context** |
| `src/app/tender-center/hooks/useCommandCenterExecutiveSnapshot.ts` | **ETAP 7H** — cienki odczyt `ctx.snapshot` (bez drugiego pipeline) |
| `src/app/tender-center/components/OwnerDashboard.tsx` | Pełny CC; używa tego samego hooka |
| `src/app/admin/AdminViewRouter.tsx` | `view === "dashboard"` → `DashboardView` |
| `src/app/App.tsx` | `canViewTendersNav`, nawigacja `onOpenTenders` → `setView("tenders")` |

### Liby (bez duplikacji logiki w panelu)

- `computeCompanyHealth` — `src/lib/tender-center-health.ts`
- `buildMorningBriefing` — `src/lib/tender-center-morning-briefing.ts`
- `buildActionCenter` — `src/lib/tender-center-action-center.ts`
- `computeForecast90Days` — `src/lib/tender-center-forecast-90d.ts`
- `rankTopTenderOpportunities` / `bestOpportunity` — `src/lib/tender-center-decision.ts`
- `computeTenderImpact` + `computeFinancialCapacity` — tylko gdy `financialCapacityEnabled: true` (pulpit)

---

## ETAP 7H — wspólny store (Pipeline → Provider → Context)

```text
useTendersPipeline (×1 w Provider)
  → health, forecast, actionCenter, morningBriefing, …
  → CommandCenterContext
  → CommandCenterExecutivePanel | OwnerDashboard
```

`useCommandCenterExecutiveSnapshot()` **nie** tworzy drugiego pipeline — zwraca `snapshot` z Providera.

**ETAP 8.0A — Classic View (`TendersView`):** `useCommandCenterContext().snapshot.pipeline` (jeden runtime z Providerem). Przy mount: `pipeline.reloadFromStorage()` — hydration + keyword rescore, **bez** BZP merge / autoAward. Profil firmy: `bumpProfileVersion()` z Context.

---

## Hook: `useCommandCenterExecutiveSnapshot`

```ts
useCommandCenterExecutiveSnapshot({
  jobs, directory, productionWeekEmployees, weekFrom, weekTo, savedWeeks,
  learningRevision?,      // OwnerDashboard — przeliczenie po learning
  profileVersion?,        // przekazywane do useTendersPipeline
  financialCapacityEnabled?, // false = OwnerDashboard (hotfix Impact)
})
```

| Flaga | Pulpit (7G) | OwnerDashboard (CC) |
|-------|-------------|---------------------|
| `financialCapacityEnabled` | `true` — Pulpit executive + **OwnerDashboard (7G.1)** | `false` — tylko gdy wyłączysz jawnie (testy) |
| `learningRevision` | domyślnie `0` | inkrement po zapisie decyzji learning |

**Zwraca m.in.:** `pipeline`, `health`, `morningBriefing`, `actionCenter`, `forecast90`, `bestOpportunity`, `financialCapacity`, `growthModeState`, `setGrowthMode`, …

---

## UI executive (`CommandCenterExecutivePanel`)

Nagłówek: **W&G DOM COMMAND CENTER AI** · *Centralny System Przetargów i Wyliczeń* (`COMMAND_CENTER_BRAND`).

| Karta | Źródło |
|-------|--------|
| Priorytet dnia | `morningBriefing.headline`, `priorityAction` |
| Health Index | `health.index`, `HEALTH_LABEL_PL[health.label]` |
| Zdolność finansowa | `financialCapacity` (score + `recommendation`) lub „Brak danych okazji” |
| Najlepsza okazja | `bestOpportunity` (tytuł, Opp, Strat, decyzja) |
| Prognoza 90 dni | horyzonty 30 / 60 / 90 z `primaryForecastScenario(forecast90)` |

**Action Center (pulpit):** `pickExecutiveActions(center, 3)` — tylko `CRITICAL` i `HIGH`, max **3** pozycje; „Pokaż wszystkie →” i główny przycisk → `onOpenCommandCenter()` (= `onOpenTenders`).

**Ładowanie:** `pipeline.loading` → komunikat „Ładowanie COMMAND CENTER AI…”.

---

## Legacy: `tenderDashStats` (@legacy ETAP 7G)

| Warstwa | Stan |
|---------|------|
| `App.tsx` | `useState` + `useEffect`: `loadTendersPipeline` → `computeTendersDashboardStats` → `enrichTendersDashboardStats` gdy `view ∈ {dashboard, tenders}` |
| `AdminViewRouter` | Przekazuje `tenderDashStats` do `DashboardView` jako `tendersStats` |
| `DashboardView` | Prop zachowany (`void _legacyTendersStats`) — **UI go nie czyta** |

Stary UX („Przetargi BZP” + lista `computeTenderDashboardAlerts`) **zastąpiony** panelem executive w 7G. Stats pozostają do ewentualnego użycia / migracji w przyszłości.

---

## Znane ograniczenia (nie naprawiać w 7G bez polecenia)

1. **Podwójny load pipeline na pulpicie:** `App.tsx` (legacy stats) + `useTendersPipeline` w Providerze — osobne odczyty, ten sam storage.
2. ~~**Trzeci load:** Classic `TendersView`~~ — **naprawione 8.0A** (wspólny pipeline + lekki R1 przy wejściu w Classic).
3. **Bundle:** logika CC w chunku głównym pulpitu (`index-*.js`), nie tylko lazy `TenderCenterProView-*.js`.
4. **PWA / `public/sw.js`:** po deployu możliwy stary cache assetów — hard refresh.
5. **TDZ:** przy zmianach w `OwnerDashboard` / hooku — nie odwoływać się w `useMemo` do zmiennych zadeklarowanych **poniżej** (incydent `Cannot access 'C' before initialization`, fix `b95120a`).
6. **7G.1:** OwnerDashboard — `financialCapacityEnabled: true`; sekcja „Co wymaga uwagi” max 5 + skrót; kolejność: briefing → okazja → capacity → hero → akcje.

---

## ETAPy CC powiązane (kontekst dla AI)

| ETAP | Temat | Gdzie szukać |
|------|--------|--------------|
| 7D | Morning Briefing | `tender-center-morning-briefing.ts`, `MorningBriefingCard.tsx` |
| 7F | Onboarding, słownik, tooltips | `command-center-onboarding.ts`, `HowToUseCommandCenter.tsx`, … |
| 7G | **Executive na pulpicie** | ten plik + `CommandCenterExecutivePanel.tsx` |
| **8.0–8.4** | **Tender → Job (CLOSED)** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.4 · `88c25f8` |
| 5A legacy UI | Nieużywane karty | `docs/tender-center-pro-legacy-components.md` |

---

## Smoke test po deploy 7G

1. Pulpit (konto z przetargami): sekcja **W&G DOM COMMAND CENTER AI**.
2. **Otwórz COMMAND CENTER AI** → zakładka Przetargi, `OwnerDashboard` bez błędu init.
3. Brak: `MetricHelpTooltip is not defined`, `Cannot access before initialization`, failed dynamic import chunka.
4. Action Center na pulpicie: ≤ 3 wpisy CRITICAL/HIGH.

---

## Faza 8 — powiązanie z pulpit (8.3)

- **KPI:** „Wygrane bez roboty” — `won && !linkedJobId` na `snapshot.pipeline.items`
- **CTA:** `TenderJobLinkButtons` + `useTenderJobFromPipeline` (handlery z `AdminViewRouter` → `DashboardView`)
- **Pełny opis:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.4

---

## Changelog git

| Commit | Opis |
|--------|------|
| `88c25f8` | ETAP 8.4 — daty SWZ → draft roboty |
| `9bac507` | ETAP 8.3 — executive Win CTA + KPI |
| `8b6e822` | ETAP 8.2 — baner realizacji kontraktu |
| `dd41581` | ETAP 8.1 — mapowanie draftu z wygranego |
| `5368016` | ETAP 8.0A — jeden pipeline |
| `d1b888e` | ETAP 8.0 — create job z CC |
| `7d49be2` | ETAP 7G — `feat(dashboard): integrate command center executive summary` |
