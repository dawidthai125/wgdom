# WM-DRUK-OST-01 — AUDIT ONLY

> **Tryb:** AUDIT ONLY · **Bez implementacji** · **Bez commit / push**  
> **Data:** 2026-08-04  
> **Cel:** Dodać formularz **WM-Druk-OST.pdf** do WM Druk tak jak ZI — **REUSE FIRST**  
> **Status:** AUDIT **PASS** · DF FROZEN · AR [`WM-DRUK-OST-01-ARCHITECTURE-REVIEW.md`](./WM-DRUK-OST-01-ARCHITECTURE-REVIEW.md) (**PASS**) · **WAITING FOR OWNER GO IMPLEMENT**

---

## 1. RCA

### Problem biznesowy

W module **Odbiory WM Druk** brakuje formularza **OST** (`WM-Druk-OST.pdf`). Ma trafiać do pakietu ZIP / download tak samo jak **ZI.pdf**, z danymi adresowymi roboty.

### Co „identycznie jak ZI” oznacza w kodzie (fakt)

| Warstwa | ZI dziś | Implikacja dla OST |
|--------|---------|-------------------|
| Slot szablonu | `kind: generated`, `name: "ZI"`, `type: pdf_form` | Nowy slot `OST` (lub ustalona nazwa), ten sam model KV |
| Orkiestracja | `buildWmPrintFilesForJob` → `generateFromTemplateBytes` | **REUSE** bez drugiej ścieżki ZIP |
| Mapa zmiennych Job | `buildWmPrintVariableMap` + `parseJobAddressParts` | **REUSE** — ulica / budynek / lokal / miasto |
| Silnik PDF ZI | **tylko** `name === "ZI"` → `generatePdfZiTauron2026` (AcroForm §4 + graft) | **Nie** wywoływać generatora Tauron dla OST |
| Placeholdery `{{…}}` w PDF | ZI **nie** wypełnia literałów `{{JOB_STREET}}` w content stream | OST deklaruje `{{…}}` — wymaga weryfikacji struktury PDF |

### Luka techniczna (root cause vs oczekiwanie)

1. **ZI ≠ string replace `{{VAR}}`.** Produkcyjny ZI wypełnia pola AcroForm (`Pole tekstowe 95/96/97`) wartościami z `WmPrintVariableKey`.
2. **`type: "pdf"` (Izba, SEP, …)** = `copyStaticPdfTemplate` — **bajtowa kopia, zero podmiany**. Nie nadaje się do OST z polami do wypełnienia.
3. **`type: "pdf_form"` + `name !== "ZI"`** już dziś wpada w `generatePdfFormFromTemplate` + `pdfFieldMapping` — gałąź oznaczona jako „martwa w prod”, ale **API istnieje** (REUSE, nie nowy silnik).
4. Aliasów **`BUILDING` / `APARTMENT`** **nie ma** w `WmPrintVariableKey` (SSOT: `JOB_BUILDING` / `JOB_APARTMENT`). Legend UI pokazuje tylko klucze SSOT.
5. `JOB_CITY` już ma fallback uniwersalny: `settings.defaultCity || "Wrocław"` — **bez hardcodu w formularzu**.

### Werdykt RCA

OST ma wejść jako **kolejny konsument istniejącego pipeline’u szablonów**, nie jako klon Tauron ZI. Wypełnianie = istniejący **`pdf_form` + mapowanie pól → `WmPrintVariableKey`**, o ile `WM-Druk-OST.pdf` jest formularzem AcroForm (lub pola o nazwach równych tokenom).  
Jeśli OST to skan z tekstem `{{…}}` w content stream (bez AcroForm) — **obecny pipeline tego nie robi**; dopisanie replace content stream = **nowy silnik** → **OUT** (zakaz Ownera).

---

## 2. Current Architecture

```text
Job (address, flatNumber) + WmPrintSettings
        │
        ▼
buildWmPrintVariableMap  ──►  DATE, YEAR, JOB_ADDRESS,
                              JOB_STREET, JOB_BUILDING,
                              JOB_APARTMENT, JOB_CITY
        │
        ▼
buildWmPrintFilesForJob  (wybór slotów / checkboxy)
        │
        ▼
generateFromTemplateBytes(template, bytes, vars)
        │
        ├─ name==="ZI"     → pdf_form → generatePdfZiTauron2026  (AcroForm + graft)
        ├─ type==="pdf_form" (≠ZI) → generatePdfFormFromTemplate(mapping)
        ├─ type==="docx"   → generateDocxFromTemplate → substituteWmPrintVariables({{KEY}})
        └─ type==="pdf"    → copyStaticPdfTemplate  (bez vars)
        │
        ▼
ZIP / pojedynczy download (ten sam flow)
```

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/wm-print/generate-zip.ts` | Orkiestracja + dispatch typów |
| `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` | **Tylko ZI** Tauron 2026 |
| `src/lib/wm-print/generate-pdf.ts` | `generatePdfFormFromTemplate` (legacy / non-ZI pdf_form) |
| `src/lib/wm-print/variables.ts` | SSOT mapy zmiennych + substitute DOCX |
| `src/lib/wm-print/address-vars.ts` | Parsowanie ulicy / budynku / lokalu |
| `src/lib/wm-print/default-templates.ts` | Seed 13 slotów (w tym ZI) |
| `src/lib/wm-print/types.ts` | `WmPrintVariableKey` + legenda labeli |
| `src/app/WmPrintView.tsx` | UI slotów + legenda `{{KEY}}` |
| `public/wm-print/zi-tauron-2026-template.pdf` | Bundled fallback ZI |

### Lista seed szablonów (dziś)

Oświadczenia DOCX ×4 · **ZI** (`pdf_form`) · Izba / Uprawnienia / SEP / Wzorcowanie (`pdf`) · job_upload ×4.

### Ładowanie szablonów

- Pliki w storage (URL w `WmPrintTemplateFile`) · fetch przez `fetchWmPrintFileBytes`
- ZI: dodatkowy resolve bundled Tauron w ścieżce generatora ZI
- Seed tylko gdy local+cloud puste (guard pollution)

---

## 3. Reuse Map

| Potrzeba OST | REUSE (istniejące) | NIE robić |
|--------------|-------------------|-----------|
| Slot w WM Druk | Model `WmPrintTemplate` + UI upload/enable/sort | Nowy KV / nowy widok |
| ZIP / download | `buildWmPrintFilesForJob` | Drugi builder ZIP |
| Dane Job → pola | `buildWmPrintVariableMap` + `address-vars` | Osobny parser adresu |
| Miasto + fallback | `JOB_CITY` = `defaultCity \|\| "Wrocław"` | Hardcode „Wrocław” w PDF |
| Wypełnienie PDF formularza | `generatePdfFormFromTemplate` + `pdfFieldMapping` | `generatePdfZiTauron2026` dla OST |
| Placeholdery DOCX-style | `substituteWmPrintVariables` (tylko DOCX) | Nowy PDF text-replace engine |
| Alias BUILDING/APARTMENT | Mapowanie **nazwa pola PDF → `JOB_BUILDING` / `JOB_APARTMENT`** | Nowe klucze SSOT bez potrzeby (opcjonalnie tylko legenda) |
| Generator ZI | bez zmian | Kopiowanie logiki graft / Pole tekstowe 95–97 |

**Jedyna cienka gałąź w dispatchu:** już istnieje — `pdf_form` ∧ `name !== "ZI"` → `generatePdfFormFromTemplate`.

---

## 4. Placeholder Mapping

### Wymaganie Ownera → SSOT wartości

| Token w formularzu OST | Semantyka | Wartość z pipeline |
|------------------------|-----------|--------------------|
| `{{JOB_STREET}}` | ulica | `vars.JOB_STREET` |
| `{{BUILDING}}` | numer budynku | `vars.JOB_BUILDING` (alias) |
| `{{APARTMENT}}` | numer mieszkania | `vars.JOB_APARTMENT` (alias) |
| `{{JOB_CITY}}` | miejscowość | `vars.JOB_CITY` (`defaultCity` lub fallback „Wrocław”) |

### Mechanizm REUSE (propozycja audytowa)

Nie dodawać kluczy `BUILDING`/`APARTMENT` do enumu SSOT, o ile nie jest to konieczne dla DOCX.

**`pdfFieldMapping` (przykład):**

```text
"{{JOB_STREET}}"  → JOB_STREET
"{{BUILDING}}"    → JOB_BUILDING
"{{APARTMENT}}"   → JOB_APARTMENT
"{{JOB_CITY}}"    → JOB_CITY
```

(Jeśli AcroForm używa nazw **bez** nawiasów — mapować faktyczne nazwy pól po inspekcji PDF w Design Freeze / Thin Slice.)

### Legenda UI dziś

`WM_PRINT_VARIABLE_KEYS` → `{{JOB_STREET}}`, `{{JOB_BUILDING}}`, … — **bez** `{{BUILDING}}` / `{{APARTMENT}}`.  
Thin Slice może: (a) tylko mapping w slocie OST, (b) dopisek w legendzie „alias OST” — decyzja DF.

---

## 5. Scope IN

- AUDIT (ten dokument) → Design Freeze → (później) thin implement **po Owner GO**
- Nowy slot szablonu **OST** (nazwa kanoniczna do zamrożenia w DF)
- `type: pdf_form`, `kind: generated`
- Upload / podpięcie pliku **WM-Druk-OST.pdf** jak inne wygenerowane PDF
- `pdfFieldMapping` aliasów → SSOT keys
- Udział w tym samym ZIP / download
- Smoke / test mapowania (bez ruszania ZI)
- Dokumentacja continuity po CLOSE (po IMPLEMENT)

---

## 6. Scope OUT

- Nowy silnik PDF / drugi replace engine / drugi generator
- Kopiowanie `generatePdfZiTauron2026` / graft pdf.js / LiveCycle
- Zmiany w istniejących dokumentach (ZI, DOCX oświadczenia, Izba/SEP/…, EM, schematy)
- Content-stream mustache replace dla `type: pdf`
- Hardcode miasta w pliku PDF
- Nowy klucz KV
- Zmiany merge/sync cloud poza ew. seed/normalize szablonów (minimalnie, po DF)
- Pomiary elektryczne / Audit Hub / payroll

---

## 7. Risks

| # | Ryzyko | Impact | Mitygacja (DF) |
|---|--------|--------|----------------|
| R1 | OST.pdf **bez AcroForm** (tylko tekst `{{…}}`) | Fill niemożliwy bez nowego silnika | **Gate:** inspekcja PDF przed IMPLEMENT; jeśli brak form → Owner decyzja (przeformułować PDF / HOLD) |
| R2 | Nazwy pól ≠ tokeny Ownera | Puste pola | Inspekcja `getForm().getFields()` + mapping 1:1 |
| R3 | `generatePdfFormFromTemplate` **merguje zawsze** `WM_PRINT_ZI_PDF_FIELD_MAP` | Kolizja / zbędne sety | Thin fix: merge ZI map **tylko** gdy `name==="ZI"` **albo** nie używać tej ścieżki bez audytu kolizji (OST nie ma „Pole tekstowe …”) |
| R4 | Funkcja oznaczona `@deprecated` / „martwa gałąź” | Regresja / niepewność | Smoke OST + regresja ZI (ZI nadal Tauron path) |
| R5 | Seed pollution (nowy slot na wszystkich instalacjach) | Duplikaty / konflikt nazw | Guard jak ZI: seed tylko puste; prod = ręczny slot / migracja kontrolowana |
| R6 | `formatBuildingForZi2026` (obcięcie) | Inny format nr budynku na ZI vs OST | OST **nie** używa ZI formattera — surowy `JOB_BUILDING` |
| R7 | Alias w legendzie vs SSOT | Dezorientacja | DF: alias tylko w mappingu OST **lub** jawna legenda „OST aliases” |

---

## 8. Thin Slice

**Cel:** jeden slot OST wypełnia 4 pola z Job i ląduje w ZIP — zero zmian ZI.

1. Potwierdzić strukturę `WM-Druk-OST.pdf` (AcroForm + nazwy pól).
2. Dodać / włączyć szablon `name: "OST"` (lub zamrożona nazwa), `type: pdf_form`, mapping aliasów.
3. Podpiąć plik storage jak ZI.pdf (bez bundled Tauron resolve).
4. Ścieżka: istniejący `generateFromTemplateBytes` → `generatePdfFormFromTemplate` (nie Tauron).
5. Ewentualny micro-fix: nie merge’ować `WM_PRINT_ZI_PDF_FIELD_MAP` dla non-ZI (tylko jeśli R3 potwierdzone).
6. Test: unit mapowania + 1 smoke fill OST; regresja: ZI nadal `generatePdfZiTauron2026`.
7. Legenda: opcjonalny dopisek aliasów (poza krytyczną ścieżką fill).

**Definition of Done (Thin Slice):** ZIP zawiera `…-OST….pdf` z wypełnionymi ulicą / budynkiem / lokalem / miastem dla przykładowej roboty; ZI bez regresji.

---

## 9. Design Freeze Proposal

### DF-01 — Product parity

„Identycznie jak ZI” = **ten sam produktowy pipeline** (slot → vars → `generateFromTemplateBytes` → ZIP/download), **nie** ten sam plik generatora Tauron.

### DF-02 — Silnik

- OST: **`pdf_form`** + istniejący **`generatePdfFormFromTemplate`**
- ZI: bez zmian → **`generatePdfZiTauron2026`**
- Zakaz: nowy generator, PDF content-stream mustache, kopiuj-wklej ZI

### DF-03 — Nazwa slotu

Propozycja kanoniczna: **`OST`** (jak `ZI` — krótka nazwa dispatch/UX).  
Plik źródłowy: `WM-Druk-OST.pdf` (originalFileName).

### DF-04 — Mapping

```text
pole PDF (token / nazwa)     → WmPrintVariableKey
{{JOB_STREET}} lub JOB_STREET → JOB_STREET
{{BUILDING}}   lub BUILDING   → JOB_BUILDING
{{APARTMENT}}  lub APARTMENT  → JOB_APARTMENT
{{JOB_CITY}}   lub JOB_CITY   → JOB_CITY
```

Dokładne klucze lewego mapowania = wynik inspekcji PDF (Owner / Thin Slice gate).

### DF-05 — Miasto

Wyłącznie `vars.JOB_CITY` z ustawień WM (`defaultCity`) z fallbackiem runtime „Wrocław”. Bez hardcodu w PDF.

### DF-06 — Alias SSOT

**Preferowane:** alias tylko w `pdfFieldMapping` (bez nowych `WmPrintVariableKey`).  
Opcja B (tylko jeśli Owner wymaga legendy 1:1): dodać klucze alias + `substituteWmPrintVariables` — **nie** potrzebne, jeśli OST = wyłącznie AcroForm.

### DF-07 — Non-goals zamrożone

Nie ruszać istniejących szablonów/dokumentów; nie EM; nie schematy; nie sync merge poza minimalnym seedem OST.

### DF-08 — Gate przed IMPLEMENT

Owner potwierdza: **OST.pdf jest AcroForm** (lub dostarcza wersję FormMaker).  
Jeśli nie — **IMPLEMENT BLOCKED** (nie budujemy replace content stream).

---

## Evidence (skrót)

- `generate-zip.ts` L97–118 — dispatch ZI vs pdf_form vs pdf  
- `variables.ts` L19–36 — `JOB_CITY` fallback  
- `default-templates.ts` — seed ZI + mapping 95/96/97  
- `generate-pdf.ts` L379–412 — `generatePdfFormFromTemplate` + merge ZI map  
- Handoff: `docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`

---

## NEXT

**STOP.** Czekaj wyłącznie na:

```text
OWNER GO DESIGN FREEZE
```

Bez implementacji · bez commit · bez push.
