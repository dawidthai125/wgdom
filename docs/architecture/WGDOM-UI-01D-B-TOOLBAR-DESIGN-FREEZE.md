# WGDOM-UI-01D-B-TOOLBAR — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Visual Polish · Thin Slice  
> **Parent:** WGDOM-UI-01D-WORKSPACE AUDIT · **UI-01D-A-LIST = CLOSED**  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** w tym dokumencie

---

## 0. Cel

Skompresować i uspokoić **toolbar listy Roboty**, żeby Search i lista kart (01D-A) były dominantą — bez zmiany handlerów, filtrów math ani ops.

**Inspiracje:** Linear (compact chrome) · Vercel (1 primary) · Raycast (search-first) · Notion (cichy segment) · GitHub (KPI jako chips, nie tiles).

---

## 1. Scope

| IN | OUT (twarde) |
|----|----------------|
| `JobListPanelHeader.tsx` — CTA, KPI chrome, search row, Lista/Kolejki, Filtry toggle, spacing, typography | `JobListCardV2` · list empty/group (01D-A CLOSED) |
| Opcjonalnie: **tylko klasy** w `JobListFilterBar` (`JobListStatus.tsx`) — chrome tabs faz | Detail · Files Hub · Documents |
| | Dashboard · Sidebar · Topbar |
| | Routing · API · Cloud · Providers · Payroll CORE |
| | Design System · `wg-ui-tokens.ts` (zero nowych tokenów) |
| | `job-list-ops.ts` · status math · `onToggle*` / `onFilter*` semantyka |
| | Nowe state poza istniejącym `showMoreFilters` |

**Props / handlery:** bez zmian kontraktu. Zero nowych callbacków.

---

## 2. Design Freeze

### TB-DF-01 — Toolbar shell / rhythm

| Element | Zamrożenie |
|---------|------------|
| Outer | `px-4 py-3 md:py-2.5` · `space-y-2.5 md:space-y-2` (↓ vs `pt-4 space-y-3` / desktop `space-y-1` chaos) |
| Border | `border-b border-border/50` |
| Zakaz | Dodatkowe karty/wrappery wokół całego toolbara; glass |

**Cel wysokości:** wyraźnie niższy stack niż dziś (KPI tiles + dual flex-1 CTA + gęste gap). Target odczucia: **≤3 spokojne rzędy** zanim zaczyna się lista (CTA+KPI · Search row · phase tabs).

### TB-DF-02 — CTA hierarchy (1 Primary)

| Slot | Zamrożenie |
|------|------------|
| **Primary** | wyłącznie `WgButton variant="primary"` — „Nowa robota” |
| **Secondary** | „Pliki (N)” → `WgButton variant="secondary"` **lub** `outline` — **zakaz** emerald fill/`border-emerald` (konkurencja z primary) |
| Layout | Desktop: `flex gap-2` · Primary **nie** `flex-1` równorzędnie z Pliki — Primary `shrink-0`, Pliki `shrink-0`; na mobile Primary pełniejszy (`flex-1`), Pliki icon+count lub secondary `flex-1` o mniejszej wadze wizualnej |
| Height | `h-10` / `WG_TOUCH_MIN` mobile; desktop może `h-9`–`h-10` (nie ściana `h-11`×2 równa) |
| Count plików | w labelu jak dziś — bez zmiany `totalJobFilesCount` |

### TB-DF-03 — KPI = chips, nie kafelki

| Element | Zamrożenie |
|---------|------------|
| Forma | Horizontal **chip row**: `rounded-md` · `h-8`/`h-9` · `px-2.5` · `gap-1.5` · `border border-border/60` |
| Idle | `bg-secondary/40 text-muted-foreground` — **bez** yellow/orange/violet tile fills |
| Active | `bg-primary/10 text-primary border-primary/30` (język Sidebar/List selected) — **jedna** active paint dla wszystkich KPI |
| Count | `text-sm font-semibold tabular-nums` (nie `text-xl`) |
| Label | `text-xs font-medium` |
| Icon | opcjonalnie `size={14}` muted; nie dominant vs count |
| Scroll | zachować `overflow-x-auto` na mobile |
| Handlery | `onKpiClick` / `kpiActive` **bez zmian** |

**Usunąć wizualnie:** `KPI_VISUAL` kolorowe `idle`/`active` per-key (mapa może zniknąć lub zostać nieużywana — nie ruszać ops).

### TB-DF-04 — Search = główny punkt wejścia

| Element | Zamrożenie |
|---------|------------|
| Komponent | `WgField type="search"` zachowany |
| Waga | Search zajmuje **max width** w rzędzie (`flex-1 min-w-0`) |
| Control | `h-10` desktop / `min-h-[44px]` mobile (`WG_TOUCH_MIN`) |
| Placeholder | bez zmian copy |
| Zakaz | Search węższy niż segment+filtry; search „wciśnięty” między równe bloki |

### TB-DF-05 — Lista / Kolejki segmented

| Element | Zamrożenie |
|---------|------------|
| Track | `bg-secondary/50 p-0.5 rounded-lg border border-border/50` |
| Segment | `text-xs font-medium` · active: `bg-background text-foreground` **bez** `shadow-sm` / ciężkiego border |
| Height | `min-h-[36px] md:min-h-[32px]` (mobile touch ≥44 tylko jeśli wymagane audit — prefer `h-9` + touch padding zgodne z istniejącym mobile floor) |
| Rola | spokojny switch obok search — nie hero |

### TB-DF-06 — Filters chrome

| Element | Zamrożenie |
|---------|------------|
| Przycisk „Filtry” | `WgButton variant="ghost"` lub outline cichy · `text-xs` · active gdy `showMoreFilters \|\| filtersActive`: `bg-primary/10 border-primary/30` |
| **Nie** konkurować z Search (mniejszy, `shrink-0`) |
| `JobListFilterBar` | tabs faz: spokojniejsze — `rounded-md`, bez rainbow per-phase **albo** zachować lekkie tint **tylko** active; idle = secondary; uppercase labels → sentence/`text-xs font-medium` |
| Expanded panel | labels: **nie** `uppercase tracking-wider text-[10px]` — `text-xs text-muted-foreground`; native `<select>` OK w tym slice (bez migracji do WgField jeśli ryzykowne) |
| Bulk | bez redesignu logiki; chrome spokojniejszy w expanded |

**Redundancja KPI ↔ phase tabs:** **nie usuwać** żadnego rzędu w 01D-B (logika OUT). Wizualnie KPI = quick chips; `JobListFilterBar` = pełniejsza oś faz — KPI **cichsze** niż dziś, tabs **niższe**.

### TB-DF-07 — Typography

| Element | Zamrożenie |
|---------|------------|
| Toolbar | bez nowych `text-[9px]` / `text-[10px]` uppercase stamps |
| Expanded filter labels | `text-xs font-medium text-muted-foreground` |
| KPI labels | sentence case jak dziś („W toku”) |

### TB-DF-08 — Motion / focus

| Element | Zamrożenie |
|---------|------------|
| Hover | `transition-colors` + `WG_DURATION_HOVER` (150) · `motion-reduce:transition-none` |
| Zakaz | scale / translate na KPI i CTA (poza chevron rotate na Filtry — OK) |
| Focus | istniejące `WgButton` / `WgField` rings |

### TB-DF-09 — Mobile

| Element | Zamrożenie |
|---------|------------|
| Stack | CTA row → KPI chips (horizontal scroll) → Search full-width → segment+Filtry → phase bar |
| Touch | zachować ≥44 gdzie dziś wymagane (search, Filtry, KPI hit) |
| Zakaz | zmiana drill-in / ukrywania toolbara przy detail |

### TB-DF-10 — Token / DS policy

- Używać `WgButton`, `WgField`, `WG_TOUCH_MIN`, `WG_DURATION_HOVER` / ENTER, `WG_RADIUS_*` istniejące  
- Zero edycji tokens / nowych wariantów DS  
- Pliki: **nie** raw emerald `<button>` — przejść na `WgButton`

---

## 3. Definition of Done

- [ ] DF Owner APPROVED  
- [ ] IMPLEMENT tylko pliki §5  
- [ ] TB-DF-01…10 spełnione  
- [ ] Wszystkie handlery / props bez regresji  
- [ ] Lista kart (01D-A) nietknięta  
- [ ] Build + typecheck + login smoke + mobile audit PASS  
- [ ] PAYROLL SAFETY GATE ALL-NIE  
- [ ] Zero commit/push bez Owner GO  

---

## 4. Acceptance Criteria

| # | AC |
|---|-----|
| AC-1 | Dokładnie **1** Primary CTA: „Nowa robota”. |
| AC-2 | „Pliki” secondary/outline — bez emerald tile. |
| AC-3 | KPI wyglądają jak chips (nie kolorowe kafelki); active = primary tint. |
| AC-4 | Search jest najszerszym / dominantnym polem w rzędzie narzędzi. |
| AC-5 | Toolbar wyraźnie niższy / mniej `space-y` niż przed 01D-B. |
| AC-6 | Lista/Kolejki = cichy segmented control. |
| AC-7 | Filtry nie konkurują wizualnie z Search. |
| AC-8 | Zero zmian `job-list-ops` / status math / filter behavior. |
| AC-9 | Zero zmian JobListCardV2 / Detail / Hub. |
| AC-10 | Mobile: KPI scroll + touch floors zachowane. |

---

## 5. Lista plików

| Plik | Rola |
|------|------|
| `src/app/JobListPanelHeader.tsx` | Główny polish toolbara |
| `src/app/JobListStatus.tsx` | **Opcjonalnie** wyłącznie `JobListFilterBar` classNames (chrome) |

**Zakazane:** `JobListCardV2` · `JobsView` detail · Hub · ops libs · tokens · Sidebar/Dashboard.

---

## 6. Ryzyka

| Ryzyko | Mitigation |
|--------|------------|
| KPI bez kolorów = gorszy skan faz | Count + label + `aria-pressed`; active primary wystarczy |
| Phase bar + KPI nadal redundantne | 01D-B tylko wycisza KPI; usunięcie jednego rzędu = osobny slice / Owner |
| Select native w expanded | Zostawić — polish labels only |
| Desktop `h-9` vs mobile audit | Mobile zachowuje 44px na search/CTA |
| Pliki jako WgButton secondary | Smoke: count + `onShowAllFiles` |

---

## 7. Visual Diff

| Obszar | Teraz | UI-01D-B target |
|--------|-------|-----------------|
| CTA | Primary + emerald „Pliki” równe `flex-1` | 1 Primary · Pliki secondary |
| KPI | Tinted tiles `text-xl` / yellow-orange-violet | Neutral chips · `text-sm` count · primary active |
| Search | W gridzie równorzędny | Dominant `flex-1` entry |
| Segment | Shadow active pill | Flat segmented |
| Filtry | Border button konkurujący | Ghost/outline cichy |
| Spacing | `pt-4 space-y-3` / md ultra-comprimée | Spójny `py-3 space-y-2.5` niższy stack |
| Expanded labels | `uppercase text-[10px]` | `text-xs` sentence |
| Lista kart | — | **bez zmian** (01D-A CLOSED) |

---

## 8. Gate IMPLEMENT

```text
Owner GO: IMPLEMENT UI-01D-B-TOOLBAR
→ PAYROLL SAFETY GATE (ALL-NIE)
→ tylko pliki §5
→ AC §4
→ REPORT (bez commit chyba że Owner każe)
```

**Ten dokument = SSOT DESIGN FREEZE UI-01D-B-TOOLBAR. Status: FROZEN.**
