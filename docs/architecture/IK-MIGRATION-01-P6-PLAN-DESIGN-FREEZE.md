# IK-MIGRATION-01 — P6 PLAN + DESIGN FREEZE  
## Material E2E (IK-scoped · post–Labor · pre–F5/Bid)

> **ID:** `IK-MIGRATION-01-P6-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P6 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P6 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p6-plan-design-freeze.json`  
> **Prior audit:** [`IK-MIGRATION-01-P6-AUDIT.md`](./IK-MIGRATION-01-P6-AUDIT.md) (`READY_FOR_PLAN`)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §4–5 · [`IK-MIGRATION-01-P0-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P0-DESIGN-FREEZE.md)  
> **P5 LOCKED:** [`IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P5-PLAN-DESIGN-FREEZE.md) · PV [`IK-MIGRATION-01-P5-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P5-PRODUCTION-VERIFY.md) · impl **`d5a7fa5c`** · live **2.66.82** / **`5fc3ae9`**  
> **P4 LOCKED:** [`IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE.md) · PV [`IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P4-PRODUCTION-VERIFY.md)

```text
P6 = CONTROLLED Material E2E UNDER IK
     REUSE runIkMasterBoqMaterialExpert · Phase2 · DIY LM/Casto/OBI
     REUSE Price Memory / Accept · IkMaterialGapJob inventory
     NOT Labor (P5 LOCKED) · NOT Chief (P4) · NOT F5/Bid (P7)
     NOT CatalogWork OUR RATE SSOT · NOT P5.26 reopen · NOT P5.33
DEFAULT: P6 levers OFF · research OFF · MODE A only when P6 ON without research
```

---

## 0. Owner resolution (LOCKED)

| Phase | Formal meaning |
|-------|----------------|
| P0 | Design Freeze |
| P1 | IK Entry Shell |
| P2 | Documents → BOQ |
| P3 | Classification + Identity |
| P4 | Chief Wiring · **PRODUCTION VERIFIED / LOCKED** |
| P5 | Labor E2E · **PRODUCTION VERIFIED / LOCKED** |
| **P6** | **Material E2E** ← **this freeze** |
| P7 | Position Cost → Bid |
| P8–P10 | Risk / Owner verify / NG-10 removal |

**Legacy labels** (`IK-MIGRATION-01-P5-MATERIAL*`, `ik-material-expert.ts` “P5” header, `test-ik-migration-01-p5-material-expert.mjs`, P5.12–P5.14 Material docs) = **LEGACY / REUSE ONLY** — formal Material = **P6**. Do **not** renumber into Labor P5.

---

## 1. Baseline (LOCKED)

| | |
|--|--|
| P0–P5 | **PRODUCTION VERIFIED** |
| P5 impl | **`d5a7fa5c`** |
| Live tip (P5 PV) | **2.66.82** / **`5fc3ae9`** |
| P5.26 | CatalogWork **471** · **LOCKED / UNTOUCHED** |
| P5.31 / 32 Labor keys | **LOCKED** · out of P6 |
| P5.33 | **DO NOT CREATE** |
| P6 under IK | **NOT STARTED** · `shell_skipped` |
| Host today | `IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false` · no `ikMaterial*` |
| API risk (audit P0) | `executeResearch !== false` in Material Expert + MMR orchestrate |

---

## 2. AD (P6) — LOCKED this freeze

| AD | Treść |
|----|--------|
| **AD-IK-P6-01** | P6 = Material E2E only · STOP before F5/Bid (P7) · STOP before P5.33 |
| **AD-IK-P6-02** | REUSE FIRST — zero Material Expert V2 · zero second Price Memory · zero generic matcher V2 |
| **AD-IK-P6-03** | Input = Master BOQ READY + P3 classification/identity + provenance — **not** Chief DTO · **not** Labor Accept |
| **AD-IK-P6-04** | P5 Labor GAP/failure ≠ automatic Material block · domains independent |
| **AD-IK-P6-05** | P5 levers / Labor session ≠ P6 enable · P6 MUST NOT mutate P5 |
| **AD-IK-P6-06** | Two levers (names frozen for IMPLEMENT): **`ikMaterialE2eEnabled`** · **`ikMaterialResearchEnabled`** — both default **false** · AppSettings / Super Admin |
| **AD-IK-P6-07** | **Material-specific** enable — MUST NOT flip shared `RUN_RATE_EXPERTS` · MUST NOT reuse `ikLabor*` levers |
| **AD-IK-P6-08** | `executeResearch` on P6 path MUST be **`=== true` only when research gate open** — kill `!== false` / undefined→true |
| **AD-IK-P6-09** | MODE A = MEMORY / IDENTITY ONLY (Price Memory CURRENT + existing identity · **0 HTTP**) |
| **AD-IK-P6-10** | MODE B = RESEARCH only when P6 ON ∧ research lever ON ∧ line eligible ∧ budget OK ∧ identity valid |
| **AD-IK-P6-11** | Material internal-first = **Price Memory CURRENT** — **NOT** Labor P5.26-E matcher |
| **AD-IK-P6-12** | Owner Knowledge Material = REUSE existing only · source must remain OWNER_KNOWLEDGE · no new rules |
| **AD-IK-P6-13** | Research = selective DIY (allowlisted) · traceable · Owner-safe · no catalogue harvest · no invent candidate |
| **AD-IK-P6-14** | Material routing = materialKey + shop provider · **not** Labor P5.31/32 category keys · no new keys this stage |
| **AD-IK-P6-15** | Material sources = Price Memory + Leroy/Castorama/OBI (Edge allowlist) · **no** Labor KB/CR/SCCOT as Material shops |
| **AD-IK-P6-16** | Candidate ≠ Accept ≠ Price Memory write · ZERO AUTO-ACCEPT · Owner sole Accept authority |
| **AD-IK-P6-17** | PARSER_EMPTY / SOURCE_NO_MATCH / QUERY_TOO_NARROW / CATEGORY_IDENTITY_MISMATCH ≠ market absence (P5.32 inherit) |
| **AD-IK-P6-18** | Research/HTTP failure → **GAP** · never invented price candidate |
| **AD-IK-P6-19** | Accept write target = **Price Memory / Market Quotes** · CatalogWork **471** Labor OUR RATE **UNTOUCHED** |
| **AD-IK-P6-20** | BOQ unit = SSOT · no auto m²↔szt / mb / kg / kpl remap · package conversion only if existing contract |
| **AD-IK-P6-21** | Provenance + sourceRef required for verified facts |
| **AD-IK-P6-22** | Hard Material budget = **REUSE MMR-02** (+ derived P6 session ceiling §16) · exceed → GAP/STOP |
| **AD-IK-P6-23** | Rollback = P6 levers OFF → Material path OFF · P2–P5 unchanged · no CatalogWork rollback · no PM write undo |
| **AD-IK-P6-24** | P6 MUST NOT auto-start P7 · MUST NOT arm Labor research |

*(Parent AD-IK-M* · AD-IK-P2–P5 remain LOCKED.)*

---

## 3. P6 objective (contract)

```text
Master BOQ READY (P2/P3)
  + classification plane + material/work identity + provenance
  + Price Memory lookup
  → [eligibility] ikEntryEnabled ∧ ikMaterialE2eEnabled
  → MODE A: CURRENT (PM HIT) | identity REVIEW/GAP | demand.path without HTTP (0 HTTP)
  → [optional MODE B] ikMaterialResearchEnabled ∧ researchEligible ∧ budget
       → executeMaterialResearchPhase2 (explicit executeResearch === true)
       → CANDIDATE | RESEARCH_GAP
  → Owner Review → Accept | Reject | leave REVIEW
  → (Accept) Price Memory / Market Quotes via acceptIkMaterialResearchCandidate
  → subsequent tender: CURRENT → REUSE (0 HTTP)
  → STOP
```

**Not every BOQ line traverses the full path.** Legal terminals: CURRENT · REVIEW · GAP · CANDIDATE (pending) · ACCEPTED (PM).

**REUSE stack (no duplicate logic):**

```text
IkEntryHost (P6 seam)
  → runIkMasterBoqMaterialExpert
      → mapOfferBoqLine / resolveDemandProductIdentityExact
      → evaluateMaterialCache (Price Memory)
      → executeMaterialResearchPhase2 (MODE B only)
      → acceptIkMaterialResearchCandidate (Owner only · separate call)
  → IkMaterialGapJob (inventory / gap jobs — REUSE orchestrator types; no new engine)
```

---

## 4. P5 → P6 seam (LOCKED)

| From | P6 use |
|------|--------|
| Master BOQ READY | Hard gate (`readyForExperts`) |
| Master lines + `DwellingLineProvenance` | Line coverage · sourceRef |
| P3 classification / identity | MATERIAL / COMPOUND eligibility · LABOR skip |
| Price Memory / Quotes | CURRENT vs MISS |
| CatalogWork row id | **Identity / `demand.work.<workId>` coordination only** — **not** Material price SSOT |
| P5 Labor expert report | **NOT required** |
| P5 Accept / Labor research success | **NOT required** |
| P5 Labor GAP | **does not block** Material |
| `ikLabor*` levers | **Independent** · MUST NOT arm Material |

**No new DTO invent** — REUSE `runIkMasterBoqMaterialExpert({ item, package, expert, executeResearch })` with **P6 guards** on call site.

---

## 5. P6 host (LOCKED — design only)

**Today:** no `ikMaterial*` · Material branch behind `IK_ENTRY_SHELL_RUN_RATE_EXPERTS === false` → `shell_skipped`.

**Smallest future host seam (IMPLEMENT later):**

```text
IkEntryHost
  · P6_ACTIVE = ikEntryEnabled ∧ ikMaterialE2eEnabled
  · if !P6_ACTIVE → material = null · data-ik-material-status = shell_skipped
  · if P6_ACTIVE → runIkMasterBoqMaterialExpert({
        executeResearch: resolveIkP6MaterialExecuteResearch(...) === true
      })
  · markers: data-ik-p6-material-e2e · data-ik-p6-material-research
  · KEEP Labor on ikLabor* only
  · KEEP IK_ENTRY_SHELL_RUN_RATE_EXPERTS = false (never Material ON via shared sentinel)
```

Do **not** implement in this freeze.

---

## 6. P6 levers (LOCKED for IMPLEMENT)

**Naming inspection:** repo uses `ikLaborE2eEnabled` / `ikLaborResearchEnabled`. **No** `ikMaterial*` equivalent exists → **propose minimal new names** (mirror Labor).

| Lever | Storage | Default | Effect |
|-------|---------|---------|--------|
| **`ikMaterialE2eEnabled`** | `AppSettings` / `kw-app-settings` | **false** | Enables Material E2E under IK (MODE A) |
| **`ikMaterialResearchEnabled`** | same | **false** | Enables MODE B selective HTTP research |

### Gate formulas

```text
P6_ACTIVE          = ikEntryEnabled ∧ ikMaterialE2eEnabled
MODE_A             = P6_ACTIVE                         → executeResearch MUST be false
MODE_B             = P6_ACTIVE ∧ ikMaterialResearchEnabled → executeResearch MUST be true (explicit)
RESEARCH_CALL      = MODE_B ∧ researchEligible(line) ∧ budgetRemaining ∧ identityValid

FORBIDDEN:
  undefined executeResearch → HTTP
  executeResearch !== false without MODE_B
  Material E2E ON → automatic research
  flipping Material via shared RUN_RATE_EXPERTS
  using ikLabor* as Material enable
  P6_ACTIVE when ikEntryEnabled false
```

**Helpers (IMPLEMENT names — mirror P5):** `isIkMaterialE2eEnabled` · `isIkMaterialResearchEnabled` · `isIkP6MaterialE2eActive` · `resolveIkP6MaterialExecuteResearch` (all three `=== true`).

---

## 7. Modes (LOCKED)

### MODE A — MATERIAL INTERNAL / MEMORY ONLY

| Allowed | Forbidden |
|---------|-----------|
| `evaluateMaterialCache` / Price Memory CURRENT | Any DIY/Edge/HTTP fetch |
| Trusted product identity resolve | Labor research |
| P5.13 demand path **read/eligibility** without Phase2 HTTP | Auto-Accept |
| REVIEW / GAP / NO_MATERIAL_COMPONENT | Invent mat.* / price |
| EC facts with sourceRef | Mass research |

### MODE B — MATERIAL RESEARCH

Requires MODE A eligibility **plus** research lever + per-line `researchEligible` + budget + valid identity (product **or** approved demand.work path).

| Allowed | Forbidden |
|---------|-----------|
| Selective `executeMaterialResearchPhase2` | Catalogue / category harvest |
| Allowlisted LM/Casto/OBI (Edge) | Labor shops / invent URL |
| CANDIDATE with provenance | AUTO-ACCEPT |
| GAP on failure classes (§15) | Treat PARSER_EMPTY as market absence |

---

## 8. Material identity (LOCKED)

**Authoritative REUSE (no matcher V2):**

| Symbol | Role |
|--------|------|
| `mapOfferBoqLine` | Product / work mapping context |
| `resolveDemandProductIdentityExact` | Trusted product identity (materialKey / alias / product catalogWorkId) |
| `classifyEstimatorPricingPlane` | LABOR \| MATERIAL \| COMPOUND \| UNKNOWN |
| Material buckets | MATERIAL \| LABOR \| BOTH \| UNRESOLVED \| NON_COST |
| P5.13 `demand.work.<workId>` | Coordination key only — **not** fabricated `mat.*` |
| `MMR_02_PACKAGE_UNITS` + conversion approval | PACKAGE ≠ auto MATERIAL |

**Rules:**

```text
product/material  ≠ labor/service
package           ≠ automatic material research
compound without trusted mat.* → REVIEW / NO_MATERIAL_COMPONENT (no invent)
identity mismatch → REVIEW / GAP · never invent candidate
QUALITY > COVERAGE
```

**NOT reused as Material matcher:** Labor `lookupInternalFirst` / `hostObjectSafetyGate` (P5.26-E) — domain-wrong.

---

## 9. Owner Knowledge (LOCKED)

REUSE existing Material-side knowledge only (identity map · accepted Quotes · invoice seed where already in PM).  

- Represent as **`source = OWNER_KNOWLEDGE`** (or existing equivalent) — **never** as external market evidence.  
- **No new pricing rules** in IMPLEMENT without Owner GO.  
- Owner Knowledge PLN/szt does **not** convert BOQ **m²** → auto Accept.

---

## 10. Research eligibility (LOCKED)

`researchEligible = true` only when **all** hold:

1. MODE B open  
2. Valid Material domain (plane MATERIAL, or existing MATERIAL-eligible COMPOUND path already in expert — **no expand**)  
3. Identity valid: trusted product identity **OR** approved P5.13 demand.work path (no invent mat.*)  
4. Price Memory **MISS** / not CURRENT (unless Owner forceRefresh — out of default P6)  
5. Not LABOR-only · not UNKNOWN invent · research boundary OK  
6. Not cooldown / claim-limit blocked  
7. Allowed source path available (DIY trio / existing provider)  
8. Budget remaining  

**Forbidden research:** LABOR · UNKNOWN invent · UNRESOLVED without demand path · Chief Cost BLOCKED fallback · P6 OFF · MODE A.

---

## 11. HTTP path (LOCKED — PLAN only, zero live calls)

```text
P6 MODE B
  → executeMaterialResearchPhase2
    → MMR orchestrate (CACHE-FIRST already passed)
      → selective DIY provider (leroy → castorama → obi · serial · maxUrls=1)
        → Edge POST /mmr-diy-selective-lookup (allowlisted hosts only)
        → parseDiyShopHtml
        → CANDIDATE | PRICE_GAP / errors
```

No new Edge routes in default P6 unless Owner GO. No catalogue harvest.

---

## 12. Category routing (LOCKED)

| Topic | Rule |
|-------|------|
| Labor keys `flooring` / `repairs_*` / `joinery_finish` | **LOCKED** · **OUT of P6** · do not modify |
| Material model | **materialKey** + shop `provider` id · Edge host allowlist |
| Local ↔ Edge ↔ URL | REUSE existing DIY Edge builders · **parity already Edge-owned** |
| New Material category keys | **FORBIDDEN** this stage |
| Repair routing mid-P6 | **FORBIDDEN** without Owner GO |
| P5.33 | **DO NOT CREATE** |

**Parity blocker (audit):** none requiring stop — Material ≠ Labor key map. Incomplete shop beyond LM/Casto/OBI → **GAP** (do not invent hurtownia policy).

---

## 13. Source policy (LOCKED)

| Source | Role | Routing | Parser | Provenance |
|--------|------|---------|--------|------------|
| Price Memory / Market Quotes | CURRENT REUSE | materialKey \| region / work quotes | n/a | accepted quote |
| Leroy Merlin | selective DIY | Edge allowlist `leroymerlin.pl` | `parseDiyShopHtml` | URL + price + query |
| Castorama | selective DIY | `castorama.pl` | same | same |
| OBI | selective DIY | `obi.pl` | same | same |

**Forbidden as Material research shops:** Labor allowlist (kb_pl · cennikremontow · sccot · extradom).  
**Forbidden:** invent new shops/hurtownie/manufacturer policy in IMPLEMENT without Owner source audit.

---

## 14. Candidate · Review · Accept · Price Memory (LOCKED)

| State | Meaning |
|-------|---------|
| CURRENT | Price Memory HIT · 0 research |
| MISS | eligible for MODE A review / MODE B research |
| CANDIDATE | evidence pack · **not** persisted PM |
| REVIEW | Owner pending · ≠ ACCEPT |
| GAP / RESEARCH_GAP | terminal without invent |
| ACCEPTED | after Owner Accept → Price Memory CURRENT |

**Candidate MUST preserve:** group/line · material identity · domain · unit · price · source · sourceRef · query · evidence · confidence · timestamp · research mode (A/B).

**Confidence:** HIGH / MEDIUM / LOW — **LOW ≠ auto Accept**.

```text
CANDIDATE → Owner Review → Accept | Reject | keep REVIEW
Accept → acceptIkMaterialResearchCandidate
       → acceptMaterialResearchCandidate
       → acceptManualMarketPriceResearchPure
       → Market Quotes / Price Memory CURRENT
```

ZERO auto-Accept (`AUTO_ACCEPT_FORBIDDEN` KEEP). ZERO research→write. ZERO research→Labor OUR RATE.

---

## 15. Failure semantics (LOCKED)

| Outcome | Terminal |
|---------|----------|
| HTTP failure / timeout / 403 / 429 / 503 | **GAP** (after budget/circuit) |
| PARSER_EMPTY | **GAP** ≠ market absence |
| SOURCE_NO_MATCH | **GAP** ≠ market absence |
| QUERY_TOO_NARROW | **GAP** ≠ market absence |
| CATEGORY_IDENTITY_MISMATCH | **GAP** ≠ market absence |
| routing missing / allowlist miss | **GAP / BLOCKED** |
| unit mismatch | **UNIT_REJECT** / REVIEW / BLOCKED · not invent conversion |
| budget / claims / rate / circuit | **GAP / STOP** |
| Invented candidate | **FORBIDDEN** |

Map Material string codes (`PRICE_GAP`, `cooldown_active`, `unit_mismatch_price_gap`, …) onto this taxonomy in IMPLEMENT tests — **do not weaken**.

---

## 16. Material research budget (LOCKED — hard caps)

**Do NOT copy Labor 24/4 as Material SSOT.** Authoritative Material limits = **existing MMR-02 + DIY**:

| Cap | Value | Source |
|-----|------:|--------|
| Rate limit | **≤ 6 HTTP starts / min** | `MMR_02_RATE_LIMIT_PER_MIN` |
| Provider timeout | **12_000 ms** | `MMR_02_TIMEOUT_MS` |
| Network retry (5xx/timeout) | **≤ 1** | `MMR_02_MAX_RETRY` |
| Blind retry same URL | **0** | P5.32 / this freeze |
| Circuit breaker | **3** failures / **5** min window | `MMR_02_CIRCUIT_*` |
| Max active claims / pass | **8** | `MMR_MAX_ACTIVE_CLAIMS_PER_PASS` |
| Failure cooldown | **60_000 ms** | `MMR_DEFAULT_COOLDOWN_MS` |
| Shops per materialKey | **≤ 3** (LM→Casto→OBI serial) | DIY provider |
| URLs per shop call | **1** | DIY `maxUrls: 1` |
| DIY client abort | **14_000 ms** | selective client |

**Derived P6 session ceiling (IK wrap — additional, does not raise MMR):**

| Cap | Value | Rationale |
|-----|------:|-----------|
| Max shop HTTP attempts / P6 Material run | **24** | 8 claims × 3 shops · selective ceiling |
| Exceed any hard cap | **GAP / STOP** | no unlimited HTTP |

IMPLEMENT may add a thin `ik-p6-material-budget` counter **wrapping** MMR (like P5 labor budget) — **must not** exceed these caps.

---

## 17. Provenance · unit · truth (LOCKED)

- Preserve: BOQ sourceRef · material identity · PM/internal source · research query/source/URL/timestamp/evidence/confidence · unit  
- Missing sourceRef → **not** verified fact  
- BOQ unit = SSOT  
- Evidence `/szt` vs BOQ `/m²` (etc.) → **REVIEW / BLOCKED** unless existing conversion contract (`MMR_02_PACKAGE_UNITS` + approved conversion)  

---

## 18. CatalogWork lock (LOCKED)

| Rule | |
|------|--|
| P5.26 baseline | CatalogWork **471** · **LOCKED** |
| Material Accept | writes **Price Memory / Quotes** only |
| CatalogWork in Material path | may appear as **`catalogWorkId`** for identity / `demand.work.*` — **safe REUSE** · **not** rate mutation |
| Mutate accepted Labor OUR RATE | **FORBIDDEN** |
| Second Price Memory | **FORBIDDEN** |

---

## 19. Side effects (LOCKED)

| Step | Effect |
|------|--------|
| Research | READ-ONLY (session cooldown / lease OK) |
| Candidate | READ-ONLY |
| Owner Accept | controlled Price Memory / Quotes write |
| CatalogWork OUR RATE | **no write** from P6 |

---

## 20. Boundaries (LOCKED)

| Boundary | Rule |
|----------|------|
| P4 | LOCKED · no Chief / D mutation |
| P5 | LOCKED · no Labor research from P6 · no Labor lever flip · no P5.26/31/32 change |
| P6 | Material only |
| P7 | F5 / Bid / Position Cost — **OUT** · P6 MUST NOT auto-start |

---

## 21. Implementation boundary (LOCKED)

**MAY touch (on Owner GO IMPLEMENT):**

- `ikMaterialE2eEnabled` / `ikMaterialResearchEnabled` + flag helpers + Super Admin toggles  
- `IkEntryHost` Material arming via P6 gates (Labor untouched)  
- Force `executeResearch === true` only under MODE B in Material Expert + MMR call path  
- Thin P6 budget wrap (optional) respecting §16  
- Candidate / Review / Accept boundary tests + docs  
- P6 implementation tests (reuse + thin harness)  

**MUST NOT touch:**

- P2 BOQ / P3 classification semantics  
- P4 Chief / Dual Outcome  
- P5 Labor semantics / levers / accepted rates  
- P5.26 accepted rates / REVIEW-9  
- P5.31/32 Labor keys / Edge Labor allowlist  
- F5 / Bid / P7  
- New Material category keys / new shops  

---

## 22. Rollback (LOCKED)

```text
ikMaterialResearchEnabled = false  → MODE B OFF (0 HTTP)
ikMaterialE2eEnabled = false       → P6 path OFF · shell_skipped
→ P2 / P3 / P4 / P5 unchanged
→ no CatalogWork rollback
→ Price Memory writes remain (Owner Accept history) — no automatic undo
```

---

## 23. Production safety (LOCKED)

| | |
|--|--|
| Defaults | Material E2E **OFF** · Material Research **OFF** |
| Controlled ON | **NOT EXERCISED** in PLAN · only later Owner GO |
| After any future controlled test | return both levers **OFF** |

---

## 24. Test matrix (LOCKED for IMPLEMENT)

| ID | Case |
|----|------|
| A | P6 OFF · shell_skipped · P5/P4 unchanged |
| B | P6 ON / Research OFF (MODE A · 0 HTTP) |
| C | P6 ON / Research ON (MODE B gate) |
| D | Material classification |
| E | Material identity |
| F | identity mismatch → REVIEW/GAP |
| G | Price Memory HIT · 0 research |
| H | researchEligible false |
| I | researchEligible true |
| J | `executeResearch` undefined → false / no HTTP |
| K | `executeResearch` false → no HTTP |
| L | `executeResearch` true only MODE B |
| M | source routing DIY allowlist |
| N | category routing (no Labor key invent · materialKey model) |
| O | HTTP success → candidate |
| P | PARSER_EMPTY → GAP |
| Q | SOURCE_NO_MATCH → GAP |
| R | QUERY_TOO_NARROW → GAP |
| S | CATEGORY_IDENTITY_MISMATCH → GAP |
| T | budget / claims / rate |
| U | circuit breaker |
| V–X | candidate HIGH / MEDIUM / LOW |
| Y | Owner Review |
| Z | Owner Accept → Price Memory |
| AA | no AUTO-ACCEPT |
| AB | Price Memory CURRENT after Accept |
| AC | no CatalogWork 471 mutation |
| AD | no Bind/Write OUR RATE from Material |
| AE | provenance / sourceRef |
| AF | unit safety |
| AG | P5 regression |
| AH | P4 regression |
| AI | P3 regression |
| AJ | P2 regression |

### Existing test REUSE (do not duplicate)

- `test-ik-migration-01-p5-material-expert.mjs` (legacy name · **formal P6** core)  
- `test-ik-migration-01-p59-material-identity.mjs` · P5.12 / P5.13 / P5.14 harnesses  
- `test-market-material-research-01*.mjs` · `test-market-material-research-02.mjs`  
- Price Memory / F2 material · DIY selective tests  
- P5 / P4 / P3 / P2 implementation suites (regression)  

**New (IMPLEMENT):** minimal `test-ik-migration-01-p6-implementation.mjs` only for P6 lever/mode/`=== true` guard gaps.

---

## 25. Risk awareness (from audit — LOCKED mitigations)

| ID | Sev | Mitigation in this freeze |
|----|-----|---------------------------|
| R-P6-01 | P0 | Material-specific levers · no shared RUN_RATE |
| R-P6-02 | P0 | `executeResearch === true` only under MODE B |
| R-P6-03 | P0 | Owner Accept only · AUTO_ACCEPT_FORBIDDEN · test AA |
| R-P6-04 | P0 | CatalogWork 471 lock · PM is Material SSOT · AD-IK-P6-19 |
| R-P6-05 | P1 | Do not wire Labor P5.26-E matcher into Material |
| R-P6-06 | P1 | Failure ≠ market absence · §15 |
| R-P6-07 | P1 | Unit SSOT · REVIEW on conflict |
| R-P6-08 | P1 | Budget = MMR-02 + derived ceiling · §16 |
| R-P6-09 | P2 | Legacy “P5 Material” label demotion |
| R-P6-10 | P2 | P5 Labor GAP ≠ Material block |

---

## 26. IMPLEMENT checklist (for Owner GO — not started)

```text
[ ] AppSettings ikMaterialE2eEnabled + ikMaterialResearchEnabled (default false)
[ ] Flag helpers + Super Admin toggles
[ ] IkEntryHost Material path behind P6_ACTIVE (Labor stays on ikLabor*)
[ ] Force executeResearch === false in MODE A; === true only MODE B
    (Material Expert + MMR orchestrate call path)
[ ] KEEP RUN_RATE_EXPERTS hard false as shared sentinel
[ ] Budget wrap respecting MMR-02 + session ceiling
[ ] Candidate → Owner Review → Accept → Price Memory (REUSE) · zero auto
[ ] EC facts + sourceRef
[ ] Tests A–AJ (reuse + thin P6 harness)
[ ] Docs closeout + PV · CatalogWork 471 verify · PM path verify
[ ] STOP before P7 · no P5.33
```

---

## 27. Design freeze summary (LOCKED)

Frozen: P6 input · output · P5→P6 seam · host seam · MODE A/B · levers · research gate · executeResearch guard · identity · sources · routing model · budget · failure semantics · candidate · Owner Review · Accept · Price Memory · CatalogWork lock · provenance · unit safety · rollback · P4/P5/P7 boundaries · P6 STOP · no P5.33.

---

## 28. Integrity

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

## 29. FINAL STATUS

```text
P6 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P6 OWNER GO

P6 implementation = NOT STARTED
P6 research = NOT STARTED
P6 Accept = NOT STARTED

P5 = PRODUCTION VERIFIED / LOCKED
P5.26 CatalogWork = 471 LOCKED
P5.33 = DO NOT CREATE
P7 = NOT STARTED

STOP — no auto IMPLEMENT · no research · no HTTP · no Accept · no Write
```

**No CHATGPT_ESCALATION** — scope, seams, Price Memory vs CatalogWork, sources, and P0 `executeResearch` default are resolved by this freeze (explicit levers + `=== true` gate + MMR budget SSOT).
