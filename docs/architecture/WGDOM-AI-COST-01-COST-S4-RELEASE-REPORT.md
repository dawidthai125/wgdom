# WGDOM — AI-COST-01 / COST-S4 RAPORT WYDANIA

> **ID:** COST-S4  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **PRODUCTION VERIFIED**  
> **Data:** 2026-07-27  
> **UI:** **2.65.55**  
> **Commit:** **`b321867`**  
> **DF:** [`WGDOM-AI-COST-01-COST-S4-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S4-DESIGN-FREEZE.md)  
> **Prior:** COST-S3 `2.65.54` @ `61b7590`  
> **Język:** polski

---

## 1. Cel

Pierwsza **propozycja wyceny** pozycji przedmiaru — komponenty + agregacja kosztu bezpośredniego. Użytkownik weryfikuje. Trafność cen będzie rosnąć wraz ze źródłami (S5+).

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Silnik | `priceOfferBoqLine` · `applyOfferBoqPricing` |
| Moduły | materiał · robocizna · sprzęt · transport · pomocnicze (wewnątrz jednego engine) |
| Komponenty | nazwa · kategoria · ilość · jm · cena j. · wartość · źródło · confidence · rationale · requiresUserReview |
| Providery | `work_catalog` · `category_rate` · `company_model` · `heuristic_estimate` · `external_future` (placeholder) |
| Agregacja | materials / labor / equipment / transport / auxiliary / lineDirect |
| Zakaz | Kp · marża · recommendedBid |
| Schema | OfferBoq **v4** · `linePricing` · `pricingStats` |
| Changelog | **2.65.55** |

**REUSE:** Cost Intelligence S3 · Work Catalog · `getCategoryRate` · model firmy / `fullyLoadedHourly`.

**Nienaruszone:** AP2 · Bid Proposal · Pricing Gate · Autonomous · parsery PDF/ATH.

---

## 3. UI (read-only)

Panel komponentów wyceny **ODŁOŻONY** (ryzyko regresji BOQ Explorer) → **COST-S4.1** po Owner GO.

---

## 4. Pliki zmienione

- `src/lib/tender-offer-boq-pricing-engine.ts` (**NOWY**)
- `src/lib/tender-offer-boq.ts` (typy S4 · schema 4)
- `scripts/test-cost-s4-pricing-engine.mjs` (**NOWY**)
- `scripts/test-cost-s1-offer-boq.mjs`
- `src/app/changelog-data.ts`
- DF + RELEASE · `09` · `CURRENT-TASK`

---

## 5. Testy / build

| | |
|--|--|
| `test-cost-s4-pricing-engine.mjs` | **PASS** |
| S1 / S2 / S3 | **PASS** (oczekiwane) |
| `npm run build` | **PASS** (oczekiwane) |
| lint | **N/A** (brak eslint dla tych plików) |

---

## 6. Kryteria akceptacji

| Kryterium | Status |
|-----------|--------|
| Komponenty wyceny na pozycji | **PASS** |
| Agregacja kosztu pozycji | **PASS** |
| Architektura wielu źródeł | **PASS** |
| Transparentność (źródło / rationale / confidence / review) | **PASS** |
| Bez Kp / marży / oferty | **PASS** |
| RR PL · commit · push · tip | **PASS** · `b321867` |

---

## 7. Rekomendacje → COST-S5

1. Kalibracja stawek / seed cen w Bibliotece Robót (trafność).  
2. Oficjalne feedy jako `external_future` provider (DF + Owner GO).  
3. Thin UI RO: lista komponentów + wartości + źródło.  
4. COST-S6: Kp + marża + feed do Bid Proposal (REUSE calculator).  

---

## 8. Gate

```text
G1–G9: ALL-NIE · Lista Płac / Autonomous / Pricing Gate: OUT
```
