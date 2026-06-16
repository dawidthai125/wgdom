# EM-P1B — DOCX Generator Implementation Report

**Data:** 2026-06-16  
**Wersja:** **2.59.30**  
**Forensyka wejściowa:** `audit/EM-P1A-DOCX-FORENSICS.md`  
**Werdykt forensyki:** EM-P1 GO

---

## 1. Executive Summary

Wdrożono pierwszy działający generator dokumentów **Pomiary Elektryczne**:

| Dokument | Mechanizm | Status |
|----------|-----------|--------|
| Protokół | scalar | ✅ |
| Dane informacyjne | scalar (7× ocena) | ✅ |
| Parametry RCD | scalar + **XML row clone** | ✅ |
| Badanie ADSC | scalar + supply row + **clone obwodów** | ✅ |
| Badanie rezystancji | scalar + supply row + **clone 16 kol** | ✅ |

UI: 5 przycisków „Generuj …” w panelu Roboty → Pomiary Elektryczne (bez ZIP).

---

## 2. Payload Contract

**Plik:** `src/lib/electrical-measurements/em-docx-payload.ts`

- `buildElectricalMeasurementDocxPayload(measurement, job, options?)`
- `ElectricalMeasurementDocxPayload`: `scalars` + wewnętrzne `_adsc` / `_resistance` / `_rcd` row specs
- `assertPreviewParity()` — weryfikacja SSOT z `preview.ts`
- Domyślne wartości pomiarowe (Zs, Za, MΩ) — MVP zgodnie z EM-P1A (stałe reguły WM-POMIARY-001)

---

## 3. Placeholder Mapping

| Placeholder | Źródło |
|-------------|--------|
| `{{RAP_NO}}` | `measurement.reportNumber` |
| `{{MEASUREMENT_DATE}}` | data PL `dd.mm.rrrrr.` |
| `{{ADDRESS}}` | `jobDisplayTitle(job)` |
| `{{TECHNICIAN}}` | `measurement.technicianName` |
| `{{METER_MODEL}}` / `{{METER_SERIAL}}` | miernik |
| `{{INSPECTION_1}}`…`{{INSPECTION_7}}` | domyślne oceny normatywne |
| `{{ROW_*}}` | wiersze dynamiczne (clone) |
| `{{ROW_SUPPLY_*}}` | wiersz Zasilanie (ADSC + Rezystancja) |

Szablony: `public/em-measurements/*.template.docx` (build: `node scripts/build-em-docx-templates.mjs`).

---

## 4. XML Row Cloning

**Plik:** `src/lib/electrical-measurements/em-docx-xml.ts`

1. `expandEmDocxTemplateRows()` — znajdź `<w:tr>` z `{{ROW_LP}}` lub `{{ROW_SUPPLY_LP}}`
2. Klonuj × N, podmień placeholdery per wiersz
3. `substituteEmDocxVariablesInXml()` — skalary + split-run safe
4. `validateEmDocxBytes()` — bilans `w:t`, `w:r`, `w:tr`, `w:tc`

**Kolejność implementacji:** RCD (LOW) → ADSC (MEDIUM, 2 typy wierszy) → Rezystancja (HIGH, 16 kolumn).

---

## 5. Preview Parity

| preview.ts | DOCX |
|------------|------|
| `buildRcdPreview()` | Parametry RCD — Symbol + deviceType |
| `buildAdscPreview()` | ADSC — Zasilanie + `displayName` |
| `buildResistancePreview()` | Rezystancja — YDY supply + etykiety obwodów |

Smoke T07: `assertPreviewParity()` PASS.

---

## 6. Build

```text
npm run build → PASS (16.7s)
```

---

## 7. Smoke

```text
npx vite-node scripts/test-electrical-measurements-p1.mjs → 32/32 PASS
npx vite-node scripts/test-electrical-measurements-p0.mjs → 33/33 PASS (regresja)
```

Scenariusze: 1 obwód, 7 obwodów, 3 RCD, 2 raporty na jedną robotę, wszystkie 5 DOCX zapisane do `audit/em-p1-smoke-out/`.

---

## 8. Known Limitations

| # | Ograniczenie | Plan |
|---|--------------|------|
| L1 | Wartości pomiarowe (Zs, Za, macierz MΩ) — domyślki, nie edycja w UI | EM-P2 model wartości |
| L2 | Szablony programowe (build script), nie oryginalne Word z Desktop | EM-P2 migracja pełnego formatowania |
| L3 | Brak ZIP pack 5× DOCX | EM-P2 |
| L4 | Brak historii generowania | EM-P2 |
| L5 | `TECHNICIAN_LICENSE` — stała domyślna | EM-P0.5 settings |
| L6 | Brak legend statycznych w szablonach programowych | EM-P2 template polish |

---

## 9. Plan EM-P2

1. **EM-P2A** — edycja wartości pomiarowych per wiersz w UI
2. **EM-P2B** — ZIP pack + historia generowania
3. **EM-P2C** — szablony Word 1:1 z oryginałów (legendy, formatowanie)
4. **EM-P2D** — opcjonalna integracja z paczką WM Odbiory

---

## Pliki zmienione / dodane

| Plik | Rola |
|------|------|
| `src/lib/electrical-measurements/em-docx-xml.ts` | XML substitute + row clone |
| `src/lib/electrical-measurements/em-docx-payload.ts` | Payload SSOT |
| `src/lib/electrical-measurements/generate-em-docx.ts` | Generator + download |
| `src/app/JobElectricalMeasurementsPanel.tsx` | UI przyciski |
| `public/em-measurements/*.template.docx` | 5 szablonów |
| `scripts/build-em-docx-templates.mjs` | Build szablonów |
| `scripts/test-electrical-measurements-p1.mjs` | Smoke P1 |

---

*EM-P1B COMPLETE · v2.59.30*
