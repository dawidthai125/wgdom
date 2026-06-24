/**
 * WM-SCHEMATY-V1B — manual visual smoke (4 / 7 / 10 obwodów).
 * Uruchom: npx vite-node scripts/test-schematic-v1b-visual-smoke.mjs
 */
import { writeFileSync } from "fs";
import { applyPreset } from "../src/lib/electrical-schematics/circuit-presets.ts";
import { apartment3fLayoutMeta } from "../src/lib/electrical-schematics/layout/apartment-3f-v1.ts";
import { apartment1fLayoutMeta } from "../src/lib/electrical-schematics/layout/apartment-1f-v1.ts";
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

function countText(svg, text) {
  const re = new RegExp(`>${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`, "g");
  return (svg.match(re) ?? []).length;
}

function parseHorizontalTexts(svg) {
  const re = /<text x="([^"]+)" y="([^"]+)"[^>]*>([^<]+)<\/text>/g;
  const items = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (!m[0].includes("rotate(")) {
      items.push({ x: Number(m[1]), y: Number(m[2]), text: m[3] });
    }
  }
  return items;
}

/** Heurystyka nachodzenia: dwa poziome teksty na tej samej linii Y, nakładające się w X. */
function findHorizontalLabelOverlaps(svg) {
  const texts = parseHorizontalTexts(svg);
  const overlaps = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (Math.abs(a.y - b.y) > 2) continue;
      const aW = a.text.length * 5.5;
      const bW = b.text.length * 5.5;
      const aL = a.x - aW / 2;
      const aR = a.x + aW / 2;
      const bL = b.x - bW / 2;
      const bR = b.x + bW / 2;
      if (aR > bL && bR > aL) {
        overlaps.push({ a: a.text, b: b.text, y: a.y });
      }
    }
  }
  return overlaps;
}

function buildGate7() {
  const base = buildSchematicFromTemplate("template-apartment-3f-default", {
    diagramId: "v1b-gate-7",
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

function buildDense10() {
  const base = buildSchematicFromTemplate("template-apartment-3f-default", {
    diagramId: "v1b-dense-10",
    address: "WROCŁAW, UL. PERECA 24A/29",
  });
  const extra = Array.from({ length: 4 }, (_, i) => ({
    id: crypto.randomUUID(),
    sortOrder: 7 + i,
    ...applyPreset(i % 2 === 0 ? "lighting" : "socket-230v", {
      name: i % 2 === 0 ? `OŚWIETLENIE ${i + 1}` : `GN 230V Pokój ${i + 1}`,
    }),
  }));
  return touchSchematic(base, { circuits: [...base.circuits, ...extra] });
}

console.log("=== V1B — render version ===");
assert(SCHEMATIC_RENDER_VERSION === 5, "renderer version 5");

console.log("\n=== V1B — 4 obwody (1F) ===");
{
  const d = buildSchematicFromTemplate("template-apartment-1f-default", {
    address: "SMOKE 4C 1F",
  });
  const meta = apartment1fLayoutMeta(d);
  assert(meta.circuitCount === 4, "4 circuits");
  const svg = renderSchematicSvg(d);
  writeFileSync("audit/_tmp-v1b-4c-1f.svg", svg);
  assert(svg.includes('stroke="#e8e8e8"'), "column guides present");
  assert(svg.includes('r="6"'), "bus dots enlarged");
  assert(countText(svg, "Kuchenka Elektryczna") === 0, "no stove label on 1F default");
  const overlaps = findHorizontalLabelOverlaps(svg);
  assert(overlaps.length === 0, `no horizontal label overlap (${overlaps.length})`);
}

console.log("\n=== V1B — 7 obwodów (3F gate) ===");
{
  const d = buildGate7();
  const meta = apartment3fLayoutMeta(d);
  assert(meta.circuitCount === 7, "7 circuits");
  const svg = renderSchematicSvg(d);
  writeFileSync("audit/_tmp-v1b-7c-3f-gate.svg", svg);
  assert(countText(svg, "Kuchenka Elektryczna") === 1, "single Kuchenka label");
  assert(!svg.includes('font-size="7"'), "no inline 7px stove duplicate");
  const overlaps = findHorizontalLabelOverlaps(svg);
  assert(overlaps.length === 0, `no horizontal label overlap (${overlaps.length})`);
  const span = meta.columnXs[6] - meta.columnXs[0];
  const busUse = span / (meta.busEndX - meta.busStartX);
  assert(busUse >= 0.9, `gate 7 bus cluster span >=90% (${(busUse * 100).toFixed(1)}%)`);
}

console.log("\n=== V1B — 10 obwodów (3F dense) ===");
{
  const d = buildDense10();
  const meta = apartment3fLayoutMeta(d);
  assert(meta.circuitCount === 10, "10 circuits");
  const svg = renderSchematicSvg(d);
  writeFileSync("audit/_tmp-v1b-10c-3f-dense.svg", svg);
  assert(countText(svg, "Kuchenka Elektryczna") === 1, "single Kuchenka label");
  const overlaps = findHorizontalLabelOverlaps(svg);
  assert(overlaps.length === 0, `no horizontal label overlap (${overlaps.length})`);
  const spacing = meta.columnXs[1] - meta.columnXs[0];
  assert(spacing >= 80, `column spacing >= 80px (${spacing})`);
  assert(meta.busEndX <= 1360, "bus ends within viewBox");
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
console.log("V1B VISUAL SMOKE: PASS");
