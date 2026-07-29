# COST-BID-GAP-01 / GAP-A — PRODUCTION VERIFY

> **ID:** COST-BID-GAP-01-GAP-A-PV  
> **Data:** 2026-07-29  
> **Tip:** **2.65.77** · commit **`a061bbd`** (`a061bbd0`)  
> **Fixture:** `08dee335-f338-1f30-ebd1-65000155122a`  
> **Probe:** `.tmp/cost-bid-gap-01-pv-probe.mjs` → `.tmp/cost-bid-gap-01-pv-probe.json`  
> **Zakres:** READ-ONLY · bez zmian kodu · bez mutacji KV · bez commit/push

---

## 1. Wersja tip

| Pole | Oczekiwane | Live `version.json` | Wynik |
|------|------------|---------------------|-------|
| version | `2.65.77` | `2.65.77` | **PASS** |
| commit | `a061bbd0` / `a061bbd` | `a061bbd` | **PASS** |
| timestamp | — | `2026-07-29T05:57:38.223Z` | OK |

---

## 2. Feature Flag OFF (= baseline 2.65.76)

| Metryka | Baseline RCA | PV OFF | Wynik |
|---------|--------------|--------|-------|
| `recommendedBidPln` | **1 061 000** | **1 061 000** | **PASS** |
| `unknownCount` | **62** | **62** | **PASS** |
| `direct` | **614 095.14** | **614 095.14** | **PASS** |
| `pricingMode` | catalog | catalog | **PASS** |

Pełna zgodność z baseline tip 2.65.76 / RCA.

---

## 3. Feature Flag ON (GAP-A)

| Metryka | OFF | ON | Δ | Wynik |
|---------|-----|-----|---|-------|
| UNKNOWN | 62 | **54** | **−8** | **PASS** |
| direct | 614 095 | **722 131** | **+108 036** | **PASS** |
| Bid catalog | 1 061 000 | **1 206 200** | **+145 200** | OK (skutek stacku SSOT) |
| Hardcode 1 600 000 | — | Bid ≠ 1 600 000 | — | **PASS** |

### Market overlay (REUSE)

Na ścieżce `resolveGapACatalogRate` + `marketQuotes` (kształt Work Catalog jak T5):

| Evidence | Wartość |
|----------|---------|
| `materialSource` | **market** |
| lookup material PLN/j.m. | **22.58** (vs seed **8.96**) |
| linie `materialSource=market` na agregacie z works | **14** |
| direct z market works | **729 644** (> ON bez market) |

**PASS** — overlay działa; brak AI-first / hardcode.

---

## 4. Aggregate · ONE Pensjonat · SSOT

| Check | Evidence | Wynik |
|-------|----------|-------|
| Aggregate | `mode=AGGREGATE` · `forBid=AGGREGATE:4-branches` | **PASS** |
| ONE Pensjonat | `tenderDossier.kosztorys` = `KI_Pensjonat_Kamieńskiego_…_PRZEDMIAR.pdf` (80 poz.) · **≠** Aggregate forBid | **PASS** |
| SSOT Bid | `computeTenderBidProposal` · `pricingMode=catalog` OFF i ON | **PASS** |
| Deny-list | commit `a061bbd0` bez `tenders-bid-calculator` / MULTI / cloud-sync / payroll | **PASS** |

---

## 5. Rollback

| Po `force…(false)` / usunięciu override | Wartość | Wynik |
|------------------------------------------|---------|-------|
| Bid | **1 061 000** | **PASS** |
| unknown | **62** | **PASS** |
| direct | **614 095.14** | **PASS** |

Usunięcie / wyłączenie LS `kw-cost-bid-gap-01-catalog-cal` = powrót do baseline (default OFF).

---

## 6. Checklist Owner (mapowanie)

| # | Punkt | Werdykt |
|---|-------|---------|
| 1 | version 2.65.77 / a061bbd | **PASS** |
| 2 | Flag OFF ≈ baseline | **PASS** |
| 3 | Flag ON: UNKNOWN↓ · direct↑ · market · no hardcode | **PASS** |
| 4 | Aggregate / ONE / SSOT | **PASS** |
| 5 | Rollback | **PASS** |

---

## 7. Werdykt PV

```text
PRODUCTION VERIFIED = PASS
```

Artefakt JSON: `.tmp/cost-bid-gap-01-pv-probe.json`  
Closeout: [`COST-BID-GAP-01-CLOSEOUT.md`](COST-BID-GAP-01-CLOSEOUT.md)
