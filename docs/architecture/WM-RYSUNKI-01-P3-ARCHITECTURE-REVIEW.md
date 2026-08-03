# WM-RYSUNKI-01 P3 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3 — ZIP PACKAGE INTEGRATION**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P3-AUDIT.md`](./WM-RYSUNKI-01-P3-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P3-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** tip **2.65.99** / **`4e84f994`** · P0+P1+P1B+P2 **CLOSED** · kod read-only: `generate-zip.ts` · `export-pdf.ts` · `manifest.ts` · `publication.ts` · `types.ts` · `WmPrintView.tsx`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
DF spójny z AUDIT + Owner GO (fail-loud PDF → ZIP)
SSOT/REUSE/ZERO DUP/THIN: PASS
1 orchestrator · 1 PDF SSOT · manifest additive · brak temp files

Gotowy do Owner GO IMPLEMENT P3
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | P3 DF ↔ AUDIT ↔ living ZIP Odbiory / P2 PDF / delivery publications (read-only) |
| Mutacje | **tylko** ten dokument AR (+ pointer STATUS w DF) |
| Kryterium **FAIL** | drugi ZIP builder · drugi PDF generator · best-effort skip PDF · przebudowa Odbiory core · cache PDF · Payroll/Points w scope · non-additive manifest breaking |
| Kryterium **PASS** | brak blokerów · DF kompletny |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-P3-* do IMPLEMENT (bez wymuszania amend DF) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P3 jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + decyzje Ownera? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR nie wymuszają amend) |
| Czy P3 narusza P2 PDF SSOT / model drawings? | **NIE** (konsumpcja only) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT ↔ Owner GO

| Temat | AUDIT | DF P3 | Wynik |
|-------|-------|-------|--------|
| `generateDrawingPdf` only | §2 · Q6 | §2 #1 · §3 | **PASS** |
| Folder `Rysunki/` | §4 | §2 #2 · §4 | **PASS** |
| Nazwy P2 + `_{shortId}` | Q9 · §4 | §2 #3 · §5 | **PASS** |
| Checkbox default ON iff ≥1 final | Q7 | §2 #4 · §6 | **PASS** |
| Draft OUT | Q8 | §2 #5 · §7 | **PASS** |
| Manifest + fingerprint additive | Q5 | §2 #6 · §8 | **PASS** |
| Błąd PDF blokuje ZIP | (AUDIT risk R2) | §2 #7 · §9 · AC-P3-11 | **PASS** (DF doprecyzowuje) |
| Kolejność Odbiory→Pomiary→Rysunki | §4 | §2 #8 · §4.1 | **PASS** |
| Jeden orchestrator | Q1/Q4 | §2 #9 · §10 | **PASS** |
| AC-P3-01…11 | §6 + DF | §13 | **PASS** |
| OUT Schematy/Payroll/Points | §5 OUT | §12 OUT | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Zasady WGDOM

| Zasada | Werdykt | Dowód |
|--------|---------|--------|
| **SSOT FIRST** | **PASS** | JSON drawings = dane · `generateDrawingPdf` = PDF · bajty ZIP = SSOT publikacji (manifest ze skanu) · brak cache PDF |
| **REUSE FIRST** | **PASS** | P2 export API · `drawingPdfFileName` · `buildWmPrintDeliveryZipBytes` · wzorzec EM `include*` + `append*` · checkbox UI jak pomiary |
| **ZERO DUPLICATE LOGIC** | **PASS** | zakaz drugiego PDF · zakaz drugiego ZIP-buildera · zakaz `01-Kuchnia` / `Rysunek.pdf` |
| **THIN SLICE** | **PASS** | append + options + UI + manifest/fingerprint additive · OUT P4/Schematy/Payroll · bez przebudowy `buildWmPrintFilesForJob` |

**Werdykt sekcji: PASS**

---

## 4. Checklista Ownera (10 punktów)

### 4.1 `buildWmPrintDeliveryZipBytes()` = jedyny orchestrator

**PASS.**

- AS-IS: jeden entry delivery (`generate-zip.ts` L179+) — download i publish już go wołają.
- DF §10: dokłada **tylko** `appendDrawingsPdfToZip` wewnątrz tego flow — jak EM.
- Zakaz osobnego „DrawingsZipBuilder”.

**MR-P3-01:** helper `appendDrawingsPdfToZip` trzymać w `wm-technical-drawings/` (np. `zip-append.ts`) · orchestrator tylko woła — ZERO logiki PDF w `generate-zip` poza options/gate.

### 4.2 `generateDrawingPdf()` = jedyne źródło PDF

**PASS.**

- DF §3: każdy plik w `Rysunki/` = wynik P2.
- Zakaz importu Schematics `export-pdf` / nowego pdf-lib path.
- Nazwa = `drawingPdfFileName` (REUSE).

### 4.3 Brak drugiego ZIP buildera

**PASS.**

- Katalog Pomiarów / photo-zip pozostają **osobnymi** produktami (nie tor Odbiory) — P3 ich **nie** łączy i **nie** duplikuje.
- Paczka odbiorowa = nadal **jeden** orchestrator.

### 4.4 Brak plików tymczasowych

**PASS** (kontrakt IMPLEMENT).

| Dozwolone | Zakazane |
|-----------|----------|
| `Uint8Array` w pamięci → `JSZip.file` | zapis `Rysunek.pdf` na disk / IndexedDB / KV |
| blob URL tylko przy osobnym Preview P2 (poza ZIP) | temp file w `localStorage` / OPFS „pod ZIP” |
| session cache UI P2 (editor) | reuse session cache w ZIP path (inny lifecycle) |

ZIP path: generate → append → `generateAsync` → saveAs/upload. **Bez** intermediate persist.

### 4.5 Manifest sekcja `Rysunki` = additive

**PASS.**

- Typ union `+= "Rysunki"` · stare paczki bez folderu valid.
- `folderFromPath` **MUST** mapować `Rysunki` (dziś fallback → `"Odbiory"` = bug jeśli pominięte — R1).
- `groupDeliveryPackageManifestByFolder` — trzecia grupa.
- Fingerprint `schemaVersion: 1` + pola additive (`includeDrawings`, digesty) — **bez** bump (DF default).

**MR-P3-02:** `fileCount = odbior + pomiary + rysunki` · `normalize.ts` default `rysunkiFileCount: 0` dla starych rekordów · testy normalize + folderFromPath + groupBy.

### 4.6 Checkbox wpływa wyłącznie na zawartość ZIP

**PASS.**

| Checkbox | Może | Nie może |
|----------|------|----------|
| `includeDrawings` | dodać/pominąć folder `Rysunki/` | mutować `WmTechnicalDrawing` · flip draft→final · sync KV drawings |
| Default ON/OFF | stan UI per job | zmieniać AppSettings / feature flag |

Analog: `includeMeasurementsInZip` — tylko delivery options.

### 4.7 Deterministyczna struktura ZIP

**PASS** z MR sort.

| Element | Determinizm |
|---------|-------------|
| Foldery | stałe nazwy · kolejność append Odbiory→Pomiary→Rysunki |
| Odbiory | istniejący `sortOrder` |
| Pomiary | istniejący tor EM |
| Rysunki | nazwy z `drawingPdfFileName` + kolizja `_{shortId}` |

**MR-P3-03:** przed append sort finals stabilnie:  
`updatedAt DESC` → `title localeCompare pl` → `id ASC`  
(żeby kolejność plików w ZIP była powtarzalna przy tych samych danych).

Kolizja: pierwszy zachowuje basename; kolejne dostają `_{shortId}` — deterministyczne przy stałym sort + stałym id.

### 4.8 Obsługa błędów eksportu PDF

**PASS.**

- DF §9 / AC-P3-11: **fail-loud** · abort całego ZIP · brak partial `saveAs` / publish.
- `DrawingPdfError` message → toast UI.

**MR-P3-04 (IMPLEMENT):**

```text
try {
  … Odbiory …
  … Pomiary …
  … Rysunki (generateDrawingPdf per final) …  // throw → catch
  bytes = await zip.generateAsync(...)
} catch (e) {
  // NIE saveAs · NIE publish
  rethrow / return { ok:false }
}
```

| Przypadek | Zachowanie |
|-----------|------------|
| Fail na 2. z N finals | **brak** ZIP (także bez 1. PDF w pliku) — JSZip w pamięci OK, ale **nie** emitować |
| `includeDrawings` false | drawings nie wołane |
| Test Node | inject `rasterize` w opts (jak P2) |

### 4.9 Wpływ: Cloud · Payroll · Punkty

| Obszar | Werdykt |
|--------|---------|
| **Cloud drawings** (`kw-wm-technical-drawings`) | **ZERO** merge/schema/model |
| **Cloud publications** | **REUSE** · additive manifest + fingerprint + counts |
| **Cloud audit** | opcjonalnie `drawing_zip_included` (SHOULD) |
| **Payroll** | **ZERO** |
| **Punkty (P4)** | **OUT P3** |
| **Protected Core** | **GREEN** |

**PASS.**

### 4.10 Gotowość orchestratora na P4 / kolejne dokumenty

**PASS z rekomendacją wzorca (nie scope P3).**

Obecny wzorzec skaluje się:

```text
buildWmPrintDeliveryZipBytes
  + includeX + appendXToZip(folder)
  + ManifestFolder additive
  + fingerprint digests
```

| Przyszłość | Ocena |
|------------|--------|
| P4 punkty / kolejne foldery | **TEN SAM** pattern — **nie** wymaga przepisania orchestratora teraz |
| Generic plugin registry | **OUT P3** — over-engineering |
| Schematy-in-ZIP | osobny Owner GO · nadal OUT |

**MR-P3-05:** w IMPLEMENT **nie** wprowadzać abstrakcji „ZipSectionRegistry” — wystarczy trzeci blok `if (includeDrawings)` jak Pomiary. P4 = kolejny cienki `if` po Owner GO.

**Werdykt sekcji 4: PASS** (MR-P3-01…05 nieblokujące)

---

## 5. Kontrakt helpera (AR doprecyzowanie · DF §10)

```text
appendDrawingsPdfToZip(
  zip: JSZip,
  folder: typeof WM_PRINT_ZIP_FOLDER_RYSUNKI,  // "Rysunki"
  drawings: WmTechnicalDrawing[],              // już tylko final
  jobLabel: string,
  opts?: { rasterize?: DrawingSvgRasterizer }
): Promise<number>  // liczba plików dodanych
```

| Reguła | AR |
|--------|-----|
| Filter draft | **przed** helperem w orchestratorze **lub** assert w helperze (fail jeśli draft) — prefer: filter w orchestratorze |
| `jobLabel` | wymagany (jak P2) — UI resolve (`jobDisplayTitle` / „Bez roboty”) |
| Return | count → `rysunkiCount` |
| Side effects | tylko `zip.file` · bez toast/KV |

---

## 6. Allowlist IMPLEMENT (doprecyzowana)

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/generate-zip.ts` | constant · options · call append · return `rysunkiCount` |
| `src/lib/wm-technical-drawings/zip-append.ts` (**NEW**) | `appendDrawingsPdfToZip` + collision helper |
| `src/app/WmPrintView.tsx` | checkbox · state default · pass options · toast |
| `src/lib/delivery-package-publications/types.ts` | folder union · fingerprint fields · publication counts |
| `…/manifest.ts` | `folderFromPath` · groupBy · sort folder order |
| `…/publication.ts` | fingerprint build · `fileCount` · publish args |
| `…/normalize.ts` | defaults `rysunkiFileCount: 0` |
| `src/lib/wm-druk-audit.ts` | opcjonalnie `drawing_zip_included` |
| `scripts/test-wm-rysunki-01-p3.mjs` | NEW |
| Guide / `changelog-data.ts` | przy IMPLEMENT |

**ZAKAZ:** `PayrollView` · `CloudLoader` · `cloud-sync` drawings merge · Bid Guard · P2 `export-pdf.ts` rewrite (tylko import).

---

## 7. Ryzyka residualne (nie FAIL)

| ID | Residual | Status |
|----|----------|--------|
| R1 | `folderFromPath` fallback | MUST fix w IMPLEMENT · test |
| R2 | partial ZIP | AC-P3-11 · MR-P3-04 |
| R3 | fingerprint stale | digesty id+updatedAt |
| R4 | DOM w Node | inject rasterize |
| R5 | wiele heavy PDF | accepted · busy spinner · OUT cap |
| R6 | WIP allowlist | **nie** `git add -A` |

---

## 8. Minor Recommendations (zbiorczo)

| ID | Rekomendacja | Wymusza amend DF? |
|----|--------------|-------------------|
| **MR-P3-01** | helper w `wm-technical-drawings/zip-append.ts` | **NIE** |
| **MR-P3-02** | `fileCount` + normalize defaults + testy manifest | **NIE** |
| **MR-P3-03** | sort finals przed append | **NIE** (DF SHOULD) |
| **MR-P3-04** | abort przed `generateAsync`/saveAs/publish | **NIE** (DF już fail-loud) |
| **MR-P3-05** | bez ZipSectionRegistry — trzeci `if` | **NIE** |
| **MR-P3-06** | toast: „Odbiory + N pomiarów + M rysunków” | **NIE** |

---

## 9. Decyzje AR (D-AR-P3)

| ID | Decyzja |
|----|---------|
| **D-AR-P3-01** | Fingerprint `schemaVersion` **zostaje 1** · pola additive |
| **D-AR-P3-02** | `shortId` = pierwsze **6** znaków `drawing.id` (bez `-`) · lowercase |
| **D-AR-P3-03** | Pusty `Rysunki/` **nie** tworzyć |
| **D-AR-P3-04** | Feature OFF → brak append niezależnie od checkbox state |
| **D-AR-P3-05** | Publish i Download **muszą** dostać te same `includeDrawings` + drawings[] |

---

## 10. NEXT

```text
STATUS: ARCHITECTURE REVIEW COMPLETE
WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
Amend DF: NIE wymagany

NEXT: Owner GO IMPLEMENT
  → allowlist §6 · AC-P3-01…11 · MR-P3-01…06

IMPLEMENT: NIE (ten dokument)
COMMIT: NIE
PUSH: NIE
P4: NIE
```

**STOP.** Czekaj na **OWNER GO IMPLEMENT**.
