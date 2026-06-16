# EM-P1R — DOCX Generator Forensics

**Data:** 2026-06-16  
**Tryb:** READ ONLY — bez implementacji, commitów, push  
**Status:** P0  
**Baseline kodu:** v2.59.42 · EM-P1B generator (`generate-em-docx.ts`, `em-docx-xml.ts`)  
**Źródła porównania:**

| Warstwa | Lokalizacja |
|---------|-------------|
| Oryginały (RAP-43-2026) | Forensyka `audit/_tmp-wm-pomiary-001-forensic.json` · `audit/_tmp-wm-pomiary-001-tables.txt` (Desktop, 2026-06) |
| Szablony prod | `public/em-measurements/*.template.docx` (build: `scripts/build-em-docx-templates.mjs`) |
| Wygenerowane (smoke) | `audit/em-p1-smoke-out/*.docx` (skrypt `test-electrical-measurements-p1.mjs`) |
| Analiza XML | `scripts/audit-em-p1r-docx-forensics-readonly.mjs` → `audit/_tmp-em-p1r-forensics.json` |

---

## Werdykt skrócony

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy wygenerowane DOCX odpowiadają wizualnie oryginałom? | **NIE** |
| Czy XML row cloning jest główną przyczyną? | **NIE** — klonowanie działa technicznie; **szablony źródłowe są syntetyczne**, nie pochodzą z formularzy Word |
| Czy naprawa obecnego pipeline wymaga >30% generatora? | **TAK** — szacunkowo **≥70% warstwy szablonów/formatowania** |
| Status EM-P1 (UX produkcyjny) | **FAILED UX** |
| Rekomendacja | **EM-P1R — Template Rebuild** (oryginalne DOCX → templatyzacja Word → zachowanie clone engine) |

**Wstrzymanie:** dalszy rozwój EM-P2/P3 związany z DOCX (ZIP pack, INDEX, integracja WM) do zamknięcia EM-P1R.

---

## 1. Root Cause

### 1.1 Przyczyna pierwotna (architektura szablonów)

EM-P1B **nie używa oryginalnych formularzy Word**. Szablony powstają skryptem `build-em-docx-templates.mjs`:

- XML `document.xml` generowany **programowo** (stringi `<w:tbl>`, `<w:tr>`, `<w:tc>`)
- Opakowanie w **szkielet** WM Druk: `audit/wm-print-docx-fixed/Oświadczenie bezrobotny umowa 154.docx`
- Jednolita szerokość komórki: **`w:tcW w:w="1200"`** dla każdej komórki
- Brak `w:tblGrid`, brak `w:tcBorders`, brak `w:rPr` / `w:pPr` w komórkach danych
- Brak tabel legend (ADSC, RCD) — **całkowicie pominięte**

To potwierdza raport implementacyjny EM-P1B (Known Limitation **L2**, **L6**):

> Szablony programowe (build script), nie oryginalne Word z Desktop  
> Brak legend statycznych w szablonach programowych

### 1.2 Przyczyna wtórna (objawy zgłoszone przez użytkownika)

| Objaw | Mechanizm w kodzie |
|-------|-------------------|
| Rozpad tabel Word | Brak `tblGrid` + `tblW type=auto` + równe wąskie kolumny → Word reflow |
| Niepoprawne szerokości kolumn | Wszystkie komórki **1200 dxa** (oryginał: zróżnicowane szerokości, 10–16 kolumn) |
| Pionowe zawijanie tekstu | Brak kontroli `textDirection`, `noWrap`, szerokości; długie nagłówki w wąskich komórkach |
| Utrata formatowania komórek | Brak ramek, wyrównania pionowego, stylów run — tylko `<w:t>` |
| Błędne rozmieszczenie placeholderów | Placeholdery w poprawnej **kolejności logicznej**, ale w **złej siatce wizualnej** |
| Dokumenty ≠ wzory praktyczne | Brak legend + inna liczba tabel + inna struktura Protokołu |

### 1.3 Row cloning — nie jest root cause

`expandEmDocxTemplateRows()` (`em-docx-xml.ts`) **klonuje istniejący `<w:tr>`** i podmienia `{{ROW_*}}`. Smoke P1: **XML valid** (`validateEmDocxBytes` PASS). Klonowanie **powiela wadliwy wiersz wzorcowy** — nie naprawia layoutu.

---

## 2. Porównanie oryginał vs szablon vs wygenerowany

### 2.1 Metryki strukturalne

| Dokument | Oryginał (forensyka) | Szablon `.template.docx` | Wygenerowany smoke | Δ tabele | Δ wiersze |
|----------|----------------------|--------------------------|--------------------|---------:|----------:|
| **PROTOKÓŁ** | 1 tbl / 3 w. · ~11,9 KB | 1 tbl / 4 w. · 12,5 KB | 1 tbl / 4 w. · 12,6 KB | 0 | +1 |
| **DANE INFORMACYJNE** | 1 tbl / 9 w. · 12,1 KB | 1 tbl / 9 w. · 12,6 KB | 1 tbl / 9 w. · 12,6 KB | 0 | 0 |
| **ADSC** | **4 tbl / 24 w.** · 15,3 KB | **3 tbl / 7 w.** · 12,6 KB | **3 tbl / 9 w.** · 12,6 KB | **−1** | **−15…−17** |
| **REZYSTANCJA** | 3 tbl / 13 w. · 14,5 KB | 3 tbl / 7 w. · 12,6 KB | 3 tbl / 9 w. · 12,6 KB | 0 | **−4…−6** |
| **RCD** | **4 tbl / 18 w.** · 13,1 KB | **3 tbl / 5 w.** · 12,5 KB | **3 tbl / 7 w.** · 12,6 KB | **−1** | **−11…−12** |

**Wniosek:** wygenerowane pliki są ** strukturalnie bliźniacze** szablonom (clone tylko mnoży wiersze danych). Różnica względem oryginału jest **w szablonie**, nie w kroku generacji.

### 2.2 Formatowanie XML (wszystkie 5 szablonów)

| Właściwość | Oryginał (typowy Word) | Szablon / output EM-P1 |
|------------|------------------------|-------------------------|
| `w:tblGrid` / `gridCol` | obecny | **0** |
| `w:tcBorders` | obecny | **0** |
| `w:rPr` (font, bold) | obecny | **0** w body |
| `w:pPr` (wyrównanie) | obecny | **0** w body |
| `w:gridSpan` / `vMerge` | możliwy (Protokół) | **0** |
| `w:textDirection` | możliwy (nagłówki) | **0** |
| Szerokości `tcW` | zróżnicowane | **1200 × N** (uniform) |

---

## 3. Uszkodzone tabele — per dokument

Legenda: **USZKODZONA** = brak wizualnej/zawartościowej zgodności z oryginałem · **BRAK** = tabela nie istnieje w szablonie · **OK logic** = dane/placeholdery poprawne, layout zły

### 3.1 PROTOKÓŁ Z POMIARÓW OCHRONNYCH

| Tabela | Oryginał | Stan EM-P1 | Problem |
|--------|----------|------------|---------|
| T1 podsumowanie | 3 wiersze, **komórki scalone** (tekst wielolinijkowy w 1 komórce) | 4 wiersze × **1 komórka** | **USZKODZONA** — rozbito na 4 osobne wiersze; brak scalenia; brak pola tekstowego nagłówka poza tabelą |
| Pola skalarne (RAP, daty, adres) | Akapity poza tabelą | Akapity `<w:p>` proste | **USZKODZONA** — brak formatowania, odstępów, stylu firmowego |

**Placeholdery:** obecne i podstawiane poprawnie (smoke T01 PASS).

### 3.2 DANE INFORMACYJNE

| Tabela | Oryginał | Stan EM-P1 | Problem |
|--------|----------|------------|---------|
| T1 checklist | 9 w. (1 tytuł colspan + hdr + 7 pozycji) | 9 w. (struktura podobna) | **USZKODZONA (layout)** — tytuł 1 kolumna vs oryginał; kolumny równe 1200 dxa; długie opisy poz. 6 zawijają się pionowo/poziomo źle |
| Kolumna OCENA | WŁAŚCIWY / POPRAWNE / … | Podstawiane poprawnie | **OK logic** |

### 3.3 BADANIE ADSC (TN-S)

| Tabela | Oryginał | Stan EM-P1 | Problem |
|--------|----------|------------|---------|
| **T1** Nagłówek 3×3 | 3 w. × 3 kol. | 3 w. × 3 kol. (1200 dxa) | **USZKODZONA (layout)** — brak proporcji kolumn; puste komórki R2 |
| **T2** Tytuł sekcji | 1 w. × 1 kol. | 1 w. × 1 kol. | **USZKODZONA (layout)** — brak stylu tytułu |
| **T3** Dane pomiarowe | 10 w. × **10 kol.** (1 hdr + 9 danych) | 3 w. wzorcowe → **N+2 po clone** | **USZKODZONA** — siatka 10 kol. w wąskim auto-layout; **2 wiersze wzorcowe** (SUPPLY + ROW) zamiast 1 typu obwodu w oryginale; brak rozróżnienia stylów wiersza Zasilanie vs obwód |
| **T4** Legenda | **10 w.** × 2 kol. | **BRAK** | **BRAK** — cała tabela usunięta w build script |

### 3.4 BADANIE REZYSTANCJI

| Tabela | Oryginał | Stan EM-P1 | Problem |
|--------|----------|------------|---------|
| T1 Nagłówek | 3×3 | 3×3 | **USZKODZONA (layout)** |
| T2 Tytuł | 1 w. | 1 w. | **USZKODZONA (layout)** |
| **T3** Macierz | 9 w. × **16 kol.** | 3 w. → N+2 | **USZKODZONA (krytyczna)** — 16 wąskich kolumn × 1200 dxa = **overflow / pionowy tekst**; brak możliwości czytelnej macierzy MΩ; duplikat nagłówka L1-L2 jak w oryginale, ale bez szerokości |

Forensyka P1A oceniła Rezystancję jako **HIGH risk** — przy obecnych szablonach ryzyko zrealizowało się jako **pełna utrata użyteczności wizualnej**, nie tylko XML corruption.

### 3.5 PARAMETRY RCD

| Tabela | Oryginał | Stan EM-P1 | Problem |
|--------|----------|------------|---------|
| T1 Nagłówek | 3×3 | 3×3 | **USZKODZONA (layout)** |
| T2 Tytuł | 1 w. | 1 w. | **USZKODZONA (layout)** |
| **T3** RCD | 2 w. × **14 kol.** | 2 w. → 1+N | **USZKODZONA (layout)** — 14 kolumn w uniform grid |
| **T4** Legenda | **12 w.** | **BRAK** | **BRAK** |

---

## 4. Ocena naprawy obecnego XML row cloning

### 4.1 Co robi engine dziś

```text
templateBytes (JSZip)
  → expandEmDocxTemplateRows(rowSpecs)   // clone <w:tr> per marker
  → substituteEmDocxVariablesInXml()     // {{SCALAR}} + split-run merge
  → validateEmDocxBytes()                // bilans w:t, w:r, w:tr, w:tc
  → output.docx
```

Markery: `ROW_SUPPLY_LP` (substituteInPlace), `ROW_LP` (clone × circuits/rcds).

### 4.2 Co cloning **potrafi** (przy dobrym szablonie)

| Capability | Status |
|------------|--------|
| Mnożenie wierszy danych | ✅ działa (smoke T03–T06) |
| Podmiana placeholderów w wierszu | ✅ |
| Split-run Word w akapicie | ✅ (paragraph-level merge) |
| Walidacja well-formed XML | ✅ |
| Zachowanie stylów **z wiersza wzorcowego** | ✅ **tylko jeśli wzorzec je ma** |

### 4.3 Czego cloning **nie naprawi**

| Gap | Wpływ |
|-----|-------|
| Brak oryginalnego `tblGrid` / `tcW` | Szerokości kolumn |
| Brak legend (statyczne tabele) | Zawartość dokumentu |
| Protokół — scalone komórki | Layout orzeczenia |
| 16-kolumnowa Rezystancja bez precyzyjnego szablonu | Czytelność macierzy |
| Nagłówek 3×3 bez merge pustych komórek | Wygląd nagłówka operacyjnego |

### 4.4 Werdykt naprawy „tylko cloning”

| Scenariusz | Realność |
|------------|----------|
| Patch `expandEmDocxTemplateRows` (merge cells, tblGrid inject) | **Niska** — wymaga reverse-engineering OOXML per tabela, kruche |
| Podmiana szablonów na **oryginały z placeholderami** + ten sam clone engine | **Wysoka** — zgodne z EM-P1A Ścieżka A |
| docxtemplater / pełna generacja programatyczna (`docx` npm) | Średnia — utrata formatowania unless template-based |

**Odpowiedź na pytanie audytu:** naprawa **samym** row cloning **nie wystarczy**. Naprawa wymaga **nowych szablonów źródłowych** (≥5 plików Word). Engine cloning może **pozostać** (~30% pracy).

---

## 5. Szacunek zakresu przebudowy (>30%?)

| Komponent | Plik | Reuse EM-P1R | Uwagi |
|-----------|------|:------------:|-------|
| Payload / mapowanie danych | `em-docx-payload.ts` | **~90%** | Zachować kontrakt `ROW_*`, scalary |
| Preview parity | `preview.ts` | **100%** | Bez zmian |
| Generator orchestration | `generate-em-docx.ts` | **~95%** | Bez zmian |
| XML substitute + clone | `em-docx-xml.ts` | **~70%** | Możliwe rozszerzenia: multi-marker, header/footer parts |
| **Szablony DOCX** | `public/em-measurements/*` | **0%** | **Pełna wymiana** |
| **Build szablonów** | `build-em-docx-templates.mjs` | **0%** | **Usunąć / zastąpić** procesem „Word → save as template” |
| Testy P1 smoke | `test-electrical-measurements-p1.mjs` | **~50%** | Dodać asercje layoutu / byte similarity / visual checklist |
| ZIP / katalog / WM integracja | P2/P3 | **wstrzymać** | Do EM-P1R |

**Szacunek:** warstwa **szablonów + UX wizualny ≈ 70–80%** effortu EM-P1 DOCX · **>30% generatora** — **TAK**.

---

## 6. EM-P1 — ocena statusu

| Kryterium EM-P1 (biznes) | Werdykt |
|--------------------------|---------|
| 5 dokumentów generowalnych z aplikacji | ✅ technicznie |
| Placeholdery / dane RAP / preview parity | ✅ |
| XML well-formed | ✅ |
| **Zgodność wizualna z formularzami używanymi w praktyce** | ❌ **FAIL** |
| **Kompletność dokumentu (legendy, sekcje)** | ❌ **FAIL** |
| Akceptacja przez pomiarowca / WM | ❌ **FAIL** (weryfikacja ręczna 2026-06-16) |

### Status: **EM-P1 FAILED UX**

EM-P1 osiągnął **MVP techniczny** (P1B raport), ale **nie spełnia wymogu produkcyjnego** „dokument jak z Worda w terenie”. Functional ≠ acceptable.

---

## 7. Propozycja EM-P1R — Template Rebuild

### 7.1 Cel

Przywrócić **wizualną zgodność 1:1** z 5 oryginalnymi formularzami, zachowując istniejący payload i row cloning.

### 7.2 Zakres EM-P1R

| Krok | Opis |
|------|------|
| **R1** | Wejście: 5 oryginalnych DOCX (Desktop / RAP-43 reference) |
| **R2** | Templatyzacja ręczna w Word: `{{RAP_NO}}`, `{{ROW_*}}`, jeden wiersz wzorcowy per typ (ADSC supply + circuit, Rezystancja supply + circuit, RCD) |
| **R3** | Zachować **statyczne legendy** (T4 ADSC, T4 RCD) bez placeholderów |
| **R4** | Umieścić w `public/em-measurements/*.template.docx` — **retire** `build-em-docx-templates.mjs` |
| **R5** | Smoke rozszerzony: struktura tabel (count rows/cols), rozmiar pliku ±15% vs oryginał, checklist manualny |
| **R6** | Opcjonalnie: golden-file byte diff na `word/document.xml` (normalized placeholders) |

### 7.2 Czego EM-P1R **nie** robi

- Nie blokuje EM-P1.5 value engine (dane już w payload)
- Nie wymaga rewrite `em-docx-payload.ts` od zera
- Nie wymaga docxtemplater (o ile clone na prawdziwym `<w:tr>` wystarczy)

### 7.3 Ryzyka resztkowe po EM-P1R

| Dokument | Ryzyko clone na prawdziwym szablonie |
|----------|--------------------------------------|
| RCD | LOW |
| ADSC | MEDIUM (2 typy wierszy — supply vs obwód) |
| Rezystancja | **HIGH** (16 kol. — wymaga perfekcyjnego wiersza wzorcowego z oryginału) |
| Protokół | LOW (skalary + scalone komórki — templatyzacja w Word, bez clone) |
| Dane informacyjne | LOW (fixed rows) |

### 7.4 Fallback (tylko jeśli R1R6 zawiedzie na Rezystancji)

- Ścieżka C z `WM-POMIARY-001-DESIGN`: docxtemplater `{#rows}` loops
- Lub hybrid: oryginał jako master + ręczny export PDF dla archiwum

---

## 8. Mapowanie objawów użytkownika → dowód

| Objaw zgłoszony | Dowód forensyki |
|-----------------|-----------------|
| Rozpad tabel Word | `tblGrid: 0`, `tblW auto`, brak borders |
| Niepoprawne szerokości kolumn | wszystkie `tcW=1200` |
| Pionowe zawijanie tekstu | brak `noWrap` + wąskie kolumny + długie nagłówki (16 kol.) |
| Utrata formatowania komórek | `runProps: 0`, `pPr: 0`, `tcBorders: 0` |
| Błędne rozmieszczenie placeholderów | placeholdery logicznie OK, grid wizualnie zły |
| Dokumenty ≠ wzory praktyczne | brak legend (−1 tabela ADSC/RCD), Protokół rozbito |

---

## 9. Pliki kluczowe (referencja)

| Plik | Rola w incydencie |
|------|-------------------|
| `scripts/build-em-docx-templates.mjs` | **Root cause** — syntetyczne szablony |
| `src/lib/electrical-measurements/em-docx-xml.ts` | Row clone (działa, ale GIGO) |
| `src/lib/electrical-measurements/em-docx-payload.ts` | Payload OK |
| `audit/EM-P1A-DOCX-FORENSICS.md` | Spec oryginałów (RAP-43) |
| `audit/EM-P1-DOCX-GENERATOR-REPORT.md` | L2/L6 — znane ograniczenia |
| `audit/_tmp-em-p1r-forensics.json` | Metryki XML porównawcze |

---

## 10. Decyzje i następne kroki

| # | Decyzja |
|---|---------|
| 1 | **Wstrzymać** EM-P2/P3 rozszerzenia DOCX (ZIP pack polish, WM integracja dokumentów) |
| 2 | **Oznaczyć EM-P1 jako FAILED UX** (nie rollback kodu — rollback oczekiwań produktowych) |
| 3 | **Uruchomić EM-P1R Template Rebuild** jako P0 przed dalszym EM |
| 4 | **Nie** inwestować w patchowanie `build-em-docx-templates.mjs` |
| 5 | Po EM-P1R: powtórzyć ręczną weryfikację 5/5 dokumentów vs oryginał |

---

## Werdykt końcowy

```text
EM-P1  — FAILED UX (dokumenty nie nadają się do użycia terenowego w obecnej formie)
EM-P1R — REQUIRED (Template Rebuild z oryginalnych Word, reuse payload + clone engine)
Row cloning — nie do wyrzucenia, ale bezużyteczne bez prawdziwych szablonów
```

*EM-P1R READ ONLY · forensyka na bazie WM-POMIARY-001 + repo EM-P1B + weryfikacja ręczna użytkownika 2026-06-16*
