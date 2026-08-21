# IK — REAL TENDER BOQ INGEST BLOCKER · AUDIT #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-AUDIT-01` |
| **Date** | 2026-08-21 |
| **Mode** | **READ-ONLY AUDIT** |
| **Trigger** | Real Tender UI Smoke #05b — KNR BLOCKED · BOQ pending · lines=0 · ingest=started |
| **IMPLEMENTATION / FIX / COMMIT / PUSH / DEPLOY** | **NOT AUTHORIZED** |

```text
AUDIT = COMPLETE

Primary blocker     = IkEntryHost P2 NG-02 ingest bridge stuck in synthetic "started"
                      (bridgeBusy=true · ingest=null · no completed expert extract)
KNR BLOCKED reason  = MASTER_BOQ_NOT_READY (readyForExperts !== true)
Historical relation = NONE (downstream of BOQ/KNR gate)
QuotaExceeded       = INDEPENDENT (work-catalog LS)
TenderDetailPanel   = LIKELY AMPLIFIER (max update depth → item churn → effect abort)
TendersModule flaky = NOT the cause of this stuck state (Host mounted in #05b)
```

---

## 1. Real tender

| Field | Value |
|-------|-------|
| BZP | `2026/BZP 00391783` |
| Zamawiający | MOPS Wrocław |
| Pipeline id | `08def932-550d-d6f5-962b-1200014aa6e7` |
| Docs (EC) | 9 attachments discovered · includes 3× `*_PRZEDMIAR.pdf` |
| ATH on tender | **0** (PDF przedmiar only — expected) |
| Smoke source | [`IK-HISTORICAL-EXECUTED-ATH-REAL-TENDER-UI-SMOKE-TEST-05B.md`](./IK-HISTORICAL-EXECUTED-ATH-REAL-TENDER-UI-SMOKE-TEST-05B.md) |

---

## 2. Current BOQ state (#05b attrs)

| Host attr | Observed |
|-----------|----------|
| `data-ik-ingest-phase` | **`started`** (~4 min, no transition) |
| `data-ik-entry-boq-status` | **`pending`** |
| `data-ik-master-ready` | **`0`** |
| `data-ik-extracted-lines` | **`0`** |
| `data-ik-cost-doc-count` | **`0`** |
| `data-ik-przedmiar-count` | **`0`** |
| `data-ik-knr-status` | **`BLOCKED`** |
| `data-ik-entry-auto-ingest` | `1` (P2 ON) |

EC simultaneously showed Document Expert step **„Znaleziono dokumentację przetargową (9)”** with filenames — that is **attachment discovery**, not Master BOQ extraction.

---

## 3. Exact lifecycle

### 3.1 Where `started` is set (A)

**Not** primarily from `runIkNg02IngestBridge().phase === "started"`.

Synthetic UI/attr path in `IkEntryHost.tsx`:

```text
data-ik-ingest-phase =
  ingest?.phase
  ?? (bridgeBusy ? "started" : "idle")
```

Also VM fake ingest when `bridgeBusy && !ingest`:

```text
phase: "started", started: true, completed: false, …
```

So **`started` = bridge in-flight latch**, not a durable bridge result object.

### 3.2 Expected NG-02 bridge phases (`ik-ng02-ingest-bridge.ts`)

| Phase | Meaning |
|-------|---------|
| `needs_docs` / `blocked` | no attachments / discovery gap |
| `skipped_already_done` | dossier already has rows |
| **`completed`** | `buildTenderDossierHeavy` done · `extractedLineCount > 0` |
| **`blocked`** | heavy done but **0** lines |
| throw → Host catch | `phase: "blocked"` + `BRIDGE_THROW:…` |

Expected happy path:

```text
idle → (bridgeBusy) started → runIkNg02IngestBridge
  → buildTenderDossierHeavy (REUSE NG-02)
  → runIkDocumentExpert(mergedItem)
  → phase completed|blocked
  → setIngest(result) · bridgeBusy=false
```

### 3.3 BOQ `pending` (B) and `lines=0` (C)

`runIkDocumentExpert`:

- `masterBoq.status` starts as lifecycle status of Document Expert.
- `readyForExperts = (status === "ready")`.
- Without dossier snapshots / offer BOQ lines → `extractedCount=0`, often **`pending`/`partial`/`gap`**, never **`ready`**.
- Host attrs `cost-doc-count=0` / `przedmiar-count=0` ⇒ inventory sees **no** kosztorys snapshot rows yet (heavy not applied).

`lines=0` = `report.extraction.extractedCount` with empty przedmiar snapshots — **expected until bridge completes and patches `tenderDossier`**.

### 3.4 KNR `BLOCKED` condition (E)

`runIkKnrExpert` (`ik-knr-expert.ts`):

```text
if (expert.masterBoq.readyForExperts !== true)
  → blockedReport(..., "MASTER_BOQ_NOT_READY")
```

**Hard gate.** No Historical / Catalog involvement.

---

## 4. First failure

| Layer | Finding |
|-------|---------|
| Thrown bridge error | **Not observed** in #05b (no `BRIDGE_THROW` ingest object; attrs stayed synthetic `started`) |
| First durable symptom | `bridgeBusy` remains **true** · `ingest` remains **null** for full observation window |
| Console (parallel) | `Maximum update depth exceeded` @ `TenderDetailPanel` (flood) |
| Console (parallel) | `QuotaExceededError` @ `kw-wgdom-work-catalog` |

**First failure class:** **stuck in-flight / aborted latch**, not a reported parse exception.

---

## 5. Root cause

### 5.1 Confirmed mechanics (code)

`IkEntryHost` P2 effect (`IkEntryHost.tsx` ~146–219):

1. Depends on **`item`** (full object) among other deps.
2. Sets `bridgeBusy=true`, then may `await` 1.5s, then `attemptedRef.current = key`, then `await runIkNg02IngestBridge(...)`.
3. Cleanup on re-run: **`cancelled = true` only** — does **not** clear `bridgeBusy`.
4. Early exit when `attemptedRef.current === key`: **`return` without clearing `bridgeBusy`**.
5. After cancel during sleep: `if (cancelled) return` **without** `setBridgeBusy(false)`.

**Latch failure mode:**

```text
effect start → bridgeBusy=true
item identity churn → cleanup cancel
re-entry → attemptedRef already set OR cancel mid-flight
→ bridgeBusy stays true · ingest never set
→ attr ingest-phase = "started" forever
→ Document Expert runs on item WITHOUT heavy dossier rows
→ readyForExperts=false → KNR BLOCKED
```

### 5.2 Likely amplifier (observed, strong correlation)

Smoke #05b console: **`Maximum update depth exceeded` in `TenderDetailPanel`**.

Panel effect (~247–270) calls `onUpdate({ tenderFit: fit })` when fit deltas. That updates pipeline `item` → **IkEntryHost effect re-fire** → cancel/latch risk above.

**Proven:** update-depth errors **coincide** with stuck `started`.
**Not proven as sole cause:** a hang inside `buildTenderDossierHeavy` alone could also leave `bridgeBusy` true; however cancel/latch bugs exist **regardless** and match the symptom of **no** terminal `ingest` object after minutes.

### 5.3 What is NOT the invent path

Do **not** invent a new BOQ engine. Existing SSOT:

| Piece | Path |
|-------|------|
| Needs ingest? | `needsIkNg02Ingest` |
| Bridge | `runIkNg02IngestBridge` |
| Heavy parse | `buildTenderDossierHeavy` (NG-02 REUSE) |
| Expert | `runIkDocumentExpert` |
| KNR gate | `readyForExperts` → `MASTER_BOQ_NOT_READY` |

---

## 6. BOQ → KNR dependency

```text
Master BOQ readyForExperts === true
  → runIkKnrExpert COMPLETED path
  → historicalIndex lookup (if provided)
  → EC knr conversation / soft P8

readyForExperts === false
  → KNR status BLOCKED
  → historical copy NOT emitted (even if historicalIndex hydrated)
```

**Direct blocker for Historical UI proof:** BOQ/KNR gate upstream — **confirmed**.

---

## 7. Document Expert → BOQ dependency

| Step | #05b |
|------|------|
| Attachment discovery | **PASS** (9 docs in EC) |
| Cost/przedmiar inventory with snapshots | **FAIL empty** (attrs 0/0) |
| Transfer to Master BOQ lines | **NOT reached** |
| `ready` status | **NOT reached** |

Document Expert **did** see filenames via `inventoryIkDocuments` / pipeline facts. It did **not** receive extracted rows because **`tenderDossier` heavy result was never committed** via completed bridge `itemPatch`.

Przedmiary MOPS PDF **are** valid inputs for existing NG-02/`buildTenderDossierHeavy` (proven in prior Shadow #01/#02 offline extracts). Failure is **runtime bridge completion**, not “wrong document type”.

---

## 8. QuotaExceeded relationship

| Item | Assessment |
|------|------------|
| Key | `kw-wgdom-work-catalog` |
| Stack | `safeSetLocalStorageJson` / payroll LS trace · work-catalog persist |
| Needed for PDF→BOQ heavy? | **NO** (dossier/parse path ≠ work-catalog write) |
| Causes `ingest=started`? | **NO evidence** |
| Verdict | **INDEPENDENT** problem (noise / later Labor-Material risk) |

---

## 9. TenderDetailPanel relationship

| Item | Assessment |
|------|------------|
| Error | React **Maximum update depth exceeded** |
| Location | `TenderDetailPanel` (smoke stack) |
| Coupling | `onUpdate` → pipeline item change → `IkEntryHost` effect deps on `item` |
| Causes BOQ stuck? | **LIKELY AMPLIFIER** of cancel/latch (not the BOQ parser itself) |
| Same root as QuotaExceeded? | **NO** |
| Fix in this audit? | **FORBIDDEN** |

---

## 10. TendersModule relationship

| Session | Effect |
|---------|--------|
| Earlier #05b attempt | Dynamic import fail MIME `text/html` → Przetargi error UI · **Host absent** |
| Successful #05b observation | Module loaded · Host present · stuck **after** mount |

**Verdict:** flaky import **blocked some runs entirely**; it is **not** the explanation of `started`+`lines=0` once Host is mounted.

---

## 11. Historical relationship

| Check | Result |
|-------|--------|
| `historical-executed/*` sets BOQ status? | **NO** |
| Hydrate blocks NG-02? | **NO** (async; Host prop only) |
| KNR BLOCKED without historical? | **YES** — solely `MASTER_BOQ_NOT_READY` |
| Historical UI invisible because of this blocker? | **YES** (downstream) |

```text
Historical Executed ⊥ BOQ ingest latch
Historical UI blocked BY BOQ/KNR upstream
```

---

## 12. Existing SSOT / reusable path

**SEARCH BEFORE CREATE — already exists:**

1. `src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts`
2. `src/lib/tender-dossier-pipeline.ts` → `buildTenderDossierHeavy`
3. `src/lib/intelligent-estimator/ik-document-expert.ts`
4. `src/lib/intelligent-estimator/ik-knr-expert.ts` (gate only)
5. Host wiring: `IkEntryHost.tsx` P2 effect + attr mapping

Do **not** create a parallel ingest orchestrator for Historical.

---

## 13. Minimal safe next gate

```text
NEXT (Owner GO required) — DIAGNOSE/PLAN only until authorized:

OD-IK-ENTRY-NG02-INGEST-LATCH / TenderDetailPanel churn
  Scope candidates (pick minimal after Owner GO):
  A) IkEntryHost: clear bridgeBusy on effect cleanup + safe attemptedRef reset
  B) TenderDetailPanel: stop max-update-depth / tenderFit write loop
  Then: re-run UI Smoke #05c for BOQ ready → KNR COMPLETED → Historical EC copy

OUT OF SCOPE for that gate unless Owner expands:
  Historical match kinds · KL-6 · Catalog · new parsers · invent BOQ
```

This audit **does not** authorize IMPLEMENTATION.

---

## 14. What must NOT be changed (this audit)

```text
historical-executed/*
Historical hydration wiring (except as consumer after BOQ ready)
KNR Expert match semantics / ik-knr-conversation copy
P8 · KL-6 · VERIFY/APPROVE/REJECT
Catalog / evidence-store / write-router
runtime LLM
New BOQ/parser/orchestrator
Any code change in this gate
```

---

## Answers checklist (Owner brief)

| Q | Answer |
|---|--------|
| A `started` | Synthetic from `bridgeBusy` when `ingest==null` |
| B BOQ pending | Document Expert status without ready extraction |
| C lines=0 | No dossier rows / extract yet |
| D lifecycle | idle→(busy)started→bridge completed\|blocked\|throw |
| E KNR BLOCKED | `MASTER_BOQ_NOT_READY` |
| F Doc Expert→BOQ | Discovery yes · extract transfer **no** |
| G MOPS przedmiary | Valid for existing NG-02 path |
| H waiting on | Stuck busy/abort latch (± heavy in-flight); not Historical |
| I first failure | Stuck synthetic started (no bridge result) |
| J class | Pre-existing Host latch + WIP Panel churn / localhost smoke |
| K Quota | Independent |
| L Panel depth | Amplifier · not BOQ parser itself |
| M TendersModule | Unrelated to stuck-after-mount |

---

## Verdict

```text
AUDIT #01 = COMPLETE

ROOT CAUSE (primary) =
  IkEntryHost P2 NG-02 ingest bridge remains in synthetic "started"
  (bridgeBusy latch / effect cancel / attemptedRef) so heavy dossier
  never lands → Document Expert has 0 extract lines → KNR BLOCKED.

AMPLIFIER =
  TenderDetailPanel maximum update depth / item onUpdate churn

INDEPENDENT =
  QuotaExceeded kw-wgdom-work-catalog
  (earlier) TendersModule dynamic import flake

Historical = NOT CAUSE · blocked downstream

IMPLEMENTATION = NOT AUTHORIZED
COMMIT = 0 · PUSH = 0 · DEPLOY = 0 · FIX = 0
```

**STOP.**
