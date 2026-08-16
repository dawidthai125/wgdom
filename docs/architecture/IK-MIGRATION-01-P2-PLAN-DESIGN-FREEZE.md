# IK-MIGRATION-01 — P2 PLAN + DESIGN FREEZE  
## Documents → OfferBoq / Master BOQ (IK-controlled)

> **ID:** `IK-MIGRATION-01-P2-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P2 PLAN + DESIGN FREEZE = COMPLETE** · **P2 IMPLEMENTATION = COMPLETE** · see [`IK-MIGRATION-01-P2-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P2-IMPLEMENTATION-CLOSEOUT.md)  
> **Date:** 2026-08-16  
> **Mode:** FREEZE LOCKED · IMPLEMENTATION landed (Owner GO) · AUTO_INGEST default remains OFF  
> **JSON:** `.tmp/p2-plan-design-freeze.json` · impl `.tmp/p2-implementation-closeout.json`  
> **Audit:** [`IK-MIGRATION-01-P2-AUDIT.md`](./IK-MIGRATION-01-P2-AUDIT.md) (`READY_FOR_PLAN`)  
> **Technical SSOT (REUSE — nie duplikować kontraktu BOQ):** [`IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT.md`](./IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT.md)  
> **Parent AD/fazy:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **Address/provenance:** [`IK-MIGRATION-01-MULTI-BOQ-ADDRESS-MODEL.md`](./IK-MIGRATION-01-MULTI-BOQ-ADDRESS-MODEL.md)  
> **P1 closeout:** [`IK-MIGRATION-01-P1-CLOSEOUT.md`](./IK-MIGRATION-01-P1-CLOSEOUT.md) · commit **`ebab4a9f`**

```text
P2 = CONTROLLED Documents → BOQ UNDER IK
     NOT a rebuild
     NOT auto-research
     NOT pricing
REUSE: ik-document-expert · NG-02 · OfferBoq v5 · multi-boq · PDF/ATH/XLSX stack
DEFAULT: AUTO_INGEST remains OFF until Owner GO IMPLEMENT flips it under this DF
```

---

## 0. Baseline (LOCKED)

| | |
|--|--|
| P0 | `b004b08e` · PRODUCTION VERIFIED |
| P1 | `ebab4a9f` · PRODUCTION HARDENED |
| P2 audit | COMPLETE · READY_FOR_PLAN |
| Stack | **ALREADY AVAILABLE** (DF historycznie P2/P2.5 COMPLETE) |
| IK gap | `IK_ENTRY_SHELL_AUTO_INGEST = false` → IK ON nie napędza P2.5 |
| P5.26 | LOCKED @ `1d41f619` · 9/9 · Catalog 471 · REVIEW-9 frozen |
| P5.27 / 31 / 32 | LANDED / VERIFIED |
| P5.33 | **DO NOT CREATE** |

---

## 1. AD (P2) — LOCKED this freeze

| AD | Treść |
|----|--------|
| **AD-IK-P2-01** | P2 = Documents → discovery → extraction → OfferBoq/Master BOQ → READY\|PARTIAL\|HOLD\|GAP |
| **AD-IK-P2-02** | REUSE FIRST — zero DocumentParserV2 / OfferBoqV2 / second PDF engine |
| **AD-IK-P2-03** | `ikEntryEnabled` ON ≠ auto full pipeline; P2 = **controlled seam** |
| **AD-IK-P2-04** | **Only** `IK_ENTRY_SHELL_AUTO_INGEST` may be flipped for P2 IMPLEMENT; `EXECUTE_RESEARCH` · `RUN_RATE_EXPERTS` · `IDENTITY_COVERAGE` stay **OFF** |
| **AD-IK-P2-05** | AUTO_INGEST **default remains OFF** on prod until Owner GO IMPLEMENT |
| **AD-IK-P2-06** | P2 nie ustala cen · nie labor/material research · nie Accept · nie CatalogWork |
| **AD-IK-P2-07** | `PARSER_EMPTY` ≠ brak ceny / market absence |
| **AD-IK-P2-08** | Unit: no unsafe remap (`m²↔szt`, `mb↔szt`, `pkt↔mb`, `kg↔szt`) without existing approved rule — else GAP/HOLD |
| **AD-IK-P2-09** | Provenance + Truth: extracted fact requires real `sourceRef`; no synthetic sourceRef; no LLM invent rows |
| **AD-IK-P2-10** | P2 output handoff → P3 classification/identity input; P2 stops at validated BOQ |
| **AD-IK-P2-11** | P5.26–P5.32 LOCKED — P2 zero mutation rates/binds/Accept |
| **AD-IK-P2-12** | Rollback: set `AUTO_INGEST=false` → IK Entry Shell only (P1) |

*(Parent AD-IK-M01–M10 remain LOCKED.)*

---

## 2. P2 objective (contract)

```text
IK Entry (ikEntryEnabled ON)
  → Document Expert facts (EC)
  → [controlled] discovery / P2.5 ingest when AUTO_INGEST ON
  → extraction (REUSE parsers)
  → OfferBoq v5 / Master BOQ (+ lineProvenance)
  → status: READY | PARTIAL | HOLD | GAP
  → STOP (P3 boundary)
```

**OUT:** F5 · Bid · Dual Outcome D · Chief scoped research · NG-10 removal · OCR invent · pricing.

---

## 3. Document discovery contract

| Pytanie | Polityka (REUSE BOQ Discovery) |
|---------|--------------------------------|
| Jakie docs dostępne? | BZP + upload + external/ZIP children (NG-02 / INGEST-01) |
| Relewantne? | `classifyDocumentRole` + `classifyCostDocument` → cost / przedmiar |
| Wspierane? | `FILE_TYPE_SUPPORT` — PDF text · XLS/XLSX · ATH/NOR/XML · ZIP/7z inner |
| Brak dokumentu | discovery settled + 0 attachments → **GAP** (diagnostyka, nie happy-path HOLD) |
| Nieczytelny | **HOLD** (`HOLD_UNREADABLE_DOCUMENT`) |
| Częściowy odczyt | **PARTIAL** + lista braków |
| Invent docs | **FORBIDDEN** |

EC komunikuje tylko z evidence (counts, filenames, documentIds).

---

## 4. Extraction seam (REUSE)

```text
document bytes
  → existing resolver / dossier heavy / snapshot
  → OfferBoq lines (buildOfferBoqFromSnapshot / multi-boq compose)
  → runIkDocumentExpert report
```

### Per-row (LOCKED fields)

| Field | Rule |
|-------|------|
| original description | z parsera / snapshot |
| normalized description | tylko istniejące normalizery — zero invent |
| quantity | finite > 0 else missing → PARTIAL |
| unit | non-empty else missing → PARTIAL; no unsafe remap |
| provenance / source | `documentId`, filename, archive parent, dwelling when mapped |
| sourceRef (EC) | kind document \| extraction \| boq_ready \| hold + tenderId + artifact |
| row identity | OfferBoq `lineId` / lp+index |

**Components:** `ik-document-expert` · `ik-ng02-ingest-bridge` · `tender-offer-boq` · `multi-boq/*` · `ath-parser` · `pdf-przedmiar-heuristic` · `tenders-bzp-doc-parse`.

---

## 5. OCR / scan policy (LOCKED)

| Input | Policy |
|-------|--------|
| Text PDF (text layer) | Normal heuristic extraction |
| Scan / image-only | If **existing** OCR path exists and is wired — use it; else **PARTIAL/HOLD** with explicit reason (`pdfPrzedmiarNoTextLayer` / CASE 3) |
| OCR unavailable | **PARTIAL** or **HOLD** — **never invent text** |
| “Na oko” rewrite | **FORBIDDEN** |

P2 **nie** buduje nowego OCR engine. Scan completeness = backlog acceptable as PARTIAL (Owner decision §21.3).

---

## 6. Unit safety (LOCKED)

| Rule |
|------|
| No auto `m²↔szt` · `mb↔szt` · `pkt↔mb` · `kg↔szt` without **pre-existing approved** rule |
| Ambiguous unit → **GAP / HOLD** |
| P2 **nie** dodaje nowych Owner Knowledge unit rules |
| P5.26 REVIEW-9 / unit HOLD patterns = **out of P2 mutation** |

---

## 7. Line preservation / reconciliation

```text
SOURCE DOCUMENT
→ DISCOVERED / EXTRACTED ROWS
→ OFFERBOQ
→ MASTER BOQ (compose / legacy_single)
```

| Gate | Requirement |
|------|-------------|
| Lost rows | **0** silent drops — unexplained loss → FAIL Gate B |
| Invented rows | **0** |
| Duplicates | only with explicit MULTI-BOQ policy (KEEP ONE / BOTH / CONFLICT→HOLD) |
| Traceability | every kept/dropped line reasoned (integrity helpers + EC reasons) |

REUSE: `computeCompositionLineIntegrity` · Owner map coverage · Document Expert `validateOfferLines`.

---

## 8. Status model (LOCKED)

| Status | Meaning | Continue |
|--------|---------|----------|
| **READY** | qty+unit+opis (+ lineage); Master BOQ usable for P3 | → P3 |
| **PARTIAL** | subset OK; explicit gaps listed | costing/P3 only on READY subset |
| **HOLD** | unsafe (unreadable / CONFLICT / ambiguous unit) | no fake Bid complete |
| **GAP** | no cost doc after settled discovery | keep diagnosing — not “give up tender” |

**PARSER_EMPTY** = extraction produced no positions → PARTIAL/GAP reason — **≠** market/price absence (**AD-IK-P2-07**).

---

## 9. Provenance / Truth (LOCKED)

- Every extracted claim in EC → valid `sourceRef` (P0 `canPresentAsVerifiedFact` / `enforceIkConversationTruth`)
- No synthetic sourceRef
- LLM must not append BOQ rows as verified facts
- Fake evidence **FORBIDDEN**

---

## 10. IK ON / AUTO_INGEST trigger (LOCKED)

| Setting | Default | P2 rule |
|---------|---------|---------|
| `ikEntryEnabled` | OFF | Required ON for IK Entry host (Super Admin) |
| `IK_ENTRY_SHELL_AUTO_INGEST` | **OFF** | Flip to **true** only on Owner GO **IMPLEMENT P2** under this DF |
| `EXECUTE_RESEARCH` | OFF | **Must stay OFF** |
| `RUN_RATE_EXPERTS` | OFF | **Must stay OFF** |
| `IDENTITY_COVERAGE` | OFF | **Must stay OFF** (P3+) |

### When P2 may run

```text
1. ikEntryEnabled === true
2. Owner GO IMPLEMENT P2 signed
3. AUTO_INGEST === true (code constant or future explicit opt-in — no silent default ON)
4. needsIkNg02Ingest / pipeline idle rules (existing bridge)
5. Document Expert reports READY|PARTIAL|HOLD|GAP honestly
```

**IK ON alone does NOT** mean run entire pipeline.

### Persist policy (Owner decision default — REUSE current bridge)

When AUTO_INGEST ON: existing bridge may `persist: local` and conditional `cloud` if `extractedLineCount > 0`.  
P2 PLAN **does not invent** a second persist model. Owner may constrain to local-only in IMPLEMENT GO (decision §21.2).

---

## 11. P1 guards compatibility

| Guard | P2 may change? |
|-------|----------------|
| AUTO_INGEST | **YES** — sole P2 enablement lever |
| EXECUTE_RESEARCH | **NO** |
| RUN_RATE_EXPERTS | **NO** |
| IDENTITY_COVERAGE | **NO** |

IK OFF / NG-10 path: **UNCHANGED** (Gate A).

---

## 12. P3 boundary (LOCKED)

```text
P2 OUTPUT (Document Expert report):
  masterBoq status
  masterBoqLines[] (+ provenance)
  reasons[]
  offerBoq / composed docs

P3 INPUT:
  READY or PARTIAL subset lines only
  → classification + identity (no invent)

P2 MUST NOT:
  run classification wire as “done”
  identity research
  labor / material research
```

---

## 13. Existing stack map

| Component | P2 role | Action |
|-----------|---------|--------|
| `IkEntryHost` | Seam + guards | **ADAPT** — flip AUTO_INGEST only |
| `ik-document-expert` | Report + validation | **REUSE** |
| `ik-ng02-ingest-bridge` | Populate dossier lines | **REUSE** |
| `ExpertConversationSurface` + VM | Truthful EC | **REUSE** |
| NG-02 / dossier heavy | Parse | **REUSE** |
| OfferBoq v5 | Lines | **REUSE** |
| multi-boq | Master + provenance | **REUSE** |
| PDF / ATH / XLSX stack | Extraction | **REUSE** |
| P0 Truth helpers | sourceRef | **REUSE** |
| OCR engine | — | **GAP** (PARTIAL policy) — no invent |

---

## 14. Test design (future — nie implementować teraz)

| ID | Intent |
|----|--------|
| A | valid text PDF |
| B | scanned PDF |
| C | OCR available (if path exists) |
| D | OCR unavailable → PARTIAL/HOLD |
| E | malformed PDF |
| F | empty document |
| G | multiple BOQ documents |
| H | duplicate document |
| I | duplicate BOQ row (policy) |
| J | missing / lost row detection |
| K | unit preservation |
| L | quantity preservation |
| M | provenance |
| N | sourceRef / no verified without ref |
| O–R | READY / PARTIAL / HOLD / GAP |
| S | no invented data |
| T | no silent row loss |
| U | AUTO_INGEST OFF → shell only |
| V | EXECUTE_RESEARCH still false when P2 ON |
| W | IK OFF → NG-10 unchanged |

**REUSE:** `test-ik-migration-01-p2-document-expert.mjs` · `p25-ingest` · P0/P1 · OfferBoq/multi-boq harnesses.

---

## 15. Acceptance criteria (P2 COMPLETE)

```text
[ ] documents discovered correctly
[ ] supported document path
[ ] unsupported document path
[ ] extraction path
[ ] OCR/scan policy honored
[ ] OfferBoq mapping
[ ] Master BOQ mapping
[ ] row reconciliation (0 silent loss)
[ ] unit preservation
[ ] quantity preservation
[ ] provenance
[ ] sourceRef / Truth
[ ] READY / PARTIAL / HOLD / GAP semantics
[ ] no invented rows
[ ] PARSER_EMPTY ≠ price miss
[ ] P3 boundary clean
[ ] P1 guards: only AUTO_INGEST flipped; research trio OFF
[ ] mobile: discovery + BOQ status readable
[ ] rollback: AUTO_INGEST OFF restores shell
[ ] P5.26 untouched
[ ] Gate A IK OFF PASS
[ ] Gate B on 08def45d (or Owner-approved tender) PASS
```

---

## 16. Mobile (minimal)

| Requirement |
|-------------|
| Document discovery / BOQ status readable on first screen EC |
| No new UI framework |
| Touch/scroll reuse P1 EC (44px) — no mobile redesign |

---

## 17. Risk matrix

| RISK | Sev | Mitigation | Owner decision |
|------|-----|------------|----------------|
| AUTO_INGEST creep / always-on | P0 | Default OFF; flip only IMPLEMENT GO | §21.1–2 |
| Cloud write surprise | P1 | Document persist policy; optional local-only | §21.2 |
| Scan/OCR invent | P0 | PARTIAL/HOLD; no OCR invent | §21.3 |
| PARSER_EMPTY → price | P0 | AD-IK-P2-07 | REUSE |
| Silent row loss | P0 | Integrity gates + Gate B | REUSE helpers |
| Duplicate rows | P1 | MULTI-BOQ policy explicit | REUSE |
| Unit mismatch invent | P0 | AD-IK-P2-08 | REUSE |
| Qty mismatch | P0 | validateOfferLines | REUSE |
| Provenance loss | P1 | require lineProvenance where multi | REUSE |
| Fabricated extraction | P0 | P0 Truth | REUSE |
| P3 leakage (identity/research) | P0 | guards stay OFF | §21.7 |
| P5.26 mutation | P0 | out of scope lock | §21 |

---

## 18. Implementation plan outline (minimal)

| Phase | Intent | Code expectation |
|-------|--------|------------------|
| **A** | Reuse existing P2 stack | Prove Document Expert + tests green (no new parsers) |
| **B** | Controlled IK → P2 seam | Flip `IK_ENTRY_SHELL_AUTO_INGEST` under Owner GO only |
| **C** | Status / reconciliation gates | Assert READY/PARTIAL/HOLD/GAP + integrity in EC/tests |
| **D** | Tests A–W (subset MVP first) | Extend existing P2/P2.5 scripts — no invent |
| **E** | Production Verify | Gate A OFF · Gate B ON controlled · research guards OFF · P5.26 untouched |

Nie wpisywać tu konkretnych diffów — IMPLEMENT dopiero po **Owner GO P2**.

---

## 19. Owner decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | P2 execution trigger | `ikEntryEnabled` + Owner GO IMPLEMENT + `AUTO_INGEST=true` |
| 2 | AUTO_INGEST policy | **Default OFF**; flip only for P2 IMPLEMENT; research guards never ON via P2 |
| 2b | Persist local vs cloud | **REUSE bridge** unless Owner amends to local-only at IMPLEMENT |
| 3 | Scan/OCR fallback | Existing OCR if any; else PARTIAL/HOLD — no invent (**REUSE** BOQ Discovery) |
| 4 | READY/PARTIAL/HOLD/GAP | **REUSE** BOQ Discovery §5 + Document Expert reasons |
| 5 | Unit safety | **REUSE** AD-IK-P2-08 — no new Owner rules in P2 |
| 6 | Provenance/sourceRef | **REUSE** P0 Truth + multi-boq provenance |
| 7 | P3 handoff | Validated BOQ / masterBoqLines only — **REUSE** |
| 8 | Rollback | `AUTO_INGEST=false` → P1 shell |

**NO NEW DECISION** beyond explicit AUTO_INGEST enablement under IK — all semantics REUSE existing DF/contracts.

**CHATGPT_ESCALATION:** **NOT REQUIRED** (no architectural conflict).

---

## 20. Execution integrity (this step)

| | |
|--|--:|
| CODE | **0** |
| RESEARCH / HTTP / ACCEPT / CREATE / BIND / WRITE | **0** |
| EDGE / COMMIT / PUSH | **0** |

---

## 21. Verdict

```text
P2 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P2 OWNER GO

Stack = ALREADY AVAILABLE
IK seam = AUTO_INGEST controlled flip (default OFF)
Research guards = remain OFF
P5.26 = LOCKED
P5.33 = DO NOT CREATE

STOP — no implement · no AUTO_INGEST flip · no research · no HTTP · no P3
```
