/**
 * COSTORYS-UX-01 WAVE 2 — Acceptance Criteria (pure helpers).
 * Run: npx vite-node scripts/test-costorys-ux-01-wave2.mjs
 */
import assert from "node:assert/strict";
import {
  buildOfferBoqVisibleLines,
  defaultOfferBoqDensity,
  estimateVisibleLineCount,
  lineMatchesOfferBoqSearch,
  parseOfferBoqDirectPln,
  OFFER_BOQ_COMPACT_THRESHOLD,
} from "../src/app/kosztorys/offer-boq-ux-wave2.ts";

function mkLine(partial) {
  return {
    lineId: partial.lineId,
    lp: partial.lp ?? partial.lineId,
    description: partial.description ?? "",
    requiresUserReview: partial.requiresUserReview ?? false,
    lineDirectDisplay: partial.lineDirectDisplay ?? "—",
    lineDirectPln: partial.lineDirectPln,
    confidenceBadge: partial.confidenceBadge ?? { status: "high" },
  };
}

// AC-D1 — density default
assert.equal(defaultOfferBoqDensity(49), "comfort");
assert.equal(defaultOfferBoqDensity(50), "compact");
assert.equal(defaultOfferBoqDensity(OFFER_BOQ_COMPACT_THRESHOLD), "compact");
assert.equal(defaultOfferBoqDensity(0), "comfort");
console.log("PASS AC-D1 density default");

// AC-D4 — ≥3× pozycji Compact vs Comfort (viewport 800)
const comfortVisible = estimateVisibleLineCount("comfort", 800);
const compactVisible = estimateVisibleLineCount("compact", 800);
assert.ok(
  compactVisible >= comfortVisible * 3,
  `AC-D4: compact ${compactVisible} >= 3× comfort ${comfortVisible}`,
);
console.log("PASS AC-D4 density ratio", { comfortVisible, compactVisible });

// AC-S1 — search lp + description case-insensitive
assert.equal(lineMatchesOfferBoqSearch({ lp: "01", description: "Malowanie ścian" }, "mal"), true);
assert.equal(lineMatchesOfferBoqSearch({ lp: "01", description: "Malowanie ścian" }, "01"), true);
assert.equal(lineMatchesOfferBoqSearch({ lp: "01", description: "Malowanie ścian" }, "XYZ"), false);
assert.equal(lineMatchesOfferBoqSearch({ lp: "01", description: "X" }, "  "), true);
console.log("PASS AC-S1 search");

// parse direct
assert.equal(parseOfferBoqDirectPln("12 400,50 zł"), 12400.5);
assert.equal(parseOfferBoqDirectPln("—"), Number.NaN);
assert.ok(Number.isNaN(parseOfferBoqDirectPln("")));
console.log("PASS parseOfferBoqDirectPln");

const lines = [
  mkLine({
    lineId: "a",
    lp: "03",
    description: "Gładź",
    requiresUserReview: true,
    lineDirectDisplay: "8 200,00 zł",
    lineDirectPln: 8200,
    confidenceBadge: { status: "review" },
  }),
  mkLine({
    lineId: "b",
    lp: "01",
    description: "Malowanie ścian",
    requiresUserReview: false,
    lineDirectDisplay: "12 400,00 zł",
    lineDirectPln: 12400,
    confidenceBadge: { status: "high" },
  }),
  mkLine({
    lineId: "c",
    lp: "02",
    description: "Tynk cementowy",
    requiresUserReview: true,
    lineDirectDisplay: "1 000,00 zł",
    lineDirectPln: 1000,
    confidenceBadge: { status: "low" },
  }),
];
const frozen = JSON.stringify(lines);

// AC-S2 / AC-T1 — pipeline review → search → sort
const pipeline = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: true,
  searchQuery: "t",
  sortKey: "direct",
  sortDir: "asc",
});
// review: a,c → search "t": c (Tynk) only (Gładź has no t? Gładź has no 't' in ascii... "Gładź" - no t; "Tynk" has t)
assert.deepEqual(
  pipeline.map((l) => l.lineId),
  ["c"],
);
assert.equal(JSON.stringify(lines), frozen, "AC-S4: źródło niezmienione");
console.log("PASS AC-S2/S4 pipeline review→search→sort + immutability");

// AC-S3 — review ∩ search empty
const emptyCombo = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: true,
  searchQuery: "malowanie",
  sortKey: "lp",
  sortDir: "asc",
});
assert.equal(emptyCombo.length, 0);
console.log("PASS AC-S3 review∩search empty");

// AC-O1 — sort LP default order
const byLp = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: false,
  searchQuery: "",
  sortKey: "lp",
  sortDir: "asc",
});
assert.deepEqual(
  byLp.map((l) => l.lp),
  ["01", "02", "03"],
);

const byDirectDesc = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: false,
  searchQuery: "",
  sortKey: "direct",
  sortDir: "desc",
});
assert.deepEqual(
  byDirectDesc.map((l) => l.lineId),
  ["b", "a", "c"],
);

const byConfAsc = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: false,
  searchQuery: "",
  sortKey: "confidence",
  sortDir: "asc",
});
assert.deepEqual(
  byConfAsc.map((l) => l.lineId),
  ["c", "a", "b"],
);
console.log("PASS AC-O1 sort LP / Direct / Confidence");

// Search alone
const searchOnly = buildOfferBoqVisibleLines({
  lines,
  reviewOnly: false,
  searchQuery: "MALOWANIE",
  sortKey: "lp",
  sortDir: "asc",
});
assert.deepEqual(
  searchOnly.map((l) => l.lineId),
  ["b"],
);
console.log("PASS search-only");

// Panel still exports
const panel = await import("../src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx");
assert.equal(typeof panel.OfferBoqCostIntelligencePanel, "function");
console.log("PASS panel export");

// W1 helpers still OK (regresja)
const w1 = await import("../src/app/kosztorys/offer-boq-ux-wave1.ts");
assert.equal(w1.tenderDetailContentMaxWidthClass("kosztorys"), "max-w-none");
assert.equal(w1.filterOfferBoqLinesReviewOnly(lines, true).length, 2);
console.log("PASS AC-W1 wave1 helpers regression");

console.log("\nCOSTORYS-UX-01 WAVE 2 ALL PASS");
