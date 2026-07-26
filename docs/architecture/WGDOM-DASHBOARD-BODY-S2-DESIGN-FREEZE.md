# WGDOM-DASHBOARD-BODY-S2 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Thin Slice · Visual migration only  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · S2 Pilne · po **S1 SHIPPED** (`1cf8af2`)  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · **bez COMMIT** · **bez PUSH**

---

## 0. Cel

Migracja **wyłącznie** widgetu **Pilne uwagi** (W06) do języka GDS **zgodnego ze shipped S1 (Braki)**:

- `WgCard` soft  
- spójna typografia i spacing  
- lekkie wiersze zamiast ciężkich kart  
- CTA wyłącznie **secondary / ghost**  
- **zakaz Primary CTA**

**Bez** zmiany logiki, liczników, API, semantyki, nowych funkcji ani pozostałych widgetów.

**Referencja wizualna (shipped):** Braki S1 — `WgCard` `elevation="soft"` `padding="sm"` `radius="md"` · **bez** `!p-0` · header `text-sm font-semibold` · badge `rounded-lg` · expand `WgButton` ghost.

---

## 0.1 Plik implementacji (klarowanie scope)

Owner: „widget Pilne w DashboardView”. Na tipie Pilne jest **wyekstrahowane**:

| Rola | Plik |
|------|------|
| **IN (implement)** | `src/app/DashboardPilneUwagiSection.tsx` — cały chrome + accordion + body paint |
| **Mount only** | `DashboardView.tsx` ~765–793 — `<DashboardPilneUwagiSection … />` |
| **DashboardView** | **OUT S2** — zero zmian props / stanu / KPI scroll (chyba że Owner GO wymusi inline; domyślnie **nie**) |

Logika liczników: `src/lib/dashboard-urgent-today.ts` — **OUT**.

---

## 1. Current State

| Element | Dziś | Plik · ok. |
|---------|------|------------|
| **Warunek renderu** | `urgentTodayTotal <= 0` → `return null` | `DashboardPilneUwagiSection` ~92 |
| **Anchor** | `id="dashboard-pilne-uwagi"` · `aria-label="Pilne uwagi na dziś"` | ~468–471 |
| **Shell** | Raw `<div className="bg-card border border-border rounded-xl … shadow-sm">` | ~468–471 |
| **Header** | `bg-secondary/20` · `AlertTriangle` amber · title **`uppercase tracking-wider`** · `text-xs` | ~473–477 |
| **Count badge** | `urgentTodayTotal` · `text-[10px]` · **`rounded-full font-bold`** amber | ~478–480 |
| **Expand CTA** | Raw `<button>` · `text-primary hover:underline` · `min-h-[44px]` · chevron | ~482–490 |
| **Collapsed summary** | `pilneCollapsedSummary` pod headerem gdy `!pilneExpanded` | ~492–494 |
| **Body** | Accordion `divide-y` · kategorie z `visibleCategories` (`count > 0`) | ~496–518 |
| **Category row** | Raw full-width `<button>` · `▶` · label · badge **`rounded-full`** · chevron | ~500–514 |
| **Category bodies** | Soft text rows + wiele raw linków „… →” · `onNavigate` / `acknowledgeReport` / `handleFixConsistency` / `markInspectorAlertsSeen` | ~94–464 |
| **„Ciężkie” wiersze** | m.in. recoverable: `rounded-lg border border-amber-500/20 bg-amber-500/5` · consistency „Popraw” = `bg-primary/15` (nie solid Primary, ale primary-tinted) | ~163–177 · ~447–458 |
| **Dane / SSOT** | `categories` · `urgentTodayTotal` z parenta (`buildUrgentTodayCategories`) | bez zmian w S2 |
| **KPI link** | `WgKpi` „Pilne uwagi” scroll + `setPilneExpanded(true)` w `DashboardView` | **OUT S2** |

**Język:** ten sam legacy shell co Braki **przed** S1 — po S1 kontrastuje z Braki GDS + hero/KPI.

---

## 2. RCA (S2)

| # | Przyczyna | Skutek |
|---|-----------|--------|
| **R1** | UI-01A/01B + Foundation **OUT** body polish (Guard / A11Y defer PR-P1-3) | Pilne nie dostało reskinu razem z KPI |
| **R2** | S1 zamknął tylko Braki (`1cf8af2`) | Mid-body: Braki GDS · Pilne nadal `bg-card border rounded-xl shadow-sm` |
| **R3** | Title `uppercase tracking-wider` + `text-[10px]` badges | Konflikt z UI-01B / S1 (`text-sm font-semibold`, badge `rounded-lg`, bez shout-case) |
| **R4** | Accordion + głębokie kategorie w jednym dużym pliku | Ryzyko scope creep do logiki — stąd DF: **chrome-first**, body CTA paint-only |

**Werdykt:** gap wizualny / scope po S1 — **nie** bug `urgentTodayTotal` ani kategorii V3.

---

## 3. Design (zamrożone decyzje)

### S2-DF-01 — Scope / pliki

| IN | OUT (twarde) |
|----|----------------|
| `DashboardPilneUwagiSection.tsx` — shell · header · expand · category chrome · **paint** linków/CTA w body | `DashboardView.tsx` (mount/props/KPI) |
| `WgCard` · `WgButton` · `WG_TOUCH_MIN` · `WG_FOCUS_RING` · `WG_TYPE_*` · `cn` | Nowe komponenty / nowe warianty `Wg*` API |
| | `dashboard-urgent-today.ts` · semantyka `count` / `urgentTodayTotal` / filtry kategorii |
| | Handlery: `toggleCategory` · `setPilneExpanded` · `onNavigate` · `acknowledgeReport` · `handleFixConsistency` · `markInspectorAlertsSeen` — **sygnatury i wywołania bez zmian** |
| | Braki (S1) · Notatki · Przetargi · Pracuje dziś · Roboty · Finanse · Hero · KPI |
| | Payroll CORE · Cloud · Edge · nowe funkcje / nowe kategorie / Primary CTA |

**Jeden plik implementacji (gdy GO IMPLEMENT):** `src/app/DashboardPilneUwagiSection.tsx`.

### S2-DF-02 — Shell (parzystość z S1)

| Element | Zamrożenie |
|---------|------------|
| Root | **`WgCard`** `elevation="soft"` `padding="sm"` `radius="md"` · `className="overflow-hidden"` · **bez** `!p-0` (jak shipped S1) |
| `id` / `aria-label` | **Bez zmian** |
| Warunek mount | **Bez zmian** — `urgentTodayTotal <= 0` → null |
| Zakaz | Raw `bg-card border rounded-xl shadow-sm` jako zewnętrzna ramka |

### S2-DF-03 — Header / typography / spacing

| Element | Zamrożenie |
|---------|------------|
| Layout | Jak S1: flex wrap · title left · expand right · `pb-3 border-b border-border/50` (wewnątrz padded `WgCard`) |
| Icon | `AlertTriangle` ~13–14 · `text-amber-500` / amber-600 (warn — jak Braki FileText amber) |
| Title | Label **bez zmian tekstu**: `Pilne uwagi na dziś` · **`text-sm font-semibold text-foreground`** · **zakaz** `uppercase tracking-wider` |
| Count badge | Wartość = **`urgentTodayTotal`** (semantyka V3) · `text-xs font-semibold` · amber tint · radius **`rounded-lg`** — **zakaz** `rounded-full` · **zakaz** `text-[10px]` na badge sekcji |
| Expand | **`WgButton` `variant="ghost"`** · labele **bez zmian** („Pokaż szczegóły” / „Ukryj szczegóły”) · chevron · `aria-expanded` · `WG_TOUCH_MIN` |
| Collapsed summary | Zachować warunek + treść · `text-xs text-muted-foreground leading-relaxed` · spacing `mt-2` |

### S2-DF-04 — Category accordion (lekkie wiersze)

| Element | Zamrożenie |
|---------|------------|
| Lista | `divide-y divide-border` (lub `/60`) — **bez** drugiej zewnętrznej karty wokół każdej kategorii |
| Category header button | Soft row: hover `bg-secondary/25`–`/30` · `px` zgodne z body S1 (~4–5) · `py-3` · `WG_FOCUS_RING` preferowane |
| Label | `text-sm font-medium` · **bez** uppercase |
| Category count badge | = `category.count` · `text-xs font-semibold` · amber · **`rounded-lg`** — nie `rounded-full` · nie `text-[10px]` |
| Chevron / ▶ | Zachować affordance expand; dozwolone uproszczenie markera `▶` do chevron-only (opcjonalne, **bez** zmiany `toggleCategory`) |
| Body open | `renderCategoryBody` — **ta sama** treść i handlery; tylko paint CTA/rows poniżej |

### S2-DF-05 — Body rows / CTA (paint only)

| Element | Zamrożenie |
|---------|------------|
| Linki „Lista płac →” / „Inspektor →” / „Zapisz tydzień →” / „Roboty →” itp. | **`WgButton` `variant="ghost"`** (lub `secondary` jeśli ghost za słaby wizualnie) · **zakaz** `variant="primary"` |
| Item rows (adresy, feed, zdjęcia, raporty…) | Soft text rows · `text-xs` · hover muted→foreground · opcjonalnie `WG_FOCUS_RING` — **bez** nested full card-farm |
| „Popraw” (consistency) | Zostać tinted / ghost / secondary — **nie** solid Primary (`bg-primary` + `text-primary-foreground`) · handler **bez zmian** |
| Recoverable alerts | Soft row: `rounded-lg border …/60` + lekkie tło amber — **nie** eskalować do ciężkiej karty; klik `onNavigate` bez zmian |
| Zakaz | Nowe empty states · nowe filtry · zmiana kolejności kategorii · zmiana copy biznesowego (poza typografią CSS) |

### S2-DF-06 — Primary contract

| Reguła | Zamrożenie |
|--------|------------|
| Hero Primary (Guard T05) | **Nienaruszony** |
| Wewnątrz Pilne | **0** × `WgButton variant="primary"` · **0** solid primary CTA |
| Empty Primary w W08/W09 | **OUT** |

### S2-DF-07 — Tokens

Dozwolone: `WgCard` · `WgButton` · `WG_TOUCH_MIN` · `WG_FOCUS_RING` · `WG_TYPE_*` · `WG_RADIUS_*` · istniejące transition · `cn`.

**Zakaz:** TEUX tokens · nowe glass/glow · `text-[9px]` / `text-[10px]` na title/badge sekcji i category badge · nowe ad-hoc hex.

---

## 4. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-1** | Root Pilne = **`WgCard` soft** (nie raw `bg-card border rounded-xl shadow-sm`) |
| **AC-2** | Title `Pilne uwagi na dziś` · **bez** `uppercase tracking-wider` · `text-sm font-semibold` |
| **AC-3** | Badge sekcji = `urgentTodayTotal` · **`rounded-lg`** · nie `rounded-full` |
| **AC-4** | Expand/collapse: te same labele · `aria-expanded` · `WgButton` ghost |
| **AC-5** | Collapsed summary nadal działa gdy `!pilneExpanded` |
| **AC-6** | Kategorie: `visibleCategories` / `toggleCategory` / `expandedCategories` — semantyka **bez zmian** |
| **AC-7** | Category badges = `category.count` · `rounded-lg` |
| **AC-8** | Soft accordion rows — brak drugiej zewnętrznej card-farm wokół kategorii |
| **AC-9** | Wszystkie CTA w Pilne = ghost/secondary · **0 Primary** w widgetcie |
| **AC-10** | Handlery navigate / acknowledge / fix / markSeen — **bez zmian** wywołań |
| **AC-11** | Diff **tylko** `DashboardPilneUwagiSection.tsx` (+ importy w tym pliku) |
| **AC-12** | Braki S1 · Hero · KPI · inne widgety — **nietknięte** |
| **AC-13** | Guard T05 (≤1 hero Primary) nadal PASS przy PV |

---

## 5. Zakres OUT

| OUT | Powód |
|-----|--------|
| Logika `buildUrgentTodayCategories` / liczniki V3 | Zakaz Owner |
| API props `DashboardPilneUwagiSection` | Zakaz |
| Zmiany w `DashboardView.tsx` | Mount OUT; Pilne żyje w child |
| Braki · Notatki · Przetargi · W08–W10 · Hero · KPI | Inne slice’y / freeze |
| Nowe funkcje / kategorie / empty redesign | Zakaz |
| Primary CTA w Pilne | Kontrakt Foundation |
| `dashboard-urgent-today.ts` | SSOT — nie ruszać |
| Payroll CORE · Cloud · Edge | Safety |
| IMPLEMENT / COMMIT / PUSH w tym etapie | Tylko DESIGN FREEZE |

---

## 6. Ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Scope creep w 500+ LOC body kategorii | **Wysoki** | DF: chrome + CTA paint; **zakaz** refactoru `renderCategoryBody` logiki; review diff = className/Wg* only |
| Przypadkowa zmiana `urgentTodayTotal` / `category.count` | Średni | AC-3/6/7 · nie tykać `dashboard-urgent-today` |
| Second Primary (link przemalowany na solid) | Wysoki wpływ Guard | AC-9 · grep `variant="primary"` / `text-primary-foreground` w pliku |
| Niespójność z S1 (`!p-0` vs padded) | Niski | Świadomie **jak shipped S1** (bez `!p-0`) |
| Touch target category header | Niski | `py-3` + min 44px gdzie CTA |
| „Popraw” wygląda jak Primary po migracji | Średni | S2-DF-05: tylko tint/ghost/secondary |

---

## 7. Mapping

| AUDIT / prior | Ten DF |
|---------------|--------|
| BODY-01 **S2** Pilne shell | **Ten dokument** |
| S1 Braki `1cf8af2` | Referencja wizualna |
| S3+ | OUT |

---

## 8. Next gate

```text
DESIGN FREEZE (ten dok) → Owner GO IMPLEMENT
  → thin diff DashboardPilneUwagiSection.tsx only
  → Build / typecheck / login smoke / ui-guard
  → Owner GO COMMIT/PUSH
```

---

**WGDOM-DASHBOARD-BODY-S2**  
**Etap: DESIGN FREEZE**  
**Status: FROZEN** · implementacja / commit / push — **nie wykonane**
