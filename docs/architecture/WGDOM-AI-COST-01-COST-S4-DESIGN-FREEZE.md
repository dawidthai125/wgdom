# WGDOM — AI-COST-01 / COST-S4 DESIGN FREEZE (AI Pricing Engine)

> **ID:** COST-S4  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-27)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S3 `2.65.54` / `61b7590`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: komponenty wyceny + agregacja pozycji (bez Kp / marży / oferty)
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S4)
```

---

## 1. Cel biznesowy

Pierwsza **propozycja wyceny** pozycji przedmiaru — użytkownik weryfikuje. Trafność cen wtórna; solidny model komponentów + źródeł + agregacji jest priorytetem.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-pricing-engine.ts` | **NOWY** — AI Pricing Engine (pure) |
| `src/lib/tender-offer-boq.ts` | typy komponentów · `linePricing` · schema **v4** |
| `scripts/test-cost-s4-pricing-engine.mjs` | **NOWY** |
| testy S1 (pola null) · changelog **2.65.55** · DF/RR/`09`/`CURRENT-TASK` | tip PL |

**REUSE:** Cost Intelligence S3 (dekompozycja / strategia) · Work Catalog `companyPricePln` / `costSplit` · `getCategoryRate` · `fullyLoadedHourly` / model firmy · `OfferBoqPriceSourceRef` pattern.

---

## 3. OUT

- Kp · marża · recommendedBid / cena ofertowa  
- Scraping Internetu · nowe parsery · AP2 · Bid Proposal rewrite  
- Osobne silniki jako osobne SSOT (moduły **wewnątrz** jednego engine)  
- Duży UI — **ODŁOŻONY** jeśli > thin  

---

## 4. Kontrakt

```text
OfferBoqPricedComponent {
  namePl, category, quantity, unit,
  unitPricePln | null, totalPln | null,
  priceOrigin { kind, labelPl, refId? },
  confidence, aiRationale, requiresUserReview
}

OfferBoqLinePricing {
  components[]
  aggregates { materials, labor, equipment, transport, auxiliary, lineDirect }
}
```

### Źródła cen (`OfferBoqPriceOriginKind`)

`work_catalog` · `company_model` · `category_rate` · `heuristic_estimate` · `external_future` · `unknown`

Provider interface — łańcuch lookup, łatwa podmiana / rozszerzenie bez przebudowy engine.

### Agregacja pozycji

Suma komponentów → materiały / robocizna / sprzęt / transport / pomocnicze / **lineDirect**.  
**Zakaz:** Kp, marża, cena ofertowa dokumentu.

### Budowa komponentów

1. Jeśli S3 `requiresDecomposition` → komponent per element dekompozycji  
2. Inaczej → komponenty ze strategii (`pricingComponents`)  
3. Cena z providera; brak źródła → `unitPricePln: null` + `requiresUserReview`

---

## 5. UI

Panel RO **ODŁOŻONY** (jak S2/S3) — ryzyko regresji BOQ. Engine gotowy pod S4.1.

---

## 6. AC

1. Każda linia po `applyOfferBoqPricing` ma `linePricing.components`.  
2. Agregaty pozycji z komponentów.  
3. Wielozródłowy interface providera.  
4. Transparentność: źródło · rationale · confidence · review.  
5. Zero Kp/marży/oferty. Testy · build · RR PL · commit · push · tip.

---

**FROZEN** · IMPLEMENT dozwolony
