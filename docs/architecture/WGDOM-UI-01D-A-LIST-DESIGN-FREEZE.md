# WGDOM-UI-01D-A-LIST — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Visual Polish · Thin Slice  
> **Parent:** WGDOM-UI-01D-WORKSPACE AUDIT · UI-01B/01C COMPLETE  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** w tym dokumencie

---

## 0. Cel

Pierwszy thin slice Roboty: **tylko lista** — karty, group headers, empty, selected/hover, rytm — spójne z Dashboard (UI-01B) i Sidebar (UI-01C).

**Inspiracje:** Linear (spokojna lista) · Notion (whitespace) · Raycast (precyzyjny hover) · Vercel / GitHub Projects (wybrany wiersz bez glow).

---

## 1. Scope

| IN | OUT (twarde) |
|----|----------------|
| `JobListCardV2.tsx` — hierarchy, chips, meta, progress, hover/selected, spacing | Toolbar · Filters · Search (`JobListPanelHeader`) |
| Group headers w **list pane** `JobsView.tsx` (tylko markup/klasy sticky group) | Detail panel · section nav · Files Hub |
| Empty states **listy** (brak robót / brak wyników) | Documents checklist · WM/photos/tables detail |
| | Dashboard · Sidebar · Topbar |
| | Routing · API · Cloud · Providers · Payroll CORE |
| | Design System · `wg-ui-tokens.ts` (zero nowych tokenów) |
| | `job-list-ops.ts` · `job-list-status.ts` math / `applyJobPhase` |
| | Zmiana props kontraktu karty (handlery, dane) — tylko klasy / układ prezentacji |

**Boundary props:** te same `onSelect` / bulk / delete / labels — zero zmian semantyki.

---

## 2. Design Freeze

### LIST-DF-01 — Adres dominantą

| Element | Zamrożenie |
|---------|------------|
| Adres | `text-sm font-semibold tracking-tight text-foreground` · `truncate` · `min-w-0` |
| Flat | `m.{n}` muted, nie walczy z adresem |
| Brak adresu | italic muted „Bez adresu” |
| Zakaz | Chip / badge większy wizualnie niż adres; uppercase na adresie |

### LIST-DF-02 — Chipy pomocnicze (max 2 eksponowane)

| Slot | Co |
|------|-----|
| **Exposed #1** | `JobListPrimaryBadge` (status/faza) — jedyny badge w rzędzie tytułu, obok adresu |
| **Exposed #2** | Co najwyżej **jeden** dodatkowy chip priorytetu (kolejność): `BZP` → else `Aktywni dziś` (gdy >0) → else alert docs krytyczny (brak zlecenia/kosztorysu jako **jeden** spokojny warn, nie dwa red pills) → else pomiń |
| **Reszta** | WM planned · meta pickers · klucze · pliki · recoverable · duplikat · `N os. · godziny` → **meta-linia** (LIST-DF-03), nie `rounded-full text-[10px]` wall |

| Reguła | Zamrożenie |
|--------|------------|
| Exposed chips | `text-[11px]` · `rounded-md` (język UI-01C badge) · bez emoji 💰 |
| Recoverable w meta | tekst `Do odzyskania: N` lub kwota — bez 💰 |
| `JobMetaBadges` / `JobWmPlannedBadge` | **Nie zmieniać** globalnego wyglądu komponentów; w karcie: albo nie renderować jako chip-row, albo wpleść label w meta string |
| Zakaz | Ściana 6+ pills; nowe kolory per-chip poza istniejącym primary badge |

### LIST-DF-03 — Meta = jeden blok

| Element | Zamrożenie |
|---------|------------|
| Blok | Jedna (max dwie) linie `text-xs text-muted-foreground leading-relaxed truncate` |
| Zawartość | Klient · termin/kontrakt · lider · osoby/godziny · pliki · klucze (ikona lub „Klucze”) · WM/meta skrót · recoverable — separator `·` |
| Alerty handover missing | Pod meta, jedna linia `text-xs` warn — nie chip soup |
| Zakaz | Osobny flex-wrap chip row jako trzecia „równa” warstwa |

### LIST-DF-04 — Hover

| Element | Zamrożenie |
|---------|------------|
| Card / hit area | `hover:bg-secondary/25` (lub równoważny lekki tint) |
| Transition | `transition-colors duration-150` + `motion-reduce:transition-none` |
| Zakaz | scale · translate · bounce · cień hover · border flash agresywny |

### LIST-DF-05 — Selected

| Element | Zamrożenie |
|---------|------------|
| Surface | `bg-primary/10 border-primary/30` (jak Sidebar/Dashboard tint) |
| Zakaz | `ring-1` / `ring-primary` · glow · `shadow-lg` · scale |
| Bulk selected | zachować odrębny destructive tint (istniejąca semantyka) — bez ring |

### LIST-DF-06 — Typography (lista)

| Element | Zamrożenie |
|---------|------------|
| Group header | `text-sm font-semibold text-foreground` — **nie** `uppercase tracking-wider` |
| Group sticky | `bg-background/95 border-b border-border/50` · `px-4 py-2.5` |
| Progress count | `text-xs tabular-nums text-muted-foreground` (↑ z `text-[10px]`) |
| Koszt | mono OK · `text-xs font-semibold text-primary` |
| Delete confirm | bez wymogu redesign — touch OK; unikaj nowych `text-[9px]` |

### LIST-DF-07 — Card spacing / list rhythm

| Element | Zamrożenie |
|---------|------------|
| Card outer | `mx-2 my-2` (↑ vs `my-1.5`) · `rounded-xl border` |
| Card padding | `px-3.5 py-3` (komfort bliższy DF-14 Sidebar) |
| Gap wewnątrz | tytuł → meta `mt-1` · meta → footer `mt-2.5` · footer `pt-2 border-t border-border/50` |
| Lista | bez zmiany virtualizacji / group logic — tylko klasy |

### LIST-DF-08 — Progress presentation

| Element | Zamrożenie |
|---------|------------|
| Bar | `h-1.5` · `max-w-[8rem]` · track `bg-border` |
| Fill | complete = emerald; else primary — **bez** animacji bounce |
| Label | `{n}/{REQUIRED}` `text-xs tabular-nums` |
| Opcja | przy 100%: bar + label OK **lub** krótki „Komplet” muted — bez nowego API |
| Zakaz | Drugi progress bar; procent jako dominant vs adres |

### LIST-DF-09 — Empty state (lista)

| Element | Zamrożenie |
|---------|------------|
| Brak robót | `WgEmptyState` + ikona `MapPin` + tytuł + opis + CTA opcjonalnie **tylko jeśli** już jest handler w scope bez nowych props z parenta — preferowane: empty z opisem „Dodaj robotę z paska narzędzi” **bez** nowego CTA jeśli CTA żyje w toolbarze OUT |
| Brak wyników | `WgEmptyState` title „Brak wyników” · description spokojna |
| Rytm | zgodny UI-01B: `py-12` / `gap-4` (defaults komponentu) |
| Zakaz | Detail empty (`JobsDetailEmptyState`) w tym slice |

### LIST-DF-10 — Status hierarchy (karta)

1. Adres (dominant)  
2. Primary badge (exposed #1)  
3. Opcjonalnie exposed chip #2  
4. Meta block  
5. Progress + koszt (footer)  
6. Alert line (jeśli jest)  

### LIST-DF-11 — Token / DS policy

- Używać istniejących: `WG_DURATION_HOVER`, `WG_RADIUS_MD`, `WgEmptyState`  
- Zero edycji `wg-ui-tokens.ts`  
- Zero glass na kartach listy  

---

## 3. Definition of Done

- [ ] DF Owner APPROVED  
- [ ] IMPLEMENT tylko pliki §5  
- [ ] LIST-DF-01…11 spełnione  
- [ ] Toolbar / filters / search / detail / Hub nietknięte  
- [ ] Handlery karty i dane bez regresji  
- [ ] Build + typecheck + login smoke + mobile audit PASS  
- [ ] PAYROLL SAFETY GATE ALL-NIE  
- [ ] Zero commit/push bez Owner GO  

---

## 4. Acceptance Criteria

| # | AC |
|---|-----|
| AC-1 | Adres jest najsilniejszym sygnałem na karcie (LIST-DF-01). |
| AC-2 | ≤2 eksponowane chipy; reszta w meta / spokojnym stylu (LIST-DF-02). |
| AC-3 | Meta tworzy spójny blok (LIST-DF-03). |
| AC-4 | Hover = lekki tint + 150ms; bez scale/glow (LIST-DF-04). |
| AC-5 | Selected = `primary/10` tint; bez ring/glow (LIST-DF-05). |
| AC-6 | Group headers sentence case semibold; sticky soft (LIST-DF-06). |
| AC-7 | Większy rytm kart (`my-2`, `py-3`) (LIST-DF-07). |
| AC-8 | Progress czytelny, nie dominuje adresu (LIST-DF-08). |
| AC-9 | List empty używa `WgEmptyState` (LIST-DF-09). |
| AC-10 | Zero zmian plików OUT (§1). |

---

## 5. Lista plików

| Plik | Rola |
|------|------|
| `src/app/JobListCardV2.tsx` | Główny polish karty |
| `src/app/JobsView.tsx` | **Tylko** group header classes + list empty markup (chirurgicznie) |

**Opcjonalnie (additive, bez breaking):** brak — unikać `JobListStatus.tsx` / `JobMetaPickers.tsx` / `JobWmPanel.tsx` jeśli da się domknąć w karcie.

**Zakazane:** `JobListPanelHeader.tsx` · detail sekcje · Hub · `admin-nav` · Dashboard · Sidebar · tokens.

---

## 6. Ryzyka

| Ryzyko | Mitigation |
|--------|------------|
| Utrata skanu BZP/WM po schowaniu chipów | Exposed #2 priorytet BZP; WM w meta z krótkim label |
| Meta za długa → truncate ukrywa lidera | Kolejność pól: klient · termin · lider · reszta; `title` tooltip z pełną meta |
| `JobsView` diff za szeroki | Patch tylko list empty + group header className |
| Delete / bulk layout regresja | Nie ruszać kolumny delete/bulk poza hover parent |
| Emoji recoverable | Usunąć z UI listy; semantyka count zostaje |

---

## 7. Visual Diff

| Obszar | Teraz | UI-01D-A target |
|--------|-------|-----------------|
| Adres | `font-semibold` ale tonie w chipach | Dominanta karty |
| Chip row | 6–8× `text-[10px]` pills | ≤2 exposed + meta |
| Meta | Osobna linia + chip wall | Jeden blok `·` |
| Selected | `ring-1` + `bg-primary/8` | `bg-primary/10` · bez ring |
| Hover | `hover:bg-secondary/30` | `/25` + `duration-150` |
| Group header | uppercase muted | semibold sentence |
| Empty | plain text + opacity icon | `WgEmptyState` |
| Spacing | `my-1.5` · `py-2.5` | `my-2` · `py-3` |
| Progress label | `text-[10px]` | `text-xs` |
| Toolbar / detail | — | **bez zmian** |

---

## 8. Gate IMPLEMENT

```text
Owner GO: IMPLEMENT UI-01D-A-LIST
→ PAYROLL SAFETY GATE (ALL-NIE)
→ tylko pliki §5
→ AC §4
→ REPORT (bez commit chyba że Owner każe)
```

**Ten dokument = SSOT DESIGN FREEZE UI-01D-A-LIST. Status: FROZEN.**
