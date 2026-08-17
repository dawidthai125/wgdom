# ARCH REVIEW — IK Composite Position Orchestration

| Field | Value |
|-------|-------|
| **Status** | **ARCH REVIEW COMPLETE** · **NO DF** · **NO IMPLEMENT** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · ZERO code / tests / flags / commit / push / deploy |
| **Production** | **2.66.88** / **`482c618f`** |
| **PLAN** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-PLAN.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-PLAN.md) |
| **RCA** | [`IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md`](./IK-COMPOSITE-POSITION-ORCHESTRATION-RCA.md) · verdict **B** |
| **D** | **false** (no flip) |
| **CatalogWork** | **471** (no write) |
| **P1** | COMPLETE / CLOSED — `cw.inv.*` ≠ BOQ primary · `mat.inv.*` ≠ DIY |
| **P2** | Owner **KEEP GAP** — `cc-w2-zawor-odcinajacy` · `cc-p0c-w1-zawor-odpowietrzajacy` |

```text
ARCH REVIEW = PASS WITH CONDITIONS

DESIGN FREEZE = NOT AUTHORIZED
  (Owner GO GATE 0 + warunki §17 — zanim wolno pisać DF)

IMPLEMENT   = NO
COMMIT/PUSH/DEPLOY = NO
```

PLAN **nie** wymaga nowego silnika, nowej flagi, Classification V2 rodzica, ani zmian P1/P2/D/PM/CatalogWork.  
PLAN **wymaga** Owner GO na zmianę semantyki **konsumenta** `BOTH_HOLD` (dziś terminal HOLD). Bez tego DF tego epiku jest zakazany.

---

## A. Scope

| In | Out |
|----|-----|
| Czy PLAN może iść do DESIGN FREEZE | Pisanie DF |
| Czy reuse istniejących kontraktów jest wystarczający | Kod / patch / testy |
| Checki 1–16 z briefu Ownera | Nowy orchestrator-moduł |
| Warunki konieczne **przed** DF | IMPLEMENT / commit / push / deploy |

**Nie** projektowano nowego engine. **Nie** dodawano flag.

---

## B. Verdict (architecture)

| Criterion | Status |
|-----------|--------|
| NEW ENGINE | **NO** — thin adapter wołany z `IkEntryHost` |
| NEW FLAG | **NO** — start = istniejące `isIkP5LaborE2eActive` ∧ `isIkP6MaterialE2eActive` |
| NEW CatalogWork model | **NO** |
| NEW Material / Labor Expert | **NO** — leaf reuse |
| NEW Research engine | **NO** — research zostaje u eksperta |
| `computePositionCost` unchanged | **PASS** |
| `IkEntryHost` jako consumer | **PASS** (istniejący punkt integracji) |
| Parent A1 `COMPOUND` / `flagsFor(COMPOUND)` unchanged | **PASS** w PLAN |
| Konflikt SSOT Classification Gate DF (parent HOLD / no research) | **CONDITION** — Owner GO GATE 0, nie redesign A1 |
| Partial HIT+GAP ≠ 0 PLN | **PASS** w PLAN · **CONDITION** na `labor=null` / `materials=[]` |
| P1 / P2 / D / 471 | **PASS** |

**Overall:** PLAN jest architektonicznie spójny z RCA **B** (klocki są; brakuje bindingu).  
**Nie** jest BLOCKED jako „nowy silnik”.  
**Nie** jest PASS bezwarunkowy, bo istniejący Classification Gate DF trzyma `BOTH_HOLD` jako terminal HOLD.

---

## 1. BOTH_HOLD consumer

**Producer (istniejący, GREEN):**

`classifyEstimatorPricingPlane` → plane `COMPOUND`  
→ `handoffFromPlane` → **`BOTH_HOLD`**  
(`ik-classification.ts`)

**Gate rodzica (istniejący, zamierzony HOLD):**

`flagsFor("COMPOUND")` — wszystkie `allow*` = false, `hold=true`  
(`classification-gate.ts`)

**Dziś brak konsumenta jobów** (RCA first seam):

`IkEntryHost` woła:

- `runIkMasterBoqLaborExpert` — lookup **tylko** gdy `bucket === "LABOR"`; COMPOUND → bucket **`BOTH`** → **skip**
- `runIkMasterBoqMaterialExpert` — P5.13 demand **tylko** `plane === "MATERIAL"`; parent COMPOUND **nie** wchodzi w demand research
- P7 `runIkP7PositionCostBid` — F5 shadow, **nie** z handoffu `BOTH_HOLD`

**Istniejący punkt integracji (PLAN — APPROVED):**

```text
IkEntryHost
  (po classification, gdy masterBoq.readyForExperts
   ∧ line.handoff === BOTH_HOLD
   ∧ P5∧P6 ON)
    → thin adapter w src/lib/intelligent-estimator/
      (PLAN: runIkCompositeBothHold — nazwa robocza)
```

**Nie** proponuje się drugiego hosta / orchestrator-modułu.  
`IkEntryHost` **jest** właściwym consumerem.

**KRYTYCZNE (warunek DF, nie nowy engine):**  
Adapter **nie** może wołać `runIkMasterBoqLaborExpert` / `runIkMasterBoqMaterialExpert` **as-is na linii rodzica**. Te pętle BOQ **pomijają** COMPOUND/BOTH.  
Consumer = **host** (`IkEntryHost`) + **route składników** do **istniejących leaf**:

| Expert | Leaf (istniejący) |
|--------|-------------------|
| Labor | `lookupWorkRate` (`work-rate-lookup.ts`) + istniejący selective research **gdy** `isLaborGapJobAllowed(componentWorkId)` |
| Material | `evaluateMaterialCache` + `researchEligible` + `assertMaterialResearchAllowed` na **komponencie** `mat.*` |

Komponent niesie **własną** plane LABOR/MATERIAL (identity składnika).  
Rodzic **zostaje** `COMPOUND` / `BOTH_HOLD` w A1. **Zero** Classification V2.

---

## 2. Material handoff

**Źródło (istniejące):** `TechnologyPack.materials[]` = `PackMaterialRecipeLine`

| Pole briefu | Kontrakt w kodzie | PLAN |
|-------------|-------------------|------|
| `materialKey` | `PackMaterialRecipeLine.materialKey` | reuse · brak / nie `mat.*` → **GAP** |
| `labelPl` | `namePl` (brak pola `labelPl`) | map `namePl` → label eksperta |
| `quantity` | `projectBom`: `boqQty × qtyFactor` | reuse F3 |
| `unit` | recipe `unit` (może ≠ jm BOQ, np. `l` vs `m2`) | **bez remap** żeby znaleźć PM |
| provenance | `RecipeFactorProvenance` (`factorSourceKind` / `factorSourceRef` / `factorApprovedAt`) | zachować w raporcie |
| research eligibility | `researchEligible` + `assertMaterialResearchAllowed` · **nie** `mat.inv.*` (P1 G2) · P5.9 | GAP, nie invent |

**Identity:** tylko istniejący `mat.*` z recipe.  
**Brak identity = GAP.** Zero invented `mat.*`.

**P5.13 demand** (`demand.work.<workId>`, plane MATERIAL, bez `mat.*`) **nie** jest legalnym handoffem COMPOSITE na składnik bez produktu. PLAN to honoruje (brak key → GAP, nie demand invent).

---

## 3. Labor handoff

**KRYTYCZNE — potwierdzone:**

`PackLabourRecipeLine` = `labourKey` + `namePl` + **`hoursPerUnit`**.  
Komentarz SSOT: **„Labour norms only — NEVER PLN rates (TF-1).”**

`computePositionCost` wymaga **`ourRatePln` zł / jm BOQ**, nie godzin.

| Źródło | Bezpieczny `workId`? | Werdykt |
|--------|----------------------|---------|
| `steps[].catalogWorkId` | **TAK** — jawny CatalogWork id | Labor Expert leaf `lookupWorkRate` |
| `labour[].labourKey` | **NIE z góry** — to klucz recipe, nie gwarantowany `workId` | **tylko** gdy `labourKey` **≡** istniejący CatalogWork `workId` · inaczej **GAP** |
| samo `hoursPerUnit` | **NIE** | **GAP** |

**Zakazane (PLAN = ARCH):** reverse lookup · guessed `workId` · hours × invented stawka godz. · guessed PLN.

**M steps, 1 `PositionLaborInput`:** Σ `ourRatePln` **tylko** przy **tej samej** jm BOQ. Różne jm → **GAP**, nie remap.

Labor Expert BOQ-loop (`bucket === "LABOR"`) **nie** jest consumerem COMPOSITE. Handoff = leaf na `catalogWorkId` składnika.

---

## 4. P5 / P6 dependency (bez nowej flagi)

Start COMPOSITE **tylko** gdy istniejące capability są ON:

```text
isIkEntryEnabled
  ∧ isIkP5LaborE2eActive      // IK ∧ Labor E2E
  ∧ isIkP6MaterialE2eActive   // IK ∧ Material E2E
  ∧ masterBoq.readyForExperts
  ∧ handoff === BOTH_HOLD
```

Research HTTP **osobno**, istniejące MODE B:

- Labor: `isIkP5LaborExecuteResearchActive` (`=== true`)
- Material: analogiczna flaga Material Research (`=== true`)

| | Labor | Material | COMPOSITE orchestration | 1:1 eksperci (inne linie) |
|---|-------|----------|-------------------------|---------------------------|
| **A** | ON | ON | **RUN** (po Owner GO GATE 0) | bez zmian |
| **B** | ON | OFF | **HOLD** — adapter **nie startuje** | Labor 1:1 działa |
| **C** | OFF | ON | **HOLD** — adapter **nie startuje** | Material 1:1 działa |
| **D** | OFF | OFF | **HOLD** — stan prod | HOLD / off |

**B/C/D = HOLD, nie GAP.** GAP = orchestration **wystartowała**, a składnik nie ma identity/ceny.  
Brak dźwigni = **nie wchodzić** w decomp/experts na `BOTH_HOLD`.

**Nie** tworzyć `ikP*` flagi COMPOSITE.

---

## 5. Research

**PASS.** Research zostaje własnością eksperta.

| Komponent | Ścieżka | Zakaz |
|-----------|---------|-------|
| Material | Material Expert → PM CURRENT → legal MISS → DIY (`assertMaterialResearchAllowed` na `mat.*`) | wspólny market query COMPOSITE |
| Labor | Labor Expert → OUR RATE CURRENT → MISS → selective work-rate (`isLaborGapJobAllowed` na **component** `workId`) | Composite Research Engine |

Parent `COMPOUND` **nie** jest argumentem `assertMaterialResearchAllowed` / `isLaborGapJobAllowed`.  
To **routing komponentu**, nie zmiana `flagsFor("COMPOUND")`.

Candidate ≠ persist OUR RATE / PM. **Zero auto-Accept.**

---

## 6. Partial composition — BLOCKER CHECK

Engine (`computePositionCost`) **już** daje `totalPositionCostPln = null` gdy `positionComplete === false`.

**Pułapka silnika (nie zmieniać silnika — wiązać adapter):**

| Wejście | Zachowanie engine | COMPOSITE |
|---------|-------------------|-----------|
| `labor === null` | laborCost **= 0**, laborComputable **true** (material-only) | **ZAKAZ** gdy decomp wymaga labor |
| `materials === []` | materialCost **= 0**, materialsComputable **true** (labor-only) | **ZAKAZ** gdy pack ma `materials[]` |
| `status: MISSING` na labor/material | total **null** | **WYMAGANE** przy MISS/GAP |

| Case | Valid total? |
|------|----------------|
| Material HIT + Labor HIT (wszystkie **wymagane** komponenty) | **TAK** — `positionComplete` |
| Material HIT + Labor GAP | **NIE** |
| Material GAP + Labor HIT | **NIE** |
| Material GAP + Labor GAP | **NIE** |
| Unknown TechUnit / no pack / AMBIGUOUS_BOM | **NIE** |
| `pack.equipment[]` niepusty (nie w PLAN v1) | **NIE** — unknown component ≠ 0 PLN |

Brakujący komponent **nie** jest 0 PLN.

---

## 7. `computePositionCost()`

**PASS — silnik bez zmian.**

Istniejące wejście:

```text
PositionCostInput {
  quantity,          // jm BOQ
  unit,              // jm BOQ
  labor: PositionLaborInput | null,
  materials: PositionMaterialInput[],
}
```

**Adapter (istniejące typy, nie nowy kalkulator):**

| Wynik eksperta | Istniejący mapper |
|----------------|-------------------|
| OUR RATE CURRENT | `resolveLaborInputFromOurWorkRate` → `PositionLaborInput` |
| PM CURRENT | `resolveMaterialInputFromPriceMemory` → `PositionMaterialInput` |
| MISS/GAP | `status: MISSING` / `NO_KEY` / `NO_IDENTITY` — **nie** `labor=null` gdy labor wymagany |

F5 `computeShadowPositionCostForOfferBoqLine` **nie** jest silnikiem COMPOSITE IK i **nie** jest przepisywany.  
Reuse **kształtu** F1/F2, nie równoległej sumy na tej samej LP.

---

## 8. Quantity / unit safety

**PASS** przy reuse `projectBom`:

```text
BOQ qty × TechnologyPack qtyFactor = component qty (absolutna)
Labor: BOQ qty × Σ ourRatePln   // zł/jm BOQ, istniejący engine
```

| jm BOQ | Kontrakt |
|--------|----------|
| szt. / kpl. | qty × factor |
| m / mb | fold **tylko** istniejący `mapInternalFirstUnit` / `unitsCompatible` |
| m2 / m3 | jak recipe (np. farba `l` vs ściana `m2`) |

**NO UNIT REMAPPING TO FIND PRICE.**  
Niekompatybilne jm recipe vs PM / OUR RATE → component GAP (`UNIT_CONVERSION_GAP` / MISS), nie inna jm „żeby trafić cenę”.

`lookupWorkRate(store, workId, unit, nowMs)` wymaga `WgdomCostUnit`. Jm BOQ spoza słownika → **GAP**, nie remap.

---

## 9. Provenance

PLAN §12 jest **wystarczający jako kontrakt DF**, pod warunkiem **reuse istniejących pól EC / report** (nie nowy KV, nie nowy silnik evidence).

Musi dać się odtworzyć:

| Warstwa | Źródło (istniejące) |
|---------|---------------------|
| BOQ line | `lineId` / LP / description / qty / unit / tenderId |
| TechnologyPack | `packId` / `packVersion` / lifecycle |
| Material component | `materialKey` / `namePl` / qty / unit / `factorSource*` |
| Labor component | `steps[].catalogWorkId` / `namePl` / qty / unit |
| Material Expert | PM hit/miss · researchKey · candidate id · **nie** accept |
| Labor Expert | rateStatus · ourRate · researchKey · **nie** accept |
| GAP | per-component code + `positionComplete=false` |
| Engine | `PositionCostResult.issues[]` |

Σ **nie** może zgubić źródła składnika.

---

## 10. Owner Accept

**PASS.**

Research candidate **≠** OUR RATE.  
Research candidate **≠** automatic Accept.

Istniejące: `acceptIkLaborResearchAndNotify` · `acceptIkMaterialResearchCandidate`.  
COMPOSITE **nie** woła Accept. Po Owner Accept: istniejący `notifyIkPricingAccepted` → re-run adaptera na LP.

---

## 11. P1 safety

**PASS** — binding nie omija G1/G2.

| Guard | COMPOSITE |
|-------|-----------|
| `cw.inv.*` nigdy BOQ primary | mapper BOQ **bez zmian**; `steps.catalogWorkId` będący `cw.inv.*` → **GAP**, nie primary |
| `mat.inv.*` nigdy DIY | `researchEligible` + `assertMaterialResearchAllowed` na każdym material job |
| CatalogWork = 471 | zero CREATE / bind catalog z COMPOSITE |
| D = false | zero flip |

---

## 12. P2 safety

**PASS.**

| Work ID | Status Owner | COMPOSITE |
|---------|--------------|-----------|
| `cc-w2-zawor-odcinajacy` | **PRODUCT_IDENTITY_GAP** · KEEP GAP | **nie** research · **nie** invent `mat.*` |
| `cc-p0c-w1-zawor-odpowietrzajacy` | **PRODUCT_IDENTITY_GAP** · KEEP GAP | j.w. |

Composite **nie** jest obejściem P2. Składnik z tym `workId` / bez `mat.*` = GAP.

---

## 13. Autonomous walk

Docelowy runtime (PLAN §14) **jest** zgodny z istniejącymi klockami:

```text
Tender → BOQ ready → Classification → COMPOUND → BOTH_HOLD
  → decomposeOfferBoqLine → TechnologyPack bind (exact workId)
  → Material jobs → Labor jobs → existing experts
  → legal Research (tylko MODE B per expert)
  → map PositionCostInput → computePositionCost
  → next BOQ line
```

**Czy użytkownik musi ręcznie odpalać Material Expert / Labor Expert per linia?**

**NIE** — pod warunkiem, że **istniejące** dźwignie Super Admin P5∧P6 są już ON (oraz GATE 0).  
Adapter w `IkEntryHost` idzie sam po `BOTH_HOLD`, tak jak dziś 1:1 eksperci idą sami po LABOR/MATERIAL.

**NIE** oznacza to globalnego ON bez dźwigni. Ściana dźwigni zostaje. **Brak nowej flagi.**  
Na prod dźwignie default **OFF** → COMPOSITE **HOLD** (macierz D) aż Owner włączy istniejące P5+P6.

---

## 14. Failure isolation

**PASS** w PLAN §15.

| Failure | Skutek |
|---------|--------|
| 1 component GAP/MISS | linia BLOCKED · total **null** · **nie** invented price · next LP |
| throw eksperta | linia GAP · nie 0 |
| Research cooldown / budget | RESEARCH_SKIPPED / HOLD · nie 0 · nie auto-Accept |
| inne linie BOQ | niezależne (1:1 LABOR/MATERIAL bez zmian) |
| provenance GAP | zachowana per-component |

---

## 15. Blast radius

| Obszar | Wpływ |
|--------|--------|
| P1 invoice host collision | **brak** — G1/G2 reuse |
| P2 KEEP GAP | **brak** — GAP, nie invent |
| Price Memory | **brak zapisu** z COMPOSITE; odczyt CURRENT jak Material Expert |
| CatalogWork 471 | **brak zapisu** |
| Payroll | **brak** |
| Chief / D | **brak** · D=false |
| F5 engine | **brak redesign** · **CONDITION:** XOR sumy z adapterem na tej samej LP |
| Accept | **brak** auto |
| Labor / Material Expert 1:1 | **brak zmiany** pętli BOQ |
| Research contracts | **brak** nowego engine |
| A1 mapa / `flagsFor(COMPOUND)` | **brak zmiany kodu gate** |

Rollback PLAN: usunąć wywołanie adaptera z `IkEntryHost` → z powrotem terminal `BOTH_HOLD`.

---

## 16. No new engine

| Wymaganie | PLAN | ARCH |
|-----------|------|------|
| NEW ENGINE | NO | **PASS** — router/adapter, nie drugi `computePositionCost` |
| NEW FLAG | NO | **PASS** |
| NEW CatalogWork model | NO | **PASS** |
| NEW Material Expert | NO | **PASS** |
| NEW Labor Expert | NO | **PASS** |
| NEW Research engine | NO | **PASS** |

Gdyby DF próbował: zmienić `flagsFor("COMPOUND")` na allow research rodzica · dodać `ikP9Composite` · hours→PLN · invent `mat.*` · nowy orchestrator-moduł poza `IkEntryHost` → **STOP / eskalacja ChatGPT**. PLAN tego **nie** wymaga.

---

## 17. Architecture verdict

```text
ARCH REVIEW = PASS WITH CONDITIONS
```

**DESIGN FREEZE = NOT AUTHORIZED** dopóki poniższe warunki nie są spełnione (w tym Owner GO).  
Ten dokument **nie** jest Design Freeze.

### Warunki konieczne przed DESIGN FREEZE

Wyłącznie to, bez czego DF byłby sprzeczny z SSOT lub z briefem:

1. **Owner GO GATE 0** — jawne: konsument `BOTH_HOLD` **wolno** orkiestrować istniejące eksperty na **składnikach**; rodzic zostaje plane `COMPOUND` / `flagsFor(COMPOUND)` **bez zmian**. To **nadpisuje semantykę konsumenta**, nie mapę A1. Bez GO: konflikt z Classification Gate DF § B.1 / H („COMPOUND = HOLD — no auto labor/material research” **na linii rodzica**).

2. **Leaf, nie pętla BOQ rodzica** — DF musi zamrozić: adapter woła `lookupWorkRate` / `evaluateMaterialCache` / `researchEligible` / `assertMaterialResearchAllowed` / `isLaborGapJobAllowed` na **identity składnika**. Zakaz: `runIkMasterBoq*` as-is na COMPOUND; zakaz mutacji Master BOQ; zakaz syntetycznych linii BOQ persistowanych jako nowa LP.

3. **XOR F5 vs adapter** — ta sama LP **nie** dostaje dwóch sum (F5 shadow + COMPOSITE). P7 może później **reuse** `position` z adaptera — to binding wejścia P7, nie redesign F5. DF musi to zamrozić.

4. **Macierz P5/P6** — A **RUN** · B/C/D **HOLD**. Zero nowej flagi.

5. **Labor identity** — tylko `steps[].catalogWorkId` (oraz `labourKey` **wyłącznie** gdy ≡ istniejący CatalogWork `workId`). `hoursPerUnit` bez workId = **GAP**.

6. **Material identity** — tylko recipe `mat.*` (nie `mat.inv.*`). Brak key = **GAP**. P2 zawory = **PRODUCT_IDENTITY_GAP**. Zero invent `mat.*`.

7. **`computePositionCost` UNCHANGED** — adapter **nigdy** nie podaje `labor=null` ani `materials=[]` jako sukces, gdy te komponenty są wymagane. Partial → `MISSING` / nie wołać silnika jako complete. `pack.equipment[]` / UNBOUND / no pack = **NOT valid total**.

8. **Accept / Research / P1 / D / 471** — candidate ≠ OUR RATE ≠ auto-Accept; research per-expert; G1/G2; D=false; CatalogWork bez zapisu.

Po spełnieniu (zwłaszcza **1**): wolno pisać DF. **Nie teraz.**

---

## 18. Konflikt SSOT (dlaczego nie BLOCKED / nie PASS)

**Nie BLOCKED:** PLAN nie każe budować nowego engine, nie każe flipować D, nie każe omijać P1/P2, nie każe zmieniać `computePositionCost`. RCA **B** jest honorowane.

**Nie PASS:** istniejący SSOT [`INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md`](./INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md) trzyma COMPOUND jako **terminal HOLD**. PLAN zmienia **konsumenta** `BOTH_HOLD`. To jest decyzja Ownera (GATE 0), nie błąd architektury PLAN.

Dokładny konflikt **bez** Owner GO:

```text
Classification Gate DF:
  COMPOUND → HOLD · no auto labor/material research (linia rodzica)

PLAN consumer:
  BOTH_HOLD → decomp → expert jobs na składnikach (+ legal Research MODE B)
```

Rozwiązanie PLAN (akceptowalne **po** GO): rodzic A1 bez zmian; research tylko gdy składnik sam klasyfikuje się jako LABOR/MATERIAL z legalną identity.

---

## STOP

```text
ARCH REVIEW COMPLETE
DESIGN FREEZE     = NOT WRITTEN · NOT AUTHORIZED
ZERO CODE · ZERO PATCH · ZERO IMPLEMENTATION
ZERO TEST CHANGES · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY

Czekaj na ChatGPT / Owner GO (GATE 0).
```
