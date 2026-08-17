# IK AUTONOMY-08 — Unified Autonomous Tender Workflow · PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN` |
| **Status** | **PLAN READY FOR OWNER REVIEW** · **NO DESIGN FREEZE** · **NO ARCH REVIEW** · **NO IMPLEMENT** |
| **Date** | 2026-08-17 |
| **Mode** | PLAN ONLY · REUSE FIRST · ZERO code · ZERO settings · ZERO Research HTTP · ZERO business writes |
| **Production** | **2.66.92** / **`0f994437`** · A07 docs **`6165029f`** · tip [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Audit** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md) |
| **Owner Decision** | **OD-08-1 = APPROVED** |
| **Closed baseline** | A05 / A06 / A07 PRODUCTION VERIFIED · **nie reinterpretować** |

```text
OWNER REVIEW (audit)     = PASS
OWNER DECISION           = APPROVED (OD-08-1)
PLAN                     = READY FOR OWNER REVIEW
Design Freeze            = NOT CREATED
Architecture Review      = NOT DONE
Implementation           = NOT AUTHORIZED
Code / Settings          = ZERO
Research / Writes        = ZERO
Commit / Push / Deploy   = NOT DONE
EPIC                     = AUTONOMY-08 — PLAN
```

---

## ★ OD-08-1 (LOCKED)

**IK ON implikuje automatyczny Documents → BOQ.** Osobny checkbox `ikAutoIngestEnabled` **nie** jest wymagany do normalnego działania IK.

```text
ikEntryEnabled = ON
  → Document ingestion
  → BOQ preparation
  → Classification
  → Labor / Material MODE A
  → Catalog / Price Memory
  → Research przy PRICE MISS          (NIE w pierwszym boundary)
  → Owner Gates gdy decyzja biznesowa (NIE w pierwszym boundary)
  → Position Cost → P7 → P8
  → Final Bid Proposal
  → Owner Final Approval              (NIE w pierwszym boundary)
```

**Nie oznacza:** Research bez warunku PRICE MISS. **Nie oznacza:** auto-Accept. **Nie oznacza:** flip D. **Nie oznacza:** nowy engine / nowa flaga / nowy orchestrator.

---

## 0. Potwierdzony first break (bez zgadywania)

| Pole | Fakt z kodu |
|------|-------------|
| Engine | `runIkNg02IngestBridge` + `runIkDocumentExpert` |
| Persist | `onUpdate(patch, { persist: "local" })` · cloud gdy `extractedLineCount > 0` |
| Safety skip | `needsIkNg02Ingest(item)` — brak załączników / już są wiersze / heavy done empty → **nie** woła mostu |
| **Helper** | `isIkP2DocumentsBoqActive()` = Entry ∧ `isIkAutoIngestEnabled()` |
| **Host dziś** | `IkEntryHost` **NIE woła** `isIkP2DocumentsBoqActive()` |
| **Host dziś** | `const autoIngestOn = isIkAutoIngestEnabled() === true` |
| Consumers helpera | **tylko testy** (`test-ik-migration-01-p2/p3-implementation.mjs`) |
| Default `ikAutoIngestEnabled` | `false` |
| Compile sentinel | `IK_ENTRY_SHELL_AUTO_INGEST = false` (nie jest runtime gate) |
| Live prod | `ikEntryEnabled=false` → host nie montuje → ingest i tak nie startuje |

**Wniosek:** zmiana samego helpera **bez** zmiany `IkEntryHost` **nie** naprawi first break. Pierwszy boundary = helper **oraz** host.

---

## 1. Jak `ikEntryEnabled` ma implikować P2 ingest

**REUSE:** ten sam `useEffect` w `IkEntryHost`, ten sam `runIkNg02IngestBridge`, ten sam `needsIkNg02Ingest`, ten sam `onUpdate`.

**Target runtime (pierwszy boundary):**

```text
isIkP2DocumentsBoqActive()
  := isIkEntryEnabled() === true

IkEntryHost ingest effect
  := if (!isIkP2DocumentsBoqActive()) skip
     else existing guards (onUpdate, pipeline idle, needsIkNg02Ingest, attemptedRef)
```

**Nie** `|| true`. **Nie** nowa flaga. **Nie** zapis KV. **Nie** flip live `ikEntryEnabled`.

Gdy host jest zamontowany, `ikEntryEnabled` jest już true (mount gate w `TenderDetailPage`). Ingest wtedy startuje automatycznie, o ile `needsIkNg02Ingest`.

**IK OFF:** host nie montuje → ingest IK nie biegnie. To pozostaje kill całego IK (staff bez hosta; Super Admin nadal może wejść w Przetargi i włączyć IK).

---

## 2. Jak wycofać P2 jako osobny Admin UI switch

| Krok | Zakres | Kiedy |
|------|--------|-------|
| A | Host + helper: ingest = IK ON | **pierwszy implementation boundary** |
| B | Usunąć checkbox `data-ik-auto-ingest-toggle` z codziennego UI | **ten sam pierwszy EPIC** (inaczej UI kłamie: „P2 OFF” a ingest i tak idzie) |
| C | Zostawić klucz `ikAutoIngestEnabled` w `AppSettings` | compatibility · **bez migracji** |
| D | P3–P8 / Research / E2E selecty | **nie** w pierwszym boundary — osobny slice UI |

Tekst `ikEntryEnabled` w Admin: podmienić na docelowy opis OD-08-1 (jeden akapit). Przetargi ON/OFF zostaje (`tendersTabForStaffEnabled`). D zostaje osobną linią **bez zmian**.

---

## 3. Co zrobić z `ikAutoIngestEnabled`

**Rekomendacja PLANU: INTERNAL COMPATIBILITY + IGNOROWANY przy decyzji ingest, gdy IK ON.**

| Opcja | Skutek | Werdykt |
|-------|--------|---------|
| A. Zostawić `false` jako kill-switch ingest | Default i live KV są `false` → **nadal blokuje** IK ON | **ODRZUCONE** — przeczy OD-08-1 |
| B. Migracja KV → ustawić `true` gdy Entry ON | settings write · cloud merge · ryzyko rozjazdu LS | **ODRZUCONE** na pierwszy boundary |
| C. Default flip `true` | nie naprawia hosta (host czyta `=== true` dziś, ale live Entry OFF); mylące gdy klucz ignorowany | **NIE potrzebne** |
| D. Klucz zostaje w load/merge/save; **runtime ingest go nie czyta** | zero KV write · backward compat pliku ustawień | **WYBRANE** |
| E. Nowa flaga ingest-kill | łamie REUSE FIRST | **ODRZUCONE** |

`isIkAutoIngestEnabled()` może zostać wyeksportowane dla starych testów / diagnostyki, ale **nie** steruje hostem po pierwszym EPIC.

**Późniejszy internal kill ingest (nie teraz):** jedyny bezpieczny kill = `ikEntryEnabled` OFF. Nie reużywać boolean default-false jako kill.

---

## 4. Backward compatibility

| Powierzchnia | Po pierwszym EPIC |
|--------------|-------------------|
| `AppSettings.ikAutoIngestEnabled` | nadal w typie, default `false`, load `=== true`, merge remote explicit |
| Cloud `kw-app-settings` | **bez migracji**, bez zapisu |
| Stare testy P2 „Entry ON ∧ Auto OFF → P2 inactive” | **muszą** zostać zaktualizowane (to jest zmiana kontraktu P2, nie A05) |
| Paczka VII BOQ READY | `needsIkNg02Ingest` = false → most **nie** pisze (bez regresji) |
| Live `ikEntryEnabled=false` | ingest **nadal nie** startuje (host nie ma) — **bezpieczne na prod bez flipu IK** |
| Document Expert | nadal zawsze gdy host zamontowany |
| NG-02 pipeline | bez zmian |

---

## 5. Jak zachować A05 / A06 / A07

**ZERO zmian** w:

- typie `IkE2eMode`
- `parseIkE2eMode` / `normalizeIkE2eMode` / `mergeIkE2eMode` (OFF wins)
- B-POLICY (`true`→ON, `false`/missing/malformed→AUTO)
- `isIkP5LaborE2eActive` / P6 / P7 / P8 (Entry ∧ AUTO\|ON)
- Research `=== true` (osobne booleany)
- P7/P8 read-only locks (HTTP=0, no Accept, no Catalog/PM write)

P5–P8 przy IK ON **już** biegną, gdy enum = AUTO (code default). Pierwszy EPIC **nie** musi ich ruszać.

Ukrycie selectów AUTO/OFF/ON = **późniejszy** slice UI. Enumy zostają internal.

---

## 6. Jak ukryć P2–P8 w Admin UI

| Slice | UI | Settings keys |
|-------|-----|----------------|
| **08-P0 (pierwszy EPIC)** | ukryć tylko P2 AUTO_INGEST · zaktualizować copy IK Entry | klucze zostają |
| **08-P1 (później)** | ukryć P3, P4, P5 E2E+Research, P6 E2E+Research, P7, P8 | klucze + enumy zostają |
| Docelowo | Przetargi ON/OFF + IK ON/OFF + opis OD-08-1 | D osobno, bez zmian |

Nie usuwać `data-ik-*-toggle` z DOM w 08-P1 bez aktualizacji harnessów, które ich szukają — albo zostawić hidden `data-*` dla testów. Decyzja DF po Owner GO.

---

## 7. Techniczne kill-switche bez UI

| Kill | Dziś | Po unifikacji |
|------|------|----------------|
| IK cały | `ikEntryEnabled` OFF | **zostaje** jedyny biznesowy + techniczny kill hosta |
| P5/P6/P7/P8 | enum OFF (OFF wins merge) | **internal** — KV/support, nie codzienny UI |
| Research | boolean `=== true` | **internal**; docelowo call-site on MISS, nie checkbox |
| P2 ingest | `ikAutoIngestEnabled` | **przestaje być kill** (08-P0) |
| Compile sentinels | `IK_ENTRY_SHELL_* = false` | zostają; nie używać jako drugiego mastera |
| D / Chief LS `"0"` | TM-01 | **nie ruszać** · nie jest IK kill |

---

## 8. Z „moduł + wiele leverów” → „jeden IK switch + internal runtime”

```text
WIDOCZNE (biznes):
  tendersTabForStaffEnabled     → Przetargi ON/OFF (staff; Super Admin bypass)
  ikEntryEnabled                → IK ON/OFF  (master)

INTERNAL (zostają w AppSettings):
  ikAutoIngestEnabled           → leftover po 08-P0 (ignorowany przez host)
  ikIdentityCoverageEnabled     → diagnostic P3
  ikChiefWiringEnabled          → P4 Chief-under-IK (≠ D)
  ikLaborE2eEnabled … P8 enums  → A05–A07 contract
  ikLaborResearchEnabled        → A05 MODE B leftover
  ikMaterialResearchEnabled     → A05 MODE B leftover

OSOBNA WARSTWA (nie IK master):
  expertAiDecydentEnabled       → D / Chief / DW persist
```

Runtime IK ON (gdy host zamontowany, enumy AUTO): Document Expert + (po 08-P0) ingest + classification + P5/P6 MODE A + Composite + P7 + P8 prepare. **Bez** P3/P4/D. **Bez** Research HTTP aż do późniejszego slice.

---

## 9. Jak automatycznie uruchamiać Research przy PRICE MISS

**Nie w 08-P0.**

Engines już:

- wykrywają MISS / `NO_INTERNAL_MATCH` / `STALE_TREATED_AS_MISS`
- HTTP tylko `executeResearch === true`
- HIT / INTERNAL_REVIEW / COMPOUND / UNKNOWN / `mat.inv.*` → **nie** research

Dziś host: `executeResearch: isIkP5LaborExecuteResearchActive()` = Entry ∧ E2E ∧ **checkbox**.

**Docelowy reuse (późniejszy EPIC):** host przekazuje `executeResearch: true` gdy IK ON **albo** helper `isIkResearchOnPriceMissActive()` = Entry ∧ P5/P6 AUTO\|ON — **bez** zapisu `ikLaborResearchEnabled`. Ekspert **i tak** woła HTTP tylko dla linii z researchKey (MISS).

**Nie:** Research checkbox jako decyzja Ownera. **Nie:** `|| true` w ekspercie. **Nie:** research na PRODUCT_IDENTITY_GAP (P2 KEEP GAP).

---

## 10. Jak Research przekazuje wynik do Owner Review

Dziś: candidate + evidence w raporcie eksperta → EC **tekst** (`ik-entry-conversation.ts`). Brak przycisków.

Reuse: typy `WorkRateResearchCandidate` / `PriceCandidate` już mają cenę, unit, source, confidence.

**Brakuje:** powierzchnia Owner Review w EC (nie nowy research engine). To **późniejszy** EPIC (Owner Gates). 08-P0 **nie** buduje UI Accept.

---

## 11. Jak działa obecny Accept

| Path | Funkcja | Persist | Auto z IK? |
|------|---------|---------|------------|
| Labor | `acceptWorkRateResearchCandidate` → `saveWorkCatalogRouted` · `acceptIkLaborResearchAndNotify` | OUR RATE / CatalogWork | **NIE** |
| Material | `acceptMaterialResearchCandidate` → `commitMarketQuotesImport` · `acceptIkMaterialResearchCandidate` | Quotes / Price Memory | **NIE** |
| Market Sync | staging Accept ≠ Publish | staging; Publish = Quotes | osobny Super Admin |

Accept **już jest** naturalnym triggerem persist dla Labor i Material research. Brakuje wywołania z IK EC.

---

## 12. Reject / Retry / Recalculate

| Akcja | IK EC | Poza IK |
|-------|-------|---------|
| Reject ceny research | **BRAK** | Market Sync staging Reject/Defer (`market-sync/accept.ts`) |
| Retry / Research again | **BRAK** API | re-run eksperta przy zmianie BOQ/flag w `useEffect` deps (`laborKey` zawiera `A`/`B`) |
| Recalculate oferty | **BRAK** | `recalculateTenderItemScore` = scoring BZP, **nie** IK bid |
| Edit price | **BRAK** w EC | Catalog / PM UI |
| DW reject | nie w IK host | `DecisionActionsBar` `reject` / `needs_review` / `return` (warstwa D) |

PLAN: **reuse** Accept SSOT; Reject/Retry w IK = **nowe cienkie akcje** na istniejących engine (clear session research keys + re-call expert). Nie nowy orchestrator. **Nie w 08-P0.**

---

## 13. Price Commit jako następstwo Accept

| Pytanie | Odpowiedź PLANU |
|---------|-----------------|
| Czym jest | Labor: zapis OUR w `acceptWorkRateResearchCandidate`. Material: `commitMarketQuotesImport` w Accept research. |
| SSOT | CatalogWork OUR RATE · Product Quotes / PM · **nie** `companyPricePln` · **nie** invoice |
| Write path | Catalog router / Quotes commit |
| Idempotent | Labor re-accept nadpisuje OUR + dopisuje history. Material commit może `noop` |
| Accept = trigger? | **TAK** dla Labor i Material research. **NIE** scalać z Market Sync Confirm Publish |
| 08-P0 | **nie ruszać** |

---

## 14. Identity Gap → Owner Review

P2 KEEP GAP **nie** kończy przetargu. Linia: `PRODUCT_IDENTITY_GAP` / `OWNER_MATERIAL_MAPPING_REQUIRED` · Composite GAP ≠ 0 PLN · reszta linii idzie dalej.

Reuse: `work-rate-identity-mapping.ts` (Owner-curated, exact_normalized, **nie** pricing). Research candidate **nie** wolno użyć do **wymyślenia** `mat.*`.

Docelowy G1: EC pokazuje GAP + opcjonalny candidate **z evidence** → Owner ACCEPT/EDIT/REJECT/RESEARCH AGAIN → dopiero wtedy mapping/cena.

**HARD:** zero `mat.inv.*` → identity. **Nie w 08-P0.**

---

## 15. P7 → P8

Już zbindowane w hoście:

```text
positionCostBid = runIkP7PositionCostBid(...)   // gdy isIkP7F5E2eActive
riskDecision    = runIkP8RiskDecision({
                    p7: positionCostBid,
                    bidProposal: positionCostBid?.proposal ?? null,
                    chiefSession,   // optional; null → Validation HOLD
                  })
```

P8 **czyta** P7 in-memory. **Nie** czeka na Accept. Composite `feedsP7Bid=false` **zostaje** (A06 XOR). 08-P0 **nie** spina Composite→P7.

---

## 16. P8 → Final Bid Proposal

P7 **jest** `TenderBidProposal` (in-memory). P8 dodaje overlay + Validation + DW VM (`canApprove` display).

**Nie ma** osobnego obiektu „FINAL BID” zapisanego w KV z IK. Proposal = P7 report w EC.

---

## 17. Final Bid → Owner Approval

| Warstwa | Stan |
|---------|------|
| IK | tekst `canApprove` / `canReject` · **zero persist** |
| Decision Workspace | `recordDecision` + `setOwnerDecision` — **wymaga D/Session stack** |
| Target | Owner Gate G3 **w IK** bez wymogu D |

PLAN: G3 reuse DW persist **opcjonalnie** w późniejszym EPIC; **nie** uzależniać 08-P0 od D. **Nie** bypass D. **Nie** włączać D.

---

## 18. Owner Gates które już istnieją

| Gate | Istnieje | Warstwa |
|------|----------|---------|
| Labor price Accept | TAK | Catalog / `acceptIkLaborResearchAndNotify` |
| Material price Accept | TAK | `acceptIkMaterialResearchCandidate` |
| Market Sync Accept/Reject/Defer | TAK | staging |
| Identity mapping edit | TAK | mapping table (nie EC) |
| Bid/decision Approve/Reject | TAK | DW + D |
| Skip/Continue conversation | TAK | `ExpertConversationSurface` (UX timeline, nie biznes) |

---

## 19. Owner Gates brakujące (w IK)

| # | Gate | 08-P0? |
|---|------|--------|
| G1 | Identity GAP Accept/Edit/Reject/Research again | NIE |
| G2 | Price proposal Accept/Reject/Recalculate/Edit | NIE |
| G3 | Final Bid Accept / Reject / Recalculate | NIE |

08-P0 **nie** implementuje G1–G3 (Owner: „Nie implementuj jeszcze tych bramek”).

---

## 20. Brakujące state transitions

**STATE MACHINE MISSING** (audit). 08-P0 **nie** wprowadza formalnej maszyny.

Minimalne stany na później (propozycja, nie implement):

```text
IDLE
  → INGESTING          (bridge busy)
  → BOQ_READY | BOQ_GAP
  → ANALYZING          (P5/P6/P7/P8)
  → WAITING_RESEARCH   (MISS + HTTP)
  → WAITING_OWNER      (G1/G2)
  → RECALCULATING
  → READY_FOR_BID
  → WAITING_FINAL      (G3)
  → APPROVED
```

Na 08-P0 wystarczą istniejące `IkNg02IngestPhase` (`started` / `completed` / `blocked` / `skipped_already_done`).

---

## FIRST IMPLEMENTATION BOUNDARY (08-P0)

**IN (minimal):**

1. `isIkP2DocumentsBoqActive()` := `isIkEntryEnabled() === true`  
   (bez AND `isIkAutoIngestEnabled()`)
2. `IkEntryHost`: ingest effect gated by `isIkP2DocumentsBoqActive()` — **nie** przez `isIkAutoIngestEnabled()`
3. Zachować: `needsIkNg02Ingest` · `onUpdate` wymagany · pipeline wait · `attemptedRef` · persist local/cloud jak dziś
4. Testy: zaktualizować kontrakt P2 (Entry ON → ingest active niezależnie od leftover key)
5. Admin: ukryć checkbox AUTO_INGEST · zaktualizować copy IK Entry (semantyka OD-08-1)
6. Changelog + ARCHITECTURE nota P2 seam

**OUT:**

- nowy engine / orchestrator / flaga
- settings write / cloud migracja / flip `ikEntryEnabled` / flip D
- Research-on-miss / `executeResearch: true` z hosta
- Owner Gates G1–G3 / Accept / Price Commit / Final Bid persist
- ukrycie P3–P8 selectów (slice 08-P1)
- zmiana A05–A07 enum / B-POLICY / OFF wins
- Composite→P7 · P1/P2 KEEP GAP · CatalogWork 471 write
- Design Freeze / Arch Review w tej turze (PLAN only)

**Dlaczego to jest minimalne i wystarczające na first break:** silnik i persist już są; jedyna luka to extra AND + host omija helper.

**Ryzyko 08-P0:** po Owner flip `ikEntryEnabled=true` na prod ingest **zacznie pisać** item gdy `needsIkNg02Ingest`. To jest **zamierzone** OD-08-1. Guardy mostu ograniczają do braków BOQ. Nie uruchamiać Research.

**Live dziś:** Entry false → 08-P0 na prod **nie** ingestuje, dopóki Super Admin nie włączy IK. PLAN **nie** każe pisać KV.

---

## KOLEJNOŚĆ EPIC-ów (propozycja po 08-P0, nie start)

| Slice | Cel | Implement? |
|-------|-----|------------|
| **08-P0** | IK ON → Documents→BOQ | dopiero po Owner GO na ten PLAN + DF |
| **08-P1** | ukryć P3–P8 / Research w Admin UI · enumy internal | później |
| **08-P2** | Research on PRICE MISS → candidate w EC (bez Accept) | później |
| **08-P3** | Owner Gates G1/G2 + Accept→persist→recompute | później |
| **08-P4** | G3 Final Bid Owner Approval bez wymogu D | później |

Nie zakładać P9. Nie auto-start SMART/MS.

---

## SAFETY LOCKS (08-P0 i dalej)

| Lock | Status |
|------|--------|
| P1 CLOSED / `mat.inv.*` | **nie ruszać** |
| P2 KEEP GAP | **nie ruszać** (08-P0 = ingest P2, nie identity P2) |
| Composite CLOSED / `feedsP7Bid=false` | **nie ruszać** |
| D | **HARD STOP** — nie włączać, nie bypass, nie uzależniać 08-P0 |
| A05/A06/A07 | **CLOSED** — enumy/B-POLICY/OFF wins |
| CatalogWork 471 | **nie pisać** w 08-P0 (ingest pisze **tender item**, nie katalog) |
| `\|\| true` | **zakaz** |
| Nowa flaga | **zakaz** w 08-P0 |

**IK AUTONOMY ≠ CHIEF / D / DECIDED.** P4/D poza 08-P0. P8 nadal optional `chiefSession`.

---

## TEST PLAN (08-P0 — gdy implementacja będzie autoryzowana)

Nie uruchamiać teraz. Po GO:

- helper: Entry ON → `isIkP2DocumentsBoqActive() === true` nawet gdy `ikAutoIngestEnabled === false`
- helper: Entry OFF → false nawet gdy leftover key true
- host source: woła `isIkP2DocumentsBoqActive`, nie gating wyłącznie `isIkAutoIngestEnabled`
- `needsIkNg02Ingest` unchanged (T z P2.5)
- brak `executeResearch: true` literal
- brak zmian D / P5–P8 merge
- Admin: brak widocznego `data-ik-auto-ingest-toggle` (lub hidden)
- regresja A05 T11: AUTO → research inactive

---

## FINAL STATUS

```text
PLAN                 = READY FOR OWNER REVIEW
Document             = docs/architecture/IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md
Code                 = ZERO
Settings             = ZERO
Research             = ZERO
Business writes      = ZERO
Commit               = NOT DONE
Push                 = NOT DONE
Deploy               = NOT DONE
Design Freeze        = NOT CREATED
Architecture Review  = NOT DONE
Implementation       = NOT AUTHORIZED
EPIC                 = AUTONOMY-08 — PLAN
STOP                 = czekaj na OWNER REVIEW
```
