# IK-MIGRATION-01 — P6 AUDIT ONLY  
## Formal Material E2E (post–P5 Labor E2E)

> **ID:** `IK-MIGRATION-01-P6-AUDIT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — **AUDIT ONLY**  
> **Mode:** READ-ONLY · **CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0**  
> **JSON:** `.tmp/p6-audit.json`  
> **Baseline:** P0–P5 **PRODUCTION VERIFIED** · P5 impl **`d5a7fa5c`** · live tip **2.66.82** / **`5fc3ae9`** · P5.26 CatalogWork **471 LOCKED** · P5.33 **DO NOT CREATE**  
> **Parent SSOT:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P5-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P5-PRODUCTION-VERIFY.md)

```text
THIS IS AUDIT ONLY.
NO P6 PLAN · NO IMPLEMENT · NO RESEARCH · NO HTTP · NO ACCEPT · NO CatalogWork.
NO P5.33 · NO P7 · NO Material enable.
```

---

## FINAL VERDICT

```text
FORMAL STATUS = READY_FOR_PLAN

P6 FORMAL SCOPE = MATERIAL E2E (Owner-locked · parent DF §5 · P4/P5 DF)
P6 UNDER IK HOST = NOT STARTED
  · IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false (hard)
  · data-ik-material-status = shell_skipped (prod)
  · no dedicated ikMaterial* AppSettings lever

MATERIAL LIBRARY STACK = SUBSTANTIALLY IMPLEMENTED (legacy “P5 Material” label)
  · runIkMasterBoqMaterialExpert · Phase2 · DIY Edge · Accept → Price Memory
HOST WIRING / P6 LEVERS / HARD RESEARCH GUARD = MISSING or UNSAFE defaults

P5.26 CatalogWork 471 = LOCKED / UNTOUCHED (Labor OUR RATE SSOT ≠ Material Price Memory)
P5.33 = DO NOT CREATE
P7 = NOT STARTED

SAFETY (document for PLAN — do not fix in audit):
  P0  executeResearch !== false in Material Expert + MMR orchestrate
  P0  shared RUN_RATE_EXPERTS would arm Material if flipped (P5 already forbids)
  P1  no dedicated Material E2E / Research levers (mirror P5 pattern required)

NO CHATGPT_ESCALATION — scope clear; legacy “P5 Material*” docs = formal P6 debt
(same Owner resolution pattern as Labor numbering)

STOP — await Owner GO for P6 PLAN (+ DESIGN FREEZE). Do not auto-PLAN.
```

---

## 1. Formal P6 scope

### 1.1 Owner-locked phase map (authoritative)

| Phase | Meaning | Status |
|-------|---------|--------|
| P4 | Chief Wiring | **PRODUCTION VERIFIED / LOCKED** |
| P5 | Labor E2E | **PRODUCTION VERIFIED / LOCKED** |
| **P6** | **Material E2E** | **NOT STARTED** (this audit) |
| P7 | F5 / Bid / Position Cost → Bid | **NOT STARTED** |

**Sources:** parent DF §5 · P0 DF §12 · P4/P5 DF · P5 PV STOP.

### 1.2 Parent DF wording (exact intent)

```text
P6 | Material E2E (REUSE Phase2 + IkMaterialGapJob)
```

Pipeline (parent DF §2):

```text
MASTER BOQ → CLASSIFICATION GATE
  → LABOR EXPERT (P5)
  → MATERIAL EXPERT (PM CURRENT | DIY LM/Casto/OBI → Accept → PM → SELL)
  → POSITION COST (F5) → BID   ← P7
```

Truth Gates P6: *PM HIT reuse **lub** DIY oferta (produkt, cena, URL) → persist* · forbid „Wyliczam materiały” z Bid.ok.

### 1.3 Formal IN / OUT

| IN P6 | OUT P6 |
|-------|--------|
| Material Expert on Master BOQ lines | Labor E2E (P5 LOCKED) |
| Price Memory CURRENT → REUSE (0 HTTP) | Chief / D / Dual Outcome (P4) |
| MISS → selective DIY research → Candidate | F5 / Bid / Position Cost mutation (P7) |
| Owner Accept → Price Memory / Quotes | CatalogWork OUR RATE Accept (Labor) |
| Provenance / unit safety / GAP semantics | P5.26 reopen · P5.31/32 Labor category keys |
| Dedicated enable + research gate (to be planned) | P5.33 · invent prices · auto-Accept |
| REUSE `IkMaterialGapJob` inventory (gap jobs) | Shop catalogue harvest · blind retry storm |

### 1.4 Legacy label debt (do not override formal map)

| Artifact | Legacy label | Formal |
|----------|--------------|--------|
| `IK-MIGRATION-01-P5-MATERIAL-EXPERT.md` | “P5 Material” | **P6** |
| `test-ik-migration-01-p5-material-expert.mjs` | P5 | **P6** debt |
| P5.12 / P5.13 / P5.14 Material docs | P5.x | Material capability under **formal P6** |
| P5 Labor PV note `executeResearch!==!1` on demand path | “OUT OF P5” | **this P6 risk** |

---

## 2. P5 → P6 seam (confirmed from code)

### 2.1 What Material Expert actually takes

`runIkMasterBoqMaterialExpert({ item, package?, expert?, store?, …, executeResearch? })`

| Input | Required? | Source |
|-------|-----------|--------|
| Master BOQ READY | **YES** | `runIkDocumentExpert` / P2 |
| Classification / plane | **YES** (per line) | P3 `classifyEstimatorPricingPlane` |
| Product / work identity | **conditional** | mapper + `resolveDemandProductIdentityExact` · P5.13 demand.work |
| Labor expert report | **NO** | not a parameter |
| P5 Accept / Labor research success | **NO** | not required |
| Provenance / dwelling / branch | **preserved** from Master BOQ lines | P2/P3 |

### 2.2 Conceptual seam (confirmed)

```text
Master BOQ (READY)
+ P3 classification / identity
+ (optional) Labor/P5 state in host UI only — NOT a hard dependency
+ provenance on lines
→ Material Expert (parallel domain)
```

**Hard rule confirmed:** Material and Labor are **separate domains**. P6 must **not** require P5 Accept or Labor research success unless a future Owner DF explicitly adds it (none found).

### 2.3 Host today

```text
Labor:  ikLaborE2eEnabled / ikLaborResearchEnabled (P5)
Material: IK_ENTRY_SHELL_RUN_RATE_EXPERTS === false → setMaterial(null) · shell_skipped
```

Shared sentinel **intentionally** keeps Material OFF after P5 split. P6 must **not** re-arm Material by flipping shared `RUN_RATE_EXPERTS`.

---

## 3. Material domain separation

| Concept | Representation | Notes |
|---------|----------------|-------|
| **MATERIAL** | `EstimatorPricingPlane` + Material bucket | Research-eligible plane |
| **LABOR** | plane + skipped by Material research boundary | ≠ Material research |
| **COMPOUND** | plane; focus helper may → `NO_MATERIAL_COMPONENT` without mat.* | no invent |
| **UNKNOWN / UNRESOLVED** | plane / bucket | research forbidden without identity/demand path |
| **PACKAGE** | Catalog / retail pack units (`MMR_02_PACKAGE_UNITS`) | **≠ auto MATERIAL**; conversion needs approval |
| **NON_COST** | Material bucket | no research |

**Hard rules (existing):** LABOR ≠ MATERIAL · PACKAGE ≠ automatically MATERIAL · Material research ≠ Labor research · classifier **not** changed in this audit.

---

## 4. Existing Material stack (classification)

| Component | Location | Class |
|-----------|----------|-------|
| Material Expert orchestrator | `ik-material-expert.ts` `runIkMasterBoqMaterialExpert` | **ALREADY_AVAILABLE** · host **NOT_CONNECTED** |
| Product identity | `resolveDemandProductIdentityExact` | **ALREADY_AVAILABLE** |
| Price Memory / cache | `evaluateMaterialCache` | **ALREADY_AVAILABLE** |
| Phase2 research wire | `executeMaterialResearchPhase2` | **ALREADY_AVAILABLE** |
| DIY selective provider | `mmr-selective-diy-provider.ts` · Edge `mmr-diy-selective-lookup` | **ALREADY_AVAILABLE** |
| Material candidate | `PriceCandidate` | **ALREADY_AVAILABLE** |
| Owner Accept → PM | `acceptIkMaterialResearchCandidate` / `acceptMaterialResearchCandidate` | **ALREADY_AVAILABLE** |
| Auto-Accept guard | `AUTO_ACCEPT_FORBIDDEN` if `autoAccepted` | **ALREADY_AVAILABLE** |
| Demand queue / lease / cooldown | MMR-01/02 | **ALREADY_AVAILABLE** |
| Load guards (rate/timeout/retry/circuit) | `market-material-research-02-guards.ts` | **ALREADY_AVAILABLE** |
| `IkMaterialGapJob` | `ik-pricing-orchestrator` | **ALREADY_AVAILABLE** · IK host **NOT_CONNECTED** |
| Legacy dossier Material Expert V1 | `src/lib/material-expert/*` | **LEGACY** · separate from Master BOQ P6 path |
| Dedicated `ikMaterialE2eEnabled` lever | AppSettings | **MISSING** |
| Dedicated Material research lever | AppSettings | **MISSING** |
| Hard `executeResearch === true` | Material Expert / orchestrate | **UNSAFE** (`!== false`) |
| P5.26-E Labor internal-first matcher wired into Material | — | **NOT_CONNECTED** / **UNSAFE to assume** |
| CatalogWork OUR RATE write from Material Accept | — | **NOT** Material path (PM/Quotes) |
| Formal P6 tests suite (named P6) | — | **MISSING** (legacy P5-material* exists) |
| P6 PLAN / DF | — | **MISSING** |

---

## 5. Material levers (do not change)

| Lever | Default | Owner | Scope | HTTP? | Writes? | Note |
|-------|---------|-------|-------|-------|---------|------|
| `ikEntryEnabled` | false | Super Admin | IK shell | no alone | no | ≠ Material |
| `ikLaborE2eEnabled` | false | Super Admin | **Labor P5 only** | no alone | no | must **not** arm Material |
| `ikLaborResearchEnabled` | false | Super Admin | Labor research | yes if E2E ON | no Accept | ≠ Material |
| `ikChiefWiringEnabled` | false | Super Admin | P4 | no | no | ≠ Material |
| `IK_ENTRY_SHELL_RUN_RATE_EXPERTS` | **false** const | code | would start Labor+Material historically | yes if true | no auto Accept | **UNSAFE if flipped** — P6 must not use as sole ON |
| `IK_ENTRY_SHELL_EXECUTE_RESEARCH` | **false** const | code | host Material call arg today | yes if true | no | still pairs with API default true |
| `cenyMaterialow` / uplift flags | existing | Owner | mapping uplift | no research | no PM Accept | not P6 research lever |

**Dedicated explicit P6 lever:** **REQUIRED for PLAN** (mirror P5 Labor-specific pattern).  
**Existing unsafe default behavior:** Material API `executeResearch !== false` → **P0 SAFETY BLOCKER** for any future host ON without hard guard.

---

## 6. Research safety (critical)

| Location | Pattern | Class |
|----------|---------|-------|
| `ik-material-expert.ts` L319 | `opts.executeResearch !== false` | **P0 SAFETY BLOCKER** |
| `market-material-research-orchestrate.ts` L95 | `opts.executeResearch !== false` | **P0 SAFETY BLOCKER** |
| `market-material-research-wire.ts` | passes `executeResearch: true` into orch when Phase2 runs | **PARTIAL** (caller-gated) |
| P5 Labor (fixed) | `=== true` only | **do not regress**; Material must get same class of guard in P6 IMPLEMENT |

**Prod today:** Material path **not invoked** (`RUN_RATE_EXPERTS` hard OFF) → live HTTP from P6 = 0.  
**Risk:** enabling Material without PLAN/IMPLEMENT hardening reintroduces Labor’s pre-P5 failure mode.

**Audit does not fix.**

---

## 7. Material sources (authoritative existing)

| Source | Role | Category | URL / key | Parser | Provenance |
|--------|------|----------|-----------|--------|------------|
| Price Memory / Market Quotes | CURRENT REUSE | WGDOM accepted | `materialKey` + region / work quotes | n/a (cache) | accepted quote history |
| Leroy Merlin | selective DIY | shop | Edge allowlist `leroymerlin.pl` · search URL built server-side | `parseDiyShopHtml` | product URL + price + query |
| Castorama | selective DIY | shop | `castorama.pl` | same | same |
| OBI | selective DIY | shop | `obi.pl` | same | same |
| Zygmunt invoice seed | historical seed into PM | invoice | `wgdom` origin | seed data | purchase ≠ live research |
| Disconnected / mock providers | tests / Legal gate | test | n/a | mock | harness only |

**Policy:** do **not** invent new shops/hurtownie in audit. Legal/D1 PRIMARY DIY = VERIFIED (LIVE-ADAPTERS-08 / PASS-07).  
**Forbidden for Labor** shops remain **Material-only** (P5 DF).

No new source policy invented here.

---

## 8. Category routing (Material vs Labor)

| Topic | Finding |
|-------|---------|
| Labor P5.31/32 keys (`flooring`, `repairs_*`, `joinery_finish`) | **Labor work-rate** allowlist — **OUT of P6** · do not create/modify |
| Material “category” model | **materialKey** + shop provider id · **not** Labor categoryKey map |
| Edge DIY allowlist | hosts locked in Edge · client cannot pass arbitrary URLs |
| Parity mismatch Labor keys | **N/A for Material** — no Material clone of P5.33 |
| New Material category keys | **DO NOT CREATE** in audit |

**BLOCKER?** None for Labor-key parity. If PLAN invents Labor-style Material category keys without Owner source audit → escalate then. **Today: no mismatch to repair.**

---

## 9. P5.32 lessons (inherit for Material PLAN)

| Failure | Must mean | Must NOT mean |
|---------|-----------|---------------|
| PARSER_EMPTY | GAP / REVIEW | market absence / invent price |
| SOURCE_NO_MATCH | GAP / REVIEW | invent |
| QUERY_TOO_NARROW | GAP / REVIEW | blind broaden + storm |
| CATEGORY_IDENTITY_MISMATCH | GAP / HOLD | invent identity |
| HTTP / routing / budget | GAP / HOLD / cooldown | infinite retry |
| Candidate | Owner Review | Accept / CatalogWrite |

Existing Material path: cooldown + circuit + `PRICE_GAP` / unit reject · `autoAccepted` throws. PLAN must **explicitly** map P5.32 labels onto Material error taxonomy (partial today — different string codes).

---

## 10. Internal-first

| Question | Answer |
|----------|--------|
| Can Material safely use P5.26-E Labor matcher? | **NO as direct REUSE** — host/object/paint/grzejnik gates are **Labor/PACKAGE text** safety |
| Material “internal-first” today | **Price Memory CURRENT → ZERO HTTP** (`evaluateMaterialCache`) |
| Owner Knowledge Material | product identity map + accepted Quotes / invoice seed — **not** Labor Owner Knowledge text rules |
| Safe REUSE | PM cache · Phase2 · DIY provider · Accept API · classification plane |
| Unsafe assumption | wiring `lookupInternalFirst` Labor into Material Expert |

---

## 11. Owner Knowledge / units

| Topic | Finding |
|-------|---------|
| Store | Price Memory / Quotes on work catalog · demand registry · identity map |
| Units | demand/candidate unit checks (`unitsCompatible`) · package units need conversion approval |
| BOQ unit SSOT | Material line keeps BOQ `unit` on expert line result; Accept takes `expectedUnit` |
| Auto m²↔szt / mb↔szt / kg↔szt / kpl↔szt | **FORBIDDEN** without existing contract — package set treats retail packs carefully |
| Generates candidates? | Research provider may; Accept only persists |

---

## 12. Candidate · Accept · CatalogWork

### Candidate (existing)

Preserves: line ids · domain/plane · unit · price · provider · sourceUrl · query · evidence fields · timestamps (via candidate/job).  
**Candidate ≠ Accept ≠ CatalogWrite.**

### Accept

| Check | Result |
|-------|--------|
| Owner-only API | **YES** (`acceptIkMaterialResearchCandidate` separate) |
| Auto-accept | **FORBIDDEN** (`AUTO_ACCEPT_FORBIDDEN`) |
| Persist target | **Price Memory / Market Quotes** (not Labor OUR RATE) |
| Bind / Create CatalogWork rate | **NOT** Material Accept path |
| Audit trail | quote history / demand job phases |

### CatalogWork (P5.26 = 471)

| Question | Answer |
|----------|--------|
| Same SSOT as Labor accepted rates? | **NO** — Labor OUR RATE on CatalogWork; Material → **Quotes / Price Memory** |
| Reuse CatalogWork rows? | **YES** for work identity / `demand.work.<workId>` coordination · **not** for Material price Accept |
| Safe lifecycle | candidate → Owner Review → Accept → PM CURRENT → reuse |
| P6 must not | mutate accepted Labor rates · reopen P5.26 · silent CatalogWork rate write |

---

## 13. Budget

| Contract | Value | Class |
|----------|-------|-------|
| Labor P5 | 24 HTTP/run · 4/work · 0 blind retry | **Labor-only** — do **not** assume for Material |
| MMR-02 rate | ≤ **6**/min | **ALREADY_AVAILABLE** |
| MMR-02 timeout | **12s** | **ALREADY_AVAILABLE** |
| MMR-02 retry | **max 1** | **ALREADY_AVAILABLE** |
| Circuit | **3** failures / **5** min | **ALREADY_AVAILABLE** |
| Claims / pass | **MMR_MAX_ACTIVE_CLAIMS_PER_PASS = 8** | **ALREADY_AVAILABLE** |
| Cooldown | **60s** default | **ALREADY_AVAILABLE** |
| DIY client abort | **14s** | **ALREADY_AVAILABLE** |
| P6-named run/work ceiling (like Labor budget wrap) | **MISSING** as explicit IK P6 guard | **DESIGN DECISION for PLAN** |

Not “no budget at all” — **DESIGN BLOCKER for PLAN freeze** if Owner wants Labor-parity numbers without reading MMR. PLAN must **choose**: REUSE MMR limits as P6 SSOT **or** add explicit P6 wrap (without inventing mid-audit).

---

## 14. Failure semantics (actual)

| Event | Typical result |
|-------|----------------|
| Master BOQ not ready | `status: blocked` |
| CURRENT cache | HIT · 0 research |
| Provider fail / PRICE_GAP | gap / cooldown · candidate null |
| Unit mismatch | `UNIT_REJECT` · price gap |
| Cooldown / claim limit | skip / blocked research |
| `autoAccepted` | **throw** |
| LABOR / UNKNOWN invent research | boundary flags `researchBoundaryOk` false |

Aligned with GAP/REVIEW/HOLD intent; string taxonomy ≠ P5.32 Labor codes — PLAN should map.

---

## 15. Provenance / truth

Material expert lines carry: tender/dwelling/line ids · description · BOQ unit · provenance · identity · candidate provider/URL/price.  
EC events (legacy material test): identity / miss / research / candidate / owner-accept-required · **no false ACCEPTED**.  
**No sourceRef ⇒ not verified fact** (AD-IK-M05) — PLAN must keep EC truthfulness.

---

## 16. P4 / P5 regression boundary

P6 must **not**:

- trigger P4 Chief / mutate D  
- trigger Labor research / flip Labor levers  
- modify P5 accepted Labor rates  
- reopen P5.26 / change P5.31–32 keys  
- start P7 F5/Bid  

Isolation today: Material hard OFF · Labor levers Material-safe by design.

---

## 17. Test coverage matrix (A–Z)

| # | Topic | Coverage | Notes |
|---|-------|----------|-------|
| A | P6 OFF / shell | **PARTIAL** | host const false; no named P6 OFF suite |
| B | Material classification | **PARTIAL** | plane/bucket in expert tests |
| C | identity | **ALREADY** | P5.9 / P5.8 / expert |
| D | internal match (PM HIT) | **ALREADY** | HIT → 0 research |
| E | research gate | **PARTIAL** | tests force `executeResearch: true`; default `!== false` **untested as P6 OFF** |
| F | source routing DIY | **ALREADY** | provider + Edge allowlist tests (MMR) |
| G | HTTP success | **ALREADY** | mocked in expert harness · live Edge separate |
| H–K | parser empty / no match / narrow / mismatch | **PARTIAL** | MMR/DIY paths; not full P5.32 label parity |
| L | budget | **PARTIAL** | MMR guards tested; no P6 wrap |
| M | circuit breaker | **ALREADY** | MMR-02 guards |
| N | candidate | **ALREADY** | |
| O | Owner Review | **PARTIAL** | status Owner Accept required |
| P | Owner Accept | **ALREADY** | accept → PM |
| Q | no auto Accept | **ALREADY** | |
| R | CatalogWork | **N/A / PASS lock** | Material ≠ Labor rate write |
| S–T | Bind / Write CatalogWork rate | **OUT** | PM write only |
| U | provenance | **ALREADY** | |
| V | unit safety | **ALREADY** | unit reject / package guard |
| W–Z | P5/P4/P3/P2 regression | **PARTIAL** | material expert asserts no labor research / no pricing; formal P6 regression suite **MISSING** |

Harnesses: `test-ik-migration-01-p5-material-expert.mjs` (+ P5.12–14, P5.9) · `test-market-material-research-01*.mjs` · `test-market-material-research-02.mjs` · F2 material rebuild.

**No new harness created for this audit.**

---

## 18. Mobile

| Layer | Result |
|-------|--------|
| Prod Material UI | **shell_skipped** · no Material E2E chrome |
| Emulation | not exercised this audit |
| Physical device | **NOT VERIFIED** |

Do not claim physical PASS.

---

## 19. Production state (confirm)

| Lever / surface | State |
|-----------------|-------|
| P5 E2E | **OFF** |
| P5 Research | **OFF** |
| Material / P6 | **OFF / NOT STARTED** (`shell_skipped`) |
| Live | **2.66.82** / **`5fc3ae9`** (baseline; one-shot not re-polled for enablement) |

Nothing enabled in this audit.

---

## 20. PLAN must freeze (preview — not PLAN)

1. Dedicated `ikMaterialE2eEnabled` (+ optional research lever) default **OFF** · never shared `RUN_RATE_EXPERTS`.  
2. `executeResearch === true` only (kill `!== false`).  
3. Material budget SSOT = REUSE MMR **or** explicit P6 wrap.  
4. P5.32 failure → Material GAP mapping.  
5. Accept → Price Memory only · CatalogWork **471** lock.  
6. STOP before P7 · no P5.33.

---

## 21. CHATGPT_ESCALATION

```text
CHATGPT_ESCALATION = NOT REQUIRED

Scope, Labor/Material boundary, and formal numbering are Owner-clear.
Safety defaults and lever design are PLAN inputs, not scope contradictions.
```

If PLAN attempts to treat CatalogWork Accept as Material price SSOT, or to flip shared `RUN_RATE_EXPERTS` for P6 ON → **re-open escalation**.

---

## STOP

```text
P6 AUDIT = COMPLETE
VERDICT = READY_FOR_PLAN

CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · WRITE = 0
COMMIT = 0 · PUSH = 0

DO NOT START P6 PLAN AUTOMATICALLY
DO NOT IMPLEMENT
DO NOT RESEARCH
DO NOT CREATE P5.33
```
