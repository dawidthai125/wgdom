# WGDOM-DASHBOARD-BODY-S1 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Thin Slice · Visual migration only  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · S1 Braki  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · **bez COMMIT** · **bez PUSH**

---

## 0. Cel

Migracja **wyłącznie** widgetu **Braki dokumentów** (W05) do języka GDS — powierzchnia, hierarchy, typography, badge/chip, CTA secondary, spacing, responsive, tokens.

**Bez** zmiany logiki, liczników, API, semantyki, funkcji ani pozostałych widgetów.

**Referencja wizualna na Pulpicie:** sekcja **Pracuje dziś / Roboty w trakcie** (`WgCard` `elevation="soft"` `padding="sm"` `radius="md"` `!p-0` + header `px-5 py-3.5` + soft body).

---

## 1. Current State

| Element | Dziś | Plik |
|---------|------|------|
| **Warunek renderu** | `jobsMissingDocs.length > 0` | `DashboardView.tsx` ~589 |
| **Anchor** | `id="dashboard-braki-dokumentow"` · `aria-label="Roboty — braki dokumentów"` | ~591–593 |
| **Shell** | Raw `<div className="bg-card border border-border rounded-xl … shadow-sm">` | ~590–593 |
| **Header** | `bg-secondary/20` · ikona amber · title `text-sm font-semibold` · badge `rounded-full` amber bold | ~595–603 |
| **Expand CTA** | Raw `<button>` · `text-primary hover:underline` · `min-h-[44px]` · chevron | ~604–612 |
| **Body** | `border-l-4 border-l-amber-500/50` · hint copy · raw link „Wszystkie roboty →” | ~615–632 |
| **Job rows** | Nested **card-farm**: każdy job = `rounded-xl border` (+ amber tint gdy stale ≥7d) | ~641–645 |
| **Progress** | `h-1.5 rounded-full` + green/yellow/red fill by pct | ~687–694 |
| **Doc chips** | Raw toggles · red/green borders · `min-h-[44px]` · `rounded-md` · lock semantics via `title` | ~695–730 |
| **Footer tip** | Ready-to-close count (gdy `jobsReadyToClose.length > 0`) | ~736–741 |
| **Dane / sort** | `jobsMissingDocsSorted` · `REQUIRED_DOCS` · `toggleJobDocumentOnDashboard` · `isReportSyncedDocLocked` | bez zmian w S1 |
| **KPI link** | `WgKpi` „Braki dokumentów” scroll + `setBrakiExpanded(true)` | **OUT S1** (nie ruszać) |

**Język:** pre-GDS / legacy card — kontrastuje z hero + `WgKpi` + dolnymi `WgCard`.

---

## 2. RCA (S1)

| # | Przyczyna | Skutek |
|---|-----------|--------|
| **R1** | UI-01A/01B świadomie nie reskinowały Braki (tylko KPI/empty/CTA + lekkie transition na expand) | Shell został w `bg-card border rounded-xl shadow-sm` |
| **R2** | Foundation / Guard **OUT** body polish | Braki nie objęte A11Y-01 ani e2e-ui-guard |
| **R3** | Nested job cards = historyczny pattern V3 (czytelność listy) | Łamie UI-01A „zakaz farmy ramek” gdy sekcja już jest kartą |
| **R4** | Badge `rounded-full` + full amber left rail | Wygląd „alert panel” zamiast spokojnej sekcji GDS (jak W08) |

**Werdykt:** gap wizualny / scope — **nie** bug liczników ani logiki docs.

---

## 3. Design (zamrożone decyzje)

### S1-DF-01 — Scope / pliki

| IN | OUT (twarde) |
|----|----------------|
| Blok JSX Braki w `DashboardView.tsx` (~588–745) | Pozostałe widgety (Notatki · Pilne · Przetargi · Pracuje dziś · Roboty · Finanse · Hero · KPI) |
| Import / użycie istniejących `WgCard` · `WgButton` · tokenów (`WG_TOUCH_MIN`, `WG_FOCUS_RING`, `WG_TYPE_*`, `WG_RADIUS_*`, motion) | Nowe komponenty GDS · nowe warianty `Wg*` API |
| ClassName / markup shell · header · rows · chips paint | `toggleJobDocumentOnDashboard` · sort · `REQUIRED_DOCS` · lock rules · `jobsMissingDocs*` derivation |
| | `DashboardPilneUwagiSection` · `DashboardOperationalNotesWidget` · `TendersShortcutPanel` |
| | Payroll CORE · Cloud · Edge · routing API · `dashboard-urgent-today` |
| | Zmiana copy semantycznego (hint może zostać; zakaz nowych funkcji / nowych CTA Primary) |

**Jeden plik implementacji (gdy GO IMPLEMENT):** `src/app/DashboardView.tsx` — wyłącznie sekcja Braki (+ ewentualny import `WgCard`/`WgButton` jeśli jeszcze lokalnie brak w tym bloku; `WgButton` już używany w pliku).

### S1-DF-02 — Shell sekcji

| Element | Zamrożenie |
|---------|------------|
| Root | **`WgCard`** `elevation="soft"` `padding="sm"` `radius="md"` · `className` z `overflow-hidden !p-0` (jak W08) |
| `id` / `aria-label` | **Bez zmian** — `dashboard-braki-dokumentow` · istniejący `aria-label` |
| Warunek mount | **Bez zmian** — tylko gdy `jobsMissingDocs.length > 0` |
| Zakaz | Raw `bg-card border rounded-xl shadow-sm` jako zewnętrzna ramka |

### S1-DF-03 — Header / hierarchy

| Element | Zamrożenie |
|---------|------------|
| Layout | `px-5 py-3.5 border-b border-border/50` · flex wrap · title left · expand right (jak W08 header rhythm) |
| Icon | `FileText` · size ~13–14 · tone **warn**: `text-amber-600 dark:text-amber-400` (zachować sygnalizację braków; nie wymuszać `text-primary` jak W08) |
| Title | `text-sm font-semibold text-foreground` · **bez** `uppercase tracking-wider` · label **bez zmian**: `Roboty → Braki dokumentów` |
| Count badge | Liczba = **`jobsMissingDocs.length`** (semantyka V3) · paint: `text-xs font-semibold` · `bg-amber-500/15 text-amber-700 dark:text-amber-400` · radius **`WG_RADIUS_SM` / `rounded-lg`** — **zakaz** `rounded-full` na badge sekcji |
| Expand control | **`WgButton`** `variant="ghost"` (lub `secondary` outline-thin) · label **bez zmian** („Pokaż szczegóły” / „Ukryj szczegóły”) · chevron zachowany · `aria-expanded` zachowane · `WG_TOUCH_MIN` / min 44px touch |
| Header bg | Prefer `bg-transparent` lub lekki `bg-secondary/20` zgodny z W08 — **bez** nowego gradientu / glass |

### S1-DF-04 — Body / spacing / responsive

| Element | Zamrożenie |
|---------|------------|
| Expanded body padding | `px-4 sm:px-5 py-4` (jak dziś) |
| Amber left rail | **Usuń** `border-l-4 border-l-amber-500/50` — hierarchia przez header + badge, nie drugi „alert frame” |
| Hint copy | Tekst **bez zmian semantycznych** · `text-xs text-muted-foreground leading-relaxed` |
| „Wszystkie roboty →” | **`WgButton` `variant="ghost"`** (secondary language) · **zakaz** `variant="primary"` · ten sam `onNavigate("jobs")` |
| Lista | `space-y-2` / `space-y-2.5` · mobile: pełna szerokość · wrap chips jak dziś (`flex-wrap gap-1.5`) |
| Footer ready-to-close | Zachować warunek i treść · typografia `text-xs` · green muted (tokeny status, nie nowe kolory hex) |

### S1-DF-05 — Job rows (anti card-farm)

| Element | Zamrożenie |
|---------|------------|
| Row surface | **Soft row** wewnątrz sekcji: `rounded-lg` **lub** `border border-border/60` + `bg-secondary/10` / `bg-card/50` — **jedna** lekka ramka wiersza, nie pełna nested card farm jak zewnętrzny shell |
| Stale (≥7d) | Zachować wyróżnienie: `border-amber-500/35 bg-amber-500/5` (lub równoważne tokenowe) — **bez** zmiany progu 7 dni |
| Address button | Ten sam `onNavigate("jobs", job.id)` · title/meta hierarchy: `text-sm font-semibold` + `text-xs text-muted-foreground` |
| Progress ratio badge | `done/REQUIRED_DOCS.length` · JetBrains Mono · status colors green/yellow/red **jak dziś** (semantyka pct) · radius `rounded-md` / `rounded-lg` — nie `rounded-full` pill farm |
| Progress bar | Zachować pct width + color bands · height `h-1`–`h-1.5` · track `bg-border` |

### S1-DF-06 — Doc chips (paint only)

| Element | Zamrożenie |
|---------|------------|
| Zachować | `REQUIRED_DOCS.map` · `checked` / `locked` / `reportLocked` · `title` strings · `toggleJobDocumentOnDashboard` · ikony Check/Circle |
| Touch | `min-h-[44px]` · `WG_TOUCH_MIN` gdzie sensowne · `touch-manipulation` |
| Radius | `WG_RADIUS_SM` / `rounded-md` (jak dziś) |
| Colors | Red = brak · green = odebrane/locked — **te same progi wizualne**; dozwolone lekkie ujednolicenie opacity do tokenów (`bg-*-500/10`–`/15`) |
| Focus | Prefer `WG_FOCUS_RING` / focus-visible na chipach i expand — **bez** zmiany zachowania kliknięcia |
| Zakaz | Nowy komponent chip · zmiana lock rules · zmiana kolejności docs · Primary CTA na chipach |

### S1-DF-07 — CTA / Primary contract

| Reguła | Zamrożenie |
|--------|------------|
| Hero Primary | **Nienaruszony** (Guard T05) |
| W sekcji Braki | Wyłącznie **ghost / secondary / outline** — **zakaz** `WgButton variant="primary"` |
| Empty Primary w W08/W09 | **OUT** — nie ruszać |

### S1-DF-08 — Tokens only

Dozwolone: `WgCard` · `WgButton` · `WG_TOUCH_MIN` · `WG_FOCUS_RING` · `WG_TYPE_*` · `WG_RADIUS_*` · `WG_DURATION_*` / istniejące `transition-colors` · `cn(...)`.

**Zakaz:** nowe ad-hoc kolory poza istniejącym amber/green/yellow/red status language · `text-[9px]` / `text-[10px]` na labelach sekcji · TEUX tokens · nowe glass/glow.

---

## 4. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-1** | Zewnętrzna powierzchnia Braki = **`WgCard`** soft (nie raw `bg-card border rounded-xl shadow-sm`) |
| **AC-2** | Title + count badge widoczne; count = `jobsMissingDocs.length`; **brak** `rounded-full` na badge sekcji |
| **AC-3** | Expand / collapse działa jak dziś (`brakiExpanded` · `aria-expanded` · te same labele) |
| **AC-4** | Klik adresu → `onNavigate("jobs", job.id)` bez zmian |
| **AC-5** | Toggle dokumentu → ta sama funkcja + te same lock/title rules |
| **AC-6** | „Wszystkie roboty →” = secondary/ghost · **nie** Primary |
| **AC-7** | Brak `border-l-4` amber rail na body |
| **AC-8** | Job rows bez pełnej nested card-farm równej zewnętrznemu shellowi (soft rows) |
| **AC-9** | Responsive: chips wrap · touch ≥44px na expand i doc chips |
| **AC-10** | Diff **tylko** sekcja Braki (+ importy) w `DashboardView.tsx` — zero zmian Pilne/Notatki/KPI/Hero |
| **AC-11** | Semantyka: warunek `length > 0` · stale ≥7d · ready-to-close tip · `REQUIRED_DOCS` — bez zmian |
| **AC-12** | Hero / sobota Primary contract niezmieniony (wizualnie + Guard T05 nadal PASS przy PV) |

**PV (po IMPLEMENT — nie w tym etapie):** smoke expand + toggle jednego doc + deep-link adresu; opcjonalnie lokalny screenshot vs W08 header rhythm.

---

## 5. Ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Przypadkowa zmiana semantyki toggle/lock | Średni | Diff review: zero zmian handlerów / `title` / warunków `locked` |
| Card-farm „przemalowana” ale nadal ciężka | Niski | AC-8: soft row ≠ drugi `WgCard` per job |
| Drugi Primary w body | Wysoki wpływ Guard | S1-DF-07 · AC-6 · code review `variant="primary"` w bloku |
| Scope creep do Pilne (ten sam legacy shell) | Średni | AC-10 · OUT lista · osobny S2 |
| Focus ring na chipach zmieni layout | Niski | Tylko `focus-visible` token; bez zmiany paddingu chipów poza tokenami |
| `!p-0` na WgCard psuje padding wewnętrzny | Niski | Skopiować wzorzec W08 header/body padding |

---

## 6. Zakres OUT

| OUT | Powód |
|-----|--------|
| **Logika** `toggleJobDocumentOnDashboard`, sort, filters, stale threshold | Zakaz Owner |
| **Liczniki** KPI Braki · badge ≠ length list | V3 SSOT |
| **API / props** DashboardView · navigate signature | Zakaz |
| **Nowe funkcje** (filtry, bulk toggle, empty state gdy 0 — sekcja i tak unmounted) | Zakaz |
| **W06 Pilne** · **W04 Notatki** · **W07 Przetargi** · **W08–W10** · Hero · KPI strip | Inne slice’y / freeze |
| **`dashboard-urgent-today.ts`** | Nie dotyczy Braki list |
| **Nowe komponenty / nowe Wg\* variants** | Thin slice |
| **Zmiana e2e-ui-guard** (S6) | Po S1–S2 |
| **Payroll / Cloud / Edge / TEUX module** | Safety |
| **IMPLEMENT / COMMIT / PUSH** w tym etapie | Owner: tylko DESIGN FREEZE |

---

## 7. Mapping do AUDIT

| AUDIT | Ten DF |
|-------|--------|
| BODY-01 S1 Braki shell | **Ten dokument** |
| S2 Pilne | OUT |
| PR-P1-3 (A11Y body) | Częściowo pokryte focus tokenami na chipach — **bez** osobnego A11Y EPIC |

---

## 8. Next gate

```text
DESIGN FREEZE (ten dok) → Owner GO IMPLEMENT → thin diff DashboardView Braki only
  → lokalny smoke → Owner GO COMMIT/PUSH (osobno)
```

---

**WGDOM-DASHBOARD-BODY-S1**  
**Etap: DESIGN FREEZE**  
**Status: FROZEN** · implementacja / commit / push — **nie wykonane**
