# WGDOM — AI-COST-01-STAB-01 RAPORT WYDANIA

> **ID:** AI-COST-01-STAB-01  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **RELEASE GO**  
> **Data:** 2026-07-27  
> **UI:** **2.65.61**  
> **DF:** [`WGDOM-AI-COST-01-STAB-01-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-STAB-01-DESIGN-FREEZE.md)  
> **RWAT compare:** [`WGDOM-AI-COST-01-STAB-01-RWAT-COMPARE.md`](WGDOM-AI-COST-01-STAB-01-RWAT-COMPARE.md)  
> **Prior:** COST-S7 `2.65.60` / RWAT-01 NOT FIELD READY  
> **Język:** polski

---

## 1. Cel

Usunąć problemy **P1** z RWAT-01 i doprowadzić AI-COST-01 do poziomu **FIELD READY** (kandydat po re-RWAT).

---

## 2. Implementacja (STAB-1…6)

| STAB | Zmiana |
|------|--------|
| **1** | Reprice zachowuje `user_approved` / `user_changed`; AI → `aiSuggestedUnitPricePln` |
| **2** | Rekomendacje grupowane z licznością + UI expand |
| **3** | Klasyfikacja: sprzątanie, odbiory, próby, dokumentacja powykonawcza, zabezpieczenia |
| **4** | Heurystyka materiału + strategia IndividualAnalysis (labor/transport/aux) |
| **5** | Explainability: dlaczego brak wyceny + co zrobić |
| **6** | Lokalna telemetria `kw-offer-boq-ai-quality-telemetry` (bez wysyłki) |

**Nienaruszone:** parsery · Bid Proposal (kontrakt) · architektura Company Knowledge (schema) · Payroll.

---

## 3. Pliki

- `src/lib/tender-offer-boq.ts`
- `src/lib/tender-offer-boq-pricing-engine.ts`
- `src/lib/tender-offer-boq-cost-intelligence.ts`
- `src/lib/tender-offer-boq-validation.ts`
- `src/lib/tender-offer-boq-explainability.ts`
- `src/lib/tender-offer-boq-company-knowledge.ts` (zawężenie matchingu generycznego)
- `src/lib/tender-offer-boq-ai-quality-telemetry.ts` (**NOWY**)
- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `scripts/test-cost-stab-01.mjs` (**NOWY**)
- `scripts/test-cost-s4-pricing-engine.mjs` (aktualizacja AC heurystyki)
- docs DF / RR / RWAT-COMPARE · changelog · tip

---

## 4. Testy / build

| | |
|--|--|
| `test-cost-stab-01.mjs` | **PASS** |
| `test-cost-s3` … `s7` + `s4.1` | **PASS** |
| Re-RWAT TP113 (live KV) | **PASS** — brak P0/P1 STAB |
| `npm run build` | **PASS** |

---

## 5. RWAT przed / po (skrót)

| | Przed | Po |
|--|-------|-----|
| Unpriced | 252 | **0** |
| Rekomendacje | ~2009 | **4 grupy** |
| Quality Score | 8 | **41** |
| Ochrona edycji | FAIL | **PASS** |
| Sprzątanie | MaterialInstallation | **Demolition** |

Szczegóły: [`WGDOM-AI-COST-01-STAB-01-RWAT-COMPARE.md`](WGDOM-AI-COST-01-STAB-01-RWAT-COMPARE.md)

---

## 6. Gate

G1–G9 **ALL-NIE** · Owner GO: YES

---

## 7. Status produktu

```text
AI-COST-01 — PRODUCTION VERIFIED (wcześniej)
AI-COST-01-STAB-01 — RELEASE GO
AI-COST-01 — FIELD READY (kandydat po RWAT bez P0/P1; potwierdzenie po version.json)
```

---

## 8. HOTFIX CLASSIFICATION

BUGFIX  
UX  
OTHER (telemetria lokalna / stabilizacja jakości)
