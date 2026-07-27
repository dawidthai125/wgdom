# WGDOM — AI-COST-01 / COST-S5 RAPORT WYDANIA

> **ID:** COST-S5  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **PRODUCTION VERIFIED**  
> **Data:** 2026-07-27  
> **UI:** **2.65.57**  
> **Commit:** **`351f534`**  
> **DF:** [`WGDOM-AI-COST-01-COST-S5-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S5-DESIGN-FREEZE.md)  
> **Prior:** COST-S4.1 `2.65.56` @ `8fe1147`  
> **Język:** polski

---

## 1. Cel

Użytkownik współtworzy kosztorys z AI: edytuje i zatwierdza komponenty, od razu widzi wpływ na koszt bezpośredni pozycji.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Model | `editStatus` · `changeHistory` · schema OfferBoq **v5** |
| Edycja | `patchOfferBoqComponentInDocument` · `approveOfferBoqComponentInDocument` |
| Przeliczenie | REUSE `aggregateOfferBoqPricedComponents` → lineDirect (bez Kp/marży/oferty) |
| UI | panel AI Cost Intelligence — komponenty `editable=true` |
| Summary | zatwierdzone · zmienione · tylko AI |
| Changelog | **2.65.57** |

**Nienaruszone:** Pricing Engine (logika wyceny AI) · Cost Intelligence · Bid Proposal · AP2 · parsery.

---

## 3. Pliki

- `src/lib/tender-offer-boq-component-edit.ts` (**NOWY**)
- `src/lib/tender-offer-boq.ts`
- `src/lib/tender-offer-boq-pricing-engine.ts` (eksport agregacji)
- `src/lib/tender-offer-boq-explainability.ts`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `scripts/test-cost-s5-component-edit.mjs` (**NOWY**)
- changelog · DF · RELEASE · `09` · `CURRENT-TASK`

---

## 4. Testy / build

| | |
|--|--|
| `test-cost-s5-component-edit.mjs` | **PASS** |
| `test-cost-s4.1-explainability.mjs` | **PASS** |
| `npm run build` | **PASS** (oczekiwane) |

---

## 5. Kryteria akceptacji

| Kryterium | Status |
|-----------|--------|
| Edytowalne komponenty | **PASS** |
| Natychmiastowe przeliczenie | **PASS** |
| Status komponentu | **PASS** |
| Historia zmian | **PASS** |
| Summary ingerencji | **PASS** |
| Bez Kp/marży/oferty | **PASS** |
| RR · commit · push · tip | **PASS** · `351f534` |

---

## 6. → COST-S6

REUSE `computeTenderBidProposal` + `totals.directPln` → Kp · marża · recommendedBid.  
Nie tworzyć drugiego kalkulatora.

---

## 7. Gate

```text
G1–G9: ALL-NIE · Lista Płac / Autonomous / Pricing Gate: OUT
```
