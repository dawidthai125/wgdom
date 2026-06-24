/**
 * P0 — WM Schematy: spacje w polach Tytuł / Adres (nagłówek PDF).
 * Uruchom: npx vite-node scripts/test-schematic-header-spaces-hotfix.mjs
 */
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";
import { touchSchematic } from "../src/lib/electrical-schematics/report.ts";
import { parseSingleLineDiagram } from "../src/lib/electrical-schematics/normalize.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("=== H01 — touchSchematic preserves trailing/internal spaces ===");
const base = buildSchematicFromTemplate("template-apartment-1f-default", { address: "" });

assert(touchSchematic(base, { address: "UL. " }).address === "UL. ", "H01 trailing space in address");
assert(
  touchSchematic(base, { address: "WROCŁAW UL. NOWOWIEJSKA 15/2" }).address ===
    "WROCŁAW UL. NOWOWIEJSKA 15/2",
  "H01 full address",
);
assert(
  touchSchematic(base, { title: "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ" }).title ===
    "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ",
  "H01 title with spaces",
);
assert(touchSchematic(base, { title: "SCHEMAT " }).title === "SCHEMAT ", "H01 title trailing space");

console.log("\n=== H02 — parseSingleLineDiagram roundtrip ===");
const parsed = parseSingleLineDiagram({
  ...base,
  title: "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ",
  address: "WROCŁAW UL. NOWOWIEJSKA 15/2",
});
assert(parsed?.title === "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ", "H02 title roundtrip");
assert(parsed?.address === "WROCŁAW UL. NOWOWIEJSKA 15/2", "H02 address roundtrip");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
