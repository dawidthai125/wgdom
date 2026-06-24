# WM-SCHEMATY-V1 — DESIGN FREEZE

> **Status:** **DESIGN FREEZE — GO**  
> **Data freeze:** 2026-06-24  
> **Baseline WGDOM:** prod **2.62.48** (`5cef155`)  
> **Tryb:** specyfikacja zamrożona · **bez implementacji w tym dokumencie**  
> **Poprzednie artefakty:** Architecture & Product Design · Analiza 10 schematów referencyjnych · Final Architecture Review (GO WITH CHANGES)

---

## 0. Zakres i założenia niepodlegające dyskusji

| # | Założenie |
|---|-----------|
| 1 | Schemat jednokreskowy jest **osobną domeną** (`electrical-schematics/`), nie częścią pomiaru |
| 2 | Może powstać **z pomiaru** (import jednorazowy) lub **ręcznie** |
| 3 | Użytkownik **nie rysuje** — edytuje wyłącznie dane |
| 4 | **SVG** = źródło renderowania (generowane automatycznie) |
| 5 | **PDF** = produkt końcowy |
| 6 | Brak edytora CAD, brak drag&drop symboli |
| 7 | R1 / R6 = **V2** (poza MVP) |
| 8 | Moduł = nowa zakładka **Schematy** w WM Druk |

**Nawigacja WM Druk (po implementacji):**

```text
Odbiory | Pomiary | Schematy | Katalog Pomiarów | Szablony | Historia | Ustawienia
```

**KV:** `kw-electrical-schematics` · merge LWW per `id` (wzorzec `electrical-measurements`)

---

## A. Zamrożony model `SingleLineDiagram`

### A.1 `schemaVersion`

| Wartość | Znaczenie |
|---------|-----------|
| `1` | MVP — mieszkania / lokale użytkowe, MCB + jedno RCD grupowe |

Przyszłe `schemaVersion: 2` — bezpieczniki STV, multi-RCD, feeders (V2). Nie implementować w MVP.

### A.2 Typy wyliczeniowe (zamrożone)

```text
SchematicStatus          = "draft" | "final"
SchematicLinkStatus      = "linked" | "detached" | "manual"
SchematicLayoutProfile   = "apartment-1f-v1" | "apartment-3f-v1" | "commercial-3f-v1"
                           | "distribution-r1-v1" | "distribution-r6-v1"   ← V2 only
SchematicSupplyPhase     = "1f" | "3f"
SchematicLoadKind        = "socket-1f" | "lighting-1f" | "cable-outlet-3f"
                           | "socket-3f" | "reserve" | "other"
SchematicBreakerType     = "B" | "C"
SchematicRcdType         = "AC" | "A"
SchematicCircuitFeedFrom = "main-bus" | "rcd-bus"      ← V1.1 only
SchematicCircuitPosition = "before-rcd" | "after-rcd"  ← V1.1 only
```

### A.3 Interfejs zamrożony

```typescript
/** SSOT modelu — WM-SCHEMATY-V1 DESIGN FREEZE */
interface SingleLineDiagram {
  id: string;
  schemaVersion: 1;

  // ── Dokument ──────────────────────────────────────────
  title: string;
  address: string;                    // WYMAGANE do eksportu final
  documentDate: string;               // ISO date YYYY-MM-DD
  notes?: string;                     // Notatki (TN-S, modernizacja, …)
  status: SchematicStatus;          // draft | final

  // ── Kontekst WGDOM ───────────────────────────────────
  jobId?: string;
  linkStatus: SchematicLinkStatus;
  sourceMeasurementId?: string;       // aktywne tylko gdy linkStatus === "linked"
  sourceMeasurementRef?: string;      // snapshot "RAP-45-2026" — zachowany po detach

  // ── Layout ───────────────────────────────────────────
  layoutProfile: SchematicLayoutProfile;  // MVP: apartment-1f-v1 | apartment-3f-v1 | commercial-3f-v1

  // ── Zasilanie ────────────────────────────────────────
  supply: {
    phase: SchematicSupplyPhase;
    busLabel: string;                 // "L, N, PE" | "L1, L2, L3, N, PE"
    mainCableLabel: string;           // np. "YDYp 5x6mm²"
  };

  mainSwitch?: {                      // FR — opcjonalny (Benedyktyńska, Głogowska, Pereca)
    label: string;                    // "FR 100A", "FR 40A", "FR 1S 63A"
    ratedCurrentA: number;
  };

  meter: {
    phases: 1 | 3;
    label: string;                    // domyślnie "KWh"
  };

  mainBreaker: {
    breakerType: SchematicBreakerType;
    ratedCurrentA: number;            // 25, 32, …
    poles: 1 | 2 | 3;
    breakingCapacityKa: number;       // domyślnie 6
  };

  mainRcd: {                          // JEDNO RCD grupowe w MVP (nie tablica)
    symbol?: string;                  // np. "ΔI"
    ratedCurrentA: number;            // 25, 40
    sensitivityMa: number;            // 30
    poles: 2 | 4;
    rcdType: SchematicRcdType;        // AC
  };

  circuits: SchematicCircuit[];

  // ── Render cache (opcjonalny w KV) ───────────────────
  renderedSvg?: string;
  renderVersion?: number;

  createdAt: string;                  // ISO datetime
  updatedAt: string;
}

interface SchematicCircuit {
  id: string;
  sortOrder: number;                  // 1-based, kolejność kolumn na szynie
  name: string;                       // WYMAGANE — "GN 230V Salon"
  presetId?: string;                  // źródło presetu (audyt, re-apply)
  loadKind: SchematicLoadKind;
  breakerType: SchematicBreakerType;
  ratedCurrentA: number;
  poles: 1 | 3;
  breakingCapacityKa: number;         // domyślnie 6
  cableLabel: string;                 // "YDYp 3x2,5mm²"
  description?: string;              // rozszerzenie: "wypust kablowy kuchenka elektryczna"

  // V1.1 — NIE w MVP (patrz § G)
  feedFrom?: SchematicCircuitFeedFrom;
  position?: SchematicCircuitPosition;
}
```

### A.4 Pola wymagane do eksportu PDF

| Pole | Draft | Final |
|------|-------|-------|
| `address` | ✅ | ✅ |
| `layoutProfile` | ✅ | ✅ |
| `supply.phase` | ✅ | ✅ |
| `mainBreaker` | ✅ | ✅ |
| `mainRcd` | ✅ | ✅ |
| `circuits.length >= 1` | ✅ | ✅ |
| każdy `circuits[].name` | ✅ | ✅ |
| każdy `circuits[].cableLabel` | ✅ | ✅ |

`title` — domyślnie stały nagłówek WM (patrz szablony § C).  
`jobId` — zawsze opcjonalne.

### A.5 Domyślny `title`

```text
SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ
```

Adres w nagłówku PDF = `address` (np. `WROCŁAW, UL. BENEDYKTYŃSKA 22/13`).

### A.6 Import z `ElectricalMeasurement` (mapowanie zamrożone)

| Pomiar EM | Schemat |
|-----------|---------|
| `supplyType: "ydy-3x4"` | `supply.phase: "1f"`, `mainCableLabel: "YDYp 3x4mm²"`, profil `apartment-1f-v1` |
| `supplyType: "ydy-5x4"` | `supply.phase: "3f"`, `mainCableLabel: "YDYp 5x4mm²"`, profil `apartment-3f-v1` |
| `circuits[].displayName` | `circuits[].name` |
| `circuits[].type` | → najbliższy `presetId` (§ B) + `loadKind` |
| `circuits[].breakerType` | `circuits[].breakerType` |
| `circuits[].sortOrder` | `circuits[].sortOrder` |
| `rcds[0]` | `mainRcd` (symbol, deviceType → sensitivity 30mA) |
| `valueSet.*` | **NIE importować** |
| `reportNumber` | `sourceMeasurementRef` + `linkStatus: "linked"` |
| TEST-RAP (`flags.test`) | import dozwolony · `status: "draft"` · badge TEST w UI |

---

## B. Zamrożona biblioteka presetów obwodów

**Lokalizacja (przy implementacji):** `src/lib/electrical-schematics/circuit-presets.ts`  
**Typ:** statyczna biblioteka w kodzie — **nie** KV, **nie** user-defined w MVP.

**Kontrakt `applyPreset(presetId, overrides?)`:**

1. Uzupełnia pola obwodu z tabeli poniżej.
2. **Nie** nadpisuje `id`, `sortOrder` (caller ustawia).
3. Po apply użytkownik może edytować dowolne pole.
4. Zapisuje `presetId` na obwodzie.

### B.1 Tabela presetów (SSOT)

| `presetId` | Domyślna `name` | `loadKind` | MCB | `poles` | Przewód `cableLabel` |
|------------|-----------------|------------|-----|---------|----------------------|
| `socket-230v` | GN 230V | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `lighting` | OŚWIETLENIE | `lighting-1f` | B10A 1P 6kA | 1 | YDYp 3x1,5mm² |
| `washer` | GN 230V Pralka | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `dishwasher` | GN 230V Zmywarka | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `oven` | GN 230V Piekarnik | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `induction-hob` | GN 230V Płyta indukcyjna | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `electric-stove-3p` | Kuchenka Elektryczna | `cable-outlet-3f` | B16A 3P 6kA | 3 | YDYp 5x2,5mm² |
| `boiler` | GN 230V Bojler | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `convector` | GN 230V Konwektor | `socket-1f` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `doorbell` | Dzwonek | `lighting-1f` | B10A 1P 6kA | 1 | YDYp 3x1,5mm² |
| `reserve` | REZERWA | `reserve` | B16A 1P 6kA | 1 | YDYp 3x2,5mm² |
| `socket-400v` | GN 400V | `socket-3f` | B32A 3P 6kA | 3 | YDY 5x2,5mm² |

### B.2 Rozbicie MCB na pola modelu

| Preset MCB string | `breakerType` | `ratedCurrentA` | `poles` | `breakingCapacityKa` |
|-------------------|---------------|-----------------|---------|----------------------|
| B10A 1P 6kA | B | 10 | 1 | 6 |
| B16A 1P 6kA | B | 16 | 1 | 6 |
| B16A 3P 6kA | B | 16 | 3 | 6 |
| B32A 3P 6kA | B | 32 | 3 | 6 |

### B.3 Symbol końcowy obwodu (render SVG)

| `loadKind` | Symbol |
|------------|--------|
| `socket-1f` | gniazdo 230V (łuk) |
| `socket-3f` | gniazdo 400V (łuk + 3F) |
| `lighting-1f` | lampa (okrąg z krzyżem) |
| `cable-outlet-3f` | wypust kablowy (linia + etykieta) |
| `reserve` | wypust / pusty punkt + etykieta REZERWA |
| `other` | wypust generyczny |

### B.4 Mapowanie `ElectricalMeasurement.circuits[].type` → preset

| EM `CircuitType` | Domyślny `presetId` |
|------------------|----------------------|
| `socket-1f` | `socket-230v` |
| `lighting-1f` | `lighting` |
| `socket-3f` | `electric-stove-3p` lub `socket-400v` (heurystyka: jeśli `displayName` zawiera „kuchenk” → `electric-stove-3p`) |

---

## C. Szablony startowe

Szablony startowe ≠ presety obwodów. Szablon = **pełny nowy `SingleLineDiagram`** z domyślną topologią.

### C.1 `template-apartment-3f-default`

| Pole | Wartość |
|------|---------|
| `layoutProfile` | `apartment-3f-v1` |
| `supply.phase` | `3f` |
| `supply.busLabel` | `L1, L2, L3, N, PE` |
| `supply.mainCableLabel` | `YDYp 5x6mm²` |
| `mainSwitch` | `{ label: "FR 100A", ratedCurrentA: 100 }` |
| `meter` | `{ phases: 3, label: "KWh" }` |
| `mainBreaker` | `{ breakerType: "C", ratedCurrentA: 25, poles: 3, breakingCapacityKa: 6 }` |
| `mainRcd` | `{ ratedCurrentA: 25, sensitivityMa: 30, poles: 4, rcdType: "AC" }` |
| `status` | `draft` |
| `linkStatus` | `manual` |

**Obwody startowe (6):**

| sortOrder | presetId |
|-----------|----------|
| 1 | `electric-stove-3p` |
| 2 | `socket-230v` → name: `GN 230V Salon` |
| 3 | `socket-230v` → name: `GN 230V Pokój 1` |
| 4 | `socket-230v` → name: `GN 230V Pokój 2` |
| 5 | `socket-230v` → name: `GN 230V Kuchnia` |
| 6 | `lighting` |

### C.2 `template-apartment-1f-default`

| Pole | Wartość |
|------|---------|
| `layoutProfile` | `apartment-1f-v1` |
| `supply.phase` | `1f` |
| `supply.busLabel` | `L, N, PE` |
| `supply.mainCableLabel` | `YDYp 3x4mm²` |
| `mainSwitch` | *(brak)* |
| `meter` | `{ phases: 1, label: "KWh" }` |
| `mainBreaker` | `{ breakerType: "C", ratedCurrentA: 25, poles: 1, breakingCapacityKa: 6 }` |
| `mainRcd` | `{ ratedCurrentA: 25, sensitivityMa: 30, poles: 2, rcdType: "AC" }` |
| `status` | `draft` |
| `linkStatus` | `manual` |

**Obwody startowe (4):**

| sortOrder | presetId | name override |
|-----------|----------|---------------|
| 1 | `socket-230v` | GN 230V Salon |
| 2 | `socket-230v` | GN 230V Kuchnia |
| 3 | `lighting` | OŚWIETLENIE |
| 4 | `lighting` | OŚWIETLENIE |

### C.3 `template-commercial-3f-default`

| Pole | Wartość |
|------|---------|
| `layoutProfile` | `commercial-3f-v1` |
| `supply.phase` | `3f` |
| `supply.busLabel` | `L1, L2, L3, N, PE` |
| `supply.mainCableLabel` | `YDYp 5x6mm²` |
| `mainSwitch` | *(brak)* |
| `meter` | `{ phases: 3, label: "KWh" }` |
| `mainBreaker` | `{ breakerType: "C", ratedCurrentA: 25, poles: 3, breakingCapacityKa: 6 }` |
| `mainRcd` | `{ ratedCurrentA: 63, sensitivityMa: 30, poles: 4, rcdType: "AC" }` |
| `status` | `draft` |
| `linkStatus` | `manual` |

**Obwody startowe (5):**

| sortOrder | presetId | name override |
|-----------|----------|---------------|
| 1 | `socket-400v` | GN 400V |
| 2 | `socket-400v` | GN 400V |
| 3 | `socket-230v` | GN 230V |
| 4 | `socket-230v` | GN 230V |
| 5 | `lighting` | OŚWIETLENIE |

---

## D. Reguły statusów `draft` / `final`

### D.1 Domyślne zachowanie

| Zdarzenie | `status` |
|-----------|----------|
| Nowy schemat (ręczny / szablon / import) | `draft` |
| Duplikacja | `draft` |
| Użytkownik klika „Oznacz jako finalny” | `final` (po walidacji § D.3) |
| Użytkownik klika „Oznacz jako wersję roboczą” | `draft` |
| Edycja schematu `final` | **status pozostaje `final`** (brak auto-degrade) |

### D.2 Eksport PDF

| `status` | PDF dozwolony | Watermark |
|----------|---------------|-----------|
| `draft` | ✅ TAK | **TAK** — diagonalnie: `WERSJA ROBOCZA` (szary, 30% opacity) |
| `final` | ✅ TAK | **NIE** |

**Confirm dialog przy PDF draft (opcjonalny, zalecany):**  
„Schemat ma status roboczy. PDF będzie zawierał znak wodny WERSJA ROBOCZA.” → [Anuluj] [Pobierz PDF]

### D.3 Walidacja przed `final`

Wszystkie pola z § A.4 + brak pustych `circuits[].name` / `cableLabel`.  
Komunikat przy błędzie: lista brakujących pól.

### D.4 Przyszły ZIP odbiorowy (V1.1 — poza MVP, reguła zamrożona)

| Reguła | Wartość |
|--------|---------|
| Folder | `Schematy/` (obok `Odbiory/`, `Pomiary/`) |
| Checkbox w Odbiory | domyślnie **OFF** |
| Które schematy | `jobId` match + `status === "final"` |
| Draft w ZIP | **NIE** — pomijane z komunikatem w UI |

### D.5 UI lista

- Badge: **Roboczy** / **Finalny**
- Filtr: wszystkie | robocze | finalne

---

## E. Reguły duplikacji

### E.1 Trigger

Akcja **Duplikuj schemat** z listy lub edytora.

### E.2 Co kopiujemy (deep copy)

| Pole | Kopiowane |
|------|-----------|
| `title` | ✅ |
| `layoutProfile` | ✅ |
| `supply` | ✅ |
| `mainSwitch` | ✅ |
| `meter` | ✅ |
| `mainBreaker` | ✅ |
| `mainRcd` | ✅ |
| `circuits[]` (wszystkie pola) | ✅ (nowe `id` per obwód) |
| `notes` | ✅ |
| `presetId` per obwód | ✅ |

### E.3 Co resetujemy

| Pole | Wartość po duplikacji |
|------|----------------------|
| `id` | nowy UUID |
| `address` | **pusty** — wymaga uzupełnienia (lub z picker roboty) |
| `documentDate` | dzisiejsza data |
| `status` | `draft` |
| `linkStatus` | `manual` |
| `sourceMeasurementId` | **usunięte** |
| `sourceMeasurementRef` | opcjonalnie: `"Kopia z: RAP-XX"` jeśli źródło było linked/detached |
| `jobId` | **usunięte** (użytkownik wybiera robotę opcjonalnie) |
| `renderedSvg` | **usunięte** — regeneracja przy zapisie |
| `renderVersion` | **usunięte** |
| `createdAt` / `updatedAt` | nowe |

### E.4 Flow „Duplikuj dla nowej roboty”

1. Duplikuj → modal: **Wybierz robotę** (opcjonalnie Pomiń).
2. Jeśli robota wybrana: `jobId` ustawione, `address` = `jobDisplayTitle(job)`.
3. Jeśli pominięto: `address` puste, walidacja przy `final` / PDF.

### E.5 `sourceMeasurementId` — podsumowanie

| Akcja | `sourceMeasurementId` | `linkStatus` |
|-------|----------------------|--------------|
| Import z RAP | ustawione | `linked` |
| Odłącz od pomiaru | usunięte | `detached` (`sourceMeasurementRef` zachowany) |
| Duplikuj | usunięte | `manual` |
| Odśwież z pomiaru (V1.1 confirm) | przywrócone | `linked` |

**Brak auto-sync** — zmiana pomiaru nie aktualizuje schematu.

---

## F. Visual Acceptance Gate

### F.1 Referencja

**Schemat:** Benedyktyńska 22/13 (załącznik referencyjny W&G DOM)  
**Profil:** `apartment-3f-v1`  
**Dane testowe:** szablon § C.1 z adressem `WROCŁAW, UL. BENEDYKTYŃSKA 22/13` i 7 obwodami (jak oryginał)

**Pliki PNG w repo (wymagane przed Fazą 2):** [`docs/wm-schematy-v1/visual-references/`](wm-schematy-v1/visual-references/README.md)

| Adres | Plik | Rola |
|-------|------|------|
| Benedyktyńska 22/13 | `benedyktynska-22-13.png` | PRIMARY Visual Gate |
| Żytnia 18/21 | `zytnia-18-21.png` | Regresja layout |
| Pereca 24a/29 | `pereca-24a-29.png` | Regresja gęstości / edge case |

### F.2 Elementy obowiązkowe (MUSI być na wygenerowanym PDF/SVG)

| # | Element | Kryterium |
|---|---------|-----------|
| 1 | Nagłówek | Tekst tytułu + adres |
| 2 | Szyna górna | Etykieta `L1, L2, L3, N, PE` |
| 3 | FR (jeśli w modelu) | Etykieta z `mainSwitch.label` |
| 4 | Licznik | Prostokąt `3F` + `KWh` |
| 5 | Przewód główny | Pionowa etykieta `mainCableLabel` |
| 6 | Wyłącznik główny | Etykieta `C25A 3P 6kA` (lub z modelu) |
| 7 | RCD | Symbol + `25A 30mA 4P AC` (lub z modelu) |
| 8 | Szyna pozioma | Linia z kropkami (1 kropka = 1 obwód) |
| 9 | Kolumny obwodów | N kolumn = N obwodów |
| 10 | Per obwód | pionowy przewód + MCB + symbol końcowy + nazwa pozioma |
| 11 | Kuchenka 3P | Pierwszy obwód: B16A **3P**, przewód 5×2,5 |
| 12 | Gniazda | B16A 1P, przewód 3×2,5 |
| 13 | Oświetlenie | B10A 1P, przewód 3×1,5 |

### F.3 Tolerancje (nie piksel-perfect)

| Aspekt | Tolerancja |
|--------|------------|
| Pozycje symboli | ±15% względem referencji |
| Font / rozmiar tekstu | inny font OK, jeśli czytelny przy druku A4 landscape |
| Proporcje symboli IEC | uproszczone dozwolone — nie wymagamy identycznych łuków |
| Kolejność sekcji | **MUSI** być zgodna: zasilanie → FR? → licznik → C25A → RCD → szyna → obwody |
| Kolejność obwodów | zgodna z `sortOrder` |
| Kolory | monochromatyczny czarny OK |
| Liczba obwodów gate | 7 (jak referencja) |

### F.4 Kryteria PASS / FAIL

**PASS** gdy:

- [ ] Wszystkie elementy § F.2 obecne
- [ ] Kolejność sekcji zgodna § F.3
- [ ] 7 obwodów w poprawnej kolejności
- [ ] Etykiety przewodów pionowe przy gałęziach
- [ ] Nazwy obwodów poziome pod symbolami
- [ ] PDF A4 landscape otwiera się bez błędów
- [ ] Adres w nagłówku = model.address
- [ ] Manual review: „akceptowalny do użytku WM” (Dawid / operator)

**FAIL** gdy:

- Brak RCD lub szyny poziomej
- Obwody w złej kolejności lub nałożone (nieczytelne)
- Brak etykiet MCB / przewodu na dowolnym obwodzie
- PDF ucięty / obwody poza stroną
- Nagłówek bez adresu

---

## G. Decyzja MVP — `feedFrom` / `position`

### Werdykt: **V1.1** (poza MVP)

| Pole | MVP | Uzasadnienie |
|------|-----|--------------|
| `feedFrom` | ❌ V1.1 | Edge case Brodatego (~15%); domyślnie wszystkie obwody z `rcd-bus` |
| `position` | ❌ V1.1 | Edge case Pereca (kuchenka przed RCD); domyślnie `after-rcd` |

**W MVP:**

- Pola **nie występują** w UI ani w normalizacji `schemaVersion: 1`.
- Renderer `apartment-3f-v1` zakłada: wszystkie obwody **po** RCD, z szyny RCD.
- W V1.1: dodać pola + obsługę w layout bez zmiany `schemaVersion` (opcjonalne pola).

---

## H. Scope Lock

### H.1 MVP (epic WM-SCHEMATY-V1)

| ID | Zakres | Priorytet |
|----|--------|-----------|
| M1 | Domena `electrical-schematics/` — types, normalize, merge, sync, report | P0 |
| M2 | Presety § B + `applyPreset` | P0 |
| M3 | Szablony startowe § C | P0 |
| M4 | Layout + render SVG: **`apartment-3f-v1`** | P0 |
| M5 | Layout + render SVG: **`apartment-1f-v1`** | P0 |
| M6 | Export PDF (raster PNG @2×, pdf-lib, A4 landscape) | P0 |
| M7 | Watermark draft § D | P0 |
| M8 | UI: zakładka Schematy — lista, search, filtry status | P0 |
| M9 | UI: tworzenie ręczne + z pomiaru | P0 |
| M10 | UI: edytor formularz + SVG preview | P0 |
| M11 | Duplikacja § E | P0 |
| M12 | Powiązanie / odłączenie od pomiaru § A.6 | P0 |
| M13 | KV `kw-electrical-schematics` + cloud-sync | P0 |
| M14 | Visual gate Benedyktyńska § F | P0 |
| M15 | Smoke tests: render snapshot, PDF, import map | P0 |

### H.2 Opcjonalnie w MVP (P1 — nie blokuje release)

| ID | Zakres |
|----|--------|
| O1 | Layout **`commercial-3f-v1`** (Warsztat uproszczony) |
| O2 | Link „Utwórz schemat” z WM Druk → Pomiary |
| O3 | Skrót w Robotach |

### H.3 V1.1 (osobny epic po MVP)

| ID | Zakres |
|----|--------|
| V1.1-1 | `feedFrom` / `position` |
| V1.1-2 | Folder `Schematy/` w ZIP odbiorowym |
| V1.1-3 | WM Historia wpis po eksporcie PDF |
| V1.1-4 | PDF wektorowy (svg2pdf) |
| V1.1-5 | „Odśwież z pomiaru” z confirm |

### H.4 V2 (osobny epic)

| Profil | Opis |
|--------|------|
| `distribution-r1-v1` | Rozdzielnica piętrowa R1 — STV, OP, L.KONTR. |
| `distribution-r6-v1` | Rozdzielnica główna R6 — multi-tier, feeders |
| `schemaVersion: 2` | `protectionKind: mcb \| fuse`, `rcdGroups[]`, `feeders[]` |

### H.5 Poza zakresem (cały projekt)

- Edytor CAD / drag symboli
- Auto-sync schemat ↔ pomiar
- Import DWG / PDF scan
- Obliczenia elektryczne

---

## I. Architektura implementacji (skrót — zamrożony)

```text
src/lib/electrical-schematics/
  types.ts
  normalize.ts
  merge.ts
  sync.ts
  report.ts                    # CRUD, duplicate, detach
  import-from-measurement.ts
  circuit-presets.ts           # § B
  start-templates.ts           # § C
  layout/
    apartment-1f-v1.ts
    apartment-3f-v1.ts
    commercial-3f-v1.ts        # P1
  symbols/iec-simplified.ts
  render-svg.ts
  export-pdf.ts

src/app/
  WmPrintSchematicsPanel.tsx
  WmPrintSchematicEditor.tsx

WmPrintView.tsx               # tab "schematy"
wm-print-tabs.ts              # + "schematy"
cloud-sync.ts                 # + kw-electrical-schematics
```

**PDF MVP:** SVG → canvas PNG @2× DPI → embed w PDF (pdf-lib) · A4 landscape · nagłówek/stopka tekstowe.

---

## J. Konwencja nazw pliku PDF

```text
SCHEMAT_{ADRES_SLUG}_{YYYY-MM-DD}.pdf
```

Przykład: `SCHEMAT_Benedyktynska_22_13_2026-06-24.pdf`  
Slug: jak `measurement-docx-names` — bez polskich znaków, spacje → `_`.

---

# DESIGN FREEZE STATUS

## **GO**

Wszystkie punkty wymagane przed implementacją (review GO WITH CHANGES) zostały zamknięte w tym dokumencie.

---

## Kompletna lista elementów gotowych do rozpoczęcia implementacji

### Specyfikacja (zamrożona)

- [x] Model `SingleLineDiagram` + `SchematicCircuit` (§ A)
- [x] Typy wyliczeniowe i `schemaVersion: 1` (§ A.2)
- [x] Pola wymagane do eksportu PDF (§ A.4)
- [x] Mapowanie importu z `ElectricalMeasurement` (§ A.6)
- [x] Biblioteka 12 presetów + kontrakt `applyPreset` (§ B)
- [x] Mapowanie symboli SVG per `loadKind` (§ B.3)
- [x] 3 szablony startowe (§ C)
- [x] Reguły `draft` / `final` + watermark + ZIP V1.1 (§ D)
- [x] Reguły duplikacji (§ E)
- [x] Visual Acceptance Gate Benedyktyńska 22/13 (§ F)
- [x] Decyzja `feedFrom` / `position` → V1.1 (§ G)
- [x] Scope lock MVP / P1 / V1.1 / V2 (§ H)
- [x] Struktura plików domeny (§ I)
- [x] Konwencja nazw PDF (§ J)

### Decyzje architektoniczne (zamrożone)

- [x] Osobna domena `electrical-schematics/` (nie WM print, nie EM)
- [x] KV `kw-electrical-schematics`
- [x] Jedno `mainRcd` w MVP (nie tablica)
- [x] `layoutProfile` precyzyjny (`apartment-3f-v1`, nie ogólny `apartment-v1`)
- [x] PDF MVP = raster PNG @2× via pdf-lib
- [x] Brak auto-sync z pomiarem
- [x] R1/R6 wyłączone z MVP i V1.1

### Artefakty do utworzenia na początku implementacji (nie blokują GO)

- [x] `docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md` (skrót operacyjny)
- [x] `docs/wm-schematy-v1/visual-references/` — PNG referencyjne (Benedyktyńska, Żytnia, Pereca)
- [ ] `docs/ARCHITECTURE.md` § 12.1.12 (wpis po pierwszym merge kodu)
- [ ] `scripts/test-schematic-render-apartment-3f.mjs`
- [ ] `scripts/test-schematic-pdf-smoke.mjs`
- [ ] `scripts/test-schematic-import-from-measurement.mjs`

### Kolejność epica (zatwierdzona)

```text
Faza 1 — domena (types, presets, templates, import, merge, sync)
Faza 2 — render (apartment-3f-v1, apartment-1f-v1, export-pdf)
Faza 3 — UI (lista, edytor, zakładka WM Druk)
Faza 4 — QA (visual gate § F, smoke tests, release)
```

---

**Podpis freeze:** WM-SCHEMATY-V1 · DESIGN FREEZE **GO** · 2026-06-24  
**Następny krok:** otwarcie epica implementacyjnego w backlogu WGDOM (Faza 1).
