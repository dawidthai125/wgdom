# WGDOM — AI-COST-02 Starting Point

> **ID:** AI-COST-02-START  
> **STATUS:** **ACTIVE EPIC** · thin slice **COST-02-A = CLOSED** · dalsze obszary **BACKLOG**  
> **Data:** 2026-07-27  
> **Zależność:** AI-COST-01 **EPIC COMPLETE** · **FIELD READY** · **FROZEN**  
> **Wejście obowiązkowe:** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md)  
> **COST-02-A:** [`CLOSEOUT`](WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) · [`RELEASE`](WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) · [`DESIGN-FREEZE`](WGDOM-AI-COST-02-COST-02-A-DESIGN-FREEZE.md) · UI **2.65.62** / **`1e6fb12`**  
> **Język:** polski

```text
TO NIE JEST DESIGN FREEZE ANI PLAN KOLEJNEGO SLICE.
Owner GO + nowy AUDIT→DF wymagany przed każdym następnym thin slice AI-COST-02.
COST-02-A (Modele cenowe) = CLOSED — nie re-implementuj bez briefu.
```

---

## 0. Stan thin slice

| Slice | Status | Tip |
|-------|--------|-----|
| **COST-02-A** Modele cenowe | **EPIC COMPLETE** · **PRODUCTION VERIFIED** · **CLOSED** | **2.65.62** / **`1e6fb12`** |
| Konkurencyjność / predykcja / UX kolejki / CK cloud | **BACKLOG** | — |

---

## 1. Co już istnieje (nie zaczynaj od zera)

- Pipeline **S1–S7** + **STAB-01** (AI-COST-01 **FROZEN**).  
- **COST-02-A:** `createControlledMarketPriceProvider` · origin `controlled_market` · odczyt Work Catalog `marketQuotes`.  
- Model `OfferBoqDocument`, komponenty, explainability, walidacja, telemetria lokalna.  
- Integracja z **Bid Proposal** (`offer_boq_ai`).  
- Company Knowledge (LS) + Work Catalog + company cost model.  
- UI: `OfferBoqCostIntelligencePanel` (+ badge „Benchmark rynkowy”).  
- Testy: `scripts/test-cost-s*.mjs`, `test-cost-stab-01.mjs`, `test-cost-02a-controlled-price-source.mjs`.  
- Dokumentacja: Freeze · SSOT · Lessons · RWAT · STAB RR · COST-02-A DF/RR.

---

## 2. Czego nie wolno przebudowywać (start kolejnego slice)

- Rdzenia S1–S7 / kontraktu „direct w AI, oferta w Bid”.  
- Parserów ATH/PDF „żeby nowy EPIC działał”.  
- `computeTenderBidProposal` jako miejsca na logikę AI Cost.  
- Preservacji decyzji użytkownika przy reprice.  
- Architektury Company Knowledge (schema) bez osobnego briefu.  
- COST-02-A allowlisty „przy okazji” bez nowego DF.

Rozszerzaj **obok** freeze — nie „przez przebudowę”.

---

## 3. Dostępne punkty rozszerzeń

| Punkt | Przykład użycia w AI-COST-02 |
|-------|------------------------------|
| `OfferBoqPriceSourceProvider` | **COST-02-A CLOSED** (controlled market); dalsze oficjalne feedy tylko po GO |
| Reguły S3 | Dalsze kinds/strategie domenowe |
| Heurystyki S4 | Kalibracja na historii ofert |
| S7 grupy rekomendacji | Inteligentna kolejka „najpierw największy wpływ na direct” |
| Telemetria lokalna | Analiza jakości → hipotezy DF |
| Work Catalog | Więcej prac = lepsze mapowanie/ceny |
| Explainability | Porównanie AI vs finalna oferta / konkurencja (RO) |

---

## 4. Proponowane obszary nowych funkcji (tylko kierunki)

1. **Modele cenowe** — **COST-02-A CLOSED** (Work Catalog); bogatsze źródła tylko po nowym DF.  
2. **Analiza konkurencyjności** — pozycjonowanie oferty względem rynku / historii.  
3. **Predykcja szans wygrania** — sygnały z AP2 + ceny (osobny silnik RO).  
4. **UX kosztorysanta** — kolejka weryfikacji, filtry critical, batch approve.  
5. **Cloud sync wiedzy firmy** — jeśli Owner zechce multi-device CK.

Każdy obszar = potencjalny **osobny thin slice** po AUDIT + DF + Owner GO.

---

## 5. Zależności od AI-COST-01

```text
AI-COST-02  depends_on  AI-COST-01 FREEZE + SSOT + FIELD READY
AI-COST-02  must_reuse   Bid Proposal (oferta)
AI-COST-02  must_reuse   OfferBoqDocument (koszt bezpośredni)
AI-COST-02  must_not     fork pipeline S1–S7
```

**AP2** pozostaje źródłem jakości dokumentów / ryzyka — AI-COST-02 nie zastępuje AP2.

---

## 6. Jak zaczyna nowa sesja (kolejny slice AI-COST-02)

```text
1. docs/AI/MASTER_HANDOFF.md
2. docs/AI/AI_ENTRY.md → Gate
3. docs/AI/09_PRODUCTION_BASELINE.md
4. WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
5. WGDOM-AI-COST-01-SSOT.md
6. WGDOM-AI-COST-02-STARTING-POINT.md  ← ten plik
7. WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md (slice CLOSED)
8. Owner GO na wybrany obszar → AUDIT → DF → IMPLEMENT
```
