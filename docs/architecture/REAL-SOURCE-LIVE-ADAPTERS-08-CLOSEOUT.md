# REAL-SOURCE-LIVE-ADAPTERS-08 — CLOSEOUT

> **STATUS:** FEATURE COMMITTED · **DEPLOY / PV** — patrz VERIFY FAST  
> **DATA:** 2026-08-11  
> **UI:** **2.66.27**  
> **FEATURE COMMIT:** **`be136f2d`** · full **`be136f2da265efdc9136d80347dc29de271bd026`**

---

## Rozdział statusów

| Warstwa | Status |
|---------|--------|
| Legal Gate | **PASS** |
| D1 | **VERIFIED** |
| `liveHttpEligible` | **true** |
| Factory reason | **`OK_DIY_SELECTIVE`** |
| Provider | `mmr02_diy_selective` · `connected:true` |
| Auto-accept | **false** (Owner Accept) |
| Full catalog | **ZERO** |
| CURRENT → REUSE | **PASS** |
| MISSING → research | **PASS** |
| SECOND TENDER REUSE | **PASS** |
| Marketplace / promo filter | **PASS** |
| Harness | **42 PASS / 0 FAIL** |
| Invoice seed regression | **38 PASS** |
| MMR-02 regression | **73 PASS** |
| Build | **PASS** (`version.json` **2.66.27**) |

---

## Allowlist (feature commit)

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
