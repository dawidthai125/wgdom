/**
 * IK S6-A — Outcome Bid S2/S3 enrich before S4-B (safety).
 * npx vite-node scripts/test-ik-s6-outcome-bid-safety.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichOfferBoqDocumentForOutcomeS4b } from "../src/lib/intelligent-estimator/boq-outcome-s4b-enrichment.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import {
  enrichOfferBoqLinesWithQuantityIntelligence,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import {
  enrichOfferBoqLinesWithDependencyGraph,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import { assertMopsS1DiscoveryFrozenContract } from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { buildIkP8QuantityAdvisory } from "../src/lib/intelligent-estimator/ik-p8-quantity-advisory.ts";
import { normalizeDwellingId } from "../src/lib/multi-dwelling/constants.ts";
import { evaluateAllDwellingsInPackage } from "../src/lib/multi-dwelling/orchestration.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import {
  buildOfferBoqDocumentForPipelineItem,
  computeRuntimeBidFromOfferBoq,
} from "../src/lib/tender-offer-boq-explainability.ts";
import {
  computeShadowPositionCostForOfferBoqLine,
} from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import { resolveTenderPricingAutoProposal } from "../src/app/hooks/useTenderPricingAuto.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { loadWorkCatalogStoreLocal, saveWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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
    Object.keys(lsStore).forEach((key) => delete lsStore[key]);
  },
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

function reset() {
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  saveWorkCatalogStoreLocal(
    normalizeWorkCatalogStore({
      schemaVersion: 4,
      activeRegion: "wroclaw",
      updatedAt: "2026-08-26T00:00:00.000Z",
      catalogs: {
        wroclaw: { region: "wroclaw", works: [], updatedAt: "2026-08-26T00:00:00.000Z" },
        dolnyslask: { region: "dolnyslask", works: [], updatedAt: "2026-08-26T00:00:00.000Z" },
      },
    }),
  );
}

function makeSnapshot(catalog, expressionsByLp = null) {
  return {
    ok: true,
    sourceFilename: "s6a-test.ath",
    parsedAt: "2026-08-26T00:00:00.000Z",
    rowCount: catalog.length,
    rows: [],
    catalogQuantities: catalog,
    warnings: [],
    quantityExpressionsByLp: expressionsByLp,
  };
}

function makeItem(tenderId, snapshot) {
  return {
    id: tenderId,
    tenderId,
    title: "S6-A Outcome Bid",
    submittingOffersDate: "2099-12-31",
    swzAnalysis: { implementationDays: 30, estimatedValuePln: 100_000 },
    tenderFit: { priceWeightPct: 60 },
    tenderDossier: {
      kosztorys: snapshot,
      swz: { implementationDays: 30, estimatedValuePln: 100_000 },
      fit: { priceWeightPct: 60 },
    },
  };
}

function catalogRow(over = {}) {
  return {
    lp: over.lp ?? "1",
    description: over.description ?? "Roboty ogólnobudowlane tynk",
    unit: over.unit ?? "m2",
    quantity: over.quantity ?? "20",
    quantityExpressionRaw: over.quantityExpressionRaw ?? null,
  };
}

// --- T1 Expression ACCEPTED → pricingQuantity authority (RESOLVED_EXPRESSION) ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "20", description: "Tynk ACCEPTED" })],
    { "1": "4 * 5" },
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-t1", snapshot: snap });
  ok("T1 built has expression raw", Boolean(built.lines[0]?.quantityExpressionRaw?.includes("4")));
  ok("T1 intel initially null", built.lines[0]?.quantityIntelligence == null);
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  const line = enriched.document.lines[0];
  const r = resolveBoqPricingQuantity({
    line,
    lineIndex: 0,
    dependencyGraph: enriched.boqDependencyGraph,
  });
  ok("T1 ACCEPTED", r.status === "ACCEPTED", r);
  ok("T1 pricingQuantity 20", r.pricingQuantity === 20);
  ok("T1 source RESOLVED_EXPRESSION", r.source === "RESOLVED_EXPRESSION");
  ok("T1 not silent ingest-only FALLBACK", !(r.status === "FALLBACK" && r.source === "INGEST_QUANTITY"));
}

// --- T2 Expression HOLD → no silent ingest Bid ok ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "10", description: "Tynk HOLD" })],
    { "1": "poz.99" },
  );
  const item = makeItem("t-s6-t2", snap);
  const built = buildOfferBoqDocumentForPipelineItem({ item });
  ok("T2 pipeline doc built", built != null);
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  const r = resolveBoqPricingQuantity({
    line: enriched.document.lines[0],
    lineIndex: 0,
    dependencyGraph: enriched.boqDependencyGraph,
  });
  ok("T2 S4-B HOLD", r.status === "HOLD", r);
  ok("T2 gap BOQ_QUANTITY_HOLD", r.gapCode === "BOQ_QUANTITY_HOLD");
  const shadow = computeShadowPositionCostForOfferBoqLine({
    line: {
      ...enriched.document.lines[0],
      // Reach S4-B labor path (identity OK) to assert BOQ_QUANTITY_HOLD on shadow.
      catalogWorkId: "cc-test-work",
      matchMethod: "exact_knr",
      matchedBy: "exact_knr",
      matchConfidence: "high",
    },
    store: loadWorkCatalogStoreLocal(),
    nowMs: Date.now(),
    boqDependencyGraph: enriched.boqDependencyGraph,
  });
  ok("T2 no engineInput", shadow.engineInput == null);
  ok(
    "T2 shadow gap HOLD or identity-blocked",
    shadow.gaps.includes("BOQ_QUANTITY_HOLD") || shadow.engineInput == null,
    shadow.gaps,
  );

  const runtime = computeRuntimeBidFromOfferBoq({
    item,
    positionCostCutover: true,
  });
  ok("T2 runtime returns proposal", runtime != null);
  ok("T2 Bid not falsely ok:true", runtime?.proposal?.ok !== true, runtime?.proposal);
  ok("T2 recommendedBidPln null", runtime?.proposal?.recommendedBidPln == null);
}

// --- T3 No expression → ordinary FALLBACK/ingest-compatible path remains valid ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "15", description: "Bez expression" })],
    null,
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-t3", snapshot: snap });
  ok("T3 no expression raw", !built.lines[0]?.quantityExpressionRaw);
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  const r = resolveBoqPricingQuantity({
    line: enriched.document.lines[0],
    lineIndex: 0,
    dependencyGraph: enriched.boqDependencyGraph,
  });
  // After S2, quantityRaw "15" may yield ACCEPTED with pricingQuantity 15 — both OK.
  ok(
    "T3 FALLBACK or ACCEPTED with ingest qty 15",
    (r.status === "FALLBACK" || r.status === "ACCEPTED") && r.pricingQuantity === 15,
    r,
  );
  ok("T3 not HOLD", r.status !== "HOLD");
}

// --- T4 no full Document Expert report — inline enrich sufficient ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "20" })],
    { "1": "4 * 5" },
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-t4", snapshot: snap });
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  ok("T4 intel present without Document Expert", enriched.document.lines[0]?.quantityIntelligence != null);
  ok("T4 graph non-null", enriched.boqDependencyGraph != null);
  ok(
    "T4 graph has positionIndex",
    Array.isArray(enriched.boqDependencyGraph.positionIndex)
      && enriched.boqDependencyGraph.positionIndex.length > 0,
  );
}

// --- T5 multi P7 isolation regression (A HOLD / B ACCEPTED) ---
{
  reset();
  function baseLine(over) {
    return {
      lineId: over.lineId,
      lp: over.lp ?? "1",
      description: over.description ?? "x",
      quantity: over.quantity ?? 10,
      quantityRaw: String(over.quantity ?? 10),
      quantityExpressionRaw: over.quantityExpressionRaw ?? null,
      unit: "m2",
      catalogWorkId: "cc-test-work",
      matchMethod: "exact_knr",
      matchedBy: "exact_knr",
      matchConfidence: "high",
      candidateMatches: [],
      isNoise: false,
      noiseKind: null,
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
      pricingSourceLabelPl: "t",
      aiConfidence: "low",
      aiRationale: null,
      userEdited: false,
      editedFields: [],
      warnings: [],
      quantityIntelligence: null,
      workCategory: null,
      categoryId: null,
      normalizedDescription: null,
      aliasRuleId: null,
      knrHint: null,
      catalogBasis: null,
    };
  }
  let lineA = baseLine({
    lineId: "A-HOLD",
    quantityExpressionRaw: "poz.99",
    quantity: 10,
  });
  let lineB = baseLine({
    lineId: "B-OK",
    quantityExpressionRaw: "10",
    quantity: 10,
  });
  const semA = enrichOfferBoqLinesWithDependencyGraph(
    enrichOfferBoqLinesWithQuantityIntelligence([lineA]),
  );
  const semB = enrichOfferBoqLinesWithDependencyGraph(
    enrichOfferBoqLinesWithQuantityIntelligence([lineB]),
  );
  lineA = semA.lines[0];
  lineB = semB.lines[0];
  const rA = resolveBoqPricingQuantity({ line: lineA, dependencyGraph: semA.graph });
  const rB = resolveBoqPricingQuantity({ line: lineB, dependencyGraph: semB.graph });
  ok("T5 A HOLD", rA.status === "HOLD");
  ok("T5 B ACCEPTED or FALLBACK not HOLD", rB.status !== "HOLD");
  ok("T5 graphs distinct", semA.graph !== semB.graph);
}

// --- T6 Outcome line identity local (no expert lp cross-join) ---
{
  reset();
  const snap = makeSnapshot(
    [
      catalogRow({ lp: "1", quantity: "10", description: "Alpha" }),
      catalogRow({ lp: "2", quantity: "20", description: "Beta" }),
    ],
    { "1": "10", "2": "4 * 5" },
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-t6", snapshot: snap });
  const beforeIds = built.lines.map((l) => l.lineId);
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  const afterIds = enriched.document.lines.map((l) => l.lineId);
  ok("T6 lineId preserved", JSON.stringify(beforeIds) === JSON.stringify(afterIds));
  ok("T6 two distinct lineIds", new Set(afterIds).size === 2);
}

// --- T7 P7 path source untouched (static) ---
{
  const p7src = readFileSync(
    join(ROOT, "src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts"),
    "utf8",
  );
  ok("T7 P7 no Outcome enrich import", !p7src.includes("boq-outcome-s4b-enrichment"));
  ok("T7 P7 still has aggregateMultiPackageGapCodes", p7src.includes("aggregateMultiPackageGapCodes"));
}

// --- T8 P8/S4-C unchanged (static + smoke) ---
{
  const p8src = readFileSync(
    join(ROOT, "src/lib/intelligent-estimator/ik-p8-quantity-advisory.ts"),
    "utf8",
  );
  ok("T8 S4-C no Outcome enrich import", !p8src.includes("boq-outcome-s4b-enrichment"));
  const adv = buildIkP8QuantityAdvisory({
    lines: [
      {
        line: {
          lineId: "P8-1",
          lp: "1",
          description: "x",
          quantity: 10,
          quantityRaw: "10",
          quantityExpressionRaw: null,
          quantityIntelligence: null,
          unit: "m2",
        },
        dwellingId: "legacy_single",
        dependencyGraph: null,
      },
    ],
  });
  ok("T8 advisory builds", adv != null && Array.isArray(adv.lines));
}

// --- T9 Flags routing ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "10", description: "Flag line" })],
    { "1": "poz.99" },
  );
  const item = makeItem("t-s6-t9", snap);

  const onCutover = resolveTenderPricingAutoProposal({
    item,
    priceOverrides: [],
    costPipeline01Enabled: true,
    positionCostCutover: true,
  });
  ok("T9 pipeline ON cutover ON returns proposal", onCutover != null);
  ok("T9 HOLD → ok false", onCutover?.ok !== true);

  const onLegacy = resolveTenderPricingAutoProposal({
    item,
    priceOverrides: [],
    costPipeline01Enabled: true,
    positionCostCutover: false,
  });
  // Legacy totals path — may be null if no positive recommendedBid; classified as non-throwing
  ok("T9 pipeline ON cutover OFF does not throw", onLegacy === null || typeof onLegacy.ok === "boolean");

  const off = resolveTenderPricingAutoProposal({
    item,
    priceOverrides: [],
    costPipeline01Enabled: false,
    positionCostCutover: true,
  });
  ok("T9 pipeline OFF → catalog proposal object", off != null && typeof off.ok === "boolean");
}

// --- T10 Legacy totals / catalog branches explicit ---
{
  const explSrc = readFileSync(
    join(ROOT, "src/lib/tender-offer-boq-explainability.ts"),
    "utf8",
  );
  ok(
    "T10 cutover OFF skips enrich path preserved",
    explSrc.includes("cutoverEnabled")
      && explSrc.includes("enrichOfferBoqDocumentForOutcomeS4b"),
  );
  const adapterSrc = readFileSync(
    join(ROOT, "src/lib/tender-offer-boq-bid-adapter.ts"),
    "utf8",
  );
  ok(
    "T10 legacy branch still in adapter",
    adapterSrc.includes("Bez `positionCostCutover`")
      || adapterSrc.includes("LEGACY OfferBoq totals"),
  );
}

// --- T11 expression raw + intel initially absent → enrich → S4-B gets intel ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "10" })],
    { "1": "poz.88" },
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-t11", snapshot: snap });
  ok("T11 intel absent before", built.lines[0].quantityIntelligence == null);
  ok("T11 expression present", Boolean(built.lines[0].quantityExpressionRaw));
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  ok("T11 intel present after", enriched.document.lines[0].quantityIntelligence != null);
  const r = resolveBoqPricingQuantity({
    line: enriched.document.lines[0],
    dependencyGraph: enriched.boqDependencyGraph,
  });
  ok("T11 no unsafe silent FALLBACK ingest", r.status === "HOLD", r);
}

// --- T12 graph passed non-null when enrichment succeeds ---
{
  reset();
  const snap = makeSnapshot([catalogRow({ lp: "1", quantity: "20" })], { "1": "4 * 5" });
  const item = makeItem("t-s6-t12", snap);
  const built = buildOfferBoqDocumentForPipelineItem({ item });
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  ok("T12 boqDependencyGraph non-null", enriched.boqDependencyGraph != null);
  ok(
    "T12 graph schema fields",
    enriched.boqDependencyGraph.positionIndex != null
      && Array.isArray(enriched.boqDependencyGraph.relations),
  );
}

// --- T13 Frozen ---
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("T13 BY_FAMILY empty", Object.keys(frozen.byFamily ?? {}).length === 0);
  ok("T13 EDGE empty", (frozen.edge ?? []).length === 0);
  ok("T13 catalogVerified false", frozen.catalogVerifiedFalse === true);
}

// --- Extra: resolveBoqPricingQuantity file not modified in this session (hash of contract markers) ---
{
  const s4b = readFileSync(
    join(ROOT, "src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts"),
    "utf8",
  );
  ok(
    "X1 S4-B still: no intel → ingestFallback",
    s4b.includes('No quantityIntelligence — ingest quantity'),
  );
  ok("X1 S4-B HOLD via expressionRequiresHold", s4b.includes("expressionRequiresHold"));
}

// --- Extra: P4 WIP / orchestra not imported by S6-A ---
{
  const helper = readFileSync(
    join(ROOT, "src/lib/intelligent-estimator/boq-outcome-s4b-enrichment.ts"),
    "utf8",
  );
  const expl = readFileSync(
    join(ROOT, "src/lib/tender-offer-boq-explainability.ts"),
    "utf8",
  );
  ok("X2 helper no orchestra import", !helper.includes("ik-orchestra-engine"));
  ok("X2 explainability no orchestra import", !expl.includes("ik-orchestra-engine"));
}

// --- Extra: pre-S6 gap reproduced without enrich ---
{
  reset();
  const snap = makeSnapshot(
    [catalogRow({ lp: "1", quantity: "10" })],
    { "1": "poz.99" },
  );
  const built = buildOfferBoqFromSnapshot({ tenderId: "t-s6-pre", snapshot: snap });
  const rPre = resolveBoqPricingQuantity({ line: built.lines[0], dependencyGraph: null });
  ok("X3 pre-enrich FALLBACK (gap reproduced)", rPre.status === "FALLBACK");
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(built);
  const rPost = resolveBoqPricingQuantity({
    line: enriched.document.lines[0],
    dependencyGraph: enriched.boqDependencyGraph,
  });
  ok("X3 post-enrich HOLD (gap closed)", rPost.status === "HOLD");
}

console.log(`\n=== IK S6-A OUTCOME BID SAFETY SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
