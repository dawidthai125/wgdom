/**
 * GO #5 — focused restore regression (generic + Sępa LP269 witness).
 * Proves surgical durable-line restore WITHOUT G1 Accept / Identity remap.
 * Run: npx vite-node scripts/test-ik-sepa-lp269-restore.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { buildG1ManualOverride } from "../src/lib/intelligent-estimator/orchestra/ik-owner-gate-actions.ts";
import { OFFER_BOQ_SCHEMA_VERSION } from "../src/lib/tender-offer-boq.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import {
  SEPA_KNNR_1301_01_WORK_ID,
  SEPA_KNNR_1301_02_WORK_ID,
} from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog.ts";
import { C2_KNR_WC_1305_01_WORK_ID, C2_KNR_WC_1305_02_WORK_ID } from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";
import {
  clearMultiDwellingPackageStore,
  upsertTenderPackage,
  getTenderPackage,
  attachOfferBoqToDwelling,
} from "../src/lib/multi-dwelling/store.ts";

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

function fp(line) {
  return JSON.stringify({
    lineId: line.lineId,
    catalogWorkId: line.catalogWorkId ?? null,
    matchMethod: line.matchMethod ?? null,
    matchConfidence: line.matchConfidence ?? null,
    matchedBy: line.matchedBy ?? null,
    quantity: line.quantity,
    candidates: [...(line.candidateMatches ?? [])]
      .map((c) => `${c.catalogWorkId}|${c.matchConfidence}`)
      .sort(),
  });
}

function baseLine(o = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "x",
    quantity: 1,
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
    ...o,
  };
}

function emptyTotals(n) {
  return {
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
    lineCount: n,
    pricedLineCount: 0,
  };
}

function makeStructural(lines, dwellingId = "dw1") {
  return {
    tenderId: "t-restore",
    discoverySettled: true,
    attachmentCount: 0,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: lines.length,
      extractedCount: lines.length,
      validCount: lines.length,
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
    masterBoqLines: lines.map((line) => ({ dwellingId, line, provenance: null })),
  };
}

const phaseSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"),
  "utf8",
);
ok("no LP-specific restore hardcode in identity phase", !/obl_53d3cbe6|LP269/.test(phaseSrc));
ok("pomiar != prob", normalizeWgdomCostUnit("pomiar") !== "prob");
ok("A1/A2 valid ids", Boolean(SEPA_KNNR_1301_01_WORK_ID && SEPA_KNNR_1301_02_WORK_ID));

const DW = "dw1";
const TID = "t-restore-go5";
const HOLD_ID = "obl_hold_witness";
const SEL_A = "obl_sel_a";
const SEL_B = "obl_sel_b";
const CLOSED_ID = "obl_closed";

const preHold = baseLine({
  lineId: HOLD_ID,
  lp: "269",
  description: "Sprawdzenie i pomiar istniejących obwodów mieszkania",
  unit: "pomiar",
  quantity: 180,
  catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
  matchMethod: "catalog_map",
  matchedBy: "catalog_map",
  matchConfidence: "high",
  candidateMatches: [
    {
      catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
      matchedBy: "catalog_map",
      matchConfidence: "high",
      role: "primary",
      workNamePl: "1305-01",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 40,
      rationale: "",
    },
    {
      catalogWorkId: C2_KNR_WC_1305_02_WORK_ID,
      matchedBy: "catalog_map",
      matchConfidence: "medium",
      role: "alternate",
      workNamePl: "1305-02",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 38,
      rationale: "",
    },
    {
      catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
      matchedBy: "catalog_map",
      matchConfidence: "medium",
      role: "alternate",
      workNamePl: "A1",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 36,
      rationale: "",
    },
    {
      catalogWorkId: SEPA_KNNR_1301_02_WORK_ID,
      matchedBy: "catalog_map",
      matchConfidence: "low",
      role: "alternate",
      workNamePl: "A2",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 30,
      rationale: "",
    },
  ],
});

const incidentHold = baseLine({
  ...preHold,
  catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
  matchMethod: "catalog_map",
  matchedBy: "catalog_map",
  matchConfidence: "high",
  candidateMatches: [
    {
      catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
      matchedBy: "catalog_map",
      matchConfidence: "high",
      role: "primary",
      workNamePl: "A1",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 50,
      rationale: "",
    },
  ],
});

const selA = baseLine({
  lineId: SEL_A,
  lp: "200",
  description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 10,
  catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
});
const selB = baseLine({
  lineId: SEL_B,
  lp: "201",
  description: "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 15,
  catalogWorkId: SEPA_KNNR_1301_02_WORK_ID,
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
});
const closed = baseLine({
  lineId: CLOSED_ID,
  lp: "10",
  description: "Malowanie ścian",
  unit: "m2",
  quantity: 5,
  catalogWorkId: "legacy-malowanie-m2",
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
});

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
  {
    id: SEPA_KNNR_1301_01_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "pomiar 1F",
    unit: "pomiar",
    active: true,
    keywords: ["pomiar", "1-fazowego"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: SEPA_KNNR_1301_02_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "pomiar 3F",
    unit: "pomiar",
    active: true,
    keywords: ["pomiar", "3-fazowego"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: C2_KNR_WC_1305_01_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "prob 1305-01",
    unit: "prob",
    active: true,
    keywords: ["próba"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: C2_KNR_WC_1305_02_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "prob 1305-02",
    unit: "prob",
    active: true,
    keywords: ["próba"],
    legacyCategoryId: "ELEKTRO",
  },
];

// --- Surgical restore without G1 / Identity ---
clearMultiDwellingPackageStore();
const incidentLines = [closed, selA, selB, incidentHold];
const offerBoq = {
  schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
  tenderId: TID,
  version: 1,
  builtAt: "2026-09-01T00:00:00.000Z",
  parserSnapshotRef: {
    kosztorysParsedAt: null,
    sourceFilename: null,
    rowCount: incidentLines.length,
    pdfPrzedmiarCase: null,
  },
  lines: incidentLines,
  totals: emptyTotals(incidentLines.length),
  recomputeToken: "go5",
  buildStatus: "mapped",
  mappingStats: null,
  mappingAppliedAt: "2026-09-01T00:00:00.000Z",
  costIntelligenceStats: null,
  costIntelligenceAppliedAt: null,
  pricingStats: null,
  pricingAppliedAt: null,
  userEditStats: null,
  warnings: [],
};
upsertTenderPackage({
  tenderId: TID,
  mode: "legacy_single",
  expectedDwellingCount: 1,
  documentToDwelling: {},
  dwellings: [
    {
      dwellingId: DW,
      labelPl: "T",
      sourceDocumentIds: ["doc-restore"],
      offerBoq,
      f5Gate: null,
      subtotals: null,
    },
  ],
});

const pkg0 = getTenderPackage(TID);
ok("package upserted with dwelling", (pkg0?.dwellings?.length ?? 0) === 1, pkg0);
const before = pkg0.dwellings[0].offerBoq.lines;
const beforeSelA = before.find((l) => l.lineId === SEL_A);
const beforeSelB = before.find((l) => l.lineId === SEL_B);
const beforeClosed = before.find((l) => l.lineId === CLOSED_ID);
const beforeHold = before.find((l) => l.lineId === HOLD_ID);
ok("incident HOLD is A1 catalog_map", beforeHold.catalogWorkId === SEPA_KNNR_1301_01_WORK_ID);

const restoredLines = before.map((l) =>
  l.lineId === HOLD_ID ? structuredClone(preHold) : l,
);
const attached = attachOfferBoqToDwelling({
  tenderId: TID,
  dwellingId: DW,
  offerBoq: { ...offerBoq, lines: restoredLines },
});
ok("attach restore ok", attached.ok === true, attached);

const after = getTenderPackage(TID).dwellings[0].offerBoq.lines;
const afterHold = after.find((l) => l.lineId === HOLD_ID);
const afterSelA = after.find((l) => l.lineId === SEL_A);
const afterSelB = after.find((l) => l.lineId === SEL_B);
const afterClosed = after.find((l) => l.lineId === CLOSED_ID);

ok("restore without manual override", afterHold.matchMethod === "catalog_map" && afterHold.matchMethod !== "manual");
ok("restore workId 1305-01-prob", afterHold.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID);
ok("restore fingerprint matches PRE", fp(afterHold) === fp(preHold));
ok(
  "restore F5 AMBIGUOUS",
  resolveWorkIdentityFromOfferBoqLine(afterHold).status === "AMBIGUOUS",
  resolveWorkIdentityFromOfferBoqLine(afterHold),
);
ok("selected A unchanged", fp(afterSelA) === fp(beforeSelA));
ok("selected B unchanged", fp(afterSelB) === fp(beforeSelB));
ok("closed durable unchanged", fp(afterClosed) === fp(beforeClosed));
ok("qty 180 unchanged", afterHold.quantity === 180);

// --- Scoped G1 after restore must keep HOLD immutable ---
const structural = makeStructural(
  after.map((l) =>
    baseLine({
      lineId: l.lineId,
      lp: l.lp,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
    }),
  ),
  DW,
);
const pkg = getTenderPackage(TID);
const phase = runIkIdentityPhase({
  structuralReport: structural,
  sliceDExpert: structural,
  item: { id: TID, tenderId: TID, title: "restore", bzpDocuments: [] },
  package: pkg,
  works,
  manualOverrides: [
    buildG1ManualOverride({
      dwellingId: DW,
      lineId: SEL_A,
      catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
    }),
    buildG1ManualOverride({
      dwellingId: DW,
      lineId: SEL_B,
      catalogWorkId: SEPA_KNNR_1301_02_WORK_ID,
    }),
  ],
  nowMs: Date.now(),
});
const holdOut = phase.postIdentityExpert.masterBoqLines.find((r) => r.line.lineId === HOLD_ID)?.line;
ok(
  "scoped G1 keeps restored HOLD unchanged",
  fp(holdOut) === fp(preHold),
  { before: fp(preHold), after: fp(holdOut) },
);

// --- Live Sępa artifact witness (read-only if GO5 result exists; else PRE/GO3) ---
const temp = process.env.TEMP ? join(process.env.TEMP, "wgdom-next-real-tender-audit") : null;
const go5 = temp ? join(temp, "sepa-g1-package-after-go5.json") : null;
const go3 = temp ? join(temp, "sepa-g1-package-after-go3.json") : null;
const pre = temp ? join(temp, "sepa-g1-package-after.json") : null;
if (go5 && existsSync(go5)) {
  const pkg5 = JSON.parse(readFileSync(go5, "utf8"));
  const lines = pkg5.dwellings.find((d) => d.dwellingId === "legacy_single").offerBoq.lines;
  const l269 = lines.find((l) => l.lineId === "obl_53d3cbe6");
  ok(
    "Sępa GO5 artifact LP269 = 1305 catalog_map",
    l269?.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID && l269?.matchMethod === "catalog_map",
    l269,
  );
  ok(
    "Sępa GO5 artifact LP269 F5 AMBIGUOUS",
    resolveWorkIdentityFromOfferBoqLine(l269).status === "AMBIGUOUS",
  );
} else if (pre && go3 && existsSync(pre) && existsSync(go3)) {
  ok("Sępa GO5 artifact not yet present — PRE/GO3 available for executor", true);
} else {
  ok("Sępa TEMP artifacts absent — synthetic path only", true);
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
console.log("LP269_RESTORE_REGRESSION PASS");
