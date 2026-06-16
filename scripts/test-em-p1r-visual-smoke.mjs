/**
 * EM-P1R — visual smoke: generacja 5 DOCX + metryki layoutu vs SSOT.
 * Uruchom: npx vite-node scripts/test-em-p1r-visual-smoke.mjs
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
import { generateEmDocxBytes, loadEmDocxTemplateBytesFromFs } from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { validateEmDocxBytes } from "../src/lib/electrical-measurements/em-docx-xml.ts";

const PUBLIC_DIR = path.resolve("public");
const OUT_DIR = path.resolve("audit", "em-p1r-smoke-out");

/** Oczekiwane metryki po EM-P1R (SSOT minus wiersze przykładowe). */
const SSOT_EXPECT = {
  protokol: { tableCount: 1, landscape: false },
  "dane-informacyjne": { tableCount: 1, landscape: false },
  "badanie-adsc": { tableCount: 4, landscape: true },
  "badanie-rezystancji": { tableCount: 3, landscape: true },
  "parametry-rcd": { tableCount: 4, landscape: true },
};

const JOB = {
  id: "job-sepa-83-7",
  address: "Wrocław, ul. Sępa Szarzyńskiego 83/7",
  flatNumber: "",
};

const DOCS = [
  "protokol",
  "dane-informacyjne",
  "badanie-adsc",
  "badanie-rezystancji",
  "parametry-rcd",
];

function buildMeasurement(reportNumber, { circuits = 3, rcds = 2 } = {}) {
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
    const rcd = m.rcds[m.rcds.length - 1];
    m.rcds = m.rcds.map((r) =>
      r.id === rcd.id ? { ...r, symbol: `RCD${i + 1}`, deviceType: i % 2 === 0 ? "P302" : "P304" } : r,
    );
  }
  return m;
}

function extractTables(xml) {
  const tables = [];
  const tblRe = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let m;
  while ((m = tblRe.exec(xml)) !== null) {
    const tbl = m[0];
    const gridCols = [...tbl.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((x) => Number(x[1]));
    const rows = (tbl.match(/<w:tr\b/g) || []).length;
    tables.push({ gridCols, rows });
  }
  return tables;
}

async function docxMetrics(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const sectPr = xml.match(/<w:pgSz\b[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/);
  return {
    bytes: bytes.length,
    tables: extractTables(xml),
    orientation: sectPr && Number(sectPr[1]) > Number(sectPr[2]) ? "landscape" : "portrait",
    text: xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
  };
}

const loadTemplate = (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR);

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

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const rapNo of ["TEST-RAP-001", "RAP-45-2026"]) {
  console.log(`\n=== ${rapNo} ===`);
  const m = buildMeasurement(rapNo);
  for (const kind of DOCS) {
    const bytes = await generateEmDocxBytes(kind, { measurement: m, job: JOB }, undefined, loadTemplate);
    const outName = `${rapNo.replace(/[^a-zA-Z0-9-]/g, "_")}_${kind}.docx`;
    fs.writeFileSync(path.join(OUT_DIR, outName), bytes);
    const val = await validateEmDocxBytes(bytes);
    assert(val.ok, `${kind} XML valid (${rapNo})`);
    assert(bytes.length > 8000, `${kind} size > 8KB (${rapNo})`);
    const metrics = await docxMetrics(bytes);
    assert(metrics.text.includes(rapNo), `${kind} contains ${rapNo}`);
    assert(!metrics.text.includes("{{ROW_LP}}"), `${kind} no template placeholders (${rapNo})`);
    const ref = SSOT_EXPECT[kind];
    if (ref) {
      assert(metrics.tables.length === ref.tableCount, `${kind} tableCount=${metrics.tables.length} (expected ${ref.tableCount})`);
      const orient = ref.landscape ? "landscape" : "portrait";
      assert(metrics.orientation === orient, `${kind} orientation ${metrics.orientation}`);
    }
  }
}

console.log(`\n=== WYNIK EM-P1R SMOKE: ${passed} PASS, ${failed} FAIL ===`);
console.log(`Output: ${OUT_DIR}`);
process.exit(failed ? 1 : 0);
