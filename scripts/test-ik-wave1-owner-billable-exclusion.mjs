/**
 * IK-CLOSURE-WAVE1 — Owner-gated billable exclusion CONNECT tests (A–H).
 * npx vite-node scripts/test-ik-wave1-owner-billable-exclusion.mjs
 *
 * ZERO Research HTTP · ZERO Finance/G3 write · ZERO Catalog mutation
 */
import {
  runFullTenderWalk,
  projectLineWalkState,
  projectIkReadiness,
  IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
  emptyOwnerBillableScopeExclusionSidecar,
  isOwnerApprovedBillableScopeExclusion,
  listOwnerApprovedExcludedLineIds,
  upsertOwnerBillableScopeExclusion,
} from "../src/lib/intelligent-estimator/full-tender-walk/index.ts";
import { isIkReadyToBid } from "../src/lib/intelligent-estimator/evaluate-ik-g3-persist-ready.ts";
import {
  resolveIkP5LaborExecuteResearch,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  computeShadowPositionCostsForOfferBoq,
  isShadowNonBillableSkipStatus,
} from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { evaluateBidCutoverGate } from "../src/lib/tender-position-cost/bid-position-cost-cutover.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const TENDER_ID = "08df13e8-7dd5-75c2-db89-6a0001bc41a4";
const LINE_HOLD = "line-lp25-hold";
const LINE_SOFT = "line-soft-hold";
const LINE_OK = "line-ok";

// ——— A. HOLD ≠ COMPLETE ≠ STOP ———
{
  const projected = projectLineWalkState({
    lineId: LINE_HOLD,
    labor: {
      lineId: LINE_HOLD,
      bucket: "LABOR",
      rateStatus: "MISS",
      identity: { status: "AMBIGUOUS" },
      matchConfidence: 0.2,
      classify: { allowLaborResearch: false },
    },
  });
  ok("A_hold_not_complete", projected.status === "IDENTITY_HOLD");
  ok("A_hold_blocker", projected.blocker != null);

  const walk = runFullTenderWalk({
    tenderId: TENDER_ID,
    lines: [
      { lineId: LINE_HOLD, lp: "25" },
      { lineId: LINE_OK, lp: "1" },
    ],
    labor: {
      status: "ready",
      lines: [
        {
          lineId: LINE_HOLD,
          bucket: "LABOR",
          rateStatus: "MISS",
          identity: { status: "AMBIGUOUS" },
          classify: { allowLaborResearch: false },
          candidate: null,
          researchKey: null,
        },
        {
          lineId: LINE_OK,
          bucket: "LABOR",
          rateStatus: "CURRENT_HIT",
          identity: { status: "OK" },
          classify: { allowLaborResearch: true },
          candidate: null,
          researchKey: null,
        },
      ],
    },
    material: null,
    executeResearchPermission: true,
    persist: false,
  });
  ok("A_hold_does_not_stop", walk.linesVisited === 2 && walk.silentSkips === 0);
  ok(
    "A_hold_not_position_complete",
    walk.ledger.lines.find((l) => l.lineId === LINE_HOLD)?.status === "IDENTITY_HOLD"
      && walk.ledger.counts.complete === 0,
  );
}

// ——— B + C. Owner exclusion admission ———
{
  ok(
    "C_no_approval_false",
    isOwnerApprovedBillableScopeExclusion({
      tenderId: TENDER_ID,
      lineId: LINE_HOLD,
      ownerApproved: false,
      reason: IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
    }) === false,
  );
  ok(
    "C_missing_approval_false",
    isOwnerApprovedBillableScopeExclusion({
      tenderId: TENDER_ID,
      lineId: LINE_HOLD,
      reason: IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
    }) === false,
  );

  let sidecar = emptyOwnerBillableScopeExclusionSidecar("2026-09-24T12:00:00.000Z");
  sidecar = upsertOwnerBillableScopeExclusion({
    sidecar,
    tenderId: TENDER_ID,
    lineId: LINE_HOLD,
    ownerApproved: true,
    approvedBy: "owner-test",
    notes: "LP25 knowledge HOLD — exclude from current billable",
    nowIso: "2026-09-24T12:00:00.000Z",
  });
  const ids = listOwnerApprovedExcludedLineIds({
    sidecar,
    tenderId: TENDER_ID,
  });
  ok("B_approved_listed", ids.includes(LINE_HOLD) && ids.length === 1, ids);
}

// ——— B/E/F. FTO + cutover with exclusion ———
{
  let sidecar = emptyOwnerBillableScopeExclusionSidecar();
  sidecar = upsertOwnerBillableScopeExclusion({
    sidecar,
    tenderId: TENDER_ID,
    lineId: LINE_HOLD,
    ownerApproved: true,
    nowIso: "2026-09-24T12:00:00.000Z",
  });
  const excluded = listOwnerApprovedExcludedLineIds({
    sidecar,
    tenderId: TENDER_ID,
  });

  const walk = runFullTenderWalk({
    tenderId: TENDER_ID,
    lines: [
      { lineId: LINE_HOLD, lp: "25", description: "LP25 HOLD" },
      { lineId: LINE_SOFT, lp: "99", description: "soft HOLD" },
      { lineId: LINE_OK, lp: "1", description: "priced" },
    ],
    labor: {
      status: "ready",
      lines: [
        {
          lineId: LINE_HOLD,
          bucket: "LABOR",
          rateStatus: "MISS",
          identity: { status: "OK" },
          classify: { allowLaborResearch: true },
          candidate: null,
          researchKey: null,
        },
        {
          lineId: LINE_SOFT,
          bucket: "LABOR",
          rateStatus: "MISS",
          identity: { status: "AMBIGUOUS" },
          classify: { allowLaborResearch: false },
          candidate: null,
          researchKey: null,
        },
        {
          lineId: LINE_OK,
          bucket: "LABOR",
          rateStatus: "CURRENT_HIT",
          identity: { status: "OK" },
          classify: { allowLaborResearch: true },
          candidate: null,
          researchKey: null,
        },
      ],
    },
    material: null,
    executeResearchPermission: true,
    persist: false,
    ownerExcludedLineIds: excluded,
    positionCompleteByLineId: { [LINE_OK]: true },
  });

  const holdEx = walk.ledger.lines.find((l) => l.lineId === LINE_HOLD);
  ok(
    "B_fto_owner_exception",
    holdEx?.status === "OWNER_EXCEPTION"
      && holdEx?.blocker === "EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE",
    holdEx,
  );
  ok(
    "B_exclusion_not_complete",
    holdEx?.status !== "POSITION_COMPLETE"
      && walk.ledger.counts.complete === 1,
    walk.ledger.counts,
  );
  ok("F_exclusion_visible_in_ledger", walk.ledger.counts.ownerException >= 1);

  const soft = walk.ledger.lines.find((l) => l.lineId === LINE_SOFT);
  ok("D_soft_hold_not_auto_excluded", soft?.status === "IDENTITY_HOLD", soft);

  const readiness = projectIkReadiness({
    item: { id: TENDER_ID },
    ledger: walk.ledger,
    p7: null,
    financeOk: false,
  });
  ok("F_readiness_partial_visible", readiness.partial === true || readiness.readyToBid === false);
  ok(
    "G_finance_not_bypassed",
    isIkReadyToBid({
      item: { id: TENDER_ID },
      p7: {
        gapLineCount: 0,
        billableLineCount: 1,
        completeLineCount: 1,
        packageGatePass: true,
        cutoverGatePass: true,
        recommendedBidPln: 100,
        bidOk: true,
      },
      financeOk: false,
    }) === false,
  );

  // Shadow + cutover (empty catalog — gaps on billable OK line expected)
  const store = normalizeWorkCatalogStore({});
  const doc = {
    lines: [
      {
        lineId: LINE_HOLD,
        lp: "25",
        description: "LP25",
        quantity: 1,
        unit: "szt",
        isNoise: false,
      },
      {
        lineId: LINE_SOFT,
        lp: "99",
        description: "soft",
        quantity: 1,
        unit: "szt",
        isNoise: false,
      },
      {
        lineId: LINE_OK,
        lp: "1",
        description: "ok",
        quantity: 1,
        unit: "mb",
        isNoise: false,
        catalogWorkId: "cw.test",
      },
    ],
  };
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc,
    store,
    nowMs: Date.now(),
    tenderId: TENDER_ID,
    ownerExcludedLineIds: excluded,
  });
  const exRow = shadow.lines.find((l) => l.lineId === LINE_HOLD);
  ok(
    "E_shadow_owner_skip",
    exRow?.identity.status === "OWNER_SCOPE_HOLD_SKIP"
      && exRow?.positionComplete === false
      && isShadowNonBillableSkipStatus(exRow.identity.status),
    exRow?.identity,
  );
  ok(
    "E_aggregate_skip_count",
    shadow.aggregates.skippedOwnerScopeHoldCount === 1,
    shadow.aggregates,
  );

  const gate = evaluateBidCutoverGate(shadow);
  ok(
    "E_cutover_not_billable",
    gate.skippedOwnerScopeHoldCount === 1
      && !shadow.lines
        .filter((l) => l.identity.status === "OWNER_SCOPE_HOLD_SKIP")
        .some(() => false),
    gate,
  );
  // Soft HOLD still contributes to billable/gap — not auto-excluded
  const softRow = shadow.lines.find((l) => l.lineId === LINE_SOFT);
  ok(
    "D_soft_still_billable_identity",
    softRow?.identity.status !== "OWNER_SCOPE_HOLD_SKIP"
      && softRow?.identity.status !== "NOISE_SKIP",
    softRow?.identity?.status,
  );
  ok(
    "E_excluded_does_not_inflate_as_priced",
    gate.completeLineCount === 0
      || !shadow.lines.some(
        (l) =>
          l.identity.status === "OWNER_SCOPE_HOLD_SKIP" && l.positionComplete === true,
      ),
  );
}

// ——— H. Research permission A08-P2 unchanged ———
{
  ok(
    "H_research_entry_labor_auto",
    resolveIkP5LaborExecuteResearch({
      ikEntryEnabled: true,
      ikLaborE2eEnabled: true,
    }) === true,
  );
  ok(
    "H_research_off_when_labor_off",
    resolveIkP5LaborExecuteResearch({
      ikEntryEnabled: true,
      ikLaborE2eEnabled: false,
    }) === false,
  );
  ok(
    "H_research_off_when_entry_off",
    resolveIkP5LaborExecuteResearch({
      ikEntryEnabled: false,
      ikLaborE2eEnabled: true,
    }) === false,
  );
}

console.log(`\nWAVE1 exclusion tests: ${passed} PASS · ${failed} FAIL`);
if (failed > 0) process.exit(1);
