# IK-MIGRATION-01 — P7 AUDIT ONLY  
## Formal Position Cost → Bid / F5·Bid·SUM → EC (post–P6 Material)

> **ID:** `IK-MIGRATION-01-P7-AUDIT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — **AUDIT ONLY**  
> **Mode:** READ-ONLY · **CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0**  
> **JSON:** `.tmp/p7-audit.json`  
> **Baseline:** P0–P6 **PRODUCTION VERIFIED** · P6 impl **`ee8f2cd9`** · live tip **2.66.83** / **`22570fa`** · P6 tests **46/46** · CatalogWork **471 LOCKED** · P5.33 **DO NOT CREATE**  
> **Parent SSOT:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P6-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P6-PRODUCTION-VERIFY.md)

```text
THIS IS AUDIT ONLY.
NO P7 PLAN · NO IMPLEMENT · NO F5/Bid RUN · NO RESEARCH · NO HTTP · NO ACCEPT · NO CatalogWork/PM write.
```

---

## FINAL VERDICT

```text
FORMAL STATUS = READY_FOR_PLAN

P7 FORMAL SCOPE = Position Cost → Bid
                 = Bind existing F5 / Bid / SUM into IK Expert Conversation
                 = NOT a new pricing/Bid engine (parent DF §5)

P7 UNDER IK HOST = NOT STARTED
  · no ikF5* / ikBid* / ikPositionCost* AppSettings lever
  · IkEntryHost does not invoke Position Cost / Bid / PackageGate
  · Labor/Material experts force pricingExecuted = false

EXISTING F5 / Position Cost / Bid / PackageGate STACK = ALREADY_AVAILABLE
  (TENDER-BOQ-PRICING-REBUILD-01 F0–F5 · MULTI-DWELLING PackageGate · computeTenderBidProposal)
  · classic Tenders path may already consume cutover — OUTSIDE formal IK P7 seam

IK P7 SEAM (EC facts + controlled enable) = MISSING / NOT_CONNECTED

P5.26 CatalogWork 471 = LOCKED
P6 Price Memory = LOCKED (P7 must not mutate Accept semantics)
P5.33 = DO NOT CREATE
P8 = NOT STARTED

NO CHATGPT_ESCALATION — scope wording reconciled:
  Parent DF „Bind F5/Bid/SUM do EC” ≡ Owner phase map „Position Cost → Bid”
  (REUSE engine + IK bind · not invent P7 domain)

STOP — await Owner GO for P7 PLAN (+ DESIGN FREEZE). Do not auto-PLAN.
```

---

## 1. Formal P7 scope (from SSOT — not guessed)

### 1.1 Owner-locked phase map

| Phase | Meaning | Status |
|-------|---------|--------|
| P4 | Chief Wiring | **PRODUCTION VERIFIED / LOCKED** |
| P5 | Labor E2E | **PRODUCTION VERIFIED / LOCKED** |
| P6 | Material E2E | **PRODUCTION VERIFIED / LOCKED** |
| **P7** | **Position Cost → Bid** | **NOT STARTED** (this audit) |
| P8 | Risk + decision | **NOT STARTED** |

**Sources:** P0 DF · P4/P5/P6 DF §0 · P6 PV STOP · parent DF §5.

### 1.2 Parent DF wording (exact)

```text
P7 | Bind F5/Bid/SUM do EC (nie nowy engine)
```

Pipeline (parent DF §2):

```text
… → LABOR EXPERT → MATERIAL EXPERT
  → POSITION COST (F5) → BID
  → RISK → CHIEF DECISION → EXPERT CONVERSATION → UI/PDF
```

Truth Gates Gate B (P7): *F5 line → Bid; SUM dwells = package* · forbid *nowy number w headerze bez shadow*.

### 1.3 Scope reconciliation (LOCKED for audit)

| Phrase | Meaning |
|--------|---------|
| **Position Cost → Bid** | Compute line/package costs from OUR RATE + PM SELL (+ BOM/aux) → Bid proposal |
| **F5** | Existing Position Cost → Bid cutover (`bid-position-cost-cutover` · shadow gates) |
| **SUM** | PackageGate / `aggregatePackageDirect` — dwellings sum = package total |
| **Bind … do EC** | Surface **runtime facts** (GAP/PASS/totals/sourceRef) in `ExpertConversationSurface` under IK |
| **nie nowy engine** | **FORBIDDEN** to invent second Bid / F5 / Position Cost engine |

**Not P7:** Labor research · Material DIY · Chief Dual Outcome · P8 Risk/DW · P5.33 · CatalogWork rate Accept · Price Memory Accept.

### 1.4 Legacy Truth Gates numbering note

`E2E-TRUTH-GATES` still labels older Labor/Material as P4/P5 in places — **LEGACY** (same class as Labor→P5 Owner resolution). **Formal P7** = F5/Bid bind as above; do **not** override Owner phase map.

---

## 2. P6 → P7 seam (confirmed / constrained)

### 2.1 What existing F5/Bid consumes (code)

| Input | Used by | Required for classic F5? |
|-------|---------|--------------------------|
| OfferBoq / Master BOQ | shadow Position Cost | **YES** |
| Work Catalog OUR RATE | labor adapter | per line (else GAP) |
| Price Memory / Quotes SELL | material sell adapter | per material need (else GAP) |
| Technology packs / BOM | F3 path | when applicable |
| Package / dwellings | PackageGate · SUM | multi path |
| Labor Expert report | **NOT** a typed F5 input today | **NO** |
| Material Expert report | **NOT** a typed F5 input today | **NO** |
| Chief session / D | **NOT** F5 input | **NO** |

Lookup from: `boq-shadow-adapter.ts` · `bid-position-cost-cutover.ts` · `multi-dwelling/orchestration.ts`.

### 2.2 Conceptual IK P7 seam (for PLAN — not assumed implemented)

```text
Master BOQ READY (P2)
+ P3 classification / identity (eligibility / GAP honesty)
+ P5 Labor Accept state (OUR RATE CURRENT where accepted) — optional per line
+ P6 Material Accept state (PM CURRENT where accepted) — optional per line
+ provenance
→ REUSE computeShadowPositionCosts / Bid cutover / PackageGate / computeTenderBidProposal
→ EC facts (sourceRef) under IK
→ STOP before P8
```

**Hard rules from SSOT:**

- P7 does **not** require P5 Accept success on every line (missing → **GAP**, not invent).  
- P7 does **not** require P6 Accept success on every line (missing → **GAP**).  
- P5 Labor GAP / P6 Material GAP **must not** auto-invent rates or force Bid.ok.  
- P7 must **not** call Labor/Material research to “fill” gaps (unless future Owner DF explicitly says — **none today**).

### 2.3 Where P6 ends / P7 starts

| P6 STOP | P7 START |
|---------|----------|
| Material candidate / PM Accept / research OFF | Position Cost aggregation · F5 gate · Bid · SUM · EC costing facts |
| Price Memory write (Owner Accept only) | Read OUR RATE + PM as **inputs** — no new Material Accept path |

---

## 3. Boundaries (audit)

| Boundary | Rule | Evidence |
|----------|------|----------|
| **P6** | No Material semantics / PM Accept / Material levers / DIY research from P7 | P6 DF AD-IK-P6-24 · experts `pricingExecuted: false` |
| **P5** | No Labor rate mutate · no P5.26 reopen · no Labor research from P7 | CatalogWork **471** lock · Labor expert ZERO F5 |
| **P4** | No auto Chief · no D flip · no Dual Outcome from P7 | P4 LOCKED · separate lever |
| **P3/P2** | No classifier / BOQ semantic rewrite | REUSE lines only |
| **P8** | OUT | Risk/decision later |

---

## 4. Existing stack classification

| Component | Location | Class |
|-----------|----------|-------|
| Position Cost engine | `tender-position-cost/engine.ts` | **ALREADY_AVAILABLE** |
| Shadow BOQ adapter | `boq-shadow-adapter.ts` | **ALREADY_AVAILABLE** |
| OUR RATE labor adapter | `our-rate-labor-adapter.ts` | **ALREADY_AVAILABLE** |
| Material SELL / PM adapter | `material-sell-adapter.ts` · quotes | **ALREADY_AVAILABLE** |
| BOM / technology | `bom-technology-adapter.ts` | **ALREADY_AVAILABLE** |
| F5 Bid cutover | `bid-position-cost-cutover.ts` | **ALREADY_AVAILABLE** |
| Bid calculator | `tenders-bid-calculator` `computeTenderBidProposal` | **ALREADY_AVAILABLE** |
| PackageGate / SUM | `multi-dwelling/package-gate.ts` · `aggregatePackageDirect` | **ALREADY_AVAILABLE** |
| Multi-dwelling orchestration | `multi-dwelling/orchestration.ts` | **ALREADY_AVAILABLE** |
| Equipment / Transport contracts | position-cost contracts · Owner Input | **ALREADY_AVAILABLE** (prior epics) |
| Classic Tenders UI Bid/F5 | TendersModule / offer path | **ALREADY_AVAILABLE** · **outside IK P7 host** |
| IK `IkEntryHost` F5/Bid wire | — | **NOT_CONNECTED** |
| IK EC costing / Bid facts | `ik-entry-conversation` | **PARTIAL** (explicitly avoids pricing claims today) |
| Dedicated `ikPositionCost*` / `ikF5*` / `ikBid*` lever | AppSettings | **MISSING** |
| Formal P7 tests suite | — | **MISSING** (legacy F5 harnesses exist) |
| P7 PLAN / DF | — | **MISSING** |

---

## 5. Levers (do not create in audit)

| Lever | Default | Notes |
|-------|---------|-------|
| `ikEntryEnabled` | false | IK shell — ≠ P7 |
| `ikLabor*` / `ikMaterial*` | false | P5/P6 — must stay independent |
| `ikChiefWiringEnabled` | false | P4 — must stay independent |
| `IK_ENTRY_SHELL_RUN_RATE_EXPERTS` | **false** const | must **not** become P7 ON |
| **P7-specific lever** | — | **MISSING** → **PLAN decision** (mirror P5/P6: default OFF · Owner Super Admin) |

**PLAN must freeze:** dedicated P7 enable (name TBD) · default **OFF** · must **not** imply Labor/Material research · must **not** flip D.

---

## 6. Research safety

| Risk | Finding | Class |
|------|---------|-------|
| P7 auto Labor research | No IK host call to Labor with research for pricing | **OK today** · PLAN must forbid |
| P7 auto Material / MMR | No IK host Material research for pricing | **OK today** · PLAN must forbid |
| `executeResearch !== false` on Labor/Material | **Removed** in P5/P6 (live Material `!== false` = 0) | **PASS baseline** |
| F5 cutover HTTP | Cutover docs: **ZERO HTTP/research** | **ALREADY_AVAILABLE** contract |
| Implicit Bid.ok without shadow | Truth Gates forbid | PLAN Gate B |

Any future P7 path that research-fills GAPs = **BLOCKER** (do not fix in audit).

---

## 7. F5 / Bid (existing — do not run)

| Topic | Existing contract (docs/code) |
|-------|-------------------------------|
| F5 input | OfferBoq + catalog store + optional packs / Owner Input |
| F5 output | shadow lines · gate PASS/FAIL · `offerBoqDirect` or null |
| Bid input | `computeTenderBidProposal` (+ cutover direct) |
| Bid output | `TenderBidProposal` · `recommendedBidPln` may be **null** on FAIL |
| Write | Bid proposal compute is **not** CatalogWork/PM Accept; persist paths are existing tender/pipeline — **PLAN must enumerate** before IMPLEMENT |
| Owner | Cutover FAIL → explicit GAP · no silent legacy invent in cutover mode |

**Audit did not execute F5/Bid on production tenders.**

---

## 8. Position Cost · money · units · provenance

| Topic | Finding |
|-------|---------|
| qty × rate / gaps | Shadow lines + `ShadowGapCode` · incomplete → gate fail |
| Missing Labor/Material rate | GAP semantics in F5 (not invent 0 as verified) — **confirm in PLAN tests** |
| Rounding / VAT / Kp/profit | Inside `computeTenderBidProposal` — **REUSE · do not rewrite** |
| Unit | BOQ unit SSOT · adapters; no new conversion heuristics in P7 |
| Provenance | OfferBoq `lineProvenance` / sourceDocumentId — must survive into EC facts |
| Conflict invent | If PLAN finds Bid math conflict with IK truth rules → escalate then |

No production calc / write performed.

---

## 9. Owner safety / writes

| Action | Today |
|--------|-------|
| Auto irreversible CatalogWork rate write from F5 | **Not F5’s job** — Labor Accept path |
| Auto Price Memory Accept from F5 | **Forbidden** for P7 |
| Bid number display without shadow | **Forbidden** (Truth Gates) |
| Owner Review on GAP lines | Existing gate reasons · PLAN must map to EC REVIEW/GAP |

---

## 10. CatalogWork / Price Memory locks

| Store | P7 relation |
|-------|-------------|
| CatalogWork **471** | **READ** OUR RATE only · **no** Accept/mutate in P7 |
| Price Memory | **READ** SELL/CURRENT · **no** Material Accept in P7 |

Side-effect scan (static): Position Cost adapters **read** catalog/quotes; Bid cutover builds proposal. **PLAN must re-verify** no accidental `saveWorkCatalog` / Accept helpers on IK P7 wire.

---

## 11. Failure semantics (expected for PLAN)

| Condition | Safe terminal |
|-----------|---------------|
| Missing Labor OUR RATE | **GAP** · not 0 invent |
| Missing Material PM | **GAP** · not invent |
| Identity / unit mismatch | **REVIEW / BLOCKED** |
| Provenance missing | not verified fact |
| Cutover gate fail | Bid null / NO-GO style · explicit reasons |
| GAP → Accept | **FORBIDDEN** |

---

## 12. Mobile

| Layer | Result |
|-------|--------|
| Classic Bid UI mobile | prior Tenders mobile — **not** re-certified this audit |
| IK P7 EC costing UI | **NOT STARTED** |
| Physical | **NOT VERIFIED** |

---

## 13. Test coverage (existing vs needed)

**Existing REUSE (not P7-named):**

- `test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs`  
- `test-tender-boq-pricing-rebuild-01-p0-position-cost.mjs` (+ F1–F4 / multi-dwelling harnesses)  
- P5/P6 implementation suites (regression boundary)

**Formal P7 A–X matrix:** largely **MISSING** as IK-scoped suite — **PLAN** defines; **IMPLEMENT** adds thin harness.

---

## 14. Production state (confirm)

| Surface | State |
|---------|-------|
| P6 Material E2E / Research | **OFF** |
| P5 Labor | **LOCKED** · defaults OFF |
| P4 Chief | **LOCKED** · default OFF |
| P7 | **NOT STARTED** |

Nothing enabled in this audit.

---

## 15. PLAN must freeze (preview — not PLAN)

1. Formal IN: Bind F5/Bid/SUM facts into IK EC · REUSE engines only.  
2. Dedicated P7 lever(s) default **OFF**.  
3. No Labor/Material research from P7.  
4. Missing rates → GAP · never invent.  
5. No CatalogWork / PM Accept writes.  
6. Gate B: no Bid number without shadow/SUM honesty.  
7. STOP before P8 · no P5.33.

---

## 16. CHATGPT_ESCALATION

```text
CHATGPT_ESCALATION = NOT REQUIRED

Scope is Owner-clear: Position Cost → Bid = Bind F5/Bid/SUM to EC (REUSE).
Legacy Truth Gates phase labels ≠ override.
```

Re-open escalation if PLAN attempts: new Bid engine · research-fill GAPs · CatalogWork/PM mutation · auto D/Chief · silent Bid.ok without shadow.

---

## STOP

```text
P7 AUDIT = COMPLETE
VERDICT = READY_FOR_PLAN

CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · WRITE = 0
COMMIT = 0 · PUSH = 0

DO NOT START P7 PLAN AUTOMATICALLY
DO NOT IMPLEMENT
DO NOT START F5 / BID AS P7 RUN
DO NOT CREATE P5.33
```
