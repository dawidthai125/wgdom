# WM-RYSUNKI-01 P1 — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-01-P1-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1 — Toolset MVP (symbole)**  
> **FAZA:** OWNER VERIFICATION  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **Data OV:** 2026-08-03  
> **UI tip (changelog):** **2.65.97** (nad P0 **2.65.96** / prod tip `028e4819`)  
> **Flaga:** `kw-wm-rysunki-01` default **OFF**  
> **Parents:** [`WM-RYSUNKI-01-P1-AUDIT.md`](./WM-RYSUNKI-01-P1-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P1-DESIGN-FREEZE.md) (**FROZEN**) · [`WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **Zakaz:** COMMIT · PUSH — czekaj na **Owner GO COMMIT**

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1 — OWNER VERIFICATION

STATUS:             OWNER VERIFICATION PASS
BUILD:              PASS (sesja IMPLEMENT)
TEST P1:            43 PASS  (re-run OV)
TEST P0 regresja:   33 PASS  (re-run OV)
OV EXTRA:           10 PASS  (flag · roundtrip · undo · final · strip · SVG)
DF / AR / AC / MR:  ALIGNED (+ D-P1-11 · D-P1-12)
Payroll / Cloud:    BEZ REGRESJI P1 (brak zmian cloud-sync; Payroll WIP poza allowlistą)
COMMIT:             NIE — czekaj na Owner GO COMMIT
PUSH:               NIE
════════════════════════════════════════════════════════
```

---

## 0. Metoda weryfikacji

| Warstwa | Dowód |
|---------|--------|
| Automat P1 | `npx vite-node scripts/test-wm-rysunki-01-p1.mjs` → **43 PASS** |
| Automat P0 | `npx vite-node scripts/test-wm-rysunki-01-p0.mjs` → **33 PASS** |
| OV extra | create→serialize→reload · flag OFF · undo/redo · final · strip `wallRefId` · SVG pipeline → **10 PASS** |
| Build | `npm run build` **PASS** (IMPLEMENT) |
| Kod vs DF | toolbar §6 · `render-svg` · `symbols/` · editor · panel |
| Diff allowlist | P1 pliki lokalnie zmodyfikowane; **`cloud-sync.ts` = 0 diff vs HEAD** |
| Live browser | checklista §2 — kontrakt kodu + unit; Owner może powtórzyć smoke 60–90 s po GO COMMIT |

---

## 1. Checklista Owner GO (10 punktów)

| # | Kryterium | Wynik | Dowód |
|---|-----------|-------|--------|
| **1** | Feature flag OFF — brak regresji | **PASS** | P0 T05–T06 · OV01 · `isWmRysunki01Enabled` + `getVisibleWmPrintTabs` — brak taba `rysunki` |
| **2** | Toolbar — 9 narzędzi, kolejność DF §6 | **PASS** | Editor: Ściana → Drzwi → Okno → Tekst → Opis pomieszczenia → Wymiar → Strzałka → Wentylacja → Piec gazowy (+ Wybierz / Undo poza listą symboli — zgodne DF „dodatkowo”) |
| **3** | Symbole (door+flipH+90/180/270 · window · vent · boiler · arrow · dimension · opis) | **PASS** | types · symbols registry · editor tools · T08–T30 · OV05–OV06 · D-P1-11/12 |
| **4** | `renderSymbol()` — jeden pipeline, brak 2. renderer’a | **PASS** | Editor: wyłącznie `renderDrawingSvg` → `dangerouslySetInnerHTML`; dispatch MR-P1-01 (wall/text specjalne; reszta `renderSymbol` / `renderSymbolAlongSegment`); brak Fabric/Konva/ad-hoc SVG w editorze |
| **5** | Roundtrip: utwórz → zapis → reload → otwarcie | **PASS** | OV03–OV04 · T36 · serialize + `normalizeWmTechnicalDrawings` · LS/KV `kw-wm-technical-drawings` (P0 path) |
| **6** | Undo / Redo | **PASS** | `DrawingUndoStack` · editor Ctrl/Z · OV07–OV08 · P0 T25–T28 |
| **7** | Autosave | **PASS** | debounce **1000 ms** · `scheduleAutosave` → `onAutosave` → panel `onCommitDrawings` → `pushWmTechnicalDrawingsToCloud` · wskaźnik „Zapisywanie…/Zapisano” · bez audit flood |
| **8** | Draft → Final | **PASS** | `setDrawingFinal` · panel CTA **Final** · T33–T35 · OV03 · walidacja job/adres |
| **9** | Soft warn >300 | **PASS** | `DRAWING_OBJECTS_SOFT_WARN=300` · banner w editorze + panel · T04 · OV09 · MR-P1-03 |
| **10** | strip `wallRefId` | **PASS** | `parseDoor` nie kopiuje pola · T16–T17 · T37 · OV05 · MR-P1-06 |
| **11** | Regresja P0 · Cloud · Payroll | **PASS** | P0 **33 PASS** · `DATA_KEYS` bez nowego klucza · **`git diff HEAD -- src/lib/cloud-sync.ts` pusty** · merge LWW OV10 · Payroll **poza allowlistą P1** (lokalny WIP `PayrollView.tsx` / `CloudLoader.tsx` **nie** należy do P1 — nie commitować z P1) |

---

## 2. Toolbar — zgodność DESIGN FREEZE §6

| # DF | Tool PL | Implementacja | Wynik |
|------|---------|---------------|-------|
| 1 | Ściana | `toolBtn("wall")` | **PASS** |
| 2 | Drzwi | `toolBtn("door")` | **PASS** |
| 3 | Okno | `toolBtn("window")` | **PASS** |
| 4 | Tekst | `toolBtn("text")` | **PASS** |
| 5 | Opis pomieszczenia | `toolBtn("room_label")` → type **`text`** + preset | **PASS** |
| 6 | Wymiar | `toolBtn("dimension")` | **PASS** |
| 7 | Strzałka | `toolBtn("arrow")` | **PASS** |
| 8 | Wentylacja | `toolBtn("ventilation")` | **PASS** |
| 9 | Piec gazowy | `toolBtn("gas_boiler")` | **PASS** |

Obrót UI: wyłącznie przyciski **90° / 180° / 270°** (D-P1-12) — **bez** pola kąta.

---

## 3. MR-P1-01…08

| ID | Status | Notatka OV |
|----|--------|------------|
| MR-P1-01 | **PASS** | wall/text specjalizacja; symbole → `renderSymbol*` |
| MR-P1-02 | **PASS** | text/opis — selection+drag jak P0 |
| MR-P1-03 | **PASS** | soft warn UI |
| MR-P1-04 | **PASS** | drag: `applyWithoutUndo` per frame · commit undo na pointerup |
| MR-P1-05 | **PASS** | `symbolTransformAttr` translate→rotate→scale(flip) · T10–T12 |
| MR-P1-06 | **PASS** | `arrow` w KNOWN · strip `wallRefId` |
| MR-P1-07 | **PASS** | ta checklista |
| MR-P1-08 | **PASS** | `dimensionAutoLabel` = `String(Math.round(len))` bez jednostki · T14/T24/OV06 |

**D-P1-11:** każdy `SymbolDef` ma `defaultWidth`/`defaultHeight` — **PASS** (T08–T09).  
**D-P1-12:** toolbar rotate tylko 90/180/270 — **PASS**.

---

## 4. Acceptance Criteria P1 (DF §9)

| ID | Kryterium | Wynik |
|----|-----------|-------|
| AC-P1-01 | door · window · dimension · vent · boiler z biblioteki | **PASS** |
| AC-P1-01b | arrow · opis = text preset | **PASS** |
| AC-P1-02 | duplikuj zaznaczenie + offset | **PASS** (T32 · UI Duplikuj) |
| AC-P1-03 | draft → final | **PASS** |
| AC-P1-04 | brak nowej npm dependency | **PASS** (brak fabric/konva/excalidraw w `package.json`) |
| AC-P1-05 | flipH + obrót drzwi w SVG | **PASS** |
| AC-P1-06 | flaga OFF → brak taba | **PASS** |
| AC-P1-07 | P0 roundtrip · `schemaVersion === 1` | **PASS** |
| AC-P1-08 | jeden pipeline `renderSymbol` → SVG → transform → selection → drag | **PASS** |

Zgodność z **AUDIT** (AC propozycja) i **AR** (pokrycie AC): **PASS**.  
Uwaga: AR §8 mapował AC-P1-04 na rotate — **SSOT jest DF** (`AC-P1-04` = no npm); rotate pokryte przez **D-P1-12** + UI + T28–T30.

---

## 5. IN / OUT

| IN | OUT (nie wdrożone — poprawnie) |
|----|--------------------------------|
| door · window · dimension · arrow · vent · boiler · text preset · symbols/ · renderSymbol · flipH · rotate 90/180/270 · Final · soft warn | PDF · ZIP · measurement/electrical points (edycja) · wallRefId · CAD · nowe deps · Payroll · nowy DATA_KEY |

---

## 6. Regresja — szczegóły

| Obszar | Werdykt |
|--------|---------|
| **P0 foundation** | **PASS** — 33/33; wall/text/grid/snap/templates/flag/KV |
| **Cloud** | **PASS** — ten sam `kw-wm-technical-drawings` · pushKeys · merge LWW · **zero** rewrite `cloud-sync` w diff P1 |
| **Payroll** | **PASS (scope)** — P1 **nie** zmienia merge/guard/LP; lokalne dirty `PayrollView.tsx` / `CloudLoader.tsx` = **WIP poza P1** — przy GO COMMIT **wykluczyć** z allowlisty |

---

## 7. Allowlist COMMIT (przy Owner GO COMMIT)

```text
src/lib/wm-technical-drawings/types.ts
src/lib/wm-technical-drawings/normalize.ts
src/lib/wm-technical-drawings/render-svg.ts
src/lib/wm-technical-drawings/report.ts
src/lib/wm-technical-drawings/index.ts
src/lib/wm-technical-drawings/symbols/**
src/app/WmPrintDrawingEditor.tsx
src/app/WmPrintDrawingsPanel.tsx
src/app/GuideView.tsx
src/app/changelog-data.ts
CHANGELOG.md
scripts/test-wm-rysunki-01-p1.mjs
docs/architecture/WM-RYSUNKI-01-P1-OWNER-VERIFICATION.md
docs/architecture/WM-RYSUNKI-01-P1-AUDIT.md
docs/architecture/WM-RYSUNKI-01-P1-DESIGN-FREEZE.md
docs/architecture/WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW.md
```

**Zakaz:** `git add -A` · Payroll* · CloudLoader WIP · Bid Guard · inne untracked.

---

## 8. WERDYKT

```text
OWNER VERIFICATION PASS

Wszystkie kryteria 1–11 spełnione.
Zgodność AUDIT · DESIGN FREEZE · ARCHITECTURE REVIEW · MR-P1-01…08 · AC-P1-01…08 · D-P1-11/12: PASS.

NEXT: Owner GO COMMIT (allowlist powyżej)
Potem: PUSH → VERIFY FAST version.json → PV → CLOSEOUT P1

COMMIT: NIE (do GO)
PUSH:   NIE
```

**STOP.** Czekaj na **Owner GO COMMIT**.
