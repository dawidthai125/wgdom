# DESIGN FREEZE — WR-LABOR-IDENTITY-MAPPING-01

> **Epic:** `WR-LABOR-IDENTITY-MAPPING-01`  
> **SSOT prior:** [`WR-SOURCE-EVIDENCE-DB-01-P0-GAP-CLOSURE-AUDIT.md`](./WR-SOURCE-EVIDENCE-DB-01-P0-GAP-CLOSURE-AUDIT.md)  
> **Production tip:** **2.66.54** / **`eb562dd`**  
> **Evidence DB (unchanged):** revision **2** · etag **`r2-7a927415`** · observations **66**  
> **Stage:** **OWNER DECISION CLOSEOUT = COMPLETE** · **DESIGN FREEZE = APPROVED** · **ARCH REVIEW = CLOSED** · **IMPLEMENT = LOCAL GREEN (2.66.55)** · **COMMIT = NOT DONE**  
> **Date:** 2026-08-14  
> **SOURCE GAP:** **OPEN**  
> **NICHE:** **NOT CLAIMED**  
> **Next:** `OWNER GO: COMMIT — WR-LABOR-IDENTITY-MAPPING-01` · ARCH: [`WR-LABOR-IDENTITY-MAPPING-01-ARCH-REVIEW.md`](./WR-LABOR-IDENTITY-MAPPING-01-ARCH-REVIEW.md)

```text
RCA                    = COMPLETE (this file §1–§5)
DESIGN FREEZE          = APPROVED (this file + Owner Closeout)
ARCH REVIEW            = CLOSED
OWNER DECISION CLOSEOUT= COMPLETE (A1–A12 CLOSED)
IMPLEMENT              = LOCAL GREEN (2.66.55 · undeployed)
COMMIT / PUSH / DEPLOY = FORBIDDEN until Owner GO IMPLEMENT / COMMIT
KV / Evidence WRITE    = FORBIDDEN in Closeout
Work Catalog WRITE     = FORBIDDEN
Accept / OUR RATE      = FORBIDDEN
MARGIN / Candidate     = FORBIDDEN
NEW HOST / PASS2 / MAX = FORBIDDEN
namesLooselyMatch      = LOCKED UNCHANGED
qualify / median       = LOCKED UNCHANGED
```

---

## LOCK ACKNOWLEDGEMENT

```text
OWNER GO: RCA / DESIGN FREEZE — WR-LABOR-IDENTITY-MAPPING-01
ZERO CODE · ZERO KV · ZERO EVIDENCE WRITE · ZERO CATALOG WRITE
ZERO ACCEPT · ZERO OUR RATE · ZERO MARGIN · ZERO CANDIDATE
ZERO NEW HOST · ZERO PASS2 · ZERO MAX CHANGE
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 1. RCA (Root Cause Analysis)

### 1.1 Confirmed root cause

| Layer | Status | Finding |
|-------|--------|---------|
| Source pages (CR electrical / WOD-KAN-GAZ / biały montaż) | **OK** | Real priced rows exist |
| Parser (`parseWorkRateOffersFromHtml`) | **OK** | Rows extract (25 / 17 / 16) |
| Host allowlist KEEP-4 | **OK** | CR + KB in allowlist |
| Evidence DB | **OK** | Isolated SSOT; 66 obs; not the blocker |
| D1 `namesLooselyMatch` threshold | **CORRECT refusal** | Generic catalog name ≠ concrete source name |
| Owner synonyms coverage | **INCOMPLETE for MEP** | Painting / grooves / repairs / plaster only |
| Catalog identity fidelity | **ROOT CAUSE** | Bucket names vs operation wording |

**RCA verdict:** SOURCE GAP remains OPEN because **identity attach fails**, not because sources lack prices.

### 1.2 Evidence of mismatch

| Source page | Rows | D1 identity hits vs P0 targets |
|-------------|-----:|-------------------------------:|
| CR `instalacje-elektryczne-cennik` | 25 | **0** |
| CR `instalacje-wodno-kanalizacyjno-gazowe-cennik` | 17 | **0** |
| CR `bialy-montaz-cennik` | 16 | **0** |

### 1.3 Why extending loose match is forbidden

Loosening `namesLooselyMatch` (or attaching all electrical synonyms to `Elektryka (szt)`) would:

1. Map **one generic workId** → **many unrelated operations** (gniazdo + wyłącznik + oprawa + LED…).
2. Pollute median / marketBase with mixed semantics.
3. Violate Owner rule: **concrete mapping only**.

**RCA = COMPLETE.**

---

## 2. Problem statement

Intelligent Estimator needs durable labor SOURCE EVIDENCE attached to **known** `workId`s.

Today:

```text
catalog.namePl = "Elektryka (szt)"     ← bucket
source.observedName = "Montaż gniazd" ← concrete operation
D1 identity = NO MATCH                ← correct under current rules
```

We need a **controlled, Owner-curated, deterministic** identity layer that:

- binds **specific** observedNames (aliases) to **one** `workId`,
- does **not** rewrite global match thresholds,
- does **not** create a second fuzzy engine,
- does **not** auto-Accept / write OUR RATE / seed margin,
- sits **before** existing qualify / scope / median path.

---

## 3. Current baseline (8/89)

| Metric | Value |
|--------|------:|
| Active labor works | **89** |
| Evidence VALID matched unique workIds | **8** |
| Observations | **66** |
| Coverage | **~9%** |
| P0 potential under D1-only | **8/89** (Δ **0**) |

**Already matched (Evidence rev 2):**

| workId | Family (heuristic) |
|--------|--------------------|
| `cc-p0c-w1-zaprawianie-bruzd` | grooves |
| `legacy-malowanie-m2` | painting |
| `legacy-gladzie_tynki-m2` | plaster |
| `legacy-gladzie_tynki-mb` | plaster |
| `cw.etics.render` | finishing / ETICS |
| `p1c-ocieplenie-etics-eps-m2` | finishing / ETICS |
| `p1c-tynk-elewacyjny-m2` | finishing |
| `p2a-rozebranie-posadzek-wewn-m2` | demolition |

P0 slices still broken under D1-only:

| Slice | Matched |
|-------|--------:|
| Electrical | **0/5** |
| Plumbing | **0/9** |
| White install | **0** (no catalog workIds) |
| Demolition | **1/13** |
| Waste | **0** (2 workIds discovered in OTHER) |
| Grooves | **1/1** |

---

## 4. CennikRemontow evidence examples (concrete rows)

### 4.1 Electrical (sample observedName)

- Montaż lamp stropowych i kinkietów
- Montaż halogenów wpuszczanych / nawierzchniowych
- Montaż taśmy LED (jednokolorowa / RGB)
- Montaż gniazd i łączników
- Montaż maty grzewczej / sterownika

### 4.2 Plumbing / WOD-KAN-GAZ

- Demontaż starych punktów hydraulicznych
- Wykonanie podejścia wodno-kanalizacyjnego plastik i miedź
- Wykonanie odejścia kanalizacyjnego
- Montaż licznika wody z zaworami odcinającymi
- Instalacja zaworu podtynkowego-prysznic
- Instalacja odpływu liniowego

### 4.3 White install (source exists — catalog attach missing)

- Montaż umywalki / muszli klozetowej / bidetu
- Montaż baterii wannowej / prysznicowej
- Montaż wanny / brodziku / kabiny prysznicowej
- Montaż geberitu / pralki

> **Note:** Mapping alone **cannot** cover white install until Catalog contains concrete `workId`s. That is a **catalog gap**, not an identity-engine gap. Out of mapping IMPLEMENT scope unless Owner opens a catalog-split epic.

---

## 5. KB evidence examples

Fetched in P0 audit (KEEP-4, parser OK):

| URL | HTTP | Table rows (approx.) |
|-----|-----:|---------------------:|
| `https://kb.pl/cenniki/uslugi/cennik-uslug-remontowych-aktualne-ceny/` | 200 | 46 |
| `https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/` | 200 | 55 |
| `https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/` | 200 | 13 |

KB currently contributes heavily to the **existing 8** (painting / plaster / grooves / repairs).  
MEP attach still fails for the same identity reason when catalog names are buckets.

---

## 6. Mapping architecture

### 6.1 Options evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** | Extend only `WORK_RATE_OWNER_SYNONYMS` | **REJECT as sole solution** for buckets |
| **B** | New `WORK_RATE_IDENTITY_MAPPING` table | **REQUIRED core** |
| **C** | Hybrid A + B | **RECOMMENDED** |

### 6.2 Why A alone is unsafe

`listWorkRateMatchNamesPl(expectedNamePl)` attaches **all** synonyms whose `canonicalConcept` relates to the catalog name.

If Owner added:

```text
canonicalConcept = "Elektryka (szt)"
synonyms = ["Montaż gniazd", "Montaż wyłącznika", "Montaż oprawy", ...]
```

then **one** `workId` (`legacy-elektryka-szt`) would match **all** those source rows via unchanged `namesLooselyMatchAny` — exactly the **FORBIDDEN** pattern.

OWNER_SYNONYMS remains valid for **same-operation linguistic aliases** on a **non-bucket** work, e.g.:

```text
work namePl = "Oprawa oświetleniowa punktowa"
synonym     = "Montaż oprawy punktowej"
```

### 6.3 Recommendation = **C (Hybrid)** with B as the identity gate

```text
┌─────────────────────────────────────────────────────────────┐
│  HTML row → observedName + unit + priceKind + region …      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ① OWNER IDENTITY MAPPING (NEW · deterministic · curated)   │
│     match: workId + sourceId? + exact aliases + unit/labor  │
│     → HIT: bind workId + mappingId provenance               │
│     → MISS: fall through                                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ② EXISTING PATH (LOCKED)                                   │
│     listWorkRateMatchNamesPl (OWNER_SYNONYMS)               │
│     + namesLooselyMatch / namesLooselyMatchAny              │
│     thresholds UNCHANGED                                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ③ D1 scopeTag → qualify → (optional) Evidence ingest       │
│     / Candidate research path                               │
│     median engine UNCHANGED                                 │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

- Mapping is **not** a second fuzzy matcher — exact / Owner-listed aliases only (normalize accents/case/whitespace; no token-jaccard rewrite).
- Mapping does **not** invent prices.
- Mapping does **not** write Evidence / Catalog / OUR RATE by itself.
- Mapping only answers: *which known `workId` (if any) owns this observedName under Owner policy?*

### 6.4 Layer stack (fits Evidence DB design)

```text
① Source inventory / fetch (KEEP-4)
② Parse row
③ Identity resolve ← THIS EPIC (mapping first, then locked D1 path)
④ Scope / qualify / labor-only filters
⑤ Evidence observation (kw-wgdom-labor-source-evidence)  — separate SSOT
⑥ Aggregation / marketBase (existing)
⑦ Candidate → Accept → OUR RATE (Owner only · orthogonal)
```

---

## 7. Schema (proposed)

### 7.1 Mapping row

```ts
type LaborIdentityMappingRow = {
  /** Stable id — e.g. lim-01-ele-gniazdo-szt */
  mappingId: string;
  /** Schema / table version for this row family */
  version: number;

  workId: string;
  /** Optional narrow: apply only for this source registry id */
  sourceId: "kb_pl" | "cennikremontow_pl" | "sccot" | "extradom" | "*" ;

  /** Semantic bucket for audits — NOT a fuzzy family absorb */
  categoryKey:
    | "electrical"
    | "plumbing"
    | "heating_co"
    | "gas"
    | "white_install"
    | "demolition"
    | "waste"
    | "grooves"
    | "other";

  /**
   * Exact Owner-approved aliases for observedName after normalize(case/diacritics/space).
   * NEVER wildcards. NEVER "all electrical".
   */
  observedNameAliases: readonly string[];

  /** Compatible catalog/source units — miss ⇒ no bind */
  allowedUnits: readonly string[];

  /** If true, reject includesMaterial / package rows */
  laborOnlyRequired: boolean;

  /** How to treat material-inclusive rows */
  includesMaterialPolicy: "reject" | "allow_flagged" | "require_labor_only";

  /**
   * Optional: allowed D1 scopeTag values after bind.
   * null = no extra scope filter beyond existing D1 work policy.
   */
  allowedScopeTags: readonly string[] | null;

  /** Region acceptance */
  regionPolicy: {
    prefer: readonly ("WROCLAW" | "REGIONAL" | "POLSKA")[];
    allowNational: true; // NATIONAL always legal; never convert → WROCLAW
  };

  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Only HIGH+active+ownerApproval may bind in production path (recommended) */
  ownerApproval: boolean;
  active: boolean;

  provenance: {
    approvedBy: string; // Owner
    approvedAt: string; // ISO
    evidenceUrls: readonly string[]; // concrete pages that justified aliases
    notesPl: string;
  };
};
```

### 7.2 Registry (code-time SSOT for v1)

**Recommended v1 storage:** frozen TypeScript module  
`src/lib/work-catalog/work-rate-identity-mapping.ts` (name TBD at IMPLEMENT)

- Deterministic, reviewable in git.
- No KV blob for mappings in v1 (avoids LWW / empty-store risk).
- Future KV mirror = **separate Owner GO** only if needed.

### 7.3 Runtime API (design only)

```ts
resolveLaborIdentityMapping(input: {
  observedName: string;
  unit: string;
  sourceId: string;
  laborOnly: boolean;
  includesMaterial: boolean;
  regionScope?: string;
}): {
  hit: false;
} | {
  hit: true;
  workId: string;
  mappingId: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedAlias: string;
}
```

**Ambiguity rule:** if ≥2 active HIGH mappings match the same observedName+unit+source → **NO BIND** (fail closed) + audit flag `AMBIGUOUS_MAPPING`.

---

## 8. Identity boundary

| Allowed | Forbidden |
|---------|-----------|
| Exact alias list per `mappingId` | Fuzzy expansion of aliases |
| One operation concept per mapping | `Elektryka (szt)` → all electrical rows |
| Separate mappings for gniazdo vs wyłącznik vs oprawa | One mapping covering multiple devices |
| Fall-through to locked D1 path on miss | Changing `namesLooselyMatch` |
| Fail closed on ambiguity | Best-effort pick of “closest” workId |

**Generic legacy buckets** (`legacy-elektryka-*`, `legacy-hydraulika-*`, `legacy-rozbiorki-*`):

```text
DEFAULT = HOLD (no mapping) until Owner chooses ONE of:
  (1) Catalog split into concrete works (preferred long-term), OR
  (2) Explicit single-semantic mapping: "this bucket means ONLY X"
      with Owner acknowledgement of residual risk.
```

Option (2) still forbids multi-operation absorb.

---

## 9. Unit boundary

- Bind only when `normalizeUnit(observed.unit)` ∈ `allowedUnits`.
- `szt` ≠ `mb` ≠ `m2` ≠ `rbh` ≠ `kpl` ≠ `m3`.
- No silent unit conversion.
- Cross-unit near-misses stay UNMATCHED / near-miss audit only.

---

## 10. Labor-only boundary

| Policy | Behavior |
|--------|----------|
| `laborOnlyRequired: true` (default for P0 MEP/demolition/waste) | Reject material-inclusive / package rows |
| `includesMaterialPolicy: "reject"` | Same hard reject |
| `allow_flagged` | Bind allowed only if Evidence quality marks includesMaterial — **not** for P0 first wave |

Mapping never invents `laborOnly=true` when source row is clearly package.

---

## 11. Scope boundary

- After identity bind, existing D1 `classifyWorkRateEvidenceScopeTag` still runs.
- Mapping may further restrict `allowedScopeTags` (e.g. painting walls_ceilings pattern).
- Mapping does **not** replace D1 scope engine.
- MEP/demolition/waste typically `allowedScopeTags: null` (identity+unit+laborOnly sufficient).

---

## 12. Region boundary

```text
prefer: WROCLAW > REGIONAL > POLSKA
allowNational: true
```

- NATIONAL evidence remains **legal**.
- **Never** rewrite `POLSKA` → `WROCLAW`.
- Region affects ranking / preference in aggregation (existing), not identity truth.

---

## 13. Confidence

| Level | Production bind? | Meaning |
|-------|------------------|---------|
| HIGH | Yes (if `ownerApproval && active`) | Clear semantic 1:1 operation |
| MEDIUM | No (audit / dry-run only) | Plausible but Owner must tighten aliases |
| LOW | No | Research hint only |

Recommended production gate: **`confidence === "HIGH" && ownerApproval && active`**.

---

## 14. Owner approval

Every production mapping requires:

| Field | Rule |
|-------|------|
| `ownerApproval` | `true` only after Owner review of aliases + URLs |
| `provenance.evidenceUrls` | ≥1 concrete source URL (not homepage) |
| `provenance.notesPl` | Why this alias set equals this `workId` |
| `active` | Soft kill-switch without deleting history |

No auto-approval from LLM / scrape volume / “page looks related”.

---

## 15. Versioning

| Concept | Rule |
|---------|------|
| Registry `MAPPING_TABLE_VERSION` | Integer; bump on breaking schema |
| Per-row `version` | Integer; bump when aliases/policy change |
| Evidence provenance | Store `mappingId` + `mappingVersion` on ingest (future populate) |
| Rollback | Deactivate row (`active=false`) or revert module to prior git revision |

Changing aliases must **not** rewrite historical Evidence rows’ prices; new ingest uses new mapping; old rows remain with prior provenance.

---

## 16. Dedupe interaction

Evidence dedupeKey remains Evidence-DB SSOT (`buildLaborSourceEvidenceDedupeKey`).

Design rules:

- Mapping changes **workId attach**, therefore can change dedupeKey **for new ingest only**.
- Do **not** re-key / mass-rewrite existing 66 observations in this epic.
- UNMATCHED store remains valid for rows without bind.
- If a later populate binds a previously UNMATCHED observedName → **new** observation path (union-by-dedupeKey), not silent mutate of old unmatched row without Owner GO.

---

## 17. Evidence DB interaction

| Concern | Rule |
|---------|------|
| SSOT | `kw-wgdom-labor-source-evidence` stays separate |
| Mapping role | Identity resolver only |
| Copy to Work Catalog | **FORBIDDEN** |
| Auto-write Evidence on mapping merge | **FORBIDDEN** |
| Populate | Separate Owner GO after ARCH REVIEW + IMPLEMENT |
| Current rev/etag/obs | **UNCHANGED** by this Design Freeze |

---

## 18. Work Catalog isolation

Mapping:

- **reads** `workId` / `namePl` / `unit` for validation,
- **never creates** works,
- **never edits** `companyPrice` / `commercialPricing` / `ourWorkRate`,
- **never** seeds margin,
- **never** Accepts.

Catalog split of generic buckets = **separate epic** (optional, preferred long-term).

---

## 19. Test strategy (design)

Offline / unit (no KV write):

| ID | Assertion |
|----|-----------|
| M1 | Alias A binds only workId X |
| M2 | Alias for gniazdo does **not** bind wyłącznik workId |
| M3 | Unit mismatch → miss |
| M4 | Package / includesMaterial → reject when laborOnlyRequired |
| M5 | Ambiguous dual HIGH mappings → miss + flag |
| M6 | Inactive / unapproved / MEDIUM → no production bind |
| M7 | Fall-through: existing grooves synonym path still PASS |
| M8 | `namesLooselyMatch` thresholds unchanged (snapshot tests) |
| M9 | Generic bucket without explicit mapping → still 0 hits |
| M10 | Region POLSKA accepted; not rewritten to WROCLAW |
| M11 | Evidence ingest mock receives mappingId provenance when bound |
| M12 | No batch-set / catalog mutation in mapping resolve |

Coverage metric for later populate GO: **unique matched workIds**, not raw row count.

---

## 20. Rollback strategy

1. Set `active=false` on offending `mappingId` (fast).
2. Or revert mapping module commit (git).
3. Evidence DB: leave historical rows; stop new bad binds.
4. Do **not** mass-delete Evidence without separate Owner GO.
5. OUR RATE / Accept unaffected (never written by mapping).

---

## 21. Forbidden mappings

```text
FORBIDDEN:
- "Elektryka (szt|mb|rbh)" → all electrical observedNames
- "Hydraulika / wod-kan (*)" → all plumbing observedNames
- "Rozbiórki (*)" → all demolition observedNames
- "Instalacje gazowe (*)" → all gas rows without concrete op
- One mappingId covering gniazdo + łącznik + oprawa + LED
- One mappingId covering umywalka + WC + bateria + wanna
- Wildcard / regex aliases
- Auto-generated mappings from page topic alone
- Mapping that creates workId / Candidate / OUR RATE
- Mapping that changes companyPrice / margin
- Mapping that expands WORK_RATE_ALLOWED_HOSTS
- Mapping that loosens namesLooselyMatch / PASS2 / MAX
```

**Allowed pattern (example shape only — NOT implemented):**

```text
workId: p2b-punkt-elektryczny-oswietleniowy-szt
aliases:
  - "Montaż lamp stropowych i kinkietów"
  - "Montaż halogenów wpuszczanych"
  - "Montaż oprawy oświetleniowej punktowej"
unit: szt
≠ montaż gniazd
≠ montaż tablicy
```

---

## 22. Initial mapping candidates (research targets — NOT approved rows)

> Candidates for later Owner curation. **Not** active mappings. **Not** Evidence writes.

### 22.1 P0-1 ELECTRICAL (5 catalog works)

| workId | namePl | unit | Candidate alias themes (concrete only) | Status |
|--------|--------|------|----------------------------------------|--------|
| `p2b-punkt-elektryczny-oswietleniowy-szt` | Oprawa oświetleniowa punktowa | szt | Montaż lamp / halogenów / oprawy punktowej | **MAPPABLE** |
| `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | Tablica rozdzielcza mieszkaniowa | szt | Montaż / wymiana tablicy rozdzielczej mieszkaniowej | **MAPPABLE** (if source row exists) |
| `legacy-elektryka-szt` | Elektryka (szt) | szt | — | **HOLD** (bucket) |
| `legacy-elektryka-mb` | Elektryka (mb) | mb | — | **HOLD** (bucket; mb = przewody? needs Owner semantic) |
| `legacy-elektryka-rbh` | Elektryka (rbh) | rbh | — | **HOLD** |

CR “Montaż gniazd i łączników” → **no safe target** among current 5 without inventing a gniazdo workId or Owner declaring bucket meaning.

### 22.2 P0-2 PLUMBING (9)

| workId | Candidate alias themes | Status |
|--------|------------------------|--------|
| `p2b-podejscie-wod-kan-mb` | Wykonanie podejścia wodno-kanalizacyjnego… | **MAPPABLE** |
| `cc-w2-zawor-odcinajacy` | Zawór odcinający / montaż zaworu odcinającego (umywalka/zlew) | **MAPPABLE** (narrow aliases) |
| `cc-p0c-w1-zawor-odpowietrzajacy` | Odpowietrznik automatyczny CO / montaż odpowietrznika | **MAPPABLE** |
| `legacy-hydraulika-*` | — | **HOLD** (bucket) |
| `legacy-instalacje_gaz-*` | — | **HOLD** unless concrete gaz op rows + Owner semantic |

### 22.3 P0-3 OTHER → electrical (3) / plumbing-CO (3)

| workId | namePl | Status |
|--------|--------|--------|
| `cc-p0c-w1-multiswitch-antenowy` | Multiswitch antenowy | **MAPPABLE** if source has multiswitch/antenowy row |
| `cc-w2-mocowanie-aparatow` | Mocowanie aparatów… | **MAPPABLE** (narrow) |
| `cc-w2-przygotowanie-osprzet` | Przygotowanie podłoża pod osprzęt… | **MAPPABLE** (narrow; ≠ montaż gniazda) |
| `legacy-instalacje_co-mb` | Instalacje CO (mb) | **HOLD** or single-semantic Owner decide |
| `legacy-instalacje_co-rbh` | Instalacje CO (rbh) | **HOLD** |
| `legacy-instalacje_co-szt` | Instalacje CO (szt) | **MAPPABLE** only to one concrete CO device op if Owner picks |

### 22.4 P0-4 DEMOLITION (12 remaining unmatched of 13)

Already matched: `p2a-rozebranie-posadzek-wewn-m2`.

| workId | namePl | Mapping note |
|--------|--------|--------------|
| `p2a-rozebranie-okladzin-sciennych-m2` | Glazura i okładziny płytkowe | Prefer “skuwanie glazury / demontaż okładzin” aliases |
| `p2a-zerwanie-tynkow-wewn-m2` | Usunięcie warstw tynkarskich… | Prefer “zerwanie tynków” |
| `p2a-zerwanie-podloza-m2` | Usunięcie starej bazy… | Narrow; avoid absorbing all posadzka rows |
| `p2a-demontaz-drzwi-wewn-szt` | Zdjęcie ościeżnic… | Demontaż drzwi / ościeżnic |
| `p2a-rozebranie-scianek-dzialowych-m2` | Przegrody działowe… | Rozebranie ścianek działowych |
| `p2a-rozebranie-stropow-drewnianych-m2` | Stropy drewniane… | Site-specific — may stay NO_SOURCE |
| Outdoor p1a rozebranie kostki/chodników/obrzeży/podbudowy | External | Map only to matching CR/KB outdoor rows; else HOLD |
| Sheet-metal / rynny / obróbki | Niche | Likely low source coverage |

### 22.5 P0-5 WASTE (2 from OTHER)

| workId | namePl | Candidate themes |
|--------|--------|------------------|
| `legacy-transport_utylizacja-m3` | Transport i utylizacja (m3) | Wywóz gruzu m3 / utylizacja m3 (labor or service — Owner laborOnly policy) |
| `legacy-transport_utylizacja-kpl` | Transport i utylizacja (kpl) | Komplet wywozu / kontener kpl — **package risk** → default reject unless labor-only proven |

### 22.6 White install

**Catalog gap:** 0 workIds among 89.  
Mapping candidates **blocked** until Catalog adds concrete works (separate Owner GO).  
CR page evidence is inventory-only for that future epic.

---

## 23. Expected coverage gain (honest projection)

Metric = **unique matched workIds** after future mapping+populate (not this freeze).

| Scenario | Unique matched | Δ vs 8 |
|----------|---------------:|-------:|
| Baseline (now) | **8/89** | — |
| Conservative first wave (only HIGH specific non-bucket maps) | **~14–18/89** | **+6–10** |
| Optimistic (Owner also assigns single-semantic to a few buckets + strong demolition aliases) | **~20–28/89** | **+12–20** |
| Ceiling without catalog split of generics + white-install works | **≪ 89** | — |

**Not claimed:** closing SOURCE GAP fully, niche claim, or OUR RATE readiness.

Breakdown (conservative first wave targets):

| Slice | Realistic new binds |
|-------|--------------------:|
| Electrical specific | +1–2 |
| Plumbing specific | +2–3 |
| OTHER electrical | +0–2 |
| CO | +0–1 |
| Demolition | +2–4 |
| Waste | +0–1 (package risk) |
| White install | +0 (no workIds) |

---

## Hard locks (reaffirmed)

| Lock | Status |
|------|--------|
| `namesLooselyMatch` threshold | UNCHANGED |
| qualify / median | UNCHANGED |
| PASS2 / MAX | UNCHANGED |
| KEEP-4 hosts | UNCHANGED |
| Evidence rev/etag/obs | UNCHANGED |
| Work Catalog | UNCHANGED |
| Accept / OUR RATE / margin / Candidate | NOT DONE |
| IMPLEMENT | **NOT DONE** |

---

---

## OWNER DECISION CLOSEOUT (2026-08-14)

> **Status:** **COMPLETE**  
> **Source:** Owner GO — OWNER DECISION CLOSEOUT · WR-LABOR-IDENTITY-MAPPING-01  
> **ARCH REVIEW:** [`WR-LABOR-IDENTITY-MAPPING-01-ARCH-REVIEW.md`](./WR-LABOR-IDENTITY-MAPPING-01-ARCH-REVIEW.md) · **CLOSED**  
> **Code / KV / Evidence / Catalog / populate:** **NOT DONE** (Closeout = docs only)

### Closeout table (binding for IMPLEMENT)

| ID | Decision | Status |
|----|----------|--------|
| **A1** exact_normalized | `matchMode = exact_normalized` · no fuzzy in mapping v1 | **APPROVED** |
| **A2** catalogUnit / observedUnit | Store both · no implicit unit conversion (szt ≠ mb) | **APPROVED** |
| **A3** legacy bucket mapping | **FORBIDDEN** in v1 (`legacy-elektryka-*`, `legacy-hydraulika-*`, generic legacy buckets) · future bucket mapping = separate epic / Owner GO | **APPROVED = FORBID** |
| **A4** labor / material mutation | Must **not** mutate `laborOnly` / `includesMaterial` · v1 **no** `allow_flagged` | **APPROVED** |
| **A5** D1 scope bypass | **FORBIDDEN** · D1 `classifyWorkRateEvidenceScopeTag` (+ walls_ceilings / joinery / artistic) runs independently | **APPROVED** |
| **A6** aliases per mappingId | **MAX 12** | **APPROVED** |
| **A7** source roles | Unchanged: KB/CR/Extradom PRIMARY · SCCOT SECONDARY · Zleca REFERENCE · candidates need Owner GO | **APPROVED** |
| **A8** region mutation | **FORBIDDEN** · WROCLAW / POLSKA legal · never POLSKA → WROCLAW | **APPROVED** |
| **A9** identity-only call-site | PARSE → IDENTITY MAPPING → D1 synonyms/fallback → SCOPE → QUALIFY → AGGREGATION · not OUR RATE / Accept / Candidate / margin / companyPrice resolver | **APPROVED** |
| **A10** synonym scope | OWNER_SYNONYMS = same-operation aliases only · bucket → family / all rows = **FORBIDDEN** | **APPROVED** |
| **A11** ambiguity | Multi-mapping hit → **NO AUTO MATCH** · AMBIGUOUS / UNMATCHED | **APPROVED** |
| **A12** workId existence | Existing workId only · unknown = BLOCK / INVALID · white-install **HOLD** until workIds exist · no create workId | **APPROVED** |

```text
A1–A12 = CLOSED
OPEN Owner clarifications = NONE
```

### Design status after Closeout

```text
DESIGN FREEZE            = APPROVED
ARCH REVIEW              = CLOSED
OWNER DECISION CLOSEOUT  = COMPLETE
IMPLEMENT                = LOCAL GREEN (2.66.55 · undeployed)
Evidence                 = UNCHANGED (rev 2 / r2-7a927415 / 66)
Coverage                 = 8/89 measured · ~14–18/89 PROJECTION only
SOURCE GAP               = OPEN
NICHE                    = NOT CLAIMED
KV writes                = 0
Commit / Push / Deploy   = NOT DONE
```

**NEXT OWNER GO:** `OWNER GO: COMMIT — WR-LABOR-IDENTITY-MAPPING-01`

**STOP** (Closeout). Do not implement in this GO.
