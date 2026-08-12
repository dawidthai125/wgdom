# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 5 PRODUCTION VERIFY

> **DATA:** 2026-08-12  
> **WERDYKT:** **PRODUCTION VERIFIED · GREEN**  
> **TRYB:** PV ONLY · ZERO feature code · ZERO F6 · ZERO live research

---

## Live

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun/version.json |
| **LIVE VERSION** | **2.66.42** |
| **LIVE COMMIT** (`version.json`) | **`1e7aced`** |
| timestamp | 2026-08-12T07:46:35.498Z |
| **EXPECTED VERSION** | **2.66.42** |
| **Feature SHA (F5)** | **`3995c9af`** |
| Docs tip SHA | **`1e7acedd`** (= live tip) |
| Ancestor check | `3995c9af` ⊂ `1e7acedd` / `origin/main` · **PASS** |

```text
curl -s https://www.wgdom.fun/version.json
→ {"version":"2.66.42","commit":"1e7aced",...}
```

---

## Bundle probe (read-only)

| Chunk | Dowód |
|-------|--------|
| `assets/app-core-1uamsUUr.js` | shell + changelog tip |
| `assets/TendersModule-D9t7k-QB.js` | F5 cutover · Bid · Position Cost · OUR RATE · BOM · SELL · GAP |
| `assets/index-DhwSACMn.js` | entry |

### Required markers (TendersModule + app-core)

| Marker | Status |
|--------|--------|
| `OUR RATE + Technology/BOM + Price Memory SELL (F5 cutover)` | **HIT** |
| `BID CUTOVER GATE FAIL` | **HIT** |
| `ZERO legacy fallback` | **HIT** |
| `EQUIPMENT / TRANSPORT / AUXILIARY` | **HIT** |
| `Position Cost Engine` | **HIT** |
| `positionCostCutover` | **HIT** |
| `computeTenderBidProposal` | **HIT** |
| `recommendedBidPln` | **HIT** |
| `offer_boq_ai` | **HIT** |
| `kpPct` / `profitPct` / `minMarginPct` | **HIT** |
| `lookupWorkRate` | **HIT** |
| `computeSellPricePln` | **HIT** |
| `projectBom` | **HIT** |
| GAP: BRAK STAWKI / BOM / CENY / NIEJEDNOZNACZNA | **HIT** |
| `ath_priced` (C-MODE-1 untouched) | **HIT** |
| `companyPricePln` near F5 sourceLabel | **FALSE** (no leak at cutover label) |

`companyPricePln` **obecne** w bundlu (pole legacy modelu — oczekiwane) · **nie** jako źródło F5 sourceLabel.

---

## Kontrakt F5 (live evidence)

```text
BOQ → Position Cost → offerBoqDirect → computeTenderBidProposal
  → Kp → profit → minMargin → recommendedBidPln
```

| Warstwa | Live |
|---------|------|
| Bid cutover ON | **PASS** (`positionCostCutover` + F5 sourceLabel) |
| Position Cost | **PASS** |
| OUR RATE | **PASS** (`lookupWorkRate`) |
| BOM / Technology | **PASS** (`projectBom`) |
| Price Memory / sell | **PASS** (`computeSellPricePln`) |
| Bid stack Kp/profit/minMargin | **UNCHANGED** (symbole obecne · semantyka bez rewrite F5) |
| recommendedBidPln | **PASS** |
| GAP handling | **PASS** |
| companyPricePln → Bid | **ZERO** (no adjacency to F5 sourceLabel) |
| ATH / catalog | **UNCHANGED** (`ath_priced` retained · F6 OUT) |

---

## Negative checks

| Check | Status | Uwaga |
|-------|--------|-------|
| HTTP podczas kalkulacji Bid (F5 path) | **0** | harness F5 T13 · PV bez live research |
| AUTO RESEARCH w F5 Bid | **0** | cutover cache-first · research osobny mechanizm |
| companyPrice fallback | **0** | |
| legacy pricing fallback (cutover mode) | **0** | `ZERO legacy fallback` HIT |
| invent ceny / materiału / normy | **0** | GAP strings + BOM-only |

Obecność stringów `kb.pl` / sklepów w TendersModule = **UI/research innych ścieżek** (Work Rate / MMR) — **nie** dowód auto-research w Bid cutover.

---

## Harness evidence (PV session)

```text
npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs
→ WYNIK F5 BID CUTOVER: 36 PASS / 0 FAIL
```

---

## Werdykt

```text
EXPECTED VERSION: 2.66.42
LIVE VERSION:     2.66.42
LIVE COMMIT:      1e7aced
FEATURE:          3995c9af (ancestor)
BID CUTOVER:      PASS
PRODUCTION:       VERIFIED · GREEN
NEXT:             F6 ONLY AFTER OWNER GO
```

## STOP

Nie implementuj F6. Nie audytuj ATH. Czekaj na Owner GO.
