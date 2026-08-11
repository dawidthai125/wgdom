# PRICE-MEMORY-CATALOG-02 — IMPLEMENTATION CLOSEOUT

> **STATUS:** **IMPLEMENTATION COMPLETE** · awaiting Production Verify after push  
> **DATA:** 2026-08-11  
> **UI:** **2.66.29**  
> **PRIOR:** PRICE-MEMORY-CATALOG-01 CLOSED · AUDIT/PLAN CATALOG-02  
> **PLAN:** [`PRICE-MEMORY-CATALOG-02-MATERIAL-LABOR-SEPARATION-PLAN.md`](./PRICE-MEMORY-CATALOG-02-MATERIAL-LABOR-SEPARATION-PLAN.md)

---

## 1. Root cause

`buildOurPriceCatalogRows` miał catch-all:

```text
CatalogWork z marketQuotes
  → lookupPriceMemory({ catalogWorkId: work.id, materialKey: identity||inv||work.id })
  → HIT bez material identity
```

`resolveWorkId` przy ustawionym `catalogWorkId` zwracał HIT dla robocizny / montażu / pakietów.

---

## 2. Fix

| Element | Zmiana |
|---------|--------|
| Catch-all | **USUNIĘTY** |
| Flow | `materialKey` → `resolveDemandProductIdentityExact` → labor reject → `evaluateMaterialCache` → host allowlist → row |
| `collectCandidateMaterialKeys` | MAP `mat.*` · invoice `mat.inv.*` · gated product/`wc.market` identity — **bez** blind scan każdego `work.id` |
| Host gate | `isOurPriceCatalogMaterialHost` — `cw.product.*` · `cw.inv.*` · `wc.market.*` · identity-backed · ¬labor blocklist |

**UI:** bez filtrów React/CSS — dataset MATERIAL ONLY z lib.

---

## 3. Material resolver (REUSE)

- `resolveDemandProductIdentityExact`
- `isLaborCatalogWorkBlockedForProductQuotes`
- `DEFAULT_MATERIAL_MARKET_MAP`
- `isProductCatalogWorkId` / invoice helpers
- **Bez** nowego registry / klasyfikacji / `companyPricePln` / unit-only

---

## 4. Labor separation

| W katalogu | Poza katalogiem (NO TOUCH path) |
|------------|----------------------------------|
| Klej, GK, farby, instalacje, 372 invoice… | Malowanie, montaż, układanie (praca), rbh, Biblioteka `companyPricePln`, Bid |

---

## 5. 372 material keys

- Seed Zygmunt: **372** rows / uniqueMaterialCount **372**
- Harness T6: wszystkie HIT zachowane (w tym identity-backed `mat.glue_etics` → `cw.etics.substrate`)
- `mat.inv.*` ↔ `cw.inv.*` bez utraty

---

## 6. Price Memory / CATALOG-01

| Invariant | Status |
|-----------|--------|
| `lookupPriceMemory` semantics | UNCHANGED |
| Schema Quotes / history | UNCHANGED |
| C4 manual CURRENT refresh | PASS |
| C5 Accept → commit | PASS |
| Marża / sellPrice / global MAX | PASS |
| ZERO HTTP on open | PASS |
| LIVE-ADAPTERS-08 / MMR-02 | PASS (child) |

---

## 7. Tests

| Suite | Wynik |
|-------|-------|
| `scripts/test-price-memory-catalog-02.mjs` | **36 PASS / 0 FAIL** |
| `scripts/test-price-memory-catalog-01.mjs` | **45 PASS / 0 FAIL** |
| invoice seed (child T24) | PASS |
| LIVE-ADAPTERS-08 (child T22) | PASS |
| MMR-02 (child T23) | PASS |
| Biblioteka seed manifest (T20) | PASS |
| `npm run build` | **PASS** |

---

## 8. Files

| Plik | Rola |
|------|------|
| `src/lib/price-intelligence/our-price-catalog.ts` | Builder MATERIAL ONLY |
| `src/lib/price-intelligence/index.ts` | Export `isOurPriceCatalogMaterialHost` |
| `scripts/test-price-memory-catalog-02.mjs` | Harness T1–T24 |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.66.29** |
| Docs PLAN + ten closeout | Status |

---

## 9. Git / Production

| Krok | Wartość |
|------|---------|
| Commit | `fix(price-memory): separate material catalog from labor` |
| Push | `origin/main` |
| UI | **2.66.29** |
| Production | po `version.json` — VERIFY / PROPAGATING |

---

## 10. Hard invariants (LOCK)

```text
MATERIAL → Price Memory → Nasz Katalog Cen
LABOR → osobna ścieżka kosztowa
NIE: CatalogWork → wszystko → katalog
NIE: companyPricePln / unit classification
NIE: frontend hiding / second Price Memory / new provider
```
