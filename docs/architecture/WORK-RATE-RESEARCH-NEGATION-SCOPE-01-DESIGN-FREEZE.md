# DESIGN FREEZE — WORK-RATE-RESEARCH-NEGATION-SCOPE-01

> **Epic:** `WORK-RATE-RESEARCH-NEGATION-SCOPE-01`  
> **Parent:** WAVE2-E.3 audit · WAVE2-E.4 PLAN · WAVE2-E.5 IMPLEMENT  
> **Stage:** **IMPLEMENTATION COMPLETE (local)** · Owner GO IMPLEMENT **2026-09-25**  
> **Extends:** KB-BRUZDY-POLICY-01 · WR-LABOR-IDENTITY-MAPPING-01 · DISCOVERY-01

```text
NEW_ENGINE           = NO
AUT-R1               = UNCHANGED (upstream block only)
17 MATCH_EMPTY       = OUT OF SCOPE (no electrical coverage changes)
CLOUD / OUR RATE     = ZERO writes from this epic
```

---

## Contract

```text
POSITIVE_SCOPE  = actions/objects asserted outside `bez …` spans
NEGATIVE_SCOPE  = actions/objects under `bez` + action (+ optional object)

IF family-trigger regex matches only inside a negated span
  → that trigger MUST NOT fire

IF synonym action / canonicalConcept ∈ NEGATIVE_SCOPE (incl. concept-family expand)
  → synonym INELIGIBLE for matchNames / PASS2 matching
```

**Forbidden:** `"bez zaprawiania bruzd"` → family=`grooves` → synonym `"szpachlowanie bruzd po kablach"`.

**Allowed:** positive `"zaprawianie bruzd"` / `"szpachlowanie bruzd po kablach"` as BOQ scope — grooves + fill synonyms unchanged.

---

## Code SSOT

| Module | Role |
|--------|------|
| `src/lib/work-catalog/work-rate-negation-scope.ts` | `extractResearchNegativeScope` · `maskNegatedResearchSpans` · `isSynonymIneligibleForNegativeScope` |
| `work-rate-discovery-allowlist.ts` → `resolveWorkRateWorkFamily` | classify on masked soft blob |
| `work-rate-synonyms.ts` → `listWorkRateMatchNamesPl` | filter INELIGIBLE synonyms |

**Do not duplicate** in AUT-R1 / Edge HTML / CatalogWork schema.

---

## Tests

```bash
npx vite-node scripts/test-work-rate-negation-scope-01.mjs
npx vite-node scripts/test-work-rate-kb-bruzdy-policy-01.mjs
```

---

## Out of scope

- 17 MATCH_EMPTY / electrical PASS2 coverage  
- AUT-R1 scope validation  
- LLM / embeddings / new Research engine  
- OUR RATE / Accept / cloud writes  
