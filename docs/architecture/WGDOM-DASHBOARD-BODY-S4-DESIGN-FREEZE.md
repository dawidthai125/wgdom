# WGDOM-DASHBOARD-BODY-S4 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Thin Slice · Visual migration only  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · S4 Przetargi skrót · po **S1–S3** (`1cf8af2` · `e2e1c58` · `ca08c75`)  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · **bez COMMIT** · **bez PUSH**

---

## 0. Cel

Migracja **wyłącznie** widgetu **Przetargi — skrót** (W07) do języka GDS **zgodnego ze shipped S1–S3**:

- `WgCard` soft  
- spójna typografia i spacing  
- CTA wyłącznie **ghost / secondary** (**zakaz Primary** — audyt BODY-01 / Guard T05)  
- zachowanie obecnych danych, liczników i nawigacji (`handleOpenStrategy` / `onOpenTendersStrategy`)

**Bez** zmiany logiki pipeline/scoring, API, `DashboardView`, innych widgetów, nowych funkcji.

**Referencja wizualna:** S1–S3 — `WgCard` soft · `padding="sm"` · **bez** `!p-0` · title `text-sm font-semibold` · CTA ghost/secondary.

---

## 0.1 Plik implementacji

| Rola | Plik |
|------|------|
| **IN (implement)** | `src/app/tenders/components/TendersShortcutPanel.tsx` |
| **Mount only** | `DashboardView.tsx` ~795–797 — `{canViewTenders && onOpenTenders && <TendersShortcutPanel … />}` |
| **DashboardView** | **OUT S4** — zero zmian ACL / props |
| **TEUX module / Strategia** | **OUT** — pełny moduł Przetargi nie w scope |
| **Tokens TEUX** | `tender-ux-tokens` — **OUT z paintu Pulpitu** (nie importować do skrótu po migracji) |

---

## 1. Current State

| Element | Dziś | Plik · ok. |
|---------|------|------------|
| **Warunek mount** | `canViewTenders && onOpenTenders` w parent | `DashboardView` — OUT |
| **Props** | `onOpenTendersStrategy: () => void` | panel |
| **Context** | `useTendersContext()` → `snapshot` · `ownerDecisions` · `openTendersStrategy` | bez zmian logiki |
| **Liczniki** | `marketKpi.urgentCount` · `pendingDecisionsCount` (score ≥55, bez decyzji) · `wonWithoutJobCount` (`won` && !`linkedJobId`) | ~56–68 |
| **Loading** | Raw `<section className="rounded-xl border … bg-card">` | ~75–80 |
| **Shell** | Raw `<section className="rounded-xl border border-border bg-card … shadow-sm">` | ~84 |
| **Header** | `bg-secondary/30` · `h2` `text-sm font-bold tracking-wide` · subtitle `text-[11px]` | ~85–94 |
| **KPI tiles** | Lokalny `DashboardKpiTile` · `TEUX_KPI_*` · nested `rounded-xl border` · tones amber/violet | ~13–46 · ~107–142 |
| **CTA** | Raw `<button>` **full-width solid Primary** (`bg-primary text-primary-foreground`) · „Przetargi → Strategia” | ~145–152 |
| **Nav** | `handleOpenStrategy` = `openTendersStrategy()` + `onOpenTendersStrategy()` | ~70–73 |
| **Attrs** | `data-teux7e-kpi` / `data-teux7e-dashboard-kpi` | zachować opcjonalnie (telemetria/test) |

**Język:** parallel **TEUX** na Pulpicie GDS + **drugi Primary** wizualnie konkurujący z hero — największy residual gap po S1–S3.

---

## 2. RCA (S4)

| # | Przyczyna | Skutek |
|---|-----------|--------|
| **R1** | Skrót powstał w torze TEUX7E (`TEUX_KPI_*`) przed GDS Pulpit | Trzeci system wizualny obok `WgKpi` / S1–S3 cards |
| **R2** | CTA skopiowane jako solid primary (moduł Strategia) | Narusza kontrakt ≤1 hero Primary (Guard T05) na tym samym scrollu |
| **R3** | S1–S3 zamknęły Braki/Pilne/Notatki | Skrót Przetargi pozostał legacy/TEUX |
| **R4** | Nie bug liczników | Formuły `useMemo` / `marketKpi` działają — to paint + CTA demote |

**Werdykt:** gap wizualny + Primary contract — **nie** zmiana semantyki okazji/pipeline.

---

## 3. Design (zamrożone decyzje)

### S4-DF-01 — Scope / pliki

| IN | OUT (twarde) |
|----|----------------|
| `TendersShortcutPanel.tsx` — shell · header · tiles paint · CTA | `DashboardView.tsx` |
| `WgCard` · `WgButton` · `WgKpi` (preferowane) · `WG_*` tokens · `cn` | `tender-ux-tokens` w tym pliku |
| | Logika `pendingDecisionsCount` / `wonWithoutJobCount` / `marketKpi` (tylko konsumpcja) |
| | Pełny `TendersModule` · Strategia UI · scoring engine · ACL |
| | Braki · Pilne · Notatki · W08–W10 · Hero · KPI strip |
| | Primary CTA · nowe sygnały / nowe metryki |

**Jeden plik implementacji (gdy GO IMPLEMENT):** `TendersShortcutPanel.tsx`.

### S4-DF-02 — Shell (`WgCard` soft)

| Element | Zamrożenie |
|---------|------------|
| Root (loaded) | **`WgCard`** `elevation="soft"` `padding="sm"` `radius="md"` · `className="overflow-hidden"` · **bez** `!p-0` |
| Loading | Ten sam język: **`WgCard` soft** + centered muted text · **nie** raw `section` border |
| Error banner | Zachować treść `pipeline.error` · soft destructive tint (jak dziś) · wewnątrz body card |
| Zakaz | Raw `rounded-xl border … shadow-sm` jako zewnętrzna ramka |

### S4-DF-03 — Header / typography / spacing

| Element | Zamrożenie |
|---------|------------|
| Title | `SHORTCUT_TITLE` („Przetargi — skrót”) · **`text-sm font-semibold text-foreground`** · **bez** `tracking-wide` / bold shout |
| Subtitle | Treść **bez zmian semantycznych** · **`text-xs text-muted-foreground`** · **zakaz** `text-[11px]` |
| Header rhythm | Jak S1/S2: `pb-3 border-b border-border/50` wewnątrz padded card (bez osobnego `bg-secondary/30` bloku — opcjonalny lekki tint OK) |
| Body | `pt-3` / `space-y-3` · grid KPI `grid-cols-1 sm:grid-cols-3 gap-2.5`–`gap-3` |

### S4-DF-04 — Trzy sygnały (KPI)

| Element | Zamrożenie |
|---------|------------|
| Semantyka | **Bez zmian:** Pilne terminy = `marketKpi.urgentCount` · Wymagają decyzji = `pendingDecisionsCount` · Wygrane bez roboty = `wonWithoutJobCount` |
| Hints / labels / icons | Teksty i ikony **bez zmian** (AlertTriangle / Scale / Briefcase) |
| Preferowane | **`WgKpi`** — `label` · `value={String(n)}` · `hint` · `status`: warn gdy amber-relevant (`urgent` / `won` >0) · info/neutral dla decyzji · **bez** `onClick` (nie nawigują) |
| Alternatywa (równoważna) | Soft tiles: `rounded-lg border border-border/60 bg-secondary/10` + `WG_TYPE_LABEL` + mono value — **bez** `TEUX_*` · **bez** pełnej nested card-farm równej zewnętrznemu shellowi |
| Violet TEUX tone | Mapować na GDS `status="info"` lub soft border `border-border/60` — **nie** kopiować violet chip language Jobs |
| `data-teux7e-*` | **Dozwolone** zachować na grid/tile (nie blokuje GDS) |

### S4-DF-05 — CTA (krytyczne)

| Element | Zamrożenie |
|---------|------------|
| Control | **`WgButton`** `variant="secondary"` **lub** `outline` · full width · `WG_TOUCH_MIN` / `min-h-[44px]` · chevron opcjonalnie |
| Label | **Bez zmian:** `Przetargi → {TENDERS_MODULE_LABELS.tabs.strategy}` |
| onClick | **`handleOpenStrategy`** bez zmian (oba wywołania) |
| **Zakaz** | `variant="primary"` · `bg-primary` + `text-primary-foreground` · jakikolwiek solid Primary |
| Hero Primary | **Nienaruszony** (Guard T05) |

### S4-DF-06 — Dane / nawigacja

| Element | Zamrożenie |
|---------|------------|
| `useMemo` counts | Formuły **bez zmian** |
| `pipeline.loading` / `.error` / `.items` | Konsumpcja bez zmian |
| `openTendersStrategy` + `onOpenTendersStrategy` | **Bez zmian** |
| Props API | **Bez zmian** `{ onOpenTendersStrategy }` |

---

## 4. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-1** | Root (loaded + loading) = **`WgCard` soft** (nie raw `section` border/shadow-sm) |
| **AC-2** | Title `text-sm font-semibold` · bez `tracking-wide` shout |
| **AC-3** | Subtitle `text-xs` · brak `text-[11px]` |
| **AC-4** | Trzy wartości = te same formuły co dziś (urgent / decisions / won-without-job) |
| **AC-5** | Brak importu / użycia `TEUX_KPI_*` / `TEUX_FONT_META` w pliku |
| **AC-6** | CTA = `WgButton` secondary **lub** outline · **0 Primary** |
| **AC-7** | Klik CTA → `handleOpenStrategy` (oba call’e) |
| **AC-8** | Diff **tylko** `TendersShortcutPanel.tsx` |
| **AC-9** | `DashboardView` · S1–S3 · full TEUX module — **nietknięte** |
| **AC-10** | Guard T05: ≤1 hero Primary nadal PASS; CTA skrótu **nie** matchuje hero Primary names |

---

## 5. Zakres OUT

| OUT | Powód |
|-----|--------|
| Logika pipeline / scoring / owner decisions | Zakaz Owner |
| API props / `useTendersContext` kontrakt | Zakaz |
| `DashboardView.tsx` | Mount OUT |
| Pełny moduł Przetargi / Strategia / Lista | Poza slice |
| Zmiana progów (7 dni, score 55) | Semantyka |
| Nowe KPI / nowe CTA | Zakaz nowych funkcji |
| Primary CTA | Audyt + Guard |
| Braki · Pilne · Notatki · listy dolne | Inne slice’y |
| IMPLEMENT / COMMIT / PUSH w tym etapie | Tylko DESIGN FREEZE |

---

## 6. Ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Demote CTA „za słaby” vs expectation Strategia | Średni | `secondary` full-width + chevron; Owner może wybrać `outline` w IMPLEMENT jeśli secondary zbyt głośny |
| `WgKpi` za wysoki / inny rytm vs 3 soft tiles | Niski | DF pozwala soft-tile alternative bez TEUX |
| Przypadkowa zmiana `useMemo` filtrów | Średni | Review: zero zmian linii count logic |
| CTA accessible name koliduje z Guard hero regex | Niski | Label zostaje „Przetargi → Strategia” — **nie** matchuje `Przejdź do Robot` / sobota |
| Scope creep do TEUX module | Wysoki | AC-8/9 · jeden plik |
| Usunięcie `data-teux7e-*` złamie zewnętrzny smoke | Niski | Zachować atrybuty przy GDS paint |

---

## 7. Mapping

| AUDIT | Ten DF |
|-------|--------|
| BODY-01 **S4** Przetargi skrót | **Ten dokument** |
| S1–S3 | Referencja wizualna (shipped) |
| S5 rows · S6 Guard extend | OUT |

---

## 8. Next gate

```text
DESIGN FREEZE (ten dok) → Owner GO IMPLEMENT
  → thin diff TendersShortcutPanel.tsx only
  → Build / typecheck / login smoke / ui-guard
  → Owner GO COMMIT/PUSH
```

---

**WGDOM-DASHBOARD-BODY-S4**  
**Etap: DESIGN FREEZE**  
**Status: FROZEN** · implementacja / commit / push — **nie wykonane**
