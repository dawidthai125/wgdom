# ZI-2026 — raport wpływu (ETAP 3 · aktualizacja 2.59.24)

**Data:** 2026-06-15 · **Prod:** **2.59.24** · **Status:** PRODUCTION STABLE

## Pliki prod (zmienione / nowe)

| Plik | Zmiana |
|------|--------|
| `generate-pdf-zi-tauron2026.ts` | **NOWY** — `generatePdfZiTauron2026()`, mapping **99/111/112** |
| `generate-zip.ts` | Routing ZI → nowy generator; guard legacy LiveCycle; dedupe ZIP (2.59.24) |
| `default-templates.ts` | Seed mapping Tauron 2026 |
| `zi-tauron2026-form-extract.ts` | pdf.js preservation graft |
| `wm-print-sync.ts` | Tombstone merge · dedupe templates (2.59.24) |
| `cloud-sync.ts` | KV tombstone merge `deleted-template-ids` (2.59.24) |
| `public/wm-print/zi-tauron-2026-template.pdf` | **NOWY** — bundled SSOT (qpdf decrypt blank) |
| `generate-pdf.ts` | `@deprecated` dla ZI — bez zmian logiki (legacy inne pdf_form) |

## Pliki prod (bez zmian — legacy)

| Plik | Rola | Uwagi |
|------|------|-------|
| `generate-pdf.ts` | `generatePdfFormFromTemplate`, `finalizeZiHybridForm` | Nadal importowane; **nie** dla `t.name === "ZI"` |
| `WmPrintView.tsx` | UI Odbiory WM Druk | Bez zmian — korzysta z `buildWmPrintFilesForJob` |
| `wm-print/upload.ts` | Upload szablonów KV | Admin może wgrać encrypted blank — fallback bundled |

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

## KV / operacje admin (stan prod 2.59.24)

1. **Jeden aktywny ZI** — UUID `2b22da48-…` · plik `ZI.pdf` (Tauron 2026).
2. **Legacy slot** `26f02c78-…` — **TOMBSTONE** w `kw-wm-print-deleted-template-ids`.
3. **pdfFieldMapping** — pola **99 / 111 / 112** (§4 dolny wiersz).
4. **Guard:** upload LiveCycle → błąd przy generacji ZIP.

## Testy

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npm run build
```

## Dokumentacja

- `docs/ZI-2026-HANDOFF.md` — SSOT implementacji prod
- `audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md` — werdykt prod
- `audit/ZI-FINAL-HANDOFF.md` — legacy RCA CLOSED (historyczne)
- `audit/archive/legacy-zi-livecycle-2021/` — archiwum
