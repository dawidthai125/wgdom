# EM-P0 — Electrical Measurements Foundation — AUDIT + PLAN

**Data:** 2026-06-16  
**Baseline:** v2.59.26 · WM-POMIARY-001 DESIGN ✅  
**Tryb:** AUDIT + PLAN — **implementacja wstrzymana do akceptacji**

---

# ETAP 1 — AUDIT (READ ONLY)

## 1.1 Kontekst z WM-POMIARY-001

| Ustalenie | Wpływ na EM-P0 |
|-----------|----------------|
| Osobna domena `electrical-measurements/` | ✅ Zgodne ze spec EM-P0 |
| Brak generatora DOCX w P0 | ✅ Tylko model + UI + preview |
| Brak integracji WM Druk / ZIP | ✅ Zero zmian w `wm-print/*` |
| Pełny model pomiarów (ADSC macierze) | ⏳ **P1** — P0 ma uproszczone `circuits[]` + `rcds[]` |
| Preview odzwierciedla przyszłe tabele DOCX | ✅ `preview.ts` jako most do EM-P1 |

## 1.2 Audyt kodu WGDOM (wzorce do reuse)

| Wzorzec | Plik | Zastosowanie EM-P0 |
|---------|------|-------------------|
| Domena + typy + normalize | `operational-notes.ts` | `types.ts` + `normalize.ts` |
| Tablica KV + merge by id | `recoverable-charges.ts` + `mergeRecordsById` | `merge.ts` |
| `commitX` + `pushKeysToCloud` | `App.tsx` → `commitRecoverableCharges` | `commitElectricalMeasurements` |
| Panel w summary roboty | `JobWmPrintHistoryPanel.tsx` | `JobElectricalMeasurementsPanel.tsx` |
| Props przez AdminViewRouter | `JobsView` props chain | ten sam łańcuch |
| `DATA_KEYS` + `BOOTSTRAP_DEFERRED_KEYS` | `cloud-sync.ts` | `kw-electrical-measurements` |
| Auto-sync debounce | `App.tsx` useEffect deps | dodać `electricalMeasurements` |

## 1.3 Luki względem spec użytkownika

| Spec | Decyzja planu |
|------|---------------|
| `breakerType` bez enum | **`"B" \| "C"`** w UI (select) — zgodnie z protokołami źródłowymi |
| Wiele pomiarów vs jeden per robota | **P0: max 1 rekord `ElectricalMeasurement` per `jobId`** (upsert) |
| `createdAt` w spec | ✅ ustawiane przy pierwszym zapisie, `updatedAt` przy każdej edycji |
| Tombstone deleted | **P0: brak** — usuwanie obwodu/RCD = mutacja nested array, nie tombstone całego raportu |
| Ustawienia firmowe (miernik domyślny) | **Backlog P0.5** — P0 puste pola, bez `kw-electrical-measurements-settings` |
| Numer RAP auto | **Backlog P0.5** — P0 pole tekstowe ręczne |

## 1.4 Werdykt audytu

| | |
|---|---|
| **Gotowość architektury** | ✅ Wzorce w repo wystarczają |
| **Ryzyko P0** | Niskie — izolowana domena, brak generatora |
| **Konflikt z WM Druk** | Brak — zero importów cross-domain w P0 |
| **IMPLEMENT** | **GO po akceptacji planu** |

---

# ETAP 2 — PLAN IMPLEMENTACJI

## 2.1 Struktura plików

```text
src/lib/electrical-measurements/
  types.ts                 # typy, stałe, etykiety PL
  normalize.ts             # normalizeElectricalMeasurements, parseMeasurement
  merge.ts                 # mergeElectricalMeasurements (by id, updatedAt)
  report.ts                # CRUD: getForJob, upsert, add/remove circuit & rcd
  preview.ts               # buildAdscPreview, buildResistancePreview, buildRcdPreview
  sync.ts                  # ELECTRICAL_MEASUREMENTS_KEY, pushElectricalMeasurementsToCloud
  generate-em-docx.ts      # STUB — interfejs + TODO EM-P1 (bez implementacji)

src/app/JobElectricalMeasurementsPanel.tsx   # UI form + preview

scripts/test-electrical-measurements-p0.mjs  # smoke lib (bez DOCX)
```

**Nie tworzyć** w P0: widoku admin top-level, ZIP, historii generowania, slotów WM Druk.

---

## 2.2 Model danych (zgodny ze spec + audyt)

```ts
// types.ts

export const ELECTRICAL_MEASUREMENTS_KEY = "kw-electrical-measurements";

export type SupplyType = "ydy-3x4" | "ydy-5x4";

export type CircuitType = "socket-1f" | "lighting-1f" | "socket-3f";

export type BreakerType = "B" | "C";

export type RcdDeviceType = "P302" | "P304";

export interface ElectricalMeasurementCircuit {
  id: string;
  type: CircuitType;
  breakerType: BreakerType;
}

export interface ElectricalMeasurementRcd {
  id: string;
  symbol: string;       // np. RCD1, RCD2
  deviceType: RcdDeviceType;
}

export interface ElectricalMeasurement {
  id: string;
  jobId: string;
  reportNumber: string;
  measurementDate: string;      // ISO YYYY-MM-DD
  technicianName: string;
  meterModel: string;
  meterSerialNumber: string;
  supplyType: SupplyType;
  circuits: ElectricalMeasurementCircuit[];
  rcds: ElectricalMeasurementRcd[];
  createdAt: string;
  updatedAt: string;
}
```

### Reguły biznesowe P0

| Reguła | Implementacja |
|--------|---------------|
| 1 raport / robota | `upsertMeasurementForJob(jobId, patch)` — replace by `jobId` |
| Nowy raport | `createEmptyMeasurement(jobId)` — `measurementDate = today`, `supplyType = ydy-3x4`, puste tablice |
| Id obwodu / RCD | `crypto.randomUUID()` |
| Domyślny obwód | `type: socket-1f`, `breakerType: B` |
| Domyślny RCD | `symbol: RCD{n}`, `deviceType: P302` (n = length+1) |

---

## 2.3 Storage i sync

| Element | Plan |
|---------|------|
| Klucz KV | `kw-electrical-measurements` |
| Format | `ElectricalMeasurement[]` |
| `DATA_KEYS` | ✅ dodać |
| `BOOTSTRAP_DEFERRED_KEYS` | ✅ dodać |
| Merge w `cloud-sync.ts` | `case "kw-electrical-measurements"` → `mergeElectricalMeasurements` |
| Merge strategia | by `id`; przy remisie **`updatedAt` newer wins** |
| App state | `useLocalStorage<ElectricalMeasurement[]>(ELECTRICAL_MEASUREMENTS_KEY, [])` |
| Commit | `commitElectricalMeasurements(next?)` → `pushElectricalMeasurementsToCloud` |
| Auto-sync deps | dodać `electricalMeasurements` do useEffect w `App.tsx` |

**Bez:** tombstone, backup aux keys, merge z `kw-jobs`.

---

## 2.4 Preview (read-only, most EM-P1)

Plik: `preview.ts` — **pure functions**, testowalne bez UI.

### Ochrona przed porażeniem (ADSC)

Algorytm `buildAdscPreviewLines(measurement)`:

1. **Zawsze** wiersz 1: `"Zasilanie"` (z `supplyType` → etykieta kabla w nagłówku preview opcjonalnie)
2. Dla każdego `circuits[]` w kolejności listy:
   - `socket-1f` → `"Obwód gniazd 230V"`
   - `lighting-1f` → `"Oświetlenie 230V"`
   - `socket-3f` → `"Obwód gniazd 400V"`
3. Numeracja: `1. …`, `2. …` (lp w preview)

### Rezystancja

Algorytm `buildResistancePreviewLines(measurement)`:

1. Jedna linia zasilania:
   - `ydy-3x4` → `"Obwód YDY 3x4mm²"`
   - `ydy-5x4` → `"Obwód YDY 5x4mm²"`
2. Per obwód (kolejność listy):
   - `socket-1f` → `"Obwód Gniazd YDY 3x2,5mm²"`
   - `lighting-1f` → `"Obwód Oświetlenia YDY 3x1,5mm²"`
   - `socket-3f` → `"Obwód Gniazd YDY 5x2,5mm²"`

*(Zgodnie z przykładowymi protokołami Sępa 83/7 i spec preview użytkownika.)*

### RCD

Algorytm `buildRcdPreviewLines(measurement)`:

Dla każdego `rcds[]`:

```text
{symbol}
{deviceType}
```

(para linii lub blok w UI — np. `RCD1` + `P302`)

---

## 2.5 UI — `JobElectricalMeasurementsPanel.tsx`

**Lokalizacja:** `JobsView.tsx` → sekcja **summary**, pod `JobWmPrintHistoryPanel` (ten sam wzorzec karty).

### Props

```ts
{
  job: Job;
  measurements: ElectricalMeasurement[];
  onChangeMeasurements: (next: ElectricalMeasurement[]) => void;
  onCommit: (next?: ElectricalMeasurement[]) => void;
}
```

### Sekcje (spec)

| # | Sekcja | Kontrolki |
|---|--------|-----------|
| 1 | **Dane pomiaru** | reportNumber, measurementDate (date input, default today), technicianName, meterModel, meterSerialNumber |
| 2 | **Zasilanie** | radio: YDY 3×4 mm² / YDY 5×4 mm² |
| 3 | **Obwody** | lista + „+ Dodaj obwód”; per wiersz: select typ (Gniazdo 1F / Oświetlenie 1F / Gniazdo 3F), select B/C, usuń |
| 4 | **RCD** | lista + „+ Dodaj RCD”; symbol (text), typ P302/P304, usuń |
| 5 | **Podgląd** (read-only) | 3 bloki: Ochrona przed porażeniem · Rezystancja · RCD |

### Zachowanie zapisu

- **On blur / onChange debounced** lub przycisk implicit: każda zmiana → `upsertMeasurementForJob` → `onChangeMeasurements` → `onCommit(next)`
- Wzorzec jak `JobRecoverableChargesPanel` / pola WM — **commit po edycji** (suppressAutoSync 4.5s via commit)

### Lazy load

Panel w `JobsView` — **bez** lazy (mały bundle). Import statyczny OK.

---

## 2.6 Architecture prep — `generate-em-docx.ts` (STUB)

```ts
/** EM-P1 — generator DOCX. NIE IMPLEMENTOWAĆ w P0. */

export interface EmDocxGeneratorInput {
  measurement: ElectricalMeasurement;
  job: Pick<Job, "id" | "address" | "flatNumber">;
}

export type EmDocxDocumentKind =
  | "protokol"
  | "dane-informacyjne"
  | "badanie-adsc"
  | "badanie-rezystancji"
  | "parametry-rcd";

// TODO EM-P1: generateEmDocx(kind, input): Promise<Uint8Array>
// TODO EM-P1: downloadEmDocxPack(measurement, job): Promise<void>
```

---

## 2.7 Integracja App / Router

| Plik | Zmiana |
|------|--------|
| `App.tsx` | state, commit, auto-sync dep, props → AdminViewRouter |
| `AdminViewRouter.tsx` | props → JobsView |
| `JobsView.tsx` | render `JobElectricalMeasurementsPanel` |
| `changelog-data.ts` | **2.59.27** — wpis EM-P0 |
| `GuideView.tsx` | FAQ krótki — Roboty → Pomiary elektryczne |
| `docs/ARCHITECTURE.md` | § nowy 12.1.x Pomiary Elektryczne (skrót) |

**Bez zmian:** `WmPrintView`, `wm-print-sync`, `generate-docx.ts`.

---

## 2.8 Testy smoke — `test-electrical-measurements-p0.mjs`

| # | Test |
|---|------|
| T1 | `createEmptyMeasurement` — defaults, measurementDate today |
| T2 | `upsertMeasurementForJob` — create + update |
| T3 | one measurement per jobId |
| T4 | add/remove circuit |
| T5 | add/remove RCD |
| T6 | `buildAdscPreviewLines` — Zasilanie + obwody numbered |
| T7 | `buildResistancePreviewLines` — supply + typy obwodów |
| T8 | `buildRcdPreviewLines` |
| T9 | `normalizeElectricalMeasurements` — reject garbage |
| T10 | `mergeElectricalMeasurements` — local + cloud, updatedAt wins |
| T11 | JSON roundtrip (symulacja reload LS) |

**Bez:** prawdziwych DOCX, Playwright E2E (opcjonalnie backlog).

---

## 2.9 Build / release workflow (po IMPLEMENT)

```text
IMPLEMENT → npm run build → npx vite-node scripts/test-electrical-measurements-p0.mjs
→ COMMIT → PUSH → curl version.json → audit/EM-P0-FOUNDATION-REPORT.md
```

Wersja docelowa: **2.59.27**

---

## 2.10 Ryzyka i mitigacje

| Ryzyko | Mitigacja |
|--------|-----------|
| Duplikat pomiaru per job | Enforce w `upsertMeasurementForJob` |
| Nested arrays merge conflict | Cały rekord wygrywa by `updatedAt` — P0 OK |
| Szeroki panel na mobile | Scroll w sekcji, dotyk 44px na przyciskach |
| Preview ≠ final DOCX | EM-P1 kalibracja na szablonach Word |

---

## 2.11 Następne fazy (poza P0)

| Faza | Zakres |
|------|--------|
| **EM-P0.5** | Ustawienia domyślne (miernik), auto numer RAP |
| **EM-P1** | `generate-em-docx.ts` — szablony skalarne + clone rows |
| **EM-P2** | Macierz rezystancji (16 kolumn) — pełne wartości pomiarowe w modelu |
| **EM-P3** | ZIP pakiet + opcjonalnie slot WM Odbiory |

---

# KRYTERIUM SUKCESU EM-P0

Po implementacji administrator może:

- [ ] Otworzyć robotę → sekcja **Pomiary Elektryczne**
- [ ] Uzupełnić dane pomiaru (data domyślnie dziś)
- [ ] Wybrać zasilanie YDY 3×4 / 5×4
- [ ] Dodać / usunąć obwody (typ + B/C)
- [ ] Dodać / usunąć RCD (symbol + P302/P304)
- [ ] Zobaczyć **podgląd** trzech tabel (read-only)
- [ ] Odświeżyć stronę — **dane zachowane** (LS + chmura)

**Bez:** generowania DOCX, ZIP, WM Druk.

---

# WERDYKT PLANU

| Etap | Status |
|------|--------|
| AUDIT | ✅ COMPLETE |
| PLAN | ✅ COMPLETE — **czeka na akceptację** |
| IMPLEMENT | ⏳ **Wstrzymany** |

---

*Po akceptacji: napisz **„implementuj EM-P0”** — pełny workflow BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT.*
