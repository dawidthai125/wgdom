# WM-RYSUNKI-01 P3A — OWNER VERIFICATION (UX POLISH)

> **ID:** WM-RYSUNKI-01-P3A-UX-POLISH-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3A — UX POLISH**  
> **FAZA:** **OWNER VERIFICATION** → **PASS**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **Wersja changelog:** **2.66.01**  
> **Data OV:** 2026-08-03  
> **Wejście:** Owner **GO OWNER VERIFICATION**  
> **IMPLEMENT:** COMPLETE · build PASS · testy P3A+P0–P3 PASS  
> **AUDIT:** [`WM-RYSUNKI-01-P3A-UX-POLISH-AUDIT.md`](./WM-RYSUNKI-01-P3A-UX-POLISH-AUDIT.md) (**ACCEPTED**)  
> **DF:** [`WM-RYSUNKI-01-P3A-UX-POLISH-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3A-UX-POLISH-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P3A-UX-POLISH-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3A-UX-POLISH-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION ARCHIVE · **NO COMMIT** · **NO PUSH** (czekaj Owner GO COMMIT)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3A — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

1 Glyph G/W/R .............. PASS
2 Door P/W ................. PASS
3 Gap render-time only ..... PASS
4 Popup „Długość” .......... PASS
5 Dimension manual label ... PASS
6 Hover tylko przy drzwiach PASS
7 PDF (SSOT SVG) ........... PASS
8 ZIP (reuse P2 PDF) ....... PASS
9 Regresja P0–P3 ........... PASS
10 AUDIT/DF/AR/MR/AC ....... PASS

P3A 40 · P3 32 · P2 28 · P1B 32 · P1 44 · P0 33
changelog 2.66.01 · schemaVersion 1 · library 3 · render 3

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
| Blokery przed COMMIT? | **NIE** (allowlist P3A gotowa) |
| Regresja P0 / P1 / P1B / P2 / P3 | **BRAK** |
| Cloud merge drawings / Payroll / P4 / schema 2? | **NIE** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna | `test-wm-rysunki-01-p3a.mjs` (40) · P3 · P2 · P1B · P1 · P0 — **re-run OV 2026-08-03** |
| Statyczna (kod) | `symbols/index.ts` · `wall-gap.ts` · `render-svg.ts` · `normalize.ts` · `WmPrintDrawingEditor.tsx` · `export-pdf.ts` · `zip-entries.ts` |
| Kontrakt | DF AC-P3A-01…13 · AR MR-P3A-01…07 · D-AR-P3A-01…05 · Owner D-P3A-16…22 |
| Negatyw | brak `wall-gap` / gap w `cloud-sync` · brak nowego PDF/ZIP buildera |

---

## 2. Punkty OV (Owner checklist 1–10)

### 1. Glyph G / W / R

| | |
|--|--|
| **Kod** | `letterStampPaths("G"|"W"|"R")` → `gas-boiler` · `vent-grid` · `distribution-board` / `board-distribution` |
| **Test** | P3A T08–T10 · T24–T26 |
| **DF** | §4.1–4.4 · D-P3A-16 · D-P3A-20 |
| **Wynik** | **PASS** |

### 2. Door P / W

| | |
|--|--|
| **Kod** | `door-room` → **P** · `door-entrance` → **W** · `type: "door"` · toolbar `Drzwi P` / `Drzwi W` · `addDoor(symbolId)` |
| **Legacy** | `door-swing` → normalize/`resolveDoorSymbolId` → `door-room` (P) |
| **Test** | T11–T15 · T27 · T35 · T38 · T40 · P1 T16b |
| **DF** | §3.3 · D-P3A-17 · MR-P3A-03 |
| **Wynik** | **PASS** |

### 3. Gap — render-time only

| | |
|--|--|
| **Kod** | `computeWallGaps` + `wallSegmentsAfterGaps` wyłącznie w `renderWallWithGaps` / `renderDrawingSvg` |
| **JSON** | 1 segment wall po umieszczeniu drzwi (T33) · brak `wallId` / split |
| **Snap** | `snapCoord` bez zmian · gap nie wołany przy snap (T22) |
| **Test** | T17–T22 · T28–T29 |
| **AR** | D-AR-P3A-01 · D-P3A-18 · MR-P3A-01 |
| **Wynik** | **PASS** |

### 4. Popup „Długość”

| | |
|--|--|
| **Kod** | `window.prompt("Długość", "")` przy wall-hit tool `dimension` |
| **Pola** | jedno pole · walidacja niepuste + zakres liczbowy 1…99999 gdy numeric |
| **Anuluj** | `null` → brak obiektu |
| **DF** | §6.1 · D-P3A-19 |
| **Wynik** | **PASS** |

### 5. Dimension — manual label

| | |
|--|--|
| **Kod** | `label` z popup kopiowany na `DrawingDimensionObject` · geometria ściany w momencie create · **bez** `wallId` |
| **Render** | MR-P3A-02: niepusty `label` wygrywa nad `dimensionAutoLabel` (T30) · puste → auto (T31) |
| **Test** | T30 · T31 · T34 |
| **Wynik** | **PASS** |

### 6. Hover — tylko przy drzwiach

| | |
|--|--|
| **Kod** | `highlightWallId: isDoorTool(tool) ? hoverWallId : null` · `data-wall-hover` tylko w preview |
| **PDF** | `generateDrawingPdf` → `showGrid: false` **bez** `highlightWallId` |
| **Test** | T39 |
| **D-P3A-22** | wizualnie only |
| **Wynik** | **PASS** |

### 7. PDF

| | |
|--|--|
| **Kod** | `generateDrawingPdf` → `renderDrawingSvg(drawing, { showGrid: false })` — ten sam SSOT (glyph + gap) |
| **Test** | P2 T05–T06 · T18–T19 · T07 bytes · regresja P2 **28 PASS** |
| **D-P3A-21 / D-AR-P3A-02** | brak drugiego renderera |
| **Wynik** | **PASS** |

### 8. ZIP

| | |
|--|--|
| **Kod** | `prepareDrawingZipFileEntries` → `generateDrawingPdf` 1× · folder `Rysunki/` · bez nowego ZIP buildera w P3A |
| **Test** | P3 **32 PASS** (T05 · T14–T17 · T19) |
| **D-AR-P3A-05** | API ZIP/PDF bez zmian kontraktu |
| **Wynik** | **PASS** |

### 9. Regresja P3 / P2 / P1B / P1 / P0

| Suite | Wynik (re-run OV) |
|-------|-------------------|
| P3A | **40 PASS** |
| P3 | **32 PASS** |
| P2 | **28 PASS** |
| P1B | **32 PASS** |
| P1 | **44 PASS** |
| P0 | **33 PASS** |

**Wynik:** **PASS** (AC-P3A-12)

### 10. Zgodność AUDIT · DF · AR · MR · AC

| Dokument | Werdykt |
|----------|---------|
| AUDIT ACCEPTED | IN pokryte · OUT (P4/CAD/Cloud/Payroll/schema 2) **respektowane** |
| DF FROZEN | §3–8 · toolbar §7 · schema 1 · library 3 · render 3 |
| AR PASS + MR | MR-P3A-01…07 **DONE** · D-AR-P3A-01…05 **PASS** |
| AC-P3A-01…13 | wszystkie **PASS** (§3) |

**Wynik:** **PASS**

---

## 3. Acceptance Criteria (szczegół)

| ID | Kryterium | Dowód | Wynik |
|----|-----------|-------|-------|
| AC-P3A-01 | Wentylacja **W** | T08/T24 · `letterStampPaths("W")` | **PASS** |
| AC-P3A-02 | Piec **G** | T09/T25 | **PASS** |
| AC-P3A-03 | Drzwi P/W · `type===door` | T11/T12/T38/T40 | **PASS** |
| AC-P3A-04 | Legacy `door-swing` → P | T15/T35 · normalize | **PASS** |
| AC-P3A-05 | Gap w SVG · PDF=SSOT | T18/T28/T29 · export-pdf | **PASS** |
| AC-P3A-06 | Brak split wall JSON | T33 | **PASS** |
| AC-P3A-07 | Popup Długość | editor `prompt("Długość")` · T30 | **PASS** |
| AC-P3A-08 | Bez `wallId` | T34 | **PASS** |
| AC-P3A-09 | Rozdzielnia **R** | T10/T16/T26 | **PASS** |
| AC-P3A-10 | Toolbar §7 | Ściana · P · W · Okno · Wymiar · Strzałka · Wentylacja · Piec · Rozdzielnia · Tekst | **PASS** |
| AC-P3A-11 | `schemaVersion===1` | T01/T32 · types | **PASS** |
| AC-P3A-12 | Regresja P0–P3 | §2.9 | **PASS** |
| AC-P3A-13 | Brak Payroll / cloud merge | brak zmian w merge drawings / Payroll | **PASS** |

---

## 4. MR-P3A-01…07

| ID | Status OV |
|----|-----------|
| MR-P3A-01 `computeWallGaps` + testy | **PASS** |
| MR-P3A-02 label > auto | **PASS** (T30) |
| MR-P3A-03 dwa buttony + `addDoor` | **PASS** |
| MR-P3A-04 board w `DrawingStampObject` | **PASS** |
| MR-P3A-05 bez tool „Opis” | **PASS** |
| MR-P3A-06 `letterStampPaths` | **PASS** |
| MR-P3A-07 wall-click primary · 2-click secondary | **PASS** |

---

## 5. Build / test evidence (OV re-run)

```text
npx vite-node scripts/test-wm-rysunki-01-p3a.mjs → 40 PASS / 0 FAIL
npx vite-node scripts/test-wm-rysunki-01-p3.mjs  → 32 PASS / 0 FAIL
npx vite-node scripts/test-wm-rysunki-01-p2.mjs  → 28 PASS / 0 FAIL
npx vite-node scripts/test-wm-rysunki-01-p1b.mjs → 32 PASS / 0 FAIL
npx vite-node scripts/test-wm-rysunki-01-p1.mjs  → 44 PASS / 0 FAIL
npx vite-node scripts/test-wm-rysunki-01-p0.mjs  → 33 PASS / 0 FAIL

IMPLEMENT build: npm run build → PASS (sesja IMPLEMENT)
```

---

## 6. Allowlist P3A (gotowa do COMMIT — po Owner GO)

| Plik | Rola |
|------|------|
| `src/lib/wm-technical-drawings/wall-gap.ts` | NEW |
| `src/lib/wm-technical-drawings/symbols/index.ts` | glyphs |
| `src/lib/wm-technical-drawings/render-svg.ts` | gap + board + hover |
| `src/lib/wm-technical-drawings/normalize.ts` | door map · board stamp |
| `src/lib/wm-technical-drawings/types.ts` | library 3 · P3A types |
| `src/lib/wm-technical-drawings/report.ts` | board offset |
| `src/lib/wm-technical-drawings/index.ts` | export |
| `src/app/WmPrintDrawingEditor.tsx` | toolbar · dim · hover |
| `src/app/GuideView.tsx` | instrukcja |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.66.01** |
| `scripts/test-wm-rysunki-01-p3a.mjs` | NEW |
| `scripts/test-wm-rysunki-01-p1.mjs` | wersje / door-room |
| `docs/architecture/WM-RYSUNKI-01-P3A-UX-POLISH-OWNER-VERIFICATION.md` | ten plik |

**Nie commitować** przy GO COMMIT: obce WIP (`CloudLoader`, `PayrollView`, `.tmp*`, …).

---

## 7. Wersja / git

| Pole | Wartość |
|------|---------|
| Changelog tip (local) | **2.66.01** |
| Prod tip (przed release) | **2.66.00** / `8d4abcc9` |
| Commit P3A | **PENDING** — czekaj **OWNER GO COMMIT** |
| Push | **NIE** |

---

## 8. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: OWNER GO COMMIT
  → allowlist §6 only
  → bez push (osobny GO RELEASE / PUSH)

P4 / punkty / CAD: NIE bez nowego Owner GO
```

---

*OV zakończona · bez commit/push.*
