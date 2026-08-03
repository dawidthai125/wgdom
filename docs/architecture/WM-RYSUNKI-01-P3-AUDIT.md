# WM-RYSUNKI-01 P3 — ZIP PACKAGE INTEGRATION AUDIT

> **ID:** WM-RYSUNKI-01-P3-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3 — ZIP PACKAGE INTEGRATION**  
> **NAZWA:** Dołączenie `Rysunek.pdf` (wynik P2) do paczki Odbiorów WM  
> **FAZA:** **AUDIT ONLY** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** · P0+P1+P1B+P2 **CLOSED** · tip **2.65.99** / **`4e84f994`**  
> **Parents:** EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) §8.2–§8.3 · §10 · AC-P3 · [`WM-RYSUNKI-01-P2-CLOSEOUT.md`](./WM-RYSUNKI-01-P2-CLOSEOUT.md)  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3 ZIP PACKAGE — AUDIT

Cel:      Dołączyć PDF rysunków (P2) do istniejącego ZIP Odbiory
Status:   AUDIT COMPLETE
Werdykt:  READY FOR DESIGN FREEZE
IMPLEMENT: NIE (do Owner GO DESIGN FREEZE)
════════════════════════════════════════════════════════
```

---

## 0. Problem biznesowy (1 zdanie)

Paczka ZIP Odbiorów WM zawiera dziś `Odbiory/` (+ opcjonalnie `Pomiary/`), ale **nie** zawiera rysunków technicznych — po P2 PDF istnieje, lecz nie jest włączany do delivery pack; trzeba cienko dołączyć wynik `generateDrawingPdf` bez drugiego generatora i bez przebudowy ZIP/PDF.

---

## 1. Architektura AS-IS (ZIP Odbiorów WM)

### 1.1 Jeden orchestrator

| Rola | Plik | Funkcja |
|------|------|---------|
| **SSOT ZIP delivery** | `src/lib/wm-print/generate-zip.ts` | `buildWmPrintDeliveryZipBytes` |
| Download UI | ten sam plik | `downloadWmPrintZip` → `saveAs` |
| UI entry | `src/app/WmPrintView.tsx` | `handleGenerateZip` · `handlePublishForInspector` |
| Publikacja | `src/lib/delivery-package-publications/publication.ts` | `publishDeliveryPackageForJob` + fingerprint |
| Manifest z bajtów | `…/manifest.ts` | `buildDeliveryPackageManifestFromZipBytes` |

```text
WmPrintView
  ├─ downloadWmPrintZip
  └─ buildWmPrintDeliveryZipBytes  ← JEDYNY builder paczki odbiorowej
        │
        ├─ buildWmPrintFilesForJob()     → pliki protokołów / szablonów / job docs
        │     └─ generateFromTemplateBytes (DOCX / ZI PDF / static PDF)
        │
        └─ JSZip
              Odbiory/{NN-slug.ext}
              Pomiary/{RAP-*.docx + INDEX-*}   ← gdy includeMeasurements + RAP prod
```

**Wniosek Q4:** ZIP Odbiory = **jeden builder** (`buildWmPrintDeliveryZipBytes`) + **append helpers** (dziś tylko EM). Nie ma wielu orchestratorów paczki odbiorowej.

### 1.2 Co trafia do ZIP dziś (Q2)

| Artefakt | W ZIP Odbiory? | Mechanizm |
|----------|----------------|-----------|
| **Protokół / dokumenty WM** (Oświadczenia, ZI, SEP, uploady, …) | **TAK** → `Odbiory/` | `buildWmPrintFilesForJob` → `zip.file("Odbiory/"+…)` |
| **Pomiary elektryczne** (5× DOCX + INDEX) | **TAK opcjonalnie** → `Pomiary/` | `appendMeasurementDocxToZip` + `appendMeasurementIndexFiles` · gate `includeMeasurements` |
| **Schematy** | **NIE** | osobny `generateSchematicPdf` (download 1 plik) |
| **Zdjęcia** | **NIE** | osobny tor `photo-zip` / galeria Roboty |
| **Rysunki (P2 PDF)** | **NIE** | `generateDrawingPdf` istnieje · **brak** `includeDrawings` / folderu |

Osobne ZIP-y (poza scope P3): Katalog Pomiarów (`measurement-catalog-zip.ts`), ZIP zdjęć.

### 1.3 Stałe folderów dziś

```ts
WM_PRINT_ZIP_FOLDER_ODBIORY = "Odbiory"
WM_PRINT_ZIP_FOLDER_POMIARY = "Pomiary"
// brak WM_PRINT_ZIP_FOLDER_RYSUNKI
```

`WmPrintDeliveryZipOptions` ma tylko `includeMeasurements` (+ dane EM). Brak drawings.

### 1.4 Manifest / fingerprint (Q5)

| Element | Stan |
|---------|------|
| `DeliveryPackageManifestFolder` | `"Odbiory" \| "Pomiary"` — **bez** `"Rysunki"` |
| `folderFromPath` | mapuje pierwszy segment; nieznany → fallback `"Odbiory"` (**ryzyko** przy dodaniu folderu bez update) |
| `groupDeliveryPackageManifestByFolder` | tylko 2 grupy |
| Fingerprint | `includeMeasurements` + digesty RAP/templates — **bez** rysunków |
| Publication counts | `odbiorFileCount` · `pomiaryFileCount` · `fileCount` — **bez** `rysunkiFileCount` |

**Wniosek:** Manifest **powinien** zostać rozszerzony **additively** (`"Rysunki"`) — zgodne z EPIC §10.2. Stare paczki bez folderu pozostają valid.

---

## 2. Reuse P2 — SSOT PDF (Q6)

### 2.1 Co już jest (CLOSED P2)

| API | Plik | Rola |
|-----|------|------|
| `generateDrawingPdf(drawing, { jobLabel })` | `wm-technical-drawings/export-pdf.ts` | **jedyny** generator PDF |
| `drawingPdfFileName(drawing, jobLabel)` | ten sam | `RYSUNEK_{slug}_{title}_{date}.pdf` |
| `DrawingPdfError` | ten sam | błędy → toast UI |
| Model | `WmTechnicalDrawing` · `status: "draft" \| "final"` | KV `kw-wm-technical-drawings` |
| Filter job | `filterDrawingsForJob` | lista per robota |

**Pipeline P2 (FROZEN w prod):**  
`JSON → renderDrawingSvg({ showGrid:false }) → PNG@2× → pdf-lib → Uint8Array`  
Chrome: `jobLabel` + `documentDate` · **watermark OUT** (Owner P2 — supersedes EPIC §9.1 dla draft watermark).

### 2.2 Zasada P3 (ZERO DUPLICATE)

```text
Rysunek.pdf w ZIP = zawsze wynik generateDrawingPdf (P2)
  · NIE drugi renderer
  · NIE import Schematics export-pdf
  · NIE cache PDF w KV
  · NIE przebudowa generate-zip core (tylko append + options)
```

---

## 3. Odpowiedzi na pytania Ownera (1–10)

### Q1 — Architektura ZIP

Jeden orchestrator `buildWmPrintDeliveryZipBytes` + append EM. P3 dokłada **ten sam wzorzec** co Pomiary.

### Q2 — Gdzie dodawane Protokół / Schemat / Pomiary / Zdjęcia

| Element | Miejsce |
|---------|---------|
| Protokół / szablony | `Odbiory/` przez `buildWmPrintFilesForJob` |
| Pomiary | `Pomiary/` przez `appendMeasurementDocxToZip` |
| Schemat | **poza** ZIP |
| Zdjęcia | **poza** ZIP |

### Q3 — Najlepszy punkt dołączenia

**Po bloku Pomiary** w `buildWmPrintDeliveryZipBytes` (~L221), przed `zip.generateAsync`:

```text
if (includeDrawings && finals.length) {
  await appendDrawingsPdfToZip(zip, WM_PRINT_ZIP_FOLDER_RYSUNKI, finals, jobLabel, …);
}
```

UI: drugi checkbox obok „Dołącz dokumenty pomiarowe” · te same call sites download + publish.

### Q4 — Jeden builder vs wiele

**Jeden** builder paczki odbiorowej. Append helpers = OK (jak EM). **Zakaz** osobnego ZIP-buildera „tylko rysunki” w P3.

### Q5 — Manifest

**TAK — rozszerzyć additively:**

- `DeliveryPackageManifestFolder += "Rysunki"`
- `folderFromPath` rozpoznaje `Rysunki`
- `groupDeliveryPackageManifestByFolder` trzecia grupa
- fingerprint: `includeDrawings` + digesty `drawingId` / `updatedAt` / `status` (final)
- publication: `rysunkiFileCount` · `includesDrawings` (opcjonalnie, analog EM)

### Q6 — SSOT PDF

**REUSE `generateDrawingPdf`.** Każdy plik w `Rysunki/` = on-demand call P2. Brak drugiego PDF.

### Q7 — Checkbox „Dołącz rysunki”

**TAK — default ON iff ≥1 rysunek `status === "final"`** dla joba (EPIC D5).  
OFF / disabled gdy 0 final (wzorzec: pomiary OFF gdy brak RAP).  
Użytkownik może odznaczyć mimo obecności final.

### Q8 — 0 / 1 / wiele

| Przypadek | Zachowanie |
|-----------|------------|
| **0** final (brak lub tylko draft) | checkbox OFF · folder `Rysunki/` **nie** tworzony · ZIP bez regresji |
| **1** final | 1× PDF w `Rysunki/` gdy include ON |
| **N** final | N× PDF · kolizje nazw → suffix `_{shortId}` (6 znaków `id`) per EPIC §8.2 |

Draft **nigdy** nie trafia do ZIP (EPIC D4 / AC-P3-02).

### Q9 — Nazewnictwo

| Propozycja | Werdykt AUDIT |
|------------|---------------|
| `Rysunki/Rysunek.pdf` | **OUT** — kolizja przy N rysunkach · nie reuse P2 |
| `Rysunki/01-Kuchnia.pdf` | **OUT** — drugi tor nazw (ZERO DUPLICATE vs `drawingPdfFileName`) |
| **`Rysunki/` + `drawingPdfFileName` (+ `_{shortId}` przy kolizji)** | **IN** — SSOT FIRST · zgodne EPIC §8.2–§8.3 |

Folder: **`Rysunki/`** (nie `Rysunek/`).

### Q10 — Wpływ Cloud / Payroll / Punkty

| Obszar | Wpływ P3 |
|--------|----------|
| **Cloud drawings** | **NIE** zmieniać merge / KV / schema |
| **Cloud publications** | **TAK additive** — fingerprint + manifest + counts |
| **Payroll** | **OUT** · zakaz |
| **Punkty / measurements edycja** | **OUT** · zakaz |
| **Schematy** | nadal **OUT** ZIP |
| **Flag Rysunki** | UI gate istniejący; ZIP append tylko gdy UI/flag pozwala i checkbox ON |

---

## 4. Rekomendowana struktura ZIP (TO-BE)

```text
{STREET}_{BUILDING}_{APT}_{ODBIOR_WM}.zip
├── Odbiory/
│     01-....pdf|docx
│     …
├── Pomiary/                         ← opcjonalnie (istniejące)
│     RAP-…-PROTOKOL.docx
│     … + INDEX-POMIARY.*
└── Rysunki/                         ← NOWE (P3), gdy includeDrawings + ≥1 final
      RYSUNEK_{addr}_{title}_{YYYY-MM-DD}.pdf
      RYSUNEK_{addr}_{title}_{YYYY-MM-DD}_{abc123}.pdf   ← kolizja
```

Kolejność append w builderze: **Odbiory → Pomiary → Rysunki**.

---

## 5. Reuse map (SSOT / REUSE / ZERO DUPLICATE / THIN)

| Zasada | Ocena P3 |
|--------|----------|
| **SSOT FIRST** | PDF = P2 generator · JSON model nietknięty · ZIP bytes = SSOT publikacji (manifest ze skanu ZIP) |
| **REUSE FIRST** | Wzorzec EM checkbox+append · `drawingPdfFileName` · `filterDrawingsForJob` · JSZip istniejący |
| **ZERO DUPLICATE LOGIC** | Brak drugiego PDF · brak nowego nazewnictwa · brak osobnego ZIP-buildera |
| **THIN SLICE** | Tylko: options · append helper · UI checkbox · manifest/fingerprint additive · testy · audit opcjonalny |

### IN (P3)

- `includeDrawings` w `WmPrintDeliveryZipOptions`
- `WM_PRINT_ZIP_FOLDER_RYSUNKI = "Rysunki"`
- `appendDrawingsPdfToZip(...)` wołający **wyłącznie** `generateDrawingPdf` + `drawingPdfFileName`
- Checkbox „Dołącz rysunki” · default ON iff ≥1 final
- Filter: `status === "final"` + job link
- Manifest / fingerprint / counts additive
- Smoke: 0 · draft-only · 1 final · N final · kolizja nazw
- Guide / changelog bump (przy IMPLEMENT)

### OUT (P3)

- Przebudowa orchestratora Odbiory core
- Drugi generator PDF / watermark changes
- Schematy / Zdjęcia w ZIP
- Draft w ZIP
- Punkty · Payroll · CloudLoader · Bid Guard WIP
- Nowy KV / schema bump drawings
- `Rysunek.pdf` single generic name
- Auto-start P4

---

## 6. Acceptance Criteria (propozycja AUDIT → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P3-01** | Gdy `includeDrawings` + ≥1 final → ZIP zawiera `Rysunki/*.pdf` (bajty = `generateDrawingPdf`) |
| **AC-P3-02** | Draft **nie** trafia do ZIP |
| **AC-P3-03** | Manifest folder `"Rysunki"` · `folderFromPath` · groupBy · fingerprint uwzględnia drawings |
| **AC-P3-04** | Checkbox default **ON** iff job ma ≥1 final; OFF gdy 0 final |
| **AC-P3-05** | Schematy nadal **poza** ZIP |
| **AC-P3-06** | 0 final → brak folderu `Rysunki/` · Odbiory(+Pomiary) bez regresji |
| **AC-P3-07** | Kolizja nazw → suffix `_{shortId}` · unikalne ścieżki w ZIP |
| **AC-P3-08** | Publish + download używają **tego samego** `buildWmPrintDeliveryZipBytes` z drawings |
| **AC-P3-09** | Brak zmian Payroll / merge drawings / Points |
| **AC-P3-10** | Regresja: EM `Pomiary/` · Odbiory templates · P0/P1/P1B/P2 unit PASS |

*(AC-P3-01…05 = EPIC §13.5; 06–10 = doprecyzowanie AUDIT.)*

---

## 7. Ryzyka

| ID | Ryzyko | Mitigacja DF |
|----|--------|--------------|
| R1 | `folderFromPath` wrzuci `Rysunki/*` do `"Odbiory"` bez update | Obowiązkowy update + test |
| R2 | Fingerprint bez drawings → fałszywy „aktualny” po edycji rysunku | Additive digests final drawings |
| R3 | `fileCount` / UI toast bez `rysunkiCount` | Rozszerzyć return + toast copy |
| R4 | Raster PDF wymaga DOM (canvas) — Node smoke | Inject `rasterize` w testach (jak P2) · UI path browser |
| R5 | Długi ZIP gdy wiele heavy PDF | Cap miękki? **OUT P3** — N final jak jest; spinner busy już jest |
| R6 | Flaga Rysunki OFF a drawings w KV | Checkbox ukryty/disabled gdy feature OFF (jak tab) |
| R7 | Scope creep Schematy-in-ZIP | **ZAKAZ** w DF P3 |
| R8 | WIP lokalny (Payroll/Bid Guard) | Allowlist commit · **nie** `git add -A` |
| R9 | Epic §9.1 watermark vs P2 OUT | ZIP = tylko final → watermark **N/A**; nie przywracać watermark w P3 |

**Brak ryzyka blokującego RCA** — tor EM jest wzorcem produkcyjnym; P2 API gotowe; EPIC §10 już zamraża kontrakt.

---

## 8. Zgodność z EPIC DF (skrót)

| EPIC | AUDIT |
|------|-------|
| §10 `includeDrawings` · `Rysunki/` · final-only · append helper | **POTWIERDZONE** jako plan P3 |
| D5 checkbox ON iff ≥1 final | **POTWIERDZONE** |
| §8.2 nazwa + kolizja `_{shortId}` | **POTWIERDZONE** — reuse `drawingPdfFileName` |
| AC-P3-01…05 | **POTWIERDZONE** + AC-06…10 |
| Schematy OUT ZIP | **POTWIERDZONE** |
| P2 watermark epic vs Owner P2 | **P2 CLOSEOUT wygrywa** · P3 nie re-open |

---

## 9. Rekomendowany plan DF (bez IMPLEMENT)

1. Zamrozić IN/OUT + AC-P3-01…10.  
2. Zamrozić API: `appendDrawingsPdfToZip` · options · folder constant.  
3. Zamrozić fingerprint fields (bez bump schemaVersion jeśli additive fields OK — decyzja DF).  
4. Zamrozić UI copy PL + toast.  
5. Allowlist plików · zakaz Payroll.  
6. Owner GO AR → IMPLEMENT.

---

## 10. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura ZIP jest jasna? | **TAK** — 1 orchestrator |
| Czy punkt insert jest jednoznaczny? | **TAK** — append po Pomiary |
| Czy PDF SSOT istnieje? | **TAK** — P2 `generateDrawingPdf` |
| Czy trzeba RCA? | **NIE** |
| Czy P3 jest thin? | **TAK** |

```text
════════════════════════════════════════════════════════
DECYZJA: READY FOR DESIGN FREEZE

P3 = append Rysunki/ do istniejącego ZIP
   + REUSE generateDrawingPdf (P2)
   + checkbox · manifest additive
   + final-only · nazwy P2 + shortId

NIE: przebudowa ZIP · drugi PDF · Schematy · Payroll · Points

NEXT: Owner GO DESIGN FREEZE
IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE
════════════════════════════════════════════════════════
```

**STOP.** Czekaj na **OWNER GO DESIGN FREEZE**.
