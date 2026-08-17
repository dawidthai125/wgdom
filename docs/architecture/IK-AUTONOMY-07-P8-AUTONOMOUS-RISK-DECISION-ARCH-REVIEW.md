# IK AUTONOMY-07 — P8 Autonomous Risk / Decision Prepare  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH CONDITIONS** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.91** / **`ab5eaaa1`** |
| **Design Freeze** | [`IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md`](./IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md) |
| **O2** | **APPROVED** |
| **OD-P8b** | **B-POLICY APPROVED** |

```text
ARCHITECTURE BLOCKERS      = 0
ARCH REVIEW                = PASS WITH CONDITIONS
DESIGN FREEZE              = CONSISTENT
REUSE FIRST                = YES
NEW ENGINE / FLAG / ORCH   = NO
Implementation             = NOT AUTHORIZED (needs separate Owner GO)
Code / Settings / Tests    = ZERO / NOT RUN
EPIC                       = NOT CLOSED
```

---

## 1. Review Scope

Oceń Design Freeze P8 względem:

1. spójności z kodem źródłowym,  
2. bezpieczeństwa silnika przy **istniejących** przesłankach hosta (w tym **bez** bramki BOQ),  
3. implementowalności bez nowego engine / flagi / orchestratora,  
4. reuse `IkE2eMode` + helperów P5/P6/P7,  
5. B-POLICY / merge OFF-wins / mixed-client / rollback,  
6. izolacji Research / Accept / Price Commit / Final Bid / D / Chief / P1 / P2 / Composite / P7.

**Nie** implementowano. **Nie** zmieniano DF. **Nie** wymyślano bramki BOQ.  
Paczka VII P8 live = **NOT OBSERVABLE** (IK Entry OFF · bez settings write).

---

## 2. Source of Truth

| # | Source | Role |
|---|--------|------|
| 1 | `IK-AUTONOMY-07-NEXT-AUTONOMY-BREAK-AUDIT.md` | First break = P8 · class E |
| 2 | `IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-PLAN.md` | PLAN |
| 3 | `IK-AUTONOMY-07-P8-OWNER-DECISION.md` | O2 |
| 4 | `IK-AUTONOMY-07-P8-OD-P8B-OWNER-DECISION.md` | B-POLICY |
| 5 | `IK-AUTONOMY-07-P8-AUTONOMOUS-RISK-DECISION-DESIGN-FREEZE.md` | DF under review |
| 6 | `src/lib/intelligent-estimator/ik-p8-risk-decision.ts` | Engine |
| 7 | `src/app/intelligent-estimator/IkEntryHost.tsx` | Binding |
| 8 | `src/lib/intelligent-estimator/ik-entry-flag.ts` | Gates |
| 9 | `src/lib/app-settings.ts` | Settings / helpers |
| 10 | `src/app/AdminSettingsModal.tsx` | UI (P8 checkbox today · P7 select pattern) |
| 11 | `src/app/TenderDetailPage.tsx` + `useChiefOrchestratorSession.ts` | Chief / D |
| 12 | `ik-entry-conversation.ts` · overlay · validation · DW VM | Consumers |

If a generic brief mentions BOQ for P8, **SOURCE + DF win**: P8 host/engine **nie** mają osobnej bramki BOQ.

---

## 3. Baseline

| Item | Value |
|------|-------|
| Production | **2.66.91** / **`ab5eaaa1`** |
| Closed | AUTONOMY-05 P5/P6 · AUTONOMY-06 P7 |
| Target | AUTONOMY-07 P8 READ-ONLY prepare |
| Current P8 type | `boolean` · default **`false`** · load/gate **`=== true`** |
| Current P8 UI | checkbox |
| CatalogWork snapshot | **471** |
| Paczka VII | BOQ READY / 159 · P8 **NOT OBSERVABLE** |

```text
IkEntryHost today
  P5 / P6 / Composite / P7 (enum AUTO|OFF|ON)
  P8 useMemo ← isIkP8RiskDecisionE2eActive()  ← boolean === true · default false
```

Target: **same topology**. Only settings type + gate helper + Admin UI. **No new orchestrator.**

---

## 4. Architecture Findings

| # | Finding | Class |
|---|---------|-------|
| 1 | Engine + binding **exist**; first missing piece = **lever semantics** | E (expected · DF closes) |
| 2 | P8 **no BOQ host gate** — engine safe without BOQ (HOLD overlay / Validation HOLD) | **not a blocker** · DF T14 KEEP |
| 3 | Adding a BOQ gate would **change** existing P8 semantics | **forbidden** unless new Owner GO |
| 4 | Helpers P5/P6/P7 already implement B-POLICY + OFF wins | **drop-in reuse** |
| 5 | Same-release type+gate risk (leave `=== true` on enum → autonomy HOLD) | **Condition C1** · not blocker |
| 6 | `forceIkRiskDecisionE2eForTests` still boolean-only | **Condition C2** |
| 7 | Mixed-client `false` over `"OFF"` → AUTO | **Condition C3** residual · same A05/A06 |
| 8 | Chief start remains D (`isChiefOrchestratorSessionEnabled`) · P8 only READS | **PASS** |
| 9 | `canApprove` is VM capability · EC labels Persist Owner · host has **no** persist handler | **PASS** |
| 10 | Paczka VII cannot prove live P8 | **correctly excluded** |

---

## 5. Engine Review

`runIkP8RiskDecision` — **PASS · reuse · no second engine**.

| Check | Result | Evidence |
|-------|--------|----------|
| Exists | **PASS** | `ik-p8-risk-decision.ts` |
| Required input | **`item` only** | opts.item |
| P7 / bid | optional | null → overlay O4 HOLD when raw GO |
| Chief | optional | null → `chief_unavailable` · idle DW · **no invent dossier** |
| Scoring context | optional | local profile + stub health |
| Labor/Material experts | **not called** | no imports |
| Composite | **not imported** | |
| Research HTTP | **0** | `httpCalls: 0` · `researchExecuted: false` |
| CW / PM write flags | **false** | typed locks |
| Accept | **false** | `autoAcceptExecuted: false` · `localDecision: null` |
| D / P4 mutation flags | **false** | `expertAiDecydentFlipped` · `ikChiefWiringMutated` |
| Overlay / validation / DW | **READ-ONLY reuse** | no persist in those modules on this path |
| `loadCompanyProfileLocal` | **READ** (+ incidental schema bump if stale profile — not PM/CW/Accept) | pre-existing scoring helper |

**Engine-level preconditions:** a `TenderPipelineItem`.  
**Not required:** `masterBoq.readyForExperts`, OfferBoq lines, P7 proposal, Chief dossier.

**Safe when invoked under current host prerequisites?** **YES.** Worst case without BOQ/P7/Chief: overlay HOLD (O4) and/or Validation HOLD, in-memory report, EC facts. **No writes.**

---

## 6. Binding Review

`IkEntryHost` `useMemo` — **PASS · exists · no new orchestrator**.

```text
if (!p8RiskOn) return null
return runIkP8RiskDecision({
  item: effectiveItem,
  p7: positionCostBid,          // may be null (P7 OFF or no BOQ)
  bidProposal: positionCostBid?.proposal ?? null,
  chiefSession,                 // null when D=false / P4 not live
})
→ EC riskDecision
```

| Check | Result |
|-------|--------|
| Input validation | TypeScript + engine null paths · **sufficient** for RO prepare |
| P7→P8 adapter | **already present** · do not invent a second |
| Persist / Accept UI | **none** in `IkEntryHost` |
| Host BOQ gate | **absent** · DF KEEP · **do not add** |

Target change: `isIkP8RiskDecisionE2eActive` via `isIkE2eModeActive` only.

---

## 7. Settings Review

| Check | Result |
|-------|--------|
| Same key `ikRiskDecisionE2eEnabled` | **PASS** — no new flag |
| Type boolean → `IkE2eMode` | **FEASIBLE** — identical to P5/P6/P7 |
| Default `"AUTO"` | **FEASIBLE** |
| Reuse helpers | **YES** — `parse` / `normalize` / `merge` / `isIkE2eModeActive` |
| Duplicate P8 helpers | **FORBIDDEN** · not required |
| Today load/merge/gate | `=== true` · **must change in same release as type** (C1) |
| Wrapper `mergeIkRiskDecisionE2eEnabled` | replace body with `mergeIkE2eMode` (mirror `mergeIkF5E2eEnabled`) |
| Eligibility input | keep **derived boolean capability** · never raw enum `=== true` |
| Research keys | **unchanged** · P8 has **no** research lever |

AUTO ≡ ON runtime: both `isIkE2eModeActive` → same host `useMemo`. **PASS.**  
OFF → `p8RiskOn` false → null. **PASS.**

---

## 8. Migration Review

OD-P8b B-POLICY vs existing helpers:

| Input | Expected | `parse` / `normalize` today |
|-------|----------|-----------------------------|
| `true` | ON | ON |
| `false` | AUTO | AUTO |
| missing | AUTO | normalize AUTO |
| malformed | AUTO (not ON) | parse `null` → AUTO |
| `"OFF"` | OFF | OFF |
| enum strings | idempotent | YES |

**PASS** — **no parser fork**. B-CONSERVATIVE would break shared `false→AUTO` (P5/P6/P7) — correctly rejected.

Migration is in-memory load/normalize. **No automatic business write.**

---

## 9. Mixed-Client Review

| Stored | New client | Old client (`=== true`) |
|--------|------------|-------------------------|
| old `true` | ON · active if Entry | active |
| old `false` | AUTO · active if Entry | inactive |
| missing | AUTO · active if Entry | inactive |
| `"AUTO"` / `"ON"` | active if Entry | **HOLD** (fail-safe) |
| `"OFF"` | HOLD | HOLD |
| malformed | AUTO | HOLD |

**no `=== true` against enum** — Condition C1 (impl).  
**no `|| true`** — DF + helpers already forbid.  
**no enum → Research boolean** — P8 has no Research input; P5/P6 Research stays `=== true` on separate keys.

Rollback: revert impl → strings HOLD. **PASS fail-safe.**  
Residual C3: old `false` over `"OFF"` → AUTO (same A05/A06). **Not a blocker.**

---

## 10. Research Boundary

| Check | Result |
|-------|--------|
| P8 engine HTTP | always 0 |
| P8 → `executeResearch` | **no path** in engine or host |
| P8 → Research lease | **no path** |
| P5/P6 Research | independent · **unchanged** |
| AUTO/ON imply Research | **NO** |

**PASS.** Research = **CONDITIONAL**.

---

## 11. Owner Boundary

| Action | P8 AUTO/ON |
|--------|------------|
| Overlay / Validation / DW VM / EC | YES (prepare) |
| Accept | **NO** |
| Price Commit | **NO** |
| Final Bid / `recordDecision` | **NO** |
| `canApprove` | display / EC text · **≠ Persist** |

EC copy already: *Owner-only Persist*. Host has no approve handler.

**PASS.** Accept / Price Commit / Final Bid = **OWNER**.

---

## 12. D / Chief Boundary

| Path | Behavior | P8 relation |
|------|----------|-------------|
| `isChiefOrchestratorSessionEnabled` | `expertAiDecydentEnabled === true` (unless LS OV) | P8 **must not** call / bypass |
| `useChiefOrchestratorSession` | **hard-stops** if D flag false (`invalidate`, no `engine.start`) | P8 does not own this hook |
| `TenderDetailPage` | `chiefSessionEnabled = D \|\| p4Eligible`; still hook-gated by D | P8 **reads** `chiefSession` or null |
| P8 `flagEnabled: true` in DW VM | presentational IK-scoped VM | **does not** write D / LS session flag |
| P8 locks | `expertAiDecydentFlipped: false` · `ikChiefWiringMutated: false` | typed |

With D=false, P8 gets null/idle session → Validation HOLD. **Honest.**  
P8 AUTO **cannot** start Chief. **PASS.** Chief = **OUT OF SCOPE**. D = **FALSE**.

---

## 13. P1 / P2 Review

| Surface | Result |
|---------|--------|
| P1 `mat.inv.*` | P8 does not call Material expert / invoice host |
| P2 identity | P8 does not run ingest / identity coverage |
| `IkEntryHost` P2/P3 | separate levers · unchanged |

**PASS.** P1 **CLOSED**. P2 **KEEP GAP**.

---

## 14. Composite / P7 Review

| Check | Result |
|-------|--------|
| `feedsP7Bid=false` | P8 does not read Composite |
| Composite redesign | **OUT** |
| P7 engine/settings | **UNCHANGED** |
| P8←P7 | existing optional `positionCostBid` only |

**PASS.**

---

## 15. Write Audit

P8 AUTO/ON architecture:

| Surface | Guarantee |
|---------|-----------|
| Accept | 0 |
| Price Commit | 0 |
| Final Bid | 0 |
| PM write | 0 (flag + no PM API) |
| CatalogWork write | 0 |
| PRICE_DEMAND write | 0 |
| Tender mutation | 0 (P8 `useMemo` RO) |
| Research HTTP / lease | 0 |
| D / Chief activation | 0 |
| Runtime settings write | 0 (Admin UI only) |
| CatalogWork 471 | unchanged by P8 |

**PASS** (impl tests T15–T21, T26 must lock this).

---

## 16. BOQ Gate Review

**Critical question (do not invent a gate):**

| Q | Answer |
|---|--------|
| 1. Is existing engine safe under current host prerequisites? | **YES** — RO overlay/HOLD; optional P7/Chief |
| 2. Actual engine preconditions? | **`item` only** |
| 3. Binding input validation sufficient? | **YES** for prepare; null P7/Chief are designed |
| 4. Is a BOQ gate architecturally required? | **NO** |
| Would adding one alter existing P8 semantics? | **YES** — would skip P8/EC on tenders that today still get overlay from `item` |

**Not a safety blocker.** DF T14 **CONSISTENT** with SOURCE.  
**Condition C6:** IMPLEMENT must **not** add `readyForExperts` / OfferBoq skip on P8 host.

---

## 17. Safety Review

| Invariant | Verdict |
|-----------|---------|
| AUTO/ON read-only | **PASS** |
| OFF HOLD | **PASS** |
| AUTO ≠ Research | **PASS** |
| Owner decisions | **PASS** |
| D / Chief | **PASS** |
| P1 / P2 / Composite / P7 | **PASS** |
| No new engine/flag/orchestrator | **PASS** |
| OFF wins / B-POLICY | **PASS** (helpers exist) |
| Default AUTO after migrate | intended autonomy · RO · **PASS** with C1 |

---

## 18. Reuse First

| Helper | P8 can reuse? |
|--------|----------------|
| `IkE2eMode` | **YES** |
| `parseIkE2eMode` | **YES** (B-POLICY) |
| `normalizeIkE2eMode` | **YES** |
| `mergeIkE2eMode` | **YES** (OFF wins) |
| `isIkE2eModeActive` | **YES** |

**REUSE FIRST = YES.** No duplicate logic. P7 Admin `<select>` is the UI pattern.

---

## 19. Architecture Blockers

| Class | Finding |
|-------|---------|
| A architecture defect | **none** |
| B missing binding | **none** |
| C missing engine | **none** |
| D safety conflict | **none** (BOQ absence is HOLD, not write) |
| E configuration | current boolean OFF = **known gap**; DF closes it — not a DF blocker |
| F documentation inconsistency | DF T14 vs SOURCE **aligned** |
| **G no blocker** | **HIT** |

```text
ARCHITECTURE BLOCKERS = 0
```

Cosmetic / residual issues (C1–C6) are **implementation discipline**, not blockers.

---

## 20. Conditions

| ID | Condition | Severity | Testable |
|----|-----------|----------|----------|
| **C1** | Same release: type→`IkE2eMode` **and** `isIkRiskDecisionE2eEnabled` / `isIkP8RiskDecisionE2eActive` via `isIkE2eModeActive(normalize(...))`. Never leave `=== true` on enum. Never `\|\| true`. `mergeIkRiskDecisionE2eEnabled` → `mergeIkE2eMode`. | **HARD** | T01–T12, T27–T28 |
| **C2** | Extend `forceIkRiskDecisionE2eForTests` to `boolean \| IkE2eMode \| null` (true→ON, false→OFF) like P7 C2 | **HARD** | T31 |
| **C3** | Residual: old `false` over `"OFF"` → AUTO — document closeout; coordinated deploy | **RESIDUAL** | T27, T30 |
| **C4** | malformed → AUTO not ON (shared normalize) | **DOC LOCK** | T08, T28 |
| **C5** | Admin UI: `<select>` AUTO/ON/OFF + confirm on OFF; copy ≠ Research/Accept/Commit/Final Bid/D | **HARD** | T34 |
| **C6** | **Do not add** P8 host BOQ/OfferBoq gate (T14 KEEP) | **HARD** | T14 |

None of C1–C6 is an architecture blocker.

---

## 21. Final Verdict

```text
ARCH REVIEW = PASS WITH CONDITIONS

Architecture is sound:
  engine safe without BOQ
  binding sufficient
  reuse helpers sufficient
  B-POLICY / OFF wins already implemented for sibling keys
  write / Research / Owner / D / Chief isolations hold in SOURCE

Proceed to Owner Implementation GO only if Owner accepts C1–C6.
Do NOT invent new engine / flag / orchestrator / BOQ gate.
Do NOT reopen P1 / P2 / Composite / P7 / D / Chief / Research automation.
Follow DF implementation sequence after GO.
```

---

## 22. Implementation Authorization

| Gate | Status |
|------|--------|
| PLAN | READY |
| O2 | APPROVED |
| OD-P8b B-POLICY | APPROVED |
| Design Freeze | READY FOR ARCH REVIEW → **reviewed · CONSISTENT** |
| Arch Review | **PASS WITH CONDITIONS** |
| Owner IMPLEMENT GO | **PENDING** |
| **IMPLEMENTATION** | **NOT AUTHORIZED** |

Even with PASS: **no code** until separate Owner Implementation GO.

---

## FINAL STATUS

```text
ARCHITECTURE BLOCKERS      = 0
DESIGN FREEZE              = CONSISTENT
REUSE FIRST                = YES
NEW ENGINE                 = NO
NEW FLAG                   = NO
NEW ORCHESTRATOR           = NO
P8 AUTO                    = PASS
P8 ON                      = PASS
P8 OFF                     = PASS
Research                   = CONDITIONAL
Accept                     = OWNER
Price Commit               = OWNER
Final Bid                  = OWNER
D                          = FALSE
P1                         = CLOSED
P2                         = KEEP GAP
Composite                  = CLOSED
P7                         = UNCHANGED
CatalogWork                = 471
Implementation             = NOT AUTHORIZED
Code                       = ZERO
Settings                   = ZERO
Research HTTP              = ZERO
Business writes            = ZERO
Commit                     = NOT DONE
Push                       = NOT DONE
Deploy                     = NOT DONE
Production Verify          = NOT DONE
EPIC                       = NOT CLOSED
STOP.
```
