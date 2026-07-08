# NG-07-TEUX-01 — Lista Przetargów · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0 — PENDING ARCH REVIEW + OWNER GO**  
> **Data freeze:** 2026-07-08  
> **Bundle ID:** **NG-07-TEUX-01**  
> **Class:** **FEATURE UI** (#CORE-013 · #CORE-014)  
> **Baseline prod:** UI **2.63.68** · commit **`79f2d17`**  
> **Audyt:** [`NG-07-TEUX-01-UX-AUDIT.md`](./NG-07-TEUX-01-UX-AUDIT.md) — **AUDIT COMPLETE**  
> **Parent DS:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) · **TOKEN FREEZE ACTIVE**  
> **IMPLEMENT:** **BLOCKED** do jawnego **FEATURE Owner GO**

```text
CEL:     Pulpit listy /przetargi — KPI dashboard nad listą, mniejszy first-screen,
         hierarchia nagłówka, jedno CTA sync, prostsze karty, gęstszy desktop.

ZASADA:  UI-only · SSOT danych z pipeline.stats + queueCounts + funnel (read-only)
         · reuse TEUX_KPI_* · zero tenders-list-ux.ts logiki · zero sync/pipeline.

WORKFLOW: AUDIT ✅ → PLAN ✅ → DESIGN FREEZE ✅ (ten plik)
          → ARCH REVIEW ⏸ → OWNER GO ⏸ → IMPLEMENT ⛔
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | UX pulpitu tab **Lista** w module Przetargi |
| **Poza zakresem** | Payroll · Cloud Sync · PWRB · parser · trust · Edge · `useTenderPipelineRuntime` · V4 detal · logika filtrów |
| **Nowe pole KV** | **Brak** |
| **Nowe tokeny** | **Brak** (import-only z `tender-ux-tokens.ts`) |
| **Slice’y IMPLEMENT** | **NG-07-01 → 02 → 03 → 04** (osobne releasy lub jeden commit bundle — Owner decision) |
| **Principles** | **#NG07-001–#NG07-008** (§1) |

### Final Decision

**PENDING ARCH REVIEW + OWNER GO** — specyfikacja kompletna. **IMPLEMENT pozostaje BLOCKED**.

---

## 1. Principles (#NG07)

| ID | Zasada |
|----|--------|
| **#NG07-001** | **UI-only** — zero zmian merge, scoringu, `refreshFromBzp` behavior, `tenders-list-ux.ts` reguł filtrów. |
| **#NG07-002** | **KPI SSOT** — metryki dashboardu z istniejących agregatów: `pipeline.stats`, `queueCounts`, `pipeline.funnel` (read-only props). |
| **#NG07-003** | **Jedno primary CTA sync** — jeden widoczny primary „Odśwież z BZP” na ekranie listy (#TEUX-006). |
| **#NG07-004** | **Dashboard before list** — KPI dashboard zawsze nad sekcją kart (mobile + desktop), nie za FAB. |
| **#NG07-005** | **First-screen budget** — cel: ≥1 karta przetargu widoczna bez scroll na viewport 1280×800 (lista tab, filtry zwinięte). |
| **#NG07-006** | **Reuse TEUX** — `TEUX_KPI_*`, `StrategyKpiStrip` pattern, `TenderUxBadge`, `TenderUxChip`; **bez** nowych tokenów. |
| **#NG07-007** | **Protected Core** — zero diff `cloud-sync.ts`, `CloudLoader.tsx`, Edge, payroll `App.tsx` handlers. |
| **#NG07-008** | **One bundle = one goal** — NG-07-TEUX-01 = lista dashboard UX; bez mixed CORE commit. |

---

## 2. Priorytety audytu (visual — owner accepted)

| P | # | Temat | Slice |
|---|-----|-------|-------|
| **P0** | 1 | KPI Dashboard nad listą przetargów | NG-07-01 |
| **P0** | 2 | Redukcja wysokości first-screen | NG-07-02 |
| **P1** | 3 | Hierarchia nagłówka modułu | NG-07-01 |
| **P1** | 4 | Usunięcie duplikatu CTA Odśwież | NG-07-01 |
| **P1** | 5 | Uproszczenie hierarchii wizualnej karty | NG-07-03 |
| **P1** | 6 | Gęstość desktop | NG-07-04 |
| **P2** | 7 | Typografia (`text-[10px]` → TEUX) | NG-07-03 (+ spill NG-07-04) |
| **P2** | 8 | Spacing | NG-07-02, NG-07-04 |
| **P2** | 9 | Spójność kolorów (insight banner) | NG-07-01 |
| **P2** | 10 | Empty states polish | NG-07-03 |

### Walidacja visual (V-1…V-6)

| ID | Werdykt |
|----|---------|
| V-1 Visual audit | **COMPLETE** |
| V-2 UX-03 truncation ≤390px | **CONFIRMED** — adresowane w NG-07-03 (karta) + NG-07-02 (mniej chrome) |
| V-3 UX-05 max-w-4xl filtry | **CONFIRMED** — adresowane w NG-07-04 (align width) |
| V-4 Hierarchy | **CONFIRMED** — NG-07-01, NG-07-02 |
| V-5 Spacing | **CONFIRMED** — NG-07-02, NG-07-04 |
| V-6 KPI surface | **CONFIRMED** — NG-07-01 |

---

## 3. To-be layout (ASCII)

```text
┌─────────────────────────────────────────────────────────────┐
│ TendersModuleHeader (compact)          [Odśwież z BZP] ←only│
├─────────────────────────────────────────────────────────────┤
│ TendersTabBar (7 tabs, compact py)                          │
├─────────────────────────────────────────────────────────────┤
│ [sticky md+] Search · status filter · (no primary refresh)  │
├─────────────────────────────────────────────────────────────┤
│ Insight banner (1 line, TEUX colors) — optional merge hint  │
├─────────────────────────────────────────────────────────────┤
│ ★ TenderListKpiDashboard (NEW)                              │
│ ┌──────────┬──────────┬──────────┬──────────┐  lg: 4-col   │
│ │ Aktywne  │ Do zgł.  │ ≤7 dni   │ Decyzja  │  mobile: 2×2│
│ └──────────┴──────────┴──────────┴──────────┘               │
├─────────────────────────────────────────────────────────────┤
│ [lg+] Więcej filtrów (collapsed default) · full-width panel │
├─────────────────────────────────────────────────────────────┤
│ Dzisiaj (section) · inline count                            │
│ ├─ cards…                                                 │
│ Lista (section)                                             │
│ ├─ cards… (refined hierarchy)                             │
└─────────────────────────────────────────────────────────────┘
│ FAB filtrów (mobile) — sheet bez duplikatu KPI strip        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Slice specifications

### 4.1 NG-07-01 — Header + KPI Dashboard

**Cel:** P0-1, P0-adjacent discoverability · P1-3, P1-4 · P2-9

#### 4.1.1 Header hierarchy (`TendersModuleHeader`)

| Element | As-is | To-be |
|---------|-------|-------|
| Padding | `py-3` | `py-2` |
| Subtitle | pełna linia pod tytułem | `line-clamp-1` lub skrót do `TEUX_FONT_META` jedna linia |
| CTA | primary full button | **zachować** jako **jedyne** primary sync na liście |
| Icon + title | `TEUX_FONT_HEADLINE` | bez zmiany tokenu |

#### 4.1.2 CTA dedup

| Lokalizacja | As-is | To-be |
|-------------|-------|-------|
| `TendersModuleHeader` | Primary „Odśwież z BZP” | **KEEP** primary |
| `TendersView` toolbar L539–548 | Primary „Odśwież” | **REMOVE** — search row bez primary sync |
| `TendersView` legacy header L502–510 | Duplicate (V4: hidden) | **NO CHANGE** (already `hideModuleHeader`) |
| Empty states | secondary refresh CTA | **KEEP** jeden w empty; **nie** primary duplicate w toolbar |

**Reguła #NG07-003:** max **1** primary `bg-primary` sync button visible above list fold.

#### 4.1.3 `TenderListKpiDashboard` (NEW)

**Plik:** `src/app/tenders/list/TenderListKpiDashboard.tsx`

**Wzorzec:** `StrategyKpiStrip.tsx` — grid komórek `TEUX_KPI_LABEL` + `TEUX_KPI_VALUE` + hint `TEUX_FONT_META`.

**Props (frozen):**

```ts
interface TenderListKpiDashboardProps {
  stats: { active: number; actionable: number; urgent: number; priority: number };
  queueCounts: MyQueueCounts;
  onKpiClick: (id: TendersListKpiId) => void;
  onQueueClick: (id: TendersListQueueId) => void;
}
```

**Komórki (4 — frozen v1.0):**

| Cell | Value source | Click action | Tone |
|------|--------------|--------------|------|
| Aktywne | `stats.active` | `onKpiClick("active")` | default |
| Do zgłoszenia | `stats.actionable` | `onKpiClick("actionable")` | amber if >0 |
| Kończy się ≤7 dni | `stats.urgent` | `onKpiClick("urgent")` | amber if >0 |
| Wymaga decyzji | `queueCounts.needs_decision` | `onQueueClick("needs_decision")` | amber if >0 |

**Layout:**

| Breakpoint | Grid |
|------------|------|
| `< lg` | `grid-cols-2 gap-2` |
| `≥ lg` | `grid-cols-4 gap-2` |

**Placement:** w `TendersView.tsx` — **po** insight banner, **przed** collapsible filtrów i sekcji listy.

**data-testid:** `tender-list-kpi-dashboard` · `data-ng07-kpi-dashboard`

**Nie duplikować** pełnego funnel w dashboardie (zostaje w panelu filtrów).

#### 4.1.4 Insight banner colors (P2-9)

`listInsightClass()` → mapowanie na istniejące role border/bg z tokenów (amber/emerald/neutral) — **bez** nowych tokenów; inline Tailwind tylko jeśli już w `TEUX_COLOR_*` exports.

#### 4.1.5 Allowlist NG-07-01

| Plik | Zmiana |
|------|--------|
| `src/app/tenders/TendersModule.tsx` | Header compact |
| `src/app/TendersView.tsx` | KPI mount, CTA remove toolbar, banner colors |
| `src/app/tenders/list/TenderListKpiDashboard.tsx` | **NEW** |
| `src/app/changelog-data.ts` | Wpis po IMPLEMENT |
| `CHANGELOG.md` | Skrót |

#### 4.1.6 AC NG-07-01

| AC | Kryterium |
|----|-----------|
| AC-01-1 | KPI dashboard widoczny mobile + desktop bez otwierania FAB |
| AC-01-2 | 4 komórki klikalne → istniejące handlery filtrów |
| AC-01-3 | Dokładnie 1 primary sync CTA above fold na liście |
| AC-01-4 | `data-testid="tender-list-kpi-dashboard"` present |

---

### 4.2 NG-07-02 — First-screen compaction

**Cel:** P0-2 · P2-8

| Element | As-is | To-be |
|---------|-------|-------|
| `TendersTabBar` wrapper | `py-2` | `py-1.5` |
| Search sticky row | `py-2` | `py-1.5` |
| Insight banner | multi-line padding | `py-2` compact, single-line preferowany |
| „Więcej filtrów” default | user pref LS | **default collapsed** na fresh (zachować LS restore) |
| Licznik wyników | osobny `text-[10px]` row | inline w nagłówku sekcji „Lista” / „Dzisiaj” |
| Section headers | mixed typography | `TEUX_FONT_CAPTION` + `font-semibold` unified |
| Module + tab + search budget | ~320–380px | **cel ≤260px** przed pierwszą kartą (1280×800) |

#### Allowlist NG-07-02

| Plik | Zmiana |
|------|--------|
| `src/app/tenders/TendersModule.tsx` | Tab bar compact |
| `src/app/TendersView.tsx` | Spacing, counter inline, section headers |
| `src/lib/tenders-list-ux.ts` | **TYLKO** jeśli zmiana default collapsed prefs — **prefer UI default w TendersView bez logiki filtrów** |

#### AC NG-07-02

| AC | Kryterium |
|----|-----------|
| AC-02-1 | SS-08 replay: pierwsza karta widoczna na 1280×800 przy zwiniętych filtrach |
| AC-02-2 | Brak regresji sticky search md+ |
| AC-02-3 | Section „Dzisiaj” / „Lista” — jednolita typografia |

---

### 4.3 NG-07-03 — Tender card refinement

**Cel:** P1-5 · P2-7, P2-10 · V-2 UX-03

#### Mobile card (`TenderListMobileCard`)

| Warstwa | To-be |
|---------|-------|
| Badges | max **3** visible + overflow chip; urgency badge zawsze w top-3 (presentacja w `tender-list-card-model.ts`) |
| Title | `line-clamp-2` keep |
| Org/city | jedna linia `truncate` |
| Per-card KPI row | **OPTION A (default):** zachować 3-col compact · **OPTION B:** usunąć KPI row (dashboard SSOT) — **Owner wybór przy GO** |
| Padding | `py-3` → `py-2.5` |

#### Desktop card (`TenderListDesktopCard`)

| Warstwa | To-be |
|---------|-------|
| Badges | max **4** desktop; secondary badges muted |
| Right column | status + deadline + **optional** trafność/wadium compact (1 line meta) — parity z mobile bez pełnego 3-col |
| Padding | `py-2.5` → `py-2` |

#### Empty states (`TenderUxEmptyState` usage w liście)

- Jedna ścieżka CTA refresh (nie duplikować header)
- Copy bez zmian biznesowych

#### Allowlist NG-07-03

| Plik | Zmiana |
|------|--------|
| `src/app/tenders/list/TenderListMobileCard.tsx` | Hierarchy |
| `src/app/tenders/list/TenderListDesktopCard.tsx` | Hierarchy + meta |
| `src/app/tenders/list/tender-list-card-model.ts` | Badge cap/order prezentacja only |
| `src/app/TendersView.tsx` | Empty state CTA dedup |

#### AC NG-07-03

| AC | Kryterium |
|----|-----------|
| AC-03-1 | SS-03 ≤390px: brak horizontal overflow |
| AC-03-2 | Tytuł > org > meta — czytelna hierarchia skanowania |
| AC-03-3 | `text-[10px]` usunięte z TendersView list chrome (→ `TEUX_FONT_META`) |

---

### 4.4 NG-07-04 — Desktop density

**Cel:** P1-6 · V-3 UX-05 · P2-8

| Element | To-be |
|---------|-------|
| Filtry panel `max-w-4xl` | **REMOVE cap** — `w-full` align z listą (UX-05 fix) |
| Card gap | `space-y-0` + border-b między kartami (article) |
| Article stripe | keep `border-l-[3px]` |
| Long list SS-07 | scan line co karta — separator `border-b border-border/60` |
| Wide SS-09 | opcjonalnie `max-w-7xl mx-auto` na **całym** scroll root (filtry + lista) — **defer** jeśli scope creep; minimum = full-width filtry |

#### Allowlist NG-07-04

| Plik | Zmiana |
|------|--------|
| `src/app/TendersView.tsx` | max-w removal, list density |
| `src/app/tenders/list/TenderListDesktopCard.tsx` | density tweak |
| `src/app/tenders/list/TenderListFiltersPanel.tsx` | spacing polish only |

#### AC NG-07-04

| AC | Kryterium |
|----|-----------|
| AC-04-1 | SS-09: filtry i lista ta sama szerokość content |
| AC-04-2 | SS-07: 50+ kart — czytelny scan bez excessive whitespace |
| AC-04-3 | Desktop card height reduced measurably vs baseline screenshot |

---

## 5. Mapowanie findings → slice

| Finding | Slice | Status po freeze |
|---------|-------|------------------|
| UX-01 duplicate CTA | NG-07-01 | ADDRESSED |
| UX-02 mobile KPI hidden | NG-07-01 | ADDRESSED |
| UX-03 truncation | NG-07-03 | ADDRESSED |
| UX-04 module chrome | NG-07-01, NG-07-02 | ADDRESSED |
| UX-05 max-w-4xl | NG-07-04 | ADDRESSED |
| UX-06 section typography | NG-07-02 | ADDRESSED |
| UX-07 module KPI strip | NG-07-01 | ADDRESSED |
| UX-08 desktop/mobile parity | NG-07-03 | ADDRESSED |
| UX-09 stats text links | NG-07-01 | PARTIAL — dashboard replaces; panel keeps links |
| UX-14 text-[10px] | NG-07-03 | ADDRESSED |
| UX-17 insight colors | NG-07-01 | ADDRESSED |

---

## 6. Implementacja — kolejność i release

```text
NG-07-01  Header + KPI Dashboard     → release / commit 1
NG-07-02  First-screen compaction    → release / commit 2 (lub squash z 01 — Owner)
NG-07-03  Tender card refinement     → release / commit 3
NG-07-04  Desktop density            → release / commit 4
```

**Rekomendacja:** **4 osobne commity** w jednym bundle epic dla łatwego rollbacku (#TEUX-015).

**Wersjonowanie:** jeden bump changelog na bundle close lub +0.1 per slice — Owner preference at GO.

---

## 7. Test plan (post-IMPLEMENT)

| Gate | Komenda / check |
|------|-----------------|
| Build | `npm run build` |
| Tenders smoke | `npm run test:infra -- --gate B --scope tenders` |
| Payroll guard | `npm run test:infra -- --gate B --scope payroll` (16/16 — bez regresji) |
| Visual replay | SS-01…10 manual |
| Mobile | `npm run test:mobile` (smoke touch lista) |

**Nowy test manifest entry (opcjonalny):** `NG-07-KPI-DASHBOARD` — thin assert `data-testid` w vite-node script; dodanie tylko po Owner GO na test scope.

---

## 8. Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| KPI click duplicates filter panel | Reuse `handleKpiClick` / `handleQueueClick` z TendersView |
| First-screen regression mobile | SS-03 replay po NG-07-02 |
| TOKEN FREEZE | Import-only; zero new exports w `tender-ux-tokens.ts` |
| #CORE-013 mixed commit | Allowlist per slice; boundary check przed push |
| Mobile KPI row vs dashboard duplicate | Owner wybór OPTION A/B przy GO (§4.3) |

---

## 9. Decyzje do Owner GO

| # | Decyzja | Default w freeze |
|---|---------|------------------|
| D-1 | Mobile per-card KPI row: keep (A) vs remove (B) | **A** — keep compact 3-col |
| D-2 | 4 commity vs 1 squash release | **4 commity** |
| D-3 | Insight banner merge z KPI hint | **Separate** — banner keep for queue narrative |
| D-4 | STABILIZATION WINDOW override dla NG-07 | Owner explicit GO |

---

## 10. Workflow status

```text
AUDIT (CODE)     ✅ ACCEPTED
AUDIT (VISUAL)   ✅ COMPLETE
PLAN             ✅ FINALIZED (§4 slices)
DESIGN FREEZE    ✅ v1.0 APPROVED
ARCH REVIEW      ✅ COMPLETE
OWNER GO         ✅ APPROVED
IMPLEMENT        ✅ COMPLETE (NG-07-01…04)
CLOSEOUT         ✅ NG-07-TEUX-01 CLOSED FINAL · PRODUCTION VERIFIED (2.63.72)
```

**One Bundle = One Goal** · **NG-07-TEUX-01** = Lista dashboard UX only.

---

*Następny krok: **CLOSED** — SSOT: [`NG-07-TEUX-01-CLOSEOUT.md`](./NG-07-TEUX-01-CLOSEOUT.md).*
