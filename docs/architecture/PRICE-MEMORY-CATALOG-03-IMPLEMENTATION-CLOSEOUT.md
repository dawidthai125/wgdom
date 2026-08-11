# PRICE-MEMORY-CATALOG-03 — IMPLEMENTATION CLOSEOUT

> **STATUS:** **IMPLEMENTATION COMPLETE** · awaiting Production Verify  
> **DATA:** 2026-08-11  
> **UI:** **2.66.30** · feature commit **`b713d971`**  
> **PRIOR:** AUDIT + PLAN [`PRICE-MEMORY-CATALOG-03-4-VS-372-PLAN.md`](./PRICE-MEMORY-CATALOG-03-4-VS-372-PLAN.md)  
> **BASELINE prior:** 2.66.29 / CATALOG-02 VERIFIED  
> **Harness:** `scripts/test-price-memory-catalog-03.mjs` → **35 PASS / 0 FAIL**

---

## 1. Problem 4 vs 372

Owner widział **4** pozycje (PI31 ETICS HIT), mimo **372** materialKeys w seedzie zakupów Zygmunt.

## 2. Root cause

1. Builder **HIT-only** — `MISSING || !hit → skip` (kandydat bez użytecznej ceny znikał z listy).  
2. `ensureZygmuntInvoicePurchaseSeedLocal` tylko na ścieżce Chief — nie przy Firma → Nasz katalog cen.  
3. Bez `cw.inv.*` w store brak kandydatów `mat.inv.*` → pusta baza poza 4 ETICS.

## 3. Seed lifecycle (A+D)

| Entry | Funkcja | pushCloud |
|-------|---------|-----------|
| Thin shared | `ensureOurPriceCatalogMaterialPurchaseSeed` | param |
| Firma → katalog | `OurPriceCatalogPanel` mount | **false** |
| Chief | `buildChiefPricingOptionsRo` | **true** |

REUSE: `ensureZygmuntInvoicePurchaseSeedLocal` · idempotent · ZERO LIVE HTTP.

## 4. Material candidate model

```text
ZYGMUNT seed keys ∪ MAP ∪ store inv/product
  → resolveDemandProductIdentityExact
  → labor reject (CATALOG-02)
  → evaluateMaterialCache / lookupPriceMemory
  → CURRENT | STALE | MISSING → ROW
```

Dedup po `workId`. MISSING tylko gdy host już w store (bez invent CatalogWork).  
HIT-only gate **USUNIĘTY**.

## 5. CURRENT / STALE / MISSING

| Status | basePrice | sell |
|--------|-----------|------|
| CURRENT / STALE | z Price Memory | derived jeśli marża |
| MISSING | `null` („—”) | `null` (nie inventuj) |

Filtr UI default **ALL** — nie ukrywa STALE/MISSING.  
Oczekiwane po pełnym seedzie @ fixed now: **286 CURRENT · 86 STALE · 0 MISSING · 0 LABOR · 372 rows**.

## 6. Labor

CATALOG-02 gate **KEEP** · blocklist · no catch-all CatalogWork→Quotes.

## 7. Zero HTTP / refresh

- Open catalog: `fetchCalls = 0` · no auto research  
- C4 CURRENT force / C5 Accept → commit · **ONE** `materialKey`  
- LIVE-ADAPTERS-08 **UNTOUCHED**

## 8. Margin / sellPrice

- `commercialPricing.marginPct` preserve · MAX(existing, global)  
- seed / normalize / reload / refresh / Accept **nie resetują** marży  
- sell = base×(1+m/100) · MISSING → nie inventuj

## 9. Tests

| Suite | Wynik |
|-------|-------|
| C03 core | 372 / 286 CURRENT / 86 STALE / 0 LABOR · MISSING appears · 0 HTTP · C4/C5 · margin · sell · history · idempotent |
| T16 CATALOG-01 | exit 0 (45 PASS) |
| T17 CATALOG-02 | exit 0 |
| T18 LIVE-08 | exit 0 |
| T19 MMR-02 | exit 0 |
| T20 invoice seed | exit 0 |
| **Łącznie** | **35 PASS / 0 FAIL** |
| Build | **PASS** |

## 10. Files

- `src/lib/price-intelligence/ensure-our-price-catalog-material-seed.ts`  
- `src/lib/price-intelligence/our-price-catalog.ts`  
- `src/app/price-catalog/OurPriceCatalogPanel.tsx`  
- `src/lib/chief-wire-adapters/catalog.ts`  
- `src/lib/price-intelligence/index.ts`  
- `scripts/test-price-memory-catalog-03.mjs`  
- `scripts/audit-price-memory-catalog-03-4-vs-372.mjs`  
- docs AUDIT / PLAN / ten CLOSEOUT  
- changelog **2.66.30**

## 11. Invariants

```text
MATERIAL CANDIDATE = visibility
PRICE MEMORY = price status (CURRENT/STALE/MISSING)
SECOND DB / KV = ZERO
FULL CATALOGUE = ZERO
OPEN CATALOG HTTP = 0
AUTO RESEARCH = ZERO
LABOR = SEPARATE (CATALOG-02)
companyPricePln / Bid minMarginPct = UNTOUCHED
```

## 12. Production

Po push: **DEPLOY PROPAGATING** do potwierdzenia `version.json` = **2.66.30**.  
**PRODUCTION VERIFIED** dopiero po live PV (372 · MATERIAL ONLY · 286/86 · 0 HTTP · 0 auto research).
