# EM-P1.5 — Measurement Value Engine — Raport końcowy

**Data:** 2026-06-16  
**Wersja:** 2.59.33  
**Status:** COMPLETE  

---

## 1. Generator Architecture

Silnik wartości pomiarowych (`src/lib/electrical-measurements/measurement-value-engine.ts`) jest SSOT dla ADSC, RCD i rezystancji.

```text
Raport (ElectricalMeasurement)
  ↓ createEmpty / recalculateElectricalMeasurementValues
generateElectricalMeasurementValueSet(seed)
  ↓ applyGeneratedValuesToMeasurement
valueSet → zapis w raporcie (KV via sync)
  ↓ resolve*Values (read-only)
Preview / DOCX payload
```

**Pole danych:** `ElectricalMeasurement.valueSet` (`ElectricalMeasurementValueSet`, wersja 1):

| Klucz | Zawartość |
|-------|-----------|
| `seed` | `${id}:${reportNumber}` |
| `generatedAt` | ISO timestamp |
| `adscSupply` | Zs, Za, I, Ia, typ, ocena — zasilanie |
| `adscByCircuitId` | mapa obwód → ADSC |
| `resistanceSupply` | Ra, L1-N, 3F — zasilanie |
| `resistanceByCircuitId` | mapa obwód → rezystancja |
| `rcdByRcdId` | mapa RCD → Rs + stałe |

**Moment losowania (wyłącznie):**

- `createEmptyElectricalMeasurement` — auto-generacja przy utworzeniu raportu
- `recalculateElectricalMeasurementValues` — przycisk „Przelicz wartości” w UI

**Nigdy:** `buildAdscPreview`, `buildRcdPreview`, `buildResistancePreview`, `buildElectricalMeasurementDocxPayload`, `generateEmDocxBytes`.

**Seed:** `seedKeyForMeasurement(m) = \`${m.id}:${reportNumber || "draft"}\`` — mulberry32 PRNG po hash FNV-1a.

---

## 2. Randomization Rules

### ADSC — zasilanie

| Pole | Wartość |
|------|---------|
| Zs | losowe 0,25–0,48 Ω (pełny zakres) |
| Za | 0,92 Ω |
| I | 25 A |
| Ia | 250 A |
| Typ | C |
| Ocena | Pozytywna |

### ADSC — obwody

| Typ | Zs | I | Ia | Za |
|-----|----|---|-----|-----|
| Gniazda 230V | 0,23–0,49 Ω | 16 | 80 | 2,88 |
| Oświetlenie 230V | 0,23–0,49 Ω | 10 | 50 | 4,88 |
| Gniazda 400V | 0,23–0,49 Ω | 16 | 80 | 2,88 |

Etykieta 400V: `Obwód gniazd 400V` (z `types.ts`).

### RCD

| Pole | Wartość |
|------|---------|
| Rs | losowe 0,28–0,45 Ω |
| IAN | 30 |
| Ia | 18 |
| tA | 300 |
| TRCD | 13 |
| Ud | 2 |
| Kontrola testu | Pozytywna |

### Rezystancja — etykiety

| Sekcja | Etykieta |
|--------|----------|
| Zasilanie 3×4 | Obwód YDY 3x4 mm² |
| Zasilanie 5×4 | Obwód YDY 5x4 mm² |
| Gniazda 230V | Obwód Gniazd YDY 3x2,5 mm² |
| Oświetlenie | Obwód Oświetlenia YDY 3x1,5 mm² |
| Gniazda 400V | Obwód Gniazd YDY 5x2,5 mm² |

**3F (L1-PE, L2-PE, L3-PE, N-PE):** wszystkie `>50` MΩ.

---

## 3. Duplicate Prevention

`generateUniqueOhmValues(rng, count, min, max)`:

1. Losowanie w pełnym zakresie (bez skupiania wokół średniej).
2. Zaokrąglenie do 0,01 Ω.
3. Jeśli duplikat w zbiorze — przesunięcie o 0,01–0,05 w granicach `[min, max]`.
4. ADSC: unikalność wszystkich Zs (zasilanie + obwody) w jednym losowaniu.
5. RCD: unikalność wszystkich Rs w jednym losowaniu.

Test: P15-T03 — 32/32 PASS.

---

## 4. Manual Overrides

UI (`JobElectricalMeasurementsPanel.tsx`) — sekcja **5. Wyniki pomiarów**:

- Edycja inline Zs (ADSC zasilanie + obwody) i Rs (RCD).
- `patchAdscSupplyValues`, `patchAdscCircuitValues`, `patchRcdValues` — mutacja `valueSet` bez ponownego losowania.
- Zapis raportu → sync chmura (`kw-electrical-measurements`).

Po korekcie preview i DOCX używają zapisanych wartości (resolve, nie generate).

Test: P15-T05 — override 0,48 → 0,45, preview odzwierciedla korektę.

---

## 5. Preview Parity

`preview.ts` — funkcje `buildAdscPreview`, `buildResistancePreview`, `buildRcdPreview` korzystają wyłącznie z `resolve*Values()`.

- Brak importu generatora losowego.
- Dwukrotne wywołanie preview → identyczny wynik (P15-T10).
- `assertPreviewParity()` w `em-docx-payload.ts` — payload ADSC/RCD/resistance zgodny z preview.

Regresja P0: 34/34 PASS · P1: 32/32 PASS.

---

## 6. DOCX Parity

`em-docx-payload.ts` — wiersze tabel budowane z `resolveAdscSupplyValues`, `resolveAdscCircuitValues`, `resolveRcdValues`, `resolveResistance*`.

- Legacy raporty bez `valueSet` → fallback (Zs 0,34 / 0,33, Rs 0,33).
- DOCX zawiera skorygowane wartości po edycji użytkownika (P15-T06).

---

## 7. Build

```text
npm run build
```

**Wynik:** PASS (33.33s, Vite 6.3.5, 2681 modułów).

---

## 8. Smoke

| Skrypt | Wynik |
|--------|-------|
| `scripts/test-electrical-measurements-p15.mjs` | **32 PASS, 0 FAIL** |
| `scripts/test-electrical-measurements-p0.mjs` | **34 PASS, 0 FAIL** |
| `scripts/test-electrical-measurements-p1.mjs` | **32 PASS, 0 FAIL** |

Scenariusz P15 (create → generate → korekta 2 wartości → save roundtrip → DOCX): PASS.

---

## 9. Known Limitations

1. **Nowe obwody/RCD po utworzeniu raportu** — wymagają „Przelicz wartości” (UI ostrzeżenie); brak auto-dopisywania tylko dla nowych ID.
2. **Edycja inline** — obecnie Zs/Rs; pozostałe pola (Za, I, Ra 3F) tylko przez generator.
3. **Legacy** — raporty sprzed P1.5 bez `valueSet` używają stałych fallback; pierwsze przeliczenie nadpisze `valueSet`.
4. **Numer raportu** — zmiana `reportNumber` zmienia seed przy przeliczeniu (zamierzone).

---

## 10. Plan EM-P2 ZIP

**Cel:** pakiet ZIP wszystkich 5 dokumentów pomiarowych per raport (Protokół, Dane informacyjne, Parametry RCD, Badanie ADSC, Badanie rezystancji).

| Etap | Zakres |
|------|--------|
| EM-P2.1 | `generateEmDocxZip(measurement, job)` — reuse `generateEmDocxBytes` × 5 |
| EM-P2.2 | UI przycisk „Pobierz pakiet ZIP” w panelu Pomiary |
| EM-P2.3 | Nazewnictwo plików: `{RAP_NO}_{doc-kind}.docx` |
| EM-P2.4 | Smoke + regresja preview/DOCX parity |
| EM-P2.5 | HelpView + CHANGELOG |

**Zależność:** EM-P1.5 COMPLETE — wartości stabilne w ZIP bez ponownego losowania.

---

## Zmienione pliki (EM-P1.5)

| Plik | Rola |
|------|------|
| `src/lib/electrical-measurements/measurement-value-engine.ts` | **NOWY** — generator SSOT |
| `src/lib/electrical-measurements/types.ts` | `valueSet`, typy wartości |
| `src/lib/electrical-measurements/normalize.ts` | parse/serialize `valueSet` |
| `src/lib/electrical-measurements/report.ts` | auto-generate, `recalculate*` |
| `src/lib/electrical-measurements/preview.ts` | resolve-only preview |
| `src/lib/electrical-measurements/em-docx-payload.ts` | resolve-only payload |
| `src/app/JobElectricalMeasurementsPanel.tsx` | sekcja Wyniki pomiarów |
| `src/app/changelog-data.ts` | v2.59.33 |
| `CHANGELOG.md` | skrót |
| `scripts/test-electrical-measurements-p15.mjs` | **NOWY** |
| `scripts/test-electrical-measurements-p0.mjs` | regresja preview |
| `scripts/test-electrical-measurements-p1.mjs` | regresja parity |
