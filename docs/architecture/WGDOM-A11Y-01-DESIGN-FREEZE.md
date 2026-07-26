# WGDOM-A11Y-01 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Accessibility Polish · Thin Slice  
> **Parent:** WGDOM-POST-RELEASE-01 (PR-P1-1 · PR-P1-2 · PR-P2-6)  
> **App Shell:** PRODUCTION STABLE — **nie** otwierać layoutu shella  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · bez commit · bez push

---

## 0. Cel

Cienki release dostępności: **widoczny focus klawiaturowy** na klikalnych powierzchniach Robotów (lista + taby detail) oraz **wspólny token focus** oparty o `focus-visible` — bez zmian layoutu, kolorów idle/hover/active ani Design System API.

**Źródło:** POST-RELEASE PR-P1-1 (karty), PR-P1-2 (taby), PR-P2-6 (`focus:` vs `focus-visible:`).

---

## 1. Scope

| IN | OUT (twarde) |
|----|----------------|
| `JobListCardV2.tsx` — focus ring + aria na kontrolkach karty | Layout / spacing / typografia idle |
| `JobDetailSectionNav.tsx` — focus ring + aria tab (bez panel wiring) | Dashboard · Sidebar · Topbar **pliki** |
| `src/lib/wg-ui-tokens.ts` — **wyłącznie** definicja `WG_FOCUS_RING` | Forms · input validation · JobsView body/sections |
| `WgButton.tsx` — **tylko jeśli** wymagane po zmianie tokena (oczekiwane: **0 diff**) | API · Cloud · Providers · Routing |
| Wspólne focus utilities (= token `WG_FOCUS_RING`) | Design System API (brak nowych eksportów / props / variantów) |
| | Payroll CORE · status math · ops · theme · Login |
| | `aria-controls` + `role="tabpanel"` w `JobsView` — **DEFER** (patrz A11Y-DF-08) |

**Zasada:** zero zmian wizualnych poza **stanem focus** (i ewentualnie usunięciem ringa przy samym clicku myszą dzięki `focus-visible`).

### PAYROLL SAFETY GATE

| Warstwa | ALL-NIE? |
|---------|----------|
| Persist / write / sync / week / hours / rate / snapshot / UI payroll math | **NIE** (nietknięte) |
| Fokus CSS / aria presentation | **NIE** domena |

---

## 2. Design Freeze

### A11Y-DF-01 — Token `WG_FOCUS_RING` → `focus-visible`

| Element | Zamrożenie |
|---------|------------|
| Stała | **Ta sama nazwa** `WG_FOCUS_RING` — **zakaz** nowego eksportu (`WG_FOCUS_RING_VISIBLE` itd.) = brak DS API |
| Wartość **PRZED** | `focus:outline-none focus:ring-2 focus:ring-primary/15` |
| Wartość **PO** | `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15` |
| Ring paint | **Bez zmian:** `ring-2` · `ring-primary/15` (ten sam wygląd gdy widoczny) |
| Skutek uboczny | Konsumenci tokena (`WgButton`, Sidebar, Topbar, Modal) dostają `focus-visible` **bez** edycji ich plików — **dozwolone**; OUT dotyczy braku patchy layout w tych plikach |
| Zakaz | Zmiana grubości/koloru ringa · `ring-offset-*` · glow · scale na focus |

### A11Y-DF-02 — `WgButton`

| Element | Zamrożenie |
|---------|------------|
| Diff pliku | **Oczekiwane: brak** — już składa `WG_FOCUS_RING` |
| Implement | Otwierać plik **tylko** jeśli typecheck/build wymaga (nie planować) |
| Zakaz | Nowe props (`focusMode`, `variant` a11y) · zmiana size/paint |

### A11Y-DF-03 — `JobListCardV2` — focus targets

Nałożyć `WG_FOCUS_RING` (+ istniejące `transition-colors` bez zmian idle) na:

| Kontrolka | Wymagane |
|-----------|----------|
| Główny `<button>` select (adres / karta) | **TAK** |
| Bulk toggle | **TAK** |
| Delete (Trash) | **TAK** |
| Confirm „Usuń” | **TAK** |
| Cancel (X) | **TAK** |

| Zakaz | |
|-------|--|
| Zmiana `min-h`, padding, border idle/selected/hover | |
| Scale / translate na focus | |
| Nowy outline kolor poza tokenem | |

### A11Y-DF-04 — `JobListCardV2` — ARIA (karta)

| Stan | Zamrożenie |
|------|------------|
| Select button gdy `selected` | `aria-pressed={selected}` (**lub** równoważne `aria-current="true"` gdy selected — **wybrać jedno**; preferencja DF: **`aria-pressed`**) |
| Bulk | Zachować `aria-pressed` + `aria-label` (już są) |
| Delete idle | Dodać `aria-label="Usuń robotę"` (dziś głównie `title`) |
| Confirm Usuń | `aria-label="Potwierdź usunięcie roboty"` (gdy brak) |
| Cancel | Zachować `aria-label="Anuluj usuwanie"` |
| Zakaz | `role="option"` / pełny listbox pattern · zmiana handlerów select/delete |

### A11Y-DF-05 — `JobDetailSectionNav` — focus

| Element | Zamrożenie |
|---------|------------|
| Każdy `role="tab"` button | `className` += `WG_FOCUS_RING` |
| Idle / active paint | **Bez zmian** (01D-C: `primary/10` active) |
| Zakaz | Zmiana wysokości chipów, badge, scroll |

### A11Y-DF-06 — `JobDetailSectionNav` — ARIA audyt (IN)

| Atrybut | Stan dziś | Zamrożenie A11Y-01 |
|---------|-----------|---------------------|
| `role="tablist"` | Jest | **Zachować** |
| `aria-label="Sekcje roboty"` | Jest | **Zachować** |
| `role="tab"` | Jest | **Zachować** |
| `aria-selected={isActive}` | Jest | **Zachować** — SSOT zaznaczenia taba |
| `aria-pressed={isActive}` | Jest (redundantne z tab) | **USUNĄĆ** — konflikt semantyczny tabs vs toggle |
| `aria-controls` | Brak | **DEFER** — wymaga `id` paneli w `JobsView` (OUT) |
| `id` na tab | Brak | **Opcjonalne** w tym slice: `id={`job-detail-tab-${id}`}` pod przyszłe `aria-controls` — **bez** panel wiring |
| Roving tabindex | Brak (wszystkie tabbable) | **DEFER** — nie w scope thin |
| `JobsDetailEmptyState` | WgButton | Bez zmian pliku poza dziedziczeniem tokena |

### A11Y-DF-07 — Audyt `aria-current` / `aria-selected` / `aria-controls` (wynik)

| Powierzchnia | Werdykt |
|--------------|---------|
| Sidebar `aria-current="page"` | Poza plikami IN — **nie ruszać**; token focus-visible i tak poprawi focus |
| Detail tabs `aria-selected` | **OK** — zostaje |
| Detail tabs `aria-pressed` | **Usunąć** (DF-06) |
| Detail `aria-controls` ↔ tabpanel | **Luka** — dokumentowana; **DEFER** (A11Y-DF-08) |
| List card | Brak `aria-current`; **`aria-pressed` na select** (DF-04) |

### A11Y-DF-08 — DEFER (świadomy)

| Item | Powód |
|------|-------|
| `JobsView` `role="tabpanel"` + `id` + `aria-labelledby` / tab `aria-controls` | Wymaga chirurgii `JobsView` (OUT tego slice / ryzyko blast) |
| Roving `tabIndex={0/-1}` + strzałki w tablist | Większy behavior change; nie thin |
| Dashboard body / Topbar ThemeToggle focus | OUT pliki; Topbar dziedziczy token jeśli używa `WG_FOCUS_RING` |
| Kontrast meta `muted/70` (PR-P2-4) | Nie focus — osobny slice |

### A11Y-DF-09 — Visual / motion

| Reguła | Zamrożenie |
|--------|------------|
| Idle / hover / selected (nie-focus) | **Bit-identyczne** poza usunięciem mouse-focus ring |
| Focus | Wyłącznie paint z `WG_FOCUS_RING` |
| `motion-reduce` | Nie dodawać nowych animacji focus |

---

## 3. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-01** | `WG_FOCUS_RING` używa `focus-visible:ring-*` (nie `focus:ring-*`) |
| **AC-02** | Tab / click myszą na `WgButton` / Sidebar / Topbar **nie** zostawia trwałego ringa po clicku (focus-visible) |
| **AC-03** | Keyboard Tab → karta Roboty (select): widoczny ring |
| **AC-04** | Keyboard → bulk / delete / confirm / cancel na karcie: widoczny ring |
| **AC-05** | Keyboard → tab detail (`JobDetailSectionNav`): widoczny ring; active nadal `aria-selected` |
| **AC-06** | Brak `aria-pressed` na `role="tab"` |
| **AC-07** | Select karty: `aria-pressed` odzwierciedla `selected` |
| **AC-08** | Diff wizualny idle/hover/selected (screenshot) = brak zmian poza focus |
| **AC-09** | Build PASS · brak zmian API / Cloud / Payroll / routing |
| **AC-10** | Lista plików w commitcie ⊆ allowlist §5 (max + tokens; WgButton tylko jeśli konieczny) |

---

## 4. Ryzyka

| ID | Ryzyko | Mitigacja |
|----|--------|-----------|
| **R1** | Globalna zmiana tokena zmienia focus we **wszystkich** konsumentach | Zamierzone; smoke: Login CTA, Topbar ikony, Sidebar nav, Modal — tylko focus behavior |
| **R2** | Ring `primary/15` słabo widoczny na niektórych tłach | **Nie** pogrubiać w tym slice; osobny contrast slice jeśli Owner GO |
| **R3** | `aria-pressed` + selected paint — double signal | OK dla button toggle; nie mieszać z `aria-current` |
| **R4** | Usunięcie `aria-pressed` z tabów | Zgodne z ARIA tabs; smoke SR opcjonalny |
| **R5** | Scope creep `JobsView` aria-controls | **Zakaz** bez Owner GO na A11Y-01B |
| **R6** | Przypadkowy polish layout kart | Diff review: tylko className focus + aria |

---

## 5. Lista plików

### Allowlist IMPLEMENT (max)

| Plik | Rola |
|------|------|
| `src/lib/wg-ui-tokens.ts` | A11Y-DF-01 — wartość `WG_FOCUS_RING` |
| `src/app/JobListCardV2.tsx` | A11Y-DF-03 · DF-04 |
| `src/app/JobDetailSectionNav.tsx` | A11Y-DF-05 · DF-06 |

### Conditional

| Plik | Kiedy |
|------|-------|
| `src/app/ui/WgButton.tsx` | **Tylko** gdy bez diffu nie da się spełnić AC (oczekiwane: **nie**) |

### Zakaz w commitcie

`DashboardView` · `AdminSidebar` · `AdminTopbar` · `JobsView` · Payroll · Cloud · Login · Theme · nowe pliki DS · changelog bump **opcjonalny** dopiero przy release Owner GO

### Docs (osobny docs commit lub ten sam thin — Owner)

| Plik | Rola |
|------|------|
| `docs/architecture/WGDOM-A11Y-01-DESIGN-FREEZE.md` | Ten dokument |

---

## 6. Poza scope / następny slice (nie teraz)

| Slice | Treść |
|-------|--------|
| **A11Y-01B** | `JobsView` tabpanel + `aria-controls` + labelledby |
| **A11Y-01C** | Roving tabindex tablist |
| **UI body** | Dashboard braki `rounded-full` / focus (POST-RELEASE PR-P1-3) |

---

## 7. Definition of Done (po Owner GO IMPLEMENT)

1. DF przestrzegane (AC-01…10).  
2. Smoke keyboard: lista Robotów + detail tabs + Topbar/Sidebar focus-visible.  
3. Brak regresji wizualnej idle.  
4. Thin commit allowlist.  
5. Bez push bez Owner GO RELEASE.

---

**OWNER:** DESIGN FREEZE gotowy. Czekam na **GO IMPLEMENT** (lub korektę scope).  
**Nie rozpoczęto implementacji.**
