# NG-07-TEUX-01 — Lista Przetargów (`/przetargi`) · UX/UI AUDIT

> **Status:** **AUDIT COMPLETE** · **PLAN FINALIZED** · **DESIGN FREEZE v1.0** · **IMPLEMENT BLOCKED**  
> **Data audytu:** 2026-07-08  
> **Bundle ID:** NG-07-TEUX-01  
> **Class:** **FEATURE UI**  
> **Baseline prod:** UI **2.63.68** · commit **`79f2d17`**  
> **Scope route:** `/przetargi` · tab **Lista** (`TendersModule` → `TendersListPage` → `TendersView`)  
> **Out of scope:** Payroll · Cloud Sync · Pipeline · Parser · Trust Layer · Edge · business logic  
> **Design Freeze:** [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md)  
> **Powiązane:** [`NG-06-TEUX-EPIC-CLOSE-REPORT.md`](NG-06-TEUX-EPIC-CLOSE-REPORT.md) · [`NG-06-TEUX-VISUAL-INVENTORY.md`](NG-06-TEUX-VISUAL-INVENTORY.md) · [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) · **TOKEN FREEZE** `tender-ux-tokens.ts`

```text
CEL:     UX/UI audit pulpitu listy Przetargów — layout, hierarchia, KPI, karty, spacing,
         responsive, spójność DS, gęstość wizualna.

ZASADA:  UI-only · reuse TendersView + TEUX tokens · bez pipeline/sync/parser.
         Screenshot gate przed DESIGN FREEZE wizualnym.

WORKFLOW: AUDIT ✅ COMPLETE
         → PLAN ✅ FINALIZED
         → DESIGN FREEZE ✅ v1.0 (pending approval)
         → ARCH REVIEW ⏸
         → OWNER GO ⏸
         → IMPLEMENT ⛔ BLOCKED
```

---

## 0. Werdykt audytu

| Pole | Wartość |
|------|---------|
| **AUDIT (CODE)** | **ACCEPTED** |
| **AUDIT (VISUAL)** | **COMPLETE** (owner visual review 2026-07-08) |
| **Priorytety visual** | **2× P0** · **4× P1** · **4× P2** (§0.1) |
| **PLAN** | **FINALIZED** — slice NG-07-01…04 |
| **DESIGN FREEZE** | **v1.0** — [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md) |
| **IMPLEMENT** | **BLOCKED** |

### 0.1 Priorytety visual (owner — kolejność implementacji)

| P | # | Finding | Slice |
|---|-----|---------|-------|
| **P0** | 1 | KPI Dashboard nad listą przetargów | NG-07-01 |
| **P0** | 2 | Redukcja wysokości first-screen | NG-07-02 |
| **P1** | 3 | Hierarchia nagłówka modułu | NG-07-01 |
| **P1** | 4 | Usunięcie duplikatu CTA Odśwież | NG-07-01 |
| **P1** | 5 | Uproszczenie hierarchii wizualnej karty | NG-07-03 |
| **P1** | 6 | Poprawa gęstości desktop | NG-07-04 |
| **P2** | 7 | Typografia | NG-07-03 |
| **P2** | 8 | Spacing | NG-07-02, NG-07-04 |
| **P2** | 9 | Spójność kolorów | NG-07-01 |
| **P2** | 10 | Empty states | NG-07-03 |

---

## 1. Zakres audytu

### 1.1 In scope

| Obszar | SSOT w kodzie |
|--------|----------------|
| Layout modułu + lista | `TendersModule.tsx`, `TendersView.tsx` |
| Karty | `TenderListMobileCard.tsx`, `TenderListDesktopCard.tsx`, `tender-list-card-model.ts` |
| Filtry / KPI panel | `TenderListFiltersPanel.tsx`, `TenderListFilterFab.tsx`, `TenderListFilterSheet.tsx` |
| Design System | `tender-ux-tokens.ts`, `TenderUxChip`, `TenderUxBadge`, `TenderUxEmptyState` |
| Logika prezentacji (read-only) | `tenders-list-ux.ts` |

### 1.2 Out of scope (frozen)

Payroll · Cloud Sync · PWRB · `useTendersPipeline` internals · parser · trust layer · Edge · decyzje GO/HOLD · nawigacja V4 detalu (osobny bundle).

---

## 2. Mapa widoku (as-is)

```text
/przetargi (V4, listOnly)
└── TendersModule
    ├── TendersModuleHeader          ← headline + CTA „Odśwież z BZP”
    ├── TendersTabBar (7 tabów)      ← horizontal scroll mobile
    └── TendersListPage
        └── TendersView
            ├── [sticky md+] Search + status + CTA „Odśwież”
            ├── Insight banner (TEUX-7d)
            ├── [lg+] Collapsible „Więcej filtrów” → TenderListFiltersPanel (max-w-4xl)
            ├── Licznik wyników (10px)
            ├── Sekcja „Dzisiaj” (opcjonalnie)
            ├── Sekcja „Lista”
            │   └── article[severity stripe]
            │       ├── mobile: TenderListMobileCard (KPI 3-col)
            │       └── desktop: TenderListDesktopCard (status + deadline)
            ├── TenderListFilterFab    ← lg:hidden
            └── TenderListFilterSheet  ← pełny panel filtrów mobile
```

**Breakpoint główny:** `lg` (1024px) — split karty + filtry desktop vs FAB/sheet mobile.

---

## 3. Screenshot gate — AUDIT (VISUAL) ✅ COMPLETE

Owner visual review **2026-07-08** (prod **2.63.68**, `/przetargi` tab Lista).

### 3.1 Screenshoty (SS-01…10)

| ID | Status |
|----|--------|
| SS-01…10 | **REVIEWED** (owner visual audit) |

### 3.2 Walidacja wizualna (V-1…V-6)

| # | Walidacja | Werdykt |
|---|-----------|---------|
| V-1 | Complete visual audit | **PASS** |
| V-2 | UX-03 gęstość ≤390px | **CONFIRMED** → NG-07-03 |
| V-3 | UX-05 max-w-4xl filtry | **CONFIRMED** → NG-07-04 |
| V-4 | Hierarchy fold / CTA / sekcje | **CONFIRMED** → NG-07-01, NG-07-02 |
| V-5 | Spacing | **CONFIRMED** → NG-07-02, NG-07-04 |
| V-6 | KPI surface mobile vs desktop | **CONFIRMED** → NG-07-01 |

---

## 4. Findings — priorytety

### Legenda

| Priorytet | Znaczenie |
|-----------|-----------|
| **P0** | Blokuje spójny „dashboard” UX lub narusza zasady TEUX (CTA, mobile discoverability) |
| **P1** | Wyraźna niespójność DS / hierarchii — fix w NG-07 |
| **P2** | Polish / gęstość / discoverability — backlog w NG-07 lub NG-07b |

---

### 4.1 Layout & information hierarchy

| ID | P | Finding | Dowód (kod) | Wpływ |
|----|---|---------|---------------|-------|
| **UX-01** | **P0** | **Duplikat primary CTA sync** — nagłówek modułu „Odśwież z BZP” + toolbar listy „Odśwież” + empty states | `TendersModule.tsx` L116–124 · `TendersView.tsx` L539–548 · empty L673–695 | Narusza TEUX „jedno CTA primary per kontekst”; szum na above-the-fold |
| **UX-02** | **P0** | **Mobile: brak KPI/kolejki na powierzchni listy** — statystyki, kolejki, funnel tylko w sheet (FAB) | Filtry `hidden lg:block` L573 · `TenderListFilterFab` L710 | Użytkownik nie widzi „dashboard” metryk bez dodatkowego tapu |
| **UX-03** | **P0** | **Gęstość / truncation ≤390px — PENDING visual** | Wymaga SS-03, SS-04 · walidacja V-2 | Ryzyko overflow KPI row, 2-line title + 3 badges |
| **UX-04** | **P1** | **Module chrome zajmuje fold** — header + 7-tab bar przed treścią listy | `TendersModule.tsx` L96–94, L201 | Lista nie jest pierwszym focal point; „dashboard” odczuwalny jako narzędzie tabów |
| **UX-05** | **P1** | **Filtry desktop `max-w-4xl`, lista full-width** — **CONFIRM/REJECT po SS-09** | `TendersView.tsx` L573 | Wizualny disconnect: wąski panel filtrów vs pełna szerokość kart |
| **UX-06** | **P1** | **Sekcje „Dzisiaj” vs „Lista” — różna typografia** | L657–662 vs L702 — `text-xs` vs `text-[10px]` subcopy | Hierarchia sekcji niespójna względem TEUX |

---

### 4.2 KPI presentation

| ID | P | Finding | Dowód | Wpływ |
|----|---|---------|-------|-------|
| **UX-07** | **P1** | **Brak module-level KPI strip na Liście** (w odróżnieniu od Strategii `StrategyKpiStrip` i Pulpitu `TendersShortcutPanel`) | Lista: KPI tylko per-karta (mobile) lub w panelu filtrów | Oczekiwanie „dashboard” ≠ sama lista kart |
| **UX-08** | **P1** | **Desktop vs mobile KPI asymetria** — mobile: Termin/Trafność/Wadium grid; desktop: tylko status + deadline | `TenderListMobileCard.tsx` L79–99 · `TenderListDesktopCard.tsx` L76–86 | Ten sam przetarg — inna gęstość informacji per breakpoint |
| **UX-09** | **P1** | **Panel „Statystyki” = text links**, nie `TEUX_KPI_LABEL` / `TEUX_KPI_VALUE` | `TenderListFiltersPanel.tsx` L225–240 | DS drift vs Strategia/Pulpit |
| **UX-10** | **P2** | **Funnel „Pipeline”** — wall of inline spans, bez grupowania wizualnego | L243–256 | Trudne skanowanie na desktop w collapsible |

---

### 4.3 Cards & visual density

| ID | P | Finding | Dowód | Wpływ |
|----|---|---------|-------|-------|
| **UX-11** | **P2** | **Mobile badge cap 4 + overflow** — urgency może być ukryta za `+N` | `tender-list-card-model.ts` (mobileBadges cap) | Ryzyko utraty sygnału na gęstych pipeline |
| **UX-12** | **P2** | **Wysoka pionowa gęstość karty mobile** — badges + title + org + bid + KPI row | `TenderListMobileCard.tsx` | 5 warstw przed tap; OK jeśli SS-03 PASS |
| **UX-13** | **P2** | **Severity stripe** — spójne (`border-l-[3px]`) ✓; brak wizualnego separatora między kartami poza border article | `tender-list-card-model.ts` | Na długiej liście monotonia — polish |

---

### 4.4 Spacing & responsive

| ID | P | Finding | Dowód | Wpływ |
|----|---|---------|-------|-------|
| **UX-14** | **P1** | **`text-[10px]` poza tokenami TEUX** w liczniku, „Dzisiaj”, auto-award | `TendersView.tsx` L595, L659, L650 | TOKEN FREEZE violation (ad-hoc) |
| **UX-15** | **P2** | **Toolbar refresh `min-h-[36px]`** vs TEUX `min-h-[44px]` na mobile | `TendersView.tsx` L543 | Touch target poniżej 44px na ścieżce mobile |
| **UX-16** | **P2** | **Sticky search tylko `md+`** — mobile brak sticky (świadomy MOBILE-P0-S1) | L517 | Po scrollu mobile traci search — trade-off OK, udokumentować |

---

### 4.5 Design System consistency

| ID | P | Finding | Dowód | Wpływ |
|----|---|---------|-------|-------|
| **UX-17** | **P1** | **Insight banner** używa `listInsightClass()` z ad-hoc Tailwind, nie `TEUX_COLOR_*` roles | `TendersView.tsx` L57–67, L552–569 | Drift kolorów urgent/success vs tokeny |
| **UX-18** | **P2** | **Legacy header path** w `TendersView` (`!hideModuleHeader`) — non-TEUX `text-lg` / `text-xs` | L487–512 | Martwy dla V4 `hideModuleHeader` — cleanup candidate |
| **UX-19** | **P2** | **Karty listy** — poprawne użycie `TEUX_FONT_*`, `TEUX_SPACE_MD` ✓ | Mobile/Desktop cards | Positive baseline NG-06 TEUX-3 |

---

### 4.6 Positive findings (keep)

| ID | Opis |
|----|------|
| **UX+01** | Split mobile/desktop cards z severity stripe — wzorzec TEUX-3 stabilny |
| **UX+02** | `TenderUxEmptyState` z dual CTA — dobre empty hierarchy |
| **UX+03** | Mobile filter sheet — pełna funkcjonalność panelu (TEUX-7a) |
| **UX+04** | Insight banner klikalny → kolejka (TEUX-7d) |
| **UX+05** | Safe-area padding scroll root listy |

---

## 5. Macierz findings → AC (dla PLAN)

| AC | Opis | Findings |
|----|------|----------|
| AC-LAYOUT | Spójny above-the-fold, jedno primary CTA sync | UX-01, UX-04 |
| AC-HIERARCHY | Dashboard metryki widoczne bez ukrycia za FAB (mobile) | UX-02, UX-07 |
| AC-KPI | Spójna prezentacja KPI lista desktop/mobile + DS tokens | UX-08, UX-09 |
| AC-DS | Zero ad-hoc `text-[10px]` / ad-hoc colors w liście | UX-14, UX-17 |
| AC-RESPONSIVE | Touch 44px + screenshot PASS ≤390px | UX-03, UX-15, SS-* |
| AC-DENSITY | Karty skanowalne bez utraty urgency | UX-11, UX-12, SS-03 |

---

## 6. Ryzyka implementacji (preview)

| Ryzyko | Mitigacja |
|--------|-----------|
| TOKEN FREEZE | Tylko **import istniejących** tokenów; nowe tokeny → Owner GO + MID review |
| #CORE-013 | NG-07 = **osobny bundle FEATURE UI** — zero `cloud-sync.ts` / payroll |
| Regresja filtrów | Nie zmieniać `tenders-list-ux.ts` logiki — tylko prezentacja |
| Duplikat CTA fix | Usunąć/redukować **UI-only** — nie zmieniać `pipeline.refreshFromBzp` |

---

## 7. AUDIT checklist

| # | Item | Status |
|---|------|--------|
| A-1 | Mapa komponentów `/przetargi` lista | **PASS** |
| A-2 | TEUX token usage scan | **PASS** (z findingami UX-14, UX-17) |
| A-3 | Responsive patterns `lg` / FAB / sticky | **PASS** |
| A-4 | Out of scope respected | **PASS** |
| A-5 | Screenshot collection SS-01…10 | **PASS** |
| A-6 | Visual validation V-1…V-6 | **PASS** |
| A-7 | Findings P0/P1/P2 | **PASS** |
| A-8 | PLAN + DESIGN FREEZE | **PASS** |

**AUDIT: COMPLETE** · SSOT freeze: [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md)

---

## 8. PLAN — NG-07-TEUX-01 (FINALIZED)

> **Status PLAN:** **FINALIZED**  
> **SSOT implementacji:** [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md) §4  
> **IMPLEMENT:** **BLOCKED** do ARCH REVIEW + OWNER GO

### 8.1 Cel PLAN

Poprawić UX pulpitu listy `/przetargi` w **4 slice’ach UI** bez dotykania pipeline/sync.

### 8.2 Slice’y (kolejność frozen)

| Slice | Zakres | Priorytety | Pliki główne |
|-------|--------|------------|--------------|
| **NG-07-01** | Header hierarchy + KPI Dashboard + CTA dedup | P0-1, P1-3, P1-4, P2-9 | `TendersModule.tsx`, `TendersView.tsx`, **`TenderListKpiDashboard.tsx`** (new) |
| **NG-07-02** | First-screen compaction | P0-2, P2-8 | `TendersModule.tsx`, `TendersView.tsx` |
| **NG-07-03** | Tender card refinement + typography + empty | P1-5, P2-7, P2-10 | `TenderListMobileCard.tsx`, `TenderListDesktopCard.tsx`, `tender-list-card-model.ts` |
| **NG-07-04** | Desktop density + UX-05 width align | P1-6, P2-8 | `TendersView.tsx`, `TenderListDesktopCard.tsx`, `TenderListFiltersPanel.tsx` |

### 8.3 DESIGN FREEZE

**SSOT:** [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md) v1.0 — **PENDING ARCH REVIEW + OWNER GO**

### 8.4 Test plan (post-IMPLEMENT)

| Test | Typ |
|------|-----|
| `npm run build` | Gate A |
| `npm run test:infra -- --gate B --scope tenders` | Gate B |
| `npm run test:infra -- --gate B --scope payroll` | Regression guard |
| Manual SS-01…10 replay | Visual |
| `npm run test:mobile` | Responsive |

### 8.5 Werdykt PLAN

| Pole | Wartość |
|------|---------|
| **Bundle class** | FEATURE UI |
| **Slices** | NG-07-01 → 02 → 03 → 04 |
| **TOKEN FREEZE** | Import-only |
| **IMPLEMENT** | **BLOCKED** |

---

## 9. Workflow status

```text
AUDIT              ✅ COMPLETE
PLAN               ✅ FINALIZED
DESIGN FREEZE      ✅ v1.0 (pending approval)
ARCH REVIEW        ⏸ NEXT
OWNER GO           ⏸ BLOCKED
IMPLEMENT            ⛔ BLOCKED
```

**One Bundle = One Goal** · **#CORE-013** — FEATURE UI only.

---

*SSOT: audyt — ten plik · implementacja — [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md). Następny krok: **ARCH REVIEW** → **OWNER GO**.*
