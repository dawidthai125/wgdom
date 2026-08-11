# REAL-SOURCE-LIVE-ADAPTERS-08 — CLOSEOUT

> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**  
> **DATA:** 2026-08-11  
> **UI:** **2.66.27**  
> **LIVE (`version.json`):** **`a50c87a`**  
> **FEATURE COMMIT:** **`be136f2d`** · full **`be136f2da265efdc9136d80347dc29de271bd026`**  
> **TIP DOCS:** **`a50c87a0`**  
> **PV:** [`REAL-SOURCE-LIVE-ADAPTERS-08-PRODUCTION-VERIFY.md`](REAL-SOURCE-LIVE-ADAPTERS-08-PRODUCTION-VERIFY.md)

---

## Rozdział statusów

| Warstwa | Status |
|---------|--------|
| Legal Gate | **PASS** (bez zmian) |
| D1 | **VERIFIED** (bez zmian) |
| `liveHttpEligible` | **true** |
| Factory reason | **`OK_DIY_SELECTIVE`** |
| Provider | `mmr02_diy_selective` · `connected:true` |
| Auto-accept | **false** (Owner Accept) |
| Full catalog | **ZERO** |
| CURRENT → REUSE | **PASS** |
| MISSING → research | **PASS** |
| SECOND TENDER REUSE | **PASS** |
| Marketplace / promo filter | **PASS** |
| Direct retail | **PASS** |
| Average | **PASS** |
| Single-flight | **PASS** |
| Edge `mmr-diy-selective-lookup` | **PASS** (dry 400 probes) |
| Harness | **42 PASS / 0 FAIL** |
| Invoice seed regression | **38 PASS** · **372** unique materialKeys |
| MMR-02 regression | **73 PASS** |
| Build / Push | **PASS** (wcześniejszy release) |
| Production | **VERIFIED** · live **2.66.27** / **`a50c87a`** |

---

## Allowlist (feature commit `be136f2d`)

```text
src/lib/price-intelligence/diy-selective-lookup-types.ts
src/lib/price-intelligence/diy-shop-html-parse.ts
src/lib/price-intelligence/diy-selective-lookup-client.ts
src/lib/price-intelligence/mmr-selective-diy-provider.ts
src/lib/price-intelligence/market-material-research-02-provider.ts
src/lib/price-intelligence/index.ts
supabase/functions/make-server-0afb8820/index.tsx
src/app/changelog-data.ts
CHANGELOG.md
scripts/test-real-source-live-adapters-08.mjs
scripts/test-market-material-research-02.mjs
scripts/test-invoice-price-memory-seed.mjs
docs/architecture/REAL-SOURCE-LIVE-ADAPTERS-08.md
```

**NIE w release:** LoginScreen · Payroll · kv_store · inne lokalne WIP.

---

## Absolutna zasada

PRICE MEMORY FIRST — live lookup tylko dla konkretnego MISSING/STALE `materialKey` potrzebnego w aktualnym przetargu. Nigdy full shop / category / bulk harvest.

---

## NEXT

**UTRZYMANIE** · residual **C1–C6** / new epic · tylko Owner GO · **NIE** invent S10 · **NIE** masowy scrape sklepów.
