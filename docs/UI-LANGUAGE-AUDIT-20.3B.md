# Sprint 20.3B — UI Language Policy Audit (Polonizacja statusów i etykiet)

> **Status implementacji CC:** **CLOSED** — Sprint **20.3B+ FULL** · v2.50.43 · `61cb33b` · handoff: [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](SESSION-HANDOFF-20.3B-CC-POLISH.md)  
> **Data audytu:** 2026-06-06  
> **Tryb oryginalny:** AUDYT + PLAN — sekcja **Command Center** zrealizowana w 20.3B MIN + 20.3B+ FULL  
> **Prod baseline (audyt):** v2.46.00 · Sprint 20.3A CLOSED  
> **Zakres skanowania:** Payroll, Employee Leaves, Inspector, Do rozliczenia, Dashboard, Media, Command Center, GuideView, Changelog, Sidebar, Topbar

---

## Spis treści

1. [Podsumowanie wykonawcze](#1-podsumowanie-wykonawcze)
2. [Proponowana polityka: WGDOM UI Language Policy](#2-proponowana-polityka-wgdom-ui-language-policy)
3. [Metodologia audytu](#3-metodologia-audytu)
4. [Wyniki audytu — tabele per obszar](#4-wyniki-audytu--tabele-per-obszar)
5. [Plan implementacji (Sprint 20.3B)](#5-plan-implementacji-sprint-203b)
6. [Ocena ryzyka i zakresu](#6-ocena-ryzyka-i-zakresu)

---

## 1. Podsumowanie wykonawcze

### Stan ogólny

| Obszar | Ocena spójności PL | Uwagi |
|--------|-------------------|-------|
| Lista Płac | **Dobra** | UI prawie w całości po polsku; drobne placeholdery |
| Nieobecności pracowników | **Dobra** | Typy urlopów po polsku; kody wewnętrzne EN OK |
| Inspektor | **Średnia** | Nowy pulpit PL, ale **Action Center** i filtr **Admin** po angielsku |
| Do rozliczenia | **Słaba** | Statusy częściowo PL, ale etykieta **OPEN** i nazewnictwo statusów niezgodne z zasadą biznesową |
| Pulpit (Dashboard) | **Średnia** | Sekcja operacyjna PL; blok COMMAND CENTER mieszany PL/EN |
| Media | **Średnia** | Zakładki PL, nagłówek menu **Media** po angielsku |
| Command Center | **Słaba** | Dużo angielskich metryk, priorytetów, decyzji i nagłówków sekcji |
| GuideView / Changelog | **Średnia** | Instrukcja głównie PL; wplecione terminy produktowe EN + wpisy changelog |
| Sidebar / Topbar | **Dobra** | Menu PL; wyjątek: **Media**, **Lista Płac** (wielka litera — styl, nie język) |

### Kluczowe luki względem zasady użytkownika

Użytkownik podał wzorzec dla statusów recoverable charges:

| Kod (zostaje EN) | UI obecnie | UI docelowo (propozycja) |
|------------------|------------|--------------------------|
| `open` | 🔴 Otwarta / nagłówek **OPEN** | **Do rozliczenia** |
| `partial` | 🟡 Częściowo | **Rozliczone częściowo** |
| `settled` | 🟢 Rozliczona | **Rozliczone** |

**Dodatkowo widoczne dla użytkownika (poza enum):**
- Mini-KPI: etykieta `OPEN` zamiast polskiego nagłówka
- Panel szczegółów: komunikat o **Sprint 20.3B** (warstwa dev, nie biznes)

### Liczba miejsc do poprawy (szacunek)

| Kategoria | Liczba wystąpień UI | Pliki (szac.) | Uwagi |
|-----------|---------------------|---------------|-------|
| **Wysoki priorytet** (statusy, Action Center, OPEN) | **~18** | **~8** | Widoczne codziennie: inspektor, rozliczenia, CC executive |
| **Średni priorytet** (metryki CC, GO/HOLD, priorytety) | **~55** | **~18** | Wiele duplikatów — 1 mapa etykiet naprawia wiele miejsc |
| **Niski priorytet** (changelog historyczny, słownik EN, placeholdery) | **~25** | **~6** | Opcjonalnie w tym samym sprincie lub osobno |
| **Razem (unikalne stringi UI)** | **~98** | **~28–35** | Po centralizacji map etykiet realnie **~20 plików** do edycji |

### Czy można zrobić jednym sprintem?

| Zakres sprintu | Realność | Uwaga |
|--------------|----------|-------|
| **Sprint 20.3B MIN** (Recoverable + Inspector + Sidebar Media + placeholdery Payroll) | **TAK — 1 sprint** | ~2–3 dni dev + smoke |
| **Sprint 20.3B FULL** (+ pełna polonizacja Command Center UI) | **Raczej 1,5 sprintu** | Dużo komponentów CC, teksty dynamiczne w `lib/` |
| **Sprint 20.3B + Changelog retro** | **2 sprinty** | Setki wpisów historycznych — osobna decyzja produktowa |

**Rekomendacja:** jeden sprint na **MIN + środek CC** (metryki i priorytety przez wspólne mapy), changelog i pełna zmiana brandu COMMAND CENTER — backlog.

---

## 2. Proponowana polityka: WGDOM UI Language Policy

### WGDOM UI Language Policy (propozycja dokumentu)

#### 1. Interfejs użytkownika → język polski

Wszystkie elementy widoczne dla właściciela, inspektora i pracownika są po polsku:

- nagłówki, przyciski, zakładki, menu boczne i górne
- placeholdery pól formularzy
- podpowiedzi (`title`, `aria-label`, tooltips)
- komunikaty toast i błędów walidacji
- puste stany („Brak danych…")
- etykiety KPI i filtrów

#### 2. Statusy biznesowe → język polski

Statusy prezentowane użytkownikowi mają polskie nazwy, niezależnie od kodu wewnętrznego:

| Warstwa | Język | Przykład |
|---------|-------|----------|
| Kod / typ TS | EN (bez zmian) | `RecoverableChargeStatus = "open" \| "partial" \| "settled"` |
| UI | PL | Do rozliczenia / Rozliczone częściowo / Rozliczone |
| KV / API | EN (bez zmian) | `kw-recoverable-charges`, pole `status: "open"` |

To samo dotyczy: rozliczenia listy płac (Oczekuje / Rozliczony), nieobecności (Urlop / Chorobowe / Bezpłatny), decyzji przetargowych (mapowanie GO → Startuj itd.).

#### 3. Komunikaty błędów → język polski

Komunikaty `toast.error`, `window.confirm`, walidacja formularzy i `ViewErrorBoundary` — wyłącznie po polsku. Treść techniczna (stack trace) nie trafia do UI.

#### 4. Kod i modele → mogą być po angielsku

Bez zmian:

- nazwy funkcji, zmiennych, typów TypeScript
- klucze KV i pola JSON
- identyfikatory statusów w danych (`open`, `in_progress`, `GO`)
- komentarze w kodzie i nazwy sprintów w commitach

#### 5. Wyjątki i nazwy własne (świadome)

| Wyjątek | Zasada | Przykład |
|---------|--------|----------|
| **Nazwa produktu / marki** | Może pozostać EN jeśli świadoma decyzja biznesowa | „COMMAND CENTER AI" jako marka modułu przetargów |
| **Skróty branżowe powszechne w PL** | Dozwolone | BZP, SWZ, PDF, ZIP, PLN, KPI (jako skrót — z rozwinięciem w instrukcji) |
| **Adresy przykładowe** | Polski format | `odbiorca@firma.pl` zamiast `example.com` |
| **Changelog** | Opis zmian dla użytkownika po polsku; identyfikatory techniczne w nawiasie lub osobno | „Rejestr do rozliczenia (open/partial/settled)" |
| **Instrukcja dla power-userów** | KV keys w `<code>` — OK; etykieta menu po polsku | `kw-recoverable-charges` w pomocy, menu „Do rozliczenia" |

#### 6. Implementacja — jedna mapa etykiet na domenę

Wzorzec już stosowany w projekcie:

```ts
// Kod EN — bez zmian
export type RecoverableChargeStatus = "open" | "partial" | "settled";

// UI PL — jedna mapa
export const RECOVERABLE_CHARGE_STATUS_LABELS: Record<RecoverableChargeStatus, string> = {
  open: "Do rozliczenia",
  partial: "Rozliczone częściowo",
  settled: "Rozliczone",
};
```

Komponenty **nie** renderują surowych enumów (`GO`, `CRITICAL`, `open`) — zawsze przez `*Label` / `*LabelPL`.

#### 7. QA językowe

- Smoke testy: brak regresji funkcjonalnej; opcjonalny grep na znane angielskie etykiety UI (whitelist marki)
- Przegląd ręczny: właściciel + inspektor na telefonie i desktopie
- Checklist przy każdym nowym module: „czy enum jest widoczny w UI?"

---

## 3. Metodologia audytu

- Przeskanowano `src/app/**` i `src/lib/**` pod kątem stringów widocznych w UI (JSX, mapy etykiet, toasty, placeholdery).
- **Pominięto:** typy TS, nazwy funkcji, klucze KV, komentarze kodu, klasy CSS (`group-open`), ścieżki plików.
- **Obszary zgodnie z zadaniem:** Payroll, Employee Leaves, Inspector, Do rozliczenia, Dashboard, Media, Command Center, GuideView, Changelog, Sidebar, Topbar.
- Dla każdego wpisu: **Aktualnie (UI) → Propozycja PL → Lokalizacja**.

---

## 4. Wyniki audytu — tabele per obszar

### 4.1 Do rozliczenia (Recoverable Charges)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| OPEN (nagłówek mini-KPI) | Do rozliczenia (lub: Otwarte pozycje) | `src/app/RecoverableChargesView.tsx` |
| 🔴 Otwarta | Do rozliczenia | `src/lib/recoverable-charges.ts` → `RECOVERABLE_CHARGE_STATUS_LABELS.open` |
| 🟡 Częściowo | Rozliczone częściowo | `src/lib/recoverable-charges.ts` → `partial` |
| 🟢 Rozliczona | Rozliczone | `src/lib/recoverable-charges.ts` → `settled` |
| Workflow rozliczeń… — Sprint 20.3B. Na tym etapie panel tylko do odczytu. | Powiązanie z fakturami będzie dostępne w kolejnej wersji. Na razie panel służy tylko do podglądu. | `src/app/RecoverableChargesView.tsx` (ChargeDetailPanel) |
| placeholder tagów: `materiał, gwarancja, VO` | `materiał, gwarancja, zlecenie dodatkowe` (VO = ang. variation order) | `src/app/RecoverableChargesView.tsx` |
| Statusy 🔴🟡🟢: Otwarta / Częściowo / Rozliczona (instrukcja) | Do rozliczenia / Rozliczone częściowo / Rozliczone | `src/app/GuideView.tsx` (sekcja recoverable-charges) |

**Uwaga:** Po zmianie etykiet zaktualizować smoke `scripts/smoke-test-recoverable-charges-20.3a.mjs` jeśli asercje szukają starych tekstów.

---

### 4.2 Lista Płac (Payroll)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| odbiorca@example.com | odbiorca@firma.pl | `src/app/PayrollView.tsx` (modal email) |
| Rozlicz. / Oczek. (skrót mobile) | Rozliczony / Oczekuje (lub zostawić skróty jeśli brak miejsca — spójnie z wersją desktop) | `src/app/PayrollView.tsx` |

**Stan pozytywny (bez zmian):** Sumy, Szczegóły dni, Oczekuje, Rozliczony, Zapisz tydzień, komunikaty backlog — po polsku.

---

### 4.3 Nieobecności pracowników (Employee Leaves)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| URLOP / CHOROBOWE / BEZPŁATNY (wielkie litery w kolumnie status) | Urlop / Chorobowe / Bezpłatny (spójność z selectem) | `src/lib/employee-leaves.ts` → `LEAVE_TYPE_LABELS` |

**Stan pozytywny:** Formularz, typy w select (Urlop, Chorobowe, Bezpłatny), overlay na liście płac — PL.

---

### 4.4 Inspektor (Inspector)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Action Center (nagłówek sekcji) | Centrum działań | `src/app/InspectorDashboard.tsx` |
| …spraw w Action Center · … | …spraw w centrum działań · … | `src/app/InspectorDashboard.tsx` (podtytuł powitalny) |
| 1 sprawa wymaga działania — Action Center poniżej. | 1 sprawa wymaga działania — centrum działań poniżej. | `src/app/InspectorDashboard.tsx` |
| max 3 | maks. 3 | `src/app/InspectorDashboard.tsx` |
| Admin (filtr alertów) | Od administratora | `src/app/InspectorDashboard.tsx` → `FILTER_OPTIONS` |
| Action Center (w instrukcji) | Centrum działań | `src/app/GuideView.tsx` (sekcja inspektor) |

**Stan pozytywny:** KPI (Aktywne, Wymagają uwagi…), Dzisiaj i wkrótce, dokumenty, toasty PDF — PL.

---

### 4.5 Pulpit (Dashboard) + skrót Command Center

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| W&G DOM — Przetargi Strategia (nagłówek sekcji) | *Marka — decyzja produktowa* albo: **Centrum dowodzenia W&G DOM** | `src/app/tenders/strategy/branding.ts` |
| Ładowanie COMMAND CENTER AI… | Ładowanie centrum dowodzenia… | `src/app/tenders/strategy/components/CommandCenterExecutivePanel.tsx` |
| Health Index | Indeks kondycji | `CommandCenterExecutivePanel.tsx`, `TendersStrategyHero.tsx`, `CompanyHealthCard.tsx`, `MetricHelpTooltip.tsx` |
| Action Center | Centrum działań | `CommandCenterExecutivePanel.tsx` |
| CRITICAL · HIGH | Krytyczne · Wysokie | `CommandCenterExecutivePanel.tsx` |
| {item.priority} surowe (CRITICAL, HIGH…) | Mapa `ACTION_PRIORITY_LABEL_PL` | `CommandCenterExecutivePanel.tsx`, `ActionCenter.tsx` |
| Opp {score} · Strat {score} | Okazja {score} · Strategiczny {score} | `CommandCenterExecutivePanel.tsx` |
| {bestOpportunity.decision} surowe GO/HOLD/NO-GO | Etykieta PL (`DECISION_LABEL_PL`) | `CommandCenterExecutivePanel.tsx` |
| Otwórz COMMAND CENTER AI | Otwórz centrum dowodzenia | `CommandCenterExecutivePanel.tsx` |
| Super Admin: kliknij, aby zmienić status | Superadministrator: kliknij… | `src/app/DashboardView.tsx` (tooltip dokumentów) |

---

### 4.6 Media

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Media (nagłówek widoku) | Zdjęcia i pliki | `src/app/MediaView.tsx` |
| Media (pozycja menu) | Zdjęcia i pliki | `src/app/admin/admin-nav.ts` |
| Media (error boundary) | Zdjęcia i pliki | `src/app/admin/AdminViewRouter.tsx` |
| Media — zdjęcia i pliki (instrukcja) | Zdjęcia i pliki | `src/app/GuideView.tsx` |

**Stan pozytywny:** Zakładki Zdjęcia / Pliki, opisy, chipy plików — PL.

---

### 4.7 Command Center (pełny moduł)

#### Nagłówki i sekcje

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Action Center | Centrum działań | `ActionCenter.tsx` |
| Co wymaga uwagi — max 5 · CRITICAL · HIGH | Co wymaga uwagi — maks. 5 · krytyczne · wysokie | `ActionCenter.tsx` |
| AI Insights (accordion) | Wnioski AI / Podsumowanie AI | `OwnerDashboard.tsx` |
| Explainability | Wyjaśnienia scoringu | `OwnerDashboard.tsx` |
| KPI rynku | Wskaźniki rynku | `OwnerDashboard.tsx` (już częściowo PL) |
| Pipeline ofert | Lejek ofert | `OpportunityOverview.tsx` |
| Odśwież pipeline z BZP | Odśwież listę przetargów z BZP | `BestOpportunityCard.tsx` |

#### Metryki i score (powtarzalne w wielu komponentach)

| Aktualnie (UI) | Propozycja PL | Lokalizacja (główne) |
|----------------|---------------|----------------------|
| Health Index | Indeks kondycji | `MetricHelpTooltip.tsx`, `TendersStrategyHero.tsx`, `ImpactPanel.tsx`, `CommandCenterExplainability.tsx` |
| Opportunity Score / Opportunity | Wynik okazji / Okazja | `MetricHelpTooltip.tsx`, `BestOpportunityCard.tsx`, `OpportunityRadar.tsx` |
| Strategic Score / Strategic | Wynik strategiczny / Strategiczny | j.w. |
| Impact Score | Wynik wpływu | `MetricHelpTooltip.tsx`, `ImpactPanel.tsx` |
| Financial Capacity / Financial Capacity Score | Zdolność finansowa / Wynik zdolności finansowej | `MetricHelpTooltip.tsx`, `FinancialCapacityPanel.tsx` |
| Growth Mode | Tryb rozwoju | `TendersStrategyHero.tsx`, `CommandCenterGlossary.tsx` |
| Forecast 90 dni | Prognoza 90 dni | OK — tytuł PL; treść help PL |
| Morning Briefing | Poranny briefing | `HowToUseCommandCenter.tsx`, `CommandCenterGlossary.tsx` |
| Insight (etykieta bloku) | Wniosek | `MorningBriefingCard.tsx` |
| Health Impact | Wpływ na kondycję | `ImpactPanel.tsx` |
| Forecast Impact | Wpływ na prognozę | `ImpactPanel.tsx` |
| Cash Flow Impact | Wpływ na przepływy | `ImpactPanel.tsx` |
| Team Impact | Wpływ na zespół | `ImpactPanel.tsx` |
| Contract Scale | Skala kontraktu | `ImpactPanel.tsx` |
| Scenariusz C · 50% GO | Scenariusz C · 50% startów | `TendersStrategyForecastStrip.tsx` |

#### Decyzje i liczniki

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Przyciski GO / HOLD / NO-GO | Startuj / Analizuj / Odpuszczaj *(istnieje `DECISION_LABEL_PL`)* | `BestOpportunityCard.tsx`, `DecisionCenter.tsx`, `DecisionHistory.tsx`, `TenderPortfolioCounters.tsx` |
| Liczniki GO / HOLD / NO-GO | Startuj / Analizuj / Odpuszczaj | `TenderPortfolioCounters.tsx`, `DecisionHistory.tsx` |
| subtitle: GO / HOLD / NO-GO wg scoringu… | Startuj / Analizuj / Odpuszczaj wg scoringu… | `TenderPortfolioCounters.tsx` |
| {bundle.decision} surowe w badge | `DECISION_LABEL_PL[decision]` lub „GO (Startuj)" | `BestOpportunityCard.tsx`, `OpportunityRadar.tsx` |
| CRITICAL / HIGH / MEDIUM / LOW (liczniki) | Krytyczne / Wysokie / Średnie / Niskie | `ActionCenter.tsx` → `PriorityCounters` |
| {item.priority} w badge akcji | `ACTION_PRIORITY_LABEL_PL` | `ActionCenter.tsx`, `CommandCenterExecutivePanel.tsx` |

#### Słownik (nagłówki terminów EN)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Terminy: Health Index, Opportunity Score… (nagłówki `<summary>`) | Polskie nagłówki + opis PL (treść już PL) | `CommandCenterGlossary.tsx` |

#### Teksty dynamiczne (generowane, widoczne w UI)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Opportunity ${score}, decyzja systemu ${decision} | Okazja ${score}, decyzja systemu ${etykietaPL} | `src/lib/tenders-strategy-action-center.ts` |
| pipeline.submittingOffersDate · Radar okazji | Termin składania · Radar okazji | `tender-center-action-center.ts` (pole `source`) |
| Health Index krytyczny | Indeks kondycji krytyczny | `tender-center-action-center.ts` |
| …przetargów GO bez decyzji… | …przetargów „Startuj" bez decyzji… | `tender-center-action-center.ts` |
| Najczęściej wybierasz decyzję GO/HOLD/NO-GO | …Startuj / Analizuj / Odpuszczaj | `src/lib/tenders-strategy-ai-insights.ts` |
| Średni Opportunity Score… | Średni wynik okazji… | `tender-center-ai-insights.ts` |
| GO < 35% — ostrożna selekcja | Startuj < 35% — ostrożna selekcja | `OwnerProfilePanel.tsx` |

---

### 4.8 Sidebar (menu boczne)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Media | Zdjęcia i pliki | `src/app/admin/admin-nav.ts` |
| Lista Płac | Lista płac *(opcjonalnie — styl wielkich liter, nie angielski)* | `admin-nav.ts` |

**Stan pozytywny:** Pulpit, Grafik, Pracownicy, Do rozliczenia, Inspektor, hinty PL — OK.

---

### 4.9 Topbar (górny pasek)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Eksportuj backup / Importuj backup | OK (PL) | `AdminTopbar.tsx` |
| Zapisz tydzień / sync tooltips | OK (PL) | `AdminTopbar.tsx` |
| {n} prac. | {n} prac. — akceptowalny skrót | `AdminTopbar.tsx` |

**Brak istotnych angielskich etykiet** poza nazwą marki w logo alt „W&G DOM".

---

### 4.10 GuideView (Instrukcja)

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| Pipeline zapisuje się… (`kw-tenders-pipeline`) | Lejek przetargów zapisuje się… *(KV w `<code>` OK)* | `GuideView.tsx` |
| Lejek pipeline | Lejek przetargów | `GuideView.tsx` |
| COMMAND CENTER AI (wielokrotnie) | Centrum dowodzenia *(lub zostawić markę)* | `GuideView.tsx` |
| Action Center | Centrum działań | `GuideView.tsx` |
| Media | Zdjęcia i pliki | `GuideView.tsx` |
| Super Admin / Super Administrator | Superadministrator *(spójność)* | `GuideView.tsx`, `DashboardView.tsx` |
| payroll działa jak dotychczas | lista płac działa jak dotychczas | `GuideView.tsx` (recoverable FAQ) |
| auto-sync | automatyczna synchronizacja | `GuideView.tsx` |

---

### 4.11 Changelog (Historia zmian — UI użytkownika)

Wpisy w `changelog-data.ts` są **czytane przez użytkownika** w `GuideView` → ChangelogView.

| Aktualnie (UI) | Propozycja PL | Lokalizacja |
|----------------|---------------|-------------|
| open / partial / settled (w opisie 2.46.00) | do rozliczenia / rozliczone częściowo / rozliczone | `src/app/changelog-data.ts` (najnowszy wpis) |
| Action Center (max 3) | Centrum działań (maks. 3) | `changelog-data.ts` |
| COMMAND CENTER AI (wielokrotnie w 2.45.x) | Centrum dowodzenia AI *(lub marka)* | `changelog-data.ts` |
| Menu Media | Menu Zdjęcia i pliki | `changelog-data.ts` |
| Sprint 20.3A (w label) | Usunąć z etykiety widocznej / przenieść do commit message | `changelog-data.ts` |

**Uwaga:** Pełna retro-polonizacja setek historycznych wpisów to **osobny zakres** — rekomendacja: od wersji 2.46 w górę + polityka dla nowych wpisów.

---

## 5. Plan implementacji (Sprint 20.3B)

### Faza A — Szybkie wygrane (1–2 dni) — **MUST**

| # | Zadanie | Pliki | Test |
|---|---------|-------|------|
| A1 | Statusy recoverable + usunięcie OPEN / Sprint note | `recoverable-charges.ts`, `RecoverableChargesView.tsx`, `GuideView.tsx` | smoke recoverable |
| A2 | Inspector: Action Center → Centrum działań, Admin → Od administratora | `InspectorDashboard.tsx`, `GuideView.tsx` | smoke inspector |
| A3 | Sidebar + MediaView + AdminViewRouter: Media → Zdjęcia i pliki | `admin-nav.ts`, `MediaView.tsx`, `AdminViewRouter.tsx` | manual nav |
| A4 | Payroll placeholder email | `PayrollView.tsx` | — |

### Faza B — Command Center: mapy etykiet (2–3 dni) — **SHOULD**

| # | Zadanie | Pliki | Test |
|---|---------|-------|------|
| B1 | Nowy plik `src/lib/ui-labels-pl.ts` lub rozszerzenie istniejących map: metryki CC, priorytety (już częściowo są) | `tender-center-action-center.ts`, nowy moduł | unit optional |
| B2 | Podmiana renderów: `item.priority` → `ACTION_PRIORITY_LABEL_PL` | `ActionCenter.tsx`, `CommandCenterExecutivePanel.tsx` | CC smoke |
| B3 | Przyciski decyzji: wyświetlać `DECISION_LABEL_PL` zamiast GO/HOLD/NO-GO | `BestOpportunityCard.tsx`, `TenderPortfolioCounters.tsx`, `DecisionHistory.tsx` | manual CC |
| B4 | Metryki: Health Index → Indeks kondycji itd. | `MetricHelpTooltip.tsx`, `TendersStrategyHero.tsx`, `FinancialCapacityPanel.tsx`, `ImpactPanel.tsx`, `BestOpportunityCard.tsx` | visual QA |
| B5 | Teksty dynamiczne action-center + ai-insights | `tender-center-action-center.ts`, `tender-center-ai-insights.ts` | CC briefing |

### Faza C — Dokumentacja i changelog (0,5–1 dzień) — **COULD**

| # | Zadanie | Pliki |
|---|---------|-------|
| C1 | Dodać `docs/WGDOM-UI-LANGUAGE-POLICY.md` (sekcja 2 tego raportu) | nowy doc |
| C2 | Zaktualizować najnowsze wpisy `changelog-data.ts` | changelog |
| C3 | `GuideView.tsx` — spójność terminów po Fazie A+B | guide |

### Faza D — Świadome wyjątki (decyzja właściciela)

| Temat | Opcje |
|-------|-------|
| Marka **COMMAND CENTER AI** | A) Zostaje (wyjątek w polityce) B) PL: „Centrum dowodzenia W&G DOM" |
| Skrót **KPI** | Zostaje vs „Wskaźniki" |
| GO/HOLD/NO-GO na przyciskach | A) Tylko PL B) Dwujęzycznie „GO · Startuj" |

---

## 6. Ocena ryzyka i zakresu

### Podsumowanie LOW / MEDIUM / HIGH

| Poziom | Liczba miejsc do poprawy | Obszary | Uwagi |
|--------|--------------------------|---------|-------|
| **LOW** | **~22** | Recoverable statusy, Inspector Action Center, Media menu, Payroll placeholder, filtr Admin | Izolowane zmiany, małe pliki, niskie ryzyko regresji |
| **MEDIUM** | **~55** | Command Center metryki, priorytety, decyzje, ImpactPanel, teksty `lib/` | Wymaga wspólnych map etykiet; użytkownicy CC przyzwyczajeni do EN terminów |
| **HIGH** | **~21** | Zmiana marki COMMAND CENTER, retro-changelog 2.9–2.45, masowa zmiana GO/HOLD w historii AI Insights | Decyzja produktowa + duży diff + ryzyko rozjazdu z dokumentacją zewnętrzną |

### Szacowany zakres zmian (FULL)

| Metryka | Wartość |
|---------|---------|
| Pliki do edycji | **28–35** (FULL) / **8–12** (MIN) |
| Linie diff (szac.) | **+400 / −200** (FULL) / **+120 / −60** (MIN) |
| Nowe pliki | 1 (`ui-labels-pl.ts` lub policy doc) |
| Testy do uruchomienia | `npm run build`, smoke recoverable, smoke inspector, smoke prod closeout, ręczny CC |
| Breaking change dla danych | **Brak** (tylko prezentacja) |

### Czy jeden sprint wystarczy?

| Wariant | Odpowiedź |
|---------|-----------|
| **20.3B MIN** (LOW + część MEDIUM: A1–A4 + B2 + B4 skrót) | **TAK** — 1 sprint (~5–8 plików, 1–2 dni QA) |
| **20.3B FULL** (LOW + MEDIUM + C) | **1 sprint z nadgodzinami** lub **1,5 sprintu** — rekomendowane **1,5** dla jakości CC |
| **+ retro changelog + zmiana marki** | **NIE** w jednym sprincie z FULL — osobny **20.3C** |

### Ryzyka implementacyjne

1. **Smoke testy** mogą szukać angielskich stringów — zaktualizować asercje po polonizacji.
2. **Duplikacja etykiet** — bez centralnej mapy regresja wróci w kolejnym module.
3. **Marka COMMAND CENTER** — zmiana może mylić właściciela jeśli materiały szkoleniowe używają EN.
4. **GO/HOLD/NO-GO** — kod decyzji zostaje EN; tylko UI — upewnić się, że nigdzie nie porównujemy wyświetlanego tekstu z enum.

---

## Załącznik: pliki priorytetowe do edycji

```
src/lib/recoverable-charges.ts
src/app/RecoverableChargesView.tsx
src/app/InspectorDashboard.tsx
src/app/admin/admin-nav.ts
src/app/MediaView.tsx
src/app/admin/AdminViewRouter.tsx
src/app/PayrollView.tsx
src/app/tenders/strategy/components/ActionCenter.tsx
src/app/tenders/strategy/components/CommandCenterExecutivePanel.tsx
src/app/tenders/strategy/components/TendersStrategyHero.tsx
src/app/tenders/strategy/components/BestOpportunityCard.tsx
src/app/tenders/strategy/components/MetricHelpTooltip.tsx
src/app/tenders/strategy/components/FinancialCapacityPanel.tsx
src/app/tenders/strategy/components/ImpactPanel.tsx
src/app/tenders/strategy/components/TenderPortfolioCounters.tsx
src/app/tenders/strategy/components/OwnerDashboard.tsx
src/lib/tenders-strategy-action-center.ts
src/lib/tenders-strategy-ai-insights.ts
src/app/GuideView.tsx
src/app/changelog-data.ts (najnowsze wpisy)
```

---

*Koniec raportu audytu 20.3B — bez implementacji, bez commitów.*
