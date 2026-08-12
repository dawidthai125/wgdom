# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 1 OUR RATE Integration

> **STATUS:** IMPLEMENTATION COMPLETE (lib)  
> **DATA:** 2026-08-12  
> **SSOT:** [`TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · ARCH [`…-ARCH-REVIEW.md`](./TENDER-BOQ-PRICING-REBUILD-01-ARCH-REVIEW.md) · F0 [`…-P0-POSITION-COST-ENGINE.md`](./TENDER-BOQ-PRICING-REBUILD-01-P0-POSITION-COST-ENGINE.md)  
> **UI:** **2.66.38**

---

## 1. Scope

Podłączenie **Nasz Katalog Robót → OUR RATE → Position Cost Engine** (tylko labor).

```text
workId + unit
  → lookupWorkRate (REUSE)
  → CURRENT | STALE | MISSING | NO_IDENTITY
  → PositionLaborInput
  → computePositionCost (pure F0 — bez zmian kontraktu)
```

Pliki:

- `src/lib/tender-position-cost/our-rate-labor-adapter.ts` — **nowy**
  - `resolveLaborInputFromOurWorkRate`
  - `computePositionCostWithOurRate`
- `src/lib/tender-position-cost/index.ts` — eksport F1
- `scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs`

**Engine F0:** `engine.ts` / `types.ts` — **UNCHANGED** (brak lookupu w engine).

---

## 2. Non-scope

| Poza Faza 1 |
|-------------|
| materialKey / Price Memory / sell |
| BOM / Technology / multi-material resolution |
| Bid cutover / `computeTenderBidProposal` / Kp / profit / minMargin |
| OfferBoq / Offer Expert wire |
| research / HTTP / KB.pl / SCCOT / Extradom / CennikRemontow.pl |
| seed / fallback z `companyPricePln` |
| nowe UI Firma → Nasz Katalog Robót |
| Faza 2+ |

---

## 3. Lookup contract

### Identity

`workId + unit` — REUSE `buildWorkRateIdentityKey` / `lookupWorkRate`.  
Bez drugiego systemu mapowania.

### SSOT OUR RATE

Jedynie **Nasz Katalog Robót** (`ourWorkRate` na pozycji katalogu robót).

**Zakazane źródła:** `companyPricePln` · Biblioteka „Cena firmy” · legacy mixed · labor-benchmark jako OUR RATE · Price Memory materiałów.

### Semantyka statusów

| Status | Znaczenie | Labor w engine | Pozycja complete (labor-only) |
|--------|-----------|----------------|-------------------------------|
| **CURRENT** | Świeża OUR RATE | `ourRatePln` wliczana | TAK (przy poprawnym qty) |
| **STALE** | Stawka istnieje, ale przeterminowana | stawka **nie** wliczana (C-STALE-1) · jawny issue | NIE |
| **MISSING** | Brak OUR RATE | `laborCost = null` · **BRAK STAWKI** | NIE |
| **NO_IDENTITY** | Pusty / brak workId | jak MISSING + issue identity | NIE |

### C-EMPTY

MISSING → **BRAK STAWKI**.  
**NIE:** `0 zł` · `companyPricePln` · legacy · benchmark · heurystyka.

### C-CPLN-1

`companyPricePln` całkowicie odłączony od OUR RATE.  
Adapter **nie** czyta ani nie fallbackuje na to pole.

### STALE policy

Bez Owner Decision: **nie** auto-research · **nie** HTTP przy zwykłym obliczeniu · **nie** udawaj CURRENT.

---

## 4. Engine boundary

```text
resolveLaborInputFromOurWorkRate(store, workId, unit, nowMs)
  → labor: PositionLaborInput
computePositionCost({ quantity, unit, labor, materials: [] })
```

- Engine **nie** importuje `lookupWorkRate` / store / HTTP.
- Integracja F1 = **przed** wywołaniem engine.
- Matematyka F0: `laborCost = quantity × ourRatePln` (tylko CURRENT).

---

## 5. Bid / Offer / Price Memory boundary

| Obszar | Faza 1 |
|--------|--------|
| Bid | **UNCHANGED** — zero cutover |
| Offer / OfferBoq | **UNCHANGED** |
| Price Memory | **ZERO TOUCH** — brak importów w adapterze |
| Work Rate Memory | **REUSE** — ten sam store / historia / freshness |
| Biblioteka Robót | DEFINICJA + identity + norma — **nie** źródło OUR RATE |

---

## 6. API publiczne

```ts
resolveLaborInputFromOurWorkRate(store, workId, unit, nowMs): OurRateLaborResolve
computePositionCostWithOurRate({
  store, workId, unit, quantity, nowMs, materials?
}): { ourRate, position, engineInput }
```

`OurRateLaborResolve` niesie: status, label PL, identityKey, ourRatePln, sourceType, regionScope, observedAt/updatedAt, gotowy `labor`, surowy `lookup`.

---

## 7. Testy

Harness: `npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs`

Pokrycie: CURRENT rate+cost · MISSING/C-EMPTY · brak fallbacku companyPrice · STALE + zero HTTP · identity · unit/workId isolation · history ≠ lookup · source preserved · static C-CPLN-1 / PM ban · engine pure · determinizm · regresja F0.

---

## 8. Conditions map

| ID | F1 |
|----|-----|
| C-PCE-1 | PASS (engine pure) |
| C-CPLN-1 | PASS |
| C-EMPTY | PASS |
| C-STALE-1 | PASS (blokada STALE) |
| C-WID-1 | PASS (workId+unit REUSE) |
| C-MID-1 | N/A (F2) |
| Bid cutover | OUT |
