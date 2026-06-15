# ZI-2026 — Preservation Gate Report

**Data:** 2026-06-15  
**Tryb:** IMPLEMENTATION · **STOP RELEASE** (bez commit · bez push)  
**Problem:** szyfrowany `ZI.pdf` z WM Druk → cichy fallback na pusty bundled → utrata danych użytkownika

---

## 1. Wybrana architektura

**Opcja C — pdf.js extract + pdf-lib graft** (wariant *decrypt-before-fill* bez qpdf w runtime)

| Etap | Warstwa | Działanie |
|------|---------|-----------|
| **Source** | `generate-zip.ts` | Pobiera **aktywny** `ZI.pdf` z WM Druk (`fetchWmPrintFileBytes(storageUrl)`) — bez zmian |
| **Detect** | `countZiTauron2026PdfLibFields()` | pdf-lib: `< 50` pól ⇒ szyfrowany R6 (typowy upload WM) |
| **Extract** | `extractZiTauron2026FormFieldsPdfJs()` | pdf.js odczytuje **wszystkie** wartości AcroForm ze **source** (działa na encrypted) |
| **Base** | `resolveZiTauron2026TemplateBytes()` | Odszyfrowany upload → ten sam plik; encrypted → bundled FormMaker (59 pól, pdf-lib) |
| **Graft** | `applyExtractedFormFieldValue()` | Kopiuje wartości source → base (text + checkbox + radio) |
| **Patch** | `applyAddressSectionFields()` | Nadpisuje **wyłącznie** 99 / 111 / 112 z `JOB_*` |
| **Save** | pdf-lib | Output z zachowanymi danymi + nowy adres §4 |

**Odrzucone w tej iteracji (minimal scope):**

| Opcja | Powód |
|-------|-------|
| A decrypt-on-upload | Wymaga Edge/qpdf lub WASM przy uploadzie — większy deploy |
| B qpdf decrypt-before-fill | Brak qpdf w przeglądarce/Vercel; binarka tylko w audit/tools |
| Server pikepdf | Python poza frontend pipeline |

Opcja C działa **w przeglądarce** (WM Druk generuje ZIP client-side) bez zmian Supabase.

---

## 2. Dlaczego działa

1. **Ten sam formularz** — bundled base i upload WM to FormMaker Tauron 2026 (59 pól, identyczne nazwy).
2. **pdf.js ≠ pdf-lib** — pdf.js dekoduje encrypted `/V` (R6, puste hasło); pdf-lib zapisuje na odszyfrowanej strukturze.
3. **Source pozostaje WM** — `templateBytes` w `generatePdfZiTauron2026()` to bytes z storage użytkownika; bundled to tylko **nośnik struktury**, nie zamiennik treści.
4. **Kolejność** — najpierw graft wszystkich pól ze source, potem patch §4 (stare 99/111/111 nie blokują nowego adresu).
5. **Odszyfrowany upload** — gdy admin wgra już decrypted PDF (`fieldCount ≥ 50`), graft się **nie uruchamia**; pdf-lib ładuje source wprost i tylko patchuje §4.

---

## 3. Dowód zachowania danych

### Fixture

| Plik | Opis |
|------|------|
| `audit/tauron-audit-2026-06-15/zi-user-reference.pdf` | Kopia `Desktop/Dokumenty/ZI.pdf` — wypełniony szablon WM |
| pdf-lib na source | **0 pól** (encrypted) |
| pdf.js na source | **14 niepustych pól** |

### Smoke preservation — **PASS**

```bash
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
```

| Pole | Przed | Po generacji | Status |
|------|-------|--------------|--------|
| `Pole tekstowe 39` | Dawid | Dawid | PASS |
| `Pole tekstowe 40` | Thai Thanh | Thai Thanh | PASS |
| `Pole tekstowe 101` | Stróża | Stróża | PASS |
| `Pole wyboru 39` | Tak | Tak | PASS |
| `Pole tekstowe 99` | Szkolna | **Sępa Szarzyńskiego** | PASS (patch §4) |
| `Pole tekstowe 111` | 5 | **83** | PASS |
| `Pole tekstowe 112` | *(pusty)* | **7** | PASS |

**Output:** `audit/tauron-audit-2026-06-15/zi-2026-preservation-sepa-83-7.pdf`  
**Raport JSON:** `audit/tauron-audit-2026-06-15/zi-2026-preservation-sepa-83-7-report.json`

### Regresja mapping (blank) — **PASS**

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
```

---

## 4. Lista zmienionych plików

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/zi-tauron2026-form-extract.ts` | **NOWY** — pdf.js extract + `pickNonEmptyZiFormFields` |
| `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` | Graft path, `countZiTauron2026PdfLibFields`, apply text/checkbox/radio |
| `scripts/test-wm-print-zi-2026-preservation-smoke.mjs` | **NOWY** — preservation gate smoke |
| `audit/tauron-audit-2026-06-15/zi-user-reference.pdf` | Fixture (kopia referencyjnego ZI) |
| `audit/tauron-audit-2026-06-15/zi-2026-preservation-sepa-83-7.pdf` | Output preservation |
| `audit/tauron-audit-2026-06-15/zi-2026-preservation-sepa-83-7-report.json` | Raport smoke |

**Bez zmian:** `generate-zip.ts` (już przekazywał `sourceBytes` z WM), `upload.ts`, Edge.

---

## 5. Build

```bash
npm run build
```

**Wynik:** **PASS** (2026-06-15)

Uwaga bundlera: dynamic import `pdfjs-dist/legacy/build/pdf.mjs` → chunk `pdfjs-*.js` (~976 KB) ładowany przy generacji ZI (WmPrintView). Akceptowalne dla preservation path.

---

## Manual gate (pozostały)

1. Otwórz `zi-2026-preservation-sepa-83-7.pdf` w **Edge** — wizualnie: Dawid / Thai Thanh / Stróża + §4 Sępa 83/7.
2. Prod flow: WM Druk → generuj ZIP na robocie z adresem Sępa 83/7 — potwierdź w viewerze.

---

## STOP

**Bez commit · bez push · STOP RELEASE aktywny.**

Po pozytywnym manual gate → decyzja o commit (CHANGELOG + docs/ZI-2026-HANDOFF.md § Preservation).

---

## Powiązane

- [`ZI-2026-TEMPLATE-SOURCE-REPORT.md`](ZI-2026-TEMPLATE-SOURCE-REPORT.md) — root cause fallbacku
- [`ZI-2026-LIBRARY-AUDIT-REPORT.md`](ZI-2026-LIBRARY-AUDIT-REPORT.md) — pdf.js vs pdf-lib na R6
