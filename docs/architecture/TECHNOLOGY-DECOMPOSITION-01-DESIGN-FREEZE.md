# DESIGN FREEZE — TECHNOLOGY-DECOMPOSITION-01

> **ID:** `TECHNOLOGY-DECOMPOSITION-01`  
> **Status:** **DESIGN FREEZE OWNER VERIFIED** · **IMPLEMENT = DONE (local)** · **COMMIT / PUSH / PROD = NOT AUTHORIZED** · awaiting **OWNER VERIFICATION**  
> **Date:** 2026-08-10  
> **Baseline tip:** UI **2.66.23** / **`c8edb19b`**  
> **Prior CLOSED:** TECHNOLOGY-LINE-BINDING-01 · TECHNOLOGY-RECIPE-CONSUMPTION-01A · TECHNOLOGY-RECIPE-CONSUMPTION-01B (painting economy white)  
> **Audit input:** TECHNOLOGY-DECOMPOSITION-01 AUDIT · 5 tenders · 804 non-noise BOQ lines  
> **Owner architecture direction:** **B** (Decomposition extension)  
> **Provenance:** P-meta — `sourceLineIds[]` / `techUnitIds[]` on `GeneratedBom*` lines via `mergeGeneratedBoms`

```text
LAYER LOCK
──────────
DECOMPOSITION = które technologie są w linii BOQ
RECIPE        = czego i ile (materials + qtyFactor) — dopiero ACTIVE + SOURCE
PI            = ile kosztuje materialKey (Market)
PURCHASE      = ile faktycznie zapłacono
REAL COST     = koszt realizacji (Purchase)
OFFER         = oferta Expert
MARKET ≠ PURCHASE
Bid path = OUT OF THIS DF
```

---

## 1. Purpose

Zamrozić **wyłącznie architekturę** warstwy:

```text
BOQ LINE
  → TECHNOLOGY DECOMPOSITION
  → 1..N TechUnit
  → CostItemFamily
  → TechnologyPack
  → Recipe
  → partial projectProductionBom
  → mergeGeneratedBoms
  → PI / Purchase → Real Cost → Offer
```

Cel: umożliwić przyszły inteligentny kosztorysant na **compound** liniach WM/ZZK/MOPS **bez** zgadywania materiałów, norm ani parametrów.

Ten dokument **nie** implementuje kodu, recipe, packów, aliasów ani identity.

---

## 2. Problem Statement

### Evidence (audit, tip context `c8edb19b`; operate sample baseline `0933aab`)

| Class | Count | % |
|-------|------:|--:|
| ATOMIC | 271 | 33.7% |
| COMPOUND (heuristic upper) | 113 | 14.1% |
| PRODUCT + INSTALL | 35 | 4.4% |
| LABOR + MATERIAL | 17 | 2.1% |
| PARAMETER_REQUIRED | 11 | 1.4% |
| UNKNOWN | 357 | 44.4% |

**Uwaga Owner:** 113 = **górna** heurystyka keyword multi-hit. Populacja **true safe multi-technology** ≈ **30–50** linii.  
**Zakaz:** projektować Decomposition wokół naiwnego multi-hit (np. „wykucie ościeżnic” ≠ DEMOLITION + DOOR_SUPPLY).

### Luka obecnego toru A

```text
BOQ → CostItemFamily → TechnologyPack → Recipe → BOM
```

- Atomowe linie (np. 01B painting + coats): **OK**.  
- Compound (GK + szpachla + malowanie): **jedna family / jeden pack** → utrata technologii lub UNBOUND.  
- Merge BOM sumuje `materialKey`, ale **nie** niesie `techUnitId` / pełnego trailu unit→qty.

### Co już działa (nie ruszać w tym DF)

- 01A provenance + ACTIVE gate.  
- 01B: `resolvePaintCoats` → economy white → litry → `mat.farba_lateksowa_wewnetrzna`.  
- `mergeGeneratedBoms` jako **jedyny** merge SSOT.

---

## 3. Architecture B

### 3.1 Chosen

**Architecture B — TECHNOLOGY DECOMPOSITION** (Owner direction).

```text
BOQ LINE
  → TECHNOLOGY DECOMPOSITION
  → 1..N TechUnit          (N=0 ⇒ UNBOUND / OWNER_REVIEW)
  → each: CostItemFamily
  → TechnologyPack @ version (tylko gdy ACTIVE + production provenance)
  → Recipe (qtyFactor / coats / …)
  → partial projectProductionBom
  → mergeGeneratedBoms
  → PI / Purchase → Real Cost → Offer
```

### 3.2 Architecture A (atomic) — remains valid

```text
BOQ → CostItemFamily → TechnologyPack → Recipe → BOM
```

**A = degeneracja B przy N=1.** Decomposition jest **rozszerzeniem**, nie zamianą A.

### 3.3 Architecture C — REJECT (primary)

**Compound TechnologyPack** (jeden pack = wiele tech w czarnej skrzynce) = **REJECT** jako primary.

| Powód reject |
|--------------|
| Monolityczny |
| Słabe REUSE recipe |
| Słaby audit trail |
| Ryzyko ukrytej material inference |
| Mylenie technology vs recipe |

Compound pack **nie** jest zakazany na zawsze jako wyjątek Owner GO — **nie** jest domyślną architekturą.

---

## 4. TechUnit Contract

### 4.1 Definition

**TechUnit** = atomowa jednostka wykonawcza wynikająca z dekompozycji linii BOQ, która **może** niezależnie wejść w Family → Pack → Recipe → partial BOM.

TechUnit **nie** zawiera cen, Purchase, Offer ani `materialKey`.

### 4.2 Required fields

| Field | Type (logical) | Meaning |
|-------|----------------|---------|
| `techUnitId` | stable string | unikalny w kontekście tender/line |
| `sourceLineId` | string | BOQ `lineId` — **obowiązkowy** trail |
| `family` | CostItemFamily \| extended family token* | most do pack binding |
| `quantityInput` | `{ quantity, unit }` | wejście qty z linii (lub jawny derived input) |
| `decompositionReason` | string (PL ok) | dlaczego ten unit powstał |
| `status` | enum poniżej | per-unit resolution |

\*Extended tokens (np. `SURFACE_PREP`, `SKIM_COAT`) mogą mapować na istniejące lub przyszłe `CostItemFamily` — **mapa family jest poza tym DF** (osobny GO). Do czasu mapowania: unit może pozostać `UNBOUND` / `OWNER_REVIEW`.

### 4.3 Conditional fields

| Field | When |
|-------|------|
| `parameters` | coats, thicknessMm, circuitSpec, … — tylko gdy wynikają z BOQ lub są wymagane |
| `recipeBinding` | `{ packId, packVersion } \| null` — tylko gdy pack ACTIVE + provenance ready |

### 4.4 Optional field — `role`

| Candidate roles | |
|-----------------|--|
| `PRIMARY_WORK` | główna robota linii |
| `PREPARATION` | przygotowanie podłoża |
| `FINISH` | warstwa wykończeniowa |
| `MATERIAL_SUPPLY` | dostawa produktu |
| `INSTALLATION` | montaż |
| `DEMOLITION` | rozbiórka / wykucie |
| `DISPOSAL` | wywóz / utylizacja |
| `MEASUREMENT` | pomiar |

**Freeze decision:** `role` jest **OPTIONAL useful**.

- **Family** = *jaka rodzina technologii?*  
- **Role** = *jaką funkcję pełni unit w tej zdekomponowanej linii?*  

Role **NIE** zastępuje `CostItemFamily`.  
Brak `role` nie blokuje BINDingu — binding idzie po `family` + recipe.

### 4.5 Forbidden on TechUnit

| Zakaz |
|-------|
| ML confidence / fuzzy score |
| `apartmentScopeId` / `branchScopeId` (patrz §12) |
| prices / PLN |
| `materialKey` |
| qtyFactor / wastePolicy (to Recipe) |
| duplikat Recipe / BOM SSOT |

### 4.6 Status enum (per TechUnit)

| Status | Meaning |
|--------|---------|
| `BOUND` | family + ACTIVE pack + provenance + params OK → może wejść w production BOM |
| `UNBOUND` | brak pack / brak pewności — **no guess** |
| `PARAMETER_REQUIRED` | technologia rozpoznana; brak parametru z BOQ |
| `OWNER_REVIEW` | niejednoznaczna dekompozycja / false-positive risk |

---

## 5. State Model

### 5.1 Line-level states

```text
RAW BOQ LINE
  → ATOMIC              (N=1, no decompose)
  → DECOMPOSED          (N≥2 TechUnits)
  → UNBOUND             (N=0, no safe tech)
  → OWNER_REVIEW        (ambiguous decompose)
  → PARAMETER_REQUIRED  (aggregate when any unit needs param and none bound usable — see §5.3)
```

### 5.2 Per-TechUnit resolution (preferred)

Każdy TechUnit ma **własny** `status`.

Przykład (Example 1):

| TechUnit | status dziś (tip) |
|----------|-------------------|
| DRYWALL | `UNBOUND` (brak ACTIVE recipe) |
| SKIM_COAT | `UNBOUND` |
| PAINTING | `BOUND` (01B) gdy coats∈{1,2} |

**Preferencja zamrożona:**  
**per-TechUnit status + line-level aggregate status.**

### 5.3 Line-level aggregate (normative)

| Aggregate | Rule |
|-----------|------|
| `DECOMPOSED_PARTIAL` | ≥1 TechUnit `BOUND` **and** ≥1 not BOUND |
| `DECOMPOSED_BOUND` | wszystkie TechUnits `BOUND` |
| `DECOMPOSED_BLOCKED` | zero `BOUND` and (≥1 `PARAMETER_REQUIRED` or `OWNER_REVIEW` or `UNBOUND`) |
| `ATOMIC_*` | N=1 — lustrzane statusy jak dziś LINE-BINDING |

**Zakaz:** nierozwiązany unit **nie** wolno „domykać” milczącym guess.  
**Zakaz:** jeden `UNBOUND` **nie** kasuje** innych `BOUND` unitów tej samej linii (PARTIAL jest dozwolony).

BOM: tylko TechUnits ze statusem `BOUND` + production gate 01A karmią `projectProductionBom`.

---

## 6. Decomposition Rules

| # | Rule |
|---|------|
| **R1** | Linia **atomowa** → **nie** dekomponuj (N=1 / tor A). |
| **R2** | Dekomponuj **tylko** gdy **≥2 technologie są jawnie** obecne w wording BOQ. |
| **R3** | „pod malowanie” **≠** PAINTING. |
| **R4** | „z przygotowaniem” **≠** automatyczny PRIMER — tylko gdy gruntowanie **jawne** lub osobny Owner governance. |
| **R5** | Obiekt demontażu ≠ supply. „Wykucie ościeżnic” = **DEMOLITION only**. |
| **R6** | Product + installation → `MATERIAL_SUPPLY` + `INSTALLATION` **tylko** gdy oba są jawnie reprezentowane. |
| **R7** | KNR base + dodatek grubości → **ONE** parametric TechUnit (np. screed thickness=30 mm), **nie** dwa recipe. |
| **R8** | Brak parametru → `PARAMETER_REQUIRED` (nie invent 3×1.5 / 3×2.5 / mm). |
| **R9** | Nieznana / ryzykowna dekompozycja → `OWNER_REVIEW` lub `UNBOUND`. |
| **R10** | **No guessing.** |
| **R11** | Każdy TechUnit **zachowuje** `sourceLineId`. |
| **R12** | Decomposition **identyfikuje technologie**; **MUST NOT** tworzyć ilości materiałów (to Recipe + SOURCE). |

**Anti-naive-multi-hit:** overlap leksykalny (słowo „drzwi” w demontażu) **nie** tworzy drugiego TechUnit.

---

## 7. Compound Examples (frozen)

### Example 1 — SAFE_DECOMPOSE

**BOQ:** „Obudowa GK + szpachlowanie + dwukrotne malowanie”

| # | TechUnit | Notes |
|---|----------|-------|
| 1 | DRYWALL | UNBOUND do SOURCE+ACTIVE pack |
| 2 | SKIM_COAT | UNBOUND do SOURCE |
| 3 | PAINTING | może **REUSE 01B** gdy coats=2 |

### Example 2 — OWNER_REVIEW / no implicit paint

**BOQ:** „Przygotowanie powierzchni pod malowanie z poszpachlowaniem”

| # | TechUnit |
|---|----------|
| 1 | SURFACE_PREP |
| 2 | SKIM_COAT |

**DO NOT** add PAINTING.  
**DO NOT** add PRIMER unless explicitly stated.

### Example 3 — ONE parametric unit

**BOQ:** „Wylewka 20 mm” + „dodatek za 10 mm”

→ **ONE** SCREED TechUnit  
→ `parameters.thicknessMm = 30`  
→ **nie** SCREED_BASE + SCREED_ADDON jako dwa recipe.

### Example 4 — conditional door

**BOQ:** „Drzwi + przymurowanie ościeży”

| Potential | Condition |
|-----------|-----------|
| MASONRY | jawne przymurowanie |
| DOOR_SUPPLY / INSTALL | **tylko** gdy dostawa/montaż drzwi **jawne** w tej linii |

### Example 5 — electrical param

**BOQ:** „Ułożenie przewodu YDY 3x1,5 mm²”

→ ELECTRICAL_CABLE  
→ `parameters.circuitSpec = "3x1.5mm²"` (z BOQ)

**Bez spec:** `PARAMETER_REQUIRED`.  
**NEVER** infer 3×1.5 / 3×2.5.

---

## 8. Material / Recipe Boundary

| Layer | Answers |
|-------|---------|
| **DECOMPOSITION** | Jakie technologie są w linii? |
| **RECIPE** | Jakie materiały dla tej technologii? |
| **QUANTITY MODEL** | Ile materiału? |
| **SOURCE** | Skąd factor? (Owner / TDS / system — 01A) |
| **PI** | Ile kosztuje `materialKey` (Market)? |
| **PURCHASE** | Ile firma zapłaciła? |
| **REAL COST** | Co wchodzi w koszt realizacji? |
| **OFFER** | Jaka oferta Expert? |

**Żadna warstwa nie wykonuje milcząco pracy innej warstwy.**

Szczególnie: Decomposition **nie** ustawia `qtyFactor`, `materialKey`, ani PLN.

---

## 9. Quantity Boundary

| Concern | Owner |
|---------|--------|
| BOQ quantity / unit | `TechUnit.quantityInput` (z linii) |
| coats / thickness / circuitSpec | `TechUnit.parameters` (z BOQ only) |
| L/m², kg/m², waste | **Recipe** + SOURCE + ACTIVE (01A/01B) |
| Derived litres (np. 83.3335 L) | `projectProductionBom` po recipe |

01B pozostaje jedynym zamrożonym realnym consumption pattern w tej gałęzi świadomości:

- 1 coat: 0.083333 L/m²  
- 2 coats: 0.166667 L/m²  
- `mat.farba_lateksowa_wewnetrzna`

Ten DF **nie** dodaje nowych factors.

---

## 10. Provenance

### 10.1 Target audit chain

```text
BOQ line
  → TechUnit (techUnitId + sourceLineId)
  → CostItemFamily
  → TechnologyPack @ version
  → Recipe (factorSourceKind / Ref / ApprovedAt)
  → materialKey
  → derived quantity
  → Purchase
  → Real Cost
  → Offer
```

Owner musi móc odpowiedzieć:

1. Dlaczego **83.3335 L**?  
2. Która linia BOQ?  
3. Która część compound linii (który TechUnit)?

### 10.2 Current gap (documented, not fixed here)

`mergeGeneratedBoms` agreguje po `materialKey` i **gubi** powiązanie unit→qty.  
`bomLineId` dziś = pack@version@mat@key — **bez** `sourceLineId` / `techUnitId`.

### 10.3 Design requirement (future implement — not this DF deliverable)

Zachować **jeden** BOM SSOT (`GeneratedBom` + `mergeGeneratedBoms`).

Dopuszczalne (wybór w IMPLEMENT Design / osobnym GO):

| Option | Idea |
|--------|------|
| **P-meta** | Na pozycji BOM: `sourceLineIds[]` + `techUnitIds[]` (append przy merge) |
| **P-rel** | Osobna append-only relacja provenance `(bomLineKey → sources[])` bez drugiego BOM |

**Zakaz:** drugi BOM SSOT.  
**Zakaz:** gubienie `sourceLineId` na TechUnit przed merge.

---

## 11. BOM Merge

| Rule | |
|------|--|
| SSOT merge | istniejące `mergeGeneratedBoms` |
| Input | partial BOM z każdego **BOUND** TechUnit |
| Output | jeden `projectProductionBom` / merged BOM |
| Unbound units | **zero** contribution |
| Second BOM / parallel recipe engine | **FORBIDDEN** |

```text
TechUnit A → partial BOM
TechUnit B → partial BOM
TechUnit C → partial BOM
        ↓
mergeGeneratedBoms → ONE BOM
```

---

## 12. Multi-Apartment Boundary

| Concern | Belongs to |
|---------|------------|
| `apartmentScopeId` | tender / line / branch scope |
| `branchScopeId` | tender / line / branch scope |
| TechUnit | **inherits** scope via `sourceLineId` |

**Zakaz** w core TechUnit modelu: embedding apartment/branch IDs.  
**Nie** implementować multi-apartment w tym DF.

---

## 13. False Positive Protection

| Pattern | Correct | Forbidden |
|---------|---------|-----------|
| „wykucie ościeżnic” | DEMOLITION | DEMOLITION + DOOR_SUPPLY |
| „wykucie podokienników” | DEMOLITION | DEMOLITION + WINDOW_SUPPLY |
| Measurement wording + unrelated token | MEASUREMENT | fake multi-tech |
| Object name in demolition | object of removal | supply technology |
| Substrate („na podłożu z cegły”) | note / param | automatic MASONRY recipe unit |
| „pod malowanie” | purpose clause | PAINTING TechUnit |

Heurystyka multi-hit **nie** jest regułą dekompozycji — regułą jest **jawna obecność technologii wykonawczej** (R2 + R5).

---

## 14. Audit Trail

### Must support (future UI / explainability)

| Question | Answered by |
|----------|-------------|
| Why 83.3335 L? | Recipe factor × qty × coats (01B) |
| Which BOQ line? | `sourceLineId` |
| Which part of compound line? | `techUnitId` + `decompositionReason` |
| Which pack/version? | `recipeBinding` |
| Provenance of factor? | 01A `factorSource*` |
| Price vs qty? | PI/Purchase **after** materialKey — osobno |

### Binding layer note

Dziś `TechnologyLineBinding` ma `lineId` (1:1 z linią).  
Po Decomposition: logicznie **1 line → N bindings** (po jednym na TechUnit) **lub** równoważny model z `techUnitId` na binding — do wyboru w IMPLEMENT; ten DF wymaga jedynie, by trail był możliwy.

---

## 15. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| F1 | False multi-hit → złe TechUnits | R5 + §13; OWNER_REVIEW |
| F2 | Implicit tech creep | R3, R4 |
| F3 | Decomposition invents materials | R12 + §8 |
| F4 | Merge drops provenance | §10.3 before production claim |
| F5 | Parameter guessing (YDY) | R8 |
| F6 | Scope creep into recipes/aliases | §16 Non-Goals |
| F7 | Bid/WIP entanglement | §16 |

---

## 16. Non-Goals

| OUT |
|-----|
| Implementation / TypeScript / schema migrations |
| New TechnologyPack / Recipe / ACTIVE factors |
| Priming / skim / drywall / electrical / tile / waterproofing recipes |
| New materialKey / CatalogWork / aliases / S4 identity |
| PI / Purchase / Market / Demand writes |
| Bid / `bid-time-load-guard/**` / bid adapter/calculator / `useTenderOfferRun` |
| Bid ↔ Chief unification |
| Multi-apartment implementation |
| Compound TechnologyPack as primary (Arch C) |
| ML / fuzzy / embeddings / LLM |

**01B painting** pozostaje jedynym nowym realnym recipe w tej linii produktowej do czasu osobnego Owner SOURCE GO.

---

## 17. Implementation Preconditions

Przed Owner GO **IMPLEMENT** (osobny gate):

1. Ten DF = **Owner Verified**.  
2. Decyzja provenance option (**P-meta** vs **P-rel**) w krótkim ARCH note lub w IMPLEMENT brief.  
3. Allowlist plików wyłącznie pod Decomposition + binding N:1 — **bez** recipe packs.  
4. Test plan: atomic unchanged (01B regression); compound examples 1–5; false-positive demolition; no material invent; merge provenance.  
5. Protected WIP untouched.  
6. **Nie** łączyć z SOURCE recipe epic w tym samym commitcie bez osobnego GO.

---

## 18. Owner Verification Checklist

- [ ] Architecture **B** accepted; **A** = atomic path; **C** rejected as primary  
- [ ] TechUnit required fields frozen (§4.2)  
- [ ] Status enum: BOUND / UNBOUND / PARAMETER_REQUIRED / OWNER_REVIEW  
- [ ] Per-TechUnit status + line aggregate PARTIAL allowed (§5)  
- [ ] Rules R1–R12 accepted  
- [ ] Examples 1–5 accepted (esp. no implicit paint; screed = one unit)  
- [ ] Material/Recipe/PI/Purchase boundaries locked  
- [ ] Provenance gap acknowledged; no second BOM  
- [ ] Multi-apartment out of TechUnit core  
- [ ] False-positive demolition rules accepted  
- [ ] No recipes / aliases / Bid in this DF  
- [ ] IMPLEMENT / COMMIT / PUSH / PROD still NOT AUTHORIZED

---

## 19. Final Gate

```text
DESIGN FREEZE = OWNER VERIFIED
IMPLEMENT = DONE (local)

File:
  docs/architecture/TECHNOLOGY-DECOMPOSITION-01-DESIGN-FREEZE.md
  src/lib/execution-expert/technology-decomposition.ts
  src/lib/execution-expert/technology-line-binding.ts (wired)
  src/lib/technology-foundation/types.ts (P-meta fields)
  scripts/test-technology-decomposition-01.mjs

COMMIT = NOT AUTHORIZED
PUSH = NOT AUTHORIZED
PRODUCTION = NOT AUTHORIZED

NEW PACKS = NONE
NEW RECIPES = NONE
NEW ALIASES = NONE
```

**STOP.** Await **OWNER VERIFICATION** of IMPLEMENT before commit/push.
