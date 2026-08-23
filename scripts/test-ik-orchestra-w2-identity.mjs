/**
 * W2 Identity / Persistence — harness.
 * Run: npx vite-node scripts/test-ik-orchestra-w2-identity.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasCompleteTrustedIdentityTuple,
  preserveOfferBoqLineIfTrusted,
  TRUSTED_IDENTITY_MATCH_METHODS,
} from "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
} from "../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts";
import { computeIkOrchestraSyncSnapshot } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { applyOwnerKnrMapping } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import {
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  getTenderPackage,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
} from "../src/lib/multi-dwelling/index.ts";
import { OFFER_BOQ_SCHEMA_VERSION } from "../src/lib/tender-offer-boq.ts";
import {
  runIkP7PositionCostBid,
  IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
} from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

const engineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const runtimeSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts");
const mappingSrc = readSrc("src/lib/tender-offer-boq-mapping.ts");

const engineBody = engineSrc.slice(engineSrc.indexOf("export function computeIkOrchestraSyncSnapshot"));
const sliceDOrder = engineBody.indexOf("applyOwnerKnrMapping");
const identityOrder = engineBody.indexOf("runIkIdentityPhase");
const classOrder = engineBody.indexOf("runIkMasterBoqClassification");
const identityCovOrder = engineBody.indexOf("runIkMasterBoqIdentityCoverage");
const compositeOrder = engineBody.indexOf("runIkCompositeBothHold");
const p7Order = engineBody.indexOf("runIkP7PositionCostBid");

ok("W2-10 Classification AFTER identity phase", sliceDOrder < identityOrder && identityOrder < classOrder);
ok("W2-10 order Identity→Class→Coverage→Composite→P7", classOrder < identityCovOrder && identityCovOrder < compositeOrder && compositeOrder < p7Order);
ok("W2-8 Labor runtime uses expert param", /expert:\s*opts\.expert/.test(runtimeSrc));
ok("W2-9 Material runtime uses expert param", runtimeSrc.includes("runIkMasterBoqMaterialExpert"));
ok("W2-8 Hook P5 uses postIdentityExpert", /expert:\s*postIdentityExpert/.test(hookSrc));
ok("W2-9 Hook P6 uses postIdentityExpert", hookSrc.includes("executeP6MaterialExpert"));
ok("W2-11 P7 uses postIdentityExpert", /runIkP7PositionCostBid\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc));
ok("W2 Classification uses postIdentityExpert", /runIkMasterBoqClassification\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc));
ok("W2 Composite uses postIdentityExpert", /runIkCompositeBothHold\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc));
ok("W2 persist NOT in sync useMemo", !engineBody.includes("attachOfferBoqToDwelling"));
ok("W2 gated persist in useEffect", hookSrc.includes("runGatedIdentityPersist"));
ok("W2 mapper imports trusted preserve", mappingSrc.includes("preserveOfferBoqLineIfTrusted"));
ok("W2 Slice D untouched", !readSrc("src/lib/intelligent-estimator/ik-knr-owner-mapping.ts").includes("ik-identity"));
ok("W2 F5 adapter untouched", !readSrc("src/lib/tender-position-cost/boq-shadow-adapter.ts").includes("ik-identity"));

function baseLine(overrides = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "Malowanie ścian",
    quantity: 10,
    unit: "m2",
    knrHint: null,
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
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
    ...overrides,
  };
}

const works = [
  {
    id: "legacy-malowanie-m2",
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: "m2",
    active: true,
    keywords: ["malowanie"],
    legacyCategoryId: "MALOWANIE",
  },
];

const mapCtx = { works, mappedAt: "2026-08-23T00:00:00.000Z" };

// W2-1 exact_knr trusted preserve
const exactLine = baseLine({
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "exact_knr",
  matchedBy: "exact_knr",
  matchConfidence: "high",
  knrHint: "KNR 4-01 1202-07",
});
ok("W2-1 hasCompleteTrusted exact_knr", hasCompleteTrustedIdentityTuple(exactLine));
const exactPreserved = preserveOfferBoqLineIfTrusted(exactLine);
ok("W2-1 preserve returns line", exactPreserved?.catalogWorkId === "legacy-malowanie-m2");
const exactRemapped = mapOfferBoqLine(exactLine, mapCtx);
ok("W2-1 mapper preserves exact_knr id", exactRemapped.catalogWorkId === "legacy-malowanie-m2");
ok("W2-1 mapper preserves exact_knr method", exactRemapped.matchMethod === "exact_knr");

// W2-2 alias + high
const aliasLine = baseLine({
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "alias",
  matchedBy: "alias",
  matchConfidence: "high",
});
ok("W2-2 alias preserve", mapOfferBoqLine(aliasLine, mapCtx).matchMethod === "alias");

// W2-3 manual identity
const manualLine = baseLine({
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
});
ok("W2-3 manual in TRUSTED set", TRUSTED_IDENTITY_MATCH_METHODS.has("manual"));
ok("W2-3 manual preserve", mapOfferBoqLine(manualLine, mapCtx).matchMethod === "manual");
const manualId = resolveWorkIdentityFromOfferBoqLine(manualLine);
ok("W2-3 manual F5 OK", manualId.status === "OK" && manualId.workId === "legacy-malowanie-m2");

// W2-4 competing → AMBIGUOUS
const competingLine = baseLine({
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "catalog_map",
  matchConfidence: "medium",
  candidateMatches: [
    { catalogWorkId: "a", matchedBy: "catalog_map", matchConfidence: "medium", role: "primary", workNamePl: "A", workCategory: "X", tradeId: "MALOWANIE", score: 40, rationale: "" },
    { catalogWorkId: "b", matchedBy: "catalog_map", matchConfidence: "medium", role: "alternate", workNamePl: "B", workCategory: "X", tradeId: "MALOWANIE", score: 38, rationale: "" },
  ],
});
const competingId = resolveWorkIdentityFromOfferBoqLine(competingLine);
ok("W2-4 competing AMBIGUOUS", competingId.status === "AMBIGUOUS" && competingId.workId == null);

// W2-5 null workId — phase must not invent catalogWorkId on ambiguous
function makeStructuralReport(lines, dwellingId = "legacy_single") {
  const refs = lines.map((line) => ({
    dwellingId,
    line,
    provenance: null,
  }));
  return {
    tenderId: "t-w2",
    discoverySettled: true,
    attachmentCount: 0,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { detectedRowCount: 0, extractedCount: 0, validCount: 0, executed: false, gaps: [] },
    validation: { missingDescription: 0, missingQuantity: 0, missingUnit: 0, missingLineage: 0, duplicateSuspicion: 0, reasons: [] },
    dwellingMapping: { allMapped: true, mappedCount: 1, unmappedCount: 0, reasons: [] },
    lineIntegrity: { ok: true, lineCount: lines.length, reasons: [] },
    dwellings: [],
    masterBoq: {
      mode: "legacy_single",
      schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 1,
      branchCount: 0,
      sourceCount: 1,
      hasLineProvenance: false,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: null,
    lineProvenance: null,
    masterBoqLines: refs,
  };
}

const phaseAmb = runIkIdentityPhase({
  structuralReport: makeStructuralReport([competingLine]),
  sliceDExpert: makeStructuralReport([competingLine]),
  item: { id: "t-w2", tenderId: "t-w2", title: "W2", bzpDocuments: [] },
  package: null,
  works,
});
ok(
  "W2-5 ambiguous line catalogWorkId null after phase",
  phaseAmb.postIdentityExpert.masterBoqLines[0]?.line.catalogWorkId == null,
);

// W2-13 / W2-14 gated persist
clearMultiDwellingPackageStore();
const TID = "t-w2-persist";
enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
setExpectedDwellingCount(TID, 1);
confirmDwelling({ tenderId: TID, dwellingId: "dw-a", labelPl: "A" });
mapDocumentToDwelling({ tenderId: TID, documentId: "doc-a", dwellingId: "dw-a" });

const lineA = baseLine({
  lineId: "LA",
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
});
const planDoc = {
  schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
  tenderId: TID,
  version: 1,
  builtAt: "2026-08-23T00:00:00.000Z",
  parserSnapshotRef: { kosztorysParsedAt: null, sourceFilename: null, rowCount: 1, pdfPrzedmiarCase: null },
  lines: [lineA],
  totals: {
    materialsPln: null,
    laborPln: null,
    equipmentPln: null,
    directPln: null,
    kpPln: null,
    overheadPln: null,
    costPricePln: null,
    marginPln: null,
    recommendedBidPln: null,
    profitPln: null,
    profitabilityPct: null,
    estimatedDurationDays: null,
    workingCapitalPln: null,
    lineCount: 1,
    pricedLineCount: 0,
  },
  recomputeToken: "t",
  buildStatus: "mapped",
  mappingStats: null,
  mappingAppliedAt: "2026-08-23T00:00:00.000Z",
  costIntelligenceStats: null,
  costIntelligenceAppliedAt: null,
  pricingStats: null,
  pricingAppliedAt: null,
  userEditStats: null,
  warnings: [],
};
const hashA = computeOfferBoqIdentityPayloadHash([lineA]);
const plan = [{ dwellingId: "dw-a", identityHash: hashA, offerBoq: planDoc }];
const gate = new Map();

const first = runGatedIdentityPersist({ tenderId: TID, plans: plan, sessionGate: gate });
ok("W2-14 first persist one write", first.writes.length === 1);
const second = runGatedIdentityPersist({ tenderId: TID, plans: plan, sessionGate: gate });
ok("W2-13 second identical zero writes", second.writes.length === 0);
ok(
  "W2-13 identical skip reason",
  second.skips.some((s) => s.reason === "IDENTICAL_PAYLOAD" || s.reason === "ALREADY_WRITTEN_SESSION"),
);

// W2-16 f5Gate/subtotals reset accepted (from first gated write)
const afterFirst = getTenderPackage(TID);
const unitFirst = afterFirst?.dwellings.find((d) => d.dwellingId === "dw-a");
ok("W2-16 attach writes offerBoq", (unitFirst?.offerBoq?.lines?.length ?? 0) === 1);
ok("W2-16 f5Gate reset null", unitFirst?.f5Gate == null);
ok("W2-16 subtotals reset null", unitFirst?.subtotals == null);

// W2-6 LS persist preserves identity tuple (read via getTenderPackage — SSOT reload path input)
ok(
  "W2-6 LS reload preserves manual matchMethod",
  unitFirst?.offerBoq?.lines?.[0]?.matchMethod === "manual",
);

// W2-A4 — P7(postIdentityExpert) after gated persist + f5Gate/subtotals reset
const persistedLine = unitFirst?.offerBoq?.lines?.[0];
ok(
  "W2-A4 identity tuple on persisted offerBoq",
  persistedLine?.catalogWorkId === "legacy-malowanie-m2"
    && persistedLine?.matchMethod === "manual"
    && persistedLine?.matchConfidence === "high",
);
const postIdentityExpertA4 = {
  tenderId: TID,
  status: "ready",
  reasons: [],
  documents: [],
  costDocuments: [],
  przedmiary: [],
  extraction: { extractedCount: 1 },
  masterBoq: {
    status: "ready",
    readyForExperts: true,
    lineCount: 1,
    mode: "multi",
  },
  offerBoq: unitFirst?.offerBoq ?? null,
  masterBoqLines: [{ dwellingId: "dw-a", line: persistedLine, provenance: null }],
};
let p7AfterPersist;
try {
  p7AfterPersist = runIkP7PositionCostBid({
    item: { id: TID, tenderId: TID, title: "W2 A4", bzpDocuments: [] },
    expert: postIdentityExpertA4,
    package: afterFirst,
  });
} catch (err) {
  p7AfterPersist = null;
  ok("W2-A4 P7 no throw", false, err);
}
if (p7AfterPersist) {
  ok("W2-A4 P7 no throw", true);
  ok(
    "W2-A4 P7 schemaVersion",
    p7AfterPersist.schemaVersion === IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
  );
  ok(
    "W2-A4 P7 valid terminal status",
    ["ready", "partial", "gap", "blocked", "hold"].includes(p7AfterPersist.status),
  );
  ok("W2-A4 P7 multi_package seam", p7AfterPersist.mode === "multi_package");
  ok(
    "W2-A4 P7 identity tuple in postIdentityExpert",
    postIdentityExpertA4.masterBoqLines[0]?.line?.catalogWorkId === "legacy-malowanie-m2"
      && postIdentityExpertA4.masterBoqLines[0]?.line?.matchMethod === "manual",
  );
  ok("W2-A4 P7 offerBoq present in package", (unitFirst?.offerBoq?.lines?.length ?? 0) === 1);
  ok("W2-A4 P7 f5Gate still reset before run", unitFirst?.f5Gate == null);
  ok(
    "W2-A4 P7 cutover blocked until F5 re-run (expected after attach reset)",
    p7AfterPersist.cutoverGatePass === false,
  );
  ok("W2-A4 P7 researchExecuted false", p7AfterPersist.researchExecuted === false);
  ok("W2-A4 P7 httpCalls 0", p7AfterPersist.httpCalls === 0);
}

const lineB = baseLine({
  lineId: "LA",
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "exact_knr",
  matchedBy: "exact_knr",
  matchConfidence: "high",
});
const hashB = computeOfferBoqIdentityPayloadHash([lineB]);
const changed = runGatedIdentityPersist({
  tenderId: TID,
  plans: [{ dwellingId: "dw-a", identityHash: hashB, offerBoq: { ...planDoc, lines: [lineB] } }],
  sessionGate: new Map(),
});
ok("W2-14 changed payload one write", changed.writes.length === 1);

// W2-15 DOCUMENT_MAPPING_REQUIRED skip
clearMultiDwellingPackageStore();
const TID2 = "t-w2-skip";
enableMultiDwellingMode(TID2, { expectedDwellingCount: 1 });
setExpectedDwellingCount(TID2, 1);
confirmDwelling({ tenderId: TID2, dwellingId: "dw-unmapped", labelPl: "U" });
const skipOut = runGatedIdentityPersist({
  tenderId: TID2,
  plans: plan,
  sessionGate: new Map(),
});
ok(
  "W2-15 skip unmapped dwelling",
  skipOut.writes.length === 0
    && skipOut.skips.some((s) => s.reason === "DOCUMENT_MAPPING_REQUIRED"),
);

// W2-7 per-dwelling isolation in phase plans
const lineDw1 = baseLine({ lineId: "D1", catalogWorkId: "legacy-malowanie-m2", matchMethod: "manual", matchedBy: "manual", matchConfidence: "high" });
const lineDw2 = baseLine({ lineId: "D2", description: "Inne", catalogWorkId: null, matchMethod: "unmatched" });
const multiStructural = {
  ...makeStructuralReport([lineDw1], "dw-1"),
  masterBoqLines: [
    { dwellingId: "dw-1", line: lineDw1, provenance: null },
    { dwellingId: "dw-2", line: lineDw2, provenance: null },
  ],
  masterBoq: {
    ...makeStructuralReport([lineDw1]).masterBoq,
    lineCount: 2,
    dwellingCount: 2,
  },
};
const multiPhase = runIkIdentityPhase({
  structuralReport: multiStructural,
  sliceDExpert: multiStructural,
  item: { id: "t-multi", tenderId: "t-multi", title: "M", bzpDocuments: [] },
  package: null,
  works,
});
ok("W2-7 two persist plans", multiPhase.context.persistPlans.length === 2);
ok(
  "W2-7 dwelling hashes differ",
  multiPhase.context.persistPlans[0]?.identityHash
    !== multiPhase.context.persistPlans[1]?.identityHash,
);

// W2-12 Slice D + Mapper + F5 via engine smoke
const itemSm = { id: "w2-smoke", tenderId: "w2-smoke", title: "Smoke", bzpDocuments: [] };
const snap = computeIkOrchestraSyncSnapshot({
  item: itemSm,
  effectiveItem: itemSm,
  pkg: null,
  ingest: null,
  historicalIndex: null,
  knrKnowledge: null,
  knowledgeBusy: false,
  flags: {
    p2DocumentsBoqOn: false,
    identityCoverageOn: false,
    p5LaborOn: false,
    p5ResearchOn: false,
    p6MaterialOn: false,
    p6ResearchOn: false,
    p7F5On: false,
    p8RiskOn: false,
  },
  chiefSession: null,
});
ok("W2 IdentityContext present", snap.identityContext != null);
ok("W2 postIdentityExpert present", snap.postIdentityExpert != null);
ok("W2 structural report preserved", snap.report !== snap.postIdentityExpert || snap.report.masterBoq.readyForExperts === false);

console.log(`\nW2 ORCHESTRA IDENTITY: ${fail === 0 ? "PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
