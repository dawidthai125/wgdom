# WGDOM — Przetargi · Architecture Blueprint

> **ID:** WGDOM-TENDER-ARCHITECTURE-BLUEPRINT-01  
> **STATUS:** **ACTIVE** · **NADRZĘDNY BLUEPRINT** implementacji nowego modułu Przetargi  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Tryb powstania:** READ ONLY (projekt architektury produktu) — **bez** implementacji · refaktoryzacji · szczegółów kodu · commit · push  
> **Produkt nadrzędny:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md)  
> **Tip produkcji:** wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
Product SSOT = CO produkt obiecuje.
Ten Blueprint = JAK warstwy i przepływy realizują obietnicę.
AI-COST Freeze / Bid SSOT = silniki wyceny (REUSE).
Foundation Phase 0 = kręgosłup tożsamości · pin · błąd · audyt · event.
Workflow Hub v2.63 = NIE default UX (tryb ekspert / recovery).
FND-06 Observability = poza zakresem (nadal BLOCKED).
════════════════════════════════════════════════════════
```

---

## 0. Założenia projektowe (wiążące)

1. **Zachowujemy** sprawdzone silniki domenowe (dokumenty, dossier, przedmiar/ATH, AI-COST, Bid Proposal, risk/trust, sync pipeline).  
2. **Przebudowujemy** produkt i UX → outcome-first (cena + kosztorys na żądanie).  
3. **Foundation Phase 0** (FND-01…05) staje się **kręgosłupem przebiegu** od kliknięcia do rekomendacji — niewidoczny dla użytkownika.  
4. Użytkownik widzi **tylko wynik** i (opcjonalnie) **pełny kosztorys**.  
5. **Zero drugiego kalkulatora oferty** — Bid Proposal pozostaje SSOT ceny końcowej.  
6. Ten dokument **nie** zawiera plików, API signatures ani planu migracji krok-po-kroku — tylko architekturę produktu i przepływ danych.

---

## 1. Główne komponenty nowej architektury

```text
┌─────────────────────────────────────────────────────────────┐
│  WARSTWA PREZENTACJI (Outcome UI)                           │
│  Lista · Ekran wyniku (cena) · Kosztorys (drill-down)       │
│  [opcjonalnie] Recovery · Decyzja · Satelity                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  ORCHESTRATOR PRZEBIEGU OFERTY (Offer Run)                  │
│  Jedno uruchomienie po 1 kliku · status jakości wyniku      │
│  Emisja eventów · audyt · błędy Foundation                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  SILNIKI DOMENOWE (REUSE)                                   │
│  Discovery/Docs · Requirements · Przedmiar/Dossier          │
│  AI-COST (direct) · Risk/Quality · Bid Proposal (oferta)    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  FOUNDATION PHASE 0 (kręgosłup)                             │
│  FND-01 ID · FND-02 Digest · FND-03 Errors                  │
│  FND-04 Audit · FND-05 Events                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  INFRASTRUKTURA                                             │
│  Persist / Cloud Sync (istniejące klucze tenders)            │
│  Edge BZP / storage dokumentów · Katalog / profil firmy     │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Komponenty (rola produktowa)

| Komponent | Rola |
|-----------|------|
| **Lista przetargów** | Wyszukanie i **jeden klik** startu |
| **Offer Run (przebieg oferty)** | Jednostka pracy autopilota od wyboru do rekomendacji |
| **Orchestrator przebiegu** | Kolejność silników · bramki jakości · agregacja wyniku |
| **Silnik dokumentów** | Pobranie SWZ/załączników · klasyfikacja |
| **Silnik wymagań** | Wadium · ZNWU · gwarancja · terminy · kary · kryteria · docs · udział |
| **Silnik przedmiaru / dossier** | Analiza pozycji · snapshot kosztorysu wejściowego |
| **AI-COST** | Koszt bezpośredni (M/R/S/…) · mapping · explain |
| **Silnik ryzyka / jakości** | Wpływ na pewność i status „wymaga przeglądu” |
| **Silnik Rekomendacji Oferty (Bid Proposal)** | Jedyna rekomendowana cena oferty (PLN) + stack oferty |
| **Ekran wyniku** | Cena + status + CTA kosztorys |
| **Widok kosztorysu** | Pełne rozbicie pozycji (na żądanie) |
| **Foundation** | ID przebiegu · digesty artefaktów · błędy · audyt · eventy faz |
| **Satelity** | Strategia portfelowa · mapa · ustawienia · decyzja GO/HOLD · Robota — **poza** torze 1-kliku |

---

## 2. Co pozostaje bez zmian (silniki / kontrakty)

| Element | Powód zachowania |
|---------|------------------|
| **Bid Proposal** (`computeTenderBidProposal`) | SSOT ceny końcowej oferty (Kp/marża/recommendedBid) |
| **Łańcuch AI-COST S1→S7** (model, mapping, intelligence, pricing, edit, CK, adapter, validation) | Sprawdzona wycena bezpośrednia · Freeze |
| **Adapter AI-COST → Bid** | Jedyna legalna droga `offer_boq_ai` |
| **Discovery / pobieranie dokumentów / ZIP·7z** | Autopilot dokumentów |
| **Klasyfikacja ról dokumentów / completeness** | Wejście do wymagań i przedmiaru |
| **Dossier / kosztorys snapshot / ATH·PDF path** | Wejście do AI-COST |
| **Trust / validation „not ready”** | Fail-loud zamiast fałszywej ceny |
| **Profil firmy · katalog · baza cen** (jako dane wejściowe) | Kalibracja wyceny |
| **Cloud Sync kluczy tenders** (semantyka merge) | Trwałość między urządzeniami |
| **Edge BZP / document bytes** | Źródło dokumentów |
| **Most Tender → Job** | Poza ekranem ceny, po decyzji/wygranej |
| **Foundation Phase 0 API** (id/digest/errors/audit/events) | Kontrakt gotowy — do użycia jako kręgosłup |

*„Bez zmian” = bez przebudowy odpowiedzialności silnika. Opakowanie w Orchestrator / Foundation / nowy UX jest zmianą produktu, nie wymianą kalkulatora.*

---

## 3. Co zostaje zastąpione (produkt / doświadczenie)

| Element obecny | Zastąpienie w blueprintcie |
|----------------|----------------------------|
| **Default: Workflow Hub + Process Strip + sticky CTA** | **Ekran wyniku (cena)**; Hub tylko recovery/ekspert |
| **Obowiązkowa trasa 5 tabów V4** | Jedna powierzchnia wyniku + drill-down kosztorys |
| **AI Cost / Ceny / Decyzja jako równoległe cele podróży** | Jedna rekomendowana cena; reszta opcjonalna |
| **Autonomous „teatr agentów” jako osobny produkt** | Wewnętrzne fazy Offer Run (+ eventy Foundation); UX bez spektaklu |
| **Wiele narracji postępu (strip ∩ trust ∩ analysis ∩ fazy)** | Jeden status jakości wyniku na ekranie końcowym |
| **Strategia-first / głęboki portfel przed ceną** | Satelita portfelowy — nie tor 1-kliku |
| **Przewodnik „co mam zrobić?” jako obietnica** | Autopilot „oto rekomendowana cena” |
| **Brak Foundation w przebiegu** | Offer Run spięty FND-01…05 |

**Nie zastępujemy:** Silnika Bid, łańcucha AI-COST, parserów dokumentów „od zera”.

---

## 4. Granice odpowiedzialności warstw

| Warstwa | Wolno | Nie wolno |
|---------|-------|-----------|
| **Prezentacja (Outcome UI)** | Pokazać cenę · status · kosztorys na żądanie · wejście recovery | Liczyć marżę · parse dokumentów · drugi kalkulator |
| **Orchestrator Offer Run** | Uruchomić silniki w kolejności · agregować wynik · emitować eventy/audyt · ustawić status jakości | Duplikować wzory Bid · obchodzić adapter AI→Bid |
| **Silnik dokumentów** | Pobrać · sklasyfikować · dostarczyć bajty/metadane | Ustalać cenę oferty |
| **Silnik wymagań** | Wyciągnąć warunki przetargowe do modelu przebiegu | Renderować UI Hub |
| **Silnik przedmiaru/dossier** | Zbudować snapshot pozycji | Liczyć Kp/marżę oferty |
| **AI-COST** | Koszt bezpośredni · komponenty · explain · walidacja jakości wyceny | Być drugim generatorem `recommendedBid` |
| **Risk / Quality** | Oznaczyć niepewność · wpływać na status | Ukryć brak danych krytycznych |
| **Bid Proposal** | Jedyna rekomendowana cena oferty + stack | Być pomijany przez UI „dla szybkości” |
| **Foundation** | ID · digest · error · audit · event przebiegu | Być widocznym UI · FND-06 bez Spec |
| **Infra sync/Edge** | Persist i pobranie | Zmieniać semantykę oferty |
| **Satelity (Strategia, Decyzja, Mapa, Ustawienia)** | Portfel · GO/HOLD · konfiguracja | Blokować domyślny widok ceny |

---

## 5. Przepływ danych: klik → rekomendowana cena

```text
[A] Użytkownik wybiera przetarg (1 klik)
        │
        ▼
[B] Utworzenie Offer Run
        · FND-01: runId (+ powiązanie z id postępowania BZP)
        · FND-05: event run.started
        · FND-04: audit run.created
        │
        ▼
[C] Dokumenty
        · pobranie SWZ + załączników
        · klasyfikacja
        · FND-02: digest zestawu dokumentów / kluczowych artefaktów
        · FND-05: event documents.ready | documents.degraded
        · FND-03: błąd krytyczny → status „brak danych” (bez fałszywej ceny)
        │
        ▼
[D] Wymagania przetargowe
        · wadium · ZNWU · gwarancja · terminy · kary · kryteria · docs · udział
        · FND-02: digest modelu wymagań
        · FND-05: event requirements.extracted
        │
        ▼
[E] Przedmiar / dossier
        · analiza pozycji · snapshot kosztorysu wejściowego
        · FND-02: digest snapshotu
        · FND-05: event boq.snapshot.ready
        │
        ▼
[F] AI-COST (koszt bezpośredni)
        · S1…S4 (+ opcjonalnie S5/S5.1 gdy reguły Freeze)
        · FND-05: event aicost.direct.ready
        · FND-02: digest OfferBoq / totals direct
        │
        ▼
[G] Ryzyko / jakość
        · ocena pewności · bramka „wymaga przeglądu”
        · FND-05: event quality.assessed
        │
        ▼
[H] Bid Proposal (Silnik Rekomendacji Oferty)
        · adapter AI-COST → computeTenderBidProposal
        · wynik: recommendedBidPln (+ stack oferty)
        · FND-02: digest wyniku oferty
        · FND-04: audit recommendation.issued
        · FND-05: event offer.recommended
        │
        ▼
[I] Persist przebiegu (istniejący model tenders + artefakty run)
        │
        ▼
[J] Ekran wyniku
        · REKOMENDOWANA CENA OFERTY
        · status jakości
        · [ Pokaż pełny kosztorys ] → widok z [E]+[F] (i explain na żądanie)
```

**Zasada fail-loud:** krytyczny brak na [C]/[E] → przebieg kończy się statusem bez rekomendacji „udawanej”, z możliwością recovery — nie ciszą.

---

## 6. Udział Foundation (FND-01…05) w każdym etapie

| Etap | FND-01 Identifiers | FND-02 Digest | FND-03 Errors | FND-04 Audit | FND-05 Events |
|------|--------------------|---------------|---------------|--------------|---------------|
| **Start Run** | `runId`; powiązanie z id BZP (zewnętrzne ID postępowania **nie** jest zastępowane — jest **wiązane**) | — | walidacja wejścia | `run.created` | `run.started` |
| **Dokumenty** | id artefaktów pobrania / paczki (gdy nowe) | pin zestawu docs | błędy pobrania/klasyfikacji | kto/co uruchomiło discovery | `documents.*` |
| **Wymagania** | id rekordu wymagań (gdy materializowany) | pin modelu wymagań | błędy ekstrakcji | — / opcjonalnie | `requirements.extracted` |
| **Przedmiar** | id snapshotu | pin snapshotu pozycji | błędy parse | — | `boq.snapshot.ready` |
| **AI-COST** | id dokumentu OfferBoq / linii (docelowo; migracja ID osobnym EPIC) | pin direct totals / dokumentu | błędy wyceny | — | `aicost.direct.ready` |
| **Jakość** | — | pin assessment | — | — | `quality.assessed` |
| **Bid / rekomendacja** | id rekomendacji | pin `recommendedBid` + wejść | błąd gdy Bid niemożliwy | `recommendation.issued` (actor=system/run) | `offer.recommended` |
| **UI wyniku** | odczyt `runId` (niewidoczny) | weryfikacja spójności (wewnętrzna) | mapa błędu → status PL | odczyt audytu tylko w trybie expert/audit | brak feedu eventów w UI default |
| **Drill-down kosztorys** | nawigacja po id linii | zgodność z pinem snapshotu | — | — | — |

**Zasady Foundation w tym blueprintcie:**

- Eventy i audyt = **wewnętrzne**; nie budują ekranu „agenci”.  
- Digest = **dowód spójności** rekomendacji względem wejść.  
- ID BZP zewnętrzne **współistnieją** z `runId` Foundation (adapter tożsamości, nie fałszywa migracja numerów postępowań).  
- **FND-06** nie wchodzi do blueprintu produktu (BLOCKED).

---

## 7. Rola AI-COST

| Aspekt | Rola w nowej architekturze |
|--------|----------------------------|
| **Pozycja w łańcuchu** | Warstwa **kosztu bezpośredniego** wewnątrz Offer Run (po przedmiarze, przed Bid) |
| **Dostarcza** | Pozycje · mapping · komponenty M/R/S/… · totals direct · explain · sygnały jakości (S7) |
| **Nie dostarcza** | Ostatecznej ceny oferty z własną marżą/Kp (zakaz SSOT) |
| **UX** | **Nie** jest domyślnym panelem docelowym; zasila wynik i widok kosztorysu |
| **Freeze** | Silniki S1–S7 **reuse**; zmiana obietnicy UI (asysta → autopilot wyniku) = zgodna z Product SSOT, bez drugiego kalkulatora |

---

## 8. Rola Bid Proposal

| Aspekt | Rola |
|--------|------|
| **Nazwa produktowa** | Silnik Rekomendacji Oferty |
| **Odpowiedzialność** | Jedyna **rekomendowana cena oferty (PLN)** oraz stack oferty (Kp, overhead, marża wg reguł Bid) |
| **Wejście** | Adapter z AI-COST (`offer_boq_ai`) + kontekst wymagań/ryzyka wg reguł Bid |
| **Wyjście na UI** | Liczba na ekranie wyniku |
| **Zakaz** | Omijanie Bid „szybszą” sumą w Orchestratorze lub UI |

---

## 9. Rola użytkownika

| Moment | Rola użytkownika |
|--------|------------------|
| **Lista** | Wyszukuje i **wybora** przetarg (1 klik) |
| **Podczas Offer Run** | **Czeka** / widzi stan „trwa wyliczanie” — **nie prowadzi** faz |
| **Ekran wyniku** | Odczytuje **rekomendowaną cenę** i status jakości |
| **Kosztorys** | Opcjonalnie przegląda · (wg reguł Freeze) może korygować pozycje — wtedy przebieg może odświeżyć rekomendację |
| **Recovery** | Gdy brak ceny: uzupełnia krytyczne braki / uruchamia ponownie — bez pełnej podróży Hub jako default |
| **Decyzja biznesowa** | Opcjonalnie STARTUJ / HOLD / ODPUŚĆ **po** cenie |
| **Po wygranej** | Tworzy / otwiera Robotę |
| **Ustawienia** | Profil · katalog · baza cen — **rzadko**, poza torze dnia |

Użytkownik **nie jest** operatorem pipeline’u ani „kolejnego kroku Process Strip” w ścieżce głównej.

---

## 10. Końcowy ekran produktu

```text
════════════════════════════════════════
Przetarg: {nazwa / numer BZP}

REKOMENDOWANA CENA OFERTY

        {XXXXXXXX} PLN

Status: Gotowe | Wymaga przeglądu | Brak danych krytycznych

[ Pokaż pełny kosztorys ]

(opcjonalnie, skrót) 1–3 sygnały ryzyka / „dlaczego ta cena”
════════════════════════════════════════
```

**Po „Pokaż pełny kosztorys”:**

- pełne rozbicie pozycji,  
- explainability na żądanie,  
- bez powrotu do obowiązkowego Huba.

**Poza ekranem domyślnym:** Strategia, Mapa, feed eventów Foundation, panele Autonomous, Process Strip.

---

## 11. Mapa zgodności dokumentów

| Dokument | Relacja |
|----------|---------|
| [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) | **Nadrzędny produkt** — ten Blueprint go realizuje |
| [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) / Freeze | Silniki wyceny bezpośredniej + Bid SSOT |
| [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) | Kontrakt FND-01…05; integracja = EPIC(e) zgodne z tym Blueprintem |
| [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) | Legacy UX prowadzenia — **nie** default; opcjonalny recovery |
| TENDER-ARCH / PRODUCT / VISION | Audyty wejściowe — supersedowane jako „co budować” przez Product SSOT + ten Blueprint |

---

## 12. Kryterium każdej przyszłej zmiany architektury

Zmiana warstw / przebiegu jest **zgodna z Blueprintem** tylko jeśli:

1. Skraca lub chroni ścieżkę **klik → rekomendowana cena**, oraz  
2. Nie tworzy drugiej prawdy ceny, oraz  
3. Nie wypycha Foundation do UI, oraz  
4. Nie obchodzi Bid Proposal, oraz  
5. Przechodzi bramkę Product SSOT §11.

---

## 13. Status dokumentu

| Pole | Wartość |
|------|---------|
| **Blueprint architektury Przetargi** | **TEN PLIK** |
| **Implementacja** | **ZABRONIONA** z samego dokumentu — wymaga osobnych EPIC + Spec + Owner GO |
| **Szczegóły kodu** | **POZA ZAKRESEM** |
| **Commit / push** | Tylko na polecenie Ownera |

---

**Koniec WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.**  
Następne EPIC-e Przetargi: Product SSOT §11 → ten Blueprint → Design Freeze wycinka → dopiero IMPLEMENT.
