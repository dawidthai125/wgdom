# EXPERT-AI-PRODUCTION-ENABLEMENT-01 — Q12 FIX DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE LOCKED** · **SHIPPED** · **Q12 PV PASS** · see CLOSEOUT  
> **ID:** EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DF  
> **Date:** 2026-08-09  
> **Baseline pre-fix:** UI **2.66.22** / tip **`29a48fb3`**  
> **Shipped tip:** UI **2.66.22** / **`4ba06032`** (`4ba0603`)  
> **RCA:** CONFIRMED — Session wall-clock remint of Case identity  
> **Direction:** **OPTION A** — stabilize existing Case identity (Persist contract unchanged)  
> **IMPLEMENT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md)  
> **PV:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md)  
> **CLOSEOUT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
Q12 FIX — DESIGN FREEZE (LOCKED)

SAME tender + SAME business content + FULL RELOAD
  = SAME caseId + SAME dossier.finishedAt
  = Persist hydrate SUCCESS

REAL business content change
  = NEW caseId (and/or new dossierFinishedAt)
  = previous Persist decision DOES NOT hydrate

Persist matching UNCHANGED
  tenderId ∧ caseId ∧ dossierFinishedAt

NO third store · NO relaxed hydrate · NO useTenderOfferRun touch
════════════════════════════════════════════════════════
```

---

## 0. Owner GO

| Gate | Status |
|------|--------|
| OWNER GO → DESIGN FREEZE | **ISSUED** |
| OWNER GO → IMPLEMENT | **ISSUED** |
| OWNER GO → COMMIT / PUSH / PV | **DONE** · feature **`4ba06032`** · Q12 **PASS** |
| OWNER GO → CLOSEOUT docs | **IN PROGRESS** (docs-only) |

---

## 1. Problem (frozen)

| Step | Observation |
|------|-------------|
| Write | `needs_review` → `recordDecision` SUCCESS · chip `Decyzja: do przeglądu` |
| Reload | Session remints wall-clock identity |
| Hydrate | `hydrateDecision(tenderId, caseId₂, finishedAt₂)` → `null` |
| UI | `Decyzja: brak` |

Unstable sources (RCA):

1. `assemble` default `builtAtIso = new Date().toISOString()`
2. Session fingerprint includes `offerBoq.builtAt` (wall-clock)
3. Chief `dossier.finishedAt = isoNow(nowIso)` while hook omits `nowIso`

Persist `selectLatest` / AC7 mismatch→null is **correct** and **LOCKED unchanged**.

---

## 2. Field semantics review (LOCKED findings)

Do **not** freeze `lineCount + recomputeToken + parserVersion` by stability alone. Reviewed:

| Field | Existing SSOT? | Stable on reload? | Changes on real BOQ/dossier business change? | Wall-clock? | DF verdict |
|-------|----------------|-------------------|-----------------------------------------------|-------------|------------|
| **`offerBoq.recomputeToken`** | YES — `computeOfferBoqRecomputeToken(lines)` hashes lineId/qty/mapping/pricing/edits + length suffix | YES — independent of assemble clock | YES — any priced/mapped/edited line material change | NO | **IN fingerprint (primary content)** |
| **`offerBoq.lines.length`** | YES | YES | YES (add/remove lines) | NO | **OMIT as separate fp part** — already encoded in `recomputeToken` suffix `_N`; dual part = noise |
| **`tenderDossier.parserVersion`** (number) | YES — TP200 dossier version | YES | YES on parser bump / rescan versioning | NO | **IN fingerprint** — **only** the numeric field |
| **Timestamp fallbacks currently stuffed into `parserVersion` arg** (`parsedAt` / `builtAt` / `updatedAt`) | Mixed | `updatedAt` can churn | Overloads meaning | `updatedAt` risky | **OUT of fingerprint slot** — antipattern; do not continue |
| **`kosztorys.parsedAt`** | YES — persisted on item dossier | YES across reload | YES on re-parse of kosztorys | Stamp of parse event (persisted, not reminted each Session) | **IN stableCaseStamp** (clock for assemble/nowIso) |
| **`tenderDossier.builtAt`** | YES — persisted dossier build | YES across reload | YES on dossier rebuild | Persisted stamp | **IN stableCaseStamp** (fallback after `parsedAt`) |
| **`item.updatedAt`** | YES | Often changes on unrelated sync/merge | Not BOQ-specific | Sync churn | **OUT of identity** |
| **Assemble `new Date()` / `offerBoq.builtAt` from default** | Adapter default only | **NO** | N/A | **YES** | **OUT of identity** |

---

## 3. Chosen stable identity source

### 3.1 `stableCaseStamp` (LOCKED)

Single content-derived stamp used for **both** `builtAtIso` and `nowIso`:

```text
stableCaseStamp =
  item.tenderDossier?.kosztorys?.parsedAt
  ?? item.tenderDossier?.builtAt
  ?? `content:${recomputeToken || "0"}|pv:${parserVersionNum ?? "0"}`
```

| Rule | Lock |
|------|------|
| Prefer | Persisted dossier SSOT stamps (`parsedAt`, then `builtAt`) |
| Fallback | Content-derived string from `recomputeToken` + numeric `parserVersion` — **never** `new Date()` / `item.updatedAt` |
| Availability | Computed in `useChiefOrchestratorSession` after `assemble` (token available) or pre-assemble for stamp-from-item-only path when BOQ null |

**Why stable on reload:** Same item snapshot → same `parsedAt`/`builtAt` (or same token/pv fallback).

**Why invalidates on real change:** Re-parse/rebuild updates stamps; BOQ business edit updates `recomputeToken` (fallback and fingerprint).

---

### 3.2 Fingerprint composition (LOCKED)

```text
fingerprint =
  (recomputeToken ?? "")
  + "|"
  + String(parserVersionNum ?? "")
  + "|"
  + stableCaseStamp
```

Where:

- `recomputeToken` = `runtimeRo.offerBoq?.recomputeToken ?? ""`
- `parserVersionNum` = `item.tenderDossier?.parserVersion` **only** (number | undefined) — **no** timestamp fallbacks in this slot
- `stableCaseStamp` = §3.1

```text
caseId = buildChiefSessionCaseId({
  tenderPipelineItemId: item.id,
  fingerprint,
})
```

Shape unchanged: `chief:${tenderId}:${fingerprint}`.

| Explicitly OUT of fingerprint | Reason |
|-------------------------------|--------|
| `runtimeRo.offerBoq.builtAt` from assemble clock | Wall-clock remint (root cause) |
| Separate `lineCount` part | Redundant with `recomputeToken` `_N` |
| `item.updatedAt` | Sync churn / false Case churn |

---

### 3.3 `builtAtIso` (LOCKED)

```text
assembleChiefWireRuntimeRo({ item, builtAtIso: stableCaseStamp })
```

- Caller supplies stamp — REUSE Adapters DF (`builtAtIso` from outside).
- **No edit** to `chief-wire-adapters/**` unless IMPLEMENT proves default path still reached (must not).

---

### 3.4 `nowIso` (LOCKED)

```text
engine.start({
  runtimeRo,
  caseId,
  pricingReady,
  nowIso: stableCaseStamp,
  maxReturnLoops,
})
```

- REUSE existing `ChiefSessionStartParams.nowIso` → `runChiefOrchestrator` → `isoNow(nowIso)`.
- **No edit** to `chief-orchestrator/**`.
- Result: `dossier.finishedAt === stableCaseStamp` for the Case finish path (and early-exit paths that use `isoNow(input.nowIso)`).

---

## 4. Locked data flow

```text
item.tenderDossier (parsedAt / builtAt / parserVersion)
item → assembleChiefWireRuntimeRo({ builtAtIso: stableCaseStamp })
     → offerBoq.recomputeToken (content hash)
     → stableCaseStamp (§3.1)
        → fingerprint (§3.2)
        → caseId = chief:${item.id}:${fingerprint}
        → engine.start({ nowIso: stableCaseStamp })
        → dossier.finishedAt = stableCaseStamp
        → DecisionWorkspaceHost
             recordDecision(tenderId, caseId, dossierFinishedAt)
             hydrateDecision(tenderId, caseId, dossierFinishedAt)
```

Reload with **same** item content → **same** stamp → **same** fingerprint → **same** caseId → **same** finishedAt → hydrate hit.

---

## 5. Reload vs content-change behavior (LOCKED)

| Scenario | caseId | dossier.finishedAt | Hydrate previous decision |
|----------|--------|--------------------|---------------------------|
| Full reload, same BOQ + same dossier stamps | **Same** | **Same** | **YES** (Q12) |
| Line/price/mapping/edit change → new `recomputeToken` | **New** | May change if stamp fallback uses token; stamp from `parsedAt` may stay | **NO** (AC-F5) |
| Kosztorys re-parse → new `parsedAt` | **New** (stamp in fp) | **New** | **NO** |
| Parser version bump on dossier | **New** | Unchanged stamp unless re-parse | **NO** |
| Unrelated `item.updatedAt` sync only | **Same** (updatedAt OUT) | **Same** | **YES** |

---

## 6. Allowlist (LOCKED)

| Path | Role |
|------|------|
| `src/app/hooks/useChiefOrchestratorSession.ts` | ★ PRIMARY — stamp, fingerprint inputs, `builtAtIso`, `nowIso` |
| `src/lib/chief-session/case-id.ts` | OPTIONAL — clarify helper docs / keep `buildChiefSessionFingerprint` compatible; prefer **call-site** omit of wall-clock `builtAt` (pass `builtAt: null` or stop passing assemble clock) |
| `scripts/test-wire-chief-session-01.mjs` | Identity stability + content-change invalidate |
| Docs: this DF + thin Enablement/Session note | Content-stable Case identity |

**Do not expand** unless IMPLEMENT hits a concrete compile/runtime blocker — then STOP and amend DF before expanding.

---

## 7. OUT (LOCKED)

| Path / concern | Rule |
|----------------|------|
| `src/lib/decision-persist/**` | NO TOUCH |
| `DecisionWorkspaceHost.tsx` | NO TOUCH (contract unchanged) |
| `src/lib/chief-orchestrator/**` | NO TOUCH (use `nowIso` only) |
| `src/lib/chief-wire-adapters/**` | NO TOUCH (caller passes `builtAtIso`) |
| `*-expert/**`, OfferBoq/Bid write, TRE, Strategy | NO TOUCH |
| `src/app/hooks/useTenderOfferRun.ts` | **PROTECTED · LOCAL M · NO TOUCH** |
| Third store / third Persist key / tenderId-only hydrate / latest-by-tender | FORBIDDEN |
| New fingerprint system / new engine / new flag | FORBIDDEN |

---

## 8. AC (LOCKED)

| ID | Criterion |
|----|-----------|
| **AC-F1** | Same tender + same business content + full reload → **identical `caseId`** |
| **AC-F2** | Same tender + same business content + full reload → **identical `dossier.finishedAt`** |
| **AC-F3** | `needs_review` → Persist → full reload → UI **`Decyzja: do przeglądu`** |
| **AC-F4** | Real business content change → **new `caseId`** |
| **AC-F5** | Real business content change → previous Persist decision **does not** hydrate |
| **AC-F6** | Persist API / store / types **unchanged** |
| **AC-F7** | S2 / S4 / S5 / S6 relevant suites PASS |
| **AC-F8** | `test-expert-ai-production-enablement-01` PASS |
| **AC-F9** | No changes to Experts · Chief BC · Persist API · OfferBoq/Bid · TRE · Strategy · `useTenderOfferRun.ts` |
| **AC-F10** | Diff ⊆ allowlist §6 |

---

## 9. Regression matrix (LOCKED)

| Suite | Gate |
|-------|------|
| `scripts/test-wire-chief-session-01.mjs` | PASS + identity reload assertions |
| `scripts/test-decision-persist-01.mjs` | PASS (no Persist code change) |
| `scripts/test-decision-workspace-01.mjs` | PASS |
| `scripts/test-expert-ai-production-enablement-01.mjs` | PASS |
| Relevant S2 / S4 / S5 / S6 harnesses | PASS |
| `npm run build` | PASS |
| Owner Q12 re-verify (after IMPLEMENT) | PASS |

---

## 10. Rollback (LOCKED)

```text
git revert <fix-commit>
```

- No migration · no force push  
- Tip rollback target: **`29a48fb3`**  
- Orphan Persist records keyed by pre-fix wall-clock identities remain harmless

---

## 11. Docs / DF impact (LOCKED)

| Document | Amend? |
|----------|--------|
| **DECISION-PERSIST-01 DF** | **NO** — matching semantics unchanged |
| **WIRE-CHIEF-SESSION / Enablement thin note** | **YES** — one sentence: *Case identity is content-stable across reloads; wall-clock assembly time is not an identity source.* |
| This file | SSOT for Q12 fix DF |

---

## 12. Report checklist (Owner)

| # | Item | Freeze |
|---|------|--------|
| 1 | Chosen stable identity source | `stableCaseStamp` = `kosztorys.parsedAt ?? tenderDossier.builtAt ?? content:token\|pv` |
| 2 | Exact fingerprint | `recomputeToken\|parserVersionNum\|stableCaseStamp` |
| 3 | Exact `builtAtIso` | `stableCaseStamp` |
| 4 | Exact `nowIso` | `stableCaseStamp` |
| 5 | Why stable | Persisted dossier stamps + content hash; no Session wall-clock |
| 6 | Why invalidates | Token / parserVersion / parse-rebuild stamp change |
| 7 | Allowlist | §6 |
| 8 | OUT | §7 |
| 9 | AC | AC-F1…F10 |
| 10 | Regression | §9 |
| 11 | Rollback | §10 |
| 12 | Docs/DF | Persist NO · Session/Enablement thin YES |

---

## 13. NEXT GATE

```text
DESIGN FREEZE COMPLETE / LOCKED
IMPLEMENT + COMMIT + PUSH + Q12 PV = PASS (4ba06032)

Content invalidation live = NOT TESTED
S2 44/45 = PRE-EXISTING on 29a48fb3 · OUT
```

Epic CLOSEOUT: [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md).
