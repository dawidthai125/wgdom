# IMPLEMENT — TENDER-MODERNIZATION-01 / S7 (TRE Hub-first / primary OFF)

> **STATUS:** **IMPLEMENT COMPLETE** · **PRODUCTION VERIFIED** · tip **`617f0cb5`**  
> **Baseline tip:** UI **2.66.22** · feature S7 **`617f0cb5`** · prior S6 **`cb91027d`**  
> **DF:** [`TENDER-MODERNIZATION-01-S7-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S7-DESIGN-FREEZE.md)  
> **PV / CLOSEOUT:** [`S7-PV`](TENDER-MODERNIZATION-01-S7-PRODUCTION-VERIFY.md) · [`S7-CLOSEOUT`](TENDER-MODERNIZATION-01-S7-CLOSEOUT.md)  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **nie** w tip

## Delivered (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tenders-v4-config.ts` | `TRE_01_SLICE_A_DEFAULT = false` |
| `src/app/TenderDetailPage.tsx` | Expert hard gate · `tre01RecoveryOutcome` · Offer Run `enabled` · CTA · markers |
| `scripts/test-tender-modernization-01-s7-hub-first.mjs` | **NEW** AC-S7-1…10 |
| `scripts/test-tre-02-outcome-default.mjs` | default OFF asserts |
| `scripts/test-tre-01-offer-run.mjs` | F1 default OFF |

## OUT (verified)

- `useTenderOfferRun.ts` — unchanged
- HubPanel — zero recovery CTA
- Outcome file — zero (wrapper attrs only in DetailPage)
- S6 / Bid / OfferBoq / Strategy / DecisionView — untouched

## Verify (pre-COMMIT) — DONE this session

| Gate | Result |
|------|--------|
| S7 harness | **30 PASS** |
| TRE-02 default | **6 PASS** |
| TRE-01 offer-run (F1 OFF) | PASS |
| S2 | **45 PASS** |
| S4 | **37 PASS** |
| S5 | **27 PASS** |
| S6 | **28 PASS** |
| build | **PASS** |
| HubPanel CTA | **ZERO** |
| `useTenderOfferRun.ts` | **S7 no touch** (pre-existing local TRACE WIP — **OUT** tip) |

**STOP:** brak commit / push / tip / S8 do Owner GO COMMIT.
