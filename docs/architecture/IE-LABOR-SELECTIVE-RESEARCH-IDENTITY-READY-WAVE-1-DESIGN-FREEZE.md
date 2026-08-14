# DESIGN FREEZE — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1

> **Epic:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **Owner Decision SSOT:** [`INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-OWNER-DECISION-CLOSEOUT.md`](./INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-OWNER-DECISION-CLOSEOUT.md)  
> **Blocker Review:** [`INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-REVIEW.md`](./INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-REVIEW.md)  
> **Evidence SSOT (reuse):** [`WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md`](./WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md)  
> **Identity Wave-1 (tablica/podejście):** [`WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md`](./WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md)  
> **Tip:** **2.66.59** (local) · prod tip still **2.66.58** / **`8fba5ef`** until COMMIT/PUSH  
> **Date:** 2026-08-14  
> **Stage:** **DESIGN FREEZE = APPROVED** · **PASS2 CR DISCOVERY IMPLEMENT = LOCAL GREEN** · A1–A3 **CLOSED**

```text
DESIGN FREEZE              = APPROVED (this file)
ARCH REVIEW                = CLOSED · was APPROVE WITH AMENDMENTS
OWNER DECISION CLOSEOUT    = COMPLETE · A1–A3 CLOSED
PASS2 CR DISCOVERY OD      = COMPLETE (A1/A2 APPROVED · A3 HOLD)
PASS2 CR DISCOVERY IMPLEMENT = LOCAL GREEN (v2.66.59 · undeployed)
IMPLEMENT / POPULATE       = LOCAL GREEN (v2.66.58 batch · v2.66.59 PASS2 amendment)
COMMIT / PUSH / DEPLOY     = NOT DONE
RESEARCH HTTP (prod)       = NOT DONE (fixture tests only)
Accept / OUR RATE / margin = FORBIDDEN (this epic forever)
SOURCE GAP                 = OPEN
NICHE                      = NOT CLAIMED
```

> **Arch Review:** [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-ARCH-REVIEW.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-ARCH-REVIEW.md) · **CLOSED** · A1–A3 **OWNER-APPROVED**  
> **PASS2 Owner Decision:** [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-OWNER-DECISION-CLOSEOUT.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-OWNER-DECISION-CLOSEOUT.md)  
> **PASS2 Implement:** [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-IMPLEMENTATION.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-IMPLEMENTATION.md)  
> **Implement:** `work-rate-discovery-allowlist.ts` · Edge PASS2 mirror · batch module `ie-labor-selective-research-identity-ready-wave-1.ts`

```text
PASS2 AMENDMENT (Owner A1/A2) = LOCAL GREEN — CR electrical + plumbing only
ZERO NEW HOSTS · ZERO NEW MAPPINGS · ZERO NEW ALIASES · Wykwity HOLD
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY (until Owner GO COMMIT)
```

---

## 0. Verdict — Design Freeze gate

| Check | Result |
|-------|--------|
| Decision 1 APPROVE BATCH | **YES** (Owner Closeout) |
| Exact 3 targets unambiguous | **YES** |
| Tablica workId + mapping | **YES** — §2.A |
| Podejście workId + mapping | **YES** — §2.B |
| Wykwity workId + identity (no invent) | **YES** — §2.C · `cc-w2-wykwity-zacieki` · D1 Owner synonyms · **no new mapping** |
| Paint / Catalog Hygiene out of epic | **YES** |
| Hard blockers | **NONE** |

**DESIGN FREEZE = UNBLOCKED.**  
(Research-time SOURCE GAP for any single target remains a **runtime** outcome — not a Design Freeze blocker.)

---

## 1. Scope

### 1.1 In scope

One **batch** epic that designs (and later, after Arch Review + Owner GO IMPLEMENT, executes) selective KEEP-4 labor research for **exactly three** LABOR catalog works that are **identity-ready**:

1. Tablica rozdzielcza  
2. Podejście wod-kan  
3. Wykwity / zacieki  

Operational flow **per target** (and for the batch as a whole):

```text
CLASSIFY → LABOR
  → Work Catalog (OUR RATE MISS)
  → existing identity / mapping (READ-ONLY)
  → KEEP-4 research
  → Evidence candidates (provenance)
  → Candidate (if pipeline produces)
STOP.
```

### 1.2 Out of scope (binding)

| Item | Status |
|------|--------|
| `legacy-malowanie-m2` Accept | **OUT** · APPROVE FOR NEXT ACCEPT REVIEW only (other GO) |
| OUR RATE write | **OUT** |
| marginPct write | **OUT** |
| Catalog Model Hygiene (legacy-gk · transport dual · multi-part demo) | **OUT** · HOLD / later EPIC |
| New workIds | **OUT** |
| New identity mapping rows | **OUT** |
| New hosts / allowlist expand | **OUT** |
| Material research / Material Catalog / Price Memory | **OUT** |
| PASS2 MAX / qualify / median / namesLooselyMatch rewrite | **OUT** |
| Classification gate changes | **OUT** |

### 1.3 Epic outcome vs Accept

| Layer | This epic (after future IMPLEMENT) | Separate Owner GO |
|-------|------------------------------------|-------------------|
| Evidence observations | **YES** (populate stage only) | — |
| Candidate (UI / derived) | **YES** if pipeline produces | — |
| Owner Accept | **NO** | Required later |
| OUR RATE / companyPrice / margin | **NO** | Required later |

---

## 2. Exact 3 targets

### 2.A TABLICA

| Field | Frozen value |
|-------|----------------|
| workId | `p2b-tablica-rozdzielcza-mieszkaniowa-szt` |
| namePl | Tablica rozdzielcza mieszkaniowa |
| unit | `szt` |
| plane | **LABOR** |
| mappingId | `lim-w1-tablica-rozdzielcza-cr` |
| matchMode | `exact_normalized` |
| Primary observedName (Wave-1) | `Montaż skrzynki rozdzielczej` |
| Primary sourceId | `cennikremontow_pl` |
| Evidence today | **0** (OUR RATE MISSING) |
| Identity basis | Existing Wave-1 registry row · **READ-ONLY** |

### 2.B PODEJŚCIE WOD-KAN

| Field | Frozen value |
|-------|----------------|
| workId | `p2b-podejscie-wod-kan-mb` |
| namePl | Podejście wodociągowo-kanalizacyjne łączone |
| unit | `mb` |
| plane | **LABOR** |
| mappingId | `lim-w1-podejscie-wod-kan-cr` |
| matchMode | `exact_normalized` |
| Primary observedName (Wave-1) | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` |
| Primary sourceId | `cennikremontow_pl` |
| Evidence today | **0** (OUR RATE MISSING) |
| Identity basis | Existing Wave-1 registry row · **READ-ONLY** |

### 2.C WYKWIITY

| Field | Frozen value |
|-------|----------------|
| workId | **`cc-w2-wykwity-zacieki`** (SSOT Blocker Review + Owner Closeout — **no invent**) |
| namePl | Skasowanie wykwitów / zacieków |
| unit | `m2` |
| plane | **LABOR** |
| mappingId | **NONE** · **do not seed** |
| Identity method | **D1 reuse** — Owner synonyms + exact catalog name · path `A_SAFE_EXACT_OR_D1` |
| canonicalConcept | `skasowanie wykwitów / zacieków` |
| Owner synonyms (frozen table; discovery+matching) | `wykwity` · `zaciek` · `zacieki` · `usuwanie wykwitów` · `usuwanie zacieków` · `skasowanie wykwitów` |
| family | `repairs` |
| Evidence today | **0** |
| Slash in namePl | Synonym-style catalog label · **not** dual-rate COMPOUND · research via D1 names only |

**Design Freeze blocker check (wykwity):** documentation uniquely identifies `cc-w2-wykwity-zacieki` + D1 synonym set → **PASS** · no invent required.

**Runtime note:** dedicated repairs URL may still be missing on KEEP-4 → outcome **SOURCE GAP** for C is allowed without failing A/B.

---

## 3. Identity contract (**A3 CLOSED**)

| Rule | Decision |
|------|----------|
| Bind preference (Owner) | **(1)** Wave-1 `exact_normalized` mapping · **(2)** existing Owner synonym / D1 · **(3)** other existing mechanisms only if contract already allows |
| Engine | **REUSE** existing only — Wave-1 mapping registry + `WORK_RATE_OWNER_SYNONYMS` + existing matcher (threshold **LOCKED**) |
| Second identity engine | **FORBIDDEN** |
| New aliases / new mapping rows | **FORBIDDEN** this epic |
| Threshold relaxation | **FORBIDDEN** |
| Tablica / Podejście | Bind via existing `lim-w1-*` · `exact_normalized` · unit equality required |
| Wykwity | Bind via D1 Owner synonyms / exact name · **no** `lim-w1-*` invent |
| Bucket mapping | **FORBIDDEN** |
| Product SKU as labor proof | **FORBIDDEN** (gniazdo / multiswitch / zawór / oprawa product ≠ montaż) |
| Ambiguous observed row | **UNMATCHED / BLOCKED** — do not invent alias · do not force workId |
| Unit mismatch | **BLOCKED** for that observation |
| Provenance | Store `identityMethod` · `synonymUsed` · mappingId when from Wave-1 |

---

## 4. Source priority

### 4.1 KEEP-4 only (frozen)

| Priority | Host / sourceId | Role |
|---------:|-----------------|------|
| 1 | **kb.pl** (`kb_pl`) | PRIMARY |
| 2 | **cennikremontow.pl** (`cennikremontow_pl`) | PRIMARY |
| 3 | **SCCOT** | SECONDARY |
| 4 | **Extradom** | SECONDARY |

### 4.2 Candidate hosts — FORBIDDEN this epic

Without a **separate** Owner GO:

- Kul-Bud  
- Budowalka  
- Murator  
- Ogarnij Remont  
- Zleca  
- CennikiBudowlane  

**No** allowlist expansion · **no** PASS2 host add · **no** inventory invent as KEEP-4.

---

## 5. Research contract

### 5.0 Owner-bound pipeline (**A1 CLOSED**)

```text
TARGET PREFLIGHT (per workId — may reject BEFORE fetch):
  CLASSIFY → LABOR
  → Work Catalog OUR RATE MISS
  → identity readiness (Wave-1 map OR D1 Owner synonyms)
  → eligibility for KEEP-4 batch
        ↓ (only if preflight PASS)
OBSERVATION PIPELINE:
  FETCH (KEEP-4)
  → PARSE
  → IDENTITY          (must not be skipped by parse)
  → SCOPE             (must not be skipped by identity · before aggregation)
  → QUALIFY           (must not be skipped by scope · EXISTING · locked)
  → Evidence candidates (in-memory; durable write only at POPULATE)
  → Candidate (optional · UI/derived · NOT Accept)
STOP.
```

**A1 locks:** preflight ≠ research pipeline · fetch ≠ identity success · parse must not bypass identity · identity must not bypass scope · scope must not bypass qualify.

| Must | Must not |
|------|----------|
| Seek **labor / robocizna** price | Treat material / product / komplet sale as labor |
| Preserve RANGE as RANGE | Collapse range → single source price |
| Midpoint = **DERIVED** only | Store midpoint as `pricePoint` substitute for range |
| Partial-safe batch (**A2** union append) | Abort A/B because C failed · whole-store replace · destructive rollback |
| Prefer PRIMARY then SECONDARY | Use forbidden hosts |
| Identity bind preference (**A3**) | New aliases · new mappings · bucket · threshold relax |

---

## 6. Labor-only rules

| Observation | Action |
|-------------|--------|
| Explicit labor / robocizna | Eligible (`laborOnly=true`, `includesMaterial=false`) |
| Material-only / product SKU price | **REJECT** / not labor evidence |
| Package mixes material + labor without clear split | **REJECTED_PACKAGE** — do **not** auto-treat as labor-only |
| `allow_flagged` / force laborOnly | **FORBIDDEN** |
| Product name used as montaż proof | **FORBIDDEN** |

---

## 7. Region rules

| Rule | Decision |
|------|----------|
| `POLSKA` / NATIONAL | **Legal** · not SOURCE GAP by itself |
| Force Wrocław-only | **FORBIDDEN** |
| Wrocław present | May label `WROCLAW` |
| Relabel NATIONAL → WROCLAW | **FORBIDDEN** |
| Preference order | **REUSE** existing engine: WROCLAW → DOLNY_SLASK → POLSKA |
| Region selection rewrite | **FORBIDDEN** this epic |

---

## 8. D1 / scope reuse

| Rule | Decision |
|------|----------|
| Scope tags | **REUSE D1** (`walls_ceilings` · `joinery` · `artistic` · `unscoped` · …) |
| Timing | Scope **before** aggregation (same boundary as D1 / Evidence DF) |
| Second scope engine | **FORBIDDEN** |
| `namesLooselyMatch` threshold | **LOCKED** |
| `qualify` / `median` / PASS2 MAX | **LOCKED UNCHANGED** |
| Allowed hosts runtime | KEEP-4 only · **LOCKED** for this epic |
| Wykwity family | `repairs` synonyms · do not invent painting scope for this workId |

---

## 9. Evidence schema (contract)

Reuse Evidence SSOT observation fields. Every candidate / future write MUST carry:

| Field | Notes |
|-------|--------|
| `evidenceId` | Stable id |
| `workId` | Bound target workId (null only unmatched staging — out of happy path here) |
| `sourceId` | KEEP-4 id |
| `sourceUrl` | Exact page |
| `categoryKey` | When applicable |
| `observedName` | Exact source label |
| `unit` | As observed · must match catalog unit to bind |
| `priceMin` / `priceMax` | Preserve RANGE |
| `pricePoint` | Point / from-floor when applicable |
| `priceKind` | `point` \| `range` \| `from_floor` \| `unknown` |
| `currency` | `PLN` |
| `region` | WROCLAW \| DOLNY_SLASK \| POLSKA |
| `country` | `POLSKA` |
| `scopeTag` | D1 |
| `identityMethod` | exact / mapping / owner_synonym / names_loosely / … |
| `synonymUsed` | When synonym path |
| `laborOnly` | boolean |
| `includesMaterial` | boolean |
| `observedAt` | Source freshness if known |
| `retrievedAt` | Fetch time |
| `provenance` | Full provenance object (anonymous **FORBIDDEN**) |
| `qualityStatus` | VALID / REJECTED_* / … |
| `dedupeKey` | Deterministic union key |

**Range remains RANGE. Midpoint is DERIVED. Never replace min/max with midpoint as source truth.**

SSOT key: **`kw-wgdom-labor-source-evidence`**.

---

## 10. Batch architecture

```text
┌─────────────────────────────────────────────┐
│  BATCH PLAN (3 targets A·B·C)               │
│  READ catalog + registry + Evidence (RO)    │
└──────────────────┬──────────────────────────┘
                   ▼
        ┌──────────────────────┐
        │  Fan-out per target  │  (partial-safe)
        └──────────┬───────────┘
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
  TABLICA      PODEJŚCIE      WYKWIITY
  identity       identity      identity
  scope          scope         scope
  KEEP-4         KEEP-4        KEEP-4
  qualify        qualify       qualify
     │             │             │
     └─────────────┼─────────────┘
                   ▼
        Evidence candidates[]
        (+ optional Candidate UI)
                   ▼
        [POPULATE GO only]
        batch evidence write
        union-by-dedupeKey + CAS
```

**This Design Freeze stage stops before any HTTP research and before any write.**

IMPLEMENT / POPULATE (future) may execute fetch + Evidence write under a **separate** Owner GO — still **without** Accept / OUR RATE / margin.

---

## 11. CAS / merge (**A2 CLOSED**)

| Rule | Decision |
|------|----------|
| Store | `kw-wgdom-labor-source-evidence` |
| Merge | **Union-by-dedupeKey** (Evidence SSOT) |
| Partial batch write | **UNION APPEND** only — e.g. A+C PASS, B FAIL → write A+C · B stays GAP |
| Concurrency | **etag / revision / CAS** — read → validate → write if unchanged else retry/merge |
| Empty-store guard | **REUSE** — never overwrite non-empty with empty/partial snapshot |
| Whole-store replacement | **FORBIDDEN** |
| Destructive rollback (drop good rows because one target failed) | **FORBIDDEN** |
| Catalog blob LWW | **NEVER** touch `kw-wgdom-work-catalog` for evidence |

---

## 12. Caps (LOCKED — do not change)

| Cap | Value |
|-----|------:|
| Global observations | **8000** |
| Per workId | **80** |
| Per sourceId | **2000** |
| Per batch write | **200** |

Over-cap → **explicitly reported** · no silent provenance wipe.

---

## 13. Failure handling (partial-safe)

| Condition | Per-target status | Batch effect |
|-----------|-------------------|--------------|
| Identity fail | **BLOCKED** | Continue other targets |
| Unit mismatch | **BLOCKED** | Continue |
| Ambiguous match | **UNMATCHED / BLOCKED** | Continue |
| Not labor-only / package mix | **REJECTED_PACKAGE** | Continue |
| Scope mismatch | **REJECTED_SCOPE** | Continue (may keep raw rejected evidence at populate) |
| Outlier (existing rule) | **REJECTED_OUTLIER** | Continue |
| No usable KEEP-4 evidence | **SOURCE GAP** | Continue |
| Cap hit | **REPORTED** | Continue / stop writes for overflow only |

**One target failure MUST NOT cancel the other two.**

Batch report MUST include per-target: status · observation counts · reject reasons · SOURCE GAP flags.

---

## 14. Safety boundaries

Research / future populate **MUST NOT** touch:

| Surface | Lock |
|---------|------|
| Work Catalog `companyPrice` | **NO WRITE** |
| OUR RATE / `ourWorkRate` | **NO WRITE** |
| `marginPct` / commercialPricing | **NO WRITE** |
| Accept / Candidate Accept | **NO** |
| Material Catalog | **NO** |
| Price Memory | **NO** |
| PASS2 MAX / allowlist | **NO CHANGE** |
| Mapping registry | **READ-ONLY** (exactly existing 2 Wave-1 rows) |
| Classification gate | **NO CHANGE** |
| D1 identity thresholds | **NO CHANGE** |

Control regression (must remain true after any future populate of this epic):

```text
companyPrice = 35 · OUR RATE = null · marginPct = 0
(for control work used in prior audits)
```

---

## 15. Acceptance criteria

### 15.1 Design Freeze (this stage) — DONE when

- [x] Scope = exactly 3 identity-ready LABOR targets  
- [x] Wykwity workId/identity frozen without invent  
- [x] Source priority KEEP-4 frozen · candidate hosts excluded  
- [x] Evidence schema + caps + CAS/merge reused  
- [x] Failure = partial-safe  
- [x] Accept / OUR RATE / margin / paint Accept / hygiene explicitly excluded  
- [x] ZERO code / HTTP / writes / commit  

### 15.2 Future IMPLEMENT / POPULATE (NOT this GO) — success sketch

| Criterion | Pass |
|-----------|------|
| Batch runs A+B+C without abort-on-first-fail | Required |
| Only KEEP-4 hosts contacted | Required |
| Evidence writes (if any) only to Evidence KV with provenance | Required |
| Registry still exactly 2 · no new maps | Required |
| Catalog counts 460/34/426 unchanged by this epic | Required |
| Accept / OUR RATE / margin untouched | Required |
| Per-target report includes BLOCKED / REJECTED_* / SOURCE GAP | Required |

### 15.3 Future Accept (NOT this epic)

Owner GO only · after Evidence exists and quality review.

---

## 16. Explicit exclusions

```text
OUT OF EPIC:
  - legacy-malowanie-m2 Accept Review / Accept / OUR RATE
  - Catalog Model Hygiene (legacy-gk · transport dual · multi-part demolition)
  - new workIds · new mappings · new hosts · allowlist expansion
  - Material Research · Material Catalog · Price Memory writes
  - PASS2 changes · qualify rewrite · median rewrite
  - classification gate changes · D1 engine rewrite
  - auto Accept · auto OUR RATE · auto margin
  - invent montaż workId for product SKUs
```

---

## 17. OWNER DECISION CLOSEOUT — A1–A3

> **Date:** 2026-08-14 · **No additional amendments**

| ID | Topic | Owner decision | Status |
|----|-------|----------------|--------|
| **A1** | Preflight / pipeline separation | **APPROVE** | **CLOSED** |
| **A2** | Partial write = union append · no whole-store replace / destructive rollback | **APPROVE** | **CLOSED** |
| **A3** | Identity bind preference · zero new aliases/maps · ambiguous → BLOCKED/UNMATCHED | **APPROVE** | **CLOSED** |

**Binding (summary):**

- **A1:** TARGET PREFLIGHT → then FETCH → PARSE → IDENTITY → SCOPE → QUALIFY · no stage bypass (§5.0).
- **A2:** PARTIAL = UNION APPEND of successful targets only · reuse union-by-dedupeKey · etag/revision/CAS · empty-store · caps unchanged (§11).
- **A3:** Wave-1 exact_normalized → Owner synonym/D1 → existing only · ZERO new aliases/mappings/buckets/threshold/engine (§3).

---

## 18. Safety snapshot (Closeout end)

| Check | Value |
|-------|--------|
| Evidence | rev **2** · etag **`r2-7a927415`** · **66** · **UNCHANGED** |
| Registry | **exactly 2** · **UNCHANGED** |
| Catalog | **460 / 34 / 426** · **UNCHANGED** |
| Control | companyPrice **35** · OUR RATE **null** · marginPct **0** |
| Writes | **0** |
| SOURCE GAP | **OPEN** |
| NICHE | **NOT CLAIMED** |

---

## FINAL STATUS

```text
DESIGN FREEZE              = APPROVED
ARCH REVIEW                = CLOSED
OWNER DECISION CLOSEOUT    = COMPLETE

A1 = CLOSED
A2 = CLOSED
A3 = CLOSED

IMPLEMENT     = LOCAL GREEN (v2.66.58 · undeployed)
COMMIT        = NOT DONE
PUSH          = NOT DONE
DEPLOY        = NOT DONE

Evidence      = fixture/local Evidence flow only (prod tip unchanged until COMMIT+deploy)
Registry      = 2
Catalog       = 460 / 34 / 426 (prod baseline)
companyPrice  = 35
OUR RATE      = null
marginPct     = 0
writes (prod) = 0
SOURCE GAP    = OPEN
NICHE         = NOT CLAIMED
```

**NEXT:** `OWNER GO: COMMIT — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`

**Nie** push / deploy bez Owner GO.  
**Nie** Accept / OUR RATE / margin.

**STOP.**
