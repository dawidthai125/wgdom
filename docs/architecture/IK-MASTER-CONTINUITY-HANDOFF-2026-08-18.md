# IK MASTER CONTINUITY HANDOFF — 2026-08-18

> **ID:** `IK-MASTER-CONTINUITY-HANDOFF-2026-08-18`  
> **STATUS:** **ACTIVE** · **SESSION CLOSEOUT** · DOCUMENTATION ONLY  
> **Date:** 2026-08-18  
> **Mode:** ZERO CODE · ZERO SETTINGS · ZERO RESEARCH · ZERO BUSINESS WRITE · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY  
> **Contract SSOT (nie zastępować):** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Cold-start protocol:** [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)  
> **Reuse map:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
> **Tip UI/commit (jedyne numery produkcyjne):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Migration freeze (historical P0–P9 LOCKED):** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) · [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md)

```text
════════════════════════════════════════════════════════
NIE BUDUJ OD NOWA.
IK = ORCHESTRATOR nad istniejącymi modułami WGDOM.
NIE nowy TenderModule / Catalog / Price Memory / Evidence / Research engine.
SEARCH BEFORE CREATE. NO INVENT. NO SILENT FALLBACK.
AUDIT BEFORE IMPLEMENTATION.
════════════════════════════════════════════════════════
```

Ten plik **nie** zastępuje MASTER SSOT. Zawiera stan sesji 2026-08-18 + mapę Autonomy 05–08, żeby nowy Cursor / ChatGPT nie wracał do IK-MIGRATION-01 P2 jako „next”.

Historyczny [`INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md`](./INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md) = Technology Foundation (paint/primer) · **nie** ten epic.

---

## 0. Production (czytaj 09 jako tip SSOT)

| Pole | Wartość |
|------|---------|
| UI | **2.66.95** |
| Feature commit | **`1f5d871c`** (`1f5d871c4b59137c94bc0b5ff66b9fdbc27332a6`) |
| Docs tip (P2 CLOSED stamp) | **czytaj 09** (this closeout commit) · origin/main |
| Deployment | **`5958146457`** |
| URL | https://www.wgdom.fun |
| A08-P0 | **COMPLETE / CLOSED** |
| A08-P1 | **COMPLETE / CLOSED** |
| A08-P2 | **COMPLETE / CLOSED** |
| AUTONOMY-08 epic | **NOT CLOSED** |
| Unrelated WIP | **LOCAL / UNCOMMITTED** · **NIE RUSZAĆ** · nigdy `git add -A` |

Live P2 PV: `ikEntryEnabled=false` → Research HTTP **NOT EXECUTED** (nie flipowano IK · **nie** failure). D live KV `true` = **PRE-EXISTING**, nie A08.

---

## 1. Co to jest IK (kontrakt)

```text
IK ≠ nowy moduł Przetargi
IK ≠ nowy system cenowy
IK = inteligentny orchestrator nad istniejącymi silnikami WGDOM
```

**Host wejściowy:** `IkEntryHost` (`src/app/intelligent-estimator/IkEntryHost.tsx`).  
**Nie** budować drugiego orchestratora.

REUSE: `TendersModule` · OfferBoq · F5 Position Cost · Work Catalog / OUR RATE · Price Memory · Evidence · `accept*` · Document Expert · Classification Gate · selective Labor/Material research · P7 Bid calc · P8 Risk/DW prepare · Expert Conversation.

---

## 2. Jedyny biznesowy switch

| Klucz | Rola |
|-------|------|
| **`ikEntryEnabled`** | **Jedyny** biznesowy switch IK |
| **`expertAiDecydentEnabled` (D)** | **≠ IK ON** · **HARD STOP** · IK ON **nie** flipuje D |

**IK ON** (produktowo, po A08-P0/P1/P2, przy P5–P8 `"AUTO"`):

```text
Documents → BOQ
→ P5 Labor MODE A · MODE B permission on true MISS
→ P6 Material MODE A · MODE B permission on true MISS (after P5 settled)
→ P7 Bid Calculation (in-memory)
→ P8 Risk / Decision Prepare (in-memory)
```

P3–P8 **nie** są osobnymi produktami. Technical flags / kill-switches zostają w AppSettings + Super Admin **TECHNICAL / ADVANCED / EMERGENCY** (A08-P1). Zwykły Administrator **nie** ma ⚙.

Copy IK (SSOT UI):

> Steruje działaniem Inteligentnego Kosztorysanta w przetargach.

AUTO_INGEST: leftover pole `ikAutoIngestEnabled` **nie** jest gate P2 · **nie** wraca do UI.

Primary Super Admin Moduły: Przetargi → WM → Szkice → **D HARD STOP** → **IK ON/OFF** → Technical (collapsed · `hidden`, dzieci w DOM).

---

## 3. Zamknięty łańcuch Autonomy (nie reopen)

| Slice | Status | Co |
|-------|--------|----|
| A05 | COMPLETE / CLOSED | P5/P6 `"AUTO"\|"OFF"\|"ON"` · MODE A AUTO · OFF kill-switch · Research **CONDITIONAL** |
| A06 | COMPLETE / CLOSED | P7 Bid calc AUTO · READ-ONLY · Final Bid OWNER |
| A07 | COMPLETE / CLOSED | P8 Risk/DW prepare AUTO · READ-ONLY · `canApprove` display · persist = DW/D |
| A08-P0 | COMPLETE / CLOSED | `isIkP2DocumentsBoqActive()` := `ikEntryEnabled === true` |
| A08-P1 | COMPLETE / CLOSED | Settings Unification · jeden switch IK |
| A08-P2 | COMPLETE / CLOSED | Research-on-Miss · Entry ∧ P5/P6 AUTO\|ON → permission · leftover Research **no-op** |
| Composite | CLOSED | leaf → `computePositionCost()` UNCHANGED · `feedsP7Bid=false` |
| P1 invoice | CLOSED | `mat.inv.*` DIY forbid · CatalogWork **471** |
| P2 identity | KEEP GAP | nie invent |
| IK-MIGRATION-01 P0–P9 | LOCKED / COMPLETE | [`FINAL-HANDOFF`](./IK-MIGRATION-01-FINAL-HANDOFF.md) — **nie** next = GO P2 Document Expert |

---

## 4. A08-P2 Research-on-Miss — COMPLETE / CLOSED

**SSOT:** [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT.md) · [`PV`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md) · DF OD-P2-1…10 **UNCHANGED**.

```text
GATE     = IK ON ∧ P5/P6 AUTO|ON  → executeResearch PERMITTED
HTTP     = ONLY ON TRUE MISS
HIT      = ZERO Research
LEFTOVER = ik*ResearchEnabled  NOT a conjunct (legacy / no-op)
SWITCH   = no extra Research checkbox / no new flag
F1       = COMPOUND / UNKNOWN / BOTH / UNRESOLVED HOLD
SEQ      = P5 settled (laborSettledRef + tick; cancelled ≠ settled) before P6
Research ≠ Accept
```

REUSE: `runIkLaborGapResearch` · `executeMaterialResearchPhase2`. Hub `IkLaborGapResearchPanel` **nie** jest autonomia hosta.

**CRITICAL — technical failure ≠ MISS.** Cooldown / session busy / budget / legal KEEP.

Live PV: IK Entry **OFF** · Research HTTP **NOT EXECUTED** — **nie** failure.

**Nie** reopen A08-P2. **Nie** start A08-P3 bez Owner GO.

---

## 5. Eksperci (orchestration, nie nowe silniki)

| Expert | Robi | Nie robi |
|--------|------|----------|
| **Document** | discovery · kosztorys/przedmiar · extraction · validation · normalization · Master BOQ · sourceRef | nowy KV storage |
| **Classification / Identity** | **przed** Research · pricing plane MATERIAL / LABOR / PACKAGE-or-COMPOUND / UNKNOWN | invent ceny dla UNKNOWN |
| **Labor** | Work Catalog · OUR RATE · CURRENT→REUSE · MISS→Labor Research | źródła sklepów DIY jako robocizna |
| **Material** | Price Memory · CURRENT→REUSE · MISS→Material Research | Labor OUR RATE |
| **Package** | kompletna czynność MATERIAL + LABOR (np. montaż grzejnika / PVC / umywalki / baterii) | auto-split na tylko MATERIAL albo tylko LABOR |

**Classification Gate freeze (MASTER SSOT — nie nadpisywać tu):**

| Plane | Routing |
|-------|---------|
| LABOR | Work Catalog → research przy MISS |
| MATERIAL | Price Memory → material research przy MISS |
| COMPOUND | **HOLD** · zero research · zero invent |
| UNKNOWN | **HOLD** · zero research · zero invent |

**Owner 2026-08-18 (PACKAGE):** semantyka kompletnej czynności ≠ auto MATERIAL-only / LABOR-only. Research PACKAGE ma szukać kompletnej wartości **albo** reuse istniejącego package pricing. **Nie mieszać źródeł bez klasyfikacji.**

**Napięcie KEEP:** MASTER = COMPOUND HOLD / zero research. Owner PACKAGE layer **nie** jest A08-P2. Zmiana COMPOUND→PACKAGE research wymaga **osobnego Owner GO + AUDIT**, nie cichego rewrite `classifyEstimatorPricingPlane`. Composite BOTH_HOLD consumer **istnieje** (CLOSED).

---

## 6. Labor Research — twardy kontrakt

```text
MISS (po CURRENT OUR RATE)
  → Labor Research
  → źródła robocizny (NIE Leroy/Casto/OBI)
  → Evidence
  → Candidate
  → OWNER ACCEPT / REJECT / RECALCULATE
  → OUR RATE
```

Źródła (m.in.): **KB.pl** · **CennikRemontow.pl** · **Murator** · podobne wiarygodne.  
Legal gate: `WORK_RATE_LEGAL_GATE` (istniejący).

**Przykład Tablica (DATA VERIFIED, nie invent):** CennikRemontow 312–780 zł/szt. → Owner ACCEPT **546** zł/szt. → OUR RATE **546**. Evidence **zostaje** evidence. Nie zamieniać evidence na stawkę firmową bez Accept.

`pkt ≡ mb` **UNPROVEN** → HOLD (Podejście).

Dedupe / cooldown **REUSE** (nie drugi cache IK):

- klucz np. `${tenderId}|${lineId}|labor|${workId}|${unit}`
- `isWorkRateResearchInCooldown(workId, unit)`

---

## 7. Material Research — twardy kontrakt

```text
MISS (po CURRENT Price Memory)
  → Material Research
  → źródła rynkowe
  → Evidence
  → Candidate
  → OWNER
```

Źródła (m.in.): **Leroy Merlin** · **Castorama** · **OBI** · **Onninen** · **TIM** · podobne sklepy/hurtownie.

**Zakaz:** „AI wymyśliło cenę”.

`mat.inv.*` **nie** jest DIY market identity (P1 CLOSED).

---

## 8. Evidence → Candidate → Owner

```text
Research → Evidence → Candidate → OWNER
Owner: ACCEPT | REJECT | RECALCULATE
Dopiero ACCEPT zapisuje do istniejącego SSOT
```

**Nie** auto-Accept. Host dziś: facts w Expert Conversation · **brak** przycisków AKCEPTUJ w `IkEntryHost`. Accept silniki **istnieją** poza hostem (`acceptWorkRateResearchCandidate` · `acceptIkLaborResearchAndNotify` · `acceptMaterialResearchCandidate`).

---

## 9. Price Commit — nie nowy mechanizm

**Nie** tworzyć osobnego biznesowego „Price Commit”.

Accept **już** persistuje:

| Plane | Persist |
|-------|---------|
| Labor | `acceptWorkRateResearchCandidate` → OUR RATE + `saveWorkCatalogRouted` |
| Material | `acceptMaterialResearchCandidate` → `commitMarketQuotesImport` / Price Memory |

Następnie (docelowo, **nie** zaimplementowane w hoście): persist → revision → **recompute** → F5 Position Cost → Bid.

Market Sync staging Accept → Publish = **osobna** ścieżka Super Admin · **nie** scalać bez AUDIT.

---

## 10. F5 / Bid / Final Bid

```text
BOQ line → Identity → CURRENT price → Position Cost
MISS → Research → Candidate → Owner Accept → persist → recompute → Position Cost → Bid
CURRENT HIT → ZERO Research
```

P7: in-memory `runIkP7PositionCostBid` · **nie** czyta raportów P5/P6 (`feedsP7Bid=false`) · czyta katalog/PM.

**Final Bid = OWNER.** IK może przygotować wycenę. Owner: ACCEPT albo REJECT / RECALCULATE. **Nie** auto-decyzja. Persist oferty dziś: Decision Workspace / D / Session — **nie** `IkEntryHost`.

---

## 11. D / Chief / P8

| | |
|--|--|
| D | HARD STOP · IK ≠ D |
| P8 | AUTO/ON = read-only prepare · OFF = HOLD · B-POLICY · **OFF wins** |
| Chief | osobna warstwa (`TenderDetailPage` / session) · scoped · nie auto-start z IK ON |

Nie auto-decydować. `canApprove` = display.

---

## 12. Invoice purchase hosts

CatalogWork baseline **471**.

Istnieje: `isInvoicePurchaseCatalogWorkId` · `isInvoicePurchaseMaterialKey`.

- OK w Price Memory / purchase path  
- **NIE** canonical BOQ primary  
- `mat.inv.*` **NIE** DIY research identity  

**Nie** usuwać hostów z katalogu bez osobnego Owner GO. Invoice host cleanup ≠ catalog cleanup.

---

## 13. Unit safety

**Nie** zakładać: `pkt = mb` · `szt = kpl` · `kg = m`.

Przykład: CennikRemontow 234–650 **pkt** vs katalog **mb** → brak dowodu równoważności → **HOLD / UNPROVEN**.

---

## 14. Hard locks

```text
❌ new IK flag / new engine / new orchestrator
❌ new TenderModule / Catalog / Price Memory / Evidence store
❌ || true · enum === true jako Research
❌ invent prices · silent fallback
❌ auto-Accept · auto Final Bid · D bypass
❌ Research before classification
❌ Research when CURRENT price exists
❌ technical failure treated as MISS
❌ unit remapping without evidence
❌ invoice host cleanup as catalog cleanup
❌ git add -A · vercel deploy
❌ A08-P2 reopen / A08-P3 IMPLEMENT bez Owner GO
```

---

## 15. Orchestration map (reuse, nie duplikat)

```text
IkEntryHost
  Document Expert
  → Classification / Identity
  → Labor Expert (MODE A; MODE B if executeResearch)
  → Material Expert (MODE A; MODE B if executeResearch)
  → Package / Composite BOTH_HOLD (COMPOUND HOLD freeze)
  → F5 / P7 Bid
  → P8 Risk / Validation / DW prepare
  → Expert Conversation (facts)
PDF / Chief / Decision Persist = istniejące warstwy poza auto-IK write
```

---

## 16. Dokumenty tej serii (czytaj, nie zgaduj)

| Doc | Rola |
|-----|------|
| [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) | **★★ Contract SSOT** |
| **TEN PLIK** | Session continuity 2026-08-18 |
| [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) | Tip 2.66.95 / 1f5d871c |
| [`IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md) | P0 CLOSED |
| [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-IMPLEMENTATION-CLOSEOUT.md) | P1 CLOSED |
| [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PRODUCTION-VERIFY.md) | P1 PV PASS WITH FINDINGS |
| [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT.md) | P2 CLOSED |
| [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md) | P2 PV PASS |
| [`IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md) | First break audit (historical · P2 CLOSED) |
| [`IK-AUTONOMY-07-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-07-IMPLEMENTATION-CLOSEOUT.md) | P8 CLOSED |
| [`IK-AUTONOMY-05-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-05-IMPLEMENTATION-CLOSEOUT.md) | Research CONDITIONAL LOCKED |
| [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) | Autonomy ≠ Owner decision |

P1 findings (NON-BLOCKING, nie naprawiać w closeout): OV-F1 muted copy · OV-F2 `data-ik-technical-*` · leftover `data-ik-entry-auto-ingest` · Vite `material-sell-adapter.ts` · CI Manifest OUT OF SCOPE.

---

## 17. NEXT (nowy agent)

```text
1. Przeczytaj MASTER SSOT + TEN PLIK + 09 + version.json
2. Nie reopen A08-P2
3. Nie startuj A08-P3
4. Unrelated WIP zostaw LOCAL / UNCOMMITTED
5. Czekaj OWNER instruction
```

**STOP.**
