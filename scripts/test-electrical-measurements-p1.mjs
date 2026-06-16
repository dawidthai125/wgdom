/**
 * EM-P1B — generator DOCX pomiarów elektrycznych — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-p1.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  addElectricalMeasurementCircuit,
  addElectricalMeasurementRcd,
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  buildAdscPreview,
  buildRcdPreview,
  buildResistancePreview,
} from "../src/lib/electrical-measurements/preview.ts";
import {
  assertPreviewParity,
  buildElectricalMeasurementDocxPayload,
} from "../src/lib/electrical-measurements/em-docx-payload.ts";
import {
  generateEmDocxBytes,
  loadEmDocxTemplateBytesFromFs,
} from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { validateEmDocxBytes } from "../src/lib/electrical-measurements/em-docx-xml.ts";

const PUBLIC_DIR = path.resolve("public");
const OUT_DIR = path.resolve("audit", "em-p1-smoke-out");

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

function visibleText(xml) {
  const texts = [];
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml))) texts.push(m[1]);
  return texts.join("");
}

async function docxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  return visibleText((await zip.file("word/document.xml")?.async("string")) ?? "");
}

const JOB = {
  id: "job-sepa",
  address: "Wrocław, ul. Sępa Szarzyńskiego 83/7",
  flatNumber: "",
};

function buildSampleMeasurement({ circuits = 1, rcds = 1, reportNumber = "RAP-43-2026" } = {}) {
  let m = touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB.id), {
    reportNumber,
    measurementDate: "2026-06-05",
    technicianName: "Dawid Thai Thanh Elektryk Uprawniony",
    meterModel: "Sonel MPI 520",
    meterSerialNumber: "722453",
    supplyType: "ydy-3x4",
  });
  for (let i = 0; i < circuits; i++) {
    m = addElectricalMeasurementCircuit(m, i % 2 === 0 ? "socket-1f" : "lighting-1f", i % 2 === 0 ? "B" : "C");
  }
  for (let i = 0; i < rcds; i++) {
    m = addElectricalMeasurementRcd(m);
    m = touchElectricalMeasurement(m, {});
    const rcd = m.rcds[m.rcds.length - 1];
    m.rcds = m.rcds.map((r) =>
      r.id === rcd.id ? { ...r, symbol: `RCD${i + 1}`, deviceType: i % 2 === 0 ? "P302" : "P304" } : r,
    );
  }
  return m;
}

const loadTemplate = (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);

console.log("=== T01 scalar replacement (Protokół) ===");
const mScalar = buildSampleMeasurement({ circuits: 0, rcds: 0 });
const protokol = await generateEmDocxBytes(
  "protokol",
  { measurement: mScalar, job: JOB },
  undefined,
  loadTemplate,
);
const protText = await docxText(protokol);
assert(protokol.length > 5000, "T01 protokol bytes");
assert(protText.includes("RAP-43-2026"), "T01 RAP_NO");
assert(protText.includes("Sonel MPI 520"), "T01 METER_MODEL");
assert(!protText.includes("{{RAP_NO}}"), "T01 brak placeholdera RAP_NO");
const protVal = await validateEmDocxBytes(protokol);
assert(protVal.ok, "T01 XML valid");

console.log("\n=== T02 dane informacyjne ===");
const dane = await generateEmDocxBytes(
  "dane-informacyjne",
  { measurement: mScalar, job: JOB },
  undefined,
  loadTemplate,
);
const daneText = await docxText(dane);
assert(daneText.includes("WŁAŚCIWY"), "T02 INSPECTION_1");
assert(daneText.includes("Sępa"), "T02 ADDRESS");

console.log("\n=== T03 RCD rows (1 RCD) ===");
const m1rcd = buildSampleMeasurement({ circuits: 2, rcds: 1 });
const rcd1 = await generateEmDocxBytes("parametry-rcd", { measurement: m1rcd, job: JOB }, undefined, loadTemplate);
const rcd1Text = await docxText(rcd1);
assert(rcd1Text.includes("RCD1"), "T03 RCD1 symbol");
assert(rcd1Text.includes("P302"), "T03 P302");
assert(!rcd1Text.includes("{{ROW_LP}}"), "T03 brak template row");

console.log("\n=== T04 RCD rows (3 RCD) ===");
const m3rcd = buildSampleMeasurement({ circuits: 1, rcds: 3 });
const rcd3 = await generateEmDocxBytes("parametry-rcd", { measurement: m3rcd, job: JOB }, undefined, loadTemplate);
const rcd3Text = await docxText(rcd3);
assert((rcd3Text.match(/RCD1/g) || []).length >= 1, "T04 RCD1");
assert(rcd3Text.includes("RCD2"), "T04 RCD2");
assert(rcd3Text.includes("RCD3"), "T04 RCD3");
assert(rcd3Text.includes("P304"), "T04 P304");

console.log("\n=== T05 ADSC rows ===");
const mAdsc = buildSampleMeasurement({ circuits: 3, rcds: 1 });
const adsc = await generateEmDocxBytes("badanie-adsc", { measurement: mAdsc, job: JOB }, undefined, loadTemplate);
const adscText = await docxText(adsc);
assert(adscText.includes("Zasilanie"), "T05 Zasilanie row");
assert(adscText.includes("Obwód gniazd 230V"), "T05 circuit name");
assert(!adscText.includes("{{ROW_POINT}}"), "T05 no template placeholder");

console.log("\n=== T06 Resistance rows (16 col, HIGH RISK) ===");
const mRes = buildSampleMeasurement({ circuits: 2, rcds: 1 });
const res = await generateEmDocxBytes(
  "badanie-rezystancji",
  { measurement: mRes, job: JOB },
  undefined,
  loadTemplate,
);
const resText = await docxText(res);
assert(resText.includes("Obwód YDY 3x4mm"), "T06 supply label");
assert(resText.includes("Pozytywna"), "T06 assessment");
assert(!resText.includes("{{ROW_CIRCUIT_NAME}}"), "T06 no template placeholder");
const resVal = await validateEmDocxBytes(res);
assert(resVal.ok, "T06 XML valid resistance");

console.log("\n=== T07 preview parity ===");
assert(assertPreviewParity(mAdsc), "T07 assertPreviewParity");
const payload = buildElectricalMeasurementDocxPayload(mAdsc, JOB);
assert(payload.scalars.RAP_NO === "RAP-43-2026", "T07 payload RAP_NO");
const adscPreview = buildAdscPreview(mAdsc);
assert(adscPreview.some((l) => l.includes("Obwód gniazd 230V")), "T07 adsc preview line");

console.log("\n=== T08 many circuits ===");
const mMany = buildSampleMeasurement({ circuits: 7, rcds: 2, reportNumber: "RAP-99-2026" });
const adscMany = await generateEmDocxBytes("badanie-adsc", { measurement: mMany, job: JOB }, undefined, loadTemplate);
const adscManyText = await docxText(adscMany);
assert((adscManyText.match(/POZYTYWNA/g) || []).length >= 8, "T08 supply + 7 circuits assessments");

console.log("\n=== T09 multiple reports same job ===");
const mA = buildSampleMeasurement({ circuits: 1, rcds: 1, reportNumber: "RAP-A-2026" });
const mB = buildSampleMeasurement({ circuits: 2, rcds: 2, reportNumber: "RAP-B-2026" });
const docA = await docxText(
  await generateEmDocxBytes("protokol", { measurement: mA, job: JOB }, undefined, loadTemplate),
);
const docB = await docxText(
  await generateEmDocxBytes("protokol", { measurement: mB, job: JOB }, undefined, loadTemplate),
);
assert(docA.includes("RAP-A-2026") && !docA.includes("RAP-B-2026"), "T09 report A");
assert(docB.includes("RAP-B-2026") && !docB.includes("RAP-A-2026"), "T09 report B");

console.log("\n=== T10 smoke — write all 5 docs ===");
fs.mkdirSync(OUT_DIR, { recursive: true });
const smokeM = buildSampleMeasurement({ circuits: 3, rcds: 2 });
const kinds = ["protokol", "dane-informacyjne", "parametry-rcd", "badanie-adsc", "badanie-rezystancji"];
for (const kind of kinds) {
  const bytes = await generateEmDocxBytes(kind, { measurement: smokeM, job: JOB }, undefined, loadTemplate);
  const outPath = path.join(OUT_DIR, `${kind}.docx`);
  fs.writeFileSync(outPath, Buffer.from(bytes));
  assert(bytes.length > 5000, `T10 write ${kind}`);
}

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
