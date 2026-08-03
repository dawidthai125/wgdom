# WM-RYSUNKI-01 P2 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P2-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P2 — PDF EXPORT**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **ACCEPTED**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P2-AUDIT.md`](./WM-RYSUNKI-01-P2-AUDIT.md) (**READY FOR DESIGN FREEZE**)  
> **AR:** [`WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **Parent EPIC DF:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md)  
> **P1B CLOSED:** [`WM-RYSUNKI-01-P1B-CLOSEOUT.md`](./WM-RYSUNKI-01-P1B-CLOSEOUT.md) · tip **2.65.98** / **`ad69bcb5`**  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P2 DESIGN FREEZE — FROZEN

Pipeline: JSON → renderDrawingSvg → PNG@2× → pdf-lib → PDF
SSOT wizualny: renderDrawingSvg() ONLY
Formaty: A4/A3 × portrait/landscape (z model.page)
UI: Podgląd PDF · Pobierz PDF · Drukuj (ten sam PDF)
Chrome PDF: nazwa roboty + data · body = cały SVG
OUT: ZIP · CAD · DXF · punkty · podpis · watermark
Deterministyczny layout · skalowanie = cały SVG (uniform)
Model JSON / SVG API: BEZ ZMIAN

IMPLEMENT zakazany do: Owner GO IMPLEMENT (po AR)
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P2 (zamrożony · 1 zdanie)

**P2** dodaje jednostronicowy eksport PDF aktualnego rysunku (podgląd / pobranie / druk) z istniejącego toru `renderDrawingSvg` — **bez** nowego edytora, **bez** zmiany modelu JSON, **bez** ZIP/CAD/punktów.

### 0.1 Relacja do EPIC / AUDIT

| Dokument | Rola |
|----------|------|
| EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) | mapa P0–P4 · §9 PDF (bazowy) |
| AUDIT P2 | architektura + thin · **ACCEPTED** |
| **Ten plik** | **amend slice P2** — decyzje Owner GO DF |

**Konflikt:** **ten plik wygrywa** dla P2.  
Szczególnie vs EPIC §9 / AUDIT: **watermark = OUT** (§2 #7) · chrome PDF = **nazwa roboty + data** (nie wymóg address/title na stronie).

---

## 1. PAYROLL SAFETY GATE (P2)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P2

G1–G9: FEATURE thin
Cloud drawings: ZERO zmiany modelu / merge
Cloud: opcjonalnie REUSE kw-wm-druk-audit-log (additive action)
Payroll / Hours-wipe / carry = OUT
Edge payroll = OUT
Owner GO CORE: NIE

Wynik: FEATURE PDF export only
```

---

## 2. Decyzje FROZEN (Owner GO)

| # | Temat | Decyzja FROZEN |
|---|-------|----------------|
| **1** | Pipeline | **JSON → `renderDrawingSvg()` → PNG @2× → `pdf-lib` → PDF** |
| **2** | SSOT wizualny | **`renderDrawingSvg()`** jest **jedynym** źródłem obrazu |
| **3** | Formaty | **A4 · A3 · Portrait · Landscape** (z `drawing.page`) |
| **4** | UI | **Podgląd PDF** · **Pobierz PDF** · **Drukuj** |
| **5** | Drukuj | **ten sam** PDF co Podgląd / Pobierz |
| **6** | Zawartość eksportu | **rysunek** + **nazwa roboty** + **data** |
| **7** | OUT | **ZIP · CAD · DXF · punkty · podpis · watermark** |
| **8** | Determinizm | PDF **deterministyczny** (layout / treść — §9) |
| **9** | Skalowanie | **cały SVG** uniform · **bez** skalowania pojedynczych symboli |

---

## 3. Pipeline (FROZEN)

```text
WmTechnicalDrawing (JSON · KV)
        │
        ▼
renderDrawingSvg(drawing, { showGrid: false })   ← SSOT
        │
        ▼
PNG @2× (canvas · raster całego SVG)
        │
        ▼
pdf-lib + fontkit + wm-print-pdf-fonts (Noto)
        │
        ▼
1 page PDF (size = page.width × page.height pt≈px)
```

| Reguła | FROZEN |
|--------|--------|
| Lib PDF | **`pdf-lib`** · **`@pdf-lib/fontkit`** |
| Font nagłówka | **`loadWmPrintZiPdfFontBytes`** (REUSE WM) |
| Nowy npm (jspdf / html2canvas / svg2pdf …) | **ZAKAZ** |
| Pipeline wektor SVG→PDF paths | **OUT P2** (ew. P2.1 tylko po OV FAIL — poza tym DF) |
| html2canvas edytora | **ZAKAZ** |
| Osobny CSS print layout | **ZAKAZ** |

### 3.1 Kontrakt generatora (FROZEN nazwa)

```text
generateDrawingPdf(drawing, opts?) → { bytes, fileName, svg }
```

| Wejście | `WmTechnicalDrawing` (+ opcjonalnie resolver nazwy roboty z `jobs[]`) |
| Rasterizer | wstrzykiwalny (testy) · domyślnie browser canvas |
| Strony | **dokładnie 1** |
| Cache bytes w KV | **OUT** |

---

## 4. SSOT (FROZEN)

| Warstwa | SSOT | Derivaty |
|---------|------|----------|
| Dane | JSON `WmTechnicalDrawing` | — |
| Obraz | **`renderDrawingSvg()`** | PNG · PDF |
| PDF | — | **tylko** derivat z SVG |

| Zakaz | |
|-------|--|
| Drugi renderer „pod PDF” | **ZAKAZ** |
| Zmiana API / semantyki `renderDrawingSvg` pod eksport | **ZAKAZ** (bugfix regresji = osobny brief) |
| Zmiana modelu JSON / `schemaVersion` bump | **ZAKAZ** |
| Siatka edytora na PDF | **ZAKAZ** — zawsze `showGrid: false` |
| Watermark w SVG lub na rasterze | **ZAKAZ** (OUT §2 #7) |
| Skalowanie / mutacja symboli w torze PDF | **ZAKAZ** |

---

## 5. Formaty strony (FROZEN)

Źródło: istniejące `drawing.page` + `DRAWING_PAGE_SIZE_PX` (P0).

| Format | Orientation | width×height (px ≈ PDF pt) |
|--------|-------------|----------------------------|
| A4 | landscape | 842 × 595 |
| A4 | portrait | 595 × 842 |
| A3 | landscape | 1191 × 842 |
| A3 | portrait | 842 × 1191 |

| Reguła | FROZEN |
|--------|--------|
| Rozmiar strony PDF | **`[page.width, page.height]`** |
| UI zmiany formatu w P2 | **NIE** — eksport czyta bieżący `page` |
| Obsługa wszystkich 4 kombinacji | **TAK** (AC) |

---

## 6. UI (FROZEN)

| Akcja | Zachowanie |
|-------|------------|
| **Podgląd PDF** | on-demand `generateDrawingPdf` → blob URL (modal / nowa karta) · spinner |
| **Pobierz PDF** | ten sam generator → `saveAs` · nazwa §8 |
| **Drukuj** | ten sam `bytes` → print dialog (`iframe` / `window.open` + `print`) |

| Reguła | FROZEN |
|--------|--------|
| Miejsce MUST | toolbar **`WmPrintDrawingEditor`** (aktualny rysunek) |
| Miejsce SHOULD | akcja na karcie listy **`WmPrintDrawingsPanel`** |
| Przebudowa layoutu / nowe zakładki | **ZAKAZ** |
| Wzorzec UX | Schematy: busy · toast · bez przebudowy shell |
| Gate | tylko gdy zakładka Rysunki widoczna (AppSettings P1B) |

**Jeden generator** dla trzech akcji = **ZERO DUP** toru wizualnego.

---

## 7. Zawartość PDF (FROZEN)

### 7.1 Body

- Raster **całego** SVG z `renderDrawingSvg(..., { showGrid: false })`.
- Skalowanie: **jedna** transformacja fit całego obrazu w obszar body (§10).
- **Bez** per-symbol scale / re-layout.

### 7.2 Chrome (nagłówek / meta na stronie)

| Element | Źródło | Wymagany |
|---------|--------|----------|
| **Nazwa roboty** | resolved z `jobId` → job display name / numer · fallback gdy brak: `"Robota"` / `"Bez roboty"` (AR doprecyzuje string) | **TAK** |
| **Data** | `drawing.documentDate` (`YYYY-MM-DD`) | **TAK** |
| Tytuł rysunku (`title`) | **nie** obowiązkowy na stronie (może być w **nazwie pliku**) | NIE MUST |
| Adres | **nie** MUST na stronie P2 | NIE MUST |

### 7.3 OUT zawartości (FROZEN)

| Element | Status |
|---------|--------|
| Watermark „WERSJA ROBOCZA” / inny | **OUT** |
| Podpis / pieczęć / QR | **OUT** |
| Multi-page | **OUT** |
| Grid edytora | **OUT** |
| UI chrome edytora | **OUT** |

---

## 8. Nazwa pliku (FROZEN)

Wzór (EPIC §8.2, bez zmiany kontraktu):

```text
RYSUNEK_{ADDRESS_OR_JOB_SLUG}_{TITLE_SLUG}_{YYYY-MM-DD}.pdf
```

| Segment | Reguła |
|---------|--------|
| `ADDRESS_OR_JOB_SLUG` | slug adresu **lub** nazwy/numeru roboty · else `robota` |
| `TITLE_SLUG` | slug z `drawing.title` (max 40) |
| `YYYY-MM-DD` | `documentDate` |
| Helper slug | REUSE `catalogAddressSlug` / istniejące fold ASCII |

---

## 9. Determinizm (FROZEN)

| Wymaganie | FROZEN |
|-----------|--------|
| Ten sam model (+ ta sama nazwa roboty resolved) | → **ten sam** layout strony · rozmiar · treść wizualna · teksty chrome |
| Brak watermark / losowych ID na canvas | **TAK** |
| Brak zapisu czasu „teraz” w treści strony | **TAK** — data = `documentDate` |
| Metadata PDF (`CreationDate` / `ModDate`) | AR: ustawić z `documentDate` **lub** zaakceptować różnice metadanych przy **identycznej** treści wizualnej — prefer **stabilne** metadata |
| Test | smoke: pageCount=1 · width/height · brak stringu watermark · chrome zawiera datę |

---

## 10. Skalowanie (FROZEN)

```text
1. Raster SVG w natywnych page.width × page.height @2×
2. Embed PNG na stronie PDF
3. Fit: jedna skala s = min(availW/W, availH/H) dla CAŁEGO obrazu
4. Centrowanie w obszarze body (pod chrome nagłówka)
```

| Zakaz | |
|-------|--|
| Skalowanie drzwi/okien/tekstu osobno | **ZAKAZ** |
| „Inteligentne” crop / auto-zoom do content bbox | **OUT P2** (cała strona arkusza) |
| Zmiana `objects[]` przy eksporcie | **ZAKAZ** |

Gdy margins na chrome są małe: typowo `s ≈ 1` (1 PDF-pt ≈ 1 px logiczny arkusza).

---

## 11. OUT (FROZEN) — pełna lista

| Temat | Status |
|-------|--------|
| **ZIP** / `includeDrawings` / folder `Rysunki/` | **OUT** → P3 |
| **CAD / DXF / DWG** | **OUT** |
| **Punkty** pomiarowe / electrical edit | **OUT** → P4 |
| **Podpis** / akceptacja / pieczęć | **OUT** |
| **Watermark** | **OUT** |
| PDF wektor | **OUT** P2 |
| Nowy edytor | **OUT** |
| Zmiana JSON / SVG SSOT | **OUT** |
| Cache PDF w cloud | **OUT** |
| Integracja ZI / szablony Odbiory print pack | **OUT** |
| Payroll / CloudLoader / Bid Guard WIP | **OUT** |
| Nowe npm rysunkowe / PDF | **OUT** |
| Default ON AppSettings | **OUT** (bez zmian P1B) |

---

## 12. Audit (FROZEN kierunek)

| Element | FROZEN |
|---------|--------|
| KV | REUSE `kw-wm-druk-audit-log` |
| Module | `"drawings"` (już w typach) |
| Action | **`drawing_pdf_exported`** (additive) — preferowane |
| Moment | po **udanym** Pobierz (MUST) · opcjonalnie Drukuj = `drawing_printed` **OUT** jeśli trudne — AR |
| Audit Hub adapter | additive label · bez nowego źródła feedu |

---

## 13. Thin Slice — IN / OUT

### IN

- `export-pdf.ts` + thin `svg-raster.ts` (wzorzec Schematy)  
- UI: Podgląd · Pobierz · Drukuj  
- Formaty z `page`  
- Chrome: nazwa roboty + data  
- Filename §8  
- Testy + Guide + changelog  
- Audit `drawing_pdf_exported`  

### OUT

- lista §11  

---

## 14. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P2-01** | Podgląd PDF = **1 strona** · treść = SVG modelu **bez** siatki |
| **AC-P2-02** | Pobierz PDF · nazwa §8 · `saveAs` |
| **AC-P2-03** | Drukuj używa **tych samych** `bytes` / generatora co Pobierz |
| **AC-P2-04** | Strona PDF zawiera **nazwę roboty** + **datę** (`documentDate`) |
| **AC-P2-05** | A4/A3 × portrait/landscape → `page.width×height` |
| **AC-P2-06** | Brak watermark · brak podpisu · brak ZIP w torze P2 |
| **AC-P2-07** | Skala = **uniform** całego SVG · symbole nie skalowane osobno |
| **AC-P2-08** | Model JSON / `renderDrawingSvg` API **bez** zmian schema |
| **AC-P2-09** | Audit `drawing_pdf_exported` po udanym pobraniu |
| **AC-P2-10** | Regresja P0/P1/P1B + Schematy PDF smoke **PASS** |
| **AC-P2-11** | Determinizm layoutu: ten sam input → ten sam rozmiar/treść wizualna (smoke) |

---

## 15. Zgodność z zasadami

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | `renderDrawingSvg` jedyny obraz · JSON nietknięty |
| **REUSE FIRST** | **PASS** | pdf-lib · fontkit · Noto · wzorzec Schematy · saveAs · WmPrint UI |
| **ZERO DUPLICATE LOGIC** | **PASS** | jeden `generateDrawingPdf` dla 3 akcji UI |
| **THIN SLICE** | **PASS** | tylko eksport · OUT ZIP/CAD/punkty/watermark/podpis |

\*Raster thin-dup vs Schematy: dopuszczalny w P2; extract shared = **opcjonalny MR AR** — nie blokuje freeze.

---

## 16. Ryzyka (zamrożone akceptacje)

| ID | Ryzyko | Akceptacja P2 |
|----|--------|---------------|
| R1 | Jakość raster A3 | Accepted · P2.1 wektor tylko po OV FAIL |
| R2 | Canvas Safari | Accepted · tor Schematy prod |
| R4 | Duplikacja svg-raster | Accepted thin · optional extract |
| R6 | Scope ZIP | **Twardy OUT** |
| R-WM | Brak watermark draft | **Owner OUT** — draft i final wyglądają tak samo na PDF |

---

## 17. Test plan (FROZEN kierunek)

| Warstwa | Zakres |
|---------|--------|
| Unit | filename · 4 rozmiary stron · grid absent w SVG path · brak watermark string |
| Smoke | pageCount=1 · chrome data · job name present · inspect size |
| UI OV | Podgląd · Pobierz · Drukuj · ten sam wygląd |
| Regresja | p0/p1/p1b · schematic export |

---

## 18. Definition of Done (docs P2)

- [x] AUDIT ACCEPTED  
- [x] Decyzje Owner 1–9 zamrożone w tym pliku  
- [x] AC-P2-01…11  
- [x] SSOT / REUSE / ZERO DUP / THIN — PASS  
- [x] ARCHITECTURE REVIEW P2 — **PASS WITH MINOR RECOMMENDATIONS** → [`WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md)  
- [x] Owner GO IMPLEMENT · lokalnie (**2.65.99**)  
- [x] OWNER VERIFICATION — **PASS** → [`WM-RYSUNKI-01-P2-OWNER-VERIFICATION.md`](./WM-RYSUNKI-01-P2-OWNER-VERIFICATION.md)  
- [ ] Owner GO COMMIT · PUSH · PV · CLOSE  

---

## 19. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: Owner GO COMMIT (allowlist P2)

PUSH: NIE (do GO)
P3 ZIP / P4: NIE
```

**STOP.** Czekaj na **OWNER GO COMMIT**.
