# WM-DRUK-OST-01 — ARCHITECTURE REVIEW

> **ID:** WM-DRUK-OST-01-ARCHITECTURE-REVIEW  
> **EPIC:** WM-DRUK-OST-01  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-DRUK-OST-01-AUDIT.md`](./WM-DRUK-OST-01-AUDIT.md) (**PASS**) · [`WM-DRUK-OST-01-DESIGN-FREEZE.md`](./WM-DRUK-OST-01-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kod read-only:** `generate-zip.ts` · `generate-pdf.ts` · `generate-pdf-zi-tauron2026.ts` · `variables.ts` · `default-templates.ts` · `wm-print-sync.ts` · `templates.ts` · `WmPrintView.tsx`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-DRUK-OST-01 — ARCHITECTURE REVIEW

WERDYKT: PASS

AUDIT ↔ DF:           PASS
REUSE FIRST:          PASS
ZERO DUPLICATE:       PASS
BOUNDARY:             PASS
FILE ALLOWLIST:       PASS (+ AR binding thin guard)
PLACEHOLDER MAPPING:  PASS
ACROFORM GATE:        PASS (zaostrzony: pure acroform)
ROLLBACK:             PASS
AC-01…12:             PASS (wykonalne)

AR-DECISION-01 thin guard ZI map/index:  REQUIRED → IN IMPLEMENT
AR-DECISION-02 delivery template:        UPLOAD-ONLY (nie bundled runtime)

READY FOR: Owner GO → IMPLEMENT
  (po AcroForm Gate PASS na WM-Druk-OST.pdf)
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF FROZEN ↔ AUDIT PASS ↔ living kod WM Druk |
| **FAIL** | Wymaga content-stream engine · klon Tauron · nowe SSOT keys · naruszenie ZI |
| **PASS** | DF wykonalny REUSE · ryzyka zamknięte decyzjami AR |
| **CHANGE REQUIRED** | DF sprzeczny z kodem bez możliwej thin korekty |

---

## 1. Zgodność AUDIT ↔ DESIGN FREEZE

| Temat | AUDIT | DF | AR |
|-------|-------|----|----|
| „Jak ZI” = pipeline, nie Tauron | ✓ | ✓ | **PASS** |
| Silnik OST = `generatePdfFormFromTemplate` | ✓ | ✓ | **PASS** |
| ZI = `generatePdfZiTauron2026` NO TOUCH | ✓ | ✓ | **PASS** |
| Aliasy tylko w `pdfFieldMapping` | ✓ | ✓ | **PASS** |
| Brak nowych `WmPrintVariableKey` | ✓ | ✓ | **PASS** |
| Miasto z `buildWmPrintVariableMap` | ✓ | ✓ | **PASS** |
| AcroForm Gate / zakaz content-stream | ✓ | ✓ | **PASS** |
| Scope OUT (EM, schematy, DOCX, 2. gen) | ✓ | ✓ | **PASS** |

**Werdykt sekcji:** PASS — brak sprzeczności SSOT.

---

## 2. REUSE FIRST

| Element | Ocena |
|---------|--------|
| Vars / address | REUSE `buildWmPrintVariableMap` + `address-vars` |
| ZIP / download | REUSE `buildWmPrintFilesForJob` / `downloadWmPrint*` |
| Dispatch | Istniejąca gałąź `pdf_form` ∧ `name !== "ZI"` → `generatePdfFormFromTemplate` |
| Upload szablonu | REUSE `uploadWmPrintTemplateFile` + slot UI |
| Tauron / graft | Nie wołane dla OST |

**Jawny dispatch `name === "OST"` w `generate-zip.ts`:** **NIE WYMAGANY** — wystarczy `type: pdf_form` + mapping. Minimal diff.

**Werdykt:** PASS.

---

## 3. ZERO DUPLICATE LOGIC

| Zakaz | Status |
|-------|--------|
| Drugi generator PDF | Nie w DF |
| Content-stream replace | Gate + OUT |
| Kopiuj logikę Tauron / graft | OUT |
| Alias w `substituteWmPrintVariables` | OUT |
| Bundled `resolveOstTemplateBytes` (klon ZI resolve) | **AR: FORBIDDEN** (patrz §8) |

**Werdykt:** PASS.

---

## 4. Boundary Contract

IN/OUT z DF — zgodne z kodem i AUDIT.  
Cloud: bez nowego `DATA_KEY` — tylko istniejący model szablonów WM.  
Payroll CORE: OUT.

**Werdykt:** PASS.

---

## 5. File Allowlist — potwierdzenie + binding AR

| Plik | AR |
|------|-----|
| `default-templates.ts` | IN — seed `OST` + mapping |
| `generate-pdf.ts` | **IN — thin guard REQUIRED** (§7) |
| `generate-zip.ts` | **NIE** zmieniać (chyba że regresja force) |
| `templates.ts` / sync | IN tylko jeśli seed/ensure slot bez pollution |
| `WmPrintView.tsx` | Opcjonalny hint copy |
| `scripts/*ost*` | IN — smoke |
| Tauron / EM / `variables` enum / `address-vars` | **NO TOUCH** |

**Werdykt:** PASS.

---

## 6. Placeholder Mapping

Semantyka DF FROZEN:

```text
BUILDING   → JOB_BUILDING
APARTMENT  → JOB_APARTMENT
JOB_STREET → JOB_STREET
JOB_CITY   → JOB_CITY
```

Literały nazw pól AcroForm = wynik Gate (z/bez `{{…}}`).  
Brak rozszerzenia SSOT — PASS.

---

## 7. AR-DECISION-01 — Thin guard `WM_PRINT_ZI_PDF_FIELD_MAP`

### 7.1 Stan kodu (read-only)

`generatePdfFormFromTemplate` **zawsze**:

1. Merguje `WM_PRINT_ZI_PDF_FIELD_MAP` (LiveCycle qnames `form1[0].Page1[0].TextField2[8|9|10]`) **nad** `pdfFieldMapping`.
2. Wywołuje `fillPdfFormFieldMapping`, które **dodatkowo** ma fallback po **indeksie** `WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX` (pola PDFTextField o indeksach **22 / 23 / 24**).

Prod ZI **nie** używa już tej funkcji (`name === "ZI"` → Tauron). Pierwszy realny konsument non-ZI `pdf_form` = **OST**.

### 7.2 Ryzyko bez guarda

| Ryzyko | Severity | Opis |
|--------|----------|------|
| Merge qnames LiveCycle | Niski (no-op jeśli brak nazw) | Szum / zanieczyszczenie kontraktu mappingu |
| **Index fallback 22/23/24** | **WYSOKI** | OST z ≥~25 polami tekstowymi może dostać street/budynek/lokal w **niewłaściwe** pola mimo poprawnego `pdfFieldMapping` |
| Hybrid/XFA branch (`finalizeZiHybridForm` + `stripSection3`) | **KRYTYCZNY** jeśli Gate przepuści hybrid | Destrukcja layoutu OST |

### 7.3 Decyzja AR (wiążąca)

```text
AR-DECISION-01: THIN GUARD = REQUIRED → IN SCOPE IMPLEMENT

Wymagane w generatePdfFormFromTemplate / fill path dla OST (non-ZI):
  1. NIE merge’ować WM_PRINT_ZI_PDF_FIELD_MAP
  2. NIE uruchamiać WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX fallback
  3. Fill wyłącznie z przekazanego pdfFieldMapping (kvMapping)

Preferowana forma (thin):
  · generatePdfFormFromTemplate używa TYLKO fieldMapping
  · index/ZI-map legacy zostaje w ścieżkach diagnostycznych ZI (diagnose*) /
    albo za jawną flagą legacy (domyślnie OFF) — bez wpływu na OST

NIE: kopiować generatora · NIE: nowy silnik · NIE: ruszać generatePdfZiTauron2026
```

**Czy wymagany?** **TAK.**  
**Czy do IMPLEMENT?** **TAK — obowiązkowy**, nie opcjonalny.

Uzasadnienie: bez guarda naruszenie Boundary („OST mapping = wyłącznie pdfFieldMapping”) + realny risk korupcji pól przez index fallback.

---

## 8. AR-DECISION-02 — Bundled vs upload-only

### 8.1 Stan architektury

| Szablon | Runtime bytes | Bundled |
|---------|---------------|---------|
| ZI | Upload `storageUrl` + **specjalny** `resolveZiTauron2026TemplateBytes` (szyfrowanie / graft) | `public/wm-print/zi-tauron-2026-template.pdf` — **tylko ścieżka Tauron** |
| Izba / SEP / static PDF | Upload `storageUrl` → fetch | Brak resolve bundled |
| DOCX | Upload | Brak |
| Seed | Tworzy **puste** sloty (bez pliku) | — |

### 8.2 Decyzja AR (wiążąca)

```text
AR-DECISION-02: OST = UPLOAD-ONLY

Produkcja:
  · Slot OST (seed greenfield LUB dodanie slotu w UI na istniejącym KV)
  · Plik WM-Druk-OST.pdf wgrywany jak inne generated (uploadWmPrintTemplateFile)
  · Bytes wyłącznie z storageUrl w buildWmPrintFilesForJob

ZAKAZ:
  · public/wm-print/ost-*.pdf + resolveOstTemplateBytes (klon architektury ZI)
  · ciche podstawianie bundled przy błędzie uploadu

DOZWOLONE:
  · Fixture testowy w scripts/ / audit/ (poza runtime app) — opcjonalnie
```

**Uzasadnienie:** REUSE istniejącego modelu upload (jak Izba/SEP), ZERO DUPLICATE względem ZI resolve/graft, DF „podpięcie pliku jak ZI **slot**” ≠ „jak ZI bundled Tauron path”.

**Prod (KV już niepusty):** seed się nie wykona — OPERACYJNIE: dodać slot `OST` w UI + upload PDF (lub jednorazowy ensure w IMPLEMENT **tylko** jeśli Owner GO na ensure-by-name; domyślnie AR = UI/upload, seed w `default-templates` dla greenfield).

---

## 9. AcroForm Gate — zaostrzenie AR

DF Gate pozostaje. AR dodaje:

```text
GATE-ACROFORM-OST (AR-amended)

PASS ⇔
  · detectWmPrintPdfFormType(bytes) === "acroform"
  · NIE "hybrid" / NIE "xfa" / NIE "none"
  · getForm() ma pola mapowalne → STREET / BUILDING / APARTMENT / CITY

FAIL (hybrid|xfa|none|brak pól)
  → IMPLEMENT BLOCKED
  → zakaz content-stream replace
```

Powód: gałąź hybrid w `generatePdfFormFromTemplate` woła ZI-specific `finalizeZiHybridForm` / `stripSection3WidgetAnnots`.

Artefakt Gate (lista pól + draft `pdfFieldMapping`) **przed** kodem produkcyjnym — bez zmiany: Gate PASS jest warunkiem startu IMPLEMENT (Owner dostarcza PDF / dowód).

---

## 10. Rollback

DF §9 — **PASS**.  
Thin guard zwiększa bezpieczeństwo rollbacku (wyłączenie slotu OST nie wymaga cofania Tauron).  
Regresja ZI przy edycji `generate-pdf.ts`: mitygacja = nie zmieniać ścieżki `name==="ZI"`; regresja smoke ZI obowiązkowa po guardzie.

---

## 11. Acceptance Criteria AC-01…12

| ID | Wykonalne? | Uwaga AR |
|----|------------|----------|
| AC-01 | TAK | Seed / UI slot |
| AC-02 | TAK | `pdf_form` |
| AC-03 | TAK | + thin guard |
| AC-04 | TAK | ZI path untouched; smoke regresji |
| AC-05–06 | TAK | Mapping + Gate nazwy pól |
| AC-07 | TAK | Vars only |
| AC-08 | TAK | Diff types |
| AC-09 | TAK | Upload-only ZIP |
| AC-10 | TAK | Artefakt Gate |
| AC-11–12 | TAK | Allowlist + brak 2. silnika |

**Werdykt:** PASS.

---

## 12. IMPLEMENT binding (po Owner GO)

Kolejność FROZEN przez AR:

1. **AcroForm Gate PASS** (pure `acroform` + lista pól + mapping).  
2. Thin guard w `generate-pdf.ts` (AR-DECISION-01).  
3. Seed / slot `OST` + `pdfFieldMapping` (AR-DECISION-02 upload-only).  
4. Upload PDF · smoke OST · regresja ZI · build.  
5. **Bez** zmian `generate-zip` dispatch (chyba że force).  
6. **Bez** bundled runtime OST.

---

## 13. WERDYKT KOŃCOWY

```text
ARCHITECTURE REVIEW: PASS

Blokery architektury: BRAK
Blokery produktowe przed kodem: AcroForm Gate (Owner/PDF) — procesowy, nie FAIL AR

DF thin amend dokumentu: NIE WYMAGANY
  (decyzje §7–§8 wiążą IMPLEMENT jako AR binding)

STOP.

Czekaj wyłącznie na:

OWNER GO IMPLEMENT
```

Bez implementacji · bez zmian kodu · bez commit · bez push.
