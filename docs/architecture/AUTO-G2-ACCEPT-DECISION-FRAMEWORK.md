# AUTO_G2_ACCEPT — Decision Framework

| Field | Value |
|-------|-------|
| **Decision ID** | `AUTO_G2_ACCEPT` (umbrella) |
| **Sub-decisions** | `AUTO_RATE_ACCEPT` · `AUTO_BOM_ACCEPT` |
| **Status** | **POLICY ACCEPTED (GO23)** · **RUNTIME IMPLEMENTED (GO24)** |
| **Date** | 2026-09-08 |
| **Owner GO** | GO23 policy · **GO24 runtime** |
| **Runtime module** | `src/lib/intelligent-estimator/orchestra/auto-g2-accept-contract.ts` · `ik-auto-g2-phase.ts` |
| **Wire** | `ik-orchestra-engine.ts` after Identity · before Classification/P7 |
| **Master SSOT** | §12.2.2 · §14 · §15 · §20 · §22.1 · §23 |
| **Prior audit** | GO22 `.tmp/goa-tpi729-auto-g2-v1.*` |
| **Policy pack** | `.tmp/goa-tpi729-autonomy-g2-policy-v1.*` |
| **Sibling** | [`AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md`](./AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md) |

---

## 1. Purpose

Establish the **legal policy transaction** for routine G2 rate + BOM on the website:

```text
trusted identity
  → validate AUTO_RATE_ACCEPT
  → validate AUTO_BOM_ACCEPT
  → (when both PASS) continue P5/P6 compute → P7/P8 → BidCutoverGate
```

Human Owner G2 Accept/Edit/Reject remains **exception/correction only**.

This DF does **not** authorize inventing rates, BOM, materials, waste factors, Finance unlock, or Final Bid.

**GO24 = RUNTIME** — evaluateAutoRateContract / evaluateAutoBomContract · Orchestra phase · REUSE CURRENT + TechnologyPack/LABOR_ONLY only · R1–O1 CLOSED by Owner (research persist NO · STALE NO · provisional NO).

---

## 0. Owner CLOSED decisions (GO24)

| ID | Decision |
|----|----------|
| **R1** | Research → OUR RATE AUTO PERSIST = **NO** |
| **R2** | STALE = **NOT** authorized for AUTO |
| **R3** | No tender-rate plane |
| **B1** | Provisional cc-w2-* = **NOT** AUTO_BOM |
| **B2** | Do **not** expand LABOR_ONLY allowlist |
| **P1** | Explicit provenance **required** (`autoG2Rate` / `autoG2Bom`) |
| **O1** | No overwrite stronger/fresher |

---

## 2. Transaction types

| ID | Name | When |
|----|------|------|
| **A1** | `AUTO_RATE_ACCEPT` | Rate contract PASS → REUSE existing OUR RATE **or** (future) authorized persist |
| **A2** | `AUTO_BOM_ACCEPT` | BOM contract PASS → TechnologyPack resolve **or** explicit LABOR_ONLY allowlist |
| **A** | `AUTO_G2_ACCEPT` | Umbrella: A1 ∧ A2 both PASS for the line/work |
| **B** | Owner G2 Accept/Edit/Reject | Escalation / correction — research candidate → OUR RATE / PM |
| **C** | EXCEPTION / HOLD | Contract FAIL after permitted retries → real runtime exception (≠ force click) |

**Do not merge A1 and A2** — authority models differ (Work Catalog OUR RATE vs TechnologyPack / LABOR_ONLY).

---

## 3. Intended Orchestra route (policy)

```text
Document → C2 → OfferBoq
  → G1 AUTO (AUTO_G1_ACCEPT)                    ← GO21 runtime
  → G2 AUTO_RATE (AUTO_RATE_ACCEPT)             ← GO23 policy · GO24+ runtime
  → G2 AUTO_BOM (AUTO_BOM_ACCEPT)               ← GO23 policy · GO24+ runtime
  → P5 / P6 (compute + conditional research ≠ Accept)
  → P7 / P8
  → BidCutoverGate
  → Finance ok (derived)
  → Chief
  → G3 Final Bid                                ← Owner KEEP
```

Finance readiness = prerequisites · **not** unlocked by G2 AUTO alone.  
G3 = Owner · **KEEP**.

---

## 4. AUTO_RATE_ACCEPT

### 4.1 Two modes (do not confuse)

| Mode | Meaning | Persist write? |
|------|---------|----------------|
| **REUSE** | `lookupWorkRate` = CURRENT (existing canonical OUR RATE) → Position Cost labor input | **No** (already on work card) |
| **PERSIST** | Write new/updated `ourWorkRate` onto Work Catalog | **Yes** — only if source class authorized below |

### 4.2 Source authority matrix (existing architecture only)

Canonical types: `WorkRateSourceType` = `OWNER` \| `ACCEPT` \| `CALCULATED` \| `RESEARCH`  
Lookup: `lookupWorkRate` · Accept writer: `acceptWorkRateResearchCandidate`  
Evidence store: `kw-wgdom-labor-source-evidence` · **≠** OUR RATE  
Legacy: `companyPricePln` · **≠** OUR RATE (Master §14 / C-CPLN-1)

| Source class | Auto REUSE (compute) | Auto PERSIST (write OUR RATE) | Owner approval | Freshness | Provenance mandatory | Unit exact match | Conflict |
|--------------|---------------------|-------------------------------|----------------|-----------|----------------------|------------------|----------|
| Catalog OUR RATE **CURRENT** | **YES** | N/A (already persisted) | No | CURRENT required for clean PASS | existing `sourceType` on card | **YES** | N/A |
| Catalog OUR RATE **STALE** | **OPEN** (escalate vs allow with STALE gap) | **NO** auto-refresh | Yes to refresh | STALE | yes | **YES** | EXCEPTION if competing write |
| Research **candidate** | **NO** | **OPEN** — default **NO** until Owner GO | **YES** (current SSOT) | candidate observedAt | candidate fingerprint | **YES** | EXCEPTION |
| Labor **Evidence** pack | **NO** | **NO** | YES to become candidate then Accept | n/a | evidence ≠ rate | — | — |
| `companyPricePln` | **NO** as OUR RATE | **NO** | YES if ever promoted via separate GO | — | — | — | — |
| Historical Executed (`AUTHORITY=false`) | **NO** | **NO** | YES | — | — | — | — |
| Project/tender-specific rate store | **OPEN** if a canonical store is proven later | **OPEN** | TBD | TBD | TBD | TBD | TBD |
| Invented / guessed / first-candidate / highest-score-only | **NO** | **NO** | — | — | — | — | EXCEPTION |

**LOCKED:** Research result → **candidate** only.  
**LOCKED (current):** Candidate → OUR RATE requires **Owner Accept** (`acceptWorkRateResearchCandidate`) unless a future Owner GO explicitly authorizes `AUTO_RATE_PERSIST` for a named source class.

**OPEN POLICY DECISION R1:** Authorize research-candidate → `AUTO_RATE_PERSIST`? Default until decided: **NO**.  
**OPEN POLICY DECISION R2:** STALE OUR RATE — REUSE with gap vs EXCEPTION vs Owner-only refresh?  
**OPEN POLICY DECISION R3:** Does a dedicated tender/project rate plane exist as canonical? (Do not invent.)

### 4.3 Preconditions (REUSE — authorized)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Trusted work identity (`catalogWorkId` + trusted G1 tuple) | LOCKED |
| 2 | `lookupWorkRate` status = `CURRENT` | LOCKED for clean AUTO_RATE REUSE |
| 3 | Unit compatibility exact (`work.unit` ↔ BOQ unit) | LOCKED |
| 4 | No invent numeric rate | LOCKED |
| 5 | Fail-closed on MISSING → EXCEPTION/HOLD (or research→candidate if levers allow) | LOCKED |
| 6 | Idempotent: REUSE does not rewrite catalog | LOCKED |
| 7 | Audit: workId · unit · identityKey · sourceType · observedAt | LOCKED principle |

### 4.4 Persistence contract (PERSIST — future runtime only)

| Field | Value |
|-------|-------|
| Store | `kw-wgdom-work-catalog` (`ourWorkRate`) |
| Writer today | `acceptWorkRateResearchCandidate` → `saveWorkCatalogRouted` |
| AUTO writer | **NOT IMPLEMENTED** (GO24+) · only after OPEN R1 (or other authorized class) closed |
| Provenance | Must **not** use OfferBoq `matchMethod: "manual"`. Rate plane uses `sourceType` (`OWNER`/`ACCEPT`/`…`). **OPEN P1:** whether AUTO persist needs a dedicated accept provenance tag (reuse `ACCEPT` + audit ruleId vs new enum) — **do not duplicate vocabularies silently** |
| Idempotency | Same workId+unit+BASE fingerprint → no-op |
| Overwrite | See §7 |

---

## 5. AUTO_BOM_ACCEPT

### 5.1 Source authority matrix

| Source class | Auto resolve | Auto invent | Owner required |
|--------------|--------------|-------------|----------------|
| Exactly **one** active `TechnologyPack` for workId | **YES** (`resolveTechnologyBomForWork`) | **NO** | No |
| Multiple packs (`AMBIGUOUS_BOM`) | **NO** | **NO** | Yes / EXCEPTION |
| Zero packs (`MISSING_BOM`) | **NO** | **NO** | See §6 |
| `OWNER_APPROVED_LABOR_ONLY_WORK_IDS` / `isExplicitLaborOnlyWork` | **YES** → `LABOR_ONLY` | **NO** (allowlist only) | Allowlist = prior Owner GO |
| Provisional `cc-w2-*` LABOR_ONLY path (`isProvisionalLaborOnlyPath`) | **OPEN B1** (exists in compute today; policy authority for AUTO_BOM not frozen as Owner allowlist) | **NO** | Clarify B1 |
| Inferred BOM / guessed factors / waste / materials | **NO** | **NO** | — |
| Cross-dwelling BOM copy | **NO** | **NO** | — |

### 5.2 Preconditions (authorized TechnologyPack path)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Trusted work identity | LOCKED |
| 2 | Exactly one active TechnologyPack | LOCKED |
| 3 | Recipe lines valid (`validateRecipeLine`) | LOCKED |
| 4 | Unit compatibility / no silent conversion gap | LOCKED |
| 5 | Material/factor data from pack only (authoritative recipe) | LOCKED |
| 6 | No unresolved material competition | LOCKED |
| 7 | Provenance: packId · packVersion · workId | LOCKED |
| 8 | Deterministic persistence of resolve result into Position Cost shadow (ephemeral) | LOCKED existing |
| 9 | Fail-closed MISSING/AMBIGUOUS → EXCEPTION/HOLD | LOCKED |

### 5.3 Prohibited

- inventing BOM / material / quantity factor / waste  
- deriving LABOR_ONLY from MISSING_BOM  
- expanding LABOR_ONLY allowlist without Owner GO  
- first-match among multiple packs  
- highest-score-only pack selection  

---

## 6. MISSING_BOM policy

When: **trusted identity + MISSING_BOM**

| Outcome | Policy status |
|---------|---------------|
| **A. EXCEPTION / HOLD** (`BRAK_TECHNOLOGII_BOM`) | **LOCKED default** (current F5 / bom-technology-adapter) |
| **B. LABOR_ONLY** | **Only** if `isExplicitLaborOnlyWork` (Owner allowlist) — **not** inferred |
| **C. Research → candidate → validation** | Material research may produce **candidates**; **≠** auto PM / ≠ invent TechnologyPack · Accept remains Owner unless future Material AUTO GO |
| **D. Other** | None authorized without new Owner GO |

**OPEN POLICY DECISION B2:** May Owner expand LABOR_ONLY allowlist for specific works (e.g. `legacy-roboty_ogolnobudowlane-m2`)? — case GO, not silent.  
**OPEN POLICY DECISION B1:** Is provisional `cc-w2-*` LABOR_ONLY an authorized AUTO_BOM class equivalent to allowlist?

---

## 7. Overwrite precedence

AUTO G2 **must never** overwrite stronger/fresher data unless explicit future policy says so.

| Existing | Incoming AUTO | Rule |
|----------|---------------|------|
| Fresher Owner-approved OUR RATE (`sourceType: OWNER` or Owner Accept) | AUTO persist candidate | **NO overwrite** → EXCEPTION or no-op |
| Fresher canonical CURRENT | older candidate | **NO overwrite** |
| Stronger BOM (explicit TechnologyPack / Owner LABOR_ONLY) | weaker inferred | **NO** |
| Manual correction | AUTO | **NO overwrite** without Owner |

**OPEN POLICY DECISION O1:** Does current `acceptWorkRateResearchCandidate` already enforce fresher-Owner guard? Runtime GO24 must verify/add — **do not assume**.

---

## 8. Exception model

```text
AUTO_RATE / AUTO_BOM attempt
  → PASS → continue (REUSE/resolve)
  → FAIL → permitted research (if levers) → candidate only
  → re-validate
  → still FAIL → EXCEPTION/HOLD
```

EXCEPTION/HOLD **≠** «Owner must click Accept» as normal UX.  
Owner Gate remains **available** as escalation/correction.

---

## 9. Research boundary (LOCKED)

```text
research result  →  candidate
candidate        →  OUR RATE / PM ACTIVE   ONLY via:
                      (a) Owner G2 Accept   ← current SSOT
                      (b) AUTO_RATE_PERSIST / Material AUTO  ← OPEN; default NO
```

**NIGDY:** research when CURRENT · Evidence ≠ OUR RATE · research ≠ silent Accept · second labor catalog.

---

## 10. Prohibited behavior (global)

- invent rates / BOM / materials / waste / price  
- copy arbitrary historical values without authority  
- companyPrice → OUR RATE without authority  
- research candidate → OUR RATE without explicit policy (R1)  
- first candidate / highest score alone  
- bypass unit compatibility  
- overwrite stronger/fresher data  
- bypass Finance / BidCutoverGate  
- generate Final Bid  
- fake UI click / manualOverride masquerading as AUTO  
- write identity/rate into `dossier.kosztorys`  

---

## 11. Provenance

| Plane | Routine AUTO | Exception |
|-------|--------------|-----------|
| G1 identity | `matchMethod: "auto_contract"` | `manual` |
| Rate REUSE | existing `ourWorkRate.sourceType` + lookup audit | — |
| Rate PERSIST (future) | **OPEN P1** — not `manual`; prefer audit ruleId + existing `sourceType` | Owner Accept → `ACCEPT` |
| BOM | packId/version or LABOR_ONLY allowlist id | Owner Material Accept / allowlist GO |

Never silently create a second provenance vocabulary.

---

## 12. TPI/729 application (GO22 baseline — no mutation)

| Metric | N |
|--------|--:|
| Trusted | 59 |
| Ready | 52 |
| Blocked | 37 |
| Trusted incomplete | 7 |

| Work | Lines | Rate | BOM | Under GO23 policy |
|------|------:|------|-----|-------------------|
| `cc-w2-scianki-dzialowe-gr-pakiet-m2` | 6 | MISSING | provisional LABOR_ONLY | AUTO_RATE **FAIL** (no CURRENT) · AUTO_BOM **OPEN B1** |
| `legacy-roboty_ogolnobudowlane-m2` | 1 | MISSING | MISSING_BOM packs=0 | AUTO_RATE **FAIL** · AUTO_BOM **EXCEPTION** (A) |

**Do not modify these lines in GO23.**

### Counterfactuals (no invent)

| Scenario | Expected gate effect |
|----------|----------------------|
| **A** Canonical CURRENT rates legally REUSE-AUTO | **0** of 7 advance (all MISSING) → still **52/89** |
| **B** Canonical TechnologyPack BOM AUTO | Focus packs=0 → **0**; GK BOM already non-blocking → still **52/89** |
| **C** Research candidates AUTO-PERSIST authorized (R1=YES) | Policy/risk: market BASE could become OUR RATE without Owner; requires fingerprint/idempotency/overwrite guards · **numeric advance unknown without live candidates** (do not invent) |
| **D** Research cannot auto-accept (R1=NO, default) | Residual: labor **7** + identity **29** + unit **1** = blocked **37** |

---

## 13. Test policy (GO23 suite + future runtime)

1. Canonical CURRENT rate can AUTO REUSE only when authorized  
2. Unauthorized rate cannot AUTO  
3. Research candidate does not silently become OUR RATE  
4. Unit mismatch blocks AUTO rate  
5. Stale source blocks or escalates per policy (R2)  
6. Canonical TechnologyPack can AUTO BOM when authorized  
7. Missing BOM fails closed  
8. LABOR_ONLY cannot be invented from MISSING_BOM  
9. Stronger/fresher value not overwritten  
10. AUTO G2 idempotent  
11. Provenance auditable  
12. Finance remains derived  
13. G3 remains Owner  
14. G1 AUTO remains functional  
15. `dossier.kosztorys` untouched  

Policy-level suite: `scripts/test-auto-g2-policy-go23.mjs`.

---

## 14. Open policy decisions — **CLOSED by Owner GO24**

| ID | Decision | Status |
|----|----------|--------|
| **R1** | Research candidate → AUTO_RATE_PERSIST? | **CLOSED = NO** |
| **R2** | STALE OUR RATE | **CLOSED = NOT authorized for AUTO** |
| **R3** | Tender/project rate plane | **CLOSED = none** |
| **B1** | Provisional `cc-w2-*` LABOR_ONLY = AUTO_BOM? | **CLOSED = NO** |
| **B2** | Expand LABOR_ONLY allowlist | **CLOSED = NO** (this GO) |
| **P1** | AUTO provenance tag | **CLOSED = `autoG2Rate` / `autoG2Bom` on OfferBoqLine** |
| **O1** | Fresher-Owner overwrite guard | **CLOSED = implemented in contract** |

---

## 15. Runtime (GO24)

| Item | Status |
|------|--------|
| `evaluateAutoRateContract` | **IMPLEMENTED** |
| `evaluateAutoBomContract` | **IMPLEMENTED** |
| `runIkAutoG2Phase` + Orchestra wire | **IMPLEMENTED** |
| TPI Accept / invent / Finance | **FORBIDDEN** |
