# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 2 Material Identity + SELL

> **STATUS:** IMPLEMENTATION COMPLETE (lib)  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · F1 [`…-F1-OUR-RATE-INTEGRATION.md`](./TENDER-BOQ-PRICING-REBUILD-01-F1-OUR-RATE-INTEGRATION.md) · F0 [`…-P0-POSITION-COST-ENGINE.md`](./TENDER-BOQ-PRICING-REBUILD-01-P0-POSITION-COST-ENGINE.md)  
> **UI:** **2.66.39**

---

## 1. Scope

Podłączenie **drugiej strony** Position Cost: materiał.

```text
materialKey
  → resolveDemandProductIdentityExact (REUSE)
  → evaluateMaterialCache / lookupPriceMemory (REUSE)
  → CURRENT | STALE | MISSING | NO_KEY
  → basePrice (Price Memory)
  → commercialPricing.marginPct (REUSE resolveMarginPct)
  → computeSellPricePln (REUSE)
  → PositionMaterialInput { quantity, sellPricePln }
  → computePositionCost (pure F0)
```

Labor (F1) bez zmian:

```text
workId + unit → lookupWorkRate → OUR RATE → labor
```

Pliki:

- `src/lib/tender-position-cost/material-sell-adapter.ts` — **nowy**
  - `resolveMaterialInputFromPriceMemory`
  - `resolveMaterialsInputFromPriceMemory`
  - `computePositionCostWithMaterials`
  - `computePositionCostWithOurRateAndMaterials`
- `src/lib/tender-position-cost/index.ts` — eksport F2
- `scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs`

**Engine F0 / adapter F1:** **UNCHANGED** (kontrakt matematyczny i labor lookup).

---

## 2. Non-scope (BOM boundary)

| Poza Faza 2 |
|-------------|
| BOM / Technology / normy ilości |
| automatyczny dobór materiałów do roboty |
| multi-material resolver „co należy do workId” |
| Bid / OfferBoq cutover |
| research / HTTP / sklepy |
| drugi Price Memory / drugi katalog materiałów |
| zmiana `companyPricePln` / Legal Gate / Work Rate |

Faza 2 **przyjmuje już określone** `materialKey` + `quantity` — nie wymyśla listy ani ilości.

---

## 3. Material identity (C-MID-1)

- Identity: **`materialKey`** via `resolveDemandProductIdentityExact`
- Brak / niejednoznaczny / nieznany klucz → **`NO_KEY`** / „BRAK MATERIAL KEY”
- **Zakaz:** zgadywanie z nazwy tekstowej, cichy fallback, drugi system mapowania

---

## 4. Price Memory + base + sell

| Krok | SSOT |
|------|------|
| Lookup | `evaluateMaterialCache` → `lookupPriceMemory` |
| Base | `hit.price` z Price Memory |
| Margin | `resolveMarginPct(work.commercialPricing)` |
| Sell | `computeSellPricePln(base, marginPct)` = base × (1 + margin/100) + istniejący rounding |

**C-PRICE-1:** cena do engine = PM → commercialPricing → SELL.  
**C-MARGIN-1:** bez nowej logiki marży; Bid `minMarginPct` / `profitPct` / Kp **UNCHANGED**.  
**C-CPLN-1:** `companyPricePln` **ZERO** jako źródło sell.

### Statusy

| Status | Znaczenie | W engine |
|--------|-----------|----------|
| **CURRENT** | świeża baza + (opcjonalnie) sell | sell × qty wliczane gdy sell finite |
| **STALE** | baza przeterminowana | **nie** wliczaj (C-STALE-1) |
| **MISSING** | brak quote / brak ceny | **BRAK CENY MATERIAŁU** — nie 0 / nie companyPrice |
| **NO_KEY** | brak materialKey | **BRAK MATERIAL KEY** |

Global margin floor (MAX) — istniejąca semantyka katalogu; Faza 2 **nie** zmienia zasad UI ani nie przenosi globalnej marży do Bid.

---

## 5. Engine boundary

```text
resolve materials (0..N specs)
  → PositionMaterialInput[]
(+ opcjonalnie F1 labor)
  → computePositionCost
```

Engine liczy `Σ(qty × sell)` — **bez** lookupów / HTTP / storage / research.

---

## 6. Bid / Offer / Work Rate boundary

| Obszar | Faza 2 |
|--------|--------|
| Bid / Offer | **UNCHANGED** — zero cutover |
| OUR RATE / F1 | **UNCHANGED** |
| Price Memory write paths | **ZERO TOUCH** (`commitMarketQuotesImport`, research, …) |
| Nasz Katalog Cen (UI) | bez przebudowy |

---

## 7. Testy

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs`

Pokrycie: CURRENT base/sell/cost · labor+1 · labor+N · zero mat · MISSING · STALE · NO_KEY · C-CPLN-1 · REUSE sell/PM/margin · engine pure · F1 regresja · determinizm · rounding.

---

## 8. Conditions

| ID | F2 |
|----|-----|
| C-MID-1 | PASS |
| C-PRICE-1 | PASS |
| C-MARGIN-1 | PASS |
| C-CPLN-1 | PASS |
| C-STALE-1 | PASS (blokada) |
| C-BOM-1 | OUT (F3) |
| Bid cutover | OUT |
