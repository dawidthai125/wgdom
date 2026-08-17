# IK — Composite Position Orchestration PLAN

| Field | Value |
|-------|-------|
| **Status** | **PLAN ONLY** · **NO IMPLEMENT** · **NO DF** · **NO COMMIT** |
| **Date** | 2026-08-17 |
| **Mode** | PLAN · ZERO code / tests / flags / `mat.*` |
| **Production** | **2.66.88** / **`482c618f`** |
| **RCA** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md) |
| **RCA verdict** | **B** — architecture sufficient · multiple bindings missing |
| **D** | **false** (no flip) |
| **CatalogWork** | **471** (no write) |

```text
OBJECTIVE
  BOTH_HOLD → decomp → Pack → Material Expert + Labor Expert
           → computePositionCost → ONE POSITION COST

NOT
  new engine · Classification V2 · new ikP* flags · F5 redesign
  auto-Accept · invent mat.* · P2 workaround · P1 invoice

GATE 0 (Owner GO, before IMPLEMENT)
  BOTH_HOLD dziś = terminal HOLD (DF: nie split price).
  Ten PLAN zmienia SEMANTYKĘ KONSUMENTA (nie A1 mapę):
  BOTH_HOLD → orchestrate existing experts on components.
  Bez Owner GO = NO IMPLEMENT.
```

---

## 1. Executive Summary

Minimalne bindingi, **zero duplicate orchestration**:

| Decyzja | Wybór PLAN |
|---------|------------|
| Gdzie consumer | **`IkEntryHost`** — jedyny IK runtime walk |
| Co dodać | **Jedna funkcja-adapter** w `src/lib/intelligent-estimator/` (np. `runIkCompositeBothHold` — nazwa robocza; nie nowy silnik cen) |
| Trigger | Istniejący `IkClassificationHandoff === "BOTH_HOLD"` |
| Decomp | `decomposeOfferBoqLine` + `findActiveTechnologyPacksForWorkId` / bind Execution Expert |
| Materiały | `pack.materials[]` → **ten sam** Material Expert (leaf PM/research), nie nowy |
| Robocizna | **nie** surowe `hoursPerUnit` do engine · **OUR RATE** na `pack.steps[].catalogWorkId` przez Labor Expert |
| Skład | Istniejące `PositionCostInput` + `computePositionCost` |
| Flag | **Żadnych nowych.** Start tylko gdy **już** `isIkP5LaborE2eActive` ∧ `isIkP6MaterialE2eActive` |
| Research | Osobno: `isIkP5LaborExecuteResearchActive` / `isIkP6MaterialExecuteResearchActive` |

**F5 shadow nie jest duplikatem do przepisywania.** Zostaje ścieżką Bid/P7. COMPOSITE IK **nie** redesignuje F5; **reuse** F1/F2/F3 typów (`PositionLaborInput`, `PositionMaterialInput`, `MaterialComponentSpec`).

---

## 2. RCA Reference

| RCA | PLAN |
|-----|------|
| First seam = `BOTH_HOLD` bez konsumenta | Ten PLAN **jest** konsumentem |
| COMPOUND HOLD = safety DF | **Owner GO** wymagane zanim IMPLEMENT |
| Pack.labour godziny ≠ zł/jm | Labor handoff = **workId ze steps**, nie `hoursPerUnit`→PLN |
| Eksperci tylko linie BOQ | Adapter buduje **component jobs** i woła **istniejące** lookupi ekspertów |
| `computePositionCost` GREEN | **NIE RUSZAĆ** silnika |

---

## 3. Existing Contracts

| Kontrakt | Reuse |
|----------|--------|
| `handoffFromPlane` → `BOTH_HOLD` | Trigger |
| `decomposeOfferBoqLine` | N TechUnit / jedna LP |
| `TechnologyPack.materials[]` | `materialKey`, `qtyFactor`, `unit`, provenance |
| `TechnologyPack.labour[]` | **tylko** jeśli `labourKey` ≡ istniejący `workId`; inaczej GAP |
| `PackStepTemplate.catalogWorkId` | Labor identity (F1) |
| `projectBom` | `qty = boqQty × qtyFactor` |
| `runIkMasterBoqMaterialExpert` / leaf PM | Material rates |
| `runIkMasterBoqLaborExpert` / `lookupWorkRate` | Labor rates |
| `resolveMaterialInputFromPriceMemory` | Adapter → `PositionMaterialInput` |
| `resolveLaborInputFromOurWorkRate` | Adapter → `PositionLaborInput` |
| `computePositionCost` | Koniec |
| P1 G1/G2 · P5.9 · `researchEligible` | Bez obejść |

---

## 4. Composite Orchestration Binding

**ZERO duplicate orchestration.**

```text
IkEntryHost  (istniejący consumer Labor/Material/P7)
  │
  ├─ dziś: runIkMasterBoqLaborExpert(BOQ)     // skip BOTH
  ├─ dziś: runIkMasterBoqMaterialExpert(BOQ)  // COMPOUND ≠ demand
  │
  └─ PLAN: po classification, dla linii BOTH_HOLD:
           runIkCompositeBothHold(line)   // adapter, nie drugi host
```

| Pytanie | Rozstrzygnięcie |
|---------|-----------------|
| Czy `IkEntryHost` może być consumerem? | **TAK** — jedyny walk IK |
| Czy nowy orchestrator-moduł? | **NIE** — jedna funkcja w `intelligent-estimator`, wołana z hosta |
| Czy reuse handoff? | **TAK** — `BOTH_HOLD` bez nowej plane / Classification V2 |
| Czy tylko adapter/route? | **TAK** — route składników do istniejących ekspertów + F1/F2 typy |

**Nie** wołać równolegle F5 shadow **i** tego adaptera jako dwóch sum na tę samą LP (podwójne liczenie). P7 nadal czyta F5 na **linii**; po IMPLEMENT P7 może **reuse** `position` z adaptera gdy BOTH_HOLD kompletne — to **binding P7 input**, nie redesign F5 engine. Szczegół: sekwencja §19 (po Owner GO).

**Aktywacja bez nowej flagi:**

```text
isIkEntryEnabled
  ∧ isIkP5LaborE2eActive
  ∧ isIkP6MaterialE2eActive
  ∧ masterBoq.readyForExperts
  ∧ line.handoff === BOTH_HOLD
```

Research HTTP nadal **tylko** gdy istniejące MODE B flags `=== true` **per expert**.

Linie LABOR/MATERIAL 1:1: **bez zmian** (istniejące useEffect).

---

## 5. Decomposition Reuse

**Input (istniejące):** `OfferBoqLineLike` z Master BOQ (description, quantity, unit, catalogWorkId, lineId/lp).

**Kolejność:**

1. `decomposeOfferBoqLine(line)` → `LineDecompositionResult`  
2. Bind pack: `findActiveTechnologyPacksForWorkId(workId)` (exact `steps.catalogWorkId`)  
   — fallback: `analyzeTechnologyLineBindings` **tylko** gdy już dziś binduje (malowanie/ETICS). **Zero fuzzy.**  
3. Brak pack / UNBOUND / AMBIGUOUS_BOM → **GAP/BLOCKED** (§15), nie invent recipe.

**Output kontrakt adaptera (plan, nie nowy silnik cen):**

| Pole | Źródło |
|------|--------|
| `sourceLineId` / LP | BOQ |
| `techUnits[]` | decomp |
| `packId` / `packVersion` | TechnologyPack lub null |
| `materialJobs[]` | `pack.materials` + `projectBom` qty |
| `laborJobs[]` | `steps[].catalogWorkId` (+ `labour[]` tylko przy mapowaniu na workId) |
| identity | workId linii · materialKey ze recipe · **nie invent** |
| quantity BOQ | `line.quantity` |
| unit BOQ | `line.unit` (szt/kpl/mb/m/m2/m3) — **bez remap** |
| factor | `qtyFactor` / `hoursPerUnit` (hours **nie** → PLN) |
| provenance | `factorSourceKind` / `factorSourceRef` / decomp `reason` |

Semantyka decomp **bez potrzeby nie zmieniać**. R6 (umywalka → 2 TechUnit) zostaje; bez pack = GAP, nie fake BOM.

---

## 6. Material Handoff

Dla każdego `PackMaterialRecipeLine` po `projectBom`:

| Pole Material Expert | Wartość |
|----------------------|---------|
| `materialKey` | recipe `materialKey` · brak / nie `mat.*` → **GAP** (P5.9) |
| `labelPl` | recipe `namePl` |
| `quantity` | `boqQty × qtyFactor` (absolutna na pozycję) |
| `unit` | recipe `unit` (może być `l` przy BOQ `m2`) — **nie** remap na jm BOQ żeby znaleźć PM |
| `source` | `TechnologyPack` + LP |
| `package LP` | `line.lp` / `lineId` |
| plane dla research | traktuj komponent jako **MATERIAL** (nie parent COMPOUND HOLD) |
| `researchEligible` | istniejące: `mat.*` · **nie** `mat.inv.*` · nie P2 zawór |

**Brak identity → GAP.** Nie tworzyć `mat.*`.

**Jak wołać eksperta bez nowego silnika:**

- Preferencja: te same funkcje co w `runIkMasterBoqMaterialExpert` (PM `evaluateMaterialCache`, `researchEligible`, `assertMaterialResearchAllowed`).  
- **Nie** wymagać, by cały Master BOQ był plane MATERIAL.  
- Po HIT: mapuj na `PositionMaterialInput` przez **istniejący** `resolveMaterialInputFromPriceMemory` / kształt `MaterialSellResolve.material`.

P1: `isInvoicePurchaseMaterialKey` na każdym komponencie.

---

## 7. Labor Handoff

`TechnologyPack.labour[]` (**hoursPerUnit**) **nie** jest wejściem `computePositionCost` (zł/jm BOQ).

| Źródło labor | Labor Expert input |
|--------------|-------------------|
| `steps[].catalogWorkId` | `workId`, description ze step `namePl`, **quantity = BOQ qty**, **unit = BOQ unit** |
| `labour[].labourKey` | **tylko** gdy `labourKey` jest istniejącym CatalogWork `workId` |
| samo `hoursPerUnit` bez workId | **GAP** — nie invent stawki godz. × hours |

| Pole | Wartość |
|------|---------|
| workId | `catalogWorkId` ze step |
| description | step `namePl` / BOQ description |
| quantity | BOQ quantity (20 mb → 20) |
| unit | BOQ unit |
| source | pack step + LP |
| package LP | ta sama linia |

Labor Expert **zachowuje** CURRENT HIT / MISS / RESEARCH / GAP / cooldown / budget P5.  
Komponent labor = plane **LABOR** (nie parent BOTH skip).

**M labor steps, 1 engine labor:**  
`computePositionCost` przyjmuje **jeden** `labor`. Adapter: `ourRatePln = Σ rate_i` przy **tej samej** jm BOQ (zł/jm). Różne jm → **GAP**, nie remap.

---

## 8. Quantity / Unit

**REUSE `projectBom`:**

```text
BOQ quantity (20 mb)
  × qtyFactor (np. 1.0 mb rury / mb BOQ  lub  L/m² farby)
  = component quantity (absolutna)

Labor OUR RATE:
  laborCost = BOQ quantity × Σ ourRatePln   // istniejący engine
```

| jm BOQ | Kontrakt |
|--------|----------|
| szt / kpl | qty BOQ × factor szt/kpl składnika |
| mb / m | fold m↔mb **tylko** jak dziś `mapInternalFirstUnit` / BOM `unitsCompatible` — **nie** żeby znaleźć inną cenę |
| m2 / m3 | jak recipe (farba `l` vs ściana `m2`) |

**NO UNIT REMAPPING TO FIND PRICE.** Niekompatybilne jm recipe vs PM → `UNIT_CONVERSION_GAP` / component GAP.

---

## 9. Research

**Nigdy** wspólny research COMPOSITE.

| Komponent | Ścieżka |
|-----------|---------|
| Material | Material Expert → PM CURRENT → legal MISS → DIY (istniejące G2/P5.13 granice) |
| Labor | Labor Expert → OUR RATE CURRENT → MISS → work-rate selective (istniejące 24/4) |

Parent COMPOUND **nie** blokuje research **komponentu** (inaczej A3/A4 martwe). To **routing komponentu**, nie Classification V2 rodzica.

Candidate ≠ OUR RATE / PM persist. **Zero auto-Accept.**

---

## 10. GAP Handling

| Case | Position |
|------|----------|
| A wszystkie HIT | `computePositionCost` gdy labor+materials computable → ONE POSITION COST |
| B material MISS | materials status MISSING → **nie** 0 PLN · `positionComplete=false` |
| C labor MISS | labor MISSING → **nie** 0 PLN |
| D material GAP (no key / P5.9 / P2) | `NO_KEY` / skip research · BLOCKED |
| E labor GAP (no workId / hours-only) | `NO_IDENTITY` |
| F UNKNOWN TechUnit / no pack | linia **BLOCKED** · nie 0 |
| G partial (część HIT, część MISS) | **A13:** total **null** dopóki wszystkie **wymagane** komponenty OK; status `PARTIAL_GAP` / blocked — **nie** suma z zerami |

`labor === null` w engine = material-only (laborCost **0**). COMPOSITE **nie** używa `labor=null`, gdy decomp wymaga labor — używa `status: MISSING` żeby **nie** zerować.

`materials=[]` = labor-only. COMPOSITE z `pack.materials.length>0` i MISS **nie** podaje pustej tablicy jako sukces.

---

## 11. Composition

**REUSE `computePositionCost` — nie zmieniać silnika.**

```text
Material Expert results
  → PositionMaterialInput[]     // resolveMaterialInputFromPriceMemory kształt
Labor Expert results
  → PositionLaborInput          // resolveLaborInputFromOurWorkRate kształt
                                // M rates → Σ ourRatePln same unit

computePositionCost({
  quantity: boqQty,
  unit: boqUnit,
  labor,
  materials,
})
```

Istniejące typy: `PositionCostInput` · `PositionLaborInput` · `PositionMaterialInput` · `MaterialComponentSpec`.

Nie składać przez `companyPricePln`. Nie F5 redesign.

---

## 12. Provenance

Final report (EC / P7 seam) **musi** nieść:

| Warstwa | Pole |
|---------|------|
| BOQ | tenderId, lp, lineId, description, qty, unit |
| Pack | packId, packVersion, lifecycle |
| TechUnits | family, role, status, reason |
| Material Expert | materialKey, PM hit/miss, researchKey, candidate id, **nie** auto accept |
| Labor Expert | workId, rateStatus, ourRate BASE/SELL, researchKey |
| GAP | per-component code + line `positionComplete` |
| Engine | issues[] z `computePositionCost` |

Nie zgubić źródła przy Σ.

---

## 13. Owner Accept

Research → **candidate** only.

NIE automatic OUR RATE persist.  
NIE automatic Accept.  
NIE Accept z COMPOSITE orchestratora.

Istniejące: `acceptIkLaborResearchAndNotify` · `acceptIkMaterialResearchCandidate` — **osobna** akcja Owner (Hub / przyszły UI). Po Accept: **re-run** adaptera na tej LP (istniejący `notifyIkPricingAccepted` bump) — nie nowy Accept engine.

---

## 14. Autonomous Walk

Gdy GATE 0 + existing expert levers ON:

```text
Tender → BOQ READY
  → Identity / A1 Classification
  → COMPOUND → BOTH_HOLD
  → decomposeOfferBoqLine
  → TechnologyPack bind (exact workId)
  → materialJobs → Material Expert (+ research jeśli MODE B material)
  → laborJobs    → Labor Expert    (+ research jeśli MODE B labor)
  → map to PositionCostInput
  → computePositionCost
  → EC facts / next BOQ line
```

**Bez** ręcznego włączania eksperta **per linia**. Nadal **bez** auto-włączania dźwigni Super Admin (istniejący lever wall — poza tym PLANEM, brak nowych flag).

Linie nie-BOTH_HOLD: dotychczasowy walk.

---

## 15. Failure Handling

| Failure | IK |
|---------|-----|
| component GAP/MISS | CONTINUE SAFE · linia BLOCKED · next LP |
| unresolved decomp | BLOCKED |
| no / partial pack | BLOCKED · nie invent recipe |
| Material Expert throw | linia GAP · nie 0 |
| Labor Expert throw | linia GAP · nie 0 |
| Research unavailable / cooldown / budget | RESEARCH_SKIPPED / HOLD · nie 0 |
| Invoice component | P1 block · GAP |

**Invent price = zakazane.**

---

## 16. P1 / P2 Safety

| Guard | Binding |
|-------|---------|
| `cw.inv.*` ≠ BOQ primary | mapper bez zmian; komponent nie używa invoice host jako workId linii |
| `mat.inv.*` ≠ DIY | `researchEligible` / `assertMaterialResearchAllowed` na każdym material job |
| CatalogWork 471 | zero CREATE/bind catalog z COMPOSITE |
| D false | zero flip |
| P2 zawory | komponent z tymi workId → **PRODUCT_IDENTITY_GAP** · **nie** research · **nie** invent `mat.*` |

Composite **nie** jest obejściem P2.

---

## 17. Scope

**IN:** konsument `BOTH_HOLD` · decomp/pack reuse · handoff do istniejących ekspertów · adapter `PositionCostInput` · provenance EC · GAP≠0.

**OUT:**

- P2 identity mapping  
- P1 invoice hosts  
- Classification V2 / nowa plane  
- nowy Material/Labor/Research engine  
- nowy CatalogWork  
- D  
- F5 redesign / PM redesign / Accept redesign  
- **nowe flagi `ikP*`**  
- unit remap to find price  
- auto-Accept  

---

## 18. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| A1 | COMPOUND / `BOTH_HOLD` wchodzi w istniejący `IkEntryHost` walk (nie terminal-only) |
| A2 | TechnologyPack reused (exact bind) |
| A3 | `materials[]` → Material Expert (leaf) |
| A4 | Labor via `catalogWorkId` steps → Labor Expert (`labour[]` hours-only = GAP) |
| A5 | BOQ qty/unit preserved; factor tylko `qtyFactor` |
| A6 | Material MISS ≠ 0 PLN |
| A7 | Labor MISS ≠ 0 PLN |
| A8 | Research per-expert |
| A9 | Evidence attributed (pack + expert + LP) |
| A10 | No auto Accept |
| A11 | `computePositionCost` dostaje `PositionCostInput` |
| A12 | ONE POSITION COST tylko gdy `positionComplete` |
| A13 | Partial = GAP/BLOCKED, nie cicha suma |
| A14–A17 | P1 / P2 / D / CatalogWork 471 unchanged |
| A18 | No duplicate engine (brak drugiego F5/IK host) |

---

## 19. Implementation Sequence

**Dopiero po Owner GO na GATE 0.**

| Krok | Binding | Nie |
|------|---------|-----|
| 0 | Owner GO: `BOTH_HOLD` = orchestrate | IMPLEMENT bez GO |
| 1 | Adapter + `IkEntryHost` call na BOTH_HOLD (levers existing) | nowa flaga |
| 2 | decomp + pack bind · no pack → GAP | invent pack |
| 3 | material jobs → existing material leaf | nowy expert |
| 4 | labor jobs → existing labor leaf | hours→PLN invent |
| 5 | `PositionCostInput` + `computePositionCost` | zmiana engine |
| 6 | EC provenance · P7 **optional** reuse position | F5 rewrite |
| 7 | Testy **istniejących** suite + nowe **po** GO | testy teraz |

Każdy krok: GAP≠0 · P1/P2 · D=0.

---

## 20. Rollback

- Usunąć **wyłącznie** wywołanie adaptera z `IkEntryHost`.  
- Przywraca terminal `BOTH_HOLD` (stan prod).  
- F5 / eksperci 1:1 / A1 mapa / CatalogWork **nietknięte**.  
- Brak migracji KV.

---

## 21. Real Tender Validation

**Nie uruchamiać teraz.**

Po IMPLEMENT: WM z `COMPOUND ≥ 1` (Paczka VII ma **1** COMPOUND — LP nie inventować; nie dopisywać „montaż grzejnika”).  
Brak pack na tej LP = **oczekiwany GAP** (A13), nie FAIL silnika.  
Szersza klasa montaż/PVC: inny tender **tylko** gdy linia już istnieje w BOQ.

---

## 22. Final Recommendation

```text
RECOMMEND = IMPLEMENT ONLY AFTER OWNER GO (GATE 0)

BINDING  = IkEntryHost + thin adapter (BOTH_HOLD consumer)
REUSE    = decomp · TechnologyPack · Material/Labor Expert leaves
           · F1/F2 types · computePositionCost
NOT      = new engine · new flags · Classification V2 · F5 redesign

Labor    = steps.catalogWorkId + OUR RATE
           pack.labour hours without workId = GAP

Material = pack.materials + qtyFactor + existing expert/PM
           missing mat.* = GAP (no invent, no P2 bypass)
```

---

## STOP

```text
PLAN COMPLETE
ZERO CODE · ZERO DF · ZERO IMPLEMENTATION
ZERO TEST CODE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY

Czekaj na ChatGPT / Owner Review.
```
