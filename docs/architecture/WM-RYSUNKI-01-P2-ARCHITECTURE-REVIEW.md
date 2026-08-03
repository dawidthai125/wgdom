# WM-RYSUNKI-01 P2 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P2 — PDF EXPORT**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P2-AUDIT.md`](./WM-RYSUNKI-01-P2-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P2-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P2-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** tip **2.65.98** / **`ad69bcb5`** · P0+P1+P1B **CLOSED** · kod read-only: `render-svg.ts` · `electrical-schematics/export-pdf.ts` · `svg-raster.ts` · `wm-druk-audit.ts` · `WmPrintDrawingsPanel` / `WmPrintDrawingEditor`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P2 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
DF spójny z AUDIT + Owner GO (watermark OUT respektowany)
SSOT/REUSE/ZERO DUP/THIN: PASS
Pipeline B · jeden generator · brak PdfDrawingModel · brak cache
Shared WM PDF helper: NIE w P2 (MR opcjonalny później)

Gotowy do Owner GO IMPLEMENT P2
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | P2 DF ↔ AUDIT ↔ living Schematy PDF / Rysunki render / wm-druk-audit (read-only) |
| Mutacje | **tylko** ten dokument AR (+ pointer w DF) |
| Kryterium **FAIL** | drugi renderer · `PdfDrawingModel` · cache PDF w KV · zmiana JSON/SVG SSOT · ZIP/punkty w scope · osobny tor Drukuj · payroll/CORE |
| Kryterium **PASS** | brak blokerów · DF kompletny |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-P2-* do IMPLEMENT (bez wymuszania amend DF) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P2 jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + decyzje Ownera? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR nie wymuszają amend) |
| Czy P2 narusza model / SVG SSOT? | **NIE** (konsumpcja only) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT ↔ Owner GO

| Temat | AUDIT | DF P2 | Wynik |
|-------|-------|-------|--------|
| Pipeline B SVG→PNG@2×→pdf-lib | §2.2 | §2 #1 · §3 | **PASS** |
| `renderDrawingSvg` SSOT | §2.8 | §2 #2 · §4 | **PASS** |
| A4/A3 × orientacje z `page` | §2.4 | §2 #3 · §5 | **PASS** |
| Podgląd + Pobierz + Drukuj | §2.5 | §2 #4–5 · §6 | **PASS** |
| Jeden generator | §3 | §6 · §3.1 | **PASS** |
| Chrome: nazwa roboty + data | Owner DF | §2 #6 · §7.2 | **PASS** (AUDIT miał title/address — **DF wygrywa**) |
| Watermark | AUDIT IN → **Owner OUT** | §2 #7 · §7.3 | **PASS** (DF wygrywa) |
| OUT ZIP/CAD/DXF/punkty/podpis | §4 OUT | §11 | **PASS** |
| Determinizm | § / Owner | §2 #8 · §9 | **PASS** |
| Skalowanie całego SVG | Owner | §2 #9 · §10 | **PASS** |
| Brak cache PDF | §2.6 / §3.1 | §3.1 · §11 | **PASS** |
| AC-P2-01…11 | §5 | §14 | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Zasady WGDOM

| Zasada | Werdykt | Dowód |
|--------|---------|--------|
| **SSOT FIRST** | **PASS** | JSON = dane · `renderDrawingSvg` = obraz · PDF = derivat · brak drugiego renderera · brak `PdfDrawingModel` |
| **REUSE FIRST** | **PASS** | `pdf-lib` · fontkit · `loadWmPrintZiPdfFontBytes` · wzorzec `generateSchematicPdf` · `saveAs` · `onRecordWmDrukAudit` · shell WmPrint |
| **ZERO DUPLICATE LOGIC** | **PASS** | jeden `generateDrawingPdf` dla Preview/Download/Print · \*thin raster dup vs Schematy = accepted (MR-P2-05) |
| **THIN SLICE** | **PASS** | tylko eksport UI+lib · OUT ZIP/CAD/punkty/watermark/podpis/model/SVG rewrite |

**Werdykt sekcji: PASS**

---

## 4. Checklista Ownera (10 punktów)

### 4.1 `renderDrawingSvg()` pozostaje jedynym SSOT

**PASS.**

- DF §4: zakaz drugiego renderera i mutacji API pod PDF.
- Edytor już konsumuje `renderDrawingSvg` — PDF musi wołać **tę samą** funkcję z `{ showGrid: false }`.
- Symbole P1 wchodzą wyłącznie przez istniejący tor SVG (brak osobnego „PDF symbol path”).

### 4.2 Pipeline JSON → SVG → PNG → pdf-lib → PDF

**PASS.**

- Zgodny z EPIC D3 / AUDIT B / DF §3.
- `@2×` FROZEN (jak Schematy `SCHEMATIC_PDF_RASTER_SCALE = 2`).
- Rozmiar strony = `drawing.page.width/height`.

### 4.3 Brak drugiego renderer’a

**PASS.**

- Zakaz html2canvas edytora, CSS print layout, svg2pdf wektor, jspdf.
- Raster = bitmap całego SVG stringa — **nie** re-draw obiektów.

### 4.4 Brak `PdfDrawingModel`

**PASS.**

- Brak nowego typu / schema / pola `pdf*` w JSON.
- `generateDrawingPdf(drawing, opts?)` przyjmuje istniejący `WmTechnicalDrawing`.
- **MR-P2-01:** `jobDisplayName` / `jobLabel` przekazać jako **opts** (string z UI), nie resolvować `jobs[]` wewnątrz lib export (unik cyklu App↔lib · czytelny kontrakt).

### 4.5 Preview · Download · Drukuj = jeden PDF

**PASS** (kontrakt DF).

| Akcja | Tor |
|-------|-----|
| Podgląd | `generateDrawingPdf` → blob |
| Pobierz | **ten sam** generator / te same `bytes` |
| Drukuj | **te same** `bytes` → print |

**MR-P2-02:** w UI orkiestracja: przy sekwencji Podgląd→Pobierz/Drukuj **reuse** już wygenerowanych `bytes` z tej sesji (spinner raz); przy zmianie modelu — invalidate. Nie wołać trzech niezależnych generatorów równolegle bez potrzeby.

### 4.6 Brak cache PDF

**PASS.**

- DF: cache KV **OUT**.
- Brak pola w modelu · brak `DATA_KEY` na bytes.
- On-demand only · nie sync PDF do cloud.

### 4.7 Eksport nie zmienia stanu aplikacji

**PASS** (wymóg IMPLEMENT).

| Dozwolone | Zakazane |
|-----------|----------|
| lokalny `pdfBusy` / spinner UI | mutacja `objects[]` / `page` / `status` |
| audit append (osobny KV log) | autosave rysunku „przy eksporcie” |
| toast | flip draft→final przy PDF |

Eksport = **read-only** względem `WmTechnicalDrawing` (+ side-effect audit log OK).

### 4.8 Obsługa błędów eksportu

**PASS z MR** (DF nie rozpisuje szczegółów — AR domyka).

**MR-P2-03 (IMPLEMENT):**

| Warstwa | Zachowanie |
|---------|------------|
| Lib | `DrawingPdfError` (jak `SchematicPdfError`) · fail-loud |
| Raster / canvas | catch → czytelny PL toast |
| UI | `try/finally` · `pdfBusy` · **nie** partial download |
| Pusty rysunek | **nie** blokować (EPIC) · opcjonalny soft confirm — nie MUST |
| Podgląd FAIL | zamknij spinner · bez wiszącego blob |

Wzorzec: `WmPrintSchematicsPanel` export handler.

### 4.9 Wpływ: Cloud · Payroll · ZIP · Punkty

| Obszar | Werdykt |
|--------|---------|
| **Cloud drawings** | **ZERO** zapisu PDF · model bez zmian |
| **Cloud audit** | REUSE `kw-wm-druk-audit-log` · additive `drawing_pdf_exported` |
| **Payroll** | **ZERO** |
| **ZIP** | **OUT P2** |
| **Punkty** | **OUT P2** |
| **Protected Core** | **GREEN** |

**PASS.**

### 4.10 Reuse wspólnego helpera PDF dla modułów WM

**Ocena:**

| Opcja | Werdykt P2 |
|-------|------------|
| A — wspólny `wm-print/svg-png-pdf.ts` teraz | **NIE** — scope creep · ryzyko regresji Schematy · nie thin |
| B — thin copy wzorca w `wm-technical-drawings/` | **TAK (rekomendowane P2)** |
| C — extract shared **po** P2 (osobny brief) | **BACKLOG** |

Schematy mają: stałe A4 landscape · watermark draft · walidację layoutProfile · inne viewBox.  
Rysunki: dynamiczny `page` · **bez** watermark · inny chrome (job+date).

Wspólny helper musiałby parametryzować: page size · watermark on/off · header lines · raster scale · filename — to osobny mini-framework.

**MR-P2-05:** w P2 **nie** extract shared. Po ship P2+stabilności — opcjonalny AUDIT „WM PDF raster kit” (Owner GO).  
REUSE FIRST = **wzorzec + libs** (pdf-lib/fonty), nie obowiązkowy wspólny plik w tym slice.

**Werdykt sekcji checklisty: PASS** (+ MR-P2-01…05)

---

## 5. Doprecyzowania AR (wiążące dla IMPLEMENT · bez amend DF)

| ID | Temat | Decyzja AR |
|----|-------|------------|
| **D-AR-P2-01** | Fallback nazwy roboty | brak `jobId` / job not found → **`"Bez roboty"`** |
| **D-AR-P2-02** | Nazwa roboty gdy linked | prefer numer/etykieta UI roboty (jak lista WmPrint) · ten sam string co user widzi przy wyborze joba |
| **D-AR-P2-03** | `drawing_printed` | **OUT P2** — audit tylko **`drawing_pdf_exported`** po udanym **Pobierz** |
| **D-AR-P2-04** | Metadata PDF | ustawić `CreationDate`/`ModDate` z `documentDate` (UTC noon) gdy API pdf-lib pozwala — w przeciwnym razie zaakceptować różnice metadata przy identycznej treści wizualnej (AC-P2-11 = layout/treść) |
| **D-AR-P2-05** | Margines chrome | wzorzec Schematy (header top / data bottom) · body fit uniform pod/nad chrome · stałe w kodzie export (nie w modelu) |

---

## 6. Minor Recommendations (IMPLEMENT)

| ID | Rekomendacja | Priorytet | Amend DF? |
|----|--------------|-----------|-----------|
| **MR-P2-01** | `jobLabel: string` w opts generatora (UI resolve) | MUST | NIE |
| **MR-P2-02** | Reuse `bytes` w sesji Preview→Download/Print | SHOULD | NIE |
| **MR-P2-03** | `DrawingPdfError` + toast + busy/finally | MUST | NIE |
| **MR-P2-04** | Allowlist commit: `wm-technical-drawings/export*` · editor/panel · audit enum · test · changelog/guide — **bez** Payroll/CloudLoader/ZIP | MUST | NIE |
| **MR-P2-05** | Shared WM PDF helper = **OUT P2** (backlog) | INFO | NIE |
| **MR-P2-06** | Test: inject fake rasterizer (jak Schematy) — bez Playwright w CI unit | SHOULD | NIE |

---

## 7. Pliki docelowe IMPLEMENT (orientacja · nie kod)

| Warstwa | Ścieżka (propozycja) |
|---------|----------------------|
| Generator | `src/lib/wm-technical-drawings/export-pdf.ts` |
| Raster | `src/lib/wm-technical-drawings/svg-raster.ts` |
| UI | `WmPrintDrawingEditor.tsx` · `WmPrintDrawingsPanel.tsx` |
| Audit | `wm-druk-audit.ts` (+ label PL) · ewent. adapter Hub |
| Test | `scripts/test-wm-rysunki-01-p2.mjs` |
| Docs UX | Guide · `changelog-data.ts` |

**Zakaz allowlist:** `PayrollView*` · `CloudLoader*` · `generate-zip.ts` · `render-svg.ts` (chyba bugfix) · typy schema bump.

---

## 8. Ryzyka — potwierdzenie AR

| ID | Status AR |
|----|-----------|
| R1 raster A3 | Accepted |
| R2 Safari canvas | Accepted (Schematy prod) |
| R4 thin raster dup | Accepted · MR-P2-05 |
| R6 ZIP creep | **FAIL jeśli wejdzie** — strażnik MR-P2-04 |
| R-WM brak watermark | Owner OUT — Accepted |
| Nowy: blob URL leak | MR — revoke URL po zamknięciu podglądu |

---

## 9. Test / OV (AR)

| Warstwa | Wymaganie |
|---------|-----------|
| Unit | 4 page sizes · filename · grid absent · brak watermark · jobLabel+date w chrome (mock) |
| Smoke | pageCount=1 · inspect size |
| Regresja | P0/P1/P1B · schematic PDF |
| OV UI | 3 akcje · ten sam wygląd · błąd toast · brak mutacji modelu |

---

## 10. PAYROLL / CORE

```text
Payroll Safety: PASS (OUT)
Cloud drawings merge: NIE RUSZAĆ
Edge: NIE
ZIP: NIE
Punkty: NIE
```

---

## 11. Werdykt końcowy

```text
════════════════════════════════════════════════════════
WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery IMPLEMENT: BRAK
Amend DF: NIE WYMAGANY
MR-P2-01…06: wiążące dla IMPLEMENT (thin)

NEXT: OWNER GO IMPLEMENT
════════════════════════════════════════════════════════
```

| Opcja | Status |
|-------|--------|
| **PASS** | — |
| **PASS WITH MINOR RECOMMENDATIONS** | **TAK** |
| **FAIL** | **NIE** |

---

## 12. STOP

**ARCHITECTURE REVIEW COMPLETE.**  
Czekaj na **OWNER GO IMPLEMENT**.

**Zakaz do GO:** implementacja · commit · push · P3 ZIP · P4 punkty · shared PDF framework.
