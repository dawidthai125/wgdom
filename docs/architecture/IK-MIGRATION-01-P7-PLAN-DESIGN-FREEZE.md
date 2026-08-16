# IK-MIGRATION-01 — P7 PLAN + DESIGN FREEZE  
## Position Cost → Bid (IK seam · F5 / Bid / SUM → EC)

> **ID:** `IK-MIGRATION-01-P7-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P7 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P7 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p7-plan-design-freeze.json`  
> **Prior audit:** [`IK-MIGRATION-01-P7-AUDIT.md`](./IK-MIGRATION-01-P7-AUDIT.md) (`READY_FOR_PLAN`)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §2 · §5  
> **P6 LOCKED:** [`IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE.md) · PV [`IK-MIGRATION-01-P6-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P6-PRODUCTION-VERIFY.md) · impl **`ee8f2cd9`** · live **2.66.83** / **`22570fa`**  
> **P5 LOCKED:** Labor E2E · CatalogWork **471** · impl **`d5a7fa5c`**  
> **P4 LOCKED:** Chief Wiring

```text
P7 = CONTROLLED Position Cost → Bid UNDER IK
     REUSE tender-position-cost (shadow + cutover)
     REUSE computeTenderBidProposal
     REUSE PackageGate / aggregatePackageDirect (SUM)
     BIND runtime facts → Expert Conversation (EC)
     NOT a new cost / F5 / Bid / SUM engine
     NOT Labor research (P5) · NOT Material research / MMR (P6)
     NOT CatalogWork Accept · NOT Price Memory Accept
     NOT Chief Dual Outcome (P4) · NOT P8 · NOT P5.33
DEFAULT: ikF5E2eEnabled = OFF
RESEARCH = 0 · HTTP = 0 (hard lock — always)
```

---

## 0. Owner resolution (LOCKED)

| Phase | Formal meaning | Status |
|-------|----------------|--------|
| P0–P3 | Design → Entry → BOQ → Classification/Identity | **PRODUCTION VERIFIED** |
| P4 | Chief Wiring | **PRODUCTION VERIFIED / LOCKED** |
| P5 | Labor E2E | **PRODUCTION VERIFIED / LOCKED** |
| P6 | Material E2E | **PRODUCTION VERIFIED / LOCKED** |
| **P7** | **Position Cost → Bid** ← **this freeze** | **PLAN DF COMPLETE · IMPLEMENT NOT STARTED** |
| P8+ | Risk / verify / NG-10 | **NOT STARTED** |

**Scope reconciliation (LOCKED from P7 AUDIT):**

| Phrase | Meaning |
|--------|---------|
| Owner map **Position Cost → Bid** | Line/package cost from OUR RATE + Price Memory (+ BOM/aux) → Bid proposal |
| Parent DF **Bind F5/Bid/SUM do EC** | Same seam: existing engines + EC facts under IK |
| **F5** | `bid-position-cost-cutover` + shadow Position Cost (TENDER-BOQ-PRICING-REBUILD-01) |
| **SUM** | `aggregatePackageDirect` after PackageGate (multi-dwelling) |
| **nie nowy engine** | **FORBIDDEN** second calculator / Bid V2 / F5 V2 |

**Legacy Truth Gates** that still label Labor/Material as P4/P5 = **LEGACY labels only** — formal P7 stays F5/Bid bind.

---

## 1. Absolute mode (this document)

| Allowed | Forbidden |
|---------|-----------|
| PLAN + DESIGN FREEZE docs | implement · F5/Bid execution on prod |
| Test matrix design (no tests run) | research · HTTP · Accept |
| | CatalogWork / Price Memory write |
| | P2–P6 mutation · P8 · P5.33 |
| | commit · push |

**Expected counts for this session:** CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0.

---

## 2. Formal P7 scope (SEAM / WIRING)

```text
P6/P5 facts (READ)
  → Position Cost (existing shadow engine)
  → F5 cutover gate
  → Bid (computeTenderBidProposal)
  → SUM (PackageGate + aggregatePackageDirect when multi)
  → EC (Expert Conversation runtime facts)
```

**P7 is wiring + controlled enable under `IkEntryHost` / EC.**  
**P7 is NOT a calculation product.** Math, rounding, VAT/net/gross, Kp/profit stay inside existing Bid/Position Cost libs.

### 2.1 In scope (future IMPLEMENT — after Owner GO)

1. Minimal AppSettings lever **`ikF5E2eEnabled`** (default **false**).
2. IK host seam: when `=== true`, invoke **existing** Position Cost → cutover → Bid → (optional) PackageGate/SUM; emit EC facts.
3. Explicit **RESEARCH = 0** path: never call Labor/Material experts for rate fill; never MMR/DIY/HTTP.
4. Minimal tests A–AC (design below) + docs/closeout later.
5. Tip/changelog only when shipping UI.

### 2.2 Out of scope (HARD)

| Forbidden | Why |
|-----------|-----|
| New Position Cost / F5 / Bid / SUM engine | Parent DF §5 |
| Auto research / HTTP / MMR / DIY | §11 |
| CatalogWork Accept / mutate 471 | P5 LOCKED |
| Price Memory Accept | P6 LOCKED |
| Force Accept on every line | P7 reads rates; GAP stays GAP |
| Auto-run Chief / Dual Outcome / change `ikChiefWiringEnabled` | P4 LOCKED |
| Change classic `positionCostCutover !== false` default for non-IK Tenders | Classic path OUTSIDE formal P7 |
| P8 Risk · P5.33 · invent S10 | Owner map |

---

## 3. P6 → P7 input (LOCKED semantics)

| Source | P7 may | P7 must not |
|--------|--------|-------------|
| **OUR RATE** (CatalogWork / labor adapter) | **READ** | Accept · invent · research-fill |
| **Price Memory** (SELL / material adapter) | **READ** | Accept · invent · research-fill |
| Labor Expert report | **NOT** typed F5 input today | Treat as F5 required input |
| Material Expert report | **NOT** typed F5 input today | Treat as F5 required input |
| Chief / Dual Outcome | — | Auto-run / mutate |

**Accept on every line:** **NOT REQUIRED** for P7. Missing rate → existing **GAP** / cutover FAIL — not invent 0.

**Research:** P7 **never** executes research to close GAPs.

**Writes:** P7 **never** writes CatalogWork or Price Memory.

---

## 4. P7 input contract (existing fields only)

| Input | Role | Classification |
|-------|------|----------------|
| Master / Offer BOQ lines | qty · unit · identity · text · provenance | **REQUIRED** (billable lines) |
| Classification / identity status | shadow identity / NOISE / EQUIPMENT / … | **REQUIRED** (existing shadow path) |
| Quantity | Position Cost | **REQUIRED** (else GAP / incomplete) |
| Unit (BOQ) | SSOT | **REQUIRED** |
| OUR RATE (labor) | labor adapter | **REQUIRED per labor need** else **GAP** |
| Price Memory / Quotes SELL | material sell adapter | **REQUIRED per material need** else **GAP** |
| Technology packs / BOM | F3 path when applicable | **OPTIONAL** (when pack resolves) |
| Owner Input (Equipment / Transport) | existing F5 Owner resolve | **OPTIONAL** until GAP; then **BLOCKING** for COMPLETE |
| Package / dwellings / document mapping | PackageGate · SUM | **REQUIRED** when `mode === "multi"` |
| Cost facts / Offer facts (prior EC) | display / handoff | **OPTIONAL** provenance companions |
| PackageGate prior result | multi orchestration | **OPTIONAL** input; **REQUIRED** gate for package Bid |
| Labor/Material Expert `pricingExecuted` | — | **NOT APPLICABLE** as F5 numeric input |
| P7 research budget | — | **NOT APPLICABLE** (RESEARCH = 0) |

**BLOCKING (cutover / PackageGate fail — do not Bid as verified):**  
identity GAP · missing OUR RATE · missing PM · unit invalid · EQUIPMENT/TRANSPORT unresolved · PackageGate fail · cutover gate fail.

**Do not invent new fields** for P7 — map EC facts onto existing shadow/cutover/Bid types.

---

## 5. Position Cost (REUSE)

| Topic | Freeze |
|-------|--------|
| Engine | `computeShadowPositionCostForOfferBoqLine` / `computeShadowPositionCostsForOfferBoq` (`boq-shadow-adapter.ts`) |
| Formula | **quantity × rate** inside existing adapters — **do not reimplement** |
| Aggregation | labor + material + package/compound via existing shadow + `aggregatePackageDirect` |
| Rounding / VAT / net / gross | **inside** `computeTenderBidProposal` + existing money helpers — **unchanged** |
| Authoritative contract | `src/lib/tender-position-cost/*` + cutover — **REUSE** |

---

## 6. Rate semantics (from code — LOCKED)

| State | Meaning | P7 behavior |
|-------|---------|-------------|
| **OUR RATE** | Accepted / catalog labor rate SSOT (P5) | READ into labor adapter |
| **Price Memory** | Accepted / CURRENT material SELL (P6) | READ into material adapter |
| **Missing rate** | Adapter `MISSING` → `ShadowGapCode` (e.g. material price gap) | **GAP** · cutover may FAIL · Bid may be null |
| **Candidate / review** | Not promoted to verified fact | Surface as REVIEW/GAP in EC — **never** as Accept |
| **NOISE_SKIP** | Non-billable | Skipped in cutover billable counts |

**FORBIDDEN:** `missing rate → 0` as verified Position Cost / Bid total.  
**FORBIDDEN:** invent rate · research-fill · force Accept.

If rate absent: **reuse** existing F5/Bid GAP + gate FAIL semantics (`evaluateBidCutoverGate`).

---

## 7. P5 boundary (LOCKED)

| Rule | |
|------|--|
| Labor E2E | **LOCKED** — P7 does not reopen |
| CatalogWork **471** | **READ OUR RATE only** |
| Labor research / HTTP | **FORBIDDEN** |
| P5.26 / P5.31 / P5.32 / P5.33 | **DO NOT OPEN / DO NOT CREATE** |
| `ikLaborE2eEnabled` / `ikLaborResearchEnabled` | **untouched** by P7 |

---

## 8. P6 boundary (LOCKED)

| Rule | |
|------|--|
| Material E2E → Price Memory | **LOCKED** |
| Price Memory | **READ only** |
| Material research / MMR / DIY HTTP | **FORBIDDEN** |
| Material Accept | **FORBIDDEN** in P7 |
| `ikMaterialE2eEnabled` / `ikMaterialResearchEnabled` | remain **DEFAULT OFF**; **untouched** semantics |

---

## 9. P4 boundary (LOCKED)

| Forbidden auto action |
|-----------------------|
| Run Chief |
| Run Dual Outcome (D) |
| Mutate `ikChiefWiringEnabled` |
| Treat Chief session as F5 input |

---

## 10. Research hard lock (BLOCKER if violated)

```text
P7 RESEARCH = 0
P7 HTTP = 0
ALWAYS — even when ikF5E2eEnabled === true
```

### 10.1 Call paths that MUST NOT be on P7 ON wire

| Path | Risk | Plan rule |
|------|------|-----------|
| `runIkMasterBoqLaborExpert` / Labor `executeResearch` | Labor HTTP | **DO NOT CALL** from P7 seam |
| `runIkMasterBoqMaterialExpert` / Material research | Material HTTP | **DO NOT CALL** |
| MMR orchestrate / DIY Casto/OBI/LM | shop HTTP | **DO NOT CALL** |
| Any “fill GAP then Bid” research | invent + HTTP | **BLOCKER** |

### 10.2 Existing F5 stack (audit)

| Claim | Evidence |
|-------|----------|
| Cutover / shadow are compute over catalogs | `bid-position-cost-cutover.ts` · `boq-shadow-adapter.ts` |
| Classic explainability default `positionCostCutover !== false` | `tender-offer-boq-explainability.ts` — **classic Tenders**, not IK lever |
| Transport Owner Input may touch LS | `transport-bid-candidate.ts` — **existing** Owner Input surface · **not** CatalogWork/PM Accept |

**If IMPLEMENT discovers P7 seam indirectly invoking research:** stop → **CHATGPT_ESCALATION** / BLOCKER — do not “fix by enabling research”.

---

## 11. F5 (existing — bind only)

| Topic | Existing (REUSE) |
|-------|------------------|
| Entrypoint | `evaluateBidCutoverGate` / cutover helpers in `bid-position-cost-cutover.ts`; shadow via `boq-shadow-adapter.ts`; explainability optional classic path |
| Inputs | OfferBoq + catalog store + packs / Owner Input (see §4) |
| Outputs | shadow lines · gate PASS/FAIL · `offerBoqDirect` or null |
| Feature flags (classic) | `positionCostCutover` (default **true** in explainability) — **do not redefine for classic** |
| IK flag (new) | **`ikF5E2eEnabled === true`** only enables IK host bind |
| Permissions | Owner / Super Admin controlled ON (same class as P5/P6 levers) |
| Write surfaces | Cutover compute itself ≠ CatalogWork/PM Accept; see §20 |
| Tests | existing `tender-position-cost` / cutover / multi-dwelling scripts — **REUSE FIRST** |
| UI | classic Bid / OfferBoq explainability **outside** IK; IK = EC facts + optional host panel |

**P7:** wire IK → existing F5. **No F5 V2.**

---

## 12. Bid (existing — bind only)

| Topic | Existing (REUSE) |
|-------|------------------|
| Entrypoint | `computeTenderBidProposal` (`tenders-bid-calculator`) + cutover direct when gate PASS |
| Input | Position Cost / cutover direct + existing Bid calculator inputs |
| Output | `TenderBidProposal` · `recommendedBidPln` may be **null** on FAIL |
| PackageGate | multi path — gate before package SUM/Bid |
| Permissions | existing tender Bid UI ACL + IK lever for host |
| Write | proposal compute; persist only via **existing** tender/pipeline contracts (§20) |
| UI / tests | classic Bid panels + existing bid/cutover tests — **REUSE** |

**P7:** IK → existing Bid. **No Bid V2.**

---

## 13. SUM (LOCKED — single engine)

| Topic | Freeze |
|-------|--------|
| Authoritative SUM | **`aggregatePackageDirect`** (`multi-dwelling/orchestration.ts`) |
| Gate | **`evaluatePackageGate`** (`package-gate.ts`) before package totals |
| Line/shadow SUM | Completeness via cutover gate + shadow line totals — **not** a second package engine |
| Rounding | Existing aggregation — **unchanged** |
| Labor/material/package | Existing dwelling units → package aggregate |
| Missing-rate | Incomplete dwelling / gate fail — **≠ 0 PLN invent** (PackageGate docs) |

**Dual SUM engines:** **NOT FOUND** for this formal path → **no escalation**.  
If IMPLEMENT finds a competing package total engine used by IK P7 → **STOP · CHATGPT_ESCALATION_REQUIRED**.

---

## 14. PackageGate semantics (REUSE — do not change)

From `evaluatePackageGate` / mapping helpers:

| Outcome | When (existing) |
|---------|-----------------|
| **PASS** (`pass: true`) | expected count valid; unique dwellings = expected; no duplicate ids; each dwelling complete: OfferBoq present; F5_D pass; **multi:** valid document mapping (≥1 mapped source, documentId ≠ dwellingId) |
| **BLOCK / fail** (`pass: false`) | EXPECTED_COUNT_INVALID · NO_DWELLINGS · DUPLICATE · COUNT_MISMATCH · DOCUMENT_MAPPING_* · MISSING BOQ · F5_D fail · etc. |
| **HOLD / REVIEW** | Surfaced via failReasons + reasonsPl / EC REVIEW facts — **do not invent new PackageGate states** |
| Missing mapping / BOQ | **≠ 0 PLN** — Package **BLOCKED** |

**P7:** REUSE gate as-is. Multi vs `legacy_single` mapping rules unchanged.

---

## 15. EC output (formal P7 product)

```text
Position Cost → F5 → Bid → SUM → EC
```

| EC fact class | Content (map existing — no second EC schema) |
|---------------|-----------------------------------------------|
| Status | cutover PASS/FAIL · PackageGate PASS/FAIL · Bid ok / null |
| Totals | line / dwelling / package / recommendedBid when available |
| Cost facts | shadow line cost components · gap codes |
| Offer facts | Bid proposal fields when gate allows |
| Provenance | `sourceRef` / OfferBoq line provenance / document ids |
| Rate source | OUR RATE vs PM vs Owner Input vs GAP (labels) |
| **Never** | invent verified totals from inferred/candidate/review |

**Do not create a second Expert Conversation surface** — extend existing EC event/fact patterns used by P4–P6 hosts.

---

## 16. Lever design (FROZEN)

### 16.1 Naming (checked against conventions)

| Phase | Lever pattern |
|-------|---------------|
| P0 | `ikEntryEnabled` |
| P2 | `ikAutoIngestEnabled` |
| P3 | `ikIdentityCoverageEnabled` |
| P4 | `ikChiefWiringEnabled` |
| P5 | `ikLaborE2eEnabled` + `ikLaborResearchEnabled` |
| P6 | `ikMaterialE2eEnabled` + `ikMaterialResearchEnabled` |

**Frozen P7 lever (single):**

```text
ikF5E2eEnabled
  DEFAULT = false
  ON means: IK host may run Position Cost → F5 cutover → Bid → SUM → EC bind
  ON does NOT mean: research · Accept · CatalogWrite · PriceMemoryWrite
```

**Why not two levers (F5 + Bid):** formal P7 is one E2E seam; Bid without cutover violates Truth Gates; prefer **minimal seam**.  
**Why not `ikPositionCostBidEnabled`:** F5 is the tip/SSOT vocabulary for this cutover epic; shorter and consistent with rebuild docs. Alias rejected for IMPLEMENT to avoid dual flags.

**No `ikF5ResearchEnabled`:** RESEARCH hard-locked to 0.

### 16.2 Owner control

| | |
|--|--|
| Default | **OFF** |
| Controlled ON | Owner / Super Admin only (same pattern as P5/P6 AppSettings) |
| Production | DEFAULT OFF · Controlled ON **NOT_EXERCISED** unless Owner explicitly instructs after PV |

### 16.3 Classic vs IK

| Path | Control |
|------|---------|
| Classic Tenders explainability cutover | **unchanged** (`positionCostCutover !== false` today) |
| Formal IK P7 | **only** `ikF5E2eEnabled === true` |

P7 OFF → IK host does **not** claim F5/Bid/SUM; NG-10 / P4–P6 unchanged.

---

## 17. F5 / Bid separation

**Decision (FROZEN):** **one lever** `ikF5E2eEnabled` covers the full formal P7 E2E.

Separate Bid-only lever = **out of scope** unless Owner reopens DF.

---

## 18. P7 OFF vs ON

### 18.1 OFF (`ikF5E2eEnabled !== true`)

- Existing system unchanged (classic Bid/F5 paths as today).
- NG-10 unchanged · P4/P5/P6 unchanged.
- IK EC: no new F5/Bid PASS claims from P7 host.

### 18.2 ON (`=== true`)

**Only:** Position Cost → F5 → Bid → SUM → EC (existing engines).

**Still forbidden:** research · HTTP · Accept · CatalogWork write · Price Memory write · Labor/Material expert rate-fill · MMR · invent 0 · auto Chief.

---

## 19. NO AUTO-WRITE + write inventory

| Write class | Existing? | P7 rule |
|-------------|-----------|---------|
| CatalogWork rate Accept | Labor Accept path (P5) | **FORBIDDEN** |
| Price Memory Accept | Material Accept (P6) | **FORBIDDEN** |
| Shadow / cutover / Bid **compute** | Pure / in-memory | **ALLOWED** (no new persistence) |
| Tender Bid / dossier persist | Existing tender pipeline UI | **ONLY** if pre-existing Owner contract + ACL — **no new write surface** |
| Transport/Equipment Owner Input LS | `transport-bid-candidate` | **REUSE** existing Owner Input only · do not auto-invent rates |
| New KV / new Accept store | — | **FORBIDDEN** |

**IMPLEMENT must enumerate** each persist call on the IK P7 wire before ship; if ambiguous → escalation.

---

## 20. Provenance (LOCKED)

Must survive into EC / Bid facts where existing types already carry them:

| Field | Source |
|-------|--------|
| BOQ / line provenance | OfferBoq `lineProvenance` / sourceDocumentId |
| Rate source | OUR RATE · Price Memory · Owner Input · GAP |
| Material source | PM / quotes adapter provenance |
| Labor source | CatalogWork / OUR RATE provenance |
| Timestamp | existing nowMs / cutover opts |
| `sourceRef` | existing EC / fact patterns |

**Never promote:** inferred · candidate · review · GAP → verified fact / accepted rate.

---

## 21. Unit safety (LOCKED)

| Rule |
|------|
| BOQ unit = SSOT |
| Rate unit = existing adapter contract |
| Quantity = existing contract |
| Unit mismatch = existing F5 GAP / REVIEW — **no new conversion heuristics** |
| No new unit conversion tables in P7 |

---

## 22. Money safety (LOCKED)

| Topic | Rule |
|-------|------|
| qty × rate | Existing Position Cost |
| labor + material + package | Existing aggregation |
| net / VAT / gross / rounding / Kp / profit | Existing `computeTenderBidProposal` |
| Alternate calculator | **FORBIDDEN** |

---

## 23. Failure semantics (LOCKED)

| Condition | Terminal (existing) | Forbidden remap |
|-----------|---------------------|-----------------|
| Missing OUR RATE | **GAP** / cutover fail | → 0 verified |
| Missing PM | **GAP** / cutover fail | → invent |
| Missing quantity / invalid unit | incomplete / GAP | invent |
| Identity GAP / P5–P6 coverage GAP | REVIEW / GAP / BLOCK | → Accept |
| PackageGate BLOCK | package Bid blocked | → Bid PASS |
| Cutover FAIL | Bid null / explicit reasons | silent catalog invent |
| REVIEW / candidate | stay REVIEW | → Accept |
| Cost BLOCKED | stay blocked | → Bid |

---

## 24. Test design (matrix — do not implement now)

| ID | Scenario |
|----|----------|
| A | P7 OFF — IK unchanged |
| B | P7 ON — bind runs existing engines only |
| C | P6→P7 handoff — READ PM · no Accept |
| D | OUR RATE present → labor cost path |
| E | Price Memory present → material cost path |
| F | missing rate → GAP · not 0 |
| G | quantity semantics |
| H | unit mismatch → existing GAP |
| I | Position Cost line complete |
| J | labor aggregation |
| K | material aggregation |
| L | package aggregation |
| M | SUM = `aggregatePackageDirect` |
| N | PackageGate PASS |
| O | PackageGate BLOCK |
| P | F5 cutover gate |
| Q | Bid proposal / null on FAIL |
| R | EC output facts |
| S | provenance preserved |
| T | no research |
| U | no HTTP |
| V | no CatalogWork write |
| W | no Price Memory write |
| X | P6 regression (levers/off path) |
| Y | P5 regression |
| Z | P4 regression |
| AA | P3 regression |
| AB | P2 regression |
| AC | mobile / bundle smoke (no new harness) |

---

## 25. Existing test reuse (FIRST)

| Area | Reuse candidates (non-exhaustive) |
|------|-----------------------------------|
| Position Cost / F5 cutover | `scripts/*position-cost*` · `*bid*cutover*` · tender-position-cost tests |
| Bid | `*tender*bid*` / `computeTenderBidProposal` smoke |
| PackageGate / SUM | `*package-gate*` · `*multi-dwelling*` |
| EC / IK entry | `test-ik-migration-01-*` · conversation facts |
| P5 / P6 | `test-ik-migration-01-p5-labor-e2e.mjs` · `test-ik-migration-01-p6-material-e2e.mjs` |

**Do not** build a new test harness — extend existing vite-node/scripts pattern.

---

## 26. Rollback

```text
ikF5E2eEnabled = false
→ IK P7 host OFF · existing classic behavior remains
```

| Rollback | Required? |
|----------|-----------|
| Data / rate / CatalogWork / PM | **NO** |
| Bid numbers already Owner-persisted via classic UI | outside P7 lever — existing tender rules |

---

## 27. Production safety

| Rule |
|------|
| Lever DEFAULT **OFF** on tip |
| Controlled ON **NOT_EXERCISED** during IMPLEMENT unless Owner explicit |
| No research budget / no MODE B for P7 |

---

## 28. Implementation boundary (future)

### 28.1 MAY touch

- `ikF5E2eEnabled` AppSettings + `ik-entry-flag` + Admin toggle  
- `IkEntryHost` / EC conversation facts for F5/Bid/SUM  
- Thin wire into existing cutover / Bid / PackageGate APIs  
- Minimal tests A–AC + P7 docs (PLAN already here; closeout/PV later)  
- Tip / changelog when shipping  

### 28.2 MUST NOT touch

| Locked |
|--------|
| P2 · P3 · P4 Chief |
| P5 Labor E2E · P5.26 · P5.31 · P5.32 · **P5.33** |
| P6 Material E2E · MMR · DIY |
| CatalogWork mutate · Price Memory Accept |
| New engines · Bid V2 · F5 V2 · second SUM |
| Classic `positionCostCutover` default rewrite without Owner GO |

---

## 29. DESIGN FREEZE checklist

| Item | Status |
|------|--------|
| P7 scope = Position Cost → Bid = Bind F5/Bid/SUM → EC | **FROZEN** |
| P6→P7 seam = READ OUR RATE + PM · no Accept/research/write | **FROZEN** |
| Position Cost / F5 / Bid / SUM / PackageGate engines | **REUSE FROZEN** |
| Single SUM = `aggregatePackageDirect` | **FROZEN** |
| EC output = facts only · no second EC | **FROZEN** |
| Lever = `ikF5E2eEnabled` DEFAULT OFF · single E2E | **FROZEN** |
| RESEARCH/HTTP = 0 hard lock | **FROZEN** |
| Write / provenance / unit / money / failure semantics | **FROZEN** |
| Rollback / production / test matrix A–AC | **FROZEN** |
| Implementation boundary | **FROZEN** |

---

## 30. Escalation gate

**No CHATGPT_ESCALATION** required for this PLAN:

- Scope wording reconciled in P7 AUDIT  
- Single package SUM engine identified  
- Rate/GAP/PackageGate semantics evidenced in code  
- Lever naming resolved to `ikF5E2eEnabled`

If IMPLEMENT finds: dual SUM used by IK · money conflict · write without Owner contract · research on P7 wire → **STOP · escalate** with PROBLEM / EVIDENCE / IMPACT / OPTIONS / RECOMMENDATION / BLOCKER.

---

## 31. FINAL

```text
P7 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P7 OWNER GO

P7 implementation = NOT STARTED
P8 = NOT STARTED
P5.33 = DO NOT CREATE

CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
WRITE = 0
COMMIT = 0
PUSH = 0

STOP.
DO NOT IMPLEMENT P7.
DO NOT START P8.
```
