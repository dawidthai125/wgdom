# IK-MIGRATION-01 — P3 AUDIT (Classification + Identity)

> **ID:** `IK-MIGRATION-01-P3-AUDIT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — **AUDIT ONLY**  
> **Mode:** READ-ONLY · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · CODE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p3-audit.json`  
> **Prior:** P0 PV · P1 harden **`ebab4a9f`** · P2 PV **LIVE 2.66.79 / `f0ba43d`** · impl **`aa4c0edf`** · docs **`a449f0f3`**

---

## STATUS (jedna wartość)

```text
READY_FOR_PLAN
```

**Uzasadnienie:** Formalny scope P3 jest **jasny** (DF §5: Classification + identity na liniach). Stack classification + identity **ALREADY AVAILABLE** w repo (historyczne P3 gate + P5.5 coverage + P5.25–32 internal-first).  
**Nie** deklarujemy `ALREADY_IMPLEMENTED` dla formalnego P3 pod kontrolowanym IK Entry po P2, bo:

1. Brak **P3 PLAN + DESIGN FREEZE** w bieżącej serii Owner GO (P0→P2).
2. Pełne **Identity Coverage** (`runIkMasterBoqIdentityCoverage`) jest za `IK_ENTRY_SHELL_IDENTITY_COVERAGE = false`.
3. Classification **już** odpala się w EC gdy Master BOQ READY — bez osobnego levera P3 (plan musi to uregulować).
4. Internal-first / semantic matcher / category keys = **P5.25–32 infra** do REUSE, nie „P3 done”.

**Nie** `UNDEFINED_SCOPE` · **nie** `BLOCKED` · **nie** `CHATGPT_ESCALATION` (granice P2→P3 czytelne).

```text
P3 AUDIT COMPLETE
READY FOR P3 PLAN
STOP — no implement · no research · no HTTP · no Accept · no P4/P5 auto
```

> **★ NEXT (2026-08-16):** [`IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md) — **P3 PLAN + DESIGN FREEZE = COMPLETE** · READY FOR P3 OWNER GO · **nie** auto IMPLEMENT.
---

## 1. FORMAL P3 SCOPE (SSOT)

| Dokument | Treść |
|----------|--------|
| [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §5 | **P3** = Classification + identity na liniach |
| Ten sam DF · flow | CLASSIFICATION GATE **przed** research |
| [`IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE.md) §12 | P2 stops at validated BOQ · P3 = READY/PARTIAL subset → classification + identity · **no invent** |
| [`IK-MIGRATION-01-P3-CLASSIFICATION-GATE.md`](./IK-MIGRATION-01-P3-CLASSIFICATION-GATE.md) | Historyczny IMPLEMENT (2026-08-15): Master BOQ READY → A1 plane · ZERO research |
| [`IK-MIGRATION-01-P5.5-IDENTITY-COVERAGE.md`](./IK-MIGRATION-01-P5.5-IDENTITY-COVERAGE.md) | Identity Coverage audit (Work+Material) — **późniejsza fala**, diagnostyczna |
| P2 PV / closeout | P3 = **NOT STARTED** · READY FOR P3 OWNER GO |

### Cel P3 (LOCKED z SSOT)

```text
P2 validated Master BOQ (READY | PARTIAL subset)
  → Classification Gate (A1 plane: LABOR | MATERIAL | COMPOUND | UNKNOWN)
  → Identity status / coverage (workId / mat.* / mapper / alias — bez invent)
  → handoff flags do ekspertów (bez auto research)
  → STOP (P4 Chief / P5 Labor E2E — osobny Owner GO)
```

**P3 NIE:** labor/material HTTP research · Accept · CatalogWork create/bind · F5 · Bid · Dual Outcome · category key invent · P5.33 · NG-10 remove.

### Terminologia

| SSOT term | Znaczenie |
|-----------|-----------|
| Classification | `classifyEstimatorPricingPlane` → plane + allow* flags (nie HTTP) |
| Identity (P3 thin) | `identityStatus` na linii (HAS_WORK_ID / HAS_MATERIAL_KEY / MISSING…) w `ik-classification.ts` |
| Identity Coverage (P5.5) | Pełny audit mapper + alias + material exact — `ik-identity-coverage.ts` |
| Handoff | `LABOR_READY_FOR_EXPERT` \| `MATERIAL_READY_FOR_EXPERT` \| `BOTH_HOLD` \| `UNRESOLVED` |

---

## 2. P2 → P3 INPUT CONTRACT

### P2 output (Document Expert)

| Pole | Rola dla P3 |
|------|-------------|
| `masterBoq.status` READY/PARTIAL/HOLD/GAP | Gate wejścia |
| `masterBoq.readyForExperts` | Classification wymaga **READY** (`MASTER_BOQ_NOT_READY` → blocked) |
| `masterBoqLines[]` | lineId, description, qty, unit, dwellingId, branch |
| `lineProvenance` / sourceDocumentId | Zachować 1:1 |
| `offerBoq` | Mapping / identity coverage input |
| `reasons[]` | Diagnostyka; nie reinterpretować jako price miss |

### Które statusy wchodzą

| P2 status | P3 |
|-----------|-----|
| **READY** | **IN** — pełna klasyfikacja |
| **PARTIAL** | **IN** tylko READY subset (P2 DF §8); nie klasyfikować luk jako READY |
| **HOLD** | **STOP** — nie udawać CLASSIFIED |
| **GAP** | **STOP** — nie traktować jako identity miss / market absence |
| PARSER_EMPTY | **≠** brak ceny · **≠** NO_MATCH market |

### Row contract (preserve)

original/normalized description · quantity · unit · provenance · sourceRef · row identity (`lineId`) — **0 invent · 0 silent loss**.

---

## 3. CLASSIFICATION — REUSE MAP

| FILE | FUNCTION | CURRENT ROLE | P3 ROLE | REUSE | RISK |
|------|----------|--------------|---------|-------|------|
| `classification-gate.ts` | `classifyEstimatorPricingPlane` | A1 SSOT plane | **SSOT** | **REUSE** | allow*Research flags = permission only |
| `classification-types.ts` | planes | Taxonomy | KEEP | REUSE | — |
| `owner-classification-map.ts` | Owner 89 seeds | A1 authority | KEEP | REUSE | — |
| `ik-classification.ts` | `runIkMasterBoqClassification` | Orchestracja Master BOQ | **P3 core** | **REUSE** | Auto w EC gdy READY |
| `ik-entry-conversation.ts` | CLASSIFICATION_* events | EC facts | Surface | REUSE | Uruchamia classify sync bez levera P3 |
| `ik-document-expert.ts` | Master BOQ lines | Input | Input | REUSE | — |

**Nie twórz Classification V2.**

Plane outputs: `LABOR` · `MATERIAL` · `COMPOUND` (BOTH_HOLD) · `UNKNOWN` (UNRESOLVED).  
A1: bez workId/mat.* → **UNKNOWN** — **zero invent z namePl**.

---

## 4. IDENTITY — REUSE MAP

| FILE | FUNCTION | CURRENT ROLE | P3 ROLE | REUSE | RISK |
|------|----------|--------------|---------|-------|------|
| `ik-classification.ts` | `identityStatusOf` | Thin identity on classify | P3 minimum | REUSE | Nie jest Product Mapper |
| `ik-identity-coverage.ts` | `runIkMasterBoqIdentityCoverage` | P5.5 diagnostic | Candidate full identity | REUSE behind guard | Host `IDENTITY_COVERAGE=false` |
| `boq-shadow-adapter` / `mapOfferBoqLine` | Work identity resolve | Catalog bind | Identity evidence | REUSE | Quotes gate unchanged |
| `material-market-map` | `resolveDemandProductIdentityExact` | Material exact | Identity | REUSE | No invent |
| `alias-resolver` | Catalog Coverage Alias | Approved text | Identity | REUSE | requireQuotes |
| `internal-first-semantic-match.ts` | EXACT → SEMANTIC → NO_INTERNAL_MATCH | P5.25+ pricing prep | **P3 REUSE = YES (later routing)** | REUSE | Nie auto w P3 host dziś |
| `internal-first-host-safety.ts` | Host object safety | P5.26-E area | REUSE | LOCKED | — |
| `internal-first-domain.ts` | Domain gate | LABOR/PACKAGE/MATERIAL sep | REUSE | LOCKED | — |
| P5.27 / 31 / 32 allowlists | Category keys | PASS2 routing | **UNTOUCHED** | REUSE later | No new keys in P3 |

**P3 REUSE internal-first = YES** (jako istniejący mechanizm) — **nie** oznacza „włącz w P3 bez planu”.

### Status model (istniejący — nie invent)

**Classification report:** `ready` \| `blocked` \| `partial`  
**Handoff:** LABOR_READY_FOR_EXPERT · MATERIAL_READY_FOR_EXPERT · BOTH_HOLD · UNRESOLVED  
**Identity thin:** HAS_WORK_ID · HAS_MATERIAL_KEY · WORK_ID_NO_OWNER_SEED · MISSING_IDENTITY  
**Identity coverage (P5.5):** NON_COST · TRUSTED_WORK · TRUSTED_MATERIAL · TRUSTED_BOTH · APPROVED_ALIAS · OWNER_MAPPING_POSSIBLE · AMBIGUOUS · IDENTITY_GAP  
**Internal-first:** INTERNAL_EXACT_HIT · INTERNAL_SEMANTIC_HIT · NO_INTERNAL_MATCH (+ REVIEW paths w research queue — **nie Accept**)

User-proposed CLASSIFIED/IDENTIFIED/REVIEW/NO_MATCH/GAP → **mapuj na powyższe SSOT**; nie twórz nowych enumów w AUDIT.

---

## 5. CRITICAL BOUNDARY (vs P1 R1)

| Guard (IkEntryHost) | Default | P3 may flip? |
|---------------------|---------|--------------|
| `AUTO_INGEST` | AppSettings OFF (P2 lever) | P2 only — **stay as-is for P3 plan** |
| `EXECUTE_RESEARCH` | **false** | **NO** — P3 must keep OFF |
| `RUN_RATE_EXPERTS` | **false** | **NO** — classification ≠ labor/material expert run |
| `IDENTITY_COVERAGE` | **false** | **Candidate P3 lever only after PLAN** (jak AUTO_INGEST dla P2) |

### Analog R1

| Issue | Finding |
|-------|---------|
| P1 R1: `executeResearch: true` | **FIXED** — shell const false |
| P3: classification in EC | **Runs when `master.readyForExperts`** — sync A1, **no HTTP**, flags `researchExecuted:false` |
| P3: allowLaborResearch on plane | **Permission bit only** — experts still gated |
| Leak path | Jeśli PLAN włączy `RUN_RATE_EXPERTS` + `EXECUTE_RESEARCH` → research — **P0 jeśli zbieg** |

**Wymóg PLAN:** jawny lever / policy „kiedy classify w EC” + zakaz auto expert/research.

---

## 6. CATEGORY KEY BOUNDARY

| Key (P5.31/32) | P3 |
|----------------|-----|
| flooring · repairs_wall · repairs_opening · joinery_finish | **LOCKED — no create / no mutate** |
| categoryKey origin | Pass2 / allowlist / family routing — **nie** wynik samego A1 plane |
| P3 | Może **odczytywać** identity/domain; **nie** invent nowych keys |

---

## 7. PROVENANCE / TRUTH

| Rule | Status |
|------|--------|
| Preserve BOQ sourceRef / lineProvenance through classify | **Designed** (`provenancePreservation` in report) |
| Classification sourceRef kind=`classification` | EC already |
| NO synthetic sourceRef | KEEP |
| NO_MATCH / MISSING_IDENTITY ≠ market absence | **Required in PLAN** |
| PARSER_EMPTY ≠ price miss | Inherited from P2 |
| REVIEW ≠ ACCEPT | Identity/review queues must not auto-Accept |

---

## 8. REVIEW MODEL

| Component | P3 |
|-----------|-----|
| Owner Review / REVIEW-9 (P5.26) | **LOCKED — nie uruchamiać** |
| AMBIGUOUS / IDENTITY_GAP / UNRESOLVED | Output REVIEW-class — **bez Accept** |
| Internal-first semantic REVIEW | Infra exists — REUSE later |
| Auto Accept | **FORBIDDEN** |

---

## 9. UNIT SAFETY

P3 **nie** konwertuje m²↔szt / mb↔szt / kg↔szt bez Owner rule.  
P5.7 unit compatibility = allowlist — REUSE only when already confirmed. Owner Knowledge = SSOT.

---

## 10. P3 → P4/P5 BOUNDARY

```text
P3 ENDS AT:
  classified lines + identity status/coverage report
  (+ EC facts)

P3 MUST NOT START:
  Chief Dual Outcome (P4)
  Labor E2E research (P5)
  Material Phase2 HTTP (P5/P6)
  F5/Bid (P7)
```

Separation: **classification → identity → research** remain distinct stages.

---

## 11. EXISTING TESTS

| TEST | SCOPE | P3 REUSE | MISSING |
|------|--------|----------|---------|
| `test-ik-migration-01-p3-classification.mjs` | A1 classify + recon + Gate A | **YES** | Controlled IK lever / PARTIAL subset policy |
| `probe-ik-migration-01-p3-classification.mjs` | Live ZZK | YES | — |
| `test-ik-migration-01-p55-identity-coverage.mjs` | Identity coverage | YES (if P3 includes P5.5) | Host enablement |
| `test-ik-migration-01-p525-fix-domain-gate.mjs` | Domain PACKAGE/LABOR/MATERIAL | YES | Wire into P3 host |
| `test-ik-migration-01-p526e-matcher-safety.mjs` | Semantic safety | YES | — |
| `test-ik-migration-01-p526/527/531/532-*.mjs` | Category/PASS2 | YES read-only | No mutation |
| PASS2 wave-1 · RW-03 | Allowlist / real-world | Regression only | — |
| P2 implementation | BOQ input | Upstream | P2 GAP → P3 stop cases |

---

## 12. FUTURE P3 TEST MATRIX (AUDIT ONLY — nie implementuj)

| ID | Case |
|----|------|
| A | valid BOQ READY row |
| B–D | LABOR / PACKAGE / MATERIAL plane |
| E–F | exact / semantic internal match |
| G | REVIEW / AMBIGUOUS |
| H | NO_INTERNAL_MATCH / MISSING_IDENTITY |
| I | ambiguous identity |
| J | unsafe semantic (głowica≠grzejnik, emulsja≠wapno, wykucie≠zaprawianie) |
| K | unit mismatch |
| L | missing sourceRef → not verified |
| M | P2 GAP/HOLD → P3 blocked |
| N–O | multi / duplicate rows recon |
| P–R | no research · no Accept · no CatalogWork write |
| S | provenance preservation |
| T | P5.26 regression (471 / rates unchanged) |

---

## 13. SECURITY / TRUST

| Question | Answer |
|----------|--------|
| Unauthorized KV write from classify? | **NO** (pure / report only) |
| Identity coverage write Work Catalog? | **NO** (`seedCreated` always 0 design) |
| Auto HTTP from classify? | **NO** |
| Auto research if experts ON? | **YES risk** — P0 if EXECUTE_RESEARCH leaked ON with experts |
| Price mutation? | **NO** in P3 path |
| CatalogWork create? | **NO** in P3 path |

---

## 14. REUSE MAP (summary)

| CURRENT | P3 ROLE | Verdict | RISK |
|---------|---------|---------|------|
| classification-gate A1 | Plane SSOT | REUSE | allow*Research bits |
| ik-classification | Orchestration | REUSE | Always-on in EC when READY |
| ik-identity-coverage | Full identity | REUSE + **gated OFF** | Enable only via PLAN |
| internal-first + host/domain | Match safety | REUSE (infra) | Do not widen thresholds |
| P5.26–32 keys/PASS2 | Routing lock | UNTOUCHED | Mutation = P0 |
| P2 Document Expert | Input | REUSE | GAP≠identity |
| Labor/Material experts | **OUT of P3** | KEEP OFF | R1 class |
| Category key create | **OUT** | FORBIDDEN | — |

---

## 15. P3 READINESS

| Dimension | Score |
|-----------|--------|
| FORMAL SCOPE | **CLEAR** (DF §5 + P2 DF §12) |
| EXISTING STACK | **HIGH** (classify + identity libs + tests) |
| P2→P3 SEAM | **DEFINED** (READY/PARTIAL subset) · need PLAN for enablement |
| CLASSIFICATION | **AVAILABLE** (already EC-wired) |
| IDENTITY | **PARTIAL** (thin YES · coverage OFF) |
| SAFETY | **GOOD** if research guards stay OFF · **PLAN must lock** |
| TEST COVERAGE | **GOOD base** · gaps on controlled lever + PARTIAL/GAP stops |
| SIDE EFFECT CONTROL | **OK** (no HTTP/Accept) · EC auto-classify needs policy |

---

## 16. RISK MATRIX

| ID | Sev | Risk | Mitigation (PLAN only) |
|----|-----|------|------------------------|
| R-P3-01 | **P0** | Flip `EXECUTE_RESEARCH` / `RUN_RATE_EXPERTS` with P3 | Keep hard OFF; separate Owner GO |
| R-P3-02 | **P1** | EC auto-classify conflated with „P3 COMPLETE” | Explicit P3 lever / DF statement |
| R-P3-03 | **P1** | IDENTITY_COVERAGE ON without review policy | Controlled guard like AUTO_INGEST |
| R-P3-04 | **P1** | P2 GAP/HOLD classified as valid | Enforce MASTER_BOQ_NOT_READY / subset |
| R-P3-05 | **P1** | NO_MATCH → market absence narrative | Truth contract in PLAN |
| R-P3-06 | **P2** | Unsafe semantic match if wired early | Reuse P5.26-E gates only |
| R-P3-07 | **P2** | Unit mutation | Forbid; Owner Knowledge |
| R-P3-08 | **P0** | P5.26 CatalogWork/Accept mutation | Zero write in P3 |
| R-P3-09 | **P2** | REVIEW → ACCEPT leak | Explicit ban |
| R-P3-10 | **P3** | New category keys | Forbidden |

---

## 17. EXECUTION INTEGRITY (this audit)

```text
CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
EDGE = 0
COMMIT = 0
PUSH = 0
```

---

## 18. NEXT

```text
READY FOR P3 PLAN (+ DESIGN FREEZE)
  — controlled classification/identity under IK after P2 BOQ
  — IDENTITY_COVERAGE / EC classify policy
  — research trio stay OFF
  — REUSE only · no Classification V2
STOP — no auto IMPLEMENT
```
