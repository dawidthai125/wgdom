# IK AUTONOMY-08 P4 — G3 Final Bid Persist
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = ACCEPTED** (Owner GO 2026-08-31 · path A) |
| **Date** | 2026-08-31 |
| **Mode** | DF + thin IMPLEMENT · **≠** Global IK Production Verified · **≠** Experience Phase 5 |
| **Case pilot** | CHROBREGO 34A · `08df0363-7b22-e462-ab56-940001283cba` |
| **Owner Final Bid** | **159 000 PLN netto** · VAT 23% **36 570** · brutto **195 570** |
| **Prior** | A08-P3 G1/G2 **CLOSED** CHROBREGO 56/0 · G3 was **NOT STARTED** |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §2A.7 · §10.0 |
| **Plan pointer** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) §17 · 08-P4 |

```text
════════════════════════════════════════════════════════
G3 = Owner-approved FINAL BID persist in IK
    ≠ submittedBidPln (oferta złożona / kalibracja)
    ≠ ourEstimatePln (szacunek)
    ≠ setOwnerDecision / recordDecision (GO/HOLD/NO-GO · warstwa D)
    ≠ P7 recommendedBidPln (preparation only)
════════════════════════════════════════════════════════
```

---

## 0. AUDIT FINDINGS (READ-ONLY · 2026-08-31)

| Question | Finding |
|----------|---------|
| A. Canonical G3 entry | **MISSING** — `ownerGate` has G1/G2 only · P7/P8 = prepare · zero IK Final Bid persist |
| B. Adapter location | **NEW thin module** under `intelligent-estimator/` + optional `ownerGate.g3Accept` |
| C. Existing target fields | `submittedBidPln` / `ourEstimatePln` / DW decisions — **wrong semantics** (Owner forbid auto-reuse) |
| D. KV | Final Bid object **does not exist** in KV today (PLAN §16) |
| E. Conflict | **No unambiguous G3 target** until this DF creates one |

**HARD:** Do **not** overload `submittedBidPln` (status→submitted + calibration side-effects).  
**HARD:** Do **not** overload `ourEstimatePln` (estimate / history).  
**HARD:** Do **not** require Decision Workspace / D ON.

---

## 1. CANONICAL TARGET (LOCKED)

```text
TenderPipelineItem.ikFinalBid : IkG3FinalBidRecord | null
KV key: kw-tenders-pipeline  (EXISTING DATA_KEY — no new key)
```

### 1.1 Record shape

| Field | Type | Rule |
|-------|------|------|
| `schemaVersion` | `1` | fixed |
| `kind` | `"ik_g3_final_bid"` | discriminator |
| `tenderPipelineId` | string | must match item.id |
| `ocdsId` | string \| null | optional verify |
| `netPln` | number | Owner final net |
| `vatRate` | number | default `0.23` |
| `vatPln` | number | explicit |
| `grossPln` | number | explicit |
| `currency` | `"PLN"` | fixed |
| `source` | `"owner_g3"` | fixed |
| `p7RecommendedNetPln` | number \| null | audit trail (may differ from net) |
| `ownerOverride` | `true` | Owner replaced / set final |
| `approvedAt` | ISO string | write time |
| `approvedBy` | `"owner"` | fixed |

### 1.2 Amount integrity

```text
netPln + vatPln === grossPln  (exact PLN integer preferred)
round(netPln * (1 + vatRate)) ≈ grossPln  (±1 PLN tolerance)
```

### 1.3 Semantic separation (LOCKED)

| Concept | Field / API | G3? |
|---------|-------------|-----|
| Final Bid (IK Owner) | **`ikFinalBid`** | **YES** |
| Submitted offer | `submittedBidPln` + `submittedAt` | NO |
| Estimate | `ourEstimatePln` + `estimateHistory` | NO |
| Strategy GO/HOLD | `kw-tender-decisions` / `setOwnerDecision` | NO |
| DW approve | `recordDecision` | NO |
| P7 proposal | in-memory `TenderBidProposal` | NO (input only) |

---

## 2. EXECUTION PATH (LOCKED)

```text
P7 proposal (read-only numbers)
        ↓
Owner Decision (net / VAT / gross)
        ↓
ik-g3-final-bid adapter (pure build + validate)
        ↓
patch TenderPipelineItem.ikFinalBid
        ↓
saveTendersPipeline → persistKey(kw-tenders-pipeline)
        ↓
READ-BACK verify
```

**Optional UI surface (later):** `ownerGate.g3Accept` — thin call into adapter.  
**Pilot persist:** script / lib call with Owner GO amounts — **no** auto from P7.

---

## 3. SIDE EFFECTS

### ALLOWED

- Write `ikFinalBid` on **one** matching pipeline item
- Bump that item `updatedAt`
- Persist `kw-tenders-pipeline` (LS lean + cloud via existing `saveTendersPipeline` / `persistKey`)
- Preserve `ikFinalBid` across BZP remap / cloud merge

### FORBIDDEN

- `submittedBidPln` / `submittedAt` / status→`submitted`
- `ourEstimatePln` / `estimateHistory`
- `recordSubmittedBidCalibration`
- Catalog / OUR RATE / LABOR_ONLY / BOM / Identity / OfferBoq
- Research HTTP / Accept / Candidate
- `recordDecision` / `setOwnerDecision`
- Payroll / Experience Phase 5 / Global PV claim
- Other tenders

---

## 4. GUARDS

| Guard | Behavior |
|-------|----------|
| Wrong `tenderPipelineId` | **NO WRITE** |
| OCDS mismatch (when provided) | **NO WRITE** |
| Amount integrity fail | **NO WRITE** |
| Missing item in pipeline | **NO WRITE** |
| Idempotent same record | **NO-OP OK** (rewrite same values allowed) |

---

## 5. READ-BACK

After persist:

1. batch-get / load pipeline
2. locate item by pipeline id
3. assert `ikFinalBid.kind === "ik_g3_final_bid"`
4. assert net / vat / gross match Owner decision
5. assert G1/G2 domains untouched (spot-check protected rates if catalog fetched)

---

## 6. CHROBREGO PILOT VALUES (Owner GO)

| | PLN |
|--|-----|
| Net | **159 000** |
| VAT 23% | **36 570** |
| Gross | **195 570** |
| P7 recommended (trail) | 152 900 |

Owner GO covering this DF + IMPLEMENT also covers **one** persist of these amounts for CHROBREGO after tests PASS.

---

## 7. OUT OF SCOPE

- Bid PDF generation
- e-Zamówienia submit
- Auto-sync Final Bid → submittedBid
- Multi-package G3
- A08 epic closeout
- Global IK Production Verified

### 7.1 Consumer / UI (post-persist RCA · 2026-08-31)

**Required for E2E:** READ path `item.ikFinalBid` → `resolveTenderBidProposalForUi` → Analysis Handoff / Expert Conversation.

HARD:
- G3 **never** fills `recommendedBidPln` / never fakes CutoverGate PASS
- When G3 present, classic `"brak authoritative P7 bid"` is **rephrased** as P7 prep note
- Surface: `G3 FINAL BID: PERSISTED · net · VAT · gross`

---

## 8. FILES (IMPLEMENT)

| File | Role |
|------|------|
| `src/lib/intelligent-estimator/ik-g3-final-bid.ts` | ★ adapter · build · validate · persist · read |
| `src/lib/tenders-bzp.ts` | type field `ikFinalBid` · remap preserve |
| `src/lib/tenders-sync.ts` | cloud merge preserve |
| `orchestra-types.ts` / `use-ik-orchestra.ts` | optional `g3Accept` |
| `scripts/test-ik-g3-final-bid.mjs` | harness |
| Master SSOT §10.0 | CURRENT NODE after G3 CLOSED |

---

## 9. ACCEPTANCE

- [ ] DF accepted (this doc)
- [ ] Unit/harness PASS (happy + negative guards)
- [ ] CHROBREGO persist net=159000 · vat=36570 · gross=195570
- [ ] Write counters: only pipeline persist · research=0 · catalog=0
- [ ] Decision Tree node updated
- [ ] ≠ Global Production Verified

**END DESIGN FREEZE**
