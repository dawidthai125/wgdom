# IK AUTONOMY-06 — P7 Autonomous Bid Calculation  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH CONDITIONS** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.90** / **`44e81d20`** |
| **Design Freeze** | [`IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md) |
| **OD-P7b** | **B-POLICY ACCEPTED** |
| **O2** | **APPROVED** |

```text
ARCHITECTURE BLOCKERS      = 0  (class G — no blocker)
ARCH REVIEW                = PASS WITH CONDITIONS
Implementation             = NOT AUTHORIZED (needs Owner GO after this review)
Code / Settings / Tests    = ZERO / NOT RUN
EPIC                       = NOT CLOSED
```

---

## 1. Scope

Oceń Design Freeze P7 względem:

1. spójności architektonicznej,  
2. zgodności z kodem źródłowym,  
3. implementowalności bez nowego engine / flagi,  
4. safety P1/P2/Composite/F5/D,  
5. zgodności z AUTONOMY-05,  
6. migracji boolean→enum + mixed clients + merge,  
7. bezpieczeństwa biznesowego (calc ≠ commit ≠ Final Bid).

**Nie** implementowano. **Nie** uruchamiano P7 na prod. Paczka VII P7 = **NOT OBSERVABLE**.

---

## 2. Sources Reviewed

| # | Source | Role |
|---|--------|------|
| 1 | `IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md` | First break = P7 |
| 2 | `IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-PLAN.md` | O2 PLAN |
| 3 | `IK-AUTONOMY-06-P7-OD-P7B-OWNER-DECISION.md` | B-POLICY locked |
| 4 | `IK-AUTONOMY-06-P7-AUTONOMOUS-BID-CALCULATION-DESIGN-FREEZE.md` | DF under review |
| 5 | `src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts` | Engine |
| 6 | `src/app/intelligent-estimator/IkEntryHost.tsx` | Binding |
| 7 | `src/lib/intelligent-estimator/ik-entry-flag.ts` | Gates |
| 8 | `src/lib/app-settings.ts` | Settings / `mergeIkE2eMode` |
| 9 | `src/app/AdminSettingsModal.tsx` | UI (P5/P6 pattern + P7 checkbox) |
| 10 | `src/lib/intelligent-estimator/ik-composite-both-hold.ts` | XOR / P1 / P2 |
| 11 | AUTONOMY-05 helpers + harness patterns | Precedent |

---

## 3. Current Architecture

```text
IkEntryHost
  Document Expert (useMemo)
  P5 Labor (useEffect)     ← AUTO|ON via isIkP5LaborE2eActive
  P6 Material (useEffect)  ← AUTO|ON via isIkP6MaterialE2eActive
  Composite (useMemo)      ← P5∧P6 · feedsP7Bid=false
  P7 Bid (useMemo)         ← isIkP7F5E2eActive() · TODAY boolean === true
  P8 Risk (useMemo)        ← optional · reads positionCostBid
```

**Today P7:** `AppSettings.ikF5E2eEnabled: boolean` default `false` · `isIkF5E2eEnabled()` uses `=== true` · host HOLD unless Owner checkbox.

**Target (DF):** same topology; only settings type + gate helper + Admin UI change to enum — **no new orchestrator**.

---

## 4. P7 Engine

| Check | Result | Evidence |
|-------|--------|----------|
| Engine exists | **PASS** | `runIkP7PositionCostBid` |
| New engine needed | **NO** | REUSE cutover/shadow/package/bid calculator |
| Research HTTP | **PASS** (locks) | `researchExecuted: false` · `httpCalls: 0` |
| CatalogWork / PM write flags | **PASS** | `false` in report |
| Accept / executeResearch / D | **PASS** | no matches in `ik-p7-position-cost-bid.ts` |
| `ensureOwnerQuestions: false` | **PASS** | hard-coded in call sites |
| In-memory proposal | **PASS** | returns `IkP7PositionCostBidReport` · no persist |

**Verdict:** DF reuse of engine is **sound**.

---

## 5. P7 Binding

| Check | Result | Evidence |
|-------|--------|----------|
| Binding exists | **PASS** | `IkEntryHost` `useMemo` → `runIkP7PositionCostBid` |
| Args | item + expert + package | **no** labor/material/composite |
| Gate today | `p7F5On = isIkP7F5E2eActive()` | boolean |
| Host BOQ guard | readyForExperts ∨ offerBoq lines | **PASS** (DF KEEP) |
| New orchestrator | **NOT required** | |

**Missing for target (not a blocker — DF seq §23 steps 5–6):**

- `isIkF5E2eEnabled` still `=== true` (must become `isIkE2eModeActive(normalize(...))`)
- `forceIkF5E2eForTests` accepts only `boolean | null` (P5 accepts `IkE2eMode`)
- `IkP7F5E2eEligibilityInput.ikF5E2eEnabled: boolean` — keep as **derived active boolean** OR pass mode + `isIkE2eModeActive` (both OK if no `=== true` on raw enum)

**First missing binding for autonomy today:** configuration gate only — **E** (settings), not B (host binding absent).

---

## 6. Settings Contract

| Check | Result |
|-------|--------|
| Same key `ikF5E2eEnabled` | **PASS** — no new flag |
| Type change boolean → `IkE2eMode` | **FEASIBLE** — identical to P5/P6 AUTONOMY-05 |
| Helpers reusable | **PASS** — `parseIkE2eMode` / `normalizeIkE2eMode` / `mergeIkE2eMode` / `isIkE2eModeActive` |
| Default `"AUTO"` | **FEASIBLE** — change `defaultAppSettings` |
| Forbidden `\|\| true` | **PASS** if gate uses `isIkE2eModeActive` only |
| Research coupling | **PASS** — P7 has **no** research key; Research stays `=== true` on separate booleans |

**Critical impl risk (Condition C1):** if type becomes string but load/gate still use `=== true`, enums never activate (fail-safe HOLD, autonomy fails). Opposite (`\|\| true`) is **forbidden** by DF. Sequence must update gate in same release as type.

---

## 7. Migration (OD-P7b B-POLICY)

| Input | Expected | Helper behavior today |
|-------|----------|----------------------|
| `true` | ON | `parseIkE2eMode` → ON |
| `false` | AUTO | → AUTO |
| missing | AUTO | `normalize` → AUTO |
| enum strings | idempotent | YES |
| malformed | AUTO (not ON) | `parse` null → normalize AUTO |

**Aligned with existing AUTONOMY-05 helpers — PASS.**  
No code change to parsers required for B-POLICY (reuse).

---

## 8. Merge

Reuse **`mergeIkE2eMode`** — deterministic OFF wins:

| remote | local | result |
|--------|-------|--------|
| OFF | AUTO | **OFF** |
| OFF | ON | **OFF** |
| AUTO | OFF | **OFF** |
| ON | OFF | **OFF** |
| AUTO | ON | **AUTO** (remote present) |
| ON | AUTO | **ON** (remote present) |
| null/absent | OFF | **OFF** |
| null/absent | AUTO | **AUTO** |

**PASS** — never OFF→AUTO/ON via merge. No `|| true`.

`mergeIkF5E2eEnabled` today is boolean-specific — DF: replace body with `mergeIkE2eMode` (same as Labor/Material wrappers). **FEASIBLE.**

---

## 9. Mixed Client

| Stored | New client | Old client (`=== true`) |
|--------|------------|-------------------------|
| old true | ON · active | active |
| old false | AUTO · active | inactive |
| missing | AUTO · active | inactive |
| `"AUTO"` / `"ON"` | active | **HOLD** (fail-safe) |
| `"OFF"` | HOLD | HOLD |
| malformed | AUTO | HOLD |

**Rollback fail-safe: PASS.**

**Residual Condition C3:** old PWA writes `false` over remote `"OFF"` → new B-POLICY → AUTO (same AUTONOMY-05 T19). Mitigation: single deploy + Version Awareness — **not an architecture blocker**.

---

## 10. Research Boundary

| Check | Result |
|-------|--------|
| P7 engine research | always 0 |
| P7 lever → Research | **no path** |
| Host P7 | no `executeResearch` arg |
| Coercion AUTO→true into Research | **N/A for P7** (no research input) |
| P5/P6 Research | separate `=== true` booleans — **unchanged** |

**PASS.** AUTO ≠ Research.

---

## 11. Owner Boundary

| Action | P7 AUTO/ON |
|--------|------------|
| In-memory `TenderBidProposal` | YES |
| Accept | **NO** |
| Price Commit | **NO** |
| Final Bid | **NO** |
| Tender mutation | **NO** |

```text
P7 calculation ≠ Price Commit ≠ Final Bid
```

**PASS** against engine + host (presentation only).

---

## 12. P5/P6 Dependency

| Edge | Code | Verdict |
|------|------|---------|
| P7 ← labor state | not passed | **NO dependency** |
| P7 ← material state | not passed | **NO dependency** |
| P7 ← CatalogWork READ | via store in engine | independent SSOT |
| Artificial P5→P7 / P6→P7 | DF forbids | **correct** |

**PASS** — DF assumption matches code.

---

## 13. Composite / F5 Boundary

| Check | Result |
|-------|--------|
| `feedsP7Bid` | hardcoded `false` in `ik-composite-both-hold.ts` |
| P7 consumes Composite | **NO** |
| DF: do not change Composite / F5 / `computePositionCost` | **aligned** |

**F5 XOR: PASS.**

---

## 14. P1 / P2 / D Safety

| Surface | Status | P7 impact |
|---------|--------|-----------|
| P1 `mat.inv.*` | CLOSED · gate in classification / researchEligible | P7 does not call Material Research |
| P2 `cc-w2-zawor-odcinajacy` / `cc-p0c-w1-zawor-odpowietrzajacy` | PRODUCT_IDENTITY_GAP KEEP | Composite/leaf — P7 unchanged |
| D `expertAiDecydentEnabled` | default false | P7 does not touch |

**PASS** — DF does not reopen P1/P2/D.

---

## 15. CatalogWork Safety

| Check | Result |
|-------|--------|
| P7 write | `catalogWorkWrite: false` · no `saveWorkCatalog` in engine |
| Baseline 471 | RO expectation — DF A19 / T22 |
| Price Memory write | `priceMemoryWrite: false` |

**CatalogWork: 471 / unchanged by P7 design — PASS.**

---

## 16. A1–A24 Review

Legend: **PASS** = DF criterion sound + implementable against current codebase · **COND** = PASS with frozen interpretation · **N/A** = not yet true on prod (pre-impl expected).

| ID | Criterion | Review |
|----|-----------|--------|
| A1 | parse AUTO/OFF/ON | **PASS** — helpers exist |
| A2 | default AUTO | **PASS** (target) — change default only |
| A3 | true→ON | **PASS** — parse |
| A4 | missing→AUTO | **PASS** — normalize |
| A5 | false→AUTO | **PASS** — B-POLICY / parse |
| A6 | AUTO executes RO P7 | **PASS** — host+engine after gate update |
| A7 | ON executes RO P7 | **PASS** |
| A8 | OFF blocks | **PASS** — `isIkE2eModeActive` |
| A9 | OFF durable | **PASS** — merge OFF wins |
| A10 | Research false unless separate | **PASS** |
| A11 | Accept Owner | **PASS** |
| A12 | Price Commit Owner | **PASS** |
| A13 | Final Bid Owner | **PASS** |
| A14 | D false | **PASS** |
| A15 | P1 regression | **PASS** — reuse AUTONOMY-05 T15 pattern |
| A16 | P2 regression | **PASS** |
| A17 | Composite regression | **PASS** |
| A18 | F5 XOR | **PASS** |
| A19 | CatalogWork 471 | **PASS** (RO) |
| A20 | zero business writes | **PASS** |
| A21 | proposal in-memory | **PASS** |
| A22 | malformed not unsafe ON | **COND** — DF §11.1: normalize→**AUTO** (not ON); no `|| true` |
| A23 | mixed client deterministic | **PASS** (+ residual C3) |
| A24 | rollback fail-safe | **PASS** |

**A1–A24 aggregate: PASS** (A22 COND per DF §11.1 — **no PLAN/DF rewrite required** unless Owner reopens malformed→OFF).

**Zero FAIL** that blocks Arch Review.

---

## 17. T01–T32 Review

| Coverage | Covered by matrix? |
|----------|-------------------|
| AUTO / ON / OFF | YES T01–T06, T31–T32 |
| Migration | YES T07–T10 |
| Merge | YES T11 |
| Mixed clients | YES T12 |
| Research / Accept / Price Commit / Final Bid | YES T13–T16 |
| D / P1 / P2 / Composite / F5 | YES T17–T21 |
| CatalogWork / writes / HTTP | YES T22–T27 |
| In-memory / rollback / UI | YES T28–T30 |
| BOQ autonomous / OFF block | YES T31–T32 |

**Gaps (documentation only — not blockers):**

| Gap | Note |
|-----|------|
| G1 | Explicit assert: P7 path never calls `isIkP5LaborExecuteResearchActive` / Material research | optional T13 strengthening |
| G2 | `forceIkF5E2eForTests("AUTO")` after enum force API | covered if C2 done · add to T04/T05 |
| G3 | Paczka VII live | **NOT OBSERVABLE** — correctly excluded |

**T01–T32: READY** (minor optional strengthens G1–G2).

**Do not execute** in this turn.

---

## 18. Architecture Blockers

| Class | Finding |
|-------|---------|
| A architecture defect | **none** |
| B missing binding | **none** (host exists) |
| C missing engine | **none** |
| D safety conflict | **none** |
| E configuration/settings | current boolean OFF = **known gap**; DF closes it — not a DF blocker |
| F documentation inconsistency | A22 literal vs §11.1 — **resolved in DF**; treat as COND not FAIL |
| **G no blocker** | **HIT** |

```text
First blocker = G (none)
ARCHITECTURE BLOCKERS = 0
```

---

## 19. Conditions (PASS WITH CONDITIONS)

| ID | Condition | Severity |
|----|-----------|----------|
| **C1** | Same release: type→enum **and** `isIkF5E2eEnabled` / `isIkP7F5E2eActive` via `isIkE2eModeActive(normalize(...))` — never leave `=== true` on enum; never `\|\| true` | **HARD** (impl sequence) |
| **C2** | Extend `forceIkF5E2eForTests` to `boolean \| IkE2eMode \| null` (mirror P5) for harness | **HARD** for T04–T06 completeness |
| **C3** | Residual mixed-client: old `false` over `"OFF"` → AUTO — document in closeout; Version Awareness | **RESIDUAL** (accept like AUTONOMY-05) |
| **C4** | A22 = DF §11.1 (malformed→AUTO not ON); do not silently change to OFF without Owner | **DOC LOCK** |
| **C5** | Admin UI: copy P5/P6 `<select>` AUTO/ON/OFF + `window.confirm` on transition to OFF; copy must not imply Research/Accept/Final Bid | **HARD** (pattern exists L507–575) |

None of C1–C5 is an architecture blocker; all are **implementation discipline**.

---

## 20. Recommendation

```text
ARCH REVIEW = PASS WITH CONDITIONS

Proceed to Owner GO for IMPLEMENT only if Owner accepts C1–C5.
Do NOT invent new engine/flag/orchestrator.
Do NOT reopen P1/P2/Composite/F5/D/Research automation.
Follow DF Implementation Sequence 1–16 without skip.
```

---

## 21. Implementation Authorization Status

| Gate | Status |
|------|--------|
| O2 | APPROVED |
| OD-P7b B-POLICY | ACCEPTED |
| Design Freeze | READY FOR ARCH REVIEW → **reviewed** |
| Arch Review | **PASS WITH CONDITIONS** |
| Owner GO for IMPLEMENT | **PENDING** |
| **Implementation** | **NOT AUTHORIZED** this turn |

---

## FINAL STATUS

```text
ARCHITECTURE BLOCKERS = 0

A1–A24: PASS (A22 COND §11.1)
T01–T32: READY

REUSE FIRST: YES
NEW ENGINE: NO
NEW FLAG: NO

P7 AUTO: PASS (design)
P7 ON: PASS (design)
P7 OFF: PASS (design)

Research: CONDITIONAL
Accept: OWNER
Price Commit: OWNER
Final Bid: OWNER
D: FALSE
P1: CLOSED
P2: KEEP GAP
Composite: CLOSED
F5 XOR: PASS
CatalogWork: 471 / UNCHANGED (by design)

ARCH REVIEW: PASS WITH CONDITIONS
Implementation: NOT AUTHORIZED
Code: ZERO
Settings write: ZERO
Commit: NOT DONE
Push: NOT DONE
Deploy: NOT DONE
Production Verify: NOT DONE
EPIC: NOT CLOSED
STOP.
```
