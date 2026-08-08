# TENDER-MODERNIZATION-01 / S6 — PLAN (Decision Persist → legacy bridge)

> **STATUS:** **PLAN COMPLETE** · **DF** → [`TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** TENDER-MODERNIZATION-01-S6-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S6 — Decision Persist / store bridge**  
> **TRYB:** **PLAN ONLY** (zamknięty przez S6 DF) · ZERO kodu w tym dokumencie  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** · feature **`ebae3d2e`** · docs tip **`677afd98`** · `origin/main` **`677afd98`**  
> **Owner GO PLAN:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S6-AUDIT.md`](TENDER-MODERNIZATION-01-S6-AUDIT.md) (**COMPLETE**)  
> **SSOT IMPLEMENT:** [`TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §4.3 · §6 · §11 S6 · AC-S6-1…5  
> **Decision SSOT:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts`  
> **Next:** Owner GO **IMPLEMENT S6** (osobny turn) · **nie** auto-start

```text
════════════════════════════════════════════════════════
S6 PLAN — Persist FIRST → thin legacy projection

CURRENT:
  DW Host → recordDecision → kw-decision-persist-v1
  Strategy/legacy writers → kw-tender-decisions (independent)
  Bridge = NOT IMPLEMENTED

TARGET:
  Persist SUCCESS first
  → map approve→GO / reject→NO-GO / needs_review→HOLD
  → REUSE setOwnerDecision(scoringBundle, mapped)
  → kw-tender-decisions (Strategy visibility)
  Persist FAIL → NO legacy mirror

SCORING GAP RESOLUTION (REUSE — no new engine):
  Existing SSOT = scoreTender / scoreTenderForOwnerView
  Provider = buildTenderIntelligenceContext → scoringBundle
  Parents already have intelligenceCtx next to Host mounts
  → prop-drill scoringBundle (or thin pick) into Host
  → Host REUSE useTendersContext().ownerDecisions.setOwnerDecision
  systemDecision = scoringBundle.decision (Strategy scoring)
  scores = opportunity.score + strategic.score
  dossier/Chief session = NO systemDecision (do not invent)

STATUS: PLAN COMPLETE · DF COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Epic DF alignment (pre-check)

| Epic DF | PLAN | Konflikt? |
|---------|------|-----------|
| §4.3 map approve→GO / reject→NO-GO / needs_review→HOLD | §5 | **NIE** |
| §6 Persist primary · legacy projection · Strategy read legacy | §1–§4 · §10 | **NIE** |
| §11 S6 allowlist: thin bridge + Host wire · no new store | §12 | **NIE** (+ justified parent prop-drill) |
| AC-S6-1…5 | §11 | **NIE** |
| OUT: third store · cloud · Strategy rewrite · REMOVE legacy | §13 | **NIE** |
| S4/S5 KEEP · 8 LOCK | §14 | **NIE** |

**Slice DF:** [`TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md) (**COMPLETE**).

---

## 1. CURRENT → TARGET

### A. Current Persist path (KEEP)

```text
ChiefSessionOutput
  → DecisionWorkspaceHost (Hub + Decyzja overview)
      → recordDecision(...)
      → kw-decision-persist-v1 (append-only)
      → hydrateDecision on mount
```

### B. Current legacy path (KEEP writers Expert OFF)

```text
DecisionView / PrimaryAction / Strategy BestOpportunity
  → setOwnerDecision(TenderScoringBundle, GO|HOLD|NO-GO)
  → upsertOwnerDecision + saveOwnerDecisions
  → kw-tender-decisions
```

### C. Target bridge path (NEW · Expert ON DW actions only)

```text
Host.onAction (approve|reject|needs_review)
  1) recorded = recordDecision(...)     // Persist FIRST
  2) if !recorded → toast session-only · STOP (NO mirror)
  3) if !scoringBundle → toast Persist OK · lejek skip · STOP
  4) ownerDecision = mapPersistActionToLegacy(action)
  5) setOwnerDecision(scoringBundle, ownerDecision)  // REUSE hook write
  6) toast Persist + lejek OK (or partial if step 5 fails — DF detail)
```

`return` action = UI only · **no** Persist · **no** bridge (KEEP).

---

## 2. Scoring SSOT map (CRITICAL — resolved without new engine)

### 2.1 Existing scoring SSOT

| Layer | Symbol | Role |
|-------|--------|------|
| **Core** | `scoreTender(item, profile, strategicContext)` | builds `TenderScoringBundle` |
| **Owner wrapper** | `scoreTenderForOwnerView(item, strategicContext)` | REUSE `scoreTender` |
| **Bundle fields** | `decision`, `opportunity.score`, `strategic.score` | exactly what `upsertOwnerDecision` needs |
| **Context builder** | `buildTenderIntelligenceContext` | sets `scoringBundle = scoreTenderForOwnerView(...)` |
| **Provider input** | `scoringContext` from Tenders Provider snapshot | SSOT profile/jobs/growthMode |
| **UI SSOT** | `TenderIntelligenceContext.scoringBundle` | consumed by DecisionView / PrimaryAction today |

**Zakaz PLAN/IMPLEMENT:** nowe `compute*` scoringu · duplikat formuł · zmiana `computeTenderDecision` semantics · trzeci silnik.

### 2.2 Does session/dossier already have systemDecision?

| Source | Has GO/HOLD/NO-GO systemDecision? |
|--------|-----------------------------------|
| Chief `session.dossier` / Validation verdict | **NO** (QA verdict ≠ Strategy GO) |
| Offer Expert / DW Recommendation PLN | **NO** (pricing · not portfolio enum) |
| `intelligenceCtx.scoringBundle.decision` | **YES** = systemDecision for legacy upsert |
| `intelligenceCtx.strategicDecision` | same as `scoringBundle.decision` (readiness helper) |

**Wniosek:** systemDecision **nie** żyje w Persist/Chief — żyje w **Intelligence/Strategy scoring** już zbudowanym obok Host.

### 2.3 Host mount sites vs scoring availability

| Mount | File | Scoring already in parent? |
|-------|------|----------------------------|
| Hub DW | `TenderWorkflowHubPanel.tsx` | **YES** — `intelligenceCtx` prop · Host sibling |
| Decyzja overview | `TenderDetailPanel.tsx` | **YES** — `intelligenceCtx` useMemo · Host sibling |

Dziś Host dostaje tylko `session` + `tenderId` — **celowo nie** scoring. Gap = **wiring**, nie brak SSOT.

### 2.4 Minimal supply strategy (LOCKED for PLAN)

**Opcja wybrana: P1 — Prop-drill istniejącego `scoringBundle` + REUSE `setOwnerDecision`.**

| | |
|--|--|
| **IN** | Optional prop `scoringBundle: TenderScoringBundle \| null` (lub thin pick `{ decision, opportunityScore, strategicScore, itemId }` zbudowany **wyłącznie** z istniejącego bundle) |
| **Write** | `useTendersContext().ownerDecisions.setOwnerDecision(bundle, mapped)` — **ten sam** tor co DecisionView/PrimaryAction (LS + React state) |
| **OUT** | Ponowne `scoreTender(...)` wewnątrz Host/bridge · nowy adapter scoringu · Strategy rewrite |

**Dlaczego nie tylko LS upsert w bridge?**  
Hook `useOwnerTenderDecisions` trzyma React state. Sam zapis LS bez `setOwnerDecision` = Strategy UI **stale** do reloadu. REUSE hook = ZERO DUPLICATE + live visibility.

**Gdy `scoringBundle` / `intelligenceCtx` null** (brak `scoringContext`): Persist nadal primary · mirror **SKIP** (fail-soft lejek) · toast jasny · **nie** zmyślać scores.

---

## 3. Exact bridge API (proposed for DF freeze)

Plik: `src/lib/decision-persist-legacy-bridge.ts` (nazwa DF epic OK).

### C1. Pure map (required)

```text
mapPersistActionToLegacyOwnerDecision(action):
  approve      → "GO"
  reject       → "NO-GO"
  needs_review → "HOLD"
  other        → null
```

### C2. Optional thin helper (DF choose one)

```text
// Prefer — Host does Persist + setOwnerDecision; bridge = map only
export function mapPersistActionToLegacyOwnerDecision(
  action: DecisionPersistAction
): TenderDecision | null
```

**lub** (jeśli DF chce 1 call site):

```text
projectPersistActionToLegacyOwnerWrite(input: {
  action: DecisionPersistAction
  scoringBundle: TenderScoringBundle
  setOwnerDecision: (bundle, decision) => void
}): { ok: true } | { ok: false; reason: "unmapped_action" | ... }
```

**PLAN preference:** **map-only module** + Host orchestration (Persist-first explicit in Host) — czytelniejsze AC Persist FAIL ⇒ no mirror.

Bridge **nie** woła `recordDecision`. Bridge **nie** zmienia Persist schema.

---

## 4. Exact mapping (D)

| Persist action | Legacy `TenderDecision` |
|----------------|-------------------------|
| `approve` | `GO` |
| `reject` | `NO-GO` |
| `needs_review` | `HOLD` |
| `return` | **no write** |

Zgodne z epic DF §4.3 · DECISION-ARCHITECTURE §6.

---

## 5. Sources (E / F)

| Field for `upsertOwnerDecision` | Source | Notes |
|---------------------------------|--------|-------|
| `id` | `scoringBundle.item.id` (= `tenderId`) | must match Host `tenderId` |
| `decision` | map(action) | owner human projection |
| `systemDecision` | `scoringBundle.decision` | Strategy scoring SSOT |
| `opportunityScore` | `scoringBundle.opportunity.score` | REUSE |
| `strategicScore` | `scoringBundle.strategic.score` | REUSE |

**Assert (harness):** `scoringBundle.item.id === tenderId` before mirror; mismatch ⇒ skip mirror + toast (no wrong tender pollute).

---

## 6. Idempotency / duplicates (G / H)

| Store | Semantics |
|-------|-----------|
| Persist | Append-only · każde kliknięcie = nowy `decisionId` (history) · hydrate = latest |
| Legacy | Upsert by tenderId · last mapped decision wins |

**Duplicate prevention:**  
- **Nie** blokować ponownego `approve` (historia Persist OK).  
- Legacy upsert naturalnie nadpisuje tę samą wartość.  
- **Nie** wymagać dedupe Persist w S6.

**Dual human write Expert ON:** nadal zakazane w UI (S2/S5) — bridge = **machine projection** z DW, nie drugi zestaw przycisków.

---

## 7. Persist-first / quota / retry (I / J / K)

| Case | Behavior |
|------|----------|
| Persist `null` / invalid | **NO** `setOwnerDecision` · toast session-only (KEEP) |
| Persist OK · bundle null | Persist kept · **NO** mirror · toast „zapis lokalny DW; lejek niedostępny” |
| Persist OK · setOwnerDecision | mirror · toast success (Persist + lejek) |
| Legacy save silent fail (dziś `saveOwnerDecisions` swallow) | **DF decision:** (a) akceptuj risk + document **lub** (b) allowlist 1-liner `saveOwnerDecisions(): boolean` mirror Persist pattern — **prefer (b)** jeśli OV wymaga detectable fail |
| Retry | **NONE** (no queue) · user re-clicks action → new Persist row + upsert |

---

## 8. Expert ON / OFF / Strategy (L / M / N)

| Mode | DW Host visible? | Bridge runs? | Legacy human buttons |
|------|------------------|--------------|----------------------|
| **Expert ON** | YES (S2 stack) | YES after Persist | HIDE/DEMOTE KEEP |
| **Expert OFF** | Host hidden | NO | writers KEEP |

**Strategy visibility:** po mirror, Action Center / portfolio / „bez decyzji właściciela” widzą `kw-tender-decisions` via existing readers — **bez** Strategy rewrite.

---

## 9. AC-S6 (O) + regression (P/Q/R)

| AC | Treść | Verify |
|----|--------|--------|
| **AC-S6-1** | Persist = primary write @ Expert ON | Host calls `recordDecision` before any legacy write |
| **AC-S6-2** | Bridge → legacy projection after Persist OK | map + `setOwnerDecision` |
| **AC-S6-3** | ZERO third store · ZERO cloud | harness: only `kw-decision-persist-v1` + `kw-tender-decisions` |
| **AC-S6-4** | Strategy Action Center OK | harness/OV: after approve, legacy `byId[tenderId].decision === GO` |
| **AC-S6-5** | Compatibility: Expert OFF writers KEEP · no DecisionView delete · S4/S5 markers KEEP | S2/S4/S5 harness |
| **AC-S6-6** *(PLAN)* | Persist FAIL ⇒ zero legacy call | Host branch order |
| **AC-S6-7** *(PLAN)* | Missing scoringBundle ⇒ Persist OK · no mirror | toast path |
| **AC-S6-8** *(PLAN)* | Map unit: approve/reject/needs_review | bridge harness |

| Regression | Gate |
|------------|------|
| **S2** | **45 PASS** (`test-tender-modernization-01-s2-dual-outcome.mjs`) — note: S2 asserts Host **no** `setOwnerDecision` today → **DF must update S2/S5 assertions** to allow Host bridge **after** Persist (or scope assert to Persist API still clean) |
| **S4** | **37 PASS** |
| **S5** | **27 PASS** — A7 „no bridge string” becomes **expect bridge present** in S6 tip; update S5 harness only if still required historically **or** S6 supersedes A7 check |

**PLAN note for DF:** S2 harness lines „Host does not call setOwnerDecision” / „no Persist→legacy bridge” are **pre-S6 locks**. S6 IMPLEMENT **must** revise those asserts to: Persist API still no legacy; Host may call `setOwnerDecision` **only after** `recordDecision` success.

Build PASS required.

---

## 10. Allowlist (S) — minimal

| Path | Change |
|------|--------|
| `src/lib/decision-persist-legacy-bridge.ts` | **NEW** — map (+ optional thin project helper) |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | Persist-first · optional scoringBundle prop · `useTendersContext` → `setOwnerDecision` |
| `src/app/TenderDetailPanel.tsx` | pass `scoringBundle={intelligenceCtx?.scoringBundle ?? null}` |
| `src/app/TenderWorkflowHubPanel.tsx` | pass `scoringBundle={intelligenceCtx.scoringBundle}` (or null-safe) |
| `scripts/test-tender-modernization-01-s6-*.mjs` | **NEW** AC-S6 |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | **UPDATE** Host/bridge asserts for post-S6 |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | **UPDATE** A7 bridge-absence → post-S6 compatible |
| `docs/architecture/TENDER-MODERNIZATION-01-S6-*` | DF / IMPLEMENT / PV / CLOSEOUT |

**Optional (DF):**

| Path | If |
|------|-----|
| `src/lib/tenders-strategy-owner-decisions.ts` | only if `saveOwnerDecisions(): boolean` for fail detection |

**NIE allowlist:** Strategy Content rewrite · DecisionView delete · Persist schema · Chief/Expert/Validation BC · `useTenderOfferRun.ts`.

---

## 11. Rollback (T)

| | |
|--|--|
| Code | revert S6 tip · remove bridge · Host back to Persist-only |
| Data | Persist history KEEP · legacy mirrors optional leave |
| Behavior | pre-S6 independent stores · Strategy ignores new DW decisions again |
| Harness | restore S2/S5 pre-bridge asserts with revert |

---

## 12. Owner Verification matrix (U)

| ID | Scenario | Expect |
|----|----------|--------|
| **OV-S6-1** | Expert ON · Decyzja overview · Approve | Persist row + legacy GO · Strategy/lejek reflects GO |
| **OV-S6-2** | Expert ON · Reject | Persist + legacy NO-GO |
| **OV-S6-3** | Expert ON · Needs review | Persist + legacy HOLD |
| **OV-S6-4** | Persist blocked (invalid/missing snapshot) | no legacy change · toast session |
| **OV-S6-5** | scoringContext missing / intelligenceCtx null | Persist OK if possible · no legacy · toast skip lejek |
| **OV-S6-6** | Expert OFF | DW Host hidden · legacy buttons still write GO/HOLD/NO-GO |
| **OV-S6-7** | Hub DW Approve (S4 surface) | same Persist+mirror as Decyzja (parity Host) |
| **OV-S6-8** | DecisionView Expert ON | still no new GO buttons · RO last legacy may update after DW approve |
| **OV-S6-9** | S2/S4/S5 harness | PASS after assert updates |
| **OV-S6-10** | No third LS key | DevTools: only known keys |

---

## 13. OUT (LOCKED)

S7 · S8 · DecisionView hard delete · Strategy BC rewrite · Cloud Persist · third store · new scoring engine · duplicate `scoreTender` in Host · Bid/OfferBoq/Expert/Chief/Session/Validation/Adapters/TF domain edits · S4 Hub hierarchy change · S5 CTA/home change · `useTenderOfferRun.ts` · third PLN · reverse fill legacy→Persist (default OUT) · Approve→GO UI buttons Expert ON.

---

## 14. LOCK reminder

Expert BC · Chief · Session · Validation · Adapters (no new scoring adapter) · Technology/TF · OfferBoq · Bid domain · S4 Hub DW · S5 Decyzja DW mount/CTA.

**Adapters:** reuse **existing** Intelligence context / `scoreTenderForOwnerView` output only — do not invent new adapter BC.

---

## 15. Implementation slices (for DF — not to start)

| Step | Content |
|------|---------|
| **S6-A** | `decision-persist-legacy-bridge.ts` map + unit cases |
| **S6-B** | Host Persist-first + scoringBundle prop + setOwnerDecision |
| **S6-C** | DetailPanel + HubPanel prop-drill |
| **S6-D** | Harness S6 + update S2/S5 bridge asserts |
| **S6-E** | Docs DF/IMPLEMENT · OV checklist |

---

## 16. Recommendation

| | |
|--|--|
| **Scoring gap** | **SOLVED by REUSE** — `intelligenceCtx.scoringBundle` already at both Host parents |
| **Write path** | **REUSE** `setOwnerDecision` (not raw LS-only) for Strategy live state |
| **Bridge** | thin map module · Host orchestrates Persist-first |
| **Schema** | **NO** change |
| **Ready for** | Owner GO → **S6 DESIGN FREEZE** |
| **Not ready for** | IMPLEMENT without DF |

---

## STOP

```text
PLAN COMPLETE · DF COMPLETE
NO IMPLEMENT without OWNER GO → S6 IMPLEMENT
NO code · NO commit · NO push · NO S7
```
