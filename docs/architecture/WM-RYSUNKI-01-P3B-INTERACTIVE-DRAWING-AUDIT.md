# WM-RYSUNKI-01 P3B — INTERACTIVE DRAWING UX AUDIT

> **STATUS:** **ACCEPTED** · Design Freeze → [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md) (**FROZEN**)  
> **ID:** WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B — INTERACTIVE DRAWING UX**  
> **FAZA:** **AUDIT** → **ACCEPTED**  
> **MODE:** AUDIT ARCHIVE · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** (P3B Interactive Drawing UX)  
> **Baseline prod:** UI **2.66.01** / **`20e5c5a3`** · P3A CLOSED · EPIC CORE COMPLETE (P0–P3) · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Parents:** [`WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md`](./WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md) · P1 toolset [`WM-RYSUNKI-01-P1-CLOSEOUT.md`](./WM-RYSUNKI-01-P1-CLOSEOUT.md) · EPIC DF [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B — INTERACTIVE DRAWING UX AUDIT

STATUS: ACCEPTED
DF: FROZEN → WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md
WERDYKT: FEASIBLE · THIN SLICE · EDITOR-ONLY

Ghost Line = ephemeral UI (NIE JSON)
schemaVersion 1 · PDF/ZIP/Cloud bez zmian kontraktu

NEXT: OWNER GO ARCHITECTURE REVIEW
IMPLEMENT / COMMIT / PUSH / P4: NIE
════════════════════════════════════════════════════════
```

---

## 0. Kontekst wejściowy

| Element | Stan |
|---------|------|
| **Prod tip** | **2.66.01** / **`20e5c5a3`** · P3A CLOSED |
| **Domena** | `src/lib/wm-technical-drawings/` · KV `kw-wm-technical-drawings` |
| **Edytor** | `WmPrintDrawingEditor.tsx` |
| **Render SSOT (persist)** | `renderDrawingSvg(drawing)` → PDF (`showGrid: false`) → ZIP |
| **Schema** | `DRAWING_SCHEMA_VERSION = 1` |
| **Library / render** | `DRAWING_SYMBOL_LIBRARY_VERSION = 3` · `DRAWING_RENDER_VERSION = 3` |
| **Cel P3B** | Interaktywny podgląd rysowania **ścian** · **nie** P4 · **nie** nowy model |

### 0.1 Gate

```text
PAYROLL: OUT
Cloud drawings merge: OUT
Nowy DATA_KEY / schemaVersion 2: ZAKAZ
Ghost / preview w JSON / objects[]: ZAKAZ
PDF / ZIP zawierające Ghost: ZAKAZ
P4 measurement/electrical points · CAD/DXF: OUT
Nowa dependency: ZAKAZ
```

### 0.2 Zasady (wiążące)

| Zasada | Jak stosujemy w P3B |
|--------|---------------------|
| **SSOT FIRST** | SSOT trwały = JSON rysunku. Ghost = stan UI sesji (jak `lineStart` / `hoverWallId`) — **nigdy** w `objects[]` / KV / export |
| **REUSE FIRST** | `lineStart` + `finishLine` + `snapCoord` + wzorzec opcji edytora `highlightWallId` (P3A) |
| **ZERO DUPLICATE LOGIC** | jedna funkcja długości (px / kratki); brak drugiego commit path ściany; PDF nadal tylko `generateDrawingPdf` → `renderDrawingSvg(drawing)` |
| **THIN SLICE** | tylko tool **Ściana** (+ ewentualnie ta sama ghost ścieżka dla strzałki — DF); bez redesignu toolbara / bez polyline entity |

---

## 1. Stan obecny (AS-IS)

### 1.1 Dwuklik ściany

| Krok | Kod | Efekt |
|------|-----|-------|
| 1. klik | `setLineStart(p)` gdzie `p = snap(raw)` | stan React · **bez** obiektu w modelu |
| move | `onPointerMove` **nie** czyta `lineStart` | **brak** podglądu linii |
| 2. klik | `finishLine("wall", lineStart, p)` | nowy `DrawingWallObject` → `commit` → autosave / undo |
| hint | tekst „Kliknij drugi punkt.” | jedyna feedback UX |

Źródło: `WmPrintDrawingEditor.tsx` — `lineStart`, `finishLine`, `onPointerDown` (tool `wall` \| `arrow`), `onPointerMove` (tylko drzwi hover + drag).

### 1.2 Ephemeral preview już w produkcie (wzorzec)

| Mechanizm | Warstwa | Persist? |
|-----------|---------|----------|
| `lineStart` | React state | **NIE** |
| `highlightWallId` → `renderDrawingSvg(..., { highlightWallId })` | opcja renderera **tylko edytor** | **NIE** — PDF: `showGrid: false`, **bez** highlight |
| drag live | `applyWithoutUndo` na kopii obiektu | tak (obiekt już w JSON) — **inny** przypadek |

**Wniosek:** P3B Ghost Line = ten sam kontrakt co `highlightWallId`: **editor-only option / overlay**, zero wpływu na PDF/ZIP gdy ścieżka exportu nie przekazuje preview.

### 1.3 Jednostki

| | |
|--|--|
| Page | px (`A4` landscape 842×595, …) |
| Grid | `DEFAULT_DRAWING_GRID.step = 10`, `snap` bool |
| Długość ściany w modelu | odcinek `(x1,y1)–(x2,y2)` w world px — **bez** pola `length` |
| Wymiar P3A | `label` ręczny (tekst) — **nie** auto-metr |

Ghost „długość” w P3B = **metryka UI** (px i/lub kratki), **nie** nowy typ obiektu ani auto-dimension.

---

## 2. Zakres Ownera — analiza punkt po punkcie

### 2.1 Ghost Line po 1. kliknięciu (kursor)

| | |
|--|--|
| **Możliwe?** | **TAK** |
| **Warunek** | `lineStart != null` ∧ `tool === "wall"` ∧ brak drag |
| **Dane** | start = `lineStart`; end = `snap(raw)` na `pointermove` |
| **IN** | **IN** (rdzeń P3B) |

### 2.2 Na żywo długość ściany

| | |
|--|--|
| **Możliwe?** | **TAK** |
| **Formuła** | `L = hypot(end.x - start.x, end.y - start.y)` |
| **Wyświetlanie** | etykieta przy midpoint Ghost **lub** pasek hint pod toolbar (DF) |
| **Jednostka (do DF)** | rekomendacja AUDIT: **px zaokrąglone** (np. `Math.round(L)`) · spójne z world units; **nie** udawać metrów bez kalibracji |
| **IN** | **IN** |

### 2.3 Opcjonalnie liczba kratek

| | |
|--|--|
| **Możliwe?** | **TAK** |
| **Formuła** | `cells = L / grid.step` (step > 0) · wyświetl `≈ N` lub `N.n` |
| **Gdy snap ON** | przy prostopadłych odcinkach `cells` zwykle całkowite — UX czytelny |
| **IN / OUT** | **OPCJONALNE IN** — DF: default **ON** (thin) lub OFF |
| **Zakaz** | nie zapisywać `gridCells` w JSON |

### 2.4 Ghost tylko w czasie rysowania · nie w JSON

| | |
|--|--|
| **Wymóg** | **HARD** |
| **Clear Ghost gdy** | 2. klik (commit) · zmiana tool · Escape · zmiana `drawing.id` · `lineStart = null` · leave canvas (opcjonalnie DF) |
| **Test AC (proponowane)** | po commit: `objects` bez `ghost*` · `JSON.stringify(drawing)` bez preview · PDF SVG string bez `data-ghost` |

### 2.5 2. klik → normalna ściana

| | |
|--|--|
| **Reuse** | istniejące `finishLine("wall", …)` — **bez** zmiany kontraktu wall |
| **IN** | **IN** (bez zmian modelu) |

### 2.6 Opcjonalnie: ciągłe rysowanie (następna ściana od last point)

| | |
|--|--|
| **Możliwe?** | **TAK** · 1 linia po `finishLine`: `setLineStart(end)` zamiast `null` |
| **Semantyka** | N × `DrawingWallObject` (jak dziś) — **nie** nowy typ polyline |
| **Anulowanie** | Escape / tool change / 2× click tego samego punktu? → DF |
| **IN / OUT** | **OPCJONALNE** — rekomendacja AUDIT: **IN jako default ON** dla tool wall (duży zysk UX, koszt ~0 modelu) **albo** toggle „Łańcuch” — DF wybiera |
| **Ryzyko** | użytkownik „utknie” w trybie ciągłym → Escape **wymagane** w DF |

---

## 3. Opcje architektury Ghost (kluczowa decyzja DF)

| Opcja | Opis | PDF/ZIP leak | REUSE | Werdykt AUDIT |
|-------|------|--------------|-------|---------------|
| **A — `renderDrawingSvg` option** | np. `previewWall?: { x1,y1,x2,y2; label? }` · jak `highlightWallId` | tylko gdy caller przekaże (PDF **nie** przekazuje) | wysoki | **REKOMENDOWANE** |
| **B — overlay DOM/SVG sibling** | osobny `<svg>` / warstwa nad hostem | zero w rendererze | niski duplikat linii | **AKCEPTOWALNE** (jeśli Owner chce twardą izolację) |
| **C — tymczasowy wall w `local.objects`** | bez commit / z commit | autosave / undo / sync **ryzyko** | — | **OUT** · **ZAKAZ** |
| **D — nowy `DrawingObjectType: ghost_wall`** | w schema | schema bump · normalize | — | **OUT** · **ZAKAZ** |

**Rekomendacja:** **Opcja A** — spójna z P3A `highlightWallId`, jeden układ współrzędnych, PDF/ZIP bez zmian wywołań.

**Hard rule export:**

```text
generateDrawingPdf / ZIP → renderDrawingSvg(drawing, { showGrid: false })
  // NIGDY previewWall / highlightWallId
```

---

## 4. Wpływ na warstwy (Owner checklist)

| Warstwa | Wpływ P3B | Zmiana kontraktu? |
|---------|-----------|-------------------|
| **Renderer (`render-svg.ts`)** | Opcja A: +opcjonalny fragment Ghost + label · default path bez zmian | **Nie** dla PDF (brak opcji) |
| **SVG (persist / Final)** | bez Ghost | **Nie** |
| **Snap** | Ghost end = `snapCoord` jak 2. klik · **nie** zmienia `snapCoord` | **Nie** |
| **PDF (P2)** | wywołanie bez preview · regresja: brak `data-ghost` w SVG | **Nie** |
| **ZIP (P3)** | reuse PDF bytes · bez Ghost | **Nie** |
| **Cloud / KV / merge** | brak pól · brak nowego klucza | **Nie** · OUT |
| **schemaVersion** | **1** bez bump | **Nie** |
| **Library version** | bez bump (brak glyph) | **Nie** |
| **DRAWING_RENDER_VERSION** | **bez bump** jeśli default `renderDrawingSvg(d)` string-identyczny; bump tylko gdy DF zmieni default output | rekomendacja: **bez bump** |
| **Undo / autosave** | Ghost poza stackiem; commit ściany jak dziś | **Nie** |
| **Payroll** | OUT | — |

---

## 5. Zakres narzędzi (IN / OUT)

| Tool | Ghost Line | Werdykt |
|------|------------|---------|
| **wall** | TAK | **IN** (slice) |
| **arrow** | ten sam `lineStart` | **OUT** z P3B **lub** cheap reuse w DF (ta sama opcja preview) — rekomendacja: **OUT** (THIN) · backlog 1-liner |
| **dimension** (2-click secondary) | — | **OUT** (P3A primary = wall popup) |
| drzwi / stamp / text | — | **OUT** |

---

## 6. Wydajność / UX ryzyka

| Ryzyko | Opis | Mitygacja (DF/IMPL) |
|--------|------|---------------------|
| **P-01 Full SVG rebuild** | `useMemo(svgMarkup)` na każdy move przy `previewEnd` state | throttle rAF · **lub** Opcja B overlay tylko ghost · nie commit w move |
| **P-02 Autosave flood** | gdyby Ghost trafił do `local` | **ZAKAZ** C/D · Ghost tylko React state / option |
| **P-03 Escape** | brak cancel dziś (tylko tool change czyści `lineStart`) | DF: **Escape** → `setLineStart(null)` |
| **P-04 Continuous mode trap** | łańcuch bez końca | Escape + hint „Esc = koniec łańcucha” |
| **P-05 Zero-length** | 2. klik = start | jak dziś (ściana 0) — DF: reject `L < ε` opcjonalnie |
| **P-06 Label vs wymiar P3A** | ghost px ≠ wymiar `label` | copy: „Podgląd (px)” · nie mylić z wymiarem |

---

## 7. Zgodność z zasadami — werdykt

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | JSON = SSOT; Ghost ephemeral |
| **REUSE FIRST** | **PASS** | `lineStart` / `finishLine` / `snap` / wzorzec `highlightWallId` |
| **ZERO DUPLICATE LOGIC** | **PASS** (przy A lub B) | jedna długość helper; jeden commit wall |
| **THIN SLICE** | **PASS** | editor UX only · wall · bez schema / Cloud / PDF builder |

**Ogólny werdykt AUDIT:** **FEASIBLE** · **GO Design Freeze recommended**.

---

## 8. Propozycja granic slice (do zamrożenia w DF)

### 8.1 IN (rdzeń)

1. Ghost Line (dashed/semitransparent) od `lineStart` → kursor (snapped) dla tool **Ściana**.  
2. Live długość (px, rounded) na Ghost lub w hint.  
3. Ghost **wyłącznie** gdy `lineStart` aktywny · clear jak w §2.4.  
4. 2. klik → istniejący `finishLine` → wall w JSON.  
5. Testy: Ghost nie w normalize/export; PDF SVG bez preview; regresja P0–P3A.

### 8.2 OPCJONALNE (DF wybiera)

| ID | Feature | Rekomendacja AUDIT |
|----|---------|-------------------|
| **O1** | Liczba kratek `L/step` | **IN** (niski koszt) |
| **O2** | Ciągłe rysowanie (`setLineStart(end)`) | **IN** + Escape |
| **O3** | Ghost dla **arrow** | **OUT** (thin) |
| **O4** | Reject zero-length wall | **IN** (ε = 1 px) |

### 8.3 OUT (twarde)

- JSON / schema / Cloud merge / Payroll / P4 punkty / CAD  
- Tymczasowy wall w `objects[]`  
- Auto-tworzenie obiektu `dimension` z długości Ghost  
- Nowy PDF/ZIP builder · watermark · metry kalibrowane  
- Zmiana `wall-gap` / symboli P3A  

---

## 9. Proponowane decyzje DF (szkic ID)

| ID | Temat | Szkic |
|----|-------|-------|
| **D-P3B-01** | Architektura Ghost | Opcja **A** (`previewWall` w `RenderDrawingSvgOptions`) |
| **D-P3B-02** | Persist | Ghost **nigdy** w JSON / KV |
| **D-P3B-03** | Export | PDF/ZIP **bez** preview options |
| **D-P3B-04** | Jednostka długości | **px** rounded · opcjonalnie kratki |
| **D-P3B-05** | Continuous wall | ON + Escape **lub** OFF — Owner wybiera |
| **D-P3B-06** | schema / render version | **bez bump** |
| **D-P3B-07** | Zakres tool | tylko **wall** |
| **D-P3B-08** | Cancel | Escape + tool change |

---

## 10. Proponowane AC (szkic)

| ID | Kryterium |
|----|-----------|
| **AC-P3B-01** | Po 1. klik wall: Ghost podąża za kursorem (snap) |
| **AC-P3B-02** | Live długość widoczna podczas Ghost |
| **AC-P3B-03** | (jeśli O1) widoczna liczba kratek |
| **AC-P3B-04** | Ghost znika po 2. klik / Escape / zmianie tool |
| **AC-P3B-05** | Po 2. klik: wall w `objects` · Ghost nie w JSON |
| **AC-P3B-06** | `renderDrawingSvg(drawing)` bez opcji ≡ bez Ghost |
| **AC-P3B-07** | PDF / ZIP smoke: brak `data-ghost` / preview |
| **AC-P3B-08** | (jeśli O2) kolejna Ghost startuje od last end; Escape kończy |
| **AC-P3B-09** | Regresja P0–P3A unit PASS |
| **AC-P3B-10** | Cloud / Payroll / schemaVersion nietknięte |

---

## 11. Pliki (przewidywany allowlist IMPL — nie teraz)

| Plik | Rola |
|------|------|
| `WmPrintDrawingEditor.tsx` | `previewEnd` state · pointermove · Escape · continuous |
| `render-svg.ts` | opcjonalnie `previewWall` (Opcja A) |
| `scripts/test-wm-rysunki-01-p3b.mjs` | NEW |
| `changelog-data.ts` / `CHANGELOG.md` | bump UI przy release |
| `GuideView.tsx` | krótka instrukcja Esc / Ghost |

**Poza allowlist:** `cloud-sync.ts` · `CloudLoader` · Payroll · `export-pdf` logika (tylko regresja „bez opcji”) · `zip-entries` · `merge.ts`.

---

## 12. Relacja do P3A / P4

| Slice | Relacja |
|-------|---------|
| **P3A** | CLOSED · hover drzwi / gap / wymiary — **nie** zmieniać; Ghost **nie** używa `highlightWallId` do ścian rysowanych |
| **P3B** | polish interakcji **wall draw** · po CORE |
| **P4** | punkty / CAD — **OUT** · bez Owner GO AUDIT |

---

## 13. NEXT

```text
STATUS: ACCEPTED
DF: FROZEN → WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md

STOP
Czekać na OWNER GO ARCHITECTURE REVIEW

IMPLEMENT / COMMIT / PUSH / P4: NIE
```

---

*AUDIT ARCHIVE · 2026-08-03 · DF FROZEN · bez implementacji · bez commit/push.*
