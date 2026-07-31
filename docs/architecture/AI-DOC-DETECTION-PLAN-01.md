# AI-DOC-DETECTION-PLAN-01

> **ID:** AI-DOC-DETECTION-PLAN-01  
> **STATUS:** PLAN COMPLETE (docs)  
> **MODE:** DOCUMENTATION ONLY · NO CODE · NO COMMIT · NO PUSH · **NO IMPLEMENT**  
> **Data:** 2026-07-31  
> **Wejście:** [`AI-DOC-DETECTION-RCA-01.md`](AI-DOC-DETECTION-RCA-01.md)  
> **SSOT istniejący (reuse):** AP2-S0 w `tender-data-ssot.ts` · F2 w `cost-regression-f2.ts` · role w `tender-document-role.ts`

```text
════════════════════════════════════════════════════════
PLAN — spójność detekcji dokumentów (Przetargi)

Cel: jedna semantyka + UX przyczyn
  (przedmiar ≠ kosztorys inwestorski ≠ oferta)

Zakaz w tym PLAN / przyszłym thin slice:
  · zmiana logiki AI (scoring / heurystyki pozycji / OfferBoq)
  · zmiana Bid
  · dodanie OCR

Werdykt: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

---

## 0. Cel, zakres, ograniczenia

| IN | OUT |
|----|-----|
| Model dokumentów + relacje (P1) | Zmiana parserów ATH/PDF pozycji |
| Mapowanie synonimów BOQ↔przedmiar | Bid / `computeTenderBidProposal` |
| Macierz UX: komunikaty / pola / statusy / błędy (P2) | Silnik OCR |
| Ramy pod Thin DF (copy + aliasy nazw) | Przebudowa AI-COST / Confidence / Scope Gap |

**Zasada PLAN:** najpierw **język i statusy przyczyn**; rozszerzenie słownika nazw plików tylko jako **aliasy synonimów** (thin), nie jako nowy model AI.

---

## P1 — Semantyka

### P1.1 Model dokumentów (docelowy SSOT produktowy)

Cztery **warstwy pojęć** (nie mylić w UI):

| ID pojęcia | Nazwa użytkownika | Co to jest | Czy ma ceny inwestora? | Rola w wycenie W&G |
|------------|-------------------|------------|-------------------------|---------------------|
| **D1** | **Przedmiar robót** | Lista pozycji: opis · jm · ilość (± KNR) | **Nie** (lub nieistotne) | **Baza** → OfferBoq / katalog |
| **D2** | **Kosztorys inwestorski** | Przedmiar + ceny zamawiającego (ATH/NOR z wartościami) | **Tak** | Opcjonalny referencyjny; brak = INFO (AP2-S0) |
| **D3** | **Kosztorys ofertowy** | Wycena W&G (AI-COST + Bid) | Ceny **wykonawcy** | **Wynik** pipeline — nie dokument uploadu zamawiającego |
| **D4** | **Formularz / oferta formalna** | Załączniki cenowe / oświadczenia | N/A | **Nie** jest przedmiarem (anti-dup) |

```text
Dokument zamawiającego (D1 lub D2)
        ↓  odczyt pozycji (istniejący parse — bez zmian AI w tym PLAN)
   dossier snapshot (dziś pole techniczne `kosztorys`)
        ↓  AI-COST / OfferBoq (bez zmian w tym PLAN)
   Kosztorys ofertowy (D3) + Bid
```

**Relacja zamrożona w PLAN:**

```text
Przedmiar (D1)
    ↓  (wymagany do wyceny ilościowej)
Kosztorys ofertowy (D3)

Kosztorys inwestorski (D2) ──opcjonalny──► może zasilać ten sam snapshot
                                           gdy FOUND_WITH_VALUE
                                           ale NIE jest wymagany do startu D3
```

### P1.2 Mapowanie synonimów → pojęcie kanoniczne

| Synonim / format (wejście) | Pojęcie kanoniczne | Uwagi PLAN |
|----------------------------|--------------------|------------|
| **BOQ** | **D1 Przedmiar** | Alias nazwy (dziś luka RCA) |
| **Bill of Quantities** | **D1 Przedmiar** | Alias EN |
| **Przedmiar** / Przedmiar robót / Przedmiar inwestorski | **D1** | Już w discovery; „inwestorski” w nazwie ≠ D2 automatycznie |
| **Kosztorys ślepy** | **D1 Przedmiar** | Ślepy = bez cen = przedmiar |
| **Obmiar** | **D1** (wariant przedmiaru) | Już wspierany |
| **ATH** / NOR / XML (z cenami) | **D2** gdy `FOUND_WITH_VALUE`; inaczej **D1** | Status cenowy z P2-E.5 — bez zmiany parsera |
| **ATH** / PDF „kosztorys” bez cen | **D1** | Nie nazywać „brak kosztorysu ofertowego” |
| Formularz ofertowy / offer form | **D4** | Pozostaje wykluczony z discovery kosztowego |
| Kosztorys ofertowy W&G / OfferBoq / Bid | **D3** | Nigdy nie mylić z brakiem pliku upload |

**Reguła nazewnictwa wewnętrznego (docelowa, do DF):**

- UI użytkownika: **Przedmiar** / **Kosztorys inwestorski** / **Kosztorys ofertowy**.  
- Pole techniczne `dossier.kosztorys` może zostać (kompatybilność) — w copy zawsze mapowane na D1/D2 według `ResolvedCostStatus`, nie na D3.

### P1.3 Statusy semantyki dokumentu (kanoniczne)

| Status ID | Znaczenie biznesowe | Mapowanie tip (as-is) |
|-----------|---------------------|----------------------|
| `PRZEDMIAR_ABSENT` | Brak kandydata D1/D2 w załącznikach | F2 `no_candidate` |
| `PRZEDMIAR_CANDIDATE` | Plik wygląda na D1/D2, jeszcze nie odczytany | F2 `candidate_ready` |
| `PRZEDMIAR_PARSING` | Trwa odczyt | F2 `parse_running` |
| `PRZEDMIAR_NO_TEXT` | PDF bez warstwy tekstowej (skan/CAD) — **wymaga OCR** (backlog; bez implementacji OCR) | CASE 3 / pdfNoTextLayer |
| `PRZEDMIAR_PARSE_FAILED` | Kandydat był, odczyt pozycji nieudany | F2 `parse_failed` (nie-ZIP) |
| `PRZEDMIAR_OK_NO_PRICE` | Pozycje/ilości OK, bez cen inwestora | `FOUND_NO_VALUE` |
| `INVESTOR_COST_OK` | Jest D2 z wartością | `FOUND_WITH_VALUE` |
| `INVESTOR_COST_ABSENT` | Brak D2 — **nie błąd**, jeśli D1 OK | AP2-S0 INFO |
| `OFFER_COST_PENDING` / `OFFER_COST_OK` | D3 (wycena W&G) | Bid / OfferBoq outcome — **osobna oś** |

---

## P2 — UX

### P2.1 Zasada jednej przyczyny

Każdy empty state / błąd / status musi wskazać **dokładnie jedną** z czterech przyczyn użytkownika:

| Przyczyna UX | Statusy z P1.3 | Co użytkownik ma zrobić |
|--------------|----------------|-------------------------|
| **A. Brak przedmiaru** | `PRZEDMIAR_ABSENT` | Dołącz przedmiar / ATH / XLSX / PDF (BOQ) |
| **B. Brak OCR** | `PRZEDMIAR_NO_TEXT` | Dostarcz ATH/XLSX lub PDF z tekstem (OCR = backlog — komunikat uczciwy) |
| **C. Brak odczytu** | `PRZEDMIAR_CANDIDATE` · `PRZEDMIAR_PARSING` · `PRZEDMIAR_PARSE_FAILED` | Ponów analizę / sprawdź plik |
| **D. Brak kosztorysu ofertowego** | D1 OK, ale brak Bid/OfferBoq ready | Osobny komunikat wyceny — **nie** „brak przedmiaru” |

**Zakaz copy:** używać słowa „kosztorys” bez kwalifikatora (**inwestorski** vs **ofertowy**) w stanach A–C.

### P2.2 Komunikaty docelowe (macierz — propozycja PLAN, nie kod)

| Stan | `phaseLabelPl` (docelowy) | `hintPl` (kierunek) |
|------|---------------------------|---------------------|
| A | **Brak przedmiaru w dokumentach** | Dołącz przedmiar, BOQ, obmiar, ATH lub XLSX z pozycjami. |
| B | **Przedmiar PDF bez tekstu (wymaga OCR)** | Brak warstwy tekstowej — dołącz ATH/XLSX lub PDF z tekstem. OCR w aplikacji: niedostępne. |
| C1 candidate | **Przedmiar wykryty — brak odczytu pozycji** | Uruchom ponownie analizę dokumentów. |
| C2 running | **Trwa odczyt przedmiaru…** | Po zakończeniu możliwa wycena ofertowa. |
| C3 failed | **Nie udało się odczytać przedmiaru** | Sprawdź plik / Ponów. (ZIP: zachować wariant „nie znaleziono w archiwum” z naciskiem na **przedmiar**) |
| INFO D2 | **Zamawiający nie udostępnił kosztorysu inwestorskiego** | (bez zmian sensu AP2-S0) — przy obecnym przedmiarze. |
| D | **Brak kosztorysu ofertowego** / „Wymaga wyceny” | Osobny tor Offer/Bid — tylko gdy przedmiar już OK. |

### P2.3 Nazwy pól / etykiet (docelowe)

| Miejsce tip | Unikać | Preferować |
|-------------|--------|------------|
| Zakładka / hub | „Kosztorys” jako jedyny label dla D1 | **Przedmiar / wycena** lub „Kosztorys” z podtytułem „przedmiar → oferta” |
| Snapshot dossier | Prezentacja „kosztorys” zawsze | Mapowanie: D1 „Przedmiar” · D2 „Kosztorys inwestorski” |
| D3 | „Kosztorys” bez „ofertowy” | **Kosztorys ofertowy** / „Rekomendowana oferta” |
| Role `kosztorys` | „Kosztorys inwestorski” gdy to ślepy PDF | Po `FOUND_NO_VALUE` → etykieta **Przedmiar** |
| Filtry listy „Brak kosztorysu” | — | Rozważyć „Brak przedmiaru” vs „Brak kosztorysu inwestorskiego” (DF zdecyduje zakres rename) |

### P2.4 Statusy widoczne dla użytkownika (chip / strip)

Propozycja chipów (jeden primary):

| Chip | Kolor/sens | Przyczyna |
|------|------------|-----------|
| Brak przedmiaru | warning | A |
| Wymaga OCR / brak tekstu | neutral-warn | B |
| Odczyt w toku / nieudany odczyt | progress / error | C |
| Przedmiar OK | success | D1 ready |
| Brak kosztorysu inwestorskiego | info | D2 absent (nie blokuje) |
| Kosztorys ofertowy gotowy / brak | success / warn | D |

### P2.5 Komunikaty błędów — checklista DF

Przed Thin DF zamrozić listę stringów do wymiany w:

- `cost-regression-f2.ts` (F2 copy),
- `tender-kosztorys-process-phase.ts` (e6/e10 labels — tylko copy),
- empty states `TenderKosztorysWorkspace` / Offer run,
- ewentualnie filtry listy (osobna decyzja DF: IN/OUT).

**Nie** ruszać treści warningów parsera pozycji (AI/heurystyka) poza ewentualnym prefiksem przyczyny B vs C.

---

## 3. Zakres przyszłego Thin DF (ramy — bez wyboru algorytmu AI)

### 3.1 IN (po Owner GO DF)

| # | Element |
|---|---------|
| 1 | SSOT copy: macierz P2.2 + przyczyny A–D |
| 2 | Opcjonalnie: **aliasy nazw** BOQ / Bill of Quantities / ślepy → traktowane jak przedmiar w **filename discovery** (thin regex) |
| 3 | Mapowanie etykiet roli D1/D2 według `FOUND_*` |
| 4 | Testy snapshot copy (stringi) + alias filename |
| 5 | Changelog UX |

### 3.2 OUT (twarde)

| # | Zakaz |
|---|-------|
| 1 | Zmiana wag `scoreCostDocumentContent` / heurystyk pozycji PDF |
| 2 | Bid / OfferBoq pricing / Time-Load Guard |
| 3 | Implementacja OCR |
| 4 | Zmiana merge KV / cloud-sync |
| 5 | Confidence / Scope Gap formula |

### 3.3 Kolejność zalecana

```text
Thin DF → IMPLEMENT copy-first (A–D przyczyny)
    ↓ opcjonalnie ten sam slice
Aliasy filename (BOQ / ślepy) — jeśli Owner GO w DF
    ↓ NIE w tym epicu
OCR engine (osobny AUDIT)
```

---

## 4. Ryzyka

| Ryzyko | Mitygacja PLAN |
|--------|----------------|
| Rename „Kosztorys” w całej app → chaos | DF: allowlist plików copy; nie rename pola `dossier.kosztorys` |
| Alias BOQ złapie fałszywy plik | Tylko `\bboq\b` / pełna fraza EN + PDF/XLS; testy negatywne |
| Użytkownik nadal szuka „kosztorysu” | HelpView 1 FAQ: przedmiar vs inwestorski vs ofertowy |
| Scope creep AI | Zakaz w §0 / §3.2 |

---

## 5. Walidacja po ewentualnym IMPLEMENT (ramy)

| Test | Pass |
|------|------|
| F2 A: brak pliku → „Brak przedmiaru…” | string |
| F2 C: kandydat → nie zawiera gołego „brak kosztorysu” bez kwalifikatora | string |
| CASE 3 → przyczyna B (OCR), nie A | string / fixture |
| D1 OK + brak Bid → przyczyna D, nie A | wiring copy |
| Alias `BOQ.pdf` → kandydat przedmiaru (jeśli alias IN w DF) | unit |
| Regresja Bid / guard / Confidence / Scope | bez zmian liczb |

---

## 6. Checklist kompletności PLAN

| Wymaganie | Status |
|-----------|--------|
| P1 model dokumentów | **TAK** |
| P1 relacja Przedmiar → Kosztorys ofertowy | **TAK** |
| P1 mapowanie BOQ / Bill of Quantities / Przedmiar / ślepy / Obmiar / ATH | **TAK** |
| P2 komunikaty / pola / statusy / błędy (4 przyczyny) | **TAK** |
| Zakaz AI / Bid / OCR / IMPLEMENT | **TAK** |

---

## 7. Werdykt

```text
READY FOR DESIGN FREEZE

Następny krok (po Owner GO):
  AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01
  · zamrożenie macierzy copy A–D
  · decyzja IN/OUT aliasów BOQ/ślepy
  · allowlist plików
  · BEZ OCR · BEZ Bid · BEZ zmiany logiki AI scoringu pozycji
```

**DOCUMENTATION ONLY · NO CODE · NO COMMIT · NO PUSH · 2026-07-31**
