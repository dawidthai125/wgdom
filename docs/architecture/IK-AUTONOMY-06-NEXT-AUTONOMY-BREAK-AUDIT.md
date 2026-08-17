# IK AUTONOMY-06 — Next Autonomy Break Audit

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT` |
| **Status** | **AUDIT COMPLETE** |
| **Date** | 2026-08-17 |
| **Mode** | **AUDIT ONLY** · ZERO CODE · ZERO SETTINGS WRITE · ZERO RESEARCH HTTP · ZERO BUSINESS WRITE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY |
| **Production** | **2.66.90** / **`44e81d20`** (`44e81d202af2c512717fe7be9ddec43468aca760`) |
| **Docs tip** | **`bd796db7`** |
| **Prior EPIC** | **IK AUTONOMY-05 = COMPLETE / CLOSED** |
| **Policy** | [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) |
| **Prior walk** | [`IK-AUTONOMY-01-FULL-TENDER-WALK-AUDIT.md`](./IK-AUTONOMY-01-FULL-TENDER-WALK-AUDIT.md) · [`IK-AUTONOMY-04-AUTONOMOUS-READONLY-CORE-PLAN.md`](./IK-AUTONOMY-04-AUTONOMOUS-READONLY-CORE-PLAN.md) |

```text
AUDIT                 = COMPLETE
CODE                  = ZERO
RESEARCH HTTP         = ZERO
BUSINESS WRITES       = ZERO
COMMIT / PUSH / DEPLOY = NOT DONE
EPIC                  = AUTONOMY-06 AUDIT ONLY
```

---

## 1. Executive Summary

Po **IK AUTONOMY-05** (P5/P6 `AUTO|ON` → MODE A, `OFF` → HOLD) produkcyjny `IkEntryHost` automatycznie uruchamia Document Expert, Classification A1 (w EC VM), Labor MODE A, Material MODE A oraz Composite BOTH_HOLD consumer (gdy P5∧P6).

**Pierwszy etap, którego IK nie potrafi wykonać automatycznie read-only mimo że engine + binding już istnieją:**

```text
P7 — Position Cost → F5 cutover → Bid CALCULATION
  lever: AppSettings.ikF5E2eEnabled === true
  default: false (boolean opt-in)
  binding: IkEntryHost useMemo → runIkP7PositionCostBid
  engine: EXISTING / PRODUCTION
```

To jest **ta sama klasa problemu E (lever/configuration gate)**, którą AUTONOMY-05 rozwiązało dla P5/P6 — ale **dla P7**.

**Nie** jest to brak engine'a. **Nie** jest to brak bindingu. **Nie** jest to Accept / Final Bid / D.

Final Bid approval pozostaje **OWNER** (intentional safety) — poza first break.

---

## 2. Production Baseline

| Field | Value | Evidence class |
|-------|-------|----------------|
| UI / `version.json` | **2.66.90** | PRODUCTION |
| Impl commit | **`44e81d20`** | PRODUCTION |
| Docs commit | **`bd796db7`** | PRODUCTION |
| AUTONOMY-05 | COMPLETE / CLOSED · PV PASS | PRODUCTION |
| P5/P6 defaults | `"AUTO"` | SOURCE + PRODUCTION (live bundle) |
| P7 default | `ikF5E2eEnabled: false` | SOURCE + PRODUCTION |
| P4 default | `ikChiefWiringEnabled: false` | SOURCE + PRODUCTION |
| P8 default | `ikRiskDecisionE2eEnabled: false` | SOURCE + PRODUCTION |
| D | `expertAiDecydentEnabled: false` | PRODUCTION |
| CatalogWork | **471** | PRODUCTION (prior PV) |
| Research | CONDITIONAL · defaults OFF | PRODUCTION |

Live KV (prior AUTONOMY-05 PV): P5/P6 keys absent → hydrate to **AUTO**; P7/P4/P8 absent → stay **false**.

---

## 3. Closed Dependencies (do not reopen as new problems)

| Item | Status | Note |
|------|--------|------|
| P1 invoice host | **CLOSED** | `mat.inv.*` blocked |
| P2 product identity | **KEEP GAP** | zawór odcinający / odpowietrzający |
| Composite orchestration | **CLOSED** | leaf → `computePositionCost` UNCHANGED · `feedsP7Bid=false` |
| P5/P6 autonomy (AUTONOMY-05) | **CLOSED** | Option B · B-POLICY · OFF wins |
| Accept / Price Commit / Final Bid | **OWNER** | intentional |
| D | **HARD STOP false** | intentional |

Jeżeli któryś z powyższych ogranicza downstream — traktuj jako **dependency**, nie nowy EPIC reopen.

---

## 4. Full Autonomous Walk (production path)

```text
TENDER
  ↓
DOCUMENT / MASTER BOQ READY          ← auto (Document Expert useMemo)
  ↓
CLASSIFICATION A1                    ← auto (EC VM / runIkMasterBoqClassification)
  ↓
P5 LABOR MODE A                      ← AUTO (AUTONOMY-05) · useEffect
  ↓
P6 MATERIAL MODE A                   ← AUTO (AUTONOMY-05) · useEffect
  ↓
COMPOSITE / POSITION COST (BOTH_HOLD)← auto when P5∧P6 · useMemo · XOR F5
  ↓
P7 BID CALCULATION                   ← ★ FIRST BREAK · lever OFF
  ↓
P4 CHIEF prepare                     ← lever OFF · TenderDetailPage (≠ IkEntryHost)
  ↓
P8 RISK / DW prepare                 ← lever OFF · depends on P7 report + chiefSession
  ↓
FINAL OWNER DECISION                 ← intentional OWNER gate
  ↓
PDF / OUTPUT                         ← intentional Owner action (export UI)
```

**Parallel fan-out (not sequential dataflow):** P5, P6, Composite, P7 są niezależnymi `if(lever)` gałęziami w `IkEntryHost`. Brak sekwencji „P5 done → start P7”.

---

## 5. Stage-by-Stage Matrix

| Stage | Engine | Binding | Auto | Current Gate |
|-------|--------|---------|------|--------------|
| Document | `runIkDocumentExpert` | `IkEntryHost` useMemo | **YES** (IK Entry ON) | IK Entry (P10 default ON) |
| A1 Classification | `runIkMasterBoqClassification` | EC VM when Master BOQ READY | **YES** | BOQ READY |
| P5 Labor | `runIkMasterBoqLaborExpert` | useEffect | **YES MODE A** | P5 `AUTO\|ON` (CLOSED) |
| P6 Material | `runIkMasterBoqMaterialExpert` | useEffect | **YES MODE A** | P6 `AUTO\|ON` (CLOSED) |
| Composite | `runIkCompositeBothHold` | useMemo when P5∧P6 | **YES** (idle jeśli BOTH_HOLD=0) | P5∧P6 · no BOTH_HOLD → IDLE |
| P7 Bid Calc | `runIkP7PositionCostBid` | useMemo when `isIkP7F5E2eActive` | **NO** | **`ikF5E2eEnabled` boolean OFF** ★ |
| P4 Chief | `useChiefOrchestratorSession` | `TenderDetailPage` | **NO** | `ikChiefWiringEnabled` OFF ∧ pricingReady |
| P8 Risk/DW | `runIkP8RiskDecision` | useMemo when P8 ON | **NO** | `ikRiskDecisionE2eEnabled` OFF · needs P7+session |
| PDF/Output | `exportTenderBidPackagePdf` etc. | TenderDetailPanel UI | **NO** | Owner click — intentional |
| Owner Final Bid | Bid / DW `canApprove` | UI capability ≠ execute | **NO** | **OWNER** intentional |

---

## 6. First Break

### Statement

```text
FIRST AUTONOMY BREAK AFTER AUTONOMY-05 =

  P7 Position Cost → F5 → Bid CALCULATION
  gated by AppSettings.ikF5E2eEnabled === true (default false)
```

### Why this is first (not earlier)

| Candidate | Why NOT first break |
|-----------|---------------------|
| P5/P6 OFF | **SOLVED** by AUTONOMY-05 |
| Composite | Engine+binding **AUTO** when P5∧P6; Paczka VII BOTH_HOLD=0 = **IDLE / CORRECT** |
| P5/P6 → P7 report handoff | **Intentional** policy: P7 uses OfferBoq/Document path; `feedsP7Bid=false` XOR KEEP |
| Research | CONDITIONAL safety — not next RO calc step |
| Accept / Final Bid / D | Intentional Owner / HARD STOP — not “missing auto calc” |
| P4 / P8 | Downstream of P7 (P8 reads `positionCostBid`); after P7 gate |

### Break class

| Code | Meaning | Applies? |
|------|---------|----------|
| A | brak engine | **NO** — `runIkP7PositionCostBid` EXISTS |
| B | brak bindingu | **NO** — `IkEntryHost` useMemo EXISTS |
| C | brak danych / identity | **NO** as primary (BOQ READY possible; prior VII READY/159) |
| D | intentional Owner gate | **NO** for calc · **YES** for Final Bid (separate) |
| **E** | **lever/configuration gate** | **YES — PRIMARY** |
| F | state sync | **NO** |
| G | dependency | Secondary only (P8 depends on P7) |

### Critical question (answer)

> Po AUTONOMY-05, jaki jest PIERWSZY etap, którego IK nie potrafi wykonać automatycznie read-only mimo że potrzebny engine/binding już istnieje?

**P7 Bid Calculation** (`runIkP7PositionCostBid` behind `ikF5E2eEnabled` default OFF).

**Nie** „nie ma takiego etapu”.

---

## 7. Evidence

### 7.1 Host binding (SOURCE · PRODUCTION path)

`IkEntryHost.tsx`:

- P5/P6: `useEffect` → experts when `isIkP5LaborE2eActive` / `isIkP6MaterialE2eActive` (AUTO|ON).
- Composite: `useMemo` when `p5LaborOn && p6MaterialOn` → `runIkCompositeBothHold` · **does not** take `labor`/`material` React state as input.
- P7: `useMemo` when `p7F5On` → `runIkP7PositionCostBid({ item, expert, package })` · **does not** take P5/P6 reports · **does not** take composite.
- P8: `useMemo` when `p8RiskOn` → `runIkP8RiskDecision({ p7: positionCostBid, chiefSession })`.

### 7.2 Defaults (SOURCE)

`defaultAppSettings()`:

| Key | Default |
|-----|---------|
| `ikLaborE2eEnabled` | `"AUTO"` |
| `ikMaterialE2eEnabled` | `"AUTO"` |
| `ikF5E2eEnabled` | **`false`** |
| `ikChiefWiringEnabled` | **`false`** |
| `ikRiskDecisionE2eEnabled` | **`false`** |
| `expertAiDecydentEnabled` | **`false`** |

P7/P4/P8 remain **boolean** `=== true` gates — **not** Option B enum.

### 7.3 P7 engine contract (SOURCE)

`ik-p7-position-cost-bid.ts`:

- REUSE: shadow / cutover / `computeTenderBidProposal` / PackageGate.
- HARD LOCK: RESEARCH=0 · HTTP=0 · CatalogWork WRITE=0 · PM WRITE=0 · `ensureOwnerQuestions=false`.
- Comment: **Never calls Labor/Material experts**.
- Output: `recommendedBidPln` / `bidOk` = **number / readiness**, not Owner approval.

### 7.4 Admin UI (SOURCE)

`AdminSettingsModal`: checkbox „IK · F5 / BID E2E (P7)” · `checked === true` · copy: default OFF · no Accept · no flip D.

### 7.5 Policy alignment (DOCS)

AUTONOMY-03 §10: F5/P7 **calculation** = policy **AUTO**; Final Bid = **OWNER**; dziś OFF = safety gate; change = lever/semantyka, nie nowy F5.

AUTONOMY-04 PLAN: after P5/P6 unlock, P7/P4/P8 = **osobny** settings blocker (same boolean class ×3); **OUT of AUTONOMY-05 v1**.

### 7.6 Paczka VII (REAL-TENDER · prior PV read-only)

| Probe | Result |
|-------|--------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` |
| Master BOQ | READY / **159** |
| COMPOUND / BOTH_HOLD | **0** |
| Composite consumer | **IDLE / CORRECT** |
| T04 HIT+HIT | **fixture only** — nie live composition |
| P7 live exercise this audit | **NOT OBSERVABLE / NEEDS CONTROLLED E2E** (lever OFF; this audit did not flip) |

---

## 8. Real vs Fixture

| Claim | Class |
|-------|-------|
| AUTONOMY-05 P5/P6 AUTO on prod | PRODUCTION |
| P7 default OFF / boolean gate | SOURCE + PRODUCTION |
| P7 engine + host binding exist | SOURCE (path = PRODUCTION) |
| Composite IDLE on Paczka VII | REAL-TENDER (prior PV) |
| T04 HIT+HIT COMPLETE | FIXTURE |
| P7 would compute bid if ON | SOURCE-ONLY inference · **NOT OBSERVABLE** live without lever ON |
| Final Bid stays Owner | SOURCE + POLICY |

---

## 9. Classification

| Dimension | Value |
|-----------|-------|
| Break ID | **P7-CALC-LEVER-OFF** |
| Primary class | **E — lever/configuration gate** |
| Secondary | Intentional XOR Composite↔P7 · parallel OfferBoq path (not a “missing wire” to invent) |
| Same class as pre-AUTONOMY-05 P5/P6? | **YES** (boolean opt-in OFF blocks existing binding) |
| Intentional Owner gate for Final Bid? | **YES** (separate from calc) |
| True missing engine? | **NO** |
| True missing binding? | **NO** |

---

## 10. Reuse Analysis

| Need | Already exists | Do NOT create |
|------|----------------|---------------|
| P7 calc under IK | `runIkP7PositionCostBid` + `IkEntryHost` useMemo | new Bid / F5 engine |
| Shadow Position Cost | `boq-shadow-adapter` / cutover | new costing engine |
| Package path | `computePackageBidProposal` / PackageGate | second package engine |
| P7 test seam | `forceIkF5E2eForTests` + P7 harness | new flag family without review |
| Settings pattern | AUTONOMY-05 Option B (`AUTO\|OFF\|ON`) on P5/P6 | invent unrelated master walk flag |
| Admin control | ⚙ checkbox P7 | silent default flip without OD |

**REUSE OPPORTUNITY:** apply existing host binding; change only **settings semantics / Owner GO** for P7 (analog AUTONOMY-05), optionally later P4/P8 prepare — **nie** nowy orchestrator.

---

## 11. Safety Boundaries (must remain)

| Boundary | Status |
|----------|--------|
| Research | **CONDITIONAL** · AUTO ≠ Research |
| Research Accept | **OWNER** |
| OUR RATE / Price Commit | **OWNER** |
| Material Accept | **OWNER** |
| Final Bid approval | **OWNER** |
| D | **HARD STOP false** |
| Composite `feedsP7Bid` | **false** (XOR F5 KEEP) |
| P7 hard locks | RESEARCH=0 · HTTP=0 · no Catalog/PM write |
| P1 / P2 / CatalogWork 471 | UNCHANGED |
| `computePositionCost` | UNCHANGED |

P7 AUTO calc ≠ auto Final Bid. Policy explicitly separates **number** from **approval**.

---

## 12. Severity

| Item | Severity | Type |
|------|----------|------|
| **P7 calc lever OFF** | **P1** | **CONFIGURATION** (policy wants AUTO calc; engine+binding ready) |
| P4 Chief prepare OFF | P2 | CONFIGURATION (after / parallel to P7; ≠ D) |
| P8 Risk/DW prepare OFF | P2 | CONFIGURATION + dependency on P7 |
| No P5/P6 report → P7 object handoff | P3 / INFO | INTENTIONAL SAFETY / architecture (XOR + OfferBoq path) |
| Paczka VII BOTH_HOLD=0 | — | NOT A GAP · IDLE CORRECT |
| PDF requires Owner click | — | INTENTIONAL SAFETY |
| Final Bid Owner | — | INTENTIONAL SAFETY |
| Live P7 not exercised this audit | INFO | OBSERVABILITY GAP only |

---

## 13. TRUE GAP candidates

| Candidate | True architecture gap? | Verdict |
|-----------|------------------------|---------|
| Missing P7 engine | No | Engine exists |
| Missing P7 binding | No | Binding exists |
| P7 boolean OFF vs policy AUTO | **Configuration / semantics** | **YES — first break** |
| Need new “walk orchestrator” | No | Host already fans out |
| Need P5 report → P7 pipe | No (policy) | Intentional separate path |
| Need Composite → F5 feed | No | XOR KEEP |
| Need auto Final Bid | No | Forbidden |

**TRUE GAP (narrow sense):** none that require a new module.  
**TRUE NEXT BLOCKER:** settings/policy gate on existing P7 seam.

---

## 14. Non-goals

- New engine / new flag / Classification V2  
- Reopen P1 / P2 / Composite / D  
- Auto Accept / auto Price Commit / auto Final Bid  
- Research HTTP / MODE B default ON  
- `feedsP7Bid=true` / F5 redesign  
- CatalogWork mutation  
- Silent prod default flip without Owner Decision  
- Implement in this audit  

---

## 15. Recommended Next Step

```text
Recommended next stage = OWNER REVIEW → PLAN
(not IMPLEMENT · not RCA of missing engine)
```

Scope candidates for next PLAN (Owner chooses):

1. **P7-only Option B** (`ikF5E2eEnabled`: `"AUTO"|"OFF"|"ON"`) — mirror AUTONOMY-05; AUTO = read-only calc; OFF = kill; Research stays N/A (P7 already RESEARCH=0).
2. **Owner ⚙ ON only** — no default flip; controlled exercise + PV.
3. **Defer** — keep P7 OFF; accept walk stops after MODE A + Composite.

Out of band (later): P4 prepare AUTO · P8 prepare AUTO — **after** P7 decision; still ≠ D / ≠ Final Bid.

---

## 16. Owner Decision Required?

**YES**

Pytanie Ownera (propozycja):

> Czy po AUTONOMY-05 następny krok to semantyka AUTO dla **P7 calc** (read-only Bid number), przy zachowaniu Final Bid / Accept / D jako OWNER?

Bez OD → **nie** implementować.

---

## 17. Suggested next gate

| Gate | Value |
|------|-------|
| Now | **AUDIT COMPLETE** (this doc) |
| Next | **OWNER REVIEW** |
| Then | **PLAN** (P7 settings semantics · reuse AUTONOMY-05 pattern) |
| Not yet | IMPLEMENT · DF · Research · Deploy |

---

## Appendix A — P5/P6 result consumption (explicit)

| Consumer | Consumes P5/P6 React report state? | Notes |
|----------|-------------------------------------|-------|
| Expert Conversation VM | **YES** | display / EC facts |
| Composite | **NO** | independent leaf resolve · CLOSED |
| P7 | **NO** | OfferBoq/Document Expert path · intentional |
| P8 | **NO** | reads P7 report + chiefSession |
| Shared durable IK store | **NO** | in-memory host state only |

MODE A HIT (OUR RATE / Price Memory) nadal może zasilać P7 **pośrednio** przez te same store’y Catalog/PM — nie przez obiekt raportu eksperta. To nie jest first break; first break = P7 w ogóle nie startuje.

---

## Appendix B — Downstream after P7 (not first)

| Stage | Gate today | Class |
|-------|------------|-------|
| P4 Chief prepare | `ikChiefWiringEnabled` OFF | E |
| P8 Risk/DW prepare | `ikRiskDecisionE2eEnabled` OFF | E (+ G on P7) |
| Owner Final Bid | UI / DW | D intentional |
| PDF export | Owner click | D intentional |

---

## STOP

```text
AUDIT = COMPLETE
Production baseline = 2.66.90 / 44e81d20
Code changes = ZERO
Research HTTP = ZERO
Business writes = ZERO
Commit = NOT DONE
Push = NOT DONE
Deploy = NOT DONE
EPIC = AUTONOMY-06 AUDIT ONLY

First autonomy break = P7 Bid Calculation (ikF5E2eEnabled default OFF)
Classification      = E — lever/configuration gate
Severity            = P1 CONFIGURATION
Reuse               = EXISTING runIkP7PositionCostBid + IkEntryHost binding
Owner decision      = YES
Recommended next    = OWNER REVIEW → PLAN
```
