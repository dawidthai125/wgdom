# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 3 BOM / Technology

> **STATUS:** IMPLEMENTATION COMPLETE (lib)  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · F2 [`…-F2-MATERIAL-INTEGRATION.md`](./TENDER-BOQ-PRICING-REBUILD-01-F2-MATERIAL-INTEGRATION.md)  
> **UI:** **2.66.40**

---

## 1. Scope

Most **TechnologyPack → BOM → ilości** na istniejący Position Cost:

```text
workId (+ unit) + positionQuantity
  → ACTIVE TechnologyPack (steps.catalogWorkId === workId)
  → filterPackRecipeForCoats (opcjonalnie)
  → validate components (materialKey · qtyFactor · unit)
  → projectBom (REUSE) → totalQuantity = qty × qtyFactor
  → resolveMaterialInputFromPriceMemory (F2)
  → (+ resolveLaborInputFromOurWorkRate F1)
  → computePositionCost (F0 pure)
```

Pliki:

- `src/lib/tender-position-cost/bom-technology-adapter.ts` — **nowy**
- eksport w `index.ts`
- `scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs`

---

## 2. BOM SSOT (REUSE)

| Element | Źródło |
|---------|--------|
| Technology | `src/lib/technology-foundation` · `TechnologyPack` |
| Projekcja qty | `projectBom` · `deriveExecutionPlan` |
| Coats | `filterPackRecipeForCoats` |
| Identity roboty | `steps[].catalogWorkId` === `workId` (exact) |
| Norma | `PackMaterialRecipeLine.qtyFactor` (= quantityPerUnit) |
| Provenance | `factorSourceKind` / `factorSourceRef` / `factorApprovedAt` |

**Zakaz:** drugi system BOM · heurystyka tekstowa OfferBoq · invent klej/fuga/grunt/farba.

---

## 3. Conditions

| ID | Semantyka | F3 |
|----|-----------|-----|
| **C-BOM-1** | auto materiały tylko z VALID BOM | PASS · `MISSING_BOM` |
| **C-BOM-2** | materialKey + qtyFactor + unit | PASS · `INVALID_COMPONENT` |
| **C-BOM-3** | total = positionQty × qtyFactor | PASS · `projectBom` |
| **C-BOM-4** | brak reguły konwersji → GAP | PASS · `UNIT_CONVERSION_GAP` |
| **C-BOM-5** | brak materiałów spoza pack | PASS |

---

## 4. GAP semantics

| Status | Label PL |
|--------|----------|
| `MISSING_BOM` | BRAK BOM / BRAK DANYCH TECHNOLOGICZNYCH |
| `EMPTY_RECIPE` | BRAK NORMY MATERIAŁOWEJ (np. brak `paintCoats`) |
| `INVALID_COMPONENT` | NIEPEŁNY KOMPONENT BOM |
| `UNIT_CONVERSION_GAP` | BRAK KONWERSJI JEDNOSTEK |
| `AMBIGUOUS_BOM` | >1 ACTIVE pack na ten sam workId |
| `INVALID_POSITION_QUANTITY` | qty < 0 / NaN |

---

## 5. Boundaries

| Obszar | F3 |
|--------|-----|
| Engine F0 | **UNCHANGED** |
| OUR RATE F1 | **REUSE** |
| Price Memory F2 | **REUSE** · **UNCHANGED** write paths |
| Bid / Offer | **ZERO TOUCH** |
| companyPricePln | **ZERO** |
| HTTP / research | **0** |
| Owner edit BOM UI | **OUT** (FUTURE OWNER GO) |

---

## 6. Testy

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs`
