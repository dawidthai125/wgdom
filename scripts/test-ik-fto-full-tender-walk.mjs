/**
 * IK Full-Tender Orchestrator — unit + integration (OD-FTO-1…8).
 * npx vite-node scripts/test-ik-fto-full-tender-walk.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  runFullTenderWalk,
  projectLineWalkState,
  scheduleLineResearch,
  researchCtaIsNotExecution,
  projectIkReadiness,
  buildAthClassificationKpi,
  buildIkAnalysisCompletenessKpi,
  resolveIkG3UiSourceLabel,
  formatIkG3FinalBidStatusIsolatedPl,
  upsertTenderWalkLedger,
  getTenderWalkLedger,
  emptyIkFullWalkLedgerStore,
  normalizeIkFullWalkLedgerStore,
  IK_FULL_TENDER_WALK_LEDGER_KEY,
} from "../src/lib/intelligent-estimator/full-tender-walk/index.ts";
import { isIkReadyToBid } from "../src/lib/intelligent-estimator/evaluate-ik-g3-persist-ready.ts";

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

const TENDER_ID = "08df0363-7b22-e462-ab56-940001283cba";

// ——— Line HOLD ≠ tender stop ———
{
  const lines = Array.from({ length: 56 }, (_, i) => ({
    lineId: `line-${i + 1}`,
    lp: String(i + 1),
    description: i === 0 ? "HOLD identity" : `Line ${i + 1}`,
  }));
  const laborLines = lines.map((l, i) => ({
    lineId: l.lineId,
    description: l.description,
    unit: "szt",
    bucket: "LABOR",
    rateStatus: i === 0 ? "MISS" : "CURRENT_HIT",
    catalogWorkId: i === 0 ? null : `cw-${i}`,
    identity: i === 0
      ? { status: "AMBIGUOUS" }
      : { status: "OK" },
    classify: { allowLaborResearch: i !== 0 },
    candidate: null,
    researchKey: null,
    matchConfidence: 0.9,
  }));
  const walk = runFullTenderWalk({
    tenderId: TENDER_ID,
    lines,
    labor: { lines: laborLines, status: "ready" },
    material: null,
    executeResearchPermission: true,
    persist: false,
    nowIso: "2026-09-22T10:00:00.000Z",
    walkId: "walk-test-hold",
  });
  ok("hold_does_not_stop_tender", walk.linesVisited === 56 && walk.silentSkips === 0, walk);
  ok("hold_line_status", walk.ledger.lines[0].status === "IDENTITY_HOLD", walk.ledger.lines[0]);
  ok("other_lines_continue", walk.ledger.lines.slice(1).every((l) => l.status !== "NOT_STARTED"), walk.ledger.counts);
  ok("partial_semantics", walk.ledger.tenderStatus === "TENDER_PARTIAL", walk.ledger.tenderStatus);
}

// ——— Research auto-trigger + CTA ≠ execution ———
{
  const auto = scheduleLineResearch({
    labor: {
      rateStatus: "MISS",
      classify: { allowLaborResearch: true },
      candidate: null,
      researchKey: null,
    },
    executeResearchPermission: true,
  });
  ok("research_auto_should_execute", auto.shouldExecuteResearch === true && auto.outcome === "RESEARCH_REQUIRED", auto);

  const blocked = scheduleLineResearch({
    labor: {
      rateStatus: "MISS",
      classify: { allowLaborResearch: false },
      candidate: null,
      researchKey: null,
    },
    executeResearchPermission: true,
  });
  ok("research_blocked_by_identity", blocked.outcome === "RESEARCH_BLOCKED_BY_IDENTITY" && !blocked.shouldExecuteResearch, blocked);

  const ctaOnly = scheduleLineResearch({
    labor: {
      rateStatus: "MISS",
      classify: { allowLaborResearch: true },
      candidate: null,
      researchKey: null,
    },
    executeResearchPermission: false,
  });
  ok("cta_permission_off_required_not_executed", ctaOnly.outcome === "RESEARCH_REQUIRED" && !ctaOnly.shouldExecuteResearch, ctaOnly);
  ok(
    "cta_is_not_execution",
    researchCtaIsNotExecution(true, "RESEARCH_EXECUTED", false) === false,
  );
  ok(
    "executed_with_actual_run",
    researchCtaIsNotExecution(true, "RESEARCH_EXECUTED", true) === true,
  );
}

// ——— Price persistence projection (evidenceRefs when candidate) ———
{
  const walk = runFullTenderWalk({
    tenderId: TENDER_ID,
    lines: [{ lineId: "obl_price", lp: "1", description: "Gładź" }],
    labor: {
      lines: [{
        lineId: "obl_price",
        description: "Gładź",
        unit: "m2",
        bucket: "LABOR",
        rateStatus: "MISS",
        catalogWorkId: null,
        identity: { status: "OK" },
        classify: { allowLaborResearch: true },
        candidate: { priceNet: 26.64 },
        researchKey: "rk-gladzie",
        matchConfidence: 0.8,
      }],
      status: "ready",
    },
    material: null,
    executeResearchPermission: true,
    persist: false,
    nowIso: "2026-09-22T10:00:00.000Z",
  });
  const entry = walk.ledger.lines[0];
  ok("r15_evidence_refs_on_candidate", entry.evidenceRefs.some((r) => r.startsWith("candidate:")), entry.evidenceRefs);
  ok("r15_research_executed_outcome", entry.researchOutcome === "RESEARCH_EXECUTED", entry.researchOutcome);
}

// ——— Ledger persistence ———
{
  const store0 = emptyIkFullWalkLedgerStore("2026-09-22T10:00:00.000Z");
  const ledger = {
    tenderId: TENDER_ID,
    walkId: "walk-persist",
    startedAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
    tenderStatus: "TENDER_PARTIAL",
    lines: [{
      tenderId: TENDER_ID,
      lineId: "l1",
      stage: "identity",
      status: "IDENTITY_HOLD",
      startedAt: "2026-09-22T10:00:00.000Z",
      completedAt: "2026-09-22T10:00:00.000Z",
      updatedAt: "2026-09-22T10:00:00.000Z",
      inputFingerprint: "l1|",
      outputFingerprint: "IDENTITY_HOLD|RESEARCH_BLOCKED_BY_IDENTITY",
      evidenceRefs: [],
      blocker: "IDENTITY_AMBIGUOUS_OR_UNRESOLVED",
      nextAction: "owner_g1_or_resolve_identity",
      researchOutcome: "RESEARCH_BLOCKED_BY_IDENTITY",
    }],
    counts: {
      total: 1, visited: 1, complete: 0, hold: 1,
      researchBlocked: 1, dataBlock: 0, ownerException: 0, conflict: 0,
    },
  };
  const next = upsertTenderWalkLedger(ledger, store0);
  ok("ledger_key_constant", IK_FULL_TENDER_WALK_LEDGER_KEY === "kw-ik-full-tender-walk-ledger");
  ok("ledger_upsert_readable", getTenderWalkLedger(TENDER_ID, next)?.lines.length === 1);
  const merged = normalizeIkFullWalkLedgerStore(JSON.parse(JSON.stringify(next)));
  ok("ledger_normalize_roundtrip", merged.byTenderId[TENDER_ID]?.walkId === "walk-persist");
}

// ——— G3 isolation ———
{
  const ownerHist = {
    schemaVersion: 1,
    kind: "ik_g3_final_bid",
    tenderPipelineId: TENDER_ID,
    source: "owner_g3",
    ownerOverride: true,
    netPln: 159000,
    vatPln: 36570,
    grossPln: 195570,
    vatRate: 0.23,
    approvedAt: "2026-08-31T12:00:00.000Z",
    caseLabel: "CHROBREGO_OWNER",
  };
  const label = resolveIkG3UiSourceLabel({
    record: ownerHist,
    currentWalkStartedAt: "2026-09-22T10:00:00.000Z",
  });
  ok("g3_historical_owner_override", label === "HISTORICAL_OWNER_DECISION", label);
  const iso = formatIkG3FinalBidStatusIsolatedPl(ownerHist, {
    currentWalkStartedAt: "2026-09-22T10:00:00.000Z",
  });
  ok(
    "g3_never_ik_calculated_when_owner",
    !!iso && iso.includes("OWNER OVERRIDE") && !iso.includes("IK CALCULATED") && iso.includes("HISTORICAL"),
    iso,
  );
  ok("g3_isolated_formatter", iso?.includes("OWNER OVERRIDE") && iso?.includes("HISTORICAL"), iso);
}

// ——— Readiness / READY_TO_BID / partial ———
{
  const ledgerPartial = {
    tenderId: TENDER_ID,
    walkId: "w",
    startedAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
    tenderStatus: "TENDER_PARTIAL",
    lines: [],
    counts: {
      total: 56, visited: 56, complete: 40, hold: 0,
      researchBlocked: 8, dataBlock: 5, ownerException: 3, conflict: 0,
    },
  };
  const item = {
    id: TENDER_ID,
    bzpNumber: "SZPU.281.19.2026",
    title: "Chrobrego 34a",
    ikFinalBid: {
      schemaVersion: 1,
      kind: "ik_g3_final_bid",
      tenderPipelineId: TENDER_ID,
      source: "owner_g3",
      ownerOverride: true,
      netPln: 159000,
      vatPln: 36570,
      grossPln: 195570,
      vatRate: 0.23,
      approvedAt: "2026-08-31T12:00:00.000Z",
    },
  };
  const p7Fail = {
    gapLineCount: 16,
    packageGatePass: false,
    cutoverGatePass: false,
    billableLineCount: 40,
    completeLineCount: 40,
    recommendedBidPln: 100000,
    bidOk: false,
  };
  const proj = projectIkReadiness({
    item,
    expert: {
      status: "ready",
      masterBoq: { status: "ready", readyForExperts: true },
      expertAdmission: {
        documentStatus: "ready",
        readyForExperts: true,
        globalIntegrityBlocker: false,
        expertChainMayProceed: true,
        admittedCount: 40,
        unresolvedCount: 16,
        skippedCount: 0,
        lines: [],
      },
    },
    p7: p7Fail,
    risk: null,
    ledger: ledgerPartial,
    currentWalkStartedAt: "2026-09-22T10:00:00.000Z",
  });
  ok("partial_ready_to_bid_no", proj.readyToBid === false, proj);
  ok(
    "partial_or_finance_failed",
    proj.tenderStatus === "TENDER_PARTIAL" || proj.tenderStatus === "TENDER_FINANCE_FAILED",
    proj.tenderStatus,
  );
  ok("g3_does_not_bypass_ready", isIkReadyToBid({
    item,
    expert: {
      status: "ready",
      masterBoq: { status: "ready", readyForExperts: true },
      expertAdmission: {
        documentStatus: "ready",
        readyForExperts: true,
        globalIntegrityBlocker: false,
        expertChainMayProceed: false,
        admittedCount: 0,
        unresolvedCount: 16,
        skippedCount: 0,
        lines: [],
      },
    },
    p7: p7Fail,
  }) === false);
}

// ——— KPI split ———
{
  const ath = buildAthClassificationKpi(55, 56);
  ok("ath_kpi_98", ath.pct === 98 && ath.kind === "ATH_CLASSIFICATION_PCT", ath);
  const ik = buildIkAnalysisCompletenessKpi({
    tenderId: TENDER_ID,
    walkId: "w",
    startedAt: "x",
    updatedAt: "x",
    tenderStatus: "TENDER_PARTIAL",
    lines: [],
    counts: {
      total: 56, visited: 56, complete: 40, hold: 0,
      researchBlocked: 0, dataBlock: 0, ownerException: 0, conflict: 0,
    },
  });
  ok("ik_kpi_not_confused_with_ath", ik.completePct === 71 && ik.kind === "IK_ANALYSIS_COMPLETENESS_PCT", ik);
  ok("ik_disclaimer", ik.disclaimerPl.includes("ATH classification"), ik.disclaimerPl);
}

// ——— Line projection matrix ———
{
  const amb = projectLineWalkState({
    lineId: "a",
    labor: {
      lineId: "a",
      bucket: "LABOR",
      rateStatus: "MISS",
      identity: { status: "AMBIGUOUS" },
      matchConfidence: 0.2,
      classify: { allowLaborResearch: false },
    },
    allowLaborResearch: false,
  });
  ok("project_ambiguous_identity_hold", amb.status === "IDENTITY_HOLD", amb);

  const complete = projectLineWalkState({
    lineId: "c",
    labor: {
      lineId: "c",
      bucket: "LABOR",
      rateStatus: "CURRENT_HIT",
      identity: { status: "OK" },
      matchConfidence: 0.95,
      classify: { allowLaborResearch: true },
    },
    positionComplete: true,
  });
  ok("project_position_complete_from_p7_signal", complete.status === "POSITION_COMPLETE", complete);
}

// ——— researchShouldExecuteLineIds CONNECT contract ———
{
  const walk = runFullTenderWalk({
    tenderId: TENDER_ID,
    lines: [
      { lineId: "need-r", lp: "1", description: "MISS research" },
      { lineId: "ok-hit", lp: "2", description: "HIT" },
    ],
    labor: {
      status: "ready",
      lines: [
        {
          lineId: "need-r",
          description: "MISS research",
          unit: "m2",
          bucket: "LABOR",
          rateStatus: "MISS",
          catalogWorkId: null,
          identity: { status: "OK" },
          classify: { allowLaborResearch: true },
          candidate: null,
          researchKey: null,
          matchConfidence: 0.9,
        },
        {
          lineId: "ok-hit",
          description: "HIT",
          unit: "m2",
          bucket: "LABOR",
          rateStatus: "CURRENT_HIT",
          catalogWorkId: "cw-2",
          identity: { status: "OK" },
          classify: { allowLaborResearch: true },
          candidate: null,
          researchKey: null,
          matchConfidence: 0.9,
        },
      ],
    },
    material: null,
    executeResearchPermission: true,
    persist: false,
    positionCompleteByLineId: { "ok-hit": true },
  });
  ok(
    "research_should_execute_ids",
    walk.researchShouldExecuteLineIds.includes("need-r")
      && !walk.researchShouldExecuteLineIds.includes("ok-hit"),
    walk.researchShouldExecuteLineIds,
  );
  ok(
    "position_complete_wired",
    walk.ledger.lines.find((l) => l.lineId === "ok-hit")?.status === "POSITION_COMPLETE",
    walk.ledger.lines,
  );
}

// ——— Orchestra CONNECT / cloud DATA_KEY smoke (source · no UI OD-FTO) ———
{
  const orchestra = readFileSync(
    resolve("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"),
    "utf8",
  );
  ok("connect_run_full_tender_walk", orchestra.includes("runFullTenderWalk"));
  ok(
    "connect_research_should_execute",
    orchestra.includes("researchShouldExecuteLineIds")
      && orchestra.includes("fto_research_required"),
  );
  ok(
    "connect_continuation_arm",
    orchestra.includes("planIkContinuationResearchArm")
      && orchestra.includes("scheduleManyIkContinuations"),
  );
  ok(
    "connect_p7_position_complete",
    orchestra.includes("positionCompleteByLineId")
      && orchestra.includes("positionComplete"),
  );
  ok("connect_exposes_readiness", orchestra.includes("readinessProjection"));
  const cloud = readFileSync(resolve("src/lib/cloud-sync.ts"), "utf8");
  ok(
    "cloud_fto_ledger_key",
    cloud.includes("kw-ik-full-tender-walk-ledger")
      && cloud.includes("mergeIkFullWalkLedgerDataKey"),
  );
  const types = readFileSync(
    resolve("src/lib/intelligent-estimator/orchestra/orchestra-types.ts"),
    "utf8",
  );
  ok("types_full_tender_walk_field", types.includes("fullTenderWalk:"));
}

console.log(`\nIK_FTO_UNIT_INTEGRATION ${failed === 0 ? "PASS" : "FAIL"} ${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
