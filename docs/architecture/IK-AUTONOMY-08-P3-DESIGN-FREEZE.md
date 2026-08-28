# IK AUTONOMY-08 P3 — Owner Gates G1/G2  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P3-OWNER-GATES-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = ACCEPTED** · **P3 = IMPLEMENTED · OPEN** · **NOT CLOSED** |
| **Date** | 2026-08-26 (DF) · **Owner governance sync 2026-08-28** |
| **Mode** | DOCS ONLY · **no runtime change in this slice** |
| **Baseline (design)** | **`b857a162`** / `b857a162e59d54a438e82708a2d91b475356cfe4` |
| **Implementation** | **`3822acb`** · harness **27/0 PASS** · HEAD ancestor **`f457cb17`** |
| **Owner governance** | OD-P3-1 G1 **APPROVE** · OD-P3-2 G2 **APPROVE** · OD-P3-5 **REQUIRE EVIDENCE BEFORE PROD** |
| **Deep Audit** | A08-P3 DEEP AUDIT (2026-08-26) · verdict **PARTIALLY_MAPPED** → resolved by this DF |
| **ARCH REVIEW** | [`IK-AUTONOMY-08-P3-ARCH-REVIEW.md`](./IK-AUTONOMY-08-P3-ARCH-REVIEW.md) |
| **Prior slices** | P0/P1/P2 **CLOSED** · P3 **IMPLEMENTED · OPEN** · P4 **PLANNED** · epic **NOT CLOSED** |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Tip** | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Unified PLAN** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) §405 |
| **Slice** | **08-P3 only** — Owner Gates **G1 Identity** + **G2 Price** · Accept→persist→recompute · **not** G3 Final Bid (P4) · **not** epic close |

```text
DESIGN FREEZE              = ACCEPTED (Owner OD-P3-1 / OD-P3-2 contract APPROVE)
ARCH REVIEW                = PASS WITH REQUIRED FIXES · fixes SATISFIED in code @ 3822acb
ARCHITECTURE BLOCKERS      = 0 at DF level
G1 CONTRACT                = Owner APPROVED (OD-P3-1)
G2 CONTRACT                = Owner APPROVED (OD-P3-2)
A08-P3 IMPLEMENTATION      = IMPLEMENTED @ 3822acb · harness 27/0 · P3 OPEN · NOT CLOSED
PROD USE (G1/G2)           = REQUIRE EVIDENCE BEFORE PROD (OD-P3-5)
G2 PRODUCTION VERIFY       = WAITING FOR NATURAL PROD CANDIDATE (OD-P3-3)
A08-P0 / P1 / P2           = COMPLETE / CLOSED
A08-P4 / G3 Final Bid      = PLANNED · OUT OF SCOPE P3
EPIC                       = AUTONOMY-08 — NOT CLOSED
Phase 2E                   = targeted discovery LANDED @ 1a9c5484 · FULL OPEN · OUT OF SCOPE P3
APF                        = PROVEN / FROZEN · separate plane (OD-P3-7 KEEP SEPARATE)
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
| This DF | **ACCEPTED** — G1/G2 contract Owner **APPROVED** (2026-08-28) |
| ARCH REVIEW | Companion doc · **PASS WITH REQUIRED FIXES** · IC-P3-* **satisfied** in code |
| P3 implementation | **IMPLEMENTED** @ **`3822acb`** · **OPEN** · **NOT CLOSED** |
| Prod use G1/G2 | **REQUIRE EVIDENCE BEFORE PROD** (OD-P3-5) |
| G2 Production Verify | **WAIT** — natural prod candidate (OD-P3-3) |
| P4 / G3 Final Bid | **OUT OF SCOPE** |
| Phase 2E corpus WIP | **OUT OF SCOPE** |
| S6-A / S6-B / P4 closed code | **MUST NOT TOUCH** |
| Unrelated WIP | **NIERUSZANY** |

### Readiness gate (HARD — historical design gate)

Design-time gate (pre-impl) required DF + Arch Review on `main` + Owner IMPLEMENT GO.

**Governance closeout (2026-08-28):**

1. DF + Arch Review **committed** to `main` — **PASS**.
2. Code **IMPLEMENTED** @ **`3822acb`** — factual; **not** retroactive IMPLEMENT authorization.
3. **Prod use** G1/G2 — **NOT AUTHORIZED** until evidence per **OD-P3-5**.
4. **G2 prod Accept** — **NOT AUTHORIZED** until natural candidate + G2 PV (OD-P3-3).

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

### 4.1 APF ephemeral selective research (Slice 3A addendum — HARD)

| Plane | Identity GAP labor price research |
|-------|-------------------------------------|
| **Normal IK labor orchestra** | **FORBIDDEN** — `RESEARCH_ON_UNKNOWN_IDENTITY` **KEEP** |
| **APF ephemeral selective** | **Separate policy plane** — future controlled path for `pomiar`/`prob` **without** CatalogWork/workId |

**HARD — Slice 3A does NOT change:**

- `ik-labor-expert.ts` boundary checks
- `runSelectiveWorkRateResearch` workId requirement
- P5.27 on **NORMAL_WORK_RATE_RESEARCH** plane
- Research Again semantics (identity re-eval only)

**HARD — Slice 3A establishes only:**

- explicit APF policy authorization concept (`evaluateApfEphemeralSelectiveResearchPolicy`)
- legal doc amendement in `WORK-RATE-OWNER-LEGAL-PASS.md`
- **no** HTTP · **no** source route · **no** verified content claim · **no** OUR RATE / Accept

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
P3 = IMPLEMENTED · OPEN · NOT CLOSED

Governance (Owner 2026-08-28):
  OD-P3-1  G1 contract     = APPROVE
  OD-P3-2  G2 contract     = APPROVE
  OD-P3-3  G2 PV strategy  = WAIT (natural prod candidate)
  OD-P3-4  Material Chief  = hard dependency
  OD-P3-5  Prod use        = REQUIRE EVIDENCE BEFORE PROD
  OD-P3-6  Docs sync       = YES
  OD-P3-7  APF boundary    = KEEP SEPARATE

Prod G2 Accept             = NOT AUTHORIZED (G2 PV WAIT)
P3 slice close             = NOT AUTHORIZED (G2 PV pending)
```

**Do not** start P4 · Phase 2E corpus · S10 · global IK FINAL claims · G2 Accept without natural candidate.

---

## 15. Owner governance closeout note (2026-08-28)

Docs-only sync per Owner Decision. **Semantyka kontraktu G1/G2 (§3–§8) unchanged.**

| Field | Value |
|-------|-------|
| **HEAD / origin/main** | **`f457cb17`** · UI **2.66.116** |
| **P3 impl commit** | **`3822acb`** |
| **Harness** | **27 PASS / 0 FAIL** |
| **APF** | **PROVEN / FROZEN** · [`IK-AUTONOMOUS-PRICING-FALLBACK-SOURCE-AUTHORIZATION.md`](./IK-AUTONOMOUS-PRICING-FALLBACK-SOURCE-AUTHORIZATION.md) · **≠** G2 fixture |

---

*End of Design Freeze.*
