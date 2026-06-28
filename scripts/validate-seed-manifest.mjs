/**
 * P1.3 — walidacja SEED-MANIFEST-v1.0.yaml
 * npx vite-node scripts/validate-seed-manifest.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  SEED_MANIFEST_VERSION,
  validateSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { TRADE_IDS } from "../src/lib/work-catalog/trades.ts";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, SEED_MANIFEST_RELATIVE_PATH);

let yamlText;
try {
  yamlText = readFileSync(manifestPath, "utf8");
} catch (err) {
  console.error(`FAIL nie można odczytać ${SEED_MANIFEST_RELATIVE_PATH}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}

const result = validateSeedManifestYaml(yamlText);

console.log(`Manifest: ${SEED_MANIFEST_RELATIVE_PATH}`);
console.log(`Expected version: ${SEED_MANIFEST_VERSION}`);
console.log(`Works: ${result.workCount}`);
console.log("Trade coverage:");
for (const tradeId of TRADE_IDS) {
  console.log(`  ${tradeId}: ${result.tradeCounts[tradeId] ?? 0}`);
}

if (!result.valid) {
  console.error("\nVALIDATION FAIL");
  for (const issue of result.issues) {
    console.error(`  [${issue.code}] ${issue.message}`);
  }
  process.exit(1);
}

console.log("\nVALIDATION PASS");
