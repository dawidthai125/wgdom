# DESIGN FREEZE — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE

> **Epic:** `INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE`  
> **SSOT audit:** [`INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-AUDIT.md`](./INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-AUDIT.md)  
> **Owner Review:** [`INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT.md`](./INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT.md) · **COMPLETE**  
> **Tip / baseline:** **2.66.56** / **`d0c1f198`**  
> **Date:** 2026-08-14  
> **Mode:** DESIGN FREEZE **APPROVED** · IMPLEMENT **GREEN (local)** · COMMIT **NOT DONE**

```text
DESIGN FREEZE                      = APPROVED (this file + Owner Decision Closeout below)
OWNER REVIEW (89-row classes)      = COMPLETE
AUDIT                              = COMPLETE
ARCH REVIEW                        = CLOSED · APPROVE WITH AMENDMENTS · A1–A5 CLOSED
OWNER DECISION CLOSEOUT (A1–A5)    = COMPLETE
IMPLEMENT                          = GREEN (local · v2.66.57 · undeployed)
COMMIT / PUSH / DEPLOY             = NOT DONE
Evidence / Registry / Catalogs     = UNCHANGED (guards only · ZERO populate/write)
OUR RATE / Accept / margin         = UNCHANGED
SOURCE GAP                         = OPEN
NICHE                              = NOT CLAIMED
NEXT                               = OWNER GO: COMMIT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```

---

## A. Objective

Zaprojektować **jedną centralną bramkę SSOT**:

**CLASSIFICATION GATE**

która **przed** każdym pricing / research flow ustala dokładnie jedną z klas:

| Class | Meaning |
|-------|---------|
| `LABOR` | Czynność wykonawcza — robocizna |
| `MATERIAL` | Produkt/rzecz — nie czynność |
| `COMPOUND` | Niebezpieczna mieszanka / dual / MATERIALS_REQUIRED bez dekompozycji |
| `UNKNOWN` | Brak bezpiecznej klasy (w tym legacy A3 buckets) |

Bramka jest **upstream routing** — nie silnikiem identity, nie research, nie Accept, nie Evidence write.

```text
INPUT
  → CLASSIFY          ← THIS GATE (SSOT)
  → ROUTE
  → IDENTITY          (existing WR-LABOR-IDENTITY-MAPPING / material identity)
  → CATALOG LOOKUP
  → if MISS → RESEARCH (plane-specific sources only)
  → EVIDENCE / derive
  → appropriate catalog (Owner Accept for labor OUR RATE)
```

---

## B. Owner-approved classification model

### B.1 Binding rules (from Owner Decision Closeout)

| Class | Rule | Research |
|-------|------|----------|
| **MATERIAL** | Produkt bez jawnej czynności montażowej (multiswitch, zawór, oprawa, ETICS SKU, farba, panele, …) | **MATERIAL** path only |
| **LABOR** | Jawna czynność (montaż, zdjęcie, mocowanie, malowanie, wykonanie, demontaż, …) | **LABOR** path only |
| **COMPOUND** | Kilka operacji / dual / MATERIALS_REQUIRED bez bezpiecznej 1:1 | **HOLD** — no auto labor/material research |
| **UNKNOWN** | Nie da się bezpiecznie ustalić; legacy A3 buckets | **HOLD** — no research · no invent |

### B.2 Hard distinctions (non-negotiable)

| Do **not** confuse | Correct |
|--------------------|---------|
| `gniazdo` / `multiswitch` / `oprawa` / `zawór` | **MATERIAL** |
| `montaż gniazda` / `montaż multiswitcha` / `montaż oprawy` | **LABOR** |
| Source availability (KB has montaż…) | **Does not** change class of product-named catalog row |
| DIY has product SKU | **Does not** change class of install-named row |

**Classification MUST NOT be derived from source availability.**  
**Source selection MUST NOT determine classification.**  
**CLASSIFY executes BEFORE source selection.**

### B.3 Seed authority for known workIds

Owner Decision Closeout table (89/89) is the **binding seed** for Work Catalog commercial-floor identities:

- Final class per `workId` = Owner FINAL  
- Audit inference alone is **not** authority  

First IMPLEMENT (future) MUST load these as an Owner registry (code-frozen map), analogous to `OWNER_APPROVED_LABOR_ONLY_WORK_IDS` — **no invent**.

---

## C. Final Owner counts (binding)

| Class | Count |
|-------|------:|
| **LABOR** | **29** |
| **MATERIAL** | **24** |
| **COMPOUND** | **6** |
| **UNKNOWN** | **30** |
| **Total** | **89** |

Audit inference was **69 / 9 / 6 / 5** — **46 rows changed** by Owner Review.  
Design Freeze adopts **Owner FINAL only**.

---

## D. Classification contract

### D.1 Minimal input (pure function)

```ts
// DESIGN ONLY — not implemented
type EstimatorClassifyInput = {
  /** Preferred when Work Catalog identity exists */
  workId?: string | null;
  /** Optional material plane identity */
  materialKey?: string | null;
  /** Display / BOQ text — never sole authority when workId has Owner seed */
  namePl?: string | null;
  /** Catalog unit token when known */
  unit?: string | null;
  /**
   * Optional BOQ line kind from cost-intelligence — HINT only.
   * MUST NOT override Owner seed / MUST NOT invent LABOR from MaterialInstallation alone.
   */
  lineKindHint?: string | null;
};
```

**Priority of authority (MEASURED design):**

1. **Owner seed by `workId`** (89-row closeout + future Owner amendments)  
2. Explicit Owner allowlists already in code (LABOR_ONLY / MATERIALS_REQUIRED) — align as COMPOUND/LABOR per closeout  
3. Deterministic structural rules (A3 bucket pattern → UNKNOWN; product-noun vs install-verb heuristics) — **only when no Owner seed**  
4. Else → **UNKNOWN** (never invent LABOR/MATERIAL)

### D.2 Output DTO / schema

```ts
// DESIGN ONLY — not implemented
type EstimatorPricingPlane = "LABOR" | "MATERIAL" | "COMPOUND" | "UNKNOWN";

type EstimatorClassifyResult = {
  plane: EstimatorPricingPlane;
  /** Machine reason — stable for tests */
  reasonCode:
    | "OWNER_SEED"
    | "OWNER_LABOR_ONLY"
    | "OWNER_MATERIALS_REQUIRED"
    | "A3_BUCKET"
    | "PRODUCT_NOUN"
    | "INSTALL_VERB"
    | "DUAL_OR_COMPOUND_LABEL"
    | "NO_SAFE_CLASS"
    | "MISSING_IDENTITY";
  reasonPl: string;
  /** Echo — classification never mutates these */
  workId: string | null;
  materialKey: string | null;
  namePl: string | null;
  unit: string | null;
  /** Routing flags */
  allowLaborCatalogLookup: boolean;
  allowLaborResearch: boolean;
  allowMaterialCatalogLookup: boolean;
  allowMaterialResearch: boolean;
  /** Terminal hold for COMPOUND / UNKNOWN */
  hold: boolean;
  holdKind: "NONE" | "COMPOUND" | "UNKNOWN";
  /** Provenance */
  classifiedBy: "owner_seed" | "rule" | "fallback_unknown";
  schemaVersion: 1;
};
```

**Deterministic routing flags (contract):**

| plane | labor catalog | labor research | material catalog | material research | hold |
|-------|:---:|:---:|:---:|:---:|:---:|
| LABOR | ✓ | ✓ (on MISS) | ✗* | ✗ | no |
| MATERIAL | ✗ | ✗ | ✓ | ✓ (on MISS) | no |
| COMPOUND | ✗ | ✗ | ✗ | ✗ | **yes** |
| UNKNOWN | ✗ | ✗ | ✗ | ✗ | **yes** |

\*MATERIAL BOM components on a LABOR position remain a **downstream BOM concern** (existing TechnologyPack) — Classification Gate does **not** invent materialKeys; it only blocks **wrong-plane research** for the **primary** identity being classified.

### D.3 Persistence / read model (Design Freeze choice)

| Option | Decision for v1 IMPLEMENT |
|--------|---------------------------|
| New KV key for classes | **OUT OF SCOPE** (non-goal) |
| Field on every CatalogWork | **OUT OF SCOPE** until separate Owner GO |
| **Code-frozen Owner registry** `workId → plane` from Closeout | **IN SCOPE** for first implement |
| Runtime recompute from name only | Allowed as **fallback** after seed miss → prefer UNKNOWN over invent |

**Read path:** `classifyEstimatorPricingPlane(input)` reads registry + rules — **pure**, **ZERO write**.

---

## E. Routing contract

```text
classify(input).plane
  │
  ├─ LABOR
  │     → WORK CATALOG lookup (lookupWorkRate / ourWorkRate)
  │     → HIT CURRENT → REUSE (no research)
  │     → MISS/STALE → LABOR RESEARCH (KEEP-4 only)
  │     → Candidate → Owner Accept → ourWorkRate
  │     → Identity mapping + D1 remain DOWNSTREAM of classify
  │
  ├─ MATERIAL
  │     → MATERIAL CATALOG / Price Memory (mat.*)
  │     → HIT → REUSE
  │     → MISS → MATERIAL RESEARCH (DIY PRIMARY: Leroy/Castorama/OBI)
  │     → quotes → material plane persistence (existing Price Memory paths)
  │
  ├─ COMPOUND
  │     → HOLD / dedicated compound handling (future epic)
  │     → NO automatic LABOR research
  │     → NO automatic MATERIAL research
  │     → NO bucket mapping · NO silent price split
  │
  └─ UNKNOWN
        → HOLD / Owner review
        → NO research
        → NO invent class
        → NO fallback UNKNOWN→LABOR or UNKNOWN→MATERIAL
```

### E.1 Labor / Material source separation (binding)

| Plane | Allowed sources (v1) |
|-------|----------------------|
| LABOR | KB.pl · CennikRemontow.pl · Extradom · SCCOT · other **Owner-approved labor** only |
| MATERIAL | Leroy Merlin · Castorama · OBI · other **Owner-approved** large retailers/wholesalers |

Gate **MUST** run before any host/URL selection.  
Research modules **MUST** refuse to run when `allow*Research === false`.

---

## F. Labor / Material separation

### F.1 Price planes

| Forbidden | Enforcement (design) |
|-----------|----------------------|
| LABOR price used as MATERIAL | material research blocked when plane=LABOR; labor hosts blocked for product quotes (existing `isLaborCatalogWorkBlockedForProductQuotes`) |
| MATERIAL price used as LABOR | labor research blocked when plane=MATERIAL; qualify laborOnly remains downstream |
| companyPrice → marketBase | unchanged — `isCompanyPriceForbiddenAsWorkRateBase` |
| Evidence → OUR RATE | unchanged — Accept-only |
| Classification → pricing write | Gate is read-only / routing-only |

### F.2 Existing locks REUSED (not replaced)

| System | Role after Gate |
|--------|-----------------|
| `WORK_RATE_OWNER_SYNONYMS` / D1 scope | Downstream labor identity/qualify |
| `WR-LABOR-IDENTITY-MAPPING` | Downstream labor observation↔workId |
| `kw-wgdom-labor-source-evidence` | Labor evidence only — Gate never writes |
| `kw-wgdom-work-catalog` / `ourWorkRate` | Labor catalog — Gate never writes |
| Price Memory / DIY | Material plane — Gate never writes |
| `labor-only-classification.ts` | Align with Owner seed (LABOR_ONLY / MATERIALS_REQUIRED) — Gate owns **plane**; allowlists remain BOM helpers |

**Do not duplicate identity engines.**

---

## G. UNKNOWN handling

UNKNOWN is a **valid terminal state**.

| Rule | Binding |
|------|---------|
| Auto research | **FORBIDDEN** |
| Fallback → LABOR | **FORBIDDEN** |
| Fallback → MATERIAL | **FORBIDDEN** |
| Invent class from sources | **FORBIDDEN** |
| A3 legacy buckets | **UNKNOWN** (Owner) |
| UI / gaps | Emit hold / review gap (e.g. `CLASSIFY_UNKNOWN_HOLD`) — exact code at IMPLEMENT |
| Resolution | Future Owner/domain epic only |

---

## H. COMPOUND handling

COMPOUND is a **valid hold state**.

Owner-confirmed examples:

- `cc-p0c-w1-zaprawianie-bruzd` (bruzdy + materiał)  
- `cc-p0c-w1-zabezpieczenie-folia` (folia + czynność)  
- `legacy-gladzie_tynki-m2` / `-mb` (dual gładzie/tynki)  
- packing/paving supply+install rows per Closeout  

| Rule | Binding |
|------|---------|
| Auto LABOR research | **FORBIDDEN** |
| Auto MATERIAL research | **FORBIDDEN** |
| Silent price split / component invent | **FORBIDDEN** |
| Bucket mapping | **FORBIDDEN** |
| Dedicated compound dekompozycja | **Future epic** — not this Gate |

---

## I. Integration boundary

### I.1 Best central call-site (Design Freeze answer)

**Primary SSOT module (future path):**

`src/lib/intelligent-estimator/classification-gate.ts`  
(or `src/lib/tender-position-cost/estimator-classification-gate.ts` if Owner prefers keep under TPC)

**Mandatory consumers (wire order):**

| # | Call-site (existing) | When |
|---|----------------------|------|
| 1 | `inventory-gaps.ts` / IK gap job creation for `BRAK_STAWKI_ROBOT` | **Before** enqueue labor research job |
| 2 | `runIkLaborGapResearch` / `runSelectiveWorkRateResearch` | **Hard assert** at entry — refuse if `!allowLaborResearch` |
| 3 | Material DIY / `market-material-research-*` entry | **Hard assert** — refuse if `!allowMaterialResearch` |
| 4 | `boq-shadow-adapter` / F5 resolve path | Classify primary identity **before** choosing labor vs material adapters for research triggers |

**Not call-sites for Gate:**

- Inside HTML parsers  
- Inside identity mapping  
- Inside Accept  
- Inside Evidence ingest  

### I.2 Design Q&A (repo review)

| # | Question | Design answer |
|---|----------|---------------|
| 1 | Best central call-site? | Pure `classifyEstimatorPricingPlane` + hard guards at labor/material research entries (§I.1) |
| 2 | Minimal input? | `workId?`, `materialKey?`, `namePl?`, `unit?`, optional `lineKindHint` (§D.1) |
| 3 | Output DTO? | `EstimatorClassifyResult` (§D.2) |
| 4 | Persist/read? | v1 code-frozen Owner registry from Closeout; pure read; no new KV (§D.3) |
| 5 | Existing flows consume? | IK labor bridge + material research + gap inventory + F5 research triggers |
| 6 | UNKNOWN/COMPOUND representation? | `plane` + `hold` + `holdKind`; no research flags |
| 7 | Classify before research? | Research entry asserts `allow*Research`; gap job creation skips non-LABOR for labor jobs |
| 8 | Source separation? | Route selects plane sources only after classify; cross-plane research forbidden by flags |
| 9 | Preserve D1 / identity? | Downstream only; Gate does not call or replace them |
| 10 | Deterministic tests? | Fixture table Owner 89 + T01–T18 (§J); pure function; no HTTP |

### I.3 Guarantee patterns (IMPLEMENT obligations)

```text
assertLaborResearchAllowed(classifyResult):
  if (!classifyResult.allowLaborResearch) throw / return BLOCKED_BY_CLASSIFY

assertMaterialResearchAllowed(classifyResult):
  if (!classifyResult.allowMaterialResearch) throw / return BLOCKED_BY_CLASSIFY
```

Classification **never** writes pricing, Evidence, Catalog, Accept, OUR RATE, margin.

---

## J. Test plan (Design Freeze)

Future suite (name suggestion): `scripts/test-estimator-classification-gate-01.mjs`

| ID | Assertion |
|----|-----------|
| **T01** | LABOR seed → labor route flags true · material research false |
| **T02** | MATERIAL seed → material route flags true · labor research false |
| **T03** | COMPOUND → hold · both research false |
| **T04** | UNKNOWN → hold · both research false |
| **T05** | Product vs installation: `multiswitch` MATERIAL · hypothetical `montaż multiswitcha` LABOR (fixture / rule) |
| **T06** | MATERIAL cannot enter labor research (`runSelective*` blocked) |
| **T07** | LABOR cannot enter material research (DIY entry blocked) |
| **T08** | A3 bucket `legacy-elektryka-szt` → UNKNOWN |
| **T09** | Explicit installation verb / Owner LABOR seed → LABOR |
| **T10** | Compound (bruzdy / folia / gładzie dual) → COMPOUND |
| **T11** | No source available does **not** change classification (pure; no HTTP in classify) |
| **T12** | D1 remains downstream — classify does not invoke scope classifier as authority |
| **T13** | Identity mapping remains downstream — classify does not call `resolveLaborIdentityMapping` |
| **T14** | companyPrice isolated — classify output has no companyPrice field / no read of companyPrice |
| **T15** | OUR RATE isolated — classify does not read/write `ourWorkRate` |
| **T16** | Classification does not write pricing |
| **T17** | Classification does not write Evidence |
| **T18** | Classification does not write Catalog |

**Golden set:** all **89** Owner FINAL rows must round-trip `workId → plane` exactly.

---

## K. Security / safety invariants

| ID | Invariant |
|----|-----------|
| S1 | Classify **before** source selection |
| S2 | Source availability **never** mutates plane |
| S3 | LABOR price ≠ MATERIAL price |
| S4 | No UNKNOWN→LABOR / UNKNOWN→MATERIAL fallback |
| S5 | No COMPOUND auto-split / bucket map |
| S6 | No Gate write to Evidence / Catalog / OUR RATE / Accept / margin |
| S7 | No new hosts / PASS2 / MAX / qualify / median changes in this epic |
| S8 | No duplicate identity engines |
| S9 | Owner seed beats heuristics |
| S10 | A3 buckets stay UNKNOWN until Owner splits workIds |
| S11 | companyPrice forbidden as labor/material research base (existing locks) |
| S12 | Evidence ≠ OUR RATE (existing locks) |

---

## L. Explicit non-goals (this Design Freeze / first Gate epic)

- Implementing classifier code (**next:** Arch Review → Owner GO IMPLEMENT)  
- Creating Material Catalog KV  
- Moving rows between catalogs / deleting Work Catalog entries  
- Populating Evidence  
- Seeding identity mappings  
- Auto-Accept / OUR RATE / margin writes  
- Compound dekompozycja engine  
- Resolving all 30 UNKNOWN into LABOR/MATERIAL  
- Changing PASS2 / KEEP-4 / DIY allowlists  
- Replacing D1 / synonyms / identity mapping  
- Commit / push / deploy  

---

## M. Future implementation boundary

```text
NOW     DESIGN FREEZE = COMPLETE (this file)
NEXT    ARCH REVIEW — CLASSIFICATION GATE
THEN    Owner GO: IMPLEMENT — CLASSIFICATION GATE
          · pure classify module
          · Owner 89-row registry seed
          · research entry guards
          · tests T01–T18 + golden 89
          · ZERO Evidence/Catalog/OUR RATE writes from Gate
LATER   (separate Owner GOs)
          · Material Catalog KV (optional)
          · UNKNOWN resolution waves
          · COMPOUND handling epic
          · Catalog hygiene (product rows off labor floor)
```

**Anti-patterns if IMPLEMENT starts without Arch Review + Owner GO:** forbidden.

---

## Pipeline diagram (binding)

```text
                    ┌─────────────────────┐
   tender position →│ CLASSIFICATION GATE │← Owner seed + rules
                    └──────────┬──────────┘
           LABOR │ MATERIAL │ COMPOUND │ UNKNOWN
                 │          │     │          │
                 ▼          ▼     ▼ HOLD     ▼ HOLD
           Work Cat.   Mat Cat.  (no research) (no research)
                 │          │
            MISS ▼     MISS ▼
           Labor src   DIY src
           (KEEP-4)    (LM/Casto/OBI)
                 │          │
                 ▼          ▼
            Identity+D1  Product identity
            (downstream) (downstream)
                 │          │
                 ▼          ▼
            Evidence*    Quotes*
            Accept→OUR   Price Memory
```

\*Evidence / Accept / Catalog writes remain **outside** Classification Gate.

---

## OWNER DECISION CLOSEOUT — Amendments A1–A5

> **Date:** 2026-08-14  
> **Arch Review:** [`INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-ARCH-REVIEW.md`](./INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-ARCH-REVIEW.md)  
> **Mode:** DOCS ONLY · **ZERO CODE** · **ZERO IMPLEMENT** · **ZERO KV**

```text
OWNER DECISION CLOSEOUT (A1–A5) = COMPLETE
A1–A5                           = CLOSED (all APPROVE · no CHANGE)
DESIGN FREEZE                   = APPROVED
ARCH REVIEW                     = CLOSED
IMPLEMENT                       = NOT DONE
```

### Binding decisions

| ID | Amendment | Owner Decision | Binding effect for IMPLEMENT |
|----|-----------|----------------|------------------------------|
| **A1** | v1 bez nowych heurystyk · Owner map **29 / 24 / 6 / 30** · brak seed → **UNKNOWN** | **APPROVE** | Code-frozen map only · ZERO new heuristics · ZERO remap · ZERO map expand |
| **A2** | Hard guard na `runSelectiveWorkRateResearch` (nie tylko IK) | **APPROVE** | Covers `useWorkCatalog` bypass |
| **A3** | Hard guard na **wszystkich** material research entry points · research tylko `plane=MATERIAL` | **APPROVE** | wire · orchestrate · refresh · + inne wykryte w implement audit · LABOR/COMPOUND/UNKNOWN → BLOCK/HOLD |
| **A4** | `BRAK_STAWKI_ROBOT` tylko gdy `plane=LABOR` | **APPROVE** | MATERIAL/COMPOUND/UNKNOWN → zero labor gap job |
| **A5** | **Nie** tworzyć Material Catalog KV · MATERIAL = Price Memory → miss → DIY | **APPROVE** | No invent Material Catalog in this epic |

**CHANGE:** none. All five **APPROVE**.

### Frozen Owner map (unchanged)

| Class | Count |
|-------|------:|
| LABOR | **29** |
| MATERIAL | **24** |
| COMPOUND | **6** |
| UNKNOWN | **30** |
| Total | **89** |

### Hard locks (this Closeout)

ZERO code · ZERO map seed in repo beyond future IMPLEMENT GO · ZERO KV · ZERO Evidence/Catalog/OUR RATE/Accept/margin · ZERO research · ZERO PASS2/hosts/MAX/qualify/median · ZERO labor mapping seed · ZERO new heuristics.

### Final status after Closeout

```text
DESIGN FREEZE              = APPROVED
ARCH REVIEW                = CLOSED
OWNER DECISION CLOSEOUT    = COMPLETE
IMPLEMENT                  = NOT DONE
COMMIT / PUSH / DEPLOY     = NOT DONE

Evidence                   = UNCHANGED
Work Catalog               = UNCHANGED
Material flow              = UNCHANGED (Price Memory + DIY)
OUR RATE                   = UNCHANGED
Accept                     = NOT DONE
Margin                     = NOT DONE
KV                         = UNCHANGED

SOURCE GAP                 = OPEN
NICHE                      = NOT CLAIMED

STOP.
NEXT                       = OWNER GO: IMPLEMENT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```

---

## Final status

```text
DESIGN FREEZE      = APPROVED
ARCH REVIEW        = CLOSED
OWNER DECISION     = COMPLETE (A1–A5)
IMPLEMENT          = NOT DONE
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE

Evidence           = UNCHANGED
Registry           = UNCHANGED
Work Catalog       = UNCHANGED
Material Catalog   = UNCHANGED
OUR RATE           = UNCHANGED
SOURCE GAP         = OPEN
NICHE              = NOT CLAIMED

STOP.
NEXT               = OWNER GO: IMPLEMENT — INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
```
