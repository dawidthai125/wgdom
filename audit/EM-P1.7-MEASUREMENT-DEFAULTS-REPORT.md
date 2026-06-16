# EM-P1.7 — Measurement Defaults — Raport końcowy

**Data:** 2026-06-16  
**Wersja:** 2.59.35  
**Status:** COMPLETE  

---

## 1. Architecture

Moduł `src/lib/electrical-measurements/settings.ts` — SSOT globalnych domyślnych pól meta raportu.

```text
ElectricalMeasurementSettings (KV)
        ↓ createEmptyElectricalMeasurement(..., settings)
ElectricalMeasurement (technicianName, meterModel, meterSerialNumber)
        ↓ buildElectricalMeasurementDocxPayload
DOCX (5 dokumentów)
```

---

## 2. Settings Storage

| Pole | Klucz |
|------|-------|
| Klucz KV | `kw-electrical-measurement-settings` |
| Sync | `DATA_KEYS`, `BOOTSTRAP_DEFERRED_KEYS`, merge LWW (`updatedAt`) |
| Push | `pushElectricalMeasurementSettingsToCloud` |

**Model:**

```ts
ElectricalMeasurementSettings {
  technicianName: string
  meterModel: string
  meterSerialNumber: string
  updatedAt: string
}
```

---

## 3. Migration

Brak wpisu w KV → `normalizeElectricalMeasurementSettings(null)` zwraca:

| Pole | Wartość |
|------|---------|
| Pomiarowiec | Dawid Thai Thanh |
| Model | Sonel MPI-520 |
| Numer | 722453 |

`App.tsx` — `useLocalStorage` z `DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS`.

---

## 4. WM Druk Settings

**WM Druk → Ustawienia → Pomiary Elektryczne**

- 3 pola edycji
- Przycisk **Zapisz ustawienia** → chmura
- Przywróć domyślne (pomiary)

---

## 5. Report Defaults

Przy **Utwórz raport** / **Utwórz raport ponownie**:

```typescript
createEmptyElectricalMeasurement(jobId, rapNumber, measurementSettings)
```

- Kopiuje 3 pola z ustawień
- `metaFieldsOverridden: false` → pola read-only w UI

---

## 6. Override Logic

| `metaFieldsOverridden` | UI |
|------------------------|-----|
| `false` (nowy raport) | read-only + „Nadpisz dla tego raportu” |
| `true` | edycja lokalna |
| `undefined` (legacy) | edycja (backward compat) |

Istniejące raporty **nie są** masowo aktualizowane.

---

## 7. Build

```text
npm run build — PASS
```

---

## 8. Smoke

| Skrypt | Wynik |
|--------|-------|
| `test-electrical-measurements-settings-p17.mjs` | 24+ PASS |
| Regresja P16 / P15 / P0 | PASS |

Scenariusz: ustawienia → nowy raport → override → DOCX z danymi raportu — PASS.

---

## 9. Known Limitations

1. Zmiana globalnych ustawień **nie aktualizuje** istniejących raportów (zamierzone).
2. Pola meta read-only wymagają „Nadpisz” — legacy raporty bez flagi pozostają edytowalne.
3. Brak osobnych domyślnych per użytkownik (globalne firmowe).

---

## 10. Plan EM-P2

Integracja pomiarów z **ZIP Odbiorowy WGDOM** — 5 DOCX w paczce na podstawie przypisanego RAP (bez zmiany numeracji ani defaults).

---

## Zmienione pliki

| Plik | Rola |
|------|------|
| `src/lib/electrical-measurements/settings.ts` | **NOWY** |
| `src/lib/electrical-measurements/types.ts` | `ElectricalMeasurementSettings`, `metaFieldsOverridden` |
| `src/lib/electrical-measurements/report.ts` | defaults przy create |
| `src/lib/electrical-measurements/normalize.ts` | parse override flag |
| `src/lib/electrical-measurements/sync.ts` | push settings |
| `src/lib/cloud-sync.ts` | KV merge |
| `src/app/App.tsx` | stan + commit |
| `src/app/WmPrintView.tsx` | UI ustawień |
| `src/app/JobElectricalMeasurementsPanel.tsx` | auto-fill + override |
| `scripts/test-electrical-measurements-settings-p17.mjs` | **NOWY** |
