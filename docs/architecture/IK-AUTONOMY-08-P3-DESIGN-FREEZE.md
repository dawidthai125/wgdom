# IK AUTONOMY-08 P3 — Owner Gates G1/G2  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P3-OWNER-GATES-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = PROPOSED** · **NOT READY FOR IMPLEMENTATION** |
| **Date** | 2026-08-26 |
| **Mode** | DOCS ONLY · **no runtime change in this slice** |
| **Baseline** | **`b857a162`** / `b857a162e59d54a438e82708a2d91b475356cfe4` |
| **Deep Audit** | A08-P3 DEEP AUDIT (2026-08-26) · verdict **PARTIALLY_MAPPED** → resolved by this DF |
| **ARCH REVIEW** | [`IK-AUTONOMY-08-P3-ARCH-REVIEW.md`](./IK-AUTONOMY-08-P3-ARCH-REVIEW.md) |
| **Prior slices** | P0/P1/P2 **CLOSED** · P3 **NOT STARTED** · P4 **PLANNED** · epic **NOT CLOSED** |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Tip** | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Unified PLAN** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) §405 |
| **Slice** | **08-P3 only** — Owner Gates **G1 Identity** + **G2 Price** · Accept→persist→recompute · **not** G3 Final Bid (P4) · **not** epic close |

```text
DESIGN FREEZE              = PROPOSED (this document)
ARCH REVIEW                = PASS WITH REQUIRED FIXES (companion doc)
ARCHITECTURE BLOCKERS      = 0 at DF level · 1 implementation contract (G2 orchestra refresh)
IMPLEMENT                  = NOT AUTHORIZED
A08-P0 / P1 / P2           = COMPLETE / CLOSED
A08-P3                     = NOT STARTED
A08-P4                     = PLANNED
EPIC                       = AUTONOMY-08 — NOT CLOSED
Phase 2E                   = targeted discovery LANDED @ 1a9c5484 · FULL OPEN · OUT OF SCOPE P3
```

If narrative and **SOURCE** (repo code + prior closeouts) disagree, **SOURCE wins**.

```text
REUSE existing Accept engines.
Do NOT create a parallel pricing/identity engine.
Research ≠ Accept.
G1 manual authority = matchMethod "manual" via OwnerManualIdentityOverride only.
No runtime mapping KV.
```

---

## 1. Status

| Item | Frozen |
|------|--------|
| A08-P3 DEEP AUDIT | **COMPLETE** (read-only) |
| This DF | **PROPOSED** — awaits Owner signoff + commit |
| ARCH REVIEW | Companion doc · **PASS WITH REQUIRED FIXES** |
| IMPLEMENT | **NOT AUTHORIZED** |
| P4 / G3 Final Bid | **OUT OF SCOPE** |
| Phase 2E corpus WIP | **OUT OF SCOPE** |
| S6-A / S6-B / P4 closed code | **MUST NOT TOUCH** |
| Unrelated WIP | **NIERUSZANY** |

### Readiness gate (HARD)

**NOT READY FOR IMPLEMENTATION** until **all** of:

1. This DF + Arch Review are **committed** to `main`.
2. Owner explicitly authorizes **A08-P3 IMPLEMENT** (separate GO).

---

## 2. P3 scope

### IN

| # | Capability |
|---|------------|
| 1 | **G1 Identity Gate** — GAP display · Accept · Edit · Reject · Research Again |
| 2 | **G2 Price Proposal Gate** — Accept · Reject · Recalculate · Edit |
| 3 | **Accept → persist → recompute** wiring in IK tender workflow |
| 4 | **Owner Action Queue** + deep links + EC CTAs (navigation/handler reuse) |
| 5 | P3 harness + frozen regression aggregate |

### OUT

| # | Excluded |
|---|----------|
| 1 | G3 Final Bid Owner Gate → **P4** |
| 2 | New pricing / identity / Accept engine |
| 3 | Runtime KV for `WORK_RATE_IDENTITY_MAPPINGS` / `OWNER_KNR_MAPPINGS` |
| 4 | Phase 2E corpus / pdf-match / resolve-contract |
| 5 | Changes to P2 Research-on-Miss semantics |
| 6 | Changes to P7 read-only / P8 / D / Composite / S4-B |
| 7 | S10 · new TendersModule · global IK FINAL claims |

---

## 3. G1 — Identity Gate contract

### 3.1 Problem

Lines in `IDENTITY_GAP`, `AMBIGUOUS`, or `OWNER_MAPPING_POSSIBLE` (`ik-identity-coverage.ts`) require **Owner** mapping authority before trusted downstream pricing. Engine read models and queue/deeplinks exist; **IK EC Accept/Edit/Reject/Research Again do not**.

### 3.2 Primary persistence model (HARD FREEZE)

**`OwnerManualIdentityOverride`** is the **primary P3 runtime** persistence model for G1 Owner Accept/Edit.

**DO NOT** introduce runtime mapping KV. **DO NOT** assume a persistent global mapping authority KV exists in repo.

| Model | Role in P3 |
|-------|------------|
| **C) OfferBoq `OwnerManualIdentityOverride`** | **PRIMARY** — per-tender/per-line Owner authority |
| **B) Code-deploy `WORK_RATE_IDENTITY_MAPPINGS` / `OWNER_KNR_MAPPINGS`** | **Reuse read-only** · durable alias rows remain **Owner-OPS / code-deploy** · **not** P3 runtime Accept target |
| **A) Runtime mapping KV** | **REJECTED** — not evidenced |

Evidence: `orchestra/ik-identity-phase.ts` (`OwnerManualIdentityOverride`, `applyManualOverride`); P4 harness T-P4-12; `orchestra/ik-identity-persist-glue.ts` → `attachOfferBoqToDwelling`; `work-rate-identity-mapping.ts` L5–6 (*ZERO … KV write*).

### 3.3 G1 Accept / Edit persist flow (HARD FREEZE)

```text
Owner Accept or Edit→Confirm
  → manualOverrides[]          (tender-scoped UI state — implementation detail)
  → runIkIdentityPhase({ manualOverrides })
  → applyManualOverride        (matchMethod: "manual")
  → resolveWorkIdentityFromOfferBoqLine
  → persistPlans[]
  → runGatedIdentityPersist    (hash-diff + session gate)
  → attachOfferBoqToDwelling   (multi-dwelling LS package)
  → evaluateAllDwellingsInPackage   (existing W3 effect in use-ik-orchestra.ts)
  → pkgEpoch / package refresh
  → computeIkOrchestraSyncSnapshot (fullSnapshot)
  → runIkP7PositionCostBid / runIkP8RiskDecision (when levers ON — as today)
```

**Manual Owner authority MUST** come explicitly from `manualOverrides` with **`matchMethod: "manual"`**. Engine auto-persist **must not** be treated as G1 Owner Accept.

### 3.4 Automatic identity persist (HARD FREEZE)

| Path | Behavior |
|------|----------|
| **Engine-trusted identity** (mapper OK, approved static mappings, Slice D / P4 trusted paths) | **KEEP** automatic `runGatedIdentityPersist` — existing **W2** contract |
| **G1 Owner manual Accept/Edit** | **ONLY** after Owner supplies `manualOverrides` |
| **Blanket disable `runGatedIdentityPersist`** | **FORBIDDEN** — breaks W2 / F5 materialize |

Today: `ik-orchestra-engine.ts` passes `manualOverrides: null` — P3 wires Owner UI → overrides.

### 3.5 G1 actions

| Action | Contract | Reuse |
|--------|----------|-------|
| **GAP display** | Queue domain `identity` + EC facts `IDENTITY_GAP` / `IDENTITY_MAPPING_REQUIRED` | `buildIkOwnerActionQueue`, `ik-entry-conversation.ts` |
| **Accept** | Confirm `catalogWorkId` → override → persist chain §3.3 | `applyManualOverride`, `runGatedIdentityPersist` |
| **Edit** | Change `catalogWorkId` / candidates → same override type | Kosztorys explorer anchor (`ik-owner-action-deeplink.ts`) |
| **Reject** | Decline proposal for line · **no persist** · remain GAP | Hub/Firma Reject pattern (session-only) |
| **Research Again** | §4 | No new engine |

### 3.6 G1 persist tuple

```typescript
OwnerManualIdentityOverride {
  dwellingId: string;
  lineId: string;
  catalogWorkId: string;
  matchMethod: "manual";
  matchConfidence?: OfferBoqConfidence;
  candidateMatches?: OfferBoqMatchCandidate[];
}
```

**Not persisted by G1 Accept in P3:** new rows in global mapping registries (remain code-deploy / separate Owner OPS GO).

---

## 4. G1 — Research Again semantics (HARD FREEZE)

**Definition:** Re-evaluate **identity resolution inputs** — **not** price research.

| Mechanism | P3 use |
|-----------|--------|
| **A) Re-run identity phase / orchestra sync** | **PRIMARY** — deps change → `computeIkOrchestraSyncSnapshot` re-runs `runIkIdentityPhase` |
| **B) Re-run KNR lookup** | **When KNR context exists** — `use-ik-orchestra.ts` KL-3 `executeKl3KnowledgeLookup` (lookup-only) |
| **C) Labor price research** | **FORBIDDEN for identity GAP** — `ik-labor-expert.ts` `RESEARCH_ON_UNKNOWN_IDENTITY` |
| **D) Material price research** | **FORBIDDEN for identity GAP** |
| **E) Dedicated identity HTTP research** | **FORBIDDEN** — not evidenced |

**Research Again MUST NOT:**

- auto-Accept
- write Owner mapping / registry
- flip `expertAiDecydentEnabled` (D HARD STOP)
- bypass G1 Owner Gate
- call `acceptWorkRateResearchCandidate` / `acceptMaterialResearchCandidate`
- invent identity from description alone

**UX:** Research Again → (A) and optionally (B); if still GAP → Owner **Edit/Accept** required.

---

## 5. G2 — Price Proposal Gate contract

### 5.1 Problem

P2 produces `CANDIDATE_OWNER_ACCEPT_REQUIRED` on labor/material lines. Accept **engines exist**; IK host / EC **lack unified G2 actions**.

### 5.2 Actions (HARD FREEZE — reuse only)

| Action | Labor | Material |
|--------|-------|----------|
| **Accept** | `acceptIkLaborResearchAndNotify` → `acceptWorkRateResearchCandidate` | `acceptIkMaterialResearchCandidate` → `acceptMaterialResearchCandidate` |
| **Reject** | Session-only · no KV | Same |
| **Recalculate** | `forceRefresh: true` on research re-entry | Material orchestrate `forceRefresh` |
| **Edit** | `updateOurWorkRate` (Firma pattern) | Manual / panel edit paths |

**HARD:** **No second acceptance engine.** Wrappers and wiring only.

### 5.3 UI surface (HARD FREEZE — Hybrid D)

| Layer | Role |
|-------|------|
| **Owner Action Queue** | **SSOT** for G2 items (`labor_accept`, `material_accept`) |
| **Deep links** | Navigate to existing panels — labor: `[data-ik-labor-gap-research-panel]`; material: Chief + `[data-demand-price-research-panel]` |
| **Hub / Firma panels** | Execute Accept/Reject/Recalculate/Edit |
| **EC step cards** | **CTA only** — navigate/invoke **same handlers** · **must not duplicate** acceptance logic |

### 5.4 Material G2 in tender context

1. Queue from `material.lines[]` where `priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"` and `row.candidate` exists.
2. Deep link → Chief workspace (`chiefDossierAvailable` guard — existing).
3. Handler calls **`acceptIkMaterialResearchCandidate`** with `row.candidate`, local catalog store, line `expectedUnit`.

**No second material acceptance engine.**

---

## 6. Accept → Persist → Recompute (HARD FREEZE)

### 6.1 G1 Owner Accept

| Step | Mechanism |
|------|-----------|
| INPUT | GAP/AMBIGUOUS/OWNER_MAPPING_POSSIBLE + Owner `catalogWorkId` |
| ACCEPT | Owner confirms → `manualOverrides[]` |
| PERSIST | `runGatedIdentityPersist` → `attachOfferBoqToDwelling` (LS package) |
| INVALIDATION | Identity hash change; session gate (`IDENTICAL_PAYLOAD`, `ALREADY_WRITTEN_SESSION`) |
| F5 | `evaluateAllDwellingsInPackage` → `upsertTenderPackage` |
| ORCHESTRA | `pkgEpoch++` → `fullSnapshot` re-run |
| P7 / P8 | Re-run inside `fullSnapshot` when levers ON |

### 6.2 G2 Labor / Material Accept

| Step | Mechanism |
|------|-----------|
| INPUT | `WorkRateResearchCandidate` / `PriceCandidate` on expert row |
| ACCEPT | `acceptIkLaborResearchAndNotify` / `acceptIkMaterialResearchCandidate` (`aiAutoAccept: false`) |
| PERSIST | `saveWorkCatalogRouted` → `kw-wgdom-work-catalog` |
| INVALIDATION | `notifyIkPricingAcceptedIfPersistOk` → `pricingCatalogRevision` + `chiefRefreshNonce` (+ optional `materializeIkF5OnPackage`) |
| TENDER PRICING | `useTenderPricingAuto` re-runs on `pricingCatalogRevision` |
| ORCHESTRA P7 | **Gap today:** `fullSnapshot` deps omit `pricingCatalogRevision` |

### 6.3 G2 orchestra refresh (REQUIRED FIX — IC-P3-ORCH-1)

After successful G2 Accept from IK tender context:

**Preferred (HARD):** `notifyIkPricingAccepted` **AND** explicit orchestra catalog reload — e.g. **`pkgEpoch++` / store reload** so `computeIkOrchestraSyncSnapshot` re-reads catalog and **P7 sees updated OUR RATE / PM**.

**Fallback (documented only):** add `pricingCatalogRevision` to `fullSnapshot` useMemo deps in `use-ik-orchestra.ts` — acceptable if pkgEpoch approach is insufficient in implement review.

**Revision bump alone ≠ orchestra P7 recompute** (evidenced).

---

## 7. Idempotency contract (HARD FREEZE)

| Path | Repository today | P3 contract |
|------|------------------|-------------|
| **G1 identity persist** | Hash + session dedup in `runGatedIdentityPersist` | **REUSE** — repeat same manual override → `IDENTICAL_PAYLOAD` skip |
| **Material Accept** | `commitMarketQuotesImport` → `status: "noop"` when fingerprint unchanged | **REUSE** |
| **Labor Accept** | **Not idempotent** — appends SOURCE + OUR history each call | **P3 MUST** noop/skip when same stable candidate already accepted (see below) |

### Stable acceptance identity

| Domain | Key |
|--------|-----|
| **G1** | `(dwellingId, lineId, catalogWorkId, matchMethod: "manual")` |
| **G2 Labor** | `(workId, unit, marketBaseRatePln, candidate observation fingerprint)` |
| **G2 Material** | `PriceCandidate` identity + commit fingerprint |

### Labor repeat-Accept (P3 implementation contract)

When Owner clicks Accept twice on the **same** candidate for the same workId+unit with OUR RATE already equal to accepted market base:

- **MUST** return success with **`noop: true`** (or equivalent) · **MUST NOT** append duplicate history.

Reject then Accept: allowed fresh. Page refresh: no silent Accept — candidate/override must be present live.

---

## 8. Frozen contracts (MUST NOT change in P3)

| Contract | Status |
|----------|--------|
| D = HARD STOP | KEEP |
| Research ≠ Accept | KEEP |
| No auto-Accept | KEEP |
| Composite `feedsP7Bid: false` | KEEP |
| P7 read-only (no Accept/write in engine) | KEEP |
| P8 no Accept · no D flip | KEEP |
| S4-B quantity resolver (`boq-pricing-quantity-resolver.ts`) | KEEP |
| S6-A / S6-B / P4 closed paths | KEEP |
| Phase 2D frozen | KEEP |
| P2 research boundaries (`RESEARCH_ON_UNKNOWN_IDENTITY`, etc.) | KEEP |
| Evidence ≠ OUR RATE | KEEP |

---

## 9. Implementation boundaries — MUST NOT TOUCH

| Area | Paths / contracts |
|------|-------------------|
| S6-A / S6-B / P4 | `boq-outcome-s4b-enrichment.ts`, `ik-knr-wc-p4-trust-seam.ts`, S6 multi-dwelling closed paths |
| Phase 2E corpus WIP | `knr-corpus*`, `knr-pdf-match*`, `resolve-knr-knowledge-contract.ts` |
| S4-B quantity | `boq-pricing-quantity-resolver.ts` |
| Composite | `ik-composite-both-hold.ts` (`feedsP7Bid: false`) |
| P7 engine semantics | `ik-p7-position-cost-bid.ts` |
| P8 / D | `ik-p8-risk-decision.ts`, D flip forbidden |
| Accept engine semantics | `work-rate-accept.ts`, `market-material-research-orchestrate.ts` — **wire only** unless separate audit |
| P2 closed paths | Expert auto-Accept blocks in `ik-labor-expert.ts` / `ik-material-expert.ts` |
| Phase 2D | KNR discovery source contracts |

---

## 10. Reusable functions (exact — DO NOT REBUILD)

| Function / module | Role |
|-------------------|------|
| `OwnerManualIdentityOverride`, `runIkIdentityPhase`, `applyManualOverride` | G1 override + phase |
| `runGatedIdentityPersist`, `computeOfferBoqIdentityPayloadHash` | G1 persist gate |
| `attachOfferBoqToDwelling`, `evaluateAllDwellingsInPackage` | Package / F5 |
| `acceptWorkRateResearchCandidate`, `acceptIkLaborResearchAndNotify` | G2 labor |
| `acceptMaterialResearchCandidate`, `acceptIkMaterialResearchCandidate` | G2 material |
| `notifyIkPricingAccepted`, `notifyIkPricingAcceptedIfPersistOk`, `saveWorkCatalogRouted` | G2 notify + persist |
| `buildIkOwnerActionQueue`, `resolveIkOwnerActionDeepLink` | Queue + navigation |
| `runIkP7PositionCostBid`, `runIkCompositeBothHold` | Downstream read-only consume |

---

## 11. Likely implementation files (later — NOT this slice)

| Area | Files |
|------|-------|
| Orchestration | `orchestra/ik-orchestra-engine.ts`, `orchestra/use-ik-orchestra.ts` |
| Host / UI | `IkEntryHost.tsx`, `ExpertConversationSurface.tsx`, Owner queue navigate, `IkLaborGapResearchPanel.tsx`, material panel bridge |
| Tests | `scripts/test-ik-autonomy-08-p3-*.mjs` (new, on IMPLEMENT GO) |

---

## 12. Validation / harness plan

| Scenario | Requirement |
|----------|-------------|
| G1 Accept → persist | Override → OfferBoq LS write |
| G1 Reject → no persist | Session-only |
| G1 Research Again | No price HTTP on UNRESOLVED identity |
| G2 labor/material Accept | Reuse Accept helpers + notify |
| G2 Reject / Recalculate / Edit | Unified IK path |
| Post-G2 orchestra refresh | **IC-P3-ORCH-1** — P7 sees updated catalog |
| Repeat Accept idempotency | G1 dedup + material noop + labor noop contract |
| Frozen regression | A08 P0–P2 harnesses · no host auto-Accept · Research ≠ Accept · D HARD STOP |
| S6/P4 / Composite / S4-B | Regression unchanged |

**Rollback:** Feature flag or wiring-only revert; Accept engine semantics unchanged.

---

## 13. Unresolved UNKNOWNs (non-blocking at DF level)

| # | Item |
|---|------|
| 1 | Exact React store for `manualOverrides[]` — implementation detail |
| 2 | Chief OFF blocks material G2 deep link — **evidenced**; product accepts or requires Chief |
| 3 | Promote G1 Accept to code-deploy registry row — **OUT OF P3** (Owner OPS) |
| 4 | Formal IK state machine `WAITING_OWNER` — optional follow-up; not P3 minimal |

---

## 14. Readiness

```text
NOT READY FOR IMPLEMENTATION

Until:
  1. This DF + Arch Review committed to main
  2. Owner explicitly authorizes A08-P3 IMPLEMENT
```

**Do not** start P4 · Phase 2E corpus · S10 · global IK FINAL claims.

---

*End of Design Freeze.*
