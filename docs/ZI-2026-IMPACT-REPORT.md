# ZI-2026 — raport wpływu (ETAP 3)

**Data:** 2026-06-15

## Pliki prod (zmienione / nowe)

| Plik | Zmiana |
|------|--------|
| `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` | **NOWY** — `generatePdfZiTauron2026()`, mapping **99/111/112** |
| `src/lib/wm-print/generate-zip.ts` | Routing ZI → nowy generator; guard legacy LiveCycle |
| `src/lib/wm-print/default-templates.ts` | Seed mapping Tauron 2026 |
| `public/wm-print/zi-tauron-2026-template.pdf` | **NOWY** — bundled SSOT (qpdf decrypt blank) |
| `src/lib/wm-print/generate-pdf.ts` | `@deprecated` — bez zmian logiki (legacy inne pdf_form) |

## Pliki prod (bez zmian — legacy)

| Plik | Rola | Uwagi |
|------|------|-------|
| `generate-pdf.ts` | `generatePdfFormFromTemplate`, `finalizeZiHybridForm` | Nadal importowane; **nie** dla `t.name === "ZI"` |
| `WmPrintView.tsx` | UI Odbiory WM Druk | Bez zmian — korzysta z `buildWmPrintFilesForJob` |
| `wm-print/upload.ts` | Upload szablonów KV | Admin może wgrać encrypted blank — fallback bundled |
| `cloud-sync.ts` | KV `kw-wm-print-templates` | Istniejące mappingi LiveCycle w KV — guard error lub wymiana pliku |

## Wywołania `generatePdfFormFromTemplate`

| Lokalizacja | Wpływ |
|-------------|-------|
| `generate-zip.ts` | **ZI wyłączone** → `generatePdfZiTauron2026` |
| `scripts/test-wm-print-p0-*` | Legacy testy — bez zmian (audit/archive) |
| `scripts/audit-p0-*` | Legacy — bez zmian |

## Wywołania `WM_PRINT_ZI_PDF_FIELD_MAP`

| Lokalizacja | Wpływ |
|-------------|-------|
| `generate-pdf.ts` | Legacy LiveCycle only |
| `scripts/*` (audit) | Zarchiwizowane / historyczne |

## Wywołania `detectWmPrintPdfFormType`

| Lokalizacja | Wpływ |
|-------------|-------|
| `generate-pdf.ts` | Legacy path |
| `inspectWmPrintPdfForm` | Diagnostyka — nadal hybrid dla starych plików |
| Nowy: `detectZiTauron2026Form` / `detectLegacyLiveCycleZiForm` | Routing ZI 2026 |

## KV / operacje admin

1. **Wymagana wymiana pliku ZI** w panelu szablonów na blank Tauron 2026 (`zi.ashx`) — lub poleganie na bundled fallback.
2. **pdfFieldMapping w KV** — stare klucze `TextField2[*]` ignorowane; seed nowy 99/102/111.
3. **Guard:** upload LiveCycle → czytelny błąd przy generacji ZIP.

## Testy

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npm run build
```

## Dokumentacja

- `docs/ZI-2026-HANDOFF.md` — SSOT implementacji
- `audit/ZI-FINAL-HANDOFF.md` — legacy RCA CLOSED
- `audit/archive/legacy-zi-livecycle-2021/` — archiwum
