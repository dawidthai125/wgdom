# WGDOM-DASHBOARD-BODY-S3 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** FEATURE UI · Thin Slice · Visual migration only  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · S3 Notatki · po **S1** (`1cf8af2`) · **S2** (`e2e1c58`)  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · **bez COMMIT** · **bez PUSH**

---

## 0. Cel

Migracja **wyłącznie** widgetu **Notatki operacyjne** (W04) do języka GDS **zgodnego ze shipped S1/S2**:

- `WgCard` soft  
- spójna typografia, spacing, hierarchy  
- CTA wyłącznie **ghost / secondary** (cały panel = klik → moduł; **nie** Primary)  
- zachowanie obecnej funkcjonalności i danych (`summary` / `onOpen`)

**Bez** zmiany logiki, API, `DashboardView`, innych widgetów, nowych funkcji.

**Referencja wizualna:** S1/S2 — `WgCard` `elevation="soft"` `padding="sm"` `radius="md"` · **bez** `!p-0` · title `text-sm font-semibold` · **bez** `uppercase tracking-wider` na tytule sekcji.

---

## 0.1 Plik implementacji

| Rola | Plik |
|------|------|
| **IN (implement)** | `src/app/DashboardOperationalNotesWidget.tsx` |
| **Mount only** | `DashboardView.tsx` ~581–585 — `{showOperationalNotesWidget && <DashboardOperationalNotesWidget … />}` |
| **DashboardView** | **OUT S3** — zero zmian props / `computeOperationalNotesDashboardSummary` / ACL |
| **Summary SSOT** | `src/lib/operational-notes-dashboard.ts` — **OUT** (logika) |

---

## 1. Current State

| Element | Dziś | Plik |
|---------|------|------|
| **Warunek mount** | `canShowOperationalNotesDashboardWidget(adminSession)` w parent | `DashboardView` — OUT |
| **Props** | `summary: OperationalNotesDashboardSummary` · `onOpen: () => void` | widget |
| **Shell** | Raw `<button>` · `rounded-xl border px-4 py-3` · unread: `bg-primary/5 border-primary/25` · else `bg-card border-border` | ~23–31 |
| **Title** | `text-xs font-semibold uppercase tracking-wider` · „Notatki operacyjne” | ~36–38 |
| **Affordance** | `ChevronRight` muted (nie osobny button) | ~40 |
| **Metryki ×3** | Grid 3 kol: Łącznie / Nieprzeczytane / Od inspektora · label `text-[10px] uppercase tracking-wider` · value `text-lg font-bold` JetBrains Mono | ~43–65 |
| **Dane** | `summary.total` · `summary.unread` · `summary.fromInspector` · `lastActivity` | bez zmian |
| **Footer** | `text-[10px]` „Ostatnia aktywność: …” · tytuł + czas / „brak notatek” | ~67–71 |
| **A11y** | `aria-label="Notatki operacyjne — przejdź do modułu"` | ~31 |
| **Click** | cały widget → `onOpen()` → navigate `operationalnotes` | parent |

**Język:** legacy panel + shout-case — kontrastuje z S1 Braki / S2 Pilne (`WgCard` soft + spokojny title).

---

## 2. RCA (S3)

| # | Przyczyna | Skutek |
|---|-----------|--------|
| **R1** | BODY-01 AUDIT: W04 = P1 po Braki/Pilne; Foundation OUT body | Notatki nigdy nie dostały GDS |
| **R2** | S1+S2 zamknęły mid-body accordion cards | Notatki tuż pod KPI nadal raw `rounded-xl border` + uppercase |
| **R3** | Widget = jeden big `<button>` (OK UX), ale paint pre-GDS | Brak `WgCard`; `text-[10px]` / shout-case łamie rytm S1/S2 |
| **R4** | Nie bug danych | `computeOperationalNotesDashboardSummary` działa; to wyłącznie język UI |

**Werdykt:** gap wizualny / scope — **nie** regresja unread/total.

---

## 3. Design (zamrożone decyzje)

### S3-DF-01 — Scope / pliki

| IN | OUT (twarde) |
|----|----------------|
| `DashboardOperationalNotesWidget.tsx` — shell · typography · spacing · unread tint · focus | `DashboardView.tsx` |
| `WgCard` · opcjonalnie `WgButton` ghost (jeśli wydzielony affordance) · `WG_FOCUS_RING` · `WG_TOUCH_MIN` · `WG_TYPE_*` · `cn` | `operational-notes-dashboard.ts` · `operational-notes*` logika |
| | Braki · Pilne · Przetargi · W08–W10 · Hero · KPI |
| | Nowe props · nowe metryki · Primary CTA · nowe funkcje |

**Jeden plik implementacji (gdy GO IMPLEMENT):** `DashboardOperationalNotesWidget.tsx`.

### S3-DF-02 — Shell (`WgCard` soft)

| Element | Zamrożenie |
|---------|------------|
| Root | **`WgCard`** `as="button"` `type="button"` `elevation="soft"` `padding="sm"` `radius="md"` · `onClick={onOpen}` · `className` w-full text-left + hover border · **bez** `!p-0` |
| Alternatywa (równoważna) | `WgCard` soft wrapping **wewnętrzny** `button`/`div role` — preferowane **`as="button"`** (jeden hit target, jak dziś) |
| Unread tint | Zachować semantykę: `hasUnread` → lekki `bg-primary/5` + `border-primary/25` (via `className` na `WgCard`) · idle → default soft surface |
| `aria-label` | **Bez zmian** tekstu |
| Zakaz | Raw `rounded-xl border` jako jedyna powierzchnia · solid Primary fill na całą kartę |

### S3-DF-03 — Typography / hierarchy

| Element | Zamrożenie |
|---------|------------|
| Title | „Notatki operacyjne” · **`text-sm font-semibold text-foreground`** · **zakaz** `uppercase tracking-wider` na tytule |
| Icon | `ScrollText` ~13–14 · unread → `text-primary` · else muted (jak dziś) |
| Chevron | Zachować `ChevronRight` jako affordance (nie osobny Primary) · muted |
| Metric labels | „Łącznie” / „Nieprzeczytane” / „Od inspektora” · **`WG_TYPE_LABEL`** (GDS) **lub** `text-xs text-muted-foreground` — **zakaz** `text-[10px]` |
| Metric values | Te same liczby · JetBrains Mono · `text-lg font-semibold` (lub `font-bold` jak dziś) · unread value `text-primary` gdy `hasUnread` |
| Footer | „Ostatnia aktywność: …” · `text-xs text-muted-foreground` · **zakaz** `text-[10px]` · treść / fallbacki **bez zmian** |

### S3-DF-04 — Spacing / responsive

| Element | Zamrożenie |
|---------|------------|
| Grid metryk | `grid-cols-3 gap-2 sm:gap-4` · `mt-2` / `mt-3` zgodne z rytmem S1 header→body |
| Touch | Cały card klikalny · min wysokość sensowna · `WG_FOCUS_RING` / focus-visible na root button-card |
| Mobile | Pełna szerokość · truncate title/footer jak dziś |

### S3-DF-05 — CTA / Primary contract

| Reguła | Zamrożenie |
|--------|------------|
| Interakcja | Nadal **jeden** klik → `onOpen` (otwarcie modułu) — funkcjonalność **bez zmian** |
| Warianty | Jeśli osobny control: tylko **`WgButton` ghost/secondary** · **zakaz** `variant="primary"` |
| Cały `WgCard as="button"` | **Nie** jest Primary CTA w sensie Guard (Guard liczy hero Primary po accessible name) — OK |
| Hero Primary | **Nienaruszony** (T05) |

### S3-DF-06 — Dane / semantyka

| Pole | Zamrożenie |
|------|------------|
| `summary.total` / `unread` / `fromInspector` | **Bez zmian** źródła ani mapowania |
| `lastActivity.title` / `.at` · `fmtActivityTime` | **Bez zmian** (dozwolone tylko CSS na wrapper) |
| `hasUnread = summary.unread > 0` | **Bez zmian** |
| Props API `{ summary, onOpen }` | **Bez zmian** |

---

## 4. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-1** | Root = **`WgCard` soft** (nie raw bordered `<button>` jako jedyna powierzchnia) |
| **AC-2** | Title `text-sm font-semibold` · **bez** `uppercase` / `tracking-wider` |
| **AC-3** | Brak `text-[10px]` na title / labels / footer |
| **AC-4** | Metryki pokazują te same `total` / `unread` / `fromInspector` |
| **AC-5** | Klik → `onOpen` · `aria-label` bez zmian sensu |
| **AC-6** | Unread tint vs idle — zachowana semantyka `hasUnread` |
| **AC-7** | **0** × `WgButton variant="primary"` · brak solid Primary CTA |
| **AC-8** | Diff **tylko** `DashboardOperationalNotesWidget.tsx` |
| **AC-9** | `DashboardView` · Braki · Pilne · inne — **nietknięte** |
| **AC-10** | Guard T05 (≤1 hero Primary) nadal PASS przy PV |

---

## 5. Zakres OUT

| OUT | Powód |
|-----|--------|
| Logika `computeOperationalNotesDashboardSummary` / ACL `canShow…` | Zakaz Owner |
| API props widgetu | Zakaz |
| `DashboardView.tsx` | Mount OUT |
| Moduł Notatki (lista / CRUD) | Poza slice |
| Braki · Pilne · Przetargi · listy dolne · Hero · KPI | Inne slice’y |
| Nowe metryki / filtry / badge unread osobny EPIC | Zakaz nowych funkcji |
| Primary CTA | Kontrakt Foundation |
| IMPLEMENT / COMMIT / PUSH w tym etapie | Tylko DESIGN FREEZE |

---

## 6. Ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| `WgCard as="button"` + className unread zepsuje soft elevation | Niski | Skopiować wzorzec finance `WgCard as="button"` z Dashboard + additive tint |
| `WG_TYPE_LABEL` (uppercase) vs „bez shout-case” Owner intent | Niski | Uppercase **tylko** na micro-labelach KPI (GDS); title sekcji **bez** uppercase (jak S1/S2) |
| Focus ring / double border na clickable card | Niski | `WG_FOCUS_RING` · uniknąć card-in-card |
| Scope creep do parent summary | Średni | AC-8 · nie tykać `operational-notes-dashboard.ts` |
| Second Primary w hero przez złą nazwę przycisku | Niski | Nie zmieniać accessible name na hero Primary labels |

---

## 7. Mapping

| AUDIT | Ten DF |
|-------|--------|
| BODY-01 **S3** Notatki | **Ten dokument** |
| S1 Braki · S2 Pilne | Referencja wizualna (shipped) |
| S4 Przetargi | OUT |

---

## 8. Next gate

```text
DESIGN FREEZE (ten dok) → Owner GO IMPLEMENT
  → thin diff DashboardOperationalNotesWidget.tsx only
  → Build / typecheck / login smoke / ui-guard
  → Owner GO COMMIT/PUSH
```

---

**WGDOM-DASHBOARD-BODY-S3**  
**Etap: DESIGN FREEZE**  
**Status: FROZEN** · implementacja / commit / push — **nie wykonane**
