/**
 * P1.4 — cost split (ukryta warstwa silnika).
 * npx vite-node scripts/test-work-catalog-cost-split.mjs
 */
import {
  WORK_CATALOG_REFERENCE_HOURLY_PLN,
  computeCompanyPriceFromLegacyRate,
  deriveCostSplitFromLegacyRate,
  mergeCompanyPriceFromLegacyRate,
  normalizeCostSplit,
  resolveReferenceHourlyPln,
  roundWorkCatalogPln,
  splitCompanyPrice,
  verifyLegacyRateRoundTrip,
} from "../src/lib/work-catalog/cost-split.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  pass += 1;
}

function assertNear(actual, expected, epsilon, msg) {
  if (Math.abs(actual - expected) > epsilon) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ~${expected}, got ${actual}`);
    return;
  }
  pass += 1;
}

assertEq(WORK_CATALOG_REFERENCE_HOURLY_PLN, 85, "reference hourly constant");
assertEq(resolveReferenceHourlyPln(), 85, "default reference hourly");
assertEq(resolveReferenceHourlyPln(0), 85, "invalid hourly falls back to default");
assertEq(resolveReferenceHourlyPln(100), 100, "custom hourly preserved");

const normalized = normalizeCostSplit({ materialRatio: 2, laborRatio: 2 });
assertNear(normalized.materialRatio + normalized.laborRatio, 1, 1e-9, "normalize sums to 1");
assertEq(normalized.materialRatio, 0.5, "normalize 2:2 → 0.5");

const zeroSplit = normalizeCostSplit({ materialRatio: 0, laborRatio: 0 });
assertEq(zeroSplit.materialRatio, 1, "zero split → material 1");
assertEq(zeroSplit.laborRatio, 0, "zero split → labor 0");

assertEq(computeCompanyPriceFromLegacyRate(10, 0.2), roundWorkCatalogPln(10 + 0.2 * 85), "company price formula");
assertEq(mergeCompanyPriceFromLegacyRate(10, 0.2), computeCompanyPriceFromLegacyRate(10, 0.2), "merge alias");

const split = deriveCostSplitFromLegacyRate(10, 0.2);
assertNear(split.materialRatio + split.laborRatio, 1, 1e-9, "derive split sums to 1");
assert(split.materialRatio > 0 && split.laborRatio > 0, "mixed legacy has both ratios");

const materialOnly = deriveCostSplitFromLegacyRate(25, 0);
assertEq(materialOnly.materialRatio, 1, "material only ratio");
assertEq(materialOnly.laborRatio, 0, "material only labor ratio 0");

const laborOnly = deriveCostSplitFromLegacyRate(0, 1);
assertEq(laborOnly.materialRatio, 0, "labor only material ratio 0");
assertEq(laborOnly.laborRatio, 1, "labor only ratio");

const zeroLegacy = deriveCostSplitFromLegacyRate(0, 0);
assertEq(zeroLegacy.materialRatio, 1, "zero legacy default material");
assertEq(computeCompanyPriceFromLegacyRate(0, 0), 0, "zero legacy price 0");

const negativeClamped = computeCompanyPriceFromLegacyRate(-5, -1);
assertEq(negativeClamped, 0, "negative inputs clamped to zero price");

const nanClamped = computeCompanyPriceFromLegacyRate(Number.NaN, Number.POSITIVE_INFINITY);
assertEq(nanClamped, 0, "non-finite inputs clamped");

const companyPrice = 27;
const costSplitInput = { materialRatio: 10 / 27, laborRatio: 17 / 27 };
const frozen = { ...costSplitInput };
const legacyOut = splitCompanyPrice(companyPrice, costSplitInput);
assertEq(costSplitInput.materialRatio, frozen.materialRatio, "splitCompanyPrice does not mutate split input");
assertEq(costSplitInput.laborRatio, frozen.laborRatio, "splitCompanyPrice immutability labor");
assertNear(legacyOut.materialPlnPerUnit, 10, 0.01, "split material component");
assertNear(legacyOut.laborRbhPerUnit, 0.2, 0.01, "split labor rbh component");

const roundTrip = verifyLegacyRateRoundTrip(8, 0.18);
assert(roundTrip.pass, "round-trip catalog-like rate 8 + 0.18 rbh");
assertNear(roundTrip.companyPricePln, 23.3, 0.01, "round-trip company price");

const roundTripCustom = verifyLegacyRateRoundTrip(12, 0.5, 100);
assert(roundTripCustom.pass, "round-trip custom hourly");

const roundTripZero = verifyLegacyRateRoundTrip(0, 0);
assert(roundTripZero.pass, "round-trip zero legacy");

const badHourlySplit = splitCompanyPrice(50, { materialRatio: 0.5, laborRatio: 0.5 }, 0);
assertEq(badHourlySplit.laborRbhPerUnit, 0, "zero hourly → labor rbh 0");

const reconstructedPrice = computeCompanyPriceFromLegacyRate(
  legacyOut.materialPlnPerUnit,
  legacyOut.laborRbhPerUnit,
);
assertNear(reconstructedPrice, companyPrice, 0.01, "split → legacy → company round-trip");

console.log(`\nP1.4 work-catalog cost-split: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
