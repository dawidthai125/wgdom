# IK-MIGRATION-01 — P5 AUDIT ONLY  
## Formal Labor E2E (post–P4 Chief Wiring)

> **ID:** `IK-MIGRATION-01-P5-AUDIT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — **AUDIT ONLY**  
> **Mode:** READ-ONLY · **CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0**  
> **JSON:** `.tmp/p5-audit.json`  
> **Baseline:** P0–P4 **PRODUCTION VERIFIED** · P4 impl **`d38f97cd`** · live tip **2.66.81** / **`5276083`** · P4 tests **58/58**  
> **P5.26:** LOCKED @ **`1d41f619`** · CatalogWork **471** · REVIEW-9 frozen · **DO NOT RE-RUN**  
> **P5.33:** **DO NOT CREATE**  
> **Parent SSOT:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md)

```text
THIS IS AUDIT ONLY.
NO P5 PLAN · NO IMPLEMENT · NO RESEARCH · NO HTTP · NO ACCEPT · NO CatalogWork.
```

---

## FINAL VERDICT

```text
FORMAL STATUS = READY_FOR_PLAN

P5 FORMAL SCOPE = LABOR E2E (Owner-locked · P4 DF 2026-08-16)
P5 UNDER IK HOST = NOT STARTED (RUN_RATE_EXPERTS / EXECUTE_RESEARCH hard OFF)
LABOR LIBRARY STACK = SUBSTANTIALLY IMPLEMENTED (legacy “P4 Labor” label)
P5.26 = LOCKED REUSE BASELINE · CatalogWork 471 UNTOUCHED
P5.33 = DO NOT CREATE

NO CHATGPT_ESCALATION — phase numbering conflict already Owner-resolved
(Truth Gates / P4-LABOR* = LEGACY; do not override P4=Chief · P5=Labor)

STOP — await Owner GO for P5 PLAN (+ DESIGN FREEZE). Do not auto-PLAN.
```

> **Follow-up (2026-08-16):** P5 PLAN + DESIGN FREEZE = **COMPLETE** → [`IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md) · **READY FOR P5 OWNER GO** · IMPLEMENT still **NOT STARTED**.

---

## 1. P5 FORMAL SCOPE

### 1.1 Owner-locked phase map (authoritative)

| Phase | Meaning |
|-------|---------|
| P4 | **Chief Wiring** · LOCKED / PRODUCTION VERIFIED |
| **P5** | **Labor E2E** |
| P6 | Material E2E |
| P7 | Position Cost → Bid |

**Source:** [`IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md) §0 · parent DF §5.

### 1.2 What “Labor E2E” formally includes (pipeline)

```text
INPUT (Master BOQ READY + P3 classification/identity + Catalog OUR RATE)
  → CURRENT / MISS (lookupWorkRate)
  → internal-first (REUSE P5.26-E matcher — see GAP: not yet in Master BOQ Labor Expert)
  → research eligibility (LABOR plane · identity OK · MISS/STALE)
  → selective research (runIkLaborGapResearch → runSelectiveWorkRateResearch)
  → candidate (WorkRateResearchCandidate · Owner Accept REQUIRED)
  → Owner Review
  → Accept (acceptIkLaborResearchAndNotify / acceptWorkRateResearchCandidate)
  → CatalogWork create/bind ONLY when identity missing & Owner GO (REUSE P5.26 patterns; do not mutate 471 blindly)
  → Write OUR RATE (saveWorkCatalogRouted)
  → VERIFY
  → STOP
```

### 1.3 IN / OUT

| IN P5 | OUT of P5 |
|-------|-----------|
| Labor CURRENT / MISS | Material E2E (P6) |
| Selective labor research (controlled) | Chief Wiring changes (P4 LOCKED) |
| Candidate → Owner Accept → OUR RATE | F5 / Bid (P7) |
| EC labor facts + sourceRef | Dual Outcome / D flip |
| REUSE P5.26–32 mechanisms | P5.33 · new category keys |
| Unit / provenance / Accept safety | AUTO-ACCEPT · invent evidence |

### 1.4 Legacy label debt (do not re-escalate)

| Artifact | Label | Treat as |
|----------|-------|----------|
| `IK-MIGRATION-01-P4-LABOR-EXPERT.md` | “P4 Labor” | **LEGACY** Labor library docs |
| `ik-labor-expert.ts` header “P4” | historical | **P5 library** |
| `test-ik-migration-01-p4-labor-expert.mjs` | filename P4 | **P5 regression** (per P4 DF) |
| `IK-MIGRATION-01-E2E-TRUTH-GATES.md` rows P4/P5 | old map | **STALE numbering** — Owner demoted |
| `test-ik-migration-01-p5-material-expert.mjs` | “P5 Material” | **formal P6** debt |

---

## 2. P4 → P5 SEAM

### 2.1 P4 STOP contract (locked)

```text
P4 → Chief session + Cost/Offer facts + EC + provenance
  → STOP
  ≠ auto-start Labor
  ≠ Cost BLOCKED → research
```

### 2.2 What P5 actually consumes (existing — no new DTO invent)

P5 Labor Expert **does not** take Chief T1–T6 session as primary DTO.

| Input | Producer | File / type | Role in P5 |
|-------|----------|-------------|------------|
| Master BOQ READY | P2 Document Expert | `IkDocumentExpertReport.masterBoq` | **Hard gate** (`readyForExperts`) |
| Master lines + provenance | P2 / Multi-BOQ | `masterBoqLines[]` + `DwellingLineProvenance` | Line coverage |
| Classification plane | P3 / A1 | `classifyEstimatorPricingPlane` | LABOR-only research |
| Work identity | Product Mapper + shadow | `mapOfferBoqLine` · `resolveWorkIdentityFromOfferBoqLine` | Research eligibility |
| Catalog OUR RATE | Work Catalog KV | `lookupWorkRate` | CURRENT vs MISS |
| pricingReady / OfferBoq | Pipeline | Tender pricing state | Context / EC — **not** research trigger alone |
| Chief Cost/Offer facts | P4 | EC / dossier | **Optional EC context** · **not** research input · Cost BLOCKED ≠ research |

### 2.3 Seam rule (audit conclusion)

```text
P4→P5 handoff = shared Master BOQ + P3 identity/classify STOP boundary
               + explicit Owner GO / enable for Labor under IK
               ≠ Chief session object pipe
               ≠ P4 enable implies P5 enable
```

**Existing contract to REUSE:** `runIkMasterBoqLaborExpert({ item, package, expert, executeResearch })` · host today forces `executeResearch: false` and `RUN_RATE_EXPERTS: false`.

---

## 3. LABOR STACK (FILE · FUNCTION · STATUS · P5 ROLE)

| Mechanism | File | Function | Status | P5 role |
|-----------|------|----------|--------|---------|
| Labor orchestration | `src/lib/intelligent-estimator/ik-labor-expert.ts` | `runIkMasterBoqLaborExpert` | **IMPLEMENTED** | Core E2E driver |
| Identity map | `tender-offer-boq-mapping.ts` | `mapOfferBoqLine` | STABLE | REUSE |
| Shadow identity | `boq-shadow-adapter.ts` | `resolveWorkIdentityFromOfferBoqLine` | STABLE | REUSE |
| Plane gate | `classification-gate.ts` | `classifyEstimatorPricingPlane` | STABLE | LABOR-only |
| CURRENT/MISS | `work-rate-lookup.ts` | `lookupWorkRate` | STABLE | CURRENT path |
| Research bridge | `labor-research-bridge.ts` | `runIkLaborGapResearch` | STABLE | Selective research |
| Selective research | `work-rate-research.ts` | `runSelectiveWorkRateResearch` | STABLE | HTTP/cache path |
| Accept | `work-rate-accept.ts` · bridge | `acceptWorkRateResearchCandidate` · `acceptIkLaborResearchAndNotify` | STABLE | Owner Accept only |
| Persist | `catalog-write-router.ts` | `saveWorkCatalogRouted` | STABLE | Write after Accept |
| Host wire | `IkEntryHost.tsx` | `IK_ENTRY_SHELL_RUN_RATE_EXPERTS` / `EXECUTE_RESEARCH` | **HARD OFF** | P5 enable GAP |
| Internal-first | `internal-first-semantic-match.ts` | `lookupInternalFirst` | STABLE (P5.26-E) | **GAP:** used in batch runners, **not** inside `runIkMasterBoqLaborExpert` |
| Host safety | `internal-first-host-safety.ts` | `hostObjectSafetyGate` | STABLE | REUSE when internal-first wired |
| Owner Knowledge whitelist | `internal-first-semantic-match.ts` | MEDIUM equivalence helpers | PARTIAL | REUSE · **no new rules in AUDIT** |
| EC labor facts | `ik-entry-conversation.ts` | labor section builders | PRESENT | REUSE when expert runs |
| Truth | `ik-conversation-event.ts` | `canPresentAsVerifiedFact` · `enforceIkConversationTruth` | STABLE | REUSE |
| Category allowlist | `work-rate-discovery-allowlist.ts` | PASS2 keys | LOCKED P5.31/32 | REUSE · no new keys |
| Edge fetch | `make-server-0afb8820` | work-rate selective lookup | LIVE | HTTP path (do not call in AUDIT) |

### Critical API default

```text
runIkMasterBoqLaborExpert: executeResearch defaults to TRUE (opts.executeResearch !== false)
IkEntryHost today: forces false + RUN_RATE_EXPERTS false
P5 PLAN MUST keep explicit false unless Owner-controlled research ON
```

---

## 4. P5.26 REUSE MAP (LOCKED — not backlog)

| Asset | Reuse in P5? | Rule |
|-------|--------------|------|
| CatalogWork **471** | **REUSE rates** | **NO** mutation of accepted 9/9 · **NO** auto CREATE |
| REVIEW-9 frozen | Leave frozen | **NO** Accept without new Owner GO |
| Internal-first matcher + host safety | **YES** | Wire intentionally in PLAN if Master BOQ path needs it |
| Owner Knowledge examples (wykucie, PCW, skraplacz, otulina, RCD, skrzydła…) | **YES if already in code/SSOT** | **NO** new Owner Rules in AUDIT/PLAN invent |
| Category keys flooring / repairs_* / joinery_finish | **YES** | P5.31/32 LOCKED |
| PASS2 Edge parity | **YES** | P5.32 fix landed · residual PARSER_EMPTY semantics remain |
| Batch Accept campaign mechanics | Pattern only | Formal P5 ≠ re-run P5.26 |

---

## 5. RESEARCH BOUNDARY

### When `EXECUTE_RESEARCH` may be true (SSOT-aligned)

Only when **all** hold:

1. Formal **P5 Owner GO IMPLEMENT** + controlled enable (TBD in PLAN; today host const OFF)  
2. `ikEntryEnabled` ON (IK path)  
3. Master BOQ `readyForExperts`  
4. Per line: identity OK · plane **LABOR** · OUR RATE **MISS** or **STALE**  
5. Deduped `workId|unit` · session busy / cooldown respected  
6. Legal gate + classification gate PASS  

**Must stay false:** P4 path · IK OFF · NON_LABOR / UNKNOWN / UNRESOLVED · Material · Cost BLOCKED fallback · PARSER_EMPTY misread as “no market price”.

### When `RUN_RATE_EXPERTS` may be true

Host-level switch to **invoke** `runIkMasterBoqLaborExpert` (and Material — **P6**, must stay decoupled).  
Today: `IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false` (compile-time).  
P5 PLAN should prefer **Labor-specific** enable over flipping shared experts flag that also arms Material (P0 risk — see risks).

### Permissions / routing / budget (existing)

| Control | Location | Notes |
|---------|----------|-------|
| Classification gate | `work-rate-research` BLOCKED | LABOR plane |
| Legal gate | `WORK_RATE_LEGAL_GATE` | Sources allowlist |
| Category / PASS2 | allowlist + Edge map | P5.31/32 |
| Cooldown / single-flight | research + session dedupe | Present |
| EMPTY streak → CKM | P5.32 RCA | Residual routing limit |
| Budget | selective ONE-work | Not mass invent |

---

## 6. HTTP PATHS (AUDIT — zero requests)

```text
ENTRY: runIkLaborGapResearch
  → runSelectiveWorkRateResearch
    → getDefaultWorkRateLookupPort() = Edge selective work-rate fetch
      → allowlisted hosts: kb_pl · sccot · extradom · cennikremontow_pl
      → PASS1 canonical URL and/or PASS2 category URL (flooring, repairs_wall, repairs_opening, joinery_finish, …)
    → parser / identity filter (namesLooselyMatch*)
    → CANDIDATE | GAP | COOLDOWN | BLOCKED | REUSE
```

**Material DIY** (`mmr-diy-selective-lookup`) = **P6** — out of P5.

### Known residual issues (docs — not assumed fixed)

| Issue | Source | Current status |
|-------|--------|----------------|
| SOURCE_EMPTY_PATTERN / PASS1-only | P5.26-F RCA | Mitigated by P5.26-FIX / P5.31 PASS2 — **semantics still:** empty ≠ market absence |
| PARSER_EMPTY | P5.32-G | **OPEN residual** — identity/query mismatch on live pages |
| QUERY_TOO_NARROW | P5.32-G | Residual |
| CATEGORY_IDENTITY_MISMATCH | P5.32-G | Residual |
| CKM_ROUTING_LIMIT | P5.32-G | Expected after streak on hosts without PASS2 |

---

## 7. CATEGORY ROUTING

| Key | Status | Local SSOT | Edge |
|-----|--------|------------|------|
| `flooring` | LOCKED | allowlist | synced (P5.32) |
| `repairs_wall` | LOCKED | allowlist | synced |
| `repairs_opening` | LOCKED | allowlist | synced |
| `joinery_finish` | LOCKED | allowlist | synced |

**AUDIT:** no new keys · no Edge deploy · parity tests exist (`test-ik-migration-01-p532-fix-edge-category-route-parity.mjs`).

---

## 8. CANDIDATE SEMANTICS (do not change)

| Status / label | Meaning | Must NOT mean |
|----------------|---------|---------------|
| CURRENT / REUSE | OUR RATE hit | — |
| MISS / STALE | needs research eligibility | market absence |
| CANDIDATE | Owner Accept required | auto OUR RATE |
| RESEARCH_GAP | research finished without usable candidate | “no price on market” |
| NO_MATCH / PARSER_EMPTY / SOURCE_NO_MATCH | extraction/identity miss | market absence |
| REVIEW | Owner pending | ACCEPT |
| HIGH / MEDIUM / LOW | identity / internal-first confidence (mapping & matcher) | auto-Accept tiers |
| `lowSample` on candidate | sample warning | invent |

**CRITICAL (carry from P4 DF):** REVIEW ≠ ACCEPT · NO_MATCH ≠ market absence · GAP ≠ price absence · PARSER_EMPTY ≠ market absence.

---

## 9. ACCEPT BOUNDARY

```text
CANDIDATE
  → Owner Review (human)
  → acceptWorkRateResearchCandidate / acceptIkLaborResearchAndNotify
  → saveWorkCatalogRouted (OUR RATE write)
  → notify only if persist OK
```

| Rule | Evidence |
|------|----------|
| ZERO auto-Accept in Labor Expert | `autoAcceptExecuted = false` · counts `acceptedOurRate` not auto |
| Accept API never silent write | `work-rate-accept.ts` Owner Accept contract |
| Who Accepts | Owner / Super Admin workflow (existing Accept UI / scripts) — **not** IK auto |
| CatalogWork CREATE/BIND | Separate Owner-gated path (P5.26 pattern) — **not** research side effect |
| Bind existing rate | REUSE · must not silently overwrite accepted rates |

---

## 10. UNIT SAFETY

| Topic | Status |
|-------|--------|
| Units `szt` `m²` `mb` `kg` `kpl` `pkt` | Normalized via `normalizeWgdomCostUnit` / identity unit |
| Auto remap m²↔szt etc. | **FORBIDDEN** without explicit existing rule |
| Owner Knowledge 300/szt vs BOQ m² | **REVIEW / BLOCKED** — not auto convert |
| P5.57 unit semantics tests | Exist — REUSE in future matrix |

---

## 11. PROVENANCE / SOURCE

| Layer | Preserve |
|-------|----------|
| BOQ | `lineProvenance` · `sourceDocumentId` · `sourceLineKey` |
| Research | observations · discoveryMethods PASS1/PASS2 · regionScope · sampleSize |
| Accept | marketBaseRatePln SSOT · not display SELL as OUR RATE (P5.16-B) |
| EC | `IkConversationEvent` + `sourceRef` · `canPresentAsVerifiedFact` |

Missing `sourceRef` → **not** verified fact.

---

## 12. SAFETY (report only)

| Gate | Status |
|------|--------|
| Host object safety (malowanie / grzejnik / wykucie / zaprawianie) | Present in `hostObjectSafetyGate` |
| Domain LABOR / PACKAGE / MATERIAL separation | `internal-first-domain.ts` |
| Matcher regression | Covered by `test-ik-migration-01-p526e-matcher-safety.mjs` |
| P4 Chief → Labor leak | Host OFF + P4 DF forbid bridges |

**No matcher changes in this AUDIT.**

---

## 13. SIDE EFFECT AUDIT

| Step | Writes KV? | CatalogWork CREATE? | Accept without Owner? | Mutate existing rate? |
|------|------------|---------------------|-----------------------|------------------------|
| Research | **No** (session dedupe ephemeral; evidence via candidate) | No | No | No |
| Candidate | No | No | No | No |
| Accept | **Yes** OUR RATE via catalog save | No (rate write ≠ CREATE work) | **No** | Updates OUR RATE for that workId+unit only after Owner Accept |
| CatalogWork CREATE/BIND | Yes (Owner campaign) | Yes when GO | No | Bind may attach; must not clobber locked accepts |
| P5 under IK today | **0** (experts OFF) | 0 | 0 | 0 |

---

## 14. P5.26 LOCK INTEGRITY

```text
CatalogWork = 471 · ACCEPTED 9/9 unchanged · REVIEW-9 frozen
P5 MUST REUSE rates · MUST NOT auto-modify accepted · MUST NOT invent P5.33
```

---

## 15. TEST COVERAGE (existing — not modified)

| Test | Role | P5 coverage |
|------|------|-------------|
| `test-ik-migration-01-p4-labor-expert.mjs` | Labor Expert harness | **Core** (legacy name) |
| `test-ik-migration-01-p4-real-labor.mjs` | Real labor probe harness | Partial |
| `test-ik-e2e-wire-w2-labor-two-pass.mjs` | W2 bridge | Research bridge |
| `test-ik-labor-expert-rec-01.mjs` | RO recommendation | Candidate rec |
| `test-work-rate-selective-research-02.mjs` | Selective research | HTTP/cache contract |
| `test-ie-labor-selective-research-identity-ready-wave-1.mjs` | Identity-ready wave | Identity |
| `test-ik-migration-01-p526e-matcher-safety.mjs` | Internal-first safety | Matcher |
| `test-ik-migration-01-p526-fix-category-pass2.mjs` | PASS2 category | Routing |
| `test-ik-migration-01-p527-*.mjs` | Category reuse | Routing |
| `test-ik-migration-01-p531-*.mjs` | Key create route | Keys LOCKED |
| `test-ik-migration-01-p532-*.mjs` | Edge parity | Routing |
| `test-ik-migration-01-p4-implementation.mjs` | P4 Chief | **Regression** Z |
| `test-ik-migration-01-p3-implementation.mjs` | P3 | Regression AA |
| `test-ik-migration-01-p2-implementation.mjs` | P2 | Regression AB |
| `test-ik-migration-01-p5-material-expert.mjs` | Material | **P6** · not P5 |

**GAP:** no dedicated `test-ik-migration-01-p5-labor-e2e.mjs` under formal P5 name; matrix below for PLAN.

---

## 16. P5 TEST MATRIX — AUDIT DESIGN (future PLAN only)

| ID | Case |
|----|------|
| A | P4 valid STOP · no auto Labor |
| B | LABOR CURRENT · 0 HTTP |
| C | LABOR MISS |
| D | internal exact |
| E | internal semantic SAFE |
| F | internal semantic REVIEW |
| G | NO_INTERNAL_MATCH |
| H | Owner Knowledge REUSE |
| I | research eligible |
| J | research blocked |
| K | HTTP success → candidate |
| L | PARSER_EMPTY ≠ market absence |
| M | SOURCE_NO_MATCH semantics |
| N–P | candidate confidence / sample |
| Q | REVIEW |
| R | Owner ACCEPT |
| S–U | CatalogWork / Bind / Write (Owner-gated) |
| V | provenance / sourceRef |
| W | unit safety |
| X | no AUTO-ACCEPT |
| Y | P5.26 Catalog 471 unchanged |
| Z | P4 regression |
| AA | P3 regression |
| AB | P2 regression |

---

## 17. RISK MATRIX

| ID | Sev | Risk | Mitigation for PLAN |
|----|-----|------|---------------------|
| R-P5-01 | **P0** | Shared `RUN_RATE_EXPERTS` also starts Material (P6) | Labor-specific enable · keep Material OFF |
| R-P5-02 | **P0** | `executeResearch` default **true** | Explicit false unless controlled ON |
| R-P5-03 | **P0** | AUTO-ACCEPT / silent Catalog write | Keep Accept Owner-only · tests X |
| R-P5-04 | **P0** | P5.26 accepted rates mutated | Lock 471 · REUSE only |
| R-P5-05 | **P1** | Internal-first not in Master BOQ Labor Expert | PLAN wire or conscious OUT |
| R-P5-06 | **P1** | PARSER_EMPTY treated as market absence | Semantics lock · Owner Review |
| R-P5-07 | **P1** | P4 Cost BLOCKED → Labor research | Forbidden (P4 DF) |
| R-P5-08 | **P1** | Unit remap via Owner Knowledge PLN/szt | REVIEW/BLOCKED |
| R-P5-09 | **P2** | Stale Truth Gates / P4-LABOR docs confuse agents | Annotate in PLAN · no renumber Labor→P4 |
| R-P5-10 | **P2** | CKM streak → uninformative GAP | Telemetry / Owner Review |
| R-P5-11 | **P2** | Duplicate Labor engine invent | REUSE FIRST |
| R-P5-12 | **P3** | Mobile physical still NOT VERIFIED (P4) | PV later |

---

## 18. OWNER KNOWLEDGE (audit stance)

Known examples (wykucie drzwi 70–100, PCW Ø50/Ø100, skraplacz=kondensat, skrzydła 300/szt, otulina Ø20, RCD Type A 300 PLN) — **REUSE if present in SSOT/code**; **do not invent** new Owner Rules in AUDIT. Missing mappings → **OWNER REVIEW / GAP** in PLAN.

---

## 19. FORMAL STATUS RATIONALE

| Candidate | Why not / why |
|-----------|----------------|
| ALREADY_IMPLEMENTED | Library + historical Labor path exist, but **formal P5 under IK** (controlled enable, research boundary, internal-first seam, Accept E2E under migration) **NOT STARTED** |
| BLOCKED | No P0 undecided Owner conflict remaining |
| UNDEFINED_SCOPE | Scope clear: Labor E2E |
| CHATGPT_ESCALATION_REQUIRED | Numbering conflict **already Owner-resolved** (2026-08-16) |
| **READY_FOR_PLAN** | Scope clear · P4→P5 seam clear · stack REUSE-able · residual risks are PLAN inputs |

---

## 20. INTEGRITY

```text
CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
EDGE DEPLOY = 0
COMMIT = 0
PUSH = 0
P5 PLAN = NOT CREATED
```

---

## 21. HARD STOP

```text
P5 AUDIT = COMPLETE
FORMAL STATUS = READY_FOR_PLAN

P4 = PRODUCTION VERIFIED / LOCKED
P5 = NOT STARTED
P5.26 = LOCKED · CatalogWork 471
P5.33 = DO NOT CREATE

NIE twórz P5 Plan automatycznie.
NIE implementuj.
NIE research / HTTP / Accept / CatalogWork / Bind / Write.
NIE commit / push.

STOP — await Owner GO → P5 PLAN + DESIGN FREEZE.
```
