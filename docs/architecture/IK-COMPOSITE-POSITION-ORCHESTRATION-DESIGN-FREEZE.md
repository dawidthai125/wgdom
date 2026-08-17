# DESIGN FREEZE — IK Composite Position Orchestration

| Field | Value |
|-------|-------|
| **Status** | **DESIGN FREEZE = READY** · **IMPLEMENT = WAITING OWNER GO** |
| **Date** | 2026-08-17 |
| **Mode** | DESIGN FREEZE ONLY · ZERO code / tests runtime / commit / push / deploy |
| **Production** | **2.66.88** / **`482c618f`** |
| **RCA** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md) · verdict **B** |
| **PLAN** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-PLAN.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-PLAN.md) |
| **ARCH REVIEW** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-ARCH-REVIEW.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-ARCH-REVIEW.md) · **PASS WITH CONDITIONS** |
| **Owner GO** | **AUTHORIZED** — semantyka konsumenta `BOTH_HOLD` |
| **Classification Gate** | **UNCHANGED** — rodzic `COMPOUND` → `BOTH_HOLD` · `flagsFor("COMPOUND")` bez zmian |
| **D** | **false** (no flip) |
| **CatalogWork** | **471** (no write) |
| **P1** | COMPLETE / CLOSED — bez zmian |
| **P2** | KEEP GAP — bez zmian |

```text
DESIGN FREEZE     = READY
OWNER GO (GATE 0) = AUTHORIZED  (consumer BOTH_HOLD only)
ARCH REVIEW       = PASS WITH CONDITIONS  (conditions absorbed below)
IMPLEMENT         = NO  (czekaj na osobne IMPLEMENT GO)
COMMIT/PUSH/DEPLOY = NO

NEW ENGINE        = NO
NEW ORCHESTRATOR  = NO
NEW FLAG          = NO
CLASSIFICATION V2 = NO
computePositionCost CHANGE = NO
```

---

## 1. Context

IK umie sklasyfikować linię jako `COMPOUND` i wyemitować handoff `BOTH_HOLD`.  
Do tej pory **nikt nie konsumował** tego handoffu jako N jobów Material Expert + M jobów Labor Expert.

Klocki istnieją (RCA **B**):

- `decomposeOfferBoqLine`
- `TechnologyPack` (`materials[]` · `steps[].catalogWorkId` · `labour[]` hours)
- Material Expert / Labor Expert (leaf)
- `PositionCostInput` / `computePositionCost`
- F1/F2 adaptery (`resolveLaborInputFromOurWorkRate` · `resolveMaterialInputFromPriceMemory`)

**Ten epic spina konsumenta.** Nie buduje silnika cen, nie zmienia Classification Gate, nie inventuje `mat.*`.

**Real tender (walidacja po IMPLEMENT, nie teraz):** Paczka VII ma **1** COMPOUND — nie inventować LP / opisu. Brak pack = oczekiwany GAP, nie FAIL silnika.

---

## 2. RCA reference (frozen)

| RCA | DF |
|-----|----|
| First seam = `BOTH_HOLD` bez konsumenta jobów | Ten DF **jest** kontraktem konsumenta |
| COMPOUND HOLD na **rodzicu** = safety Classification Gate | **UNCHANGED** — `flagsFor("COMPOUND")` zostaje |
| `pack.labour` hours ≠ zł/jm | Labor = `steps[].catalogWorkId` + OUR RATE; hours-only = **GAP** |
| Eksperci 1:1 skip BOTH/COMPOUND | Adapter woła **leaf** na składniku, nie pętlę BOQ rodzica |
| `computePositionCost` GREEN | **NO CHANGE** |
| Verdict **B** | architecture sufficient · binding missing → ten DF zamraża binding |

```text
PIERWSZY BREAK (RCA):
  BOTH_HOLD (producer: handoffFromPlane)
    → NO consumer that emits N Material jobs + M Labor jobs

TEN DF:
  BOTH_HOLD → IkEntryHost → thin adapter → existing leaves → PositionCostInput
```

---

## 3. Owner GO

**Owner GO = AUTHORIZED** dla zmiany semantyki **konsumenta** `BOTH_HOLD`.

**Nie** zmieniamy Classification Gate.

Istniejący kontrakt **rodzica** (zamrożony, bez zmian):

```text
COMPOUND  →  BOTH_HOLD     (handoffFromPlane)
flagsFor("COMPOUND")       allow* = false · hold = true
```

Zmiana **wyłącznie** konsumenta (po tym GO):

```text
BOTH_HOLD
  → IkEntryHost
  → decomposeOfferBoqLine()
  → TechnologyPack bind (exact workId)
  → Material Expert / Labor Expert   (leaf na składnikach)
  → PositionCostInput
  → computePositionCost()            (UNCHANGED)
```

Research na **rodzicu COMPOUND** nadal **zabroniony** przez Classification Gate.  
Research **komponentu** jest legalny **tylko** gdy składnik sam ma plane LABOR/MATERIAL **oraz** legalną identity (istniejące `assertMaterialResearchAllowed` / `isLaborGapJobAllowed`).

To **nie** jest Classification V2. To routing konsumenta po Owner GO.

---

## 4. Frozen Architecture

| # | Lock |
|---|------|
| 1 | **`IkEntryHost` jest consumerem `BOTH_HOLD`.** Jedyny IK runtime walk. |
| 2 | **Nie** tworzymy Composite Engine (drugiego kalkulatora pozycji). |
| 3 | **Nie** tworzymy Orchestratora-modułu / drugiego hosta. |
| 4 | **Nie** dodajemy nowej flagi `ikP*`. |
| 5 | **Nie** zmieniamy Classification V2 / A1 mapy / `flagsFor("COMPOUND")`. |
| 6 | **Nie** zmieniamy `computePositionCost()`. |
| 7 | **Nie** zmieniamy P1 (G1/G2). |
| 8 | **Nie** zmieniamy P2 KEEP GAP. |
| 9 | **D pozostaje false.** |
| 10 | **CatalogWork pozostaje 471** (zero CREATE/bind z COMPOSITE). |

**Co wolno dodać (jedyny binding):**

Jedna funkcja-adapter w `src/lib/intelligent-estimator/` (nazwa robocza PLAN: `runIkCompositeBothHold`) **wołana z `IkEntryHost`** dla linii `handoff === BOTH_HOLD`.

To **router/adapter**, nie silnik. Rollback = usunąć wywołanie z hosta.

### 4.1 Leaf, nie pętla BOQ rodzica (ARCH REVIEW C2 — FROZEN)

Adapter **NIE** woła `runIkMasterBoqLaborExpert` / `runIkMasterBoqMaterialExpert` **as-is na linii COMPOUND** (te pętle skip BOTH / nie demand-research COMPOUND).

| Expert | Leaf (istniejący, mandatory) |
|--------|------------------------------|
| Labor | `lookupWorkRate` + selective research **tylko** gdy `isLaborGapJobAllowed(componentWorkId)` ∧ MODE B Labor |
| Material | `evaluateMaterialCache` + `researchEligible` + `assertMaterialResearchAllowed` na **komponencie** `mat.*` |

Zakaz:

- mutacja Master BOQ
- syntetyczna LP persistowana
- przekazanie plane rodzica `COMPOUND` do research assertów

Komponent niesie **własną** identity. Rodzic zostaje `COMPOUND` / `BOTH_HOLD`.

### 4.2 XOR F5 (ARCH REVIEW C3 — FROZEN)

Ta sama LP **nie** dostaje dwóch sum: F5 shadow **oraz** COMPOSITE adapter.

- F5 engine **bez redesignu**.
- P7 **może** później reuse `position` z adaptera gdy BOTH_HOLD kompletne — to **binding wejścia P7**, nie nowy F5.
- IMPLEMENT: nie wołać równolegle obu sum na tej samej LP.

---

## 5. Contracts

### 5.1 Trigger

```text
isIkEntryEnabled
  ∧ isIkP5LaborE2eActive
  ∧ isIkP6MaterialE2eActive
  ∧ masterBoq.readyForExperts
  ∧ line.handoff === BOTH_HOLD
```

Linie LABOR / MATERIAL 1:1: **bez zmian** (istniejące useEffect w `IkEntryHost`).

### 5.2 Decomposition

**Input:** istniejący `OfferBoqLineLike` (description, quantity, unit, catalogWorkId, lineId/lp).

**Kolejność (frozen):**

1. `decomposeOfferBoqLine(line)` → TechUnit[]
2. Bind pack: `findActiveTechnologyPacksForWorkId(workId)` — **exact** `steps.catalogWorkId`
3. Fallback bind **tylko** gdy już dziś `analyzeTechnologyLineBindings` binduje (malowanie/ETICS). **Zero fuzzy.**
4. Brak pack / UNBOUND / AMBIGUOUS_BOM / UNKNOWN TechUnit → **GAP** · nie invent recipe

Semantyka decomp **bez potrzeby nie zmieniać** (R6 umywalka → 2 TechUnit zostaje).

### 5.3 Material contract

```text
TechnologyPack.materials[]  →  existing Material Expert (leaf)
```

| Pole | Kontrakt |
|------|----------|
| identity | `PackMaterialRecipeLine.materialKey` — legalny `mat.*` |
| label | recipe `namePl` |
| quantity | `projectBom`: `boqQty × qtyFactor` (absolutna) |
| unit | recipe `unit` — **bez remap** żeby znaleźć PM |
| provenance | `factorSourceKind` / `factorSourceRef` / `factorApprovedAt` |
| research | `researchEligible` + `assertMaterialResearchAllowed` · **nie** `mat.inv.*` |

**Jeżeli brak legalnego `materialKey`:** **GAP**.

**NIE:**

- synthetic `mat.*`
- zgadywanie / reverse lookup bez istniejącego kontraktu
- Research **tylko dlatego**, że komponent „jest MATERIAL”
- P5.13 demand (`demand.work.<workId>`) jako substytut brakującego produktu

**P2 (frozen):**

| Work ID | Wynik |
|---------|--------|
| `cc-w2-zawor-odcinajacy` | **PRODUCT_IDENTITY_GAP** · nie research · nie invent `mat.*` |
| `cc-p0c-w1-zawor-odpowietrzajacy` | **PRODUCT_IDENTITY_GAP** · j.w. |

### 5.4 Labor contract

```text
Bezpieczna identity = steps[].catalogWorkId  →  existing Labor Expert (leaf)
TechnologyPack.labour[] hoursPerUnit         ≠  wejście computePositionCost
```

`PackLabourRecipeLine` = normy godzin (TF-1: **NEVER PLN**).  
Engine wymaga **zł / jm BOQ**.

| Źródło | Werdykt |
|--------|---------|
| `steps[].catalogWorkId` | **HIT path** — `lookupWorkRate(store, workId, boqUnit, nowMs)` |
| `labour[].labourKey` | **tylko** gdy `labourKey` **≡** istniejący CatalogWork `workId` · inaczej **GAP** |
| samo `hoursPerUnit` | **GAP** |

**NIE:** guessed `workId` · guessed PLN · hours × invented stawka godz. · reverse mapping bez kontraktu.

**M steps → 1 `PositionLaborInput`:** Σ `ourRatePln` **tylko** przy **tej samej** jm BOQ. Różne jm → **GAP**.

`lookupWorkRate` wymaga `WgdomCostUnit`. Jm BOQ spoza słownika → **GAP**, nie remap.

### 5.5 P5 / P6 dependency (no new flag)

| | Labor (P5) | Material (P6) | COMPOSITE adapter |
|---|------------|---------------|-------------------|
| **A** | ON | ON | **RUN** |
| **B** | ON | OFF | **HOLD** — adapter nie startuje |
| **C** | OFF | ON | **HOLD** |
| **D** | OFF | OFF | **HOLD** (prod default) |

B/C/D = **HOLD**, nie GAP. GAP = orchestration wystartowała, składnik bez identity/ceny.

Research HTTP **osobno**, istniejące MODE B `=== true` per expert:

- Labor: `isIkP5LaborExecuteResearchActive`
- Material: `isIkP6MaterialExecuteResearchActive` (istniejąca flaga Material Research)

1:1 eksperci na innych liniach: **bez zmian** przy B/C.

### 5.6 Partial composition — HARD LOCK

| Case | Wynik |
|------|--------|
| Material HIT + Labor HIT (wszystkie **wymagane** komponenty) | **VALID COMPLETE** · `positionComplete === true` · ONE POSITION COST |
| Material HIT + Labor GAP | **GAP** · **NIE** complete total |
| Material GAP + Labor HIT | **GAP** · **NIE** complete total |
| Material GAP + Labor GAP | **GAP** |
| UNKNOWN component / no pack / UNBOUND / AMBIGUOUS_BOM | **GAP** |
| `pack.equipment[]` niepusty (v1 nie wycenia equipment) | **GAP** — unknown component ≠ 0 PLN |

**Nigdy:** missing component = **0 PLN**.

**Pułapka silnika (adapter MUST, silnik NO CHANGE):**

| Zakazane wejście gdy komponent wymagany | Dlaczego |
|-----------------------------------------|----------|
| `labor === null` | engine traktuje jako material-only → laborCost **0** |
| `materials === []` | engine traktuje jako labor-only → materialCost **0** |

Wymagane: `PositionLaborInput.status = "MISSING"` / `NO_IDENTITY` oraz analogiczne statusy materiału (`MISSING` / `NO_KEY`) → `totalPositionCostPln === null`.

### 5.7 Research

Composite **nie** posiada Research Engine.

| Komponent | Właściciel | Zakaz |
|-----------|------------|-------|
| Material | Material Expert → PM CURRENT → legal MISS → DIY | wspólny market query COMPOSITE |
| Labor | Labor Expert → OUR RATE CURRENT → MISS → selective work-rate | hours→PLN research |

```text
Research candidate  ≠  OUR RATE
Research candidate  ≠  auto Accept
Composite           ≠  auto Accept
```

Istniejące Accept: `acceptIkLaborResearchAndNotify` · `acceptIkMaterialResearchCandidate`.  
Po Owner Accept: istniejący `notifyIkPricingAccepted` → re-run adaptera na LP.

### 5.8 Position cost

Po kompletnych komponentach:

```text
Material Expert results  →  PositionMaterialInput[]   // resolveMaterialInputFromPriceMemory
Labor Expert results     →  PositionLaborInput        // resolveLaborInputFromOurWorkRate
                         →  M rates: Σ ourRatePln same unit

computePositionCost({
  quantity: boqQty,
  unit: boqUnit,
  labor,
  materials,
})
```

**`computePositionCost()` = NO CHANGE.**  
Nie składać przez `companyPricePln`. Nie F5 redesign.

### 5.9 Quantity / unit safety

```text
BOQ quantity  ×  TechnologyPack qtyFactor  =  component quantity (absolutna)
Labor cost    =  BOQ quantity × Σ ourRatePln     // istniejący engine
```

**Nie** zmieniać jednostki tylko po to, aby uzyskać cenę.

Zachować: BOQ quantity · unit · qtyFactor · component quantity · provenance.

Dotyczy m.in.: **szt.** · **kpl.** · **m** · **mb** · **m2** · **m3**.

Fold m↔mb **tylko** istniejący `mapInternalFirstUnit` / BOM `unitsCompatible`.  
Niekompatybilne jm recipe vs PM / OUR RATE → component GAP.

### 5.10 Provenance

Po composition **musi** dać się odtworzyć:

```text
BOQ line
  → decomposition (TechUnit / reason)
  → TechnologyPack (packId / packVersion)
  → component (materialKey | catalogWorkId)
  → expert (Material | Labor)
  → identity
  → Price Memory / OUR RATE / Research candidate id
  → HIT | MISS | GAP | RESEARCH_SKIPPED
  → PositionCostResult (issues[] · positionComplete · totals)
```

Reuse istniejących pól EC / report. **Nie** nowy KV. **Nie** gubić źródła przy Σ.

### 5.11 P1 / P2 invariants

**P1 (bez zmian):**

```text
cw.inv.*   →  NIE może być BOQ primary
mat.inv.*  →  NIE może wejść w DIY Research
```

Komponent `steps.catalogWorkId` będący `cw.inv.*` → **GAP** (nie primary).  
Każdy material job: `isInvoicePurchaseMaterialKey` / `assertMaterialResearchAllowed`.

**P2 (bez zmian):**

```text
cc-w2-zawor-odcinajacy           →  PRODUCT_IDENTITY_GAP
cc-p0c-w1-zawor-odpowietrzajacy  →  PRODUCT_IDENTITY_GAP
```

### 5.12 Autonomous walk (frozen)

```text
Tender
  → BOQ READY
  → Classification
  → COMPOUND
  → BOTH_HOLD
  → decomposition
  → material jobs
  → labor jobs
  → Material Expert
  → Labor Expert
  → legal Research if required (MODE B per expert)
  → expert results
  → composition
  → PositionCostInput
  → computePositionCost
  → next BOQ line
```

**Użytkownik NIE** uruchamia ekspertów ręcznie per linia.

**Warunek:** P5 **AND** P6 już aktywne (istniejące dźwignie Super Admin).  
Brak nowych flag. Prod default OFF → macierz **D** HOLD aż Owner włączy P5+P6.

---

## 6. Acceptance criteria (A1–A14)

Mierzalne. IMPLEMENT nie startuje bez pokrycia testami z §7.

| ID | Kryterium | PASS |
|----|-----------|------|
| **A1** | COMPOUND / `BOTH_HOLD` detection | Linia plane `COMPOUND` ma `handoff === BOTH_HOLD`. Adapter **widzi** tę linię w `IkEntryHost` (nie terminal-only). A1 mapa / `flagsFor` rodzica **bez zmian**. |
| **A2** | Decomposition | `decomposeOfferBoqLine` + exact pack bind. Brak pack / UNBOUND / UNKNOWN → GAP, nie invent recipe. |
| **A3** | Material handoff | `pack.materials[]` → Material Expert leaf z `materialKey` / qty / unit / provenance. Brak legalnego `mat.*` → GAP. Zero synthetic `mat.*`. |
| **A4** | Labor handoff | `steps[].catalogWorkId` → Labor Expert leaf. `hoursPerUnit` bez workId → GAP. Zero guessed workId/PLN. |
| **A5** | P5/P6 dependency | A RUN · B HOLD · C HOLD · D HOLD. Zero nowej flagi. |
| **A6** | Complete composition | Material HIT + Labor HIT (wszystkie wymagane) → `positionComplete === true` · `totalPositionCostPln !== null`. |
| **A7** | Partial GAP safety | HIT+GAP / GAP+HIT / both GAP / unknown → `totalPositionCostPln === null`. Brak `labor=null` / `materials=[]` jako sukces. Missing ≠ 0 PLN. |
| **A8** | Research ownership | Brak Composite Research Engine. Material research tylko legal `mat.*` + MODE B Material. Labor research tylko `isLaborGapJobAllowed(component)` + MODE B Labor. Candidate ≠ OUR RATE. |
| **A9** | PositionCostInput / `computePositionCost` | Wyniki ekspertów mapowane istniejącymi F1/F2 typami. Silnik **bit-identical** (no change). |
| **A10** | Autonomous expert walk | Przy P5∧P6 ON: kolejna linia BOTH_HOLD bez ręcznego startu eksperta. Przy P5 XOR P6: HOLD. |
| **A11** | Provenance | Raport odtwarza BOQ → decomp → pack → component → expert → PM/OUR RATE/Research → HIT/GAP → position cost. |
| **A12** | Unit safety | BOQ qty/unit zachowane. `qtyFactor` tylko z recipe. Brak remap jm aby znaleźć cenę (szt/kpl/m/mb/m2/m3). |
| **A13** | P1/P2 invariants | `cw.inv.*` ≠ BOQ primary. `mat.inv.*` ≠ DIY. Zawory = PRODUCT_IDENTITY_GAP. CatalogWork 471. D=false. |
| **A14** | Zero auto-Accept | COMPOSITE nie woła Accept. Candidate nie staje się OUR RATE/PM persist. |

**A-criteria count: 14.**

---

## 7. Test matrix (frozen)

Testy **projektowane tu**, **implementowane dopiero po IMPLEMENT GO**. Ten DF **nie** tworzy plików testowych.

| # | Case | Expect |
|---|------|--------|
| **T01** | pure LABOR | Istniejący Labor Expert 1:1 **UNCHANGED**. COMPOSITE adapter **nie** startuje. |
| **T02** | pure MATERIAL | Istniejący Material Expert 1:1 **UNCHANGED**. COMPOSITE adapter **nie** startuje. |
| **T03** | COMPOUND material + labor | `BOTH_HOLD` → decomp → material jobs + labor jobs (gdy P5∧P6). |
| **T04** | material HIT + labor HIT | VALID COMPLETE · `positionComplete` · total ≠ null. |
| **T05** | material HIT + labor GAP | GAP · total **null** · ≠ 0 PLN. |
| **T06** | material GAP + labor HIT | GAP · total **null** · ≠ 0 PLN. |
| **T07** | both GAP | GAP · total **null**. |
| **T08** | missing material identity | GAP · zero synthetic `mat.*` · zero DIY. |
| **T09** | missing labor workId (hours-only) | GAP · zero guessed PLN. |
| **T10** | P5 OFF (P6 ON) | COMPOSITE **HOLD**. |
| **T11** | P6 OFF (P5 ON) | COMPOSITE **HOLD**. |
| **T12** | P5 + P6 ON | COMPOSITE **RUN** na BOTH_HOLD (po IMPLEMENT). |
| **T13** | P1 invoice host regression | `cw.inv.*` ≠ BOQ primary · `mat.inv.*` ≠ DIY na komponencie. |
| **T14** | P2 KEEP GAP regression | `cc-w2-zawor-odcinajacy` + `cc-p0c-w1-zawor-odpowietrzajacy` = PRODUCT_IDENTITY_GAP. |
| **T15** | unit safety | brak remap jm aby znaleźć cenę (szt/kpl/m/mb/m2/m3). |
| **T16** | quantity multiplication | `boqQty × qtyFactor = component qty`; labor = BOQ qty × Σ ourRate. |
| **T17** | no auto-Accept | candidate pozostaje candidate; `autoAcceptExecuted === false`. |
| **T18** | CatalogWork remains 471 | count 471 · zero CREATE z COMPOSITE. |
| **T19** | D remains false | `expertAiDecydentEnabled === false` · diff 0. |
| **T20** | autonomous multi-line tender walk | N linii BOTH_HOLD przy P5∧P6 bez ręcznego startu per linia; failure jednej linii nie inventuje ceny i nie blokuje niezależnych 1:1. |

**Test matrix count: 20.**

Dodatkowo (nie osobny numer Ownera, obowiązkowe przy IMPLEMENT): regresja XOR F5 — ta sama LP nie ma dwóch sum.

---

## 8. Invariants

| ID | Invariant |
|----|-----------|
| **I1** | Parent plane `COMPOUND` → handoff `BOTH_HOLD` **bez zmian**. |
| **I2** | `flagsFor("COMPOUND")` **bez zmian** (hold, no parent research). |
| **I3** | Consumer = `IkEntryHost` + thin adapter. Zero drugiego hosta. |
| **I4** | Zero nowej flagi. Start = P5 ∧ P6. |
| **I5** | Zero nowego Composite / Research / Material / Labor engine. |
| **I6** | `computePositionCost` **UNCHANGED**. |
| **I7** | Missing / GAP / UNKNOWN component ≠ 0 PLN. |
| **I8** | `labor=null` / `materials=[]` **zakazane** jako sukces gdy komponent wymagany. |
| **I9** | Material identity = legal `mat.*` z recipe. Brak = GAP. Zero invent. |
| **I10** | Labor identity = `steps[].catalogWorkId`. Hours-only = GAP. |
| **I11** | Research per-expert. Candidate ≠ OUR RATE ≠ auto-Accept. |
| **I12** | P1 G1/G2 nienaruszone. |
| **I13** | P2 zawory = PRODUCT_IDENTITY_GAP. |
| **I14** | CatalogWork **471**. D **false**. |
| **I15** | No unit remap to find price. |
| **I16** | Provenance end-to-end zachowana. |
| **I17** | XOR F5: jedna suma na LP. |
| **I18** | Leaf na składniku, nie pętla BOQ rodzica. |
| **I19** | `pack.equipment[]` niepusty → GAP v1. |
| **I20** | Rollback = tylko unbind adaptera z `IkEntryHost`. |

---

## 9. Non-goals (OUT)

Explicitnie **poza** tym DF / IMPLEMENT:

- P2 material identity expansion
- invoice host redesign
- Classification V2 / nowa plane / zmiana A1 mapy
- new Research Engine
- new Composite Engine
- new flags (`ikP*`)
- D flip / Dual Outcome enablement
- Chief redesign
- F5 redesign / F5 engine change
- CatalogWork cleanup / CREATE
- PM redesign / PM write z COMPOSITE
- Accept redesign
- `computePositionCost` redesign
- hoursPerUnit → PLN invent
- synthetic `mat.*` / reverse lookup
- wspólny market query COMPOSITE
- auto-Accept
- global ON Przetargi / auto-włączanie P5/P6
- mutacja Master BOQ / syntetyczne LP

---

## 10. Rollback

```text
revert composite consumer binding
  = usunąć wywołanie adaptera z IkEntryHost
```

Przywraca terminal `BOTH_HOLD` (stan prod przed IMPLEMENT).

**Bez:**

- rollback P1
- rollback P2
- rollback PM
- rollback CatalogWork
- rollback D
- rollback Classification Gate
- rollback F5 / ekspertów 1:1
- migracji KV (COMPOSITE nie dodaje KV)

---

## 11. Implementation sequence

**Dopiero po osobnym IMPLEMENT GO.** Ten DF **nie** jest IMPLEMENT GO.

Owner GO GATE 0 (**consumer**) = **DONE** (ten dokument).

| Krok | Binding | Nie |
|------|---------|-----|
| 0 | Ten DF + Owner GO konsumenta | IMPLEMENT bez IMPLEMENT GO |
| 1 | Adapter + call z `IkEntryHost` na BOTH_HOLD gdy P5∧P6 | nowa flaga · drugi host |
| 2 | decomp + exact pack bind · no pack → GAP | invent pack / fuzzy |
| 3 | material jobs → existing material **leaf** | nowy expert · demand bez `mat.*` · invent `mat.*` |
| 4 | labor jobs → existing labor **leaf** (`catalogWorkId`) | hours→PLN · guessed workId |
| 5 | map F1/F2 → `PositionCostInput` → `computePositionCost` | zmiana engine · `labor=null` sukces |
| 6 | EC provenance · P7 optional reuse **XOR** F5 sum | F5 rewrite · double count |
| 7 | Testy T01–T20 + A1–A14 | testy w tym DF · Research HTTP poza MODE B |

Każdy krok: GAP≠0 · P1/P2 · D=0 · CatalogWork 471.

---

## 12. Conflict check

| SSOT | Relacja |
|------|---------|
| Classification Gate DF | Rodzic HOLD **UNCHANGED**. Konsument BOTH_HOLD **AUTHORIZED** tym Owner GO. |
| P1 Invoice Host DF | G1/G2 reuse · no redesign. |
| P2 KEEP GAP | Zawory GAP · no invent. |
| ARCH REVIEW C1–C8 | Absorbed: GO · leaf · XOR F5 · P5∧P6 · identity · engine trap · Accept/P1/D/471. |

**Conflict check (DF ↔ RCA ↔ Owner GO ↔ ARCH REVIEW): NONE** po udzieleniu GATE 0.

---

## STOP

```text
DESIGN FREEZE = READY

IMPLEMENT         = WAITING OWNER GO
ZERO CODE · ZERO PATCH
ZERO TEST IMPLEMENTATION
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY

Czekaj na osobne IMPLEMENT GO.
```
