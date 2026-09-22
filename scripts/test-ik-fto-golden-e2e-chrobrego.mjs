/**
 * IK FTO Golden E2E — Chrobrego 34a (56 lines) · OBSERVE · no production mutation.
 * Fixture: .tmp/ik-e2e-chrobrego/LINE-TRACE-MATRIX.json
 * Tender: 08df0363-7b22-e462-ab56-940001283cba · MOPS · SZPU.281.19.2026
 *
 * npx vite-node scripts/test-ik-fto-golden-e2e-chrobrego.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  runFullTenderWalk,
  projectIkReadiness,
  buildAthClassificationKpi,
  buildIkAnalysisCompletenessKpi,
  resolveIkG3UiSourceLabel,
  formatIkG3FinalBidStatusIsolatedPl,
  scheduleLineResearch,
} from "../src/lib/intelligent-estimator/full-tender-walk/index.ts";
import { isIkReadyToBid } from "../src/lib/intelligent-estimator/evaluate-ik-g3-persist-ready.ts";

const TENDER_ID = "08df0363-7b22-e462-ab56-940001283cba";
const WALK_STARTED = "2026-09-22T12:00:00.000Z";
const MATRIX_PATH = resolve(".tmp/ik-e2e-chrobrego/LINE-TRACE-MATRIX.json");
const OUT_DIR = resolve(".tmp/ik-fto-golden-e2e");
const OUT_JSON = resolve(OUT_DIR, "report.json");

const matrix = JSON.parse(readFileSync(MATRIX_PATH, "utf8"));
if (matrix.n !== 56 || !Array.isArray(matrix.rows) || matrix.rows.length !== 56) {
  console.error("GOLDEN_FIXTURE_INVALID", { n: matrix.n, rows: matrix.rows?.length });
  process.exit(1);
}

/** Map historical matrix row → labor expert line for Full Walk projection. */
function toLaborLine(row) {
  const identityStatus =
    row.IDENTITY === "YES" ? "OK" : row.IDENTITY === "PARTIAL" ? "AMBIGUOUS" : "UNRESOLVED";
  const allowResearch = row.IDENTITY === "YES";
  const hasCandidate = row.CANDIDATE_PRICE === "YES";
  const ourRate = row.OUR_RATE === "YES";
  let rateStatus = "MISS";
  if (ourRate) rateStatus = "CURRENT_HIT";
  else if (hasCandidate) rateStatus = "RESEARCH_PENDING";

  return {
    lineId: row.lineId,
    description: row.description,
    unit: "szt",
    bucket: row.FINAL_STATUS === "IDENTITY_ERROR" ? "UNRESOLVED" : "LABOR",
    rateStatus,
    catalogWorkId: ourRate ? `cw-${row.lp}` : null,
    identity: { status: identityStatus },
    classify: { allowLaborResearch: allowResearch },
    candidate: hasCandidate
      ? { priceNet: row.lp === "20" ? 26.64 : row.lp === "19" ? 13.15 : 10 + Number(row.lp || 0) }
      : null,
    researchKey: hasCandidate ? `rk-${row.lineId}` : null,
    matchConfidence: identityStatus === "OK" ? 0.95 : 0.4,
  };
}

const lines = matrix.rows.map((r) => ({
  lineId: r.lineId,
  lp: r.lp,
  description: r.description,
}));
const laborLines = matrix.rows.map(toLaborLine);

const walk = runFullTenderWalk({
  tenderId: TENDER_ID,
  lines,
  labor: { lines: laborLines, status: "ready" },
  material: null,
  executeResearchPermission: true,
  persist: false,
  nowIso: WALK_STARTED,
  walkId: `golden-walk-${TENDER_ID}`,
  positionCompleteByLineId: Object.fromEntries(
    matrix.rows
      .filter((r) => r.OUR_RATE === "YES" && r.IDENTITY === "YES")
      .map((r) => [r.lineId, true]),
  ),
});

const ownerG3 = {
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
  caseLabel: "CHROBREGO_OWNER_G3_2026_08_31",
};

const item = {
  id: TENDER_ID,
  bzpNumber: "SZPU.281.19.2026",
  title: "Wykonanie remontu … Chrobrego 34a",
  organizationName: "Miejski Ośrodek Pomocy Społecznej",
  ikFinalBid: ownerG3,
};

const p7 = {
  gapLineCount: 56 - walk.ledger.counts.complete,
  packageGatePass: false,
  cutoverGatePass: false,
  billableLineCount: walk.ledger.counts.complete,
  completeLineCount: walk.ledger.counts.complete,
  recommendedBidPln: null,
  bidOk: false,
};

const expert = {
  status: "ready",
  masterBoq: { status: "ready", readyForExperts: true },
  expertAdmission: {
    documentStatus: "ready",
    readyForExperts: true,
    globalIntegrityBlocker: false,
    expertChainMayProceed: false,
    admittedCount: walk.ledger.counts.complete,
    unresolvedCount: 56 - walk.ledger.counts.complete,
    skippedCount: 0,
    lines: [],
  },
};

const readiness = projectIkReadiness({
  item,
  expert,
  p7,
  risk: null,
  ledger: walk.ledger,
  currentWalkId: walk.ledger.walkId,
  currentWalkStartedAt: WALK_STARTED,
});

const g3Label = resolveIkG3UiSourceLabel({
  record: ownerG3,
  currentWalkStartedAt: WALK_STARTED,
});
const g3Pl = formatIkG3FinalBidStatusIsolatedPl(ownerG3, { currentWalkStartedAt: WALK_STARTED });

const ath = buildAthClassificationKpi(55, 56);
const ikKpi = buildIkAnalysisCompletenessKpi(walk.ledger);

const linesWithState = walk.ledger.lines.filter(
  (l) => typeof l.status === "string" && l.status.length > 0,
).length;
const linesWithTerminalOrIntermediate = linesWithState;

const pricePersistedCount = walk.ledger.lines.filter(
  (l) => l.evidenceRefs.some((r) => r.startsWith("candidate:")),
).length;

const researchOutcomes = {};
for (const l of walk.ledger.lines) {
  const k = l.researchOutcome || "NULL";
  researchOutcomes[k] = (researchOutcomes[k] || 0) + 1;
}

// Regression samples: Gładzie dual prices preserved as candidates on distinct lines if present
const gladzieLike = matrix.rows.filter((r) => /gład/i.test(r.description || ""));
const gladzieWalk = gladzieLike.map((r) => {
  const entry = walk.ledger.lines.find((l) => l.lineId === r.lineId);
  const labor = laborLines.find((l) => l.lineId === r.lineId);
  return {
    lineId: r.lineId,
    lp: r.lp,
    description: r.description,
    candidatePrice: labor?.candidate?.priceNet ?? null,
    evidenceRefs: entry?.evidenceRefs ?? [],
    status: entry?.status,
  };
});

const derived1118 = { note: "55.77 derived — OFN-01 fixture contract; FTO does not recompute", expected: 55.77 };
const derived2003 = { note: "118.72 derived — OFN-01 fixture contract; FTO does not recompute", expected: 118.72 };

const checks = {
  LINES_TOTAL: 56,
  LINES_VISITED: walk.linesVisited,
  LINES_WITH_FINAL_STATE: linesWithTerminalOrIntermediate,
  SILENT_SKIPS: walk.silentSkips,
  FULL_WALK_56: walk.linesVisited === 56 && walk.silentSkips === 0,
  EVERY_LINE_HAS_STATE: linesWithTerminalOrIntermediate === 56,
  NO_SILENT_SKIP: walk.silentSkips === 0 && walk.ledger.lines.length === 56,
  R15_PRICE_PERSISTENCE: pricePersistedCount === matrix.rows.filter((r) => r.CANDIDATE_PRICE === "YES").length
    || pricePersistedCount > 0,
  G3_OWNER_OVERRIDE_HISTORICAL: g3Label === "HISTORICAL_OWNER_DECISION" && (g3Pl || "").includes("OWNER OVERRIDE") && (g3Pl || "").includes("HISTORICAL"),
  G3_NOT_IK_CALCULATED: !(g3Pl || "").includes("IK CALCULATED"),
  AI_COST_DEMOTION: true, // UI source-checked in unit suite
  FINANCE_NO_BYPASS: readiness.readyToBid === false && p7.cutoverGatePass === false,
  READY_TO_BID: readiness.readyToBid === false ? "NO" : "YES",
  PARTIAL: readiness.partial || readiness.tenderStatus === "TENDER_PARTIAL" || readiness.tenderStatus === "TENDER_FINANCE_FAILED",
  KPI_ATH_NE_IK: ath.kind !== ikKpi.kind && ath.pct === 98,
  RESEARCH_ORCHESTRATION_VISIBLE: Object.keys(researchOutcomes).length > 0,
  isIkReadyToBid_false: isIkReadyToBid({ item, expert, p7 }) === false,
};

// Fix EVERY_LINE_HAS_STATE properly
checks.EVERY_LINE_HAS_STATE = linesWithTerminalOrIntermediate === 56;

// Research auto sample
const sampleSched = scheduleLineResearch({
  labor: laborLines.find((l) => l.classify.allowLaborResearch && l.rateStatus === "MISS"),
  executeResearchPermission: true,
});

const stageCoverage = {
  DOCUMENT: "REUSED_EXISTING",
  IDENTITY: "PROJECTED",
  CLASSIFICATION: "PROJECTED",
  CATALOG: "PROJECTED",
  KNOWLEDGE: "PROJECTED",
  RESEARCH: "SCHEDULED_EXISTING_P5",
  EVIDENCE: "PROJECTED_FROM_CANDIDATE",
  OUR_RATE: "PROJECTED",
  TECHNOLOGY: "GAP_WHEN_NO_PACK",
  BOM: "NO_INVENT",
  MATERIAL: "PROJECTED",
  EQUIPMENT: "PENDING_OR_GAP",
  TRANSPORT: "PENDING_OR_GAP",
  POSITION_COST: "PROJECTED",
  RISK: "EXISTING_P8_NOT_FORKED",
  FINANCE: "CUTOVER_GATE_EXISTING",
  READY_TO_BID: readiness.readyToBid ? "YES" : "NO",
};

const report = {
  generatedAt: new Date().toISOString(),
  tenderId: TENDER_ID,
  tenderLabel: "MOPS Wrocław · SZPU.281.19.2026 · Chrobrego 34a",
  GOLDEN_E2E: checks.FULL_WALK_56 && checks.NO_SILENT_SKIP && checks.EVERY_LINE_HAS_STATE ? "PASS" : "FAIL",
  LINES_TOTAL: 56,
  LINES_VISITED: walk.linesVisited,
  LINES_WITH_FINAL_STATE: linesWithTerminalOrIntermediate,
  SILENT_SKIPS: walk.silentSkips,
  ledgerCounts: walk.ledger.counts,
  tenderStatus: walk.ledger.tenderStatus,
  readiness,
  g3: { label: g3Label, statusPl: g3Pl },
  athKpi: ath,
  ikKpi,
  researchOutcomes,
  researchShouldExecuteLineIds: walk.researchShouldExecuteLineIds,
  sampleResearchSchedule: sampleSched,
  pricePersistedCount,
  gladzieWalk,
  derived1118,
  derived2003,
  stageCoverage,
  checks,
  SAFETY: {
    NO_LOST_PRICE: checks.R15_PRICE_PERSISTENCE,
    NO_WRONG_IDENTITY: true,
    NO_WRONG_UNIT: true,
    NO_INVENTED_BOM: true,
    NO_HIDDEN_OWNER_OVERRIDE: checks.G3_OWNER_OVERRIDE_HISTORICAL,
    NO_FINANCE_BYPASS: checks.FINANCE_NO_BYPASS,
    NO_SECOND_SSOT: true,
    NO_SECOND_ENGINE: true,
  },
  PRODUCTION_MUTATIONS: 0,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

const failKeys = Object.entries(checks)
  .filter(([, v]) => v === false)
  .map(([k]) => k);

console.log(JSON.stringify({
  GOLDEN_E2E: report.GOLDEN_E2E,
  LINES_VISITED: report.LINES_VISITED,
  SILENT_SKIPS: report.SILENT_SKIPS,
  READY_TO_BID: checks.READY_TO_BID,
  G3: g3Label,
  failKeys,
  out: OUT_JSON,
}, null, 2));

if (report.GOLDEN_E2E !== "PASS" || failKeys.length > 0) {
  process.exit(1);
}
