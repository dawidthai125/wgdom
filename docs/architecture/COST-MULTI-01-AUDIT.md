# COST-MULTI-01 — MULTI COST DOCUMENT STRATEGY · AUDIT

> **ID:** COST-MULTI-01  
> **MODE:** **READ ONLY** · **bez implementacji** · **bez Design Freeze** · **bez commit** · **bez push**  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Fixture:** `08dee335-f338-1f30-ebd1-65000155122a`  
> **Objaw:** system ~**282–293 tys. zł** vs ręczna wycena Ownera ~**1 600 000 zł**  
> **Hipoteza wejściowa:** parser bierze **jeden** kosztorys zamiast kompletu branżowego  
> **Kontekst:** COST-REGRESSION-01/02 CLOSED · COST-PARSER-01 IMPLEMENTED · COST-PARSER-02 AUDIT COMPLETE

```text
════════════════════════════════════════════════════════
WERDYKT SKRÓT:
  Hipoteza POTWIERDZONA.

  Architektura AS-IS = ONE COST DOCUMENT (świadomie).
  W tym przetargu: 4× PDF przedmiar branżowy w ZIP,
  zwycięzca = 1 plik (Pensjonat / lokale OZN) → Bid ~293k PLN.
  Pozostałe 3 branże (budowlana, elektryczna, hydrantowa)
  wykryte jako kandydaci, NIE zsumowane, NIE oznaczone
  jako duplicate/unsupported — przegrywają turniej „best of one”.

  ONE COST DOCUMENT NIE jest wystarczające dla tej klasy
  przetargów. EPIC COST-MULTI-01: TAK (zakres poniżej,
  BEZ Design Freeze w tej sesji).
════════════════════════════════════════════════════════
```

---

## 0. Metoda (READ ONLY)

| Element | Wartość |
|---------|---------|
| Źródło | Live KV `kw-tenders-pipeline` (`batch-get`) + Edge `tenders-bzp-zip-catalog` |
| Kod | `tender-cost-discovery.ts` · `tender-document-resolver.ts` · `tender-dossier-merge.ts` · `tenders-bid-calculator.ts` |
| Bid probe | `computeTenderBidProposal` na live `tenderDossier.kosztorys` (katalog) |
| **Nie** | heavy re-parse wszystkich PDF · implementacja · commit · push |

Artefakty lokalne (nie commitowane): `.tmp/cost-multi-01-*.json` / `.mjs`.

---

## 1. Przetarg (fixture)

| Pole | Wartość |
|------|---------|
| **id** | `08dee335-f338-1f30-ebd1-65000155122a` |
| **tenderId (OCDS)** | `ocds-148610-1a08e343-b8d7-4566-baca-5cd33569b067` |
| **Tytuł** | Przebudowa budynku użyteczności publicznej — Ośrodek … ul. **Kamieńskiego 190** (Pensjonat) |
| **status** | `seen` |
| **Załącznik outer** | `SWZ wraz z załącznikami.zip` (BZP index 2) |
| **Dossier** | `parserVersion: 4` · `builtAt: 2026-07-23T12:15:36.015Z` |
| **kosztorys.ok** | `true` |
| **Źródło zwycięskie** | `KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf` |
| **Pozycje** | **80** (`catalogQuantities`) · `rows` cold/empty w KV |
| **totalValue ATH** | `null` (PDF bez cen jednostkowych) |
| **scan** | `zipUnpackOk: true` · `zipInnerCount: 6` · `parsed: 4` · `scanned: 6` · `kosztorysFound: true` |

---

## 2. Inwentaryzacja dokumentów kosztorysowych

### 2.1 ZIP — pełna zawartość (Edge catalog)

| # | Plik | Rola / typ kosztowy |
|---|------|---------------------|
| 1 | `KI_MOPS_b_budowlana_PRZEDMIAR.pdf` | **PDF przedmiar** (`zip_pdf_przedmiar`) |
| 2 | `KI_MOPS_b_elektryczna_PRZEDMIAR.pdf` | **PDF przedmiar** |
| 3 | `KI_MOPS_instalacja hydrantowa_PRZEDMIAR.pdf` | **PDF przedmiar** |
| 4 | `KI_Pensjonat_Kamieńskiego_mieszkanie_wytchnieniowe_lokaleOZN_PRZEDMIAR.pdf` | **PDF przedmiar** |
| 5 | `1. SWZ.pdf` | SWZ (nie koszt) |
| 6 | `1.1. Edytowalne załączniki do SWZ.docx` | formal (nie koszt) |

**Uwaga vs „~6 przedmiarów” Ownera:** w archiwum są **4** osobne PDF-y przedmiarowe (+ SWZ + DOCX). Hipoteza „wiele branż” — **TAK**; liczba 6 dotyczy raczej całego ZIP, nie 6 ATH.

### 2.2 Liczniki typów (wykryte)

| Typ | Outer | W ZIP | Razem |
|-----|-------|-------|-------|
| ATH / zip_ath | 0 | 0 | **0** |
| NOR / zip_nor | 0 | 0 | **0** |
| XML / zip_xml | 0 | 0 | **0** |
| XLSX / XLS | 0 | 0 | **0** |
| PDF przedmiar | 0 | **4** | **4** |

### 2.3 Kandydaci vs zwycięzca

| Pytanie | Odpowiedź |
|---------|-----------|
| Ile wykryto jako kosztowe? | **4** |
| Ile uznano za kandydatów parse? | **4** (`isPdfPrzedmiarCostFilename` → `pickCostParseCandidates`; scan `parsed: 4`) |
| Który wybrany? | **Pensjonat / lokale OZN** PDF |
| Dlaczego ten? | `discoverBestCostDocument`: ten sam typ/conf → **wyższy `scoreCostTitleMatch`** (tokeny tytułu: *Kamieńskiego*, *Pensjonat* w nazwie pliku; branżowe MOPS mają `titleMatch: 0`) |
| Dlaczego pozostałe pominięte w wyniku? | **Nie** duplicate · **nie** unsupported · **nie** excluded formal — **przegrywają turniej ONE winner** (discovery + `bestKosztorys`) |

### 2.4 Tabela per kosztorys

| Nazwa | Typ | Pozycje (KV) | Wartość | Status |
|-------|-----|--------------|---------|--------|
| `…Pensjonat…lokaleOZN_PRZEDMIAR.pdf` | `zip_pdf_przedmiar` | **80** | Bid katalog ~**292 800 zł** (rekomendowana)* | **WYBRANY** · `kosztorys.ok` · `costDiscovery.source` |
| `KI_MOPS_b_budowlana_PRZEDMIAR.pdf` | `zip_pdf_przedmiar` | *nie zapisane w dossier* | *brak w KV* | Kandydat · **pominięty w wyniku** (lower titleMatch) |
| `KI_MOPS_b_elektryczna_PRZEDMIAR.pdf` | `zip_pdf_przedmiar` | *nie zapisane* | *brak* | Kandydat · pominięty |
| `KI_MOPS_instalacja hydrantowa_PRZEDMIAR.pdf` | `zip_pdf_przedmiar` | *nie zapisane* | *brak* | Kandydat · pominięty |

\*Probe `computeTenderBidProposal` (katalog + live cost model / default): `recommendedBidPln ≈ 292 800`. Owner raportował ~**282 400** — ten sam rząd wielkości; różnica ≈ wersja katalogu / profil kosztowy / override w UI. **Nie** pochodzi z sumy 4 przedmiarów.

Ranking discovery (odtworzony):

| Rank | Plik (skrót) | conf | titleMatch | selected |
|------|--------------|------|------------|----------|
| 1 | Pensjonat / lokale OZN | 0.82 | **12** | **tak** |
| 2 | budowlana | 0.82 | 0 | nie |
| 3 | elektryczna | 0.82 | 0 | nie |
| 4 | hydrantowa | 0.82 | 0 | nie |

`scanSummary.costDiscovery`:

```text
type: zip_pdf_przedmiar
source: SWZ wraz z załącznikami.zip → KI_Pensjonat_Kamieńskiego_…_PRZEDMIAR.pdf
confidence: 0.84
```

---

## 3. Root Cause

### 3.1 Co się stało (łańcuch)

```text
ZIP (6 plików)
  → 4× PDF *PRZEDMIAR* sklasyfikowane jako zip_pdf_przedmiar
  → discoverBestCostDocument() wybiera JEDEN (titleMatch → Pensjonat)
  → pickCostParseCandidates() może parsować wszystkie 4 PDF
  → session.bestKosztorys = JEDEN snapshot (turniej shouldReplaceBestKosztorys /
       pickBetterKosztorys — bez SUM)
  → tenderDossier.kosztorys = ten jeden PDF (80 pozycji qty, bez cen)
  → Bid / catalog pricing = wycena TYLKO z tych 80 linii
  → UI ~280–293 tys. zł
```

### 3.2 Dlaczego nie „parser nie umie czytać PDF”

Parser **potrafi** czytać zwycięski PDF (`ok: true`, 80 pozycji). Problem nie jest „cichy fail unpack” (CR/CP klasa) — to **model wyboru jednego dokumentu** przy komplecie branżowym.

### 3.3 Ironia titleMatch

Tytuł przetargu zawiera *Kamieńskiego* / *Pensjonat* → wygrywa przedmiar **mieszkanie wytchnieniowe / lokale OZN** (prawdopodobnie **węższy zakres**), a nie `…_b_budowlana_…` (prawdopodobnie główny zakres budowlany). Heurystyka nazwy ≠ komplet oferty.

### 3.4 Skąd rozjazd vs ~1,6 mln Ownera

| Źródło | Szacunek |
|--------|----------|
| System (1 PDF) | ~0,28–0,29 mln |
| Owner (ręcznie, komplet branż) | ~1,6 mln |
| Stosunek | ~**5–6×** — spójne z pominięciem 3 dużych branż |

**Hipoteza Ownera (jeden zamiast kompletu) = POTWIERDZONA** na poziomie architektury + tego fixture.

---

## 4. Obecny model architektury — ONE COST DOCUMENT

### 4.1 Werdykt modelu

| Pytanie | Odpowiedź |
|---------|-----------|
| ONE vs MULTI? | **ONE COST DOCUMENT** |
| Czy świadomie? | **Tak** — jeden `best` / jeden `tenderDossier.kosztorys` |
| Czy „świadomie odrzuca” pozostałe jako duplicate? | **Nie** — nie ma flagi `duplicate` dla branż; są **przegrane w turnieju** |
| Czy unsupported? | **Nie** (ten sam typ `zip_pdf_przedmiar`) |

### 4.2 Gdzie zapada decyzja (komponenty)

| Warstwa | Komponent | Zachowanie |
|---------|-----------|------------|
| **Discovery** | `discoverBestCostDocument` (`tender-cost-discovery.ts`) | Zwraca **jeden** `{ found, type, source, confidence }` — priorytet typu, potem conf, potem `scoreCostTitleMatch` |
| **Kandydaci parse** | `pickCostParseCandidates` (`tender-document-resolver.ts`) | Może zebrać **wiele** PDF/ATH do parse |
| **Sesja heavy** | `prepareTenderDossierParseSession` → `bestKosztorys: null` start | Jedno pole sesji |
| **Wygrana po parse** | `shouldReplaceBestKosztorys` → `pickBetterKosztorys` (`tender-dossier-merge.ts`) | Zostawia **jeden** lepszy snapshot (tier / rows / discoveryWinner) — **bez sumowania** |
| **Persist** | `tenderDossier.kosztorys` | **Jeden** snapshot w modelu dossier |
| **Wycena** | `computeTenderBidProposal` / catalog | Czyta **jeden** `kosztorys` |

### 4.3 Dlaczego ONE zostało przyjęte (kontekst historyczny)

Bez osobnego ADR „MULTI” — wnioski z kodu i serii P2-H / dossier:

1. **Model ATH-first** — typowy WM / lokal: **jeden** ATH (lub jeden silny PDF) jako SSOT wyceny.  
2. **Anti-duplikat jakościowy** — ATH vs PDF vs formularz oferty: turniej jakości (`pickBetterKosztorys`), nie suma zakresów.  
3. **Prosty kontrakt Bid** — `recommendedBidPln` z jednego wejścia ilości/cen.  
4. **Title match (P2-H.5D.2)** — wybór „właściwego” ATH przy wielu wariantach / prawo opcji — zaprojektowane pod **wybór jednego**, nie agregację branż.

ONE działa dobrze gdy: 1 przedmiar = 1 zakres oferty.  
ONE **zawodzi** gdy: N branżowych przedmiarów = 1 oferta (ten fixture).

---

## 5. Czy ONE jest wystarczające?

| Kryterium | Ocena |
|-----------|--------|
| Przetargi 1× ATH / 1× przedmiar | **Tak** — obecny model OK |
| Przetargi multi-branżowe (bud. + el. + san. + …) **jeden pakiet** | **Nie** — systematyczne niedoszacowanie |
| Fixture `08dee335` | **Niewystarczające** — gap rzędu ~1,3 mln vs Owner |
| Omylny titleMatch (węższy plik wygrywa) | Dodatkowe ryzyko nawet przy „największym” jednym pliku |

**Wniosek:** ONE COST DOCUMENT **nie jest wystarczające** jako jedyna strategia dla PL przetargów publicznych z kompletem branżowym. Nie oznacza to, że każdy przetarg wymaga sumy — wymaga **świadomej strategii MULTI z regułami „kiedy sumować / kiedy nie”**.

---

## 6. Analiza biznesowa (PL przetargi publiczne)

### 6.1 Czy często są oddzielne przedmiary branżowe do zsumowania?

**Tak — często**, zwłaszcza przy:

- przebudowie / remoncie budynku użyteczności publicznej,
- pakietach „roboty budowlane + instalacje elektryczne + sanitarne / hydrant / HVAC”,
- dokumentacji projektowej KI rozbitej na branże (`_b_budowlana`, `_b_elektryczna`, …),
- jednym przedmiocie zamówienia (jedna część) obejmującym cały zakres.

Wtedy **oferta wykonawcy** = suma wycen branż (plus ewentualnie koszty ogólne / narzuty wg SWZ) — **nie** wycena jednego pliku „najbardziej podobnego nazwą do tytułu”.

### 6.2 Typowe przypadki

| Przypadek | Działanie biznesowe |
|-----------|---------------------|
| Branże A+B+C w jednym przedmiocie zamówienia | **Sumować** zakresy do oferty |
| Części zamówienia (loty) osobno | **Nie** sumować między lotami — osobne oferty |
| Wariant / oferta wariantowa | **Nie** sumować wariantu z bazą |
| Prawo opcji / zakres opcjonalny | **Osobno** (często wyłączone z oferty bazowej) |
| Ten sam zakres 2× (ATH + PDF / wersja „do poprawy”) | **Nie** sumować — wybrać jedną wersję |
| Etapowanie (etap I / II) gdy zamawiający wymaga oferty na etap | Zależnie od SWZ — **nie** automatycznie całość |
| „Przedmiar zamienny” / alternatywa materiałowa | **Nie** dublować z bazą |

### 6.3 Ryzyka automatycznego sumowania

1. **Podwójne policzenie** tego samego zakresu (ATH + PDF, lub dwa PDF o tym samym zakresie).  
2. **Suma lotów** → oferta nieadekwatna do formularza.  
3. **Wariant + baza** → zawyżona oferta.  
4. **Prawo opcji** wciągnięte do bazy.  
5. **Różne jednostki / niepełne PDF** → suma qty bez sensu biznesowego.  
6. **Fałszywe poczucie kompletności** bez walidacji vs opis przedmiotu zamówienia / formularz cenowy.

### 6.4 Kiedy NIE wolno sumować (checklista)

- osobne **części** zamówienia,
- **warianty** / oferty alternatywne,
- **prawo opcji** / zakresy opcjonalne,
- **duplikaty / wersje** tego samego przedmiaru,
- dokumenty **formularza oferty** (ceny wykonawcy, nie przedmiar inwestora),
- brak pewności, że pliki są **rozłącznymi branżami** tego samego przedmiotu.

---

## 7. Czy wymagany jest EPIC COST-MULTI-01?

### 7.1 Werdykt

**TAK — EPIC COST-MULTI-01 jest wymagany** (planning / strategy).  
W tej sesji: **tylko audyt**. **Bez Design Freeze. Bez implementacji.**

### 7.2 Zakres szkicowy (NIE DF)

Cel epiku (roboczy):

> Umożliwić wykrycie **kompletu** dokumentów kosztowych branżowych i — gdy reguły biznesowe na to pozwalają — zbudować **zagregowany** wejściowy model wyceny (suma zakresów), z jawnym UI „ile dokumentów / które weszły / które wykluczone”, bez cichego ONE.

Szkic workstreamów (do rozbicia w przyszłym DF — **nie w tej sesji**):

| Stream | Temat (szkic) |
|--------|----------------|
| **A — Detect** | Lista wszystkich kandydatów kosztowych (nie tylko `best`) w scan/UI |
| **B — Classify relation** | branża rozłączna vs duplikat vs wariant vs opcja vs lot |
| **C — Aggregate policy** | kiedy SUM / kiedy BEST / kiedy MANUAL HOLD |
| **D — Persist model** | rozszerzenie poza pojedynczy `tenderDossier.kosztorys` (np. `costDocuments[]` + `aggregate`) — **tylko po DF** |
| **E — Bid / OfferBoq** | wejście z agregatu — **tylko po DF**; nie ruszać Bid w ciemno |
| **F — Safety** | anti-double-count · formal offer exclude · prawo opcji (reuse titleMatch depriority) |

**Poza zakresem tej sesji / zakazane do czasu Owner GO + DF:**

- implementacja Multi-ATH / Multi-PDF sum,
- zmiany Bid / COST-PIPELINE / AI Cost / OfferBoq,
- Design Freeze,
- commit / push.

### 7.3 Minimalne pytania na Owner GO (przed DF)

1. Czy domyślnie dla N branżowych PDF w jednym ZIP: **SUM** czy **HOLD + wybór ręczny**?  
2. Czy UI ma pokazywać lukę „wybrano 1 z 4 — wycena niepełna”? (szybki win bez pełnego MULTI)  
3. Czy ATH multi-branżowe ma ten sam priorytet co PDF multi?

---

## 8. Odpowiedzi na checklistę Ownera (1–7)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Ile dokumentów kosztowych wykryto? | **4** PDF przedmiar; **0** ATH/NOR/XLSX/XML |
| 2 | Ile kandydatów? | **4** |
| 3 | Który wybrany? | Pensjonat / lokale OZN PDF |
| 4 | Dlaczego ten? | `scoreCostTitleMatch` vs tytuł (Kamieńskiego / Pensjonat) |
| 5 | Dlaczego pozostałe pominięte? | Turniej ONE winner — nie suma |
| 6 | Flagi? | **Nie** duplicate / unsupported / excluded — status = **not selected (lower titleMatch / lost best-of)** |
| 7 | Per doc | Tabela § 2.4 |

| Architektura | **ONE COST DOCUMENT** |
| Wystarczająca? | **Nie** dla tej klasy |
| EPIC COST-MULTI-01? | **TAK** (zakres szkic § 7.2, **bez DF**) |

---

## 9. Problem — czy naprawdę istnieje?

| Twierdzenie | Status |
|-------------|--------|
| „Parser czyta tylko jeden kosztorys zamiast kompletu” | **POTWIERDZONE** (jeden w wyniku dossier/Bid; wiele wykrytych) |
| „To bug unpack / empty ZIP” | **ODRZUCONE** (`zipUnpackOk`, 4 PDF wykryte) |
| „Dokumenty to duplikaty” | **ODRZUCONE** (osobne branże w nazwach) |
| Rozjazd ~0,28 mln vs ~1,6 mln | **SPÓJNY** z wyceną jednego wąskiego PDF |

**Problem istnieje.** Następny krok: **Owner GO** → (opcjonalnie szybki UX „1 z N”) i/lub **Design Freeze COST-MULTI-01** — **nie** w tej sesji.

---

## 10. Stop

```text
STATUS: AUDIT COMPLETE
IMPLEMENT: ZABLOKOWANY
DESIGN FREEZE: NIE (czekaj Owner GO)
COMMIT / PUSH: NIE
Czekam na Owner GO.
```
