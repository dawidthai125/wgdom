# WM-DRUK-OST-MAPPING-MIGRATION-01 — IMPLEMENTATION REPORT

> **STATUS:** IMPLEMENT COMPLETE · **NO COMMIT** · **NO PUSH** · czeka na **OWNER VERIFICATION**  
> **Data:** 2026-08-04  
> **Tip changelog (lokalny, niecommitted):** **2.66.09**  
> **SSOT:** AUDIT · DESIGN FREEZE · ARCHITECTURE REVIEW (PASS)

---

## Zakres

Migracja danych KV `kw-wm-print-templates`: historyczne OST (`name.trim()==="OST"` ∧ `type==="pdf_form"` ∧ mapping null/`{}`) → `WM_PRINT_OST_PDF_FIELD_MAPPING`.

**NO TOUCH (zweryfikowane diff):** `generate-pdf.ts` · `generate-zip.ts` · dispatch L114 · `default-templates.ts` (stała reuse) · Storage · ZI · Izba · SEP.

---

## Nośnik A (AR)

| Element | Plik |
|---------|------|
| Pure fn | `src/lib/wm-print/ost-pdf-field-mapping-migration.ts` — `migrateOstPdfFieldMapping` |
| Bootstrap | `maybeExecuteWmPrintSeed` → migracja + `ostMappingMigratedCount` |
| Sync | `syncWmPrintFromCloud` → migracja; **`pushWmPrintToCloud` tylko gdy `migratedCount > 0`** |
| App seed | `App.tsx` — persist/push gdy `seeded \|\| ostMappingMigratedCount > 0` |

---

## Testy

| Komenda | Wynik |
|---------|--------|
| `npx vite-node scripts/test-wm-druk-ost-mapping-migration-01.mjs` | **19 PASS** (AC-01…05 + idempotency + fixture setText) |
| `npx vite-node scripts/trace-wm-druk-ost-mapping-migration-01.mjs` | **PASS** — `mapping != null` · `setTextCount ≥ 3` |
| `npm run build` | **PASS** |

**AR-NOTE AC-03:** TRACE/smoke na fixture AcroForm z polami `JOB_STREET`/`BUILDING`/`APARTMENT`. Prod PDF bez tych nazw → osobny temat (OST-ACROFORM / rebuild), nie fail migracji danych.

---

## Pliki implementacji (do commit na OWNER GO)

- `src/lib/wm-print/ost-pdf-field-mapping-migration.ts` (**new**)
- `src/lib/wm-print/wm-print-sync.ts`
- `src/app/App.tsx`
- `src/app/changelog-data.ts` (2.66.09)
- `CHANGELOG.md`
- `scripts/test-wm-druk-ost-mapping-migration-01.mjs` (**new**)
- `scripts/trace-wm-druk-ost-mapping-migration-01.mjs` (**new**)
- ten raport (opcjonalnie)

---

## STOP

Czekaj wyłącznie na **OWNER VERIFICATION**.  
**Nie** commit · **nie** push.
