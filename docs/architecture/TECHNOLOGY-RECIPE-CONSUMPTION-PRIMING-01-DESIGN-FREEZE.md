# DESIGN FREEZE — TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01

> **Slice:** ECONOMY INTERIOR PRIMER · first real Technology Recipe (priming)  
> **ID:** `TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01`  
> **Status:** **DESIGN FREEZE OWNER VERIFIED** · **IMPLEMENT = DONE (local)** · **COMMIT / PUSH / PROD = NOT AUTHORIZED** · **awaiting OWNER VERIFICATION of IMPLEMENT**  
> **Date:** 2026-08-10  
> **Baseline tip:** UI **2.66.23** / **`0884fb06`** (DECOMPOSITION-01 · 01A · 01B PRODUCTION VERIFIED)  
> **SOURCE AUDIT:** `docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md` · Verdict **A — SOURCE READY**  
> **Owner APPROVE:** **YES** — profile `ECONOMY_INTERIOR_PRIMER_V1` · Policy ECONOMY / TENDER-SAFE  
> **Test:** `scripts/test-technology-recipe-consumption-priming-01.mjs` (**61 PASS**) 

```text
OWNER LOCKED FACTORS (V1)
─────────────────────────
Profile:     ECONOMY_INTERIOR_PRIMER_V1
SOURCE SET:  Śnieżka Grunt · Dekoral GRUNT L
coverage:    10 m²/L (conservative set — Śnieżka „do 10”)
1 coat:      0.10 L/m²
coats:       1 (profile lock — not parametric engine)
wastePolicy: included_in_factor
materialKey: mat.grunt  (REUSE — no new key)
packId:      pack.priming.economy_interior_v1
packVersion: 1.0  (immutable when ACTIVE — TF-8)
```

```text
LAYER LOCK
──────────
Technology Recipe = CZEGO I ILE
PI / Purchase / Market = ILE KOSZTUJE
TechnologyPack NEVER contains PLN
MARKET ≠ PURCHASE
ACCEPT ≠ Purchase
ACCEPT ≠ Offer Cost
PRIMING pack ≠ PAINTING pack  (no compound mega-recipe)
DECOMPOSITION = które TechUnit; RECIPE = qty per unit
```

---

## 1. Executive decision

Owner zatwierdza **jeden** wąski recipe priming:

| Element | Decision |
|---------|----------|
| Profile | `ECONOMY_INTERIOR_PRIMER_V1` |
| Technology | Lateksowa farba podkładowa / grunt pod malowanie (economy) |
| Factor | **0.10 L/m²** @ **1** warstwa |
| Waste | `included_in_factor` |
| Identity | **REUSE** `mat.grunt` |
| Pack | `pack.priming.economy_interior_v1@1.0` |
| Implement now | **NO** — DF only |

**Cel:** domknąć łańcuch  
`BOQ → priming TechUnit → ACTIVE pack → projectProductionBom → mat.grunt → Purchase/Real Cost`  
dla rozpoznawalnej klasy economy latex primer — **bez** „każde gruntowanie = mat.grunt”.

---

## 2. SOURCE basis

| Item | Value |
|------|--------|
| Research doc | `docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md` |
| Verdict | **A — SOURCE READY** (wąski V1) |
| Products | Śnieżka Grunt · Dekoral GRUNT L |
| Official pages | https://www.sniezka.pl/produkt/sniezka-grunt · https://dekoral.pl/produkty/dekoral-grunt-l |
| Policy | ECONOMY / TENDER-SAFE → conservative coverage **10 m²/L** |
| Math | `factor = 1 / 10 = 0.10` L/m² |
| Coats in SOURCE | Producenci: **1** warstwa |

**factorSourceRef (LOCKED for implement):**

```text
OWNER://ECONOMY_INTERIOR_PRIMER_V1@2026-08-10|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md
```

**factorApprovedAt (LOCKED for implement):**

```text
2026-08-10T00:00:00.000Z
```

(Owner approval timestamp tego DF / decyzji — zgodne z kontraktem 01A `owner_approved` wymagającym `factorSourceRef` + `factorApprovedAt`.)

---

## 3. Economy profile

```text
SystemId:     ECONOMY_INTERIOR_PRIMER_V1
Class:        latex priming paint / emulsja gruntująca do wnętrz
NOT class:    deep penetrating primer · hydro primer · tile primer · mortar
Economy:      budget brands available in PL (Śnieżka / Dekoral)
Tender-safe:  uses worst coverage in approved set (10 m²/L)
```

Spójność z painting 01B: osobny pack; grunt **nie** jest wliczony w `pack.painting.economy_interior_white_v1`.

---

## 4. Exact eligibility

Linia / TechUnit jest **eligible** dla V1 **tylko gdy** wszystkie warunki:

### 4.1 Positive gates

1. `CostItemFamily` / TechUnit family = **`priming`** (po Decomposition / classify).  
2. Jednostka ilościowa kompatybilna z m² (typowe `m2` / `m²`).  
3. Wording wskazuje **gruntowanie podłoży / preparatami / pod malowanie / lateksowy charakter ogólny**, **bez** tokenów OUT (§5).  
4. Pack `pack.priming.economy_interior_v1` jest **ACTIVE** + `canPackFeedProductionBom` (provenance gate 01A).  
5. Coats dla profilu = **1** (profile lock).

### 4.2 Example IN (illustrative — z SOURCE research)

- „Gruntowanie podłoży preparatami — powierzchnie pionowe/poziome”  
- „Gruntowanie podłoża z tynku pod malowanie”  
- „Jednokrotne gruntowanie” / „Ręczne gruntowanie podłoża” (gdy brak OUT tokens)  
- Compound: „…malowanie… z jednokrotnym gruntowaniem” → **TechUnit priming** eligible + **TechUnit painting** osobno

### 4.3 Eligibility resolver (conceptual — implement later)

```text
resolvePrimingEconomyV1Eligibility(line | TechUnit) →
  "eligible" | "unbound"
```

Deterministic token rules only (fold PL). **No** fuzzy / LLM / substrate engine.

---

## 5. Exact UNBOUND boundaries

**UNBOUND** (brak material invent, brak fallback `mat.grunt`) gdy:

| # | Boundary | Przykłady tokenów / sytuacji |
|---|----------|------------------------------|
| U1 | Deep primer / grunt głęboko penetrujący | `gleboko penetr`, `głęboko penetr`, `penetrujac` + grunt |
| U2 | Named CT 17 | `ct 17`, `ct17`, `ceresit ct` |
| U3 | Named Atlas Uni-Grunt | `atlas uni`, `uni-grunt`, `uni grunt` |
| U4 | Hydro / uszczelnienia | `uszczeln`, `hydroizol`, `izolacje przeciwwilg` + grunt w kontekście hydro |
| U5 | Pod kleje / okładziny | `pod klej`, `kleje cementowe`, `okladzin` |
| U6 | Zaprawa / mortar as primer | `zaprawa cementowa`, gruntowanie keramzytu zaprawą |
| U7 | Inny produkt nazwany ≠ V1 set | inne marki deep / systemowe poza approved set **bez** mapowania |
| U8 | Cel „pod tynk” bez jasnego „pod malowanie” | **UNBOUND** w V1 (border → bezpiecznie OUT) |
| U9 | „Dwukrotne gruntowanie” | OUT V1 (brak Owner factor 2×) |
| U10 | Family ≠ `priming` | np. sama linia painting „bez gruntowania” |
| U11 | Pack DRAFT / brak provenance / nie ACTIVE | 01A gate |
| U12 | Ambiguous / empty priming wording | nie da się bezpiecznie zaklasyfikować klasy A |

**ZAKAZ:** `każde gruntowanie → mat.grunt`.

---

## 6. Recipe schema

**Pack (conceptual — create only when IMPLEMENT authorized):**

```text
packId:        pack.priming.economy_interior_v1
packVersion:   1.0
definitionId:  def.priming.economy_interior_v1
lifecycle:     DRAFT → (tests) → ACTIVE  (promote only after Owner GO implement)
namePl:        Gruntowanie wnętrz — economy primer V1 (0.10 L/m²)
packCapabilities: [cap.interior_priming]   // or reuse existing cap if TF already has equivalent — REUSE FIRST at implement
```

**Materials (single line):**

| coats | materialKey | unit | qtyFactor | wastePolicy | factorSourceKind | factorSourceRef | factorApprovedAt |
|-------|-------------|------|-----------|-------------|------------------|-----------------|------------------|
| **1** | `mat.grunt` | `l` | **0.10** | `included_in_factor` | `owner_approved` | `OWNER://ECONOMY_INTERIOR_PRIMER_V1@2026-08-10\|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md` | `2026-08-10T00:00:00.000Z` |

**Equipment / labour:** empty in V1 (material only).  
**No PLN** on pack (TF-1).  
**Immutability:** zmiana factora = nowa `packVersion` (TF-8) — nie mutować ACTIVE 1.0.

**Binding map (conceptual):**

```text
familyToPackId("priming") → pack.priming.economy_interior_v1
  ONLY after eligibility === eligible
  else UNBOUND (do not bind deep-primer lines to this pack)
```

---

## 7. Provenance

Reuse **01A** gates:

| Field | Value |
|-------|--------|
| `factorSourceKind` | `owner_approved` |
| `factorSourceRef` | wskazuje **SOURCE RESEARCH PRIMING-01** (LOCKED §2) |
| `factorApprovedAt` | ISO Owner approval (§2) |
| `wastePolicy` | `included_in_factor` |
| Production feed | `canPackFeedProductionBom` — ACTIVE + valid provenance |

DRAFT / APPROVED bez pełnego provenance → **no production BOM**.

P-meta (Decomposition): `sourceLineIds[]` / `techUnitIds[]` na liniach BOM przez istniejący `annotateBomProvenance` + `mergeGeneratedBoms`.

---

## 8. Quantity formula

```text
derivedQty = round6(boqQty × 0.10)
```

**Rounding:** istniejący mechanizm `projectProductionBom`:

```text
Number((qty * qtyFactor).toFixed(6))
```

| boqQty (m²) | coats | qtyFactor | derivedQty (L) |
|------------:|------:|----------:|---------------:|
| 100 | 1 | 0.10 | **10.000000** → display/tests **10.0000** |
| 250 | 1 | 0.10 | **25.000000** |
| 500 | 1 | 0.10 | **50.000000** |

```text
Example:
  BOQ "Gruntowanie podłoży preparatami" · 500 m²
  family = priming
  eligibility = eligible
  coats = 1
  qtyFactor = 0.10
  derivedQty = round6(500 × 0.10) = 50 L
  materialKey = mat.grunt
  unit = l
```

---

## 9. Painting relationship

| Rule | Behavior |
|------|----------|
| Compound EXPLICIT (grunt + malowanie w jednej linii) | Decomposition → **2 TechUnits**: `priming` + `painting` |
| Priming TechUnit | `pack.priming.economy_interior_v1` (jeśli eligible) |
| Painting TechUnit | existing `pack.painting.economy_interior_white_v1@1.0` (01B coats 1\|2) |
| Merge | `mergeGeneratedBoms` — jeden projectProductionBom |
| Auto-add priming to every paint | **FORBIDDEN** |
| Auto-add paint to every priming | **FORBIDDEN** |
| Single compound recipe | **FORBIDDEN** |

---

## 10. Identity REUSE

| Item | Decision |
|------|----------|
| `mat.grunt` | **REUSE** (PI map / S2-C) |
| New materialKey | **NO** |
| New CatalogWork | **NO** |
| New aliases | **NO** |
| Unsafe class recognition | **UNBOUND** — nie wymuszać identity |

Price path: PI/Market quotes `mat.grunt` unchanged; **MARKET ≠ PURCHASE**; Real Cost ← Purchase path (existing).

---

## 11. Tests (Design Freeze suite — implement later)

Suite zaprojektowany: `scripts/test-technology-recipe-consumption-priming-01.mjs` (nazwa robocza).

| # | Case | Expected |
|---|------|----------|
| 1 | Eligible priming line + qty | BOUND + BOM `mat.grunt` |
| 2 | 100 m² | **10.0000** L |
| 3 | 500 m² | **50.0000** L |
| 4 | coats | **1** only for V1 line |
| 5 | Missing / ambiguous priming wording | **UNBOUND** |
| 6 | Deep primer wording | **UNBOUND** |
| 7 | CT 17 named | **UNBOUND** |
| 8 | Atlas Uni-Grunt named | **UNBOUND** |
| 9 | Hydro primer / uszczelnienia | **UNBOUND** |
| 10 | Painting + priming EXPLICIT | **2 TechUnits**; 2 packs; merged BOM |
| 11 | Painting only | existing **01B** painting recipe only |
| 12 | Priming only | primer recipe only |
| 13 | Provenance gate | DRAFT / bad provenance → no production BOM |
| 14 | ACTIVE only | only ACTIVE+feedable packs produce BOM |
| 15 | No new materialKey | assert key set ⊆ existing (`mat.grunt`) |
| 16 | No PI / Purchase / Market writes | zero write assertions |
| 17 | Regression ETICS / kostka | PASS |
| 18 | Regression painting 01B | PASS (39+ tests unchanged behavior) |
| 19 | Regression decomposition 01 | PASS |

Additional: 250 m² → 25.0000 L (Owner examples).

---

## 12. Risks

1. **False BIND** generic „gruntowanie” → lateks V1 gdy BOQ myślał deep primer (mitigacja: named CT17/Atlas + deep tokens → UNBOUND).  
2. **False UNBOUND** zbyt agresywne tokeny OUT (mitigacja: testy + Owner review eligibility list).  
3. **„do 10 m²/L”** niedoszacowanie na ekstremalnie chłonnych — akceptowane jako Owner tender-safe; nie dodawać waste %.  
4. **Compound merge** — regresja double-count jeśli decomp nie rozdzieli TechUnits.  
5. **pod tynk** — świadomie UNBOUND; przyszły profil.  

---

## 13. Non-goals (this DF / future implement of THIS slice)

- substrate engine · dilution engine · deep-primer logic · coverage ranges as runtime  
- waste percentage adder · ML · fuzzy · LLM · live provider  
- PI / Purchase / Market / Bid / SQL / scrape changes  
- new materialKey / CatalogWork / aliases  
- compound priming+painting mega-pack  
- hard REMOVE · Payroll · Persist · protected WIP (`bid-time-load-guard/**`, bid adapter, `useTenderOfferRun`, …)  
- automatic priming on every painting line  

---

## 14. Future extensions (OUT of this DF)

| Extension | Note |
|-----------|------|
| Deep primer profile (CT 17 / Atlas) | osobny SOURCE + DF — zakresy 0.05–0.5 |
| Hydro / tile adhesive primers | osobne families / packs |
| Priming 2 coats | tylko po nowym Owner SOURCE + nowa packVersion |
| „pod tynk” economy profile | osobna decyzja Owner |
| SKU-specific keys | optional later; V1 stays `mat.grunt` |

---

## 15. Owner verification checklist

Przed **IMPLEMENT GO** Owner potwierdza:

- [ ] Profile `ECONOMY_INTERIOR_PRIMER_V1` = APPROVED  
- [ ] Factor **0.10 L/m²** @ 1 coat = APPROVED  
- [ ] `wastePolicy = included_in_factor` = APPROVED  
- [ ] `mat.grunt` REUSE = APPROVED (no new key)  
- [ ] packId `pack.priming.economy_interior_v1@1.0` = APPROVED  
- [ ] SOURCE ref → `TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01` = APPROVED  
- [ ] UNBOUND boundaries (§5) = APPROVED (w tym CT17 / Atlas / hydro / klej / zaprawa / pod tynk)  
- [ ] No compound mega-recipe; 2 TechUnits gdy EXPLICIT = APPROVED  
- [ ] Test plan §11 = APPROVED  
- [ ] IMPLEMENT nadal wymaga **osobnego Owner GO** (ten dokument ≠ implement authorization)

**Po weryfikacji DF:** status → `DESIGN FREEZE OWNER VERIFIED` (docs-only).  
**Implement:** dopiero po osobnym poleceniu Owner.

---

## 16. Target data flow (post-implement — not now)

```text
BOQ line
  → Decomposition → TechUnit[] 
  → CostItemFamily / family = priming (per unit)
  → resolvePrimingEconomyV1Eligibility → eligible | unbound
  → coats = 1 (profile lock)
  → ACTIVE pack.priming.economy_interior_v1@1.0
  → provenance gate (01A)
  → recipe line qtyFactor=0.10
  → projectProductionBom
       derivedQty = round6(boqQty × 0.10)
  → mat.grunt
  → mergeGeneratedBoms (+ painting partial BOM if present)
  → existing PI / Purchase / Real Cost / Offer path
```

**REUSE:** TechnologyPack · PackRecipe · recipe provenance · `projectBom` / `projectProductionBom` · Decomposition · Line Binding · `mergeGeneratedBoms`.  
**ZERO** second BOM SSOT.

---

## 17. Exact allowlist (when IMPLEMENT authorized — future)

| File / artifact | Intent |
|-----------------|--------|
| `src/lib/technology-foundation/priming-economy-interior-v1.ts` (**NEW**) | pack seed + constants |
| `src/lib/technology-foundation/fixtures.ts` / seed | register pack (DRAFT→ACTIVE in tests) |
| `src/lib/execution-expert/priming-eligibility.ts` (**NEW thin**) | eligibility resolver |
| `src/lib/execution-expert/technology-line-binding.ts` | `priming` → pack **after** eligibility |
| `src/lib/execution-expert/technology-decomposition.ts` | only if needed for compound EXPLICIT (prefer REUSE) |
| `src/lib/execution-expert/index.ts` | exports |
| `scripts/test-technology-recipe-consumption-priming-01.mjs` (**NEW**) | §11 |
| This DF + SOURCE research md | status sync |

Prefer **smallest** diff; avoid unrelated TF churn.

---

## 18. Exact DO NOT TOUCH

- `bid-time-load-guard/**` · bid adapter/calculator · `useTenderOfferRun` · `applyBidTimeLoadGuard`  
- Payroll · Persist · P0/P1/P3 · Market Sync · SQL · scrape · LLM/fuzzy  
- PI write paths · Purchase write · Market write · Bid pricing  
- Painting 01B factors (unless regression harness)  
- New materialKey / CatalogWork / aliases  

---

## FINAL GATE

```text
DESIGN FREEZE = OWNER VERIFIED
IMPLEMENT     = DONE (local) — awaiting OWNER VERIFICATION
COMMIT        = NOT AUTHORIZED
PUSH          = NOT AUTHORIZED
PRODUCTION    = NOT AUTHORIZED
```

**STOP — czekaj na Owner Verification of IMPLEMENT.**  
Nie COMMIT / PUSH bez osobnego Owner GO.
