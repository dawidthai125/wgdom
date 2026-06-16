# EM-P0 — Pomiary Elektryczne — Foundation Report

**Data:** 2026-06-16  
**Wersja:** 2.59.27  
**Werdykt:** **PASS** — EM-P0 COMPLETE

---

## 1. Executive Summary

Zaimplementowano fundament domeny **Pomiary Elektryczne** (Electrical Measurements):

- Model danych z **wieloma raportami na jedną robotę** (korekta 1)
- Pola `technicianName`, `meterModel`, `meterSerialNumber` od P0 — ręcznie, architektura pod przyszłe domyślne (korekta 2)
- Panel UI w Robotach + podgląd read-only ze statystykami dokumentów/obwodów/RCD (korekta 3)
- Sync chmura `kw-electrical-measurements`
- Stub generatora DOCX (`generate-em-docx.ts`) — **TODO EM-P1**

**Bez:** DOCX, ZIP, integracji WM Druk.

---

## 2. Architektura

```text
src/lib/electrical-measurements/
  types.ts
  normalize.ts
  merge.ts
  report.ts
  preview.ts
  sync.ts
  generate-em-docx.ts   ← STUB (EM-P1)
```

**UI:** `src/app/JobElectricalMeasurementsPanel.tsx` → `JobsView.tsx`

**Wzorzec sync:** recoverable charges / operational notes (KV array, LWW merge per `id`).

---

## 3. Storage

| Klucz | Rola |
|-------|------|
| `kw-electrical-measurements` | Tablica `ElectricalMeasurement[]` |

Zintegrowany z:

- `DATA_KEYS`
- `BOOTSTRAP_DEFERRED_KEYS`
- `mergeKeyData()` w `cloud-sync.ts`
- `commitElectricalMeasurements()` w `App.tsx`

---

## 4. Model danych

```ts
ElectricalMeasurement {
  id, jobId                    // wiele rekordów per jobId — BEZ unique
  reportNumber, measurementDate
  technicianName, meterModel, meterSerialNumber
  supplyType: "ydy-3x4" | "ydy-5x4"
  circuits: { id, type, breakerType }[]
  rcds: { id, symbol, deviceType }[]
  createdAt, updatedAt
}
```

**Circuit types:** `socket-1f`, `lighting-1f`, `socket-3f`  
**Breaker:** `B`, `C`  
**RCD device:** `P302`, `P304`

---

## 5. UI

Sekcja **Pomiary Elektryczne** w szczegółach roboty:

1. **Dane pomiaru** — numer, data (domyślnie dziś), pomiarowiec, model/nr miernika
2. **Zasilanie** — radio YDY 3×4 / 5×4
3. **Obwody** — dodaj/usuń, typ, wyłącznik B/C
4. **RCD** — dodaj/usuń, symbol, P302/P304
5. **Wybór raportu** — select + „Nowy raport” (multi-report per job)

Zapis natychmiastowy → localStorage + push chmura.

---

## 6. Preview

Read-only, nad sekcjami podglądu:

- `Liczba dokumentów: 5` (stała `EM_DOCUMENT_COUNT` — docelowe 5 DOCX w EM-P1)
- `Liczba obwodów: X`
- `Liczba RCD: Y`

Bloki:

- **Ochrona przed porażeniem** — Zasilanie + obwody (230V/400V)
- **Rezystancja** — YDY zasilanie + etykiety per obwód
- **RCD** — `RCD1 → P302` format

---

## 7. Build

```bash
npm run build
```

**Wynik:** PASS (2026-06-16)

---

## 8. Smoke

```bash
npx vite-node scripts/test-electrical-measurements-p0.mjs
```

**Wynik:** **26/26 PASS**

Pokrycie: normalize, create/update, multi-report per job, circuits, RCD, merge LWW, preview, JSON roundtrip.

---

## 9. Ograniczenia P0

- Brak generatora DOCX (stub only)
- Brak ZIP / pobierania pakietu
- Brak integracji WM Druk
- Brak ustawień globalnych domyślnych (pomiarowiec/miernik) — pola ręczne
- Brak usuwania całego raportu w UI (można dodawać wiele; delete raportu = backlog)

---

## 10. Plan EM-P1

Generator DOCX na podstawie modelu:

| Dokument | Kind |
|----------|------|
| Protokół z pomiarów ochronnych | `protokol` |
| Dane informacyjne | `dane-informacyjne` |
| Badanie ochrony przed porażeniem | `badanie-adsc` |
| Badanie rezystancji obwodów | `badanie-rezystancji` |
| Parametry RCD | `parametry-rcd` |

Implementacja w `generate-em-docx.ts` — interfejsy `EmDocxGeneratorInput` / `EmDocxGeneratorOptions` gotowe.

**EM-P0.5 (opcjonalnie):** domyślne wartości z ustawień firmy via `ElectricalMeasurementDefaultsHint`.

---

*Raport wygenerowany po IMPLEMENT → BUILD → SMOKE EM-P0.*
