# WM-DRUK-OST-AUTO-GENERATE-01 — AUDIT ONLY

> **ID:** WM-DRUK-OST-AUTO-GENERATE-01-AUDIT  
> **EPIC:** WM-DRUK-OST-AUTO-GENERATE-01  
> **TRYB:** AUDIT ONLY · **Bez implementacji** · **Bez commit / push**  
> **Data:** 2026-08-05  
> **Wejście:** OST AcroForm **PASS** (prod slot · pdf-lib · getForm · setText · save · round-trip)  
> **Cel:** Ustalenie gdzie i jak automatycznie dołączać wypełniony OST do paczki ZIP Roboty  
> **Status:** AUDIT **COMPLETE** · DF [`WM-DRUK-OST-AUTO-GENERATE-01-DESIGN-FREEZE.md`](./WM-DRUK-OST-AUTO-GENERATE-01-DESIGN-FREEZE.md) · **WAITING FOR OWNER GO** (FROZEN S0/S2)

```text
════════════════════════════════════════════════════════
KLUCZOWY WERDYKT AUDYTU

  Pipeline ZIP już generuje OST on-the-fly.
  Nie potrzeba nowego silnika, cache ani Storage filled PDF.

  REUSE FIRST:
    buildWmPrintFilesForJob
      → generateFromTemplateBytes (name ≠ ZI · type pdf_form)
        → generatePdfFormFromTemplate(bytes, vars, pdfFieldMapping)
          → bajty tylko w pamięci → ZIP Odbiory/

  Rekomendacja: wariant A (generate tuż przed ZIP) = STAN OBECNY.
  Wariant B (cache) = ODRZUCONY.

  Thin slice IMPLEMENT (jeśli Owner GO) = tylko braki UX / guardy /
  wymuszenie selekcji / smoke E2E ZIP — NIE nowy generator.
════════════════════════════════════════════════════════
```

---

## 0. Kontekst

| Element | Stan |
|---------|------|
| Formularz OST | AcroForm (bez XFA / Encrypt) · wgrany do slotu OST |
| Generator | `generatePdfFormFromTemplate` **PASS** |
| Mapping | `pdfFieldMapping` SSOT (BUILDING/APARTMENT aliasy) |
| Wymaganie biznesowe | Przy pobraniu paczki ZIP: jeśli aktywny OST `pdf_form` → fill AcroForm → dołącz PDF do ZIP |
| Zakazy | **Nie** zapisywać filled PDF w Storage · **nie** kopia w bazie · on-the-fly only |

---

## 1. Pipeline paczki dokumentów (mapa)

```text
UI: WmPrintView.handleGenerateZip / handlePublishForInspector
        │
        ▼
downloadWmPrintZip  ──lub──  buildWmPrintDeliveryZipBytes
        │
        ▼
buildWmPrintDeliveryZipBytes
        │
        ├─① buildWmPrintFilesForJob(...)     ← dokumenty Odbiory/
        │     │
        │     ├─ Job + settings + opts → buildWmPrintVariableMap(vars)
        │     ├─ pool = enabled ∩ selectedTemplateIds
        │     │
        │     ├─ kind === "job_upload"
        │     │     → fetch jobDocs → copy bytes (bez fill)
        │     │
        │     └─ kind === "generated"  (OST, ZI, DOCX, PDF static, …)
        │           → fetch template files (storageUrl)
        │           → generateFromTemplateBytes(t, sourceBytes, vars)
        │                 ├─ ZI      → generatePdfZiTauron2026
        │                 ├─ pdf_form ≠ ZI → generatePdfFormFromTemplate  ★ OST
        │                 ├─ docx    → generateDocxFromTemplate
        │                 └─ pdf     → copyStaticPdfTemplate
        │           → WmPrintGeneratedFile[] (RAM only)
        │
        ├─② JSZip: Odbiory/{fileName} ← każdy generated file
        │
        ├─③ opcjonalnie Pomiary/  (delivery.includeMeasurements + RAP)
        │     → appendMeasurementDocxToZip + INDEX
        │
        ├─④ opcjonalnie Rysunki/  (delivery.includeDrawings + Final)
        │     → prepareDrawingZipFileEntries → appendNamedFilesToZip
        │
        └─⑤ zip.generateAsync → Blob download / publish upload
              (Historia = metadane only · filled PDF nie do KV)
```

**Miejsce tworzenia ZIP:** `src/lib/wm-print/generate-zip.ts`  
- `buildWmPrintDeliveryZipBytes` (L207–268) — budowa bytes  
- `downloadWmPrintZip` (L271–299) — download UI  
- publikacja: `WmPrintView.handlePublishForInspector` → ten sam `buildWmPrintDeliveryZipBytes`

---

## 2. Które dokumenty są obecnie dodawane automatycznie?

### 2.1 Folder `Odbiory/` (zawsze przy ZIP, z selekcji)

| Źródło | Warunek | Transformacja |
|--------|---------|---------------|
| Szablony `kind: generated` + `enabled` + zaznaczone | `files[]` niepuste | **on-the-fly generate** (DOCX / ZI / OST pdf_form / static PDF) |
| Szablony `kind: job_upload` + zaznaczone | jobDocs dla roboty | kopia uploadu per-job |
| Job docs bez `templateId` | istnieją | kopia „luźnych” plików robota |

**Domyślna selekcja UI:** wszystkie **enabled** szablony (`createDefaultWmPrintTemplateSelection`) — użytkownik może odznaczyć.

**OST dziś:** jeśli slot `OST` · `enabled` · `type: pdf_form` · ma wgrany plik · jest **zaznaczony** → już wpada w ★ ścieżkę `generatePdfFormFromTemplate` i trafia do ZIP. **Filled PDF nie jest zapisywany.**

### 2.2 Folder `Pomiary/` (opcjonalny hook)

| Warunek | Zawartość |
|---------|-----------|
| checkbox „Dołącz dokumenty pomiarowe” + aktywny RAP produkcyjny | 5× DOCX + INDEX-POMIARY |

### 2.3 Folder `Rysunki/` (opcjonalny hook)

| Warunek | Zawartość |
|---------|-----------|
| moduł Rysunki ON + checkbox + ≥1 Final | PDF rysunków (generateDrawingPdf) |

### 2.4 Co NIE jest osobnym cache filled PDF

- Historia WM Druk = **metadane** (`kw-wm-print-history`)  
- Publish inspektor = upload **gotowego ZIP** (nie osobny filled OST w Storage szablonów)

---

## 3. Gdzie najlepiej wygenerować OST?

| Opcja | Opis | Werdykt |
|-------|------|---------|
| **A** | Generować chwilę przed / w trakcie budowy listy plików ZIP | **RECOMMENDED = STAN OBECNY** |
| **B** | Generować wcześniej i trzymać w cache / Storage / KV | **ODRZUCONE** |

### Uzasadnienie A

1. Wymaganie Ownera: **on-the-fly · bez Storage · bez bazy** — dokładnie to robi `buildWmPrintFilesForJob`.  
2. Te same `vars` co ZI/DOCX (`buildWmPrintVariableMap`).  
3. Zero ryzyka stale cache przy zmianie adresu roboty / daty / settings.  
4. ZI już działa tą ścieżką — OST jest drugim konsumentem `pdf_form`.  
5. Publish + download używają **tego samego** `buildWmPrintDeliveryZipBytes` → spójność.

### Dlaczego nie B

- Sprzeczność z „Nie zapisujemy wygenerowanego PDF w Storage”.  
- Wymaga invalidacji przy zmianie Job / mapping / szablonu.  
- Duplikacja logiki względem istniejącego generate path.  
- ZERO DUPLICATE LOGIC / REUSE FIRST — naruszenie.

---

## 4. Czy OST może używać tych samych danych Roboty?

**TAK — już używa.**

```text
buildWmPrintVariableMap(job, settings, opts)
  ← job.address, job.flatNumber
  ← settings.defaultCity (JOB_CITY fallback „Wrocław”)
  ← opts.dateMode / customDate (DATE, YEAR)
```

| Pole AcroForm OST | `WmPrintVariableKey` | Źródło |
|-------------------|----------------------|--------|
| `JOB_STREET` | `JOB_STREET` | `parseJobAddressParts` |
| `BUILDING` | `JOB_BUILDING` | alias w `pdfFieldMapping` |
| `APARTMENT` | `JOB_APARTMENT` | alias w `pdfFieldMapping` |
| `JOB_CITY` | `JOB_CITY` | settings / Wrocław |

**Brak potrzeby** osobnego adaptera Job→OST. Mapping SSOT: `WM_PRINT_OST_PDF_FIELD_MAPPING` / slot `pdfFieldMapping`.

**Residual (poza scope AUTO-GENERATE, informacyjnie):** w zweryfikowanym prod PDF brak pola nazwanego `JOB_CITY` (są JOB_STREET/BUILDING/APARTMENT). Mapping JOB_CITY → setText ×0 dla miasta. Adres krytyczny (ulica/budynek/lokal) **PASS**. Uzupełnienie `JOB_CITY` w PDF = osobny brief formularza, nie kod generatora.

---

## 5. Hook / pipeline dla dokumentów dynamicznych?

| Warstwa | Istnieje? | Rola |
|---------|-----------|------|
| **`generateFromTemplateBytes`** | **TAK** | SSOT dispatch per typ szablonu (dynamic fill) |
| **`buildWmPrintFilesForJob`** | **TAK** | orkiestracja generated + job_upload → lista plików RAM |
| **`WmPrintDeliveryZipOptions`** | **TAK** | opcjonalne appendy Pomiary / Rysunki (poza Odbiory/) |
| Osobny „dynamic document registry” | **NIE** | niepotrzebny — szablon `pdf_form` = kontrakt |
| Cache filled forms | **NIE** | celowo — on-the-fly only |

**Wniosek:** hook dla OST = istniejąca gałąź `type === "pdf_form" && name !== "ZI"`. Nie tworzyć równoległego pipeline’u „OST special”.

---

## 6. Propozycja architektury

### 6.1 Target flow (wiązanie z wymaganiami)

```text
Warunek ACTIVE OST:
  name.trim()==="OST"
  ∧ type==="pdf_form"
  ∧ enabled===true
  ∧ getWmPrintTemplateFiles(t).length > 0
  ∧ (selected ∨ forceInclude — decyzja Owner w DF)

Przy ZIP / Publish:
  1. buildWmPrintVariableMap(job, …)          // REUSE
  2. fetch template bytes (storageUrl)         // szablon blank
  3. generatePdfFormFromTemplate(…, mapping)   // REUSE — fill
  4. push { fileName, bytes } do Odbiory/      // RAM only
  5. JSZip.generateAsync → download / publish
  6. Historia metadane only

ZAKAZ:
  · persist filled OST do Storage / KV / jobDocs
  · nowy generator / parser XFA / obejścia pdf-lib
  · cache filled PDF
```

### 6.2 Decyzja selekcji (do Owner GO w DF)

| Wariant | Zachowanie | Koszt |
|---------|------------|-------|
| **S0 — Status quo** | OST w ZIP gdy zaznaczony (domyślnie ON wśród enabled) | **0 LOC** — AcroForm PASS wystarczy |
| **S1 — Soft ensure** | Przy starcie ZIP, jeśli ACTIVE OST i odznaczony → toast / auto-dodaj do selection | thin UI |
| **S2 — Hard force** | ACTIVE OST zawsze w pool niezależnie od checkboxa | thin change w `buildWmPrintFilesForJob` lub przed call |

Wymaganie „automatycznie” najbliżej **S0** (już działa przy default selection) lub **S2** (nie da się pominąć). **Owner wybiera w DF.**

### 6.3 REUSE (zakaz duplikacji)

| Komponent | Akcja |
|-----------|-------|
| `generatePdfFormFromTemplate` | **NO TOUCH** (PASS) |
| `generateFromTemplateBytes` | **NO TOUCH** (L114 już OST) |
| `buildWmPrintVariableMap` | **NO TOUCH** |
| `buildWmPrintFilesForJob` | tylko jeśli S1/S2 / fail-loud guard |
| `buildWmPrintDeliveryZipBytes` | tylko jeśli smoke / counters |
| Nowy plik `generate-ost.ts` | **ZAKAZ** |

### 6.4 Fail-loud (opcjonalny thin guard)

Dziś: brak pliku w slocie → pętla `groupFiles` pusta → OST **cicho pominięty**.  
Propozycja (DF): jeśli OST selected/forced ∧ `files.length===0` → throw / toast „Wgraj szablon OST”.  
Jeśli selected ∧ generate zwraca null → fail ZIP (już częściowo przez „Brak dokumentów” gdy cała lista pusta).

---

## 7. Ryzyka regresji

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Nowy równoległy generator OST | **WYSOKI** | Zakaz — tylko REUSE L114 |
| Cache / Storage filled PDF | **WYSOKI** | Zakaz w DF |
| Force-include zmienia fingerprint publish | **ŚREDNI** | Zaktualizować `buildDeliveryPackageGenerationFingerprint` w tym samym slice |
| OST odznaczony → brak w ZIP (S0) | **NISKI** | Dokumentacja / S1/S2 |
| Stary LiveCycle PDF wraca do slotu | **ŚREDNI** | Owner process: nie wgrywać XFA; opcjonalnie detect formType + fail-loud |
| ZI / DOCX / Pomiary / Rysunki | **NISKI** przy NO TOUCH generatorów | Allowlist plików |
| JOB_CITY brak w PDF | **NISKI** dla AUTO-GENERATE | Osobny brief PDF |
| Payroll / Cloud merge | **NONE** | Poza zakresem |

---

## 8. Lista plików (orientacja IMPLEMENT — po GO)

### Read / REUSE (prawdopodobnie bez zmian)

| Plik | Rola |
|------|------|
| `src/lib/wm-print/generate-zip.ts` | ZIP + `buildWmPrintFilesForJob` + dispatch |
| `src/lib/wm-print/generate-pdf.ts` | `generatePdfFormFromTemplate` |
| `src/lib/wm-print/variables.ts` | Job → vars |
| `src/lib/wm-print/default-templates.ts` | `WM_PRINT_OST_PDF_FIELD_MAPPING` |
| `src/lib/wm-print/templates.ts` | enabled / files |
| `src/lib/wm-print/template-selection.ts` | default selection |
| `src/app/WmPrintView.tsx` | UI ZIP / publish |

### Możliwe thin edits (tylko jeśli DF ≠ S0)

| Plik | Gdy |
|------|-----|
| `generate-zip.ts` | S2 force-include / fail-loud empty OST |
| `WmPrintView.tsx` | S1 toast / ensure selection |
| `template-selection.ts` | pin OST w default |
| `delivery-package-publications/publication.ts` | fingerprint parity przy force |
| `scripts/test-wm-druk-ost-01.mjs` (+ nowy smoke ZIP) | regresja |
| `GuideView` / changelog | copy „OST w paczce” |

### Poza allowlistą

`cloud-sync` merge · Edge · Storage upload filled · ZI Tauron · EM · Rysunki silniki · Payroll.

---

## 9. PLAN implementacji (po Owner GO — kolejność procesu)

```text
AUDIT (ten dokument)     ← DONE
    ↓
DESIGN FREEZE            ← Owner wybiera S0 / S1 / S2 + fail-loud Y/N
    ↓
ARCHITECTURE REVIEW
    ↓
OWNER GO IMPLEMENT
    ↓
IMPLEMENT (thin slice wg DF)
    ↓
OWNER VERIFICATION
    ↓
COMMIT → PUSH → PRODUCTION VERIFY → CLOSE
```

### Proponowane AC (do DF)

1. ACTIVE OST + Generuj ZIP → w `Odbiory/` jest PDF OST z wypełnionymi JOB_STREET / BUILDING / APARTMENT.  
2. Filled PDF **nie** pojawia się jako nowy obiekt w Storage szablonów / jobDocs.  
3. Te same vars co pozostałe generated (adres z Job).  
4. ZI / DOCX / static PDF / Pomiary / Rysunki bez regresji.  
5. Smoke: fixture lub prod template → `buildWmPrintDeliveryZipBytes` zawiera entry OST.  
6. (Jeśli S2) Odznaczenie OST nie usuwa go z ZIP gdy ACTIVE.

### Rekomendacja audytora

- **S0** wystarczy, jeśli produktowo „automatycznie” = „w domyślnej paczce przy zaznaczonych aktywnych szablonach” (obecne zachowanie + AcroForm PASS).  
- Jeśli Owner chce **twarde** „zawsze gdy ACTIVE” → **S2** thin w `buildWmPrintFilesForJob`.  
- **Nie** otwierać epica generatora / cache.

---

## 10. Odpowiedzi na pytania audytu (skrót)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Które dokumenty auto? | Enabled∩selected generated (on-the-fly) + job_upload docs + opcjonalnie Pomiary/Rysunki |
| 2 | Gdzie generować OST? | `buildWmPrintFilesForJob` → `generateFromTemplateBytes` (**już**) |
| 3 | A vs B? | **A** (przed ZIP) · **B odrzucone** |
| 4 | Te same dane Job? | **TAK** — `buildWmPrintVariableMap` |
| 5 | Hook dynamiczny? | **TAK** — `generateFromTemplateBytes` + delivery options |
| 6 | Architektura? | REUSE istniejącego pipeline · thin S0/S1/S2 · no Storage filled |

---

## 11. NEXT STATE

**WAITING FOR OWNER GO** → DESIGN FREEZE (wybór S0/S1/S2).

**NIE** start IMPLEMENT bez GO.  
**NIE** commit / push z tego audytu (docs commit tylko na polecenie Ownera).

---

*AUDIT ONLY · WM-DRUK-OST-AUTO-GENERATE-01 · 2026-08-05*
