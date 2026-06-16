/**
 * EM-P1R-HOTFIX-001 — address parity across all 5 EM DOCX.
 * Uruchom: npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { generateEmDocxBytes, loadEmDocxTemplateBytesFromFs } from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { buildElectricalMeasurementDocxPayload } from "../src/lib/electrical-measurements/em-docx-payload.ts";

const PUBLIC_DIR = path.resolve("public");
const OUT_DIR = path.resolve("audit", "em-p1r-hotfix-001-out");
const ADDRESS = "Kleczkowska 26 m.3";
const STALE = "Sępa Sarzyńskiego";

const JOB = { id: "job-kleczkowska-26", address: ADDRESS, flatNumber: "" };
const DOCS = ["protokol", "dane-informacyjne", "badanie-adsc", "badanie-rezystancji", "parametry-rcd"];

async function docxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const texts = [];
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) texts.push(m[1]);
  return texts.join("");
}

async function templateAddressPlaceholderCount(kind) {
  const buf = await loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  return (xml.match(/\{\{ADDRESS\}\}/g) || []).length;
}

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

const m = touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB.id), {
  reportNumber: "TEST-RAP-KLECZ",
  measurementDate: "2026-06-16",
  technicianName: "Test Technik",
  meterModel: "Sonel MPI 520",
  meterSerialNumber: "999999",
});
const payload = buildElectricalMeasurementDocxPayload(m, JOB);
assert(payload.scalars.ADDRESS === ADDRESS, "payload ADDRESS = jobDisplayTitle");
assert(!payload.scalars.SITE_ADDRESS, "brak SITE_ADDRESS w payload");
assert(!payload.scalars.JOB_ADDRESS, "brak JOB_ADDRESS w payload");

console.log("\n=== Template {{ADDRESS}} placeholders ===");
for (const kind of DOCS) {
  const n = await templateAddressPlaceholderCount(kind);
  assert(n >= 1, `${kind}.template.docx ma {{ADDRESS}} (count=${n})`);
  assert(!(await (async () => {
    const buf = await loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);
    const zip = await JSZip.loadAsync(buf);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    return xml.includes(STALE);
  })()), `${kind}.template.docx bez hardcoded Sępa`);
}

console.log("\n=== Generated docs — address parity ===");
fs.mkdirSync(OUT_DIR, { recursive: true });
const loadTemplate = (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);

for (const kind of DOCS) {
  const bytes = await generateEmDocxBytes(kind, { measurement: m, job: JOB }, undefined, loadTemplate);
  fs.writeFileSync(path.join(OUT_DIR, `${kind}.docx`), bytes);
  const text = await docxText(bytes);
  assert(text.includes(ADDRESS), `${kind} zawiera „${ADDRESS}"`);
  assert(!text.includes(STALE), `${kind} bez stale „${STALE}"`);
}

console.log(`\n=== WYNIK HF-001: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed ? 1 : 0);
