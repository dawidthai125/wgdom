# TENDER-MODERNIZATION-01 / S3 — IMPLEMENT (Align Pricing)

> **STATUS:** **S3 IMPLEMENT COMPLETE** · **READY FOR OWNER VERIFICATION**  
> **ID:** TENDER-MODERNIZATION-01-S3-IMPLEMENT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S3 — Align Pricing**  
> **TRYB:** IMPLEMENT ONLY · **NO commit · NO push · NO Production Verify · NO Post Release**  
> **Data:** 2026-08-08  
> **Baseline tip (pre-ship):** UI **2.66.22** / **`1888d05f`**  
> **SSOT DF:** [`TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md)  
> **PLAN / AUDIT:** [`S3-PLAN`](TENDER-MODERNIZATION-01-S3-PLAN.md) · [`S3-AUDIT`](TENDER-MODERNIZATION-01-S3-AUDIT.md)

```text
════════════════════════════════════════════════════════
S3 IMPLEMENT — Align Pricing

S3-A  parity harness (observe only)
S3-B  Expert ON → Offer primary · OFF → Bid primary
S3-C  ONE PRIMARY PLN + source badges
S3-D  OUT · S8 OUT

NO third PLN · Bid/Offer/OfferBoq UNTOUCHED · stores UNTOUCHED

STATUS: IMPLEMENT COMPLETE · READY FOR OWNER VERIFICATION
════════════════════════════════════════════════════════
```

---

## 1. Changed files

| Plik | Etap | Zakres |
|------|------|--------|
| `scripts/test-tender-modernization-01-pricing-parity.mjs` | S3-A | **NEW** — parity harness + AC markers |
| `scripts/test-tender-modernization-s3.mjs` | S3-A | Owner alias → canonical harness |
| `src/lib/tender-offer-pln-authority.ts` | S3-B | **NEW** — thin authoritative resolve · classify · hardParity |
| `src/lib/decision-workspace-ui/labels.ts` | S3-C | canonical badges (CREATE ONCE) |
| `src/lib/decision-workspace-ui/index.ts` | S3-C | re-export badges |
| `src/app/TenderWorkflowHubPanel.tsx` | S3-C | ONE PRIMARY headline + badges |
| `src/app/decision-workspace/DecisionRecommendationPanel.tsx` | S3-C | Offer source badge · `data-s3-dw-primary-pln` |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` | S3-C | badge / primary number only |
| `src/app/TenderDetailPage.tsx` | S3-C | **thin** `offerPricePln` prop → Outcome |
| `docs/architecture/TENDER-MODERNIZATION-01-S3-IMPLEMENT.md` | docs | ten raport |

**Denylist (UNTOUCHED):** `tenders-bid-calculator` · OfferBoq · Offer Expert formulas · Expert/Chief/Session/Validation BC · Decision Persist · `kw-tender-decisions` / `kw-decision-persist-v1` · TF.

---

## 2. S3-A — Parity harness

**Run:** `npx vite-node scripts/test-tender-modernization-01-pricing-parity.mjs`  
**Result:** **32 PASS / 0 FAIL** · **UNEXPECTED_DELTA = 0**

| Metric | N |
|--------|---|
| MATCH | **1** |
| EXPECTED_DELTA | **12** |
| UNEXPECTED_DELTA | **0** |

### Fixtures covered (reuse CP01 + Offer Expert P0 + pipeline flags)

| # | Fixture | Classification |
|---|---------|----------------|
| 1 | normal tender | EXPECTED_DELTA (`company_stack`) |
| 2 | minimum price floor | EXPECTED_DELTA (`variant_not_primary`) |
| 3 | margin 12% | MATCH (Offer = Bid control) |
| 4 | margin/risk 5% scenarios | EXPECTED_DELTA (`variant_not_primary`) |
| 5 | company pricing stack | EXPECTED_DELTA (`company_stack`) |
| 6 | competitive trim | EXPECTED_DELTA (`competitive_trim`) |
| 7 | SWZ constraint | EXPECTED_DELTA (`swz_constraint`) |
| 8 | partial pricing | EXPECTED_DELTA (`partial_pricing`) |
| 9 | pricingReadyPartial | EXPECTED_DELTA (`readiness_flags`) |
| 10 | pricingReadyFinal | EXPECTED_DELTA (`readiness_flags`) |
| C | ourEstimatePln present | EXPECTED_DELTA (`our_estimate_override`) |

**NOT COVERED — REASON:** NONE (wszystkie 10 + ourEstimate zmierzone na istniejących fixture; bez sztucznego engine).

**Policy:** observe only · no equality force · no Bid/Offer formula change.

**S3-A:** **PASS**

---

## 3. S3-B — Authoritative Offer PLN

| Expert-effective | PRIMARY | Secondary |
|------------------|---------|-----------|
| ON (`adminCanViewTendersTab`) | `offerPricePln` | `recommendedBidPln` (compat) |
| OFF | `recommendedBidPln` | — |

- REUSE `isTenderExpertEffective` / `resolveTenderExpertEffective` — **no new flag / LS**
- Helper selects among existing fields only — **no third PLN keys**

**S3-B:** **PASS**

---

## 4. S3-C — ONE PRIMARY PLN + badges

| Surface | Zachowanie |
|---------|------------|
| Hub | `data-s3-primary-pln-headline` · source badge · Bid secondary when mismatch · mismatch badge |
| DW Recommendation | `OFFER_PLN_SOURCE_BADGE_PL` · `data-s3-dw-primary-pln` |
| TRE Outcome | source badge · authoritative display · Bid secondary · mismatch · **no engine** |

Canonical labels (once):

- `OFFER_PLN_SOURCE_BADGE_PL` = `"OFFER — cena ofertowa eksperta"`
- `BID_PLN_SOURCE_BADGE_PL` = `"BID — propozycja legacy"`
- `OFFER_BID_MISMATCH_BADGE_PL` = `"Rozjazd Bid↔Offer — sprawdź szczegół"`
- `COST_OFFERBOQ_DIRECT_BADGE_PL` = `"KOSZT — OfferBoq direct"` (semantics label; not used as Offer Price)

**ONE PRIMARY PLN:** **PASS**  
**S3-C:** **PASS**

---

## 5. Mismatch / OfferBoq / Bid / stores

| Rule | Status |
|------|--------|
| Mismatch: report + badge · never merge/overwrite | **PASS** |
| `OfferBoq.directPln` = cost · not Offer Price | **PASS** (UNTOUCHED) |
| Bid calculator / `recommendedBidPln` / `ourEstimatePln` | **UNTOUCHED** |
| No `normalizedPln` / `unifiedPln` / `finalPln` / `decisionPln` / `mergedPln` | **PASS** |
| `kw-tender-decisions` / `kw-decision-persist-v1` | **UNTOUCHED** |
| S3-D / S8 | **OUT** |

---

## 6. Allowlist

| Artefakt DF | Diff |
|-------------|------|
| parity harness (+ alias) | **PASS** |
| thin authoritative helper | **PASS** |
| labels (REUSE `decision-workspace-ui/labels.ts`) | **PASS** |
| Hub / DW headline / TRE Outcome badge | **PASS** |
| S3 IMPLEMENT docs | **PASS** |

**Odchylenie (thin parent wire):** `TenderDetailPage.tsx` — tylko przekazanie `offerPricePln` do Outcome (bez logiki ceny). Wymagane do TRE badge/primary; poza literalną listą DF, w duchu „Outcome wire”.

**Allowlist:** **PASS** (z odchyleniem thin DetailPage prop)

---

## 7. 8 LOCK

| # | Obszar | Status |
|---|--------|--------|
| 1 | Expert BC | ZERO TOUCH |
| 2 | Chief BC | ZERO TOUCH |
| 3 | Session | ZERO TOUCH (REUSE effective) |
| 4 | Validation | ZERO TOUCH |
| 5 | Decision Persist | ZERO TOUCH |
| 6 | OfferBoq | ZERO TOUCH |
| 7 | Bid calculator | ZERO TOUCH |
| 8 | domain / TF | ZERO TOUCH |

**8 LOCK:** **PASS**

---

## 8. AC

| AC | Result |
|----|--------|
| AC-S3-1 Offer/Bid same fixtures | **PASS** |
| AC-S3-2 every delta classified | **PASS** |
| AC-S3-3 Expert ON → Offer primary | **PASS** |
| AC-S3-4 Expert OFF → Bid primary | **PASS** |
| AC-S3-5 no third PLN | **PASS** |
| AC-S3-6 Bid calculator untouched | **PASS** |
| AC-S3-7 stores untouched | **PASS** |
| AC-S3-8 S8 retirement OUT | **PASS** |
| AC-S3-9 directPln cost semantic | **PASS** |
| AC-S3-10 canonical source badges | **PASS** |
| AC-S3-11 mismatch traceable | **PASS** |
| AC-S3-12 allowlist-only | **PASS** (DetailPage thin wire noted) |

---

## 9. Tests

| Suite | Result |
|-------|--------|
| S3 parity harness | **32 PASS / 0 FAIL** · UNEXPECTED_DELTA **0** |
| Module Enablement | **29 PASS / 0 FAIL** |
| S2 Dual Outcome | **45 PASS / 0 FAIL** |
| Decision Workspace | **15 PASS / 0 FAIL** |
| Decision Persist | **14 PASS / 0 FAIL** |
| TI-B4 (`smoke-stabilization-ng01-04`) | **12/12 PASS** · exit **0** |
| Pricing regression (`test-cost-s6-bid-proposal-integration`) | **PASS** |
| Offer Expert P0 | **26 PASS** |
| `npm run build` | **PASS** |

---

## 10. Owner Verification (checklist)

1. Expert OFF: Hub primary = Bid badge + `recommendedBidPln`
2. Expert ON: Hub primary = Offer badge + `offerPricePln`; Bid secondary gdy Δ
3. DW: Offer badge na rekomendacji
4. TRE Outcome: source badge; Expert ON używa Offer gdy session ma `offerPricePln`
5. Brak dwóch równorzędnych primary PLN
6. Parity harness: UNEXPECTED_DELTA = 0
7. Brak commit / push / PV w tym GO

---

## 11. Verdict

```text
S3 IMPLEMENT COMPLETE
READY FOR OWNER VERIFICATION

Bez commit · Bez push · Bez Production Verify · Bez Post Release
```
