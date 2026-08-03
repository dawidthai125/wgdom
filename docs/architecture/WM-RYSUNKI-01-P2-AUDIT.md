# WM-RYSUNKI-01 P2 — PDF EXPORT AUDIT

> **ID:** WM-RYSUNKI-01-P2-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P2 — PDF EXPORT**  
> **FAZA:** **AUDIT ONLY** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** · P0+P1+P1B **CLOSED** · tip **2.65.98** / **`ad69bcb5`**  
> **Parents:** EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) §9 · [`WM-RYSUNKI-01-P1B-CLOSEOUT.md`](./WM-RYSUNKI-01-P1B-CLOSEOUT.md) · P1 [`WM-RYSUNKI-01-P1-CLOSEOUT.md`](./WM-RYSUNKI-01-P1-CLOSEOUT.md)  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P2 PDF EXPORT — AUDIT

Cel:      PDF z aktualnego rysunku (JSON→SVG→raster→PDF)
Status:   AUDIT COMPLETE
Werdykt:  READY FOR DESIGN FREEZE
IMPLEMENT: NIE (do Owner GO DESIGN FREEZE)
════════════════════════════════════════════════════════
```

---

## 0. Problem biznesowy (1 zdanie)

Po P0–P1B użytkownik może szkicować i zapisywać rysunek w chmurze, ale **nie ma oficjalnego PDF** do podglądu / pobrania / przekazania — potrzebny cienki eksport z istniejącego toru SVG, bez nowego edytora i bez zmiany modelu.

---

## 1. Stan obecny (AS-IS)

### 1.1 Pipeline rysunków

```text
WmTechnicalDrawing (JSON KV)
        │
        ▼
renderDrawingSvg(drawing, { showGrid? })   ← SSOT wizualny
        │
        ▼
<svg viewBox="0 0 W H"> … wall/text/symbols … </svg>
        │
        ▼
WmPrintDrawingEditor (dangerouslySetInnerHTML / preview)
```

| Warstwa | Plik / fakt |
|---------|-------------|
| Model | `src/lib/wm-technical-drawings/types.ts` — `page.format` A4\|A3 · `orientation` · `width`/`height` px · `status` draft\|final |
| Rozmiary | `DRAWING_PAGE_SIZE_PX` — A4 842×595 / 595×842 · A3 1191×842 / 842×1191 (**już w modelu**) |
| Render | `render-svg.ts` · `DRAWING_RENDER_VERSION = 2` · `showGrid` opcjonalny (edytor ON, PDF → **OFF**) |
| UI | `WmPrintDrawingsPanel` + `WmPrintDrawingEditor` · zakładka **Rysunki** w `WmPrintView` |
| Gate | `AppSettings.wmRysunkiEnabled` (P1B) · default OFF |
| KV | `kw-wm-technical-drawings` — **bez** cache PDF |
| PDF dziś | **brak** generatora rysunków |

### 1.2 Zakaz Ownera (wiązanie AUDIT)

| Zakaz | Interpretacja |
|-------|----------------|
| Nie projektować nowego edytora | tylko CTA + generator |
| Nie zmieniać modelu JSON | brak nowych pól obowiązkowych · brak schema bump |
| Nie zmieniać SVG | `renderDrawingSvg` pozostaje SSOT · PDF **konsumuje** string SVG |

---

## 2. Odpowiedzi na pytania Ownera (1–10)

### 2.1 Obecny pipeline JSON → SVG

**Potwierdzony.** Jedyna ścieżka wizualna = `renderDrawingSvg`. Edytor nie ma osobnego canvas-draw API. Symbole P1 już wchodzą przez ten sam render.

### 2.2 Najprostszy sposób SVG → Raster → PDF

**Rekomendacja: Pipeline B** (zgodny z EPIC DF §9.1 / D3):

```text
renderDrawingSvg(model, { showGrid: false })
        │
        ▼
PNG @2× (canvas DOM · wzorzec Schematy)
        │
        ▼
pdf-lib: 1 page · size = page.width × page.height (pt ≈ px)
        │
        ▼
embedPng + nagłówek (title/address/date) + watermark draft
```

| Alternatywa | Werdykt |
|-------------|---------|
| A — SVG wektor w PDF (pdf-lib/svg path) | **OUT P2** · P2.1 tylko jeśli OV jakości FAIL (EPIC D3) |
| C — html2canvas całego edytora | **NIE** — łapie UI chrome / grid · ZERO SSOT |
| D — print CSS `window.print()` na SVG | **NIE** jako tor główny — rozjazd vs PDF |

### 2.3 Reuse — pdf-lib · fonty · druk WM · WmPrint

| Komponent | Status | Reuse P2 |
|-----------|--------|----------|
| **`pdf-lib` + `@pdf-lib/fontkit`** | prod (ZI · Schematy · inne) | **TAK** |
| **`loadWmPrintZiPdfFontBytes`** (`wm-print-pdf-fonts`) | Noto dla PL | **TAK** (nagłówek/stopka) |
| **`electrical-schematics/export-pdf.ts`** | SVG→PNG@2×→PDF A4 landscape | **wzorzec 1:1** · **nie** importować typów schematów |
| **`svg-raster.ts` (Schematy)** | canvas + Playwright + watermark | **wzorzec** · thin wrapper w `wm-technical-drawings/` **lub** extract shared helper (decyzja DF/AR) |
| **`file-saver` `saveAs`** | Schematy panel | **TAK** |
| **WmPrint Odbiory** (`generate-pdf*.ts`, szablony ZI) | PDF forms / static templates | **NIE mieszać** — inny produkt |
| **ZIP Odbiory** | `generate-zip.ts` | **OUT P2** → P3 |

**Wniosek REUSE FIRST:** skopiować **kontrakt** Schematów (`generateSchematicPdf`), nie tor ZI LiveCycle.

### 2.4 A4 · A3 · portrait · landscape

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy P2 ma obsługiwać wszystkie? | **TAK** — rozmiar strony PDF = `drawing.page.width` × `drawing.page.height` (już w JSON) |
| Czy zmieniać model? | **NIE** — wybór formatu już jest w P0/P1 |
| Czy UI wyboru formatu w P2? | **NIE wymagane** — eksport czyta bieżący `page` |
| A3 mobile | akceptowalne ryzyko jakości (EPIC R-NEW) · desktop priorytet |

### 2.5 Preview vs Download vs oba

| Opcja | Werdykt |
|-------|---------|
| Tylko Download | możliwe thin, ale gorszy UX odbiorczy |
| Tylko Preview | nie zamyka „daj plik do maila” |
| **Oba (rekomendacja)** | zgodne z EPIC §9.2–9.3 · Preview = blob URL / modal · Download = `saveAs` · **ten sam** `generateDrawingPdf` |

**Thin UI minimum:**  
1) **„Pobierz PDF”** (MUST)  
2) **„Podgląd PDF”** (SHOULD — ten sam generator; modal lub nowa karta)  
3) **„Drukuj”** (SHOULD — ten sam PDF → print dialog; EPIC §9.4; tani jeśli Preview jest)

### 2.6 Synchronizacja z Print View (Odbiory)

| Interpretacja | Rekomendacja P2 |
|---------------|-----------------|
| Rysunki żyją w module WmPrint (już) | **TAK** — CTA w edytorze / liście Rysunki |
| PDF bytes sync do KV / cloud | **NIE** — on-demand only (EPIC §9.1) |
| Wpięcie do paczki Odbiory / „Drukuj komplet” | **NIE P2** → **P3 ZIP** |
| Osobny layout print CSS w Odbiory | **ZAKAZ** |

**Werdykt:** P2 = eksport lokalny w zakładce Rysunki. **Bez** synchronizacji pliku z torami Odbiory/ZI.

### 2.7 Przycisk „Pobierz PDF” bez przebudowy UI

| Miejsce | Rekomendacja |
|---------|--------------|
| **Editor toolbar** (`WmPrintDrawingEditor`) — obok Final / Undo | **MUST** — kontekst „aktualny rysunek” |
| **Lista** (`WmPrintDrawingsPanel`) — akcja na karcie | **SHOULD** — bez otwierania edytora |
| Przebudowa layoutu / nowe zakładki | **ZAKAZ** |
| Wzorzec UX | `WmPrintSchematicsPanel` — busy + toast + confirm przy draft |

### 2.8 SSOT (SVG jedynym źródłem wizualnym)

```text
JSON model  = SSOT danych
renderDrawingSvg = SSOT obrazu
PDF         = derivat (PNG z SVG + pdf-lib chrome)
```

| Reguła | |
|--------|--|
| Grid edytora | **nie** na PDF (`showGrid: false`) |
| Zakaz | rysowanie ścieżek na PDF poza SVG |
| Zakaz | zmiana `render-svg.ts` pod PDF (chyba że bug regresji) |
| Draft watermark | na **rasterze** (jak Schematy), nie w SVG modelu |

### 2.9 Jednostronicowy PDF bez zmian modelu

**TAK — w 100%.**  
1 rysunek = 1 strona · rozmiar z `page` · bez paginacji · bez nowego pola `pdfPages`.

Pusty rysunek: ostrzeżenie UX dozwolone; **nie** blokuje save (EPIC).

### 2.10 Wpływ na Cloud · Payroll · ZIP · Punkty

| Obszar | Wpływ P2 |
|--------|----------|
| **Cloud / KV drawings** | **brak** zapisu PDF · model nietknięty |
| **Cloud audit** | opcjonalnie append `kw-wm-druk-audit-log` (REUSE istniejącego KV) |
| **Payroll** | **ZERO** |
| **ZIP Odbiory** | **OUT** (P3) |
| **Punkty pomiarowe** | **OUT** (P4) — typy w modelu mogą istnieć, render P2 ich nie wymaga |
| **Schematy / EM** | regresja smoke — bez zmian API |
| **AppSettings gate** | bez zmian — PDF tylko gdy zakładka widoczna |

---

## 3. Rekomendowana architektura (TO-BE)

### 3.1 Moduły (thin)

| Element | Propozycja |
|---------|------------|
| Generator | `src/lib/wm-technical-drawings/export-pdf.ts` |
| Raster | `src/lib/wm-technical-drawings/svg-raster.ts` (thin, wzorzec Schematy) **lub** shared util po MR AR |
| Filename | helper `drawingPdfFileName(...)` · wzór EPIC §8.2 · REUSE `catalogAddressSlug` |
| UI wire | `WmPrintDrawingEditor` + opcjonalnie lista w `WmPrintDrawingsPanel` |
| Audit | `module: "drawings"` · akcja **`drawing_pdf_exported`** (additive enum) **lub** REUSE `pdf_exported` + label PL „Eksport PDF rysunku” — **decyzja DF** |

### 3.2 Kontrakt generatora (szkic)

```ts
generateDrawingPdf(drawing: WmTechnicalDrawing, opts?: {
  rasterize?: DrawingSvgRasterizer;
}): Promise<{ bytes: Uint8Array; fileName: string; svg: string }>
```

1. `svg = renderDrawingSvg(drawing, { showGrid: false })`  
2. PNG @2× z `drawing.page.width/height`  
3. watermark jeśli `status === "draft"`  
4. `PDFDocument.create()` · page `[width, height]` · font Noto · header · `embedPng` fit  
5. return bytes + `RYSUNEK_{slug}_{title}_{date}.pdf`

### 3.3 Drukuj (opcjonalnie w tym samym slice)

```text
bytes = generateDrawingPdf(...)
blob URL → iframe / window.open → print()
```

Jeden generator = EPIC AC-P2-03.

---

## 4. Thin Slice P2

### IN

- `generateDrawingPdf` (pipeline B)  
- „Pobierz PDF” w edytorze (+ confirm draft)  
- Podgląd PDF (blob) — **rekomendowane IN**  
- Drukuj — **rekomendowane IN** jeśli ≤ mały UX wrapper  
- A4/A3 portrait/landscape z istniejącego `page`  
- Watermark draft · nazwa pliku §8.2  
- Testy unit/smoke (filename · page size · draft/final · grid absent)  
- Audit export (additive)  
- Guide + changelog bump  

### OUT

- ZIP / `includeDrawings` / folder `Rysunki/` (**P3**)  
- Punkty pomiarowe / electrical (**P4**)  
- PDF wektor (P2.1)  
- Zmiana JSON schema / `renderDrawingSvg` API (poza bugfix)  
- Cache PDF w KV · sync PDF do cloud  
- Nowy edytor / CAD / npm nowe (html2canvas, jspdf, …)  
- Integracja z ZI / szablonami Odbiory  
- Payroll · CloudLoader · Bid Guard WIP  
- Default ON AppSettings  

---

## 5. Acceptance Criteria (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P2-01** | Podgląd PDF = 1 strona · wizualnie zgodny z modelem (bez siatki edytora) |
| **AC-P2-02** | „Pobierz PDF” → plik · nazwa zgodna z EPIC §8.2 |
| **AC-P2-03** | „Drukuj” (jeśli IN) używa **tego samego** generatora co Pobierz |
| **AC-P2-04** | Draft → watermark „WERSJA ROBOCZA”; Final → bez |
| **AC-P2-05** | A4 i A3 × portrait/landscape → rozmiar strony PDF = `page.width×height` |
| **AC-P2-06** | Audit eksportu (drawings) po udanym pobraniu |
| **AC-P2-07** | Brak zapisu PDF do KV · model JSON bez zmian schema |
| **AC-P2-08** | Brak regresji P0/P1 testów · Schematy PDF smoke nadal PASS |
| **AC-P2-09** | Gate AppSettings: bez zakładki = brak UI eksportu (oczekiwane) |

---

## 6. Zgodność z zasadami

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | JSON + `renderDrawingSvg`; PDF = derivat |
| **REUSE FIRST** | **PASS** | pdf-lib · fontkit · Noto · wzorzec Schematy · saveAs · WmPrint shell |
| **ZERO DUPLICATE LOGIC** | **PASS*** | jeden generator; \*raster może być thin-dup vs Schematy — AR może kazać extract |
| **THIN SLICE** | **PASS** | tylko eksport UI+lib; OUT ZIP/punkty/model/SVG rewrite |

---

## 7. Ryzyka

| ID | Ryzyko | Severity | Mitygacja |
|----|--------|----------|-----------|
| **R1** | Jakość raster (cienkie linie / tekst) na A3 | MED | @2× · OV print; wektor = P2.1 tylko po FAIL |
| **R2** | Canvas CORS / SVG blob w Safari | LOW–MED | ten sam tor co Schematy (już prod) |
| **R3** | Duży rysunek (>300 obiektów) → wolny PDF | LOW | soft warn już w edytorze · spinner |
| **R4** | Duplikacja kodu raster Schematy vs Rysunki | LOW | MR AR: extract shared **opcjonalnie** |
| **R5** | Audit Hub label dla `pdf_exported` vs drawings | LOW | osobna akcja `drawing_pdf_exported` **lub** update label |
| **R6** | Scope creep: ZIP „przy okazji” | HIGH | **twardy OUT** P3 |
| **R7** | Zmiana `render-svg` „żeby ładniej na PDF” | MED | zakaz w DF · tylko konsumpcja |
| **R8** | Payroll / WIP bag w commit | HIGH | allowlist · **nie** `git add -A` |

**Protected Core:** **GREEN** — brak Payroll / sync merge drawings.

---

## 8. Test plan (AUDIT → DF)

| Warstwa | Zakres |
|---------|--------|
| Unit | filename · page size A4/A3 · draft watermark flag · `showGrid` false w SVG export path |
| Smoke | generate bytes · `inspect` pageCount=1 · width/height |
| Regresja | `test-wm-rysunki-01-p0/p1/p1b` · schematic PDF smoke |
| UI (OV) | Pobierz · Podgląd · (Drukuj) · draft confirm |

---

## 9. Decyzje do zamrożenia w DESIGN FREEZE (Owner)

| # | Temat | Rekomendacja AUDIT |
|---|-------|-------------------|
| **D-P2-01** | Pipeline | **B** SVG→PNG@2×→pdf-lib (EPIC D3) |
| **D-P2-02** | Preview + Download | **oba** |
| **D-P2-03** | Drukuj | **IN** P2 (ten sam generator) |
| **D-P2-04** | Formaty | wszystkie z `page` · bez UI format w P2 |
| **D-P2-05** | Sync Print/Odbiory/ZIP | **OUT** → P3 |
| **D-P2-06** | Model / SVG | **bez zmian** (konsumpcja only) |
| **D-P2-07** | Audit action | prefer **`drawing_pdf_exported`** additive |
| **D-P2-08** | Raster shared extract | **opcjonalny MR** — nie blokuje DF |
| **D-P2-09** | Nowe npm | **ZAKAZ** |

---

## 10. Mapowanie do EPIC DF

| EPIC | P2 AUDIT |
|------|----------|
| §9.1 Generator B | **potwierdzony** jako AS-IS feasible |
| §9.2 Podgląd | **IN** rekomendowane |
| §9.3 Pobierz | **IN** MUST |
| §9.4 Drukuj | **IN** rekomendowane |
| §10 ZIP | **OUT** → P3 |
| AC-P2-01…06 (EPIC §13.4) | **przeniesione** + AC-P2-07…09 thin |

**Uwaga:** EPIC DF już zamrażał PDF na poziomie epiku; ten AUDIT = **slice freeze input** (thin IN/OUT + decyzje UI), nie re-open epiku.

---

## 11. Werdykt

```text
════════════════════════════════════════════════════════
WERDYKT: READY FOR DESIGN FREEZE

Uzasadnienie:
 · tor Schematy udowadnia pipeline B na prod
 · model page A4/A3 już istnieje — 1-page PDF bez schema bump
 · SSOT renderDrawingSvg gotowy (grid off)
 · brak blokerów architektury / Protected Core
 · RCA NIE wymagane

NEXT: Owner GO DESIGN FREEZE
  → docs/architecture/WM-RYSUNKI-01-P2-DESIGN-FREEZE.md

IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE
P3 ZIP / P4 punkty: NIE
════════════════════════════════════════════════════════
```

| Opcja | Status |
|-------|--------|
| **READY FOR DESIGN FREEZE** | **TAK** |
| **RCA REQUIRED** | **NIE** |

---

## 12. STOP

**AUDIT COMPLETE.**  
Czekaj na **OWNER GO DESIGN FREEZE**.
