# WGDOM — AI-COST-01 / COST-S6 DESIGN FREEZE (Bid Proposal Integration)

> **ID:** COST-S6  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **CLOSED** · **Owner GO YES** (2026-07-27) · implementacja **2.65.59**  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S5.1 `2.65.58` / `973821f`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: AI Cost → Adapter → REUSE computeTenderBidProposal (Kp/marża/oferta)
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S6)
```

---

## 1. Cel

AI Cost dostarcza koszt bezpośredni i metadane. **Końcowa oferta** (Kp, narzuty, marża, cena rekomendowana) wyłącznie przez istniejący `computeTenderBidProposal` — **zero** drugiego kalkulatora.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-bid-adapter.ts` | **NOWY** — payload · audit trail · orchestracja (bez logiki Kp/marży) |
| `src/lib/tenders-bid-calculator.ts` | tryb `offer_boq_ai` + wejście `offerBoqDirect` (bez kopiowania tail Kp) |
| `src/lib/tender-bid-quality.ts` | etykieta źródła `offer_boq_ai` |
| `src/lib/tender-offer-boq-explainability.ts` | sekcja „Wpływ AI na ofertę” + offer summary |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | UI podsumowania oferty + ścieżka audytu |
| `scripts/test-cost-s6-bid-proposal-integration.mjs` | **NOWY** |
| changelog **2.65.59** · DF/RR · `09` · `CURRENT-TASK` | tip PL |

---

## 3. OUT

- Nowy kalkulator oferty · kopia logiki Bid Proposal  
- Zmiana parserów · Pricing Gate · Autonomous Gate  
- VAT/brutto (Bid Proposal nie ma — UI tylko netto)  

---

## 4. Kontrakt adaptera

### Wejście (z OfferBoqDocument)
- `directPln`, agregaty M/R/S/transport/auxiliary  
- liczba komponentów, średnia pewność  
- `companyKnowledgeHitCount`  

### Wyjście
- `TenderBidProposal` z `pricingMode: offer_boq_ai`  
- `OfferBoqBidAuditStep[]`: AI Cost → Adapter → Bid Proposal → Wynik  
- merge do `OfferBoqTotals` (kp, costPrice, margin, recommendedBid) — **wartości z proposal**

### Mapowanie direct → Bid Proposal
- `materialCostReal` = materialsPln  
- `laborCostReal` = labor + equipment + transport + auxiliary (reszta kosztu bezpośredniego)  
- Kp/marża/oferta: **istniejący tail** `computeTenderBidProposal`

---

## 5. AC

1. Adapter bez logiki Kp/marży.  
2. Wszystkie wyliczenia końcowe przez Bid Proposal.  
3. Explainability „Wpływ AI na ofertę”.  
4. Panel podsumowania oferty (costStack SSOT).  
5. Ścieżka audytu widoczna.  
6. Testy · build · RR PL · commit · push · tip.

---

**FROZEN** · IMPLEMENT dozwolony
