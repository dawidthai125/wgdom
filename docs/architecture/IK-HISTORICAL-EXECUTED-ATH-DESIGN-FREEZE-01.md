# IK — HISTORICAL EXECUTED ATH · DESIGN FREEZE #01

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01` |
| **Gate** | `OD-IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01` |
| **Status** | **DESIGN FREEZE = COMPLETE / PASS WITH GAPS** |
| **Date** | 2026-08-20 |
| **Mode** | **DESIGN FREEZE ONLY** · **ZERO implementation** · **ZERO `src/**`** |
| **Audit** | [`IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md`](./IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md) **COMPLETE / PASS WITH GAPS** |
| **Plan** | [`IK-HISTORICAL-EXECUTED-ATH-PLAN-01.md`](./IK-HISTORICAL-EXECUTED-ATH-PLAN-01.md) **COMPLETE / PASS WITH GAPS** |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) **NADRZĘDNY** |
| **KNR Expert DF** | [`IK-KNR-EXPERT-DESIGN-FREEZE.md`](./IK-KNR-EXPERT-DESIGN-FREEZE.md) — **nie łamać** Slice A evidence / no knrHint authority |

```text
AUDIT                  = COMPLETE / PASS WITH GAPS
PLAN                   = COMPLETE / PASS WITH GAPS
DESIGN FREEZE          = COMPLETE / PASS WITH GAPS
ARCH REVIEW            = NOT STARTED
IMPLEMENTATION         = NOT AUTHORIZED

VERIFY / APPROVE / REJECT = 0
catalog / evidence writes = 0
KL-6 / Level A / legal-gate = UNCHANGED
commit / push / deploy    = 0
```

**Hierarchia numeracji:** ten DF **SUPERSEDUJE** numerację L0–L5 z PLAN §6 (PLAN miał L0=MISS … L5=FULL).  
**Frozen:** L0 = najsilniejszy exact+RMS · L5 = NO HISTORY (zgodnie z briefem Ownera na DF).

---

## A. Purpose

Zamrozić kontrakt warstwy **Historical Executed WGDOM Knowledge** (= **EXECUTED WGDOM EVIDENCE**):

- jakie KNR występowały w zakończonych, Owner-accepted realizacjach,
- jakie `identityKeyV2` / R/M/S / warianty,
- frequency / multi-job occurrence,
- exact vs family vs miss vs conflict,
- sygnał dla **KNR Expert** → Expert Conversation → Validation (MVP),
- soft hint dla Labor/Material **bez** authority.

```text
history = evidence of what WGDOM executed
history ≠ KNR norm authority
history ≠ current price list
history ≠ VERIFIED
history ≠ APPROVE
```

---

## B. Scope

### B.1 IN (frozen for future MVP design)

| # | Item |
|---|------|
| 1 | Read-only Historical lookup for Master BOQ lines |
| 2 | Match hierarchy L0–L5 (§F) |
| 3 | Result kinds (§F.2) — **bez** VERIFIED/APPROVED/REJECTED |
| 4 | Conflict fail-closed (§G) |
| 5 | MISS first-class (§L) |
| 6 | KNR Expert = owner sygnału (§I) |
| 7 | EC via `buildIkKnrConversation` (§J) |
| 8 | MVP consumers: KNR + EC + Validation |
| 9 | Labor/Material = soft only (§K) |
| 10 | Provenance + authority invariants (§H, §M) |
| 11 | Accuracy Harness contract (§O) |
| 12 | Real Tender flow (§P) |
| 13 | MVP storage stance: on-the-fly / in-memory projection — **nie** nowy Catalog KV (§E) |

### B.2 Corpus eligibility (frozen MVP)

| Criterion | Frozen |
|-----------|--------|
| Source files | `jobFiles[]` · `kind=kosztorys` · `*.ath` |
| Job filter | `jobStatus === completed` (MVP) |
| Owner claim | executed + accepted + settled — **business provenance**; filename `*ofertowy*` **nie** neguje eligibility |
| Parser | **REUSE** `parseAthKnrNormExport` only — no second ATH parser |

---

## C. Non-goals

| # | Forbidden |
|---|-----------|
| 1 | Second TenderModule / second IK orchestrator / second chat engine |
| 2 | Second `kw-knr-catalog` or normative store |
| 3 | Second ATH parser |
| 4 | Auto VERIFY / APPROVE / REJECT / batch / `autoOwnerVerify` |
| 5 | Catalog write · `catalogWorkId` · knrHint authority from history |
| 6 | Replace Work Catalog / Price Memory / KNR Catalog / research |
| 7 | frequency → authority / AUTO_ELIGIBLE / APPROVE |
| 8 | History R/M/S → OUR RATE / market price |
| 9 | PDF Candidate → PENDING_VERIFY |
| 10 | Level A IMPL / runtime LLM / KL-6 changes / legal-gate changes |
| 11 | Majority / first-match / latest-wins conflict resolve |
| 12 | Treating MISS as error / bid block |

---

## D. Architecture seam (FROZEN)

```text
ATH (completed jobs)
  → Historical Executed normalize (REUSE parseAthKnrNormExport)
  → Historical Executed Knowledge (read-only index / projection)
  → lookup(line) → HistoricalLookupResult
  → KNR Expert (owner; extends report — no new expert)
  → buildIkKnrConversation
  → ExpertConversationSurface / Chief (existing)
  → Validation (MVP consumer)
  → Labor / Material (SOFT only — post-MVP wire OK, same contract)
  → P7 context / P8 risk (soft; no auto bid)
```

**Call site (frozen):**

```text
IkEntryHost
  → runIkDocumentExpert (Master BOQ ready)
  → runIkKnrExpert
       includes / immediately followed by historical lookup (pure)
  → buildIkEntryConversationViewModel({ knr })
```

**Kto wywołuje lookup:** KNR Expert path (same sync window as completeness).  
**Kto NIE wywołuje:** Document, Labor, Material, Chief (no circular deps).  
**Kto może „odrzucić” sygnał:** Validation/P8 (risk escalate); Owner Human — **nie** auto-delete evidence.  
**Kto oznacza CONFLICT:** lookup pure function (deterministic) → KNR report field.

```text
Historical Executed Knowledge MUST NOT:
  mutate Catalog · create VERIFIED · APPROVE/REJECT · change KL-6
  set catalogWorkId · replace Work Catalog / Price Memory / research
  grant authority from frequency
```

---

## E. Data model (FROZEN minimal)

### E.1 Storage stance (FROZEN MVP)

| Decision | Frozen |
|----------|--------|
| Normative Catalog | **untouched** |
| New persistent KV for History | **NOT in MVP** |
| Runtime | Parse/index **read-only** from existing job ATH bytes (pattern: corpus harvest) |
| Persistence later | Only if ARCH proves perf need · **still ≠ Catalog** · Owner GO |
| Immutability | Corpus treated as **immutable evidence**; new uploads = new sources, no silent rewrite of past hashes |
| Dedup | `contentSha256` (file) + `contentHash` (RMS body) · same hash = one evidence body, many job refs OK |
| Aggregate | by `displayCode` / `identityKeyV2` / `family+catalogId` |

REUSE patterns: `knr-evidence-store` **concepts** (hash dedup) for **design**, not mandatory wire into KL-5 pending queue. Historical evidence **lifecycle ≠** PENDING_VERIFY.

### E.2 Conceptual records

**`HistoricalExecutedSource`**

| Field | Required | Notes |
|-------|----------|-------|
| `jobId` | Y | |
| `address` / project label | Y | |
| `storagePath` / `filename` | Y | |
| `contentSha256` | Y | file provenance |
| `jobStatus` | Y | must be completed (MVP) |
| `uploadedAt` | N | |

**`HistoricalExecutedOccurrence`**

| Field | Required | Notes |
|-------|----------|-------|
| `sourceRef` | Y | |
| `displayCode` | Y | |
| `family` / `catalogId` / `tableCode` | as available | |
| `description` / `unit` / `quantity` | as available | |
| `identityKeyV2` | N | when FULL parse yields it |
| `edition` / `chapter` / `publisher` | N | |
| `rmsClass` | Y | FULL / PARTIAL / NO |
| `rmsSnapshot` | N | R/M/S rows when FULL |
| `contentHash` | N | when FULL |
| `observedCost` | N | **display/audit only — never pricing authority** |

**`HistoricalLookupResult`** (per Master BOQ line) — §F.2

### E.3 Must NOT store / imply

- `status: VERIFIED|APPROVED|REJECTED`
- `ourRate` / `marketPrice` / `sellPrice` derived as truth
- `autoEligible` / `recommendedApprove`
- `catalogWorkId`

---

## F. Match hierarchy L0–L5 (FROZEN)

**Ordering:** lower number = stronger match.  
**EXACT > FAMILY.** **FAMILY ≠ EXACT.**

| Level | Id | Predicate (frozen) | Result kind |
|------:|----|--------------------|-------------|
| **L0** | `EXACT_IDENTITY_FULL_RMS` | Same `identityKeyV2` **and** FULL R/M/S snapshot **and** consistent `contentHash` across contributing exact hits (no RMS conflict) | `HISTORICAL_EXACT_RMS` |
| **L1** | `EXACT_IDENTITY` | Same `identityKeyV2`; RMS missing/partial or not asserted | `HISTORICAL_EXACT` |
| **L2** | `EXACT_DISPLAY_COMPATIBLE` | Same display KNR (`family+catalogId+tableCode`) · identity compatible or single-identity set · **not** conflict | `HISTORICAL_EXACT` *(display-exact; confidence ≤ L1)* |
| **L3** | `FAMILY` | Same family+catalogId · **no** table / no identity | `HISTORICAL_FAMILY` |
| **L4** | `SEMANTIC_SUPPORT` | Description/token support only · **no** code exact · **MVP: optional / may emit as FAMILY-adjacent LOW or omit from auto EC** | soft only — **never** EXACT |
| **L5** | `NO_HISTORY` | No usable historical hit | `HISTORICAL_MISS` |

**Overrides (frozen):**

```text
IF conflict rules fire (§G) → HISTORICAL_CONFLICT
  (wins over L0–L4; not a level — a terminal kind)

IF L4 without Owner GO to enable semantic EC → do not claim EXACT/FAMILY code match
```

### F.1 Confidence (frozen bounds)

| Kind | Max confidence |
|------|----------------|
| `HISTORICAL_EXACT_RMS` | HIGH |
| `HISTORICAL_EXACT` | HIGH (L1) / MED (L2) |
| `HISTORICAL_FAMILY` | LOW |
| `HISTORICAL_CONFLICT` | N/A → HUMAN |
| `HISTORICAL_MISS` | N/A |

```text
frequency ≠ authority
history ≠ norm
history ≠ current market price
history ≠ automatic approval
CONFLICT = FAIL-CLOSED
UNKNOWN = FAIL-CLOSED
```

### F.2 Result kind contract (FROZEN)

**Allowed:**

```text
HISTORICAL_EXACT_RMS
HISTORICAL_EXACT
HISTORICAL_FAMILY
HISTORICAL_CONFLICT
HISTORICAL_MISS
```

**Forbidden as Historical statuses:**

```text
VERIFIED · APPROVED · REJECTED · PENDING_VERIFY · AUTO_ELIGIBLE
```

### F.3 Provenance payload (required on every non-MISS result)

| Field | Required |
|-------|----------|
| `sourceJobs[]` (`jobId`, address/project) | Y |
| `sourceAth[]` (filename, storagePath, contentSha256) | Y |
| `identityKeyV2` (when known) | if L0/L1 |
| `contentHash` / hash set | when RMS asserted |
| `rmsAvailable` / sample RMS summary | when FULL |
| `occurrenceCount` | Y |
| `exactOccurrenceCount` | Y (≥0) |
| `familyOccurrenceCount` | Y (≥0) |
| `distinctJobCount` / `distinctSourceCount` | Y |
| `conflict` detail | if CONFLICT |
| `evidenceRef` (opaque id / hash pointer) | Y |
| `matchLevel` L0–L5 | Y |
| `authority: false` | **literal frozen** |

---

## G. Conflict semantics (FROZEN)

### G.1 Triggers

Same `displayCode` (or same table identity key) across corpus **and** any of:

| Kind | Example pattern |
|------|-----------------|
| `IDENTITY_SPLIT` | ≥2 `identityKeyV2` / chapter-fold domains |
| `RMS_HASH_SPLIT` | ≥2 FULL `contentHash` for same identity/display |
| `CHAPTER_DOMAIN` | e.g. ŚCIANY vs BIAŁY MONTAŻ for same display |
| `MATERIAL_VARIANT` | material brand/SKU/qty regime incompatible |
| `UNKNOWN_VARIANT` | cannot prove compatibility → **FAIL-CLOSED CONFLICT** |

**Canonical Owner example (pattern):**

```text
KNR 2-05 1003-06
  variant A: ŚCIANY / sufit / M≈0.18
  variant B: BIAŁY MONTAŻ / armatura / M≈0.33
→ HISTORICAL_CONFLICT
```

**Corpus note (non-blocking):** Quality Audit documents chapter-fold primarily on codes such as `0115-02`, `0803-01`, `0311-03`; `1003-06` appears as READY FULL+PARTIAL mix in current 9-file corpus. **DF freezes the conflict pattern**, not a claim that 1003-06 currently splits that way in harvest.

### G.2 Forbidden resolve strategies

```text
majority wins · first match wins · latest wins · silent merge
```

### G.3 Routing

```text
HISTORICAL_CONFLICT
  → KNR Expert field + EC fact
  → Validation finding (Soft/Hard)
  → P8 needs_review ↑
  → Labor/Material: DO NOT consume RMS as soft rate hint
  → Catalog/KL-6: no action
```

---

## H. Provenance

```text
Legal / semantic label (FROZEN):
  "WGDOM-owned historical execution evidence"
  NOT "licensed KNR norm"
  NOT "official catalog authority"
```

Preserve: job · address · ATH path · hashes · identity · RMS · occurrence aggregates.  
Do not launder history into normative Catalog identity without KL-6 Owner path (separate epic).

---

## I. KNR Expert integration (FROZEN)

| Rule | Frozen |
|------|--------|
| New expert? | **NO** |
| Owner of Historical signal | **`runIkKnrExpert`** |
| Existing `lineStatus` (NONE/HOLD/CANDIDATE/…) | **unchanged meaning** (current tender basis) |
| New field | `historical: HistoricalLookupResult \| null` per line + aggregate counts on report |
| Research / mapper / catalogWorkId | **still ZERO** from this epic |
| Slice A / knrHint | **UNCHANGED** — history must not feed `knrHint` |

Example EC facts (owned by KNR Expert):

- „Ten KNR występował w 3 zakończonych realizacjach WGDOM i w każdym przypadku miał zgodne R/M/S.”
- „Nie znaleziono tego KNR w historycznych realizacjach WGDOM. Brak historii nie oznacza błędu — potrzebna jest analiza źródła KNR.”
- „W historii występują dwa warianty tego samego displayCode. Nie należy wybierać wariantu automatycznie.”

---

## J. Expert Conversation integration (FROZEN)

| Rule | Frozen |
|------|--------|
| Engine | **REUSE** `buildIkKnrConversation` → `buildIkEntryConversationViewModel` → `ExpertConversationSurface` |
| New chat / UI surface | **NO** |
| Aggregation | Continue C2 discipline (lead + report + wrap + few examples) — **not** 1 turn per line |
| `sourceRef.kind` | Prefer `evidence` / `hold` / `candidate` with artifact `{ historicalKind, counts, authority:false }` |
| FACT vs INTERPRETATION vs RECOMMENDATION | FACT in message; INTERPRETATION only as „nie norma”; RECOMMENDATION ≤ „do weryfikacji człowieka” — **never** VERIFY |

| Kind | Required message intent |
|------|-------------------------|
| `HISTORICAL_EXACT_RMS` | Historyczny odpowiednik + zgodne R/M/S + N realizacji |
| `HISTORICAL_EXACT` | Historyczny odpowiednik znaleziony (bez claim FULL jeśli brak) |
| `HISTORICAL_FAMILY` | Rodzina znaleziona · brak exact identity |
| `HISTORICAL_MISS` | Brak historycznego odpowiednika · **nie błąd** |
| `HISTORICAL_CONFLICT` | Sprzeczne warianty · nie wybierać auto |

Chief may summarize facts; **must not** say „norma KNR potwierdza…”.

---

## K. Labor / Material / Validation boundaries (FROZEN)

### K.1 MVP consumers

```text
MVP = KNR Expert + Expert Conversation + Validation
Labor / Material = SOFT SIGNAL ONLY (wire may be Phase 2; contract frozen now)
P7 / P8 = context / risk only
```

### K.2 Soft signal examples

| Allowed | Forbidden |
|---------|-----------|
| „Historyczne wykonanie WGDOM zawierało nakład R=0.3298 r-g.” | `OUR RATE = 0.3298` |
| „Historycznie występował materiał X / qty Y.” | `Material price = historical` · Price Memory write |
| Brand/SKU substitution flag → HUMAN | Auto-accept substitution |

### K.3 Validation

| Signal | Behavior |
|--------|----------|
| EXACT / EXACT_RMS | Soft info |
| FAMILY | Soft low-confidence info |
| CONFLICT | Soft/Hard · human |
| MISS | **Not an error finding** |

---

## L. MISS behavior (FROZEN · CRITICAL)

```text
HISTORICAL_MISS
  ≠ wrong KNR
  ≠ reject position
  ≠ block pricing
  ≠ Validation error

HISTORICAL_MISS
  = no executed WGDOM analogue in corpus
  → continue normal IK (Document → Class → Labor/Material → P7/P8 → research-on-miss paths as already designed)
```

Corpus will **not** contain all future tender KNRs. MISS is **first-class** and expected (Real Tender #01 ≈19/88).

---

## M. Security / authority invariants (FROZEN)

```text
1. authority: false on every HistoricalLookupResult
2. No Catalog mutation / no persistVerifiedKnrCatalogEntry
3. No executeKnrOwnerVerify* from History path
4. No write-router bypass
5. No catalogWorkId / knrHint from History
6. No Accept / OUR RATE / Price Memory writes from History
7. No scrape_* elevation for normative KNR via History
8. Frequency metrics informational only
9. CONFLICT / UNKNOWN → fail-closed HUMAN
10. Read-only lookup in tests and runtime design
```

---

## N. Level A compatibility (FROZEN)

| | |
|--|--|
| History as future Level A **input evidence** | **ALLOWED** (design) |
| History alone → AUTO_ELIGIBLE | **FORBIDDEN** |
| History → VERIFIED / APPROVE | **FORBIDDEN** |
| Level A IMPL in this epic | **NOT AUTHORIZED** |
| KL-6 | **UNCHANGED sole mutation** |

---

## O. Accuracy Harness (FROZEN design)

| # | Case | Expect |
|---|------|--------|
| 1 | EXACT identity + FULL RMS | `HISTORICAL_EXACT_RMS` · L0 |
| 2 | EXACT identity without RMS | `HISTORICAL_EXACT` · L1 |
| 3 | FAMILY only | `HISTORICAL_FAMILY` · L3 · not EXACT |
| 4 | CONFLICT | `HISTORICAL_CONFLICT` · no picked variant |
| 5 | MISS | `HISTORICAL_MISS` · L5 · not error |
| 6 | Duplicate same ATH | dedup occurrence; distinctSource stable |
| 7 | Duplicate across ATH · same hash | multi-job · one hash body |
| 8 | Different chapter | CONFLICT |
| 9 | Different M quantity (FULL split) | CONFLICT or non-L0 |
| 10 | History + current tender line | join provenance |
| 11 | 0 history corpus | all MISS |
| 12 | Multi-source same hash | distinctJobCount↑ · CONSISTENT |

**Every case must assert:**

```text
READ ONLY · NO AUTHORITY · NO CATALOG WRITE · NO KL-6 MUTATION
```

---

## P. Real Tender flow (FROZEN)

```text
PDF / ATH / BOQ (new tender)
  → Document Expert → Master BOQ
  → KNR Expert (+ Historical lookup)
  → Expert Conversation

Exact   → "Historyczny odpowiednik znaleziony." (+ RMS if L0)
Family  → "Historyczna rodzina KNR znaleziona, ale brak exact identity."
Miss    → "Brak historycznego odpowiednika w corpus WGDOM."
Conflict→ "Historyczne warianty sprzeczne — bez auto-wyboru."
```

Assistance for estimator — **not** a filter blocking new KNR.  
Baseline shadow: `2026/BZP 00391783` (Audit #01).

PDF Candidate remains optional **hint input** only (Shadow #02 boundary unchanged).

---

## Q. Reuse map (FROZEN)

| Existing | Role |
|----------|------|
| `IkEntryHost.tsx` | call order |
| `runIkDocumentExpert` | BOQ lines |
| `runIkKnrExpert` | **extend** — Historical owner |
| `buildIkKnrConversation` | **extend** — EC facts |
| `buildIkEntryConversationViewModel` / `ExpertConversationSurface` | presentation |
| `parseAthKnrNormExport` | normalize ATH |
| jobFiles / completed jobs | corpus sources |
| `analyzeValidationFromDossier` / P8 | Validation consumer |
| Labor / Material experts | soft consumers later |
| `knr-pdf-match-candidate` | optional hints · no Catalog |
| KL-3 HOST / KL-6 Catalog | **parallel normative** · not History store |
| Chief session / orchestrator | consume EC facts · no new Chief |

**NEW (minimal, post-ARCH/IMPL only):** pure `lookupHistoricalExecuted*` + types + harness — **not** new expert/orchestrator/storage Catalog.

---

## R. Open questions

| ID | Question | Blocks IMPL? |
|----|----------|--------------|
| **OQ-1** | Enable L4 semantic EC in MVP or defer? | Soft — default **defer** |
| **OQ-2** | Projection KV if on-the-fly too slow? | Soft — default **defer until measured** |
| **OQ-3** | Require explicit `cityAccepted` metadata beyond `completed`? | Soft — MVP **`completed`** frozen; richer metadata later |
| **OQ-4** | Wire Labor/Material soft in same IMPL slice as Validation? | Soft — DF default **Validation-first** |
| **OQ-5** | Exact wording PL strings final copy? | Soft — ARCH/IMPL polish |
| **OQ-6** | OPEN-BI-2 frequency→impact (Level A) | **Out of scope** |

---

## S. Exit criteria

DESIGN FREEZE exits **COMPLETE / PASS WITH GAPS** when:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Boundary History ≠ Catalog ≠ Pricing frozen | **YES** |
| 2 | L0–L5 + result kinds frozen (no VERIFIED statuses) | **YES** |
| 3 | CONFLICT fail-closed frozen | **YES** |
| 4 | MISS first-class frozen | **YES** |
| 5 | KNR Expert owner + EC reuse frozen | **YES** |
| 6 | MVP vs soft Labor/Material frozen | **YES** |
| 7 | Authority invariants frozen | **YES** |
| 8 | Harness cases listed | **YES** |
| 9 | No src / no impl | **YES** |
| 10 | Open questions listed without silent resolve | **YES** |

---

## HARD GAPS

| ID | Gap |
|----|-----|
| **HG-DF-1** | Brak runtime implementation (expected) |
| **HG-DF-2** | Brak zamrożonych final PL copy strings (OQ-5) — nie blokuje ARCH |
| **HG-DF-3** | Asymmetry PDF tender lines (often no identityKeyV2) vs ATH FULL — L0 rare on PDF-only tenders; L2/L3 dominate — **by design**, fail-closed |

## SOFT GAPS

| ID | Gap |
|----|-----|
| SG-DF-1 | L4 semantic engine undefined beyond tokens |
| SG-DF-2 | Perf of full 9-ATH parse per tender open |
| SG-DF-3 | Richer acceptance metadata |
| SG-DF-4 | P7 badge UX details |

## OPEN OWNER DECISIONS

| ID | Decision | DF default (frozen until Owner overrides) |
|----|----------|-------------------------------------------|
| **OD-HDF-1** | L4 in MVP EC? | **OFF** |
| **OD-HDF-2** | Labor/Material soft in first IMPL? | **OFF** (Validation-first) |
| **OD-HDF-3** | Persist projection KV? | **OFF** until perf evidence |
| **OD-HDF-4** | GO ARCH REVIEW? | **Awaiting Owner** |

---

## Integration seam (exact)

```text
Master BOQ line
  → extract catalogBasis / optional PDF candidate hint
  → lookupHistoricalExecuted(line, corpusIndex)  // pure, read-only
  → HistoricalLookupResult { kind, level, provenance, authority:false }
  → IkKnrExpertReport.lines[i].historical
  → buildIkKnrConversation aggregates
  → Validation findings (MVP)
  // Labor/Material/P7/P8: soft optional consumers — same result object
```

---

## Proposed next gate

```text
NEXT = ARCHITECTURE REVIEW
ID   = IK-HISTORICAL-EXECUTED-ATH-ARCH-REVIEW-01

Scope:
  - Confirm no Catalog / KL-6 / knrHint coupling
  - Confirm IkEntryHost call order & circular-dep freedom
  - Confirm Validation finding codes
  - Confirm harness file placement (scripts/)
  - PASS / PASS WITH GAPS / BLOCKED

IMPLEMENTATION = NOT AUTHORIZED until Owner GO after ARCH
```

---

## FINAL

```text
════════════════════════════════════════════════════
DESIGN FREEZE = COMPLETE / PASS WITH GAPS

AUDIT = COMPLETE / PASS WITH GAPS
PLAN  = COMPLETE / PASS WITH GAPS
ARCH REVIEW = NOT STARTED
IMPLEMENTATION = NOT AUTHORIZED

Historical Executed = WGDOM execution evidence
≠ norm · ≠ VERIFIED · ≠ APPROVE · ≠ OUR RATE · ≠ market

MISS = first-class · not an error
CONFLICT = fail-closed · no majority

ZERO src · ZERO VERIFY · ZERO CATALOG WRITE
ZERO commit · ZERO push · ZERO deploy
STOP.
════════════════════════════════════════════════════
```
