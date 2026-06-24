/**
 * WM-SCHEMATY-V1 Faza 1B — presety obwodów + szablony startowe.
 * Uruchom: npx vite-node scripts/test-schematic-presets-templates-1b.mjs
 */
import {
  applyPreset,
  CIRCUIT_PRESET_IDS,
  CIRCUIT_PRESETS,
  resolveEmCircuitPresetId,
} from "../src/lib/electrical-schematics/circuit-presets.ts";
import { validateSchematicForExport } from "../src/lib/electrical-schematics/normalize.ts";
import {
  buildSchematicFromTemplate,
  SCHEMATIC_START_TEMPLATE_IDS,
  SCHEMATIC_START_TEMPLATES,
} from "../src/lib/electrical-schematics/start-templates.ts";

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

console.log("=== T01 — 12 presetów SSOT ===");
{
  assert(CIRCUIT_PRESET_IDS.length === 12, "T01 count 12");
  for (const id of CIRCUIT_PRESET_IDS) {
    const p = CIRCUIT_PRESETS[id];
    assert(p.presetId === id, `T01 preset ${id} id match`);
    assert(Boolean(p.name), `T01 preset ${id} name`);
    assert(Boolean(p.cableLabel), `T01 preset ${id} cableLabel`);
  }
}

console.log("\n=== T02 — applyPreset B16A socket-230v ===");
{
  const p = applyPreset("socket-230v");
  assert(p.name === "GN 230V", "T02 name");
  assert(p.loadKind === "socket-1f", "T02 loadKind");
  assert(p.breakerType === "B" && p.ratedCurrentA === 16 && p.poles === 1, "T02 MCB B16A 1P");
  assert(p.breakingCapacityKa === 6, "T02 6kA");
  assert(p.cableLabel === "YDYp 3x2,5mm²", "T02 cable");
  assert(p.presetId === "socket-230v", "T02 presetId saved");
  assert(!("id" in p), "T02 no id");
  assert(!("sortOrder" in p), "T02 no sortOrder");
}

console.log("\n=== T03 — applyPreset overrides ===");
{
  const p = applyPreset("lighting", { name: "OŚWIETLENIE Korytarz", ratedCurrentA: 10 });
  assert(p.name === "OŚWIETLENIE Korytarz", "T03 name override");
  assert(p.ratedCurrentA === 10, "T03 ratedCurrentA preserved");
  assert(p.presetId === "lighting", "T03 presetId from base");
}

console.log("\n=== T04 — electric-stove-3p + socket-400v ===");
{
  const stove = applyPreset("electric-stove-3p");
  assert(stove.loadKind === "cable-outlet-3f" && stove.poles === 3, "T04 stove 3P");
  assert(stove.cableLabel === "YDYp 5x2,5mm²", "T04 stove cable");
  const g400 = applyPreset("socket-400v");
  assert(g400.ratedCurrentA === 32 && g400.poles === 3, "T04 socket-400v B32A 3P");
  assert(g400.cableLabel === "YDY 5x2,5mm²", "T04 socket-400v cable");
}

console.log("\n=== T05 — EM preset mapping § B.4 ===");
{
  assert(resolveEmCircuitPresetId("socket-1f") === "socket-230v", "T05 socket-1f");
  assert(resolveEmCircuitPresetId("lighting-1f") === "lighting", "T05 lighting");
  assert(resolveEmCircuitPresetId("socket-3f", "Kuchenka") === "electric-stove-3p", "T05 kuchenka");
  assert(resolveEmCircuitPresetId("socket-3f", "GN 400V") === "socket-400v", "T05 generic 3f");
}

console.log("\n=== T06 — 3 szablony startowe ===");
{
  assert(SCHEMATIC_START_TEMPLATE_IDS.length === 3, "T06 template count");
  for (const id of SCHEMATIC_START_TEMPLATE_IDS) {
    assert(SCHEMATIC_START_TEMPLATES[id].templateId === id, `T06 def ${id}`);
  }
}

console.log("\n=== T07 — template-apartment-3f-default ===");
{
  const d = buildSchematicFromTemplate("template-apartment-3f-default", {
    address: "WROCŁAW, UL. BENEDYKTYŃSKA 22/13",
  });
  assert(d.layoutProfile === "apartment-3f-v1", "T07 profile");
  assert(d.supply.phase === "3f", "T07 3f");
  assert(d.mainSwitch?.label === "FR 100A", "T07 FR");
  assert(d.circuits.length === 6, "T07 six circuits");
  assert(d.circuits[0].name === "Kuchenka Elektryczna", "T07 circuit1 stove");
  assert(d.circuits[1].name === "GN 230V Salon", "T07 circuit2 salon");
  assert(d.circuits[5].presetId === "lighting", "T07 circuit6 lighting");
  assert(d.status === "draft" && d.linkStatus === "manual", "T07 draft manual");
}

console.log("\n=== T08 — template-apartment-1f-default ===");
{
  const d = buildSchematicFromTemplate("template-apartment-1f-default");
  assert(d.layoutProfile === "apartment-1f-v1", "T08 profile");
  assert(d.mainSwitch === undefined, "T08 no FR");
  assert(d.mainRcd.poles === 2, "T08 RCD 2P");
  assert(d.circuits.length === 4, "T08 four circuits");
}

console.log("\n=== T09 — template-commercial-3f-default ===");
{
  const d = buildSchematicFromTemplate("template-commercial-3f-default");
  assert(d.layoutProfile === "commercial-3f-v1", "T09 profile");
  assert(d.mainRcd.ratedCurrentA === 63, "T09 RCD 63A");
  assert(d.circuits.length === 5, "T09 five circuits");
  assert(d.circuits[0].presetId === "socket-400v", "T09 first 400V");
}

console.log("\n=== T10 — export validation with address ===");
{
  const d = buildSchematicFromTemplate("template-apartment-3f-default", {
    address: "WROCŁAW, UL. TEST 1/2",
  });
  const v = validateSchematicForExport(d);
  assert(v.ok, `T10 export ok (${v.missing.join(", ")})`);
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
