# IK AUTONOMY-06 — P7 Autonomous Bid Calculation · PRODUCTION VERIFY

> **ID:** `IK-AUTONOMY-06-PRODUCTION-VERIFY`  
> **Date:** 2026-08-17  
> **Closeout:** [`IK-AUTONOMY-06-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-06-IMPLEMENTATION-CLOSEOUT.md)  
> **DF:** [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · READ-ONLY  
> **EPIC:** **NOT CLOSED**

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.91** |
| Impl commit | **`ab5eaaa1a2eb2d244dacf16dc3f9e74800994148`** (`ab5eaaa1`) |
| Live `version.json` | **2.66.91** / **`ab5eaaa`** ⊂ **`ab5eaaa1`** · `2026-08-17T18:31:59.783Z` |
| Deploy | **PASS** — Vercel Git Integration · origin/main · ID **`2K83MAbvKxYzNZeB8EqynWaHu9Pb`** |
| Live chunks | `index-CI7CcGe6.js` · `app-core-D3lF8i_b.js` · `TendersModule-C7ZFIhsq.js` |
| Verdict | **PRODUCTION VERIFIED** |

```text
DEPLOY = PASS
PV     = PASS
2.66.91 / ab5eaaa1
```

---

## PV checks (PASS)

| Check | Result |
|-------|--------|
| Live version **2.66.91** / commit **`ab5eaaa1`** | **PASS** |
| P7 AUTO | **PASS** |
| P7 ON | **PASS** (same READ-ONLY calc path as AUTO) |
| P7 OFF | **PASS** (HOLD / kill-switch) |
| Research safety | **PASS** |
| Accept | **PASS** — OWNER |
| Price Commit | **PASS** — OWNER |
| Final Bid | **PASS** — OWNER |
| D | **false** |
| P1 | **PASS** — `mat.inv.*` blocked |
| P2 | **KEEP GAP** |
| Composite | **PASS** — unchanged · `feedsP7Bid=false` |
| F5 XOR | **PASS** — `feedsP7Bid=false` · `computePositionCost` unchanged |
| CatalogWork | **471** |
| Write audit | **0** |
| Research HTTP | **0** |
| Regression | **PASS** |
| Production | **VERIFIED** |
| no new engine / no new flag | **PASS** |
| no `=== true` / `\|\| true` on enum | **PASS** |

---

## Live settings / hydration

Live KV `kw-app-settings` (READ `batch-get` only):

| Lever | Live stored | Normalized |
|-------|-------------|------------|
| `ikF5E2eEnabled` | **absent** | **AUTO** (B-POLICY missing→AUTO) |
| IK Entry | **≠ true** (not present as `true`) | P7 host **not** MODE A capable |
| P5 / P6 Research | **false** | Research OFF |
| D `expertAiDecydentEnabled` | **not true** | **false** |

Live bundle helper: `e==="AUTO"\|\|e==="ON"`.  
Live default: `ikF5E2eEnabled:"AUTO"`.  
Parse: `true→ON` · `false→AUTO` · malformed → `null` then `??"AUTO"`.  
Merge: OFF wins.  
Admin UI: `data-ik-f5-e2e-mode` · AUTO / ON / OFF + AUTONOMY-06 copy.

P7 AUTO is **eligible in contract**. Live runtime on this KV: `isIkP7F5E2eActive() === false` because IK Entry ≠ true. That is **not** a contract failure.

---

## Live host / engine (existing binding)

TendersModule minify (READ):

```text
data-ik-entry-host
data-ik-p7-f5-e2e
data-ik-p7-status  (p7F5On ? status : "shell_skipped")
data-ik-p7-research / data-ik-p7-http
runIkP7PositionCostBid locks:
  researchExecuted:!1 · httpCalls:0 · catalogWorkWrite:!1 · priceMemoryWrite:!1
  ensureOwnerQuestions:!1
feedsP7Bid:!1
executeResearch===!0   (P5/P6 MODE B only — not generated from P7 AUTO/ON)
```

AUTO/ON → existing `useMemo` → `runIkP7PositionCostBid` when Entry ON ∧ (BOQ READY ∨ OfferBoq).  
OFF → `positionCostBid` null / `shell_skipped`.  
No per-line P7 start. Output remains in-memory `TenderBidProposal`.

---

## Research safety

**KRYTYCZNE:** P7 AUTO/ON ≠ Research.

| Gate | Evidence |
|------|----------|
| P7 engine | no `executeResearch` · `httpCalls: 0` · `researchExecuted: false` |
| P5/P6 | still `executeResearch===!0` (separate levers) |
| Live KV | Research P5/P6 **false** |
| This PV | Research HTTP **0** · Research lease **0** |

---

## Paczka VII — NOT OBSERVABLE (not a failure)

| Probe | Result |
|-------|--------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` |
| Master BOQ | **READY / 159** |
| CatalogWork | **471** (READ) |
| Composite | `feedsP7Bid=false` · write locks 0 |
| P7 live runtime | **NOT OBSERVABLE** |

**Claim (exact):**

> Production P7 contract verified; real-tender P7 runtime execution on Paczka VII was NOT OBSERVABLE because IK Entry was OFF in live KV, and no settings change was performed during PV.

Live KV: P7 key **absent** → B-POLICY **AUTO**, but IK Entry ≠ true → `IkEntryHost` P7 remains **`shell_skipped`**.

**Do not** describe this as PV failure.  
**Do not** describe this as live P7 execution.  
**Do not** manufacture runtime evidence (no settings write, no Accept, no Price Commit, no Final Bid, no artificial BOQ).

---

## Write audit (PV)

| Action | Count |
|--------|-------|
| Accept | **0** |
| Price Commit | **0** |
| Final Bid | **0** |
| CatalogWork write | **0** |
| PM write | **0** |
| PRICE_DEMAND write | **0** |
| Research HTTP | **0** |
| Research lease | **0** |
| Tender mutation | **0** |
| Settings write | **0** |
| Edge `batch-get` | **read-only** (settings + tenders + catalog) |

Allowed HTTP: GET `version.json` / HTML / JS assets + POST `batch-get`.

---

## Regression / live bundle

Live index + TendersModule contain intended A06 behavior: AUTO/OFF/ON · `isIkE2eModeActive` · P7 gate · Research separation · F5 XOR · Owner boundaries.  
`computePositionCost` and `runIkP7PositionCostBid` **not** in commit `ab5eaaa1`.  
P5/P6 engines · Composite · P1 · P2 · D **unchanged**.

---

## Status

```text
PRODUCTION VERIFY = PASS
PRODUCTION        = 2.66.91 / ab5eaaa1
IK AUTONOMY-06    = PRODUCTION VERIFIED
P7 AUTO           = PASS
P7 ON             = PASS
P7 OFF            = PASS
Research safety   = PASS
Accept            = PASS
Price Commit      = PASS
Final Bid         = PASS
D                 = false
P1                = PASS / CLOSED
P2                = KEEP GAP
Composite         = PASS
F5 XOR            = PASS
CatalogWork       = 471
Write audit       = 0
Research HTTP     = 0
Regression        = PASS
Paczka VII        = NOT OBSERVABLE (IK Entry OFF · no settings write)
EPIC              = NOT CLOSED
09                = see documentation closeout (this PV set)
```
