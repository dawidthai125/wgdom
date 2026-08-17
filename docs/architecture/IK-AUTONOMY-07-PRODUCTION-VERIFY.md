# IK AUTONOMY-07 — P8 Autonomous Risk / Decision Prepare · PRODUCTION VERIFY

> **ID:** `IK-AUTONOMY-07-PRODUCTION-VERIFY`  
> **Date:** 2026-08-17  
> **Closeout:** [`IK-AUTONOMY-07-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-07-IMPLEMENTATION-CLOSEOUT.md)  
> **DF:** [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · READ-ONLY  
> **EPIC:** **NOT CLOSED**

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.92** |
| Impl commit | **`0f994437e94983236669c57b7e25c2400147dd41`** (`0f994437`) |
| Live `version.json` | **2.66.92** / **`0f99443`** ⊂ **`0f994437`** · `2026-08-17T19:17:07.678Z` |
| Deploy | **PASS** — Vercel Git Integration · origin/main · ID **`ApbTViEbP7aStLnToL16hbVjpHtx`** |
| Live chunks | `index-D6Oc8jB8.js` · `app-core-BURfu41M.js` · `TendersModule-BVlq9Mmi.js` |
| Verdict | **PRODUCTION VERIFIED** |

```text
DEPLOY = PASS
PV     = PASS
2.66.92 / 0f994437
```

---

## PV checks (PASS)

| Check | Result |
|-------|--------|
| Live version **2.66.92** / commit **`0f994437`** | **PASS** |
| P8 AUTO | **PASS** |
| P8 ON | **PASS** (same READ-ONLY prepare path as AUTO) |
| P8 OFF | **PASS** (HOLD / kill-switch) |
| B-POLICY | **PASS** |
| OFF wins | **PASS** |
| Mixed-client | **PASS** |
| Research safety | **PASS** |
| Accept | **PASS** — OWNER |
| Price Commit | **PASS** — OWNER |
| Final Bid | **PASS** — OWNER |
| D | **false** (code default / P8 lock · see F4) |
| P1 | **PASS** — `mat.inv.*` blocked |
| P2 | **KEEP GAP** |
| Composite | **PASS** — unchanged · `feedsP7Bid=false` |
| P7 | **UNCHANGED** |
| CatalogWork | **471** |
| BOQ gate | **UNCHANGED** — no new `readyForExperts` on P8 |
| Write audit | **0** |
| Research HTTP | **0** |
| Regression | **PASS** |
| Build | **PASS** |
| Production | **VERIFIED** |
| no new engine / no new flag / no new orchestrator | **PASS** |
| no `=== true` / `\|\| true` on enum | **PASS** |

---

## Live settings / hydration

Live KV `kw-app-settings` (READ `batch-get` only):

| Lever | Live stored | Normalized |
|-------|-------------|------------|
| `ikRiskDecisionE2eEnabled` | **`false`** | **AUTO** (B-POLICY false→AUTO) |
| `ikF5E2eEnabled` | **`"AUTO"`** | **AUTO** (P7 UNCHANGED) |
| IK Entry | **`false`** | P8 host **not** MODE A capable |
| P5 / P6 Research | **false** | Research OFF |
| D `expertAiDecydentEnabled` | **`true`** | **F4 PRE-EXISTING** — **not** written by A07 / this PV |

Live bundle helper: `e==="AUTO"\|\|e==="ON"`.  
Live default: `ikRiskDecisionE2eEnabled:"AUTO"`.  
Parse: `true→ON` · `false→AUTO` · malformed → `null` then `??"AUTO"`.  
Merge: OFF wins (`r==="OFF"\|\|n==="OFF"?"OFF"`).  
Admin UI: `data-ik-risk-decision-e2e-mode` · AUTO / ON / OFF + AUTONOMY-07 copy + OFF confirm.

P8 AUTO is **eligible in contract**. Live runtime on this KV: `isIkP8RiskDecisionE2eActive() === false` because IK Entry ≠ true. That is **not** a contract failure.

---

## Live host / engine (existing binding)

TendersModule minify (READ):

```text
p = RE()===!0                    // isIkP8RiskDecisionE2eActive
T = p ? Gne({ item, p7, bidProposal, chiefSession }) : null
                                 // runIkP8RiskDecision — NO readyForExperts
P7 still: !m || !readyForExperts && !offerBoq.lines ? null : ZK(...)
data-ik-p8-risk-decision-e2e
data-ik-p8-research / data-ik-p8-http / data-ik-p8-auto-accept
feedsP7Bid:!1
executeResearch===!0             (P5/P6 MODE B only — not generated from P8 AUTO/ON)
_E() → Rc(qt().ikRiskDecisionE2eEnabled)   // isIkE2eModeActive, not enum === true
```

AUTO/ON → existing `useMemo` → `runIkP8RiskDecision({ item, p7, bidProposal, chiefSession })` when Entry ON.  
OFF → `riskDecision` null.  
No per-line P8 start. No new BOQ gate. Missing P7/Chief → existing engine HOLD.

---

## Research safety

**KRYTYCZNE:** P8 AUTO/ON ≠ Research.

| Gate | Evidence |
|------|----------|
| P8 engine | no `executeResearch` · no `ensureOwnerQuestions` · `httpCalls: 0` · `researchExecuted: false` · no `fetch(` |
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
| P8 live runtime | **NOT OBSERVABLE** |

**Claim (exact):**

> Production P8 contract verified; real-tender P8 runtime execution on Paczka VII was NOT OBSERVABLE because IK Entry was OFF and no settings change was performed.

Live KV: P8 stored **`false`** → B-POLICY **AUTO**, but IK Entry = false → `IkEntryHost` P8 remains inactive.

**Do not** describe this as PV failure.  
**Do not** describe this as live P8 execution.  
**Do not** manufacture runtime evidence (no settings write, no IK Entry flip, no Accept, no Price Commit, no Final Bid, no artificial BOQ / P7 / Chief / Classification prerequisite).

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

## Findings

| ID | Finding | Status |
|----|---------|--------|
| **F1** | Mixed-client residual: stary klient `false` nad `"OFF"` → AUTO | accepted / non-blocking · same policy as A05/A06 |
| **F2** | Paczka VII P8 runtime **NOT OBSERVABLE** | non-blocking |
| **F3** | Dedicated P6/P7 nested MMR | **PRE-EXISTING / OUT OF SCOPE** · not an A07 regression |
| **F4** | Live KV `expertAiDecydentEnabled=true` | **PRE-EXISTING**. **Do not claim A07 set D.** PV: `expertAiDecydentFlipped=false` · Chief start **0**. Code default remains **D = false**. P8 does not flip D. |

---

## Regression / live bundle

| Suite | This PV |
|-------|---------|
| AUTONOMY-07 | **117/0** |
| AUTONOMY-06 | **95/0** |
| AUTONOMY-05 | **77/0** (historical A05 closeout **76/0** — not rewritten) |
| Composite | **PASS** |
| P0 | **PASS** |
| P5 | **PASS** |
| P6 | **PASS** (A05 MODE; nested MMR = F3) |
| P7 | **PASS** (A06; engine UNCHANGED) |
| P8 | **PASS** |
| P9 | **PASS** |
| P10 | **PASS** |
| Build | **PASS** |

Live index + TendersModule contain intended A07 behavior: AUTO/OFF/ON · `isIkE2eModeActive` · P8 gate without BOQ · Research separation · Owner boundaries · D lock.  
`runIkP8RiskDecision` and `runIkP7PositionCostBid` **not** in commit `0f994437`.  
P5/P6 engines · Composite · P1 · P2 · P7 · D default **unchanged**.

---

## Status

```text
PRODUCTION VERIFY = PASS
PRODUCTION        = 2.66.92 / 0f994437
IK AUTONOMY-07    = PRODUCTION VERIFIED
P8 AUTO           = PASS
P8 ON             = PASS
P8 OFF            = PASS
B-POLICY          = PASS
OFF wins          = PASS
Mixed-client      = PASS
Research safety   = PASS
Accept            = PASS
Price Commit      = PASS
Final Bid         = PASS
D                 = false
P1                = PASS / CLOSED
P2                = KEEP GAP
Composite         = PASS
P7                = UNCHANGED
CatalogWork       = 471
BOQ gate          = UNCHANGED
Write audit       = 0
Research HTTP     = 0
Regression        = PASS
Build             = PASS
Paczka VII        = NOT OBSERVABLE (IK Entry OFF · no settings write)
EPIC              = NOT CLOSED
09                = see documentation closeout (this PV set)
```
