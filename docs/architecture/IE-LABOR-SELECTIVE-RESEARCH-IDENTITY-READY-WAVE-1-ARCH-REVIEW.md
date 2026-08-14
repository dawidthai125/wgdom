# ARCH REVIEW — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1

> **Epic:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **SSOT Design Freeze:** [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-DESIGN-FREEZE.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-DESIGN-FREEZE.md)  
> **Owner Decision (Blocker):** [`INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-OWNER-DECISION-CLOSEOUT.md`](./INTELLIGENT-ESTIMATOR-COVERAGE-WAVE-1-BLOCKER-OWNER-DECISION-CLOSEOUT.md)  
> **Evidence SSOT:** [`WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md`](./WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md) · Arch [`WR-SOURCE-EVIDENCE-DB-01-ARCH-REVIEW.md`](./WR-SOURCE-EVIDENCE-DB-01-ARCH-REVIEW.md)  
> **Tip:** **2.66.57** / **`769e52cf`**  
> **Date:** 2026-08-14  
> **Mode:** **ARCH REVIEW = CLOSED** · **OWNER DECISION CLOSEOUT = COMPLETE** · A1–A3 **CLOSED** · **ZERO CODE**

```text
DESIGN FREEZE              = APPROVED
ARCH REVIEW                = CLOSED (was APPROVE WITH AMENDMENTS)
OWNER DECISION CLOSEOUT    = COMPLETE · A1–A3 CLOSED
IMPLEMENT / POPULATE       = LOCAL GREEN (v2.66.58 · undeployed)
COMMIT / PUSH / DEPLOY     = NOT DONE
Accept / OUR RATE / margin = FORBIDDEN this epic
SOURCE GAP                 = OPEN
NICHE                      = NOT CLAIMED
```

```text
ZERO CODE · ZERO RESEARCH HTTP · ZERO EVIDENCE WRITE · ZERO CATALOG WRITE
ZERO KV WRITE · ZERO MAPPING WRITE · ZERO ACCEPT · ZERO OUR RATE · ZERO MARGIN
ZERO NEW HOSTS · ZERO ALLOWLIST EXPAND · ZERO PASS2 / qualify / median / D1 CHANGE
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 1. Executive verdict

| Verdict | Value |
|---------|--------|
| **ARCH REVIEW** | **APPROVE WITH AMENDMENTS** |
| Batch research architecture | **APPROVE** (harden via **A1**) |
| Identity — Tablica / Podejście / Wykwity | **APPROVE** (harden via **A3**) |
| Plane separation LABOR → Evidence → Candidate ≠ Accept / OUR RATE / margin | **APPROVE** |
| Source priority KEEP-4 · candidate hosts excluded | **APPROVE** |
| D1 / scope / labor-only / region reuse | **APPROVE** |
| Evidence SSOT · union · CAS · caps · empty-store | **APPROVE** (harden via **A2**) |
| Partial-safe failure isolation | **APPROVE** (harden via **A2**) |
| No Work Catalog / Material / Price Memory / Accept / OUR RATE / margin impact | **APPROVE** |
| Host expansion required by DF? | **NO** · **PASS** |

**Why not full APPROVE (historical):** Design Freeze conflated target preflight with observation pipeline order; IMPLEMENT needed explicit partial-write + identity bind locks. Amendments were documentation/contract hardening — not a redesign.

**Owner Decision Closeout:** **A1–A3 = APPROVED = CLOSED** · no further amendments · see §9–§10a.

**Why not BLOCKED:** No requirement for forbidden hosts · no bucket mapping · no invent workId · no Accept/OUR RATE path · Evidence isolation intact · three targets identity-ready as frozen.

**No amendment is implemented in this GO (docs bind only).**

---

## 2. Checklist (15 review axes)

| # | Axis | Result | Notes |
|---|------|--------|-------|
| 1 | Batch research architecture | **PASS** + **A1** | Fan-out 3 targets · one epic · Evidence then optional Candidate |
| 2 | Identity — all 3 targets | **PASS** + **A3** | See §3 |
| 3 | Separation LABOR / Evidence / Candidate / Accept / OUR RATE / margin | **PASS** | Accept/OUR RATE/margin forbidden this epic forever |
| 4 | Source priority | **PASS** | KEEP-4 only · candidate hosts FORBIDDEN |
| 5 | D1 reuse | **PASS** | Synonyms + `classifyWorkRateEvidenceScopeTag` · no second engine |
| 6 | Scope boundary | **PASS** + **A1** | Scope before aggregation · must not bypass |
| 7 | Labor-only semantics | **PASS** | REJECTED_PACKAGE · no allow_flagged |
| 8 | Region handling | **PASS** | NATIONAL legal · no force WRO · no relabel |
| 9 | Partial-safe batch | **PASS** + **A2** | Per-target continue · no abort-all |
| 10 | Evidence SSOT | **PASS** | `kw-wgdom-labor-source-evidence` |
| 11 | Union-by-dedupeKey | **PASS** | Reuse Evidence DF |
| 12 | etag / revision / CAS | **PASS** | Reuse Evidence DF |
| 13 | Caps 8000 / 80 / 2000 / 200 | **PASS** · **LOCKED** | Unchanged |
| 14 | Failure isolation | **PASS** + **A2** | BLOCKED / REJECTED_* / SOURCE GAP per target |
| 15 | No Catalog / Material / PM / Accept / OUR RATE / margin | **PASS** | Explicit NO WRITE |

---

## 3. Identity review

### 3.1 TABLICA — **PASS**

| Check | Result |
|-------|--------|
| Concrete operation ↔ concrete workId | **PASS** — `p2b-tablica-rozdzielcza-mieszkaniowa-szt` ↔ `Montaż skrzynki rozdzielczej` |
| mappingId | `lim-w1-tablica-rozdzielcza-cr` · existing Wave-1 |
| matchMode | `exact_normalized` |
| Bucket mapping | **ABSENT** · **PASS** |
| Unit | `szt` = `szt` |

### 3.2 PODEJŚCIE — **PASS**

| Check | Result |
|-------|--------|
| Concrete operation ↔ concrete workId | **PASS** — `p2b-podejscie-wod-kan-mb` ↔ CR podejście wod-kan |
| mappingId | `lim-w1-podejscie-wod-kan-cr` · existing Wave-1 |
| matchMode | `exact_normalized` |
| Bucket mapping | **ABSENT** · **PASS** |
| Unit | `mb` = `mb` |

### 3.3 WYKWIITY — **PASS**

| Check | Result |
|-------|--------|
| workId exists | **PASS** — `cc-w2-wykwity-zacieki` |
| Owner synonyms exist (D1 table) | **PASS** — `wykwity` · `zaciek` · `zacieki` · `usuwanie wykwitów` · `usuwanie zacieków` · `skasowanie wykwitów` |
| New mapping | **NONE** · **PASS** |
| Scope bypass | **FORBIDDEN** in DF · **PASS** |
| Threshold expand | **FORBIDDEN** · **PASS** |
| Invent workId / aliases | **FORBIDDEN** · **PASS** |

Runtime SOURCE GAP (missing dedicated repairs URL on KEEP-4) remains **allowed** and does **not** block architecture.

---

## 4. Source policy review

| Policy | DF | Arch |
|--------|-----|------|
| PRIMARY kb.pl · cennikremontow.pl | Frozen | **PASS** |
| SECONDARY SCCOT · Extradom | Frozen | **PASS** |
| Candidate hosts (Kul-Bud · Budowalka · Murator · Ogarnij Remont · Zleca · CennikiBudowlane) | FORBIDDEN | **PASS** |
| DF requires any candidate host? | **NO** | **No AMENDMENT / no BLOCKER** |
| Allowlist / PASS2 / MAX change | FORBIDDEN | **PASS** |

---

## 5. Research / pipeline / planes

### 5.1 Intended observation pipeline (Arch binding — see **A1**)

```text
TARGET PREFLIGHT (per workId):
  CLASSIFY → LABOR
  → Work Catalog OUR RATE MISS
  → identity readiness (Wave-1 map OR D1 synonyms present)
  → batch include

OBSERVATION PIPELINE (per fetched page / row):
  KEEP-4 FETCH
  → PARSE
  → IDENTITY (mapping exact_normalized OR Owner synonym / exact — A3)
  → SCOPE (classifyWorkRateEvidenceScopeTag · listAllowed… · before qualify)
  → QUALIFY (existing · locked)
  → Evidence candidate (+ provenance)
  → Candidate (optional · derived / UI)
STOP.
```

**MUST NOT** continue to: Accept · OUR RATE · margin.

### 5.2 Labor-only

| Rule | Arch |
|------|------|
| Seek labor price only | **PASS** |
| Material / product / komplet / unknown material share ≠ labor | **PASS** |
| Unconfirmed laborOnly → reject / hold | **PASS** (`REJECTED_PACKAGE` / materials reject) |
| `allow_flagged` | **FORBIDDEN** · **PASS** |

### 5.3 Region / D1 / qualify

| Rule | Arch |
|------|------|
| NATIONAL / POLSKA legal | **PASS** |
| No force Wrocław · no NATIONAL→WRO relabel | **PASS** |
| Preference via existing engine | **PASS** |
| Reuse `WORK_RATE_OWNER_SYNONYMS` · `classifyWorkRateEvidenceScopeTag` · existing qualify · existing median | **PASS** |
| No second identity engine | **PASS** |
| namesLooselyMatch / threshold / PASS2 / MAX / hosts unchanged | **PASS** + **A3** |

---

## 6. Evidence / concurrency / caps

| Contract | Arch |
|----------|------|
| SSOT `kw-wgdom-labor-source-evidence` | **PASS** |
| Schema fields (evidenceId…dedupeKey) | **PASS** · reuse Evidence DF |
| Range KEEP · midpoint DERIVED only | **PASS** |
| Union-by-dedupeKey | **PASS** |
| etag / revision / CAS | **PASS** |
| Empty-store guard | **PASS** |
| Caps 8000 / 80 / 2000 / 200 | **PASS** · **LOCKED** |
| Destructive whole-store LWW / catalog blob write | **FORBIDDEN** · **PASS** |

---

## 7. Partial-safe / failure isolation

| Scenario | Required behavior | Arch |
|----------|-------------------|------|
| Tablica PASS · Podejście SOURCE GAP · Wykwity PASS | Batch **PARTIAL** · continue | **PASS** |
| Identity / unit / ambiguous fail | Per-target BLOCKED / UNMATCHED · continue | **PASS** |
| Package / scope / outlier | REJECTED_* · continue | **PASS** |
| Destructive rollback of entire Evidence store because one target failed | **FORBIDDEN** | **PASS** + **A2** |
| Abort remaining targets on first failure | **FORBIDDEN** | **PASS** |

---

## 8. Out of scope / forbidden (reaffirm)

```text
OUT / FORBIDDEN (unchanged):
  legacy-malowanie-m2 Accept
  Catalog Model Hygiene
  Material coverage / Material Catalog / Price Memory
  new workIds · new mapping Wave-2 · invent aliases
  host expansion · allowlist expand
  Evidence/Catalog write in THIS Arch Review stage
  Accept · OUR RATE · margin
  classification / D1 / PASS2 / qualify / median changes
  bucket mapping
```

---

## 9. Amendments — Owner Decision Closeout

### A1 — Observation pipeline order — **APPROVED · CLOSED**

| Field | Value |
|-------|--------|
| **Owner decision** | **APPROVE** |
| **Binding** | TARGET PREFLIGHT (eligibility / identity readiness; may reject **before** fetch) → then FETCH → PARSE → IDENTITY → SCOPE → QUALIFY |
| **Locks** | fetch ≠ identity success · parse must not bypass identity · identity must not bypass scope · scope must not bypass qualify |
| **Code** | Do not change existing engines beyond applying this contract in future IMPLEMENT |

### A2 — Partial Evidence write — **APPROVED · CLOSED**

| Field | Value |
|-------|--------|
| **Owner decision** | **APPROVE** |
| **Binding** | PARTIAL = **UNION APPEND** · e.g. A+C write · B stays GAP/failure |
| **Forbidden** | WHOLE-STORE REPLACEMENT · DESTRUCTIVE ROLLBACK · deleting previously good Evidence because one target failed |
| **Reuse** | union-by-dedupeKey · etag · revision · CAS · empty-store guard |
| **Caps** | 8000 / 80 / 2000 / 200 **LOCKED** |

### A3 — Identity bind preference — **APPROVED · CLOSED**

| Field | Value |
|-------|--------|
| **Owner decision** | **APPROVE** |
| **Preference** | (1) Wave-1 `exact_normalized` mapping · (2) existing Owner synonym / D1 · then other **existing** mechanisms only if already allowed |
| **Forbidden** | new aliases · new mappings · bucket mapping · threshold relaxation · second identity engine · invent alias |
| **Ambiguous** | **BLOCKED / UNMATCHED** |

**No A4+.** No additional Owner amendments.

---

## 10. Amendment summary

| ID | Owner | Status |
|----|-------|--------|
| **A1** | **APPROVE** | **CLOSED** |
| **A2** | **APPROVE** | **CLOSED** |
| **A3** | **APPROVE** | **CLOSED** |

---

## 10a. OWNER DECISION CLOSEOUT

```text
OWNER DECISION CLOSEOUT = COMPLETE

A1 = CLOSED
A2 = CLOSED
A3 = CLOSED

Additional amendments = NONE
DESIGN FREEZE         = APPROVED
ARCH REVIEW           = CLOSED
IMPLEMENT             = NOT DONE
```

SSOT wording also bound in Design Freeze §3 · §5.0 · §11 · §17.

---

## 11. Safety snapshot (Arch Review end)

| Check | Value |
|-------|--------|
| Evidence | rev **2** · etag **`r2-7a927415`** · obs **66** · **UNCHANGED** |
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

Evidence = fixture/local Evidence flow only (prod tip unchanged until COMMIT+deploy)
Registry = 2
Catalog  = 460 / 34 / 426
companyPrice = 35
OUR RATE = null
marginPct = 0
writes (prod) = 0
SOURCE GAP = OPEN
NICHE = NOT CLAIMED
```

**NEXT:** `OWNER GO: COMMIT — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`

**Nie** push / deploy bez Owner GO.  
**Nie** Accept / OUR RATE / margin.

**STOP.**
