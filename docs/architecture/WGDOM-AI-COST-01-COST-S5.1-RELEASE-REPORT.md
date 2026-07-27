# WGDOM — AI-COST-01 / COST-S5.1 RAPORT WYDANIA

> **ID:** COST-S5.1  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **PRODUCTION VERIFIED**  
> **Data:** 2026-07-27  
> **UI:** **2.65.58**  
> **Commit:** **`973821f`**  
> **DF:** [`WGDOM-AI-COST-01-COST-S5.1-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S5.1-DESIGN-FREEZE.md)  
> **Prior:** COST-S5 `2.65.57` @ `351f534`  
> **Język:** polski

---

## 1. Cel

Lokalna, firmowa baza wiedzy kosztorysowej: każda decyzja użytkownika (zatwierdzenie / korekta) buduje wiedzę wykorzystywaną przy kolejnych wycenach AI — bez globalnego modelu i bez scrapingu.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Store | `tender-offer-boq-company-knowledge.ts` — wpisy + obserwacje append-only (localStorage) |
| Uczenie | `patch` / `approve` → `learnFromOfferBoqComponentDecision` |
| Provider | `leadingProviders` + origin `company_knowledge` (nie zastępuje domyślnego łańcucha) |
| Explainability | hint: wiedza firmy · liczba przypadków · data · wpływ na pewność |
| Panel stats | RO: #wpisów · potwierdzone · top materiały · zgodność AI↔user |
| Prep S6 | `getCompanyKnowledgeStoreForBidPrep()` — bez wyliczeń Bid Proposal |
| Changelog | **2.65.58** |

**Nienaruszone:** logika Pricing Engine (tylko thin hook) · Cost Intelligence · Bid Proposal · Kp/marża/oferta · AP2 · parsery.

---

## 3. Pliki

- `src/lib/tender-offer-boq-company-knowledge.ts` (**NOWY**)
- `src/lib/tender-offer-boq.ts`
- `src/lib/tender-offer-boq-pricing-engine.ts`
- `src/lib/tender-offer-boq-component-edit.ts`
- `src/lib/tender-offer-boq-explainability.ts`
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `scripts/test-cost-s5.1-company-knowledge.mjs` (**NOWY**)
- changelog · DF · RELEASE · `09` · `CURRENT-TASK`

---

## 4. Testy / build

| | |
|--|--|
| `test-cost-s5.1-company-knowledge.mjs` | **PASS** |
| `test-cost-s5-component-edit.mjs` | **PASS** |
| `test-cost-s4.1-explainability.mjs` | **PASS** |
| `tsc --noEmit` | **PASS** (tylko znane TS5101 baseUrl) |
| lint | **N/A** (brak eslint w projekcie) |
| `npm run build` | **PASS** |

---

## 5. Kryteria akceptacji

| Kryterium | Status |
|-----------|--------|
| Firmowa baza wiedzy | **PASS** |
| Przyrostowy zapis decyzji | **PASS** |
| AI używa wiedzy przy wycenie | **PASS** |
| Explainability pokazuje wpływ | **PASS** |
| Panel statystyk RO | **PASS** |
| Bez Kp/marży/oferty | **PASS** |
| RR · commit · push · tip | **PASS** · `973821f` |

---

## 6. → COST-S6

REUSE `computeTenderBidProposal` + `totals.directPln` + opcjonalnie store wiedzy → Kp · marża · recommendedBid.  
Nie duplikować Bid Proposal.

---

## 7. Gate

G1–G9 **ALL-NIE** · Owner GO: YES · Stabilization Window: ACTIVE
