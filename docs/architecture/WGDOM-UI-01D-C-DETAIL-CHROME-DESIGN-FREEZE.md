# WGDOM-UI-01D-C-DETAIL-CHROME — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Visual Polish · Thin Slice  
> **Parent:** WGDOM-UI-01D-WORKSPACE AUDIT  
> **Poprzednie CLOSED:** UI-01A · UI-01C · UI-01D-A · UI-01D-B  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT**

---

## 0. Cel

Uspokoić **chrome panelu szczegółów** Roboty (header + tabs + empty + sticky), żeby treść była ważniejsza od obudowy — w tym samym języku co Toolbar (01D-B) i Dashboard (01B).

**Inspiracje:** Linear (detail header spokojny) · Notion (tabs ciche) · Vercel (1 CTA) · Raycast (focus bez blur-heavy).

---

## 1. Scope

| IN | OUT (twarde) |
|----|----------------|
| Detail **header** chrome w `JobsView` (tytuł, meta, back mobile, CTA Pliki, sticky shell) | Formularze / inputy / walidacje / `updateJob` |
| `JobDetailSectionNav` — tabs look | Files Hub body · Dokumenty checklist · Zdjęcia · Tabele |
| `JobsDetailEmptyState` | Dashboard · Sidebar · Topbar · Toolbar (01D-B) |
| Sticky header polish (blur/border/spacing) | Routing · API · Cloud · Providers · Payroll |
| Visual hierarchy header → tabs → treść | Tokens · Design System · nowe komponenty |
| Section **chrome** wyłącznie: rytm padding kontenera scroll + ewentualnie **pierwszy** section title w summary **jeśli** to tylko className tytułu — **nie** wnętrze sekcji | `job-list-ops` · status math · zmiana `detailSection` logiki |

**Zasada chirurgii `JobsView`:** patch tylko bloku `jobDetailHeaderRef` (~header) + render `JobsDetailEmptyState` + opcjonalnie `py` kontenera `jobs-detail` scroll. **Zakaz** diffów w polach adresu, WM, materials, photos, hub.

---

## 2. Design Freeze

### DC-DF-01 — Treść > chrome

| Reguła | Zamrożenie |
|--------|------------|
| Header | Mniej powierzchni niż dziś; bez „drugiego toolbara” |
| CTA | Nie konkuruje z tytułem adresu |
| Tabs | Pomocnicze (jak KPI chips w 01D-B), nie hero |
| Zakaz | Emerald fill walls · heavy blur · dual primary |

### DC-DF-02 — Detail header

| Element | Zamrożenie |
|---------|------------|
| Title | `text-lg md:text-base font-semibold tracking-tight` · truncate · dominant |
| Client meta | `text-xs text-muted-foreground/80` · truncate · pod tytułem |
| Status badge | `JobListPrimaryBadge` zachowany; pozycja w bloku tytułu (nie walczy z CTA) |
| Mobile back | „Lista” — ghost/`text-muted` · `min-h-[44px]` · bez zmiany handlera |
| Padding | `px-4 sm:px-6 pt-3 pb-3 md:pt-2.5 md:pb-2.5` · `space-y-2.5` (↓ denseness) |
| Border | `border-b border-border/50` |

### DC-DF-03 — CTA hierarchy (1 główny)

| Slot | Zamrożenie |
|------|------------|
| **Primary w detail chrome** | Brak drugiego primary obok tytułu. CTA „Pliki” = **secondary/outline** (`WgButton` jeśli już w pliku, inaczej klasy secondary) — **zakaz** `bg-emerald-600` solid |
| Gdy `detailSection === "files"` | CTA ukryte jak dziś (logika bez zmian) |
| Empty state | 1 Primary = „Nowa robota”; „Pliki wg adresów” = secondary (jak Toolbar Pliki) — **zakaz** emerald tile |
| Zakaz | Dwa równorzędne filled CTA w headerze lub empty |

### DC-DF-04 — Tabs (`JobDetailSectionNav`)

| Element | Zamrożenie |
|---------|------------|
| Forma | Chip/segment jak Toolbar 01D-B: `rounded-md` · `h-8`/`h-9` · `text-xs font-medium` |
| Idle | `bg-secondary/40 text-muted-foreground border border-transparent` lub `border-border/50` |
| Active | `bg-primary/10 text-primary border-primary/30` — **jedna** active paint dla **wszystkich** tabów (w tym Pliki) |
| Zakaz | `bg-emerald-600 text-white` na tab Files; `bg-primary text-primary-foreground` filled pill |
| Badge count | `rounded-md text-[11px] tabular-nums` · warn = amber tint; active badge spokojny primary/muted |
| Icon | `size={14}` · opacity-70 |
| Scroll | horizontal `overflow-x-auto` zachowany (mobile) |
| Handlery | `onSelect` / section ids **bez zmian** |

### DC-DF-05 — Sticky header polish

| Element | Zamrożenie |
|---------|------------|
| Surface | `bg-background/95` **lub** `bg-background` |
| Blur | **bez** `backdrop-blur` **albo** max `backdrop-blur-sm` jeśli konieczny na mobile scroll bleed — prefer **bez blur** |
| Z-index | zachować `z-10` / shrink-0 |
| Zakaz | Glass heavy · shadow pod headerem |

### DC-DF-06 — Section spacing (chrome only)

| Element | Zamrożenie |
|---------|------------|
| Detail scroll pad | `px-4 sm:px-6 py-4 md:py-4` · `space-y-4` (lekki ↑ oddech vs ultra-comprimée `md:space-y-3` tylko jeśli nie rusza form layout) |
| Separator header→treść | Jak TB-DF-11: wyraźny koniec chrome (`border-b` + `pb`) zanim scroll content |
| Zakaz | Flatten wszystkich `bg-card` sekcji (to **UI-01D-D**) |

### DC-DF-07 — Typography (chrome)

| Element | Zamrożenie |
|---------|------------|
| Header title | jak DC-DF-02 |
| Empty title | `text-sm font-semibold` (lub `WgEmptyState` title) |
| Empty description | `text-xs text-muted-foreground leading-relaxed` |
| Zakaz w tym slice | Masowa zamiana wszystkich `uppercase tracking-wider` w całym `JobsView` (forms/docs) — tylko empty + header |

### DC-DF-08 — Empty state detail

| Element | Zamrożenie |
|---------|------------|
| Komponent | Preferowane: `WgEmptyState` (istniejący) + CTA slot — **zero nowych komponentów** |
| Alternatywa | Polish `JobsDetailEmptyState` do tego samego rytmu (`py-12 gap-4`, ciche ikony) |
| CTA | 1 Primary + 1 Secondary (DC-DF-03) |
| Visibility | `hidden sm:flex` zachowane (mobile drill-in bez empty) |

### DC-DF-09 — Visual hierarchy

1. Adres (title)  
2. Meta client + status badge  
3. Secondary CTA Pliki (opcjonalnie)  
4. Tabs  
5. Treść sekcji (OUT polish głęboki)

### DC-DF-10 — Motion / a11y

| Element | Zamrożenie |
|---------|------------|
| Hover | `transition-colors duration-150` · `motion-reduce:transition-none` |
| Zakaz | scale / translate na tabs i CTA |
| `aria-current` / `aria-pressed` | na active tab (additive) |

### DC-DF-11 — Token / DS policy

- Tylko istniejące `WgButton` / `WgEmptyState` / tokeny  
- Zero nowych tokenów · zero nowych wariantów DS  
- Zero glass na detail chrome  

---

## 3. Definition of Done

- [ ] DF Owner APPROVED  
- [ ] IMPLEMENT tylko pliki §5 (chirurgia JobsView)  
- [ ] DC-DF-01…11 spełnione  
- [ ] Zero regresji `setDetailSection` / counts / back mobile  
- [ ] Forms / Hub / docs / photos **nietknięte** (poza ewentualnym nieszkodliwym reflow paddingu kontenera)  
- [ ] Build + typecheck + login smoke + mobile audit PASS  
- [ ] PAYROLL SAFETY GATE ALL-NIE  
- [ ] Zero commit/push bez Owner GO  

---

## 4. Acceptance Criteria

| # | AC |
|---|-----|
| AC-1 | Tytuł adresu dominantny; chrome nie krzyczy. |
| AC-2 | ≤1 filled primary w empty; header „Pliki” = secondary (nie emerald solid). |
| AC-3 | Tabs = język 01D-B chips; active primary tint; Files tab ≠ emerald fill. |
| AC-4 | Sticky bez ciężkiego blur. |
| AC-5 | Empty state spójny z `WgEmptyState` / Dashboard empty. |
| AC-6 | Wyraźny separator header → treść. |
| AC-7 | Zero zmian formularzy / Hub / dokumentów / zdjęć. |
| AC-8 | Zero nowych komponentów i tokenów. |
| AC-9 | Mobile back + tab scroll zachowane. |
| AC-10 | Handlery nawigacji sekcji bez zmian. |

---

## 5. Lista plików

| Plik | Rola |
|------|------|
| `src/app/JobDetailSectionNav.tsx` | Tabs + `JobsDetailEmptyState` (lub migracja empty → `WgEmptyState`) |
| `src/app/JobsView.tsx` | **Tylko** detail header chrome + empty usage + opcjonalnie pad scroll |

**Zakazane:** `JobListCardV2` · `JobListPanelHeader` · Hub · ops libs · tokens · Sidebar/Dashboard.

---

## 6. Ryzyka

| Ryzyko | Mitigation |
|--------|------------|
| Szeroki diff `JobsView` | Patch wyłącznie header ref + empty; review diff line range |
| Utrata skanu „Pliki” bez emerald | Secondary + count + tab badge wystarczy |
| `backdrop-blur` usunięty → bleed treści | `bg-background` solid + border |
| Empty → `WgEmptyState` a11y | Zachować `hidden sm:flex` wrapper |
| Badge warn na tabs | Zostawić amber dla missing/pending — bez filled tab |

---

## 7. Visual Diff

| Obszar | Teraz | UI-01D-C target |
|--------|-------|-----------------|
| Header CTA Pliki | `bg-emerald-600` solid | secondary/outline |
| Tabs active | primary fill · Files emerald | primary/10 tint (wszystkie) |
| Sticky | `backdrop-blur` heavy feel | soft / no blur |
| Title | `text-base` | `text-lg`/`tracking-tight` dominant |
| Empty | ad-hoc + emerald CTA | `WgEmptyState` · 1 primary + secondary |
| Tab badges | `rounded-full text-[10px]` | `rounded-md` spokojniejsze |
| Forms / Hub / docs | — | **bez zmian** |
| Lista / Toolbar | CLOSED | **bez zmian** |

---

## 8. Gate IMPLEMENT

```text
Owner GO: IMPLEMENT UI-01D-C-DETAIL-CHROME
→ PAYROLL SAFETY GATE (ALL-NIE)
→ tylko pliki §5
→ AC §4
→ REPORT (bez commit chyba że Owner każe)
```

**Ten dokument = SSOT DESIGN FREEZE UI-01D-C-DETAIL-CHROME. Status: FROZEN.**
