# TENDER-BOQ-PRICING-REBUILD-01 — Owner Decision C-MODE-1a

> **STATUS:** **ACCEPTED** · **LOCKED**  
> **DATA:** 2026-08-12  
> **JĘZYK:** PL  
> **BASELINE F5:** UI **2.66.42** · live tip **`1e7aced`** · feature **`3995c9af`** · **PRODUCTION VERIFIED · GREEN**  
> **F6 AUDIT:** [`…-F6-ATH-CATALOG-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-F6-ATH-CATALOG-AUDIT.md) · commit **`1425bb15`**

```text
OWNER DECISION = C-MODE-1a ACCEPTED
NEW BID SSOT   = F5 Position Cost pipeline
ath_priced     = NO BID SSOT · NO FALLBACK
catalog        = NO BID SSOT · NO FALLBACK
companyPricePln= NO NEW BID SOURCE · NO OUR RATE / Position Cost fallback
ATH struktura  = KEEP AS SEPARATE INPUT
legacy catalog = KEEP TECHNICALLY · soft-deprecate = P7 (osobny GO)
F5 engines     = UNCHANGED
P7             = NIE W TEJ SESJI
```

---

## 1. Decyzja

Przyjmuję **C-MODE-1a**.

Po zakończonym i zweryfikowanym F5:

```text
NOWY BID SSOT:
Position Cost Engine
→ OUR RATE
→ Technology / BOM
→ Material Price Memory
→ sellPrice
→ computePositionCost
→ offerBoqDirect
→ computeTenderBidProposal
→ Kp / profitPct / minMarginPct
→ recommendedBidPln
```

| Źródło | Rola po C-MODE-1a |
|--------|-------------------|
| ATH `ath_priced` | **NIE** jest źródłem nowego Bid |
| Legacy `catalog` | **NIE** jest źródłem nowego Bid |
| `companyPricePln` | **NIE** jest źródłem nowego Bid |
| ATH qty/unit/description | **KEEP AS SEPARATE INPUT** → OfferBoq → F5 |
| OUR RATE | **SSOT** robocizny |
| Price Memory + sell | **SSOT** materiału |
| BOM / Technology | **SSOT** składu materiałowego |

---

## 2. Twardy kontrakt

1. `ath_priced` **NIE** może być fallbackiem Bid.  
2. `catalog` **NIE** może być fallbackiem Bid.  
3. `companyPricePln` **NIE** może być fallbackiem OUR RATE.  
4. `companyPricePln` **NIE** może być fallbackiem Position Cost.  
5. ATH PLN **NIE** może zostać przepisane do OUR RATE.  
6. ATH PLN **NIE** może zostać seedem OUR RATE.  
7. Legacy catalog **NIE** może zostać seedem OUR RATE.  
8. Brak OUR RATE → **GAP**.  
9. Brak materiału w Price Memory → **GAP**.  
10. Brak BOM → **GAP**.  
11. Nie wolno inventować ceny.  
12. Nie wolno automatycznie przełączać się na starą ścieżkę tylko dlatego, że nowa ścieżka nie ma danych.

```text
NEW BID = F5 pipeline
ATH / legacy catalog / companyPricePln = NO FALLBACK
GAP = EXPLICIT
```

---

## 3. ATH

**KEEP AS SEPARATE INPUT.**

ATH może dostarczać: quantity · unit · description · pozycję → OfferBoq → F5.

ATH cena inwestorska / `ath_priced` ≠ OUR RATE ≠ labor-only ≠ material sell ≠ nowy Bid SSOT.  
**Zero migracji.**

---

## 4. Legacy catalog

**KEEP TECHNICALLY** · soft-deprecate = **P7 / osobny OWNER GO**.  
**NIE USUWAĆ** teraz.  
`companyPricePln` = **KEEP TECHNICALLY** · nie używać jako nowy pricing SSOT.

---

## 5. F5 — bez zmian

F5 **PRODUCTION VERIFIED · GREEN**.  
NIE zmieniać: Position Cost Engine · OUR RATE · Technology · BOM · Price Memory · sellPrice · Kp · profitPct · minMarginPct · recommendedBidPln.  
Jeżeli C-MODE wymagałby zmiany F5 → **STOP**.

---

## 6. Audyt kodu — fallbacki (2026-08-12)

### 6.1 Aktywny F5 cutover (OfferBoq obecny) — **ZERO FALLBACK**

| Plik | Funkcja | Zachowanie |
|------|---------|------------|
| `bid-position-cost-cutover.ts` | `computeBidProposalFromPositionCost` | Gate FAIL → `ok:false` + GAP · **bez** legacy direct |
| `tender-offer-boq-bid-adapter.ts` | `integrateOfferBoqWithBidProposal` | cutover ON → Position Cost only |
| `tender-offer-boq-explainability.ts` | `computeRuntimeBidFromOfferBoq` | cutover ON → zwraca GAP (`ok:false`) · **nie** `null` (nie odpala catalog) |

`companyPricePln` / ATH PLN / catalog rates **nie** zasilają `offerBoqDirect` F5.

### 6.2 Produktowe wiring — **ZNALEZIONY FALLBACK** (NIE NAPRAWIONY)

| Pole | Wartość |
|------|---------|
| **Plik** | `src/app/hooks/useTenderPricingAuto.ts` |
| **Funkcja** | `resolveTenderPricingAutoProposal` |
| **Warunek** | `costPipelineOn` ∧ `computeRuntimeBidFromOfferBoq(...) === null` (brak OfferBoq / brak linii) |
| **Obecne zachowanie** | `return computeCatalogBidProposalForPricingAuto(...)` → `computeTenderBidProposal` bez `offerBoqDirect` → `ath_priced` **lub** `catalog` |
| **Ryzyko** | Narusza kontrakt C-MODE-1a pkt **1, 2, 12** gdy Bid Outcome budowany bez OfferBoq (fallback „bezpieczny” z BUGFIX-01) |
| **Rekomendacja** | Osobny **OWNER GO** (thin): przy braku OfferBoq → `null` / jawny GAP · **nie** `ath_priced`/`catalog`. **Nie** robić w tej sesji (zakaz auto-fix · nie P7 · nie Offer rebuild). |

**Inne ścieżki legacy (KEEP TECHNICAL, poza aktywnym F5 SSOT):**

- `tenders-bid-calculator.ts` — enumy `ath_priced` / `catalog` nadal w API (legacy / testy).  
- `createWorkCatalogPriceProvider` — Offer **line** UI (nie Bid F5 SSOT) — OUT of scope C-MODE-1a cutover.  
- Biblioteka `companyPricePln` — KEEP TECHNICAL.

```text
F5 PATH FALLBACK:     ZERO
PRODUCT WIRING FALLBACK: 1 (useTenderPricingAuto · OfferBoq null) — DOCUMENTED · NOT FIXED
```

---

## 7. Test kontraktowy

`scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-contract.mjs` — CASE 1–10 · 0 FAIL wymagane.

---

## 8. Zakazy sesji

Nie P7 · nie przebudowa Offer · nie usuwanie ATH / catalog / `companyPricePln` · nie zmiana PM / Work Rate · HTTP=0 · research=0 · nie sztuczny fix F5.

---

## 9. NEXT

```text
OWNER REVIEW
→ opcjonalny thin GO: wyłączenie catalog fallback w useTenderPricingAuto (OfferBoq null → GAP)
→ P7 / soft-deprecate = osobno
NIE auto-start P7
```

**STOP.**
