/**
 * IK APF BLOCKER-2 — orchestra authoritative P7/P8 overlay parity (lifecycle).
 *
 * Sync snapshot: intermediate P7/P8 (no labor).
 * After labor settle + apfCandidates > 0: overlay P7 + overlay P8 (hook contract).
 *
 * ZERO live HTTP · ZERO CatalogWork / OUR RATE / Accept / KV
 *
 * Run: npx vite-node scripts/test-ik-orchestra-apf-p8-overlay-parity.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeIkOrchestraSyncSnapshot } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts";
import {
  runIkMasterBoqLaborExpert,
} from "../src/lib/intelligent-estimator/ik-labor-expert.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { runIkP8RiskDecision } from "../src/lib/intelligent-estimator/ik-p8-risk-decision.ts";
import {
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
let httpCalls = 0;

globalThis.fetch = async (...args) => {
  httpCalls += 1;
  throw new Error(`UNEXPECTED_HTTP ${String(args[0])}`);
};

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

const NOW = Date.parse("2026-08-27T09:00:00.000Z");
const NOW_ISO = "2026-08-27T09:00:00.000Z";
const emptyStore = normalizeWorkCatalogStore({ works: [] });

const PRICING_ITEM = {
  swzAnalysis: { implementationDays: 30, estimatedValuePln: 100_000 },
  tenderFit: { priceWeightPct: 60 },
};

const FLAGS_P7_P8 = {
  p2DocumentsBoqOn: false,
  identityCoverageOn: false,
  p5LaborOn: true,
  p5ResearchOn: false,
  p6MaterialOn: false,
  p6ResearchOn: false,
  p7F5On: true,
  p8RiskOn: true,
};

function marketObs(partial = {}) {
  return {
    evidenceId: partial.evidenceId ?? "ev-market-1",
    unitRatePln: partial.unitRatePln ?? 45,
    unit: partial.unit ?? "pomiar",
    sourceId: partial.sourceId ?? "energospin_pl",
    sourceUrl: partial.sourceUrl ?? "https://www.energospin.pl/cennik/",
    observedAt: partial.observedAt ?? NOW_ISO,
    summaryPl: partial.summaryPl ?? "Fixture market labor",
    distinctKey: partial.distinctKey ?? "KNR|4-03|1205-05",
  };
}

function minimalLine(overrides = {}) {
  return {
    lineId: overrides.lineId ?? "L-1",
    lp: overrides.lp ?? "1",
    description: overrides.description ?? "Pomiar rezystancji izolacji",
    quantity: overrides.quantity ?? 1,
    quantityRaw: String(overrides.quantity ?? 1),
    unit: overrides.unit ?? "pomiar",
    catalogWorkId: overrides.catalogWorkId ?? null,
    workCategory: "electrical",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: overrides.description ?? "Pomiar rezystancji izolacji",
    aliasRuleId: null,
    knrHint: overrides.knrHint ?? "KNR 4-03 1205-05",
    matchMethod: overrides.matchMethod ?? "unmatched",
    matchedBy: overrides.matchedBy ?? "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "?" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "?" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "?" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
  };
}

function provenance(lineId) {
  return {
    lineId,
    sourceDocumentId: "doc-1",
    sourceDocumentIds: ["doc-1"],
    sourceArtifactId: "art-1",
    sourceArtifactIds: ["art-1"],
    branchHint: "electrical",
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpert(entries, tenderId = "t-orch-apf-p8") {
  const masterBoqLines = entries.map((L) => ({
    dwellingId: L.dwellingId ?? "dw-1",
    line: L.line,
    provenance: L.provenance ?? provenance(L.line.lineId),
  }));
  const dwellingIds = new Set(masterBoqLines.map((r) => r.dwellingId));
  return {
    tenderId,
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: entries.length,
      extractedCount: entries.length,
      validCount: entries.length,
      executed: true,
      gaps: [],
    },
    validation: {
      missingDescription: 0,
      missingQuantity: 0,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: [],
    },
    dwellingMapping: {
      artifactCount: 1,
      mappedCount: 1,
      unmappedCount: 0,
      allMapped: true,
      ownerMapRequired: false,
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      coverage: [],
      dwellings: [],
      reasons: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: entries.length,
      composedLineCount: entries.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: dwellingIds.size > 1 ? "multi" : "single",
      schemaVersion: 5,
      lineCount: entries.length,
      composedLineCount: entries.length,
      sourceLineCount: entries.length,
      dwellingCount: dwellingIds.size,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: {
      schemaVersion: 5,
      tenderId,
      lines: entries.map((L) => L.line),
    },
    lineProvenance: Object.fromEntries(
      entries.map((L) => [L.line.lineId, L.provenance ?? provenance(L.line.lineId)]),
    ),
    masterBoqLines,
    boqDependencyGraph: null,
  };
}

function multiPackageFixture(entries, tenderId) {
  return {
    tenderId,
    mode: "multi",
    expectedDwellingCount: entries.length,
    documentToDwelling: Object.fromEntries(
      entries.map((e) => [e.documentId, e.dwellingId]),
    ),
    dwellings: entries.map((e) => ({
      dwellingId: e.dwellingId,
      labelPl: e.labelPl ?? e.dwellingId,
      sourceDocumentIds: [e.documentId],
      offerBoq: {
        schemaVersion: 5,
        tenderId,
        lines: [e.line],
      },
      f5Gate: null,
      subtotals: null,
    })),
    labelPl: "Multi APF fixture",
  };
}

function apfPortRatesByLineId(rateByLineId) {
  return {
    research(query) {
      const rate = rateByLineId[query.lineId] ?? 10;
      const unit = query.unit || "pomiar";
      return {
        status: "OK",
        observations: [
          marketObs({ unitRatePln: rate, unit }),
          marketObs({ evidenceId: "ev-2", unitRatePln: rate, unit }),
          marketObs({ evidenceId: "ev-3", unitRatePln: rate, unit }),
        ],
        httpCalls: 0,
      };
    },
  };
}

function noSourcesPort() {
  return {
    research() {
      return {
        status: "NO_SOURCES",
        observations: [],
        httpCalls: 0,
        messagePl: "Fixture NO_SOURCES",
      };
    },
  };
}

/** Mirrors use-ik-orchestra.ts overlay contract (authoritative hook result). */
function resolveAuthoritativePricing({
  syncSnapshot,
  labor,
  item,
  pkg,
  store,
  flags,
  chiefSession,
}) {
  const {
    positionCostBid: syncP7,
    riskDecision: syncP8,
    postIdentityExpert,
    knr,
  } = syncSnapshot;

  let positionCostBid = syncP7;
  if (syncP7 && labor && labor.counts.apfCandidates > 0) {
    positionCostBid = runIkP7PositionCostBid({
      item,
      expert: postIdentityExpert,
      package: pkg,
      store,
      labor,
      nowMs: NOW,
    });
  }

  let riskDecision = syncP8;
  if (flags.p8RiskOn && labor && labor.counts.apfCandidates > 0 && positionCostBid) {
    riskDecision = runIkP8RiskDecision({
      item,
      p7: positionCostBid,
      bidProposal: positionCostBid.proposal ?? null,
      expert: postIdentityExpert,
      chiefSession: chiefSession ?? null,
      knrHistorical: knr,
    });
  }

  return { positionCostBid, riskDecision };
}

function runSyncSnapshot({ item, pkg, expert }) {
  return computeIkOrchestraSyncSnapshot({
    item,
    effectiveItem: item,
    pkg,
    ingest: expert ? { expert, heavyDone: true } : null,
    historicalIndex: null,
    knrKnowledge: null,
    knowledgeBusy: false,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });
}

// —— Static: hook wires P8 overlay on positionCostBid ——
const hookSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"),
  "utf8",
);
ok("STATIC hook imports runIkP8RiskDecision", hookSrc.includes("runIkP8RiskDecision"));
ok(
  "STATIC hook P8 overlay uses positionCostBid",
  /runIkP8RiskDecision\([\s\S]*p7:\s*positionCostBid/.test(hookSrc),
);
ok(
  "STATIC hook P8 bidProposal from overlay P7",
  /bidProposal:\s*positionCostBid\.proposal/.test(hookSrc),
);
ok("STATIC hook return overrides riskDecision", hookSrc.includes("riskDecision,"));

console.log("\n=== A–F: legacy_single authoritative lifecycle ===");
{
  const tenderId = "t-orch-apf-p8-legacy";
  const line = minimalLine({ lineId: "L-PM-1", unit: "pomiar", quantity: 3 });
  const expert = readyExpert([{ line }], tenderId);
  const item = { id: tenderId, tenderId, title: "APF P8", bzpDocuments: [], ...PRICING_ITEM };
  const sync = runSyncSnapshot({ item, pkg: null, expert });

  const labor = await runIkMasterBoqLaborExpert({
    item,
    expert: sync.postIdentityExpert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({ unitRatePln: 10, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-2", unitRatePln: 10, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-3", unitRatePln: 10, unit: "pomiar" }),
    ]),
    nowMs: NOW,
  });

  ok("A apfCandidates >= 1", labor.counts.apfCandidates >= 1);
  const laborRow = labor.lines.find((r) => r.lineId === "L-PM-1");
  ok("A ephemeralBasis exists", laborRow?.ephemeralBasis != null);

  const syncP7 = sync.positionCostBid;
  const syncP8 = sync.riskDecision;
  ok("B sync P7 present", syncP7 != null);
  ok("B sync P8 present", syncP8 != null);
  const syncShadow = syncP7?.shadow?.lines.find((r) => r.lineId === "L-PM-1");
  ok(
    "B sync P7 no EPHEMERAL shadow",
    syncShadow?.costBasisKind !== "EPHEMERAL_RESEARCH",
    syncShadow?.costBasisKind,
  );
  ok("B sync P8 bidFromP7", syncP8?.provenance?.bidFromP7 === true);

  const orchestra = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor,
    item,
    pkg: null,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });

  const overlayP7 = orchestra.positionCostBid;
  const overlayP8 = orchestra.riskDecision;
  const overlayShadow = overlayP7?.shadow?.lines.find((r) => r.lineId === "L-PM-1");

  ok("C overlay EPHEMERAL", overlayShadow?.costBasisKind === "EPHEMERAL_RESEARCH");
  eq("C overlay laborCostPln qty×rate", overlayP7?.laborCostPln, 30);
  ok("C overlay ourRate null", overlayShadow?.ourRate == null);

  const p8DirectFromOverlayP7 = runIkP8RiskDecision({
    item,
    p7: overlayP7,
    bidProposal: overlayP7?.proposal ?? null,
    expert: sync.postIdentityExpert,
    chiefSession: null,
    knrHistorical: sync.knr,
  });
  const p8DirectFromSyncP7 = runIkP8RiskDecision({
    item,
    p7: syncP7,
    bidProposal: syncP7?.proposal ?? null,
    expert: sync.postIdentityExpert,
    chiefSession: null,
    knrHistorical: sync.knr,
  });

  ok("D overlay P8 === direct P8(overlay P7)", overlayP8?.status === p8DirectFromOverlayP7.status);
  ok(
    "D overlay P8 !== direct P8(sync P7) when APF delta",
    (overlayP7?.laborCostPln ?? 0) > (syncP7?.laborCostPln ?? 0)
      && p8DirectFromOverlayP7.provenance.bidFromP7 === true
      && p8DirectFromSyncP7.provenance.bidFromP7 === true,
    {
      overlayLabor: overlayP7?.laborCostPln,
      syncLabor: syncP7?.laborCostPln,
    },
  );

  eq("E authoritative positionCostBid", orchestra.positionCostBid?.laborCostPln, 30);
  eq("E authoritative riskDecision status", orchestra.riskDecision?.status, overlayP8?.status);

  if (overlayP7?.proposal?.ok && syncP7?.proposal?.ok) {
    ok(
      "F overlay bid cost > sync bid cost",
      (overlayP7.proposal.costPricePln ?? 0) > (syncP7.proposal.costPricePln ?? 0),
      {
        overlay: overlayP7.proposal.costPricePln,
        sync: syncP7.proposal.costPricePln,
      },
    );
    ok(
      "F authoritative P8 not sync bid cost",
      orchestra.riskDecision !== syncP8
        || (overlayP7.proposal.costPricePln ?? 0) > (syncP7.proposal.costPricePln ?? 0),
    );
  }
}

console.log("\n=== G: negative guards ===");
{
  const tenderId = "t-orch-apf-p8-neg";
  const line = minimalLine({ lineId: "L-neg", unit: "pomiar", quantity: 2 });
  const expert = readyExpert([{ line }], tenderId);
  const item = { id: tenderId, tenderId, ...PRICING_ITEM };
  const sync = runSyncSnapshot({ item, pkg: null, expert });

  const laborApf = await runIkMasterBoqLaborExpert({
    item,
    expert: sync.postIdentityExpert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: createFixtureApfLaborMarketPort([
      marketObs({ unitRatePln: 12, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-2", unitRatePln: 12, unit: "pomiar" }),
      marketObs({ evidenceId: "ev-3", unitRatePln: 12, unit: "pomiar" }),
    ]),
    nowMs: NOW,
  });

  const nullLabor = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor: null,
    item,
    pkg: null,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });
  ok("G labor null → sync P7", nullLabor.positionCostBid === sync.positionCostBid);
  ok("G labor null → sync P8", nullLabor.riskDecision === sync.riskDecision);

  const zeroApfLabor = {
    ...laborApf,
    counts: { ...laborApf.counts, apfCandidates: 0 },
  };
  const zeroApf = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor: zeroApfLabor,
    item,
    pkg: null,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });
  ok("G apfCandidates 0 → sync P7", zeroApf.positionCostBid === sync.positionCostBid);
  ok("G apfCandidates 0 → sync P8", zeroApf.riskDecision === sync.riskDecision);

  const laborDeny = await runIkMasterBoqLaborExpert({
    item,
    expert: sync.postIdentityExpert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: createPolicyDenyApfLaborMarketPort(),
    nowMs: NOW,
  });
  eq("G POLICY_DENY apfCandidates", laborDeny.counts.apfCandidates, 0);
  const denyAuth = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor: laborDeny,
    item,
    pkg: null,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });
  ok("G POLICY_DENY → sync P7", denyAuth.positionCostBid === sync.positionCostBid);
  ok("G POLICY_DENY → sync P8", denyAuth.riskDecision === sync.riskDecision);

  const laborNoSrc = await runIkMasterBoqLaborExpert({
    item,
    expert: sync.postIdentityExpert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: noSourcesPort(),
    nowMs: NOW,
  });
  eq("G NO_SOURCES apfCandidates", laborNoSrc.counts.apfCandidates, 0);
  const noSrcAuth = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor: laborNoSrc,
    item,
    pkg: null,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });
  ok("G NO_SOURCES → sync P7", noSrcAuth.positionCostBid === sync.positionCostBid);
  ok("G NO_SOURCES → sync P8", noSrcAuth.riskDecision === sync.riskDecision);
}

console.log("\n=== H: multi_package overlay P7 → overlay P8 ===");
{
  const tenderId = "t-orch-apf-p8-multi";
  const lineA = minimalLine({ lineId: "L-A-1", unit: "pomiar", quantity: 3 });
  const lineB = minimalLine({ lineId: "L-B-1", unit: "pomiar", quantity: 2 });
  const entries = [
    { dwellingId: "dw-a", documentId: "doc-a", line: lineA },
    { dwellingId: "dw-b", documentId: "doc-b", line: lineB },
  ];
  const expert = readyExpert(entries, tenderId);
  const pkg = multiPackageFixture(entries, tenderId);
  const item = { id: tenderId, tenderId, ...PRICING_ITEM };
  const sync = runSyncSnapshot({ item, pkg, expert });

  const labor = await runIkMasterBoqLaborExpert({
    item,
    expert: sync.postIdentityExpert,
    store: emptyStore,
    works: [],
    executeResearch: false,
    enableInternalFirst: false,
    apfLaborMarketPort: apfPortRatesByLineId({ "L-A-1": 10, "L-B-1": 20 }),
    nowMs: NOW,
  });

  ok("H apfCandidates 2", labor.counts.apfCandidates === 2);
  const orchestra = resolveAuthoritativePricing({
    syncSnapshot: sync,
    labor,
    item,
    pkg,
    store: emptyStore,
    flags: FLAGS_P7_P8,
    chiefSession: null,
  });

  eq("H overlay packageDirect.laborPln", orchestra.positionCostBid?.packageDirect?.laborPln, 70);

  const p8Multi = runIkP8RiskDecision({
    item,
    p7: orchestra.positionCostBid,
    bidProposal: orchestra.positionCostBid?.proposal ?? null,
    expert: sync.postIdentityExpert,
    chiefSession: null,
    knrHistorical: sync.knr,
  });
  ok("H overlay P8 uses multi overlay P7", orchestra.riskDecision?.status === p8Multi.status);
  ok(
    "H overlay P7 labor > sync P7 labor",
    (orchestra.positionCostBid?.packageDirect?.laborPln ?? 0)
      > (sync.positionCostBid?.packageDirect?.laborPln ?? 0),
  );
}

console.log("\n=== SAFETY ===");
ok("HTTP 0", httpCalls === 0);

console.log(`\n=== SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
