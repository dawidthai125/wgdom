/**
 * COSTORYS-UX-01 WAVE 1 — Acceptance Criteria (pure + layout helpers).
 * Run: npx vite-node scripts/test-costorys-ux-01-wave1.mjs
 */
import assert from "node:assert/strict";
import {
  defaultEvidenceExpanded,
  filterOfferBoqLinesReviewOnly,
  tenderDetailContentMaxWidthClass,
} from "../src/app/kosztorys/offer-boq-ux-wave1.ts";

// AC-1 / AC-2 — full width only kosztorys
assert.equal(tenderDetailContentMaxWidthClass("kosztorys"), "max-w-none");
assert.equal(tenderDetailContentMaxWidthClass("przeglad"), "max-w-7xl");
assert.equal(tenderDetailContentMaxWidthClass("dokumenty"), "max-w-7xl");
assert.equal(tenderDetailContentMaxWidthClass("ceny"), "max-w-7xl");
console.log("PASS AC-1/AC-2 content width class");

// AC-6 — Evidence default
assert.equal(defaultEvidenceExpanded(true), false, "OfferBoq → collapsed");
assert.equal(defaultEvidenceExpanded(false), true, "no OfferBoq → expanded");
console.log("PASS AC-6 evidence default");

// AC-7 / AC-8 — filtr nie mutuje danych źródłowych
const lines = [
  { lineId: "a", requiresUserReview: true },
  { lineId: "b", requiresUserReview: false },
  { lineId: "c", requiresUserReview: true },
];
const frozen = JSON.stringify(lines);
const filtered = filterOfferBoqLinesReviewOnly(lines, true);
assert.equal(filtered.length, 2);
assert.deepEqual(
  filtered.map((l) => l.lineId),
  ["a", "c"],
);
assert.equal(JSON.stringify(lines), frozen, "AC-8: źródło niezmienione");
assert.equal(filterOfferBoqLinesReviewOnly(lines, false).length, 3);
assert.equal(
  filterOfferBoqLinesReviewOnly([{ lineId: "x" }], true).length,
  0,
);
console.log("PASS AC-7/AC-8 review-only filter");

// Empty copy contract (logic for empty list when filter on)
assert.equal(
  filterOfferBoqLinesReviewOnly(
    [
      { lineId: "1", requiresUserReview: false },
      { lineId: "2", requiresUserReview: false },
    ],
    true,
  ).length,
  0,
);
console.log("PASS review-only empty set");

// Sticky bar module loads (presentational export)
const sticky = await import("../src/app/kosztorys/OfferBoqStickySummaryBar.tsx");
assert.equal(typeof sticky.OfferBoqStickySummaryBar, "function");
console.log("PASS sticky bar export");

// Desktop width tokens documented for 1280/1920 smoke (class-level)
assert.ok(tenderDetailContentMaxWidthClass("kosztorys") === "max-w-none");
console.log("PASS desktop width token (1280/1920 use max-w-none on tab)");

console.log("\nCOSTORYS-UX-01 WAVE 1 ALL PASS");
