# WM-RYSUNKI-01 P3B — OWNER VERIFICATION (INTERACTIVE DRAWING UX)

> **ID:** WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B — INTERACTIVE DRAWING UX**  
> **FAZA:** **OWNER VERIFICATION** → **PASS**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **Wersja changelog:** **2.66.02**  
> **Data OV:** 2026-08-03  
> **Wejście:** Owner **GO OWNER VERIFICATION**  
> **IMPLEMENT:** COMPLETE · build PASS · testy P3B+P0–P3A PASS  
> **AUDIT:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-AUDIT.md) (**ACCEPTED**)  
> **DF:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION ARCHIVE · **NO COMMIT** · **NO PUSH** (czekaj Owner GO COMMIT)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

1 Ghost po 1. klik + move ...... PASS
2 Ghost za kursorem (rAF) ...... PASS
3 2. klik → final wall ......... PASS
4 Continuous Drawing ........... PASS
5 ESC tylko wall ............... PASS
6 Live Length .................. PASS
7 Grid Count ................... PASS
8 Ghost OUT JSON/Cloud/Undo/PDF/ZIP PASS
9 Regresja P0–P3A .............. PASS
10 AUDIT/DF/AR/MR/AC ........... PASS

P3B 24 · P3A 40 · P3 32 · P2 28 · P1B 32 · P1 44 · P0 33
changelog 2.66.02 · schemaVersion 1 · library 3 · render 3

COMMIT: NIE
PUSH: NIE
NEXT: OWNER GO COMMIT
════════════════════════════════════════════════════════
```

---

## 0. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy punkty OV 1–10 przechodzą? | **TAK** |
| Czy AUDIT + DF + AR + MR + AC są spełnione? | **TAK** |
| Blokery przed COMMIT? | **NIE** (allowlist P3B gotowa) |
| Regresja P0 / P1 / P1B / P2 / P3 / P3A | **BRAK** |
| Cloud merge drawings / Payroll / P4 / SHIFT / schema 2? | **NIE** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna | `test-wm-rysunki-01-p3b.mjs` (**24**) · P3A **40** · P3 **32** · P2 **28** · P1B **32** · P1 **44** · P0 **33** — **re-run OV 2026-08-03** |
| Statyczna (kod) | `wall-preview.ts` · `render-svg.ts` · `WmPrintDrawingEditor.tsx` · `export-pdf.ts` · `undo.ts` · `zip-entries.ts` |
| Kontrakt | DF AC-P3B-01…15 · AR MR-P3B-01…07 · D-P3B-01…12 · D-AR-P3B-01…07 |
| Negatyw | brak `previewWall` w PDF · brak Ghost w JSON · brak Cloud/Payroll w allowlist |

---

## 2. Punkty OV (Owner checklist 1–10)

### 1. Ghost pojawia się po pierwszym kliknięciu

| | |
|--|--|
| **Kod** | 1. klik wall → `setLineStart(p)` · move → `previewEnd` (rAF) → `previewWall` w `renderDrawingSvg` |
| **Uwaga** | Widoczny odcinek od pierwszego **move** po kliku (koniec Ghost = kursor); bez move brak drugiego punktu — zgodne z DF |
| **Test** | P3B T16–T19 (emisja Ghost z option) |
| **DF** | §5.2 · AC-P3B-01 |
| **Wynik** | **PASS** |

### 2. Ghost podąża płynnie za kursorem

| | |
|--|--|
| **Kod** | `onPointerMove` wall+`lineStart` → `pendingPreviewEndRef` + `requestAnimationFrame` (MR-P3B-06) · snap REUSE |
| **Test** | kod + T11 snap path jednostkowy metrics |
| **DF** | §5.2 · §5.4 · R1 |
| **Wynik** | **PASS** |

### 3. Drugi klik zamienia Ghost w finalną ścianę

| | |
|--|--|
| **Kod** | `finishLine("wall", …)` → `DrawingWallObject` → `commit` · Ghost nie w `objects` przed commit |
| **Reject** | `L < 1` → toast · bez commit (D-P3B-12) |
| **Test** | T11–T12 · T22 (wall bez pól ghost) |
| **DF** | §5.2 · AC-P3B-05 · AC-P3B-12 |
| **Wynik** | **PASS** |

### 4. Continuous Drawing działa

| | |
|--|--|
| **Kod** | po wall: `setLineStart(end)` · `previewEnd = null` · kolejny Ghost od last end · N × wall (nie polyline) |
| **Arrow** | `clearWallPreview()` — bez continuous (MR-P3B-02) |
| **Test** | T24 |
| **DF** | §5.3 · D-P3B-05 · AC-P3B-06 |
| **Wynik** | **PASS** |

### 5. ESC kończy wyłącznie tryb rysowania ścian

| | |
|--|--|
| **Kod** | `e.key === "Escape" && tool === "wall" && lineStart` → `clearWallPreview()` · `preventDefault` tylko wtedy |
| **Hint** | „Esc = koniec rysowania ścian” (MR-P3B-07) |
| **DF** | §5.7 · D-P3B-08 · AC-P3B-04 |
| **Wynik** | **PASS** |

### 6. Live Length

| | |
|--|--|
| **Kod** | `wallPreviewMetrics` → `Math.round(L) px` w `lengthLabel` · **bez** zapisu do JSON |
| **Test** | T05 · T07 · T08 · T10 |
| **DF** | §5.5 · D-P3B-04 · AC-P3B-02 |
| **Wynik** | **PASS** |

### 7. Grid Count

| | |
|--|--|
| **Kod** | przy `grid.step > 0`: `≈N krat.` w tym samym label |
| **Test** | T06 · T07 · T09 |
| **DF** | §5.6 · D-P3B-11 · AC-P3B-03 |
| **Wynik** | **PASS** |

### 8. Ghost OUT: JSON · Cloud · Undo · PDF · ZIP

| Ścieżka | Dowód | Wynik |
|---------|-------|--------|
| **JSON** | T22–T23 · brak pól ghost/length na wall · `schemaVersion` 1 | **PASS** |
| **Cloud** | allowlist OUT · zero zmian merge / DATA_KEY | **PASS** |
| **Undo** | `DrawingUndoStack` tylko `WmTechnicalDrawing` · Ghost = React state | **PASS** |
| **PDF** | `generateDrawingPdf` → `renderDrawingSvg(drawing, { showGrid: false })` · **bez** `previewWall` · T15 | **PASS** |
| **ZIP** | reuse `generateDrawingPdf` · dziedziczy PDF bez Ghost · AC-09 | **PASS** |

### 9. Regresja P3A · P3 · P2 · P1B · P1 · P0

| Suite | Wynik OV re-run |
|-------|-----------------|
| P3B | **24 PASS** |
| P3A | **40 PASS** |
| P3 | **32 PASS** |
| P2 | **28 PASS** |
| P1B | **32 PASS** |
| P1 | **44 PASS** |
| P0 | **33 PASS** |

**Wynik:** **PASS**

### 10. Zgodność z AUDIT · DF · AR · MR · AC

| Źródło | Wynik |
|--------|--------|
| AUDIT ACCEPTED (Opcja A · ephemeral) | **PASS** |
| DF FROZEN D-P3B-01…12 · SHIFT OUT | **PASS** |
| AR PASS WITH MINOR RECOMMENDATIONS | **PASS** |
| MR-P3B-01…07 | **DONE** (§4) |
| AC-P3B-01…15 | **PASS** (§3) |

**Wynik:** **PASS**

---

## 3. AC-P3B (FROZEN) — mapa

| ID | Status |
|----|--------|
| AC-P3B-01 Ghost po 1. klik + move | **PASS** |
| AC-P3B-02 Live Length bez JSON | **PASS** |
| AC-P3B-03 Grid count w label | **PASS** |
| AC-P3B-04 clear ESC / tool / drawing.id | **PASS** |
| AC-P3B-05 wall w objects · Ghost nie w serializacji | **PASS** |
| AC-P3B-06 Continuous + ESC | **PASS** |
| AC-P3B-07 default SVG bez ghost | **PASS** T13–T14 |
| AC-P3B-08 PDF bez previewWall | **PASS** T15 + kod export |
| AC-P3B-09 ZIP bez Ghost | **PASS** (reuse PDF) |
| AC-P3B-10 schemaVersion 1 | **PASS** T01 · T21 |
| AC-P3B-11 snapCoord REUSE | **PASS** |
| AC-P3B-12 L&lt;1 reject | **PASS** |
| AC-P3B-13 brak SHIFT | **PASS** |
| AC-P3B-14 regresja P0–P3A | **PASS** |
| AC-P3B-15 Cloud/Payroll OUT | **PASS** |

---

## 4. MR z AR — status

| ID | Status |
|----|--------|
| **MR-P3B-01** test Ghost OUT PDF/default | **DONE** |
| **MR-P3B-02** continuous tylko wall | **DONE** |
| **MR-P3B-03** Escape scoped | **DONE** |
| **MR-P3B-04** `wallPreviewMetrics` | **DONE** |
| **MR-P3B-05** `#f59e0b` + dash | **DONE** |
| **MR-P3B-06** rAF throttle | **DONE** |
| **MR-P3B-07** hint Esc | **DONE** |

---

## 5. OUT respektowane

| Element | Status |
|---------|--------|
| SHIFT 0/45/90/135 | **OUT** |
| P4 / punkty / CAD | **OUT** |
| Cloud merge / Payroll | **OUT** |
| `schemaVersion` 2 | **OUT** |
| Ghost w objects / PDF / ZIP | **OUT** |
| Arrow Ghost | **OUT** |

---

## 6. Allowlist COMMIT (po Owner GO COMMIT)

| Plik | Rola |
|------|------|
| `src/lib/wm-technical-drawings/wall-preview.ts` | NEW metrics |
| `src/lib/wm-technical-drawings/render-svg.ts` | `previewWall` |
| `src/lib/wm-technical-drawings/index.ts` | export |
| `src/app/WmPrintDrawingEditor.tsx` | Ghost · continuous · ESC · rAF |
| `src/app/GuideView.tsx` | instrukcja |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.66.02** |
| `scripts/test-wm-rysunki-01-p3b.mjs` | NEW |
| `docs/architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-*.md` | AUDIT · DF · AR · OV |

**Nie commitować** przy GO COMMIT: obce WIP (`CloudLoader`, `PayrollView`, `.tmp*`, …).

---

## 7. Wersja / git

| Pole | Wartość |
|------|---------|
| Changelog tip (local) | **2.66.02** |
| Prod tip (przed release) | **2.66.01** / `20e5c5a3` |
| Commit P3B | **PENDING** — czekaj **OWNER GO COMMIT** |
| Push | **NIE** |

---

## 8. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: OWNER GO COMMIT
  → allowlist §6 only
  → bez push (osobny GO RELEASE / PUSH)

P4 / SHIFT / punkty / CAD: NIE bez nowego Owner GO
```

---

*OV zakończona · PASS · bez commit/push.*
