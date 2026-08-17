# IK AUTONOMY-07 — Next Autonomy Break Audit

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT` |
| **Status** | **AUDIT COMPLETE** |
| **Date** | 2026-08-17 |
| **Mode** | **AUDIT ONLY** · ZERO CODE · ZERO SETTINGS WRITE · ZERO RESEARCH HTTP · ZERO BUSINESS WRITE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY · ZERO PLAN · ZERO DESIGN FREEZE · ZERO IMPLEMENT |
| **Production** | **2.66.91** / **`ab5eaaa1`** (`ab5eaaa1a2eb2d244dacf16dc3f9e74800994148`) |
| **Docs tip** | **`ce552ace`** (`ce552acedb64068ca72d9cc24f399b6886e018bf`) · origin/main |
| **Prior EPICs** | **IK AUTONOMY-05 = COMPLETE / CLOSED** · **IK AUTONOMY-06 = COMPLETE / CLOSED** |
| **Policy** | [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) |
| **Prior walk** | [`IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-06-NEXT-AUTONOMY-BREAK-AUDIT.md) |

```text
AUDIT                  = COMPLETE
CODE                   = ZERO
RESEARCH HTTP          = ZERO
BUSINESS WRITES        = ZERO
COMMIT / PUSH / DEPLOY = NOT DONE
EPIC                   = AUTONOMY-07 AUDIT ONLY
```

---

## 1. Production baseline

| Field | Value | Evidence |
|-------|-------|----------|
| UI / `version.json` | **2.66.91** | [`09`](../AI/09_PRODUCTION_BASELINE.md) · AUTONOMY-06 PV |
| Impl commit | **`ab5eaaa1`** | PRODUCTION |
| Docs commit / origin/main | **`ce552ace`** | DOCUMENTATION |
| AUTONOMY-05 | COMPLETE / CLOSED · P5/P6 `"AUTO"\|"OFF"\|"ON"` | PRODUCTION |
| AUTONOMY-06 | COMPLETE / CLOSED · P7 `"AUTO"\|"OFF"\|"ON"` | PRODUCTION |
| P5 / P6 / P7 defaults | `"AUTO"` | SOURCE |
| P3 Identity | `ikIdentityCoverageEnabled: false` | SOURCE |
| P4 Chief | `ikChiefWiringEnabled: false` | SOURCE |
| P8 Risk/DW | `ikRiskDecisionE2eEnabled: false` | SOURCE |
| D | `expertAiDecydentEnabled: false` | PRODUCTION · HARD STOP |
| CatalogWork | **471** | AUTONOMY-06 PV |
| Research | CONDITIONAL · defaults **false** | PRODUCTION |
| P1 | CLOSED · `mat.inv.*` blocked | KEEP |
| P2 | KEEP GAP | KEEP |
| Composite | CLOSED · `feedsP7Bid=false` | KEEP |

Live KV (AUTONOMY-06 PV, READ-ONLY): P7 key **absent** → B-POLICY AUTO; **IK Entry ≠ true** → host P7 `shell_skipped`. This audit **did not** re-read KV / flip settings.

---

## 2. Previous closed autonomy EPICs

| EPIC | Closed as | What became automatic |
|------|-----------|------------------------|
| AUTONOMY-05 | COMPLETE / CLOSED | P5 Labor MODE A · P6 Material MODE A · `AUTO\|ON` · OFF kill-switch · Research stays CONDITIONAL |
| AUTONOMY-06 | COMPLETE / CLOSED | P7 Position Cost → F5 → Bid **calculation** · same enum · RESEARCH=0 · proposal in-memory · Final Bid remains OWNER |

Closed chain (do **not** reopen as first break):

```text
Document Expert
→ A1 Classification
→ P5 Labor MODE A
→ P6 Material MODE A
→ Composite consumer (IDLE when BOTH_HOLD=0)
→ P7 Position Cost / Bid Calculation
```

---

## 3. Full current IK walk

```text
TENDER
  ↓
DOCUMENT / MASTER BOQ READY          ← auto (Document Expert useMemo · IK Entry)
  ↓
CLASSIFICATION A1                    ← auto (EC VM / runIkMasterBoqClassification)
  ↓
P3 IDENTITY COVERAGE                 ← optional diagnostic · lever OFF (not on core path)
  ↓
P5 LABOR MODE A                      ← AUTO (AUTONOMY-05)
  ↓
P6 MATERIAL MODE A                   ← AUTO (AUTONOMY-05)
  ↓
COMPOSITE / POSITION COST (BOTH_HOLD)← auto when P5∧P6 · XOR F5 · IDLE if BOTH_HOLD=0
  ↓
P7 BID CALCULATION                   ← AUTO (AUTONOMY-06) · in-memory TenderBidProposal
  ↓
P4 CHIEF prepare                     ← NOT VALID next break (session coupled to D)
  ↓
P8 RISK / VALIDATION / DW prepare    ← ★ FIRST LEGAL BREAK · boolean OFF
  ↓
OWNER FINAL DECISION                 ← intentional OWNER (canApprove ≠ execute)
  ↓
PDF / OUTPUT                         ← intentional Owner click
```

**Parallel fan-out in `IkEntryHost`:** P5, P6, Composite, P7, P8 are independent `if (lever)` branches. No sequencer „P7 done → start P8”. P8 **reads** `positionCostBid` when present; P7 **null** is allowed (overlay HOLD path).

P2 auto-ingest is **not** in the RO core (writes `itemPatch` / `onUpdate`).

---

## 4. Existing engines

| Stage | Engine | Status |
|-------|--------|--------|
| Document | `runIkDocumentExpert` | EXISTING / PRODUCTION |
| A1 | `runIkMasterBoqClassification` | EXISTING / PRODUCTION |
| P3 Identity | `runIkMasterBoqIdentityCoverage` | EXISTING · diagnostic |
| P5 | `runIkMasterBoqLaborExpert` | EXISTING · MODE A AUTO |
| P6 | `runIkMasterBoqMaterialExpert` | EXISTING · MODE A AUTO |
| Composite | `runIkCompositeBothHold` | EXISTING · CLOSED |
| P7 | `runIkP7PositionCostBid` | EXISTING · AUTO |
| P4 Chief | `createChiefSessionEngine` / `useChiefOrchestratorSession` | EXISTING · **start gated by D** |
| P8 | `runIkP8RiskDecision` | EXISTING / PRODUCTION |
| Overlay | `applyTenderIntelligenceOverlay` | EXISTING |
| Validation | `analyzeValidationFromDossier` | EXISTING |
| DW VM | `buildDecisionWorkspaceViewModel` | EXISTING |
| Owner score | `scoreTenderForOwnerView` / `buildOwnerDecisionView` | EXISTING |

**No new engine required** for the first legal break.

---

## 5. Existing bindings

| Stage | Binding | File |
|-------|---------|------|
| Document / P5 / P6 / Composite / P7 / P8 / Identity | `IkEntryHost` | `src/app/intelligent-estimator/IkEntryHost.tsx` |
| EC facts | `buildIkEntryConversationViewModel` | `ik-entry-conversation.ts` |
| P4 Chief | `TenderDetailPage` → `useChiefOrchestratorSession` | **not** IkEntryHost |
| P8 consumer | host `useMemo` → `runIkP8RiskDecision` → EC steps Risk / Chief / DW | EXISTING |

P8 host (SOURCE):

```text
p8RiskOn = isIkP8RiskDecisionE2eActive() === true
riskDecision = useMemo:
  if (!p8RiskOn) return null
  return runIkP8RiskDecision({ item, p7: positionCostBid, bidProposal, chiefSession })
```

---

## 6. Current gates

| Stage | Gate | Default | Safety-necessary? |
|-------|------|---------|-------------------|
| IK Entry | `ikEntryEnabled === true` | **true** (load) | YES — master shell |
| P2 ingest | `ikAutoIngestEnabled === true` | **false** | YES — **write** path |
| P3 Identity | `ikIdentityCoverageEnabled === true` | **false** | Optional diagnostic · not core |
| P5 / P6 | `isIkE2eModeActive` AUTO\|ON | **AUTO** | Kill-switch OFF remains |
| Research P5/P6 | three booleans `=== true` | **false** | YES — CONDITIONAL |
| Composite | P5∧P6 | follows AUTO | CLOSED |
| P7 | `isIkE2eModeActive` AUTO\|ON | **AUTO** | Kill-switch OFF remains |
| P4 | `ikChiefWiringEnabled === true` ∧ pricingReady | **false** | Coupled to **D** session flag — see §10 |
| P8 | `ikEntryEnabled ∧ ikRiskDecisionE2eEnabled === true` | **false** | Opt-in **blocks RO prepare** · same class E as pre-A06 P7 |
| D | `expertAiDecydentEnabled` | **false** | HARD STOP — KEEP |
| Final Bid / Persist | Owner UI `canApprove` | — | YES — OWNER |

Chief session **runtime** (`isChiefOrchestratorSessionEnabled`): LS `"0"`/`"1"` else **`expertAiDecydentEnabled === true`**. Hook **refuses `engine.start`** when that is false — even if P4 preference is ON.

---

## 7. Read-only classification

| Stage | Read-only? | Write | HTTP Research | Owner decision required to *run calc*? |
|-------|------------|-------|---------------|----------------------------------------|
| Document | YES | no | no | no |
| A1 | YES | no | no | no |
| P3 Identity | YES (diagnostic) | no Catalog | no | ⚙ today |
| P2 ingest | **NO** | itemPatch / cloud | possible docs fetch | ⚙ |
| P5/P6 MODE A | YES | no | no | no (AUTO) |
| P5/P6 MODE B | NO | lease / PRICE_DEMAND | **YES** | CONDITIONAL |
| Composite | YES | locks 0 | no | no |
| P7 | YES (proposal) | locks 0 | no | no (AUTO) |
| P4 Chief dossier | YES *if* session runs | no persist (hook comment) | no in hook | **cannot run with D=false** |
| P8 | **YES prepare** | locks 0 · `autoAcceptExecuted: false` · D not flipped | **0 always** | ⚙ today · **should not be** |
| Accept / Price Commit / Final Bid | — | **YES** | — | **OWNER forever** |

P8 hard locks (SOURCE `ik-p8-risk-decision.ts`):

```text
researchExecuted: false
httpCalls: 0
catalogWorkWrite: false
priceMemoryWrite: false
autoAcceptExecuted: false
expertAiDecydentFlipped: false
ikChiefWiringMutated: false
```

EC copy: `canApprove` · Owner-only Persist. `localDecision: null` in P8 DW build.

---

## 8. Write audit (this audit)

| Surface | Count |
|---------|-------|
| Accept | **0** |
| Price Commit | **0** |
| Final Bid | **0** |
| CatalogWork | **0** |
| PM / PRICE_DEMAND | **0** |
| Tender mutation | **0** |
| Research HTTP / lease | **0** |
| Settings write | **0** |
| Code / commit / push / deploy | **0** |

---

## 9. Research boundaries

Research remains **CONDITIONAL** (P5/P6 `executeResearch === true` only).

| Claim | Result |
|-------|--------|
| P7 AUTO ≠ Research | KEEP (AUTONOMY-06) |
| P8 ON ≠ Research | SOURCE — no research lever · HTTP=0 |
| Lack of Research HTTP | **NOT** an autonomy break |
| MODE B default ON | **FORBIDDEN** as next epic |

---

## 10. First autonomy break

### Statement

```text
FIRST LEGAL AUTONOMY BREAK AFTER AUTONOMY-06 =

  P8 — Risk overlay → Validation (when Chief dossier present)
       → Decision Workspace VM → EC
  gated by AppSettings.ikRiskDecisionE2eEnabled === true (default false)
```

### Why this is first (not earlier / not P4)

| Candidate | Why NOT first legal break |
|-----------|---------------------------|
| Document / A1 / P5 / P6 / Composite / P7 | **CLOSED** core |
| P3 Identity OFF | Optional diagnostic · **not** on closed core · P5/P6/P7 **do not consume** it · skipping it was already the A06 walk |
| P2 ingest | **Write** — not RO |
| Research | CONDITIONAL safety |
| Accept / Price Commit / Final Bid / D | Intentional OWNER / HARD STOP |
| Paczka VII BOTH_HOLD=0 | IDLE / CORRECT |
| Paczka VII P7 NOT OBSERVABLE | Observability (IK Entry OFF) — not missing engine |
| **P4 Chief** | Engine+page wiring exist, **but** `useChiefOrchestratorSession` **starts only if** `isChiefOrchestratorSessionEnabled()` = **D true** (unless LS OV). Auto `ikChiefWiringEnabled` **without D** does **not** produce a Chief dossier. Enabling D violates **J**. Decoupling session from D = **new wiring** (not this audit). **NOT a legal A–N break under D=false.** |

### Why P8 **is** the break

| Criterion | P8 |
|-----------|----|
| A engine exists | `runIkP8RiskDecision` |
| B binding exists | `IkEntryHost` useMemo + EC |
| C business RO | overlay + VM + facts · not Persist |
| D–F no Accept / Price Commit / Final Bid | hard locks + `canApprove ≠ recordDecision` |
| G no Research HTTP | always 0 |
| H no new engine | REUSE overlay / Validation / DW |
| I no new flag | **same** `ikRiskDecisionE2eEnabled` |
| J D HARD STOP | P8 **must not** flip D · does not need D to run |
| K–M P1 / P2 / Composite | unused / unchanged |
| N autonomous after inputs | IK Entry ON · optional P7 proposal · optional Chief (HOLD validation if missing) |

Without Chief: P8 still runs overlay + idle DW VM; Validation = HOLD (`chief_unavailable`) — **honest**, no invent dossier.

With P7 AUTO (when Entry ON): `bidProposal` can flow in automatically — P8 no longer waits on a boolean P7 OFF.

### Break class

| Code | Applies? |
|------|----------|
| A brak engine | **NO** |
| B brak bindingu | **NO** |
| C brak danych | **NO** as primary (BOQ READY possible) |
| D intentional Owner gate | **NO** for prepare · **YES** for Persist / Final Bid (separate) |
| **E lever/configuration gate** | **YES — PRIMARY** |
| F state sync | **NO** |
| G dependency | Secondary: richer Validation if P4/D Chief exists — **not required** to start P8 |

Same class as pre-AUTONOMY-06 P7 and pre-AUTONOMY-05 P5/P6: **existing seam blocked by boolean default OFF**.

---

## 11. Exact code path

```text
IkEntryHost
  isIkP8RiskDecisionE2eActive()
    = isIkEntryEnabled() === true
    ∧ isIkRiskDecisionE2eEnabled() === true
         loadAppSettingsLocal().ikRiskDecisionE2eEnabled === true   ← DEFAULT false

  useMemo riskDecision
    → runIkP8RiskDecision({
         item,
         p7: positionCostBid,          // P7 AUTO when Entry ON
         bidProposal: positionCostBid?.proposal ?? null,
         chiefSession,                 // from TenderDetailPage; null OK
       })
    → applyTenderIntelligenceOverlay
    → analyzeValidationFromDossier(dossier)  // only if chief dossier
    → buildDecisionWorkspaceViewModel({ localDecision: null, flagEnabled: true })
    → buildIkEntryConversationViewModel(..., { riskDecision })
```

Admin: checkbox `data-ik-risk-decision-e2e-toggle` · default OFF · copy: no research / no auto-Accept / no flip D.

Gate helper still **`=== true`** (not `isIkE2eModeActive`). That is the configuration break — **not** a missing product.

---

## 12. Classification

| Dimension | Value |
|-----------|-------|
| Break ID | **P8-PREPARE-LEVER-OFF** |
| Category | **E — lever / configuration gate** |
| Stage | P8 Risk → Validation → DW prepare (IK-scoped) |
| Same class as pre-A06 P7? | **YES** |
| Intentional Owner gate for Final Bid? | **YES** (separate) |
| True missing engine? | **NO** |
| True missing binding? | **NO** |
| Requires D? | **NO** |
| Requires new flag key? | **NO** |

---

## 13. Severity

| Item | Severity | Type |
|------|----------|------|
| **P8 prepare lever OFF** | **P1** | **CONFIGURATION** (policy AUTONOMY-03: P8 prepare = legal RO core; engine+binding ready) |
| P4 Chief under D=false | **P2 / BLOCKED** | D coupling — **not** legal auto-break |
| P3 Identity OFF | P3 / INFO | Optional diagnostic · not first after closed core |
| P8 Validation HOLD without Chief | INFO | Honest HOLD · no invent |
| Paczka VII P7/P8 live | INFO | NOT OBSERVABLE (IK Entry OFF on prior PV) |
| Final Bid Owner | — | INTENTIONAL SAFETY |

---

## 14. Reuse assessment

| Need | Already exists | Do NOT create |
|------|----------------|---------------|
| P8 under IK | `runIkP8RiskDecision` + host useMemo + EC | new Risk / Validation / DW engine |
| Overlay / score | `applyTenderIntelligenceOverlay` · owner-view | Risk V2 |
| Validation | `analyzeValidationFromDossier` | invent dossier |
| DW VM | `buildDecisionWorkspaceViewModel` IK-scoped `flagEnabled` | flip D / classic DW LS |
| Settings pattern | AUTONOMY-05/06 Option B on **same key** | new `ikP8Autonomy*` / master walk flag |
| Admin | existing P8 checkbox | silent default flip without Owner GO |

**REUSE: YES**  
**NEW ENGINE: NO**  
**NEW FLAG: NO** (keep `ikRiskDecisionE2eEnabled`; semantics-only if Owner later chooses AUTO\|OFF\|ON)

---

## 15. Why it is NOT Owner-only

Owner-only = Accept · Price Commit · Final Bid · Persist (`recordDecision`) · D.

P8 produces:

- overlay `displayDecision` (GO/HOLD/NO-GO **display**)
- validation verdict when dossier exists
- DW VM with **`canApprove` capability**

Policy (AUTONOMY-03): `canApprove ≠ recordDecision`. P8 sets `localDecision: null`. `autoAcceptExecuted` is always false.

Blocking P8 OFF blocks **read-only prepare / EC facts**, not Owner approval.

---

## 16. Why it is NOT a safety HOLD

| Safety HOLD (keep) | P8 boolean OFF (break) |
|--------------------|-------------------------|
| D false | P8 does not need D |
| P1 / P2 / Composite | P8 does not reopen |
| Research CONDITIONAL | P8 has no research |
| Final Bid Owner | P8 does not execute it |
| P8 OFF as kill-switch | **valid opt-out** — same as P7 OFF |
| P8 OFF as **default that prevents existing RO seam** | **same class E** that A05/A06 already treated as first break |

Chief-unavailable Validation HOLD **inside** P8 is honest safety **when P8 runs**. The **outer** `ikRiskDecisionE2eEnabled === false` is the configuration gate.

---

## 17. Why it is not P5 / P6 / P7

| Stage | Status after AUTONOMY-06 |
|-------|--------------------------|
| P5 / P6 | AUTO · CLOSED |
| P7 | AUTO · CLOSED · `runIkP7PositionCostBid` unchanged |
| P8 | Still boolean **false** · different engine (`runIkP8RiskDecision`) · different key |

P8 **reads** P7 proposal; it does **not** re-run F5 / `computePositionCost` / Composite.

---

## 18. Real-tender evidence (Paczka VII)

| Probe | Result | Class |
|-------|--------|-------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` | REAL-TENDER (prior PV READ) |
| Master BOQ | **READY / 159** | REAL-TENDER |
| CatalogWork | **471** | REAL-TENDER |
| COMPOUND / BOTH_HOLD | **0** | IDLE / CORRECT |
| P7 live execution | **NOT OBSERVABLE** | IK Entry OFF in live KV · no settings write |
| P8 live execution | **NOT OBSERVABLE** | same Entry OFF · this audit did not flip P8 / Entry |

**Do not** claim live P8 (or P7) runtime on Paczka VII.  
**Do not** treat NOT OBSERVABLE as missing engine.  
Legal observable data = BOQ READY / 159 / CW 471 / BOTH_HOLD=0 only.

---

## 19. Recommended next stage

```text
Recommended next stage = OWNER REVIEW → PLAN
(not IMPLEMENT · not DF · not default flip)
```

Candidate (Owner chooses later):

1. **P8-only Option B** on **same** key `ikRiskDecisionE2eEnabled`: `"AUTO"|"OFF"|"ON"` — mirror AUTONOMY-05/06. AUTO/ON = READ-ONLY P8 prepare. OFF = kill-switch. Research stays 0. Accept / Final Bid / D unchanged.
2. Controlled ⚙ ON only (no default AUTO) — narrower.

**Out of next stage unless Owner separately GO:** P4↔D session decoupling · P3 Identity AUTO · P2 ingest · MODE B Research.

---

## 20. Explicit non-goals

- New engine / new flag key / new orchestrator  
- Reopen P1 / P2 / Composite / P5 / P6 / P7  
- Flip D / `expertAiDecydentEnabled`  
- Auto Accept / auto Price Commit / auto Final Bid / auto `recordDecision`  
- Research HTTP / MODE B default ON  
- Invent Chief dossier when session unavailable  
- `feedsP7Bid=true` / F5 redesign / CatalogWork write  
- Silent production default flip without Owner Decision  
- Treat Paczka VII NOT OBSERVABLE as a new epic  
- PLAN / Design Freeze / IMPLEMENT in this audit  

---

## CRITICAL OUTPUT

```text
FIRST AUTONOMY BREAK: P8 Risk / Validation / Decision Workspace prepare
CATEGORY:              E — lever / configuration gate
SEVERITY:              P1 CONFIGURATION
ENGINE:                runIkP8RiskDecision
BINDING:               IkEntryHost useMemo + buildIkEntryConversationViewModel
CURRENT GATE:          ikEntryEnabled ∧ ikRiskDecisionE2eEnabled === true
                       (default false)
REUSE:                 YES
NEW ENGINE:            NO
NEW FLAG:              NO
OWNER DECISION:        YES  (semantics / whether AUTO vs ⚙ ON — not Owner-only runtime)
```

P4 Chief is **documented** as the sequential neighbor but **rejected** as first legal break under D HARD STOP.

---

```text
AUDIT = COMPLETE
FIRST AUTONOMY BREAK = P8 PREPARE (ikRiskDecisionE2eEnabled default OFF)
CODE / SETTINGS / RESEARCH / WRITES / COMMIT / PUSH / DEPLOY = ZERO
STOP — await Owner GO for PLAN.
```
