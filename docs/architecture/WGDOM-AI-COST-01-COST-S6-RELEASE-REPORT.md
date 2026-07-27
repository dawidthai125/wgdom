# WGDOM — AI-COST-01 / COST-S6 RAPORT WYDANIA

> **ID:** COST-S6  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **RELEASE GO** · **READY FOR PV** (po push)  
> **Data:** 2026-07-27  
> **UI:** **2.65.59**  
> **DF:** [`WGDOM-AI-COST-01-COST-S6-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S6-DESIGN-FREEZE.md)  
> **Prior:** COST-S5.1 `2.65.58` / `973821f`  
> **Język:** polski

---

## 1. Cel

AI Cost dostarcza koszt bezpośredni i metadane. Końcowa oferta (Kp, narzuty, marża, cena rekomendowana) wyłącznie przez **REUSE** `computeTenderBidProposal` — bez drugiego kalkulatora.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Adapter | `tender-offer-boq-bid-adapter.ts` — payload · audit trail · merge totals |
| Bid Proposal | tryb `offer_boq_ai` + `offerBoqDirect` (tail Kp/marży bez zmian) |
| Explainability | sekcja „Wpływ AI na ofertę” + podsumowanie oferty |
| UI | costStack SSOT · ścieżka audytu 4 kroki |
| Changelog | **2.65.59** |

**Nienaruszone:** parsery · Pricing Gate · Autonomous Gate · logika Kp/marży (tylko rozszerzone wejście).

---

## 3. Pliki

- `src/lib/tender-offer-boq-bid-adapter.ts` (**NOWY**)
- `src/lib/tenders-bid-calculator.ts`
- `src/lib/tender-bid-quality.ts`
- `src/lib/tender-offer-boq-explainability.ts`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `scripts/test-cost-s6-bid-proposal-integration.mjs` (**NOWY**)
- changelog · DF · RELEASE · `09` · `CURRENT-TASK`

---

## 4. Testy / build

| | |
|--|--|
| `test-cost-s6-bid-proposal-integration.mjs` | **PASS** |
| `test-cost-s5.1-company-knowledge.mjs` | **PASS** |
| `test-cost-s5-component-edit.mjs` | **PASS** |
| `test-cost-s4.1-explainability.mjs` | **PASS** |
| `npm run build` | **PASS** |

---

## 5. Kryteria akceptacji

| Kryterium | Status |
|-----------|--------|
| Adapter bez logiki Kp/marży | **PASS** |
| Wyliczenia końcowe przez Bid Proposal | **PASS** |
| Explainability wpływ AI | **PASS** |
| Panel podsumowania oferty | **PASS** |
| Ścieżka audytu | **PASS** |
| REUSE FIRST | **PASS** |
| RR · commit · push · tip | po push |

---

## 6. Gate

G1–G9 **ALL-NIE** · Owner GO: YES
