# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 4 BOQ Integration (SHADOW)

> **STATUS:** IMPLEMENTATION COMPLETE (lib · shadow path)  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · F3 [`…-F3-BOM-TECHNOLOGY.md`](./TENDER-BOQ-PRICING-REBUILD-01-F3-BOM-TECHNOLOGY.md)  
> **UI:** **2.66.41**

---

## 1. Scope

Podłączenie nowego toru kosztowego do **rzeczywistych pozycji OfferBoq / przedmiaru** jako **SHADOW / PARALLEL** (bez cutover Bid).

```text
OfferBoq line (PRZEDMIAR)
  → work identity (catalogWorkId + unit · trusted match)
  → OUR RATE (F1 lookupWorkRate)
  → TechnologyPack / projectBom (F3)
  → materialKey + totalQty (= qty × qtyFactor)
  → Price Memory SELL (F2)
  → computePositionCost (F0 pure)
  → ShadowPositionCostLineResult  (osobny kontrakt)
```

**NIE:** nadpisanie `linePricing` · `unitPrice` · `recommendedBidPln` · `computeTenderBidProposal` · Kp · profitPct · minMarginPct.

Pliki:

- `src/lib/tender-position-cost/boq-shadow-adapter.ts` — **nowy**
- eksport w `index.ts`
- `scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs`

---

## 2. AUDIT REUSE (bez drugiego systemu)

| Warstwa | REUSE |
|---------|-------|
| BOQ / przedmiar | `OfferBoqDocument` / `OfferBoqLine` (`tender-offer-boq`) |
| Work identity | `catalogWorkId` · `matchMethod` · `matchConfidence` · `candidateMatches` |
| Quantity / unit | `line.quantity` · `normalizeWgdomCostUnit(line.unit)` |
| OUR RATE | F1 `resolveLaborInputFromOurWorkRate` / `lookupWorkRate` |
| Technology / BOM | F3 `resolveTechnologyBomForWork` · `projectBom` · ACTIVE pack |
| Material identity + SELL | F2 `resolveMaterialInputFromPriceMemory` |
| Position Cost | F0 `computePositionCost` |

**Zakaz drugiego:** BOQ · Work Identity · BOM · Technology · Price Memory · Work Rate Memory.

---

## 3. Work identity

Trusted methods: `exact_knr` | `catalog_map` | `alias` | `manual`.

| Warunek | Status |
|---------|--------|
| `isNoise` | `NOISE_SKIP` |
| Equipment / transport | `AUXILIARY_GAP` |
| jednostka nie-normalizowalna | `INVALID_UNIT` |
| ≥2 distinct `candidateMatches` (bez wyjątku manual/exact_knr/alias+high) | `AMBIGUOUS` — **nie** wybieraj pierwszego |
| brak workId / unmatched / category_heuristic / low | `NO_IDENTITY` |

---

## 4. Quantity

- Quantity BOQ = ilość wykonania pozycji.
- BOM: `totalQuantity = quantityPerUnit (qtyFactor) × BOQ quantity` via `projectBom`.
- **Nie** mieszać quantity pozycji z qtyPerUnit.

---

## 5. OUR RATE / Material / BOM

| Status | Shadow GAP |
|--------|------------|
| CURRENT labor | użyj OUR RATE |
| MISSING labor | `BRAK_STAWKI_ROBOT` |
| STALE labor | `PRZETERMINOWANA_STAWKA_ROBOT` |
| MISSING BOM | `BRAK_TECHNOLOGII_BOM` |
| EMPTY recipe | `BRAK_NORMY_MATERIALOWEJ` |
| brak materialKey | `BRAK_MATERIAL_KEY` |
| MISSING sell | `BRAK_CENY_MATERIALU` |
| STALE sell | `PRZETERMINOWANA_CENA_MATERIALU` |
| unit conversion | `BRAK_KONWERSJI_JEDNOSTEK` |

`companyPricePln` → **ZERO** read as OUR RATE / material / fallback / seed.

---

## 6. Multi-material

1 labor + 0..N materials z BOM. Brak invent materiałów spoza TechnologyPack.

---

## 7. Shadow contract

```ts
ShadowBoqPositionCostResult {
  schemaVersion: 1
  mode: "shadow"
  lines: ShadowPositionCostLineResult[]
  aggregates: { completeLineCount, gapLineCount, … }
}
```

API:

- `resolveWorkIdentityFromOfferBoqLine`
- `computeShadowPositionCostForOfferBoqLine`
- `computeShadowPositionCostsForOfferBoq`

---

## 8. Boundaries

| Obszar | F4 |
|--------|-----|
| Bid / Offer pricing | **UNCHANGED** |
| Engine F0 | **PURE** · UNCHANGED |
| F1–F3 adapters | **REUSE** |
| Equipment / transport | **AUXILIARY GAP** (nie w labor/material) |
| HTTP / research | **0** na otwarciu/kalkulacji |
| FAZA 5 Bid cutover | **OUT** |

---

## 9. Testy

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs`
