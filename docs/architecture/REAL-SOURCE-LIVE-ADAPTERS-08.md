# REAL-SOURCE-LIVE-ADAPTERS-08 — Selective Live Material Research

> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**  
> **DATA:** 2026-08-11  
> **UI:** **2.66.27**  
> **EPIC:** thin live adapters Leroy Merlin · Castorama · OBI  
> **FEATURE:** **`be136f2d`** · live tip **`a50c87a`**  
> **PRIOR:** [`REAL-SOURCE-OWNER-LEGAL-PASS-07`](REAL-SOURCE-OWNER-LEGAL-PASS-07.md) · Legal Gate **PASS** · D1 **VERIFIED**  
> **PV / CLOSEOUT:** [`REAL-SOURCE-LIVE-ADAPTERS-08-PRODUCTION-VERIFY.md`](REAL-SOURCE-LIVE-ADAPTERS-08-PRODUCTION-VERIFY.md) · [`REAL-SOURCE-LIVE-ADAPTERS-08-CLOSEOUT.md`](REAL-SOURCE-LIVE-ADAPTERS-08-CLOSEOUT.md)

---

## 1. Cel

**PRICE MEMORY FIRST.**

System pobiera ceny **wyłącznie** dla konkretnych `materialKey` w stanie **MISSING** / **STALE** potrzebnych w aktualnym przetargu.

- **CURRENT → REUSE → 0 live HTTP**
- **NIGDY** full catalog / category / bulk harvest / sitemap crawl
- Research **PER materialKey** (nie per linia BOQ)
- Direct retailer + regular price only → średnia → Owner Accept → Price Memory

---

## 2. Architektura (REUSE)

| Warstwa | SSOT |
|---------|------|
| Cache | `lookupPriceMemory` · `evaluateMaterialCache` |
| Orchestrate | `orchestrateMaterialResearch` · `executeMaterialResearchPhase2` |
| Factory | `resolveMmr02Phase2Provider` → **`OK_DIY_SELECTIVE`** |
| Provider | `createSelectiveDiyTrioResearchProvider` (`mmr02_diy_selective`) |
| Qualify | `qualifyMarketResearchObservation` · `averageQualifyingRegularMarketPrices` |
| Accept | `acceptMaterialResearchCandidate` → `commitMarketQuotesImport` |
| Lease / SF | Edge `research-job-lease` (single-flight) |
| Cooldown | istniejący session cooldown MMR |

**Bez** drugiego Price Memory / provider framework / demand system.

---

## 3. Thin adapters

| Shop | Lookup | Parse | Seller gate | Promo |
|------|--------|-------|-------------|-------|
| Leroy Merlin | selective search URL (1) | `parseDiyShopHtml` | direct LM | regular only |
| Castorama | selective search URL (1) | idem | Castorama Polska; marketplace REJECT | regular only |
| OBI | selective search URL (1) | idem | direct OBI | regular (promo alone → GAP) |

HTTP z przeglądarki: **Edge proxy** `POST /make-server-0afb8820/mmr-diy-selective-lookup`  
(allowlist origin · URL budowany server-side · anti-SSRF · ONE URL · body capped).

Fixtures / null ports: `createFixtureDiySelectiveLookup` · `createNullDiySelectiveLookup` (harness / ZERO live).

---

## 4. Flow

```text
PRZETARG → needed materialKeys (dedupe)
  → lookupPriceMemory
      CURRENT → REUSE (0 provider)
      MISSING/STALE → Phase2 research (1 job / materialKey)
        → Leroy + Castorama + OBI (bounded, serial)
        → qualify direct+regular
        → average → PriceCandidate (autoAccepted:false)
        → Owner Accept → Quotes / Price Memory
```

---

## 5. Testy

```bash
npx vite-node scripts/test-real-source-live-adapters-08.mjs
```

Pokrycie: T1–T15 + proof TENDER A (MISS→research→Accept) → TENDER B (CURRENT→0 calls) · FULL CATALOG fetch = 0.

Regresje:

```bash
npx vite-node scripts/test-invoice-price-memory-seed.mjs
npx vite-node scripts/test-market-material-research-02.mjs
```

---

## 6. Pliki (allowlist)

```text
src/lib/price-intelligence/diy-selective-lookup-types.ts
src/lib/price-intelligence/diy-shop-html-parse.ts
src/lib/price-intelligence/diy-selective-lookup-client.ts
src/lib/price-intelligence/mmr-selective-diy-provider.ts
src/lib/price-intelligence/market-material-research-02-provider.ts
src/lib/price-intelligence/index.ts
supabase/functions/make-server-0afb8820/index.tsx   # mmr-diy-selective-lookup
src/app/changelog-data.ts                           # 2.66.27
CHANGELOG.md
scripts/test-real-source-live-adapters-08.mjs
scripts/test-market-material-research-02.mjs
scripts/test-invoice-price-memory-seed.mjs
docs/architecture/REAL-SOURCE-LIVE-ADAPTERS-08.md
docs/architecture/REAL-SOURCE-LIVE-ADAPTERS-08-CLOSEOUT.md
docs/AI/09_PRODUCTION_BASELINE.md                   # tip po PV
```

**NIE w release:** LoginScreen · kv_store · inne WIP.

---

## 7. Zakazy (nadal aktywne)

- Full catalog / category / sitemap / background sync
- Marketplace / third-party seller jako referencja
- Promo-only jako referencja (bez invent regular)
- CAPTCHA / robots / hidden endpoint abuse
- Auto-accept bez Owner Accept
- Invent S10 / unrelated modules

---

## 8. NEXT

**CLOSED / PRODUCTION VERIFIED.** Tryb **UTRZYMANIE** · residual C1–C6 / new epic tylko Owner GO · **NIE** invent S10 · **NIE** masowy scrape.
