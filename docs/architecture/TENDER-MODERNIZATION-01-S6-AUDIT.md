# TENDER-MODERNIZATION-01 / S6 — AUDIT (Decision Persist → legacy bridge)

> **STATUS:** **AUDIT COMPLETE** · **WAITING FOR OWNER GO → S6 PLAN**  
> **ID:** TENDER-MODERNIZATION-01-S6-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S6 — Decision Persist / store bridge**  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** · feature **`ebae3d2e`** · docs tip **`677afd98`** · `origin/main` **`677afd98`**  
> **Prior CLOSED:** S0–S5 · S5 PV PASS  
> **Mode:** **AUDIT ONLY** — zero code change · zero commit · zero push  
> **DF SSOT:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §4.3 · §6 · §11 S6 · AC-S6  
> **Decision SSOT:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md)

```text
════════════════════════════════════════════════════════
S6 AUDIT — COMPLETE · STOP BEFORE PLAN

Bridge Persist → kw-tender-decisions = NOT IMPLEMENTED (confirmed in code)
Mapping approve→GO / reject→NO-GO / needs_review→HOLD = DOCS ONLY (DF §4.3)
Persist path LIVE: DW Host → recordDecision → kw-decision-persist-v1
Legacy path LIVE (Expert OFF writers): setOwnerDecision → kw-tender-decisions
Strategy / portfolio / Action Center = READ legacy only
Expert ON: DW write Persist · legacy human write HIDE/DEMOTE (S2/S5)
GAP: Persist decisions invisible to Strategy until bridge
GAP: Host has no TenderScoringBundle (needed by upsertOwnerDecision)

NEXT = OWNER GO → S6 PLAN (not auto)
════════════════════════════════════════════════════════
```

---

## 1. AS-IS (executive)

Dwa **niezależne** localStorage stores decyzji właściciela:

| Store | Key | Semantyka | Write tip |
|-------|-----|-----------|-----------|
| **Decision Persist** | `kw-decision-persist-v1` | append-only · `approve`/`reject`/`needs_review` | **DecisionWorkspaceHost** only |
| **Legacy owner** | `kw-tender-decisions` | upsert by tenderId · `GO`/`HOLD`/`NO-GO` | Strategy / DecisionView / PrimaryAction (głównie **Expert OFF**) |

**Bridge między nimi: nie istnieje w `src/`** (brak modułu, brak mapy w Persist API, Host nie woła `setOwnerDecision` / `upsertOwnerDecision`).

Skutek biznesowy tipu (Expert ON): człowiek zapisuje w Persist (DW), a **Strategia / lejek / Action Center nadal patrzy tylko na `kw-tender-decisions`** → decyzje DW **nie** aktualizują portfolio / „bez decyzji właściciela”.

---

## 2. Actual Decision Persist path

```text
Chief Session (dossier)
  → DecisionWorkspaceHost (Hub przetarg + Decyzja overview @ S5)
      → resolveValidationForDossier (cache)
      → buildDecisionWorkspaceViewModel
      → DecisionWorkspaceSurface / DecisionActionsBar
          actions: approve | reject | needs_review | return
      onAction (≠ return):
          buildValidationSnapshot(validation)
          recordDecision({ tenderId, caseId, action, scenario, actor,
                           dossierFinishedAt, validationSnapshot })
            → loadDecisionPersistStore (LS kw-decision-persist-v1)
            → appendRecordToStore
            → saveDecisionPersistStore
          hydrate on mount: hydrateDecision(tenderId, caseId, dossierFinishedAt)
            → latest matching record → DecydentLocalDecision
```

| Element | Lokalizacja |
|---------|-------------|
| Types / key | `src/lib/decision-persist/types.ts` · `DECISION_PERSIST_LS_KEY` |
| Store | `src/lib/decision-persist/store.ts` |
| API | `src/lib/decision-persist/api.ts` · `recordDecision` · `hydrateDecision` · `listDecisionHistory` · `buildValidationSnapshot` |
| Wire UI | **`src/app/decision-workspace/DecisionWorkspaceHost.tsx` only** |
| UI consumers `listDecisionHistory` | **NONE** (API + harness only) |

**Cloud / KV / Audit Hub:** brak (LOCKED residual OUT).

---

## 3. Actual bridge state

| Check | Result |
|-------|--------|
| Plik `decision-persist-legacy-bridge*` | **ABSENT** |
| Persist API mentions `kw-tender-decisions` | **NO** (S2 harness asserts) |
| Host calls `setOwnerDecision` / `upsertOwnerDecision` | **NO** |
| Runtime map `approve`→`GO` in `src/` | **NO** |
| DF / DECISION-ARCHITECTURE map §4.3 | **DOCUMENTED only** · „not live write yet” |

**Verdict:** bridge = **NOT IMPLEMENTED**. Nie wolno zakładać istnienia w PLAN/IMPLEMENT bez nowego kodu.

S5 harness A7 nadal wymaga braku stringu `decision-persist-legacy-bridge` w allowlist S5 — zgodne z tipem pre-S6.

---

## 4. Legacy `kw-tender-decisions`

| | |
|--|--|
| Lib | `src/lib/tenders-strategy-owner-decisions.ts` |
| Hook | `src/app/tenders/strategy/hooks/useOwnerTenderDecisions.ts` |
| Model | `OwnerTenderDecisionRecord` · `byId[tenderId]` · version **1** |
| Enum | `TenderDecision` = `GO` \| `HOLD` \| `NO-GO` (`tenders-strategy-decision.ts`) |
| Write API | `upsertOwnerDecision` (preserve `createdAt`, bump `updatedAt`) · `saveOwnerDecisions` (quota → silent ignore) |
| Required on write | `id`, `decision`, **`systemDecision`**, **`opportunityScore`**, **`strategicScore`** (ze `TenderScoringBundle`) |

### Writers (live)

| Writer | When Expert ON | When Expert OFF |
|--------|----------------|-----------------|
| `TenderDecisionView` Owner section | buttons **hidden** · RO last legacy | **`setOwnerDecision`** |
| `TenderWorkflowPrimaryAction` | scroll DW / `navigate("decyzja")` · **no** setOwner | **`setOwnerDecision`** if `ownerDecision` |
| `TendersStrategyContent` → BestOpportunity | `onSetDecision={undefined}` · demoted RO | **`handleSetDecision` → setOwnerDecision** |

### Readers (Strategy / UX — legacy only)

- `useTendersStrategySnapshot` · Action Center (`actionsFromOwnerDecisions`)
- Forecast / `collectGoCandidates` · alerts
- Portfolio counters · DecisionHistory · BestOpportunity RO
- `TendersView` / `computeMyQueueCounts` · list insight
- Hub/Command: `TenderDetailPanel` / `useTenderPrzetargCommandContext` (`loadOwnerDecisions().byId[id]`)
- Intelligence context / next-action (ownerRecord optional)

**Żaden reader Strategy nie czyta `kw-decision-persist-v1`.**

---

## 5. Mapping approve / reject / needs_review → GO / NO-GO / HOLD

| Persist action | Target legacy (DF §4.3) | Implemented in code? |
|----------------|-------------------------|----------------------|
| `approve` | `GO` | **NO** |
| `reject` | `NO-GO` | **NO** |
| `needs_review` | `HOLD` | **NO** |

`return` w DW = UI only (clear local / scroll dossier) · **nie** Persist · **nie** legacy.

Validation verdict (`validated`/`needs_review`/`blocked`) ≠ owner Persist action — snapshot only.

---

## 6. Idempotency / duplicate writes

### Persist

- **Append-only** — każde `recordDecision` = nowy `decisionId` (UUID).
- Brak dedupe po `(tenderId, caseId, action)`.
- `hydrateDecision` = **latest** by `createdAt` (+ index tie-break).
- Double-click / retry → **multiple history rows** (by design P0) · UI pokazuje latest.

### Legacy

- **Upsert** by `tenderId` — overwrite `decision` / scores · keep `createdAt`.
- Idempotent w sensie „jedna aktualna decyzja per tender”.

### Cross-store

- Brak transakcji · brak 2PC · dziś **zero** dual-write z DW.

---

## 7. Retry / failure behavior

| Path | Failure | Behavior |
|------|---------|----------|
| Persist `saveDecisionPersistStore` | quota / LS unavailable | `recordDecision` → `null` · Host toast „tylko w sesji” · `setLocalDecision` RAM |
| Persist invalid input / missing snapshot | | `null` · session-only toast |
| Legacy `saveOwnerDecisions` | quota | **silent** catch · React state may diverge from LS |
| Host missing `tenderId` / `caseId` / `finishedAt` / snapshot | | no Persist write · session-only |

**Brak retry loop** · brak queue · brak cloud replay.

---

## 8. Legacy compatibility (Expert ON vs OFF)

| Mode | Human PRIMARY write | Legacy store | Strategy sees DW decision? |
|------|---------------------|--------------|----------------------------|
| **Expert ON** | Persist via DW | writers demoted/suppressed | **NO** (gap) |
| **Expert OFF** | GO/HOLD/NO-GO UI | writers active | YES (legacy) |

DecisionView @ Expert ON: recovery / RO last legacy record · **bez** nowych GO zapisów (S2+S5).

Hub DW (S4) + Decyzja overview DW (S5): **KEEP** — S6 nie powinien demountować.

---

## 9. Consumers summary

### Persist write

1. `DecisionWorkspaceHost.onAction` → `recordDecision`

### Persist read

1. `DecisionWorkspaceHost` mount → `hydrateDecision`
2. Harness `test-decision-persist-01.mjs`
3. **No** Strategy / DecisionView / PrimaryAction

### Legacy write

1. `useOwnerTenderDecisions.setOwnerDecision`
2. Call sites: DecisionView (OFF), PrimaryAction (OFF), Strategy BestOpportunity (OFF)

### Legacy read

1. Strategy snapshot / Action Center / forecast / alerts / portfolio / list / Hub command context / DecisionView RO

---

## 10. Gaps (S6 problem statement)

| # | Gap | Severity |
|---|-----|----------|
| **G1** | Brak bridge Persist → legacy | **P0** (cel S6) |
| **G2** | Decyzje DW @ Expert ON niewidoczne w Strategy / kolejce / AC | **P0 product** |
| **G3** | Host **nie ma** `TenderScoringBundle` · `upsertOwnerDecision` wymaga `systemDecision` + scores | **P0 design** (PLAN musi rozstrzygnąć) |
| **G4** | Dual semantics (actions vs GO enum) bez live map | expected pre-S6 |
| **G5** | `listDecisionHistory` bez UI | residual OK |
| **G6** | Reverse fill legacy→Persist | DF optional · OUT default |
| **G7** | Silent legacy save fail vs Persist toast | consistency note for PLAN |
| **G8** | Append Persist vs upsert legacy — po bridge: strategy „current” = upsert; Persist = full history | OK if documented |

---

## 11. Schema / store / API change assessment (bez wykonywania)

| Pytanie | Audyt |
|---------|--------|
| Nowy LS key? | **NIE** (DF: ZERO third store) |
| Zmiana schematu `kw-decision-persist-v1`? | **NIE wymagana** dla thin bridge |
| Zmiana schematu `kw-tender-decisions`? | **NIE wymagana** jeśli REUSE `upsertOwnerDecision` |
| Zmiana public Persist API names? | **NIE** (REUSE `recordDecision` / hydrate) |
| Nowy thin module? | **TAK** (DF allowlist: np. `decision-persist-legacy-bridge.ts`) |
| Wire Host? | **TAK** — po udanym `recordDecision` wywołać bridge |
| Strategy rewrite / nowy read API? | **OUT** S6 |
| Cloud Persist? | **OUT** |

**Wniosek:** S6 = **thin projection write** + Host wire + harness — **bez** migracji schema; **z** koniecznością dostarczenia pól scoringu do bridge (prop drill / lookup) — decyzja PLAN.

---

## 12. Proposed allowlist (minimal — for PLAN)

| Path | Rola |
|------|------|
| `src/lib/decision-persist-legacy-bridge.ts` *(lub 1 równoważny plik)* | map action→GO + call `upsertOwnerDecision` / save |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | wire po udanym `recordDecision` |
| `scripts/test-tender-modernization-01-s6-*.mjs` | AC-S6 harness |
| `docs/architecture/TENDER-MODERNIZATION-01-S6-*` | PLAN/DF-slice/IMPLEMENT/PV/CLOSEOUT |

**Możliwy thin add (tylko jeśli PLAN udowodni konieczność):**

- prop `scoringBundle` / snapshot scores do Host (DetailPage/Panel) — **nie** Strategy rewrite

**REUSE (no edit unless proven):**

- `decision-persist/*` API surface (prefer call-only)
- `tenders-strategy-owner-decisions.ts` (`upsertOwnerDecision`)
- S2/S4/S5 Dual Outcome / Hub / Decyzja mount

---

## 13. Proposed OUT (LOCKED this slice)

| OUT | Powód |
|-----|--------|
| S7 TRE deprecation | osobny slice |
| S8 removal / DecisionView hard delete | L8 + GO |
| Strategy BC rewrite / new Persist read API | DF OUT |
| Third store / third PLN / third engine | 8 LOCK / L5 |
| Cloud Persist / Audit Hub adapter | residual |
| Persist schema bump / delete/update Persist | append-only LOCK |
| Reverse fill legacy→Persist (default) | optional DF · nie P0 |
| Expert / Chief / Session / Validation / Adapters / TF / OfferBoq / Bid domain | 8 LOCK |
| S4 Hub DW / S5 Decyzja DW behavior change | KEEP |
| `useTenderOfferRun.ts` | local WIP · never stage |
| Approve→GO w S2 UI (już zakazane) | mapping tylko store bridge |

---

## 14. AC-S6 (proposed — align DF; refine in PLAN)

| AC | Treść |
|----|--------|
| **AC-S6-1** | Persist pozostaje **primary write** przy Expert ON (Host → `recordDecision` first) |
| **AC-S6-2** | Po udanym Persist: bridge mirror → `kw-tender-decisions` per map §4.3 |
| **AC-S6-3** | ZERO trzeciego store key · ZERO cloud |
| **AC-S6-4** | Strategy Action Center / portfolio counts odzwierciedlają bridged decisions (read legacy OK) |
| **AC-S6-5** | Compatibility report: Expert OFF writers KEEP · Expert ON no dual human write UI · DecisionView hard delete OUT |
| **AC-S6-6** *(proposed)* | Persist fail ⇒ **no** legacy mirror (no orphan GO without Persist row) |
| **AC-S6-7** *(proposed)* | S2/S4/S5 harness regression PASS · S5 CTA/home KEEP |
| **AC-S6-8** *(proposed)* | Bridge unit: approve→GO · reject→NO-GO · needs_review→HOLD |

DF lists AC-S6-1…5; 6–8 = audit proposals for PLAN freeze.

---

## 15. Risks

| Risk | Impact | Mitigation (PLAN) |
|------|--------|-------------------|
| Host bez scoring → incomplete upsert | bridge blocked / fake scores | explicit scoring source; fail-loud if missing |
| Bridge before Persist success | legacy without history | order: Persist OK → then bridge |
| Bridge after Persist OK, legacy fail | Strategy stale vs DW | toast / return status; document partial fail |
| Double source of truth UX | confusion | Persist = history SSOT; legacy = Strategy projection only |
| Expert OFF + Expert ON mixed devices | LS-only | known; cloud OUT |
| Quota dual write | one store fails | prefer Persist-first; no silent pretend success |
| Accidental Strategy rewrite scope creep | epic blowup | allowlist Host+bridge only |
| Reverse fill pollution | bad Persist rows | OUT default |

---

## 16. Rollback

| | |
|--|--|
| **Code** | revert S6 tip commit(s) · bridge OFF |
| **Data** | Persist rows remain (append-only harmless) · legacy mirrors optional leave or manual clear OUT |
| **Behavior** | pre-S6: independent stores · Strategy ignores Persist again |
| **No** | force-push · schema migration down |

---

## 17. Recommendation

| | |
|--|--|
| **S6 needed?** | **YES** — bez bridge Expert ON decisions są „ślepe” dla Strategy |
| **Scope** | **thin** bridge + Host wire + harness · REUSE upsert · map DF §4.3 |
| **Hardest open for PLAN** | skąd wziąć `systemDecision` + scores w momencie DW action (Host dziś ich nie ma) |
| **Do NOT** | Strategy rewrite · cloud · third store · DecisionView delete · start S7 |
| **Next gate** | **OWNER GO → S6 PLAN only** |

---

## 18. Evidence index (code)

| Artifact | Note |
|----------|------|
| `DecisionWorkspaceHost.tsx` | `recordDecision` / `hydrateDecision` · no legacy |
| `decision-persist/api.ts` · `store.ts` · `types.ts` | append-only `kw-decision-persist-v1` |
| `tenders-strategy-owner-decisions.ts` | `kw-tender-decisions` upsert |
| `useOwnerTenderDecisions.ts` | React write facade |
| `TenderDecisionView.tsx` · `TenderWorkflowPrimaryAction.tsx` · `TendersStrategyContent.tsx` | Expert ON suppress write |
| `tenders-strategy-action-center.ts` | reads legacy for AC |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | asserts no Persist→legacy bridge |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | asserts no bridge string |
| DF §4.3 / §6 / §11 S6 | mapping + allowlist intent |

---

## STOP

```text
AUDIT COMPLETE
NO PLAN / DF-slice / IMPLEMENT without OWNER GO → S6 PLAN
NO code changes in this stage
NO commit · NO push · NO deploy
S7/S8 = OUT
```
