# WM-RYSUNKI-01 — DESIGN FREEZE

> **ID:** WM-RYSUNKI-01-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 — Rysunki techniczne w Odbiorach WM  
> **FAZA:** **DESIGN FREEZE**  
> **STATUS:** **DESIGN FREEZE · FROZEN** · gotowy do **ARCHITECTURE REVIEW**  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO MIGRATION** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **ACCEPTED**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-AUDIT.md`](./WM-RYSUNKI-01-AUDIT.md)  
> **Living SSOT:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Powiązane:** ARCHITECTURE § **12.1.8** · § **12.1.10** · § **12.1.21** · § **15.5–15.6**  
> **Handoffy reuse:** [`../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) · [`../SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](../SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) · [`../WM-SCHEMATY-V1-DESIGN-FREEZE.md`](../WM-SCHEMATY-V1-DESIGN-FREEZE.md)  
> **Baseline:** UI **2.65.95** · feature tip MS P2 **`18830c1`** · Protected Core **GREEN** · STABILIZATION WINDOW **ACTIVE**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 DESIGN FREEZE — FROZEN

Produkt: szybki edytor szkiców technicznych odbiorowych
  w Odbiorach WM → zakładka Rysunki
  ≠ AutoCAD · ≠ BIM · ≠ edytor architektoniczny

SSOT = model JSON (objects[]) → render SVG
PDF / Druk / ZIP = derivaty (nie SSOT)
Biblioteka symboli = ZAMKNIĘTA (SVG)
Snap/Grid · Undo/Redo · Duplikuj · Auto Save · Podgląd PDF
Formaty A4/A3 · szablony · nazewnictwo · Drukuj
UX: typowy szkic odbiorowy ≤ 2–3 minuty

IMPLEMENT zakazany do: Owner GO IMPLEMENT (po AR PASS)
════════════════════════════════════════════════════════
```

---

## 0. Cel produktu (zamrożony · 1 zdanie)

**Rysunki** w Odbiorach WM umożliwiają szybkie tworzenie, ponowne otwarcie i eksport prostych szkiców technicznych powiązanych z Robotą (rzuty / pomieszczenia / oznaczenia), bez CAD.

### 0.1 Zasada UX (zamrożona · Owner)

> **Wykonanie typowego szkicu odbiorowego nie powinno zajmować więcej niż 2–3 minuty.**

**Definicja „typowego szkicu” (AC):**  
szablon „Rzut mieszkania” lub pusty arkusz A4 → obrys 4–8 ścian → 1–2 drzwi → 1–2 okna → 1–2 teksty → zapis draft → podgląd PDF — **bez** punktów pomiarowych, **bez** wymiarowania pełnego lokalu, **bez** A3.

**Konsekwencje DF (must):**

| Obszar | Wymaganie wynikające z 2–3 min |
|--------|--------------------------------|
| Start | Szablony startowe (nie pusty chaos) |
| Narzędzia | Zamknięta paleta · duże hit-targety · brak multi-dialogów |
| Snap/Grid | Domyślnie ON (przyspiesza geometrię) |
| Auto Save | Bez ręcznego „Zapisz” jako bramki pracy |
| Duplikuj / Undo | Skraca poprawki |
| OUT | Freehand · warstwy · właściwości CAD · wymuszanie punktów |

---

## 1. PAYROLL SAFETY GATE (wynik przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01

G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE key + drawing docs — bez Storage CORE / LP)
G3 Cloud Sync:   TAK*  (*NOWY DATA_KEY kw-wm-technical-drawings + merge LWW
                        — wzorzec Schematy; ZERO rewrite payroll merge /
                        ZERO change finalizePayrollBundleMerge)
G4 Bootstrap:    NIE*  (*tylko podpięcie nowego klucza jak inne AUX — bez payroll path)
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE*  (*tylko WmPrintTab union — bez App shell rewrite)

Wynik: FEATURE · Cloud AUX KEY (jak Schematy)
Owner GO CORE: NIE (o ile IMPLEMENT trzyma się merge LWW per id + pushKeys)
Owner GO IMPLEMENT: dopiero po AR PASS + osobnym GO
Payroll / Hours-wipe / carry = OUT
```

Naruszenie payroll merge / Edge payroll / hours = **STOP** · amend DF.

---

## 2. Zakres EPICu i zasady niepodlegające dyskusji

| # | Założenie FROZEN |
|---|------------------|
| 1 | Osobna domena `wm-technical-drawings/` — **nie** część Schematów / EM / worker sketch |
| 2 | Zakładka **Rysunki** w WM Druk (`WmPrintTab = "rysunki"`) |
| 3 | Rysunek należy do **Roboty**; **wiele** rysunków na jedną robotę |
| 4 | SSOT = **edytowalny model** (`objects[]`); **nie** PDF-as-storage |
| 5 | Render = **SVG** z modelu; Canvas **nie** jest SSOT |
| 6 | **Zamknięta** biblioteka symboli SVG (wersjonowana w kodzie) |
| 7 | Punkty pomiarowe / elektryczne / rozdzielnia = **opcjonalne**; **nigdy** nie blokują zapisu |
| 8 | PDF / Drukuj / ZIP = generowane on-demand |
| 9 | ZIP paczki: folder **`Rysunki/`** (Schematy nadal **poza** ZIP) |
| 10 | **Brak** nowej dependency rysunkowej (Fabric/Konva/Excalidraw = OUT) |
| 11 | UX 2–3 min = kryterium akceptacji produktowej |
| 12 | Kolizja nazwy z checklistą `documents.rysunek` / worker „Obrys” = **OUT mapowania** |

### 2.1 Nawigacja WM Druk (FROZEN — decyzja D1 = Owner A)

```text
Odbiory | Rysunki | Pomiary | Schematy | Katalog Pomiarów | Szablony | Historia | Ustawienia
```

| Pole | Wartość FROZEN |
|------|----------------|
| **Tab key** | `"rysunki"` |
| **Label UI** | `Rysunki` |
| **Hint / Guide** | „Rysunki techniczne (Odbiory)” — odróżnienie od checklisty Roboty |
| **Pozycja** | zaraz po **Odbiory**, przed **Pomiary** |
| **Deep link** | `WmPrintPendingNavigation.tab = "rysunki"` + opcjonalnie `jobId` |

---

## 3. Decyzje otwarte z AUDIT — zamknięte

| ID | Pytanie | Decyzja FROZEN |
|----|---------|----------------|
| **D1** | Kolejność taba | **A** — po Odbiory |
| **D2** | `jobId` | Przy tworzeniu z kontekstu roboty: **`jobId` wymagany**, `linkStatus: "linked"`. Dozwolone **`detached` / `manual`** (jak Schematy) przy odpięciu / ręcznym adresie — **nie** blokuje edycji |
| **D3** | PDF wektor vs raster | **B** (SVG → PNG @2× → pdf-lib) w slice PDF · **P2.1** wektor (A) tylko jeśli OV jakości druku FAIL |
| **D4** | Draft w ZIP | **Tylko `status: "final"`** w paczce produkcyjnej · draft **OUT** z ZIP |
| **D5** | Checkbox ZIP | **ON** domyślnie, gdy job ma ≥1 rysunek `final`; OFF gdy brak final |
| **D6** | Nowa lib | **NONE** |
| **D7** | Checklist / worker sketch | **OUT** — zero auto-link / zero migracji |
| **D8** | Nazwa KV | **`kw-wm-technical-drawings`** |

---

## 4. Model danych SSOT (FROZEN)

### 4.1 Identyfikatory i ścieżki

| Element | Wartość FROZEN |
|---------|----------------|
| **KV** | `kw-wm-technical-drawings` |
| **Folder domeny** | `src/lib/wm-technical-drawings/` |
| **Entity** | `WmTechnicalDrawing` |
| **schemaVersion** | `1` |
| **Merge** | LWW per `id` (`updatedAt`) — wzorzec Schematy |
| **Push** | `pushKeysToCloud(["kw-wm-technical-drawings"])` |
| **UI** | `WmPrintDrawingsPanel` · `WmPrintDrawingEditor` |
| **Feature flag** | `kw-wm-rysunki-01` default **OFF** (tip parity; UI zakładki widoczna tylko gdy ON **lub** wg AR — patrz §4.1a) |

#### 4.1a Flaga UI (FROZEN)

| Stan flagi | Zachowanie |
|------------|------------|
| **OFF** | Zakładka **ukryta** · brak nowych zapisów z UI · istniejące dane w KV (jeśli kiedyś powstały) **nie kasować** |
| **ON** | Pełny UI Rysunki |

Flaga **nie** jest w ZIP/PDF path jako wymóg runtime poza UI gate (generatory testowe mogą omijać UI).

### 4.2 Typy wyliczeniowe (FROZEN)

```text
DrawingStatus       = "draft" | "final"
DrawingLinkStatus   = "linked" | "detached" | "manual"
DrawingPageFormat   = "A4" | "A3"
DrawingPageOrient   = "portrait" | "landscape"
DrawingTemplateId   =
  | "blank"
  | "floor_plan_apartment"
  | "boiler_room"
  | "basement"
  | "garage"
  | "distribution_room"
  | "works_sketch"

DrawingObjectType   =
  | "wall"
  | "door"
  | "window"
  | "text"
  | "dimension"
  | "ventilation"
  | "gas_boiler"
  | "measurement_point"      // opcjonalne · P4
  | "electrical_point"       // opcjonalne · P4
  | "distribution_board"     // opcjonalne · P4 · ≠ schemat jednokreskowy
```

### 4.3 Entity `WmTechnicalDrawing` (FROZEN kontrakt)

```typescript
/** SSOT — WM-RYSUNKI-01 DESIGN FREEZE · schemaVersion 1 */
interface WmTechnicalDrawing {
  id: string;
  schemaVersion: 1;

  title: string;                 // wyświetlana nazwa (PL)
  templateId: DrawingTemplateId; // szablon startowy (audit / UX)
  status: DrawingStatus;         // draft | final

  jobId?: string;
  linkStatus: DrawingLinkStatus;
  address?: string;              // snapshot / manual — do nagłówka PDF
  documentDate: string;          // YYYY-MM-DD
  notes?: string;

  page: {
    format: DrawingPageFormat;   // A4 | A3
    orientation: DrawingPageOrient;
    /** Wewnętrzny układ arkusza w jednostkach rysunku (px logiczne). */
    width: number;
    height: number;
  };

  /** SSOT geometrii — jedyne źródło prawdy edycji. */
  objects: DrawingObject[];

  grid: {
    enabled: boolean;            // domyślnie true
    step: number;                // domyślnie 10 (px logiczne)
    snap: boolean;               // domyślnie true
  };

  /** Opcjonalny cache renderu — NIE SSOT; wolno odrzucić przy load. */
  renderedSvg?: string;
  renderVersion?: number;

  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}
```

### 4.4 `DrawingObject` (FROZEN — discriminated union)

Wspólne pola:

```text
id: string
type: DrawingObjectType
rotation?: number          // stopnie; default 0
locked?: boolean           // default false · OUT multi-lock UX w P0
zIndex?: number            // default kolejność tablicy
```

| type | Pola geometryczne / props (minimum) |
|------|-------------------------------------|
| `wall` | `x1,y1,x2,y2` · `thickness?` (default stały z symboliki) |
| `door` | `x,y` · `width?` · `wallRefId?` (opcjonalne przyklejenie) · `symbolId` |
| `window` | jak door |
| `text` | `x,y` · `content` · `fontSize?` |
| `dimension` | `x1,y1,x2,y2` · `label?` (auto z długości jeśli puste) |
| `ventilation` | `x,y` · `symbolId` · `rotation?` |
| `gas_boiler` | `x,y` · `symbolId` · `rotation?` |
| `measurement_point` | `x,y` · `label?` · `symbolId` — **nigdy required** |
| `electrical_point` | `x,y` · `label?` · `symbolId` |
| `distribution_board` | `x,y` · `label?` · `symbolId` |

`symbolId` ∈ **zamkniętej** biblioteki (§5). Nieznany `symbolId` przy normalize → fallback symbol `unknown` **lub** drop obiektu z logiem (DF: **fallback + zachowaj obiekt** — nie gub danych).

### 4.5 Reguły zapisu (FROZEN)

| Reguła | Wartość |
|--------|---------|
| Minimalny save | `id` + `title` (non-empty trim) + `schemaVersion` + `objects` (array, może być `[]`) + timestamps |
| Punkty pomiarowe | **0 wymaganych** |
| Pusta geometria | **dozwolona** (szablon / draft) |
| `final` | wymaga `title` + (`jobId` linked **lub** `address` non-empty) — bez wymogu obiektów specjalnych |
| PDF-as-only | **ZAKAZ** |
| Walidacja export PDF | może ostrzegać „pusty rysunek”; **nie** blokuje save draft |

### 4.6 Zakazy modelu

| Zakaz | Powód |
|-------|--------|
| Embed w `kw-electrical-schematics` | ZERO DUPLICATE |
| Wymaganie RAP / EM | OUT |
| Bitmapa / dataURL jako SSOT geometrii | łamie re-edit |
| User-uploaded custom symbols w MVP | biblioteka zamknięta |
| Sync do `workerReports.sketch` | OUT |

---

## 5. Zamknięta biblioteka symboli SVG (FROZEN)

### 5.1 Zasady

| # | Reguła |
|---|--------|
| 1 | Symbole = **kod źródłowy** w `src/lib/wm-technical-drawings/symbols/` (SVG paths / fragments) |
| 2 | Katalog **zamknięty** w `schemaVersion: 1` — lista ID poniżej |
| 3 | **Brak** uploadu symboli przez UI |
| 4 | **Brak** importu z DWG/DXF |
| 5 | Wersja biblioteki: `DRAWING_SYMBOL_LIBRARY_VERSION = 1` (osobna od `schemaVersion` dokumentu) |
| 6 | Zmiana kształtu symbolu = bump `DRAWING_SYMBOL_LIBRARY_VERSION` + opcjonalny `renderVersion` |
| 7 | Nowe symbole poza listą = **amend DF** lub `schemaVersion: 2` |

### 5.2 Katalog symboli v1 (FROZEN ID)

| symbolId | Użycie | Slice |
|----------|--------|-------|
| `wall-default` | linia ściany (stroke) | P0 |
| `door-swing` | drzwi | P1 |
| `window-rect` | okno | P1 |
| `vent-grid` | wentylacja | P1 |
| `gas-boiler` | piec gazowy | P1 |
| `text-label` | (render tekstu; niekoniecznie SVG sprite) | P0 |
| `dimension-line` | wymiar | P1 |
| `point-measure` | punkt pomiarowy | P4 |
| `point-electrical` | punkt elektryczny | P4 |
| `board-distribution` | rozdzielnia (ikona planu) | P4 |
| `unknown` | fallback | always |

**OUT v1:** dowolne symbole IEC ze Schematów (inne domeny — **nie** kopiować `iec-simplified` bez potrzeby; rozdzielnia planu ≠ schemat jednokreskowy).

---

## 6. Edytor — zachowanie (FROZEN)

### 6.1 Architektura UI

| Warstwa | Decyzja |
|---------|---------|
| Lista | Panel jak Schematy: search · filtr draft/final · filtr job · utwórz · otwórz · duplikuj rysunek · usuń |
| Edytor | Pełny obszar roboczy + toolbar narzędzi + właściwości lekkie (tekst) |
| Render | Model → SVG (podgląd live) |
| Interakcja | Pointer events na SVG / hit targets · **nie** Canvas SSOT |
| Mobile | Drill-in wzorzec WM (jak Schematy / Roboty) — edycja możliwa; priorytet desktop odbiorów |

### 6.2 Snap / Grid (FROZEN)

| Parametr | Wartość FROZEN |
|----------|----------------|
| Grid domyślnie | **enabled: true** |
| Snap domyślnie | **snap: true** |
| Step domyślny | **10** (px logiczne) |
| UI | Toggle Grid · Toggle Snap · (opcjonalnie wybór step: 5/10/20 — P1) |
| Zachowanie | Przy rysowaniu/przesuwaniu współrzędne snap do wielokrotności `step` gdy `snap` |
| Wyłączenie | Dozwolone (użytkownik) — nie łamie UX 2–3 min (domyślnie ON) |

### 6.3 Undo / Redo (FROZEN)

| Parametr | Wartość FROZEN |
|----------|----------------|
| Zakres | **Sesja edytora** (in-memory stack) |
| Granularność | Po komendzie: add / move / delete / duplicate / property change / batch |
| Głębokość | min. **50** wpisów |
| Persist stack | **NIE** — po zamknięciu edytora stack ginie; dokument w KV zostaje |
| UI | Przyciski Undo/Redo + skróty Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) |
| Sync | Undo **nie** generuje osobnego audytu cloud |

### 6.4 Duplikowanie elementów (FROZEN)

| Akcja | Zachowanie |
|-------|------------|
| Duplikuj zaznaczenie | Nowe `id` · offset (+grid step, +grid step) · to samo `type`/props |
| Duplikuj cały rysunek | Nowy dokument: `title` + „ (kopia)” · `status: draft` · ten sam `jobId` · nowe `id`/`timestamps` |
| Slice | Elementy: **P1** · cały rysunek: **P0** (lista) |

### 6.5 Auto Save (FROZEN)

| Parametr | Wartość FROZEN |
|----------|----------------|
| Tryb | **Auto Save** po zmianie modelu |
| Debounce | **800–1200 ms** po ostatniej zmianie |
| Cel | local state → `commit*` → `pushKeysToCloud` (wzorzec AUX) |
| Wskaźnik UI | „Zapisano” / „Zapisywanie…” / błąd (bez modal spam) |
| Brama „Zapisz” | **Nie wymagana** do kontynuacji pracy; opcjonalny przycisk „Zapisz teraz” = flush |
| Audit | **ZAKAZ** `drawing_edited` per auto-save · audit tylko: create / delete / status→final / pdf / zip (§10) |
| Konflikt LWW | Ostatni `updatedAt` wygrywa (jak Schematy) — bez OT/CRDT |

### 6.6 Narzędzia vs slice

| Narzędzie | Slice | Uwagi |
|-----------|-------|--------|
| Select / Move / Delete | P0 | Must |
| Ściana | P0 | Must |
| Tekst | P0 | Must |
| Pan / Zoom proste | P0 | Must (min. zoom fit) |
| Grid / Snap toggle | P0 | Must |
| Undo / Redo | P0 | Must (nawet wąski stack) |
| Duplikuj rysunek (lista) | P0 | Must |
| Drzwi / Okno | P1 | Must MVP toolset |
| Wymiar / Wentylacja / Piec | P1 | Must |
| Duplikuj elementy | P1 | Must |
| Draft → Final | P1 | Must |
| Punkt pomiarowy / el. / rozdzielnia | P4 | Opcjonalne narzędzia |
| Freehand | **OUT** | — |

---

## 7. Szablony nowych rysunków (FROZEN)

### 7.1 Flow „Nowy rysunek”

1. Wybór **roboty** (jeśli nie z kontekstu `jobId`).  
2. Wybór **szablonu** (`DrawingTemplateId`).  
3. Wybór **formatu** A4/A3 + orientacji (domyślnie per szablon).  
4. Utworzenie dokumentu `draft` + opcjonalny seed obiektów (lekki obrys / legend placeholder — **bez** wymuszania punktów).  
5. Otwarcie edytora.

### 7.2 Szablony v1

| templateId | Tytuł startowy (PL) | Format domyślny | Orientacja | Seed |
|------------|---------------------|-----------------|------------|------|
| `blank` | „Nowy rysunek” | A4 | landscape | puste `objects` |
| `floor_plan_apartment` | „Rzut mieszkania” | A4 | landscape | opcjonalna ramka pomocnicza (4 ściany przewodnik — **nie** obowiązek) |
| `boiler_room` | „Kotłownia” | A4 | portrait | puste + title |
| `basement` | „Piwnica” | A4 | landscape | puste + title |
| `garage` | „Garaż” | A4 | landscape | puste + title |
| `distribution_room` | „Rozdzielnia” | A4 | portrait | puste + title |
| `works_sketch` | „Szkic robót” | A4 | landscape | puste + title |

**Zasada UX:** szablon ustawia **tytuł + page + templateId**; nie uruchamia kreatora wieloetapowego > 2 kliknięć po wyborze szablonu.

### 7.3 A4 / A3 (FROZEN)

| Format | Rozmiar logiczny arkusza (px) FROZEN* | PDF mm |
|--------|--------------------------------------|--------|
| A4 landscape | 842 × 595 | 297 × 210 |
| A4 portrait | 595 × 842 | 210 × 297 |
| A3 landscape | 1191 × 842 | 420 × 297 |
| A3 portrait | 842 × 1191 | 297 × 420 |

\*Skala 1 PDF-pt ≈ 1 px logiczny przy eksporcie (jak typowe mapowanie A4 pt). Dokładne stałe w kodzie = te liczby (±0 w DF).

| Reguła | Wartość |
|--------|---------|
| Zmiana formatu po utworzeniu | Dozwolona (P1); obiekty **nie** skalują się auto — użytkownik dopasowuje (thin; unikamy „magii CAD”) |
| Domyślny nowy | A4 landscape (szablony mogą nadpisać) |

---

## 8. Nazewnictwo (FROZEN)

### 8.1 Tytuł w UI / modelu

- Użytkownik edytuje `title` (PL, free text).  
- Szablon ustawia tytuł startowy (§7.2).  
- Duplikat dokumentu: `"{title} (kopia)"` (jeśli nie koliduje z limitem długości — trim 120 znaków).

### 8.2 Nazwa pliku PDF / Druk

```text
RYSUNEK_{ADDRESS_OR_JOB_SLUG}_{TITLE_SLUG}_{YYYY-MM-DD}.pdf
```

| Segment | Reguła |
|---------|--------|
| `ADDRESS_OR_JOB_SLUG` | `catalogAddressSlug(address)` jeśli address; else slug z numeru/nazwy roboty; else `robota` |
| `TITLE_SLUG` | slug z `title` (ASCII fold · `_` · max 40) |
| `YYYY-MM-DD` | `documentDate` |
| Kolizje w ZIP | suffix `_{shortId}` (6 znaków z `id`) gdy duplikat nazwy w tym samym folderze |

Przykład: `RYSUNEK_ul_Kwiatowa_12_45_rzut_mieszkania_2026-08-03.pdf`

### 8.3 Folder ZIP

```text
Rysunki/
```

Stała: `WM_PRINT_ZIP_FOLDER_RYSUNKI = "Rysunki"`.

---

## 9. PDF · Podgląd PDF · Drukuj (FROZEN)

### 9.1 Generator PDF

| Element | Wartość FROZEN |
|---------|----------------|
| Lib | **`pdf-lib`** + fontkit + **`wm-print-pdf-fonts`** (Noto) |
| Pipeline P2 | **B:** `renderDrawingSvg(model)` → raster PNG @2× → embed w PDF |
| Strona | 1 strona = 1 rysunek · rozmiar wg `page.format` + `orientation` |
| Draft | watermark **„WERSJA ROBOCZA”** (semantyka Schematy) |
| Final | bez watermarku roboczego |
| Nagłówek | `title` · `address` · `documentDate` · (opcjonalnie nr roboty) |
| Cache bytes w KV | **OUT MVP** |

### 9.2 Podgląd PDF (FROZEN)

| Parametr | Wartość |
|----------|---------|
| Akcja UI | **„Podgląd PDF”** w edytorze i/lub na karcie listy |
| Zachowanie | Generacja on-demand → podgląd w modal / nowa karta blob URL |
| Slice | **P2** (razem z eksportem) |
| Wymaganie | Podgląd **przed** lub **zamiast** natychmiastowego download — użytkownik może „Pobierz” z podglądu |
| Performance | Nie blokować Auto Save; generacja async + spinner |

### 9.3 Pobierz PDF

| Akcja | „Pobierz PDF” → `saveAs` z nazwą §8.2 |
| Audit | `drawing_pdf_exported` |
| Slice | P2 |

### 9.4 Drukuj (FROZEN)

| Parametr | Wartość FROZEN |
|----------|----------------|
| Akcja UI | **„Drukuj”** |
| Implementacja | Wygeneruj PDF (ten sam generator co Pobierz) → `iframe` / blob + `window.print()` **lub** otwórz PDF i print dialog |
| **Zakaz** | Osobny CSS print layout rozjeżdżający się vs PDF (jeden tor wizualny) |
| Draft | Druk z watermarkiem roboczym |
| Slice | **P2** (razem z PDF) |
| Audit | `drawing_printed` (opcjonalnie; jeśli trudne do wykrycia sukcesu dialogu — audit na „otwarcie toru druku”) |

---

## 10. ZIP odbiorowy (FROZEN)

### 10.1 Kontrakt

| Element | Wartość |
|---------|---------|
| Opcja | `includeDrawings: boolean` w `WmPrintDeliveryZipOptions` |
| Folder | `Rysunki/` |
| Zawartość | PDF wszystkich rysunków joba ze **`status: "final"`** |
| Draft | **OUT** z ZIP |
| Helper | `appendDrawingsPdfToZip(...)` (nowy, analog EM) |
| UI Odbiory | Checkbox „Dołącz rysunki” · default § D5 |
| Manifest | `DeliveryPackageManifestFolder` **+= `"Rysunki"`** (additive) |
| Fingerprint | uwzględnia pliki w `Rysunki/` |
| Schematy PDF | **nadal OUT** tego EPICu |

### 10.2 Breaking vs additive

Zmiana manifestu = **additive** (stare paczki bez folderu nadal valid).  
Testy: normalize · `folderFromPath` · groupBy folder · smoke ZIP z 0 i N rysunków.

### 10.3 Slice

**P3** — po stabilnym PDF (P2).

---

## 11. Sync · Backup · Audit · ACL (FROZEN)

### 11.1 Sync

```text
types → normalize → merge (LWW id) → sync → report
render-svg → export-pdf
DATA_KEYS += kw-wm-technical-drawings
BACKUP completeness += key
App.tsx: useLocalStorage + commitWmTechnicalDrawings
```

### 11.2 Audit Hub (`wm_druk`)

| Akcja | Kiedy |
|-------|--------|
| `drawing_created` | nowy dokument |
| `drawing_deleted` | usunięcie |
| `drawing_duplicated` | duplikat dokumentu |
| `drawing_finalized` | status → final |
| `drawing_pdf_exported` | pobranie PDF |
| `drawing_printed` | tor Drukuj |
| `drawing_zip_included` | (opcjonalnie) przy build ZIP z ≥1 plikiem |

**ZAKAZ:** `drawing_edited` / flood Auto Save (lekcja Schematy).

### 11.3 ACL (FROZEN)

| Rola | Lista / podgląd | Edycja / create | PDF / Druk / ZIP |
|------|-----------------|-----------------|------------------|
| `super_admin` | TAK | TAK | TAK |
| `admin` | TAK | TAK | TAK |
| `moderator` | TAK | TAK* | TAK |
| Inspektor | **NIE** w MVP (OUT) — paczka ZIP po stronie admina | — | odbiór przez publikację ZIP |
| Worker | **NIE** | — | — |

\*Moderator: bez stawek — Rysunki nie zawierają stawek → **TAK** edycja.  
Jeśli AR wymaga ograniczenia moderatora → amend DF.

### 11.4 Relacje OUT

- Worker `sketch` upload  
- Checklist `documents.rysunek`  
- Auto-import z EM / Schematów  

---

## 12. Hard OUT (FROZEN)

```text
OUT WM-RYSUNKI-01 (cały EPIC, wszystkie slice):
  AutoCAD / DWG / DXF / BIM
  Freehand / krzywa Bezier / hatch CAD
  Warstwy / XREF / bloki użytkownika
  Upload własnych symboli
  PDF lub PNG jako jedyny zapis
  Obowiązkowe punkty pomiarowe
  Merge do electrical-schematics / EM
  Folder Schematy/ w ZIP (ten EPIC)
  Mapowanie worker Obrys / checklist rysunek
  Nowa npm dependency rysunkowa
  Cloud CORE payroll / hours-wipe / carry rewrite
  OT/CRDT / multi-user live cursors
  Edycja przez Inspektora / Workera (MVP)
```

---

## 13. Thin slices i Acceptance Criteria

### 13.1 Mapa slice

| Slice | Cel | IN | OUT slice |
|-------|-----|-----|-----------|
| **P0** | Foundation + szkic ściana/tekst | Tab · flag · KV · CRUD · szablony · A4/A3 wybór start · grid/snap · undo/redo · autosave · duplikat dokumentu · wall+text | door/window · PDF · ZIP · points |
| **P1** | Toolset MVP | door · window · dimension · vent · boiler · duplikat elementów · draft/final · (step grid UI) | PDF · ZIP · points |
| **P2** | PDF + Podgląd + Drukuj | generator B · podgląd · pobierz · drukuj · nazewnictwo · watermark · audit pdf/print | ZIP · points |
| **P3** | ZIP delivery | includeDrawings · folder · manifest · checkbox · smoke | Schematy-in-ZIP · points |
| **P4** | Optional points | measurement/electrical/board symbols · nigdy required | CAD |

**Kolejność release:** P0 → OV → commit allowlist → push → PV → …  
Jeden slice = jeden Owner GO IMPLEMENT (lub jawny multi-slice GO).

### 13.2 AC — P0

| ID | Kryterium |
|----|-----------|
| AC-P0-01 | Zakładka `Rysunki` w kolejności FROZEN gdy flaga ON |
| AC-P0-02 | Utworzenie rysunku z szablonu + `jobId` linked · persist KV · re-open po reload |
| AC-P0-03 | Auto Save debounce działa · wskaźnik stanu |
| AC-P0-04 | Grid+Snap domyślnie ON · ściana snappuje |
| AC-P0-05 | Undo/Redo ≥1 poziom dla add wall |
| AC-P0-06 | Duplikat dokumentu na liście |
| AC-P0-07 | `validateForSave` **nie** wymaga punktów |
| AC-P0-08 | Flaga OFF → brak taba |
| AC-P0-09 | **UX:** ścieżka typowego szkicu (ściany+tekst z szablonu) mierzalna w teście ręcznym ≤ 3 min (Owner OV) |

### 13.3 AC — P1

| ID | Kryterium |
|----|-----------|
| AC-P1-01 | Drzwi · okno · wymiar · wentylacja · piec z biblioteki symboli |
| AC-P1-02 | Duplikuj zaznaczenie z offsetem |
| AC-P1-03 | Status draft → final wg reguł §4.5 |
| AC-P1-04 | Brak nowej npm dependency |

### 13.4 AC — P2

| ID | Kryterium |
|----|-----------|
| AC-P2-01 | Podgląd PDF zgodny z modelem (1 strona) |
| AC-P2-02 | Pobierz PDF · nazwa §8.2 |
| AC-P2-03 | Drukuj używa tego samego generatora |
| AC-P2-04 | Draft = watermark; final = bez |
| AC-P2-05 | A4 i A3 (portrait/landscape) renderują właściwy rozmiar strony |
| AC-P2-06 | Audit `drawing_pdf_exported` |

### 13.5 AC — P3

| ID | Kryterium |
|----|-----------|
| AC-P3-01 | ZIP zawiera `Rysunki/*.pdf` gdy includeDrawings + final |
| AC-P3-02 | Draft **nie** trafia do ZIP |
| AC-P3-03 | Manifest folder `"Rysunki"` · fingerprint stabilny |
| AC-P3-04 | Checkbox default ON iff ≥1 final |
| AC-P3-05 | Schematy nadal poza ZIP |

### 13.6 AC — P4

| ID | Kryterium |
|----|-----------|
| AC-P4-01 | Narzędzia punktów dostępne |
| AC-P4-02 | Rysunek bez punktów zapisuje się i finalizuje (jeśli spełnia §4.5) |
| AC-P4-03 | Brak hard-require w UI copy |

### 13.7 AC — EPIC / UX

| ID | Kryterium |
|----|-----------|
| AC-UX-01 | Typowy szkic (§0.1) ≤ **3 minuty** w Owner Verification (stoper) |
| AC-UX-02 | Copy UI nie myli z checklistą Roboty / Obrys worker |
| AC-ARCH-01 | ZERO duplicate renderer Schematów · ZERO payroll merge touch |

---

## 14. Plan testów (FROZEN oczekiwania)

| Warstwa | Zakres |
|---------|--------|
| Unit | normalize · merge LWW · slug nazwy · validateForSave (bez points) · symbol fallback |
| Unit render | SVG zawiera wall/text; grid nie w PDF jako obowiązek (grid = tylko edytor — **FROZEN:** grid **nie** drukuje się na PDF) |
| Smoke PDF | A4/A3 · draft watermark · final clean · filename |
| Smoke ZIP | 0 drawings · only draft · mixed · only final · manifest |
| Smoke UI | flaga OFF/ON · tab order · autosave · undo |
| Mobile | tab scroll · open editor drill-in (smoke) |
| Regresja | Schematy PDF · EM ZIP `Pomiary/` · Odbiory ZIP bez regresji |

**Grid na PDF:** **NIE** renderować siatki edytora na PDF/Druk (siąka = pomoc edycji).

---

## 15. REUSE / ZERO DUPLICATE (mapa)

| Bierzemy | Nie bierzemy |
|----------|--------------|
| Tab + panel pattern Schematy | `renderSchematicSvg` / bus layout / IEC |
| LWW merge + DATA_KEYS pattern | payroll paths |
| `pdf-lib` + Noto fonts | jspdf dual path |
| ZIP options + append helper pattern EM | DOCX EM |
| `wm-druk-audit` | `schematic_edited` flood |
| `catalogAddressSlug` | worker sketch upload |

---

## 16. Ryzyka residual (po freeze)

| ID | Ryzyko | Mitygacja w DF |
|----|--------|----------------|
| R1 | Effort edytora | P0 wąski toolset · no new lib |
| R4 | Manifest ZIP | additive `"Rysunki"` + testy |
| R5 | Audit flood | zakaz edited · autosave bez audit |
| R6 | Jakość raster PDF | P2.1 wektor jeśli OV FAIL |
| R7 | Scope CAD | Hard OUT §12 · UX 2–3 min |
| R-NEW | Auto Save vs LWW multi-device | accepted LWW; brak OT |
| R-NEW | A3 mobile edit | priorytet desktop; mobile view+light edit |

---

## 17. Architecture Review — checklista wejścia

AR może **PASS** tylko jeśli dokument spełnia:

- [x] Produkt i UX 2–3 min zamrożone  
- [x] Tab + kolejność  
- [x] Model + KV + merge  
- [x] Zamknięta biblioteka symboli  
- [x] Snap/Grid · Undo/Redo · Duplikuj · Auto Save  
- [x] Szablony · A4/A3 · nazewnictwo  
- [x] PDF · Podgląd · Drukuj  
- [x] ZIP · manifest · draft policy  
- [x] Audit · ACL · flaga  
- [x] Thin slices + AC  
- [x] Hard OUT  
- [x] Payroll gate  
- [x] Brak IMPLEMENT w tym kroku  

**Wyjście AR:** `WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md` (PASS / PASS WITH CHANGES / FAIL) — **nie** ten dokument.

---

## 18. Następny krok procesu

```text
DESIGN FREEZE FROZEN (ten dokument)
        ↓
ARCHITECTURE REVIEW
        ↓
Owner GO IMPLEMENT — thin slice P0
        ↓
OWNER VERIFICATION (w tym AC-UX-01 stoper 2–3 min)
        ↓
COMMIT allowlist → PUSH → PRODUCTION VERIFY → CLOSE slice
        ↓
kolejne slice P1…P4 wg GO
```

**Teraz:** **STOP**. Brak implementacji. Czekam na **Architecture Review** / Owner GO AR.

---

## 19. Metryka kompletności DF

| Sekcja AUDIT §15.1 | Pokrycie DF |
|--------------------|-------------|
| Produkt | §0 |
| Tab | §2.1 |
| Model SSOT | §4 |
| Save rules | §4.5 |
| Editor MVP | §6 |
| Render SVG | §2 · §6.1 |
| PDF | §9 |
| ZIP | §10 |
| Sync | §11.1 |
| Audit | §11.2 |
| ACL | §11.3 |
| OUT | §12 |
| AC | §13 |
| Test plan | §14 |
| Owner extras (symbole, snap, undo, dup, autosave, preview, A4/A3, nazwy, szablony, druk, UX 2–3 min) | §0.1 · §5–§9 |

**STATUS:** **DESIGN FREEZE COMPLETE · FROZEN · READY FOR ARCHITECTURE REVIEW**
