# AI-V2-P0-SELECTION-01

> **ID:** AI-V2-P0-SELECTION-01  
> **MODE:** **PLANNING ONLY** · READ ONLY  
> **Data:** 2026-07-31  
> **Wejście:** [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md) · [`AI-V2-IMPLEMENTATION-READINESS-01.md`](AI-V2-IMPLEMENTATION-READINESS-01.md) · MASTER AUDIT · REAL-BID  
> **Zakaz:** IMPLEMENT · commit · push · migracje · nowe moduły poza wyborem · projektowanie pełnej architektury

```text
════════════════════════════════════════════════════════
RECOMMENDED FIRST IMPLEMENTATION

→ Confidence MVP (P0.3)

Uzasadnienie skrót:
  najniższe ryzyko · najcieńszy Thin Slice · tip-only inputs ·
  zero mutacji Bid/AI-COST · szybkie PV · zamyka semafor
  decyzji przed cięższym Scope Gap i wrażliwym Bid RCA.
════════════════════════════════════════════════════════
```

---

## 0. Kontekst (bez przebudowy architektury)

Z DF v2 / Readiness:

- Architektura **FROZEN** · IMPLEMENT wymaga Owner GO + thin DF slice.  
- P0 kandydaci: RCA Bid anomaly · Scope Gap MVP · Confidence MVP.  
- Ten dokument **wybiera pierwszy** do ścieżki thin DF → GO → IMPLEMENT.  
- Nie projektuje nowych silników ani nie zmienia pipeline.

---

## 1. Porównanie P0

Skala 1–5 (5 = najlepsze dla „pierwszy do wdrożenia”).

| Kryterium | RCA Bid Anomaly | Scope Gap MVP | **Confidence MVP** |
|-----------|----------------:|--------------:|-------------------:|
| Wartość biznesowa | 5 | 5 | 4 |
| Wpływ na jakość ofert | 4 (zaufanie do kwoty) | **5** (kompletność zakresu) | 3 |
| Wpływ na UX | 3–4 | 4 | **5** |
| Ryzyko implementacji | **5** (Bid CORE-adjacent) | 4 (FP) | **2** |
| Koszt implementacji | 3–4 (RCA+ew. zmiana) | 4 | **2** |
| Zależności | costModel, SWZ days | szablony typów | tip signals only |
| Thin Slice | Średni (najpierw docs RCA) | Dobry po DF szablonów | **Najlepszy** |
| Szybkie PV | Średnie | Dobre (banner) | **Najszybsze** |
| Zgodność z FREEZE | Wymaga ostrożności | RO OK | **RO OK** |
| Blokery z Readiness | Brak thin DF + RCA | Brak thin DF + OD-03/04 | Brak thin DF + OD-05/06 |

### 1.1 RCA Bid Anomaly

| Plus | Minus |
|------|-------|
| Adresuje outlier 4.9× (REAL-BID) — zaufanie do oferty | Pierwszy krok to **RCA docs**, nie kod |
| Wysoka wartość jeśli naprawi model | Dotyka Bid / costModel — najwyższe ryzyko regresji |
| | Readiness: **NOT READY TO CODE** bez RCA+DF |
| | Wolniejsze PV (trzeba case’ów SWZ długość × direct) |

**Wniosek:** krytyczne, ale **nie pierwszy shippable feature** — najpierw domknięcie RCA (docs) równolegle lub tuż przed zmianą Bid.

### 1.2 Scope Gap MVP

| Plus | Minus |
|------|-------|
| Największa luka vs kosztorysant (braki wywozu/pomiarów) | Więcej otwartych decyzji (szablony typów, kody warning) |
| Silny wpływ na jakość ofert | Wyższe ryzyko FP → „wilk” ostrzeżeń |
| RO, zgodne z DF | Thin DF dłuższy niż Confidence |
| | Nie naprawia zaufania do liczby Bid |

**Wniosek:** najlepszy **drugi** P0 (po wzorcu RO Confidence lub po RCA docs).

### 1.3 Confidence MVP

| Plus | Minus |
|------|-------|
| Semafor „czy ufać analizie” przy ofercie | Nie uzupełnia brakujących robót |
| Wejścia już na tipie (Quotes%, S7, SMART, docs) | Nie naprawia anomalia Bid |
| Pure RO · zero write wyceny | Dwa score’y vs S7 — wymaga jasnego copy (OD-06) |
| Najcieńszy slice · najszybsze PV | |
| Uczy zespół wzorca AI v2 RO przed Scope/History | |
| Odblokowuje Explainability P1 | |

**Wniosek:** optymalny **pierwszy IMPLEMENT** (kod + UI).

---

## 2. Wybór

### RECOMMENDED FIRST IMPLEMENTATION: **Confidence MVP**

**Dlaczego ten:**

1. **Readiness:** tip-only, bez History/Scope, bez danych kalibracji.  
2. **Ryzyko:** nie rusza Bid ani AI-COST FREEZE.  
3. **Thin Slice:** jedna pure function + badge UI.  
4. **PV:** jeden przetarg live → score + drivers widoczne.  
5. **Strategia:** najpierw semafor decyzji, potem Scope (kompletność), Bid RCA (poprawność kwoty) na ustabilizowanym UX RO.

### Dlaczego pozostałe poczekają

| P0 | Dlaczego nie pierwszy kod |
|----|---------------------------|
| **RCA Bid Anomaly** | Najpierw **RCA dokument** (hipoteza narzut×SWZ). Zmiana kalkulatora bez RCA = naruszenie ostrożności Bid. Może iść **równolegle jako docs-only**, nie jako pierwszy IMPL UI/feature. |
| **Scope Gap MVP** | Większy koszt DF (szablony OD-03/04), wyższe FP. Lepiej po Confidence (wzorzec RO + miejsce w UI obok semafora) lub bezpośrednio jako **drugi** GO. |

### Kolejność zalecana po wyborze

```text
1) Confidence MVP          ← FIRST IMPLEMENTATION (ten wybór)
2) Scope Gap MVP           ← drugi P0 GO
3) RCA Bid                 ← docs RCA ASAP; IMPL zmiany Bid dopiero po DF
   (RCA docs może startować równolegle do 1, bez blokowania)
```

---

## 3. Thin Slice — Confidence MVP (tylko plan)

> Nie projektuje całego Confidence Engine v2 ani wag History/Scope.  
> Minimalny produkt zgodny z DF v2 fail-soft.

### 3.1 Minimalny zakres (IN)

| Element | Zakres MVP |
|---------|------------|
| Lib | Pure `buildConfidenceReport(inputs) → ConfidenceReport` |
| Inputs tip | Quotes coverage % · mapped/unmapped % · S7 `qualityScore` (cytat) · SMART missing % / byReason · doc completeness (prosty sygnał) · Bid `ok` + liczba warnings |
| UI | Badge „Pewność analizy” 0–100 + band low/medium/high + 3–5 drivers (expand) |
| Copy | Disclaimer: nie zmienia wyceny; rozróżnienie od S7 „gotowość wyceny” |
| Persist | **Brak** (RO ephemeral) |
| Flaga | Opcjonalnie LS default OFF lub ON — decyzja w thin DF (OD-07 analog) |

### 3.2 OUT (zakaz w MVP)

- History / Scope Gap jako wymagane wejścia  
- Wpływ na Bid / OfferBoq / Quotes  
- Drugi wzór S7 (tylko odczyt)  
- Blokada złożenia oferty przy low  
- Pełny Explainability MACRO panel  

### 3.3 Wejścia / wyjścia

```text
WE:
  OfferBoqDocument (metryki)
  SmartPricingDetectSummary (opc.)
  S7 validation result (qualityScore)
  Bid proposal (ok, warnings.length)
  Prosty doc signal (ma SWZ/przedmiar?)

WY:
  ConfidenceReport {
    score0to100, band, drivers[], disclaimerPl, computedAt, formulaVersion
  }
```

### 3.4 Kryteria DONE

- [ ] Thin Design Freeze Confidence MVP zaakceptowany + Owner GO  
- [ ] Pure function + unit test (stałe fixture → stabilny score)  
- [ ] UI badge widoczny w Kosztorys/Oferta (miejsce wg DF)  
- [ ] Drivers wyjaśniają min. coverage + SMART + S7  
- [ ] Brak mutacji wyceny (review diff)  
- [ ] Build + relevant smoke PASS  
- [ ] Changelog tylko jeśli widoczne UI (wg procesu release)  

### 3.5 Kryteria sukcesu (PV)

| # | Sukces |
|---|--------|
| S1 | Na tenderze z Quotes ~78% band ≠ low bez powodu |
| S2 | Na tenderze z wysokim unmapped (np. elewacje ~67%) score **niższy** niż gold case (np. 08debcad 100% Quotes) |
| S3 | Zmiana score **nie** zmienia `recommendedBidPln` |
| S4 | Operator rozumie różnicę vs S7 (smoke copy / OV) |

### 3.6 Wpływ na istniejącą architekturę

| Obszar | Wpływ |
|--------|-------|
| AI-COST / Bid / SMART / CC-01 | **Brak zmian kontraktu** — tylko odczyt |
| Pipeline DF v2 | Wstawia Confidence RO po SMART (Scope/History = absent → fail-soft) |
| SSOT | Nowy byt `confidence-engine` zgodny z DF — nie drugi Bid |
| Payroll / sync | ZERO |

### 3.7 Wpływ na użytkownika

- Widzi **semafor wiarygodności** przy analizie/ofercie.  
- Wie, kiedy **nie ufać** „ładnej” liczbie (niski score → sprawdź unmapped / docs).  
- Bez wymuszania nowych kroków workflow.  
- Przygotowuje grunt pod Scope Gap warnings i Explain „dlaczego”.

### 3.8 Szacunek (orientacyjny)

| | |
|--|--|
| Koszt | Niski (1 thin slice) |
| Ryzyko | Niskie |
| Czas do PV | Najkrótszy z P0 |

---

## 4. Następne kroki formalne (bez IMPLEMENT w tej sesji)

```text
1. Owner akceptuje: RECOMMENDED FIRST = Confidence MVP
2. Thin DESIGN FREEZE: CONFIDENCE-ENGINE-01-MVP (IN/OUT/AC/wagi MVP)
3. Owner GO IMPLEMENT
4. IMPLEMENT → TEST → (commit/push tylko na polecenie)
5. Równolegle (docs): RCA Bid anomaly
6. Następny GO: Scope Gap MVP
```

---

## 5. Jednoznaczna rekomendacja

```text
RECOMMENDED FIRST IMPLEMENTATION

Confidence MVP (P0)

Uzasadnienie:
• Najcieńszy, najbezpieczniejszy Thin Slice AI v2 RO.
• Działa na danych tip bez History/Calibration.
• Nie narusza AI-COST FREEZE ani Bid SSOT.
• Szybka weryfikacja produkcyjna (score + drivers).
• Buduje wzorzec asysty RO przed Scope Gap (wyższe FP)
  i przed zmianami Bid (wyższe ryzyko regresji).

Scope Gap MVP — drugi P0 (jakość kompletności ofert).
RCA Bid Anomaly — docs RCA równolegle; kod Bid dopiero po DF.
```

**PLANNING ONLY · NO IMPLEMENTATION · AI-V2-P0-SELECTION-01 · 2026-07-31**
