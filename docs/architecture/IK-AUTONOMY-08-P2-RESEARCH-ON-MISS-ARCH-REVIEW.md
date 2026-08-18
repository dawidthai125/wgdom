# IK AUTONOMY-08 P2 — Research-on-Miss  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH REQUIRED FIXES** |
| **Date** | 2026-08-18 |
| **Mode** | ARCH REVIEW ONLY · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.94** · feature **`e0373fac`** · docs **`14ec7b3c`** |
| **Design Freeze** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-DESIGN-FREEZE.md) |
| **PLAN** | [`IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PLAN.md) |
| **AUDIT** | [`IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md`](./IK-AUTONOMY-08-NEXT-AUTONOMY-BREAK-AUDIT.md) |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |

```text
ARCH REVIEW                = PASS WITH REQUIRED FIXES
ARCHITECTURE BLOCKERS      = 0
SSOT CONFLICT              = NONE (process stamp stale ≠ runtime contract)
REQUIRED FIXES             = IC-SEQ-1 · IC-SEQ-2 · IC-TEST-1
Implementation             = NOT AUTHORIZED
Code / Settings / HTTP     = ZERO
Commit / Push / Deploy     = NOT DONE
A08-P2                     = NOT STARTED
EPIC                       = AUTONOMY-08 — NOT CLOSED
```

Nie implementowano. Nie edytowano runtime. Nie poprawiano DF. Nie ruszano WIP.

Nie projektowano alternatywnej architektury. Zamrożony design (REUSE gate + existing engines + host wait) **jest zgodny**. Required fixes **doprecyzowują mechanizm wait** i **companion tests** — bez zmiany OD-P2-1…10.

---

## 1. Scope reviewed

| Item | Reviewed |
|------|----------|
| MASTER SSOT · AI Continuity · 09 | YES |
| A08-P2 PLAN + DF | YES |
| A08-P1 DF / P1 T07 / A05 T11 | YES |
| `ik-entry-flag.ts` gate | YES |
| `IkEntryHost.tsx` P5∥P6 lifecycle | YES |
| `ik-labor-expert.ts` · `labor-research-bridge.ts` · `work-rate-research.ts` | YES |
| `ik-material-expert.ts` · Phase2 wire · `researchEligible` / `demandResearchEligible` | YES |
| `classification-gate.ts` | YES |
| Accept call-sites vs host | YES |
| Composite HTTP void | YES |
| AdminSettings Research toggles | YES |
| Companion harnesses (P0 T20 · A05 T24 · A06 T13 · A07 T15 · migration P5/P6) | YES |

---

## 2. SSOT reviewed

| Contract | DF / P2 | Match |
|----------|---------|-------|
| IK = orchestrator, not second engine | REUSE `runIkLaborGapResearch` / Phase2 | **YES** |
| SEARCH BEFORE CREATE / no new catalog / Evidence | leftover keys only | **YES** |
| Classification BEFORE research | experts already classify then lookup | **YES** |
| LABOR/MATERIAL research on MISS | permission + engine filter | **YES** |
| COMPOUND / UNKNOWN HOLD | F1 `researchEligible` tighten | **YES** |
| Evidence ≠ OUR RATE · no auto-Accept | host does not call `accept*` | **YES** |
| No new research engine / flag | drop conjunct · no new key | **YES** |
| D HARD STOP | NOT TOUCHED | **YES** |
| MASTER „PLAN/DF NOT AUTHORIZED” | Owner GO already issued for PLAN/DF | **not a runtime conflict** |

**Autonomy principle (confirmed):**

```text
IK ON → normalny autonomiczny pipeline (Documents→BOQ→P5→P6→P7→P8)
CONDITIONAL = MISS ∧ classification ∧ identity ∧ legal ∧ budget ∧ cooldown ∧ session
CONDITIONAL ≠ checkbox / hidden opt-in / nowa flaga
```

---

## 3. Architecture verdict

**Zgodny.** A08-P2 to zmiana **semantyki istniejącego gate** + **kolejności istniejących `useEffect`** + **zacieśnienie istniejącego `researchEligible`**. Nie jest nowym orchestratorem.

`IkEntryHost` pozostaje jedynym hostem. Binding `executeResearch: p5/p6ResearchOn === true` **zostaje**. Po drop trzeciego conjuncta `isIkP5LaborExecuteResearchActive()` ≡ `isIkP5LaborE2eActive()` — **KEEP both names** (DF). Brak trzeciego helpera-flagi.

---

## 4. Gate verdict

SOURCE dziś:

```text
resolveIkP5* := Entry ∧ E2E boolean ∧ ikLaborResearchEnabled === true
```

DF target:

```text
resolveIkP5* := Entry ∧ E2E boolean     // AUTO|ON capability, never raw enum
```

| Check | Verdict |
|-------|---------|
| Leftover keys unread by MODE B | **PASS** — AUTO_INGEST pattern |
| No second functional opt-in | **PASS** if conjunct dropped **and** checkboxes REMOVE |
| No new flag | **PASS** |
| IK OFF → permission false | **PASS** (Entry conjunct) |
| P5/P6 OFF → MODE A+B HOLD | **PASS** (E2E conjunct) |
| Permission ≠ HTTP always | **PASS** — experts still MISS-only pending |

---

## 5. Labor verdict

REUSE path **correct**:

```text
runIkMasterBoqLaborExpert
  → lookupWorkRate / internal-first
  → pendingByKey only if researchKey && executeResearch
  → runIkLaborGapResearch → runSelectiveWorkRateResearch
```

| Rule | SOURCE | Verdict |
|------|--------|---------|
| CURRENT → zero HTTP | engine `REUSE`; expert `CURRENT_HIT`; host no `forceRefresh` | **PASS** |
| MISS = ≠CURRENT ∧ LABOR ∧ identity ∧ !INTERNAL_REVIEW | `bucket === "LABOR"` then lookup; INTERNAL_REVIEW clears `researchKey` | **PASS** |
| COMPOUND | bucket `BOTH` → no labor lookup | **PASS** |
| Legal | `WORK_RATE_LEGAL_GATE` → `BLOCKED` | **PASS** |
| Budget | `wrapLookupPortWithIkP5Budget` | **PASS** |
| Cooldown | `isWorkRateResearchInCooldown` | **PASS** |
| Session busy | `SKIPPED_SESSION_BUSY` | **PASS** |
| Invent | no Accept; candidate only | **PASS** |

`LABOR_MATERIAL_PACKAGE` w internal-first jest wewnątrz `if (bucket === "LABOR")` — COMPOUND nie wchodzi. Nie jest bypassem Research.

---

## 6. Material verdict

REUSE: `executeMaterialResearchPhase2` (CURRENT reuse `current_reuse_no_research` · `assertMaterialResearchAllowed` · `autoAccepted: false`).

Autonomous pending **tylko** z:

| Path | Eligibility dziś | Po F1 |
|------|------------------|-------|
| (A) product identity | `researchEligible` **za szerokie** | **MUST** `plane===MATERIAL && bucket===MATERIAL` |
| (B) demand | `demandResearchEligible` już ciasne | **KEEP** |

Inne call-sites Phase2 (`DemandPriceResearchPanel`, `our-price-catalog-refresh`) **nie** są autonomicznym `IkEntryHost`. DF: Phase2 internals NOT TOUCHED. **Nie** F1 bypass hosta.

---

## 7. F1 verdict

**Finding confirmed.** `researchEligible` `return true` po LABOR/NON_COST/`mat.inv.*` wpuszcza COMPOUND/BOTH i UNKNOWN/UNRESOLVED z product identity.

**Frozen resolution closes host F1** if IMPLEMENT applies DF §12 **and** pending remains only (A)+(B).

| Bypass check | Result |
|--------------|--------|
| Path (B) demand | already MATERIAL+MATERIAL |
| Composite `researchEligible(..., "MATERIAL", plane)` | po F1 `plane===COMPOUND` → false; HTTP i tak `void` | **PASS** |
| Phase2 `assertMaterialResearchAllowed` `mat.*` allow | nie kolejkuje pending; host nie woła Phase2 dla HOLD | **PASS** (defense-in-depth, nie dziura hosta) |
| Second pending writer in expert | **NONE** (SOURCE) |

**F1 = PASS** (resolution sufficient · no other host bypass).

---

## 8. P5 / P6 sequencing verdict

Contract OD-P2-3 **PASS**. Mechanizm DF (sam `useState laborSettled`) **NIE jest wystarczający**.

### 8.1 SOURCE race (same flush)

`setState` w efekcie P5 **nie** jest widoczny w efekcie P6 w **tym samym** commit. Po zmianie tenderu `laborSettled===true` ze starego runu → P6 może wystartować **zanim** nowe P5 skończy.

To **nie** wymaga nowego orchestratora. Wymaga **synchronicznego** sygnału.

### IC-SEQ-1 (REQUIRED)

`finally` **nie** ustawia settled, gdy `cancelled === true`.  
Cleanup P5: `cancelled = true`. Inaczej stary run „settle’uje” nowe P6.

### IC-SEQ-2 (REQUIRED)

Zastąpić useState-only przez **równoważny** wait **w istniejącym P6 `useEffect`**:

```text
laborSettledRef          // sync
laborSettleTick          // state only to re-run P6 after finally
P5 effect first line (sync): laborSettledRef.current = false
P5 finally: if (!cancelled) { laborSettledRef.current = true; setLaborSettleTick(n+1) }
P6: if p5LaborOn && laborSettledRef.current !== true → return
    BEFORE materialAttemptedRef
P6 deps: include laborSettleTick
```

Opcjonalnie wiązać settled z `laborKey` (tenderId+lineCount) — dopuszczalne, nie nowy silnik.

**Forbidden remains:** `labor !== null` as settled; write `materialAttemptedRef` on wait path.

P5 OFF → `laborSettledRef.current = true` sync, then P6 may run. KEEP.

**Sequencing = PASS WITH IC-SEQ-1/2.** Not a blocker of Labor-first. Not an alternative architecture.

---

## 9. Zero-switch verdict

| Item | Verdict |
|------|---------|
| REMOVE 2 Technical checkboxes | **PASS** · required (not hide/move) |
| No replacement setting | **PASS** if IMPLEMENT does not add any |
| Leftover `ik*ResearchEnabled` | **PASS** — unread by `resolveIk*` · like `ikAutoIngestEnabled` |
| `isIkLaborResearchEnabled()` leftover readers | **PASS** as leftover · must **not** remain in `isIkP*ExecuteResearchActive` |
| P5–P8 AUTO/OFF/ON selects | **KEEP** · emergency · not Research opt-in |
| Hub panel | **KEEP** · not a host trigger |
| `IkP9OwnerVerifyMarker` reads leftover booleans | **IC-OBS-1 optional** · display only · **not a gate** · not in frozen must-change |

---

## 10. Safety gate verdict

| Gate | Host P2 | Verdict |
|------|---------|---------|
| Legal | engine KEEP · no `bypass` | **PASS** |
| Budget P5/P6 | KEEP | **PASS** |
| Cooldown | host no `bypassCooldown` / no `forceRefresh` | **PASS** |
| Session busy | KEEP | **PASS** |
| Technical failure statuses | not remapped to MISS | **PASS** |
| `INTERNAL_REVIEW` | `researchKey=null` | **PASS** |
| `mat.inv.*` | `researchEligible` + Phase2 A3 | **PASS** |

---

## 11. Accept boundary verdict

| Surface | Verdict |
|---------|---------|
| `acceptWorkRateResearchCandidate` / `acceptMaterialResearchCandidate` bodies | **NOT TOUCHED** |
| Host | **no** `accept*` (SOURCE T13 A05) |
| Experts `acceptedOurRate=0` / `counts.accepted=0` / `autoAccepted:false` | **KEEP** |
| OUR RATE / Final Bid | **NOT TOUCHED** |

Candidate pozostaje candidate. Owner Gate KEEP.

---

## 12. P7 / P8 boundary verdict

| Module | Verdict |
|--------|---------|
| `runIkP7PositionCostBid` | **NOT TOUCHED** · no `executeResearch` arg |
| `runIkP8RiskDecision` | **NOT TOUCHED** |
| D / Chief / Offer / DW / Final Bid | **NOT TOUCHED** |
| Composite HTTP | `void` execute · `feedsP7Bid=false` KEEP |

A08-P2 kończy się na Research-on-Miss. P7/P8 mogą nadal liczyć na lukach przed Accept — **istniejący** kontrakt, nie regresja P2.

---

## 13. Harness verdict

Planowany `test-ik-autonomy-08-p2-research-on-miss.mjs` (source + pure-lib, zero prod HTTP/settings write) **PASS** jako zakres 1–23 DF.

**IC-TEST-1 (REQUIRED):** DF wymienia tylko A05 T11 + P1 T07. SOURCE pokazuje **więcej** asercji, które po drop conjunct **padną**:

| File | Assert dziś | Po P2 |
|------|-------------|-------|
| A05 T11 | AUTO + research false → executeResearch false | musi być **true** (permission) |
| A05 T24 | ON without research lever → MODE A only | permission **true** przy ON+Entry |
| P1 T07 | research-toggle count === 1 | **absent / 0** |
| 08-P0 T20 | Entry true → executeResearch helpers false | **true** przy P5/P6 AUTO |
| A06 T13 / A07 T15 | P7/P8 AUTO + research false → helpers false | helpers **true** jeśli Entry+P5/P6 AUTO (P7/P8 nadal bez HTTP) |
| `test-ik-migration-01-p5/p6` | MODE A ⇒ executeResearch false | zaktualizować do P2 permission |

To **nie** nowe pliki produktowe. Bez IC-TEST-1 CI historyczne harnessy **FAIL**.

Hub vs host duplicate: session busy + cooldown KEEP · residual, nie blocker harnessa.

---

## 14. File scope verdict

Frozen runtime files **all necessary** — **no SCOPE REDUCTION**.

| File | Necessary? |
|------|------------|
| `ik-entry-flag.ts` | **YES** — gate |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | **YES** — wait + binding KEEP |
| `ik-material-expert.ts` | **YES** — F1 |
| `AdminSettingsModal.tsx` | **YES** — REMOVE checkboxes |
| A08-P2 harness | **YES** |
| changelog | **YES** (user-visible autonomy) |
| A05 T11 · P1 T07 | **YES** |

**Scope expansion (tests only, SOURCE-justified):** IC-TEST-1 companion scripts above. **Nie** dodawać runtime plików.

`app-settings.ts` comment-only = optional. Merge/default **no change**.

`IkP9OwnerVerifyMarker.tsx` = **not required** for GO (leftover display).

---

## 15. Risks

| ID | Risk | Rating |
|----|------|--------|
| A | Research on HIT | **PASS** |
| B | Research COMPOUND/UNKNOWN | **PASS** (after F1) |
| C | Race P5/P6 | **REQUIRED FIX** (IC-SEQ-1/2) |
| D | Duplicate Research | **PASS** (pendingByKey · session busy · cooldown) |
| E | Re-entry loop | **PASS** (wait before `attemptedRef`) |
| F | HTTP budget exhaustion | **PASS** (KEEP wrappers) |
| G | Cooldown bypass | **PASS** (no host bypass) |
| H | Session busy bypass | **PASS** |
| I | Legal gate bypass | **PASS** |
| J | Auto Accept | **PASS** |
| K | Hidden opt-in | **PASS** (unread leftover; P9 display optional IC-OBS-1) |
| L | Regression A05 T11 | **REQUIRED FIX** (in DF + T24) |
| M | Regression P1 T07 | **REQUIRED FIX** (in DF) |

---

## 16. Blockers

**ARCHITECTURE BLOCKERS = 0.**

**SSOT CONFLICT — NONE.**

---

## 17. Required changes before implementation

IMPLEMENT **must** honor (Owner decisions **unchanged**):

1. **IC-SEQ-1** — `cancelled` finally must not settle.  
2. **IC-SEQ-2** — synchronous `laborSettledRef` + retrigger tick; P6 wait **before** `materialAttemptedRef`; not useState-only.  
3. **IC-TEST-1** — companion harnesses listed in §13, not only T11/T07.  
4. DF F1 `researchEligible` + gate drop + checkbox REMOVE as frozen.

Do not invent a second orchestrator if wait is implemented as §8.2.

---

## 18. Explicit non-goals (confirmed)

New engine · new flag · PACKAGE · auto-Accept · P7/P8 edit · `flagsFor` rewrite · Phase2 internals · D/Chief · Payroll · Cloud Sync · Hub removal · unrelated WIP · `git add -A`.

---

## 19. Final GO / NO-GO

```text
Architecture model     = GO (reuse gate + engines + host wait)
Owner decisions        = UNCHANGED
DF sequencing detail   = MUST APPLY IC-SEQ-1/2 (React same-flush)
Companion tests        = MUST APPLY IC-TEST-1
IMPLEMENT              = NOT AUTHORIZED until Owner GO after this review
```

**A08-P2 ARCH REVIEW = PASS WITH REQUIRED FIXES**

---

```text
CODE / SETTINGS / HTTP / COMMIT / PUSH = ZERO
```
