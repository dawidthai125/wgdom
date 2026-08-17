# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation · IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **Status** | **PRODUCTION VERIFIED** · **DOCUMENTATION CLOSEOUT = READY FOR OWNER APPROVAL** · **AUTONOMY-08 epic NOT CLOSED** |
| **Date** | 2026-08-17 |
| **UI version** | **2.66.93** |
| **Production** | **2.66.93** / live **`b98e68e`** · impl **`b98e68e5`** (`b98e68e5713c49a2c290cff0269f808d4765a7ab`) |
| **Deploy** | Vercel Git Integration · ID **`2B6ddxCxfxx4FQNmQpzL7W3fnA2X`** · origin/main |
| **OD-08-1** | **APPROVED** — IK ON ⇒ Documents→BOQ · leftover `ikAutoIngestEnabled` is **not** a runtime gate |
| **DF** | [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS · C1–C8 honoured · blockers **0** |
| **PV** | [`IK-AUTONOMY-08-P0-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P0-PRODUCTION-VERIFY.md) |
| **Owner Verify** | **PASS WITH FINDINGS** (non-blocking · not reopened) |
| **D** | **false** (code default · live KV `true` = **PRE-EXISTING**, not A08-P0) |
| **CatalogWork** | **471** UNCHANGED |
| **P1** | **CLOSED** (`mat.inv.*` blocked) |
| **P2 identity** | **KEEP GAP** |
| **Composite** | **CLOSED** |
| **P7 / P8** | **UNCHANGED** |
| **A05 / A06 / A07** | **CLOSED** (prior slices · UNCHANGED this P0) |
| **EPIC CLOSE** | **NOT CLOSED** — 08-P0 only · P3–P8 / 08-P1 remain later slices |

```text
PLAN                   = PASS
OD-08-1                = APPROVED
DESIGN FREEZE          = PASS
ARCH REVIEW            = PASS WITH CONDITIONS · blockers 0
IMPLEMENTATION         = PASS
OWNER VERIFY           = PASS WITH FINDINGS
COMMIT                 = PASS · b98e68e5
PUSH                   = PASS
DEPLOY                 = PASS
PRODUCTION VERIFY      = PASS
P0 CONTRACT            = VERIFIED
P2 RUNTIME             = NOT OBSERVABLE
DOCUMENTATION          = READY FOR OWNER APPROVAL
PRODUCTION             = 2.66.93 / b98e68e5
EPIC                   = AUTONOMY-08 — P0 (epic NOT CLOSED)
```

Pre-commit implementation record: [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT.md).

---

## 1. Locked P0 contract

```text
IK ON  → Documents → BOQ activation
IK OFF → Documents → BOQ automatic activation OFF

isIkP2DocumentsBoqActive() = ikEntryEnabled === true
```

`IkEntryHost` uses the **existing** ingest `useEffect`, gated by the helper (`p2DocumentsBoqOn` / live `i`).

`ikAutoIngestEnabled`:

- remains in `AppSettings` (legacy / internal leftover)
- does **not** activate P2
- no KV migration

**Production proof:** live `ikAutoIngestEnabled = true` **DID NOT** activate P2. P2 depends on IK Entry, not AUTO_INGEST.

---

## 2. Live evidence (PV)

Helper (TendersModule minify):

```text
function An(){ return tn().ikEntryEnabled===!0 }   // isIkEntryEnabled
function bE(){ return An()===!0 }                  // isIkP2DocumentsBoqActive
```

Host:

```text
const i = bE()===!0
k.useEffect(()=>{ if(!i){ ...; return } ... LD(...) / persist local+cloud }, [i, ...])
```

Admin: AUTO_INGEST checkbox **removed**. IK / Przetargi remains the business switch.

Live KV (READ-ONLY): `ikEntryEnabled=false` · leftover ingest `true` → live P2 **false**.

---

## 3. Production Verify distinction

**P0 CONTRACT VERIFIED** ≠ **P2 REAL-TENDER RUNTIME OBSERVED**.

> Production P0 contract is verified. Real P2 runtime execution was not observable because IK Entry was OFF and no settings change was performed during PV.

Do **not** phrase NOT OBSERVABLE as a failure. Do **not** enable IK to manufacture an observation.

---

## 4. Safety (locked)

| Invariant | Status |
|-----------|--------|
| D | **false** (code default) |
| P1 | **CLOSED** |
| P2 identity | **KEEP GAP** |
| Composite | **CLOSED** |
| P7 | **UNCHANGED** |
| P8 | **UNCHANGED** |
| A05 | **CLOSED** |
| A06 | **CLOSED** |
| A07 | **CLOSED** |
| CatalogWork | **471** |
| new engine / flag / orchestrator / bypass / `\|\| true` | **NONE** |
| `mat.inv.*` | **blocked** |

---

## 5. Tests / write audit

Harness: **61 PASS / 0 FAIL** (`test-ik-autonomy-08-p0-documents-boq.mjs` · includes A05/A06/A07).

CatalogWork **471**. Paczka VII BOQ **READY / 159** (read-only · ingest **not** executed).

| Write | Count |
|-------|-------|
| Settings / business / Research / Research HTTP / Tender mutation / CatalogWork / Accept / Price Commit / Final Bid | **0** |

---

## 6. Owner Verify (not reopened)

**OWNER VERIFY = PASS WITH FINDINGS.** Findings were **NON-BLOCKING**:

- live SHA/version timing (closed by deploy `b98e68e`)
- P3–P8 still visible in Admin → planned **08-P1**
- leftover DOM `data-ik-entry-auto-ingest`
- T02 tautology
- Owner Verify did not rerun the 6-minute harness

Do **not** fix these in documentation closeout. Do **not** start 08-P1 here.

---

## 7. Files in feature commit `b98e68e5`

Helper · leftover comment · `IkEntryHost` gate · Admin AUTO_INGEST removal · changelog **2.66.93** · P0 harness · P1/P2/P3/P25 test updates · AUDIT/PLAN/DF/ARCH/impl/Owner Verify docs.

**Not changed:** NG-02 ingest engine · Document Expert · P7/P8 engines · Composite · D · CatalogWork.

---

## 8. Status

```text
DOCUMENTATION CLOSEOUT = READY FOR OWNER APPROVAL
09                     = UPDATED (this closeout set)
Commit (docs)          = NOT DONE
Push                   = NOT DONE
Deploy                 = ALREADY PASS
08-P1                  = NOT STARTED
```

Prior: [`AUDIT`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md) · [`PLAN`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) · [`DF`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md) · [`ARCH REVIEW`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-ARCH-REVIEW.md) · [`IMPL (pre-commit)`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-IMPLEMENTATION-CLOSEOUT.md) · [`OWNER VERIFY`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-OWNER-VERIFY.md) · [`PV evidence`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-PRODUCTION-VERIFY.md)

Prior production: AUTONOMY-07 **2.66.92** / **`0f994437`** · AUTONOMY-06 **2.66.91** / **`ab5eaaa1`** · AUTONOMY-05 **2.66.90** / **`44e81d20`**.
