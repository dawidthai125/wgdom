# AI-ARCHITECTURE-V2 — DESIGN FREEZE

> **ID:** AI-ARCHITECTURE-V2-DESIGN-FREEZE  
> **STATUS:** **DESIGN FREEZE · FROZEN**  
> **MODE:** DESIGN FREEZE ONLY · **bez IMPLEMENT** (do osobnego Owner GO na thin slice)  
> **Data:** 2026-07-31  
> **Tip odniesienia:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.65.91**  
> **Wejście:** [`AI-ARCHITECTURE-V2-MASTER-AUDIT.md`](AI-ARCHITECTURE-V2-MASTER-AUDIT.md) + AUDIT REAL-BID · History/CK · Scope Gap · Confidence · Explainability  
> **Obowiązywanie:** do świadomej decyzji Ownera o zmianie architektury (nowy DF superseding)

```text
════════════════════════════════════════════════════════
DESIGN FREEZE — AI ANALIZA PRZETARGÓW WGDOM v2

Ten dokument ZAMRAŻA decyzje architektoniczne.
Nie jest audytem. Nie jest IMPLEMENT.
Zmiana = nowy Design Freeze + Owner GO.

Pipeline wyceny (PROD) = FROZEN.
Warstwy asysty RO = ZAMROŻONE JAKO KONTRAKT (implementacja = osobne GO).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony kontekst)

```text
Architektura AI v2 dotyczy wyłącznie ścieżki Przetargi / wycena / asysta.
G1–G9 (Payroll): poza zakresem tych modułów RO — ALL-NIE przy thin FEATURE.
Owner GO CORE: NIE (dla Scope/Confidence/Explain/History RO).
Owner GO IMPLEMENT: wymagany per thin slice po tym DF.
```

---

## 1. Finalny pipeline AI v2 (FROZEN)

```text
Documents (SWZ · OPZ · ATH/PDF)
        ↓
TenderKosztorysSnapshot                    ← SSOT pozycji
        ↓
Noise → Normalizer → Negation Guard        ← PRE-MAP (CC-01 FROZEN)
        ↓
Alias | Core → Library / Quotes bind
        ↓
AI-COST S1–S5 (+ CK S5.1 provider w S4)    ← JEDYNY silnik wyceny pozycji
        ↓
Bid SSOT (S6 → computeTenderBidProposal)   ← JEDYNY kalkulator oferty
        ↓
S7 Validation (qualityScore OfferBoq)      ← wewnątrz AI-COST
        ↓
SMART Detect (P0)                          ← Detect braków useful Quotes
        ↓
History Engine (RO)                        ← opcjonalnie; fail-soft
        ↓
Scope Gap Engine (RO)                      ← po History (peers → always-list)
        ↓
Confidence Engine (RO)
        ↓
Explainability Engine MACRO (RO)
        ↓
UI
```

### 1.1 Reguły kolejności (FROZEN)

| # | Reguła |
|---|--------|
| 1 | Ścieżka wyceny **nie czeka** na warstwy RO (RO = lazy / post-compute). |
| 2 | **History przed Scope Gap**, gdy obie aktywne (empiryczne always/frequent). |
| 3 | Scope Gap bez History = reguły szablonowe (nadal legalne). |
| 4 | Confidence po Scope/History (lub po SMART, gdy Scope/History nieaktywne). |
| 5 | Explainability MACRO = **absolutny koniec** łańcucha analitycznego. |
| 6 | S4.1 Explain MICRO pozostaje **wewnątrz** AI-COST (nie zastępuje MACRO). |

### 1.2 Co NIE jest osobnym etapem pipeline

| Element | Gdzie żyje |
|---------|------------|
| Company Knowledge S5.1 | Provider **wewnątrz** AI-COST S4 |
| Calibration store | Dane dla History / UI profilu — nie osobny silnik wyceny |
| MARKET-SYNC | Osobny tor Publish Quotes — nie wstawiać między Bid a SMART jako wymóg |

---

## 2. Granice odpowiedzialności (FROZEN — jedno pytanie na moduł)

| Moduł | Jedyna odpowiedzialność | Nie robi |
|-------|-------------------------|----------|
| **Noise / Normalizer / Negation / Alias\|Core** | Przygotowanie i mapowanie linii → katalog | Wyceny PLN oferty |
| **Library / Quotes** | Dane prac i cen controlled_market | Kalkulacji Bid |
| **AI-COST** | **Jedyny silnik wyceny** kosztu bezpośredniego pozycji (S1–S5) | Kp / marży / recommendedBid |
| **CK S5.1** | Preferencja cen z decyzji UI | Indeksu realizacji ATH; History |
| **S4.1** | Explain **mikro** (linia / komponent) | Narracji całego przetargu |
| **Bid** | **Jedyny kalkulator oferty** końcowej | Dekompozycji przedmiaru |
| **S7** | Gotowość / qualityScore **OfferBoq** | Semafora całej analizy |
| **SMART** | Detect braków **useful Product Quotes** (w tym reason `unmapped`) | Silnika Alias/mapowania; luk zakresu robót; wyceny |
| **History Engine** | Podobne realizacje + benchmark RO | Zmiany wyceny / unit prices z ATH |
| **Scope Gap** | Ostrzeżenia „czego brakuje w zakresie” | Dodawania pozycji; zmiany Bid |
| **Confidence** | Wskaźnik wiarygodności całej analizy | Wpływu na wynik wyceny/oferty |
| **Explainability MACRO** | Narracja „dlaczego taka analiza i oferta” | Wyliczeń kosztów / detect / score |

### 2.1 Precyzja Guardrail SMART (FROZEN)

SMART **nie** jest silnikiem mapowania Alias/Core.  
SMART **odczytuje** skutki mapowania/coverage Quotes i raportuje braki useful ceny (`unmapped` \| `no_quote` \| …).  
Silnik mapowania = pre-map + `mapOfferBoqDocument` (AI-COST S2 / CC-01).

---

## 3. Zasady komunikacji między modułami (FROZEN)

```text
1. Kierunek danych = DAG (bez cykli).
2. Moduł niższy NIE woła wyższego w celu „poprawy” wyceny.
3. Warstwy RO komunikują się wyłącznie przez:
   - immutable input snapshots / ViewModels
   - czyste funkcje (pure)
4. Zakaz side-effect: RO → OfferBoq / Quotes / Bid / Library / KV write wyceny.
5. Explainability i Confidence CYTUJĄ wyniki; nie przeliczają Bid/AI-COST.
6. Scope Gap może CZYTAĆ History peers; nie zapisuje do History.
7. SMART nie jest wejściem do Alias Pack.
```

### 3.1 Kontrakty wyjść (nazwy logiczne — FROZEN)

| Producent | Kontrakt wyjścia (logiczny) |
|-----------|------------------------------|
| AI-COST | `OfferBoqDocument` (+ S4.1 VM, S7 result) |
| Bid | `TenderBidProposal` |
| SMART | `SmartPricingDetectSummary` |
| History | `HistoryBenchmarkViewModel` (peers \| empty) |
| Scope Gap | `ScopeGapReport` / `ScopeGapWarning[]` |
| Confidence | `ConfidenceReport` |
| Explain MACRO | `AnalysisExplanationReport` |

Brak kontraktu = sekcja `available: false` u konsumenta (fail-soft).

---

## 4. Zasady Read Only (FROZEN)

Warstwy **History · Scope Gap · Confidence · Explainability MACRO** są **wyłącznie RO**:

| Zakaz | Dotyczy |
|-------|---------|
| Mutacja `OfferBoqDocument` / linii / komponentów | Wszystkie RO |
| Mutacja Quotes / `commitMarketQuotesImport` | Wszystkie RO |
| Mutacja / przeliczenie Bid | Wszystkie RO |
| Auto-insert pozycji przedmiaru | Scope Gap |
| Persist narracji jako SSOT wyceny | Explainability |
| Sterowanie `recommendedBidPln` scorem | Confidence |

**Dopuszczalne:** ephemeral ViewModel w pamięci sesji UI; telemetria osobnym DF (nie w tym freeze jako wymóg).

---

## 5. Zasady REUSE (FROZEN)

```text
REUSE FIRST — nowy byt tylko gdy AUDIT wykazał lukę odpowiedzialności.
```

| Potrzeba | REUSE (obowiązkowy) | Zakaz nowego |
|----------|---------------------|--------------|
| Wycena pozycji | AI-COST S1–S5 | Drugi Cost Engine |
| Oferta | `computeTenderBidProposal` | „AI Bid v2” |
| Mikro explain | S4.1 / 02-B | Duplikat origin logic |
| qualityScore OfferBoq | S7 | Drugi wzór w Confidence (tylko cytat) |
| Detect Quotes | `smart-pricing/detect.ts` | Scope Gap Detect cen |
| Scope present | `tender-work-scope-inference` + słowniki tip | Równoległy NLP bez DF |
| Benchmark PLN ofert | `tender-cost-calibration` | Osobny store „History money” bez REUSE |
| Mapowanie | CC-01 + `mapOfferBoqDocument` | Fuzzy / drugi matcher bez DF |

**Nowe byty dozwolone wyłącznie jako thin modules (po GO):**  
`realization-history` · `scope-gap` · `confidence-engine` · `explainability-engine` (composer).

**Zakaz:** rozszerzanie CK S5.1 o ATH jako unit-price feed History.

---

## 6. Zasady fail-soft (FROZEN)

| Warunek | Zachowanie |
|---------|------------|
| Brak History peers | History = empty; Scope na regułach; Confidence **neutral** (nie kara); wycena tip **identyczna** |
| Brak Scope Gap (moduł OFF) | Confidence/Explain bez sekcji Scope |
| Brak SMART | Confidence bez SMART penalty (lub unknown); wycena bez zmian |
| Brak dokumentów SWZ | Scope/Confidence obniżają pewność dokumentów — **nie** blokują Bid |
| Parse ATH fail | Istniejące ścieżki dossier/AI-COST — RO nie „naprawiają” parsera |
| Confidence low | Ostrzeżenie UI — **nie** auto-blokada submit (twardszy gate = osobny DF) |

**Zasada nadrzędna:** brak opcjonalnej warstwy RO **nie może** zmienić `OfferBoq` / `TenderBidProposal` względem tipu.

---

## 7. Zasady SSOT (FROZEN)

| Concern | SSOT |
|---------|------|
| Tip wersji | `docs/AI/09_PRODUCTION_BASELINE.md` + `version.json` |
| Lista pozycji z dokumentów | `TenderKosztorysSnapshot` / dossier |
| Model kosztorysu AI | `OfferBoqDocument` |
| Mapowanie katalogowe | `mapOfferBoqDocument` (+ CC-01 pre-map) |
| Oferta końcowa | **`computeTenderBidProposal`** |
| Useful Quotes detect | SMART `detectMissingPrices` |
| Product Quotes dane | Work Catalog / Quotes engine (+ MS commit path) |
| Wiedza cen UI | CK S5.1 store (LS) — ≠ History |
| Architektura AI v2 | **Ten DF** (+ MASTER AUDIT jako uzasadnienie) |

```text
ZERO DUPLICATE LOGIC wyceny i oferty.
Drugi kalkulator Bid / drugi silnik direct = naruszenie DF.
```

---

## 8. Architecture Guardrails (FROZEN — potwierdzenie)

| # | Guardrail | Status |
|---|-----------|--------|
| G1 | **AI-COST jest jedynym silnikiem wyceny** pozycji (direct / komponenty) | **POTWIERDZONE** |
| G2 | **Bid jest jedynym kalkulatorem oferty** (`computeTenderBidProposal`) | **POTWIERDZONE** |
| G3 | **SMART** odpowiada wyłącznie za **Detect braków useful Quotes / coverage cen Quotes** (nie za Alias map engine; nie za scope robót) | **POTWIERDZONE** |
| G4 | **History Engine nie zmienia wyceny** (ani unit prices z ATH) | **POTWIERDZONE** |
| G5 | **Scope Gap nie dodaje pozycji** (tylko ostrzeżenia) | **POTWIERDZONE** |
| G6 | **Confidence nie wpływa na wynik** wyceny/oferty (tylko wskaźnik RO) | **POTWIERDZONE** |
| G7 | **Explainability niczego nie wylicza** (composer narracji; cytuje źródła) | **POTWIERDZONE** |
| G8 | CK S5.1 ≠ History Engine (nazwa i odpowiedzialność rozdzielone) | **POTWIERDZONE** |
| G9 | S4.1 ≠ Explainability MACRO | **POTWIERDZONE** |
| G10 | S7 ≠ Confidence Engine | **POTWIERDZONE** |
| G11 | Fuzzy ON / drugi Bid / ATH→CK prices / Scope auto-insert = **ZAKAZ** bez nowego DF | **POTWIERDZONE** |
| G12 | Payroll / cloud-sync CORE poza zakresem tych RO thin slices | **POTWIERDZONE** |

---

## 9. Roadmap implementacji (FROZEN kolejność — start tylko po Owner GO)

### P0

| # | Praca | Uwagi |
|---|-------|-------|
| P0.1 | **RCA Bid anomaly** | Narzut czasowy × SWZ vs OfferBoq.direct — AUDIT/RCA→DF thin; zaufanie do Bid |
| P0.2 | **Scope Gap Engine RO** | Ostrzeżenia braków zakresu; zero write |
| P0.3 | **Confidence Engine MVP** | Może startować na tip signals (Quotes%, S7, SMART, docs) bez History/Scope |

### P1

| # | Praca | Uwagi |
|---|-------|-------|
| P1.1 | **Explainability Engine MACRO** | Compose-only; REUSE S4.1 + Bid + SMART (+ Confidence) |
| P1.2 | **History Engine** | Index + similarity; REUSE Calibration; nie CK S5.1 |
| P1.3 | **Calibration** (seed / capture submitted·award) | Paliwo History |
| P1.4 | **Coverage Wave 2** | Mapowanie lift; respekt CC FROZEN (bez Fuzzy) |

### P2+ (poza twardym DF v2 start — backlog)

- SMART UX (unmapped vs no_quote) · SMART P1 (gdy ROI) · MS P2 · CM-04 P3 · CK adoption  

```text
Zakaz: start 4 EPIC naraz.
Zakaz: IMPLEMENT z samego tego DF bez jawnego Owner GO na wskazany thin slice.
```

---

## 10. Diagram zamrożony (skrót)

```text
[PROD wycena]
Pre-map → Library/Quotes → AI-COST → Bid → S7 → SMART
                              ↑
                         CK S5.1 (S4)

[RO asysta — fail-soft]
History → Scope Gap → Confidence → Explain MACRO → UI
```

---

## 11. Definition of Freeze

- [x] Finalny pipeline ustalony (History → Scope)  
- [x] Granice SRP / SSOT / RO / REUSE / fail-soft  
- [x] Guardrails G1–G12 potwierdzone  
- [x] Roadmap P0/P1 zamrożona jako kolejność  
- [x] Zakazy architektoniczne jawne  
- [ ] IMPLEMENT — **NIE** w tym dokumencie  

---

## 12. Supersedence

| Dokument | Relacja do tego DF |
|----------|-------------------|
| `AI-ARCHITECTURE-V2-MASTER-AUDIT.md` | Uzasadnienie · evidence · priorytety szczegółowe |
| AUDIT Scope / Confidence / Explain / History / REAL-BID | Wejście decyzyjne — **ten DF je zamyka architektonicznie** |
| `WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md` | Nadal obowiązuje dla S1–S7; ten DF **nie** otwiera AI-COST rewrite |
| Nowy DF w przyszłości | Może supersedować **tylko** przy Owner GO + data |

---

## 13. Status końcowy

```text
AI-ARCHITECTURE-V2 = DESIGN FREEZE · FROZEN
IMPLEMENT = BLOCKED bez Owner GO na thin slice
TRYB PROJEKTU = UTRZYMANIE do GO
```

**DESIGN FREEZE COMPLETE · AI-ARCHITECTURE-V2 · 2026-07-31 · NO IMPLEMENTATION**
