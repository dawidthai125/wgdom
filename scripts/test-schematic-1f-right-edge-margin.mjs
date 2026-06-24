/**
 * P1 — WM Schematy apartment-1f-v1: prawy margines ostatniego obwodu.
 * Uruchom: npx vite-node scripts/test-schematic-1f-right-edge-margin.mjs
 */
import { applyPreset } from "../src/lib/electrical-schematics/circuit-presets.ts";
import {
  APARTMENT_1F_CIRCUIT_SYMBOL_RIGHT_WIDTH,
  APARTMENT_1F_LAYOUT,
  APARTMENT_1F_VIEWBOX,
  apartment1fLayoutMeta,
} from "../src/lib/electrical-schematics/layout/apartment-1f-v1.ts";
import { touchSchematic } from "../src/lib/electrical-schematics/report.ts";
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";

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

function build1fWithCircuitCount(count) {
  const base = buildSchematicFromTemplate("template-apartment-1f-default", {
    address: "WROCŁAW UL. NOWOWIEJSKA 15/2",
  });
  if (count <= base.circuits.length) {
    return touchSchematic(base, { circuits: base.circuits.slice(0, count) });
  }
  const circuits = [...base.circuits];
  while (circuits.length < count) {
    circuits.push({
      id: crypto.randomUUID(),
      sortOrder: circuits.length + 1,
      ...applyPreset("socket-230v", { name: `GN 230V ${circuits.length + 1}` }),
    });
  }
  return touchSchematic(base, { circuits });
}

function assertRightMargin(label, diagram) {
  const meta = apartment1fLayoutMeta(diagram);
  const lastX = meta.columnXs[meta.columnXs.length - 1];
  const symbolWidth = APARTMENT_1F_CIRCUIT_SYMBOL_RIGHT_WIDTH;
  assert(
    lastX + symbolWidth < APARTMENT_1F_VIEWBOX.width,
    `${label}: lastX(${lastX.toFixed(1)}) + symbol(${symbolWidth}) < viewBox(${APARTMENT_1F_VIEWBOX.width})`,
  );
}

function metaSpacing(diagram) {
  const meta = apartment1fLayoutMeta(diagram);
  if (meta.columnXs.length < 2) return Infinity;
  return meta.columnXs[1] - meta.columnXs[0];
}

console.log("=== R01 — 1 obwód ===");
{
  const d = build1fWithCircuitCount(1);
  assertRightMargin("R01", d);
}

console.log("\n=== R02 — 2 obwody ===");
{
  const d = build1fWithCircuitCount(2);
  const meta = apartment1fLayoutMeta(d);
  assert(meta.columnXs[0] === APARTMENT_1F_LAYOUT.feedBackboneX, "R02 pierwszy obwód bez zmian (feedBackboneX)");
  assertRightMargin("R02", d);
}

console.log("\n=== R03 — 3 obwody ===");
{
  const d = build1fWithCircuitCount(3);
  assertRightMargin("R03", d);
}

console.log("\n=== R04 — 4 obwody ===");
{
  const d = build1fWithCircuitCount(4);
  assertRightMargin("R04", d);
  assert(d.circuits.length === 4, "R04 domyślny szablon 4 obwody");
}

console.log("\n=== R05 — 5 obwodów ===");
{
  const d = build1fWithCircuitCount(5);
  assertRightMargin("R05", d);
  const spacing = metaSpacing(d);
  assert(spacing >= APARTMENT_1F_LAYOUT.minCircuitSpacing, `R05 spacing >= min (${spacing.toFixed(1)})`);
}

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
