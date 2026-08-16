# IK-MIGRATION-01 — P5 PLAN + DESIGN FREEZE  
## Labor E2E (IK-scoped · post–Chief · pre–Material)

> **ID:** `IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P5 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P5 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p5-plan-design-freeze.json`  
> **Prior audit:** [`IK-MIGRATION-01-P5-AUDIT.md`](./IK-MIGRATION-01-P5-AUDIT.md) (`READY_FOR_PLAN`)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §4–5 · [`IK-MIGRATION-01-P0-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P0-DESIGN-FREEZE.md)  
> **P4 LOCKED:** [`IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md) · PV [`IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md) · impl **`d38f97cd`**

```text
P5 = CONTROLLED Labor E2E UNDER IK
     REUSE runIkMasterBoqLaborExpert · labor-research-bridge · selective research
     REUSE P5.26-E internal-first · P5.31/32 category keys · Accept Owner-only
     NOT Material (P6) · NOT F5/Bid (P7) · NOT Chief rewrite (P4 LOCKED)
     NOT P5.26 reopen · NOT P5.33 · NOT new category keys
DEFAULT: P5 levers OFF · research OFF · MODE A only when P5 ON without research
```

---

## 0. Owner resolution (LOCKED)

| Phase | Formal meaning |
|-------|----------------|
| P0 | Design Freeze |
| P1 | IK Entry Shell |
| P2 | Documents → BOQ |
| P3 | Classification + Identity |
| **P4** | **Chief Wiring** · **PRODUCTION VERIFIED / LOCKED** |
| **P5** | **Labor E2E** ← **this freeze** |
| **P6** | **Material E2E** |
| P7 | Position Cost → Bid |
| P8–P10 | Risk / Owner verify / NG-10 removal |

**Legacy labels** (`IK-MIGRATION-01-P4-LABOR*`, Truth Gates “P4 = Labor”, `ik-labor-expert.ts` “P4” header, `test-ik-migration-01-p4-labor-expert.mjs`) = **LEGACY / REUSE ONLY** — do **not** renumber Labor into P4. Formal Labor = **P5**.

**Historical `test-ik-migration-01-p5-material-expert.mjs`** = **formal P6** debt — out of P5.

---

## 1. Baseline (LOCKED)

| | |
|--|--|
| P0–P4 | **PRODUCTION VERIFIED** |
| P4 impl | **`d38f97cd`** |
| Live tip (P4 PV) | **2.66.81** / **`5276083`** |
| P4 tests | **58/58** |
| P5 under IK | **NOT STARTED** |
| P5.26 | LOCKED @ **`1d41f619`** · CatalogWork **471** · Accept **9/9** · REVIEW-9 **frozen** |
| P5.27 / 31 / 32 | LANDED / VERIFIED |
| P5.33 | **DO NOT CREATE** |
| Host today | `RUN_RATE_EXPERTS = false` · `EXECUTE_RESEARCH = false` |
| API risk | `runIkMasterBoqLaborExpert`: `executeResearch !== false` → **default TRUE** = **P0** |

---

## 2. AD (P5) — LOCKED this freeze

| AD | Treść |
|----|--------|
| **AD-IK-P5-01** | P5 = Labor E2E only · STOP before Material (P6) · STOP before F5/Bid (P7) |
| **AD-IK-P5-02** | REUSE FIRST — zero Labor Expert V2 · zero new research engine · zero internal-first V2 |
| **AD-IK-P5-03** | Input = Master BOQ READY + P3 classification/identity + provenance + Catalog OUR RATE — **not** Chief session DTO |
| **AD-IK-P5-04** | Chief Cost BLOCKED ≠ Labor research trigger |
| **AD-IK-P5-05** | P4 enable / Chief session ≠ P5 enable · P5 MUST NOT auto-start from P4 |
| **AD-IK-P5-06** | Two levers (names frozen for IMPLEMENT): **`ikLaborE2eEnabled`** · **`ikLaborResearchEnabled`** — both default **false** · AppSettings / Super Admin |
| **AD-IK-P5-07** | **Labor-specific** enable — MUST NOT flip shared `RUN_RATE_EXPERTS` in a way that also arms Material (P6) |
| **AD-IK-P5-08** | `executeResearch` on P5 path MUST be **`=== true` only when research gate open** — never rely on `!== false` / undefined |
| **AD-IK-P5-09** | MODE A = INTERNAL ONLY (CURRENT + internal-first + Owner Knowledge · **0 HTTP**) |
| **AD-IK-P5-10** | MODE B = RESEARCH ENABLED only when P5 ON ∧ research lever ON ∧ line eligible ∧ budget OK |
| **AD-IK-P5-11** | Wire existing `lookupInternalFirst` + `hostObjectSafetyGate` into Master BOQ Labor path — QUALITY > COVERAGE |
| **AD-IK-P5-12** | Owner Knowledge = REUSE existing only · no new rules · no unit invent remap |
| **AD-IK-P5-13** | Research = selective · traceable · Owner-safe · no mass blind batch · no invent candidate |
| **AD-IK-P5-14** | Category keys = REUSE P5.31/32 LOCKED only · missing key = GAP/BLOCKED · no URL invent · no P5.33 |
| **AD-IK-P5-15** | Labor/PACKAGE sources = existing allowlist (kb_pl · cennikremontow_pl · sccot · extradom · approved routing) · **no** Leroy/Casto/OBI for Labor/PACKAGE |
| **AD-IK-P5-16** | Candidate ≠ Accept · ZERO AUTO-ACCEPT · Owner is sole Accept authority |
| **AD-IK-P5-17** | PARSER_EMPTY / SOURCE_NO_MATCH / QUERY_TOO_NARROW / CATEGORY_IDENTITY_MISMATCH / CKM_ROUTING_LIMIT ≠ market absence |
| **AD-IK-P5-18** | Research/HTTP failure → **GAP** · never invented candidate |
| **AD-IK-P5-19** | CatalogWork / Bind / Write = controlled Owner-authorized only · P5.26 **471** UNTOUCHED as regression baseline |
| **AD-IK-P5-20** | BOQ unit = SSOT · no auto m²↔szt/mb/kg remap |
| **AD-IK-P5-21** | Provenance + sourceRef required for verified facts |
| **AD-IK-P5-22** | Hard research budget (§14) · exceed → GAP/STOP |
| **AD-IK-P5-23** | Rollback = P5 levers OFF → MODE off / internal path off · P2/P3/P4 unchanged · no CatalogWork code-disable rollback |
| **AD-IK-P5-24** | P5 MUST NOT auto-start P6 Material |

*(Parent AD-IK-M* · AD-IK-P2-* · AD-IK-P3-* · AD-IK-P4-* remain LOCKED.)*

---

## 3. P5 objective (contract)

```text
Master BOQ READY (P2/P3)
  + classification plane + identity + provenance
  + Catalog OUR RATE lookup
  → [eligibility] ikEntryEnabled ∧ ikLaborE2eEnabled
  → MODE A: CURRENT | internal-first | Owner Knowledge | REVIEW/GAP (0 HTTP)
  → [optional MODE B] ikLaborResearchEnabled ∧ researchEligible ∧ budget
       → runIkLaborGapResearch / runSelectiveWorkRateResearch (explicit executeResearch === true)
       → CANDIDATE | RESEARCH_GAP
  → Owner Review → Accept | Reject | leave REVIEW
  → (Accept) OUR RATE write via existing Accept path
  → (optional Owner GO) CatalogWork CREATE/REUSE → Bind → Write → Verify
  → STOP
```

**Not every BOQ line traverses the full path.** Legal terminal states include CURRENT · REVIEW · GAP · CANDIDATE (pending) · ACCEPTED.

---

## 4. P4 → P5 seam (LOCKED)

| From | P5 use |
|------|--------|
| Master BOQ READY | Hard gate (`readyForExperts`) |
| Master lines + `DwellingLineProvenance` | Line coverage · sourceRef |
| P3 classification / identity | LABOR-only research eligibility |
| Catalog OUR RATE | CURRENT vs MISS/STALE |
| P4 Chief session / Cost-Offer facts | **EC context only** · **not** research input |
| P4 Cost BLOCKED | **Legal** · **≠** research trigger |
| `ikChiefWiringEnabled` | **Independent** of P5 levers |

**No new DTO invent** — REUSE `runIkMasterBoqLaborExpert({ item, package, expert, executeResearch })` with **P5 guards** on call site.

---

## 5. P5 levers (LOCKED for IMPLEMENT)

| Lever | Storage | Default | Effect |
|-------|---------|---------|--------|
| **`ikLaborE2eEnabled`** | `AppSettings` / `kw-app-settings` | **false** | Enables Labor E2E under IK (MODE A path) |
| **`ikLaborResearchEnabled`** | same | **false** | Enables MODE B selective HTTP research |

### Gate formulas

```text
P5_ACTIVE          = ikEntryEnabled ∧ ikLaborE2eEnabled
MODE_A             = P5_ACTIVE                         → executeResearch MUST be false
MODE_B             = P5_ACTIVE ∧ ikLaborResearchEnabled → executeResearch MUST be true (explicit)
RESEARCH_CALL      = MODE_B ∧ researchEligible(line) ∧ budgetRemaining

FORBIDDEN:
  undefined executeResearch → HTTP
  executeResearch !== false without MODE_B
  flipping Material via shared RUN_RATE_EXPERTS
  P5_ACTIVE when ikEntryEnabled false
```

**Host constants** `IK_ENTRY_SHELL_RUN_RATE_EXPERTS` / `IK_ENTRY_SHELL_EXECUTE_RESEARCH` remain **false** as hard shell defaults; P5 IMPLEMENT replaces Labor arming with **P5 levers**, not by permanently enabling Material.

---

## 6. Modes (LOCKED)

### MODE A — INTERNAL ONLY

| Allowed | Forbidden |
|---------|-----------|
| `lookupWorkRate` CURRENT | Any Edge/HTTP labor fetch |
| `lookupInternalFirst` exact/semantic | Material DIY shops |
| Owner Knowledge REUSE (existing) | Auto-Accept |
| REVIEW / NO_INTERNAL_MATCH / GAP | Invent prices |
| EC facts with sourceRef | Mass research |

### MODE B — RESEARCH ENABLED

Requires MODE A eligibility **plus** research lever + per-line `researchEligible` + budget.

| Allowed | Forbidden |
|---------|-----------|
| Selective `runIkLaborGapResearch` | Blind batch all GAPs |
| Allowlisted PASS1/PASS2 URLs | New category keys / invent URL |
| CANDIDATE with provenance | AUTO-ACCEPT |
| GAP on failure classes (§13) | Treat PARSER_EMPTY as market absence |

---

## 7. Internal-first (LOCKED)

**REUSE (no copy / no V2):**

| Symbol | File |
|--------|------|
| `lookupInternalFirst` | `internal-first-semantic-match.ts` |
| `hostObjectSafetyGate` | `internal-first-host-safety.ts` |
| `mediumOwnerKnowledgeOk` / soft text / stems | same + `internal-first-text.ts` |
| Domain LABOR/PACKAGE/MATERIAL separation | `internal-first-domain.ts` |

**Rules:** unsafe match → **NO_INTERNAL_MATCH** · ambiguous → **REVIEW** · **QUALITY > COVERAGE**.  
**IMPLEMENT gap (from audit):** wire into Master BOQ Labor Expert path (today only batch runners).

---

## 8. Owner Knowledge (LOCKED)

REUSE existing only. Known examples (documentation memory — implement only if already in code/SSOT):

- wykucie otworu ↔ drzwi 70/80/90/100  
- PCW Ø50 = zlew/umywalka/pralka · Ø100 = WC  
- skraplacz = kondensat kotła gazowego  
- skrzydło drzwiowe = 300 PLN/**szt**  
- otulina = Ø20  
- RCD 2P/4P Type A = 300 PLN  

**No new rules in IMPLEMENT without Owner GO.**  
Owner Knowledge PLN/szt does **not** convert BOQ **m²** → auto Accept.

---

## 9. Research eligibility (LOCKED)

`researchEligible = true` only when **all** hold:

1. MODE B open  
2. Identity resolve OK  
3. Plane **LABOR** (or existing LABOR-eligible PACKAGE policy already in selective research — **no expand**)  
4. OUR RATE **MISS** or **STALE** (not CURRENT unless Owner forceRefresh — out of default P5)  
5. Not host-safety blocked · not cooldown/session-busy  
6. Category key present when PASS2 required · else GAP/BLOCKED  
7. Budget remaining  

**Forbidden research:** UNRESOLVED · UNKNOWN · MATERIAL (P6) · Chief Cost BLOCKED fallback · REVIEW-only ambiguity without eligibility.

---

## 10. HTTP path (LOCKED — PLAN only, zero live calls)

```text
P5 MODE B
  → runIkLaborGapResearch
    → runSelectiveWorkRateResearch
      → Edge selective work-rate lookup (existing port)
        → allowlisted source + PASS1 and/or PASS2 categoryKey URL
        → HTML parser + identity filter
        → CANDIDATE | GAP statuses
```

No new Edge routes in P5 unless Owner GO (out of default freeze).

---

## 11. Category routing (LOCKED)

| Key | Status |
|-----|--------|
| `flooring` | REUSE · P5.31/32 LOCKED |
| `repairs_wall` | REUSE |
| `repairs_opening` | REUSE |
| `joinery_finish` | REUSE |

Missing key → **GAP / BLOCKED**. No invent URL. No P5.33.

---

## 12. Source policy (LOCKED)

**Labor / PACKAGE:** existing allowlist only — primarily `kb_pl` · `cennikremontow_pl` · plus approved routing (`sccot` · `extradom` · other already-legal labor sources).  

**Forbidden for Labor/PACKAGE:** Leroy · Castorama · OBI (Material shops → **P6**).

---

## 13. Candidate · Review · Accept (LOCKED)

| State | Meaning |
|-------|---------|
| CURRENT | OUR RATE hit · 0 research |
| MISS | eligible for internal / research path |
| CANDIDATE | evidence pack · **not** OUR RATE |
| REVIEW | Owner pending · ≠ ACCEPT |
| GAP / RESEARCH_GAP | terminal without invent |
| ACCEPTED | after Owner Accept write |

**Confidence:** HIGH / MEDIUM / LOW (identity/internal) + candidate `lowSample` — **LOW ≠ auto Accept**.

```text
CANDIDATE → Owner Review → Accept | Reject | keep REVIEW
Accept → acceptWorkRateResearchCandidate / acceptIkLaborResearchAndNotify
       → saveWorkCatalogRouted (OUR RATE)
```

ZERO auto-Accept · ZERO research→auto CatalogWork CREATE.

---

## 14. CatalogWork · Bind · Write (LOCKED)

```text
Owner Accept (OUR RATE)
  → optional Owner GO: CREATE new CatalogWork OR REUSE existing
  → Bind identity
  → Write
  → Verify
```

| Rule | |
|------|--|
| Mechanism | REUSE existing CatalogWork / Accept paths |
| P5.26 baseline | CatalogWork **471** · accepted **9/9** · REVIEW-9 frozen · **no reopen** |
| Mutate accepted P5.26 rates | **FORBIDDEN** |
| Research alone | **no** CREATE |

---

## 15. Failure semantics (LOCKED)

| Outcome | Terminal |
|---------|----------|
| HTTP failure / timeout / 429 / 403 / 503 | **GAP** (after budget/circuit rules) |
| PARSER_EMPTY | **GAP** ≠ market absence |
| SOURCE_NO_MATCH | **GAP** ≠ market absence |
| QUERY_TOO_NARROW | **GAP** ≠ market absence |
| CATEGORY_IDENTITY_MISMATCH | **GAP** ≠ market absence |
| CKM_ROUTING_LIMIT | **GAP** · **no bypass** |
| SOURCE_EMPTY circuit breaker | retain runner-side safety |
| Budget exceeded | **GAP / STOP** |
| Invented candidate | **FORBIDDEN** |

---

## 16. Research budget (LOCKED — hard caps for IMPLEMENT)

| Cap | Value | Notes |
|-----|------:|-------|
| Max HTTP fetches **per P5 run** (tender session) | **24** | Selective · not mass |
| Max HTTP fetches **per workId\|unit** | **4** | Prefer PASS2 then fail soft |
| Blind retry on same URL | **0** | No blind retry |
| Network retry (5xx/timeout only) | **≤1** | Then GAP |
| EMPTY streak / circuit | **REUSE existing** | Do not weaken |
| Cooldown / single-flight | **REUSE existing** | Keep |
| Bypass cooldown | Owner force only · default OFF | |

Exceed any hard cap → **GAP / STOP** for further research in that run.

---

## 17. Provenance · unit · truth (LOCKED)

- Preserve: BOQ sourceRef · internal match source · Owner Knowledge source · research query/source/timestamp/evidence/confidence  
- Missing sourceRef → **not** verified fact (`canPresentAsVerifiedFact` / `enforceIkConversationTruth`)  
- BOQ unit = SSOT · no auto unit conversion  

---

## 18. Side effects (LOCKED)

| Step | Effect |
|------|--------|
| Research | READ-ONLY (ephemeral session dedupe OK) |
| Candidate | READ-ONLY |
| Owner Accept | controlled OUR RATE write |
| CatalogWork CREATE/BIND/Write | controlled · Owner-authorized · traceable |

---

## 19. P5 / P6 / P4 / P7 boundaries (LOCKED)

| Boundary | Rule |
|----------|------|
| P4 | LOCKED · no Chief semantics change · no Labor leak from Chief |
| P5 | Labor only |
| P6 | Material DIY / PM — **OUT** · P5 MUST NOT enable Material expert |
| P7 | F5 / Bid — **OUT** |

---

## 20. Implementation boundary (LOCKED)

**MAY touch (on Owner GO IMPLEMENT):**

- P5 levers + flag helpers + Admin toggle  
- `IkEntryHost` Labor arming via P5 gates (not Material)  
- Wire internal-first into Labor Expert path  
- Explicit `executeResearch === true` only under MODE B  
- Candidate / Review / Accept boundary tests + docs  
- P5 implementation tests  

**MUST NOT touch:**

- P4 Chief semantics / Dual Outcome (D)  
- P2 BOQ / P3 classification engines (beyond call)  
- P5.26 accepted rates / REVIEW-9  
- P5.31/32 key set / Edge allowlist invent  
- F5 / Bid / Material research  

---

## 21. Rollback (LOCKED)

```text
ikLaborResearchEnabled = false  → MODE B OFF (0 HTTP)
ikLaborE2eEnabled = false       → P5 path OFF
→ P2 / P3 / P4 unchanged
→ no CatalogWork code-only rollback required
```

---

## 22. Test matrix (LOCKED for IMPLEMENT)

| ID | Case |
|----|------|
| A | P4 valid handoff · no auto Labor |
| B | CURRENT |
| C | MISS |
| D | internal exact |
| E | internal semantic SAFE |
| F | internal semantic REVIEW |
| G | unsafe semantic → NO_INTERNAL_MATCH |
| H | Owner Knowledge REUSE |
| I | MODE A internal-only · 0 HTTP |
| J | MODE B explicit research |
| K | research blocked |
| L | HTTP success → candidate |
| M | PARSER_EMPTY ≠ market absence |
| N | SOURCE_NO_MATCH semantics |
| O | QUERY_TOO_NARROW |
| P | CATEGORY_IDENTITY_MISMATCH |
| Q | circuit breaker / streak |
| R–T | candidate HIGH / MEDIUM / LOW |
| U | Owner ACCEPT |
| V | Owner REJECT |
| W | Owner REVIEW |
| X | no AUTO-ACCEPT |
| Y | CatalogWork Owner-gated |
| Z | Bind |
| AA | Write |
| AB | provenance / sourceRef |
| AC | unit safety |
| AD | P5.26 Catalog **471** unchanged |
| AE | P4 regression |
| AF | P3 regression |
| AG | P2 regression |

### Existing test REUSE (do not duplicate)

- `test-ik-migration-01-p4-labor-expert.mjs` (legacy name · P5 core)  
- `test-ik-e2e-wire-w2-labor-two-pass.mjs` · `test-work-rate-selective-research-02.mjs`  
- `test-ik-migration-01-p526e-matcher-safety.mjs` · P5.27 / 31 / 32 harnesses  
- PASS2 · RW-03 · domain · P4/P3/P2 implementation suites  

**New:** minimal `test-ik-migration-01-p5-implementation.mjs` only for P5 lever/mode/guard gaps.

---

## 23. Risk awareness (from audit — LOCKED mitigations)

| ID | Sev | Mitigation in this freeze |
|----|-----|---------------------------|
| R-P5-01 | P0 | Labor-specific levers · no Material arm |
| R-P5-02 | P0 | `executeResearch === true` only under MODE B |
| R-P5-03 | P0 | Owner Accept only · test X |
| R-P5-04 | P0 | P5.26 471 lock · AD-IK-P5-19 |
| R-P5-05 | P1 | Wire internal-first · QUALITY > COVERAGE |
| R-P5-06 | P1 | Failure ≠ market absence · §15 |
| R-P5-07 | P1 | Cost BLOCKED ≠ research |
| R-P5-08 | P1 | Unit SSOT · REVIEW on conflict |
| R-P5-09 | P2 | Legacy label demotion |
| R-P5-10 | P2 | Budget + circuit · §16 |

---

## 24. IMPLEMENT checklist (for Owner GO — not started)

```text
[ ] AppSettings ikLaborE2eEnabled + ikLaborResearchEnabled (default false)
[ ] Flag helpers + Super Admin toggles
[ ] IkEntryHost Labor path behind P5_ACTIVE (Material stays OFF)
[ ] Force executeResearch === false in MODE A; === true only MODE B
[ ] Wire lookupInternalFirst + hostObjectSafetyGate into Labor Expert
[ ] Budget counters + GAP on exceed
[ ] Candidate → Owner Review → Accept path (REUSE) · zero auto
[ ] EC facts + sourceRef
[ ] Tests A–AG (reuse + thin P5 harness)
[ ] Docs closeout + PV · CatalogWork 471 verify
[ ] STOP before P6
```

---

## 25. Design freeze summary (LOCKED)

Frozen: P5 input · levers · MODE A/B · internal-first · research gate · HTTP policy · candidate · Owner Review · Accept · CatalogWork/Bind/Write · provenance · unit safety · budget · failure semantics · rollback · P4/P5 · P5/P6 · P5 STOP · P5.26/31/32 locks · no P5.33.

---

## 26. Integrity

```text
CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
COMMIT = 0
PUSH = 0
```

---

## 27. FINAL STATUS

```text
P5 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P5 OWNER GO

P5 implementation = NOT STARTED
P5 research = NOT STARTED
P5 Accept = NOT STARTED

P4 = PRODUCTION VERIFIED / LOCKED
P5.26 CatalogWork = 471 LOCKED
P5.33 = DO NOT CREATE
P6 = NOT STARTED

STOP — no auto IMPLEMENT · no research · no HTTP · no Accept · no Write
```

**No CHATGPT_ESCALATION** — scope, seams, and P0 research-default risk are resolved by this freeze (explicit levers + `=== true` gate).
