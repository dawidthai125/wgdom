# EM-P1A — DOCX Template Forensics

**Data:** 2026-06-16  
**Tryb:** READ ONLY — bez implementacji  
**Baseline:** EM-P0 COMPLETE (v2.59.28) · P0-HOTFIX-001 COMPLETE (v2.59.29)  
**Źródło plików:** `Desktop\Dokumenty\Pomiary Elektryczne\` (5× DOCX, przykład RAP-43-2026, Sępa Szarzyńskiego 83/7)  
**Forensyka repo:** `audit/_tmp-wm-pomiary-001-forensic.json` · `audit/_tmp-wm-pomiary-001-tables.txt` · `audit/WM-POMIARY-001-DESIGN.md`

---

## 1. Variable Map

Wspólny blok operacyjny występuje w **4/5** dokumentów (tabela nagłówkowa 3×3). Protokół ma pola w tekście ciągłym poza tabelą.

### 1.1 Pola wspólne (scalar)

| Pole biznesowe | Przykład RAP-43-2026 | Placeholder | Źródło EM-P0 / job |
|----------------|----------------------|-------------|---------------------|
| Numer raportu | `RAP-43-2026` | `{{RAP_NO}}` | `measurement.reportNumber` |
| Wykonawca | `W&G DOM` | `{{EXECUTOR}}` | stała / settings EM-P0.5 |
| Data pomiaru | `05.06.2026r.` | `{{MEASUREMENT_DATE}}` | `measurement.measurementDate` (format PL) |
| Pomiarowiec | `Dawid Thai Thanh Elektryk Uprawniony` | `{{TECHNICIAN}}` | `measurement.technicianName` |
| Uprawnienia E/D | `E/516/374/22, D/517/374/22` | `{{TECHNICIAN_LICENSE}}` | **EM-P1** (brak w P0) |
| Miejsce pomiaru | `Wrocław, ul. Sępa Szarzyńskiego 83/7` | `{{ADDRESS}}` | `job.address` + `job.flatNumber` |
| Model miernika | `Sonel MPI 520` | `{{METER_MODEL}}` | `measurement.meterModel` |
| Nr miernika | `722453` | `{{METER_SERIAL}}` | `measurement.meterSerialNumber` |
| System uziemienia | `(TN-S)` | `{{EARTHING_SYSTEM}}` | **EM-P1** (domyślnie `TN-S`) |
| Rok | `2026` | `{{YEAR}}` | z daty pomiaru |

### 1.2 PROTOKÓŁ Z POMIARÓW OCHRONNYCH

| Pole | Przykład | Placeholder |
|------|----------|-------------|
| Tytuł | PROTOKÓŁ Z POMIARÓW OCHRONNYCH | statyczny |
| Przyczyna pomiarów | instalacja istniejąca | `{{MEASUREMENT_CAUSE}}` |
| Data wykonania protokołu | 05.06.2026 r. | `{{PROTOCOL_DATE}}` |
| Data wykonania pomiarów | 05.06.2026r. | `{{MEASUREMENT_DATE}}` |
| Użytkownik i miejsce | Wrocław ul. Sępa… | `{{ADDRESS}}` |
| Data kolejnego pomiaru | 05.06.2031r. (+5 lat) | `{{NEXT_MEASUREMENT_DATE}}` |
| Lista badań (3 linie) | Rezystancja / ADSC / RCD | statyczne etykiety |
| Orzeczenie | INSTALACJA SPEŁNIA… | `{{VERDICT_TEXT}}` |

**Tabele:** 1×3 wiersze — **wszystkie statyczne** (brak wierszy dynamicznych).

### 1.3 DANE INFORMACYJNE

| Pole | Placeholder |
|------|-------------|
| Nagłówek raportu | `{{RAP_NO}}`, `{{MEASUREMENT_DATE}}`, `{{TECHNICIAN}}`, `{{TECHNICIAN_LICENSE}}`, `{{ADDRESS}}` |
| Ocena poz. 1–7 | `{{INSPECTION_1}}` … `{{INSPECTION_7}}` |

**Tabela:** 9 wierszy = 1 nagłówek sekcji + 1 header + **7 stałych** pozycji normatywnych. Brak klonowania.

Przykładowe oceny: WŁAŚCIWY · POPRAWNE · TAK · ZAPEWNIONY.

### 1.4 BADANIE OCHRONY PRZED PORAŻENIEM (ADSC)

| Kolumna | Przykład | Placeholder wiersza |
|---------|----------|---------------------|
| Lp. | 1…9 | `{{ROW_LP}}` |
| Symbol | (puste) | `{{ROW_SYMBOL}}` |
| Badany punkt | Zasilanie / Obwód gniazd 230V | `{{ROW_POINT}}` ← **`circuit.displayName`** |
| Wyłącznik | S301 1p | `{{ROW_BREAKER}}` |
| typ | B / C | `{{ROW_BREAKER_TYPE}}` ← **`circuit.breakerType`** |
| I [A] | 16 / 25 | `{{ROW_IN}}` |
| Ia [A] | 80 / 250 | `{{ROW_IA}}` |
| Zs [Ω] | 0,33 | `{{ROW_ZS}}` |
| Za [Ω] | 2,88 | `{{ROW_ZA}}` |
| Ocena | POZYTYWNA | `{{ROW_ASSESSMENT}}` |

**Wiersz 1 (Zasilanie)** — specjalny: breaker `S301 1p`, typ `C`, In=25 — generowany z `supplyType`, nie z `circuits[]`.

### 1.5 BADANIE REZYSTANCJI OBWODÓW

| Kolumna | Placeholder wiersza |
|---------|---------------------|
| Lp. | `{{ROW_LP}}` |
| BADANY OBWÓD (PUNKT) | `{{ROW_CIRCUIT_NAME}}` ← **`buildResistancePreview()` label** |
| L1-L2 … N-PE (12 kolumn) | `{{ROW_L1L2}}` … `{{ROW_NPE}}` |
| Ra [MΩ] | `{{ROW_RA}}` |
| U iso [V] | `{{ROW_U_ISO}}` |
| OCENA | `{{ROW_ASSESSMENT}}` |

W przykładzie wiele komórek pustych lub `>50` — typowe dla 1-faz TN-S.

### 1.6 PARAMETRY RCD

| Kolumna | Przykład | Placeholder |
|---------|----------|-------------|
| Lp. | 1 | `{{ROW_LP}}` |
| Symbol | RCD1 | `{{ROW_SYMBOL}}` ← **`rcd.symbol`** |
| Nazwa obwodu | Obwody gniazd | `{{ROW_CIRCUIT_NAME}}` |
| RCD | P302 | `{{ROW_RCD_TYPE}}` ← **`rcd.deviceType`** |
| TYP | AC | `{{ROW_RCD_AC_TYPE}}` |
| SEL. | NIE | `{{ROW_SELECTIVE}}` |
| IAN [mA] | 30 | `{{ROW_IAN}}` |
| Ia [mA] | 18 | `{{ROW_IA}}` |
| tA [ms] | 300 | `{{ROW_TA}}` |
| TRCD [ms] | 13 | `{{ROW_TRCD}}` |
| Ud [V] | 2 | `{{ROW_UD}}` |
| Rs [Ω] | 0,33 | `{{ROW_RS}}` |
| Kontrola testu | Zadziałał | `{{ROW_TEST}}` |
| Ocena | Pozytywna | `{{ROW_ASSESSMENT}}` |

---

## 2. Placeholder Strategy

### 2.1 Konwencja

- Skalary: `{{SCREAMING_SNAKE}}` — podmiana w `<w:t>` z obsługą split-run (reuse wzorca `generate-docx.ts` WM Druk).
- Wiersze dynamiczne: prefiks `{{ROW_*}}` w **jednym wierszu wzorcowym** `<w:tr>`.
- Marker wiersza (alternatywa): atrybut `data-em-repeat="adsc-rows"` w komórce lub komentarz `<!-- em:repeat:adsc-rows -->` przed `<w:tr>`.

### 2.2 Migracja szablonów (jednorazowa, poza kodem)

| Doc | Akcja |
|-----|--------|
| Protokół | Zamiana 8–10 pól tekstowych → placeholdery |
| Dane informacyjne | Nagłówek + 7× `{{INSPECTION_N}}` |
| ADSC / Rezystancja / RCD | Nagłówek + **1 wiersz wzorcowy** + legenda bez zmian |

Docelowa lokalizacja: `public/em-print/` lub `public/em-measurements/` (5 plików `.template.docx`).

### 2.3 Wartości pomiarowe (luka EM-P0 → EM-P1)

EM-P0 dostarcza **strukturę** (obwody, RCD, metadane). **Nie** przechowuje Zs, Za, In, macierzy MΩ.

| Strategia EM-P1 | Opis |
|-----------------|------|
| **P1A (MVP generator)** | Wiersze z etykietami z `preview.ts`; komórki pomiarowe = domyślki z wzorca (`>50`, `POZYTYWNA`, puste) lub stałe reguły |
| **P1B (pełne dane)** | Rozszerzenie modelu: `AdscMeasurementValues`, `ResistanceMeasurementValues`, `RcdMeasurementValues` per wiersz |

Forensyka **nie blokuje** P1A — szablony nadają się do klonowania wierszy z placeholderami; wartości można uzupełniać iteracyjnie.

---

## 3. Dynamic Tables

| # | Dokument | Tabele | Statyczne | Dynamiczne |
|---|----------|--------|-----------|------------|
| 1 | Protokół | 1 (3 w.) | 3 | 0 |
| 2 | Dane informacyjne | 1 (9 w.) | 9 (7 poz. + hdr) | 0 |
| 3 | ADSC | 4 | T1 hdr (3) + T2 tytuł (1) + T4 legenda (10) | **T3: N wierszy** |
| 4 | Rezystancja | 3 | T1 hdr (3) + T2 tytuł (1) | **T3: N wierszy** |
| 5 | RCD | 4 | T1 hdr (3) + T2 tytuł (1) + T4 legenda (12) | **T3: N wierszy** |

### 3.1 ADSC — Tabela 3

| Właściwość | Wartość |
|------------|---------|
| Kolumny | **10** |
| Wiersze statyczne | 1 (nagłówek kolumn) |
| Wiersze dynamiczne | **1 + circuits.length** (Zasilanie + obwody) |
| Przykład RAP-43 | 9 wierszy danych (1 zasilanie + 8 punktów) |
| Legenda (T4) | 10 wierszy — **statyczna, bez klonowania** |

### 3.2 Rezystancja — Tabela 3

| Właściwość | Wartość |
|------------|---------|
| Kolumny | **16** |
| Wiersze statyczne | 1 (nagłówek — uwaga: duplikat etykiety L1-L2) |
| Wiersze dynamiczne | **1 + circuits.length** (YDY zasilanie + obwody) |
| Przykład RAP-43 | 8 wierszy (1 YDY 3×4 + 7 obwodów) |

### 3.3 RCD — Tabela 3

| Właściwość | Wartość |
|------------|---------|
| Kolumny | **14** |
| Wiersze statyczne | 1 (nagłówek) |
| Wiersze dynamiczne | **rcds.length** (typowo 1–4) |
| Przykład RAP-43 | 1 wiersz (RCD1 / P302) |
| Legenda (T4) | 12 wierszy — **statyczna** |

---

## 4. Template Rows

| Dokument | Tabela | TEMPLATE ROW | Identyfikacja w szablonie |
|----------|--------|--------------|---------------------------|
| Protokół | — | brak | tylko skalary |
| Dane informacyjne | T1 | brak | fixed 7 wierszy + `{{INSPECTION_N}}` |
| **ADSC** | **T3** | **Wiersz R2** (pierwszy wiersz danych po headerze) | `{{ROW_LP}}`…`{{ROW_ASSESSMENT}}` · w prod: osobny wzorzec **Zasilanie** (R2) vs **Obwód** (R3) — rekomendacja: **2 wzorce** lub 1 wzorzec obwodu + wiersz Zasilanie generowany osobno |
| **Rezystancja** | **T3** | **Wiersz R2** | `{{ROW_LP}}`…`{{ROW_ASSESSMENT}}` |
| **RCD** | **T3** | **Wiersz R2** | `{{ROW_LP}}`…`{{ROW_ASSESSMENT}}` |

### Rekomendacja ADSC — dwa wzorce wierszy

Forensyka pokazuje różne parametry wiersza **Zasilanie** (S301 1p, C, 25A) vs obwody (S301 1p, B, 16A). Zgodnie z `preview.ts`:

```text
buildAdscPreview() → ["1. Zasilanie", "2. Obwód gniazd 230V", …]
```

| Wiersz | Źródło | Template row |
|--------|--------|--------------|
| Zasilanie | `supplyType` + reguły stałe | `{{ROW_SUPPLY_*}}` — **1× statyczny clone** lub dedykowany `<w:tr>` w szablonie |
| Obwody | `circuits[]` sorted by `sortOrder` | `{{ROW_*}}` — **clone × N** |

---

## 5. XML Cloning Risk

Ocena dla strategii **JSZip + clone `<w:tr>` + substitucja `{{ROW_*}}`** (jak w WM-POMIARY-001-DESIGN §3.1).

| Obszar | Ryzyko | Uzasadnienie |
|--------|--------|--------------|
| **ADSC** | **MEDIUM** | 10 kolumn, prosta siatka (brak `w:gridSpan` w forensyce), split-run Word możliwy; 2 typy wierszy (Zasilanie vs obwód); legenda statyczna — niski wpływ |
| **RCD** | **LOW** | 14 kolumn ale zwykle 1–4 wiersze; struktura regularna; legenda statyczna |
| **REZYSTANCJA** | **HIGH** | 16 kolumn, wiele pustych komórek, duplikat nagłówka L1-L2, macierz zależna od 1F/3F; największe ryzyko uszkodzenia XML przy clone; wymaga smoke z bilansowaniem tagów |

### Mitigacje

1. Reuse `validateWmPrintDocxXml()` (bilans `w:t`, `w:r`) po każdej generacji.
2. Wzorzec split-run z `substituteParagraphWmPrintVariables` per komórka.
3. Rezystancja: EM-P1B — osobny sprint + smoke `test-em-p1-resistance-wide.mjs`.
4. Fallback docxtemplater (Ścieżka C z WM-POMIARY-001) tylko jeśli clone zawiedzie.

---

## 6. Preview Mapping

SSOT: `src/lib/electrical-measurements/preview.ts` → wejście generatora `generate-em-docx.ts`.

### 6.1 ADSC

| preview.ts | DOCX |
|------------|------|
| `buildAdscPreview(measurement)` | **Badanie ochrony przed porażeniem** (T3) |
| Linia `1. Zasilanie` | Wiersz 1: Badany punkt = `Zasilanie` |
| Linie `2…N. {displayName}` | Wiersze 2…N: Badany punkt = `circuit.displayName` |
| — | `circuit.breakerType` → kolumna **typ** |
| — | `sortOrder` → kolumna **Lp.** |

**Parity:** ✅ **Etykiety wierszy** — 1:1 z kolumną „Badany punkt”. Wartości pomiarowe (Zs, Za…) — poza P0, EM-P1B.

### 6.2 Rezystancja

| preview.ts | DOCX |
|------------|------|
| `buildResistancePreview(measurement)` | **Badanie rezystancji obwodów** (T3) |
| Wiersz 1: `Obwód YDY 3x4mm²` / `5x4mm²` | Wiersz 1: BADANY OBWÓD = etykieta zasilania |
| Wiersze 2…: etykiety obwodów | Wiersze 2…: BADANY OBWÓD = etykieta z `circuitResistanceLabel()` |

**Parity:** ✅ **Nazwy obwodów** — zgodne z przykładem RAP-43 (8 wierszy = 1 supply + 7 obwodów w oryginale; model P0: 1 + `circuits.length`).

### 6.3 RCD

| preview.ts | DOCX |
|------------|------|
| `buildRcdPreview(measurement)` | **Parametry zabezpieczeń różnicowo-prądowych** (T3) |
| `RCD1 → P302` | Symbol=`RCD1`, RCD=`P302` |

**Parity:** ✅ **Symbol + typ urządzenia**. Pozostałe 12 kolumn — EM-P1B (wartości pomiarowe).

### 6.4 Diagram przepływu

```text
ElectricalMeasurement + Job
        │
        ▼
buildElectricalMeasurementDocxPayload()   ← NOWY mapper EM-P1A
        │
        ├── scalars → {{RAP_NO}}, {{ADDRESS}}, …
        ├── buildAdscPreview() → row labels + row values[]
        ├── buildResistancePreview() → row labels + row values[]
        └── buildRcdPreview() → row labels + row values[]
        │
        ▼
generate-em-docx.ts
        ├── scalar substitute (Protokół, Dane info, nagłówki)
        └── cloneTableRows × 3 (ADSC, Rezystancja, RCD)
```

---

## 7. Payload Contract

Propozycja interfejsu wejścia dla `generate-em-docx.ts`:

```ts
/** EM-P1A — payload generatora DOCX (SSOT między preview a szablonami). */
export interface ElectricalMeasurementDocxPayload {
  /** Metadane raportu */
  scalars: {
    rapNo: string;
    executor: string;
    measurementDatePl: string;       // "05.06.2026r."
    protocolDatePl: string;
    nextMeasurementDatePl: string;   // +5 lat
    technician: string;
    technicianLicense: string;       // EM-P1 — opcjonalnie pusty w P1A
    address: string;                 // jobDisplayTitle / pełny adres
    meterModel: string;
    meterSerial: string;
    earthingSystem: string;          // default "TN-S"
    measurementCause: string;        // default "instalacja istniejąca"
    verdictText: string;
    inspectionAssessments: [string, string, string, string, string, string, string];
  };

  /** Wiersze ADSC — 1 Zasilanie + circuits (sortOrder) */
  adscRows: EmDocxAdscRow[];

  /** Wiersze rezystancji — 1 supply + circuits */
  resistanceRows: EmDocxResistanceRow[];

  /** Wiersze RCD — 1 per rcd */
  rcdRows: EmDocxRcdRow[];
}

export interface EmDocxAdscRow {
  lp: number;
  symbol: string;
  pointName: string;           // z preview / displayName
  breakerName: string;         // np. "S301 1p"
  breakerType: string;         // B | C
  inAmps: string;
  iaAmps: string;
  zsOhm: string;
  zaOhm: string;
  assessment: string;
}

export interface EmDocxResistanceRow {
  lp: number;
  circuitName: string;         // z buildResistancePreview()
  l1l2: string;
  l2l3: string;
  l1l3: string;
  l1l2Alt: string;
  l1pe: string;
  l2pe: string;
  l3pe: string;
  l1n: string;
  l2n: string;
  l3n: string;
  npe: string;
  ra: string;
  uIso: string;
  assessment: string;
}

export interface EmDocxRcdRow {
  lp: number;
  symbol: string;
  circuitName: string;
  rcdType: string;             // P302 | P304
  acType: string;
  selective: string;
  ianMa: string;
  iaMa: string;
  taMs: string;
  trcdMs: string;
  udV: string;
  rsOhm: string;
  testControl: string;
  assessment: string;
}
```

**Factory (EM-P1A):**

```ts
function buildElectricalMeasurementDocxPayload(
  measurement: ElectricalMeasurement,
  job: Pick<Job, "address" | "flatNumber">,
  options?: EmDocxGeneratorOptions,
): ElectricalMeasurementDocxPayload;
```

Implementacja w `preview.ts` lub `em-docx-payload.ts` — **jeden mapper**, generator tylko czyta payload.

---

## 8. EM-P1 Recommendation

### Fazy implementacji

| Faza | Zakres | Ryzyko |
|------|--------|--------|
| **EM-P1A** | Templatyzacja 5 DOCX + payload + Protokół + Dane info (skalary) | LOW |
| **EM-P1B** | `cloneTableRows` — RCD (LOW risk) → ADSC (MEDIUM) | MEDIUM |
| **EM-P1C** | Rezystancja 16-kol (HIGH risk) + rozszerzenie modelu wartości | HIGH |
| **EM-P1D** | ZIP pack 5× DOCX · historia generowania · UI „Pobierz protokół” | LOW |

### Zależności od EM-P0

| Element P0 | Gotowość EM-P1 |
|------------|----------------|
| `circuits[].displayName`, `sortOrder` | ✅ ADSC/Rezystancja row labels |
| `circuits[].breakerType` | ✅ ADSC kolumna typ |
| `rcds[].symbol`, `deviceType` | ✅ RCD wiersze |
| `buildAdscPreview` / `buildResistancePreview` / `buildRcdPreview` | ✅ SSOT parity |
| Brak wartości Zs/Za/MΩ | ⚠️ EM-P1B — domyślki lub rozszerzenie modelu |

### Silnik

| Komponent | Decyzja |
|-----------|---------|
| `generate-em-docx.ts` | Implementacja w EM-P1 (obecnie STUB) |
| Skalary | Reuse wzorca WM `substituteParagraphWmPrintVariables` |
| Tabele dynamiczne | **DOCX XML row cloning** (Ścieżka A) — **POTWIERDZONE** przez forensykę |
| WM Druk `generate-docx.ts` | **Nie rozszerzać** — osobna domena EM |

### Smoke plan (przed prod EM-P1)

```bash
npx vite-node scripts/test-em-p1-scalar-docx.mjs      # Protokół + Dane info
npx vite-node scripts/test-em-p1-adsc-rows.mjs        # 1 vs 9 wierszy
npx vite-node scripts/test-em-p1-rcd-rows.mjs         # 1 vs 3 RCD
npx vite-node scripts/test-em-p1-resistance-wide.mjs   # 16 kolumn
npx vite-node scripts/test-electrical-measurements-p0.mjs  # regresja P0
```

---

## WERDYKT

# EM-P1 GO

**Uzasadnienie:**

1. **5/5 dokumentów** nadają się do automatycznej generacji po jednorazowej migracji do placeholderów.
2. **2/5** (Protokół, Dane informacyjne) — wyłącznie substitucja skalarnów (**LOW** complexity).
3. **3/5** (ADSC, Rezystancja, RCD) — potwierdzona struktura **template row + XML clone**; brak `gridSpan`, legendy statyczne.
4. **`preview.ts` SSOT** mapuje się 1:1 na kolumny „Badany punkt” / „BADANY OBWÓD” / Symbol+RCD.
5. Model EM-P0 (`displayName`, `sortOrder`, `breakerType`) **eliminuje migrację danych w EM-P1**.

**Warunki (nie blokery):**

- Jednorazowa templatyzacja plików Word → `public/em-measurements/*.template.docx`
- Wartości pomiarowe (Zs, Za, macierz MΩ) — faza EM-P1B/C lub domyślki w P1A
- Rezystancja 16-kol — osobny sprint (HIGH risk), nie blokuje startu EM-P1A/B

**EM-P1 BLOCKED** — **NIE** (brak fundamentalnych przeszkód architektonicznych).

---

*EM-P1A READ ONLY · forensyka na bazie WM-POMIARY-001 + model EM-P0 v2.59.28*
