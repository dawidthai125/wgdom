# SMART-PRICING-01 — IMPLEMENT P0 REPORT

> **ID:** SMART-PRICING-01-IMPLEMENT-P0  
> **EPIC:** SMART-PRICING-01  
> **Etap:** **IMPLEMENT P0** · Detect & Surface RO  
> **Data:** 2026-07-30  
> **Owner GO IMPLEMENT P0:** **TAK**  
> **AR:** READY FOR OWNER GO  
> **DF:** [`SMART-PRICING-01-DESIGN-FREEZE.md`](SMART-PRICING-01-DESIGN-FREEZE.md)  
> **Zakaz (respektowany):** One-shot · Evidence · Rank · Save · Publish · commit · MS lookup · AI-COST rewrite · Cloud Sync · Payroll · P1

```text
════════════════════════════════════════════════════════
PAYROLL SAFETY GATE (IMPLEMENT P0)
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE
Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
════════════════════════════════════════════════════════
```

---

## 1. Zakres zrealizowany

| # | Wymaganie Owner | Realizacja |
|---|-----------------|------------|
| 1 | Detect braków cen | `detectMissingPrices` — unmapped / work_missing / no_quote / low_confidence / stale |
| 2 | Quotes-first RO | `listProductQuoteCellsForRegion` · work×activeRegion · zero MS |
| 3 | Oznaczenie pozycji | `data-smart-pricing-01-missing` + badge „brak Quotes” |
| 4 | Info użytkownikowi | `SmartPricingDetectBanner` w OfferBoq Cost Intelligence |
| 5 | Extension points | `SMART_PRICING_EXTENSIONS` P1–P3 · `available: false` |

**Progi DF O-SP-F:** conf ≥ **0.50** · stale ≤ **180** dni · region = `activeRegion` katalogu.

---

## 2. Pliki

| Ścieżka | Rola |
|---------|------|
| `src/lib/smart-pricing/**` | Detect · Quotes RO · constants · extensions |
| `src/app/smart-pricing/SmartPricingDetectBanner.tsx` | UI surface |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | cienki wire (bez rewrite Bid/AI-COST) |
| `scripts/test-smart-pricing-01-p0.mjs` | testy P0 |
| `changelog-data.ts` / `CHANGELOG.md` | **2.65.86** |

---

## 3. Owner Verification (OV)

| Check | Wynik |
|-------|--------|
| OV-1 Detect działa na fixturech (5 missing + 1 ok) | **PASS** |
| OV-2 Quotes fingerprint unchanged po Detect | **PASS** (T08) |
| OV-3 Zero commit/apply/publish/pushKeys/persistKey w smart-pricing + banner | **PASS** (T07) |
| OV-4 Extension P1–P3 unavailable | **PASS** (T06) |
| OV-5 Region isolation (inna region ≠ useful) | **PASS** (T05) |
| OV-6 Brak Cloud Sync / Payroll w diff P0 | **PASS** (allowlist) |
| OV-7 UI wire tylko OfferBoq panel + banner | **PASS** |

---

## 4. Build / Test

| | |
|--|--|
| `npx vite-node scripts/test-smart-pricing-01-p0.mjs` | **58 PASS · 0 FAIL** |
| `npm run build` | **PASS** |

---

## 5. Zasady projektu

| Zasada | Werdykt |
|--------|---------|
| SSOT FIRST | **PASS** — Quotes jedyne źródło Detect |
| REUSE FIRST | **PASS** — WC `marketQuotes` AS-IS · OfferBoq RO |
| ZERO DUPLICATE LOGIC | **PASS** — nowy Detect w smart-pricing; CM-01 gaps pozostaje za flagą (osobny UX) |
| FEATURE-DATA ONLY | **PASS** — brak DATA_KEY / cloud-sync |
| DATA FIRST | **PASS** — reguły conf/stale, nie LLM |

---

## 6. WERDYKT

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 IMPLEMENT P0

WERDYKT: READY FOR RELEASE P0

CHANGES REQUIRED: NIE
P1: NIE rozpoczęty
Commit / push: tylko na jawne Owner GO
════════════════════════════════════════════════════════
```

**NEXT:** Owner GO **RELEASE P0** (commit+push) · potem osobne GO na **P1**.
