# REAL-SOURCE-LIVE-ADAPTERS-08 — PRODUCTION VERIFY

> **STATUS:** **PRODUCTION VERIFIED · GREEN**  
> **DATA:** 2026-08-11  
> **UI live:** **2.66.27**  
> **LIVE commit (`version.json`):** **`a50c87a`** (tip docs HEAD; zawiera feature **`be136f2d`**)  
> **FEATURE COMMIT:** **`be136f2d`** · tip docs **`a50c87a0`**

---

## 1. Deploy baseline

| Pole | Wartość |
|------|---------|
| Poprzednia prod | **2.66.26** / `7b00d95` |
| Oczekiwane | **2.66.27** |
| Live `https://www.wgdom.fun/version.json` | **2.66.27** / **`a50c87a`** · ts `2026-08-11T14:48:37.068Z` |
| Werdykt deploy | **PASS** (nie 2.66.26) |

---

## 2. Bundle markers (prod assets)

| Asset | Markery |
|-------|---------|
| `assets/TendersModule-DWsg3eRH.js` | **`OK_DIY_SELECTIVE`** · **`mmr02_diy_selective`** · `mmr-diy-selective-lookup` · `live_selective_diy` · `current_reuse_no_research` · `PRICE_GAP` |
| `assets/app-core-B6NesKHH.js` | `mmr-diy-selective-lookup` (Edge client path) |

Factory: `resolveMmr02Phase2Provider` → **`OK_DIY_SELECTIVE`** → provider id **`mmr02_diy_selective`**.

---

## 3. Edge (dry probe — ZERO shop harvest)

Endpoint: `POST …/make-server-0afb8820/mmr-diy-selective-lookup`

| Probe | Wynik |
|-------|--------|
| `{}` | **400** `missing_materialKey` |
| `provider=evil` | **400** `invalid_provider` |
| `provider=leroy` bez query | **400** `url_not_allowed` |
| unknown route | **404** |

Potwierdza: route live · allowlist · server-side URL build · **bez** celowego fetch katalogu sklepu w PV.

---

## 4. Selective research / Price Memory FIRST

Dowód semantyczny = harness (fixtures · **0 unexpected live fetch**):

| Test | Wynik |
|------|--------|
| CURRENT → REUSE · researchCalls=0 | PASS |
| MISSING → research | PASS |
| 30 keys / 23 CURRENT / 7 MISSING semantics (dedupe) | PASS |
| duplicate BOQ lines → 1 key | PASS |
| single-flight | PASS |
| marketplace REJECT | PASS |
| promo REJECT / regular QUALIFY | PASS |
| average 210 (200+220+210) | PASS |
| TENDER A → Accept → TENDER B REUSE | PASS |
| FULL CATALOG fetch | **ZERO** |
| autoAccepted | **false** |

---

## 5. Regresje (re-run PV)

| Suite | Wynik |
|-------|--------|
| `test-real-source-live-adapters-08.mjs` | **42/42 PASS** |
| `test-invoice-price-memory-seed.mjs` | **38 PASS** · unique materials **372** · Legal PASS · D1 VERIFIED |
| `test-market-material-research-02.mjs` | **73 PASS** · LIVE HTTP = ZERO (null/fixture path w regresjach) |

---

## 6. Security / budget (PV)

- Full catalogue / category crawl / bulk harvest: **NIE obserwowane** (kontrakt + harness ZERO)
- Marketplace / unknown seller: REJECT
- Promo-only: REJECT / PRICE_GAP
- Max 3 shops / materialKey (bounded trio)
- Edge: allowlist hosts · ONE URL · redirect host re-check · body cap 400k

---

## 7. Legal / D1 (bez zmian)

| Flaga | Status |
|-------|--------|
| `MARKET_SYNC_P3_LEGAL_GATE` | **PASS** |
| `MMR_02_PRIMARY_SOURCE_STATUS` | **VERIFIED** |
| `liveHttpEligible` | **true** |

---

## 8. Werdykt

**PRODUCTION VERIFIED · GREEN**

REAL-SOURCE-LIVE-ADAPTERS-08 → **CLOSED**.
