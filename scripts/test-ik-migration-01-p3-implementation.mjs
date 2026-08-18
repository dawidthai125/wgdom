/**
 * IK-MIGRATION-01 P3 IMPLEMENTATION — Classification + Identity under IK.
 * Matrix A–AD (Owner brief) · sole lever IDENTITY_COVERAGE (default OFF).
 * Run: npx vite-node scripts/test-ik-migration-01-p3-implementation.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultAppSettings,
  mergeAppSettings,
  APP_SETTINGS_KEY,
} from "../src/lib/app-settings.ts";
import {
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
  forceIkEntryEnabledForTests,
  forceIkAutoIngestForTests,
  forceIkIdentityCoverageForTests,
  isIkEntryEnabled,
  isIkAutoIngestEnabled,
  isIkIdentityCoverageEnabled,
  isIkP2DocumentsBoqActive,
  isIkP3IdentityCoverageActive,
  resolveIkDetailFirstScreen,
  classifyEstimatorPricingPlane,
  runIkMasterBoqClassification,
  runIkMasterBoqIdentityCoverage,
  buildIkEntryConversationViewModel,
  runIkDocumentExpert,
} from "../src/lib/intelligent-estimator/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
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

function reset() {
  mem.clear();
  forceIkEntryEnabledForTests(null);
  forceIkAutoIngestForTests(null);
  forceIkIdentityCoverageForTests(null);
}

function setSettings(partial) {
  mem.set(APP_SETTINGS_KEY, JSON.stringify({ ...defaultAppSettings(), ...partial }));
}

function minimalLine(opts) {
  return {
    lineId: opts.lineId,
    lp: opts.lp ?? "1",
    description: opts.description,
    quantity: opts.quantity ?? 1,
    quantityRaw: String(opts.quantity ?? 1),
    unit: opts.unit ?? "m2",
    catalogWorkId: opts.catalogWorkId ?? null,
    workCategory: opts.workCategory ?? "construction",
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

function provenance(lineId, dwellingBranch) {
  return {
    lineId,
    sourceDocumentId: `doc-${dwellingBranch}`,
    sourceDocumentIds: [`doc-${dwellingBranch}`],
    sourceArtifactId: `art-${dwellingBranch}`,
    sourceArtifactIds: [`art-${dwellingBranch}`],
    branchHint: dwellingBranch === "el" ? "electrical" : "construction",
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpertWithLines(lines, overrides = {}) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-test-p3-impl",
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
      ...overrides.masterBoq,
    },
    status: overrides.status ?? "ready",
    reasons: overrides.reasons ?? [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines: overrides.masterBoqLines ?? masterBoqLines,
  };
}

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
const settingsSrc = readSrc("src/lib/app-settings.ts");
const adminSrc = readSrc("src/app/AdminSettingsModal.tsx");
const classSrc = readSrc("src/lib/intelligent-estimator/ik-classification.ts");
const covSrc = readSrc("src/lib/intelligent-estimator/ik-identity-coverage.ts");
const convSrc = readSrc("src/lib/intelligent-estimator/ik-entry-conversation.ts");
const detailSrc = readSrc("src/app/TenderDetailPage.tsx");

const laborId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "LABOR")?.[0];
const materialId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "MATERIAL")?.[0];
const compoundId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "COMPOUND")?.[0];

const synthetic = [
  {
    dwellingId: "d1",
    line: minimalLine({
      lineId: "L-labor",
      description: "Demontaż wykładziny",
      catalogWorkId: laborId,
      quantity: 12.5,
      unit: "m2",
    }),
    provenance: provenance("L-labor", "construction"),
  },
  {
    dwellingId: "d1",
    line: minimalLine({
      lineId: "L-mat",
      description: "Farba lateksowa",
      catalogWorkId: materialId,
      quantity: 18,
      unit: "l",
    }),
    provenance: provenance("L-mat", "construction"),
  },
  {
    dwellingId: "d1",
    line: minimalLine({
      lineId: "L-both",
      description: "Zabezpieczenie + robocizna",
      catalogWorkId: compoundId,
      quantity: 1,
      unit: "kpl",
    }),
    provenance: provenance("L-both", "el"),
  },
  {
    dwellingId: "d1",
    line: minimalLine({
      lineId: "L-unres",
      description: "Pozycja bez tożsamości",
      catalogWorkId: null,
      quantity: 3,
      unit: "szt",
    }),
    provenance: provenance("L-unres", "construction"),
  },
];

const item = {
  id: "t-test-p3-impl",
  tenderId: "t-test-p3-impl",
  title: "P3 impl",
  status: "seen",
  updatedAt: "2026-08-16T00:00:00.000Z",
};

// --- A: IK OFF (forced) — first-screen class still ik_entry (P10) ---
reset();
assert("A default ikEntry ON (P10)", defaultAppSettings().ikEntryEnabled === true);
forceIkEntryEnabledForTests(false);
assert("A isIkEntryEnabled forced false", isIkEntryEnabled() === false);
assert("A first screen ik_entry", resolveIkDetailFirstScreen(false) === "ik_entry");
assert("A DetailPage Gate absent", !/TenderAutonomousGate/.test(detailSrc));

// --- B: IK ON + AUTO OFF → Entry Shell ---
reset();
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: false, ikIdentityCoverageEnabled: false });
forceIkEntryEnabledForTests(true);
assert("B IK ON", isIkEntryEnabled() === true);
assert("B leftover AUTO OFF", isIkAutoIngestEnabled() === false);
assert("B P2 active (08-P0 IK ON implies ingest gate)", isIkP2DocumentsBoqActive() === true);
assert("B P3 coverage inactive", isIkP3IdentityCoverageActive() === false);
assert("B first screen ik_entry", resolveIkDetailFirstScreen(true) === "ik_entry");

// --- C: IK ON + AUTO ON → P2 ---
reset();
setSettings({ ikEntryEnabled: true, ikAutoIngestEnabled: true });
forceIkEntryEnabledForTests(true);
assert("C P2 active", isIkP2DocumentsBoqActive() === true);
assert("C coverage still OFF by default", isIkIdentityCoverageEnabled() === false);

// --- Defaults / levers ---
reset();
assert("default IDENTITY_COVERAGE OFF", defaultAppSettings().ikIdentityCoverageEnabled === false);
assert("EXECUTE_RESEARCH const false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert("RUN_RATE_EXPERTS const false", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));
assert("IDENTITY_COVERAGE compile sentinel false", /IK_ENTRY_SHELL_IDENTITY_COVERAGE\s*=\s*false/.test(hostSrc));
assert("Host runtime identityCoverageOn", /isIkIdentityCoverageEnabled/.test(hostSrc));
assert("Host gates coverage", /if\s*\(\s*!identityCoverageOn\s*\)/.test(hostSrc));
assert("Admin IDENTITY toggle", /data-ik-identity-coverage-toggle/.test(adminSrc));
assert("Settings field present", /ikIdentityCoverageEnabled/.test(settingsSrc));
assert("mergeIkIdentityCoverageEnabled", /mergeIkIdentityCoverageEnabled/.test(settingsSrc));
assert("flag isIkP3IdentityCoverageActive", /isIkP3IdentityCoverageActive/.test(flagSrc));
assert("flag forceIkIdentityCoverageForTests", /forceIkIdentityCoverageForTests/.test(flagSrc));

const mergedCov = mergeAppSettings(
  { ikEntryEnabled: true, ikIdentityCoverageEnabled: true },
  defaultAppSettings(),
);
assert("merge coverage ON does not flip D", mergedCov.expertAiDecydentEnabled === false);
assert("merge coverage ON sets field", mergedCov.ikIdentityCoverageEnabled === true);
assert("merge coverage does not flip AUTO", mergedCov.ikAutoIngestEnabled === false);

// --- D: READY → classification ---
const expertReady = readyExpertWithLines(synthetic);
const classReady = runIkMasterBoqClassification({ item, expert: expertReady });
assert("D classification status ready/partial", classReady.status === "ready" || classReady.status === "partial");
assert("D output 4 lines", classReady.outputLineCount === 4);
assert("D researchExecuted false", classReady.researchExecuted === false);
assert("D pricingExecuted false", classReady.pricingExecuted === false);
assert("D autoAcceptExecuted false", classReady.autoAcceptExecuted === false);

const vmReady = buildIkEntryConversationViewModel(item, {
  classification: classReady,
  ingest: {
    phase: "completed",
    started: true,
    completed: true,
    tenderId: item.id,
    documentsUsed: 1,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 1,
    extractedLineCount: 4,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert: expertReady,
  },
});
const eventsReady = vmReady.steps.map((s) => s.event).filter(Boolean);
assert("D EC CLASSIFICATION_STARTED", eventsReady.includes("CLASSIFICATION_STARTED"));
assert("D EC CLASSIFICATION_COMPLETED", eventsReady.includes("CLASSIFICATION_COMPLETED"));

// --- E: PARTIAL allowed subset (readyForExperts false → blocked classify) ---
const expertPartial = readyExpertWithLines(synthetic, {
  status: "partial",
  masterBoq: { readyForExperts: false, status: "partial" },
  masterBoqLines: [],
});
const classPartial = runIkMasterBoqClassification({ item, expert: expertPartial });
assert("E/F HOLD-like blocked when not READY", classPartial.status === "blocked");
assert("E blocked output 0", classPartial.outputLineCount === 0);

// PARTIAL with readyForExperts true still classifies (allowed subset path)
const expertPartialReady = readyExpertWithLines(synthetic.slice(0, 2), {
  status: "partial",
  masterBoq: { readyForExperts: true, status: "partial", lineCount: 2 },
});
const classPartialOk = runIkMasterBoqClassification({ item, expert: expertPartialReady });
assert("E PARTIAL subset when readyForExperts", classPartialOk.outputLineCount === 2);

// --- F/G: HOLD / GAP blocked ---
const expertHold = readyExpertWithLines([], {
  status: "hold",
  reasons: ["HOLD_TECHNICAL"],
  masterBoq: { readyForExperts: false, status: "hold", lineCount: 0 },
  masterBoqLines: [],
});
assert("F HOLD not readyForExperts", expertHold.masterBoq.readyForExperts === false);
const classHold = runIkMasterBoqClassification({ item, expert: expertHold });
assert("F HOLD classification blocked", classHold.status === "blocked");

const expertGap = readyExpertWithLines([], {
  status: "gap",
  reasons: ["PARSER_EMPTY"],
  masterBoq: { readyForExperts: false, status: "gap", lineCount: 0 },
  masterBoqLines: [],
});
const classGap = runIkMasterBoqClassification({ item, expert: expertGap });
assert("G GAP classification blocked", classGap.status === "blocked");
assert("G PARSER_EMPTY ≠ market invent in class", !/marketAbsence|MARKET_ABSENCE/.test(classSrc));

// --- H–K planes ---
assert("H LABOR", classReady.counts.LABOR === 1 && classReady.lines[0].plane === "LABOR");
assert("I MATERIAL", classReady.counts.MATERIAL === 1 && classReady.lines[1].plane === "MATERIAL");
assert("J COMPOUND", classReady.counts.COMPOUND === 1 && classReady.lines[2].handoff === "BOTH_HOLD");
assert("K UNKNOWN", classReady.counts.UNKNOWN === 1 && classReady.lines[3].handoff === "UNRESOLVED");

// --- L/M thin identity (SSOT names) ---
assert(
  "L exact identity HAS_WORK_ID / HAS_MATERIAL_KEY",
  classReady.lines[0].identityStatus === "HAS_WORK_ID"
    || classReady.lines[0].identityStatus === "WORK_ID_NO_OWNER_SEED",
);
assert(
  "M material identity key or work",
  classReady.lines[1].identityStatus === "HAS_WORK_ID"
    || classReady.lines[1].identityStatus === "HAS_MATERIAL_KEY"
    || classReady.lines[1].identityStatus === "WORK_ID_NO_OWNER_SEED",
);

// --- N REVIEW (WORK_ID_NO_OWNER_SEED / AMBIGUOUS alias) ≠ ACCEPT ---
const inventPlane = classifyEstimatorPricingPlane({
  namePl: "Demontaż istniejącej wykładziny",
  unit: "m2",
});
assert("N A1 no invent → UNKNOWN/REVIEW path", inventPlane.plane === "UNKNOWN" && inventPlane.hold === true);
assert("N REVIEW ≠ ACCEPT in host", !/REVIEW\s*→\s*ACCEPT|autoAcceptFromReview/.test(hostSrc));

// --- O NO_MATCH / MISSING_IDENTITY ---
assert("O UNKNOWN line MISSING_IDENTITY", classReady.lines[3].identityStatus === "MISSING_IDENTITY");
assert("O NO_MATCH ≠ market absence", !/NO_MATCH.*market|marketAbsence/.test(classSrc + covSrc));

// --- P/Q provenance ---
assert("P sourceDocumentId preserved", classReady.lines[0].sourceDocumentId === "doc-construction");
assert("Q provenancePreservation", classReady.provenancePreservation === true);
assert("Q quantityUnitPreservation", classReady.quantityUnitPreservation === true);

// --- R unit mismatch safety (no auto remap) ---
assert(
  "R no auto unit remap in P3 stack",
  !/m²\s*→\s*szt|m2\s*->\s*szt|remapUnitAuto|kg\s*↔\s*szt/.test(hostSrc + classSrc + covSrc),
);
assert("R units unchanged", classReady.lines.every((l, i) => l.unit === synthetic[i].line.unit));

// --- S: IDENTITY_COVERAGE OFF ---
reset();
setSettings({ ikEntryEnabled: true, ikIdentityCoverageEnabled: false });
forceIkEntryEnabledForTests(true);
forceIkIdentityCoverageForTests(false);
assert("S coverage OFF", isIkIdentityCoverageEnabled() === false);
assert("S P3 active false", isIkP3IdentityCoverageActive() === false);
assert("S host skips coverage when OFF", /if\s*\(\s*!identityCoverageOn\s*\)\s*return null/.test(hostSrc));

// --- T: IDENTITY_COVERAGE ON ---
forceIkIdentityCoverageForTests(true);
assert("T coverage ON", isIkIdentityCoverageEnabled() === true);
assert("T P3 active", isIkP3IdentityCoverageActive() === true);

const covReport = runIkMasterBoqIdentityCoverage({
  item,
  expert: expertReady,
});
assert("T coverage report produced", Boolean(covReport) && typeof covReport.status === "string");
assert("T coverage researchExecuted false", covReport.researchExecuted === false);
assert("T coverage pricingExecuted false", covReport.pricingExecuted === false);
assert("T coverage seedCreated 0", covReport.wave2SeedAudit?.seedCreated === 0);

const vmCov = buildIkEntryConversationViewModel(item, {
  classification: classReady,
  identityCoverage: covReport,
  ingest: {
    phase: "completed",
    started: true,
    completed: true,
    tenderId: item.id,
    documentsUsed: 1,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 1,
    extractedLineCount: 4,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert: expertReady,
  },
});
assert("T EC has identity or classification facts", vmCov.steps.some((s) =>
  String(s.event || "").includes("CLASSIFICATION")
  || String(s.event || "").includes("IDENTITY")
  || String(s.id || "").includes("identity"),
));

// --- U: ON does not research ---
assert("U no executeResearch true", !/executeResearch:\s*true/.test(hostSrc));
assert("U research uses explicit P5/P6 mode flags (not undefined default)",
  /executeResearch:\s*p5ResearchOn === true/.test(hostSrc)
  && /executeResearch:\s*p6ResearchOn === true/.test(hostSrc));
assert("U EXECUTE_RESEARCH shell const remains false", /IK_ENTRY_SHELL_EXECUTE_RESEARCH\s*=\s*false/.test(hostSrc));
assert("U coverage ON ≠ EXECUTE_RESEARCH in flag doc", /Does NOT enable research/.test(flagSrc));

// --- V–Z: no HTTP / Accept / CatalogWrite / F5 / Bid ---
assert("V no Castorama/Leroy HTTP in class", !/castorama|leroy|obi\.pl|work-rate-research/i.test(classSrc));
assert("V no pricing HTTP in coverage", !/castorama|leroymerlin|fetch\(|http\.get/i.test(covSrc));
// P8 LOCKED telemetry (`data-ik-p8-auto-accept` / `autoAcceptExecuted`) ≠ Accept call
// (Option B / P9 Owner GO — same hostAcceptProbe class as P2).
const hostAcceptProbe = hostSrc
  .replace(/data-ik-p8-auto-accept/g, "")
  .replace(/autoAcceptExecuted/g, "");
assert(
  "W no Accept in host P3 path",
  !/acceptCatalog|AcceptCandidate/.test(hostAcceptProbe) &&
    !/\bautoAccept\s*\(/.test(hostAcceptProbe),
);
assert("W class autoAcceptExecuted type false", /autoAcceptExecuted:\s*false/.test(classSrc));
assert("X no CatalogWork write in class/cov", !/createCatalogWork|writeCatalogWork|bindCatalogWork\s*\(/.test(classSrc + covSrc));
assert("X seedCreated always 0 comment", /seedCreated:\s*0/.test(covSrc));
assert("Y no F5 in class", !/tender-position-cost|useTenderPricingAuto|computeTenderBidProposal/.test(classSrc));
assert("Z no Bid in host", !/computeTenderBidProposal|BidProposal/.test(hostSrc));
assert("Z RUN_RATE_EXPERTS gated OFF", /IK_ENTRY_SHELL_RUN_RATE_EXPERTS\s*=\s*false/.test(hostSrc));

// --- AA–AD: P5.26/27/31/32 unchanged (presence + no P5.33 invent) ---
assert("AA P5.26 fix category pass2 test exists", existsSync(join(root, "scripts/test-ik-migration-01-p526-fix-category-pass2.mjs")));
assert("AB P5.27 docs/tests present",
  existsSync(join(root, "docs/architecture/IK-MIGRATION-01-P5.27-FIX-EXISTING-CATEGORY-REUSE.md"))
  || existsSync(join(root, "scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs")));
assert(
  "AC P5.31 category keys locked flooring",
  existsSync(join(root, "docs/architecture"))
  && !/createCategoryKey\(|newCategoryKey\s*=/.test(hostSrc + classSrc),
);
assert(
  "AD no P5.33 invent",
  !/P5\.33|p533/.test(hostSrc + classSrc + flagSrc),
);

// Category keys must not be auto-created in P3
assert(
  "no new category key invent in P3",
  !/repairs_wall_v2|joinery_finish_new|flooring_v2/.test(hostSrc + classSrc + covSrc),
);

// Handoff STOP — no auto research from classification events
assert(
  "H handoff STOP — EC does not call labor expert",
  !/runIkMasterBoqLaborExpert/.test(convSrc),
);
assert(
  "H handoff STOP — EC does not call material expert",
  !/runIkMasterBoqMaterialExpert/.test(convSrc),
);
assert("reuse classifyEstimatorPricingPlane", /classifyEstimatorPricingPlane/.test(classSrc));
assert("reuse runIkMasterBoqIdentityCoverage in host", /runIkMasterBoqIdentityCoverage/.test(hostSrc));
assert("no ClassificationV2", !/ClassificationV2|IdentityEngineV2/.test(hostSrc + classSrc));

// Document Expert smoke for READY path (integration with P2)
const readyRows = [
  { lp: "1", description: "Układanie kabla", unit: "mb", quantity: "12", unitPrice: "", total: "" },
];
const readyItem = {
  id: "t-p3-doc",
  tenderId: "t-p3-doc",
  title: "doc",
  status: "seen",
  updatedAt: "2026-08-16T00:00:00.000Z",
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
  bzpDocuments: [
    { index: 0, documentId: "doc-1", filename: "koszt.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "koszt.ath",
      rowCount: 1,
      rows: readyRows,
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: "2026-08-15T00:00:00.000Z",
    },
    scanSummary: {
      costBranchArtifacts: [{
        documentId: "doc-1",
        filename: "koszt.ath",
        branch: "construction",
        snapshot: {
          ok: true,
          sourceFilename: "koszt.ath",
          rowCount: 1,
          rows: readyRows,
          catalogQuantities: [],
          przedmiar: [],
          categories: [],
          warnings: [],
          parsedAt: "2026-08-15T00:00:00.000Z",
        },
      }],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
};
const docR = runIkDocumentExpert({ item: readyItem });
assert("D Document Expert produces BOQ lines", (docR.offerBoq?.lines?.length ?? 0) >= 1);

reset();
forceIkEntryEnabledForTests(null);
forceIkAutoIngestForTests(null);
forceIkIdentityCoverageForTests(null);

console.log(`\nP3 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
