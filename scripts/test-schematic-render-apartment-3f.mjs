/**
 * WM-SCHEMATY-V1 Faza 2A — render SVG apartment-3f-v1.
 * Uruchom: npx vite-node scripts/test-schematic-render-apartment-3f.mjs
 */
import { applyPreset } from "../src/lib/electrical-schematics/circuit-presets.ts";
import { apartment3fLayoutMeta } from "../src/lib/electrical-schematics/layout/apartment-3f-v1.ts";
import { renderSchematicSvg, SCHEMATIC_RENDER_VERSION } from "../src/lib/electrical-schematics/render-svg.ts";
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

function buildBenedyktynskaGateDiagram() {
  const base = buildSchematicFromTemplate("template-apartment-3f-default", {
    diagramId: "gate-benedyktynska-22-13",
    address: "WROCŁAW, UL. BENEDYKTYŃSKA 22/13",
  });
  const lighting2 = {
    id: crypto.randomUUID(),
    sortOrder: 7,
    ...applyPreset("lighting", { name: "OŚWIETLENIE" }),
  };
  return touchSchematic(base, {
    circuits: [...base.circuits, lighting2],
    supply: { ...base.supply, mainCableLabel: "YDYp 5x6mm²" },
  });
}

console.log("=== R01 — render bez błędu (6 obwodów template) ===");
{
  const d = buildSchematicFromTemplate("template-apartment-3f-default", {
    address: "TEST 1/2",
  });
  let svg = "";
  let err = null;
  try {
    svg = renderSchematicSvg(d);
  } catch (e) {
    err = e;
  }
  assert(!err, "R01 no throw");
  assert(svg.startsWith("<svg"), "R01 svg root");
  assert(svg.includes("</svg>"), "R01 svg close");
  assert(svg.length > 500, "R01 svg non-trivial");
}

console.log("\n=== R02 — Benedyktyńska gate (7 obwodów) ===");
{
  const d = buildBenedyktynskaGateDiagram();
  const meta = apartment3fLayoutMeta(d);
  assert(meta.circuitCount === 7, "R02 seven circuits");
  assert(meta.columnXs.length === 7, "R02 seven columns");

  const svg = renderSchematicSvg(d);
  assert(svg.includes("SCHEMAT JEDNOKRESKOWY"), "R02 title");
  assert(svg.includes("BENEDYKTYŃSKA 22/13"), "R02 address");
  assert(svg.includes("L1, L2, L3, N, PE"), "R02 supply bus");
  assert(svg.includes("FR 100A"), "R02 FR");
  assert(svg.includes("3F"), "R02 meter 3F");
  assert(svg.includes("KWh"), "R02 KWh");
  assert(svg.includes("YDYp 5x6mm²"), "R02 main cable");
  assert(svg.includes("C25A 3P 6kA"), "R02 main breaker");
  assert(svg.includes("25A 30mA 4P AC"), "R02 RCD label");
  assert(svg.includes("Kuchenka Elektryczna"), "R02 stove name");
  assert(svg.includes("GN 230V Salon"), "R02 salon");
  assert(svg.includes("GN 230V Kuchnia"), "R02 kitchen");
  assert(svg.includes("B16A 3P 6kA"), "R02 stove MCB 3P");
  assert(svg.includes("B16A 1P 6kA"), "R02 socket MCB 1P");
  assert(svg.includes("B10A 1P 6kA"), "R02 lighting MCB");
  assert(svg.includes("YDYp 5x2,5mm²"), "R02 cable 5x2.5");
  assert(svg.includes("YDYp 3x2,5mm²"), "R02 cable 3x2.5");
  assert(svg.includes("YDYp 3x1,5mm²"), "R02 cable 3x1.5");
}

console.log("\n=== R03 — 10 obwodów (gęstość Pereca-like) ===");
{
  const d = buildSchematicFromTemplate("template-apartment-3f-default");
  const extra = Array.from({ length: 4 }, (_, i) => ({
    id: crypto.randomUUID(),
    sortOrder: 7 + i,
    ...applyPreset("socket-230v", { name: `GN 230V Extra ${i + 1}` }),
  }));
  const dense = touchSchematic(d, { circuits: [...d.circuits, ...extra] });
  let svg = "";
  try {
    svg = renderSchematicSvg(dense);
  } catch (e) {
    failed += 1;
    console.error("  ✗ R03 throw", e);
  }
  assert(svg.includes("<svg"), "R03 renders 10 circuits");
  assert(apartment3fLayoutMeta(dense).circuitCount === 10, "R03 count 10");
}

console.log("\n=== R04 — unsupported layout throws ===");
{
  const d = buildSchematicFromTemplate("template-commercial-3f-default");
  let threw = false;
  try {
    renderSchematicSvg(d);
  } catch {
    threw = true;
  }
  assert(threw, "R04 commercial-3f-v1 not supported (P1)");
}

console.log("\n=== R05 — render version ===");
{
  assert(SCHEMATIC_RENDER_VERSION === 2, "R05 version 2");
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
