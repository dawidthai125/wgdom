# WGDOM — AI-COST-02 Starting Point

> **ID:** AI-COST-02-START  
> **STATUS:** **BACKLOG** · **bez Design Freeze** · **bez sprintów** · **bez implementacji**  
> **Data:** 2026-07-27  
> **Zależność:** AI-COST-01 **EPIC COMPLETE** · **FIELD READY** · **FROZEN**  
> **Wejście obowiązkowe:** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md)  
> **Język:** polski

```text
TO NIE JEST DESIGN FREEZE ANI PLAN IMPLEMENTACJI.
Owner GO wymagany przed jakimkolwiek AI-COST-02 AUDIT→DF→kod.
```

---

## 1. Co już istnieje (nie zaczynaj od zera)

- Pipeline **S1–S7** + **STAB-01** na prod **2.65.61**.  
- Model `OfferBoqDocument`, komponenty, explainability, walidacja, telemetria lokalna.  
- Integracja z **Bid Proposal** (`offer_boq_ai`).  
- Company Knowledge (LS) + Work Catalog + company cost model.  
- UI: `OfferBoqCostIntelligencePanel`.  
- Testy: `scripts/test-cost-s*.mjs`, `test-cost-stab-01.mjs`.  
- Dokumentacja zamknięcia: Freeze · SSOT · Lessons · RWAT · STAB RR.

---

## 2. Czego nie wolno przebudowywać (start AI-COST-02)

- Rdzenia S1–S7 / kontraktu „direct w AI, oferta w Bid”.  
- Parserów ATH/PDF „żeby nowy EPIC działał”.  
- `computeTenderBidProposal` jako miejsca na logikę AI Cost.  
- Preservacji decyzji użytkownika przy reprice.  
- Architektury Company Knowledge (schema) bez osobnego briefu.

Rozszerzaj **obok** freeze — nie „przez przebudowę”.

---

## 3. Dostępne punkty rozszerzeń

| Punkt | Przykład użycia w AI-COST-02 |
|-------|------------------------------|
| `OfferBoqPriceSourceProvider` | Oficjalny feed / benchmark rynkowy (GO) |
| Reguły S3 | Dalsze kinds/strategie domenowe |
| Heurystyki S4 | Kalibracja na historii ofert |
| S7 grupy rekomendacji | Inteligentna kolejka „najpierw największy wpływ na direct” |
| Telemetria lokalna | Analiza jakości → hipotezy DF |
| Work Catalog | Więcej prac = lepsze mapowanie/ceny |
| Explainability | Porównanie AI vs finalna oferta / konkurencja (RO) |

---

## 4. Proponowane obszary nowych funkcji (tylko kierunki)

1. **Modele cenowe** — bogatsze źródła / region / aktualność (bez scrapingu ad-hoc).  
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

## 6. Jak zaczyna nowa sesja AI-COST-02

```text
1. docs/AI/MASTER_HANDOFF.md
2. docs/AI/AI_ENTRY.md → Gate
3. docs/AI/09_PRODUCTION_BASELINE.md
4. WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
5. WGDOM-AI-COST-01-SSOT.md
6. WGDOM-AI-COST-02-STARTING-POINT.md  ← ten plik
7. Owner GO na wybrany obszar → AUDIT → DF → IMPLEMENT
```
