/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 6 — ATH / catalog AUDIT harness (static · ZERO HTTP).
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs
 *
 * Zakres: dowód granic F5 + odkrycie ścieżek ATH/catalog · BEZ zmiany semantyki · BEZ adaptera.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveTenderBidPricingMode,
  computeTenderBidProposal,
} from "../src/lib/tenders-bid-calculator.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { evaluateBidCutoverGate } from "../src/lib/tender-position-cost/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const FIXED_AT = "2026-08-12T08:00:00.000Z";
const costModel = defaultCostModelFromPayroll();

// ——— 1–5 ATH discovery / pricing mode ———
{
  const snapPriced = {
    ok: true,
    sourceFilename: "x.ath",
    rowCount: 1,
    rows: [
      {
        lp: "1",
        description: "Malowanie",
        unit: "m2",
        quantity: "100",
        unitPrice: "50",
        total: "5000",
      },
    ],
    catalogQuantities: [
      { lp: "1", description: "Malowanie", unit: "m2", quantity: "100" },
    ],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
    totalValue: "5000",
  };
  ok("T1 ATH discovery mode", resolveTenderBidPricingMode(snapPriced) === "ath_priced");

  const snapQtyOnly = {
    ...snapPriced,
    totalValue: null,
    rows: [
      {
        lp: "1",
        description: "Malowanie",
        unit: "m2",
        quantity: "100",
        unitPrice: "",
        total: "",
      },
    ],
  };
  ok("T2 qty-only → catalog mode", resolveTenderBidPricingMode(snapQtyOnly) === "catalog");
}

// ——— 6–8 ATH price semantics (mixed investor — not OUR RATE) ———
{
  const calc = read("src/lib/tenders-bid-calculator.ts");
  ok("T6 computeAthPricedDirectCosts exists", /function computeAthPricedDirectCosts/.test(calc));
  ok("T7 laborShareOfRow heuristic", /laborShareOfRow/.test(calc));
  ok(
    "T8 ATH ≠ OUR RATE (no ourWorkRate in ath branch)",
    !/ath_priced[\s\S]{0,800}lookupWorkRate|ath_priced[\s\S]{0,800}ourWorkRate/.test(calc),
  );
}

// ——— 9–11 identity / leakage ———
{
  const brief = read("src/lib/tenders-bzp-brief.ts");
  ok("T9 athPreviewToSnapshot", /export function athPreviewToSnapshot/.test(brief));
  // code (KNR) dropped from snapshot rows — structural mapping via description
  ok(
    "T10 snapshot maps unit/qty/description",
    /unitPrice:\s*r\.unitPrice/.test(brief) && /catalogQuantities/.test(brief),
  );

  const cutover = read("src/lib/tender-position-cost/bid-position-cost-cutover.ts");
  const cutCode = cutover.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok("T11 F5 cutover no companyPricePln", !/\bcompanyPricePln\b/.test(cutCode));
  ok("T11b F5 cutover no athUnitPrice", !/\bathUnitPricePln\b/.test(cutCode));
}

// ——— 12–14 no HTTP / research in F6 audit path ———
{
  const before = fetchCalls;
  void resolveTenderBidPricingMode({
    ok: true,
    sourceFilename: "a.ath",
    rowCount: 0,
    rows: [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
  });
  ok("T13 HTTP 0", fetchCalls === before);
  const f6Doc = read(
    "docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-F6-ATH-CATALOG-AUDIT.md",
  );
  ok("T14 audit doc exists", f6Doc.length > 100);
}

// ——— 15–17 legacy catalog dependency ———
{
  const engine = read("src/lib/work-catalog/work-catalog-engine-adapter.ts");
  ok("T15 workToLegacyRate / companyPrice", /companyPricePln/.test(engine));
  const offerPricing = read("src/lib/tender-offer-boq-pricing-engine.ts");
  ok(
    "T16 createWorkCatalogPriceProvider",
    /createWorkCatalogPriceProvider/.test(offerPricing),
  );
  const auto = read("src/app/hooks/useTenderPricingAuto.ts");
  ok(
    "T17 catalog fallback still present",
    /computeCatalogBidProposalForPricingAuto/.test(auto),
  );
}

// ——— 18–21 F5 / Offer / PM / WR boundaries ———
{
  const f5 = read("src/lib/tender-position-cost/bid-position-cost-cutover.ts");
  ok("T18 F5 still forces offerBoqDirect path", /offerBoqDirect/.test(f5));
  ok("T19 computeTenderBidProposal REUSE", /computeTenderBidProposal/.test(f5));
  ok(
    "T20 no kpPct rewrite in cutover",
    !/kpPct\s*=/.test(f5.replace(/\/\*[\s\S]*?\*\//g, "")),
  );
  const offerAdapter = read("src/lib/tender-offer-boq-bid-adapter.ts");
  ok(
    "T21 OfferBoq legacy adapter retained",
    /buildOfferBoqBidAdapterPayload/.test(offerAdapter),
  );
}

// ——— 22 gate API still exists ———
{
  const gate = evaluateBidCutoverGate({
    schemaVersion: 1,
    mode: "shadow",
    lineCount: 0,
    lines: [],
    aggregates: {
      completeLineCount: 0,
      gapLineCount: 0,
      skippedNoiseCount: 0,
      laborCostPln: null,
      materialCostPln: null,
      totalPositionCostPln: null,
    },
  });
  ok("T22 gate API", gate.pass === false);
}

// ——— 23 ATH Bid still callable (legacy KEEP) ———
{
  const proposal = computeTenderBidProposal({
    kosztorys: {
      ok: true,
      sourceFilename: "x.ath",
      rowCount: 1,
      rows: [
        {
          lp: "1",
          description: "Tynk",
          unit: "m2",
          quantity: "10",
          unitPrice: "100",
          total: "1000",
        },
      ],
      catalogQuantities: [],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
      totalValue: "1000",
    },
    swz: { implementationDays: 30, estimatedValuePln: 50_000 },
    fit: { priceWeightPct: 60 },
    costModel,
    minProjectDays: 14,
    maxConcurrentProjects: 2,
  });
  ok("T23 ath_priced still works", proposal.pricingMode === "ath_priced");
  ok("T23b recommended exists", proposal.ok && proposal.recommendedBidPln != null);
}

console.log(`\nWYNIK F6 ATH/CATALOG AUDIT: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
