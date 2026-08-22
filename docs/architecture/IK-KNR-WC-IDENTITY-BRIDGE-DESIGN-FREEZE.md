# IK-KNR-WC-IDENTITY-BRIDGE — DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = APPROVED** · **IMPLEMENT P1 = NOT AUTHORIZED** · **OWNER GO IMPLEMENT = NOT GRANTED** |
| **Date** | 2026-08-22 |
| **Owner GO (DF)** | **APPROVED** — Variant B · architecture freeze only · **2026-08-22** |
| **Mode** | **DESIGN FROZEN** · **ZERO runtime until separate IMPLEMENT GO** · **ZERO Master SSOT edit** · **ZERO HTTP** · **ZERO pricing** |
| **Baseline HEAD** | `ab68ebcbcd247cbdb62f653889c2a96c1093cd62` |
| **Field context** | FT-10 56 CANDIDATE / 32 HOLD · Slice D 0/56 HIT · MOPS 20 distinct keys · pilot `KNR-W\|4-01\|1202-07` poza MOPS |
| **Chosen variant** | **B** — KNR FACT/evidence → proposal → Owner Accept WC → A1 → OWNER_KNR_MAPPINGS → existing Slice D |
| **P1 plan** | [`IK-KNR-WC-IDENTITY-BRIDGE-P1-IMPLEMENTATION-PLAN.md`](./IK-KNR-WC-IDENTITY-BRIDGE-P1-IMPLEMENTATION-PLAN.md) · **NOT AUTHORIZED to execute** |
| **Parent SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Upstream audits** | Owner Decision Pack 2.0 · Architecture Bridge Audit (PASS WITH GAPS) |
| **Related freezes** | [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) · [`IK-KNR-EXPERT-SLICE-D-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-SLICE-D-DESIGN-FREEZE.md) · [`IK-KNR-KNOWLEDGE-LAYER-DESIGN-FREEZE.md`](./IK-KNR-KNOWLEDGE-LAYER-DESIGN-FREEZE.md) · [`IK-KNR-SOURCE-RESEARCH-AUDIT.md`](./IK-KNR-SOURCE-RESEARCH-AUDIT.md) · Classification Gate DF · P5.26 CREATE→BIND→ACCEPT |

```text
DESIGN FREEZE             = APPROVED (Owner GO 2026-08-22)
DESIGN FREEZE RESULT      = PASS WITH GAPS (residual gaps remain; see §27)
Master SSOT conflict      = NONE (additive epic; Master UNCHANGED by this file)
KL conflict               = NONE (bridge ≠ KL writer of catalogWorkId)
Slice D conflict          = NONE (Slice D contract UNCHANGED)
IMPLEMENT P1              = NOT AUTHORIZED
HTTP / SCRAPING           = OFF
OWNER GO (IMPLEMENT P1)   = REQUIRED SEPARATELY — NOT GRANTED
```

### Owner-approved contract (binding)

1. KNR Expert pozostaje read-only.  
2. KNR discovery może dostarczać evidence / KNR Catalog — **nie** tworzy CatalogWork.  
3. Bridge jest osobną warstwą **poza** KL.  
4. Bridge przygotowuje wyłącznie candidate proposal.  
5. Proposal ≠ CatalogWork ≠ VERIFIED ≠ OUR RATE.  
6. SimilarWorks = evidence only — **brak** fuzzy auto-reuse.  
7. Owner Accept = obowiązkowa bramka utworzenia/wyboru identity WC.  
8. Po workId — A1 pozostaje osobnym Owner gate.  
9. `OWNER_KNR_MAPPINGS` pozostaje osobnym exact mapping gate.  
10. Slice D UNCHANGED: exact + active + approval + unit compatibility.  
11. `prob` = HOLD_UNIT — bez cichego `prob → szt`.  
12. 32 HOLD (`INCOMPLETE_TABLE_CODE`) poza bridgem.  
13. Brak drugiego katalogu KNR / WC / mapping engine.  
14. HTTP / scraping = OFF.  
15. Ta decyzja DF ≠ zmiany produkcyjne / ≠ IMPLEMENT P1.

**Legenda stanu:**

| Tag | Znaczenie |
|-----|-----------|
| **CURRENT / IN SOURCE** | Istnieje w repo @ `ab68ebcb` |
| **TARGET / PROPOSED** | Zamrożony kontrakt po Owner GO IMPLEMENT — **nie** w SOURCE jako bridge |
| **GAP** | Brak w SOURCE; wymaga implementacji po osobnym GO |

---

## 0. Absolute rules (this epic)

1. SSOT FIRST · REUSE FIRST · ZERO DUPLICATE LOGIC.  
2. KNR ≠ pricing authority.  
3. KNR Catalog ≠ Work Catalog.  
4. KNR Expert = domena KNR evidence — **nie** właściciel Work Catalog identity.  
5. Slice D = **jedyny** legalny mechanizm KNR → `catalogWorkId`.  
6. Slice D wymaga exact approved mapping do **istniejącego aktywnego** `workId`.  
7. A1 = jedyny classification gate (`workId` → plane).  
8. Labor / Material **nie** przed A1.  
9. Research/evidence **nie** tworzy identity.  
10. Proposal ≠ CatalogWork ≠ VERIFIED KNR ≠ OUR RATE.  
11. Owner = jedyny gate utworzenia/wyboru WC identity.  
12. **Feature OFF** = zero efektów bridge (regresja 0).

---

## 1. Problem statement

### 1.1 Observed field failure (MOPS)

| Metric | Value |
|--------|------:|
| Distinct CANDIDATE `normalizedKey` | 20 |
| Exact `OWNER_KNR_MAPPINGS` HIT | 0/20 |
| Slice D HIT (lines) | 0/56 |
| `catalogWorkId` written | 0 |
| A1 | UNKNOWN ×88 (consequence) |
| HOLD `INCOMPLETE_TABLE_CODE` | 32 (out of epic) |

FT-10 dostarcza **KNR FACT** (`family` + `tableCode` + provenance).  
Slice D i A1 wymagają **Work Catalog identity**.  
Między nimi **brak mostu**.

### 1.2 Wrong interpretations (FORBIDDEN)

| Forbidden reading | Why |
|-------------------|-----|
| „Owner zgaduje `legacy-*` z opisu” | Łamie Slice B/D freeze · fuzzy identity |
| „KNR Expert tworzy CatalogWork” | Łamie Master SSOT · KL boundaries |
| „KNR scrape → cena → OUR RATE” | KNR ≠ pricing |
| „KNR Catalog HIT = workId” | Dwa katalogi |
| „Napraw 32 HOLD description parse” | Poza epicem · FT-10 CLOSED |

### 1.3 Correct problem

```text
System wie: „to jest KNR X” (CANDIDATE).
System nie umie legalnie powiedzieć: „to jest nasza robota Y”
bez Owner Accept Work Catalog + exact Slice D mapping.
```

---

## 2. Existing architecture (CURRENT / IN SOURCE)

```text
Document Expert
  → catalogBasis (FT-10: PRIMARY / SECONDARY_DSEC_HINT)
KNR Expert B
  → CANDIDATE | HOLD · proposedWorkId = null · catalogWorkIdWritten = 0
KL Host lookup-only
  → resolveHostKnrKnowledgeLookupOnly · HTTP=0 · explicitResearch=false
Slice D
  → applyOwnerKnrMapping · exact OWNER_KNR_MAPPINGS → overlay catalogWorkId
A1
  → classifyEstimatorPricingPlane(workId)
Labor / Material / F5
  → gates on plane + workId
```

**Legal identity path from KNR (frozen):**

```text
Owner HIT → applyOwnerKnrMapping → catalogWorkId → A1
```

Empty map = **legal** no-identity (A1 UNKNOWN). Guessing **not** authorized.

---

## 3. Architecture gap (TARGET gap)

| Layer | Status |
|-------|--------|
| KNR evidence (`catalogBasis`) | CURRENT |
| KNR Catalog / discovery (norms) | CURRENT / OFF for HTTP |
| **KnrWcIdentityProposal** | **GAP** |
| Owner WC Accept from KNR proposal | **GAP** (P5.26 pattern exists; not wired to KNR) |
| Assisted `OWNER_KNR_MAPPINGS` row after WC+A1 | **GAP** (table mechanism exists; assist missing) |
| Slice D / A1 / Labor / F5 | CURRENT — reuse unchanged |

**One sentence:** system can assert KNR fact; cannot safely propose WGDOM work identity without inventing.

---

## 4. Chosen variant

### 4.1 Compared variants

| Variant | Summary | SSOT fit | Verdict |
|---------|---------|----------|---------|
| **A** | KNR Catalog only; Owner manually creates WC | Highest safety | Valid fallback if NO-GO bridge |
| **B** | Proposal DTO → Owner Accept WC → A1 → mapping → Slice D | Compatible if proposal non-authority | **CHOSEN** |
| **C** | Auto-create CatalogWork / auto-map | Conflicts Master + Slice D + A1 | **REJECTED** |

### 4.2 Why B

- Master SSOT: no auto `catalogWorkId` outside Slice D.  
- Slice D DF: exact Owner table + existing workId.  
- KL DF: does **not** feed `catalogWorkId`; norms domain only.  
- Autonomy-08 §21: „IK proponuje kandydata + Owner Accept identity” **with evidence** — not invent.  
- P5.26: historical Owner CREATE→BIND→ACCEPT for CatalogWork — **reuse pattern**, not new WC engine.

### 4.3 Explicit non-goals

- Auto `catalogWorkId` / auto Owner mapping / auto A1 / auto pricing / auto OUR RATE / auto VERIFIED  
- Fuzzy identity / description→workId / KNR→legacy bind / embedding auto-bind  
- Second KNR Catalog / second Work Catalog / second mapping engine / second F5  
- HTTP ON / scraping ON in this DF  
- 32 HOLD repair / FT-10 changes  
- Pricing research / production mutation in DESIGN phase  
- Master SSOT rewrite  

---

## 5. Existing reusable building blocks

| # | Domain | Path | Symbol / contract | Authority | State | Bridge REUSE? |
|---|--------|------|-------------------|-----------|-------|---------------|
| A | KNR catalog | `src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts` · `knr-catalog-lookup.ts` | `lookupKnrCatalog` · LOCAL_HIT/MISS | Owner VERIFY | IMPLEMENTED | YES (read) |
| B | KNR discovery | `knr-discovery-orch.ts` · `knr-host-discovery-sidechannel.ts` · `knr-discovery-http-*` | `DISCOVERY_REQUIRED` · plan/exec | Legal gate · allowlist `[]` | IMPLEMENTED **OFF** | YES (queue signal; no HTTP ON here) |
| C | Provenance | `knr-provenance-types.ts` · discovery evidence store | source · hash · retrievedAt | evidence ≠ VERIFIED | IMPLEMENTED | YES |
| D | Source provider | `providers/knr-source-provider.ts` | `KnrSourceProvider.acquire` | Legal Gate | DESIGN ONLY (`KNR_KL0_NO_SOURCE_PROVIDERS`) | YES (future; no new provider) |
| E | ATH / corpus | `knr-corpus-ingest-orchestrator.ts` · `knr-corpus-ready-selection.ts` | READY-16 → PENDING_VERIFY | Owner VERIFY | IMPLEMENTED | YES (local first) |
| F | CatalogWork | `src/lib/work-catalog/types.ts` | `CatalogWork` · **no KNR fields** | WC SSOT | IMPLEMENTED | YES (write only via Owner) |
| G | WC rate Accept | `work-rate-accept.ts` `acceptWorkRateResearchCandidate` | candidate → OUR RATE | Owner | IMPLEMENTED | NO for identity create (rates only) |
| H | WC CREATE pattern | P5.26 docs · store normalize `works[]` | CREATE→BIND→ACCEPT | Owner GO | PATTERN EXISTS | YES (create identity) |
| I | Owner KNR map | `ik-knr-owner-mapping.ts` | `OWNER_KNR_MAPPINGS` · `applyOwnerKnrMapping` | Owner approval | IMPLEMENTED (1 pilot) | YES **unchanged** |
| J | Slice D | Host + `applyOwnerKnrMapping` | exact+unit+active+approval | Owner table | IMPLEMENTED | YES **unchanged** |
| K | A1 | `classification-gate.ts` · `owner-classification-map.ts` | plane by workId | Owner seed | IMPLEMENTED | YES **unchanged** |
| L | Labor | `ik-labor-expert.ts` · WC lookup/research | workId + LABOR | A1 gate | IMPLEMENTED | Downstream only |
| M | Material | `ik-material-expert.ts` · Price Memory | material keys | A1 gate | IMPLEMENTED | Downstream only |
| N | F5 / Host | `IkEntryHost.tsx` · Position Cost | costing | gates | IMPLEMENTED | Downstream only |
| O | Material KNR map | `knr-pricing-identity.ts` | `OWNER_KNR_MATERIAL_MAPPINGS = []` | Owner | EMPTY | OUT of v1 bridge |

**Conflicts recorded (not unilaterally resolved):**

1. KL must not write `catalogWorkId` ↔ bridge must not live inside KL write-router.  
2. `CatalogWork.unit: WgdomCostUnit` lacks `prob` ↔ MOPS `prob` → HOLD_UNIT.  
3. `acceptWorkRateResearchCandidate` ≠ CatalogWork CREATE ↔ use P5.26-style CREATE, not rate Accept.  
4. knrHint mapper path isolated from `catalogBasis` — bridge uses **catalogBasis / KNR evidence only**.

---

## 6. Domain boundaries (FROZEN)

| Domain | Question it answers | Identity key | Writer |
|--------|---------------------|--------------|--------|
| **KNR Catalog** | What does this norm/item say (R/M/S + metadata)? | `identityKeyV2` | KL ingest + Owner VERIFY |
| **Work Catalog** | What WGDOM cost identity do we sell/estimate? | `CatalogWork.id` | Owner CREATE/Accept WC |
| **OWNER_KNR_MAPPINGS** | Which approved WC identity binds to which KNR key? | `normalizedKey` → `workId` | Owner table |
| **A1** | What pricing plane does this `workId` have? | `workId` → plane | Owner classification map |

```text
catalogBasis  ≠  knrHint  ≠  catalogWorkId  ≠  identityKeyV2  ≠  ourWorkRate
Proposal      ≠  CatalogWork  ≠  VERIFIED  ≠  Slice D HIT
```

**FORBIDDEN merge:** one catalog that is both KNR norms and WC rates/identity.

---

## 7. Target data flow (VARIANT B)

```text
Tender (per line / per distinct key)
  → FT-10 catalogBasis (evidence)
  → KNR Expert CANDIDATE
  → KNR Catalog lookup (LOCAL FIRST)
       HIT  → enrich proposal with entry + provenance
       MISS → DISCOVERY_REQUIRED (targeted job for THIS key only)
            → legal acquisition provider (ATH/corpus first; HTTP future OFF)
            → evidence + provenance
            → optional Owner KNR VERIFY (if entry path)
  → KnrWcIdentityProposal (ephemeral / queue)
  → Owner Review
       REUSE_EXISTING | CREATE_NEW | HOLD | HOLD_UNIT | REJECT
  → Work Catalog (existing Owner CREATE pattern if CREATE_NEW)
  → Owner A1 seed for workId
  → Owner adds OWNER_KNR_MAPPINGS row (exact)
  → existing applyOwnerKnrMapping (Slice D)
  → A1 classify
  → Labor / Material
  → F5
```

**Critical:** discovery is **per required tender KNR**, not „scrape entire KNR universe”.

---

## 8. Gate sequence (FROZEN — do not shorten)

| Gate | Name | Pass condition | Fail / hold |
|------|------|----------------|-------------|
| **G1** | KNR evidence | CANDIDATE with `family`+`tableCode` (+ optional Catalog HIT) | HOLD incomplete · DISCOVERY_REQUIRED |
| **G2** | Owner WC Accept | REUSE existing active work **or** CREATE via Owner flow | HOLD / REJECT |
| **G3** | Owner A1 | `workId` in `ESTIMATOR_OWNER_CLASSIFICATION_MAP` with safe plane | UNKNOWN → research blocked |
| **G4** | OWNER_KNR_MAPPINGS | exact row · `ownerApproval` · `active` · unit fields | no Slice D HIT |
| **G5** | Slice D | `applyOwnerKnrMapping` HIT · unit compatible | overlay null |
| **G6** | Labor / Material | A1 LABOR/MATERIAL (+ existing research gates) | HOLD |
| **G7** | F5 | existing costing gates | BLOCKED |

Bridge **owns only** proposal preparation + Owner review UX contract.  
Gates G2–G5 remain existing authorities.

---

## 9. Proposed type: `KnrWcIdentityProposal` (TARGET)

**Nature:** ephemeral / queue candidate. **Not** persisted as CatalogWork. **Not** Slice D authority.

| Field | Required | Notes |
|-------|----------|-------|
| `proposalId` | YES | Stable id for audit trail |
| `tenderId` | YES | Scope of targeted discovery |
| `normalizedKey` | YES | From `catalogBasis.normalizedKey` |
| `identityKeyV2` | OPTIONAL | When KL fold available |
| `displayCode` | YES | Human KNR display |
| `family` | YES | |
| `catalogId` | OPTIONAL | May be null (e.g. some KNNR/NNRNKB) |
| `tableCode` | YES | |
| `officialNamePl` | YES when evidence has name | From KNR entry / harvest / tender desc — labeled as evidence, not invent |
| `descriptionPl` | OPTIONAL | Scope text from evidence |
| `unitRaw` | YES | **Preserve BOQ/KNR raw** (e.g. `prob`) |
| `proposedUnit` | OPTIONAL | Only if Owner/unit policy allows mapping to `WgdomCostUnit`; else null + HOLD_UNIT |
| `proposedTradeId` | OPTIONAL | Hint only |
| `proposedWorkId` | OPTIONAL | Suggestion only — **not binding** |
| `knrEvidenceRefs` | YES | sourceId / ATH path / harvest ref / contentHash / retrievedAt |
| `provenance` | YES | Same family as KL provenance concepts |
| `verificationState` | YES | `TENDER_ONLY` \| `PENDING_VERIFY` \| `VERIFIED` \| `DISCOVERY_REQUIRED` |
| `similarWorks[]` | YES (may be empty) | `{ workId, namePl, unit, active }` — similarity **evidence only** |
| `duplicateRisk` | YES | `NONE` \| `POSSIBLE` \| `HIGH` |
| `recommendation` | YES | `REUSE_EXISTING` \| `CREATE_NEW` \| `HOLD` \| `HOLD_UNIT` \| `HOLD_EVIDENCE` \| `REJECT` |
| `ownerDecision` | OPTIONAL until review | unset → decided |
| `lineRefs[]` | YES | dwellingId + lineId covering this key in tender |

### 9.1 Semantics (FROZEN)

```text
proposedWorkId     ≠ catalogWorkId
recommendation     ≠ Owner decision
similarWorks       ≠ identity
VERIFIED (KNR)     ≠ WC Accept
WC Accept          ≠ Slice D HIT
Slice D HIT        ≠ OUR RATE
```

---

## 10. Similar works (FROZEN)

**ALLOWED:** show Owner a list of potentially related WC rows (name/unit/trade hints).  

**FORBIDDEN:**

- description → workId  
- KNR → `legacy-*` auto  
- fuzzy / embedding → Slice D  
- auto-bind on POSSIBLE/HIGH duplicate risk  

**Owner choices only:**

| Decision | Effect |
|----------|--------|
| `REUSE_EXISTING` | Select existing `workId` (must be active; unit policy OK) |
| `CREATE_NEW` | Enter P5.26-style CREATE with prefilled fields from proposal |
| `HOLD` / `HOLD_UNIT` / `HOLD_EVIDENCE` | No WC write · no mapping |
| `REJECT` | Close proposal · audit |

---

## 11. CREATE_NEW — REUSE P5.26 pattern

**Do not invent a second CatalogWork writer.**

When Owner chooses CREATE_NEW:

1. Prefill from proposal: `namePl`, `unit` (only if `proposedUnit` resolved), `tradeId` hint, `descriptionPl`, keywords optional.  
2. Execute **existing** Owner CREATE→BIND→ACCEPT style flow (P5.26 precedent: Owner-gated CatalogWork rows).  
3. Result: real `CatalogWork` with `source: custom` (or existing enum), `active: true`.  
4. **Still no** Slice D until G3+G4.

Rate Accept (`acceptWorkRateResearchCandidate`) remains **out of identity create path**.

---

## 12. Targeted discovery / acquisition (DESIGN — HTTP OFF)

### 12.1 Priority (LOCAL FIRST)

```text
1) Existing KNR Catalog LOCAL_HIT
2) Local corpus / harvest / licensed ATH (corpus ingest REUSE)
3) DISCOVERY_REQUIRED job for THIS normalizedKey only
4) Legal KnrSourceProvider.acquire (future; currently no providers)
5) Evidence + provenance persist (KNR domain)
6) Owner VERIFY when entering KNR Catalog as VERIFIED
```

### 12.2 Security (CURRENT gates — DO NOT WEAKEN)

| Control | Location | Rule |
|---------|----------|------|
| Allowlist | `knr-discovery-allowlist.ts` | Production `[]` |
| Legal HTTP | `knr-discovery-http-legal.ts` | `scrape_*` **DENIED** |
| Host side-channel | `knr-host-discovery-sidechannel.ts` | `featureEnabled: false` → HTTP=0 |
| Corpus HTTP research | `KNR_CORPUS_HTTP_RESEARCH_ENABLED = false` | OFF |
| Source providers | `KNR_KL0_NO_SOURCE_PROVIDERS` | No impl |

**This DF does not authorize HTTP ON or scraping.**  
Future allowlisted HTTP = **separate Owner GO**.

### 12.3 Pricing isolation

Acquisition may carry official name, unit, scope, norms — **never** authoritative PLN / OUR RATE / F5 input.

---

## 13. Unit policy (FROZEN)

| Rule | Detail |
|------|--------|
| Preserve `unitRaw` | Always from BOQ/KNR evidence |
| No silent normalize | Especially **not** `prob` → `szt` |
| `WgdomCostUnit` | `m2\|mb\|szt\|rbh\|m3\|kpl\|kg\|l` — **no `prob`** CURRENT |
| MOPS `prob` keys | `KNNR\|5\|1305-01` · `KNNR\|5\|1305-02` → recommendation **`HOLD_UNIT`** until Owner unit policy OD |
| Slice D | Existing `unitsCompatible` — mapping blocked until unit policy + WC unit agree |

**DESIGN QUESTION (Owner, not implementer):** Is `prob`/`prób.` a new unit, alias of `szt`, or `kpl`? Bridge holds until answered.

---

## 14. A1 (FROZEN UNCHANGED)

```text
classifyEstimatorPricingPlane:
  Owner seed by workId → else mat.* → else UNKNOWN
Never invent from namePl
Never classify from KNR string / family
```

After WC Accept: if `workId` absent from `ESTIMATOR_OWNER_CLASSIFICATION_MAP` → **UNKNOWN** → Labor/Material research **blocked** until Owner A1 seed (G3).

Bridge **must not** auto-write A1.

---

## 15. Slice D integration (FROZEN UNCHANGED)

Prefer:

```text
proposal → WC Accept → A1 → OWNER_KNR_MAPPINGS row → applyOwnerKnrMapping
```

**Do not** create a second mapping engine.

Slice D requirements remain:

- exact `normalizedKey`  
- `ownerApproval: true`  
- `active: true`  
- existing active CatalogWork  
- unit compatible  

Pilot row `KNR-W|4-01|1202-07` → `cc-w2-wykwity-zacieki` **unchanged** · not a semantic template for MOPS.

---

## 16. Duplicate / collision control

| Risk pair | Signal | Owner |
|-----------|--------|-------|
| `1505-01` vs `1204-02` (malowanie) | POSSIBLE/HIGH similar | May CREATE two or REUSE one — Owner |
| `0504-03` vs `0504-07` (LED IP20/IP44) | POSSIBLE split | Owner |
| `0233-06` vs `0233-08` (Ø50/Ø110) | HIGH split likely | Prefer separate identities |
| `1134-01` vs `1134-02` (sufit/pion) | POSSIBLE split | Owner |
| KNR vs KNR-W same table | HIGH edition risk | Evidence must show family |
| NNRNKB identity noise | HOLD_EVIDENCE if key unstable | Normalize before CREATE |
| False harvest `KNR 4-04 0501-03` vs MOPS `KNR\|5-08\|0501-03` | HIGH false collision | Ignore wrong family |

`duplicateRisk` informs UI only — **never** auto-binds.

---

## 17. MOPS 20 keys — acceptance matrix (DESIGN)

All 20: tender evidence **YES** · exact WC bind **NO** · mapping **NO**.  
`proposal possible` = YES if G1 OK and not HOLD_UNIT/HOLD_EVIDENCE blocker.

| # | normalizedKey | unitRaw | KNR Catalog / harvest | discovery | proposal | special risk | Owner gate | expected final (after full gates) |
|---|---------------|---------|----------------------|-----------|----------|--------------|------------|-----------------------------------|
| 1 | `KNNR\|\|1014-07` | m2 | MISS | YES | YES | mycie — no safe legacy | CREATE/REUSE | mapped + A1 |
| 2 | `KNNR\|5\|1305-01` | **prob** | harvest HIT | enrich | **HOLD_UNIT** first | unit policy | unit OD → then WC | mapped after unit |
| 3 | `KNNR\|5\|1305-02` | **prob** | harvest HIT | enrich | **HOLD_UNIT** first | unit policy | unit OD | mapped after unit |
| 4 | `KNR-W\|4-01\|0909-04` | szt | MISS | YES | YES | stolarka | CREATE/REUSE | mapped + A1 |
| 5 | `KNR-W\|5-08\|0407-01` | szt | harvest KNR≠W risk | YES | YES | family | evidence check | mapped + A1 |
| 6 | `KNR\|13-21\|0402-03` | szt | harvest HIT | enrich | YES | pomiar | CREATE/REUSE | mapped + A1 |
| 7 | `KNR\|2-02\|1505-01` | m2 | **READY** | enrich | YES | vs 1204 | CREATE/REUSE | mapped + A1 |
| 8 | `KNR\|2-15\|0110-01` | mb | MISS | YES | YES | mb vs seed kpl | CREATE/REUSE | mapped + A1 |
| 9 | `KNR\|2-15\|0224-03` | kpl | MISS | YES | YES | plane later | CREATE/REUSE | mapped + A1 |
| 10 | `KNR\|4-01\|1204-02` | m2 | harvest HIT | enrich | YES | vs 1505 | CREATE/REUSE | mapped + A1 |
| 11 | `KNR\|4-02\|0233-06` | szt | MISS | YES | YES | Ø50 | CREATE | mapped + A1 |
| 12 | `KNR\|4-02\|0233-08` | szt | MISS | YES | YES | Ø110 | CREATE | mapped + A1 |
| 13 | `KNR\|4-03\|1124-01` | szt | MISS | YES | YES | demontaż | CREATE/REUSE | mapped + A1 |
| 14 | `KNR\|5-08\|0501-03` | kpl | false 4-04 | YES | YES | table collide | CREATE | mapped + A1 |
| 15 | `KNR\|5-08\|0504-03` | szt | MISS | YES | YES | vs 0504-07 | CREATE/REUSE | mapped + A1 |
| 16 | `KNR\|5-08\|0504-07` | szt | MISS | YES | YES | IP44 | CREATE/REUSE | mapped + A1 |
| 17 | `NNRNKB\|\|1134-01` | m2 | noisy | YES | YES | identity normalize | CREATE/REUSE | mapped + A1 |
| 18 | `NNRNKB\|\|1134-02` | m2 | noisy | YES | YES | vs 1134-01 | CREATE/REUSE | mapped + A1 |
| 19 | `KNNR\|2\|1404-05` | mb | MISS | YES | YES | rury ≠ listwy | CREATE | mapped + A1 |
| 20 | `KNR\|2-15\|0115-05` | szt | MISS | YES | YES | bateria plane | CREATE/REUSE | mapped + A1 |

**This DF does not select `workId` for Owner.**

---

## 18. 32 HOLD (OUT OF SCOPE)

```text
32 × INCOMPLETE_TABLE_CODE
```

- Not entered into bridge proposal queue.  
- No FT-10 / parser changes in this epic.  
- No description-based repair.

---

## 19. Audit trail (TARGET)

Append-only logical events (storage key TBD at IMPLEMENT — prefer existing audit patterns; **no** invent KV without OD):

```text
proposalId
  → evidence snapshot refs
  → recommendation + duplicateRisk
  → Owner decision (+ chosen workId if any)
  → WC Accept / CREATE result
  → A1 seed result
  → OWNER_KNR_MAPPINGS row id
  → Slice D HIT telemetry (counts only)
```

Not pricing events.

---

## 20. Feature flag / rollback

| Mode | Behavior |
|------|----------|
| **OFF** (default until IMPLEMENT GO) | Bridge inert · KNR Expert / Slice D / pilot unchanged · 32 HOLD unchanged |
| **ON** (after IMPLEMENT GO) | Proposal generation for CANDIDATE keys missing WC bind |

Rollback: set OFF → no proposals · no new assists · existing Accepted WC / mappings remain (manual cleanup if Owner wants).

**No new AppSettings key in DESIGN** — IMPLEMENT may REUSE existing IK flag patterns only with separate OD (prefer zero new flags if Host already gated by `isIkEntryEnabled`).

---

## 21. Seam placement (TARGET)

| Component | Role |
|-----------|------|
| `IkEntryHost` | After KNR Expert report: invoke bridge **read/propose** when feature ON |
| New thin module (name TBD) e.g. `knr-wc-identity-bridge.ts` | Build `KnrWcIdentityProposal[]` from CANDIDATE keys + KL/WC reads |
| **Not** inside `ik-knr-expert.ts` as writer | Expert stays read-only evidence |
| **Not** inside `knr-catalog-write-router` | No WC writes from KL |
| **Not** inside `applyOwnerKnrMapping` | Slice D stays exact-only |

---

## 22. Failure states

| State | Meaning |
|-------|---------|
| `HOLD_EVIDENCE` | Insufficient/noisy KNR identity |
| `HOLD_UNIT` | `unitRaw` not representable / policy missing (`prob`) |
| `DISCOVERY_REQUIRED` | Local miss — targeted job queued (HTTP still OFF) |
| `DUPLICATE_REVIEW` | HIGH similarWorks — Owner must choose |
| `REJECT` | Owner rejects proposal |
| `FEATURE_OFF` | No bridge effects |

---

## 23. Security / safety checklist (FROZEN)

- [ ] no auto `catalogWorkId`  
- [ ] no auto Owner mapping  
- [ ] no auto A1  
- [ ] no auto pricing / OUR RATE / VERIFIED from proposal  
- [ ] no fuzzy identity assignment  
- [ ] no description→workId / description→A1  
- [ ] no second KNR / WC / mapping / F5 authority  
- [ ] scrape DENY default · allowlist empty · HTTP OFF in this DF  
- [ ] CatalogWork has no KNR field requirement (binding stays in OWNER_KNR_MAPPINGS)  

---

## 24. Test design (DESIGN ONLY — not run here)

| ID | Intent |
|----|--------|
| T-BRIDGE-1 | CANDIDATE + no WC bind → proposal emitted |
| T-BRIDGE-2 | similarWorks present → zero auto-bind |
| T-BRIDGE-3 | `prob` → HOLD_UNIT · no `szt` coercion |
| T-BRIDGE-4 | Owner REUSE → workId exists → Slice D still 0 until mapping GO |
| T-BRIDGE-5 | Owner CREATE → WC → A1 → mapping → Slice D HIT |
| T-BRIDGE-6 | 32 HOLD never enter bridge |
| T-BRIDGE-7 | Pilot WYKWITY regression 0 |
| T-BRIDGE-8 | Feature OFF → zero bridge effects |
| T-BRIDGE-9 | KNR Catalog MISS → targeted DISCOVERY_REQUIRED (no HTTP) |
| T-BRIDGE-10 | Discovery/harvest evidence → proposal provenance complete |
| T-BRIDGE-11 | False table collision 0501-03 family mismatch flagged HIGH |
| T-BRIDGE-12 | 1505 vs 1204 duplicateRisk POSSIBLE/HIGH · no auto merge |

### Future E2E (MOPS) — acceptance scenario

```text
88 lines · 56 CANDIDATE · 32 HOLD
→ ≤20 proposals (distinct keys)
→ Owner Accept N works
→ A1 N
→ mapping N
→ Slice D HIT N×dwellings
→ Labor/Material gates open where A1 allows
→ NO pricing claim required for bridge PASS
→ 32 HOLD remain HOLD
```

---

## 25. Implementation phases (AFTER separate OWNER GO IMPLEMENT)

| Phase | Scope | Writes |
|-------|-------|--------|
| **P0** | This DF only | docs |
| **P1** | Offline proposal builder + tests | **0** WC/A1/map |
| **P2.1** | Local proposal persist (`kw-knr-wc-identity-proposals`) | **0** WC · cache HIT skips P1 |
| **P2.2** | Batch reuse hardening + Supabase load guard (LIB ONLY) | **0** · tamper sanitize · quota graceful · lazy stores on MISS only |
| **P2 UI** | Owner Review queue (Host · flag-gated) | **0** · staging only · no WC/A1/map |
| **P2** | Owner review UI + REUSE path (legacy row) | superseded by **P2 UI** row above |
| **P3** | CREATE_NEW via P5.26-style Owner flow | WC on Accept only |
| **P4** | A1 seed assist checklist | A1 on Owner only |
| **P5** | Mapping assist → existing OWNER_KNR_MAPPINGS | map on Owner only |
| **P6** | Optional KL enrich before proposal | KNR catalog only |
| **P7** | Allowlisted HTTP acquisition | **separate OD** |

**STOP after each phase** without next GO.

---

## 26. Migration strategy

- No backfill of historical tenders.  
- Opt-in per tender when feature ON.  
- Existing pilot mapping untouched.  
- No mass CREATE of 20 MOPS works without Owner Accept each.

---

## 27. SSOT compliance review (READ-ONLY self-check)

| Source | Compliance |
|--------|------------|
| Master SSOT | Additive · no second WC/KNR · no auto catalogWorkId |
| KNR Expert DF | Expert remains non-writer of identity |
| Slice D DF | Exact mapping contract preserved |
| KL DF | Bridge ≠ KL `catalogWorkId` feed; norms separate |
| Source Research Audit | LOCAL FIRST · scrape not default |
| A1 / Classification | workId-only seed · no KNR string class |
| P5.26 | CREATE pattern reused for Owner CREATE_NEW |
| Autonomy-08 | Proposal + Owner Accept with evidence |

**Residual GAPS (honest):**

1. ~~Exact UI surface for proposal queue — TBD at IMPLEMENT P2 UI~~ → **P2 UI CLOSED** (`IkKnrWcIdentityProposalQueuePanel` · Hub seam).  
2. ~~Persist store for proposals — TBD~~ → **P2.1 CLOSED** (`kw-knr-wc-identity-proposals` localStorage · schema v1).  
3. Unit policy OD for `prob` — **blocking** for keys 2–3.  
4. Source provider implementations — still DESIGN ONLY.  
5. Whether assist writes mapping table via code gen vs manual PR — OD at P5.

---

## 27a. P2.2 — Batch reuse hardening (IMPLEMENTED `d016b4c8+` · flag OFF)

**Scope:** LIB ONLY · no Host · no WC/A1/mapping/pricing · no HTTP/Supabase from bridge.

| Policy | Rule |
|--------|------|
| **Tamper sanitize** | `REUSE_EXISTING` in cache → downgrade to `CREATE_NEW` · `VERIFIED` without `knrCatalog` evidence → downgrade · `contentHash` mismatch → single-key MISS |
| **Quota** | `setItem` failure → in-memory proposals returned · `console.info` `PROPOSAL_PERSIST_FAILED` · no Supabase fallback |
| **Freshness** | `upstreamFingerprint` snapshot at persist · `isProposalStale()` → `staleEvidence` advisory · **no auto batch rebuild** |
| **Force refresh** | `forceRefreshKeys[]` → single-key MISS only |
| **Lazy stores** | `resolveBridgeStoresLazy()` — **0 loads on full cache HIT** · MISS-only · max 1× per store type per batch |
| **Supabase guard** | Bridge `supabaseQueryCount=0` · `remoteStoreLoads` counted · Host must not N× fetch |
| **Feature flag** | `KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED = false` |

**localStorage ≠ authority** — cache never creates CatalogWork · never assigns `catalogWorkId` · never A1/mapping/pricing.

**OQ-D-2:** remains OPEN — P2.2 does not integrate P5 `knrHint`.

---

## 27b. P2 UI — Owner Review / Proposal Queue (IMPLEMENTED · flag OFF)

**Scope:** Host wiring **one seam** · staging only · no authority writes.

| Element | Value |
|---------|--------|
| **Host seam** | `TenderWorkflowHubPanel.tsx` — sibling of `IkLaborGapResearchPanel` |
| **Components** | `IkKnrWcIdentityProposalQueuePanel` · `IkKnrWcIdentityProposalReviewCard` |
| **Lib seam** | `extractKnrWcBridgeKeysFromKnrExpert` · `runKnrWcIdentityProposalQueueBatch` |
| **Feature flag** | `KNR_WC_IDENTITY_BRIDGE_P2_UI_ENABLED = false` |
| **Runtime gate** | `isKnrWcIdentityBridgeP2UiRuntimeEnabled()` = IK + P1 + P2.1 + P2.2 + P2 UI |
| **Batch contract** | **ONE** `runKnrWcIdentityProposalQueueBatch` per tender load · no N× lookup |
| **Owner staging** | React session state (`stagingByKey`) · **not** written to proposal cache |
| **REUSE** | `selectedWorkId` staging only · **not** `catalogWorkId` |
| **CREATE** | UI staging / disabled downstream · **no** `saveWorkCatalogRouted` |
| **Mobile** | Compact list + drill-in review card (reuse Labor panel pattern) |
| **Tests** | `scripts/test-ik-knr-wc-identity-bridge-p2ui.mjs` (T-P2UI-1…14) |

**UI must separate:** „Sugestia systemu” (`recommendation`, `verificationState`, …) vs „Decyzja Ownera” (`ownerDecision` staging).

**HOLD_UNIT:** `1305-01` / `1305-02` — CREATE blocked in UI · `prob→szt` forbidden.

**localStorage proposal cache ≠ authority** — `ownerDecision` always `unset` on rehydrate (unchanged P2.1/P2.2).

**OQ-D-2:** remains OPEN — P2 UI does not integrate P5 `knrHint`.

### 27b.1 G2 closure — multi-dwelling package seam (IMPLEMENTED)

| Element | Value |
|---------|--------|
| **SSOT caller** | `IkEntryHost` · `ik-entry-conversation` · IK experts — `runIkDocumentExpert({ item, package: getTenderPackage(tenderId) })` |
| **Package store** | `getTenderPackage(tenderId)` → `kw-multi-dwelling-package-v1` · `TenderPackage \| null` |
| **P2 UI fix** | `IkKnrWcIdentityProposalQueuePanel.loadQueue` passes `package: getTenderPackage(tenderId)` — **same contract** as `IkEntryHost` |
| **Why** | MOPS multi-dwelling without package → Document Expert `hold` → KNR Expert `BLOCKED` → queue empty |
| **Write path** | **0** — read-only package lookup |

### 27b.2 G1 closure — test-only runtime hook (IMPLEMENTED)

| Element | Value |
|---------|--------|
| **API** | `forceKnrWcIdentityBridgeRuntimeForTests(on: boolean \| null)` |
| **Pattern** | Mirror `forceIkEntryEnabledForTests` — module-level override · **not** localStorage · **not** production bypass |
| **Scope when ON** | P1 + P2.1 + P2.2 + P2 UI flags behave as enabled |
| **Role gate** | **NOT bypassed** — `isKnrWcIdentityBridgeP2UiRuntimeEnabled()` still requires `isIkEntryEnabled()` (or explicit `ikEntryEnabled: true` in harness) |
| **Defaults** | `KNR_WC_* = false` unchanged in source |
| **Tests** | T-P2UI-11 in `test-ik-knr-wc-identity-bridge-p2ui.mjs` |

### 27b.3 G3 closure — duplicateRisk HIGH compact-list badge (IMPLEMENTED)

| Element | Value |
|---------|--------|
| **UI** | `[data-ik-knr-wc-duplicate-high-badge]` on compact row when `duplicateRisk === "HIGH"` |
| **Semantics** | Advisory only · no auto `ownerDecision` · no recommendation mutation |
| **Authority** | Owner must still choose REUSE/HOLD/REJECT explicitly in review |
| **Tests** | T-P2UI-13 |

### 27b.4 G4 closure — supabaseQueries in cache metrics UI (IMPLEMENTED)

| Element | Value |
|---------|--------|
| **Source** | Existing `batch.cacheMetrics.supabaseQueries` (always `0` in current contract) |
| **UI** | Pass-through in `[data-ik-knr-wc-cache-metrics]` string · **no** new query/lookup |
| **Core** | Cache orchestration unchanged |
| **Tests** | T-P2UI-14 |

---

## 28. Decision record

| Decision | Value |
|----------|-------|
| Variant | **B** |
| Slice D | **UNCHANGED** |
| A1 | **UNCHANGED** |
| KNR Expert | **READ evidence only** |
| WC create | **Owner + P5.26-style REUSE** |
| HTTP/scraping | **OFF** in this DF |
| 32 HOLD | **OUT** |
| Master SSOT | **UNCHANGED** |

---

## 29. OWNER GO — status

| GO type | Status |
|---------|--------|
| GO **DESIGN FREEZE** (Variant B) | **APPROVED** · 2026-08-22 |
| GO **IMPLEMENT P1** (proposal builder, zero business writes) | **DONE** (`d016b4c8`) |
| GO **IMPLEMENT P2.1** (local proposal persist) | **DONE** (`d016b4c8`) |
| GO **IMPLEMENT P2.2** (hardening + Supabase load guard) | **DONE** (local · flag OFF) |
| GO **IMPLEMENT P2 UI** (Owner review queue) | **DONE** (`02e44c6` · prod 2.66.112) |
| GO **IMPLEMENT P3 WC CREATE** | **CLOSED / PRODUCTION VERIFIED** @ UI **2.66.113** · `saveWorkCatalogRouted` only · cache key **`normalizedKey`** · authority boundaries **UNCHANGED** |
| GO **P3.1 NAME ENRICHMENT** | **CLOSED / PRODUCTION VERIFIED** · commit **`5984330a`** |
| GO **P3 CACHE HARNESS FIX** | **CLOSED / PRODUCTION VERIFIED** · commit **`63cb1345`** · **test-only** · harness artifact only |
| GO HTTP allowlist / scraping | **NOT GRANTED** |
| GO WC CREATE / A1 / mapping / pricing (batch) | **NOT GRANTED** (P3 CREATE only · no A1/map/pricing) |
| GO MOPS Accept batch | **NOT GRANTED** |

```text
DESIGN FREEZE = APPROVED
IMPLEMENT P1  = DONE (d016b4c8 · flag OFF)
IMPLEMENT P2.1 = DONE (d016b4c8 · flag OFF)
IMPLEMENT P2.2 = DONE (flag OFF · LIB ONLY)
IMPLEMENT P2 UI = DONE (02e44c6 · prod 2.66.112)
IMPLEMENT P3  = CLOSED / PRODUCTION VERIFIED @ 2.66.113 (saveWorkCatalogRouted only)
P3.1          = CLOSED / PRODUCTION VERIFIED @ 5984330a (BOQ name enrichment)
P3 HARNESS    = CLOSED / PRODUCTION VERIFIED @ 63cb1345 (test-only)
CACHE KEY     = normalizedKey (UNCHANGED)
P3 CREATE GATE = UNCHANGED (DF §27c)
AUTHORITY     = UNCHANGED
HTTP          = OFF
SCRAPING      = OFF
PRICING       = 0 (CREATE path)
WC WRITE      = P3 gated (default 0)
A1 WRITE      = 0
OWNER_KNR_MAPPINGS WRITE = 0
```

Next required Owner decision: **NONE for P3/P3.1 closeout** · residual IK-KNR-WC backlog per DF §30+ only on explicit Owner GO.

---

## 27c. P3 WC CREATE — host seam (IMPLEMENTED · flag OFF)

| Element | Rule |
|---------|------|
| **Lib** | `knr-wc-identity-bridge-create.ts` — `assertKnrWcCreateAllowed` · `buildCatalogWorkDraftFromProposal` · `executeKnrWcCatalogWorkCreate` |
| **Insert reuse** | `work-catalog-insert.ts` — P5.26 `insertWorkBothRegions` · duplicate guard |
| **Write path** | **Only** `saveWorkCatalogRouted` → `work-catalog-sync.ts` |
| **Host** | `IkKnrWcIdentityCreateExecutor.tsx` — **new** · additive in `TenderWorkflowHubPanel` |
| **P2 UI** | **Immutable** — `IkKnrWcIdentityProposalQueuePanel` · `IkKnrWcIdentityProposalReviewCard` unchanged |
| **Flag** | `KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED = false` |
| **Runtime gate** | IK + P1 + P2.1 + P2.2 + P2 UI + **P3 ON** |
| **CREATE guards** | `ownerDecision=CREATE_NEW` · `proposedUnit` · not HOLD_UNIT/1305 · not duplicate workId · not `legacy_only` |
| **Advisory confirm** | `duplicateRisk=HIGH` · `staleEvidence` — explicit checkbox · not auto-block |
| **Out of scope** | A1 · mapping · pricing Accept · HTTP · auto-create |

**Tests:** `scripts/test-ik-knr-wc-identity-bridge-p3.mjs` (T-P3-1…13) · P2 UI T-P2UI-7/8 regression unchanged.

---

**END OF DESIGN FREEZE (APPROVED)**
)
