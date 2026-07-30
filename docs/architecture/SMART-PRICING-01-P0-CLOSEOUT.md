# SMART-PRICING-01 P0 — CLOSEOUT (SSOT)

> **ID:** SMART-PRICING-01-P0-CLOSEOUT  
> **EPIC:** SMART-PRICING-01 · **Slice:** P0 — Detect & Surface RO  
> **STATUS:** **CLOSED** · **RELEASE GO** · tip UI **2.65.86** · feature **`9ca4a4e5`**  
> **Data:** 2026-07-30  
> **Production Verify (FAST):** po feature push = **DEPLOY PROPAGATING** (`2.65.85` / `93962b2`) — szczegóły [`SMART-PRICING-01-P0-RELEASE-REPORT.md`](SMART-PRICING-01-P0-RELEASE-REPORT.md)

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 P0 = CLOSED
Detect Quotes-first RO → banner + badge w OfferBoq
Progi DF: conf ≥0.50 · stale ≤180d · activeRegion
BEZ One-shot · Evidence · Rank · Save · Publish · commit · MS
NEXT slice = P1 (Evidence+One-shot) — tylko po Owner GO
════════════════════════════════════════════════════════
```

---

## 1. Co zamknięto

| Element | Wartość |
|---------|---------|
| **Zakres** | Detect braków użytecznej ceny · Quotes-first RO · oznaczenie pozycji · banner UI · extension stubs P1–P3 |
| **Progi** | conf ≥ **0.50** · stale ≤ **180** dni · region = `activeRegion` |
| **UI** | OfferBoq Cost Intelligence — banner + badge „brak Quotes” |
| **UI version** | **2.65.86** |
| **Feature commit** | **`9ca4a4e5`** |
| **Test** | **58 PASS** · `scripts/test-smart-pricing-01-p0.mjs` |
| **Build** | **PASS** |
| **OV** | **PASS** · [`SMART-PRICING-01-OWNER-VERIFICATION-P0.md`](SMART-PRICING-01-OWNER-VERIFICATION-P0.md) |
| **Gate** | ALL-NIE · FEATURE-DATA |

---

## 2. Commity / hash

| Rola | Hash |
|------|------|
| **Feature** | **`9ca4a4e5`** |
| **Docs CLOSEOUT** | **`15e23789`** |

---

## 3. OUT / zakazy respektowane

- One-shot · Price Evidence · Ranking · Save · Publish  
- `commitMarketQuotesImport` · MARKET-SYNC lookup  
- AI-COST rewrite (tylko cienki odczyt/wire Detect)  
- Cloud Sync · Payroll · P1

---

## 4. Artefakty

| Dokument | Rola |
|----------|------|
| [`SMART-PRICING-01-DESIGN-FREEZE.md`](SMART-PRICING-01-DESIGN-FREEZE.md) | DF FROZEN |
| [`SMART-PRICING-01-ARCHITECTURE-REVIEW.md`](SMART-PRICING-01-ARCHITECTURE-REVIEW.md) | AR READY FOR OWNER GO |
| [`SMART-PRICING-01-IMPLEMENT-P0.md`](SMART-PRICING-01-IMPLEMENT-P0.md) | IMPLEMENT |
| [`SMART-PRICING-01-P0-RELEASE-REPORT.md`](SMART-PRICING-01-P0-RELEASE-REPORT.md) | RELEASE |
| Ten plik | **SSOT CLOSEOUT P0** |

---

## 5. NEXT

**P1** (Evidence · Rank · Confidence · One-shot · Odrzuć) — **tylko** po Owner GO · **nie** auto-start.  
MARKET-SYNC P2 / CM-04 P3 — osobne GO.
