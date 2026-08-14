# DESIGN FREEZE — WR-SOURCE-EVIDENCE-DB-01

> **Epic:** `WR-SOURCE-EVIDENCE-DB-01`  
> **Context tip:** Production **2.66.53** / **`acbfda32`**  
> **Prior:** WR-LABOR-EVIDENCE-QUALITY-01 D1 LIVE = **PASS** · WR-LABOR-SOURCE-DATABASE-AUDIT-01 · WR-PASS2-ALLOWLIST-WAVE-1  
> **Stage:** **DESIGN FREEZE** → **OWNER DECISION CLOSEOUT**  
> **Status:** **DESIGN FREEZE = APPROVED** · **ARCH REVIEW = CLOSED** · **IMPLEMENT = LOCAL GREEN** (2.66.54)  
> **Date:** 2026-08-14  
> **SOURCE GAP:** **OPEN**  
> **NICHE:** **NOT CLAIMED**  
> **Next:** `OWNER GO: COMMIT — WR-SOURCE-EVIDENCE-DB-01` (exact allowlist only)

```text
DESIGN FREEZE          = THIS FILE
IMPLEMENTATION         = ZERO until Owner GO IMPLEMENT (+ ARCH REVIEW)
COMMIT / PUSH / DEPLOY = FORBIDDEN in this stage
KV / ACCEPT / OUR RATE = FORBIDDEN
MARGIN / SEED          = FORBIDDEN
NEW HOSTS → runtime allowlist = FORBIDDEN without separate Owner GO
PASS2 MAX / F5 / mapper / qualify / median = LOCKED UNCHANGED
namesLooselyMatch threshold = LOCKED
```

---

## LOCK ACKNOWLEDGEMENT

```text
OWNER GO: DESIGN FREEZE — WR-SOURCE-EVIDENCE-DB-01
SSOT: this file
Date: 2026-08-14
ZERO CODE · ZERO MASS FETCH · ZERO KV WRITE · ZERO ACCEPT
ZERO OUR RATE · ZERO MARGIN · ZERO CANDIDATE WRITE
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY · ZERO NEW HOSTS
```

---

## 1. Problem

### 1.1 Business need

Intelligent Estimator must eventually price a **wide** labor catalog (budowlanka, malowanie, gładzie/tynki, elektryka, hydraulika, montaż biały, demontaż, wywóz, …) — not only grooves.

### 1.2 Coverage reality (audit 2026-08-14)

| Metric (89 active labor) | Count | % |
|--------------------------|------:|--:|
| ≥1 source (audit corpus) | 41 | 46% |
| ≥2 sources | 25 | 28% |
| ≥3 sources | 20 | 22% |
| NO_MATCH | 48 | 54% |
| Candidate-ready (historical narrow path) | small niche | — |

**SOURCE GAP = OPEN.**

### 1.3 What D1 fixed (and what it did not)

| D1 LIVE (2.66.53) | Result |
|-------------------|--------|
| Plaster identity | PASS (Candidate YES) |
| Painting scope → walls_ceilings | PASS (marketBase ~68.5 → **22.9**) |
| Grooves regression | PASS (15–25 → mid **20**) |
| Safety (KV / OUR RATE / Accept / margin) | PASS · writes **0** |

D1 improves **quality of aggregation for matched pages**.  
It does **not** create a durable multi-source evidence corpus, does **not** close coverage for 48 NO_MATCH works, and does **not** separate storage of observations from ephemeral research runs.

### 1.4 Target

A **SOURCE EVIDENCE DATABASE**: durable, provenance-rich observations of market labor prices — **strictly separated** from OUR RATE / Candidate / Accept / companyPrice / commercial margin / Bid.

---

## 2. Current architecture

```text
CatalogWork (kw-wgdom-work-catalog)
  companyPricePln · commercialPricing.marginPct · ourWorkRate?
        │
        ▼
Selective research (PASS1 + PASS2 allowlist · MAX=2 on kb_pl)
  Edge fetch → parse → Owner synonyms / namesLooselyMatch
  → D1 scopeTag filter → qualify → calculateRepresentativeWorkRate
  → Candidate (in-memory / UI) — NOT OUR RATE
        │
        ▼ (Owner only)
  Accept → OUR RATE write
```

**Gaps vs Evidence DB:**

| Layer | Today | Needed |
|-------|-------|--------|
| Observation persistence | Ephemeral per research run | Durable evidence rows |
| Multi-source corpus | Narrow PASS2 pages | Curated inventory + optional allowlist expansion (Owner GO) |
| Separation from catalog | Research reads catalog | Evidence **must not** live inside catalog store |
| LWW risk | Whole-store `updatedAt` on `kw-wgdom-work-catalog` | Evidence must avoid whole-catalog LWW |

**Incident lesson (WORK-CATALOG-MIGRATION-SAFETY-01):** whole-store LWW + empty/legacy-only payload can destroy authoritative catalog (460 custom → 34 legacy). Evidence DB must **never** be a field inside that blob.

**Prod host lock (runtime research):** `kb.pl` · `cennikremontow.pl` · `sccot.pl` · `extradom.pl` only.  
Owner-listed URLs outside this set are **design inventory** — **not** auto-allowlisted.

---

## 3. Evidence SSOT model

### 3.1 Layer stack (recommended)

```text
① SOURCE INVENTORY (Owner-curated URLs / hosts / roles)
② SOURCE EVIDENCE  (raw+normalized observations + provenance)  ← THIS EPIC SSOT
③ AGGREGATION INPUT POOL (scope+qualify filtered view of ②)
④ marketBase (DERIVED · existing median engine · UNCHANGED formula)
⑤ Candidate (research proposal · ≠ OUR RATE)
⑥ OUR RATE (Owner Accept only)
⑦ companyPrice / commercial margin / Bid  (orthogonal · NEVER seeded from ②)
```

### 3.2 Non-goals of an evidence row

Evidence is **not**: OUR RATE · marketBase · Candidate · Accept · companyPrice · margin · Bid decision.

`marketBase` = **derived** from a filtered evidence pool via **existing** aggregation SSOT.

---

## 4. Schema

### 4.1 Observation (minimum + recommended)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `evidenceId` | string (uuid) | YES | Stable id |
| `workId` | string \| null | YES* | Null only for `UNMATCHED` staging rows |
| `sourceId` | string | YES | e.g. `kb_pl` · research ids for non-allowlisted inventory |
| `sourceUrl` | string | YES | Exact page URL |
| `categoryKey` | string \| null | NO | PASS2 category when applicable |
| `observedName` | string | YES | Exact source label |
| `unit` | WgdomCostUnit \| string | YES | As observed |
| `priceMin` | number \| null | NO | Range low (preserve) |
| `priceMax` | number \| null | NO | Range high (preserve) |
| `pricePoint` | number \| null | NO | Point / “od” floor when applicable |
| `priceKind` | `point` \| `range` \| `from_floor` \| `unknown` | YES | Semantic of source quote |
| `currency` | `"PLN"` | YES | Non-PLN → REJECTED |
| `region` | `WROCLAW` \| `DOLNY_SLASK` \| `POLSKA` | YES | Never invent; never relabel NATIONAL→WRO |
| `country` | `"POLSKA"` | YES | |
| `scopeTag` | `walls_ceilings` \| `joinery` \| `artistic` \| `unscoped` \| … | YES | D1 reuse |
| `identityMethod` | `exact_name` \| `owner_synonym` \| `names_loosely` \| `unmatched` | YES | Result of existing matcher — not a new engine |
| `synonymUsed` | string \| null | NO | Provenance of synonym path |
| `identityMatched` | boolean | YES | |
| `laborOnly` | boolean | YES | |
| `includesMaterial` | boolean | YES | |
| `qualityStatus` | enum §16 | YES | |
| `observedAt` | ISO | YES | Source/page freshness if known |
| `retrievedAt` | ISO | YES | Fetch time |
| `provenance` | object | YES | See §5 |
| `dedupeKey` | string | YES | Deterministic (§14) |
| `schemaVersion` | number | YES | Start `1` |

\*Staging unmatched rows may omit `workId` until Owner identity mapping.

### 4.2 Derived fields (computed, not stored as source truth)

| Derived | Rule |
|---------|------|
| Midpoint contribution | range → `(min+max)/2` · point → `pricePoint` |
| Eligible for marketBase pool | `qualityStatus=VALID` **and** scope allowed for work **and** qualify rules |

**Never** overwrite `priceMin`/`priceMax` with midpoint.

### 4.3 Store document (recommended)

```text
LaborSourceEvidenceStore {
  schemaVersion: 1
  updatedAt: ISO                 // document touch only — NOT sole merge key
  observations: LaborSourceEvidenceObservation[]
  // optional: tombstones[] for Owner-deleted evidenceIds
}
```

---

## 5. Provenance

Every observation MUST answer: **“Where exactly does this price come from?”**

Minimum provenance payload:

```text
provenance: {
  sourceId
  sourceUrl
  observedName
  region
  unit
  priceKind
  priceMin / priceMax / pricePoint   // raw as published
  retrievedAt
  identityMethod
  synonymUsed?
  scopeTag
  pageTitle? / sectionHint?         // optional aids
  fetchTraceId?                     // Edge request id if available
}
```

**Anonymous evidence = FORBIDDEN.**

Rejected rows (**REJECTED_***) **retain** provenance — do not delete solely because excluded from marketBase pool.

---

## 6. Identity

| Rule | Decision |
|------|----------|
| Engine | **REUSE** `WORK_RATE_OWNER_SYNONYMS` + `listWorkRateMatchNamesPl` + `namesLooselyMatch` / `namesLooselyMatchAny` |
| Threshold | **LOCKED** — no global loosen |
| D1 plaster aliases | KEEP (`Gładzenie ścian` · `Gładź gipsowa`) |
| D1 grooves alias | KEEP exact `szpachlowanie bruzd po kablach` · bare `szpachlowanie bruzd` FORBIDDEN |
| Evidence DB role | **Store identity outcome** (`identityMethod`, `synonymUsed`, `identityMatched`) |
| Second identity engine | **FORBIDDEN** |

---

## 7. Scope

| Rule | Decision |
|------|----------|
| Tags | **REUSE D1:** `walls_ceilings` · `joinery` · `artistic` (+ `unscoped`) |
| Timing | Scope **before** aggregation (same boundary as D1) |
| Storage | Persist `scopeTag` on every observation |
| Wrong scope | May remain as **raw** evidence (`REJECTED_SCOPE` or VALID+out-of-pool) |
| marketBase pool | Only scopes allowed for that `workId` (e.g. `legacy-malowanie-m2` → walls_ceilings only) |
| Price hard-cap | **FORBIDDEN** as quality rule |

---

## 8. Region

| Rule | Decision |
|------|----------|
| Wrocław present on source | May label `WROCLAW` |
| Wrocław absent | Legal `POLSKA` / NATIONAL |
| NATIONAL = SOURCE GAP? | **NO** |
| Relabel NATIONAL → WROCLAW | **FORBIDDEN** |
| Invent region | **FORBIDDEN** |
| Multi-obs | Keep **all** provenance rows; aggregator selects preferred region per **existing** chain |
| Preference (existing SSOT) | WROCLAW → DOLNY_SLASK → POLSKA |
| Force Wrocław-only | **FORBIDDEN** |

---

## 9. Aggregation boundary

```text
FETCH → PARSE → IDENTITY → SCOPE → QUALIFY → STORE EVIDENCE
                                                      │
                                                      ▼
                         EVIDENCE (filter VALID + scope) → EXISTING AGGREGATION
                                                      → marketBase
                                                      → Candidate
                                                      ✗ OUR RATE
```

| Component | Change in this epic? |
|-----------|----------------------|
| `calculateRepresentativeWorkRate` / median | **NO** (reuse) |
| Midpoint / point rules | **NO** (reuse `work-rate-market-base`) |
| Qualify formulas | **NO** |
| Accept / OUR RATE | **NO** |
| Minimum source count | **NO** forced minimum |
| `lowSample` | Honest: `n<3` remains lowSample |

**Example (grooves):** store `priceMin=15`, `priceMax=25`; derived mid **20** for marketBase contribution — never replace source range with 20 alone.

---

## 10. Source roles

### 10.1 Classes

| Class | Meaning |
|-------|---------|
| **PRIMARY** | High-trust unit labor tables; preferred for VALID evidence |
| **SECONDARY** | Useful but noisy / floor-“od” / regional mismatch / packages |
| **REFERENCE / CONTEXT** | Editorial / marketplace packages — context only, rarely VALID for marketBase |

**Owner URL ≠ automatic PRIMARY.** Runtime allowlist expansion = **separate Owner GO**.

### 10.2 Recommendation matrix (from AUDIT-01 + locks)

| source | region | typical role | confidence | primary candidate? | prod allowlist today |
|--------|--------|--------------|------------|--------------------|----------------------|
| KB.pl | POLSKA (pages may note city) | PRIMARY | HIGH | **YES** | YES |
| CennikRemontow.pl | WROCLAW / POLSKA | PRIMARY | HIGH | **YES** | YES |
| Extradom | POLSKA | PRIMARY (finish) / SECONDARY (install+mat) | HIGH–MED | **YES** (finish) | YES |
| SCCOT | POLSKA | SECONDARY | LOW–MED | NO (often “od” / packages) | YES |
| Budowalka | POLSKA | PRIMARY candidate | HIGH–MED | YES **after** allowlist GO | **NO** |
| Murator | POLSKA | PRIMARY candidate | HIGH | YES **after** allowlist GO | **NO** |
| Ogarnij Remont | POLSKA | PRIMARY candidate | HIGH | YES **after** allowlist GO | **NO** |
| Kul-Bud | POLSKA (firma WAW) | SECONDARY | MED | NO as WRO; NATIONAL-adjacent OK | **NO** |
| CennikiBudowlane WRO | WROCLAW | SECONDARY (floor “od”) | LOW | NO | **NO** |
| Zleca | POLSKA | REFERENCE / CONTEXT | LOW | NO | **NO** |

---

## 11. Coverage matrix (89 labor — design view)

**Source:** WR-LABOR-SOURCE-DATABASE-AUDIT-01 (heuristic token match; upper bound).

### 11.1 Aggregate columns (proposed ongoing report)

| Column | Meaning |
|--------|---------|
| workId / namePl / family | Catalog identity |
| sourceCoverage | count distinct sourceId with ≥1 row |
| wroclawEvidence | count VALID region=WROCLAW |
| nationalEvidence | count VALID region=POLSKA |
| evidenceCount | all stored rows (incl. rejected) |
| identityStatus | MATCHED / PARTIAL / NO_MATCH / UNMAPPED |
| scopeStatus | allowed tags vs observed tags |
| candidateReadiness | READY / BLOCKED_IDENTITY / BLOCKED_SCOPE / BLOCKED_UNIT / BLOCKED_SAMPLE / GAP |
| gapReason | human code |

### 11.2 Family priorities (not grooves-only)

| Family / theme | Audit signal | Gap posture |
|----------------|--------------|-------------|
| Malowanie | Strong NATIONAL + D1 scope fix | Expand corpus; keep walls_ceilings pool |
| Gładzie / tynki | D1 identity OK; multi-row sources | Prefer labor-only; avoid L+M pollution |
| Grooves | Control PASS | KEEP alias discipline |
| Elektryka | Sparse / mixed materials | High false-positive risk |
| Hydraulika / biały montaż | Partial | Unit/scope care |
| Demontaż / wywóz | Partial | Packages vs unit |
| Budowlanka ogólna | Mixed | Identity Owner gate |
| NO_MATCH (48) | No audit hit | SOURCE GAP remains OPEN |

**Do not claim niche closed** from this DF.

---

## 12. Storage architecture

### 12.1 Recommendation (SSOT separation)

| Option | Verdict |
|--------|---------|
| **A. Separate KV document** `kw-wgdom-labor-source-evidence` | **RECOMMENDED** |
| B. Embed observations inside `kw-wgdom-work-catalog` | **REJECT** — LWW / wipe risk · couples evidence to catalog migrations |
| C. Per-work nested under CatalogWork | **REJECT** — catalog write paths would touch evidence · Accept/margin confusion |

### 12.2 Properties of Option A

- Independent `updatedAt` / schemaVersion  
- Evidence refresh **never** rewrites Work Catalog  
- OUR RATE / companyPrice / margin **cannot** be mutated by evidence writers  
- Cloud merge strategy designed for **observations**, not whole-catalog replace  
- localStorage mirror optional (same key) for offline read — still separate key

### 12.3 Size / caps (design defaults — Owner confirm)

| Param | Proposal |
|-------|----------|
| Soft cap observations | e.g. 5000–10000 rows (FIFO/tombstone oldest STALE) |
| Per workId soft cap | e.g. 50–100 |
| Payload | Prefer lean provenance; no full HTML bodies in KV |

---

## 13. LWW / concurrency safety

| Risk | Mitigation |
|------|------------|
| Whole-store LWW wipe (catalog incident) | Evidence **out of** catalog key |
| Two clients append evidence | Merge by `evidenceId` / `dedupeKey` **union** — not winner-takes-all blob |
| Newer empty store | Reject empty evidence store over non-empty (mirror catalog authority pattern) |
| Catalog updatedAt churn | Evidence writes **must not** bump `kw-wgdom-work-catalog.updatedAt` |
| Accept race | Evidence pipeline has **zero** Accept / OUR RATE APIs |

**Merge rule (proposed):**

```text
mergeEvidence(local, cloud):
  by dedupeKey → keep richest VALID / newest retrievedAt for same key
  preserve REJECTED_* history (or capped ring)
  never drop all cloud rows because local.updatedAt is newer
```

Exact algorithm = Owner decision **D-MERGE** (ARCH REVIEW).

---

## 14. Deduplication

### 14.1 `dedupeKey` (deterministic)

```text
norm(sourceId) | norm(sourceUrl) | norm(observedName) | unit | region
  | priceKind | priceMin|priceMax|pricePoint
```

Same key within a short retrieval window → **upsert** latest `retrievedAt`, **do not** spawn infinite clones.

### 14.2 History

- Optional `observationHistory[]` ring (last N retrievals) **or** keep prior row as STALE with new evidenceId  
- **Do not** erase provenance when refreshing  
- Owner soft-delete → tombstone by `evidenceId`

---

## 15. Refresh lifecycle

```text
① FETCH          (allowlisted runtime hosts only unless Owner expands)
② PARSE          (existing HTML parsers / curated import)
③ IDENTITY       (existing synonyms + namesLooselyMatch)
④ SCOPE          (D1 classifyWorkRateEvidenceScopeTag)
⑤ QUALIFY        (existing qualify — labor-only / unit / package…)
⑥ STORE EVIDENCE (append/upsert into Evidence KV · qualityStatus set)
```

Then separately (research UI / selective research):

```text
⑦ LOAD EVIDENCE for workId
⑧ FILTER        (VALID + allowed scopeTags)
⑨ AGGREGATE     (existing median / region chain)
⑩ marketBase → Candidate
⑪ Owner Accept → OUR RATE   ← ONLY here; NEVER from ⑥
```

**Cooldown path FORBIDDEN:** Evidence → OUR RATE.

---

## 16. Quality states

| Status | Meaning |
|--------|---------|
| `VALID` | Eligible for marketBase pool (if scope allows) |
| `REJECTED_SCOPE` | Identity OK; wrong scope for target work |
| `REJECTED_IDENTITY` | Failed identity |
| `REJECTED_UNIT` | Unit incompatible |
| `REJECTED_PACKAGE` | Package / promo / minimum |
| `REJECTED_OUTLIER` | **Semantic** outlier (e.g. package room totals) — **not** `price > X` alone |
| `REJECTED_MATERIALS` | includesMaterial / not labor-only |
| `STALE` | Superseded by newer retrieval / Owner marked old |
| `UNMATCHED` | Parsed but no workId yet |

Artistic 374/377 PLN/m² stays **stored** (provenance) with `REJECTED_SCOPE` / artistic tag — never pollutes walls pool.

---

## 17. Security / host lock

| Rule | Status |
|------|--------|
| Runtime selective lookup hosts | **LOCKED** to current allowlist |
| Owner inventory URLs outside allowlist | Design-only / offline curation until Owner GO |
| Crawler / automatic host discovery | **OUT** |
| Edge anti-SSRF | KEEP — client does not pass arbitrary URL |
| Full catalogue scrape | **FORBIDDEN** (`isWorkRateFullCatalogueForbidden`) |
| Secrets / attestation docs | Remain Owner-held · not in repo |

---

## 18. Testing strategy (future IMPLEMENT)

| Tier | Focus |
|------|-------|
| Unit | Schema normalize · dedupeKey · merge union · status transitions |
| Scope | Painting walls vs artistic/joinery (D1 regression) |
| Identity | Plaster gladzenie · grooves exact alias · bare bruzdy rejected |
| Region | POLSKA legal without WRO · no relabel |
| Safety | Evidence write never touches catalog OUR RATE / companyPrice / margin |
| Concurrency | Empty evidence store cannot wipe populated evidence |
| Integration | Research reads evidence pool → same marketBase engine · Candidate ≠ Accept |
| Forbidden | No live Accept in CI · no mass prod fetch without Owner GO |

---

## 19. Migration strategy

| Phase | Action |
|-------|--------|
| M0 | Empty Evidence store · schema v1 · no catalog changes |
| M1 | Optional **import** of curated audit observations (Owner GO · offline JSON) — still no OUR RATE |
| M2 | Selective research also **persists** VALID/REJECTED rows (dual-write) |
| M3 | Research may become **evidence-first** (cache-first from Evidence DB) with live fetch refresh |
| M4 | Allowlist expansion epics (Budowalka / Murator / Ogarnij…) — separate GOs |

**No** Work Catalog seed rewrite · **no** legacy→custom migration · **no** Accept backfill from evidence.

---

## 20. Explicit OUT scope

```text
OUT:
- IMPLEMENT / COMMIT / PUSH / DEPLOY
- New runtime hosts / crawler / search
- PASS2 MAX change
- F5 / mapper / qualify rewrite / median rewrite
- Accept / OUR RATE / margin / companyPrice / Bid
- Catalog migration / seed / restore
- Claiming SOURCE GAP CLOSED / niche CLAIMED
- Embedding evidence inside kw-wgdom-work-catalog
- Second identity engine / fuzzy threshold loosen
- Price-only outlier caps
```

---

## 21. Owner decisions required

> **CLOSED** — see **OWNER DECISION CLOSEOUT** at end of this file (2026-08-14). Historical options table retained for audit.

| DECISION | OPTIONS | RECOMMENDED | REQUIRED OWNER ACTION |
|----------|---------|-------------|------------------------|
| **D-STORE** | A separate KV · B embed catalog · C per-work | **A `kw-wgdom-labor-source-evidence`** | Approve key + separation |
| **D-MERGE** | Union-by-dedupe · whole-store LWW · last-writer blob | **Union-by-dedupeKey** | Approve merge semantics |
| **D-IMPORT** | Empty start · seed from audit JSON · live dual-write first | **Empty + optional curated import** | Choose M0/M1 |
| **D-HOSTS** | Keep 4 hosts · expand Wave-2 list | **Keep 4** until separate allowlist GO | Confirm |
| **D-PRIMARY** | Approve §10.2 roles | KB/CR/Extradom finish PRIMARY; SCCOT SECONDARY; Zleca REFERENCE | Edit/approve |
| **D-CAP** | Soft caps numbers | 5k–10k global · 50–100/work | Confirm |
| **D-UNMATCHED** | Store unmatched · drop · Owner inbox | **Store as UNMATCHED** | Approve |
| **D-UI** | No UI · read-only Evidence panel · Super Admin only | Defer UI to later epic | Confirm defer |

~~**Without D-STORE + D-MERGE → IMPLEMENT BLOCKED.**~~ → Decisions closed · IMPLEMENT still requires separate **Owner GO IMPLEMENT**.

---

## 22. Implementation boundary (future)

**IN (after ARCH REVIEW + Owner GO IMPLEMENT):**

1. Types + normalize + dedupe for Evidence store  
2. Separate KV key + merge union  
3. Persist path from research (dual-write) **without** Accept  
4. Tests §18  
5. Docs / changelog  

**OUT:** host expansion · catalog changes · OUR RATE · median/qualify rewrite · C catalog split (still DEFERRED from D1).

---

## 23. Rollback plan

| If | Then |
|----|------|
| Evidence store corrupt | Drop/ignore key · research falls back to live fetch-only (today’s path) |
| Merge bug | Stop evidence writers · restore last good evidence backup · catalog untouched |
| Accidental catalog coupling | Abort · never dual-write catalog fields from evidence module |
| Host incident | Disable evidence fetch · keep stored VALID rows read-only |

Rollback **must not** require Accept undo or margin reset.

---

## Success criteria (post-implement — not claimed now)

- Evidence rows durable with full provenance  
- Painting walls pool unpolluted (D1 preserved)  
- Grooves 15–25 preserved as range  
- Catalog / OUR RATE / margin untouched by evidence writers  
- SOURCE GAP remains honestly **OPEN** until coverage improves  

---

## DESIGN FREEZE status

```text
DESIGN FREEZE = APPROVED
ARCH REVIEW   = CLOSED
IMPLEMENT     = NOT DONE
COMMIT        = NOT DONE
PUSH          = NOT DONE
DEPLOY        = NOT DONE
KV            = NOT DONE
ACCEPT        = NOT DONE
OUR RATE      = NOT DONE
SOURCE GAP    = OPEN
NICHE         = NOT CLAIMED
BLOCKED ON DECISIONS = NONE
NEXT OWNER GO = IMPLEMENT — WR-SOURCE-EVIDENCE-DB-01
```

---

## OWNER DECISION CLOSEOUT

> **GO type:** OWNER DECISION CLOSEOUT only · **NOT** IMPLEMENTATION GO  
> **Date:** 2026-08-14  
> **SSOT:** this file + [`WR-SOURCE-EVIDENCE-DB-01-ARCH-REVIEW.md`](./WR-SOURCE-EVIDENCE-DB-01-ARCH-REVIEW.md)  
> **ARCH REVIEW:** APPROVE WITH AMENDMENTS → amendments **A1–A7 CLOSED**

```text
THIS CLOSEOUT DOES NOT AUTHORIZE IMPLEMENTATION.
ZERO CODE · ZERO SCHEMA MIGRATION · ZERO KV · ZERO RESEARCH
ZERO ACCEPT · ZERO OUR RATE · ZERO MARGIN · ZERO CANDIDATE MUTATION
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY · ZERO NEW HOSTS · ZERO PASS2/D1 CHANGE
```

### Closed decisions

| DECISION | OWNER VERDICT | Binding detail |
|----------|---------------|----------------|
| **D-STORE** | **APPROVED** | Key **`kw-wgdom-labor-source-evidence`** · Option A · **A1** isolation from Work Catalog / OUR RATE / Candidate / Accept / companyPrice / commercialPricing / margin |
| **D-MERGE** | **APPROVED** | **Union-by-dedupeKey** · **A2** + **A7** · NOT whole-store LWW · NOT destructive replace · NOT partial snapshot over larger set · mandatory regression: 460→34 |
| **D-SCHEMA** | **APPROVED** | Minimal schema + **A3** mandatory: `dedupeKey`, `currency`, `priceKind`, `laborOnly`, `includesMaterial` · preserve range (midpoint derived only) · full provenance fields retained |
| **D-CAPS** | **APPROVED** | **Hard:** global **8000** · per work **80** · per source **2000** · per batch **200** · **A6** · no silent provenance wipe · over-cap **explicitly reported** |
| **D-UNMATCHED** | **APPROVED** | **STORE UNMATCHED** · **A5** · no auto CatalogWork / OUR RATE / Candidate / Accept / catalog mutate |
| **D-IMPORT** | **APPROVED** | **EMPTY** · no auto migration · no dual-write · no seed · curated import = future Owner GO |
| **D-HOSTS** | **APPROVED** | **KEEP 4** · no allowlist expand in this epic · ZERO crawler / discovery / arbitrary / client URL |
| **D-PRIMARY** | **APPROVED** | PRIMARY: **KB** · **CR** · **Extradom** · SECONDARY: **SCCOT** · REFERENCE: **Zleca** · others not auto-PRIMARY / not auto-allowlisted |
| **D-UI** | **DEFERRED** | No UI in MVP · storage/pipeline first · UI = later epic |
| **D-REVISION** | **APPROVED — MVP NOW** | **etag / CAS** in MVP · read revision → validate → write if unchanged else retry/merge · no blind whole-document overwrite |

### Amendments A1–A7

| ID | Status | Meaning |
|----|--------|---------|
| **A1** | **CLOSED** | Evidence write isolation from Work Catalog |
| **A2** | **CLOSED** | Union / delta merge |
| **A3** | **CLOSED** | Mandatory schema fields |
| **A4** | **CLOSED** | Provenance completeness |
| **A5** | **CLOSED** | UNMATCHED storage |
| **A6** | **CLOSED** | Explicit caps (+ over-cap report) |
| **A7** | **CLOSED** | LWW regression / concurrency safety |

### Final closeout block

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
