# WGDOM — AI-COST-01 / RWAT-01 — Real World Acceptance Test

> **ID:** RWAT-01  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **ZAKOŃCZONY**  
> **Data:** 2026-07-27  
> **Tip produkcji (kontekst):** UI **2.65.60** · commit tip **`f5ba5ac`** (COST-S7)  
> **Zakres:** wyłącznie test akceptacyjny na rzeczywistych dokumentach — **bez** zmian kodu, refaktorów i architektury  
> **Język:** polski

---

## 1. Cel i zakres

Zweryfikować pełny pipeline AI-COST-01 (S1→S7) na **rzeczywistych** przedmiarach/ATH z live KV (`kw-tenders-pipeline`), bez mocków.

| Dozwolone | Zakazane |
|-----------|----------|
| Odczyt live KV / batch-get | Implementacja funkcji |
| Uruchomienie silników SSOT w pamięci | Poprawki kodu w trakcie testu |
| Ocena UX / wydajności (raport) | Refaktor / zmiana architektury |
| Katalog problemów P0–P3 | Optymalizacje wydajności |

**Definition of Done (Owner):** pełny przebieg · raport PL · problemy ze priorytetami · rekomendacja FIELD READY / nie.

---

## 2. Metoda testu

| Element | Opis |
|---------|------|
| Środowisko | Node + `vite-node`, silniki z `src/lib/tender-offer-boq-*.ts` (te same co UI) |
| Dane | Live Supabase Edge `batch-get` → `kw-tenders-pipeline` + Biblioteka Robót |
| Probe (tymczasowy, poza produktem) | `.tmp/rwat-01-ai-cost-probe.mjs`, `.tmp/rwat-01-quality-dig.mjs` |
| Artefakty | `.tmp/rwat-01-out/report.json`, `.tmp/rwat-01-out/quality-dig.json` |
| Mocki | **Brak** — pozycje z realnych snapshotów `tenderDossier.kosztorys` |

Uwaga metodyczna: Company Knowledge w przeglądarce używa `localStorage`. W Node zapis LS jest niedostępny — weryfikację wiedzy firmy wykonano przez **in-memory** `recordCompanyKnowledgeDecision` + provider (ścieżka produktowa SSOT).

---

## 3. Dokumenty użyte

### 3.1 Inwentarz live (KV)

W `kw-tenders-pipeline` znaleziono **14** przetargów z realnym kosztorysem (`catalogQuantities ≥ 5`, bez formularzy ofertowych), m.in.:

| # | Plik źródłowy | Poz. | Typ |
|---|---------------|------|-----|
| 1 | `SĘPA-SZARZYŃSKIEGO 65a_P_Scalony 24.03.2026_rev1.ATH` | **302** | ATH (TP113 / WM) |
| 2 | `KI_Pensjonat_Kamieńskiego_…_PRZEDMIAR.pdf` | 80 | PDF przedmiar |
| 3 | `Maślicka_8A_m5 PRZEDMIAR (1).pdf` | 100 | PDF |
| 4 | `Nowowiejska 92B_40 - scalony(PRZEDMIAR).pdf` | 158 | PDF |
| 5 | `Przedmiar - 3 Maja 5B_9.pdf` | 178 | PDF |
| … | kolejne ATH/PDF z pipeline | 5–159 | mieszane |

Żaden z przebadanych rekordów nie miał kompletnego `swz` / `fit` w KV w momencie testu — Bid Proposal i tak działał w trybie `offer_boq_ai` (SSOT S6).

### 3.2 Dokument główny (scenariusz pełny)

| Pole | Wartość |
|------|---------|
| **Tender ID** | `08dec13d-5547-aa6d-5fad-9500015c4ea0` |
| **Tytuł** | Remont i przebudowa budynku wielorodzinnego — ul. Sępa Szarzyńskiego 65A, Wrocław |
| **Źródło** | `SĘPA-SZARZYŃSKIEGO 65a_P_Scalony 24.03.2026_rev1.ATH` |
| **Pozycje (CQ)** | **302** |
| **Biblioteka Robót (KV)** | **34** aktywne prace (region aktywny) |
| Uzasadnienie wyboru | Największy realny ATH w pipeline; historycznie używany w recovery TP113 |

### 3.3 Dokument kontrolny (szerokość)

| Pole | Wartość |
|------|---------|
| **Tender ID** | `08dee335-f338-1f30-ebd1-65000155122a` |
| **Źródło** | `KI_Pensjonat_Kamieńskiego_…_PRZEDMIAR.pdf` |
| **Pozycje** | 80 |
| Wynik skrócony | mapowanie **61,3%** · direct **68 060 zł** · Bid OK · oferta **186 300 zł** · unpriced **70** |

---

## 4. Przebieg pipeline (dokument główny)

### Etap A — Import dokumentów

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — live KV, 302 pozycje ATH |
| Dane | `sourceFilename`, `catalogQuantities`, `rowCount=302` |
| Błędy AI | brak |
| Regresja | brak — import nie zmienia KV (read-only) |

### Etap B — Analiza / OfferBoq (S1)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — `buildOfferBoqFromSnapshot` → **302** linii |
| Czas | **~4 ms** |
| Logika | LP, opis, ilość, jednostka zachowane z ATH |

### Etap C — Mapping (S2)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** |
| Trafienia | **174 / 302 (57,6%)** · unmatched **128** · high **116** · medium **58** · low **128** |
| Czas | **~169 ms** |
| Ocena | Oczekiwane przy katalogu 34 prac vs 302 pozycji ATH; nie jest awarią silnika |

### Etap D — AI Cost Intelligence (S3)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — 302/302 z inteligencją |
| Rodzaje | MaterialInstallation 120 · IndividualAnalysis 126 · CivilWorks 30 · Demolition 14 · Measurement 12 · **Unknown 0** |
| Czas | **~16 ms** |
| Jakość | Spot-check: błędna klasyfikacja „Sprzątanie…” → MaterialInstallation (patrz P1-02) |
| Dekompozycja | `decomposedCount=0` w stats S3 — dekompozycja cenowa pojawia się dopiero w S4 (komponenty) |

### Etap E — AI Pricing Engine (S4)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** |
| Koszt bezpośredni | **1 109 435,36 zł** (przed edycją / bez knowledge boost) |
| Agregaty | materiały ~399,8k · robocizna ~489,6k · sprzęt ~12,8k |
| Komponenty | priced **598** · **unpriced 252** |
| Czas | **~13 ms** |
| Logika | Ostrzeżenie Bid: koszt może być **zaniżony** przez brak cen |

### Etap F — Explainability (S4.1)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — uzasadnienia PL na pozycjach |
| Podsumowanie | średnia pewność **niska** · reviewRequired **302/302** · companyKnowledgeHits **0** (przed nauką) |
| Czytelność | Teksty zrozumiałe („Typ pozycji… Strategia… Sygnały…”) |
| UX | Badge pewności + źródła cen obecne w modelu widoku |

### Etap G — Edycja komponentów (S5)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — `user_changed` + historia zmian |
| Przykład | komponent „Materiał”: cena ×1,1 → direct **1 109 435 → 1 109 515** (+80 zł) |
| Approve | **PASS** — `approvedCount=1`, `changedCount=1` |
| Ryzyko | Pełny **reprice** kasuje status edycji użytkownika (patrz P1-04) |

### Etap H — Company Knowledge (S5.1)

| Kryterium | Wynik |
|-----------|-------|
| Działa (in-memory) | **PASS** — 1 wpis po decyzji `changed` |
| Po reprice z providerem | **29** trafień knowledge na dokumencie |
| Persistencja LS w Node | niedostępna (ograniczenie środowiska testu, nie regresja przeglądarki) |
| Uwaga jakości | szerokie dopasowanie nazwy „Materiał” może zawyżać hit-rate (P2) |

### Etap I — Bid Proposal (S6)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** — `pricingMode=offer_boq_ai` |
| Ścieżka audytu | `ai_cost → adapter → bid_proposal → result` |
| Przykładowe kwoty (po knowledge reprice) | direct **1 219 113** · Kp **170 700** · marża **158 900** · oferta **3 337 100** |
| Ostrzeżenia | unpriced + niska pewność — **poprawne fail-loud** |
| Przepływ danych | adapter SSOT → `computeTenderBidProposal` — **bez** drugiego kalkulatora |

### Etap J — AI Validation / Gotowość oferty (S7)

| Kryterium | Wynik |
|-----------|-------|
| Działa | **PASS** |
| Status oferty | **`not_ready` / Niegotowa** |
| Kompletność | **89,4%** |
| AI Quality Score | **8–9 / 100** |
| Critical | **246–252** (`component_unpriced`) |
| Warning | **~1750–1770** (głównie review + low confidence) |
| Rekomendacje | **~2000+** pozycji listy |
| Spójność | critical > 0 ⇒ nie `ready` — **PASS** |

### Etap K — Dokument kontrolny (PDF 80 poz.)

Pipeline S1→S6 **PASS** · Bid OK · unpriced 70 — ten sam wzorzec jakości co ATH.

---

## 5. Walidacja jakości (skrót)

| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| Klasyfikacja pozycji | **Częściowo OK** | Brak Unknown; błędy semantyczne (sprzątanie, częściowo gruntowanie→malowanie) |
| Dekompozycja | **OK technicznie** | 2–3 komponenty/linia; IndividualAnalysis często z 2 unpriced |
| Komponenty | **OK + luki cen** | ~30% bez ceny na ATH 302 |
| Agregacja | **OK** | Sumy M/R/S + direct spójne z komponentami |
| Explainability | **OK** | Uzasadnienia obecne i czytelne |
| Historia zmian | **OK** | Po edycji `changeHistory` ≥ 1 |
| Company Knowledge | **OK (ścieżka)** | Nauka + provider; LS tylko w przeglądarce |
| Bid Proposal | **OK** | Tryb AI, Kp/marża tylko w Bid |
| AI Validation | **OK (fail-loud)** | Poprawnie blokuje gotowość; **zbyt głośna** lista |

### Spot-check (wybrane LP)

| LP | Opis (skrót) | Kind AI | Katalog | Ocena ekspercka |
|----|--------------|---------|---------|-----------------|
| 1 | Sprzątanie piwnic / części wspólnych | MaterialInstallation | `transport_utylizacja` | **Błędne** — to nie montaż materiału |
| 3 | Jednokrotne gruntowanie | MaterialInstallation | `malowanie` | **Dyskusyjne** (grunt ≠ malowanie, ale blisko) |
| 5 | Masa tynkarska | CivilWorks | `gladzie_tynki` | **Sensowne** |
| 21 | Demontaż drzwi | Demolition | `stolarka` | **Sensowne** (rozbiórka + katalog stolarki) |
| 51 | Wymiana okien | MaterialInstallation | `stolarka` | **Sensowne** |
| 203 | Sprawdzenie wyłączania zasilania | IndividualAnalysis | — | **Akceptowalne** jako fallback |

---

## 6. UX (kosztorysant)

| Kryterium | Ocena |
|-----------|--------|
| Czy decyzje AI są zrozumiałe | **Tak** — explainability + badge + źródło ceny |
| Czytelność interfejsu (panel S5–S7) | **Dobra** na poziomie karty pozycji; sekcje Bid / Gotowość czytelne |
| Liczba kliknięć | **Rozsądna** dla ścieżki: otwórz Kosztorys → AI Cost → edycja komponentu → podgląd oferty |
| Intuicyjność pipeline | **Dobra** jako asysta; **słaba** gdy walidacja generuje ~2000 rekomendacji naraz |
| Praktyka dzienna | Bez filtrów/priorytetyzacji listy issue kosztorysant tonie w szumie |

---

## 7. Wydajność (orientacyjnie, bez optymalizacji)

| Etap | Czas |
|------|------|
| KV batch-get | ~1,6 s (sieć) |
| S1 OfferBoq | ~4 ms |
| S2 Mapping | ~169 ms |
| S3 Cost Intelligence | ~16 ms |
| S4 Pricing | ~13 ms |
| S4.1 Explainability | ~64 ms |
| S5 Edit | ~1 ms |
| S5.1 Knowledge (+ reprice) | ~10 ms |
| S6 Bid | ~55 ms |
| S7 Validation | ~58 ms |
| **Suma silników (bez sieci)** | **~390 ms** na 302 pozycje |

| Aspekt | Ocena |
|--------|-------|
| Czas analizy / kosztorysu | **Bardzo dobry** na CPU (sub-sekunda) |
| Płynność UI | Nie mierzono w przeglądarce; model 302×N komponentów + 2k rekomendacji może obciążać render listy |
| Wpływ na przeglądarkę | Potencjalny: duża lista walidacji / rozwinięte karty — **do obserwacji** na prod UI |

---

## 8. Katalog problemów

| ID | Priorytet | Tytuł | Opis / wpływ |
|----|-----------|-------|--------------|
| **RWAT-P1-01** | **P1** | ~30% komponentów bez ceny na realnym ATH WM | 246–252 `component_unpriced` / ~850 komponentów. Bid ostrzega o zaniżeniu. Oferta poprawnie `not_ready`, ale codzienna praca wymaga dużej ręcznej wyceny. |
| **RWAT-P1-02** | **P1** | Błędna klasyfikacja pozycji porządkowych | „Sprzątanie…” → MaterialInstallation + `transport_utylizacja`. Zła strategia wyceny dla oczywistej pozycji. |
| **RWAT-P1-03** | **P1** | Szum walidacji UX | ~1750 warningów, **wszystkie** komponenty `review_required`, ~2000 rekomendacji. Sygnał fail-loud działa, ale lista jest praktycznie nieużywalna bez agregacji/filtrów. |
| **RWAT-P1-04** | **P1** | Pełny reprice kasuje edycje użytkownika | Po `applyOfferBoqPricing` status `user_changed` / historia nie są zachowane (nowe ID komponentów). Ryzyko utraty pracy kosztorysanta przy ponownej wycenie. |
| **RWAT-P2-01** | **P2** | Mapowanie katalogowe ~58% przy 34 pracach | Oczekiwane ograniczenie katalogu, nie awaria silnika — blokuje jakość cen. |
| **RWAT-P2-02** | **P2** | Płaskie szacunki IndividualAnalysis | Różne opisy (docieplenie vs pomiary) zbliżone kwoty szablonowe — wymaga ręcznej korekty. |
| **RWAT-P2-03** | **P2** | Company Knowledge — szerokie trafienia nazwy „Materiał” | Po 1 decyzji: 29 hitów; ryzyko nadmiernego uogólnienia ceny materiału. |
| **RWAT-P2-04** | **P2** | Brak SWZ/FIT w badanych rekordach KV | Bid AI działa; pełny kontekst ofertowy ograniczony. |
| **RWAT-P3-01** | **P3** | AI Quality Score 8–9/100 na pierwszym przebiegu | Spójne z niską pewnością; nie jest błędem silnika. |
| **RWAT-P3-02** | **P3** | RWAT w Node nie weryfikuje persistencji LS | Ograniczenie harnessu; weryfikacja in-memory PASS. |
| **RWAT-P0** | — | *(brak)* | Pipeline nie pada; dane przepływają S1→S7; brak regresji technicznej względem COST-S7. |

---

## 9. Propozycje usprawnień (tylko rekomendacje — bez implementacji)

1. **Agregacja walidacji** — grupuj issue po `code` + top-N; filtr „tylko critical / tylko unpriced”.
2. **Ochrona edycji użytkownika** — reprice nie może nadpisywać `user_changed` / `user_approved` bez jawnej akcji.
3. **Heurystyki klasyfikacji** — sprzątanie / porządki / pomiary elektryczne jako osobne kinds lub reguły przed MaterialInstallation.
4. **Rozszerzenie Biblioteki Robót** — największy dźwigniowy wpływ na unpriced i mapowanie.
5. **Company Knowledge matching** — węższy klucz (nie sama nazwa „Materiał”) + progowanie podobieństwa.
6. **UX „kolejka weryfikacji”** — sortuj po wpływie na direct (najdroższe unpriced najpierw).

---

## 10. Ocena gotowości produkcyjnej

| Warstwa | Status |
|---------|--------|
| Produkcja techniczna (COST-S7) | **PRODUCTION VERIFIED** (wcześniej) — bez zmian w tym teście |
| Pipeline end-to-end na realnym ATH | **PASS** |
| Fail-loud / bezpieczeństwo oferty | **PASS** (`not_ready` przy lukach cen) |
| Przydatność w codziennej pracy kosztorysanta bez dużej korekty | **OGRANICZONA** (P1-01…P1-04) |

### Rekomendacja FIELD READY

> **Nie oznaczamy AI-COST-01 jako FIELD READY.**

Uzasadnienie: RWAT-01 **nie wykazał P0** (silnik działa, dane płyną, Bid + Validation zachowują się poprawnie), ale wykazał **cztery problemy P1** jakości/UX na realnym ATH 302 poz. Status FIELD READY (Owner) wymaga braku P0 **i** P1.

**Rekomendowany status roboczy:**

```text
AI-COST-01 — PRODUCTION VERIFIED
AI-COST-01 — RWAT-01 COMPLETE (NOT FIELD READY)
```

**Kiedy FIELD READY:** po zaadresowaniu minimum P1-01…P1-04 (lub świadomej akceptacji Ownera z ograniczeniem „tryb asysty + obowiązkowa weryfikacja krytycznych”).

**Werdykt dla kosztorysanta dziś:** moduł **nadaje się jako asysta wyceny** (szybki szkic kosztu + explainability + blokada „gotowa oferta”), **nie** jako autonomiczny generator oferty „wyślij bez przeglądu” na dużych ATH WM.

---

## 11. Checklist Definition of Done

| Kryterium | Status |
|-----------|--------|
| Pełny test na rzeczywistych dokumentach | **PASS** (ATH 302 + PDF 80 + inwentarz 14) |
| Zweryfikowany cały pipeline AI-COST-01 | **PASS** (Import→S7) |
| Raport RWAT-01 po polsku | **PASS** (ten dokument) |
| Problemy skatalogowane | **PASS** (§8) |
| Priorytety P0/P1/P2/P3 | **PASS** |
| Rekomendacja gotowości / FIELD READY | **PASS** — **NOT FIELD READY** (są P1) |

---

## 12. Podpis testu

| Pole | Wartość |
|------|---------|
| Wykonawca | Agent Cursor (RWAT-01, Owner GO) |
| Data | 2026-07-27 |
| Tip odniesienia | 2.65.60 / `f5ba5ac` |
| Zmiany kodu produktu | **brak** |
| Commit raportu | oczekuje na polecenie Ownera |

**RWAT-01 — ZAKOŃCZONY.**
