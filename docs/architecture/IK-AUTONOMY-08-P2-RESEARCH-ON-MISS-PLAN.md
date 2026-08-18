# IK AUTONOMY-08 P2 — Research-on-Miss · PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN` |
| **Status** | **PLAN ACCEPTED** · **SLICE COMPLETE / CLOSED** · **ARCH REVIEW = PASS WITH REQUIRED FIXES** |
| **Date** | 2026-08-18 |
| **Mode** | PLAN ONLY · REUSE FIRST · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO HTTP** · **ZERO BUSINESS WRITE** · **ZERO COMMIT** · **ZERO PUSH** |
| **Audit** | [`IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md) · SOURCE re-verified this session |
| **Owner Decisions** | **OD-P2-1 … OD-P2-10 LOCKED** — **UNCHANGED** by Arch Fixes |
| **Design Freeze** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md) · **FROZEN + ARCH FIXES** |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Session** | [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) |
| **Tip** | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json` |
| **Prior** | **A08-P0 COMPLETE / CLOSED** · **A08-P1 COMPLETE / CLOSED** |
| **EPIC** | AUTONOMY-08 — P2 PLAN (epic **NOT CLOSED**) |

```text
OWNER REVIEW           = PASS (PLAN ACCEPTED)
PLAN                   = READY / ACCEPTED
Design Freeze          = FROZEN + IC-SEQ-1 · IC-SEQ-2 · IC-TEST-1
Architecture Review    = PASS WITH REQUIRED FIXES · blockers 0
Implementation         = COMPLETE
Production Verify      = PASS
A08-P2                 = COMPLETE / CLOSED
EPIC                   = AUTONOMY-08 — NOT CLOSED
```

```text
IK ON = AUTOMATYCZNA AUTONOMIA.
Brak dodatkowego przełącznika Research.
CONDITIONAL ≠ MANUAL OPT-IN.
Research-on-Miss = MISS-only · istniejące silniki.
Research ≠ Accept.
```

---

## 1. Objective

Odblokować **istniejący** MODE B (Labor + Material) w autonomicznym przebiegu `IkEntryHost`, tak aby:

```text
IK ON ∧ P5 AUTO|ON  → Labor executeResearch PERMITTED → HTTP tylko na MISS
IK ON ∧ P6 AUTO|ON  → Material executeResearch PERMITTED → HTTP tylko na MISS
```

Użytkownik **nie** wchodzi w Technical, **nie** zaznacza Research, **nie** odpala ręcznego Hub scan.

Jedyny biznesowy switch pozostaje **`ikEntryEnabled`**.

---

## 2. Scope

**IN:**

- Semantyka istniejących helperów `resolveIkP5LaborExecuteResearch` / `resolveIkP6MaterialExecuteResearch`
- Binding już obecny w `IkEntryHost` (`executeResearch: p5/p6ResearchOn === true`)
- Labor-first: P6 host effect **czeka** na zakończenie P5 (gdy P5 aktywny)
- F1: `researchEligible()` honoruje Classification HOLD (COMPOUND / UNKNOWN)
- Usunięcie UI leftover opt-in Research (checkboxy Technical)
- Test harness A08-P2 + korekta asercji A05, które dziś wymagają trzeciego booleanu
- **IC-SEQ-1 / IC-SEQ-2** w istniejącym P5/P6 `useEffect` (nie nowy orchestrator)
- **IC-TEST-1** companion harnessy (A05 T24 · 08-P0 T20 · A06 T13 · A07 T15 · migration P5/P6)

**OUT:** nowy engine · nowa flaga · nowy orchestrator · Accept UX w hoście · auto-Accept · P7/P8 engine · PACKAGE plane · D/Chief · KV migration · **IMPLEMENT w tej turze**

---

## 3. Owner Decisions (LOCKED)

| # | Decision | Locked meaning |
|---|---------|----------------|
| **OD-P2-1** | **YES** | IK ON ∧ P5/P6 AUTO\|ON ⇒ `executeResearch` permitted · **ONLY ON MISS** (silnik filtruje HIT) |
| **OD-P2-2** | **NO EXTRA SWITCH** | Zero checkbox / opt-in / nowa flaga / „Enable Research”. Istniejące `ik*ResearchEnabled` **nie** są drugim wymaganym opt-inem |
| **OD-P2-3** | **LABOR FIRST** | P5 (+ Labor Research-on-Miss) **kończy się**, potem P6 (+ Material Research-on-Miss). Nie masowy parallel P5∥P6 HTTP |
| **OD-P2-4** | **KEEP** | Research ≠ Accept. Candidate ≠ OUR RATE. Owner Gate zostaje |
| **OD-P2-5** | **KEEP** | `INTERNAL_REVIEW` / identity ambiguous → ZERO auto-research |
| **OD-P2-6** | **KEEP** | `mat.inv.*` HARD-FORBID |
| **OD-P2-7** | **KEEP** | COMPOUND / UNKNOWN → HOLD · ZERO Research · ZERO invent · **nie** plane PACKAGE |
| **OD-P2-8** | **KEEP** | Technical failure ≠ MISS (`BLOCKED` / `COOLDOWN` / `GAP` / `SKIPPED_SESSION_BUSY` / `researchError`) |
| **OD-P2-9** | **KEEP** | `WORK_RATE_LEGAL_GATE` · HTTP budget · cooldown · session busy · identity safety = **system gates**, nie opt-in UI |
| **OD-P2-10** | **NO** | Nie tworzyć nowej flagi IK |

**A05 reinterpretacja (obowiązkowa):**

```text
Research = CONDITIONAL
  = MISS ∧ classification ∧ identity ∧ legal ∧ budget ∧ cooldown ∧ session
  ≠ użytkownik musi zaznaczyć checkbox
```

Gdy warunki spełnione → Research **automatyczny**. AUTO/ON **nie** znaczy już `executeResearch=false` na call-site (to był pre-P2 A05 lock). Silnik nadal robi MODE A najpierw.

---

## 3a. PRE-IMPLEMENTATION ARCH FIXES (pointer · HARD)

Źródło: Arch Review **PASS WITH REQUIRED FIXES** · blockers **0**. SSOT conflict **NONE**. **Nie** zmieniają OD-P2-1…10.

Pełny kontrakt: DF §2a + §10. **IMPLEMENT = NOT YET AUTHORIZED.**

| ID | Frozen |
|----|--------|
| **IC-SEQ-1** | `cancelled` → **NIE settled**. Tylko dokończony lifecycle P5 (`finally` ∧ `!cancelled`) ustawia `laborSettled`. Istniejący P5 `useEffect` |
| **IC-SEQ-2** | sync `laborSettledRef` + `laborSettleTick` (re-render). P6 czyta **ref**, wait **przed** `materialAttemptedRef`. **Nie** useState-only |
| **IC-TEST-1** | A05 **T24** · 08-P0 **T20** · A06 **T13** · A07 **T15** · migration **P5/P6** — w IMPLEMENTATION/TEST SCOPE; **nie** uruchamiać w tej turze |

---

## 4. Current Production Baseline

| Pole | Wartość |
|------|---------|
| UI | **2.66.94** |
| Feature | **`e0373fac`** `feat(ik): unify autonomy settings` |
| Docs tip / HEAD | **`14ec7b3c`** `docs(ik): close autonomy-08 p1` |
| Live `version.json` | `"version":"2.66.94"` · `"commit":"14ec7b3"` |
| Deploy P1 | **`Cj1o11MdCxjzjpufFRmAevkDgYmS`** |
| A08-P0 / P1 | **COMPLETE / CLOSED** |
| A08-P2 | **NOT STARTED** |
| Live IK | `ikEntryEnabled=false` (P0 PV) · Research stored **false** |
| D | HARD STOP · live KV `true` = **PRE-EXISTING**, nie A08 |
| CatalogWork | **471** |
| P1 invoice | CLOSED |
| P2 identity | KEEP GAP |
| Composite | CLOSED · `feedsP7Bid=false` |

Źródło tipu: **09** + live `version.json`. Nie `MASTER-AI-HANDOFF`.

---

## 5. Current Source State

| Surface | Path | Dziś |
|---------|------|------|
| Gate SSOT | `src/lib/intelligent-estimator/ik-entry-flag.ts` | `resolveIkP5*` / `resolveIkP6*` = Entry ∧ E2E ∧ **`ik*ResearchEnabled === true`** |
| Host | `src/app/intelligent-estimator/IkEntryHost.tsx` | już przekazuje `executeResearch` · P5 i P6 **równoległe** `useEffect` |
| Labor expert | `src/lib/intelligent-estimator/ik-labor-expert.ts` | MODE A lookup → MISS → pending **tylko gdy** `executeResearch === true` else `RESEARCH_SKIPPED` |
| Material expert | `src/lib/intelligent-estimator/ik-material-expert.ts` | analog · F1: `researchEligible` za szerokie |
| Labor engine | `src/lib/ik-pricing-orchestrator/labor-research-bridge.ts` | `runIkLaborGapResearch` → `runSelectiveWorkRateResearch` |
| Material engine | `src/lib/price-intelligence/market-material-research-orchestrate.ts` + wire | `executeMaterialResearchPhase2` |
| Classification | `src/lib/intelligent-estimator/classification-gate.ts` | LABOR/MATERIAL research flags · COMPOUND/UNKNOWN HOLD |
| Settings UI | `src/app/AdminSettingsModal.tsx` | Technical checkbox `data-ik-labor-research-toggle` / `data-ik-material-research-toggle` |
| AppSettings | `src/lib/app-settings.ts` | keys default **false** · merge explicit true/false |
| Hub manual | `src/app/ik-pricing/IkLaborGapResearchPanel.tsx` | Owner click · **nie** host autonomy |
| Accept | `work-rate-accept.ts` / orchestrate `acceptMaterialResearchCandidate` | istnieją · **host nie woła** |
| Compile sentinel | `IK_ENTRY_SHELL_EXECUTE_RESEARCH = false` | nie jest runtime gate |

---

## 6. First Break

Klasa **E** (lever / configuration), nie brak silnika.

```text
STEP     = RESEARCH-ON-MISS (P5 MODE B + P6 MODE B) w IkEntryHost
ENGINE   = EXISTING
BINDING  = EXISTING (executeResearch już na call-site)
GATE     = extra boolean === true  (NIE implied by IK ON)
```

Dziś: MODE A wykrywa MISS → `RESEARCH_SKIPPED` → `candidate=null`.

---

## 7. Existing Research Engines (REUSE)

| Plane | Call | Downstream | HTTP on HIT? |
|-------|------|------------|--------------|
| Labor | `runIkLaborGapResearch` | `runSelectiveWorkRateResearch` | **NO** — `CURRENT` → `REUSE` |
| Material | `executeMaterialResearchPhase2` | MMR-02 selective DIY | **NO** — cache CURRENT → reuse (`current_reuse_no_research`) |

**Nie** tworzyć drugiego research service / cache / cooldown.

---

## 8. Existing Binding

`IkEntryHost.tsx` (SOURCE):

```text
p5ResearchOn = isIkP5LaborExecuteResearchActive() === true
p6ResearchOn = isIkP6MaterialExecuteResearchActive() === true

runIkMasterBoqLaborExpert({ executeResearch: p5ResearchOn === true })
runIkMasterBoqMaterialExpert({ executeResearch: p6ResearchOn === true })
```

**Nie** dodawać drugiego `useEffect` „odpal Research”. Zmiana = semantyka helpera + (P6) wait na P5 settled.

Host `data-ik-p5-labor-research` / `data-ik-p6-material-research` = **obserwowalność**, nie switch.

---

## 9. Existing Gates

| Gate | Rola dziś | Rola po P2 |
|------|-----------|------------|
| `ikEntryEnabled` | jedyny biznesowy IK | **KEEP** — master |
| P5/P6 `"AUTO"\|"OFF"\|"ON"` | MODE A · OFF = kill-switch etapu | **KEEP** — OFF nadal wyłącza MODE A **i** MODE B |
| `ikLaborResearchEnabled` | **wymagany opt-in MODE B** | **przestaje być runtime conjunct** (leftover, jak `ikAutoIngestEnabled`) |
| `ikMaterialResearchEnabled` | analog | analog |
| Classification | plane + `allow*Research` | **KEEP** · F1 zamyka dziurę w konsumencie |
| `INTERNAL_REVIEW` | `researchKey=null` | **KEEP** |
| `mat.inv.*` | HARD-FORBID w `researchEligible` + `assertMaterialResearchAllowed` | **KEEP** |
| `WORK_RATE_LEGAL_GATE` | `BLOCKED` w `work-rate-research.ts` | **KEEP** |
| Labor budget | `wrapLookupPortWithIkP5Budget` | **KEEP** |
| Material budget | `IkP6MaterialBudget` / MMR-02 | **KEEP** |
| Cooldown | `isWorkRateResearchInCooldown` | **KEEP** |
| Session busy | `sessionLaborResearchKeys` | **KEEP** |

Emergency Research-only **bez** wyłączania MODE A: **nie istnieje i nie powstaje** (OD-P2-2). Kill = IK OFF albo P5/P6 `"OFF"`.

---

## 10. Current Runtime Flow

```text
IK ON + P5–P8 AUTO
  P2 ingest
  Document Expert
  P5 MODE A  ∥  P6 MODE A     ← parallel useEffect
       MISS → RESEARCH_SKIPPED (bo research boolean false)
  Composite BOTH_HOLD (sync · HTTP void)
  P7 in-memory (nie czyta raportów P5/P6)
  P8 in-memory
```

`executeResearch` = flaga **całego runu** eksperta. Wewnątrz: HTTP tylko dla kluczy w `pendingByKey` (MISS). HIT nigdy nie trafia do pending.

---

## 11. Target Runtime Flow

```text
Użytkownik: IK ON
  (P5–P8 pozostają AUTO, chyba że emergency OFF)

Documents → BOQ → Classification
  → P5 LABOR MODE A
       HIT  → ZERO Research
       MISS → AUTO existing Labor Research (MODE B)
  → [P5 settled]
  → P6 MATERIAL MODE A
       HIT  → ZERO Research
       MISS → AUTO existing Material Research (MODE B)
  → P7 UNCHANGED (in-memory · feedsP7Bid=false)
  → P8 UNCHANGED (read-only prepare)
```

P7/P8 **nie** czekają na Accept. Lepsze inputy P7 po persist = **późniejszy** Owner Gate, nie ten slice.

---

## 12. Labor MISS semantics (KEEP — nie nowa definicja)

Research pending **tylko** gdy:

```text
bucket === "LABOR"
∧ workId
∧ identity.unit
∧ lookupWorkRate !== CURRENT     (STALE → STALE_TREATED_AS_MISS = istniejące)
∧ researchKey ustawiony
∧ NIE INTERNAL_REVIEW            (researchKey = null)
```

`bucketFrom`: COMPOUND → `BOTH`, UNKNOWN → `UNRESOLVED` → **nie** wchodzą w labor lookup/research. KEEP.

Host `executeResearch=true` **nie** omija tych filtrów.

---

## 13. Material MISS semantics

Istniejąca definicja MISS **zostaje**:

```text
evaluateMaterialCache !== CURRENT
∧ identity path:
    (A) product identity ∧ researchEligible(...)
    (B) demand path ∧ demandResearchEligible(...)   // już plane===MATERIAL && bucket===MATERIAL
```

**Zmiana P2 (F1):** `researchEligible` musi być **co najmniej tak ciasne** jak Classification Gate + path (B). Patrz §17–18.

HIT CURRENT → `PRICE_MEMORY_HIT` · `researchKey` nie do pending.

---

## 14. HIT semantics

```text
CURRENT HIT → ZERO HTTP → ZERO Research → użyj istniejącej ceny/stawki
```

`runSelectiveWorkRateResearch`: `looked.status === "CURRENT" && !forceRefresh` → `REUSE`. Host **nie** przekazuje `forceRefresh` w autonomicznym path.

`executeResearch=true` **nie** znaczy „researchuj HIT”. Znaczy „wolno wejść na MODE B dla pending MISS”.

---

## 15. Technical failure semantics (KEEP)

Nie mapować na MISS / nie invent / nie Accept:

| Status | Źródło |
|--------|--------|
| `BLOCKED` / `WORK_RATE_LEGAL_GATE` | `work-rate-research.ts` |
| `COOLDOWN` | `isWorkRateResearchInCooldown` |
| `SKIPPED_SESSION_BUSY` | `labor-research-bridge.ts` → host `RESEARCH_SKIPPED` |
| `GAP` / `RESEARCH_BUDGET_STOP` | P5 budget |
| `BUDGET_EXCEEDED` | P6 budget |
| `researchError` | Phase2 `ok:false` |
| parser / HTTP provider fail | istniejący error path silnika |

A08-P2 **nie** zmienia tych enumów.

---

## 16. Classification Gate invariants (KEEP)

| Plane | Lookup | Research |
|-------|--------|----------|
| LABOR | Work Catalog | MISS only |
| MATERIAL | Price Memory | MISS only |
| COMPOUND | HOLD | **ZERO** |
| UNKNOWN | HOLD | **ZERO** |

**Nie** plane `PACKAGE`. **Nie** zmieniać `flagsFor()` / `classifyEstimatorPricingPlane`. F1 naprawia **konsumenta**, nie gate.

Istniejące guardy silnika (KEEP, reuse):

- `assertLaborResearchAllowed` — `plane === "LABOR"`
- `assertMaterialResearchAllowed` — invoice forbid + `plane === "MATERIAL"` (ścieżka non-`mat.*`)
- `isLaborGapJobAllowed`

---

## 17. A08-P2-F1

**Finding (SOURCE):** `researchEligible()` w `ik-material-expert.ts` blokuje LABOR / NON_COST / `mat.inv.*`, potem `return true`.

Skutek: **COMPOUND/BOTH** oraz **UNKNOWN/UNRESOLVED** z product identity **mogą** wejść na Phase2, gdy `executeResearch=true`.

To jest **niezgodne** z OD-P2-7.

Path (B) `demandResearchEligible` jest już poprawny (`plane === "MATERIAL" && bucket === "MATERIAL"`). Dziura = path (A).

Composite woła `researchEligible` + `assertMaterialResearchAllowed` i **void** execute flags (brak drugiego HTTP). F1 i tak trzeba zamknąć w ekspercie, bo to host MODE B.

---

## 18. F1 resolution strategy

**Nie:** nowy engine · nowy plane · rewrite Material Expert · cichy PACKAGE.

**Tak — minimalny konsument:**

SOURCE: `researchEligible` w `ik-material-expert.ts`

Po istniejących forbidach dodać **jawny HOLD**:

```text
if (plane === "COMPOUND" || plane === "UNKNOWN") return false
if (bucket === "BOTH" || bucket === "UNRESOLVED") return false
return plane === "MATERIAL" && bucket === "MATERIAL"
```

Expected:

| Input | Dziś | Po P2 |
|-------|------|-------|
| MATERIAL + MATERIAL bucket + canonical key + MISS | eligible | eligible |
| LABOR plane | false | false |
| `mat.inv.*` | false | false |
| COMPOUND / BOTH + product identity | **true (BUG)** | **false** |
| UNKNOWN / UNRESOLVED + product identity | **true (BUG)** | **false** |

`classification-gate.ts` **NOT TOUCHED**. `demandResearchEligible` już zgodne — ewentualnie tylko test parity, bez duplikacji logiki jeśli path (A) pokrywa HOLD.

---

## 19. Labor-first sequence

Dziś: dwa niezależne `useEffect` (P5 ∥ P6) → równoległy HTTP na MISS.

**P2 (minimal host, nie nowy orchestrator).** SSOT mechanizmu: DF §2a **IC-SEQ-1 / IC-SEQ-2** (useState-only **REJECTED**).

```text
P5 effect  = jak dziś (MODE A + MODE B if permitted)
             + laborSettledRef sync false na starcie (P5 ON)
             + finally: settled true TYLKO jeśli !cancelled   (IC-SEQ-1)
             + laborSettleTick do re-run P6                  (IC-SEQ-2)
P6 effect  = start dopiero gdy:
             (a) P5 OFF  → laborSettledRef = true sync
             (b) P5 ON   → laborSettledRef.current === true
             wait BEFORE materialAttemptedRef
             NIE `labor !== null`
```

Wewnątrz P5: istniejąca pętla `await runIkLaborGapResearch` (serial per key).  
Wewnątrz P6: istniejąca pętla `await executeMaterialResearchPhase2`.

**Nie** per-line Labor→Material orchestrator. Labor-first = **tender-level**: cały P5, potem cały P6.

`laborAttemptedRef` / `materialAttemptedRef` KEEP.

---

## 20. Material sequence

Po `laborSettledRef === true` (lub P5 OFF): istniejący `runIkMasterBoqMaterialExpert({ executeResearch: p6ResearchOn === true })`.

P6 `"OFF"` → `p6MaterialOn=false` → brak Material Expert (KEEP).  
IK OFF → host nie montowany / Entry false → `p6ResearchOn=false` (KEEP).

---

## 21. Autonomy semantics

```text
Użytkownik: Super Admin ⚙ → IK ON
IK: Documents → BOQ → classify → P5 HIT/MISS(+research) → P6 HIT/MISS(+research) → P7 → P8
```

Technical P5–P8 selecty **zostają** jako emergency AUTO/OFF/ON (A08-P1). To **nie** są opt-iny Research.

Hub `IkLaborGapResearchPanel` = **recovery / Owner review** · nie SSOT startu. **KEEP** (nie usuwamy w P2).

---

## 22. ZERO EXTRA SWITCHES

**Zakazane w PLAN/IMPLEMENT:**

`ikResearchEnabled` · `ikAutoResearchEnabled` · `ikResearchOnMissEnabled` · `laborResearchOptIn` · `materialResearchOptIn` · `enableResearch` · `autoResearch` · nowy checkbox Technical · „Advanced Research”

Nie przenosić starego opt-inu pod inną nazwą.

---

## 23. Existing boolean gates analysis

### Rola dziś

`ikLaborResearchEnabled` / `ikMaterialResearchEnabled`:

- AppSettings boolean, default **false**, merge `=== true` only
- **jedyny** brakujący conjunct MODE B
- UI: Technical checkbox (A08-P1 accordion)
- konsumowane **wyłącznie** przez `resolveIkP5LaborExecuteResearch` / P6 twin oraz checkbox save

To jest **feature opt-in**, nie safety gate. Safety = classification / identity / legal / budget / cooldown.

### Najmniejsza zmiana semantyki (IMPLEMENT, nie teraz)

```text
resolveIkP5LaborExecuteResearch(input) :=
  input.ikEntryEnabled === true
  ∧ input.ikLaborE2eEnabled === true     // boolean capability AUTO|ON, nigdy raw enum

resolveIkP6MaterialExecuteResearch(input) :=
  input.ikEntryEnabled === true
  ∧ input.ikMaterialE2eEnabled === true
```

**Drop third conjunct.** Typ inputu może zostawić pole dla kompatybilności testów **albo** usunąć je z typu w tym samym slice — bez nowego klucza.

`isIkP5LaborExecuteResearchActive()` przestaje czytać `isIkLaborResearchEnabled()`.

### Leftover (wzorzec A08-P0 AUTO_INGEST)

| Item | P2 action |
|------|-----------|
| Keys w `AppSettings` | **KEEP** · zero KV migration |
| `mergeIk*ResearchEnabled` | **KEEP** (nie piszemy nowych wartości) |
| `isIkLaborResearchEnabled()` | leftover reader · **nie** w executeResearch path |
| `forceIk*ResearchForTests` | leftover · P2 testy gate **nie** wymagają force=true |
| Default `false` stored | **OK** — unread by gate |
| UI checkboxy | **USUNĄĆ** (inaczej ghost opt-in = ukryty obowiązek) |
| `data-ik-*-research-toggle` | usunąć wraz z checkboxem |

Nie flipować stored boolean na `true` (to byłby settings write + fałszywy drugi switch).

---

## 24. Reuse map

| Need | Reuse | Create? |
|------|-------|---------|
| Labor HTTP | `runIkLaborGapResearch` | NO |
| Material HTTP | `executeMaterialResearchPhase2` | NO |
| Dedupe/cooldown | `isWorkRateResearchInCooldown` + session busy | NO |
| Accept | `acceptWorkRateResearchCandidate` · `acceptMaterialResearchCandidate` | NO (host nadal nie woła) |
| Classification | `classifyEstimatorPricingPlane` | NO |
| Invoice forbid | `isInvoicePurchaseMaterialKey` | NO |
| Host | existing `useEffect` P5/P6 | NO new orchestrator |
| Budget | existing P5/P6 wrappers | NO |
| Legal | `WORK_RATE_LEGAL_GATE` | NO |

---

## 25. Files likely affected (IMPLEMENT — not now)

| File | Change |
|------|--------|
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | drop third conjunct · komentarz leftover |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | **IC-SEQ-1** + **IC-SEQ-2** · P6 wait before `materialAttemptedRef` |
| `src/lib/intelligent-estimator/ik-material-expert.ts` | F1 `researchEligible` HOLD |
| `src/app/AdminSettingsModal.tsx` | usunąć 2 checkboxy Research z Technical |
| `src/lib/app-settings.ts` | komentarz leftover **optional** · **bez** nowego klucza · **bez** zmiany default merge |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | bump UI przy IMPLEMENT |
| `scripts/test-ik-autonomy-08-p2-research-on-miss.mjs` | **nowy** harness (wzór 08-P0/P1) |
| `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs` | **T11 + T24** (IC-TEST-1) |
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | **T07** research-toggle absent |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **IC-TEST-1 T20** |
| `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` | **IC-TEST-1 T13** |
| `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` | **IC-TEST-1 T15** |
| `scripts/test-ik-migration-01-p5-implementation.mjs` | **IC-TEST-1** |
| `scripts/test-ik-migration-01-p6-implementation.mjs` | **IC-TEST-1** |

---

## 26. Files explicitly NOT TOUCHED

| Area | Why |
|------|-----|
| `ik-p7-position-cost-bid.ts` / P7 engine | OD · A06 CLOSED |
| `ik-p8-risk-decision.ts` / P8 | OD · A07 CLOSED |
| Final Bid / Offer / Decision Persist / DW | Owner Gate later |
| `acceptWorkRateResearchCandidate` / `acceptMaterialResearchCandidate` bodies | Research ≠ Accept |
| OUR RATE write path / `saveWorkCatalogRouted` | tylko Accept |
| `classification-gate.ts` `flagsFor` / owner map | F1 = konsument |
| `work-rate-research.ts` internals | REUSE as-is |
| `market-material-research-orchestrate.ts` Phase2 | REUSE as-is |
| Chief / D / `expertAiDecydentEnabled` | HARD STOP |
| Payroll / Cloud Sync / DATA_KEYS | poza slice |
| Composite engine HTTP | już void execute · `feedsP7Bid=false` KEEP |
| Unrelated local WIP | **NIERUSZANY** |
| `IkLaborGapResearchPanel` | KEEP recovery |
| Compile `IK_ENTRY_SHELL_EXECUTE_RESEARCH` | leftover sentinel · nie AND-ować |

UI poza usunięciem 2 checkboxów Research: **nie** redesign Settings, **nie** primary Research.

---

## 27. Test plan (PLAN ONLY — nie uruchamiać teraz)

Nowy harness + korekta A05 T11. Minimum:

**Labor**

| Case | Expected |
|------|----------|
| CURRENT HIT | 0 research calls / REUSE |
| MISS + identity OK + LABOR | pending → `runIkLaborGapResearch` |
| `INTERNAL_REVIEW` | `researchKey=null` · 0 HTTP |
| bucket ≠ LABOR | 0 Labor Research |
| identity ambiguous / UNRESOLVED | 0 |
| cooldown | `COOLDOWN` KEEP |
| session busy | `SKIPPED_SESSION_BUSY` KEEP |
| legal block | `BLOCKED` KEEP |
| HTTP/engine error | nie MISS invent |

**Material**

| Case | Expected |
|------|----------|
| CURRENT HIT | `PRICE_MEMORY_HIT` · 0 Phase2 |
| MATERIAL MISS + eligible | Phase2 |
| COMPOUND / BOTH | HOLD · 0 Phase2 (**F1**) |
| UNKNOWN / UNRESOLVED | HOLD · 0 Phase2 (**F1**) |
| `mat.inv.*` | HARD-FORBID |
| technical error | `researchError` KEEP |

**Autonomy**

| Case | Expected |
|------|----------|
| IK OFF | `resolve*ExecuteResearch` false |
| IK ON + P5 AUTO + research stored **false** | Labor executeResearch **true** (permission) |
| IK ON + P6 AUTO + stored false | Material executeResearch **true** |
| IK ON + P5 OFF | Labor MODE A **i** MODE B HOLD |
| brak checkboxa / brak nowej flagi | source grep |
| P5 then P6 | Material expert start ≥ Labor settled (host) |

**Accept**

| Case | Expected |
|------|----------|
| candidate | `CANDIDATE_OWNER_ACCEPT_REQUIRED` |
| `acceptedOurRate = 0` / `counts.accepted = 0` | KEEP |
| host | **nie** woła `accept*` |

---

## 28. Regression risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Research na HIT | silnik CURRENT→REUSE · host bez `forceRefresh` · test HIT |
| 2 | Research COMPOUND/UNKNOWN | F1 `researchEligible` · test |
| 3 | `mat.inv.*` | istniejący forbid KEEP · test |
| 4 | legal gate bypass | nie ruszać `work-rate-research` · test BLOCKED |
| 5 | HTTP budget | istniejące wrapery KEEP |
| 6 | duplikacja Research | `pendingByKey` + session busy + Hub ≠ drugi auto-start |
| 7 | re-entry / loop | existing attemptedRef · P6 wait w `finally` (nie na `labor===null`) |
| 8 | auto-Accept | host nie woła accept · counts 0 · test |
| 9 | zmiana P7/P8 | NOT TOUCHED |
| 10 | Research przy IK OFF | Entry conjunct KEEP |
| 11 | leftover checkbox jako obowiązek | **usunąć UI** · gate nie czyta booleanu |
| 12 | A05 CONDITIONAL vs AUTO executeResearch=false | świadoma zmiana call-site · A05 T11 update · silnik nadal MISS-only |

Mixed-client: stary JS do odświeżenia nadal wymaga checkboxa. Po deploy: Version Awareness (istniejące). **Nie** KV migration.

---

## 29. Safety constraints

```text
❌ new flag / engine / orchestrator / Evidence store / catalog
❌ || true · raw enum === true jako Research
❌ auto-Accept · auto Final Bid · D bypass
❌ Research before classification
❌ Research when CURRENT exists
❌ technical failure as MISS
❌ PACKAGE plane · COMPOUND rewrite
❌ git add -A · vercel deploy
❌ settings write / Research HTTP w tej turze PLAN
```

---

## 30. Rollback strategy

1. Revert gate commit → third conjunct wraca → MODE B znowu opt-in  
2. IK OFF  
3. P5/P6 `"OFF"` (kill MODE A+B)  
4. Leftover stored `ik*ResearchEnabled=false` **nie** jest potrzebny do rollbacku po drop conjunct; po revert znowu działa jako opt-in  

Brak KV migration = rollback = git revert. Checkbox UI wraca razem z revertem.

---

## 31. Explicit non-goals

- nowy TenderModule / NG-10 / drugi IK  
- nowy Research engine / Accept / Price Commit produkt  
- auto zatwierdzanie cen / Final Bid  
- zmiana P7/P8 / Offer / DW / Chief / Payroll / Sync  
- plane PACKAGE  
- Owner Accept przyciski w `IkEntryHost` (późniejszy gate; wymaga kandydata — ten slice tylko go umożliwia na MISS)  
- invoice host cleanup  
- batch engine od zera (istniejący pending map + serial await)  

---

## 32. Exit criteria (po przyszłym IMPLEMENT — nie teraz)

```text
IK ON ∧ P5 AUTO|ON ∧ Labor MISS  → existing Labor Research (no extra click)
IK ON ∧ P6 AUTO|ON ∧ Material MISS → existing Material Research after P5 settled
HIT → 0 HTTP
COMPOUND/UNKNOWN → 0 Research
mat.inv.* → 0 Research
INTERNAL_REVIEW → 0 Research
candidate ≠ Accept
no new IK flag
no Research checkbox in Settings
A05 T11 updated to new call-site semantics
harness A08-P2 PASS
P7/P8/D/Payroll UNCHANGED
WIP unrelated UNTOUCHED
```

---

## 33. Open questions

**NONE.** OD-P2-1…10 zamykają semantykę (UNCHANGED). SOURCE wystarcza: binding istnieje, F1 ma minimalny fix w konsumencie, leftover boolean = AUTO_INGEST pattern. Labor-first = istniejący P5 lifecycle + **IC-SEQ-1 / IC-SEQ-2** (ref + tick; cancelled ≠ settled).

Gdyby IMPLEMENT odkrył deadlock w host wait po zastosowaniu IC-SEQ-1/2: **OWNER REVIEW REQUIRED** — nie zgadywać drugiego orchestratora.

---

## STOP

```text
PLAN               = ACCEPTED
DESIGN FREEZE      = FROZEN + ARCH FIXES
ARCH REVIEW        = PASS WITH REQUIRED FIXES
BLOCKERS           = 0
REQUIRED FIXES     = IC-SEQ-1 · IC-SEQ-2 · IC-TEST-1
IMPLEMENT          = NOT YET AUTHORIZED
CODE               = ZERO
SETTINGS           = ZERO
HTTP               = ZERO
COMMIT / PUSH      = NOT DONE
```

Czekam na **Owner GO IMPLEMENT**. Nie implementować, nie testować runtime, nie budować, nie commitować.
