# WGDOM — AI-COST-01 / COST-S5 DESIGN FREEZE (Editable Cost Estimate)

> **ID:** COST-S5  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-27)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S4.1 `2.65.56` / `8fe1147`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: edycja komponentów wyceny + natychmiastowe przeliczenie lineDirect (bez Kp/marży/oferty)
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S5)
```

---

## 1. Cel

Użytkownik współtworzy kosztorys z AI: akceptuje / zmienia komponenty i od razu widzi wpływ na koszt bezpośredni pozycji.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq.ts` | pola `editStatus` · `changeHistory` · schema **v5** |
| `src/lib/tender-offer-boq-component-edit.ts` | **NOWY** — patch / approve / recompute / historia |
| `src/lib/tender-offer-boq-pricing-engine.ts` | **tylko** eksport `aggregateOfferBoqPricedComponents` (REUSE) |
| `src/lib/tender-offer-boq-explainability.ts` | prezentacja z dokumentu + KPI edycji |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | edycja komponentów (`editable=true`) |
| `scripts/test-cost-s5-component-edit.mjs` | **NOWY** |
| changelog **2.65.57** · DF/RR · `09` · `CURRENT-TASK` | tip PL |

---

## 3. OUT

- Przebudowa AI Pricing Engine / Cost Intelligence  
- Kp · marża · recommendedBid · nowy kalkulator · duplikat Bid Proposal  
- Edycja całej pozycji (tylko komponenty)  
- Parsery · AP2  

---

## 4. Kontrakt

### Status komponentu
| Status | Label PL |
|--------|----------|
| `ai_proposal` | Propozycja AI |
| `user_approved` | Zatwierdzony przez użytkownika |
| `user_changed` | Zmieniony przez użytkownika |

### Edytowalne pola
`namePl` · `quantity` · `unit` · `unitPricePln` · `category` · `priceOrigin` · `requiresUserReview`

### Przeliczenie (natychmiast)
`totalPln = qty × unitPrice` → agregaty M/R/S/transport/pomocnicze → `lineDirectPln`  
**Zakaz:** Kp, marża, oferta.

### Historia
`changeHistory[]`: `{ field, previousValue, nextValue, changedAt }` — append-only.

### Panel summary (+S5)
`approvedCount` · `changedCount` · `aiOnlyCount`

### UI
`data-offer-boq-component-editable="true"` · stan sesji w panelu (dokument OfferBoq).

### Prep S6
`totals.kpPln` / `marginPln` / `recommendedBidPln` pozostają `null` — miejsce na REUSE Bid Proposal.

---

## 5. AC

1. Komponenty edytowalne.  
2. Zmiana → natychmiastowe przeliczenie pozycji.  
3. Status widoczny.  
4. Historia zmian append-only.  
5. Summary: zaakceptowane / zmienione / tylko AI.  
6. Testy · build · RR PL · commit · push · tip.

---

**FROZEN** · IMPLEMENT dozwolony
