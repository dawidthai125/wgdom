# IK-MIGRATION-01 — P4 AUDIT ONLY

> **ID:** `IK-MIGRATION-01-P4-AUDIT`  
> **Date:** 2026-08-16  
> **Mode:** **AUDIT ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p4-audit.json`  
> **Owner GO:** TAK — AUDIT ONLY (no Plan / no Design Freeze / no IMPLEMENT)  
> **Baseline:** P0–P3 **PRODUCTION VERIFIED** · P3 impl **`350e81e6`** · live tip **2.66.80 / `ad6273b`** · P5.26 LOCKED @ `1d41f619` · CatalogWork **471** · P5.33 **DO NOT CREATE**

---

## FINAL VERDICT

```text
CHATGPT_ESCALATION_REQUIRED  →  RESOLVED (Owner Decision 2026-08-16)

RESOLUTION:
  Formal P4 = Chief Wiring
  Formal P5 = Labor E2E
  Formal P6 = Material E2E
  Historical P4-Labor / Truth Gates Labor-as-P4 = LEGACY LABEL

NEXT:
  P4 PLAN + DESIGN FREEZE = COMPLETE
  → docs/architecture/IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md
  READY FOR P4 OWNER GO (IMPLEMENT not started)
```

**Supersedes prior escalation block for phase-label conflict.**  
Historical audit sections below retained as evidence.

**Not chosen:**

| Verdict | Why not |
|---------|---------|
| `ALREADY_IMPLEMENTED` | Formal Chief-under-`ikEntryEnabled` **not** wired; Labor stack landed historically but OFF in IK host and numbered as P5 in parent DF |
| `READY_FOR_PLAN` | Scope **not uniquely** clear across SSOT (conflict blocks PLAN without escalation) |
| `BLOCKED` | No single agreed scope to block against |
| `UNDEFINED_SCOPE` | Scope **is** defined — but **twice**, inconsistently |

---

## 1. P4 FORMAL SCOPE (from SSOT — both readings)

### Reading A — Parent / P0 (authoritative phase list)

**Sources:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §5 · [`IK-MIGRATION-01-P0-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P0-DESIGN-FREEZE.md) §0 · [`IK-MIGRATION-01-P3-AUDIT.md`](./IK-MIGRATION-01-P3-AUDIT.md) §10

| | |
|--|--|
| **Cel** | Chief scoped start (T1–T6) when IK Entry ON · **bez** Dual Outcome / bez flip `expertAiDecydentEnabled` |
| **Wejście** | IK Entry active · pipeline/dossier facts · (downstream) classified lines available as conversation facts |
| **Wyjście** | Chief session / dossier facts in EC · **not** research HTTP · **not** Accept |
| **Start** | After P3 handoff STOP · Owner GO P4 |
| **Koniec** | Chief wiring usable under IK · Dual Outcome remains on D |
| **P3→P4** | Classification + identity + handoff flags → Chief may consume facts |
| **P4→NEXT** | **P5** = Labor E2E (CURRENT / MISS / research / Candidate / Owner Accept) |

Parent DF quote (§4–5 / P0 list):

```text
P4  Chief Wiring
P5  Labor E2E
…
Chief session: useChiefOrchestratorSession({ enabled: ikEntryEnabled && item })
  WITHOUT changing isExpertAiRuntimeEffective()
```

### Reading B — Truth Gates / historical Labor docs

**Sources:** [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md) §3 · [`IK-MIGRATION-01-P4-LABOR-EXPERT.md`](./IK-MIGRATION-01-P4-LABOR-EXPERT.md) · [`IK-MIGRATION-01-P4-REAL-LABOR.md`](./IK-MIGRATION-01-P4-REAL-LABOR.md)

| | |
|--|--|
| **Cel** | Labor Expert: identity → `lookupWorkRate` → research LABOR+MISS → Candidate · Owner Accept REQUIRED |
| **Wejście** | Master BOQ READY + classification LABOR + trusted identity |
| **Wyjście** | CURRENT HIT / RESEARCH_GAP / CANDIDATE · **zero auto-Accept** |
| **Start** | After P3 classify/identity |
| **Koniec** | Candidate / Owner Accept required (Accept = separate) |
| **P4→NEXT** | Material (historical P5/P6) · F5/Bid later |

**Conflict:** same label **P4** = Chief **xor** Labor Expert.

---

## 2. P3 → P4 SEAM (contract — unchanged)

From [`IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md) §11–12 · P3 PV:

```text
P3 OUTPUT (per eligible row):
  BOQ row (lineId, description, qty, unit, dwelling, branch, provenance)
  + plane (LABOR|MATERIAL|COMPOUND|UNKNOWN) + classify evidence
  + identityStatus (thin) / optional coverage line + evidence
  + handoff flag
  + researchExecuted=false · pricingExecuted=false · autoAcceptExecuted=false
→ STOP
```

| Status (audit aliases → SSOT) | Meaning for downstream |
|-------------------------------|------------------------|
| IDENTIFIED | TRUSTED_* / HAS_WORK_ID / HAS_MATERIAL_KEY — **not** price |
| REVIEW | AMBIGUOUS / OWNER_MAPPING_POSSIBLE / WORK_ID_NO_OWNER_SEED — **≠ ACCEPT** |
| NO_MATCH | MISSING_IDENTITY / IDENTITY_GAP — **≠ market absence** |
| GAP | P2 HOLD/GAP stop or NON_COST — **≠ price absence** |

P3 **must not** be reinterpreted by any next stage as price miss.

---

## 3. EXISTING STACK (REUSE map)

| COMPONENT | FILE | FUNCTION / HOOK | CURRENT ROLE | Candidate P4 ROLE (A=Chief / B=Labor) | REUSE / ADAPT / GAP | RISK |
|-----------|------|-----------------|--------------|----------------------------------------|---------------------|------|
| Chief session hook | `useChiefOrchestratorSession.ts` | hook | Runs when `isChiefSessionStackEnabled(expertEffective)` | **A:** enable via `ikEntryEnabled` | **ADAPT** wiring | **P0** if flips D |
| Chief stack flag | `tender-expert-effective.ts` | `isChiefSessionStackEnabled` | Tied to Expert/D path today | **A:** IK-scoped enable | **ADAPT** | Couples to Dual Outcome if wrong |
| Chief LS flag | `chief-session/flag.ts` | `isChiefOrchestratorSessionEnabled` | Separate session enable | Keep | **REUSE** | — |
| Chief orchestrator | `src/lib/chief-orchestrator/*` | `runChiefOrchestrator` | Closed epic stack | **A:** REUSE | **REUSE** | Scope creep to Bid |
| Labor Expert | `ik-labor-expert.ts` | `runIkMasterBoqLaborExpert` | Landed; host gated OFF | **B / formal P5** | **REUSE** | Default `executeResearch !== false` → **HTTP if called** |
| Labor research bridge | `labor-research-bridge.ts` | `runIkLaborGapResearch` | Selective research | **B / P5** | **REUSE** | HTTP |
| Work rate lookup | `work-rate-lookup.ts` | `lookupWorkRate` | CURRENT/MISS 0 HTTP | **B / P5** | **REUSE** | — |
| Work rate Accept | `work-rate-accept.ts` | `acceptWorkRateResearchCandidate` | Catalog write | **OUT of auto P4** | **REUSE Owner-only** | CatalogWork mutation |
| Material Expert | `ik-material-expert.ts` | `runIkMasterBoqMaterialExpert` | Landed; host gated OFF | Formal **P6** | **REUSE later** | HTTP DIY |
| Classification | `ik-classification.ts` | `runIkMasterBoqClassification` | P3 COMPLETE | Input only | **REUSE** | — |
| Identity coverage | `ik-identity-coverage.ts` | `runIkMasterBoqIdentityCoverage` | P3 lever OFF default | Input / evidence | **REUSE** | ON ≠ research (guarded) |
| IkEntryHost | `IkEntryHost.tsx` | host | P1–P3 + experts **hard OFF** | Seam for A or B | **ADAPT** | Flip `RUN_RATE_EXPERTS` / `EXECUTE_RESEARCH` = leak |
| EC conversation | `ik-entry-conversation.ts` | `buildIkEntryConversationViewModel` | Facts for classify/labor/identity | Present facts | **REUSE** | Labor events if report passed |
| Category routing | P5.27/31/32 | allowlists / keys | LOCKED | Consume only | **REUSE** | New keys FORBIDDEN |
| F5 / Bid | position-cost / bid | engines | Later phases | **OUT** | KEEP | Auto F5 = P0 |
| P5.26 CatalogWork | catalog store | — | LOCKED 471 | **OUT** | UNTOUCHED | Accept path |

---

## 4. SIDE EFFECT AUDIT (potential — not executed)

| TRIGGER | FUNCTION | SIDE EFFECT | Notes |
|---------|----------|-------------|-------|
| `RUN_RATE_EXPERTS=true` in host | `runIkMasterBoqLaborExpert` | May call research | Host still passes `executeResearch: IK_ENTRY_SHELL_EXECUTE_RESEARCH` (**false**) — dual gate today |
| Labor expert default API | `executeResearch !== false` | **HTTP research** if caller omits `false` | **P0 RISK** if future wire forgets arg |
| Accept candidate | `acceptWorkRateResearchCandidate` | **CatalogWork / OUR RATE write** | Owner-only; P5.26 lock |
| Material expert + research | DIY adapters | **HTTP** | P6 |
| Chief session ON via D | `useChiefOrchestratorSession` | Orchestration / dossier | Not CatalogWrite; Dual Outcome coupling |
| Identity coverage ON | `runIkMasterBoqIdentityCoverage` | Diagnostic only · `researchExecuted:!1` · `seedCreated:0` | P3 proven |

**No HTTP / Accept / CatalogWrite executed in this AUDIT.**

---

## 5. RESEARCH BOUNDARY

| Question | Answer from SSOT |
|----------|------------------|
| Does **formal P4 (Chief)** open `EXECUTE_RESEARCH`? | **NO** — research is **P5 Labor** (parent DF) |
| Does **historical “P4 Labor”** open research? | **YES** — LABOR + MISS only · Accept separate |
| Current prod IK host | `EXECUTE_RESEARCH=false` · `RUN_RATE_EXPERTS=false` · identity coverage default OFF |

**P3 identity / IDENTITY_COVERAGE must never imply research** (P3 PV PASS). Any P4 Plan must keep that invariant.

---

## 6. REVIEW BOUNDARY

| Rule | Status |
|------|--------|
| REVIEW ≠ ACCEPT | **LOCKED** (P3 DF · Labor Accept Owner-only) |
| P3 REVIEW → auto ACCEPT | **FORBIDDEN** |
| P5.26 REVIEW-9 | **FROZEN** — not P4 backlog |

---

## 7. PROVENANCE / UNIT / CATEGORY / P5.26

| Topic | Audit finding |
|-------|---------------|
| Provenance | P3 preserves BOQ sourceRef + classify/identity evidence; next stage must not invent |
| Unit safety | No auto m²↔szt / mb↔szt invent; P5.7 allowlist only where already confirmed |
| Category keys | `flooring` · `repairs_wall` · `repairs_opening` · `joinery_finish` **LOCKED**; P4 must not create keys |
| P5.26 | CatalogWork **471** · rates UNCHANGED · not open P4 backlog · Accept/research **OUT** of this audit |

---

## 8. P4 OUTPUT (depends on reading)

| Reading | Output ends at | Accept / CatalogWrite / F5 / Bid |
|---------|----------------|----------------------------------|
| **A Chief** | Chief session + EC dossier facts · STOP before Labor HTTP | **OUT** |
| **B Labor** | CURRENT / Candidate / RESEARCH_GAP · Owner Accept **required** separately | Accept **Owner-only** · F5/Bid **OUT** |

---

## 9. TEST COVERAGE (existing — not modified)

| TEST | SCOPE | P4 REUSE | GAP |
|------|--------|----------|-----|
| `test-ik-migration-01-p4-labor-expert.mjs` | Labor Expert orchestration | **B / formal P5** | Misnumbered vs parent DF |
| `test-ik-migration-01-p4-real-labor.mjs` | Trusted-44 slice | **B / P5** | Same |
| `test-wire-chief-session-01.mjs` | Chief session | **A** | IK-entry enablement not covered |
| P3 implementation 87/87 | Handoff STOP · research OFF | Regression | — |
| P5.26 / 27 / 31 / 32 · PASS2 · RW-03 · matcher · domain | Locks / routing | Regression | No mutation |
| Classification / identity coverage tests | P3 input | Upstream | — |

### Future test matrix (AUDIT ONLY — do not implement)

A valid P3 handoff · B LABOR · C MATERIAL · D COMPOUND · E UNKNOWN · F IDENTIFIED · G REVIEW · H NO_MATCH · I GAP · J provenance · K unit · L category reuse · M research boundary · N no HTTP · O no write · P no Accept · Q no CatalogWork · R P5.26 unchanged · S P3 regression · T P4 stop boundary  

*(Matrix applies after Owner picks Reading A or B.)*

---

## 10. RISK MATRIX

| ID | Sev | Risk | Evidence |
|----|-----|------|----------|
| R-P4-01 | **P0** | SSOT P4 label conflict (Chief vs Labor) | DF/P0 vs Truth Gates / P4-LABOR docs |
| R-P4-02 | **P0** | Labor `executeResearch` defaults **true** if arg omitted | `ik-labor-expert.ts` |
| R-P4-03 | **P0** | Flip `RUN_RATE_EXPERTS` + research → HTTP from P3 host | `IkEntryHost.tsx` |
| R-P4-04 | **P1** | Chief still gated by Expert/D stack, not `ikEntryEnabled` | `TenderDetailPage` + `isChiefSessionStackEnabled` |
| R-P4-05 | **P1** | Identity coverage misread as research GO | P3 lever vs experts |
| R-P4-06 | **P1** | REVIEW → Accept leak if Accept wired auto | Accept API exists |
| R-P4-07 | **P1** | P5.26 CatalogWork mutation via Accept | Catalog write path |
| R-P4-08 | **P2** | NO_MATCH/GAP reinterpreted as price absence | Semantic contract |
| R-P4-09 | **P2** | Category key invent / P5.33 | Forbidden |
| R-P4-10 | **P2** | Duplicate Labor Expert V2 | Historical docs tempt rebuild |
| R-P4-11 | **P3** | Host comment “P4/P5” conflates phases | `IkEntryHost.tsx` header |

---

## 11. CURRENT RUNTIME STATE (prod IK path)

| Lever / gate | Prod / host |
|--------------|-------------|
| `ikEntryEnabled` | default **OFF** |
| `AUTO_INGEST` | default **OFF** |
| `IDENTITY_COVERAGE` | default **OFF** |
| `EXECUTE_RESEARCH` | **OFF** (hard) |
| `RUN_RATE_EXPERTS` | **OFF** (hard) · labor/material `shell_skipped` |
| Chief under IK Entry | **NOT** DF-wired (`ikEntryEnabled && item`) — still Expert/D stack |

Historical Labor Expert + Chief stacks = **AVAILABLE** · formal controlled IK-seam P4 = **NOT COMPLETE** under either reading without Plan.

---

## 12. CHATGPT_ESCALATION

### PROBLEM
IK-MIGRATION-01 assigns **two incompatible meanings** to phase **P4**: Chief Wiring (parent DF / P0 / P3 AUDIT) vs Labor Expert (E2E Truth Gates / `P4-LABOR*` docs / host “P4/P5” experts). Owner asked for P4 AUDIT after P3 STOP without resolving the label.

### EVIDENCE
- `IK-MIGRATION-01-DESIGN-FREEZE.md` §5: P4 Chief · P5 Labor  
- `IK-MIGRATION-01-P0-DESIGN-FREEZE.md` §0: same  
- `IK-MIGRATION-01-P3-AUDIT.md` §10: P4 Chief · P5 Labor research  
- `IK-MIGRATION-01-E2E-TRUTH-GATES.md` §3: P4 = `runIkMasterBoqLaborExpert`  
- `IK-MIGRATION-01-P4-LABOR-EXPERT.md`: status IMPLEMENTATION “P4” Labor  
- `IkEntryHost`: experts gated as “P4/P5”

### IMPACT
Cannot author a single P4 Plan + Design Freeze without picking a meaning. Wrong pick risks either skipping Chief wiring or opening research HTTP under the “P4” banner prematurely.

### OPTIONS
1. **Lock Reading A:** P4 = Chief under `ikEntryEnabled` · Labor Expert = **P5** · rename/annotate historical `P4-LABOR*` as P5 stack landing  
2. **Lock Reading B:** P4 = Labor Expert under IK host levers · move Chief to another phase id (requires DF amendment)  
3. **Explicit dual GO:** Owner issues two sequential GO docs (Chief then Labor) with **new** unambiguous names — avoid inventing P5.33-style numbers

### RECOMMENDATION
**Option 1 (Reading A)** — matches parent DF + P0 reaffirmation + P3 AUDIT boundary; treats historical Labor “P4” as **pre-IK numbering debt**. Next Owner GO after escalation: **P4 PLAN + DESIGN FREEZE for Chief only**.

### BLOCKER
Unresolved SSOT phase-label conflict for **P4**.

---

## 13. HARD STOP

```text
AUDIT COMPLETE
CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0

NO P4 PLAN
NO P4 DESIGN FREEZE
NO IMPLEMENT
NO RESEARCH
NO ACCEPT
NO CATALOGWORK
NO P5.33

STOP — await Owner / ChatGPT resolution of P4 label
```
