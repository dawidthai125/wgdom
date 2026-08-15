/**
 * IK-MIGRATION-01 P5.6 — Work Identity Wave 2 seed audit (NO fake works).
 * Run: npx vite-node scripts/test-ik-migration-01-p56-wave2-seed.mjs
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
import {
  CATALOG_WAVE2_PRODUCT_IDS,
  CATALOG_WAVE2_PRODUCT_ID_SET,
} from "../src/lib/catalog-coverage/alias-pack-wave2.ts";

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

const NOW = Date.parse("2026-08-15T16:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";

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
    id: CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow,
    tradeId: "ELEKTRYKA",
    namePl: "Mocowanie aparatów",
    unit: "szt",
    companyPricePln: 45,
    marketQuotes: quoteCell(45, T_FRESH),
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
    workCategory: opts.workCategory ?? "electrical",
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
    tenderId: "t-p56",
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

const item = { id: "t-p56", tenderId: "t-p56", title: "P5.6 harness" };

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");
assert(
  "Gate A DetailPage NG-10",
  /resolveIkDetailFirstScreen|ng10_gate|TenderAutonomous/.test(
    readFileSync(join(root, "src/app/TenderDetailPage.tsx"), "utf8"),
  ),
);

const fixtureLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-moc",
      description: "Montaż aparatów na gotowym podłożu",
      unit: "szt",
    }),
    provenance: provenance("L-moc"),
  },
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-przeb",
      description: "Mechaniczne przebijanie otworów w ścianach z cegły",
      unit: "otw.",
    }),
    provenance: provenance("L-przeb"),
  },
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-gap",
      description: "Roboty nieznane xyz-p56",
      unit: "m2",
    }),
    provenance: provenance("L-gap"),
  },
];
const expert = readyExpert(fixtureLines);

// --- Empty catalog: Pack may hit, work missing → no invent ---
mem.clear();
const emptyStore = makeStore([]);
const emptyReport = runIkMasterBoqIdentityCoverage({
  item,
  expert,
  store: emptyStore,
  works: [],
  nowMs: NOW,
});
assert("empty: no trusted work invent", emptyReport.counts.trustedWorkIdentity === 0);
assert("empty: seedCreated=0", emptyReport.wave2SeedAudit.seedCreated === 0);
assert(
  "empty: no fake auto-work",
  emptyReport.identityInvention === false
  && emptyReport.lines.every((l) => !String(l.mapperCatalogWorkId || "").startsWith("auto-work")),
);
assert(
  "empty: W2 not full in catalog",
  emptyReport.wave2SeedAudit.wave2IdsPresentInCatalog === 0
  && emptyReport.wave2SeedAudit.source === "catalog_empty_or_partial",
);

// --- Seeded catalog (REUSE existing W2 contract) ---
const w2Works = [
  makeWork({
    id: CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow,
    namePl: "Mocowanie aparatów na gotowym podłożu",
    unit: "szt",
  }),
  makeWork({
    id: CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow,
    namePl: "Przebijanie otworów w ścianach/stropach",
    unit: "szt",
    companyPricePln: 85,
    marketQuotes: quoteCell(85, T_FRESH),
  }),
];
const seededStore = makeStore(w2Works);
const seeded = runIkMasterBoqIdentityCoverage({
  item,
  expert,
  store: seededStore,
  works: seededStore.catalogs.wroclaw.works,
  nowMs: NOW,
});
const byId = Object.fromEntries(seeded.lines.map((l) => [l.lineId, l]));

assert("seeded: seedCreated still 0 (no write path)", seeded.wave2SeedAudit.seedCreated === 0);
assert("seeded: no duplicates", seeded.wave2SeedAudit.duplicateWorkIds.length === 0);
assert(
  "seeded: mocowanie TRUSTED when unit matches",
  byId["L-moc"]?.trustedWorkIdentity === true
  && byId["L-moc"]?.mapperCatalogWorkId === CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow,
  byId["L-moc"],
);
assert(
  "seeded: przebijanie APPROVED_ALIAS + INVALID_UNIT (otw.≠szt)",
  byId["L-przeb"]?.approvedAliasHit === true
  && byId["L-przeb"]?.trustedWorkIdentity === false
  && byId["L-przeb"]?.workIdentity?.status === "INVALID_UNIT",
  byId["L-przeb"],
);
assert(
  "seeded: invalidUnitAliasHits >= 1",
  seeded.wave2SeedAudit.invalidUnitAliasHits >= 1,
  seeded.wave2SeedAudit,
);
assert("seeded: gap remains honest", byId["L-gap"]?.status === "IDENTITY_GAP");
assert("Gate B: line coverage", seeded.reconciliation.ok);
assert("Gate B: no pricing", seeded.pricingExecuted === false);
assert("Gate B: no research", seeded.researchExecuted === false);
assert("Gate B: no Accept", seeded.autoAcceptExecuted === false);
assert("Gate C: no invent", seeded.identityInvention === false);
assert(
  "Gate C: W2 IDs set size 8",
  CATALOG_WAVE2_PRODUCT_ID_SET.size === 8,
);
assert("no live HTTP", liveFetch === 0);

forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  identityCoverage: seeded,
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
assert("EC IDENTITY_SEED_COMPLETED", events.includes("IDENTITY_SEED_COMPLETED"));
assert("EC WORK_IDENTITY_COVERAGE_CHANGED", events.includes("WORK_IDENTITY_COVERAGE_CHANGED"));
assert("EC OWNER_REVIEW_REQUIRED", events.includes("OWNER_REVIEW_REQUIRED"));
assert(
  "EC sourceRef on identity steps",
  vm.steps.filter((s) => s.id === "identity_coverage").every((s) => s.sourceRef?.tenderId),
);

forceIkEntryEnabledForTests(null);
assert(
  "OPS Wave2 script exists (REUSE seed path)",
  /CATALOG_WAVE2_PRODUCT_IDS|W2_WORKS/.test(
    readFileSync(join(root, "scripts/catalog-wave-2-ops.mjs"), "utf8"),
  ),
);
assert(
  "no BOQLineIdentityPanel invented",
  !readFileSync(join(root, "src/lib/intelligent-estimator/ik-identity-coverage.ts"), "utf8")
    .includes("BOQLineIdentityPanel"),
);
assert(
  "ATH writer GAP",
  /ATH writer|NOT IMPLEMENTED|GAP/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P5.6-WORK-IDENTITY-WAVE2-SEED.md"), "utf8"),
  ),
);

console.log(`\nP5.6 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
