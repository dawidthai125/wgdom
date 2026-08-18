# IK AUTONOMY-08 P2 — Research-on-Miss  
## IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT` |
| **Status** | **COMPLETE / CLOSED** · **DOCUMENTATION CLOSEOUT = COMPLETE** · **AUTONOMY-08 epic NOT CLOSED** |
| **Date** | 2026-08-18 |
| **UI** | **2.66.95** |
| **Production** | **2.66.95** / live **`1f5d871`** · impl **`1f5d871c`** (`1f5d871c4b59137c94bc0b5ff66b9fdbc27332a6`) |
| **Deploy** | Vercel Git Integration · GitHub Production **`5958146457`** · origin/main |
| **AUDIT** | [`IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md) · **CLOSED** |
| **Owner Decisions** | **OD-P2-1…10 LOCKED / CLOSED** — **UNCHANGED** |
| **PLAN** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md) · **ACCEPTED** |
| **DF** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md) · **ACCEPTED** |
| **ARCH REVIEW** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-ARCH-REVIEW.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-ARCH-REVIEW.md) · **PASS WITH REQUIRED FIXES** · IC-SEQ-1/2 + IC-TEST-1 honoured |
| **OWNER VERIFY** | **PASS** · Implementation Deviation **NO** |
| **PV** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md) · **PASS** |
| **Slice** | **08-P2 only** — Research-on-Miss · **not** Accept UX · **not** P7/P8 · **not** epic close |
| **A08-P0** | **COMPLETE / CLOSED** |
| **A08-P1** | **COMPLETE / CLOSED** |
| **A08-P2** | **COMPLETE / CLOSED** · **DOCUMENTATION CLOSEOUT = COMPLETE** |
| **EPIC CLOSE** | **NOT CLOSED** — do **not** mark AUTONOMY-08 COMPLETE/CLOSED · **do not** start A08-P3 |

```text
AUDIT                  = CLOSED
OWNER DECISIONS        = CLOSED (OD-P2-1…10 UNCHANGED)
PLAN                   = ACCEPTED
DESIGN FREEZE          = ACCEPTED
ARCH REVIEW            = PASS WITH REQUIRED FIXES
IMPLEMENTATION         = COMPLETE
BUILD                  = PASS
TESTS                  = PASS
OWNER VERIFY           = PASS
COMMIT                 = PASS · 1f5d871c
PUSH                   = PASS
PRODUCTION RELEASE     = PASS
PRODUCTION VERIFY      = PASS
DOCUMENTATION          = COMPLETE
PRODUCTION             = 2.66.95 / 1f5d871c
DEPLOYMENT             = 5958146457
A08-P0 / A08-P1        = COMPLETE / CLOSED
A08-P2                 = COMPLETE / CLOSED
EPIC                   = AUTONOMY-08 — NOT CLOSED
```

NEW ENGINE = NO · NEW FLAG = NO · NEW ORCHESTRATOR = NO · KV MIGRATION = NO · APPSETTINGS MIGRATION = NO.

---

## 1. Contract (semantic closeout)

```text
IK ON ∧ P5/P6 AUTO|ON  → executeResearch PERMITTED
Research               = automatic on valid MISS
HIT                    → ZERO Research
Research               ≠ Accept
No additional Research switch
No new Research flag
COMPOUND / UNKNOWN / BOTH / UNRESOLVED → HOLD / zero Research
mat.inv.*              → HARD-FORBID
INTERNAL_REVIEW        → zero auto-research
Technical failure      ≠ MISS
Legal / budget / cooldown / session-busy = KEEP
P5 → P6                = Labor-first
IC-SEQ-1               cancelled ≠ settled
IC-SEQ-2               laborSettledRef + laborSettleTick
```

Leftover `ikLaborResearchEnabled` / `ikMaterialResearchEnabled` remain in AppSettings (default false) as **legacy / no-op** — **not** a runtime conjunct.

---

## 2. Implementation result

`resolveIkP5LaborExecuteResearch` / `resolveIkP6MaterialExecuteResearch` = `ikEntryEnabled === true` ∧ E2E boolean. Host still `executeResearch: p5/p6ResearchOn === true`. HTTP only on true MISS inside existing Labor/Material engines (`runIkLaborGapResearch` · `executeMaterialResearchPhase2`).

Research checkboxes **removed** (not hidden). P5/P6 AUTO\|OFF\|ON selects **kept**. Hub `IkLaborGapResearchPanel` **kept** (not host).

F1: `researchEligible` = `plane === "MATERIAL" && bucket === "MATERIAL"`. `flagsFor` **untouched**.

---

## 3. Files changed (implementation commit)

Commit **`1f5d871c`** `feat(ik): automate research on miss` — 18 files.

| File | Role |
|------|------|
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | drop Research conjunct |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | IC-SEQ-1 / IC-SEQ-2 |
| `src/lib/intelligent-estimator/ik-material-expert.ts` | F1 `researchEligible` |
| `src/app/AdminSettingsModal.tsx` | REMOVE Research checkboxes |
| `scripts/test-ik-autonomy-08-p2-research-on-miss.mjs` | A08-P2 harness **67/0** |
| companion A05 T11/T24 · P1 T07 · A08-P0 T20 · A06 T13 · A07 T15 · migration P5/P6 | IC-TEST-1 |
| `changelog-data.ts` / `CHANGELOG.md` | **2.66.95** |
| PLAN / DF / ARCH REVIEW | docs (this closeout adds PV + tip 09) |

**Nie ruszane:** Accept bodies · OUR RATE · Final Bid · P7/P8 · D · Chief · `classification-gate.ts` `flagsFor` · Phase2 internals · Payroll · Cloud Sync · Hub panel · leftover `ik*ResearchEnabled` keys.

---

## 4. Tests (implementation)

| Harness | Result |
|---------|--------|
| A08-P2 | **67 PASS / 0 FAIL** |
| A05 | **77 / 0** |
| P1 | **53 / 0** |
| A06 T13 | **97 / 0** |
| A07 T15 | **119 / 0** |
| A08-P0 T20 | **63 / 0** |
| migration P5 | **45 / 0** |
| migration P6 | **47 / 0** |
| `npm run build` | **PASS** |

---

## 5. Production observability (not a failure)

Live `ikEntryEnabled = false`. Research HTTP **NOT EXECUTED**.

PV confirmed the **deployed** A08-P2 runtime, gate semantics, classification safety and sequencing **non-destructively**. This is **not** live Research execution. **Do not** phrase IK OFF as PV FAIL. **Do not** enable IK to manufacture HTTP.

---

## 6. Write audit

| Class | Implementation | PV |
|-------|----------------|----|
| Business writes | **0** | **0** |
| Research HTTP | **0** | **0** |
| Settings / KV writes | **0** | **0** (PV `batch-get` read-only) |
| Accept / Final Bid / OUR RATE | **0** | **0** |

---

## 7. Unrelated WIP

**LOCAL / UNCOMMITTED / NOT DEPLOYED.** Nie ruszany. **Nigdy** `git add -A`.

---

## 8. Final state

```text
A08-P2                 = COMPLETE / CLOSED
DOCUMENTATION CLOSEOUT = COMPLETE
CODE THIS TURN         = ZERO
SETTINGS               = ZERO
BUSINESS WRITES        = ZERO
RESEARCH HTTP          = NOT EXECUTED
IK ENTRY               = OFF
DEPLOY                 = ALREADY PASS
PV                     = PASS
A08-P0 / A08-P1        = COMPLETE / CLOSED
EPIC                   = NOT CLOSED
NEXT                   = OWNER instruction only · NIE A08-P3
```

STOP. P2 CLOSED ≠ AUTONOMY-08 CLOSED. Nie startuj A08-P3.
