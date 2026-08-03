# WM-RYSUNKI-01 P3B — INTERACTIVE DRAWING UX ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B — INTERACTIVE DRAWING UX**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** tip **2.66.01** / **`20e5c5a3`** · P3A **CLOSED** · kod read-only: `render-svg.ts` · `export-pdf.ts` · `zip-entries.ts` · `undo.ts` · `WmPrintDrawingEditor.tsx` · `normalize.ts`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
DF spójny z AUDIT + Owner GO DF
SSOT/REUSE/ZERO DUP/THIN: PASS

previewWall: UI-only option · NIE objects/JSON/Cloud/Undo/PDF/ZIP
renderDrawingSvg: jeden renderer
Ghost: render-time only (edytor)
Continuous + ESC: FROZEN · wall-only
Live Length / Grid Count: display-only
Ghost style: osobny kolor
SHIFT angles: OUT P3B
P3A / PDF / ZIP / AppSettings / Cloud / Payroll: bez wpływu kontraktu

Gotowy do Owner GO IMPLEMENT P3B
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | P3B DF ↔ AUDIT ↔ living editor / render / PDF / ZIP / undo (read-only) |
| Mutacje | **tylko** ten dokument AR (+ pointer STATUS w DF) |
| Kryterium **FAIL** | Ghost w `objects[]` / JSON / Cloud · drugi renderer PDF · `schemaVersion: 2` · preview w `generateDrawingPdf` · Payroll/Cloud w scope · SHIFT IN mimo DF OUT · osobny wall engine tylko-edytor poza `renderDrawingSvg` |
| Kryterium **PASS** | brak blokerów · DF kompletny |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-P3B-* do IMPLEMENT (bez wymuszania amend DF) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P3B jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + decyzje Ownera? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR nie wymuszają amend) |
| Czy P3B narusza P3A / P2 / P3 kontrakty? | **NIE** (additive editor option + React state) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT ↔ Owner GO

| Temat | AUDIT | DF P3B | Wynik |
|-------|-------|--------|--------|
| Ghost = ephemeral · nie JSON | §2.4 · Opcja A | D-P3B-01/02 · §3.2 | **PASS** |
| `previewWall` w `renderDrawingSvg` | §3 A | §2 #1–2 · §4 | **PASS** |
| Live Length bez zapisu | §2.2 | §2 #3 · §5.5 | **PASS** |
| Grid count opcjonalny | §2.3 O1 | §2 #7 · D-P3B-11 | **PASS** |
| Continuous + ESC | §2.6 | §2 #6 · §5.3 | **PASS** |
| Snap REUSE | §1 / §5 | §2 #5 · §5.4 | **PASS** |
| Ghost style osobny | (style DF) | §2 #4 · §4.2 | **PASS** |
| PDF preview OUT | §4 | §2 #8 · §6 | **PASS** |
| schemaVersion 1 | §4 | §2 #9 · §3.1 | **PASS** |
| SHIFT OUT | — | §2 #10 · §8 | **PASS** |
| AC-P3B-01…15 | §10 szkic | §10 FROZEN | **PASS** |
| OUT Cloud/Payroll/P4/arrow Ghost | §8.3 | §7 OUT | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Zasady WGDOM

| Zasada | Werdykt | Dowód |
|--------|---------|--------|
| **SSOT FIRST** | **PASS** | JSON rysunku = SSOT trwały. Ghost = argument renderera / React (`lineStart`, `previewEnd`) — nigdy model. PDF/ZIP: `generateDrawingPdf` → `renderDrawingSvg(drawing, { showGrid: false })` bez preview. |
| **REUSE FIRST** | **PASS** | `lineStart` · `finishLine` · `snapCoord` · wzorzec opcji jak `highlightWallId` (P3A) · ten sam `DrawingUndoStack` (tylko `WmTechnicalDrawing`) |
| **ZERO DUPLICATE LOGIC** | **PASS** | jeden commit wall (`finishLine`); jeden SVG SSOT; zakaz wall w `objects` przed 2. klik; zakaz drugiego PDF path |
| **THIN SLICE** | **PASS** | wall-only · SHIFT OUT · bez schema/Cloud/Payroll/P4 · bez arrow Ghost |

**Werdykt sekcji: PASS**

---

## 4. Checklista Ownera (10 punktów)

### 4.1 `previewWall` — UI only

**PASS.**

| Warstwa | Rola P3B |
|---------|----------|
| React | `lineStart` + `previewEnd` → buduje `previewWall` |
| `renderDrawingSvg(..., { previewWall })` | emisja Ghost SVG **tylko** gdy option podana |
| Model / KV | **zero** pól preview |

Living AS-IS: `highlightWallId` już jest editor-only option — ten sam kontrakt.

**FAIL byłby:** zapis `previewWall` do `objects[]` lub nowego typu.

---

### 4.2 Brak zapisu preview → objects · JSON · Cloud · Undo · PDF · ZIP

**PASS** (architektura DF + living dowody).

| Ścieżka | Living dziś | P3B gwarancja |
|---------|-------------|----------------|
| **objects** | wall dopiero w `finishLine` | Ghost **nie** wchodzi do `objects` przed/po (poza final wall) |
| **JSON / normalize** | `parseWmTechnicalDrawing` bez ghost | **bez** nowych pól · schema 1 |
| **Cloud** | `kw-wm-technical-drawings` LWW drawings | **OUT** allowlisty — brak zmian merge |
| **Undo** | `DrawingUndoStack` trzyma wyłącznie `WmTechnicalDrawing` | Ghost w React → **nie** w past/future; undo nie „przywraca” Ghost (oczekiwane) |
| **PDF** | `export-pdf.ts` L98: `renderDrawingSvg(drawing, { showGrid: false })` | **nie** dodawać `previewWall` |
| **ZIP** | `zip-entries` → `generateDrawingPdf` 1× | dziedziczy PDF bez Ghost |

**MR-P3B-01:** test jednostkowy: `renderDrawingSvg(d)` oraz SVG ze ścieżki PDF **bez** `data-ghost-wall`; z option — z markerem.

---

### 4.3 `renderDrawingSvg` — jeden renderer

**PASS.**

```text
AS-IS:
  Editor → renderDrawingSvg(local, { showGrid, highlightWallId? })
  PDF    → renderDrawingSvg(drawing, { showGrid: false })
  ZIP    → generateDrawingPdf → ten sam SVG path

P3B:
  Editor → + previewWall gdy wall+lineStart
  PDF/ZIP → bez zmian wywołania
```

**FAIL byłby:** osobny canvas / drugi SVG builder tylko dla Ghost poza `render-svg.ts` (Opcja B odrzucona w DF).

---

### 4.4 Ghost — render-time only

**PASS.**

- Emisja w `render-svg` przy option — analogicznie do highlight.
- **Bez** `computeWallGaps` na Ghost (DF §4.1).
- **Bez** `data-id` modelu (brak select/drag Ghost).
- Default path bez option: string-identyczny → **bez** bump `DRAWING_RENDER_VERSION`.

---

### 4.5 Continuous Drawing

**PASS.**

| Reguła DF | AR |
|-----------|-----|
| Po wall: `setLineStart(end)` | **IN** — zmiana względem AS-IS `setLineStart(null)` w `finishLine` |
| N × `DrawingWallObject` | **PASS** — bez polyline entity |
| Tylko tool wall | **PASS** — arrow nadal `setLineStart(null)` po finish |

**MR-P3B-02:** wydzielić zakończenie linii: wall → continuous; arrow → clear (ZERO DUP: jedna `finishLine`, branch po `type`).

---

### 4.6 ESC

**PASS** (z MR).

Living: keydown tylko Ctrl/Cmd+Z/Y — **brak** Escape. DF wymaga ESC → clear `lineStart` + preview.

| Reguła | AR |
|--------|-----|
| ESC gdy wall + `lineStart` | clear łańcuch |
| Nie mylić z undo | Escape ≠ Ctrl+Z |
| Pointer leave | **nie** = ESC (DF §5.7) |

**MR-P3B-03:** w handlerze Escape: `preventDefault` tylko gdy `lineStart && tool === "wall"` (nie pożerać Esc globalnie przy innych UI).

---

### 4.7 Live Length

**PASS.**

- `L = hypot` · display `Math.round(L) px` · **nie** w JSON wall · **nie** auto-dimension.
- Reject `L < 1` na 2. klik (D-P3B-12).

**MR-P3B-04:** pure helper `wallPreviewMetrics(x1,y1,x2,y2, step?) → { lengthPx, cells?, lengthLabel }` — jeden format label (ZERO DUP editor/renderer).

---

### 4.8 Grid Count

**PASS.**

- Opcjonalny display gdy `grid.step > 0` · w tym samym `lengthLabel`.
- Bez pola w modelu.

---

### 4.9 Ghost Style

**PASS.**

| Wymóg | AR |
|-------|-----|
| ≠ wall `#1e293b` | **PASS** |
| ≠ hover drzwi `#38bdf8` | **PASS** |
| dash + osobny kolor | DF proponuje `#f59e0b` |

**MR-P3B-05:** IMPL używa **`#f59e0b`** + `stroke-dasharray="6 4"` (lub równoważne) · stałe w `render-svg` (nie magic w editorze).

---

### 4.10 Brak wpływu na P3A · PDF · ZIP · AppSettings · Cloud · Payroll

| Obszar | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **P3A** | **PASS** | gap / drzwi P/W / wymiar popup / board R — **nietknięte**; Ghost ≠ `highlightWallId` |
| **PDF** | **PASS** | wywołanie bez `previewWall` · regresja AC-08 |
| **ZIP** | **PASS** | reuse PDF · AC-09 |
| **AppSettings** | **PASS** | flaga `wmRysunkiEnabled` P1B — **OUT** zmian P3B |
| **Cloud** | **PASS** | brak merge / DATA_KEY |
| **Payroll** | **PASS** | poza allowlistą |

---

## 5. Ryzyka architektury → IMPLEMENT

| ID | Ryzyko | Severity | MR / mitygacja |
|----|--------|----------|----------------|
| R1 | SVG rebuild co `pointermove` | M | **MR-P3B-06:** `requestAnimationFrame` / throttle `previewEnd` · zero `commit` w move |
| R2 | Preview przypadkiem w PDF | H | AC-07/08 · nie zmieniać `export-pdf` options |
| R3 | Continuous trap | L | ESC + hint (DF) · MR-P3B-03 |
| R4 | `finishLine` dziś zawsze `setLineStart(null)` | M | MR-P3B-02 wall branch |
| R5 | Scope SHIFT / arrow Ghost | H | OUT DF · AC-13 |
| R6 | Myślenie px = wymiar P3A | L | Guide 1 zdanie |

**Żadne R* nie jest blokerem AR.**

---

## 6. Allowlist IMPLEMENT (AR)

| IN | OUT |
|----|-----|
| `render-svg.ts` (`previewWall` + style Ghost) | `cloud-sync.ts` merge |
| `WmPrintDrawingEditor.tsx` (previewEnd · continuous · ESC · metrics) | `CloudLoader.tsx` |
| opcjonalnie mały helper metrics w `wm-technical-drawings/` (np. `wall-preview.ts`) | `PayrollView.tsx` |
| `GuideView.tsx` · `changelog-data.ts` · `CHANGELOG.md` | `export-pdf.ts` logika (tylko regresja „bez opcji”) |
| `scripts/test-wm-rysunki-01-p3b.mjs` + regresja P0–P3A | `zip-entries.ts` / `generate-zip` |
| | `wall-gap.ts` · `normalize.ts` model bump · `AppSettings` |
| | SHIFT / arrow Ghost / P4 |

---

## 7. Minor Recommendations (IMPLEMENT)

| ID | Rekomendacja | Amend DF? |
|----|--------------|-----------|
| **MR-P3B-01** | Testy: Ghost tylko z option; PDF/default SVG bez `data-ghost-wall` | **NIE** |
| **MR-P3B-02** | `finishLine`: wall → continuous `setLineStart(end)`; arrow → `null` | **NIE** |
| **MR-P3B-03** | Escape scoped do wall + `lineStart` | **NIE** |
| **MR-P3B-04** | Pure `wallPreviewMetrics` → jeden `lengthLabel` | **NIE** |
| **MR-P3B-05** | Ghost stroke `#f59e0b` + dash w `render-svg` | **NIE** |
| **MR-P3B-06** | rAF throttle preview na move | **NIE** |
| **MR-P3B-07** | Hint: „Esc = koniec rysowania ścian” gdy Ghost aktywny | **NIE** |

---

## 8. Decyzje AR (wiązanie IMPLEMENT)

| ID | Decyzja |
|----|---------|
| **D-AR-P3B-01** | Opcja A exclusively — `previewWall` w `RenderDrawingSvgOptions` |
| **D-AR-P3B-02** | `generateDrawingPdf` / ZIP **nie** przekazują `previewWall` |
| **D-AR-P3B-03** | Undo stack = tylko drawing; Ghost poza stackiem |
| **D-AR-P3B-04** | Continuous tylko wall; arrow bez zmiany semantyki clear |
| **D-AR-P3B-05** | `DRAWING_RENDER_VERSION` / library / schema — **bez bump** |
| **D-AR-P3B-06** | SHIFT / arrow Ghost / Cloud / Payroll / AppSettings — **OUT** |
| **D-AR-P3B-07** | AC-P3B-01…15 z DF — obowiązkowe przed OV |

---

## 9. Mapowanie AC → weryfikacja AR

| AC | AR check |
|----|----------|
| AC-01…06 | editor flow · continuous · ESC |
| AC-07…09 | renderer default · PDF · ZIP |
| AC-10 | schema 1 · no wall fields |
| AC-11 | snapCoord reuse |
| AC-12 | L&lt;1 reject |
| AC-13 | no SHIFT |
| AC-14 | regresja suite |
| AC-15 | allowlist Cloud/Payroll |

---

## 10. NEXT

```text
STATUS: ARCHITECTURE REVIEW COMPLETE
WERDYKT: PASS WITH MINOR RECOMMENDATIONS

STOP
Czekać na OWNER GO IMPLEMENT
  → allowlist §6 · AC-P3B-01…15 · MR-P3B-01…07

IMPLEMENT / COMMIT / PUSH: NIE (do Owner GO IMPLEMENT)
```

---

*ARCHITECTURE REVIEW ONLY · 2026-08-03 · bez implementacji · bez commit/push.*
