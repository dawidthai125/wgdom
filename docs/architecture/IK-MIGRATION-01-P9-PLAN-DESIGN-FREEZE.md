# IK-MIGRATION-01 — P9 PLAN + DESIGN FREEZE  
## Owner Verify Live Tender (Gate A / Gate B)

> **ID:** `IK-MIGRATION-01-P9-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P9 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P9 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p9-plan-design-freeze.json`  
> **Prior audit:** [`IK-MIGRATION-01-P9-AUDIT.md`](./IK-MIGRATION-01-P9-AUDIT.md) (`READY_FOR_PLAN`)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §5 · AD-IK-M03 · AD-IK-M04  
> **Truth Gates:** [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md)  
> **P0–P8:** PRODUCTION VERIFIED / LOCKED · CatalogWork **471** LOCKED · P8 live **2.66.85** / **`6f58c8e`**

```text
P9 = OWNER VERIFY live tender
     08def45d-ead6-5db8-962b-120001d33d37
     + Gate A (nie psuć WGDOM / parity / no accidental D)
     + Gate B (IK truth evidence on live tender)
     ≠ expert V2 · ≠ research · ≠ F5/Bid V2 · ≠ auto-Accept · ≠ P10 REMOVE

NO new ikP9* lever (SSOT = process phase; REUSE existing flags/permissions)
RESEARCH = 0 · HTTP = 0 during P9 verify session
ACCEPT / CREATE / BIND / CatalogWork WRITE / PM WRITE = FORBIDDEN in P9
D / expertAiDecydentEnabled = MUST NOT flip
```

---

## 0. Owner resolution (LOCKED)

| Phase | Meaning | Status |
|-------|---------|--------|
| P0–P8 | Design → … → Risk/Decision | **PRODUCTION VERIFIED / LOCKED** |
| **P9** | **Owner verify live tender + Gate A/B** ← **this freeze** | **PLAN DF COMPLETE · IMPLEMENT NOT STARTED** |
| P10 | NG-10 REMOVE | **NOT STARTED** (requires P9 PASS + Owner GO REMOVE) |
| P5.33 | — | **DO NOT CREATE** |

---

## 1. Absolute mode (this document)

| Allowed | Forbidden |
|---------|-----------|
| PLAN + DESIGN FREEZE docs | implement · run live Owner Verify · mutate tender |
| Test matrix design (no tests run) | research · HTTP · Accept · Catalog/PM write · flip D |
| | P10 · P5.33 · commit · push |

**Expected counts:** CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0.

---

## 2. Formal P9 scope (FROZEN)

```text
OWNER VERIFY
  target = 08def45d-ead6-5db8-962b-120001d33d37
  on production (wgdom.fun) — localhost-only = Gate B FAIL (Truth Gates)
  + Gate A evidence
  + Gate B evidence
  + no accidental D mutation
```

**P9 is a controlled Owner Verification procedure** over the already shipped P0–P8 stack.  
**P9 is NOT a new runtime product / expert / research / calculator.**

### 2.1 In scope (future IMPLEMENT — after Owner GO)

1. Owner Verify **runbook** + evidence template (docs / checklist) mapped to Truth Gates §1–§5 + P0 DF §13.  
2. Optional thin **UI markers / checklist surface** only if needed to record PASS/FAIL without new engines — prefer REUSE Tender Detail + EC + existing Admin settings.  
3. Target-tender identity guard (wrong-id protection) in any checklist/script.  
4. Explicit **D mutation guard** + research/Accept hard locks in runbook + any future code.  
5. Minimal tests A–AA (docs/checklist harness style — not invent second Truth engine).  
6. Tip/changelog only if UI ships.

### 2.2 Out of scope (HARD)

| Forbidden | Why |
|-----------|-----|
| New expert / F5 / Bid / Risk / DW / Chief V2 | Parent DF |
| Auto research / HTTP | §11 |
| Auto-Accept / CREATE / BIND / CatalogWork write | §12–§13 |
| Flip `expertAiDecydentEnabled` / Dual Outcome | AD-IK-M03 · §7 |
| Mutate live tender data as part of P9 | Target = identity only |
| P10 NG-10 REMOVE | Separate phase |
| Invent `ikP9*` without evidence | §8 — **not required** |

---

## 3. Target tender (FROZEN)

```text
08def45d-ead6-5db8-962b-120001d33d37
```

| Rule |
|------|
| ID is **Owner Verify target definition only** during PLAN/DF |
| **No** Accept · Bind · Write · CREATE · status transition in PLAN/DF/IMPLEMENT-prep |
| Wrong tender id → **FAIL** (not silent continue) |
| Companion F5 control tender (OfferBoq present) = **OPTIONAL** evidence per Truth Gates §4 — **does not** replace target UUID |

---

## 4. Gate A / Gate B (SSOT REUSE — no Gate V2)

Authority: [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md) + AD-IK-M04.

### 4.1 Gate A — „nie psuć WGDOM”

| Aspect | Existing SSOT |
|--------|---------------|
| Purpose | Regression / parity — app still works; IK OFF path intact |
| Input | Prod (or preview) build · `version.json` · flag snapshot · git SHA |
| Prerequisites | BUILD PASS · relevant harnesses PASS · routing `/przetargi/…/przetarg` |
| Validation | DetailPage · Hub/V4 · Kosztorys · F5 when OfferBoq · Bid shape · PDF callable · ATH preview · mobile scroll · list→detail · C-MODE-1a GAP |
| NG-10 check | default `ikEntryEnabled=false` → Gate still works (until P10) |
| D / Dual Outcome / Offer PLN | **not** changed by accident |
| Payroll / cloud-sync | **zero** unintended diff |
| Output | Gate A **PASS** or **NO-GO** |
| PASS | Surfaces open · no white screen · no accidental D · IK OFF = NG-10 first screen |
| FAIL / BLOCK | Any regression / D flip / white screen / broken Hub/F5/Bid = **NO-GO** stop epic |
| Owner | Confirms Gate A evidence before claiming P9 PASS |
| Provenance | SHA · version.json · screenshots/notes · flag values |

**Statuses (existing language):** PASS · NO-GO (psucie). Do not invent REVIEW→PASS.

### 4.2 Gate B — „IK naprawdę wykonał operację”

| Aspect | Existing SSOT |
|--------|---------------|
| Purpose | Runtime truth + evidence (not UI slogans) |
| Input | Live tender session on target UUID · EC / pipeline / expert facts |
| Prerequisites | Gate A not NO-GO · IK path available for ON checks |
| P9-specific must-show | live `08def45d` **Owner PASS** (Truth Gates §3) |
| FAIL | **localhost only** |
| Forbidden lies | `Bid.ok`⇒materials · NG-10 12-step done · “research” without HTTP/CURRENT evidence |
| Evidence bag | Truth Gates §5 (discovery → … → Bid/SUM) — honest GAP/HOLD allowed |
| Output | Gate B **PASS** or **FAIL** |
| Owner | Signs Owner PASS only with evidence rows (UI without evidence = FAIL) |

**P9 Gate B aggregate:** Owner confirms end-to-end honesty on live target (documents · BOQ/GAP · classification · labor · material · F5/Bid · risk/decision · EC truthfulness · no accidental D) per P0 DF §13 — **without** inventing missing rates as verified.

### 4.3 Procedure order (SSOT — FROZEN)

From Truth Gates §4:

```text
BEFORE SNAPSHOT
→ (any P9 packaging / docs / optional thin UI — after Owner GO IMPLEMENT)
→ BUILD / TEST / ROUTING / RUNTIME
→ REGRESSION (Gate A)
→ NG-10 DEPENDENCY CHECK
→ IK TRUTH CHECK (Gate B)
→ OWNER VERIFY
→ COMMIT/PUSH only on GO
```

**Owner Verify comes after Gate A + Gate B checks** — not before.  
Does **not** invent a second lifecycle; uses existing Tender Detail / IK / NG-10 paths.

---

## 5. Owner Verify workflow (FROZEN)

```text
live tender (target UUID on prod)
  → Gate A evidence (parity / no D mutation / IK OFF OK)
  → Gate B evidence (IK truth on live target; not localhost-only)
  → Owner Verify decision: PASS | FAIL | REVIEW
  → record evidence bag
  → STOP (P10 still blocked until PASS + separate Owner GO REMOVE)
```

| Owner Verify is | Owner Verify is NOT |
|-----------------|---------------------|
| Confirmation of real state | Auto-Accept |
| READ / VERIFY | CREATE / BIND / CatalogWork write |
| May leave GAP/HOLD honest | Promote GAP→PASS invent |
| May Controlled-ON existing IK levers for **observation** (see §8) | Flip D · enable research · silent Accept |

**Automatic system “PASS” ≠ Owner PASS.**

---

## 6. D mutation hard lock (FROZEN)

```text
P9 MUST NOT flip expertAiDecydentEnabled
P9 MUST NOT rewrite Dual Outcome / Offer PLN authority
P9 MUST NOT treat ikEntryEnabled as D
P9 MUST NOT mutate P4 lever as side-effect of “verify”
```

**Explicit D mutation guard (IMPLEMENT / runbook):**

1. Snapshot `expertAiDecydentEnabled` before verify session.  
2. After session: value **unchanged**.  
3. Any diff → Gate A / Owner Verify **FAIL** (accidental D mutation).  
4. AD-IK-M03 remains LOCKED.

---

## 7. IK seam (FROZEN)

| Seam | Role |
|------|------|
| `TenderDetailPage` | Host · tabs · Chief session (existing) |
| `IkEntryHost` + EC | IK ON observation |
| NG-10 Gate path | IK OFF parity (Gate A) |
| Decision Workspace / Risk / Validation | P8 LOCKED — READ observation only |
| Super Admin AppSettings | Existing lever controls |

**No second IK host.**  
**No new Decision Workspace.**

---

## 8. Lever decision (FROZEN)

| Decision | Freeze |
|----------|--------|
| New `ikP9*` / `ikOwnerVerifyEnabled` | **NOT REQUIRED** by SSOT · **DO NOT invent** unless Owner amends DF |
| Control during verify | REUSE existing `ikEntryEnabled` + optional Controlled-ON of P2–P8 **E2E** levers for observation |
| Research levers | **`ikLaborResearchEnabled` / `ikMaterialResearchEnabled` MUST stay false** during P9 verify session |
| Shared `RUN_RATE_EXPERTS` | Remains **false** sentinel |
| After P9 | Restore all Controlled-ON levers to **OFF** (prod default) unless Owner says otherwise |

**Rollback:** leave / return levers OFF → existing prod behavior (P8 OFF etc.). No data rollback.

---

## 9. Research hard lock (FROZEN)

```text
P9 VERIFY SESSION:
  RESEARCH = 0
  HTTP research = 0
```

| Forbidden during P9 |
|---------------------|
| Labor/Material `executeResearch===true` |
| MMR / DIY shop HTTP |
| Automatic rate / price lookup as verify step |

**PLAN freeze:** Controlled Material/Labor **research** during P9 = **OUT OF SCOPE**. MODE A (0 HTTP) observation only if Labor/Material E2E ON.  
If IMPLEMENT discovers an implicit research path on IK ON → **STOP · escalate** (do not workaround).

---

## 10. Accept / write hard lock (FROZEN)

| Action | P9 |
|--------|-----|
| Accept (Labor/Material) | **FORBIDDEN** as P9 step |
| CREATE / BIND CatalogWork | **FORBIDDEN** |
| CatalogWork **471** | **UNCHANGED** |
| Price Memory write | **FORBIDDEN** |
| Decision Persist Approve | **FORBIDDEN** as P9 auto step (Owner may use classic DW later — **separate** workflow) |
| Tender mutation | **FORBIDDEN** |
| EC / screenshots / notes evidence | **ALLOWED** (presentation / docs) |

Default classification: Tender/BOQ/Catalog/PM/EC = **READ** · Verify = **Owner judgment** · Write = **none** in P9.

---

## 11. Phase boundaries (FROZEN)

| Phase | P9 |
|-------|-----|
| P8 | READ Risk/Validation/DW/EC facts · **no** engine change · lever restore OFF |
| P7 | READ Bid/F5/SUM · **no** rewrite |
| P6/P5 | Observation MODE A only · research OFF · Catalog **471** LOCKED |
| P4 | REUSE Chief if Controlled-ON · **no** D flip · **no** P4 semantics change |
| P3–P0 | READ / parity · Truth contract UNCHANGED |

---

## 12. Permissions (FROZEN)

| Who | Existing contract |
|-----|-------------------|
| Perform verify / toggle IK levers | **Super Admin** (AppSettings) + user with Przetargi access (`adminCanViewTendersTab`) |
| See tender / EC | Existing tender ACL |
| Later Accept / DW Approve | Existing Owner contracts — **not** expanded by P9 |
| New permission system | **FORBIDDEN** |

---

## 13. Failure semantics (FROZEN)

| Condition | Terminal |
|-----------|----------|
| Gate A regression / D flipped | **NO-GO** / FAIL |
| Gate B localhost-only | **FAIL** |
| Wrong tender id | **FAIL** |
| Missing sourceRef promoted as verified | **FAIL** (AD-IK-M05) |
| Honest GAP/HOLD/PARTIAL on BOQ/rates | **REVIEW** or record as truth — **not** invent PASS |
| Research accidentally ON | **FAIL** |
| Accept/write occurred under P9 | **FAIL** |

Do not remap FAIL→PASS · BLOCK→PASS · REVIEW→ACCEPT.

---

## 14. Provenance / truth (FROZEN)

REUSE P0 `sourceRef` / `enforceIkConversationTruth`.  
Evidence bag rows per Truth Gates §5.  
No Truth V2. Missing evidence → not verified.

---

## 15. Mobile / UI (FROZEN)

| Surface | Expectation |
|---------|-------------|
| Desktop | Tender Detail + EC (+ optional checklist docs) |
| Mobile bundle | Existing responsive / touch 44px patterns · no H-overflow |
| Physical device | **NOT VERIFIED** unless Owner runs physical smoke |

---

## 16. Test design (matrix — do not implement now)

| ID | Scenario |
|----|----------|
| A | target tender identity |
| B | Gate A PASS |
| C | Gate A FAIL/BLOCK / NO-GO |
| D | Gate B PASS |
| E | Gate B FAIL/BLOCK |
| F | Owner Verify PASS |
| G | Owner Verify REVIEW |
| H | wrong tender protection |
| I | permissions |
| J | provenance / sourceRef |
| K | no research |
| L | no HTTP |
| M | no Accept |
| N | no CREATE |
| O | no BIND |
| P | no CatalogWork write |
| Q | no Price Memory write |
| R | no D mutation |
| S–Z | P8…P0 regression markers |
| AA | mobile/bundle |

---

## 17. Existing test / evidence reuse (FIRST)

| Asset | Reuse |
|-------|-------|
| `IK-MIGRATION-01-E2E-TRUTH-GATES.md` | Gate A/B procedure SSOT |
| P0–P8 implementation harnesses | Regression markers |
| Scripts fixture UUID `08def45d-…` | Identity only — **not** substitute for live Owner PASS |
| P8/P7/P4/Validation/DW tests | Stack LOCKED proof |
| Prod PV patterns (version.json one-shot) | Gate A tip |

**Do not** invent a harness that “PASSes P9” on localhost alone.

---

## 18. Implementation boundary (future)

### MAY touch

- P9 docs / runbook / evidence template  
- Optional thin checklist UI markers on existing Detail/EC (no new host)  
- Target-id guard helpers (read-only)  
- D / research / Accept guard asserts in checklist or minimal tests  
- Tip/changelog if UI ships  

### MUST NOT touch

P0–P8 engines · CatalogWork · Price Memory · research engines · NG-10 REMOVE · invent `ikP9*` · P5.26/31/32 · Dual Outcome.

---

## 19. DESIGN FREEZE checklist

| Item | Status |
|------|--------|
| Scope = Owner Verify + Gate A/B on target UUID | **FROZEN** |
| No `ikP9*` lever | **FROZEN** |
| D mutation guard | **FROZEN** |
| Research/HTTP/Accept/write locks | **FROZEN** |
| Gate A/B SSOT REUSE | **FROZEN** |
| Procedure order Gate A → Gate B → Owner Verify | **FROZEN** |
| P7/P8 boundaries | **FROZEN** |
| CatalogWork 471 | **FROZEN** |
| Test matrix A–AA | **FROZEN** |
| P10 blocked until P9 PASS + Owner GO REMOVE | **FROZEN** |

---

## 20. Escalation gate

**No CHATGPT_ESCALATION** for this PLAN:

- Gate A/B defined in Truth Gates  
- Target UUID + Owner Verify defined in parent/P0 DF  
- Lever absence justified (process phase)  
- Research/D/Accept locks explicit  

Escalate at IMPLEMENT only if: implicit research on verify path · cannot snapshot D · Owner rejects UUID.

---

## 21. FINAL

```text
P9 PLAN + DESIGN FREEZE = COMPLETE
READY FOR P9 OWNER GO

P9 IMPLEMENTATION = NOT STARTED
P10 = NOT STARTED
P5.33 = DO NOT CREATE

CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
COMMIT = 0
PUSH = 0

STOP.
DO NOT IMPLEMENT P9.
DO NOT START P10.
DO NOT CREATE P5.33.
```
