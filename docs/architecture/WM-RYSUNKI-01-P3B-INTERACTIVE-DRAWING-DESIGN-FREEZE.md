# WM-RYSUNKI-01 P3B — INTERACTIVE DRAWING UX DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B — INTERACTIVE DRAWING UX**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ARCHIVE · DOCS ONLY · **NO IMPLEMENT** do Owner GO IMPLEMENT · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **PASS**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md) (**PASS** / **ACCEPTED**)  
> **Parent EPIC DF:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md)  
> **Prior polish:** [`WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md`](./WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md) (**CLOSED**)  
> **Baseline tip:** UI **2.66.01** / **`20e5c5a3`** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B DESIGN FREEZE — FROZEN

Ghost:          previewWall · UI only · renderDrawingSvg option
Length / grid:  live · bez zapisu do JSON
Style:          osobny kolor Ghost (≠ wall · ≠ hover drzwi)
Snap:           REUSE snapCoord
Continuous:     ON · next wall od last end · ESC kończy
PDF / ZIP:      preview OUT
JSON / schema:  bez zmian · schemaVersion = 1

SHIFT 0/45/90/135: OUT P3B (zbyt szeroki)

OUT: arrow Ghost · dimension Ghost · schema 2 · Cloud · Payroll
     P4 · CAD · tymczasowy wall w objects[] · auto-dimension

AR: PASS WITH MINOR RECOMMENDATIONS
IMPLEMENT zakazany do: Owner GO IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P3B (zamrożony · 1 zdanie)

**P3B** dodaje **interaktywny podgląd rysowania ścian** (Ghost Line + live długość + continuous) wyłącznie w edytorze — **bez** zmiany JSON / `schemaVersion` / PDF / ZIP / Cloud.

### 0.1 Relacja do dokumentów

| Dokument | Rola |
|----------|------|
| EPIC DF | mapa domeny / KV / flaga / P0–P4 |
| P3A CLOSEOUT | symbole / gap / wymiar — **nietknięte** kontrakty |
| AUDIT P3B | analiza FEASIBLE · **PASS** |
| **Ten plik** | **amend slice P3B** — decyzje Owner GO DF |

**Konflikt:** **ten plik wygrywa** dla zakresu P3B.

### 0.2 Zasady (wiązanie FROZEN)

| Zasada | FROZEN w P3B |
|--------|----------------|
| **SSOT FIRST** | SSOT trwały = JSON rysunku. Ghost = ephemeral UI / option renderera edytora |
| **REUSE FIRST** | `lineStart` · `finishLine` · `snapCoord` · wzorzec `highlightWallId` → `previewWall` |
| **ZERO DUPLICATE LOGIC** | jeden commit path ściany (`finishLine`); jedna metryka długości; PDF bez drugiej ścieżki obrazu |
| **THIN SLICE** | tylko tool **wall** · bez SHIFT angles · bez nowych typów obiektów |

---

## 1. PAYROLL SAFETY GATE (P3B)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P3B

G1–G9: FEATURE thin · editor UX only
Cloud drawings: ZERO zmiany merge / DATA_KEY / schema bump
Payroll / Hours-wipe / carry = OUT
Edge payroll = OUT
Owner GO CORE: NIE

Wynik: FEATURE interactive wall preview only
```

---

## 2. Decyzje FROZEN (Owner GO · 1–10)

| # | Temat | Decyzja FROZEN |
|---|-------|----------------|
| **1** | Ghost Line | **`previewWall`** · **UI only** · nie w JSON / `objects[]` |
| **2** | Live Preview | Edytor: `renderDrawingSvg(drawing, { previewWall, … })` |
| **3** | Live Length | Wyświetlana na żywo · **bez zapisu** do modelu |
| **4** | Ghost Style | **Osobny kolor** (i dashed) — ≠ ściana final · ≠ hover drzwi |
| **5** | Snap | **REUSE** istniejącego `snapCoord` / `local.grid.snap` |
| **6** | Continuous Drawing | **ON** · następna ściana od **ostatniego punktu** · **ESC** kończy |
| **7** | Live Grid Count | **IN opcjonalny** (obok długości gdy `grid.step > 0`) |
| **8** | PDF | **preview OUT** — `generateDrawingPdf` **nigdy** nie przekazuje `previewWall` |
| **9** | JSON / schema | **bez zmian** · **`schemaVersion = 1`** |
| **10** | SHIFT 0°/45°/90°/135° | **OUT P3B** — zbyt szeroki zakres (patrz §8) |

---

## 3. Model danych (FROZEN)

### 3.1 Wersjonowanie

| Pole | FROZEN |
|------|--------|
| `WmTechnicalDrawing.schemaVersion` | **`1`** (bez bump) |
| Nowy DATA_KEY / re-key KV | **ZAKAZ** |
| Nowe pola na `DrawingWallObject` | **ZAKAZ** (`length`, `ghost`, `gridCells`, …) |
| `DRAWING_SYMBOL_LIBRARY_VERSION` | **bez bump** (brak nowych glyphów) |
| `DRAWING_RENDER_VERSION` | **bez bump** — default `renderDrawingSvg(drawing)` string-identyczny gdy brak `previewWall` |
| `schemaVersion: 2` | **OUT** |

### 3.2 Persist / ephemeral

| Stan | Warstwa | Persist? |
|------|---------|----------|
| `lineStart` | React | **NIE** |
| `previewEnd` (kursor snapped) | React | **NIE** |
| `previewWall` option | argument `renderDrawingSvg` | **NIE** |
| wall po 2. klik | `objects[]` via `finishLine` | **TAK** (jak dziś) |

### 3.3 Zakazane ścieżki (OUT)

| | |
|--|--|
| C | Tymczasowy `type: "wall"` w `local.objects` przed 2. klik |
| D | Nowy `DrawingObjectType` / `ghost_wall` |
| Overlay B | **OUT preferencji** — Owner zamraża **Opcję A** (`previewWall` w rendererze) |

---

## 4. Renderer — `previewWall` (FROZEN · Opcja A)

### 4.1 API (szkic kontraktu)

```ts
// RenderDrawingSvgOptions (additive)
previewWall?: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthLabel?: string; // UI-only string, np. "120 px · 12 krat."
} | null;
```

| Reguła | FROZEN |
|--------|--------|
| Domyślne wywołanie `renderDrawingSvg(drawing)` | **bez** Ghost |
| Edytor (wall + `lineStart`) | przekazuje `previewWall` |
| PDF / ZIP | **`previewWall` nie ustawione** |
| `data-*` | np. `data-ghost-wall="1"` — **tylko** gdy option obecna |
| Gap drzwi na Ghost | **OUT** — Ghost = prosta linia preview, **bez** `computeWallGaps` |

### 4.2 Ghost Style (FROZEN)

| Właściwość | FROZEN |
|------------|--------|
| Stroke | kolor **odmienny** od wall `#1e293b` i od hover drzwi `#38bdf8` |
| Propozycja IMPL (AR może doprecyzować hex) | np. **`#f59e0b`** (amber) · `stroke-dasharray` · `stroke-opacity` ~0.9 |
| Thickness | ≈ wall default (4) lub −1 — czytelność; **nie** mylić z final wall solid |
| Label | `text` przy midpoint · ten sam font family co wymiary · mniejszy/opacity OK |

**Hard:** Ghost **nie** używa `data-id` obiektu modelu (brak select/drag Ghost).

---

## 5. Edytor — zachowanie (FROZEN)

### 5.1 Tool scope

| Tool | Ghost / continuous | FROZEN |
|------|--------------------|--------|
| **wall** | **IN** | slice |
| arrow | — | **OUT** P3B |
| dimension / drzwi / stamp / text | — | **OUT** |

### 5.2 Przepływ wall

```text
1. klik  → setLineStart(snap(p)) · start Ghost
move     → previewEnd = snap(raw) · previewWall = { start, end, label }
2. klik  → finishLine("wall", start, end) · commit wall
         → Continuous ON: setLineStart(end) · nowy Ghost od end
           Continuous OFF nie istnieje w P3B — continuous = zawsze ON dla wall
ESC      → setLineStart(null) · clear preview · koniec łańcucha
tool change / drawing.id change → clear jak ESC
```

### 5.3 Continuous Drawing (FROZEN)

| Reguła | FROZEN |
|--------|--------|
| Po udanym `finishLine` wall | **`setLineStart(endPoint)`** (nie `null`) |
| ESC | **kończy** łańcuch (`lineStart = null`) |
| Hint UI | np. „Esc = koniec rysowania ścian” gdy `lineStart` aktywny |
| Polyline entity | **OUT** — nadal N × `DrawingWallObject` |

### 5.4 Snap (FROZEN)

| Reguła | FROZEN |
|--------|--------|
| Start i end Ghost | **`snapCoord`** jak 1./2. klik dziś |
| Gdy `grid.snap === false` | raw coords (jak dziś) |
| Nowa logika snap | **ZAKAZ** |

### 5.5 Live Length (FROZEN)

| Reguła | FROZEN |
|--------|--------|
| Formuła | `L = hypot(dx, dy)` |
| Display | `Math.round(L)` + jednostka UI **`px`** |
| Zapis do JSON / `label` wall / auto-dimension | **ZAKAZ** |
| Zero-length | 2. klik z `L < 1` → **reject** (toast krótki) · bez commit · `lineStart` zostaje |

### 5.6 Live Grid Count (FROZEN · opcjonalny IN)

| Reguła | FROZEN |
|--------|--------|
| Gdy | `grid.step > 0` |
| Formuła | `cells = L / step` · display zaokrąglone sensownie (np. 1 miejsce lub int gdy blisko) |
| UI | w tym samym `lengthLabel` co długość, np. `"120 px · ≈12 krat."` |
| Gdy step invalid | pomiń część kratek |
| Pole w JSON | **ZAKAZ** |

### 5.7 Cancel / clear (FROZEN)

| Trigger | Efekt |
|---------|--------|
| **Escape** | clear `lineStart` + preview |
| Zmiana tool | clear (już dziś `setLineStart(null)`) |
| Zmiana `drawing.id` | clear |
| Pointer leave | **nie** wymusza clear łańcucha (uniknąć utraty start przy scroll) — DF: leave **nie** = ESC |

---

## 6. PDF / ZIP / Cloud (FROZEN)

| Ścieżka | FROZEN |
|---------|--------|
| `generateDrawingPdf` | `renderDrawingSvg(drawing, { showGrid: false })` — **bez** `previewWall` / `highlightWallId` |
| ZIP P3 | reuse PDF bytes — **bez** Ghost |
| Cloud / merge / KV | **OUT** zmian |
| Test AC | SVG/PDF string **bez** `data-ghost-wall` |

---

## 7. IN / OUT (FROZEN)

### IN

| Element |
|---------|
| `previewWall` option w `renderDrawingSvg` (edytor) |
| Ghost Line + osobny styl koloru/dash |
| Live Length (px) · bez zapisu |
| Live Grid Count (opcjonalny display) |
| Continuous wall + **ESC** |
| Snap REUSE |
| Reject zero-length wall (`L < 1`) |
| Guide / changelog przy release |
| Testy P3B + regresja P0–P3A |

### OUT

| Element |
|---------|
| **SHIFT** constrain 0° / 45° / 90° / 135° (**OUT P3B** · §8) |
| Ghost dla arrow / dimension |
| Tymczasowy wall w `objects[]` |
| Nowy object type / schema 2 |
| Auto-tworzenie `dimension` z Ghost |
| `wall-gap` na Ghost |
| PDF/ZIP preview |
| Cloud merge · Payroll · P4 punkty · CAD/DXF |
| Nowy PDF/ZIP builder · nowa dependency |
| Angle / ortho toggle UI (poza SHIFT) |

---

## 8. Ocena SHIFT 0° / 45° / 90° / 135° → **OUT P3B**

### 8.1 Co oznaczałoby IN

| Element | Koszt |
|---------|--------|
| Stan | `shiftKey` na `pointermove` / `pointerdown` |
| Geometria | `atan2` → snap do wielokrotności 45° względem start |
| Interakcja ze snap siatki | kolejność: angle-constrain **potem** `snapCoord` vs odwrotnie — 2 semantyki, łatwy drift |
| Continuous | każdy segment osobno — OK, ale mnoży przypadki testowe |
| UX / Guide / AC | nowa matryca modifier × snap on/off × continuous × Esc |
| Kod | nowy helper + testy kątów — **nie** reuse istniejącego (brak dziś) |

### 8.2 Werdykt DF

| | |
|--|--|
| **Zakres vs THIN SLICE** | **zbyt szeroki** na P3B (rdzeń = Ghost + length + continuous) |
| **Decyzja** | **OUT P3B** |
| **Backlog** | ewentualnie **P3B+ / P3C** dopiero po Owner GO AUDIT (nie auto) |

```text
D-P3B-10  SHIFT angle constrain 0/45/90/135 = OUT P3B
```

---

## 9. Decyzje ID (FROZEN)

| ID | Temat | FROZEN |
|----|-------|--------|
| **D-P3B-01** | Architektura Ghost | Opcja **A** — `previewWall` w `RenderDrawingSvgOptions` |
| **D-P3B-02** | Persist | Ghost **nigdy** w JSON / KV / `objects[]` |
| **D-P3B-03** | Export | PDF/ZIP **bez** `previewWall` |
| **D-P3B-04** | Live Length | px rounded · **bez** zapisu |
| **D-P3B-05** | Continuous | **ON** · last end → next start · **ESC** kończy |
| **D-P3B-06** | Versions | schema **1** · library/render **bez bump** |
| **D-P3B-07** | Tool scope | tylko **wall** |
| **D-P3B-08** | Cancel | **ESC** + tool change + drawing.id |
| **D-P3B-09** | Ghost style | osobny kolor + dash |
| **D-P3B-10** | SHIFT angles | **OUT P3B** |
| **D-P3B-11** | Grid count | **IN** opcjonalny display w label |
| **D-P3B-12** | Zero-length | reject `L < 1` |

---

## 10. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P3B-01** | Po 1. klik wall: Ghost (`previewWall`) podąża za kursorem (snapped) |
| **AC-P3B-02** | Live Length (px) widoczna podczas Ghost · **nie** w JSON wall |
| **AC-P3B-03** | Przy `grid.step > 0`: widoczny grid count w label (lub równoważny hint) |
| **AC-P3B-04** | Ghost znika po ESC / zmianie tool / change drawing.id |
| **AC-P3B-05** | 2. klik: wall w `objects` · Ghost nie w serializacji rysunku |
| **AC-P3B-06** | Continuous: po wall kolejny Ghost startuje od end; ESC kończy łańcuch |
| **AC-P3B-07** | `renderDrawingSvg(drawing)` bez opcji — brak `data-ghost-wall` |
| **AC-P3B-08** | PDF path: brak `previewWall` · brak Ghost w SVG→PDF |
| **AC-P3B-09** | ZIP: brak Ghost (reuse PDF) |
| **AC-P3B-10** | `schemaVersion === 1` · brak nowych pól wall |
| **AC-P3B-11** | Snap: ten sam `snapCoord` co commit |
| **AC-P3B-12** | `L < 1` na 2. klik → brak nowego wall |
| **AC-P3B-13** | Brak SHIFT angle constrain w P3B |
| **AC-P3B-14** | Regresja unit P0 · P1 · P1B · P2 · P3 · P3A **PASS** |
| **AC-P3B-15** | Brak zmian Payroll / cloud-sync merge drawings |

---

## 11. Ryzyka (FROZEN świadomość)

| ID | Ryzyko | Mitygacja IMPLEMENT / AR |
|----|--------|---------------------------|
| R1 | Full SVG rebuild co move | rAF throttle previewEnd · nie commit w move |
| R2 | Preview w PDF przez pomyłkę | hard: export calls bez `previewWall` · test AC-07/08 |
| R3 | Continuous trap | ESC + hint |
| R4 | Myślenie że px = wymiar P3A | Guide: podgląd ≠ wymiar label |
| R5 | Scope creep SHIFT / arrow | OUT lista §7 · D-P3B-10 |

---

## 12. Allowlist plików (orientacyjna · AR doprecyzuje)

| Obszar | Pliki (typowo) |
|--------|----------------|
| Render | `render-svg.ts` (`previewWall`) |
| Editor | `WmPrintDrawingEditor.tsx` |
| Guide / changelog | `GuideView.tsx` · `changelog-data.ts` · `CHANGELOG.md` |
| Testy | `scripts/test-wm-rysunki-01-p3b.mjs` + regresja P0–P3A |

**Zakaz allowlisty:** `cloud-sync.ts` merge · `CloudLoader` · `PayrollView` · nowy ZIP/PDF builder · `wall-gap.ts` (chyba że zero zmian) · `normalize.ts` model bump.

---

## 13. Zgodność zasad — self-check DF

| Zasada | Werdykt |
|--------|---------|
| **SSOT FIRST** | **PASS** — JSON SSOT; Ghost ephemeral |
| **REUSE FIRST** | **PASS** — lineStart / finishLine / snap / highlight-pattern |
| **ZERO DUPLICATE LOGIC** | **PASS** — jeden finishLine; PDF jedna ścieżka |
| **THIN SLICE** | **PASS** — wall only · SHIFT OUT |

---

## 14. NEXT

```text
STATUS: DESIGN FREEZE · FROZEN
AR: PASS WITH MINOR RECOMMENDATIONS

STOP
Czekać na OWNER GO IMPLEMENT
  → allowlist AR §6 · AC-P3B-01…15 · MR-P3B-01…07

COMMIT / PUSH: NIE do osobnego Owner GO
```

---

*DESIGN FREEZE ARCHIVE · AR COMPLETE · 2026-08-03 · bez implementacji · bez commit/push.*
