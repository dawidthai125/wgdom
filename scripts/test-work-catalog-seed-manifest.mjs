/**
 * P1.3 — testy seed manifest (parser + walidator + produktowy YAML).
 * npx vite-node scripts/test-work-catalog-seed-manifest.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
  validateSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { TRADE_IDS } from "../src/lib/work-catalog/trades.ts";

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

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, SEED_MANIFEST_RELATIVE_PATH);
const yamlText = readFileSync(manifestPath, "utf8");

const parsed = parseSeedManifestYaml(yamlText);
assert(parsed && typeof parsed === "object", "parseSeedManifestYaml returns object");
assert(Array.isArray(parsed.works), "parsed.works is array");

const product = validateSeedManifestYaml(yamlText);
assert(product.valid, `product manifest valid (${product.issues.map((i) => i.code).join(", ") || "ok"})`);
assert(product.workCount >= 100, "product manifest has comprehensive library (>=100 works)");

for (const tradeId of TRADE_IDS) {
  assert((product.tradeCounts[tradeId] ?? 0) > 0, `trade ${tradeId} has works`);
}

const sample = parsed.works[0];
assertEq(sample.id, "malowanie-scian-m2", "first work id");
assertEq(sample.tradeId, "MALOWANIE", "first work tradeId");
assertEq(sample.unit, "m2", "first work unit");
assert(Array.isArray(sample.keywords) && sample.keywords.length > 0, "first work keywords");
assertEq(sample.active, true, "first work active");

const duplicateId = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: [
    {
      id: "dup",
      tradeId: "MALOWANIE",
      name: "A",
      unit: "m2",
      keywords: ["a"],
      active: true,
    },
    {
      id: "dup",
      tradeId: "ELEKTRYKA",
      name: "B",
      unit: "szt",
      keywords: ["b"],
      active: true,
    },
  ],
});
assert(!duplicateId.valid, "rejects duplicate id");
assert(duplicateId.issues.some((i) => i.code === "duplicate_id"), "duplicate_id issue");

const duplicateName = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: TRADE_IDS.flatMap((tradeId, idx) => [
    {
      id: `work-a-${idx}`,
      tradeId,
      name: "Ta sama nazwa",
      unit: "m2",
      keywords: ["a"],
      active: true,
    },
    {
      id: `work-b-${idx}`,
      tradeId,
      name: "Ta sama nazwa",
      unit: "szt",
      keywords: ["b"],
      active: true,
    },
  ]),
});
assert(!duplicateName.valid, "rejects duplicate name in trade");
assert(duplicateName.issues.some((i) => i.code === "duplicate_name_in_trade"), "duplicate_name_in_trade issue");

const emptyKeywords = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: [
    {
      id: "x",
      tradeId: "MALOWANIE",
      name: "Test",
      unit: "m2",
      keywords: [],
      active: true,
    },
  ],
});
assert(!emptyKeywords.valid, "rejects empty keywords");
assert(emptyKeywords.issues.some((i) => i.code === "empty_keywords"), "empty_keywords issue");

const badTrade = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: [
    {
      id: "x",
      tradeId: "ROBOTY",
      name: "Test",
      unit: "m2",
      keywords: ["a"],
      active: true,
    },
  ],
});
assert(!badTrade.valid, "rejects invalid tradeId");
assert(badTrade.issues.some((i) => i.code === "invalid_trade_id"), "invalid_trade_id issue");

const badUnit = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: [
    {
      id: "x",
      tradeId: "MALOWANIE",
      name: "Test",
      unit: "km",
      keywords: ["a"],
      active: true,
    },
  ],
});
assert(!badUnit.valid, "rejects invalid unit");
assert(badUnit.issues.some((i) => i.code === "invalid_unit"), "invalid_unit issue");

const emptyTrade = validateSeedManifestStructure({
  manifestVersion: "1.0",
  locale: "pl-PL",
  works: [
    {
      id: "only-malowanie",
      tradeId: "MALOWANIE",
      name: "Jedyna",
      unit: "m2",
      keywords: ["a"],
      active: true,
    },
  ],
});
assert(!emptyTrade.valid, "rejects empty trades");
assert(emptyTrade.issues.some((i) => i.code === "empty_trade"), "empty_trade issue");

console.log(`\nP1.3 work-catalog seed manifest: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
