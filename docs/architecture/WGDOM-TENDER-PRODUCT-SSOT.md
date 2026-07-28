# WGDOM — Przetargi · Product SSOT

> **ID:** WGDOM-TENDER-PRODUCT-SSOT-01  
> **STATUS:** **ACTIVE** · **NADRZĘDNY SSOT PRODUKTU** dla EPIC-ów modułu Przetargi  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Tryb powstania:** READ ONLY (synteza) — bez implementacji · bez migracji · bez zmian kodu  
> **Tip produkcji (wersje):** wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
Ten dokument = JEDYNA nadrzędna obietnica produktu „Przetargi”.
Architektura / Freeze AI-COST / Workflow UI = dokumenty wykonawcze.
Gdy konflikt UX: ten SSOT > historyczne ekrany Hub / 5 tabów / Strategia-first.
Gdy konflikt silnika oferty: Bid Proposal pozostaje SSOT ceny końcowej
  (patrz AI-COST Freeze) — ten dokument definiuje CO produkt obiecuje,
  nie jak przebudować kalkulator.
════════════════════════════════════════════════════════
```

---

## 0. Źródła syntezy (nie zastępują tego SSOT)

| Dokument | Rola względem tego SSOT |
|----------|-------------------------|
| **TENDER-VISION-01** | Wizja Ownera — obietnica „1 klik → cena” |
| **TENDER-PRODUCT-01-AUDIT** | Stan UX / procesu vs wizja |
| **TENDER-ARCH-01-AUDIT** | Skala i szwy (kontekst; nie reguły kodu tutaj) |
| [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) | Historyczny SSOT Workflow Hub (prowadzenie krokami) — **superseded jako obietnica produktu** przez ten plik; może pozostać trybem eksperta |
| [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) | Freeze silników asysty wyceny — reuse; **rola produktowa** podlega temu SSOT |
| [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) | Kontrakt techniczny (niewidoczny UX) |
| [`../AI/MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md) | Stan sesji / NEXT EPICS |

**DEPRECATED jako nadrzędna wizja produktu Przetargi:** traktowanie Workflow Hub + 5 tabów V4 + Strategia jako docelowego doświadczenia „codziennego”.

---

## 1. Główna obietnica produktu

**Po wybraniu jednego przetargu WGDOM automatycznie przygotowuje kompletną rekomendację ceny oferty.**

Użytkownik nie prowadzi analizy krok po kroku.  
System wykonuje pracę.  
Użytkownik dostaje **jedną rekomendowaną cenę** i opcjonalnie pełny kosztorys.

```text
Wyszukaj przetarg → jeden klik → automatyczna praca WGDOM
  → REKOMENDOWANA CENA OFERTY (PLN)
  → [ Pokaż pełny kosztorys ]
```

---

## 2. Cel modułu Przetargi

Umożliwić firmie budowlanej (W&G DOM) **szybkie, wiarygodne ustalenie ceny startowej oferty** na podstawie dokumentów postępowania — bez ręcznego przechodzenia przez wiele ekranów analizy.

Cel operacyjny dnia Ownera:

1. Wybrać postępowanie.  
2. Otrzymać rekomendowaną cenę oferty.  
3. (Opcjonalnie) przejrzeć kosztorys / wyjaśnienia.  
4. (Opcjonalnie) podjąć decyzję biznesową STARTUJ / HOLD / ODPUŚĆ.  
5. (Po wygranej) przejść do realizacji w Robotach.

---

## 3. Zakres odpowiedzialności modułu

Moduł **odpowiada za**:

| Obszar | Odpowiedzialność |
|--------|------------------|
| **Wybór postępowania** | Lista / wyszukanie / otwarcie jednego przetargu |
| **Automatyczna praca po wyborze** | Pobranie SWZ i załączników · klasyfikacja · odczyt wymagań · analiza przedmiaru · wycena · ryzyko · marża · kosztorys · rekomendowana cena |
| **Wynik** | Rekomendowana cena oferty + dostęp do pełnego kosztorysu |
| **Jakość wyniku** | Bramki „gotowe / wymaga przeglądu / brak danych krytycznych” — bez fałszywej pewności |
| **Explainability (na żądanie)** | Skąd wzięła się cena · kluczowe ryzyka · źródła dokumentów |
| **Most do realizacji** | Po decyzji biznesowej / wygranej — powiązanie z Robotą |
| **Ustawienia wspierające** | Profil firmy · katalog · baza cen · słowa kluczowe — **poza** ścieżką 1-kliku |

Wymagania odczytywane i wykorzystywane automatycznie (lista produktowa):

- wadium  
- zabezpieczenie należytego wykonania  
- okres gwarancji  
- terminy  
- kary umowne  
- kryteria oceny  
- wymagane dokumenty  
- warunki udziału  

Wycena automatyczna obejmuje m.in.:

- materiały · robociznę · sprzęt · podwykonawców · koszty pośrednie · ryzyko · propozycję marży  

Wyniki generowane automatycznie:

1. **Pełny kosztorys** (rozbicie pozycji)  
2. **Rekomendowana cena startowa / cena oferty**

---

## 4. Czego moduł nie powinien robić

| Zakaz produktowy | Uzasadnienie |
|------------------|--------------|
| Wymagać od użytkownika przejścia 5+ zakładek, aby zobaczyć cenę | Łamie obietnicę 1-kliku |
| Traktować Workflow Hub / Process Strip jako **domyślny** cel dnia | Hub = tryb eksperta / recovery, nie obietnica |
| Być autonomicznych „wyślij ofertę na platformę zamawiającego” | Poza zakresem; WGDOM kończy na rekomendacji ceny (+ przygotowaniu) |
| Pokazywać wnętrzności pipeline jako główny UX | Fazy, gate’y, feed agentów, telemetria = wewnętrzne |
| Mnożyć równoległe „prawdy” ceny oferty | Jedna rekomendowana cena oferty na ekranie wyniku |
| Mieszać tor wyceny z głęboką Strategią portfelową | Strategia ≠ ścieżka 1-kliku jednego przetargu |
| Regresować Listę Płac / Cloud Sync CORE „przy Przetargach” | Boundary #CORE-013 — poza tym SSOT, ale obowiązuje globalnie |
| Udawać pełną pewność przy brakach krytycznych | Fail-loud / „wymaga przeglądu” > cicha zła cena |
| Wymagać ręcznej naprawy statusów UI, gdy silnik może dokończyć | Automatyzacja > przewodnik |

**Poza rdzeniem (dozwolone jako satelity, nie jako tor główny):** mapa, głęboka Strategia, ustawienia katalogu, kwalifikacja formalna szczegółowa, pakiet PDF — jako drill-down lub rzadkie wejścia.

---

## 5. Docelowy workflow użytkownika

```text
[1] Moduł Przetargi → Lista (wyszukanie / filtr)
        │
        ▼
[2] Jeden klik w wybrany przetarg
        │
        ▼
[3] WGDOM wykonuje automatycznie całą pracę
    (dokumenty → wymagania → przedmiar → wycena → ryzyko → marża → kosztorys → cena)
        │
        ▼
[4] Ekran wyniku (default)
        │
        ├─► [Opcjonalnie] Pokaż pełny kosztorys / explain / dokumenty źródłowe
        │
        └─► [Opcjonalnie] Decyzja biznesowa STARTUJ / HOLD / ODPUŚĆ
                │
                └─► [Po wygranej] Utwórz / otwórz Robotę
```

**Zasada:** kroki [3] są **niewidoczne jako obowiązkowa trasa UI**. Użytkownik czeka na wynik lub od razu widzi wynik, gdy gotowy.

**Tryb ekspert / recovery** (gdy brak ceny): ograniczony wgląd w braki (dokumenty, krytyczne luki) — bez przywracania pełnej podróży Hub→5 tabów jako default.

---

## 6. Docelowy ekran końcowy

```text
════════════════════════════════════
REKOMENDOWANA CENA OFERTY

XXXXXXXX PLN

[ Pokaż pełny kosztorys ]
════════════════════════════════════
```

**Minimum widoczne:**

| Element | Wymagane |
|---------|----------|
| Rekomendowana cena oferty (PLN) | **TAK** |
| Status: gotowe / wymaga przeglądu / brak danych krytycznych | **TAK** |
| CTA: Pokaż pełny kosztorys | **TAK** |

**Dopuszczalne skróty (nie zasłaniające ceny):**

- 1–3 sygnały „dlaczego ta cena” / ryzyka  
- Identyfikator postępowania (numer BZP / nazwa)

**Nie na ekranie domyślnym:**

- Process Strip · sticky „następny krok” · feed agentów · pełna Strategia · tabele statusów pipeline · osobne panele AI vs Bid jako konkurencyjne narracje

---

## 7. Rola AI

AI w Przetargach = **silnik automatycznej analizy i wyceny wspierający rekomendację ceny oferty**.

| AI robi | AI nie robi |
|---------|-------------|
| Klasyfikuje i wspiera odczyt dokumentów / przedmiaru | Nie zastępuje Ownera w decyzji STARTUJ/HOLD jako jedyny akt prawny |
| Wycenia komponenty (M/R/S/…) i wspiera kompletność kosztorysu | Nie wysyła oferty na platformę zamawiającego |
| Wspiera explainability „skąd cena” | Nie ukrywa krytycznej niepewności jako „pewna cena” |
| Działa **po wyborze przetargu, automatycznie** | Nie wymaga od usera ręcznego „uruchom AI” jako głównej ścieżki |

**Relacja do AI-COST (Freeze):** silniki OfferBoq / mapping / pricing / explain **reuse**.  
**Obietnica produktowa** tego SSOT: wynik = **rekomendowana cena oferty** (nie panel asysty jako cel podróży).  
Zmiana roli z „asysta kostorysanta-first” na „autopilot rekomendacji ceny” = **decyzja produktowa Ownera** przy przyszłych EPIC-ach (nie obchodzenie Bid SSOT).

---

## 8. Rola Silnika Rekomendacji Oferty

**Silnik Rekomendacji Oferty** = komponent odpowiedzialny za **jedną liczbę: rekomendowaną cenę oferty (PLN)** oraz spójny kosztorys wejściowy do tej liczby.

| Zasada | Znaczenie |
|--------|-----------|
| **Jedna prawda ceny oferty** | Na ekranie wyniku jest jedna rekomendowana cena — nie dwa konkurencyjne „wyniki” |
| **SSOT kalkulacji końcowej** | Istniejący Bid Proposal (`computeTenderBidProposal`) pozostaje silnikiem finalnej oferty (zgodnie z AI-COST Freeze: zero drugiego kalkulatora Kp/marży) |
| **AI-COST → Bid** | Warstwa AI Cost dostarcza wejście / komponenty / jakość; Bid domyka cenę oferty (w tym marża / Kp według reguł Bid) |
| **Fail-loud** | Brak danych krytycznych → brak „fałszywej” rekomendacji albo status „wymaga przeglądu” |
| **Preservacja decyzji użytkownika** | Jeśli Owner edytuje / zatwierdza pozycje — reprice nie kasuje ich bez reguł (lekcja STAB-01) |

**Nazwa produktowa:** Silnik Rekomendacji Oferty.  
**Nazwa techniczna historyczna:** Bid Proposal (+ adapter OfferBoq). Ten SSOT nie zmienia nazwy plików — zmienia **obietnicę UI**.

---

## 9. Rola Foundation

Foundation Lib Phase 0 (`wgdom-foundation`: id · digest · errors · audit · events) = **niewidoczny kontrakt zaufania autopilota**.

| Pakiet | Rola wobec wizji Przetargi |
|--------|----------------------------|
| Identifiers | Identyfikacja przebiegów / artefaktów (gdy EPIC integracji) |
| Digest | Pin snapshotów wyceny / wejść do rekomendacji |
| Errors | Kontrakt błędów automatyzacji |
| Audit | Audyt „dlaczego ta cena” (append-only) |
| Events | Eventy faz autopilota (nie feed UX) |

**Zasady:**

- Foundation **nie jest** ekranem użytkownika.  
- Foundation **nie zastępuje** Silnika Rekomendacji Oferty.  
- Integracja z Przetargami = **osobny EPIC** (zgodnie z Foundation Phase 0 SSOT) — dopiero gdy służy wiarygodności autopilota.  
- FND-06 Observability = **BLOCKED** do ADR/Blueprint — nie blokuje tego Product SSOT.

---

## 10. Zasady projektowe (obowiązkowe przy każdej przyszłej zmianie)

1. **Outcome-first** — najpierw rekomendowana cena oferty; szczegóły na żądanie.  
2. **Jeden klik → automatyczna praca** — nowe funkcje nie dodają obowiązkowych kroków UI na ścieżce głównej.  
3. **Jedna prawda ceny** — zakaz drugiej narracji „ceny oferty” obok rekomendacji.  
4. **Automatyzacja > przewodnik** — Hub / strip / checklisty nie wracają jako default bez uzasadnienia recovery.  
5. **Anti-przeładowanie** — max skrót na ekranie wyniku; głębokość = drill-down.  
6. **REUSE silników** — nie buduj drugiego kalkulatora oferty; nie przebudowuj parserów „przy AI”.  
7. **Fail-loud jakości** — lepiej „wymaga przeglądu” niż zła pewna cena.  
8. **Decyzja biznesowa ≠ wycena** — STARTUJ/HOLD po cenie (opcjonalnie), nie zamiast ceny.  
9. **Strategia portfelowa ≠ tor jednego przetargu** — nie mieszać w jednym default flow.  
10. **Foundation niewidoczna** — audyt/digest/eventy nie są UI.  
11. **Boundary CORE** — zero mixed FEATURE+Payroll/sync bez Owner GO (#CORE-013).  
12. **Kryterium §11** — każda funkcja przechodzi test rdzenia (poniżej).

---

## 11. Kryteria akceptacji nowej funkcjonalności

### Pytanie bramkowe (obowiązkowe)

> **Czy ta funkcja pomaga użytkownikowi szybciej uzyskać kompletną rekomendację ceny oferty po wybraniu przetargu?**

| Odpowiedź | Skutek |
|-----------|--------|
| **TAK** — bezpośrednio przyspiesza / podnosi kompletność / wiarygodność rekomendacji | Może wejść do **rdzenia** modułu (po Gate + Owner GO gdy wymagane) |
| **TAK, ale tylko jako drill-down / ustawienie / portfel** | **Satelita** — nie blokuje i nie zastępuje ekranu wyniku |
| **NIE** | **Nie należy do rdzenia** — backlog poza tor lub odrzut |

### Checklista akceptacji (rdzeń)

```text
□ Skraca czas od wyboru przetargu do rekomendowanej ceny oferty
  ALBO podnosi kompletność/wiarygodność tej ceny bez wydłużania ścieżki UI
□ Nie dodaje obowiązkowego ekranu przed ceną
□ Nie tworzy drugiej „ceny oferty”
□ Nie wymaga ręcznego przejścia Hub / 5 tabów jako default
□ Szczegóły (jeśli są) są opcjonalne (Pokaż kosztorys / explain)
□ Fail-loud przy braku danych krytycznych
□ Zgodne z Silnikiem Rekomendacji Oferty (Bid SSOT)
□ Boundary CORE / Payroll Safety Gate wypełnione osobno
```

### Przykłady (orientacyjne)

| Funkcja | Werdykt względem rdzenia |
|---------|---------------------------|
| Lepsze auto-pobieranie załączników | **Rdzeń** |
| Wyższa jakość wyceny M/R/S → lepsza cena | **Rdzeń** |
| Ekran wyniku z jedną ceną PLN | **Rdzeń** |
| Nowy panel Strategii przed ceną | **Nie rdzeń** |
| Kolejny status bar obok stripa | **Nie rdzeń** |
| Mapa w torze wyceny | **Nie rdzeń** |
| Decyzja GO po pokazaniu ceny | **Satelita** (po wyniku) |
| Profil firmy wpływający na wycenę | **Satelita ustawień** (wpływ wewnętrzny = OK) |

---

## 12. Relacja do stanu obecnego (skrót — nie plan migracji)

| Warstwa | Ocena względem tego SSOT |
|---------|--------------------------|
| Silniki (docs, dossier, OfferBoq, Bid, risk) | **Reuse** — budują mięśnie pod obietnicę |
| UX Hub / 5 tabów / Strategia-first | **Nie jest docelową obietnicą** — tryb ekspert / legacy relative do SSOT |
| AI-COST Freeze (asysta) | **Silniki TAK** · **domyślna obietnica UI NIE** — przyszłe EPIC-i muszą świadomie domknąć outcome-first |
| Foundation Phase 0 | **Wpisuje się** jako zaufanie autopilota; integracja = osobny EPIC |

---

## 13. Definicja „kompletnej rekomendacji ceny oferty”

Rekomendacja jest **kompletna**, gdy:

1. System dysponuje wystarczającym wejściem (dokumenty / przedmiar lub jawny status braku krytycznego).  
2. Istnieje **jedna** rekomendowana cena oferty (PLN) ze Silnika Rekomendacji Oferty.  
3. Dostępny jest pełny kosztorys (lub jawny powód braku).  
4. Status jakości jest czytelny: gotowe / wymaga przeglądu / brak danych krytycznych.  

„Kompletna” **nie** oznacza: oferta wysłana na platformę ani decyzja STARTUJ podjęta.

---

## 14. Status dokumentu

| Pole | Wartość |
|------|---------|
| **SSOT produktu Przetargi** | **TEN PLIK** |
| **Zmiana obietnicy** | Wymaga aktualizacji tego dokumentu + Owner ACK |
| **Implementacja** | Poza zakresem tego dokumentu |
| **Commit / push** | Tylko na wyraźne polecenie Ownera |

---

**Koniec WGDOM-TENDER-PRODUCT-SSOT.**  
Każdy przyszły EPIC Przetargi zaczyna od pytania §11 i zgodności z §1 (obietnica).
