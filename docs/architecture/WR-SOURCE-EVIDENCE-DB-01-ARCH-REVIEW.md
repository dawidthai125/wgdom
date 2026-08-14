# ARCH REVIEW — WR-SOURCE-EVIDENCE-DB-01

> **Epic:** `WR-SOURCE-EVIDENCE-DB-01`  
> **SSOT reviewed:** [`WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md`](./WR-SOURCE-EVIDENCE-DB-01-DESIGN-FREEZE.md)  
> **Context tip:** Production **2.66.53** / **`acbfda32`** · D1 LIVE = **PASS** · SOURCE GAP = **OPEN**  
> **Stage:** **ARCH REVIEW** → **OWNER DECISION CLOSEOUT**  
> **Date:** 2026-08-14  
> **Status:** **ARCH REVIEW = CLOSED** · **DESIGN FREEZE = APPROVED** · **IMPLEMENT = LOCAL GREEN** (2.66.54)  
> **Amendments A1–A7:** **CLOSED**

```text
ARCH REVIEW              = THIS FILE (CLOSED)
IMPLEMENTATION           = LOCAL GREEN (2.66.54)
COMMIT / PUSH / DEPLOY   = FORBIDDEN until Owner GO COMMIT
KV / ACCEPT / OUR RATE   = FORBIDDEN
NEW HOSTS / CRAWLER      = FORBIDDEN
```

---

## 1. Executive verdict

| Verdict | Value |
|---------|--------|
| **ARCH REVIEW** | **APPROVE WITH AMENDMENTS** |
| Core boundary (Evidence ≠ Catalog ≠ OUR RATE) | **APPROVE** |
| Separate KV `kw-wgdom-labor-source-evidence` | **APPROVE** |
| Union-by-dedupeKey (not whole-store LWW) | **APPROVE** (with concurrency amendment) |
| D1 identity/scope reuse | **APPROVE** |
| Host lock / no auto discovery | **APPROVE** |
| D-IMPORT empty · D-UI defer | **APPROVE** |
| Caps 5k–10k / 50–100 per work | **APPROVE WITH AMENDMENTS** (add per-source + eviction policy) |
| Schema | **APPROVE WITH AMENDMENTS** (mandatory `dedupeKey` · recommended extras below) |

**Why not full APPROVE without amendments:** DF is sound, but IMPLEMENT must hard-lock (1) observation-level merge + empty-store guard, (2) explicit concurrency / version token, (3) cap eviction that never drops last VALID provenance for a work, (4) a few schema fields that otherwise become ad-hoc later.

**Why not BLOCKED:** No architectural contradiction with D1, legal gate, PASS2 host lock, or catalog migration-safety lessons. Amendments are design refinements, not redesign.

```text
IMPLEMENT = LOCAL GREEN (2.66.54)
COMMIT = NOT DONE
PUSH = NOT DONE
DEPLOY = NOT DONE
KV = NOT DONE
ACCEPT = NOT DONE
OUR RATE = NOT DONE
SOURCE GAP = OPEN
NICHE = NOT CLAIMED
```

---

## AR-01 Storage

### Owner proposal
`kw-wgdom-labor-source-evidence` · Option **A** separate KV / SSOT.

### Review

| Check | Result |
|-------|--------|
| Correct boundary vs Work Catalog | **PASS** — Evidence must not live in `kw-wgdom-work-catalog` |
| Risk of catalog wipe via evidence write | **MITIGATED** if writers never call catalog save/merge/persist |
| Whole-store LWW on evidence blob | **REJECT as sole merge** — see AR-02 / AR-16 |
| Parallel writes | Safe only with **union merge** + optional version/etag — not timestamp-wins |
| Work Catalog accidental overwrite | **PASS** if module isolation + tests E14 |

### Amendment A1 — Persistence contract

Evidence module MAY:

- read CatalogWork **read-only** (workId, namePl, unit) for matching  
- write **only** `kw-wgdom-labor-source-evidence`

Evidence module MUST NOT:

- `saveWorkCatalogStoreLocal` / `persistKey(WORK_CATALOG_STORAGE_KEY)`  
- patch `ourWorkRate` / `companyPricePln` / `commercialPricing`  
- bump catalog `updatedAt`

### Verdict
**APPROVE** Option A + Amendment A1.

---

## AR-02 Merge

### Owner proposal
**UNION-BY-DEDUPE-KEY** · not whole-store LWW.

### Model (approved)

```text
existing.observations
  ∪  incoming.observations
  → normalize
  → group by dedupeKey
  → per-key policy (keep VALID preferred / newest retrievedAt / history ring)
  → new store snapshot { schemaVersion, updatedAt, observations[], tombstones? }
```

### Race: Writer A + Writer B

| Bad pattern | Risk |
|-------------|------|
| Read → replace entire blob with local-only set → write | Destructive partial overwrite (LWW incident class) |
| `updatedAt` newer wins whole document | Same class as 460→34 |

| Safe pattern (Amendment A2) | |
|-----------------------------|--|
| 1 | Each writer produces **delta** (upserts + optional tombstones) |
| 2 | Cloud/local merge = **union** of observations by `evidenceId`/`dedupeKey` |
| 3 | Optional `revision` / `etag` / Edge compare-and-swap for last write of merged result |
| 4 | Empty or tiny incoming snapshot **never** replaces larger store (authority guard analogous to catalog) |

### History
Dedupe **upserts** current row for a key; prior retrievals go to optional history ring or prior row marked `STALE` — **not** hard-deleted.

### Verdict
**APPROVE** union-by-dedupe + **Amendment A2** (delta + empty-guard + optional revision).

---

## AR-03 Schema

### Minimum fields (Owner list) — **APPROVE** all

`evidenceId`, `workId`, `sourceId`, `sourceUrl`, `categoryKey`, `observedName`, `unit`, `priceMin`, `priceMax`, `pricePoint`, `region`, `country`, `scopeTag`, `identityMethod`, `synonymUsed`, `observedAt`, `retrievedAt`, `provenance`, `qualityStatus`

### Additional fields

| Field | Verdict | Justification |
|-------|---------|---------------|
| `dedupeKey` | **MANDATORY** | Merge/upsert without re-deriving inconsistently |
| `currency` | **MANDATORY** | Qualify gate; non-PLN reject |
| `priceKind` | **MANDATORY** | point / range / from_floor / unknown — preserves semantics |
| `laborOnly` / `includesMaterial` | **MANDATORY** | Qualify outcome persistence |
| `identityMatched` | **RECOMMENDED** | Explicit boolean next to method |
| `parserVersion` | **RECOMMENDED** | Replay / invalidate when parser changes |
| `sourceSnapshotHash` | **OPTIONAL** | Detect page change without storing HTML |
| `rawText` / `rawEvidence` | **OPTIONAL · CAP tightly** | Debug only; do not store full HTML in KV by default |
| `observationType` | **OPTIONAL** | labor_unit / package / editorial — helps REJECTED_OUTLIER |
| `sourceRole` | **RECOMMENDED** | PRIMARY/SECONDARY/REFERENCE snapshot at ingest |
| `confidence` | **DEFER** | Subjective; avoid fake precision in MVP |
| `staleAt` | **RECOMMENDED** | When marked STALE / superseded |

### Amendment A3
Treat `dedupeKey`, `currency`, `priceKind`, `laborOnly`, `includesMaterial` as **required** in schema v1.

### Verdict
**APPROVE WITH AMENDMENTS** (A3).

---

## AR-04 Provenance

### Requirement
Every price answers: **SKĄD? KIEDY? CO? JEDNOSTKA? REGION? JAK ZMATCHOWANO?**

### Review
DF provenance object covers sourceId/URL/name/region/unit/raw prices/retrievedAt/identity/scope. **Anonymous evidence FORBIDDEN** — **APPROVE**.

### Amendment A4
`provenance` MUST be denormalized enough to answer the six questions **without** joining other stores. `workId` may be null only for `UNMATCHED`.

### Verdict
**APPROVE** + A4.

---

## AR-05 Identity

| Rule | Verdict |
|------|---------|
| Reuse `WORK_RATE_OWNER_SYNONYMS` + D1 aliases | **APPROVE** |
| No second identity/alias/threshold engine | **APPROVE** |
| Store outcome only | **APPROVE** |
| Pipeline PARSE→IDENTITY→SCOPE→QUALIFY→STORE | **APPROVE** |

Boundary after store: Evidence → existing aggregation → marketBase → Candidate · **not** OUR RATE.

### Verdict
**APPROVE**.

---

## AR-06 Scope

| Rule | Verdict |
|------|---------|
| D1 tags walls_ceilings / joinery / artistic (+ unscoped) | **APPROVE** |
| `REJECTED_SCOPE` retained as evidence | **APPROVE** |
| Excluded from marketBase pool for that work | **APPROVE** |
| No price-only artistic rejection | **APPROVE** |

### Verdict
**APPROVE**.

---

## AR-07 Region

| Rule | Verdict |
|------|---------|
| WRO when available | **APPROVE** |
| NATIONAL/POLSKA legal fallback | **APPROVE** |
| No NATIONAL→WROCLAW relabel | **APPROVE** |
| No invent region/local price | **APPROVE** |
| Existing preference chain unchanged | **APPROVE** |

NATIONAL ≠ SOURCE GAP — **APPROVE**.

### Verdict
**APPROVE**.

---

## AR-08 Aggregation

| Rule | Verdict |
|------|---------|
| marketBase DERIVED | **APPROVE** |
| Preserve source range 15–25; mid 20 derived | **APPROVE** |
| Existing median / qualify / midpoint engines | **LOCKED / APPROVE** |
| Candidate ≠ Accept ≠ OUR RATE | **APPROVE** |
| No forced minimum source count | **APPROVE** |
| lowSample honest | **APPROVE** |

### Verdict
**APPROVE**.

---

## AR-09 Source roles

| Source | Owner / DF role | ARCH |
|--------|-----------------|------|
| KB | PRIMARY | **CONFIRM PRIMARY** |
| CennikRemontow | PRIMARY | **CONFIRM PRIMARY** |
| Extradom | PRIMARY (finish) | **CONFIRM PRIMARY** for finish; install+mat = SECONDARY filter |
| SCCOT | SECONDARY | **CONFIRM** |
| Zleca | REFERENCE / CONTEXT | **CONFIRM** |
| Kul-Bud | SECONDARY (WAW≠WRO) | **CONFIRM SECONDARY** · NATIONAL-adjacent only |
| Budowalka | PRIMARY *candidate* | **CONFIRM candidate** · allowlist GO separate |
| Murator | PRIMARY *candidate* | **CONFIRM candidate** · allowlist GO separate |
| Ogarnij Remont | PRIMARY *candidate* | **CONFIRM candidate** · allowlist GO separate |
| CennikiBudowlane WRO | SECONDARY (floor „od”) | **CONFIRM SECONDARY** · weak WRO signal |

**No automatic runtime allowlist** — **APPROVE**.

### Verdict
**APPROVE** roles as design inventory.

---

## AR-10 Host lock

| Rule | Verdict |
|------|---------|
| Zero automatic host discovery | **APPROVE** |
| Zero crawler | **APPROVE** |
| Zero arbitrary client URL (Edge anti-SSRF) | **APPROVE** |
| New source = separate Owner GO | **APPROVE** |
| Current 4 hosts remain runtime lock until GO | **APPROVE** |

### Verdict
**APPROVE**.

---

## AR-11 Unmatched

### Owner proposal
**STORE UNMATCHED**

| Safer than drop? | **YES** — preserves corpus for Owner mapping without inventing CatalogWork |
| Auto-create CatalogWork / OUR RATE / Candidate / Accept | **FORBIDDEN** — **APPROVE** |
| Auto-mutate Work Catalog | **FORBIDDEN** — **APPROVE** |

### Amendment A5
`UNMATCHED` rows: `workId=null`, `qualityStatus=UNMATCHED`, never enter aggregation until Owner maps `workId` + re-qualify/scope.

### Verdict
**APPROVE** + A5.

---

## AR-12 Caps

### Owner proposal
5k–10k total · 50–100 per work.

### Review

| Dimension | Recommendation |
|-----------|----------------|
| Global | Soft cap **8000** default (within 5k–10k) |
| Per workId | Soft cap **80** default (within 50–100) |
| Per sourceId | Soft cap **2000** (amendment — prevent one host flooding) |
| Per retrieval batch | Max upserts **200**/run (amendment — storm control) |

### Eviction (Amendment A6)

When over cap:

1. Prefer drop oldest `STALE` / `REJECTED_*`  
2. Never drop the **last VALID** observation for a `(workId, region)` if it would zero the pool  
3. Never destructive-replace entire store to “fit”

### Verdict
**APPROVE WITH AMENDMENTS** (A6 + per-source + per-batch).

---

## AR-13 Deduplication

### Logical `dedupeKey` (approved shape)

```text
workIdOrUnmatched
| sourceId
| normalizeUrl(sourceUrl)
| normalizeName(observedName)
| unit
| region
| priceKind
| priceMin|priceMax|pricePoint
```

| Rule | Verdict |
|------|---------|
| Not price-only dedupe | **APPROVE** |
| Include workId (or `unmatched`) | **APPROVE** — Owner list includes workId |
| Preserve historical provenance | **APPROVE** (STALE / history ring) |

### Verdict
**APPROVE**.

---

## AR-14 Refresh / staleness

Lifecycle FETCH→PARSE→IDENTITY→SCOPE→QUALIFY→STORE — **APPROVE**.

Statuses VALID / REJECTED_SCOPE / REJECTED_IDENTITY / REJECTED_UNIT / REJECTED_PACKAGE / REJECTED_OUTLIER / STALE / UNMATCHED — **APPROVE**.

Auto-delete old evidence — **FORBIDDEN**; mark `STALE` + `staleAt`.

### Verdict
**APPROVE**.

---

## AR-15 Security / safety

| Invariant | Verdict |
|-----------|---------|
| companyPricePln ≠ evidence price | **APPROVE** |
| evidence ≠ OUR RATE | **APPROVE** |
| research ≠ Accept | **APPROVE** |
| Candidate ≠ Accept | **APPROVE** |
| margin ≠ evidence | **APPROVE** |
| Evidence write ↛ OUR RATE write | **APPROVE** · test E15 |
| Evidence write ↛ Work Catalog write | **APPROVE** · test E14 |

### Verdict
**APPROVE**.

---

## AR-16 LWW incident regression (CRITICAL)

### Incident class
Authoritative catalog (≈460 custom) overwritten by newer partial/legacy-only snapshot (≈34 legacy) via **whole-store LWW**.

### Mandatory non-goals for Evidence

```text
partial incoming evidence + newer timestamp
  ≠ destructive overwrite of larger existing evidence
```

### Mandatory test E17

```text
existing = 100 observations
incoming = 5 observations (newer updatedAt)
merge → ≥100 unique (union) · never 5-only store
empty incoming → keep existing
legacy-shaped / corrupt incoming → reject or union-safe normalize
```

### Amendment A7
Implement **`preferAuthoritativeEvidenceStore`** (name illustrative): refuse empty/near-empty replace over non-empty; merge is observation-union, not document LWW.

### Verdict
**APPROVE** with **A7** as hard gate for IMPLEMENT.

---

## AR-17 Testing strategy

Minimum matrix (design only — **ZERO implement now**):

| ID | Focus |
|----|--------|
| E1 | Schema normalize / required fields |
| E2 | Provenance six questions |
| E3 | Point → contribution; store point |
| E4 | Range 15–25 preserved; mid 20 derived only |
| E5 | Identity reuse synonyms / no second engine |
| E6 | Scope REJECTED_SCOPE retained; out of pool |
| E7 | POLSKA legal; no relabel |
| E8 | DedupeKey upsert; history not erased |
| E9 | Concurrent writers → union |
| E10 | UNMATCHED no CatalogWork/OUR RATE |
| E11 | STALE mark; no auto-delete |
| E12 | Caps + eviction preserves last VALID |
| E13 | Host lock; unknown host rejected |
| E14 | Work Catalog isolation |
| E15 | OUR RATE isolation |
| E16 | Accept isolation |
| E17 | LWW regression (partial vs large) |

### Verdict
**APPROVE** test plan for future IMPLEMENT.

---

## AR-18 Migration

### Owner proposal
**D-IMPORT = EMPTY** · later curated import possible.

| Check | Verdict |
|-------|---------|
| Empty start | **APPROVE** |
| No import now | **APPROVE** |
| No dual-write now | **APPROVE** |
| No KV mutation in this GO | **APPROVE** |

Curated import later = separate Owner GO with explicit file/allowlist.

### Verdict
**APPROVE**.

---

## AR-19 UI

### Owner proposal
**D-UI = DEFER**

First Evidence DB version does **not** need UI — research/ops can use store APIs + tests. Super Admin panel = later epic.

### Verdict
**APPROVE** defer.

---

## 21. Owner decisions (ARCH → CLOSEOUT)

> **CLOSED** — Owner Decision Closeout 2026-08-14. Binding detail: DF § OWNER DECISION CLOSEOUT.

| DECISION | ARCH stance | OWNER VERDICT |
|----------|-------------|----------------|
| **D-STORE** | Confirmed | **APPROVED** — A + A1 |
| **D-MERGE** | Confirmed | **APPROVED** — union + A2 + A7 |
| **D-SCHEMA** | Amendments | **APPROVED** — min + A3 |
| **D-CAPS** | Amendments | **APPROVED** — 8000 / 80 / 2000 / 200 + A6 |
| **D-UNMATCHED** | Confirmed | **APPROVED** — STORE + A5 |
| **D-IMPORT** | Confirmed | **APPROVED** — EMPTY |
| **D-HOSTS** | Confirmed | **APPROVED** — KEEP 4 |
| **D-PRIMARY** | Confirmed | **APPROVED** — KB/CR/Extradom · SCCOT · Zleca |
| **D-UI** | Confirmed | **DEFERRED** |
| **D-REVISION** | New (from A2) | **APPROVED — MVP NOW** (etag/CAS) |

---

## 22. Implementation boundary

**IN (only after Owner Decision Closeout + Owner GO IMPLEMENT):**

- Evidence types + normalize + dedupeKey  
- Separate KV key + union merge + empty-guard (A7)  
- Persist path from research **without** Accept/OUR RATE/catalog write  
- Tests E1–E17  
- Docs / changelog  

**OUT:**

- Host expansion · crawler · UI · curated import · dual-write catalog  
- PASS2 MAX · F5/mapper · qualify/median rewrite  
- Accept / OUR RATE / margin / companyPrice / Bid  
- Claiming SOURCE GAP closed / niche claimed  

---

## 23. Rollback

| Failure | Action |
|---------|--------|
| Corrupt evidence store | Ignore key · fall back to live fetch-only research |
| Bad merge | Disable evidence writers · restore last good evidence backup |
| Suspected catalog touch | Halt · verify catalog key unchanged · never “fix” via evidence write |
| Host/legal issue | Stop fetch · keep VALID rows read-only |

Rollback **must not** require Accept undo or margin reset. Catalog remains authoritative independently.

---

## Amendments summary (binding for Closeout)

| ID | Amendment | Status |
|----|-----------|--------|
| **A1** | Evidence writers never persist Work Catalog | **CLOSED** |
| **A2** | Delta upserts + union merge + empty-guard | **CLOSED** |
| **A3** | Mandatory: dedupeKey, currency, priceKind, laborOnly, includesMaterial | **CLOSED** |
| **A4** | Provenance self-sufficient for six questions | **CLOSED** |
| **A5** | UNMATCHED: workId null · no aggregation until mapped | **CLOSED** |
| **A6** | Caps: global + per-work + per-source + per-batch · explicit over-cap report · eviction preserves last VALID | **CLOSED** |
| **A7** | LWW regression: no partial destructive replace (E17 hard gate) + etag/CAS MVP | **CLOSED** |

---

## FINAL STATUS

```text
OWNER DECISION CLOSEOUT = COMPLETE

D-STORE = APPROVED
D-MERGE = APPROVED
D-SCHEMA = APPROVED
D-CAPS = APPROVED
D-UNMATCHED = APPROVED
D-IMPORT = APPROVED
D-HOSTS = APPROVED
D-PRIMARY = APPROVED
D-UI = DEFERRED
D-REVISION = APPROVED — MVP NOW

A1 = CLOSED
A2 = CLOSED
A3 = CLOSED
A4 = CLOSED
A5 = CLOSED
A6 = CLOSED
A7 = CLOSED

DESIGN FREEZE = APPROVED
ARCH REVIEW = CLOSED

IMPLEMENT = LOCAL GREEN (2.66.54)
COMMIT = NOT DONE
PUSH = NOT DONE
DEPLOY = NOT DONE

KV = NOT DONE
ACCEPT = NOT DONE
OUR RATE = NOT DONE
MARGIN = NOT DONE

SOURCE GAP = OPEN
NICHE = NOT CLAIMED
```

**Next:** `OWNER GO: COMMIT — WR-SOURCE-EVIDENCE-DB-01` (exact allowlist only)

**STOP.**
