# IK-MIGRATION-01 — P8 PLAN + DESIGN FREEZE  
## Risk → Validation → Chief Decision → Decision Workspace → EC

> **ID:** `IK-MIGRATION-01-P8-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P8 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P8 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p8-plan-design-freeze.json`  
> **Prior audit:** [`IK-MIGRATION-01-P8-AUDIT.md`](./IK-MIGRATION-01-P8-AUDIT.md) (`READY_FOR_PLAN`)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §2 · §5 · AD-IK-M03  
> **P7 LOCKED:** [`IK-MIGRATION-01-P7-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P7-PRODUCTION-VERIFY.md) · impl **`e291340e`** · live **2.66.84** / **`e291340`**  
> **P4 LOCKED:** [`IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md) · Chief Wiring  
> **P5/P6 LOCKED:** Labor / Material · CatalogWork **471**

```text
P8 = CONTROLLED Risk + Validation + Decision UNDER IK
     REUSE tender-intelligence-overlay (Risk)
     REUSE validation-expert (analyzeValidationFromDossier)
     REUSE P4 Chief Wiring / Chief dossier (LOCKED — no Chief V2)
     REUSE Decision Workspace (surface + VM — no DW V2)
     BIND facts → Expert Conversation (EC)
     NOT a new Risk / Validation / Chief / Decision engine
     NOT Labor/Material research · NOT F5/Bid rewrite · NOT P5.33 · NOT P9
DEFAULT: ikRiskDecisionE2eEnabled = OFF
RESEARCH = 0 · HTTP = 0 (hard lock — always)
IK ≠ Dual Outcome D (AD-IK-M03) — P8 ON does NOT flip expertAiDecydentEnabled
```

---

## 0. Owner resolution (LOCKED)

| Phase | Formal meaning | Status |
|-------|----------------|--------|
| P0–P3 | Design → Entry → BOQ → Classification/Identity | **PRODUCTION VERIFIED** |
| P4 | Chief Wiring | **PRODUCTION VERIFIED / LOCKED** |
| P5 | Labor E2E | **PRODUCTION VERIFIED / LOCKED** |
| P6 | Material E2E | **PRODUCTION VERIFIED / LOCKED** |
| P7 | Position Cost → Bid | **PRODUCTION VERIFIED / LOCKED** |
| **P8** | **Risk → Validation → Chief Decision → DW → EC** ← **this freeze** | **PLAN DF COMPLETE · IMPLEMENT NOT STARTED** |
| P9 | Owner verify live tender | **NOT STARTED** |
| P10 | NG-10 REMOVE | **NOT STARTED** |

**Scope reconciliation (LOCKED from P8 AUDIT):**

| Phrase | Meaning |
|--------|---------|
| Parent DF **Risk + decision (overlay/Validation/DW)** | Authoritative P8 seam |
| Owner brief **Bid → RISK → Validation → Chief Decision → EC** | Same seam (+ DW as decision surface) |
| P0 **Risk + Chief Decision** | Pipeline label — Chief Wiring = **P4**; P8 does not reopen Dual Outcome |
| Unrelated workflow/DI “P8” labels | **NOT** IK-MIGRATION phase P8 |

---

## 1. Absolute mode (this document)

| Allowed | Forbidden |
|---------|-----------|
| PLAN + DESIGN FREEZE docs | implement · run Risk/Validation/Chief/DW on prod |
| Test matrix design (no tests run) | research · HTTP · Accept · CatalogWork/PM write |
| | P2–P7 mutation · P9 · P5.33 · commit · push |

**Expected counts:** CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0.

---

## 2. Formal P8 scope (SEAM / WIRING)

```text
P7 Bid / Cost context (READ)
  → RISK overlay (applyTenderIntelligenceOverlay)     REUSE
  → VALIDATION (analyzeValidationFromDossier)         REUSE
  → CHIEF DECISION context (P4 dossier / eligibility) REUSE
  → Decision Workspace VM / surface                   REUSE
  → EC facts under IkEntryHost
```

**P8 is wiring + controlled enable under IK.**  
**P8 is NOT a new decision product.** Engines stay SSOT outside this epic.

### 2.1 In scope (future IMPLEMENT — after Owner GO)

1. AppSettings lever **`ikRiskDecisionE2eEnabled`** (default **false**).
2. IK host seam: when `=== true` (∧ `ikEntryEnabled`), run/bind existing overlay + Validation + P4 Chief context → DW/EC facts.
3. **RESEARCH = 0** always — never Labor/Material/MMR/DIY.
4. Minimal tests A–AA + docs later.
5. Tip/changelog only when shipping UI.

### 2.2 Out of scope (HARD)

| Forbidden | Why |
|-----------|-----|
| Risk / Validation / Chief / DW **V2** | Parent DF · REUSE FIRST |
| Flip `expertAiDecydentEnabled` / invent D=ON as P8 | AD-IK-M03 |
| Mutate `ikChiefWiringEnabled` as side effect of P8 ON | P4 LOCKED |
| Rewrite F5 / Bid / SUM / PackageGate | P7 LOCKED |
| CatalogWork / Price Memory Accept | P5/P6 LOCKED |
| Auto Owner Approve / Accept rates | §14 |
| P9 / P10 / P5.33 / invent S10 | Owner map |

---

## 3. P7 → P8 input contract (existing fields)

P7 product (LOCKED): `IkP7PositionCostBidReport` + EC cost/offer facts.

| Input | Source | Classification |
|-------|--------|----------------|
| `TenderBidProposal` / `recommendedBidPln` / `bidOk` | P7 cutover / package Bid | **REQUIRED** for overlay margin rules (else overlay treats as not-ready margin → HOLD path) |
| P7 `status` / cutover / PackageGate | P7 report | **REQUIRED** context (GAP/BLOCK ≠ invent PASS) |
| `directPln` / labor / material totals | P7 | **OPTIONAL** provenance companions |
| `TenderScoringBundle` + `OwnerDecisionView` | existing strategy/decision stack | **REQUIRED** for overlay rawDecision |
| `TenderPipelineItem` | pipeline | **REQUIRED** |
| `ChiefDecydentDossier` | P4 Chief session / orchestrator | **REQUIRED** for Validation Expert |
| P4 Chief eligibility / session status | `ikChiefWiring` / session | **REQUIRED** for Chief Decision context (may be unavailable → HOLD — see §24) |
| Labor/Material expert reports | P5/P6 | **NOT APPLICABLE** as Risk typed inputs |
| P8 research budget | — | **NOT APPLICABLE** |

**Do not invent new Bid/Cost models** — map P7 proposal into existing `ownerFinanceProposal` / overlay inputs.

---

## 4. RISK overlay (REUSE)

| Topic | Existing (SSOT) |
|-------|-----------------|
| Entrypoint | `applyTenderIntelligenceOverlay` (`tender-intelligence-overlay.ts`) |
| Helper | `overlayRecommendsStart` · `hasReadyTenderMargin` |
| Inputs | `TenderScoringBundle` · `OwnerDecisionView` · `ownerFinanceProposal: TenderBidProposal \| null` · `TenderPipelineItem` |
| Outputs | `TenderIntelligenceOverlay`: `rawDecision` / `displayDecision` (`GO`\|`HOLD`\|`NO-GO`) · `downgradeRule` O1–O4 · reasons · blocks · confidence |
| Status map (existing) | **GO** = STARTUJ · **HOLD** = ANALIZUJ · **NO-GO** = ODPUŚĆ |
| Blocking | O1 offer closed · O2 wadium · O3 reference gap → **NO-GO**; O4 GO without ready margin → **HOLD** |
| HTTP / research | **None** in overlay apply path (local profile/SWZ/Bid) |
| UI | Classic Hub / strategy panels — outside IK until P8 wire |
| Tests | Strategy/decision / overlay historical suites — **REUSE FIRST** |

**P8:** bind overlay results → EC · **no Risk V2** · **no status invent**.

---

## 5. VALIDATION (REUSE)

| Topic | Existing (SSOT) |
|-------|-----------------|
| Entrypoint | `analyzeValidationFromDossier` (`validation-expert`) |
| Input | `ChiefDecydentDossier` (**RO**) |
| Verdicts | **`validated` \| `needs_review` \| `blocked`** (`ValidationVerdict`) |
| Findings | hard / soft · Soft limit = 3 (LOCKED policy) |
| Blocking | `blocked` → DW `canApprove = false` (existing VM) |
| Review | `needs_review` |
| Pass-like | `validated` |
| HTTP / research | **None** (pure dossier checks) |
| Tests | `scripts/test-validation-expert-01.mjs` |

**Forbidden remaps:** Validation `blocked`/`needs_review` → Bid PASS · Validation GAP → invent `validated`.

---

## 6. Decision Workspace (REUSE)

| Topic | Existing (SSOT) |
|-------|-----------------|
| Host / surface | `DecisionWorkspaceHost` · `DecisionWorkspaceSurface` |
| VM | `buildDecisionWorkspaceViewModel` |
| Actions | Approve / Reject / Needs Review (existing) — **Owner** |
| Persist | Decision Persist (`recordDecision` / hydrate) — **existing Owner contract only** |
| Flag today | `isDecisionWorkspaceEnabled()` — coupled to Chief **Session** + `expertAiDecydentEnabled` / LS `kw-decision-workspace` |

### 6.1 IK ≠ D (LOCKED for P8)

| Rule |
|------|
| P8 lever **MUST NOT** set `expertAiDecydentEnabled = true` |
| P8 lever **MUST NOT** rewrite Dual Outcome / TM-01 S2–S3 PLN authority |
| Classic DW flag coupling for **non-IK** paths = **UNCHANGED** |
| IK P8 ON = enable **IK-scoped** Risk+Validation+Chief-context+DW/EC bind via **`ikRiskDecisionE2eEnabled === true`** (∧ Entry) |
| If IMPLEMENT needs DW DOM under IK while D=OFF: mount/reuse DW **under IK gate** without mutating D — **do not** invent second DW product |

---

## 7. Chief boundary (P4 LOCKED)

| Rule |
|------|
| REUSE `ikChiefWiringEnabled` / `isIkP4ChiefSessionEligible` / `useChiefOrchestratorSession` / `runChiefOrchestrator` T1–T6 |
| **No** Chief V2 · **no** change Dual Outcome · **no** mutate P4 lever from P8 toggle |
| Chief dossier = Validation input SSOT |
| **Chief Decision ≠ Owner Accept** — Chief assembles dossier / process; Owner Approve on DW is separate |

**P4 output → P8:** dossier + session status + EC Chief facts (when P4 ON) · if Chief unavailable → §24 HOLD/blocked Validation path — **no invent dossier**.

---

## 8. EC output (formal P8 product)

```text
Risk + Validation + Chief Decision → DW → EC
```

| Fact class | Content (map existing — no second EC) |
|------------|----------------------------------------|
| Risk | `displayDecision` · `downgradeRule` · reasons · confidence · sourceRef |
| Validation | `verdict` · hard/soft counts · summaryPl · sourceRef |
| Chief | session/dossier status (P4) · never fake success |
| Decision | DW canApprove/canReject · localDecision if Owner acted (existing) |
| **Never** | duplicate P7 Cost/Offer totals as new verified invent · promote GAP→verified |

Suggested event labels for IMPLEMENT (names illustrative — freeze **semantics**, not force new enum invent if EC already has equivalents): Risk/Validation/Decision facts with AD-IK-M05 sourceRef.

---

## 9. Lever design (FROZEN)

### 9.1 Naming check

| Phase | Lever |
|-------|-------|
| P0 | `ikEntryEnabled` |
| P2 | `ikAutoIngestEnabled` |
| P3 | `ikIdentityCoverageEnabled` |
| P4 | `ikChiefWiringEnabled` |
| P5 | `ikLaborE2eEnabled` (+ research) |
| P6 | `ikMaterialE2eEnabled` (+ research) |
| P7 | `ikF5E2eEnabled` |
| **P8** | **`ikRiskDecisionE2eEnabled`** |

Repo search: **no** existing `ikRisk*` / `ikP8*` / equivalent AppSettings lever → **freeze new name**.

```text
ikRiskDecisionE2eEnabled
  DEFAULT = false
  Active seam: ikEntryEnabled === true ∧ ikRiskDecisionE2eEnabled === true
  ON means: IK may bind Risk overlay + Validation + P4 Chief context + DW/EC facts
  ON does NOT mean: research · Accept · CatalogWrite · PriceMemoryWrite · D=ON · P4 lever flip
```

### 9.2 One E2E lever (FROZEN)

**Single** P8 lever — **no** separate `ikValidation*` / `ikDecision*` / `ikRiskOnly*` unless Owner amends DF.

### 9.3 Production

DEFAULT **OFF** · Controlled ON **NOT_EXERCISED** unless Owner explicit after PV.

---

## 10. Research hard lock

```text
P8 RESEARCH = 0
P8 HTTP = 0
ALWAYS — even when ikRiskDecisionE2eEnabled === true
```

| Forbidden on P8 wire |
|----------------------|
| Labor/Material `executeResearch` |
| MMR / DIY shop HTTP |
| Auto price lookup / invent rates |
| NG-10 “risk agent” as substitute truth (Truth Gates) |

Overlay + Validation are **local compute** today — keep that invariant.

---

## 11. Write safety

| Surface | Class | P8 rule |
|---------|-------|---------|
| Overlay / Validation / VM compute | in-memory | **ALLOWED** |
| CatalogWork 471 | WRITE | **FORBIDDEN** |
| Price Memory | WRITE | **FORBIDDEN** |
| Decision Persist / Owner Approve|Reject | WRITE | **ONLY** existing Owner DW contract + ACL — **no new auto-write** |
| EC steps | presentation | **ALLOWED** |
| New KV | — | **FORBIDDEN** |

---

## 12. Owner Decision (FROZEN)

| Layer | Who | Meaning |
|-------|-----|---------|
| Auto prepare | System | Overlay displayDecision · Validation verdict · DW VM chips |
| Owner Review | Owner | `needs_review` · HOLD · soft findings |
| Owner Decision | Owner | DW Approve / Reject / Needs Review → Persist (existing) |
| Chief Decision | System (P4) | Dossier assemble — **≠** Owner Accept |
| Rate Accept | — | **OUT of P8** (P5/P6 only) |

**No automatic Accept** of CatalogWork / PM / Bid numbers.

---

## 13. Status semantics (existing only)

### 13.1 Risk / overlay

| State | Existing | Blocking? |
|-------|----------|-----------|
| GO / STARTUJ | `displayDecision === "GO"` | No (recommend start) |
| HOLD / ANALIZUJ | HOLD or O4 downgrade | Soft / review |
| NO-GO / ODPUŚĆ | NO-GO or O1–O3 | **Hard block** style |
| Confidence low/medium/high | overlay | Informational |

### 13.2 Validation

| Verdict | Owner impact (existing DW) |
|---------|----------------------------|
| `validated` | Approve path may open (with other gates) |
| `needs_review` | Review |
| `blocked` | Approve disabled |

### 13.3 Decision Workspace

| Existing | Freeze |
|----------|--------|
| canApprove / canReject / disabledReasonPl | Unchanged semantics |
| localDecision / Persist history | Owner-only write |

---

## 14. Provenance / truth (LOCKED)

| Must survive | Source |
|--------------|--------|
| Bid / P7 sourceLabel · gate reasons | P7 report |
| Overlay downgradeRule · raw vs display | overlay |
| Validation findings codes · dossier refs | validation-expert |
| Chief session / dossier ids | P4 |
| sourceRef on EC `done` facts | AD-IK-M05 |

Missing sourceRef → **not** verified fact (`enforceIkConversationTruth`).

---

## 15. Phase boundaries (LOCKED)

| Phase | P8 |
|-------|-----|
| P7 | READ Bid/cost/EC · **no** F5/Bid/SUM/PackageGate change · **no** force `ikF5E2eEnabled` |
| P6 | **no** Material research · **no** PM write |
| P5 | **no** Labor research · CatalogWork **471** LOCKED |
| P4 | REUSE Chief · **no** lever mutate · **no** Dual Outcome flip |
| P3/P2 | READ only |

---

## 16. Unit / money safety

Overlay uses existing Bid proposal / margin helpers — **REUSE**.  
**No** new calculator · rounding · unit conversion in P8.  
Conflict invent vs P7 Bid SSOT → **STOP · escalate** at IMPLEMENT if found.

---

## 17. Failure semantics (LOCKED)

| Condition | Terminal | Forbidden |
|-----------|----------|-----------|
| Missing Bid / P7 GAP | Overlay no ready margin / HOLD or NO-GO per existing rules | invent GO |
| Risk NO-GO (O1–O3) | Blocked presentation | → Bid PASS |
| Validation `blocked` | Approve off | → validated invent |
| Validation `needs_review` | Review | → Accept |
| Chief unavailable | No fake dossier · Validation may be skipped/hold | invent Chief success |
| EC unavailable | No fake verified facts | — |
| Owner Review | Stay review | auto Approve |

---

## 18. P8 OFF vs ON

### OFF (`ikRiskDecisionE2eEnabled !== true`)

- Classic NG-10 / Hub / DW-under-D **unchanged**
- P4–P7 levers unchanged
- IK EC: no new P8 Risk/Validation/Decision PASS claims from P8 host

### ON (`=== true` ∧ Entry)

**Only:** Risk overlay + Validation + P4 Chief context + DW/EC bind (REUSE engines).

**Still forbidden:** research · HTTP · Catalog/PM write · auto Accept · D flip · P4 lever flip · F5/Bid rewrite.

---

## 19. Test design (matrix — do not implement now)

| ID | Scenario |
|----|----------|
| A | P8 OFF |
| B | P8 ON |
| C | P7 → P8 handoff (Bid/proposal READ) |
| D | Risk overlay |
| E | Validation |
| F | Risk BLOCK / NO-GO |
| G | Risk REVIEW / HOLD |
| H | Validation BLOCK |
| I | Validation needs_review |
| J | Chief Decision context (P4) |
| K | Decision Workspace |
| L | EC output |
| M | provenance / sourceRef |
| N | Owner Review |
| O | Owner Decision (existing Persist only) |
| P | no AUTO-ACCEPT |
| Q | no research |
| R | no HTTP |
| S | no CatalogWork write |
| T | no Price Memory write |
| U | P7 regression |
| V | P6 regression |
| W | P5 regression |
| X | P4 regression |
| Y | P3 regression |
| Z | P2 regression |
| AA | mobile / bundle |

---

## 20. Existing test reuse (FIRST)

| Area | Candidates |
|------|------------|
| Validation | `test-validation-expert-01.mjs` |
| Decision Workspace | `test-decision-workspace-01.mjs` |
| Chief / P4 | `test-ik-migration-01-p4-implementation.mjs` |
| P7 | `test-ik-migration-01-p7-implementation.mjs` |
| P5/P6 | existing IK P5/P6 suites |
| Overlay / strategy | historical decision/scoring smokes |

**Do not** invent a second harness — extend vite-node scripts pattern.

---

## 21. Rollback

```text
ikRiskDecisionE2eEnabled = false
→ IK P8 host OFF · classic D/DW paths unchanged
```

No CatalogWork / PM / Bid data rollback.

---

## 22. Implementation boundary (future)

### MAY touch

- `ikRiskDecisionE2eEnabled` AppSettings + `ik-entry-flag` + Admin toggle  
- `IkEntryHost` / EC conversation facts for Risk/Validation/Decision  
- Thin wire into overlay · `analyzeValidationFromDossier` · P4 Chief context · DW host under IK gate  
- Minimal tests A–AA + P8 docs  

### MUST NOT touch

P2 · P3 · P4 semantics/D · P5 · P5.26/31/32 · **P5.33** · P6 · P7 engines · CatalogWork · Price Memory · research engines · NG-10 hard REMOVE.

---

## 23. DESIGN FREEZE checklist

| Item | Status |
|------|--------|
| P8 scope = Risk → Validation → Chief context → DW → EC | **FROZEN** |
| P7→P8 seam = READ Bid/proposal + scoring/decision views | **FROZEN** |
| Overlay / Validation / DW / P4 Chief engines | **REUSE FROZEN** |
| Lever = `ikRiskDecisionE2eEnabled` DEFAULT OFF · single E2E | **FROZEN** |
| IK ≠ D · no auto Accept · RESEARCH/HTTP = 0 | **FROZEN** |
| Status maps GO/HOLD/NO-GO · validated/needs_review/blocked | **FROZEN** |
| Write / provenance / rollback / test matrix A–AA | **FROZEN** |
| Implementation boundary | **FROZEN** |

---

## 24. Escalation gate

**No CHATGPT_ESCALATION** for this PLAN:

- Scope defined in parent DF + audit  
- Engines and statuses evidenced in code  
- Lever naming free (no collision)  
- IK≠D boundary explicit  

If IMPLEMENT finds: P8 cannot surface DW without flipping D **and** Owner rejects IK-gated DW mount → **STOP · escalate** with OPTIONS.

---

## 25. FINAL

```text
P8 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P8 OWNER GO

P8 implementation = NOT STARTED
P9 = NOT STARTED
P5.33 = DO NOT CREATE

CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
WRITE = 0
COMMIT = 0
PUSH = 0

STOP.
DO NOT IMPLEMENT P8.
DO NOT START P9.
DO NOT CREATE P5.33.
```
