# IK AUTONOMY-08 P3 — Owner Gates G1/G2  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P3-OWNER-GATES-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH REQUIRED FIXES** · **NOT READY FOR IMPLEMENTATION** |
| **Date** | 2026-08-26 |
| **Mode** | ARCH REVIEW (docs only) · **no runtime change** |
| **Baseline** | **`b857a162`** / `b857a162e59d54a438e82708a2d91b475356cfe4` |
| **Design Freeze** | [`IK-AUTONOMY-08-P3-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P3-DESIGN-FREEZE.md) |
| **Deep Audit** | A08-P3 DEEP AUDIT (2026-08-26) |
| **Unified AUDIT** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-AUDIT.md) §34–37 |
| **Unified PLAN** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Prior slices** | P0/P1/P2 **CLOSED** · P3 **NOT STARTED** · P4 **PLANNED** |

```text
ARCH REVIEW                = PASS WITH REQUIRED FIXES
ARCHITECTURE BLOCKERS      = 0 (design level)
REQUIRED FIXES             = IC-P3-ORCH-1 · IC-P3-LABOR-IDEM-1 · IC-TEST-P3-1
IMPLEMENT                  = NOT AUTHORIZED
A08-P3                     = NOT STARTED
EPIC                       = AUTONOMY-08 — NOT CLOSED
```

Nie implementowano. Nie edytowano runtime. Nie ruszano WIP. Nie ruszano S6/P4 / Phase 2E / frozen contracts.

Zamrożony design (REUSE Accept engines + OwnerManualIdentityOverride + queue/deeplink + notify) **jest zgodny** z MASTER SSOT i A08 unified audit. Required fixes **doprecyzowują** orchestra refresh i labor idempotency — bez nowego engine.

---

## 1. Scope reviewed

| Item | Reviewed |
|------|----------|
| A08-P3 DEEP AUDIT (2026-08-26) | YES |
| MASTER SSOT · AI Continuity · 09 baseline | YES |
| A08 Unified PLAN / AUDIT §18–19, §34–37 | YES |
| P0/P1/P2 closeouts + harness contracts | YES |
| `orchestra/ik-identity-phase.ts` · `ik-identity-persist-glue.ts` | YES |
| `orchestra/ik-orchestra-engine.ts` · `use-ik-orchestra.ts` | YES |
| `orchestra/ik-owner-action-queue.ts` · `ik-owner-action-deeplink.ts` | YES |
| `work-rate-accept.ts` · `labor-research-bridge.ts` · `ik-material-expert.ts` | YES |
| `market-material-research-orchestrate.ts` · `commit-market-quotes.ts` | YES |
| `notify-accepted.ts` · `useTenderPricingAuto.ts` | YES |
| `IkEntryHost.tsx` · `ExpertConversationSurface.tsx` | YES |
| `IkLaborGapResearchPanel.tsx` · material panel paths | YES |
| `ik-labor-expert.ts` identity research boundary | YES |
| `ik-composite-both-hold.ts` · `ik-p7-position-cost-bid.ts` · `ik-p8-risk-decision.ts` | YES |
| P4 harness T-P4-12 manual override | YES |
| S6/P4 / Phase 2E / S4-B (boundary only) | YES — out of scope |

---

## 2. SSOT alignment

| Contract | P3 DF | Match |
|----------|-------|-------|
| REUSE Accept engines · no parallel pricing/identity engine | G2 wrappers only; G1 uses override seam | **YES** |
| SEARCH BEFORE CREATE | No new orchestrator / catalog / KV | **YES** |
| Research ≠ Accept · no auto-Accept | P2 frozen; P3 wires Owner actions only | **YES** |
| Evidence ≠ OUR RATE | Accept paths unchanged semantically | **YES** |
| D HARD STOP | NOT TOUCHED | **YES** |
| Composite `feedsP7Bid: false` | NOT TOUCHED | **YES** |
| P7 read-only | NOT TOUCHED | **YES** |
| P2 KEEP GAP / `RESEARCH_ON_UNKNOWN_IDENTITY` | Research Again ≠ price research | **YES** |
| Unified audit §34 missing Owner actions | P3 addresses G1/G2 only (not G3) | **YES** |
| No runtime mapping KV | DF rejects model A | **YES** |
| Phase 2E OUT OF SCOPE | Confirmed | **YES** |
| S6/P4 CLOSED untouched | MUST NOT TOUCH list | **YES** |

**No MASTER SSOT conflict** with this DF at design level.

---

## 3. Architecture verdict

**Zgodny (PASS).** A08-P3 is **wiring + Owner surfaces** atop existing engines — consistent with unified audit §701:

```text
REUSE: existing engines.
Orchestration: IkEntryHost + flag contract.
Owner Gates: new surfaces, old functions Accept/DW.
```

P3 **does not** introduce:

- new TendersModule / Accept engine / identity engine
- runtime mapping KV
- new orchestrator replacing `computeIkOrchestraSyncSnapshot`
- changes to P2/P7/P8/Composite/S4-B/D

---

## 4. G1 architecture verdict

| Check | Verdict | Evidence |
|-------|---------|----------|
| Primary persist = `OwnerManualIdentityOverride` | **PASS** | `ik-identity-phase.ts`; P4 T-P4-12 |
| Global registry = code-deploy only | **PASS** | `work-rate-identity-mapping.ts` L5–6; `ik-knr-owner-mapping.ts` L6 |
| No runtime mapping KV | **PASS** | No evidenced KV authority |
| Keep engine-trusted auto-persist | **PASS** | W2 `runGatedIdentityPersist`; forbids blanket disable |
| Manual authority = `matchMethod: "manual"` only | **PASS** | `applyManualOverride` |
| Research Again ≠ price research | **PASS** | `RESEARCH_ON_UNKNOWN_IDENTITY` boundary |
| G1 Reject = no persist | **PASS** | Aligns with Hub Reject pattern |

**Gap (implementation):** `manualOverrides: null` at `ik-orchestra-engine.ts` L212 — **expected**; P3 wires UI → overrides.

---

## 5. G2 architecture verdict

| Check | Verdict | Evidence |
|-------|---------|----------|
| Reuse labor Accept chain | **PASS** | `acceptIkLaborResearchAndNotify` |
| Reuse material Accept chain | **PASS** | `acceptIkMaterialResearchCandidate` |
| No second acceptance engine | **PASS** | DF §5 |
| Queue SSOT for action items | **PASS** | `buildIkOwnerActionQueue` L180–212 |
| Deep links to existing panels | **PASS** | `ik-owner-action-deeplink.ts` |
| EC CTA = navigate/invoke only | **PASS** | `ExpertConversationSurface` presentation-only today |
| Host still no auto-Accept (P2 regression) | **PASS** | `test-ik-autonomy-08-p2-research-on-miss.mjs` T26 |

**Constraint (evidenced):** Material G2 requires Chief dossier for deep link — `guardChiefPanel` — product must accept or document Chief requirement.

---

## 6. Accept → Persist → Recompute verdict

| Path | Persist | Recompute | Verdict |
|------|---------|-----------|---------|
| **G1 manual Accept** | OfferBoq LS via gated persist | F5 eval + `fullSnapshot` via `pkgEpoch` | **PASS** |
| **G2 Accept → notify** | `kw-wgdom-work-catalog` | `useTenderPricingAuto` on revision bump | **PASS** |
| **G2 Accept → orchestra P7** | Catalog updated | `fullSnapshot` omits `pricingCatalogRevision` | **FIX REQUIRED** |

### Required fix IC-P3-ORCH-1

After G2 Accept from IK context: **`notifyIkPricingAccepted` + explicit orchestra catalog reload** (preferred: `pkgEpoch++` / store reload). Documented fallback: add `pricingCatalogRevision` to `fullSnapshot` deps.

Without IC-P3-ORCH-1, P7 in EC can remain stale after Accept despite tender pricing refresh — **architecture gap**, not SSOT conflict.

---

## 7. Idempotency verdict

| Path | Verdict |
|------|---------|
| G1 hash/session dedup | **PASS** — reuse |
| Material commit noop | **PASS** — reuse `commitMarketQuotesImport` |
| Labor repeat Accept | **FIX REQUIRED** — IC-P3-LABOR-IDEM-1 |

### Required fix IC-P3-LABOR-IDEM-1

P3 implement **MUST** define noop/skip when same stable labor candidate already accepted — prevent duplicate history append from `acceptWorkRateResearchCandidate`.

---

## 8. Frozen contracts review

| Contract | PASS / AT RISK |
|----------|----------------|
| D HARD STOP | **PASS** |
| Research ≠ Accept | **PASS** |
| No auto-Accept | **PASS** |
| Composite `feedsP7Bid: false` | **PASS** |
| P7 read-only | **PASS** |
| P8 no Accept | **PASS** |
| S4-B quantity resolver | **PASS** |
| S6/P4 unchanged | **PASS** (boundary enforced) |
| Phase 2D unchanged | **PASS** |
| P2 research boundaries | **PASS** |
| Evidence ≠ OUR RATE | **PASS** |
| Identity mapping registry semantics | **AT RISK if Accept engines modified** — wire-only mandate |

---

## 9. Required fixes summary (pre/post implement)

| ID | Problem | Frozen requirement |
|----|---------|-------------------|
| **IC-P3-ORCH-1** | Orchestra P7 stale after G2 Accept | `notifyIkPricingAccepted` + **pkgEpoch/store reload** (preferred) or revision dep (fallback) |
| **IC-P3-LABOR-IDEM-1** | Labor Accept not idempotent | Noop/skip on repeat same candidate |
| **IC-TEST-P3-1** | No P3 harness yet | New `test-ik-autonomy-08-p3-*.mjs` per DF §12 + frozen aggregate |

**Architecture blockers at design level: 0.** Implementation **blocked** until Owner IMPLEMENT GO.

---

## 10. File impact map (review only)

### Likely touch (on IMPLEMENT GO)

- `orchestra/ik-orchestra-engine.ts` — wire `manualOverrides`
- `orchestra/use-ik-orchestra.ts` — IC-P3-ORCH-1
- `IkEntryHost.tsx` — G1/G2 handler wiring
- `ExpertConversationSurface.tsx` — CTAs (no duplicate logic)
- Owner queue navigate + panel bridges
- `scripts/test-ik-autonomy-08-p3-*.mjs`

### MUST NOT TOUCH (confirmed)

- S6/P4 closed files · Phase 2E corpus WIP · `boq-pricing-quantity-resolver.ts` · `ik-composite-both-hold.ts` · P7/P8 engine semantics · D flip · P2 auto-Accept blocks · Accept engine semantics (wire-only)

---

## 11. Validation matrix (arch review)

| Scenario | Existing test | P3 required |
|----------|---------------|-------------|
| G1 Accept → persist | T-P4-12 (manual override) | Full wiring harness |
| G1 Reject no-persist | — | NEW |
| G1 Research Again | — | NEW (no price on UNRESOLVED) |
| G2 labor/material Accept | P4/P6 migration tests | IK host integration |
| Post-G2 orchestra refresh | — | IC-P3-ORCH-1 |
| Repeat Accept idempotency | — | IC-P3-LABOR-IDEM-1 |
| No host auto-Accept | P2 T26 | Regression |
| Research ≠ Accept | P2 harness | Regression |
| D HARD STOP | P8/A08 harnesses | Regression |
| S6/P4 / Composite / S4-B | Existing smokes | Regression unchanged |

---

## 12. Readiness

```text
NOT READY FOR IMPLEMENTATION

Until:
  1. Design Freeze + this Arch Review committed to main
  2. Owner explicitly authorizes A08-P3 IMPLEMENT
```

After Owner IMPLEMENT GO: implement IC-P3-ORCH-1, IC-P3-LABOR-IDEM-1, IC-TEST-P3-1 per DF.

**Do not** start P4 · Phase 2E corpus · S10.

---

## 13. Arch review conclusion

| Verdict | Value |
|---------|-------|
| **Architecture alignment** | **PASS** |
| **SSOT conflict** | **NONE** |
| **Required fixes** | **IC-P3-ORCH-1 · IC-P3-LABOR-IDEM-1 · IC-TEST-P3-1** |
| **Implementation** | **NOT AUTHORIZED** |

Companion DF: [`IK-AUTONOMY-08-P3-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P3-DESIGN-FREEZE.md)

---

*End of Architecture Review.*
