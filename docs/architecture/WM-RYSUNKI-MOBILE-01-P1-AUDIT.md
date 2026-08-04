# WM-RYSUNKI-MOBILE-01 MOBILE-P1 — AUDIT

> **ID:** WM-RYSUNKI-MOBILE-01-P1-AUDIT  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P1**  
> **FAZA:** **AUDIT** · **COMPLETE**  
> **STATUS:** **AUDIT PASS** · zakres P1 **NADAL AKTUALNY** · DF epic **FROZEN** · slice DF → [`WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md) (**FROZEN**)  
> **MODE:** DOCS ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO AUDIT MOBILE-P1** · MOBILE-P0 **CLOSED** · tip **2.66.04** / **`13ca099b`**  
> **Baseline:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Epic DF (SSOT decyzji):** [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md) (**FROZEN** · D-M1-01…08)  
> **P1 DF:** [`WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md)  
> **Epic AUDIT (historyczny):** [`WM-RYSUNKI-MOBILE-01-AUDIT.md`](./WM-RYSUNKI-MOBILE-01-AUDIT.md)  
> **P0 CLOSE:** [`WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md`](./WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P1 AUDIT — COMPLETE

P0 CLOSED nie unieważnia D-M1-01…07
Zakres P1 = THIN SLICE (nadal)
File Allowlist DF = AKTUALNY (+ nota zoom ± w 44px)
AC-M1 = AKTUALNE (+ doprecyzowanie zoom chrome)
Nowe ryzyka = TAK (niskie / mitygowalne w DF)
RCA = residual desktop-first hit/chrome/input

REKOMENDACJA: DESIGN FREEZE MOBILE-P1 = FROZEN
  · slice DF: WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md
  · następne: Owner GO → ARCHITECTURE REVIEW

IMPLEMENT: NIE
COMMIT / PUSH: NIE
════════════════════════════════════════════════════════
```

---

## 0. Cel audytu

Po wdrożeniu **MOBILE-P0** (portal FS · gesty · zoom/pan) zweryfikować, czy zakres **MOBILE-P1** z epic DF nadal jest:

1. poprawny względem kodu tip **2.66.04**,  
2. **THIN**,  
3. gotowy do DESIGN FREEZE / IMPLEMENT bez zmiany OUT (Cloud/JSON/PDF/Ghost).

---

## 1. RCA (residual po P0)

### 1.1 Co P0 zamknął

| Problem AUDIT epic (M-P0-*) | Stan po P0 |
|-----------------------------|------------|
| Scroll ↔ draw / nested scroll | **CLOSED** — FS portal + scroll lock + `overflow-hidden` surface |
| Brak capture / `pointercancel` / leave=end | **CLOSED** |
| Brak `touch-action` | **CLOSED** |
| Brak working viewport / zoom/pan | **CLOSED** (ephemeral + ± + Reset) |
| Safe-area / `--app-height` | **CLOSED** |

### 1.2 Root cause residualny (MOBILE-P1)

```text
P0 dał shell viewport + gesty.
Hit-target / chrome density / native prompt / create menu
nadal = desktop-first (wizualna geometria SVG + px-2 py-1.5 + window.prompt).
```

**RCA werdykt:** osobny slice P1 **nadal uzasadniony**. P0 **nie** rozwiązał M-P1-01…07.

---

## 2. Dowody kodu @ tip `13ca099b` (2.66.04)

### 2.1 Touch hitboxes / edit vs export

| Fakt | Dowód |
|------|--------|
| Hit = geometria wizualna (`data-id` na wall/line/text/symbol) | `render-svg.ts` — wall `stroke-width="${t}"` (typ. 4), brak `data-hit` |
| Brak `mode: "edit" \| "export"` | `RenderDrawingSvgOptions` = `showGrid` · `highlightWallId` · `previewWall` — **bez** mode |
| PDF reuse `renderDrawingSvg(…, { showGrid: false })` | `export-pdf.ts` — gdy dodamy hit bez mode → **R-01** aktywne |

**Werdykt:** D-M1-01 · D-M1-02 **NADAL IN** · AC-M1-01/02 **NADAL WYMAGANE**.

### 2.2 44×44 / toolbar / selection

| Kontrolka | Klasy (skrót) | ≥44px? |
|-----------|---------------|--------|
| `toolBtn` | `px-2 py-1.5` · ikona 14 · label `hidden sm:inline` | **NIE** |
| Grid/Snap/Undo/Zoom ±/Reset | `p-1.5` · ikona 14 | **NIE** |
| Selection Obrót/Duplikuj/Usuń | `px-2 py-1` · ikona 12 | **NIE** |
| Panel Lista / Final / Duplikuj / Usuń | text-sm + ikona 14–16 · bez `min-h-[44px]` | **NIE** |
| `.touch-target` w `mobile.css` | istnieje | **NIEUŻYTE** w Rysunki |

**Werdykt:** D-M1-03…05 **NADAL IN**.  
**Nota P0:** zoom ± / Reset weszły w P0 jako chrome — **wchodzą w zakres 44px P1** (patrz §7).

### 2.3 `window.prompt`

| Ścieżka | Linia (editor) | Stan |
|---------|----------------|------|
| Wymiar „Długość” | `window.prompt("Długość", …)` | **NADAL** |
| Tekst | `window.prompt("Tekst na rysunku:", …)` | **NADAL** |

**Werdykt:** D-M1-06 · AC-M1-04 **NADAL IN**. Pod portal FS + iOS keyboard = **R-07 nadal krytyczne**.

### 2.4 Create menu (lista)

| Fakt | Dowód |
|------|--------|
| Menu `absolute right-0 z-20 mt-1 w-72` | `WmPrintDrawingsPanel.tsx` lista |
| Brak outside-click / safe-area sheet | brak |
| Poza portalem (lista, nie FS) | P0 **nie** zmienił listy create |

**Werdykt:** D-M1-07 · AC-M1-05 **NADAL IN**.

---

## 3. Czy P0 zmienił założenia P1?

| Założenie DF P1 | Wpływ P0 |
|-----------------|----------|
| Hit edit-only vs export | **Bez zmiany** — `mode` nadal brak |
| 44px chrome | **Wzmocnienie** — więcej przycisków w FS (zoom) · toolbar density ↑ |
| Toolbar wrap/scroll | **Ważniejsze** — chrome sticky w portal + więcej tools |
| Prompt → inline/modal | **Bez zmiany** semantyki · **wyższa** potrzeba (keyboard w FS overlay) |
| Create menu | **Bez zmiany** — nadal na liście |
| CTM / zoom | Hit + pan/zoom ephemeral: **R-03** nadal obowiązuje (getScreenCTM) — P0 **nie** łamie, ale P1 musi testować hit przy zoom≠1 |
| OUT Cloud/JSON/PDF/Ghost | **Nienaruszone** |

**Werdykt:** założenia D-M1-01…07 **ważne**. P0 = prerequisite shell, nie substitute P1.

---

## 4. File Allowlist — aktualność

### 4.1 DF §6 — P1 (nadal poprawny)

| Plik | P1 | Status po P0 |
|------|----|--------------|
| `WmPrintDrawingEditor.tsx` | ● | **TAK** — prompt · toolbar · selection |
| `WmPrintDrawingsPanel.tsx` | ● | **TAK** — Lista/Final 44px · create menu |
| `mobile.css` | ○ | **TAK** — ewentualnie reuse `.touch-target` / helper |
| `render-svg.ts` | ● | **TAK** — `mode` + hit |
| `symbols/render-symbol.ts` | ● | **TAK** — hit padding stamps |
| `symbols/index.ts` | warunkowo | **TAK** |
| `export-pdf.ts` | thin wire `mode:"export"` | **TAK** jeśli potrzeba |
| `test-wm-rysunki-mobile-p1.mjs` | NEW | **TAK** |

### 4.2 Nie dodawać do P1 (OUT / już P0)

| Plik | Powód |
|------|--------|
| `drawing-viewport.ts` | P0 clamp — **nie** ruszać chyba regresja |
| `cloud-sync` · `types` schema · `wall-preview` · zip | OUT twarde |
| `app-viewport.ts` rewrite | OUT |

**Werdykt allowlist:** **AKTUALNY**. Brak wymogu rozszerzenia poza DF §6.2.

---

## 5. Acceptance Criteria — czy korekta?

| AC | Stan | Korekta? |
|----|------|----------|
| **AC-M1-01** Selekcja palcem (hit) | Wymagane | **NIE** — treść OK |
| **AC-M1-02** Export bez hit | Wymagane | **NIE** |
| **AC-M1-03** Tool / Lista / Final / selection ≥44 | Wymagane | **THIN DOPRECYZOWANIE:** dodać jawnie **zoom ± / Reset** (chrome P0) |
| **AC-M1-04** Zero `window.prompt` | Wymagane | **NIE** |
| **AC-M1-05** Create menu viewport + close | Wymagane | **NIE** |
| **AC-M1-06** Desktop tool flow PASS | Wymagane | **NIE** — nowy UI wymiar/tekst na desktop też |

**Werdykt AC:** **aktualne**; przy DF P1 / thin amend — jedna linia doprecyzowania AC-M1-03.

---

## 6. Nowe ryzyka (po P0)

| ID | Ryzyko | Severity | Mitygacja |
|----|--------|----------|-----------|
| **R-P1-01** | Hit overlays przy `transform` zoom/pan (wrapper) | Średnie | REUSE CTM · test hit przy scale≠1 (już R-03 DF) |
| **R-P1-02** | Toolbar overflow w FS (P0 zoom + tools) | Średnie | D-M1-04 wrap **lub** horizontal scroll — **nie** ucinać |
| **R-P1-03** | Inline/modal prompt + iOS keyboard w portal | Wysokie (UX) | R-07 · visualViewport / keyboard-inset · thin modal w FS |
| **R-P1-04** | Hit przypadkowo w PDF jeśli zapomniany `mode` | Wysokie (regresja) | R-01 · smoke export bez `data-hit` · wire export-pdf |
| **R-P1-05** | Scope creep: redesign całego chrome desktop | — | THIN: mobile-first classes / `mobileFullscreen` branch · desktop PASS |

Brak ryzyka unieważniającego P1 lub wymagającego Cloud/schema.

---

## 7. Priorytety P0 / P1 / P2 (stan epic)

| Slice | Status | Zakres (skrót) |
|-------|--------|----------------|
| **MOBILE-P0** | **CLOSED** · tip 2.66.04 | Portal · gesty · zoom/pan · safe-area |
| **MOBILE-P1** | **AUDIT PASS** → DF next | Hit edit-only · 44px (+ zoom chrome) · toolbar · selection · prompt OUT · create menu |
| **MOBILE-P2** | Backlog | Landscape · orientation · history/back · PDF preview · z-index · hover · cancel mid-draw UI |

### 7.1 Wewnątrz MOBILE-P1 (kolejność implement sugerowana)

1. **D-M1-02 + D-M1-01** — `mode` + hit (blokuje regresję PDF)  
2. **D-M1-06** — prompt → inline/modal  
3. **D-M1-03…05** — 44px chrome + selection (+ zoom ±)  
4. **D-M1-04 / D-M1-07** — toolbar layout + create menu  

---

## 8. THIN SLICE?

| Kryterium | Werdykt |
|-----------|---------|
| ≤ allowlist DF · bez Cloud/JSON/Ghost | **TAK** |
| Jeden bundle UI + render-svg | **TAK** |
| Bez CAD / multi-select / P2 landscape | **TAK** |
| P0 już zamknięty — P1 nie dubluje gestów | **TAK** |

**THIN SLICE: POTWIERDZONE.**

---

## 9. Rekomendacja DESIGN FREEZE

```text
REKOMENDACJA: Owner GO → DESIGN FREEZE (MOBILE-P1)

Epic DF (WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md):
  · POZOSTAJE FROZEN SSOT dla D-M1-01…07
  · NIE wymaga full re-freeze epicu

Przy DESIGN FREEZE MOBILE-P1 (thin):
  1. Potwierdź D-M1-01…07 bez zmiany OUT
  2. Thin note: AC-M1-03 / D-M1-03 obejmuje zoom ± + Reset (P0 chrome)
  3. Thin note: hit muszą działać przy ephemeral zoom≠1 (R-P1-01)
  4. Allowlist = DF §6.2 bez rozszerzeń
  5. Zakaz łączenia P1+P2

ALTERNATYWA (jeśli Owner woli zero amend):
  · „obecny DF pozostaje aktualny” = PASS
  · GO IMPLEMENT P1 wprost na D-M1 — nadal OK po tym AUDIT
  · zalecane mimo to krótkie DF P1 dla śladu slice

IMPLEMENT / COMMIT / PUSH: NIE w tej fazie
```

---

## 10. Mapowanie M-P1 (AUDIT epic) → D-M1

| AUDIT ID | DF | Stan residual |
|----------|-----|---------------|
| M-P1-01 hitbox | D-M1-01/02 | **OPEN** |
| M-P1-02…04 44px | D-M1-03…05 | **OPEN** (+ zoom) |
| M-P1-05 prompt | D-M1-06 | **OPEN** |
| M-P1-07 create menu | D-M1-07 | **OPEN** |

---

## 11. NEXT

Czekaj **OWNER GO → DESIGN FREEZE (MOBILE-P1)**.

---

**Koniec AUDIT MOBILE-P1 · bez implementacji / commit / push.**
