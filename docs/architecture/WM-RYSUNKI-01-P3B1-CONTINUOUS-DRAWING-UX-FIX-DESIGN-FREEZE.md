# WM-RYSUNKI-01 P3B.1 — CONTINUOUS DRAWING UX FIX · DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B.1 — CONTINUOUS DRAWING UX FIX**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ARCHIVE · DOCS ONLY · **NO IMPLEMENT** do Owner GO IMPLEMENT · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **PASS**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md) (**PASS** / **ACCEPTED**)  
> **Parent P3B DF:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md) — continuous chain **SUPERSEDED** przez ten plik  
> **Parent CLOSEOUT P3B:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md) (**CLOSED**)  
> **Baseline tip:** UI **2.66.02** / **`abe57f9a`** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B.1 DESIGN FREEZE — FROZEN

Po wall (2. klik OK):
  STOP
  clearWallPreview()
  lineStart = null
  Ghost / Live Length / Grid Count = OFF
  tool === "wall" = ON (sticky)
  nowa ściana = tylko NOWY 1. klik

OUT: JSON · schemaVersion · PDF · ZIP · Cloud · Undo · AppSettings
     SHIFT · P4 · setLineStart(end) chain

D-P3B-05 / AC-P3B-06 = SUPERSEDED (tylko continuous chain)

IMPLEMENT zakazany do: Owner GO IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P3B.1 (zamrożony · 1 zdanie)

**P3B.1** zmienia wyłącznie **post-commit UX ściany**: po utworzeniu ściany edytor wraca do **idle** (bez Ghost), narzędzie **Ściana** zostaje aktywne, kolejna ściana startuje dopiero po **nowym pierwszym kliknięciu** — **bez** zmian JSON / schema / PDF / ZIP / Cloud / Undo / AppSettings.

### 0.1 Relacja do dokumentów

| Dokument | Rola |
|----------|------|
| P3B DF / CLOSEOUT | Ghost · Live Length · rAF · ESC mid-draw · PDF OUT — **zostają** |
| P3B **D-P3B-05** / **AC-P3B-06** | continuous chain `setLineStart(end)` — **SUPERSEDED** przez P3B.1 |
| AUDIT P3B.1 | RCA + FEASIBLE · **PASS** |
| **Ten plik** | **amend continuous UX** — wygrywa konflikt continuous |

**Konflikt continuous:** **ten plik wygrywa**. Reszta P3B FROZEN bez zmian.

### 0.2 Zasady (wiązanie FROZEN)

| Zasada | FROZEN w P3B.1 |
|--------|----------------|
| **SSOT FIRST** | SSOT = JSON rysunku — **zero** zmian modelu. Preview = ephemeral React / option renderera |
| **REUSE FIRST** | **`clearWallPreview()`** · `finishLine` · `snapCoord` · Ghost path P3B |
| **ZERO DUPLICATE LOGIC** | jedna ścieżka `finishLine("wall")`; **zakaz** flagi `continuousMode` / drugiego state machine |
| **THIN SLICE** | tylko post-success wall → idle · copy hint/Guide · testy |

---

## 1. PAYROLL SAFETY GATE (P3B.1)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P3B.1

G1–G9: FEATURE thin · editor UX only
Cloud drawings / merge / DATA_KEY: ZERO
AppSettings: ZERO
Payroll / Hours-wipe / carry: OUT
Undo stack semantics: ZERO (nadal tylko WmTechnicalDrawing)
schemaVersion / PDF / ZIP: ZERO

Wynik: FEATURE continuous UX fix only
```

---

## 2. Decyzje Owner — zamrożone (1–8)

| # | Reguła | FROZEN |
|---|--------|--------|
| **1** | Po zakończeniu ściany | **STOP** (brak auto-start kolejnej) |
| **2** | Tool Wall | **pozostaje aktywny** (`tool === "wall"`) |
| **3** | Clear | **`clearWallPreview()`** po udanym wall commit |
| **4** | `lineStart` | **`null`** |
| **5** | Ghost (`previewWall`) | **znika** |
| **6** | Live Length | **znika** (brak `previewEnd` / label) |
| **7** | Grid Count | **znika** (razem z Ghost label) |
| **8** | Nowa ściana | dopiero po **NOWYM pierwszym kliknięciu** |

---

## 3. Przepływ wall (FROZEN)

```text
tool = wall (sticky przez całą sesję wall, dopóki user nie zmieni tool)

1. klik  → setLineStart(snap(p)) · start Ghost
move     → previewEnd = snap(raw) · previewWall + Live Length + Grid Count (jak P3B)
2. klik  → finishLine("wall", start, end)
         → commit wall (jak P3B · L < 1 → reject · lineStart ZOSTAJE — mid-draw)
         → gdy SUCCESS:
              clearWallPreview()     ← D-P3B1-01
              // lineStart = null · previewEnd = null · rAF cancel
              // tool NIE zmieniany
         → STOP · idle · brak Ghost do nowego 1. kliknięcia

ESC      → jeśli lineStart: clearWallPreview() (anuluj Ghost mid-draw)
           tool wall ON
tool change / drawing.id → clear jak dziś (P3B)
```

### 3.1 Tabela przed / po

| Po udanym 2. kliku | P3B (prod) | **P3B.1 FROZEN** |
|--------------------|------------|------------------|
| wall w `objects[]` | TAK | TAK |
| `setLineStart(end)` | TAK | **ZAKAZ** |
| `clearWallPreview()` | NIE (wall) | **TAK** |
| `lineStart` | `end` | **`null`** |
| Ghost / Length / Grid | ON od `end` | **OFF** |
| `tool` | `wall` | **`wall`** |
| Następna ściana | move bez Esc | **nowy 1. klik** |

### 3.2 Definicja „Continuous” w P3B.1

| | FROZEN |
|--|--------|
| **Continuous chain** (auto `lineStart=end`) | **OFF** |
| **Tool sticky** (wall pozostaje wybrany) | **ON** |
| Polyline entity | **OUT** — nadal N × `DrawingWallObject` |

---

## 4. Bez zmian (FROZEN OUT)

| Obszar | FROZEN |
|--------|--------|
| **JSON** / `objects[]` shape / wall fields | **OUT** |
| **schemaVersion** | **1** · bez bump |
| **PDF** / `generateDrawingPdf` | **OUT** (nadal bez `previewWall`) |
| **ZIP** | **OUT** |
| **Cloud** merge / `CloudLoader` / `DATA_KEY` | **OUT** |
| **Undo** | **OUT** — `DrawingUndoStack` tylko `WmTechnicalDrawing`; clear preview **nie** jest undo step |
| **AppSettings** / flaga Rysunki | **OUT** |
| Ghost mid-draw · Live Length · Grid · rAF · snap · ESC mid-draw | **bez redesignu** (tylko post-success) |
| SHIFT angles · P4 · arrow Ghost | **OUT** |

---

## 5. Implementacja (kontrakt kodu · nie robić teraz)

### 5.1 Jedyna zmiana behawioralna

W `finishLine`, branch `type === "wall"` **po udanym commit**:

| P3B | **P3B.1 FROZEN** |
|-----|------------------|
| `setLineStart(end); setPreviewEnd(null); …` | **`clearWallPreview()`** |

Arrow / dimension: już `clearWallPreview()` — **bez zmian**.

### 5.2 Copy (IN)

| Miejsce | FROZEN |
|---------|--------|
| Hint edytora (wall) | bez „Esc = koniec rysowania ścian” jako wymóg łańcucha · np. 1./2. punkt · Esc anuluje Ghost gdy aktywny |
| `GuideView` | bez „kolejne odcinki od ostatniego punktu” |

### 5.3 Reject `L < 1` (FROZEN · bez zmian vs P3B)

| | |
|--|--|
| Brak commit | TAK |
| `lineStart` | **zostaje** (mid-draw) |
| Toast | jak dziś |

---

## 6. Decyzje ID (FROZEN)

| ID | Temat | FROZEN |
|----|-------|--------|
| **D-P3B1-01** | Po udanym wall | **`clearWallPreview()`** — **nie** `setLineStart(end)` |
| **D-P3B1-02** | Tool po wall | **pozostaje `wall`** |
| **D-P3B1-03** | Następna ściana | tylko **nowy 1. klik** |
| **D-P3B1-04** | ESC | clear gdy `lineStart` (anuluj Ghost) · **nie** wymagany do końca łańcucha |
| **D-P3B1-05** | JSON / schema / PDF / ZIP / Cloud / Undo / AppSettings | **OUT** |
| **D-P3B1-06** | P3B D-P3B-05 / AC-P3B-06 | **SUPERSEDED** |
| **D-P3B1-07** | Ghost / Length / Grid mid-draw | **IN** jak P3B (do 2. klik / ESC) |
| **D-P3B1-08** | Flaga `continuousMode` / nowy SM | **OUT** (ZERO DUP) |

---

## 7. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P3B1-01** | Po 2. kliku (wall OK): wall w `objects` · `lineStart === null` · brak `previewWall` |
| **AC-P3B1-02** | `tool` nadal `wall` |
| **AC-P3B1-03** | Move bez nowego 1. kliknięcia **nie** pokazuje Ghost / Length / Grid |
| **AC-P3B1-04** | Nowy 1. klik → Ghost + Length (+ Grid) jak P3B |
| **AC-P3B1-05** | ESC podczas Ghost → clear · tool wall ON |
| **AC-P3B1-06** | `L < 1` → reject · `lineStart` zostaje |
| **AC-P3B1-07** | schemaVersion 1 · PDF/ZIP bez Ghost · Cloud / Undo API / AppSettings nietknięte |
| **AC-P3B1-08** | Regresja unit P0–P3B (poza chain) **PASS** · Guide/hint zaktualizowane |

---

## 8. Allowlist (orientacyjna · AR doprecyzuje)

| IN | Rola |
|----|------|
| `src/app/WmPrintDrawingEditor.tsx` | wall post-commit → `clearWallPreview()` · hint |
| `src/app/GuideView.tsx` | copy |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | wersja UI (IMPLEMENT) |
| `scripts/test-wm-rysunki-01-p3b1.mjs` *(opcjonalnie)* | kontrakt idle |
| `docs/architecture/WM-RYSUNKI-01-P3B1-*` | AUDIT · DF · AR · OV · PV · CLOSEOUT |

**Zakaz:** `cloud-sync.ts` · `CloudLoader` · `export-pdf.ts` · `zip-entries.ts` · `app-settings` · typy JSON · `undo.ts` API · Payroll · `render-svg.ts` *(chyba że zero diff — preferowane **bez** zmian renderera)*.

---

## 9. Ryzyka (FROZEN świadomość)

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| R1 | Przyzwyczajenie do łańcucha P3B | Guide + changelog |
| R2 | Przypadkowe `setTool("select")` | D-P3B1-02 — tool sticky |
| R3 | Scope creep snap-to-last-vertex | OUT |
| R4 | Docs P3B CLOSEOUT o continuous | CLOSEOUT P3B.1 + tip sync przy release |

---

## 10. Zgodność zasad — self-check DF

| Zasada | Werdykt |
|--------|---------|
| **SSOT FIRST** | **PASS** — JSON nietknięty; Ghost ephemeral |
| **REUSE FIRST** | **PASS** — `clearWallPreview` / `finishLine` |
| **ZERO DUPLICATE LOGIC** | **PASS** — wall post-commit = ten sam clear co arrow |
| **THIN SLICE** | **PASS** — jedna semantyka post-success |

---

## 11. NEXT

```text
STATUS: DESIGN FREEZE · FROZEN
AR: PASS WITH MINOR RECOMMENDATIONS

STOP
Czekać na OWNER GO IMPLEMENT
  → allowlist AR §8 · AC-P3B1-01…08 · MR-P3B1-01…05

COMMIT / PUSH: NIE do osobnego Owner GO
```

---

*DESIGN FREEZE · FROZEN · AR COMPLETE · 2026-08-04 · bez implementacji · bez commit/push.*
