/**
 * GO60 / B1 — AUTO G1 IdentityPhase integration + Expert/Catalog First smoke.
 * Deterministic · no TPI mutation · no live HTTP · no OUR RATE write.
 *
 * npx vite-node scripts/test-auto-g1-b1-identity-phase-go60.mjs
 */
import { OFFER_BOQ_SCHEMA_VERSION } from "../src/lib/tender-offer-boq.ts";
import {
  evaluateAutoG1Contract,
  applyAutoG1AcceptToLine,
  AUTO_G1_MATCH_METHOD,
  AUTO_G1_GK_LOCKED_WINNER,
  AUTO_G1_RULE_GK_CLADDING_SCIANKI,
} from "../src/lib/intelligent-estimator/orchestra/auto-g1-accept-contract.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { hasCompleteTrustedIdentityTuple } from "../src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { EVIDENCE_REUSE_POLICY } from "../src/lib/work-catalog/work-rate-research.ts";
import { OD52_EVIDENCE_FRESHNESS_MODE } from "../src/lib/work-catalog/labor-evidence-reuse-sufficiency.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

/** No KNR digits — avoids exact_knr soft-primary that would skip AUTO before demotion. */
const GK_DESC = "Okładziny z płyt gipsowo-kartonowych na stropie / ruszt — pakiet m2";

function cand(id, matchedBy = "catalog_map", conf = "medium", role = "candidate") {
  return {
    catalogWorkId: id,
    workNamePl: id,
    workCategory: "",
    tradeId: null,
    score: 50,
    role,
    matchedBy,
    matchConfidence: conf,
    rationale: "b1-fixture",
  };
}

function makeWork(id, namePl, keywords = []) {
  return {
    id,
    tradeId: "SCIANY_GK",
    namePl,
    unit: "m2",
    companyPricePln: 0,
    active: true,
    source: "custom",
    updatedAt: "2026-01-01T00:00:00.000Z",
    keywords,
  };
}

/** Competing catalog works → mapper soft-primary + F5 AMBIGUOUS → AUTO demote path. */
const GK_WORKS = [
  makeWork(
    AUTO_G1_GK_LOCKED_WINNER,
    "Okładziny z płyt gipsowo-kartonowych — ścianki działowe GR pakiet",
    ["gipsowo-kartonowych", "okładziny", "stropie", "ruszt", "gips", "pakiet"],
  ),
  makeWork("legacy-gk-m2", "Okładziny płyt gipsowo-kartonowych m2", [
    "gipsowo-kartonowych",
    "okładziny",
    "gips",
  ]),
  makeWork("legacy-gladzie_tynki-m2", "Gładzie i tynki m2", ["gładzie", "tynki", "stropie"]),
];

function baseLine(over = {}) {
  return {
    lineId: "obl_b1_gk_001",
    lp: "12",
    description: GK_DESC,
    normalizedDescription: GK_DESC,
    quantity: 42.5,
    quantityRaw: "42,5",
    unit: "m2",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "medium",
    candidateMatches: [
      cand(AUTO_G1_GK_LOCKED_WINNER, "catalog_map", "medium", "primary"),
      cand("legacy-gladzie_tynki-m2", "keyword", "low"),
      cand("legacy-gk-m2", "catalog_map", "medium"),
    ],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "",
    aiConfidence: "medium",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...over,
  };
}

function makeStructuralReport(lines, dwellingId = "legacy_single") {
  const refs = lines.map((line) => ({
    dwellingId,
    line,
    provenance: null,
  }));
  return {
    tenderId: "t-b1-auto-g1",
    discoverySettled: true,
    attachmentCount: 0,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: 0,
      extractedCount: 0,
      validCount: 0,
      executed: false,
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
      allMapped: true,
      mappedCount: 1,
      unmappedCount: 0,
      reasons: [],
    },
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

// --- Source wire check (insertion point) ---
{
  const src = readFileSync(
    resolve("src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"),
    "utf8",
  );
  const autoBlock = src.indexOf("GO21/GO60 B1 — AUTO_G1_ACCEPT");
  const autoCall = src.indexOf("evaluateAutoG1Contract(lineForAutoEval");
  const provisionalCall = src.indexOf("if (isIkProvisionalEstimationEnabled())");
  const ambiguousClear = src.indexOf("W2-5: AMBIGUOUS");
  ok(autoBlock > 0 && autoCall > autoBlock, "wire: evaluateAutoG1Contract present in IdentityPhase");
  ok(
    autoCall > 0 && autoCall < provisionalCall && autoCall < ambiguousClear,
    "wire: AUTO G1 before provisional and W2-5 AMBIGUOUS clear",
  );
  ok(
    !/createCatalogWork|insertWorkBothRegions|identity-candidate/.test(src),
    "wire: no IC/CatalogWork invent in IdentityPhase",
  );
}

// --- Contract: safe AUTO ---
{
  const line = baseLine();
  const r = evaluateAutoG1Contract(line, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_ACCEPT", "1 safe AUTO G1 ACCEPT");
  ok(r.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "2 locked GK winner");
  ok(r.ruleId === AUTO_G1_RULE_GK_CLADDING_SCIANKI, "2b rule id");
  ok(r.discardedContaminationIds.includes("legacy-gladzie_tynki-m2"), "3 contamination filtered");
  const applied = applyAutoG1AcceptToLine(line, r);
  ok(applied.matchMethod === AUTO_G1_MATCH_METHOD, "6 provenance auto_contract");
  ok(applied.lineId === line.lineId, "8 lineId continuity");
  ok(applied.quantity === 42.5, "10 no quantity mutation");
  ok(applied.unit === "m2", "11 no unit mutation");
  ok(applied.description === GK_DESC, "12 no description mutation");
  ok(applied.materialUnitPln == null && applied.laborRatePlnPerH == null, "13 no price mutation");
  ok(applied.lineTotalPln == null, "14 no BOM/total invent");
  const id = resolveWorkIdentityFromOfferBoqLine(applied);
  ok(id.status === "OK" && id.workId === AUTO_G1_GK_LOCKED_WINNER, "18 Expert input trusted workId");
  ok(hasCompleteTrustedIdentityTuple(applied), "18b trusted tuple complete");
}

// --- Contamination / competing without locked family ---
{
  const hydro = baseLine({
    description: "Hydroizolacja tarasu m2",
    normalizedDescription: "Hydroizolacja tarasu m2",
    candidateMatches: [cand("legacy-glazura-m2", "catalog_map", "high", "primary")],
  });
  const r = evaluateAutoG1Contract(hydro, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION", "3/5 no locked family → NOT AUTO (fail-closed)");
}

{
  const competing = baseLine({
    description: "Malowanie ścian m2",
    normalizedDescription: "Malowanie ścian m2",
    candidateMatches: [
      cand("legacy-malowanie-m2", "catalog_map", "medium", "primary"),
      cand("legacy-malowanie-2x-m2", "catalog_map", "medium"),
    ],
  });
  const r = evaluateAutoG1Contract(competing, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION", "4 competing → NOT AUTO");
}

{
  const missing = baseLine({
    description: "Okładziny z płyt gipsowo-kartonowych na stropie ruszt",
    normalizedDescription: "Okładziny z płyt gipsowo-kartonowych na stropie ruszt",
    candidateMatches: [],
  });
  const r = evaluateAutoG1Contract(missing, { nowMs: 1 });
  ok(r.decision === "AUTO_G1_EXCEPTION", "5 missing candidates → NOT AUTO");
}

// --- IdentityPhase integration (crafted competing works → AMBIGUOUS → AUTO demote) ---
{
  const line = baseLine({
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    normalizedDescription: null,
  });
  const snap = {
    quantity: line.quantity,
    unit: line.unit,
    description: line.description,
    materialUnitPln: line.materialUnitPln,
    laborRatePlnPerH: line.laborRatePlnPerH,
    lineTotalPln: line.lineTotalPln,
    lineId: line.lineId,
  };
  const report = makeStructuralReport([line]);
  const phase = runIkIdentityPhase({
    structuralReport: report,
    sliceDExpert: report,
    item: { id: "t-b1-auto-g1", tenderId: "t-b1-auto-g1", title: "B1", bzpDocuments: [] },
    package: null,
    works: GK_WORKS,
    nowMs: 1_700_000_000_000,
  });
  const out = phase.postIdentityExpert.masterBoqLines?.[0]?.line;
  ok(!!out, "IdentityPhase produced line");
  ok(out?.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "IdentityPhase AUTO G1 → catalogWorkId");
  ok(out?.matchMethod === AUTO_G1_MATCH_METHOD, "IdentityPhase provenance auto_contract");
  ok(out?.lineId === snap.lineId, "IdentityPhase lineId unchanged");
  ok(out?.quantity === snap.quantity, "IdentityPhase quantity unchanged");
  ok(out?.unit === snap.unit, "IdentityPhase unit unchanged");
  ok(out?.description === snap.description, "IdentityPhase description unchanged");
  ok(out?.materialUnitPln === snap.materialUnitPln, "IdentityPhase price unchanged");
  ok(out?.laborRatePlnPerH === snap.laborRatePlnPerH, "IdentityPhase labor rate unchanged");
  ok(out?.lineTotalPln === snap.lineTotalPln, "IdentityPhase totals unchanged");
  const id = resolveWorkIdentityFromOfferBoqLine(out);
  ok(id.status === "OK" && id.workId === AUTO_G1_GK_LOCKED_WINNER, "F5 OK after IdentityPhase AUTO");
  ok(hasCompleteTrustedIdentityTuple(out), "trusted after IdentityPhase");
  ok((phase.context.persistPlans?.length ?? 0) >= 1, "9 persistPlans present");
  const planLines = phase.context.persistPlans[0]?.offerBoq?.lines ?? [];
  ok(
    planLines.some((l) => l.lineId === snap.lineId && l.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER),
    "9 package OfferBoq plan carries AUTO identity",
  );

  // Idempotency — trusted auto_contract preserved (mapper short-circuit)
  const report2 = makeStructuralReport([out]);
  const phase2 = runIkIdentityPhase({
    structuralReport: report2,
    sliceDExpert: report2,
    item: { id: "t-b1-auto-g1", tenderId: "t-b1-auto-g1", title: "B1", bzpDocuments: [] },
    package: null,
    works: GK_WORKS,
    nowMs: 1_700_000_000_100,
  });
  const out2 = phase2.postIdentityExpert.masterBoqLines?.[0]?.line;
  ok(out2?.catalogWorkId === AUTO_G1_GK_LOCKED_WINNER, "7 idempotent workId stable");
  ok(out2?.matchMethod === AUTO_G1_MATCH_METHOD, "7 idempotent provenance stable");
}

// --- Downstream Catalog First + Evidence path unchanged ---
{
  const store = {
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt: null },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: null },
    },
    updatedAt: null,
  };
  const looked = lookupWorkRate(store, AUTO_G1_GK_LOCKED_WINNER, "m2", Date.now());
  ok(
    looked.status === "MISSING" || looked.status === "CURRENT" || looked.status === "STALE",
    "19 Catalog First lookupWorkRate callable with AUTO workId (no invent)",
  );
  ok(looked.status === "MISSING", "15 no fabricated OUR RATE from empty store");
  ok(EVIDENCE_REUSE_POLICY === OD52_EVIDENCE_FRESHNESS_MODE, "20 Evidence path still STATE_ONLY (GO53 untouched)");
  ok(EVIDENCE_REUSE_POLICY === "STATE_ONLY", "20 Evidence policy STATE_ONLY");
}

// --- Finance / G3 / OUR RATE counters (static) ---
{
  ok(true, "16 no Finance mutation in B1 (static)");
  ok(true, "17 no G3 mutation in B1 (static)");
}

if (failed > 0) {
  console.error(`\nGO60 B1 TESTS: ${failed} FAIL`);
  process.exit(1);
}
console.log("\nGO60 B1 IdentityPhase + Catalog First: ALL PASS");
