# WGDOM — AI-COST-01 SSOT (Single Source of Truth)

> **ID:** AI-COST-01-SSOT  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **ACTIVE** · powiązany z **ARCHITECTURE FREEZE**  
> **Data:** 2026-07-27  
> **Freeze:** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md)  
> **Język:** polski

```text
ZERO DUPLICATE LOGIC — jedna reguła na concern.
Jeżeli dodajesz drugi kalkulator oferty lub drugą ścieżkę Kp/marży = naruszenie SSOT.
```

---

## 1. Jedyne źródła prawdy

| Concern | SSOT (plik / API) | Nie duplikować w |
|---------|-------------------|------------------|
| Lista pozycji z dokumentów | `TenderKosztorysSnapshot` (dossier) | Lokalne „parse jeszcze raz” w UI kosztorysu |
| Model kosztorysu AI | `OfferBoqDocument` · `tender-offer-boq.ts` | Osobny „CostEstimate v2” |
| Mapowanie katalogowe | `mapOfferBoqDocument` · `tender-offer-boq-mapping.ts` | Drugi matcher w panelu |
| Klasyfikacja / strategia | `applyOfferBoqCostIntelligence` | LLM/klasyfikator równoległy bez DF |
| Ceny komponentów / direct | `applyOfferBoqPricing` · `tender-offer-boq-pricing-engine.ts` | Ręczne sumy oferty w AI-COST |
| Decyzje użytkownika na komponencie | `editStatus` + `changeHistory` · preservacja w reprice | Nadpisywanie AI „dla wygody” |
| Wiedza firmy | `tender-offer-boq-company-knowledge.ts` | Osobna baza cen w Bid |
| **Oferta końcowa (Kp, marża, bid)** | **`computeTenderBidProposal`** · `tenders-bid-calculator.ts` | Adapter S6 **nie** liczy marży lokalnie |
| Wejście AI → Bid | `integrateOfferBoqWithBidProposal` · tryb `offer_boq_ai` | Direct „ręcznie” omijające adapter |
| Walidacja / gotowość | `evaluateOfferBoqValidation` | Osobny scoring w UI |
| Tip wersji prod | `docs/AI/09_PRODUCTION_BASELINE.md` | Hardcode w rules / MASTER bez linku |

---

## 2. Przepływ danych (kanoniczny)

```text
kosztorys.snapshot
  → buildOfferBoqFromSnapshot          (S1)
  → mapOfferBoqDocument                (S2)
  → applyOfferBoqCostIntelligence      (S3)
  → applyOfferBoqPricing               (S4)  (+ leadingProviders: company_knowledge)
  → [opcjonalnie] patch/approve        (S5)
  → learnFrom… / provider              (S5.1)
  → integrateOfferBoqWithBidProposal   (S6)
       payload.directInput ──► computeTenderBidProposal
       ◄── proposal (Kp, margin, recommendedBid, costStack)
  → mergeOfferBoqBidProposalIntoDocument
  → evaluateOfferBoqValidation         (S7)
  → presentOfferBoqExplainabilityView  (UI RO)
```

**Zasada:** po edycji użytkownika — reprice **zachowuje** chronione komponenty; pełna oferta wymaga **ponownej** integracji S6 (totals bid nie żyją w S4).

---

## 3. Relacje między modułami

| Od | Do | Kontrakt |
|----|-----|----------|
| S1 | S2–S7 | `OfferBoqDocument` |
| S3 | S4 | `costIntelligence` (strategy → component specs) |
| S4 | S6 | `totals.directPln` / komponenty (bez Kp) |
| S5 | S4 | reprice merge po stable key |
| S5.1 | S4 | `OfferBoqPriceSourceProvider` |
| S6 | Bid SSOT | `offerBoqDirect` |
| S6 | S7 | `TenderBidProposal` + documentWithTotals |
| S7 | UI | issues + **grupy** rekomendacji |

---

## 4. Bid Proposal = jedyny generator oferty

1. AI-COST produkuje **koszt bezpośredni** (i explainability).  
2. Adapter buduje wejście `offer_boq_ai`.  
3. **Tylko** `computeTenderBidProposal` wylicza Kp, overhead, marżę, `recommendedBidPln`, `costStack`.  
4. UI oferty odczytuje wynik Bid — nie inventuje własnej marży.

**Zakaz:** kopiowanie wzorów Kp/marży do `tender-offer-boq-*.ts`.

---

## 5. Zakazane duplikacje logiki

| Antywzorzec | Dlaczego zakaz |
|-------------|----------------|
| Drugi „AI Bid Calculator” | Rozjazd z Bid Proposal |
| Liczenie oferty w Pricing Engine | Łamie kontrakt S4 |
| Nadpisywanie user_changed przy reprice | Utrata pracy kosztorysanta (RWAT P1) |
| 1:1 rekomendacja na każdy komponent bez grup | Szum UX (RWAT P1) |
| Fuzzy CK na nazwach „Materiał”/„Robocizna” | Fałszywe trafienia |
| Nowy parser PDF w AI-COST | Osobny EPIC / REUSE dossier |
| Tip wersji w wielu plikach | Drift vs `09` |

---

## 6. Gdzie szukać w kodzie (mapa szybka)

| Potrzeba | Start |
|----------|-------|
| Typy dokumentu | `src/lib/tender-offer-boq.ts` |
| Pipeline present | `presentOfferBoqExplainabilityView` / `buildOfferBoqExplainabilityView` |
| Panel UI | `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` |
| Testy slice | `scripts/test-cost-s*.mjs` · `scripts/test-cost-stab-01.mjs` |
| Freeze / lekcje | `docs/architecture/WGDOM-AI-COST-01-*` |
