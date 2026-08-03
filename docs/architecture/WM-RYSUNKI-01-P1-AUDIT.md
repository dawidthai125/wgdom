# WM-RYSUNKI-01 P1 — AUDIT

> **STATUS:** **ACCEPTED** · Design Freeze → [`WM-RYSUNKI-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P1-DESIGN-FREEZE.md) (**FROZEN**)  
> **ID:** WM-RYSUNKI-01-P1-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1 — Toolset MVP (symbole)**  
> **FAZA:** **AUDIT**  
> **MODE:** AUDIT ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** (P1)  
> **Parents:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) (EPIC DF FROZEN) · [`WM-RYSUNKI-01-P0-CLOSEOUT.md`](./WM-RYSUNKI-01-P0-CLOSEOUT.md) · [`WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md)  
> **Baseline prod:** UI **2.65.96** / **`028e4819`** · flaga `kw-wm-rysunki-01` default **OFF** · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1 — AUDIT ACCEPTED

DF P1: FROZEN → WM-RYSUNKI-01-P1-DESIGN-FREEZE.md
NEXT: Owner GO ARCHITECTURE REVIEW
IMPLEMENT / COMMIT / PUSH: NIE
════════════════════════════════════════════════════════
```

---

## 0. Kontekst wejściowy

| Element | Stan |
|---------|------|
| **P0** | **CLOSED** · tip **2.65.96** / **`028e4819`** |
| **Domena** | `src/lib/wm-technical-drawings/` · KV `kw-wm-technical-drawings` |
| **UI** | `WmPrintDrawingsPanel` · `WmPrintDrawingEditor` (wall + text) |
| **Render** | `render-svg.ts` — tylko `wall`/`text`; inne typy = pusty string (passthrough) |
| **Normalize** | `KNOWN_OBJECT_TYPES` już zawiera door/window/dimension/vent/boiler · P0 przechowuje jako passthrough |
| **EPIC DF §13.1 P1** | door · window · dimension · vent · boiler · duplikat elementów · draft→final · (step grid) |
| **Owner P1 GO (ten AUDIT)** | + **strzałka** · **opis pomieszczenia** |

### 0.1 Gate (skrót)

```text
PAYROLL: OUT · Cloud: tylko istniejący AUX KEY (bez nowego DATA_KEY)
Flaga: ta sama kw-wm-rysunki-01 (OFF = tip parity)
Nowa dependency rysunkowa: ZAKAZ
```

---

## 1. Analiza pytań Ownera

### 1.1 Rozszerzenie modelu JSON **bez** łamania `schemaVersion`

| Fakt P0 | Wniosek P1 |
|---------|------------|
| `schemaVersion: 1` FROZEN w EPIC DF | **Zostaje `1`** |
| Union `DrawingObjectType` już zawiera P1 typy | **Brak migracji KV** — dokumenty P0 roundtrip OK |
| P0 `DrawingPassthroughObject` trzyma obce pola | P1 **doprecyzowuje** typed interfaces + normalize parsers |
| `DRAWING_SYMBOL_LIBRARY_VERSION = 1` | P1 **dodaje** symbole z katalogu DF §5.2 **w tej samej** lib version **lub** bump **tylko** `DRAWING_SYMBOL_LIBRARY_VERSION` (nie `schemaVersion`) gdy shape library się zmienia |

**Polityka (rekomendacja AUDIT):**

| Zmiana | `schemaVersion` | `DRAWING_SYMBOL_LIBRARY_VERSION` | `renderVersion` |
|--------|-----------------|----------------------------------|-----------------|
| Nowe pola opcjonalne na istniejącym type (`flip`, `swingSide`) | **1** (additive) | bez zmian lub +1 jeśli path SVG zmienia | bump przy renderer |
| Nowy `type` spoza EPIC DF (np. `arrow`) | **1** tylko po **amend DF** + lista ID; inaczej **2** | bump lib | bump |
| Usunięcie / rename pól wymaganych | **2** (breaking) | — | — |

**MR-04 (P0):** coerce nieznanego `schemaVersion` → 1 — **nie zmieniać** w P1 bez powodu.

**Werdykt:** P1 da się zrobić na **`schemaVersion: 1`** o ile nowe typy/pola są additive i zgodne z DF (lub DF amend dla strzałki / opisu).

---

### 1.2 Definiowanie nowych typów obiektów

**Stan kodu:** typy w union istnieją; brak pełnych interface + render + tools.

**Rekomendowany wzorzec (ZERO DUPLICATE):**

```text
types.ts          → DrawingDoorObject | DrawingWindowObject | …
normalize.ts      → parseDoor / parseWindow / … (jedna ścieżka)
symbols/*         → SVG fragmenty + registry by symbolId
render-svg.ts     → dispatch type → symbol render (wspólny helper)
editor            → tools + hit-test + transform (reuse snap/undo/autosave)
```

| type | Geometria (z EPIC DF §4.4) | Placement UX |
|------|---------------------------|--------------|
| `door` | `x,y` · `width?` · `wallRefId?` · `symbolId` · `rotation?` | click na ścianę / wolny punkt + rotate |
| `window` | jak door | jak door |
| `ventilation` | `x,y` · `symbolId` · `rotation?` | stamp |
| `gas_boiler` | `x,y` · `symbolId` · `rotation?` | stamp |
| `dimension` | `x1,y1,x2,y2` · `label?` (auto długość) | 2 kliknięcia (jak wall) |
| `text` (opis) | istniejący | preset „opis pomieszczenia” |

**Zasada:** jeden `type` = jedna semantyka; warianty wizualne = `symbolId` + props (`flip`, `width`), **nie** nowe type per wariant.

---

### 1.3 Biblioteka symboli SVG

| EPIC DF §5 | P1 |
|------------|-----|
| Folder `src/lib/wm-technical-drawings/symbols/` | **Utworzyć** (P0 jeszcze nie ma katalogu — tylko stałe ID w types) |
| Zamknięty katalog ID | `door-swing` · `window-rect` · `vent-grid` · `gas-boiler` · `dimension-line` · `unknown` |
| Brak uploadu / DWG | **OUT** |
| Nie kopiować IEC Schematów | **PASS** — osobne pathy planu |

**Organizacja (rekomendacja):**

```text
symbols/
  index.ts              # registry: symbolId → { viewBox, paths, defaultSize }
  door-swing.ts
  window-rect.ts
  vent-grid.ts
  gas-boiler.ts
  dimension-line.ts     # lub render proceduralny (linie + strzałki wymiaru)
  unknown.ts
```

| Zasada | Opis |
|--------|------|
| **SSOT symbolu** | kod TS/SVG fragment — nie assety zewnętrzne wymagające fetch |
| **Render** | `renderSymbol(symbolId, { x, y, rotation, flip, width })` → string SVG `<g transform=…>` |
| **Normalize** | nieznany `symbolId` → `unknown` + zachowaj obiekt (DF) |
| **Bump** | zmiana kształtu drzwi = `DRAWING_SYMBOL_LIBRARY_VERSION++` · dokumenty stare renderują nowy wygląd (świadomie; brak per-object lock shape) |

**OUT:** import sprite z `electrical-schematics` · runtime SVG z Storage.

---

### 1.4 Obrót i odbicie drzwi

| Mechanizm | Dostępność |
|-----------|------------|
| `rotation?: number` (stopnie) | już w `DrawingObjectBase` |
| Flip / odbicie skrzydła | **brak** w EPIC DF §4.4 — **luka** |

**Opcje (do DF P1):**

| ID | Podejście | Pros | Cons |
|----|-----------|------|------|
| **A** | `rotation` 0/90/180/270 + `flipH?: boolean` (mirror lokalny X) | jawne · łatwy UI „Odbij” | nowe pole additive |
| **B** | `swingSide: "L" \| "R"` + `rotation` | semantyka drzwiowa | mapowanie na SVG |
| **C** | tylko `rotation` (co 90°) bez flip | thin | niewystarczające dla skrzydła L/R |

**Rekomendacja AUDIT:** **A** (lub **B** jeśli Owner woli język budowlany) — pole **opcjonalne**, default `false` / `"R"` · **bez** `schemaVersion: 2`.

**Przyklejenie do ściany (`wallRefId?`):**

| Poziom | Zakres P1 |
|--------|-----------|
| **MVP thin** | drzwi jako stamp w punkcie; `wallRefId` opcjonalne / **OUT** w P1 jeśli kolizja z czasem |
| **P1+** | snap do najbliższej ściany + auto `rotation` z wektora ściany |

**Rekomendacja:** P1 = **stamp + rotate + flip**; auto-wall-attach = **opcjonalny stretch** tylko jeśli OV UX FAIL (nie blocker DF).

**UI:** przyciski Obrót 90° · Odbij · Delete · (szerokość w props lekkich).

---

### 1.5 Okna

| Jak door | Różnice |
|----------|---------|
| `x,y` · `width?` · `rotation?` · `symbolId: window-rect` | symbol = prostokąt / podwójna linia w grubości ściany |
| Flip | zwykle **nie** potrzebny (symetria) — `flip` optional unused |
| Placement | jak door: click + rotate do osi ściany |

**Render:** ten sam helper `renderSymbol` co drzwi; osobny path `window-rect`.

**Ryzyko:** wizualne „okno w powietrzu” bez ściany — akceptowalne w thin sketch (jak CAD-lite); copy UI: „umieść na ścianie”.

---

### 1.6 Wymiar (`dimension`)

| DF | Implementacja proponowana |
|----|---------------------------|
| `x1,y1,x2,y2` · `label?` | narzędzie 2-klik (reuse wall gesture) |
| auto label | jeśli `label` puste → `Math.round(length)` + jednostka **px** lub **„j.u.”** (logical) — **nie** metry rzeczywiste bez skali |

**Otwarte (DF P1 musi zamrozić):**

| ID | Pytanie | Opcje |
|----|---------|-------|
| **D-P1-DIM-01** | Jednostka etykiety | **A** px logiczne · **B** „cm” umowne (1 px = 1 cm) · **C** bez jednostki, sama liczba |
| **D-P1-DIM-02** | Strzałki na końcach wymiaru | część symbolu `dimension-line` vs proceduralne markers |

**Rekomendacja:** **C** lub **A** (thin) · strzałki wymiaru = **proceduralne** w rendererze (nie osobny obiekt).

**OUT P1:** pełne wymiarowanie lokalu · łańcuchy wymiarowe · skala metryczna kalibrowana.

---

### 1.7 Autosave · Undo/Redo · Cloud LWW

| Warstwa | Zmiana wymagana w P1? | Uzasadnienie |
|---------|----------------------|--------------|
| **Autosave** | **NIE** (kontrakt) | Debounce 1s · `touchDrawing` · push — działa na całym `WmTechnicalDrawing`; nowe obiekty = ta sama ścieżka |
| **Undo/Redo** | **NIE** (stack) · **TAK** (komendy) | `DrawingUndoStack` już snapshotuje cały dokument; add/move/delete/dup/flip = `push` snapshot jak wall |
| **Cloud LWW** | **NIE** | Merge per `id` dokumentu; obiekty wewnątrz = całość dokumentu — **bez** OT per-object · **bez** nowego KV |
| **DATA_KEYS** | **NIE** | Klucz już w P0 |
| **Audit flood** | **NIE** | nadal zakaz `drawing_edited` per autosave; P1: opcjonalnie `drawing_finalized` przy draft→final |

**Werdykt:** infrastruktura P0 **wystarcza**; P1 = narzędzia + render + normalize typed + UI.

---

### 1.8 Wydajność

| Ryzyko | Mitygacja (MR-05 / MR-06) |
|--------|---------------------------|
| Więcej obiektów (drzwi+okna+wymiary) | soft warn `objects.length > 300` (MR-05) — P1 dobry moment |
| SVG string rebuild na drag | **reuse P0:** podczas drag `replace` bez per-frame undo; memoize SVG po commit |
| Symbole ze złożonymi path | proste pathy (≤ few dozen commands) · wspólny `<g>` |
| Grid + wiele symboli | grid już O(W/step); bez zmiany |

**Workload odbiorowy:** typowo &lt; 50 obiektów — **PASS** bez specjalnej architektury.

---

### 1.9 Wpływ na SVG renderer

| Stan P0 | P1 |
|---------|-----|
| `renderObject` switch wall/text | rozszerzyć o door/window/vent/boiler/dimension (+ arrow jeśli DF) |
| `DRAWING_RENDER_VERSION = 1` | bump do **2** gdy P1 symbole w output (cache `renderedSvg` invalidation) |
| Passthrough niewidoczny | po P1 typy P1 **widoczne**; P4 nadal puste lub unknown |

**REUSE:** jeden `renderDrawingSvg` — **nie** drugi renderer · **nie** reuse schematów IEC.

**Hit-testing:** `data-id` na `<g>` symbolu; drag move jak text (point objects) · dimension jak wall (2 endpoints / move whole).

---

### 1.10 Wpływ na przyszły PDF (bez implementacji)

| P2 (przyszłość) | Impikacja P1 |
|-----------------|--------------|
| PDF = SVG → PNG @2× → pdf-lib (DF D3) | P1 musi produkować **czysty** SVG bez UI-only (grid już opcjonalny `showGrid`) |
| Watermark draft | status już w modelu — P1 draft→final **przygotowuje** semantyka |
| Symbole w PDF | te same pathy co edytor — **SSOT model**, nie bitmapa z ekranu |
| Fonty tekstu / opisu | system-ui OK na ekran; P2 może mapować na WM fonts — **nie** blokuje P1 |

**Zakaz P1:** generować PDF / cache bytes PDF w KV.

---

## 2. Gap: „strzałka” i „opis pomieszczenia” vs EPIC DF

| Element Owner GO | EPIC DF P1 | Gap |
|------------------|------------|-----|
| drzwi · okna · wentylacja · piec · wymiar | **IN** §13.1 / §5.2 | brak |
| **strzałka** | **brak** osobnego type / symbolId | **OPEN** |
| **opis pomieszczenia** | częściowo = `text` | **OPEN** (UX preset vs nowy type) |

### 2.1 Strzałka — opcje DF

| ID | Decyzja kandydat | Thin? |
|----|------------------|-------|
| **D-P1-ARR-01A** | Nowy type `arrow` · `x1,y1,x2,y2` · symbol markers | jasne · amend DF §4.2/§5.2 |
| **D-P1-ARR-01B** | Type `dimension` bez label / osobny tool „strzałka kierunku” reuse geometrii linii | mniej typeów · mylące |
| **D-P1-ARR-01C** | **OUT P1** — strzałka w P1.1 | najcieńsze vs Owner lista |

**Rekomendacja AUDIT:** **A** (osobny `arrow` + `symbolId: arrow-straight`) — Owner jawnie wymienił; amend DF przy DESIGN FREEZE P1; nadal `schemaVersion: 1`.

### 2.2 Opis pomieszczenia — opcje DF

| ID | Decyzja kandydat |
|----|------------------|
| **D-P1-ROOM-01A** | Tool „Opis” = `text` + default `fontSize` większy + placeholder „Pomieszczenie” · `symbolId: text-label` |
| **D-P1-ROOM-01B** | Nowy type `room_label` (alias semantyki) | zbędna duplikacja vs text |

**Rekomendacja AUDIT:** **A** — **ZERO DUPLICATE** type; UX label „Opis pomieszczenia” w toolbarze.

---

## 3. Zgodność z zasadami

| Zasada | Ocena | Dowód |
|--------|-------|--------|
| **SSOT FIRST** | **PASS** | nadal `objects[]` · SVG/PDF derivaty |
| **REUSE FIRST** | **PASS** | editor stack · snap · autosave · LWW · panel · tab · flaga P0 |
| **ZERO DUPLICATE LOGIC** | **PASS*** | *o ile jeden `renderSymbol` + brak kopiowania IEC; opis = text nie nowy type |
| **THIN SLICE** | **PASS*** | *P1 = toolset; PDF/ZIP/points OUT; wall-attach auto = stretch |

---

## 4. Ryzyka

| ID | Ryzyko | Severity | Mitygacja |
|----|--------|----------|-----------|
| **R1** | Scope creep CAD (przyklejanie drzwi, skale metrów) | HIGH | DF: stamp+rotate+flip; wymiar bez skali metrycznej |
| **R2** | Strzałka / opis poza EPIC DF | MED | zamknąć D-P1-ARR / D-P1-ROOM w DF P1 |
| **R3** | Perf drag + symbole | LOW | MR-06 reuse · proste pathy |
| **R4** | Flip drzwi źle narysowany (UX) | MED | OV checklist flip L/R · 1 symbol + transform |
| **R5** | Duplikacja logiki wall vs dimension gesture | LOW | wspólny `useTwoClickLineTool` |
| **R6** | Soft-break: stare drafty z passthrough bez render | LOW | po P1 renderują; P0 klient bez P1 kodu = nadal passthrough OK |
| **R7** | Payroll / sync CORE | — | **OUT** — brak |
| **R8** | PDF quality later | LOW | czysty SVG bez grid w export path |

---

## 5. Proponowany zakres P1 (IN / OUT)

### 5.1 IN (Must)

| # | Element |
|---|---------|
| 1 | Typed objects: door · window · ventilation · gas_boiler · dimension |
| 2 | Biblioteka `symbols/` + registry + `unknown` |
| 3 | Renderer SVG dla typów P1 · bump `DRAWING_RENDER_VERSION` |
| 4 | Toolbar tools + placement (stamp / 2-click dimension) |
| 5 | Rotate 90° · **flip drzwi** (po DF) |
| 6 | Duplikuj **zaznaczenie** (offset grid step) — AC-P1-02 |
| 7 | Draft → Final (UI + `validateForSave` §4.5) — AC-P1-03 |
| 8 | Opis pomieszczenia = tool tekstowy preset (D-P1-ROOM-A) |
| 9 | Strzałka — **jeśli** DF wybierze ARR-A |
| 10 | Testy: normalize · symbol fallback · render smoke · dup selection · final gate |
| 11 | Soft warn &gt;300 obiektów (MR-05) — nice-to-have w P1 |
| 12 | Opcjonalnie UI step grid 5/10/20 (DF §6.2) |

### 5.2 OUT (P1)

| Element | Slice |
|---------|-------|
| PDF / podgląd / druk | **P2** |
| ZIP `Rysunki/` | **P3** |
| Punkty pomiarowe / elektryczne / rozdzielnia | **P4** |
| Auto-attach drzwi do ściany (inteligentne) | stretch / P1.1 |
| Skala metryczna kalibrowana | OUT / później |
| Nowa npm lib · upload symboli · DWG | **ZAKAZ** |
| Nowy KV / zmiana merge LWW semantyki | **ZAKAZ** |
| Payroll / Schematy renderer | **ZAKAZ** |
| Zmiana `schemaVersion` na 2 (o ile additive) | **NIE** |

### 5.3 Acceptance Criteria (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| AC-P1-01 | Drzwi · okno · wymiar · wentylacja · piec z biblioteki (EPIC) |
| AC-P1-01b | Strzałka (jeśli IN) · Opis pomieszczenia (tool text) |
| AC-P1-02 | Duplikuj zaznaczenie z offsetem |
| AC-P1-03 | draft → final wg §4.5 |
| AC-P1-04 | Brak nowej npm dependency |
| AC-P1-05 | Flip/obrót drzwi widoczny w SVG |
| AC-P1-06 | Flaga OFF nadal ukrywa tab |
| AC-P1-07 | schemaVersion dokumentów = 1 (roundtrip P0→P1) |

---

## 6. Propozycja DESIGN FREEZE (P1)

> Dokument DF P1 = **amend / slice freeze** względem EPIC DF — nie rewrite całego EPICu.

### 6.1 Do zamrożenia w DF P1

1. **IN/OUT** §5 tego AUDIT.  
2. **schemaVersion = 1** · lib version bump policy.  
3. **Pola drzwi:** `flipH` **lub** `swingSide` (wybrać jedną).  
4. **D-P1-DIM-01** jednostka wymiaru.  
5. **D-P1-ARR-01** strzałka IN (A) / OUT.  
6. **D-P1-ROOM-01** opis = text preset (**A**).  
7. **wallRefId:** OUT P1 vs opcjonalny.  
8. **AC-P1-*** lista finalna.  
9. **Allowlist plików** (symbols · types · normalize · render · editor · panel draft/final · tests · changelog).  
10. **Flaga:** bez nowej flagi slice (ta sama `kw-wm-rysunki-01`) — **chyba że** Owner chce `…-p1` (AUDIT rekomenduje **jedną** flagę).

### 6.2 Pliki / obszary (orientacyjne allowlist)

```text
src/lib/wm-technical-drawings/types.ts
src/lib/wm-technical-drawings/normalize.ts
src/lib/wm-technical-drawings/render-svg.ts
src/lib/wm-technical-drawings/symbols/**          (NOWY)
src/lib/wm-technical-drawings/report.ts           (final / dup element helpers)
src/app/WmPrintDrawingEditor.tsx
src/app/WmPrintDrawingsPanel.tsx                  (draft→final CTA)
scripts/test-wm-rysunki-01-p1.mjs                 (NOWY)
src/app/changelog-data.ts · CHANGELOG.md
docs/architecture/WM-RYSUNKI-01-P1-* 
```

**Bez:** `cloud-sync.ts` merge rewrite · Payroll · ZIP · PDF generators.

### 6.3 Kolejność po AUDIT

```text
Owner GO DESIGN FREEZE (P1)
  → ARCHITECTURE REVIEW (P1)   [opcjonalnie thin, jeśli DF bez CORE]
  → Owner GO IMPLEMENT P1
  → OV → COMMIT allowlist → PUSH → PV → CLOSE
```

---

## 7. REUSE mapa (skrót)

| Potrzeba P1 | Reuse z |
|-------------|---------|
| Tab / flaga / KV / LWW | P0 |
| Snap / grid / undo / autosave | P0 editor |
| Two-click line | wall tool → dimension (+ arrow) |
| Stamp + drag | text tool → door/window/vent/boiler |
| Document duplicate | P0 panel |
| Element duplicate | nowy, wzorzec offset jak DF §6.4 |
| Soft warn N objects | MR-05 |
| Draft/final validate | `validateForSave` P0 + UI |

---

## 8. Werdykt AUDIT

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy P1 jest wykonalny na P0? | **TAK** |
| Czy trzeba `schemaVersion: 2`? | **NIE** (additive + DF amend dla strzałki) |
| Czy trzeba nowy KV / lib npm? | **NIE** |
| Czy autosave/undo/LWW wymagają redesignu? | **NIE** |
| Blokery? | **NIE** (otwarte decyzje DF: flip, strzałka, wymiar jednostka) |
| Gotowość do DF? | **TAK** |

```text
AUDIT P1: COMPLETE · READY FOR DESIGN FREEZE

IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE

STOP — czekaj na Owner GO DESIGN FREEZE.
```

---

## 9. Artefakty

| Dokument | Rola |
|----------|------|
| Ten plik | **P1 AUDIT SSOT** |
| [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) | EPIC DF (parent) |
| [`WM-RYSUNKI-01-P0-CLOSEOUT.md`](./WM-RYSUNKI-01-P0-CLOSEOUT.md) | P0 CLOSED |
| Następny | `WM-RYSUNKI-01-P1-DESIGN-FREEZE.md` (po Owner GO) |
