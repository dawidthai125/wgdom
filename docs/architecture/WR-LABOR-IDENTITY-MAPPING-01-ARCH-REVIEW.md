# ARCH REVIEW — WR-LABOR-IDENTITY-MAPPING-01

> **Epic:** `WR-LABOR-IDENTITY-MAPPING-01`  
> **SSOT reviewed:** [`WR-LABOR-IDENTITY-MAPPING-01-DESIGN-FREEZE.md`](./WR-LABOR-IDENTITY-MAPPING-01-DESIGN-FREEZE.md)  
> **Prior evidence:** [`WR-SOURCE-EVIDENCE-DB-01-P0-GAP-CLOSURE-AUDIT.md`](./WR-SOURCE-EVIDENCE-DB-01-P0-GAP-CLOSURE-AUDIT.md)  
> **Production tip:** **2.66.54** / **`eb562dd`**  
> **Evidence DB:** `kw-wgdom-labor-source-evidence` · revision **2** · etag **`r2-7a927415`** · observations **66**  
> **Coverage baseline:** **8/89** matched · **SOURCE GAP = OPEN**  
> **Stage:** **ARCH REVIEW = CLOSED** · **OWNER DECISION CLOSEOUT = COMPLETE** · **IMPLEMENT = NOT DONE**  
> **Date:** 2026-08-14  
> **Status:** **ARCH REVIEW = CLOSED** · **Amendments A1–A12 = OWNER-APPROVED** · **IMPLEMENT = NOT DONE**

```text
ARCH REVIEW              = CLOSED (this file)
OWNER DECISION CLOSEOUT  = COMPLETE (A1–A12 CLOSED)
DESIGN FREEZE            = APPROVED
IMPLEMENT                = NOT DONE
COMMIT / PUSH / DEPLOY   = FORBIDDEN until Owner GO
KV / Evidence WRITE      = FORBIDDEN in Closeout
Catalog / Accept / OUR RATE / margin / Candidate = FORBIDDEN
NEW HOSTS / PASS2 / MAX / qualify / median / D1 thresholds = FORBIDDEN
```

---

## 1. Executive verdict

| Verdict | Value |
|---------|--------|
| **ARCH REVIEW** | **APPROVE WITH AMENDMENTS** |
| Hybrid **C** (B gate + A same-op aliases) | **APPROVE** |
| Operational mapping (not bucket absorb) | **APPROVE** (harden via A3 / A6) |
| D1 thresholds / loose match unchanged | **APPROVE** |
| Evidence DB isolation | **APPROVE** |
| Work Catalog isolation | **APPROVE** |
| Unit / laborOnly / scope / region boundaries | **APPROVE WITH AMENDMENTS** |
| Coverage claims as PROJECTION only | **APPROVE** |
| White-install HOLD (no new workId) | **APPROVE** |
| Host allowlist / source roles unchanged | **APPROVE** (reaffirm A7) |
| Test architecture M1–M16 | **APPROVE WITH AMENDMENTS** (expand DF §19) |

**Why not full APPROVE:** Design Freeze is directionally correct, but IMPLEMENT needs explicit hard locks that DF currently leaves soft or incomplete (catalog-unit bind check, v1 bucket policy, scope must-not-bypass, material flag immutability, alias-list size cap, call-site contract, expanded tests).

**Why not BLOCKED:** No architectural contradiction with Evidence DB, D1 scope, host lock, or payroll/catalog safety lessons. Amendments are design refinements for OWNER DECISION CLOSEOUT — **not** a redesign. **No amendment is implemented in this GO.**

```text
IMPLEMENT = NOT DONE
SOURCE GAP = OPEN
NICHE = NOT CLAIMED
Evidence = UNCHANGED (rev 2 / r2-7a927415 / 66)
OUR RATE / Accept / margin = NOT DONE
```

---

## 2. Architecture review — Hybrid C

### 2.1 Proposed pipeline (DF §6.3)

```text
parse
→ IDENTITY MAPPING (B · WORK_RATE_IDENTITY_MAPPING)
→ miss → D1 OWNER_SYNONYMS + namesLooselyMatch (A · locked)
→ scope (D1 classifyWorkRateEvidenceScopeTag)
→ qualify
→ existing aggregation / Evidence ingest (separate GO)
```

| Check | Result |
|-------|--------|
| B as first identity gate | **PASS** |
| A reserved for same-operation aliases | **PASS** |
| No second fuzzy engine | **PASS** — exact/normalized aliases only |
| D1 thresholds unchanged | **PASS** |
| Mapping before qualify/median | **PASS** |
| Mapping ≠ Evidence writer | **PASS** |

### 2.2 Why A-alone remains REJECTED

`listWorkRateMatchNamesPl` attaches **all** related synonyms to one `namePl`. Loading electrical family synonyms onto `Elektryka (szt)` would implement **bucket → all rows** — **BLOCKED** by critical safety rule.

### 2.3 Verdict

**APPROVE** Hybrid **C** with B as identity gate.

---

## 3. Critical safety — operational vs bucket

| Rule | DF status | ARCH |
|------|-----------|------|
| workId X → exact gniazdo aliases only | Explicit allowed pattern §21 | **PASS** |
| Separate X/Y/Z for gniazdo / wyłącznik / oprawa | Explicit | **PASS** |
| `Elektryka (szt)` → all electrical | FORBIDDEN §21 | **PASS** |
| `Hydraulika (szt)` → all plumbing | FORBIDDEN §21 | **PASS** |
| Generic buckets DEFAULT HOLD | §8 | **PASS** |
| Option (2) single-semantic bucket | Residual risk | **AMEND A3** |

**ARCH rule (binding for IMPLEMENT):** any mapping that binds a legacy family-bucket `workId` to more than one distinct operation concept = **BLOCKED** at review/test (M3).

---

## 4. OWNER_SYNONYMS boundary

| Check | Result |
|-------|--------|
| Remains SSOT for same-operation linguistic aliases | **PASS** |
| Grooves example (`szpachlowanie bruzd po kablach`) stays valid A-path | **PASS** |
| Must not be used to absorb whole family/bucket | **PASS** (intent) · **AMEND A10** (epic scope lock) |

---

## 5. Mapping schema review

DF §7 fields vs required constraints:

| Required | In DF | Adequate? |
|----------|-------|-----------|
| `mappingId` | Yes | **PASS** |
| `workId` | Yes | **PASS** + A12 existence check |
| `sourceId` | Yes (`*` allowed) | **PASS** |
| `categoryKey` | Yes (audit only, not absorb) | **PASS** |
| exact aliases | `observedNameAliases` | **PASS** + A1 name/mode lock |
| unit compatibility | `allowedUnits` | **PASS** + A2 catalog unit |
| `laborOnlyRequired` | Yes | **PASS** |
| `includesMaterialPolicy` | Yes | **PASS** + A4 P0 default |
| `allowedScopeTags` | Yes | **PASS** + A5 must-not-bypass D1 |
| `regionPolicy` | Yes | **PASS** + A8 no mutate |
| `confidence` | Yes | **PASS** |
| `ownerApproval` | Yes | **PASS** |
| `active` | Yes | **PASS** |
| `version` | Yes (+ table version) | **PASS** |
| `provenance` | Yes | **PASS** |

**Missing / soft → amendments:** exact match mode field, catalog-unit bind, alias cardinality cap, workId existence gate.

---

## 6. Unit safety

| Check | Result |
|-------|--------|
| No silent unit conversion | **PASS** (DF §9) |
| szt ≠ mb ≠ m2 ≠ rbh ≠ kpl ≠ m3 | **PASS** |
| Bind requires observed unit ∈ `allowedUnits` | **PASS** |
| Catalog work unit must also be compatible | **AMEND A2** |

---

## 7. Labor-only / material

| Check | Result |
|-------|--------|
| Mapping must not invent `laborOnly=true` on package rows | **PASS** |
| Mapping must not strip `includesMaterial` / `laborOnly` flags | **AMEND A4** (explicit immutability) |
| P0 default reject material-inclusive | **PASS** intent · **AMEND A4** (disable `allow_flagged` in v1) |

---

## 8. Scope

| Check | Result |
|-------|--------|
| Reuse D1 `classifyWorkRateEvidenceScopeTag` | **PASS** |
| No second scope engine | **PASS** |
| Mapping must not bypass walls_ceilings / joinery / artistic guards | **AMEND A5** |
| `allowedScopeTags: null` means “no *extra* mapping filter”, not “skip D1” | **AMEND A5** (clarify) |

---

## 9. Region

| Check | Result |
|-------|--------|
| WROCLAW > regional > POLSKA preference | **PASS** |
| NATIONAL legal | **PASS** |
| No POLSKA → WROCLAW rewrite | **PASS** |
| Mapping must not mutate observation region fields | **AMEND A8** |

---

## 10. Evidence DB

| Check | Result |
|-------|--------|
| Separate SSOT `kw-wgdom-labor-source-evidence` | **PASS** |
| Mapping = identity relation only | **PASS** |
| No copy into `kw-wgdom-work-catalog` | **PASS** |
| No auto Evidence write in this epic | **PASS** |
| Current rev/etag/obs unchanged by mapping design | **PASS** |

---

## 11. Dedupe / CAS

| Check | Result |
|-------|--------|
| `dedupeKey` remains Evidence SSOT | **PASS** |
| Union-by-dedupeKey unchanged | **PASS** |
| No whole-store LWW introduced by mapping | **PASS** (code-time registry v1) |
| No silent re-key of existing 66 obs | **PASS** |
| New bind after prior UNMATCHED = new ingest path, not destructive mutate | **PASS** |
| revision / etag/CAS owned by Evidence store, not mapping table | **PASS** |

**Risk note:** changing `workId` on a *future* ingest changes dedupeKey components — acceptable only for **new** observations; historical rows stay. **APPROVE**.

---

## 12. Source priority / hosts

| Check | Result |
|-------|--------|
| Epic does not expand `WORK_RATE_ALLOWED_HOSTS` | **PASS** |
| Candidate hosts still need Owner approval | **PASS** |
| Source roles KB/CR/Extradom PRIMARY · SCCOT SECONDARY · Zleca REFERENCE | **AMEND A7** (reaffirm explicitly; DF omitted roles) |

---

## 13. Coverage claim

| Claim | Classification | ARCH |
|-------|----------------|------|
| Current **8/89** | Measured baseline (Evidence rev 2) | **PASS** |
| Conservative **~14–18/89** | **PROJECTION** after mapping+populate | **PASS** — DF §23 labels projection |
| Optimistic **~20–28/89** | **PROJECTION** | **PASS** |
| Guaranteed post-IMPLEMENT coverage | Not claimed | **PASS** |

**Binding language for all downstream docs:** projections are **not** promised outcomes until IMPLEMENT + separate populate GO + re-measure unique matched workIds.

---

## 14. Target families

| Family | Strategy | ARCH |
|--------|----------|------|
| Electrical | Map only specific non-bucket works (`p2b-punkt…`, `p2b-tablica…`); legacy buckets HOLD | **APPROVE** + A3 |
| Plumbing | Map podejście / zawory; legacy hydraulika/gaz HOLD | **APPROVE** |
| CO | Prefer HOLD; single-op only with Owner GO | **APPROVE** + A3 |
| Demolition | Concrete aliases per workId; no `Rozbiórki (*)` absorb | **APPROVE** |
| Waste | m3 cautious; kpl package-risk default reject | **APPROVE** |
| White install | **HOLD** — zero catalog workIds; **no new workId** in this epic | **APPROVE** |

CR “Montaż gniazd…” without a gniazdo `workId` → remains unmatched / inventory only. **Correct.**

---

## 15. Forbidden surface (hard lock)

Mapping epic MUST NOT:

| Action | DF | ARCH |
|--------|----|------|
| Create workId | Forbidden | **PASS** |
| Create Candidate | Forbidden | **PASS** |
| Auto-Accept | Forbidden | **PASS** |
| Write OUR RATE | Forbidden | **PASS** |
| Change margin / companyPrice | Forbidden | **PASS** |
| Write Work Catalog | Forbidden | **PASS** |
| Expand hosts | Forbidden | **PASS** |
| Change PASS2 / MAX | Forbidden | **PASS** |
| Change qualify / median / D1 thresholds | Forbidden | **PASS** |
| Seed / populate / KV write | Forbidden in this epic | **PASS** |

---

## 16. Test architecture (minimum M1–M16)

DF §19 had M1–M12. ARCH expands to Owner-required set:

| ID | Assertion | Required |
|----|-----------|----------|
| **M1** | Exact mapping PASS (alias → correct workId) | YES |
| **M2** | Wrong observedName BLOCK | YES |
| **M3** | Bucket-to-all BLOCK (no family absorb) | YES |
| **M4** | Unit mismatch BLOCK (incl. catalog unit) | YES |
| **M5** | Labor/material mismatch BLOCK; flags preserved | YES |
| **M6** | Scope mismatch BLOCK (D1 guards still apply) | YES |
| **M7** | Region preservation (no POLSKA→WROCLAW) | YES |
| **M8** | Owner approval required for production bind | YES |
| **M9** | Inactive mapping ignored | YES |
| **M10** | Versioning (row/table version in provenance) | YES |
| **M11** | Dedupe interaction (no silent duplicate / no LWW) | YES |
| **M12** | Evidence DB isolation (no Evidence write in resolve) | YES |
| **M13** | Work Catalog isolation (no catalog write) | YES |
| **M14** | Existing D1 synonym fallback still PASS (grooves) | YES |
| **M15** | No new workId created | YES |
| **M16** | No Candidate / OUR RATE / Accept side effects | YES |

Also retain DF extras: ambiguity fail-closed · MEDIUM/LOW no prod bind · threshold snapshot.

---

## 17. Rollback

| Mechanism | ARCH |
|-----------|------|
| `active=false` soft kill | **PASS** |
| Git revert of mapping module | **PASS** |
| No destructive Evidence mutation on rollback | **PASS** |
| Historical observations retained | **PASS** |

**APPROVE** rollback design.

---

## 18. Amendments (NOT implemented)

### A1 — Exact match mode lock

Add explicit field (name TBD):

```text
matchMode: "exact_normalized"  // ONLY allowed value in v1
```

`observedNameAliases` = exact aliases after case/diacritics/whitespace normalize.  
**Forbidden in v1:** regex, token-jaccard, “contains family keyword”.

### A2 — Catalog unit compatibility

Bind requires **both**:

1. observed unit ∈ `allowedUnits`
2. catalog work unit ∈ `allowedUnits` (or explicit equality with observed after normalize)

No Owner-approved cross-unit rule in v1 → **BLOCK bind**.

### A3 — v1 bucket policy (Owner decision required)

**Recommended default for IMPLEMENT v1:**

```text
FORBID any mapping whose workId matches legacy family buckets:
  legacy-elektryka-* · legacy-hydraulika-* · legacy-instalacje_gaz-*
  legacy-rozbiorki-* · legacy-instalacje_co-* (unless separate Owner GO)
```

DF option (2) “bucket means ONLY X” deferred to a **named Owner GO** with mandatory:

```text
bucketSingleSemanticAcknowledged: true
```

plus single-operation alias set (still not multi-op absorb).

### A4 — Material / labor flag immutability + P0 policy

- Resolve MUST NOT mutate `laborOnly` / `includesMaterial` on the observation.
- Reject bind when policy says reject; do not “fix” flags.
- v1: `includesMaterialPolicy` allowed values = **`reject` | `require_labor_only` only**.  
  `allow_flagged` = **OUT OF SCOPE** until separate Owner GO.

### A5 — Scope must-not-bypass

Clarify DF §11:

```text
allowedScopeTags: null  ⇒  no *additional* mapping filter
                         ≠  skip D1 classify / listAllowedWorkRateEvidenceScopeTags
```

After mapping HIT, pipeline **must** still run D1 scope filters before qualify/ingest.

### A6 — Alias cardinality guard

Per `mappingId`, cap exact aliases (recommended **≤ 12** unless Owner raises).  
Purpose: prevent soft bucket absorb via huge alias dumps.  
Test: oversized alias set → registry validation FAIL.

### A7 — Source roles reaffirmation

This epic does **not** change:

| Source | Role |
|--------|------|
| KB / CennikRemontow / Extradom | PRIMARY |
| SCCOT | SECONDARY |
| Zleca | REFERENCE |
| Other candidates | NEEDS OWNER APPROVAL |

No allowlist expansion.

### A8 — Region immutability

`resolveLaborIdentityMapping` must not rewrite region on the row.  
Preference order applies only to **selection/ranking** in existing aggregation — not identity truth.

### A9 — Call-site contract

Identity mapping runs:

```text
AFTER parse extracts {observedName, unit, flags, region, prices}
BEFORE qualify / median / Evidence ingest commit
```

Parser thresholds and HTML extract logic remain unchanged.  
Research UI Candidate path (if any) may *read* resolve for display only — **no Accept**.

### A10 — OWNER_SYNONYMS epic scope

This epic MUST NOT add OWNER_SYNONYMS rows that relate a **family bucket** namePl to multiple concrete market operations.  
Optional A-path additions limited to **same-operation** aliases for already-specific non-bucket works (Owner-reviewed).

### A11 — Ambiguity + confidence gate (confirm)

Production bind requires:

```text
active && ownerApproval && confidence === "HIGH" && unique match
```

≥2 HIGH hits → miss + `AMBIGUOUS_MAPPING`.

### A12 — workId existence / labor gate

Resolve HIT only if `workId` exists in Work Catalog (read-only) and is an active labor-eligible work (existing commercial labor floor helper or equivalent).  
Missing / inactive → miss (fail closed). **Never create workId.**

---

## 19. Amendment summary table

| ID | Topic | Owner decision | Status |
|----|-------|----------------|--------|
| A1 | Exact match mode only | `exact_normalized` | **CLOSED / APPROVED** |
| A2 | Catalog unit check | catalogUnit + observedUnit · no implicit conversion | **CLOSED / APPROVED** |
| A3 | v1 bucket FORBID | **FORBIDDEN** | **CLOSED / APPROVED** |
| A4 | Flag immutability · no allow_flagged v1 | Mutation **FORBIDDEN** | **CLOSED / APPROVED** |
| A5 | Scope must-not-bypass | Bypass **FORBIDDEN** | **CLOSED / APPROVED** |
| A6 | Alias cardinality cap | **MAX 12** | **CLOSED / APPROVED** |
| A7 | Source roles reaffirm | Unchanged | **CLOSED / APPROVED** |
| A8 | Region immutability | Mutation **FORBIDDEN** | **CLOSED / APPROVED** |
| A9 | Call-site contract | Identity-stage only | **CLOSED / APPROVED** |
| A10 | Synonyms epic scope | Same-op only | **CLOSED / APPROVED** |
| A11 | Confidence/ambiguity gate | AMBIGUOUS / UNMATCHED | **CLOSED / APPROVED** |
| A12 | workId existence gate | REQUIRED · no create | **CLOSED / APPROVED** |

---

## 20. Final status (superseded by §22)

> See sections 21–22 for Owner Decision Closeout.

---

## 21. OWNER DECISION CLOSEOUT (2026-08-14)

> **Verdict carried:** APPROVE WITH AMENDMENTS → **Owner accepted A1–A12**  
> **DESIGN FREEZE:** **APPROVED**  
> **ARCH REVIEW:** **CLOSED**  
> **IMPLEMENT:** **NOT DONE**

| ID | Decision | Status |
|----|----------|--------|
| A1 exact_normalized | `matchMode = exact_normalized` · no fuzzy v1 | **APPROVED** |
| A2 catalogUnit/observedUnit | Store both · no implicit conversion | **APPROVED** |
| A3 legacy bucket mapping | **FORBIDDEN** in v1 | **APPROVED = FORBID** |
| A4 labor/material mutation | **FORBIDDEN** · no `allow_flagged` v1 | **APPROVED** |
| A5 D1 scope bypass | **FORBIDDEN** | **APPROVED** |
| A6 aliases per mappingId | **MAX 12** | **APPROVED** |
| A7 source roles | Unchanged PRIMARY/SECONDARY/REFERENCE | **APPROVED** |
| A8 region mutation | **FORBIDDEN** · never POLSKA→WROCLAW | **APPROVED** |
| A9 identity-only call-site | APPROVED pipeline only | **APPROVED** |
| A10 synonym scope | Same-op only · bucket absorb FORBIDDEN | **APPROVED** |
| A11 ambiguity | BLOCK / UNMATCHED · no auto-pick | **APPROVED** |
| A12 workId existence | REQUIRED · no create · white-install HOLD | **APPROVED** |

```text
A1–A12 = CLOSED
OPEN clarifications = NONE
```

---

## 22. Final status (post-Closeout)

```text
ARCH REVIEW              = CLOSED
OWNER DECISION CLOSEOUT  = COMPLETE
DESIGN FREEZE            = APPROVED
Amendments A1–A12        = CLOSED (Owner-approved · NOT coded)
IMPLEMENT                = NOT DONE
SOURCE GAP               = OPEN
NICHE                    = NOT CLAIMED
Evidence DB              = UNCHANGED (rev 2 / r2-7a927415 / 66)
Coverage                 = 8/89 measured · ~14–18/89 PROJECTION only
KV                       = 0
Commit / Push / Deploy   = NOT DONE
```

**NEXT OWNER GO:** `OWNER GO: IMPLEMENT — WR-LABOR-IDENTITY-MAPPING-01`

**STOP.**