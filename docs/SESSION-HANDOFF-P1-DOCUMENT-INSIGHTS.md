# SESSION HANDOFF — P1 Document Insights (Owner View)

> **Status:** **P1A–P1D CLOSED** · **PRODUCTION RELEASE**  
> **Wersja:** **2.59.52** · commit **`ff20fec`**  
> **Data:** 2026-06-17  
> **Hasło sesji:** „kontynuuj WGDOM”

**Czytaj ten plik przy:** podglądzie dokumentów przetargowych, Owner View, modal `JobFilePreviewModal`, Executive Summary, PDF przedmiar/kosztorys, ATH/NOR preview UX.

**Powiązane (nie duplikować):**

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) | Pipeline ZIP/7Z, dossier, parsery |
| [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) | Wycena, kosztorys snapshot, catalogQuantities |
| [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) | Baseline prod SSOT |

---

## 1. Problem biznesowy (dlaczego P1)

Właściciel firmy otwierał przedmiar/kosztorys z Owner View i widział **surowy dump KNR** bez odpowiedzi na pytania:

1. Co otworzył?
2. Ile jest pozycji?
3. Jakie są główne roboty?
4. Czy są ceny?
5. Czy można liczyć ofertę?

**P1** to warstwa **UX-only** nad istniejącym snapshotem `tenderDossier` — **bez zmian parserów, pipeline, FIX-A/B/C**.

---

## 2. Serie P1 — podział odpowiedzialności

| Seria | Nazwa | Commit / release | Zakres |
|-------|-------|------------------|--------|
| **P0** | ATH preview hotfix | `fb9b8bd` (2.59.51) | PDF w 7Z, outer archive, klasyfikacja PDF≠ATH |
| **P0.2** | PDF MIME | *(w P1A modal)* | `application/pdf` blob zamiast `x-7z-compressed` |
| **P1A** | PDF Preview UX Cleanup | `ff20fec` | Etykiety SWZ/przedmiar/kosztorys, CAD banner, default tab, download |
| **P1B** | Document Summary Header | `ff20fec` | Karta: typ, pozycje, status cen, wycena, źródło |
| **P1C** | Executive Summary | `ff20fec` | Główne roboty z `categories[]` / parseResult |
| **P1D** | Work Scope Inference | `ff20fec` | Główne roboty z opisów gdy brak `categories[]` |

**Nie mieszać z:** INSPECTOR-P1A/P1B (pakiet odbiorowy inspektora) — inny kontekst „P1”.

---

## 3. Architektura UI (Owner → Modal)

```text
TenderDetailPanel
  └── TenderOwnerView
        └── CTA „Otwórz przedmiar” / kosztorys
              └── resolveAthPreviewItem()  (tender-ath-quick-access.ts)
                    └── InspectorFileItem { kind: tenderBzp, previewContext }
                          └── JobFilePreviewModal
                                ├── DocumentSummaryHeader      (P1B)
                                ├── ExecutiveSummaryCard       (P1C + P1D)
                                └── treść / PDF iframe / tabela KNR
```

### Kto widzi Executive Summary?

| Dokument | Summary |
|----------|---------|
| Przedmiar PDF | TAK |
| Kosztorys PDF | TAK |
| ATH / NOR | TAK |
| SWZ / OPZ / PFU / PDF techniczny | NIE |

---

## 4. Przepływ danych (bez nowych endpointów)

```text
tenderDossier.kosztorys (snapshot po pipeline P2-H / P2-G)
  ├── rowCount, categories[], catalogQuantities[], rows[]
  ├── sourceFilename, sourceDocumentIndex, zipInnerPath
  ├── totalValue, costStatus (via resolvedCostStatus)
  └── brief.scopeDescription

buildPreviewContextFromPipelineItem()  →  previewContext na InspectorFileItem
  ├── P1A: pdfRole, rowCount, pdfPrzedmiarCase, priced
  ├── P1B: costStatus, docType, totalValueDisplay, sourceLabel, categoryCount
  └── P1D: categoryNames, catalogDescriptions, rowDescriptions, scopeDescription

JobFilePreviewModal
  ├── buildDocumentPreviewSummary(previewContext, parseResult)  → P1B
  └── buildExecutiveSummary(previewContext, docSummary, parseResult)  → P1C/P1D
```

**Fallback po załadowaniu modala:** `parseResult` z `fetchAndParseKosztorys` / `parseKosztorysBytes` (ATH/NOR) — gdy brak pól w snapshot.

---

## 5. Pliki SSOT (P1)

### Lib — logika

| Plik | Rola |
|------|------|
| `src/lib/tender-pdf-preview-ux.ts` | **P1A** — role PDF, etykiety modal, `buildPreviewContextFromPipelineItem`, download helper |
| `src/lib/tender-document-summary-header.ts` | **P1B** — mapowanie status/wycena, `buildDocumentPreviewSummary` |
| `src/lib/tender-executive-summary.ts` | **P1C** — `buildExecutiveSummary`, integracja P1D |
| `src/lib/tender-work-scope-inference.ts` | **P1D** — słownik branżowy, ranking, pewność rozpoznania |
| `src/lib/tender-ath-quick-access.ts` | `resolveAthPreviewItem()` + `previewContext` |
| `src/lib/tender-data-ssot.ts` | `resolvedCostStatus`, `classifyCostDocument` (read-only dla P1) |

### UI

| Plik | Rola |
|------|------|
| `src/app/JobFilePreviewModal.tsx` | Modal — integracja wszystkich warstw P1 |
| `src/app/DocumentSummaryHeader.tsx` | **P1B** — niebieska karta podsumowania |
| `src/app/ExecutiveSummaryCard.tsx` | **P1C/P1D** — główne roboty + pewność |
| `src/app/JobInspectorFilesPanel.tsx` | Typ `previewContext` na `InspectorFileItem` |
| `src/app/TenderAttachmentsPanel.tsx` | Przekazanie `previewContext` przy preview BZP |

---

## 6. P1B — Document Summary Header

**Pola karty:**

| Etykieta | Źródło |
|----------|--------|
| Nagłówek | PRZEDMIAR ROBÓT / KOSZTORYS / KOSZTORYS ATH / NOR |
| Typ | Przedmiar PDF / Kosztorys PDF / ATH / NOR |
| Pozycje | `kosztorys.rowCount` |
| Status | FOUND_NO_VALUE → „Przedmiar bez cen”; FOUND_WITH_VALUE → „Zawiera ceny” / „Kosztorys wyceniony”; NOT_FOUND → komunikat |
| Wartość | `totalValue` gdy FOUND_WITH_VALUE |
| Wycena | Gotowa / Wymaga kalkulacji / Brak danych |
| Źródło | archiwum zewnętrzne (`UMiG.7z`) lub nazwa pliku |
| Działy | `categories.length` (bonus, tylko gdy > 0) |

---

## 7. P1C + P1D — Executive Summary

### Kolejność źródeł głównych robót (P1D)

1. `kosztorys.categories[].name` (snapshot)
2. `parseResult.categories` (ATH/NOR po parse)
3. `parseResult.rows[].category`
4. `parseResult.rows[].description` + snapshot `rows[]`
5. `catalogQuantities[].description` ← **klucz dla PDF przedmiar bez categories**
6. `brief.scopeDescription` (fallback, niska pewność)

### Grupy branżowe (P1D)

Kanalizacja · Wodociąg · Drogi/nawierzchnie · Elektryka · Kubatura · Termomodernizacja · Roboty ziemne · Rozbiórki

Max **5** grup, ranking po liczbie trafień słów kluczowych, bez kodów KNR.

### Pewność rozpoznania

| Poziom | Warunek (skrót) |
|--------|-----------------|
| **Wysoka** | categories z snapshot/parse LUB ≥10 trafień w top grupie LUB ≥25 łącznie |
| **Średnia** | ≥3 trafienia w top grupie LUB ≥8 łącznie |
| **Niska** | dowolne trafienie z inferencji |

### Znane ograniczenie

**PDF przedmiar CASE 2** (brak warstwy tekstowej, pusty snapshot): Executive Summary pokaże fallback *„Nie udało się określić…”* dopóki pipeline nie wypełni `catalogQuantities` lub `scopeDescription`.

Przykład **Rynek_IS_W_PR_20260410.pdf** z `catalogQuantities` (221 poz.): kanalizacja, roboty ziemne, nawierzchnie, elektryka, rozbiórki — pewność **Wysoka**.

---

## 8. P1A — PDF Preview UX (skrót)

| Element | Zachowanie |
|---------|------------|
| Tytuł modala | Dynamiczny: Przedmiar robót / Kosztorys PDF / SWZ / nazwa pliku |
| Zakładka domyślna | Przedmiar PDF → `text` (nie iframe) |
| CAD banner | Przedmiar PDF + CASE 2/3 |
| Pobierz PDF | `triggerBlobDownload()` — poprawna nazwa i MIME `application/pdf` |
| `previewContext` | Owner View przekazuje kontekst z dossier |

---

## 9. Smoke / regresja

```bash
npm run build

# P1 (obowiązkowe po zmianach w tym obszarze)
npx vite-node scripts/test-p1-pdf-preview-ux.mjs
npx vite-node scripts/test-p1b-document-summary-header.mjs
npx vite-node scripts/test-p1c-executive-summary.mjs
npx vite-node scripts/test-p1d-work-scope-inference.mjs

# Regresja preview / owner
npx vite-node scripts/test-p0-ath-preview-hotfix.mjs
npx vite-node scripts/test-p5-owner-view.mjs
```

| Skrypt | Asercje |
|--------|---------|
| `test-p1-pdf-preview-ux.mjs` | 29 |
| `test-p1b-document-summary-header.mjs` | 40 |
| `test-p1c-executive-summary.mjs` | 34 |
| `test-p1d-work-scope-inference.mjs` | 31 |

---

## 10. Czego NIE ruszać bez briefu

| Obszar | Powód |
|--------|-------|
| `tender-dossier-pipeline.ts` | Parser / snapshot — poza P1 |
| `pdf-przedmiar-heuristic.ts` | P2-H.5B |
| FIX-A `updateItem` / FIX-B klasyfikacja / FIX-C cache | Osobne serie P3 |
| `ath-parser.ts` | Parser ATH/NOR |
| INSPECTOR delivery package P1A/P1B | Inny moduł |

**Dozwolone w P1+:** rozszerzenie `previewContext`, nowe pola w kartach UX, słownik P1D, testy smoke.

---

## 11. Backlog OPEN (kolejne kroki)

| ID | Opis | Priorytet |
|----|------|-----------|
| **P3-FIX-C-UX-001** | Komunikat „Kosztorys oczekuje na przetworzenie” przy lazy dossier | UX Owner View |
| **P1E** *(propozycja)* | OCR / lepsza ekstrakcja PDF CASE 2 — wymaga parsera, poza P1 | niski bez briefu |
| **P2-H.7** | Edge magic bytes 7z | pipeline |
| Rozszerzenie słownika P1D | Ogrodzenia, zieleń, HVAC — tylko `tender-work-scope-inference.ts` | łatwe |

---

## 12. Szybka mapa „gdzie szukać”

| Pytanie | Plik |
|---------|------|
| Jak budowany jest preview item? | `tender-ath-quick-access.ts` → `resolveAthPreviewItem` |
| Skąd `previewContext`? | `tender-pdf-preview-ux.ts` → `buildPreviewContextFromPipelineItem` |
| Mapowanie status cen? | `tender-document-summary-header.ts` → `mapCostStatusLabel` |
| Inferencja branż? | `tender-work-scope-inference.ts` → `inferWorkScope` |
| Render kart w modalu? | `JobFilePreviewModal.tsx` |
| Owner View CTA? | `TenderOwnerView.tsx` + `TenderDetailPanel.tsx` |

---

*Ostatnia aktualizacja: 2026-06-17 · P1 Document Insights Release **2.59.52** · `ff20fec`*
