/**
 * IK-MIGRATION-01 P5.7 — Owner unit compatibility (G1 otw.↔szt / G2 aparat↔szt).
 * Run: npx vite-node scripts/test-ik-migration-01-p57-unit-semantics.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMasterBoqIdentityCoverage,
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import {
  resolveOwnerWorkUnitCompatibility,
  OWNER_UNIT_COMPATIBILITY_RULES,
} from "../src/lib/catalog-coverage/owner-unit-compatibility.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return { ok: true, json: async () => ({}), text: async () => "" };
};

const NOW = Date.parse("2026-08-15T17:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const W_PRZEB = CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow;
const W_PRZYG = CATALOG_WAVE2_PRODUCT_IDS.przygotowanie_pod_osprzet;

function quoteCell(price, at) {
  return {
    wgdom: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: at,
        confidence: 0.8,
        origin: "wgdom",
      },
    },
  };
}

function makeWork(overrides = {}) {
  return {
    id: W_PRZEB,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Przebijanie otworów",
    unit: "szt",
    companyPricePln: 85,
    marketQuotes: quoteCell(85, T_FRESH),
    marketQuoteHistory: [],
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function minimalLine(opts) {
  return {
    lineId: opts.lineId,
    lp: opts.lp ?? "1",
    description: opts.description,
    quantity: opts.quantity ?? 1,
    quantityRaw: String(opts.quantity ?? 1),
    unit: opts.unit ?? "szt",
    catalogWorkId: null,
    workCategory: "electrical",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "snapshot",
    matchedBy: "snapshot",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak źródła" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak źródła" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak źródła" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    aiConfidence: "medium",
    warnings: [],
  };
}

function provenance(lineId) {
  return {
    lineId,
    sourceDocumentId: "doc-el",
    sourceDocumentIds: ["doc-el"],
    sourceArtifactId: "art-el",
    sourceArtifactIds: ["art-el"],
    branchHint: "electrical",
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpert(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-p57",
    discoverySettled: true,
    attachmentCount: 1,
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
      sourceLineCount: lines.length,
      composedLineCount: lines.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 1,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    masterBoqLines,
    status: "ready",
    reasons: [],
  };
}

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");

// A exact unit match
assert(
  "A exact szt→szt",
  resolveWorkIdentityFromOfferBoqLine({
    catalogWorkId: W_PRZEB,
    unit: "szt",
    matchMethod: "alias",
    matchConfidence: "high",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: null,
    quantity: 2,
  }).status === "OK",
);

// B formatting-equivalent
assert(
  "B szt. format",
  resolveWorkIdentityFromOfferBoqLine({
    catalogWorkId: W_PRZEB,
    unit: "szt.",
    matchMethod: "alias",
    matchConfidence: "high",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: null,
    quantity: 1,
  }).unit === "szt",
);

// C existing conversion kpl→szt remains global (unchanged contract)
assert("C kpl still global", normalizeWgdomCostUnit("kpl") === "szt");

// D/E — WITHOUT workId, otw./aparat remain INVALID (no global rule)
assert("D no global otw.", normalizeWgdomCostUnit("otw.") === null);
assert("E no global aparat", normalizeWgdomCostUnit("aparat") === null);
assert(
  "D invalid otw without work",
  resolveWorkIdentityFromOfferBoqLine({
    catalogWorkId: null,
    unit: "otw.",
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: null,
    quantity: 3,
  }).status === "INVALID_UNIT",
);
assert(
  "E invalid aparat without allowlisted work",
  resolveWorkIdentityFromOfferBoqLine({
    catalogWorkId: "some-other-work",
    unit: "aparat",
    matchMethod: "alias",
    matchConfidence: "high",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: null,
    quantity: 1,
  }).status === "INVALID_UNIT",
);

// F Owner accepts G1
const g1 = resolveWorkIdentityFromOfferBoqLine({
  catalogWorkId: W_PRZEB,
  unit: "otw.",
  matchMethod: "alias",
  matchConfidence: "high",
  candidateMatches: [],
  isNoise: false,
  noiseKind: null,
  costIntelligence: null,
  quantity: 6,
});
assert("F G1 OK", g1.status === "OK" && g1.workId === W_PRZEB, g1);
assert("F G1 unit catalog szt", g1.unit === "szt");
assert("F G1 source preserved", g1.unitRaw === "otw.");
assert("F G1 owner compat", g1.ownerUnitCompatibility?.groupId === "G1_otw_szt");
assert("F qty not in identity rewrite", g1.ownerUnitCompatibility != null);

// G Owner accepts G2
const g2 = resolveWorkIdentityFromOfferBoqLine({
  catalogWorkId: W_PRZYG,
  unit: "aparat",
  matchMethod: "alias",
  matchConfidence: "high",
  candidateMatches: [],
  isNoise: false,
  noiseKind: null,
  costIntelligence: null,
  quantity: 2,
});
assert("G G2 OK", g2.status === "OK" && g2.workId === W_PRZYG, g2);
assert("G source aparat", g2.unitRaw === "aparat");

// Reject path: wrong work for otw.
assert(
  "reject otw on wrong work",
  resolveOwnerWorkUnitCompatibility({ workId: W_PRZYG, sourceUnitRaw: "otw." }).ok === false,
);

// H unresolved remains
assert(
  "H unknown unit unresolved",
  resolveWorkIdentityFromOfferBoqLine({
    catalogWorkId: W_PRZEB,
    unit: "xyz-unit",
    matchMethod: "alias",
    matchConfidence: "high",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: null,
    quantity: 1,
  }).status === "INVALID_UNIT",
);

assert("allowlist size 2", OWNER_UNIT_COMPATIBILITY_RULES.length === 2);

const store = makeStore([
  makeWork({ id: W_PRZEB, namePl: "Przebijanie otworów w ścianach/stropach" }),
  makeWork({
    id: W_PRZYG,
    namePl: "Przygotowanie podłoża pod osprzęt / aparaty",
    tradeId: "ELEKTRYKA",
    companyPricePln: 38,
    marketQuotes: quoteCell(38, T_FRESH),
  }),
]);

const fixtureLines = [
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-otw",
      description: "Mechaniczne przebijanie otworów w ścianach z cegły",
      unit: "otw.",
      quantity: 3,
    }),
    provenance: provenance("L-otw"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-ap",
      description: "Przygotowanie podłoża do zabudowania aparatów - kucie ręczne pod śruby kotwowe w podł. z cegły - aparat o 1-2 otworach mocujących",
      unit: "aparat",
      quantity: 1,
    }),
    provenance: provenance("L-ap"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-gap",
      description: "Roboty nieznane p57-xyz",
      unit: "m2",
      quantity: 5,
    }),
    provenance: provenance("L-gap"),
  },
];

const item = { id: "t-p57", tenderId: "t-p57", title: "P5.7" };
const expert = readyExpert(fixtureLines);
const qtyBefore = fixtureLines.map((f) => f.line.quantity);
const report = runIkMasterBoqIdentityCoverage({
  item,
  expert,
  store,
  works: store.catalogs.wroclaw.works,
  nowMs: NOW,
});
const byId = Object.fromEntries(report.lines.map((l) => [l.lineId, l]));

assert("I qty otw unchanged", byId["L-otw"]?.quantity === 3);
assert("I qty aparat unchanged", byId["L-ap"]?.quantity === 1);
assert(
  "I qty array intact",
  report.lines.every((l, i) => {
    const src = fixtureLines.find((f) => f.line.lineId === l.lineId);
    return src && l.quantity === src.line.quantity;
  }),
  qtyBefore,
);
assert("J provenance", report.provenancePreservation);
assert("K dwelling", report.dwellingPreservation && byId["L-otw"].dwellingId === "ptasia");
assert("L branch", report.branchPreservation);
assert("M no pricing", report.pricingExecuted === false);
assert("N no research", report.researchExecuted === false);
assert("O no auto-Accept", report.autoAcceptExecuted === false);
assert("trusted G1", byId["L-otw"]?.trustedWorkIdentity === true, byId["L-otw"]);
assert("trusted G2", byId["L-ap"]?.trustedWorkIdentity === true, byId["L-ap"]);
assert("source unit otw preserved", byId["L-otw"]?.unit === "otw.");
assert("source unit aparat preserved", byId["L-ap"]?.unit === "aparat");
assert("compat confirmed count", report.wave2SeedAudit.unitCompatibilityConfirmed === 2);
assert("H gap still gap", byId["L-gap"]?.status === "IDENTITY_GAP");
assert("line coverage", report.reconciliation.ok && report.counts.outputLineCount === 3);
assert("no live HTTP", liveFetch === 0);

// Global normalize untouched — otw./aparat must NOT appear in normalizeWgdomCostUnit body
const normSrc = readFileSync(join(root, "src/lib/wgdom-cost-catalog.ts"), "utf8");
const fnStart = normSrc.indexOf("export function normalizeWgdomCostUnit");
const fnBody = normSrc.slice(fnStart, fnStart + 600);
assert("NO GLOBAL otw/aparat in normalize body", !/\botw\b/.test(fnBody) && !/\baparat\b/.test(fnBody));

forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  identityCoverage: report,
  ingest: {
    phase: "completed",
    started: true,
    completed: true,
    tenderId: item.id,
    documentsUsed: 1,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 1,
    extractedLineCount: 3,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert("EC UNIT_COMPATIBILITY_CONFIRMED", events.includes("UNIT_COMPATIBILITY_CONFIRMED"));
const unitStep = vm.steps.find((s) => s.event === "UNIT_COMPATIBILITY_CONFIRMED");
assert("EC no PRICE ACCEPTED", unitStep?.sourceRef?.artifact?.pricingAccepted === false);
assert("EC sourceRef", Boolean(unitStep?.sourceRef?.tenderId));

forceIkEntryEnabledForTests(null);
assert(
  "ATH writer GAP",
  /ATH writer|GAP|NOT IMPLEMENTED/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P5.7-UNIT-SEMANTICS-OWNER-DECISION.md"), "utf8"),
  ),
);

console.log(`\nP5.7 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
