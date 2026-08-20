# IK — HISTORICAL EXECUTED ATH · ARCHITECTURE REVIEW #01

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-ARCH-REVIEW-01` |
| **Gate** | `OD-IK-HISTORICAL-EXECUTED-ATH-ARCH-REVIEW-01` |
| **Status** | **ARCH REVIEW = PASS WITH GAPS** |
| **Date** | 2026-08-20 |
| **Mode** | **ARCHITECTURE REVIEW ONLY** · **READ-ONLY** · **ZERO implementation** |
| **Audit** | [`IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md`](./IK-HISTORICAL-EXECUTED-ATH-AUDIT-01.md) |
| **Plan** | [`IK-HISTORICAL-EXECUTED-ATH-PLAN-01.md`](./IK-HISTORICAL-EXECUTED-ATH-PLAN-01.md) |
| **Design Freeze** | [`IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01.md`](./IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01.md) **COMPLETE / PASS WITH GAPS** |
| **Master SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |

```text
AUDIT                  = COMPLETE / PASS WITH GAPS
PLAN                   = COMPLETE / PASS WITH GAPS
DESIGN FREEZE          = COMPLETE / PASS WITH GAPS
ARCH REVIEW            = PASS WITH GAPS
IMPLEMENTATION         = NOT AUTHORIZED

src / runtime / VERIFY / APPROVE / REJECT = 0
catalog / evidence writes / KL-6 / Level A   = 0
commit / push / deploy                       = 0
```

**Werdykt skrót:** Zamrożona architektura jest **zgodna z Master SSOT** i **da się bezpiecznie zaimplementować** jako osobny IMPL gate — pod warunkiem twardych banlist (no KL-6 imports), Validation seam przez P8/EC (nie nowy ekspert), oraz MISS bez globalnego tender downgrade. **Brak HARD blockerów** uniemożliwiających przejście do IMPL po Owner GO.

---

## 1. MASTER SSOT COMPLIANCE

| Wymóg Master / IK | DF Historical | Arch verdict |
|-------------------|---------------|--------------|
| IK = orchestrator, nie drugi TenderModule | Host + istniejący Chief | **PASS** |
| KNR Expert owner sygnału KNR | `runIkKnrExpert` owner History | **PASS** |
| Brak drugiego orchestratora | pure lookup + extend report | **PASS** |
| Brak drugiego chat engine | `buildIkKnrConversation` + EC Surface | **PASS** |
| Brak drugiego KNR Expert | extend existing | **PASS** |
| History ≠ Catalog | no KV catalog · kinds ≠ VERIFIED | **PASS** |
| EC = istniejący mechanizm | `ExpertConversationSurface` | **PASS** |
| Validation = istniejący ekspert | `analyzeValidationFromDossier` via P8 | **PASS** (seam wymaga jawnego feed — §3) |
| SEARCH BEFORE CREATE / no rebuild pricing | soft only Labor/Material | **PASS** |

**HARD GAP vs Master SSOT:** **brak**.

---

## 2. REUSE AUDIT

| Element | Path | Verdict |
|---------|------|---------|
| ATH parse / normalize | `src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts` · `parseAthKnrNormExport` | **EXISTING → REUSE** |
| KNR Expert | `src/lib/intelligent-estimator/ik-knr-expert.ts` · `runIkKnrExpert` | **EXISTING → EXTEND** |
| KNR conversation | `src/lib/intelligent-estimator/ik-knr-conversation.ts` · `buildIkKnrConversation` | **EXISTING → EXTEND** |
| Entry conversation VM | `src/lib/intelligent-estimator/ik-entry-conversation.ts` · `buildIkEntryConversationViewModel` | **EXISTING → REUSE** (consumes `opts.knr`) |
| EC Surface | `src/app/expert-conversation/ExpertConversationSurface.tsx` | **EXISTING → REUSE** |
| Host orchestration | `src/app/intelligent-estimator/IkEntryHost.tsx` | **EXISTING → REUSE** (call order already has KNR sync) |
| Document Expert | `ik-document-expert.ts` · `runIkDocumentExpert` | **EXISTING → REUSE** (input BOQ) |
| Validation Expert | `@/lib/validation-expert` · `analyzeValidationFromDossier` | **EXISTING → EXTEND input/findings** (via P8) |
| P8 | `ik-p8-risk-decision.ts` · `runIkP8RiskDecision` | **EXISTING → EXTEND** (optional historical risk) |
| Labor / Material | `ik-labor-expert.ts` / `ik-material-expert.ts` | **EXISTING → SOFT later** (MVP off) |
| Hash / provenance | parser `contentHash` · harvest `contentSha256` · evidence-store **patterns** | **EXISTING → REUSE concepts** |
| Corpus discovery | jobFiles `kosztorys` · harvest pattern (`.tmp` / docs) | **EXISTING → REUSE pattern** |
| Normative KL-3 HOST | `resolveHostKnrKnowledgeLookupOnly` | **EXISTING · PARALLEL** — **nie** merge z History |
| KL-6 verify | `knr-verify-orchestrator.ts` | **EXISTING · FORBIDDEN import** w History module |
| PDF Candidate | `knr-pdf-match-candidate.ts` | **EXISTING · optional hint** |
| Test harness style | `scripts/test-knr-pdf-match-candidate.mjs` (H-* asserts, banlist) | **EXISTING → REUSE pattern** |
| Pure Historical lookup + types | — | **MISSING → NEW** (thin; only if no duplicate) |
| Second Catalog / chat / orchestrator / parser | — | **FORBIDDEN** |

---

## 3. EXACT INTEGRATION SEAM

### 3.1 Historical → KNR Expert (primary)

```text
FILE:    src/app/intelligent-estimator/IkEntryHost.tsx
TODAY:   useMemo → runIkKnrExpert({ tenderId, documentExpert: report })

IMPL seam (authorized design only):
  Option A (preferred):
    runIkKnrExpert internally calls pure lookupHistoricalExecuted(...)
    after reading Master BOQ lines — keeps Host unchanged except deps

  Option B (acceptable):
    Host: const historical = lookup...(report)
          const knr = runIkKnrExpert({ ..., historical })
```

**Canonical module (NEW thin, post-IMPL GO):**  
`src/lib/intelligent-estimator/historical-executed/`  
(lub równoważna nazwa) — **pure** `lookupHistoricalExecuted*` · **zero** imports z `knr-verify-orchestrator` / write-router / persist*.

**Extend types:** `IkKnrExpertLineResult.historical?: HistoricalLookupResult`  
w `ik-knr-expert.ts` (DF §I).

### 3.2 KNR → EC

```text
IkEntryHost
  → buildIkEntryConversationViewModel(..., { knr })
       FILE: ik-entry-conversation.ts ~L550–556
       → buildIkKnrConversation(opts.knr)
            FILE: ik-knr-conversation.ts
       → steps → ExpertConversationSurface
            FILE: src/app/expert-conversation/ExpertConversationSurface.tsx
            (via IkExpertRoomChrome)
```

**IMPL:** rozszerzyć `buildIkKnrConversation` o agregaty kind/counts z `report.lines[].historical` — **bez** nowego Surface.

### 3.3 KNR / History → Validation (MVP)

```text
TODAY Validation path:
  runIkP8RiskDecision
    FILE: ik-p8-risk-decision.ts
    → analyzeValidationFromDossier(dossier)
         PACKAGE: @/lib/validation-expert

IMPL seam (frozen choice for ARCH):
  Pass knr.historical aggregates into P8 OR into a thin
  `appendHistoricalValidationFindings(validation, historicalSummary)`
  BEFORE DW VM — Soft/Hard for CONFLICT only;
  MISS must NOT add blocking finding.

  DO NOT create ValidationExpert v2.
```

**EC remains primary narrative;** Validation is structured risk consumer.

---

## 4. DATA FLOW — authority risk scan

```text
Historical ATH (completed jobs)
  → parseAthKnrNormExport                    [READ]
  → in-memory index                          [READ]
  → lookupHistoricalExecuted(line)           [PURE]
  → IkKnrExpertReport.historical             [REPORT]
  → buildIkKnrConversation                   [PRESENTATION]
  → ExpertConversationSurface                [UI]
  → Validation/P8 findings                   [SOFT/HARD info]
  → (Labor/Material soft — deferred)         [HINT only]
```

| Forbidden step | Risk if IMPL couples | Mitigation |
|----------------|----------------------|------------|
| catalog write | HARD | banlist harness · no Catalog store API |
| VERIFY/APPROVE/REJECT | HARD | no import `executeKnrOwnerVerify*` |
| KL-6 mutation | HARD | no `persistVerifiedKnrCatalogEntry` |
| autoOwnerVerify / batch | HARD | N/A in module |
| runtime LLM | HARD | none planned |
| price / Work Catalog overwrite | HARD | no rate fields in result; Labor soft OFF MVP |

**Current code:** History path **does not exist** → **zero** authority leakage today.  
**Arch condition for IMPL:** banlist tests (wzorzec PDF Candidate) = **mandatory**.

---

## 5. MATCH SEMANTICS

DF hierarchy **is the contract** (PLAN numbering superseded — **DOC GAP only**, not blocker):

| L | Meaning | Kind |
|---|---------|------|
| L0 | EXACT + FULL R/M/S | `HISTORICAL_EXACT_RMS` |
| L1 | EXACT identity | `HISTORICAL_EXACT` |
| L2 | EXACT display + compatible identity | `HISTORICAL_EXACT` |
| L3 | FAMILY | `HISTORICAL_FAMILY` |
| L4 | SEMANTIC | soft / MVP OFF |
| L5 | NO HISTORY | `HISTORICAL_MISS` |

| Invariant | Arch |
|-----------|------|
| EXACT ≠ FAMILY | **PASS** |
| FAMILY ≠ VERIFIED | **PASS** |
| frequency ≠ authority | **PASS** |
| history ≠ norm / price | **PASS** |

---

## 6. CONFLICT

| Rule | Arch |
|------|------|
| Pattern A/B (ŚCIANY vs BIAŁY MONTAŻ / M qty) → `HISTORICAL_CONFLICT` | **PASS** (DF §G) |
| No majority / first / latest | **PASS** |
| Keep both variants + provenance | **PASS** if result carries `conflict.variants[]` |
| Corpus note: 1003-06 vs documented chapter-folds | **SOFT** — pattern frozen; fixture may use `0115-02` / synthetic |

Implementowalność: **TAK** na pure aggregation po `identityKeyV2` / `contentHash` / chapter.

---

## 7. MISS — CRITICAL

| Check | Arch |
|-------|------|
| MISS ≠ wrong KNR / reject / block pricing | **PASS** (DF §L) |
| Flow continues Class → Labor → Material → P7 → P8 | **PASS** — Host already runs experts independently of History (History nie istnieje; IMPL must not gate them on History) |
| MISS must not auto-downgrade **whole tender** confidence | **SOFT GAP → IMPL constraint:** Validation/P8 **must not** map MISS → tender `blocked` / global HOLD |

**HARD GAP:** **brak** — pod warunkiem IMPL constraint powyżej.

---

## 8. REAL TENDER COMPATIBILITY

```text
NEW TENDER
  → Document Expert (IkEntryHost / NG-02)
  → Master BOQ cost lines
  → KNR Expert + Historical lookup
  → EC
  → Validation (P8)
  → Labor ∥ Material → Composite → P7 → P8 → Chief
```

History = **supporting evidence**, not mandatory match DB — **PASS** with MISS first-class.

---

## 9. PDF GAP

Źródło: [`IK-AI-OWNER-REAL-TENDER-PDF-GAP-AUDIT-01.md`](./IK-AI-OWNER-REAL-TENDER-PDF-GAP-AUDIT-01.md) · Shadow #01/#02.

| PDF reality | Frozen behavior |
|-------------|-----------------|
| No FULL R/M/S / identityKeyV2 / ATH contentHash | **Cannot** invent L0 `HISTORICAL_EXACT_RMS` |
| Truncated family codes | L3 FAMILY or L5 MISS |
| Table token in description | may enable L2 display-exact join to corpus — still ≠ L0 without identity+RMS |
| PDF Candidate | hint only · ≠ History VERIFIED |

**HARD GAP:** **brak** if IMPL forbids identity invention (align PDF Candidate null `identityKeyV2`).

---

## 10. AUTHORITY / SECURITY

| Invariant | Arch |
|-----------|------|
| Historical READ ONLY | **PASS** (design) |
| KNR/EC decision support | **PASS** |
| KL-6 sole VERIFY/APPROVE/REJECT | **PASS** · parallel module |
| No access to persist*/executeVerify*/write-router | **PASS if banlist** |

**Potential HARD if violated in IMPL:** importing verify orchestrator into historical lookup.  
**Arch Review:** treat as **IMPL FAIL condition**, not current code defect.

---

## 11. LEVEL A COMPATIBILITY

Policy / Level A DF: History may be **future input**; must not self-trigger AUTO_ELIGIBLE / APPROVE.  
This epic: **no Level A changes** — **PASS**.

---

## 12. LABOR / MATERIAL

MVP OFF soft wire — **PASS**.  
Constraint: historical R qty ≠ OUR_RATE; historical M ≠ market — **PASS**.

---

## 13. PROVENANCE

DF requires job / ATH / address / hashes / identity / RMS / occurrence counts / conflict / evidenceRef / `authority:false`.

| Risk | Class |
|------|-------|
| Dropping variants on CONFLICT | would be **HARD** if IMPL does it — forbid in harness |
| Missing address on some jobs | **SOFT** |

---

## 14. STORAGE

MVP: no new Catalog KV · on-the-fly/in-memory — **compatible** with current system (jobs already hold ATH paths; harvest proved 9/9 bytes).

Persistent corpus index = **FUTURE PHASE / ARCH GAP** — not required to start IMPL.

---

## 15. PERFORMANCE

| Factor | Assessment |
|--------|------------|
| 9 ATH · ~400 POZYCJA · 86 FULL | Parse+index once per session / tender open: **reasonable** |
| Per-line lookup | O(1)/O(log) map by display/identity after index |
| Existing cache | KL-3 HOST is **normative** — do not overload; optional memo on Host of historical index |
| New index KV | **not required** for MVP |

**SOFT GAP:** measure on first IMPL shadow; escalate to projection only if Owner GO.

---

## 16. ACCURACY HARNESS

DF O covers 1–12. Brief adds 13–18 — **TEST GAPS** below (SOFT — add to IMPL harness plan).

Authority tests mandatory: NO VERIFY / APPROVE / REJECT / CATALOG WRITE / KL-6 — **PASS as requirement**.

---

## 17. SHADOW TEST #03 PLAN (design only)

| Field | Value |
|-------|-------|
| **ID** | `IK-AI-OWNER-REAL-TENDER-SHADOW-TEST-03` *(planned)* |
| **Mode** | READ-ONLY shadow · localhost |
| **Tender** | `2026/BZP 00391783` (same as #01/#02) |
| **Stack** | Document → KNR+Historical → EC messages → Validation findings |
| **Assert** | kinds counts · MISS not blocking · CONFLICT fail-closed · catalogWrites=0 · KL-6=0 |
| **Not** | VERIFY · APPROVE · Catalog · Level A execute |

Baseline expect (from Audit join, approximate): exact-ish ~21 · family ~48 · miss ~19 · L0 rare on PDF.

---

## 18. DOCUMENTATION DRIFT

| Drift | Class |
|-------|-------|
| PLAN L0–L5 numbering vs DF (DF wins) | **DOC GAP** |
| PLAN OD-H* vs DF OD-HDF* naming | **DOC GAP** |
| Owner example 1003-06 vs Quality corpus chapter-folds | **DOC GAP / SOFT** |
| PDF bridge docs vs History (parallel, no contradiction if boundaries held) | **PASS** |
| Level A IMPL NOT AUTHORIZED vs History as future input | **PASS** (compatible) |
| Master SSOT „IK orchestrator” vs new lookup module | **PASS** if thin pure lib |

**Do not auto-edit** other docs in this review.

---

## FINAL VERDICT

```text
ARCH REVIEW = PASS WITH GAPS
```

### HARD GAPS

**None that block IMPL authorization after Owner GO**, provided IMPL respects:

1. Banlist: no KL-6 / persist / write-router / Accept writes  
2. MISS ≠ tender-level block / Validation error  
3. No identity invention on PDF-only lines for L0  
4. CONFLICT retains all variants  

*(Violation of any = IMPL FAIL / would become HARD.)*

### SOFT GAPS

| ID | Gap |
|----|-----|
| SG-AR-1 | Validation feed not pre-wired — must add thin P8/findings adapter |
| SG-AR-2 | L4 semantic MVP OFF — undefined engine |
| SG-AR-3 | Perf unmeasured on Host open |
| SG-AR-4 | Labor/Material soft deferred |
| SG-AR-5 | Harness cases 13–18 not yet in DF list (add at IMPL) |
| SG-AR-6 | Conflict fixture may use synthetic / `0115-02` if 1003-06 not split in corpus |

### DOC GAPS

| ID | Gap |
|----|-----|
| DG-AR-1 | PLAN hierarchy numbering superseded by DF |
| DG-AR-2 | Owner decision ID rename PLAN→DF |
| DG-AR-3 | 1003-06 narrative vs Quality Audit facts |

### OPEN OWNER DECISIONS

| ID | Question | Arch recommendation |
|----|----------|---------------------|
| **OD-HDF-1** | L4 in MVP? | **OFF** |
| **OD-HDF-2** | Labor/Material soft in first IMPL? | **OFF** |
| **OD-HDF-3** | Projection KV? | **OFF** until measured |
| **OD-HAR-1** | **GO IMPL gate?** | Await Owner after this ARCH |
| **OD-HAR-2** | Validation via P8 append vs EC-only MVP? | **P8 append Soft for CONFLICT** + EC always |

### REUSE MAP

See §2 — **NEW only:** pure lookup + types + harness; **EXTEND:** `runIkKnrExpert`, `buildIkKnrConversation`, optional P8/Validation findings.

### EXACT INTEGRATION SEAM

```text
parseAthKnrNormExport
  → in-memory Historical index
  → lookupHistoricalExecuted (NEW pure)
  → runIkKnrExpert (...historical on lines)     [ik-knr-expert.ts]
  → buildIkKnrConversation                      [ik-knr-conversation.ts]
  → buildIkEntryConversationViewModel           [ik-entry-conversation.ts]
  → ExpertConversationSurface                   [expert-conversation/]
  → runIkP8RiskDecision + analyzeValidation…    [ik-p8 + validation-expert]
       append CONFLICT Soft/Hard; ignore MISS as error
```

Host anchor: `IkEntryHost.tsx` KNR `useMemo` (~L229–237) + VM (~L478+) + P8 (~existing).

### AUTHORITY INVARIANTS

```text
Historical = READ ONLY evidence
KNR/EC/Validation = decision support
KL-6 = sole VERIFY/APPROVE/REJECT
frequency ≠ authority
history ≠ VERIFIED ≠ OUR RATE ≠ market
MISS ≠ reject
CONFLICT = fail-closed · keep all provenances
```

### TEST GAPS

Add to IMPL harness beyond DF 1–12:

13 PDF partial · 14 PDF description-only · 15 PDF family-only · 16 unknown KNR · 17 same displayCode / different identity · 18 history match + current semantic mismatch · **+ import banlist / zero mutation asserts**.

### SHADOW TEST #03 PLAN

See §17 — design only; run after IMPL GO.

---

```text
════════════════════════════════════════════════════
ARCH REVIEW            = PASS WITH GAPS
IMPLEMENTATION         = NOT AUTHORIZED

NEXT (Owner GO required):
  OD-IK-HISTORICAL-EXECUTED-ATH-IMPL-GATE
  (or equivalent IMPL brief)

ZERO src · ZERO VERIFY · ZERO CATALOG · ZERO KL-6/Level A changes
ZERO commit · ZERO push · ZERO deploy
STOP.
════════════════════════════════════════════════════
```
