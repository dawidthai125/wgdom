# EM-P1R — Plan templatyzacji (SOURCE OF TRUTH)

**Data:** 2026-06-16  
**Tryb:** READ ONLY — bez implementacji, commitów, push  
**SSOT:** wyłącznie 5 plików z `Desktop\Dokumenty\Pomiary Elektryczne\`  
**Forensyka XML:** `scripts/audit-em-p1r-source-docx-readonly.mjs` → `audit/_tmp-em-p1r-source-ssot.json`  
**Powiązane:** [`EM-P1R-DOCX-FORENSICS.md`](EM-P1R-DOCX-FORENSICS.md)

---

## 1. Zasady nienaruszalne

| # | Zasada |
|---|--------|
| Z1 | **Jedyny wzorzec** = załączone DOCX z Desktop (RAP-43-2026, Sępa Szarzyńskiego 83/7) |
| Z2 | **Nie** tworzyć `template.docx` programowo (`build-em-docx-templates.mjs` → **RETIRE**) |
| Z3 | **Nie** generować tabel od zera · **nie** upraszczać układu |
| Z4 | Edycja **w Word** na kopii oryginału → zapis jako `public/em-measurements/*.template.docx` |
| Z5 | Zmiany ograniczone do: **placeholdery skalarne** + **1 wiersz wzorcowy** (dynamiczny) per tabela danych |
| Z6 | **Legendy, nagłówki kolumn, scalenia, `tblGrid`, marginesy, orientacja** — **bez zmian** |
| Z7 | Po wydruku różnica względem oryginału = **wyłącznie podstawione dane** |

**Silnik WGDOM (bez zmian w tym planie):** `em-docx-xml.ts` — skalary + `expandEmDocxTemplateRows` · payload: `em-docx-payload.ts`.

---

## 2. Mapa plików SSOT → repo

| # | Plik SSOT (Desktop) | Docelowy szablon repo | Orientacja | Rozmiar |
|---|---------------------|------------------------|------------|---------|
| 1 | `PROTOKÓŁ Z POMIARTÓW OCHRONNYCH STR1.docx` | `protokol.template.docx` | **Portrait** 11906×16838 | 11,9 KB |
| 2 | `DANE INFORMACYJNE.docx` | `dane-informacyjne.template.docx` | Portrait | 12,1 KB |
| 3 | `Badanie chrony przed porażeniem przez samoczynne wyłączenie1.docx` | `badanie-adsc.template.docx` | **Landscape** 16838×11906 | 15,3 KB |
| 4 | `Badanie rezystancji obwodów.docx` | `badanie-rezystancji.template.docx` | Landscape | 14,5 KB |
| 5 | `parametry zabezpieczen  roznicowo-pradowych.docx` | `parametry-rcd.template.docx` | Landscape | 13,1 KB |

**Procedura zapisu:** `Kopia Desktop → edycja Word → Zapisz jako` do repo (nie Save przez generator).

---

## 3. Konwencja placeholderów

Format: `{{SCREAMING_SNAKE}}` — zgodny z `em-docx-payload.ts`.

**Reguły Word:**

1. Placeholder wpisać **w jednym miejscu tekstowym** (preferuj całą komórkę / cały fragment daty).
2. Unikać rozdzielenia `{{RAP` i `_NO}}` między osobne `<w:r>` — jeśli Word rozdzieli, engine ma merge split-run, ale **lepiej wkleić placeholder jako jeden run**.
3. **Nie** zmieniać czcionek, ramek, `gridSpan`, `vMerge`, `tcW`.
4. Wiersze przykładowe **2…N** w tabelach danych: **usunąć ręcznie**, zostawić **1 wiersz wzorcowy** (+ wiersz Zasilanie tam gdzie wymagany).

---

## 4. Dokument 1 — PROTOKÓŁ Z POMIARÓW OCHRONNYCH

### 4.1 Struktura SSOT

| Element | Opis |
|---------|------|
| Akapity (poza tabelą) | Tytuł, metadane, daty, adres — **główna treść formularza** |
| Tabela T1 | 1 kolumna × 9212 dxa · **3 wiersze** (podsumowanie badań + orzeczenie) |
| Dynamiczne wiersze | **brak** |

**Uwaga forensyki:** część tekstu w akapitach **duplikuje** tabelę (Word layout historyczny). Przy templatyzacji **edytować oba miejsca identycznie** albo — po weryfikacji w Word — zostawić wersję kanoniczną zgodną z drukiem (zalecane: **zachować tabelę T1 + akapity jak w SSOT**).

### 4.2 Placeholdery — akapity

| Lokalizacja (tekst SSOT) | Zamienić na | Payload |
|--------------------------|-------------|---------|
| `Nr. RAP-43-2026` | `Nr. {{RAP_NO}}` | `scalars.RAP_NO` |
| `instalacja istniejąca` (przyczyna) | `{{MEASUREMENT_CAUSE}}` | `scalars.MEASUREMENT_CAUSE` |
| `05.06.2026 r.` (data protokołu) | `{{PROTOCOL_DATE}}` | `scalars.PROTOCOL_DATE` |
| `05.06.2026r.` (data pomiarów) | `{{MEASUREMENT_DATE}}` | `scalars.MEASUREMENT_DATE` |
| `Wrocław ul. Sępa Sarzyńskiego 83/7` | `{{ADDRESS}}` | `scalars.ADDRESS` |
| `05.06.2031r.` (kolejny pomiar) | `{{NEXT_MEASUREMENT_DATE}}` | `scalars.NEXT_MEASUREMENT_DATE` |
| `INSTALACJA SPEŁNIA WYMAGANE NORMY…` | `{{VERDICT_TEXT}}` | `scalars.VERDICT_TEXT` |

**Statyczne (bez placeholder):** tytuł `PROTOKÓŁ Z POMIARÓW OCHRONNYCH`, etykiety badań (Rezystancja / ADSC / RCD).

### 4.3 Placeholdery — tabela T1

| Wiersz | Komórka | Placeholder |
|--------|---------|-------------|
| R1 | tekst „POMIAR DATA KOLEJNEGO POMIARU …” | `POMIAR DATA KOLEJNEGO POMIARU {{NEXT_MEASUREMENT_DATE}}` |
| R3 | orzeczenie | `ORZECZENIE{{VERDICT_TEXT}}` (zachować sklejenie jak w oryginale) |

R2 — lista badań: **statyczna** (bez zmian treści etykiet).

### 4.4 Engine

Tylko **skalary** — brak `rowSpecs`.

---

## 5. Dokument 2 — DANE INFORMACYJNE

### 5.1 Struktura SSOT

| Element | Opis |
|---------|------|
| Akapity nagłówkowe | Tytuł, RAP, data, pomiarowiec+licencja, adres |
| Tabela T1 | **9 wierszy** · `gridCol`: 533 + 7412 + 1343 dxa |
| R1 | tytuł sekcji · **gridSpan=3** |
| R2 | nagłówek kolumn: Lp. \| PRZEDMIOT \| OCENA |
| R3–R9 | **7 pozycji normatywnych** — stały tekst + kolumna OCENA |

### 5.2 Placeholdery — akapity (nagłówek)

| Tekst SSOT | Placeholder |
|------------|-------------|
| `Nr. RAP-43-2026` | `Nr. {{RAP_NO}}` |
| `Data pomiaru 05.06.2026r.` | `Data pomiaru {{MEASUREMENT_DATE}}` |
| `Pomiarowiec: Dawid Thai Thanh…` | `Pomiarowiec: {{TECHNICIAN}} {{TECHNICIAN_LICENSE}}` |
| `Miejsce pomiaru: Wrocław, ul. Sępa…` | `Miejsce pomiaru: {{ADDRESS}}` |

### 5.3 Placeholdery — tabela T1 (tylko kolumna OCENA)

| Wiersz | Lp | PRZEDMIOT (statyczny) | OCENA → placeholder |
|--------|-----|----------------------|---------------------|
| R3 | 1 | SPOSÓB OCHRONY… | `{{INSPECTION_1}}` |
| R4 | 2 | DOBÓR URZĄDZEŃ… | `{{INSPECTION_2}}` |
| R5 | 3 | OZNACZENIE PRZEWODÓW… | `{{INSPECTION_3}}` |
| R6 | 4 | OZNACZENIE OBWODÓW… | `{{INSPECTION_4}}` |
| R7 | 5 | POŁĄCZENIE PRZEWODÓW | `{{INSPECTION_5}}` |
| R8 | 6 | STAN URZĄDZEŃ… | `{{INSPECTION_6}}` |
| R9 | 7 | DOSTĘP DO URZĄDZEŃ… | `{{INSPECTION_7}}` |

**Nie zmieniać:** R1 tytuł, R2 nagłówek, kolumny Lp. i PRZEDMIOT.

### 5.4 Engine

Tylko **skalary** — brak klonowania wierszy.

---

## 6. Dokument 3 — BADANIE ADSC (TN-S)

### 6.1 Struktura SSOT (4 tabele)

| Tabela | Wiersze | Kolumny (`gridCol` dxa) | Rola |
|--------|---------|-------------------------|------|
| **T1** Nagłówek operacyjny | 3 | 5070 + 3685 + 5389 | skalary w komórkach |
| **T2** Tytuł sekcji | 1 | 14144 | `{{EARTHING_SYSTEM}}` w tekście |
| **T3** Dane pomiarowe | 10 (1 hdr + 9 danych) | 10 × ~1414–1724 | **dynamiczne** |
| **T4** Legenda | 10 | 2 (1951 + reszta) | **STATYCZNA — zero zmian** |

### 6.2 Placeholdery — T1 (identyczny układ ADSC / Rezystancja; RCD ma wariant bez Wykonawcy)

| Komórka | SSOT | Placeholder |
|---------|------|-------------|
| R1 C1 | `NR. RAP-43-2026` | `NR. {{RAP_NO}}` |
| R1 C2 | `Wykonawca: W&G DOM` | `Wykonawca: {{EXECUTOR}}` |
| R1 C3 | `Data pomiaru 05.06.2026r.` | `Data pomiaru {{MEASUREMENT_DATE}}` |
| R2 C1 | `Pomiarowcy: Dawid…` | `Pomiarowcy: {{TECHNICIAN}}` |
| R2 C2–C3 | puste | **zostawić puste** |
| R3 C1 | `Miejsce pomiaru: …` | `Miejsce pomiaru: {{ADDRESS}}` |
| R3 C3 | `Pomiar wykonano miernikiem: Sonel MPI 520 nr 722453` | `Pomiar wykonano miernikiem: {{METER_MODEL}} nr {{METER_SERIAL}}` |

### 6.3 Placeholder — T2

| SSOT | Szablon |
|------|---------|
| `(TN-S) Badanie ochrony przed porażeniem przez samoczynne wyłączenie` | `({{EARTHING_SYSTEM}}) Badanie ochrony przed porażeniem przez samoczynne wyłączenie` |

### 6.4 T3 — wiersze dynamiczne

**Forensyka:** wiersz R2 (Zasilanie) i R3 (Obwód) mają **identyczną strukturę 10 komórek** — ten sam `tcW` per kolumna.

| Wiersz szablonu | Rola | Marker engine | Akcja w Word |
|-----------------|------|---------------|--------------|
| **R2** | Zasilanie | `{{ROW_SUPPLY_*}}` | substituteInPlace |
| **R3** | Obwód (wzorcowy) | `{{ROW_*}}` | clone × N obwodów |
| R4–R10 | Przykłady | — | **USUNĄĆ** |

**Placeholdery wiersza R2 (Zasilanie):**

| Kolumna | Placeholder |
|---------|-------------|
| Lp. | `{{ROW_SUPPLY_LP}}` |
| Symbol | `{{ROW_SUPPLY_SYMBOL}}` |
| Badany punkt | `{{ROW_SUPPLY_POINT}}` |
| Wyłącznik | `{{ROW_SUPPLY_BREAKER}}` |
| typ | `{{ROW_SUPPLY_BREAKER_TYPE}}` |
| I [A] | `{{ROW_SUPPLY_IN}}` |
| Ia[A] | `{{ROW_SUPPLY_IA}}` |
| Zs[Ω] | `{{ROW_SUPPLY_ZS}}` |
| Za[Ω] | `{{ROW_SUPPLY_ZA}}` |
| Ocena | `{{ROW_SUPPLY_ASSESSMENT}}` |

**Placeholdery wiersza R3 (obwód — wzorzec klonu):**

| Kolumna | Placeholder |
|---------|-------------|
| Lp. | `{{ROW_LP}}` |
| Symbol | `{{ROW_SYMBOL}}` |
| Badany punkt | `{{ROW_POINT}}` |
| Wyłącznik | `{{ROW_BREAKER}}` |
| typ | `{{ROW_BREAKER_TYPE}}` |
| I [A] | `{{ROW_IN}}` |
| Ia[A] | `{{ROW_IA}}` |
| Zs[Ω] | `{{ROW_ZS}}` |
| Za[Ω] | `{{ROW_ZA}}` |
| Ocena | `{{ROW_ASSESSMENT}}` |

### 6.5 T4 Legenda

**Brak edycji.** 10 wierszy × 2 kolumny — kopiować 1:1 z SSOT.

### 6.6 Engine (istniejący)

```text
rowSpecs = [
  { marker: "ROW_SUPPLY_LP", rows: [adscSupply], substituteInPlace: true },
  { marker: "ROW_LP", rows: adscCircuits },
]
```

---

## 7. Dokument 4 — BADANIE REZYSTANCJI

### 7.1 Struktura SSOT (3 tabele)

| Tabela | Wiersze | Kolumny | Uwagi |
|--------|---------|---------|-------|
| **T1** Nagłówek | 3 | 3 | jak ADSC |
| **T2** Tytuł | 1 | 1 | statyczny tekst |
| **T3** Macierz | 9 (1 hdr + 8 danych) | **16** · `tblLayout=fixed` · `tblW=13008` | **krytyczna** |

**Nagłówek T3 (R1):** wieloliniowe etykiety kolumn (L1-L2, [MΩ] itd.) — **nie dotykać**.

### 7.2 T1 — placeholdery

Identyczne jak ADSC §6.2 (pełny nagłówek z Wykonawcą).

### 7.3 T2 — statyczny

`BADANIE REZYSTANCJI OBWODÓW` — bez zmian.

### 7.4 T3 — wiersze dynamiczne

| Wiersz | Przykład SSOT | Marker | Akcja |
|--------|---------------|--------|-------|
| R1 | nagłówek 16 kol. | — | **statyczny** |
| R2 | `Obwód YDY 3x4mm2` | `{{ROW_SUPPLY_*}}` | substituteInPlace |
| R3 | `Obwód Gniazd YDY 3x2,5mm2` | `{{ROW_*}}` | **wzorzec klonu** |
| R4–R9 | kopie obwodów | — | **USUNĄĆ** |

**Placeholdery wiersza R2 (Zasilanie / YDY):**

| Kolumna | Placeholder |
|---------|-------------|
| Lp. | `{{ROW_SUPPLY_LP}}` |
| BADANY OBWÓD(PUNKT) | `{{ROW_SUPPLY_CIRCUIT_NAME}}` |
| L1-L2 … N-PE | `{{ROW_SUPPLY_L1L2}}` … `{{ROW_SUPPLY_NPE}}` |
| Ra [MΩ] | `{{ROW_SUPPLY_RA}}` |
| U iso [V] | `{{ROW_SUPPLY_U_ISO}}` |
| OCENA | `{{ROW_SUPPLY_ASSESSMENT}}` |

**Placeholdery wiersza R3 (obwód — klon):**

| Kolumna | Placeholder |
|---------|-------------|
| Lp. | `{{ROW_LP}}` |
| BADANY OBWÓD(PUNKT) | `{{ROW_CIRCUIT_NAME}}` |
| L1-L2 … N-PE | `{{ROW_L1L2}}` … `{{ROW_NPE}}` |
| Ra [MΩ] | `{{ROW_RA}}` |
| U iso [V] | `{{ROW_U_ISO}}` |
| OCENA | `{{ROW_ASSESSMENT}}` |

*(Pełna lista 12 pól MΩ — zgodna z `resistanceToRow()` w `em-docx-payload.ts`.)*

### 7.5 Engine (istniejący)

```text
rowSpecs = [
  { marker: "ROW_SUPPLY_LP", rows: [resistanceSupply], substituteInPlace: true },
  { marker: "ROW_LP", rows: resistanceCircuits },
]
```

**Ryzyko:** najwyższe — 16 kolumn fixed layout. Klon **musi** zachować pełny XML wiersza R3 (wszystkie `tcPr`, puste komórki).

---

## 8. Dokument 5 — PARAMETRY RCD

### 8.1 Struktura SSOT (4 tabele)

| Tabela | Wiersze | Kolumny | Uwagi |
|--------|---------|---------|-------|
| **T1** Nagłówek | 3 | 3 | **R1 C2 pusta** (brak Wykonawcy — zachować!) |
| **T2** Tytuł | 1 | 1 | statyczny |
| **T3** Dane RCD | 2 (1 hdr + 1 dany) | **14** | dynamiczny |
| **T4** Legenda | 12 | 2 | **STATYCZNA** |

### 8.2 T1 — placeholdery (wariant RCD)

| Komórka | SSOT | Placeholder |
|---------|------|-------------|
| R1 C1 | `NR. RAP-43-2026` | `NR. {{RAP_NO}}` |
| R1 C2 | **pusta** | **pozostawić pustą** |
| R1 C3 | `Data pomiaru …` | `Data pomiaru {{MEASUREMENT_DATE}}` |
| R2 C1 | Pomiarowcy | `Pomiarowcy: {{TECHNICIAN}}` |
| R3 C1 | Miejsce | `Miejsce pomiaru: {{ADDRESS}}` |
| R3 C3 | Miernik | `Pomiar wykonano miernikiem: {{METER_MODEL}} nr {{METER_SERIAL}}` |

**Nie dodawać** `{{EXECUTOR}}` w R1 C2 — **łamałoby zgodność 1:1 z SSOT**.

### 8.3 T3 — wiersz dynamiczny

| Wiersz | Akcja |
|--------|-------|
| R1 | nagłówek 14 kol. — **statyczny** |
| R2 | **wzorzec klonu** `{{ROW_*}}` |
| (brak R3+) | — |

**Placeholdery R2:**

| Kolumna | Placeholder |
|---------|-------------|
| Lp. | `{{ROW_LP}}` |
| Symbol | `{{ROW_SYMBOL}}` |
| Nazwa obwodu | `{{ROW_CIRCUIT_NAME}}` |
| RCD | `{{ROW_RCD_TYPE}}` |
| TYP | `{{ROW_RCD_AC_TYPE}}` |
| SEL. | `{{ROW_SELECTIVE}}` |
| IAN [mA] | `{{ROW_IAN}}` |
| Ia[mA] | `{{ROW_IA}}` |
| tA[ms] | `{{ROW_TA}}` |
| TRCD[ms] | `{{ROW_TRCD}}` |
| Ud[V] | `{{ROW_UD}}` |
| Rs[Ω] | `{{ROW_RS}}` |
| Kontrola testu | `{{ROW_TEST}}` |
| Ocena | `{{ROW_ASSESSMENT}}` |

### 8.4 T4 Legenda

**Brak edycji** — 12 wierszy definicji.

### 8.5 Engine

```text
rowSpecs = [{ marker: "ROW_LP", rows: rcdRows }]
```

---

## 9. Wspólna mapa skalarów (payload SSOT)

| Placeholder | Źródło WGDOM | Używany w |
|-------------|--------------|-----------|
| `{{RAP_NO}}` | `measurement.reportNumber` | wszystkie 5 |
| `{{EXECUTOR}}` | stała W&G DOM | ADSC, Rezystancja (T1 C2) |
| `{{MEASUREMENT_DATE}}` | data PL `dd.mm.rrrrr.` | wszystkie |
| `{{PROTOCOL_DATE}}` | data ze spacją przed „r.” | Protokół |
| `{{NEXT_MEASUREMENT_DATE}}` | +5 lat | Protokół |
| `{{TECHNICIAN}}` | `measurement.technicianName` | wszystkie |
| `{{TECHNICIAN_LICENSE}}` | settings / domyślna | Dane info, opcjonalnie |
| `{{ADDRESS}}` | `jobDisplayTitle(job)` | wszystkie |
| `{{METER_MODEL}}` | `measurement.meterModel` | T1 C3 (pomiary) |
| `{{METER_SERIAL}}` | `measurement.meterSerialNumber` | j.w. |
| `{{EARTHING_SYSTEM}}` | domyślnie TN-S | ADSC T2 |
| `{{MEASUREMENT_CAUSE}}` | domyślnie „instalacja istniejąca” | Protokół |
| `{{VERDICT_TEXT}}` | domyślne orzeczenie | Protokół |
| `{{INSPECTION_1}}`…`{{INSPECTION_7}}` | oceny normatywne | Dane info |

**Brak nowych placeholderów** — plan używa kontraktu EM-P1.5.

---

## 10. Procedura templatyzacji (krok po kroku)

### Faza R0 — Przygotowanie

1. Skopiować 5 plików Desktop → folder roboczy `em-p1r-templates-work/`.
2. **Nie** modyfikować oryginałów Desktop (archiwum referencyjne).
3. Wyłączyć ścieżkę `node scripts/build-em-docx-templates.mjs` w CI/docs.

### Faza R1 — Edycja w Word (per plik)

| Krok | Akcja |
|------|-------|
| 1 | Otwórz kopię w Word |
| 2 | Zamień wartości przykładowe → placeholdery §4–§8 |
| 3 | W tabelach danych: usuń nadmiarowe wiersze przykładowe |
| 4 | **Nie** ruszaj legend (T4 ADSC/RCD) |
| 5 | Zapisz → `public/em-measurements/<nazwa>.template.docx` |
| 6 | Otwórz wygenerowany plik w Word — sprawdź layout (brak reflow) |

### Faza R2 — Walidacja (przed implementacją w prod)

| Test | Kryterium PASS |
|------|----------------|
| V1 | `validateEmDocxBytes` — bilans XML |
| V2 | Porównanie: `tableCount`, `gridCols[]`, `rowCount` szablonu = SSOT po usunięciu wierszy przykładowych |
| V3 | Rozmiar pliku szablonu ±10% vs SSOT |
| V4 | Generacja z danymi RAP-43 → **wizualne diff** w Word obok SSOT |
| V5 | Druk PDF — marginesy i łamanie identyczne |

### Faza R3 — Implementacja kodu (poza tym planem)

- Podmiana plików w `public/em-measurements/`
- Retire `build-em-docx-templates.mjs`
- Smoke rozszerzony o metryki layoutu
- **Bez zmian** payload / clone engine (o ile placeholdery w właściwych `<w:tr>`)

---

## 11. Różnice SSOT vs obecne `template.docx` (programowe)

| Aspekt | SSOT Desktop | Obecny EM-P1B |
|--------|--------------|---------------|
| Źródło | Oryginalny Word | XML string build |
| ADSC/RCD legendy | T4 obecna | **brak** |
| `gridCol` / `tcW` | zróżnicowane | uniform 1200 |
| Protokół | akapity + T1 scalona | 4 osobne wiersze tabeli |
| Dane info R1 | gridSpan=3 | 1 kolumna |
| RCD T1 R1 C2 | **pusta** | Wykonawca wypełniony |
| Orientacja | landscape/p portrait | mieszana utracona |
| Rozmiar | 11–15 KB | ~12,5 KB (sztuczny) |

---

## 12. Checklist placeholderów (szybka kontrola)

### Skalary — wszystkie dokumenty pomiarowe (T1)

- [ ] `{{RAP_NO}}`
- [ ] `{{MEASUREMENT_DATE}}`
- [ ] `{{TECHNICIAN}}`
- [ ] `{{ADDRESS}}`
- [ ] `{{METER_MODEL}}` + `{{METER_SERIAL}}`
- [ ] `{{EXECUTOR}}` — **tylko ADSC + Rezystancja**

### Dynamiczne wiersze

- [ ] ADSC: R2 `ROW_SUPPLY_*` + R3 `ROW_*` · usunięto R4–R10
- [ ] Rezystancja: R2 `ROW_SUPPLY_*` + R3 `ROW_*` · usunięto R4–R9
- [ ] RCD: R2 `ROW_*` · nagłówek R1 intact
- [ ] Legendy ADSC T4 + RCD T4 — **zero placeholderów**

### Protokół + Dane

- [ ] Protokół: 8 pól skalarnych §4.2–4.3
- [ ] Dane: nagłówek + `INSPECTION_1`…`7`

---

## 13. Werdykt planu

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy da się osiągnąć 1:1 bez przebudowy silnika? | **TAK** — przy templatyzacji **oryginałów Word** |
| Czy wystarczy patch row cloning? | **NIE** — problem leży w szablonach, nie w clone |
| Czy payload EM-P1.5 pasuje? | **TAK** — placeholdery już zdefiniowane |
| Następny krok | **EM-P1R IMPLEMENT** — edycja Word → podmiana 5 plików → smoke wizualny |

---

*EM-P1R READ ONLY · SSOT: Desktop 5× DOCX · analiza XML 2026-06-16*
