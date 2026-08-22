# IK — MASTER DECISION TREE · DESIGN FREEZE (W0)

> **ID:** `IK-MASTER-DECISION-TREE-DESIGN-FREEZE`
> **STAGE:** **W0 — DESIGN FREEZE** (Owner Review)
> **STATUS:** **FROZEN CANDIDATE** · audit **PASS WITH GAPS** · corrections §12 incorporated
> **Data:** 2026-08-23
> **OWNER GO:** **NOT GRANTED** · **IMPLEMENTATION = FORBIDDEN** (W1+)
> **Master IK:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) — **nadrzędny**; ten plik **nie** zastępuje Master SSOT
> **Audit source:** DESIGN FREEZE AUDIT 2026-08-23 (read-only, code-verified)

```text
════════════════════════════════════════════════════════
PROCESS GATE (LOCKED):
  AUDIT → DESIGN FREEZE → OWNER REVIEW → OWNER GO → IMPLEMENT
W0 = ten dokument. W1+ = FORBIDDEN bez explicit OWNER GO.
════════════════════════════════════════════════════════
```

---

## 0. Werdykt W0

| Pole | Wartość |
|------|---------|
| DESIGN FREEZE AUDIT | **PASS WITH GAPS** |
| DESIGN FREEZE READY | **TAK** — po incorporacji korekt §12 (ten plik) |
| CURRENT runtime | Dwa tory: `chief-orchestrator` ∥ `IkEntryHost` sekwencja |
| TARGET | Jeden IK sequencer (Orchestra) + Chief delegacja + LEGACY Chief T1–T4 |

---

## 1. Orchestra vs SSOT §2 (LOCKED)

**Orchestra jest ekstrakcją/rename istniejącej sekwencji runtime z `IkEntryHost`. Nie jest drugim IK orchestrator.**

- TARGET posiada **dokładnie jeden** IK sequencer (lib Orchestra).
- **Chief deleguje** do Orchestra (`Chief.start` → Orchestra snapshot).
- `runChiefOrchestrator` **T1–T4** pozostaje **LEGACY/ETICS** **poza** IK bid path.
- Zgodne z zakazem Master SSOT §2: „drugi orchestrator IK / drugi Chief” — **nie** tworzymy równoległej sekwencji IK; **przenosimy** sekwencję z Host do lib.

`IkEntryHost` po migracji = **UI/runtime adapter** (subscribe, render, EC, VM, P2 cloud patch) — **nie** drugi sequencer.

---

## 2. CURRENT vs TARGET vs LEGACY

| Warstwa | CURRENT | TARGET | LEGACY |
|---------|---------|--------|--------|
| IK sequencer | `IkEntryHost` useEffect/useMemo | `OrchestraEngine` (lib, NEW GLUE) | — |
| Chief execution | `runChiefOrchestrator` T1–T6 | Delegacja → Orchestra; T5 adapter z P7 | T1–T4 ETICS/Decydent |
| Identity | Split: Classification `knrMapped`, Labor `report`+remap | Jeden `IdentityContext` po PHASE 3 | — |
| Bid SSOT (IK) | P7 gdy `offerBoq` present | bez zmian semantyki P7 | `TenderBidProposalPanel` / Chief Offer |
| Persist | `attachOfferBoqToDwelling` exists, nie wired w Host | Explicit PHASE 3 persist step | — |

---

## 3. MASTER DECISION TREE (TARGET)

```text
TENDER / CASE
  TenderDetailPage — mount, historicalIndex, eligibility

CHIEF (TARGET)
  Case / Tender / Dossier owner · master eligibility owner
  chief-session/engine.ts — lifecycle, pricingReady gate
  Chief.start ──deleguje──► ORCHESTRA

  LEGACY (poza IK path — NIE READ-P7):
    T1 Execution  → technology-line-binding / deriveExecutionPlan / projectWorkBundle
    T2 Material     → wymaga ExecutionExpertAnalysisResult
    T3 Pricing      → Chief Material + market/materialKey
    T4 Cost         → BOM × company.laborPlnPerHourByKey + purchase (≠ F5 OUR_RATE)

  TARGET IK path:
    Orchestra snapshot → P7 → T5 Offer ADAPTER (NEW GLUE) → T6 Dossier (presentation)

ORCHESTRA (TARGET — jeden IK sequencer)
  PHASE 0   Eligibility / ik-entry-flag
  PHASE 1   P2 ingest latch → Document Expert (+ package read)
  PHASE 1b  Owner Map gate (multi: documentToDwelling / allMapped)
  PHASE 2   KNR B (+ historicalIndex jako INPUT do runIkKnrExpert — nie osobny krok)
  PHASE 3   IDENTITY PIPELINE → complete IdentityContext (patrz §4)
  PHASE 4   Classification (PO PHASE 3 — patrz §5)
  PHASE 5   Labor Expert (P5)
  PHASE 6   Material Expert (P6)
  PHASE 7   Composite → computePositionCost (F5)
  PHASE 8   P7 Position Cost / Bid
  PHASE 9   P8 Risk (+ chiefSession read-only advisory)
  OUTPUT    OrchestraSnapshot → VM → ExpertConversationSurface

HUB (Owner UI — OUT OF SCOPE W0)
  Labor / Material / KNR-WC Accept → TARGET: Orchestra.refreshPhase(...) (W5+)
```

---

## 4. IDENTITY PIPELINE (PHASE 3) — LOCKED

### 4.1 Kolejność (TARGET)

```text
Document (structural Master BOQ — transient input)
  → KNR B (+ historicalIndex jako input do runIkKnrExpert)
  → Alias
  → Slice D (applyOwnerKnrMapping — catalogWorkId na mapped copy)
  → Mapper (mapOfferBoqLineCore / mapOfferBoqLine)
  → pełny Identity tuple (patrz §4.2)
  → KNR-WC proposals [CONDITIONAL — feature flags + Owner GO OD-04]
  → Unit compatibility (normalizeWgdomCostUnit / owner-unit-compatibility)
  → F5 resolve (resolveWorkIdentityFromOfferBoqLine)
  → Owner manual override policy [OD-05 — policy only, no impl W0]
  → Persist OfferBoq (attachOfferBoqToDwelling)
```

**Zakazane opisy:** `Slice D → F5` jako kompletnego identity. Slice D **nie** jest kompletnym identity tuple.

### 4.2 Identity tuple completeness (LOCKED — korekta audit §12.1)

**Identity tuple musi być kompletny przed persist i przed F5 authority:**

| Pole | Wymagane |
|------|----------|
| `catalogWorkId` | tak |
| `matchMethod` | tak |
| `matchConfidence` | tak |
| `candidateMatches` | gdy wymagane przez istniejący kontrakt F5 (`boq-shadow-adapter` competing policy) |

**Slice D** może dostarczyć wyłącznie `catalogWorkId` na mapped copy (`ik-knr-owner-mapping.ts` — mutacja copy, bez `matchMethod`).

**Pełny tuple** powstaje po właściwym **Mapper** i/lub **F5 identity resolution** zgodnie z `TRUSTED_MATCH` (`boq-shadow-adapter.ts`).

**Pricing identity SSOT:** `OfferBoq` per dwelling (`unit.offerBoq`) — nie Master BOQ overlay alone.

### 4.3 Persist step (TARGET)

Po F5 PASS lub Owner manual (OD-05 po GO):

- **REUSE:** `attachOfferBoqToDwelling` → `multi-dwelling` package → LS `kw-multi-dwelling-package-v1`
- **Readback:** Document Expert `unit.offerBoq` → `masterBoqLines`
- **P7 multi:** `evaluateDwellingPositionCost(d.offerBoq)` → `computePackageBidProposal`

Explicit persist step w Orchestra PHASE 3 — **NEW GLUE wrapper** (W2, po Owner GO).

---

## 5. CLASSIFICATION TIMING (LOCKED — korekta audit §12.3)

**Classification jest wykonywana PO ZAKOŃCZENIU PHASE 3 Identity** (complete `IdentityContext`).

**Zakazane (CURRENT anti-pattern — nie TARGET):**

```text
Slice D → Classification → Mapper → Labor
```

**TARGET:**

```text
PHASE 3: complete IdentityContext
PHASE 4: Classification (runIkMasterBoqClassification na post-identity expert/lines)
PHASE 5: Labor
PHASE 6: Material
PHASE 7: Composite / F5
PHASE 8: P7
```

**CURRENT gap (dokumentacja only):** `IkEntryHost.tsx` uruchamia Classification na `knrMapped` przed pełnym Mapper/persist — do naprawy w W2, nie w W0.

---

## 6. LABOR / MATERIAL — TRUSTED IDENTITY (LOCKED — korekta audit §12.2)

### 6.1 Problem P0 (CURRENT)

`ik-labor-expert.ts` i `ik-material-expert.ts` wywołują `mapOfferBoqLine()` na każdej linii — może **ponownie** wykonać mapping i **nadpisać** identity.

**Samo `expert = knrMapped.expert` NIE wystarcza.**

### 6.2 TARGET (wymaga A + B)

| Wymaganie | Typ | Opis |
|-----------|-----|------|
| **A** | Caller glue (W2) | Przekazać post-identity expert / lines (`knrMapped.expert` lub persisted `offerBoq`) |
| **B** | Mapping policy (NEW GLUE) | **TRUSTED_MATCH identity must be preserved** |

**Preferowana semantyka (B):** jeżeli `OfferBoqLine` posiada zaufany identity tuple zgodny z istniejącym kontraktem `TRUSTED_MATCH` (`exact_knr` · `catalog_map` · `alias` · `manual` w `boq-shadow-adapter.ts`), mapper **nie może bezwarunkowo** nadpisać `catalogWorkId` / `matchMethod` / `matchConfidence`.

To jest **NEW GLUE / mapping policy** w `tender-offer-boq-mapping.ts` (lub thin seam) — **nie** nowy ekspert.

**Nie zmienia** semantyki domenowej `runIkMasterBoqLaborExpert` ani `runIkMasterBoqMaterialExpert` (pętla, research, Accept boundaries bez zmian).

### 6.3 Kolejność downstream (TARGET)

```text
IdentityContext / post-identity OfferBoq
  → Classification
  → Labor
  → Material
  → P7 / F5
```

**Zakazane:** `KNR report → Labor remap → osobna równoległa identity`.

---

## 7. CHIEF AUTHORITY (LOCKED)

| Element | TARGET |
|---------|--------|
| Case/Tender/Dossier owner | **TAK** — `chief-session` |
| `Chief.start` → Orchestra | **TAK** — bez drugiego IK sequencer |
| T1–T4 | **LEGACY/ETICS** lub future explicit glue — **NIE** READ-P7 adapters |
| T5 Offer | **ADAPTER możliwy** — syntetyczny handoff z `P7.proposal` (NEW GLUE, W4) |
| T6 Dossier | **Presentation/assembly only** — `assembleDecydentDossier` |

---

## 8. ORCHESTRA EXTRACTION — PORTS (LOCKED)

Ekstrakcja z `IkEntryHost` **nie jest mechaniczna** — wymaga explicit ports:

| Coupling CURRENT | Port TARGET |
|------------------|-------------|
| P2 generation/stale | `P2IngestPort` (`ik-entry-p2-ingest-latch.ts`) |
| `onUpdateRef` / `itemRef` | `ParentBridgePort` |
| `laborSettledRef` / `laborSettleTick` | `P5SettlePort` (IC-SEQ-2) |
| `laborAttemptedRef` / `materialAttemptedRef` | `OncePerKeyPort` |
| `knowledgeAttemptedRef` | `KnrKnowledgePort` (KL-3 side-channel) |
| `effectiveItem` | `IngestMergePort` |
| `chiefSession` | `ChiefAdvisoryPort` (P8 read-only) |
| `pipelineIngest` wait 1500ms | `PipelineWaitPort` |

**IkEntryHost zostaje:** React lifecycle · subscribe · render · `ExpertConversationSurface` · VM · `data-ik-*` · P2 UI/cloud patch.

---

## 9. P7 / BID AUTHORITY (LOCKED)

**P7 = authoritative tender bid SSOT dla ścieżki IK OfferBoq/F5** gdy `unit.offerBoq` present i gates PASS.

| Moduł | Rola |
|-------|------|
| `runIkP7PositionCostBid` | IK seam |
| `computePositionCost` | engine per line |
| `evaluateDwellingPositionCost` | per dwelling |
| `computePackageBidProposal` | multi bid |
| `evaluatePackageGate` | outer gate — `offerBoq` null → `BOQ_NOT_IMPORTED` |

**LEGACY parallel (nie usuwać):**

- `TenderBidProposalPanel` / `computeTenderBidProposal`
- Chief T5 `analyzeOfferFromCost` (osobny model kosztu)

---

## 10. KNR-WC (CONDITIONAL)

- Bridge queue **może** być wywołany w Orchestra PHASE 3 po Mapper/tuple — **W5**, po Owner GO.
- **CONDITIONAL:** `isKnrWcIdentityBridgeP2UiRuntimeEnabled` + łańcuch flag P1/P21/P22.
- **Hub** = Owner UI; Accept → `Orchestra.refreshPhase` (OUT OF SCOPE W0).
- **Owner Accept nie może być automatyczny** — queue ZERO write; P8 `autoAcceptExecuted: false`.

---

## 11. OWNER DECISION REGISTER (OD-01..OD-07)

**Żadna decyzja nie jest implementowana w W0. OWNER GO = NOT GRANTED.**

| ID | Temat | Status W0 |
|----|-------|-----------|
| OD-01 | `prob` unit / SWZ | VALID · NEEDS OWNER GO |
| OD-02 | F5 competing policy | VALID · NEEDS OWNER GO |
| OD-03 | gruntowanie vs malowanie | VALID (SPLIT: biznes = Owner; mapper bug = mapper epic) |
| OD-04 | KNR-WC Accept | VALID · NEEDS OWNER GO |
| OD-05 | manual identity override | VALID · TECHNICAL GAP + NEEDS OWNER GO |
| OD-06 | Chief T1–T4 LEGACY vs sunset | VALID · NEEDS OWNER GO |
| OD-07 | Final GO authority (P8 vs Decydent) | VALID · NEEDS OWNER GO |

---

## 12. REUSE / NEW GLUE / NEW EXPERT (LOCKED)

| Kategoria | Zakres |
|-----------|--------|
| **REUSE** | Wszystkie `runIk*` · Chief experts (LEGACY scope) · `attachOfferBoqToDwelling` · F5/P7 · KNR-WC bridge · Classification gate |
| **NEW GLUE** | OrchestraEngine + ports · IdentityContext carrier · TRUSTED preserve policy · persist wrapper · Chief→Orchestra delegation · T5 P7 adapter · Hub `refreshPhase` |
| **NEW EXPERT** | **ZAKAZANE** (Master SSOT §2 · bez AUDIT + Owner GO) |

---

## 13. IMPLEMENTATION WAVES (post-GO only)

```text
W0  Design Freeze / Owner Review          ← TEN PLIK · NO IMPLEMENT
W1  Orchestra Extraction                  FORBIDDEN bez OWNER GO
W2  Identity Context + persist + Labor glue
W3  Chief → Orchestra
W4  Chief Offer adapter + T1–T4 LEGACY flag
W5  KNR-WC Orchestra integration
W6  Owner policy gates (OD-01..07)

Każda fala W1+:
  AUDIT → DF → OWNER GO → IMPLEMENT → BUILD → TEST → OWNER VERIFY → COMMIT → PUSH → PV → CLOSE
```

**W1 NIE WOLNO ROZPOCZĄĆ** bez explicit Owner GO po W0 Review.

---

## 14. BLOCKERS (reference — implementation scope W1+)

| # | Sev | Blocker |
|---|-----|---------|
| B1 | P0 | Dual orchestrators CURRENT |
| B2 | P0 | Labor/Material remap vs post-identity |
| B3 | P0 | Identity tuple completeness Slice D vs F5 |
| B4 | P1 | Orchestra persist step not wired |
| B5 | P1 | OD-05 manual write path |
| B6 | P1 | KNR-WC outside Host sequence CURRENT |
| B7 | P2 | Legacy bid panel parallel |
| B8 | P2 | Package LS-only |

---

## 15. FUTURE FILES (scope reference — NO TOUCH W0)

| Fala | Pliki (przyszły zakres) |
|------|-------------------------|
| W1 | `IkEntryHost.tsx`, `ik-entry-p2-ingest-latch.ts`, NEW `orchestra-engine` glue |
| W2 | `ik-labor-expert.ts` caller, `ik-material-expert.ts` caller, `tender-offer-boq-mapping.ts`, `multi-dwelling/store.ts`, `ik-knr-owner-mapping.ts` |
| W3 | `chief-session/engine.ts`, `chief-wire-adapters/assemble.ts` |
| W4 | `chief-orchestrator/run.ts`, `offer-expert/analyze.ts` |
| W5 | `knr-wc-identity-bridge-queue.ts`, Hub panels |

---

## 16. Korekty audit §12 — checklist W0

| # | Korekta | Sekcja DF | Obecna |
|---|---------|-----------|--------|
| 1 | Identity tuple completeness | §4.2 | ✓ |
| 2 | Labor/Material TRUSTED preserve (A+B) | §6 | ✓ |
| 3 | Classification po PHASE 3 | §5 | ✓ |
| 4 | Orchestra vs SSOT §2 | §1 | ✓ |

---

```text
OWNER GO = NOT GRANTED
IMPLEMENTATION = FORBIDDEN (W0)
W1+ = FORBIDDEN bez explicit OWNER GO po Owner Review
```
