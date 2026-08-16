# IK-MIGRATION-01 — P10 DESIGN FREEZE  
## NG-10 DECOMMISSION → IK FIRST-SCREEN

> **ID:** `IK-MIGRATION-01-P10-DESIGN-FREEZE`  
> **Date:** 2026-08-16  
> **Mode:** **DESIGN FREEZE ONLY**  
> **Status:** **FROZEN FOR OWNER / ChatGPT REVIEW** · **IMPLEMENTATION = NOT AUTHORIZED**  
> **CODE = 0 · PATCH = 0 · COMMIT = 0 · PUSH = 0 · DEPLOY = 0 · OWNER GO = NOT ASSUMED**

```text
P10 DF = CREATED (this file did not exist — new document)
P5.33 = DO NOT CREATE
ikP10* levers = FORBIDDEN
NG-10 = DO NOT DELETE UNTIL Owner GO IMPLEMENT
```

**Authority order:**  
[`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) >  
[`IK-MIGRATION-01-P10-PLAN.md`](./IK-MIGRATION-01-P10-PLAN.md) >  
[`IK-MIGRATION-01-POST-P9-NG10-AUDIT.md`](./IK-MIGRATION-01-POST-P9-NG10-AUDIT.md) >  
[`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) (parent) · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

**Conflict check (docs vs code):** **NONE blocking.** Parent DF / P10 PLAN / code agree: Gate mount + `ng10_gate` resolver + TRE early-return L645–681 exist; IK libs do not import NG-10; `ikEntryEnabled` default false; CatalogWork 471 documented lock.

---

## 1. Executive Decision

| Decision | Value |
|----------|--------|
| **P10 purpose** | Hard decommission NG-10 first-screen theater; **IK = sole first-screen** on `TenderDetailPage` |
| **IK role** | Orchestration / seam over existing WGDOM engines — **NO new engines** |
| **NG-10 role after P10** | **ABSENT** from runtime first-screen / Gate / Run / Outcome theater |
| **IK ≠ D** | **LOCKED** — never use `expertAiDecydentEnabled` to turn IK on |
| **New levers `ikP10*`** | **FORBIDDEN** |
| **TRUE GAP for new component/engine** | **NONE identified** — STOP if inventing without evidence |
| **IMPLEMENT** | **FORBIDDEN** until Owner GO (§19) after this DF review |

```text
AD-P10-00 — CONTROLLED DECOMMISSION, NOT REBUILD
```

---

## 2. Baseline

| Field | Value | Evidence |
|-------|--------|----------|
| UI | **2.66.86** | FINAL HANDOFF · tip `09` |
| Impl | **`80c7c26b`** | FINAL HANDOFF · P9 |
| Live (FINAL tip) | **`80c7c26`** | FINAL HANDOFF §1 |
| IK-MIGRATION-01 | **P0–P9 COMPLETE / LOCKED** | FINAL HANDOFF |
| P9 | **PRODUCTION VERIFIED** | P9 PV |
| CatalogWork | **471 LOCKED** | FINAL · P5.26 |
| P5.33 | **DO NOT CREATE** | FINAL |
| NG-10 | **LEGACY / RETAINED** (until P10 IMPLEMENT) | code + decommission map |
| P10 PLAN | **READY / REVIEWED** (input) | P10-PLAN.md |
| P10 IMPLEMENT | **NOT AUTHORIZED** | this DF |

---

## 3. Scope

**IN SCOPE (P10):**

1. Remove NG-10 Gate wrap and autonomous UI/libs/tests from first-screen path.  
2. Make **IK first-screen** deterministic on `TenderDetailPage` (`detailWorkspace` + `IkEntryHost` on tab `przetarg`).  
3. Flip / harden first-screen flag semantics per §11 (existing `ikEntryEnabled` only).  
4. **MIGRATE TRE-01** off `ng10_gate` per §7 (contract only — no code in this DF session).  
5. Update Gate A/B tests, Admin/Guide copy, test-manifest LIB-NG10.  
6. Docs tip / closeout after PV (post-IMPLEMENT).

**IN SCOPE engines:** **REUSE ONLY** (see §10) — bind/presentation already in P0–P9; P10 does not rewrite them.

---

## 4. Non-Scope

```text
OUT — FORBIDDEN in P10:
× New TenderModule / parsers / F5 / Bid / Chief / DW / Classification / Catalog / PM engines
× ATH writer
× P5.33
× Flip expertAiDecydentEnabled / Dual Outcome rewrite
× invent ikP10* / ikOwnerVerify* levers
× CatalogWork Accept/CREATE/BIND/WRITE
× Research ON / auto-Accept
× F5-T2 hotfix (F5-A pre-existing — out of P10 gate claim)
× Hub VM ↔ IK VM merge/delete
× Cloud sync / payroll / Edge changes
× Mobile physical certification (unless Owner expands GO)
× Soft-hide NG-10 while keeping Gate mount as fallback
```

---

## 5. Current NG-10 Runtime

### 5.1 First-screen selection

| Step | Symbol / condition | Evidence |
|------|-------------------|----------|
| Flag | `ikEntryOn = isIkEntryEnabled()` | `TenderDetailPage.tsx` L235 |
| Resolve | `ikFirstScreen = resolveIkDetailFirstScreen(ikEntryOn)` | L236 |
| Resolver | `true → "ik_entry"` · else `"ng10_gate"` | `ik-entry-flag.ts` L339–343 |
| Default settings | `ikEntryEnabled: false` | `app-settings.ts` L153 |
| IK return | `ikFirstScreen === "ik_entry"` → `detailWorkspace` **no Gate** | DetailPage L838–839 |
| NG-10 return | else → `<TenderAutonomousGate>{detailWorkspace}</TenderAutonomousGate>` | L842–854 |
| Host mount | `ikEntryOn && activeTab === "przetarg"` → `<IkEntryHost />` | L749–760 |

### 5.2 Gate theater

| Symbol | File | Role |
|--------|------|------|
| `TenderAutonomousGate` | `src/app/tenders/autonomous/TenderAutonomousGate.tsx` | Run / Outcome / block / LS fingerprint |
| `TenderAutonomousRunScreen` | same folder | S1 timeline/feed |
| `TenderAutonomousOutcomeScreen` | same folder | S2 GO/HOLD/NO-GO theater |
| `tender-autonomous-run-*.ts` | `src/lib/` | phase/timeline/status/transition/gate-exit/fingerprint/ux/outcome |
| LS | `kw-tender-autonomous-run-v1:` | `AUTONOMOUS_RUN_LS_KEY_PREFIX` |

Gate can hide children while `gateBlocksWorkspace` (Gate L293–315) — **blocks workspace until reveal**.

### 5.3 TRE-01 (critical path — confirmed)

| Symbol | Evidence |
|--------|----------|
| `tre01SliceA` | `isTre01SliceAEnabled()` L227 · default **false** (`tenders-v4-config.ts` L15–30) |
| `showTre01Outcome` | L294–299: tab `przetarg` ∧ ¬forceWorkspace ∧ ((D∧recovery) ∨ (¬D∧sliceA)) |
| Early-return ready | L645–668: **`ikFirstScreen === "ng10_gate"`** ∧ `showTre01Outcome` ∧ `tre01Recommendation` → `TenderRecommendationOutcomeView` |
| Early-return loading | L670–681: **`ng10_gate`** ∧ `showTre01Outcome` ∧ ¬recommendation → `data-tre-01-outcome-loading` |
| Recovery CTA | L763–774: Expert ON ∧ ¬showTre01Outcome · `handleTre01RecoveryOutcome` L321–325 |
| Comment (intentional) | L643–644: when IK entry ON, **do not** early-return TRE instead of IK host |

**Branches today:**

| ikFirstScreen | D (expertEffective) | tre01SliceA / recovery | Result |
|---------------|---------------------|------------------------|--------|
| `ng10_gate` | OFF | sliceA ON | Outcome-first early-return (or loading) — **bypasses Gate UI for that return** |
| `ng10_gate` | ON | recovery CTA | early-return Outcome with `data-s7-tre-recovery` |
| `ng10_gate` | ON | no recovery | workspace inside Gate (theater may block) + CTA |
| `ik_entry` | any | showTre01Outcome | **early-return SKIPPED** → workspace + IkEntryHost; CTA if Expert ON |

### 5.4 After naively removing only Gate / `ng10_gate` (without TRE migrate)

| Risk | Effect |
|------|--------|
| Resolver always `ik_entry` | TRE early-return L645/L670 **never runs** |
| Expert ON | CTA still present → OK if early-return migrated for recovery |
| Expert OFF ∧ sliceA LS ON | **lose Outcome-first** unless migrate CTA/early-return |
| Empty screen | **Not** automatic — `detailWorkspace` still builds; risk is **missing Outcome**, not blank root |
| Dead Gate import | build/fail if mount removed incompletely |

---

## 6. Target IK Runtime

```text
TenderDetailPage
  → detailWorkspace                    ★ always (NO TenderAutonomousGate)
       → (tab przetarg) IkEntryHost    ★ IK first-screen surface
            → ExpertConversationSurface
            → Documents → BOQ → Classification → Identity
            → Labor → Material → Position Cost → Bid
            → Risk → Validation → Chief → DW → Owner Verify
              (all existing P0–P9 seams; sub-flags default OFF unless Owner later)
       → Hub / V4 tabs / Kosztorys / TRE CTA (S7) KEEP
```

| Rule | Value |
|------|--------|
| NG-10 Gate/Run/Outcome theater | **ABSENT** |
| First-screen | **IK** (`IkEntryHost` on `przetarg`) |
| Fallback to NG-10 | **FORBIDDEN** |
| Uncontrolled soft fallback | **FORBIDDEN** |

---

## 7. TRE-01 Contract

### CURRENT (locked description)

1. Outcome full-page early-return **requires** `ikFirstScreen === "ng10_gate"` (L645–681).  
2. When `ik_entry`, P1 AD already prefers IK host over TRE early-return.  
3. `TRE_01_SLICE_A_DEFAULT = false` — Outcome-first Expert OFF only with LS OV.  
4. Expert ON: Hub-first + recovery CTA (L301–305, L763–774).

### TARGET (FROZEN)

```text
AD-P10-TRE-01 — TRE decoupled from ng10_gate; IK remains first-screen
```

| Rule ID | Contract |
|---------|----------|
| **AD-P10-TRE-01a** | Delete / never use condition `ikFirstScreen === "ng10_gate"` for TRE. |
| **AD-P10-TRE-01b** | **Auto Outcome-first (Expert OFF ∧ sliceA) as full-page first-screen = SUPERSEDED** by IK first-screen when `ikEntryEnabled === true` (P10 default). |
| **AD-P10-TRE-01c** | **No empty screen:** root render = `detailWorkspace` (+ IkEntryHost on `przetarg`). |
| **AD-P10-TRE-01d** | TRE Outcome **reachable on demand** via CTA: extend visibility so CTA shows when Outcome is available to request — **Expert ON (unchanged)** and **Expert OFF when `tre01SliceA`** (parity migrate; reuse `handleTre01RecoveryOutcome` / `TenderRecommendationOutcomeView`). |
| **AD-P10-TRE-01e** | After CTA sets `tre01RecoveryOutcome`, **full-page Outcome early-return MAY render** (`showTre01Outcome` path) **without** `ng10_gate`, wrapping Outcome only — this is **user-initiated**, not default first-screen. Default first paint remains IK. |
| **AD-P10-TRE-01f** | `useTenderOfferRun`, `TenderRecommendationOutcomeView`, S7 LS/`isTre01SliceAEnabled` = **KEEP** (no new TRE engine). |
| **AD-P10-TRE-01g** | Loading state (`data-tre-01-outcome-loading`) only after user-initiated Outcome request (or equivalent showTre01Outcome true), never as default IK first paint. |

### TRANSITION (FROZEN sequence — implement later)

1. Implement TRE CTA/early-return migrate per AD-P10-TRE-01* **before or in same commit as** Gate delete (no window where sliceA users get blank Outcome and no CTA).  
2. Remove Gate mount.  
3. Default `ikEntryEnabled = true`.  
4. Remove `ng10_gate` type/branch.  
5. Delete autonomous tree + tests.

### ROLLBACK (TRE)

Revert P10 commit(s) restores `ng10_gate` coupling + Gate — see §17. No manual rewrite.

### Owner acknowledgment (behavior change)

Expert OFF + `kw-tre-01-slice-a=1` **loses automatic Outcome-first first paint**; gains IK first-screen + CTA to Outcome. **Must be explicit in Owner GO.**

---

## 8. NG-10 Remove / Keep / Migrate / Blocked Matrix

### REMOVE

| symbol | plik | consumer | runtime path | decyzja | powód | evidence |
|--------|------|----------|--------------|---------|-------|----------|
| `TenderAutonomousGate` | `…/TenderAutonomousGate.tsx` | DetailPage | first-screen wrap | REMOVE | theater | L842–854 |
| `TenderAutonomousRunScreen` | autonomous/ | Gate | S1 | REMOVE | theater | Gate import |
| `TenderAutonomousOutcomeScreen` | autonomous/ | Gate | S2 theater | REMOVE | ≠ DW truth | Gate L354 |
| `TenderAutonomousRunFaq` | autonomous/ | RunScreen | FAQ | REMOVE | theater | RunScreen |
| `tender-autonomous-run-phase.ts` | src/lib | Gate | phases | REMOVE | projection | Gate imports |
| `tender-autonomous-run-timeline.ts` | src/lib | Gate/Run | 12 steps | REMOVE | projection | |
| `tender-autonomous-run-status.ts` | src/lib | Gate | status copy | REMOVE | | |
| `tender-autonomous-run-transition.ts` | src/lib | Gate | hold/timeout UX | REMOVE | | |
| `tender-autonomous-run-gate-exit.ts` | src/lib | Gate | exit | REMOVE | | |
| `tender-autonomous-run-fingerprint.ts` | src/lib | Gate | LS fingerprint | REMOVE | | |
| `tender-autonomous-run-ux.ts` | src/lib | Gate | agents/LS prefix | REMOVE | | |
| `tender-autonomous-run-outcome.ts` | src/lib | OutcomeScreen | theater copy | REMOVE | B→gone | decommission map |
| `test-tender-autonomous-run-*.mjs` | scripts/ | CI LIB-NG10 | unit | REMOVE/archiwum | | manifest LIB-NG10-01 |
| `data-tender-autonomous-*` | UI | PV | selectors | REMOVE | | Run/Gate/Outcome |
| Gate LS writes | Gate L62–71 | browser | persist | STOP write | orphan ignore OK | prefix ux L46 |

### KEEP

| symbol | plik | consumer | runtime path | decyzja | powód | evidence |
|--------|------|----------|--------------|---------|-------|----------|
| Pipeline / NG-02 | tender-pipeline* | DetailPage | always | KEEP | D KEEP | not NG-10 |
| Hub / V4 / Kosztorys | HubPanel, tabs, KosztorysWorkspace | DetailPage | workspace | KEEP | | children |
| OfferBoq / F5 / Bid / SUM | tender-position-cost · bid calc · PackageGate | P7/UI | pricing | KEEP | | REUSE |
| Chief / Validation / DW | chief-* · validation-expert · decision-workspace | Detail/P8 | decision | KEEP | | |
| `ExpertConversationSurface` | expert-conversation/ | Hub + IkEntryHost | EC | KEEP | | |
| `IkEntryHost` + `intelligent-estimator/*` | | DetailPage | IK | KEEP | target | L749 |
| TRE offer run + Outcome **view** | `useTenderOfferRun` · `TenderRecommendationOutcomeView` | DetailPage | S7 | KEEP | AD-P10-TRE-01f | L245–247, L647 |
| `openTenderById` | App.tsx | nav | KEEP | | L2641 |
| Hub EC VM + IK EC VM | two builders | Hub / IkEntryHost | KEEP both | not duplicate engines | P10 PLAN §6 |

### MIGRATE

| symbol | plik | consumer | runtime path | decyzja | powód | evidence |
|--------|------|----------|--------------|---------|-------|----------|
| Gate wrap → none | DetailPage L838–854 | first-screen | MIGRATE | always detailWorkspace | L838–854 |
| `ng10_gate` / resolver | `ik-entry-flag.ts` L9, L339–343 | DetailPage/tests | MIGRATE | remove branch | L342 |
| TRE early-return | DetailPage L645–681 | S7 | MIGRATE | AD-P10-TRE-01* | L645 |
| TRE CTA visibility | DetailPage L301–305, L763–774 | S7 | MIGRATE | Expert OFF sliceA CTA | L301 |
| `ikEntryEnabled` default | `app-settings.ts` L153 | prod first-screen | MIGRATE | default **true** | §11 |
| IK Gate A asserts | `test-ik-migration-01-p*.mjs` | CI | MIGRATE | NG-10 absent | many `ng10_gate` |
| Admin/Guide copy | AdminSettingsModal · GuideView | UI docs | MIGRATE | tombstone NG-10 | Guide L443 |
| test-manifest LIB-NG10-01 | test-infra | CI | MIGRATE | drop suite | manifest |

### BLOCKED

| symbol | decyzja | powód | evidence |
|--------|---------|-------|----------|
| IMPLEMENT without Owner GO | BLOCKED | this DF | §19 |
| Flip `expertAiDecydentEnabled` | BLOCKED | IK ≠ D | app-settings L61–66 |
| `ikP10*` new levers | BLOCKED | no arch need | §11 |
| New engines / adapters without TRUE GAP | BLOCKED | REUSE FIRST | §10 |
| CatalogWork mutation | BLOCKED | 471 lock | FINAL |
| P5.33 | BLOCKED | DO NOT CREATE | FINAL |
| Claiming F5-T2 suite PASS | BLOCKED | F5-A | FINAL §7 |
| Soft NG-10 fallback after P10 | BLOCKED | acceptance | §14 |

---

## 9. Dependency Boundary

```text
AD-P10-DEP-01 — IK NOT DEPENDENT ON NG-10
```

| Check | Result | Evidence |
|-------|--------|----------|
| `src/lib/intelligent-estimator/*` imports NG-10 | **NONE** | grep: only `ng10_gate` string in `ik-entry-flag.ts` type/resolver — not autonomous libs |
| `src/app/intelligent-estimator/*` imports NG-10 | **NONE** | grep 0 |
| Pricing/F5/Bid/P8 need Gate | **NO** | P7/P8 adapters |
| Default UX needs Gate today | **YES** | DetailPage L842 when OFF — **P10 removes this** |
| P10 BLOCKER (engine) | **NONE** | |
| P10 BLOCKER (UI) pre-DF | TRE∧ng10_gate | **RESOLVED IN DF** by AD-P10-TRE-01* |

If future IMPLEMENT discovers import of `tender-autonomous-*` from IK → **STOP · P10 BLOCKER · no invent**.

---

## 10. Reuse Matrix

| Domain | Engine / seam | P10 action |
|--------|---------------|------------|
| Documents | `ik-document-expert` · NG-02 bridge | REUSE |
| Ingest | `ik-ng02-ingest-bridge` · pipeline | REUSE |
| BOQ | OfferBoq v5 · multi-boq · Document Expert | REUSE |
| Classification | `classifyEstimatorPricingPlane` | REUSE |
| Identity | `ik-identity-coverage` | REUSE |
| Labor | `ik-labor-expert` · work-catalog · labor bridge | REUSE |
| Material | `ik-material-expert` · DIY | REUSE |
| Price Memory | our-price-catalog / PM | REUSE |
| Position Cost / F5 | `tender-position-cost` · `ik-p7-*` | REUSE |
| Bid / SUM | `computeTenderBidProposal` · PackageGate | REUSE |
| Risk | `ik-p8-risk-decision` · overlay | REUSE |
| Validation | `analyzeValidationFromDossier` | REUSE |
| Chief | `runChiefOrchestrator` · session hook | REUSE |
| Decision Workspace | `buildDecisionWorkspaceViewModel` | REUSE |
| Expert Conversation | `ExpertConversationSurface` | REUSE |
| PDF | `tender-bid-package-pdf` | REUSE |
| ATH | parser / preview only | REUSE · **no writer** |

**TRUE GAP requiring new engine:** **NONE.**  
If IMPLEMENT proposes a new engine → **STOP** (show gap + why REUSE fails).

---

## 11. Flag Contract

| Flag | P10 change | Lock |
|------|------------|------|
| `ikEntryEnabled` | **default `false` → `true`** (existing AppSettings field only) | Master IK first-screen |
| P2–P8 IK levers | **unchanged defaults `false`** | no silent research/F5/risk ON |
| `expertAiDecydentEnabled` | **NO WRITE / NO FLIP** | IK ≠ D |
| `kw-chief-orchestrator-session` | **NO CHANGE** as IK ON | D OV only |
| `kw-tre-01-slice-a` | **KEEP** semantics; Outcome-first auto superseded when IK ON | AD-P10-TRE-01b |
| `ikP10*` / `ikP10Enabled` | **FORBIDDEN** | no arch need |

```text
AD-P10-FLAG-01 — Only existing ikEntryEnabled; no new P10 lever
AD-P10-FLAG-02 — Sub-feature levers stay OFF unless separate Owner GO
```

After P10, `resolveIkDetailFirstScreen`: eliminate `"ng10_gate"` (always `"ik_entry"` or delete helper if redundant). Dead `ng10_gate` branch = **FAIL Gate A**.

---

## 12. D Lock

```text
AD-P10-D-01 — expertAiDecydentEnabled snapshot before/after IMPLEMENT → diff MUST = 0
AD-P10-D-02 — isExpertAiRuntimeEffective / Dual Outcome / Offer PLN authority UNCHANGED by P10
AD-P10-D-03 — P4 Chief-under-IK remains independent of D (existing seam)
```

---

## 13. CatalogWork Lock

```text
AD-P10-CW-01 — CatalogWork = 471 · no Accept / CREATE / BIND / WRITE in P10
AD-P10-CW-02 — Price Memory write = 0 in P10
AD-P10-CW-03 — Research HTTP = 0 unless separate Owner GO (not P10)
```

---

## 14. Acceptance Contract

After IMPLEMENT + PV, **ALL** must hold:

1. `TenderDetailPage` first paint / first-screen = **IK** (`IkEntryHost` on `przetarg`) — not NG-10 Gate.  
2. NG-10 is **not** first-screen; Gate mount **absent**.  
3. IK orchestration **does not require** NG-10 libs.  
4. IK engines (Documents…Owner Verify seams) run **without** NG-10.  
5. TRE-01: no regression vs AD-P10-TRE-01* (CTA reachability; no auto Outcome-first when IK ON; no empty root).  
6. **No empty/dead screen** on tender open.  
7. **No uncontrolled NG-10 fallback**.  
8. **D unchanged** (diff 0).  
9. **CatalogWork 471** unchanged.  
10. **No engine contract changes** (F5/Bid/Chief/Classification/PM/Catalog).  
11. **No new engines**.  
12. Pricing safety: `GAP≠0` · `NO_MATCH≠absence` · `PARSER_EMPTY≠no price` · Evidence≠OUR RATE · Research≠auto Accept.

---

## 15. Gate A

**PASS before Gate B:**

| # | Check |
|---|--------|
| A1 | DetailPage has **no** `TenderAutonomousGate` import/mount |
| A2 | No runtime first-screen path to autonomous Run/Outcome theater |
| A3 | `ng10_gate` absent from resolver / unreachable |
| A4 | `IkEntryHost` present on tab `przetarg` when `ikEntryEnabled` (default true) |
| A5 | TRE: no dependency on `ng10_gate`; CTA path per AD-P10-TRE-01d/e |
| A6 | Open tender → non-empty `data-tender-detail-v4` workspace |
| A7 | D snapshot tool/assert prepared (diff 0 on IMPLEMENT session) |
| A8 | Dedicated P10 tests (or equivalent) assert NG-10 absence + IK first-screen |
| A9 | Historical IK tests no longer require OFF→`ng10_gate` as success |

---

## 16. Gate B

**PASS before Owner Verify:**

| # | Check |
|---|--------|
| B1 | `npm run build` PASS |
| B2 | P0–P9 relevant regression PASS (research/Accept remain 0) |
| B3 | Bid / PackageGate / SUM smoke PASS |
| B4 | LIB-NG10 removed/skipped — does not block CI |
| B5 | F5-T2: report PRE-EXISTING — **do not claim suite PASS** |
| B6 | Payroll / cloud-sync **untouched** |
| B7 | Changelog entry present |
| B8 | Push + ONE-SHOT `version.json` verify FAST (post-GO IMPLEMENT only) |

---

## 17. Rollback

```text
P10 regression
  ↓
git revert <P10 implement commit(s)>   # pure revert preferred
  ↓
build
  ↓
push → Vercel
  ↓
ONE-SHOT version.json = pre-P10 baseline
  ↓
CONFIRM: Gate path restored by revert tree
  ↓
STOP — no hand-rewriting deleted autonomous files
```

Multi-commit P10 → revert in reverse order (freeze in IMPLEMENT closeout).

---

## 18. Owner Verify

Manual Owner checks (post Gate B):

| # | Verify |
|---|--------|
| OV1 | Open live tender → **IK / Ec surface**, not NG-10 Run theater |
| OV2 | No `data-tender-autonomous-run` / gate-active as first-screen |
| OV3 | Tabs Hub / Kosztorys still work |
| OV4 | If D ON: TRE recovery CTA → Outcome works |
| OV5 | If sliceA LS ON + D OFF: IK first; CTA → Outcome (per migrate) |
| OV6 | D setting unchanged |
| OV7 | No surprise Accept/research |
| OV8 | Controlled P7/P8 ON = **NOT required** for P10 close (optional Owner exercise) |

Target tender (continuity): `08def45d-ead6-5db8-962b-120001d33d37` (P9) — optional re-check.

---

## 19. Owner GO Requirements

Owner GO **must explicitly approve** this DF as:

```text
OWNER GO = NG-10 DECOMMISSION + IK FIRST-SCREEN TAKEOVER
≠ GO for P5.33 / research / Accept / D ON / F5 hotfix / new engines
```

Checklist before IMPLEMENT:

- [ ] Approve **AD-P10-*** including **TRE-01 behavior change** (Outcome-first auto superseded).  
- [ ] Approve **`ikEntryEnabled` default true**.  
- [ ] Approve **hard DELETE** REMOVE matrix (no soft fallback).  
- [ ] Approve **D lock** / CatalogWork 471 / no `ikP10*`.  
- [ ] Approve Gate A / B / Rollback / Acceptance.  
- [ ] Confirm this DF file is the P10 SSOT for IMPLEMENT.

**Without checked GO → IMPLEMENT FORBIDDEN.**

---

## 20. Explicit STOP Conditions

```text
STOP IMPLEMENT if:
• Owner GO missing or scoped differently
• TRUE GAP invented for new engine without evidence
• IK import of tender-autonomous-* discovered unexpectedly
• Plan to flip expertAiDecydentEnabled for IK
• Plan to keep Gate as silent fallback
• Plan to create P5.33 / ikP10*
• CatalogWork write / auto-Accept / research ON in P10
• Docs↔code conflict unresolved (none at freeze time)
• Empty-screen risk unresolved vs AD-P10-TRE-01c
```

---

## Hard locks (carry-forward)

```text
No automatic Accept
No invented prices / units / remapping
GAP ≠ 0 PLN
NO_MATCH ≠ market absence
PARSER_EMPTY ≠ no price
Evidence ≠ OUR RATE
Research ≠ automatic Accept
CatalogWork = 471
P5.33 = DO NOT CREATE
```

---

## File provenance

```text
IK-MIGRATION-01-P10-DESIGN-FREEZE.md
  = NEW FILE (did not exist prior to this session)
  = NOT an overwrite of a prior DF
```

---

## STOP

```text
P10 DESIGN FREEZE = DOCUMENTED
IMPLEMENTATION = NOT AUTHORIZED
NG-10 = STILL IN REPO (unchanged)
CODE = 0
```
