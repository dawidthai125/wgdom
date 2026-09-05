# IK AUTONOMY-06 — P7 Autonomous Bid Calculation · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **PRODUCTION VERIFIED** · **DOCUMENTATION READY FOR OWNER APPROVAL** · **EPIC NOT CLOSED** |
| **Date** | 2026-08-17 |
| **UI version** | **2.66.91** |
| **Production** | **2.66.91** / live **`ab5eaaa`** · impl **`ab5eaaa1`** (`ab5eaaa1a2eb2d244dacf16dc3f9e74800994148`) |
| **Deploy** | Vercel Git Integration · ID **`2K83MAbvKxYzNZeB8EqynWaHu9Pb`** · origin/main |
| **O2** | **APPROVED** — `"AUTO"\|"OFF"\|"ON"` on same key `ikF5E2eEnabled` |
| **OD-P7b** | **ACCEPTED** — B-POLICY `true→ON` · `missing→AUTO` · `false→AUTO` |
| **DF** | [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS · C1–C5 **implemented** · blockers **0** |
| **PV** | [`IK-AUTONOMY-06-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-06-PRODUCTION-VERIFY.md) |
| **Owner Verify** | **PASS WITH FINDINGS** (non-blocking) |
| **D** | **HARD STOP / false** |
| **CatalogWork** | **471** UNCHANGED |
| **P1** | **CLOSED** (`mat.inv.*` blocked) |
| **P2** | **KEEP GAP** |
| **Composite** | **CLOSED** · `feedsP7Bid=false` |
| **EPIC CLOSE** | **NOT CLOSED** (docs commit / EPIC close = osobna tura · Owner GO) |

> **★★ CURRENT RUNTIME AMENDMENT (2026-09-05):** Expert Chain / P7 host eligibility interprets Document **`readyForExperts`** vs admission **`expertChainMayProceed`** per Master §2A.9 · line-tolerant **CLOSED/PV** @ **`a5d19047`**. Historical closeout lines with sole `readyForExperts` = era HISTORY. **Unchanged:** P7 read-only · Final Bid OWNER.

```text
PLAN                   = PASS
OD-P7b                 = B-POLICY
DESIGN FREEZE          = PASS
ARCH REVIEW            = PASS WITH CONDITIONS · blockers 0
IMPLEMENTATION         = PASS
OWNER VERIFY           = PASS WITH FINDINGS
COMMIT                 = PASS · ab5eaaa1
PUSH                   = PASS
DEPLOY                 = PASS
PRODUCTION VERIFY      = PASS
DOCUMENTATION          = READY FOR OWNER APPROVAL
PRODUCTION             = 2.66.91 / ab5eaaa1
EPIC                   = NOT CLOSED
```

---

## 1. Owner decisions (frozen)

| Decision | Result |
|----------|--------|
| **O2** | **APPROVED** — enum on **same** key · **no new flag** |
| **OD-P7b** | **ACCEPTED** — B-POLICY |

| Key | Typ |
|-----|-----|
| `ikF5E2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |

Default: **`"AUTO"`**.

### B-POLICY (legacy boolean)

| Stored | Normalized |
|--------|------------|
| `true` | **ON** |
| missing / unknown / malformed | **AUTO** (DF §11.1 — not ON) |
| `false` | **AUTO** (never OFF) |

Jawny HOLD = wyłącznie zapisane **`"OFF"`**. Merge: **OFF wins**.  
Gate: `isIkE2eModeActive` (`AUTO \|\| ON`). **Nie** `=== true` na enumie. **Nie** `\|\| true`.

---

## 2. Runtime contract

```text
AUTO → READ-ONLY P7 calculation  (runIkP7PositionCostBid · in-memory TenderBidProposal)
ON   → same runtime as AUTO
OFF  → HOLD / kill-switch

P7 RUN = ikEntryEnabled === true
         ∧ (masterBoq.readyForExperts ∨ OfferBoq lines)
         ∧ mode ∈ {AUTO, ON}
         ∧ isIkE2eModeActive(mode)
```

Binding: existing `IkEntryHost` `useMemo` — **no** manual per-line P7 start.  
Engine: existing `runIkP7PositionCostBid` — **UNCHANGED** (not in `ab5eaaa1`).

---

## 3. Research / Owner boundaries

| Boundary | Status |
|----------|--------|
| P7 Research | **CONDITIONAL** — P7 AUTO/ON **does not** start Research |
| Research HTTP / lease | **0** (P7 has no research lever) |
| P5/P6 Research | **unchanged** — osobny `=== true` |
| Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid | **OWNER** |
| D | **HARD STOP / false** |

P7 produces **proposal/calculation only**. Not a bid commit.

---

## 4. Safety (locked)

| Invariant | Status |
|-----------|--------|
| no new engine | **PASS** |
| no new flag | **PASS** — same `ikF5E2eEnabled` |
| no `=== true` / `\|\| true` on enum | **PASS** |
| `computePositionCost()` | **UNCHANGED** |
| F5 XOR | **PASS** — `feedsP7Bid=false` |
| Composite | **CLOSED / unchanged** — P7 does not consume Composite |
| P1 `mat.inv.*` | **CLOSED / blocked** |
| P2 | **KEEP GAP** — `cc-w2-zawor-odcinajacy` · `cc-p0c-w1-zawor-odpowietrzajacy` → `PRODUCT_IDENTITY_GAP` |
| CatalogWork | **471** |
| D | **false** |

---

## 5. Files in feature commit `ab5eaaa1`

| File | Role |
|------|------|
| `src/lib/app-settings.ts` | P7 `IkE2eMode` · default AUTO · load/merge |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | `isIkE2eModeActive` gate · `forceIkF5E2eForTests` |
| `src/app/AdminSettingsModal.tsx` | select AUTO/ON/OFF + confirm OFF |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | comment only — existing binding |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.66.91** |
| `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` | T01–T32 |
| PLAN / OD-P7b / DF / ARCH REVIEW / P7 implementation closeout | prior docs in same commit |

**Not changed:** `ik-p7-position-cost-bid.ts` · Composite · F5/`engine.ts` · P5/P6 engines · Classification · D · CatalogWork.

---

## 6. Test / Owner Verify

| Suite | Result |
|-------|--------|
| AUTONOMY-06 P7 harness | **95 PASS / 0 FAIL** |
| AUTONOMY-05 (nested) | **PASS** |
| P1 invoice | **PASS** |
| P5.9 / P2 | **PASS** |
| Composite | **PASS** |
| P8 | **PASS** |
| P5 | **44 PASS / 0 FAIL** |
| P0 | **52 PASS / 0 FAIL** |
| P10 | **26 PASS / 0 FAIL** |
| Build | **PASS** |
| P6 nested MMR-02 | **pre-existing hang** — not A06 regression · P6 engine untouched |

### Owner Verify findings (non-blocking)

1. C3 residual: old client `false` over remote `"OFF"` → new B-POLICY **AUTO** (same class as AUTONOMY-05).
2. Paczka VII live P7 runtime **NOT OBSERVABLE** without settings write (IK Entry ≠ true).
3. Unrelated WIP remained local / uncommitted (never `git add -A`).

---

## 7. Production Verify

**PV = PASS.** Full record: [`IK-AUTONOMY-06-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-06-PRODUCTION-VERIFY.md).

Paczka VII `08decd1d-542e-312b-5fad-9500015f7011`: BOQ **READY** / **159** · CatalogWork **471**.  
Live P7 execution: **NOT OBSERVABLE** — not a failure. See PV § Paczka VII.

Write audit (PV): Accept / Price Commit / Final Bid / PM / PRICE_DEMAND / CatalogWork write / Tender mutation / Research HTTP / Research lease / Settings write = **0**.

---

## 8. Status

```text
PRODUCTION VERIFY      = PASS
DOCUMENTATION CLOSEOUT = READY FOR OWNER APPROVAL
09                     = UPDATED (this closeout set)
Commit (docs)          = NOT DONE
Push                   = NOT DONE
EPIC                   = NOT CLOSED
```

Prior: [`PLAN`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md) · [`OD-P7b`](./IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md) · [`DF`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md) · [`ARCH REVIEW`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-ARCH-REVIEW.md) · [`P7 IMPL (feature)`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-IMPLEMENTATION-CLOSEOUT.md)

Prior production: AUTONOMY-05 **2.66.90** / **`44e81d20`**.
