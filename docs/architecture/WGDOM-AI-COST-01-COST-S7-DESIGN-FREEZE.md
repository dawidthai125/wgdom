# WGDOM — AI-COST-01 / COST-S7 DESIGN FREEZE (AI Validation & Offer Quality)

> **ID:** COST-S7  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **CLOSED** · **Owner GO YES** (2026-07-27) · implementacja **2.65.60**  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S6 `2.65.59` / `754c997`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: AI Validation Engine (RO) + Offer Readiness panel + Explainability jakości AI
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S7)
```

---

## 1. Cel

Po wygenerowaniu kosztorysu i oferty system wykonuje automatyczną ocenę jakości, kompletności i ryzyk.
Zakres COST-S7 jest **read-only**: wykrywanie problemów, scoring i rekomendacje.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-validation.ts` | **NOWY** — AI Validation Engine (issues, completeness, quality score, recommendations, readiness) |
| `src/lib/tender-offer-boq-explainability.ts` | sekcje `offerReadiness` + `aiQuality` (integracja RO) |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | panel „Gotowość oferty” + sekcja „Ocena jakości AI” + rekomendacje |
| `scripts/test-cost-s7-validation-offer-quality.mjs` | **NOWY** test COST-S7 |
| `scripts/test-cost-s4.1-explainability.mjs` | regresja sekcji S7 |
| changelog `2.65.60` + DF/RR + `CURRENT-TASK` + `09` | domknięcie release |

---

## 3. OUT

- Zmiana parserów dokumentów  
- Przebudowa Pricing Engine  
- Przebudowa Bid Proposal  
- Auto-naprawa danych i auto-zmiana cen  
- Modyfikacja Kp / marży poza Bid Proposal

---

## 4. Kontrakt silnika walidacji

### Wejście
- `OfferBoqDocument` po S6
- `TenderBidProposal` (wynik istniejącego silnika)
- średnia pewność AI i trafienia wiedzy firmy

### Wyjście
- `issues[]` (critical/warning/info)
- kompletność `%`:
  - rozpoznanie
  - klasyfikacja
  - wycena
  - przekazanie do Bid Proposal
- `AI Quality Score` 0–100 (pomocniczy)
- rekomendacje z priorytetem
- status gotowości: `ready` / `review_required` / `not_ready`
- explainability jakości: czynniki obniżające i wzmacniające ocenę

---

## 5. AC

1. Silnik walidacji działa bez modyfikacji danych.
2. Kompletność kosztorysu prezentowana jako %.
3. AI Quality Score 0–100 prezentowany użytkownikowi.
4. Rekomendacje mają priorytet i źródło problemu.
5. Panel „Gotowość oferty” jest tylko do odczytu.
6. Explainability pokazuje powody score i główne czynniki wpływu.
7. Brak duplikacji logiki Kp/marży/oferty (REUSE Bid Proposal).
