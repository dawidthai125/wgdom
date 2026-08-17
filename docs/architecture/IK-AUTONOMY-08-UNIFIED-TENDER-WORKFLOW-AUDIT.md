# IK AUTONOMY-08 — Unified Autonomous Tender Workflow · AUDIT

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT` |
| **Status** | **AUDIT COMPLETE** · **NO IMPLEMENT** · **NO DESIGN FREEZE** · **NO ARCH REVIEW** · **NO COMMIT** |
| **Date** | 2026-08-17 |
| **Mode** | AUDIT ONLY · REUSE FIRST · ZERO code · ZERO settings · ZERO Research HTTP · ZERO business writes |
| **Production** | **2.66.92** / **`0f994437`** · docs close A07 **`6165029f`** · tip [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Closed EPICs (baseline — do not reopen)** | **A05** P5/P6 `AUTO\|OFF\|ON` · **A06** P7 · **A07** P8 · all PRODUCTION VERIFIED / CLOSED |
| **This EPIC** | AUTONOMY-08 **AUDIT ONLY** · wait OWNER REVIEW |

```text
NAJWAŻNIEJSZE PYTANIE
Czy obecny IK może zostać doprowadzony do modelu
  ONE IK SWITCH → AUTONOMOUS TENDER WORKFLOW
  → AUTOMATIC RESEARCH ON PRICE MISS
  → OWNER REVIEW WHEN NEEDED
  → ACCEPT / REJECT / RECALCULATE
  → ACCEPTED PRICE PERSISTENCE
  → POSITION COST → BID → RISK → FINAL BID PROPOSAL
  → OWNER FINAL APPROVAL
wyłącznie przez reuse silników + bindingów + uporządkowanie
settings / state transitions + brakujące Owner Gates,
BEZ budowania nowego systemu od zera?

ANSWER = PARTIAL

PIERWSZY BRAKUJĄCY ELEMENT (nie nowy engine):
  IK ON nie oznacza unified workflow.
  Binding Documents→BOQ istnieje, ale NIE jest aktywowany
  przez ikEntryEnabled. Extra gate: ikAutoIngestEnabled
  default OFF. To jest FIRST TRUE AUTONOMY BREAK
  na ścieżce od dokumentu (target step 2).

LIVE SUPER-GATE (produkcja, nie luka silnika):
  ikEntryEnabled live KV = false → IkEntryHost nie MODE A.
  A08 tego NIE zmienia.
```

**Nie** claimowano live walk / Research HTTP / Accept / Price Commit / Tender mutation. Paczka VII (A07 PV): BOQ READY / 159 / CatalogWork **471** — tylko kontekst. Ten audyt **nie** pisał KV.

---

## 1. EXECUTIVE SUMMARY

IK **nie** jest już zbiorem niezależnych techników wyłącznie przez przypadek kodu — silniki P2–P8 **istnieją** i są **zbindowane** w `IkEntryHost`. IK **jest** zbiorem niezależnych techników **przez kontrakt ustawień i UI**: Super Admin steruje P2/P3/P4/P5/P6/P7/P8 + Research osobnymi dźwigniami.

Perspektywa A05–A07 (read-only MODE A, Owner poza hostem) **pozostaje prawdziwa dla zamkniętych EPIC-ów**. AUTONOMY-08 **nie** reinterpretuje A05/A06/A07. Zmienia **cel produktu**: automation ≠ brak Owner Gate. Owner Gate **ma być** częścią docelowego IK.

| Co już jest | Czego nie ma |
|-------------|--------------|
| Document Expert zawsze (gdy host zamontowany) | Jeden IK master contract = „włącz IK → prowadź przetarg” |
| NG-02 ingest **engine** + persist local/cloud | Ingest **aktywowany** przez IK ON (extra `ikAutoIngestEnabled`) |
| Classification A1 przy Master BOQ READY | Formalna state machine przetargu IK |
| P5/P6 MODE A AUTO (A05) — internal-first, PRICE MISS wykrywany | Auto Research on PRICE MISS (MODE B = checkbox `=== true`) |
| Research engines + candidate + evidence | Owner Review **w** Expert Conversation (per linia) |
| Accept SSOT: OUR RATE / Price Memory / Market Quotes | Accept jako następstwo IK proposal w hoście; Accept → recompute Position Cost |
| Composite `computePositionCost` (leaf) | Composite → P7 (`feedsP7Bid=false`) |
| P7 in-memory Bid proposal (A06) | Final Bid persist + Owner Accept oferty w IK |
| P8 in-memory Risk/Validation/DW prepare (A07) | P8 `canApprove` = display; persist = Decision Workspace + D/Session |
| Decision Persist / `setOwnerDecision` (warstwa D/Chief) | IK Owner Gate niezależny od D |
| Identity KEEP GAP + mapping table (Owner-curated) | Candidate identity → Owner Accept w IK conversation |
| Admin: 10+ dźwigni technicznych | Jeden przełącznik IK + Przetargi ON/OFF |

**Werdykt produktowy:** **PARTIAL**. Nie trzeba nowego TendersModule / Catalog / Evidence / Accept / Bid engine. Trzeba **unifikacji aktywacji**, **auto Research-on-miss → proposal (nie Accept)**, **Owner Gates w IK**, **łańcucha persist-after-accept → Position Cost → Bid**, **ukrycia dźwigni P2–P8** przy zachowaniu enumów A05–A07 jako warstwy wewnętrznej.

**D / Chief** = osobna warstwa orchestration (TM-01). P5–P8 **nie** wymagają D. Final Bid **proposal** powstaje bez D. Final Bid **Owner Accept persist** dziś żyje w Decision Workspace (D/Session), nie w `IkEntryHost`.

---

## 2. CURRENT PRODUCTION BASELINE

| Pole | Wartość | Źródło |
|------|---------|--------|
| UI / `version.json` | **2.66.92** | A07 PV · [`09`](../AI/09_PRODUCTION_BASELINE.md) |
| Feature commit | **`0f994437`** | A07 impl |
| Docs commit (A07 close) | **`6165029f`** | origin/main (docs; nie bumpuje `version.json`) |
| AUTONOMY-05 | COMPLETE / CLOSED | P5/P6 `IkE2eMode` · B-POLICY · Research CONDITIONAL |
| AUTONOMY-06 | COMPLETE / CLOSED | P7 `ikF5E2eEnabled` · `runIkP7PositionCostBid` READ-ONLY |
| AUTONOMY-07 | COMPLETE / CLOSED | P8 `ikRiskDecisionE2eEnabled` · `runIkP8RiskDecision` READ-ONLY |
| Code defaults P5/P6/P7/P8 | `"AUTO"` | `defaultAppSettings()` |
| Code default `ikEntryEnabled` | `true` | `defaultAppSettings()` |
| Load trap | LS/KV **bez klucza** → `parsed.ikEntryEnabled === true` → **false** | `loadAppSettingsLocal` |
| Live KV (A07 PV, nie odświeżane tu) | `ikEntryEnabled=false` · P7 `"AUTO"` · P8 stored false→AUTO · Research P5/P6 false · D **true** (PRE-EXISTING F4) | A07 PV READ-ONLY |
| P2 ingest / P3 identity / P4 Chief | default **false** | SOURCE |
| CatalogWork | **471** | A07 PV |
| P1 | CLOSED · `mat.inv.*` blocked | KEEP |
| P2 identity | KEEP GAP | KEEP |
| Composite | CLOSED · `feedsP7Bid=false` | KEEP |

A08 **nie** zmienia baseline. Live Entry OFF = **configuration**, nie missing engine.

---

## 3. CURRENT IK ARCHITECTURE

Warstwy (REUSE — nie duplikować):

```text
TenderDetailPage (/przetarg)
  ├─ ikEntryOn → IkEntryHost
  │     ├─ P2  runIkNg02IngestBridge          (gate: ikAutoIngestEnabled)
  │     ├─     runIkDocumentExpert            (zawsze)
  │     ├─ P3  runIkMasterBoqIdentityCoverage (gate: ikIdentityCoverageEnabled)
  │     ├─ P5  runIkMasterBoqLaborExpert      (gate: Entry ∧ AUTO|ON)
  │     ├─ P6  runIkMasterBoqMaterialExpert   (gate: Entry ∧ AUTO|ON)
  │     ├─     runIkCompositeBothHold         (P5∧P6 ∧ BOQ READY)
  │     ├─ P7  runIkP7PositionCostBid         (gate: Entry ∧ AUTO|ON)
  │     └─ P8  runIkP8RiskDecision            (gate: Entry ∧ AUTO|ON; Chief optional)
  ├─ P4 Chief session (TenderDetailPage: D ∨ ikChiefWiringEnabled)
  └─ DecisionWorkspaceHost (D / Session / Decision LS — NIE IkEntryHost)
```

| Komponent | Plik | Rola |
|-----------|------|------|
| Flag seam | `src/lib/intelligent-estimator/ik-entry-flag.ts` | Entry / P2–P8 active seams |
| Settings | `src/lib/app-settings.ts` | SSOT `kw-app-settings` |
| Host | `src/app/intelligent-estimator/IkEntryHost.tsx` | Jedyny auto-call P2–P8 |
| Conversation VM | `src/lib/intelligent-estimator/ik-entry-conversation.ts` | EC facts · **brak** Owner action buttons |
| Public exports | `src/lib/intelligent-estimator/index.ts` | Classification + flags + reports |
| Compile sentinels | `IkEntryHost` | `AUTO_INGEST` / `EXECUTE_RESEARCH` / `RUN_RATE_EXPERTS` / `IDENTITY_COVERAGE` = **false** |

**Nie** ma jednego sequential orchestratora „krok N po kroku N−1”. Host odpala **równoległe** `useEffect` / `useMemo` za osobnymi flagami. Composite **nie** karmi P7. P7 **nie** czeka na Accept. P8 **nie** czeka na Final Bid persist.

---

## 4. CURRENT ADMIN SETTINGS INVENTORY

Źródło: `src/lib/app-settings.ts` + UI `src/app/AdminSettingsModal.tsx` (Super Admin ⚙ Moduły).

### 4.1 Przetargi / IK / D (boolean)

| Key | Type | Default (code) | Load (LS parse) | Merge | UI | Runtime |
|-----|------|----------------|-----------------|-------|-----|---------|
| `tendersTabForStaffEnabled` | boolean | `false` | `=== true` | remote explicit | checkbox | `adminCanViewTendersTab` · Super Admin bypass |
| `expertAiDecydentEnabled` (D) | boolean | `false` | `=== true` | remote explicit true/false else local | checkbox | Chief Session / Dual Outcome / DW (TM-01) |
| `ikEntryEnabled` | boolean | `true` | `=== true` (**absent → false**) | remote explicit | checkbox | montuje `IkEntryHost` |
| `ikAutoIngestEnabled` (P2) | boolean | `false` | `=== true` | remote explicit | checkbox | `isIkP2DocumentsBoqActive` |
| `ikIdentityCoverageEnabled` (P3) | boolean | `false` | `=== true` | remote explicit | checkbox | diagnostic coverage |
| `ikChiefWiringEnabled` (P4) | boolean | `false` | `=== true` | remote explicit | checkbox | Chief-under-IK na `TenderDetailPage` |
| `ikLaborResearchEnabled` | boolean | `false` | `=== true` | remote `=== true` | checkbox | MODE B Labor |
| `ikMaterialResearchEnabled` | boolean | `false` | `=== true` | remote `=== true` | checkbox | MODE B Material |

### 4.2 A05–A07 `IkE2eMode`

| Key | Type | Default | Parse | Normalize | Merge | UI | Runtime |
|-----|------|---------|-------|-----------|-------|-----|---------|
| `ikLaborE2eEnabled` (P5) | `IkE2eMode` | `"AUTO"` | `parseIkE2eMode` | missing/malformed → AUTO | `mergeIkE2eMode` **OFF wins** | select AUTO/OFF/ON | MODE A Labor |
| `ikMaterialE2eEnabled` (P6) | `IkE2eMode` | `"AUTO"` | idem | idem | idem | select | MODE A Material |
| `ikF5E2eEnabled` (P7) | `IkE2eMode` | `"AUTO"` | idem | idem | idem | select | P7 Bid calc |
| `ikRiskDecisionE2eEnabled` (P8) | `IkE2eMode` | `"AUTO"` | idem | idem | idem | select | P8 Risk/DW prepare |

**B-POLICY (LOCKED A05–A07):** `true` → ON · `false` → AUTO · missing → AUTO · malformed → AUTO. **OFF wins** w merge. Research **nigdy** z raw enum (`=== true` only).

**Hydration:** `syncAppSettingsFromCloud` → `mergeAppSettings` → `saveAppSettingsLocal`. Save: `saveAppSettings` → LS + `persistKey(APP_SETTINGS_KEY)`.

**Tests:** `test-ik-autonomy-05-explicit-auto-off-on.mjs` · `test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` · `test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` + flag harnessy MIGRATION-01.

**Migration:** te same klucze; brak nowej flagi A05–A07. Boolean legacy P5–P8 → B-POLICY. **Nie** migracja danych katalogu.

---

## 5. CURRENT IK ENTRY FLOW

```text
TenderDetailPage
  ikEntryOn = isIkEntryEnabled()
  IF false → brak IkEntryHost (workspace bez first-screen NG-10; P10 usunął Gate)
  IF true  AND tab === "przetarg"
    → IkEntryHost(item, onUpdate, pipelineIngest, chiefSession?)
```

| Warunek | Skutek |
|---------|--------|
| `ikEntryEnabled` false (live prod) | Host **nie** montuje · P5–P8 MODE A **nie** biegną w IK |
| Host zamontowany | Document Expert **zawsze** |
| `onUpdate` absent | P2 ingest **nie** startuje (host wymaga callback) |
| Pipeline `dossierBuilding` / `dossierEnriching` | P2 czeka |
| Compile `IK_ENTRY_SHELL_*` | pozostają `false` — runtime = AppSettings |

Staff bez `tendersTabForStaffEnabled`: nie wchodzą w Przetargi (Super Admin zawsze). To **dostęp do modułu**, nie silnik IK.

---

## 6. DOCUMENT → BOQ FLOW

| Element | Status |
|---------|--------|
| Discovery / ZIP / ATH | NG-02 pipeline (`useTenderPipelineRuntime`) — **poza** IK flags |
| Document Expert | `runIkDocumentExpert` — read-only facts (dokumenty, BOQ status, linie) |
| Ingest engine | `runIkNg02IngestBridge` · `needsIkNg02Ingest` |
| Binding | `IkEntryHost` `useEffect` gdy `isIkAutoIngestEnabled()` |
| Write | `onUpdate(patch, { persist: "local" })`; cloud gdy `extractedLineCount > 0` |
| **Jedyny write w hoście** | ten ingest patch |

**Gate:** `isIkP2DocumentsBoqActive` = Entry ∧ `ikAutoIngestEnabled === true`. **IK ON sam nie robi Documents→BOQ.**

Gdy BOQ już READY (Paczka VII): ingest skippable (`needsIkNg02Ingest` false). Target flow od **nowego** dokumentu: ten krok jest krytyczny.

---

## 7. CLASSIFICATION FLOW

| Element | Plik | Kiedy |
|---------|------|-------|
| A1 plane | `classification-gate.ts` · `classifyEstimatorPricingPlane` | Labor/Material experts + Composite |
| Owner map | `owner-classification-map.ts` | stała mapa Owner |
| EC | `ik-entry-conversation.ts` | gdy Master BOQ READY |
| P3 Identity Coverage | `ik-identity-coverage.ts` | extra lever default OFF — **nie** na critical path P5/P6 |

Classification **istnieje** bez P3. P3 = diagnostyka pokrycia tożsamości, nie gate kosztu.

Research **zabroniony** dla COMPOUND / UNKNOWN (`assertLaborResearchAllowed` / `assertMaterialResearchAllowed`).

---

## 8. LABOR FLOW

Engine: `runIkMasterBoqLaborExpert` (`ik-labor-expert.ts`).

```text
BOQ READY
  → identity / classification
  → OUR RATE / Work Catalog / internal-first semantic match
  → INTERNAL_SEMANTIC_HIT | INTERNAL_REVIEW | MISS | STALE_TREATED_AS_MISS
  → IF researchKey AND executeResearch === true → MODE B HTTP
  → ELSE RESEARCH_SKIPPED (MISS nadal MISS)
```

| Binding | `IkEntryHost` · `isIkP5LaborE2eActive()` · `executeResearch: isIkP5LaborExecuteResearchActive()` |
| MODE A | AUTO/ON · `enableInternalFirst: true` · HTTP=0 |
| MODE B | Entry ∧ E2E active ∧ `ikLaborResearchEnabled === true` |
| Accept | **nie** w hoście — `acceptWorkRateResearchCandidate` |

---

## 9. MATERIAL FLOW

Engine: `runIkMasterBoqMaterialExpert` (`ik-material-expert.ts`).

```text
BOQ READY
  → identity (P5.9 PRODUCT_IDENTITY_GAP KEEP)
  → Price Memory / MARKET
  → HIT | MISS
  → Phase2 DIY HTTP tylko executeResearch === true
  → nigdy auto-Accept · nigdy Purchase / company knowledge
```

P1: `isInvoicePurchaseMaterialKey` / `mat.inv.*` → HARD-FORBID research.

---

## 10. INTERNAL CATALOG / PRICE MEMORY FLOW

| SSOT | Silnik | Użycie IK MODE A |
|------|--------|------------------|
| Work Catalog / OUR RATE | `work-catalog/*` · `internal-first-semantic-match.ts` | Labor HIT |
| Price Memory / Product Quotes | `price-intelligence/*` · `commitMarketQuotesImport` | Material HIT |
| CatalogWork 471 | cloud store | READ w P5–P8; WRITE tylko Accept paths **poza** hostem |

HIT → użyj ceny (target steps 7–8) **już działa** w MODE A, o ile host + BOQ READY.

---

## 11. PRICE MISS DETECTION

**Istnieje** w ekspertach:

| Sygnał | Labor | Material |
|--------|-------|----------|
| Internal miss | `MISS` / `STALE_TREATED_AS_MISS` / `NO_INTERNAL_MATCH` | MISS / no PM quote |
| Ambiguous | `INTERNAL_REVIEW` (Owner, **bez** auto research invent) | identity gap / low confidence |
| Research key | ustawiany; HTTP tylko `executeResearch` | Phase2 tylko `executeResearch` |

**Brak:** „PRICE MISS → automatycznie MODE B”. Obecnie MISS + `executeResearch=false` → `RESEARCH_SKIPPED`.

To jest **semantyczna** luka targetu (krok 10), **po** Documents→BOQ.

---

## 12. CURRENT RESEARCH FLOW

| | Labor | Material |
|-|-------|----------|
| Engine | `runSelectiveWorkRateResearch` · `labor-research-bridge.ts` | `executeMaterialResearchPhase2` · `market-material-research-orchestrate.ts` |
| Admin gate | `ikLaborResearchEnabled === true` | `ikMaterialResearchEnabled === true` |
| Default | **OFF** | **OFF** |
| HTTP | tak, gdy MODE B | tak, gdy MODE B |
| Auto-Accept | **NIE** | **NIE** |

Docelowa semantyka A08 (IK sam wykrywa MISS i odpala Research → proposal) **nie** jest obecnym kontraktem. Obecny kontrakt A05: Research = osobny checkbox Administratora.

---

## 13. RESEARCH CANDIDATE FLOW

Kandydat **istnieje** (rate, unit, observations / quote, confidence, source). Prezentacja:

| Powierzchnia | Status |
|--------------|--------|
| Biblioteka Robót / Market Sync UI | pełny Accept/Reject staging |
| `labor-research-bridge` | Accept → OUR RATE + `saveWorkCatalogRouted` |
| Material orchestrate | Accept → Quotes / PM |
| Expert Conversation (IK host) | **facts / status strings** · **brak** przycisków AKCEPTUJ / PRZELICZ / ODRZUĆ per linia |

Candidate ≠ zaakceptowana pozycja. **Zgodne** z targetem („Research NIE oznacza Accept”). **Brak** IK Owner Review UX.

---

## 14. CURRENT ACCEPT FLOW

| Mechanizm | Istnieje | Plik | Funkcja | Write | SSOT | Idempotent | Reuse w IK host |
|-----------|----------|------|---------|-------|------|------------|-----------------|
| Labor research Accept | TAK | `work-rate-accept.ts` | `acceptWorkRateResearchCandidate` | OUR RATE history + OUR | CatalogWork | partial (re-accept nadpisuje OUR) | TAK — **nie zbindowane** w host |
| Labor persist | TAK | `labor-research-bridge.ts` · `useWorkCatalog.ts` | `saveWorkCatalogRouted` | cloud/LS catalog | CatalogWriteMode | routed | TAK |
| Material research Accept | TAK | `market-material-research-orchestrate.ts` | `acceptMaterialResearchCandidate` | Quotes via commit | Price Memory | commit noop possible | TAK — nie w host |
| Manual market Accept | TAK | `manual-price-research.ts` | Owner accept → `commitMarketQuotesImport` | Quotes | PM | commit statuses | TAK |
| Market Sync Accept | TAK | `market-sync/*` | staging Accept ≠ Publish | staging then Quotes | PM | staging vs publish | osobny Super Admin flow |
| Decision Approve | TAK | `DecisionWorkspaceHost.tsx` | `recordDecision` + `setOwnerDecision` | decision persist + tender owner decision | DW / tenders | hydrate per case | **warstwa D**, nie IK line Accept |
| IK EC line Accept | **NIE** | — | — | — | — | — | BRAK |

---

## 15. CURRENT PRICE COMMIT FLOW

**„Price Commit” w A05–A07 copy** = persist zaakceptowanej ceny do SSOT (OUR RATE / Product Quotes), **nie** osobny przycisk w `IkEntryHost`.

| Pytanie | Odpowiedź |
|---------|-----------|
| 1. Czym jest | `commitMarketQuotesImport` (materiały) + OUR RATE write w `acceptWorkRateResearchCandidate` (robocizna). Market Sync: Accept staging **potem** Confirm Publish. |
| 2. Gdzie zapisuje | Work Catalog store + cloud (`saveWorkCatalogRouted`) · Product Quotes / PM |
| 3. SSOT | CatalogWork OUR RATE · Price Memory Quotes · **nie** `companyPricePln` · **nie** invoice `mat.inv.*` |
| 4. Czy Accept może być triggerem | **TAK** — Labor: Accept **już** pisze OUR. Material research Accept **już** woła commit. Manual research: Accept → commit. |
| 5. Dwa kroki? | Labor IK path: 1 krok (Accept = persist). Material Market Sync: **2 kroki** (staging Accept → Publish). Material research Accept: 1 krok commit. |
| 6. Połączenie bezpieczne? | Labor: **już połączone**. Material research: **już połączone**. Market Sync Publish: **nie** scalać z IK line Accept bez AUDIT (kill switch `MARKET_SYNC_PUBLISH_ENABLED`). |
| 7. Blokady | P1 invoice host · unit mismatch · CatalogWriteMode · brak workId/materialKey · Composite GAP ≠ 0 PLN · **host nie woła Accept** |

**Nie** implementować scalenia. Target „Accept → persist → Position Cost” dla Labor/Material research **jest architektonicznie bliski** — brakuje **wywołania z IK Owner Gate** i **recompute** P7 po zapisie.

---

## 16. CURRENT POSITION COST FLOW

| Ścieżka | Binding | Uwaga |
|---------|---------|-------|
| Composite BOTH_HOLD | `runIkCompositeBothHold` gdy P5∧P6 | leaf → `computePositionCost` **NO CHANGE** · GAP ≠ 0 PLN · `feedsP7Bid=false` |
| P7 | `runIkP7PositionCostBid` | **własny** shadow/cutover · **nie** czyta raportu Composite · **nie** czyta P5/P6 reports |
| F5 | `bid-position-cost-cutover.ts` · `computeBidProposalFromPositionCost` | REUSE |

Target „zaakceptowana cena → Position Cost” wymaga albo: (a) Accept zapisze katalog, potem P7 odczyta katalog (dziś P7 i tak czyta catalog READ), albo (b) jawne podanie leaf costs do P7. (a) **reuse** po Accept persist — **brak re-run trigger** po Accept w hoście.

---

## 17. CURRENT P7 BID FLOW

Engine: `runIkP7PositionCostBid` (A06 CLOSED).

| Cecha | Wartość |
|-------|---------|
| Gate | Entry ∧ `ikF5E2eEnabled` AUTO/ON · BOQ READY **lub** OfferBoq lines |
| Output | in-memory `TenderBidProposal` / recommended PLN · status ready/partial/gap/hold |
| Research/HTTP | **0** |
| Catalog/PM write | **0** |
| Final Bid | **OWNER** (komentarz A06 — brak persist oferty) |
| Composite | XOR: `feedsP7Bid=false` |

P7 **przygotowuje** liczbę oferty do EC. **Nie** jest „FINAL BID PROPOSAL” z Owner Gate.

---

## 18. CURRENT P8 RISK / DECISION FLOW

Engine: `runIkP8RiskDecision` (A07 CLOSED).

| Cecha | Wartość |
|-------|---------|
| Gate | Entry ∧ P8 AUTO/ON · **brak** extra BOQ gate |
| Overlay | `applyTenderIntelligenceOverlay` |
| Validation | `analyzeValidationFromDossier` |
| DW VM | `buildDecisionWorkspaceViewModel` in-memory |
| Chief | optional prop; null → Validation HOLD |
| `canApprove` / `canReject` | **display** w EC |
| Persist | **0** z P8 |
| D flip | **nigdy** (`expertAiDecydentFlipped: false`) |

P8 **przygotowuje** dane do decyzji. **Nie** jest Owner Final Approval.

---

## 19. CURRENT FINAL BID FLOW

| Pytanie | Stan |
|---------|------|
| Czym jest | W IK: P7 `TenderBidProposal` in-memory + P8 overlay/DW VM. Poza IK: `computeTenderBidProposal`, PackageGate, Decision Workspace persist, `setOwnerDecision` |
| Gdzie | `ik-p7-position-cost-bid.ts` · `tenders-bid-calculator` · `DecisionWorkspaceHost` |
| Proposal | TAK (P7) |
| Persistence oferty IK | **NIE** w hoście |
| Accept oferty | DW `approve` gdy stack D/Session ON — **nie** IK-only |
| Reject | DW `canReject` display + DW actions |
| Retry / re-analysis | **brak** IK „PRZELICZ OFERTĘ”; re-run P7 przy zmianie BOQ/key w hoście (effect deps) |
| Tender mutation | `setOwnerDecision` mutuje decyzję właściciela w pipeline Przetargów — **nie** auto-submit oferty |
| P7/P8 data enough? | **PARTIAL** — liczby i risk **tak**; Owner Gate + persist + reject/recalc **w IK** **nie** |

Final Bid **nie** oznacza dziś wysłania przetargu. Zgodne z targetem „nie auto-submit”. Brakuje **IK** `[ AKCEPTUJ OFERTĘ ]`.

---

## 20. OWNER DECISION MECHANISMS

| Akcja | Istnieje | Gdzie | Write | Uwaga |
|-------|----------|-------|-------|-------|
| Accept research Labor | TAK | Catalog UI / bridge | OUR RATE | nie EC |
| Accept research Material | TAK | orchestrate / manual research | Quotes | nie EC |
| Reject research (Market Sync staging) | TAK | Market Sync | staging only | nie IK |
| Retry / Recalculate | **NIE** jako IK action | — | — | re-run tylko zmiana flag/BOQ |
| Override / Edit price | Catalog / PM UI | poza IK | catalog | |
| Edit identity | `work-rate-identity-mapping.ts` Owner-curated table | mapping store | **nie** pricing engine | exact_normalized |
| Bid / Decision approve | TAK | `DecisionActionsBar` · `recordDecision` | DW + `setOwnerDecision` | wymaga D/Session stack |
| IK conversation Owner Gate | **NIE** | `ik-entry-conversation.ts` facts only | 0 | P8 canApprove = tekst |

---

## 21. IDENTITY GAP FLOW

P2 KEEP GAP **nie** zatrzymuje całego przetargu. Zatrzymuje **pricing** danej linii (GAP ≠ 0 PLN, Composite `P2_PRODUCT_IDENTITY_GAP`).

| Kontrolka | Plik | Zachowanie |
|-----------|------|------------|
| `cc-w2-zawor-odcinajacy` / `cc-p0c-w1-zawor-odpowietrzajacy` | identity / conversation | `PRODUCT_IDENTITY_GAP` |
| P5.9 | `ik-material-identity-p59.ts` | brak `mat.*` / `cw.product.*` → GAP, **zero invent** |
| Mapping | `work-rate-identity-mapping.ts` | Owner-curated · **przed** fuzzy · ZERO Catalog write z samego mappingu |
| EC | `OWNER_MATERIAL_MAPPING_REQUIRED` | komunikat, nie candidate Accept UX |

**Nie** przywracać `mat.inv.*` → fałszywej identity.

Target „IK proponuje kandydata + Owner Accept identity” — silniki research/candidate **istnieją**; **nie** wolno użyć ich do **wymyślenia** identity. Candidate musi mieć evidence; Owner Accept mapping/tożsamości to **osobny** write od Price Accept. Dziś mapping table **nie** jest IK conversation gate.

---

## 22. P1/P2 SAFETY BOUNDARIES

| Boundary | Status | Nie cofać |
|----------|--------|-----------|
| P1 invoice | `isInvoicePurchaseMaterialKey` / catalog work id | `mat.inv.*` ≠ DIY research ≠ identity |
| Classification | COMPOUND/UNKNOWN → no research | |
| P2 KEEP GAP | zawór odcinający / odpowietrzający | zero invent `mat.*` |
| Composite | GAP ≠ 0 PLN · zero auto-Accept | |
| Evidence → OUR RATE | tylko Candidate + Owner Accept | |
| `companyPricePln` | nie OUR RATE | |
| A05 Research | `=== true` never enum | |

A08 **musi** zachować te granice przy auto Research-on-miss (tylko MISS z dozwoloną płaszczyzną).

---

## 23. D / CHIEF DEPENDENCY AUDIT

**Oddziel:** IK AUTONOMY ≠ CHIEF / D / DECIDED.

| Pojęcie | Flaga / plik | Rola |
|---------|--------------|------|
| **D** | `expertAiDecydentEnabled` | Dual Outcome · Session master (AppSettings) |
| Chief Session enable | `isChiefOrchestratorSessionEnabled` (`chief-session/flag.ts`) | LS `"0"` > LS `"1"` > D `=== true` > false |
| Chief stack UI | `isChiefSessionStackEnabled` | alias D Session |
| Decision Workspace | `isDecisionWorkspaceStackEnabled` | Decision flag (coupled to D Session P0) |
| Module access | `tendersTabForStaffEnabled` | **nie** implikuje D |
| P4 | `ikChiefWiringEnabled` | Chief-under-IK na `TenderDetailPage` (`dChiefEnabled \|\| p4ChiefEligible`) · **nie** flip D |
| P5/P6/P7/P8 | niezależne od D | komentarze flag + A05–A07 tests |
| P8 Chief | optional `chiefSession` prop | HOLD Validation gdy null · **nie** startuje Chief |
| Final Bid proposal | P7 | **bez D** |
| Final Bid Owner persist | DW Host | **z** D/Session |

**Wniosek:** D **nie** jest wymagane do docelowego IK workflow (ingest → cost → bid proposal → risk prepare). D **jest** obecną ścieżką **persistencji decyzji oferty**. Target IK Owner Final Approval **może** reuse `recordDecision` / `setOwnerDecision` **albo** dodać IK-only persist — to decyzja PLANU, nie audytu. **Nie** projektować bypassu D. **Nie** włączać D.

Live KV D=true (A07 F4) = PRE-EXISTING · A08 nie rusza.

---

## 24. BUSINESS WRITE AUDIT

A08 **nie wykonał** żadnego write. Mapa (istniejące ścieżki):

| Write | Trigger dziś | SSOT | W IkEntryHost? |
|-------|--------------|------|----------------|
| P2 ingest patch | auto gdy P2 ON + needs ingest | tender item KV/LS | **TAK** (local; cloud if lines) |
| Accept Labor | Owner w Catalog/bridge | OUR RATE / CatalogWork | NIE |
| Accept Material | Owner research/manual | Quotes / PM | NIE |
| Market Sync Publish | Super Admin confirm | Quotes | NIE |
| Identity mapping | Owner table ops | mapping store | NIE |
| Decision persist | DW approve | decision + `setOwnerDecision` | NIE |
| P5–P8 reports | — | in-memory only | NIE (brak persist raportu) |
| Final Bid | — | brak IK persist | NIE |
| Research HTTP | MODE B flags | external; wynik w memory/candidate | tylko gdy Research ON |

---

## 25. STATE MACHINE AUDIT

**STATE MACHINE MISSING** — brak formalnego IK tender workflow:

`DRAFT → ANALYZING → WAITING_RESEARCH → WAITING_OWNER → ACCEPTED → RE-CALCULATING → READY_FOR_BID → WAITING_FINAL_APPROVAL → APPROVED`

Istnieją **nieformalne** statusy (nie łączą się w jedną maszynę):

| Warstwa | Statusy | Plik |
|---------|---------|------|
| Ingest | phase started/completed/blocked | `ik-ng02-ingest-bridge` |
| Labor/Material | HIT / MISS / RESEARCH_SKIPPED / INTERNAL_REVIEW | experts |
| Composite | HOLD / GAP codes | `ik-composite-both-hold.ts` |
| P7 | ready / partial / gap / blocked / hold | `ik-p7-position-cost-bid.ts` |
| P8 | ready / partial / gap / hold / needs_review | `ik-p8-risk-decision.ts` |
| DW | `dwUiPhase` · `canApprove` | `decision-workspace-ui` |
| Package | PackageGate | `package-gate.ts` |
| Pipeline NG-02 | dossier building/enriching | `useTenderPipelineRuntime` |

**NIE implementować** state machine w tej turze. Propozycja: PLAN (sekcja 41).

---

## 26. A05 COMPATIBILITY

| Kontrakt | Zachować |
|----------|----------|
| P5/P6 `AUTO\|OFF\|ON` | TAK |
| B-POLICY | TAK |
| OFF wins | TAK |
| Research osobny boolean `=== true` | TAK (nawet jeśli UI ukryje checkbox) |
| MODE A = read-only internal-first | TAK jako **wewnętrzny** tryb; target auto-research = **nowe** użycie MODE B, nie zmiana A05 enum |

Po uproszczeniu Admin UI enumy **muszą pozostać** (hidden/internal). **Nie** hard-delete w pierwszym EPIC. Zastąpienie jednym master contract **może** *ustawiać* te enumy, nie usuwać ich z `AppSettings`.

---

## 27. A06 COMPATIBILITY

P7 `ikF5E2eEnabled` AUTO/ON = in-memory bid. OFF = kill-switch. Research/Accept/Final Bid persist **poza** P7. `feedsP7Bid=false` UNCHANGED.

Hidden/internal: **tak**. Master IK ON **może** implikować P7 AUTO (już default). Nie regresować OFF wins.

---

## 28. A07 COMPATIBILITY

P8 `ikRiskDecisionE2eEnabled` AUTO/ON = in-memory prepare. Bez BOQ gate. Bez D flip. `canApprove` display.

Hidden/internal: **tak**. Master IK ON **może** implikować P8 AUTO (już default). Final Bid Owner Gate **nie** jest P8 write — nie psuć A07 read-only.

---

## 29. SETTINGS PERSISTENCE / MIGRATION AUDIT

| Ścieżka | Zachowanie |
|---------|------------|
| Default object | Entry **true** · P2/P3/P4/Research **false** · P5–P8 **AUTO** |
| LS load boolean IK | `=== true` → **absent key = false** (Entry default w kodzie **nie** wygra, jeśli LS ma stary obiekt) |
| Cloud merge boolean | remote explicit wins |
| Cloud merge E2E | OFF wins; else remote parsed; else local AUTO |
| Save | pełny obiekt `AppSettings` |
| Backward compat A05–A07 | boolean true/false na kluczach E2E |

**Ryzyko unifikacji:** nowy „IK master” jako **nowa flaga** łamie REUSE FIRST. Bezpieczniej: **semantyka** `ikEntryEnabled` (lub para Przetargi+IK) + wewnętrzne ustawienie P2/Research **bez** nowego klucza — decyzja PLANU.

Live `ikEntryEnabled=false` + load trap = powód, dla którego tip „default ON” ≠ produkcja.

---

## 30. ADMIN UI SIMPLIFICATION AUDIT

Obecny Super Admin panel (fragment IK): Przetargi staff · D · IK Entry · P2 ingest · P3 identity · P4 Chief · P5 E2E + Research · P6 E2E + Research · P7 · P8.

| Opcja | Werdykt audytu |
|-------|----------------|
| **A** całkowite usunięcie kluczy P2–P8 | **NIE w pierwszym EPIC** — regresja A05–A07, merge, testy, kill-switch OFF |
| **B** hidden/internal compatibility | **TAK** — enumy + Research booleans + P2/P3/P4 zostają w `AppSettings` |
| **C** jeden IK runtime contract | **TAK jako semantyka** — IK ON = host + (docelowo) auto-etapy bez decyzji; OFF = brak hosta dla staff; Super Admin bypass modułu już jest na `tendersTabForStaffEnabled` |
| **Kombinacja** | **B+C najbezpieczniejsza** |

Kill-switchy techniczne: **nie** w codziennym Admin UI. **Nie** usuwać automatycznie. Kandydaci internal-only: P3 diagnostic, P4, P5–P8 enum, Research booleans, compile sentinels. Historyczne: NG-10 Gate (już usunięty P10). Market Sync publish kill-switch = **osobny** produkt, nie IK daily UI.

Docelowy UX (propozycja, nie implementacja):

```text
PRZETARGI          [ ON/OFF ]   = tendersTabForStaffEnabled
                                  Super Admin zawsze wchodzi

Inteligentny Kosztorysant
  [ ON/OFF ]                    = ikEntryEnabled (semantyka rozszerzona w PLANIE)
  „Po włączeniu IK automatycznie prowadzi dostępne etapy.
   W miejscach wymagających decyzji biznesowej zatrzyma się
   i poprosi o akceptację.”
```

D **nie** należy do tego zdania. D zostaje osobno (legacy/future Chief), default/UI bez zmian w A08.

---

## 31. REUSE-FIRST ASSESSMENT

| Potrzeba targetu | Istniejący mechanizm | Wystarcza? |
|------------------|----------------------|------------|
| Ingest docs→BOQ | `runIkNg02IngestBridge` | Engine TAK · activation NIE (P2 lever) |
| Classification | `classification-gate` | TAK |
| Labor/Material MODE A | experts + A05 AUTO | TAK |
| Catalog / PM search | internal-first / PM | TAK |
| PRICE MISS detect | expert statuses | TAK |
| Auto research | MODE B engines | Engine TAK · trigger NIE (checkbox) |
| Candidate + evidence | research result types | TAK |
| Owner Accept price | `acceptWorkRate*` / `acceptMaterial*` | TAK · surface NIE (EC) |
| Price persist | Accept already persists Labor/Material research | TAK |
| Position Cost | `computePositionCost` + P7 cutover | TAK · chain po Accept NIE |
| Bid proposal | P7 `computeTenderBidProposal` | TAK |
| Risk / validation | P8 | TAK (prepare) |
| Final Owner Approve | DW `recordDecision` | TAK w warstwie D · NIE w IK-only |
| Identity candidate Accept | mapping table + GAP messages | PARTIAL — brak IK UX; **nie** invent |
| State machine | — | BRAK (nowy kontrakt stanów, nie nowy engine) |
| Nowy orchestrator | — | **NIE proponować** — rozszerzyć `IkEntryHost` + flag seam |

**Dlaczego PARTIAL, nie YES:** brakuje **aktywacji i bramek Owner**, nie silników. To nadal praca produktowa (PLAN + kilka EPIC-ów), nie greenfield.

**Dlaczego nie NO:** zakaz „nowy TendersModule / Catalog / Accept / Bid engine” jest spełnialny.

---

## 32. MISSING BINDINGS

1. IK ON → P2 ingest (`isIkP2DocumentsBoqActive` extra AND).
2. PRICE MISS → `executeResearch` (dziś tylko Admin checkbox).
3. Research candidate → EC Owner actions.
4. EC Accept → istniejące `accept*` + persist.
5. Post-Accept → re-run Composite/P7 (deps dziś: BOQ/flags, nie catalog write).
6. P8 `canApprove` → DW persist **lub** IK persist (dziś zero).
7. Composite → P7 (`feedsP7Bid=false` — świadomy XOR; zmiana = osobny EPIC).
8. Identity GAP → candidate Owner Accept (bez invent).
9. Reject / Recalculate jako API w IK.
10. Live Entry false vs code default true (load trap + KV).

---

## 33. MISSING STATE TRANSITIONS

Wszystkie target transitions (WAITING_RESEARCH, WAITING_OWNER, RE-CALCULATING, WAITING_FINAL_APPROVAL, APPROVED) — **brak** jako IK SSOT.

Najbliższe surogaty: expert `RESEARCH_SKIPPED` · P8 `needs_review` · DW `canApprove` · ingest `blocked`.

---

## 34. MISSING OWNER ACTIONS (w IK conversation)

| Target | Dziś w IK EC |
|--------|----------------|
| AKCEPTUJ (cena / kandydat) | BRAK |
| PRZELICZ PONOWNIE | BRAK |
| ZMIEŃ / POPRAW | BRAK |
| ODRZUĆ | BRAK |
| AKCEPTUJ OFERTĘ | BRAK (DW poza IK) |
| ODRZUĆ / PRZELICZ OFERTĘ | BRAK |

Istnieją **poza** IK — reuse, nie nowy Accept engine.

---

## 35. MISSING AUTOMATION

| Target krok | Automatyczny dziś? | Warunek |
|-------------|--------------------|---------|
| 2 Ingest | NIE | P2 checkbox |
| 3 BOQ | PARTIAL | NG-02 pipeline + ingest |
| 4 Classification | TAK | gdy host + BOQ READY |
| 5–6 Labor/Material MODE A | TAK | Entry + AUTO (live Entry OFF blokuje) |
| 7–8 Cena znana | TAK | MODE A HIT |
| 10 Auto research | NIE | Research checkbox |
| 12 Owner Review | NIE w IK | |
| 16–18 Position/Bid/Risk | TAK calc | P7/P8 AUTO · nie po Accept |
| 19–22 Final Bid Owner | NIE w IK | DW + D |

---

## 36. PROPOSED TARGET WORKFLOW

(nie implementować)

```text
Dokument
  → ingest (auto, bez decyzji biznesowej)
  → BOQ
  → classification
  → Labor/Material internal-first
  → HIT  → użyj ceny
  → MISS → Research (auto) → candidate + evidence + confidence
         → OWNER REVIEW (Accept / Reject / Recalculate / Edit)
         → Accept → persist OUR RATE / PM → Position Cost
  → Bid calc (P7)
  → Risk / Validation prepare (P8)
  → FINAL BID PROPOSAL
  → OWNER FINAL APPROVAL (Accept / Reject / Recalculate)
  → zaakceptowana oferta (persist decyzji — nie auto-submit)
```

REUSE: istniejące engines. Orchestracja: `IkEntryHost` + jeden kontrakt flag. Owner Gates: nowe **powierzchnie**, stare **funkcje** Accept/DW.

---

## 37. PROPOSED TARGET OWNER GATES

| Gate | Kiedy | Reuse |
|------|-------|-------|
| **G1 Identity / mapping** | PRODUCT_IDENTITY_GAP / INTERNAL_REVIEW | mapping table + candidate **bez invent** |
| **G2 Price** | po Research proposal | `acceptWorkRateResearchCandidate` / `acceptMaterialResearchCandidate` |
| **G3 Final Bid** | po P7+P8 prepare | `recordDecision` / `setOwnerDecision` **lub** cienki IK wrapper |

Nie gate: ingest, classification, MODE A HIT, P7 calc, P8 prepare.

---

## 38. PROPOSED TARGET ADMIN UI

- Przetargi ON/OFF (staff).
- IK ON/OFF + jeden akapit semantyki.
- D **nie** mieszać z IK (osobna linia, bez zmian).
- P2–P8 / Research: hidden (dev/super-debug) lub usunięte z codziennego UI.
- Kill-switch OFF (A05–A07) pozostaje **wewnętrznie** (np. support), nie jako 8 selectów.

---

## 39. PROPOSED SETTINGS ARCHITECTURE

**B+C.**

- Zachować klucze i B-POLICY / OFF wins.
- `ikEntryEnabled` (lub para z Przetargi) = master **widoczny**.
- Docelowo IK ON **implikuje** P2 ingest + MODE B on PRICE MISS **w runtime**, niekoniecznie przez wystawienie checkboxów — implementacja dopiero po PLAN + Owner GO.
- **Nie** nowa flaga `ikUnifiedAutonomousEnabled` bez dowodu, że semantyka Entry nie wystarczy.
- Research booleans mogą zostać `true` wewnętrznie gdy master ON **albo** host przekazać `executeResearch` na MISS bez zapisu settings — PLAN musi wybrać (settings write vs call-site). A08 nie wybiera implementacji.

---

## 40. RISKS

| Risk | Severity | Nota |
|------|----------|------|
| Auto ingest write na złym tenderze | HIGH | jedyny host write; potrzebny istniejący `needsIkNg02Ingest` |
| Auto research HTTP koszt/ToS | HIGH | dziś checkbox właśnie dlatego |
| Auto research na GAP identity | P0 | naruszyłoby P2 KEEP GAP — **tylko MISS z dozwoloną płaszczyzną** |
| Accept bez Owner w „automation” | P0 | Research ≠ Accept musi zostać |
| Scalenie Market Sync Publish z IK Accept | HIGH | dwa kroki celowo |
| Ukrycie OFF kill-switch | MED | A05–A07 compatibility |
| Nowy orchestrator | HIGH | łamie REUSE FIRST |
| Użycie D jako wymaganego gate | MED | zbędne dla calc; mylące dla persist |
| Live Entry false | HIGH | IK ON w kodzie ≠ prod |
| Load trap Entry absent→false | MED | unifikacja UI nie naprawi LS sama |
| Composite↛P7 | MED | oferty mogą ignorować BOTH_HOLD leafs |
| Flip D / settings w A08 | FORBIDDEN | |

---

## 41. REQUIRED PLAN

Następny dokument **tylko po Owner GO** (nie w tej turze):

1. Master contract: co dokładnie robi IK ON (P2? Research-on-miss?).
2. Które Owner Gates (G1/G2/G3) w pierwszym EPIC implementacji.
3. Call-site `executeResearch` vs zapis `ikLaborResearchEnabled`.
4. Czy DW persist jest G3, czy IK-only.
5. Hidden settings vs semantyka bez nowej flagi.
6. State machine minimal (nawet 4 stany) vs ad-hoc statuses.
7. Kolejność EPIC-ów — **nie** zakładać P9.
8. Safety: P1/P2/A05–A07 regression tests.

**NIE:** Design Freeze, Arch Review, implement, default flips, KV writes.

---

## 42. FIRST IMPLEMENTATION BOUNDARY

**IN:** AUDIT document (ten plik).

**OUT (dopóki Owner nie da GO na PLAN):**

- kod, defaults, Admin UI, settings, Research HTTP, Accept, Price Commit, Tender mutation, CatalogWork/PM write, Final Bid write, commit/push/deploy
- nowy engine / nowy orchestrator / nowa flaga bez PLAN
- włączenie D, bypass D, auto-Accept, invent identity
- usunięcie kill-switchy A05–A07

Pierwszy EPIC **implementacji** (propozycja do PLANU, nie start): **unifikacja aktywacji P2 pod IK ON** *albo* **Research-on-miss → proposal w EC** — Owner wybiera po REVIEW. Audyt wskazuje P2 jako **pierwszy break na ścieżce od dokumentu**.

---

## FIRST TRUE AUTONOMY BREAK

Ścieżka: target business flow od **dokumentu**, nie od Paczki VII z BOQ READY. Nie założono P9 / Research / Accept jako pierwszego breaku z góry.

**LIVE SUPER-GATE (produkcja):** `ikEntryEnabled=false` → host nie MODE A. To **ustawienie**, nie brak silnika. A08 nie flipuje.

**FIRST TRUE AUTONOMY BREAK (architektura, gdy IK Entry ON):**

| Pole | Wartość |
|------|---------|
| **STEP** | 2 · Document ingestion (Documents→BOQ) |
| **ENGINE** | `runIkNg02IngestBridge` + `runIkDocumentExpert` |
| **BINDING** | `IkEntryHost` `useEffect` · `isIkP2DocumentsBoqActive()` |
| **CURRENT GATE** | `ikEntryEnabled === true` **AND** `ikAutoIngestEnabled === true` (default **OFF**). Compile `IK_ENTRY_SHELL_AUTO_INGEST=false`. Wymaga `onUpdate`. Czeka na NG-02 dossier idle. |
| **WHY BLOCKED** | Silnik i persist (local/cloud) **istnieją**. IK ON **nie** aktywuje ingest. Extra Admin checkbox = techniczny etap wystawiony użytkownikowi. Target: ingest **bez** decyzji biznesowej. |
| **CATEGORY** | configuration gate / missing activation under master switch |
| **SEVERITY** | **HIGH** na pustym/nowym przetargu · **LOW** gdy BOQ już READY |
| **REUSE** | **YES** — nie nowy parser |
| **OWNER DECISION REQUIRED** | Czy IK ON implikuje auto-ingest (zalecane w targetcie) |
| **RECOMMENDED NEXT STAGE** | OWNER REVIEW → PLAN AUTONOMY-08 (bez implement) |

**Następne breaki (łańcuch, nie pierwszy):**

| # | Step | Break |
|---|------|-------|
| 2 | 10 Research on PRICE MISS | MODE B checkbox; MISS → `RESEARCH_SKIPPED` |
| 3 | 12 Owner Review | brak EC actions; Accept SSOT poza hostem |
| 4 | 15 persist → 16 Position Cost | brak re-run po Accept; Composite↛P7 |
| 5 | 20 Final Bid Owner | P8 display only; persist w D/DW |

Na ścieżce **BOQ już READY** (Paczka VII): krok 2 skippable → **pierwszy costing break = Research-on-miss**. Audyt i tak nazywa P2 pierwszym na **pełnym** target flow od dokumentu.

---

## ANSWER (jednoznacznie)

**PARTIAL**

Pierwszy brakujący element: **IK master activation nie obejmuje Documents→BOQ** (`ikAutoIngestEnabled` extra OFF). Engines są. Binding jest. Gate blokuje automatyczny krok, który w targetcie **nie** wymaga decyzji biznesowej.

---

## FINAL STATUS

```text
AUDIT              = COMPLETE
Document           = docs/architecture/IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md
Code               = ZERO
Settings           = ZERO
Research           = ZERO
Business writes    = ZERO
Commit             = NOT DONE
Push               = NOT DONE
Deploy             = NOT DONE
EPIC               = AUTONOMY-08 AUDIT ONLY
STOP               = czekaj na OWNER REVIEW
```
