/**
 * EM-P1.5 — Measurement Value Engine — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-p15.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  addElectricalMeasurementCircuit,
  addElectricalMeasurementRcd,
  createEmptyElectricalMeasurement,
  recalculateElectricalMeasurementValues,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  applyGeneratedValuesToMeasurement,
  collectAdscZsValues,
  collectRcdRsValues,
  generateElectricalMeasurementValueSet,
  generateUniqueOhmValues,
  createSeededRandom,
  hasGeneratedMeasurementValues,
  patchAdscSupplyValues,
  resolveAdscCircuitValues,
  resolveAdscSupplyValues,
  resolveRcdValues,
  seedKeyForMeasurement,
} from "../src/lib/electrical-measurements/measurement-value-engine.ts";
import {
  buildAdscPreview,
  buildRcdPreview,
} from "../src/lib/electrical-measurements/preview.ts";
import {
  assertPreviewParity,
  buildElectricalMeasurementDocxPayload,
} from "../src/lib/electrical-measurements/em-docx-payload.ts";
import {
  generateEmDocxBytes,
  loadEmDocxTemplateBytesFromFs,
} from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { parseElectricalMeasurement, normalizeElectricalMeasurements } from "../src/lib/electrical-measurements/normalize.ts";
import { serializeElectricalMeasurementsForStorage } from "../src/lib/electrical-measurements/merge.ts";

const PUBLIC_DIR = path.resolve("public");
const JOB = { id: "job-p15", address: "Wrocław test", flatNumber: "" };

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

async function docxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  const texts = [];
  let m;
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  while ((m = re.exec(xml))) texts.push(m[1]);
  return texts.join("");
}

function buildRichReport(reportNumber = "RAP-12-2026") {
  let m = touchElectricalMeasurement(createEmptyElectricalMeasurement("job-p15"), { reportNumber });
  m = addElectricalMeasurementCircuit(m, "socket-1f", "B");
  m = addElectricalMeasurementCircuit(m, "lighting-1f", "B");
  m = addElectricalMeasurementCircuit(m, "socket-3f", "B");
  m = addElectricalMeasurementRcd(m, "P302");
  m = addElectricalMeasurementRcd(m, "P304");
  return recalculateElectricalMeasurementValues(m);
}

const loadTemplate = (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);

console.log("=== P15-T01 generowanie ADSC — zakresy i stałe ===");
{
  const m = buildRichReport();
  const supply = resolveAdscSupplyValues(m);
  const zSupply = parseFloat(supply.zs.replace(",", "."));
  assert(zSupply >= 0.25 && zSupply <= 0.48, "P15-T01 supply Zs w zakresie 0,25–0,48");
  assert(supply.za === "0,92", "P15-T01 supply Za=0,92");
  assert(supply.inAmps === "25" && supply.iaAmps === "250", "P15-T01 supply I/Ia");
  const c1 = m.circuits.find((c) => c.type === "socket-1f");
  const v1 = c1 ? resolveAdscCircuitValues(m, c1) : null;
  assert(v1?.inAmps === "16" && v1?.iaAmps === "80" && v1?.za === "2,88", "P15-T01 gniazda 230V");
  const cLight = m.circuits.find((c) => c.type === "lighting-1f");
  const vLight = cLight ? resolveAdscCircuitValues(m, cLight) : null;
  assert(vLight?.inAmps === "10" && vLight?.iaAmps === "50" && vLight?.za === "4,88", "P15-T01 oświetlenie");
}

console.log("\n=== P15-T02 generowanie RCD — Rs zakres ===");
{
  const m = buildRichReport();
  for (const r of m.rcds) {
    const v = resolveRcdValues(m, r);
    const rs = parseFloat(v.rs.replace(",", "."));
    assert(rs >= 0.28 && rs <= 0.45, `P15-T02 ${r.symbol} Rs w zakresie`);
    assert(v.ian === "30" && v.ia === "18", `P15-T02 ${r.symbol} stałe IAN/Ia`);
  }
}

console.log("\n=== P15-T03 eliminacja duplikatów Zs/Rs ===");
{
  const m = buildRichReport();
  const zs = collectAdscZsValues(m);
  const rs = collectRcdRsValues(m);
  assert(new Set(zs).size === zs.length, "P15-T03 unikalne ADSC Zs");
  assert(new Set(rs).size === rs.length, "P15-T03 unikalne RCD Rs");
  const rng = createSeededRandom("dup-test");
  const many = generateUniqueOhmValues(rng, 8, 0.23, 0.49);
  assert(new Set(many).size === 8, "P15-T03 engine dedupe 8 wartości");
}

console.log("\n=== P15-T04 seed — powtarzalność per raport ===");
{
  const a = buildRichReport("RAP-12-2026");
  const b = buildRichReport("RAP-12-2026");
  assert(a.id !== b.id, "P15-T04 różne id");
  assert(seedKeyForMeasurement(a) !== seedKeyForMeasurement(b), "P15-T04 różny seed (różne id)");
  const a2 = recalculateElectricalMeasurementValues({ ...a });
  assert(JSON.stringify(a.valueSet) === JSON.stringify(a2.valueSet), "P15-T04 ten sam raport → te same wartości");
  const c = recalculateElectricalMeasurementValues(touchElectricalMeasurement(a, { reportNumber: "RAP-99-2026" }));
  assert(c.valueSet?.adscSupply.zs !== a.valueSet?.adscSupply.zs || c.valueSet?.seed !== a.valueSet?.seed, "P15-T04 inny numer → inny seed/wartości");
}

console.log("\n=== P15-T05 ręczna korekta ===");
{
  let m = buildRichReport();
  m = patchAdscSupplyValues(m, { zs: "0,45" });
  assert(resolveAdscSupplyValues(m).zs === "0,45", "P15-T05 override Zs zasilania");
  const preview = buildAdscPreview(m);
  assert(preview[0].includes("0,45"), "P15-T05 preview po korekcie");
}

console.log("\n=== P15-T06 preview parity + DOCX parity ===");
{
  const m = buildRichReport();
  assert(assertPreviewParity(m), "P15-T06 assertPreviewParity");
  const payload = buildElectricalMeasurementDocxPayload(m, JOB);
  const zs = resolveAdscSupplyValues(m).zs;
  assert(payload.scalars.RAP_NO === "RAP-12-2026", "P15-T06 payload scalars");
  const internal = payload;
  assert(internal._adsc[0].rows[0].ROW_SUPPLY_ZS === zs, "P15-T06 payload ADSC Zs");
  const adscDoc = await generateEmDocxBytes("badanie-adsc", { measurement: m, job: JOB }, undefined, loadTemplate);
  const adscText = await docxText(adscDoc);
  assert(adscText.includes(zs.replace(",", ".") ) || adscText.includes(zs), "P15-T06 DOCX zawiera Zs");
  const rs = resolveRcdValues(m, m.rcds[0]).rs;
  const rcdDoc = await generateEmDocxBytes("parametry-rcd", { measurement: m, job: JOB }, undefined, loadTemplate);
  const rcdText = await docxText(rcdDoc);
  assert(rcdText.includes(rs.replace(",", ".") ) || rcdText.includes(rs), "P15-T06 DOCX zawiera Rs");
}

console.log("\n=== P15-T07 reload persistence (normalize roundtrip) ===");
{
  const m = buildRichReport();
  const stored = serializeElectricalMeasurementsForStorage([m])[0];
  const parsed = parseElectricalMeasurement(JSON.parse(JSON.stringify(stored)));
  assert(parsed?.valueSet?.adscSupply.zs === m.valueSet?.adscSupply.zs, "P15-T07 roundtrip valueSet");
  assert(parsed != null && hasGeneratedMeasurementValues(parsed), "P15-T07 hasGenerated");
}

console.log("\n=== P15-T08 legacy compatibility (brak valueSet) ===");
{
  let m = buildRichReport();
  const legacy = { ...m, valueSet: undefined };
  assert(resolveAdscSupplyValues(legacy).zs === "0,34", "P15-T08 legacy supply Zs");
  const payload = buildElectricalMeasurementDocxPayload(legacy, JOB);
  assert(payload._adsc[0].rows[0].ROW_SUPPLY_ZS === "0,34", "P15-T08 legacy DOCX");
  const adsc = buildAdscPreview(legacy);
  assert(adsc[0].includes("0,34"), "P15-T08 legacy preview");
}

console.log("\n=== P15-T09 create report auto-generates valueSet ===");
{
  const created = createEmptyElectricalMeasurement("job-x");
  assert(hasGeneratedMeasurementValues(created), "P15-T09 create ma valueSet");
  assert(created.valueSet?.adscSupply.zs, "P15-T09 supply Zs wygenerowany");
}

console.log("\n=== P15-T10 brak losowania w preview (deterministyczny) ===");
{
  const m = buildRichReport();
  const p1 = buildAdscPreview(m);
  const p2 = buildAdscPreview(m);
  assert(JSON.stringify(p1) === JSON.stringify(p2), "P15-T10 preview deterministyczny");
  const set1 = generateElectricalMeasurementValueSet(m);
  const set2 = generateElectricalMeasurementValueSet(m);
  assert(JSON.stringify(set1) === JSON.stringify(set2), "P15-T10 generator deterministyczny (seed)");
}

console.log(`\n=== EM-P1.5: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
