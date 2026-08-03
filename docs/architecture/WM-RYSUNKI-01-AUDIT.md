# WM-RYSUNKI-01 — AUDIT

> **ID:** WM-RYSUNKI-01-AUDIT  
> **EPIC:** WM-RYSUNKI-01 — Rysunki techniczne w Odbiorach WM  
> **FAZA:** **AUDIT**  
> **STATUS:** **AUDIT COMPLETE** · **WAITING FOR OWNER GO → DESIGN FREEZE**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO MIGRATION** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** (EPIC WM-RYSUNKI-01)  
> **Living SSOT:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Powiązane:** ARCHITECTURE § **12.1.8** (WM Druk) · § **12.1.10** (Pomiary) · § **12.1.21** (Schematy) · § **15.5–15.6** (Audit Hub WM)  
> **Handoffy reuse:** [`../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) · [`../SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](../SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) · [`../SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](../SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 AUDIT — szkice techniczne odbiorowe

CEL: nowa zakładka Odbiory WM → Rysunki
≠ AutoCAD · ≠ edytor architektoniczny
= szybki edytor szkiców technicznych (ściana/drzwi/okno/…)

SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · THIN SLICE
Zapis = edytowalny model (nie tylko PDF)
PDF = eksport · ZIP paczki = folder Rysunki/

STATUS: AUDIT COMPLETE · NIE IMPLEMENT
NEXT: Owner GO → DESIGN FREEZE
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT

| Pytanie | Cel |
|---------|-----|
| Co budujemy? | Moduł **Rysunki** w **Odbiorach WM Druk** — proste szkice techniczne powiązane z **Robotą** |
| Czego nie budujemy? | AutoCAD · BIM · edytor architektoniczny · pełny CAD · obowiązkowe punkty pomiarowe |
| Co ma działać? | Tworzenie / edycja / ponowne otwarcie · wiele rysunków na robotę · PDF pojedynczy · PDF w ZIP odbiorowym |
| Co REUSE? | Wzorzec Schematy (tab + KV + panel) · ZIP jak Pomiary · PDF stack `pdf-lib` + fonty WM |
| Co nie ruszać? | Cloud CORE payroll · ZI Tauron · merge EM · renderer Schematów · worker `sketch` upload bez decyzji produktowej |
| OUT tego AUDIT | IMPLEMENT · migracje · commit/push · wybór lib bez DF · wireframe pixel |

---

## 1. Production / sesja baseline

| Pole | Wartość |
|------|---------|
| **UI** | **2.65.95** (tip SSOT [`09`](../AI/09_PRODUCTION_BASELINE.md)) |
| **Feature tip (MS P2)** | **`18830c1`** |
| **Branch** | `main` |
| **Tryb** | **UTRZYMANIE** · STABILIZATION WINDOW ACTIVE |
| **Open EPIC przed GO** | **NONE** → ten AUDIT = start **WM-RYSUNKI-01** (faza AUDIT only) |
| **MS P3-B / SMART P3 / CM-04** | **OUT** — nie mieszać z tym EPICiem |
| **Lokalny WIP** | Może istnieć (Bid Guard itd.) — **nie** ruszać · stage tylko allowlist |

---

## 2. Analiza architektury Odbiorów WM

### 2.1 Powierzchnia produktu

| Element | Wartość |
|---------|---------|
| **View admin** | `wmprint` — lazy `WmPrintView` |
| **Nav** | `admin-nav.ts` · label „Odbiory WM Druk” · sidebar Operacje |
| **Routing zakładek** | lokalny `useState` / `initialTab` — **nie** React Router |
| **Deep link** | `WmPrintPendingNavigation` · Audit Hub → `{ view: "wmprint", tab, jobId? }` |
| **SSOT tabs** | `src/lib/wm-print/wm-print-tabs.ts` |

### 2.2 Aktualne zakładki (prod)

```text
Odbiory | Pomiary | Schematy | Katalog Pomiarów | Szablony | Historia | Ustawienia
```

Typ: `WmPrintTab = "odbiory" | "pomiary" | "schematy" | "katalog" | "szablony" | "historia" | "ustawienia"`.

### 2.3 Domeny już w module

| Zakładka | Domena | KV / dane | Persist edytowalny | Eksport | W ZIP odbiorowym |
|----------|--------|-----------|--------------------|---------|------------------|
| **Odbiory** | `src/lib/wm-print/` | templates · job-docs · settings · history | szablony + job docs | PDF/DOCX fill | **TAK** → `Odbiory/` |
| **Pomiary** | `electrical-measurements/` | pomiary + rejestr RAP | model RAP | 5× DOCX | **TAK** (opcjonalnie) → `Pomiary/` |
| **Schematy** | `electrical-schematics/` | `kw-electrical-schematics` | model + auto-SVG | PDF (raster SVG) | **NIE** (świadomie poza MVP) |
| **Katalog** | katalog pomiarów | registry | — | ZIP katalogowy | osobna ścieżka |
| **Szablony / Historia / Ustawienia** | wm-print | KV WM | — | — | — |

### 2.4 Wniosek architektoniczny

Odbiory WM to **hub odbiorowy** z **osobnymi domenami** per zakładka (nie jeden monolityczny dokument).  
**Rysunki** powinny być **nową domeną** (jak Schematy), a nie rozszerzeniem `SingleLineDiagram` ani `ElectricalMeasurement`.

---

## 3. Wizja Ownera vs stan kodu

### 3.1 Wizja zakładek (Owner)

```text
Odbiory | Rysunki | Pomiary | Schematy | Katalog Pomiarów | Szablony | Historia | Ustawienia
```

### 3.2 Rekomendacja osadzenia

| Opcja | Kolejność | Werdykt |
|-------|-----------|---------|
| **A — Owner vision** | Odbiory → **Rysunki** → Pomiary → Schematy → … | **REKOMENDOWANA** — rysunki są częścią paczki odbiorowej (jak Odbiory/Pomiary), nie tylko dokumentacją elektryczną |
| B — Adjacent Schematy | … → Schematy → **Rysunki** → Katalog | Słabsza: sugeruje „kolejne CAD elektryczne”; Schematy ≠ rysunki rzutu |
| C — Podzakładka Schematy | brak osobnego taba | **ODRZUCONA** — inny model, inny eksport ZIP, mylący UX |

**SSOT zmiany:** `wm-print-tabs.ts` + `WmPrintView` + ikony + deep link Audit Hub + GuideView (po IMPLEMENT).

---

## 4. REUSE FIRST — co istnieje

### 4.1 Ranking reuse

| # | Kandydat | Co brać | Czego **nie** brać |
|---|----------|---------|---------------------|
| **1** | **Schematy** (infra) | Osobny KV · LWW per `id` · `jobId` + `linkStatus` · panel lista↔edytor · draft/final · PDF download · `wm-druk-audit` · deep link tab | Renderer IEC / layout bus / formularz obwodów / `circuits[]` |
| **2** | **ZIP Pomiary** | `buildWmPrintDeliveryZipBytes` · folder · checkbox „dołącz” · `append*ToZip` | DOCX templates EM |
| **3** | **PDF WM** | `pdf-lib` · `@pdf-lib/fontkit` · `wm-print-pdf-fonts` (Noto) · konwencja nazw plików | Konieczność rasteryzacji jak Schematy (opcjonalna) |
| **4** | **Audit Hub WM** | `recordWmDrukAudit` · źródło `wm_druk` | Flood `*_edited` bez briefu (lekcja Schematy) |
| **5** | Worker „Obrys” / checklist `rysunek` | — | **NIE** jako edytor — to upload zdjęcia / checkbox dokumentu |

### 4.2 Braki w repo (istotne)

- **Brak** freehand / floor-plan editora (SVG scene lub Canvas CAD).
- **Brak** bibliotek: Fabric, Konva, Paper.js, Excalidraw, svg.js.
- „Rysunek” w Robotach = **foto obrysu** lub checklista — **kolizja nazewnicza**, nie reuse funkcjonalny.
- Schematy: użytkownik edytuje **formularz** → SVG generowane; **nie** przeciąga ścian na płaszczyźnie.

### 4.3 Zależności npm (istotne)

| Pakiet | Rola dziś | Rola dla Rysunków |
|--------|-----------|-------------------|
| `pdf-lib` + `@pdf-lib/fontkit` | ZI · Schematy PDF | **REUSE** eksport PDF |
| `jszip` | ZIP odbiorowy | **REUSE** folder `Rysunki/` |
| `file-saver` | download | **REUSE** |
| `jspdf` / `pdfmake` | poza WM Druk | nie preferować (rozjazd z WM) |
| Fabric / Konva / Excalidraw | **brak** | tylko jeśli DF jawnie doda lib |

**REUSE FIRST:** P0 bez nowej dependency — edytor na **SVG + pointer events** + model obiektów w JSON.

---

## 5. SVG vs Canvas — analiza

| Kryterium | SVG (scene graph) | Canvas 2D | Hybryda |
|-----------|-------------------|-----------|---------|
| Edytowalność / re-open | **Silna** — obiekty = DOM lub model→SVG | Słaba bez własnego modelu | Model SSOT + hit-test canvas |
| Eksport PDF | Ścieżka wektorowa (pdf-lib draw) lub raster (jak Schematy) | łatwy raster, słaby wektor | — |
| Narzędzia „ściana/drzwi” | Segmenty / symbole = obiekty | rysowanie pikseli ≠ obiekty | — |
| Performance mobile | OK dla dziesiątek–setek obiektów | Lepszy przy tysiącach | overkill na MVP |
| Zgodność z projektem | Schematy już SVG | tylko raster watermark/confetti | — |
| AutoCAD-feel risk | Niski przy ograniczonym toolset | Wysoki przy freehand-first | — |

### 5.1 Rekomendacja techniczna

**SSOT = model obiektowy JSON → render SVG.**  
Interakcja: SVG overlays lub lekki hit-layer; **nie** „tylko bitmapa”.  
Canvas **opcjonalnie** później (pan/zoom performance) — **OUT P0**.

**PDF:** preferencja DF do rozstrzygnięcia:

| Wariant PDF | Plus | Minus |
|-------------|------|-------|
| **A — wektor pdf-lib** (linie/tekst z modelu) | Ostrość · mały plik · bez DOM raster | Więcej kodu mapowania symboli |
| **B — SVG→PNG→pdf-lib** (REUSE Schematy) | Szybki start · 1:1 z podglądem | Raster · watermark path już znany |

**Rekomendacja AUDIT:** DF wybiera **B na P2 thin**, z opcją **A** jako P2.1 jeśli jakość PDF za słaba w terenie.

---

## 6. Propozycja modelu danych

### 6.1 Zasady

1. Rysunek **należy do Roboty** (`jobId` wymagany w MVP linked; opcjonalnie `detached` jak Schematy — **decyzja DF**).  
2. **Wiele** rysunków na jedną robotę (rzut / kotłownia / piwnica / …).  
3. Persist = **edytowalny dokument**, nie PDF.  
4. Punkty pomiarowe = **opcjonalne obiekty** — **nigdy** nie blokują zapisu.  
5. Osobny klucz KV — **nie** mieszać z `kw-electrical-schematics` / EM / `jobAttachments`.

### 6.2 Szkic kontraktu (propozycja pod DF — nie IMPLEMENT)

```text
KV: kw-wm-technical-drawings   (nazwa finalna = DF)
Entity: WmTechnicalDrawing
  id, schemaVersion
  jobId, linkStatus?
  title                    // np. "Rzut mieszkania"
  kind?                    // enum opcjonalny: floor_plan | boiler | basement | ...
  status: draft | final
  page: { width, height, unit: "mm" | "px" }   // prosty arkusz
  objects: DrawingObject[]   // SSOT geometrii
  notes?
  createdAt, updatedAt
  // NIE wymagane: measurementPointIds, RAP, EM

DrawingObject (discriminated union):
  wall | door | window | text | dimension
  | ventilation | gas_boiler
  | measurement_point? | electrical_point? | distribution_board?   // opcjonalne narzędzia
  + id, x, y, rotation?, props per type
```

### 6.3 Zapis / sync (wzorzec REUSE)

```text
src/lib/wm-technical-drawings/   (nazwa folderu = DF)
  types.ts → normalize.ts → merge.ts (LWW per id) → sync.ts → report.ts
  render-svg.ts → export-pdf.ts
UI: WmPrintDrawingsPanel + WmPrintDrawingEditor
Wire: DATA_KEYS + App commit* + backup completeness
Audit: drawing_created | drawing_updated? | drawing_deleted | pdf_exported | zip_included?
```

**THIN:** P0 bez `drawing_updated` flood (lekcja `schematic_edited`).

### 6.4 Czego nie robić w modelu

| Zakaz | Powód |
|-------|--------|
| Zapis wyłącznie PDF w storage | Łamie wymóg re-edit |
| Wymaganie punktów pomiarowych | Owner: opcjonalne |
| Embed w `job.workEntries` / `workerReports.sketch` | Inna domena · ZERO DUPLICATE confusion |
| Rozszerzanie `SingleLineDiagram.circuits` o ściany | ZERO DUPLICATE · inny produkt |

---

## 7. Integracja PDF

### 7.1 Istniejąca ścieżka Schematy (REUSE pattern)

`generateSchematicPdf` → `renderSchematicSvg` → raster PNG @2× → `pdf-lib` A4 landscape + Noto + watermark draft.

### 7.2 Propozycja dla Rysunków

| Akcja | Zachowanie |
|-------|------------|
| **Pobierz PDF** | Generacja on-demand z modelu → download (`RYSUNEK_{slug}_{title}_{date}.pdf` — konwencja DF) |
| Persist | **nie** trzymać PDF jako SSOT (opcjonalny cache bytes = OUT MVP) |
| Draft | watermark „WERSJA ROBOCZA” (REUSE semantyki Schematy) |
| Final | czysty PDF |

### 7.3 Zależności PDF

- Fonty: `wm-print-pdf-fonts.ts`  
- Lib: `pdf-lib` (już w projekcie)  
- **Nie** wprowadzać równoległego toru jspdf „bo szybciej” bez DF.

---

## 8. Integracja ZIP odbiorowego

### 8.1 Stan dziś

`buildWmPrintDeliveryZipBytes` (`generate-zip.ts`):

```text
Odbiory/{files}
Pomiary/{5×DOCX + INDEX}   ← gdy includeMeasurements + RAP produkcyjny
```

Manifest publikacji: `DeliveryPackageManifestFolder = "Odbiory" | "Pomiary"`  
— **trzeci folder wymaga świadomej zmiany** (normalize · manifest · fingerprint · UI checkbox).

### 8.2 Propozycja

```text
Rysunki/{RYSUNEK_....pdf}   ← wszystkie rysunki joba (lub tylko status=final — DF)
```

| Element | Propozycja |
|---------|------------|
| Opcja ZIP | `includeDrawings: boolean` w `WmPrintDeliveryZipOptions` |
| UI Odbiory | checkbox „Dołącz rysunki” (domyślnie ON gdy są rysunki — DF) |
| Filtr | draft OUT z paczki produkcyjnej **lub** wszystkie z watermark — **decyzja DF** |
| Helper | `appendDrawingsPdfToZip(zip, folder, drawings[])` analogicznie do `appendMeasurementDocxToZip` |
| Schematy | nadal **poza** ZIP (nie scope tego EPICu, chyba że osobne Owner GO) |

### 8.3 Ryzyko publikacji

Zmiana `DeliveryPackageManifestFolder` wpływa na paczki dla inspektora / fingerprint.  
**DF musi** zdefiniować: breaking vs additive + testy manifestu.

---

## 9. Zgodność z zasadami projektu

| Zasada | Jak stosujemy |
|--------|----------------|
| **SSOT FIRST** | Jeden model `objects[]` · PDF/ZIP = derivaty |
| **REUSE FIRST** | Tab/KV/merge/ZIP/PDF fonts/audit ze ścieżek WM; nie nowy hub |
| **ZERO DUPLICATE** | Nie duplikować rendererów Schematów; nie drugi ZIP builder; nie drugi system „rysunek” w Robotach bez mapowania |
| **THIN SLICE** | P0 persist+lista+1–2 narzędzia → P1 toolset → P2 PDF → P3 ZIP → P4 opcjonalne punkty |
| **Chmura** | Nowy klucz w `DATA_KEYS` + merge + backup (wg `wgdom-development`) |
| **Payroll Gate** | Rysunki **poza** payroll — nadal nie ruszać CORE sync bez potrzeby |

---

## 10. Narzędzia — mapowanie na MVP

### 10.1 Minimalny zestaw (Owner)

| Narzędzie | Model (szkic) | P0? |
|-----------|---------------|-----|
| Ściana | segment (x1,y1)–(x2,y2) + grubość | **TAK** |
| Drzwi | symbol na ścianie lub wolnostojący | **TAK** |
| Okno | j.w. | **TAK** |
| Tekst | label + fontSize | **TAK** |
| Wymiar | wymiar liniowy między 2 punktami | P1 |
| Wentylacja | symbol | P1 |
| Piec gazowy | symbol | P1 |

### 10.2 Opcjonalne (Owner)

| Narzędzie | Uwagi |
|-----------|--------|
| Punkt pomiarowy | **Nigdy** wymagany do save · P2/P4 |
| Punkt elektryczny | P4 |
| Rozdzielnia | P4 · nie mylić ze Schematami jednokreskowymi |

### 10.3 Poza zakresem EPIC (propozycja)

- Freehand ołówek / krzywa Bezier  
- Warstwy CAD / XREF / bloki DWG  
- Import AutoCAD / DXF (osobny epic)  
- Auto-generacja rzutu z pomiarów EM  
- Obowiązkowe powiązanie z RAP

---

## 11. Ryzyka

| ID | Ryzyko | Severity | Mitygacja |
|----|--------|----------|-----------|
| R1 | Brak gotowego edytora w repo → underestimation effort | **HIGH** | DF: toolset P0 ekstremalnie wąski; zero nowych lib |
| R2 | Kolizja nazwy „Rysunki” vs checklist / worker sketch | MED | Copy UI: „Rysunki techniczne (Odbiory)” · nie mapować automatycznie |
| R3 | 8. zakładka — sprawl mobile UX | MED | Wzorzec scroll tabs WM · smoke mobile |
| R4 | Manifest ZIP / fingerprint breaking | **HIGH** | Additive folder + testy publications · DF kontrakt |
| R5 | Audit flood przy auto-save | MED | Brak `drawing_edited` per keystroke; audit create/delete/pdf/zip |
| R6 | Raster PDF nieczytelny w druku | MED | Watermark path REUSE · opcjonalnie wektor P2.1 |
| R7 | Scope creep → „mały AutoCAD” | **HIGH** | Hard OUT w DF · Owner Verification checklist |
| R8 | Punkty pomiarowe „przypadkiem” wymagane w walidacji | MED | Explicit: `validateForSave` **bez** measurement points |
| R9 | Lokalny WIP + `git add -A` | MED | Allowlist stage przy przyszłym COMMIT |
| R10 | Mylenie ze Schematami w ZIP | LOW | Osobny folder `Rysunki/` · Schematy nadal OUT |

---

## 12. Zależności

### 12.1 Soft (REUSE, nie blokują AUDIT)

- WM Druk COMPLETE (§ 12.1.8)  
- Schematy COMPLETE (§ 12.1.21) — wzorzec infra  
- Pomiary ZIP hook (§ 12.1.10)  
- Audit Hub WM (§ 15.6) — rozszerzenie akcji  

### 12.2 Hard (przed IMPLEMENT live)

| Zależność | Stan |
|-----------|------|
| Owner **GO DESIGN FREEZE** | **WAITING** |
| Owner **GO IMPLEMENT** (po DF) | nie teraz |
| Legal | **N/A** (brak scrapingu / third-party drawings API) |
| Nowa lib rysunkowa | **NIE** wymagana P0; jeśli DF chce lib → osobna ocena rozmiaru bundle |

### 12.3 OUT / nie blokować się na

- ZIP `Schematy/` (backlog Schematy)  
- Bid Guard WIP  
- MARKET-SYNC P3-B  
- Foundation Lib FND-06  

---

## 13. Rekomendacja AUDIT (werdykt)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy EPIC jest sensowny w architekturze WM? | **TAK** |
| Najlepsze miejsce | Nowa zakładka **`rysunki`** w `WmPrintTab` — kolejność **Owner vision** (po Odbiory) |
| Model | Osobna domena + KV · wiele rysunków / job · `objects[]` SSOT |
| SVG vs Canvas | **Model → SVG**; Canvas nie jako SSOT |
| Zapis | Edytowalny JSON w chmurze; PDF tylko eksport |
| PDF | `pdf-lib` + fonty WM; start raster REUSE Schematy lub wektor w DF |
| ZIP | Folder **`Rysunki/`** + checkbox; rozszerzyć manifest |
| Punkty pomiarowe | Opcjonalne · nigdy gate save |
| Start IMPLEMENT bez DF? | **NIE** |

**GO / NO-GO do DESIGN FREEZE:** **GO AUDIT PASSED** — EPIC gotowy do zamrożenia zakresu.

---

## 14. Propozycja etapów implementacji (po DF + Owner GO IMPLEMENT)

> Poniższe = **propozycja** pod DF. **Nie** startować bez kolejnego Owner GO.

| Etap | Nazwa | Zakres | OUT |
|------|-------|--------|-----|
| **P0** | Foundation | Tab `rysunki` · KV · CRUD lista · link job · persist/sync · arkusz + ściana + tekst (minimal) | PDF · ZIP · pełny toolset · punkty |
| **P1** | Toolset MVP | Drzwi · okno · wymiar · wentylacja · piec · select/move/delete · draft/final | ZIP · punkty opcjonalne |
| **P2** | PDF export | Pobierz PDF · watermark draft · nazewnictwo · audit `pdf_exported` | ZIP |
| **P3** | ZIP delivery | `includeDrawings` · folder `Rysunki/` · manifest · checkbox Odbiory · smoke paczki | Schematy-in-ZIP · DXF |
| **P4** | Optional points | Punkt pomiarowy / elektryczny / rozdzielnia — **opcjonalne** | Wymuszanie punktów · AutoCAD |

**Kolejność release:** jeden thin slice = jeden Owner Verification → commit allowlist → push → PV.

---

## 15. Propozycja DESIGN FREEZE (szkielet pod Owner GO DF)

Dokument docelowy: `WM-RYSUNKI-01-DESIGN-FREEZE.md` (po Owner GO DF).

### 15.1 Sekcje DF (must)

1. **Produkt** — 1 zdanie: szybki szkic techniczny odbiorowy ≠ CAD  
2. **Tab** — key `rysunki` · pozycja w `WM_PRINT_TABS` · copy PL  
3. **Model SSOT** — pola entity · union obiektów · schemaVersion  
4. **Save rules** — co waliduje save · **measurement points never required**  
5. **Editor MVP** — lista narzędzi IN/OUT per slice P0–P4  
6. **Render** — SVG only SSOT; zakaz bitmap-as-SSOT  
7. **PDF** — wariant A/B · format strony · nazwa pliku · draft watermark  
8. **ZIP** — folder · include flag · draft vs final · manifest  
9. **Sync** — KV key · LWW · DATA_KEYS · backup keys  
10. **Audit** — lista akcji · zakaz flood edit  
11. **ACL** — kto tworzy (admin / super_admin / …)  
12. **OUT** — AutoCAD · DXF · freehand · Schematy-in-ZIP · worker sketch merge · payroll  
13. **AC** — Acceptance Criteria P0…P3  
14. **Test plan** — unit model · smoke PDF · smoke ZIP · mobile tab  

### 15.2 Decyzje otwarte → DF musi zamknąć

| # | Pytanie | Opcje |
|---|---------|--------|
| D1 | Kolejność taba | Owner A (po Odbiory) vs B (po Schematy) |
| D2 | `jobId` zawsze wymagany? | linked-only MVP vs detached allowed |
| D3 | PDF wektor vs raster | A / B / B→A |
| D4 | Draft w ZIP? | wykluczyć / watermark / tylko final |
| D5 | Domyślny checkbox ZIP | ON jeśli ≥1 rysunek / OFF |
| D6 | Nowa lib? | **NONE** (rekomendacja) / Konva / inne |
| D7 | Relacja do checklist `documents.rysunek` | ignoruj / soft link UI / OUT |
| D8 | Nazwa KV | `kw-wm-technical-drawings` vs `kw-wm-drawings` |

### 15.3 Hard OUT (propozycja freeze)

```text
OUT WM-RYSUNKI-01:
  AutoCAD / DWG / DXF import
  Edytor architektoniczny / warstwy CAD
  Obowiązkowe punkty pomiarowe
  PDF-as-only-storage
  Merge do electrical-schematics
  Auto-include Schematy PDF w tym samym folderze
  Zmiany Cloud CORE / payroll merge
  Nowa dependency bez jawnej linii w DF
```

---

## 16. Pliki kluczowe (mapa do DF / IMPLEMENT)

| Warstwa | Ścieżki |
|---------|---------|
| Tabs | `src/lib/wm-print/wm-print-tabs.ts` · `WmPrintView.tsx` |
| Schematy wzorzec | `src/lib/electrical-schematics/*` · `WmPrintSchematicsPanel.tsx` |
| ZIP | `src/lib/wm-print/generate-zip.ts` · `measurement-catalog-zip.ts` |
| Manifest | `src/lib/delivery-package-publications/types.ts` · `manifest.ts` · `normalize.ts` |
| PDF fonts | `src/lib/wm-print/wm-print-pdf-fonts.ts` |
| Audit | `src/lib/wm-druk-audit.ts` · Audit Hub adapters |
| Arch docs | ARCHITECTURE § 12.1.8 / 12.1.21 / 15.6 |

---

## 17. Następny krok

```text
AUDIT COMPLETE
        ↓
Owner GO DESIGN FREEZE
        ↓
WM-RYSUNKI-01-DESIGN-FREEZE.md
        ↓
Owner GO IMPLEMENT (thin slice P0)
        ↓
OWNER VERIFICATION → COMMIT (allowlist) → PUSH → PV → CLOSE slice
```

**Teraz:** zatrzymanie pracy. **Czekam na Owner GO DESIGN FREEZE** (lub korektę wizji AUDIT).

---

## 18. Metryka jakości AUDIT

| Kryterium | Stan |
|-----------|------|
| Analiza architektury WM | DONE |
| Miejsce zakładki | DONE · rekomendacja A |
| Model danych | DONE · propozycja |
| SVG vs Canvas | DONE · SVG SSOT |
| Zapis obiektów | DONE |
| PDF | DONE |
| ZIP | DONE |
| SSOT / REUSE / ZERO DUP / THIN | DONE |
| Reuse komponentów | DONE |
| Biblioteki w projekcie | DONE |
| Ryzyka / zależności / etapy / szkielet DF | DONE |
| IMPLEMENT / CODE / COMMIT / PUSH | **NIE wykonano** (zgodnie z GO) |
