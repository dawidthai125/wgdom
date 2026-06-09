# Sprint 20.3B+ FULL — Polonizacja COMMAND CENTER (handoff dla AI)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Stan prod (2026-06-09)

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.50.43** |
| **Prod `origin/main`** | **`61cb33b`** — `feat(ui): complete command center polish translation pack (20.3B+)` |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Deploy** | GitHub **`4987528369`** — **SUCCESS** |
| **Poprzedni release** | v2.50.42 · `d3874ad` · Billing Evidence Pack (20.5A.5) |

---

## Release 2.50.43 — 20.3B+ FULL (**CLOSED**)

| Element | Opis |
|---------|------|
| **Cel** | Pełna polonizacja **aktywnego** COMMAND CENTER (P0 + P1 z audytu) |
| **Marka** | **COMMAND CENTER AI** — **bez zmian** (świadomy wyjątek językowy) |
| **Enumy danych** | `GO` / `HOLD` / `NO-GO` — **bez zmian** w modelu, KV, scoringu |
| **UI decyzji** | `DECISION_LABEL_PL`: STARTUJ / ANALIZUJ / ODPUŚĆ |
| **Centralizacja** | `src/lib/tender-center-ui-labels-pl.ts` — mapy metryk, sekcji, słownika |
| **Poza scope** | `ImpactPanel`, `OpportunityRadar`, `CompanyHealthCard`, `Forecast90Days` (legacy, nie montowane) |

### Smoke

| Skrypt | Wynik |
|--------|-------|
| `smoke-test-ui-language-20.3b-full.mjs` | **39/39 PASS** |
| `smoke-test-ui-language-20.3b.mjs` | **31/31 PASS** (regresja MIN) |
| `smoke-prod-bundle-2.50.43.mjs` | **ALL PASS** (obie domeny) |

### Łańcuch polonizacji UI

| Sprint | Wersja | Commit | Skrót |
|--------|--------|--------|-------|
| **20.3B MIN** | 2.49.90 | `3d6a63e` | Pulpit CC częściowo, recoverable, inspektor, Media |
| **20.3B+ FULL** | **2.50.43** | **`61cb33b`** | Pełny CC aktywny + lib dynamiczne + accordion + słownik |

Audyt wejściowy: [`docs/UI-LANGUAGE-AUDIT-20.3B.md`](UI-LANGUAGE-AUDIT-20.3B.md) — sekcja CC **zrealizowana** w 20.3B+.

---

## Architektura etykiet UI (20.3B+)

```text
src/lib/tender-center-ui-labels-pl.ts   ← źródło prawdy etykiet PL (prezentacja)
  ├── METRIC_LABEL_PL          (Indeks kondycji, Wynik okazji, …)
  ├── OPPORTUNITY_LABEL_PL / STRATEGIC_LABEL_PL / IMPACT_LABEL_PL
  ├── FINANCIAL_LABEL_PL / BASELINE_LABEL_PL / PIPELINE_LABEL_PL
  ├── SECTION_LABEL_PL         (Wnioski AI, Wyjaśnienia scoringu, …)
  └── GLOSSARY_TERM_PL         (nagłówki słownika)

Reuse (bez duplikacji):
  DECISION_LABEL_PL            ← tender-center-decision.ts
  ACTION_PRIORITY_LABEL_PL     ← tender-center-action-center.ts
  HEALTH_LABEL_PL              ← tender-center-health.ts
  CONTRACT_SCALE_LABEL_PL      ← tender-center-impact.ts
```

**Zasada dla agentów:** nowe user-facing stringi w CC → najpierw mapa w `tender-center-ui-labels-pl.ts`, potem import w komponencie/lib. **Nie** porównywać wyświetlanego tekstu z enumem `GO`/`HOLD`/`NO-GO`.

---

## Struktura aplikacji — nawigacja admina

Router: `src/app/admin/AdminViewRouter.tsx` · menu: `src/app/admin/admin-nav.ts`

| `View` key | Etykieta UI | Komponent główny | Uwagi |
|------------|-------------|------------------|-------|
| `dashboard` | Pulpit | `DashboardView.tsx` | CC executive (`CommandCenterExecutivePanel`) gdy `canViewTenders` |
| `payroll` | Lista Płac | `PayrollView.tsx` | Carry 20.1A–20.1D, odroczenia |
| `schedule` | Grafik | *(w App.tsx)* | Tydzień Pn–So |
| `directory` | Pracownicy | *(w App.tsx)* | Kartoteka |
| `contacts` | Kontakty | *(w App.tsx)* | E-mail |
| `archive` | Archiwum | *(w App.tsx)* | Zapisane tygodnie |
| `jobs` | Roboty | `JobsView.tsx` | MID-B kolejki, UX 2.50.x, billing panel |
| `inspector` | Inspektor | `InspectorAdminView.tsx` | Feed zmian inspektora |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` | Sprint 20.3A–20.4C |
| `media` | Zdjęcia i pliki | `MediaView.tsx` | 20.3B MIN polonizacja |
| `guide` | Zmiany/Instrukcja | `GuideView.tsx` | Changelog + help |
| `tenders` | Przetargi | `TenderCenterProView.tsx` | CC pełny + widok klasyczny BZP |

**Mobile bottom nav (primary):** Pulpit · Lista Płac · Grafik · Roboty — reszta w „Więcej”.

**Provider CC:** `CommandCenterProvider` owija `dashboard` i `tenders` gdy `canViewTendersNav` — **jeden** pipeline BZP na sesję.

---

## COMMAND CENTER — struktura widoków

### A. Pulpit executive (skrót 7G)

`DashboardView` → `CommandCenterExecutivePanel`

| Sekcja UI | PL (po 20.3B+) |
|-----------|----------------|
| Nagłówek marki | W&G DOM COMMAND CENTER AI |
| Priorytet dnia | Morning briefing (dynamiczny PL) |
| Karta 1 | Indeks kondycji |
| Karta 2 | Zdolność finansowa |
| Karta 3 | Najlepsza okazja (Okazja · Strategiczny · STARTUJ/…) |
| Karta 4 | Prognoza 90 dni |
| Lista | Centrum działań (max 3, Krytyczne/Wysokie) |
| CTA | Otwórz COMMAND CENTER AI |

### B. Przetargi → tryb COMMAND CENTER AI

`TenderCenterProView` → toggle **COMMAND CENTER AI** | **Widok klasyczny przetargów** → `OwnerDashboard`

**Kolejność sekcji (góra → dół):**

1. `CommandCenterBrandHeader` + odśwież BZP
2. `MorningBriefingCard` — Codzienny raport właściciela
3. `BestOpportunityCard` — Okazja / Strategiczny / decyzja systemu (PL)
4. `FinancialCapacityPanel` — Wynik zdolności finansowej
5. `CommandCenterHero` — Indeks kondycji + Tryb rozwoju
6. `ActionCenter` (variant urgent) — Co wymaga uwagi
7. `ForecastCommandStrip` — Prognoza firmy · Scenariusz C · 50% startów
8. `WhatIfPanel` — Co jeśli? · Stan bazowy
9. `TenderPortfolioPanel` — Portfel (STARTUJ/ANALIZUJ/ODPUŚĆ) + Historia decyzji
10. **Accordion „Pozostałe analizy”:**
    - Wnioski AI
    - KPI rynku (Lejek ofert, Rezerwa wadium, …)
    - Alerty
    - Wyjaśnienia scoringu
    - Pamięć decyzji
    - Profil właściciela
    - Jak korzystać z COMMAND CENTER AI
    - Słownik pojęć COMMAND CENTER AI
    - O COMMAND CENTER AI

**Dialogi:** `CommandCenterWelcomeDialog`, `LearningReasonDialog` (powód decyzji).

### C. Pliki lib (teksty dynamiczne PL)

| Plik | Rola |
|------|------|
| `tender-center-action-center.ts` | Tytuły/ reason akcji (Indeks kondycji, lejek, starty) |
| `tender-center-morning-briefing.ts` | Briefing, status okazji |
| `tender-center-explain.ts` | Explainability + alerty strategiczne |
| `tender-center-ai-insights.ts` | Wnioski AI (highlights/warnings/strengths) |
| `tender-center-financial-capacity.ts` | Mocne strony finansowe |
| `tender-center-what-if.ts` | Presety scenariuszy (Stan bazowy) |

### D. Legacy (nie montowane — **nie polonizować** bez polecenia)

`ImpactPanel.tsx`, `OpportunityRadar.tsx`, `CompanyHealthCard.tsx`, `Forecast90Days.tsx` — lista: [`tender-center-pro-legacy-components.md`](tender-center-pro-legacy-components.md).

---

## Następny backlog (tylko na polecenie)

| Opcja | Opis |
|-------|------|
| **20.5A.6** | Inspektor tworzy pozycję billing / polish evidence |
| **20.3C** | Legacy CC components + GuideView CC strings + retro-changelog |
| **Roboty 2.0 FULL** | Pełna implementacja audytu jobs |

**Nie zmieniaj bez polecenia:** enumy decyzji, marka COMMAND CENTER AI, KV/sync/scoring, model billing evidence 20.5A.5.
