# COMPOUND PARENT → CANONICAL LABOR LEAF — RESOLUTION KNOWLEDGE (v1)

> **ID:** `COMPOUND-PARENT-LABOR-LEAF-RESOLUTION-V1`  
> **STATUS:** ACTIVE · KNOWLEDGE / POLICY  
> **Date:** 2026-09-13  
> **Case:** TPI/729 — 27 × `COMPOUND_PARENT_WITHOUT_OUR_RATE__NEEDS_LABOR_LEAF`  
> **GO mode:** IMPLEMENT ONLY CONFIRMED · fail-closed  
> **Artefact (ops):** `.tmp/go-tpi729-compound27-resolution-report.json`  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Pattern (closed):** [`TECHNOLOGY-RECIPE-SOURCE-KNR-2-02-0815-05-GYPSUM-SKIM-V1.md`](./TECHNOLOGY-RECIPE-SOURCE-KNR-2-02-0815-05-GYPSUM-SKIM-V1.md)

---

## 0. Executive verdict (this GO)

```text
Wave ×22 RESEARCH_REQUIRED (2026-09-13 · tip 2.66.197):
  ACLC CREATE leaves: 0815-04 · 2006-04 · 1205-09 (knnr-2) · 1118-09 · 0829-03
  CLLR exact-scope rules: ADDED (≠ parent-global)
  AUT-R1: 0 ACCEPT (no durable PLN evidence) → FAIL-CLOSED
  CLLR ACCEPT on ×22 lines: 0 (LEAF_RATE_MISSING — contract requires CURRENT)
  Demolition / foam / 0411-08: NOT TOUCHED
  0815-05 leaf+pack: UNTOUCHED
```

Partial groundwork is intentional: identity+CatalogWork ready; Finance stays fail-closed until AUT-R1 CURRENT.

---

## A. How we recognize `COMPOUND_PARENT_WITHOUT_OUR_RATE`

Producer (Finance): `boq-shadow-adapter` → `resolveLaborInputFromOurWorkRate` ∈ `{MISSING, NO_IDENTITY, PROVISIONAL}` → gap `BRAK_STAWKI_ROBOT`.

Refined RCA class when:

| Signal | Meaning |
|--------|---------|
| `plane === COMPOUND` | Parent is package / multi-activity host |
| Trusted OfferBoq identity on parent | Identity OK ≠ labor pricing authority |
| `lookupWorkRate(parent) = MISSING` | Parent has no CURRENT OUR RATE (expected for COMPOUND) |
| No durable labor leaf bind | CLLR not applied or leaf not ready |

**Do not** treat “missing rate on compound parent” as “need a rate on the parent”.

---

## B. Why we never create OUR RATE on a compound parent

```text
COMPOUND PARENT
  ≠ single labor activity
  ≠ Catalog First labor identity for Position Cost
  ≠ authority for TechnologyPack labour leaf

COMPOUND_PARENT_RATE_GAP
  → RESOLVE_CANONICAL_LABOR_LEAF_FIRST
  → trusted identity on LABOR leaf
  → OUR RATE CURRENT on leaf
  → Technology/BOM on leaf (if required)
  → Position Cost
```

Creating OUR RATE on the parent:

- hides the missing leaf,
- pollutes Catalog First,
- breaks BOM binding (packs bind leaf `catalogWorkId`),
- violates CLLR contract (`OUR_RATE_MUST_BE_CURRENT` is evaluated on the **leaf**).

Closed proof pattern: `legacy-gladzie_tynki-m2` → `cw.knr.knr-2-02.0815-05.m2` → CURRENT 22.88 → TechnologyPack → COMPLETE (ceiling only).

---

## C. How we identify the canonical labor leaf

Order of authority (no fuzzy-as-sole-proof):

1. Existing WGDOM mappings / CLLR rules (exact scope gates)
2. Existing CatalogWorks (`cw.knr…`)
3. Verified KNR knowledge (`CHATGPT_KNR_RESEARCH_TPI729_VERIFIED`)
4. TechnologyPack scope (`steps[]` / `labour[]` exact ids)
5. Durable labor Evidence
6. External BIP / official KNR sources (identity + norms — **not** automatic PLN)

Canonical id construction: `buildAutonomousCanonicalWorkId({ catalogFamilyPrefix, tableCode, unit })`.

### TPI/729 ×27 inventory (character split)

| Parent | × | Character | Proposed leaf (canonical) | Notes |
|--------|---|-----------|---------------------------|-------|
| `legacy-gladzie_tynki-m2` | 7 | Walls double-layer gypsum skim **0815-04** | `cw.knr.knr-2-02.0815-04.m2` | ≠ 0815-05 ceiling (CLOSED) |
| `cc-w2-scianki-dzialowe-gr-pakiet-m2` | 6 | GK ceiling single on grid **2006-04** | `cw.knr.knr-2-02.2006-04.m2` | Package parent ≠ labor authority |
| `legacy-podlogi-m2` | 6 | Floor panels **1205-09** | `cw.knr.knnr-2.1205-09.m2` | Do not collapse all floors to one leaf |
| `legacy-podlogi-m2` | 3 | Foam underlay under panels | `0616-01` vs `0604-01` | **OWNER_DECISION_REQUIRED** |
| `legacy-podlogi-m2` | 1 | Demontage panels | `cw.knr.knr-4-04.0504-07.m2` | Verified record |
| `legacy-podlogi-m2` | 1 | Stone tiles **1118-09** | `cw.knr.knr-2-02.1118-09.m2` | |
| `legacy-stolarka-szt` | 2 | Door threshold demontage **0411-08** | multi-family | **OWNER_DECISION_REQUIRED** |
| `legacy-glazura-m2` | 1 | Wall tiles on glue **0829-03** | `cw.knr.knr-2-02.0829-03.m2` | |

---

## D–E. Sources used and authority

| Source | What it proves | Authority? |
|--------|----------------|------------|
| `chatgpt-knr-research-knowledge-data.ts` (TPI/729 verified) | Family / table / unit / description tokens | **Yes** (identity) |
| Live `kw-wgdom-work-catalog` | Leaf presence + `ourWorkRate` freshness | **Yes** (Catalog First) |
| CLLR-v1.1 `evaluateCompoundToLaborLeafRebind` | ACCEPT only when scope + leaf∈WC + CURRENT | **Yes** (rebind gate) |
| BIP / public KNR PDFs cited in verified records | Norms (r-g), material qty factors | Identity / technology; **not** OUR RATE PLN |
| 0815-05 closed pack recipe | Pattern for TechnologyPack after leaf CURRENT | Supporting pattern only — **do not copy** to 0815-04 |

### Hard rule

```text
KNR_LABOR_NORM != OUR_RATE_PLN
```

r-g / robotnik-godzina from nakład is a **technology labour norm**, never auto-converted to company OUR RATE.

---

## F. How CLLR is used

- Seam: `compound-to-labor-leaf-rebind-contract.ts` (CLLR-v1.1)
- Production: IdentityPhase evaluate → `runGatedIdentityPersist` (durable OfferBoq)
- Packs: Orchestra passes `packs=undefined` → ALLB optional; relevant packs = exact parent/leaf bind only
- Current rule implemented: **ceiling single-layer gypsum skim → 0815-05 only**
- Explicitly **rejects** walls **0815-04** (`SCOPE_NOT_CEILING_SINGLE_LAYER_GYPSUM_SKIM`)
- ACCEPT requires `lookupWorkRate(leaf) === CURRENT` — **no research inside CLLR**

**This GO:** did **not** auto-extend CLLR. Extending a rule without leaf∈WC + CURRENT would create dead ACCEPT paths or pressure to invent rates.

---

## G. How we checked CURRENT OUR RATE

For each proposed leaf:

1. `getWorkByIdFromStore(store, leafWorkId)`
2. `lookupWorkRate(store, leafWorkId, unit, nowMs)`
3. Require `status === CURRENT` and `ourRatePln > 0`

**Live probe result:** among candidates, only `cw.knr.knr-2-02.0815-05.m2` is in catalog with CURRENT (22.88) — **out of scope** for the residual 27 (non-ceiling / other characters).

AUT-R1 path: requires durable labor Evidence with PLN candidate. RCA lines show `evidenceUnavailable: true` → **no** safe AUT-R1 Accept.

---

## H. What was NOT auto-resolved (and why)

| Blocker | Effect |
|---------|--------|
| `LEAF_NOT_IN_CATALOG` | ACLC create needs evidence-gated Owner/autonomous create — not silent invent |
| `LEAF_RATE_MISSING` | No invent PLN; no r-g→PLN; AUT-R1 blocked without Evidence |
| `CLLR_RULE_ABSENT` for non-0815-05 scopes | Do not modify CLLR until leaf+CURRENT ready |
| Foam underlay family ambiguity | OWNER_DECISION_REQUIRED |
| `0411-08` multi-family | OWNER_DECISION_REQUIRED |
| TechnologyPack absent | Do not invent packs without BIP/licensed authority (0815-05 pattern) |

Out of scope for this GO (unchanged): 14 × absent CatalogWork LABOR, 7 × catalog without rate evidence, 2 × MATERIAL plane, unit gap, residual BOM.

---

## I. Reusable rules for next tenders

1. **`COMPOUND_PARENT_RATE_GAP → RESOLVE_CANONICAL_LABOR_LEAF_FIRST`**
2. **`KNR_LABOR_NORM != OUR_RATE_PLN`**
3. Split compound parents by **real work character** (never one leaf for all lines sharing a parent id).
4. Package CatalogWorks (`cc-w2-…-pakiet-…`) are **not** labor authority when line text carries a distinct KNR leaf code.
5. CLLR ACCEPT prerequisites (all): exact scope gate · parent COMPOUND · leaf∈WC · unit compatible · OUR RATE CURRENT · ALLB if relevant packs present.
6. After leaf CURRENT: TechnologyPack leaf-exact bind; omit compound parent from `steps[]` when parent hosts mixed scopes.
7. Partial progress is valid: identity without BOM / BOM without complete sell — **do not** force `positionComplete`.

### Next Owner gates (ordered)

1. ACLC (or Owner create) for verified missing leaves  
2. Durable PLN Evidence → AUT-R1 CURRENT  
3. CLLR rule per exact scope (mirror 0815-05 gates)  
4. TechnologyPack with documented BIP/licensed qty authority  
5. Owner decisions: foam 0616-01 vs 0604-01; threshold 0411-08 family  

---

## Related code

| Seam | Path |
|------|------|
| CLLR | `src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts` |
| ACLC | `src/lib/work-catalog/autonomous-canonical-leaf-create.ts` |
| OUR RATE lookup | `src/lib/work-catalog/work-rate-lookup.ts` |
| AUT-R1 | `src/lib/work-catalog/aut-r1-accept*.ts` · `aut-r1-from-durable-evidence.ts` |
| Verified KNR | `src/lib/intelligent-estimator/knr-knowledge/chatgpt-knr-research-knowledge-data.ts` |
| CLLR tests | `scripts/test-compound-to-labor-leaf-rebind-go.mjs` |
