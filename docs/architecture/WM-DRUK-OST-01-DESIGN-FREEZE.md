# WM-DRUK-OST-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN**  
> **ID:** WM-DRUK-OST-01-DESIGN-FREEZE  
> **EPIC:** WM-DRUK-OST-01  
> **FAZA:** **DESIGN FREEZE** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **PASS**  
> **Parent AUDIT (SSOT wejścia):** [`WM-DRUK-OST-01-AUDIT.md`](./WM-DRUK-OST-01-AUDIT.md)  
> **Następne:** AR [`WM-DRUK-OST-01-ARCHITECTURE-REVIEW.md`](./WM-DRUK-OST-01-ARCHITECTURE-REVIEW.md) (**PASS**) · czekaj **OWNER GO IMPLEMENT**  
> **Tip prod (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-DRUK-OST-01 DESIGN FREEZE — FROZEN

CEL: Slot OST (WM-Druk-OST.pdf) w WM Druk
  · TEN SAM pipeline co ZI (product parity)
  · Silnik = generatePdfFormFromTemplate (non-ZI pdf_form)
  · Aliasy BUILDING/APARTMENT TYLKO w pdfFieldMapping
  · Zero nowych kluczy SSOT · zero Tauron clone

GATE: WM-Druk-OST.pdf MUSI być AcroForm
  · jeżeli NIE → IMPLEMENT = BLOCKED
  · zakaz content-stream replace

OUT (twarde):
  ZI · generatePdfZiTauron2026 · drugi generator
  PDF text replace · DOCX · EM · schematy
  nowe WmPrintVariableKey · hardcode miasta w PDF

IMPLEMENT zakazany do: Owner GO → ARCHITECTURE REVIEW
  → GO IMPLEMENT (+ AcroForm Gate PASS)
════════════════════════════════════════════════════════
```

---

## 0. Relacja dokumentów

| Dokument | Rola |
|----------|------|
| [`WM-DRUK-OST-01-AUDIT.md`](./WM-DRUK-OST-01-AUDIT.md) | RCA · architektura · reuse · **ACCEPTED** |
| **Ten plik** | **SSOT decyzji** — wygrywa konflikty zakresu epicu |
| ZI handoff / Tauron | **READ-ONLY** — nie otwierać w tym epicu |

**Konflikt zakresu:** ten Design Freeze wygrywa dla WM-DRUK-OST-01.

### Zasady FROZEN

| Zasada | Wiązanie |
|--------|----------|
| **PIPELINE FIRST** | „Jak ZI” = ten sam flow WM Druk, nie klon generatora Tauron |
| **REUSE FIRST** | `buildWmPrintVariableMap` · ZIP orchestrator · `generatePdfFormFromTemplate` |
| **ZERO DUPLICATE** | Zakaz nowego parsera PDF / drugiego generatora / content-stream replace |
| **ALIAS BOUNDARY** | `BUILDING` / `APARTMENT` wyłącznie w `pdfFieldMapping` |
| **ACROFORM GATE** | Brak AcroForm → IMPLEMENT BLOCKED |

---

## 1. Contract

### 1.1 Product contract

| Element | Wartość FROZEN |
|---------|----------------|
| Formularz | `WM-Druk-OST.pdf` |
| Slot nazwa kanoniczna | **`OST`** |
| Kind | `generated` |
| Type | **`pdf_form`** |
| Product parity „jak ZI” | Ten sam pipeline (slot → vars → dispatch → ZIP/download) |
| Silnik fill | **`generatePdfFormFromTemplate()`** |
| ZI | **bez zmian** (`generatePdfZiTauron2026`) |

### 1.2 Data contract

| Pole biznesowe | Źródło wartości | Klucz SSOT |
|----------------|-----------------|------------|
| Ulica | `parseJobAddressParts` → map | `JOB_STREET` |
| Numer budynku | j.w. | `JOB_BUILDING` |
| Numer mieszkania | j.w. (+ `flatNumber`) | `JOB_APARTMENT` |
| Miasto | `settings.defaultCity \|\| "Wrocław"` | `JOB_CITY` |

Zakaz: hardcode miasta w pliku PDF / w generatorze OST.

### 1.3 Alias contract

| Alias w `pdfFieldMapping` (lewa strona / nazwa pola PDF) | Wartość mapowania (WmPrintVariableKey) |
|----------------------------------------------------------|----------------------------------------|
| `BUILDING` (lub `{{BUILDING}}` — wg nazw pól po Gate) | `JOB_BUILDING` |
| `APARTMENT` (lub `{{APARTMENT}}`) | `JOB_APARTMENT` |
| `JOB_STREET` (lub `{{JOB_STREET}}`) | `JOB_STREET` |
| `JOB_CITY` (lub `{{JOB_CITY}}`) | `JOB_CITY` |

**FROZEN:** nie dodawać `BUILDING` / `APARTMENT` do `WmPrintVariableKey` / `WM_PRINT_VARIABLE_KEYS` / `substituteWmPrintVariables`.

---

## 2. Architecture

```text
Job + WmPrintSettings
        │
        ▼
buildWmPrintVariableMap()     ← REUSE (SSOT vars)
        │
        ▼
ZIP Orchestrator
  buildWmPrintFilesForJob()   ← REUSE
        │
        ▼
generateFromTemplateBytes()   ← REUSE dispatch
        │
        ├─ name === "ZI"     → generatePdfZiTauron2026()     [OUT — nie ruszać]
        │
        └─ type === "pdf_form" ∧ name === "OST"
               → generatePdfFormFromTemplate(bytes, vars, pdfFieldMapping)
               → download / ZIP entry                   ← REUSE
```

### 2.1 Dispatch contract

| Warunek | Generator | Status |
|---------|-----------|--------|
| `name === "ZI"` | `generatePdfZiTauron2026` | **FROZEN / READ-ONLY** |
| `name === "OST"` ∧ `type === "pdf_form"` | `generatePdfFormFromTemplate` | **IN — OST** |
| `type === "pdf"` | `copyStaticPdfTemplate` | **OUT** dla OST |
| Content-stream `{{…}}` replace | — | **ZAKAZANE** |

### 2.2 Micro-boundary (do AR)

`generatePdfFormFromTemplate` dziś merguje `WM_PRINT_ZI_PDF_FIELD_MAP` do każdego wywołania.  
**AR musi zdecydować:** czy thin guard (merge ZI map tylko dla ZI / nie dla OST) jest w scope IMPLEMENT, czy wystarczy dowód braku kolizji nazw pól OST vs ZI.  
**DF:** OST **nie** woła Tauron; preferowane: OST mapping = wyłącznie `t.pdfFieldMapping` bez zanieczyszczenia ZI — jeśli AR uzna merge za ryzyko.

---

## 3. Reuse Contract

| Komponent | Decyzja | Uwagi |
|-----------|---------|--------|
| `buildWmPrintVariableMap` | **REUSE** | Jedyny źródłowy fill wartości |
| `parseJobAddressParts` / `address-vars` | **REUSE** | Bez nowego parsera adresu |
| `buildWmPrintFilesForJob` | **REUSE** | ZIP / lista plików |
| `generateFromTemplateBytes` | **REUSE** | Dispatch; bez drugiej ścieżki |
| `generatePdfFormFromTemplate` | **REUSE** | Silnik OST |
| `pdfFieldMapping` na template | **REUSE modelu** | Aliasy OST tylko tutaj |
| Upload / storage URL szablonu | **REUSE** | Jak inne `generated` PDF |
| Download / ZIP naming | **REUSE** | `buildWmPrintZipEntryName` |
| `generatePdfZiTauron2026` | **DO NOT TOUCH** | |
| `substituteWmPrintVariables` | **DO NOT EXTEND** o aliasy | DOCX-only; OST ≠ DOCX |
| Nowy PDF parser / mustache PDF | **FORBIDDEN** | |

---

## 4. Boundary Contract

### 4.1 Scope IN (FROZEN)

- Nowy slot szablonu **`OST`**
- `kind: generated`, `type: pdf_form`
- `pdfFieldMapping` aliasów → SSOT keys
- Podpięcie pliku `WM-Druk-OST.pdf` (storage / upload jak ZI slot)
- Udział w istniejącym ZIP i download
- Smoke / test fill OST
- Ewentualny thin guard merge ZI field map w `generatePdfFormFromTemplate` **tylko jeśli AR GO**

### 4.2 Scope OUT (FROZEN)

| OUT | Powód |
|-----|--------|
| Zmiany ZI / Tauron / graft / LiveCycle | Product boundary |
| Drugi generator PDF | Zakaz Ownera |
| PDF content-stream text replace | Nowy silnik |
| Nowy parser PDF | Zakaz |
| DOCX / oświadczenia | Poza epic |
| EM / pomiary | Poza epic |
| Schematy WM | Poza epic |
| Przebudowa WM ZIP orchestratora | REUSE only |
| Nowe `WmPrintVariableKey` | Alias tylko w mappingu |
| Hardcode „Wrocław” w PDF | Miasto z vars |
| Seed pollution bez guard | Jak istniejący seed pattern |

### 4.3 Zakazy twarde

```text
ZAKAZ: generatePdfZiTauron2026 dla OST
ZAKAZ: copy-paste logiki ZI
ZAKAZ: type: "pdf" dla OST (static copy)
ZAKAZ: content-stream {{replace}}
ZAKAZ: nowe klucze SSOT BUILDING / APARTMENT
ZAKAZ: implementacja bez AcroForm Gate PASS
```

---

## 5. File Allowlist

### 5.1 Dozwolone do zmiany (po GO IMPLEMENT)

| Plik | Zakres dozwolony |
|------|------------------|
| `src/lib/wm-print/default-templates.ts` | Seed slotu `OST` + `pdfFieldMapping` |
| `src/lib/wm-print/generate-zip.ts` | Tylko jeśli AR wymaga jawnego dispatch name==="OST" (prefer: wystarczy type+mapping; **minimal diff**) |
| `src/lib/wm-print/generate-pdf.ts` | Opcjonalnie: nie merge’ować `WM_PRINT_ZI_PDF_FIELD_MAP` dla non-ZI — **tylko po AR GO** |
| `src/lib/wm-print/templates.ts` | Normalize/merge seed OST — tylko jeśli wymagane przez istniejący pattern |
| `src/app/WmPrintView.tsx` | Opcjonalnie: hint legendy aliasów OST (copy only) — **nie** nowe klucze SSOT |
| `scripts/*ost*` / smoke OST | Nowy test thin |
| Asset szablonu | `WM-Druk-OST.pdf` w storage / ewent. `public/wm-print/` jeśli pattern jak ZI bundled — **AR rozstrzyga bundled vs upload-only** |
| Docs continuity | AUDIT/DF/AR/CLOSE + changelog **po** IMPLEMENT |

### 5.2 Zakaz edycji (FROZEN)

| Plik / obszar | Status |
|---------------|--------|
| `generate-pdf-zi-tauron2026.ts` | **NO TOUCH** |
| `zi-tauron2026-*.ts` / graft | **NO TOUCH** |
| `variables.ts` — enum keys | **NO TOUCH** (brak nowych kluczy) |
| `address-vars.ts` | **NO TOUCH** (REUSE as-is) |
| EM / electrical-* | **NO TOUCH** |
| Schematics / rysunki | **NO TOUCH** |
| Cloud-sync merge payroll | **NO TOUCH** |
| Istniejące szablony ZI/DOCX/static PDF treści | **NO TOUCH** |

---

## 6. Placeholder Mapping

### 6.1 SSOT wartości (prawo)

Wartości zawsze z `buildWmPrintVariableMap()` — bez drugiej mapy.

### 6.2 Mapping slotu OST (FROZEN semantyka)

```text
pdfFieldMapping (nazwa pola AcroForm → WmPrintVariableKey):

  BUILDING     → JOB_BUILDING     # alias — tylko mapping
  APARTMENT    → JOB_APARTMENT    # alias — tylko mapping
  JOB_STREET   → JOB_STREET
  JOB_CITY     → JOB_CITY
```

### 6.3 Forma nazwy pola (Gate-dependent)

Dokładny string lewej strony (`BUILDING` vs `{{BUILDING}}` vs inna nazwa FormMaker) = **wynik AcroForm Gate** (inspekcja `getForm().getFields()`).  
Semantyka mapowania **FROZEN**; literały nazw pól **dopinane po Gate**, bez zmiany SSOT keys.

### 6.4 Legenda UI

- SSOT legenda (`WM_PRINT_VARIABLE_*`) **bez** nowych kluczy.
- Opcjonalny copy hint „OST: aliasy BUILDING/APARTMENT w mappingu” — poza ścieżką fill.

---

## 7. AcroForm Gate

### 7.1 Warunek wejścia do IMPLEMENT

```text
GATE-ACROFORM-OST

PASS ⇔ WM-Druk-OST.pdf:
  · PDFDocument.load OK
  · pdfDoc.getForm() zwraca pola
  · istnieją pola adresowe mapowalne do
      JOB_STREET / JOB_BUILDING / JOB_APARTMENT / JOB_CITY
    (przez nazwy = aliasy lub równoważne)

FAIL ⇔ brak AcroForm / brak pól / tylko content-stream {{…}}
  → IMPLEMENT = BLOCKED
  → zakaz projektowania content-stream replace
  → powrót do Owner (nowy PDF FormMaker lub HOLD)
```

### 7.2 Artefakt Gate

Przed GO IMPLEMENT: krótki dowód (lista nazw pól + proponowany `pdfFieldMapping`).  
Bez PASS Gate — **brak kodu produkcyjnego**.

### 7.3 Relacja do DESIGN FREEZE

Ten DF **zakłada** AcroForm. Gate nie zmienia architektury — tylko odblokowuje IMPLEMENT.

---

## 8. Acceptance Criteria

| ID | Kryterium | Metryka |
|----|-----------|---------|
| AC-01 | Slot `OST` widoczny / włączalny w WM Druk | UI / seed |
| AC-02 | `type === pdf_form` | Dane szablonu |
| AC-03 | Fill przez `generatePdfFormFromTemplate` | Trace / test |
| AC-04 | ZI nadal przez `generatePdfZiTauron2026` | Regresja |
| AC-05 | Mapping: BUILDING→JOB_BUILDING, APARTMENT→JOB_APARTMENT | Test mapping |
| AC-06 | JOB_STREET / JOB_CITY wypełnione z vars | Smoke fill |
| AC-07 | Miasto z `defaultCity` lub fallback „Wrocław” — nie z hardcodu PDF | Code review + test |
| AC-08 | Brak nowych `WmPrintVariableKey` | Diff types/variables |
| AC-09 | OST w ZIP / download jak inne generated | Smoke ZIP |
| AC-10 | Gate AcroForm PASS udokumentowany | Artefakt Gate |
| AC-11 | Zero zmian treści istniejących docs (ZI, DOCX, static) | Diff scope |
| AC-12 | Brak content-stream replace / nowego generatora | Diff allowlist |

**DoD Thin Slice:** dla przykładowej roboty ZIP zawiera wypełniony OST; ZI bez regresji; Gate PASS.

---

## 9. Rollback

| Scenariusz | Akcja |
|------------|--------|
| Gate FAIL przed IMPLEMENT | Brak kodu — HOLD / nowy PDF |
| Regresja fill OST po deploy | Wyłączyć slot `OST` (`enabled: false`) — bez rollbacku ZI |
| Regresja ZI (niedopuszczalna) | Natychmiastowy revert commit OST; ZI path nie był w allowlist zmian semantycznych |
| Zły mapping pól | Poprawka wyłącznie `pdfFieldMapping` / nazw pól — bez nowego silnika |
| Seed pollution | Wyłączyć slot / nie seedować na niepustych instalacjach (istniejący guard) |

**Zasada:** rollback = wyłączenie slotu OST lub revert thin commit; **nigdy** „naprawa” przez content-stream engine.

---

## 10. Verification Plan

### 10.1 Przed IMPLEMENT

1. AcroForm Gate na `WM-Druk-OST.pdf` → lista pól + draft mapping.  
2. Architecture Review PASS.  
3. Owner GO IMPLEMENT.

### 10.2 W trakcie / po IMPLEMENT (plan)

| Warstwa | Co |
|---------|-----|
| Unit | Mapping aliasów → wartości z `buildWmPrintVariableMap` |
| Unit/smoke | `generateFromTemplateBytes` dla OST → `generatePdfFormFromTemplate` |
| Regresja | ZI → nadal Tauron path; fill §4 bez regresji |
| Smoke UI | Włączenie OST · generacja ZIP · podgląd/download PDF |
| Diff gate | Allowlist plików · brak nowych SSOT keys · brak Tauron edits |

### 10.3 Komendy (orientacyjne — doprecyzuje AR/IMPLEMENT)

```text
npm run build
npx vite-node scripts/test-wm-druk-ost-*.mjs   # nowy thin (nazwa do ustalenia w IMPLEMENT)
# + istniejący smoke/regresja ZI jeśli dostępny w repo
```

### 10.4 Payroll / Cloud

```text
PAYROLL SAFETY: OUT (brak zmian payroll / merge CORE)
CLOUD: tylko istniejący model szablonów WM (kw-wm-print-*) — bez nowego DATA_KEY
```

---

## 11. Thin Slice (zamrożony kierunek)

1. Gate AcroForm PASS.  
2. Slot `OST` + `pdfFieldMapping`.  
3. Upload `WM-Druk-OST.pdf`.  
4. Fill via existing non-ZI `pdf_form` branch.  
5. Smoke OST + regresja ZI.  
6. Opcjonalnie (AR): guard merge ZI map w `generatePdfFormFromTemplate`.

---

## 12. NEXT

```text
DESIGN FREEZE = FROZEN

STOP.

Czekaj wyłącznie na:

OWNER GO ARCHITECTURE REVIEW
```

Bez implementacji · bez commit · bez push.
