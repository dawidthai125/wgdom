# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S6 (Decision Persist → legacy bridge)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **READY FOR IMPLEMENT** (czekaj Owner GO)  
> **ID:** TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S6 — Decision Persist / store bridge**  
> **TRYB:** DESIGN FREEZE (LOCKED) · IMPLEMENT tylko po jawnym Owner GO  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** · feature S5 **`ebae3d2e`** · docs tip **`677afd98`** · **PRODUCTION VERIFIED** · GREEN  
> **Owner GO DF:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S6-AUDIT.md`](TENDER-MODERNIZATION-01-S6-AUDIT.md) (**COMPLETE**)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S6-PLAN.md`](TENDER-MODERNIZATION-01-S6-PLAN.md) (**COMPLETE**)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **Decision arch:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md) §4–§7  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §4.3 · §6 · §11 S6 · AC-S6  
> **Prior CLOSED:** S0 · S1 · S2 · S3 · S4 · S5  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **NIGDY** w S6

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S6 — DESIGN FREEZE

LOCKED scoring REUSE (NO new engine):
  scoreTender → TenderScoringBundle
  → scoreTenderForOwnerView
  → buildTenderIntelligenceContext
  → intelligenceCtx.scoringBundle
  systemDecision = scoringBundle.decision
  scores = opportunity.score + strategic.score

LOCKED Persist-first:
  Host.onAction → recordDecision → kw-decision-persist-v1
  Persist FAIL → ZERO legacy mirror

LOCKED map (bridge module ONLY):
  approve      → GO
  reject       → NO-GO
  needs_review → HOLD
  return       → no Persist · no mirror

LOCKED legacy write REUSE:
  setOwnerDecision(scoringBundle, mapped)
  → kw-tender-decisions (+ React state)

LOCKED missing bundle:
  Persist SUCCESS · mirror SKIP · Persist NOT failed

LOCKED prop-drill:
  TenderDetailPanel → Host (scoringBundle)
  TenderWorkflowHubPanel → Host (scoringBundle)
  NO DetailPage Host mount · NO new scoring call

NO NEW FLAG · NO third store · NO cloud · NO Strategy rewrite
S4/S5 behavior KEEP · 8 LOCK · Rollback = git revert

STATUS: DESIGN FREEZE COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S6-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S6-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT S6 → AC harness → Owner QA → build
        → commit allowlist ONLY → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend.  
Agent **nie** rozszerza allowlist poza §12, **nie** rusza 8 LOCK BC, **nie** tworzy scoringu, **nie** rewrite Strategy, **nie** usuwa DecisionView, **nie** zmienia S4/S5 UX, **nie** stage’uje `useTenderOfferRun.ts`, **nie** startuje S7/S8.

### STOP conditions (pre-IMPLEMENT)

| STOP jeśli | Stan DF |
|------------|---------|
| Potrzeba nowego silnika scoringu / `scoreTender` w Host | **NIE** — REUSE `intelligenceCtx.scoringBundle` |
| Potrzeba nowego store key / Persist schema bump | **NIE** — denylist |
| Potrzeba Strategy rewrite / nowy read API | **NIE** — OUT |
| Potrzeba cloud Persist | **NIE** — OUT |
| Potrzeba DecisionView hard delete | **NIE** — OUT |
| Potrzeba mirror **przed** Persist | **NIE** — Persist-first LOCKED |
| Potrzeba edycji Expert/Chief/Session/Validation BC | **NIE** — 8 LOCK |

**STOP:** nie wymagany.

---

## 1. Scope

### IN (LOCKED) — kroki S6-A…E

| Krok | Treść LOCKED |
|------|----------------|
| **S6-A** | `decision-persist-legacy-bridge.ts` — pure map API (§3) |
| **S6-B** | `DecisionWorkspaceHost` — Persist-first · prop `scoringBundle` · `setOwnerDecision` po sukcesie (§4–§6) |
| **S6-C** | `TenderDetailPanel` + `TenderWorkflowHubPanel` — prop-drill `scoringBundle` (§5) |
| **S6-D** | Harness S6 + update assertów S2/S5 (§15–§16) |
| **S6-E** | Docs IMPLEMENT/PV/CLOSEOUT (po GO IMPLEMENT) |

### OUT (LOCKED)

| OUT | |
|-----|--|
| Expert BC · Chief · Session · Validation · Adapters (new) · TF | |
| OfferBoq / Bid domain | |
| New scoring engine / duplicate `scoreTender` in Host/bridge | |
| New `TenderScoringBundle` factory | |
| Strategy Content / snapshot rewrite | |
| DecisionView hard delete | |
| S4 Hub hierarchy / S5 CTA·home·overview scope change | |
| S7 TRE · S8 REMOVE | |
| Cloud Persist · Audit Hub adapter | |
| Third store key · Persist schema bump · update/delete Persist | |
| Reverse fill legacy→Persist | |
| `useTenderOfferRun.ts` | |
| Third PLN | |
| UI version bump (jak S2–S5 — **NIE**) | |
| Approve→GO jako drugi zestaw przycisków Expert ON | |

---

## 2. Scoring REUSE (LOCKED)

```text
SSOT chain (DO NOT reimplement):
  scoreTender(item, profile, strategicContext)
    → TenderScoringBundle
  scoreTenderForOwnerView(item, strategicContext)
    → scoreTender(...)
  buildTenderIntelligenceContext(...)
    → scoringBundle = scoreTenderForOwnerView(...)
  parents:
    TenderDetailPanel.intelligenceCtx.scoringBundle
    TenderWorkflowHubPanel.intelligenceCtx.scoringBundle
```

| Legacy upsert field | Source LOCKED |
|---------------------|---------------|
| `id` | `scoringBundle.item.id` (must === Host `tenderId`) |
| `decision` | map(action) |
| `systemDecision` | `scoringBundle.decision` |
| `opportunityScore` | `scoringBundle.opportunity.score` |
| `strategicScore` | `scoringBundle.strategic.score` |

**FORBIDDEN:** invent scores · invent systemDecision from dossier/Validation/Offer · call `scoreTender` inside Host/bridge.

---

## 3. Exact bridge API (LOCKED — §1)

**File:** `src/lib/decision-persist-legacy-bridge.ts` (**NEW** · exactly one module)

**Export LOCKED (map-only — Host orchestrates writes):**

```ts
import type { DecisionPersistAction } from "@/lib/decision-persist";
import type { TenderDecision } from "@/lib/tenders-strategy-decision";

/**
 * TM-01 S6 — Persist action → legacy owner decision.
 * Pure · ZERO I/O · ZERO scoring · ZERO Persist.
 */
export function mapPersistActionToLegacyOwnerDecision(
  action: DecisionPersistAction | string,
): TenderDecision | null;
```

| Input | Output |
|-------|--------|
| `"approve"` | `"GO"` |
| `"reject"` | `"NO-GO"` |
| `"needs_review"` | `"HOLD"` |
| other | `null` |

**Location of mapping:** **tylko** ten plik. Host **nie** hardcoduje tabeli GO/NO-GO/HOLD.

**FORBIDDEN in bridge module:** `recordDecision` · `localStorage` · `setOwnerDecision` · `scoreTender` · React.

---

## 4. Host orchestration (LOCKED — Persist-first + mirror)

**File:** `src/app/decision-workspace/DecisionWorkspaceHost.tsx`

### 4.1 Props LOCKED

```ts
DecisionWorkspaceHost({
  session: ChiefSessionOutput;
  tenderId?: string;                         // KEEP (S5)
  scoringBundle?: TenderScoringBundle | null; // NEW — default null
})
```

### 4.2 Ordering LOCKED (`onAction` for approve|reject|needs_review)

```text
1. Build snapshot / actor / next local (KEEP existing)
2. recorded = recordDecision(...) when tenderId+caseId+finishedAt+snapshot
3. IF !recorded:
     setLocalDecision(session-only) · toast Persist fail/session · STOP
     // ZERO setOwnerDecision · ZERO map required for mirror
4. setLocalDecision from recorded (KEEP)
5. IF !scoringBundle:
     toast Persist OK + lejek SKIP · STOP
     // Persist SUCCESS preserved
6. IF scoringBundle.item.id !== tenderId:
     toast Persist OK + lejek SKIP (id mismatch) · STOP
7. mapped = mapPersistActionToLegacyOwnerDecision(action)
8. IF mapped == null:
     toast Persist OK + lejek SKIP · STOP
9. TRY:
     ownerDecisions.setOwnerDecision(scoringBundle, mapped)
     toast Persist + lejek OK
   CATCH / isolation:
     toast Persist OK + lejek FAIL (bridge error isolation)
     // Persist row KEEP · do not roll back Persist
```

`return` action: **unchanged** — clear local · scroll dossier · **no** Persist · **no** mirror.

### 4.3 setOwnerDecision source LOCKED

```text
useTendersContext().ownerDecisions.setOwnerDecision
```

**Semantics REUSE (LOCKED):** identical to DecisionView / PrimaryAction Expert OFF path — `upsertOwnerDecision` + `saveOwnerDecisions` (LS) + React state update.  
**Quota:** keep existing `saveOwnerDecisions` silent catch — **no** allowlist change to owner-decisions.ts in S6 unless Owner amends DF. Detectable fail = try/catch around `setOwnerDecision` if it throws; silent LS quota = accept + document (OV).

### 4.4 Bridge error isolation (LOCKED — §10)

| Failure | Persist | Legacy |
|---------|---------|--------|
| Persist fail | no new row / session-only | **ZERO** call |
| Bundle missing / id mismatch / unmapped | row kept | **SKIP** |
| `setOwnerDecision` throws | row kept | fail toast · no throw to crash surface |

---

## 5. Prop-drill (LOCKED — §4)

| Parent | Prop | Source |
|--------|------|--------|
| `TenderDetailPanel.tsx` | `scoringBundle={intelligenceCtx?.scoringBundle ?? null}` | existing `intelligenceCtx` useMemo |
| `TenderWorkflowHubPanel.tsx` | `scoringBundle={intelligenceCtx.scoringBundle}` | existing `intelligenceCtx` prop (null-safe if typed optional) |

**NOT in allowlist / NOT required:** `TenderDetailPage.tsx` (Host nie montowany bezpośrednio).  
**FORBIDDEN:** rebuild context inside Host · pass full `intelligenceCtx` unless DF amend (prefer **scoringBundle only**).

---

## 6. Idempotency / repeated submit (LOCKED — §7–§8)

| Concern | Rule LOCKED |
|---------|-------------|
| Persist | Append-only · każde udane kliknięcie = nowy `decisionId` |
| Hydrate | Latest by `(tenderId, caseId, dossierFinishedAt)` KEEP |
| Legacy | Upsert by `tenderId` · last mapped decision wins |
| Duplicate same action | Allowed · second Persist row + upsert same GO (OK) |
| Idempotency key | **NONE new** — REUSE Persist append + legacy upsert |
| Dual human UI Expert ON | FORBIDDEN (S2/S5 KEEP) — bridge = projection only |

---

## 7. Expert ON / OFF / Strategy (LOCKED — §11–§14)

| Mode | DW Host | Bridge | Legacy human writers |
|------|---------|--------|----------------------|
| **Expert ON** | visible (S2 stack) | after Persist OK | HIDE/DEMOTE KEEP |
| **Expert OFF** | Host hidden / no onAction | N/A | DecisionView / Primary / Strategy KEEP |

**Strategy visibility:** readers of `kw-tender-decisions` (Action Center, portfolio, queues) see mirrored decision **without** Strategy rewrite — via REUSE `setOwnerDecision` React+LS update.

**S4 Hub DW · S5 Decyzja overview / CTA / `?ws=`:** **NO TOUCH** beyond prop-drill.

---

## 8. Stores / schema (LOCKED)

| Key | Role S6 |
|-----|---------|
| `kw-decision-persist-v1` | **primary write** KEEP append-only · API names KEEP |
| `kw-tender-decisions` | **compatibility projection** via existing upsert |
| Third key | **FORBIDDEN** |

Persist public API (`recordDecision` / `hydrateDecision` / `listDecisionHistory`) — **call only** · no signature change.

---

## 9. Acceptance Criteria AC-S6 (LOCKED — §17)

| AC | Exact assertion |
|----|-----------------|
| **AC-S6-1** | Host `onAction` invokes `recordDecision` **before** any `setOwnerDecision` / map mirror |
| **AC-S6-2** | After Persist success + valid bundle: `mapPersistActionToLegacyOwnerDecision` then `setOwnerDecision(scoringBundle, mapped)` with map §3 |
| **AC-S6-3** | No new LS key; Persist key remains `kw-decision-persist-v1`; legacy key remains `kw-tender-decisions`; bridge module has zero `localStorage` |
| **AC-S6-4** | Harness: map approve→GO · reject→NO-GO · needs_review→HOLD; Host sources include `setOwnerDecision` **and** `recordDecision`; parents pass `scoringBundle` |
| **AC-S6-5** | S4 Hub markers KEEP · S5 overview/CTA markers KEEP · DecisionView file KEEP · Expert OFF PrimaryAction still can `setOwnerDecision` · no DecisionView delete |
| **AC-S6-6** | Persist fail path: Host source shows early return / no `setOwnerDecision` on that branch |
| **AC-S6-7** | Missing `scoringBundle`: Persist path still present · mirror gated on bundle |
| **AC-S6-8** | Bridge file exports `mapPersistActionToLegacyOwnerDecision` · no `scoreTender` / `recordDecision` in bridge file |

Epic AC-S6-1…5 = covered; AC-S6-6…8 = slice freeze extensions (PLAN).

---

## 10. Regression gates (LOCKED — §18)

| Suite | Gate |
|-------|------|
| S6 harness | AC-S6-1…8 PASS |
| **S2** | **45 PASS** (after assert update §15) |
| **S4** | **37 PASS** (unchanged intent) |
| **S5** | **27 PASS** (after assert update §16; count may stay 27 if replace A7 cases 1:1) |
| `npm run build` | PASS |

UI changelog bump: **FORBIDDEN** (docs/feature only).

---

## 11. S2 assertion changes (LOCKED — §15)

**File:** `scripts/test-tender-modernization-01-s2-dual-outcome.mjs`

| Pre-S6 assert | Post-S6 LOCKED replacement |
|---------------|----------------------------|
| `Host does not call setOwnerDecision` | **REPLACE:** Host **may** call `setOwnerDecision` **only** with Persist-first evidence (`recordDecision` before mirror / gated branch) |
| `AC-S2-5 no Persist→legacy bridge in Host/Primary` | **REPLACE:** Persist **API/store** still **no** `kw-tender-decisions` / no Approve→GO map; Host **may** import `decision-persist-legacy-bridge` + `setOwnerDecision`; PrimaryAction Expert ON still **suppresses** direct owner commit |
| Persist API no `setOwnerDecision` | **KEEP** |
| Persist no Approve→GO map in API | **KEEP** |
| owner store key `kw-tender-decisions` | **KEEP** |
| Dual human write / DecisionView HIDE Expert ON | **KEEP** |

Total S2 cases: maintain **45 PASS** (replace wording, do not drop Dual Outcome coverage).

---

## 12. S5 assertion changes (LOCKED — §16)

**File:** `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs`

| Pre-S6 assert | Post-S6 LOCKED replacement |
|---------------|----------------------------|
| A7 `no bridge module string in allowlist sources` (Panel/Detail deny `decision-persist-legacy-bridge`) | **REPLACE:** Panel/Detail/Host **may** reference bridge; **assert Host imports map** · Persist API still no legacy key · no new store key |
| A7 Host hydrate/record | **KEEP** |
| A7 owner store key KEEP | **KEEP** |
| A5 PrimaryAction suppress Expert ON / allow Expert OFF | **KEEP** |
| A8 Hub Host KEEP | **KEEP** |

---

## 13. Owner Verification OV-S6 (LOCKED — §19)

| ID | Scenario | Expect |
|----|----------|--------|
| **OV-S6-1** | Expert ON · Decyzja overview · Approve | Persist row + legacy GO · Strategy/lejek reflects |
| **OV-S6-2** | Expert ON · Reject | Persist + legacy NO-GO |
| **OV-S6-3** | Expert ON · Needs review | Persist + legacy HOLD |
| **OV-S6-4** | Persist cannot save (invalid/missing snapshot) | no legacy change |
| **OV-S6-5** | `intelligenceCtx` null / no scoringBundle | Persist OK if possible · mirror skip toast |
| **OV-S6-6** | Expert OFF | Host hidden · legacy buttons still write |
| **OV-S6-7** | Hub DW Approve | same Persist+mirror parity as Decyzja |
| **OV-S6-8** | DecisionView Expert ON | no new GO buttons · RO may show updated legacy after DW |
| **OV-S6-9** | S2=45 · S4=37 · S5=27 · build PASS | harness |
| **OV-S6-10** | DevTools LS | only known keys · no third decision store |

---

## 14. Allowlist (LOCKED — STRICT)

| Path | Allowed change |
|------|----------------|
| `src/lib/decision-persist-legacy-bridge.ts` | **NEW** — map only |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | Persist-first · prop · context setOwnerDecision · toasts |
| `src/app/TenderDetailPanel.tsx` | prop-drill `scoringBundle` only |
| `src/app/TenderWorkflowHubPanel.tsx` | prop-drill `scoringBundle` only |
| `scripts/test-tender-modernization-01-s6-*.mjs` | **NEW** harness |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | assert updates §15 |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | assert updates §16 |
| `docs/architecture/TENDER-MODERNIZATION-01-S6-*` | IMPLEMENT / PV / CLOSEOUT (+ this DF) |

**Explicitly NOT allowlist:** `tenders-strategy-owner-decisions.ts` · Strategy Content · DecisionView · PrimaryAction · DetailPage · Persist API/types/store · Expert/Chief/Session/Validation · `useTenderOfferRun.ts`.

---

## 15. Rollback (LOCKED — §20)

```text
git revert <S6 tip commit(s)>
```

| | |
|--|--|
| Code | bridge gone · Host Persist-only · parents drop prop |
| Data | Persist history KEEP · legacy rows optional leave |
| Harness | revert restores pre-S6 S2/S5 asserts |
| **FORBIDDEN** | force-push · data migration down · schema bump |

---

## 16. Implementation order (for Owner GO IMPLEMENT — not to start now)

1. S6-A bridge map + unit cases in harness  
2. S6-B Host Persist-first + prop + setOwnerDecision  
3. S6-C DetailPanel + HubPanel prop-drill  
4. S6-D S6 harness + S2/S5 assert updates  
5. build · S2/S4/S5/S6 PASS · OV checklist  
6. commit allowlist ONLY · push · PV · CLOSEOUT  

---

## 17. READY FOR IMPLEMENT checklist

```text
[x] AUDIT COMPLETE
[x] PLAN COMPLETE
[x] DESIGN FREEZE COMPLETE (TEN DOKUMENT)
[x] Owner GO IMPLEMENT S6
[x] Allowlist ONLY code (local · **NIE COMMIT**)
[x] S6 + S2 + S4 + S5 + build PASS
[ ] OV-S6 Owner
[ ] OWNER GO COMMIT
[ ] PV → CLOSEOUT
[ ] NO useTenderOfferRun · NO S7 · NO Strategy rewrite
```

---

## STOP

```text
DESIGN FREEZE COMPLETE
READY FOR IMPLEMENT — wait OWNER GO → S6 IMPLEMENT
NO code · NO stage · NO commit · NO push · NO deploy
```
