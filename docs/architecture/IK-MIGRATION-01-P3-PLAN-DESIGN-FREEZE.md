# IK-MIGRATION-01 — P3 PLAN + DESIGN FREEZE  
## Classification + Identity (IK-controlled · pre-research)

> **ID:** `IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P3 PLAN + DESIGN FREEZE = COMPLETE** · **P3 IMPLEMENTATION = COMPLETE** · see [`IK-MIGRATION-01-P3-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P3-IMPLEMENTATION-CLOSEOUT.md)  
> **Date:** 2026-08-16  
> **Mode (this doc):** DESIGN FREEZE SSOT · IMPLEMENT shipped under Owner GO  
> **JSON:** `.tmp/p3-plan-design-freeze.json`  
> **Audit:** [`IK-MIGRATION-01-P3-AUDIT.md`](./IK-MIGRATION-01-P3-AUDIT.md) (`READY_FOR_PLAN`)  
> **Closeout:** [`IK-MIGRATION-01-P3-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P3-IMPLEMENTATION-CLOSEOUT.md)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §5  
> **Prior P2 DF:** [`IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE.md)  
> **P2 PV:** [`IK-MIGRATION-01-P2-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P2-PRODUCTION-VERIFY.md) · impl **`aa4c0edf`**  
> **Historical classify note:** [`IK-MIGRATION-01-P3-CLASSIFICATION-GATE.md`](./IK-MIGRATION-01-P3-CLASSIFICATION-GATE.md) · Identity Coverage [`IK-MIGRATION-01-P5.5-IDENTITY-COVERAGE.md`](./IK-MIGRATION-01-P5.5-IDENTITY-COVERAGE.md)

```text
P3 = CONTROLLED Classification + Identity UNDER IK
     AFTER validated BOQ (P2)
     BEFORE research / Accept / F5 / Bid
REUSE: classification-gate A1 · ik-classification · ik-identity-coverage
       · internal-first · host/domain safety · P5.26-E…P5.32
DEFAULT: IDENTITY_COVERAGE remains OFF until Owner GO IMPLEMENT
EXECUTE_RESEARCH / RUN_RATE_EXPERTS stay OFF (never flipped by P3)
```

---

## 0. Baseline (LOCKED)

| | |
|--|--|
| P0 | PRODUCTION VERIFIED · `b004b08e` |
| P1 | PRODUCTION HARDENED · `ebab4a9f` |
| P2 | PRODUCTION VERIFIED · impl `aa4c0edf` · PV docs `a449f0f3` · live tip contains impl |
| P3 audit | COMPLETE · `READY_FOR_PLAN` |
| P3 formal | **NOT IMPLEMENTED** under controlled IK series (stack AVAILABLE) |
| P5.26 | LOCKED @ `1d41f619` · CatalogWork **471** · Accept 9/9 · REVIEW-9 frozen |
| P5.27 / 31 / 32 | LANDED / VERIFIED |
| P5.33 | **DO NOT CREATE** |
| AUTO_INGEST | default **OFF** (P2 lever — unchanged by P3) |
| EXECUTE_RESEARCH | **OFF** |
| RUN_RATE_EXPERTS | **OFF** |
| IDENTITY_COVERAGE | **OFF** (sole candidate P3 lever) |

---

## 1. AD (P3) — LOCKED this freeze

| AD | Treść |
|----|--------|
| **AD-IK-P3-01** | P3 = A1 Classification → Identity → handoff flags → **STOP** (pre-research) |
| **AD-IK-P3-02** | REUSE FIRST — zero Classification V2 / Identity V2 / new matcher engine |
| **AD-IK-P3-03** | Input = P2 Master BOQ **READY** or **PARTIAL subset** only; HOLD/GAP = **STOP** |
| **AD-IK-P3-04** | **Only** `IK_ENTRY_SHELL_IDENTITY_COVERAGE` may be flipped for P3 IMPLEMENT; `EXECUTE_RESEARCH` · `RUN_RATE_EXPERTS` stay **OFF** |
| **AD-IK-P3-05** | IDENTITY_COVERAGE **default remains OFF** until Owner GO IMPLEMENT |
| **AD-IK-P3-06** | IDENTITY_COVERAGE ON ≠ EXECUTE_RESEARCH ON ≠ RUN_RATE_EXPERTS ON |
| **AD-IK-P3-07** | A1 Classification = sync · **0 HTTP** · **0 research** · **0 Accept** · **0 CatalogWrite**; `allow*Research` = permission bits only |
| **AD-IK-P3-08** | Thin identity on classify lines (`identityStatus`) accompanies A1; full Identity Coverage = host guard |
| **AD-IK-P3-09** | REVIEW ≠ ACCEPT · NO_MATCH ≠ market absence · PARSER_EMPTY ≠ price miss |
| **AD-IK-P3-10** | No new category keys; P5.31/32 keys LOCKED |
| **AD-IK-P3-11** | Unit: no unsafe remap without existing Owner rule |
| **AD-IK-P3-12** | Provenance preserved (BOQ sourceRef + classify/identity evidence); no synthetic evidence |
| **AD-IK-P3-13** | P5.26–32 UNTOUCHED — zero rate/bind/Accept mutation |
| **AD-IK-P3-14** | Rollback: IDENTITY_COVERAGE=false → classify thin/EC policy only · no coverage run · no research |
| **AD-IK-P3-15** | P3 MUST NOT auto-start P4 Chief / P5 Labor / Material HTTP / F5 / Bid |

*(Parent AD-IK-M01–M10 · AD-IK-P2-* remain LOCKED.)*

---

## 2. P3 objective (contract)

```text
P2 validated BOQ
  → [eligibility] READY | PARTIAL subset
  → A1 Classification (classifyEstimatorPricingPlane / runIkMasterBoqClassification)
       planes: LABOR | MATERIAL | COMPOUND | UNKNOWN
       handoff: LABOR_READY_FOR_EXPERT | MATERIAL_READY_FOR_EXPERT | BOTH_HOLD | UNRESOLVED
       thin identityStatus on each line
  → [controlled] Identity Coverage when IDENTITY_COVERAGE ON
       (runIkMasterBoqIdentityCoverage — diagnostic REUSE P5.5)
  → optional REUSE internal-first / host-domain safety for match evidence (no write)
  → P3 OUTPUT row bundle + handoff flags
  → STOP
```

**OUT:** research HTTP · labor/material expert execution · Accept · CatalogWork create/bind · F5 · Bid · Dual Outcome · P5.33 · NG-10 removal · invent rows/units/prices.

---

## 3. IK ON matrix (LOCKED)

| Case | Flags | Behavior |
|------|-------|----------|
| **A** | IK OFF | NG-10 UNCHANGED |
| **B** | IK ON · AUTO_INGEST OFF | P1 Entry Shell |
| **C** | IK ON · AUTO_INGEST ON | P2 Documents → BOQ |
| **D** | P2 Master BOQ READY (+ IK ON) | A1 Classification allowed (sync · EC facts) |
| **E** | D + IDENTITY_COVERAGE ON | Identity Coverage run + EC identity facts |
| **F** | E (or D thin) | Handoff flags on lines |
| **G** | — | **STOP** — no research / Accept / F5 / Bid |

No path auto-transitions to research.

---

## 4. Input eligibility (LOCKED)

| P2 status | P3 |
|-----------|-----|
| **READY** | **IN** — full A1 (+ coverage if ON) |
| **PARTIAL** | **IN** only lines that are structurally valid (qty+unit+opis + lineage); gaps remain explicit · never treat gap rows as IDENTIFIED |
| **HOLD** | **STOP** |
| **GAP** | **STOP** |
| PARSER_EMPTY | reason only · **≠** market absence · **≠** NO_MATCH price |

`masterBoq.readyForExperts === false` → classification report **blocked** (`MASTER_BOQ_NOT_READY`) — REUSE existing.

---

## 5. Classification (LOCKED)

### REUSE

| Component | Role |
|-----------|------|
| `classification-gate.ts` · `classifyEstimatorPricingPlane` | A1 SSOT |
| `owner-classification-map.ts` | Owner seeds |
| `ik-classification.ts` · `runIkMasterBoqClassification` | Master BOQ orchestration |
| `ik-entry-conversation.ts` | CLASSIFICATION_* EC events |

### Planes (existing taxonomy — no invent)

`LABOR` · `MATERIAL` · `COMPOUND` · `UNKNOWN`

### Handoff (existing)

`LABOR_READY_FOR_EXPERT` · `MATERIAL_READY_FOR_EXPERT` · `BOTH_HOLD` · `UNRESOLVED`

### Hard rules

- Sync only · **0 HTTP**
- `allowLaborResearch` / `allowMaterialResearch` = **permission bits** · **NOT** auto-GO research
- Never invent plane from `namePl` alone (A1: miss → UNKNOWN)
- Reconciliation 1:1 lines · 0 silent loss · 0 invented rows

### Classification trigger (Owner decision — LOCKED)

| Decision | Value |
|----------|--------|
| Trigger | When IK Entry active **and** Master BOQ READY (or eligible PARTIAL subset) |
| New AppSettings flag for classify? | **NO** — avoid flag sprawl |
| Controlled formal P3 lever | **IDENTITY_COVERAGE only** (coverage + full identity EC) |
| EC CLASSIFICATION_* when READY | **ALLOWED** as read-only truth facts (already present) — IMPLEMENT may harden gating if needed without new global flag |
| Must never | Call labor/material experts · flip EXECUTE_RESEARCH |

---

## 6. Identity (LOCKED)

### Layers

| Layer | Source | When |
|-------|--------|------|
| **Thin** | `identityStatus` on `IkClassifiedMasterLine` | With A1 classify |
| **Coverage** | `runIkMasterBoqIdentityCoverage` (P5.5) | Only if `IDENTITY_COVERAGE === true` |
| **Internal-first / semantic / host / domain** | P5.25–26-E infra | REUSE for evidence / safety · **no write** · no auto research |

### Thin statuses (existing — SSOT)

`HAS_WORK_ID` · `HAS_MATERIAL_KEY` · `WORK_ID_NO_OWNER_SEED` · `MISSING_IDENTITY`

### Coverage statuses (existing — SSOT)

`NON_COST` · `TRUSTED_WORK` · `TRUSTED_MATERIAL` · `TRUSTED_BOTH` · `APPROVED_ALIAS` · `OWNER_MAPPING_POSSIBLE` · `AMBIGUOUS` · `IDENTITY_GAP`

### Audit aliases → SSOT (no new enums)

| Audit label | Maps to |
|-------------|---------|
| IDENTIFIED | TRUSTED_* / HAS_WORK_ID / HAS_MATERIAL_KEY / APPROVED_ALIAS (with evidence) |
| REVIEW | AMBIGUOUS · OWNER_MAPPING_POSSIBLE · WORK_ID_NO_OWNER_SEED |
| NO_MATCH | MISSING_IDENTITY · IDENTITY_GAP · NO_INTERNAL_MATCH (if internal-first consulted) |
| GAP | P2 GAP/HOLD stop · or coverage NON_COST / blocked input |

### IDENTITY_COVERAGE lever (LOCKED)

| | |
|--|--|
| Constant / host | `IK_ENTRY_SHELL_IDENTITY_COVERAGE` (default **false**) |
| OFF | No `runIkMasterBoqIdentityCoverage`; thin status only if classify ran |
| ON | Run coverage diagnostic · EC IDENTITY_* facts · **still 0 HTTP research** |
| ON does **not** | Set EXECUTE_RESEARCH · RUN_RATE_EXPERTS · Accept · CatalogWrite · F5 |
| Rollback | set false |
| Prod default after IMPLEMENT | Prefer **OFF** unless Owner GO says controlled ON for PV then OFF |

**Optional IMPLEMENT shape (not required new flag):** mirror P2 `ikAutoIngestEnabled` as AppSettings only if Owner GO demands Super Admin toggle — **default OFF**. Otherwise compile/host const flip under Owner GO IMPLEMENT is enough (REUSE P1 pattern). Prefer **one** lever: host const first; AppSettings only if PV needs reversible Super Admin control without redeploy.

---

## 7. REVIEW / NO_MATCH (LOCKED)

| Rule | |
|------|--|
| REVIEW ≠ ACCEPT | **Absolute** |
| NO_MATCH ≠ market absence | **Absolute** (P5.26 context) |
| NO_MATCH ≠ RESEARCH_FAILED | **Absolute** |
| NO_MATCH ≠ “product does not exist” | **Absolute** |
| Owner Review / REVIEW-9 | **Separate** · not auto · P5.26 frozen — do not run in P3 |

---

## 8. Category key boundary (LOCKED)

| Key | Status |
|-----|--------|
| flooring · repairs_wall · repairs_opening · joinery_finish | **LOCKED** (P5.31/32) |
| P3 creates new categoryKey? | **FORBIDDEN** |
| Need new key? | **GAP / future stage** — not P3 |

Classification/identity may **consume** existing routing evidence; must not invent keys.

---

## 9. Provenance / Truth (LOCKED)

Preserve:

- BOQ `sourceRef` / `lineProvenance` / sourceDocumentId  
- Classification evidence (`kind=classification`)  
- Identity evidence (mapper / alias / material exact / coverage status)  
- Internal catalog reference when trusted  
- Existing external source reference when already present  

**Forbidden:** synthetic sourceRef · LLM invent identity · marking NO_MATCH as price gap.

Missing evidence → REVIEW / NO_MATCH / GAP per tables above — not fake IDENTIFIED.

---

## 10. Unit safety (LOCKED)

No automatic `m²↔szt` · `mb↔szt` · `kg↔szt` without existing Owner-approved rule (e.g. P5.7 allowlist).  
Classification/identity must not “fix” units by guessing.

---

## 11. P3 OUTPUT (LOCKED)

Per eligible BOQ row:

```text
BOQ row (lineId, description, qty, unit, dwelling, branch, provenance)
+ plane + classify result
+ identityStatus (thin)
+ [optional] identity coverage line result + evidence
+ handoff flag
+ researchExecuted=false · pricingExecuted=false · autoAcceptExecuted=false
```

Aggregate report: counts · reconciliation · preservation flags · reasons[].

**This is input to future research stage — not execution.**

---

## 12. P4 / P5 boundary (LOCKED)

```text
P3 OUTPUT
  → (future Owner GO) research / Labor E2E / Material Phase2 / Chief / F5 / Bid

P3 MUST NOT:
  runIkMasterBoqLaborExpert / MaterialExpert with executeResearch true
  HTTP pricing
  Accept / CatalogWork / Bind
  F5 / Bid / Dual Outcome
```

---

## 13. Existing stack map

| COMPONENT | CURRENT ROLE | P3 ROLE | Verdict | RISK |
|-----------|--------------|---------|---------|------|
| `classifyEstimatorPricingPlane` | A1 SSOT | Core classify | **REUSE** | allow*Research bits |
| `ik-classification` | Orchestration | Core | **REUSE** | EC always-on when READY |
| `ik-identity-coverage` | P5.5 diagnostic | Coverage when lever ON | **REUSE** | Must stay gated |
| internal-first matcher | Exact/semantic | Evidence/safety | **REUSE** | Do not widen |
| host / domain safety | P5.26-E area | Safety | **REUSE** | LOCKED |
| category / PASS2 allowlists | P5.27–32 | Consume only | **UNTOUCHED** | Mutation = P0 |
| Document Expert / P2 BOQ | Input | Input | **REUSE** | GAP≠identity |
| Labor/Material experts | P4/P5 | **OUT** | KEEP OFF | R1 class |
| P5.26 CatalogWork | Locked catalog | **OUT** | UNTOUCHED | — |

---

## 14. Test design (future IMPLEMENT — do not run as research)

| ID | Case |
|----|------|
| A | READY BOQ → classify |
| B | PARTIAL → subset only |
| C | HOLD → STOP |
| D | GAP → STOP |
| E–H | LABOR / MATERIAL / COMPOUND / UNKNOWN |
| I–J | exact / semantic identity (coverage ON) |
| K | REVIEW / AMBIGUOUS |
| L | NO_MATCH / IDENTITY_GAP |
| M | unsafe semantic rejected (P5.26-E) |
| N–O | missing sourceRef / provenance → not verified IDENTIFIED |
| P | unit mismatch → no invent remap |
| Q–T | no HTTP · no research · no Accept · no CatalogWrite |
| U | P5.26 unchanged (471 / rates) |
| V | classification does not trigger research |
| W | IDENTITY_COVERAGE ON does not trigger research |

**Reuse:** `test-ik-migration-01-p3-classification.mjs` · `test-ik-migration-01-p55-identity-coverage.mjs` · domain/matcher/PASS2/RW-03 regression suites.

---

## 15. Regression safety (LOCKED)

| Guard / lock | P3 rule |
|--------------|---------|
| P1 EXECUTE_RESEARCH | **OFF** — never flip |
| P1 RUN_RATE_EXPERTS | **OFF** — never flip |
| P2 AUTO_INGEST | default OFF — P3 does not change |
| P3 IDENTITY_COVERAGE | default OFF — sole P3 flip |
| P5.26–32 | zero mutation |

---

## 16. Risk matrix (LOCKED awareness)

| ID | Sev | Risk | Mitigation |
|----|-----|------|------------|
| R-P3-01 | **P0** | Classification triggers research | Experts + EXECUTE_RESEARCH stay OFF; allow* bits ≠ GO |
| R-P3-02 | **P0** | Identity triggers HTTP/write | Coverage diagnostic only; no Accept/CatalogWrite |
| R-P3-03 | **P1** | Classify/identity conflation | Layers thin vs coverage explicit |
| R-P3-04 | **P1** | REVIEW → ACCEPT leak | Absolute ban |
| R-P3-05 | **P1** | NO_MATCH as market absence | Truth AD-IK-P3-09 |
| R-P3-06 | **P1** | P5.26 mutation | Zero write |
| R-P3-07 | **P2** | Provenance loss | Preservation asserts |
| R-P3-08 | **P2** | Unit mutation | Forbid guess remap |
| R-P3-09 | **P2** | PARTIAL as full READY | Subset eligibility |
| R-P3-10 | **P2** | GAP as valid identity | STOP |

---

## 17. Owner decisions (this freeze)

| # | Topic | Decision |
|---|--------|----------|
| 1 | Classification trigger | IK ON + Master BOQ READY/eligible PARTIAL · A1 sync · no new classify flag |
| 2 | IDENTITY_COVERAGE trigger | Sole P3 IMPLEMENT lever · default OFF · ON ≠ research |
| 3 | READY/PARTIAL | READY in · PARTIAL subset · HOLD/GAP STOP |
| 4 | Identity output | Existing thin + coverage enums · audit aliases map only |
| 5 | REVIEW | ≠ ACCEPT · no auto Owner Review run |
| 6 | NO_MATCH | ≠ market absence / RESEARCH_FAILED |
| 7 | Category keys | No create · P5.31/32 locked |
| 8 | P4/P5 handoff | Output only · no auto execution |

**No CHATGPT_ESCALATION** — consistent with parent DF + P3 audit.

---

## 18. Implementation plan (minimal — future Owner GO IMPLEMENT)

| Phase | Work |
|-------|------|
| **A** | REUSE classification (harden EC policy only if needed) |
| **B** | Controlled P3 trigger docs → code: IDENTITY_COVERAGE flip path |
| **C** | Identity seam (thin always with classify; coverage behind guard) |
| **D** | Identity coverage guard default OFF · rollback |
| **E** | Handoff flags on output · EC facts |
| **F** | Tests A–W (reuse suites) + P0/P1/P2/P5.26–32 regression |
| **G** | Production Verify · IDENTITY_COVERAGE default OFF · STOP before P4 |

**Do not** build new engines · **do not** invent P5.33.

---

## 19. Execution integrity (this document)

```text
CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
EDGE = 0
COMMIT = 0
PUSH = 0
```

---

## 20. Final verdict

```text
P3 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P3 OWNER GO
STOP

NIE IMPLEMENTUJ
NIE URUCHAMIAJ IDENTITY_COVERAGE
NIE URUCHAMIAJ RESEARCH
NIE PRZECHODŹ DO P4
```
