/**
 * W4 CONNECT — T5 / legacy bid UI ← existing P7 (CONNECT-only).
 * Run: npx vite-node scripts/test-ik-w4-t5-p7-connect.mjs
 *
 * Hard locks: no second bid engine · no G3 Final Bid persist · legacy kept · no commit.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTenderBidProposalForUi } from "../src/lib/intelligent-estimator/resolve-tender-bid-proposal-ui.ts";
import {
  adaptP7ReportToOfferExpertResult,
  resolveChiefOfferPresentation,
} from "../src/lib/intelligent-estimator/p7-t5-offer-adapter.ts";

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

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const item = { id: "t-w4", tenderId: "t-w4", title: "W4" };
const pkgSingle = { mode: "single", tenderId: "t-w4", dwellings: [] };
const pkgMulti = { mode: "multi", tenderId: "t-w4", dwellings: [] };

const legacyProposal = {
  ok: true,
  pricingMode: "offer_boq_ai",
  recommendedBidPln: 111_000,
  floorBidPln: 100_000,
  aggressiveBidPln: 105_000,
  safeBidPln: 120_000,
  costPricePln: 90_000,
  costStack: [],
  assumptions: [],
  warnings: [],
  computedAt: "2026-01-01T00:00:00.000Z",
  sourceLabelPl: "LEGACY TOR-B",
};

function makeP7Single(overrides = {}) {
  const proposal = {
    ok: true,
    pricingMode: "offer_boq_ai",
    recommendedBidPln: 250_000,
    floorBidPln: 220_000,
    aggressiveBidPln: 230_000,
    safeBidPln: 270_000,
    costPricePln: 200_000,
    costStack: [],
    assumptions: [],
    warnings: [],
    computedAt: "2026-01-02T00:00:00.000Z",
    sourceLabelPl: "IK P7 single",
  };
  return {
    schemaVersion: 1,
    status: "ready",
    mode: "legacy_single",
    tenderId: "t-w4",
    researchExecuted: false,
    httpCalls: 0,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    cutoverGatePass: true,
    packageGatePass: null,
    billableLineCount: 1,
    completeLineCount: 1,
    gapLineCount: 0,
    laborCostPln: 80_000,
    materialCostPln: 120_000,
    directPln: 200_000,
    recommendedBidPln: 250_000,
    bidOk: true,
    reasonsPl: [],
    gapCodes: [],
    proposal,
    shadow: null,
    packageGate: null,
    packageDirect: null,
    cutoverGate: null,
    provisionalPricingSummary: null,
    provenance: {
      sourceRefKind: "boq_ready",
      offerBoqPresent: true,
      rateSources: ["OUR_RATE"],
      packageSumUsed: false,
    },
    ...overrides,
  };
}

// —— 1. P7 remains canonical for single when ready ——
{
  const p7 = makeP7Single();
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgSingle,
    p7Report: p7,
    legacyProposal,
    costPipeline01Enabled: true,
  });
  ok("W4 single → authoritativeSource p7_single", ui.authoritativeSource === "p7_single");
  ok("W4 single proposal === P7.proposal (same ref)", ui.proposal === p7.proposal);
  ok("W4 single recommended from P7", ui.recommendedBidPln === 250_000);
  ok("W4 single not legacy PLN", ui.recommendedBidPln !== legacyProposal.recommendedBidPln);
  ok("W4 single pdfExportBlocked false when ready", ui.pdfExportBlocked === false);
}

// —— 2. Absent P7 → LEGACY-PARALLEL ——
{
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgSingle,
    p7Report: null,
    legacyProposal,
    costPipeline01Enabled: true,
  });
  ok("W4 absent P7 → legacy source", ui.authoritativeSource === "legacy");
  ok("W4 absent P7 uses legacy proposal", ui.proposal === legacyProposal);
}

// —— 3. Mode mismatch (multi P7 + single pkg) stays legacy (W6 CASE D parity) ——
{
  const p7Multi = makeP7Single({ mode: "multi_package", packageGatePass: true });
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgSingle,
    p7Report: p7Multi,
    legacyProposal,
    costPipeline01Enabled: true,
  });
  ok(
    "W4 mode mismatch multi-report+single-pkg → legacy",
    ui.authoritativeSource === "legacy" && ui.proposal === legacyProposal,
  );
}

// —— 4. Cutover FAIL / not ready → no TOR-B silent fallback ——
{
  const p7Fail = makeP7Single({
    cutoverGatePass: false,
    bidOk: false,
    status: "blocked",
    proposal: { ...makeP7Single().proposal, ok: false, recommendedBidPln: null },
    reasonsPl: ["cutover FAIL"],
  });
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgSingle,
    p7Report: p7Fail,
    legacyProposal,
    costPipeline01Enabled: true,
  });
  ok("W4 cutover FAIL → none (not legacy leak)", ui.authoritativeSource === "none");
  ok("W4 cutover FAIL proposal null", ui.proposal == null);
  ok("W4 cutover FAIL pdf blocked", ui.pdfExportBlocked === true);
}

// —— 5. costPipeline OFF → legacy ——
{
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgSingle,
    p7Report: makeP7Single(),
    legacyProposal,
    costPipeline01Enabled: false,
  });
  ok("W4 costPipeline OFF → legacy", ui.authoritativeSource === "legacy");
}

// —— 6. Multi path still P7 multi ——
{
  const p7 = makeP7Single({
    mode: "multi_package",
    packageGatePass: true,
  });
  const ui = resolveTenderBidProposalForUi({
    item,
    pkg: pkgMulti,
    p7Report: p7,
    legacyProposal,
    costPipeline01Enabled: true,
  });
  ok("W4 multi still p7_multi", ui.authoritativeSource === "p7_multi");
  ok("W4 multi proposal === P7", ui.proposal === p7.proposal);
}

// —— 7. T5 Offer adapter (no second calculator) ——
{
  const p7 = makeP7Single();
  const adapted = adaptP7ReportToOfferExpertResult(p7);
  ok("W4 adapter returns offer", adapted != null && adapted.primaryRecommendation != null);
  ok(
    "W4 adapter PLN === P7 recommended",
    adapted?.primaryRecommendation?.offerPricePln === 250_000,
  );
  ok(
    "W4 adapter scenarios from P7 bids",
    adapted?.scenarios?.length === 3
      && adapted.scenarios[0].breakdown.offerPricePln === 230_000
      && adapted.scenarios[2].breakdown.offerPricePln === 270_000,
  );
  ok("W4 adapter null when bidOk false", adaptP7ReportToOfferExpertResult(makeP7Single({ bidOk: false })) == null);

  const legacyOffer = {
    contract: {
      co: "LEGACY",
      dlaczego: "",
      naPodstawieCzego: "",
      pewnosc: "low",
      blokery: [],
      zgodnoscZRozumieniemWykonania: "partial",
      zgodnoscOpisPl: "",
    },
    primaryRecommendation: {
      strategy: "rekomendowany",
      offerPricePln: 111_000,
      breakdown: {
        realCostPln: 90_000,
        marginPct: 0.2,
        marginPln: 18_000,
        riskPct: 0,
        riskPln: 0,
        offerPricePln: 111_000,
      },
      summaryPl: "legacy",
    },
    scenarios: [],
    signalToDecisionMaker: true,
    decisionMakerPayload: null,
  };
  const prefer = resolveChiefOfferPresentation({ legacyOffer, p7Report: p7 });
  ok("W4 presentation prefers P7", prefer.source === "p7" && prefer.t5AdaptedFromP7 === true);
  ok(
    "W4 presentation P7 PLN",
    prefer.offer?.primaryRecommendation?.offerPricePln === 250_000,
  );
  const fallback = resolveChiefOfferPresentation({ legacyOffer, p7Report: null });
  ok(
    "W4 presentation LEGACY when no P7",
    fallback.source === "legacy"
      && fallback.offer?.primaryRecommendation?.offerPricePln === 111_000,
  );
}

// —— 8. Source locks: no duplicate engine / G3 / sunset ——
{
  const resolveSrc = readSrc("src/lib/intelligent-estimator/resolve-tender-bid-proposal-ui.ts");
  const adapterSrc = readSrc("src/lib/intelligent-estimator/p7-t5-offer-adapter.ts");
  const pageSrc = readSrc("src/app/TenderDetailPage.tsx");
  const panelSrc = readSrc("src/app/TenderBidProposalPanel.tsx");
  const calcSrc = readSrc("src/lib/tenders-bid-calculator.ts");

  ok("resolve mentions p7_single", /p7_single/.test(resolveSrc));
  ok("adapter maps P7 → OfferExpert", /adaptP7ReportToOfferExpertResult/.test(adapterSrc));
  ok(
    "adapter no Final Bid persist APIs",
    !/localStorage\.setItem|persistKey|pushKeysToCloud|batch-set/.test(adapterSrc),
  );
  ok(
    "page wires resolveChiefOfferPresentation",
    /resolveChiefOfferPresentation/.test(pageSrc),
  );
  ok(
    "page still uses resolveTenderBidProposalForUi",
    /resolveTenderBidProposalForUi/.test(pageSrc),
  );
  ok("legacy TenderBidProposalPanel file exists", panelSrc.length > 100);
  ok(
    "computeTenderBidProposal still exported",
    /export function computeTenderBidProposal/.test(calcSrc),
  );
  ok(
    "adapter has no import of computeTenderBidProposal",
    !/import\s*\{[^}]*computeTenderBidProposal/.test(adapterSrc)
      && !/import\s+computeTenderBidProposal/.test(adapterSrc),
  );
  ok(
    "resolve has no import of computeTenderBidProposal",
    !/import\s*\{[^}]*computeTenderBidProposal/.test(resolveSrc)
      && !/import\s+computeTenderBidProposal/.test(resolveSrc),
  );
}

console.log(`\nW4 T5↔P7 CONNECT: ${fail === 0 ? "PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
