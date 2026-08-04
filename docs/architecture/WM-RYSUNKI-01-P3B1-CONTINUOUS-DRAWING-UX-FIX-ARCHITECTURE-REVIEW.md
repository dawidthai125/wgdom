# WM-RYSUNKI-01 P3B.1 — CONTINUOUS DRAWING UX FIX · ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B.1 — CONTINUOUS DRAWING UX FIX**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** tip **2.66.02** / **`abe57f9a`** · P3B **CLOSED** · kod read-only: `WmPrintDrawingEditor.tsx` · `render-svg.ts` · `export-pdf.ts` · `zip-entries.ts` · `undo.ts`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B.1 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
Zmiana = wyłącznie UI post-commit wall
clearWallPreview → lineStart null → Ghost/Length/Grid OFF
tool wall sticky · nowa ściana = nowy 1. klik

PDF / ZIP / Cloud / Undo / AppSettings / symbole /
drzwi / okna / wymiary: BEZ wpływu kontraktu

D-P3B-05 / AC-P3B-06: SUPERSEDED (DF P3B.1)
SSOT / REUSE / ZERO DUP / THIN: PASS

Gotowy do Owner GO IMPLEMENT
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF P3B.1 ↔ AUDIT ↔ living editor / render / PDF / ZIP / undo (read-only) |
| Mutacje | **tylko** ten dokument AR (+ pointer w DF jeśli potrzeba) |
| Kryterium **FAIL** | zmiana JSON/schema · preview w PDF/ZIP · Cloud/AppSettings · undo API · setTool po wall · drugi SM continuous · touch drzwi/okna/wymiary/symbole |
| Kryterium **PASS** | brak blokerów · DF kompletny · Owner checklist 1–9 OK |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-P3B1-* do IMPLEMENT (bez amend DF) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P3B.1 jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + Owner GO? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** |
| Czy narusza P3B Ghost / PDF OUT / schema 1? | **NIE** (tylko post-success clear) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Checklist Owner (1–9)

| # | Wymaganie | Dowód architektury | Wynik |
|---|-----------|-------------------|--------|
| **1** | Tylko logika UI | Diff ograniczony do React state w `finishLine` wall + copy; brak modelu/lib export | **PASS** |
| **2** | Po wall: `clearWallPreview()` · `lineStart = null` | DF D-P3B1-01 · helper już nulluje `lineStart`/`previewEnd`/rAF | **PASS** |
| **3** | Ghost znika | `previewWall` budowane tylko gdy `lineStart && previewEnd` → po clear brak option | **PASS** |
| **4** | Live Length znika | label z `wallPreviewMetrics` tylko przy Ghost | **PASS** |
| **5** | Grid Count znika | część Ghost label — razem z clear | **PASS** |
| **6** | Tool Wall aktywny | **zakaz** `setTool(...)` po success · D-P3B1-02 | **PASS** |
| **7** | Nowa ściana = nowy 1. klik | `onPointerDown`: `if (!lineStart) setLineStart(p)` | **PASS** |
| **8** | Brak wpływu PDF/ZIP/Cloud/Undo/AppSettings/symbole/drzwi/okna/wymiary | §4 blast | **PASS** |
| **9** | SUPERSEDED D-P3B-05 / AC-P3B-06 | DF D-P3B1-06 · continuous chain OFF | **PASS** |

---

## 3. Zgodność DF ↔ AUDIT

| Temat | AUDIT | DF P3B.1 | AR |
|-------|-------|----------|-----|
| RCA = `setLineStart(end)` | §1.1 | §3.1 · D-P3B1-01 | **PASS** |
| `clearWallPreview` REUSE | §2 / §4 | §5.1 · D-P3B1-01 | **PASS** |
| Tool sticky | §2 | D-P3B1-02 · Owner #2 | **PASS** |
| Nowy 1. klik | §2 | D-P3B1-03 · Owner #8 | **PASS** |
| OUT lista | §3.2 | §4 · D-P3B1-05 | **PASS** |
| SUPERSEDE P3B continuous | §8 / D-P3B1-06 | §0.1 · D-P3B1-06 | **PASS** |
| AC-P3B1-01…08 | §10 | §7 FROZEN | **PASS** |

---

## 4. Blast radius (read-only living code)

### 4.1 UI only — **PASS**

```text
WmPrintDrawingEditor.finishLine("wall")
  SUCCESS path dziś:  setLineStart(end) + setPreviewEnd(null)   ← P3B chain
  SUCCESS path P3B.1: clearWallPreview()                      ← DF

Reject L < 1: early return · lineStart ZOSTAJE · bez clear  ← bez zmian
arrow / dimension: już clearWallPreview()                   ← bez zmian
```

| Stan UI | Skąd | Po P3B.1 success |
|---------|------|------------------|
| `lineStart` | React | `null` via clear |
| `previewEnd` | React | `null` via clear |
| `previewWall` option | derived | nie emitowane |
| Live Length / Grid | Ghost label | nie emitowane |
| `tool` | React | **nietknięty** (`wall`) |

### 4.2 PDF / ZIP — **PASS** (zero kontraktu)

| Ścieżka | Living | P3B.1 |
|---------|--------|-------|
| `generateDrawingPdf` | `renderDrawingSvg(drawing, { showGrid: false })` · **bez** `previewWall` | **OUT** allowlist |
| ZIP | reuse `generateDrawingPdf` | **OUT** |
| `render-svg.ts` | Ghost tylko gdy option | **preferowane zero diff** (DF §8) |

### 4.3 Cloud / AppSettings — **PASS**

| | |
|--|--|
| `cloud-sync` / `CloudLoader` / merge drawings | **OUT** |
| `AppSettings.wmRysunkiEnabled` | **OUT** |
| JSON wall shape / `schemaVersion` | **OUT** |

### 4.4 Undo — **PASS**

| | |
|--|--|
| `DrawingUndoStack` | operuje na `WmTechnicalDrawing` |
| `clearWallPreview` | **nie** pushuje undo · nie zmienia stack API |
| Commit wall | jak dziś (`commit(touchDrawing…)`) — **bez zmian semantyki undo** |

### 4.5 Symbole / drzwi / okna / wymiary — **PASS**

| Obszar | Wpływ P3B.1 |
|--------|-------------|
| `symbols/` · `renderSymbol` | **ZERO** |
| `door_room` / okno / stamp | **ZERO** (inne branche `onPointerDown`) |
| `dimension` (popup / 2-click) | **ZERO** (już clear; wall branch only) |
| `wall-gap` / drzwi hover | **ZERO** |

---

## 5. SUPERSEDED (P3B continuous)

| ID P3B | Treść historyczna | Status w P3B.1 |
|--------|-------------------|----------------|
| **D-P3B-05** | Continuous ON · `setLineStart(end)` · ESC kończy łańcuch | **SUPERSEDED** |
| **AC-P3B-06** | Po wall Ghost od end; ESC kończy | **SUPERSEDED** |

| Zostaje z P3B | Status |
|---------------|--------|
| Ghost mid-draw · Live Length · Grid · rAF · ESC mid-draw · PDF OUT · schema 1 | **IN** (nietknięte) |
| Tool sticky jako „wiele ścian w sesji” | **IN** (jawne D-P3B1-02) |

**Konflikt docs:** DF P3B.1 **wygrywa** wyłącznie continuous chain.

---

## 6. Zasady — self-check AR

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | JSON rysunku SSOT; preview ephemeral; PDF/ZIP bez Ghost |
| **REUSE FIRST** | **PASS** | `clearWallPreview` · `finishLine` · istniejący Ghost derive |
| **ZERO DUPLICATE LOGIC** | **PASS** | wall success = ten sam clear co arrow; **zakaz** `continuousMode` flag |
| **THIN SLICE** | **PASS** | 1 semantyka post-commit + copy + testy |

---

## 7. Minor Recommendations (IMPLEMENT)

| ID | Rekomendacja | Amend DF? |
|----|--------------|-----------|
| **MR-P3B1-01** | W branch wall SUCCESS wywołać **wyłącznie** `clearWallPreview()` — nie duplikować ręcznego `setLineStart(null)` obok | **NIE** |
| **MR-P3B1-02** | **Zakaz** `setTool(...)` / przełączenia na select po wall — tool sticky | **NIE** |
| **MR-P3B1-03** | W tym samym commit: hint edytora + `GuideView` (usuń copy łańcucha) | **NIE** |
| **MR-P3B1-04** | `setSelectedId(obj.id)` po wall — **zostawić** (jak dziś); „idle” ≠ odznaczanie ściany | **NIE** |
| **MR-P3B1-05** | Opcjonalny `test-wm-rysunki-01-p3b1.mjs` lub komentarz kontraktu w P3B testach — dokumentuje idle (T24 model 2 walls nadal OK) | **NIE** |

**Blokery:** **BRAK**.

---

## 8. Allowlist IMPLEMENT (AR)

| IN | Rola |
|----|------|
| `src/app/WmPrintDrawingEditor.tsx` | wall SUCCESS → `clearWallPreview()` · hint |
| `src/app/GuideView.tsx` | copy |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | patch UI |
| `scripts/test-wm-rysunki-01-p3b1.mjs` *(opcjonalnie)* | kontrakt |
| Docs P3B.1 (OV/PV/CLOSEOUT później) | proces |

| OUT (twarde) | |
|--------------|--|
| `render-svg.ts` | preferowane **zero diff** |
| `export-pdf.ts` · `zip-entries.ts` | **OUT** |
| `undo.ts` | **OUT** |
| `cloud-sync.ts` · `CloudLoader` · `app-settings` | **OUT** |
| `symbols/*` · gap/door/window/dimension logic | **OUT** |
| Payroll | **OUT** |

---

## 9. Decyzje AR (wiążące IMPLEMENT)

| ID | Decyzja |
|----|---------|
| **D-AR-P3B1-01** | Jedyna zmiana behawioralna: wall SUCCESS → `clearWallPreview()` |
| **D-AR-P3B1-02** | Tool `wall` nietknięty |
| **D-AR-P3B1-03** | PDF/ZIP/Cloud/Undo/AppSettings/symbole/drzwi/okna/wymiary — zero diff kontraktu |
| **D-AR-P3B1-04** | D-P3B-05 / AC-P3B-06 — traktować jako historyczne; testy/OV wg AC-P3B1-* |
| **D-AR-P3B1-05** | AC-P3B1-01…08 + MR-P3B1-01…05 obowiązkowe przed OV |

---

## 10. Ryzyka (AR)

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| R1 | Częściowy clear bez cancel rAF | MR-P3B1-01 → pełny `clearWallPreview` |
| R2 | Zmiana tool „dla porządku” | MR-P3B1-02 · D-P3B1-02 |
| R3 | Guide zostaje o łańcuchu | MR-P3B1-03 |
| R4 | Scope creep renderer | allowlist OUT `render-svg` |

---

## 11. NEXT

```text
STATUS: ARCHITECTURE REVIEW COMPLETE
WERDYKT: PASS WITH MINOR RECOMMENDATIONS

STOP
Czekać na OWNER GO IMPLEMENT
  → allowlist §8 · AC-P3B1-01…08 · MR-P3B1-01…05

COMMIT / PUSH: NIE do osobnego Owner GO
```

---

*ARCHITECTURE REVIEW · 2026-08-04 · bez implementacji · bez commit/push.*
