# NG-06-TEUX — TEUX-7c Accessibility pass · AUDIT REPORT

> **Status:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (wymaga Owner GO)  
> **Tryb:** AUDIT ONLY · zero diff `src/` · zero BUILD/TEST/COMMIT/PUSH  
> **Data audytu:** 2026-07-07  
> **Baseline prod:** UI **2.63.61** · commit **`d1e782b`** · **TEUX-7b CLOSED** · **TOKEN FREEZE ACTIVE**  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7c · [`NG-06-TEUX-TEUX7C-AUDIT-READINESS.md`](./NG-06-TEUX-TEUX7C-AUDIT-READINESS.md)

```text
WERDYKT AUDYTU:  ★ READY FOR OWNER GO (IMPLEMENT)
RYZYKO:          NISKIE (bundle S) — regresja TEUX-7a chipów / TEUX-3 bulk touch
SCOPE CREEP:     WYSOKIE — pełny sweep Strategia/Pulpit → defer TEUX-7e
TOKEN FREEZE:    ACTIVE — import TEUX_FONT_* / TEUX_CHIP_* OK · edycja tokens ZAKAZANA
GAP G-11:        CZĘŚCIOWY — filtry OK (TEUX-7a) · trust/strip/bulk OPEN
```

---

## 0. Cel audytu

Ocena stanu a11y modułu Przetargów pod kątem **G-11** i AC TEUX-7c: `aria-pressed`, bulk checkbox, min **12px** na elementach interaktywnych, kontrast chipów — as-is @ **2.63.61**, gap vs DF, granice **#CORE-013 / #CORE-014**, wpływ **TOKEN FREEZE**, plan `LIB-TENDER-A11Y-TEUX7C`.

---

## 1. As-Is (@ 2.63.61 / `d1e782b`)

### 1.1 `aria-pressed` / semantyka toggle

| Komponent | Wzorzec as-is | Werdykt |
|-----------|---------------|---------|
| `TenderUxChip` | `aria-pressed` gdy nie `role="tab"`; `aria-selected` dla tab | ✅ SSOT toggle |
| `TenderListFiltersPanel` | Wszystkie filtry przez `TenderUxChip` | ✅ **G-11 częściowo CLOSED** (TEUX-7a) |
| `TendersModule` module tabs | `TenderUxChip` `role="tab"` + `ariaSelected` | ✅ W3C tab pattern |
| `TenderDetailTabBar` | `role="tab"` + `aria-selected` | ✅ (nie wymaga `aria-pressed`) |
| `TenderDecyzjaSubTabBar` | `role="tab"` + `aria-selected` | ✅ |
| `TenderListFiltersPanel` bulk toggle | zwykły `<button>` **bez** `aria-pressed` | ❌ toggle bez stanu |
| `TendersView` banner queue | `aria-pressed={queueFilter === …}` | ✅ |
| `TrustChip` | `<button>` nawigacyjny, **brak** `aria-label` / `aria-pressed` | ⚠️ nie toggle — potrzeba `aria-label` |
| `TenderWorkflowProcessStrip` | etapy jako `<button>`, brak `aria-current` / opisu stanu | ⚠️ nawigacja — `aria-label` + status w `title` częściowo |

### 1.2 Bulk checkbox

**Plik:** `src/app/tenders/list/TenderListBulkCheckbox.tsx`

| Aspekt | As-is | Problem |
|--------|-------|---------|
| Element | `<span role="checkbox" aria-checked>` | Nie focusowalny — **brak `tabIndex={0}`** |
| Klawiatura | tylko `onClick` | **brak** Space/Enter |
| Etykieta | brak | **brak** `aria-label` per wiersz |
| Touch | `min-h/w-[44px]` | ✅ TEUX-3 |
| Semantyka | span zamiast `<button>` / `<input type="checkbox">` | ❌ **Główny cel „bulk checkbox fix”** |

**Toggle trybu bulk** (`TenderListFiltersPanel` L300–309): `text-xs` + touch OK, **brak `aria-pressed={bulkMode}`**.

### 1.3 Min 12px na interaktywnych (`button`)

**AC DF:** statyczny test — **brak `text-[10px]` na `button`** w tender UI.

| Plik (priorytet IN) | Przyciski `text-[10px]` / `text-[9px]` | Uwagi |
|---------------------|----------------------------------------|-------|
| `TenderWorkflowProcessStrip.tsx` | ✅ **2 warianty** + `max-[390px]:text-[9px]` | Command Layer — **P0** |
| `tenders/trust/TrustChip.tsx` | ✅ `text-[10px]` na `<button>` | Ribbon trust — **P0** |
| `TenderOverviewShortcuts.tsx` | ✅ 3× `text-[10px]` | Detal shortcuts — **P1** |
| `TenderDecyzjaSubTabBar.tsx` | `text-[11px]` (11 < 12) | **P1** → `text-xs` |
| `TenderUxChip` / filtry / tab bar | `text-xs` (`TEUX_CHIP_BASE`) | ✅ |
| `TenderWorkflowPrimaryAction` | przycisk `text-xs`; etykiety w `<p>` | ✅ przycisk OK |
| `tenders/strategy/**` | wiele `text-[10px]` na button | **OUT** → TEUX-7e |
| `TenderAttachmentsPanel.tsx` | wiele `text-[10px]` button | **OUT** (dokumenty) — opcj. backlog |

### 1.4 Kontrast chipów

| Token / komponent | Klasy | Ocena audytu |
|-------------------|-------|--------------|
| `TEUX_CHIP_INACTIVE` | `text-muted-foreground` na `bg-secondary/60` | ⚠️ borderline — zweryfikować light/dark |
| `TEUX_CHIP_ACTIVE` | `text-primary` na `bg-primary/12` | ✅ zwykle OK |
| `TrustChip` / `trustToneClass` | tone per level (amber/red/emerald) | ⚠️ `neutral` / `unknown` — sprawdzić WCAG AA na mobile |
| Process strip `presentation.buttonClassName` | mieszane stany done/partial | ⚠️ partial — kontrast ikon vs tło |

**Uwaga:** pełny audyt WCAG poza scope — TEUX-7c = **import istniejących tokenów** + unikanie `text-[10px]` na button; ewentualny tweak `TEUX_CHIP_INACTIVE` **tylko** jeśli bez edycji `tender-ux-tokens.ts` (nadpisanie w komponencie) lub Owner thaw.

### 1.5 Zależności zamknięte

| Zależność | Status |
|-----------|--------|
| TEUX-7a filtry + `TenderUxChip` | **CLOSED** — baza G-11 |
| TEUX-7b Command Layer | **CLOSED** — poza scope 7c |
| TEUX-3 bulk touch 44px | **CLOSED** — do uzupełnienia keyboard/label |

---

## 2. Gap Analysis

| ID | Wymaganie DF / G-11 | As-is | Gap | Priorytet |
|----|---------------------|-------|-----|-----------|
| **A1** | `aria-pressed` na chipach toggle | Filtry OK via `TenderUxChip` | ⚠️ **częściowy** | P1 bulk toggle |
| **A2** | Bulk checkbox fix | span role=checkbox | ❌ **OPEN** | **P0** |
| **A3** | Min 12px interactive | `text-[10px]`/`9px` na strip/trust buttons | ❌ **OPEN** | **P0** |
| **A4** | AC: brak `text-[10px]` na `button` (tender UI) | Wiele w IN scope | ❌ **OPEN** | **P0** (test gate) |
| **A5** | Kontrast chipów | Tokeny OK; trust neutral | ⚠️ | **P2** |
| **A6** | Tab bar a11y | `aria-selected` OK | ✅ | regresja only |
| **A7** | G-11 pełne zamknięcie | Trust + strip bez label | ⚠️ | **P1** |

### 2.1 G-11 — szczegóły

```text
CLOSED (TEUX-7a):  TenderListFiltersPanel → TenderUxChip (aria-pressed)
OPEN:              TenderListBulkCheckbox (semantyka + keyboard)
OPEN:              bulk mode toggle (aria-pressed)
OPEN/P1:           TrustChip (aria-label; nie aria-pressed — to nawigacja)
OPEN/P1:           Process strip (aria-label z etapem + status; opcj. aria-current)
```

---

## 3. Scope (IN) — propozycja IMPLEMENT

**Bundle S** — jeden cel: **a11y interakcji workflow + lista bulk** (nie Strategia).

| IN | Plik | Dozwolony diff |
|----|------|----------------|
| Bulk checkbox SSOT | `TenderListBulkCheckbox.tsx` | `<button>` lub `input` + `aria-label` prop + keyboard |
| Bulk toggle | `TenderListFiltersPanel.tsx` | `aria-pressed={bulkMode}` |
| Process strip | `TenderWorkflowProcessStrip.tsx` | `TEUX_FONT_CAPTION` import; usuń `text-[9px]`; `aria-label` per stage |
| Trust chips | `tenders/trust/TrustChip.tsx` | `TEUX_FONT_CAPTION`; `aria-label` z `trustDimensionChipLabel` |
| Sub-tab Decyzja | `TenderDecyzjaSubTabBar.tsx` | `text-xs` zamiast `text-[11px]` |
| Shortcuts (opcj.) | `TenderOverviewShortcuts.tsx` | `text-xs` na 3 buttonach |
| Karty lista | `TenderListMobileCard.tsx` / `TenderListDesktopCard.tsx` | przekazanie `aria-label` do bulk checkbox |
| Test + manifest | `scripts/test-tender-a11y-teux7c.mjs` | nowy gate |
| CHANGELOG | **2.63.62** patch | |

**Szac. plików `src/`:** 5–8 + test.

---

## 4. Out of Scope

| OUT | Powód |
|-----|--------|
| `tenders/strategy/**` pełny sweep | **TEUX-7e** Strategia + Pulpit |
| `TenderAttachmentsPanel` masowe 10px | Dokumenty — osobny backlog |
| `TenderWorkspaceV2Panel` / hosted | Content accordion — nie chrome |
| Copy „AI” | **TEUX-7d** |
| `tender-ux-tokens.ts` thaw | TOKEN FREEZE |
| Pipeline / sync / payroll / Edge | Protected Core |
| Refactor `TenderUxChip` API | Działa — tylko regresja |

---

## 5. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| R1 | Regresja TEUX-7a filtrów (`aria-pressed`) | Średni | Zero zmian w logice `TenderUxChip` pressed — tylko regresja w teście |
| R2 | Bulk checkbox zmiana semantyki psuje click propagation | Średni | Zachować `stopPropagation` na kartach; test TEUX-3 regresja |
| R3 | Process strip wyższy po `text-xs` | Niski | Już `min-h-[44px]` — akceptowalne dla 7b chrome |
| R4 | Scope creep cały moduł Przetargi | **Wysoki** | **STOP** na allowliście §3 |
| R5 | Kontrast wymaga edycji tokenów | Średni | P2 opcjonalny; lokalne klasy w `TrustChip` bez thaw |
| R6 | Test `text-[10px]` false positive na `strategy/` | Średni | Test scoped do allowlisty plików IN |

---

## 6. Boundary Check (#CORE-013 / #CORE-014)

### 6.1 #CORE-013 — jeden bundle, jeden commit

| Klasyfikacja | Pliki TEUX-7c (projekcja) |
|--------------|---------------------------|
| **FEATURE UI** | bulk checkbox · strip · trust chip · sub-tab · opcj. shortcuts · test |
| **MIXED** | **BLOCKED** |

**Werdykt (projekcja):** **PASS**

### 6.2 #CORE-014 — FEATURE boundary

| Strefa | Dotyk TEUX-7c |
|--------|---------------|
| `cloud-sync.ts` / `CloudLoader` / Edge / `App.tsx` | ❌ **ZERO** |
| `useTendersPipeline` / bulk **logika** | ❌ **ZERO** — tylko UI checkbox/toggle |
| `tender-ux-tokens.ts` | ❌ **ZERO** (import only) |
| `TenderListFiltersPanel` filter logic | ❌ tylko `aria-pressed` na bulk toggle |

**Werdykt (projekcja):** **PASS**

---

## 7. TOKEN FREEZE impact

```text
STATUS: ACTIVE (bez zmian)

Dozwolone:
  ✓ import TEUX_FONT_CAPTION, TEUX_FONT_META, TEUX_CHIP_*, TEUX_TOUCH_TARGET
  ✓ reuse TenderUxChip bez modyfikacji token file

Zakazane:
  ✗ edycja src/lib/tender-ux-tokens.ts
  ✗ nowe tokeny typography bez thaw

Kontrast (P2):
  ✓ lokalne klasy w TrustChip / opcj. TenderUxChip className override
  ✗ zmiana TEUX_CHIP_INACTIVE w pliku tokenów
```

---

## 8. Plan testów `LIB-TENDER-A11Y-TEUX7C`

**Plik:** `scripts/test-tender-a11y-teux7c.mjs`

| # | Asercja |
|---|---------|
| T1 | `TenderListBulkCheckbox` — `aria-label` lub prop `label` + `tabIndex` / `<button>` / `<input type="checkbox">` |
| T2 | `TenderListBulkCheckbox` — nie samotny `<span role="checkbox">` bez keyboard |
| T3 | `TenderListFiltersPanel` — `aria-pressed` na bulk toggle |
| T4 | `TenderUxChip` — zachowany `aria-pressed` (regresja TEUX-7a) |
| T5 | `TenderWorkflowProcessStrip` — brak `text-[10px]` / `text-[9px]` w className button |
| T6 | `TrustChip` — brak `text-[10px]` na button; `aria-label` lub `aria-labelledby` |
| T7 | `TenderDecyzjaSubTabBar` — brak `text-[11px]` (lub używa `text-xs`) |
| T8 | Allowlista IN — grep brak `text-[10px]` w `className` przy `<button` |
| T9 | `tokens frozen` — brak `teux7c` w `tender-ux-tokens.ts` |
| T10 | Forbidden: `cloud-sync`, `CloudLoader`, `App.tsx`, pipeline hooks — no teux7c marker |

### 8.1 Regresja gate B

```bash
npx vite-node scripts/test-tender-a11y-teux7c.mjs
npx vite-node scripts/test-tender-filters-teux7a.mjs      # aria-pressed filtry
npx vite-node scripts/test-tender-list-cards-teux3.mjs    # bulk touch
npm run test:infra -- --gate B --scope tenders
npm run test:infra -- --gate B --scope payroll
```

### 8.2 Manifest (po IMPLEMENT)

- `id`: `LIB-TENDER-A11Y-TEUX7C`
- `path`: `scripts/test-tender-a11y-teux7c.mjs`
- suite: `lib-tender-a11y-teux7c`
- gate B `scope:tenders`

---

## 9. Acceptance Criteria — mapa audytu

| AC (DF § TEUX-7c) | As-is | Dowód IMPLEMENT |
|-------------------|-------|-----------------|
| `aria-pressed` toggle chipy | Częściowy | T3–T4 |
| Bulk checkbox fix | ❌ | T1–T2 |
| Min 12px interactive | ❌ strip/trust | T5–T7 |
| Brak `text-[10px]` na button (IN scope) | ❌ | T8 |
| Kontrast chipów | ⚠️ | P2 manual / opcj. klasy lokalne |
| `LIB-TENDER-A11Y-TEUX7C` | brak skryptu | T1–T10 |

---

## 10. Rekomendacja

```text
╔══════════════════════════════════════════════════════════╗
║  TEUX-7c ACCESSIBILITY — AUDIT COMPLETE                  ║
╠══════════════════════════════════════════════════════════╣
║  G-11 (aria-pressed)     CZĘŚCIOWY — filtry OK (7a)      ║
║  Bulk checkbox           OPEN — P0                       ║
║  Min 12px / text-[10px]  OPEN — strip + trust P0         ║
║  Kontrast chipów         P2 — lokalnie bez thaw          ║
║  #CORE-013 / #CORE-014   PASS (projekcja)                ║
║  TOKEN FREEZE            ACTIVE                          ║
╠══════════════════════════════════════════════════════════╣
║  REKOMENDACJA:  ★ READY FOR OWNER GO → IMPLEMENT         ║
║  WARUNEK GO:    bundle S · allowlista §3 · bez Strategii ║
║  NASTĘPNY:      Owner GO → IMPLEMENT TEUX-7c           ║
╚══════════════════════════════════════════════════════════╝
```

**NOT READY** gdyby Owner wymagał jednocześnie: pełnego sweep `tenders/strategy/**`, thaw tokenów, lub merge z TEUX-7d w jednym commicie.

---

## 11. Powiązane

| Dokument | Rola |
|----------|------|
| [`NG-06-TEUX-TEUX7C-AUDIT-READINESS.md`](./NG-06-TEUX-TEUX7C-AUDIT-READINESS.md) | Wejście audytu |
| [`NG-06-TEUX-TEUX7B-CLOSEOUT.md`](./NG-06-TEUX-TEUX7B-CLOSEOUT.md) | Poprzedni slice CLOSED |
| [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md) | G-11 |
| [`NG-06-TEUX-TEUX7A-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7A-AUDIT-REPORT.md) | TenderUxChip baseline |

---

*AUDIT ONLY · NG-06-TEUX · TEUX-7c Accessibility · 2026-07-07 · baseline prod 2.63.61 (`d1e782b`)*
