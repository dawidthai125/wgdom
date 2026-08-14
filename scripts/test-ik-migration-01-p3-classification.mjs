/**
 * IK-MIGRATION-01 P3 — Classification Gate over Master BOQ.
 * Run: npx vite-node scripts/test-ik-migration-01-p3-classification.mjs
 *
 * Covers A–O (unit) + Gate A. Live 430 reconciliation = probe / --live.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
  classifyEstimatorPricingPlane,
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMasterBoqClassification,
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";

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

function readyExpertWithLines(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-test-p3",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { detectedRowCount: lines.length, extractedCount: lines.length, validCount: lines.length, executed: true, gaps: [] },
    validation: { missingDescription: 0, missingQuantity: 0, missingUnit: 0, missingLineage: 0, duplicateSuspicion: 0, reasons: [] },
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
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines,
  };
}

const laborId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "LABOR")?.[0];
const materialId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "MATERIAL")?.[0];
const compoundId = Object.entries(ESTIMATOR_OWNER_CLASSIFICATION_MAP).find(([, p]) => p === "COMPOUND")?.[0];

assert("A labor seed id", Boolean(laborId), laborId);
assert("B material seed id", Boolean(materialId), materialId);
assert("C compound seed id", Boolean(compoundId), compoundId);

const synthetic = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-labor",
      lp: "10",
      description: "Demontaż istniejącej wykładziny",
      catalogWorkId: laborId,
      quantity: 12.5,
      unit: "m2",
      workCategory: "construction",
    }),
    provenance: provenance("L-labor", "construction"),
  },
  {
    dwellingId: "nasturcjowa",
    line: minimalLine({
      lineId: "L-mat",
      lp: "20",
      description: "Farba lateksowa do ścian, biała",
      catalogWorkId: materialId,
      quantity: 18,
      unit: "l",
      workCategory: "construction",
    }),
    provenance: provenance("L-mat", "construction"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-both",
      lp: "30",
      description: "Zabezpieczenie folią + robocizna",
      catalogWorkId: compoundId,
      quantity: 1,
      unit: "kpl",
      workCategory: "electrical",
    }),
    provenance: provenance("L-both", "el"),
  },
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-unres",
      lp: "40",
      description: "Pozycja bez tożsamości katalogowej",
      catalogWorkId: null,
      quantity: 3,
      unit: "szt",
      workCategory: "sanitary",
    }),
    provenance: {
      ...provenance("L-unres", "construction"),
      branchHint: "sanitary",
      sourceDocumentId: "doc-san",
      sourceLineKey: "lp:L-unres",
    },
  },
];

const item = { id: "t-test-p3", tenderId: "t-test-p3", title: "P3 unit", status: "seen", updatedAt: new Date().toISOString() };
const expert = readyExpertWithLines(synthetic);
const report = runIkMasterBoqClassification({ item, expert });

assert("A labor plane", report.counts.LABOR === 1 && report.lines[0].plane === "LABOR", report.counts);
assert("B material plane", report.counts.MATERIAL === 1 && report.lines[1].plane === "MATERIAL", report.counts);
assert("C both/compound plane", report.counts.COMPOUND === 1 && report.lines[2].handoff === "BOTH_HOLD", report.lines[2]);
assert("D unresolved/unknown", report.counts.UNKNOWN === 1 && report.lines[3].handoff === "UNRESOLVED", report.lines[3]);
assert("E dwelling preserved", report.dwellingPreservation
  && report.lines[0].dwellingId === "kotlarska"
  && report.lines[3].dwellingId === "zernicka");
assert("F branch preserved", report.branchPreservation
  && report.lines[0].branch === "construction"
  && report.lines[2].branch === "electrical"
  && report.lines[3].branch === "sanitary", report.lines.map((l) => l.branch));
assert("G provenance preserved", report.provenancePreservation
  && report.lines[0].sourceDocumentId === "doc-construction"
  && report.lines[3].sourceLineKey === "lp:L-unres");
assert("H quantity preserved", report.lines.every((l, i) => l.quantity === synthetic[i].line.quantity));
assert("I unit preserved", report.lines.every((l, i) => l.unit === synthetic[i].line.unit));
assert("J exact count reconciliation", report.reconciliation.ok
  && report.inputLineCount === 4
  && report.outputLineCount === 4
  && report.counts.LABOR + report.counts.MATERIAL + report.counts.COMPOUND + report.counts.UNKNOWN === 4);
assert("K no silent loss", report.reconciliation.unexplainedLoss === 0);
assert("L no silent duplication", report.reconciliation.unexplainedDuplication === 0);
assert("M no pricing", report.pricingExecuted === false
  && report.lines.every((l) => l.classify.schemaVersion === 1));
assert("N no research", report.researchExecuted === false
  && !report.lines.some((l) => l.classify.allowLaborResearch && l.plane === "UNKNOWN"));
assert("O no auto-Accept", report.autoAcceptExecuted === false);

// Gate A — default OFF → NG-10
forceIkEntryEnabledForTests(null);
assert("Gate A ikEntryEnabled OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A firstScreen ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");

// EC facts when classification provided
forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  classification: report,
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
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert("EC CLASSIFICATION_STARTED", events.includes("CLASSIFICATION_STARTED"));
assert("EC CLASSIFICATION_COMPLETED", events.includes("CLASSIFICATION_COMPLETED"));
assert("EC LABOR_LINES_IDENTIFIED", events.includes("LABOR_LINES_IDENTIFIED"));
assert("EC MATERIAL_LINES_IDENTIFIED", events.includes("MATERIAL_LINES_IDENTIFIED"));
assert("EC UNRESOLVED_LINES", events.includes("UNRESOLVED_LINES"));
assert("EC CLASSIFICATION_STATUS", events.includes("CLASSIFICATION_STATUS"));
assert("EC sourceRef classification", vm.steps.some((s) => s.event === "CLASSIFICATION_COMPLETED" && s.sourceRef?.kind === "classification"));
assert("EC no fake pricing claim", !vm.steps.some((s) => /wycen|priced|kosztorys gotowy/i.test(s.messagePl || "") && s.event?.startsWith("CLASSIFICATION")));

// A1: namePl alone never invents LABOR
const invent = classifyEstimatorPricingPlane({
  namePl: "Demontaż istniejącej wykładziny",
  unit: "m2",
});
assert("A1 no invent from namePl", invent.plane === "UNKNOWN" && invent.hold === true);

// Blocked without READY
const blocked = runIkMasterBoqClassification({
  item,
  expert: { ...expert, masterBoq: { ...expert.masterBoq, readyForExperts: false, status: "partial" }, status: "partial", masterBoqLines: [] },
});
assert("blocked when Master not READY", blocked.status === "blocked" && blocked.outputLineCount === 0);

// Allowlist / no NG-10 delete / no ATH writer / no research imports in ik-classification
const classSrc = readFileSync(join(root, "src/lib/intelligent-estimator/ik-classification.ts"), "utf8");
assert("no Castorama/Leroy/OBI", !/castorama|leroy|obi\.pl|work-rate-research|price-memory|owner-accept/i.test(classSrc));
assert("no F5/Bid/position-cost", !/tender-position-cost|useTenderPricingAuto|computeTenderBidProposal/i.test(classSrc));
assert("reuses classifyEstimatorPricingPlane", /classifyEstimatorPricingPlane/.test(classSrc));

const ng10 = readFileSync(join(root, "src/app/TenderDetailPage.tsx"), "utf8");
assert("NG-10 path retained in TenderDetailPage", /resolveIkDetailFirstScreen|ng10_gate|TenderAutonomous/.test(ng10));

forceIkEntryEnabledForTests(null);

console.log(`\nP3 unit: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
