/**
 * TENDER-MODERNIZATION-01 / S3 — Bid ↔ Offer pricing parity harness.
 * DF: TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md
 * Run: npx vite-node scripts/test-tender-modernization-01-pricing-parity.mjs
 * Alias: scripts/test-tender-modernization-s3.mjs
 *
 * Observe only — NO Bid/Offer/OfferBoq formula changes · NO third PLN.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyOfferBidParity,
  isOfferBidHardParityPass,
  resolveAuthoritativeOfferPln,
} from "../src/lib/tender-offer-pln-authority.ts";
import { forceTenderExpertEffectiveForTests } from "../src/lib/tender-expert-effective.ts";
import {
  BID_PLN_SOURCE_BADGE_PL,
  OFFER_BID_MISMATCH_BADGE_PL,
  OFFER_PLN_SOURCE_BADGE_PL,
} from "../src/lib/decision-workspace-ui/labels.ts";
import { computeRuntimeBidFromOfferBoq } from "../src/lib/tender-offer-boq-explainability.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import {
  analyzeOfferFromCost,
  computeOfferPriceFromRealCost,
  defaultOfferStrategyParams,
} from "../src/lib/offer-expert/index.ts";
import { analyzeRealCostFromExperts } from "../src/lib/cost-expert/index.ts";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "../src/lib/execution-expert/index.ts";
import { analyzeMaterialsFromExecution } from "../src/lib/material-expert/index.ts";
import {
  analyzeMarketPricingFromMaterials,
  DEFAULT_MATERIAL_MARKET_MAP,
} from "../src/lib/pricing-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";
import { derivePipelineState } from "../src/lib/tender-pipeline/derive-pipeline-state.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
const counts = { MATCH: 0, EXPECTED_DELTA: 0, UNEXPECTED_DELTA: 0 };
const notCovered = [];

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

function recordParity(row) {
  counts[row.verdict] += 1;
  const flag = row.verdict === "UNEXPECTED_DELTA" ? "!!!" : "   ";
  console.log(
    `${flag} [${row.verdict}] ${row.fixtureId}`,
    `offer=${row.offerPricePln ?? "null"}`,
    `bid=${row.recommendedBidPln ?? "null"}`,
    `Δ=${row.deltaPln ?? "n/a"}`,
    `src=${row.differenceSource}`,
    `path=${row.pricingPath}`,
  );
  return row;
}

const FIXED_AT = "2026-07-28T10:00:00.000Z";

/** Canonical COST-PIPELINE-01 wire item (REUSE — no duplicate tender invent). */
function cp01Item(overrides = {}) {
  return {
    id: "tid-s3-cp01",
    ourEstimatePln: overrides.ourEstimatePln ?? null,
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "przedmiar-cp01.pdf",
        rowCount: 1,
        rows: [],
        catalogQuantities: [
          {
            lp: "1",
            description: "Malowanie dwukrotne ścian farbą lateksową",
            unit: "m2",
            quantity: "50",
          },
        ],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: FIXED_AT,
      },
      swz: {
        implementationDays: 30,
        estimatedValuePln: overrides.estimatedValuePln ?? 50000,
      },
      fit: {
        priceWeightPct: overrides.priceWeightPct ?? 60,
      },
      ...(overrides.dossierExtra ?? {}),
    },
  };
}

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function snap(price, origin, updatedAt, confidence = 0.85) {
  return {
    price,
    regionCode: "dolnyslask",
    coverage: "full",
    updatedAt,
    confidence,
    origin,
  };
}

function makeWork(id, price) {
  const freshAt = "2026-07-15T00:00:00.000Z";
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 999,
    marketQuotes: {
      kb_pl: { dolnyslask: snap(price, "kb_pl", freshAt) },
      interbud: { dolnyslask: snap(price * 1.1, "interbud", freshAt, 0.7) },
      sekocenbud: { dolnyslask: snap(price * 1.05, "sekocenbud", freshAt) },
      wgdom: { dolnyslask: snap(price * 0.98, "wgdom", freshAt) },
    },
    updatedAt: freshAt,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

/** REUSE Offer Expert P0 fixture chain (canonical Expert path). */
function computeCanonicalOfferPricePln() {
  resetTf();
  const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
  const worksById = new Map();
  for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
    worksById.set(e.workId, makeWork(e.workId, 50));
  }
  const line = {
    lineId: "L1",
    lp: "1",
    description: "Ocieplenie ścian zewnętrznych systemem ETICS",
    quantity: 100,
    quantityRaw: "100",
    unit: "m2",
    catalogWorkId: "cw.etics.boards",
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
  };
  const doc = {
    schemaVersion: 5,
    tenderId: "t-s3-offer",
    version: 1,
    builtAt: new Date().toISOString(),
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: 1,
      pdfPrzedmiarCase: null,
    },
    lines: [line],
    totals: {
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
      lineCount: 1,
      pricedLineCount: 0,
    },
    recomputeToken: "x",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
  const company = {
    purchaseByMaterialKey: {
      "mat.eps_graph": { unitPricePln: 45 },
      "mat.glue_etics": { unitPricePln: 3.2 },
      "mat.mesh": { unitPricePln: 4.5 },
      "mat.render": { unitPricePln: 2.8 },
    },
    defaultLaborPlnPerHour: 65,
    equipmentRateByKey: {
      "eq.scaffold": { unitPricePln: 8 },
      "eq.mixer": { unitPricePln: 120 },
    },
    auxiliaryPctOfDirect: 0.03,
    internalOverheadPct: 0.08,
  };
  const exec = analyzeExecutionFromOfferBoq(
    doc,
    defaultExecutionExpertBusinessProfile(),
  );
  const mat = analyzeMaterialsFromExecution(exec);
  const priced = analyzeMarketPricingFromMaterials(mat, {
    catalog: { worksById },
    nowMs,
    computedAtIso: new Date(nowMs).toISOString(),
  });
  const cost = analyzeRealCostFromExperts({
    execution: exec,
    materials: mat,
    pricing: priced,
    company,
  });
  const offer = analyzeOfferFromCost(cost);
  return {
    realCostPln: cost.offerHandoffPayload?.realCostPln ?? null,
    offer,
    offerPricePln: offer.primaryRecommendation?.offerPricePln ?? null,
  };
}

console.log("=== TENDER-MODERNIZATION-01 / S3 Pricing Parity ===\n");

// --- Labels + helper AC (S3-B/C static) ---
assert(
  "canonical OFFER badge",
  OFFER_PLN_SOURCE_BADGE_PL === "OFFER — cena ofertowa eksperta",
);
assert(
  "canonical BID badge",
  BID_PLN_SOURCE_BADGE_PL === "BID — propozycja legacy",
);
assert("mismatch badge present", OFFER_BID_MISMATCH_BADGE_PL.includes("Rozjazd"));

forceTenderExpertEffectiveForTests(null);
assert(
  "auth OFF → Bid primary",
  resolveAuthoritativeOfferPln({
    expertEffective: false,
    offerPricePln: 1000,
    recommendedBidPln: 2000,
  }).primaryPln === 2000 &&
    resolveAuthoritativeOfferPln({
      expertEffective: false,
      offerPricePln: 1000,
      recommendedBidPln: 2000,
    }).source === "bid_legacy",
);
assert(
  "auth ON → Offer primary",
  resolveAuthoritativeOfferPln({
    expertEffective: true,
    offerPricePln: 1000,
    recommendedBidPln: 2000,
  }).primaryPln === 1000 &&
    resolveAuthoritativeOfferPln({
      expertEffective: true,
      offerPricePln: 1000,
      recommendedBidPln: 2000,
    }).source === "offer_expert",
);
assert(
  "auth ON keeps Bid secondary",
  resolveAuthoritativeOfferPln({
    expertEffective: true,
    offerPricePln: 1000,
    recommendedBidPln: 2000,
  }).secondaryBidPln === 2000,
);

// AC-S3-3 degraded: Expert ON + Offer null → NO PRIMARY (never Bid primary)
{
  const degraded = resolveAuthoritativeOfferPln({
    expertEffective: true,
    offerPricePln: null,
    recommendedBidPln: 34900,
  });
  assert("AC-S3-3 degraded primaryPln=null", degraded.primaryPln == null);
  assert("AC-S3-3 degraded source=none", degraded.source === "none");
  assert(
    "AC-S3-3 degraded Bid not primary source",
    degraded.source !== "bid_legacy",
  );
  assert(
    "AC-S3-3 degraded Bid stays secondary only",
    degraded.secondaryBidPln === 34900,
  );
}

assert(
  "no third PLN keys in helper source",
  !/normalizedPln|unifiedPln|finalPln|decisionPln|mergedPln/.test(
    readSrc("src/lib/tender-offer-pln-authority.ts"),
  ),
);

// --- Parity fixtures ---
const rows = [];

// 1. normal tender — Bid from CP01 path + Offer from Expert P0 path (dual engines)
{
  const item = cp01Item();
  const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
  const bid = runtime?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  const cls = classifyOfferBidParity({
    recommendedBidPln: bid,
    offerPricePln,
    expectedDifferenceSource: "company_stack",
  });
  rows.push(
    recordParity({
      fixtureId: "1-normal-tender",
      offerPricePln,
      recommendedBidPln: bid,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: runtime?.proposal?.pricingMode ?? "missing",
      dataSource: "cp01-bid + offer-expert-p0",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("1 Bid>0", bid != null && bid > 0);
  assert("1 Offer>0", offerPricePln != null && offerPricePln > 0);
}

// 2. minimum price floor — Bid floor vs Offer primary = variant (EXPECTED)
{
  const item = cp01Item();
  const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
  const floor = runtime?.proposal?.floorBidPln ?? null;
  const rec = runtime?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  const cls = classifyOfferBidParity({
    recommendedBidPln: floor,
    offerPricePln,
    expectedDifferenceSource: "variant_not_primary",
  });
  rows.push(
    recordParity({
      fixtureId: "2-min-price-floor",
      offerPricePln,
      recommendedBidPln: floor,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: "bid.floorBidPln",
      dataSource: "cp01 floor vs offer primary",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("2 floor exists", floor != null);
  assert(
    "2 floor ≠ recommended (or equal ok)",
    floor != null && rec != null,
  );
}

// 3. margin 12% — Offer rekomendowany
{
  const { realCostPln, offerPricePln } = computeCanonicalOfferPricePln();
  const params = defaultOfferStrategyParams();
  const manual = computeOfferPriceFromRealCost(realCostPln, params.rekomendowany);
  assert("3 marginPct=0.12", params.rekomendowany.marginPct === 0.12);
  assert(
    "3 offer = Real+12%+risk",
    Math.abs(offerPricePln - manual.offerPricePln) < 0.02,
  );
  // Self-parity Offer vs Offer (control MATCH)
  const cls = classifyOfferBidParity({
    recommendedBidPln: offerPricePln,
    offerPricePln,
  });
  rows.push(
    recordParity({
      fixtureId: "3-margin-12pct",
      offerPricePln,
      recommendedBidPln: offerPricePln,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: "offer.rekomendowany",
      dataSource: "offer-expert default margin 12%",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("3 MATCH control", cls.verdict === "MATCH");
}

// 4. margin / risk 5% — rekomendowany riskPct=0.05; agresywny scenario lower
{
  const { realCostPln, offer } = computeCanonicalOfferPricePln();
  const params = defaultOfferStrategyParams();
  assert("4 riskPct=0.05 rekomendowany", params.rekomendowany.riskPct === 0.05);
  const agresywny = offer.scenarios.find((s) => s.strategy === "agresywny");
  const rekomendowany = offer.scenarios.find((s) => s.strategy === "rekomendowany");
  assert("4 agresywny < rekomendowany", agresywny.breakdown.offerPricePln < rekomendowany.breakdown.offerPricePln);
  const cls = classifyOfferBidParity({
    recommendedBidPln: agresywny.breakdown.offerPricePln,
    offerPricePln: rekomendowany.breakdown.offerPricePln,
    expectedDifferenceSource: "variant_not_primary",
  });
  rows.push(
    recordParity({
      fixtureId: "4-margin-risk-5pct-scenarios",
      offerPricePln: rekomendowany.breakdown.offerPricePln,
      recommendedBidPln: agresywny.breakdown.offerPricePln,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: "offer.scenarios",
      dataSource: `real=${realCostPln}`,
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
}

// 5. company pricing stack — Bid company model vs Offer 12%/5%
{
  const item = cp01Item();
  const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
  const profile = loadCompanyProfileLocal();
  const bid = runtime?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  const cls = classifyOfferBidParity({
    recommendedBidPln: bid,
    offerPricePln,
    expectedDifferenceSource: "company_stack",
  });
  rows.push(
    recordParity({
      fixtureId: "5-company-pricing-stack",
      offerPricePln,
      recommendedBidPln: bid,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: runtime?.proposal?.pricingMode ?? "missing",
      dataSource: `kp=${profile.costModel.kpPct}% profit=${profile.costModel.profitPct}%`,
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("5 company stack EXPECTED or MATCH", cls.verdict !== "UNEXPECTED_DELTA");
}

// 6. competitive trim — priceWeight ≥ 80
{
  const itemHi = cp01Item({ priceWeightPct: 90, estimatedValuePln: 40000 });
  const itemLo = cp01Item({ priceWeightPct: 40, estimatedValuePln: 40000 });
  const hi = computeRuntimeBidFromOfferBoq({ item: itemHi, builtAt: FIXED_AT, positionCostCutover: false });
  const lo = computeRuntimeBidFromOfferBoq({ item: itemLo, builtAt: FIXED_AT, positionCostCutover: false });
  const bidHi = hi?.proposal?.recommendedBidPln ?? null;
  const bidLo = lo?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  if (bidHi == null || bidLo == null) {
    notCovered.push("6-competitive-trim — Bid null on cp01 with high priceWeight");
  } else {
    const trimActive = bidHi !== bidLo;
    const cls = classifyOfferBidParity({
      recommendedBidPln: bidHi,
      offerPricePln,
      expectedDifferenceSource: trimActive ? "competitive_trim" : "company_stack",
    });
    rows.push(
      recordParity({
        fixtureId: "6-competitive-trim",
        offerPricePln,
        recommendedBidPln: bidHi,
        ourEstimatePln: null,
        deltaPln: cls.deltaPln,
        deltaPct: cls.deltaPct,
        pricingPath: hi?.proposal?.pricingMode ?? "missing",
        dataSource: trimActive
          ? `priceWeight=90 bidHi=${bidHi} bidLo=${bidLo}`
          : "priceWeight=90 (trim not differentiated vs 40 on this fixture)",
        differenceSource: cls.differenceSource,
        verdict: cls.verdict,
      }),
    );
    if (!trimActive) {
      notCovered.push(
        "6-competitive-trim — bidHi===bidLo on cp01 (trim path not differentiated; still measured)",
      );
    }
  }
}

// 7. SWZ constraint — estimatedValue present on Bid path
{
  const item = cp01Item({ estimatedValuePln: 35000, priceWeightPct: 85 });
  const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
  const bid = runtime?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  const cls = classifyOfferBidParity({
    recommendedBidPln: bid,
    offerPricePln,
    expectedDifferenceSource: "swz_constraint",
  });
  rows.push(
    recordParity({
      fixtureId: "7-swz-constraint",
      offerPricePln,
      recommendedBidPln: bid,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: runtime?.proposal?.pricingMode ?? "missing",
      dataSource: "swz.estimatedValuePln=35000 priceWeight=85",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("7 SWZ Bid computed", bid != null);
}

// 8. partial / missing pricing
{
  const empty = computeRuntimeBidFromOfferBoq({
    item: { id: "empty", tenderDossier: { kosztorys: null } },
    builtAt: FIXED_AT,
    positionCostCutover: false,
  });
  const cls = classifyOfferBidParity({
    recommendedBidPln: empty?.proposal?.recommendedBidPln ?? null,
    offerPricePln: null,
    expectedDifferenceSource: "partial_pricing",
  });
  rows.push(
    recordParity({
      fixtureId: "8-partial-missing-pricing",
      offerPricePln: null,
      recommendedBidPln: null,
      ourEstimatePln: null,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: "missing",
      dataSource: "empty dossier",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("8 empty runtime null", empty == null);
  assert("8 EXPECTED_DELTA", cls.verdict === "EXPECTED_DELTA");
}

// 9. pricingReadyPartial — readiness flags (not PLN engines)
{
  const item = cp01Item();
  const state = derivePipelineState({
    item,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    pricingReady: false,
    partialDossierReady: true,
    pricingReadyPartial: true,
    pricingReadyFinal: false,
  });
  assert(
    "9 pricingReadyPartial → Pricing",
    state === PipelineState.Pricing,
  );
  rows.push(
    recordParity({
      fixtureId: "9-pricingReadyPartial",
      offerPricePln: null,
      recommendedBidPln: null,
      ourEstimatePln: null,
      deltaPln: null,
      deltaPct: null,
      pricingPath: "readiness.partial",
      dataSource: `pipelineState=${state}`,
      differenceSource: "readiness_flags",
      verdict: "EXPECTED_DELTA",
    }),
  );
  counts.EXPECTED_DELTA += 1;
  console.log("    [EXPECTED_DELTA] 9-pricingReadyPartial readiness-only");
}

// 10. pricingReadyFinal — requires CURRENT_PARSER_VERSION on dossier (canonical)
{
  const itemBase = cp01Item();
  const item = {
    ...itemBase,
    tenderDossier: {
      ...itemBase.tenderDossier,
      parserVersion: CURRENT_PARSER_VERSION,
      kosztorys: {
        ...itemBase.tenderDossier.kosztorys,
        ok: true,
        parsedAt: FIXED_AT,
      },
    },
  };
  const state = derivePipelineState({
    item,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    pricingReady: true,
    partialDossierReady: true,
    pricingReadyPartial: true,
    pricingReadyFinal: true,
  });
  assert("10 pricingReadyFinal → Ready", state === PipelineState.Ready);
  rows.push(
    recordParity({
      fixtureId: "10-pricingReadyFinal",
      offerPricePln: null,
      recommendedBidPln: null,
      ourEstimatePln: null,
      deltaPln: null,
      deltaPct: null,
      pricingPath: "readiness.final",
      dataSource: `pipelineState=${state} parserVersion=${CURRENT_PARSER_VERSION}`,
      differenceSource: "readiness_flags",
      verdict: "EXPECTED_DELTA",
    }),
  );
  counts.EXPECTED_DELTA += 1;
  console.log("    [EXPECTED_DELTA] 10-pricingReadyFinal readiness-only");
}

// ourEstimate column (canonical apply path) — Decision override semantics
{
  const item = cp01Item({ ourEstimatePln: 99999 });
  const runtime = computeRuntimeBidFromOfferBoq({ item, builtAt: FIXED_AT, positionCostCutover: false });
  const bid = runtime?.proposal?.recommendedBidPln ?? null;
  const { offerPricePln } = computeCanonicalOfferPricePln();
  const cls = classifyOfferBidParity({
    recommendedBidPln: bid,
    offerPricePln,
    expectedDifferenceSource: "our_estimate_override",
  });
  rows.push(
    recordParity({
      fixtureId: "C-ourEstimatePln-present",
      offerPricePln,
      recommendedBidPln: bid,
      ourEstimatePln: item.ourEstimatePln,
      deltaPln: cls.deltaPln,
      deltaPct: cls.deltaPct,
      pricingPath: runtime?.proposal?.pricingMode ?? "missing",
      dataSource: "ourEstimatePln=99999 (measured, not merged into Offer)",
      differenceSource: cls.differenceSource,
      verdict: cls.verdict,
    }),
  );
  assert("C ourEstimate not written into Offer", offerPricePln !== 99999);
}

// hardParityPass unit
assert(
  "hardParity threshold 500",
  isOfferBidHardParityPass(1000, 1000) === true &&
    isOfferBidHardParityPass(1600, 1000) === false,
);

// Source freeze: Bid / OfferBoq / authority allowlist markers
assert(
  "OfferBoq semantics comment in authority",
  !readSrc("src/lib/tender-offer-pln-authority.ts").includes("directPln as offer"),
);
assert(
  "labels have S3 badges",
  readSrc("src/lib/decision-workspace-ui/labels.ts").includes(OFFER_PLN_SOURCE_BADGE_PL),
);
assert(
  "Hub S3 headline wire",
  readSrc("src/app/TenderWorkflowHubPanel.tsx").includes("data-s3-primary-pln-headline"),
);
assert(
  "TRE Outcome S3 badge wire",
  readSrc("src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx").includes(
    "data-s3-tre-source-badge",
  ),
);
{
  const treSrc = readSrc(
    "src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx",
  );
  assert(
    "TRE no Bid→primary fallback (auth.primaryPln ?? recommendedOfferPln)",
    !treSrc.includes("auth.primaryPln ?? result.recommendedOfferPln"),
  );
  assert(
    "TRE displayPln = auth.primaryPln only",
    treSrc.includes("const displayPln = auth.primaryPln;"),
  );
  assert(
    "TRE Expert ON null → data-s3-tre-no-primary",
    treSrc.includes('data-s3-tre-no-primary={noPrimaryOffer ? "1" : "0"}'),
  );
  assert(
    "TRE sourceBadge never || showPrice Bid promote",
    !treSrc.includes("bid_legacy\" || showPrice") &&
      !treSrc.includes("bid_legacy' || showPrice"),
  );
  assert(
    "TRE degraded hides Bid secondary in headline",
    treSrc.includes("!noPrimaryOffer"),
  );
}
assert(
  "DW recommendation S3 badge",
  readSrc("src/app/decision-workspace/DecisionRecommendationPanel.tsx").includes(
    "data-s3-offer-source-badge",
  ),
);
assert(
  "Bid calculator file untouched by S3 markers",
  !readSrc("src/lib/tenders-bid-calculator.ts").includes("data-s3-"),
);

// Catalog fallback path still exists (untouched Bid calculator smoke)
{
  const profile = loadCompanyProfileLocal();
  const { catalog } = resolveActiveCatalogForTender({
    referenceHourlyPln: profile.costModel.avgGrossHourlyPln,
  });
  const item = cp01Item();
  const catalogProposal = computeTenderBidProposal({
    kosztorys: item.tenderDossier.kosztorys,
    swz: item.tenderDossier.swz,
    fit: item.tenderDossier.fit,
    costModel: profile.costModel,
    catalog,
  });
  assert(
    "Bid calculator still callable (catalog mode)",
    catalogProposal.pricingMode === "catalog",
  );
}

console.log("\n--- Parity summary ---");
console.log("MATCH:", counts.MATCH);
console.log("EXPECTED_DELTA:", counts.EXPECTED_DELTA);
console.log("UNEXPECTED_DELTA:", counts.UNEXPECTED_DELTA);
if (notCovered.length) {
  console.log("\nNOT COVERED — REASON:");
  for (const n of notCovered) console.log(" -", n);
}

const unexpected = counts.UNEXPECTED_DELTA;
assert("ZERO UNEXPECTED_DELTA", unexpected === 0);

console.log(`\n=== S3 harness: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0 || unexpected > 0) {
  console.error("STOP — UNEXPECTED_DELTA or assert FAIL before S3-B/S3-C UI");
  process.exit(1);
}
process.exit(0);
