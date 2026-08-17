# IK — Composite Position Orchestration RCA

| Field | Value |
|-------|-------|
| **Status** | **RCA COMPLETE** · **NO IMPLEMENT** · **NO PLAN** · **NO DF** |
| **Date** | 2026-08-17 |
| **Mode** | AUDIT + RCA ONLY |
| **Production** | **2.66.88** / **`482c618f`** |
| **P1** | COMPLETE / CLOSED |
| **P2** | KEEP GAP · BLOCKED |
| **D** | **false** |
| **CatalogWork** | **471** |
| **Prior** | [`IK-COMPOSITE-POSITION-PACKAGE-AUTONOMY-AUDIT.md`](./IK-COMPOSITE-POSITION-PACKAGE-AUTONOMY-AUDIT.md) |

```text
GDZIE JEST KONTRAKT „TA LINIA JEST COMPOSITE”
          + „Z TEJ LINII N SKŁADNIKÓW MATERIAL + M LABOR”?

NAJBLIŻSZA ISTNIEJĄCA ODPOWIEDZIALNOŚĆ (dwa różne moduły):
  1. Recognition  = A1 COMPOUND → handoff BOTH_HOLD
                    (ik-classification.ts · classification-gate.ts)
  2. N składników = decomposeOfferBoqLine → TechUnit[]
                    (technology-decomposition.ts)  — ZERO cen

PIERWSZY BREAK:
  BOTH_HOLD nie ma konsumenta, który tworzy joby
  Material Expert + Labor Expert.

NIE jest to brak computePositionCost.
NIE jest to brak ekspertów 1:1.
```

---

## 1. Executive Summary

IK **nie** ma autonomicznego flow COMPOSITE. Klocki **są**. **Spięcie** ich na jednej linii „montaż / wymiana / przyłącze / instalacja” **nie** istnieje jako jeden kontrakt.

| Pytanie | RCA |
|---------|-----|
| Gdzie „linia = COMPOSITE”? | Najbliżej: plane **`COMPOUND`** + handoff **`BOTH_HOLD`**. Owner DF: to **HOLD**, nie dekompozycja. |
| Gdzie „N material + M labor”? | Najbliżej: **`decomposeOfferBoqLine`** (role MATERIAL_SUPPLY / INSTALLATION) **albo** `TechnologyPack.materials[]` + `labour[]`. Żaden nie woła IK ekspertów. |
| Czy F5+`computePositionCost` to composite engine? | **Nie.** To agregacja **jednej** OUR RATE (zł/jm BOQ) + BOM materials. |
| Czy `LABOR_MATERIAL_PACKAGE` to composite? | **Nie.** To domain **reuse jednej stawki** (PACKAGE≠MATERIAL≠LABOR). |

**RCA verdict: B** — architecture sufficient; **multiple bindings missing**. Nie E (silniki są). Nie A (nie jeden seam).

---

## 2. Owner Requirement

Jedna linia BOQ = kompletne wykonanie → **MATERIAL + LABOR = ONE POSITION COST**.

PACKAGE **nie** zastępuje ekspertów. Ma ich karmić.

Obowiązujący Owner (Classification Gate DF + Labor-Material Flow closeout):

- `montaż …` = **LABOR** (czynność 1:1)
- produkt (gniazdo, umywalka, zawór, oprawa) = **MATERIAL**
- **COMPOUND** = kilka operacji **bez bezpiecznej 1:1** → **nie mapować / nie split price** → **HOLD**

Realne przetargi łamią 1:1 („wymiana umywalki z baterią”). DF **świadomie** trzyma te linie na HOLD albo wrzuca je w UNKNOWN (brak seed), zamiast tworzyć składniki.

---

## 3. Current Production Flow

```text
Tender BOQ
  → mapOfferBoqLineCore                         GREEN   P1 exclude cw.inv.*
  → classifyEstimatorPricingPlane               GREEN   A1 Owner seed / mat.* / UNKNOWN
  → handoffFromPlane                            GREEN   LABOR_READY | MATERIAL_READY | BOTH_HOLD | UNRESOLVED
  → identity (workId / mat.*)                   GREEN   mapper + P5.9
  → Expert routing
        LABOR   → runIkMasterBoqLaborExpert     GREEN   gdy lever; bucket===LABOR
        MATERIAL→ runIkMasterBoqMaterialExpert  GREEN   gdy lever; plane MATERIAL
        COMPOUND→ BOTH_HOLD                     RED     brak konsumenta jobów
        UNKNOWN → UNRESOLVED                    RED     HOLD
  → TechnologyPack (Execution Expert bind)      YELLOW  nie z IK; exact workId
  → F5 computeShadowPositionCostForOfferBoqLine YELLOW  nie z IK; F1+F2+F3
  → computePositionCost                         GREEN   koniec ceny
```

**GRAY:** Dual Outcome D, Bid SUM, PDF, P2 zawór identity.

**PIERWSZY rzeczywisty break (ścieżka IK):**  
po `handoffFromPlane("COMPOUND") → BOTH_HOLD` **nikt nie tworzy N+M wejść ekspertów**.  
Następne kroki (Pack, F5) **nie są wywoływane z tego handoffu**.

To nie jest zepsuty `computePositionCost`. To **martwy handoff**.

---

## 4. COMPOUND HOLD RCA

**Dlaczego HOLD?** Kombinacja — **dominuje safety DF**, nie brak agregatora.

| Hipoteza | Werdykt | Evidence |
|----------|---------|----------|
| Brak safe 1:1 decomposition | **TAK — powód Owner** | DF: „Kilka operacji / dual / MATERIALS_REQUIRED bez bezpiecznej 1:1” · closeout: „nie split price” |
| Brak quantity model | **NIE jako przyczyna HOLD** | `qtyFactor` istnieje w pack; decomp kopiuje qty |
| Brak component identity | **WSPÓŁCZYNNIK** | Wave1 folia PENDING_OWNER_NORM; brak `mat.*` na składnikach montażu |
| Brak owner classification | **CZĘŚCIOWO** | 5 COMPOUND ID w mapie; montaż-grzejnika **poza** 89 → UNKNOWN HOLD |
| Brak package contract | **NIE** | `LABOR_MATERIAL_PACKAGE` + BOTH_HOLD **istnieją**, inna semantyka |
| Brak expert handoff | **SKUTEK HOLD** | `flagsFor(COMPOUND)` all allow* = false |
| Brak pricing aggregation | **NIE** | `computePositionCost` GREEN |
| Safety decision | **TAK** | no auto research na dual |
| Wcześniejszy DF | **TAK** | `INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md` § B.1 · kod `classification-gate.ts` 50–57 |

Kod:

```50:57:src/lib/intelligent-estimator/classification-gate.ts
    case "COMPOUND":
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: true,
        holdKind: "COMPOUND",
      };
```

```87:98:src/lib/intelligent-estimator/ik-classification.ts
function handoffFromPlane(plane: EstimatorPricingPlane): IkClassificationHandoff {
  switch (plane) {
    case "LABOR":
      return "LABOR_READY_FOR_EXPERT";
    case "MATERIAL":
      return "MATERIAL_READY_FOR_EXPERT";
    case "COMPOUND":
      return "BOTH_HOLD";
```

Komentarz w tym samym pliku: `COMPOUND ≡ BOTH (gate HOLD — no research)`.

**Nie poprawiać w tym RCA.** HOLD jest **zamierzony**, dopóki Owner nie odwoła „nie split”.

---

## 5. LABOR_MATERIAL_PACKAGE RCA

**Odpowiedź: B + C (dwa kontrakty), nie A.**

| Litera | Mechanizm | Werdykt |
|--------|-----------|---------|
| A pełny composite engine | — | **NIE** |
| B reuse OUR RATE | `internal-first-domain.ts` PACKAGE↔PACKAGE only | **TAK** — P5.25 REJECT PACKAGE→MATERIAL / PACKAGE→LABOR |
| C shadow composition | F5 `computeShadowPositionCostForOfferBoqLine` | **TAK** — inny moduł, nie domain PACKAGE |
| D częściowy BOM | F5 woła `resolveTechnologyBomForWork` | **TAK** dla workId z ACTIVE pack |
| E inny | `classifyCatalogWorkDomain` z `costSplit` ≥0.25/0.25 | etykieta katalogu, nie BOQ composite |

Call graph PACKAGE domain:

```text
CatalogWork.costSplit
  → classifyCatalogWorkDomain → LABOR_MATERIAL_PACKAGE
  → lookupInternalFirst (tylko gdy Labor Expert bucket===LABOR)
  → domainsCompatibleForFinalPriceReuse
```

Call graph F5 (nie używa enum PACKAGE):

```text
OfferBoqLine.workId
  → resolveLaborInputFromOurWorkRate     // 1× zł/jm BOQ
  → resolveTechnologyBomForWork          // materials qtyFactor
  → resolveMaterialInputFromPriceMemory
  → computePositionCost
```

Host `cc-p0c-w1-montaz-grzejnika-szt` (97.3) = **B**, nie 1850+350.

---

## 6. TechnologyPack RCA

Czy pack **może** reprezentować PACKAGE → material + labor components?

| Składnik | Kontrakt | Konsumowany przez F5? | Konsumowany przez IK Expert? |
|----------|----------|----------------------|------------------------------|
| `materials[]` | `materialKey`, `qtyFactor`, `unit` (TF-1 **bez PLN**) | **TAK** → PM SELL | **NIE** |
| `labour[]` | `labourKey`, `hoursPerUnit` | **NIE** (engine chce zł/jm, nie h) | **NIE** |
| `steps[].catalogWorkId` | bind exact | **TAK** (który pack) | **NIE** |

**TAK (częściowo):** materiały + norma ilości vs qty BOQ.  
**NIE (dla IK):** godziny labor nie są stawką OUR RATE; brak mostu do ekspertów.

Dlaczego IK nie konsumuje packa: `IkEntryHost` woła Document / Classification / Labor / Material / P7 — **nie** `analyzeTechnologyLineBindings` / `resolveTechnologyBomForWork` jako COMPOSITE. P7 F5 to **osobny lever**, RESEARCH=0, nie dual-expert.

Minimalny brakujący kontrakt (nie implementować): **mapowanie `PackMaterialRecipeLine` → wejście Material Expert** oraz **`PackLabourRecipeLine` LUB CatalogWork OUR RATE → wejście Labor Expert**. Dziś F2/F1 robią analog po stronie F5, **omijając** IK.

---

## 7. Material Expert RCA

Wejście: **linia Master BOQ** (`runIkMasterBoqMaterialExpert`).

| Pole | Komponent z PACKAGE? |
|------|----------------------|
| identity | wymaga `mat.*` albo P5.13 **plane MATERIAL** + workId |
| quantity / unit | z linii BOQ, nie z `qtyFactor` packa |
| rate | PM na linii, nie na `materialSpecs[]` |
| research | nie dla COMPOUND; nie `mat.inv.*` |
| provenance | linia + candidate |
| gap | PRODUCT_IDENTITY_GAP / MISS |

**Czy potrafi przyjąć komponent wygenerowany z jednej linii PACKAGE?**  
**Nie jako API.** F2 `resolveMaterialInputFromPriceMemory(spec)` **tak** — to **nie** jest Material Expert.

---

## 8. Labor Expert RCA

Wejście: **linia Master BOQ**. Lookup **tylko** `bucket === "LABOR"`.

COMPOUND → `BOTH` → **skip** OUR RATE / internal-first / research.

**Czy potrafi przyjąć komponent INSTALLATION z decomp/pack?** **Nie.** Brak `labourKey` / synthetic line.

OUR RATE = **zł / jm pozycji**, nie `hoursPerUnit`.

---

## 9. Quantity / Unit RCA

Przykład: przyłącze PVC **20 mb**.

| Kontrakt | 20 × (X + Y)? |
|----------|----------------|
| F5 + pack | **TAK jeśli** pack ma `qtyFactor` materiałów / mb **oraz** OUR RATE zł/mb na **tym samym** `workId`: `laborCost = 20 × rate`; `material = 20 × qtyFactor × sell` |
| `computePositionCost` | labor: `quantity × ourRatePln`; materials: **już absolutne** qty (adapter zrobił `20 × factor`) |
| TechUnit decomp | **NIE** — oba unitu dostają qty=20 mb, bez X/mb vs Y/mb |
| IK eksperci | **NIE** — nie mnożą składników PACKAGE |

`20 × (X + Y)` jest **już** w F5+engine, **nie** w IK COMPOSITE routing.

Unit remap żeby znaleźć cenę: **NIE** (`UNIT_CONVERSION_GAP`).

---

## 10. computePositionCost RCA

**NIE MODYFIKOWAĆ. Koniec pipeline ceny — TAK.**

| | |
|--|--|
| INPUT | `quantity`, `unit`, `labor \| null` (1× zł/jm), `materials[]` (absolutne qty × sell) |
| OUTPUT | `laborCostPln`, `materialCostPln`, `totalPositionCostPln`, `positionComplete`, issues |
| MATERIAL SUM | Σ qty_i × sell_i |
| LABOR SUM | quantity × ourRatePln (**jeden** labor) |
| MULTIPLIERS | **brak w engine** — BOM `qtyFactor` **przed** wejściem |
| BOM / TECH | **poza** engine (F3 adapter) |
| GAP | total **null**, nie 0 PLN |

Upstream musi dostarczyć gotowe stawki. IK COMPOSITE tego upstreamu **nie spina**.

---

## 11. Real-World Position Classes

| # | Klasa | Autonomia IK dziś |
|---|--------|-------------------|
| 1 | MATERIAL ONLY | **B/C** — plane MATERIAL + PM; levers OFF; P2 zawór KEEP GAP |
| 2 | LABOR ONLY | **B/C** — plane LABOR + OUR RATE; LABOR_ONLY allowlist |
| 3 | MATERIAL + LABOR (jedna LP) | **E na IK** · **B na F5** gdy pack+LABOR workId (malowanie) |
| 4 | + AUXILIARY | **GRAY/B** — equipment/transport Owner Input, nie PACKAGE |
| 5 | INSTALLATION | Owner = LABOR jeśli 1:1 „montaż X”; dual produkt+montaż → HOLD/UNKNOWN |
| 6 | REPLACEMENT | **NOT FOUND** pack; semantyka jak 5 |
| 7 | CONNECTION (przyłącze) | P5.26 host PVC = PACKAGE **B** (jedna stawka) · dual expert **E** |
| 8 | ASSEMBLY (kpl) | decomp R6 **D**; compose **E** |
| 9 | COMPLETE WORK | = klasa 3 · IK **E** |
| 10 | UNKNOWN | HOLD · 144/159 Paczka VII |

---

## 12. Existing Reuse Assets

- `classifyEstimatorPricingPlane` / `BOTH_HOLD`
- `decomposeOfferBoqLine` / `analyzeTechnologyLineBindings`
- TechnologyPack + `projectBom` + `findActiveTechnologyPacksForWorkId`
- `runIkMasterBoqLaborExpert` / `runIkMasterBoqMaterialExpert`
- Research (levers) · PM · OUR RATE
- `computeShadowPositionCostForOfferBoqLine` · `computePositionCost`
- Identity resolvers · P1/P5.9
- `LABOR_MATERIAL_PACKAGE` (reuse, nie split)

**Nie udowodniono**, że trzeba nowego engine. Udowodniono, że **nie są połączone** na `BOTH_HOLD`.

---

## 13. First Missing Seam

**Jeden konkret:**

```text
CONTRACT: IkClassificationHandoff = "BOTH_HOLD"
MODULE:   src/lib/intelligent-estimator/ik-classification.ts
          (handoffFromPlane · producer)

BRAK KONSUMENTA:
  BOTH_HOLD
    → N × Material Expert input  (materialKey | demand + qty + unit)
    → M × Labor Expert input     (workId + qty + unit)
    → (po stawkach) PositionCostInput
    → computePositionCost

NIE: „brak orchestratora” jako nowy pakiet.
NIE: computePositionCost.
NIE: brak Material/Labor Expert (1:1 działają).

NAJBLIŻSZY NIEPIĘTY PRODUCENT SKŁADNIKÓW:
  decomposeOfferBoqLine          (TechUnit[])
  resolveTechnologyBomForWork    (materialSpecs — F5, nie IK)
```

To jest seam: **`BOTH_HOLD` → expert component jobs**.  
Wszystko dalej (Pack, F5, engine) jest **YELLOW** dopiero po tym breaku.

---

## 14. Safety Constraints

| Constraint | Status |
|------------|--------|
| GAP ≠ 0 PLN | engine issues / `positionComplete=false` |
| NO EVIDENCE ≠ 0 | HOLD / MISS / NO_BOM |
| Research ≠ Accept | hard lock ekspertów |
| Evidence ≠ OUR RATE | candidate ≠ persist |
| NO auto Accept | `autoAcceptExecuted: false` |
| NO unit remap | BOM / internal-first |
| D = false | nienaruszone |
| P1 `cw.inv.*` / `mat.inv.*` | nienaruszone |
| P2 zawory KEEP GAP | nienaruszone · PACKAGE ≠ obejście |

---

## 15. Autonomy Matrix

| Etap | Score |
|------|-------|
| BOQ interpretation | **C** (Document Expert read) |
| Composite detection | **B** (`COMPOUND`/`BOTH_HOLD` istnieje, znaczy HOLD nie decompose) |
| Decomposition | **D/B** (TechUnit test R6; bind UNBOUND) |
| Material handoff | **E** z PACKAGE · **A/B** linia MATERIAL |
| Labor handoff | **E** z BOTH · **A/B** linia LABOR |
| Research handoff | **C** levers · **E** z COMPOUND |
| Quantity propagation | **A** w F5+qtyFactor · **E** w IK COMPOSITE |
| Composition | **A** engine · **B** IK feed |
| Final costing | **A** `computePositionCost` |
| Provenance | **B** |
| Owner boundary | **A** (HOLD/Accept) |

---

## 16. RCA Verdict

```text
VERDICT = B
Existing architecture is sufficient;
multiple bindings missing.

NIE A  — nie jeden seam (HOLD + pack.labour + expert API + IK≠F5)
NIE C  — pack reprezentuje materiały; nie jest pusty
NIE D  — eksperci kompletni na 1:1
NIE E  — computePositionCost / F5 / decomp / A1 istnieją
```

Świadomy HOLD (`BOTH_HOLD`) **jest** częścią architektury, nie defektem kodu. Luka autonomii = **brak konsumenta BOTH_HOLD zgodnego z Owner „nie split” — albo Owner GO na split przez istniejący F5+pack, bez nowych ekspertów.**

---

## 17. Recommended PLAN Input

**To nie jest PLAN. Nie implementować. Nie DF.**

Wejście dla przyszłego PLAN (po Owner Review):

1. Czy `BOTH_HOLD` zostaje na zawsze (safety), a compose idzie **tylko F5+pack** na plane LABOR+BOM (malowanie-class) — IK eksperci zostają 1:1?  
2. Czy Owner **odwołuje** „COMPOUND = nie split” dla jawnych montaż/wymiana/przyłącze?  
3. Czy TechUnit / TechnologyPack jest **jedyne** źródło N+M składników (REUSE), bez Classification V2?  
4. `pack.labour.hoursPerUnit` vs OUR RATE zł/jm — który kontrakt labor component?  
5. P2 zawory poza zakresem. P1 nienaruszone. D false. GAP≠0. Zero auto-Accept. Zero invent `mat.*`.  
6. Pierwszy seam do zaprojektowania w PLAN: **konsument `BOTH_HOLD`** — albo świadomy **NO-GO** (zostawić HOLD).

---

## STOP

```text
ZERO CODE · ZERO PLAN · ZERO DF · ZERO IMPLEMENTATION
ZERO NEW ENGINE · ZERO FLAG · ZERO mat.*
ZERO RESEARCH · ZERO ACCEPT · ZERO WRITE
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY

Czekaj na ChatGPT / Owner Review.
```
