# WM-DRUK-OST-01 — IMPLEMENTATION REPORT

> **STATUS:** IMPLEMENT COMPLETE (local) · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **SSOT:** AUDIT · DF · AR (**PASS**)  
> **Wersja changelog:** **2.66.08**

---

## Zakres zrobiony

1. **Thin guard (AR-DECISION-01)** — `generatePdfFormFromTemplate` domyślnie mapping-only:
   - bez merge `WM_PRINT_ZI_PDF_FIELD_MAP`
   - bez index fallback 22/23/24
   - bez hybrid finalize (chyba że `legacyZiFieldFill: true`)
2. **Seed slot `OST`** — `pdf_form` + `WM_PRINT_OST_PDF_FIELD_MAPPING` (aliasy BUILDING/APARTMENT + formy `{{…}}`)
3. **Upload-only** — brak `resolveOst*` / bundled asset
4. **Dispatch** — istniejąca gałąź non-ZI `pdf_form` w `generate-zip.ts` (komentarz zaktualizowany)
5. **Smoke** — `scripts/test-wm-druk-ost-01.mjs`
6. **Changelog** — 2.66.08

## Gate AcroForm (procesowy)

- Fixture smoke = pure `acroform` PASS.
- Prawdziwy **`WM-Druk-OST.pdf`**: Owner upload w UI + weryfikacja nazw pól vs mapping (OV).
- Istniejące instalacje (niepusty KV): dodać slot **OST** ręcznie / wgrać PDF (seed tylko greenfield).

## Pliki zmienione

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/generate-pdf.ts` | thin guard + `legacyZiFieldFill` |
| `src/lib/wm-print/default-templates.ts` | OST seed + mapping const |
| `src/lib/wm-print/generate-zip.ts` | komentarz OST |
| `scripts/test-wm-druk-ost-01.mjs` | smoke (nowy) |
| `scripts/test-wm-print-p0-1b…3f*.mjs` | `legacyZiFieldFill: true` |
| `src/app/changelog-data.ts` | 2.66.08 |
| `CHANGELOG.md` | 2.66.08 |

**NO TOUCH:** Tauron ZI generator · EM · DOCX · `WmPrintVariableKey` enum · bundled OST.
