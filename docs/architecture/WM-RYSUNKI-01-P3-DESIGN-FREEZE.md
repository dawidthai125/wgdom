# WM-RYSUNKI-01 P3 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **ID:** WM-RYSUNKI-01-P3-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3 — ZIP PACKAGE INTEGRATION**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-03  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **ACCEPTED**  
> **Parent AUDIT:** [`WM-RYSUNKI-01-P3-AUDIT.md`](./WM-RYSUNKI-01-P3-AUDIT.md) (**READY FOR DESIGN FREEZE** · **ACCEPTED**)  
> **AR:** [`WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **Parent EPIC DF:** [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) §8.2–§8.3 · §10 · AC-P3  
> **P2 CLOSED:** [`WM-RYSUNKI-01-P2-CLOSEOUT.md`](./WM-RYSUNKI-01-P2-CLOSEOUT.md) · tip **2.65.99** / **`4e84f994`**  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3 DESIGN FREEZE — FROZEN

PDF w ZIP:      TYLKO generateDrawingPdf() (P2)
Folder:         Rysunki/
Nazwy:          RYSUNEK_<job>… (SSOT drawingPdfFileName)
Kolizja:        _{shortId}
Checkbox:       Dołącz rysunki · default ON iff ≥1 Final
Draft:          OUT
Manifest:       sekcja Rysunki + fingerprint
Błąd PDF:       BLOKUJE cały ZIP
Kolejność:      Odbiory/ → Pomiary/ → Rysunki/
Orchestrator:   buildWmPrintDeliveryZipBytes ONLY

OUT: drugi PDF · Schematy-in-ZIP · Zdjęcia · Payroll · Points · P4

IMPLEMENT zakazany do: Owner GO IMPLEMENT (po AR)
════════════════════════════════════════════════════════
```

---

## 0. Cel slice P3 (zamrożony · 1 zdanie)

**P3** dołącza PDF rysunków technicznych (wynik P2) do **istniejącej** paczki ZIP Odbiorów WM — folder `Rysunki/` · final-only · bez przebudowy ZIP core i bez drugiego generatora PDF.

### 0.1 Relacja do EPIC / AUDIT / P2

| Dokument | Rola |
|----------|------|
| EPIC [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) | mapa §10 ZIP · AC-P3 bazowe |
| AUDIT P3 | architektura + thin · **ACCEPTED** |
| P2 CLOSEOUT / export-pdf | **SSOT PDF** — `generateDrawingPdf` · `drawingPdfFileName` |
| **Ten plik** | **amend slice P3** — decyzje Owner GO DF |

**Konflikt:** **ten plik wygrywa** dla P3.  
Szczególnie: błąd PDF **blokuje ZIP** (Owner #7 — doprecyzowanie względem samego „append best-effort”).

---

## 1. PAYROLL SAFETY GATE (P3)

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P3

G1–G9: FEATURE thin
Cloud drawings: ZERO zmiany modelu / merge / schema
Cloud publications: REUSE · additive manifest + fingerprint only
Payroll / Hours-wipe / carry = OUT
Edge payroll = OUT
Owner GO CORE: NIE

Wynik: FEATURE ZIP append drawings only
```

---

## 2. Decyzje FROZEN (Owner GO)

| # | Temat | Decyzja FROZEN |
|---|-------|----------------|
| **1** | PDF w ZIP | ZIP korzysta **wyłącznie** z **`generateDrawingPdf()`** (P2) |
| **2** | Folder | **`Rysunki/`** · stała `WM_PRINT_ZIP_FOLDER_RYSUNKI = "Rysunki"` |
| **3** | Nazwy | **`RYSUNEK_<job>…pdf`** via SSOT **`drawingPdfFileName`** · kolizja **`_{shortId}`** |
| **4** | Checkbox | **„Dołącz rysunki”** · default **ON** tylko gdy **≥1 Final** |
| **5** | Draft | **OUT** z ZIP |
| **6** | Manifest | sekcja / folder **`Rysunki`** **+** fingerprint drawings |
| **7** | Błąd PDF | **blokuje** wygenerowanie całego ZIP |
| **8** | Kolejność | **`Odbiory/` → `Pomiary/` → `Rysunki/`** |
| **9** | Orchestrator | **`buildWmPrintDeliveryZipBytes`** = **jedyny** builder paczki |

---

## 3. PDF SSOT (FROZEN · #1)

```text
Każdy plik w Rysunki/ = wynik generateDrawingPdf(drawing, { jobLabel })
```

| Reguła | FROZEN |
|--------|--------|
| Generator | **tylko** `src/lib/wm-technical-drawings/export-pdf.ts` → `generateDrawingPdf` |
| Nazwa bazowa | **tylko** `drawingPdfFileName(drawing, jobLabel)` |
| Import Schematics `export-pdf` | **ZAKAZ** |
| Drugi renderer / pdf-lib path „dla ZIP” | **ZAKAZ** |
| Cache PDF w KV | **ZAKAZ** |
| Zmiana pipeline P2 (SVG→raster→PDF) | **ZAKAZ** w P3 |
| Watermark | **N/A** (ZIP = tylko Final; P2 watermark OUT) |

**SSOT FIRST:** JSON rysunku → P2 PDF → bajty w ZIP. ZIP nie jest źródłem prawdy rysunku.

---

## 4. Folder i struktura ZIP (FROZEN · #2 · #8)

```text
{STREET}_{BUILDING}_{APT}_{ODBIOR_WM}.zip
├── Odbiory/          ← istniejące (bez zmian kontraktu)
├── Pomiary/          ← opcjonalnie (istniejące includeMeasurements)
└── Rysunki/          ← NOWE · gdy includeDrawings && ≥1 final PDF OK
```

| Reguła | FROZEN |
|--------|--------|
| Stała | `WM_PRINT_ZIP_FOLDER_RYSUNKI = "Rysunki"` |
| Pusty folder `Rysunki/` | **NIE tworzyć** (jak brak Pomiary gdy OFF/brak RAP) |
| Schematy / Zdjęcia | **nadal OUT** ZIP |
| Nazwa pliku ZIP zewnętrzna | **bez zmian** (`wmPrintZipBaseName` + suffix) |

### 4.1 Kolejność append (FROZEN · #8)

```text
1. Odbiory/     (buildWmPrintFilesForJob)
2. Pomiary/     (appendMeasurementDocxToZip · jeśli include)
3. Rysunki/     (appendDrawingsPdfToZip · jeśli include + finals)
4. zip.generateAsync
```

---

## 5. Nazewnictwo plików (FROZEN · #3)

Owner notation: **`RYSUNEK_<job>.pdf`** + kolizja **`_<shortId>`**.

| Element | FROZEN |
|---------|--------|
| SSOT nazwy | **`drawingPdfFileName(drawing, jobLabel)`** (P2) — wzorzec `RYSUNEK_{job/address}_{title}_{date}.pdf` |
| Interpretacja `<job>` | kontekst roboty w nazwie P2 (address/job slug) — **nie** nowy uproszczony basename bez title/date |
| Kolizja w `Rysunki/` | jeśli `fileName` już użyty w folderze → wstaw **`_{shortId}`** przed `.pdf` |
| `shortId` | **6** znaków z `drawing.id` (lowercase hex / alnum jak w id) |
| `Rysunek.pdf` / `01-Kuchnia.pdf` | **ZAKAZ** |

Przykład kolizji:

```text
Rysunki/RYSUNEK_ul_X_12_kuchnia_2026-08-03.pdf
Rysunki/RYSUNEK_ul_X_12_kuchnia_2026-08-03_a1b2c3.pdf
```

---

## 6. Checkbox UI (FROZEN · #4)

| Element | FROZEN |
|---------|--------|
| Label | **„Dołącz rysunki”** |
| Opcja API | `includeDrawings: boolean` w `WmPrintDeliveryZipOptions` |
| Default ON | **tylko** gdy job ma **≥1** rysunek `status === "final"` |
| Default OFF | **0** final (brak rysunków lub tylko draft) |
| Disabled | gdy feature Rysunki OFF **lub** 0 final (wzorzec: pomiary bez RAP) |
| Override user | może odznaczyć mimo ≥1 final |
| Miejsce | panel Odbiory (obok „Dołącz dokumenty pomiarowe”) — **bez** nowej zakładki |
| Gate feature | gdy `wmRysunkiEnabled` OFF → checkbox ukryty lub disabled · brak append |

Hint SHOULD: liczba final / „→ folder Rysunki/”.

---

## 7. Draft / Final (FROZEN · #5)

| Status | W ZIP |
|--------|-------|
| **`final`** | **IN** (gdy `includeDrawings`) |
| **`draft`** | **OUT** zawsze |

Źródło listy: `filterDrawingsForJob(…)`.filter `status === "final"`.  
Sort SHOULD: stabilny (`updatedAt` / `title` / `id`) — decyzja implementacyjna w AR jeśli potrzeba; nie blokuje DF.

---

## 8. Manifest + fingerprint (FROZEN · #6)

### 8.1 Manifest

| Element | FROZEN |
|---------|--------|
| `DeliveryPackageManifestFolder` | **+= `"Rysunki"`** (additive) |
| `folderFromPath` | rozpoznaje segment `Rysunki` |
| `groupDeliveryPackageManifestByFolder` | trzecia grupa **Rysunki** |
| SSOT zawartości | nadal skan bajtów ZIP (`buildDeliveryPackageManifestFromZipBytes`) |
| Stare paczki bez folderu | **valid** (additive) |

### 8.2 Fingerprint

| Element | FROZEN |
|---------|--------|
| `includeDrawings: boolean` | w payload fingerprint |
| Digesty rysunków | lista final użytych: `{ id, updatedAt, status }` (sorted by id) |
| `schemaVersion` fingerprint | **pozostaje 1** · pola **additive** (jak historyczne rozszerzenia) **albo** bump tylko jeśli AR wykryje breaking — default DF: **additive bez bump** |
| Publication counts | `rysunkiFileCount` · opcjonalnie `includesDrawings` (analog EM) |
| Return ZIP | `rysunkiCount` obok `odbiorCount` / `pomiaryCount` |

---

## 9. Błąd eksportu PDF → ZIP FAIL (FROZEN · #7)

```text
includeDrawings === true && finals.length > 0
  → dla każdego final: generateDrawingPdf(...)
  → JAKIKOLWIEK DrawingPdfError / throw
       → PRZERWIJ buildWmPrintDeliveryZipBytes
       → NIE zapisuj / NIE saveAs częściowego ZIP
       → UI: toast błędu (message z DrawingPdfError)
```

| Reguła | FROZEN |
|--------|--------|
| Best-effort „pomiń zły rysunek” | **ZAKAZ** |
| ZIP tylko Odbiory gdy drawings fail | **ZAKAZ** (gdy include ON i były finals do dołączenia) |
| `includeDrawings === false` | drawings **nie** generowane · błąd PDF rysunków **N/A** |
| 0 final + include false/off | ZIP jak dziś (Odbiory ± Pomiary) |

---

## 10. Orchestrator (FROZEN · #9)

| Element | FROZEN |
|---------|--------|
| Jedyny builder paczki | **`buildWmPrintDeliveryZipBytes`** |
| Helper NOWY | **`appendDrawingsPdfToZip(...)`** (analog `appendMeasurementDocxToZip`) — woła wyłącznie P2 API |
| Osobny ZIP „tylko rysunki” | **OUT P3** |
| Przebudowa `buildWmPrintFilesForJob` pod rysunki | **ZAKAZ** |
| Call sites | `downloadWmPrintZip` **i** `handlePublishForInspector` — **ten sam** delivery options |

```text
WmPrintDeliveryZipOptions {
  includeMeasurements: boolean
  …existing EM…
  includeDrawings: boolean          // NEW
  drawings?: WmTechnicalDrawing[]   // NEW · lub resolve w orchestratorze z props
  jobLabel?: string                 // NEW · required gdy includeDrawings
}
```

*(Dokładny kształt argumentów helpera — AR; kontrakt behawioralny FROZEN powyżej.)*

---

## 11. Zasady jakości (FROZEN)

| Zasada | Jak P3 spełnia |
|--------|----------------|
| **SSOT FIRST** | PDF = P2 · ZIP = paczka delivery · manifest ze skanu ZIP |
| **REUSE FIRST** | `generateDrawingPdf` · `drawingPdfFileName` · orchestrator · wzorzec checkbox EM |
| **ZERO DUPLICATE LOGIC** | brak drugiego PDF · brak drugiego nazewnictwa · brak drugiego ZIP-buildera |
| **THIN SLICE** | append + UI checkbox + manifest/fingerprint additive + testy |

---

## 12. IN / OUT (FROZEN)

### IN

- `includeDrawings` · checkbox · default ON iff ≥1 final  
- Folder `Rysunki/` · kolejność Odbiory→Pomiary→Rysunki  
- `appendDrawingsPdfToZip` → `generateDrawingPdf` only  
- Nazwy P2 + `_{shortId}` przy kolizji  
- Draft OUT · Final IN  
- Manifest `"Rysunki"` + fingerprint digests  
- Fail-loud: błąd PDF → ZIP abort  
- `rysunkiCount` / toast copy  
- Testy: 0 · draft-only · 1 final · N · kolizja · PDF throw → ZIP fail · regresja EM/Odbiory  
- Guide hint + changelog (przy IMPLEMENT)  
- Audit opcjonalny: `drawing_zip_included` (SHOULD; nie blocker)

### OUT

- Drugi generator PDF / zmiana P2 pipeline  
- Schematy w ZIP · Zdjęcia w ZIP  
- Draft w ZIP  
- Best-effort skip failed drawing  
- Nowy KV / schema bump drawings  
- Payroll · CloudLoader · Bid Guard · Points (P4)  
- Przebudowa core Odbiory templates  
- Osobny orchestrator ZIP  

---

## 13. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P3-01** | `includeDrawings` + ≥1 final + PDF OK → ZIP zawiera `Rysunki/*.pdf` z `generateDrawingPdf` |
| **AC-P3-02** | Draft **nie** trafia do ZIP |
| **AC-P3-03** | Manifest folder `"Rysunki"` · fingerprint uwzględnia drawings |
| **AC-P3-04** | Checkbox default **ON** iff ≥1 final; OFF gdy 0 final |
| **AC-P3-05** | Schematy nadal **poza** ZIP |
| **AC-P3-06** | 0 final → brak folderu `Rysunki/` · Odbiory(+Pomiary) bez regresji |
| **AC-P3-07** | Kolizja nazw → `_{shortId}` · unikalne ścieżki |
| **AC-P3-08** | Download ZIP i Publish używają **tego samego** orchestratora + options |
| **AC-P3-09** | Brak zmian Payroll / merge drawings / Points |
| **AC-P3-10** | Regresja: EM `Pomiary/` · Odbiory · P0/P1/P1B/P2 unit PASS |
| **AC-P3-11** | Throw / `DrawingPdfError` przy `includeDrawings` + finals → **cały ZIP FAIL** (brak partial saveAs) |

---

## 14. Allowlist (orientacyjna · AR doprecyzuje)

| Obszar | Pliki (oczekiwane) |
|--------|-------------------|
| ZIP | `src/lib/wm-print/generate-zip.ts` |
| Append helper | `src/lib/wm-technical-drawings/*` (nowy thin plik np. `zip-append.ts` **lub** obok export) |
| UI | `src/app/WmPrintView.tsx` |
| Manifest / types / publication | `src/lib/delivery-package-publications/*` |
| Audit enum | `src/lib/wm-druk-audit.ts` (opcjonalnie) |
| Test | `scripts/test-wm-rysunki-01-p3.mjs` (+ regresja P2/P0/P1/P1B) |
| Docs UI | Guide / changelog przy IMPLEMENT |

**ZAKAZ w allowlist:** `PayrollView` · `CloudLoader` · `cloud-sync` merge drawings · Bid Guard.

---

## 15. Ryzyka zamrożone (mitigacje)

| ID | Ryzyko | Mitigacja FROZEN |
|----|--------|------------------|
| R1 | `folderFromPath` → Odbiory | obowiązkowy update + test |
| R2 | Partial ZIP po błędzie PDF | AC-P3-11 · abort przed generateAsync/saveAs |
| R3 | Fingerprint stale po edycji rysunku | digesty id+updatedAt |
| R4 | DOM raster w Node tests | inject `rasterize` (jak P2) |
| R5 | Scope Schematy | OUT |

---

## 16. NEXT

```text
STATUS: DESIGN FREEZE · FROZEN
AR: PASS WITH MINOR RECOMMENDATIONS

NEXT: Owner GO IMPLEMENT
  → allowlist AR §6 · AC-P3-01…11 · MR-P3-01…06

IMPLEMENT: NIE (do Owner GO)
COMMIT: NIE
PUSH: NIE
P4 / nowy EPIC: NIE
```

**STOP.** Czekaj na **OWNER GO IMPLEMENT**.