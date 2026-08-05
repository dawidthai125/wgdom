# WM-DRUK-OST-APPEARANCE-01 — Owner Verify / Closeout

> **EPIC:** WM-DRUK-OST-APPEARANCE-01  
> **Data:** 2026-08-05  
> **Status:** IMPLEMENT COMPLETE · RELEASE pending PV

## Zmiana

| Plik | Opis |
|------|------|
| `src/lib/wm-print/generate-pdf.ts` | Po fill OST: `field.updateAppearances(Noto)` **tylko** JOB_STREET · BUILDING · APARTMENT; noop `form.updateFieldAppearances` zostaje do `save()` (ochrona WinAnsi / Wrocław) |
| `scripts/test-wm-druk-ost-appearance-01.mjs` | Assert `/V` + `/AP` non-empty (nie `() Tj`) · NeedAppearances **false** (stage 1) |

**NO TOUCH:** ZI · EM · NeedAppearances · mapping · generate-zip

## Testy

| Suite | Wynik |
|-------|--------|
| `test-wm-druk-ost-appearance-01.mjs` | **14 PASS** |
| `test-wm-druk-ost-auto-generate-01.mjs` | **18 PASS** |
| `test-wm-druk-ost-mapping-migration-01.mjs` | **19 PASS** |
| `npm run build` | **PASS** |

## Appearance evidence

Filled: `.tmp-ost-appearance-01/ost-appearance-filled.pdf`

| Pole | `/V` | `/AP` |
|------|------|-------|
| JOB_STREET | `3 Maja` | NotoSans stream · nie `() Tj` · len≈267 |
| BUILDING | `4a` | NotoSans · len≈248 |
| APARTMENT | `2` | NotoSans · len≈244 |

NeedAppearances: **false** (bez zmian stage 1).

## Owner Verify (manual)

1. Wygeneruj ZIP Odbiory dla `3 Maja 4a` / lokal `2`.  
2. Otwórz `70-Druk-OST-editable.pdf` w **Chrome** — Ulica / Nr domu / Nr lokalu widoczne.  
3. Opcjonalnie Adobe Reader — te same pola.

## Werdykt IMPLEMENT

```text
IMPLEMENTATION COMPLETE (code + tests)
NeedAppearances: unchanged (stage 1)
WAITING: commit → push → production verify → Owner Chrome check
```
