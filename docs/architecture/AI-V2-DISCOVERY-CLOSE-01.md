# AI-V2-DISCOVERY-CLOSE-01

> **ID:** AI-V2-DISCOVERY-CLOSE-01  
> **STATUS:** **DISCOVERY CLOSED**  
> **MODE:** DOCUMENTATION ONLY · bez IMPLEMENT / commit / push / migracji / nowych decyzji  
> **Data:** 2026-07-31  
> **Tip odniesienia:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.91**

```text
════════════════════════════════════════════════════════
DISCOVERY CLOSE — AI ARCHITECTURE v2

Faza Discovery = ZAMKNIĘTA.
Nowe decyzje architektoniczne w Discovery = ZAKAZANE.
Kolejne prace = wyłącznie IMPLEMENT zgodny z Design Freeze
  (po Owner GO na thin slice).

Pierwszy slice: Confidence MVP
  SSOT IMPL = CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01
════════════════════════════════════════════════════════
```

---

## 0. Łańcuch Discovery (zamknięty)

| # | Dokument | Rola |
|---|----------|------|
| 1 | [`AI-COST-REAL-BID-AUDIT-01.md`](AI-COST-REAL-BID-AUDIT-01.md) | Jakość wyceny live |
| 2 | [`COMPANY-KNOWLEDGE-AUDIT-01.md`](COMPANY-KNOWLEDGE-AUDIT-01.md) | History ≠ CK S5.1 |
| 3 | [`SCOPE-GAP-ENGINE-AUDIT-01.md`](SCOPE-GAP-ENGINE-AUDIT-01.md) | Luki zakresu RO |
| 4 | [`CONFIDENCE-ENGINE-AUDIT-01.md`](CONFIDENCE-ENGINE-AUDIT-01.md) | Semafor wiarygodności |
| 5 | [`EXPLAINABILITY-ENGINE-AUDIT-01.md`](EXPLAINABILITY-ENGINE-AUDIT-01.md) | Narracja makro |
| 6 | [`AI-ARCHITECTURE-V2-MASTER-AUDIT.md`](AI-ARCHITECTURE-V2-MASTER-AUDIT.md) | Synteza całości |
| 7 | [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md) | **Architektura FROZEN** |
| 8 | [`AI-V2-IMPLEMENTATION-READINESS-01.md`](AI-V2-IMPLEMENTATION-READINESS-01.md) | NOT READY bez thin DF + GO |
| 9 | [`AI-V2-P0-SELECTION-01.md`](AI-V2-P0-SELECTION-01.md) | First IMPL = Confidence MVP |
| 10 | [`CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.md`](CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.md) | Thin DF pierwszego slice |
| 11 | **Ten dokument** | **Zamknięcie Discovery** |

---

## 1. Najważniejsze decyzje architektoniczne

1. **Dwa tory:** ścieżka **wyceny PROD (FROZEN)** oraz ścieżka **asysty RO (fail-soft)** — RO nigdy nie jest wymagana do działania wyceny.  
2. **Pipeline v2:** Pre-map → AI-COST → Bid → SMART → History → Scope Gap → Confidence → Explain MACRO → UI.  
3. **History przed Scope Gap** (gdy obie aktywne) — empiryczne always/frequent.  
4. **Jedno pytanie = jeden moduł (SRP)** — wycena / oferta / Quotes detect / podobne / braki zakresu / pewność / narracja.  
5. **CK S5.1 ≠ History Engine** — ceny z decyzji UI vs benchmark realizacji.  
6. **S4.1 ≠ Explain MACRO** — mikro (linia) vs makro (przetarg).  
7. **S7 ≠ Confidence** — gotowość OfferBoq vs wiarygodność całej analizy.  
8. **ATH historyczne ≠ cennik / generator kosztorysu** — tylko historia, benchmark, walidacja, podobieństwo.  
9. **Pierwszy IMPLEMENT:** Confidence MVP (P0 Selection).  
10. **Umbrella DF ≠ allowlist IMPL** — każdy slice wymaga własnego thin DF + Owner GO.

---

## 2. Świadomie odrzucone rozwiązania

| Odrzucone | Powód |
|-----------|--------|
| Drugi kalkulator oferty / „AI Bid v2” | Naruszenie SSOT Bid |
| Liczenie Kp/marży w AI-COST | FREEZE AI-COST |
| Fuzzy matching w coverage | CC-01 FROZEN · Fuzzy OFF |
| ATH → CK unit prices jako History | Brief Ownera; ryzyko stale prices |
| Scope Gap = auto-insert pozycji | Ma tylko ostrzegać |
| SMART = detektor brakujących robót | SMART = Detect Quotes; Scope Gap = zakres |
| Confidence steruje `recommendedBidPln` | RO only |
| Explainability wylicza koszty | Composer only |
| Scalenie Confidence z S7 | Różne domeny; FREEZE S7 |
| Scalenie Explain MACRO z S4.1 | Mikro vs makro |
| Rozszerzenie CK S5.1 o indeks realizacji | Kolizja nazw i odpowiedzialności |
| Wymaganie History do działania systemu | Łamie uniwersalność (GDDKiA / nowi inwestorzy) |
| Auto-start SMART P1 / MS P2 / Wave 2 z Discovery | Brak Owner GO; ROI/P kolejność osobno |
| Równoległy start 3× P0 w jednym IMPL | Readiness / Selection |

---

## 3. Guardrails (obowiązujące)

Z [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md) G1–G12 — skrót Discovery Close:

| # | Guardrail |
|---|-----------|
| G1 | AI-COST = **jedyny** silnik wyceny pozycji |
| G2 | Bid = **jedyny** kalkulator oferty |
| G3 | SMART = Detect braków **useful Quotes** (nie Alias map; nie scope robót) |
| G4 | History **nie** zmienia wyceny |
| G5 | Scope Gap **nie** dodaje pozycji |
| G6 | Confidence **nie** wpływa na wynik wyceny/oferty |
| G7 | Explainability **niczego nie wylicza** |
| G8–G10 | CK ≠ History · S4.1 ≠ Explain MACRO · S7 ≠ Confidence |
| G11 | Fuzzy / drugi Bid / ATH→CK prices / Scope auto-insert = zakaz bez nowego DF |
| G12 | Payroll / cloud-sync CORE poza thin RO |

---

## 4. Zasady Read Only

Warstwy **History · Scope Gap · Confidence · Explainability MACRO**:

- wyłączny odczyt wyników wyceny i sygnałów,  
- zero mutacji OfferBoq / Quotes / Bid / Library,  
- zero persist jako SSOT wyceny (MVP Confidence: ephemeral),  
- fail-soft: brak warstwy = wycena tip bez zmian.

---

## 5. Zasady REUSE

- **REUSE FIRST** — nowy byt tylko przy luce odpowiedzialności (AUDIT).  
- Oferta → tylko `computeTenderBidProposal`.  
- Mikro explain → S4.1.  
- Detect Quotes → `smart-pricing/detect.ts`.  
- qualityScore OfferBoq → S7 (cytat w Confidence).  
- Scope present → Work Scope + słowniki tip.  
- Benchmark ofert → `tender-cost-calibration`.  
- Mapowanie → CC-01 + `mapOfferBoqDocument`.

---

## 6. Dlaczego istnieje tylko jeden kalkulator Bid

1. **SSOT oferty** — jedna prawda Kp / overhead / marży / `recommendedBidPln`.  
2. **ZERO DUPLICATE LOGIC** — drugi wzór = rozjazd UI vs decyzja biznesowa.  
3. **AI-COST FREEZE** — AI dostarcza **direct**; Bid dokłada warstwę firmy.  
4. **Rollback i audyt** — jedna ścieżka do RCA (np. anomalia narzut×SWZ).  
5. **Zaufanie kosztorysanta** — jedna liczba oferty, nie „AI mówi A, silnik B”.

---

## 7. Dlaczego moduły RO niczego nie mutują

1. **Asysta ≠ wycena** — ostrzeżenia i semafory nie mogą cicho zmieniać oferty.  
2. **Fail-soft / uniwersalność** — brak historii lub szablonów nie psuje tipu.  
3. **Bezpieczeństwo FREEZE** — ochrona AI-COST / Bid / Quotes przed drift.  
4. **Testowalność** — pure functions, łatwy rollback (flaga OFF).  
5. **Zaufanie** — użytkownik decyduje; system nie „dopisuje” robót ani cen w tle.

---

## 8. Główne cele AI v2

1. Zachować **działający** tor wyceny (ATH → map → Quotes → AI-COST → Bid).  
2. Dodać **warstwy decyzji** (pewność, luki zakresu, historia, narracja) **bez** przebudowy rdzenia.  
3. Rozdzielić odpowiedzialności mylone w praktyce (Quotes vs zakres vs zaufanie).  
4. Umożliwić **Thin Slice** wdrożenia (najpierw Confidence MVP).  
5. Zbudować przewagę danych W&G (History) **opcjonalnie**, bez wymogu historii.

---

## 9. Jakie problemy rozwiązuje AI v2

| Problem (Discovery) | Adres |
|---------------------|--------|
| Brak semafora „czy ufać analizie” | Confidence |
| Mywanie „brak Quotes” z „brak roboty” | SMART vs Scope Gap |
| Brak ostrzeżeń typowych luk (wywóz, pomiary…) | Scope Gap |
| Niewykorzystana historia realizacji | History Engine (RO) |
| Rozproszone wyjaśnienia (wiele bannerów) | Explain MACRO |
| Ryzyko drugiego silnika oferty | Guardrail Bid SSOT |
| Coverage / mapowanie jako bottleneck | CC-01 + Wave 2 (P1), nie Fuzzy |
| Anomalia Bid (direct ≪ costPrice) | RCA Bid (P0 docs → DF), nie Confidence |

---

## 10. Problemy świadomie poza zakresem Discovery / AI v2 asysty

| Poza zakresem | Uwaga |
|---------------|--------|
| Autonomiczne „wyślij ofertę” | Asysta kosztorysanta |
| Przebudowa parserów ATH/PDF | Osobny EPIC |
| Fuzzy ON | Zakaz bez nowego DF |
| Payroll / cloud-sync CORE | Gate / osobne GO |
| SMART P1 One-shot jako first ship | ROI niski; P2 |
| MARKET-SYNC P2 / CM-04 P3 | Backlog Owner GO |
| Auto-insert pozycji z Scope Gap | Świadomie OUT |
| Hardcode cen / targetu oferty | Zakaz |
| Pełne porównanie z nagrodami BZP bez Calibration seed | Dane puste — P1 ops |
| Implementacja bez Owner GO | Readiness: NOT READY |

---

## 11. Stan po zamknięciu Discovery

| Element | Stan |
|---------|------|
| Discovery | **CLOSED** |
| Architektura AI v2 | **DESIGN FREEZE · FROZEN** |
| Pierwszy thin DF | **Confidence MVP · FROZEN** (czeka GO) |
| IMPLEMENT | **BLOCKED** do Owner GO na Confidence MVP |
| Tryb projektu tip | **UTRZYMANIE** do GO |

### Dozwolone po tym dokumencie

```text
Owner GO → IMPLEMENT Confidence MVP
  wyłącznie wg CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01

Docs równoległe (nie Discovery architektury):
  RCA Bid anomaly · thin DF Scope Gap (gdy Owner wybierze)
```

### Niedozwolone

```text
Nowe decyzje zmieniające AI-ARCHITECTURE-V2-DESIGN-FREEZE
bez świadomego superseding DF + Owner GO.
IMPLEMENT poza allowlist thin DF.
Auto-start Scope / History / Explain bez GO.
```

---

## 12. Formalne zamknięcie

```text
AI-V2 DISCOVERY = CLOSED
Data: 2026-07-31
Następna faza: IMPLEMENT (gated) — Confidence MVP
Dokument zamykający: AI-V2-DISCOVERY-CLOSE-01
```

**DISCOVERY CLOSE COMPLETE · DOCUMENTATION ONLY · NO IMPLEMENTATION**
