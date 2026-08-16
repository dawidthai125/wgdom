# IK-MIGRATION-01 — P5 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P5-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **Mode:** **FINAL PRODUCTION VERIFY · ONE SHOT** · RESEARCH = 0 (defaults OFF) · Accept = 0 · CatalogWork = 0  
> **JSON:** `.tmp/p5-production-verify.json`  
> **Impl commit:** **`d5a7fa5c`** — `IK-MIGRATION-01: implement P5 labor E2E`  
> **Live tip commit:** **`5fc3ae9`** — docs tip containing impl  
> **Closeout:** [`IK-MIGRATION-01-P5-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P5-IMPLEMENTATION-CLOSEOUT.md)

---

## VERDICT

```text
P5 = PRODUCTION VERIFIED / LOCKED

LIVE VERSION = 2.66.82
LIVE SHA = 5fc3ae9
EXPECTED IMPLEMENTATION = d5a7fa5c
ANCESTOR/CONTAINS = YES (d5a7fa5c ⊂ 5fc3ae9f · 1 docs-only commit)

P5 E2E DEFAULT = OFF (ikLaborE2eEnabled:!1)
P5 RESEARCH DEFAULT = OFF (ikLaborResearchEnabled:!1)
MODE A = NOT_EXERCISED
MODE B = NOT_EXERCISED

EXECUTE_RESEARCH GUARD = PASS (labor: === true only)
HTTP BUDGET = PASS (BUDGET_EXCEEDED guard live · 24/4)
INTERNAL-FIRST = PASS (enableInternalFirst:!0 · P5.26-E REUSE)
RESEARCH FAILURE = PASS (GAP semantics · suite T–X)
CATEGORY ROUTING = PASS (flooring / repairs_* / joinery_finish · no P5.33)
ACCEPT = PASS (candidate ≠ Accept · no auto)
CATALOGWORK = PASS · P5.26 = 471 UNTOUCHED
P4 = unchanged (ikChiefWiringEnabled:!1)
P3 / P2 = unchanged
P6 = NOT STARTED · Material shell_skipped · RUN_RATE_EXPERTS OFF
F5 / BID = untouched
PROVENANCE / UNIT SAFETY = PASS (suite + markers)
TESTS = 44/44 P5 + regression PASS
BUILD = PASS (prior)
MOBILE physical = NOT VERIFIED

Production finish: P5 E2E = OFF · P5 Research = OFF

P5.33 = DO NOT CREATE
P6 = NOT STARTED
STOP — no Material · no F5/Bid · no auto next stage
```

---

## 1. Propagation (ONE SHOT)

| Field | Value |
|-------|--------|
| LIVE `version` | **2.66.82** |
| LIVE `commit` | **`5fc3ae9`** |
| EXPECTED UI | **2.66.82** |
| EXPECTED IMPL | **`d5a7fa5c`** |
| `git merge-base --is-ancestor d5a7fa5c 5fc3ae9f` | **0 (YES)** |
| Between | `5fc3ae9f` = docs tip only |

**Interpretation:** Not `DEPLOY_PROPAGATING`. Continue PV.

**Assets (live):** `index-OVA0Xh_s.js` · `app-core--pIs2i2n.js` · `TendersModule-DyanaIlX.js`

---

## 2–3. P5 levers · P5 OFF

| Check | Evidence | Result |
|-------|----------|--------|
| Defaults OFF in bundle | `ikLaborE2eEnabled:!1` · `ikLaborResearchEnabled:!1` | **PASS** |
| P4 Chief OFF | `ikChiefWiringEnabled:!1` | **PASS** |
| Entry OFF | `ikEntryEnabled:!1` | **PASS** |
| Markers | `data-ik-p5-labor-e2e` · `data-ik-p5-labor-research` | **PASS** |
| No Labor E2E / research / HTTP at defaults | levers OFF ⇒ shell path · research bound to flag | **PASS** |

Production remains **P5 OFF**.

---

## 4–5. MODE A / MODE B

| Mode | Result |
|------|--------|
| MODE A (E2E ON · Research OFF) | **NOT_EXERCISED** — no safe controlled ON in this PV |
| MODE B (both ON · researchEligible · budget) | **NOT_EXERCISED** — no live pricing research manufactured |

Gate path verified in **suite + bundle**:
- Host: `executeResearch:l===!0` (research flag)
- Labor: `executeResearch===!0` (strict true)
- `enableInternalFirst:!0`

Do **not** claim runtime MODE A/B PASS.

---

## 6. Hard default guard

| Path | Pattern | Result |
|------|---------|--------|
| Labor Expert (P5) | `executeResearch===!0` / source `=== true` | **PASS** |
| Host wire | `executeResearch:l===!0` | **PASS** |
| Legacy `!== false` on Labor | **removed** (impl) | **PASS** |
| Material demand path | still has `executeResearch!==!1` | **OUT OF P5** · Material `shell_skipped` · `RUN_RATE_EXPERTS=false` · **P6** |

undefined / MODE A / P5 OFF → research **false**. Only explicit MODE B → **true**.

---

## 7. Budget

| Limit | Guard |
|-------|--------|
| MAX 24 HTTP / run | `IK_P5_MAX_HTTP_PER_RUN` + live `BUDGET_EXCEEDED` deny |
| MAX 4 HTTP / work | `IK_P5_MAX_HTTP_PER_WORK` |
| 0 blind retry | design + suite |

Live TM: `canFetch` → `{ok:!1,error:\`BUDGET_EXCEEDED:…\`,rateGap:!0}` — **actual stop**, not telemetry-only.

---

## 8. Internal-first

| Check | Result |
|-------|--------|
| REUSE P5.26-E lookup / safety | **PASS** (`enableInternalFirst:!0` · `INTERNAL_*` markers) |
| No matcher duplication | **PASS** (index builder only) |
| hostObjectSafety / OK / soft text / grzejnik / malowanie / wykucie | **PASS** (source + P5.26E regression suite) |
| LABOR/PACKAGE/MATERIAL separation | **PASS** |

Matcher behavior **not** altered in PV.

---

## 9. Research failure semantics

Suite + code: `PARSER_EMPTY` · `SOURCE_NO_MATCH` · `QUERY_TOO_NARROW` · identity mismatch · circuit breaker · budget → **GAP** · never invent candidate.

**PASS** (tests T–X + labor expert comments).

---

## 10. Category routing

Live TM keys present: `flooring` · `repairs_wall` / opening · `joinery_finish`.  
`P5.33=0` in bundle. No new category keys. P5.31/P5.32 regression **PASS**.

---

## 11. Accept safety

`acceptIkLabor` present as API surface; **no** research→Accept auto path in P5.  
`autoAcceptExecuted` markers exist elsewhere — Accept still requires Owner + existing gates.  
PV: Accept = **0** exercised. **PASS** (contract).

---

## 12. CatalogWork

| Check | Result |
|-------|--------|
| P5.26 baseline **471** | **PASS** (DF lock + UNTOUCHED) |
| No accepted-rate change by P5 | **PASS** |
| No background CatalogWork write | **PASS** |
| Write only via explicit Owner Accept | **PASS** (not exercised) |

---

## 13–16. Regressions / boundaries

| Area | Result |
|------|--------|
| P4 Chief DEFAULT OFF · T1–T6 / D / Dual / trigger untouched | **PASS** |
| P3 classification / identity | **PASS** (suite) |
| P2 Documents → BOQ | **PASS** (suite) |
| Material research / RUN_RATE_EXPERTS | **OFF** · `data-ik-material-status":"shell_skipped"` |
| P6 | **NOT STARTED** |
| F5 / Bid / Position Cost | **untouched** |

---

## 17–18. Provenance · unit safety

Live: `sourceRef` present · INTERNAL markers.  
BOQ unit SSOT · no auto unit remap · Owner Knowledge does not override BOQ unit — suite + prior DF.

**PASS**.

---

## 19. Test reconfirmation

| Suite | Result |
|-------|--------|
| P5 implementation | **44/44** (re-run this PV) |
| Embedded: P4 / P3 / P2 / P5.26E / 27 / 31 / 32 / legacy labor | **PASS** |
| Prior battery: P0 / P1 / build | **PASS** (implementation closeout) |

Tests **not** modified for this PV.

---

## 20. Mobile

| Layer | Result |
|-------|--------|
| Bundle / desktop assets | markers present |
| Physical device | **NOT VERIFIED** |

---

## 21. Production settings after PV

Controlled ON **not** used. Live defaults remain:

- `ikLaborE2eEnabled = false`
- `ikLaborResearchEnabled = false`

---

## 22. Artifact checklist

| Artifact | Status |
|----------|--------|
| This file | **UPDATED** → PRODUCTION VERIFIED |
| Closeout | **UPDATED** |
| `.tmp/p5-production-verify.json` | **UPDATED** |
| Tip `09_PRODUCTION_BASELINE.md` | **UPDATED** (live tip) |

---

## STOP

```text
P5 = PRODUCTION VERIFIED / LOCKED
P5 E2E = DEFAULT OFF
P5 Research = DEFAULT OFF
P5.26 = LOCKED / 471
P4 / P3 / P2 = unchanged
P6 = NOT STARTED
P5.33 = DO NOT CREATE
NO AUTO NEXT STAGE
```
