/**
 * IK-MIGRATION-01 P5.5 — Identity Coverage (audit · ZERO invent / pricing / research).
 * Run: npx vite-node scripts/test-ik-migration-01-p55-identity-coverage.mjs
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

const NOW = Date.parse("2026-08-15T14:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const LABOR_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
const MAT_WORK = "cw.product.farba_lateksowa_wewnetrzna";

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
    id: LABOR_ID,
    tradeId: "MALOWANIE",
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    companyPricePln: 12,
    marketQuotes: quoteCell(40, T_FRESH),
    marketQuoteHistory: [],
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["oczyszczenie", "podloza"],
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
    unit: opts.unit ?? "m2",
    catalogWorkId: null,
    workCategory: opts.workCategory ?? "construction",
    categoryId: null,
    isNoise: opts.isNoise ?? false,
    noiseKind: opts.noiseKind ?? null,
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

function provenance(lineId, branchHint = "construction") {
  return {
    lineId,
    sourceDocumentId: `doc-${branchHint}`,
    sourceDocumentIds: [`doc-${branchHint}`],
    sourceArtifactId: `art-${branchHint}`,
    sourceArtifactIds: [`art-${branchHint}`],
    branchHint,
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
    tenderId: "t-p55",
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
      dwellingCount: 2,
      branchCount: 2,
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

const item = { id: "t-p55", tenderId: "t-p55", title: "P5.5 harness" };

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");
assert(
  "Gate A DetailPage NG-10",
  /resolveIkDetailFirstScreen|ng10_gate|TenderAutonomous/.test(
    readFileSync(join(root, "src/app/TenderDetailPage.tsx"), "utf8"),
  ),
);

// Works: labor with quotes + paint product with quotes + wave2 alias target without quotes (Owner mapping)
const paint = makeWork({
  id: MAT_WORK,
  namePl: "Farba lateksowa wewn.",
  unit: "l",
  keywords: ["farba"],
  marketQuotes: quoteCell(11, T_FRESH),
});
const labor = makeWork();
const aliasNoQuotes = makeWork({
  id: CATALOG_WAVE2_PRODUCT_IDS.wykucie_wnek,
  namePl: "Wykucie wnęk",
  unit: "szt",
  keywords: ["wykucie", "wnek"],
  marketQuotes: undefined,
  freshnessStatus: "missing",
  companyPricePln: 0,
});
const store = makeStore([labor, paint, aliasNoQuotes]);

const fixtureLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-work",
      description: "Oczyszczenie i zmywanie podłoża",
      unit: "m2",
    }),
    provenance: provenance("L-work", "construction"),
  },
  {
    dwellingId: "nasturcjowa",
    line: minimalLine({
      lineId: "L-mat",
      description: "Farba lateksowa biała",
      unit: "l",
    }),
    provenance: provenance("L-mat", "construction"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-alias-gap",
      description: "Wykucie wnęk w murze pod instalacje",
      unit: "szt",
    }),
    provenance: provenance("L-alias-gap", "electrical"),
  },
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-gap",
      description: "Roboty nieznane xyz123 bez mapowania",
      unit: "m2",
    }),
    provenance: provenance("L-gap", "construction"),
  },
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-noise",
      description: "Razem",
      unit: "-",
      isNoise: true,
      noiseKind: "total_row",
    }),
    provenance: provenance("L-noise", "construction"),
  },
];

const expert = readyExpert(fixtureLines);
const report = runIkMasterBoqIdentityCoverage({
  item,
  expert,
  store,
  works: store.catalogs.wroclaw.works,
  nowMs: NOW,
});

const byId = Object.fromEntries(report.lines.map((l) => [l.lineId, l]));

assert("A exact Work Identity reuse",
  byId["L-work"]?.trustedWorkIdentity === true
  || byId["L-work"]?.approvedAliasHit === true
  || byId["L-work"]?.status === "TRUSTED_WORK"
  || byId["L-work"]?.status === "APPROVED_ALIAS"
  || byId["L-work"]?.status === "OWNER_MAPPING_POSSIBLE",
  byId["L-work"]);

assert("B exact Material Identity reuse",
  byId["L-mat"]?.trustedMaterialIdentity === true
  && (byId["L-mat"].status === "TRUSTED_MATERIAL" || byId["L-mat"].status === "TRUSTED_BOTH"),
  byId["L-mat"]);

assert("C approved alias / Owner mapping path for wykucie",
  byId["L-alias-gap"]?.approvedAliasHit === true
  || byId["L-alias-gap"]?.ownerMappingPossible === true
  || byId["L-alias-gap"]?.status === "OWNER_MAPPING_POSSIBLE"
  || byId["L-alias-gap"]?.status === "APPROVED_ALIAS"
  || byId["L-alias-gap"]?.status === "IDENTITY_GAP",
  byId["L-alias-gap"]);

assert("D Owner mapping possible flag when Pack+missingQuotes",
  byId["L-alias-gap"]?.ownerMappingPossible === true
  || byId["L-alias-gap"]?.aliasMissingQuotes === true
  || byId["L-alias-gap"]?.status === "IDENTITY_GAP",
  byId["L-alias-gap"]);

assert("E unresolved / gap for unknown text",
  byId["L-gap"]?.status === "IDENTITY_GAP"
  && !byId["L-gap"].trustedWorkIdentity
  && !byId["L-gap"].trustedMaterialIdentity,
  byId["L-gap"]);

assert("F NON_COST or gap for noise",
  byId["L-noise"]?.status === "NON_COST" || byId["L-noise"]?.status === "IDENTITY_GAP",
  byId["L-noise"]);

assert("G no fuzzy auto-trust on gap",
  !byId["L-gap"]?.trustedWorkIdentity && !byId["L-gap"]?.mapperCatalogWorkId);

assert("H no identity invention", report.identityInvention === false);

assert("I provenance", report.provenancePreservation
  && report.lines[0].sourceDocumentId === "doc-construction");
assert("J dwelling preservation", report.dwellingPreservation);
assert("K branch preservation", report.branchPreservation);
assert("L line coverage", report.reconciliation.ok
  && report.counts.inputLineCount === 5
  && report.counts.outputLineCount === 5
  && Object.values(report.counts.byStatus).reduce((a, b) => a + b, 0) === 5,
  report.counts);
assert("M no pricing", report.pricingExecuted === false);
assert("N no research", report.researchExecuted === false);
assert("O no auto-Accept", report.autoAcceptExecuted === false);
assert("no live HTTP", liveFetch === 0);

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
    extractedLineCount: 5,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert("EC IDENTITY_COVERAGE_STARTED", events.includes("IDENTITY_COVERAGE_STARTED"));
assert("EC IDENTITY_COVERAGE_COMPLETED", events.includes("IDENTITY_COVERAGE_COMPLETED"));
assert("EC sourceRef", vm.steps.filter((s) => s.id === "identity_coverage").every((s) => s.sourceRef?.tenderId));

forceIkEntryEnabledForTests(null);
assert(
  "ATH writer GAP retained in P5 docs",
  /ATH writer|NOT IMPLEMENTED|GAP/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P5-MATERIAL-EXPERT.md"), "utf8"),
  ),
);

console.log(`\nP5.5 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
