# WM-RYSUNKI-MOBILE-01 MOBILE-P1 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-MOBILE-01-P1-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P1**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH DF CORRECTIONS** *(≡ CHANGE REQUIRED → thin amend DF · zastosowany · READY)*  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`P1-AUDIT`](./WM-RYSUNKI-MOBILE-01-P1-AUDIT.md) (**PASS**) · [`P1-DESIGN-FREEZE`](./WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md) (**FROZEN** + thin amend z tego AR) · epic DF [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md)  
> **Baseline tip:** UI **2.66.04** / **`13ca099b`** · P0 **CLOSED**  
> **Kod read-only:** `WmPrintDrawingEditor.tsx` · `WmPrintDrawingsPanel.tsx` · `render-svg.ts` · `export-pdf.ts` · `zip-entries.ts` · `drawing-viewport.ts` · `wall-preview.ts` (blast)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P1 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH DF CORRECTIONS
         (thin DF amend ZASTOSOWANY · brak blokerów domenowych)

Blokery Cloud/JSON/PDF-ZIP semantics/Ghost/P3B.1: BRAK
Wiązania arch. (FROZEN):
  · mode default = "export" (fail-safe)
  · editor jawnie mode:"edit"
  · hit tylko edit · CTM REUSE clientToSvgPoint
  · zoom wrapper CSS — getScreenCTM obejmuje ancestor transform
  · export-pdf / ZIP → generateDrawingPdf bez hit

READY FOR: Owner GO IMPLEMENT MOBILE-P1
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | D-M1-01…08 ↔ kod tip 2.66.04 (P0 shell + render/export) |
| **FAIL** | Wymagana zmiana Cloud/schema/PDF-ZIP semantics/Ghost STOP |
| **CHANGE REQUIRED** | DF nie domyka fail-safe mode / CTM kontraktu |
| **PASS** | DF kompletny · zero korekt |
| **PASS WITH DF CORRECTIONS** | brak blokerów + **thin amend** (wykonany w tym AR) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy MOBILE-P1 jest wykonalne thin? | **TAK** |
| Blokery domenowe (Cloud/JSON/Ghost/PDF semantics)? | **NIE** |
| Czy `clientToSvgPoint` + CTM działa z zoom/pan P0? | **TAK** — transform na wrapperze; `getScreenCTM()` na `<svg>` |
| Czy default render musi być export-safe? | **TAK** — **FROZEN** `mode` default `"export"` |
| Czy DF wymagał korekt? | **TAK** — thin (D-M1-02 default · D-M1-08 CTM) — **zastosowane** |
| Czy wolno IMPLEMENT po Owner GO? | **TAK** |

**WERDYKT: PASS WITH DF CORRECTIONS** → po amend: **READY FOR Owner GO IMPLEMENT MOBILE-P1**

---

## 2. Checklist Owner (1–10)

| # | Temat | Werdykt | Uzasadnienie |
|---|-------|---------|--------------|
| **1** | D-M1-01…07 | **PASS** | Zakres hit/44px/toolbar/selection/prompt/create — UI + `render-svg` · allowlist thin · AUDIT residual OPEN = cel P1 |
| **2** | D-M1-08 hit @ zoom/pan | **PASS** (+ clarify) | Pointer path już: `clientToSvgPoint` → `getScreenCTM().inverse()` · zoom/pan = CSS na **wrapper div** wokół SVG (`WmPrintDrawingEditor` ~1089–1095) · CTM uwzględnia ancestor transform · hit overlays w SVG user units · inverse screen-pad **OUT P1** (thin) |
| **3** | CTM / `clientToSvgPoint` | **PASS** | REUSE existing helpers (~82–94, `findSvg` = `querySelector("svg")`) · **zakaz** nowego math path · pan używa client delta (nie SVG) — OK |
| **4** | Render mode edit / export | **PASS** (+ **DF CORRECTION**) | Dziś brak `mode` · dodać · **default `"export"`** · editor `mode:"edit"` · Ghost/`previewWall` / `highlightWallId` zostają tylko w edit path (już nie przekazywane z PDF) |
| **5** | Hit overlays tylko edit | **PASS** | Arch: `if (mode === "edit")` emit `data-hit` · export string bez atrybutu · smoke P1 |
| **6** | Brak wpływu PDF/ZIP | **PASS** | ZIP → `generateDrawingPdf` → `renderDrawingSvg(…, { showGrid: false })` · przy default export **zero** hit nawet bez jawnego `mode` w export-pdf · opcjonalny thin wire `mode:"export"` dla czytelności |
| **7** | Brak wpływu Ghost/P3B.1 | **PASS** | P1 nie rusza `finishLine` / `clearWallPreview` / `wall-preview.ts` · Ghost = `previewWall` option · niezależny od hit · regresja smoke P3B.1 |
| **8** | Brak wpływu JSON schema | **PASS** | Hit/zoom ephemeral · zero pól w `WmTechnicalDrawing` · `types`/`normalize` OUT allowlist |
| **9** | Brak wpływu Cloud | **PASS** | `cloud-sync` / merge OUT · ten sam KV write path AS-IS |
| **10** | Brak wpływu desktop (regresja) | **PASS** | ≥md: bez force portal · AC-M1-06 nowy UI prompt + P3B.1 · 44px na desktop **akceptowalne** (ten sam chrome) · nie wymaga osobnego desktop layout |

---

## 3. Architektura docelowa (wiążąca)

```text
Pointer (edit):
  surface → clientX/Y → clientToSvgPoint(svg)
    → getScreenCTM()  // includes CSS translate/scale on wrapper
    → SVG user coords → existing select/draw/drag

Render edit:
  renderDrawingSvg(drawing, { mode:"edit", showGrid, previewWall?, highlightWallId? })
    → visual + optional Ghost + data-hit overlays

Render export (PDF/ZIP):
  renderDrawingSvg(drawing, { mode:"export" | default, showGrid:false })
    → visual only · NO data-hit · NO Ghost
    → generateDrawingPdf → zip-entries (semantics UNCHANGED)
```

| Warstwa | Decyzja |
|---------|---------|
| Hit geometry | Edit-only SVG (`data-hit` / transparent stroke) |
| Hit-test | DOM hit na SVG **lub** nearest po `clientToSvgPoint` — IMPLEMENT wybór thin; CTM obowiązkowy |
| Zoom | P0 wrapper — **nie** reimplement |
| Prompt UI | Inline/thin modal w editor (FS portal P0) |
| Create menu | Lista panel — poza surface |

---

## 4. Thin DF corrections (zastosowane)

| ID | Korekta | Plik |
|----|---------|------|
| **DFC-P1-01** | **D-M1-02:** default `mode` = **`"export"`**; editor **musi** `mode:"edit"` | [`P1-DESIGN-FREEZE`](./WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md) |
| **DFC-P1-02** | **D-M1-08:** jawne REUSE CTM; hit w SVG units; inverse screen-pad **OUT P1** | ten sam |

Epic DF: D-M1-08 już wskazany; semantyka default mode — SSOT = **slice P1 DF**.

---

## 5. Ryzyka arch. (nie blokery)

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| Safari CTM + CSS transform | Edge cases rare | Device OV AC-M1-07 · fallback: re-test zoom |
| Zapomniany `mode:"edit"` w editor | Brak hit | Type/required w call site · smoke |
| Toolbar density + 44px | Overflow | D-M1-04 wrap/scroll |
| Prompt + keyboard w portal | Viewport jump | R-07 · thin modal |

---

## 6. Allowlist — potwierdzenie

Zgodne z P1 DF §6 · **bez** rozszerzeń.  
`drawing-viewport.ts` — **nie** ruszać.  
`export-pdf.ts` — opcjonalny jawny `mode:"export"` (dokumentacja), nie obowiązkowy przy default fail-safe.

---

## 7. Rekomendacja przed IMPLEMENT

```text
ARCHITECTURE REVIEW: PASS WITH DF CORRECTIONS (amend done)

REKOMENDACJA: Owner GO → IMPLEMENT MOBILE-P1

Kolejność IMPLEMENT (sugerowana):
  1. render-svg mode + hit (default export)
  2. editor mode:"edit" + OV hit@zoom
  3. prompt → inline/modal
  4. 44px chrome (+ zoom ±) + toolbar layout
  5. create menu
  6. test-wm-rysunki-mobile-p1.mjs + P3B.1 + build

ZAKAZ w IMPLEMENT:
  · schema / cloud / Ghost STOP / zip semantics
  · P2 landscape / history
  · inverse screen hit pad (chyba OV FAIL AC-M1-07)

COMMIT / PUSH: tylko po Owner GO (kolejne fazy)
```

---

## 8. NEXT

Czekaj **OWNER GO → IMPLEMENT (MOBILE-P1)**.

---

**Koniec AR MOBILE-P1 · bez implementacji / commit / push.**
