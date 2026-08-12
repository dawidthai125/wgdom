# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 0 Position Cost Engine

> **STATUS:** IMPLEMENTATION COMPLETE (lib)  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · ARCH [`…-ARCH-REVIEW.md`](./TENDER-BOQ-PRICING-REBUILD-01-ARCH-REVIEW.md)  
> **UI:** **2.66.37**

---

## 1. Scope

Pure, deterministyczny **Position Cost Engine**:

```text
INPUT (gotowe stawki/ceny/ilości) → OUTPUT (laborCost + materialCost + total + issues)
```

Pliki:

- `src/lib/tender-position-cost/types.ts`
- `src/lib/tender-position-cost/engine.ts` — `computePositionCost`
- `src/lib/tender-position-cost/index.ts`
- `scripts/test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs`

---

## 2. Non-scope

| Poza Faza 0 |
|-------------|
| OUR RATE lookup (`lookupWorkRate`) |
| Price Memory / sell (`lookupPriceMemory`, `computeSellPricePln`) |
| materialKey / workId mapping |
| BOM / Technology |
| OfferBoq / Bid wire |
| equipment / transport / auxiliary (C-AUX-1) |
| Kp / profit / minMargin |
| `companyPricePln` |
| HTTP / research / storage |

---

## 3. Input Contract

```text
PositionCostInput = {
  quantity: number          // ilość pozycji (≥ 0; < 0 → INVALID_QUANTITY)
  unit: string              // metadane jm
  labor: PositionLaborInput | null
    // null = material-only (laborCost = 0)
  materials: PositionMaterialInput[]
    // [] = labor-only (materialCost = 0)
}
```

Labor:

```text
{ status: CURRENT|STALE|MISSING|NO_IDENTITY, ourRatePln: number|null }
// ourRatePln = zł / unit pozycji (OUR RATE), NIE stawka godzinowa
```

Materiał:

```text
{
  materialKey, status: CURRENT|STALE|MISSING|NO_KEY|NO_BOM|NO_NORM,
  quantity, quantityUnit, sellPricePln
}
// sellPricePln = gotowa SELL (po marży materiału) — engine nie liczy marży
```

---

## 4. Output Contract

```text
PositionCostResult = {
  laborCostPln, materialCostPln, totalPositionCostPln,  // number|null
  laborComputable, materialsComputable, positionComplete,
  issues: [{ code, messagePl, materialIndex? }]
}
```

---

## 5. Labor Contract

```text
laborCost = round(quantity × ourRatePln)
tylko gdy status === CURRENT oraz ourRatePln finite ≥ 0
```

| Status | Wynik |
|--------|-------|
| CURRENT + rate | policzalne |
| STALE | issue `STALE_OUR_RATE` · **nie** wliczaj (C-STALE-1 default) |
| MISSING | `BRAK_OUR_RATE` |
| NO_IDENTITY | `BRAK_IDENTITY_ROBOTY` |
| `labor === null` | laborCost = 0 · computable (material-only) |

---

## 6. Material Contract

```text
lineCost = round(quantity × sellPricePln)
materialCost = Σ lineCost (policzalne)
```

0..N materiałów — **tylko matematyka**; engine nie ustala BOM/norm.

| Status | Wynik |
|--------|-------|
| CURRENT + qty + sell | policzalne |
| STALE | `STALE_MATERIAL_PRICE` · nie wliczaj |
| MISSING | `BRAK_CENY_MATERIALU` |
| NO_KEY / NO_BOM / NO_NORM | odpowiednie issue |
| `materials === []` | materialCost = 0 |

Częściowy sukces: suma policzalnych linii może być w `materialCostPln`, ale `materialsComputable = false` → `positionComplete = false`.

---

## 7. Validation

| Warunek | Kod |
|---------|-----|
| quantity nie-finite / &lt; 0 | `INVALID_QUANTITY` |
| quantity = 0 | dozwolone → koszty 0 |
| labor rate nie-finite / &lt; 0 | `INVALID_LABOR_RATE` |
| material qty nie-finite / &lt; 0 | `INVALID_MATERIAL_QUANTITY` |
| sell nie-finite / &lt; 0 | `INVALID_MATERIAL_PRICE` |

Braków nie zamieniamy cicho na „sukces bez issue”.

---

## 8. Rounding

| Reguła | Wartość |
|--------|---------|
| Semantyka | jak `roundWorkCatalogPln` — `Math.round(x*100)/100` |
| Gdzie | lokalna `roundPositionCostPln` (bez importu `cost-split`) |
| Per component | TAK (labor product · każda linia materiału) |
| Total | `round(labor + material)` po sumie |
| **Nie** używamy | `roundPln` z Bid (zaokrąglenie do 100 zł) |

---

## 9. Error / Status Contract

Kody DF + walidacja:  
`BRAK_IDENTITY_ROBOTY` · `BRAK_OUR_RATE` · `STALE_OUR_RATE` · `BRAK_MATERIAL_KEY` · `BRAK_CENY_MATERIALU` · `STALE_MATERIAL_PRICE` · `BRAK_BOM` · `BRAK_NORMY_MATERIALU` · `INVALID_*`.

---

## 10. Purity Guarantees (C-PCE-1)

| Zakaz | Status |
|-------|--------|
| HTTP / fetch | PASS |
| storage / KV | PASS |
| lookup PM / Work Rate | PASS |
| Bid/Offer import | PASS |
| side effects | PASS |

---

## 11. companyPrice Boundary (C-CPLN-1)

Brak `companyPricePln` w pakiecie `tender-position-cost` (input/output/import). Harness T16.

---

## 12. Bid Boundary

ZERO TOUCH — brak wywołań `computeTenderBidProposal` / zmiany Kp/profit/minMargin.

---

## 13. Future BOM Boundary

Engine akceptuje 0..N materiałów z gotowymi qty.  
Ustalanie qty/BOM = **Faza 3**. Statusy `NO_BOM` / `NO_NORM` = jawny GAP.

---

## 14. Tests

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs`  
T1–T20 + STALE/NO_IDENTITY/NO_BOM.

---

## 15. Conditions

| ID | Stan w F0 |
|----|-----------|
| C-PCE-1 | **SPEŁNIONE** (pure) |
| C-STALE-1 | default = **blokada** STALE; Owner może zmienić w F1 |
| C-AUX-1 | poza zakresem |
| C-CPLN-1 | **SPEŁNIONE** |
| C-WID-1 / C-MID-1 / C-BOM-1 | poza F0 (identity/BOM) |
