/**
 * IMPLEMENT GO #4 — Owner-scoped G1 Identity coalesce (generic fixture).
 * Run: npx vite-node scripts/test-ik-owner-scoped-g1.mjs
 *
 * Proves:
 * - Owner overrides mutate selected lines
 * - durable non-selected stay byte/semantic equivalent (no remap)
 * - genuinely new non-selected may still auto-map
 * - no LP-specific exception in identity phase
 * - Sępa-shaped pomiar/A1/A2/1305/HOLD witness
 *
 * NO persist / NO business G1 / NO LP269 rollback.
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

function identityFingerprint(line) {
  return JSON.stringify({
    lineId: line.lineId,
    catalogWorkId: line.catalogWorkId ?? null,
    matchMethod: line.matchMethod ?? null,
    matchConfidence: line.matchConfidence ?? null,
    matchedBy: line.matchedBy ?? null,
    candidates: [...(line.candidateMatches ?? [])]
      .map((c) => `${c.catalogWorkId}|${c.matchedBy}|${c.matchConfidence}`)
      .sort(),
  });
}

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

function makeStructuralReport(lines, dwellingId = "dw1") {
  const refs = lines.map((line) => ({ dwellingId, line, provenance: null }));
  return {
    tenderId: "t-scoped-g1",
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
    masterBoqLines: refs,
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

function makePackage(dwellingId, lines) {
  return {
    tenderId: "t-scoped-g1",
    mode: "legacy_single",
    dwellings: [
      {
        dwellingId,
        labelPl: "Test",
        offerBoq: {
          schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
          tenderId: "t-scoped-g1",
          version: 1,
          builtAt: "2026-09-01T00:00:00.000Z",
          parserSnapshotRef: {
            kosztorysParsedAt: null,
            sourceFilename: null,
            rowCount: lines.length,
            pdfPrzedmiarCase: null,
          },
          lines,
          totals: emptyTotals(lines.length),
          recomputeToken: "scoped-g1",
          buildStatus: "mapped",
          mappingStats: null,
          mappingAppliedAt: "2026-09-01T00:00:00.000Z",
          costIntelligenceStats: null,
          costIntelligenceAppliedAt: null,
          pricingStats: null,
          pricingAppliedAt: null,
          userEditStats: null,
          warnings: [],
        },
        f5Gate: null,
        subtotals: null,
      },
    ],
  };
}

function outById(phase, lineId) {
  return phase.postIdentityExpert.masterBoqLines.find((r) => r.line.lineId === lineId)?.line;
}

const DW = "dw1";
const WORK_PAINT = "legacy-malowanie-m2";
const WORK_TILE = "legacy-plytki-m2";

const works = [
  {
    id: WORK_PAINT,
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: "m2",
    active: true,
    keywords: ["malowanie"],
    legacyCategoryId: "MALOWANIE",
  },
  {
    id: WORK_TILE,
    tradeId: "PLYTKI",
    namePl: "Układanie płytek",
    unit: "m2",
    active: true,
    keywords: ["płytek", "plytki", "płytek ceramicznych"],
    legacyCategoryId: "PLYTKI",
  },
  {
    id: SEPA_KNNR_1301_01_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "Sprawdzenie i pomiar 1-fazowego obwodu (KNNR 5·1301-01)",
    unit: "pomiar",
    active: true,
    keywords: ["pomiar", "1-fazowego", "obwodu"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: SEPA_KNNR_1301_02_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "Sprawdzenie i pomiar 3-fazowego obwodu (KNNR 5·1301-02)",
    unit: "pomiar",
    active: true,
    keywords: ["pomiar", "3-fazowego", "obwodu"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: C2_KNR_WC_1305_01_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "Próba samoczynnego wyłączania 1305-01",
    unit: "prob",
    active: true,
    keywords: ["próba", "samoczynnego"],
    legacyCategoryId: "ELEKTRO",
  },
  {
    id: C2_KNR_WC_1305_02_WORK_ID,
    tradeId: "ELEKTRO",
    namePl: "Próba samoczynnego wyłączania 1305-02",
    unit: "prob",
    active: true,
    keywords: ["próba", "samoczynnego"],
    legacyCategoryId: "ELEKTRO",
  },
];

// --- Static: no LP-specific exception ---
const phaseSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"),
  "utf8",
);
ok("no LP269 hardcoded", !/LP269|lp\s*===\s*["']269["']/.test(phaseSrc));
ok("no obl_53d3cbe6 hardcoded", !phaseSrc.includes("obl_53d3cbe6"));
ok("scoped uses package OfferBoq", phaseSrc.includes("findDurablePackageOfferBoqLine") || phaseSrc.includes("resolveExistingDwellingOfferBoq"));
ok("scoped gate on manualOverrides", phaseSrc.includes("ownerScopedG1") || phaseSrc.includes("ownerOverrideKeys"));
ok("immutable path skips mapOfferBoqLine branch", phaseSrc.includes("cloneDurableOfferBoqLine"));

// --- Unit regression ---
ok("pomiar != prob", normalizeWgdomCostUnit("pomiar") === "pomiar" && normalizeWgdomCostUnit("pomiar") !== "prob");
ok("1305 ids present", Boolean(C2_KNR_WC_1305_01_WORK_ID && C2_KNR_WC_1305_02_WORK_ID));
ok("A1/A2 ids present", Boolean(SEPA_KNNR_1301_01_WORK_ID && SEPA_KNNR_1301_02_WORK_ID));

// =============================================================================
// GENERIC FIXTURE
// durable: closed manual, ambiguous, qty=0, hold-witness
// selected: 2 Owner overrides
// new: 1 structural-only line (no durable)
// =============================================================================
const durableClosed = baseLine({
  lineId: "obl_closed_manual",
  lp: "10",
  description: "Malowanie ścian zamknięte",
  unit: "m2",
  quantity: 5,
  catalogWorkId: WORK_PAINT,
  matchMethod: "manual",
  matchedBy: "manual",
  matchConfidence: "high",
  candidateMatches: [],
});
const durableAmbiguous = baseLine({
  lineId: "obl_ambig_hold",
  lp: "20",
  description: "Pozycja niejednoznaczna durable",
  unit: "m2",
  quantity: 2,
  catalogWorkId: WORK_PAINT,
  matchMethod: "catalog_map",
  matchedBy: "catalog_map",
  matchConfidence: "high",
  candidateMatches: [
    {
      catalogWorkId: WORK_PAINT,
      matchedBy: "catalog_map",
      matchConfidence: "medium",
      role: "primary",
      workNamePl: "Malowanie",
      workCategory: "X",
      tradeId: "MALOWANIE",
      score: 40,
      rationale: "",
    },
    {
      catalogWorkId: WORK_TILE,
      matchedBy: "catalog_map",
      matchConfidence: "medium",
      role: "alternate",
      workNamePl: "Płytki",
      workCategory: "X",
      tradeId: "PLYTKI",
      score: 38,
      rationale: "",
    },
  ],
});
const durableQty0 = baseLine({
  lineId: "obl_qty0",
  lp: "30",
  description: "Pozycja qty zero",
  unit: "m2",
  quantity: 0,
  catalogWorkId: null,
  matchMethod: "unmatched",
  matchedBy: "unmatched",
  matchConfidence: "low",
});
const durableHoldWitness = baseLine({
  lineId: "obl_hold_witness",
  lp: "40",
  description: "Sprawdzenie i pomiar istniejących obwodów mieszkania",
  unit: "pomiar",
  quantity: 1,
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
      workNamePl: "1305",
      workCategory: "ELEKTRO",
      tradeId: "ELEKTRO",
      score: 40,
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
      score: 38,
      rationale: "",
    },
  ],
});
const durableSelectedOld = baseLine({
  lineId: "obl_sel_1f",
  lp: "50",
  description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 3,
  catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
  matchMethod: "catalog_map",
  matchedBy: "catalog_map",
  matchConfidence: "high",
});
const durableSelectedOld3f = baseLine({
  lineId: "obl_sel_3f",
  lp: "51",
  description: "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 2,
  catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
  matchMethod: "catalog_map",
  matchedBy: "catalog_map",
  matchConfidence: "high",
});

const durablePkgLines = [
  durableClosed,
  durableAmbiguous,
  durableQty0,
  durableHoldWitness,
  durableSelectedOld,
  durableSelectedOld3f,
];

// Structural = snapshot-like (no trusted binds) + one genuinely new line
const structuralSel1 = baseLine({
  lineId: "obl_sel_1f",
  lp: "50",
  description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 3,
});
const structuralSel2 = baseLine({
  lineId: "obl_sel_3f",
  lp: "51",
  description: "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
  unit: "pomiar",
  quantity: 2,
});
const structuralClosed = baseLine({
  lineId: "obl_closed_manual",
  lp: "10",
  description: "Malowanie ścian zamknięte",
  unit: "m2",
  quantity: 5,
});
const structuralAmbig = baseLine({
  lineId: "obl_ambig_hold",
  lp: "20",
  description: "Pozycja niejednoznaczna durable",
  unit: "m2",
  quantity: 2,
});
const structuralQty0 = baseLine({
  lineId: "obl_qty0",
  lp: "30",
  description: "Pozycja qty zero",
  unit: "m2",
  quantity: 0,
});
const structuralHold = baseLine({
  lineId: "obl_hold_witness",
  lp: "40",
  description: "Sprawdzenie i pomiar istniejących obwodów mieszkania",
  unit: "pomiar",
  quantity: 1,
});
const structuralNew = baseLine({
  lineId: "obl_brand_new",
  lp: "99",
  description: "Układanie płytek ceramicznych na ścianach",
  unit: "m2",
  quantity: 8,
});

const structuralLines = [
  structuralClosed,
  structuralAmbig,
  structuralQty0,
  structuralHold,
  structuralSel1,
  structuralSel2,
  structuralNew,
];

const pkg = makePackage(DW, durablePkgLines);
const structural = makeStructuralReport(structuralLines, DW);

const overrides = [
  buildG1ManualOverride({
    dwellingId: DW,
    lineId: "obl_sel_1f",
    catalogWorkId: SEPA_KNNR_1301_01_WORK_ID,
  }),
  buildG1ManualOverride({
    dwellingId: DW,
    lineId: "obl_sel_3f",
    catalogWorkId: SEPA_KNNR_1301_02_WORK_ID,
  }),
];

const phase = runIkIdentityPhase({
  structuralReport: structural,
  sliceDExpert: structural,
  item: { id: "t-scoped-g1", tenderId: "t-scoped-g1", title: "Scoped G1", bzpDocuments: [] },
  package: pkg,
  works,
  manualOverrides: overrides,
  nowMs: Date.now(),
});

ok("phase ready", phase.context.status === "ready", phase.context);

const outSel1 = outById(phase, "obl_sel_1f");
const outSel2 = outById(phase, "obl_sel_3f");
ok(
  "selected 1F → A1 manual",
  outSel1?.catalogWorkId === SEPA_KNNR_1301_01_WORK_ID && outSel1?.matchMethod === "manual",
  outSel1,
);
ok(
  "selected 3F → A2 manual",
  outSel2?.catalogWorkId === SEPA_KNNR_1301_02_WORK_ID && outSel2?.matchMethod === "manual",
  outSel2,
);
ok(
  "selected F5 OK",
  resolveWorkIdentityFromOfferBoqLine(outSel1).status === "OK"
    && resolveWorkIdentityFromOfferBoqLine(outSel2).status === "OK",
);

const outClosed = outById(phase, "obl_closed_manual");
ok(
  "durable CLOSED manual unchanged",
  identityFingerprint(outClosed) === identityFingerprint(durableClosed),
  { before: identityFingerprint(durableClosed), after: identityFingerprint(outClosed) },
);

const outAmbig = outById(phase, "obl_ambig_hold");
ok(
  "durable AMBIGUOUS unchanged (no W2-5 clear)",
  identityFingerprint(outAmbig) === identityFingerprint(durableAmbiguous)
    && outAmbig?.catalogWorkId === WORK_PAINT
    && (outAmbig?.candidateMatches?.length ?? 0) >= 2,
  { before: identityFingerprint(durableAmbiguous), after: identityFingerprint(outAmbig) },
);

const outQty0 = outById(phase, "obl_qty0");
ok(
  "durable qty=0 unchanged",
  identityFingerprint(outQty0) === identityFingerprint(durableQty0),
  { before: identityFingerprint(durableQty0), after: identityFingerprint(outQty0) },
);

const outHold = outById(phase, "obl_hold_witness");
ok(
  "durable HOLD witness unchanged (not remapped to A1)",
  identityFingerprint(outHold) === identityFingerprint(durableHoldWitness)
    && outHold?.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID
    && outHold?.matchMethod === "catalog_map",
  { before: identityFingerprint(durableHoldWitness), after: identityFingerprint(outHold) },
);

const outNew = outById(phase, "obl_brand_new");
ok(
  "genuinely new non-selected may auto-map",
  outNew != null
    && outNew.matchMethod !== "manual"
    && (
      outNew.catalogWorkId === WORK_TILE
      || (outNew.candidateMatches ?? []).some((c) => c.catalogWorkId === WORK_TILE)
    ),
  outNew,
);

// Without scoped (no overrides) durable hold WOULD remap — prove contrast on same fixture
const phaseFull = runIkIdentityPhase({
  structuralReport: structural,
  sliceDExpert: structural,
  item: { id: "t-scoped-g1", tenderId: "t-scoped-g1", title: "Scoped G1", bzpDocuments: [] },
  package: pkg,
  works,
  manualOverrides: null,
  nowMs: Date.now(),
});
const holdFull = outById(phaseFull, "obl_hold_witness");
ok(
  "full remap (no overrides) may change HOLD witness — contrast",
  identityFingerprint(holdFull) !== identityFingerprint(durableHoldWitness)
    || holdFull?.catalogWorkId === SEPA_KNNR_1301_01_WORK_ID,
  holdFull,
);

// =============================================================================
// Sępa-shaped 5-selected + HOLD witness (generic ids — no production LP hardcode)
// =============================================================================
const sepaDurable = [
  baseLine({
    lineId: "obl_s_200",
    lp: "200",
    description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    quantity: 10,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
  }),
  baseLine({
    lineId: "obl_s_201",
    lp: "201",
    description: "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    quantity: 4,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
  }),
  baseLine({
    lineId: "obl_s_217",
    lp: "217",
    description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    quantity: 6,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
  }),
  baseLine({
    lineId: "obl_s_265",
    lp: "265",
    description: "Sprawdzenie i pomiar 3-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    quantity: 2,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
  }),
  baseLine({
    lineId: "obl_s_266",
    lp: "266",
    description: "Sprawdzenie i pomiar 1-fazowego obwodu elektrycznego niskiego napięcia",
    unit: "pomiar",
    quantity: 8,
    catalogWorkId: C2_KNR_WC_1305_01_WORK_ID,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
  }),
  baseLine({
    lineId: "obl_s_269_hold",
    lp: "269",
    description: "Sprawdzenie i pomiar istniejących obwodów mieszkania",
    unit: "pomiar",
    quantity: 1,
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
        workNamePl: "1305",
        workCategory: "ELEKTRO",
        tradeId: "ELEKTRO",
        score: 40,
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
        score: 38,
        rationale: "",
      },
      {
        catalogWorkId: SEPA_KNNR_1301_02_WORK_ID,
        matchedBy: "catalog_map",
        matchConfidence: "medium",
        role: "alternate",
        workNamePl: "A2",
        workCategory: "ELEKTRO",
        tradeId: "ELEKTRO",
        score: 36,
        rationale: "",
      },
      {
        catalogWorkId: C2_KNR_WC_1305_02_WORK_ID,
        matchedBy: "catalog_map",
        matchConfidence: "low",
        role: "alternate",
        workNamePl: "1305-02",
        workCategory: "ELEKTRO",
        tradeId: "ELEKTRO",
        score: 30,
        rationale: "",
      },
    ],
  }),
];

const sepaStructural = sepaDurable.map((l) =>
  baseLine({
    lineId: l.lineId,
    lp: l.lp,
    description: l.description,
    unit: l.unit,
    quantity: l.quantity,
  }),
);
const sepaPkg = makePackage(DW, sepaDurable);
const sepaReport = makeStructuralReport(sepaStructural, DW);
const sepaOverrides = [
  buildG1ManualOverride({ dwellingId: DW, lineId: "obl_s_200", catalogWorkId: SEPA_KNNR_1301_01_WORK_ID }),
  buildG1ManualOverride({ dwellingId: DW, lineId: "obl_s_217", catalogWorkId: SEPA_KNNR_1301_01_WORK_ID }),
  buildG1ManualOverride({ dwellingId: DW, lineId: "obl_s_266", catalogWorkId: SEPA_KNNR_1301_01_WORK_ID }),
  buildG1ManualOverride({ dwellingId: DW, lineId: "obl_s_201", catalogWorkId: SEPA_KNNR_1301_02_WORK_ID }),
  buildG1ManualOverride({ dwellingId: DW, lineId: "obl_s_265", catalogWorkId: SEPA_KNNR_1301_02_WORK_ID }),
];

const sepaPhase = runIkIdentityPhase({
  structuralReport: sepaReport,
  sliceDExpert: sepaReport,
  item: { id: "t-scoped-g1", tenderId: "t-scoped-g1", title: "Sepa shaped", bzpDocuments: [] },
  package: sepaPkg,
  works,
  manualOverrides: sepaOverrides,
  nowMs: Date.now(),
});

const expectA1 = ["obl_s_200", "obl_s_217", "obl_s_266"];
const expectA2 = ["obl_s_201", "obl_s_265"];
for (const id of expectA1) {
  const line = outById(sepaPhase, id);
  ok(
    `sepa-shaped ${id} → A1 manual`,
    line?.catalogWorkId === SEPA_KNNR_1301_01_WORK_ID && line?.matchMethod === "manual",
    line,
  );
}
for (const id of expectA2) {
  const line = outById(sepaPhase, id);
  ok(
    `sepa-shaped ${id} → A2 manual`,
    line?.catalogWorkId === SEPA_KNNR_1301_02_WORK_ID && line?.matchMethod === "manual",
    line,
  );
}
const holdSepa = outById(sepaPhase, "obl_s_269_hold");
const holdPre = sepaDurable.find((l) => l.lineId === "obl_s_269_hold");
ok(
  "sepa-shaped HOLD witness immutable under scoped G1",
  identityFingerprint(holdSepa) === identityFingerprint(holdPre)
    && holdSepa?.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID
    && holdSepa?.matchMethod === "catalog_map",
  { before: identityFingerprint(holdPre), after: identityFingerprint(holdSepa) },
);

// --- READ/VERIFY current Sępa TEMP artifacts (no mutation) ---
const tempDir = process.env.TEMP
  ? join(process.env.TEMP, "wgdom-next-real-tender-audit")
  : null;
const go5Path = tempDir ? join(tempDir, "sepa-g1-package-after-go5.json") : null;
const go3Path = tempDir ? join(tempDir, "sepa-g1-package-after-go3.json") : null;
const prePath = tempDir ? join(tempDir, "sepa-g1-package-after.json") : null;

if (go5Path && existsSync(go5Path)) {
  const go5 = JSON.parse(readFileSync(go5Path, "utf8"));
  const lines = go5.dwellings?.find((d) => d.dwellingId === "legacy_single")?.offerBoq?.lines ?? [];
  const byLp = (lp) => lines.find((l) => String(l.lp) === String(lp));
  const lp269 = byLp("269");
  console.log(
    "READ_VERIFY_LP269_GO5",
    JSON.stringify({
      catalogWorkId: lp269?.catalogWorkId ?? null,
      matchMethod: lp269?.matchMethod ?? null,
      note: "post controlled restore HOLD",
    }),
  );
  ok(
    "read-verify: GO5 artifact LP269 = 1305 catalog_map HOLD",
    lp269?.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID
      && lp269?.matchMethod === "catalog_map",
    lp269,
  );
  for (const [lp, wid] of [
    ["200", SEPA_KNNR_1301_01_WORK_ID],
    ["217", SEPA_KNNR_1301_01_WORK_ID],
    ["266", SEPA_KNNR_1301_01_WORK_ID],
    ["201", SEPA_KNNR_1301_02_WORK_ID],
    ["265", SEPA_KNNR_1301_02_WORK_ID],
  ]) {
    const line = byLp(lp);
    ok(
      `read-verify GO5: LP${lp} durable manual ${wid}`,
      line?.catalogWorkId === wid && line?.matchMethod === "manual",
      line,
    );
  }
} else if (go3Path && existsSync(go3Path)) {
  const go3 = JSON.parse(readFileSync(go3Path, "utf8"));
  const lines = go3.dwellings?.find((d) => d.dwellingId === "legacy_single")?.offerBoq?.lines ?? [];
  const byLp = (lp) => lines.find((l) => String(l.lp) === String(lp));
  const lp269 = byLp("269");
  console.log(
    "READ_VERIFY_LP269_GO3",
    JSON.stringify({
      catalogWorkId: lp269?.catalogWorkId ?? null,
      matchMethod: lp269?.matchMethod ?? null,
      note: "incident artifact — restore not yet applied",
    }),
  );
  ok(
    "read-verify: GO3 artifact LP269 currently A1 catalog_map (incident state)",
    lp269?.catalogWorkId === SEPA_KNNR_1301_01_WORK_ID
      && lp269?.matchMethod === "catalog_map",
    lp269,
  );
  for (const [lp, wid] of [
    ["200", SEPA_KNNR_1301_01_WORK_ID],
    ["217", SEPA_KNNR_1301_01_WORK_ID],
    ["266", SEPA_KNNR_1301_01_WORK_ID],
    ["201", SEPA_KNNR_1301_02_WORK_ID],
    ["265", SEPA_KNNR_1301_02_WORK_ID],
  ]) {
    const line = byLp(lp);
    ok(
      `read-verify: LP${lp} durable manual ${wid}`,
      line?.catalogWorkId === wid && line?.matchMethod === "manual",
      line,
    );
  }
  const manualCount = lines.filter((l) => l.matchMethod === "manual" && l.catalogWorkId).length;
  ok("read-verify: manual count 284 (279+5)", manualCount === 284, manualCount);
} else {
  ok("read-verify: GO3/GO5 artifact absent — skipped", true);
}

if (prePath && existsSync(prePath)) {
  const pre = JSON.parse(readFileSync(prePath, "utf8"));
  const lines = pre.dwellings?.find((d) => d.dwellingId === "legacy_single")?.offerBoq?.lines ?? [];
  const lp269 = lines.find((l) => String(l.lp) === "269");
  ok(
    "read-verify: PRE artifact LP269 still 1305 catalog_map (rollback source)",
    lp269?.catalogWorkId === C2_KNR_WC_1305_01_WORK_ID
      && lp269?.matchMethod === "catalog_map",
    lp269,
  );
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
console.log("OWNER_SCOPED_G1 PASS");
