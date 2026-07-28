/**
 * CATALOG-BID-01 — materializacja catalogQuantities przed kalkulatorem.
 * Run: npx vite-node scripts/test-catalog-bid-01.mjs
 *
 * Zakaz (kontrakt DF): nie zmienia resolveTenderBidPricingMode / resolveCatalogQuantities /
 * computeTenderBidProposal — testy weryfikują zachowanie F1 / ath_priced / catalog po ensure.
 */
import assert from "node:assert/strict";
import {
  athPreviewToSnapshot,
  buildCatalogQuantitiesFromPreview,
  ensureKosztorysCatalogQuantities,
  hasUsableCatalogQuantities,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  computeTenderBidProposal,
  resolveTenderBidPricingMode,
} from "../src/lib/tenders-bid-calculator.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { isLikelyCatalogQuantityRow } from "../src/lib/tender-catalog-quantity-filter.ts";

const FIXED_AT = "2026-07-28T18:00:00.000Z";
const costModel = defaultCostModelFromPayroll();

function baseSnap(partial = {}) {
  return {
    ok: true,
    sourceFilename: "test.ath",
    rowCount: 0,
    rows: [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
    ...partial,
  };
}

function bidOpts(kosztorys) {
  return {
    kosztorys,
    swz: { implementationDays: 30, estimatedValuePln: 80_000 },
    fit: { priceWeightPct: 60 },
    costModel,
    minProjectDays: 14,
    maxConcurrentProjects: 3,
  };
}

// ─── T1: rows qty > 0 + martwe catalogQuantities → ensure → catalog + Bid OK ───
{
  const deadCatalog = baseSnap({
    rowCount: 2,
    rows: [
      {
        lp: "1",
        description: "Malowanie dwukrotne ścian farbą lateksową",
        unit: "m2",
        quantity: "120",
        unitPrice: "",
        total: "",
      },
      {
        lp: "2",
        description: "Szpachlowanie gładzi gipsowej",
        unit: "m2",
        quantity: "40",
        unitPrice: "",
        total: "",
      },
    ],
    // Blokada F1 sprzed fix: length > 0, ale qty puste → resolveCatalogQuantities = []
    catalogQuantities: [
      {
        lp: "H",
        description: "Malowanie dwukrotne ścian farbą lateksową",
        unit: "m2",
        quantity: "",
      },
    ],
  });

  assert.equal(hasUsableCatalogQuantities(deadCatalog.catalogQuantities), false);
  assert.equal(resolveTenderBidPricingMode(deadCatalog), null, "T1 setup: F1 entry (mode null)");

  const fixed = ensureKosztorysCatalogQuantities(deadCatalog);
  assert.ok(hasUsableCatalogQuantities(fixed.catalogQuantities), "T1: usable catalogQuantities");
  assert.equal(fixed.catalogQuantities?.length, 2);
  assert.equal(resolveTenderBidPricingMode(fixed), "catalog");

  const proposal = computeTenderBidProposal(bidOpts(fixed));
  assert.equal(proposal.ok, true);
  assert.equal(proposal.pricingMode, "catalog");
  assert.ok(
    proposal.recommendedBidPln != null && proposal.recommendedBidPln > 0,
    "T1: Bid OK",
  );
  console.log("PASS T1 rows qty → ensure → catalog Bid OK", {
    recommendedBidPln: proposal.recommendedBidPln,
    catalogQty: fixed.catalogQuantities?.length,
  });
}

// ─── T2: brak quantity → F1 nadal ───
{
  const empty = baseSnap({
    rowCount: 1,
    rows: [
      {
        lp: "1",
        description: "Malowanie ścian",
        unit: "m2",
        quantity: "",
        unitPrice: "",
        total: "",
      },
    ],
    catalogQuantities: [],
  });
  const ensured = ensureKosztorysCatalogQuantities(empty);
  assert.equal(resolveTenderBidPricingMode(ensured), null);
  const proposal = computeTenderBidProposal(bidOpts(ensured));
  assert.equal(proposal.ok, false);
  assert.equal(proposal.recommendedBidPln, null);
  assert.match(
    proposal.warnings[0] ?? "",
    /brak ilości do wyceny katalogowej/i,
  );
  console.log("PASS T2 brak qty → F1");
}

// ─── T3: ATH total > 0 → ath_priced bez zmian ───
{
  const ath = baseSnap({
    totalValue: "125000,00 PLN",
    currency: "PLN",
    rowCount: 1,
    rows: [
      {
        lp: "1",
        description: "Roboty ogólnobudowlane",
        unit: "kpl",
        quantity: "1",
        unitPrice: "125000",
        total: "125000",
      },
    ],
    catalogQuantities: [],
  });
  assert.equal(resolveTenderBidPricingMode(ath), "ath_priced");
  const proposal = computeTenderBidProposal(bidOpts(ath));
  assert.equal(proposal.ok, true);
  assert.equal(proposal.pricingMode, "ath_priced");
  assert.ok(proposal.recommendedBidPln != null && proposal.recommendedBidPln > 0);
  console.log("PASS T3 ath_priced", { recommendedBidPln: proposal.recommendedBidPln });
}

// ─── T4: noise rows nie trafiają do catalogQuantities ───
{
  const noiseDesc = "Formularz oferty — oświadczenie wykonawcy";
  assert.equal(isLikelyCatalogQuantityRow(noiseDesc), false);

  const preview = {
    ok: true,
    title: "test",
    totalValue: "",
    currency: "PLN",
    rows: [
      {
        lp: "1",
        description: noiseDesc,
        unit: "szt",
        quantity: "1",
        unitPrice: "",
        total: "",
      },
      {
        lp: "2",
        description: "Układanie glazury na ścianach łazienki",
        unit: "m2",
        quantity: "18",
        unitPrice: "",
        total: "",
      },
      {
        lp: "3",
        description: "Nr KRS 0000123456",
        unit: "",
        quantity: "1",
        unitPrice: "",
        total: "",
      },
    ],
    categories: [],
    warnings: [],
    summaryLines: [],
  };

  const built = buildCatalogQuantitiesFromPreview(preview);
  assert.equal(built.length, 1);
  assert.match(built[0].description, /glazury/i);
  assert.ok(!built.some((l) => /formularz oferty/i.test(l.description)));
  assert.ok(!built.some((l) => /krs/i.test(l.description)));

  const snap = athPreviewToSnapshot(preview, "noise-test.pdf");
  assert.ok(hasUsableCatalogQuantities(snap.catalogQuantities));
  assert.equal(snap.catalogQuantities?.length, 1);
  console.log("PASS T4 noise regression");
}

// ─── T5: athPreviewToSnapshot — qty>0 materializowane; puste qty pomijane ───
{
  const preview = {
    ok: true,
    title: "przedmiar",
    totalValue: "",
    currency: "PLN",
    rows: [
      {
        lp: "1",
        description: "Malowanie sufitów",
        unit: "m2",
        quantity: "",
        unitPrice: "",
        total: "",
      },
      {
        lp: "2",
        description: "Malowanie ścian wewnętrznych",
        unit: "m2",
        quantity: "85,5",
        unitPrice: "",
        total: "",
      },
    ],
    categories: [],
    warnings: [],
    summaryLines: [],
  };
  const snap = athPreviewToSnapshot(preview, "qty.ath");
  assert.equal(snap.catalogQuantities?.length, 1);
  assert.equal(snap.catalogQuantities?.[0].quantity, "85,5");
  assert.equal(resolveTenderBidPricingMode(snap), "catalog");
  const proposal = computeTenderBidProposal(bidOpts(snap));
  assert.equal(proposal.ok, true);
  assert.equal(proposal.pricingMode, "catalog");
  console.log("PASS T5 athPreviewToSnapshot qty materialization", {
    recommendedBidPln: proposal.recommendedBidPln,
  });
}

// ─── T6: ensure idempotent gdy już usable ───
{
  const ok = baseSnap({
    rowCount: 1,
    rows: [
      {
        lp: "1",
        description: "Demontaż drzwi wewnętrznych",
        unit: "szt",
        quantity: "3",
        unitPrice: "",
        total: "",
      },
    ],
    catalogQuantities: [
      {
        lp: "1",
        description: "Demontaż drzwi wewnętrznych",
        unit: "szt",
        quantity: "3",
      },
    ],
  });
  const again = ensureKosztorysCatalogQuantities(ok);
  assert.equal(again, ok, "T6: same reference when already usable");
  console.log("PASS T6 ensure idempotent");
}

console.log("\nCATALOG-BID-01 ALL PASS");
