# IK AUTONOMY-07 — P8 Autonomous Risk / Decision Prepare · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **PRODUCTION VERIFIED** · **DOCUMENTATION READY FOR OWNER APPROVAL** · **EPIC NOT CLOSED** |
| **Date** | 2026-08-17 |
| **UI version** | **2.66.92** |
| **Production** | **2.66.92** / live **`0f99443`** · impl **`0f994437`** (`0f994437e94983236669c57b7e25c2400147dd41`) |
| **Deploy** | Vercel Git Integration · ID **`ApbTViEbP7aStLnToL16hbVjpHtx`** · origin/main |
| **O2** | **APPROVED** — `"AUTO"\|"OFF"\|"ON"` on same key `ikRiskDecisionE2eEnabled` |
| **OD-P8b** | **ACCEPTED** — B-POLICY `true→ON` · `missing→AUTO` · `false→AUTO` |
| **DF** | [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS · C1–C6 **implemented** · blockers **0** |
| **PV** | [`IK-AUTONOMY-07-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-07-PRODUCTION-VERIFY.md) |
| **Owner Verify** | **PASS WITH FINDINGS** (non-blocking) |
| **D** | **HARD STOP / false** (code default · P8 does not flip · live KV `true` = **F4 PRE-EXISTING**) |
| **CatalogWork** | **471** UNCHANGED |
| **P1** | **CLOSED** (`mat.inv.*` blocked) |
| **P2** | **KEEP GAP** |
| **Composite** | **CLOSED** · `feedsP7Bid=false` |
| **P7** | **UNCHANGED** |
| **EPIC CLOSE** | **NOT CLOSED** (docs commit / EPIC close = osobna tura · Owner GO) |

```text
PLAN                   = PASS
OD-P8b                 = B-POLICY
DESIGN FREEZE          = PASS
ARCH REVIEW            = PASS WITH CONDITIONS · blockers 0
IMPLEMENTATION         = PASS
OWNER VERIFY           = PASS WITH FINDINGS
COMMIT                 = PASS · 0f994437
PUSH                   = PASS
DEPLOY                 = PASS
PRODUCTION VERIFY      = PASS
DOCUMENTATION          = READY FOR OWNER APPROVAL
PRODUCTION             = 2.66.92 / 0f994437
EPIC                   = NOT CLOSED
```

Feature-impl (pre-PV): [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-IMPLEMENTATION-CLOSEOUT.md).

---

## 1. Owner decisions (frozen)

| Decision | Result |
|----------|--------|
| **O2** | **APPROVED** — enum on **same** key · **no new flag** |
| **OD-P8b** | **ACCEPTED** — B-POLICY |

| Key | Typ |
|-----|-----|
| `ikRiskDecisionE2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |

Default: **`"AUTO"`**.

### B-POLICY (legacy boolean)

| Stored | Normalized |
|--------|------------|
| `true` | **ON** |
| missing / unknown / malformed | **AUTO** (not ON) |
| `false` | **AUTO** (never OFF) |

Jawny HOLD = wyłącznie zapisane **`"OFF"`**. Merge: **OFF wins**.  
Reuse: `parseIkE2eMode` · `normalizeIkE2eMode` · `mergeIkE2eMode` · `isIkE2eModeActive`.  
Gate: `isIkE2eModeActive` (`AUTO \|\| ON`). **Nie** `=== true` na enumie. **Nie** `\|\| true`.

---

## 2. Runtime contract

```text
AUTO → READ-ONLY P8 prepare  (runIkP8RiskDecision · overlay / validation / DW VM)
ON   → same runtime as AUTO
OFF  → HOLD / kill-switch

P8 RUN = ikEntryEnabled === true
         ∧ mode ∈ {AUTO, ON}
         ∧ isIkE2eModeActive(mode)

Engine requires item only.
No new BOQ / readyForExperts host gate.
P7 / Chief optional → existing HOLD.
```

Binding: existing `IkEntryHost` `useMemo` — **no** new orchestrator.  
Engine: existing `runIkP8RiskDecision` — **UNCHANGED** (not in `0f994437`).

---

## 3. Research / Owner boundaries

| Boundary | Status |
|----------|--------|
| P8 Research | **CONDITIONAL** — P8 AUTO/ON **does not** start Research |
| Research HTTP / lease | **0** (P8 has no research lever) |
| P5/P6 Research | **unchanged** — osobny `=== true` |
| Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid | **OWNER** |
| D | **HARD STOP / false** — P8 does not flip |
| Chief / P4 | **OUT** — P8 does not call `isChiefOrchestratorSessionEnabled` |

P8 prepares risk / validation / decision workspace only. Not Accept / Price Commit / Final Bid.

---

## 4. Safety (locked)

| Invariant | Status |
|-----------|--------|
| no new engine | **PASS** |
| no new flag | **PASS** — same `ikRiskDecisionE2eEnabled` |
| no new orchestrator | **PASS** |
| no `=== true` / `\|\| true` on enum | **PASS** |
| no new BOQ gate | **PASS** |
| P7 engine | **UNCHANGED** |
| Composite | **CLOSED / unchanged** — `feedsP7Bid=false` |
| P1 `mat.inv.*` | **CLOSED / blocked** |
| P2 | **KEEP GAP** — `cc-w2-zawor-odcinajacy` · `cc-p0c-w1-zawor-odpowietrzajacy` → `PRODUCT_IDENTITY_GAP` |
| CatalogWork | **471** |
| D code default | **false** |

---

## 5. Files in feature commit `0f994437`

| File | Role |
|------|------|
| `src/lib/app-settings.ts` | P8 `IkE2eMode` · default AUTO · load/merge |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | `isIkE2eModeActive` gate · `forceIkRiskDecisionE2eForTests` |
| `src/lib/intelligent-estimator/index.ts` | export P8 helpers |
| `src/app/AdminSettingsModal.tsx` | select AUTO/ON/OFF + confirm OFF |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | comment only — existing binding · no BOQ gate |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.66.92** |
| `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` | T01–T34 |
| PLAN / O2 / OD-P8b / DF / ARCH REVIEW / P8 implementation closeout / Owner Verify | prior docs in same commit |

**Not changed:** `ik-p8-risk-decision.ts` · `ik-p7-position-cost-bid.ts` · Composite · F5/`engine.ts` · P5/P6 engines · Classification · D · CatalogWork.

---

## 6. Test / Owner Verify / this PV

| Suite | Result |
|-------|--------|
| AUTONOMY-07 P8 harness | **117 PASS / 0 FAIL** |
| AUTONOMY-06 P7 | **95 PASS / 0 FAIL** |
| AUTONOMY-05 | this PV **77 PASS / 0 FAIL** · historical A05 closeout **76/0** (not rewritten) |
| P1 invoice | **PASS** |
| P1 entry | **62 PASS / 0 FAIL** |
| P2 | **66 PASS / 0 FAIL** |
| P5.9 / P2 identities | **76 PASS / 0 FAIL** |
| Composite | **PASS** |
| P0 | **52 PASS / 0 FAIL** |
| P5 | **44 PASS / 0 FAIL** |
| P6 | **PASS** via A05 MODE A/B (dedicated nested MMR **F3**) |
| P7 | **PASS** via A06 harness (engine **UNCHANGED**) |
| P8 migration | **67 PASS / 0 FAIL** |
| P9 | **53 PASS / 0 FAIL** |
| P10 | **26 PASS / 0 FAIL** |
| Build | **PASS** (Vercel Git Integration · origin/main @ `0f994437`) |
| Nested P6/P7 MMR | **PRE-EXISTING / OUT OF SCOPE** — **not** an A07 regression |

### Findings (non-blocking)

| ID | Finding | Status |
|----|---------|--------|
| **F1** | Mixed-client residual: stary klient `false` nad `"OFF"` → AUTO | accepted / non-blocking · same policy as A05/A06 |
| **F2** | Paczka VII P8 runtime **NOT OBSERVABLE** | non-blocking |
| **F3** | Dedicated P6/P7 nested MMR hang | **PRE-EXISTING / OUT OF SCOPE** · do not attribute to A07 |
| **F4** | Live KV `expertAiDecydentEnabled=true` | **PRE-EXISTING** · A07 **did not** set D · PV `expertAiDecydentFlipped=false` · Chief start **0** · code default D **false** |

Unrelated WIP remained local / uncommitted (never `git add -A`).

---

## 7. Production Verify

**PV = PASS.** Full record: [`IK-AUTONOMY-07-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-07-PRODUCTION-VERIFY.md).

Paczka VII `08decd1d-542e-312b-5fad-9500015f7011`: BOQ **READY** / **159** · CatalogWork **471**.  
Live P8 execution: **NOT OBSERVABLE** — not a failure.

> Production P8 contract verified; real-tender P8 runtime execution on Paczka VII was NOT OBSERVABLE because IK Entry was OFF and no settings change was performed.

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

Prior: [`PLAN`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md) · [`O2`](./IK-AUTONOMY-07-P8-OWNER-DECISION.md) · [`OD-P8b`](./IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md) · [`DF`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md) · [`ARCH REVIEW`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-ARCH-REVIEW.md) · [`P8 IMPL (feature)`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-IMPLEMENTATION-CLOSEOUT.md) · [`OWNER VERIFY`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-OWNER-VERIFY.md)

Prior production: AUTONOMY-06 **2.66.91** / **`ab5eaaa1`** · AUTONOMY-05 **2.66.90** / **`44e81d20`**.
