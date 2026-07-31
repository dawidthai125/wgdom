# AI-DOC-DETECTION-RCA-01

> **ID:** AI-DOC-DETECTION-RCA-01  
> **STATUS:** RCA COMPLETE (docs)  
> **MODE:** DOCUMENTATION ONLY · **NO CODE · NO COMMIT · NO PUSH**  
> **Data:** 2026-07-31  
> **Zakres:** Przetargi — wykrywanie / klasyfikacja dokumentów kosztowych (przedmiar ↔ kosztorys)  
> **Kod (RO):** `tender-cost-discovery.ts` · `tender-cost-content-detection.ts` · `tender-document-role.ts` · `cost-regression-f2.ts` · `pdf-przedmiar-heuristic.ts` · `tenders-bzp-doc-parse.ts` · `tender-data-ssot.ts` · `tender-kosztorys-process-phase.ts`

```text
════════════════════════════════════════════════════════
RCA — wykrywanie dokumentów (Przetargi)

Discovery NIE wymaga nazwy „Kosztorys”.
Szuka m.in. przedmiar / obmiar / ATH / XLS(+hint) / kosztorys.pdf / *_PR.pdf.

LUKI słownikowe: brak jawnych
  „BOQ” · „Bill of Quantities” · „Kosztorys ślepy”
  · „Przedmiar inwestorski” (jako frazy).

UI często mówi „kosztorys”, gdy realnie chodzi o
  brak/nieodczytany PRZEDMIAR (dossier.kosztorys).

Werdykt warstw: OBA (komunikaty + klasyfikacja/słownik)
════════════════════════════════════════════════════════
```

---

## 0. Cel i ograniczenia

| IN | OUT |
|----|-----|
| Logika discovery / klasyfikacji / copy UI | IMPLEMENT / patch |
| Pipeline Upload → tekst → typ → analiza | OCR produkcyjny (go nie ma) |
| Ocena: copy vs klasyfikacja vs obie | Commit / push |

---

## 1. Czy AI szuka dokumentów bazowych? (słownik)

### 1.1 Warstwa nazwy pliku — `classifyCostDocumentType` / `isPdfPrzedmiarCostFilename`

| Fraza / klasa | Wyszukiwana? | Gdzie |
|---------------|--------------|-------|
| **Przedmiar robót** / `przedmiar` | **TAK** (token w nazwie) | `isPdfPrzedmiarCostFilename`, role `przedmiar`, F2 `PDF_PRZEDMIAR_NAME_RE` |
| **BOQ** (akronim) | **NIE** (brak wzorca `\bboq\b`) | — |
| **Bill of Quantities** | **NIE** | — |
| **Kosztorys ślepy** / `ślepy` | **NIE** | — |
| **Przedmiar inwestorski** (jako fraza) | **Częściowo** — wystarczy `przedmiar` w nazwie; brak osobnego tokenu „inwestorski” | discovery |
| **Obmiar** | **TAK** | PDF discovery |
| **Kosztorys** (w nazwie / `.ath`) | **TAK** | `kosztorys.pdf`, `/kosztorys/`, ATH/NOR/XML, hint XLS `koszt\|przedm\|obmiar` |
| `*_PR.pdf` | **TAK** | heurystyka WM |

**Wniosek §1.1:** baza PL **przedmiar/obmiar/kosztorys+ATH** jest pokryta; **angielskie BOQ / Bill of Quantities** oraz **„ślepy”** — **luka klasyfikacji (słownik)**.

### 1.2 Warstwa treści — `scoreCostDocumentContent` (P1)

| Sygnał | Zachowanie |
|--------|------------|
| Słowa `przedmiar`, `obmiar`, `kosztorys` | W `TRADE_WORDS` — podnoszą score |
| Jednostki (m2, mb, szt…) + ilości / KNR | Klasyfikacja `bill_of_quantities` lub `cost_estimate` |
| Literal „Bill of Quantities” / „BOQ” | **Brak** dedykowanego patternu EN |
| Semantyka | `bill_of_quantities` = struktura ilościowa; `cost_estimate` = KNR+jednostki — **nie** wymaga tytułu „Kosztorys” |

**Wniosek §1.2:** treść rozpoznaje **przedmiar-like** po jednostkach/KNR, nie po angielskim tytule BOQ.

### 1.3 Rola biznesowa — `classifyDocumentRole`

| Nazwa zawiera | Rola |
|---------------|------|
| `przedmiar` | `przedmiar` |
| `obmiar` | `obmiar` |
| `kosztorys` (bez „ofert”) | `kosztorys` → etykieta UI **„Kosztorys inwestorski”** |
| XLSX bez hintu | domyślnie `przedmiar` |
| PDF bez słów kluczowych | `unknown` — **nie** wejdzie w PDF-przedmiar discovery |

---

## 2. Czy system błędnie oczekuje dokumentu „Kosztorys”?

### 2.1 Discovery — **NIE** (nie jest wymagana nazwa „Kosztorys”)

Kandydat kosztowy może być:

- ATH / NOR / XML,
- XLS/XLSX (z hintem koszt/przedm/obmiar; outer XLSX bez hintu też bywa kandydatem),
- PDF z `przedmiar` / `obmiar` / `kosztorys` / `*_PR`.

**Brak** reguły: „tylko plik nazwany Kosztorys”.

### 2.2 Model danych / UI — **TAK, conflacja semantyczna**

| Fakt | Skutek |
|------|--------|
| Snapshot w dossier = pole **`kosztorys`** | Nawet przedmiar PDF (`FOUND_NO_VALUE`) żyje pod etykietą „kosztorys” |
| Fazy procesu: „Analiza **kosztorysu**”, e10 „nie udostępnił **kosztorysu inwestorskiego**” | Copy miesza **przedmiar (ilości)** z **kosztorysem inwestorskim (ceny)** |
| F2: „Brak odczytanego **kosztorysu**”, „Nie znaleziono **kosztorysu** w ZIP” | Użytkownik słyszy „brak kosztorysu”, gdy często brakuje **odczytanego przedmiaru** |
| AP2-S0 (SSOT) | Świadomie: brak kosztorysu inwestorskiego = INFO; przedmiar = baza wyceny — **nie zawsze widoczne** w F2 / process strip |

**Wniosek §2:**  
Discovery **nie** wymaga nazwy „Kosztorys”.  
Produkt **tak** komunikuje i modeluje wynik przez słowo „kosztorys”, co **mylnie sugeruje** oczekiwanie kosztorysu inwestorskiego zamiast przedmiaru.

---

## 3. Pipeline (as-is)

```text
[1] Upload / BZP / external discovery
        ↓
[2] Unified attachment gate · lista plików (ZIP/7Z → inner paths)
        ↓
[3] Tekst PDF: pdf.js extractPdfText  ——  NIE ma produkcyjnego OCR
        · skan / CAD bez warstwy tekstowej → CASE 3 („wymaga OCR”) = STOP treści
        ↓
[4] Klasyfikacja
        · filename: classifyCostDocumentType / isPdfPrzedmiarCostFilename
        · role: classifyDocumentRole (+ hints dossier)
        · content (XLSX/PDF text): scoreCostDocumentContent
          → boost / skip offer_form
        ↓
[5] Discovery pick (priorytet ATH > XLS > PDF przedmiar)
        ↓
[6] Parse
        · ATH/NOR/XML parser
        · XLSX kosztorys
        · PDF: pdf-przedmiar-heuristic (KNR/Lp./jm) — bez OCR
        ↓
[7] dossier.kosztorys (+ costStatus FOUND_WITH_VALUE | FOUND_NO_VALUE | …)
        ↓
[8] Analiza AI / wycena
        · OfferBoq / AI-COST / Bid / Confidence / Scope Gap
        · wejście = pozycje z (7), nie osobny „detector tytułu Kosztorys”
```

**Uwaga OCR:** w pipeline jest **detekcja potrzeby OCR**, nie silnik OCR. Skan bez tekstu ≠ „AI nie znalazło słowa Kosztorys” — to **brak warstwy tekstowej**.

---

## 4. Komunikaty UI vs rzeczywista przyczyna

### 4.1 Macierz F2 (skrót) — `cost-regression-f2.ts`

| `phaseLabelPl` | Typowa przyczyna rzeczywista | Czy copy adekwatny? |
|----------------|------------------------------|---------------------|
| „Brak przedmiaru w dokumentach” | Brak kandydata nazwy/ext | **TAK** (przedmiar) |
| „W dokumentach jest archiwum ZIP” | ZIP obecny, jeszcze nie heavy | **Częściowo** OK |
| „Brak odczytanego kosztorysu” | Kandydat jest, brak `kosztorys.ok` | **Mylące** → raczej „brak odczytanego **przedmiaru**/kosztorysu” |
| „Trwa analiza kosztorysu…” | Parse w toku | Neutralne, ale znów „kosztorys” |
| „Nie znaleziono kosztorysu w archiwum ZIP” | Heavy done, pusty wynik | **Mylące**, jeśli w ZIP był przedmiar o nietypowej nazwie / skan |
| „Nie udało się odczytać kosztorysu” | Parse failed | **Częściowo** — często problem odczytu pozycji przedmiaru |
| e10 „Zamawiający nie udostępnił kosztorysu inwestorskiego” | AP2-S0 — brak ATH z cenami | **TAK** dla sensu inwestorskiego; hint wskazuje przedmiar PDF |

### 4.2 Odpowiedź na pytanie briefu

| Pytanie | Ocena |
|---------|--------|
| Czy „Nie wykryto kosztorysu” / F2 „kosztorys” = rzeczywista przyczyna? | **Często NIE** — przyczyna = brak kandydata **przedmiaru**, nietypowa nazwa (BOQ), skan bez OCR, lub nieudany parse pozycji |
| Czy copy powinien odnosić się do braku **przedmiaru**? | **TAK** jako domyślny język bazy wyceny; „kosztorys inwestorski” tylko gdy chodzi o brak cen ATH |

---

## 5. Hipotezy (uporządkowane)

| ID | Hipoteza | Wiarygodność |
|----|----------|--------------|
| **H1** | Conflacja nazewnicza: `dossier.kosztorys` + UI „kosztorys” ≠ kosztorys inwestorski | **PRIMARY** |
| **H2** | Luka słownika EN/PL: BOQ / Bill of Quantities / ślepy / przedmiar inwestorski | **HIGH** (klasyfikacja) |
| **H3** | PDF bez `przedmiar|obmiar|kosztorys|*_PR` → nie discovery → „brak” mimo że to przedmiar | **HIGH** |
| **H4** | CASE 3 (skan) komunikowany jako brak dokumentu zamiast „wymaga OCR” | **MEDIUM** (zależnie od ścieżki copy) |
| **H5** | System „oczekuje wyłącznie pliku Kosztorys” | **ODRZUCONA** jako reguła discovery |

---

## 6. Rekomendacja warstw (bez IMPLEMENT)

### Werdykt warstw

```text
PROBLEM DOTYCZY: OBU WARSTW

1) KOMUNIKATY (UX / F2 / process strip)
   — nadużycie słowa „kosztorys” przy stanie „brak/nieodczytany przedmiar”
   — AP2-S0 już rozróżnia inwestorski vs przedmiar; F2 nie zawsze

2) KLASYFIKACJA / SŁOWNIK (discovery + role + content)
   — brak BOQ / Bill of Quantities / kosztorys ślepy
   — PDF generic bez tokenów PL → unknown
   — content EN tytułów nieboostowany
```

### Kierunki (tylko rekomendacja RCA — nie PLAN/DF)

| Priorytet | Warstwa | Kierunek |
|-----------|---------|----------|
| P0 copy | Komunikaty | F2 / empty states: domyślnie **przedmiar**; „kosztorys inwestorski” tylko przy INFO o braku cen |
| P1 dict | Klasyfikacja | Dodać synonimy: `boq`, `bill of quantities`, `ślepy`, `przedmiar inwestorski` (filename + opc. content) |
| P2 OCR | Pipeline | Osobny tor — dziś tylko komunikat CASE 3; nie mylić z „nie wykryto” |
| — | Bid / AI-COST | **Poza** tym RCA (nie root cause nazewnictwa dokumentów) |

---

## 7. Dane do potwierdzenia (gdy Owner pójdzie w PLAN)

| ID | Dane |
|----|------|
| D1 | Case prod: plik `*BOQ*.pdf` / `Bill_of_Quantities*` — czy `type=none`? |
| D2 | Case: „Kosztorys ślepy*.pdf” bez słowa przedmiar |
| D3 | Screenshot F2 przy obecnym przedmiarze o nazwie nietypowej |
| D4 | CASE 3 — jaki dokładnie `phaseLabelPl` w UI |

---

## 8. Werdykt RCA

```text
RCA COMPLETE

Root cause class:
  SEMANTIC CONFLATION (kosztorys vs przedmiar) + DICTIONARY GAPS (BOQ/ślepy/…)

Discovery does NOT require filename "Kosztorys".
UI/model OFTEN speak as if "kosztorys" were the base document.

Recommendation scope: BOTH messaging AND classification
Next (po Owner GO): PLAN / Thin DF — nie w tym dokumencie

NO CODE · NO COMMIT · NO PUSH
```

**DOCUMENTATION ONLY · 2026-07-31**
