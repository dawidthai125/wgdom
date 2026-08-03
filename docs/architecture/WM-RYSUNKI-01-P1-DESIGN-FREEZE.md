# WM-RYSUNKI-01 P1 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P1-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1 — Toolset MVP (symbole)**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **ACCEPTED**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P1-AUDIT.md`](./WM-RYSUNKI-01-P1-AUDIT.md)  
> **Parent EPIC DF:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md)  
> **P0:** [`WM-RYSUNKI-01-P0-CLOSEOUT.md`](./WM-RYSUNKI-01-P0-CLOSEOUT.md) (**CLOSED** · **2.65.96** / **`028e4819`**)  
> **Baseline:** tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · flaga `kw-wm-rysunki-01` default **OFF**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1 DESIGN FREEZE — FROZEN

schemaVersion = 1 (additive)
symbols/ zamknięta · ZERO npm rysunkowych
Door: rotation + flipH · wallRefId OUT
Window: rotation · stamp
Dimension: 2-click · label bez jednostki
Arrow: IN · type "arrow"
Opis pomieszczenia: text preset · NIE nowy type
Toolbar: 9 narzędzi (wall…boiler)
AC-P1-08: jeden pipeline renderSymbol → SVG → transform
PDF · ZIP · Punkty · Payroll = OUT P1

IMPLEMENT zakazany do: Owner GO IMPLEMENT (po AR)
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P1 (zamrożony · 1 zdanie)

**P1** rozszerza edytor Rysunki o zamknięty toolset symboli odbiorowych (drzwi, okna, wymiar, strzałka, wentylacja, piec, opis pomieszczenia) na fundamencie P0 — **bez** PDF/ZIP/punktów i **bez** redesignu sync.

### 0.1 Relacja do EPIC DF

| Dokument | Rola |
|----------|------|
| EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) | kontrakt domeny / KV / flaga / P0–P4 mapa |
| **Ten plik** | **amend slice P1** — decyzje Ownera z AUDIT + GO DF |

Konflikt: **ten plik wygrywa** dla zakresu P1 (np. `arrow` IN, `wallRefId` OUT, flipH).

---

## 1. PAYROLL SAFETY GATE (P1)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P1

G1–G9: jak EPIC DF / P0 (FEATURE · AUX KEY już w DATA_KEYS)
Cloud: ZERO nowego DATA_KEY · ZERO rewrite merge LWW semantyki
Payroll / Hours-wipe / carry = OUT
Edge payroll = OUT

Wynik: FEATURE thin · Owner GO CORE: NIE
```

---

## 2. Decyzje FROZEN (Owner GO)

| # | Temat | Decyzja FROZEN |
|---|-------|----------------|
| **1** | `schemaVersion` | **`1`** — tylko pola/typy additive |
| **2** | Biblioteka | `symbols/` **zamknięta** · **bez** nowych npm dependency |
| **3** | Door | `rotation` + **`flipH`** · **`wallRefId` OUT** |
| **4** | Window | `rotation` · **stamp** |
| **5** | Dimension | **2-click** · `label` · **bez jednostki** |
| **6** | Arrow | **IN** · nowy type **`arrow`** |
| **7** | Opis pomieszczenia | tool **text preset** · **NIE** nowy type |
| **8** | Toolbar | lista §6 (9 narzędzi) |
| **9** | AC-P1-08 | jeden pipeline **`renderSymbol()`** → SVG → transform → selection → drag |
| **10** | OUT | **PDF** · **ZIP** · **Punkty** · **Payroll** |

---

## 3. Model danych (FROZEN P1)

### 3.1 Wersjonowanie

| Pole | Wartość FROZEN |
|------|----------------|
| `WmTechnicalDrawing.schemaVersion` | **`1`** |
| Migracja KV / re-key | **ZAKAZ** |
| `DRAWING_SYMBOL_LIBRARY_VERSION` | bump **tylko** przy zmianie kształtów SVG w `symbols/` (nie przy samym dodaniu type `arrow` jeśli shape nowy → bump do **2** przy pierwszym ship P1 symboli) |
| `DRAWING_RENDER_VERSION` / `renderVersion` | bump przy P1 renderer (invalidacja opcjonalnego `renderedSvg`) |
| Breaking rename / drop required fields | wymagałoby `schemaVersion: 2` — **OUT P1** |

### 3.2 `DrawingObjectType` (P1)

```text
DrawingObjectType =
  | "wall"                 // P0
  | "door"                 // P1
  | "window"               // P1
  | "text"                 // P0 · także „Opis pomieszczenia” (preset)
  | "dimension"            // P1
  | "arrow"                // P1 NEW (amend vs EPIC DF §4.2)
  | "ventilation"          // P1
  | "gas_boiler"           // P1
  | "measurement_point"    // P4 — normalize zachowaj; render P1 = skip
  | "electrical_point"     // P4
  | "distribution_board"   // P4
```

**P1 editable types:** `wall` · `door` · `window` · `text` · `dimension` · `arrow` · `ventilation` · `gas_boiler`.

### 3.3 Kontrakty obiektów (minimum FROZEN)

Wspólne: `id` · `type` · `rotation?` · `locked?` · `zIndex?`

| type | Pola FROZEN | Placement |
|------|-------------|-----------|
| `door` | `x,y` · `width?` · `symbolId` · `rotation?` · **`flipH?: boolean`** (default `false`) | stamp + rotate + flip |
| `window` | `x,y` · `width?` · `symbolId` · `rotation?` | stamp + rotate |
| `ventilation` | `x,y` · `symbolId` · `rotation?` | stamp |
| `gas_boiler` | `x,y` · `symbolId` · `rotation?` | stamp |
| `dimension` | `x1,y1,x2,y2` · `label?` | **2-click** (jak wall) |
| `arrow` | `x1,y1,x2,y2` · `symbolId` | **2-click** |
| `text` | `x,y` · `content` · `fontSize?` | stamp / click (P0) + preset Opis |

#### 3.3.1 Door — szczegóły

| Reguła | FROZEN |
|--------|--------|
| Obrót | `rotation` w stopniach (UI: krok **90°** wystarczający; dowolny kąt dozwolony w modelu) |
| Odbicie | **`flipH`** — mirror lokalny względem osi symbolu |
| `wallRefId` | **OUT P1** — nie zapisywać · nie UI · normalize: jeśli przyjdzie z przyszłości → **ignoruj / strip** (nie błąd) |
| `symbolId` default | `door-swing` |

#### 3.3.2 Window

| Reguła | FROZEN |
|--------|--------|
| Placement | **stamp** (jeden click) + `rotation` |
| Flip | **nie** wymagany (brak pola obowiązkowego) |
| `symbolId` default | `window-rect` |

#### 3.3.3 Dimension

| Reguła | FROZEN |
|--------|--------|
| Gesture | **2 kliknięcia** (start → end) |
| `label` | opcjonalne; jeśli puste → auto **sama liczba** długości w px logicznych |
| Jednostka w UI / stringu | **BRAK** (ani „px”, ani „cm”, ani „m”) — **D-P1-DIM-01 = bez jednostki** |
| Markery końców | proceduralne w rendererze (część wymiaru) · nie osobny obiekt |

#### 3.3.4 Arrow

| Reguła | FROZEN |
|--------|--------|
| Type | **`arrow`** (nowy) |
| Geometria | `x1,y1,x2,y2` |
| `symbolId` default | `arrow-straight` |
| Grot | w symbolu / proceduralnie na końcu `(x2,y2)` — jedna ścieżka `renderSymbol` |

#### 3.3.5 Opis pomieszczenia

| Reguła | FROZEN |
|--------|--------|
| Type | **`text`** — **NIE** `room_label` |
| UX | osobny tool toolbar **„Opis pomieszczenia”** |
| Preset | np. `content` startowe `"Pomieszczenie"` · `fontSize` default większy niż zwykły tekst (np. 18 vs 14) — wartości dokładne w IMPLEMENT, semantyka FROZEN |
| `symbolId` | `text-label` |

### 3.4 Zakazy modelu P1

| Zakaz | Powód |
|-------|--------|
| `wallRefId` na door/window | Owner OUT |
| Nowy type dla opisu | ZERO DUPLICATE |
| Wymaganie punktów do save/final | EPIC + P0 |
| PDF bytes / raster jako SSOT | EPIC |
| Nowy KV | P0 wystarcza |
| `schemaVersion: 2` | niepotrzebne |

---

## 4. Biblioteka `symbols/` (FROZEN)

### 4.1 Zasady

| # | Reguła |
|---|--------|
| 1 | Kod w `src/lib/wm-technical-drawings/symbols/` |
| 2 | Katalog **zamknięty** — lista ID poniżej |
| 3 | **Brak** uploadu · **brak** DWG/DXF |
| 4 | **Brak** nowej npm dependency (Fabric/Konva/Excalidraw/…) |
| 5 | **Brak** kopiowania IEC ze Schematów |
| 6 | Nieznany `symbolId` → fallback **`unknown`** + zachowaj obiekt |
| 7 | Registry: `symbolId` → definicja (viewBox / paths / defaultSize) |

### 4.2 Katalog symboli P1 (FROZEN ID)

| symbolId | Użycie | Type |
|----------|--------|------|
| `wall-default` | ściana (P0) | wall |
| `door-swing` | drzwi | door |
| `window-rect` | okno | window |
| `vent-grid` | wentylacja | ventilation |
| `gas-boiler` | piec gazowy | gas_boiler |
| `text-label` | tekst / opis | text |
| `dimension-line` | wymiar (lub procedural + id) | dimension |
| `arrow-straight` | strzałka | arrow |
| `unknown` | fallback | always |
| `point-measure` / `point-electrical` / `board-distribution` | P4 only | — |

**Nowe ID poza listą** = amend tego DF (lub `schemaVersion: 2` jeśli breaking).

---

## 5. Pipeline render / interakcja — **AC-P1-08** (FROZEN)

Wszystkie symbole P1 (door · window · vent · boiler · dimension markers · arrow · oraz spójne ujęcie text jako label w tym samym torze transformacji, gdzie dotyczy) **MUSZĄ** iść jednym pipeline:

```text
renderSymbol(symbolId, props)
    ↓
SVG fragment (<g> / paths)
    ↓
transform (translate · rotate · flipH)
    ↓
selection (data-id · hit target)
    ↓
drag (move / 2-point edit dla linii)
```

| Reguła | FROZEN |
|--------|--------|
| Drugi równoległy renderer „ad-hoc path w editorze” | **ZAKAZ** |
| Reuse P0 `renderDrawingSvg` | **TAK** — rozszerzyć dispatch; jeden entry |
| Grid | tylko `showGrid` edytor — **nie** w przyszłym PDF path |
| Drag | bez per-frame undo (P0 MR-06) |
| Undo | snapshot całego dokumentu (P0 stack) |

**Wall** może pozostać specjalizacją linii (jak P0), ale **symbole stamp** (door/window/vent/boiler) oraz **arrow/dimension adornments** → `renderSymbol`.

---

## 6. Toolbar (FROZEN · kolejność)

| # | Tool UI (PL) | `type` / zachowanie |
|---|--------------|---------------------|
| 1 | **Ściana** | `wall` · 2-click (P0) |
| 2 | **Drzwi** | `door` · stamp |
| 3 | **Okno** | `window` · stamp |
| 4 | **Tekst** | `text` · P0 |
| 5 | **Opis pomieszczenia** | `text` · preset |
| 6 | **Wymiar** | `dimension` · 2-click |
| 7 | **Strzałka** | `arrow` · 2-click |
| 8 | **Wentylacja** | `ventilation` · stamp |
| 9 | **Piec gazowy** | `gas_boiler` · stamp |

Dodatkowo (nie „symbol tools”, ale Must P1 / P0 reuse):

| UI | Zachowanie |
|----|------------|
| Select / Move / Delete | P0 |
| Undo / Redo | P0 |
| Grid / Snap toggles | P0 |
| Obrót 90° / Odbij (`flipH`) | przy zaznaczonych drzwiach (min.) |
| Duplikuj zaznaczenie | offset + grid step |
| Draft → Final | panel / editor CTA |

Opcjonalnie P1 (EPIC): wybór **step** grid 5/10/20 — **nie** blocker.

---

## 7. Autosave · Undo · Cloud (FROZEN)

| Warstwa | Decyzja |
|---------|---------|
| Autosave | **bez zmian kontraktu** P0 (debounce ~1000 ms · wskaźnik · zakaz audit flood) |
| Undo/Redo | ten sam `DrawingUndoStack` · komendy add/move/delete/dup/flip/rotate/property |
| Cloud LWW | **bez** nowego klucza · merge per drawing `id` · obiekty = zawartość dokumentu |
| Flaga UI | ta sama `kw-wm-rysunki-01` — **bez** osobnej flagi `-p1` |
| Audit | create/delete/duplicate dokumentu · `drawing_finalized` (lub status change) OK · **nie** per autosave |

---

## 8. IN / OUT P1

### 8.1 IN (Must)

- Typed parse + render: door · window · dimension · arrow · ventilation · gas_boiler  
- `symbols/` + registry + `unknown`  
- Toolbar §6  
- `flipH` + rotation drzwi  
- Opis pomieszczenia = text preset  
- Duplikat zaznaczenia  
- Draft → Final (`validateForSave` EPIC §4.5)  
- AC-P1-08 pipeline  
- Testy unit (normalize · symbol fallback · render · flip · arrow · final)  
- Soft warn `objects.length > 300` (MR-05) — **Should**

### 8.2 OUT (potwierdzone)

| Obszar | Status |
|--------|--------|
| **PDF** / podgląd / druk | **OUT** → P2 |
| **ZIP** `Rysunki/` | **OUT** → P3 |
| **Punkty** measurement/electrical/board | **OUT** → P4 |
| **Payroll** / CloudLoader / merge payroll | **OUT** |
| `wallRefId` / auto-attach do ściany | **OUT** |
| Skala metryczna / jednostki na wymiarze | **OUT** |
| Nowa npm lib rysunkowa | **OUT** |
| Nowy DATA_KEY | **OUT** |
| Upload symboli | **OUT** |

---

## 9. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P1-01** | Drzwi · okno · wymiar · wentylacja · piec z biblioteki symboli |
| **AC-P1-01b** | Strzałka (`arrow`) · Opis pomieszczenia (text preset) |
| **AC-P1-02** | Duplikuj zaznaczenie z offsetem |
| **AC-P1-03** | draft → final wg EPIC §4.5 |
| **AC-P1-04** | Brak nowej npm dependency |
| **AC-P1-05** | Flip (`flipH`) + obrót drzwi widoczne w SVG |
| **AC-P1-06** | Flaga OFF → brak taba |
| **AC-P1-07** | Dokumenty P0 roundtrip · `schemaVersion === 1` |
| **AC-P1-08** | Wszystkie symbole: **`renderSymbol()` → SVG → transform → selection → drag`** (jeden pipeline) |

---

## 10. Allowlist IMPLEMENT (orientacyjna)

```text
src/lib/wm-technical-drawings/types.ts
src/lib/wm-technical-drawings/normalize.ts
src/lib/wm-technical-drawings/render-svg.ts
src/lib/wm-technical-drawings/symbols/**          # NOWY
src/lib/wm-technical-drawings/report.ts           # dup element / final helpers
src/lib/wm-technical-drawings/index.ts
src/app/WmPrintDrawingEditor.tsx
src/app/WmPrintDrawingsPanel.tsx
scripts/test-wm-rysunki-01-p1.mjs                 # NOWY
src/app/changelog-data.ts
CHANGELOG.md
docs/architecture/WM-RYSUNKI-01-P1-*              # AUDIT/DF/AR/OV…
GuideView (hint narzędzi) — tylko jeśli copy widoczne
```

**Zakaz w allowlist:** `cloud-sync.ts` rewrite · Payroll* · `generate-zip` · PDF generators · `git add -A`.

---

## 11. Zgodność zasad

| Zasada | Status |
|--------|--------|
| SSOT FIRST | **PASS** — `objects[]` |
| REUSE FIRST | **PASS** — P0 editor/sync/flag |
| ZERO DUPLICATE | **PASS** — opis≠nowy type · jeden `renderSymbol` |
| THIN SLICE | **PASS** — PDF/ZIP/points/payroll OUT |

---

## 12. Definition of Done (slice P1 docs)

- [x] AUDIT ACCEPTED  
- [x] Decyzje Owner 1–10 zamrożone w tym pliku  
- [x] AC-P1-01…08  
- [x] OUT PDF/ZIP/Punkty/Payroll potwierdzone  
- [x] ARCHITECTURE REVIEW P1 — **PASS WITH MINOR RECOMMENDATIONS**  
- [ ] Owner GO IMPLEMENT  
- [ ] OV · COMMIT allowlist · PUSH · PV · CLOSE  

---

## 13. NEXT

```text
STATUS: DESIGN FREEZE · FROZEN
AR: PASS WITH MINOR RECOMMENDATIONS

NEXT: Owner GO IMPLEMENT (P1)

IMPLEMENT: NIE (do GO)
COMMIT: NIE
PUSH: NIE
```

**STOP.**
