# WGDOM — AI-COST-01 / COST-S1 DESIGN FREEZE (OfferBoq model)

> **ID:** COST-S1  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **AUDIT:** [`WGDOM-AI-COST-01-AUDIT.md`](WGDOM-AI-COST-01-AUDIT.md)  
> **ARCH:** [`WGDOM-AI-COST-01-ARCHITECTURE.md`](WGDOM-AI-COST-01-ARCHITECTURE.md)

```text
One Bundle = One Goal: OfferBoq + OfferBoqLine ze snapshotu (ceny null) — fundament AI Kosztorysanta
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S1)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq.ts` | **NOWY** — typy + `buildOfferBoqFromSnapshot` (pure) |
| `scripts/test-cost-s1-offer-boq.mjs` | **NOWY** |
| `src/app/changelog-data.ts` | **2.65.52** |
| docs DF/RELEASE · `09` · `CURRENT-TASK` | tip + status |

**REUSE:** `TenderKosztorysSnapshot` · `TenderCostLine` · `TenderCatalogQuantityLine` · opcjonalnie `extractKatalogHintFromDescription` (hint KNR, nie parser).

---

## 2. OUT

- Nowy parser PDF/ATH  
- Logika wyceny M/R/S/Kp/marża  
- UI edycji / tabela  
- Zmiany Bid Proposal / Pricing Gate / Autonomous / AP2  
- Drugi kalkulator  

---

## 3. Kontrakt

- Preferencja źródeł wierszy: `catalogQuantities` → else `rows`  
- Ceny / narzuty: **null** (placeholder pod S2+)  
- `userEdited` / `editedFields` / `PriceSourceRef` / `aiRationale` — pola gotowe  
- `recomputeToken` — deterministyczny z treści linii (bump w S7)  
- Schema version: **1**

---

## 4. AC

1. `buildOfferBoqFromSnapshot` zwraca dokument z liniami z LP/opis/ilość/jm.  
2. Zero nowych parserów.  
3. Pola M/R/S/Kp/marża/total istnieją (null OK).  
4. Model gotowy pod edycję (`userEdited`, `editedFields`).  
5. Transparentność: `PriceSourceRef`, `pricingSourceLabelPl`, `aiConfidence`, `aiRationale`.  
6. build + testy · RR · commit · push · PV.

---

**FROZEN** · IMPLEMENT dozwolony
