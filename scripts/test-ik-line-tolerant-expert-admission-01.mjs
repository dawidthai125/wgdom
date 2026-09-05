/**
 * IK-LINE-TOLERANT-EXPERT-ADMISSION-01 — contract tests.
 * Run: npx vite-node scripts/test-ik-line-tolerant-expert-admission-01.mjs
 *
 * ZERO cloud write · ZERO invent qty · DOCUMENT TRUTH ≠ EXPERT ADMISSION.
 */
import {
  buildIkExpertAdmissionSummary,
  isOfferBoqLineStructurallyAdmitted,
  resolveIkExpertAdmission,
} from "../src/lib/intelligent-estimator/ik-expert-admission.ts";
import { runIkIdentityPhase } from "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts";
import { computeShadowPositionCostForOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { loadWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${msg}`);
  } else {
    fail += 1;
    console.error(`FAIL ${msg}`);
  }
}

function line(partial) {
  return {
    lineId: "obl_test",
    lp: "1",
    description: "roboty test",
    quantity: 1,
    quantityRaw: "1",
    unit: "szt",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "none",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "none", labelPl: "—" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "none", labelPl: "—" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "none", labelPl: "—" },
    directCostPln: null,
    kpPln: null,
    zyskPln: null,
    totalPln: null,
    requiresUserReview: false,
    aiRationale: [],
    ...partial,
  };
}

// --- M readyForExperts semantic lock (predicate helpers) ---
{
  const ok = line({ lineId: "a1", quantity: 2, unit: "m2", description: "ok" });
  const badQty = line({
    lineId: "obl_6008ebc1",
    lp: "43",
    quantity: 0,
    quantityRaw: "0.00",
    unit: "szt",
    description: "demontaż stolarki drzwiowej",
  });
  assert(isOfferBoqLineStructurallyAdmitted(ok) === true, "M: qty>0 admitted");
  assert(isOfferBoqLineStructurallyAdmitted(badQty) === false, "M: qty=0 not admitted");

  const lines = Array.from({ length: 166 }, (_, i) =>
    line({ lineId: `ok_${i}`, lp: String(i + 1), quantity: 1 + (i % 3) }),
  );
  lines.push(badQty);

  const partialAdmission = buildIkExpertAdmissionSummary({
    documentStatus: "partial",
    readyForExperts: false,
    lines,
  });
  assert(partialAdmission.readyForExperts === false, "B: readyForExperts false on partial");
  assert(partialAdmission.expertChainMayProceed === true, "B: mayProceed true with 166 admitted");
  assert(partialAdmission.admittedCount === 166, "B: admittedCount 166");
  assert(partialAdmission.unresolvedCount === 1, "B: unresolvedCount 1");
  assert(
    partialAdmission.unresolvedLineIds.includes("obl_6008ebc1"),
    "B: LP43 lineId unresolved",
  );
  assert(
    !partialAdmission.admittedLineIds.includes("obl_6008ebc1"),
    "B: LP43 not admitted",
  );

  const readyAll = buildIkExpertAdmissionSummary({
    documentStatus: "ready",
    readyForExperts: true,
    lines: lines.slice(0, 166),
  });
  assert(readyAll.readyForExperts === true, "A/L: readyForExperts true");
  assert(readyAll.expertChainMayProceed === true, "A/L: mayProceed true");
  assert(readyAll.admittedCount === 166, "A: all admitted");
  assert(readyAll.unresolvedCount === 0, "A: no unresolved");

  const zero = buildIkExpertAdmissionSummary({
    documentStatus: "partial",
    readyForExperts: false,
    lines: [badQty, line({ lineId: "u2", quantity: 0, description: "x", unit: "szt" })],
  });
  assert(zero.admittedCount === 0, "K: admittedCount 0");
  assert(zero.expertChainMayProceed === false, "K: mayProceed false");

  const hold = buildIkExpertAdmissionSummary({
    documentStatus: "hold",
    readyForExperts: false,
    lines: [ok],
  });
  assert(hold.admittedCount === 1, "hold: line still classified admitted");
  assert(hold.globalIntegrityBlocker === true, "hold: global integrity blocker");
  assert(hold.expertChainMayProceed === false, "hold: mayProceed false");
}

// C/D missing unit / description
{
  const base = line({ lineId: "ok", quantity: 5, unit: "m", description: "ok" });
  const noUnit = line({ lineId: "nu", quantity: 5, unit: "  ", description: "ok" });
  const noDesc = line({ lineId: "nd", quantity: 5, unit: "szt", description: "(bez opisu)" });
  const s = buildIkExpertAdmissionSummary({
    documentStatus: "partial",
    readyForExperts: false,
    lines: [base, noUnit, noDesc],
  });
  assert(s.admittedCount === 1, "C/D: 1 admitted");
  assert(s.unresolvedCount === 2, "C/D: 2 unresolved");
  assert(s.expertChainMayProceed === true, "C/D: mayProceed");
  const nu = s.lines.find((l) => l.lineId === "nu");
  const nd = s.lines.find((l) => l.lineId === "nd");
  assert(nu?.reasons.includes("MISSING_UNIT"), "C: MISSING_UNIT");
  assert(nd?.reasons.includes("MISSING_DESCRIPTION"), "D: MISSING_DESCRIPTION");
}

// Noise skipped
{
  const noise = line({ lineId: "n1", isNoise: true, quantity: 0, unit: "", description: "" });
  const s = buildIkExpertAdmissionSummary({
    documentStatus: "partial",
    readyForExperts: false,
    lines: [noise, line({ lineId: "ok" })],
  });
  assert(s.skippedCount === 1, "noise skipped");
  assert(s.admittedCount === 1, "noise does not block admitted");
}

// Identity receives only ADMITTED lineIds
{
  const admitted = line({
    lineId: "adm_1",
    lp: "1",
    quantity: 2,
    unit: "szt",
    description: "montaz gniazda wtykowego podtynkowego",
  });
  const unresolved = line({
    lineId: "obl_6008ebc1",
    lp: "43",
    quantity: 0,
    quantityRaw: "0",
    unit: "szt",
    description: "demontaż",
  });
  const refs = [
    { dwellingId: "legacy_single", line: admitted, provenance: null },
    { dwellingId: "legacy_single", line: unresolved, provenance: null },
  ];
  const admission = buildIkExpertAdmissionSummary({
    documentStatus: "partial",
    readyForExperts: false,
    lines: [admitted, unresolved],
  });
  const structural = {
    tenderId: "t-test",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { detectedRowCount: 2, extractedCount: 2, validCount: 1, executed: true, gaps: [] },
    validation: {
      missingDescription: 0,
      missingQuantity: 1,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: ["MISSING_QUANTITY=1"],
    },
    dwellingMapping: {
      artifactCount: 0,
      mappedCount: 0,
      unmappedCount: 0,
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      complete: true,
      allMapped: true,
      ownerMapRequired: false,
      reasons: [],
      candidates: [],
      coverage: [],
      dwellings: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: 2,
      composedLineCount: 2,
      keepOneCollapses: 0,
      explainedLoss: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "legacy_single",
      schemaVersion: 5,
      lineCount: 2,
      composedLineCount: 2,
      sourceLineCount: 2,
      dwellingCount: 1,
      branchCount: 0,
      sourceCount: 1,
      hasLineProvenance: false,
      status: "partial",
      readyForExperts: false,
    },
    status: "partial",
    reasons: ["PARTIAL_EXTRACTION_GAPS"],
    offerBoq: { schemaVersion: 5, lines: [admitted, unresolved] },
    lineProvenance: null,
    masterBoqLines: refs,
    boqDependencyGraph: null,
    boqDependencyGraphsByDwelling: null,
    expertAdmission: admission,
  };

  const phase = runIkIdentityPhase({
    structuralReport: structural,
    sliceDExpert: structural,
    item: { id: "t-test", tenderId: "t-test", title: "test" },
    package: null,
  });
  assert(phase.context.status === "ready", "Identity: status ready when mayProceed");
  assert(phase.context.lineCount === 1, "Identity: processed exactly 1 admitted");
  assert(
    phase.postIdentityExpert.masterBoqLines.length === 2,
    "Identity: canonical masterBoqLines keeps unresolved",
  );
  assert(
    phase.postIdentityExpert.masterBoqLines.some((r) => r.line.lineId === "obl_6008ebc1"),
    "Identity: LP43 remains in BOQ",
  );
  assert(
    phase.context.persistPlans[0]?.offerBoq?.lines?.some((l) => l.lineId === "obl_6008ebc1"),
    "Identity: persist plan keeps unresolved lineId",
  );
  assert(structural.masterBoq.readyForExperts === false, "Identity: readyForExperts unchanged false");
  assert(
    resolveIkExpertAdmission(phase.postIdentityExpert).expertChainMayProceed === true,
    "Identity: mayProceed preserved",
  );
}

// F5: qty=0 → NIEPRAWIDLOWA_ILOSC gap (REUSE)
{
  const store = loadWorkCatalogStoreLocal();
  const bad = line({
    lineId: "obl_6008ebc1",
    quantity: 0,
    quantityRaw: "0",
    unit: "szt",
    description: "demontaż",
    catalogWorkId: null,
  });
  const shadow = computeShadowPositionCostForOfferBoqLine({
    line: bad,
    store,
    nowMs: Date.now(),
    tenderId: "t-test",
    lineIndex: 0,
  });
  assert(
    Array.isArray(shadow.gaps) && shadow.gaps.includes("NIEPRAWIDLOWA_ILOSC"),
    "F5: qty=0 → NIEPRAWIDLOWA_ILOSC",
  );
  assert(shadow.positionComplete !== true, "F5: qty=0 not complete priced");
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
