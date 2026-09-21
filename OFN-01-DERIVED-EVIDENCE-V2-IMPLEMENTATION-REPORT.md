# OFN-01 — DERIVED EVIDENCE V2 — IMPLEMENTATION REPORT

**Owner GO:** YES · **Data:** 2026-09-21  
**Phase:** IMPLEMENT (Schema v2) · **STOP** — no commit / push / deploy / prod ingest

---

```text
IMPLEMENTATION = COMPLETE

SCHEMA_V2 = PASS
FORMULA_REGISTRY = PASS
PROVENANCE = PASS
HOST_LOCK = PASS
IDENTITY = PASS
UNIT = PASS
FRESHNESS = PASS
DEDUPE = PASS
CONFLICT = PASS
AUT_R1 = PASS
OUR_RATE_SEPARATION = PASS
BACKWARD_COMPATIBILITY = PASS

T1 = PASS
T2 = PASS
T3 = PASS
T4 = PASS
T5 = PASS
T6 = PASS
T7 = PASS
T8 = PASS
T9 = PASS
T10 = PASS
T11 = PASS
T12 = PASS
T13 = PASS
T14 = PASS

MUTATIONS = local code + test fixtures only
PRODUCTION_MUTATIONS = 0
COMMIT = NO
PUSH = NO
DEPLOY = NO
```

---

## 1. Co wdrożono

### SSOT

Bez zmian: `kw-wgdom-labor-source-evidence` · ten sam upsert/CAS/merge · **bez** drugiego Evidence Engine.

### Schema v2

| Element | Wartość |
|---------|---------|
| Store `schemaVersion` | `2` |
| `priceKind` | + `derived` |
| `derivation` | obowiązkowy gdy `derived` |
| `qualityStatus` | + `REJECTED_DERIVATION` |
| Direct v1 | `point\|range\|from_floor\|unknown` — czytelne (obs stamp `1`) |

### Formula registry (closed)

- `LABOR_NORM_X_RATE` / `v1`
- Semantyka: `r-g/unit × PLN/r-g → PLN/unit`
- **Zakaz:** `eval()`, `new Function()`, agent expression execution
- `formulaExpression` = audit metadata only

### Owner input routes (jawna allowlist)

| sourceId | Host | Rola |
|----------|------|------|
| `finn_kosztorys_nakladowy_0815_04_norm` | res.finn.pl | labor_norm |
| `bzg_tynkarskie_cr_q2_2026` | bzg.pl | labor_cost_rate |

Composite top-level: `derived_labor_norm_x_rate_v1`

### Seamy

| Seam | Zmiana |
|------|--------|
| `buildDerivedLaborSourceEvidenceObservation` | nowy builder |
| `assertDerivedLaborEvidenceHostLock` | multi-input |
| `validateDerivedLaborEvidence` | identity · unit · formula · freshness |
| `buildLaborSourceEvidenceDedupeKey` | fingerprint derivation |
| `evaluateAutR1LaborAcceptContract` | walidacja derived + `DERIVED_EVIDENCE_INVALID` |
| `buildCandidateFromDurableLaborEvidence` | `marketBaseKind: derived_point` · fail-closed multi-rate |
| Direct builder | **nie** pozwala smuggować `derived` jako `point` |

---

## 2. Identity / Conflict / OUR RATE

- Exact leaf `cw.knr.knr-2-02.0815-04.m2` → derived OK  
- Compound `legacy-gladzie_tynki-m2` → **HOLD**  
- DIRECT `13.15` + DERIVED `26.64` → **2 obs · CONFLICT · HOLD** (bez winner)  
- Evidence upsert ≠ OUR RATE · Accept nie wywołany

---

## 3. Testy

```text
npx vite-node scripts/test-ofn01-derived-evidence-v2.mjs
→ 41 PASS / 0 FAIL

npx vite-node scripts/test-labor-source-evidence-01.mjs
→ 79 PASS / 0 FAIL

npx vite-node scripts/test-tpi729-48-residual-labor-research-v1.mjs
→ 23 PASS / 0 FAIL

npm run build
→ PASS (✓ built in 30.53s)
```

TPI/729 example `0.5093 × 52.30 = 26.64` — tylko w teście lokalnym · **nie** zapisano do production KV.

---

## 4. Pliki

**Nowe**

- `src/lib/labor-source-evidence/derived-labor-formulas.ts`
- `src/lib/labor-source-evidence/derived-labor-input-routes.ts`
- `src/lib/labor-source-evidence/derived-labor-validate.ts`
- `scripts/test-ofn01-derived-evidence-v2.mjs`

**Zmodyfikowane**

- `types.ts` · `normalize.ts` · `dedupe.ts` · `ingest.ts` · `store.ts` · `host-lock.ts` · `source-roles.ts` · `index.ts`
- `aut-r1-accept-contract.ts` · `work-rate-qualify.ts` · `apf-labor-evidence-persist.ts`

---

## 5. Następny etap (Owner)

```text
OWNER VERIFICATION → COMMIT → PUSH → PRODUCTION VERIFY
```

potem osobne **DATA GO** dla Research sources / ingestu cen.

**STOP** — bez commit / push / deploy / prod ingest.
